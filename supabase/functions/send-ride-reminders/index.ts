// Evening-before reminders for booked rides. Called daily at 6 PM Central by a
// scheduled job. reminder_sent_at is claimed before sending so nothing double sends.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { authorizeSystemJob } from "../_shared/system-auth.ts";
import { loadSmsRide, sendRideSms, rideSmsLive } from "../_shared/ride-sms.ts";

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const a = await authorizeSystemJob(req, db);
  if (!a.ok) return json({ error: "Not allowed" }, 403);

  if (!(await rideSmsLive(db))) return json({ sent: 0, skipped: "texting off", failed: 0 });
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
  // Two UTC runs cover daylight time changes; only the 6 PM Central one works.
  const hour = Number(new Date().toLocaleString("en-US", { timeZone: "America/Chicago", hour: "numeric", hourCycle: "h23" }));
  if (!a.manual && (hour !== 18 || today < "2026-10-19" || today > "2026-11-02")) return json({ skipped: "not 6 PM Central in the ride window" });
  const t = new Date(`${today}T12:00:00Z`);
  t.setUTCDate(t.getUTCDate() + 1);
  const tomorrow = t.toISOString().slice(0, 10);

  const { data: rides } = await db.from("ride_requests").select("id")
    .eq("status", "booked").eq("ride_day", tomorrow).is("reminder_sent_at", null).limit(500);
  const out = { sent: 0, skipped: 0, failed: 0 };
  for (const { id } of rides ?? []) {
    const { data: claimed } = await db.from("ride_requests").update({ reminder_sent_at: new Date().toISOString() })
      .eq("id", id).is("reminder_sent_at", null).select("id");
    if (!claimed?.length) continue;
    const r = await loadSmsRide(db, id);
    if (r) out[await sendRideSms(db, "reminder", r)]++;
  }
  return json({ day: tomorrow, ...out });
});
