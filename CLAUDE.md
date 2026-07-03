# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

"Wallet" — a personal budgeting/finance app (Expo Router + React Native). Onboarding collects name/currency/income/categories/a savings goal, then a 5-tab app (Home, Budget, Trends, Challenges, Profile) tracks transactions, budgets, savings goals, and a gamification layer (points/levels/badges/challenges).

## Commands

```bash
npm install          # install dependencies
npm start             # expo start — Metro bundler + QR code for Expo Go
npm run android        # expo start --android
npm run ios             # expo start --ios
npm run web              # expo start --web
npm run lint              # expo lint (ESLint via eslint-config-expo)
npx tsc --noEmit           # type-check (no separate `typecheck` script defined)
npx expo install --fix      # realign native package versions after editing package.json by hand
npx expo install <pkg>        # add a dependency at the SDK-compatible version (never `npm install` a raw expo-* package)
```

There is no test runner configured in this project (no Jest, no test script). Verification is `npx tsc --noEmit` + `npm run lint`, plus manual checks — see "Verifying changes" below.

`npm run reset-project` moves `src/` and `scripts/` into an `example/` directory and scaffolds a blank `src/app`. It's a one-way starter-kit reset — do not run it unless the user explicitly asks to blank out the app.

## Expo SDK version is pinned to 54, not latest

`package.json` currently pins `expo: "54"` (react-native 0.81.5, react 19.1.0, expo-router ~6.0.24). This is intentionally *older* than the npm `latest` tag because the Expo Go client on the developer's phone only supports up to SDK 54. **Do not run `npx expo install expo@latest` or otherwise bump the `expo` package version** without confirming the target Expo Go SDK support first — mismatches produce a runtime "Project is incompatible with this version of Expo Go" error with no build-time warning. If you do change the SDK version, always follow it with `npx expo install --fix` and then a clean `rm -rf node_modules package-lock.json && npm install`, since partial upgrades reliably produce npm ERESOLVE peer conflicts. After any SDK change, re-run `npx tsc --noEmit` — cross-package APIs (e.g. `ThemeProvider`/`DarkTheme`/`DefaultTheme` coming from `@react-navigation/native` rather than `expo-router`) differ across SDK majors.

`app.json` has `experiments.reactCompiler: true` — the React Compiler auto-memoizes, so avoid patterns it can't reason about (e.g. mutating props/state directly, stale refs read during render).

## Architecture

### Routing (Expo Router, rooted at `src/app`)

- `src/app/_layout.tsx` — root layout. Wraps everything in `@react-navigation/native`'s `ThemeProvider` (native chrome only, not app content — see Theming below) and waits on `hasHydrated` from the store before mounting the `Stack`, showing a blank `ThemedView` until then.
- `src/app/(tabs)/_layout.tsx` — the 5-tab shell (Home/Budget/Trends/Challenges/Profile). Redirects to `/onboarding` if `hasCompletedOnboarding` is false. Also owns the `useEffect` that (re)schedules the daily local reminder notification whenever reminder settings change.
- `src/app/onboarding/` — a 3-step wizard (`about-you` → `categories` → `goal`) sharing one `OnboardingScaffold` component (`src/components/onboarding/onboarding-scaffold.tsx`) for the header/progress-dots/continue-button chrome; `goal.tsx`'s "Finish setup" calls `completeOnboarding()` on the store, which seeds demo data (see `src/data/seed.ts`) and flips `hasCompletedOnboarding`.
- Modal/stack screens outside the tabs: `transaction-form.tsx` (presented as a modal, shared for both add and edit — `useLocalSearchParams<{ id? }>` determines mode), `savings-goals.tsx`, `transactions.tsx`, `challenge/[id].tsx`.

### State: a hand-rolled persisted store, not Zustand

`src/store/create-persisted-store.ts` implements a minimal Zustand-alike (`set`/`get`/selector hook) on top of `useSyncExternalStore` and `AsyncStorage`. **Real `zustand` is deliberately not used** — `zustand/middleware`'s devtools code contains `import.meta`, which the classic (non-module) web bundle serves as-is and crashes on parse.

