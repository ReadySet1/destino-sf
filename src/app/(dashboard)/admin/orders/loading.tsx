export default function OrdersLoading() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
        <div className="h-10 w-24 bg-gray-200 rounded animate-pulse" />
      </div>
      {/* Table skeleton */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="border-b px-6 py-3 flex gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="border-b px-6 py-4 flex gap-4">
            {Array.from({ length: 5 }).map((_, j) => (
              <div key={j} className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
