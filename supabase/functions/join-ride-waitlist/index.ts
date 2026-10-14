// Ride waitlist intake. Checks KCEB area eligibility before saving.
// Stores only phone or user id and state. Never stores the address.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";
import { checkEligibility, LOOKUP_FAILED_MSG, OUT_OF_AREA_MSG } from "../_shared/ride-eligibility.ts";

const Body = z.object({
  phone: z.string().trim().max(20).optional(),
  address: z.string().trim().min(5).max(200),
  zip: z.string().trim().regex(/^\d{5}$/),
}).strict();

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const p = Body.safeParse(await req.json().catch(() => null));
  if (!p.success) return json({ error: "Please check your address and ZIP." }, 400);

  let uid: string | null = null;
  const auth = req.headers.get("Authorization") ?? "";
  if (auth.startsWith("Bearer ")) {
    const uc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data } = await uc.auth.getClaims(auth.slice(7));
    uid = (data?.claims?.sub as string) ?? null;
  }
  const digits = (p.data.phone ?? "").replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  if (!uid && !/^[2-9]\d{9}$/.test(digits)) return json({ error: "Enter a 10-digit mobile number." }, 400);

  const e = await checkEligibility(p.data.address, p.data.zip);
  if (e.status === "out_of_area") return json({ error: OUT_OF_AREA_MSG, code: "out_of_area" }, 400);
  if (e.status === "lookup_failed") return json({ error: LOOKUP_FAILED_MSG, code: "lookup_failed" }, 400);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { error } = await db.from("poll_ride_waitlist").insert({ user_id: uid, phone: digits || null, state_code: "MO" });
  if (error) { console.error("waitlist insert failed", error); return json({ error: "Something went wrong. Try again." }, 500); }
  return json({ ok: true });
});
