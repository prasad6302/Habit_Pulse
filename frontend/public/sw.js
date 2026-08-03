// Service Worker for Habit Tracker Web Push Notifications

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle incoming push message from Web Push Server
self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || "Habit Reminder";
    const options = {
      body: data.body || "Time to complete your habit!",
      icon: "/favicon.svg",
      badge: "/favicon.svg",
      tag: data.notif_id || `notif-${Date.now()}`,
      data: {
        notif_id: data.notif_id,
        habit_id: data.habit_id,
        url: "/",
      },
      actions: [
        {
          action: "mark_done",
          title: "Done",
        },
        {
          action: "snooze",
          title: "Snooze 15m",
        },
      ],
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error("Error displaying push notification:", err);
  }
});

// Handle user clicking on notification or notification action buttons
self.addEventListener("notificationclick", (event) => {
  const notification = event.notification;
  const action = event.action;
  const notifId = notification.data?.notif_id;

  notification.close();

  const handleAction = async () => {
    const baseUrl = "http://127.0.0.1:8000/api/v1";

    if (action === "mark_done" && notifId) {
      try {
        await fetch(`${baseUrl}/notifications/quick-action/done/${notifId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
      } catch (err) {
        console.error("Failed to execute quick action mark_done:", err);
      }
    } else if (action === "snooze" && notifId) {
      try {
        await fetch(`${baseUrl}/notifications/quick-action/snooze/${notifId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
      } catch (err) {
        console.error("Failed to execute quick action snooze:", err);
      }
    }

    // Focus existing window or open a new window
    const windowClients = await self.clients.matchAll({
      type: "window",
      includeUncontrolled: true,
    });

    for (let client of windowClients) {
      if (client.url.includes(self.location.origin) && "focus" in client) {
        return client.focus();
      }
    }

    if (self.clients.openWindow) {
      return self.clients.openWindow("/");
    }
  };

  event.waitUntil(handleAction());
});
