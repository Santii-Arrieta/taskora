// =====================================================
// SCRIPT AUTOMATIZADO PARA MIGRACIÓN DE SUPABASE
// =====================================================

import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const supabaseUrl = 'https://lmxcmpksctnqsqwhfkvy.supabase.co';
const supabaseServiceKey = 'YOUR_SERVICE_ROLE_KEY'; // Necesitas obtener esto de Supabase

// Crear cliente con permisos de administrador
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Script de migración SQL
const migrationSQL = `
-- =====================================================
-- MIGRACIÓN OPTIMIZADA PARA SISTEMA DE CHAT
-- =====================================================

-- 1. Crear tabla de mensajes individuales
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

-- 2. Crear índices básicos para rendimiento
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_read_status ON messages(read) WHERE read = FALSE;

-- 3. Agregar campos de optimización a conversations
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS message_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 4. Crear función optimizada para marcar como leído
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

-- 5. Habilitar Row Level Security
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 6. Crear políticas de seguridad
CREATE POLICY "Users can view messages from their conversations" ON messages
    FOR SELECT USING (
        conversation_id IN (
            SELECT id FROM conversations 
            WHERE participants @> jsonb_build_array(jsonb_build_object('id', auth.uid()))
        )
    );

CREATE POLICY "Users can insert messages in their conversations" ON messages
    FOR INSERT WITH CHECK (
        conversation_id IN (
            SELECT id FROM conversations 
            WHERE participants @> jsonb_build_array(jsonb_build_object('id', auth.uid()))
        )
    );

CREATE POLICY "Users can update their own messages" ON messages
    FOR UPDATE USING (sender_id = auth.uid());

-- 7. Migrar mensajes existentes (si los hay)
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
`;

async function executeMigration() {
    try {
        console.log('🚀 Iniciando migración de base de datos...');
        
        // Ejecutar el script SQL
        const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
        
        if (error) {
            console.error('❌ Error en la migración:', error);
            return;
        }
        
        console.log('✅ Migración completada exitosamente!');
        console.log('📊 Datos migrados:', data);
        
        // Verificar que la tabla se creó
        const { data: tables, error: tableError } = await supabase
            .from('information_schema.tables')
            .select('table_name')
            .eq('table_schema', 'public')
            .eq('table_name', 'messages');
        
        if (tableError) {
            console.error('❌ Error verificando tabla:', tableError);
            return;
        }
        
        if (tables && tables.length > 0) {
            console.log('✅ Tabla "messages" creada correctamente');
        } else {
            console.log('⚠️ Tabla "messages" no encontrada');
        }
        
    } catch (err) {
        console.error('❌ Error inesperado:', err);
    }
}

// Ejecutar migración
executeMigration();

