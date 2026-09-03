import { BancoParceiro } from '../types';
import {
  subscribeBancos as subscribeBancosFirestore,
  saveBancoFirestore,
  deleteBancoFirestore,
} from './firestoreService';

export const bancosService = {
  subscribeBancos: (
    onData: (bancos: BancoParceiro[]) => void,
    onError?: (error: Error) => void
  ) => {
    return subscribeBancosFirestore(onData, onError);
  },

  saveBanco: async (
    bancoData: Omit<BancoParceiro, 'id'>,
    idToEdit?: string
  ): Promise<string> => {
    const id = idToEdit || `banco_${Date.now()}`;
    const banco: BancoParceiro = {
      ...bancoData,
      id,
    };
    await saveBancoFirestore(banco);
    return id;
  },

  deleteBanco: async (bancoId: string): Promise<void> => {
    await deleteBancoFirestore(bancoId);
  },

  toggleStatus: async (
    bancoId: string,
    novoStatus: 'Ativo' | 'Inativo' | 'ativo' | 'inativo'
  ): Promise<void> => {
    const formattedStatus: 'Ativo' | 'Inativo' =
      novoStatus.toLowerCase() === 'ativo' ? 'Ativo' : 'Inativo';
    const bancoTemp: Partial<BancoParceiro> & { id: string } = {
      id: bancoId,
      status: formattedStatus,
    };
    // Salvar merge com o Firestore
    await saveBancoFirestore(bancoTemp as BancoParceiro);
  },
};
