import Link from 'next/link';
import Image from 'next/image';

export function HeroBanner() {
  return (
    <div className="relative w-full overflow-hidden">
      <div className="relative h-[25vh] md:h-[400px] lg:h-[600px] xl:h-[700px] w-full">
        <Image
          src="/images/hero/hero-empanada.png"
          alt="Delicious Empanadas"
          fill
          className="object-cover object-top"
          priority
        />
      </div>

      <div className="absolute inset-0 flex flex-col justify-end md:items-start pb-8 md:pb-32 lg:pb-40 xl:pb-64 px-8 md:px-16 lg:px-32 xl:px-40">
        <div className="max-w-2xl w-full text-white flex flex-col items-start md:block md:w-auto md:text-left">
          <h1 className="mb-4 text-xl font-bold leading-tight text-left md:text-3xl lg:text-5xl xl:text-6xl [text-shadow:0_2px_4px_rgba(0,0,0,0.6)]">
            Flakey, golden empanadas
            <br />
            filled with rich flavors
          </h1>
          <p className="hidden md:block mb-6 md:text-base lg:text-lg xl:text-xl text-gray-100 [text-shadow:0_1px_3px_rgba(0,0,0,0.5)]">
            Inspired by traditions from Argentina, Spain, Peru, Chile, and beyond. Each bite is a
            celebration of global culinary heritage!
          </p>
          <Link
            href="/order"
            className="mt-4 md:mt-8 lg:mt-12 md:self-auto inline-block rounded-full bg-yellow-400 px-6 py-3 md:px-8 md:py-4 text-base md:text-xl lg:text-2xl font-bold text-gray-800 transition-all hover:bg-yellow-500 hover:scale-105 [text-shadow:0_1px_2px_rgba(0,0,0,0.1)]"
          >
            Order Now
          </Link>
        </div>
      </div>
    </div>
  );
}
