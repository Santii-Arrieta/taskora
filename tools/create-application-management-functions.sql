-- Funciones RPC para gestión completa de aplicaciones de voluntariado

-- 1. Función para actualizar el estado de una aplicación (aceptar/rechazar)
CREATE OR REPLACE FUNCTION update_application_status(
    brief_id UUID,
    applicant_id UUID,
    new_status TEXT -- 'accepted', 'rejected', 'completed'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_applications JSONB;
    updated_applications JSONB;
    application_found BOOLEAN := false;
    application_index INTEGER;
    current_application JSONB;
BEGIN
    -- Obtener las aplicaciones actuales
    SELECT applications INTO current_applications
    FROM briefs
    WHERE id = brief_id;
    
    -- Si applications es NULL, inicializar como array vacío
    IF current_applications IS NULL THEN
        current_applications := '[]'::jsonb;
    END IF;
    
    -- Buscar la aplicación específica del usuario
    FOR application_index IN 0..jsonb_array_length(current_applications) - 1 LOOP
        current_application := current_applications -> application_index;
        
        IF (current_application ->> 'id')::UUID = applicant_id THEN
            application_found := true;
            
            -- Actualizar el estado de la aplicación
            current_application := jsonb_set(
                current_application, 
                '{status}', 
                to_jsonb(new_status)
            );
            
            -- Si se marca como completado, agregar fecha de finalización
            IF new_status = 'completed' THEN
                current_application := jsonb_set(
                    current_application, 
                    '{completedDate}', 
                    to_jsonb(now()::text)
                );
            END IF;
            
            -- Actualizar el array de aplicaciones
            updated_applications := jsonb_set(
                current_applications,
                ARRAY[application_index::text],
                current_application
            );
            
            EXIT;
        END IF;
    END LOOP;
    
    -- Si no se encontró la aplicación
    IF NOT application_found THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'No se encontró la aplicación del usuario'
        );
    END IF;
    
    -- Actualizar el brief
    UPDATE briefs
    SET applications = updated_applications
    WHERE id = brief_id;
    
    -- Verificar que la actualización fue exitosa
    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Estado de aplicación actualizado exitosamente',
            'applications', updated_applications
        );
    ELSE
        RETURN jsonb_build_object(
            'success', false,
            'message', 'No se pudo actualizar el brief'
        );
    END IF;
END;
$$;

-- 2. Función para obtener aplicaciones de un brief con detalles del usuario
CREATE OR REPLACE FUNCTION get_brief_applications_with_details(brief_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    brief_applications JSONB;
    application JSONB;
    user_details JSONB;
    enriched_applications JSONB := '[]'::jsonb;
    application_index INTEGER;
BEGIN
    -- Obtener las aplicaciones del brief
    SELECT applications INTO brief_applications
    FROM briefs
    WHERE id = brief_id;
    
    IF brief_applications IS NULL THEN
        brief_applications := '[]'::jsonb;
    END IF;
    
    -- Enriquecer cada aplicación con detalles del usuario
    FOR application_index IN 0..jsonb_array_length(brief_applications) - 1 LOOP
        application := brief_applications -> application_index;
        
        -- Obtener detalles del usuario
        SELECT jsonb_build_object(
            'id', id,
            'name', name,
            'email', email,
            'phone', phone,
            'bio', bio,
            'avatar', avatar,
            'userType', "userType",
            'createdAt', "createdAt"
        ) INTO user_details
        FROM users
        WHERE id = (application ->> 'id')::UUID;
        
        -- Combinar aplicación con detalles del usuario
        application := application || jsonb_build_object('userDetails', user_details);
        
        -- Agregar al array enriquecido
        enriched_applications := enriched_applications || jsonb_build_array(application);
    END LOOP;
    
    RETURN jsonb_build_object(
        'success', true,
        'applications', enriched_applications
    );
END;
$$;

-- 3. Función para crear una reseña automática cuando se marca como completado
CREATE OR REPLACE FUNCTION create_completion_review(
    brief_id UUID,
    applicant_id UUID,
    ngo_id UUID,
    rating INTEGER,
    comment TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    brief_title TEXT;
    applicant_name TEXT;
    ngo_name TEXT;
    review_id UUID;
BEGIN
    -- Obtener detalles del brief
    SELECT title INTO brief_title
    FROM briefs
    WHERE id = brief_id;
    
    -- Obtener nombre del aplicante
    SELECT name INTO applicant_name
    FROM users
    WHERE id = applicant_id;
    
    -- Obtener nombre de la ONG
    SELECT name INTO ngo_name
    FROM users
    WHERE id = ngo_id;
    
    -- Crear la reseña
    INSERT INTO reviews (
        id,
        "reviewerId",
        "revieweeId",
        rating,
        comment,
        "briefId",
        "createdAt",
        "updatedAt"
    ) VALUES (
        gen_random_uuid(),
        ngo_id,
        applicant_id,
        rating,
        comment,
        brief_id,
        now(),
        now()
    ) RETURNING id INTO review_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Reseña creada exitosamente',
        'reviewId', review_id,
        'briefTitle', brief_title,
        'applicantName', applicant_name,
        'ngoName', ngo_name
    );
END;
$$;

-- Otorgar permisos de ejecución a usuarios autenticados
GRANT EXECUTE ON FUNCTION update_application_status(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_brief_applications_with_details(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_completion_review(UUID, UUID, UUID, INTEGER, TEXT) TO authenticated;
