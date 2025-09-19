
import React, { useState, useEffect, useCallback } from 'react';
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
import { Search, Ban, Code, Palette, PenSquare, Megaphone, Video } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';

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

  const [briefs, setBriefs] = useState([]);
  const [filteredBriefs, setFilteredBriefs] = useState([]);
  const [loading, setLoading] = useState(true);
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
  });

  useEffect(() => {
    setFilters(prev => ({
        ...prev,
        searchLocation: user?.location || null,
        searchRadius: user?.searchPreferences?.radius || 50
    }));
  }, [user]);

  useEffect(() => {
    if (user?.userType === 'ngo' && filters.type === 'service') {
      toast({ title: "Acción no permitida", description: "Como ONG, no puedes contratar servicios. Serás redirigido.", variant: "destructive" });
      navigate('/dashboard');
    }
  }, [user, filters.type, navigate, toast]);

  const loadBriefs = useCallback(async () => {
    setLoading(true);
    const { data: briefsData, error } = await supabase
      .from('briefs')
      .select(`
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
      `);

    if (error) {
      console.error("Error fetching briefs with author:", error);
      toast({ title: "Error", description: "No se pudieron cargar las publicaciones.", variant: "destructive" });
      setLoading(false);
      return;
    }
    
    const briefsWithDetails = briefsData.map(brief => {
      const avgRating = brief.reviews.length > 0 ? brief.reviews.reduce((acc, r) => acc + r.rating, 0) / brief.reviews.length : 0;
      const authorAvatarUrl = brief.author?.avatarKey ? supabase.storage.from('avatars').getPublicUrl(brief.author.avatarKey).data.publicUrl : null;
      
      return { 
        ...brief, 
        authorName: brief.author?.name || 'Anónimo', 
        authorType: brief.author?.userType, 
        authorAvatarUrl: authorAvatarUrl,
        authorLocation: brief.author?.location,
        rating: avgRating
      };
    });

    setBriefs(briefsWithDetails);
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    loadBriefs();
  }, [loadBriefs]);

  useEffect(() => {
    let tempBriefs = [...briefs];
    
    if (filters.searchTerm) {
      tempBriefs = tempBriefs.filter(b => b.title.toLowerCase().includes(filters.searchTerm.toLowerCase()) || b.description.toLowerCase().includes(filters.searchTerm.toLowerCase()));
    }
    if (filters.category !== 'all') tempBriefs = tempBriefs.filter(b => b.category === filters.category);
    if (filters.type !== 'all') tempBriefs = tempBriefs.filter(b => b.type === filters.type);
    if (filters.serviceType !== 'all') tempBriefs = tempBriefs.filter(b => (b.serviceType || 'online') === filters.serviceType);

    if (filters.serviceType === 'presencial' && filters.searchLocation) {
      tempBriefs = tempBriefs.filter(b => {
        if (b.serviceType !== 'presencial' || !b.location) return false;
        const distance = getDistance(filters.searchLocation.lat, filters.searchLocation.lng, b.location.lat, b.location.lng);
        return distance <= filters.searchRadius;
      });
    }

    tempBriefs = tempBriefs.filter(b => Number(b.price) >= filters.priceRange[0] && Number(b.price) <= filters.priceRange[1]);
    if(filters.duration !== 'all') tempBriefs = tempBriefs.filter(b => Number(b.deliveryTime) <= Number(filters.duration));
    if (filters.rating > 0) tempBriefs = tempBriefs.filter(b => b.rating >= filters.rating);

    setFilteredBriefs(tempBriefs);
  }, [filters, briefs]);

  useEffect(() => {
    if (user) {
        updateProfile({ searchPreferences: { radius: filters.searchRadius } });
    }
  }, [filters.searchRadius, user, updateProfile]);

  const handleApply = async (briefId) => {
    if (!user.verified) return toast({ title: "Verificación requerida", description: "Debes verificar tu cuenta.", variant: 'destructive' });
    
    const brief = briefs.find(b => b.id === briefId);
    if (brief.userId === user.id) return toast({ title: "Acción no permitida", description: "No puedes postularte a tu propia oportunidad.", variant: 'destructive' });

    if(brief && !brief.applications.some(app => app.id === user.id)) {
      const newApplications = [...brief.applications, { id: user.id, name: user.name, date: new Date().toISOString(), status: 'pending' }];
      await updateData('briefs', briefId, { applications: newApplications });
      loadBriefs();
      addNotification({ userId: brief.userId, title: "Nueva postulación", description: `${user.name} se postula a "${brief.title}"` });
      toast({ title: 'Postulación enviada', description: 'Tu postulación ha sido enviada con éxito.' });
    } else {
      toast({ title: 'Ya te has postulado', variant: 'destructive' });
    }
  };

    const handleUseMyPosition = () => {
      if (user?.location) {
        setFilters(prev => ({ ...prev, searchLocation: user.location }));
        toast({ title: 'Ubicación actualizada', description: 'Se está usando tu ubicación guardada.' });
      } else {
        toast({ title: 'Sin ubicación', description: 'No tienes una ubicación guardada en tu perfil.', variant: 'destructive' });
      }
    };




  const handleContact = async (brief) => {
    if (!user) {
      toast({
        title: 'Acción requerida',
        description: 'Debes iniciar sesión para contactar al proveedor.',
        variant: 'destructive',
      });
      return;
    }
    if (user.id === brief.userId) {
      toast({
        title: 'Acción no permitida',
        description: 'No puedes contactarte a ti mismo.',
        variant: 'destructive',
      });
      return;
    }
    try {
      const conv = await createConversation({ id: brief.userId, name: brief.authorName, avatarUrl: brief.authorAvatarUrl, userType: brief.authorType });
      if (conv) {
        navigate('/chat');
      } else {
        toast({
          title: 'Error',
          description: 'No se pudo iniciar la conversación.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error al iniciar la conversación.',
        variant: 'destructive',
      });
      console.error('Error creating conversation:', error);
    }
  };

  const getPageTitle = () => (filters.type === 'opportunity' ? 'Explorar Oportunidades' : 'Explorar Servicios');
  const getPageDescription = () => (filters.type === 'opportunity' ? 'Encuentra tu próxima oportunidad para colaborar.' : 'Encuentra el talento perfecto para tu proyecto.');

  if (user?.userType === 'ngo' && filters.type === 'service') {
    return (
      <div className="flex items-center justify-center h-screen"><Card className="w-full max-w-md m-4"><CardHeader><CardTitle className="flex items-center"><Ban className="w-6 h-6 mr-2 text-destructive" />Acceso Restringido</CardTitle></CardHeader><CardContent><p>Como ONG, solo puedes crear y buscar oportunidades de voluntariado.</p></CardContent></Card></div>
    );
  }

  return (
    <>
      <Helmet><title>{getPageTitle()} - Taskora</title><meta name="description" content={getPageDescription()} /></Helmet>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{getPageTitle()}</h1>
          <p className="text-gray-600">{getPageDescription()}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-8">
          <div className="flex flex-wrap items-center gap-2">
            {categories.map(cat => (
              <Button key={cat.id} variant={filters.category === cat.id ? "default" : "outline"} onClick={() => setFilters({...filters, category: cat.id})} className="flex-shrink-0">
                {cat.icon}<span className="ml-2 hidden sm:inline">{cat.name}</span>
              </Button>
            ))}
            <Button variant={filters.category === 'all' ? "default" : "outline"} onClick={() => setFilters({...filters, category: 'all'})}>Todos</Button>
          </div>
        </motion.div>

        <PopularBriefs briefs={briefs.filter(b => b.type === filters.type).sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5)} />
        
        <Filters filters={filters} setFilters={setFilters} onUseMyPosition={handleUseMyPosition} />

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBriefs.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-full"><Card><CardContent className="p-12 text-center"><Search className="w-16 h-16 text-gray-400 mx-auto mb-4" /><h3 className="text-xl font-medium text-gray-900 mb-2">No se encontraron resultados</h3><p className="text-gray-600">Intenta ajustar tus filtros.</p></CardContent></Card></motion.div>
            ) : (
              filteredBriefs.map((brief, index) => (
                <BriefCard 
                  key={brief.id}
                  brief={brief}
                  index={index}
                  user={user}
                  isFavorite={user?.favorites_provider?.includes(brief.id) || user?.favorites_client?.includes(brief.id)}
                  onToggleFavorite={toggleFavorite}
                  onApply={handleApply}
                  onContact={handleContact}
                />
              ))
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default BrowseBriefsPage;
