# Frontend rules

- Badge celebrations play from one BadgeWatcher in AppLayout, which diffs user_badges against a per-user seen list; persona badges are skipped there because the Compass pack shows them. Why: one place shows every badge over any screen.
- Home and Watch use videos, edited in Content, with private media; journey steps share a mapper. Why: one reviewed library and consistent next steps.
- Clip autoplay is controlled by user_preferences.autoplay_on_cellular and the visible Wi-Fi preview only. Why: a single clip may use network and battery at a time.
