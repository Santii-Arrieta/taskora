-- Script para crear las funciones de verificación y arreglar el problema de notifications

-- 1. Verificar la estructura de la tabla notifications
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'notifications' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Si la tabla notifications no existe, crearla
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "userId" UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info', -- 'info', 'success', 'warning', 'error'
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.1. Si la tabla ya existe pero le faltan columnas, agregarlas
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
    END IF;
END $$;

-- 3. Crear índices para notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications ("userId");
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications (read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications (created_at);

-- 4. Crear políticas RLS para notifications
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

-- 5. Habilitar RLS en notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 6. Función para aprobar verificación
CREATE OR REPLACE FUNCTION approve_verification(
  p_user_id UUID,
  p_user_type TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Actualizar el usuario como verificado
  UPDATE public.users 
  SET 
    verified = TRUE,
    verificationStatus = 'verified',
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Crear notificación para el usuario
  INSERT INTO public.notifications (
    "userId",
    title,
    message,
    type
  ) VALUES (
    p_user_id,
    '¡Verificación Aprobada!',
    'Tu solicitud de verificación ha sido aprobada. Ya puedes acceder a todas las funcionalidades de la plataforma.',
    'success'
  );
  
  -- Si es necesario, actualizar el userType
  IF p_user_type = 'provider' AND EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = p_user_id AND "userType" = 'client'
  ) THEN
    UPDATE public.users 
    SET "userType" = 'provider'
    WHERE id = p_user_id;
  END IF;
END;
$$;

-- 7. Función para rechazar verificación
CREATE OR REPLACE FUNCTION reject_verification(
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Actualizar el usuario como rechazado
  UPDATE public.users 
  SET 
    verified = FALSE,
    verificationStatus = 'rejected',
    verificationDocs = NULL,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Crear notificación para el usuario
  INSERT INTO public.notifications (
    "userId",
    title,
    message,
    type
  ) VALUES (
    p_user_id,
    'Verificación Rechazada',
    'Tu solicitud de verificación ha sido rechazada. Puedes volver a enviar tu documentación desde tu perfil.',
    'warning'
  );
END;
$$;

-- 8. Comentarios para las funciones
COMMENT ON FUNCTION approve_verification(UUID, TEXT) 
IS 'Aprueba la verificación de un usuario y envía notificación';

COMMENT ON FUNCTION reject_verification(UUID) 
IS 'Rechaza la verificación de un usuario y envía notificación';

-- 9. Verificar que las funciones se crearon correctamente
SELECT 
  routine_name, 
  routine_type, 
  data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('approve_verification', 'reject_verification');
