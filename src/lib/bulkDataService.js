import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

// Servicio para carga masiva de datos
class BulkDataService {
  constructor() {
    this.batchSize = 50; // Tamaño de lote para procesamiento
    this.maxRetries = 3; // Máximo número de reintentos
    this.retryDelay = 1000; // Delay entre reintentos en ms
  }

  // Función para procesar datos en lotes
  async processBatch(table, data, batchSize = this.batchSize) {
    const results = {
      success: [],
      errors: [],
      total: data.length,
      processed: 0
    };

    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      
      try {
        const { data: insertedData, error } = await supabase
          .from(table)
          .insert(batch)
          .select();

        if (error) {
          // Si hay error en el lote, intentar insertar uno por uno
          for (const item of batch) {
            try {
              const { data: singleData, error: singleError } = await supabase
                .from(table)
                .insert([item])
                .select();

              if (singleError) {
                results.errors.push({
                  data: item,
                  error: singleError.message
                });
              } else {
                results.success.push(singleData[0]);
              }
            } catch (err) {
              results.errors.push({
                data: item,
                error: err.message
              });
            }
          }
        } else {
          results.success.push(...insertedData);
        }

        results.processed += batch.length;

        // Pequeño delay para no sobrecargar la base de datos
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        results.errors.push({
          batch: batch,
          error: error.message
        });
        results.processed += batch.length;
      }
    }

