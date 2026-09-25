import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowRight, MapPin, ChevronRight, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PracticeBanner } from "@/components/ballot/PracticeBanner";
import {
  useVoterProfile,
  useSaveParty,
  useSavePrecinct,
  lookupPrecinct,
  isAddressComplete,
  SUPPORTED_STATES,
  PartyKey,
} from "@/hooks/useMyBallot";

const MO_PARTIES: { key: PartyKey; label: string }[] = [
  { key: "democratic", label: "Democratic" },
  { key: "republican", label: "Republican" },
  { key: "libertarian", label: "Libertarian" },
  { key: "green", label: "Green" },
  { key: "constitution", label: "Constitution" },
];

const KS_PARTIES: { key: PartyKey; label: string }[] = [
  { key: "republican", label: "Republican" },
  { key: "democratic", label: "Democratic" },
  { key: "unaffiliated", label: "Unaffiliated" },
  { key: "not_sure", label: "Not sure" },
];

export default function MyBallotEntryPage() {
  const navigate = useNavigate();
  const { data: profile, isLoading } = useVoterProfile();
  const saveParty = useSaveParty();
  const [amendmentsOpen, setAmendmentsOpen] = useState(false);
  const [saving, setSaving] = useState<PartyKey | null>(null);

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="animate-pulse rounded-2xl h-40 bg-white/5" />
      </div>
    );
  }

  const addressOk = isAddressComplete(profile);
  const state = profile?.state_code || null;

  const handlePick = async (party: PartyKey) => {
    setSaving(party);
    try {
      await saveParty.mutateAsync(party);
      navigate("/app/my-ballot/walkthrough");
    } catch (e) {
      toast.error("Couldn't save that. Try again.");
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 pb-24 md:pb-10 space-y-5">
      <Helmet>
        <title>Build My Ballot — UWAZI</title>
        <meta name="description" content="Walk through your November 3, 2026 ballot and print it for the polls." />
      </Helmet>

      <PracticeBanner />

      <header>
        <p className="text-xs tracking-widest uppercase text-muted-foreground">My Ballot</p>
        <h1 className="font-heading text-3xl md:text-4xl mt-1 text-foreground" style={{ letterSpacing: "-0.02em" }}>
          Build My Ballot
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          We'll walk you through every contest on your November 3 ballot, then help you print or save it to take with you.
        </p>
      </header>

      {!addressOk && (
        <div
          className="rounded-2xl p-6"
          style={{ background: "var(--card-bg, rgba(255,255,255,0.03))", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-primary mt-1" />
            <div>
              <h2 className="font-heading text-lg text-foreground">We need your full address first</h2>
              <p className="text-sm text-muted-foreground mt-2">
                ZIP codes split across voting districts, so a full address is the only way to build an accurate ballot.
                Your address is private and never shared.
              </p>
              <Link to="/app/settings">
                <Button className="mt-4 bg-primary text-primary-foreground">Complete my profile</Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {addressOk && !SUPPORTED_STATES.includes(state || "") && (
        <div
          className="rounded-2xl p-6"
          style={{ background: "var(--card-bg, rgba(255,255,255,0.03))", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <h2 className="font-heading text-lg text-foreground">Ballot data isn't available for your state yet</h2>
          <p className="text-sm text-muted-foreground mt-2">
            We're starting with Missouri and Kansas. More states are coming.
          </p>
        </div>
      )}

      {addressOk && state === "MO" && <PrecinctStep profile={profile} onDone={() => navigate("/app/my-ballot/walkthrough")} />}

      {addressOk && state === "KS" && (
        <div className="rounded-2xl p-6 border border-border bg-card">
          <h2 className="font-heading text-xl text-foreground">One ballot for everyone</h2>
          <p className="text-sm text-muted-foreground mt-2">
            November 3 is a general election — every voter gets the same ballot for their area, no matter their party.
          </p>
          <Button className="mt-4" onClick={() => navigate("/app/my-ballot/walkthrough")}>
            Start my ballot <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}

function PartyPicker({
  heading,
  body,
  options,
  saving,
  onPick,
  footer,
  unaffiliatedNote,
}: {
  heading: string;
  body: string;
  options: { key: PartyKey; label: string }[];
  saving: PartyKey | null;
  onPick: (p: PartyKey) => void;
  footer?: React.ReactNode;
  unaffiliatedNote?: boolean;
}) {
  return (
    <div
      className="rounded-2xl p-6"
      style={{ background: "var(--card-bg, rgba(255,255,255,0.03))", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      <h2 className="font-heading text-xl md:text-2xl text-foreground">{heading}</h2>
      <p className="text-sm text-muted-foreground mt-2">{body}</p>

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.map((o) => (
          <button
            key={o.key}
            disabled={saving !== null}
            onClick={() => onPick(o.key)}
            className="group text-left rounded-xl p-4 border border-white/10 hover:border-primary/60 transition-colors bg-white/[0.02] disabled:opacity-60"
          >
            <div className="flex items-center justify-between">
              <span className="font-heading text-lg text-foreground">{o.label}</span>
              {saving === o.key ? (
                <span className="text-xs text-muted-foreground">Saving…</span>
              ) : (
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
              )}
            </div>
          </button>
        ))}
      </div>

      {unaffiliatedNote && (
        <div
          className="mt-4 rounded-xl p-3 text-sm text-foreground"
          style={{ background: "rgba(155,211,75,0.08)", border: "1px solid rgba(155,211,75,0.28)" }}
        >
          If you pick Unaffiliated, your ballot will have the statewide constitutional amendment. You can still vote
          on November 3.
        </div>
      )}

      {footer}
    </div>
  );
}

function PrecinctStep({ profile, onDone }: { profile: any; onDone: () => void }) {
  const savePrecinct = useSavePrecinct();
  const existing = (profile?.precinct_id || "").match(/\d+/g) || [];
  const [ward, setWard] = useState(existing[0] || "");
  const [pct, setPct] = useState(existing[1] || "");
  const raw = ward && pct ? `${ward}-${pct}` : "";
  const info = raw ? lookupPrecinct(raw) : null;

  const save = async () => {
    try {
      await savePrecinct.mutateAsync(raw || null);
      onDone();
    } catch {
      toast.error("Couldn't save that. Try again.");
    }
  };

  return (
    <div className="rounded-2xl p-6 border border-border bg-card space-y-4">
      <div>
        <h2 className="font-heading text-xl md:text-2xl text-foreground">What's your ward and precinct?</h2>
        <p className="text-sm text-muted-foreground mt-2">
          November 3 is a general election — everyone gets one ballot, no party choice. Your ward and precinct decide
          your State Representative and County Legislator races and where you vote. They're printed on your voter ID
          card, or look them up at{" "}
          <a href="https://www.kceb.org" target="_blank" rel="noreferrer" className="text-primary underline">kceb.org</a>.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm text-muted-foreground">
          Ward
          <input inputMode="numeric" value={ward} onChange={(e) => setWard(e.target.value.replace(/\D/g, "").slice(0, 2))}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground" placeholder="e.g. 6" />
        </label>
        <label className="text-sm text-muted-foreground">
          Precinct
          <input inputMode="numeric" value={pct} onChange={(e) => setPct(e.target.value.replace(/\D/g, "").slice(0, 3))}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground" placeholder="e.g. 14" />
        </label>
      </div>
      {raw && info && (
        <div className="rounded-xl p-3 text-sm border border-primary/30 bg-primary/10 text-foreground">
          <p><strong>You vote at {info.placeName}</strong>, {info.address}{info.room ? ` — ${info.room}` : ""}.</p>
          <p className="text-muted-foreground mt-1">State House District {info.rep} · County Legislature District {info.leg}. Confirm at kceb.org or (816) 842-4820.</p>
        </div>
      )}
      {raw && !info && (
        <p className="text-sm text-muted-foreground">
          We couldn't find Ward {ward}, Precinct {pct} in the Kansas City Election Board list. It may be outside Kansas
          City's Jackson County area. Double-check your voter card, or continue to see the races everyone votes on.
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button onClick={save} disabled={savePrecinct.isPending || (!!raw && !info)}>
          {savePrecinct.isPending ? "Saving…" : "Start my ballot"} <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
        {!raw && (
          <Button variant="ghost" onClick={onDone}>I don't know it yet</Button>
        )}
      </div>
    </div>
  );
}
