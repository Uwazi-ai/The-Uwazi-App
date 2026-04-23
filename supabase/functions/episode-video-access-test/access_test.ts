// Automated checks for episode video access gating.
// Verifies the `log_episode_video_access` SQL function returns the
// correct grant/reason for anon, free, subscriber, and admin users.
//
// Run with: deno test --allow-net --allow-env

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

interface AccessResult {
  granted: boolean;
  reason: string;
}

async function checkAccess(
  userId: string | null,
  episodeId: string,
): Promise<AccessResult> {
  const { data, error } = await admin.rpc("log_episode_video_access", {
    _user_id: userId,
    _episode_id: episodeId,
    _video_path: "test/path.mp4",
    _context: { source: "automated_test" },
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return { granted: row.granted, reason: row.reason };
}

async function createEpisode(opts: { is_free: boolean; is_published: boolean }) {
  const { data, error } = await admin
    .from("episodes")
    .insert({
      title: `test-${crypto.randomUUID()}`,
      topic: "Test",
      is_free: opts.is_free,
      is_published: opts.is_published,
      video_url: "test/path.mp4",
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

async function createUser(opts: { admin?: boolean; subscribed?: boolean }) {
  const email = `gatetest+${crypto.randomUUID()}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: crypto.randomUUID() + "Aa1!",
    email_confirm: true,
  });
  if (error) throw error;
  const userId = data.user!.id;

  if (opts.admin) {
    await admin.from("profiles").update({ is_admin: true }).eq("user_id", userId);
  }
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
  return userId;
}

async function cleanup(userIds: string[], episodeIds: string[]) {
  for (const id of userIds) {
    await admin.from("subscriptions").delete().eq("user_id", id);
    await admin.auth.admin.deleteUser(id).catch(() => {});
  }
  for (const id of episodeIds) {
    await admin.from("episodes").delete().eq("id", id);
  }
}

Deno.test("anon user is denied premium episode", async () => {
  const ep = await createEpisode({ is_free: false, is_published: true });
  try {
    const r = await checkAccess(null, ep);
    assertEquals(r.granted, false);
    assertEquals(r.reason, "denied_anonymous");
  } finally {
    await cleanup([], [ep]);
  }
});

Deno.test("anon user is granted free episode", async () => {
  const ep = await createEpisode({ is_free: true, is_published: true });
  try {
    const r = await checkAccess(null, ep);
    assertEquals(r.granted, true);
    assertEquals(r.reason, "granted_free_episode");
  } finally {
    await cleanup([], [ep]);
  }
});

Deno.test("free user without subscription is denied premium episode", async () => {
  const ep = await createEpisode({ is_free: false, is_published: true });
  const user = await createUser({});
  try {
    const r = await checkAccess(user, ep);
    assertEquals(r.granted, false);
    assertEquals(r.reason, "denied_no_subscription");
  } finally {
    await cleanup([user], [ep]);
  }
});

Deno.test("subscriber is granted premium episode", async () => {
  const ep = await createEpisode({ is_free: false, is_published: true });
  const user = await createUser({ subscribed: true });
  try {
    const r = await checkAccess(user, ep);
    assertEquals(r.granted, true);
    assertEquals(r.reason, "granted_active_subscription");
  } finally {
    await cleanup([user], [ep]);
  }
});

Deno.test("admin is granted premium episode", async () => {
  const ep = await createEpisode({ is_free: false, is_published: true });
  const user = await createUser({ admin: true });
  try {
    const r = await checkAccess(user, ep);
    assertEquals(r.granted, true);
    assertEquals(r.reason, "granted_admin");
  } finally {
    await cleanup([user], [ep]);
  }
});

Deno.test("unpublished episode is denied even for subscribers", async () => {
  const ep = await createEpisode({ is_free: true, is_published: false });
  const user = await createUser({ subscribed: true });
  try {
    const r = await checkAccess(user, ep);
    assertEquals(r.granted, false);
    assertEquals(r.reason, "denied_unpublished");
  } finally {
    await cleanup([user], [ep]);
  }
});

Deno.test("nonexistent episode is denied", async () => {
  const r = await checkAccess(null, "00000000-0000-0000-0000-000000000000");
  assertEquals(r.granted, false);
  assertEquals(r.reason, "denied_episode_not_found");
});
