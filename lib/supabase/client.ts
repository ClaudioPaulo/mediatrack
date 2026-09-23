'use client';

import { createBrowserClient } from '@supabase/ssr';
import { secureStorage } from '@/lib/mobile/secureStorage';

// Cliente Supabase para uso no browser (Client Components) e na app nativa.
// As variáveis vêm de .env.local — ver README.md.
// A sessão é guardada via secureStorage: Keychain/Keystore na app nativa,
// localStorage no browser.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        storage: secureStorage,
        persistSession: true,
        autoRefreshToken: true,
      },
    }
  );
}
