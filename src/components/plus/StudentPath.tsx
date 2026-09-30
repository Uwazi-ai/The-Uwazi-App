import { useEffect, useState } from "react";
import { GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Status = { method: string; status: string; school_name: string | null; verified_at: string | null } | null;

async function call(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("student-verify", { body });
  if (error) {
    let msg = "Something went wrong. Try again.";
    try { msg = (await (error as any).context?.json())?.error ?? msg; } catch { /* keep */ }
    throw new Error(msg);
  }
  return data;
}

/** Student path. School email first, then a school name and student ID fallback. */
export function StudentPath({ onStart }: { onStart: () => void }) {
  const [status, setStatus] = useState<Status>(null);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [fallback, setFallback] = useState(false);
  const [school, setSchool] = useState("");
  const [sid, setSid] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { call({ action: "status" }).then((d) => setStatus(d?.verification ?? null)).catch(() => {}); }, []);

  const run = async (fn: () => Promise<void>) => { setBusy(true); try { await fn(); } catch (e) { toast.error((e as Error).message); } setBusy(false); };

  return (
    <section id="student" className="city-tile scroll-mt-20 rounded-[20px] border border-border bg-card p-5" data-testid="student-path">
      <GraduationCap className="h-5 w-5 text-primary" />
      <h2 className="mt-2 font-heading text-lg">Are you a student?</h2>
      <p className="mt-1 text-sm text-muted-foreground">Get all of UWAZI Plus for <span className="font-heading text-primary">$7.99</span> a month.</p>

      {status?.status === "verified" ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-foreground">You are confirmed as a student.</p>
          <Button className="w-full" size="lg" onClick={onStart}>Get Plus Student for $7.99</Button>
        </div>
      ) : status?.status === "needs_review" ? (
        <p className="mt-4 text-sm text-foreground">Thanks. A person is checking your school details. We will let you know.</p>
      ) : sent ? (
        <p className="mt-4 text-sm text-foreground" data-testid="student-sent">Check your school email. Tap the link we sent to confirm.</p>
      ) : !fallback ? (
        <form className="mt-4 space-y-2" onSubmit={(e) => { e.preventDefault(); run(async () => { await call({ action: "send_email", email }); setSent(true); }); }}>
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@school.edu" aria-label="School email" />
          <Button type="submit" className="w-full" disabled={busy}>Send my confirmation link</Button>
          <button type="button" className="block w-full text-center text-xs text-muted-foreground underline" onClick={() => setFallback(true)}>My school has no school email</button>
        </form>
      ) : (
        <form className="mt-4 space-y-2" onSubmit={(e) => { e.preventDefault(); run(async () => { await call({ action: "id_fallback", school_name: school, student_id: sid }); setSid(""); setStatus({ method: "student_id", status: "needs_review", school_name: school, verified_at: null }); }); }}>
          <Input required value={school} onChange={(e) => setSchool(e.target.value)} placeholder="School name" aria-label="School name" />
          <Input required value={sid} onChange={(e) => setSid(e.target.value)} placeholder="Student ID" aria-label="Student ID" autoComplete="off" />
          <p className="text-xs text-muted-foreground">We never keep your ID number. We keep only a scrambled code made from it.</p>
          <Button type="submit" className="w-full" disabled={busy}>Send for review</Button>
          <button type="button" className="block w-full text-center text-xs text-muted-foreground underline" onClick={() => setFallback(false)}>Use a school email instead</button>
        </form>
      )}
    </section>
  );
}
