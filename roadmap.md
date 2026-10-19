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
- [ ] Add isolated event/result storage, active-event lookup, existing persona evaluation and completion logging.
- [ ] Add session-only demo logic, minimal working routes and public take-home persona pages. Visual redesign waits for Part 2.
- [ ] Add super-admin event controls, QR links and aggregate counts. Seed expo-oct-19 with the requested expiry.
- [ ] Verify one signed-out completion, retries/reset, event expiry, normal paywall and ride regressions. Remove test results only.
