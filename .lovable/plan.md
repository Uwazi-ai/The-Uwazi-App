# Redemption Codes: Onboarding + Admin Builder + BI

## 1. Onboarding — Optional Redemption Code Step

Add a new **step 3 "Have a code?"** to the onboarding wizard (before the Registration Check, which becomes step 4). Total steps: 3 → 4.

- New component `RedemptionCodeStep.tsx`:
  - Input field (auto-uppercase, e.g. `BACKPACK`), "Redeem" button, and a prominent **Skip** link ("I don't have a code").
  - Calls existing `redeem_code(p_code)` RPC.
  - On success: toast confirming access length, then advance to Registration Check.
  - On error: inline message, allow retry or skip.
- Prefill from URL param `?code=BACKPACK` so partner cards / QR links land users pre-filled.
- `BACKPACK` is already seeded — no data changes needed for it to work.

## 2. Super Admin — Coupon / Code Builder

New page `/app/admin/codes` (`AdminCodesPage.tsx`), linked from admin nav. Super-admin only (not program_admin).

**Features:**
- Table of all `redemption_codes`: code, label, grant length, redeemed / max, starts/expires, active toggle.
- **Create Code** modal with pricing strategies:
  - *Time grant*: X days of UWAZI+
  - *Fixed end date*: through YYYY-MM-DD
  - *Redemption cap*: unlimited or N uses
  - *Validity window*: starts_at / expires_at
  - *Active toggle*
- **Bulk generate** (optional v1): generate N random codes with a shared label/prefix (e.g. `PARTNER-XXXX`).
- Edit / deactivate existing codes.
- Copy-to-clipboard for share links: `https://uwazi.ai/onboarding?code=CODE`.

**Backend:** All writes gated by a new `is_super_admin` check via existing `has_role(_, 'super_admin')` in RLS policies on `redemption_codes` (currently locked down — needs admin INSERT/UPDATE policies).

## 3. Business Intelligence — Code Performance

Add a **"Redemption Codes"** section to `AdminIntelligencePage`:
- KPIs: total redemptions (all-time / 7d / 30d), unique redeemers, active codes count.
- Table per-code: redemptions, conversion (redeemed / cap), first & last redemption timestamps.
- Chart: redemptions per day (line, last 30d) grouped by code.
- "Early signup impact": how many redeemers signed up within 24h of redeeming (join `code_redemptions` → `profiles.created_at`).

Backend: new SECURITY DEFINER RPCs `code_redemption_stats()` and `code_redemptions_by_day(period_days)` — admin-gated via `is_admin(auth.uid())`.

## Technical Notes

- Schema: add admin INSERT/UPDATE/DELETE RLS on `redemption_codes`; no new tables needed.
- New RPCs: `code_redemption_stats`, `code_redemptions_by_day`.
- New files: `RedemptionCodeStep.tsx`, `AdminCodesPage.tsx`, `RedemptionCodesSection.tsx` (BI), route in `App.tsx`.
- Onboarding page bumps `TOTAL_STEPS` to 4 and reorders `AnimatePresence` cases.
- No changes to existing `redeem_code` RPC or `subscriptions` table.

## Out of Scope (flag for later)

- Partner-org attribution on redemptions (would need `org_id` column on `redemption_codes`).
- % discount codes tied to Stripe coupons (this system grants free access; Stripe discounts are separate).
- Email delivery of generated codes.
