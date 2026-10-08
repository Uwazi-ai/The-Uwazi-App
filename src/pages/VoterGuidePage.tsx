import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, ExternalLink, MapPin, Phone, Vote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useVoterProfile, useElectionAuthority, useMyDistricts, lookupPrecinct, ELECTION_LABEL } from "@/hooks/useMyBallot";
import clay from "@/data/clay-early-voting.json";

type Step = { date: string; label: string; note?: string };

const DATES: Record<string, Step[]> = {
  MO: [
    { date: "Sept 22", label: "Absentee voting opens", note: "By mail or in person at your election office." },
    { date: "Oct 7", label: "Last day to register" },
    { date: "Oct 20", label: "No excuse early voting starts", note: "In person only, through Nov 2." },
    { date: "Oct 21", label: "Last day to ask for a mail ballot", note: "Mail ballots must arrive by 7 PM on Election Day." },
    { date: "Nov 3", label: "Election Day", note: "Polls open 6 AM to 7 PM." },
  ],
  KS: [
    { date: "Oct 13", label: "Last day to register" },
    { date: "Oct 14", label: "Early voting can start", note: "Start dates and sites vary by county." },
    { date: "Oct 27", label: "Last day to ask for a mail ballot" },
    { date: "Nov 3", label: "Election Day", note: "Polls open 7 AM to 7 PM. Mail ballots must arrive by 7 PM." },
  ],
};

const HOW: Record<string, string[]> = {
  MO: [
    "Bring a photo ID like a Missouri driver license, a passport, or a military ID. No photo ID means a provisional ballot.",
    "Vote at your assigned polling place on Election Day. Early voting sites are run by your county election office.",
    "Not sure where you are registered? Look yourself up before you go.",
  ],
  KS: [
    "Bring a photo ID like a Kansas driver license, a passport, or a student ID from a Kansas school.",
    "Vote at your assigned polling place on Election Day, or vote early at a county site.",
    "Not sure where you are registered? Look yourself up before you go.",
  ],
};

const card = "rounded-2xl border border-border bg-card p-5 md:p-6";

export default function VoterGuidePage() {
  const [params] = useSearchParams();
  const contestId = params.get("contest");
  const { data: profile } = useVoterProfile();
  const { data: authority } = useElectionAuthority(profile);
  const { data: districts } = useMyDistricts();
  const state = (profile?.state_code as string) || "MO";
  const place = lookupPrecinct(profile?.precinct_id);
  const early = districts?.resolved?.county === clay.county ? clay.sites : [];

  const { data: contest } = useQuery({
    queryKey: ["guide-contest", contestId],
    queryFn: async () => {
      const { data } = await supabase.from("ballot_contests").select("id, measure_title, source_name, source_url").eq("id", contestId!).maybeSingle();
      return data;
    },
    enabled: !!contestId,
  });

  const lookup = authority?.lookup_url || (state === "KS" ? "https://myvoteinfo.voteks.org/voterview/" : "https://s1.sos.mo.gov/elections/voterlookup/");

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 pb-24 md:pb-10 space-y-5 overflow-x-hidden">
      <Helmet><title>Voter guide | UWAZI</title></Helmet>

      <Link to="/app/my-ballot" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> My Ballot
      </Link>

      <header>
        <p className="text-xs tracking-widest uppercase text-muted-foreground">Voter guide</p>
        <h1 className="font-heading text-3xl md:text-4xl mt-1 text-foreground">How to vote on November 3</h1>
        <p className="text-sm text-muted-foreground mt-2">{ELECTION_LABEL}. Dates are from state law. Your election office has the final word.</p>
      </header>

      {contest && (
        <div className={card}>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">On your ballot</p>
          <h2 className="font-heading text-lg text-foreground mt-1">{contest.measure_title}</h2>
          {contest.source_url && (
            <a href={contest.source_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline">
              Official source{contest.source_name ? `: ${contest.source_name}` : ""} <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      )}

      <section className={card}>
        <h2 className="font-heading text-lg text-foreground flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary" /> Key dates</h2>
        <ol className="mt-4 space-y-3">
          {(DATES[state] || DATES.MO).map((d) => (
            <li key={d.label} className="flex gap-4">
              <span className="font-heading text-primary w-16 shrink-0">{d.date}</span>
              <span>
                <span className="block text-sm font-medium text-foreground">{d.label}</span>
                {d.note && <span className="block text-xs text-muted-foreground">{d.note}</span>}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className={card}>
        <h2 className="font-heading text-lg text-foreground flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" /> Where to vote</h2>
        {place ? (
          <p className="text-sm text-foreground mt-3"><strong>{place.placeName}</strong><br />{place.address}{place.room ? `. ${place.room}` : ""}</p>
        ) : (
          <p className="text-sm text-muted-foreground mt-3">Your polling place is listed in your voter record.</p>
        )}
        {early.length > 0 && (
          <div className="mt-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Early voting in Clay County</p>
            <ul className="mt-2 space-y-2">
              {early.map((s) => (
                <li key={s.name + s.address} className="text-sm">
                  <span className="text-foreground">{s.name.split(" - ")[0]}</span>
                  <span className="block text-xs text-muted-foreground">{s.address}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <a href={lookup} target="_blank" rel="noreferrer"><Button variant="outline" className="mt-4">Look up my voter record <ExternalLink className="h-4 w-4 ml-1" /></Button></a>
      </section>

      <section className={card}>
        <h2 className="font-heading text-lg text-foreground flex items-center gap-2"><Vote className="h-5 w-5 text-primary" /> How to vote</h2>
        <ul className="mt-3 space-y-2 list-disc pl-5 text-sm text-foreground/90">
          {(HOW[state] || HOW.MO).map((h) => <li key={h}>{h}</li>)}
        </ul>
      </section>

      {authority && (
        <section className={card}>
          <h2 className="font-heading text-lg text-foreground">{authority.display_name}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {authority.phone && <a href={`tel:${authority.phone}`}><Button variant="outline"><Phone className="h-4 w-4 mr-1" /> {authority.phone}</Button></a>}
            {authority.website && <a href={authority.website} target="_blank" rel="noreferrer"><Button variant="outline">Website <ExternalLink className="h-4 w-4 ml-1" /></Button></a>}
          </div>
        </section>
      )}

      <Link to="/app/my-ballot" className="block"><Button className="w-full">Back to my ballot</Button></Link>
    </div>
  );
}
