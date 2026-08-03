import { create } from "zustand";
import { notificationsService } from "../services/api";
import type { VapidSubscription, NotificationLogResponse } from "../services/api";

interface NotificationState {
  permissionState: NotificationPermission;
  isSubscribed: boolean;
  vapidPublicKey: string | null;
  logs: NotificationLogResponse[];
  isLoading: boolean;
  error: string | null;
  init: () => Promise<void>;
  requestPermissionAndSubscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<void>;
  fetchLogs: () => Promise<void>;
  sendTestPush: (title: string, body: string) => Promise<void>;
}

// Helper to convert base64url VAPID public key to Uint8Array required by PushManager
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  permissionState: "default",
  isSubscribed: false,
  vapidPublicKey: null,
  logs: [],
  isLoading: false,
  error: null,

  init: async () => {
    if (!("Notification" in window)) {
      set({ permissionState: "denied", isSubscribed: false });
      return;
    }

    set({ permissionState: Notification.permission });

    // Try checking if we are already subscribed on browser side
    if (Notification.permission === "granted" && "serviceWorker" in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        set({ isSubscribed: !!sub });
      } catch (err) {
        console.warn("Could not retrieve push subscription on init:", err);
      }
    }
  },

  requestPermissionAndSubscribe: async () => {
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      set({ error: "Push notifications not supported in this browser." });
      return false;
    }

    set({ isLoading: true, error: null });

    try {
      // 1. Request Browser Permission
      const permission = await Notification.requestPermission();
      set({ permissionState: permission });

      if (permission !== "granted") {
        set({ isSubscribed: false });
        return false;
      }

      // 2. Fetch VAPID public key from backend if not already cached
      let pubKey = get().vapidPublicKey;
      if (!pubKey) {
        const res = await notificationsService.getVapidPublicKey();
        pubKey = res.publicKey;
        set({ vapidPublicKey: pubKey });
      }

      // 3. Register service worker (assumes /sw.js is deployed in public/)
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });
      
      // Wait for it to become ready
      await navigator.serviceWorker.ready;

      // 4. Subscribe to PushManager
      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(pubKey),
      });

      // 5. Format subscription payload for backend
      const rawSub = pushSubscription.toJSON();
      if (!rawSub.endpoint || !rawSub.keys?.auth || !rawSub.keys?.p256dh) {
        throw new Error("Invalid subscription keys received from browser PushManager");
      }

      const formattedSub: VapidSubscription = {
        endpoint: rawSub.endpoint,
        keys: {
          auth: rawSub.keys.auth,
          p256dh: rawSub.keys.p256dh,
        },
      };

      // 6. Save on backend
      await notificationsService.subscribe(formattedSub);
      set({ isSubscribed: true, error: null });
      return true;
    } catch (err: any) {
      console.error("Failed to subscribe user to push:", err);
      set({ error: err.message || "Subscription failed.", isSubscribed: false });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  unsubscribe: async () => {
    set({ isLoading: true, error: null });
    try {
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await sub.unsubscribe();
        }
      }
      // Notify backend to clean user subscriptions
      await notificationsService.unsubscribe();
      set({ isSubscribed: false });
    } catch (err: any) {
      set({ error: err.message || "Failed to unsubscribe." });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchLogs: async () => {
    try {
      const logs = await notificationsService.getLogs(30);
      set({ logs });
    } catch (err) {
      console.error("Failed to fetch notification logs:", err);
    }
  },

  sendTestPush: async (title, body) => {
    set({ isLoading: true, error: null });
    try {
      await notificationsService.sendTestPush(title, body);
      // Wait a moment, then fetch logs to show the new sent notification
      setTimeout(() => {
        get().fetchLogs();
      }, 1000);
    } catch (err: any) {
      set({ error: err.response?.data?.detail || "Failed to send test push." });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },
}));
