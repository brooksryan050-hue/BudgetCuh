import { Colors } from '@/constants/theme';

// The app is dark-mode only by design — it no longer follows the system light/dark setting.
export function useTheme() {
  return Colors.dark;
}
