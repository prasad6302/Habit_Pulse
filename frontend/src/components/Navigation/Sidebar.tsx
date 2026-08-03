import { useState } from "react";
import {
  CheckCircle2,
  BarChart3,
  Bell,
  LogOut,
  User,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Trophy,
  BookOpen,
  Library,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useAuthStore } from "../../context/useAuthStore";
import { useWebSocketStore } from "../../context/useWebSocketStore";

export type NavTabType =
  | "dashboard"
  | "analytics"
  | "goals"
  | "journal"
  | "templates"
  | "insights"
  | "profile"
  | "privacy"
  | "social"
  | "settings"
  | "habit-detail";

interface SidebarProps {
  activeTab: NavTabType;
  setActiveTab: (tab: NavTabType) => void;
  onOpenNewHabit: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onOpenNewHabit,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user, logout } = useAuthStore();
  const { status: wsStatus } = useWebSocketStore();

  const getStatusBadge = () => {
    if (wsStatus === "connected") {
      return (
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          {!isCollapsed && <span>Live Sync</span>}
        </div>
      );
    }
    if (wsStatus === "connecting") {
      return (
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-400">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
          {!isCollapsed && <span>Reconnecting...</span>}
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
        <span className="w-2 h-2 rounded-full bg-slate-600 shrink-0" />
        {!isCollapsed && <span>Offline</span>}
      </div>
    );
  };

  return (
    <aside
      className={`hidden lg:flex flex-col h-screen sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-r border-slate-200/80 transition-all duration-300 ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Header / Branding */}
      <div className="p-4 border-b border-slate-200/80 flex items-center justify-between">
        <div
          className="flex items-center gap-3 cursor-pointer overflow-hidden"
          onClick={() => setActiveTab("dashboard")}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/20">
            <CheckCircle2 className="w-6 h-6 text-white" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg text-slate-900 truncate">Habit Pulse</span>
                <span className="px-1.5 py-0.5 text-[9px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-full">
                  PRO
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium truncate">Daily Ritual Tracker</p>
            </div>
          )}
        </div>

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Primary Action Button */}
      <div className="p-4">
        <button
          onClick={onOpenNewHabit}
          className={`w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 hover:from-indigo-700 hover:to-pink-600 text-white font-bold text-xs shadow-md shadow-indigo-500/15 flex items-center justify-center gap-2 transition-all active:scale-95 ${
            isCollapsed ? "px-0" : "px-4"
          }`}
          title="Create New Habit"
        >
          <Sparkles className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span>New Habit</span>}
        </button>
      </div>

      {/* Navigation List Container with Independent Scrolling & Fade Overlays */}
      <div className="relative flex-1 min-h-0">
        <div className="absolute inset-x-0 top-0 h-4 bg-gradient-to-b from-white to-transparent pointer-events-none z-10 opacity-80" />
        <nav className="h-full overflow-y-auto px-3 py-1 space-y-1.5 scrollbar-thin">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "dashboard"
                ? "bg-indigo-50 border border-indigo-200 text-indigo-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
            }`}
            title="Dashboard"
          >
            <CheckCircle2 className="w-5 h-5 shrink-0 text-indigo-600" />
            {!isCollapsed && <span>Dashboard</span>}
          </button>

          <button
            onClick={() => setActiveTab("analytics")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "analytics"
                ? "bg-indigo-50 border border-indigo-200 text-indigo-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
            }`}
            title="Analytics"
          >
            <BarChart3 className="w-5 h-5 shrink-0 text-indigo-600" />
            {!isCollapsed && <span>Analytics</span>}
          </button>

          <button
            onClick={() => setActiveTab("goals")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "goals"
                ? "bg-indigo-50 border border-indigo-200 text-indigo-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
            }`}
            title="Goals & Milestones"
          >
            <Trophy className="w-5 h-5 shrink-0 text-amber-500" />
            {!isCollapsed && <span>Goals & Badges</span>}
          </button>

          <button
            onClick={() => setActiveTab("journal")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "journal"
                ? "bg-indigo-50 border border-indigo-200 text-indigo-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
            }`}
            title="Journal & Notes"
          >
            <BookOpen className="w-5 h-5 shrink-0 text-purple-600" />
            {!isCollapsed && <span>Journal & Notes</span>}
          </button>

          <button
            onClick={() => setActiveTab("templates")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "templates"
                ? "bg-indigo-50 border border-indigo-200 text-indigo-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
            }`}
            title="Habit Templates"
          >
            <Library className="w-5 h-5 shrink-0 text-pink-600" />
            {!isCollapsed && <span>Templates</span>}
          </button>

          <button
            onClick={() => setActiveTab("insights")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "insights"
                ? "bg-indigo-50 border border-indigo-200 text-indigo-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
            }`}
            title="Insights & Suggestions"
          >
            <Sparkles className="w-4 h-4 shrink-0 text-cyan-600" />
            {!isCollapsed && <span>Insights</span>}
          </button>

          <button
            onClick={() => setActiveTab("social")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "social"
                ? "bg-indigo-50 border border-indigo-200 text-indigo-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
            }`}
            title="Social & Challenges"
          >
            <Users className="w-5 h-5 shrink-0 text-amber-500" />
            {!isCollapsed && <span>Social & Challenges</span>}
          </button>

          <button
            onClick={() => setActiveTab("profile")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "profile"
                ? "bg-indigo-50 border border-indigo-200 text-indigo-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
            }`}
            title="My Profile"
          >
            <User className="w-5 h-5 shrink-0 text-indigo-600" />
            {!isCollapsed && <span>My Profile</span>}
          </button>

          <button
            onClick={() => setActiveTab("privacy")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "privacy"
                ? "bg-indigo-50 border border-indigo-200 text-indigo-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
            }`}
            title="Data & Privacy"
          >
            <ShieldCheck className="w-5 h-5 shrink-0 text-emerald-600" />
            {!isCollapsed && <span>Data & Privacy</span>}
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "settings"
                ? "bg-indigo-50 border border-indigo-200 text-indigo-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
            }`}
            title="Push & Settings"
          >
            <Bell className="w-5 h-5 shrink-0 text-indigo-600" />
            {!isCollapsed && <span>Push & Settings</span>}
          </button>
        </nav>
        <div className="absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-white to-transparent pointer-events-none z-10 opacity-80" />
      </div>

      {/* Connection Status & Profile Footer */}
      <div className="p-3 border-t border-slate-200/80 space-y-3 shrink-0">

        {/* Live WebSocket Status Indicator */}
        <div className={`px-3 py-2 rounded-xl bg-slate-100/80 border border-slate-200/80 flex items-center ${isCollapsed ? "justify-center" : "justify-between"}`}>
          {getStatusBadge()}
        </div>

        {/* User Pill & Logout */}
        <div className={`flex items-center gap-2 p-2 rounded-xl bg-slate-100/80 border border-slate-200/80 ${isCollapsed ? "justify-center" : "justify-between"}`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0 border border-indigo-200">
              <User className="w-4 h-4" />
            </div>
            {!isCollapsed && (
              <span className="text-xs font-semibold text-slate-700 truncate max-w-[110px]">
                {user?.email}
              </span>
            )}
          </div>

          <button
            onClick={logout}
            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-slate-200/80 transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
