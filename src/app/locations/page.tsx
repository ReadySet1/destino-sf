import type { Metadata } from 'next';
import StoreLocationsPage from './StoreLocationsPage';

export const metadata: Metadata = {
  title: 'Store Locations | Destino',
  description:
    'Find Destino products at 29 locations across Northern California, including San Francisco and the Greater Sacramento area. Browse our store locator map.',
  openGraph: {
    title: 'Store Locations | Destino',
    description:
      'Find Destino products at 29 locations across Northern California, including San Francisco and the Greater Sacramento area.',
  },
};

export default function LocationsPage() {
  return <StoreLocationsPage />;
}
