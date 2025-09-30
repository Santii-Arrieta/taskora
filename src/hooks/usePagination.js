import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

// Hook personalizado para paginación con Supabase
export const usePagination = (tableName, options = {}) => {
  const {
    pageSize = 10,
    initialPage = 1,
    orderBy = 'created_at',
    orderDirection = 'desc',
    filters = {},
    select = '*',
    dependencies = []
  } = options;

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  
  // Referencias para evitar re-fetch innecesarios
  const lastFetchRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Calcular offset basado en la página actual
  const offset = (currentPage - 1) * pageSize;

  // Función para construir la query con filtros
  const buildQuery = useCallback((query) => {
    let builtQuery = query.select(select);
    
    // Aplicar filtros
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        if (Array.isArray(value)) {
          builtQuery = builtQuery.in(key, value);
        } else if (typeof value === 'object' && value.operator) {
          // Soporte para operadores personalizados
          switch (value.operator) {
            case 'gte':
              builtQuery = builtQuery.gte(key, value.value);
              break;
            case 'lte':
              builtQuery = builtQuery.lte(key, value.value);
              break;
            case 'like':
              builtQuery = builtQuery.like(key, value.value);
              break;
            case 'ilike':
              builtQuery = builtQuery.ilike(key, value.value);
              break;
            default:
              builtQuery = builtQuery.eq(key, value.value);
          }
        } else {
          builtQuery = builtQuery.eq(key, value);
        }
      }
    });
    
    return builtQuery;
  }, [select, filters]);

  // Función para cargar datos
  const loadData = useCallback(async (page = currentPage, append = false) => {
    // Cancelar request anterior si existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    
    setLoading(true);
    setError(null);

    try {
      // Crear una clave única para esta consulta
      const queryKey = JSON.stringify({
        table: tableName,
        page,
        pageSize,
        orderBy,
        orderDirection,
        filters,
        select
      });

      // Evitar re-fetch si es la misma consulta
      if (lastFetchRef.current === queryKey && append) {
        setLoading(false);
        return;
      }

      let query = supabase.from(tableName);
      
      // Aplicar filtros y ordenamiento
      query = buildQuery(query);
      query = query.order(orderBy, { ascending: orderDirection === 'asc' });
      
      // Aplicar paginación
      query = query.range(offset, offset + pageSize - 1);

      const { data: fetchedData, error: fetchError, count } = await query;

      if (fetchError) {
        throw fetchError;
      }

      // Actualizar datos
      if (append && page > 1) {
        setData(prev => [...prev, ...fetchedData]);
      } else {
        setData(fetchedData || []);
      }

      // Actualizar contadores
      setTotalCount(count || 0);
      setHasMore(fetchedData && fetchedData.length === pageSize);
      
      // Guardar clave de la consulta
      lastFetchRef.current = queryKey;

    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error(`Error loading ${tableName}:`, err);
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [tableName, currentPage, pageSize, orderBy, orderDirection, filters, select, offset, buildQuery]);

  // Función para ir a la siguiente página
  const nextPage = useCallback(() => {
    if (hasMore && !loading) {
      setCurrentPage(prev => prev + 1);
    }
  }, [hasMore, loading]);

  // Función para ir a la página anterior
  const prevPage = useCallback(() => {
    if (currentPage > 1 && !loading) {
      setCurrentPage(prev => prev - 1);
    }
  }, [currentPage, loading]);

  // Función para ir a una página específica
  const goToPage = useCallback((page) => {
    if (page >= 1 && page !== currentPage && !loading) {
      setCurrentPage(page);
    }
  }, [currentPage, loading]);

  // Función para recargar datos
  const refresh = useCallback(() => {
    setCurrentPage(1);
    loadData(1, false);
  }, [loadData]);

  // Función para cargar más datos (infinite scroll)
  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      loadData(currentPage + 1, true);
      setCurrentPage(prev => prev + 1);
    }
  }, [hasMore, loading, loadData, currentPage]);

  // Efecto para cargar datos cuando cambian las dependencias
  useEffect(() => {
    loadData();
  }, [loadData, ...dependencies]);

  // Limpiar abort controller al desmontar
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Calcular información de paginación
  const paginationInfo = {
    currentPage,
    totalPages: Math.ceil(totalCount / pageSize),
    totalCount,
    pageSize,
    hasNext: hasMore,
    hasPrev: currentPage > 1,
    startIndex: offset + 1,
    endIndex: Math.min(offset + pageSize, totalCount)
  };

  return {
    data,
    loading,
    error,
    paginationInfo,
    nextPage,
    prevPage,
    goToPage,
    refresh,
    loadMore,
    hasMore
  };
};

// Hook especializado para infinite scroll
export const useInfiniteScroll = (tableName, options = {}) => {
  const pagination = usePagination(tableName, { ...options, pageSize: options.pageSize || 20 });
  
  const { data, loadMore, hasMore, loading } = pagination;

  // Función para detectar cuando el usuario llega al final
  const handleScroll = useCallback((e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100;
    
    if (isNearBottom && hasMore && !loading) {
      loadMore();
    }
  }, [hasMore, loading, loadMore]);

  return {
    ...pagination,
    handleScroll
  };
};

// Hook para búsqueda con paginación
export const useSearchPagination = (tableName, searchFields = [], options = {}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  
  // Debounce de la búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Construir filtros de búsqueda
  const searchFilters = useMemo(() => {
    if (!debouncedQuery.trim()) return {};
    
    // Si hay múltiples campos de búsqueda, usar OR
    if (searchFields.length > 1) {
      return {
        _or: searchFields.map(field => ({
          [field]: { operator: 'ilike', value: `%${debouncedQuery}%` }
        }))
      };
    }
    
    // Un solo campo de búsqueda
    return {
      [searchFields[0]]: { operator: 'ilike', value: `%${debouncedQuery}%` }
    };
  }, [debouncedQuery, searchFields]);

  const pagination = usePagination(tableName, {
    ...options,
    filters: { ...options.filters, ...searchFilters }
  });

  return {
    ...pagination,
    searchQuery,
    setSearchQuery,
    debouncedQuery
  };
};
