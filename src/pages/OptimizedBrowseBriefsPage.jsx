import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import { useChat } from '@/contexts/ChatContext';
import { useData } from '@/contexts/DataContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { useNotification } from '@/contexts/NotificationContext';
import Navbar from '@/components/Navbar';
import Filters from '@/components/browse/Filters';
import BriefCard from '@/components/browse/BriefCard';
import PopularBriefs from '@/components/browse/PopularBriefs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Ban, Code, Palette, PenSquare, Megaphone, Video, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { usePagination } from '@/hooks/usePagination';
import Pagination from '@/components/ui/pagination';

function useQuery() {
  const { search } = useLocation();
  return React.useMemo(() => new URLSearchParams(search), [search]);
}

const categories = [
  { id: 'development', name: 'Programación', icon: <Code className="w-5 h-5" /> },
  { id: 'design', name: 'Diseño', icon: <Palette className="w-5 h-5" /> },
  { id: 'writing', name: 'Redacción', icon: <PenSquare className="w-5 h-5" /> },
  { id: 'marketing', name: 'Marketing', icon: <Megaphone className="w-5 h-5" /> },
  { id: 'video', name: 'Video', icon: <Video className="w-5 h-5" /> },
];

const getDistance = (lat1, lon1, lat2, lon2) => {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return Infinity;
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const BrowseBriefsPage = () => {
  const { user, toggleFavorite, updateProfile } = useAuth();
  const { createConversation } = useChat();
  const { addNotification } = useNotification();
  const { updateData } = useData();
  const navigate = useNavigate();
  const { toast } = useToast();
  const query = useQuery();
  const typeFromQuery = query.get('type');
  const searchFromQuery = query.get('search');

  const [filters, setFilters] = useState({ 
    searchTerm: searchFromQuery || '', 
    category: 'all', 
    type: typeFromQuery || (user?.userType === 'provider' ? 'opportunity' : 'service'),
    priceRange: [0, 5000],
    duration: 'all',
    rating: 0,
    serviceType: 'all',
    searchLocation: user?.location || null,
    searchRadius: user?.searchPreferences?.radius || 50,
    searchLocationSource: user?.location ? 'saved' : 'none',
  });

  // Construir filtros para la paginación
  const paginationFilters = useMemo(() => {
    const dbFilters = {};
    
    // Filtro por tipo
    if (filters.type !== 'all') {
      dbFilters.type = filters.type;
    }
    
    // Filtro por categoría
    if (filters.category !== 'all') {
      dbFilters.category = filters.category;
    }
    
    // Filtro por tipo de servicio
    if (filters.serviceType !== 'all') {
      dbFilters.serviceType = filters.serviceType;
    }
    
    // Filtro por rango de precio
    if (filters.priceRange[0] > 0) {
      dbFilters.price = { operator: 'gte', value: filters.priceRange[0] };
    }
    if (filters.priceRange[1] < 5000) {
      dbFilters.price = { operator: 'lte', value: filters.priceRange[1] };
    }
    
    // Filtro por duración
    if (filters.duration !== 'all') {
      dbFilters.deliveryTime = filters.duration;
    }
    
    return dbFilters;
  }, [filters]);

  // Hook de paginación
  const {
    data: briefs,
    loading,
    error,
    paginationInfo,
    nextPage,
    prevPage,
    goToPage,
    refresh,
    hasMore
  } = usePagination('briefs', {
    pageSize: 12,
    orderBy: 'created_at',
    orderDirection: 'desc',
    filters: paginationFilters,
    select: `
      *,
      author:userId (
        id,
        name,
        userType,
        avatarKey,
        location
      ),
      reviews:reviews!briefId (
        rating
      )
    `,
    dependencies: [filters]
  });

  // Aplicar filtros adicionales en el cliente (búsqueda de texto, ubicación)
  const filteredBriefs = useMemo(() => {
    if (!briefs) return [];
    
    let filtered = briefs;
    
    // Filtro por término de búsqueda
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(brief => 
        brief.title.toLowerCase().includes(searchLower) ||
        brief.description.toLowerCase().includes(searchLower)
      );
    }
    
    // Filtro por ubicación
    if (filters.searchLocation && filters.searchRadius) {
      filtered = filtered.filter(brief => {
        if (!brief.author?.location) return false;
        
        const userLocation = filters.searchLocation;
        const briefLocation = brief.author.location;
        
        if (typeof userLocation === 'object' && typeof briefLocation === 'object') {
          const distance = getDistance(
            userLocation.lat, userLocation.lng,
            briefLocation.lat, briefLocation.lng
          );
          return distance <= filters.searchRadius;
        }
        
        return true;
      });
    }
    
    return filtered;
  }, [briefs, filters.searchTerm, filters.searchLocation, filters.searchRadius]);

  useEffect(() => {
    setFilters(prev => ({
        ...prev,
        // Only hydrate from saved profile if the current source is not 'manual' or 'filter'
        ...(prev.searchLocationSource !== 'manual' && prev.searchLocationSource !== 'filter' ? {
          searchLocation: user?.location || null,
          searchLocationSource: user?.location ? 'saved' : 'none'
        } : {}),
        // Only update radius if not manually set
        ...(prev.searchLocationSource !== 'manual' ? {
          searchRadius: user?.searchRadius || user?.searchPreferences?.radius || 50
        } : {})
    }));
  }, [user]);

  useEffect(() => {
    if (user?.userType === 'ngo' && filters.type === 'service') {
      toast({ title: "Acción no permitida", description: "Como ONG, no puedes contratar servicios. Serás redirigido.", variant: "destructive" });
      navigate('/dashboard');
    }
  }, [user, filters.type, navigate, toast]);

  const handleFilterChange = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const handleUseMyPosition = useCallback(() => {
    if (user?.location) {
      setFilters(prev => ({
        ...prev,
        searchLocation: user.location,
        searchRadius: user.searchRadius || user.searchPreferences?.radius || 50,
        searchLocationSource: 'saved'
      }));
    }
  }, [user]);

  const handleContactBrief = async (brief) => {
    if (!user) {
      toast({ title: "Inicia sesión", description: "Debes iniciar sesión para contactar.", variant: "destructive" });
      return;
    }

    if (user.id === brief.userId) {
      toast({ title: "No puedes contactarte a ti mismo", description: "Este es tu propio servicio.", variant: "destructive" });
      return;
    }

    try {
      const conversation = await createConversation(brief.userId, brief.id);
      if (conversation) {
        navigate('/chat');
        addNotification({
          type: 'success',
          title: 'Conversación iniciada',
          message: `Has iniciado una conversación con ${brief.author?.name || 'el proveedor'}.`
        });
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast({ title: "Error", description: "No se pudo iniciar la conversación.", variant: "destructive" });
    }
  };

  const handleToggleFavorite = async (briefId) => {
    if (!user) {
      toast({ title: "Inicia sesión", description: "Debes iniciar sesión para guardar favoritos.", variant: "destructive" });
      return;
    }

    try {
      await toggleFavorite(briefId);
      toast({ 
        title: "Favorito actualizado", 
        description: "Se ha actualizado tu lista de favoritos." 
      });
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast({ title: "Error", description: "No se pudo actualizar el favorito.", variant: "destructive" });
    }
  };

  const handleRefresh = () => {
    refresh();
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Ban className="w-16 h-16 text-red-500 mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Error al cargar servicios</h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={handleRefresh}>
                Reintentar
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Helmet>
        <title>Explorar Servicios - Taskora</title>
        <meta name="description" content="Descubre servicios profesionales y oportunidades de trabajo en Taskora" />
      </Helmet>
      
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {filters.type === 'service' ? 'Servicios Disponibles' : 'Oportunidades de Trabajo'}
          </h1>
          <p className="text-gray-600">
            {filters.type === 'service' 
              ? 'Encuentra profesionales para tus proyectos' 
              : 'Descubre oportunidades de trabajo para ti'
            }
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Filtros */}
          <div className="lg:col-span-1">
            <Filters
              filters={filters}
              onFilterChange={handleFilterChange}
              onUseMyPosition={handleUseMyPosition}
              user={user}
            />
          </div>

          {/* Contenido principal */}
          <div className="lg:col-span-3">
            {/* Barra de herramientas */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  onClick={handleRefresh}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Search className="w-4 h-4 mr-2" />
                  )}
                  Actualizar
                </Button>
                
                <div className="text-sm text-muted-foreground">
                  {loading ? 'Cargando...' : `${filteredBriefs.length} servicios encontrados`}
                </div>
              </div>
            </div>

            {/* Lista de servicios */}
            {loading && filteredBriefs.length === 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Card key={index} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-4 bg-gray-200 rounded mb-4"></div>
                      <div className="h-3 bg-gray-200 rounded mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded mb-4"></div>
                      <div className="h-8 bg-gray-200 rounded"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredBriefs.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Search className="w-16 h-16 text-gray-400 mb-4" />
                  <h3 className="text-xl font-medium text-gray-900 mb-2">No se encontraron servicios</h3>
                  <p className="text-gray-600 mb-4">Intenta ajustar los filtros de búsqueda</p>
                  <Button onClick={handleRefresh}>
                    Actualizar búsqueda
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  {filteredBriefs.map((brief) => (
                    <BriefCard
                      key={brief.id}
                      brief={brief}
                      user={user}
                      onContact={handleContactBrief}
                      onToggleFavorite={handleToggleFavorite}
                    />
                  ))}
                </div>

                {/* Paginación */}
                <Pagination
                  currentPage={paginationInfo.currentPage}
                  totalPages={paginationInfo.totalPages}
                  totalCount={paginationInfo.totalCount}
                  pageSize={paginationInfo.pageSize}
                  onPageChange={goToPage}
                  loading={loading}
                  showPageSize={false}
                />
              </>
            )}
          </div>
        </div>

        {/* Servicios populares */}
        <div className="mt-16">
          <PopularBriefs />
        </div>
      </div>
    </div>
  );
};

export default BrowseBriefsPage;
