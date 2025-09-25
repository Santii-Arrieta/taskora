-- Script para corregir el userType de Carlos Vercellone

-- 1. Verificar el estado actual
SELECT 
  u.id,
  u.name,
  u.email,
  u."userType",
  COUNT(b.id) as service_count
FROM public.users u
LEFT JOIN public.briefs b ON u.id = b."userId"
WHERE u.id = '09d1df9d-d1f1-4cc9-82dd-5fc17228206b'
GROUP BY u.id, u.name, u.email, u."userType";

-- 2. Si Carlos tiene servicios pero es 'client', actualizar a 'provider'
UPDATE public.users 
SET "userType" = 'provider'
WHERE id = '09d1df9d-d1f1-4cc9-82dd-5fc17228206b'
  AND "userType" = 'client'
  AND EXISTS (
    SELECT 1 FROM public.briefs 
    WHERE "userId" = '09d1df9d-d1f1-4cc9-82dd-5fc17228206b'
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
WHERE u.id = '09d1df9d-d1f1-4cc9-82dd-5fc17228206b'
GROUP BY u.id, u.name, u.email, u."userType";
