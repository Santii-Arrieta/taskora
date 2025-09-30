-- Función RPC para agregar aplicaciones a briefs (bypass RLS)
CREATE OR REPLACE FUNCTION add_application_to_brief(
    brief_id UUID,
    user_id UUID,
    user_name TEXT,
    application_status TEXT DEFAULT 'pending'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Ejecuta con permisos del creador de la función
AS $$
DECLARE
    current_applications JSONB;
    new_application JSONB;
    updated_applications JSONB;
BEGIN
    -- Obtener las aplicaciones actuales
    SELECT applications INTO current_applications
    FROM briefs
    WHERE id = brief_id;
    
    -- Si applications es NULL, inicializar como array vacío
    IF current_applications IS NULL THEN
        current_applications := '[]'::jsonb;
    END IF;
    
    -- Verificar si el usuario ya se postuló
    IF current_applications @> jsonb_build_object('id', user_id) THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Ya te has postulado a esta oportunidad'
        );
    END IF;
    
    -- Crear la nueva aplicación
    new_application := jsonb_build_object(
        'id', user_id,
        'name', user_name,
        'date', now()::text,
        'status', application_status
    );
    
    -- Agregar la nueva aplicación al array
    updated_applications := current_applications || jsonb_build_array(new_application);
    
    -- Actualizar el brief
    UPDATE briefs
    SET applications = updated_applications
    WHERE id = brief_id;
    
    -- Verificar que la actualización fue exitosa
    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Postulación enviada con éxito',
            'applications', updated_applications
        );
    ELSE
        RETURN jsonb_build_object(
            'success', false,
            'message', 'No se pudo encontrar el brief'
        );
    END IF;
END;
$$;

-- Otorgar permisos de ejecución a usuarios autenticados
GRANT EXECUTE ON FUNCTION add_application_to_brief(UUID, UUID, TEXT, TEXT) TO authenticated;

-- Función para obtener aplicaciones de un brief (bypass RLS)
CREATE OR REPLACE FUNCTION get_brief_applications(brief_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    brief_applications JSONB;
BEGIN
    SELECT applications INTO brief_applications
    FROM briefs
    WHERE id = brief_id;
    
    IF brief_applications IS NULL THEN
        brief_applications := '[]'::jsonb;
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'applications', brief_applications
    );
END;
$$;

-- Otorgar permisos de ejecución
GRANT EXECUTE ON FUNCTION get_brief_applications(UUID) TO authenticated;
