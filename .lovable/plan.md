## Voting Hub rebuild — `/vote`

This is a large sprint (8 prompts, ~2 new DB tables, 1 new route, 6+ components, 1 detail sheet, election-authority lookup). I'll ship it in ordered phases so each renders and can be verified before the next lands. Everything uses the existing UWAZI dark theme (#040404 / #9BD34B / AXIS headings) and mobile-first Capacitor layout.

### Route decision
The app already has `/app/vote` (VotingHubPage). I'll wire the new hub at `/vote` as an alias that renders the same page, so existing links keep working and the requested URL matches the prompts. Confirm if you'd rather I move it entirely off `/app`.

### Phase 1 — Data foundation (before any UI)
New tables (with GRANTs + RLS):
- `voter_profiles` — extends `profiles`: `address_complete`, `state`, `city`, `county_name`, `election_authority_key`, `party_preference`, `cd`, `registration_verified_at`. (Some fields already exist on `profiles` — I'll reuse those and add only what's missing.)
- `elections_published` — `state`, `election_date`, `is_published`, `sample_ballot_url`. Seeded with MO + KS for 2026-08-04.
- `ballot_contests` — `state`, `election_date`, `contest_type`, `sort_order`, `measure_title`, `measure_summary`, `plain_summary`, `yes_means`, `no_means`, `supporters_say`, `opponents_say`, `measure_full_text_url`, `source_name`, `source_url`.
- `election_authorities` — `key`, `state`, `county_name`, `display_name`, `covers_note`, `phone`, `website`, `lookup_url`, `poll_hours`.

Seeds: KC Election Board, Jackson County Election Board, Johnson County KS, plus statewide SOS fallbacks. Measure seeds: 4 MO amendments + 1 KS amendment (titles + official language placeholders — I'll flag which fields need editorial review before launch).

### Phase 2 — Hub shell + state machine (Prompt 1)
Single `useVotingHubState()` hook returns `NO_ADDRESS | OUT_OF_AREA | READY | BALLOT_PENDING`. `VotingHubPage` switches on it. Every branch renders real content, never a bare spinner.

### Phase 3 — Header + next-action (Prompt 2)
`ElectionCountdown` (already exists) extended for "Tomorrow" / "Today" / election-day green mode. New `NextActionCard` computes the single action from `{state, today}` via a pure function so it's unit-testable.

### Phase 4 — Registration check (Prompt 3)
`RegistrationCheck` (exists) rewired to use the matched `election_authorities.lookup_url` via Capacitor Browser, with the Yes/Not-sure follow-up writing `registration_verified_at`. Copy hardened: never claims UWAZI checked anything.

### Phase 5 — Ballot measures list + detail sheet (Prompts 4 & 5)
- `BallotMeasuresList` — fetches contests, renders cards, adaptive MO/KS intro, honest empty state.
- `MeasureDetailSheet` — full-screen sheet with the six required blocks. `SupportersOpponents` is a single component that renders both or neither (contract, not convention). Official ballot language rendered in a distinct monospace bordered block on a lighter surface so it can never be confused with UWAZI's plain-language summary.

### Phase 6 — Kansas unaffiliated path (Prompt 6)
`PartyPreferenceCard` for KS users; on "Unaffiliated" shows the green "You can still vote" card linking directly into the amendment sheet. "Not sure" links to registration lookup.

### Phase 7 — Where to vote (Prompt 7)
`WhereToVoteCard` pulls the user's authority row + state-specific voting-options copy. KS poll hours only shown when sourced; otherwise directs to the county with a tap-to-call.

### Phase 8 — Ask Uwazi entry (Prompt 8)
`VoteAskUwaziCard` at the bottom with 4 suggested questions (Amendment 4 shown for MO, generic amendment for KS). Tapping navigates to `/app/ask` with the question pre-sent.

### Guardrails baked in
- Supporters/opponents = single component, both-or-neither.
- Plain-language vs. official ballot language: different surfaces, different type treatment, explicit labels.
- Nonpartisan disclaimer on the "what each side says" block.
- Every empty state has real copy + a next step.

### What I'd like confirmed before I start
1. Keep the hub at `/app/vote` (with `/vote` as an alias), or fully move to `/vote`?
2. For the 4 MO amendments + 1 KS amendment: do you have the plain-language summaries, yes_means/no_means, and supporters/opponents copy ready to paste in, or should I seed with `NULL` placeholders and let the honest "still confirming" empty state show until you fill them via admin?
3. Is there existing editorial content anywhere in the repo I should pull from, or is this all new?

Once you confirm, I'll ship Phase 1 (migration + seeds) and Phase 2 (shell) in the first pass, then work through the remaining phases.