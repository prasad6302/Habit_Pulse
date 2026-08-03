import React, { useState, useMemo } from "react";
import { format } from "date-fns";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Trophy,
  Calendar,
  Layers,
  Sparkles,
} from "lucide-react";
import type { Habit, CheckInResponse } from "../../services/api";
import { HabitCard } from "../Habits/HabitCard";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { DashboardSkeleton } from "../Common/Skeleton";

interface DashboardViewProps {
  habits: Habit[];
  todayCheckIns: Record<string, CheckInResponse>;
  isLoading?: boolean;
  onToggleCheckIn: (habitId: string) => Promise<void>;
  onOpenCreateModal: () => void;
  onEditHabit: (habit: Habit) => void;
  onDeleteHabit: (habitId: string) => void;
  onTogglePauseHabit?: (habitId: string) => void;
  onSelectHabit?: (habit: Habit) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  habits,
  todayCheckIns,
  isLoading = false,
  onToggleCheckIn,
  onOpenCreateModal,
  onEditHabit,
  onDeleteHabit,
  onTogglePauseHabit,
  onSelectHabit,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "completed">("all");
  const shouldReduceMotion = useReducedMotion();

  const categories = useMemo(() => {
    const cats = new Set<string>();
    habits.forEach((h) => cats.add(h.category));
    return ["All", ...Array.from(cats)];
  }, [habits]);

  const filteredHabits = useMemo(() => {
    return habits.filter((h) => {
      const matchesSearch =
        h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (h.description && h.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCat = selectedCategory === "All" || h.category === selectedCategory;

      const isCompleted = !!todayCheckIns[h.id];
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "completed" && isCompleted) ||
        (statusFilter === "pending" && !isCompleted);

      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [habits, searchQuery, selectedCategory, statusFilter, todayCheckIns]);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const todayFormatted = format(new Date(), "EEEE, MMMM d, yyyy");


  const totalHabits = habits.length;
  const completedCount = Object.keys(todayCheckIns).length;
  const progressPercent = totalHabits > 0 ? Math.round((completedCount / totalHabits) * 100) : 0;

  // Reward Moment #3: Celebration confetti on 100% completion
  const triggerAllCompleteConfetti = () => {
    if (shouldReduceMotion) return;

    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      disableForReducedMotion: true,
    });
  };

  // Performance cap on stagger animations for large datasets (>15 items)
  const isLargeDataset = filteredHabits.length > 15;

  return (
    <div className="space-y-8 pb-12">
      {/* Top Banner Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 border border-indigo-700 p-6 sm:p-8 shadow-xl text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-200 uppercase tracking-widest mb-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>{todayFormatted}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Today's Rituals
            </h1>
            <p className="text-indigo-100 text-sm mt-1 max-w-lg">
              {progressPercent === 100 && totalHabits > 0
                ? "🎉 All daily rituals completed!"
                : `You've completed ${completedCount} of ${totalHabits} daily habits.`}
            </p>
          </div>

          {/* Reward Moment #3: Progress Circle with smooth stroke animation */}
          <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 shrink-0">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-white/20"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-emerald-400 transition-all duration-300 ease-out"
                  strokeDasharray={`${progressPercent}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute font-extrabold text-sm text-white">{progressPercent}%</span>
            </div>

            <div>
              <div className="text-xs font-semibold text-indigo-100">Daily Completion</div>
              <div className="text-lg font-bold text-white mt-0.5">
                {completedCount} / {totalHabits} Done
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 100% Completion Banner (No bounce animation) */}
      {progressPercent === 100 && totalHabits > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border border-emerald-200 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <Trophy className="w-6 h-6 text-amber-500 shrink-0" />
            <div>
              <span className="font-bold text-sm text-slate-900">Daily Goal Complete!</span>
              <p className="text-xs text-slate-600">All rituals completed for today.</p>
            </div>
          </div>
          {!shouldReduceMotion && (
            <button
              onClick={triggerAllCompleteConfetti}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm"
            >
              Celebrate 🎊
            </button>
          )}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search habits..."
            className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none shadow-sm"
          />
        </div>

        {/* Categories & Status */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
            {(["all", "pending", "completed"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all duration-150 ${
                  statusFilter === st
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-white border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl px-3 py-2 outline-none shadow-sm"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === "All" ? "All Categories" : c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Habit Cards Grid (Responsive auto-fill grid layout) */}
      {filteredHabits.length > 0 ? (
        <motion.div layout className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-5">

          <AnimatePresence mode="popLayout">
            {filteredHabits.map((habit, idx) => {
              // Capped stagger to prevent jank on large datasets (>15 habits or index >= 10)
              const delay =
                shouldReduceMotion || isLargeDataset || idx >= 10
                  ? 0
                  : idx * 0.03;

              return (
                <motion.div
                  key={habit.id}
                  layout={!shouldReduceMotion}
                  initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, delay, ease: "easeOut" }}
                >
                  <HabitCard
                    habit={habit}
                    checkIn={todayCheckIns[habit.id]}
                    onToggle={onToggleCheckIn}
                    onEdit={onEditHabit}
                    onDelete={onDeleteHabit}
                    onTogglePause={onTogglePauseHabit}
                    onSelect={onSelectHabit}
                    streak={habit.goal_streak || 0}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      ) : habits.length === 0 ? (
        /* Empty State A: Zero Habits Total */
        <div className="py-20 text-center bg-slate-900/50 backdrop-blur-md rounded-3xl border border-dashed border-slate-800 flex flex-col items-center justify-center p-8 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-pink-500/20 via-purple-500/20 to-indigo-500/20 border border-purple-500/30 text-pink-400 flex items-center justify-center mb-5 shadow-lg shadow-purple-500/10 animate-pulse">
            <Sparkles className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-extrabold text-white tracking-tight">
            Start Your First Daily Ritual
          </h3>
          <p className="text-slate-400 text-xs mt-2 max-w-md leading-relaxed">
            Build lasting consistency with streak tracking, analytics, and automated reminders. Add your first habit in seconds to begin your transformation!
          </p>
          <button
            onClick={onOpenCreateModal}
            className="mt-6 px-6 py-3 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-xs font-bold shadow-lg shadow-rose-500/25 flex items-center gap-2 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Habit</span>
          </button>
        </div>
      ) : (
        /* Empty State B: Zero Search / Filter Matches */
        <div className="py-16 text-center bg-slate-900/40 rounded-3xl border border-dashed border-slate-800/80 flex flex-col items-center justify-center p-8 shadow-inner">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mb-4">
            <Layers className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-200">No Habits Match Your Filters</h3>
          <p className="text-slate-400 text-xs mt-1.5 max-w-sm">
            {searchQuery
              ? `No active habits matching "${searchQuery}". Try refining your search or filter selections.`
              : "No active habits found for the selected category and status filters."}
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("All");
              setStatusFilter("all");
            }}
            className="mt-5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all flex items-center gap-2"
          >
            <span>Reset Search & Filters</span>
          </button>
        </div>
      )}

    </div>
  );
};
