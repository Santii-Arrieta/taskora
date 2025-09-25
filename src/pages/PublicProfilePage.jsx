import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import { Mail, Phone, MapPin, Link as LinkIcon, Briefcase, CheckCircle, Building, Star, Target, Eye, HeartHandshake as Handshake, Users, History } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';

const StarRating = ({ rating }) => {
  const totalStars = 5;
  return (
    <div className="flex items-center">
      {[...Array(totalStars)].map((_, index) => (
        <Star
          key={index}
          className={`w-5 h-5 ${index < Math.round(rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
        />
      ))}
    </div>
  );
};

const PublicProfilePage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [portfolioSrcs, setPortfolioSrcs] = useState([]);
  const [avatarSrc, setAvatarSrc] = useState('');
  const [hasServices, setHasServices] = useState(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        
        // Buscar usuario en Supabase
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();

        if (userError || !userData) {
          toast({ title: "Error", description: "Usuario no encontrado.", variant: "destructive" });
          navigate(-1);
          return;
        }

        console.log('User data from Supabase:', userData);
        console.log('User userType:', userData.userType);
        console.log('User avatarKey:', userData.avatarKey);
        setProfile(userData);

        // Verificar si el usuario tiene servicios
        const { data: servicesData, error: servicesError } = await supabase
          .from('briefs')
          .select('id')
          .eq('userId', userId)
          .limit(1);

        if (!servicesError && servicesData && servicesData.length > 0) {
          console.log('User has services:', servicesData.length);
          setHasServices(true);
        } else {
          console.log('User has no services');
          setHasServices(false);
        }

        // Configurar avatar
        if (userData.avatarKey) {
          console.log('Setting avatar with key:', userData.avatarKey);
          const { data: avatarData } = supabase.storage
            .from('portfolio')
            .getPublicUrl(userData.avatarKey);
          console.log('Avatar URL:', avatarData.publicUrl);
          setAvatarSrc(avatarData.publicUrl);
        } else {
          console.log('No avatarKey found for user');
        }

        // Configurar portfolio
        if (userData.portfolioKeys && userData.portfolioKeys.length > 0) {
          const portfolioUrls = userData.portfolioKeys.map(key => {
            const { data: portfolioData } = supabase.storage
              .from('portfolio')
              .getPublicUrl(`portfolio/${key}`);
            return portfolioData.publicUrl;
          }).filter(Boolean);
          setPortfolioSrcs(portfolioUrls);
        }

        // Buscar reviews del usuario
        const { data: reviewsData, error: reviewsError } = await supabase
          .from('reviews')
          .select(`
            *,
            reviewer:users!reviews_reviewerId_fkey(name, avatarKey)
          `)
          .eq('revieweeId', userId);

        if (!reviewsError && reviewsData) {
          const formattedReviews = reviewsData.map(review => ({
            ...review,
            reviewerName: review.reviewer?.name || 'Anónimo',
            reviewerAvatar: review.reviewer?.avatarKey ? 
              supabase.storage.from('portfolio').getPublicUrl(review.reviewer.avatarKey).data.publicUrl : 
              null
          }));
          setReviews(formattedReviews);
        }

      } catch (error) {
        console.error('Error fetching user profile:', error);
        toast({ title: "Error", description: "Error al cargar el perfil.", variant: "destructive" });
        navigate(-1);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [userId, navigate, toast]);

  const avgRating = reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) : 0;

  const getUserTypeColor = (userType, hasServices) => {
    // Si es ONG, siempre mostrar como ONG
    if (userType === 'ngo') return 'ngo-gradient';
    // Si tiene servicios, mostrar como Proveedor
    if (hasServices) return 'provider-gradient';
    // Si no tiene servicios y no es ONG, mostrar como Cliente
    return 'client-gradient';
  };

  const getUserTypeLabel = (userType, hasServices) => {
    // Si es ONG, siempre mostrar como ONG
    if (userType === 'ngo') return 'ONG';
    // Si tiene servicios, mostrar como Proveedor
    if (hasServices) return 'Proveedor';
    // Si no tiene servicios y no es ONG, mostrar como Cliente
    return 'Cliente';
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Cargando perfil...</div>;
  }

  if (!profile) {
    return <div className="flex items-center justify-center h-screen">Perfil no disponible.</div>;
  }

  const renderProviderProfile = () => (
    <>
      <Card>
        <CardHeader><CardTitle>Biografía</CardTitle></CardHeader>
        <CardContent>
          <p className="text-gray-600 whitespace-pre-wrap">{typeof profile.bio === 'string' ? profile.bio : 'Este usuario aún no ha agregado una biografía.'}</p>
        </CardContent>
      </Card>
      {profile.skills && (
        <Card>
          <CardHeader><CardTitle>Habilidades</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {(typeof profile.skills === 'string' ? profile.skills.split(',') : []).map((skill, index) => (
                <Badge key={index} variant="secondary">{skill.trim()}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      {portfolioSrcs.length > 0 && (
          <Card>
              <CardHeader><CardTitle>Portfolio</CardTitle></CardHeader>
              <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {portfolioSrcs.map((img, index) => (
                          <div key={index} className="aspect-square rounded-lg overflow-hidden ring-1 ring-border">
                              <img src={img} alt={`Portfolio item ${index+1}`} className="w-full h-full object-cover" />
                          </div>
                      ))}
                  </div>
              </CardContent>
          </Card>
      )}
    </>
  );

  const renderNgoProfile = () => (
    <>
      <Card>
        <CardHeader><CardTitle className="flex items-center"><Target className="w-5 h-5 mr-2 text-primary" />Nuestra Misión</CardTitle></CardHeader>
        <CardContent><p className="text-gray-600 whitespace-pre-wrap">{typeof profile.mission === 'string' ? profile.mission : 'Información no disponible.'}</p></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="flex items-center"><Eye className="w-5 h-5 mr-2 text-primary" />Nuestra Visión</CardTitle></CardHeader>
        <CardContent><p className="text-gray-600 whitespace-pre-wrap">{typeof profile.vision === 'string' ? profile.vision : 'Información no disponible.'}</p></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="flex items-center"><History className="w-5 h-5 mr-2 text-primary" />Nuestra Historia</CardTitle></CardHeader>
        <CardContent><p className="text-gray-600 whitespace-pre-wrap">{typeof profile.history === 'string' ? profile.history : 'Información no disponible.'}</p></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="flex items-center"><Users className="w-5 h-5 mr-2 text-primary" />Nuestro Equipo</CardTitle></CardHeader>
        <CardContent><p className="text-gray-600 whitespace-pre-wrap">{typeof profile.team === 'string' ? profile.team : 'Información no disponible.'}</p></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="flex items-center"><Handshake className="w-5 h-5 mr-2 text-primary" />Alianzas Estratégicas</CardTitle></CardHeader>
        <CardContent><p className="text-gray-600 whitespace-pre-wrap">{typeof profile.partnerships === 'string' ? profile.partnerships : 'Información no disponible.'}</p></CardContent>
      </Card>
    </>
  );

  const renderClientProfile = () => (
    <Card>
      <CardHeader><CardTitle>Biografía</CardTitle></CardHeader>
      <CardContent>
        <p className="text-gray-600 whitespace-pre-wrap">{typeof profile.bio === 'string' ? profile.bio : 'Este usuario aún no ha agregado una biografía.'}</p>
      </CardContent>
    </Card>
  );

  return (
    <>
      <Helmet>
        <title>{profile.name} - Perfil Público</title>
        <meta name="description" content={`Perfil público de ${profile.name} en Taskora.`} />
      </Helmet>
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
             <Card>
                <CardContent className="pt-6 text-center">
                  <Avatar className="w-24 h-24 mb-4 ring-4 ring-offset-2 ring-primary mx-auto">
                    <AvatarImage src={avatarSrc} alt={`Avatar de ${profile.name}`} />
                    <AvatarFallback className={`${getUserTypeColor(profile.userType, hasServices)} text-white text-4xl`}>
                      {profile.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <CardTitle className="text-2xl font-bold">{profile.name}</CardTitle>
                  <CardDescription className="text-md text-muted-foreground">{profile.userType === 'ngo' ? 'Organización No Gubernamental' : profile.titles || 'Miembro de Taskora'}</CardDescription>
                  <div className="mt-2 flex justify-center items-center gap-2">
                    <Badge className={`${getUserTypeColor(profile.userType, hasServices)} text-white`}>
                      {console.log('Profile userType:', profile.userType, 'Has services:', hasServices, 'Label:', getUserTypeLabel(profile.userType, hasServices))}
                      {getUserTypeLabel(profile.userType, hasServices)}
                    </Badge>
                    {profile.verified && <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Verificado</Badge>}
                  </div>
                  {reviews.length > 0 && (
                    <div className="mt-4 flex items-center justify-center gap-2">
                      <StarRating rating={avgRating} />
                      <span className="text-sm text-muted-foreground font-bold">{avgRating.toFixed(1)}</span>
                      <span className="text-sm text-muted-foreground">({reviews.length} reseñas)</span>
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Información de Contacto</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm text-gray-600">
                  {profile.phone ? (
                    <li className="flex items-center">
                      <Phone className="w-4 h-4 mr-3 text-primary flex-shrink-0" /> 
                      {profile.phone}
                    </li>
                  ) : (
                    <li className="flex items-center">
                      <Phone className="w-4 h-4 mr-3 text-gray-400 flex-shrink-0" /> 
                      Sin Información
                    </li>
                  )}
                  {profile.website ? (
                    <li className="flex items-center">
                      <LinkIcon className="w-4 h-4 mr-3 text-primary flex-shrink-0" /> 
                      <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">
                        {profile.website}
                      </a>
                    </li>
                  ) : (
                    <li className="flex items-center">
                      <LinkIcon className="w-4 h-4 mr-3 text-gray-400 flex-shrink-0" /> 
                      Sin Información
                    </li>
                  )}
                </CardContent>
              </Card>
          </div>
          <div className="lg:col-span-2 space-y-6">
            {profile.userType === 'provider' && renderProviderProfile()}
            {profile.userType === 'ngo' && renderNgoProfile()}
            {profile.userType === 'client' && renderClientProfile()}
            
             <Card>
                <CardHeader><CardTitle>Reseñas ({reviews.length})</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                  {reviews.length > 0 ? (
                    reviews.map(review => (
                      <div key={review.id} className="flex items-start space-x-4">
                        <Avatar>
                          <AvatarImage src={review.reviewerAvatar} />
                          <AvatarFallback>{review.reviewerName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold">{review.reviewerName}</p>
                            <StarRating rating={review.rating} />
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{review.comment}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">Este usuario aún no tiene reseñas.</p>
                  )}
                </CardContent>
              </Card>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default PublicProfilePage;