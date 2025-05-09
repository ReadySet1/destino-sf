'use client';

import { Loader } from '@googlemaps/js-api-loader';
import { useEffect, useRef, useState } from 'react';

interface GoogleMapsProps {
  apiKey: string;
}

function GoogleMaps({ apiKey }: GoogleMapsProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!apiKey) {
      console.error('API key no proporcionada');
      setMapError('No se pudo cargar la clave API de Google Maps');
      setIsLoading(false);
      return;
    }

    if (!mapRef.current) {
      console.error('El contenedor del mapa no existe');
      setMapError('Error al inicializar el mapa: El contenedor del mapa no existe');
      setIsLoading(false);
      return;
    }

    console.log('Usando API key:', apiKey.substring(0, 5) + '...');
    console.log('Contenedor del mapa presente:', !!mapRef.current);

    const initMap = async () => {
      try {
        const loader = new Loader({
          apiKey,
          version: 'quarterly',
          libraries: ['places'],
        });

        // Esperar a que las bibliotecas estén cargadas
        const { Map } = await loader.importLibrary('maps');

        // Destino Location
        const location = {
          lat: 37.7266587,
          lng: -122.368223217,
        };

        const options: google.maps.MapOptions = {
          center: location,
          zoom: 15,
          mapId: 'map',
        };

        // Verificar nuevamente que el contenedor existe
        if (!mapRef.current) {
          throw new Error('El contenedor del mapa no existe');
        }

        // Crear el mapa
        const map = new Map(mapRef.current, options);

        const { AdvancedMarkerElement } = (await loader.importLibrary(
          'marker'
        )) as google.maps.MarkerLibrary;

        new AdvancedMarkerElement({
          position: location,
          map: map,
        });

        setIsLoading(false);
      } catch (error) {
        console.error('Error al cargar o inicializar el mapa:', error);
        setMapError(
          'Error al inicializar el mapa: ' +
            (error instanceof Error ? error.message : 'Desconocido')
        );
        setIsLoading(false);
      }
    };

    // Pequeño timeout para asegurar que el DOM está listo
    const timer = setTimeout(() => {
      initMap();
    }, 100);

    return () => clearTimeout(timer);
  }, [apiKey]);

  // Renderizar siempre el div del mapa, incluso cuando hay error o está cargando
  return (
    <div className="w-full h-screen relative">
      {/* El contenedor del mapa siempre está presente */}
      <div ref={mapRef} className="w-full h-full" />

      {/* Overlay de carga */}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p>Cargando mapa...</p>
          </div>
        </div>
      )}

      {/* Overlay de error */}
      {mapError && (
        <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center">
          <div className="text-center text-red-500 p-4 max-w-md">
            <h3 className="text-xl font-semibold mb-2">Error al cargar el mapa</h3>
            <p>{mapError}</p>
            <p className="mt-4 text-sm text-gray-600">
              Verifica tu conexión a internet y que la clave API de Google Maps esté configurada
              correctamente.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default GoogleMaps;
