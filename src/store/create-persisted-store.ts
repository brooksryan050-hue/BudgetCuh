import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Patch<T> = Partial<T> | ((state: T) => Partial<T>);
type SetState<T> = (patch: Patch<T>) => void;
type GetState<T> = () => T;

/**
 * Minimal zustand-alike: create() + persist(), built on useSyncExternalStore.
 * zustand/middleware ships devtools code containing `import.meta`, which Metro
 * serves as-is in the classic (non-module) web bundle and crashes parsing —
 * this avoids that dependency entirely while keeping the same selector-hook API.
 */
export function createPersistedStore<T extends { hasHydrated: boolean }>(
  storageKey: string,
  initializer: (set: SetState<T>, get: GetState<T>) => T,
  persistedKeys: (keyof T)[],
  migrate?: (state: T) => T
) {
  let state: T;
  const listeners = new Set<() => void>();
  let saveTimeout: ReturnType<typeof setTimeout> | null = null;

  const set: SetState<T> = (patch) => {
    const next = typeof patch === 'function' ? (patch as (s: T) => Partial<T>)(state) : patch;
    state = { ...state, ...next };
    listeners.forEach((listener) => listener());
    schedulePersist();
  };

  const get: GetState<T> = () => state;

  function schedulePersist() {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      const payload: Partial<T> = {};
      for (const key of persistedKeys) payload[key] = state[key];
      AsyncStorage.setItem(storageKey, JSON.stringify(payload)).catch(() => {});
    }, 150);
  }

  state = initializer(set, get);

  AsyncStorage.getItem(storageKey)
    .then((raw) => {
      if (raw) {
        state = { ...state, ...JSON.parse(raw) };
      }
    })
    .catch(() => {})
    .finally(() => {
      state = migrate ? migrate(state) : state;
      state = { ...state, hasHydrated: true };
      listeners.forEach((listener) => listener());
    });

  function useStore<U>(selector: (state: T) => U): U {
    return useSyncExternalStore(
      (onChange) => {
        listeners.add(onChange);
        return () => listeners.delete(onChange);
      },
      () => selector(state)
    );
  }

  useStore.getState = get;
  useStore.setState = set;

  return useStore;
}
