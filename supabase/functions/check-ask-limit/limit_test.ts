// Automated tests for the check-ask-limit Edge Function.
// Covers:
//   - 401 when JWT is missing/invalid
//   - free-user window increment, 429 at the limit, and window reset
//   - Uwazi+ (subscribed) users are unlimited
//
// Run with: deno test --allow-net --allow-env

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL =
  Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY =
  Deno.env.get("SUPABASE_ANON_KEY") ??
  Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

const FN_URL = `${SUPABASE_URL}/functions/v1/check-ask-limit`;
const FREE_LIMIT = 5;
const WINDOW_MS = 8 * 60 * 60 * 1000;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

interface LimitResponse {
  status: number;
  body: {
    allowed?: boolean;
    is_plus?: boolean;
    questions_used?: number | null;
    questions_remaining?: number | null;
    reset_at?: string | null;
    error?: string;
  };
}

async function callFn(token?: string): Promise<LimitResponse> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: ANON_KEY,
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(FN_URL, { method: "POST", headers });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function createUser(opts: { subscribed?: boolean } = {}) {
  const email = `asklimit+${crypto.randomUUID()}@example.com`;
  const password = crypto.randomUUID() + "Aa1!";
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  const userId = data.user!.id;

  // Ensure profile exists & is in a clean state (handle_new_user trigger creates it).
  await admin
    .from("profiles")
    .update({
      is_admin: false,
      ask_uwazi_question_count: 0,
      ask_uwazi_window_start: null,
    })
    .eq("user_id", userId);

  if (opts.subscribed) {
    await admin.from("subscriptions").insert({
      user_id: userId,
      environment: "live",
      status: "active",
      product_id: "prod_test",
      price_id: "price_test",
      stripe_customer_id: `cus_${userId}`,
      stripe_subscription_id: `sub_${userId}`,
      current_period_end: new Date(Date.now() + 86_400_000).toISOString(),
    });
  }

  const signIn = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: sess, error: sErr } = await signIn.auth.signInWithPassword({
    email,
    password,
  });
  if (sErr) throw sErr;
  const token = sess.session!.access_token;
  return { userId, token };
}

async function cleanup(userId: string) {
  await admin.from("subscriptions").delete().eq("user_id", userId);
  await admin.auth.admin.deleteUser(userId).catch(() => {});
}

Deno.test("returns 401 when Authorization header is missing", async () => {
  const r = await callFn();
  assertEquals(r.status, 401);
  assert(r.body.error, "expected error message");
});

Deno.test("returns 401 when Authorization token is invalid", async () => {
  const r = await callFn("not-a-real-jwt");
  assertEquals(r.status, 401);
});

Deno.test("free user: increments count and returns remaining", async () => {
  const { userId, token } = await createUser();
  try {
    const r1 = await callFn(token);
    assertEquals(r1.status, 200);
    assertEquals(r1.body.allowed, true);
    assertEquals(r1.body.is_plus, false);
    assertEquals(r1.body.questions_used, 1);
    assertEquals(r1.body.questions_remaining, FREE_LIMIT - 1);
    assert(r1.body.reset_at, "reset_at must be set");

    const r2 = await callFn(token);
    assertEquals(r2.status, 200);
    assertEquals(r2.body.questions_used, 2);
    assertEquals(r2.body.questions_remaining, FREE_LIMIT - 2);
  } finally {
    await cleanup(userId);
  }
});

Deno.test("free user: returns 429 once limit is reached", async () => {
  const { userId, token } = await createUser();
  try {
    // Pre-fill the window to the cap.
    await admin
      .from("profiles")
      .update({
        ask_uwazi_question_count: FREE_LIMIT,
        ask_uwazi_window_start: new Date().toISOString(),
      })
      .eq("user_id", userId);

    const r = await callFn(token);
    assertEquals(r.status, 429);
    assertEquals(r.body.allowed, false);
    assertEquals(r.body.is_plus, false);
    assertEquals(r.body.questions_remaining, 0);
    assertEquals(r.body.questions_used, FREE_LIMIT);
    assert(r.body.reset_at, "reset_at must be returned for paywall countdown");
  } finally {
    await cleanup(userId);
  }
});

Deno.test("free user: window resets after 8 hours", async () => {
  const { userId, token } = await createUser();
  try {
    // Simulate an exhausted window that started > 8h ago.
    const expired = new Date(Date.now() - WINDOW_MS - 60_000).toISOString();
    await admin
      .from("profiles")
      .update({
        ask_uwazi_question_count: FREE_LIMIT,
        ask_uwazi_window_start: expired,
      })
      .eq("user_id", userId);

    const r = await callFn(token);
    assertEquals(r.status, 200);
    assertEquals(r.body.allowed, true);
    assertEquals(r.body.questions_used, 1);
    assertEquals(r.body.questions_remaining, FREE_LIMIT - 1);

    // DB should reflect the fresh window.
    const { data: p } = await admin
      .from("profiles")
      .select("ask_uwazi_question_count, ask_uwazi_window_start")
      .eq("user_id", userId)
      .single();
    assertEquals(p!.ask_uwazi_question_count, 1);
    const startMs = new Date(p!.ask_uwazi_window_start as string).getTime();
    assert(
      Date.now() - startMs < 60_000,
      "window_start should have been reset to ~now",
    );
  } finally {
    await cleanup(userId);
  }
});

Deno.test("Uwazi+ subscriber: unlimited, no counter touched", async () => {
  const { userId, token } = await createUser({ subscribed: true });
  try {
    for (let i = 0; i < FREE_LIMIT + 2; i++) {
      const r = await callFn(token);
      assertEquals(r.status, 200);
      assertEquals(r.body.allowed, true);
      assertEquals(r.body.is_plus, true);
      assertEquals(r.body.questions_remaining, null);
      assertEquals(r.body.reset_at, null);
    }

    const { data: p } = await admin
      .from("profiles")
      .select("ask_uwazi_question_count, ask_uwazi_window_start")
      .eq("user_id", userId)
      .single();
    assertEquals(p!.ask_uwazi_question_count, 0);
    assertEquals(p!.ask_uwazi_window_start, null);
  } finally {
    await cleanup(userId);
  }
});

Deno.test("admin user: treated as Uwazi+ (unlimited)", async () => {
  const { userId, token } = await createUser();
  try {
    await admin
      .from("profiles")
      .update({ is_admin: true })
      .eq("user_id", userId);

    const r = await callFn(token);
    assertEquals(r.status, 200);
    assertEquals(r.body.allowed, true);
    assertEquals(r.body.is_plus, true);
    assertEquals(r.body.questions_remaining, null);
  } finally {
    await cleanup(userId);
  }
});
