import { Platform } from 'react-native';
import { createAudioPlayer } from 'expo-audio';

let cachedPlayer: ReturnType<typeof createAudioPlayer> | null = null;
let cachedTapPlayer: ReturnType<typeof createAudioPlayer> | null = null;
let cachedTransactionAddedPlayer: ReturnType<typeof createAudioPlayer> | null = null;

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

/**
 * Warm two-note chime for successfully saving a transaction — deliberately distinct
 * from playTapSound's sharp click, which is meant for minor in-screen taps (category
 * select, type toggle, etc.), not the actual save confirmation.
 */
export function playTransactionAddedSound() {
  if (Platform.OS === 'web') return;
  try {
    if (!cachedTransactionAddedPlayer) {
      cachedTransactionAddedPlayer = createAudioPlayer(require('@/assets/sounds/transaction-added.wav'));
    }
    cachedTransactionAddedPlayer.seekTo(0).finally(() => cachedTransactionAddedPlayer?.play());
  } catch {
    // Sound is a nice-to-have; never let it break the save flow.
  }
}
