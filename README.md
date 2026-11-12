# Ringside: The Promoter

A Reigns-style boxing promoter game. Swipe through decisions, keep four meters (cash, hype, stable, rep) away from 0 and 100, pick fights, make the corner calls. Expo SDK 58, TypeScript, Expo Router; runs on iOS, Android and web from one codebase.

## Run

```bash
npm install
npx expo start --web     # browser preview
npx expo start           # scan the QR code with Expo Go on a phone
```

On web, the left and right arrow keys also swipe the card.

## Layout

| Path | What lives there |
|---|---|
| `game/` | All game logic as plain TypeScript, with no React, Expo or platform imports (ESLint enforces this): career, cards, flags and chained cards, fighters, rankings, opponent generation, the round-by-round fight sim, corner calls, endings, scoring and save serialisation. Every function is pure and driven by a seeded RNG (`game/rng.ts`), so a seed always replays the same career. |
| `game/content/` | Cards (140), characters (16), fighters (8), divisions, headlines, fight commentary and endings. Generated once from the web prototype by `scripts/extract-promoter.cjs`; edit these files directly from now on. |
| `game/__tests__/` | Vitest tests for the game layer. |
| `src/store/promoter-store.ts` | Zustand store wrapping `game/`; persists the career through the storage service. |
| `src/app/` | Expo Router screens: title, setup, game (swipe), fight, ending. |
| `src/components/` | Swipe card (gesture-handler + reanimated), meters, ticker, avatar, buttons. |
| `src/game-content/portraits.ts` | Character id to portrait image. Drop a JPEG in `assets/portraits/` and add a line here; characters without one get an initials circle. |
| `services/` | Platform-specific features. Native-only ones have `*.native.ts` (real) and `*.web.ts` (no-op) plus a `*.d.ts` for the shared type. |

Import aliases: `@/` → `src/`, `@game/` → `game/`, `@services/` → `services/`.

## Services

- `haptics`: `expo-haptics` on native (swipe, knockdowns, wins, titles); no-op on web.
- `share`: React Native `Share` on native; `navigator.share` with a clipboard fallback on web.
- `ads`: rewarded "second chance" on the ending screen. The native file is a placeholder that always grants the reward so the flow works in Expo Go; the web stub reports `available: false`, which hides the button. A real ad SDK needs a development build.
- `iap`: typed placeholder; not used by the game yet.
- `storage`: AsyncStorage (works on all three platforms, so no split).

## Checks

```bash
npm run typecheck
npm run lint
npm test
npx expo export --platform web
npx expo-doctor
```
