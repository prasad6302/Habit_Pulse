import React, { useEffect, useState } from "react";
import {
  Sparkles,
  Calendar,
  Clock,
  TrendingUp,
  Info,
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { insightsService } from "../../services/api";
import type { InsightsResponse } from "../../services/api";
import { useReducedMotion } from "../../hooks/useReducedMotion";

export const InsightsView: React.FC = () => {
  const [data, setData] = useState<InsightsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const prefersReducedMotion = useReducedMotion();

  const loadInsights = async () => {
    setIsLoading(true);
    try {
      const res = await insightsService.getInsights();
      setData(res);
    } catch (err) {
      console.error("Failed to load insights:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInsights();
  }, []);

  if (isLoading) {
    return (
      <div className="py-20 text-center text-slate-500 text-xs font-medium">
        Analyzing habit check-in statistics...
      </div>
    );
  }

  if (!data || !data.has_enough_data) {
    return (
      <div className="space-y-8 animate-fadeIn">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white">Insights & Pattern Analysis</h1>
            <p className="text-xs text-slate-400">
              Statistical pattern analysis based on your actual check-in data
            </p>
          </div>
        </div>

        {/* Honest Empty State */}
        <div className="py-16 text-center bg-slate-900/40 rounded-3xl border border-dashed border-slate-800 flex flex-col items-center justify-center p-8 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
            <Info className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-200">Not Enough Check-In Data Yet</h3>
          <p className="text-slate-400 text-xs max-w-md leading-relaxed">
            {data?.message || "Complete a few more check-ins across your habits so we can calculate your best performing weekdays, peak times, and consistency patterns!"}
          </p>
        </div>
      </div>
    );
  }

  // Format charts
  const weekdayChartData = Object.entries(data.weekday_distribution).map(([day, count]) => ({
    day: day.slice(0, 3),
    completions: count,
  }));

  const timeChartData = Object.entries(data.time_distribution).map(([window, count]) => ({
    window: window.split(" ")[0],
    completions: count,
  }));

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white">Insights & Pattern Analysis</h1>
            <p className="text-xs text-slate-400">
              Statistical analysis computed from your {data.total_checkins} total check-in logs
            </p>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md space-y-2">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold">
            <Calendar className="w-4 h-4 text-indigo-400" />
            <span>Best Performing Weekday</span>
          </div>
          <p className="text-2xl font-black text-white">{data.best_weekday}</p>
          {data.best_weekday_delta_percent !== undefined && (
            <p className="text-xs text-emerald-400 font-medium">
              +{data.best_weekday_delta_percent}% higher completion rate vs average day
            </p>
          )}
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md space-y-2">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold">
            <Clock className="w-4 h-4 text-purple-400" />
            <span>Peak Completion Time</span>
          </div>
          <p className="text-2xl font-black text-white">{data.peak_time_window}</p>
          {data.peak_time_percent !== undefined && (
            <p className="text-xs text-purple-300 font-medium">
              Accounts for {data.peak_time_percent}% of your total logged check-ins
            </p>
          )}
        </div>
      </div>

      {/* Generated Dynamic Tips */}
      <div className="space-y-3">
        <h3 className="font-bold text-sm text-white flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-amber-400" />
          <span>Data-Driven Momentum Observations</span>
        </h3>
        <div className="space-y-2.5">
          {data.generated_tips.map((tip, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-gradient-to-r from-indigo-950/60 to-purple-950/60 border border-indigo-500/30 text-xs text-indigo-100 font-medium flex items-center gap-3 shadow-md"
            >
              <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>{tip}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Distributions Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-md space-y-4">
          <h4 className="font-bold text-xs text-white">Weekday Completion Breakdown</h4>
          <div className="h-56 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekdayChartData}>
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} />
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
                  fill="#6366f1"
                  radius={[6, 6, 0, 0]}
                  isAnimationActive={!prefersReducedMotion}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-md space-y-4">
          <h4 className="font-bold text-xs text-white">Time Window Completion Breakdown</h4>
          <div className="h-56 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeChartData}>
                <XAxis dataKey="window" stroke="#94a3b8" fontSize={11} tickLine={false} />
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
                  fill="#a855f7"
                  radius={[6, 6, 0, 0]}
                  isAnimationActive={!prefersReducedMotion}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
