import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useContract } from '@/contexts/ContractContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { RefreshCw, Eye, Database, AlertCircle, CheckCircle, FileText } from 'lucide-react';

const ContractsDebug = () => {
  const { contracts, createContract } = useContract();
  const { user } = useAuth();
  const [dbContracts, setDbContracts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [testResult, setTestResult] = useState(null);

  const loadContractsFromDB = async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    try {
      console.log('🔍 Cargando contratos directamente de la base de datos...');
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .order('createdAt', { ascending: false });

      if (error) {
        console.error('❌ Error loading contracts from DB:', error);
        setError(error.message);
        return;
      }

      console.log('✅ Contratos cargados de DB:', data);
      setDbContracts(data || []);
    } catch (error) {
      console.error('❌ Error loading contracts:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const testContractCreation = async () => {
    // Generar un UUID válido para briefId
    const generateUUID = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };

    const testOffer = {
      title: 'Test Contract Debug - ' + new Date().toISOString(),
      price: 1,
      providerId: user.id,
      clientId: user.id, // Usando el mismo usuario para prueba
      briefId: null // Sin briefId para ofertas de chat
    };

    try {
      console.log('🧪 Creando contrato de prueba:', testOffer);
      setTestResult('Creando contrato...');
      
      // Verificar saldo antes de crear el contrato
      console.log('💰 Saldo actual del usuario:', user.balance);
      console.log('💰 Garantía actual del usuario:', user.escrow);
      
      if (user.balance < testOffer.price) {
        setTestResult(`❌ Saldo insuficiente. Necesitas $${testOffer.price}, tienes $${user.balance}`);
        return;
      }
      
      const result = await createContract(testOffer);
      console.log('📋 Resultado de creación:', result);
      
      if (result.success) {
        setTestResult('✅ Contrato de prueba creado exitosamente');
        loadContractsFromDB(); // Recargar para ver el nuevo contrato
      } else {
        setTestResult(`❌ Error al crear contrato: ${result.message}`);
        console.error('❌ Error details:', result);
      }
    } catch (error) {
      console.error('❌ Error creating test contract:', error);
      setTestResult(`❌ Error inesperado: ${error.message}`);
      
      // Mostrar más detalles del error
      if (error.details) {
        console.error('❌ Error details:', error.details);
      }
      if (error.hint) {
        console.error('❌ Error hint:', error.hint);
      }
    }
  };

  const testDirectDBInsert = async () => {
    // Generar un UUID válido para briefId
    const generateUUID = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };

    const testContract = {
      title: 'Test Direct DB Insert - ' + new Date().toISOString(),
      price: 1,
      providerId: user.id,
      clientId: user.id,
      briefId: null, // Sin briefId para ofertas de chat
      status: 'active'
    };

    try {
      console.log('🧪 Insertando contrato directamente en DB:', testContract);
      setTestResult('Insertando directamente en DB...');
      
      const { data, error } = await supabase
        .from('contracts')
        .insert([testContract])
        .select();
      
      if (error) {
        console.error('❌ Error insertando en DB:', error);
        setTestResult(`❌ Error DB: ${error.message}`);
        if (error.details) {
          console.error('❌ DB Error details:', error.details);
        }
        if (error.hint) {
          console.error('❌ DB Error hint:', error.hint);
        }
        return;
      }
      
      console.log('✅ Contrato insertado directamente en DB:', data);
      setTestResult('✅ Contrato insertado directamente en DB exitosamente');
      loadContractsFromDB(); // Recargar para ver el nuevo contrato
    } catch (error) {
      console.error('❌ Error inesperado en DB insert:', error);
      setTestResult(`❌ Error inesperado DB: ${error.message}`);
    }
  };

  const checkTransactions = async () => {
    try {
      console.log('🔍 Verificando transacciones del usuario...');
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('userId', user.id)
        .order('createdAt', { ascending: false })
        .limit(10);
      
      if (error) {
        console.error('❌ Error cargando transacciones:', error);
        return;
      }
      
      console.log('💰 Transacciones del usuario:', data);
      alert(`Se encontraron ${data.length} transacciones. Revisa la consola para detalles.`);
    } catch (error) {
      console.error('❌ Error checking transactions:', error);
    }
  };

  useEffect(() => {
    loadContractsFromDB();
  }, [user]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Debug de Contratos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Button onClick={loadContractsFromDB} disabled={isLoading} variant="outline">
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Recargar DB
            </Button>
            <Button onClick={testContractCreation} variant="secondary">
              <FileText className="w-4 h-4 mr-2" />
              Crear Contrato de Prueba
            </Button>
            <Button onClick={testDirectDBInsert} variant="outline">
              <Database className="w-4 h-4 mr-2" />
              Insertar Directo en DB
            </Button>
            <Button onClick={checkTransactions} variant="outline">
              <Database className="w-4 h-4 mr-2" />
              Ver Transacciones
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {testResult && (
            <Alert variant={testResult.includes('✅') ? 'default' : 'destructive'}>
              {testResult.includes('✅') ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <AlertDescription>{testResult}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2">Contratos en Context ({contracts.length})</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {contracts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay contratos en el contexto</p>
                ) : (
                  contracts.map(contract => (
                    <div key={contract.id} className="p-2 border rounded text-xs">
                      <div className="font-medium">{contract.title}</div>
                      <div className="text-muted-foreground">${contract.price} - {contract.status}</div>
                      <div className="text-muted-foreground">
                        {new Date(contract.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Contratos en DB ({dbContracts.length})</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {dbContracts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay contratos en la base de datos</p>
                ) : (
                  dbContracts.map(contract => (
                    <div key={contract.id} className="p-2 border rounded text-xs">
                      <div className="font-medium">{contract.title}</div>
                      <div className="text-muted-foreground">${contract.price} - {contract.status}</div>
                      <div className="text-muted-foreground">
                        {new Date(contract.createdAt).toLocaleString()}
                      </div>
                      <div className="text-muted-foreground">
                        Provider: {contract.providerId} | Client: {contract.clientId}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold mb-2">🔍 Información de Debug:</h4>
            <div className="text-sm space-y-1">
              <p><strong>Usuario ID:</strong> {user?.id}</p>
              <p><strong>Usuario Nombre:</strong> {user?.name}</p>
              <p><strong>Tipo:</strong> {user?.userType}</p>
              <p><strong>Saldo:</strong> ${user?.balance}</p>
              <p><strong>Garantía:</strong> ${user?.escrow}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ContractsDebug;
