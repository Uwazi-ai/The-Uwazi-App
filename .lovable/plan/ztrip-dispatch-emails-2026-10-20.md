# zTrip dispatch emails

## What will change
- Add a separate **zTrip dispatch email** section inside the desk’s existing Email alerts panel. Admins can edit the address and toggles. Dispatch starts **OFF** and stays off throughout this work. Changes start enabled. Ride-home emails start disabled.
- Require confirmation before enabling dispatch: “This emails rider names, phone numbers and pickup addresses to {address}.”
- Add **Send sample to me**. It uses obvious fake details and a SAMPLE subject. The server derives the recipient from the signed-in admin, not browser input.
- Automatically send one new-ride email for a newly saved website or phone request when dispatch is enabled. No existing ride will be backfilled.
- Send cancellation, schedule/address/place-change and optional stage-five emails only for rides previously emailed. Preserve manual Text zTrip and every existing rider/coordinator email behavior.
- Show **zTrip emailed** with the send time in the drawer and Tell zTrip group. Failed sends leave the manual action available.

## Email contents
- Use the existing verified sender, `uwaziapp <noreply@notify.uwaziapp.uwazi.ai>`, and Reply-To `myke@uwazi.ai`. Reply-To is supported.
- Use the requested NEW, WHEELCHAIR, NEEDS VOTING PLACE, CHANGED, CANCELLED and RIDE HOME READY subjects.
- Include only the requested dispatch details for this rider. Other riders appear only as ride codes. Cancellation includes only code, old pickup time and first name with last initial.
- Never include rider email, card link/token, quiz details or other riders’ contact details. Keep sentences short. No em dashes.

## Safety and preservation
- Never send to Teresa or any real zTrip address during building or testing. Live verification uses only `myke@uwazi.ai`, through an isolated admin test path that does not change saved settings or enable production dispatch.
- Preserve UZ-1001 and all existing rides, events, waitlist and limit records. Do not reset the sequence. Avoid creating temporary rides unless essential. Keep events append-only.
- Do not publish or alter live rides, SMS, Autocab, manual texts, rider pages or existing alert-email settings.
- Baseline: **1 ride, 1 event, 0 waitlist entries**. Record preservation fingerprints and compare final counts and protected records.

## Technical approach
- Add the four settings with validated, trimmed, lowercased recipient and existing server-enforced admin editing.
- Register one new React Email template with event-specific content, using the existing managed send helper without changing its behavior.
- Use separate service-only dispatch claims in existing audit records. Enforce one new-ride claim and one claim per server-generated change version, with a separate atomic 30/hour cap. Do not use or clear existing abuse-limit history.
- Use narrowly filtered server-side ride triggers and a dedicated authenticated feature handler for insert/change/stage-five events. Authenticate internal requests with the existing protected job-token pattern. Capture change labels and cancellation’s old time without storing contact data in events. Eligibility and prior-send evidence are checked server-side.
- Keep claims on ambiguous failures to prevent duplicate dispatch. Bound notification waiting to five seconds, catch failures and record only `ztrip_email_failed`; confirmed acceptance records `ztrip_emailed`. The existing sender cannot abort a request already handed to the provider, so five seconds bounds local waiting, not provider execution.
- Document dispatch contact-data disclosure and recipient retention guidance in backend rules and the purge plan. Leave the existing Review disclosure unchanged.

## Verification
- Run unit/mock tests for OFF behavior, admin authorization, safe sample/test recipients, exact dedupe and change-version rules, 30/hour cap, privacy exclusions, suppression and provider failures preserving ride saves.
- Render all six requested email variants and retain their exact subjects and safe fake-data bodies for the report.
- Verify the signed-in sample button end to end only when the admin account is Myke. Confirm accepted-send evidence, while distinguishing provider acceptance from inbox receipt.
- Check the panel and emailed states at 390 and 1280 pixels, including no horizontal overflow. Run earlier ride, email, driver-tracking and Autocab regression tests.
- Confirm final counts, UZ-1001 preservation, append-only enforcement, unchanged sequence/limit records and dispatch **OFF**. Report PASS/FAIL evidence and anything unverified.