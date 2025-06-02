// MapModal.tsx
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
        LatLngBounds: any;
      };
    };
  }
}

interface StoreLocation {
  name: string;
  address: string;
  lat?: number;
  lng?: number;
}

interface MapModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Utility function to generate Google Maps link
const generateGoogleMapsLink = (location: StoreLocation): string => {
  // If we have lat/lng coordinates, use them for more precise linking
  if (location.lat && location.lng) {
    return `https://www.google.com/maps?q=${location.lat},${location.lng}`;
  }

  // Otherwise, use the address
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
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Function to initialize the map and add all markers
  const initMap = useCallback(() => {
    if (!mapRef.current || !window.google) return;

    // Avoid re-initializing the map if it already exists
    if (mapInstance.current) {
      setMapLoaded(true);
      return;
    }

    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat: 37.7749, lng: -122.4194 }, // Default center, will be overridden by fitBounds
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
        (results: google.maps.GeocoderResult[] | null, status: google.maps.GeocoderStatus) => {
          geocodeCount++;
          if (status === 'OK' && results && results[0]) {
            const position = results[0].geometry.location;
            const marker = new window.google.maps.Marker({
              position: position,
              map: map, // Initially add all markers to the map
              title: location.name,
              animation: window.google.maps.Animation.DROP,
            });

            markersRef.current[index] = marker;
            bounds.extend(position);

            // Store lat/lng coordinates in the location object for Google Maps links
            location.lat = position.lat();
            location.lng = position.lng();

            marker.addListener('click', () => {
              // Trigger the click event in the parent component to update selectedLocationIndex
              // This is handled by the useEffect for selectedLocationIndex
            });
          } else {
            console.error(`Geocode was not successful for ${location.name}: ${status}`);
          }

          if (geocodeCount === totalLocations) {
            // Fit map to show all locations initially after all geocodes are done
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
  }, [locations]);

  // Load Google Maps script and initialize map
  useEffect(() => {
    if (!apiKey) return;

    if (window.google && window.google.maps) {
      initMap();
      return;
    }

    const scriptId = 'google-maps-script';
    if (document.getElementById(scriptId)) {
      if (!mapLoaded && window.google && window.google.maps) {
        initMap();
      }
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google && window.google.maps) {
        initMap();
      } else {
        console.error('Google Maps API did not load correctly.');
      }
    };
    script.onerror = error => {
      console.error('Failed to load Google Maps script:', error);
    };
    document.head.appendChild(script);
  }, [apiKey, initMap, mapLoaded]);

  // Handle marker visibility and map focus based on selected location
  useEffect(() => {
    if (!mapInstance.current || !mapLoaded || markersRef.current.length === 0) return;

    // Ensure all markers are initialized before manipulating them
    const allMarkersExist =
      markersRef.current.length === locations.length &&
      markersRef.current.every(marker => marker !== undefined && marker !== null);

    if (!allMarkersExist) return; // Wait until all markers are ready

    if (selectedLocationIndex !== null) {
      // Hide all markers
      markersRef.current.forEach(marker => {
        if (marker) {
          marker.setMap(null);
        }
      });

      // Show only the selected marker and focus on it
      const selectedMarker = markersRef.current[selectedLocationIndex];
      const selectedLocation = locations[selectedLocationIndex];

      if (selectedMarker && selectedLocation) {
        selectedMarker.setMap(mapInstance.current); // Add the selected marker back to the map

        const position = selectedMarker.getPosition();
        if (position) {
          mapInstance.current.panTo(position);
          mapInstance.current.setZoom(16); // Zoom in on the selected location

          // Close any open info windows and open for the selected marker
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
          }, 300); // Small delay to ensure map animation completes
        }
      }
    } else {
      // Show all markers
      markersRef.current.forEach(marker => {
        if (marker && mapInstance.current) {
          marker.setMap(mapInstance.current);
        }
      });

      // Close info window
      if (infoWindowRef.current) {
        infoWindowRef.current.close();
      }

      // Fit map to show all locations
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
            // Re-apply zoom adjustment if needed for very close markers
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
      }, 100); // Small delay to ensure markers are rendered before fitting bounds
    }
  }, [selectedLocationIndex, locations, mapLoaded]);

  if (!apiKey) {
    return (
      <div className="flex items-center justify-center h-full bg-amber-50">
        <p className="text-red-500 font-quicksand">Google Maps API key is not configured.</p>
      </div>
    );
  }

  return (
    <>
      <div ref={mapRef} className="w-full h-full" />
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-amber-50 bg-opacity-75">
          <div className="flex flex-col items-center">
            <svg
              className="animate-spin h-8 w-8 text-amber-500 mb-2"
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
            <p className="text-amber-700 font-quicksand">Loading map...</p>
          </div>
        </div>
      )}
    </>
  );
};

// MapModal Component
const MapModal: React.FC<MapModalProps> = ({ isOpen, onClose }) => {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const [selectedLocationIndex, setSelectedLocationIndex] = useState<number | null>(null);

  // Reset selection when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedLocationIndex(null); // Ensures all locations are shown initially
    }
  }, [isOpen]);

  const handleLocationClick = useCallback((index: number) => {
    // Toggle selected location: if already selected, deselect to show all; otherwise, select.
    setSelectedLocationIndex(prevIndex => (prevIndex === index ? null : index));
  }, []);

  // Handle showing all locations again
  const handleShowAllLocations = useCallback(() => {
    setSelectedLocationIndex(null);
  }, []);

  // Handle opening Google Maps link
  const handleOpenInGoogleMaps = useCallback((location: StoreLocation, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent location selection when clicking the link
    const googleMapsLink = generateGoogleMapsLink(location);
    window.open(googleMapsLink, '_blank', 'noopener,noreferrer');
  }, []);

  if (!isOpen) return null;

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
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ type: 'spring', damping: 20 }}
        className="bg-white rounded-xl overflow-hidden w-full max-w-5xl max-h-[90vh] flex flex-col"
      >
        <div className="p-4 border-b border-amber-100 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h3 className="font-quicksand text-xl font-semibold text-amber-900">
              Our Store Locations
            </h3>
            {/* Show "Show All Locations" button only when a specific location is selected */}
            {selectedLocationIndex !== null && (
              <button
                onClick={handleShowAllLocations}
                className="px-3 py-1 text-sm bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-md transition-colors font-quicksand"
              >
                Show All Locations
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-amber-50/50 transition-colors"
          >
            <svg
              className="w-6 h-6 text-amber-500"
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
            <GoogleMapsComponent
              apiKey={apiKey}
              locations={storeLocations}
              selectedLocationIndex={selectedLocationIndex}
            />
          </div>

          {/* Location list sidebar */}
          <div className="w-full md:w-1/3 h-full overflow-y-auto border-t md:border-t-0 md:border-l border-amber-100">
            <div className="p-4">
              <h4 className="font-quicksand font-medium text-amber-900 mb-3">
                {selectedLocationIndex !== null ? 'Selected Location:' : 'All Locations:'}
              </h4>
              <ul className="space-y-3">
                {storeLocations.map((location, index) => (
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
        </div>
      </motion.div>
    </div>
  );
};

export default MapModal;
