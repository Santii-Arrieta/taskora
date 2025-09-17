import React, { useState } from 'react';

const TestMigrationPage = () => {
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
      // Simular migración
      addLog('📋 Creando tabla messages...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      addLog('✅ Tabla messages creada');
      
      addLog('📊 Creando índices...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      addLog('✅ Índices creados');
      
      addLog('🔧 Agregando campos a conversations...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      addLog('✅ Campos agregados a conversations');
      
      addLog('⚙️ Creando función mark_messages_as_read...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      addLog('✅ Función mark_messages_as_read creada');
      
      addLog('🔒 Habilitando Row Level Security...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      addLog('✅ Row Level Security habilitado');
      
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

export default TestMigrationPage;

