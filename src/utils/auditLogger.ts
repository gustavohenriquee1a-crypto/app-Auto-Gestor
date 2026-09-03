import { 
  Veiculo, 
  StatusEstoque, 
  StatusVeiculo,
  EtapaKanbanPreparacao,
  Usuario, 
  LogAuditoriaStatusEstoque, 
  EventoHistoricoVeiculo,
  CategoriaFornecedor
} from '../types';

/**
 * Formata um timestamp ISO para o formato 'DD/MM/AAAA às HH:mm'
 */
export const formatarDataHoraAuditoria = (dateIsoOrStr?: string): string => {
  if (!dateIsoOrStr) return '-';
  try {
    const d = new Date(dateIsoOrStr);
    if (isNaN(d.getTime())) return dateIsoOrStr;
    const dataStr = d.toLocaleDateString('pt-BR');
    const horaStr = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return `${dataStr} às ${horaStr}`;
  } catch {
    return dateIsoOrStr;
  }
};

/**
 * Cria uma entrada de Log de Auditoria para alterações de status de estoque
 */
export const criarLogAuditoriaStatus = ({
  statusAnterior,
  statusNovo,
  usuario,
  origemModulo,
  motivoObservacao,
}: {
  statusAnterior?: string;
  statusNovo: StatusEstoque | string;
  usuario?: Usuario | null;
  origemModulo: string;
  motivoObservacao?: string;
}): LogAuditoriaStatusEstoque => {
  const now = new Date();
  const usuarioNome = usuario?.displayName || (usuario?.email ? usuario.email.split('@')[0] : 'Administrador');
  const usuarioEmail = usuario?.email || undefined;
  const usuarioId = usuario?.uid || (usuario as any)?.id || undefined;
  const usuarioRole = usuario?.role || undefined;

  return {
    id: `audit_${now.getTime()}_${Math.random().toString(36).substring(2, 7)}`,
    dataHora: now.toISOString(),
    dataHoraFormatada: `${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
    statusAnterior: statusAnterior || 'Não Definido',
    statusNovo: statusNovo as StatusEstoque,
    usuarioNome,
    usuarioEmail,
    usuarioId,
    usuarioRole,
    origemModulo,
    motivoObservacao: motivoObservacao?.trim() || `Status alterado de "${statusAnterior || 'Inicial'}" para "${statusNovo}"`,
  };
};

/**
 * Interface com todos os parâmetros para envio de veículo para serviço / preparação
 */
export interface ParametrosEnviarServico {
  veiculo: Veiculo;
  etapaKanban: EtapaKanbanPreparacao; // 'Oficina' | 'Funilaria' | 'Estética'
  motivoSaida: string;
  servicoDescricao?: string;
  fornecedorId?: string;
  fornecedorNome?: string;
  fornecedorCategoria?: CategoriaFornecedor;
  kmSaida?: number;
  previsaoRetorno?: string;
  dataSaida?: string;
  custoEstimado?: number;
  motoristaTranslado?: string;
  observacoes?: string;
  usuario?: Usuario | null;
  origemModulo?: string;
}

/**
 * Interface para retorno de veículo ao pátio (Showroom)
 */
export interface ParametrosRetornoPatio {
  veiculo: Veiculo;
  kmRetorno?: number;
  dataRetorno?: string;
  custoRealizado?: number;
  avaliacaoQualidade?: string;
  observacoes?: string;
  usuario?: Usuario | null;
  origemModulo?: string;
}

/**
 * MOTOR CENTRAL: Sincroniza e aplica a saída de um veículo para serviço/preparação
 * Atualiza status operacional, etapa do Kanban, fornecedor em andamento e linha do tempo
 */
export const aplicarEnvioServico = (params: ParametrosEnviarServico): Veiculo => {
  const {
    veiculo,
    etapaKanban,
    motivoSaida,
    servicoDescricao,
    fornecedorId,
    fornecedorNome,
    fornecedorCategoria,
    kmSaida,
    previsaoRetorno,
    dataSaida = new Date().toISOString().split('T')[0],
    custoEstimado,
    motoristaTranslado,
    observacoes,
    usuario,
    origemModulo = 'Funil de Preparação',
  } = params;

  // Unificação de Status:
  // - Oficina: status = 'Em Manutenção', etapaKanban = 'Oficina', status_estoque = 'Em Preparação'
  // - Funilaria: status = 'Em Preparação', etapaKanban = 'Funilaria', status_estoque = 'Em Preparação'
  // - Estética: status = 'Em Preparação', etapaKanban = 'Estética', status_estoque = 'Em Preparação'
  const novoStatusVeiculo: StatusVeiculo = etapaKanban === 'Oficina' ? 'Em Manutenção' : 'Em Preparação';
  const novoStatusEstoque: StatusEstoque = 'Em Preparação';

  const usuarioNome = usuario?.displayName || (usuario?.email ? usuario.email.split('@')[0] : 'Administrador');
  const servicoNome = servicoDescricao || motivoSaida || `Preparação (${etapaKanban})`;
  const kmAtualizado = kmSaida !== undefined ? Math.max(veiculo.kmAtual || 0, kmSaida) : veiculo.kmAtual;

  // 1. Cria o log de auditoria de estoque
  const statusAnterior = veiculo.status_estoque || (veiculo.status === 'Em Preparação' ? 'Em Preparação' : 'No Pátio');
  const novoLog = criarLogAuditoriaStatus({
    statusAnterior,
    statusNovo: novoStatusEstoque,
    usuario,
    origemModulo,
    motivoObservacao: `Envio para ${etapaKanban} (${servicoNome})${fornecedorNome ? ` - Prestador: ${fornecedorNome}` : ''}`,
  });

  // 2. Cria o evento rico na linha do tempo do chassi
  const tipoEvento: EventoHistoricoVeiculo['tipo'] = etapaKanban === 'Oficina' ? 'Envio para Oficina' : 'Preparação / Estética';
  const novoEventoHistorico: EventoHistoricoVeiculo = {
    id: `hs-servico-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    data: dataSaida,
    tipo: tipoEvento,
    titulo: `Saída para ${etapaKanban}: ${servicoNome}`,
    descricao: [
      `Veículo enviado para a etapa "${etapaKanban}".`,
      fornecedorNome ? `Prestador: ${fornecedorNome}.` : null,
      motivoSaida ? `Motivo: ${motivoSaida}.` : null,
      previsaoRetorno ? `Previsão de Retorno: ${previsaoRetorno}.` : null,
      kmSaida !== undefined ? `KM de Saída: ${kmSaida.toLocaleString('pt-BR')} km.` : null,
      custoEstimado ? `Custo Estimado: R$ ${custoEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.` : null,
      motoristaTranslado ? `Responsável pelo transporte: ${motoristaTranslado}.` : null,
      observacoes ? `Obs: ${observacoes}` : null,
    ].filter(Boolean).join(' '),
    statusResultante: novoStatusVeiculo,
    km: kmAtualizado,
    fornecedorOficina: fornecedorNome,
    motoristaNome: motoristaTranslado,
    valor: custoEstimado,
    usuarioRegistro: usuarioNome,
    observacoes,
  };

  const logsExistentes = veiculo.historicoAuditoriaStatus || [];
  const eventosExistentes = veiculo.historicoStatus || [];

  return {
    ...veiculo,
    status: novoStatusVeiculo,
    status_estoque: novoStatusEstoque,
    etapaKanban,
    kmAtual: kmAtualizado,
    fornecedorAtualId: fornecedorId || veiculo.fornecedorAtualId,
    fornecedorAtualNome: fornecedorNome || veiculo.fornecedorAtualNome,
    fornecedorAtualCategoria: fornecedorCategoria || (etapaKanban === 'Oficina' ? 'Oficina Mecânica' : etapaKanban === 'Funilaria' ? 'Funilaria e Pintura' : 'Lava Jato / Estética Automotiva'),
    servicoAtualEmAndamento: servicoNome,
    dataEnvioOficina: dataSaida,
    previsaoRetornoOficina: previsaoRetorno || veiculo.previsaoRetornoOficina,
    statusPreparacaoOficina: 'Em Execução',
    custoEstimadoServico: custoEstimado !== undefined ? custoEstimado : veiculo.custoEstimadoServico,
    historicoAuditoriaStatus: [novoLog, ...logsExistentes],
    historicoStatus: [novoEventoHistorico, ...eventosExistentes],
  };
};

