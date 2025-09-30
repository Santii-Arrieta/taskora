import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from './cors.ts';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '', 
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { amount } = await req.json();
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');
    
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user: authUser } } = await supabaseAdmin.auth.getUser(jwt);
    if (!authUser) throw new Error('Authentication failed');

    // Obtener el token de Mercado Pago desde la tabla settings
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('settings')
      .select('mpAccessToken')
      .eq('id', 1)
      .single();

    if (settingsError || !settings?.mpAccessToken) {
      throw new Error('Mercado Pago no está configurado correctamente.');
    }

    // Obtener email de retiro del usuario
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('balance, mp_withdrawal_email')
      .eq('id', authUser.id)
      .single();

    if (profileError || !userProfile) {
      throw new Error(`User profile not found: ${profileError?.message}`);
    }

    if ((userProfile.balance || 0) < amount) {
      throw new Error('Fondos insuficientes.');
    }

    if (!userProfile.mp_withdrawal_email) {
      throw new Error("Debes configurar el email donde quieres recibir los retiros antes de realizar retiros.");
    }

    // Usar la API de payouts con el email de retiro del usuario
    const payoutData = {
      items: [
        {
          sender_id: authUser.id,
          receiver_email: userProfile.mp_withdrawal_email, // Email configurado por el usuario
          amount: {
            currency_id: 'ARS',
            value: amount
          },
          note: `Retiro de fondos desde Taskora`
        }
      ],
      notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mp-webhook`
    };

    const response = await fetch('https://api.mercadopago.com/v1/payouts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.mpAccessToken}`,
        'X-Idempotency-Key': `payout-${authUser.id}-${Date.now()}`
      },
      body: JSON.stringify(payoutData)
    });

    if (!response.ok) {
      const errorBody = await response.json();
      console.error('MP Payout error:', errorBody);
      throw new Error(`Error en el retiro: ${errorBody.message || 'Unknown Error'}`);
    }

    const payoutResult = await response.json();

    // Actualizar saldo del usuario en la base de datos
    await supabaseAdmin
      .from('users')
      .update({ 
        balance: (userProfile.balance || 0) - amount,
        updated_at: new Date().toISOString()
      })
      .eq('id', authUser.id);

    // Registrar la transacción
    await supabaseAdmin
      .from('transactions')
      .insert({
        userId: authUser.id,
        amount: -amount,
        type: 'withdrawal',
        description: `Retiro a ${userProfile.mp_withdrawal_email}`,
        date: new Date().toISOString(),
        status: 'pending'
      });

    return new Response(JSON.stringify({
      success: true,
      payoutResult,
      message: 'Retiro procesado exitosamente'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('Payout edge function error:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });
  }
});
