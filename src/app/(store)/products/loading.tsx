export default function ProductsLoading() {
  return (
    <div className="min-h-screen bg-destino-orange">
      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4">
          {/* Title skeleton */}
          <div className="h-8 w-48 bg-white/20 rounded animate-pulse mb-8" />
          {/* Grid skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white/10 rounded-xl overflow-hidden animate-pulse">
                <div className="aspect-square bg-white/20" />
                <div className="p-4 space-y-2">
                  <div className="h-5 w-3/4 bg-white/20 rounded" />
                  <div className="h-4 w-1/2 bg-white/20 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
