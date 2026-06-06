import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const PRICE_MONTHLY = 4.99;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return json(401, { error: "Missing auth token" });

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await authClient.auth.getUser(token);
    if (userErr || !userData?.user) return json(401, { error: "Invalid token" });

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: isAdminRes } = await admin.rpc("is_admin", { _user_id: userData.user.id });
    if (!isAdminRes) return json(403, { error: "Forbidden" });

    const url = new URL(req.url);
    const periodDays = Math.max(1, Math.min(365, parseInt(url.searchParams.get("period") ?? "30")));

    const now = new Date();
    const periodStart = new Date(now.getTime() - periodDays * 86400000).toISOString();
    const day1 = new Date(now.getTime() - 86400000).toISOString();
    const day7 = new Date(now.getTime() - 7 * 86400000).toISOString();

    const safeCount = async (q: any) => {
      try {
        const { count, error } = await q;
        if (error) return 0;
        return count ?? 0;
      } catch { return 0; }
    };
    const safeData = async <T = any>(q: any): Promise<T[]> => {
      try {
        const { data, error } = await q;
        if (error) return [];
        return (data ?? []) as T[];
      } catch { return []; }
    };

    // ─── GROWTH ───
    const [totalUsers, newSignupsPeriod, newSignups7d, newSignupsToday, signupsByDay] = await Promise.all([
      safeCount(admin.from("profiles").select("*", { count: "exact", head: true })),
      safeCount(admin.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", periodStart)),
      safeCount(admin.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", day7)),
      safeCount(admin.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", day1)),
      safeData(admin.rpc("signups_by_day", { period_days: periodDays })),
    ]);

    // ─── REVENUE ───
    // Active subscriptions across both envs, deduped by user_id.
    const activeSubs = await safeData<{ user_id: string; status: string; current_period_end: string | null; cancel_at_period_end: boolean; created_at: string; updated_at: string; environment: string }>(
      admin.from("subscriptions").select("user_id, status, current_period_end, cancel_at_period_end, created_at, updated_at, environment")
        .in("status", ["active", "trialing"])
    );
    const activeNow = activeSubs.filter((s) => !s.current_period_end || new Date(s.current_period_end) > now);
    const uniqueActiveUsers = new Set(activeNow.map((s) => s.user_id));
    const totalPaid = uniqueActiveUsers.size;

    const newPaidUsers = new Set(activeNow.filter((s) => new Date(s.created_at) >= new Date(periodStart)).map((s) => s.user_id));
    const newPaidPeriod = newPaidUsers.size;

    const canceledRows = await safeData<{ user_id: string; updated_at: string }>(
      admin.from("subscriptions").select("user_id, updated_at")
        .eq("cancel_at_period_end", true)
        .gte("updated_at", periodStart)
    );
    const canceledPeriod = new Set(canceledRows.map((r) => r.user_id)).size;

    const mrrCurrent = totalPaid * PRICE_MONTHLY;
    const mrrAdded = newPaidPeriod * PRICE_MONTHLY;
    const mrrChurned = canceledPeriod * PRICE_MONTHLY;
    const freeToPaidRate = totalUsers > 0 ? (totalPaid / totalUsers) * 100 : 0;
    const arpu = totalPaid > 0 ? mrrCurrent / totalPaid : 0;

    const ASSUMED_MONTHLY_CHURN = 0.05;
    const ASSUMED_MARGIN = 0.78;
    const ASSUMED_CAC = 15.0;
    const monthlyGP = arpu * ASSUMED_MARGIN;
    const avgLifeMonths = 1 / ASSUMED_MONTHLY_CHURN;
    const ltvEstimate = monthlyGP * avgLifeMonths;
    const ltvCacRatio = ASSUMED_CAC > 0 ? ltvEstimate / ASSUMED_CAC : 0;
    const paybackMonths = monthlyGP > 0 ? ASSUMED_CAC / monthlyGP : 0;

    // ─── ASK UWAZI ───
    const [
      questionsTotal,
      questionsPeriod,
      questions7d,
      questionsToday,
      rateLimitHitsToday,
      rateLimitHitsPeriod,
      categoryData,
      topZipData,
    ] = await Promise.all([
      safeCount(admin.from("uwazi_question_log").select("*", { count: "exact", head: true })),
      safeCount(admin.from("uwazi_question_log").select("*", { count: "exact", head: true }).gte("created_at", periodStart)),
      safeCount(admin.from("uwazi_question_log").select("*", { count: "exact", head: true }).gte("created_at", day7)),
      safeCount(admin.from("uwazi_question_log").select("*", { count: "exact", head: true }).gte("created_at", day1)),
      safeCount(admin.from("uwazi_question_log").select("*", { count: "exact", head: true }).eq("was_rate_limited", true).gte("created_at", day1)),
      safeCount(admin.from("uwazi_question_log").select("*", { count: "exact", head: true }).eq("was_rate_limited", true).gte("created_at", periodStart)),
      safeData(admin.rpc("ask_categories_summary", { period_days: periodDays })),
      safeData(admin.rpc("ask_top_zips", { period_days: periodDays, limit_count: 10 })),
    ]);

    const rateLimitHitRate = questionsToday > 0 ? (rateLimitHitsToday / questionsToday) * 100 : 0;

    return json(200, {
      generated_at: now.toISOString(),
      period_days: periodDays,
      growth: {
        total_users: totalUsers,
        new_signups_period: newSignupsPeriod,
        new_signups_7d: newSignups7d,
        new_signups_today: newSignupsToday,
        signups_by_day: signupsByDay,
      },
      revenue: {
        total_paid: totalPaid,
        new_paid_period: newPaidPeriod,
        canceled_period: canceledPeriod,
        mrr_current: Math.round(mrrCurrent * 100) / 100,
        mrr_added: Math.round(mrrAdded * 100) / 100,
        mrr_churned: Math.round(mrrChurned * 100) / 100,
        mrr_net: Math.round((mrrAdded - mrrChurned) * 100) / 100,
        free_to_paid_rate: Math.round(freeToPaidRate * 10) / 10,
        arpu: Math.round(arpu * 100) / 100,
        ltv_estimate: Math.round(ltvEstimate * 100) / 100,
        ltv_cac_ratio: Math.round(ltvCacRatio * 10) / 10,
        payback_months: Math.round(paybackMonths * 10) / 10,
      },
      ask_intel: {
        questions_total: questionsTotal,
        questions_period: questionsPeriod,
        questions_7d: questions7d,
        questions_today: questionsToday,
        rate_limit_hits_today: rateLimitHitsToday,
        rate_limit_hits_period: rateLimitHitsPeriod,
        rate_limit_hit_rate: Math.round(rateLimitHitRate * 10) / 10,
        top_categories: categoryData,
        top_zips: topZipData,
      },
    });
  } catch (e) {
    console.error("[get-intelligence-metrics] error:", e);
    return json(500, { error: "Internal error" });
  }
});
