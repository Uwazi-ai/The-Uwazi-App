import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { priceId, customerEmail, userId, returnUrl, environment } = await req.json();
    if (!priceId || typeof priceId !== "string" || !/^[a-zA-Z0-9_-]+$/.test(priceId)) {
      return new Response(JSON.stringify({ error: "Invalid priceId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const env = (environment || "sandbox") as StripeEnv;
    const stripe = createStripeClient(env);

    const prices = await stripe.prices.list({ lookup_keys: [priceId] });
    if (!prices.data.length) {
      return new Response(JSON.stringify({ error: "Price not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const stripePrice = prices.data[0];

    // Only return to our own app pages.
    const ALLOWED_ORIGINS = ["https://uwaziapp.uwazi.ai", "https://uwaziapp.lovable.app"];
    const isAllowedOrigin = (o: string) =>
      ALLOWED_ORIGINS.includes(o) || /^https:\/\/[a-z0-9-]+\.lovable\.app$/.test(o) || /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/.test(o) || /^http:\/\/localhost(:\d+)?$/.test(o) || o === "capacitor://localhost";
    const reqOrigin = req.headers.get("origin") ?? "";
    const fallbackOrigin = isAllowedOrigin(reqOrigin) ? reqOrigin : ALLOWED_ORIGINS[0];
    let safeReturnUrl = `${fallbackOrigin}/app/checkout/return?session_id={CHECKOUT_SESSION_ID}`;
    if (typeof returnUrl === "string") {
      try {
        if (isAllowedOrigin(new URL(returnUrl).origin)) safeReturnUrl = returnUrl;
      } catch { /* keep default */ }
    }
    const qty = 1; // One subscription per checkout, never set by the caller.
    const isRecurring = stripePrice.type === "recurring";
    const plusPrices = ["uwazi_plus_beta_monthly", "uwazi_plus_beta_yearly", "uwazi_plus_monthly", "uwazi_plus_yearly"];
    const isPlusTrial = isRecurring && plusPrices.includes(priceId);

    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: stripePrice.id, quantity: qty }],
      mode: isRecurring ? "subscription" : "payment",
      ui_mode: "embedded",
      return_url: safeReturnUrl,
      ...(customerEmail && { customer_email: customerEmail }),
      ...(userId && {
        metadata: { userId },
        ...(isRecurring && { subscription_data: { metadata: { userId }, ...(isPlusTrial && { trial_period_days: 7 }) } }),
      }),
    });

    return new Response(JSON.stringify({ clientSecret: session.client_secret }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[create-checkout] error:", error);
    return new Response(JSON.stringify({ error: "Unable to create checkout session" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
