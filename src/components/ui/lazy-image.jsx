import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Loader2, Image as ImageIcon, AlertCircle } from 'lucide-react';

const LazyImage = React.forwardRef(({
  src,
  alt,
  className,
  placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PC9zdmc+',
  fallback = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZTJlM2U0Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5YTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlbiBubyBkaXNwb25pYmxlPC90ZXh0Pjwvc3ZnPg==',
  loading = 'lazy',
  threshold = 0.1,
  rootMargin = '50px',
  onLoad,
  onError,
  showLoader = true,
  showError = true,
  ...props
}, ref) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const imgRef = useRef(null);
  const observerRef = useRef(null);

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
    if (!imgRef.current || isInView) return;

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

    observer.observe(imgRef.current);
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

  // Si la imagen ya está cargada, mostrarla directamente
  if (isLoaded && src) {
    return (
      <img
        ref={ref || imgRef}
        src={src}
        alt={alt}
        className={cn("transition-opacity duration-300", className)}
        {...props}
      />
    );
  }

  // Si hay error, mostrar fallback
  if (hasError) {
    return (
      <div
        ref={ref || imgRef}
        className={cn(
          "flex items-center justify-center bg-gray-200 text-gray-500",
          className
        )}
        {...props}
      >
        {showError ? (
          <div className="flex flex-col items-center gap-2">
            <AlertCircle className="w-8 h-8" />
            <span className="text-xs">Error al cargar</span>
          </div>
        ) : (
          <img
            src={fallback}
            alt={alt}
            className="w-full h-full object-cover"
          />
        )}
      </div>
    );
  }

  // Mostrar placeholder mientras carga
  return (
    <div
      ref={ref || imgRef}
      className={cn(
        "relative flex items-center justify-center bg-gray-100",
        className
      )}
      {...props}
    >
      {/* Placeholder */}
      <img
        src={placeholder}
        alt=""
        className="w-full h-full object-cover opacity-50"
        style={{ filter: 'blur(5px)' }}
      />
      
      {/* Loading indicator */}
      {isLoading && showLoader && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}
      
      {/* Image icon cuando no está en vista */}
      {!isInView && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <ImageIcon className="w-8 h-8 text-gray-400" />
        </div>
      )}
    </div>
  );
});

LazyImage.displayName = 'LazyImage';

export default LazyImage;
