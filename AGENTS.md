# UWAZI rules
- Detailed backend rules live in supabase/AGENTS.md, frontend rules in src/AGENTS.md. Why: keeps this file small.
- Anything that grants trust (office, candidate, boundary, city changes, points, consent, Plus plan, question counts) is written only by reviewed server functions. Why: the client is never trusted.
- Addresses, student IDs, and research answers are never stored raw or shown by name. Why: privacy.

<!-- LOVABLE:BEGIN -->
- AppLayout keeps the content column as the vertical scroll container and avoids overflow-x-hidden on main. Why: main's overflow traps long pages on phones and hides actions.
<!-- LOVABLE:END -->
