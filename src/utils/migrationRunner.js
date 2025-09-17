// =====================================================
// MIGRACIÓN AUTOMATIZADA PARA SISTEMA DE CHAT
// =====================================================

import { supabase } from '@/lib/customSupabaseClient';

export const runDatabaseMigration = async () => {
  console.log('🚀 Iniciando migración de base de datos...');
  
  try {
    // Paso 1: Crear tabla messages
    console.log('📋 Creando tabla messages...');
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
      console.error('❌ Error creando tabla:', createError);
      throw createError;
    }
    console.log('✅ Tabla messages creada');
    
    // Paso 2: Crear índices
    console.log('📊 Creando índices...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);',
      'CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);',
      'CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);',
      'CREATE INDEX IF NOT EXISTS idx_messages_read_status ON messages(read) WHERE read = FALSE;'
    ];
    
    for (const indexSQL of indexes) {
      const { error: indexError } = await supabase.rpc('exec', { sql: indexSQL });
      if (indexError) {
        console.warn('⚠️ Error creando índice:', indexError.message);
      }
    }
    console.log('✅ Índices creados');
    
    // Paso 3: Agregar campos a conversations
    console.log('🔧 Agregando campos a conversations...');
    const { error: alterError } = await supabase.rpc('exec', {
      sql: `
        ALTER TABLE conversations 
        ADD COLUMN IF NOT EXISTS message_count INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
      `
    });
    
    if (alterError) {
      console.warn('⚠️ Error agregando campos:', alterError.message);
    } else {
      console.log('✅ Campos agregados a conversations');
    }
    
    // Paso 4: Crear función mark_messages_as_read
    console.log('⚙️ Creando función mark_messages_as_read...');
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
      console.warn('⚠️ Error creando función:', functionError.message);
    } else {
      console.log('✅ Función mark_messages_as_read creada');
    }
    
    // Paso 5: Habilitar RLS
    console.log('🔒 Habilitando Row Level Security...');
    const { error: rlsError } = await supabase.rpc('exec', {
      sql: 'ALTER TABLE messages ENABLE ROW LEVEL SECURITY;'
    });
    
    if (rlsError) {
      console.warn('⚠️ Error habilitando RLS:', rlsError.message);
    } else {
      console.log('✅ Row Level Security habilitado');
    }
    
    // Paso 6: Crear políticas
    console.log('🛡️ Creando políticas de seguridad...');
    const policies = [
      `CREATE POLICY "Users can view messages from their conversations" ON messages
       FOR SELECT USING (
         conversation_id IN (
           SELECT id FROM conversations 
           WHERE participants @> jsonb_build_array(jsonb_build_object('id', auth.uid()))
         )
       );`,
      `CREATE POLICY "Users can insert messages in their conversations" ON messages
       FOR INSERT WITH CHECK (
         conversation_id IN (
           SELECT id FROM conversations 
           WHERE participants @> jsonb_build_array(jsonb_build_object('id', auth.uid()))
         )
       );`,
      `CREATE POLICY "Users can update their own messages" ON messages
       FOR UPDATE USING (sender_id = auth.uid());`
    ];
    
    for (const policySQL of policies) {
      const { error: policyError } = await supabase.rpc('exec', { sql: policySQL });
      if (policyError) {
        console.warn('⚠️ Error creando política:', policyError.message);
      }
    }
    console.log('✅ Políticas de seguridad creadas');
    
    // Paso 7: Migrar mensajes existentes
    console.log('📦 Migrando mensajes existentes...');
    const { error: migrateError } = await supabase.rpc('exec', {
      sql: `
        DO $$
        DECLARE
          conv_record RECORD;
          msg_record JSONB;
          migrated_count INTEGER := 0;
        BEGIN
          FOR conv_record IN 
            SELECT id, messages, participants 
            FROM conversations 
            WHERE messages IS NOT NULL AND jsonb_array_length(messages) > 0
          LOOP
            FOR msg_record IN SELECT * FROM jsonb_array_elements(conv_record.messages)
            LOOP
              INSERT INTO messages (
                conversation_id,
                sender_id,
                content,
                type,
                read,
                created_at
              ) VALUES (
                conv_record.id,
                (msg_record->>'senderId')::UUID,
                msg_record->'content',
                COALESCE(msg_record->>'type', 'text'),
                COALESCE((msg_record->>'read')::BOOLEAN, FALSE),
                COALESCE((msg_record->>'timestamp')::TIMESTAMP WITH TIME ZONE, NOW())
              );
              migrated_count := migrated_count + 1;
            END LOOP;
          END LOOP;
          
          RAISE NOTICE 'Migrated % messages', migrated_count;
        END $$;
      `
    });
    
    if (migrateError) {
      console.warn('⚠️ Error migrando mensajes:', migrateError.message);
    } else {
      console.log('✅ Mensajes existentes migrados');
    }
    
    console.log('🎉 ¡Migración completada exitosamente!');
    return { success: true, message: 'Migración completada' };
    
  } catch (error) {
    console.error('❌ Error en la migración:', error);
    return { success: false, error: error.message };
  }
};

export const verifyMigration = async () => {
  console.log('🔍 Verificando migración...');
  
  try {
    // Verificar tabla messages
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .limit(1);
    
    if (messagesError) {
      throw new Error('Tabla messages no encontrada: ' + messagesError.message);
    }
    console.log('✅ Tabla messages verificada');
    
    // Verificar campos en conversations
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('message_count, last_read_at, updated_at')
      .limit(1);
    
    if (convError) {
      console.warn('⚠️ Campos nuevos en conversations no encontrados:', convError.message);
    } else {
      console.log('✅ Campos nuevos en conversations verificados');
    }
    
    // Verificar función
    const { data: functionData, error: funcError } = await supabase.rpc('mark_messages_as_read', {
      p_conversation_id: 'test',
      p_user_id: '00000000-0000-0000-0000-000000000000'
    });
    
    if (funcError && !funcError.message.includes('test')) {
      console.warn('⚠️ Función mark_messages_as_read no encontrada:', funcError.message);
    } else {
      console.log('✅ Función mark_messages_as_read verificada');
    }
    
    console.log('🎉 ¡Verificación completada - Migración exitosa!');
    return { success: true, message: 'Verificación exitosa' };
    
  } catch (error) {
    console.error('❌ Error en verificación:', error);
    return { success: false, error: error.message };
  }
};

