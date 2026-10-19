export interface CompassQuestion { id: string; dimension_id: string; prompt_text: string; weight: number; reverse_scored: boolean }
export interface CompassDimension { id: string; name: string; slug: string }

// Existing Compass math, extracted unchanged for persistence-free callers.
export function scoreAnswers(questions: CompassQuestion[], dims: CompassDimension[], all: Record<string, number>) {
  const acc: Record<string, { sum: number; w: number }> = {};
  for (const q of questions) {
    const raw = all[q.id];
    if (!raw) continue;
    const v = q.reverse_scored ? 6 - raw : raw;
    const w = Number(q.weight) || 1;
    acc[q.dimension_id] ??= { sum: 0, w: 0 };
    acc[q.dimension_id].sum += v * w;
    acc[q.dimension_id].w += w;
  }
  const scores: Record<string, number> = {};
  for (const d of dims) {
    const a = acc[d.id];
    if (a && a.w > 0) scores[d.slug] = Math.round(((a.sum / a.w - 1) / 4) * 1000) / 1000;
  }
  return scores;
}