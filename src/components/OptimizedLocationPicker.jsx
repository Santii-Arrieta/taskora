import React, { useState, useEffect, useMemo, useRef, useCallback, Suspense } from 'react';
import { MapContainer, TileLayer, Marker, useMap, Circle } from 'react-leaflet';
import { Icon } from 'leaflet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Search, MapPin, Loader2 } from 'lucide-react';
import LocationDropdown from './LocationDropdown';
import { OptimizedArgentinaGeocodingService } from '@/lib/optimizedArgentinaGeocoding';

// Icono optimizado - usar icono local en lugar de CDN externo
const customIcon = new Icon({
  iconUrl: '/marker-icon.png', // Icono local para reducir requests externos
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  shadowUrl: '/marker-shadow.png',
  shadowSize: [41, 41],
  shadowAnchor: [12, 41]
});

// Componente de marcador optimizado con menos re-renders
const OptimizedDraggableMarker = React.memo(({ value, onChange, isDraggable = true }) => {
  const [position, setPosition] = useState(value);
  const map = useMap();
  const markerRef = useRef(null);
  const lastPositionRef = useRef(null);

  useEffect(() => {
    if (value && (!lastPositionRef.current || 
        lastPositionRef.current.lat !== value.lat || 
        lastPositionRef.current.lng !== value.lng)) {
      setPosition(value);
      lastPositionRef.current = value;
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
});

OptimizedDraggableMarker.displayName = 'OptimizedDraggableMarker';

// Componente optimizado para invalidar tamaño del mapa
const OptimizedInvalidateSize = React.memo(() => {
  const map = useMap();
  const containerRef = map.getContainer();
  const resizeTimeoutRef = useRef(null);

  useEffect(() => {
    const invalidate = () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      resizeTimeoutRef.current = setTimeout(() => {
        map.invalidateSize();
      }, 100); // Debounce resize events
    };

    invalidate();
    
    let ro;
    if (containerRef && 'ResizeObserver' in window) {
      ro = new ResizeObserver(invalidate);
      ro.observe(containerRef);
    }
    
    window.addEventListener('resize', invalidate);
    
    return () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      window.removeEventListener('resize', invalidate);
      if (ro && containerRef) ro.unobserve(containerRef);
    };
  }, [map, containerRef]);

  return null;
});

OptimizedInvalidateSize.displayName = 'OptimizedInvalidateSize';

// Componente de eventos del mapa optimizado
const OptimizedMapEvents = React.memo(({ onMapClick, isDraggable }) => {
  const map = useMap();
  
  useEffect(() => {
    if (!isDraggable) return;
    
    const handleClick = (e) => {
      onMapClick(e);
    };
    
    map.on('click', handleClick);
    
    return () => {
      map.off('click', handleClick);
    };
  }, [map, onMapClick, isDraggable]);

  return null;
});

OptimizedMapEvents.displayName = 'OptimizedMapEvents';

// Componente de círculo optimizado
const OptimizedCircle = React.memo(({ center, radius }) => {
  if (!center || !radius) return null;
  
  return (
    <Circle
      center={center}
      pathOptions={{ 
        color: 'blue', 
        fillColor: 'blue', 
        fillOpacity: 0.2,
        weight: 2
      }}
      radius={radius * 1000} // radius in meters
    />
  );
});

OptimizedCircle.displayName = 'OptimizedCircle';

// Componente principal optimizado
const OptimizedLocationPicker = ({ 
  value, 
  onChange, 
  radius = 10, 
  showSearch = true, 
  isDraggable = true, 
  onSearchSubmit, 
  height = '60vh', 
  showRadius = true 
}) => {
  const [currentValue, setCurrentValue] = useState(value);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentRadius, setCurrentRadius] = useState(radius);
  const [isLoading, setIsLoading] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  
  // Referencias para evitar re-renders innecesarios
  const lastValueRef = useRef(null);
  const lastRadiusRef = useRef(null);

  // Debounced reverse geocoding
  const reverseGeocodeTimeoutRef = useRef(null);
  
  const debouncedReverseGeocode = useCallback((lat, lng) => {
    if (reverseGeocodeTimeoutRef.current) {
      clearTimeout(reverseGeocodeTimeoutRef.current);
    }
    
    reverseGeocodeTimeoutRef.current = setTimeout(async () => {
      try {
        setIsLoading(true);
        const locationName = await OptimizedArgentinaGeocodingService.reverseGeocode(lat, lng);
        setSearchQuery(locationName);
      } catch (error) {
        console.error('Error getting location name:', error);
        setSearchQuery('Ubicación seleccionada');
      } finally {
        setIsLoading(false);
      }
    }, 500); // Debounce de 500ms
  }, []);

  useEffect(() => {
    // Solo actualizar si el valor realmente cambió
    if (value && (!lastValueRef.current || 
        lastValueRef.current.lat !== value.lat || 
        lastValueRef.current.lng !== value.lng)) {
      setCurrentValue(value);
      lastValueRef.current = value;
      
      // Hacer reverse geocoding solo si hay coordenadas válidas
      if (value.lat && value.lng) {
        debouncedReverseGeocode(value.lat, value.lng);
      }
    }
    
    if (radius !== lastRadiusRef.current) {
      setCurrentRadius(radius);
      lastRadiusRef.current = radius;
    }
  }, [value, radius, debouncedReverseGeocode]);

  const handleMapClick = useCallback((e) => {
    if (!isDraggable) return;
    const { lat, lng } = e.latlng;
    const newLocation = { lat, lng };
    setCurrentValue(newLocation);
    if (onChange) onChange(newLocation, currentRadius);
  }, [isDraggable, onChange, currentRadius]);

  const handleLocationSelect = useCallback((location, displayName) => {
    setCurrentValue(location);
    setSearchQuery(displayName);
    if (onChange) onChange(location, currentRadius);
    if (onSearchSubmit) onSearchSubmit(location);
  }, [onChange, currentRadius, onSearchSubmit]);

  const handleRadiusChange = useCallback((newRadius) => {
    setCurrentRadius(newRadius);
    if (onChange) {
      onChange(currentValue, newRadius);
    }
  }, [onChange, currentValue]);

  const handleMapLoad = useCallback(() => {
    setMapLoaded(true);
  }, []);

  // Memoizar el centro del mapa para evitar re-renders
  const mapCenter = useMemo(() => {
    return currentValue || [-34.6037, -58.3816];
  }, [currentValue]);

  // Memoizar el zoom inicial
  const initialZoom = useMemo(() => {
    return currentValue ? 13 : 6; // Zoom más amplio si no hay ubicación específica
  }, [currentValue]);

  return (
    <div className="space-y-4">
      {showSearch && (
        <div className="relative">
          <LocationDropdown
            value={searchQuery}
            onChange={handleLocationSelect}
            placeholder="Buscar ubicación en Argentina..."
            onLocationSelect={handleLocationSelect}
          />
          {isLoading && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      )}
      
      {showRadius && currentValue && (
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <MapPin className="w-4 h-4" />
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
        <Suspense fallback={
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
              <p className="text-sm text-muted-foreground">Cargando mapa...</p>
            </div>
          </div>
        }>
          <MapContainer 
            center={mapCenter} 
            zoom={initialZoom} 
            style={{ height: '100%', width: '100%' }}
            whenReady={handleMapLoad}
            preferCanvas={true} // Usar canvas para mejor rendimiento
          >
            <OptimizedInvalidateSize />
            
            {/* Usar tiles más pequeños y optimizados */}
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              maxZoom={18}
              minZoom={3}
              tileSize={256}
              zoomOffset={0}
            />
            
            <OptimizedDraggableMarker 
              value={currentValue} 
              onChange={onChange} 
              isDraggable={isDraggable} 
            />
            
            <OptimizedCircle 
              center={currentValue} 
              radius={currentRadius} 
            />
            
            <OptimizedMapEvents 
              onMapClick={handleMapClick} 
              isDraggable={isDraggable} 
            />
          </MapContainer>
        </Suspense>
      </div>
      
      {/* Mostrar estadísticas del cache en desarrollo */}
      {process.env.NODE_ENV === 'development' && mapLoaded && (
        <div className="text-xs text-muted-foreground">
          Cache: {JSON.stringify(OptimizedArgentinaGeocodingService.getCacheStats())}
        </div>
      )}
    </div>
  );
};

export default OptimizedLocationPicker;
