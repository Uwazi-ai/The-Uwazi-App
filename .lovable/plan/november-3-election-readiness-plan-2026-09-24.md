# November 3 Election Readiness Plan

## What I need from you
1. **Anthropic workspace ID** (or a new workspace-scoped API key) so Ask UWAZI works again.
2. **Official November 3 ballot data**, from Kansas City Election Board, Jackson/Clay/Platte/Cass counties, and Johnson/Wyandotte counties in Kansas. A sample ballot PDF or JSON, like the primary data, works.
3. **Primary results**: who won each August race. A list or links are fine. I can also mark the primary contests as finished without results if you prefer.
4. After loading, **you review and verify** the November contests on the Ballot Review admin screen. Nothing shows to voters until it's verified.

## Phase 1: Get Ask UWAZI working again (today)
- Attach the workspace ID or the new key, then send test questions: simple, complex and ballot-specific.
- Stop long questions from failing. Set a total time budget, cap the rounds of web search, and return a friendly "check with your county board" answer instead of an error.
- Log timeouts separately in the Model Log so you can see them.

## Phase 2: Switch the app from the August primary to the November 3 general
- Add November 3, 2026 general election rows for Missouri and Kansas: registration deadlines (MO Oct 7, KS Oct 13), early and absentee voting windows, and polling hours.
- Replace every hard-coded "August 4" with "the next upcoming election", pulled from the elections list. This covers the Voting Hub, My Ballot, the practice ballot card, the chatbot and the agent tools.
- The general election has one ballot for everyone, so there's no party picker. The primary party-ballot flow stays only for past primaries.
- Update the chatbot's election facts for the general election: deadlines, absentee and photo ID rules, polling hours, and what to do if you're not registered.

## Phase 3: Clean up primary data
- Mark the August contests as past, so they drop out of "upcoming" views but stay in the database for reference.
- If you supply results, mark each candidate as having won or lost the primary, and carry the winners into the November races.

## Phase 4: Load and verify the November ballot
- Load the November contests and measures as unverified. Then you verify them in Ballot Review.
- Show a clear empty state until verification: "Your November ballot is being verified; check back soon."

## Phase 5: Final checks
- Run a fresh security scan and fix what it finds.
- Walk through the whole voter path in the browser: sign up, check registration, view your ballot, fill in a practice ballot, print it, and ask the chatbot.
- Check how the chatbot's daily limits and address lookup hold up under heavy traffic.

## Technical details
- `ask-uwazi`: per-turn timeout of 25s, total budget of about 90s, a `max_uses` limit on search, catching `TimeoutError` and returning a 200 fallback plus a `timeout` log entry.
- A new `useNextElection()` hook querying `elections` where `election_date >= today`, replacing literals in `VotingHubPage`, `useMyBallot`, `MyBallotEntryPage`, `MyBallotCard`, `get-voter-elections`, `mcp` and `get-ballot`.
- In `ask-uwazi`, `get_user_ballot` defaults to the next election. When the election type is general, it skips the party filter.
- `prompt.ts`: ELECTION_FACTS rewritten for the general election.
- A migration inserting the general election rows. Candidate status uses the existing `won_primary` and `lost_primary` values.
