# Rider screens and marketing demo

## Scope
Design the booked ride card, tracker, and stage sheets. Reuse the existing ride flow and approved quiz. Add an isolated admin demo for later captures.

No implementation or captures until you approve. Do not publish or enable `VITE_POLL_RIDES_LIVE`. Keep eligibility, destinations, schedule, seat limits, budget, prices, and reviewed quiz copy unchanged. Do not send test texts, create demo riders, or change real rides.

## Visual direction and accessibility
- Mobile first. Use ride-scoped semantic tokens for dark `#0A0A0A`, Civic Green `#9BD34B`, and Civic Blue `#1271AD`. Use Axis for headings and the existing body font. Leave other app pages unchanged.
- Keep the ride time and current stage prominent. Use green for confirmation and blue for supporting information. Short sentences. No em dashes.
- Every app pop-up uses a bottom sheet. Reuse the existing Radix Sheet primitives, with a rider-specific wrapper for focus trapping, focus restoration, Escape, a visible 48px close button, and 48px action targets.
- Give sheets accessible titles and descriptions. Announce stage changes and action results through a polite `aria-live` region. Keep errors visible. Do not announce countdown changes every second.
- Fit sheets within the available screen height. Allow internal scrolling, safe-area spacing, and large text. Disable sheet motion and moving illustrations when reduced motion is preferred. Content is visible immediately.

## Screens and sheets
| Item | Proposed experience |
| --- | --- |
| **A. Booking confirmed** | On the first ride-card visit for an actually booked ride at stage 0, show a green check and **“You're booked.”** Show pickup day, time, and the verified voting place. If the destination is pending, say so. Add **“We'll text you when your driver is on the way.”** Actions: **Add to my calendar**, **Share free rides with a neighbor**, **Done**. Do not show this for a request still awaiting booking. |
| **B. Waiting card** | Before pickup day, show **“Tomorrow at 11 AM”** or **“In 3 days”**, with the full pickup date and time below. Calculate calendar days in America/Chicago. On pickup day show **“Today at 11 AM”**. After the pickup time, show the scheduled time and current status, never an invented ETA. Include photo ID and a call link for changes or cancellation. |
| **C. Driver on the way, stage 1** | **“Your driver is on the way.”** Show **“Your zTrip driver”** until verified provider details are available. No guessed name, car, plate, or arrival time. Action: **Call the ride line**. |
| **D. Driver here, stage 2** | Large **“Your driver is here.”** Action: **“I'm in the car”**. Show saving and retry states. Advance only after the server accepts the existing action. |
| **E. In the car, stage 3** | **“You have a few minutes. Want to learn your rights?”** Actions: **Start the quiz**, **Not now**. Start closes the sheet and focuses the quiz. The quiz remains on the tracker either way. |
| **F. Quiz finished** | Show the score and **“You're ready.”** Action: **Text me my rights card**. Keep the rights card readable on the tracker. Show save and text failures honestly. The sheet celebrates quiz completion, not a vote or a passing threshold. |
| **G. At the voting place, stage 4** | **“You made it. Go vote.”** Checklist: bring photo ID; ask for a provisional ballot if there is a problem; stay in line if it is 7 PM. The 7 PM item appears on Election Day only, not during early voting. Use approved rights copy. Round trip action: **“I'm done voting. Send my ride home.”** One way action: **Trip complete**, backed by a new narrow server-checked completion action. |
| **H. Return trip, stages 5 and 6** | Stage 5: **“Your ride home is on the way.”** and **“Wait near the door.”** Stage 6: **“You're riding home.”** Keep the ride line available. Remove the current wording that assumes the rider voted. Provide a matching once-only bottom sheet for each stage. |
| **I. Trip complete, stage 7** | **“Thanks for riding.”** Show a shareable card: **“I rode to the polls with UWAZI”**. Ask **“How was your ride?”** with 1 to 5 accessible stars and an explicit save action. Add **Share the ride line**. Never claim the person voted or name a candidate. Keep rating and sharing available on the completed tracker after closing the sheet. |

