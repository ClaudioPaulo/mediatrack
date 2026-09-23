'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/**
 * Fallback para quem clica no link mágico do e-mail em vez de digitar o
 * código de 6 dígitos. Troca o `code` da URL por uma sessão — tudo no
 * browser/WebView, sem depender de um servidor (necessário para o export
 * estático usado pela app nativa).
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    if (!code) {
      setError(true);
      return;
    }

    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        setError(true);
        return;
      }
      router.replace('/dashboard');
    });
  }, [router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      {error ? (
        <>
          <p className="mb-4 text-sm text-red-400">
            Não foi possível confirmar o acesso. Tenta o código de 6 dígitos em vez do link.
          </p>
          <button
            onClick={() => router.replace('/login')}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            Voltar ao login
          </button>
        </>
      ) : (
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-700 border-t-neutral-100" />
      )}
    </main>
  );
}
