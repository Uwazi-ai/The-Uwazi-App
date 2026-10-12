import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Car } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { POLL_RIDES_LIVE, useJoinRideWaitlist, type VoterState } from "@/hooks/useVotingRights";

const TEAL = "#34d3b4";
const DONE_MSG = "You are on the list. We will text you when rides open.";
const btn = "flex w-full min-h-[48px] items-center justify-center rounded-[10px] text-[15px] font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-80";

export function PollRideTeaser({ state, startWithPhone = false }: { state: VoterState; startWithPhone?: boolean }) {
  const { user } = useAuth();
  const { join, status } = useJoinRideWaitlist();
  const [onList, setOnList] = useState(false);
  const [showPhone, setShowPhone] = useState(startWithPhone);
  const [phone, setPhone] = useState("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!user || POLL_RIDES_LIVE) return;
    supabase.from("poll_ride_waitlist").select("id").eq("user_id", user.id).limit(1)
      .then(({ data }) => { if (data && data.length) setOnList(true); });
  }, [user]);

  const finish = () => { setOnList(true); setShowPhone(false); toast.success(DONE_MSG); };

  const onNotify = async () => {
    if (!user) { setShowPhone(true); return; }
    if (await join({ state })) finish();
    else toast.error("Something went wrong. Try again.");
  };

  const onSubmitPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    const digits = phone.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
    if (!/^\d{10}$/.test(digits)) { setErr("Enter a 10-digit mobile number."); return; }
    setErr(null);
    if (await join({ phone: digits, state })) finish();
    else setErr("Something went wrong. Try again.");
  };

  const saving = status === "saving";

  return (
    <div className="flex flex-col gap-4 rounded-[14px] p-[18px]" style={{ background: "#0e2622", border: "1px solid rgba(52,211,180,0.40)" }}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: TEAL }}>
          {POLL_RIDES_LIVE ? "NOW BOOKING" : "COMING SOON"}
        </span>
        <span className="text-xs text-muted-foreground">Powered by <b className="text-foreground">zTrip</b></span>
      </div>

      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px]" style={{ background: TEAL }}>
          <Car aria-hidden="true" className="h-6 w-6" style={{ color: "#0a0a0a" }} />
        </div>
        <div className="min-w-0">
          <h3 className="font-heading text-[22px] leading-tight tracking-[-0.02em] text-foreground">Free rides to the polls</h3>
          <p className="mt-1 text-sm" style={{ color: "#c9c9cf" }}>
            Need a way to vote? Book a ride to your early voting site or polling place, right here in UWAZI.
          </p>
        </div>
      </div>

      <ol className="grid grid-cols-3 gap-2">
        {[["01", "Book in the app"], ["02", "Get picked up"], ["03", "Cast your vote"]].map(([n, t]) => (
          <li key={n} className="rounded-[10px] p-2.5" style={{ background: "rgba(0,0,0,0.28)" }}>
            <div className="text-[11px] font-bold" style={{ color: TEAL }}>{n}</div>
            <div className="text-[13px] font-semibold leading-snug text-foreground">{t}</div>
          </li>
        ))}
      </ol>

      {POLL_RIDES_LIVE ? (
        <Link to="/rides" className={btn} style={{ background: TEAL, color: "#0a0a0a" }}>Book a ride</Link>
      ) : (
        <div className="flex flex-col gap-2">
          {onList ? (
            <button type="button" disabled className={btn} style={{ background: TEAL, color: "#0a0a0a" }}>You are on the list</button>
          ) : showPhone && !user ? (
            <form onSubmit={onSubmitPhone} noValidate className="flex flex-col gap-2">
              <label htmlFor="ride-waitlist-phone" className="text-[13px] font-semibold text-foreground">Mobile number</label>
              <div className="flex gap-2">
                <input
                  id="ride-waitlist-phone" type="tel" inputMode="tel" autoComplete="tel" value={phone}
                  onChange={(e) => { setPhone(e.target.value); setErr(null); }}
                  aria-invalid={!!err} aria-describedby={err ? "ride-waitlist-err" : undefined}
                  placeholder="(816) 555-0123" maxLength={20}
                  className="min-h-[48px] min-w-0 flex-1 rounded-[10px] border border-border bg-background px-3 text-[15px] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <button type="submit" disabled={saving} className="min-h-[48px] rounded-[10px] px-4 text-[15px] font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" style={{ background: TEAL, color: "#0a0a0a" }}>
                  Notify me
                </button>
              </div>
              {err && <p id="ride-waitlist-err" role="alert" className="text-[13px] text-destructive">{err}</p>}
            </form>
          ) : (
            <button type="button" onClick={onNotify} disabled={saving} className={btn} style={{ background: TEAL, color: "#0a0a0a" }}>
              Notify me when rides open
            </button>
          )}
          <p className="text-[11px] text-muted-foreground">We only text about poll rides. Reply STOP to opt out.</p>
        </div>
      )}
    </div>
  );
}
