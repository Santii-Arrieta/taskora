-- =====================================================
-- OPTIMIZACIÓN DE BASE DE DATOS PARA SISTEMA DE CHAT
-- =====================================================

-- 1. CREAR TABLA SEPARADA PARA MENSAJES INDIVIDUALES
-- Esto mejora significativamente el rendimiento al evitar actualizar arrays grandes
CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content JSONB NOT NULL,
    type TEXT DEFAULT 'text' CHECK (type IN ('text', 'image', 'file', 'offer')),
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. CREAR ÍNDICES OPTIMIZADOS PARA CONSULTAS RÁPIDAS
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_read_status ON messages(read) WHERE read = FALSE;
CREATE INDEX IF NOT EXISTS idx_messages_conversation_read ON messages(conversation_id, read) WHERE read = FALSE;

-- 3. AGREGAR CAMPOS DE OPTIMIZACIÓN A LA TABLA CONVERSATIONS
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS message_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 4. CREAR ÍNDICES PARA CONVERSATIONS
CREATE INDEX IF NOT EXISTS idx_conversations_participants ON conversations USING GIN(participants);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(lastMessage->>'timestamp' DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);

-- 5. CREAR FUNCIÓN PARA ACTUALIZAR CONTADOR DE MENSAJES
CREATE OR REPLACE FUNCTION update_message_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE conversations 
        SET message_count = message_count + 1,
            updated_at = NOW()
        WHERE id = NEW.conversation_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE conversations 
        SET message_count = GREATEST(message_count - 1, 0),
            updated_at = NOW()
        WHERE id = OLD.conversation_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 6. CREAR TRIGGER PARA ACTUALIZAR CONTADOR AUTOMÁTICAMENTE
DROP TRIGGER IF EXISTS trigger_update_message_count ON messages;
CREATE TRIGGER trigger_update_message_count
    AFTER INSERT OR DELETE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_message_count();

-- 7. CREAR FUNCIÓN PARA MARCAR MENSAJES COMO LEÍDOS DE FORMA EFICIENTE
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
    
    -- Actualizar timestamp de última lectura
    UPDATE conversations 
    SET last_read_at = NOW(), updated_at = NOW()
    WHERE id = p_conversation_id;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. CREAR FUNCIÓN PARA OBTENER MENSAJES CON PAGINACIÓN
CREATE OR REPLACE FUNCTION get_conversation_messages(
    p_conversation_id TEXT,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    sender_id UUID,
    content JSONB,
    type TEXT,
    read BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT m.id, m.sender_id, m.content, m.type, m.read, m.created_at
    FROM messages m
    WHERE m.conversation_id = p_conversation_id
    ORDER BY m.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. MIGRAR DATOS EXISTENTES (si hay mensajes en conversations.messages)
-- Esta función migra mensajes existentes a la nueva tabla
CREATE OR REPLACE FUNCTION migrate_existing_messages()
RETURNS INTEGER AS $$
DECLARE
    conv_record RECORD;
    msg_record JSONB;
    migrated_count INTEGER := 0;
BEGIN
    -- Solo migrar si la tabla messages está vacía
    IF (SELECT COUNT(*) FROM messages) = 0 THEN
        FOR conv_record IN 
            SELECT id, messages, participants 
            FROM conversations 
            WHERE messages IS NOT NULL AND jsonb_array_length(messages) > 0
        LOOP
            -- Insertar cada mensaje en la nueva tabla
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
        
        -- Actualizar contadores de mensajes
        UPDATE conversations 
        SET message_count = (
            SELECT COUNT(*) 
            FROM messages 
            WHERE conversation_id = conversations.id
        );
    END IF;
    
    RETURN migrated_count;
END;
$$ LANGUAGE plpgsql;

-- 10. POLÍTICAS DE SEGURIDAD (RLS)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Política para que los usuarios solo vean mensajes de sus conversaciones
CREATE POLICY "Users can view messages from their conversations" ON messages
    FOR SELECT USING (
        conversation_id IN (
            SELECT id FROM conversations 
            WHERE participants @> jsonb_build_array(jsonb_build_object('id', auth.uid()))
        )
    );

-- Política para que los usuarios puedan insertar mensajes en sus conversaciones
CREATE POLICY "Users can insert messages in their conversations" ON messages
    FOR INSERT WITH CHECK (
        conversation_id IN (
            SELECT id FROM conversations 
            WHERE participants @> jsonb_build_array(jsonb_build_object('id', auth.uid()))
        )
    );

-- Política para que los usuarios puedan actualizar mensajes que enviaron
CREATE POLICY "Users can update their own messages" ON messages
    FOR UPDATE USING (sender_id = auth.uid());

-- 11. COMENTARIOS PARA DOCUMENTACIÓN
COMMENT ON TABLE messages IS 'Tabla optimizada para almacenar mensajes individuales del chat';
COMMENT ON COLUMN messages.conversation_id IS 'ID de la conversación a la que pertenece el mensaje';
COMMENT ON COLUMN messages.content IS 'Contenido del mensaje en formato JSONB';
COMMENT ON COLUMN messages.type IS 'Tipo de mensaje: text, image, file, offer';
COMMENT ON COLUMN messages.read IS 'Estado de lectura del mensaje';
COMMENT ON FUNCTION mark_messages_as_read IS 'Función optimizada para marcar mensajes como leídos';
COMMENT ON FUNCTION get_conversation_messages IS 'Función para obtener mensajes con paginación';

-- 12. EJECUTAR MIGRACIÓN DE DATOS EXISTENTES
SELECT migrate_existing_messages();

-- 13. LIMPIAR FUNCIÓN DE MIGRACIÓN (ya no es necesaria)
DROP FUNCTION IF EXISTS migrate_existing_messages();

