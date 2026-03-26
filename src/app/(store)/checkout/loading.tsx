export default function CheckoutLoading() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-destino-cream via-white to-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="h-8 w-32 bg-gray-200 rounded animate-pulse mb-8" />
        <div className="space-y-6">
          {/* Form field skeletons */}
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
              <div className="h-10 w-full bg-gray-100 rounded-lg animate-pulse" />
            </div>
          ))}
          {/* Button skeleton */}
          <div className="h-12 w-full bg-gray-200 rounded-lg animate-pulse mt-8" />
        </div>
      </div>
    </main>
  );
}
