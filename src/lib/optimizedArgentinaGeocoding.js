// Servicio de geocoding optimizado para Argentina
// Utiliza cache local y reduce llamadas a APIs externas

import { locationCache } from './locationCache';

const ARGENTINA_BOUNDS = {
  north: -21.8,
  south: -55.1,
  east: -53.6,
  west: -73.6
};

// Lista expandida de provincias y ciudades principales de Argentina
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
  'San Fernando del Valle de Catamarca',
  
  // Más ciudades importantes
  'Bariloche', 'San Carlos de Bariloche', 'Villa Carlos Paz', 'Gualeguaychú',
  'Rafaela', 'San Martín', 'Quilmes', 'Luján', 'Merlo', 'San Isidro',
  'Tigre', 'Pilar', 'Escobar', 'Campana', 'Zárate', 'Pergamino',
  'Olavarría', 'Azul', 'Tres Arroyos', 'Necochea', 'Pinamar',
  'Villa Gesell', 'Miramar', 'Dolores', 'Chascomús', 'Lobos',
  'General Roca', 'Cipolletti', 'Villa Regina', 'Allen', 'Cinco Saltos',
  'San Martín de los Andes', 'Junín de los Andes', 'Aluminé', 'Zapala',
  'Cutral Có', 'Plottier', 'Centenario', 'Añelo', 'Senillosa',
  
  // Barrios y zonas de Buenos Aires
  'Palermo', 'Recoleta', 'Belgrano', 'San Telmo', 'La Boca', 'Puerto Madero',
  'Caballito', 'Flores', 'Villa Crespo', 'Chacarita', 'Colegiales',
  'Núñez', 'Saavedra', 'Coghlan', 'Villa Urquiza', 'Villa Pueyrredón',
  'Agronomía', 'Parque Chas', 'Villa Ortúzar', 'Villa Devoto',
  'Floresta', 'Monte Castro', 'Villa Luro', 'Villa Real', 'Villa Santa Rita',
  'Villa del Parque', 'Villa General Mitre', 'Villa Crespo', 'Chacarita',
  'Colegiales', 'Palermo', 'Recoleta', 'Retiro', 'San Nicolás',
  'Monserrat', 'San Telmo', 'Constitución', 'Barracas', 'La Boca',
  'Nueva Pompeya', 'Parque Patricios', 'San Cristóbal', 'Balvanera',
  'Almagro', 'Boedo', 'Caballito', 'Flores', 'Floresta', 'Vélez Sársfield',
  'Villa Luro', 'Mataderos', 'Parque Avellaneda', 'Liniers', 'Villa Lugano',
  'Villa Riachuelo', 'Villa Soldati', 'Villa Celina', 'Nueva Pompeya',
  'Parque Patricios', 'Barracas', 'La Boca', 'San Telmo', 'Monserrat',
  'San Nicolás', 'Retiro', 'Recoleta', 'Palermo', 'Belgrano', 'Núñez',
  'Saavedra', 'Coghlan', 'Villa Urquiza', 'Villa Pueyrredón', 'Agronomía',
  'Parque Chas', 'Villa Ortúzar', 'Villa Devoto', 'Villa del Parque',
  'Villa General Mitre', 'Villa Crespo', 'Chacarita', 'Colegiales'
];

