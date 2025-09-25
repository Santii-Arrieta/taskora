-- Función para actualizar automáticamente el tipo de usuario cuando crea un servicio

CREATE OR REPLACE FUNCTION update_user_type_on_service_creation()
RETURNS TRIGGER AS $$
BEGIN
  -- Si el usuario crea un servicio y es 'client', cambiarlo a 'provider'
  UPDATE public.users 
  SET "userType" = 'provider'
  WHERE id = NEW."userId" 
    AND "userType" = 'client';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger que se ejecute cuando se inserta un nuevo servicio
DROP TRIGGER IF EXISTS trigger_update_user_type_on_service_creation ON public.briefs;

CREATE TRIGGER trigger_update_user_type_on_service_creation
  AFTER INSERT ON public.briefs
  FOR EACH ROW
  EXECUTE FUNCTION update_user_type_on_service_creation();

-- Comentario para la función
COMMENT ON FUNCTION update_user_type_on_service_creation() 
IS 'Actualiza automáticamente el userType de client a provider cuando un usuario crea su primer servicio.';
