import type { CompassDimension, CompassQuestion } from "./compassScoring";

export type DemoPersona = { slug: string; name: string; one_line: string; strength: string; blind_spot: string; archetype_intro: string | null; archetype_examples: string | null; next_step_lean: string; top_dimension_slug: string | null };
export type DemoLabels = { persona: string; streak: string | null; primary: string };
export type DemoCompletion = { p_event_slug: string; p_persona_key: string; p_top_issues: string[]; p_duration: number; p_completion_id: string };
export type DemoRun = { startedAt: number; answers: Record<string, number>; index: number; stage: "intro" | "quiz" | "budget" | "result"; result: { scores: Record<string, number>; labels: DemoLabels; top: string[]; duration: number; id: string } | null; logged: boolean };
export const demoRunKey = (slug: string) => `uwazi:compass-demo:${slug}:run`;
export const demoQueueKey = (slug: string) => `uwazi:compass-demo:${slug}:pending`;
export const newDemoRun = (): DemoRun => ({ startedAt: Date.now(), answers: {}, index: 0, stage: "intro", result: null, logged: false });
export function loadDemoRun(slug: string): DemoRun {
  try { const value = JSON.parse(sessionStorage.getItem(demoRunKey(slug)) ?? "null"); if (value && ["intro", "quiz", "budget", "result"].includes(value.stage) && typeof value.startedAt === "number" && value.answers) return value; } catch { /* session storage may be unavailable */ }
  return newDemoRun();
}
export function storeDemoRun(slug: string, run: DemoRun) { try { sessionStorage.setItem(demoRunKey(slug), JSON.stringify(run)); } catch { /* memory still works */ } }
export function clearDemoRun(slug: string) { try { sessionStorage.removeItem(demoRunKey(slug)); sessionStorage.removeItem(demoQueueKey(slug)); } catch { /* memory reset still works */ } }
export function completionFor(slug: string, run: DemoRun): DemoCompletion | null {
  const result = run.result;
  return result ? { p_event_slug: slug, p_persona_key: result.labels.persona, p_top_issues: result.top, p_duration: result.duration, p_completion_id: result.id } : null;
}

// Anonymous REST requests deliberately do not import the authenticated app client.
// No auth calls, stored session, user identifiers or engagement requests.
export async function demoRequest<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/${path}`, {
    method: body === undefined ? "GET" : "POST", credentials: "omit", signal,
    headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!response.ok) throw new Error("Demo request unavailable");
  return response.json();
}
export async function loadDemoCatalog() {
  const [questions, dimensions, personas] = await Promise.all([
    demoRequest<CompassQuestion[]>("compass_questions?select=id,dimension_id,prompt_text,weight,reverse_scored&active=eq.true&order=order_index&limit=20"),
    demoRequest<CompassDimension[]>("compass_dimensions?select=id,name,slug"),
    demoRequest<DemoPersona[]>("compass_personas?select=slug,name,one_line,strength,blind_spot,archetype_intro,archetype_examples,next_step_lean,top_dimension_slug&order=sort_order"),
  ]);
  if (!questions.length) throw new Error("No Compass questions available");
  return { questions, dimensions, personas };
}