import { useState, useCallback } from 'react';
import { optimizeImage, optimizeImages, needsOptimization, getOptimizationStats } from '@/utils/imageOptimizer';

/**
 * Hook para manejar la optimización de imágenes
 * @returns {Object} - Funciones y estado para optimización
 */
export const useImageOptimization = () => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationStats, setOptimizationStats] = useState(null);

  /**
   * Optimiza una sola imagen
   * @param {File} file - Archivo de imagen
   * @returns {Promise<Blob>} - Imagen optimizada
   */
  const optimizeSingleImage = useCallback(async (file) => {
    setIsOptimizing(true);
    setOptimizationStats(null);
    
    try {
      const optimizedBlob = await optimizeImage(file);
      const stats = getOptimizationStats(file, optimizedBlob);
      setOptimizationStats(stats);
      
      return optimizedBlob;
    } catch (error) {
      console.error('Error optimizando imagen:', error);
      throw error;
    } finally {
      setIsOptimizing(false);
    }
  }, []);

  /**
   * Optimiza múltiples imágenes
   * @param {File[]} files - Array de archivos
   * @returns {Promise<Blob[]>} - Array de imágenes optimizadas
   */
  const optimizeMultipleImages = useCallback(async (files) => {
    setIsOptimizing(true);
    setOptimizationStats(null);
    
    try {
      const optimizedBlobs = await optimizeImages(files);
      
      // Calcular estadísticas totales
      let totalOriginalSize = 0;
      let totalOptimizedSize = 0;
      
      files.forEach((file, index) => {
        const blob = optimizedBlobs[index];
        if (blob instanceof Blob) {
          totalOriginalSize += file.size;
          totalOptimizedSize += blob.size;
        }
      });
      
      const totalReduction = ((totalOriginalSize - totalOptimizedSize) / totalOriginalSize) * 100;
      
      setOptimizationStats({
        originalSize: totalOriginalSize,
        optimizedSize: totalOptimizedSize,
        reduction: Math.round(totalReduction * 100) / 100,
        imageCount: files.length
      });
      
      return optimizedBlobs;
    } catch (error) {
      console.error('Error optimizando imágenes:', error);
      throw error;
    } finally {
      setIsOptimizing(false);
    }
  }, []);

  /**
   * Verifica si una imagen necesita optimización
   * @param {File} file - Archivo de imagen
   * @returns {Promise<boolean>} - True si necesita optimización
   */
  const checkIfNeedsOptimization = useCallback(async (file) => {
    try {
      return await needsOptimization(file);
    } catch (error) {
      console.error('Error verificando optimización:', error);
      return true; // Si hay error, optimizar por seguridad
    }
  }, []);

  /**
   * Limpia las estadísticas de optimización
   */
  const clearStats = useCallback(() => {
    setOptimizationStats(null);
  }, []);

  return {
    isOptimizing,
    optimizationStats,
    optimizeSingleImage,
    optimizeMultipleImages,
    checkIfNeedsOptimization,
    clearStats
  };
};
