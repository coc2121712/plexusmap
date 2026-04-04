import { SkeletonStatCard, SkeletonReviewCard, SkeletonText } from '@/components/ui/Skeleton';

export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      {/* Header skeleton */}
      <div>
        <div className="h-8 bg-gray-200 rounded animate-pulse w-48 mb-2" />
        <div className="h-4 bg-gray-200 rounded animate-pulse w-32" />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <SkeletonStatCard key={i} />
        ))}
      </div>

      {/* Reviews section */}
      <section>
        <SkeletonText className="w-36 h-5 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <SkeletonReviewCard key={i} />
          ))}
        </div>
      </section>
    </div>
  );
}
