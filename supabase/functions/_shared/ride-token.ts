// Voter facing ride lookups. Every lookup needs the ride code AND its card token.
// A wrong code and a wrong token give the same answer so codes cannot be probed.
import { z } from "npm:zod@3.23.8";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

export const CodeToken = {
  ride_code: z.string().regex(/^UZ-\d{4,7}$/i),
  t: z.string().regex(/^[A-Za-z0-9_-]{24,64}$/),
};

export const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

export const notFound = () => json({ error: "Ride not found" }, 404);

function same(a: string, b: string) {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

// deno-lint-ignore no-explicit-any
export async function rideByToken(db: any, code: string, token: string, cols: string) {
  const { data } = await db.from("ride_requests").select(`${cols},card_token`).eq("ride_code", code.toUpperCase()).maybeSingle();
  if (!data || !same(String(data.card_token), token)) return null;
  return data;
}
