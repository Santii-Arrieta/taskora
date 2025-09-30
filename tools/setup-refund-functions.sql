-- Script para crear funciones de reembolso
-- Ejecutar en el SQL Editor de Supabase DESPUÉS de crear la tabla contracts

-- Función para reembolsar un contrato específico
CREATE OR REPLACE FUNCTION refund_duplicate_payment(
  p_contract_id UUID,
  p_reason TEXT DEFAULT 'Contrato duplicado'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_contract RECORD;
  v_client_id UUID;
  v_amount DECIMAL;
  v_title TEXT;
BEGIN
  -- Obtener información del contrato
  SELECT "clientId", price, title, status
  INTO v_contract
  FROM contracts
  WHERE id = p_contract_id;
  
  -- Verificar que el contrato existe
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Contrato no encontrado'
    );
  END IF;
  
  -- Verificar que el contrato está activo
  IF v_contract.status != 'active' THEN
    RETURN json_build_object(
      'success', false,
      'message', 'El contrato no está activo'
    );
  END IF;
  
  v_client_id := v_contract."clientId";
  v_amount := v_contract.price;
  v_title := v_contract.title;
  
  -- Actualizar saldo del cliente (reembolsar)
  UPDATE users 
  SET 
    balance = balance + v_amount,
    escrow = escrow - v_amount,
    updated_at = NOW()
  WHERE id = v_client_id;
  
  -- Verificar que la actualización fue exitosa
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Error al actualizar saldo del usuario'
    );
  END IF;
  
  -- Agregar transacción de reembolso
  INSERT INTO transactions ("userId", amount, type, description, date, "contractId")
  VALUES (
    v_client_id,
    v_amount,
    'refund',
    p_reason || ': ' || v_title,
    NOW(),
    p_contract_id
  );
  
  -- Marcar contrato como cancelado
  UPDATE contracts 
  SET 
    status = 'cancelled',
    "updatedAt" = NOW()
  WHERE id = p_contract_id;
  
  -- Obtener nuevo saldo del usuario
  SELECT balance INTO v_amount
  FROM users
  WHERE id = v_client_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Reembolso procesado exitosamente',
    'refunded_amount', v_contract.price,
    'new_balance', v_amount,
    'contract_id', p_contract_id
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Error inesperado: ' || SQLERRM
    );
END;
$$;

-- Función para identificar contratos duplicados
CREATE OR REPLACE FUNCTION find_duplicate_contracts()
RETURNS TABLE (
  contract_id UUID,
  title TEXT,
  provider_id UUID,
  client_id UUID,
  price DECIMAL,
  created_at TIMESTAMP WITH TIME ZONE,
  duplicate_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH duplicate_contracts AS (
    SELECT 
      id,
      title,
      "providerId" as provider_id,
      "clientId" as client_id,
      price,
      "createdAt" as created_at,
      ROW_NUMBER() OVER (
        PARTITION BY title, "providerId", "clientId" 
        ORDER BY "createdAt" ASC
      ) as row_num,
      COUNT(*) OVER (
        PARTITION BY title, "providerId", "clientId"
      ) as total_count
    FROM contracts
    WHERE status = 'active'
  )
  SELECT 
    dc.id as contract_id,
    dc.title,
    dc.provider_id,
    dc.client_id,
    dc.price,
    dc.created_at,
    dc.total_count as duplicate_count
  FROM duplicate_contracts dc
  WHERE dc.total_count > 1
  ORDER BY dc.title, dc.created_at;
END;
$$;

-- Función para procesar todos los reembolsos de duplicados
CREATE OR REPLACE FUNCTION process_duplicate_refunds()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_duplicate RECORD;
  v_refund_result JSON;
  v_total_refunded DECIMAL := 0;
  v_processed_count INTEGER := 0;
  v_error_count INTEGER := 0;
BEGIN
  -- Procesar cada contrato duplicado (mantener el primero, reembolsar los demás)
  FOR v_duplicate IN 
    WITH duplicate_contracts AS (
      SELECT 
        id,
        title,
        "providerId",
        "clientId",
        price,
        "createdAt",
        ROW_NUMBER() OVER (
          PARTITION BY title, "providerId", "clientId" 
          ORDER BY "createdAt" ASC
        ) as row_num
      FROM contracts
      WHERE status = 'active'
    )
    SELECT id, title, "providerId", "clientId", price
    FROM duplicate_contracts
    WHERE row_num > 1
  LOOP
    -- Reembolsar el contrato duplicado
    SELECT refund_duplicate_payment(v_duplicate.id, 'Contrato duplicado') INTO v_refund_result;
    
    IF (v_refund_result->>'success')::boolean THEN
      v_total_refunded := v_total_refunded + v_duplicate.price;
      v_processed_count := v_processed_count + 1;
    ELSE
      v_error_count := v_error_count + 1;
    END IF;
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Procesamiento de reembolsos completado',
    'processed_count', v_processed_count,
    'error_count', v_error_count,
    'total_refunded', v_total_refunded
  );
END;
$$;


