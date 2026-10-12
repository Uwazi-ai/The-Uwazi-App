// Ride texts through Bird. Used only by ride functions. Never throws, never logs
// the phone, the key or the sender. Every send writes a ride_events row.
// deno-lint-ignore-file no-explicit-any

export const APP_ORIGIN = "https://uwaziapp.uwazi.ai";
export const RIDE_LINE = "(816) 379-6885";
const BIRD_URL = "https://us1.platform.bird.com/v1/sms/messages";
const STOP = " Reply STOP to opt out.";

export type SmsKind =
  | "request_received" | "referred" | "booked" | "reminder"
  | "destination_assigned" | "pickup_confirmed" | "ride_home_sent" | "cancelled";

export function e164(phone: string) {
  const d = String(phone).replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  return /^\d{10}$/.test(d) ? `+1${d}` : null;
}

export async function phoneHash(e: string) {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(e));
  return Array.from(new Uint8Array(h)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const fmtDay = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
const fmtTime = (t: string) => {
  const h = Number(t.slice(0, 2));
  return `${h % 12 || 12} ${h < 12 ? "AM" : "PM"}`;
};

export type SmsRide = {
  id: string; ride_code: string; card_token: string; phone: string; texts_ok: boolean;
  ride_day: string; pickup_time: string; needs_destination: boolean;
  site?: { name: string; address: string } | null;
};

export function messageText(kind: SmsKind, r: SmsRide) {
  const link = `${APP_ORIGIN}/rides/card/${r.ride_code}?t=${encodeURIComponent(r.card_token)}`;
  const dest = r.site?.name ?? "your voting place";
  switch (kind) {
    case "request_received":
      return `UWAZI: We got your ride request, code ${r.ride_code}. A coordinator will text you when your zTrip ride is booked.${r.needs_destination ? " We are confirming your voting place." : ""} Your ride card: ${link}`;
    case "referred":
      return `UWAZI: Our funded rides are full. RideKC can get you to your voting place. Plan your trip at ridekc.org or call ${RIDE_LINE} for help.`;
    case "booked":
      return `UWAZI: Your ride is booked for ${fmtDay(r.ride_day)} at ${fmtTime(r.pickup_time)} to ${dest}. Bring a photo ID. Track it here: ${link}`;
    case "reminder":
      return `UWAZI: Reminder, your ride to vote is tomorrow at ${fmtTime(r.pickup_time)}. Need to change it? Call ${RIDE_LINE}.`;
    case "destination_assigned":
      return `UWAZI: Your voting place is ${dest}, ${r.site?.address ?? ""}. Your ride card: ${link}`;
    case "pickup_confirmed":
      return `UWAZI: Your driver confirmed your pickup on ${fmtDay(r.ride_day)} at ${fmtTime(r.pickup_time)}. Be ready at the door with a photo ID. Questions? Call ${RIDE_LINE}. Track it here: ${link}`;
    case "ride_home_sent":
      return "UWAZI: Your ride home is on the way. Wait near the door.";
    case "cancelled":
      return `UWAZI: Your ride ${r.ride_code} is cancelled. Need a new one? Call ${RIDE_LINE}.`;
  }
}

export function birdBody(kind: SmsKind, r: SmsRide, to: string, from: string) {
  return { to, text: messageText(kind, r) + STOP, from, category: "transactional" };
}

const RIDE_COLS = "id,ride_code,card_token,phone,texts_ok,ride_day,pickup_time,needs_destination,site:voter_guide_sites(name,address)";

export async function loadSmsRide(db: any, id: string): Promise<SmsRide | null> {
  const { data } = await db.from("ride_requests").select(RIDE_COLS).eq("id", id).maybeSingle();
  return data ?? null;
}

// Sends one text. Returns what happened; never throws.
export async function sendRideSms(
  db: any, kind: SmsKind, rideOrId: SmsRide | string, actor: string | null = null,
  fetcher: typeof fetch = fetch,
): Promise<"sent" | "skipped" | "failed"> {
  const log = (event_type: string, note: string) =>
    db.from("ride_events").insert({ request_id: typeof rideOrId === "string" ? rideOrId : rideOrId.id, event_type, note, actor }).then(() => {}, () => {});
  try {
    const r = typeof rideOrId === "string" ? await loadSmsRide(db, rideOrId) : rideOrId;
    if (!r) return "skipped";
    if (!r.texts_ok) return "skipped";
    const to = e164(r.phone);
    if (!to) { await log("texted_failed", `${kind}. Phone not valid`); return "failed"; }
    const { data: opt } = await db.from("ride_sms_optouts").select("phone_hash").eq("phone_hash", await phoneHash(to)).maybeSingle();
    if (opt) { await log("text_skipped", `${kind}. Rider opted out`); return "skipped"; }
    const key = Deno.env.get("BIRD_API_KEY");
    const from = Deno.env.get("BIRD_SENDER");
    if (!key || !from) { await log("texted_failed", `${kind}. Texting not set up`); return "failed"; }
    const res = await fetcher(BIRD_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(birdBody(kind, r, to, from)),
    });
    if (!res.ok) {
      const why = (await res.text().catch(() => "")).replace(/\+?\d{7,}/g, "#").slice(0, 300);
      console.error("bird error", res.status, why);
      await log("texted_failed", `${kind}. Bird status ${res.status}`); return "failed";
    }
    await res.body?.cancel().catch(() => {});
    await log("texted", kind);
    return "sent";
  } catch (_e) {
    await log("texted_failed", `${kind}. Bird did not answer`);
    return "failed";
  }
}

// Sends one text that is not tied to a ride (waitlist). Never throws, never logs the phone.
export async function sendPlainSms(db: any, phone: string, text: string, fetcher: typeof fetch = fetch): Promise<"sent" | "skipped" | "failed"> {
  try {
    const to = e164(phone);
    if (!to) return "failed";
    const { data: opt } = await db.from("ride_sms_optouts").select("phone_hash").eq("phone_hash", await phoneHash(to)).maybeSingle();
    if (opt) return "skipped";
    const key = Deno.env.get("BIRD_API_KEY");
    const from = Deno.env.get("BIRD_SENDER");
    if (!key || !from) return "failed";
    const res = await fetcher(BIRD_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ to, text: text + STOP, from, category: "transactional" }),
    });
    if (!res.ok) {
      const why = (await res.text().catch(() => "")).replace(/\+?\d{7,}/g, "#").slice(0, 300);
      console.error("bird error", res.status, why);
      return "failed";
    }
    await res.body?.cancel().catch(() => {});
    return "sent";
  } catch (_e) {
    return "failed";
  }
}
