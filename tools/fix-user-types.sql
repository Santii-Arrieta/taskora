-- Script para corregir los tipos de usuario en la base de datos

-- 1. Verificar usuarios que tienen servicios pero están marcados como 'client'
SELECT 
  u.id,
  u.name,
  u.email,
  u."userType",
  COUNT(b.id) as service_count
FROM public.users u
LEFT JOIN public.briefs b ON u.id = b."userId"
WHERE u."userType" = 'client'
GROUP BY u.id, u.name, u.email, u."userType"
HAVING COUNT(b.id) > 0
ORDER BY service_count DESC;

-- 2. Actualizar usuarios que tienen servicios para que sean 'provider'
UPDATE public.users 
SET "userType" = 'provider'
WHERE id IN (
  SELECT DISTINCT u.id
  FROM public.users u
  INNER JOIN public.briefs b ON u.id = b."userId"
  WHERE u."userType" = 'client'
);

-- 3. Verificar el resultado
SELECT 
  u.id,
  u.name,
  u.email,
  u."userType",
  COUNT(b.id) as service_count
FROM public.users u
LEFT JOIN public.briefs b ON u.id = b."userId"
GROUP BY u.id, u.name, u.email, u."userType"
ORDER BY service_count DESC;
