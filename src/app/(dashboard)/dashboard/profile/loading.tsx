import { SkeletonFormField, SkeletonButton, SkeletonText } from '@/components/ui/Skeleton';

export default function ProfileLoading() {
  return (
    <div className="max-w-2xl">
      <div className="h-8 bg-gray-200 rounded animate-pulse w-32 mb-6" />
      <div className="space-y-6">
        {/* Name (disabled) */}
        <SkeletonFormField />
        {/* Phone + Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SkeletonFormField />
          <SkeletonFormField />
        </div>
        {/* Address */}
        <SkeletonFormField />
        {/* Bio (taller) */}
        <div>
          <SkeletonText className="w-20 mb-2" />
          <div className="h-24 bg-gray-200 rounded-lg animate-pulse" />
        </div>
        {/* Insurances */}
        <div>
          <SkeletonText className="w-36 mb-3" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-10 bg-gray-200 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
        {/* Save button */}
        <SkeletonButton className="w-40" />
      </div>
    </div>
  );
}
