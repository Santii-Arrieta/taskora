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

  useEffect(() => {
    const usersData = JSON.parse(localStorage.getItem('users') || '[]');
    const allReviews = JSON.parse(localStorage.getItem('reviews') || '[]');
    const foundUser = usersData.find(u => u.id === userId);

    if (foundUser) {
      setProfile(foundUser);
      
      if (foundUser.avatarKey) {
        setAvatarSrc(localStorage.getItem(foundUser.avatarKey));
      }
      if (foundUser.portfolioKeys) {
        const urls = foundUser.portfolioKeys.map(key => localStorage.getItem(key)).filter(Boolean);
        setPortfolioSrcs(urls);
      }

      const userReviews = allReviews
        .filter(r => r.revieweeId === userId)
        .map(review => {
          const reviewer = usersData.find(u => u.id === review.reviewerId);
          return { ...review, reviewerName: reviewer?.name || 'Anónimo', reviewerAvatar: reviewer?.avatar };
        });
      setReviews(userReviews);
    } else {
      toast({ title: "Error", description: "Usuario no encontrado.", variant: "destructive" });
      navigate(-1);
    }
    setLoading(false);
  }, [userId, navigate, toast]);

  const avgRating = reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) : 0;

  const getUserTypeColor = (userType) => ({
    provider: 'provider-gradient',
    client: 'client-gradient',
    ngo: 'ngo-gradient',
    admin: 'admin-gradient'
  })[userType] || 'bg-gray-500';

  const getUserTypeLabel = (userType) => ({
    provider: 'Proveedor', client: 'Cliente', ngo: 'ONG', admin: 'Admin'
  })[userType] || 'Usuario';

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
          <p className="text-gray-600 whitespace-pre-wrap">{profile.bio || 'Este usuario aún no ha agregado una biografía.'}</p>
        </CardContent>
      </Card>
      {profile.skills && (
        <Card>
          <CardHeader><CardTitle>Habilidades</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {profile.skills.split(',').map((skill, index) => (
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
        <CardContent><p className="text-gray-600 whitespace-pre-wrap">{profile.mission || 'Información no disponible.'}</p></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="flex items-center"><Eye className="w-5 h-5 mr-2 text-primary" />Nuestra Visión</CardTitle></CardHeader>
        <CardContent><p className="text-gray-600 whitespace-pre-wrap">{profile.vision || 'Información no disponible.'}</p></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="flex items-center"><History className="w-5 h-5 mr-2 text-primary" />Nuestra Historia</CardTitle></CardHeader>
        <CardContent><p className="text-gray-600 whitespace-pre-wrap">{profile.history || 'Información no disponible.'}</p></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="flex items-center"><Users className="w-5 h-5 mr-2 text-primary" />Nuestro Equipo</CardTitle></CardHeader>
        <CardContent><p className="text-gray-600 whitespace-pre-wrap">{profile.team || 'Información no disponible.'}</p></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="flex items-center"><Handshake className="w-5 h-5 mr-2 text-primary" />Alianzas Estratégicas</CardTitle></CardHeader>
        <CardContent><p className="text-gray-600 whitespace-pre-wrap">{profile.partnerships || 'Información no disponible.'}</p></CardContent>
      </Card>
    </>
  );

  const renderClientProfile = () => (
    <Card>
      <CardHeader><CardTitle>Biografía</CardTitle></CardHeader>
      <CardContent>
        <p className="text-gray-600 whitespace-pre-wrap">{profile.bio || 'Este usuario aún no ha agregado una biografía.'}</p>
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
                    <AvatarFallback className={`${getUserTypeColor(profile.userType)} text-white text-4xl`}>
                      {profile.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <CardTitle className="text-2xl font-bold">{profile.name}</CardTitle>
                  <CardDescription className="text-md text-muted-foreground">{profile.userType === 'ngo' ? 'Organización No Gubernamental' : profile.titles || 'Miembro de Taskora'}</CardDescription>
                  <div className="mt-2 flex justify-center items-center gap-2">
                    <Badge className={`${getUserTypeColor(profile.userType)} text-white`}>{getUserTypeLabel(profile.userType)}</Badge>
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
                  <li className="flex items-center"><Mail className="w-4 h-4 mr-3 text-primary flex-shrink-0" /> <span className="truncate">{profile.email}</span></li>
                  {profile.phone && <li className="flex items-center"><Phone className="w-4 h-4 mr-3 text-primary flex-shrink-0" /> {profile.phone}</li>}
                  {profile.location && <li className="flex items-center"><MapPin className="w-4 h-4 mr-3 text-primary flex-shrink-0" /> {profile.location}</li>}
                  {profile.address && <li className="flex items-center"><Building className="w-4 h-4 mr-3 text-primary flex-shrink-0" /> {profile.address}</li>}
                  {profile.website && <li className="flex items-center"><LinkIcon className="w-4 h-4 mr-3 text-primary flex-shrink-0" /> <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">{profile.website}</a></li>}
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