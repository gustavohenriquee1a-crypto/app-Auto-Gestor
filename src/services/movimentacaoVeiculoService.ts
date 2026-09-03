import {
  Veiculo,
  StatusEstoque,
  StatusVeiculo,
  EtapaKanbanPreparacao,
  Usuario,
  LogAuditoriaStatusEstoque,
  EventoHistoricoVeiculo,
  CategoriaFornecedor,
} from '../types';
import { formatarDataHoraAuditoria } from '../utils/auditLogger';
import { saveVeiculoFirestore } from './firestoreService';

export interface ParametrosMovimentacaoVeiculo {
  veiculo: Veiculo;
  novaEtapaKanban?: EtapaKanbanPreparacao;
  novoStatusEstoque?: StatusEstoque;
  fornecedorId?: string | null;
  fornecedorNome?: string | null;
  fornecedorCategoria?: CategoriaFornecedor | null;
  servicoDescricao?: string | null;
  km?: number;
  custo?: number;
  avaliacaoQualidade?: string;
  motivoObservacao?: string;
  usuario?: Usuario | null;
  origemModulo:
    | 'Funil de Preparação (Kanban)'
    | 'Fornecedores & Parceiros'
    | 'Retorno ao Pátio'
    | 'Envio para Serviço'
    | 'Logística & Trânsito'
    | 'Preparações & Oficina'
    | 'Dossiê do Veículo'
    | 'Estoque & Catálogo'
    | string;
}

/**
 * MOTOR CENTRAL DE MOVIMENTAÇÃO DE VEÍCULOS
 * 
 * Calcula e gera o objeto Veiculo 100% sincronizado com:
 * 1. status_estoque e etapaKanban unificados
 * 2. Atualização ou remoção do fornecedor/parceiro (para 'Veículos no Local')
 * 3. UM ÚNICO registro detalhado e imutável no 'Log de Auditoria de Status'
 * 4. Evento complementar na linha do tempo do chassi
 */
