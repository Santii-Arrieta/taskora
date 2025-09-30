-- Script para verificar la estructura de la tabla briefs y el campo applications

-- 1. Verificar la estructura de la tabla briefs
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'briefs' 
ORDER BY ordinal_position;

-- 2. Verificar el campo applications específicamente
SELECT 
    column_name,
    data_type,
    udt_name,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'briefs' 
AND column_name = 'applications';

-- 3. Ver algunos ejemplos de briefs con sus applications
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
LIMIT 10;

-- 4. Verificar si hay briefs con applications como NULL
SELECT COUNT(*) as briefs_with_null_applications
FROM briefs 
WHERE applications IS NULL;

-- 5. Verificar si hay briefs con applications como array vacío
SELECT COUNT(*) as briefs_with_empty_applications
FROM briefs 
WHERE applications = '[]'::jsonb;

-- 6. Verificar si hay briefs con applications que tienen datos
SELECT COUNT(*) as briefs_with_applications_data
FROM briefs 
WHERE applications IS NOT NULL 
AND applications != '[]'::jsonb 
AND jsonb_array_length(applications) > 0;
