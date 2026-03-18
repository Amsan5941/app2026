/**
 * Supabase Edge Function: food-logs
 *
 * Handles CRUD operations for food logs.
 * Replaces the Python FastAPI backend's /food-logs/* endpoints.
 *
 * Request body (JSON):
 *   { action: "list", targetDate?: string, limit?: number, cursor?: string }
 *   { action: "summary", targetDate: string }
 *   { action: "detail", foodLogId: string }
 *   { action: "delete", foodLogId: string }
 *   { action: "update", foodLogId: string, totalCalories?: number, totalProtein?: number, totalCarbs?: number, totalFat?: number, notes?: string }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

async function resolveUserId(
  supabase: ReturnType<typeof createClient>,
  authId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", authId)
    .single();
  return data?.id ?? null;
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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders(), "Content-Type": "application/json" },
      });
    }

    // Service-role client for DB operations
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Get authenticated user from JWT
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

    const userId = await resolveUserId(supabase, user.id);
    if (!userId) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { ...corsHeaders(), "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    // ── List food logs ───────────────────────────────────────
    if (action === "list") {
      const { targetDate, limit = 20, cursor } = body;

      let query = supabase
        .from("food_logs")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit + 1); // fetch one extra to determine has_more

      if (targetDate) {
        query = query.eq("logged_date", targetDate);
      }
      if (cursor) {
        query = query.lt("created_at", cursor);
      }

      const { data: logs, error } = await query;
      if (error) throw error;

      const hasMore = (logs?.length ?? 0) > limit;
      const items = hasMore ? logs!.slice(0, limit) : (logs ?? []);
      const nextCursor =
        hasMore ? items[items.length - 1].created_at : null;

      // Fetch food_items for each log
      if (items.length > 0) {
        const logIds = items.map((l: any) => l.id);
        const { data: foodItemsData } = await supabase
          .from("food_items")
          .select("*")
          .in("food_log_id", logIds);

        const itemsByLogId: Record<string, any[]> = {};
        for (const fi of foodItemsData ?? []) {
          if (!itemsByLogId[fi.food_log_id]) itemsByLogId[fi.food_log_id] = [];
          itemsByLogId[fi.food_log_id].push(fi);
        }
        for (const log of items) {
          (log as any).food_items = itemsByLogId[(log as any).id] ?? [];
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: items,
          count: items.length,
          next_cursor: nextCursor,
          has_more: hasMore,
        }),
        {
          headers: { ...corsHeaders(), "Content-Type": "application/json" },
        },
      );
    }

    // ── Daily summary ────────────────────────────────────────
    if (action === "summary") {
      const { targetDate } = body;
      if (!targetDate) {
        return new Response(
          JSON.stringify({ error: "targetDate is required" }),
          {
            status: 400,
            headers: { ...corsHeaders(), "Content-Type": "application/json" },
          },
        );
      }

      const { data: logs, error } = await supabase
        .from("food_logs")
        .select(
          "total_calories, total_protein, total_carbs, total_fat, meal_type",
        )
        .eq("user_id", userId)
        .eq("logged_date", targetDate);

      if (error) throw error;

      const summary = {
        date: targetDate,
        total_calories: 0,
        total_protein: 0,
        total_carbs: 0,
        total_fat: 0,
        meal_count: logs?.length ?? 0,
        meals_by_type: {} as Record<string, any>,
      };

      for (const log of logs ?? []) {
        summary.total_calories += log.total_calories ?? 0;
        summary.total_protein += log.total_protein ?? 0;
        summary.total_carbs += log.total_carbs ?? 0;
        summary.total_fat += log.total_fat ?? 0;

        const mt = log.meal_type ?? "other";
        if (!summary.meals_by_type[mt]) {
          summary.meals_by_type[mt] = {
            count: 0,
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
          };
        }
        summary.meals_by_type[mt].count += 1;
        summary.meals_by_type[mt].calories += log.total_calories ?? 0;
        summary.meals_by_type[mt].protein += log.total_protein ?? 0;
        summary.meals_by_type[mt].carbs += log.total_carbs ?? 0;
        summary.meals_by_type[mt].fat += log.total_fat ?? 0;
      }

      return new Response(JSON.stringify({ success: true, data: summary }), {
        headers: { ...corsHeaders(), "Content-Type": "application/json" },
      });
    }

    // ── Detail ───────────────────────────────────────────────
    if (action === "detail") {
      const { foodLogId } = body;
      if (!foodLogId) {
        return new Response(
          JSON.stringify({ error: "foodLogId is required" }),
          {
            status: 400,
            headers: { ...corsHeaders(), "Content-Type": "application/json" },
          },
        );
      }

      const { data: log, error } = await supabase
        .from("food_logs")
        .select("*")
        .eq("id", foodLogId)
        .eq("user_id", userId)
        .single();

      if (error || !log) {
        return new Response(
          JSON.stringify({ error: "Food log not found" }),
          {
            status: 404,
            headers: { ...corsHeaders(), "Content-Type": "application/json" },
          },
        );
      }

      const { data: foodItems } = await supabase
        .from("food_items")
        .select("*")
        .eq("food_log_id", foodLogId);

      return new Response(
        JSON.stringify({
          success: true,
          data: { ...log, food_items: foodItems ?? [] },
        }),
        { headers: { ...corsHeaders(), "Content-Type": "application/json" } },
      );
    }

    // ── Delete ───────────────────────────────────────────────
    if (action === "delete") {
      const { foodLogId } = body;
      if (!foodLogId) {
        return new Response(
          JSON.stringify({ error: "foodLogId is required" }),
          {
            status: 400,
            headers: { ...corsHeaders(), "Content-Type": "application/json" },
          },
        );
      }

      const { error } = await supabase
        .from("food_logs")
        .delete()
        .eq("id", foodLogId)
        .eq("user_id", userId);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, message: "Food log deleted" }),
        { headers: { ...corsHeaders(), "Content-Type": "application/json" } },
      );
    }

    // ── Update ───────────────────────────────────────────────
    if (action === "update") {
      const {
        foodLogId,
        totalCalories,
        totalProtein,
        totalCarbs,
        totalFat,
        notes,
      } = body;
      if (!foodLogId) {
        return new Response(
          JSON.stringify({ error: "foodLogId is required" }),
          {
            status: 400,
            headers: { ...corsHeaders(), "Content-Type": "application/json" },
          },
        );
      }

      // Fetch current values to store originals on first edit
      const { data: existing } = await supabase
        .from("food_logs")
        .select(
          "total_calories, total_protein, total_carbs, total_fat, edited, original_calories, original_protein, original_carbs, original_fat",
        )
        .eq("id", foodLogId)
        .eq("user_id", userId)
        .single();

      if (!existing) {
        return new Response(
          JSON.stringify({ error: "Food log not found" }),
          {
            status: 404,
            headers: { ...corsHeaders(), "Content-Type": "application/json" },
          },
        );
      }

      const updates: Record<string, any> = { edited: true };

      // Store originals only on first edit
      if (!existing.edited) {
        updates.original_calories = existing.total_calories;
        updates.original_protein = existing.total_protein;
        updates.original_carbs = existing.total_carbs;
        updates.original_fat = existing.total_fat;
      }

      if (totalCalories !== undefined) updates.total_calories = totalCalories;
      if (totalProtein !== undefined) updates.total_protein = totalProtein;
      if (totalCarbs !== undefined) updates.total_carbs = totalCarbs;
      if (totalFat !== undefined) updates.total_fat = totalFat;
      if (notes !== undefined) updates.notes = notes;

      const { data: updated, error } = await supabase
        .from("food_logs")
        .update(updates)
        .eq("id", foodLogId)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, data: updated }), {
        headers: { ...corsHeaders(), "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
      status: 400,
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
    });
  } catch (err: any) {
    const msg = err?.message ?? err?.details ?? JSON.stringify(err) ?? "Unknown error";
    console.error("food-logs error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
    });
  }
});
