'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// O AuthGate (no layout) trata do redireccionamento para /login quando
// necessário; aqui só apontamos para o destino "normal".
export default function RootPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);
  return null;
}
