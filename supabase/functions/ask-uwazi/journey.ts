// Civic Journey per-turn context, calibration questions and lesson nudges.
// deno-lint-ignore-file no-explicit-any
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const CALIBRATION_QUESTIONS = [
  "Do you know how to find your council rep?",
  "Do you know where to find your sample ballot?",
  "Do you know how to speak at a city council meeting?",
  "Do you know who to call about a problem on your street?",
  "Do you know how to check if you are registered to vote?",
];

const DIM_KEYWORDS: Record<string, RegExp> = {
  "local-accountability": /\b(council|mayor|city hall|accountab|budget|official|representative|rep)\b/i,
  "economic-opportunity": /\b(job|jobs|wage|business|economy|economic|tax|taxes|income)\b/i,
  "public-safety": /\b(police|crime|safety|court|courts|jail|violence|fire)\b/i,
  "housing-development": /\b(housing|rent|landlord|zoning|develop|eviction|home)\b/i,
  "education-youth": /\b(school|schools|teacher|student|youth|education)\b/i,
  "health-wellbeing": /\b(health|hospital|clinic|medicaid|mental|wellbeing)\b/i,
  "infrastructure-mobility": /\b(road|roads|bus|transit|streetcar|sidewalk|pothole|bridge|traffic)\b/i,
  "civic-participation": /\b(vote|voting|register|ballot|election|poll|polling)\b/i,
};

const PERSONA_TOPIC: Record<string, string> = {
  watchdog: "accountability", builder: "jobs", guardian: "safety", neighbor: "housing", mentor: "schools",
  caretaker: "health", connector: "getting around", organizer: "voting and taking part", steward: "the issues you care about",
};

const URGENT = /\b(today|tonight|right now|urgent|emergency|deadline|polls close|where do i vote|polling place|last day|help me now)\b/i;

export function serviceClient(): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

export interface JourneyTurn {
  contextText: string | null;
  greeting: string | null;
  calibrationQuestion: string | null;
  nudge: { lesson_id: string; title: string } | null;
}

async function scoreConfidence(answer: string, question: string, callRoute: (sys: string, msg: string) => Promise<string>) {
  const label = (await callRoute(
    "You score how confident a person feels about a civic task. Reply with one word only: LOW, MEDIUM, HIGH, or NONE. Use NONE if the message does not answer the question.",
    `Question: ${question}\nTheir reply: ${answer.slice(0, 500)}`,
  )).trim().toUpperCase();
  if (label.startsWith("LOW")) return 0.2;
  if (label.startsWith("MEDIUM")) return 0.55;
  if (label.startsWith("HIGH")) return 0.9;
  return null;
}

