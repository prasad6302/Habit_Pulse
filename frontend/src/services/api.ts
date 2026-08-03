import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/v1";

// --- TYPES (Matching Pydantic models) ---

export interface UserResponse {
  id: string;
  email: string;
  is_active: boolean;
  created_at: string;
  timezone: string;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  global_notifications_enabled: boolean;
  has_push_subscription: boolean;
}

export interface UserUpdate {
  timezone?: string;
  quiet_hours_start?: string | null;
  quiet_hours_end?: string | null;
  global_notifications_enabled?: boolean;
}

export interface Token {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface HabitFrequency {
  type: string; // "daily" | "weekly" | "custom"
  days_of_week: number[] | null; // 0=Mon, 6=Sun
  custom_interval_days: number | null;
}

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  category: string;
  color: string;
  icon: string;
  frequency: HabitFrequency;
  reminder_times: string[];
  is_archived: boolean;
  is_paused: boolean;
  created_at: string;
  goal_streak: number | null;
  goal_completions_per_month: number | null;
  sort_order: number;
}

export interface HabitCreate {
  name: string;
  description?: string;
  category: string;
  color: string;
  icon: string;
  frequency: HabitFrequency;
  reminder_times: string[];
  goal_streak?: number;
  goal_completions_per_month?: number;
}

export interface HabitUpdate {
  name?: string;
  description?: string;
  category?: string;
  color?: string;
  icon?: string;
  frequency?: HabitFrequency;
  reminder_times?: string[];
  is_archived?: boolean;
  is_paused?: boolean;
  goal_streak?: number | null;
  goal_completions_per_month?: number | null;
  sort_order?: number;
}

export interface CheckInCreate {
  completed_date: string; // YYYY-MM-DD
  notes?: string;
  mood?: string;
}

export interface CheckInResponse {
  id: string;
  habit_id: string;
  completed_date: string;
  completed_at: string;
  notes: string | null;
  mood: string | null;
}

export interface GoalItem {
  habit_id: string;
  habit_name: string;
  category: string;
  color: string;
  icon: string;
  goal_type: "streak" | "monthly_completions";
  target: number;
  current: number;
  progress_percent: number;
  is_achieved: boolean;
}

export interface MilestoneItem {
  id: string;
  name: string;
  description: string;
  icon?: string;
}

export interface GoalsSummaryResponse {
  active_goals: GoalItem[];
  total_active_goals: number;
  unlocked_milestones: MilestoneItem[];
  locked_milestones: MilestoneItem[];
  total_unlocked: number;
  total_milestones: number;
}

export interface NotificationLogResponse {
  id: string;
  habit_id: string | null;
  title: string;
  body: string;
  sent_at: string;
  status: string;
}

export interface VapidSubscription {
  endpoint: string;
  keys: {
    auth: string;
    p256dh: string;
  };
}

export interface GlobalAnalytics {
  total_habits: number;
  total_completions: number;
  global_completion_rate: number;
  longest_active_streak: number;
  today_completion_percentage: number;
  today_completed_count: number;
  today_total_count: number;
  category_distribution: Record<string, number>;
  all_unlocked_milestones: Array<{ id: string; name: string; description: string }>;
}

export interface HabitAnalytics {
  habit_id: string;
  name: string;
  category: string;
  color: string;
  icon: string;
  created_at: string;
  current_streak: number;
  longest_streak: number;
  total_completions: number;
  completion_rate: number;
  goal_streak: number | null;
  goal_completions_per_month: number | null;
  unlocked_milestones: Array<{ id: string; name: string; description: string }>;
  heatmap: Array<{ date: string; count: number; notes: string | null }>;
  monthly_chart: Array<{ month: string; completions: number }>;
  history: Array<{ id: string; completed_date: string; completed_at: string; notes: string | null }>;
}

