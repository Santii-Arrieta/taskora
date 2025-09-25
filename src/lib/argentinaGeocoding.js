// Servicio de geocoding específico para Argentina
// Utiliza Nominatim con filtros para Argentina

const ARGENTINA_BOUNDS = {
  north: -21.8,
  south: -55.1,
  east: -53.6,
  west: -73.6
};

// Lista de provincias y ciudades principales de Argentina
const ARGENTINA_LOCATIONS = [
  // Provincias
  'Buenos Aires', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba', 'Corrientes',
  'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja', 'Mendoza',
  'Misiones', 'Neuquén', 'Río Negro', 'Salta', 'San Juan', 'San Luis',
  'Santa Cruz', 'Santa Fe', 'Santiago del Estero', 'Tierra del Fuego', 'Tucumán',
  
  // Ciudades principales
  'Buenos Aires', 'Córdoba', 'Rosario', 'Mendoza', 'La Plata', 'San Miguel de Tucumán',
  'Mar del Plata', 'Salta', 'Santa Fe', 'San Juan', 'Resistencia', 'Santiago del Estero',
  'Corrientes', 'Posadas', 'San Salvador de Jujuy', 'Bahía Blanca', 'Paraná',
  'Neuquén', 'Formosa', 'La Rioja', 'San Luis', 'Río Cuarto', 'Comodoro Rivadavia',
  'San Nicolás de los Arroyos', 'Villa Mercedes', 'Concordia', 'Tandil', 'San Rafael',
  'Trelew', 'Río Gallegos', 'Ushuaia', 'Rawson', 'Viedma', 'Santa Rosa',
  'San Fernando del Valle de Catamarca', 'San Miguel de Tucumán',
  
  // Más ciudades importantes
  'Bariloche', 'San Carlos de Bariloche', 'Villa Carlos Paz', 'Gualeguaychú',
  'Rafaela', 'San Martín', 'Quilmes', 'Luján', 'Merlo', 'San Isidro',
  'Tigre', 'Pilar', 'Escobar', 'Campana', 'Zárate', 'Pergamino',
  'Olavarría', 'Azul', 'Tres Arroyos', 'Necochea', 'Pinamar',
  'Villa Gesell', 'Miramar', 'Dolores', 'Chascomús', 'Lobos',
  'General Roca', 'Cipolletti', 'Villa Regina', 'Allen', 'Cinco Saltos',
  'San Martín de los Andes', 'Junín de los Andes', 'Aluminé', 'Zapala',
  'Cutral Có', 'Plottier', 'Centenario', 'Añelo', 'Senillosa'
];

