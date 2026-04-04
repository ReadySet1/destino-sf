import { Dancing_Script } from 'next/font/google';

const dancingScript = Dancing_Script({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export function FeaturedProductsSkeleton() {
  return (
    <div className="bg-gray-50 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2
          className={`text-4xl font-bold tracking-tight text-black sm:text-5xl text-center ${dancingScript.className}`}
        >
          Spotlight Picks
        </h2>
        <p className="mt-4 text-lg text-gray-600 text-center max-w-2xl mx-auto">
          Loading our featured products...
        </p>
        <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-300 rounded-3xl" style={{ paddingBottom: '75%' }}></div>
              <div className="mt-4">
                <div className="h-6 bg-gray-300 rounded mb-2"></div>
                <div className="h-4 bg-gray-300 rounded w-20"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
