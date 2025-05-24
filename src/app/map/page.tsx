// app/mapa/page.tsx (o cualquier otra ruta que prefieras)
import GoogleMaps from '@/components/Maps/GoogleMaps';

export default function MapPage() {
  // Accede a la variable de entorno del lado del servidor
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  return <GoogleMaps apiKey={apiKey} />;
}
