import React, { useState } from "react";
import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import {
  Check,
  Flame,
  Clock,
  Edit2,
  Trash2,
  Calendar,
  Award,
  Sparkles,
  BookOpen,
  Dumbbell,
  Heart,
  Briefcase,
  Smile,
  Target,
  Pause,
  Play,
} from "lucide-react";
import type { Habit, CheckInResponse } from "../../services/api";
import { useReducedMotion } from "../../hooks/useReducedMotion";

interface HabitCardProps {
  habit: Habit;
  checkIn?: CheckInResponse;
  onToggle: (habitId: string) => Promise<void>;
  onEdit: (habit: Habit) => void;
  onDelete: (habitId: string) => void;
  onTogglePause?: (habitId: string) => void;
  onSelect?: (habit: Habit) => void;
  streak?: number;
}

const getIconComponent = (iconName: string) => {
  switch (iconName.toLowerCase()) {
    case "dumbbell":
    case "fitness":
      return Dumbbell;
    case "book":
    case "reading":
      return BookOpen;
    case "heart":
    case "health":
      return Heart;
    case "briefcase":
    case "work":
      return Briefcase;
    case "smile":
    case "mindfulness":
      return Smile;
    case "target":
      return Target;
    default:
      return Sparkles;
  }
};

export const HabitCard: React.FC<HabitCardProps> = ({
  habit,
  checkIn,
  onToggle,
  onEdit,
  onDelete,
  onTogglePause,
  onSelect,
  streak = 0,
}) => {
  const isCompleted = !!checkIn;
  const IconComp = getIconComponent(habit.icon);
  const shouldReduceMotion = useReducedMotion();
  const [isCheckInPopping, setIsCheckInPopping] = useState(false);

  // Check if streak reaches or exceeds milestone targets (e.g. goal streak or 7+ days)
  const isMilestoneReached = habit.goal_streak ? streak >= habit.goal_streak : streak >= 7;

  const handleCheckboxClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // Reward Moment #1 & #3: Habit check-in + streak milestone reward pop
    if (!isCompleted && !shouldReduceMotion) {
      setIsCheckInPopping(true);
      setTimeout(() => setIsCheckInPopping(false), 300);

      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const x = (rect.left + rect.width / 2) / window.innerWidth;
      const y = (rect.top + rect.height / 2) / window.innerHeight;

      confetti({
        particleCount: isMilestoneReached ? 55 : 35,
        spread: isMilestoneReached ? 70 : 50,
        origin: { x, y },
        colors: [habit.color || "#6366f1", "#f59e0b", "#ec4899", "#10b981"],
        disableForReducedMotion: true,
      });
    }

    await onToggle(habit.id);
  };

  const getFrequencyLabel = () => {
    const f = habit.frequency;
    if (f.type === "daily") return "Everyday";
    if (f.type === "weekly") return `${f.days_of_week?.length || 0}x / week`;
    return `Every ${f.custom_interval_days} days`;
  };

  return (
    <motion.div
      layout
      animate={
        isCheckInPopping && !shouldReduceMotion
          ? { scale: [1, 1.03, 1] }
          : { scale: 1 }
      }
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`group relative bg-white rounded-2xl p-5 border transition-all duration-150 shadow-sm hover:shadow-md ${
        habit.is_paused
          ? "opacity-75 bg-amber-50/40 border-amber-200"
          : isCompleted
          ? "border-emerald-300 bg-emerald-50/40 shadow-emerald-500/5"
          : "border-slate-200/80 hover:border-indigo-200 hover:scale-[1.01]"
      }`}
    >
      {/* Top row: Category tag, Paused badge & Actions */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className="px-2.5 py-1 rounded-lg text-[11px] font-bold tracking-wide uppercase border"
            style={{
              backgroundColor: `${habit.color}15`,
              color: habit.color || "#6366f1",
              borderColor: `${habit.color}30`,
            }}
          >
            {habit.category}
          </span>

          <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
            <Calendar className="w-3 h-3 text-slate-400" />
            {getFrequencyLabel()}
          </span>

          {habit.is_paused && (
            <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Pause className="w-2.5 h-2.5" /> Paused
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
          {onTogglePause && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTogglePause(habit.id);
              }}
              className={`p-1.5 rounded-lg transition-colors ${
                habit.is_paused
                  ? "text-amber-600 hover:text-amber-700 hover:bg-amber-100"
                  : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              }`}
              title={habit.is_paused ? "Resume Habit" : "Pause Habit (Vacation Mode)"}
            >
              {habit.is_paused ? <Play className="w-3.5 h-3.5 fill-amber-500/20" /> : <Pause className="w-3.5 h-3.5" />}
            </button>
          )}
          <button
            onClick={() => onEdit(habit)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Edit Habit"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(habit.id)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors"
            title="Delete Habit"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Center Content: Icon, Title & Checkbox */}
      <div className="flex items-center justify-between gap-4">
        <div
          className="flex items-center gap-3.5 min-w-0 cursor-pointer group/title"
          onClick={() => onSelect?.(habit)}
          title="View Habit Details"
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-inner group-hover/title:scale-105 transition-transform"
            style={{
              backgroundColor: `${habit.color}20`,
              color: habit.color || "#6366f1",
            }}
          >
            <IconComp className="w-6 h-6" />
          </div>

          <div className="min-w-0">
            <h3
              title={habit.name}
              className={`font-bold text-base tracking-tight truncate transition-colors duration-150 group-hover/title:text-indigo-600 ${
                isCompleted ? "line-through text-slate-400" : "text-slate-900"
              }`}
            >
              {habit.name}
            </h3>
            {habit.description && (
              <p title={habit.description} className="text-xs text-slate-500 truncate mt-0.5">
                {habit.description}
              </p>
            )}
          </div>
        </div>

        {/* Big Checkbox Button */}
        <button
          onClick={handleCheckboxClick}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-150 shrink-0 ${
            isCompleted
              ? "bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-500/20"
              : "bg-slate-100 hover:bg-slate-200 text-slate-500 border border-slate-200 active:scale-95"
          }`}
        >
          <Check className={`w-6 h-6 ${isCompleted ? "stroke-[3]" : "stroke-[2]"}`} />
        </button>
      </div>

      {/* Footer Info: Reward Moment #3 - Streak Milestone Badge */}
      <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <motion.div
            animate={
              isCheckInPopping && isMilestoneReached && !shouldReduceMotion
                ? { scale: [1, 1.1, 1] }
                : { scale: 1 }
            }
            transition={{ duration: 0.25 }}
            className={`flex items-center gap-1.5 font-semibold px-2.5 py-0.5 rounded-full ${
              isMilestoneReached
                ? "text-amber-700 bg-amber-100 border border-amber-300 shadow-sm"
                : "text-amber-700 bg-amber-50 border border-amber-200"
            }`}
          >
            <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
            <span>{streak} day streak</span>
          </motion.div>

          {habit.goal_streak && (
            <span className="text-slate-500 text-[11px] flex items-center gap-1">
              <Award className="w-3 h-3 text-indigo-600" />
              Goal: {habit.goal_streak}d
            </span>
          )}
        </div>

        {habit.reminder_times && habit.reminder_times.length > 0 && (
          <div className="flex items-center gap-1 text-slate-500 text-[11px]">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>{habit.reminder_times.join(", ")}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};
