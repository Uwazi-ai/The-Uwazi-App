import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Camera, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  useVoterProfile,
  useBallotContestsForState,
  useBallotCandidates,
  useMyBallotSelections,
  useElectionAuthority,
  filterContestsForParty,
  saveExportCache,
  readExportCache,
  ELECTION_LABEL,
  PARTY_LABEL,
  PartyKey,
} from "@/hooks/useMyBallot";
import { Capacitor } from "@capacitor/core";

interface ExportPayload {
  city: string | null;
  county: string | null;
  state: string | null;
  party: PartyKey | null;
  rows: { title: string; kind: string; choice: string; undecided: boolean }[];
  authority: {
    display_name: string | null;
    phone: string | null;
    poll_hours: string | null;
  } | null;
  isKCMO: boolean;
  generatedAt: string;
}

export default function MyBallotExportPage() {
  const [params] = useSearchParams();
  const wantSave = params.get("action") === "save";
  const { data: profile } = useVoterProfile();
  const state = profile?.state_code || null;
  const party = (profile?.party_preference as PartyKey) || null;
  const { data: allContests = [] } = useBallotContestsForState(state);
  const contests = useMemo(() => filterContestsForParty(allContests, party), [allContests, party]);
  const contestIds = useMemo(() => contests.map((c) => c.id), [contests]);
  const { data: candidates = [] } = useBallotCandidates(contestIds);
  const { data: selections = [] } = useMyBallotSelections();
  const { data: authority } = useElectionAuthority(profile);

  const [cached, setCached] = useState<{ savedAt: string; payload: ExportPayload } | null>(null);
  const [offline, setOffline] = useState(false);

  const paperRef = useRef<HTMLDivElement>(null);

  const isKCMO = ((profile?.city || "").toLowerCase().includes("kansas city")) && state === "MO";

  const payload: ExportPayload | null = useMemo(() => {
    if (!profile || !state || !party || contests.length === 0) return null;
    const rows = contests.map((c) => {
      const sel = selections.find((s) => s.contest_id === c.id);
      let choice = "Still deciding";
      let undecided = true;
      if (c.contest_type === "candidate_race") {
        if (sel?.candidate_id) {
          const cand = candidates.find((cc) => cc.id === sel.candidate_id);
          choice = cand ? `${cand.name}${cand.party ? ` (${cand.party})` : ""}` : "Selected";
          undecided = false;
        }
      } else if (sel?.measure_vote === "yes") { choice = "Yes"; undecided = false; }
      else if (sel?.measure_vote === "no") { choice = "No"; undecided = false; }
      return {
        title: c.measure_title,
        kind: c.contest_type === "ballot_measure" ? "Measure" : "Race",
        choice,
        undecided,
      };
    });
    return {
      city: profile.city || null,
      county: profile.county_name || null,
      state,
      party,
      rows,
      authority: authority
        ? {
            display_name: authority.display_name || null,
            phone: authority.phone || null,
            poll_hours: authority.poll_hours || null,
          }
        : null,
      isKCMO,
      generatedAt: new Date().toISOString(),
    };
  }, [profile, state, party, contests, candidates, selections, authority, isKCMO]);

  // Cache on load; hydrate from cache when offline
  useEffect(() => {
    if (payload) saveExportCache(payload);
  }, [payload]);

  useEffect(() => {
    if (!payload && !navigator.onLine) {
      const c = readExportCache();
      if (c) {
        setCached(c);
        setOffline(true);
      }
    }
  }, [payload]);

  const active: ExportPayload | null = payload || cached?.payload || null;

  const handlePrint = () => {
    window.print();
  };

  const handleSaveImage = async () => {
    if (!paperRef.current) return;
    try {
      const html2canvasMod = await import("html2canvas-pro");
      const html2canvas = html2canvasMod.default;
      const canvas = await html2canvas(paperRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
      });
      const dataUrl = canvas.toDataURL("image/png");
      if (Capacitor.isNativePlatform()) {
        const { Filesystem, Directory } = await import("@capacitor/filesystem");
        const base64 = dataUrl.split(",")[1];
        const filename = `uwazi-ballot-${Date.now()}.png`;
        await Filesystem.writeFile({
          path: filename,
          data: base64,
          directory: Directory.Documents,
        });
        toast.success("Saved to your device");
      } else {
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `uwazi-ballot-${Date.now()}.png`;
        a.click();
        toast.success("Image saved to your downloads");
      }
    } catch (e) {
      console.error(e);
      toast.error("Couldn't save the image");
    }
  };

  useEffect(() => {
    if (wantSave && active) {
      const t = setTimeout(() => handleSaveImage(), 400);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantSave, active]);

  if (!active) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="animate-pulse rounded-2xl h-40 bg-white/5" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 pb-24 md:pb-10">
      <Helmet><title>My Ballot Notes — UWAZI</title></Helmet>

      {/* Screen-only controls */}
      <div className="print:hidden mb-4 flex items-center justify-between gap-2 flex-wrap">
        <Link to="/app/my-ballot/review" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to review
        </Link>
        <div className="flex gap-2">
          <Button onClick={handlePrint} className="bg-primary text-primary-foreground gap-2">
            <Printer className="h-4 w-4" /> Print
          </Button>
          <Button onClick={handleSaveImage} variant="outline" className="gap-2">
            <Camera className="h-4 w-4" /> Save image
          </Button>
        </div>
      </div>

      {offline && (
        <p className="print:hidden text-xs text-muted-foreground mb-3">
          Showing your saved ballot from {new Date(cached!.savedAt).toLocaleString()}.
        </p>
      )}

      {/* Paper */}
      <div ref={paperRef} className="ballot-paper">
        <header className="pb-4 border-b border-black/20">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="ballot-title">MY BALLOT NOTES</h1>
              <div className="ballot-sub">
                {active.city ? `${active.city}, ` : ""}{active.state} ·{" "}
                {active.county ? `${active.county} · ` : ""}
                {active.party ? `${PARTY_LABEL[active.party]} ballot` : ""} · {ELECTION_LABEL}
              </div>
            </div>
            <div className="ballot-brand">UWAZI</div>
          </div>
          <div className="ballot-banner">
            PRACTICE BALLOT — NOT AN OFFICIAL BALLOT. These are your personal notes.
          </div>
        </header>

        <div className="py-2">
          {active.rows.map((r, i) => (
            <div key={i} className="ballot-row">
              <div className="ballot-row-kind">{r.kind}</div>
              <div className="ballot-row-title">{r.title}</div>
              <div className={"ballot-row-choice " + (r.undecided ? "undecided" : "")}>
                {r.undecided ? "◻ Still deciding" : `▣ ${r.choice}`}
              </div>
            </div>
          ))}
        </div>

        <footer className="pt-3 border-t border-black/20 space-y-1">
          {active.authority?.display_name && (
            <div className="ballot-footer-line">
              <strong>{active.authority.display_name}</strong>
              {active.authority.phone ? ` · ${active.authority.phone}` : ""}
            </div>
          )}
          {active.authority?.poll_hours && (
            <div className="ballot-footer-line">Poll hours: {active.authority.poll_hours}</div>
          )}
          {active.state === "MO" && (
            <div className="ballot-footer-line">Bring a valid photo ID.</div>
          )}
          {active.isKCMO && (
            <div className="ballot-footer-line">
              In Kansas City you may vote at any polling location if you use an electronic machine.
            </div>
          )}
          <div className="ballot-footer-line ballot-footer-note">
            These are personal notes. Please don't hand them out or show them to other voters inside the polling place.
          </div>
          <div className="ballot-footer-line ballot-footer-note">
            Generated {new Date(active.generatedAt).toLocaleDateString()} — UWAZI.
          </div>
        </footer>
      </div>

      <style>{`
        .ballot-paper {
          background: #ffffff;
          color: #000000;
          padding: 0.5in;
          border-radius: 12px;
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 11pt;
          line-height: 1.35;
          box-shadow: 0 1px 3px rgba(0,0,0,0.15);
        }
        .ballot-title {
          font-family: Arial, Helvetica, sans-serif;
          font-weight: 900;
          letter-spacing: 0.08em;
          font-size: 18pt;
          margin: 0;
        }
        .ballot-brand {
          font-family: Arial, Helvetica, sans-serif;
          font-weight: 800;
          letter-spacing: 0.28em;
          font-size: 9pt;
          border: 1.5px solid #000;
          padding: 3px 8px;
        }
        .ballot-sub { font-size: 10pt; margin-top: 4px; }
        .ballot-banner {
          margin-top: 10px;
          border: 1.5px solid #000;
          padding: 6px 10px;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 9pt;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          text-align: center;
        }
        .ballot-row {
          padding: 8px 0;
          border-bottom: 1px dotted #666;
          page-break-inside: avoid;
        }
        .ballot-row-kind {
          font-family: Arial, Helvetica, sans-serif;
          font-size: 7pt;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #555;
        }
        .ballot-row-title { font-weight: 700; font-size: 11pt; margin-top: 2px; }
        .ballot-row-choice { font-size: 11pt; margin-top: 2px; }
        .ballot-row-choice.undecided { font-style: italic; }
        .ballot-footer-line {
          font-family: Arial, Helvetica, sans-serif;
          font-size: 9pt;
        }
        .ballot-footer-note { color: #555; font-style: italic; }

        @media print {
          @page { size: letter; margin: 0.5in; }
          html, body { background: #ffffff !important; color: #000000 !important; }
          body * { visibility: hidden !important; }
          .ballot-paper, .ballot-paper * { visibility: visible !important; }
          .ballot-paper {
            position: absolute; left: 0; top: 0; width: 100%;
            box-shadow: none; padding: 0; border-radius: 0;
          }
        }
      `}</style>
    </div>
  );
}
