// Regression tests: non-admin users must not be able to escalate their own
// profile by setting is_admin or is_suspended. Verifies both the column-level
// GRANT restrictions and the safeguard trigger.
//
// Run with: deno test --allow-net --allow-env

import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

async function createSignedInUser(): Promise<{
  userId: string;
  client: ReturnType<typeof createClient>;
  email: string;
  password: string;
}> {
  const email = `escalate+${crypto.randomUUID()}@example.com`;
  const password = crypto.randomUUID() + "Aa1!";
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  const userId = data.user!.id;

  const client = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false },
  });
  const { error: signInErr } = await client.auth.signInWithPassword({ email, password });
  if (signInErr) throw signInErr;
  return { userId, client, email, password };
}

async function getProfile(userId: string) {
  const { data, error } = await admin
    .from("profiles")
    .select("is_admin, is_suspended, display_name")
    .eq("user_id", userId)
    .single();
  if (error) throw error;
  return data;
}

async function cleanup(userId: string) {
  await admin.auth.admin.deleteUser(userId).catch(() => {});
}

Deno.test("non-admin cannot set is_admin=true on own profile", async () => {
  const { userId, client } = await createSignedInUser();
  try {
    const before = await getProfile(userId);
    assertEquals(before.is_admin, false);

    const { error } = await client
      .from("profiles")
      .update({ is_admin: true })
      .eq("user_id", userId);

    // Either the request errors (preferred) or silently no-ops.
    // In both cases, the row must remain unchanged.
    assert(error !== null, "Expected privilege escalation update to be rejected");

    const after = await getProfile(userId);
    assertEquals(after.is_admin, false, "is_admin must remain false");
  } finally {
    await cleanup(userId);
  }
});

Deno.test("non-admin cannot set is_suspended on own profile", async () => {
  const { userId, client } = await createSignedInUser();
  try {
    const { error } = await client
      .from("profiles")
      .update({ is_suspended: true })
      .eq("user_id", userId);

    assert(error !== null, "Expected suspended-flag update to be rejected");

    const after = await getProfile(userId);
    assertEquals(after.is_suspended, false, "is_suspended must remain false");
  } finally {
    await cleanup(userId);
  }
});

Deno.test("non-admin cannot escalate via combined update with safe field", async () => {
  // Attempts to sneak is_admin=true alongside a legitimate display_name change.
  const { userId, client } = await createSignedInUser();
  try {
    const { error } = await client
      .from("profiles")
      .update({ display_name: "Sneaky Update", is_admin: true })
      .eq("user_id", userId);

    assert(error !== null, "Combined update with is_admin must be rejected");

    const after = await getProfile(userId);
    assertEquals(after.is_admin, false, "is_admin must remain false");
    // display_name should also not have changed because the whole statement was rejected.
    assert(
      after.display_name !== "Sneaky Update",
      "Whole update should fail atomically; display_name must not be changed",
    );
  } finally {
    await cleanup(userId);
  }
});

Deno.test("non-admin CAN update safe field (display_name)", async () => {
  // Sanity check: the lockdown didn't break legitimate self-updates.
  const { userId, client } = await createSignedInUser();
  try {
    const newName = `Legit ${crypto.randomUUID().slice(0, 8)}`;
    const { error } = await client
      .from("profiles")
      .update({ display_name: newName })
      .eq("user_id", userId);

    assertEquals(error, null, "Safe field update must succeed");

    const after = await getProfile(userId);
    assertEquals(after.display_name, newName);
    assertEquals(after.is_admin, false);
  } finally {
    await cleanup(userId);
  }
});

Deno.test("non-admin cannot update another user's profile", async () => {
  const userA = await createSignedInUser();
  const userB = await createSignedInUser();
  try {
    const { error } = await userA.client
      .from("profiles")
      .update({ display_name: "Hacked" })
      .eq("user_id", userB.userId);

    // RLS USING clause filters out the row, so the update should affect 0 rows.
    const after = await getProfile(userB.userId);
    assert(
      after.display_name !== "Hacked",
      "Cross-user update must not succeed regardless of error status",
    );
    // Error may be null (0 rows updated) or non-null; both are acceptable as long as data is safe.
    void error;
  } finally {
    await cleanup(userA.userId);
    await cleanup(userB.userId);
  }
});
