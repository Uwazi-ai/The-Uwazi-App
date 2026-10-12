import { useEffect } from "react";
import { Link } from "react-router-dom";
import { PollRideTeaser } from "@/components/home/PollRideTeaser";
import { RidesTopBar } from "@/components/rides/RidesTopBar";

export default function RideWaitlistPage() {
  useEffect(() => { document.title = "Free rides to the polls | UWAZI"; }, []);
  return (
    <div className="min-h-dvh overflow-x-hidden bg-background flex flex-col">
      <RidesTopBar />
      <main className="flex-1 px-4 py-8">
      <div className="mx-auto flex max-w-md flex-col gap-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-primary">UWAZI rides</p>
          <h1 className="mt-1 font-heading text-3xl tracking-[-0.02em] text-foreground">Get a text when rides open</h1>
          <p className="mt-2 text-sm text-muted-foreground">Free rides to vote in Missouri. Add your number and we will text you when booking opens.</p>
        </div>
        <PollRideTeaser state="MO" startWithPhone />
        <p className="text-xs text-muted-foreground">We never ask who you vote for. Already have an account? <Link to="/login" className="underline">Sign in</Link>.</p>
      </div>
      </main>
    </div>
  );
}
