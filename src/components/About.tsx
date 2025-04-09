import Image from 'next/image';
import { twMerge } from 'tailwind-merge';

interface AboutProps {
  title?: string;
  description?: string;
  aboutImage?: string;
  signatureImage?: string;
  className?: string;
  variant?: 'default' | 'large';
}

export const About: React.FC<AboutProps> = ({
  title = "About Us",
  description = "Flakey pastries with robust fillings have variation from all over the world! Friends & Family from Argentina, Spain, Peru, Chile (& others), have inspired me to appreciate these delicious pastries. Gracias de corazón!",
  aboutImage = "/images/about/about-us.png",
  signatureImage = "/images/about/signature.png",
  className = "",
  variant = 'default'
}) => {
  const isLarge = variant === 'large';

  return (
    <div className="relative bg-white">
      <div className="max-w-7xl mx-auto px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
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
            <h2 className={twMerge(
              "font-bold",
              isLarge ? "text-5xl md:text-6xl" : "text-4xl"
            )}>{title}</h2>
            <p className={twMerge(
              "leading-relaxed",
              isLarge ? "text-xl md:text-2xl" : "text-lg"
            )}>
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
      </div>
    </div>
  );
}; 