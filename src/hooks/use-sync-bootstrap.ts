import { useEffect, useRef } from 'react';
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

/**
 * Mounted from (tabs)/_layout.tsx and onboarding/_layout.tsx — the two places a
 * session is guaranteed to exist. Runs one flush-then-pull pass per cold start (flush
 * first so this device's own not-yet-acknowledged edits are reflected in what comes
 * back down), then again on reconnect and on foregrounding.
 */
export function useSyncBootstrap() {
  const session = useAuthStore((s) => s.session);
  const hasRunColdStart = useRef(false);

  useEffect(() => {
    if (!session) return;
    const userId = session.user.id;

    if (!hasRunColdStart.current) {
      hasRunColdStart.current = true;
      runSyncPass(userId).catch(() => {});
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
  }, [session]);
}
