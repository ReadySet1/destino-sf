import Link from 'next/link';
import Image from 'next/image';
import { Dancing_Script } from 'next/font/google';

const dancingScript = Dancing_Script({ subsets: ['latin'] });

export function PromotionBanner() {
  return (
    <div className="relative bg-amber-300 overflow-hidden">
      <div className="mx-auto max-w-7xl">
        <div className="relative z-10 py-12 px-4 sm:px-6 lg:px-8 lg:py-16 text-center">
          <div className="md:ml-auto md:w-1/2 md:pl-10">
            <h2
              className={`text-4xl font-bold tracking-tight text-black sm:text-5xl ${dancingScript.className}`}
            >
              Winter Special Offer
            </h2>
            <p className="mt-3 text-xl text-gray-800" style={{ fontStyle: 'italic' }}>
              Get 15% off when you order any catering package for your winter events. Use code{' '}
              <span className="font-semibold">WINTER15</span> at checkout.
            </p>
            <div className="mt-8">
              <div className="inline-flex rounded-md shadow">
                <Link
                  href="/catering"
                  className="inline-flex items-center justify-center rounded-md border border-transparent bg-gray-900 px-5 py-3 text-base font-medium text-white hover:bg-gray-800"
                >
                  Order Catering
                </Link>
              </div>
              <div className="ml-3 inline-flex">
                {/* <Link
                  href="/promotions"
                  className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-5 py-3 text-base font-medium text-gray-700 hover:bg-gray-50"
                >
                  View All Promotions
                </Link> */}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="md:absolute md:inset-y-0 md:left-0 md:w-1/2">
        <div className="relative h-56 w-full md:h-full rounded-r-3xl overflow-hidden">
          <Image
            src="/images/assets/2Recurso 1.png"
            alt="Winter catering special"
            fill
            className="object-cover rounded-r-3xl"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-amber-300 via-amber-300/80 to-transparent md:bg-gradient-to-r md:from-transparent md:to-amber-300/90" />
        </div>
      </div>
    </div>
  );
}
