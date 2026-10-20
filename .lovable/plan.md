# Coordinator ride email alerts

## Readiness checked
- Ride count before work: **1**. Existing ride: **UZ-1001**. No rides, events or waitlist records have been changed or created.
- Bird's existing test returned **HTTP 502**. It did not accept the email. Configured From: `Bird <onboarding@messagebird.dev>`.
- No separate Resend sending implementation was found. Current app emails use **Lovable Emails**. Its domain is verified. Recent sends to `myke@uwazi.ai` were accepted, including October 19. From: `uwaziapp <noreply@notify.uwaziapp.uwazi.ai>`.
- Inbox arrival is not established by an accepted-send record. Send a new operational test before selecting the sender for ride alerts.

## Confirmation needed
The backend has **no standard rate-limit control**. A strict **30 emails per hour** cap needs a custom limit. Approving this plan confirms that tradeoff. Over-limit notifications will be skipped and recorded without personal data. Bookings will still save. No email queue or scheduled retry job will be added.

Lovable app email sends support one expected recipient per triggering event, not mailing lists. The initial alert recipient will be `myke@uwazi.ai`. Do not implement a loop sending the alert to a recipient list. If multiple-recipient delivery is required, resolve the provider limitation before enabling it.

## Build after confirmation
1. Prove a fresh send to `myke@uwazi.ai`. Stop if a new secret or domain setup is needed. Report the sender and safe provider result. Never report inbox delivery without evidence.
2. Add the four requested admin-only settings and an admin-only **Email alerts** panel on the desk. Include recipient editing, the toggles, and **Send test email**. Enforce the supported recipient limit visibly rather than silently ignoring addresses.
3. Send private alerts after successful website ride requests and qualifying waitlist signups. Cover Needs voting place without duplicating the request alert. Do not alert for phone requests or backfill existing rides.
4. Use the requested subject prefixes, Central dates and times, seat totals, access needs, trip type and public desk link. Default to no contact information. Opt-in contact is first name, last initial and phone only. Never include pickup addresses, card tokens or private links.
5. Keep sending off the booking response path. Catch failures and bound the send attempt to five seconds. Use durable duplicate protection and provider idempotency. Record only a private-data-free `notify_failed` note on failure.

## Verification and preservation
- Send one real test using the signed-in desk panel. Report the response ID and status when provided.
- Track every temporary ride, waitlist row and event created by this task by ID. Exercise the requested Oct 22, 11 AM cases only where the existing service schedule, destination rules and available seats allow. Never bypass those rules or alter Myke's ride.
- Test duplicate protection, default privacy, opt-in contact restrictions, the 30/hour cap, five-second timeout and provider failure. Use an isolated injected failure in tests, not a changed production secret or a public failure switch.
- Verify a real saved ride and correct alert content. If a requested case cannot safely run live, report it as unverified rather than claim a pass.
- Delete only task-created records by ID. Never reset `ride_code_seq`. Report before/after counts and verify UZ-1001 remains untouched, allowing for Myke's concurrent testing.
- Report each requested part as PASS or FAIL with one line of evidence. Do not publish or change Autocab, SMS, manual Text zTrip, rider screens or the live-rides switch.

## Technical details
Use existing feature-specific server handlers and the scaffolded managed-email helper and React Email registry. Do not add email tables, queues, unsubscribe infrastructure or scheduled delivery jobs. Any custom limit and duplicate claim must reuse permitted existing application records, be atomic, service-only and fail closed for sending while leaving booking success intact. If those requirements cannot coexist, stop and state the blocker before deploying alert triggers.