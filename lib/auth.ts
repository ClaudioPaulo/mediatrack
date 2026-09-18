'use client';

import { createClient } from '@/lib/supabase/client';

/**
 * Envia um código OTP de 6 dígitos (e também um magic link, no mesmo e-mail)
 * para o endereço indicado. O utilizador pode clicar no link OU digitar o código.
 *
 * Nota: a duração da sessão (30 dias) é configurada no painel do Supabase em
 * Authentication → Settings → "JWT expiry" / "Refresh token expiry" — não é
 * um parâmetro passado aqui. Ver README.md para o valor a configurar.
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
 * Confirma o código OTP de 6 dígitos introduzido pelo utilizador.
 * Ao ter sucesso, o Supabase cria uma sessão persistente (cookies httpOnly,
 * geridos automaticamente pelo @supabase/ssr) válida durante o período
 * configurado no painel (recomendado: 30 dias).
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
