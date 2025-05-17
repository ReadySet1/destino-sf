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

      <div className="absolute inset-0 flex flex-col justify-center md:items-start px-8 md:px-16 lg:px-32 xl:px-40">
        <div className="max-w-2xl w-full text-white flex flex-col items-start md:block md:w-auto md:text-left">
          <h1 className="mb-4 text-3xl font-bold leading-tight text-left md:text-3xl lg:text-5xl xl:text-6xl [text-shadow:0_2px_4px_rgba(0,0,0,0.6)]">
            Delicious Latin American flavors, rooted in tradition
            <br />
            savored in every bite.
          </h1>
          <p className="mb-6 text-base lg:text-lg xl:text-xl text-gray-100 [text-shadow:0_1px_3px_rgba(0,0,0,0.5)]">
            From protein packed empanadas to sweet alfajores, our food makes people smile!
          </p>
          <Link
            href="/menu"
            className="mt-4 md:mt-8 lg:mt-12 md:self-auto inline-block rounded-full bg-yellow-400 px-6 py-3 md:px-8 md:py-4 text-base md:text-xl lg:text-2xl font-bold text-gray-800 transition-all hover:bg-yellow-500 hover:scale-105 [text-shadow:0_1px_2px_rgba(0,0,0,0.1)]"
          >
            Order Now
          </Link>
        </div>
      </div>
    </div>
  );
}
