'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// AuthGate (in the layout) handles redirecting to /login when
// needed; here we only point to the "normal" destination.
export default function RootPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);
  return null;
}
