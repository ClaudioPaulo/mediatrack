import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// O link de "Magic Link" do Supabase redireciona para aqui com um `code` na URL.
// Esta rota troca esse código por uma sessão válida (cookies) e só depois
// redireciona para o dashboard — sem isto, o link nunca autentica o utilizador.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
