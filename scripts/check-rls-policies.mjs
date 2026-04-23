#!/usr/bin/env node
/**
 * RLS Policy Safety Check
 *
 * Scans `supabase/migrations/**.sql` for CREATE POLICY statements that use an
 * always-true USING condition (e.g. `USING (true)`) on sensitive tables.
 *
 * Exits with code 1 if any violation is found, failing CI.
 *
 * Sensitive tables are listed in SENSITIVE_TABLES below. Adjust as needed.
 *
 * NOTE: This is a static check against migration SQL. It will not catch
 * policies created outside the repo (e.g. directly in the Supabase dashboard).
 * Combine with `supabase--linter` and live `pg_policies` audits for full coverage.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS_DIR = "supabase/migrations";

// Tables that must never have an unrestricted SELECT/UPDATE/DELETE policy.
const SENSITIVE_TABLES = new Set([
  "profiles",
  "user_roles",
  "subscriptions",
  "lessons",
  "episodes",
  "ai_chats",
  "ask_uwazi_sessions",
  "uwazi_question_log",
  "saved_legislation",
  "saved_articles",
  "saved_items",
  "user_lesson_progress",
  "user_civic_stats",
  "user_badges",
  "user_preferences",
  "user_tracked_bills",
  "voting_plans",
  "voting_plan_items",
  "ballot_selections",
  "civic_alerts",
  "outreach_campaigns",
  "campaign_recipients",
  "surveys",
  "survey_responses",
  "reports",
  "email_send_log",
  "email_unsubscribe_tokens",
  "suppressed_emails",
  "push_subscriptions",
  "platform_settings",
  "civic_scores",
  "streaks",
  "raia_scores",
  "episode_video_access_log",
]);

// Matches: CREATE POLICY "name" ON [public.]table ... [USING (...)] [WITH CHECK (...)] ;
// We grab table name + the full statement body so we can parse USING/WITH CHECK.
const POLICY_REGEX =
  /CREATE\s+POLICY\s+(?:IF\s+NOT\s+EXISTS\s+)?["']?([\w\s\-]+?)["']?\s+ON\s+(?:public\.)?["']?(\w+)["']?([\s\S]*?);/gi;

// Always-true predicates we want to flag. Strict: only treat literal `true`
// (case-insensitive, optional whitespace, no other tokens) as unsafe.
function isAlwaysTrue(expr) {
  if (!expr) return false;
  const cleaned = expr.trim().replace(/^\(+|\)+$/g, "").trim().toLowerCase();
  return cleaned === "true";
}

function extractParenGroup(source, keyword) {
  // Find `keyword` followed by a balanced parenthesized expression.
  const re = new RegExp(`\\b${keyword}\\b\\s*\\(`, "i");
  const m = re.exec(source);
  if (!m) return null;
  let depth = 0;
  let start = m.index + m[0].length - 1; // index of opening paren
  for (let i = start; i < source.length; i++) {
    const ch = source[i];
    if (ch === "(") depth++;
    else if (ch === ")") {
      depth--;
      if (depth === 0) return source.slice(start + 1, i);
    }
  }
  return null;
}

function walkSqlFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walkSqlFiles(full));
    else if (entry.endsWith(".sql")) out.push(full);
  }
  return out;
}

function stripComments(sql) {
  // Remove -- line comments and /* ... */ block comments.
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/--[^\n]*/g, "");
}

function checkFile(file) {
  const raw = stripComments(readFileSync(file, "utf8"));
  const violations = [];
  let m;
  while ((m = POLICY_REGEX.exec(raw)) !== null) {
    const policyName = m[1].trim();
    const table = m[2].toLowerCase();
    const body = m[3];

    if (!SENSITIVE_TABLES.has(table)) continue;

    const usingExpr = extractParenGroup(body, "USING");
    const checkExpr = extractParenGroup(body, "WITH\\s+CHECK");

    if (isAlwaysTrue(usingExpr)) {
      violations.push({
        file,
        table,
        policyName,
        clause: "USING",
        expr: usingExpr,
      });
    }
    if (isAlwaysTrue(checkExpr)) {
      violations.push({
        file,
        table,
        policyName,
        clause: "WITH CHECK",
        expr: checkExpr,
      });
    }
  }
  return violations;
}

function main() {
  let files;
  try {
    files = walkSqlFiles(MIGRATIONS_DIR);
  } catch (err) {
    console.error(`Cannot read ${MIGRATIONS_DIR}:`, err.message);
    process.exit(2);
  }

  const allViolations = files.flatMap(checkFile);

  if (allViolations.length === 0) {
    console.log(
      `✅ RLS check passed: no always-true policies on ${SENSITIVE_TABLES.size} sensitive tables across ${files.length} migration files.`,
    );
    process.exit(0);
  }

  console.error(`❌ RLS check failed: ${allViolations.length} violation(s) found.\n`);
  for (const v of allViolations) {
    console.error(
      `  • ${v.file}\n    table: ${v.table}\n    policy: "${v.policyName}"\n    clause: ${v.clause} (${v.expr})\n`,
    );
  }
  console.error(
    "Sensitive tables must restrict access by auth.uid(), role, or column predicates — never `USING (true)`.",
  );
  process.exit(1);
}

main();
