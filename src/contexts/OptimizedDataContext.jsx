import React, { createContext, useContext, useCallback } from 'react';
import OptimizedQueryService from '@/lib/optimizedQueryService';

const OptimizedDataContext = createContext(null);

export const useOptimizedData = () => {
    const context = useContext(OptimizedDataContext);
    if (context === undefined) {
        throw new Error('useOptimizedData must be used within an OptimizedDataProvider');
    }
    return context;
};

export const OptimizedDataProvider = ({ children }) => {
    
    // Función optimizada para obtener datos con cache
    const getData = useCallback(async (table, options = {}) => {
        try {
            const result = await OptimizedQueryService.query(table, {
                useCache: true,
                ...options
            });
            return result.data;
        } catch (error) {
            console.error(`Error fetching from ${table}:`, error);
            return [];
        }
    }, []);

    // Función optimizada para obtener datos sin cache
    const getDataNoCache = useCallback(async (table, options = {}) => {
        try {
            const result = await OptimizedQueryService.query(table, {
                useCache: false,
                ...options
            });
            return result.data;
        } catch (error) {
            console.error(`Error fetching from ${table}:`, error);
            return [];
        }
    }, []);

    // Función optimizada para insertar datos
    const addData = useCallback(async (table, item, options = {}) => {
        try {
            const result = await OptimizedQueryService.insert(table, item, options);
            return result;
        } catch (error) {
            console.error(`Error inserting into ${table}:`, error);
            return null;
        }
    }, []);

    // Función optimizada para actualizar datos
    const updateData = useCallback(async (table, id, updates, options = {}) => {
        try {
            const result = await OptimizedQueryService.update(table, id, updates, options);
            return result;
        } catch (error) {
            console.error(`Error updating ${table}:`, error);
            return null;
        }
    }, []);
    
    // Función optimizada para eliminar datos
    const deleteData = useCallback(async (table, id) => {
        try {
            const result = await OptimizedQueryService.delete(table, id);
            return result;
        } catch (error) {
            console.error(`Error deleting from ${table}:`, error);
            return false;
        }
    }, []);

    // Función para obtener estadísticas
    const getStats = useCallback(async () => {
        try {
            const stats = await OptimizedQueryService.getStats();
            return stats;
        } catch (error) {
            console.error('Error fetching stats:', error);
            return null;
        }
    }, []);

    // Función para búsqueda optimizada
    const searchData = useCallback(async (table, searchTerm, options = {}) => {
        try {
            if (table === 'briefs') {
                const result = await OptimizedQueryService.searchBriefs(searchTerm, options);
                return result.data;
            }
            
            // Para otras tablas, usar búsqueda genérica
            const result = await OptimizedQueryService.query(table, {
                filters: {
                    _or: [
                        { title: { operator: 'ilike', value: `%${searchTerm}%` } },
                        { description: { operator: 'ilike', value: `%${searchTerm}%` } },
                        { name: { operator: 'ilike', value: `%${searchTerm}%` } }
                    ]
                },
                ...options
            });
            return result.data;
        } catch (error) {
            console.error(`Error searching ${table}:`, error);
            return [];
        }
    }, []);

    // Función para limpiar cache
    const clearCache = useCallback((table = null) => {
        if (table) {
            OptimizedQueryService.clearCache(table);
        } else {
            OptimizedQueryService.clearAllCache();
        }
    }, []);

    // Función para obtener estadísticas del cache
    const getCacheStats = useCallback(() => {
        return OptimizedQueryService.getCacheStats();
    }, []);

    // Funciones especializadas para tablas específicas
    const getUsers = useCallback(async (options = {}) => {
        return getData('users', options);
    }, [getData]);

    const getBriefs = useCallback(async (options = {}) => {
        return getData('briefs', options);
    }, [getData]);

    const getConversations = useCallback(async (userId, options = {}) => {
        return getData('conversations', {
            filters: {
                participants: { operator: 'cs', value: JSON.stringify([{ id: userId }]) }
            },
            ...options
        });
    }, [getData]);

    const getMessages = useCallback(async (conversationId, options = {}) => {
        return getDataNoCache('messages', {
            filters: { conversation_id: conversationId },
            orderBy: 'created_at',
            orderDirection: 'desc',
            ...options
        });
    }, [getDataNoCache]);

    const getContracts = useCallback(async (userId, options = {}) => {
        return getData('contracts', {
            filters: {
                _or: [
                    { providerId: userId },
                    { clientId: userId }
                ]
            },
            orderBy: 'createdAt',
            orderDirection: 'desc',
            ...options
        });
    }, [getData]);

    const getSupportTickets = useCallback(async (options = {}) => {
        return getData('support_tickets', {
            orderBy: 'created_at',
            orderDirection: 'desc',
            ...options
        });
    }, [getData]);

    const getNewsletterSubscribers = useCallback(async (options = {}) => {
        return getData('newsletter_subscribers', {
            orderBy: 'subscribed_at',
            orderDirection: 'desc',
            ...options
        });
    }, [getData]);

    const getBlogPosts = useCallback(async (options = {}) => {
        return getData('blog_posts', {
            orderBy: 'date',
            orderDirection: 'desc',
            ...options
        });
    }, [getData]);

    const getCategories = useCallback(async (options = {}) => {
        return getData('categories', {
            orderBy: 'name',
            orderDirection: 'asc',
            ...options
        });
    }, [getData]);

    const getReviews = useCallback(async (briefId, options = {}) => {
        return getData('reviews', {
            filters: { briefId },
            orderBy: 'created_at',
            orderDirection: 'desc',
            ...options
        });
    }, [getData]);

    const getTransactions = useCallback(async (userId, options = {}) => {
        return getDataNoCache('transactions', {
            filters: { userId },
            orderBy: 'date',
            orderDirection: 'desc',
            ...options
        });
    }, [getDataNoCache]);

    const value = {
        // Funciones genéricas
        getData,
        getDataNoCache,
        addData,
        updateData,
        deleteData,
        getStats,
        searchData,
        clearCache,
        getCacheStats,
        
        // Funciones especializadas
        getUsers,
        getBriefs,
        getConversations,
        getMessages,
        getContracts,
        getSupportTickets,
        getNewsletterSubscribers,
        getBlogPosts,
        getCategories,
        getReviews,
        getTransactions
    };

    return (
        <OptimizedDataContext.Provider value={value}>
            {children}
        </OptimizedDataContext.Provider>
    );
};
