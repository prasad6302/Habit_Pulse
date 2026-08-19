import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

export const nativeNotificationService = {
  async requestPermission(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;
    try {
      const perm = await LocalNotifications.requestPermissions();
      return perm.display === 'granted';
    } catch (e) {
      console.error("Failed to request native notification permissions:", e);
      return false;
    }
  },

  async scheduleHabitReminders(habits: Array<{ id: string; name: string; reminder_times?: string[] }>): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    try {
      const granted = await this.requestPermission();
      if (!granted) return;

      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel({ notifications: pending.notifications });
      }

      const notificationsToSchedule = [];
      let notifId = 1000;

      for (const habit of habits) {
        if (!habit.reminder_times || habit.reminder_times.length === 0) continue;

        for (const timeStr of habit.reminder_times) {
          try {
            const [hourStr, minStr] = timeStr.split(':');
            const hour = parseInt(hourStr, 10);
            const minute = parseInt(minStr, 10);

            notifId++;
            notificationsToSchedule.push({
              id: notifId,
              title: `Habit Reminder: ${habit.name}`,
              body: `It's time for ${habit.name}! Keep your streak alive. 🔥`,
              schedule: {
                on: {
                  hour: hour,
                  minute: minute
                },
                repeats: true,
                allowWhileIdle: true
              },
              iconColor: '#6366f1'
            });
          } catch (e) {
            console.error("Error parsing reminder time:", e);
          }
        }
      }

      if (notificationsToSchedule.length > 0) {
        await LocalNotifications.schedule({ notifications: notificationsToSchedule });
        console.log(`[Native Notifications] Scheduled ${notificationsToSchedule.length} local on-device notifications.`);
      }
    } catch (err) {
      console.error("Failed to schedule native local notifications:", err);
    }
  }
};
