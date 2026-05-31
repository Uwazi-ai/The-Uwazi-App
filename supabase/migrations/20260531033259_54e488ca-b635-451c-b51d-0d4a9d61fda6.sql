-- security_tasks
CREATE TABLE public.security_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phase text NOT NULL,
  title text NOT NULL,
  description text,
  category text,
  status text NOT NULL DEFAULT 'not_started',
  owner text,
  due_date date,
  notes text,
  sort_order int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.security_tasks TO authenticated;
GRANT ALL ON public.security_tasks TO service_role;

ALTER TABLE public.security_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage security_tasks"
  ON public.security_tasks FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER update_security_tasks_updated_at
  BEFORE UPDATE ON public.security_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- security_incidents
CREATE TABLE public.security_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  description text,
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.security_incidents TO authenticated;
GRANT ALL ON public.security_incidents TO service_role;

ALTER TABLE public.security_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage security_incidents"
  ON public.security_incidents FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Seed 25 tasks
INSERT INTO public.security_tasks (phase, category, title, description, sort_order) VALUES
('P0','RLS','Run RLS audit SQL and resolve every Supabase Security Advisor finding','Run this query in Supabase SQL Editor: SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE schemaname = ''public'' AND rowsecurity = false; Then open Advisors → Security Advisor and resolve all findings.',1),
('P0','Secrets','Confirm service_role key is server-only','Grep the repo: no service_role key in NEXT_PUBLIC_ vars or client bundles. Check all Vercel environments.',2),
('P0','Secrets','Rotate any key ever exposed and scope Vercel envs per environment','Production/Preview/Development must use separate keys. Preview should never point to prod DB.',3),
('P0','Twilio','Set Geo Permissions to US-only and add spend alert','Twilio Console → Messaging → Geo Permissions. Disable all countries except US. Add a billing alert.',4),
('P0','Twilio','Verify Twilio webhook signatures on all inbound routes','Use Twilio''s validateRequest() helper with your auth token on every inbound webhook handler.',5),
('P0','Twilio','Confirm STOP/HELP opt-out handling is live','Verify that STOP/UNSUBSCRIBE/HELP keywords are handled automatically on all sending numbers.',6),
('P0','Auth','Harden NextAuth — strong rotated secret, secure cookies, login rate limiting','NEXTAUTH_SECRET = openssl rand -base64 32. Cookies: secure, httpOnly, sameSite=lax. Add rate limiting to login route.',7),
('P0','Infra','Verify CRON_SECRET is enforced on all Vercel cron routes','Every cron handler must reject requests without Authorization: Bearer <CRON_SECRET>.',8),
('P0','Infra','Delete decommissioned n8n webhooks and credentials','Remove all n8n webhook URLs and stored credentials that are no longer in use.',9),
('30','Access','Enable MFA on GitHub, Vercel, Supabase, Twilio, and Google Workspace','Required for every team member with production access.',10),
('30','Access','Remove unneeded production and service_role access','Audit who has prod/service_role. Advisors/marketing should have zero raw DB access.',11),
('30','AppSec','Add security headers and lock down CORS','Add HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy in next.config.js. Restrict CORS to own origins.',12),
('30','AppSec','Add Zod input validation on all API routes','Every API route body and search param validated. No raw user input interpolated into queries.',13),
('30','AppSec','Rate limit SMS, chatbot, and write endpoints via Redis','Sliding-window rate limits keyed by IP + user + endpoint using Upstash Redis.',14),
('30','Supply Chain','Enable Dependabot, CodeQL, and branch protection on both repos','uwazi-mvp and uwazi-election-scraper. Require PR review + status checks on main.',15),
('30','Monitoring','Set up logging with PII/secret redaction plus alerts','Log security events (failed logins, rate-limit trips, webhook failures). Never log phone numbers or response text in plaintext.',16),
('60','Data','Pseudonymize identity vs. sentiment tables','Store phone/name in one table, responses/opinions in another, joined by an opaque UUID — so a single table leak doesn''t expose who thinks what.',17),
('60','Data','Encrypt critical columns with Supabase Vault / pgsodium','Political opinion + identity link columns encrypted at rest.',18),
('60','Data','Define and automate a data retention / auto-deletion policy','Raw survey responses auto-deleted or further anonymized after a defined window.',19),
('60','AI','Add prompt-injection and civic-output integrity guardrails','Treat all user input and scraped Ballotpedia content as untrusted. Constrain model outputs on factual civic claims.',20),
('60','AI','Add scraper input validation and egress sandboxing','Validate shape of scraped data before storing. Fail closed if Ballotpedia structure changes.',21),
('90','Recovery','Run a tested, documented backup restore drill','An untested backup is a hope. Actually restore to a staging environment and document the steps.',22),
('90','Recovery','Run an incident-response tabletop exercise','Walk the team through a simulated breach scenario using the IR runbook.',23),
('90','Governance','Finalize privacy policy, data inventory, and vendor/DPA file','Clear public privacy policy covering collection, retention, opt-out. Data processing inventory for investor diligence.',24),
('90','Governance','Commission an external security review before fundraising','External pen-test or bug-bounty-style review before any major fundraising push.',25);