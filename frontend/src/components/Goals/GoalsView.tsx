import React, { useEffect, useState } from "react";
import {
  Trophy,
  Target,
  Award,
  Lock,
  CheckCircle2,
} from "lucide-react";
import { goalsService } from "../../services/api";
import type { GoalsSummaryResponse } from "../../services/api";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { motion } from "framer-motion";

export const GoalsView: React.FC = () => {
  const [data, setData] = useState<GoalsSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const prefersReducedMotion = useReducedMotion();

  const loadGoals = async () => {
    setIsLoading(true);
    try {
      const summary = await goalsService.getSummary();
      setData(summary);
    } catch (err) {
      console.error("Failed to load goals summary:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGoals();
  }, []);

  if (isLoading) {
    return (
      <div className="py-20 text-center text-slate-500 text-sm font-medium">
        Loading goals & milestones gallery...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-20 text-center text-rose-400 text-sm font-medium">
        Failed to load goals data.
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Trophy className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white">Goals & Milestones</h1>
              <p className="text-xs text-slate-400">
                Track active targets and showcase unlocked milestone trophies
              </p>
            </div>
          </div>
        </div>

        {/* Global Trophy Stat Badge */}
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-800">
          <Award className="w-5 h-5 text-amber-400" />
          <div className="text-xs">
            <span className="font-extrabold text-white">{data.total_unlocked}</span>
            <span className="text-slate-400"> / {data.total_milestones} Trophies Unlocked</span>
          </div>
        </div>
      </div>

      {/* Active Goal Progress Bars */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-400" />
            <h2 className="font-bold text-base text-white">Active Habit Targets</h2>
          </div>
          <span className="text-xs font-semibold text-slate-400">
            {data.total_active_goals} Goals Set
          </span>
        </div>

        {data.active_goals.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs font-medium border border-dashed border-slate-800 rounded-2xl">
            No active streak or monthly targets configured on your habits. Edit a habit to set a target!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.active_goals.map((g) => (
              <div
                key={`${g.habit_id}-${g.goal_type}`}
                className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md"
                      style={{ backgroundColor: g.color || "#6366f1" }}
                    >
                      {g.habit_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white">{g.habit_name}</h4>
                      <p className="text-[11px] text-slate-400 capitalize">
                        {g.goal_type === "streak" ? "Active Streak Target" : "30-Day Completion Target"}
                      </p>
                    </div>
                  </div>
                  {g.is_achieved && (
                    <span className="px-2.5 py-1 text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Achieved</span>
                    </span>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-300">
                      {g.current} / {g.target} {g.goal_type === "streak" ? "days" : "completions"}
                    </span>
                    <span className="text-indigo-400 font-bold">{g.progress_percent}%</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-500"
                      style={{ width: `${g.progress_percent}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Unlocked Milestones Trophy Gallery */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-400" />
          <h2 className="font-bold text-base text-white">Unlocked Milestone Badges</h2>
        </div>

        {data.unlocked_milestones.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs font-medium border border-dashed border-slate-800 rounded-2xl">
            No milestones unlocked yet. Log daily check-ins to earn your first trophy!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {data.unlocked_milestones.map((m) => (
              <motion.div
                key={m.id}
                initial={prefersReducedMotion ? false : { scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-950 border border-amber-500/30 backdrop-blur-md space-y-2 shadow-lg shadow-amber-500/5"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full">
                    UNLOCKED
                  </span>
                </div>
                <h4 className="font-bold text-sm text-white pt-1">{m.name}</h4>
                <p className="text-xs text-slate-400">{m.description}</p>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Locked Milestones Preview */}
      {data.locked_milestones.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-slate-500" />
            <h2 className="font-bold text-base text-slate-300">Upcoming Locked Trophies</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {data.locked_milestones.map((m) => (
              <div
                key={m.id}
                className="p-5 rounded-2xl bg-slate-950/40 border border-slate-800/60 opacity-60 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-500 flex items-center justify-center">
                    <Lock className="w-5 h-5" />
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-800 text-slate-400 rounded-full">
                    LOCKED
                  </span>
                </div>
                <h4 className="font-bold text-sm text-slate-300 pt-1">{m.name}</h4>
                <p className="text-xs text-slate-500">{m.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
