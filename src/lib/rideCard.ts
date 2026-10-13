// Loads a ride card. A 404 ("Ride not found") is a normal answer, not an error to report.
const URL_ = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-ride-card`;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export type RideCardResult = { ok: boolean; data?: any; notFound?: boolean };

export async function fetchRideCard(ride_code: string, t: string): Promise<RideCardResult> {
  try {
    const r = await fetch(URL_, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: KEY, Authorization: `Bearer ${KEY}` },
      body: JSON.stringify({ ride_code, t }),
    });
    const body = await r.json().catch(() => null);
    if (r.ok) return { ok: true, data: body };
    return { ok: false, notFound: r.status === 404 };
  } catch {
    return { ok: false, notFound: false };
  }
}
