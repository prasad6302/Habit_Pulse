import React from "react";

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = "" }) => {
  return (
    <div
      className={`animate-pulse rounded-xl bg-slate-200/80 border border-slate-300/40 ${className}`}
    />
  );
};

export const HabitCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="w-16 h-5 rounded-lg" />
          <Skeleton className="w-20 h-4 rounded-md" />
        </div>
        <Skeleton className="w-8 h-8 rounded-lg" />
      </div>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
          <div className="space-y-2 flex-1">
            <Skeleton className="w-3/4 h-5 rounded-md" />
            <Skeleton className="w-1/2 h-3.5 rounded-md" />
          </div>
        </div>
        <Skeleton className="w-12 h-12 rounded-2xl shrink-0" />
      </div>
      <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
        <Skeleton className="w-24 h-5 rounded-full" />
        <Skeleton className="w-16 h-4 rounded-md" />
      </div>
    </div>
  );
};

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner Skeleton */}
      <div className="rounded-3xl bg-indigo-900 border border-indigo-700 p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-3 flex-1">
          <Skeleton className="w-32 h-4 rounded-md bg-white/20" />
          <Skeleton className="w-56 h-8 rounded-xl bg-white/30" />
          <Skeleton className="w-72 h-4 rounded-md bg-white/20" />
        </div>
        <Skeleton className="w-48 h-20 rounded-2xl shrink-0 bg-white/20" />
      </div>

      {/* Filter Bar Skeleton */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <Skeleton className="w-64 h-10 rounded-xl" />
        <div className="flex items-center gap-2">
          <Skeleton className="w-44 h-10 rounded-xl" />
          <Skeleton className="w-28 h-10 rounded-xl" />
        </div>
      </div>

      {/* Cards Grid Skeleton */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-5">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <HabitCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
};

export const AnalyticsSkeleton: React.FC = () => {
  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="space-y-2">
          <Skeleton className="w-48 h-8 rounded-xl" />
          <Skeleton className="w-64 h-4 rounded-md" />
        </div>
        <Skeleton className="w-36 h-10 rounded-2xl" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-28 rounded-3xl" />
        ))}
      </div>
      <Skeleton className="w-full h-80 rounded-3xl" />
    </div>
  );
};
