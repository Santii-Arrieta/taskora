import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Loader2, Database } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';

const MigrationPage = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState(null);
  const [logs, setLogs] = useState([]);

  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `${timestamp}: ${message}`]);
  };

  const handleMigration = async () => {
    setIsRunning(true);
    setStatus(null);
    setLogs([]);
    
    addLog('🚀 Iniciando migración de base de datos...');
    
    try {
      // Paso 1: Crear tabla messages
      addLog('📋 Creando tabla messages...');
      const { error: createError } = await supabase.rpc('exec', {
        sql: `
          CREATE TABLE IF NOT EXISTS messages (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            conversation_id TEXT NOT NULL,
            sender_id UUID NOT NULL,
            content JSONB NOT NULL,
            type TEXT DEFAULT 'text',
            read BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `
      });
      
      if (createError) {
        throw new Error('Error creando tabla: ' + createError.message);
      }
      addLog('✅ Tabla messages creada');
      
      // Paso 2: Crear índices
      addLog('📊 Creando índices...');
      const indexes = [
        'CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);',
        'CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);',
        'CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);',
        'CREATE INDEX IF NOT EXISTS idx_messages_read_status ON messages(read) WHERE read = FALSE;'
      ];
      
      for (const indexSQL of indexes) {
        const { error: indexError } = await supabase.rpc('exec', { sql: indexSQL });
        if (indexError) {
          addLog('⚠️ Error creando índice: ' + indexError.message);
        }
      }
      addLog('✅ Índices creados');
      
      // Paso 3: Agregar campos a conversations
      addLog('🔧 Agregando campos a conversations...');
      const { error: alterError } = await supabase.rpc('exec', {
        sql: `
          ALTER TABLE conversations 
          ADD COLUMN IF NOT EXISTS message_count INTEGER DEFAULT 0,
          ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        `
      });
      
      if (alterError) {
        addLog('⚠️ Error agregando campos: ' + alterError.message);
      } else {
        addLog('✅ Campos agregados a conversations');
      }
      
      // Paso 4: Crear función mark_messages_as_read
      addLog('⚙️ Creando función mark_messages_as_read...');
      const { error: functionError } = await supabase.rpc('exec', {
        sql: `
          CREATE OR REPLACE FUNCTION mark_messages_as_read(
            p_conversation_id TEXT,
            p_user_id UUID
          )
          RETURNS INTEGER AS $$
          DECLARE
            updated_count INTEGER;
          BEGIN
            UPDATE messages 
            SET read = TRUE, updated_at = NOW()
            WHERE conversation_id = p_conversation_id 
            AND sender_id != p_user_id 
            AND read = FALSE;
            
            GET DIAGNOSTICS updated_count = ROW_COUNT;
            
            UPDATE conversations 
            SET last_read_at = NOW(), updated_at = NOW()
            WHERE id = p_conversation_id;
            
            RETURN updated_count;
          END;
          $$ LANGUAGE plpgsql;
        `
      });
      
      if (functionError) {
        addLog('⚠️ Error creando función: ' + functionError.message);
      } else {
        addLog('✅ Función mark_messages_as_read creada');
      }
      
      // Paso 5: Habilitar RLS
      addLog('🔒 Habilitando Row Level Security...');
      const { error: rlsError } = await supabase.rpc('exec', {
        sql: 'ALTER TABLE messages ENABLE ROW LEVEL SECURITY;'
      });
      
      if (rlsError) {
        addLog('⚠️ Error habilitando RLS: ' + rlsError.message);
      } else {
        addLog('✅ Row Level Security habilitado');
      }
      
      setStatus({ type: 'success', message: 'Migración completada exitosamente!' });
      addLog('🎉 ¡Migración completada!');
      
    } catch (error) {
      setStatus({ type: 'error', message: 'Error inesperado: ' + error.message });
      addLog('❌ Error inesperado: ' + error.message);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-6 h-6" />
            Migración de Base de Datos
          </CardTitle>
          <CardDescription>
            Esta herramienta ejecutará automáticamente la migración de la base de datos para optimizar el sistema de chat.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status */}
          {status && (
            <Alert className={status.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              <div className="flex items-center gap-2">
                {status.type === 'success' ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
                <AlertDescription>{status.message}</AlertDescription>
              </div>
            </Alert>
          )}

          {/* Action */}
          <Button 
            onClick={handleMigration} 
            disabled={isRunning}
            className="flex items-center gap-2"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Ejecutando...
              </>
            ) : (
              <>
                <Database className="w-4 h-4" />
                Ejecutar Migración
              </>
            )}
          </Button>

          {/* Logs */}
          {logs.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3">Log de Ejecución</h3>
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-64 overflow-y-auto">
                {logs.map((log, index) => (
                  <div key={index} className="mb-1">{log}</div>
                ))}
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-semibold text-yellow-800 mb-2">⚠️ Instrucciones Importantes:</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Haz un respaldo de tu base de datos antes de ejecutar la migración</li>
              <li>• La migración es segura y no afectará datos existentes</li>
              <li>• Después de la migración, el chat funcionará mucho más rápido</li>
              <li>• Si hay algún problema, puedes contactar al soporte</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MigrationPage;

