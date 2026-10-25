import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { IonIcon, IonSpinner } from '@ionic/react';
import {
  locateOutline,
  searchOutline,
  pinOutline,
  checkmarkCircle,
  alertCircleOutline,
} from 'ionicons/icons';
import { reverseGeocode, searchPlaces } from '../services/addressService';

// Default center: Manila City Hall / Metro Manila
const DEFAULT_LAT = 14.5995;
const DEFAULT_LNG = 120.9842;

// Custom Leaflet Pin Icon with Tailwind Teal styling
const createTealPinIcon = () => {
  const svgHtml = `
    <div style="position: relative; width: 36px; height: 44px; display: flex; align-items: center; justify-content: center;">
      <svg width="36" height="44" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));">
        <path d="M12 0C5.372 0 0 5.372 0 12C0 21 12 32 12 32C12 32 24 21 24 12C24 5.372 18.628 0 12 0Z" fill="#0D9488"/>
        <circle cx="12" cy="11" r="5" fill="#FFFFFF"/>
        <circle cx="12" cy="11" r="2.5" fill="#0D9488"/>
      </svg>
      <div style="position: absolute; bottom: 0; width: 10px; height: 4px; background: rgba(0,0,0,0.25); border-radius: 50%; filter: blur(1px);"></div>
    </div>
  `;

  return L.divIcon({
    className: 'carepoint-map-pin',
    html: svgHtml,
    iconSize: [36, 44],
    iconAnchor: [18, 42],
    popupAnchor: [0, -38],
  });
};

interface AddressMapPickerProps {
  latitude?: number | null;
  longitude?: number | null;
  onLocationSelect?: (coords: {
    lat: number;
    lng: number;
    addressSuggestion?: { addressLine?: string; barangay?: string; city?: string; displayName?: string };
  }) => void;
  height?: string;
  readOnly?: boolean;
  interactiveLabel?: string;
}

