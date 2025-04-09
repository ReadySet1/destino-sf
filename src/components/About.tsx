import Image from 'next/image';

interface AboutProps {
  title?: string;
  description?: string;
  aboutImage?: string;
  signatureImage?: string;
}

export const About: React.FC<AboutProps> = ({
  title = "About Us",
  description = "Flakey pastries with robust fillings have variation from all over the world! Friends & Family from Argentina, Spain, Peru, Chile (& others), have inspired me to appreciate these delicious pastries. Gracias de corazón!",
  aboutImage = "/images/about/about-us.png",
  signatureImage = "/images/about/signature.png"
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
      <div className="relative w-full aspect-square">
        <Image
          src={aboutImage}
          alt="About us collage showing various pastries and the chef"
          fill
          className="object-contain"
          priority
        />
      </div>
      
      <div className="flex flex-col justify-center space-y-6">
        <h2 className="text-4xl font-bold">{title}</h2>
        <p className="text-lg leading-relaxed">
          {description}
        </p>
        <div className="relative h-16 w-48">
          <Image
            src={signatureImage}
            alt="James Schenk signature"
            fill
            className="object-contain"
          />
        </div>
      </div>
    </div>
  );
}; 