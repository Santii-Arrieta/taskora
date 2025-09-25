import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, Heart, Briefcase, DollarSign, Clock, Eye, Users, Search } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

const FavoritesPage = () => {
  const { user, toggleFavorite } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [favoriteBriefs, setFavoriteBriefs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFavorites = async () => {
      if (user) {
        setLoading(true);
        const favoritesKey = `favorites_${user.userType}`;
        const userFavoritesIds = user[favoritesKey] || [];

        if (userFavoritesIds.length === 0) {
          setFavoriteBriefs([]);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('briefs')
          .select('*, author:userId(name, userType, avatarKey)')
          .in('id', userFavoritesIds);

        if (error) {
          toast({ title: "Error", description: "No se pudieron cargar los favoritos.", variant: "destructive" });
        } else {
          const briefsWithAvatars = data.map(brief => ({
            ...brief,
            authorAvatarUrl: brief.author?.avatarKey ? supabase.storage.from('portfolio').getPublicUrl(brief.author.avatarKey).data.publicUrl : null,
          }));
          setFavoriteBriefs(briefsWithAvatars);
        }
        setLoading(false);
      }
    };

    fetchFavorites();
  }, [user, toast]);

  const handleToggleFavorite = (e, briefId, briefTitle) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(briefId);
    setFavoriteBriefs(prev => prev.filter(b => b.id !== briefId));
    toast({
      title: 'Eliminado de favoritos',
      description: `"${briefTitle}" ha sido eliminado de tus favoritos.`,
    });
  };

  const getUserTypeColor = (userType) => ({ provider: 'provider-gradient', ngo: 'ngo-gradient' })[userType] || 'bg-gray-500';

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Cargando favoritos...</div>;
  }

  return (
    <>
      <Helmet>
        <title>Mis Favoritos - Taskora</title>
        <meta name="description" content="Explora tus servicios y oportunidades guardados." />
      </Helmet>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
            <Star className="w-8 h-8 mr-3 text-yellow-400" />
            Mis Favoritos
          </h1>
          <p className="text-gray-600">Aquí encontrarás todos los servicios y oportunidades que has guardado.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {favoriteBriefs.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-full">
              <Card>
                <CardContent className="p-12 text-center">
                  <Star className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-gray-900 mb-2">No tienes favoritos</h3>
                  <p className="text-gray-600 mb-4">Explora la plataforma y guarda lo que te interese.</p>
                  <Button onClick={() => navigate('/browse')}>
                    <Search className="w-4 h-4 mr-2" />
                    Explorar ahora
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            favoriteBriefs.map((brief, index) => (
              <motion.div key={brief.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                <Link to={`/brief/${brief.id}`} className="block h-full">
                  <Card className="h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col relative">
                    <Button variant="ghost" size="icon" className="absolute top-2 right-2 z-10" onClick={(e) => handleToggleFavorite(e, brief.id, brief.title)}>
                      <Star className="w-5 h-5 text-yellow-400 fill-current" />
                    </Button>
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={brief.authorAvatarUrl} />
                            <AvatarFallback className={getUserTypeColor(brief.author?.userType)}>{brief.author?.name.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm text-gray-900">{brief.author?.name}</p>
                            <Badge variant="outline" className="text-xs">{brief.author?.userType}</Badge>
                          </div>
                        </div>
                        <Badge className={`${brief.type === 'opportunity' ? 'ngo-gradient' : 'provider-gradient'} text-white`}>
                          {brief.type === 'opportunity' ? <Heart className="w-3 h-3 mr-1" /> : <Briefcase className="w-3 h-3 mr-1" />}
                          {brief.type === 'opportunity' ? 'Oportunidad' : 'Servicio'}
                        </Badge>
                      </div>
                      <CardTitle className="text-lg line-clamp-2">{brief.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 flex-grow flex flex-col justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground line-clamp-3 mb-4">{brief.description}</p>
                        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                          <div className="flex items-center space-x-4">
                            <span className="flex items-center"><Eye className="w-4 h-4 mr-1" />{brief.views || 0}</span>
                            <span className="flex items-center"><Users className="w-4 h-4 mr-1" />{brief.applications?.length || 0}</span>
                          </div>
                          <Badge variant="secondary">{brief.category}</Badge>
                        </div>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center text-lg font-bold text-green-600"><DollarSign className="w-5 h-5" />{brief.price}</div>
                          <div className="flex items-center text-sm text-gray-500"><Clock className="w-4 h-4 mr-1" />{brief.deliveryTime} días</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </>
  );
};

export default FavoritesPage;