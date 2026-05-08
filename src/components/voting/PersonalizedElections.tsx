import { useState } from "react";
import { motion } from "framer-motion";
import {
  MapPin, Calendar, ExternalLink, CheckCircle, AlertCircle, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { US_STATES, getStateFromZip } from "@/utils/stateFromZip";
import { useVoterElections, useFetchVoterElections, type VoterElection, type VoterContest, type BallotMeasure } from "@/hooks/useVoterElections";
import { useProfile } from "@/contexts/ProfileContext";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

/* ─── Main component ─── */
export default function PersonalizedElections() {
  const { fullAddress } = useProfile();
  const { data, isLoading } = useVoterElections();
  const hasAddress = Boolean(fullAddress?.trim());

  if (isLoading) return <ElectionsSkeleton />;
  if (!hasAddress && !data) return <AddAddressPrompt />;
  if (!data?.elections?.length) return null;

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="space-y-4"
    >
      <p className="eyebrow text-muted-foreground">YOUR PERSONALIZED ELECTIONS</p>
      {data.elections.map((election) => (
        <ElectionCard key={election.id} election={election} />
      ))}
    </motion.div>
  );
}

/* ─── Election Card ─── */
function ElectionCard({ election }: { election: VoterElection }) {
  const [showAllContests, setShowAllContests] = useState(false);

  const formattedDate = (() => {
    try {
      return format(new Date(`${election.date}T00:00:00`), "MMMM d, yyyy");
    } catch {
      return election.date;
    }
  })();

  const deadlines = election.registrationDeadlines;
  const methods = election.votingMethods;
  const contests = election.contests ?? [];
  const measures = election.ballotMeasures ?? [];
  const visibleContests = showAllContests ? contests : contests.slice(0, 5);

  return (
    <motion.div
      variants={fadeUp}
      className="rounded-2xl border border-border bg-card p-5 md:p-6 space-y-5"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
        <div>
          <h3 className="font-heading text-lg text-foreground">{election.name}</h3>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" /> {formattedDate}
          </p>
        </div>
        <span
          className={cn(
            "text-xs font-semibold px-3 py-1 rounded-full w-fit",
            election.status === "active"
              ? "bg-primary/15 text-primary"
              : "bg-yellow-500/15 text-yellow-400"
          )}
        >
          {election.status === "active" ? "Info Available" : "Coming Soon"}
        </span>
      </div>

      {/* Registration Deadlines */}
      {deadlines && (deadlines.online || deadlines.byMail || deadlines.inPerson) && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Registration Deadlines
          </p>
          <div className="flex flex-wrap gap-2">
            <DeadlineChip label="📱 Online" date={deadlines.online} />
            <DeadlineChip label="📬 By Mail" date={deadlines.byMail} />
            <DeadlineChip label="🏛️ In Person" date={deadlines.inPerson} />
          </div>
        </div>
      )}

      {/* Voting Options */}
      {methods && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Voting Options
          </p>
          <div className="flex flex-wrap gap-2">
            {methods.byMail && (
              <span className="text-xs px-3 py-1.5 rounded-full border border-border bg-muted/30 text-foreground">
                ✉️ Vote by Mail Available
              </span>
            )}
            {methods.earlyVoting && (
              <span className="text-xs px-3 py-1.5 rounded-full border border-border bg-muted/30 text-foreground">
                🗓️ Early Voting: {methods.earlyVoting.start} – {methods.earlyVoting.end}
              </span>
            )}
            {methods.inPerson && (
              <span className="text-xs px-3 py-1.5 rounded-full border border-border bg-muted/30 text-foreground">
                📍 In-Person Voting
              </span>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-2">
        {election.pollingLocationUrl && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-border text-foreground"
            onClick={() => window.open(election.pollingLocationUrl, "_blank")}
          >
            📍 Find Polling Place <ExternalLink className="h-3 w-3" />
          </Button>
        )}
        {election.checkRegistrationUrl && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-border text-foreground"
            onClick={() => window.open(election.checkRegistrationUrl, "_blank")}
          >
            ✅ Check Registration <ExternalLink className="h-3 w-3" />
          </Button>
        )}
        {election.registrationUrl && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-primary/30 text-primary"
            onClick={() => window.open(election.registrationUrl, "_blank")}
          >
            Register → <ExternalLink className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Contests */}
      {contests.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            What's on your ballot
          </p>
          <div className="space-y-2">
            {visibleContests.map((contest, i) => (
              <ContestCard key={contest.id || i} contest={contest} />
            ))}
          </div>
          {contests.length > 5 && !showAllContests && (
            <button
              onClick={() => setShowAllContests(true)}
              className="text-xs text-primary hover:underline"
            >
              See all {contests.length} races →
            </button>
          )}
        </div>
      )}

      {/* Ballot Measures */}
      {measures.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Ballot measures
          </p>
          <div className="space-y-2">
            {measures.map((m, i) => (
              <MeasureCard key={m.id || i} measure={m} />
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

/* ─── Deadline Chip ─── */
function DeadlineChip({ label, date }: { label: string; date?: string | null }) {
  if (!date) return null;
  const isPassed = new Date(date) < new Date();
  const formatted = (() => {
    try {
      return format(new Date(`${date}T00:00:00`), "MMM d");
    } catch {
      return date;
    }
  })();

  return (
    <span
      className={cn(
        "text-xs px-3 py-1.5 rounded-full border border-border bg-card text-foreground",
        isPassed && "opacity-40 line-through"
      )}
    >
      {label}: {formatted}
    </span>
  );
}

/* ─── Contest Card ─── */
function ContestCard({ contest }: { contest: VoterContest }) {
  return (
    <div className="p-3 rounded-xl bg-[#1a1a1a] space-y-2">
      <p className="text-sm font-medium text-foreground">{contest.name}</p>
      {contest.candidates && contest.candidates.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {contest.candidates.map((c, i) => (
            <span
              key={i}
              className={cn(
                "text-xs px-2.5 py-1 rounded-full border",
                c.party?.toLowerCase() === "democrat" || c.party?.toLowerCase() === "democratic"
                  ? "border-blue-500/30 text-blue-300"
                  : c.party?.toLowerCase() === "republican"
                  ? "border-red-500/30 text-red-300"
                  : "border-border text-muted-foreground"
              )}
            >
              {c.name} · {c.party || "Other"}
              {c.incumbent && (
                <span className="ml-1 text-[10px] bg-muted/50 px-1 rounded">Incumbent</span>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Ballot Measure Card ─── */
function MeasureCard({ measure }: { measure: BallotMeasure }) {
  const [expanded, setExpanded] = useState(false);
  const summary = measure.summary || "";
  const truncated = summary.length > 120 ? summary.slice(0, 120) + "…" : summary;

  return (
    <div className="p-3 rounded-xl bg-[#1a1a1a] space-y-1">
      <p className="text-sm font-medium text-foreground">{measure.name}</p>
      {summary && (
        <p className="text-xs text-muted-foreground">
          {expanded ? summary : truncated}
          {summary.length > 120 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-primary ml-1 hover:underline"
            >
              {expanded ? "Show less" : "Read more →"}
            </button>
          )}
        </p>
      )}
    </div>
  );
}

/* ─── Skeleton ─── */
function ElectionsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-4 w-48" />
      {[1, 2].map((i) => (
        <div key={i} className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <div className="flex justify-between">
            <div className="space-y-2">
              <Skeleton className="h-5 w-56" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-7 w-28 rounded-full" />
            <Skeleton className="h-7 w-28 rounded-full" />
            <Skeleton className="h-7 w-28 rounded-full" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-36 rounded-md" />
            <Skeleton className="h-8 w-36 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Add Address Prompt ─── */
function AddAddressPrompt() {
  const [open, setOpen] = useState(false);
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [zip, setZip] = useState("");
  const fetchElections = useFetchVoterElections();

  const isZipValid = /^\d{5}$/.test(zip);
  const isValid = street.trim().length >= 3 && city.trim().length >= 2 && stateCode && isZipValid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    await fetchElections.mutateAsync({
      street: street.trim(),
      city: city.trim(),
      state: stateCode,
      zip: zip.trim(),
    });
    setOpen(false);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-card p-6 text-center space-y-3"
      >
        <MapPin className="h-8 w-8 text-primary mx-auto" />
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          Add your voting address to see your personalized elections, deadlines, and ballot.
        </p>
        <Button onClick={() => setOpen(true)} className="gap-1.5">
          Add Address →
        </Button>
      </motion.div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl text-foreground">
              Your Voting Address
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Street Address</label>
              <Input
                placeholder="123 Main St"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                className="rounded-xl bg-background border-border text-base"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_40%] gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">City</label>
                <Input
                  placeholder="Kansas City"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="rounded-xl bg-background border-border text-base"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">State</label>
                <Select value={stateCode} onValueChange={setStateCode}>
                  <SelectTrigger className="rounded-xl bg-background border-border text-base">
                    <SelectValue placeholder="State" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {US_STATES.map((s) => (
                      <SelectItem key={s.code} value={s.code}>
                        {s.code} — {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">ZIP Code</label>
              <Input
                placeholder="e.g. 64139"
                value={zip}
                onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
                inputMode="numeric"
                maxLength={5}
                className="rounded-xl bg-background border-border text-base md:w-[40%]"
              />
            </div>
            <Button
              type="submit"
              disabled={!isValid || fetchElections.isPending}
              className="w-full rounded-xl h-11 gap-2"
            >
              {fetchElections.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Looking up elections…
                </>
              ) : (
                "Find My Elections →"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
