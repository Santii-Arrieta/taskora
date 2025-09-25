import React, { useState } from 'react';
import LocationDropdown from './LocationDropdown';
import LocationPicker from './LocationPicker';

const LocationTest = () => {
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedLocationName, setSelectedLocationName] = useState('');

  const handleLocationSelect = (location, displayName) => {
    setSelectedLocation(location);
    setSelectedLocationName(displayName);
    console.log('Location selected:', location, displayName);
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Prueba de Ubicaciones Argentina</h2>
      
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Desplegable de Ubicaciones</h3>
        <LocationDropdown
          onChange={handleLocationSelect}
          onLocationSelect={handleLocationSelect}
          placeholder="Escribe 'Córdoba' o 'Buenos Aires'..."
        />
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Location Picker Completo</h3>
        <LocationPicker
          value={selectedLocation}
          onChange={handleLocationSelect}
          height="40vh"
        />
      </div>

      {selectedLocation && (
        <div className="p-4 bg-gray-100 rounded-lg">
          <h4 className="font-semibold">Ubicación Seleccionada:</h4>
          <p><strong>Nombre:</strong> {selectedLocationName}</p>
          <p><strong>Coordenadas:</strong> {selectedLocation.lat}, {selectedLocation.lng}</p>
        </div>
      )}
    </div>
  );
};

export default LocationTest;
