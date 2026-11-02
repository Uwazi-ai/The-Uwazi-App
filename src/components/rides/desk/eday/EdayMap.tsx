import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fmtHour } from "@/components/rides/RidesUI";
import { DriverMap } from "../tracking/DriverMap";
import { trackingCars } from "../tracking/DriverTrackingPanel";
import type { AutocabStatus } from "../autocabClient";
import type { DriverSession, MapPin } from "../tracking/types";

type Pickup = { code: string; time: string; status: string; lat: number; lng: number };
type Place = { id: string; name: string; lat: number; lng: number; rides: number };
type DayMap = { sessions: DriverSession[]; pickups: Pickup[]; places: Place[]; needs_place: number; places_without_map: number };

// Pins carry ride code and pickup time only. No names, phones or addresses.
export function dayMapPins(d: Pick<DayMap, "pickups" | "places">): MapPin[] {
  return [
    ...d.places.map((p) => ({ lat: p.lat, lng: p.lng, kind: "place" as const, label: `${p.name}. ${p.rides} ${p.rides === 1 ? "ride" : "rides"} heading here` })),
    ...d.pickups.map((p) => ({ lat: p.lat, lng: p.lng, kind: "pickup" as const, label: `Pickup ${p.code}, ${fmtHour(p.time)}` })),
  ];
}

/** Live Election Day map for coordinators. Refreshes when the desk's live ride list changes, and cars every 10 seconds. */
export function EdayMap({ rideKey, autocab = {} }: { rideKey: string; autocab?: Record<string, AutocabStatus> }) {
  const [data, setData] = useState<DayMap | null>(null);
  const [sessions, setSessions] = useState<DriverSession[]>([]);
  const [error, setError] = useState(false);
  const [now, setNow] = useState(Date.now());
  const busy = useRef(false);

  const loadDay = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const { data: d, error: e } = await supabase.functions.invoke("driver-locations", { body: { day_map: true } });
      if (e || !d) { setError(true); return; }
      setError(false); setData(d as DayMap); setSessions((d as DayMap).sessions ?? []);
    } finally { busy.current = false; }
  }, []);
  const loadCars = useCallback(async () => {
    if (document.visibilityState === "hidden") return;
    const { data: d, error: e } = await supabase.functions.invoke("driver-locations", { body: {} });
    if (!e && d) setSessions(d.sessions ?? []);
  }, []);

  // Ride changes arrive through the desk's live channel and change rideKey.
  useEffect(() => { void loadDay(); }, [loadDay, rideKey]);
  useEffect(() => {
    const cars = setInterval(() => void loadCars(), 10000);
    const day = setInterval(() => void loadDay(), 60000);
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(cars); clearInterval(day); clearInterval(clock); };
  }, [loadCars, loadDay]);

  const cars = useMemo(() => trackingCars(sessions, autocab, now), [sessions, autocab, now]);
  const pins = useMemo(() => (data ? dayMapPins(data) : []), [data]);

  return (
    <div className="mt-5 min-w-0" data-eday-map>
      <h3 className="font-semibold">Live map</h3>
      <p className="mb-2 text-sm text-[hsl(var(--rides-ink)/0.7)]">Blue: polling places. Amber: pickups. Green: zTrip car.</p>
      {error && <p role="status" className="mb-2 text-sm text-destructive">The map could not load. It will try again.</p>}
      <DriverMap cars={cars} pins={pins} now={now} label="Election Day live map" fit />
      {data && (data.needs_place > 0 || data.places_without_map > 0) && (
        <p className="mt-2 text-sm text-[hsl(var(--rides-amber))]">
          {data.needs_place > 0 && `${data.needs_place} ${data.needs_place === 1 ? "ride needs" : "rides need"} a voting place. `}
          {data.places_without_map > 0 && `${data.places_without_map} ${data.places_without_map === 1 ? "place has" : "places have"} no map location yet.`}
        </p>
      )}
    </div>
  );
}
