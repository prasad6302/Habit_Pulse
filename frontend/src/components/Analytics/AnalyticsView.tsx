import React, { useState, useEffect, useRef } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Flame,
  Award,
  TrendingUp,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  Trophy,
} from "lucide-react";
import { analyticsService } from "../../services/api";
import type { GlobalAnalytics, HabitAnalytics, Habit } from "../../services/api";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { motion } from "framer-motion";
import { AnalyticsSkeleton } from "../Common/Skeleton";


interface AnalyticsViewProps {
  habits: Habit[];
}

const COLORS = ["#6366f1", "#ec4899", "#10b981", "#f59e0b", "#a855f7", "#06b6d4", "#ef4444"];

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ habits }) => {
  const [globalData, setGlobalData] = useState<GlobalAnalytics | null>(null);
  const [selectedHabitId, setSelectedHabitId] = useState<string>("");
  const [habitData, setHabitData] = useState<HabitAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const shouldReduceMotion = useReducedMotion();

  // Flag to lock chart animation to initial mount ONLY (prevents re-animation on tab switches / data refresh)
  const isInitialChartLoad = useRef(true);

  useEffect(() => {
    const fetchGlobal = async () => {
      setIsLoading(true);
      try {
        const res = await analyticsService.getGlobal();
        setGlobalData(res);
        if (habits.length > 0) {
          setSelectedHabitId(habits[0].id);
        }
      } catch (err) {
        console.error("Failed to load global analytics:", err);
      } finally {
        setIsLoading(false);
        // After initial mount, lock chart animations
        setTimeout(() => {
          isInitialChartLoad.current = false;
        }, 1000);
      }
    };
    fetchGlobal();
  }, [habits]);

  useEffect(() => {
    if (!selectedHabitId) return;
    const fetchHabitDetail = async () => {
      try {
        const res = await analyticsService.getHabit(selectedHabitId);
        setHabitData(res);
      } catch (err) {
        console.error("Failed to load habit analytics:", err);
      }
    };
    fetchHabitDetail();
  }, [selectedHabitId]);

  if (isLoading) {
    return <AnalyticsSkeleton />;
  }



  const categoryPieData = globalData?.category_distribution
    ? Object.entries(globalData.category_distribution).map(([name, value]) => ({ name, value }))
    : [];

  // Should animate charts ONLY on first load and when reduced motion is NOT requested
  const shouldAnimateCharts = isInitialChartLoad.current && !shouldReduceMotion;

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Performance Analytics & Insights
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Track long-term habit completion trends, streaks, and unlocked achievements.
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-slate-900/80 backdrop-blur-md p-5 rounded-2xl border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Total Habits</span>
            <Layers className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-extrabold text-white mt-2">
            {globalData?.total_habits || 0}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Active rituals tracked</p>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-md p-5 rounded-2xl border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Total Completions</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-white mt-2">
            {globalData?.total_completions || 0}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Lifetime check-ins logged</p>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-md p-5 rounded-2xl border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Completion Rate</span>
            <TrendingUp className="w-4 h-4 text-pink-400" />
          </div>
          <div className="text-2xl font-extrabold text-white mt-2">
            {globalData?.global_completion_rate || 0}%
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Consistency score</p>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-md p-5 rounded-2xl border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Longest Active Streak</span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-white mt-2">
            {globalData?.longest_active_streak || 0} <span className="text-sm font-semibold text-slate-400">days</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Current top momentum</p>
        </div>
      </div>

      {/* Category Breakdown & Distribution */}
      {categoryPieData.length > 0 && (
        <div className="bg-slate-900/80 backdrop-blur-md p-6 rounded-3xl border border-slate-800 shadow-xl">
          <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            Category Distribution
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  isAnimationActive={shouldAnimateCharts}
                  animationDuration={500}
                >
                  {categoryPieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#334155",
                    borderRadius: "12px",
                    color: "#f8fafc",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Per-Habit Detailed Analysis */}
      {habits.length > 0 && (
        <div className="bg-slate-900/80 backdrop-blur-md p-6 rounded-3xl border border-slate-800 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-400" />
                Habit Deep Dive & Heatmap
              </h3>
              <p className="text-xs text-slate-400">Select a habit to inspect 30-day activity</p>
            </div>

            <select
              value={selectedHabitId}
              onChange={(e) => setSelectedHabitId(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs font-semibold rounded-xl px-4 py-2.5 outline-none"
            >
              {habits.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.category})
                </option>
              ))}
            </select>
          </div>

          {habitData && (
            <div className="space-y-6">
              {/* Stats Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-950/70 p-4 rounded-2xl border border-slate-800/80 text-center">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400">Current Streak</span>
                  <div className="text-lg font-bold text-amber-400 mt-0.5">{habitData.current_streak} days</div>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400">Longest Streak</span>
                  <div className="text-lg font-bold text-indigo-400 mt-0.5">{habitData.longest_streak} days</div>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400">Total Check-ins</span>
                  <div className="text-lg font-bold text-emerald-400 mt-0.5">{habitData.total_completions}</div>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400">Completion Rate</span>
                  <div className="text-lg font-bold text-pink-400 mt-0.5">{habitData.completion_rate}%</div>
                </div>
              </div>

              {/* Monthly Chart (Locked animation) */}
              {habitData.monthly_chart && habitData.monthly_chart.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                    Monthly Completion Trend
                  </h4>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={habitData.monthly_chart}>
                        <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                        <YAxis stroke="#64748b" fontSize={11} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#0f172a",
                            borderColor: "#334155",
                            borderRadius: "12px",
                            color: "#f8fafc",
                          }}
                        />
                        <Bar
                          dataKey="completions"
                          fill="#6366f1"
                          radius={[6, 6, 0, 0]}
                          isAnimationActive={shouldAnimateCharts}
                          animationDuration={500}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* 30-Day Heatmap Grid (No entrance animation) */}
              {habitData.heatmap && (
                <div>
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                    30-Day Activity Heatmap
                  </h4>
                  <div className="grid grid-cols-10 sm:grid-cols-15 gap-2">
                    {habitData.heatmap.map((cell) => (
                      <div
                        key={cell.date}
                        title={`${cell.date}: ${cell.count > 0 ? "Completed" : "Missed"}`}
                        className={`h-8 rounded-lg flex items-center justify-center text-[10px] font-mono ${
                          cell.count > 0
                            ? "bg-emerald-500/30 border border-emerald-500/50 text-emerald-300 font-bold"
                            : "bg-slate-950 border border-slate-800 text-slate-600"
                        }`}
                      >
                        {cell.date.slice(8)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Reward Moment #4: Milestones & Trophy Unlock Badges */}
      {globalData?.all_unlocked_milestones && (
        <div className="bg-slate-900/80 backdrop-blur-md p-6 rounded-3xl border border-slate-800 shadow-xl">
          <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            Milestones & Unlocked Badges
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {globalData.all_unlocked_milestones.map((m) => (
              <motion.div
                key={m.id}
                initial={shouldReduceMotion ? { scale: 1, opacity: 1 } : { scale: 0.94, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="p-4 rounded-2xl bg-slate-950/80 border border-amber-500/40 flex items-center gap-3 shadow-md shadow-amber-500/10 hover:border-amber-400/60 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-200">{m.name}</h4>
                  <p className="text-[11px] text-slate-400">{m.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
