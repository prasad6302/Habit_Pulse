import React, { useState, useEffect } from "react";
import { X, Plus, Sparkles, Clock, Calendar, Palette, Dumbbell, BookOpen, Heart, Briefcase, Smile, Target } from "lucide-react";
import type { Habit, HabitCreate, HabitFrequency } from "../../services/api";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { motion, AnimatePresence } from "framer-motion";

interface HabitFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: HabitCreate) => Promise<void>;
  initialData?: Habit | null;
}

const CATEGORIES = ["Health", "Fitness", "Productivity", "Mindfulness", "Learning", "Work", "Personal"];
const COLOR_PRESETS = [
  "#6366f1", // Indigo
  "#ec4899", // Pink
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#a855f7", // Purple
  "#06b6d4", // Cyan
  "#ef4444", // Red
];

const ICONS = [
  { id: "dumbbell", label: "Fitness", Icon: Dumbbell },
  { id: "book", label: "Reading", Icon: BookOpen },
  { id: "heart", label: "Health", Icon: Heart },
  { id: "briefcase", label: "Work", Icon: Briefcase },
  { id: "smile", label: "Mindfulness", Icon: Smile },
  { id: "target", label: "Goal", Icon: Target },
  { id: "sparkles", label: "General", Icon: Sparkles },
];

const DAYS_OF_WEEK = [
  { id: 0, label: "Mon" },
  { id: 1, label: "Tue" },
  { id: 2, label: "Wed" },
  { id: 3, label: "Thu" },
  { id: 4, label: "Fri" },
  { id: 5, label: "Sat" },
  { id: 6, label: "Sun" },
];

