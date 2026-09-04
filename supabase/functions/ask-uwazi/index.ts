// ============================================================
// ask-uwazi — Supabase Edge Function (Deno)
//
// Grounded civic chatbot. Model routing + prompt caching +
// domain-locked server-side web search + local tool execution.
//
// Deploy: supabase functions deploy ask-uwazi
// Secrets: ANTHROPIC_API_KEY
// ============================================================

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SYSTEM_PROMPT } from "./prompt.ts";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

// Org-level (non workspace-scoped) keys require this header.
const WORKSPACE_ID = Deno.env.get("ANTHROPIC_WORKSPACE_ID");
const WORKSPACE_HEADER: Record<string, string> = WORKSPACE_ID
  ? { "anthropic-workspace-id": WORKSPACE_ID }
  : {};

const MODELS = {
  route: "claude-haiku-4-5-20251001", // classify + extract
  chat: "claude-sonnet-5",            // default civic Q&A
  deep: "claude-opus-5",              // multi-part ballot reasoning
} as const;

// Admin-selectable model override (platform_settings.ask_uwazi_model).
// "auto" keeps the cheap classifier routing between chat/deep.
const ALLOWED_MODELS = [
  "claude-haiku-4-5-20251001",
  "claude-sonnet-5",
  "claude-opus-5",
] as const;

async function getModelSetting(): Promise<string> {
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data } = await admin
      .from("platform_settings")
      .select("value")
      .eq("key", "ask_uwazi_model")
      .maybeSingle();
    const raw = typeof data?.value === "string"
      ? data.value
      : JSON.stringify(data?.value ?? "");
    const val = raw.replace(/^"|"$/g, "").trim();
    return (ALLOWED_MODELS as readonly string[]).includes(val) ? val : "auto";
  } catch {
    return "auto";
  }
}

// Server-side log of which model answered each chat and how it ended.
type ModelLog = {
  user_id: string | null;
  session_id: string | null;
  model_id: string | null;
  model_source: string;
  success: boolean;
  error_type?: string | null;
  error_message?: string | null;
  upstream_status?: number | null;
  tools_used?: string[];
  input_tokens?: number;
  output_tokens?: number;
  duration_ms?: number;
};

async function logModelUse(entry: ModelLog) {
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    await admin.from("ask_uwazi_model_log").insert({
      ...entry,
      error_message: entry.error_message
        ? String(entry.error_message).slice(0, 500)
        : null,
    });
  } catch (e) {
    console.error("model log insert failed", e);
  }
}




// Server-side web search is locked to official election sources.
// Anything not on this list cannot enter the model's context.
// Note: allowed_domains and blocked_domains cannot both be set.
const OFFICIAL_DOMAINS = [
  // Missouri
  "sos.mo.gov",
  "mo.gov",
  "kceb.org",              // Kansas City Election Board
  "jacksongov.org",
  "claycountymo.gov",
  "co.platte.mo.us",
  "casscounty.com",
  "mec.mo.gov",            // Missouri Ethics Commission
  // Kansas
  "sos.ks.gov",
  "ksvotes.org",
  "voteks.org",
  "jocoelection.org",      // Johnson County
  "wycokck.org",           // Wyandotte County
  // Federal
  "congress.gov",
  "fec.gov",
  "vote.gov",
  "census.gov",
];

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ------------------------------------------------------------
// Tool definitions
// ------------------------------------------------------------

const LOCAL_TOOLS = [
  {
    name: "get_voter_profile",
    description:
      "Get the signed-in user's resolved voting districts and local election " +
      "authority. Call this FIRST for any question that depends on where the " +
      "user lives (ballot contents, polling place, local deadlines). Returns " +
      "address_complete: false if the user has not finished their address — " +
      "in that case ask them to complete it rather than guessing.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_user_ballot",
    description:
      "Get the contests and candidates on the signed-in user's ballot for an " +
      "election. Only returns data verified against official sources. If the " +
      "user's address is unresolved this returns an error — do not work around " +
      "it by guessing from ZIP code.",
    input_schema: {
      type: "object",
      properties: {
        election_date: {
          type: "string",
          description: "ISO date, e.g. 2026-08-04",
        },
        party: {
          type: "string",
          description:
            "Party ballot to show. Required in Missouri (open primary — voter " +
            "picks one party's ballot at the polls). In Kansas, pass " +
            "UNAFFILIATED to get the amendment-only ballot.",
          enum: ["DEM", "REP", "LIB", "GRN", "CST", "UNAFFILIATED"],
        },
      },
      required: ["election_date"],
    },
  },
  {
    name: "get_election_authority",
    description:
      "Get official contact info, registration lookup URL, and sample ballot " +
      "URL for a local election authority. Use this for every handoff and for " +
      "any registration-status question. Prefer the key from get_voter_profile.",
    input_schema: {
      type: "object",
      properties: {
        authority_key: {
          type: "string",
          description: "e.g. mo-kansas-city, ks-johnson",
        },
        state: {
          type: "string",
          description: "Two-letter state code, if authority_key is unknown",
        },
      },
      required: [],
    },
  },
];

