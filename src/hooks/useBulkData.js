import { useState, useCallback, useRef } from 'react';
import { useToast } from '@/components/ui/use-toast';
import bulkDataService from '@/lib/bulkDataService';

// Hook para carga masiva de datos
export const useBulkData = (table, options = {}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState(null);
  const [errors, setErrors] = useState([]);
  const [validationErrors, setValidationErrors] = useState([]);
  const { toast } = useToast();
  const abortControllerRef = useRef(null);

  // Función para cargar datos masivamente
  const bulkInsert = useCallback(async (data, insertOptions = {}) => {
    if (!data || data.length === 0) {
      toast({
        title: "Error",
        description: "No hay datos para procesar",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setProgress(0);
    setResults(null);
    setErrors([]);
    setValidationErrors([]);

    // Crear AbortController para cancelar la operación
    abortControllerRef.current = new AbortController();

    try {
      const result = await bulkDataService.bulkInsert(table, data, {
        ...insertOptions,
        onProgress: (progressResults) => {
          const progressPercent = (progressResults.processed / progressResults.total) * 100;
          setProgress(progressPercent);
          setResults(progressResults);
        },
        onComplete: (finalResults, validationErrors) => {
          setResults(finalResults);
          setValidationErrors(validationErrors);
          
          // Mostrar toast de éxito
          toast({
            title: "Carga masiva completada",
            description: `${finalResults.success.length} registros insertados exitosamente`,
            variant: "default"
          });

          // Mostrar errores si los hay
          if (finalResults.errors.length > 0) {
            toast({
              title: "Algunos registros fallaron",
              description: `${finalResults.errors.length} registros no pudieron ser insertados`,
              variant: "destructive"
            });
          }

          if (validationErrors.length > 0) {
            toast({
              title: "Errores de validación",
              description: `${validationErrors.length} registros tienen errores de validación`,
              variant: "destructive"
            });
          }
        }
      });

      return result;

    } catch (error) {
      console.error('Error en carga masiva:', error);
      
      toast({
        title: "Error en carga masiva",
        description: error.message || "Ocurrió un error inesperado",
        variant: "destructive"
      });

      setErrors([{ message: error.message }]);
      return { success: false, error: error.message };

    } finally {
      setIsLoading(false);
      setProgress(100);
      abortControllerRef.current = null;
    }
  }, [table, toast]);

  // Función para cancelar la operación
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
      setProgress(0);
      
      toast({
        title: "Operación cancelada",
        description: "La carga masiva ha sido cancelada",
        variant: "default"
      });
    }
  }, [toast]);

  // Función para limpiar el estado
  const reset = useCallback(() => {
    setIsLoading(false);
    setProgress(0);
    setResults(null);
    setErrors([]);
    setValidationErrors([]);
  }, []);

  return {
    isLoading,
    progress,
    results,
    errors,
    validationErrors,
    bulkInsert,
    cancel,
    reset
  };
};

// Hook para importar desde CSV
export const useCSVImport = (table, options = {}) => {
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState(null);
  const { toast } = useToast();

  const importFromCSV = useCallback(async (file) => {
    if (!file) {
      toast({
        title: "Error",
        description: "No se seleccionó ningún archivo",
        variant: "destructive"
      });
      return;
    }

    setIsImporting(true);
    setImportProgress(0);
    setImportResults(null);

    try {
      // Leer y parsear CSV
      setImportProgress(25);
      const data = await bulkDataService.importFromCSV(file, table);
      
      if (!data || data.length === 0) {
        throw new Error('El archivo CSV está vacío o no tiene datos válidos');
      }

      setImportProgress(50);

      // Procesar datos
      const result = await bulkDataService.bulkInsert(table, data, {
        ...options,
        onProgress: (progressResults) => {
          const progressPercent = 50 + (progressResults.processed / progressResults.total) * 50;
          setImportProgress(progressPercent);
        }
      });

      setImportProgress(100);
      setImportResults(result);

      if (result.success) {
        toast({
          title: "Importación completada",
          description: `${result.summary.inserted} registros importados exitosamente`,
          variant: "default"
        });
      } else {
        toast({
          title: "Error en importación",
          description: result.error || "Ocurrió un error durante la importación",
          variant: "destructive"
        });
      }

      return result;

    } catch (error) {
      console.error('Error en importación CSV:', error);
      
      toast({
        title: "Error en importación",
        description: error.message || "Ocurrió un error inesperado",
        variant: "destructive"
      });

      return { success: false, error: error.message };

    } finally {
      setIsImporting(false);
    }
  }, [table, options, toast]);

  return {
    isImporting,
    importProgress,
    importResults,
    importFromCSV
  };
};

