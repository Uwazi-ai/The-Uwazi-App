// Admin or coordinator only: sends one Bird test email. Logs only id and status.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { BirdClient } from "npm:@messagebird/sdk@0.93.0";

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return json({ error: "Please sign in." }, 401);
  const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data: claims } = await userClient.auth.getClaims(auth.slice(7));
  const uid = claims?.claims?.sub;
  if (!uid) return json({ error: "Please sign in." }, 401);
  const [{ data: isCoord }, { data: isAdmin }] = await Promise.all([
    userClient.rpc("is_ride_coordinator", { _user_id: uid }),
    userClient.rpc("is_admin", { _user_id: uid }),
  ]);
  if (!isCoord && !isAdmin) return json({ error: "Not allowed." }, 403);

  const apiKey = Deno.env.get("BIRD_API_KEY");
  if (!apiKey) return json({ error: "BIRD_API_KEY is not set" }, 500);

  try {
    const bird = new BirdClient({ apiKey });
    const msg = await bird.email.send({
      from: { email: "onboarding@messagebird.dev", name: "Bird" },
      to: ["myke@uwazi.ai"],
      subject: "Hello World",
      html: "<p>You made your <strong>first email fly</strong>. Congratulations!</p>",
    });
    console.log("bird-email-test", msg.id, msg.status);
    return json({ id: msg.id, status: msg.status });
  } catch (e) {
    const status = (e as { status?: number })?.status ?? null;
    console.log("bird-email-test failed", status);
    return json({ error: "Bird did not accept the email.", bird_status: status }, 502);
  }
});