    return results;
  }

  // Función para validar datos antes de insertar
  validateData(data, schema) {
    const errors = [];
    const validData = [];

    data.forEach((item, index) => {
      const itemErrors = [];

      // Validar campos requeridos
      schema.required.forEach(field => {
        if (!item[field] || item[field] === '') {
          itemErrors.push(`Campo requerido: ${field}`);
        }
      });

      // Validar tipos de datos
      Object.entries(schema.types || {}).forEach(([field, type]) => {
        if (item[field] !== undefined && typeof item[field] !== type) {
          itemErrors.push(`Tipo incorrecto para ${field}: esperado ${type}, recibido ${typeof item[field]}`);
        }
      });

      // Validar formatos específicos
      Object.entries(schema.formats || {}).forEach(([field, format]) => {
        if (item[field] && !format.test(item[field])) {
          itemErrors.push(`Formato incorrecto para ${field}`);
        }
      });

      if (itemErrors.length > 0) {
        errors.push({
          index,
          data: item,
          errors: itemErrors
        });
      } else {
        validData.push(item);
      }
    });

    return { validData, errors };
  }

  // Función para transformar datos según el tipo
  transformData(data, type) {
    const now = new Date().toISOString();

    switch (type) {
      case 'users':
        return data.map(item => ({
          name: item.name || '',
          email: item.email || '',
          userType: item.userType || 'client',
          phone: item.phone || null,
          address: item.address || null,
          website: item.website || null,
          bio: item.bio || null,
          location: item.location || null,
          searchRadius: item.searchRadius || 50,
          verificationStatus: 'unverified',
          created_at: now,
          updated_at: now
        }));

      case 'briefs':
        return data.map(item => ({
          title: item.title || '',
          description: item.description || '',
          category: item.category || 'other',
          price: parseFloat(item.price) || 0,
          deliveryTime: item.deliveryTime || '',
          serviceType: item.serviceType || 'online',
          type: item.type || 'service',
          status: 'active',
          userId: item.userId || null,
          images: item.images || [],
          location: item.location || null,
          radius: item.radius || 20,
          priceType: item.priceType || 'total',
          created_at: now,
          updated_at: now
        }));

      case 'blog_posts':
        return data.map(item => ({
          type: item.type || 'article',
          title: item.title || '',
          description: item.description || '',
          author: item.author || 'Equipo Taskora',
          date: item.date || now,
          image: item.image || null,
          content: item.content || '',
          registered_users: item.registered_users || [],
          created_at: now,
          updated_at: now
        }));

      case 'support_tickets':
        return data.map(item => ({
          title: item.title || '',
          description: item.description || '',
          status: item.status || 'open',
          priority: item.priority || 'medium',
          userId: item.userId || null,
          category: item.category || 'general',
          created_at: now,
          updated_at: now
        }));

      case 'newsletter_subscribers':
        return data.map(item => ({
          email: item.email || '',
          status: item.status || 'active',
          subscribed_at: now,
          source: item.source || 'bulk_import'
        }));

      case 'categories':
        return data.map(item => ({
          name: item.name || '',
          slug: item.slug || item.name?.toLowerCase().replace(/\s+/g, '-') || '',
          description: item.description || null,
          created_at: now,
          updated_at: now
        }));

      case 'reviews':
        return data.map(item => ({
          briefId: item.briefId || null,
          reviewerId: item.reviewerId || null,
          revieweeId: item.revieweeId || null,
          rating: parseInt(item.rating) || 5,
          comment: item.comment || '',
          created_at: now,
          updated_at: now
        }));

      default:
        return data;
    }
  }

  // Función principal para carga masiva
  async bulkInsert(table, data, options = {}) {
    const {
      validate = true,
      transform = true,
      batchSize = this.batchSize,
      onProgress = null,
      onComplete = null
    } = options;

    try {
      // Validar datos si es necesario
      let processedData = data;
      let validationErrors = [];

      if (validate) {
        const schema = this.getValidationSchema(table);
        const validation = this.validateData(data, schema);
        processedData = validation.validData;
        validationErrors = validation.errors;

        if (validationErrors.length > 0) {
          console.warn(`Se encontraron ${validationErrors.length} errores de validación`);
        }
      }

      // Transformar datos si es necesario
      if (transform) {
        processedData = this.transformData(processedData, table);
      }

      // Procesar en lotes
      const results = await this.processBatch(table, processedData, batchSize);

      // Llamar callback de progreso
      if (onProgress) {
        onProgress(results);
      }

      // Llamar callback de completado
      if (onComplete) {
        onComplete(results, validationErrors);
      }

      return {
        success: true,
        results,
        validationErrors,
        summary: {
          total: data.length,
          valid: processedData.length,
          inserted: results.success.length,
          errors: results.errors.length,
          validationErrors: validationErrors.length
        }
      };

    } catch (error) {
      console.error('Error en carga masiva:', error);
      return {
        success: false,
        error: error.message,
        results: null
      };
    }
  }

  // Esquemas de validación por tabla
  getValidationSchema(table) {
    const schemas = {
      users: {
        required: ['name', 'email'],
        types: {
          name: 'string',
          email: 'string',
          userType: 'string'
        },
        formats: {
          email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        }
      },
      briefs: {
        required: ['title', 'description'],
        types: {
          title: 'string',
          description: 'string',
          price: 'number'
        }
      },
      blog_posts: {
        required: ['title', 'description'],
        types: {
          title: 'string',
          description: 'string'
        }
      },
      support_tickets: {
        required: ['title', 'description'],
        types: {
          title: 'string',
          description: 'string'
        }
      },
      newsletter_subscribers: {
        required: ['email'],
        types: {
          email: 'string'
        },
        formats: {
          email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        }
      },
      categories: {
        required: ['name'],
        types: {
          name: 'string'
        }
      },
      reviews: {
        required: ['rating'],
        types: {
          rating: 'number'
        }
      }
    };

    return schemas[table] || { required: [], types: {}, formats: {} };
  }

  // Función para exportar datos a CSV
  async exportToCSV(table, data, filename) {
    if (!data || data.length === 0) {
      throw new Error('No hay datos para exportar');
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          if (value === null || value === undefined) return '';
          if (typeof value === 'object') return JSON.stringify(value);
          return `"${String(value).replace(/"/g, '""')}"`;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename || `${table}_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  // Función para importar datos desde CSV
  async importFromCSV(file, table) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const csv = e.target.result;
          const lines = csv.split('\n');
          const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
          
          const data = lines.slice(1)
            .filter(line => line.trim())
            .map(line => {
              const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
              const obj = {};
              headers.forEach((header, index) => {
                obj[header] = values[index] || '';
              });
              return obj;
            });

          resolve(data);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Error al leer el archivo'));
      reader.readAsText(file);
    });
  }
}

export default new BulkDataService();
