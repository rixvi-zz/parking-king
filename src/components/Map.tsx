'use client';

import { useEffect, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in Leaflet
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
}

interface MapProps {
  center?: [number, number];
  zoom?: number;
  height?: string;
  markers?: Array<{
    position: [number, number];
    popup?: string;
  }>;
  // Legacy props for backward compatibility
  spots?: Array<{
    _id: string;
    title: string;
    description: string;
    pricePerHour: number;
    location: { lat: number; lng: number };
    address: string;
    owner?: { name: string };
  }>;
  onSpotClick?: (spot: any) => void;
  selectedSpot?: string;
}

export default function Map({
  center = [40.7128, -74.0060],
  zoom = 13,
  height = '300px',
  markers = [],
  spots = [],
  onSpotClick,
  selectedSpot
}: MapProps) {
  const [isClient, setIsClient] = useState(false);
  const [map, setMap] = useState<L.Map | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || !center[0] || !center[1]) return;

    // Create map
    const mapInstance = L.map('map').setView(center, zoom);
    
    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(mapInstance);

    // Add markers from markers prop
    markers.forEach((marker) => {
      L.marker(marker.position)
        .addTo(mapInstance)
        .bindPopup(marker.popup || 'Parking Spot Location')
        .openPopup();
    });

    // Add markers from spots prop (legacy support)
    spots.forEach((spot) => {
      const marker = L.marker([spot.location.lat, spot.location.lng])
        .addTo(mapInstance);
      
      if (spot.title) {
        marker.bindPopup(`
          <div>
            <h3 style="margin: 0 0 8px 0; font-weight: bold;">${spot.title}</h3>
            <p style="margin: 0 0 4px 0; font-size: 14px;">${spot.description}</p>
            <p style="margin: 0; font-size: 12px; color: #666;">${spot.address}</p>
            <p style="margin: 4px 0 0 0; font-weight: bold; color: #059669;">$${spot.pricePerHour}/hr</p>
          </div>
        `);
      }

      if (onSpotClick) {
        marker.on('click', () => onSpotClick(spot));
      }
    });

    setMap(mapInstance);

    // Cleanup
    return () => {
      mapInstance.remove();
    };
  }, [isClient, center, zoom, markers, spots]);

  // Don't render on server side
  if (!isClient) {
    return (
      <div
        className="bg-gray-200 rounded-lg flex items-center justify-center"
        style={{ height }}
      >
        <p className="text-gray-500">Loading map...</p>
      </div>
    );
  }

  return (
    <div 
      id="map" 
      style={{ height, width: '100%' }}
      className="rounded-lg overflow-hidden border border-gray-200"
    />
  );
}