export function prepararMovimentacaoVeiculo(params: ParametrosMovimentacaoVeiculo): Veiculo {
  const {
    veiculo,
    novaEtapaKanban: etapaInformada,
    novoStatusEstoque: statusEstoqueInformado,
    fornecedorId,
    fornecedorNome,
    fornecedorCategoria,
    servicoDescricao,
    km,
    custo,
    avaliacaoQualidade,
    motivoObservacao,
    usuario,
    origemModulo = 'Movimentação do Veículo',
  } = params;

  const now = new Date();
  const hoje = now.toISOString().split('T')[0];

  const statusAnterior: StatusEstoque =
    veiculo.status_estoque || (veiculo.status === 'Em Preparação' ? 'Em Preparação' : 'No Pátio');
  const etapaAnterior: EtapaKanbanPreparacao =
    veiculo.etapaKanban || (statusAnterior === 'No Pátio' ? 'Pronto para Pátio' : 'Oficina');

  // 1. Determina Etapa Kanban e Status de Estoque alinhados
  let etapaFinal: EtapaKanbanPreparacao = etapaInformada || etapaAnterior;
  let statusEstoqueFinal: StatusEstoque = statusEstoqueInformado || statusAnterior;
  let statusVeiculoFinal: StatusVeiculo = veiculo.status;

  if (etapaInformada) {
    if (etapaInformada === 'Pronto para Pátio') {
      statusEstoqueFinal = 'No Pátio';
      etapaFinal = 'Pronto para Pátio';
      if (veiculo.status !== 'Vendido' && veiculo.status !== 'Alugado') {
        statusVeiculoFinal = 'Disponível';
      }
    } else if (etapaInformada === 'Oficina') {
      statusEstoqueFinal = 'Em Preparação';
      etapaFinal = 'Oficina';
      if (veiculo.status !== 'Vendido' && veiculo.status !== 'Alugado') {
        statusVeiculoFinal = 'Em Manutenção';
      }
    } else {
      // 'Funilaria' ou 'Estética' (Lavagem / Polimento)
      statusEstoqueFinal = 'Em Preparação';
      etapaFinal = etapaInformada;
      if (veiculo.status !== 'Vendido' && veiculo.status !== 'Alugado') {
        statusVeiculoFinal = 'Em Preparação';
      }
    }
  } else if (statusEstoqueInformado) {
    if (statusEstoqueInformado === 'No Pátio') {
      statusEstoqueFinal = 'No Pátio';
      etapaFinal = 'Pronto para Pátio';
      if (veiculo.status !== 'Vendido' && veiculo.status !== 'Alugado') {
        statusVeiculoFinal = 'Disponível';
      }
    } else if (statusEstoqueInformado === 'Em Preparação') {
      statusEstoqueFinal = 'Em Preparação';
      if (!veiculo.etapaKanban || veiculo.etapaKanban === 'Pronto para Pátio') {
        etapaFinal = 'Oficina';
      } else {
        etapaFinal = veiculo.etapaKanban;
      }
      if (veiculo.status !== 'Vendido' && veiculo.status !== 'Alugado') {
        statusVeiculoFinal = etapaFinal === 'Oficina' ? 'Em Manutenção' : 'Em Preparação';
      }
    } else if (statusEstoqueInformado === 'Em Trânsito') {
      statusEstoqueFinal = 'Em Trânsito';
      statusVeiculoFinal = 'Em Preparação';
      etapaFinal = 'Pronto para Pátio';
    } else if (statusEstoqueInformado === 'Vendido') {
      statusEstoqueFinal = 'Vendido';
      statusVeiculoFinal = 'Vendido';
      etapaFinal = 'Pronto para Pátio';
    }
  }

  // 2. KM Atualizado
  const kmAtualizado = km !== undefined ? Math.max(veiculo.kmAtual || 0, km) : veiculo.kmAtual;
  const diferencaKm = km !== undefined && veiculo.kmAtual ? Math.max(0, km - veiculo.kmAtual) : 0;

  // 3. Regra de Parceiro/Fornecedor:
  // Se estiver indo para 'No Pátio' (ou 'Pronto para Pátio') ou 'Vendido', o veículo SAI do fornecedor
  const estaSaindoParaPatio = statusEstoqueFinal === 'No Pátio' || etapaFinal === 'Pronto para Pátio' || statusEstoqueFinal === 'Vendido';

  const parceiroAnteriorNome = veiculo.fornecedorAtualNome;
  const servicoAnteriorNome = veiculo.servicoAtualEmAndamento;

  let novoFornecedorId: string | undefined;
  let novoFornecedorNome: string | undefined;
  let novoFornecedorCategoria: CategoriaFornecedor | undefined;
  let novoServicoEmAndamento: string | undefined;
  let statusPrepOficina: Veiculo['statusPreparacaoOficina'];

  if (estaSaindoParaPatio) {
    // Limpa totalmente a associação de fornecedor ativo para retirá-lo de 'Veículos no Local'
    novoFornecedorId = undefined;
    novoFornecedorNome = undefined;
    novoFornecedorCategoria = undefined;
    novoServicoEmAndamento = undefined;
    statusPrepOficina = 'Pátio / Pronto';
  } else {
    // Permanecendo ou entrando em preparação
    novoFornecedorId = fornecedorId !== undefined ? (fornecedorId || undefined) : veiculo.fornecedorAtualId;
    novoFornecedorNome = fornecedorNome !== undefined ? (fornecedorNome || undefined) : veiculo.fornecedorAtualNome;
    novoFornecedorCategoria = fornecedorCategoria !== undefined 
      ? (fornecedorCategoria || undefined) 
      : (veiculo.fornecedorAtualCategoria || (etapaFinal === 'Oficina' ? 'Oficina Mecânica' : etapaFinal === 'Funilaria' ? 'Funilaria e Pintura' : 'Lava Jato / Estética Automotiva'));
    novoServicoEmAndamento = servicoDescricao !== undefined 
      ? (servicoDescricao || undefined) 
      : (veiculo.servicoAtualEmAndamento || `Serviços de ${etapaFinal}`);
    statusPrepOficina = 'Em Execução';
  }

  // 4. Identificação do Operador
  const usuarioNome = usuario?.displayName || (usuario?.email ? usuario.email.split('@')[0] : 'Administrador');
  const usuarioEmail = usuario?.email || undefined;
  const usuarioId = usuario?.uid || (usuario as any)?.id || undefined;
  const usuarioRole = usuario?.role || undefined;

  // 5. Construção da Descrição Rica e Objetiva para Auditoria
  let detalheAuditoria = motivoObservacao?.trim();
  if (!detalheAuditoria) {
    if (estaSaindoParaPatio) {
      const partePrestador = parceiroAnteriorNome ? ` • Prestador anterior: ${parceiroAnteriorNome}` : '';
      const parteServico = servicoAnteriorNome ? ` • Serviço concluído: ${servicoAnteriorNome}` : '';
      const parteKm = km !== undefined ? ` • Odômetro: ${km.toLocaleString('pt-BR')} km` : '';
      const parteCusto = custo ? ` • Custo: R$ ${custo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '';
      detalheAuditoria = `Saída da etapa "${etapaAnterior}" para o Pátio da Loja (Showroom Liberado)${partePrestador}${parteServico}${parteKm}${parteCusto}`;
    } else if (etapaFinal !== etapaAnterior) {
      const parteNovoPrestador = novoFornecedorNome ? ` • Prestador: ${novoFornecedorNome}` : '';
      const parteNovoServico = novoServicoEmAndamento ? ` • Serviço: ${novoServicoEmAndamento}` : '';
      detalheAuditoria = `Movimentado no Funil de "${etapaAnterior}" para "${etapaFinal}"${parteNovoPrestador}${parteNovoServico}`;
    } else {
      detalheAuditoria = `Status de estoque alterado de "${statusAnterior}" para "${statusEstoqueFinal}"`;
    }
  }

  // 6. Gerar UM ÚNICO registro de auditoria imutável
  const novoLogAuditoria: LogAuditoriaStatusEstoque = {
    id: `audit_${now.getTime()}_${Math.random().toString(36).substring(2, 7)}`,
    dataHora: now.toISOString(),
    dataHoraFormatada: formatarDataHoraAuditoria(now.toISOString()),
    statusAnterior,
    statusNovo: statusEstoqueFinal,
    usuarioNome,
    usuarioEmail,
    usuarioId,
    usuarioRole,
    origemModulo,
    motivoObservacao: detalheAuditoria,
  };

  // 7. Evento da Linha do Tempo do Veículo (Dossiê)
  const tipoEvento: EventoHistoricoVeiculo['tipo'] = estaSaindoParaPatio
    ? 'Retorno ao Pátio'
    : etapaFinal === 'Oficina'
    ? 'Envio para Oficina'
    : 'Preparação / Estética';

  const tituloEvento = estaSaindoParaPatio
    ? 'Retorno ao Pátio / Showroom Liberado'
    : `Movimentação: Etapa ${etapaFinal}`;

  const novoEventoHistorico: EventoHistoricoVeiculo = {
    id: `hs-mov-${now.getTime()}-${Math.random().toString(36).substring(2, 6)}`,
    data: hoje,
    tipo: tipoEvento,
    titulo: tituloEvento,
    descricao: [
      detalheAuditoria,
      avaliacaoQualidade ? `Avaliação de Qualidade: ${avaliacaoQualidade}.` : null,
      diferencaKm > 0 ? `Rodou +${diferencaKm} km no translado.` : null,
    ].filter(Boolean).join(' '),
    statusResultante: statusVeiculoFinal,
    km: kmAtualizado,
    fornecedorOficina: estaSaindoParaPatio ? parceiroAnteriorNome : novoFornecedorNome,
    valor: custo,
    usuarioRegistro: usuarioNome,
    observacoes: motivoObservacao,
  };

  // 8. Evita registros duplicados consecutivos gerados no mesmo segundo
  const logsAtuais = veiculo.historicoAuditoriaStatus || [];
  const ultimoLog = logsAtuais[0];
  const isLogDuplicado =
    ultimoLog &&
    ultimoLog.statusNovo === statusEstoqueFinal &&
    ultimoLog.motivoObservacao === detalheAuditoria &&
    now.getTime() - new Date(ultimoLog.dataHora).getTime() < 2000;

  const logsFinais = isLogDuplicado ? logsAtuais : [novoLogAuditoria, ...logsAtuais];
  const eventosFinais = [novoEventoHistorico, ...(veiculo.historicoStatus || [])];

  return {
    ...veiculo,
    status_estoque: statusEstoqueFinal,
    status: statusVeiculoFinal,
    etapaKanban: etapaFinal,
    kmAtual: kmAtualizado,
    statusPreparacaoOficina: statusPrepOficina,
    data_chegada_patio: estaSaindoParaPatio ? (veiculo.data_chegada_patio || hoje) : veiculo.data_chegada_patio,
    dataEntradaPatio: estaSaindoParaPatio ? (veiculo.dataEntradaPatio || hoje) : veiculo.dataEntradaPatio,
    fornecedorAtualId: novoFornecedorId,
    fornecedorAtualNome: novoFornecedorNome,
    fornecedorAtualCategoria: novoFornecedorCategoria,
    servicoAtualEmAndamento: novoServicoEmAndamento,
    previsaoRetornoOficina: estaSaindoParaPatio ? undefined : veiculo.previsaoRetornoOficina,
    custoEstimadoServico: estaSaindoParaPatio ? undefined : veiculo.custoEstimadoServico,
    historicoAuditoriaStatus: logsFinais,
    historicoStatus: eventosFinais,
  };
}

/**
 * EXECUTA A MOVIMENTAÇÃO DE FORMA CENTRALIZADA
 * 
 * Prepara o veículo com todas as regras e persiste no Firestore em transação única.
 */
export async function executarMovimentacaoVeiculo(
  params: ParametrosMovimentacaoVeiculo
): Promise<Veiculo> {
  const veiculoAtualizado = prepararMovimentacaoVeiculo(params);
  await saveVeiculoFirestore(veiculoAtualizado);
  return veiculoAtualizado;
}
