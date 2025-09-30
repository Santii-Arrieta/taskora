-- Función RPC corregida para liberar pagos
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
    
    -- Insertar transacción del cliente (escrow_release) - solo columnas esenciales
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
        'Liberación de fondos para proveedor',
        NOW()
    );
    
    -- Insertar transacción del proveedor (income) - solo columnas esenciales
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
        p_description,
        NOW()
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
