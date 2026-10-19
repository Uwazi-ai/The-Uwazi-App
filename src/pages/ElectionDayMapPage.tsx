import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { ArrowLeft, MapPin, Navigation, Phone, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RidesShell } from "@/components/rides/RidesUI";
import logo from "@/assets/uwazi-ride-wordmark.png";
import ElectionPrecinctMap from "@/components/voting/ElectionPrecinctMap";
import { filterPollingSites, pollingPlaceCount, selectPollingSite, type PollSite } from "@/lib/electionDayMap";

export default function ElectionDayMapPage() {
  const [params, setParams] = useSearchParams();
  const selected = params.get("precinct");
  const [search, setSearch] = useState("");
  const [ward, setWard] = useState("");
  const [address, setAddress] = useState("");
  const [zip, setZip] = useState("");
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { data: sites = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["election-day-map"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("election-day-map", { body: {} });
      if (error || !data?.sites) throw new Error("Polling list unavailable");
      return data.sites as PollSite[];
    }, staleTime: 300000,
  });
  const choose = (key: string) => { setParams({ precinct: key }, { replace: true }); setMessage(null); };
  const place = selectPollingSite(sites, selected);
  const list = filterPollingSites(sites, search, ward);
  const find = async () => {
    setChecking(true); setMessage(null);
    // Existing server-side KCEB area and precinct check. No booking or profile write.
    const { data, error } = await supabase.functions.invoke("get-ride-availability", { body: { address: address.trim(), zip } });
    setChecking(false);
    if (error) {
      const detail = error instanceof FunctionsHttpError ? await error.context.json().catch(() => null) : null;
      setMessage(detail?.error ?? "We could not check that address. Confirm your polling place at kceb.org.");
      return;
    }
    if (data?.precinct_key) {
      choose(data.precinct_key);
      setAddress(""); setZip("");
    } else {
      setParams({}, { replace: true });
      setMessage("No precinct match. Confirm your polling place with the Election Board. We will not guess.");
    }
  };

  return <RidesShell logo={logo} context={<span className="rider-eyebrow">NOV 3, 2026</span>}>
    <Helmet><title>Election Day polling map | UWAZI</title><meta name="description" content="Plan your November 3 trip with official Kansas City Election Board precincts and reviewed polling places." /></Helmet>
    <div className="space-y-6">
      <Button asChild variant="ghost"><Link to="/rides"><ArrowLeft className="mr-2 size-4" /> Free rides</Link></Button>
      <header className="space-y-2"><p className="rider-eyebrow">Kansas City Election Board</p><h1 className="font-heading text-3xl md:text-4xl">ELECTION DAY RIDE MAP</h1><p className="rider-muted">Tuesday, November 3. Polls open 6 AM to 7 PM.</p><p className="text-sm">For voters who live in Kansas City, in Jackson County.</p></header>
      <form onSubmit={e => { e.preventDefault(); void find(); }} className="grid gap-3 sm:grid-cols-[1fr_120px_auto]">
        <label className="text-sm">Pickup street address<Input className="mt-2 h-12" autoComplete="street-address" value={address} onChange={e => setAddress(e.target.value)} placeholder="Street address" /></label>
        <label className="text-sm">ZIP code<Input className="mt-2 h-12" inputMode="numeric" autoComplete="postal-code" value={zip} onChange={e => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))} placeholder="64106" /></label>
        <Button type="submit" className="h-12 self-end" disabled={checking || address.trim().length < 5 || !/^\d{5}$/.test(zip)}><Search className="mr-2 size-4" />{checking ? "Checking address" : "Find my polling place"}</Button>
      </form>
      <p className="rider-muted text-xs">This lookup does not book a ride or save your address. The street map sees only the precinct area.</p>
      {message && <p role="status" className="text-sm">{message}</p>}
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-3"><ElectionPrecinctMap selected={selected} onSelect={choose} /><p className="rider-muted text-xs">Boundaries: official KCEB precinct map. Shaded areas are precincts, not car routes or polling-place pins.</p></div>
        <aside className="space-y-5" aria-live="polite">
          <section className="border-b border-border pb-5 space-y-3"><p className="rider-eyebrow">{selected ? `PRECINCT ${selected}` : "YOUR ELECTION DAY STOP"}</p>
            {place ? <><h2 className="font-heading text-xl">{place.name}</h2><p className="text-sm flex gap-2"><MapPin className="size-4 shrink-0" />{place.address}</p>{place.room && <p className="rider-muted text-sm">{place.room}</p>}<p className="text-sm">{place.hours || "Confirm hours with KCEB."}</p><Button asChild className="w-full"><a target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(place.address)}`}><Navigation className="mr-2 size-4" /> Directions to this polling place</a></Button><Button asChild variant="outline" className="w-full"><Link to="/rides">Plan a free ride</Link></Button><p className="rider-muted text-xs">Ride pickups run 11 AM to 3:30 PM on Nov 3. Booking needs 24 hours notice. Seats are limited.</p></>
              : <p className="text-sm">{selected ? "No polling place is listed for this precinct. Call KCEB at (816) 842-4820. We will not guess." : "Check your address or choose your ward and precinct below. Your assigned polling place depends on your registered address."}</p>}
          </section>
          <div className="flex gap-2"><Input aria-label="Search polling places or precincts" placeholder="Place or precinct" value={search} onChange={e => setSearch(e.target.value)} /><select aria-label="Filter by ward" className="rider-input !w-28" value={ward} onChange={e => setWard(e.target.value)}><option value="">All wards</option>{Array.from({ length: 26 }, (_, i) => i + 1).filter(n => n !== 21).map(n => <option key={n} value={n}>Ward {n}</option>)}</select></div>
          {isLoading ? <p role="status">Loading verified polling places.</p> : isError ? <div role="alert"><p>Polling list unavailable. Please check kceb.org.</p><Button variant="outline" onClick={() => void refetch()}>Try again</Button></div> : <><p className="rider-muted text-xs">{pollingPlaceCount(sites)} polling places · {sites.length} precincts</p><div className="max-h-72 overflow-y-auto space-y-1">{list.map(site => <Button key={site.precinct_key} variant={selected === site.precinct_key ? "secondary" : "ghost"} className="h-auto min-h-12 w-full justify-start whitespace-normal text-left" onClick={() => choose(site.precinct_key)}><span><span className="block text-xs text-primary">Precinct {site.precinct_key}</span><span className="block">{site.name}</span></span></Button>)}{!list.length && <p>No polling places match that search.</p>}</div></>}
        </aside>
      </div>
      <footer className="border-t border-border pt-5 space-y-3 text-sm"><p className="rider-muted">Polling places: KCEB Nov 3 poll log, dated Sept 15, 2026. Places may change. Confirm with the Election Board before you go.</p><div className="flex flex-wrap gap-3"><Button asChild variant="outline"><a href="https://www.kceb.org" target="_blank" rel="noreferrer">Confirm with KCEB</a></Button><Button asChild variant="outline"><a href="tel:+18168424820"><Phone className="mr-2 size-4" /> KCEB (816) 842-4820</a></Button><Button asChild variant="ghost"><a href="tel:+18163796885">Ride line (816) 379-6885</a></Button></div></footer>
    </div>
  </RidesShell>;
}