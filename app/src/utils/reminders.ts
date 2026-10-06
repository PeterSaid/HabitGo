import { useCallback, useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { api } from '../api/client';
import type { TodayHabit } from '../features/habits/HabitCard';

/**
 * Local habit reminders (spec sections 52, 79).
 * On Android (Capacitor) schedules native daily notifications at each habit's
 * reminder time. On web, falls back to an in-app due-soon indicator.
 */
export type DueSoon = { habitId: string; name: string; time: string };

export function useReminders(enabled: boolean) {
  const [dueSoon, setDueSoon] = useState<DueSoon[]>([]);
  const scheduledRef = useRef(false);

  useEffect(() => {
    if (!enabled || scheduledRef.current) return;
    scheduledRef.current = true;

    (async () => {
      try {
        let habits: TodayHabit[] = [];
        try {
          const res = await api.get<{ habits: TodayHabit[] }>('/habits/today');
          habits = res.habits;
        } catch {
          return;
        }

        const withReminders = habits.filter((h) => {
          const item = h as unknown as { habit: { reminder_time?: string } } | unknown;
          return !!(item as { habit: { reminder_time?: string } }).habit.reminder_time;
        });
        if (!withReminders.length) return;

        if (Capacitor.isNativePlatform()) {
          const perm = await LocalNotifications.requestPermissions();
          if (perm.display !== 'granted') return;

          const notifications = withReminders.slice(0, 20).map((h, i) => {
            const [hh, mm] = (h as unknown as { habit: { reminder_time: string; name: string; reminder_message?: string } }).habit.reminder_time.split(':').map(Number);
            const custom = (h as unknown as { habit: { reminder_message?: string } }).habit.reminder_message;
            return {
              id: 1000 + i,
              title: 'HabitGo',
              body: custom || `⏰ ${h.habit.name}`,
              schedule: { on: { hour: hh, minute: mm }, allowWhileIdle: true, repeats: true },
            };
          });
          await LocalNotifications.schedule({ notifications });
        } else {
          // web fallback: compute which reminders are due within the next hour
          const now = new Date();
          const soon: DueSoon[] = [];
          for (const h of withReminders) {
            const hhmm = (h as unknown as { habit: { reminder_time: string; name: string } }).habit;
            const [hh, mm] = hhmm.reminder_time.split(':').map(Number);
            const due = new Date();
            due.setHours(hh, mm, 0, 0);
            const diffMin = (due.getTime() - now.getTime()) / 60000;
            if (diffMin > -30 && diffMin <= 60) {
              soon.push({ habitId: h.habit.id, name: hhmm.name, time: hhmm.reminder_time });
            }
          }
          setDueSoon(soon);
        }
      } catch {
        // reminders are best-effort
      }
    })();
  }, [enabled]);

  return dueSoon;
}

/** Generic notification permission helper for web. */
export async function ensureWebNotificationPermission(): Promise<boolean> {
  try {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    const res = await Notification.requestPermission();
    return res === 'granted';
  } catch {
    return false;
  }
}

export function useOfflineBanner() {
  const [online, setOnline] = useState(navigator.onLine);
  const update = useCallback(() => setOnline(navigator.onLine), []);
  useEffect(() => {
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, [update]);
  return !online;
}
