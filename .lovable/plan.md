## Phase 1: Design System Foundation
- Add Bebas Neue + Inter fonts
- Update CSS tokens: backgrounds (#0A0A0A, #161616, #111111), text (#FFFFFF, #9CA3AF), borders (#2A2A2A), accent (#9bd34b)
- Update border radius (8px cards, 6px pills)
- Create reusable components: HeroSection, StatCard, EyebrowLabel, NumberedBadge

## Phase 2: Sidebar + Layout Overhaul
- Redesign DesktopSidebar: 230px fixed, new active style (15% opacity + 2px left border), user avatar at bottom, admin section
- Add top bar with search, bell icon, user avatar
- Update MobileNav to match

## Phase 3: Dashboard (/dashboard → /)
- Hero with greeting, stats grid (2x4), Civic Loop panel, Civic Location card, Ask Uwazi banner

## Phase 4: Learn Page Overhaul
- Hero + filter pills + 3-col lesson cards grid
- Individual lesson page (/learn/:slug) with quiz UI, progress bar, completion modal

## Phase 5: Ask Uwazi Page Overhaul
- New chat UI with location pill, styled message bubbles, new chat button
- (Already uses Lovable AI gateway — keep that, NOT Anthropic)

## Phase 6: Voting Hub + Legislation + Progress + Settings Pages
- Voting Plan builder, Ballot simulator, Local races
- Legislation tracker with search/filters/save
- Progress page with score ring, badges grid, XP chart
- Settings/Profile page

## Phase 7: Onboarding Flow Refresh
- 2-step flow with new styling

**Note:** The request mentions Anthropic/Claude — the project already uses Lovable AI (Gemini) which is the correct approach. We'll keep that.

**Note:** All Supabase tables already exist with RLS. No DB changes needed.

Shall I proceed phase by phase, starting with the design system + sidebar + dashboard?