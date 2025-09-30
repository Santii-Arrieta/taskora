-- Script para identificar y reembolsar pagos duplicados
-- Este script identifica contratos duplicados y reembolsa el pago duplicado

-- 1. Identificar contratos duplicados
WITH duplicate_contracts AS (
  SELECT 
    title,
    providerId,
    clientId,
    price,
    status,
    createdAt,
    id,
    ROW_NUMBER() OVER (
      PARTITION BY title, providerId, clientId 
      ORDER BY createdAt ASC
    ) as row_num
  FROM contracts
  WHERE status = 'active'
),
-- 2. Identificar los duplicados (mantener el primero, marcar los demás como duplicados)
duplicates_to_refund AS (
  SELECT 
    id,
    clientId,
    price,
    title
  FROM duplicate_contracts
  WHERE row_num > 1
),
-- 3. Reembolsar pagos duplicados
refund_transactions AS (
  SELECT 
    d.id as contract_id,
    d.clientId,
    d.price,
    d.title,
    -- Crear transacción de reembolso
    json_build_object(
      'userId', d.clientId,
      'amount', d.price,
      'type', 'refund',
      'description', 'Reembolso por contrato duplicado: ' || d.title,
      'date', NOW()::text,
      'contractId', d.id
    ) as refund_transaction
  FROM duplicates_to_refund d
)
-- 4. Actualizar saldo del usuario y agregar transacción de reembolso
UPDATE users 
SET 
  balance = balance + rt.price,
  escrow = escrow - rt.price,
  updated_at = NOW()
FROM refund_transactions rt
WHERE users.id = rt.clientId;

-- 5. Insertar transacciones de reembolso
INSERT INTO transactions (userId, amount, type, description, date, contractId)
SELECT 
  rt.clientId,
  rt.price,
  'refund',
  'Reembolso por contrato duplicado: ' || rt.title,
  NOW(),
  rt.contract_id
FROM refund_transactions rt;

-- 6. Marcar contratos duplicados como cancelados
UPDATE contracts 
SET 
  status = 'cancelled',
  updated_at = NOW()
WHERE id IN (
  SELECT id FROM duplicate_contracts WHERE row_num > 1
);

-- 7. Mostrar resumen de reembolsos
SELECT 
  'Reembolsos procesados' as action,
  COUNT(*) as count,
  SUM(price) as total_amount
FROM refund_transactions;
