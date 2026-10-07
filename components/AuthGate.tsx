'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const PUBLIC_PATHS = ['/login', '/auth/callback'];

/**
 * Replaces the old middleware.ts (which needed a Node server and is therefore
 * incompatible with static export / Capacitor). Runs in the browser/WebView:
 * checks the Supabase session and redirects just like the middleware did.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    async function check() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!active) return;

      const isPublic = PUBLIC_PATHS.some((p) => pathname?.startsWith(p));

      if (!session && !isPublic) {
        router.replace('/login');
        return;
      }
      if (session && pathname === '/login') {
        router.replace('/dashboard');
        return;
      }
      setReady(true);
    }

    check();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const isPublic = PUBLIC_PATHS.some((p) => pathname?.startsWith(p));
      if (!session && !isPublic) router.replace('/login');
      if (session && pathname === '/login') router.replace('/dashboard');
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-700 border-t-neutral-100" />
      </div>
    );
  }

  return <>{children}</>;
}
