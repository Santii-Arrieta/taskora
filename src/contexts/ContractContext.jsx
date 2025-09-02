import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useWallet } from './WalletContext';
import { useNotification } from './NotificationContext';
import { useData } from './DataContext';

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
        const storedContracts = await getData('contracts');
        const userContracts = storedContracts.filter(c => c.providerId === user.id || c.clientId === user.id);
        setContracts(userContracts);
    } else {
        setContracts([]);
    }
  }, [user, getData]);

  useEffect(() => {
    loadContractsFromStorage();
  }, [loadContractsFromStorage]);

  const createContract = async (offer) => {
    if (!user) return { success: false, message: 'Usuario no autenticado.' };

    const escrowResult = moveFromBalanceToEscrow(offer.price, `Pago en garantía para: ${offer.title}`);
    if (!escrowResult.success) {
      return { success: false, message: escrowResult.message };
    }

    const newContractData = {
      ...offer,
      status: 'active',
      createdAt: new Date().toISOString(),
      completedByProvider: false,
      completedByClient: false,
      reviewByProvider: null,
      reviewByClient: null,
    };
    
    const newContract = await addData('contracts', newContractData);

    addNotification({
      userId: offer.providerId,
      title: "¡Nuevo Contrato!",
      description: `${user.name} ha aceptado tu oferta para "${offer.title}".`
    });

    loadContractsFromStorage();
    return { success: true, contract: newContract };
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