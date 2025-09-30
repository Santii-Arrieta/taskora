-- Función RPC temporal para retiros (sin Mercado Pago por ahora)
CREATE OR REPLACE FUNCTION process_withdrawal(
    p_user_id UUID,
    p_amount DECIMAL,
    p_description TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_balance DECIMAL;
    result JSON;
BEGIN
    -- Obtener saldo actual del usuario
    SELECT balance INTO user_balance FROM public.users WHERE id = p_user_id;
    
    -- Verificar que tenga saldo suficiente
    IF COALESCE(user_balance, 0) < p_amount THEN
        result := json_build_object(
            'success', false,
            'message', 'Saldo insuficiente para realizar el retiro'
        );
        RETURN result;
    END IF;
    
    -- Actualizar saldo del usuario
    UPDATE public.users 
    SET balance = COALESCE(user_balance, 0) - p_amount,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Insertar transacción de retiro
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
        -p_amount,
        'withdrawal',
        p_description,
        NOW(),
        NULL,
        'pending'
    );
    
    -- Retornar resultado exitoso
    result := json_build_object(
        'success', true,
        'message', 'Retiro procesado exitosamente',
        'new_balance', COALESCE(user_balance, 0) - p_amount
    );
    
    RETURN result;
END;
$$;
