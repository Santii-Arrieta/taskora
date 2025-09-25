/**
 * Sistema de optimización de imágenes
 * Convierte imágenes a WebP y reduce resolución si es necesario
 */

// Configuración de optimización
const OPTIMIZATION_CONFIG = {
  maxWidth: 1280,
  maxHeight: 720,
  quality: 0.85, // Calidad WebP (0-1)
  maxFileSize: 500 * 1024, // 500KB máximo
};

/**
 * Redimensiona una imagen manteniendo la proporción
 * @param {HTMLCanvasElement} canvas - Canvas con la imagen
 * @param {number} maxWidth - Ancho máximo
 * @param {number} maxHeight - Alto máximo
 * @returns {Object} - Nuevas dimensiones
 */
function calculateNewDimensions(canvas, maxWidth, maxHeight) {
  const { width, height } = canvas;
  
  // Si la imagen ya es más pequeña, no redimensionar
  if (width <= maxWidth && height <= maxHeight) {
    return { width, height };
  }
  
  // Calcular proporción
  const aspectRatio = width / height;
  
  let newWidth = width;
  let newHeight = height;
  
  // Redimensionar basado en la dimensión que excede más
  if (width > maxWidth) {
    newWidth = maxWidth;
    newHeight = newWidth / aspectRatio;
  }
  
  if (newHeight > maxHeight) {
    newHeight = maxHeight;
    newWidth = newHeight * aspectRatio;
  }
  
  return {
    width: Math.round(newWidth),
    height: Math.round(newHeight)
  };
}

/**
 * Optimiza una imagen convirtiéndola a WebP y redimensionándola si es necesario
 * @param {File} file - Archivo de imagen original
 * @returns {Promise<Blob>} - Imagen optimizada como Blob
 */
export async function optimizeImage(file) {
  return new Promise((resolve, reject) => {
    // Verificar que sea una imagen
    if (!file.type.startsWith('image/')) {
      reject(new Error('El archivo no es una imagen válida'));
      return;
    }
    
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    img.onload = () => {
      try {
        // Establecer dimensiones del canvas
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Dibujar la imagen en el canvas
        ctx.drawImage(img, 0, 0);
        
        // Calcular nuevas dimensiones si es necesario
        const { width, height } = calculateNewDimensions(
          canvas, 
          OPTIMIZATION_CONFIG.maxWidth, 
          OPTIMIZATION_CONFIG.maxHeight
        );
        
        // Si necesitamos redimensionar, crear un nuevo canvas
        if (width !== img.width || height !== img.height) {
          const resizedCanvas = document.createElement('canvas');
          const resizedCtx = resizedCanvas.getContext('2d');
          
          resizedCanvas.width = width;
          resizedCanvas.height = height;
          
          // Usar alta calidad para el redimensionado
          resizedCtx.imageSmoothingEnabled = true;
          resizedCtx.imageSmoothingQuality = 'high';
          
          resizedCtx.drawImage(canvas, 0, 0, width, height);
          
          // Convertir a WebP
          resizedCanvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Error al convertir la imagen a WebP'));
              }
            },
            'image/webp',
            OPTIMIZATION_CONFIG.quality
          );
        } else {
          // No redimensionar, solo convertir a WebP
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Error al convertir la imagen a WebP'));
              }
            },
            'image/webp',
            OPTIMIZATION_CONFIG.quality
          );
        }
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error('Error al cargar la imagen'));
    };
    
    // Cargar la imagen
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target.result;
    };
    reader.onerror = () => {
      reject(new Error('Error al leer el archivo'));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Optimiza múltiples imágenes
 * @param {File[]} files - Array de archivos de imagen
 * @returns {Promise<Blob[]>} - Array de imágenes optimizadas
 */
export async function optimizeImages(files) {
  const optimizedImages = [];
  
  for (const file of files) {
    try {
      const optimizedImage = await optimizeImage(file);
      optimizedImages.push(optimizedImage);
    } catch (error) {
      console.error(`Error optimizando imagen ${file.name}:`, error);
      // Si falla la optimización, usar la imagen original
      optimizedImages.push(file);
    }
  }
  
  return optimizedImages;
}

/**
 * Verifica si una imagen necesita optimización
 * @param {File} file - Archivo de imagen
 * @returns {Promise<boolean>} - True si necesita optimización
 */
export async function needsOptimization(file) {
  return new Promise((resolve) => {
    const img = new Image();
    
    img.onload = () => {
      const needsResize = img.width > OPTIMIZATION_CONFIG.maxWidth || 
                         img.height > OPTIMIZATION_CONFIG.maxHeight;
      const needsConversion = !file.type.includes('webp');
      const isTooLarge = file.size > OPTIMIZATION_CONFIG.maxFileSize;
      
      resolve(needsResize || needsConversion || isTooLarge);
    };
    
    img.onerror = () => resolve(true); // Si hay error, optimizar
    
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Obtiene estadísticas de optimización
 * @param {File} originalFile - Archivo original
 * @param {Blob} optimizedBlob - Archivo optimizado
 * @returns {Object} - Estadísticas de optimización
 */
export function getOptimizationStats(originalFile, optimizedBlob) {
  const originalSize = originalFile.size;
  const optimizedSize = optimizedBlob.size;
  const reduction = ((originalSize - optimizedSize) / originalSize) * 100;
  
  return {
    originalSize,
    optimizedSize,
    reduction: Math.round(reduction * 100) / 100,
    originalFormat: originalFile.type,
    optimizedFormat: 'image/webp'
  };
}

/**
 * Configuración del sistema de optimización
 */
export const config = OPTIMIZATION_CONFIG;
