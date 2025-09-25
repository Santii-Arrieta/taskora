-- Script para resetear el saldo del usuario específico

-- Resetear saldo a 0 para el usuario Carlos
UPDATE public.users 
SET balance = 0 
WHERE id = '09d1df9d-d1f1-4cc9-82dd-5fc17228206b';

-- Verificar el cambio
SELECT id, email, name, balance 
FROM public.users 
WHERE id = '09d1df9d-d1f1-4cc9-82dd-5fc17228206b';
