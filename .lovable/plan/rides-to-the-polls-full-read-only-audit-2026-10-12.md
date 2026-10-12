# Rides to the Polls: full read-only audit

No code, schema, or setting changes. No publish. Test rides are created only where listed, then deleted, with ride codes reset to UZ-1001. Every check is reported as PASS, FAIL, or NOT SET, with one line of evidence each.

## 1. Secrets (names only)
- List the project's secrets. Report BIRD_API_KEY, BIRD_SENDER, and any AUTOCAB or ZTRIP key as present or NOT SET.

## 2. Config data (read queries)
- ride_settings: ride line phone, funded cap, seats per slot, driver rate, early start, election day.
- driver_blocks: all rows.
- voter_guide_sites: count of verified early-voting rows by county.
- The 7 KCMO sites, joined to ride_site_hours and ride_site_geo. Flag any site missing hours or a point.
- rights_questions: count by state and approved count.
- user_roles: count with the ride_coordinator role.
- cron.job: the ride reminder job, its schedule, and whether system_job_token exists. Values are never shown.

## 3. Edge functions
For each function, confirm it is deployed and responds: create-ride-request, create-phone-ride, get-ride-availability, get-ride-card, rider-update-stage, rider-finish-quiz, send-ride-text, send-ride-reminders, bird-email-test, lookup-precinct.
- Public functions: send one bad input (expect a clean 400 or "Ride not found") and one safe good input.
- Coordinator-only functions: an unsigned call must be refused with 401 or 403.
- bird-email-test is never called with a valid session, because it would send a real email.

## 4. End to end
- Create one web ride: Tue Oct 20, 11:00, 414 E 12th St, 64106, to Garrison.
- Call get-ride-card with the correct token, with no token, and with a wrong token.
- Send a refused stage move to rider-update-stage, for example 0 to 3.
- Read that ride's ride_events rows to confirm what was logged, including any texted_failed rows.
- Clean up afterward (see Cleanup below).

## 5. Rules
- get-ride-availability: Oct 24, Oct 25, and Nov 1 are closed. Nov 2 shows KCEB only.
- 24-hour rule: a slot less than 24 hours away is too_soon and gets refused.
- Seat limit: create 5 requests for the same hour. Requests 1 to 4 pass and the 5th is refused.
- Funded cap: read the create-ride-request code to confirm the referred path. Settings stay unchanged.

## 6. Preview routes (Playwright at phone and desktop width)
- /rides, /rides/card/:code?t=, /rides/track/:code?t=, /rides/desk (signed in as a coordinator or admin), and /app/ask.
- Take a screenshot of each and capture its console errors.

## 7. Security
- Run the security linter and scan. List findings that touch ride_ tables, rights_questions, ride_sms_optouts, or the ride functions.
- With the anon key, select from ride_requests, ride_events, ride_site_hours, ride_site_geo, and ride_sms_optouts. Each must return no rows or be denied.
- Also check the leftover config.toml entry for bird-email-test.

## 8. Build
- Read the build-errors log and run a typecheck. This is read-only and produces no output files.

## 9. Publish state
- Compare the live site with the preview. List the ride changes that are not live yet, such as Missouri-only rides and the pickup confirmation step.

## 10. Oct 20 risks
- Bird sender approval, the fake waitlist entry (816) 555-0199, VITE_POLL_RIDES_LIVE, coordinator count, missing hours or points, the reminder cron window, and Derek's legal review of the rights questions.

## Cleanup
- Delete every test ride and its ride_events rows.
- Reset the ride code sequence to UZ-1001.
- Confirm zero test rows remain.

## Output
- One table of all checks, then a final list of everything that FAILED or is NOT SET.
