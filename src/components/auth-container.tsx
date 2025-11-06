import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/slug';

type AuthContainerProps = {
  children: React.ReactNode;
  className?: string;
  title: string;
  subtitle: string;
};

export function AuthContainer({ children, className, title, subtitle }: AuthContainerProps) {
  return (
    <main className="min-h-screen bg-gradient-to-br from-destino-cream via-white to-gray-50">
      {/* Header section with logo and title */}
      <div className="bg-white/95 backdrop-blur-sm border-b border-gray-200/50 px-4 py-4 sm:py-6 shadow-sm">
        <div className="container mx-auto max-w-md">
          <div className="flex flex-col items-center gap-3">
            <Link href="/" className="transition-transform hover:scale-105">
              <Image
                src="/images/logo/logo-destino.png"
                alt="Destino SF Logo"
                width={130}
                height={65}
                priority
                className="h-auto w-auto"
              />
            </Link>
            <div className="text-center">
              <h1 className="text-2xl sm:text-3xl font-bold text-destino-charcoal">{title}</h1>
              <p className="text-gray-600 mt-1">{subtitle}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="container mx-auto px-4 py-6 sm:py-8">
        <div className="w-full max-w-md mx-auto">
          <div
            className={cn(
              'bg-white/95 backdrop-blur-sm border border-gray-200/50 rounded-xl p-5 sm:p-6 lg:p-8 shadow-lg hover:shadow-xl transition-shadow duration-200 w-full',
              className
            )}
          >
            {children}

            <div className="text-center text-xs text-gray-500 pt-6 border-t border-gray-100 mt-6">
              Taste the tradition at Destino SF
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
