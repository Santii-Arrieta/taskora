
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
    const added = await addData('transactions', newTransaction);
    if(added && userId === user?.id) {
        setTransactions(prev => [added, ...prev]);
    }
  }, [addData, user]);

  const depositFunds = useCallback(async (amount, description, mpPaymentId) => {
    if (!user) return;
    const newBalance = (user.balance || 0) + amount;
    await updateProfile({ balance: newBalance });
    await addTransaction(user.id, amount, 'deposit', description, mpPaymentId);
  }, [user, updateProfile, addTransaction]);

  const withdrawFunds = useCallback(async (amount, description) => {
    if (!user || (user.balance || 0) < amount) {
      return { success: false, message: 'Fondos insuficientes.' };
    }
    // Lógica de retiro real con la API de Mercado Pago iría aquí
    const newBalance = user.balance - amount;
    await updateProfile({ balance: newBalance });
    await addTransaction(user.id, -amount, 'withdrawal', description);
    return { success: true };
  }, [user, updateProfile, addTransaction]);

  const moveFromBalanceToEscrow = useCallback(async (amount, description) => {
    if (!user || (user.balance || 0) < amount) {
      return { success: false, message: 'Saldo insuficiente para realizar el pago.' };
    }
    const newBalance = user.balance - amount;
    const newEscrow = (user.escrow || 0) + amount;
    await updateProfile({ balance: newBalance, escrow: newEscrow });
    await addTransaction(user.id, -amount, 'escrow_payment', description);
    return { success: true };
  }, [user, updateProfile, addTransaction]);

  const moveFromEscrowToProvider = useCallback(async (providerId, amount, description) => {
    if (!user) return;

    const { error: rpcError } = await supabase.rpc('release_escrow_payment', {
        p_client_id: user.id,
        p_provider_id: providerId,
        p_amount: amount
    });
    
    if (rpcError) {
        console.error("Error releasing escrow payment:", rpcError);
        return;
    }

    await addTransaction(user.id, -amount, 'escrow_release', `Liberación de fondos para proveedor`);
    await addTransaction(providerId, amount, 'income', description);

    // Refresh client's profile
    const newEscrow = (user.escrow || 0) - amount;
    updateProfile({ escrow: newEscrow });
  }, [user, addTransaction, updateProfile]);

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