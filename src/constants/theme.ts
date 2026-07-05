/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

/**
 * The app's one brand palette — every brand/accent color in Colors below, the Home
 * hero gradient, and CategoryIcon's monochrome tint all derive from this single scale.
 * Don't introduce colors outside it for anything decorative; true data-viz needs
 * distinct hues (Trends' donut/bar charts) are the one intentional exception.
 */
export const Palette = {
  50: '#effaf2',
  100: '#d8f3df',
  200: '#b3e7c3',
  300: '#82d3a0',
  400: '#4eb979',
  500: '#2c9d5d',
  600: '#1d7e49',
  700: '#17653c',
  800: '#155032',
  900: '#12422a',
  950: '#061910',
} as const;

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
    success: '#1FAA59',
    successBackground: '#E4F7EC',
    warning: '#F5A623',
    warningBackground: '#FDF1DC',
    danger: '#E5484D',
    dangerBackground: '#FCE6E7',
    brand: Palette[600],
    brandSecondary: Palette[400],
    border: '#E4E4E9',
    overlay: 'rgba(0,0,0,0.4)',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
    success: '#34C97A',
    successBackground: '#123322',
    warning: '#F7B84B',
    warningBackground: '#3A2A0F',
    danger: '#FF6B6E',
    dangerBackground: '#3A1518',
    brand: Palette[400],
    brandSecondary: Palette[300],
    border: '#2E3135',
    overlay: 'rgba(0,0,0,0.6)',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 999,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

/**
 * Home's gradient hero — these stops aren't part of Colors.dark above since they're
 * a gradient, not a flat color. Bright palette green at top fading through the deep
 * shades to near-black at the bottom, ending on Colors.dark.background exactly so the
 * handoff to the solid dark block below it has no visible seam.
 */
export const HomeHeroGradient = [Palette[400], Palette[700], Palette[950], Colors.dark.background] as const;
