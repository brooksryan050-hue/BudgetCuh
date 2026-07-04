import { supabase } from '@/lib/supabase';

const ERROR_MESSAGES: Record<string, string> = {
  'Invalid login credentials': 'Incorrect email or password.',
  'User already registered': 'An account with this email already exists.',
};

function normalizeAuthError(message: string): string {
  return ERROR_MESSAGES[message] ?? message;
}

export async function signUpWithEmail(email: string, password: string): Promise<string | null> {
  const { error } = await supabase.auth.signUp({ email, password });
  return error ? normalizeAuthError(error.message) : null;
}

export async function signInWithEmail(email: string, password: string): Promise<string | null> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error ? normalizeAuthError(error.message) : null;
}

export async function signOutUser(): Promise<void> {
  await supabase.auth.signOut();
}

/**
 * Sends a recovery-link email. Deliberately does NOT pass a `redirectTo` here —
 * verified against this project that Supabase silently ignores a per-request
 * redirectTo override and always falls back to the project's configured Site URL
 * (Authentication > URL Configuration > Site URL), regardless of whether the value
 * matches the Redirect URLs allow-list. So Site URL itself has to be kept pointed at
 * wherever /reset-password should open — the Expo Go dev URL (exp://<lan-ip>:<port>/
 * --/reset-password) while testing, or the built app's own scheme (app:///reset-
 * password) once it's an installed standalone app. See auth-deep-link.ts for how
 * that link is caught and turned into a session. Always resolves without an error
 * for an unrecognized email (Supabase's own behavior) so this can't be used to probe
 * which emails have accounts.
 */
export async function sendPasswordResetEmail(email: string): Promise<string | null> {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  return error ? normalizeAuthError(error.message) : null;
}

/** Only valid while the user holds the temporary recovery session from the reset-link
 * flow above — see reset-password.tsx. */
export async function updatePassword(newPassword: string): Promise<string | null> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  return error ? normalizeAuthError(error.message) : null;
}
