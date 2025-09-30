import React, { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Upload, 
  Download, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Loader2,
  Database,
  Users,
  Briefcase,
  BookOpen,
  MessageSquare,
  Mail,
  Tag,
  Star
} from 'lucide-react';
import { useBulkData, useCSVImport, useCSVExport, useTestDataGenerator } from '@/hooks/useBulkData';
import { useToast } from '@/components/ui/use-toast';

const BulkDataManager = ({ 
  table, 
  title, 
  description, 
  icon: Icon = Database,
  onComplete,
  className 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [testDataCount, setTestDataCount] = useState(100);
  const fileInputRef = useRef(null);
  const { toast } = useToast();

  // Hooks para diferentes operaciones
  const { 
    isLoading: isBulkLoading, 
    progress, 
    results, 
    errors, 
    validationErrors, 
    bulkInsert, 
    cancel, 
    reset 
  } = useBulkData(table);

  const { 
    isImporting, 
    importProgress, 
    importResults, 
    importFromCSV 
  } = useCSVImport(table);

  const { 
    isExporting, 
    exportToCSV 
  } = useCSVExport(table);

  const { 
    isGenerating, 
    generateTestData 
  } = useTestDataGenerator(table);

  // Manejar selección de archivo
  const handleFileSelect = useCallback((event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        setSelectedFile(file);
      } else {
        toast({
          title: "Error",
          description: "Por favor selecciona un archivo CSV válido",
          variant: "destructive"
        });
      }
    }
  }, [toast]);

  // Manejar importación CSV
  const handleCSVImport = useCallback(async () => {
    if (!selectedFile) {
      toast({
        title: "Error",
        description: "Por favor selecciona un archivo CSV",
        variant: "destructive"
      });
      return;
    }

    const result = await importFromCSV(selectedFile);
    if (result.success && onComplete) {
      onComplete(result);
    }
  }, [selectedFile, importFromCSV, onComplete, toast]);

  // Manejar generación de datos de prueba
  const handleGenerateTestData = useCallback(async () => {
    const testData = await generateTestData(testDataCount);
    if (testData.length > 0) {
      const result = await bulkInsert(testData);
      if (result.success && onComplete) {
        onComplete(result);
      }
    }
  }, [testDataCount, generateTestData, bulkInsert, onComplete]);

  // Manejar exportación
  const handleExport = useCallback(async () => {
    // Aquí necesitarías obtener los datos actuales de la tabla
    // Por simplicidad, exportamos datos de ejemplo
    const sampleData = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      name: `Ejemplo ${i + 1}`,
      created_at: new Date().toISOString()
    }));

    await exportToCSV(sampleData, `${table}_export_${new Date().toISOString().split('T')[0]}.csv`);
  }, [table, exportToCSV]);

  // Limpiar estado al cerrar
  const handleClose = useCallback(() => {
    setIsOpen(false);
    setSelectedFile(null);
    reset();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [reset]);

  // Obtener estadísticas de resultados
  const getResultsStats = () => {
    if (!results) return null;

    return {
      total: results.total || 0,
      success: results.success?.length || 0,
      errors: results.errors?.length || 0,
      validationErrors: validationErrors?.length || 0
    };
  };

  const stats = getResultsStats();

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className={className}>
          <Icon className="w-4 h-4 mr-2" />
          Carga Masiva
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="w-5 h-5" />
            {title || `Carga Masiva - ${table}`}
          </DialogTitle>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </DialogHeader>

        <Tabs defaultValue="import" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="import">Importar CSV</TabsTrigger>
            <TabsTrigger value="generate">Generar Datos</TabsTrigger>
            <TabsTrigger value="export">Exportar</TabsTrigger>
          </TabsList>

          {/* Tab de Importación CSV */}
          <TabsContent value="import" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Importar desde CSV
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="csv-file">Seleccionar archivo CSV</Label>
                  <Input
                    id="csv-file"
                    type="file"
                    accept=".csv"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    disabled={isImporting}
                  />
                  {selectedFile && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="w-4 h-4" />
                      {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </div>
                  )}
                </div>

                {isImporting && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Importando...</span>
                      <span>{Math.round(importProgress)}%</span>
                    </div>
                    <Progress value={importProgress} className="w-full" />
                  </div>
                )}

                <div className="flex gap-2">
                  <Button 
                    onClick={handleCSVImport}
                    disabled={!selectedFile || isImporting}
                    className="flex-1"
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Importando...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Importar
                      </>
                    )}
                  </Button>
                  
                  {isImporting && (
                    <Button variant="outline" onClick={cancel}>
                      Cancelar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab de Generación de Datos */}
          <TabsContent value="generate" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  Generar Datos de Prueba
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="test-count">Cantidad de registros</Label>
                  <Input
                    id="test-count"
                    type="number"
                    min="1"
                    max="10000"
                    value={testDataCount}
                    onChange={(e) => setTestDataCount(parseInt(e.target.value) || 100)}
                    disabled={isGenerating || isBulkLoading}
                  />
                </div>

                {isBulkLoading && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Generando y cargando...</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="w-full" />
                  </div>
                )}

                <div className="flex gap-2">
                  <Button 
                    onClick={handleGenerateTestData}
                    disabled={isGenerating || isBulkLoading}
                    className="flex-1"
                  >
                    {isGenerating || isBulkLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generando...
                      </>
                    ) : (
                      <>
                        <Database className="w-4 h-4 mr-2" />
                        Generar y Cargar
                      </>
                    )}
                  </Button>
                  
                  {(isGenerating || isBulkLoading) && (
                    <Button variant="outline" onClick={cancel}>
                      Cancelar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab de Exportación */}
          <TabsContent value="export" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Exportar a CSV
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Exporta los datos actuales de la tabla a un archivo CSV.
                </p>

                <Button 
                  onClick={handleExport}
                  disabled={isExporting}
                  className="w-full"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Exportando...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Exportar CSV
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Resultados */}
        {stats && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Resultados
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                  <div className="text-sm text-muted-foreground">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.success}</div>
                  <div className="text-sm text-muted-foreground">Exitosos</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{stats.errors}</div>
                  <div className="text-sm text-muted-foreground">Errores</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{stats.validationErrors}</div>
                  <div className="text-sm text-muted-foreground">Validación</div>
                </div>
              </div>

              {/* Errores de validación */}
              {validationErrors.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-medium">Errores de validación encontrados:</p>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {validationErrors.slice(0, 5).map((error, index) => (
                          <div key={index} className="text-sm">
                            <Badge variant="outline" className="mr-2">
                              Fila {error.index + 1}
                            </Badge>
                            {error.errors.join(', ')}
                          </div>
                        ))}
                        {validationErrors.length > 5 && (
                          <p className="text-sm text-muted-foreground">
                            ... y {validationErrors.length - 5} más
                          </p>
                        )}
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Errores de inserción */}
              {errors.length > 0 && (
                <Alert>
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-medium">Errores de inserción:</p>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {errors.slice(0, 5).map((error, index) => (
                          <div key={index} className="text-sm">
                            {error.message || error.error}
                          </div>
                        ))}
                        {errors.length > 5 && (
                          <p className="text-sm text-muted-foreground">
                            ... y {errors.length - 5} más
                          </p>
                        )}
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* Botones de acción */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Componentes específicos para cada tabla
export const UsersBulkManager = (props) => (
  <BulkDataManager
    table="users"
    title="Carga Masiva de Usuarios"
    description="Importa usuarios desde CSV o genera datos de prueba"
    icon={Users}
    {...props}
  />
);

