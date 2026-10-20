## Desk navigation and manual rider reminders
- [x] Added shared desk-route app navigation and phone safe-area spacing. Sheets end above bottom tabs; drawer bottom Close action is unobscured. Rider/demo screens unchanged.
- [x] Added coordinator-only one-ride reminder function and shared tomorrow-call/drawer button. Today/tomorrow Central and requested/booked guards run before claims; existing reminder claims, data-free sent notes and 3/24-hour address limit reused.
- [x] 83 mock/unit regressions passed. Signed-in 390/1280 screenshots verify desk/rights navigation, ready/sent/limit states, phone sheet and drawer actions, no root horizontal overflow. New function deployed without invoking it. Rides 1→1, events 1→1, waitlist 0→0; original ride/event/waitlist/settings/limit hashes and sequence unchanged. Strict append-only function never relaxed. No publish or live sends.

## Rider emails
- [x] Added optional validated email to real/demo Review and phone intake, visible only in the drawer; helpers do not promise the unavailable daily reminder.
- [x] Added confirmation, single-ride admin reminder test, approved rights-card templates/actions and service-only durable claims.
- [ ] Daily scheduled email reminder blocked: managed sender prohibits batch recipient loops and lacks supported per-ride delayed delivery. Existing cron/SMS unchanged.
- [x] Approved custom hashed-address 3/24-hour tradeoff. Two live confirmations and one reminder consumed cap; duplicate reminder refused, rights request returned address_limit.
- [x] Two real confirmations and one reminder sent; duplicate reminder blocked. 58 regression tests and rendered template privacy test passed. Provider failure/suppression and no-save one-off address verified in isolated tests. Phone form, desktop/mobile Review and rights controls checked. No live rights send possible within cap.
- [x] Deleted only UZ-1005/UZ-1006 by recorded IDs with exact-ID event exception, then restored strict function and enabled append-only trigger. Rides 1→1, events 1→1, waitlist 0→0. UZ-1001 original-field fingerprint unchanged, email null. Sequence untouched; abuse-limit hashes retained. No publishing or protected switch changes.

## Coordinator email alerts
- [x] Verified Lovable Emails fresh send and signed-in panel test to myke@uwazi.ai; From uwaziapp <noreply@notify.uwaziapp.uwazi.ai>. Bird rejected its test. Provider logs report sent, not confirmed inbox arrival.
- [x] User approved the custom 30/hour limit tradeoff and one-recipient managed sender limitation.
- [x] Added admin-only settings/panel, website/waitlist alerts, needs-place transition trigger, service-only atomic claims, privacy-safe template and bounded five-second notification wait.
- [x] Three real temporary website rides (UZ-1002, UZ-1003, UZ-1004) and one no-driver waitlist produced four sent events. Deleted only their recorded IDs and own audit records. Counts 1→1 rides, 1→1 events, 0→0 waitlist. Original UZ-1001 fingerprint unchanged. Sequence never reset. No publishing.
- [x] Isolated provider-failure, privacy, phone exclusion, dedupe and five-second tests pass. Needs-place template tested in isolation because Oct 22 early rides always resolve an open verified place. No production provider-failure switch added. Rate cap is atomic but not live-volume tested.
- [x] Real React Email render privacy test passed using explicit function config. Hosted test runner cannot resolve the pinned email dependencies; direct Deno test passed. SDK requests cannot be aborted, so five seconds bounds local notification waiting, not provider execution. Three task-created intake rate-limit records are retained to preserve abuse-control history.

## Autocab live launch
- [ ] Enable autocab_live through the admin desk. Blocked: no selected customer, expected account 37765 absent from verified accounts, and verification older than 10 minutes.
- [x] Request publishing latest Autocab panel and ride cards at https://uwaziapp.uwazi.ai after tightening public persona and media rules. Fresh scan reports zero critical findings; 24 tests and public persona/signed-in desk checks passed. Deployment completion remains unverified.
- [ ] Send one identified real ride and verify booking status and tracking on the desk. Blocked: correct zTrip account unavailable and no ride confirmed as a real passenger request.

