# Admin overview: analytics first, tools on demand

## Goal
Rebuild the admin overview so the important numbers appear first and tools open when clicked, rather than stacking everything into one long page. Use **tabs below analytics**, as selected.

## Confirmed current layout
The overview currently places Journey, Research, Persona copy, Platform health, Unverified actions, and Compass facts before its ten statistic tiles and two growth charts. Recent signups, top civic scores, and ZIP breakdowns appear at the bottom. A separate Analytics page already exists at `/app/admin/analytics`.

## New layout
1. **Compact header** with Admin overview, a refresh control, and an Open full analytics link. Show the actual last successful analytics refresh, not a clock that advances without a data refresh.
2. **Analytics at the top**. Keep the existing overview numbers and growth charts, but reduce their footprint:
   - Lead with Total users, New signups in 7 days, Active today, and Lessons completed.
   - Put the remaining six metrics behind a Show more metrics control.
   - Show User growth and Signups by day side by side when space allows, with readable chart tooltips.
   - Link relevant metrics to existing admin pages, without inventing new reports or changing what the numbers mean.
3. **Tabs directly below analytics**:
   - **People**: Recent signups, top civic scores, and ZIP breakdown. Start with Recent signups, with click-to-open choices for the other two views and a View all users link.
   - **Research**: Click-to-open choices for Civic Journey and Research surveys, retaining the existing consent-aware data and survey link.
   - **Content**: Click-to-open choices for Persona copy and Compass facts. Keep the existing editing and approval actions intact.
   - **Platform**: Click-to-open choices for Platform health and Unverified actions. Keep health indicators and review actions intact.
4. Show **only the selected tool** inside a tab. Avoid rendering every panel in a hidden stack. Remember the chosen tab and tool in the page URL so refresh and browser Back preserve the selection. Warn before leaving an editor with unsaved changes where needed.

## Look and interaction
- Keep UWAZI's dark surfaces, green accents, Axis headings, and existing design controls.
- Use clear labels, icons, selected states, keyboard-accessible tabs, and visible focus indicators.
- Keep sections unframed, reserving cards for individual metrics, charts, and genuinely framed tools.
- Make tab labels and tools fit narrow widths without horizontal page overflow.
- Show loading, empty, and failure states. Never present a failed request as a real zero.
- Avoid entry animations that could hide page content. Respect reduced motion.

## Technical scope
- Frontend presentation changes only. Reuse the existing overview hooks and admin panels.
- Extract small analytics and tab-content components instead of embedding the entire separate Analytics page.
- Fetch secondary tool data when the tool opens. Preserve existing query caching and permissions.
- Point overview links at verified `/app/admin/...` routes, including correcting its current View all users link.
- Use semantic theme tokens for chart colors and UI states.
- Leave database schemas, consent rules, roles, approval workflows, ride functions, SMS, auth, payments, and other admin pages unchanged.

## Verification
- Open the overview with an authorized admin session and confirm analytics appears before all tools.
- Click every tab and tool, check existing data and actions remain accessible, and verify navigation links.
- Test refresh, URL selection, browser Back, keyboard navigation, narrow-screen layout, and editor switching without submitting real changes.
- Check page errors and tests before reporting completion. If a required admin session is unavailable, explicitly identify the checks that remain unverified.