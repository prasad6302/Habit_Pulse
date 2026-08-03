import React, { useState, useEffect } from "react";
import { CheckCircle2, Lock, Mail, ArrowRight, Sparkles, Flame, Zap, ArrowLeft } from "lucide-react";
import { useAuthStore } from "../../context/useAuthStore";
import { authService } from "../../services/api";

type ViewMode = "login" | "register" | "forgot" | "reset";

export const AuthView: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [localLoading, setLocalLoading] = useState(false);

  const { login, register, isLoading, error: authStoreError, clearError } = useAuthStore();

  // Check URL query parameters for reset token on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("reset_token");
    if (token) {
      setResetToken(token);
      setViewMode("reset");
    }
  }, []);

  const handleModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    clearError();
    setLocalError(null);
    setForgotSuccess(null);
    setResetSuccess(null);
    setEmail("");
    setPassword("");
    setConfirmPassword("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLocalError(null);
    setForgotSuccess(null);
    setResetSuccess(null);

    try {
      if (viewMode === "login") {
        await login(email, password);
      } else if (viewMode === "register") {
        await register(email, password);
      } else if (viewMode === "forgot") {
        setLocalLoading(true);
        const res = await authService.forgotPassword(email);
        setForgotSuccess(res.message || "Reset link sent successfully!");
        setEmail("");
      } else if (viewMode === "reset") {
        if (password !== confirmPassword) {
          setLocalError("Passwords do not match.");
          return;
        }
        setLocalLoading(true);
        const res = await authService.resetPassword(resetToken, password);
        setResetSuccess(res.message || "Password has been successfully reset!");
        setPassword("");
        setConfirmPassword("");
        
        // Remove reset_token from the URL query params
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          handleModeChange("login");
        }, 3000);
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.detail || err.message || "An unexpected error occurred.";
      setLocalError(errMsg);
    } finally {
      setLocalLoading(false);
    }
  };

  const activeLoading = isLoading || localLoading;
  const activeError = localError || authStoreError;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-indigo-600/20 via-purple-600/20 to-pink-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md z-10">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 mb-4 shadow-xl shadow-indigo-500/30 ring-1 ring-white/20">
            <CheckCircle2 className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
            Habit Pulse
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Build consistency, track progress & achieve your daily rituals.
          </p>
        </div>

        {/* Card wrapper */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl shadow-slate-950/80">
          
          {/* Mode Switcher Tabs for normal auth */}
          {(viewMode === "login" || viewMode === "register") && (
            <div className="flex bg-slate-800/80 p-1.5 rounded-xl mb-6 border border-slate-700/50">
              <button
                type="button"
                onClick={() => handleModeChange("login")}
                className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${
                  viewMode === "login"
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/25"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => handleModeChange("register")}
                className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${
                  viewMode === "register"
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/25"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Create Account
              </button>
            </div>
          )}

          {/* Reset Password Form Title */}
          {viewMode === "reset" && (
            <div className="mb-6 text-center">
              <h2 className="text-lg font-bold text-slate-100">Reset Password</h2>
              <p className="text-slate-400 text-xs mt-1">Enter your new secure password below.</p>
            </div>
          )}

          {/* Forgot Password Form Title */}
          {viewMode === "forgot" && (
            <div className="mb-6">
              <button
                type="button"
                onClick={() => handleModeChange("login")}
                className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold mb-4 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Sign In
              </button>
              <h2 className="text-lg font-bold text-slate-100">Forgot Password</h2>
              <p className="text-slate-400 text-xs mt-1">We'll send you an email with instructions to reset your password.</p>
            </div>
          )}

          {/* Success Banner */}
          {forgotSuccess && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
              {forgotSuccess}
            </div>
          )}

          {resetSuccess && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
              {resetSuccess} Redirecting to Sign In...
            </div>
          )}

          {/* Error Banner */}
          {activeError && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 animate-ping" />
              <span>{activeError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* EMAIL FORM (Login, Register, Forgot) */}
            {viewMode !== "reset" && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-slate-950/70 border border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 transition-all outline-none"
                  />
                </div>
              </div>
            )}

            {/* PASSWORD FORM (Login, Register, Reset) */}
            {viewMode !== "forgot" && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {viewMode === "reset" ? "New Password" : "Password"}
                </label>
                <div className="relative">
                  <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950/70 border border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 transition-all outline-none"
                  />
                </div>
              </div>
            )}

            {/* CONFIRM PASSWORD (Reset only) */}
            {viewMode === "reset" && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Confirm New Password</label>
                <div className="relative">
                  <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950/70 border border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 transition-all outline-none"
                  />
                </div>
              </div>
            )}

            {/* FORGOT PASSWORD LINK (Login only) */}
            {viewMode === "login" && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => handleModeChange("forgot")}
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
                >
                  Forgot Password?
                </button>
              </div>
            )}

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={activeLoading}
              className="w-full mt-2 py-3.5 px-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.99]"
            >
              {activeLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>
                    {viewMode === "login" && "Sign In to Dashboard"}
                    {viewMode === "register" && "Get Started Free"}
                    {viewMode === "forgot" && "Send Reset Link"}
                    {viewMode === "reset" && "Update Password"}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Features Highlights */}
          <div className="mt-8 pt-6 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-center text-[11px] text-slate-400">
            <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-slate-800/30 border border-slate-800">
              <Flame className="w-4 h-4 text-amber-400" />
              <span className="font-semibold text-slate-300">Streaks</span>
            </div>
            <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-slate-800/30 border border-slate-800">
              <Zap className="w-4 h-4 text-indigo-400" />
              <span className="font-semibold text-slate-300">Web Push</span>
            </div>
            <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-slate-800/30 border border-slate-800">
              <Sparkles className="w-4 h-4 text-pink-400" />
              <span className="font-semibold text-slate-300">Analytics</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

