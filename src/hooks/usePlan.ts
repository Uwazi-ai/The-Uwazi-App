import { useSubscription } from "@/hooks/useSubscription";

/** One place to read the plan. isPlus is true for plus and plus_student. */
export function usePlan() {
  const { isPremium, plan, loading, refresh } = useSubscription();
  return { isPlus: isPremium, plan, loading, refresh };
}
