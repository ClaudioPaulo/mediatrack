'use client';

import { useEffect, useState } from 'react';
import { Network } from '@capacitor/network';

export function OfflineBanner() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    Network.getStatus().then((s) => setOnline(s.connected));
    const handle = Network.addListener('networkStatusChange', (s) => setOnline(s.connected));
    return () => {
      handle.then((h) => h.remove());
    };
  }, []);

  if (online) return null;

  return (
    <div className="mx-4 mb-4 rounded-lg border border-amber-800 bg-amber-950/50 px-4 py-2 text-sm text-amber-300 sm:mx-0">
      Sem ligação — a mostrar a última biblioteca guardada. Novas alterações só sincronizam quando
      voltares a ter internet.
    </div>
  );
}
