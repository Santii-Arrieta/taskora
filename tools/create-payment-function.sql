-- Función SQL para procesar pagos de forma atómica y prevenir duplicados

CREATE OR REPLACE FUNCTION process_payment_transaction(
  p_user_id UUID,
  p_amount NUMERIC,
  p_payment_id TEXT,
  p_status TEXT
)
RETURNS TABLE(new_balance NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_balance NUMERIC;
  final_balance NUMERIC;
BEGIN
  -- Verificar si ya existe una transacción con este mp_payment_id
  IF EXISTS (
    SELECT 1 FROM public.transactions 
    WHERE mp_payment_id = p_payment_id
  ) THEN
    -- Ya existe, obtener el saldo actual
    SELECT balance INTO current_balance 
    FROM public.users 
    WHERE id = p_user_id;
    
    RETURN QUERY SELECT current_balance;
    RETURN;
  END IF;

  -- Obtener saldo actual del usuario
  SELECT balance INTO current_balance 
  FROM public.users 
  WHERE id = p_user_id;
  
  IF current_balance IS NULL THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;

  -- Calcular nuevo saldo
  final_balance := current_balance + p_amount;

  -- Insertar transacción
  INSERT INTO public.transactions (
    "userId",
    amount,
    type,
    description,
    date,
    mp_payment_id,
    status
  ) VALUES (
    p_user_id,
    p_amount,
    'deposit',
    'Depósito via Mercado Pago (' || p_status || ')',
    NOW(),
    p_payment_id,
    p_status
  );

  -- Actualizar saldo del usuario
  UPDATE public.users 
  SET balance = final_balance 
  WHERE id = p_user_id;

  -- Retornar el nuevo saldo
  RETURN QUERY SELECT final_balance;
END;
$$;

-- Comentario para la función
COMMENT ON FUNCTION process_payment_transaction(UUID, NUMERIC, TEXT, TEXT) 
IS 'Procesa un pago de forma atómica, creando la transacción y actualizando el saldo del usuario. Previene duplicados por mp_payment_id.';
