// Reusable skeleton components for loading states

interface SkeletonProps {
  className?: string;
}

export function SkeletonText({ className = '' }: SkeletonProps) {
  return (
    <div className={`h-4 bg-gray-200 rounded animate-pulse ${className}`} />
  );
}

export function SkeletonAvatar({ className = '' }: SkeletonProps) {
  return (
    <div className={`w-10 h-10 bg-gray-200 rounded-full animate-pulse shrink-0 ${className}`} />
  );
}

export function SkeletonButton({ className = '' }: SkeletonProps) {
  return (
    <div className={`h-10 bg-gray-200 rounded-lg animate-pulse ${className}`} />
  );
}

/** Skeleton matching a ProfessionalCard in the sidebar list */
export function SkeletonProfessionalCard() {
  return (
    <div className="px-4 py-3 border-b border-border">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 bg-gray-200 rounded-lg animate-pulse shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
          <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
          <div className="flex gap-2 mt-1">
            <div className="h-3 bg-gray-200 rounded animate-pulse w-12" />
            <div className="h-3 bg-gray-200 rounded animate-pulse w-8" />
          </div>
          <div className="h-3 bg-gray-200 rounded animate-pulse w-5/6" />
        </div>
      </div>
    </div>
  );
}

/** Skeleton matching a StatsOverview card */
export function SkeletonStatCard() {
  return (
    <div className="bg-white rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="h-3 bg-gray-200 rounded animate-pulse w-16" />
        <div className="w-6 h-6 bg-gray-200 rounded animate-pulse" />
      </div>
      <div className="h-8 bg-gray-200 rounded animate-pulse w-20 mb-2" />
      <div className="h-3 bg-gray-200 rounded animate-pulse w-24" />
    </div>
  );
}

/** Skeleton matching a ReviewCard */
export function SkeletonReviewCard() {
  return (
    <div className="bg-white rounded-xl border border-border p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <SkeletonAvatar />
          <div className="space-y-1.5">
            <div className="h-4 bg-gray-200 rounded animate-pulse w-28" />
            <div className="h-3 bg-gray-200 rounded animate-pulse w-20" />
          </div>
        </div>
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="w-4 h-4 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
      <div className="mt-3 space-y-2">
        <div className="h-3 bg-gray-200 rounded animate-pulse w-full" />
        <div className="h-3 bg-gray-200 rounded animate-pulse w-4/5" />
      </div>
    </div>
  );
}

/** Skeleton for a form field (label + input) */
export function SkeletonFormField({ wide = false }: { wide?: boolean }) {
  return (
    <div>
      <div className="h-3 bg-gray-200 rounded animate-pulse w-24 mb-2" />
      <div className={`h-10 bg-gray-200 rounded-lg animate-pulse ${wide ? 'w-full' : 'w-full'}`} />
    </div>
  );
}

/** Skeleton for a schedule row */
export function SkeletonScheduleRow() {
  return (
    <div className="bg-white rounded-lg border border-border p-4">
      <div className="flex items-center gap-4">
        <div className="w-10 h-6 bg-gray-200 rounded-full animate-pulse" />
        <div className="h-4 bg-gray-200 rounded animate-pulse w-20" />
        <div className="h-8 bg-gray-200 rounded-lg animate-pulse w-20" />
        <div className="h-3 bg-gray-200 rounded animate-pulse w-4" />
        <div className="h-8 bg-gray-200 rounded-lg animate-pulse w-20" />
        <div className="h-8 bg-gray-200 rounded-lg animate-pulse w-16" />
      </div>
    </div>
  );
}
