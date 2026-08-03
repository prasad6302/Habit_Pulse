import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  BookOpen,
  Search,
  MessageSquare,
} from "lucide-react";
import { journalService } from "../../services/api";
import type { JournalItem } from "../../services/api";

const MOOD_EMOJIS: Record<string, { emoji: string; label: string; color: string }> = {
  great: { emoji: "😄", label: "Great", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
  good: { emoji: "🙂", label: "Good", color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/30" },
  okay: { emoji: "😐", label: "Okay", color: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
  bad: { emoji: "🙁", label: "Bad", color: "text-rose-400 bg-rose-500/10 border-rose-500/30" },
  terrible: { emoji: "😫", label: "Terrible", color: "text-purple-400 bg-purple-500/10 border-purple-500/30" },
};

export const JournalView: React.FC = () => {
  const [items, setItems] = useState<JournalItem[]>([]);
  const [availableHabits, setAvailableHabits] = useState<Array<{ id: string; name: string }>>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedHabitId, setSelectedHabitId] = useState<string>("all");
  const [selectedMood, setSelectedMood] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);

  const loadFeed = async () => {
    setIsLoading(true);
    try {
      const res = await journalService.getFeed({
        q: searchQuery || undefined,
        habit_id: selectedHabitId !== "all" ? selectedHabitId : undefined,
        mood: selectedMood !== "all" ? selectedMood : undefined,
      });
      setItems(res.items);
      setAvailableHabits(res.available_habits);
    } catch (err) {
      console.error("Failed to load journal feed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFeed();
  }, [searchQuery, selectedHabitId, selectedMood]);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white">Journal & Notes Feed</h1>
            <p className="text-xs text-slate-400">
              Chronological log of all check-in thoughts, notes, and mood ratings
            </p>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-md flex flex-col md:flex-row items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search notes or habit names..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Habit Dropdown Filter */}
        <select
          value={selectedHabitId}
          onChange={(e) => setSelectedHabitId(e.target.value)}
          className="w-full md:w-48 px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
        >
          <option value="all">All Habits</option>
          {availableHabits.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>

        {/* Mood Filter Pill Group */}
        <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto py-1">
          <button
            onClick={() => setSelectedMood("all")}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors shrink-0 ${
              selectedMood === "all"
                ? "bg-indigo-600 text-white"
                : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
            }`}
          >
            All Moods
          </button>
          {Object.entries(MOOD_EMOJIS).map(([key, val]) => (
            <button
              key={key}
              onClick={() => setSelectedMood(key)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1 shrink-0 ${
                selectedMood === key
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
              }`}
            >
              <span>{val.emoji}</span>
              <span className="capitalize">{key}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Feed List */}
      {isLoading ? (
        <div className="py-20 text-center text-slate-500 text-xs font-medium">
          Loading journal notes...
        </div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center bg-slate-900/40 rounded-3xl border border-dashed border-slate-800 flex flex-col items-center justify-center p-6">
          <MessageSquare className="w-8 h-8 text-slate-600 mb-3" />
          <h3 className="text-base font-bold text-slate-300">No Journal Notes Found</h3>
          <p className="text-slate-500 text-xs mt-1 max-w-sm">
            {searchQuery || selectedHabitId !== "all" || selectedMood !== "all"
              ? "No entries match your search and filter criteria."
              : "When checking in on habits, add a note or mood rating to build your personal reflective journal!"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const moodObj = item.mood ? MOOD_EMOJIS[item.mood] : null;
            return (
              <div
                key={item.id}
                className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md space-y-3 shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-sm"
                      style={{ backgroundColor: item.color || "#6366f1" }}
                    >
                      {item.habit_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-white">{item.habit_name}</h4>
                      <p className="text-[10px] text-slate-400">{item.category}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {moodObj && (
                      <span
                        className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border flex items-center gap-1 ${moodObj.color}`}
                      >
                        <span>{moodObj.emoji}</span>
                        <span>{moodObj.label}</span>
                      </span>
                    )}
                    <span className="text-[10px] text-slate-500 font-mono">
                      {format(new Date(item.completed_date), "MMM d, yyyy")}
                    </span>
                  </div>
                </div>

                {item.notes && (
                  <p className="text-xs text-slate-200 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
                    "{item.notes}"
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