### Sharing and texts
- Neighbor sharing contains only the public `/rides` link and general copy. Never share the private ride link, token, pickup details, rider name, or ride code.
- Open a bottom sheet with share, copy-link, and download options as applicable. Use native sharing after a user tap when supported. The phone's own share interface is controlled by the operating system.
- The completion image contains only the approved message, UWAZI branding, and public ride line. Provide a PNG download fallback.
- Rights texts require a deliberate tap, the existing ride code plus token validation, SMS consent, and opt-out checks. Reuse Bird safeguards. Use approved rights content and a secure tracker link, never quiz answers. Add duplicate-send protection and a retry state. Sender readiness remains a launch prerequisite.
- Verify the existing driver-on-the-way text trigger before wiring A's promise. If it is absent, add one transition-triggered, consent-checked send with duplicate protection. Never display “Text sent” without a successful send.

## Stage detection and once-only behavior
The card currently polls every 30 seconds. The tracker polls every 20 seconds. Retain these token-protected reads, add refresh on returning to the tab, and reload after successful rider actions. No public realtime subscription to ride rows.

- A shared stage helper derives the current stage from the returned status and `trip_stage`. Completed means stage 7. Cancelled, referred, and unbooked requests never trigger celebratory sheets.
- Store only seen flags under keys such as `uwazi:ride-sheet:UZ-1001:stage-2`. Use separate keys for `booking-confirmed` and `quiz-finished`. No token, personal data, or quiz answers in localStorage.
- Mark a sheet seen when it opens. Closing, reloading, polling, or moving between the card and tracker will not reopen it on that browser. A different browser may show it once again.
- On arrival at a later stage, show only that stage, not a queue of missed stages. If the stage changes during an open sheet, retire the stale sheet and display the current one. Quiz completion may open its sheet while the quiz is in use. A newer travel stage takes priority.
- If storage is unavailable, use an in-memory fallback. Do not let a storage error block the ride. Never use these flags to authorize actions or advance stages.

## Data and server changes
- Verify the live schema before migrating. Propose `ride_requests.ride_rating smallint NULL`, constrained to 1 through 5. No rating comment, name, or additional respondent identity.
- Add `rider-rate-ride`: validate the existing code and token, require a completed ride, accept an integer 1 to 5 only, and save it server side. Repeat saves replace that ride's numeric rating without duplicate report entries. No direct public table write.
- Extend `get-ride-card` to return the saved numeric rating and provider for the authorized ride. Do not expose the existing coordinator-only driver note or pickup address. Provider labels must not misidentify a non-zTrip ride.
- Do not add a zTrip integration in this sprint. Keep the generic driver label. Future provider-supplied details must use a reviewed server-only source before being shown.
- Extend `rider-update-stage` with one-way completion only for a one-way ride currently at stage 4. Retain conditional updates and status-change logging. Round-trip riders retain the existing 2 to 3 and 4 to 5 actions. Other stage changes stay coordinator/provider controlled.
- Add a token-protected `rider-text-rights-card` function and a rights-card SMS kind in the shared sender. Use ride events for duplicate-send protection if sufficient; verify this before choosing any extra technical delivery field.
- Add rating count, average, and 1 to 5 distribution to the existing WIP report and summary CSV. Include numeric `ride_rating` in its existing ride rows. No names, phones, pickup addresses, or quiz answers. Leave budget calculations unchanged.
- Keep current RLS protections. Any new RPC has explicit grants and server-side permission checks. No new public table is proposed.

## Admin demo isolation
Add **`/rides/demo/:stage`** with fixture views for `confirmed`, `waiting`, `1`, `2`, `3`, `quiz`, `quiz-finished`, `4`, `5`, `6`, and `7`. Support round-trip and one-way variants, and sheet-open versus sheet-closed captures.