// Coordenadas aproximadas expandidas
const COORDINATES_DB = {
  // Provincias (centros aproximados)
  'Buenos Aires': { lat: -34.6037, lng: -58.3816 },
  'Catamarca': { lat: -28.4696, lng: -65.7852 },
  'Chaco': { lat: -27.4514, lng: -58.9867 },
  'Chubut': { lat: -43.3002, lng: -65.1023 },
  'Córdoba': { lat: -31.4201, lng: -64.1888 },
  'Corrientes': { lat: -27.4692, lng: -58.8306 },
  'Entre Ríos': { lat: -31.7444, lng: -60.5175 },
  'Formosa': { lat: -26.1775, lng: -58.1781 },
  'Jujuy': { lat: -24.1946, lng: -65.2971 },
  'La Pampa': { lat: -36.6203, lng: -64.2906 },
  'La Rioja': { lat: -29.4131, lng: -66.8563 },
  'Mendoza': { lat: -32.8908, lng: -68.8272 },
  'Misiones': { lat: -27.3621, lng: -55.9008 },
  'Neuquén': { lat: -38.9516, lng: -68.0591 },
  'Río Negro': { lat: -40.8135, lng: -62.9967 },
  'Salta': { lat: -24.7821, lng: -65.4232 },
  'San Juan': { lat: -31.5375, lng: -68.5364 },
  'San Luis': { lat: -33.3017, lng: -66.3378 },
  'Santa Cruz': { lat: -51.6230, lng: -69.2168 },
  'Santa Fe': { lat: -31.6333, lng: -60.7000 },
  'Santiago del Estero': { lat: -27.7951, lng: -64.2615 },
  'Tierra del Fuego': { lat: -54.8019, lng: -68.3030 },
  'Tucumán': { lat: -26.8241, lng: -65.2226 },
  
  // Ciudades principales
  'La Plata': { lat: -34.9214, lng: -57.9544 },
  'San Miguel de Tucumán': { lat: -26.8241, lng: -65.2226 },
  'Mar del Plata': { lat: -38.0023, lng: -57.5575 },
  'Resistencia': { lat: -27.4514, lng: -58.9867 },
  'San Salvador de Jujuy': { lat: -24.1946, lng: -65.2971 },
  'Bahía Blanca': { lat: -38.7196, lng: -62.2724 },
  'Paraná': { lat: -31.7444, lng: -60.5175 },
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
  'San Fernando del Valle de Catamarca': { lat: -28.4696, lng: -65.7852 },
  
  // Más ciudades importantes
  'Bariloche': { lat: -41.1335, lng: -71.3103 },
  'San Carlos de Bariloche': { lat: -41.1335, lng: -71.3103 },
  'Villa Carlos Paz': { lat: -31.4242, lng: -64.4970 },
  'Gualeguaychú': { lat: -33.0098, lng: -58.5176 },
  'Rafaela': { lat: -31.2503, lng: -61.4867 },
  'San Martín': { lat: -33.0810, lng: -68.4681 },
  'Quilmes': { lat: -34.7208, lng: -58.2542 },
  'Luján': { lat: -34.5653, lng: -59.1036 },
  'Merlo': { lat: -34.6664, lng: -58.7292 },
  'San Isidro': { lat: -34.4735, lng: -58.5271 },
  'Tigre': { lat: -34.4208, lng: -58.5792 },
  'Pilar': { lat: -34.4581, lng: -58.9122 },
  'Escobar': { lat: -34.3492, lng: -58.7925 },
  'Campana': { lat: -34.1681, lng: -58.9592 },
  'Zárate': { lat: -34.0981, lng: -59.0281 },
  'Pergamino': { lat: -33.8919, lng: -60.5731 },
  'Olavarría': { lat: -36.8931, lng: -60.3225 },
  'Azul': { lat: -36.7772, lng: -59.8581 },
  'Tres Arroyos': { lat: -38.3739, lng: -60.2792 },
  'Necochea': { lat: -38.5475, lng: -58.7369 },
  'Pinamar': { lat: -37.1075, lng: -56.8619 },
  'Villa Gesell': { lat: -37.2619, lng: -56.9731 },
  'Miramar': { lat: -38.2681, lng: -57.8369 },
  'Dolores': { lat: -36.3131, lng: -57.6781 },
  'Chascomús': { lat: -35.5725, lng: -58.0081 },
  'Lobos': { lat: -35.1853, lng: -59.0947 },
  'General Roca': { lat: -39.0331, lng: -67.5831 },
  'Cipolletti': { lat: -38.9331, lng: -68.1331 },
  'Villa Regina': { lat: -39.1000, lng: -67.0667 },
  'Allen': { lat: -38.9831, lng: -67.8331 },
  'Cinco Saltos': { lat: -38.8169, lng: -68.0669 },
  'San Martín de los Andes': { lat: -40.1575, lng: -71.3531 },
  'Junín de los Andes': { lat: -39.9500, lng: -71.0667 },
  'Aluminé': { lat: -39.2169, lng: -70.9169 },
  'Zapala': { lat: -38.9000, lng: -70.0667 },
  'Cutral Có': { lat: -38.9331, lng: -69.2331 },
  'Plottier': { lat: -38.9669, lng: -68.2331 },
  'Centenario': { lat: -38.8331, lng: -68.1331 },
  'Añelo': { lat: -38.3500, lng: -68.7831 },
  'Senillosa': { lat: -38.9500, lng: -68.8331 }
};

export class OptimizedArgentinaGeocodingService {
  static async searchLocations(query, limit = 10) {
    if (!query || query.length < 2) return [];
    
    // Verificar cache primero
    const cachedResult = locationCache.getSearch(query);
    if (cachedResult) {
      console.log('📍 Cache hit para búsqueda:', query);
      return cachedResult.slice(0, limit);
    }
    
    try {
      // Buscar en nuestra lista local de lugares argentinos (instantáneo)
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

      // Si tenemos suficientes resultados locales, no llamar a Nominatim
      if (localMatches.length >= limit) {
        locationCache.setSearch(query, localMatches);
        return localMatches;
      }

      // Solo llamar a Nominatim si no tenemos suficientes resultados locales
      const remainingLimit = limit - localMatches.length;
      const nominatimResults = await this.searchNominatim(query, remainingLimit);
      
      // Combinar resultados locales y de Nominatim
      const allResults = [...localMatches, ...nominatimResults];
      const uniqueResults = allResults.filter((result, index, self) => 
        index === self.findIndex(r => r.display_name === result.display_name)
      );

      const finalResults = uniqueResults.slice(0, limit);
      
      // Guardar en cache
      locationCache.setSearch(query, finalResults);
      
      return finalResults;

    } catch (error) {
      console.error('Error en búsqueda de ubicaciones:', error);
      // En caso de error, devolver solo resultados locales
      const fallbackResults = ARGENTINA_LOCATIONS
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
      
      locationCache.setSearch(query, fallbackResults);
      return fallbackResults;
    }
  }

  static async searchNominatim(query, limit) {
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
    return data
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
  }

  static getApproximateCoordinates(locationName) {
    return COORDINATES_DB[locationName] || { lat: -34.6037, lng: -58.3816 }; // Default to Buenos Aires
  }

  static async reverseGeocode(lat, lng) {
    // Verificar cache primero
    const cachedResult = locationCache.getReverse(lat, lng);
    if (cachedResult) {
      console.log('📍 Cache hit para reverse geocoding:', lat, lng);
      return cachedResult;
    }
    
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
      
      let result = 'Ubicación seleccionada';
      
      // Verificar que esté en Argentina
      if (data.address && data.address.country === 'Argentina') {
        result = data.display_name;
      } else if (data.display_name) {
        result = data.display_name;
      }
      
      // Guardar en cache
      locationCache.setReverse(lat, lng, result);
      
      return result;
    } catch (error) {
      console.error('Error en reverse geocoding:', error);
      const fallback = 'Ubicación seleccionada';
      locationCache.setReverse(lat, lng, fallback);
      return fallback;
    }
  }

  // Método para obtener estadísticas del cache
  static getCacheStats() {
    return locationCache.getStats();
  }

  // Método para limpiar el cache
  static clearCache() {
    locationCache.clear();
  }
}
