import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, MapPin, Loader2 } from 'lucide-react';
import { ArgentinaGeocodingService } from '@/lib/argentinaGeocoding';

const LocationDropdown = ({ 
  value, 
  onChange, 
  placeholder = "Buscar ubicación en Argentina...",
  onLocationSelect,
  className = ""
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const timeoutRef = useRef(null);

  // Sincronizar con el valor externo (solo carga inicial, sin trigger de búsqueda)
  useEffect(() => {
    if (value && value !== query && !hasUserInteracted) {
      setQuery(value);
      setShowDropdown(false);
      setSuggestions([]);
      setIsLoading(false);
      // Marcar que ya no es carga inicial después del primer valor
      if (isInitialLoad) {
        setIsInitialLoad(false);
      }
    }
  }, [value, query, hasUserInteracted, isInitialLoad]);

  // Debounce search (solo si el usuario ha interactuado)
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // No hacer búsqueda automática si no ha habido interacción del usuario
    if (!hasUserInteracted || isInitialLoad) {
      return;
    }

    if (query.length >= 2) {
      // Mostrar el desplegable inmediatamente cuando el usuario empiece a escribir
      setShowDropdown(true);
      setIsLoading(true);
      
      timeoutRef.current = setTimeout(async () => {
        try {
          const results = await ArgentinaGeocodingService.searchLocations(query, 8);
          setSuggestions(results);
          setSelectedIndex(-1);
        } catch (error) {
          console.error('Error searching locations:', error);
          setSuggestions([]);
        } finally {
          setIsLoading(false);
        }
      }, 300);
    } else {
      setSuggestions([]);
      setShowDropdown(false);
      setIsLoading(false);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [query, hasUserInteracted, isInitialLoad]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          inputRef.current && !inputRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    setQuery(e.target.value);
    // Marcar que el usuario ha interactuado
    setHasUserInteracted(true);
    // Marcar que ya no es carga inicial cuando el usuario empiece a escribir
    if (isInitialLoad) {
      setIsInitialLoad(false);
    }
  };

  const handleKeyDown = (e) => {
    if (!showDropdown || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          selectLocation(suggestions[selectedIndex]);
        } else {
          handleSubmit();
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const selectLocation = (location) => {
    const coordinates = {
      lat: parseFloat(location.lat),
      lng: parseFloat(location.lon)
    };
    
    setQuery(location.display_name);
    setShowDropdown(false);
    setSelectedIndex(-1);
    
    if (onChange) {
      onChange(coordinates);
    }
    
    if (onLocationSelect) {
      onLocationSelect(coordinates, location.display_name);
    }
  };

  const handleSubmit = async () => {
    if (!query.trim()) return;

    setIsLoading(true);
    try {
      const results = await ArgentinaGeocodingService.searchLocations(query, 1);
      if (results.length > 0) {
        selectLocation(results[0]);
      } else {
        // Si no hay resultados, intentar con el query original
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ', Argentina')}&limit=1`
        );
        const data = await response.json();
        if (data && data.length > 0) {
          const { lat, lon } = data[0];
          const coordinates = { lat: parseFloat(lat), lng: parseFloat(lon) };
          setQuery(data[0].display_name);
          if (onChange) onChange(coordinates);
          if (onLocationSelect) onLocationSelect(coordinates, data[0].display_name);
        }
      }
    } catch (error) {
      console.error('Error in manual search:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowDropdown(true);
            }
          }}
          placeholder={placeholder}
          className="pr-10"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto"
          style={{ zIndex: 9999 }}
        >
          {isLoading ? (
            <div className="px-3 py-2 text-sm text-gray-500 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Buscando ubicaciones...
            </div>
          ) : suggestions.length > 0 ? (
            suggestions.map((suggestion, index) => (
              <button
                key={`${suggestion.lat}-${suggestion.lon}-${index}`}
                type="button"
                className={`w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 ${
                  index === selectedIndex ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                }`}
                onClick={() => selectLocation(suggestion)}
              >
                <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-sm truncate">{suggestion.display_name}</span>
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-gray-500">
              No se encontraron ubicaciones
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LocationDropdown;
