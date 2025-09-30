import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Loader2, User, AlertCircle } from 'lucide-react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';

const LazyAvatar = React.forwardRef(({
  src,
  alt,
  fallback,
  className,
  size = 'md',
  threshold = 0.1,
  rootMargin = '50px',
  onLoad,
  onError,
  showLoader = true,
  ...props
}, ref) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const avatarRef = useRef(null);
  const observerRef = useRef(null);

  // Tamaños predefinidos
  const sizeClasses = {
    xs: 'h-6 w-6',
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
    '2xl': 'h-20 w-20',
    '3xl': 'h-24 w-24'
  };

  // Función para cargar la imagen
  const loadImage = useCallback(() => {
    if (!src || isLoaded || hasError || isLoading) return;

    setIsLoading(true);
    setHasError(false);

    const img = new Image();
    
    img.onload = () => {
      setIsLoaded(true);
      setIsLoading(false);
      onLoad?.(img);
    };

    img.onerror = () => {
      setHasError(true);
      setIsLoading(false);
      onError?.(img);
    };

    img.src = src;
  }, [src, isLoaded, hasError, isLoading, onLoad, onError]);

  // Configurar Intersection Observer
  useEffect(() => {
    if (!avatarRef.current || isInView) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            loadImage();
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold,
        rootMargin
      }
    );

    observer.observe(avatarRef.current);
    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [isInView, loadImage, threshold, rootMargin]);

  // Limpiar observer al desmontar
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  // Generar fallback automático si no se proporciona
  const generateFallback = () => {
    if (fallback) return fallback;
    if (alt) return alt.charAt(0).toUpperCase();
    return <User className="w-1/2 h-1/2" />;
  };

  return (
    <AvatarPrimitive.Root
      ref={ref || avatarRef}
      className={cn(
        "relative flex shrink-0 overflow-hidden rounded-full",
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {/* Imagen cargada */}
      {isLoaded && src && !hasError && (
        <AvatarPrimitive.Image
          src={src}
          alt={alt}
          className="aspect-square h-full w-full object-cover"
        />
      )}

      {/* Loading state */}
      {isLoading && showLoader && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <Loader2 className="w-1/2 h-1/2 animate-spin text-gray-400" />
        </div>
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <AlertCircle className="w-1/2 h-1/2 text-gray-400" />
        </div>
      )}

      {/* Fallback */}
      <AvatarPrimitive.Fallback
        className={cn(
          "flex h-full w-full items-center justify-center rounded-full bg-muted text-muted-foreground",
          isLoaded && !hasError && "hidden"
        )}
      >
        {generateFallback()}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
});

LazyAvatar.displayName = 'LazyAvatar';

export default LazyAvatar;
