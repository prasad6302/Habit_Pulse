import { create } from "zustand";
import { habitsService, checkinsService } from "../services/api";
import type { Habit, HabitCreate, HabitUpdate, CheckInResponse } from "../services/api";

interface HabitState {
  habits: Habit[];
  todayCheckIns: Record<string, CheckInResponse>; // key: habit_id -> checkin response
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
  fetchHabits: (includeArchived?: boolean) => Promise<void>;
  fetchTodayCheckIns: (localDateStr: string) => Promise<void>;
  createHabit: (habit: HabitCreate) => Promise<void>;
  updateHabit: (id: string, updates: HabitUpdate) => Promise<void>;
  togglePauseHabit: (id: string) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  toggleCheckIn: (habitId: string, localDateStr: string, notes?: string) => Promise<boolean>;
  reorderHabits: (habitIds: string[]) => Promise<void>;
  
  // Real-time WebSocket handlers
  handleLiveCheckInUpdate: (payload: any) => void;
  handleLiveHabitUpdate: (payload: any) => void;
  handleLiveHabitDelete: (habitId: string) => void;
  handleLiveHabitReorder: (habitIds: string[]) => void;
}


export const useHabitStore = create<HabitState>((set, get) => ({
  habits: [],
  todayCheckIns: {},
  isLoading: false,
  error: null,
  clearError: () => set({ error: null }),

  fetchHabits: async (includeArchived = false) => {
    set({ isLoading: true, error: null });
    try {
      const list = await habitsService.getAll(includeArchived);
      set({ habits: list });
    } catch (err: any) {
      set({ error: err.response?.data?.detail || "Failed to fetch habits." });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchTodayCheckIns: async (localDateStr) => {
    try {
      const list = await checkinsService.getHistory(localDateStr, localDateStr);
      const checkinMap: Record<string, CheckInResponse> = {};
      list.forEach((ci) => {
        checkinMap[ci.habit_id] = ci;
      });
      set({ todayCheckIns: checkinMap });
    } catch (err) {
      console.error("Failed to fetch today's check-ins:", err);
    }
  },

  createHabit: async (habitIn) => {
    set({ isLoading: true, error: null });
    try {
      const newHabit = await habitsService.create(habitIn);
      set((state) => ({
        habits: [...state.habits.filter((h) => h.id !== newHabit.id), newHabit].sort(
          (a, b) => a.sort_order - b.sort_order
        ),
      }));
    } catch (err: any) {
      set({ error: err.response?.data?.detail || "Failed to create habit." });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  updateHabit: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await habitsService.update(id, updates);
      set((state) => ({
        habits: state.habits
          .map((h) => (h.id === id ? updated : h))
          .sort((a, b) => a.sort_order - b.sort_order),
      }));
    } catch (err: any) {
      set({ error: err.response?.data?.detail || "Failed to update habit." });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  togglePauseHabit: async (id) => {
    const habit = get().habits.find((h) => h.id === id);
    if (!habit) return;
    await get().updateHabit(id, { is_paused: !habit.is_paused });
  },

  deleteHabit: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await habitsService.delete(id);
      set((state) => {
        const nextCheckIns = { ...state.todayCheckIns };
        delete nextCheckIns[id];
        return {
          habits: state.habits.filter((h) => h.id !== id),
          todayCheckIns: nextCheckIns,
        };
      });
    } catch (err: any) {
      set({ error: err.response?.data?.detail || "Failed to delete habit." });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  toggleCheckIn: async (habitId, localDateStr, notes) => {
    const previousCheckIns = { ...get().todayCheckIns };
    const existing = previousCheckIns[habitId];

    // Optimistic Update immediately before API call
    if (existing) {
      const next = { ...previousCheckIns };
      delete next[habitId];
      set({ todayCheckIns: next });
    } else {
      const optimisticCheckIn: CheckInResponse = {
        id: `opt-${Date.now()}`,
        habit_id: habitId,
        completed_date: localDateStr,
        completed_at: new Date().toISOString(),
        notes: notes || null,
        mood: null,
      };
      set({
        todayCheckIns: {
          ...previousCheckIns,
          [habitId]: optimisticCheckIn,
        },
      });
    }

    try {
      if (existing) {
        await checkinsService.delete(habitId, localDateStr);
        return false;
      } else {
        const confirmedCheckIn = await checkinsService.log(habitId, {
          completed_date: localDateStr,
          notes,
        });
        set((state) => ({
          todayCheckIns: {
            ...state.todayCheckIns,
            [habitId]: confirmedCheckIn,
          },
        }));
        return true;
      }
    } catch (err: any) {
      // Rollback optimistic update on failure
      set({
        todayCheckIns: previousCheckIns,
        error: err.response?.data?.detail || "Check-in action failed. Rolling back.",
      });
      throw err;
    }
  },

  reorderHabits: async (habitIds) => {
    const originalHabits = [...get().habits];
    const reordered = [...originalHabits];

    reordered.sort((a, b) => {
      const idxA = habitIds.indexOf(a.id);
      const idxB = habitIds.indexOf(b.id);
      if (idxA === -1 || idxB === -1) return 0;
      return idxA - idxB;
    });

    const updated = reordered.map((h, idx) => ({ ...h, sort_order: idx }));
    set({ habits: updated });

    try {
      await habitsService.reorder(habitIds);
    } catch (err) {
      set({ habits: originalHabits });
      console.error("Failed to persist habit reorder:", err);
    }
  },

  // Real-Time WebSocket Event Handlers (Multi-tab live sync)
  handleLiveCheckInUpdate: (payload: any) => {
    const { action, habit_id, checkin } = payload;
    if (action === "checkin" && checkin) {
      set((state) => ({
        todayCheckIns: {
          ...state.todayCheckIns,
          [habit_id]: checkin,
        },
      }));
    } else if (action === "checkout") {
      set((state) => {
        const next = { ...state.todayCheckIns };
        delete next[habit_id];
        return { todayCheckIns: next };
      });
    }
  },

  handleLiveHabitUpdate: (payload: any) => {
    const { habit } = payload;
    if (!habit) return;
    set((state) => {
      const exists = state.habits.some((h) => h.id === habit.id);
      let updatedList = exists
        ? state.habits.map((h) => (h.id === habit.id ? habit : h))
        : [...state.habits, habit];
      updatedList.sort((a, b) => a.sort_order - b.sort_order);
      return { habits: updatedList };
    });
  },

  handleLiveHabitDelete: (habitId: string) => {
    set((state) => {
      const nextCheckIns = { ...state.todayCheckIns };
      delete nextCheckIns[habitId];
      return {
        habits: state.habits.filter((h) => h.id !== habitId),
        todayCheckIns: nextCheckIns,
      };
    });
  },

  handleLiveHabitReorder: (habitIds: string[]) => {
    if (!habitIds || !Array.isArray(habitIds)) return;
    set((state) => {
      const reordered = [...state.habits];
      reordered.sort((a, b) => {
        const idxA = habitIds.indexOf(a.id);
        const idxB = habitIds.indexOf(b.id);
        if (idxA === -1 || idxB === -1) return 0;
        return idxA - idxB;
      });
      const updated = reordered.map((h, idx) => ({ ...h, sort_order: idx }));
      return { habits: updated };
    });
  },
}));

