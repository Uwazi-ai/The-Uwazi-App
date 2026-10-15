# UWAZI rules
- Detailed backend rules live in supabase/AGENTS.md, frontend rules in src/AGENTS.md. Why: keeps this file small.
- Anything that grants trust (office, candidate, boundary, city changes, points, consent, Plus plan, question counts) is written only by reviewed server functions. Why: the client is never trusted.
- Addresses, student IDs, and research answers are never stored raw or shown by name. Why: privacy.
- Admin overview keeps summary analytics above URL-selected tool tabs and mounts only the selected tool, with editors reporting unsaved changes to the overview. Why: keeps navigation short, defers secondary requests, and protects drafts.
- Rider live containers and admin demo share display-only components with injected actions. Why: the marketing demo cannot mount live ride requests or mutate rider data.

<!-- LOVABLE:BEGIN -->
- AppLayout keeps the content column as the vertical scroll container and avoids overflow-x-hidden on main. Why: main's overflow traps long pages on phones and hides actions.
<!-- LOVABLE:END -->
