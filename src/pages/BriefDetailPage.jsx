import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import { useChat } from '@/contexts/ChatContext';
import { useNotification } from '@/contexts/NotificationContext';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import { DollarSign, Clock, MessageCircle, UserPlus, Briefcase, Heart, ArrowLeft, Tag, Star, FileText, Lock, MapPin, Globe, Maximize } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/lib/customSupabaseClient';
const LocationPicker = lazy(() => import('@/components/LocationPicker'));

const categoryMap = {
  development: 'Programación',
  design: 'Diseño',
  writing: 'Redacción',
  marketing: 'Marketing',
  video: 'Video',
};

const userTypeMap = {
  provider: 'Proveedor',
  client: 'Cliente',
  ngo: 'ONG',
};

const StarRating = ({ rating, count }) => (
    <div className="flex items-center gap-1">
      {[...Array(5)].map((_, i) => (
        <Star key={i} className={`w-4 h-4 ${i < Math.round(rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
      ))}
      {count > 0 && <span className="text-xs text-muted-foreground">({count})</span>}
    </div>
);

const ReviewCard = ({ review }) => {
    const [reviewer, setReviewer] = useState(null);
    
    useEffect(() => {
        const fetchReviewer = async () => {
             const { data: foundUser, error } = await supabase
                .from('users')
                .select('id, name, avatarKey')
                .eq('id', review.reviewerId)
                .single();

            if (foundUser) {
                const avatarUrl = foundUser.avatarKey ? supabase.storage.from('portfolio').getPublicUrl(foundUser.avatarKey).data.publicUrl : null;
                setReviewer({...foundUser, avatarUrl});
            }
        };
        fetchReviewer();
    }, [review.reviewerId]);

    if (!reviewer) return null;

    return (
        <div className="border-t py-4">
            <div className="flex items-center gap-3 mb-2">
                <Avatar className="w-8 h-8">
                    <AvatarImage src={reviewer.avatarUrl} />
                    <AvatarFallback>{reviewer.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                    <p className="font-semibold text-sm">{reviewer.name}</p>
                    <StarRating rating={review.rating} />
                </div>
            </div>
            <p className="text-sm text-gray-600">{review.comment}</p>
        </div>
    )
}

const BriefDetailPage = () => {
  const { briefId } = useParams();
  const { user, toggleFavorite } = useAuth();
  const { createConversation } = useChat();
  const { addNotification } = useNotification();
  const { updateData } = useData();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [brief, setBrief] = useState(null);
  const [author, setAuthor] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState(0);
  const [loading, setLoading] = useState(true);

  const favoritesKey = user ? `favorites_${user.userType}` : null;
  const isFavorite = user && favoritesKey && user[favoritesKey]?.includes(briefId);

  useEffect(() => {
    const fetchData = async () => {
        setLoading(true);
        const { data: briefData, error: briefError } = await supabase
            .from('briefs')
            .select('*')
            .eq('id', briefId)
            .single();

        if (briefError || !briefData) {
            toast({ title: "Error", description: "No se pudo encontrar la publicación.", variant: "destructive" });
            navigate('/browse');
            return;
        }

        const { data: authorData, error: authorError } = await supabase
            .from('users')
            .select('*')
            .eq('id', briefData.userId)
            .single();
        
        if (authorError || !authorData) {
            toast({ title: "Error", description: "No se pudo encontrar el autor de la publicación.", variant: "destructive" });
        } else {
             const authorAvatarUrl = authorData.avatarKey ? supabase.storage.from('portfolio').getPublicUrl(authorData.avatarKey).data.publicUrl : null;
             setAuthor({...authorData, avatarUrl: authorAvatarUrl});
        }

        const { data: allReviews, error: reviewsError } = await supabase
            .from('reviews')
            .select('*')
            .eq('revieweeId', briefData.userId);

        if (!reviewsError) {
            setReviews(allReviews);
            if (allReviews.length > 0) {
                const totalRating = allReviews.reduce((acc, r) => acc + r.rating, 0);
                setAvgRating(totalRating / allReviews.length);
            }
        }
        
        setBrief(briefData);
        setLoading(false);
    }
    fetchData();
  }, [briefId, navigate, toast]);

  const handleInteraction = (action) => {
    if (!user) {
      toast({
        title: "Acción requerida",
        description: "Debes iniciar sesión o registrarte para continuar.",
        action: <Button onClick={() => navigate('/login')}>Iniciar Sesión</Button>,
      });
      return;
    }
    action();
  };

  const handleApply = async () => {
    if (!user.verified) return toast({ title: "Verificación requerida", description: "Debes verificar tu cuenta para postularte.", variant: 'destructive' });
    if(brief.userId === user.id) return toast({ title: "Acción no permitida", description: "No puedes postularte a tu propia oportunidad.", variant: 'destructive' });
    
    if(brief) {
      console.log('🔍 Current brief applications:', brief.applications);
      console.log('🔍 User ID:', user.id);
      console.log('🔍 User name:', user.name);
      
      if (!brief.applications.some(app => app.id === user.id)) {
        const newApplication = { 
          id: user.id, 
          name: user.name, 
          date: new Date().toISOString(), 
          status: 'pending' 
        };
        const newApplications = [...brief.applications, newApplication];
        
        console.log('📝 Adding new application:', newApplication);
        console.log('📝 New applications array:', newApplications);
        
        // Usar función RPC para agregar aplicación (bypass RLS)
        console.log('🔄 Using RPC function to add application...');
        const { data: rpcResult, error: rpcError } = await supabase.rpc('add_application_to_brief', {
          brief_id: briefId,
          user_id: user.id,
          user_name: user.name,
          application_status: 'pending'
        });
        
        console.log('🔍 RPC result:', rpcResult);
        console.log('🔍 RPC error:', rpcError);
        
        if (rpcError) {
          console.error('❌ RPC function failed:', rpcError);
          toast({ 
            title: 'Error de base de datos', 
            description: `Error: ${rpcError.message}`, 
            variant: 'destructive' 
          });
          return;
        }
        
        if (rpcResult && rpcResult.success) {
          console.log('✅ RPC function successful, updating local state');
          setBrief(prev => ({...prev, applications: rpcResult.applications}));

          addNotification({
            userId: brief.userId,
            title: "Nueva postulación",
            description: `${user.name} se ha postulado a tu oportunidad "${brief.title}"`
          });

          toast({ title: 'Postulación enviada', description: 'Tu postulación ha sido enviada con éxito.' });
        } else {
          console.error('❌ RPC function returned failure:', rpcResult);
          toast({ 
            title: 'Error', 
            description: rpcResult?.message || 'No se pudo enviar la postulación.', 
            variant: 'destructive' 
          });
        }
      } else {
        toast({ title: 'Ya te has postulado', description: 'Ya te has postulado a esta oportunidad.', variant: 'destructive' });
      }
    }
  };

  const handleContact = async () => {
    if (!user) {
      toast({
        title: 'Acción requerida',
        description: 'Debes iniciar sesión para contactar al proveedor.',
        variant: 'destructive',
      });
      return;
    }
    
    if (user.id === author.id) {
      toast({
        title: 'Acción no permitida',
        description: 'No puedes contactarte a ti mismo.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const conv = await createConversation({ id: author.id, name: author.name, avatarKey: author.avatarKey, userType: author.userType });
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

  const handleToggleFavorite = () => {
    toggleFavorite(briefId);
    toast({
      title: isFavorite ? 'Eliminado de favoritos' : 'Añadido a favoritos',
      description: `"${brief.title}" ${isFavorite ? 'ha sido eliminado de' : 'ha sido añadido a'} tus favoritos.`,
    });
  };

  const getUserTypeColor = (userType) => ({ provider: 'provider-gradient', ngo: 'ngo-gradient', client: 'client-gradient' })[userType] || 'bg-gray-500';

  if (loading || !author) {
    return <div className="flex items-center justify-center h-screen">Cargando...</div>;
  }

  if (!brief) {
    return <div className="flex items-center justify-center h-screen">Publicación no encontrada.</div>;
  }

  return (
    <>
      <Helmet>
        <title>{brief.title} - Taskora</title>
        <meta name="description" content={brief.description} />
      </Helmet>
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
        </motion.div>
        
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                {brief.images && brief.images.length > 0 && (
                   <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-4">
                    {brief.images.map((img, index) => (
                      <Dialog key={index}>
                        <DialogTrigger asChild>
                          <div className="relative group cursor-pointer">
                            <img src={img} alt={`Imagen ${index+1}`} className="rounded-lg object-cover aspect-video"/>
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Maximize className="text-white w-8 h-8"/>
                            </div>
                          </div>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl p-0 bg-transparent border-0 shadow-none data-[state=open]:bg-background/95">
                          <img src={img} alt={`Imagen ${index+1}`} className="w-auto h-auto max-h-[80vh] mx-auto rounded-lg"/>
                        </DialogContent>
                      </Dialog>
                    ))}
                  </div>
                )}
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <Badge className={`${brief.type === 'opportunity' ? 'ngo-gradient' : 'provider-gradient'} text-white`}>
                      {brief.type === 'opportunity' ? <Heart className="w-3 h-3 mr-1" /> : <Briefcase className="w-3 h-3 mr-1" />}
                      {brief.type === 'opportunity' ? 'Oportunidad' : 'Servicio'}
                    </Badge>
                    <Button variant="ghost" size="icon" onClick={() => handleInteraction(handleToggleFavorite)}>
                      <Star className={`w-5 h-5 ${isFavorite ? 'text-yellow-400 fill-current' : 'text-gray-500'}`} />
                    </Button>
                  </div>
                  <CardTitle className="text-3xl font-bold text-gray-900 pt-2">{brief.title}</CardTitle>
                  <div className="flex items-center pt-2 space-x-4 text-sm text-muted-foreground">
                    <span className="flex items-center"><Tag className="w-4 h-4 mr-1" /> {categoryMap[brief.category] || brief.category}</span>
                    <span className="flex items-center"><Clock className="w-4 h-4 mr-1" /> Duración: {brief.deliveryTime} días</span>
                     <span className="flex items-center">
                        {brief.serviceType === 'presencial' ? <MapPin className="w-4 h-4 mr-1" /> : <Globe className="w-4 h-4 mr-1" />}
                        {brief.serviceType === 'presencial' ? `Presencial` : 'Online'}
                      </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="font-semibold text-lg mb-2 text-gray-800 flex items-center"><FileText className="w-5 h-5 mr-2 text-primary" />Descripción</h3>
                    <p className="text-gray-600 whitespace-pre-wrap">{brief.description}</p>
                  </div>
                  {brief.serviceType === 'presencial' && brief.location && (
                    <div>
                      <h3 className="font-semibold text-lg mb-2 text-gray-800 flex items-center"><MapPin className="w-5 h-5 mr-2 text-primary" />Ubicación del Servicio</h3>
                       <div className="h-64 w-full rounded-md overflow-hidden z-0">
                        <Suspense fallback={<div>Cargando mapa...</div>}>
                          <LocationPicker value={brief.location} radius={brief.radius} onChange={() => {}} showSearch={false} isDraggable={false} />
                        </Suspense>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
            
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Card>
                    <CardHeader>
                        <CardTitle>Reseñas del Creador ({reviews.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {reviews.length > 0 ? (
                            reviews.map(review => <ReviewCard key={review.id} review={review} />)
                        ) : (
                            <p className="text-sm text-muted-foreground">Este usuario aún no tiene reseñas.</p>
                        )}
                    </CardContent>
                </Card>
            </motion.div>

          </div>
          
          <div className="lg:col-span-1 space-y-6">
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl font-bold text-green-600 flex items-center">
                    <DollarSign className="w-6 h-6 mr-2" />
                    {brief.price}
                    <span className="ml-1 text-base font-semibold text-green-600">{(brief.priceType || 'total') === 'por_hora' ? '/hora' : '/unico'}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {brief.type === 'opportunity' ? (
                    <Button className="w-full" onClick={() => handleInteraction(handleApply)} disabled={user && (brief.applications?.some(app => app.id === user.id) || brief.userId === user.id)}>
                      {user ? <UserPlus className="w-4 h-4 mr-2"/> : <Lock className="w-4 h-4 mr-2" />}
                      {user && brief.userId === user.id ? 'Es tu oportunidad' : user && brief.applications?.some(app => app.id === user.id) ? 'Ya te postulaste' : 'Postularse ahora'}
                    </Button>
                  ) : (
                    <Button className="w-full" onClick={() => handleInteraction(handleContact)} disabled={user && brief.userId === user.id}>
                      {user ? <MessageCircle className="w-4 h-4 mr-2"/> : <Lock className="w-4 h-4 mr-2" />}
                      {user && brief.userId === user.id ? 'Es tu servicio' : 'Contactar al proveedor'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
              <Card>
                <CardHeader>
                  <CardTitle>Acerca del Creador</CardTitle>
                </CardHeader>
                <CardContent>
                  <Link to={user ? `/user/${author.id}` : '#'} onClick={(e) => !user && e.preventDefault() & handleInteraction(() => {})} className="block hover:bg-gray-50 p-2 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={author.avatarUrl} />
                        <AvatarFallback className={`${getUserTypeColor(author.userType)} text-white text-lg`}>
                          {author.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-gray-900">{author.name}</p>
                        <Badge variant="outline">{userTypeMap[author.userType] || author.userType}</Badge>
                      </div>
                    </div>
                     <div className="mt-2">
                        <StarRating rating={avgRating} count={reviews.length} />
                    </div>
                    {author.bio && <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{author.bio}</p>}
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
};

export default BriefDetailPage;