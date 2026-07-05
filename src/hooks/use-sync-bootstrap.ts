import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

import { flushOutboxGuarded, pullRemoteChanges } from '@/lib/sync-engine';
import { mergeRemoteSnapshot } from '@/lib/sync-merge';
import { useAuthStore } from '@/store/auth-store';
import { useBudgetStore } from '@/store/budget-store';

async function runSyncPass(userId: string) {
  const flushed = await flushOutboxGuarded(useBudgetStore.getState().syncOutbox);
  if (flushed !== null) {
    useBudgetStore.setState({ syncOutbox: flushed });
  }

  const remote = await pullRemoteChanges(userId);
  const state = useBudgetStore.getState();
  const patch = mergeRemoteSnapshot(
    {
      profile: state.profile,
      hasCompletedOnboarding: state.hasCompletedOnboarding,
      transactions: state.transactions,
      budgets: state.budgets,
      accounts: state.accounts,
      challenges: state.challenges,
      savingsGoals: state.savingsGoals,
      badges: state.badges,
      weeklySummaries: state.weeklySummaries,
      points: state.points,
    },
    remote
  );
  state.applyRemoteSnapshot(patch);
}

/** Manually re-runs a sync pass (flush outbox + pull remote changes), e.g. for pull-to-refresh. No-ops when signed out. */
export async function refreshSync() {
  const session = useAuthStore.getState().session;
  if (!session) return;
  await runSyncPass(session.user.id);
}

/**
 * Mounted from (tabs)/_layout.tsx and onboarding/_layout.tsx — the two places a
 * session is guaranteed to exist. Runs one flush-then-pull pass per cold start (flush
 * first so this device's own not-yet-acknowledged edits are reflected in what comes
 * back down), then again on reconnect and on foregrounding.
 *
 * Returns `initialSyncComplete`, which (tabs)/_layout.tsx uses to hold off deciding
 * "this account needs onboarding" until the cold-start pull has had a chance to run —
 * a fresh/reinstalled local store defaults `hasCompletedOnboarding` to false even for
 * an account that already finished onboarding elsewhere (e.g. right after a password
 * reset), and mergeRemoteSnapshot is what corrects that flag once the real profile
 * comes down. When `enabled` is false (onboarding's own usage), there's nothing to
 * wait for, so this reports already-complete.
 */
export function useSyncBootstrap(enabled: boolean = true): { initialSyncComplete: boolean } {
  const session = useAuthStore((s) => s.session);
  const hasRunColdStart = useRef(false);
  const [initialSyncComplete, setInitialSyncComplete] = useState(!enabled);

  useEffect(() => {
    if (!enabled || !session) return;
    const userId = session.user.id;

    if (!hasRunColdStart.current) {
      hasRunColdStart.current = true;
      runSyncPass(userId)
        .catch(() => {})
        .finally(() => setInitialSyncComplete(true));
    }

    const netInfoUnsubscribe = NetInfo.addEventListener((netState) => {
      if (netState.isConnected) {
        runSyncPass(userId).catch(() => {});
      }
    });

    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        runSyncPass(userId).catch(() => {});
      }
    });

    return () => {
      netInfoUnsubscribe();
      appStateSubscription.remove();
    };
  }, [session, enabled]);

  return { initialSyncComplete };
}
