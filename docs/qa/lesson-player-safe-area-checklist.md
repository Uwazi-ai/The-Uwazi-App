# Lesson Player Safe-Area QA Checklist

Quick device test to verify the **Lesson Player overlay** (`src/components/learn/LessonPlayer.tsx`) never clips on notched iPhones / Dynamic Island devices in **portrait and landscape**.

## Devices to test

Test on physical hardware when possible, otherwise Xcode Simulator or Chrome DevTools device mode.

- [ ] iPhone SE (no notch — baseline regression)
- [ ] iPhone 13 / 14 (notch)
- [ ] iPhone 14 Pro / 15 / 15 Pro (Dynamic Island)
- [ ] iPhone 15 Pro Max / 16 Pro Max (largest Dynamic Island)
- [ ] iPad (rounded corners, home indicator only)

## Orientations

For every device above, run the checklist in **both**:
- [ ] Portrait
- [ ] Landscape left (notch on left)
- [ ] Landscape right (notch on right)

## Per-screen checks

Open a lesson via `/app/learn` → tap any lesson card to launch the player.

### 1. Header / progress bar
- [ ] Progress bar fully visible — not hidden behind status bar, notch, or Dynamic Island
- [ ] Progress bar has visible breathing room below the status bar (no touching)
- [ ] "Close" (X) button fully tappable, not clipped at top-right
- [ ] Close button does not sit under the Dynamic Island in landscape
- [ ] Lesson title (if shown) is fully readable

### 2. Lesson content body
- [ ] Text/media never slides under the notch on landscape rotation
- [ ] Left/right padding respects `env(safe-area-inset-left/right)` in landscape
- [ ] Scrollable content can scroll all the way without last line being hidden by home indicator

### 3. Continue / quiz buttons
- [ ] Primary "Continue" button fully visible above the home indicator
- [ ] Button remains centered and tappable in landscape
- [ ] Quiz answer buttons not clipped at bottom

### 4. Completion screen
- [ ] Confetti / success state fully centered, not pushed under notch
- [ ] "Done" / dismiss button fully visible and tappable in both orientations
- [ ] Badge artwork not clipped on left/right in landscape

### 5. Rotation behavior
- [ ] Rotate from portrait → landscape mid-lesson: layout reflows, nothing clips
- [ ] Rotate back: progress bar and close button restore correctly
- [ ] No horizontal scroll appears at any point (`overflow-x-hidden` holds)

## How to test in browser quickly

Chrome DevTools → Device toolbar → choose **iPhone 14 Pro** → toggle orientation. Confirm `env(safe-area-inset-*)` is being applied (inspect the root overlay element and verify computed `padding-top` > `0.75rem` in simulated notch mode via the iOS Simulator).

## Pass criteria

Every checkbox above ticks on **every listed device × every orientation**. If any item fails, file against `LessonPlayer.tsx` and re-verify safe-area `env()` usage on the failing element.