`src/store/budget-store.ts` defines the single global store (`useBudgetStore`), holding every app entity (profile, categories, transactions, budgets, challenges, savingsGoals, badges, accounts, weeklySummaries, points, notificationCards). All of `initialEntityState`'s keys are persisted wholesale (`PERSISTED_KEYS`).

**Persisted-state migration gotcha**: on hydration, `AsyncStorage`'s saved JSON is shallow-merged over the initializer's defaults — for array-valued keys (like `badges`), the *persisted* array fully replaces the fresh one. That means adding a new entry to a catalog (e.g. `BADGE_CATALOG` in `src/data/badges.ts`) does **not** retroactively appear for an install that already has persisted data. `createPersistedStore` takes an optional 4th `migrate(state) => state` argument for exactly this; `budget-store.ts` passes one that reconciles `badges` against `BADGE_CATALOG` on every load. Follow this pattern for any future catalog (challenges, categories, etc.) that might grow after users already have data.

Most mutating actions end by calling `get()._runBadgeEvaluation(referenceDate)`, which re-derives current state and checks every badge's unlock condition (`src/lib/badges.ts`).

### Domain logic vs. hooks vs. data catalogs

- `src/lib/*.ts` — pure, framework-agnostic functions (no React, no store access): given plain data in, return a computed result (`computeChallengeProgress`, `computeMoneyHealthScore`, `getBudgetUsages`, `evaluateBadges`, etc.).
- `src/hooks/*.ts` — thin `useMemo` wrappers that pull the relevant slices out of `useBudgetStore` and call into the matching `lib` function. Screens should generally consume a hook, not call `lib` functions directly with raw store reads.
- `src/data/*.ts` — static catalogs (`BADGE_CATALOG`, `CHALLENGE_TEMPLATES`, `DEFAULT_CATEGORIES`, `CURRENCIES`, `LEVEL_CHARACTERS`) plus `seed.ts`, which generates deterministic (seeded PRNG) demo transactions/goals/etc. for a freshly onboarded profile.
- Two similarly-named but distinct notification files: `src/lib/notifications.ts` generates in-app `NotificationCard` data (the "Updates" section on Home — pure function, no side effects), while `src/lib/notifications-native.ts` schedules actual OS-level local push reminders via `expo-notifications` (has side effects, is `Platform.OS === 'web'`-guarded, and only works in a real Expo Go/device session, not the browser).

### Theming

Custom, not React Navigation's theme context. `src/hooks/use-theme.ts` reads `useColorScheme()` directly and looks up colors in `src/constants/theme.ts`'s `Colors.light` / `Colors.dark` maps. `ThemedText` and `ThemedView` consume this hook — use them instead of raw `Text`/`View` for anything that needs to respect color scheme. The React Navigation `ThemeProvider` in `_layout.tsx` only themes native navigation chrome (e.g. screen transition background), not app content.

### Currency formatting

Never call `new Intl.NumberFormat(...)` directly with a user-selected currency code — Hermes throws a `RangeError` for codes its ICU data doesn't recognize, and `CurrencyPicker`'s "Custom" option lets users type an arbitrary 3-letter code that isn't validated against real ISO 4217. Always use `getCurrencyFormatter(code, maximumFractionDigits?)` from `src/lib/currency.ts`, which tries `Intl.NumberFormat` and falls back to manual symbol + number formatting if the engine rejects the code.

### Path aliases & platform-specific files

- `@/*` → `src/*`, `@/assets/*` → `assets/*` (defined in `tsconfig.json`).
- `.web.tsx`/`.web.ts` variants (e.g. `animated-icon.web.tsx`, `use-color-scheme.web.ts`) are picked up automatically by Metro's platform extension resolution — edit the matching platform file, not just the default one, when changing cross-platform behavior.
- `expo-env.d.ts` is generated/managed by the Expo CLI (referenced by `tsconfig.json`); don't hand-edit it beyond the standard triple-slash reference.