export const BriefsBulkManager = (props) => (
  <BulkDataManager
    table="briefs"
    title="Carga Masiva de Servicios"
    description="Importa servicios desde CSV o genera datos de prueba"
    icon={Briefcase}
    {...props}
  />
);

export const BlogBulkManager = (props) => (
  <BulkDataManager
    table="blog_posts"
    title="Carga Masiva de Blog"
    description="Importa artículos desde CSV o genera datos de prueba"
    icon={BookOpen}
    {...props}
  />
);

export const SupportBulkManager = (props) => (
  <BulkDataManager
    table="support_tickets"
    title="Carga Masiva de Tickets"
    description="Importa tickets desde CSV o genera datos de prueba"
    icon={MessageSquare}
    {...props}
  />
);

export const NewsletterBulkManager = (props) => (
  <BulkDataManager
    table="newsletter_subscribers"
    title="Carga Masiva de Suscriptores"
    description="Importa suscriptores desde CSV o genera datos de prueba"
    icon={Mail}
    {...props}
  />
);

export const CategoriesBulkManager = (props) => (
  <BulkDataManager
    table="categories"
    title="Carga Masiva de Categorías"
    description="Importa categorías desde CSV o genera datos de prueba"
    icon={Tag}
    {...props}
  />
);

export const ReviewsBulkManager = (props) => (
  <BulkDataManager
    table="reviews"
    title="Carga Masiva de Reseñas"
    description="Importa reseñas desde CSV o genera datos de prueba"
    icon={Star}
    {...props}
  />
);

export default BulkDataManager;
