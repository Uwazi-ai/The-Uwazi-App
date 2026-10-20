# UWAZI rules
- Rider emails use fixed feature templates with service-only durable event claims and keyed hashes in existing abuse-control records; no queues or recipient loops. Why: optional private delivery cannot grant broad sending or disrupt ride intake.
- Coordinator ride emails use a service-only atomic claim in existing ride audit records and the managed template sender, with no queue or recipient loop. Why: private operational alerts cannot block rides or dispatch duplicate emails.
- Detailed backend rules live in supabase/AGENTS.md, frontend rules in src/AGENTS.md. Why: keeps this file small.
- Compass offline support uses generated Workbox caching for demo/persona navigations and public built assets only, with one production-only registration wrapper and no API caching. Why: expo Wi-Fi failures must not cache private app data or intercept editor previews.
- Anything that grants trust (office, candidate, boundary, city changes, points, consent, Plus plan, question counts) is written only by reviewed server functions. Why: the client is never trusted.
- Addresses, student IDs, and research answers are never stored raw or shown by name. Why: privacy.
- Admin overview keeps summary analytics above URL-selected tool tabs and mounts only the selected tool, with editors reporting unsaved changes to the overview. Why: keeps navigation short, defers secondary requests, and protects drafts.
- Rider live containers and the public demo share display-only components with injected actions; demo imports no ride client or live hooks. Why: one visual source of truth cannot let marketing actions mutate rider data.

<!-- LOVABLE:BEGIN -->
- AppLayout keeps the content column as the vertical scroll container and avoids overflow-x-hidden on main. Why: main's overflow traps long pages on phones and hides actions.
<!-- LOVABLE:END -->

- Ride texting is gated by admin-only ride_settings.sms_live; shared senders fail closed before claims, delivery logs or provider requests. Why: paused messaging must not promise or attempt delivery.
- Rider rights PNGs use the same DOM-to-PNG renderer as completion sharing and contain only reviewed takeaways. Why: saved cards never expose rider data.
- Legal ride copy must never claim that a rider voted or voted with UWAZI; use "I rode to the polls with UWAZI". Why: travel does not establish a voting outcome.
- The public Election Day map combines official KCEB precinct geometry with reviewed polling rows via election-day-map; address checks reuse get-ride-availability without creating rides or saving profiles, and map tiles receive no pickup coordinates. Why: trip planning must never guess destinations or reveal riders.
- Autocab request construction lives in a pure functions/_shared module with coordinator-only edge handlers and additive desk controls; no rider container imports the integration. Why: one tested builder and an isolated dispatch boundary protect manual and rider flows.
