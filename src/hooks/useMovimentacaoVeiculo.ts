import { useState } from 'react';
import { Veiculo, Usuario } from '../types';
import {
  ParametrosMovimentacaoVeiculo,
  executarMovimentacaoVeiculo,
  prepararMovimentacaoVeiculo,
} from '../services/movimentacaoVeiculoService';

interface UseMovimentacaoVeiculoProps {
  onSuccess?: (veiculoAtualizado: Veiculo) => void;
  onError?: (erro: any) => void;
  currentUser?: Usuario | null;
}

export function useMovimentacaoVeiculo({
  onSuccess,
  onError,
  currentUser,
}: UseMovimentacaoVeiculoProps = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const movimentar = async (params: ParametrosMovimentacaoVeiculo): Promise<Veiculo> => {
    setLoading(true);
    setError(null);
    try {
      const paramsComUsuario: ParametrosMovimentacaoVeiculo = {
        ...params,
        usuario: params.usuario || currentUser || null,
      };
      const veiculoAtualizado = await executarMovimentacaoVeiculo(paramsComUsuario);
      if (onSuccess) {
        onSuccess(veiculoAtualizado);
      }
      return veiculoAtualizado;
    } catch (err: any) {
      console.error('Erro ao movimentar veículo:', err);
      const msg = err?.message || 'Falha ao salvar movimentação do veículo.';
      setError(msg);
      if (onError) {
        onError(err);
      }
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    movimentar,
    preparar: prepararMovimentacaoVeiculo,
    loading,
    error,
  };
}
