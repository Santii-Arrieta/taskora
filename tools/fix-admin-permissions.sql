-- Script para verificar y arreglar permisos de administradores

-- 1. Verificar la tabla admins
SELECT * FROM public.admins;

-- 2. Verificar usuarios con userType admin
SELECT 
  id,
  name,
  email,
  "userType",
  verified,
  created_at
FROM public.users 
WHERE "userType" = 'admin';

-- 3. Verificar si hay usuarios en admins que no están en users con userType admin
SELECT 
  a.email,
  a.name,
  u."userType" as current_user_type
FROM public.admins a
LEFT JOIN public.users u ON a.email = u.email;

-- 4. Actualizar usuarios que están en admins pero no tienen userType admin
UPDATE public.users 
SET "userType" = 'admin'
WHERE email IN (
  SELECT email FROM public.admins
) 
AND "userType" != 'admin';

-- 5. Crear políticas RLS para que los admins puedan ejecutar las funciones de verificación
DO $$ 
BEGIN
    -- Política para que admins puedan ejecutar approve_verification
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'users' 
        AND policyname = 'Admins can update verification status'
    ) THEN
        CREATE POLICY "Admins can update verification status"
        ON public.users FOR UPDATE
        USING (
          EXISTS (
            SELECT 1 FROM public.users admin_user 
            WHERE admin_user.id = auth.uid() 
            AND admin_user."userType" = 'admin'
          )
        );
    END IF;
    
    -- Política para que admins puedan insertar notificaciones
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'notifications' 
        AND policyname = 'Admins can insert notifications'
    ) THEN
        CREATE POLICY "Admins can insert notifications"
        ON public.notifications FOR INSERT
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.users admin_user 
            WHERE admin_user.id = auth.uid() 
            AND admin_user."userType" = 'admin'
          )
        );
    END IF;
END $$;

-- 6. Verificar que las funciones tienen SECURITY DEFINER (ya deberían tenerlo)
SELECT 
  routine_name, 
  security_type,
  definer_rights
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('approve_verification', 'reject_verification');

-- 7. Crear función para verificar permisos de admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND "userType" = 'admin'
  );
END;
$$;

-- 8. Actualizar las funciones de verificación para usar la función is_admin
CREATE OR REPLACE FUNCTION approve_verification(
  p_user_id UUID,
  p_user_type TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar que el usuario actual es admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;
  
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

CREATE OR REPLACE FUNCTION reject_verification(
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar que el usuario actual es admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;
  
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

-- 9. Comentarios actualizados
COMMENT ON FUNCTION is_admin() 
IS 'Verifica si el usuario actual tiene privilegios de administrador';

COMMENT ON FUNCTION approve_verification(UUID, TEXT) 
IS 'Aprueba la verificación de un usuario. Requiere privilegios de administrador.';

COMMENT ON FUNCTION reject_verification(UUID) 
IS 'Rechaza la verificación de un usuario. Requiere privilegios de administrador.';
