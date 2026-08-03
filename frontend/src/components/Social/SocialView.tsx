import React, { useEffect, useState } from "react";
import {
  Users,
  Trophy,
  Flame,
  Award,
  Plus,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { socialService, profileService } from "../../services/api";
import type { LeaderboardEntry, ChallengeItem, ProfileResponse } from "../../services/api";

export const SocialView: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [challenges, setChallenges] = useState<ChallengeItem[]>([]);
  const [myProfile, setMyProfile] = useState<ProfileResponse | null>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  const loadSocialData = async () => {
    setIsLoading(true);
    try {
      const [lb, ch, prof] = await Promise.all([
        socialService.getLeaderboard(),
        socialService.getChallenges(),
        profileService.getMyProfile(),
      ]);
      setLeaderboard(lb);
      setChallenges(ch);
      setMyProfile(prof);
    } catch (err) {
      console.error("Failed to load social data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSocialData();
  }, []);

  const handleJoinChallenge = async (ch: ChallengeItem) => {
    setJoiningId(ch.id);
    try {
      await socialService.joinChallenge(ch.id);
      setJoinedIds((prev) => new Set(prev).add(ch.id));
    } catch (err) {
      console.error("Failed to join challenge:", err);
    } finally {
      setJoiningId(null);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Users className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white">Social & Accountability</h1>
            <p className="text-xs text-slate-400">
              Community streak leaderboards and shared habit challenges
            </p>
          </div>
        </div>
      </div>

      {/* Leaderboard Section */}
      <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-md space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm text-white">Streak Momentum Leaderboard</h3>
          </div>
          <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Privacy-Protected & Opt-in Only
          </span>
        </div>

        {myProfile && !myProfile.show_on_leaderboard && (
          <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-medium flex items-center justify-between">
            <span>You are currently unlisted on the public leaderboard.</span>
            <span className="text-[11px] font-bold underline cursor-pointer" onClick={() => window.location.hash = "#profile"}>
              Enable in Profile Settings
            </span>
          </div>
        )}

        {isLoading ? (
          <div className="py-12 text-center text-slate-500 text-xs font-medium">
            Loading leaderboard rankings...
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs font-medium border border-dashed border-slate-800 rounded-xl">
            No opt-in members on the leaderboard yet. Enable "Show on Leaderboard" in your profile to be the first!
          </div>
        ) : (
          <div className="space-y-2">
            {leaderboard.map((entry) => (
              <div
                key={entry.user_id}
                className={`p-3.5 rounded-xl border flex items-center justify-between transition-colors ${
                  entry.is_me
                    ? "bg-indigo-600/20 border-indigo-500/50 text-white"
                    : "bg-slate-950/60 border-slate-800 text-slate-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center font-black text-xs text-amber-400">
                    #{entry.rank}
                  </div>
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs"
                    style={{ backgroundColor: entry.avatar_color || "#6366f1" }}
                  >
                    {entry.display_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-bold text-xs flex items-center gap-1.5">
                      <span>{entry.display_name}</span>
                      {entry.is_me && (
                        <span className="px-1.5 py-0.5 text-[9px] font-bold bg-indigo-500/20 text-indigo-300 rounded-full border border-indigo-500/40">
                          YOU
                        </span>
                      )}
                    </h4>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 font-bold text-xs text-amber-400">
                  <Flame className="w-4 h-4" />
                  <span>{entry.longest_streak}d streak</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Community Habit Challenges */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-purple-400" />
          <h3 className="font-bold text-sm text-white">Active Community Challenges</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {challenges.map((ch) => {
            const isJoined = joinedIds.has(ch.id);
            const isJoining = joiningId === ch.id;

            return (
              <div
                key={ch.id}
                className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 text-[9px] font-bold bg-slate-800 text-slate-300 rounded-full border border-slate-700">
                      {ch.category}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">
                      {ch.participants_count} Members
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-white pt-1">{ch.name}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">{ch.description}</p>
                </div>

                <button
                  onClick={() => handleJoinChallenge(ch)}
                  disabled={isJoined || isJoining}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 ${
                    isJoined
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default"
                      : "bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 hover:from-amber-400 hover:to-yellow-400"
                  }`}
                >
                  {isJoined ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Challenge Joined ✅</span>
                    </>
                  ) : isJoining ? (
                    <span>Joining...</span>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Join Challenge</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
