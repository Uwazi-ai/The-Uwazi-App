# Rides to the Polls, Sprint 0: backend foundation

## What we found

1. **Voting places table:** `public.voter_guide_sites`
   - Columns: id, state, county_fips, election_date, site_type (`polling` or `early`), precinct_key (like `12-3`, KC only), name, address, room, hours, source_name, source_url, verification_status, verified_by, verified_at, created_at, updated_at.
   - Current data: 440 Kansas City polling places (verified) and 6 Clay County early voting sites (verified).
   - **How a place is matched today:** by ward and precinct only. The Voter Guide reads the precinct from the profile, finds its `ward-precinct` key, and pulls the `polling` row with that key. Early sites are matched by state and county_fips. There is no ZIP or address matching, and the table has no ZIP or lat/lon column.
2. **Do not touch:** every existing table (the 120+ in the database, including voter_guide_sites, voter_guide_dates, ballot_*, user_districts, profiles, user_roles, subscriptions), every existing page, and all 33 existing backend functions (ask-uwazi, resolve-address, create-checkout, payments-webhook, auth-email-hook, office-monitor, and the rest). Ask UWAZI, Voting Hub, Compass, auth and payments stay as they are.
3. **Roles:** `public.user_roles` (id, user_id, role, created_at) with the `app_role` enum (super_admin, program_admin, user, reviewer) and the `has_role()` and `is_admin()` checks. Plan: add a new enum value `ride_coordinator` and reuse `user_roles` and `has_role()`. No separate coordinators table is needed. Admins keep full access.
4. **Text messages:** neither Bird nor Twilio is wired. No SMS secret exists, and "Twilio" only appears as a label on the admin Security page. Sprint 0 sends no texts. When we add texts, you'll add the provider key in Project Settings, Secrets.

## Sprint 0 build

**New tables, all with row-level security on:**
- `ride_requests` with the fields you listed. `ride_code` comes from a sequence starting at 1001, shown as `UZ-1001`. Status is limited to requested, booked, riding, completed, cancelled, referred. trip_stage is 0 to 7. `destination_site_id` points to voter_guide_sites. Phone and address are stored only here.
- `ride_events`: request id, event type, from and to status, note, actor, created_at. Append-only: a trigger blocks edits and deletes.
- `ride_settings`: one row with funded_cap 25, seats_per_slot 4, driver_rate 20, ride_line_phone empty, early_start 2026-10-20, early_end 2026-11-02, election_day 2026-11-03.
- `driver_blocks`: day_of_week, start_time, end_time, active. Seeded Mon to Fri 11:00 to 15:00 and 14:00 to 18:00, Sat 08:00 to 12:00, no Sunday.
- `ride_rate_limits`: hashed phone and hashed IP with timestamps, only for limiting.

**Access:** the public and signed-in voters get no direct read or write access. Coordinators and admins can read requests and events and update request status. All event rows are written by a server trigger whenever status changes. The `service_role` grant is kept for the backend function.

**One new backend function, `create-ride-request`:**
- Checks every field: name format, US phone, ZIP, day within early voting or Election Day, pickup time inside a driver block for that weekday, needs from a fixed list, source web or phone.
- Requires booking at least 24 hours ahead in Central time.
- Seats per slot: counts active requests in the same day and block, refuses if full. Also refuses when funded_cap is reached.
- Finds the destination: if a site id is sent it must be a verified site for that day, otherwise it picks a verified early site for early days or a polling site for Election Day by county from the ZIP. If none is found, the request is saved as `referred` with no destination.
- Generates the ride_code, inserts the request and a `requested` event.
- Returns only ride_code and destination name and address.
- Rate limit: 3 requests per phone per day and 10 per IP per hour.

**Never store votes:** no column or field about candidates, measures, party, or how someone votes. The function rejects unknown fields.

**Page shell:** a public `/rides` route with an empty page in #0A0A0A, one Civic Green #9BD34B button style and one Civic Blue #1271AD info panel, added as design tokens. No form yet.

## Questions to confirm

- Is ZIP to county the right way to pick a destination for now, since voting places have no ZIP column?
- Should `quiz_score` stay a number only, with no answers stored?

## Technical details

- One additive migration: new enum value, sequence, 5 tables, grants, RLS, triggers, `is_ride_coordinator()` helper. No changes to existing objects.
- Function deploys with JWT checks off and Zod validation, uses the service role inside.
- Record in supabase/AGENTS.md: ride tables are written only by create-ride-request and coordinator status updates, ride_events is append-only.
