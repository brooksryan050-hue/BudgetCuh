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
