'use client';

import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { isAppLockEnabled, setAppLockEnabled } from './AppLockGate';

export function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const [lockEnabled, setLockEnabled] = useState(true);
  const native = Capacitor.isNativePlatform();

  useEffect(() => {
    if (!native) return;
    isAppLockEnabled().then(setLockEnabled);
  }, [native]);

  if (!native) return null; // no browser não há nada de nativo para configurar

  async function toggleLock() {
    const next = !lockEnabled;
    setLockEnabled(next);
    await setAppLockEnabled(next);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Definições"
        className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200"
      >
        ⚙️
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-64 rounded-xl border border-neutral-800 bg-neutral-900 p-4 shadow-xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-neutral-100">Bloqueio por biometria</p>
              <p className="text-xs text-neutral-500">Face ID / impressão digital ao abrir a app</p>
            </div>
            <button
              onClick={toggleLock}
              className={`h-6 w-11 shrink-0 rounded-full transition-colors ${
                lockEnabled ? 'bg-blue-600' : 'bg-neutral-700'
              }`}
            >
              <span
                className={`block h-5 w-5 translate-y-0.5 rounded-full bg-white transition-transform ${
                  lockEnabled ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