## Home and Plus
- [x] Add Content-managed UWAZI Plus logos for dark and light surfaces with safe fallback across every Plus gate.
- [x] Build one private video library, super admin Content manager, Watch catalog, and Home playback.
- [ ] Verify playback and personalization on a separate non admin account. Admin upload, signed in player, dismissal, and removal were checked. Browser video decoding was not confirmed.
- [x] Rebuild Home with journey, local tiles, video playback, and admin video controls.
- [x] Rebuild Plus with existing prices and seven-day trial checkout.
- [x] Verify Home, missing-data hiding, welcome and clip playback, Progress step, and Plus copy in a signed-in browser with mocked video responses. No test account or persistent video data was created.
- [ ] Set a student and low-income eligibility policy, review turnaround, and fulfillment process. Requests currently queue for manual review only.
- [ ] Complete a Stripe sandbox checkout to verify the seven-day trial in Stripe.

# November 3 Readiness

## My City visual redesign
- [x] Build and verify phone and desktop bento layout, motion, selection, and empty states without changing budget flows.

## Progress and loading UI
- [x] Restore phone scrolling on Progress and use the UWAZI pinwheel while it loads.
- [x] Show the UWAZI loading state on slow pages instead of blank or mismatched loading screens.

- [x] Chatbot time limit + friendly fallback
- [ ] Chatbot working — BLOCKED: Anthropic rejects the saved workspace ID
- [x] November 3 election dates added (MO + KS)
- [x] Voting Hub, My Ballot, chatbot facts, agent tools switched to Nov 3
- [ ] Load November ballot — BLOCKED: need official ballot data
- [ ] Mark primary winners/losers — BLOCKED: need results (or OK to just archive)
- [ ] Rework My Ballot party picker for single general ballot (after ballot data loads)
- [ ] Fresh security scan + full voter walkthrough (after above)

## Voter walkthrough (Sep 24)
- [x] Sign-up, onboarding, registration check, chatbot November answer work
- [x] New sign-ups get county, districts, and election office (free Census lookup)
- [x] Chatbot reads voter's state correctly for ballot lookups; tables display in chat
- [ ] BACKPACK code closed Aug 31 — waiting on owner: extend or new code?
- [ ] My Ballot still asks for a party (primary-style) — rework once Nov ballot loads
- [ ] Nov 3 ballot data not loaded — waiting on official ballot data
- [ ] Fill in county/districts for existing accounts — waiting on owner OK

## Hardening pass 2
- [x] Why am I seeing this, Your data page, identity fit, unverified actions, /fair page
- [x] Hardening pass 3: nightly backups, RESTORE.md, health check with alerts, Platform health card
- [ ] Plus tiers: free user and student browser checks on a real free test account (blocked: needs a free test login)
- [ ] Student ID fallback privacy approach (blocked: Derek to confirm)
- [ ] Low income and community free tier (later, Elimu school partnership build, no UI now)
- [ ] Bird STOP webhook: needs BIRD_WEBHOOK_SECRET from user + URL set in Bird
- [x] Know Your Voting Rights pass 1: tables, seeds, hooks (no UI)

## Know Your Voting Rights (Home)
- [x] Pass 1: tables, seed data, hooks in src/hooks/useVotingRights.ts
- [x] Pass 2: Home section UI (countdown, rights cards, checklist) + checklist copy fix
- [ ] Pass 3: poll ride teaser slot

