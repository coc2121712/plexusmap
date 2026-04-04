import { SkeletonReviewCard, SkeletonText } from '@/components/ui/Skeleton';

export default function ReviewsLoading() {
  return (
    <div className="max-w-3xl">
      <div className="h-8 bg-gray-200 rounded animate-pulse w-28 mb-2" />
      <SkeletonText className="w-64 mb-6" />
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <SkeletonReviewCard key={i} />
        ))}
      </div>
    </div>
  );
}
