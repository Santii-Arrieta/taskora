-- Script para arreglar briefs que no tienen el campo applications inicializado
-- Este script actualiza todos los briefs que tienen applications como NULL o no tienen el campo

-- Primero, vamos a ver qué briefs necesitan ser arreglados
SELECT 
    id, 
    title, 
    applications,
    CASE 
        WHEN applications IS NULL THEN 'NULL'
        WHEN applications = '[]' THEN 'Empty Array'
        ELSE 'Has Data'
    END as applications_status
FROM briefs 
ORDER BY created_at DESC;

-- Actualizar todos los briefs que tienen applications como NULL
UPDATE briefs 
SET applications = '[]'::jsonb 
WHERE applications IS NULL;

-- Verificar que todos los briefs ahora tienen applications como array vacío
SELECT 
    COUNT(*) as total_briefs,
    COUNT(CASE WHEN applications IS NULL THEN 1 END) as null_applications,
    COUNT(CASE WHEN applications = '[]'::jsonb THEN 1 END) as empty_applications,
    COUNT(CASE WHEN jsonb_array_length(applications) > 0 THEN 1 END) as briefs_with_applications
FROM briefs;
