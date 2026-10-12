import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Q = {
  id: string; state: string; sort: number; title: string | null; question: string; options: unknown;
  correct_index: number; explanation: string | null; takeaway: string | null; approved_at: string | null; approver_email: string | null;
};

// Admin only review screen for rights quiz copy. Riders only see approved rows.
export default function RideRightsReviewPage() {
  const { user, loading } = useAuth();
  const [admin, setAdmin] = useState<boolean | null>(null);
  const [rows, setRows] = useState<Q[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const load = () => supabase.rpc("admin_rights_questions").then(({ data }) => setRows((data ?? []) as Q[]));
  useEffect(() => {
    if (!user) return;
    supabase.rpc("is_admin", { _user_id: user.id }).then(({ data }) => { setAdmin(!!data); if (data) load(); });
  }, [user]);

  const set = async (id: string, approve: boolean) => {
    const { error } = await supabase.rpc("set_rights_question_approval", { _id: id, _approve: approve });
    setMsg(error ? "That change did not save." : approve ? "Approved." : "Unapproved.");
    load();
  };

  if (loading || (user && admin === null)) return <Shell><p>Loading.</p></Shell>;
  if (!user) return <Navigate to="/login?next=/rides/desk/rights" replace />;
  if (!admin) return <Shell><h1 className="font-heading text-3xl">This page is for admins.</h1></Shell>;

  const states = Array.from(new Set(rows.map((r) => r.state)));
  return (
    <Shell>
      <Link to="/rides/desk" className="text-sm underline">Back to the ride desk</Link>
      <h1 className="mt-3 font-heading text-3xl">Review rights questions</h1>
      <p className="mt-2 text-sm text-[hsl(var(--rides-ink)/0.7)]">Riders only see approved questions. Approve each one after legal review.</p>
      {msg && <p className="mt-2 text-sm">{msg}</p>}
      {states.map((st) => (
        <section key={st} className="mt-6">
          <h2 className="font-heading text-2xl">{st === "MO" ? "Missouri" : st === "KS" ? "Kansas" : st} <span className="text-base font-normal text-[hsl(var(--rides-ink)/0.6)]">{rows.filter((r) => r.state === st && r.approved_at).length} of {rows.filter((r) => r.state === st).length} approved</span></h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {rows.filter((r) => r.state === st).map((r) => {
              const opts = Array.isArray(r.options) ? (r.options as unknown[]).map(String) : [];
              return (
                <article key={r.id} className="rounded-2xl border border-[hsl(var(--rides-ink)/0.15)] p-4 text-sm">
                  <p className="text-xs text-[hsl(var(--rides-ink)/0.6)]">Question {r.sort}</p>
                  {r.title && <h3 className="font-semibold">{r.title}</h3>}
                  <p className="mt-1">{r.question}</p>
                  <ol className="mt-2 space-y-1">
                    {opts.map((o, i) => (
                      <li key={i} className={i === r.correct_index ? "font-semibold text-[hsl(var(--rides-green))]" : ""}>{String.fromCharCode(65 + i)}. {o}{i === r.correct_index ? " (correct)" : ""}</li>
                    ))}
                  </ol>
                  {r.explanation && <p className="mt-2"><span className="font-semibold">Why: </span>{r.explanation}</p>}
                  {r.takeaway && <p className="mt-1"><span className="font-semibold">Takeaway: </span>{r.takeaway}</p>}
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <p className="text-xs text-[hsl(var(--rides-ink)/0.7)]">
                      {r.approved_at ? `Approved by ${r.approver_email ?? "an admin"} on ${new Date(r.approved_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}` : "Not approved"}
                    </p>
                    {r.approved_at
                      ? <button onClick={() => set(r.id, false)} className="min-h-[44px] rounded-xl border border-[hsl(var(--rides-ink)/0.25)] px-3 font-semibold">Unapprove</button>
                      : <button onClick={() => set(r.id, true)} className="min-h-[44px] rounded-xl bg-[hsl(var(--rides-green))] px-3 font-semibold text-[hsl(var(--rides-bg))]">Approve</button>}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-[100dvh] overflow-x-hidden bg-[hsl(var(--rides-bg))] text-[hsl(var(--rides-ink))]">
      <div className="mx-auto max-w-[1100px] px-4 pb-16 pt-[calc(var(--sat)+1rem)] md:px-6">{children}</div>
    </main>
  );
}
