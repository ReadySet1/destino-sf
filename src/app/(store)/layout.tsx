import { Viewport } from 'next';

// Override the theme color for store pages
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: '#ffffff',
};

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
