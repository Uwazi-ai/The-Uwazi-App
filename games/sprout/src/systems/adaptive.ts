/**
 * Adaptive difficulty: 3 correct in a row steps up, 2 misses in a row brings a hint and eases
 * the next prompt. There is never a game over.
 */
export interface AdaptiveState {
  level: number;
  correctRun: number;
  missRun: number;
  /** show Sprout's hint on the next prompt */
  hint: boolean;
  /** make the next prompt easier (fewer choices, smaller numbers) */
  ease: boolean;
  /** how many times a hint was shown this level, used for star scoring */
  hintsShown: number;
}

export interface AdaptiveBounds { min: number; max: number }

export const STEP_UP_AFTER = 3;
export const HINT_AFTER_MISSES = 2;

export const startAdaptive = (level: number): AdaptiveState => ({ level, correctRun: 0, missRun: 0, hint: false, ease: false, hintsShown: 0 });

export function applyResult(state: AdaptiveState, correct: boolean, bounds: AdaptiveBounds): AdaptiveState {
  if (correct) {
    const correctRun = state.correctRun + 1;
    const stepUp = correctRun >= STEP_UP_AFTER;
    return {
      ...state,
      correctRun: stepUp ? 0 : correctRun,
      missRun: 0,
      level: stepUp ? Math.min(bounds.max, state.level + 1) : state.level,
      hint: false,
      ease: false,
    };
  }
  const missRun = state.missRun + 1;
  const needsHint = missRun >= HINT_AFTER_MISSES;
  return {
    ...state,
    correctRun: 0,
    missRun: needsHint ? 0 : missRun,
    hint: needsHint,
    ease: needsHint,
    hintsShown: state.hintsShown + (needsHint ? 1 : 0),
    level: needsHint ? Math.max(bounds.min, state.level - (state.level > bounds.min ? 1 : 0)) : state.level,
  };
}

/** Clears the one-shot hint flags once a prompt has consumed them. */
export const consumeHint = (state: AdaptiveState): AdaptiveState => ({ ...state, hint: false, ease: false });
