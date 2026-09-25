import { useEffect, useState } from "react";
import { MapPin, Loader2, Pencil, ExternalLink, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useVoterProfile, useSavePrecinct, lookupPrecinct } from "@/hooks/useMyBallot";

/**
 * Shows the voter's Nov 3 polling place + ballot districts from their saved
 * ward/precinct, and lets them set it. Used in Settings and the Voting Hub.
 */
export default function PollingPlaceCard({ compact = false }: { compact?: boolean }) {
  const { data: profile } = useVoterProfile();
  const save = useSavePrecinct();
  const saved = (profile as any)?.precinct_id as string | null | undefined;
  const info = lookupPrecinct(saved);
  const [editing, setEditing] = useState(false);
  const [ward, setWard] = useState("");
  const [pct, setPct] = useState("");

  useEffect(() => {
    if (info) { setWard(String(info.ward)); setPct(String(info.precinct)); }
  }, [saved]); // eslint-disable-line react-hooks/exhaustive-deps

  const state = profile?.state_code;
  const inKc = state === "MO" && (profile?.election_authority_key === "mo-kcmo-eb" || !!saved);
  if (!profile || state !== "MO") return null;

  const preview = ward && pct ? lookupPrecinct(`${ward}-${pct}`) : null;
  const showForm = editing || !info;

  const handleSave = async () => {
    if (!preview) return;
    try {
      await save.mutateAsync(`${preview.ward}-${preview.precinct}`);
      toast.success("Polling place saved — Ask UWAZI and My Ballot now use it");
      setEditing(false);
    } catch {
      toast.error("Couldn't save your precinct");
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border p-5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs tracking-widest uppercase text-primary flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5" /> Your polling place · Nov 3
        </p>
        {info && !editing && (
          <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => setEditing(true)}>
            <Pencil className="h-3.5 w-3.5" /> Change
          </Button>
        )}
      </div>

      {info && !editing && (
        <div className="space-y-2">
          <h3 className="font-heading text-lg text-foreground">{info.placeName}</h3>
          <p className="text-sm text-muted-foreground">
            {info.address}{info.room ? ` · ${info.room}` : ""}
          </p>
          <p className="text-xs text-muted-foreground">
            Ward {info.ward}, Precinct {info.precinct} · State House District {info.rep} · County Legislature District {info.leg}
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(info.address + ", Kansas City, MO")}`}
              target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Directions
            </a>
            {!compact && (
              <>
                <Link to="/app/my-ballot" className="text-xs font-semibold text-primary hover:underline">See who's on my ballot</Link>
                <Link
                  to={`/app/ask?q=${encodeURIComponent("Who is on my November 3 ballot?")}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  <Sparkles className="h-3.5 w-3.5" /> Ask UWAZI about my ballot
                </Link>
              </>
            )}
          </div>
        </div>
      )}

      {showForm && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            {inKc
              ? "Enter your ward and precinct (printed on your voter card) to see your exact polling place and the races on your ballot. Ask UWAZI will use it too."
              : "Kansas City (Jackson County) voters: enter your ward and precinct to see your polling place and ballot."}
          </p>
          <div className="flex gap-2">
            <Input inputMode="numeric" placeholder="Ward" value={ward}
              onChange={(e) => setWard(e.target.value.replace(/\D/g, "").slice(0, 2))} className="rounded-xl" />
            <Input inputMode="numeric" placeholder="Precinct" value={pct}
              onChange={(e) => setPct(e.target.value.replace(/\D/g, "").slice(0, 3))} className="rounded-xl" />
          </div>
          {ward && pct && (
            <p className={`text-xs ${preview ? "text-foreground" : "text-destructive"}`}>
              {preview
                ? `📍 ${preview.placeName} — ${preview.address}`
                : "We couldn't find that ward/precinct in the Kansas City list."}
            </p>
          )}
          <div className="flex items-center gap-3 flex-wrap">
            <Button size="sm" onClick={handleSave} disabled={!preview || save.isPending}>
              {save.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />} Save polling place
            </Button>
            {editing && (
              <button className="text-xs text-muted-foreground" onClick={() => setEditing(false)}>Cancel</button>
            )}
            <a href="https://voteroutreach.sos.mo.gov/portal/" target="_blank" rel="noreferrer"
              className="text-xs text-primary hover:underline">Don't know it? Look it up</a>
          </div>
        </div>
      )}
    </div>
  );
}
