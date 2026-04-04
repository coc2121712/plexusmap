export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header skeleton */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="h-8 w-8 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-5 bg-gray-200 rounded w-32 animate-pulse" />
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Name + specialty */}
        <div className="flex items-start gap-4 mb-6">
          <div className="w-16 h-16 bg-gray-200 rounded-xl animate-pulse shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-6 bg-gray-200 rounded w-48 animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-32 animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-24 animate-pulse" />
          </div>
        </div>

        {/* Contact buttons */}
        <div className="flex gap-2 mb-6">
          <div className="h-10 bg-gray-200 rounded-lg w-28 animate-pulse" />
          <div className="h-10 bg-gray-200 rounded-lg w-28 animate-pulse" />
          <div className="h-10 bg-gray-200 rounded-lg w-28 animate-pulse" />
        </div>

        {/* Map skeleton */}
        <div className="h-48 bg-gray-200 rounded-xl animate-pulse mb-6" />

        {/* Info sections */}
        <div className="space-y-4">
          <div className="h-4 bg-gray-200 rounded w-full animate-pulse" />
          <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
          <div className="h-4 bg-gray-200 rounded w-5/6 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