## React Native layout gotchas: native (Yoga/Fabric) vs. web

These bugs reproduce **only on a physical device/Expo Go**, not in `npx expo start --web` + Playwright/Chromium, because react-native-web compiles to real CSS flexbox while native uses Yoga — always do a final layout check on-device, not just via headless browser screenshots.

1. **`flexWrap: 'wrap'` + `gap` on the same container is broken on native.** Yoga miscomputes wrap points when `gap` is involved, so an extra item is placed on a line before it (incorrectly) wraps, bleeding it off the container's edge — this happens for both percentage-based and fixed-width children. Fix: never put `gap` on a `flexWrap: 'wrap'` container; give the child items `marginRight`/`marginBottom` instead (the pre-`gap` technique). If the grid has a fixed, known column count (e.g. a 2-column hero row), it's even safer to avoid `flexWrap` entirely and build explicit rows.
2. **`alignItems: 'center'` on an outer `SafeAreaView` wrapper breaks full-width children on native.** It stops the default Yoga `stretch` behavior, so a `<ScrollView>` child sizes to its own content instead of the parent's width; if the ScrollView's own `contentContainerStyle` then centers itself (`alignSelf: 'center'`) for the max-width-on-wide-screens behavior, the result is a narrow, centered column with large empty margins on both sides. Every screen's `safeArea` style should just be `{ flex: 1, width: '100%' }` — centering/max-width belongs on the inner content container, not the outer wrapper.
3. **A custom `fontSize` override without a matching `lineHeight` clips the glyph.** `ThemedText`'s base `type` styles (e.g. `default` = 24) carry a fixed `lineHeight` that survives being merged with a later style override; a much larger `fontSize` (e.g. a 64pt emoji or a 32pt ring score) then renders inside a too-short line box and gets visually clipped top/bottom. Always pair a custom `fontSize` with an explicit `lineHeight`.
4. **An un-bounded sibling can starve a `flex: 1` text column.** In a `flexDirection: 'row'` with a `flex: 1` label/title next to something with no `flexShrink`/`numberOfLines` (e.g. a wide currency amount), Yoga can shrink the flexible sibling down to almost nothing — showing as aggressive truncation or, worse, one character per line. Give every text node in a shared row a `numberOfLines`, and prefer stacking wide content (e.g. title, then a second row with date + amount) over cramming variable-width text into one row.

## Other established patterns

- **`<Switch>` rows need a wrapping `Pressable`.** A bare `<Switch>` inside a row only responds to taps on the tiny switch itself. Wrap the row in a `Pressable` with a manual `onPress` toggle, and set `pointerEvents="none"` on the `Switch` to prevent double-toggling from event bubbling.
- **Sound**: no audio assets are fetched from external URLs — short WAV files are synthesized locally (raw 16-bit PCM written via a one-off Node script) and committed to `assets/sounds/`. Playback goes through `src/lib/sound.ts` (`expo-audio`, cached `AudioPlayer` instances, `Platform.OS === 'web'`-guarded, wrapped in try/catch so a playback failure never breaks the interaction).
- **Haptics** (`expo-haptics`) calls are fire-and-forget (`.catch(() => {})`), not `Platform`-guarded — they safely no-op on web.

## Verifying changes

1. `npx tsc --noEmit` and `npm run lint` — must both be clean.
2. For layout/logic iteration, run `npx expo start --web --port <N>` and drive it with a Playwright script (see the "React Native layout gotchas" section above for what this *won't* catch).
3. For a final check — and mandatory for anything layout-related — run on the physical device via Expo Go: `npx expo start --clear` (fresh cache), then have the device **fully close and reopen** Expo Go (not just an in-app reload) before rescanning, since repeated hot-reloads across many edits can leave stale layout state that looks like a bug but isn't.
