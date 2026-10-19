# Frontend rules
- Compass demos and public persona routes mount outside AuthProvider, use an anonymous REST client and sessionStorage-only state; live and demo scoring share compassScoring while demo assignment calls existing persona_label through a persistence-free RPC. Why: expo devices must never create users, unlock normal routes or record individual answers.

- Badge celebrations play from one BadgeWatcher in AppLayout, which diffs user_badges against a per-user seen list; persona badges are skipped there because the Compass pack shows them. Why: one place shows every badge over any screen.
- Home and Watch use videos, edited in Content, with private media; journey steps share a mapper. Why: one reviewed library and consistent next steps.
- Clip autoplay is controlled by user_preferences.autoplay_on_cellular and the visible Wi-Fi preview only. Why: a single clip may use network and battery at a time.
- Supabase realtime channel names must be unique per mount, never derived from the user id alone. Why: a second provider asking for the same name gets back a channel that is already subscribed, and adding listeners to it throws and blanks the page.
- Public ride pages reuse the app's sidebar and bottom bar through one shared shell, and only one profile provider wraps a page. Why: visitors always have a way back into the app, and nested providers collide.
- Rider stage sheets use accessible phone sheets and centered larger-screen dialogs with code-plus-stage seen flags only; live polling stays in useRiderExperience and public demo fixtures use injected in-memory actions without live hooks. Why: seen flags never authorize travel and public demos never call ride functions.
