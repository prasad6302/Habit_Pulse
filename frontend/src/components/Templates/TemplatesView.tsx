import React, { useEffect, useState } from "react";
import {
  Library,
  Plus,
  CheckCircle2,
  Calendar,
  Award,
} from "lucide-react";
import { templatesService } from "../../services/api";
import type { HabitTemplate } from "../../services/api";

interface TemplatesViewProps {
  onHabitAdopted?: () => void;
}

export const TemplatesView: React.FC<TemplatesViewProps> = ({ onHabitAdopted }) => {
  const [catalog, setCatalog] = useState<HabitTemplate[]>([]);
  const [adoptingId, setAdoptingId] = useState<string | null>(null);
  const [adoptedIds, setAdoptedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const list = await templatesService.getCatalog();
      setCatalog(list);
    } catch (err) {
      console.error("Failed to load habit templates:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleAdopt = async (tpl: HabitTemplate) => {
    setAdoptingId(tpl.id);
    try {
      await templatesService.adopt(tpl.id);
      setAdoptedIds((prev) => new Set(prev).add(tpl.id));
      if (onHabitAdopted) {
        onHabitAdopted();
      }
    } catch (err) {
      console.error("Failed to adopt template:", err);
    } finally {
      setAdoptingId(null);
    }
  };

  const getFrequencyText = (f: HabitTemplate["frequency"]) => {
    if (f.type === "daily") return "Daily Everyday";
    if (f.type === "weekly") {
      const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const names = (f.days_of_week || []).map((d) => days[d]).join(", ");
      return `Weekly (${names})`;
    }
    return `Every ${f.custom_interval_days} days`;
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-500 to-rose-500 flex items-center justify-center shadow-lg shadow-pink-500/20">
            <Library className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white">Habit Templates Library</h1>
            <p className="text-xs text-slate-400">
              Explore curated rituals with pre-configured frequencies, goals, and reminder schedules
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-slate-500 text-xs font-medium">
          Loading templates catalog...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {catalog.map((tpl) => {
            const isAdopted = adoptedIds.has(tpl.id);
            const isAdopting = adoptingId === tpl.id;

            return (
              <div
                key={tpl.id}
                className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md"
                        style={{ backgroundColor: tpl.color }}
                      >
                        {tpl.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-white">{tpl.name}</h4>
                        <span className="px-2 py-0.5 text-[9px] font-bold bg-slate-800 text-slate-300 rounded-full border border-slate-700">
                          {tpl.category}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">{tpl.description}</p>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 font-medium">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                      {getFrequencyText(tpl.frequency)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-amber-400" />
                      Goal: {tpl.goal_streak}d streak
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80">
                  <button
                    onClick={() => handleAdopt(tpl)}
                    disabled={isAdopted || isAdopting}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 ${
                      isAdopted
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default"
                        : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white"
                    }`}
                  >
                    {isAdopted ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Added to My Habits ✅</span>
                      </>
                    ) : isAdopting ? (
                      <span>Adding...</span>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>Add to My Habits</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
