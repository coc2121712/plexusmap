import { SkeletonFormField, SkeletonButton } from '@/components/ui/Skeleton';

export default function SecurityLoading() {
  return (
    <div className="max-w-2xl">
      <div className="h-8 bg-gray-200 rounded animate-pulse w-32 mb-6" />
      <div className="bg-white rounded-xl border border-border p-6 space-y-6">
        <SkeletonFormField />
        <SkeletonFormField />
        <SkeletonFormField />
        <SkeletonButton className="w-44" />
      </div>
    </div>
  );
}
