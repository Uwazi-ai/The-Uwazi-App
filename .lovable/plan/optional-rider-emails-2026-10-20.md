# Optional rider emails

## Scope and preservation
- Add rider email without publishing or changing live rides, SMS, Autocab, manual Text zTrip or the existing zTrip disclosure.
- Baseline: **1 ride, 1 event, 0 waitlist rows**. Preserve UZ-1001 and every existing row. Track new test rows by ID and never reset the ride-code sequence.
- Use the verified existing sender: `uwaziapp <noreply@notify.uwaziapp.uwazi.ai>`.

## What to build
1. Add optional Email under the mobile number in real and demo Review screens and the phone-request form. Use the exact requested helper copy and coordinator note. Validate, trim and lowercase, with a 254-character maximum. Show stored email only in the coordinator ride drawer.
2. Send one private confirmation after a website or phone request saves with an email. Use the ride card's actual status, Central pickup time, verified place/address, photo ID reminder, private card button, ride line and nonpartisan notice. Never include pickup address or phone.
3. Add Email me my rights card beside Save my rights card in quiz completion and tracker. Use a stored email when present; otherwise collect a one-time address without saving it. Send the saved score and only approved question takeaways, using the app's legal disclaimer. Demo actions remain local and send nothing.
4. Use durable server-only claims, at most two rights emails per ride, and privacy-safe failure/suppression notes. Email failures cannot prevent booking or quiz completion.
5. Document optional email, dispatch/export exclusions and inclusion in the data purge plan. Add focused tests and run earlier ride/Autocab regressions.

## Decisions and limitations
- **Custom sending cap needs approval.** The backend has no standard rate-limit control. Implementing the requested **3 rider emails per hashed address per rolling 24 hours** requires a custom atomic server check. Claims remain consumed on ambiguous delivery failures to avoid duplicate sends. Approving this plan approves that tradeoff.
- **The requested live tests exceed that cap.** Two confirmations, one reminder and two rights emails total five to `myke@uwazi.ai`. Do not bypass the cap or clear its history. Verify at most three actual sends in the window; verify the remaining content, duplicate behavior and blocked sends with isolated tests. Any remaining live sends must wait for a later 24-hour window.
- **Daily reminder delivery is blocked by the managed sender's restrictions.** It does not permit adding a scheduled recipient loop that sends the same template to many riders. Prepare the reminder template and single-ride, admin-authorized verification action, but do not wire a prohibited batch sender into the existing daily job. Existing SMS reminders and cron settings remain unchanged. Full scheduled email reminders need a supported per-ride delayed delivery mechanism; do not promise that they are active.
- The provider records accepted/sent outcomes, not inbox receipt. Report those separately.

## Technical details
- Add nullable `ride_requests.email` with validation at form and function boundaries. Keep email out of event notes, exports, text formatters and Autocab payloads.
- Reuse the managed template registry and feature-specific server handlers. Authenticate rights requests with ride code plus token; accept a one-off recipient only for that ride's fixed rights template.
- Enforce event deduplication and the hashed-address cap atomically with service-only access. No email queue, suppression table or recipient loop.
- Reuse reviewed rights content and the existing token-safe private card URL. Never log email, token, phone, pickup address or secrets.
- Keep notification work asynchronous and isolate errors from booking and quiz writes.

## Verification and cleanup
- Exercise web and signed-in phone intake with two tracked fake rides if capacity permits. Test rights sending, no-email input, reminder deduplication and rate-limit denial within the cap.
- Render subject and body text and assert absence of pickup/contact data. Check CSV, Today's calls, Text zTrip and Autocab boundaries with concrete privacy tests.
- Simulate provider failures in isolated tests without changing global settings. Report any live failure flow not verified.
- Check real/demo screens at phone and desktop sizes, then run focused and earlier regression tests.
- Delete only this task's tracked rows. Keep events append-only; if an exact-ID cleanup exception is required, restore strict enforcement immediately and confirm it.
- Report PASS/FAIL evidence, exact subjects, unavailable checks, final ride/event/waitlist counts and UZ-1001's unchanged fingerprint.