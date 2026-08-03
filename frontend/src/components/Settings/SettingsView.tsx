import React, { useState, useEffect } from "react";
import {
  Bell,
  Send,
  ShieldCheck,
  Clock,
  Globe,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { useNotificationStore } from "../../context/useNotificationStore";
import { useAuthStore } from "../../context/useAuthStore";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { motion, AnimatePresence } from "framer-motion";

export const SettingsView: React.FC = () => {
  const {
    logs,
    isLoading: notifLoading,
    error: notifError,
    init,
    fetchLogs,
    sendTestPush,
  } = useNotificationStore();

  const { user, updateProfile, isLoading: authLoading } = useAuthStore();
  const shouldReduceMotion = useReducedMotion();

  // Profile forms
  const [timezone, setTimezone] = useState(user?.timezone || "UTC");
  const [quietStart, setQuietStart] = useState(user?.quiet_hours_start || "22:00");
  const [quietEnd, setQuietEnd] = useState(user?.quiet_hours_end || "07:00");
  const [globalEnabled, setGlobalEnabled] = useState(user?.global_notifications_enabled ?? true);

  // Test Push Form
  const [testTitle, setTestTitle] = useState("Habit Reminder 🔔");
  const [testBody, setTestBody] = useState("Time to complete your daily ritual!");
  const [testSuccess, setTestSuccess] = useState(false);

  useEffect(() => {
    init();
    fetchLogs();
  }, []);

  useEffect(() => {
    if (user) {
      setTimezone(user.timezone || "UTC");
      setQuietStart(user.quiet_hours_start || "22:00");
      setQuietEnd(user.quiet_hours_end || "07:00");
      setGlobalEnabled(user.global_notifications_enabled ?? true);
    }
  }, [user]);

  const handleSendTestPush = async (e: React.FormEvent) => {
    e.preventDefault();
    setTestSuccess(false);
    try {
      await sendTestPush(testTitle, testBody);
      setTestSuccess(true);
      setTimeout(() => setTestSuccess(false), 4000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveProfileSettings = async () => {
    try {
      await updateProfile({
        timezone,
        quiet_hours_start: quietStart,
        quiet_hours_end: quietEnd,
        global_notifications_enabled: globalEnabled,
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8 pb-12 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Notifications & Preferences
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Manage Web Push VAPID notifications, quiet hours, and timezone configuration.
        </p>
      </div>

      {/* Error banner (Respects shouldReduceMotion) */}
      <AnimatePresence>
        {notifError && (
          <motion.div
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{notifError}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Email Notifications & Delivery Settings Card */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                Email Notifications (Resend API)
                <span className="px-2.5 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                  Active Delivery
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Delivered directly to <strong className="text-slate-800">{user?.email}</strong>
              </p>
            </div>
          </div>

          <div className="px-3.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-medium text-slate-600 flex items-center gap-1.5">
            <span>📱 Mobile Push:</span>
            <span className="text-amber-600 font-bold">Coming Soon</span>
          </div>
        </div>

        {/* Test Email Delivery Form */}
        <form onSubmit={handleSendTestPush} className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200/80 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
            <Send className="w-4 h-4 text-indigo-600" />
            <span>Send Test Email Notification</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              value={testTitle}
              onChange={(e) => setTestTitle(e.target.value)}
              placeholder="Email Subject Title"
              className="bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500 shadow-sm"
            />
            <input
              type="text"
              value={testBody}
              onChange={(e) => setTestBody(e.target.value)}
              placeholder="Email Message Body"
              className="bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500 shadow-sm"
            />
          </div>

          <div className="flex items-center justify-between">
            {testSuccess ? (
              <motion.span
                initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-xs text-emerald-600 font-semibold flex items-center gap-1"
              >
                <CheckCircle2 className="w-4 h-4" /> Test email sent to {user?.email}!
              </motion.span>
            ) : (
              <span className="text-[11px] text-slate-500">Dispatches real test email via Resend API</span>
            )}

            <button
              type="submit"
              disabled={notifLoading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
            >
              Send Test Email Now 📧
            </button>
          </div>
        </form>
      </div>

      {/* Schedule & Quiet Hours Preferences */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
        <h3 className="font-bold text-base text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-4">
          <Clock className="w-5 h-5 text-indigo-600" />
          Quiet Hours & Timezone Configuration
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-slate-400" />
              Timezone
            </label>
            <input
              type="text"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              placeholder="e.g. America/New_York, UTC"
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-indigo-500 shadow-sm"
            />
          </div>

          <div className="flex items-center justify-between pt-6">
            <div>
              <span className="text-xs font-bold text-slate-900">Global Notifications</span>
              <p className="text-[11px] text-slate-500">Receive reminders for scheduled habit times</p>
            </div>
            <input
              type="checkbox"
              checked={globalEnabled}
              onChange={(e) => setGlobalEnabled(e.target.checked)}
              className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Quiet Hours Start</label>
            <input
              type="time"
              value={quietStart}
              onChange={(e) => setQuietStart(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500 shadow-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Quiet Hours End</label>
            <input
              type="time"
              value={quietEnd}
              onChange={(e) => setQuietEnd(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500 shadow-sm"
            />
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-200">
          <button
            onClick={handleSaveProfileSettings}
            disabled={authLoading}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/15 transition-all"
          >
            Save Preference Settings
          </button>
        </div>
      </div>

      {/* Notification Delivery Logs */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
        <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-indigo-600" />
          Recent Notification Delivery Logs
        </h3>

        {logs.length > 0 ? (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-slate-900">{log.title}</span>
                  <p className="text-[11px] text-slate-600">{log.body}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {log.status}
                  </span>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {new Date(log.sent_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500 py-4 text-center">No push notifications logged yet.</p>
        )}
      </div>
    </div>
  );
};
