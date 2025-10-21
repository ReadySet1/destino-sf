// StoreLocationsMap.tsx
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import GoogleMapsErrorBoundary from './GoogleMapsErrorBoundary';

// Store location data
export const STORE_LOCATIONS = [
  // San Francisco Locations
  {
    name: "Faletti's Market",
    address: '308 Broderick St, San Francisco, CA 94117',
  },
  {
    name: "Luke's Local",
    address: '960 Cole St, San Francisco, CA 94117',
  },
  {
    name: "Luke's Local",
    address: '580 Green St, San Francisco, CA 94133',
  },
  {
    name: "Luke's Local",
    address: '1266 9th Ave, San Francisco, CA 94122',
  },
  {
    name: "Luke's Local",
    address: '2190 Union St, San Francisco, CA 94123',
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
    name: 'Epicurean Trader - Hayes',
    address: '465 Hayes St, San Francisco, CA 94102',
  },
  {
    name: 'Epicurean Trader - Union',
    address: '1909 Union St, San Francisco, CA 94123',
  },
  {
    name: 'Epicurean Trader - Market St',
    address: '2240 Market St, San Francisco, CA 94114',
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
    name: 'Corona Heights Market and Deli',
    address: '4400 17th St, San Francisco, CA 94114',
  },
  // Nugget Market Locations
  {
    name: 'Nugget Market #1',
    address: '157 Main Street, Woodland, CA 95695',
  },
  {
    name: 'Nugget Market #5',
    address: '1040 Florin Road, Sacramento, CA 95831',
  },
  {
    name: 'Nugget Market #6',
    address: '2000 Town Center Plaza, West Sacramento, CA 95691',
  },
  {
    name: 'Nugget Market #7',
    address: '771 Pleasant Grove Blvd, Roseville, CA 95678',
  },
  {
    name: 'Nugget Market #8',
    address: '7101 Elk Grove Blvd, Elk Grove, CA 95758',
  },
  {
    name: 'Nugget Market #9',
    address: '4500 Post Street, El Dorado Hills, CA 95762',
  },
  {
    name: 'Nugget Market #10',
    address: '1509 Blue Oaks Blvd, Roseville, CA 95747',
  },
  {
    name: 'Nugget Market #11',
    address: '130 Browns Valley Parkway, Vacaville, CA 95688',
  },
  {
    name: 'Nugget Market #12',
    address: '1414 E. Covell Blvd, Davis, CA 95616',
  },
  {
    name: 'Nugget Market #15',
    address: '5627 Paradise Drive, Corte Madera, CA 94925',
  },
  {
    name: 'Nugget Market #16',
    address: '470 Ignacio Blvd, Novato, CA 94949',
  },
  {
    name: 'Sonoma Market #17',
    address: '500 W. Napa Street #550, Sonoma, CA 95476',
  },
  {
    name: 'Nugget Market #18',
    address: '4080 Douglas Blvd, Granite Bay, CA 95746',
  },
  {
    name: 'Fork Lift #21',
    address: '3333 Coach Lane, Cameron Park, CA 95682',
  },
];

// Add TypeScript declaration for the Google Maps API
declare global {
  interface Window {
    google: {
      maps: {
        Map: new (element: HTMLElement, options: any) => any;
        Marker: new (options: any) => any;
        InfoWindow: new () => any;
        Geocoder: new () => any;
        LatLngBounds: new () => any;
        Animation: {
          DROP: any;
        };
        GeocoderStatus: any;
      };
    };
  }
}

// Type definitions for Google Maps API responses
type GoogleMapsGeocoderResult = {
  geometry: {
    location: {
      lat(): number;
      lng(): number;
    };
  };
};

type GoogleMapsGeocoderStatus =
  | 'OK'
  | 'ZERO_RESULTS'
  | 'OVER_QUERY_LIMIT'
  | 'REQUEST_DENIED'
  | 'INVALID_REQUEST'
  | 'UNKNOWN_ERROR';

interface StoreLocation {
  name: string;
  address: string;
  lat?: number;
  lng?: number;
}

