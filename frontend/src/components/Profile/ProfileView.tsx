import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  User,
  Flame,
  Award,
  Calendar,
  Save,
  CheckCircle2,
  Eye,
  EyeOff,
} from "lucide-react";
import { profileService } from "../../services/api";
import type { ProfileResponse } from "../../services/api";

const AVATAR_COLORS = ["#6366f1", "#ec4899", "#10b981", "#f59e0b", "#8b5cf6", "#06b6d4", "#ef4444"];

export const ProfileView: React.FC = () => {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarColor, setAvatarColor] = useState("#6366f1");
  const [showOnLeaderboard, setShowOnLeaderboard] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const data = await profileService.getMyProfile();
      setProfile(data);
      setDisplayName(data.display_name);
      setBio(data.bio);
      setAvatarColor(data.avatar_color || "#6366f1");
      setShowOnLeaderboard(data.show_on_leaderboard);
    } catch (err) {
      console.error("Failed to load profile:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await profileService.updateMyProfile({
        display_name: displayName,
        bio,
        avatar_color: avatarColor,
        show_on_leaderboard: showOnLeaderboard,
      });
      setSavedMessage(true);
      setTimeout(() => setSavedMessage(false), 3000);
    } catch (err) {
      console.error("Failed to save profile:", err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center text-slate-500 text-xs font-medium">
        Loading user profile...
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg"
            style={{ backgroundColor: avatarColor }}
          >
            {displayName.charAt(0).toUpperCase() || <User className="w-6 h-6" />}
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white">{displayName || "My Profile"}</h1>
            <p className="text-xs text-slate-400">
              Member since {profile ? format(new Date(profile.member_since), "MMMM yyyy") : "2026"}
            </p>
          </div>
        </div>
      </div>

      {/* Lifetime Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-md">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold">
            <Calendar className="w-4 h-4 text-indigo-400" />
            <span>Habits Created</span>
          </div>
          <p className="text-3xl font-black text-white mt-2">
            {profile?.stats.total_habits_created || 0}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-md">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold">
            <Flame className="w-4 h-4 text-amber-400" />
            <span>Total Check-ins Logged</span>
          </div>
          <p className="text-3xl font-black text-white mt-2">
            {profile?.stats.total_checkins_logged || 0}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-md">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold">
            <Award className="w-4 h-4 text-emerald-400" />
            <span>All-Time Longest Streak</span>
          </div>
          <p className="text-3xl font-black text-white mt-2">
            {profile?.stats.longest_ever_streak || 0} <span className="text-xs font-normal text-slate-400">days</span>
          </p>
        </div>
      </div>

      {/* Profile Form & Settings */}
      <form onSubmit={handleSave} className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-md space-y-6">
        <h3 className="font-bold text-sm text-white">Public Profile & Avatar Customization</h3>

        {savedMessage && (
          <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Profile saved successfully!</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
              placeholder="Your public name"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">Avatar Theme Color</label>
            <div className="flex items-center gap-2 pt-1">
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setAvatarColor(c)}
                  className={`w-7 h-7 rounded-full transition-transform ${
                    avatarColor === c ? "scale-125 ring-2 ring-white" : "hover:scale-110 opacity-70"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300">Bio / Personal Motto</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
            placeholder="A short reflection or motto..."
          />
        </div>

        {/* Leaderboard Opt-In Privacy Safeguard Switch */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 mt-0.5">
              {showOnLeaderboard ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
            </div>
            <div>
              <h4 className="font-bold text-xs text-white">Show on Public Leaderboard (Opt-In)</h4>
              <p className="text-xs text-slate-400 mt-0.5 max-w-md">
                When enabled, ONLY your display name, avatar color, and streak length will be visible on the community leaderboard. Your email and check-in notes remain 100% private.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowOnLeaderboard(!showOnLeaderboard)}
            className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out shrink-0 ${
              showOnLeaderboard ? "bg-indigo-600" : "bg-slate-800"
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ease-in-out ${
                showOnLeaderboard ? "translate-x-6" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? "Saving..." : "Save Profile Settings"}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
