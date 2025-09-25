-- Script corregido para la tabla notifications existente

-- 1. Verificar la estructura actual de notifications
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'notifications' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Agregar columnas faltantes
DO $$ 
BEGIN
    -- Agregar columna message (las funciones la necesitan)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'message'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.notifications 
        ADD COLUMN message TEXT NOT NULL DEFAULT '';
        RAISE NOTICE 'Columna message agregada';
    ELSE
        RAISE NOTICE 'Columna message ya existe';
    END IF;
    
    -- Agregar columna type (las funciones la necesitan)
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
    
    -- Agregar columna updated_at (las funciones la necesitan)
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
END $$;

-- 3. Crear índices si no existen
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications ("userId");
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications (read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications ("createdAt");

-- 4. Habilitar RLS si no está habilitado
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 5. Crear políticas RLS básicas
DO $$ 
BEGIN
    -- Política para SELECT: usuarios pueden ver sus propias notificaciones
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'notifications' 
        AND policyname = 'Users can view own notifications'
    ) THEN
        CREATE POLICY "Users can view own notifications"
        ON public.notifications FOR SELECT
        USING (auth.uid() = "userId");
    END IF;
    
    -- Política para INSERT: usuarios pueden crear sus propias notificaciones
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'notifications' 
        AND policyname = 'Users can insert own notifications'
    ) THEN
        CREATE POLICY "Users can insert own notifications"
        ON public.notifications FOR INSERT
        WITH CHECK (auth.uid() = "userId");
    END IF;
    
    -- Política para UPDATE: usuarios pueden actualizar sus propias notificaciones
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'notifications' 
        AND policyname = 'Users can update own notifications'
    ) THEN
        CREATE POLICY "Users can update own notifications"
        ON public.notifications FOR UPDATE
        USING (auth.uid() = "userId");
    END IF;
    
    -- Política para DELETE: usuarios pueden eliminar sus propias notificaciones
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'notifications' 
        AND policyname = 'Users can delete own notifications'
    ) THEN
        CREATE POLICY "Users can delete own notifications"
        ON public.notifications FOR DELETE
        USING (auth.uid() = "userId");
    END IF;
END $$;

-- 6. Verificar la estructura final
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'notifications' 
AND table_schema = 'public'
ORDER BY ordinal_position;
