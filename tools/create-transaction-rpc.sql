-- Función RPC para insertar transacciones sin restricciones RLS
CREATE OR REPLACE FUNCTION insert_transaction(
    p_user_id UUID,
    p_amount DECIMAL,
    p_type TEXT,
    p_description TEXT,
    p_mp_payment_id TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_transaction JSON;
BEGIN
    -- Insertar la transacción
    INSERT INTO public.transactions (
        "userId",
        amount,
        type,
        description,
        date,
        mp_payment_id
    ) VALUES (
        p_user_id,
        p_amount,
        p_type,
        p_description,
        NOW(),
        p_mp_payment_id
    ) RETURNING to_json(transactions.*) INTO new_transaction;
    
    RETURN new_transaction;
END;
$$;

-- Función RPC para liberar pagos (reemplaza la lógica actual)
CREATE OR REPLACE FUNCTION release_payment_to_provider(
    p_provider_id UUID,
    p_client_id UUID,
    p_amount DECIMAL,
    p_description TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    provider_balance DECIMAL;
    client_escrow DECIMAL;
    result JSON;
BEGIN
    -- Obtener saldos actuales
    SELECT balance INTO provider_balance FROM public.users WHERE id = p_provider_id;
    SELECT escrow INTO client_escrow FROM public.users WHERE id = p_client_id;
    
    -- Actualizar saldo del proveedor
    UPDATE public.users 
    SET balance = COALESCE(provider_balance, 0) + p_amount,
        updated_at = NOW()
    WHERE id = p_provider_id;
    
    -- Actualizar escrow del cliente
    UPDATE public.users 
    SET escrow = COALESCE(client_escrow, 0) - p_amount,
        updated_at = NOW()
    WHERE id = p_client_id;
    
    -- Insertar transacción del cliente (escrow_release)
    INSERT INTO public.transactions (
        "userId",
        amount,
        type,
        description,
        date
    ) VALUES (
        p_client_id,
        -p_amount,
        'escrow_release',
        'Liberación de fondos para proveedor'
    );
    
    -- Insertar transacción del proveedor (income)
    INSERT INTO public.transactions (
        "userId",
        amount,
        type,
        description,
        date
    ) VALUES (
        p_provider_id,
        p_amount,
        'income',
        p_description
    );
    
    -- Retornar resultado
    result := json_build_object(
        'success', true,
        'provider_balance', COALESCE(provider_balance, 0) + p_amount,
        'client_escrow', COALESCE(client_escrow, 0) - p_amount
    );
    
    RETURN result;
END;
$$;
