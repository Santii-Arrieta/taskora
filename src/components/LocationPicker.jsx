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

const InvalidateSizeOnMount = () => {
  const map = useMap();
  const containerRef = map.getContainer();
  useEffect(() => {
    const invalidate = () => map.invalidateSize();
    invalidate();
    const t = setTimeout(invalidate, 0);
    let ro;
    if (containerRef && 'ResizeObserver' in window) {
      ro = new ResizeObserver(() => invalidate());
      ro.observe(containerRef);
    }
    window.addEventListener('resize', invalidate);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', invalidate);
      if (ro && containerRef) ro.unobserve(containerRef);
    };
  }, [map]);
  return null;
};

const LocationPicker = ({ value, onChange, radius, showSearch = true, isDraggable = true, onSearchSubmit, height = '60vh' }) => {
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

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery) return;
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${searchQuery}`);
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        const newLocation = { lat: parseFloat(lat), lng: parseFloat(lon) };
        setCurrentValue(newLocation);
        if (onChange) onChange(newLocation);
        if (onSearchSubmit) onSearchSubmit(newLocation);
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
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar dirección..."
          />
          <Button type="submit" size="icon" variant="outline"><Search className="w-4 h-4" /></Button>
        </form>
      )}
      <div className="w-full rounded-md overflow-hidden z-0" style={{ height }}>
        <MapContainer center={currentValue || [-34.6037, -58.3816]} zoom={13} style={{ height: '100%', width: '100%' }}>
          <InvalidateSizeOnMount />
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <DraggableMarker value={currentValue} onChange={onChange} isDraggable={isDraggable} />
          {currentValue && radius && (
            <Circle
              center={currentValue}
              pathOptions={{ color: 'blue', fillColor: 'blue', fillOpacity: 0.2 }}
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