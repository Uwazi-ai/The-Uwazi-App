import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { Compass, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { US_STATES, getStateFromZip } from "@/utils/stateFromZip";
import { promoReturnPath } from "@/lib/pendingPromo";
import { getStoredOrgSlug, clearStoredOrgSlug } from "@/hooks/useOrgTracking";
import { useNextElection, formatElectionDate } from "@/hooks/useNextElection";
import appIcon from "@/assets/uwazi-pinwheel.png";

const db = supabase as any;
const PERSONA_DOTS = ["primary", "blue", "orange", "coral", "purple", "teal", "sky", "gold"];
const money = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: v >= 1e6 ? "compact" : "standard", maximumFractionDigits: 1 }).format(v);

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const reduce = useReducedMotion();
  const [params] = useSearchParams();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // A promo code in the link is still redeemed, with no extra screen.
  useEffect(() => {
    const code = (params.get("code") || "").trim().toUpperCase();
    if (!code || !user) return;
    db.rpc("redeem_code", { p_code: code }).then(({ data }: any) => {
      if (data?.ok) toast.success(data.message || "Your code is on your account.");
    });
  }, [user, params]);

  /** Marks setup done and sends the person into the app. */
  const finish = async (to = "/app") => {
    if (!user) return;
    setSaving(true);
    try {
      const org = getStoredOrgSlug();
      const update: Record<string, any> = { onboarding_complete: true };
      if (org) update.referred_by_org = org;
      await db.from("profiles").update(update).eq("user_id", user.id);
      if (org) {
        const { data: row } = await db.from("partner_orgs").select("id").eq("slug", org).maybeSingle();
        if (row) await db.from("org_registrations").insert({ org_id: row.id, user_id: user.id, event_type: "uwazi_signup" });
        clearStoredOrgSlug();
      }
      navigate(to === "/app" ? promoReturnPath("/app") : to);
    } catch {
      toast.error("Something went wrong. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto w-full max-w-lg space-y-8">
        <div className="flex items-center justify-center gap-2" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={4} aria-label={`Step ${step + 1} of 4`}>
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${i === step ? "w-8 bg-primary" : i < step ? "w-2 bg-primary/50" : "w-2 bg-muted"}`}
            />
          ))}
        </div>

        {step === 0 && <Welcome reduce={!!reduce} onNext={() => setStep(1)} />}
        {step === 1 && <AddressScreen onDone={() => setStep(2)} onSkip={() => finish()} saving={saving} />}
        {step === 2 && <FoundYou onNext={() => setStep(3)} />}
        {step === 3 && (
          <CompassScreen
            reduce={!!reduce}
            saving={saving}
            onTake={() => finish("/app/compass")}
            onLater={() => finish()}
          />
        )}
      </div>
    </div>
  );
}

/* ── Screen 1 ── */
function Welcome({ reduce, onNext }: { reduce: boolean; onNext: () => void }) {
  return (
    <section className="space-y-6 text-center">
      <div className="relative mx-auto flex size-56 items-center justify-center">
        <div className={`absolute inset-0 ${reduce ? "" : "onb-orbit"}`} aria-hidden>
          {PERSONA_DOTS.map((c, i) => (
            <span
              key={c}
              className="onb-dot"
              style={{
                transform: `rotate(${i * 45}deg) translateY(-104px)`,
                background: `hsl(var(--persona-${c}))`,
                boxShadow: `0 0 12px hsl(var(--persona-${c}) / 0.8)`,
              }}
            />
          ))}
        </div>
        <img src={appIcon} alt="" className="size-24" />
      </div>
      <div className="space-y-3">
        <p className="eyebrow">Welcome to UWAZI</p>
        <h1 className="font-heading text-[34px] leading-tight text-foreground">Civics back in your hands</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Who represents you. Where your tax dollars go. What is on your ballot. Never told how to vote.
        </p>
      </div>
      <div className="space-y-3">
        <Button onClick={onNext} className="city-pulse h-12 w-full">Get started, about 3 minutes</Button>
        <a href="/fair" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
          How UWAZI stays fair <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </section>
  );
}

/* ── Screen 2 ── */
function AddressScreen({ onDone, onSkip, saving }: { onDone: () => void; onSkip: () => void; saving: boolean }) {
  const { user } = useAuth();
  const [zipOnly, setZipOnly] = useState(false);
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [zip, setZip] = useState("");
  const [busy, setBusy] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (/^\d{5}$/.test(zip)) setStateCode((s) => s || getStateFromZip(zip));
  }, [zip]);

  const zipOk = /^\d{5}$/.test(zip);
  const ready = zipOnly ? zipOk : street.trim().length >= 5 && city.trim().length >= 2 && !!stateCode && zipOk;

  const submit = async () => {
    if (!user || !ready) return;
    setBusy(true);
    try {
      const full = zipOnly ? `${zip}` : `${street.trim()}, ${city.trim()}, ${stateCode} ${zip}`;
      await db.from("profiles").update({
        address_line1: zipOnly ? null : street.trim(),
        city: zipOnly ? null : city.trim(),
        state_code: stateCode || null,
        zip_code: zip,
        full_address: zipOnly ? null : full,
        street_address: zipOnly ? null : street.trim(),
      }).eq("user_id", user.id);
      const { data } = await supabase.functions.invoke("resolve-address", { body: { address: full } });
      if (!zipOnly && data && data.address_matched === false) {
        setNotFound(true);
        setBusy(false);
        return;
      }
      onDone();
    } catch {
      toast.error("We could not check that address. You can add it later in settings.");
      onDone();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-5">
      <div className="space-y-2">
        <p className="eyebrow">Step 1 of 3</p>
        <h1 className="font-heading text-[30px] leading-tight text-foreground">Where do you live?</h1>
        <p className="text-sm text-muted-foreground">
          Your street address finds your exact council seat, your polling place, and your city's budget.
        </p>
      </div>

      {zipOnly ? (
        <div className="space-y-1.5">
          <Label htmlFor="zip-only">ZIP code</Label>
          <Input id="zip-only" inputMode="numeric" maxLength={5} value={zip}
            onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))} placeholder="64108" className="h-12" />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="street">Street address</Label>
            <Input id="street" value={street} maxLength={100} autoComplete="street-address"
              onChange={(e) => setStreet(e.target.value)} placeholder="2050 West Pennway St" className="h-12" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="city">City</Label>
              <Input id="city" value={city} maxLength={60} autoComplete="address-level2"
                onChange={(e) => setCity(e.target.value)} placeholder="Kansas City" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="zip">ZIP code</Label>
              <Input id="zip" inputMode="numeric" maxLength={5} value={zip} autoComplete="postal-code"
                onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))} placeholder="64108" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="state">State</Label>
            <Select value={stateCode} onValueChange={setStateCode}>
              <SelectTrigger id="state"><SelectValue placeholder="Pick your state" /></SelectTrigger>
              <SelectContent className="max-h-60">
                {US_STATES.map((s) => <SelectItem key={s.code} value={s.code}>{s.code}, {s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <div className="rounded-[20px] border border-primary/30 bg-primary/10 p-4">
        <p className="font-heading text-sm text-foreground">What we keep</p>
        <p className="mt-1 text-sm text-muted-foreground">
          We turn your address into district codes and keep only the codes. We do not keep the address itself for this.
        </p>
      </div>

      {notFound && !zipOnly && (
        <div className="rounded-[20px] border border-destructive/40 bg-destructive/10 p-4 space-y-3">
          <p className="text-sm text-foreground">
            We could not find that address. Check the spelling, or use your ZIP code instead.
          </p>
          <Button variant="outline" className="h-10 w-full"
            onClick={() => { setZipOnly(true); setNotFound(false); }}>
            Use my ZIP code
          </Button>
        </div>
      )}

      <button type="button" onClick={() => setZipOnly((v) => !v)} className="text-xs text-primary hover:underline">
        {zipOnly ? "Have a street address? Use that instead." : "Only have a ZIP code? Use that instead."}
      </button>

      <div className="space-y-3">
        <Button onClick={submit} disabled={!ready || busy} className="h-12 w-full">
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Find my districts
        </Button>
        <Button variant="outline" onClick={onSkip} disabled={saving || busy} className="h-12 w-full">Skip for now</Button>
      </div>
    </section>
  );
}

/* ── Screen 3 ── */
function FoundYou({ onNext }: { onNext: () => void }) {
  const { user } = useAuth();
  const [consent, setConsent] = useState({ personalization: false, research: false });

  const { data } = useQuery({
    queryKey: ["onboarding-found", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const [{ data: offices }, { data: districts }, { data: profile }] = await Promise.all([
        db.rpc("get_my_offices"),
        db.from("user_districts").select("resolved, precision").eq("user_id", user!.id).maybeSingle(),
        db.from("profiles").select("city, state_code, county_name").eq("user_id", user!.id).maybeSingle(),
      ]);
      const place = districts?.resolved?.place ?? null;
      let budget: number | null = null;
      if (place) {
        const { data: lines } = await db
          .from("civic_budget_percent_of_total").select("fiscal_year, total_amount, revenue_or_expense")
          .eq("geoid", place).eq("revenue_or_expense", "expense").order("fiscal_year", { ascending: false }).limit(1);
        if (lines?.length) budget = Number(lines[0].total_amount);
      }
      return { offices: offices ?? [], districts, profile, budget };
    },
  });

  const { data: election } = useNextElection(data?.profile?.state_code ?? null);

  useEffect(() => {
    db.rpc("get_my_journey").then(({ data: j }: any) =>
      setConsent({ personalization: !!j?.personalization, research: !!j?.research }));
  }, []);

  const toggle = async (key: "personalization" | "research", on: boolean) => {
    setConsent((c) => ({ ...c, [key]: on }));
    const { error } = await db.rpc("set_my_consent", key === "personalization" ? { _personalization: on } : { _research: on });
    if (error) {
      setConsent((c) => ({ ...c, [key]: !on }));
      toast.error("We could not save that. Try again.");
    }
  };

  const offices = (data?.offices ?? []) as any[];
  const zipOnly = data?.districts?.precision === "zip" || !data?.districts;
  const seat = offices.find((o) => o.match_level === "district" && /council|alder/i.test(o.office_title))
    ?? offices.find((o) => o.match_level === "district");
  const countyOffice = offices.find((o) => o.match_level === "county" && o.district_code);
  const countyName = data?.profile?.county_name ? `${data.profile.county_name} County` : null;
  const days = election?.election_date
    ? Math.round((new Date(`${election.election_date}T00:00:00`).getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000)
    : null;

  const soon = "Coming soon for your area";
  const tiles = [
    {
      tone: "city-tone-0", label: "Your council seat",
      value: zipOnly ? "Add your street address to see your exact seat." : seat ? seat.office_title : soon,
      note: zipOnly ? "" : seat?.current_holder ?? "",
    },
    {
      tone: "city-tone-2", label: "Your county",
      value: countyName ?? soon,
      note: countyOffice ? `District ${countyOffice.district_code}. ${countyOffice.current_holder ?? "Seat not listed"}` : "",
    },
    {
      tone: "city-tone-1", label: "Next election",
      value: days != null && days >= 0 ? `${days} days` : soon,
      note: formatElectionDate(election?.election_date, { weekday: "long", month: "long", day: "numeric" }) ?? "",
    },
    {
      tone: "city-tone-4", label: "City budget",
      value: data?.budget ? money(data.budget) : soon,
      note: data?.budget ? "What your city plans to spend this year." : "",
    },
  ];

  return (
    <section className="space-y-5">
      <div className="space-y-2">
        <p className="eyebrow">Step 2 of 3</p>
        <h1 className="font-heading text-[30px] leading-tight text-foreground">Found you</h1>
        <p className="text-sm text-muted-foreground">
          Here is what your address unlocks. Every fact links to an official source.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-[10px]">
        {tiles.map((t, i) => (
          <div key={t.label} style={{ "--tile-order": i, animationDelay: `${i * 80}ms` } as React.CSSProperties}
            className={`city-tile ${t.tone} relative min-w-0 rounded-[20px] border border-border bg-card p-4`}>
            <div className="city-tone-tint pointer-events-none absolute inset-0 rounded-[20px]" />
            <div className="relative z-10">
              <p className="city-tone-text text-[10px] font-bold uppercase tracking-widest">{t.label}</p>
              <p className="mt-2 font-heading text-base leading-snug text-foreground">{t.value}</p>
              {t.note && <p className="mt-1 text-xs text-muted-foreground">{t.note}</p>}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3 rounded-[20px] border border-border bg-card p-4">
        {[
          { key: "personalization" as const, label: "Personalize my UWAZI", desc: "We pick lessons and next steps for you. Off until you say yes." },
          { key: "research" as const, label: "Help civic research", desc: "Your answers join group totals with no name attached." },
        ].map((c) => (
          <div key={c.key} className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">{c.label}</p>
              <p className="text-xs text-muted-foreground">{c.desc}</p>
            </div>
            <Switch checked={consent[c.key]} onCheckedChange={(v) => toggle(c.key, v)} aria-label={c.label} />
          </div>
        ))}
      </div>

      <Button onClick={onNext} className="h-12 w-full">Keep going</Button>
    </section>
  );
}

/* ── Screen 4 ── */
function CompassScreen({ reduce, saving, onTake, onLater }: { reduce: boolean; saving: boolean; onTake: () => void; onLater: () => void }) {
  return (
    <section className="space-y-6 text-center">
      <p className="eyebrow">Step 3 of 3</p>
      <div className="flex justify-center">
        <div
          className={`relative overflow-hidden rounded-[18px] border border-primary/70 ${reduce ? "" : "pack-float"}`}
          style={{ width: 176, height: 256, background: "linear-gradient(160deg, hsl(var(--card)) 0%, hsl(var(--background)) 55%, hsl(var(--card)) 100%)", boxShadow: "0 30px 60px -20px hsl(var(--primary) / .35)" }}
          aria-hidden
        >
          <div className="absolute inset-x-0 top-0 h-9 border-b-2 border-dashed border-primary/60 bg-muted/60" />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pt-6">
            <div className="flex size-14 items-center justify-center rounded-full border-2 border-primary bg-background/60">
              <Compass className="h-7 w-7 text-primary" />
            </div>
            <p className="font-heading text-lg tracking-wide text-foreground">CIVIC COMPASS</p>
            <p className="eyebrow">Your persona inside</p>
          </div>
        </div>
      </div>
      <div className="space-y-3">
        <h1 className="font-heading text-[30px] leading-tight text-foreground">Find out who you are for your city</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          16 quick swipes. You get a civic persona, a card, your first badge, and 50 points. About 2 minutes.
        </p>
      </div>
      <div className="space-y-3">
        <Button onClick={onTake} disabled={saving} className="city-pulse h-12 w-full">Take the Civic Compass</Button>
        <Button variant="outline" onClick={onLater} disabled={saving} className="h-12 w-full">Maybe later</Button>
      </div>
    </section>
  );
}
