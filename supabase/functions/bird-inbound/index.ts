// Bird inbound SMS webhook. Records STOP words as opt-outs and START as opt-in.
// Verifies Bird's HMAC signature. Never logs the phone or the message.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { e164, phoneHash } from "../_shared/ride-sms.ts";

const STOP = new Set(["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"]);
const ok = (s = 200) => new Response(JSON.stringify({ ok: s === 200 }), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const b64 = (b: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(b)));
async function verify(req: Request, raw: string, key: string) {
  const sig = req.headers.get("messagebird-signature") ?? "";
  const ts = req.headers.get("messagebird-request-timestamp") ?? "";
  if (!sig || !ts || Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;
  const bodyHash = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw)));
  const head = new TextEncoder().encode(`${ts}\n${req.url}\n`);
  const msg = new Uint8Array(head.length + bodyHash.length);
  msg.set(head); msg.set(bodyHash, head.length);
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expected = b64(await crypto.subtle.sign("HMAC", k, msg));
  if (expected.length !== sig.length) return false;
  let d = 0; for (let i = 0; i < sig.length; i++) d |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  return d === 0;
}

// deno-lint-ignore no-explicit-any
function pick(j: any) {
  const p = j?.payload ?? j;
  const from = p?.sender?.contact?.identifierValue ?? p?.sender?.contact?.platformAddress ?? p?.originator ?? p?.from;
  const text = p?.body?.text?.text ?? p?.body?.text ?? p?.text ?? p?.message;
  return { from: typeof from === "string" ? from : "", text: typeof text === "string" ? text : "" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return ok(405);
  const key = Deno.env.get("BIRD_WEBHOOK_SECRET");
  if (!key) return ok(503);
  const raw = await req.text();
  if (raw.length > 20000 || !(await verify(req, raw, key))) return ok(401);
  let j: unknown; try { j = JSON.parse(raw); } catch { return ok(400); }
  const { from, text } = pick(j);
  const to = e164(from);
  const word = text.trim().toUpperCase().replace(/[^A-Z]/g, "");
  if (!to || !word) return ok();
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const h = await phoneHash(to);
  if (STOP.has(word)) await db.from("ride_sms_optouts").upsert({ phone_hash: h }, { onConflict: "phone_hash" });
  else if (word === "START" || word === "UNSTOP") await db.from("ride_sms_optouts").delete().eq("phone_hash", h);
  return ok();
});
