import { Platform } from 'react-native';
import { createAudioPlayer } from 'expo-audio';

let cachedPlayer: ReturnType<typeof createAudioPlayer> | null = null;
let cachedTapPlayer: ReturnType<typeof createAudioPlayer> | null = null;

/** Fire-and-forget success chime. No-ops on web / on any playback failure. */
export function playChallengeCompleteSound() {
  if (Platform.OS === 'web') return;
  try {
    if (!cachedPlayer) {
      cachedPlayer = createAudioPlayer(require('@/assets/sounds/challenge-complete.wav'));
    }
    cachedPlayer.seekTo(0).finally(() => cachedPlayer?.play());
  } catch {
    // Sound is a nice-to-have; never let it break the celebration flow.
  }
}

/** Fire-and-forget short tap click for button presses. No-ops on web / on any playback failure. */
export function playTapSound() {
  if (Platform.OS === 'web') return;
  try {
    if (!cachedTapPlayer) {
      cachedTapPlayer = createAudioPlayer(require('@/assets/sounds/tap.wav'));
    }
    cachedTapPlayer.seekTo(0).finally(() => cachedTapPlayer?.play());
  } catch {
    // Sound is a nice-to-have; never let it break the interaction.
  }
}
