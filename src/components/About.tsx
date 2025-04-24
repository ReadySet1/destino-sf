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
  description = 'Flakey pastries with robust fillings have variation from all over the world! Friends & Family from Argentina, Spain, Peru, Chile (& others), have inspired me to appreciate these delicious pastries. Gracias de corazón!',
  aboutImage = '/images/about/about-us.png',
  signatureImage = '/images/about/signature.png',
  jamesImage = '/images/about/james-schenk.png',
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
            <p className={twMerge('leading-relaxed', isLarge ? 'text-xl md:text-2xl' : 'text-lg')}>
              {description}
            </p>
            <div className="relative h-20 w-64">
              <Image
                src={signatureImage}
                alt="James Schenk signature"
                fill
                className="object-contain"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
          <div className="flex flex-col justify-center space-y-6 max-w-xl">
            {' '}
            {/* Texto a la izquierda por defecto */}
            <p className="leading-relaxed">
              For over 20 years, native San Franciscan James Schenk has applied his personal vision
              of “Modern Latino” cuisine to become a mentor of gastronomical trends. James became a
              food and beverage staple after opening the Bay Area’s first upscale Latin
              restaurant&nbsp;**DESTINO**&nbsp;in 2000.
            </p>
            <p className="leading-relaxed">
              In 2008, he then created&nbsp;**PISCO LATIN LOUNGE**- the first modern day pisco bar
              in the United States. His winning combination of flavors, presentation and ambiance
              has gained him much acclaim and support from the Local, Hispanic & LGBTQ
              communities.&nbsp;His expertise has been solidified through numerous media
              appearances, national & international publications and several industry awards.
              DESTINO Restaurant closed its doors June, 2020.
              <br />
            </p>
            <p className="leading-relaxed">
              With deep roots in Peru and Europe, James’ family traditions are the springboard for
              his culinary inspirations.&nbsp;Fluent in Spanish, he has conducted
              several&nbsp;**culinary tours**&nbsp;in Peru, Argentina & Uruguay- focusing on
              traditional applications of regional cuisine. Since 1998, James has been on
              the&nbsp;**chef’s council for CCD Innovation**; consulting on strategic vision & trend
              insight for major international food companies including:&nbsp;Nestle, Kashi,
              Frito-Lay, Bush Brothers & Co, Kellogg’s, Heinz, Seeds of Change, American Seafood
              Company, General Mills, and Nabisco.&nbsp;His own “Alfajor” retail line of dulce de
              leche cookies has also been featured nationally in the prestigious&nbsp;**Saveur
              Magazine.**&nbsp;
            </p>
            <p className="leading-relaxed">
              James continues to inspire his culinary passions with&nbsp;**virtual cooking
              classes**. From individual to corporate clients, James has led a wide range of
              educational seminars to hands on cooking experiences.
            </p>
            <p className="leading-relaxed">
              Additionally, he is continuously promoting his product development of&nbsp;**DESTINO
              branded alfajores, empanadas and sauces**. He continues to partner with many Bay Area
              clients via his&nbsp;**catering services**.
            </p>
          </div>
          <div className="relative w-full max-w-md mx-auto aspect-square md:aspect-auto">
            {' '}
            {/* Imagen a la derecha por defecto */}
            <Image
              src={jamesImage}
              alt="Portrait of James Schenk"
              fill
              className="object-contain"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
