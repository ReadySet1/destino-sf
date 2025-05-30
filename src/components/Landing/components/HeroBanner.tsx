import Link from 'next/link';
import Image from 'next/image';

export function HeroBanner() {
  return (
    <div className="relative w-full overflow-hidden">
      <div className="relative h-[50vh] md:h-[400px] lg:h-[600px] xl:h-[700px] w-full">
        <Image
          src="/images/hero/hero-empanada.jpg"
          alt="Delicious Empanadas"
          fill
          className="object-cover object-top"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-black/30"></div>
      </div>

      <div className="absolute inset-0 flex flex-col justify-center items-center md:items-start px-4 sm:px-8 md:px-16 lg:px-32 xl:px-40 text-center md:text-left">
        {' '}
        {/* Added items-center and text-center for mobile */}
        <div className="max-w-2xl w-full text-white flex flex-col items-center md:items-start">
          {' '}
          {/* Adjusted items-center for mobile */}
          <h1 className="mb-4 text-2xl sm:text-3xl font-bold leading-tight [text-shadow:0_2px_4px_rgba(0,0,0,0.6)] md:text-3xl lg:text-5xl xl:text-6xl">
            {' '}
            {/* Adjusted text-size for small screens */}
            <span>Delicious Latin American flavors,</span> {/* Removed whitespace-nowrap */}
            <br />
            <span>Rooted in tradition</span>
            <br />
            <span>Savored in every bite.</span>
          </h1>
          <p className="hidden md:block mb-6 md:text-base lg:text-lg xl:text-xl text-gray-100 italic w-full [text-shadow:0_1px_3px_rgba(0,0,0,0.5)]">
            From protein packed empanadas to sweet alfajores
            <br />
            our food makes people smile!
          </p>
          <Link
            href="/menu"
            className="mt-4 md:mt-8 lg:mt-12 inline-block rounded-full bg-yellow-400 px-6 py-3 md:px-8 md:py-4 text-base md:text-xl lg:text-2xl font-bold text-gray-800 transition-all hover:bg-yellow-500 hover:scale-105 [text-shadow:0_1px_2px_rgba(0,0,0,0.1)]"
          >
            Order Now
          </Link>
        </div>
      </div>
    </div>
  );
}
