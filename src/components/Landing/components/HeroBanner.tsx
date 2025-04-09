import Link from 'next/link';
import Image from 'next/image';

export function HeroBanner() {
  return (
    <div className="relative w-full overflow-hidden">
      <div className="relative h-[280px] md:h-[400px] lg:h-[600px] xl:h-[700px] w-full">
        <Image
          src="/images/hero/hero-empanada.png"
          alt="Delicious Empanadas"
          fill
          className="object-cover"
          priority
        />

        <div className="absolute inset-0 flex flex-col justify-center px-8 md:px-16 lg:px-32 xl:px-40">
          <div className="max-w-2xl text-white">
            <h1 className="mb-4 text-xl font-bold leading-tight md:text-3xl lg:text-5xl xl:text-6xl">
              Flakey, golden empanadas
              <br />
              filled with rich flavors
            </h1>
            <p className="hidden md:block mb-6 md:text-base lg:text-lg xl:text-xl text-gray-100">
              Inspired by traditions from Argentina, Spain, Peru, Chile, and beyond. Each bite is a celebration of global culinary heritage!
            </p>
            <Link
              href="/order"
              className="mt-6 md:mt-8 lg:mt-12 inline-block rounded-full bg-yellow-400 px-8 py-4 text-lg md:text-xl lg:text-2xl font-semibold text-gray-800 transition-all hover:bg-yellow-500 hover:scale-105"
            >
              Order Now
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
