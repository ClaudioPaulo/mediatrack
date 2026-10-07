'use client';

import { Capacitor } from '@capacitor/core';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';

/**
 * Supabase storage adapter for the session (JWT + refresh token).
 *
 * - In the native app (iOS/Android): stored in the Keychain / Keystore via
 *   capacitor-secure-storage-plugin, encrypted by the OS itself, and not
 *   accessible to other apps or exposed if the phone is compromised by
 *   apps without elevated privileges.
 * - In the browser (web): uses plain localStorage, as Supabase does by
 *   default (the native Keychain does not exist in the browser).
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
      // it no longer existed
    }
  },
};
