'use client';

import { Loader } from '@googlemaps/js-api-loader';
import { useEffect, useRef } from 'react';

function GoogleMaps() {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initMap = async () => {
      try {
        console.log(
          'Valor de NEXT_PUBLIC_GOOGLE_MAPS_API_KEY:',
          process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
        );

        const loader = new Loader({
          apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
          version: 'quarterly',
          libraries: ['places'],
        });

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

        const map = new Map(mapRef.current as HTMLElement, options);

        const { AdvancedMarkerElement } = (await loader.importLibrary(
          'marker'
        )) as google.maps.MarkerLibrary;

        new AdvancedMarkerElement({
          position: {
            lat: 37.7266587,
            lng: -122.368223217,
          },
          map: map,
        });
      } catch (error) {
        console.error('Error al cargar o inicializar el mapa:', error);
      }
    };

    initMap();
  }, []);

  return <div ref={mapRef} className="w-full h-screen" />;
}

export default GoogleMaps;
