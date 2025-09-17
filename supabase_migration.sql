-- =====================================================
-- MIGRACIÓN SIMPLIFICADA PARA SUPABASE
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

-- 2. Crear índices básicos
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_read_status ON messages(read) WHERE read = FALSE;

-- 3. Agregar campos a conversations
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS message_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 4. Crear función para marcar como leído
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

-- 5. Habilitar RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 6. Políticas básicas
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