/**
 * MOTOR CENTRAL: Sincroniza e aplica o retorno do veículo ao showroom/pátio
 * Finaliza o ciclo, atualiza KM de chegada, coloca em 'Disponível' / 'Pronto para Pátio'
 */
export const aplicarRetornoPatio = (params: ParametrosRetornoPatio): Veiculo => {
  const {
    veiculo,
    kmRetorno,
    dataRetorno = new Date().toISOString().split('T')[0],
    custoRealizado,
    avaliacaoQualidade,
    observacoes,
    usuario,
    origemModulo = 'Funil de Preparação',
  } = params;

  const novoStatusVeiculo: StatusVeiculo = veiculo.status === 'Alugado' || veiculo.status === 'Vendido' ? veiculo.status : 'Disponível';
  const novoStatusEstoque: StatusEstoque = 'No Pátio';
  const novaEtapaKanban: EtapaKanbanPreparacao = 'Pronto para Pátio';

  const usuarioNome = usuario?.displayName || (usuario?.email ? usuario.email.split('@')[0] : 'Administrador');
  const kmAtualizado = kmRetorno !== undefined ? Math.max(veiculo.kmAtual || 0, kmRetorno) : veiculo.kmAtual;
  const kmRodadoNoServico = kmRetorno !== undefined && veiculo.kmAtual ? Math.max(0, kmRetorno - veiculo.kmAtual) : 0;

  // 1. Log de auditoria
  const statusAnterior = veiculo.status_estoque || (veiculo.status === 'Em Preparação' ? 'Em Preparação' : 'No Pátio');
  const novoLog = criarLogAuditoriaStatus({
    statusAnterior,
    statusNovo: novoStatusEstoque,
    usuario,
    origemModulo,
    motivoObservacao: `Retorno ao Showroom / Pátio liberado para venda.${veiculo.servicoAtualEmAndamento ? ` Conclusão: ${veiculo.servicoAtualEmAndamento}` : ''}`,
  });

  // 2. Evento de Linha do Tempo
  const novoEventoHistorico: EventoHistoricoVeiculo = {
    id: `hs-retorno-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    data: dataRetorno,
    tipo: 'Retorno ao Pátio',
    titulo: 'Retorno ao Pátio / Showroom Liberado',
    descricao: [
      `Veículo retornou ao pátio e está 100% pronto e disponível para venda/exibição.`,
      veiculo.servicoAtualEmAndamento ? `Serviço concluído: "${veiculo.servicoAtualEmAndamento}".` : null,
      veiculo.fornecedorAtualNome ? `Executado por: ${veiculo.fornecedorAtualNome}.` : null,
      kmRetorno !== undefined ? `Odômetro final: ${kmRetorno.toLocaleString('pt-BR')} km (${kmRodadoNoServico > 0 ? `+${kmRodadoNoServico} km rodados` : 'mesmo KM'}).` : null,
      custoRealizado ? `Custo final registrado: R$ ${custoRealizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.` : null,
      avaliacaoQualidade ? `Avaliação de Qualidade: ${avaliacaoQualidade}.` : null,
      observacoes ? `Obs: ${observacoes}` : null,
    ].filter(Boolean).join(' '),
    statusResultante: novoStatusVeiculo,
    km: kmAtualizado,
    fornecedorOficina: veiculo.fornecedorAtualNome,
    valor: custoRealizado || veiculo.custoEstimadoServico,
    usuarioRegistro: usuarioNome,
    observacoes,
  };

  const logsExistentes = veiculo.historicoAuditoriaStatus || [];
  const eventosExistentes = veiculo.historicoStatus || [];

  return {
    ...veiculo,
    status: novoStatusVeiculo,
    status_estoque: novoStatusEstoque,
    etapaKanban: novaEtapaKanban,
    kmAtual: kmAtualizado,
    statusPreparacaoOficina: 'Pátio / Pronto',
    data_chegada_patio: veiculo.data_chegada_patio || dataRetorno,
    dataEntradaPatio: veiculo.dataEntradaPatio || dataRetorno,
    // Limpa associação com o prestador ativo para remover da lista 'Veículos no Local'
    fornecedorAtualId: undefined,
    fornecedorAtualNome: undefined,
    fornecedorAtualCategoria: undefined,
    servicoAtualEmAndamento: undefined,
    previsaoRetornoOficina: undefined,
    custoEstimadoServico: undefined,
    historicoAuditoriaStatus: [novoLog, ...logsExistentes],
    historicoStatus: [novoEventoHistorico, ...eventosExistentes],
  };
};

/**
 * Registra a transição de status de estoque no veículo com log de auditoria simplificado
 * Sincroniza automaticamente com etapaKanban e status operacional
 */
export const registrarMudancaStatusEstoque = (
  veiculo: Veiculo,
  statusNovo: StatusEstoque,
  usuario?: Usuario | null,
  origemModulo: string = 'Estoque',
  motivoObservacao?: string
): Veiculo => {
  const statusAnterior = veiculo.status_estoque || (veiculo.status === 'Em Preparação' ? 'Em Preparação' : 'No Pátio');

  // Se o status não mudou, apenas retorna o veículo sem duplicar log
  if (statusAnterior === statusNovo && veiculo.historicoAuditoriaStatus && veiculo.historicoAuditoriaStatus.length > 0) {
    return veiculo;
  }

  const novoLog = criarLogAuditoriaStatus({
    statusAnterior,
    statusNovo,
    usuario,
    origemModulo,
    motivoObservacao,
  });

  const hoje = new Date().toISOString().split('T')[0];

  // Inferência automática de Etapa Kanban baseada no status de estoque
  let etapaKanbanSincronizada: EtapaKanbanPreparacao = veiculo.etapaKanban || 'Oficina';
  let statusVeiculoSincronizado: StatusVeiculo = veiculo.status;

  if (statusNovo === 'No Pátio') {
    etapaKanbanSincronizada = 'Pronto para Pátio';
    if (veiculo.status !== 'Alugado' && veiculo.status !== 'Vendido') {
      statusVeiculoSincronizado = 'Disponível';
    }
  } else if (statusNovo === 'Em Preparação') {
    if (!veiculo.etapaKanban || veiculo.etapaKanban === 'Pronto para Pátio') {
      etapaKanbanSincronizada = 'Estética';
    }
    if (veiculo.status !== 'Alugado' && veiculo.status !== 'Vendido') {
      statusVeiculoSincronizado = etapaKanbanSincronizada === 'Oficina' ? 'Em Manutenção' : 'Em Preparação';
    }
  } else if (statusNovo === 'Vendido') {
    statusVeiculoSincronizado = 'Vendido';
    etapaKanbanSincronizada = 'Pronto para Pátio';
  }

  // Criação de evento na linha do tempo para complementar
  const novoEventoHistorico: EventoHistoricoVeiculo = {
    id: `hs-audit-${Date.now()}`,
    data: hoje,
    tipo: 'Mudança de Status',
    titulo: `Status de Estoque: ${statusNovo}`,
    descricao: `Movido de "${statusAnterior}" para "${statusNovo}" por ${novoLog.usuarioNome} via ${origemModulo}.${motivoObservacao ? ` Obs: ${motivoObservacao}` : ''}`,
    statusResultante: statusVeiculoSincronizado,
    usuarioRegistro: novoLog.usuarioNome,
  };

  const logsExistentes = veiculo.historicoAuditoriaStatus || [];
  const eventosExistentes = veiculo.historicoStatus || [];

  return {
    ...veiculo,
    status_estoque: statusNovo,
    status: statusVeiculoSincronizado,
    etapaKanban: etapaKanbanSincronizada,
    data_chegada_patio: statusNovo === 'No Pátio' && !veiculo.data_chegada_patio ? hoje : veiculo.data_chegada_patio,
    dataEntradaPatio: statusNovo === 'No Pátio' && !veiculo.dataEntradaPatio ? hoje : veiculo.dataEntradaPatio,
    historicoAuditoriaStatus: [novoLog, ...logsExistentes],
    historicoStatus: [novoEventoHistorico, ...eventosExistentes],
  };
};

