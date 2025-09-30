// Cache local para ubicaciones y coordenadas
// Reduce significativamente las llamadas a APIs externas

class LocationCache {
  constructor() {
    this.cache = new Map();
    this.reverseCache = new Map();
    this.maxSize = 1000; // Máximo 1000 entradas en cache
    this.ttl = 24 * 60 * 60 * 1000; // 24 horas en milisegundos
  }

  // Generar clave para cache de búsquedas
  getSearchKey(query) {
    return `search_${query.toLowerCase().trim()}`;
  }

  // Generar clave para cache de reverse geocoding
  getReverseKey(lat, lng) {
    // Redondear coordenadas para agrupar ubicaciones cercanas
    const roundedLat = Math.round(lat * 1000) / 1000;
    const roundedLng = Math.round(lng * 1000) / 1000;
    return `reverse_${roundedLat}_${roundedLng}`;
  }

  // Verificar si una entrada está expirada
  isExpired(entry) {
    return Date.now() - entry.timestamp > this.ttl;
  }

  // Limpiar cache expirado
  cleanExpired() {
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
      }
    }
    for (const [key, entry] of this.reverseCache.entries()) {
      if (this.isExpired(entry)) {
        this.reverseCache.delete(key);
      }
    }
  }

  // Limitar tamaño del cache
  limitCacheSize() {
    if (this.cache.size > this.maxSize) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toDelete = entries.slice(0, this.cache.size - this.maxSize);
      toDelete.forEach(([key]) => this.cache.delete(key));
    }
  }

  // Obtener resultado de búsqueda del cache
  getSearch(query) {
    const key = this.getSearchKey(query);
    const entry = this.cache.get(key);
    
    if (entry && !this.isExpired(entry)) {
      return entry.data;
    }
    
    if (entry) {
      this.cache.delete(key);
    }
    
    return null;
  }

  // Guardar resultado de búsqueda en cache
  setSearch(query, data) {
    const key = this.getSearchKey(query);
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    
    this.limitCacheSize();
  }

  // Obtener resultado de reverse geocoding del cache
  getReverse(lat, lng) {
    const key = this.getReverseKey(lat, lng);
    const entry = this.reverseCache.get(key);
    
    if (entry && !this.isExpired(entry)) {
      return entry.data;
    }
    
    if (entry) {
      this.reverseCache.delete(key);
    }
    
    return null;
  }

  // Guardar resultado de reverse geocoding en cache
  setReverse(lat, lng, data) {
    const key = this.getReverseKey(lat, lng);
    this.reverseCache.set(key, {
      data,
      timestamp: Date.now()
    });
    
    this.limitCacheSize();
  }

  // Limpiar todo el cache
  clear() {
    this.cache.clear();
    this.reverseCache.clear();
  }

  // Obtener estadísticas del cache
  getStats() {
    return {
      searchCacheSize: this.cache.size,
      reverseCacheSize: this.reverseCache.size,
      totalSize: this.cache.size + this.reverseCache.size
    };
  }
}

// Instancia singleton del cache
export const locationCache = new LocationCache();

// Limpiar cache expirado cada 5 minutos
setInterval(() => {
  locationCache.cleanExpired();
}, 5 * 60 * 1000);
