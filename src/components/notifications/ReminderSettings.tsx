import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const db = supabase as any;
type Key = "budget_milestones" | "challenges" | "elections";
const ITEMS: { key: Key; label: string; desc: string }[] = [
  { key: "budget_milestones", label: "Budget dates", desc: "A reminder one week and one day before a budget date in your city." },
  { key: "challenges", label: "Civic Games", desc: "A note when a ZIP challenge starts and when it ends." },
  { key: "elections", label: "Elections", desc: "Reminders on the last day to register, the first day of early voting, and Election Day." },
];

export function ReminderSettings() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<Record<Key, boolean>>({ budget_milestones: false, challenges: false, elections: false });

  useEffect(() => {
    if (!user) return;
    db.from("notification_prefs").select("budget_milestones, challenges, elections").eq("user_id", user.id).maybeSingle()
      .then(({ data }: any) => { if (data) setPrefs(data); });
  }, [user]);

  const set = async (key: Key, value: boolean) => {
    if (!user) return;
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    const { error } = await db.from("notification_prefs").upsert({ user_id: user.id, ...next });
    if (error) { setPrefs(prefs); toast.error("We could not save that. Try again."); }
  };

  return (
    <div className="space-y-3 border-t border-border pt-4" data-testid="reminder-settings">
      <div>
        <p className="text-sm font-semibold text-foreground">Reminders</p>
        <p className="text-xs text-muted-foreground">All start off. You get at most one a day. The most urgent one comes first.</p>
      </div>
      {ITEMS.map((it) => (
        <div key={it.key} className="flex items-center justify-between gap-4 py-1">
          <div>
            <p className="text-sm font-medium text-foreground">{it.label}</p>
            <p className="text-xs text-muted-foreground">{it.desc}</p>
          </div>
          <Switch checked={prefs[it.key]} onCheckedChange={(v) => set(it.key, v)} aria-label={it.label} />
        </div>
      ))}
    </div>
  );
}
