// Decides on the server which Ask messages skip the free question count.
// Fact cards and did-you-know prompts skip only with an id this server signed.
// Calibration replies skip only when this server asked a calibration question in the same session.
import { serviceClient } from "./journey.ts";

const STATIC_PROMPTS = new Set([
  "What's on my ballot?", "Who represents me?", "How do I vote in my state?",
  "Explain a bill in plain language", "When is the next election?",
  "How do I research the candidates on my ballot?", "Tell me about the judges on my ballot",
  "Who are my local representatives?", "What local issues should I know about?",
]);
const TEMPLATES = [
  /^What's on my ballot in [A-Za-z0-9 .]{2,30}\?$/,
  /^What elections are coming up in \d{5}\?$/,
  /^Who represents me in \d{5}\?$/,
];

async function hmac(text: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")! + ":ask-card"),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(text)));
  return btoa(String.fromCharCode(...sig)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
const cardId = (userId: string, prompt: string) => hmac(`${userId}\n${prompt.trim()}`);

async function allowedPrompts(): Promise<Set<string>> {
  const svc = serviceClient();
  const out = new Set(STATIC_PROMPTS);
  const [{ data: personas }, { data: rights }] = await Promise.all([
    svc.from("compass_personas").select("suggested_prompts"),
    svc.from("rights_cards").select("ask_uwazi_prompt"),
  ]);
  for (const p of personas ?? []) for (const q of (p as any).suggested_prompts ?? []) if (typeof q === "string") out.add(q.trim());
  for (const r of rights ?? []) if ((r as any).ask_uwazi_prompt) out.add(String((r as any).ask_uwazi_prompt).trim());
  return out;
}

/** Sign only prompts the server itself would show as cards. */
export async function issueCards(userId: string, prompts: unknown): Promise<Record<string, string>> {
  if (!Array.isArray(prompts)) return {};
  const allow = await allowedPrompts();
  const cards: Record<string, string> = {};
  for (const p of prompts.slice(0, 30)) {
    if (typeof p !== "string" || p.length > 300) continue;
    const t = p.trim();
    if (allow.has(t) || TEMPLATES.some((r) => r.test(t))) cards[t] = await cardId(userId, t);
  }
  return cards;
}

export async function isFreeMessage(userId: string, message: string, promptId: unknown, sessionId: unknown): Promise<"fact_card" | "calibration" | null> {
  if (typeof promptId === "string" && promptId.length > 20) {
    if ((await cardId(userId, message)) === promptId) return "fact_card";
  }
  if (typeof sessionId === "string" && sessionId.length >= 8) {
    const { data } = await serviceClient().from("ask_calibration_state")
      .select("pending_question, pending_since, pending_session_id").eq("user_id", userId).maybeSingle();
    const fresh = data?.pending_since && Date.now() - new Date(data.pending_since).getTime() < 2 * 3600_000;
    if (data?.pending_question && fresh && data.pending_session_id === sessionId) return "calibration";
  }
  return null;
}
