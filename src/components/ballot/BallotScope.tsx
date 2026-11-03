import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { COUNTY_OPTIONS_BY_STATE, isOfficialSource, scopeLabel, type CountySource, type ScopedContest, type VoterCounty } from "@/lib/ballotScope";
import { useSaveBallotCounty } from "@/hooks/useMyBallot";

/** "Your county" picker for Missouri voters without a KCEB precinct. Saves to their profile. */
export function CountyPicker({ state, county, source }: { state: string | null; county: VoterCounty | null; source: CountySource }) {
  const save = useSaveBallotCounty();
  const options = state ? COUNTY_OPTIONS_BY_STATE[state] : undefined;
  if (!options || source === "precinct") return null;
  const pick = async (k: VoterCounty) => {
    try { await save.mutateAsync(k); } catch { toast.error("Could not save your county. Try again."); }
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-4 md:p-5">
      <p className="text-sm font-medium text-foreground">Your county</p>
      <p className="text-xs text-muted-foreground mt-1">
        {county ? (source === "zip" ? "We used your ZIP code. Change it if this is wrong." : "Change it if you moved.") : "Pick your county to see your local races."}
      </p>
      <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Your county">
        {options.map((o) => (
          <button
            key={o.key}
            role="radio"
            aria-checked={county === o.key}
            disabled={save.isPending}
            onClick={() => pick(o.key)}
            className={cn("rounded-full border px-3 py-1.5 text-sm transition-colors", county === o.key ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground")}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** One line when district races exist but we do not know this voter's district. */
export function DistrictUnknownLine({ count, link }: { count: number; link: string | null }) {
  if (count <= 0) return null;
  return (
    <p className="text-sm text-muted-foreground rounded-xl border border-border p-3" data-testid="district-unknown">
      Your district races are on your official sample ballot{link ? <>, <a href={link} target="_blank" rel="noreferrer" className="text-primary underline">open it here</a></> : null}.
    </p>
  );
}

/** Scope tag, for example "Statewide" or "U.S. House District 5". */
export function ScopeTag({ contest }: { contest: ScopedContest }) {
  const label = scopeLabel(contest);
  if (!label) return null;
  return <span className="inline-block rounded-full border border-border px-2 py-0.5 text-[11px] tracking-wide text-muted-foreground" data-testid="scope-tag">{label}</span>;
}

/** Shown when a contest came from a news or secondary site, not an election authority. */
export function SourceNote({ contest }: { contest: { source_name?: string | null; source_url?: string | null } }) {
  if (isOfficialSource(contest.source_url)) return null;
  return (
    <span className="block mt-2 text-xs rounded-lg border border-border bg-muted/40 p-2 text-muted-foreground" data-testid="source-note">
      Source: {contest.source_name || "a secondary site"}. Not from the official ballot. Check your official sample ballot.
    </span>
  );
}
