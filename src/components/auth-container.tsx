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
    <div className="flex flex-col justify-center items-center min-h-screen py-4">
      <div className="w-full max-w-md mx-auto px-4">
        <div className="flex flex-col items-center mb-3">
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
        </div>

        <div
          className={cn(
            'bg-white border border-gray-200 rounded-xl p-5 shadow-sm w-full',
            className
          )}
        >
          <div className="space-y-1 pb-3 text-center">
            <h1 className="text-2xl font-bold">{title}</h1>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>

          {children}

          <div className="text-center text-xs text-muted-foreground pt-3">
            Taste the tradition at Destino SF
          </div>
        </div>
      </div>
    </div>
  );
}
