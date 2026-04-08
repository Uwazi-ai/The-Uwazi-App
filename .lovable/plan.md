## Premium Design Upgrade Plan

### Phase 1: Design Tokens & Global Styles
- Update `index.css` with new CSS custom properties (bg layers, borders, text colors, radii, shadows)
- Update `tailwind.config.ts` to map new tokens
- Update scrollbar, body, and base styles

### Phase 2: Component Updates
- **Sidebar** (`DesktopSidebar.tsx`): Glass morphism, refined nav items, 192px width
- **TopBar** (`TopBar.tsx`): Frosted glass, refined search bar
- **MobileNav**: Refined bottom nav with glow effects
- **Cards** (`card.tsx`): Glass morphism with top highlight pseudo-element
- **Buttons** (`button.tsx`): Premium feel with scale transitions

### Phase 3: Page-Level Polish
- **AppLayout**: Add framer-motion page transitions with AnimatePresence
- **HomePage**: Staggered animations on stats grid, refined hero
- **AskUwaziPage**: Background gradient pulse, refined welcome screen

### What stays the same:
- #9bd34b accent color
- Axis font for headlines
- Dark theme foundation
- All business logic and data flows
