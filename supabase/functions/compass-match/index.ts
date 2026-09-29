import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const Body = z.object({ session_id: z.string().uuid() });
const MODEL = "openai/gpt-6-astra";
const MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;

const SYSTEM = `You help a person see which local offices work on the issues they care about.
Follow these rules every time.
1. Only rank offices from the list you are given. Never add an office. Use the exact office_id from the list.
2. Never name a candidate or a party. Never say how to vote.
3. For each office, explain in plain words which of the person's top issues it connects to and why.
4. Give 2 or 3 policy priorities per office. Each is a short neutral topic area, like "transit funding levels". Never take a side for or against anything.
5. If the list has fewer than 3 offices, rank what is there. Say plainly in the note that more offices will show as the city adds them.
6. Write different reasoning for each office based on what that office actually does. Never repeat the same sentence for two offices. Mention only the person's top three issues unless an office truly connects to another one.
Write at a 6th to 8th grade level. Use short sentences. Do not use em dashes, semicolons, or parentheses. Speak to the person as "you". Affirm what they can do.
match_score is a number from 0 to 1. Higher means a closer match to their top issues.
Return JSON only.`;

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["matches", "note"],
  properties: {
    note: { type: ["string", "null"] },
    matches: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["office_id", "match_score", "reasoning", "policy_priorities"],
        properties: {
          office_id: { type: "string" },
          match_score: { type: "number" },
          reasoning: { type: "string" },
          policy_priorities: { type: "array", items: { type: "string" } },
        },
      },
    },
  },
};

const clean = (s: string) => s.replace(/[\u2014\u2013]/g, ", ").replace(/;/g, ".").replace(/[()]/g, "").replace(/\s+/g, " ").trim();

async function callAI(apiKey: string, input: string, signal: AbortSignal) {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({
      model: MODEL,
      instructions: SYSTEM,
      input: [{ role: "user", content: input }],
      stream: true,
      store: false,
      reasoning: { effort: "low", summary: "auto" },
      include: ["reasoning.encrypted_content"],
      text: { format: { type: "json_schema", name: "office_matches", strict: true, schema } },
    }),
  });
  if (!res.ok || !res.body) {
    const t = await res.text().catch(() => "");
    return { status: res.status, error: t.slice(0, 500) };
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "", text = "", done = "";
  while (true) {
    const { value, done: end } = await reader.read();
    if (end) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      try {
        const ev = JSON.parse(data);
        if (ev.type === "response.output_text.delta") text += ev.delta ?? "";
        else if (ev.type === "response.output_text.done") done = ev.text ?? "";
        else if (ev.type === "response.failed" || ev.type === "error") return { status: 502, error: JSON.stringify(ev).slice(0, 500) };
      } catch { /* ignore */ }
    }
  }
  return { status: 200, text: done || text };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Use POST" });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json(401, { error: "Please sign in." });
    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: u, error: uErr } = await userClient.auth.getUser(authHeader.slice(7));
    if (uErr || !u?.user) return json(401, { error: "Please sign in." });
    const uid = u.user.id;

    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json(400, { error: parsed.error.flatten().fieldErrors });
    const sessionId = parsed.data.session_id;

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: sess } = await admin.from("compass_sessions").select("id, user_id, completed_at").eq("id", sessionId).maybeSingle();
    if (!sess || sess.user_id !== uid) return json(403, { error: "This quiz is not yours." });
    if (!sess.completed_at) return json(400, { error: "Finish the quiz first." });

    const [{ data: live }, { data: sandbox }] = await Promise.all([
      admin.rpc("has_active_subscription", { user_uuid: uid, check_env: "live" }),
      admin.rpc("has_active_subscription", { user_uuid: uid, check_env: "sandbox" }),
    ]);
    if (!live && !sandbox) return json(403, { error: "This report is part of UWAZI+." });

    // Reuse stored rows when they are fresh and districts have not changed.
    const [{ data: existing }, { data: dist }] = await Promise.all([
      admin.from("compass_office_matches").select("created_at").eq("session_id", sessionId).order("created_at", { ascending: true }).limit(1),
      admin.from("user_districts").select("updated_at").eq("user_id", uid).maybeSingle(),
    ]);
    if (existing?.length) {
      const written = new Date(existing[0].created_at).getTime();
      const distChanged = dist?.updated_at && new Date(dist.updated_at).getTime() > written;
      if (Date.now() - written < MAX_AGE_MS && !distChanged) return json(200, { cached: true });
    }

    const { data: result } = await admin.from("compass_results").select("dimension_scores, top_dimensions").eq("session_id", sessionId).maybeSingle();
    if (!result) return json(400, { error: "We could not find your quiz results." });

    const { data: offices, error: oErr } = await userClient.rpc("get_my_offices", { _user_id: uid });
    if (oErr) return json(500, { error: "We could not load your offices." });
    const list = (offices ?? []).filter((o: any) => ["city", "district", "county", "school"].includes(o.match_level));
    if (!list.length) return json(200, { matches: 0, note: "We do not have local offices for your area yet." });

    const { data: dims } = await admin.from("compass_dimensions").select("*");
    const label = (k: string) => {
      const d = (dims ?? []).find((x: any) => x.key === k || x.code === k || x.id === k || x.slug === k);
      return d?.label ?? d?.name ?? k;
    };
    const scores = Object.entries((result.dimension_scores ?? {}) as Record<string, number>)
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .map(([k, v]) => ({ issue: label(k), score: v }));

    const input = JSON.stringify({
      person_issue_scores_high_to_low: scores,
      top_issues: scores.slice(0, 3).map((s) => s.issue),
      offices: list.map((o: any) => ({ office_id: o.id, title: o.office_title, level: o.jurisdiction_level, match_level: o.match_level })),
    });

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json(500, { error: "The AI service is not set up." });
    const ai = await callAI(apiKey, input, req.signal);
    if (ai.status !== 200) {
      console.error("compass-match AI error", ai.status, ai.error);
      return json(ai.status === 429 || ai.status === 402 || ai.status === 403 ? ai.status : 502, { error: "We could not build your report right now. Please try again later." });
    }

    let out: any;
    try { out = JSON.parse(ai.text ?? ""); } catch { return json(502, { error: "We could not read the report. Please try again later." }); }

    const allowed = new Set(list.map((o: any) => o.id));
    const seen = new Set<string>();
    const rows = (Array.isArray(out?.matches) ? out.matches : [])
      .filter((m: any) => typeof m?.office_id === "string" && allowed.has(m.office_id) && !seen.has(m.office_id) && seen.add(m.office_id))
      .map((m: any) => ({
        session_id: sessionId,
        office_id: m.office_id,
        match_score: Math.min(1, Math.max(0, Number(m.match_score) || 0)),
        reasoning: clean(String(m.reasoning ?? "")).slice(0, 1200),
        policy_priorities: (Array.isArray(m.policy_priorities) ? m.policy_priorities : [])
          .map((p: unknown) => clean(String(p)).slice(0, 80)).filter(Boolean).slice(0, 3),
      }));
    const dropped = (out?.matches?.length ?? 0) - rows.length;

    await admin.from("compass_office_matches").delete().eq("session_id", sessionId);
    if (rows.length) {
      const { error: insErr } = await admin.from("compass_office_matches").insert(rows);
      if (insErr) return json(500, { error: "We could not save your report." });
    }
    return json(200, { matches: rows.length, dropped, note: out?.note ? clean(String(out.note)) : null });
  } catch (e) {
    console.error("compass-match", e);
    return json(500, { error: "Something went wrong. Please try again later." });
  }
});