function buildTools(includeSearch: boolean) {
  const tools: unknown[] = [...LOCAL_TOOLS];
  if (includeSearch) {
    tools.push({
      type: "web_search_20250305",
      name: "web_search",
      max_uses: 4,
      allowed_domains: OFFICIAL_DOMAINS,
    });
  }
  return tools;
}

// ------------------------------------------------------------
// Local tool execution
// ------------------------------------------------------------

async function runLocalTool(
  name: string,
  input: Record<string, unknown>,
  supabase: SupabaseClient,
  userId: string,
): Promise<string> {
  if (name === "get_voter_profile") {
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "full_address, city, location, zip_code, county_name, " +
        "election_authority_key, party_preference",
      )
      .eq("user_id", userId)
      .maybeSingle();

    if (error) return JSON.stringify({ error: error.message });
    if (!data || !data.full_address) {
      return JSON.stringify({
        address_complete: false,
        state: data?.location ?? null,
        zip_code: data?.zip_code ?? null,
        note:
          "User has not completed their address. Ask them to add it in the " +
          "app. Do not infer districts from ZIP code.",
      });
    }
    return JSON.stringify({ address_complete: true, ...data, state: data.location });
  }

  if (name === "get_user_ballot") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("location, zip_code, county_name, election_authority_key")
      .eq("user_id", userId)
      .maybeSingle();

    const state = profile?.location;
    if (!state) {
      return JSON.stringify({
        error: "unresolved_address",
        note:
          "Cannot build a ballot without a resolved state. Ask the user to " +
          "complete or correct their address in the app.",
      });
    }

    const electionDate = String(input.election_date ?? "2026-08-04");
    const party = input.party ? String(input.party).toUpperCase() : null;

    let q = supabase
      .from("ballot_contests")
      .select(
        "id, contest_type, office_name, measure_title, measure_summary, " +
        "measure_full_text_url, party, district_type, district_id, " +
        "source_name, source_url, verified_at, sort_order, " +
        "ballot_candidates(id, name, party, is_incumbent, website, source_url)",
      )
      .eq("election_date", electionDate)
      .eq("state", state)
      .eq("verification_status", "verified")
      .order("sort_order");

    if (party) q = q.or(`party.is.null,party.eq.${party}`);
    else q = q.is("party", null);

    const { data: contests, error } = await q;
    if (error) return JSON.stringify({ error: error.message });

    if (!contests?.length) {
      return JSON.stringify({
        error: "no_published_election",
        note: "No verified ballot data for that date. Hand off to the county board.",
      });
    }

    return JSON.stringify({
      election_date: electionDate,
      state,
      party_ballot: party,
      contest_count: contests.length,
      contests,
      note:
        "Only present contests returned here. If a user asks about a race not " +
        "in this list, say you don't have verified data and hand off.",
    });
  }

  if (name === "get_election_authority") {
    let q = supabase
      .from("election_authorities")
      .select("key, display_name, covers_note, county_name, phone, website, lookup_url, poll_hours");

    if (input.authority_key) q = q.eq("key", String(input.authority_key));
    else if (input.state) q = q.eq("state", String(input.state).toUpperCase());
    else return JSON.stringify({ error: "need authority_key or state" });

    const { data, error } = await q;
    if (error) return JSON.stringify({ error: error.message });
    if (!data?.length) {
      return JSON.stringify({
        error: "not_found",
        fallback: "Direct the user to vote.gov to find their local election office.",
      });
    }
    return JSON.stringify(data);
  }

  return JSON.stringify({ error: `unknown tool: ${name}` });
}

// ------------------------------------------------------------
// Model routing — cheap classifier picks the tier
// ------------------------------------------------------------

