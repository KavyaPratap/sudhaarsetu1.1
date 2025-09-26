
'use client';

import * as React from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default icon issue with webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});


interface IssueLocationMapProps {
  location: { lat: number; lng: number };
  interactive?: boolean;
  onLocationChange?: (location: { lat: number, lng: number }) => void;
}

export default function IssueLocationMap({
  location,
  interactive = false,
  onLocationChange,
}: IssueLocationMapProps) {
    const mapRef = React.useRef<HTMLDivElement>(null);
    const isMapInitialized = React.useRef(false);

    React.useEffect(() => {
        let map: L.Map | null = null;
        if (mapRef.current && !isMapInitialized.current) {
            map = L.map(mapRef.current).setView([location.lat, location.lng], 16);
            isMapInitialized.current = true;

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);

            const marker = L.marker([location.lat, location.lng], { draggable: interactive }).addTo(map);

            if (interactive) {
                marker.bindPopup("Drag to pinpoint the exact location").openPopup();
                
                marker.on('dragend', () => {
                    const newLatLng = marker.getLatLng();
                    if(onLocationChange) {
                        onLocationChange(newLatLng);
                    }
                });

                map.on('click', (e) => {
                    marker.setLatLng(e.latlng);
                     if(onLocationChange) {
                        onLocationChange(e.latlng);
                    }
                });
            } else {
                 marker.bindPopup("Issue Location").openPopup();
            }

            // Invalidate map size after a short delay to ensure it renders correctly, especially in dialogs
            setTimeout(() => {
                map?.invalidateSize();
            }, 100);

        }
        
        // Cleanup function
        return () => {
            if (map) {
                map.remove();
            }
            isMapInitialized.current = false;
        };
    }, [location, interactive, onLocationChange]);


    return (
        <div 
            ref={mapRef} 
            style={{ 
                height: '100%', 
                width: '100%',
            }} 
        />
    );
}
