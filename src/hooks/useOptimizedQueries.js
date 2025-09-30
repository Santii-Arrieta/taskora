import { useState, useEffect, useCallback, useRef } from 'react';
import OptimizedQueryService from '@/lib/optimizedQueryService';

// Hook para consultas optimizadas con cache
export const useOptimizedQuery = (table, options = {}) => {
  const {
    select = '*',
    filters = {},
    orderBy = 'created_at',
    orderDirection = 'desc',
    limit = null,
    offset = 0,
    useCache = true,
    count = false,
    dependencies = [],
    enabled = true
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [count: totalCount, setCount] = useState(null);
  
  // Referencias para evitar re-fetch innecesarios
  const lastFetchRef = useRef(null);
  const abortControllerRef = useRef(null);

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    // Cancelar request anterior si existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    
    setLoading(true);
    setError(null);

    try {
      const queryKey = JSON.stringify({ table, select, filters, orderBy, orderDirection, limit, offset, count });
      
      // Evitar re-fetch si es la misma consulta
      if (lastFetchRef.current === queryKey) {
        setLoading(false);
        return;
      }

      const result = await OptimizedQueryService.query(table, {
        select,
        filters,
        orderBy,
        orderDirection,
        limit,
        offset,
        useCache,
        count
      });

      setData(result.data);
      if (count) {
        setCount(result.count);
      }
      
      // Guardar clave de la consulta
      lastFetchRef.current = queryKey;

    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error(`Error fetching ${table}:`, err);
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [table, select, filters, orderBy, orderDirection, limit, offset, useCache, count, enabled, ...dependencies]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Limpiar abort controller al desmontar
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const refetch = useCallback(() => {
    lastFetchRef.current = null;
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    count: totalCount,
    refetch
  };
};

// Hook especializado para usuarios
export const useUsers = (options = {}) => {
  return useOptimizedQuery('users', {
    select: 'id,name,email,userType,avatarKey,created_at,verificationStatus',
    ...options
  });
};

// Hook especializado para servicios/briefs
export const useBriefs = (options = {}) => {
  return useOptimizedQuery('briefs', {
    select: `
      id,title,description,category,price,deliveryTime,serviceType,type,created_at,userId,
      author:userId(id,name,userType,avatarKey,location),
      reviews:reviews!briefId(rating)
    `,
    ...options
  });
};

// Hook especializado para conversaciones
export const useConversations = (userId, options = {}) => {
  return useOptimizedQuery('conversations', {
    select: 'id,participants,lastMessage,createdAt',
    filters: {
      participants: { operator: 'cs', value: JSON.stringify([{ id: userId }]) }
    },
    orderBy: 'createdAt',
    orderDirection: 'desc',
    ...options,
    dependencies: [userId]
  });
};

// Hook especializado para mensajes
export const useMessages = (conversationId, options = {}) => {
  return useOptimizedQuery('messages', {
    select: 'id,conversation_id,sender_id,content,type,created_at,read',
    filters: { conversation_id: conversationId },
    orderBy: 'created_at',
    orderDirection: 'desc',
    useCache: false, // Los mensajes no se cachean por ser dinámicos
    ...options,
    dependencies: [conversationId]
  });
};

// Hook especializado para contratos
export const useContracts = (userId, options = {}) => {
  return useOptimizedQuery('contracts', {
    select: 'id,title,description,price,status,createdAt,providerId,clientId',
    filters: {
      _or: [
        { providerId: userId },
        { clientId: userId }
      ]
    },
    orderBy: 'createdAt',
    orderDirection: 'desc',
    ...options,
    dependencies: [userId]
  });
};

// Hook especializado para tickets de soporte
export const useSupportTickets = (options = {}) => {
  return useOptimizedQuery('support_tickets', {
    select: 'id,title,description,status,priority,created_at,userId',
    orderBy: 'created_at',
    orderDirection: 'desc',
    ...options
  });
};

// Hook especializado para suscriptores del newsletter
export const useNewsletterSubscribers = (options = {}) => {
  return useOptimizedQuery('newsletter_subscribers', {
    select: 'id,email,subscribed_at,status',
    orderBy: 'subscribed_at',
    orderDirection: 'desc',
    ...options
  });
};

// Hook especializado para posts del blog
export const useBlogPosts = (options = {}) => {
  return useOptimizedQuery('blog_posts', {
    select: 'id,title,description,author,date,image,type,content',
    orderBy: 'date',
    orderDirection: 'desc',
    ...options
  });
};

// Hook especializado para categorías
export const useCategories = (options = {}) => {
  return useOptimizedQuery('categories', {
    select: 'id,name,slug',
    orderBy: 'name',
    orderDirection: 'asc',
    ...options
  });
};

// Hook especializado para reviews
export const useReviews = (briefId, options = {}) => {
  return useOptimizedQuery('reviews', {
    select: 'id,rating,comment,created_at,reviewerId',
    filters: { briefId },
    orderBy: 'created_at',
    orderDirection: 'desc',
    ...options,
    dependencies: [briefId]
  });
};

// Hook especializado para transacciones
export const useTransactions = (userId, options = {}) => {
  return useOptimizedQuery('transactions', {
    select: 'id,amount,type,description,date,status,mp_payment_id',
    filters: { userId },
    orderBy: 'date',
    orderDirection: 'desc',
    useCache: false, // Las transacciones no se cachean por ser dinámicas
    ...options,
    dependencies: [userId]
  });
};

// Hook para estadísticas
export const useStats = (options = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const stats = await OptimizedQueryService.getStats();
      setData(stats);
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const refetch = useCallback(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    data,
    loading,
    error,
    refetch
  };
};

// Hook para búsqueda optimizada
export const useSearchBriefs = (searchTerm, options = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const searchBriefs = useCallback(async () => {
    if (!searchTerm || searchTerm.length < 2) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await OptimizedQueryService.searchBriefs(searchTerm, options);
      setData(result.data);
    } catch (err) {
      console.error('Error searching briefs:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, options]);

  useEffect(() => {
    const timer = setTimeout(searchBriefs, 300); // Debounce de 300ms
    return () => clearTimeout(timer);
  }, [searchBriefs]);

  return {
    data,
    loading,
    error,
    refetch: searchBriefs
  };
};

// Hook para operaciones CRUD optimizadas
export const useOptimizedCRUD = (table) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const insert = useCallback(async (data, options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const result = await OptimizedQueryService.insert(table, data, options);
      return result;
    } catch (err) {
      console.error(`Error inserting into ${table}:`, err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [table]);

  const update = useCallback(async (id, updates, options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const result = await OptimizedQueryService.update(table, id, updates, options);
      return result;
    } catch (err) {
      console.error(`Error updating ${table}:`, err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [table]);

  const remove = useCallback(async (id) => {
    setLoading(true);
    setError(null);

    try {
      const result = await OptimizedQueryService.delete(table, id);
      return result;
    } catch (err) {
      console.error(`Error deleting from ${table}:`, err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [table]);

  return {
    insert,
    update,
    remove,
    loading,
    error
  };
};
