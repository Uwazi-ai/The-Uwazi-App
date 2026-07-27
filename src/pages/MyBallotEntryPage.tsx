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
        <meta name="description" content="Walk through your August 4, 2026 ballot and print it for the polls." />
      </Helmet>

      <PracticeBanner />

      <header>
        <p className="text-xs tracking-widest uppercase text-muted-foreground">My Ballot</p>
        <h1 className="font-heading text-3xl md:text-4xl mt-1 text-foreground" style={{ letterSpacing: "-0.02em" }}>
          Build My Ballot
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          We'll walk you through every contest on your August 4 ballot, then help you print or save it to take with you.
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

      {addressOk && state === "MO" && (
        <PartyPicker
          heading="Which ballot will you request?"
          body="Missouri has an open primary. You'll tell the poll worker which party's ballot you want. You don't need to be registered with that party, and you can choose a different one next election."
          options={MO_PARTIES}
          saving={saving}
          onPick={handlePick}
          footer={
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setAmendmentsOpen((v) => !v)}
                className="text-sm text-primary hover:underline inline-flex items-center gap-1"
              >
                What if I only want to vote on the amendments?{" "}
                <ChevronDown className={`h-4 w-4 transition-transform ${amendmentsOpen ? "rotate-180" : ""}`} />
              </button>
              {amendmentsOpen && (
                <p className="text-sm text-muted-foreground mt-2">
                  The four constitutional amendments appear on every party ballot. If amendments are all you want to
                  vote on, request the party ballot you're most comfortable with — the amendments will be there.
                </p>
              )}
            </div>
          }
        />
      )}

      {addressOk && state === "KS" && (
        <PartyPicker
          heading="Are you registered with a party?"
          body="In Kansas, only voters registered with a party can vote in that party's primary. Unaffiliated voters can still vote on statewide constitutional amendments."
          options={KS_PARTIES}
          saving={saving}
          onPick={handlePick}
          unaffiliatedNote
        />
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
          on August 4.
        </div>
      )}

      {footer}
    </div>
  );
}
