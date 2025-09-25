-- Script final para crear las funciones de verificación

-- 1. Función para verificar permisos de admin
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

-- 2. Función para aprobar verificación
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
    "verificationStatus" = 'verified',
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Crear notificación para el usuario (solo si la tabla notifications tiene las columnas necesarias)
  BEGIN
    INSERT INTO public.notifications (
      "userId",
      title,
      message,
      type,
      read,
      "createdAt",
      updated_at
    ) VALUES (
      p_user_id,
      '¡Verificación Aprobada!',
      'Tu solicitud de verificación ha sido aprobada. Ya puedes acceder a todas las funcionalidades de la plataforma.',
      'success',
      FALSE,
      NOW(),
      NOW()
    );
  EXCEPTION
    WHEN OTHERS THEN
      -- Si hay error con notifications, continuar sin crear la notificación
      RAISE NOTICE 'No se pudo crear notificación: %', SQLERRM;
  END;
  
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

-- 3. Función para rechazar verificación
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
    "verificationStatus" = 'rejected',
    verificationDocs = NULL,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Crear notificación para el usuario (solo si la tabla notifications tiene las columnas necesarias)
  BEGIN
    INSERT INTO public.notifications (
      "userId",
      title,
      message,
      type,
      read,
      "createdAt",
      updated_at
    ) VALUES (
      p_user_id,
      'Verificación Rechazada',
      'Tu solicitud de verificación ha sido rechazada. Puedes volver a enviar tu documentación desde tu perfil.',
      'warning',
      FALSE,
      NOW(),
      NOW()
    );
  EXCEPTION
    WHEN OTHERS THEN
      -- Si hay error con notifications, continuar sin crear la notificación
      RAISE NOTICE 'No se pudo crear notificación: %', SQLERRM;
  END;
END;
$$;

-- 4. Comentarios para las funciones
COMMENT ON FUNCTION is_admin() 
IS 'Verifica si el usuario actual tiene privilegios de administrador';

COMMENT ON FUNCTION approve_verification(UUID, TEXT) 
IS 'Aprueba la verificación de un usuario. Requiere privilegios de administrador.';

COMMENT ON FUNCTION reject_verification(UUID) 
IS 'Rechaza la verificación de un usuario. Requiere privilegios de administrador.';

-- 5. Verificar que las funciones se crearon correctamente
SELECT 
  routine_name, 
  routine_type, 
  data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('approve_verification', 'reject_verification', 'is_admin');
