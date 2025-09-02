import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import { Search, MessageCircle, DollarSign, Clock, Eye, Users, Heart, Briefcase, UserPlus, SlidersHorizontal, Lock, Star, Code, Palette, PenSquare, Megaphone, Video, Ban, MapPin, Globe } from 'lucide-react';

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

const getUserTypeColor = (userType) => ({ provider: 'provider-gradient', ngo: 'ngo-gradient' })[userType] || 'bg-gray-500';

const BriefCard = ({ brief, index, user, isFavorite, onToggleFavorite, onApply, onContact }) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const handleInteraction = (e, action) => {
    e.preventDefault();
    e.stopPropagation();
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

  return (
    <motion.div key={brief.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
      <Card className="h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col relative">
        <Button variant="ghost" size="icon" className="absolute top-2 right-2 z-10" onClick={(e) => handleInteraction(e, () => onToggleFavorite(brief.id))}>
          <Star className={`w-5 h-5 ${isFavorite ? 'text-yellow-400 fill-current' : 'text-gray-400'}`} />
        </Button>
        <Link to={`/brief/${brief.id}`} className="block h-full flex flex-col">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3"><Avatar className="w-10 h-10"><AvatarImage src={brief.authorAvatarUrl} /><AvatarFallback className={getUserTypeColor(brief.authorType)}>{brief.authorName.charAt(0).toUpperCase()}</AvatarFallback></Avatar><div><p className="font-medium text-sm text-gray-900">{brief.authorName}</p><Badge variant="outline" className="text-xs">{userTypeMap[brief.authorType] || brief.authorType}</Badge></div></div>
              <Badge className={`${brief.type === 'opportunity' ? 'ngo-gradient' : 'provider-gradient'} text-white`}>{brief.type === 'opportunity' ? <Heart className="w-3 h-3 mr-1" /> : <Briefcase className="w-3 h-3 mr-1" />}{brief.type === 'opportunity' ? 'Oportunidad' : 'Servicio'}</Badge>
            </div>
            <CardTitle className="text-lg line-clamp-2">{brief.title}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 flex-grow flex flex-col justify-between">
            <div>
              <p className="text-sm text-muted-foreground line-clamp-3 mb-4">{brief.description}</p>
              <div className="flex items-center justify-between text-sm text-gray-500 mb-4"><div className="flex items-center space-x-4"><span className="flex items-center"><Eye className="w-4 h-4 mr-1" />{brief.views || 0}</span><span className="flex items-center"><Users className="w-4 h-4 mr-1" />{brief.applications?.length || 0}</span></div><Badge variant="secondary">{categoryMap[brief.category] || brief.category}</Badge></div>
              <div className="flex items-center justify-between mb-4"><div className="flex items-center text-lg font-bold text-green-600"><DollarSign className="w-5 h-5" />{brief.price}</div><div className="flex items-center text-sm text-gray-500"><Clock className="w-4 h-4 mr-1" />{brief.deliveryTime} días</div></div>
              <div className="flex items-center text-sm text-muted-foreground">
                {brief.serviceType === 'presencial' ? <MapPin className="w-4 h-4 mr-1" /> : <Globe className="w-4 h-4 mr-1" />}
                {brief.serviceType === 'presencial' ? `Presencial (Radio: ${brief.radius}km)` : 'Online'}
              </div>
            </div>
            <div className="flex gap-2 mt-auto pt-4">
              {brief.type === 'opportunity' ? (
                <Button className="flex-1" onClick={(e) => handleInteraction(e, () => onApply(brief.id))} disabled={user && brief.applications?.some(app => app.id === user.id)}>
                  {user ? <UserPlus className="w-4 h-4 mr-2"/> : <Lock className="w-4 h-4 mr-2" />}
                  {user && brief.applications?.some(app => app.id === user.id) ? 'Postulado' : 'Postularse'}
                </Button>
              ) : (
                <Button className="flex-1" onClick={(e) => handleInteraction(e, () => onContact(brief))}>
                  {user ? <MessageCircle className="w-4 h-4 mr-2"/> : <Lock className="w-4 h-4 mr-2" />}
                  Contactar
                </Button>
              )}
            </div>
          </CardContent>
        </Link>
      </Card>
    </motion.div>
  );
};

export default BriefCard;