export const AddressMapPicker: React.FC<AddressMapPickerProps> = ({
  latitude,
  longitude,
  onLocationSelect,
  height = '280px',
  readOnly = false,
  interactiveLabel = 'Tap map or drag pin to mark your exact delivery location',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const initialLat = latitude && !isNaN(latitude) ? latitude : DEFAULT_LAT;
  const initialLng = longitude && !isNaN(longitude) ? longitude : DEFAULT_LNG;

  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number }>({
    lat: initialLat,
    lng: initialLng,
  });
  const [hasPinned, setHasPinned] = useState<boolean>(Boolean(latitude && longitude));
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<Array<{ lat: number; lng: number; displayName: string }>>([]);
  const [statusText, setStatusText] = useState<string>('');

  // Handle position update & reverse geocoding
  const handlePositionChange = useCallback(async (lat: number, lng: number, shouldGeocode = true) => {
    setCurrentCoords({ lat, lng });
    setHasPinned(true);

    if (shouldGeocode && onLocationSelect) {
      setStatusText('Fetching address details...');
      const suggestion = await reverseGeocode(lat, lng);
      setStatusText(suggestion.addressLine ? `Near: ${suggestion.addressLine}` : 'Location pinned');
      onLocationSelect({
        lat,
        lng,
        addressSuggestion: suggestion,
      });
    } else if (onLocationSelect) {
      onLocationSelect({ lat, lng });
    }
  }, [onLocationSelect]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Prevent re-initialization if already exists
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: latitude && longitude ? 16 : 14,
      zoomControl: !readOnly,
      attributionControl: false,
    });

    // OpenStreetMap standard tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    const pinIcon = createTealPinIcon();

    // Marker
    const marker = L.marker([initialLat, initialLng], {
      icon: pinIcon,
      draggable: !readOnly,
    }).addTo(map);

    if (!readOnly) {
      // Drag events
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        handlePositionChange(pos.lat, pos.lng);
      });

      // Click on map to place pin
      map.on('click', (e: L.LeafletMouseEvent) => {
        marker.setLatLng(e.latlng);
        handlePositionChange(e.latlng.lat, e.latlng.lng);
      });
    }

    mapInstanceRef.current = map;
    markerRef.current = marker;

    // Fix grey tile issue in Ionic modals/tabs
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, []); // Run once on mount

  // Update marker and pan map if coordinates change externally
  useEffect(() => {
    if (latitude && longitude && mapInstanceRef.current && markerRef.current) {
      const lat = Number(latitude);
      const lng = Number(longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        markerRef.current.setLatLng([lat, lng]);
        mapInstanceRef.current.setView([lat, lng], 16);
        setCurrentCoords({ lat, lng });
        setHasPinned(true);
      }
    }
  }, [latitude, longitude]);

  // Geolocation Handler
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setStatusText('Acquiring GPS location...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView([lat, lng], 17);
          markerRef.current.setLatLng([lat, lng]);
        }
        handlePositionChange(lat, lng);
        setIsLocating(false);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setIsLocating(false);
        setStatusText('Unable to retrieve current location.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Search places
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    const results = await searchPlaces(searchQuery);
    setSearchResults(results);
    setIsSearching(false);

    if (results.length > 0) {
      const first = results[0];
      if (mapInstanceRef.current && markerRef.current) {
        mapInstanceRef.current.setView([first.lat, first.lng], 16);
        markerRef.current.setLatLng([first.lat, first.lng]);
      }
      handlePositionChange(first.lat, first.lng);
      setSearchResults([]);
    } else {
      setStatusText('No places found. Try another landmark.');
    }
  };

  const handleSelectSearchResult = (res: { lat: number; lng: number; displayName: string }) => {
    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.setView([res.lat, res.lng], 16);
      markerRef.current.setLatLng([res.lat, res.lng]);
    }
    handlePositionChange(res.lat, res.lng);
    setSearchResults([]);
    setSearchQuery('');
  };

  return (
    <div className="w-full rounded-2xl overflow-hidden border border-slate-200 shadow-xs bg-white relative flex flex-col">
      {!readOnly && (
        <div className="p-2.5 bg-slate-50 border-b border-slate-200/80 flex flex-col gap-2">
          {/* Top Search Bar */}
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search place, street, or city (e.g. Taft Ave, BGC)"
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
              />
              <IonIcon
                icon={searchOutline}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching || !searchQuery.trim()}
              className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1 transition-colors shrink-0"
            >
              {isSearching ? <IonSpinner name="crescent" className="w-3.5 h-3.5" /> : 'Search'}
            </button>
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={isLocating}
              title="Use current GPS location"
              className="bg-white hover:bg-slate-100 border border-slate-200 text-teal-700 p-1.5 rounded-xl flex items-center justify-center transition-colors shrink-0"
            >
              {isLocating ? (
                <IonSpinner name="crescent" className="w-4 h-4" />
              ) : (
                <IonIcon icon={locateOutline} className="text-base" />
              )}
            </button>
          </form>

          {/* Search Dropdown Results */}
          {searchResults.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-1 max-h-40 overflow-y-auto divide-y divide-slate-100 z-50">
              {searchResults.map((res, i) => (
                <div
                  key={i}
                  onClick={() => handleSelectSearchResult(res)}
                  className="p-2 hover:bg-teal-50/60 cursor-pointer text-xs text-slate-700 flex items-start gap-2 rounded-lg transition-colors"
                >
                  <IonIcon icon={pinOutline} className="text-teal-600 mt-0.5 shrink-0" />
                  <span className="line-clamp-2">{res.displayName}</span>
                </div>
              ))}
            </div>
          )}

          {/* Helper Instruction */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
            <span className="flex items-center gap-1 truncate font-medium text-slate-600">
              <IonIcon icon={pinOutline} className="text-teal-600 text-xs shrink-0" />
              <span className="truncate">{interactiveLabel}</span>
            </span>
            {hasPinned ? (
              <span className="text-emerald-700 font-bold flex items-center gap-0.5 shrink-0 ml-2">
                <IonIcon icon={checkmarkCircle} className="text-emerald-600 text-xs" />
                Pinned
              </span>
            ) : (
              <span className="text-amber-600 font-medium flex items-center gap-0.5 shrink-0 ml-2">
                <IonIcon icon={alertCircleOutline} className="text-xs" />
                Default area
              </span>
            )}
          </div>
        </div>
      )}

      {/* Map Container */}
      <div
        ref={mapContainerRef}
        style={{ height, minHeight: '180px', width: '100%', zIndex: 1 }}
        className="w-full relative"
      />

      {/* Footer Status Bar with Coords */}
      <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500">
        <span className="truncate text-slate-600 font-medium max-w-[65%]">
          {statusText || (hasPinned ? 'Pin set on map' : 'Click map to place pin')}
        </span>
        <span className="font-mono text-[10px] text-slate-400 shrink-0">
          {currentCoords.lat.toFixed(4)}, {currentCoords.lng.toFixed(4)}
        </span>
      </div>
    </div>
  );
};

export default AddressMapPicker;
