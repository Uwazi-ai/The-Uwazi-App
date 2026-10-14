import { useEffect, useState } from "react";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Log = { note: string | null; created_at: string };

/** Admin only. Reloads the Kansas City Election Board precinct map. */
export function PrecinctMapRefresh() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [last, setLast] = useState<Log | null>(null);

  const loadLast = () =>
    supabase.from("ride_admin_log").select("note,created_at").eq("action", "kceb_precincts_reload")
      .order("created_at", { ascending: false }).limit(1).maybeSingle()
      .then(({ data }) => setLast(data as Log | null));
  useEffect(() => { loadLast(); }, []);

  const run = async () => {
    setBusy(true);
    setMsg(null);
    const { data, error } = await supabase.functions.invoke("kceb-precinct-refresh", { body: {} });
    setBusy(false);
    if (error) {
      const j = error instanceof FunctionsHttpError ? await error.context.json().catch(() => null) : null;
      return setMsg(j?.error ?? "The reload failed. The old map is still in place.");
    }
    setMsg(`Loaded ${data.features} map shapes into ${data.precincts} precincts.`);
    loadLast();
  };

  return (
    <section className="mt-6 rounded-2xl border border-[hsl(var(--rides-ink)/0.2)] p-4 space-y-2">
      <h2 className="font-heading text-xl">Precinct map</h2>
      <p className="text-sm text-[hsl(var(--rides-ink)/0.7)]">Reload the Kansas City Election Board precinct map. Do this if the Board changes its map before Nov 3.</p>
      {last && (
        <p className="text-xs text-[hsl(var(--rides-ink)/0.6)]">
          Last reload {new Date(last.created_at).toLocaleString()}. {last.note}
        </p>
      )}
      <button className="rides-btn" disabled={busy} onClick={run}>{busy ? "Reloading." : "Reload precinct map"}</button>
      {msg && <p role="status" className="text-sm">{msg}</p>}
    </section>
  );
}