// --- AXIOS INSTANCE ---

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor for Token Refresh Queue
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (token) {
      prom.resolve(token);
    } else {
      prom.reject(error);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem("refresh_token");
      if (!refreshToken) {
        isRefreshing = false;
        return Promise.reject(error);
      }

      try {
        const refreshRes = await axios.post<Token>(
          `${API_BASE_URL}/auth/refresh?refresh_token_in=${refreshToken}`
        );
        const { access_token, refresh_token } = refreshRes.data;

        localStorage.setItem("access_token", access_token);
        localStorage.setItem("refresh_token", refresh_token);

        api.defaults.headers.common.Authorization = `Bearer ${access_token}`;
        originalRequest.headers.Authorization = `Bearer ${access_token}`;

        processQueue(null, access_token);
        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        // Trigger event or handle auth store logout externally
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

// --- API SERVICES ---

export const authService = {
  async register(data: { email: string; password: string }): Promise<UserResponse> {
    const res = await api.post<UserResponse>("/auth/register", data);
    return res.data;
  },

  async login(formData: FormData): Promise<Token> {
    const res = await api.post<Token>("/auth/login", formData, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    return res.data;
  },

  async getMe(): Promise<UserResponse> {
    const res = await api.get<UserResponse>("/auth/me");
    return res.data;
  },

  async updateMe(updates: UserUpdate): Promise<UserResponse> {
    const res = await api.put<UserResponse>("/auth/me", updates);
    return res.data;
  },

  async forgotPassword(email: string): Promise<{ message: string }> {
    const res = await api.post<{ message: string }>("/auth/forgot-password", { email });
    return res.data;
  },

  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    const res = await api.post<{ message: string }>("/auth/reset-password", { token, password });
    return res.data;
  },
};

export const habitsService = {
  async create(habit: HabitCreate): Promise<Habit> {
    const res = await api.post<Habit>("/habits/", habit);
    return res.data;
  },

  async getAll(includeArchived = false): Promise<Habit[]> {
    const res = await api.get<Habit[]>("/habits/", {
      params: { include_archived: includeArchived },
    });
    return res.data;
  },

  async getById(id: string): Promise<Habit> {
    const res = await api.get<Habit>(`/habits/${id}`);
    return res.data;
  },

  async update(id: string, updates: HabitUpdate): Promise<Habit> {
    const res = await api.put<Habit>(`/habits/${id}`, updates);
    return res.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/habits/${id}`);
  },

  async reorder(habitIds: string[]): Promise<void> {
    await api.post("/habits/reorder", { habit_ids: habitIds });
  },
};

export const checkinsService = {
  async log(habitId: string, data: CheckInCreate): Promise<CheckInResponse> {
    const res = await api.post<CheckInResponse>(`/checkins/habits/${habitId}`, data);
    return res.data;
  },

  async delete(habitId: string, completedDate: string): Promise<void> {
    await api.delete(`/checkins/habits/${habitId}/${completedDate}`);
  },

  async getHistoryByHabit(habitId: string): Promise<CheckInResponse[]> {
    const res = await api.get<CheckInResponse[]>(`/checkins/habits/${habitId}`);
    return res.data;
  },

  async getHistory(startDate: string, endDate: string): Promise<CheckInResponse[]> {
    const res = await api.get<CheckInResponse[]>("/checkins/history", {
      params: { start_date: startDate, end_date: endDate },
    });
    return res.data;
  },
};

export const analyticsService = {
  async getGlobal(): Promise<GlobalAnalytics> {
    const res = await api.get<GlobalAnalytics>("/analytics/");
    return res.data;
  },

  async getHabit(habitId: string): Promise<HabitAnalytics> {
    const res = await api.get<HabitAnalytics>(`/analytics/habits/${habitId}`);
    return res.data;
  },
};

export const notificationsService = {
  async getVapidPublicKey(): Promise<{ publicKey: string }> {
    const res = await api.get<{ publicKey: string }>("/notifications/vapid-public-key");
    return res.data;
  },

  async subscribe(sub: VapidSubscription): Promise<void> {
    await api.post("/notifications/subscribe", sub);
  },

  async unsubscribe(): Promise<void> {
    await api.post("/notifications/unsubscribe");
  },

  async sendTestPush(title: string, body: string): Promise<void> {
    await api.post("/notifications/test", { title, body });
  },

  async getLogs(limit = 50): Promise<NotificationLogResponse[]> {
    const res = await api.get<NotificationLogResponse[]>("/notifications/logs", {
      params: { limit },
    });
    return res.data;
  },

  async quickActionDone(notifId: string): Promise<void> {
    await api.post(`/notifications/quick-action/done/${notifId}`);
  },

  async quickActionSnooze(notifId: string): Promise<void> {
    await api.post(`/notifications/quick-action/snooze/${notifId}`);
  },
};

export const goalsService = {
  async getSummary(): Promise<GoalsSummaryResponse> {
    const res = await api.get<GoalsSummaryResponse>("/goals/summary");
    return res.data;
  },
};

export interface JournalItem {
  id: string;
  habit_id: string;
  habit_name: string;
  category: string;
  color: string;
  icon: string;
  completed_date: string;
  completed_at: string;
  notes: string | null;
  mood: string | null;
}

export interface JournalFeedResponse {
  items: JournalItem[];
  total_count: number;
  available_habits: Array<{ id: string; name: string }>;
}

export interface HabitTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  color: string;
  icon: string;
  frequency: { type: "daily" | "weekly" | "custom"; days_of_week?: number[]; custom_interval_days?: number };
  reminder_times: string[];
  goal_streak: number;
  goal_completions_per_month: number;
}

export interface InsightsResponse {
  has_enough_data: boolean;
  message: string;
  total_checkins: number;
  best_weekday: string | null;
  best_weekday_delta_percent?: number;
  peak_time_window: string | null;
  peak_time_percent?: number;
  weekday_distribution: Record<string, number>;
  time_distribution: Record<string, number>;
  generated_tips: string[];
}

export const journalService = {
  async getFeed(params?: { q?: string; habit_id?: string; mood?: string }): Promise<JournalFeedResponse> {
    const res = await api.get<JournalFeedResponse>("/journal/", { params });
    return res.data;
  },
};

export const templatesService = {
  async getCatalog(): Promise<HabitTemplate[]> {
    const res = await api.get<HabitTemplate[]>("/templates/");
    return res.data;
  },

  async adopt(templateId: string): Promise<Habit> {
    const res = await api.post<Habit>(`/templates/${templateId}/adopt`);
    return res.data;
  },
};

export const insightsService = {
  async getInsights(): Promise<InsightsResponse> {
    const res = await api.get<InsightsResponse>("/insights/");
    return res.data;
  },
};

export interface ProfileResponse {
  id: string;
  email: string;
  display_name: string;
  bio: string;
  avatar_color: string;
  member_since: string;
  show_on_leaderboard: boolean;
  stats: {
    total_habits_created: number;
    total_checkins_logged: number;
    longest_ever_streak: number;
  };
}

export interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  avatar_color: string;
  longest_streak: number;
  is_me: boolean;
  rank?: number;
}

export interface ChallengeItem {
  id: string;
  name: string;
  description: string;
  category: string;
  color: string;
  icon: string;
  duration_days: number;
  participants_count: number;
}

export const profileService = {
  async getMyProfile(): Promise<ProfileResponse> {
    const res = await api.get<ProfileResponse>("/profile/me");
    return res.data;
  },

  async updateMyProfile(data: {
    display_name?: string;
    bio?: string;
    avatar_color?: string;
    show_on_leaderboard?: boolean;
  }): Promise<void> {
    await api.put("/profile/me", data);
  },
};

export const privacyService = {
  async exportJson(): Promise<any> {
    const res = await api.get("/privacy/export/json");
    return res.data;
  },

  async exportCsv(): Promise<Blob> {
    const res = await api.get("/privacy/export/csv", { responseType: "blob" });
    return res.data;
  },

  async resetData(confirm_phrase: string, password: string): Promise<void> {
    await api.post("/privacy/reset-data", { confirm_phrase, password });
  },
};

export const socialService = {
  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    const res = await api.get<LeaderboardEntry[]>("/social/leaderboard");
    return res.data;
  },

  async getChallenges(): Promise<ChallengeItem[]> {
    const res = await api.get<ChallengeItem[]>("/social/challenges");
    return res.data;
  },

  async joinChallenge(challengeId: string): Promise<void> {
    await api.post(`/social/challenges/${challengeId}/join`);
  },
};
