import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '', 
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { paymentId, userId } = await req.json();
    
    if (!paymentId || !userId) {
      throw new Error('paymentId and userId are required');
    }

    console.log('Verificando pago:', { paymentId, userId });

    // 1. Verificar si ya existe la transacción
    const { data: existingTransactions, error: transactionError } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('mp_payment_id', paymentId);

    if (existingTransactions && existingTransactions.length > 0 && !transactionError) {
      // Ya fue procesado, obtener saldo actual
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('balance')
        .eq('id', userId)
        .single();
      
      console.log(`Payment ${paymentId} already processed ${existingTransactions.length} times`);
      
      return new Response(JSON.stringify({
        success: true,
        newBalance: user?.balance || 0,
        message: 'Payment already processed'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // 2. Obtener token de Mercado Pago
    const { data: settings } = await supabaseAdmin
      .from('settings')
      .select('mpAccessToken')
      .eq('id', 1)
      .single();
    
    const mpAccessToken = settings?.mpAccessToken || Deno.env.get('MP_ACCESS_TOKEN');
    
    if (!mpAccessToken) {
      throw new Error('Mercado Pago Access Token not configured');
    }

    // 3. Consultar Mercado Pago
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${mpAccessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!mpResponse.ok) {
      throw new Error(`Failed to fetch payment from Mercado Pago: ${mpResponse.status}`);
    }

    const paymentData = await mpResponse.json();
    const { status, transaction_amount, external_reference } = paymentData;

    console.log('Datos del pago de MP:', { status, transaction_amount, external_reference });

    // 4. Verificar que el pago corresponde al usuario
    const [refType, refUserId] = (external_reference || '').split('_');
    if (refUserId !== userId) {
      throw new Error('Payment does not belong to this user');
    }

    // 5. Si está aprobado, procesar el pago
    if (status === 'approved' && refType === 'deposit') {
      // Usar transacción de base de datos para asegurar atomicidad
      const { data: transactionResult, error: transactionError } = await supabaseAdmin.rpc('process_payment_transaction', {
        p_user_id: userId,
        p_amount: transaction_amount,
        p_payment_id: paymentId,
        p_status: status
      });

      if (transactionError) {
        throw new Error(`Failed to process payment: ${transactionError.message}`);
      }

      console.log('Pago procesado exitosamente:', transactionResult);

      return new Response(JSON.stringify({
        success: true,
        newBalance: transactionResult.new_balance,
        message: 'Payment processed successfully'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    } else {
      // Pago no aprobado
      return new Response(JSON.stringify({
        success: false,
        message: `Payment status: ${status}`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

  } catch (error) {
    console.error('Verify payment error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });
  }
});
