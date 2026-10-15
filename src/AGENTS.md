# Frontend rules

- Badge celebrations play from one BadgeWatcher in AppLayout, which diffs user_badges against a per-user seen list; persona badges are skipped there because the Compass pack shows them. Why: one place shows every badge over any screen.
- Home and Watch use videos, edited in Content, with private media; journey steps share a mapper. Why: one reviewed library and consistent next steps.
- Clip autoplay is controlled by user_preferences.autoplay_on_cellular and the visible Wi-Fi preview only. Why: a single clip may use network and battery at a time.
- Supabase realtime channel names must be unique per mount, never derived from the user id alone. Why: a second provider asking for the same name gets back a channel that is already subscribed, and adding listeners to it throws and blanks the page.
- Public ride pages reuse the app's sidebar and bottom bar through one shared shell, and only one profile provider wraps a page. Why: visitors always have a way back into the app, and nested providers collide.
- Rider stage sheets use accessible bottom sheets and code-plus-stage seen flags only; live polling stays in useRiderExperience, while demo fixtures use in-memory actions after my_ride_demo_access validates protected roles. Why: seen flags never authorize travel actions and demo rendering never calls ride functions.
