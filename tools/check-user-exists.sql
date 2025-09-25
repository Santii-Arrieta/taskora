-- Script para verificar si el usuario Joaquin Chayle existe en la base de datos

-- Buscar usuarios con nombre similar a "Joaquin"
SELECT 
  id,
  name,
  email,
  "userType",
  created_at
FROM public.users 
WHERE name ILIKE '%joaquin%' 
   OR name ILIKE '%chayle%'
ORDER BY created_at DESC;

-- Buscar todos los usuarios para ver la estructura
SELECT 
  id,
  name,
  email,
  "userType",
  created_at
FROM public.users 
ORDER BY created_at DESC
LIMIT 10;