## Rides to the Polls
- [x] Rebuild the 13 shared ride screens and public demo, responsive header, sheets, takeover and sharing.
- [x] Capture all 13 screens at phone, tablet and web sizes in a ZIP.
- [x] Verify one real test booking without texts, delete test ride, history and rate-limit data and reset UZ-1001.
- [x] Build booked rider screens, accessible once-only stage sheets, quiz completion, private rating and rights-card text actions.
- [x] Build server-authorized, fixture-only marketing demo and verify no ride requests or persistent demo data.
- [x] Verify phone/desktop demo states, focus trap, Escape, 48px targets, sharing download, numeric rating and consent safeguards. 14 focused tests pass. No ride rows or texts created; next code remains UZ-1001.
- [x] Capture the redesigned rider demo at 390x844, 834x1194 and 1440x900. Real request saved and read back through its token-authorized card. No texts sent.
- [ ] User to add BIRD_API_KEY + BIRD_SENDER in Project Settings → Secrets, then send one real test text to their number
- [x] Bird webhook secret saved (as STRIPE_WEBHOOK_SECRET); bird-inbound now reads it
- [ ] User to point Bird inbound messages to the bird-inbound webhook URL in the Bird dashboard
- [x] Waitlist tab on desk, driver field, Text the waitlist button

## Admin overview
- [x] Put compact analytics first with an actual refresh timestamp and optional extra metrics.
- [x] Add URL-persistent People, Research, Content, and Platform tabs with tools opened on demand and unsaved-edit protection.
- [x] Verify the overview and all nine tool selections with an authorized admin session, keyboard navigation, reload and Back, narrow layout, and 11 passing focused tests.

## Ride texting pause sprint
- [x] Gate all ride senders and public copy with admin-only sms_live.
- [x] Save rights takeaways as PNG, audit legal copy, and set demo distance to 0.9 mi.
- [x] Verify phone booking and demo screens 4, 5, 6, 10, 12, clean test data and reset codes.

## Election Day ride map
- [x] Add public official precinct map, reviewed polling-place lookup, directions and links from rides and Voter Guide.
- [x] Verify address lookup, missing destinations, and phone/desktop map controls without creating rides or enabling bookings.

## Compass expo demo Part 1
- [x] Add isolated event/result storage, active-event lookup, existing persona evaluation and completion logging.
- [x] Add session-only demo logic, minimal working routes and public take-home persona pages. Visual redesign waits for Part 2.
- [x] Add super-admin event controls, QR links and aggregate counts. Seed expo-oct-19 with the requested expiry.
- [x] Verify one signed-out completion, retries/reset, event expiry, no auth requests, ride screen/authorized desk regressions, and unchanged normal records. Remove QA results and event.
- [ ] Verify normal Compass paywall as a signed-in free user. Blocked: no authorized free-user browser session; its paywall and entitlements were not changed.

## Compass expo demo Part 2
- [x] Build portrait kiosk welcome, question screens, persona reveal and public persona page using existing brand visuals.
- [x] Add persona QR, accessible idle countdown and full Next student reset with no prior-run history.
- [x] Verify two consecutive students, idle reset, reduced motion and privacy at 390px and 834px portrait sizes. No auth calls, persistent test completions or ride changes.

## Compass kiosk offline fallback
- [x] Bundle public quiz/persona content and demo-only persona rules with event expiry checks.
- [x] Add guarded production offline caching for demo/persona screens without caching private requests.
- [x] Verify Wi-Fi-loss quiz completion, public persona fallback/reload, clean student resets and preview worker safety. Published full-offline cold reload awaits a deployed release; publishing is prohibited in this sprint.

## Sprint 2B Autocab
- [x] Add protected settings, held-by-default booking, quotes, cancellation and desk-only bounded status polling.
- [x] Add admin connection panel and coordinator trip controls without changing manual texts or rider screens.
- [x] Run 21 focused tests and a mocked browser quote, held group booking, status and cancellation flow. Verify authorized desktop/phone desk and zero saved test rows.
- [ ] Verify provider response shapes and one held booking/cancellation. Blocked: AUTOCAB_KEY and account/capability selections; the public API definition requires portal sign-in.
