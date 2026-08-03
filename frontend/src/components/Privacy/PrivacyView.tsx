import React, { useState } from "react";
import {
  ShieldCheck,
  Download,
  FileSpreadsheet,
  Trash2,
  AlertTriangle,
  Lock,
} from "lucide-react";
import { privacyService } from "../../services/api";

export const PrivacyView: React.FC = () => {
  const [confirmPhrase, setConfirmPhrase] = useState("");
  const [password, setPassword] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleExportJson = async () => {
    try {
      const data = await privacyService.exportJson();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `habit_pulse_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export JSON:", err);
    }
  };

  const handleExportCsv = async () => {
    try {
      const blob = await privacyService.exportCsv();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `habit_pulse_history_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export CSV:", err);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmPhrase !== "DELETE MY DATA" || !password) return;

    setIsResetting(true);
    setResetError(null);

    try {
      await privacyService.resetData(confirmPhrase, password);
      setResetSuccess(true);
      setConfirmPhrase("");
      setPassword("");
    } catch (err: any) {
      setResetError(err.response?.data?.detail || "Failed to reset account data. Check your password.");
    } finally {
      setIsResetting(false);
    }
  };

  const isResetEnabled = confirmPhrase === "DELETE MY DATA" && password.length > 0;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <ShieldCheck className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white">Data & Privacy Control</h1>
            <p className="text-xs text-slate-400">
              Export data archives, view security logs, and control account data retention
            </p>
          </div>
        </div>
      </div>

      {/* Data Export Cards */}
      <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-md space-y-4">
        <h3 className="font-bold text-sm text-white">Export Personal Data Archives</h3>
        <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
          Download complete copies of your habit configurations, check-in history logs, and notes. You own your data.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={handleExportJson}
            className="px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500 text-white font-bold text-xs flex items-center gap-2 transition-all active:scale-95"
          >
            <Download className="w-4 h-4 text-indigo-400" />
            <span>Download JSON Archive</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500 text-white font-bold text-xs flex items-center gap-2 transition-all active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Download CSV Spreadsheet</span>
          </button>
        </div>
      </div>

      {/* Irreversible Account Reset Safeguard Form */}
      <div className="p-6 rounded-2xl bg-rose-950/20 border border-rose-500/30 backdrop-blur-md space-y-4">
        <div className="flex items-center gap-2 text-rose-400">
          <AlertTriangle className="w-5 h-5" />
          <h3 className="font-bold text-sm text-white">Danger Zone: Permanent Data Reset</h3>
        </div>

        <p className="text-xs text-rose-200/80 leading-relaxed max-w-xl">
          This action will permanently delete all your habits, check-in history, notes, and milestones. This process is immediate and irreversible.
        </p>

        {resetSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
            Account data has been completely wiped and reset.
          </div>
        )}

        {resetError && (
          <div className="p-3.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold">
            {resetError}
          </div>
        )}

        <form onSubmit={handleResetSubmit} className="space-y-4 pt-2 max-w-md">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Type <span className="text-rose-400 font-mono font-bold">DELETE MY DATA</span> to confirm
            </label>
            <input
              type="text"
              value={confirmPhrase}
              onChange={(e) => setConfirmPhrase(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-rose-500"
              placeholder="DELETE MY DATA"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Confirm Current Password</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-rose-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={!isResetEnabled || isResetting}
            className={`w-full py-3 rounded-xl font-bold text-xs shadow-lg flex items-center justify-center gap-2 transition-all ${
              isResetEnabled && !isResetting
                ? "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/30 active:scale-95"
                : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50"
            }`}
          >
            <Trash2 className="w-4 h-4" />
            <span>{isResetting ? "Executing Reset..." : "Permanently Reset All My Data"}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
