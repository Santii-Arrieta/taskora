import React, { useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

const SimpleMigrationPage = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState('');
  const [logs, setLogs] = useState([]);

  const addLog = (message) => {
    setLogs(prev => [...prev, message]);
  };

  const handleMigration = async () => {
    setIsRunning(true);
    setStatus('');
    setLogs([]);
    
    addLog('🚀 Iniciando migración...');
    
    try {
      // Crear tabla messages
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
      
      // Crear índices
      addLog('📊 Creando índices...');
      const { error: indexError } = await supabase.rpc('exec', {
        sql: 'CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);'
      });
      
      if (indexError) {
        addLog('⚠️ Error creando índice: ' + indexError.message);
      } else {
        addLog('✅ Índices creados');
      }
      
      // Agregar campos a conversations
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
      
      // Crear función
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
      
      // Habilitar RLS
      addLog('🔒 Habilitando Row Level Security...');
      const { error: rlsError } = await supabase.rpc('exec', {
        sql: 'ALTER TABLE messages ENABLE ROW LEVEL SECURITY;'
      });
      
      if (rlsError) {
        addLog('⚠️ Error habilitando RLS: ' + rlsError.message);
      } else {
        addLog('✅ Row Level Security habilitado');
      }
      
      setStatus('✅ Migración completada exitosamente!');
      addLog('🎉 ¡Migración completada!');
      
    } catch (error) {
      setStatus('❌ Error: ' + error.message);
      addLog('❌ Error: ' + error.message);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <div style={{ background: 'white', padding: '30px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          🚀 Migración de Base de Datos
        </h1>
        <p style={{ color: '#666', marginBottom: '20px' }}>
          Esta herramienta ejecutará automáticamente la migración de la base de datos para optimizar el sistema de chat.
        </p>
        
        {status && (
          <div style={{ 
            padding: '15px', 
            borderRadius: '5px', 
            margin: '10px 0',
            backgroundColor: status.includes('✅') ? '#d4edda' : '#f8d7da',
            color: status.includes('✅') ? '#155724' : '#721c24',
            border: `1px solid ${status.includes('✅') ? '#c3e6cb' : '#f5c6cb'}`
          }}>
            {status}
          </div>
        )}
        
        <button 
          onClick={handleMigration} 
          disabled={isRunning}
          style={{
            backgroundColor: isRunning ? '#6c757d' : '#007bff',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '5px',
            cursor: isRunning ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            margin: '10px 0'
          }}
        >
          {isRunning ? '⏳ Ejecutando...' : '🔧 Ejecutar Migración'}
        </button>
        
        {logs.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <h3 style={{ marginBottom: '10px' }}>Log de Ejecución</h3>
            <div style={{ 
              backgroundColor: '#f8f9fa', 
              border: '1px solid #dee2e6', 
              borderRadius: '5px', 
              padding: '15px', 
              fontFamily: 'monospace', 
              whiteSpace: 'pre-wrap', 
              maxHeight: '300px', 
              overflowY: 'auto' 
            }}>
              {logs.map((log, index) => (
                <div key={index} style={{ marginBottom: '5px' }}>{log}</div>
              ))}
            </div>
          </div>
        )}
        
        <div style={{ 
          marginTop: '20px', 
          padding: '15px', 
          backgroundColor: '#fff3cd', 
          border: '1px solid #ffeaa7', 
          borderRadius: '5px' 
        }}>
          <h4 style={{ color: '#856404', marginBottom: '10px' }}>⚠️ Instrucciones Importantes:</h4>
          <ul style={{ color: '#856404', fontSize: '14px', margin: 0, paddingLeft: '20px' }}>
            <li>Haz un respaldo de tu base de datos antes de ejecutar la migración</li>
            <li>La migración es segura y no afectará datos existentes</li>
            <li>Después de la migración, el chat funcionará mucho más rápido</li>
            <li>Si hay algún problema, puedes contactar al soporte</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SimpleMigrationPage;

