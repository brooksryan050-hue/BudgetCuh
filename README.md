# Wallet

A personal budgeting and savings app built with Expo Router and React Native. Track income and expenses, set category budgets, work toward savings goals, and stay motivated with a lightweight gamification layer — levels, badges, and weekly challenges.

## Features

- **Onboarding** that captures your name, currency, monthly income, spending categories, and a first savings goal, then seeds realistic demo data to start from.
- **Accounts** with an editable balance (no bank connection required), swipeable when you have more than one.
- **Transactions** — add income or expenses with category, payment method, notes, and optional recurrence; "Save & add another" lets you log several in a row without leaving the form.
- **Budgets** per category with progress bars and over/near-limit warnings.
- **Trends** — spending-by-category breakdown and weekly/monthly bar charts.
- **Savings goals** with deadlines, suggested weekly contribution amounts, and progress tracking.
- **Challenges** (18 templates covering saving, no-spend streaks, and budget check-ins) and **badges** (16) that unlock as you build habits.
- **Levels & points**, with a fun emoji "character" that evolves as you level up.
- **Money health score**, a simple household-finance health indicator combining spending, saving, and budget adherence.
- **In-app insights and update cards**, plus an optional daily local reminder notification.
- Light/dark theme, ~40 built-in currencies (with support for a custom code), and haptic + sound feedback on key interactions.

## Tech stack

- [Expo](https://expo.dev) (SDK 54) + [Expo Router](https://docs.expo.dev/router/introduction/) for file-based navigation
- React Native 0.81 on the New Architecture, React 19
- TypeScript (strict mode)
- A small hand-rolled persisted store (`useSyncExternalStore` + `AsyncStorage`) rather than a state-management library
- `react-native-reanimated` / `react-native-svg` for charts and celebratory animations
- `expo-audio`, `expo-haptics`, and `expo-notifications` for feedback and reminders

## Getting started

```bash
npm install
npx expo start
```

This prints a QR code — scan it with [Expo Go](https://expo.dev/go) on your phone, or press `w` for web, `i` for the iOS simulator, or `a` for an Android emulator.

> **Note:** the `expo` package is intentionally pinned to SDK 54 rather than the latest release, to stay compatible with a specific Expo Go client version. See `CLAUDE.md` before bumping it.

## Scripts

| Command | Description |
| --- | --- |
| `npm start` | Start the Metro bundler (Expo Go / dev client) |
| `npm run ios` / `npm run android` / `npm run web` | Start targeting a specific platform |
| `npm run lint` | Run ESLint |
| `npx tsc --noEmit` | Type-check the project |

There's no test runner configured yet.

## Project structure

```
src/
  app/           # Expo Router routes (file-based)
  components/    # UI components, grouped by feature area
  store/         # Persisted global store
  lib/           # Pure domain logic (budgets, challenges, badges, currency, ...)
  hooks/         # React hooks that read the store and call into lib/
  data/          # Static catalogs (categories, badges, challenge templates, currencies) + demo data seeding
  constants/     # Theme tokens (colors, spacing, radius)
```

See `CLAUDE.md` for a deeper architectural walkthrough, including a few React Native native-vs-web layout gotchas worth knowing before touching styles.

## License

MIT — see [LICENSE](LICENSE).
