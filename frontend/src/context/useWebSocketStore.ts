import { create } from "zustand";
import { useHabitStore } from "./useHabitStore";
import { useNotificationStore } from "./useNotificationStore";

type ConnectionStatus = "connected" | "connecting" | "offline";

interface LiveToast {
  id: string;
  title: string;
  body: string;
}

interface WebSocketState {
  status: ConnectionStatus;
  lastSyncedAt: Date | null;
  activeToast: LiveToast | null;
  connect: () => void;
  disconnect: () => void;
  dismissToast: () => void;
}

let socket: WebSocket | null = null;
let reconnectTimer: any = null;
let reconnectAttempt = 0;

export const useWebSocketStore = create<WebSocketState>((set, get) => ({
  status: "offline",
  lastSyncedAt: null,
  activeToast: null,

  connect: () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      set({ status: "offline" });
      return;
    }

    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    set({ status: "connecting" });

    const apiUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8001/api/v1";
    const wsProtocol = apiUrl.startsWith("https") ? "wss" : "ws";
    const hostAndPath = apiUrl.replace(/^https?:\/\//, "");
    const wsUrl = `${wsProtocol}://${hostAndPath}/ws?token=${encodeURIComponent(token)}`;

    try {
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        set({ status: "connected", lastSyncedAt: new Date() });
        reconnectAttempt = 0;
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const { event: eventType, data: payload } = data;

          set({ lastSyncedAt: new Date() });

          if (eventType === "connected") {
            set({ status: "connected" });
          } else if (eventType === "checkin_updated") {
            useHabitStore.getState().handleLiveCheckInUpdate(payload);
          } else if (eventType === "habit_updated") {
            useHabitStore.getState().handleLiveHabitUpdate(payload);
          } else if (eventType === "habit_deleted") {
            useHabitStore.getState().handleLiveHabitDelete(payload.habit_id);
          } else if (eventType === "habit_reordered") {
            useHabitStore.getState().handleLiveHabitReorder(payload.habit_ids);
          } else if (eventType === "notification_fired") {
            const toastId = `toast-${Date.now()}`;
            set({
              activeToast: {
                id: toastId,
                title: payload.title || "Habit Reminder",
                body: payload.body || "Daily habit nudge",
              },
            });
            useNotificationStore.getState().fetchLogs();
          }
        } catch (err) {
          console.error("Error parsing WS message:", err);
        }
      };

      socket.onclose = () => {
        set({ status: "offline" });
        socket = null;

        // Exponential backoff reconnection logic
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempt), 10000);
        reconnectAttempt++;

        if (localStorage.getItem("access_token")) {
          reconnectTimer = setTimeout(() => {
            get().connect();
          }, delay);
        }
      };

      socket.onerror = (err) => {
        console.warn("WebSocket connection error:", err);
        set({ status: "offline" });
      };
    } catch (err) {
      console.error("Failed to establish WebSocket connection:", err);
      set({ status: "offline" });
    }
  },

  disconnect: () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (socket) {
      socket.close();
      socket = null;
    }
    set({ status: "offline", activeToast: null });
  },

  dismissToast: () => set({ activeToast: null }),
}));
