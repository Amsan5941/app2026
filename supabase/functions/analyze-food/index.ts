/**
 * Supabase Edge Function: analyze-food
 *
 * Handles AI food recognition via OpenAI GPT-4o.
 * Replaces the Python FastAPI backend's /recognize/* endpoints.
 *
 * Request body (JSON):
 *   { type: "text", description: string, mealType?: string, saveLog?: boolean }
 *   { type: "image", imageBase64: string, mimeType?: string, mealType?: string, saveLog?: boolean }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

const SYSTEM_PROMPT = `You are a professional nutritionist AI. When given a photo of food or a text description:

1. Identify EVERY food item visible/mentioned
2. Estimate the serving size for each item
3. Provide calorie and macronutrient estimates (protein, carbs, fat) in grams
4. Rate your overall confidence from 0-100

Be practical and realistic with portions. If a food item is partially hidden or unclear,
make your best estimate and lower the confidence score.

IMPORTANT: Respond ONLY with valid JSON in this exact format, no other text:
{
  "food_items": [
    {
      "food_name": "food name here",
      "serving_size": "estimated serving size",
      "calories": 0,
      "protein": 0,
      "carbs": 0,
      "fat": 0,
      "confidence": 85
    }
  ],
  "overall_confidence": 85
}`;

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function parseOpenAIResponse(rawText: string) {
  let cleaned = rawText.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/m, "").replace(/\s*```$/m, "");

  try {
    const data = JSON.parse(cleaned);
    return data;
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        /* fall through */
      }
    }
    return { food_items: [], overall_confidence: 0 };
  }
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders() });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
    });
  }

  try {
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    console.log("[analyze-food] openaiKey present:", !!openaiKey);
    if (!openaiKey) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders(), "Content-Type": "application/json" },
        },
      );
    }

    let body: any;
    try {
      body = await req.json();
    } catch (parseErr) {
      console.error("[analyze-food] body parse error:", parseErr);
      return new Response(
        JSON.stringify({ error: `Failed to parse request body: ${parseErr}` }),
        { status: 400, headers: { ...corsHeaders(), "Content-Type": "application/json" } },
      );
    }
    console.log("[analyze-food] type:", body?.type, "imageBase64 length:", body?.imageBase64?.length ?? 0);
    const { type, mealType, saveLog = true } = body;

    if (!type || (type !== "image" && type !== "text")) {
      return new Response(
        JSON.stringify({ error: 'type must be "image" or "text"' }),
        {
          status: 400,
          headers: { ...corsHeaders(), "Content-Type": "application/json" },
        },
      );
    }

    // Build OpenAI messages
    let messages: object[];
    if (type === "image") {
      const { imageBase64, mimeType = "image/jpeg" } = body;
      if (!imageBase64) {
        return new Response(
          JSON.stringify({ error: "imageBase64 is required for image type" }),
          {
            status: 400,
            headers: { ...corsHeaders(), "Content-Type": "application/json" },
          },
        );
      }
      messages = [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this food photo. Identify all food items and estimate their nutritional content.",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`,
                detail: "high",
              },
            },
          ],
        },
      ];
    } else {
      const { description } = body;
      if (!description) {
        return new Response(
          JSON.stringify({
            error: "description is required for text type",
          }),
          {
            status: 400,
            headers: { ...corsHeaders(), "Content-Type": "application/json" },
          },
        );
      }
      messages = [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Estimate the nutritional content of this meal: ${description}`,
        },
      ];
    }

    // Call OpenAI
    console.log("[analyze-food] calling OpenAI...");
    const openaiRes = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages,
        max_tokens: 1500,
        temperature: 0.2,
      }),
    });

    console.log("[analyze-food] OpenAI status:", openaiRes.status);
    if (!openaiRes.ok) {
      const err = await openaiRes.text();
      console.error("[analyze-food] OpenAI error:", err);
      return new Response(
        JSON.stringify({ error: `OpenAI error: ${err}` }),
        {
          status: 502,
          headers: { ...corsHeaders(), "Content-Type": "application/json" },
        },
      );
    }

    const openaiData = await openaiRes.json();
    const rawText = openaiData.choices[0].message.content;
    const parsed = parseOpenAIResponse(rawText);

    const foodItems = (parsed.food_items ?? []).map((item: any) => ({
      food_name: item.food_name ?? "Unknown",
      serving_size: item.serving_size ?? null,
      calories: Number(item.calories ?? 0),
      protein: Number(item.protein ?? 0),
      carbs: Number(item.carbs ?? 0),
      fat: Number(item.fat ?? 0),
      confidence: Number(item.confidence ?? 50),
    }));

    const totalCalories = foodItems.reduce(
      (s: number, i: any) => s + i.calories,
      0,
    );
    const totalProtein = foodItems.reduce(
      (s: number, i: any) => s + i.protein,
      0,
    );
    const totalCarbs = foodItems.reduce((s: number, i: any) => s + i.carbs, 0);
    const totalFat = foodItems.reduce((s: number, i: any) => s + i.fat, 0);
    const aiConfidence = Number(parsed.overall_confidence ?? 50);

    const result = {
      food_items: foodItems,
      total_calories: totalCalories,
      total_protein: totalProtein,
      total_carbs: totalCarbs,
      total_fat: totalFat,
      ai_confidence: aiConfidence,
      source: "openai" as const,
    };

    // Optionally save food log
    if (saveLog) {
      try {
        const authHeader = req.headers.get("Authorization");
        if (authHeader) {
          const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
          );

          // Get auth user from JWT
          const userClient = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_ANON_KEY")!,
            { global: { headers: { Authorization: authHeader } } },
          );
          const {
            data: { user },
          } = await userClient.auth.getUser();

          if (user) {
            // Resolve internal user id
            const { data: userData } = await supabase
              .from("users")
              .select("id")
              .eq("auth_id", user.id)
              .single();

            if (userData) {
              // Use the client-supplied date (EST) so saves are consistent with queries.
              // Fall back to UTC only if the client is on an older version.
              const today = body.loggedDate ?? new Date().toISOString().split("T")[0];
              const { data: logData, error: logErr } = await supabase
                .from("food_logs")
                .insert({
                  user_id: userData.id,
                  total_calories: totalCalories,
                  total_protein: totalProtein,
                  total_carbs: totalCarbs,
                  total_fat: totalFat,
                  ai_confidence: aiConfidence,
                  logged_date: today,
                  meal_type: mealType ?? null,
                })
                .select()
                .single();
              if (logErr) console.error("food_logs insert error:", logErr.message);

              if (logData && foodItems.length > 0) {
                await supabase.from("food_items").insert(
                  foodItems.map((item: any) => ({
                    food_log_id: logData.id,
                    food_name: item.food_name,
                    serving_size: item.serving_size,
                    calories: item.calories,
                    protein: item.protein,
                    carbs: item.carbs,
                    fat: item.fat,
                  })),
                );
              }
            }
          }
        }
      } catch (saveErr) {
        // Log save failure but still return the result
        console.error("Failed to save food log:", saveErr);
      }
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("analyze-food error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
    });
  }
});
