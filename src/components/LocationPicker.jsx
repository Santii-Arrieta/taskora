import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap, Circle } from 'react-leaflet';
import { Icon } from 'leaflet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Search } from 'lucide-react';
import LocationDropdown from './LocationDropdown';
import { ArgentinaGeocodingService } from '@/lib/argentinaGeocoding';

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

const LocationPicker = ({ value, onChange, radius = 10, showSearch = true, isDraggable = true, onSearchSubmit, height = '60vh', showRadius = true }) => {
  const [currentValue, setCurrentValue] = useState(value);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentRadius, setCurrentRadius] = useState(radius);

  useEffect(() => {
    setCurrentValue(value);
    setCurrentRadius(radius);
    
    // Si hay un valor inicial, hacer reverse geocoding para obtener el nombre
    if (value && value.lat && value.lng) {
      ArgentinaGeocodingService.reverseGeocode(value.lat, value.lng)
        .then(locationName => {
          setSearchQuery(locationName);
        })
        .catch(error => {
          console.error('Error getting location name:', error);
          setSearchQuery('Ubicación seleccionada');
        });
    }
  }, [value, radius]);

  const handleMapClick = (e) => {
    if (!isDraggable) return;
    const { lat, lng } = e.latlng;
    const newLocation = { lat, lng };
    setCurrentValue(newLocation);
    if (onChange) onChange(newLocation, currentRadius);
  };

  const handleLocationSelect = (location, displayName) => {
    setCurrentValue(location);
    setSearchQuery(displayName);
    if (onChange) onChange(location, currentRadius);
    if (onSearchSubmit) onSearchSubmit(location);
  };

  const handleRadiusChange = (newRadius) => {
    setCurrentRadius(newRadius);
    // Siempre llamar al callback con el radio, incluso si no hay ubicación
    if (onChange) {
      onChange(currentValue, newRadius);
    }
  };

  const MapEvents = () => {
    useMap().on('click', handleMapClick);
    return null;
  };

  return (
    <div className="space-y-4">
      {showSearch && (
        <LocationDropdown
          value={searchQuery}
          onChange={handleLocationSelect}
          placeholder="Buscar ubicación en Argentina..."
          onLocationSelect={handleLocationSelect}
        />
      )}
      
      {showRadius && currentValue && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Radio de búsqueda: {currentRadius} km
          </Label>
          <Slider
            min={1}
            max={100}
            step={1}
            value={[currentRadius]}
            onValueChange={(value) => handleRadiusChange(value[0])}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Este radio se usará para encontrar servicios cerca de tu ubicación
          </p>
        </div>
      )}
      
      <div className="w-full rounded-md overflow-hidden z-0" style={{ height }}>
        <MapContainer center={currentValue || [-34.6037, -58.3816]} zoom={13} style={{ height: '100%', width: '100%' }}>
          <InvalidateSizeOnMount />
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <DraggableMarker value={currentValue} onChange={onChange} isDraggable={isDraggable} />
          {currentValue && currentRadius && (
            <Circle
              center={currentValue}
              pathOptions={{ color: 'blue', fillColor: 'blue', fillOpacity: 0.2 }}
              radius={currentRadius * 1000} // radius in meters
            />
          )}
          <MapEvents />
        </MapContainer>
      </div>
    </div>
  );
};

export default LocationPicker;