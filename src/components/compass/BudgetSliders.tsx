import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";

export const BUDGET_KEYS = [
  { key: "safety", label: "Safety" },
  { key: "housing", label: "Housing" },
  { key: "schools_youth", label: "Schools and youth" },
  { key: "streets_transit", label: "Streets and transit" },
  { key: "health", label: "Health" },
  { key: "jobs", label: "Jobs" },
] as const;

export type Budget = Record<(typeof BUDGET_KEYS)[number]["key"], number>;

export const defaultBudget = (): Budget => ({ safety: 17, housing: 17, schools_youth: 17, streets_transit: 17, health: 16, jobs: 16 });

// Moving one slider takes from or gives to the others so the total stays at 100.
export function rebalance(b: Budget, key: keyof Budget, value: number): Budget {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const next = { ...b, [key]: v } as Budget;
  let diff = Object.values(next).reduce((a, n) => a + n, 0) - 100;
  const others = BUDGET_KEYS.map((k) => k.key).filter((k) => k !== key);
  let guard = 0;
  while (diff !== 0 && guard++ < 1000) {
    const pool = others.filter((k) => (diff > 0 ? next[k] > 0 : next[k] < 100));
    if (!pool.length) break;
    // take from the largest, or give to the smallest
    pool.sort((a, c) => (diff > 0 ? next[c] - next[a] : next[a] - next[c]));
    next[pool[0]] += diff > 0 ? -1 : 1;
    diff += diff > 0 ? -1 : 1;
  }
  return next;
}

export function BudgetSliders({ value, onChange, onDone, onBack }: { value: Budget; onChange: (b: Budget) => void; onDone: () => void; onBack: () => void }) {
  const total = Object.values(value).reduce((a, n) => a + n, 0);
  return (
    <div className="space-y-5">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-extrabold text-foreground">You have $100 of city money. Split it.</h2>
        <p className="text-sm text-muted-foreground">Move a slider and the others shift so it always adds up to $100.</p>
      </div>
      <div className="bg-card rounded-2xl p-5 border border-border space-y-5">
        {BUDGET_KEYS.map((k) => (
          <div key={k.key} className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-foreground font-medium">{k.label}</span>
              <span className="text-primary font-bold" data-testid={`budget-${k.key}`}>${value[k.key]}</span>
            </div>
            <Slider aria-label={k.label} value={[value[k.key]]} min={0} max={100} step={1}
              onValueChange={([n]) => onChange(rebalance(value, k.key, n))} />
          </div>
        ))}
        <p className="text-sm text-center text-muted-foreground">Total: <span className="font-bold text-foreground" data-testid="budget-total">${total}</span></p>
      </div>
      <div className="flex justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>Back</Button>
        <Button size="lg" onClick={onDone} disabled={total !== 100}>Save my split</Button>
      </div>
    </div>
  );
}
