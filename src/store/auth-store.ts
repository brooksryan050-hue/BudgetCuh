import { useSyncExternalStore } from 'react';
import type { Session } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

/**
 * Lightweight external store mirroring supabase.auth's session state, using the same
 * useSyncExternalStore technique as create-persisted-store.ts. No AsyncStorage
 * persistence of its own — the supabase client's own storage adapter already persists
 * the session, so this is purely a reactive in-memory mirror of it.
 */
interface AuthState {
  session: Session | null;
  authInitializing: boolean;
}

let state: AuthState = { session: null, authInitializing: true };
const listeners = new Set<() => void>();

function setState(patch: Partial<AuthState>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

supabase.auth.getSession().then(({ data }) => {
  setState({ session: data.session, authInitializing: false });
});

supabase.auth.onAuthStateChange((_event, session) => {
  setState({ session, authInitializing: false });
});

function useAuthStore<U>(selector: (state: AuthState) => U): U {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    () => selector(state)
  );
}

useAuthStore.getState = () => state;

export { useAuthStore };
