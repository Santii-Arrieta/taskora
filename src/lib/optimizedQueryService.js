import { supabase } from '@/lib/customSupabaseClient';

// Cache simple para consultas frecuentes
const queryCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

// Limpiar cache expirado cada 10 minutos
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of queryCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      queryCache.delete(key);
    }
  }
}, 10 * 60 * 1000);

class OptimizedQueryService {
  // Generar clave de cache
  static getCacheKey(table, options = {}) {
    return `${table}_${JSON.stringify(options)}`;
  }

  // Verificar si una consulta está en cache
  static getFromCache(key) {
    const cached = queryCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
    return null;
  }

  // Guardar en cache
  static setCache(key, data) {
    queryCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  // Limpiar cache específico
  static clearCache(table) {
    for (const [key] of queryCache.entries()) {
      if (key.startsWith(`${table}_`)) {
        queryCache.delete(key);
      }
    }
  }

  // Consulta optimizada con cache
  static async query(table, options = {}) {
    const {
      select = '*',
      filters = {},
      orderBy = 'created_at',
      orderDirection = 'desc',
      limit = null,
      offset = 0,
      useCache = true,
      count = false
    } = options;

    const cacheKey = this.getCacheKey(table, { select, filters, orderBy, orderDirection, limit, offset, count });
    
    // Verificar cache
    if (useCache) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        console.log(`📦 Cache hit for ${table}`);
        return cached;
      }
    }

