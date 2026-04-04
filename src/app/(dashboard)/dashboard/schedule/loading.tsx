import { SkeletonScheduleRow, SkeletonButton, SkeletonText } from '@/components/ui/Skeleton';

export default function ScheduleLoading() {
  return (
    <div className="max-w-2xl">
      <div className="h-8 bg-gray-200 rounded animate-pulse w-48 mb-2" />
      <SkeletonText className="w-72 mb-6" />
      <div className="space-y-3">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <SkeletonScheduleRow key={i} />
        ))}
      </div>
      <div className="mt-4">
        <SkeletonButton className="w-40" />
      </div>
    </div>
  );
}
