import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap, Circle } from 'react-leaflet';
import { Icon } from 'leaflet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';

const customIcon = new Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const DraggableMarker = ({ value, onChange, isDraggable = true }) => {
  const [position, setPosition] = useState(value);
  const map = useMap();
  const markerRef = useRef(null);

  useEffect(() => {
    if (value) {
      setPosition(value);
      map.flyTo(value, map.getZoom());
    }
  }, [value, map]);

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        if (!isDraggable) return;
        const marker = markerRef.current;
        if (marker != null) {
          const newPos = marker.getLatLng();
          setPosition(newPos);
          if (onChange) onChange(newPos);
        }
      },
    }),
    [onChange, isDraggable],
  );

  return position === null ? null : (
    <Marker
      draggable={isDraggable}
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
      icon={customIcon}
    />
  );
};

const LocationPicker = ({ value, onChange, radius, showSearch = true, isDraggable = true, onSearchSubmit, searchValue, onSearchChange }) => {
  const [currentValue, setCurrentValue] = useState(value);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  const handleMapClick = (e) => {
    if (!isDraggable) return;
    const { lat, lng } = e.latlng;
    const newLocation = { lat, lng };
    setCurrentValue(newLocation);
    if (onChange) onChange(newLocation);
  };

  const handleSearch = async () => {
    const query = (searchValue ?? searchQuery) || '';
    if (!query) return;
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        const newLocation = { lat: parseFloat(lat), lng: parseFloat(lon) };
        setCurrentValue(newLocation);
        if (onChange) onChange(newLocation);
        if (onSearchSubmit) onSearchSubmit(newLocation);
        if (onSearchChange && data[0]?.display_name) onSearchChange(data[0].display_name);
      } else {
        alert('Ubicación no encontrada.');
      }
    } catch (error) {
      console.error('Error searching for location:', error);
      alert('Error al buscar la ubicación.');
    }
  };

  const MapEvents = () => {
    useMap().on('click', handleMapClick);
    return null;
  };

  return (
    <div className="space-y-2">
      {showSearch && (
        <div className="flex gap-2">
          <Input
            type="text"
            value={(searchValue ?? searchQuery)}
            onChange={(e) => {
              if (onSearchChange) onSearchChange(e.target.value);
              else setSearchQuery(e.target.value);
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearch(); } }}
            placeholder="Buscar dirección..."
          />
          <Button type="button" size="icon" variant="outline" onClick={handleSearch}><Search className="w-4 h-4" /></Button>
        </div>
      )}
      <div className="h-64 w-full rounded-md overflow-hidden z-0">
        <MapContainer center={currentValue || [-34.6037, -58.3816]} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <DraggableMarker value={currentValue} onChange={onChange} isDraggable={isDraggable} />
          {currentValue && radius && (
            <Circle
              center={currentValue}
              pathOptions={{ color: 'blue', fillColor: 'blue', fillOpacity: 0.1, weight: 1 }}
              radius={radius * 1000} // radius in meters
            />
          )}
          <MapEvents />
        </MapContainer>
      </div>
    </div>
  );
};

export default LocationPicker;