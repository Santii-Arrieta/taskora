-- Script simple para arreglar la tabla notifications

-- 1. Verificar la estructura actual de notifications
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'notifications' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Agregar columnas faltantes si no existen
DO $$ 
BEGIN
    -- Verificar si existe la columna created_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'created_at'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.notifications 
        ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Columna created_at agregada';
    ELSE
        RAISE NOTICE 'Columna created_at ya existe';
    END IF;
    
    -- Verificar si existe la columna updated_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'updated_at'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.notifications 
        ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Columna updated_at agregada';
    ELSE
        RAISE NOTICE 'Columna updated_at ya existe';
    END IF;
    
    -- Verificar si existe la columna type
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'type'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.notifications 
        ADD COLUMN type TEXT NOT NULL DEFAULT 'info';
        RAISE NOTICE 'Columna type agregada';
    ELSE
        RAISE NOTICE 'Columna type ya existe';
    END IF;
    
    -- Verificar si existe la columna read
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'read'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.notifications 
        ADD COLUMN read BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Columna read agregada';
    ELSE
        RAISE NOTICE 'Columna read ya existe';
    END IF;
END $$;

-- 3. Crear índices si no existen
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications ("userId");
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications (read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications (created_at);

-- 4. Habilitar RLS si no está habilitado
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 5. Verificar la estructura final
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'notifications' 
AND table_schema = 'public'
ORDER BY ordinal_position;