// Hook para exportar a CSV
export const useCSVExport = (table, options = {}) => {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const exportToCSV = useCallback(async (data, filename) => {
    if (!data || data.length === 0) {
      toast({
        title: "Error",
        description: "No hay datos para exportar",
        variant: "destructive"
      });
      return;
    }

    setIsExporting(true);

    try {
      await bulkDataService.exportToCSV(table, data, filename);
      
      toast({
        title: "Exportación completada",
        description: `${data.length} registros exportados exitosamente`,
        variant: "default"
      });

    } catch (error) {
      console.error('Error en exportación CSV:', error);
      
      toast({
        title: "Error en exportación",
        description: error.message || "Ocurrió un error durante la exportación",
        variant: "destructive"
      });

    } finally {
      setIsExporting(false);
    }
  }, [table, toast]);

  return {
    isExporting,
    exportToCSV
  };
};

// Hook para generar datos de prueba
export const useTestDataGenerator = (table, options = {}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const generateTestData = useCallback(async (count = 100) => {
    setIsGenerating(true);

    try {
      const testData = generateTestDataForTable(table, count);
      
      toast({
        title: "Datos de prueba generados",
        description: `${count} registros de prueba generados`,
        variant: "default"
      });

      return testData;

    } catch (error) {
      console.error('Error generando datos de prueba:', error);
      
      toast({
        title: "Error generando datos",
        description: error.message || "Ocurrió un error inesperado",
        variant: "destructive"
      });

      return [];

    } finally {
      setIsGenerating(false);
    }
  }, [table, toast]);

  return {
    isGenerating,
    generateTestData
  };
};

// Función para generar datos de prueba según la tabla
const generateTestDataForTable = (table, count) => {
  const data = [];

  for (let i = 0; i < count; i++) {
    switch (table) {
      case 'users':
        data.push({
          name: `Usuario ${i + 1}`,
          email: `usuario${i + 1}@test.com`,
          userType: ['client', 'provider', 'ngo'][Math.floor(Math.random() * 3)],
          phone: `+54 9 11 ${Math.floor(Math.random() * 9000) + 1000} ${Math.floor(Math.random() * 9000) + 1000}`,
          address: `Dirección ${i + 1}, Buenos Aires`,
          website: `https://usuario${i + 1}.com`,
          bio: `Biografía del usuario ${i + 1}`,
          location: {
            lat: -34.6037 + (Math.random() - 0.5) * 0.1,
            lng: -58.3816 + (Math.random() - 0.5) * 0.1
          },
          searchRadius: Math.floor(Math.random() * 50) + 10
        });
        break;

      case 'briefs':
        data.push({
          title: `Servicio ${i + 1}`,
          description: `Descripción del servicio ${i + 1}`,
          category: ['design', 'development', 'marketing', 'writing', 'translation'][Math.floor(Math.random() * 5)],
          price: Math.floor(Math.random() * 10000) + 1000,
          deliveryTime: `${Math.floor(Math.random() * 30) + 1} días`,
          serviceType: ['online', 'onsite'][Math.floor(Math.random() * 2)],
          type: 'service',
          images: [],
          location: {
            lat: -34.6037 + (Math.random() - 0.5) * 0.1,
            lng: -58.3816 + (Math.random() - 0.5) * 0.1
          },
          radius: Math.floor(Math.random() * 50) + 10,
          priceType: 'total'
        });
        break;

      case 'blog_posts':
        data.push({
          type: 'article',
          title: `Artículo ${i + 1}`,
          description: `Descripción del artículo ${i + 1}`,
          author: `Autor ${i + 1}`,
          date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
          image: null,
          content: `Contenido del artículo ${i + 1}`,
          registered_users: []
        });
        break;

      case 'support_tickets':
        data.push({
          title: `Ticket ${i + 1}`,
          description: `Descripción del ticket ${i + 1}`,
          status: ['open', 'in_progress', 'resolved'][Math.floor(Math.random() * 3)],
          priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
          category: ['general', 'technical', 'billing'][Math.floor(Math.random() * 3)]
        });
        break;

      case 'newsletter_subscribers':
        data.push({
          email: `subscriber${i + 1}@test.com`,
          status: 'active',
          source: 'bulk_import'
        });
        break;

      case 'categories':
        data.push({
          name: `Categoría ${i + 1}`,
          slug: `categoria-${i + 1}`,
          description: `Descripción de la categoría ${i + 1}`
        });
        break;

      case 'reviews':
        data.push({
          rating: Math.floor(Math.random() * 5) + 1,
          comment: `Comentario de la reseña ${i + 1}`
        });
        break;

      default:
        data.push({ id: i + 1, name: `Item ${i + 1}` });
    }
  }

  return data;
};
