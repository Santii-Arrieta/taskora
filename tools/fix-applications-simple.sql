-- Script simple para arreglar el problema de postulaciones
-- Ejecuta estos comandos uno por uno

-- 1. Verificar la estructura del campo applications
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'briefs' 
AND column_name = 'applications';

-- 2. Ver cuántos briefs tienen applications como NULL
SELECT COUNT(*) as briefs_with_null_applications
FROM briefs 
WHERE applications IS NULL;

-- 3. Arreglar todos los briefs que tienen applications como NULL
UPDATE briefs 
SET applications = '[]'::jsonb 
WHERE applications IS NULL;

-- 4. Verificar que se arregló
SELECT COUNT(*) as briefs_with_null_applications_after_fix
FROM briefs 
WHERE applications IS NULL;

-- 5. Ver algunos ejemplos de briefs después del arreglo
SELECT 
    id,
    title,
    applications,
    CASE 
        WHEN applications IS NULL THEN 'NULL'
        WHEN applications = '[]'::jsonb THEN 'Empty Array'
        WHEN jsonb_typeof(applications) = 'array' THEN 'Array with ' || jsonb_array_length(applications) || ' items'
        ELSE 'Other: ' || jsonb_typeof(applications)
    END as applications_status
FROM briefs 
ORDER BY "createdAt" DESC 
LIMIT 5;
