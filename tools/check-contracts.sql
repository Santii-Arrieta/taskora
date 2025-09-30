-- Script para verificar contratos en la base de datos
-- Ejecutar en el SQL Editor de Supabase

-- Verificar si hay contratos en la tabla
SELECT 
    COUNT(*) as total_contracts,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_contracts,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_contracts,
    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_contracts
FROM contracts;

-- Mostrar todos los contratos
SELECT 
    id,
    title,
    price,
    status,
    "providerId",
    "clientId",
    "providerName",
    "clientName",
    "createdAt"
FROM contracts
ORDER BY "createdAt" DESC
LIMIT 10;

-- Verificar contratos para usuarios específicos (reemplazar con los IDs reales)
-- SELECT * FROM contracts 
-- WHERE "providerId" = '09d1df9d-d1f1-4cc9-82dd-5fc17228206b' 
--    OR "clientId" = '09d1df9d-d1f1-4cc9-82dd-5fc17228206b'
-- ORDER BY "createdAt" DESC;