    try {
      let query = supabase.from(table).select(select, count ? { count: 'exact' } : undefined);
      
      // Aplicar filtros
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          if (Array.isArray(value)) {
            query = query.in(key, value);
          } else if (typeof value === 'object' && value.operator) {
            switch (value.operator) {
              case 'gte':
                query = query.gte(key, value.value);
                break;
              case 'lte':
                query = query.lte(key, value.value);
                break;
              case 'like':
                query = query.like(key, value.value);
                break;
              case 'ilike':
                query = query.ilike(key, value.value);
                break;
              case 'neq':
                query = query.neq(key, value.value);
                break;
              default:
                query = query.eq(key, value.value);
            }
          } else {
            query = query.eq(key, value);
          }
        }
      });

      // Aplicar ordenamiento
      if (orderBy) {
        query = query.order(orderBy, { ascending: orderDirection === 'asc' });
      }

      // Aplicar paginación
      if (limit) {
        query = query.range(offset, offset + limit - 1);
      }

      const { data, error, count: totalCount } = await query;

      if (error) {
        throw error;
      }

      const result = { data, count: totalCount };
      
      // Guardar en cache
      if (useCache) {
        this.setCache(cacheKey, result);
      }

      return result;

    } catch (error) {
      console.error(`Error querying ${table}:`, error);
      throw error;
    }
  }

  // Consulta optimizada para usuarios
  static async getUsers(options = {}) {
    const {
      select = 'id,name,email,userType,avatarKey,created_at,verificationStatus',
      filters = {},
      orderBy = 'created_at',
      orderDirection = 'desc',
      limit = 20,
      offset = 0,
      useCache = true
    } = options;

    return this.query('users', {
      select,
      filters,
      orderBy,
      orderDirection,
      limit,
      offset,
      useCache
    });
  }

  // Consulta optimizada para servicios/briefs
  static async getBriefs(options = {}) {
    const {
      select = `
        id,title,description,category,price,deliveryTime,serviceType,type,created_at,userId,
        author:userId(id,name,userType,avatarKey,location),
        reviews:reviews!briefId(rating)
      `,
      filters = {},
      orderBy = 'created_at',
      orderDirection = 'desc',
      limit = 12,
      offset = 0,
      useCache = true
    } = options;

    return this.query('briefs', {
      select,
      filters,
      orderBy,
      orderDirection,
      limit,
      offset,
      useCache
    });
  }

  // Consulta optimizada para conversaciones
  static async getConversations(userId, options = {}) {
    const {
      select = 'id,participants,lastMessage,createdAt',
      limit = 20,
      offset = 0,
      useCache = true
    } = options;

    return this.query('conversations', {
      select,
      filters: {
        participants: { operator: 'cs', value: JSON.stringify([{ id: userId }]) }
      },
      orderBy: 'createdAt',
      orderDirection: 'desc',
      limit,
      offset,
      useCache
    });
  }

  // Consulta optimizada para mensajes
  static async getMessages(conversationId, options = {}) {
    const {
      select = 'id,conversation_id,sender_id,content,type,created_at,read',
      limit = 50,
      offset = 0,
      useCache = false // Los mensajes no se cachean por ser dinámicos
    } = options;

    return this.query('messages', {
      select,
      filters: { conversation_id: conversationId },
      orderBy: 'created_at',
      orderDirection: 'desc',
      limit,
      offset,
      useCache
    });
  }

  // Consulta optimizada para contratos
  static async getContracts(userId, options = {}) {
    const {
      select = 'id,title,description,price,status,createdAt,providerId,clientId',
      limit = 50,
      offset = 0,
      useCache = true
    } = options;

    return this.query('contracts', {
      select,
      filters: {
        _or: [
          { providerId: userId },
          { clientId: userId }
        ]
      },
      orderBy: 'createdAt',
      orderDirection: 'desc',
      limit,
      offset,
      useCache
    });
  }

  // Consulta optimizada para tickets de soporte
  static async getSupportTickets(options = {}) {
    const {
      select = 'id,title,description,status,priority,created_at,userId',
      filters = {},
      limit = 15,
      offset = 0,
      useCache = true
    } = options;

    return this.query('support_tickets', {
      select,
      filters,
      orderBy: 'created_at',
      orderDirection: 'desc',
      limit,
      offset,
      useCache
    });
  }

  // Consulta optimizada para suscriptores del newsletter
  static async getNewsletterSubscribers(options = {}) {
    const {
      select = 'id,email,subscribed_at,status',
      filters = {},
      limit = 25,
      offset = 0,
      useCache = true
    } = options;

    return this.query('newsletter_subscribers', {
      select,
      filters,
      orderBy: 'subscribed_at',
      orderDirection: 'desc',
      limit,
      offset,
      useCache
    });
  }

  // Consulta optimizada para posts del blog
  static async getBlogPosts(options = {}) {
    const {
      select = 'id,title,description,author,date,image,type,content',
      filters = {},
      limit = 10,
      offset = 0,
      useCache = true
    } = options;

    return this.query('blog_posts', {
      select,
      filters,
      orderBy: 'date',
      orderDirection: 'desc',
      limit,
      offset,
      useCache
    });
  }

  // Consulta optimizada para categorías
  static async getCategories(options = {}) {
    const {
      select = 'id,name,slug',
      useCache = true
    } = options;

    return this.query('categories', {
      select,
      orderBy: 'name',
      orderDirection: 'asc',
      useCache
    });
  }

  // Consulta optimizada para reviews
  static async getReviews(briefId, options = {}) {
    const {
      select = 'id,rating,comment,created_at,reviewerId',
      limit = 10,
      offset = 0,
      useCache = true
    } = options;

    return this.query('reviews', {
      select,
      filters: { briefId },
      orderBy: 'created_at',
      orderDirection: 'desc',
      limit,
      offset,
      useCache
    });
  }

  // Consulta optimizada para transacciones
  static async getTransactions(userId, options = {}) {
    const {
      select = 'id,amount,type,description,date,status,mp_payment_id',
      limit = 20,
      offset = 0,
      useCache = false // Las transacciones no se cachean por ser dinámicas
    } = options;

    return this.query('transactions', {
      select,
      filters: { userId },
      orderBy: 'date',
      orderDirection: 'desc',
      limit,
      offset,
      useCache
    });
  }

  // Consulta optimizada para estadísticas
  static async getStats() {
    const cacheKey = 'stats_general';
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const [
        { count: totalUsers },
        { count: totalBriefs },
        { count: totalConversations },
        { count: totalTickets },
        { count: totalSubscribers }
      ] = await Promise.all([
        this.query('users', { select: 'id', count: true, useCache: false }),
        this.query('briefs', { select: 'id', count: true, useCache: false }),
        this.query('conversations', { select: 'id', count: true, useCache: false }),
        this.query('support_tickets', { select: 'id', count: true, useCache: false }),
        this.query('newsletter_subscribers', { select: 'id', count: true, useCache: false })
      ]);

      const stats = {
        totalUsers: totalUsers || 0,
        totalBriefs: totalBriefs || 0,
        totalConversations: totalConversations || 0,
        totalTickets: totalTickets || 0,
        totalSubscribers: totalSubscribers || 0
      };

      this.setCache(cacheKey, stats);
      return stats;

    } catch (error) {
      console.error('Error getting stats:', error);
      throw error;
    }
  }

  // Insertar datos optimizado
  static async insert(table, data, options = {}) {
    const { select = '*' } = options;
    
    try {
      const { data: result, error } = await supabase
        .from(table)
        .insert(Array.isArray(data) ? data : [data])
        .select(select);

      if (error) throw error;

      // Limpiar cache de la tabla
      this.clearCache(table);

      return Array.isArray(data) ? result : result[0];

    } catch (error) {
      console.error(`Error inserting into ${table}:`, error);
      throw error;
    }
  }

  // Actualizar datos optimizado
  static async update(table, id, updates, options = {}) {
    const { select = '*' } = options;
    
    try {
      const { data, error } = await supabase
        .from(table)
        .update(updates)
        .eq('id', id)
        .select(select);

      if (error) throw error;

      // Limpiar cache de la tabla
      this.clearCache(table);

      return data.length > 0 ? data[0] : null;

    } catch (error) {
      console.error(`Error updating ${table}:`, error);
      throw error;
    }
  }

  // Eliminar datos optimizado
  static async delete(table, id) {
    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Limpiar cache de la tabla
      this.clearCache(table);

      return true;

    } catch (error) {
      console.error(`Error deleting from ${table}:`, error);
      throw error;
    }
  }

  // Consulta con joins optimizados
  static async getBriefsWithDetails(options = {}) {
    const {
      select = `
        id,title,description,category,price,deliveryTime,serviceType,type,created_at,userId,
        author:userId(id,name,userType,avatarKey,location),
        reviews:reviews!briefId(rating),
        applications:applications!briefId(id,status,date)
      `,
      filters = {},
      orderBy = 'created_at',
      orderDirection = 'desc',
      limit = 12,
      offset = 0,
      useCache = true
    } = options;

    return this.query('briefs', {
      select,
      filters,
      orderBy,
      orderDirection,
      limit,
      offset,
      useCache
    });
  }

  // Consulta para búsqueda optimizada
  static async searchBriefs(searchTerm, options = {}) {
    const {
      select = `
        id,title,description,category,price,deliveryTime,serviceType,type,created_at,userId,
        author:userId(id,name,userType,avatarKey,location)
      `,
      filters = {},
      limit = 12,
      offset = 0,
      useCache = true
    } = options;

    // Agregar filtros de búsqueda
    const searchFilters = {
      ...filters,
      _or: [
        { title: { operator: 'ilike', value: `%${searchTerm}%` } },
        { description: { operator: 'ilike', value: `%${searchTerm}%` } }
      ]
    };

    return this.query('briefs', {
      select,
      filters: searchFilters,
      orderBy: 'created_at',
      orderDirection: 'desc',
      limit,
      offset,
      useCache
    });
  }

  // Obtener estadísticas del cache
  static getCacheStats() {
    return {
      size: queryCache.size,
      keys: Array.from(queryCache.keys())
    };
  }

  // Limpiar todo el cache
  static clearAllCache() {
    queryCache.clear();
  }
}

export default OptimizedQueryService;
