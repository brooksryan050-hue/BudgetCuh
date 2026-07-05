import * as Linking from 'expo-linking';

import { supabase } from '@/lib/supabase';
import { setPasswordRecoveryPending } from '@/store/auth-store';

/**
 * The password-recovery email link (see sendPasswordResetEmail in auth.ts) points
 * back at this app with the tokens in the URL fragment/query, e.g.
 * budgetcuh:///reset-password#access_token=...&refresh_token=...&type=recovery. The
 * supabase client has detectSessionInUrl: false (that option only parses
 * window.location, meaningless for a native deep link), so the tokens have to be
 * pulled out and turned into a session by hand here.
 */
function extractAuthParams(url: string): URLSearchParams | null {
  const hashIndex = url.indexOf('#');
  const queryIndex = url.indexOf('?');
  const paramsString = hashIndex >= 0 ? url.slice(hashIndex + 1) : queryIndex >= 0 ? url.slice(queryIndex + 1) : '';
  if (!paramsString) return null;
  return new URLSearchParams(paramsString);
}

async function handleAuthDeepLink(url: string): Promise<void> {
  const params = extractAuthParams(url);
  if (!params) return;

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (!accessToken || !refreshToken) return;

  // Set the flag BEFORE setSession, not after — setSession synchronously fires
  // auth-store's onAuthStateChange listener as part of resolving, which flips
  // `session` truthy immediately. If passwordRecovery were still false at that
  // instant, (auth)/_layout.tsx's redirect gate would fire and bounce the user into
  // the app before this function's own await ever got a chance to set it.
  const isRecovery = params.get('type') === 'recovery';
  if (isRecovery) setPasswordRecoveryPending(true);

  const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  if (error && isRecovery) setPasswordRecoveryPending(false);
}

/** Call once at app startup (see _layout.tsx). Handles both a cold start from the
 * recovery link and the app already being open when it's tapped. */
export function subscribeToAuthDeepLinks(): () => void {
  Linking.getInitialURL().then((url) => {
    if (url) handleAuthDeepLink(url);
  });
  const subscription = Linking.addEventListener('url', ({ url }) => {
    handleAuthDeepLink(url);
  });
  return () => subscription.remove();
}
