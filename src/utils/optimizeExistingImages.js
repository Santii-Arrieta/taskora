/**
 * Script para optimizar imágenes existentes en Supabase Storage
 * Este script debe ejecutarse desde el lado del servidor o como Edge Function
 */

import { createClient } from '@supabase/supabase-js';

// Configuración
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Optimiza una imagen usando Canvas API (solo funciona en navegador)
 * @param {string} imageUrl - URL de la imagen
 * @returns {Promise<Blob>} - Imagen optimizada
 */
async function optimizeImageFromUrl(imageUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        // Configuración de optimización
        const maxWidth = 1280;
        const maxHeight = 720;
        const quality = 0.85;
        
        // Calcular nuevas dimensiones
        let { width, height } = img;
        
        if (width > maxWidth || height > maxHeight) {
          const aspectRatio = width / height;
          
          if (width > maxWidth) {
            width = maxWidth;
            height = width / aspectRatio;
          }
          
          if (height > maxHeight) {
            height = maxHeight;
            width = height * aspectRatio;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Dibujar imagen redimensionada
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convertir a WebP
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Error al convertir a WebP'));
            }
          },
          'image/webp',
          quality
        );
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error('Error al cargar la imagen'));
    };
    
    img.src = imageUrl;
  });
}

/**
 * Obtiene todas las imágenes del bucket
 * @param {string} bucketName - Nombre del bucket
 * @returns {Promise<Array>} - Lista de archivos
 */
async function getAllImagesFromBucket(bucketName) {
  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .list('', {
        limit: 1000,
        sortBy: { column: 'created_at', order: 'desc' }
      });
    
    if (error) {
      console.error('Error obteniendo imágenes:', error);
      return [];
    }
    
    // Filtrar solo archivos de imagen
    const imageFiles = data.filter(file => 
      file.name.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i)
    );
    
    return imageFiles;
  } catch (error) {
    console.error('Error:', error);
    return [];
  }
}

/**
 * Optimiza una imagen existente
 * @param {string} bucketName - Nombre del bucket
 * @param {string} filePath - Ruta del archivo
 * @returns {Promise<boolean>} - True si se optimizó correctamente
 */
async function optimizeExistingImage(bucketName, filePath) {
  try {
    // Obtener URL pública de la imagen
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);
    
    if (!urlData.publicUrl) {
      console.error('No se pudo obtener URL pública para:', filePath);
      return false;
    }
    
    // Optimizar la imagen
    const optimizedBlob = await optimizeImageFromUrl(urlData.publicUrl);
    
    // Generar nuevo nombre de archivo con extensión .webp
    const newFilePath = filePath.replace(/\.[^/.]+$/, '.webp');
    
    // Subir imagen optimizada
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(newFilePath, optimizedBlob, {
        upsert: true // Sobrescribir si existe
      });
    
    if (uploadError) {
      console.error('Error subiendo imagen optimizada:', uploadError);
      return false;
    }
    
    // Si el archivo original no es WebP, eliminarlo
    if (!filePath.toLowerCase().endsWith('.webp')) {
      const { error: deleteError } = await supabase.storage
        .from(bucketName)
        .remove([filePath]);
      
      if (deleteError) {
        console.warn('No se pudo eliminar archivo original:', deleteError);
      }
    }
    
    console.log(`✅ Optimizada: ${filePath} → ${newFilePath}`);
    return true;
  } catch (error) {
    console.error(`❌ Error optimizando ${filePath}:`, error);
    return false;
  }
}

/**
 * Optimiza todas las imágenes de un bucket
 * @param {string} bucketName - Nombre del bucket
 * @returns {Promise<Object>} - Estadísticas de optimización
 */
export async function optimizeAllImagesInBucket(bucketName) {
  console.log(`🚀 Iniciando optimización de imágenes en bucket: ${bucketName}`);
  
  const images = await getAllImagesFromBucket(bucketName);
  console.log(`📁 Encontradas ${images.length} imágenes`);
  
  let optimized = 0;
  let errors = 0;
  let totalOriginalSize = 0;
  let totalOptimizedSize = 0;
  
  for (const image of images) {
    try {
      const filePath = image.name;
      
      // Obtener tamaño original
      const { data: downloadData } = await supabase.storage
        .from(bucketName)
        .download(filePath);
      
      if (downloadData) {
        totalOriginalSize += downloadData.size;
      }
      
      const success = await optimizeExistingImage(bucketName, filePath);
      
      if (success) {
        optimized++;
        
        // Obtener tamaño optimizado
        const newFilePath = filePath.replace(/\.[^/.]+$/, '.webp');
        const { data: optimizedData } = await supabase.storage
          .from(bucketName)
          .download(newFilePath);
        
        if (optimizedData) {
          totalOptimizedSize += optimizedData.size;
        }
      } else {
        errors++;
      }
      
      // Pequeña pausa para no sobrecargar
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error('Error procesando imagen:', error);
      errors++;
    }
  }
  
  const reduction = totalOriginalSize > 0 
    ? ((totalOriginalSize - totalOptimizedSize) / totalOriginalSize) * 100 
    : 0;
  
  const stats = {
    totalImages: images.length,
    optimized,
    errors,
    totalOriginalSize,
    totalOptimizedSize,
    reduction: Math.round(reduction * 100) / 100
  };
  
  console.log('📊 Estadísticas de optimización:', stats);
  return stats;
}

/**
 * Función principal para ejecutar la optimización
 */
export async function runImageOptimization() {
  const buckets = ['portfolio', 'avatars']; // Agregar más buckets según sea necesario
  
  for (const bucket of buckets) {
    try {
      await optimizeAllImagesInBucket(bucket);
    } catch (error) {
      console.error(`Error optimizando bucket ${bucket}:`, error);
    }
  }
}
