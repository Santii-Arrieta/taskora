import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Heart, MapPin, Clock, Star, Eye, MessageCircle, DollarSign } from 'lucide-react';
import LazyImage from '@/components/ui/lazy-image';
import LazyAvatar from '@/components/ui/lazy-avatar';
import { cn } from '@/lib/utils';

const OptimizedBriefCard = ({
  brief,
  user,
  onContact,
  onToggleFavorite,
  className,
  showActions = true,
  showLocation = true,
  showRating = true,
  ...props
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  // Generar URL del avatar del autor
  const getAuthorAvatarUrl = useCallback(() => {
    if (!brief.author?.avatarKey) return null;
    
    // Asumir que usamos Supabase Storage
    const baseUrl = 'https://lmxcmpksctnqsqwhfkvy.supabase.co/storage/v1/object/public/portfolio';
    return `${baseUrl}/${brief.author.avatarKey}`;
  }, [brief.author?.avatarKey]);

  // Generar URLs de imágenes del brief
  const getBriefImageUrls = useCallback(() => {
    if (!brief.images || !Array.isArray(brief.images)) return [];
    
    return brief.images.map(image => {
      if (typeof image === 'string') return image;
      if (image.url) return image.url;
      return null;
    }).filter(Boolean);
  }, [brief.images]);

  // Calcular rating promedio
  const getAverageRating = useCallback(() => {
    if (!brief.reviews || !Array.isArray(brief.reviews)) return 0;
    
    const ratings = brief.reviews
      .map(review => review.rating)
      .filter(rating => typeof rating === 'number');
    
    if (ratings.length === 0) return 0;
    
    return ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
  }, [brief.reviews]);

  // Manejar toggle de favorito
  const handleToggleFavorite = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsFavorite(prev => !prev);
    onToggleFavorite?.(brief.id);
  }, [brief.id, onToggleFavorite]);

  // Manejar contacto
  const handleContact = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    onContact?.(brief);
  }, [brief, onContact]);

  const authorAvatarUrl = getAuthorAvatarUrl();
  const briefImages = getBriefImageUrls();
  const averageRating = getAverageRating();
  const hasImages = briefImages.length > 0;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Card className={cn("group cursor-pointer overflow-hidden", className)} {...props}>
        <Link to={`/brief/${brief.id}`} className="block">
          {/* Imagen principal con lazy loading */}
          <div className="relative h-48 overflow-hidden">
            {hasImages ? (
              <LazyImage
                src={briefImages[0]}
                alt={brief.title}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                placeholder="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5YTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkNhcmdhbmRvIGltYWdlbi4uLjwvdGV4dD48L3N2Zz4="
                fallback="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZTJlM2U0Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5YTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlbiBubyBkaXNwb25pYmxlPC90ZXh0Pjwvc3ZnPg=="
                threshold={0.1}
                rootMargin="100px"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <Eye className="w-12 h-12 mx-auto mb-2" />
                  <p className="text-sm">Sin imagen</p>
                </div>
              </div>
            )}

            {/* Overlay con información */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="absolute bottom-4 left-4 right-4">
                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center gap-2">
                    {showRating && averageRating > 0 && (
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium">
                          {averageRating.toFixed(1)}
                        </span>
                      </div>
                    )}
                    {brief.reviews && (
                      <span className="text-sm text-gray-300">
                        ({brief.reviews.length} reseñas)
                      </span>
                    )}
                  </div>
                  
                  {hasImages && briefImages.length > 1 && (
                    <Badge variant="secondary" className="text-xs">
                      +{briefImages.length - 1} más
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Botón de favorito */}
            {showActions && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 bg-white/90 hover:bg-white text-gray-700 hover:text-red-500"
                onClick={handleToggleFavorite}
              >
                <Heart className={cn("w-4 h-4", isFavorite && "fill-red-500 text-red-500")} />
              </Button>
            )}
          </div>

          {/* Contenido de la tarjeta */}
          <CardContent className="p-4">
            {/* Título y categoría */}
            <div className="mb-3">
              <CardTitle className="text-lg font-semibold line-clamp-2 mb-2">
                {brief.title}
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                {brief.category}
              </Badge>
            </div>

            {/* Descripción */}
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {brief.description}
            </p>

            {/* Información adicional */}
            <div className="space-y-2 mb-4">
              {/* Precio */}
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="w-4 h-4 text-green-600" />
                <span className="font-semibold text-green-600">
                  ${brief.price?.toLocaleString() || 'Consultar'}
                </span>
              </div>

              {/* Tiempo de entrega */}
              {brief.deliveryTime && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>{brief.deliveryTime}</span>
                </div>
              )}

              {/* Ubicación */}
              {showLocation && brief.author?.location && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>
                    {typeof brief.author.location === 'string' 
                      ? brief.author.location 
                      : 'Ubicación disponible'
                    }
                  </span>
                </div>
              )}
            </div>

            {/* Autor */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <LazyAvatar
                  src={authorAvatarUrl}
                  alt={brief.author?.name || 'Autor'}
                  size="sm"
                  fallback={brief.author?.name?.charAt(0) || 'A'}
                  threshold={0.1}
                  rootMargin="50px"
                />
                <div>
                  <p className="text-sm font-medium">
                    {brief.author?.name || 'Usuario'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {brief.author?.userType || 'Usuario'}
                  </p>
                </div>
              </div>

              {/* Botón de contacto */}
              {showActions && (
                <Button
                  size="sm"
                  onClick={handleContact}
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
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

export default OptimizedBriefCard;
