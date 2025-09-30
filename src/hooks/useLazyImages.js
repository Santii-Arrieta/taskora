import { useState, useRef, useEffect, useCallback } from 'react';

// Hook para lazy loading de imágenes
export const useLazyImage = (src, options = {}) => {
  const {
    threshold = 0.1,
    rootMargin = '50px',
    enabled = true
  } = options;

  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const elementRef = useRef(null);
  const observerRef = useRef(null);

  // Función para cargar la imagen
  const loadImage = useCallback(() => {
    if (!src || isLoaded || hasError || isLoading || !enabled) return;

    setIsLoading(true);
    setHasError(false);

    const img = new Image();
    
    img.onload = () => {
      setIsLoaded(true);
      setIsLoading(false);
    };

    img.onerror = () => {
      setHasError(true);
      setIsLoading(false);
    };

    img.src = src;
  }, [src, isLoaded, hasError, isLoading, enabled]);

  // Configurar Intersection Observer
  useEffect(() => {
    if (!elementRef.current || isInView || !enabled) return;

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

    observer.observe(elementRef.current);
    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [isInView, loadImage, threshold, rootMargin, enabled]);

  // Limpiar observer al desmontar
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  // Resetear estado cuando cambia la src
  useEffect(() => {
    setIsLoaded(false);
    setIsInView(false);
    setHasError(false);
    setIsLoading(false);
  }, [src]);

  return {
    elementRef,
    isLoaded,
    isInView,
    hasError,
    isLoading,
    loadImage
  };
};

// Hook para lazy loading de múltiples imágenes
export const useLazyImages = (srcs, options = {}) => {
  const {
    threshold = 0.1,
    rootMargin = '50px',
    enabled = true
  } = options;

  const [images, setImages] = useState({});
  const [loadedCount, setLoadedCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);

  // Función para cargar una imagen específica
  const loadImage = useCallback((index, src) => {
    if (!src || images[index]?.isLoaded || images[index]?.hasError) return;

    setImages(prev => ({
      ...prev,
      [index]: { ...prev[index], isLoading: true, hasError: false }
    }));

    const img = new Image();
    
    img.onload = () => {
      setImages(prev => ({
        ...prev,
        [index]: { ...prev[index], isLoaded: true, isLoading: false }
      }));
      setLoadedCount(prev => prev + 1);
    };

    img.onerror = () => {
      setImages(prev => ({
        ...prev,
        [index]: { ...prev[index], hasError: true, isLoading: false }
      }));
      setErrorCount(prev => prev + 1);
    };

    img.src = src;
  }, [images]);

  // Inicializar estado de imágenes
  useEffect(() => {
    if (!srcs || !Array.isArray(srcs)) return;

    const initialImages = {};
    srcs.forEach((src, index) => {
      if (src) {
        initialImages[index] = {
          src,
          isLoaded: false,
          isLoading: false,
          hasError: false
        };
      }
    });

    setImages(initialImages);
    setLoadedCount(0);
    setErrorCount(0);
  }, [srcs]);

  // Función para cargar todas las imágenes
  const loadAllImages = useCallback(() => {
    if (!srcs || !Array.isArray(srcs)) return;

    srcs.forEach((src, index) => {
      if (src) {
        loadImage(index, src);
      }
    });
  }, [srcs, loadImage]);

  // Función para cargar una imagen específica
  const loadImageAtIndex = useCallback((index) => {
    if (srcs && srcs[index]) {
      loadImage(index, srcs[index]);
    }
  }, [srcs, loadImage]);

  return {
    images,
    loadedCount,
    errorCount,
    totalCount: srcs ? srcs.length : 0,
    loadAllImages,
    loadImageAtIndex,
    isAllLoaded: loadedCount === (srcs ? srcs.length : 0),
    hasAnyError: errorCount > 0
  };
};

// Hook para preload de imágenes
export const useImagePreload = (srcs, options = {}) => {
  const {
    priority = false,
    onComplete,
    onProgress
  } = options;

  const [loadedImages, setLoadedImages] = useState(new Set());
  const [failedImages, setFailedImages] = useState(new Set());
  const [isLoading, setIsLoading] = useState(false);

  const preloadImages = useCallback(async () => {
    if (!srcs || !Array.isArray(srcs) || srcs.length === 0) return;

    setIsLoading(true);
    setLoadedImages(new Set());
    setFailedImages(new Set());

    const promises = srcs.map((src, index) => {
      return new Promise((resolve) => {
        if (!src) {
          resolve({ index, success: false, error: 'No source provided' });
          return;
        }

        const img = new Image();
        
        img.onload = () => {
          setLoadedImages(prev => new Set([...prev, index]));
          onProgress?.(index, src, true);
          resolve({ index, success: true, src });
        };

        img.onerror = (error) => {
          setFailedImages(prev => new Set([...prev, index]));
          onProgress?.(index, src, false, error);
          resolve({ index, success: false, error });
        };

        img.src = src;
      });
    });

    try {
      const results = await Promise.all(promises);
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      onComplete?.(successful, failed);
    } catch (error) {
      console.error('Error preloading images:', error);
    } finally {
      setIsLoading(false);
    }
  }, [srcs, onComplete, onProgress]);

  // Preload automático si es prioritario
  useEffect(() => {
    if (priority && srcs && srcs.length > 0) {
      preloadImages();
    }
  }, [priority, srcs, preloadImages]);

  return {
    loadedImages,
    failedImages,
    isLoading,
    preloadImages,
    progress: srcs ? (loadedImages.size / srcs.length) * 100 : 0
  };
};

// Hook para optimización de imágenes
export const useImageOptimization = (src, options = {}) => {
  const {
    maxWidth = 1280,
    maxHeight = 720,
    quality = 0.85,
    format = 'webp'
  } = options;

  const [optimizedSrc, setOptimizedSrc] = useState(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [error, setError] = useState(null);

  const optimizeImage = useCallback(async () => {
    if (!src) return;

    setIsOptimizing(true);
    setError(null);

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = src;
      });

      // Calcular dimensiones optimizadas
      let { width, height } = img;
      
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }

      canvas.width = width;
      canvas.height = height;

      // Dibujar imagen redimensionada
      ctx.drawImage(img, 0, 0, width, height);

      // Convertir a formato optimizado
      const optimizedDataUrl = canvas.toDataURL(`image/${format}`, quality);
      setOptimizedSrc(optimizedDataUrl);

    } catch (err) {
      console.error('Error optimizing image:', err);
      setError(err.message);
    } finally {
      setIsOptimizing(false);
    }
  }, [src, maxWidth, maxHeight, quality, format]);

  useEffect(() => {
    if (src) {
      optimizeImage();
    }
  }, [src, optimizeImage]);

  return {
    optimizedSrc,
    isOptimizing,
    error,
    optimizeImage
  };
};
