// Super admin only: texts the ride waitlist that a seat opened. Skips anyone
// texted in the last 12 hours and anyone who opted out. Never returns phones.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";
import { APP_ORIGIN, RIDE_LINE, sendPlainSms } from "../_shared/ride-sms.ts";

const Body = z.object({ state: z.enum(["MO", "KS", "all"]).default("all"), limit: z.number().int().min(1).max(200).default(50) }).strict();
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
export const WAITLIST_TEXT = `UWAZI: A free ride seat just opened. Book now at ${APP_ORIGIN}/rides or call ${RIDE_LINE}.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return json({ error: "Please sign in." }, 401);
  const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data: claims } = await userClient.auth.getClaims(auth.slice(7));
  const uid = claims?.claims?.sub;
  if (!uid) return json({ error: "Please sign in." }, 401);
  const { data: isAdmin } = await userClient.rpc("has_role", { _user_id: uid, _role: "super_admin" });
  if (!isAdmin) return json({ error: "Only a super admin can text the waitlist." }, 403);
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: "Bad request" }, 400);
  const { state, limit } = parsed.data;

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const since = new Date(Date.now() - 12 * 3600_000).toISOString();
  let q = db.from("poll_ride_waitlist").select("id,phone,user_id,state_code,texted_at,texted_count")
    .or(`texted_at.is.null,texted_at.lt.${since}`).order("texted_at", { ascending: true, nullsFirst: true }).order("created_at").limit(limit);
  if (state !== "all") q = q.eq("state_code", state);
  const { data: rows, error } = await q;
  if (error) return json({ error: "Could not load the waitlist." }, 500);

  const ids = (rows ?? []).filter((r) => !r.phone && r.user_id).map((r) => r.user_id);
  const phones = new Map<string, string>();
  if (ids.length) {
    const { data: ps } = await db.from("profiles").select("id,phone_number").in("id", ids);
    (ps ?? []).forEach((p) => p.phone_number && phones.set(p.id, p.phone_number));
  }
  const out = { sent: 0, skipped: 0, failed: 0, no_phone: 0 };
  for (const r of rows ?? []) {
    const phone = r.phone || (r.user_id ? phones.get(r.user_id) : null);
    if (!phone) { out.no_phone++; continue; }
    const res = await sendPlainSms(db, phone, WAITLIST_TEXT);
    out[res]++;
    if (res === "sent") await db.from("poll_ride_waitlist").update({ texted_at: new Date().toISOString(), texted_count: (r.texted_count ?? 0) + 1 }).eq("id", r.id);
  }
  return json(out);
});
