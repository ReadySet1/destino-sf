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
            {/* Text to the left by default */}
            <p className="leading-relaxed font-quicksand font-medium">
              For over 20 years, native San Franciscan James Schenk has applied his personal vision
              of &quot;Modern Latino&quot; cuisine to become a mentor of gastronomical trends. James
              became a food and beverage staple after opening the Bay Area&apos;s first upscale
              Latin restaurant <strong>DESTINO</strong> in 2000.
            </p>
            <p className="leading-relaxed font-quicksand font-medium">
              In 2008, he then created <strong>PISCO LATIN LOUNGE</strong> - the first modern day
              pisco bar in the United States. His winning combination of flavors, presentation and
              ambiance has gained him much acclaim and support from the Local, Hispanic & LGBTQ
              communities. His expertise has been solidified through numerous media appearances,
              national & international publications and several industry awards. DESTINO Restaurant
              closed its doors June, 2020.
            </p>
            <p className="leading-relaxed font-quicksand font-medium">
              With deep roots in Peru and Europe, James&apos; family traditions are the springboard
              for his culinary inspirations. Fluent in Spanish, he has conducted several{' '}
              <strong>culinary tours</strong> in Peru, Argentina & Uruguay - focusing on traditional
              applications of regional cuisine. Since 1998, James has been on the{' '}
              <strong>chef&apos;s council for CCD Innovation</strong>; consulting on strategic
              vision & trend insight for major international food companies including: Nestle,
              Kashi, Frito-Lay, Bush Brothers & Co, Kellogg&apos;s, Heinz, Seeds of Change, American
              Seafood Company, General Mills, and Nabisco. His own &quot;Alfajor&quot; retail line
              of dulce de leche cookies has also been featured nationally in the prestigious{' '}
              <strong>Saveur Magazine.</strong>
            </p>
            <p className="leading-relaxed font-quicksand font-medium">
              James continues to inspire his culinary passions with{' '}
              <strong>virtual cooking classes</strong>. From individual to corporate clients, James
              has led a wide range of educational seminars to hands on cooking experiences.
            </p>
            <p className="leading-relaxed font-quicksand font-medium">
              Additionally, he is continuously promoting his product development of{' '}
              <strong>DESTINO branded alfajores, empanadas and sauces</strong>. He continues to
              partner with many Bay Area clients via his <strong>catering services</strong>.
            </p>
          </div>
          <div className="relative w-full max-w-md mx-auto mt-16 h-[600px] pb-8">
            {/* Image to the right by default */}
            <Image src={jamesImage} alt="Portrait of James Schenk" fill className="object-cover" />
          </div>
        </div>
      </div>
    </div>
  );
};
