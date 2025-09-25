-- Script para debuggear el usuario Carlos Vercellone

-- 1. Buscar el usuario Carlos por email
SELECT 
  id,
  name,
  email,
  "userType",
  created_at,
  updated_at
FROM public.users 
WHERE email = 'carlos@taskora.webexperiencepro.com';

-- 2. Verificar si Carlos tiene servicios
SELECT 
  b.id,
  b.title,
  b.description,
  b."userId",
  u.name as user_name,
  u."userType"
FROM public.briefs b
JOIN public.users u ON b."userId" = u.id
WHERE u.email = 'carlos@taskora.webexperiencepro.com';

-- 3. Verificar todos los usuarios con servicios
SELECT 
  u.id,
  u.name,
  u.email,
  u."userType",
  COUNT(b.id) as service_count
FROM public.users u
LEFT JOIN public.briefs b ON u.id = b."userId"
GROUP BY u.id, u.name, u.email, u."userType"
HAVING COUNT(b.id) > 0
ORDER BY service_count DESC;
