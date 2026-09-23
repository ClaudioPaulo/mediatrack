'use client';

import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

interface ReminderItem {
  id: number; // precisa de ser um inteiro estável — usamos um hash do mediaItemId
  title: string;
}

function hashToInt(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h) % 2147483647;
}

/**
 * Agenda lembretes locais (não precisam de servidor push) para itens que
 * estão "A ver/ler" — um por item, daqui a 3 dias, para incentivar a
 * continuar. Reagendar substitui sempre os anteriores (mesmo id).
 */
export async function scheduleContinueReminders(
  items: Array<{ mediaItemId: string; title: string; status: string }>
) {
  if (!Capacitor.isNativePlatform()) return;

  const { display } = await LocalNotifications.checkPermissions();
  if (display !== 'granted') {
    const { display: requested } = await LocalNotifications.requestPermissions();
    if (requested !== 'granted') return;
  }

  const watching = items.filter((i) => i.status === 'watching_reading');
  if (watching.length === 0) return;

  await LocalNotifications.cancel({
    notifications: watching.map((i) => ({ id: hashToInt(i.mediaItemId) })),
  });

  const threeDays = 1000 * 60 * 60 * 24 * 3;
  await LocalNotifications.schedule({
    notifications: watching.slice(0, 32).map((item) => ({
      id: hashToInt(item.mediaItemId),
      title: 'Continuar onde ficaste?',
      body: `Ainda tens "${item.title}" a meio.`,
      schedule: { at: new Date(Date.now() + threeDays) },
      smallIcon: 'ic_stat_icon',
    })),
  });
}