export class ArgentinaGeocodingService {
  static async searchLocations(query, limit = 10) {
    if (!query || query.length < 2) return [];
    
    try {
      // Primero buscar en nuestra lista local de lugares argentinos
      const localMatches = ARGENTINA_LOCATIONS
        .filter(location => 
          location.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, limit)
        .map(location => ({
          display_name: `${location}, Argentina`,
          lat: this.getApproximateCoordinates(location).lat.toString(),
          lon: this.getApproximateCoordinates(location).lng.toString(),
          type: 'local'
        }));

      // Siempre devolver resultados locales primero (son instantáneos)
      if (localMatches.length > 0) {
        return localMatches;
      }

      // Buscar en Nominatim con filtros para Argentina
      const nominatimQuery = encodeURIComponent(`${query}, Argentina`);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        `format=json&` +
        `q=${nominatimQuery}&` +
        `countrycodes=ar&` +
        `limit=${limit}&` +
        `bounded=1&` +
        `viewbox=${ARGENTINA_BOUNDS.west},${ARGENTINA_BOUNDS.south},${ARGENTINA_BOUNDS.east},${ARGENTINA_BOUNDS.north}&` +
        `addressdetails=1`
      );

      if (!response.ok) {
        throw new Error('Error en la búsqueda de ubicaciones');
      }

      const data = await response.json();
      
      // Filtrar resultados para asegurar que están en Argentina
      const argentinaResults = data
        .filter(result => {
          const address = result.address || {};
          return address.country === 'Argentina' || 
                 address.country_code === 'ar' ||
                 result.display_name.includes('Argentina');
        })
        .map(result => ({
          display_name: result.display_name,
          lat: result.lat,
          lon: result.lon,
          type: 'nominatim'
        }));

      // Combinar resultados locales y de Nominatim, eliminando duplicados
      const allResults = [...localMatches, ...argentinaResults];
      const uniqueResults = allResults.filter((result, index, self) => 
        index === self.findIndex(r => r.display_name === result.display_name)
      );

      return uniqueResults.slice(0, limit);

    } catch (error) {
      console.error('Error en búsqueda de ubicaciones:', error);
      // En caso de error, devolver solo resultados locales
      return ARGENTINA_LOCATIONS
        .filter(location => 
          location.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, limit)
        .map(location => ({
          display_name: `${location}, Argentina`,
          lat: this.getApproximateCoordinates(location).lat.toString(),
          lon: this.getApproximateCoordinates(location).lng.toString(),
          type: 'local'
        }));
    }
  }

  static getApproximateCoordinates(locationName) {
    // Coordenadas aproximadas de ciudades principales de Argentina
    const coordinates = {
      'Buenos Aires': { lat: -34.6037, lng: -58.3816 },
      'Córdoba': { lat: -31.4201, lng: -64.1888 },
      'Rosario': { lat: -32.9442, lng: -60.6505 },
      'Mendoza': { lat: -32.8908, lng: -68.8272 },
      'La Plata': { lat: -34.9214, lng: -57.9544 },
      'San Miguel de Tucumán': { lat: -26.8241, lng: -65.2226 },
      'Mar del Plata': { lat: -38.0023, lng: -57.5575 },
      'Salta': { lat: -24.7821, lng: -65.4232 },
      'Santa Fe': { lat: -31.6333, lng: -60.7000 },
      'San Juan': { lat: -31.5375, lng: -68.5364 },
      'Resistencia': { lat: -27.4514, lng: -58.9867 },
      'Santiago del Estero': { lat: -27.7951, lng: -64.2615 },
      'Corrientes': { lat: -27.4692, lng: -58.8306 },
      'Posadas': { lat: -27.3621, lng: -55.9008 },
      'San Salvador de Jujuy': { lat: -24.1946, lng: -65.2971 },
      'Bahía Blanca': { lat: -38.7196, lng: -62.2724 },
      'Paraná': { lat: -31.7444, lng: -60.5175 },
      'Neuquén': { lat: -38.9516, lng: -68.0591 },
      'Formosa': { lat: -26.1775, lng: -58.1781 },
      'La Rioja': { lat: -29.4131, lng: -66.8563 },
      'San Luis': { lat: -33.3017, lng: -66.3378 },
      'Río Cuarto': { lat: -33.1307, lng: -64.3499 },
      'Comodoro Rivadavia': { lat: -45.8641, lng: -67.4966 },
      'San Nicolás de los Arroyos': { lat: -33.3358, lng: -60.2252 },
      'Villa Mercedes': { lat: -33.6757, lng: -65.4578 },
      'Concordia': { lat: -31.3930, lng: -58.0209 },
      'Tandil': { lat: -37.3282, lng: -59.1369 },
      'San Rafael': { lat: -34.6177, lng: -68.3301 },
      'Trelew': { lat: -43.2489, lng: -65.3051 },
      'Río Gallegos': { lat: -51.6230, lng: -69.2168 },
      'Ushuaia': { lat: -54.8019, lng: -68.3030 },
      'Rawson': { lat: -43.3002, lng: -65.1023 },
      'Viedma': { lat: -40.8135, lng: -62.9967 },
      'Santa Rosa': { lat: -36.6203, lng: -64.2906 },
      'San Fernando del Valle de Catamarca': { lat: -28.4696, lng: -65.7852 }
    };

    return coordinates[locationName] || { lat: -34.6037, lng: -58.3816 }; // Default to Buenos Aires
  }

  static async reverseGeocode(lat, lng) {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?` +
        `format=json&` +
        `lat=${lat}&` +
        `lon=${lng}&` +
        `addressdetails=1`
      );

      if (!response.ok) {
        throw new Error('Error en reverse geocoding');
      }

      const data = await response.json();
      
      // Verificar que esté en Argentina
      if (data.address && data.address.country === 'Argentina') {
        return data.display_name;
      }
      
      // Si no está en Argentina, intentar construir un nombre más específico
      if (data.display_name) {
        return data.display_name;
      }
      
      return 'Ubicación seleccionada';
    } catch (error) {
      console.error('Error en reverse geocoding:', error);
      return 'Ubicación seleccionada';
    }
  }
}
