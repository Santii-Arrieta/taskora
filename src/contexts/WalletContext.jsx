
import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from './DataContext';
import { supabase } from '@/lib/customSupabaseClient';

const WalletContext = createContext(null);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

export const WalletProvider = ({ children }) => {
  const { user, updateProfile } = useAuth();
  const { addData } = useData();
  const [transactions, setTransactions] = useState([]);

  const loadTransactions = useCallback(async () => {
    if (!user) {
      setTransactions([]);
      return;
    }
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('userId', user.id)
      .order('date', { ascending: false });

    if (error) {
      console.error("Error fetching transactions", error);
    } else {
      setTransactions(data);
    }
  }, [user]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const addTransaction = useCallback(async (userId, amount, type, description, mpPaymentId = null) => {
    const newTransaction = {
      userId,
      amount,
      type,
      description,
      date: new Date().toISOString(),
      mp_payment_id: mpPaymentId,
    };
    console.log('📝 Adding transaction:', newTransaction);
    const added = await addData('transactions', newTransaction);
    console.log('📝 Transaction added result:', added);
    
    // Solo actualizar el estado local si es para el usuario actual
    if(added && userId === user?.id) {
        console.log('📝 Updating local transactions state');
        setTransactions(prev => [added, ...prev]);
    } else if (added) {
        console.log('📝 Transaction added for different user:', userId);
    }
    
    return added;
  }, [addData, user]);

  const depositFunds = useCallback(async (amount, description, mpPaymentId) => {
    if (!user) return;
    const newBalance = (user.balance || 0) + amount;
    await updateProfile({ balance: newBalance });
    await addTransaction(user.id, amount, 'deposit', description, mpPaymentId);
  }, [user, updateProfile, addTransaction]);

  const withdrawFunds = useCallback(async (amount, description) => {
    if (!user) return { success: false, message: 'Usuario no autenticado.' };

    try {
      console.log('🚀 Starting withdrawFunds:', { amount, description, userId: user.id });
      
      // Verificar que el usuario tenga email de retiro configurado
      if (!user.mp_withdrawal_email) {
        return { 
          success: false, 
          message: 'Debes configurar el email donde quieres recibir los retiros antes de realizar retiros.' 
        };
      }

      // Usar función RPC temporal mientras se arregla el token de MP
      const { data, error } = await supabase.rpc('process_withdrawal', {
        p_user_id: user.id,
        p_amount: amount,
        p_description: `Retiro a ${user.mp_withdrawal_email}`
      });

      if (error) {
        console.error('❌ Error processing withdrawal:', error);
        return { success: false, message: 'Error al procesar el retiro.' };
      }

      console.log('✅ Withdrawal processed successfully:', data);

      if (data.success) {
        // Actualizar el saldo local
        updateProfile({ balance: data.new_balance });
        return { 
          success: true, 
          message: 'Retiro procesado exitosamente. Los fondos se transferirán manualmente.',
          newBalance: data.new_balance
        };
      } else {
        return { success: false, message: data.message };
      }
    } catch (error) {
      console.error('Error in withdrawFunds:', error);
      return { success: false, message: 'Error inesperado al procesar el retiro.' };
    }
  }, [user, updateProfile]);

  const moveFromBalanceToEscrow = useCallback(async (amount, description) => {
    if (!user || (user.balance || 0) < amount) {
      return { success: false, message: 'Saldo insuficiente para realizar el pago.' };
    }

    try {
      const newBalance = user.balance - amount;
      const newEscrow = (user.escrow || 0) + amount;
      
      // Actualizar perfil de forma atómica
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          balance: newBalance, 
          escrow: newEscrow,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating user balance:', updateError);
        return { success: false, message: 'Error al procesar el pago. Inténtalo de nuevo.' };
      }

      // Agregar transacción
      await addTransaction(user.id, -amount, 'escrow_payment', description);
      
      return { success: true };
    } catch (error) {
      console.error('Error in moveFromBalanceToEscrow:', error);
      return { success: false, message: 'Error inesperado al procesar el pago.' };
    }
  }, [user, updateProfile, addTransaction]);

  const moveFromEscrowToProvider = useCallback(async (providerId, amount, description) => {
    if (!user) return;

    try {
      console.log('🚀 Starting moveFromEscrowToProvider:', { providerId, amount, description, clientId: user.id });
      
      // Usar la función RPC para liberar el pago
      const { data, error } = await supabase.rpc('release_payment_to_provider', {
        p_provider_id: providerId,
        p_client_id: user.id,
        p_amount: amount,
        p_description: description
      });

      if (error) {
        console.error('❌ Error releasing payment:', error);
        return;
      }

      console.log('✅ Payment released successfully:', data);

      // Actualizar el perfil del cliente localmente
      updateProfile({ escrow: data.client_escrow });

      console.log('✅ Payment released successfully to provider:', providerId, 'Amount:', amount);
    } catch (error) {
      console.error('Error in moveFromEscrowToProvider:', error);
    }
  }, [user, updateProfile]);

  const value = {
    balance: user?.balance || 0,
    escrow: user?.escrow || 0,
    transactions,
    depositFunds,
    withdrawFunds,
    moveFromBalanceToEscrow,
    moveFromEscrowToProvider,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};