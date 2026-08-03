import React, { useEffect, useState } from "react";
import { format, subDays, eachDayOfInterval } from "date-fns";
import {
  ArrowLeft,
  Calendar,
  Flame,
  Award,
  CheckCircle2,
  Edit2,
  Trash2,
  Clock,
  MessageSquare,
  TrendingUp,
  Pause,
  Play,
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import type { Habit, CheckInResponse } from "../../services/api";
import { checkinsService } from "../../services/api";
import { useHabitStore } from "../../context/useHabitStore";
import { useReducedMotion } from "../../hooks/useReducedMotion";

interface HabitDetailViewProps {
  habit: Habit;
  onBack: () => void;
  onEdit: (habit: Habit) => void;
  onDelete: (habitId: string) => void;
}

const MOOD_EMOJIS: Record<string, { emoji: string; label: string; color: string }> = {
  great: { emoji: "😄", label: "Great", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
  good: { emoji: "🙂", label: "Good", color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/30" },
  okay: { emoji: "😐", label: "Okay", color: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
  bad: { emoji: "🙁", label: "Bad", color: "text-rose-400 bg-rose-500/10 border-rose-500/30" },
  terrible: { emoji: "😫", label: "Terrible", color: "text-purple-400 bg-purple-500/10 border-purple-500/30" },
};

export const HabitDetailView: React.FC<HabitDetailViewProps> = ({
  habit,
  onBack,
  onEdit,
  onDelete,
}) => {
  const [history, setHistory] = useState<CheckInResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { todayCheckIns, toggleCheckIn, togglePauseHabit } = useHabitStore();
  const prefersReducedMotion = useReducedMotion();

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const isCheckedToday = Boolean(todayCheckIns[habit.id]);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const list = await checkinsService.getHistoryByHabit(habit.id);
      list.sort(
        (a, b) => new Date(b.completed_date).getTime() - new Date(a.completed_date).getTime()
      );
      setHistory(list);
    } catch (err) {
      console.error("Failed to load habit history:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [habit.id, todayCheckIns[habit.id]]);

  // Calculate 365-day heatmap days
  const today = new Date();
  const yearAgo = subDays(today, 364);
  const yearDays = eachDayOfInterval({ start: yearAgo, end: today });
  const checkInDateSet = new Set(history.map((ci) => ci.completed_date));

  // Compute monthly bar chart data
  const monthlyDataMap: Record<string, number> = {};
  for (let i = 5; i >= 0; i--) {
    const monthDate = subDays(today, i * 30);
    const monthKey = format(monthDate, "MMM yyyy");
    monthlyDataMap[monthKey] = 0;
  }
  history.forEach((ci) => {
    const monthKey = format(new Date(ci.completed_date), "MMM yyyy");
    if (monthKey in monthlyDataMap) {
      monthlyDataMap[monthKey] += 1;
    }
  });
  const chartData = Object.entries(monthlyDataMap).map(([month, count]) => ({
    month,
    completions: count,
  }));

  const totalCompletions = history.length;

  const handleToggle = async () => {
    await toggleCheckIn(habit.id, todayStr);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg"
              style={{ backgroundColor: habit.color || "#6366f1" }}
            >
              {habit.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold text-white">{habit.name}</h1>
                <span className="px-2.5 py-0.5 text-xs font-bold bg-slate-800 text-slate-300 rounded-full border border-slate-700">
                  {habit.category}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Frequency: <span className="text-slate-200 capitalize">{habit.frequency.type}</span>
                {habit.description && ` • ${habit.description}`}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleToggle}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs shadow-md flex items-center gap-2 transition-all active:scale-95 ${
              isCheckedToday
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                : "bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-500 hover:to-purple-500"
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isCheckedToday ? "Done Today ✅" : "Check-in Today"}</span>
          </button>

          <button
            onClick={() => togglePauseHabit(habit.id)}
            className={`p-2.5 rounded-xl bg-slate-900 border transition-colors ${
              habit.is_paused
                ? "border-amber-500/40 text-amber-400 hover:bg-slate-800"
                : "border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
            title={habit.is_paused ? "Resume Habit" : "Pause Habit (Vacation Mode)"}
          >
            {habit.is_paused ? <Play className="w-4 h-4 fill-amber-400/20" /> : <Pause className="w-4 h-4" />}
          </button>

          <button
            onClick={() => onEdit(habit)}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title="Edit Habit"
          >
            <Edit2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => onDelete(habit.id)}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
            title="Delete Habit"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold">
            <Flame className="w-4 h-4 text-amber-400" />
            <span>Total Completions</span>
          </div>
          <p className="text-2xl font-black text-white mt-2">{totalCompletions}</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold">
            <Award className="w-4 h-4 text-indigo-400" />
            <span>Goal Streak</span>
          </div>
          <p className="text-2xl font-black text-white mt-2">{habit.goal_streak || "None"}</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold">
            <Calendar className="w-4 h-4 text-purple-400" />
            <span>Monthly Target</span>
          </div>
          <p className="text-2xl font-black text-white mt-2">{habit.goal_completions_per_month || "None"}</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>Reminders</span>
          </div>
          <p className="text-sm font-bold text-white mt-2">
            {habit.reminder_times.length > 0 ? habit.reminder_times.join(", ") : "Off"}
          </p>
        </div>
      </div>

      {/* 365-Day Calendar Heatmap Grid */}
      <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-md space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-sm text-white">Yearly Completion Heatmap</h3>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
            <span>Less</span>
            <span className="w-3 h-3 rounded-sm bg-slate-800 border border-slate-700" />
            <span
              className="w-3 h-3 rounded-sm shadow-sm"
              style={{ backgroundColor: habit.color || "#6366f1" }}
            />
            <span>More</span>
          </div>
        </div>

        <div className="overflow-x-auto pb-2">
          <div className="grid grid-rows-7 grid-flow-col gap-1.5 min-w-[700px]">
            {yearDays.map((d) => {
              const dStr = format(d, "yyyy-MM-dd");
              const isDone = checkInDateSet.has(dStr);
              return (
                <div
                  key={dStr}
                  title={`${format(d, "MMM d, yyyy")}: ${isDone ? "Completed ✅" : "Missed"}`}
                  className={`w-3.5 h-3.5 rounded-sm transition-all ${
                    isDone
                      ? "shadow-sm scale-105"
                      : "bg-slate-800/60 border border-slate-800"
                  }`}
                  style={{
                    backgroundColor: isDone ? habit.color || "#6366f1" : undefined,
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Monthly Trend Chart & Check-In History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Bar Chart */}
        <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-md space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-400" />
            <h3 className="font-bold text-sm text-white">6-Month Completion Trend</h3>
          </div>
          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#334155",
                    borderRadius: "12px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
                <Bar
                  dataKey="completions"
                  fill={habit.color || "#6366f1"}
                  radius={[6, 6, 0, 0]}
                  isAnimationActive={!prefersReducedMotion}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chronological Check-In Timeline */}
        <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-sm text-white">Check-in Log & Notes</h3>
            </div>
            <span className="text-xs text-slate-400 font-semibold">{history.length} Logs</span>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-slate-500 text-xs font-medium">
              Loading check-in history...
            </div>
          ) : history.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs font-medium border border-dashed border-slate-800 rounded-xl">
              No check-ins logged for this habit yet.
            </div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {history.map((ci) => {
                const moodObj = ci.mood ? MOOD_EMOJIS[ci.mood] : null;
                return (
                  <div
                    key={ci.id}
                    className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">
                          {format(new Date(ci.completed_date), "EEEE, MMM d, yyyy")}
                        </span>
                        {moodObj && (
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-full border flex items-center gap-1 ${moodObj.color}`}
                          >
                            <span>{moodObj.emoji}</span>
                            <span>{moodObj.label}</span>
                          </span>
                        )}
                      </div>
                      {ci.notes && (
                        <p className="text-xs text-slate-300 flex items-center gap-1.5 mt-1">
                          <MessageSquare className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{ci.notes}</span>
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono shrink-0">
                      {format(new Date(ci.completed_at), "HH:mm")}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