- Fixture: Jordan, `UZ-DEMO`, Garrison Community Center, Tue Oct 27 at 11 AM. No home address, personal phone, card token, or real rider record. Use a fixed demo clock for consistent countdowns.
- Separate live containers from shared display components. The demo imports only display components and static fixtures. It never mounts live ride pages, ride polling hooks, live quiz loaders, or SMS handlers.
- Before rendering, require sign-in and a server-validated admin permission check against protected roles. Do not rely on the current profile-based display guard, localStorage, or `shot=1` for authorization. This read-only auth check is the only backend call the demo needs; it is not a ride function and writes no rows.
- All demo actions update in-memory state only. Quiz questions are a static copy of approved content. Rating, stage changes, and text buttons simulate results. External call links are inert in demo mode. Sharing offers a local preview/download, not a real send.
- Show **DEMO** to admins normally. `?shot=1` hides only that marker and capture controls after authorization. It does not weaken access checks. Demo views bypass real ride seen-flags and do not write them.
- Block denied access before loading the demo. Add a network assertion that fails any demo test if a ride function, ride table, or SMS request is made.

## Files and components
**Existing files to touch**
- `src/App.tsx`: isolated demo route.
- `src/pages/RideCardPage.tsx`: live container, confirmation sheet, waiting state.
- `src/pages/RideTrackPage.tsx`: live container, stage sheets, shared quiz, completed state.
- `src/components/rides/RidesUI.tsx`: reuse shell and formatting; integrate existing Button variants for rider controls.
- `src/components/ui/sheet.tsx`: only backward-compatible support needed for rider sheet close targets and reduced-motion overlay behavior.
- `src/index.css`: scoped rider color tokens and motion rules.
- `src/lib/rideCard.ts`: shared response typing as needed.
- `src/pages/RideDeskPage.tsx` and `src/components/rides/desk/deskLib.ts`: rating report and CSV.
- `supabase/functions/get-ride-card/index.ts`, `rider-update-stage/index.ts`, `_shared/ride-sms.ts`: narrow additions described above.
- `AGENTS.md`, `src/AGENTS.md`, `supabase/AGENTS.md`: shared display isolation, token-gated rating/text actions, and demo safety rules.

**New focused files**
- `src/components/rides/rider/`: `RideCardView`, `RideTrackerView`, `RideStageSheet`, `RideRightsQuiz`, `RideShareSheet`, `RideCompletionCard`, `RideRating`.
- `src/hooks/useRideStageSheets.ts`: polling-result stage detection and seen flags.
- `src/lib/rideExperience.ts`: types, stage copy, Chicago countdowns, extracted calendar helper.
- `src/pages/RideDemoPage.tsx` and `src/components/rides/demo/fixtures.ts`: admin-only fixture adapter.
- New migration for `ride_rating` and a read-only server admin guard if an appropriate protected-role RPC cannot be reused.
- New `rider-rate-ride` and `rider-text-rights-card` functions, plus focused tests for sheets, actions, sharing privacy, and demo network isolation. Refresh generated types through the supported generation flow, never by hand.

## Three small design touches
1. A steady three-stop journey ribbon: pickup, voting place, home. One-way rides omit home. It reflects the actual stage, not GPS or a predicted route.
2. A brief green check transition when booking or an action succeeds. Reduced motion shows a static check. No confetti or pressure to vote a particular way.
3. A quiet photo-ID reminder paired with a persistent ride-line action. Practical reassurance stays available even after a sheet is dismissed.

## Verification and later captures
- Test every stage, round-trip and one-way flows, pending destination, cancellation, missed stages, repeated polling, reloads, expired links, offline errors, text opt-outs, and rating validation.
- Check focus trap, Escape, close button, focus return, live announcements, 48px targets, large text, reduced motion, and phone widths including 393px. Check a desktop layout too.
- Prove free visitors and non-admin members cannot render the demo. Prove `shot=1` cannot bypass that check. Prove every demo button makes zero ride requests and creates zero rows.
- After the screens are approved, capture both base screens and open sheets at 430×932, scale 3, as 1290×2796 PNGs. Wait for fonts and images. Use fixture-only screenshot mode. Include both stage-4 trip variants and the quiz. Save numbered captures and a contact sheet for review. No real rider data or account cleanup is needed because the demo creates none.

**Approval requested:** implement this rider experience and isolated demo first. Marketing captures follow visual approval. Nothing is published or switched on.