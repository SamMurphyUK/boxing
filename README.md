# Ringside Mobile

Expo (SDK 58, TypeScript, Expo Router) shell for a 2D mobile game that runs on iOS, Android and web from one codebase.

## Run

```bash
npm install
npx expo start --web     # browser preview
npx expo start           # scan the QR code with Expo Go on a phone
```

## Layout

| Path | What lives there |
|---|---|
| `game/` | All game logic (state, economy, simulation) as plain TypeScript. No React, no Expo, no platform imports; ESLint enforces this. |
| `src/store/` | Zustand store that wraps `game/` for the UI. |
| `src/app/` | Expo Router screens. |
| `services/` | Native-only features. Each has `*.native.ts` (real implementation) and `*.web.ts` (no-op stub) so the web preview never breaks, plus a `*.d.ts` that types the shared import. |

Import aliases: `@/` → `src/`, `@game/` → `game/`, `@services/` → `services/`.

## Services

- `haptics` uses `expo-haptics` on native (works in Expo Go).
- `ads` and `iap` are typed placeholders on native. Real ad and billing SDKs need a development build (`npx expo run:ios`, `eas build --profile development`), not Expo Go; wire them in once the network and store products are chosen.

## Checks

```bash
npm run typecheck
npm run lint
npx expo export --platform web
```
