import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, Maximize, ChevronLeft, ChevronRight, X, Download, Share2 } from 'lucide-react';
import LazyImage from '@/components/ui/lazy-image';
import { useLazyImages } from '@/hooks/useLazyImages';

const LazyImageGallery = ({
  images = [],
  className,
  columns = 3,
  gap = 'gap-2',
  showPreview = true,
  showDownload = true,
  showShare = true,
  maxHeight = 'h-48',
  onImageClick,
  onImageLoad,
  onImageError,
  ...props
}) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const galleryRef = useRef(null);
  const { images: imageStates, loadedCount, errorCount, totalCount } = useLazyImages(images);

  // Función para abrir imagen en modal
  const handleImageClick = useCallback((index) => {
    setCurrentIndex(index);
    setSelectedImage(images[index]);
    setIsDialogOpen(true);
    onImageClick?.(index, images[index]);
  }, [images, onImageClick]);

  // Navegación en el modal
  const handlePrevious = useCallback(() => {
    const newIndex = currentIndex > 0 ? currentIndex - 1 : images.length - 1;
    setCurrentIndex(newIndex);
    setSelectedImage(images[newIndex]);
  }, [currentIndex, images]);

  const handleNext = useCallback(() => {
    const newIndex = currentIndex < images.length - 1 ? currentIndex + 1 : 0;
    setCurrentIndex(newIndex);
    setSelectedImage(images[newIndex]);
  }, [currentIndex, images]);

  // Descargar imagen
  const handleDownload = useCallback(async (imageSrc, index) => {
    try {
      const response = await fetch(imageSrc);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `image-${index + 1}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading image:', error);
    }
  }, []);

  // Compartir imagen
  const handleShare = useCallback(async (imageSrc) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Imagen de Taskora',
          url: imageSrc
        });
      } catch (error) {
        console.error('Error sharing image:', error);
      }
    } else {
      // Fallback: copiar URL al portapapeles
      try {
        await navigator.clipboard.writeText(imageSrc);
        // Aquí podrías mostrar un toast de confirmación
      } catch (error) {
        console.error('Error copying to clipboard:', error);
      }
    }
  }, []);

  // Navegación con teclado
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isDialogOpen) return;

      switch (e.key) {
        case 'ArrowLeft':
          handlePrevious();
          break;
        case 'ArrowRight':
          handleNext();
          break;
        case 'Escape':
          setIsDialogOpen(false);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isDialogOpen, handlePrevious, handleNext]);

  if (!images || images.length === 0) {
    return (
      <div className={cn("flex items-center justify-center p-8 text-muted-foreground", className)}>
        <p>No hay imágenes para mostrar</p>
      </div>
    );
  }

  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6'
  };

  return (
    <div className={cn("space-y-4", className)} {...props}>
      {/* Estadísticas de carga */}
      {totalCount > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>{loadedCount}/{totalCount} imágenes cargadas</span>
            {errorCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {errorCount} errores
              </Badge>
            )}
          </div>
          {loadedCount < totalCount && (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Cargando...</span>
            </div>
          )}
        </div>
      )}

      {/* Galería de imágenes */}
      <div className={cn("grid", gridCols[columns] || gridCols[3], gap)}>
        {images.map((imageSrc, index) => (
          <div
            key={index}
            className={cn(
              "relative group cursor-pointer overflow-hidden rounded-lg",
              maxHeight
            )}
            onClick={() => handleImageClick(index)}
          >
            <LazyImage
              src={imageSrc}
              alt={`Imagen ${index + 1}`}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              onLoad={() => onImageLoad?.(index, imageSrc)}
              onError={() => onImageError?.(index, imageSrc)}
            />
            
            {/* Overlay con controles */}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleImageClick(index);
                  }}
                >
                  <Maximize className="w-4 h-4" />
                </Button>
                
                {showDownload && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(imageSrc, index);
                    }}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                )}
                
                {showShare && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShare(imageSrc);
                    }}
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Indicador de estado */}
            {imageStates[index]?.isLoading && (
              <div className="absolute top-2 right-2">
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              </div>
            )}
            
            {imageStates[index]?.hasError && (
              <div className="absolute top-2 right-2">
                <Badge variant="destructive" className="text-xs">
                  Error
                </Badge>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal de vista previa */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-6xl p-0 bg-transparent border-0 shadow-none">
          <div className="relative">
            {/* Imagen principal */}
            {selectedImage && (
              <div className="relative">
                <LazyImage
                  src={selectedImage}
                  alt={`Imagen ${currentIndex + 1}`}
                  className="w-auto h-auto max-h-[80vh] mx-auto rounded-lg"
                  showLoader={true}
                />
                
                {/* Controles de navegación */}
                {images.length > 1 && (
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="absolute left-4 top-1/2 -translate-y-1/2"
                      onClick={handlePrevious}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    
                    <Button
                      variant="secondary"
                      size="sm"
                      className="absolute right-4 top-1/2 -translate-y-1/2"
                      onClick={handleNext}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </>
                )}

                {/* Controles superiores */}
                <div className="absolute top-4 right-4 flex items-center gap-2">
                  {showDownload && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleDownload(selectedImage, currentIndex)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  )}
                  
                  {showShare && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleShare(selectedImage)}
                    >
                      <Share2 className="w-4 h-4" />
                    </Button>
                  )}
                  
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* Información de la imagen */}
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="bg-black/50 text-white p-3 rounded-lg">
                    <p className="text-sm">
                      Imagen {currentIndex + 1} de {images.length}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LazyImageGallery;
