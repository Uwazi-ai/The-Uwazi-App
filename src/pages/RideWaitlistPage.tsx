import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link, Navigate } from "react-router-dom";
import { ridesAreLive } from "@/lib/ridesLive";
import { PollRideTeaser } from "@/components/home/PollRideTeaser";
import { RidesAppShell } from "@/components/rides/RidesAppShell";

export default function RideWaitlistPage() {
  const [smsLive, setSmsLive] = useState(false);
  useEffect(() => { supabase.functions.invoke("get-ride-availability", { body: {} }).then(({ data }) => setSmsLive(data?.sms_live === true)); }, []);
  useEffect(() => { document.title = "Free rides to the polls | UWAZI"; }, []);
  // The general waitlist goes away once rides are on. Day lists live on /rides.
  if (ridesAreLive({ allowTestFlag: false })) return <Navigate to="/rides" replace />;
  return (
    <RidesAppShell>
      <div className="mx-auto flex max-w-md flex-col gap-5 px-4 py-8">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-primary">UWAZI rides</p>
          <h1 className="mt-1 font-heading text-3xl tracking-[-0.02em] text-foreground">{smsLive ? "Get a text when rides open" : "Get a call when rides open"}</h1>
          <p className="mt-2 text-sm text-muted-foreground">Free rides to vote, for voters who live in Kansas City, in Jackson County. {smsLive ? "Add your address and number and we will text you when booking opens." : "Add your address and number. A coordinator will call you when booking opens."}</p>
        </div>
        <PollRideTeaser state="MO" startWithPhone />
        <p className="text-xs text-muted-foreground">We never ask who you vote for. Already have an account? <Link to="/login" className="underline">Sign in</Link>.</p>
      </div>
    </RidesAppShell>
  );
}
