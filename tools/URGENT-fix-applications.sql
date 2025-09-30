-- Script URGENTE para arreglar postulaciones
-- Ejecuta SOLO este comando:

UPDATE briefs 
SET applications = '[]'::jsonb 
WHERE applications IS NULL;

-- Luego verifica que funcionó:
SELECT COUNT(*) as briefs_fixed
FROM briefs 
WHERE applications = '[]'::jsonb;
