import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  DollarSign, 
  Users, 
  Calendar,
  Loader2
} from 'lucide-react';

const DuplicatePaymentsManager = () => {
  const [duplicates, setDuplicates] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stats, setStats] = useState(null);
  const { toast } = useToast();

  // Cargar contratos duplicados
  const loadDuplicates = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('find_duplicate_contracts');
      
      if (error) {
        console.error('Error loading duplicates:', error);
        toast({
          title: "Error",
          description: "Error al cargar contratos duplicados",
          variant: "destructive"
        });
        return;
      }

      setDuplicates(data || []);
      
      // Calcular estadísticas
      const totalRefund = data?.reduce((sum, dup) => sum + (dup.price || 0), 0) || 0;
      const uniqueGroups = new Set(data?.map(dup => `${dup.title}-${dup.provider_id}-${dup.client_id}`) || []).size;
      
      setStats({
        totalDuplicates: data?.length || 0,
        uniqueGroups,
        totalRefund
      });

    } catch (error) {
      console.error('Error loading duplicates:', error);
      toast({
        title: "Error",
        description: "Error inesperado al cargar datos",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Procesar todos los reembolsos
  const processAllRefunds = async () => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.rpc('process_duplicate_refunds');
      
      if (error) {
        console.error('Error processing refunds:', error);
        toast({
          title: "Error",
          description: "Error al procesar reembolsos",
          variant: "destructive"
        });
        return;
      }

      if (data.success) {
        toast({
          title: "Reembolsos procesados",
          description: `${data.processed_count} reembolsos procesados exitosamente. Total reembolsado: $${data.total_refunded}`,
          variant: "default"
        });
        
        // Recargar datos
        await loadDuplicates();
      } else {
        toast({
          title: "Error",
          description: data.message || "Error al procesar reembolsos",
          variant: "destructive"
        });
      }

    } catch (error) {
      console.error('Error processing refunds:', error);
      toast({
        title: "Error",
        description: "Error inesperado al procesar reembolsos",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Reembolsar un contrato específico
  const refundSingleContract = async (contractId, title) => {
    try {
      const { data, error } = await supabase.rpc('refund_duplicate_payment', {
        p_contract_id: contractId,
        p_reason: 'Reembolso manual por duplicado'
      });
      
      if (error) {
        console.error('Error refunding contract:', error);
        toast({
          title: "Error",
          description: "Error al reembolsar contrato",
          variant: "destructive"
        });
        return;
      }

      if (data.success) {
        toast({
          title: "Reembolso exitoso",
          description: `Reembolsado $${data.refunded_amount} por "${title}"`,
          variant: "default"
        });
        
        // Recargar datos
        await loadDuplicates();
      } else {
        toast({
          title: "Error",
          description: data.message || "Error al reembolsar",
          variant: "destructive"
        });
      }

    } catch (error) {
      console.error('Error refunding contract:', error);
      toast({
        title: "Error",
        description: "Error inesperado al reembolsar",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    loadDuplicates();
  }, []);

  // Agrupar duplicados por título, proveedor y cliente
  const groupedDuplicates = duplicates.reduce((groups, dup) => {
    const key = `${dup.title}-${dup.provider_id}-${dup.client_id}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(dup);
    return groups;
  }, {});

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Gestión de Pagos Duplicados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Estadísticas */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{stats.totalDuplicates}</div>
                <div className="text-sm text-red-600">Contratos Duplicados</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{stats.uniqueGroups}</div>
                <div className="text-sm text-orange-600">Grupos Únicos</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">${stats.totalRefund}</div>
                <div className="text-sm text-green-600">Total a Reembolsar</div>
              </div>
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex gap-2">
            <Button 
              onClick={loadDuplicates} 
              disabled={isLoading}
              variant="outline"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cargando...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Actualizar
                </>
              )}
            </Button>
            
            {duplicates.length > 0 && (
              <Button 
                onClick={processAllRefunds} 
                disabled={isProcessing}
                className="bg-red-600 hover:bg-red-700"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <DollarSign className="w-4 h-4 mr-2" />
                    Reembolsar Todos
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Alerta si hay duplicados */}
          {duplicates.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Se encontraron {duplicates.length} contratos duplicados que requieren reembolso. 
                Se mantendrá el primer contrato y se reembolsarán los duplicados.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Lista de duplicados */}
      {Object.keys(groupedDuplicates).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Contratos Duplicados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(groupedDuplicates).map(([key, group]) => (
                <div key={key} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold">{group[0].title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {group.length} contratos duplicados
                      </p>
                    </div>
                    <Badge variant="destructive">
                      ${group.reduce((sum, dup) => sum + (dup.price || 0), 0)} total
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    {group.map((contract, index) => (
                      <div 
                        key={contract.contract_id}
                        className={`flex items-center justify-between p-3 rounded ${
                          index === 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {index === 0 ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-red-600" />
                          )}
                          <div>
                            <p className="text-sm font-medium">
                              {index === 0 ? 'Contrato Principal' : 'Duplicado'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(contract.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">${contract.price}</span>
                          {index > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => refundSingleContract(contract.contract_id, contract.title)}
                              className="text-red-600 border-red-300 hover:bg-red-50"
                            >
                              Reembolsar
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mensaje si no hay duplicados */}
      {duplicates.length === 0 && !isLoading && (
        <Card>
          <CardContent className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay pagos duplicados</h3>
            <p className="text-muted-foreground">
              Todos los contratos están en orden. No se encontraron pagos duplicados.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DuplicatePaymentsManager;
