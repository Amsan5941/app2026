/**
 * Supabase Edge Function: barcode
 *
 * Handles barcode product lookups via Open Food Facts and saving barcode logs.
 * Replaces the Python FastAPI backend's /barcode/* endpoints.
 *
 * Request body (JSON):
 *   { action: "lookup", barcode: string }
 *   { action: "log", barcode: string, productName: string, calories: number,
 *     protein: number, carbs: number, fat: number, servingSize?: string, mealType: string }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPEN_FOOD_FACTS_URL = "https://world.openfoodfacts.org/api/v2/product";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

async function fetchProduct(barcode: string) {
  const res = await fetch(`${OPEN_FOOD_FACTS_URL}/${barcode}.json`, {
    signal: AbortSignal.timeout(10000),
  });
  const data = await res.json();

  if (data.status !== 1 || !data.product) {
    return { barcode, product_name: "Product not found", found: false };
  }

  const product = data.product;
  const n = product.nutriments ?? {};

  const calories =
    n["energy-kcal_serving"] ?? n["energy-kcal_100g"] ?? 0;
  const protein = n["proteins_serving"] ?? n["proteins_100g"] ?? 0;
  const carbs =
    n["carbohydrates_serving"] ?? n["carbohydrates_100g"] ?? 0;
  const fat = n["fat_serving"] ?? n["fat_100g"] ?? 0;

  return {
    barcode,
    product_name: product.product_name ?? "Unknown product",
    calories: Number(calories),
    protein: Number(protein),
    carbs: Number(carbs),
    fat: Number(fat),
    serving_size: product.serving_size ?? null,
    image_url: product.image_front_small_url ?? null,
    brand: product.brands ?? null,
    found: true,
  };
}

Deno.serve(async (req: Request) => {
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
    const body = await req.json();
    const { action } = body;

    // ── Lookup ───────────────────────────────────────────────
    if (action === "lookup") {
      const { barcode } = body;
      if (!barcode?.trim()) {
        return new Response(
          JSON.stringify({ error: "barcode is required" }),
          {
            status: 400,
            headers: { ...corsHeaders(), "Content-Type": "application/json" },
          },
        );
      }

      const product = await fetchProduct(barcode.trim());

      if (!product.found) {
        return new Response(
          JSON.stringify({ error: "Product not found" }),
          {
            status: 404,
            headers: { ...corsHeaders(), "Content-Type": "application/json" },
          },
        );
      }

      return new Response(JSON.stringify(product), {
        headers: { ...corsHeaders(), "Content-Type": "application/json" },
      });
    }

    // ── Log barcode food ─────────────────────────────────────
    if (action === "log") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders(), "Content-Type": "application/json" },
        });
      }

      const {
        barcode,
        productName,
        calories,
        protein,
        carbs,
        fat,
        servingSize,
        mealType,
      } = body;

      if (!barcode || !productName || !mealType) {
        return new Response(
          JSON.stringify({
            error: "barcode, productName and mealType are required",
          }),
          {
            status: 400,
            headers: { ...corsHeaders(), "Content-Type": "application/json" },
          },
        );
      }

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );

      const userClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const {
        data: { user },
      } = await userClient.auth.getUser();

      if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders(), "Content-Type": "application/json" },
        });
      }

      const { data: userData } = await supabase
        .from("users")
        .select("id")
        .eq("auth_id", user.id)
        .single();

      if (!userData) {
        return new Response(JSON.stringify({ error: "User not found" }), {
          status: 404,
          headers: { ...corsHeaders(), "Content-Type": "application/json" },
        });
      }

      const today = new Date().toISOString().split("T")[0];

      const { data: logData, error: logError } = await supabase
        .from("food_logs")
        .insert({
          user_id: userData.id,
          total_calories: calories ?? 0,
          total_protein: protein ?? 0,
          total_carbs: carbs ?? 0,
          total_fat: fat ?? 0,
          logged_date: today,
          meal_type: mealType,
          notes: `Barcode: ${barcode}`,
          source: "barcode",
          barcode,
        })
        .select()
        .single();

      if (logError) throw logError;

      await supabase.from("food_items").insert({
        food_log_id: logData.id,
        food_name: productName,
        serving_size: servingSize ?? null,
        calories: calories ?? 0,
        protein: protein ?? 0,
        carbs: carbs ?? 0,
        fat: fat ?? 0,
      });

      return new Response(
        JSON.stringify({ success: true, food_log: logData }),
        { headers: { ...corsHeaders(), "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
      status: 400,
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("barcode error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
    });
  }
});
