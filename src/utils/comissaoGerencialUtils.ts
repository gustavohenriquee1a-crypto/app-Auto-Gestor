import { ConfiguracaoLoja, Usuario, VendaVeiculo } from '../types';

export interface CalculoComissaoGerencialResult {
  ativa: boolean;
  tipo: 'porcentagem_venda' | 'porcentagem_lucro' | 'fixo' | 'desativada' | 'manual';
  taxa: number;
  valor: number;
  beneficiarioId?: string;
  beneficiarioNome?: string;
  beneficiarioEmail?: string;
  descricaoRegra: string;
}

/**
 * Calcula a comissão gerencial (overriding) padrão para uma venda
 * respeitando as regras globais da loja ou personalizações do perfil do gestor.
 */
export function calcularComissaoGerencial(
  valorVenda: number,
  lucroEstimado: number,
  configLoja?: ConfiguracaoLoja | null,
  beneficiarioCustomizado?: Usuario | null,
  usuariosLoja: Usuario[] = []
): CalculoComissaoGerencialResult {
  // Identificar beneficiário padrão:
  // 1º: Beneficiário explicitado
  // 2º: Beneficiário configurado na loja
  // 3º: Primeiro admin ou gestor encontrado na loja
  let beneficiario = beneficiarioCustomizado;
  if (!beneficiario && configLoja?.comissaoGerenteBeneficiarioId) {
    beneficiario = usuariosLoja.find((u) => u.uid === configLoja.comissaoGerenteBeneficiarioId) || null;
  }
  if (!beneficiario) {
    beneficiario = usuariosLoja.find((u) => u.role === 'admin' || u.role === 'gestor') || null;
  }

  // Verificar se a comissão está ativa globalmente
  const isAtiva = configLoja?.comissaoGerenteAtiva !== false;

  if (!isAtiva) {
    return {
      ativa: false,
      tipo: 'desativada',
      taxa: 0,
      valor: 0,
      beneficiarioId: beneficiario?.uid || configLoja?.comissaoGerenteBeneficiarioId,
      beneficiarioNome: beneficiario?.displayName || configLoja?.comissaoGerenteBeneficiarioNome || 'Gestor Geral',
      beneficiarioEmail: beneficiario?.email || configLoja?.comissaoGerenteBeneficiarioEmail,
      descricaoRegra: 'Comissão Administrativa desativada na configuração geral',
    };
  }

  // Verificar se o beneficiário tem regra personalizada de overriding
  let tipo: 'porcentagem_venda' | 'porcentagem_lucro' | 'fixo' = 'porcentagem_venda';
  let taxa = 1.0; // Padrão 1% da venda

  if (beneficiario?.comissaoOverridingPersonalizada && beneficiario.comissaoOverridingTipo) {
    tipo = beneficiario.comissaoOverridingTipo;
    taxa = Number(beneficiario.comissaoOverridingTaxa ?? 1.0);
  } else if (configLoja?.comissaoGerenteTipo && configLoja.comissaoGerenteTipo !== 'desativada') {
    tipo = configLoja.comissaoGerenteTipo;
    taxa = Number(configLoja.comissaoGerenteTaxa ?? 1.0);
  }

  let valor = 0;
  let descricaoRegra = '';

  if (tipo === 'porcentagem_venda') {
    valor = (Math.max(0, valorVenda) * taxa) / 100;
    descricaoRegra = `${taxa.toFixed(2)}% sobre Valor Bruto da Venda`;
  } else if (tipo === 'porcentagem_lucro') {
    const lucroBase = Math.max(0, lucroEstimado);
    valor = (lucroBase * taxa) / 100;
    descricaoRegra = `${taxa.toFixed(2)}% sobre o Lucro Operacional do Veículo`;
  } else if (tipo === 'fixo') {
    valor = Math.max(0, taxa);
    descricaoRegra = `R$ ${taxa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} Fixo por Veículo`;
  }

  return {
    ativa: true,
    tipo,
    taxa,
    valor: Number(valor.toFixed(2)),
    beneficiarioId: beneficiario?.uid || configLoja?.comissaoGerenteBeneficiarioId || 'admin_geral',
    beneficiarioNome: beneficiario?.displayName || configLoja?.comissaoGerenteBeneficiarioNome || 'Diretoria / Gestor Geral',
    beneficiarioEmail: beneficiario?.email || configLoja?.comissaoGerenteBeneficiarioEmail,
    descricaoRegra,
  };
}

/**
 * Formata descrição amigável do modelo de remuneração gerencial
 */
export function formatarTipoComissaoGerencial(
  tipo?: string,
  taxa?: number
): string {
  if (!tipo || tipo === 'nenhuma' || tipo === 'desativada') return 'Sem Comissão';
  if (tipo === 'porcentagem_venda') return `${(taxa ?? 0).toFixed(2)}% sobre Venda`;
  if (tipo === 'porcentagem_lucro') return `${(taxa ?? 0).toFixed(2)}% sobre Lucro`;
  if (tipo === 'fixo') return `R$ ${(taxa ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} Fixo`;
  if (tipo === 'manual') return 'Ajuste Manual';
  return tipo;
}
