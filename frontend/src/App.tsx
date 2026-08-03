import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Sidebar } from "./components/Navigation/Sidebar";
import type { NavTabType } from "./components/Navigation/Sidebar";
import { MobileHeader, MobileBottomNav } from "./components/Navigation/MobileNav";
import { NotificationBell } from "./components/Navigation/NotificationBell";
import { AuthView } from "./components/Auth/AuthView";
import { DashboardView } from "./components/Dashboard/DashboardView";
import { AnalyticsView } from "./components/Analytics/AnalyticsView";
import { SettingsView } from "./components/Settings/SettingsView";
import { GoalsView } from "./components/Goals/GoalsView";
import { HabitDetailView } from "./components/Habits/HabitDetailView";
import { JournalView } from "./components/Journal/JournalView";
import { TemplatesView } from "./components/Templates/TemplatesView";
import { InsightsView } from "./components/Insights/InsightsView";
import { ProfileView } from "./components/Profile/ProfileView";
import { PrivacyView } from "./components/Privacy/PrivacyView";
import { SocialView } from "./components/Social/SocialView";
import { HabitFormModal } from "./components/Habits/HabitFormModal";
import { useAuthStore } from "./context/useAuthStore";
import { useHabitStore } from "./context/useHabitStore";
import { useWebSocketStore } from "./context/useWebSocketStore";
import type { Habit, HabitCreate } from "./services/api";
import { Bell, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function App() {
  const { isAuthenticated, fetchProfile } = useAuthStore();
  const {
    habits,
    todayCheckIns,
    fetchHabits,
    fetchTodayCheckIns,
    createHabit,
    updateHabit,
    deleteHabit,
    togglePauseHabit,
    toggleCheckIn,
    isLoading: isLoadingHabits,
    error: habitError,
    clearError: clearHabitError,
  } = useHabitStore();


  const { connect: connectWS, disconnect: disconnectWS, activeToast, dismissToast } = useWebSocketStore();

  const [activeTab, setActiveTab] = useState<NavTabType>("dashboard");
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);

  // Clear stale error when tab changes
  useEffect(() => {
    clearHabitError();
  }, [activeTab]);

  // Check auth profile on mount
  useEffect(() => {
    fetchProfile();
  }, []);

  // Connect WebSocket & fetch data when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const todayStr = format(new Date(), "yyyy-MM-dd");
      fetchHabits();
      fetchTodayCheckIns(todayStr);

      // Establish WebSocket live sync
      connectWS();
    } else {
      disconnectWS();
    }

    return () => {
      disconnectWS();
    };
  }, [isAuthenticated]);

  // Keep selected habit in sync with habits list (in case of live WebSocket updates)
  useEffect(() => {
    if (selectedHabit) {
      const updated = habits.find((h) => h.id === selectedHabit.id);
      if (updated) {
        setSelectedHabit(updated);
      }
    }
  }, [habits]);

  const handleOpenCreateModal = () => {
    setEditingHabit(null);
    setIsFormModalOpen(true);
  };

  const handleEditHabit = (habit: Habit) => {
    setEditingHabit(habit);
    setIsFormModalOpen(true);
  };

  const handleSelectHabit = (habit: Habit) => {
    setSelectedHabit(habit);
    setActiveTab("habit-detail");
  };

  const handleFormSubmit = async (data: HabitCreate) => {
    if (editingHabit) {
      await updateHabit(editingHabit.id, data);
    } else {
      await createHabit(data);
    }
  };

  const handleToggleCheckIn = async (habitId: string) => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    await toggleCheckIn(habitId, todayStr);
  };

  const handleDeleteHabit = async (habitId: string) => {
    await deleteHabit(habitId);
    if (selectedHabit?.id === habitId) {
      setSelectedHabit(null);
      setActiveTab("dashboard");
    }
  };

  if (!isAuthenticated) {
    return <AuthView />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col lg:flex-row font-sans selection:bg-indigo-500 selection:text-white">
      {/* Desktop Sidebar (lg:flex) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNewHabit={handleOpenCreateModal}
      />

      {/* Mobile Top Header (lg:hidden) */}
      <MobileHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNewHabit={handleOpenCreateModal}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Desktop Top Header Bar with Notification Bell */}
        <header className="hidden lg:flex items-center justify-end px-8 pt-6 pb-2">
          <NotificationBell />
        </header>

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 pb-24 lg:pb-8">
          {/* Live In-App Notification Toast */}
          <AnimatePresence>
            {activeToast && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mb-6 p-4 rounded-2xl bg-white border border-indigo-200 shadow-xl shadow-indigo-500/5 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">{activeToast.title}</h4>
                    <p className="text-xs text-slate-600 mt-0.5">{activeToast.body}</p>
                  </div>
                </div>
                <button
                  onClick={dismissToast}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {habitError && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center justify-between">
              <span>{habitError}</span>
              <button
                onClick={clearHabitError}
                className="p-1 rounded-lg text-rose-300 hover:text-white hover:bg-rose-500/20 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {activeTab === "dashboard" && (
            <DashboardView
              habits={habits}
              todayCheckIns={todayCheckIns}
              isLoading={isLoadingHabits}
              onToggleCheckIn={handleToggleCheckIn}
              onOpenCreateModal={handleOpenCreateModal}
              onEditHabit={handleEditHabit}
              onDeleteHabit={handleDeleteHabit}
              onTogglePauseHabit={togglePauseHabit}
              onSelectHabit={handleSelectHabit}
            />
          )}


          {activeTab === "analytics" && <AnalyticsView habits={habits} />}

          {activeTab === "goals" && <GoalsView />}

          {activeTab === "journal" && <JournalView />}

          {activeTab === "templates" && (
            <TemplatesView
              onHabitAdopted={() => {
                fetchHabits();
                setActiveTab("dashboard");
              }}
            />
          )}

          {activeTab === "insights" && <InsightsView />}

          {activeTab === "profile" && <ProfileView />}

          {activeTab === "privacy" && <PrivacyView />}

          {activeTab === "social" && <SocialView />}

          {activeTab === "settings" && <SettingsView />}

          {activeTab === "habit-detail" && selectedHabit && (
            <HabitDetailView
              habit={selectedHabit}
              onBack={() => setActiveTab("dashboard")}
              onEdit={handleEditHabit}
              onDelete={handleDeleteHabit}
            />
          )}
        </main>
      </div>

      {/* Mobile Fixed Bottom Navigation Bar (lg:hidden) */}
      <MobileBottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Habit Form Modal */}
      <HabitFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingHabit(null);
        }}
        onSubmit={handleFormSubmit}
        initialData={editingHabit}
      />
    </div>
  );
}

export default App;
