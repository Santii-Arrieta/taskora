import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileImage, Download, Zap } from 'lucide-react';

/**
 * Componente para mostrar estadísticas de optimización de imágenes
 * @param {Object} stats - Estadísticas de optimización
 * @param {boolean} showDetails - Si mostrar detalles adicionales
 */
export const ImageOptimizationStats = ({ stats, showDetails = true }) => {
  if (!stats) return null;

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getReductionColor = (reduction) => {
    if (reduction > 50) return 'text-green-600';
    if (reduction > 25) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-500" />
          Optimización de Imagen
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Reducción de tamaño:</span>
          <Badge 
            variant="outline" 
            className={`font-semibold ${getReductionColor(stats.reduction)}`}
          >
            {stats.reduction}%
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <FileImage className="w-4 h-4 text-gray-500" />
              <span className="text-muted-foreground">Original:</span>
            </div>
            <div className="font-medium">{formatBytes(stats.originalSize)}</div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-green-500" />
              <span className="text-muted-foreground">Optimizada:</span>
            </div>
            <div className="font-medium text-green-600">{formatBytes(stats.optimizedSize)}</div>
          </div>
        </div>

        {showDetails && (
          <div className="pt-2 border-t">
            <div className="text-xs text-muted-foreground space-y-1">
              <div>Formato: {stats.originalFormat} → {stats.optimizedFormat}</div>
              {stats.imageCount && (
                <div>Imágenes procesadas: {stats.imageCount}</div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