async function pickModel(question: string, apiKey: string): Promise<string> {
  try {
    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
        ...WORKSPACE_HEADER,
      },
      body: JSON.stringify({
        model: MODELS.route,
        max_tokens: 8,
        system:
          "Classify the civic question. Reply with exactly one word.\n" +
          "SIMPLE = one fact (a date, a time, a link, a yes/no).\n" +
          "COMPLEX = comparing candidates, explaining a ballot measure, " +
          "multi-part, or anything needing several sources.",
        messages: [{ role: "user", content: question }],
      }),
      signal: AbortSignal.timeout(6000),
    });
    const j = await res.json();
    const label = j?.content?.[0]?.text?.trim().toUpperCase() ?? "";
    return label.startsWith("COMPLEX") ? MODELS.deep : MODELS.chat;
  } catch {
    return MODELS.chat;
  }
}

// ------------------------------------------------------------
// Handler
// ------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json({ error: "missing_api_key" }, 500);

  const startedAt = Date.now();
  let logUserId: string | null = null;
  let logSessionId: string | null = null;
  let logModel: string | null = null;
  let logSource = "auto";

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "unauthorized" }, 401);
    logUserId = user.id;

    const { message, history = [], session_id } = await req.json();
    logSessionId = session_id ?? null;
    if (!message?.trim()) return json({ error: "empty_message" }, 400);

    const override = await getModelSetting();
    const model = override === "auto"
      ? await pickModel(message, apiKey)
      : override;
    logModel = model;
    logSource = override === "auto" ? "auto" : "admin_override";




    const system = [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ];

    const messages: Record<string, unknown>[] = [
      ...history,
      { role: "user", content: message },
    ];

    let finalText = "";
    const citations: unknown[] = [];
    const toolsUsed: string[] = [];
    let usage: Record<string, number> = {};

    for (let turn = 0; turn < 6; turn++) {
      const res = await fetch(ANTHROPIC_URL, {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        ...WORKSPACE_HEADER,
        },
        body: JSON.stringify({
          model,
          max_tokens: 2048,
          system,
          messages,
          tools: buildTools(true),
        }),
        signal: AbortSignal.timeout(60000),
      });

      if (!res.ok) {
        const detail = await res.text();
        console.error("anthropic error", res.status, detail);
        await logModelUse({
          user_id: logUserId,
          session_id: logSessionId,
          model_id: logModel,
          model_source: logSource,
          success: false,
          error_type: "upstream_error",
          error_message: detail,
          upstream_status: res.status,
          tools_used: [...new Set(toolsUsed)],
          duration_ms: Date.now() - startedAt,
        });
        return json({ error: "upstream_error", status: res.status }, 502);
      }

      const data = await res.json();
      usage = {
        input_tokens: data.usage?.input_tokens ?? 0,
        output_tokens: data.usage?.output_tokens ?? 0,
        cache_read_tokens: data.usage?.cache_read_input_tokens ?? 0,
        cache_write_tokens: data.usage?.cache_creation_input_tokens ?? 0,
      };

      messages.push({ role: "assistant", content: data.content });

      if (data.stop_reason === "pause_turn") continue;

      if (data.stop_reason === "tool_use") {
        const results = [];
        for (const block of data.content ?? []) {
          if (block.type !== "tool_use") continue;
          toolsUsed.push(block.name);
          const out = await runLocalTool(
            block.name,
            block.input ?? {},
            supabase,
            user.id,
          );
          results.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: out,
          });
        }
        if (results.length === 0) break;
        messages.push({ role: "user", content: results });
        continue;
      }

      for (const block of data.content ?? []) {
        if (block.type === "text") {
          finalText += block.text;
          if (block.citations?.length) citations.push(...block.citations);
        }
        if (block.type === "web_search_tool_result") {
          toolsUsed.push("web_search");
        }
      }
      break;
    }

    if (!finalText) {
      finalText =
        "I wasn't able to get a verified answer to that. Your county " +
        "election board can help — you can find them at vote.gov.";
    }

    // Conversation persistence is handled client-side in ask_uwazi_sessions.
    void session_id;

    await logModelUse({
      user_id: logUserId,
      session_id: logSessionId,
      model_id: logModel,
      model_source: logSource,
      success: true,
      tools_used: [...new Set(toolsUsed)],
      input_tokens: usage.input_tokens ?? 0,
      output_tokens: usage.output_tokens ?? 0,
      duration_ms: Date.now() - startedAt,
    });

    return json({
      reply: finalText,
      citations,
      model,
      tools_used: [...new Set(toolsUsed)],
      usage,
    }, 200);
  } catch (err) {
    console.error("ask-uwazi error", err);
    await logModelUse({
      user_id: logUserId,
      session_id: logSessionId,
      model_id: logModel,
      model_source: logSource,
      success: false,
      error_type: "internal_error",
      error_message: err instanceof Error ? err.message : String(err),
      duration_ms: Date.now() - startedAt,
    });
    return json({ error: "internal_error" }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
