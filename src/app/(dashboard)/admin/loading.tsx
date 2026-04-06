export default function AdminLoading() {
  return (
    <div className="p-6 space-y-6">
      {/* Page title skeleton */}
      <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
      {/* Metrics cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-6 shadow-sm animate-pulse">
            <div className="h-4 w-20 bg-gray-200 rounded mb-2" />
            <div className="h-8 w-16 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
      {/* Content skeleton */}
      <div className="bg-white rounded-xl p-6 shadow-sm animate-pulse">
        <div className="h-6 w-32 bg-gray-200 rounded mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-4 w-full bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}
