import Link from 'next/link';

interface ErrorDisplayProps {
  title?: string;
  message?: string;
  returnLink?: {
    href: string;
    label: string;
  };
}

/**
 * A reusable error display component for showing user-friendly error messages
 */
export function ErrorDisplay({
  title = 'Error',
  message = 'There was an error processing your request.',
  returnLink = {
    href: '/',
    label: 'Return to homepage'
  }
}: ErrorDisplayProps) {
  return (
    <div className="bg-red-50 text-red-700 p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <p className="mb-4">{message}</p>
      <Link href={returnLink.href} className="text-indigo-600 hover:underline">
        {returnLink.label}
      </Link>
    </div>
  );
}

export default ErrorDisplay; 