'use client';

import { createBrowserClient } from '@supabase/ssr';
import { secureStorage } from '@/lib/mobile/secureStorage';

// Supabase client for the browser (Client Components) and the native app.
// The variables come from .env.local. See README.md.
// The session is stored via secureStorage: Keychain/Keystore in the native app,
// localStorage in the browser.
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
