import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";
import { sendAndLog } from "../_shared/transactional-email-templates/send-and-log.ts";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// School email rule: .edu, US K12 state domains, plus a short allow list.
const EXTRA_SCHOOL_DOMAINS = ["kcpublicschools.org", "kckps.org"];
function isSchoolEmail(email: string) {
  const d = email.split("@")[1]?.toLowerCase() ?? "";
  return d.endsWith(".edu") || /\.k12\.[a-z]{2}\.us$/.test(d) || EXTRA_SCHOOL_DOMAINS.some((x) => d === x || d.endsWith("." + x));
}

async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const ALLOWED = ["https://uwaziapp.uwazi.ai", "https://uwaziapp.lovable.app"];
const okOrigin = (o: string) =>
  ALLOWED.includes(o) || /^https:\/\/[a-z0-9-]+\.lovable\.app$/.test(o) || /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/.test(o) || /^http:\/\/localhost(:\d+)?$/.test(o);

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("send_email"), email: z.string().trim().email().max(255) }),
  z.object({ action: z.literal("confirm"), token: z.string().min(20).max(200) }),
  z.object({ action: z.literal("id_fallback"), school_name: z.string().trim().min(2).max(160), student_id: z.string().trim().min(3).max(64) }),
  z.object({ action: z.literal("status") }),
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json(401, { error: "Please sign in." });
    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json(400, { error: "Please check what you typed." });
    const body = parsed.data;
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    if (body.action === "status") {
      const { data } = await db.from("student_verification").select("method, status, school_name, verified_at")
        .eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      return json(200, { verification: data ?? null });
    }

    if (body.action === "send_email") {
      const email = body.email.toLowerCase();
      if (!isSchoolEmail(email)) return json(400, { error: "That does not look like a school email. Try your school email, or use your school name and student ID." });
      const { count } = await db.from("student_verification").select("id", { count: "exact", head: true })
        .eq("user_id", user.id).gte("created_at", new Date(Date.now() - 3600_000).toISOString());
      if ((count ?? 0) >= 5) return json(429, { error: "Too many tries. Please wait an hour." });
      const token = crypto.randomUUID() + crypto.randomUUID();
      await db.from("student_verification").insert({
        user_id: user.id, method: "school_email", school_email: email,
        token_hash: await sha256(token), token_expires_at: new Date(Date.now() + 86400_000).toISOString(),
      });
      const origin = req.headers.get("origin") ?? "";
      const base = okOrigin(origin) ? origin : ALLOWED[0];
      await sendAndLog("student-verify", email, {
        idempotencyKey: `student-${user.id}-${await sha256(token)}`,
        templateData: { link: `${base}/app/student/confirm?token=${encodeURIComponent(token)}` },
      });
      return json(200, { sent: true });
    }

    if (body.action === "confirm") {
      const { data: row } = await db.from("student_verification").select("id, token_expires_at, status")
        .eq("user_id", user.id).eq("token_hash", await sha256(body.token)).maybeSingle();
      if (!row) return json(400, { error: "That link did not work. Ask for a new one." });
      if (row.status === "verified") return json(200, { verified: true });
      if (new Date(row.token_expires_at) < new Date()) return json(400, { error: "That link expired. Ask for a new one." });
      await db.from("student_verification").update({ status: "verified", verified_at: new Date().toISOString(), token_hash: null }).eq("id", row.id);
      return json(200, { verified: true });
    }

    // Fallback: keep only a one way hash of the ID, salted with the user id. A person reviews it.
    const idHash = await sha256(`${user.id}:${body.student_id.replace(/\s+/g, "").toUpperCase()}`);
    await db.from("student_verification").insert({
      user_id: user.id, method: "student_id", school_name: body.school_name, id_hash: idHash, status: "needs_review",
    });
    return json(200, { needs_review: true });
  } catch (e) {
    console.error("[student-verify]", e);
    return json(500, { error: "Something went wrong. Try again." });
  }
});
