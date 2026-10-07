'use client';

import { createClient } from '@/lib/supabase/client';

/**
 * Sends a 6-digit OTP code (and also a magic link, in the same email)
 * to the given address. The user can click the link OR type the code.
 *
 * Note: the session length (30 days) is configured in the Supabase dashboard under
 * Authentication → Settings → "JWT expiry" / "Refresh token expiry". It is not
 * a parameter passed here. See README.md for the value to set.
 */
export async function sendOtp(email: string) {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  if (error) throw error;
}

/**
 * Confirms the 6-digit OTP code entered by the user.
 * On success, Supabase creates a persistent session (stored via
 * secureStorage, see lib/supabase/client.ts) valid for the period
 * configured in the dashboard (recommended: 30 days).
 */
export async function verifyOtp(email: string, token: string) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  });
  if (error) throw error;
  return data.session;
}

export async function signOut() {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
