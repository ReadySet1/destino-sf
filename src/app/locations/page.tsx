import type { Metadata } from 'next';
import StoreLocationsPage from './StoreLocationsPage';

export const metadata: Metadata = {
  title: 'Store Locations | Destino',
  description:
    'Find our handcrafted empanadas and alfajores at 29 retail partner locations throughout Northern California. Connecting people through food and community.',
  openGraph: {
    title: 'Store Locations | Destino',
    description:
      'Find our handcrafted empanadas and alfajores at 29 retail partner locations throughout Northern California. Connecting people through food and community.',
  },
};

export default function LocationsPage() {
  return <StoreLocationsPage />;
}
