export default function Loading() {
  return (
    <div className="w-full bg-white">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12 md:py-16 animate-pulse">
        <div className="mb-10 text-center">
          <div className="h-10 w-64 mx-auto bg-gray-200 rounded mb-4" />
          <div className="h-4 w-80 mx-auto bg-gray-200 rounded" />
        </div>
        <div className="space-y-6">
          <div className="h-8 w-48 bg-gray-200 rounded" />
          <div className="space-y-2">
            <div className="h-4 w-full bg-gray-200 rounded" />
            <div className="h-4 w-11/12 bg-gray-200 rounded" />
            <div className="h-4 w-10/12 bg-gray-200 rounded" />
          </div>
          <div className="h-8 w-40 bg-gray-200 rounded mt-8" />
          <div className="space-y-2">
            <div className="h-4 w-full bg-gray-200 rounded" />
            <div className="h-4 w-9/12 bg-gray-200 rounded" />
          </div>
        </div>
      </main>
    </div>
  );
}
