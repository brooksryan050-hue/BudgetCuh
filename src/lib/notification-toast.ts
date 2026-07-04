import { useSyncExternalStore } from 'react';

/**
 * A tiny global toast queue for simulating what a push notification banner would
 * look like, for platforms/situations where a real OS push can't be tested (web
 * has no push support at all — confirmed via expo-notifications' own web warning).
 * Same useSyncExternalStore pattern as auth-store.ts — deliberately not part of
 * budget-store.ts, since this is ephemeral UI state, not app data.
 */
export interface SimulatedNotification {
  id: number;
  title: string;
  message: string;
  onPress?: () => void;
}

let current: SimulatedNotification | null = null;
let nextId = 1;
const listeners = new Set<() => void>();

function setState(next: SimulatedNotification | null) {
  current = next;
  listeners.forEach((listener) => listener());
}

export function showSimulatedNotification(input: { title: string; message: string; onPress?: () => void }) {
  setState({ id: nextId++, ...input });
}

export function dismissSimulatedNotification() {
  setState(null);
}

export function useSimulatedNotification(): SimulatedNotification | null {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    () => current
  );
}
