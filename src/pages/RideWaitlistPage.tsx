import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PollRideTeaser } from "@/components/home/PollRideTeaser";
import type { VoterState } from "@/hooks/useVotingRights";

export default function RideWaitlistPage() {
  const [state, setState] = useState<VoterState>("MO");
  useEffect(() => { document.title = "Free rides to the polls | UWAZI"; }, []);
  return (
    <main className="min-h-dvh overflow-x-hidden bg-background px-4 py-10">
      <div className="mx-auto flex max-w-md flex-col gap-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-primary">UWAZI rides</p>
          <h1 className="mt-1 font-heading text-3xl tracking-[-0.02em] text-foreground">Get a text when rides open</h1>
          <p className="mt-2 text-sm text-muted-foreground">Free rides to vote in the Kansas City area. Pick your state, then add your number.</p>
        </div>
        <div className="flex gap-2" role="group" aria-label="Your state">
          {(["MO", "KS"] as VoterState[]).map((s) => (
            <button key={s} type="button" aria-pressed={state === s} onClick={() => setState(s)}
              className={`min-h-[44px] flex-1 rounded-full border text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${state === s ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground"}`}>
              {s === "MO" ? "Missouri" : "Kansas"}
            </button>
          ))}
        </div>
        <PollRideTeaser state={state} startWithPhone />
        <p className="text-xs text-muted-foreground">We never ask who you vote for. Already have an account? <Link to="/login" className="underline">Sign in</Link>.</p>
      </div>
    </main>
  );
}
