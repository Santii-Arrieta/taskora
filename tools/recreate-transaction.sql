-- Script para recrear la transacción de $1 correctamente

-- 1. Insertar la transacción de $1
INSERT INTO public.transactions (
  "userId",
  amount,
  type,
  description,
  date,
  mp_payment_id,
  status
) VALUES (
  '09d1df9d-d1f1-4cc9-82dd-5fc17228206b', -- Tu user ID
  1, -- $1
  'deposit',
  'Depósito via Mercado Pago (approved)',
  '2025-09-24 14:45:03.787+00', -- Fecha de la transacción más reciente
  '127371800990', -- ID del pago de Mercado Pago
  'approved'
);

-- 2. Actualizar el saldo del usuario a $1
UPDATE public.users 
SET balance = 1 
WHERE id = '09d1df9d-d1f1-4cc9-82dd-5fc17228206b';

-- 3. Verificar que todo esté correcto
SELECT 
  t.id,
  t.amount,
  t.type,
  t.description,
  t.date,
  t.mp_payment_id,
  t.status,
  u.balance
FROM public.transactions t
JOIN public.users u ON t."userId" = u.id
WHERE t."userId" = '09d1df9d-d1f1-4cc9-82dd-5fc17228206b';
