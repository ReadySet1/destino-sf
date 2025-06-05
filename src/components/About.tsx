import Image from 'next/image';

import { twMerge } from 'tailwind-merge';

interface AboutProps {
  title?: string;
  description?: string;
  aboutImage?: string;
  signatureImage?: string;
  jamesImage?: string;
  className?: string;
  variant?: 'default' | 'large';
}

export const About: React.FC<AboutProps> = ({
  title = 'About Us',
  description = ' For over two decades, Chef and San Francisco native James Schenk has brought his passion for Latin American cuisine to the Bay Area and the international stage.',
  aboutImage = '/images/about/about-us.png',
  jamesImage = '/images/about/james-schenk.jpg',
  className = '',
  variant = 'default',
}) => {
  const isLarge = variant === 'large';

  return (
    <div className="relative bg-white">
      <div className="max-w-7xl mx-auto px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-16">
          <div className="relative w-full max-w-2xl mx-auto aspect-square">
            <Image
              src={aboutImage}
              alt="About us collage showing various pastries and the chef"
              fill
              className="object-contain"
              priority
            />
          </div>

          <div className="flex flex-col justify-center space-y-8 max-w-xl">
            <h2 className={twMerge('font-bold', isLarge ? 'text-5xl md:text-6xl' : 'text-4xl')}>
              {title}
            </h2>

            <p
              className={twMerge(
                'leading-relaxed text-justify',
                isLarge ? 'text-xl md:text-2xl' : 'text-lg'
              )}
            >
              {description}
            </p>

            {/* Nuevo div con el texto en negritas */}
            <div className="text-lg md:text-xl font-bold space-y-2">
              <p>INSPIRED BY TRADITION</p>
              <p>CRAFTED WITH CARE</p>
              <p>SHARED WITH LOVE</p>
            </div>

            {/* Nueva firma de James Schenk */}
            <div className="relative h-20 w-64 mt-4">
              {' '}
              {/* Ajusta el h y w según sea necesario para el tamaño de la firma */}
              <Image
                src="/images/about/signature.png" // Asegúrate de que esta sea la ruta correcta a la imagen de la firma de James Schenk
                alt="Signature of James Schenk"
                fill
                className="object-contain"
              />
            </div>

            <div className="relative h-20 w-64"></div>
          </div>
        </div>

        {/* Added "Our History" title here */}

        <h2 className="font-bold text-5xl mb-8">Our History</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
          <div className="flex flex-col justify-center space-y-6 max-w-xl">
            <p className="leading-relaxed font-quicksand font-medium text-justify">
              In 2000, James opened <strong>DESTINO</strong> — the Bay Area&apos;s first upscale
              modern Latin restaurant — and later created <strong>PISCO LATIN LOUNGE</strong>, the
              country&apos;s first modern-day pisco bar. Over the next 20 years, DESTINO became a
              beloved institution, earning widespread acclaim from national media outlets and
              winning numerous prestigious culinary awards.
            </p>

            <p className="leading-relaxed font-quicksand font-medium text-justify">
              Rooted in family traditions from Peru and Europe, James draws inspiration from
              authentic regional flavors, blending classic techniques with a modern sensibility. His
              passion for Latin American cuisine has taken him on{' '}
              <strong>extensive culinary tours</strong> throughout the region, deepening his
              knowledge of traditional methods, local ingredients, and regional specialties. Along
              the way, his expertise has led to collaborations with major international food brands
              and national recognition for his signature alfajores, featured in publications such as{' '}
              <strong>Saveur magazine</strong>.
            </p>

            <p className="leading-relaxed font-quicksand font-medium text-justify">
              Today, DESTINO has evolved into a vibrant brand specializing in{' '}
              <strong>authentic, protein-packed empanadas, alfajores</strong> —{' '}
              <strong>dulce de leche shortbread cookies</strong>, and{' '}
              <strong>traditional Latin sauces</strong>. Our products are available through select{' '}
              <strong>retail and wholesale</strong> partners, allowing us to share the authentic
              flavors of Latin America with a wider audience. We also continue to offer{' '}
              <strong>full-service catering</strong> — including private events, corporate lunches,
              and community celebrations — delivering fresh, flavorful experiences throughout the
              Bay Area.
            </p>

            <p className="leading-relaxed font-quicksand font-medium text-justify">
              <strong>
                At DESTINO, our mission is simple: to share delicious food, crafted with love and
                tradition, and to inspire people to fall in love with the vibrant flavors of Latin
                America — just as James did.
              </strong>
            </p>

            <p className="leading-relaxed font-quicksand font-medium text-justify">
              Gracias for being part of our journey!
            </p>

            {/* Added signature image below text */}

            <div className="relative mt-8 h-20 w-64">
              {' '}
              {/* Container for sizing */}
              <Image
                src="/images/about/signature.png" /* Path relative to public directory */
                alt="Signature"
                fill
                className="object-contain"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