export async function buildJourneyTurn(
  userClient: SupabaseClient,
  userId: string,
  message: string,
  historyLength: number,
  callRoute: (sys: string, msg: string) => Promise<string>,
): Promise<JourneyTurn> {
  const empty: JourneyTurn = { contextText: null, greeting: null, calibrationQuestion: null, nudge: null };
  try {
    const svc = serviceClient();
    const { data: persona } = await svc.from("user_civic_persona").select("dimension_scores, persona_labels, consent_scope").eq("user_id", userId).maybeSingle();
    if (!persona?.consent_scope?.personalization) return empty;

    // Calibration bookkeeping
    const { data: stRow } = await svc.from("ask_calibration_state").select("*").eq("user_id", userId).maybeSingle();
    const state = stRow ?? { turns_since_prompt: 99, pending_question: null };

    if (state.pending_question) {
      const score = await scoreConfidence(message, state.pending_question, callRoute);
      if (score != null) {
        const { data: prev } = await svc.from("civic_confidence").select("confidence_score, sample_count").eq("user_id", userId).order("last_updated", { ascending: false }).limit(1).maybeSingle();
        const n = (prev?.sample_count ?? 0) + 1;
        const avg = prev ? (Number(prev.confidence_score) * (n - 1) + score) / n : score;
        await svc.from("civic_confidence").insert({ user_id: userId, confidence_score: Math.round(avg * 1000) / 1000, sample_count: n });
      }
      state.pending_question = null;
    }

    const turns = (state.turns_since_prompt ?? 99) + 1;
    const urgent = URGENT.test(message);
    const since30 = new Date(Date.now() - 30 * 86400000).toISOString();
    const { count: recentSamples } = await svc.from("civic_confidence").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("last_updated", since30);
    const mayPrompt = !urgent && turns >= 5;

    const { data: journey } = await userClient.rpc("get_my_journey");
    const scores: Record<string, number> = persona.dimension_scores ?? {};
    const labels = persona.persona_labels ?? {};

    // Lesson nudge: question touches a low-scoring issue.
    let nudge: JourneyTurn["nudge"] = null;
    if (mayPrompt) {
      const low = Object.entries(scores).filter(([, v]) => Number(v) < 0.5).map(([k]) => k);
      const hit = low.find((slug) => DIM_KEYWORDS[slug]?.test(message));
      if (hit) {
        const { data: dim } = await svc.from("compass_dimensions").select("id").eq("slug", hit).maybeSingle();
        const { data: done } = await svc.from("user_lesson_progress").select("lesson_id").eq("user_id", userId).eq("status", "completed");
        const doneIds = new Set((done ?? []).map((d: any) => d.lesson_id));
        const { data: ls } = await svc.from("lessons").select("id, title").eq("is_published", true).eq("dimension_id", dim?.id ?? "").order("lesson_number");
        const pick = (ls ?? []).find((l: any) => !doneIds.has(l.id));
        if (pick) nudge = { lesson_id: pick.id, title: pick.title };
      }
    }

    let calibrationQuestion: string | null = null;
    if (!nudge && mayPrompt && (recentSamples ?? 0) < 3) {
      calibrationQuestion = CALIBRATION_QUESTIONS[Math.floor(Math.random() * CALIBRATION_QUESTIONS.length)];
    }

    const prompted = !!(nudge || calibrationQuestion);
    await svc.from("ask_calibration_state").upsert({
      user_id: userId,
      turns_since_prompt: prompted ? 0 : turns,
      pending_question: calibrationQuestion,
      pending_since: calibrationQuestion ? new Date().toISOString() : null,
      last_prompt_at: prompted ? new Date().toISOString() : (stRow?.last_prompt_at ?? null),
      updated_at: new Date().toISOString(),
    });

    const { data: challenge } = await userClient.rpc("get_my_challenge");
    const challengeText = challenge && challenge.active && !challenge.ended_at
      ? `A live Civic Games challenge called "${challenge.title}" is running until ${new Date(challenge.ends_at).toLocaleDateString("en-US")}. They have ${challenge.my_count} so far. If it fits the question, you may close by naming the challenge as their next step. Never name another person or another person's count.`
      : "No live challenge right now.";

    const step = journey?.next_step;
    const stepText = !step ? "none" : step.type === "lesson" ? `a 3 minute lesson called "${step.title}"`
      : step.type === "compass" ? "take the Civic Compass quiz"
      : step.type === "survey" ? `answer the survey "${step.title}"`
      : step.type === "office_action" ? `reach out to ${step.title}` : "explore My City in the app";
    const lowNames = Object.entries(scores).filter(([, v]) => Number(v) < 0.5).map(([k]) => k).join(", ") || "none";
    const firstTurn = historyLength === 0;
    let personaRow: any = null;
    if (labels.persona) {
      const { data } = await svc.from("compass_personas").select("slug, name, one_line").eq("slug", labels.persona).maybeSingle();
      personaRow = data;
    }
    const personaShort = personaRow ? String(personaRow.name).replace(/^The\s+/i, "") : null;
    const topic = personaRow ? PERSONA_TOPIC[personaRow.slug] ?? "your issues" : null;
    const greeting = !firstTurn ? null
      : personaShort ? `Welcome back, ${personaShort}.`
      : labels.lead_name ? `Welcome back. You lead with ${labels.lead_name}.` : null;

    let streakName: string | null = null;
    if (labels.streak) {
      const { data } = await svc.from("compass_personas").select("name").eq("slug", labels.streak).maybeSingle();
      streakName = data?.name ?? null;
    }
    const scoreText = Object.entries(scores).sort((x, y) => Number(y[1]) - Number(x[1]))
      .map(([k, v]) => `${k} ${Math.round(Number(v) * 100)}`).join(", ") || "none";

    // Short city snapshot so answers stay local. Full lists still come with office or budget questions.
    let cityText = "City facts: none on file yet.";
    try {
      const [{ data: offs }, { data: ud }] = await Promise.all([
        userClient.rpc("get_my_offices", { _user_id: userId }),
        svc.from("user_districts").select("resolved").eq("user_id", userId).maybeSingle(),
      ]);
      const offLines = (Array.isArray(offs) ? offs : []).filter((o: any) => o.match_level !== "county").slice(0, 4)
        .map((o: any) => `${o.office_title}: ${o.current_holder ?? "no one listed"}`).join(", ");
      const place = (ud as any)?.resolved?.place;
      let budgetLine = "";
      if (place) {
        const { data: bl } = await svc.from("civic_budget_percent_of_total")
          .select("fiscal_year, department_or_fund, percent_of_total, source_url, last_verified_at")
          .eq("geoid", place).eq("revenue_or_expense", "expense").order("fiscal_year", { ascending: false }).order("amount", { ascending: false }).limit(3);
        if (bl?.length) {
          budgetLine = ` Biggest budget areas for ${bl[0].fiscal_year}: ${bl.map((b: any) => `${b.department_or_fund} ${Math.round(Number(b.percent_of_total ?? 0))}%`).join(", ")}. Source ${bl[0].source_url ?? "unknown"}, checked ${String(bl[0].last_verified_at ?? "").slice(0, 10)}.`;
        }
      }
      if (offLines || budgetLine) cityText = `City facts, approved by our review team: ${offLines || "no offices matched yet"}.${budgetLine}`;
    } catch (_) { /* snapshot is optional */ }

    const contextText = [
      "<turn_context>",
      "This person chose to personalize UWAZI. Use this quietly. Never show scores.",
      `Identity: ${labels.primary ?? "unknown"}. Top issue: ${labels.lead_name ?? "unknown"}.`,
      personaRow ? `Civic persona: ${personaRow.name}. It says how they show up for their city, not what they believe. ${personaRow.one_line}` : "No civic persona yet.",
      streakName ? `Streak: ${streakName}.` : "No streak.",
      `Dimension scores out of 100, for your use only: ${scoreText}.`,
      cityText,
      `Stage: ${journey?.stage ?? "Getting Started"} with ${journey?.total_points ?? 0} points.`,
      `Next step: ${stepText}.`,
      `Issues they scored low on: ${lowNames}.`,
      challengeText,
      greeting
        ? `This is the first message of a new chat. Start your reply with exactly: "${greeting}" Then, if it fits, add one short sentence that starts "Here is what changed on ${topic ?? labels.lead_name} in your city this week." only if you can verify a real change. Then answer the question.`
        : "Do not greet them again.",
      "If it fits the question, end with one short line that suggests the next step. Skip it if it does not fit.",
      "Do not suggest a lesson yourself. The app adds lesson offers.",
      "Write in plain words and short sentences. Do not use em dashes, semicolons, or parentheses.",
      "</turn_context>",
    ].join("\n");

    return { contextText, greeting, calibrationQuestion, nudge };
  } catch (e) {
    console.error("journey context failed", e);
    return empty;
  }
}
