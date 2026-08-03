import { create } from "zustand";
import { authService } from "../services/api";
import type { UserResponse, UserUpdate } from "../services/api";

interface AuthState {
  user: UserResponse | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  fetchProfile: () => Promise<void>;
  updateProfile: (updates: UserUpdate) => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: !!localStorage.getItem("access_token"),
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const formData = new FormData();
      formData.append("username", email);
      formData.append("password", password);
      
      const tokenData = await authService.login(formData);
      localStorage.setItem("access_token", tokenData.access_token);
      localStorage.setItem("refresh_token", tokenData.refresh_token);
      
      set({ isAuthenticated: true });
      await get().fetchProfile();
    } catch (err: any) {
      const errMsg = err.response?.data?.detail || "Login failed. Please check credentials.";
      set({ error: errMsg, isAuthenticated: false, user: null });
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      await authService.register({ email, password });
      // Log in automatically after registration
      await get().login(email, password);
    } catch (err: any) {
      const errMsg = err.response?.data?.detail || "Registration failed. Try another email.";
      set({ error: errMsg });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  logout: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    set({ user: null, isAuthenticated: false, error: null });
  },

  fetchProfile: async () => {
    if (!localStorage.getItem("access_token")) {
      set({ isAuthenticated: false, user: null });
      return;
    }
    set({ isLoading: true });
    try {
      const profile = await authService.getMe();
      set({ user: profile, isAuthenticated: true, error: null });
    } catch (err: any) {
      // Token probably invalid/expired and refresh failed
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      set({ user: null, isAuthenticated: false });
    } finally {
      set({ isLoading: false });
    }
  },

  updateProfile: async (updates) => {
    set({ isLoading: true, error: null });
    try {
      const updatedUser = await authService.updateMe(updates);
      set({ user: updatedUser });
    } catch (err: any) {
      const errMsg = err.response?.data?.detail || "Failed to update profile settings.";
      set({ error: errMsg });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
