'use client';

import { Capacitor } from '@capacitor/core';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';

/**
 * Storage do Supabase para a sessão (JWT + refresh token).
 *
 * - Na app nativa (iOS/Android): guarda no Keychain / Keystore via
 *   capacitor-secure-storage-plugin — encriptado pelo próprio SO, não é
 *   acessível a outras apps nem visível se o telefone for comprometido por
 *   apps sem privilégio elevado.
 * - No browser (web): usa localStorage normal, tal como o Supabase faz por
 *   omissão (o Keychain nativo não existe no browser).
 */
export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    if (!Capacitor.isNativePlatform()) return window.localStorage.getItem(key);
    try {
      const { value } = await SecureStoragePlugin.get({ key });
      return value ?? null;
    } catch {
      return null; // chave inexistente
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      window.localStorage.setItem(key, value);
      return;
    }
    await SecureStoragePlugin.set({ key, value });
  },
  async removeItem(key: string): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      window.localStorage.removeItem(key);
      return;
    }
    try {
      await SecureStoragePlugin.remove({ key });
    } catch {
      // já não existia
    }
  },
};
