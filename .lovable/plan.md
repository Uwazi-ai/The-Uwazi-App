# UWAZI Plus tiers, gates, student path, persona archetypes

## What people will see
- **Free**: Compass, persona, card, badges, points, journey, Voting Hub, onboarding. Ask UWAZI 5 typed questions per rolling 12 hours. Watch: 5 newest podcast episodes, explainers always free. Lessons not marked Plus, plus their Your path stage lesson. My City: total budget and the single largest area only. Compass report locked.
- **Plus and Plus Student**: everything unlocked.
- **One Paywall sheet** used by every gate: Plus logo on a dark chip in both themes, a headline that fits the gate, three or four perks, price with the 7 day trial, Start my free week, Are you a student link, See all Plus features link.
- **Compass report CTA** moved directly under the persona reveal with the requested copy and an Upgrade button.
- **Student path** on the Plus page and in the Paywall: school email first, confirmation link grants plus_student at 7.99. Fallback: school name plus student ID, stored only as a one way hash.
- **Archetype line** on Compass results and the identity card back, editable in the persona admin form.

## Gate details
1. Ask UWAZI: server counts only typed questions. Calibration check ins, fact card prompts, and system messages are flagged by the client and ignored by the server. On the 6th: "You have used your 5 questions for now. They reset in [time]. UWAZI Plus is unlimited." with Upgrade.
2. Watch: locked episodes show a lock and a small Plus tag. Tapping opens the Paywall. Admin can mark episodes free or Plus.
3. Lessons: lock icon, tap opens the Paywall. Admin toggle per lesson.
4. My City: soft lock overlay on the rest of the page with Unlock full budget with Plus. Empty state for cities with no budget stays.

## Technical details
- Migration:
  - `profiles.plan` text with values free, plus, plus_student, default free. Protected by the existing privilege escalation trigger so only server code changes it.
  - `public.is_plus(uuid)` security definer: true when plan is plus or plus_student, an active subscription exists, or the user is an admin.
  - `ask_usage` table with user_id, window_start, count, and a `consume_ask_question(typed boolean)` RPC with a rolling 12 hour window that returns remaining and reset_at.
  - `episodes.plus_only` boolean plus a `platform_settings` value `free_episode_limit` set to 5. Explainers stay free.
  - `lessons.plus_only` boolean. The stage track lesson from get_my_path is always allowed.
  - `student_verification` table with user_id, method, school_email, school_name, id_hash, token_hash, status, verified_at. Only the owner can read their own row. Writes happen in edge functions only.
  - `compass_personas.archetype_intro` and `archetype_examples`, seeded with the nine lines you gave.
- Edge functions: `student-verify` sends and confirms the school email link through the existing transactional email system, then sets plan to plus_student. The payments webhook sets plan to plus or back to free as subscriptions change. `check-ask-limit` and `ask-uwazi` switch to the new counter.
- Frontend: `usePlan()` hook that reads is_plus, a shared `Paywall` sheet with an `openPaywall(reason)` helper, and edits to the Ask UWAZI page, Watch feed, Learn page, My City, Compass results, identity card, Plus page, and persona admin.
- Checkout: student checkout uses the 7.99 price and no trial. Standard keeps the 7 day trial.

## Needs a real value from you
- A Stripe student price at 7.99 a month. If it does not exist yet, I will create `student_monthly` in the test environment.
- Derek needs to confirm the privacy approach for the student ID hash fallback.
- The school email rule: .edu plus a short list of K12 domains. Tell me any other domains you want to accept.
- Low income and community tier: note only, no UI. It is planned for the Elimu build.

## Verification
Test accounts for a free user, a Plus user, and a student will cover the 6th question wall and its reset time, 5 playable episodes, the My City lock, the report CTA, and archetype lines on the results and the card. All test data is deleted afterward.
