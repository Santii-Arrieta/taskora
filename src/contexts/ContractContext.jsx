import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useWallet } from './WalletContext';
import { useNotification } from './NotificationContext';
import { useData } from './DataContext';
import { supabase } from '@/lib/customSupabaseClient';

const ContractContext = createContext(null);

export const useContract = () => useContext(ContractContext);

export const ContractProvider = ({ children }) => {
  const { user } = useAuth();
  const { moveFromBalanceToEscrow, moveFromEscrowToProvider } = useWallet();
  const { addNotification } = useNotification();
  const { getData, addData, updateData } = useData();
  const [contracts, setContracts] = useState([]);

  const loadContractsFromStorage = useCallback(async () => {
    if (user) {
        console.log('Loading contracts for user:', user.id);
        const { data, error } = await supabase
          .from('contracts')
          .select(`
            *,
            provider:providerId(name),
            client:clientId(name)
          `)
          .or(`providerId.eq.${user.id},clientId.eq.${user.id}`)
          .order('createdAt', { ascending: false })
          .limit(50);
        if (error) {
          console.error('Error fetching contracts', error);
          setContracts([]);
          return;
        }
        console.log('Loaded contracts:', data);
        setContracts(data || []);
    } else {
        console.log('No user, clearing contracts');
        setContracts([]);
    }
  }, [user]);

  useEffect(() => {
    loadContractsFromStorage();
  }, [loadContractsFromStorage]);

  const createContract = async (offer) => {
    if (!user) return { success: false, message: 'Usuario no autenticado.' };

    try {
      // Verificar si ya existe un contrato activo para esta oferta
      const { data: existingContracts, error: checkError } = await supabase
        .from('contracts')
        .select('id, status')
        .eq('title', offer.title)
        .eq('providerId', offer.providerId)
        .eq('clientId', offer.clientId)
        .eq('status', 'active')
        .limit(1);

      if (checkError) {
        console.error('Error checking existing contracts:', checkError);
        return { success: false, message: 'Error al verificar contratos existentes.' };
      }

      if (existingContracts && existingContracts.length > 0) {
        return { success: false, message: 'Ya existe un contrato activo para esta oferta.' };
      }

      const escrowResult = await moveFromBalanceToEscrow(offer.price, `Pago en garantía para: ${offer.title}`);
      if (!escrowResult.success) {
        return { success: false, message: escrowResult.message };
      }

      const newContractData = {
        title: offer.title,
        price: offer.price,
        providerId: offer.providerId,
        clientId: offer.clientId,
        briefId: offer.briefId || null, // Permitir null para ofertas de chat
        status: 'active'
      };
      
      console.log('Creating contract with data:', newContractData);
      const newContract = await addData('contracts', newContractData);
      console.log('Contract creation result:', newContract);

      if (newContract) {
        console.log('Contract created successfully, adding notification...');
        addNotification({
          userId: offer.providerId,
          title: "¡Nuevo Contrato!",
          description: `${user.name} ha aceptado tu oferta para "${offer.title}".`
        });

        console.log('Reloading contracts from storage...');
        loadContractsFromStorage();
        return { success: true, contract: newContract };
      } else {
        console.error('Failed to create contract - addData returned null');
        return { success: false, message: 'Error al crear el contrato.' };
      }
    } catch (error) {
      console.error('Error creating contract:', error);
      return { success: false, message: 'Error inesperado al crear el contrato.' };
    }
  };

  const markAsCompletedByProvider = async (contractId) => {
    const contract = contracts.find(c => c.id === contractId);
    if (!contract) return;

    await updateData('contracts', contractId, { completedByProvider: true });

    addNotification({
      userId: contract.clientId,
      title: "Trabajo Realizado",
      description: `${user.name} ha marcado el trabajo "${contract.title}" como realizado.`
    });
    loadContractsFromStorage();
  };

  const confirmCompletionAndReleasePayment = async (contractId) => {
    const contract = contracts.find(c => c.id === contractId);
    if (!contract) return;

    moveFromEscrowToProvider(contract.providerId, contract.price, `Pago liberado por: ${contract.title}`);

    await updateData('contracts', contractId, { completedByClient: true, status: 'completed' });

    addNotification({
      userId: contract.providerId,
      title: "¡Pago Liberado!",
      description: `${user.name} ha confirmado el trabajo y los fondos para "${contract.title}" han sido liberados.`
    });
    loadContractsFromStorage();
  };

  const addReview = async (contractId, reviewerId, revieweeId, rating, comment) => {
    const newReview = {
      contractId,
      reviewerId,
      revieweeId,
      rating,
      comment,
      createdAt: new Date().toISOString(),
    };
    const addedReview = await addData('reviews', newReview);

    const contract = contracts.find(c => c.id === contractId);
    if (!contract) return;

    const updatePayload = reviewerId === contract.providerId 
      ? { reviewByProvider: addedReview.id } 
      : { reviewByClient: addedReview.id };

    await updateData('contracts', contractId, updatePayload);

    addNotification({
      userId: revieweeId,
      title: "¡Nueva Reseña!",
      description: `Has recibido una reseña de ${user.name} por el trabajo "${contract.title}".`
    });
    loadContractsFromStorage();
  };

  const value = { contracts, createContract, markAsCompletedByProvider, confirmCompletionAndReleasePayment, addReview };

  return <ContractContext.Provider value={value}>{children}</ContractContext.Provider>;
};