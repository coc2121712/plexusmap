'use client';

import { useCallback, useEffect, useRef } from 'react';
import { APIProvider, Map, useMap } from '@vis.gl/react-google-maps';
import { useMapStore } from '@/stores/map-store';
import { MapMarkers } from './MapMarkers';
import { PANAMA_CENTER, DEFAULT_ZOOM } from '@/lib/google-maps';

const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

export function MapView() {
  const { mapCenter, mapZoom, setMapCenter, setMapZoom } = useMapStore();

  const handleCameraChange = useCallback(
    (ev: { detail: { center: { lat: number; lng: number }; zoom: number } }) => {
      setMapCenter(ev.detail.center);
      setMapZoom(ev.detail.zoom);
    },
    [setMapCenter, setMapZoom]
  );

  if (!MAPS_API_KEY) {
    return <MapFallback />;
  }

  return (
    <APIProvider apiKey={MAPS_API_KEY}>
      <Map
        defaultCenter={PANAMA_CENTER}
        defaultZoom={DEFAULT_ZOOM}
        center={mapCenter}
        zoom={mapZoom}
        onCameraChanged={handleCameraChange}
        gestureHandling="greedy"
        disableDefaultUI={false}
        mapId="plexusmap-main"
        className="w-full h-full"
      >
        <MapMarkers />
        <LocateButton />
      </Map>
    </APIProvider>
  );
}

function LocateButton() {
  const map = useMap();
  const { setUserLocation, setMapCenter, setMapZoom } = useMapStore();

  const handleLocate = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        setMapCenter(loc);
        setMapZoom(15);
      },
      (err) => {
        console.warn('Geolocation error:', err.message);
      }
    );
  }, [setUserLocation, setMapCenter, setMapZoom]);

  return (
    <button
      onClick={handleLocate}
      className="absolute bottom-6 right-4 z-10 bg-white rounded-full p-3 shadow-lg hover:shadow-xl transition-shadow border border-gray-200"
      title="Mi ubicación"
      aria-label="Centrar en mi ubicación"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 2a1 1 0 011 1v2.07A8.002 8.002 0 0118.93 11H21a1 1 0 110 2h-2.07A8.002 8.002 0 0113 18.93V21a1 1 0 11-2 0v-2.07A8.002 8.002 0 015.07 13H3a1 1 0 110-2h2.07A8.002 8.002 0 0111 5.07V3a1 1 0 011-1zm0 5a5 5 0 100 10 5 5 0 000-10zm0 3a2 2 0 110 4 2 2 0 010-4z" />
      </svg>
    </button>
  );
}

function MapFallback() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-500">
      <div className="text-center p-8">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
        <p className="text-lg font-medium">Mapa no disponible</p>
        <p className="text-sm mt-1">Configure NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</p>
      </div>
    </div>
  );
}
