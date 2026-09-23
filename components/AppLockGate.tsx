'use client';

import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { BiometricAuth } from '@aparajita/capacitor-biometric-auth';
import { Preferences } from '@capacitor/preferences';

const LOCK_ENABLED_KEY = 'app-lock-enabled';

/** Lê a preferência guardada (por omissão: ativo, se o dispositivo suportar). */
export async function isAppLockEnabled(): Promise<boolean> {
  const { value } = await Preferences.get({ key: LOCK_ENABLED_KEY });
  return value !== 'false'; // ativo por omissão
}

export async function setAppLockEnabled(enabled: boolean): Promise<void> {
  await Preferences.set({ key: LOCK_ENABLED_KEY, value: String(enabled) });
}

/**
 * Bloqueia o conteúdo da app atrás de Face ID / impressão digital / PIN do
 * dispositivo sempre que a app abre ou volta do fundo. Só atua em nativo —
 * no browser não faz nada (não há biometria de SO a proteger).
 */
export function AppLockGate({ children }: { children: React.ReactNode }) {
  const [locked, setLocked] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const native = Capacitor.isNativePlatform();

  async function tryUnlock() {
    setError(null);
    try {
      await BiometricAuth.authenticate({
        reason: 'Desbloqueia o MediaTrack',
        cancelTitle: 'Cancelar',
        allowDeviceCredential: true, // permite PIN/padrão como alternativa
        iosFallbackTitle: 'Usar código do iPhone',
        androidTitle: 'MediaTrack bloqueado',
        androidSubtitle: 'Confirma a tua identidade para continuar',
      });
      setLocked(false);
    } catch {
      setLocked(true);
      setError('Autenticação falhou ou foi cancelada.');
    }
  }

  useEffect(() => {
    if (!native) {
      setChecking(false);
      return;
    }

    (async () => {
      const enabled = await isAppLockEnabled();
      if (!enabled) {
        setChecking(false);
        return;
      }
      setLocked(true);
      setChecking(false);
      await tryUnlock();
    })();

    // Volta a bloquear quando a app volta do fundo
    let sub: { remove: () => void } | undefined;
    import('@capacitor/app').then(({ App }) => {
      App.addListener('appStateChange', async ({ isActive }) => {
        if (isActive) {
          const enabled = await isAppLockEnabled();
          if (enabled) {
            setLocked(true);
            await tryUnlock();
          }
        }
      }).then((h) => (sub = h));
    });

    return () => sub?.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [native]);

  if (checking) return null;

  if (locked) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-950 px-6 text-center">
        <p className="text-lg font-medium text-neutral-100">MediaTrack bloqueado</p>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          onClick={tryUnlock}
          className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-500"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
