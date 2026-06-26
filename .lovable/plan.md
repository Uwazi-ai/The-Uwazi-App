## Problem

On the final onboarding step (`RegistrationCheckStep`), users tap "Check My Registration" → vote.org opens in the in-app browser → they get stuck and can't return to finish onboarding.

Likely causes (all contribute):

1. **Vote.org blocks iframe embedding** (`X-Frame-Options: DENY`). The `InAppBrowser` `<iframe>` `onError` rarely fires for X-Frame blocks — instead the iframe stays blank and the 10s timeout fires, but during those 10s the user sees a blank black panel and assumes the app is broken.
2. **The "Continue →" button is gated behind a checkbox** the user hasn't seen yet (they're staring at the blank iframe), and there's no path forward without ticking it.
3. **`InAppBrowser` history hack interferes with onboarding.** It calls `window.history.pushState` on open and `window.history.back()` on close. If the browser fires `popstate` for any reason (Android system back, swipe-back gesture), `onClose` runs — but the dummy entry cleanup can also pop the *real* onboarding route, kicking the user off the page or to `/app` before `onboarding_complete=true` is saved, which then bounces them back to `/onboarding` via `ProtectedRoute` and feels like a loop.
4. **No visible "I'll do this later / Skip" affordance** on the registration step, so a user who can't or won't verify right now has zero exit.

## Fix Plan

### 1. Make the registration step always escapable
In `src/components/onboarding/RegistrationCheckStep.tsx`:
- Keep the checkbox + "Continue" primary path, but **also** show a secondary text button "I'll check this later — continue" that calls the same `onContinue`. This guarantees no user is trapped. It still marks `registration_checked_at` server-side so analytics know the step was shown.
- Move the checkbox + Continue **above** the two external link buttons (or make them sticky at the bottom) so users see the exit before tapping out to vote.org.
- Auto-tick the checkbox when the user taps either "Check" or "Register" button (they've taken the action — don't make them come back and tick a box too).

### 2. Harden `InAppBrowser` so it never strands users
In `src/components/InAppBrowser.tsx`:
- **Detect iframe-block faster.** Shorten the "still loading" timeout from 10s → 4s and immediately show the error card with the "Open in Browser" CTA. For known-blocking domains (`vote.org`, `vote.gov`, `usa.gov`, `irs.gov`, `*.gov`), skip the iframe entirely and go straight to the "Open in Browser" card on open.
- **Fix the history-stack side effect.** Remove the `window.history.pushState` / `window.history.back()` dance. Use a plain ESC keydown + backdrop click + explicit close button (already present). The current implementation can pop the parent route on cleanup, which is the most plausible cause of users landing back at `/onboarding` mid-flow.
- Ensure `onClose` runs cleanly when the user taps "Open in Browser" from the error card (already does — keep).

### 3. Don't bounce users mid-save
In `src/components/auth/ProtectedRoute.tsx`:
- The profile lookup re-runs on every `location.pathname` change. While `handleComplete` is saving, a transient navigation can read the old `onboarding_complete=false` and redirect back. Gate the redirect on `!loading && !checking` (already there) but also skip the recheck when already on `/onboarding`, so a quick `navigate("/app")` after save isn't undone by a stale in-flight query.

### 4. Telemetry to confirm
Add a one-line `console.info` (or existing analytics call if present) on:
- `RegistrationCheckStep` mount, "Check" tap, "Register" tap, "Continue" tap, "Skip later" tap.
- `InAppBrowser` open / error / close.

This lets us verify in the next session-replay where users actually drop off.

### Out of scope
- No backend / RLS / schema changes.
- No changes to other onboarding steps, routes, theme, or nav.
- No new packages.

### Files touched
- `src/components/onboarding/RegistrationCheckStep.tsx` — reorder, auto-tick, add skip-later.
- `src/components/InAppBrowser.tsx` — drop history hack, faster timeout, gov-domain shortcut.
- `src/components/auth/ProtectedRoute.tsx` — guard against transient re-redirect during save.
