import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Compass, Wallet, Landmark, Flag, ShieldCheck, MessageCircle, ArrowRight, Sparkles } from "lucide-react";
import { StudentPath } from "@/components/plus/StudentPath";
import { PlusLogo } from "@/components/plus/PlusLogo";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";

const PRICES = {
  monthly: { id: "uwazi_plus_monthly", label: "Monthly", price: "$19.99", suffix: "/month" },
  student: { id: "uwazi_plus_student_monthly", label: "Student monthly", price: "$7.99", suffix: "/month" },
} as const;
type Tier = keyof typeof PRICES;
const perks = [
  { icon: Compass, title: "Your full Compass report", body: "See which real offices match your values, why, and what to watch. Not just your persona.", tone: "city-tone-0" },
  { icon: Wallet, title: "My City budget", body: "See where every tax dollar goes, next to your own $100 split. Track it each year.", tone: "city-tone-1" },
  { icon: Landmark, title: "Your officials in depth", body: "Who represents you at every level, how to reach them, and how they vote.", tone: "city-tone-2" },
  { icon: Flag, title: "Report a wrong fact", body: "Flag anything that looks off and a real person reviews it.", tone: "city-tone-4" },
];
export default function UpgradePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPremium, loading } = useSubscription();
  const [tier, setTier] = useState<Tier>("monthly");
  const [checkout, setCheckout] = useState(false);
  useEffect(() => { if (!loading && isPremium) navigate("/app/settings/subscription", { replace: true }); }, [isPremium, loading, navigate]);
  useEffect(() => { if (window.location.hash === "#student") setTimeout(() => document.getElementById("student")?.scrollIntoView(), 300); }, []);
  const selected = PRICES[tier];
  const returnUrl = `${window.location.origin}/app/checkout/return?session_id={CHECKOUT_SESSION_ID}`;
  return <div className="city-bento min-h-screen bg-background"><PaymentTestModeBanner /><div className="mx-auto max-w-2xl space-y-6 px-4 py-6 pb-24 md:px-8">
    <Button variant="ghost" onClick={() => checkout ? setCheckout(false) : navigate(-1)} className="-ml-3 text-muted-foreground"><ArrowLeft />{checkout ? "Back to Plus" : "Back"}</Button>
    {!checkout ? <>
      <header><PlusLogo on_dark={false} className="h-8" /><h1 className="mt-4 font-heading text-3xl leading-tight text-foreground sm:text-4xl">Go from knowing to doing</h1><p className="mt-3 text-sm leading-relaxed text-muted-foreground">You already have your persona and your representatives. Plus shows you the full picture and how to act on it.</p></header>
      <div className="space-y-1 border-y border-border py-3">{perks.map((perk) => <div key={perk.title} className="flex items-start gap-4 py-3"><div className={`${perk.tone} city-tone-tint city-tone-text flex h-11 w-11 shrink-0 items-center justify-center rounded-lg`}><perk.icon className="h-5 w-5" /></div><div><h2 className="font-heading text-base text-foreground">{perk.title}</h2><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{perk.body}</p></div></div>)}</div>
      <section className="city-tile rounded-[20px] border border-primary bg-card p-5 sm:p-6"><div className="flex items-end justify-between gap-3"><div><p className="eyebrow">UWAZI PLUS</p><h2 className="mt-2 font-heading text-2xl">Plus</h2></div><p className="text-right"><span className="font-heading text-3xl text-primary">{selected.price}</span><span className="block text-xs text-muted-foreground">{selected.suffix}</span></p></div>
        <p className="mt-5 text-sm text-foreground">Billed monthly. Cancel any time.</p><Button size="lg" className="mt-4 w-full" onClick={() => { setTier("monthly"); setCheckout(true); }}>Get Plus for $19.99 <ArrowRight /></Button>
        <p className="mt-4 text-center text-xs text-muted-foreground">Are you a student? <a href="#student" className="font-semibold text-primary underline">Get Plus for $7.99.</a></p>
      </section>
      <StudentPath onStart={() => { setTier("student"); setCheckout(true); }} />
      <section className="city-tile rounded-[20px] border border-border bg-card p-5"><ShieldCheck className="h-5 w-5 text-primary" /><h2 className="mt-2 font-heading text-lg">Our promise to you</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">UWAZI is nonpartisan. Plus never changes what we show or hides a fact behind a paywall. The free app always tells you the truth. Plus adds depth and tools.</p><Link className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary" to="/fair">How UWAZI stays fair <ArrowRight className="h-4 w-4" /></Link></section>
      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5"><span className="text-sm text-muted-foreground">See if Plus fits your journey.</span><Button asChild variant="outline"><Link to="/app/ask?q=What%20would%20UWAZI%20Plus%20help%20me%20do"><MessageCircle />Ask UWAZI</Link></Button></div>
    </> : <section className="space-y-4"><div><p className="eyebrow">Your next step</p><h1 className="mt-2 font-heading text-2xl">{tier === "student" ? "Start Plus Student" : "Start Plus"}</h1><p className="mt-1 text-sm text-muted-foreground">{`${selected.price}${selected.suffix}. Cancel any time.`}</p></div><div className="rounded-[20px] border border-primary bg-card p-4"><StripeEmbeddedCheckout key={selected.id} priceId={selected.id} customerEmail={user?.email} userId={user?.id} returnUrl={returnUrl} /></div></section>}
  </div></div>;
}
