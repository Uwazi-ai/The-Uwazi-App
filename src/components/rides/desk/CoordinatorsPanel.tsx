import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Found = { id: string; email: string; is_coordinator: boolean };
type Coord = { id: string; email: string };

// Admin only. Adds or removes the ride_coordinator role through logged server functions.
export function CoordinatorsPanel() {
  const [q, setQ] = useState("");
  const [found, setFound] = useState<Found[]>([]);
  const [list, setList] = useState<Coord[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const load = () => supabase.rpc("list_ride_coordinators").then(({ data }) => setList((data ?? []) as Coord[]));
  useEffect(() => { load(); }, []);

  const search = async () => {
    setMsg(null);
    const { data, error } = await supabase.rpc("admin_find_user", { _email: q });
    if (error) return setMsg("Search did not work. Try again.");
    setFound((data ?? []) as Found[]);
    if (!data?.length) setMsg("No one found with that email.");
  };
  const set = async (id: string, on: boolean) => {
    const { error } = await supabase.rpc("set_ride_coordinator", { _user_id: id, _on: on });
    if (error) return setMsg("That change did not save.");
    setMsg(on ? "Added as ride coordinator." : "Removed.");
    setFound((f) => f.map((x) => (x.id === id ? { ...x, is_coordinator: on } : x)));
    load();
  };

  return (
    <section className="mt-8 rounded-2xl bg-[hsl(var(--rides-blue)/0.18)] p-4">
      <h2 className="font-heading text-2xl">Coordinators</h2>
      <p className="mb-3 text-sm text-[hsl(var(--rides-ink)/0.7)]">Find a person by email. Then add them to the ride desk.</p>
      <form onSubmit={(e) => { e.preventDefault(); search(); }} className="flex gap-2">
        <input className="rides-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Email" aria-label="Search by email" />
        <button className="rounded-xl bg-[hsl(var(--rides-green))] px-4 font-semibold text-[hsl(var(--rides-bg))]">Search</button>
      </form>
      {msg && <p className="mt-2 text-sm">{msg}</p>}
      {found.length > 0 && (
        <ul className="mt-3 space-y-2">
          {found.map((u) => (
            <li key={u.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="break-all">{u.email}</span>
              {u.is_coordinator ? <span className="text-[hsl(var(--rides-ink)/0.6)]">Already a coordinator</span>
                : <button onClick={() => set(u.id, true)} className="min-h-[44px] rounded-xl bg-[hsl(var(--rides-green))] px-3 font-semibold text-[hsl(var(--rides-bg))]">Add as ride coordinator</button>}
            </li>
          ))}
        </ul>
      )}
      <h3 className="mt-5 font-semibold">Current coordinators</h3>
      {list.length === 0 ? <p className="text-sm">No coordinators yet. Admins can still use the desk.</p> : (
        <ul className="mt-2 space-y-2">
          {list.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="break-all">{c.email}</span>
              <button onClick={() => set(c.id, false)} className="min-h-[44px] rounded-xl border border-[hsl(var(--rides-ink)/0.25)] px-3 font-semibold">Remove</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
