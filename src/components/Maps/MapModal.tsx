import React from 'react';
import { motion } from 'framer-motion';

// Add TypeScript declaration for the Google Maps API
declare global {
  interface Window {
    google: {
      maps: {
        Map: any;
        Marker: any;
        InfoWindow: any;
        Geocoder: any;
        Animation: {
          DROP: any;
        };
        GeocoderStatus: any;
        GeocoderResult: any;
      };
    };
  }
}

interface StoreLocation {
  name: string;
  address: string;
}

interface MapModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MapModal: React.FC<MapModalProps> = ({ isOpen, onClose }) => {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!isOpen) return null;

  // Create a list of your store locations with specific addresses
  const storeLocations: StoreLocation[] = [
    {
      name: "Faletti's Market",
      address: '308 Broderick St, San Francisco, CA 94117',
    },
    {
      name: "Luke's Local",
      address: '960 Cole St, San Francisco, CA 94117',
    },
    {
      name: 'Epicurean Trader - Cortland Ave',
      address: '401 Cortland Ave, San Francisco, CA 94110',
    },
    {
      name: 'Epicurean Trader - Divisadero',
      address: '1 Divisadero St, San Francisco, CA 94117',
    },
    {
      name: "Bryan's Market",
      address: '3445 California St, San Francisco, CA 94118',
    },
    {
      name: 'Evergreen Market',
      address: '5060 Mission St, San Francisco, CA 94112',
    },
    {
      name: 'El Chavo Market',
      address: '4919 3rd St, San Francisco, CA 94124',
    },
    {
      name: 'Skyline Market',
      address: '2685 Skyline Blvd, Oakland, CA 94619',
    },
    {
      name: "Gus's Community Market - Harrison",
      address: '2111 Harrison St, San Francisco, CA 94110',
    },
    {
      name: "Gus's Community Market - Mission",
      address: '1530 Mission St, San Francisco, CA 94103',
    },
    {
      name: 'La Palma Mexicatessen',
      address: '2884 24th St, San Francisco, CA 94110',
    },
    {
      name: 'Canyon Market',
      address: '2815 Diamond St, San Francisco, CA 94131',
    },
    {
      name: 'Berkeley Bowl West',
      address: '920 Heinz Ave, Berkeley, CA 94710',
    },
    {
      name: 'Berkeley Bowl - Oregon St',
      address: '2020 Oregon St, Berkeley, CA 94703',
    },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ type: 'spring', damping: 20 }}
        className="bg-white rounded-lg overflow-hidden w-full max-w-5xl max-h-[90vh] flex flex-col"
      >
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-xl font-semibold text-gray-800">Our Store Locations</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 transition-colors"
          >
            <svg
              className="w-6 h-6 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="flex flex-col md:flex-row h-[70vh]">
          {/* Map container */}
          <div className="w-full md:w-2/3 h-full relative">
            <GoogleMapsComponent apiKey={apiKey} locations={storeLocations} />
          </div>

          {/* Location list sidebar */}
          <div className="w-full md:w-1/3 h-full overflow-y-auto border-t md:border-t-0 md:border-l">
            <div className="p-4">
              <h4 className="font-medium text-gray-800 mb-3">All Locations:</h4>
              <ul className="space-y-3">
                {storeLocations.map((location, index) => (
                  <li key={index} className="pb-2 border-b border-gray-100 last:border-b-0">
                    <span className="font-medium text-gray-800 block">{location.name}</span>
                    <span className="text-sm text-gray-600">{location.address}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// Google Maps Component with direct JavaScript API integration
const GoogleMapsComponent: React.FC<{
  apiKey: string | undefined;
  locations: StoreLocation[];
}> = ({ apiKey, locations }) => {
  const mapRef = React.useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = React.useState(false);

  // Using useEffect to initialize the map and load the Google Maps script
  React.useEffect(() => {
    // Skip if API key is missing
    if (!apiKey) return;

    // Function to initialize the map once the script is loaded
    // Defined inside useEffect to avoid dependency issues
    function initMap() {
      if (!mapRef.current || !window.google) return;

      // Create new map centered on San Francisco
      const map = new window.google.maps.Map(mapRef.current, {
        center: { lat: 37.7749, lng: -122.4194 },
        zoom: 11,
        mapTypeControl: false,
        fullscreenControl: true,
        streetViewControl: false,
      });

      // Create info window for displaying location details
      const infoWindow = new window.google.maps.InfoWindow();

      // Add markers for each location
      locations.forEach(location => {
        // Geocode the address to get coordinates
        const geocoder = new window.google.maps.Geocoder();

        geocoder.geocode(
          { address: location.address },
          (results: google.maps.GeocoderResult[] | null, status: google.maps.GeocoderStatus) => {
            if (status === 'OK' && results && results[0]) {
              const marker = new window.google.maps.Marker({
                position: results[0].geometry.location,
                map: map,
                title: location.name,
                animation: window.google.maps.Animation.DROP,
              });

              // Add click listener to show info window
              marker.addListener('click', () => {
                infoWindow.setContent(
                  `<div>
                    <h3 style="font-weight: bold; margin-bottom: 5px;">${location.name}</h3>
                    <p style="margin: 0;">${location.address}</p>
                  </div>`
                );
                infoWindow.open(map, marker);
              });
            }
          }
        );
      });

      setMapLoaded(true);
    }

    // If the script is already loaded, initialize the map
    if (window.google && window.google.maps) {
      initMap();
      return;
    }

    // Otherwise, load the script first
    const scriptId = 'google-maps-script';
    if (document.getElementById(scriptId)) return;

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = function () {
      initMap();
    };
    document.head.appendChild(script);

    // Cleanup function
    return () => {
      // Optional cleanup for the script when component unmounts
      // const scriptElement = document.getElementById(scriptId);
      // if (scriptElement) scriptElement.remove();
    };
  }, [apiKey, locations]); // Only re-run if apiKey or locations change

  if (!apiKey) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100">
        <p className="text-red-500">Google Maps API key is not configured.</p>
      </div>
    );
  }

  return (
    <>
      <div ref={mapRef} className="w-full h-full" />
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75">
          <div className="flex flex-col items-center">
            <svg
              className="animate-spin h-8 w-8 text-blue-500 mb-2"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <p className="text-gray-700">Loading map...</p>
          </div>
        </div>
      )}
    </>
  );
};

export default MapModal;
