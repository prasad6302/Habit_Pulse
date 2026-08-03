import React, { useState } from "react";
import {
  CheckCircle2,
  BarChart3,
  Bell,
  LogOut,
  Sparkles,
  Trophy,
  MoreHorizontal,
  BookOpen,
  Library,
  User,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { useAuthStore } from "../../context/useAuthStore";
import { useWebSocketStore } from "../../context/useWebSocketStore";
import type { NavTabType } from "./Sidebar";

interface MobileNavProps {
  activeTab: NavTabType;
  setActiveTab: (tab: NavTabType) => void;
  onOpenNewHabit?: () => void;
}

export const MobileHeader: React.FC<MobileNavProps> = ({
  setActiveTab,
  onOpenNewHabit,
}) => {
  const { logout } = useAuthStore();
  const { status: wsStatus } = useWebSocketStore();

  return (
    <header className="lg:hidden sticky top-0 z-40 w-full backdrop-blur-md bg-white/90 border-b border-slate-200/80 px-4 h-14 flex items-center justify-between shadow-sm">
      {/* Brand Logo */}
      <div
        className="flex items-center gap-2.5 cursor-pointer"
        onClick={() => setActiveTab("dashboard")}
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-pink-500 flex items-center justify-center shadow-md">
          <CheckCircle2 className="w-5 h-5 text-white" />
        </div>
        <span className="font-extrabold text-base text-slate-900">Habit Pulse</span>

        {/* WebSocket Live Status Dot */}
        <span
          title={`WebSocket Status: ${wsStatus}`}
          className={`w-2 h-2 rounded-full ${
            wsStatus === "connected"
              ? "bg-emerald-500"
              : wsStatus === "connecting"
              ? "bg-amber-500 animate-ping"
              : "bg-slate-400"
          }`}
        />
      </div>

      {/* Right Header Actions */}
      <div className="flex items-center gap-2">
        {onOpenNewHabit && (
          <button
            onClick={onOpenNewHabit}
            className="p-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold shadow-md shadow-indigo-500/15 flex items-center gap-1 active:scale-95"
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-[11px]">Habit</span>
          </button>
        )}

        <button
          onClick={logout}
          className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-slate-100 transition-colors"
          title="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};

export const MobileBottomNav: React.FC<Omit<MobileNavProps, "onOpenNewHabit">> = ({
  activeTab,
  setActiveTab,
}) => {
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  return (
    <>
      {/* Mobile Overflow Menu Drawer */}
      {isMoreOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex flex-col justify-end p-4 animate-fadeIn"
          onClick={() => setIsMoreOpen(false)}
        >
          <div
            className="bg-white border border-slate-200/80 rounded-3xl p-5 space-y-3 shadow-2xl max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
              <h3 className="font-bold text-sm text-slate-900">More Views & Tools</h3>
              <button
                onClick={() => setIsMoreOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                onClick={() => {
                  setActiveTab("journal");
                  setIsMoreOpen(false);
                }}
                className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-colors ${
                  activeTab === "journal"
                    ? "bg-purple-50 border-purple-200 text-purple-700"
                    : "bg-slate-50 border-slate-200/80 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <BookOpen className="w-5 h-5 text-purple-600 shrink-0" />
                <div>
                  <div className="text-xs font-bold">Journal</div>
                  <div className="text-[10px] text-slate-500">Notes Log</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setActiveTab("templates");
                  setIsMoreOpen(false);
                }}
                className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-colors ${
                  activeTab === "templates"
                    ? "bg-pink-50 border-pink-200 text-pink-700"
                    : "bg-slate-50 border-slate-200/80 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <Library className="w-5 h-5 text-pink-600 shrink-0" />
                <div>
                  <div className="text-xs font-bold">Templates</div>
                  <div className="text-[10px] text-slate-500">Habit Catalog</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setActiveTab("insights");
                  setIsMoreOpen(false);
                }}
                className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-colors ${
                  activeTab === "insights"
                    ? "bg-cyan-50 border-cyan-200 text-cyan-700"
                    : "bg-slate-50 border-slate-200/80 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <Sparkles className="w-5 h-5 text-cyan-600 shrink-0" />
                <div>
                  <div className="text-xs font-bold">Insights</div>
                  <div className="text-[10px] text-slate-500">Data Patterns</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setActiveTab("social");
                  setIsMoreOpen(false);
                }}
                className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-colors ${
                  activeTab === "social"
                    ? "bg-amber-50 border-amber-200 text-amber-700"
                    : "bg-slate-50 border-slate-200/80 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <Users className="w-5 h-5 text-amber-500 shrink-0" />
                <div>
                  <div className="text-xs font-bold">Social</div>
                  <div className="text-[10px] text-slate-500">Leaderboard</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setActiveTab("profile");
                  setIsMoreOpen(false);
                }}
                className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-colors ${
                  activeTab === "profile"
                    ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                    : "bg-slate-50 border-slate-200/80 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <User className="w-5 h-5 text-indigo-600 shrink-0" />
                <div>
                  <div className="text-xs font-bold">Profile</div>
                  <div className="text-[10px] text-slate-500">My Account</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setActiveTab("privacy");
                  setIsMoreOpen(false);
                }}
                className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-colors ${
                  activeTab === "privacy"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                    : "bg-slate-50 border-slate-200/80 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <div className="text-xs font-bold">Data Control</div>
                  <div className="text-[10px] text-slate-500">Export & Privacy</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setActiveTab("settings");
                  setIsMoreOpen(false);
                }}
                className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-colors ${
                  activeTab === "settings"
                    ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                    : "bg-slate-50 border-slate-200/80 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <Bell className="w-5 h-5 text-indigo-600 shrink-0" />
                <div>
                  <div className="text-xs font-bold">Settings</div>
                  <div className="text-[10px] text-slate-500">Notifications</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fixed Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200/80 px-3 py-2 flex items-center justify-around shadow-2xl">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            activeTab === "dashboard"
              ? "text-indigo-600 font-bold"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <CheckCircle2 className="w-5 h-5" />
          <span className="text-[10px]">Dashboard</span>
        </button>

        <button
          onClick={() => setActiveTab("analytics")}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            activeTab === "analytics"
              ? "text-indigo-600 font-bold"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          <span className="text-[10px]">Analytics</span>
        </button>

        <button
          onClick={() => setActiveTab("goals")}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            activeTab === "goals"
              ? "text-amber-600 font-bold"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <Trophy className="w-5 h-5" />
          <span className="text-[10px]">Goals</span>
        </button>

        <button
          onClick={() => setIsMoreOpen(true)}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            ["journal", "templates", "insights", "profile", "privacy", "social", "settings"].includes(activeTab)
              ? "text-indigo-600 font-bold"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <MoreHorizontal className="w-5 h-5" />
          <span className="text-[10px]">More</span>
        </button>
      </nav>
    </>
  );
};