interface StoreLocationsMapProps {
  selectedLocationIndex?: number | null;
  onLocationSelect?: (index: number | null) => void;
  showLocationsList?: boolean;
  className?: string;
}

// Utility function to generate Google Maps link
const generateGoogleMapsLink = (location: StoreLocation): string => {
  if (location.lat && location.lng) {
    return `https://www.google.com/maps?q=${location.lat},${location.lng}`;
  }
  const encodedAddress = encodeURIComponent(location.address);
  return `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
};

// Google Maps Component with direct JavaScript API integration
const GoogleMapsComponent: React.FC<{
  apiKey: string | undefined;
  locations: StoreLocation[];
  selectedLocationIndex: number | null;
}> = ({ apiKey, locations, selectedLocationIndex }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any | null>(null);
  const markersRef = useRef<any[]>([]);
  const infoWindowRef = useRef<any | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Function to initialize the map and add all markers
  const initMap = useCallback(() => {
    if (!mapRef.current || !window.google || !window.google.maps) return;

    if (
      !window.google.maps.Map ||
      !window.google.maps.Marker ||
      !window.google.maps.InfoWindow ||
      !window.google.maps.Geocoder ||
      !window.google.maps.LatLngBounds
    ) {
      setTimeout(() => initMap(), 100);
      return;
    }

    if (mapInstance.current) {
      setMapLoaded(true);
      return;
    }

    try {
      const map = new window.google.maps.Map(mapRef.current, {
        center: { lat: 37.7749, lng: -122.4194 },
        zoom: 11,
        mapTypeControl: false,
        fullscreenControl: true,
        streetViewControl: false,
      });
      mapInstance.current = map;
      infoWindowRef.current = new window.google.maps.InfoWindow();
      markersRef.current = [];

      const bounds = new window.google.maps.LatLngBounds();
      let geocodeCount = 0;
      const totalLocations = locations.length;

      if (totalLocations === 0) {
        setMapLoaded(true);
        return;
      }

      locations.forEach((location, index) => {
        const geocoder = new window.google.maps.Geocoder();

        geocoder.geocode(
          { address: location.address },
          (results: GoogleMapsGeocoderResult[] | null, status: GoogleMapsGeocoderStatus) => {
            geocodeCount++;
            if (status === 'OK' && results && results[0]) {
              const position = results[0].geometry.location;
              const marker = new window.google.maps.Marker({
                position: position,
                map: map,
                title: location.name,
                animation: window.google.maps.Animation.DROP,
              });

              markersRef.current[index] = marker;
              bounds.extend(position);

              location.lat = position.lat();
              location.lng = position.lng();

              marker.addListener('click', () => {
                // Handled by parent component
              });
            } else {
              console.error(`Geocode was not successful for ${location.name}: ${status}`);
            }

            if (geocodeCount === totalLocations) {
              if (!bounds.isEmpty()) {
                map.fitBounds(bounds);
                const zoomThreshold = 0.05;
                if (
                  bounds.getNorthEast().lng() - bounds.getSouthWest().lng() < zoomThreshold &&
                  bounds.getNorthEast().lat() - bounds.getSouthWest().lat() < zoomThreshold &&
                  locations.length > 0
                ) {
                  map.setZoom(Math.min(map.getZoom(), 13));
                }
              }
              setMapLoaded(true);
            }
          }
        );
      });
    } catch (error) {
      console.error('Error initializing Google Maps:', error);
      setTimeout(() => initMap(), 500);
    }
  }, [locations]);

  // Load Google Maps script and initialize map
  useEffect(() => {
    if (!apiKey) return;

    if (window.google && window.google.maps) {
      setTimeout(() => initMap(), 100);
      return;
    }

    const scriptId = 'google-maps-script';
    if (document.getElementById(scriptId)) {
      if (!mapLoaded && window.google && window.google.maps) {
        setTimeout(() => initMap(), 100);
      }
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setTimeout(() => {
        if (window.google && window.google.maps) {
          initMap();
        } else {
          console.error('Google Maps API did not load correctly.');
        }
      }, 100);
    };
    script.onerror = error => {
      console.error('Failed to load Google Maps script:', error);
    };
    document.head.appendChild(script);
  }, [apiKey, initMap, mapLoaded]);

  // Handle marker visibility and map focus based on selected location
  useEffect(() => {
    if (!mapInstance.current || !mapLoaded || markersRef.current.length === 0) return;

    const allMarkersExist =
      markersRef.current.length === locations.length &&
      markersRef.current.every(marker => marker !== undefined && marker !== null);

    if (!allMarkersExist) return;

    if (selectedLocationIndex !== null) {
      markersRef.current.forEach(marker => {
        if (marker) {
          marker.setMap(null);
        }
      });

      const selectedMarker = markersRef.current[selectedLocationIndex];
      const selectedLocation = locations[selectedLocationIndex];

      if (selectedMarker && selectedLocation) {
        selectedMarker.setMap(mapInstance.current);

        const position = selectedMarker.getPosition();
        if (position) {
          mapInstance.current.panTo(position);
          mapInstance.current.setZoom(16);

          if (infoWindowRef.current) {
            infoWindowRef.current.close();
          }
          setTimeout(() => {
            if (infoWindowRef.current && mapInstance.current) {
              const googleMapsLink = generateGoogleMapsLink(selectedLocation);
              infoWindowRef.current.setContent(
                `<div>
                  <h3 style="font-weight: bold; margin-bottom: 5px; color: #8C4B00;">${selectedLocation.name}</h3>
                  <p style="margin: 0 0 8px 0; color: #B35E00;">${selectedLocation.address}</p>
                  <a href="${googleMapsLink}" target="_blank" rel="noopener noreferrer"
                     style="color: #4285f4; text-decoration: none; font-size: 12px; display: inline-flex; align-items: center; gap: 4px;">
                    <span>View in Google Maps</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
                    </svg>
                  </a>
                </div>`
              );
              infoWindowRef.current.open(mapInstance.current, selectedMarker);
            }
          }, 300);
        }
      }
    } else {
      markersRef.current.forEach(marker => {
        if (marker && mapInstance.current) {
          marker.setMap(mapInstance.current);
        }
      });

      if (infoWindowRef.current) {
        infoWindowRef.current.close();
      }

      setTimeout(() => {
        if (mapInstance.current) {
          const bounds = new window.google.maps.LatLngBounds();
          markersRef.current.forEach(marker => {
            if (marker) {
              const position = marker.getPosition();
              if (position) {
                bounds.extend(position);
              }
            }
          });

          if (!bounds.isEmpty()) {
            mapInstance.current.fitBounds(bounds);
            const zoomThreshold = 0.05;
            if (
              bounds.getNorthEast().lng() - bounds.getSouthWest().lng() < zoomThreshold &&
              bounds.getNorthEast().lat() - bounds.getSouthWest().lat() < zoomThreshold &&
              locations.length > 0
            ) {
              const currentZoom = mapInstance.current.getZoom();
              if (typeof currentZoom === 'number') {
                mapInstance.current.setZoom(Math.min(currentZoom, 13));
              }
            }
          }
        }
      }, 100);
    }
  }, [selectedLocationIndex, locations, mapLoaded]);

  if (!apiKey) {
    return (
      <div className="flex items-center justify-center h-full bg-amber-50 p-4">
        <div className="text-center">
          <p className="text-red-500 font-quicksand mb-2">Google Maps API key is not configured.</p>
          <p className="text-sm text-gray-600 font-quicksand">
            Please set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in your environment variables.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div ref={mapRef} className="w-full h-full bg-gray-100" />
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-amber-50 bg-opacity-90 z-10">
          <div className="flex flex-col items-center">
            <svg
              className="animate-spin h-10 w-10 text-amber-500 mb-3"
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
            <p className="text-amber-800 font-quicksand font-medium text-lg">Loading map...</p>
            <p className="text-amber-600 font-quicksand text-sm mt-1">
              Geocoding {locations.length} locations
            </p>
          </div>
        </div>
      )}
    </>
  );
};

// Main Store Locations Map Component
const StoreLocationsMap: React.FC<StoreLocationsMapProps> = ({
  selectedLocationIndex: externalSelectedIndex,
  onLocationSelect,
  showLocationsList = true,
  className = '',
}) => {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const [internalSelectedIndex, setInternalSelectedIndex] = useState<number | null>(null);

  const selectedLocationIndex = externalSelectedIndex ?? internalSelectedIndex;

  const handleLocationClick = useCallback(
    (index: number) => {
      const newIndex = selectedLocationIndex === index ? null : index;
      if (onLocationSelect) {
        onLocationSelect(newIndex);
      } else {
        setInternalSelectedIndex(newIndex);
      }
    },
    [selectedLocationIndex, onLocationSelect]
  );

  const handleShowAllLocations = useCallback(() => {
    if (onLocationSelect) {
      onLocationSelect(null);
    } else {
      setInternalSelectedIndex(null);
    }
  }, [onLocationSelect]);

  const handleOpenInGoogleMaps = useCallback((location: StoreLocation, event: React.MouseEvent) => {
    event.stopPropagation();
    const googleMapsLink = generateGoogleMapsLink(location);
    window.open(googleMapsLink, '_blank', 'noopener,noreferrer');
  }, []);

  return (
    <div className={`flex flex-col md:flex-row h-full w-full ${className}`}>
      {/* Map container */}
      <div
        className={`${showLocationsList ? 'w-full md:w-2/3' : 'w-full'} h-full relative min-h-[400px]`}
      >
        <GoogleMapsErrorBoundary>
          <GoogleMapsComponent
            apiKey={apiKey}
            locations={STORE_LOCATIONS}
            selectedLocationIndex={selectedLocationIndex}
          />
        </GoogleMapsErrorBoundary>
      </div>

      {/* Location list sidebar */}
      {showLocationsList && (
        <div className="w-full md:w-1/3 h-full overflow-y-auto border-t md:border-t-0 md:border-l border-amber-100 bg-white">
          <div className="p-4 sticky top-0 bg-white border-b border-amber-100 z-10">
            <div className="flex items-center justify-between">
              <h4 className="font-quicksand font-medium text-amber-900">
                {selectedLocationIndex !== null ? 'Selected Location:' : 'All Locations:'}
              </h4>
              {selectedLocationIndex !== null && (
                <button
                  onClick={handleShowAllLocations}
                  className="px-3 py-1 text-sm bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-md transition-colors font-quicksand"
                >
                  Show All
                </button>
              )}
            </div>
          </div>
          <div className="p-4">
            <ul className="space-y-3">
              {STORE_LOCATIONS.map((location, index) => (
                <li
                  key={index}
                  className={`pb-2 border-b border-amber-50 last:border-b-0 cursor-pointer transition-all duration-200 p-2 -mx-2 rounded ${
                    selectedLocationIndex === index
                      ? 'bg-amber-100 border-amber-200 shadow-sm'
                      : 'hover:bg-amber-50/30'
                  }`}
                  onClick={() => handleLocationClick(index)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <span
                        className={`font-quicksand font-medium block ${
                          selectedLocationIndex === index ? 'text-amber-900' : 'text-amber-800'
                        }`}
                      >
                        {location.name}
                      </span>
                      <span
                        className={`text-sm ${
                          selectedLocationIndex === index ? 'text-amber-800' : 'text-amber-700'
                        }`}
                      >
                        {location.address}
                      </span>
                      {selectedLocationIndex === index && (
                        <span className="text-xs text-amber-600 mt-1 block italic">
                          Click again to show all locations
                        </span>
                      )}
                    </div>

                    {/* Google Maps Link Button */}
                    <button
                      onClick={e => handleOpenInGoogleMaps(location, e)}
                      className="ml-2 p-1.5 rounded-full hover:bg-amber-200 transition-colors text-amber-600 hover:text-amber-800 flex-shrink-0"
                      title="Open in Google Maps"
                      aria-label={`Open ${location.name} in Google Maps`}
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z" />
                      </svg>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreLocationsMap;