export const HabitFormModal: React.FC<HabitFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Health");
  const [color, setColor] = useState("#6366f1");
  const [icon, setIcon] = useState("dumbbell");

  const [freqType, setFreqType] = useState<"daily" | "weekly" | "custom">("daily");
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [customDays, setCustomDays] = useState<number>(2);

  const [reminderTimes, setReminderTimes] = useState<string[]>(["08:00"]);
  const [newTime, setNewTime] = useState("09:00");

  const [goalStreak, setGoalStreak] = useState<number | undefined>(7);
  const [goalMonthly, setGoalMonthly] = useState<number | undefined>(20);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setDescription(initialData.description || "");
      setCategory(initialData.category || "Health");
      setColor(initialData.color || "#6366f1");
      setIcon(initialData.icon || "dumbbell");
      setFreqType((initialData.frequency.type as any) || "daily");
      setSelectedDays(initialData.frequency.days_of_week || [0, 1, 2, 3, 4, 5, 6]);
      setCustomDays(initialData.frequency.custom_interval_days || 2);
      setReminderTimes(initialData.reminder_times || []);
      setGoalStreak(initialData.goal_streak || undefined);
      setGoalMonthly(initialData.goal_completions_per_month || undefined);
    } else {
      setName("");
      setDescription("");
      setCategory("Health");
      setColor("#6366f1");
      setIcon("dumbbell");
      setFreqType("daily");
      setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
      setCustomDays(2);
      setReminderTimes(["08:00"]);
      setGoalStreak(7);
      setGoalMonthly(20);
    }
  }, [initialData, isOpen]);

  const toggleDay = (dayId: number) => {
    if (selectedDays.includes(dayId)) {
      if (selectedDays.length === 1) return;
      setSelectedDays(selectedDays.filter((d: number) => d !== dayId));
    } else {
      setSelectedDays([...selectedDays, dayId].sort());
    }
  };

  const handleAddReminder = () => {
    if (!reminderTimes.includes(newTime)) {
      setReminderTimes([...reminderTimes, newTime].sort());
    }
  };

  const handleRemoveReminder = (time: string) => {
    setReminderTimes(reminderTimes.filter((t: string) => t !== time));
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const frequencyPayload: HabitFrequency = {
        type: freqType,
        days_of_week: freqType === "weekly" ? selectedDays : null,
        custom_interval_days: freqType === "custom" ? Number(customDays) : null,
      };

      const payload: HabitCreate = {
        name: name.trim(),
        description: description.trim() || undefined,
        category,
        color,
        icon,
        frequency: frequencyPayload,
        reminder_times: reminderTimes,
        goal_streak: goalStreak ? Number(goalStreak) : undefined,
        goal_completions_per_month: goalMonthly ? Number(goalMonthly) : undefined,
      };

      await onSubmit(payload);
      onClose();
    } catch (err) {
      console.error("Error saving habit:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <motion.div
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-8"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shadow-inner"
                  style={{ backgroundColor: `${color}20`, color }}
                >
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-lg text-slate-100">
                    {initialData ? "Edit Habit" : "Create New Habit"}
                  </h2>
                  <p className="text-xs text-slate-400">Configure your daily ritual and reminders</p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitForm} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* Name & Description */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Habit Title *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Morning Meditation, Read 20 Pages"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Description (Optional)</label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Why is this habit important to you?"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 outline-none resize-none"
                  />
                </div>
              </div>

              {/* Category & Color Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm font-semibold rounded-xl px-3 py-2.5 outline-none"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                    <Palette className="w-3.5 h-3.5 text-indigo-400" />
                    Color Theme
                  </label>
                  <div className="flex items-center gap-2 pt-1">
                    {COLOR_PRESETS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={`w-7 h-7 rounded-full transition-transform ${
                          color === c ? "scale-110 ring-2 ring-white ring-offset-2 ring-offset-slate-900" : ""
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Icon Picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">Select Icon</label>
                <div className="grid grid-cols-7 gap-2">
                  {ICONS.map(({ id, label, Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setIcon(id)}
                      title={label}
                      className={`p-3 rounded-xl flex flex-col items-center justify-center transition-all ${
                        icon === id
                          ? "bg-indigo-600/30 border-2 border-indigo-500 text-indigo-300"
                          : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Frequency Settings */}
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-indigo-400" />
                  Repeat Frequency
                </label>

                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                  {(["daily", "weekly", "custom"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFreqType(t)}
                      className={`flex-1 py-2 text-xs font-semibold capitalize rounded-lg transition-all ${
                        freqType === t
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {freqType === "weekly" && (
                  <div className="flex justify-between gap-1 pt-1">
                    {DAYS_OF_WEEK.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => toggleDay(d.id)}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                          selectedDays.includes(d.id)
                            ? "bg-indigo-500/20 border border-indigo-500/50 text-indigo-300"
                            : "bg-slate-950 border border-slate-800 text-slate-500 hover:text-slate-300"
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                )}

                {freqType === "custom" && (
                  <div className="flex items-center gap-3 pt-1">
                    <span className="text-xs text-slate-400">Repeat every</span>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={customDays}
                      onChange={(e) => setCustomDays(Number(e.target.value))}
                      className="w-20 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-slate-100 font-semibold text-center outline-none"
                    />
                    <span className="text-xs text-slate-400">days</span>
                  </div>
                )}
              </div>

              {/* Reminders */}
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  Daily Web Push Reminders
                </label>

                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddReminder}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Time</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {reminderTimes.map((t: string) => (
                    <div
                      key={t}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-xs font-mono"
                    >
                      <span>{t}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveReminder(t)}
                        className="text-slate-500 hover:text-rose-400"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Goal Targets */}
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Streak Goal (Days)</label>
                  <input
                    type="number"
                    min={1}
                    value={goalStreak || ""}
                    onChange={(e) => setGoalStreak(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="7"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Monthly Target</label>
                  <input
                    type="number"
                    min={1}
                    value={goalMonthly || ""}
                    onChange={(e) => setGoalMonthly(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="20"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none"
                  />
                </div>
              </div>

              {/* Footer Submit Action */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span>{initialData ? "Save Changes" : "Create Habit"}</span>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
