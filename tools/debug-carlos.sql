-- Verificar datos de Carlos
SELECT id, name, email, "userType", "avatarKey" 
FROM public.users 
WHERE id = '09d1df9d-d1f1-4cc9-82dd-5fc17228206b';

-- Verificar servicios de Carlos
SELECT COUNT(*) as service_count 
FROM public.briefs 
WHERE "userId" = '09d1df9d-d1f1-4cc9-82dd-5fc17228206b';

-- Ver todos los servicios de Carlos
SELECT id, title, "userId" 
FROM public.briefs 
WHERE "userId" = '09d1df9d-d1f1-4cc9-82dd-5fc17228206b';
