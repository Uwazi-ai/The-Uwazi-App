# Sprout's Garden

An original 2D hero game for Kaleb (ages 2–5), built with Phaser 3 + TypeScript and mounted in the
web app at `/sprout` through `src/components/sprout/SproutGame.tsx`.

- `src/systems` — pure logic (mastery + spaced repetition, adaptive difficulty, rewards, save/merge),
  plus the WebAudio synth, voice (recorded clips → Web Speech fallback), motion and particles.
- `src/scenes` — one Phaser Scene per game; `LevelScene` holds the shared mission bar, progress,
  hints and the hand-off to `CelebrationScene`.
- `src/data` — JSON level files. Add words or levels without touching code.
- `src/actors` — layered, procedurally drawn characters (Super Sprout, dinos, race car, word icons).
  No image assets, no third-party characters.

Run on a phone: `npm run sprout:dev` and open the LAN URL (saves stay local in this harness).
Tests: `npx vitest run games/sprout`.

Fonts in `public/fonts/sprout` are Lilita One and Nunito (SIL Open Font License).
