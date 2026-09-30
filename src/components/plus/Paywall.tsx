import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, GraduationCap } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { PlusLogo } from "@/components/plus/PlusLogo";

export type PaywallReason = "ask" | "watch" | "lesson" | "my_city" | "report" | "officials" | "report_fact" | "general";

const EVENT = "uwazi:open-paywall";
export function openPaywall(reason: PaywallReason = "general") {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: reason }));
}

const COPY: Record<PaywallReason, { title: string; body: string; perks: string[] }> = {
  ask: { title: "Ask UWAZI as much as you want", body: "You have used your free questions for now. Plus has no limit.", perks: ["Unlimited Ask UWAZI questions", "Your full Compass report", "The full city budget", "Every Watch episode"] },
  watch: { title: "Watch every episode", body: "Free covers the newest episodes. Plus opens the whole library.", perks: ["Every Watch episode", "Unlimited Ask UWAZI questions", "Every lesson", "Your full Compass report"] },
  lesson: { title: "Open every lesson", body: "Your path lessons stay free. Plus opens the rest.", perks: ["Every lesson in every track", "Unlimited Ask UWAZI questions", "Every Watch episode", "Your full Compass report"] },
  my_city: { title: "Read the full city budget", body: "See every spending area, revenue, the year over year change, and who votes.", perks: ["The full city budget", "Budget calendar and who votes", "Unlimited Ask UWAZI questions", "Your full Compass report"] },
  report: { title: "Unlock your full Compass report", body: "See the real offices that match your values, why they matter, and what to watch.", perks: ["Offices that match your values", "Why each one matters", "What to watch next", "Unlimited Ask UWAZI questions"] },
  officials: { title: "See your officials in depth", body: "Who represents you at every level, how to reach them, and how they vote.", perks: ["Officials in depth", "Your full Compass report", "The full city budget", "Unlimited Ask UWAZI questions"] },
  report_fact: { title: "Report a wrong fact", body: "Flag anything that looks off and a real person reviews it.", perks: ["Report a wrong fact", "Officials in depth", "Your full Compass report", "Unlimited Ask UWAZI questions"] },
  general: { title: "Go further with UWAZI Plus", body: "Plus adds depth and tools. The free app always tells you the truth.", perks: ["Unlimited Ask UWAZI questions", "Your full Compass report", "The full city budget", "Every Watch episode and lesson"] },
};

export function PaywallHost() {
  const [reason, setReason] = useState<PaywallReason | null>(null);
  const navigate = useNavigate();
  useEffect(() => {
    const h = (e: Event) => setReason(((e as CustomEvent).detail as PaywallReason) || "general");
    window.addEventListener(EVENT, h);
    return () => window.removeEventListener(EVENT, h);
  }, []);
  const c = COPY[reason ?? "general"];
  const go = (path: string) => { setReason(null); navigate(path); };
  return (
    <Sheet open={!!reason} onOpenChange={(o) => !o && setReason(null)}>
      <SheetContent side="bottom" className="mx-auto max-w-lg rounded-t-3xl border-border pb-8" data-testid="paywall">
        <SheetHeader className="text-left">
          <PlusLogo on_dark className="h-7" />
          <SheetTitle className="pt-3 font-heading text-2xl leading-tight">{c.title}</SheetTitle>
          <SheetDescription>{c.body}</SheetDescription>
        </SheetHeader>
        <ul className="mt-4 space-y-2">
          {c.perks.map((p) => (
            <li key={p} className="flex items-center gap-2 text-sm text-foreground"><Check className="h-4 w-4 text-primary" />{p}</li>
          ))}
        </ul>
        <p className="mt-5 text-sm text-foreground"><span className="font-heading text-2xl text-primary">$19.99</span> a month after a free week. Cancel any time.</p>
        <Button size="lg" className="mt-3 w-full" onClick={() => go("/app/upgrade?plan=monthly")}>Start my free week</Button>
        <Button variant="outline" className="mt-2 w-full" onClick={() => go("/app/upgrade#student")}><GraduationCap className="h-4 w-4" />Are you a student? $7.99 a month</Button>
        <Link to="/app/upgrade" onClick={() => setReason(null)} className="mt-4 block text-center text-xs font-semibold text-primary underline">See all Plus features</Link>
      </SheetContent>
    </Sheet>
  );
}
