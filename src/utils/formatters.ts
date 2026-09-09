import { Veiculo, AgingSummary, ContratoLocacao, PagamentoAluguel, ItemManutencaoPreventiva, DebitoMotorista, VendaVeiculo, DespesaFixa, CategoriaDespesa, DespesaVeiculo } from '../types';

/**
 * Categorias de Repasse de Lucro e Distribuições.
 * NUNCA devem ser somadas ao Custo do Veículo (oficina/preparação).
 * São deduzidas no DRE apenas após a apuração do Lucro Bruto Operacional (Margem Bruta).
 */
export const CATEGORIAS_REPASSES_DISTRIBUICOES: CategoriaDespesa[] = [
  'Repasse de Lucro - Parceiro',
  'Distribuição de Lucro - Sócio/Dono',
  'Comissão/Bônus Extra - Funcionário',
  'Pró-labore',
];

export const isCategoriaRepasseDistribuicao = (categoria?: string): boolean => {
  if (!categoria) return false;
  return (
    categoria === 'Repasse de Lucro - Parceiro' ||
    categoria === 'Distribuição de Lucro - Sócio/Dono' ||
    categoria === 'Comissão/Bônus Extra - Funcionário' ||
    categoria === 'Pró-labore'
  );
};

export const normalizeDateString = (dateVal: any): string => {
  if (!dateVal) return '';
  if (typeof dateVal === 'string') return dateVal;
  if (typeof dateVal === 'object') {
    if (typeof dateVal.toDate === 'function') {
      try {
        return dateVal.toDate().toISOString().split('T')[0];
      } catch {
        // fallback
      }
    }
    if ('seconds' in dateVal && typeof dateVal.seconds === 'number') {
      try {
        return new Date(dateVal.seconds * 1000).toISOString().split('T')[0];
      } catch {
        // fallback
      }
    }
    if (dateVal instanceof Date) {
      try {
        return isNaN(dateVal.getTime()) ? '' : dateVal.toISOString().split('T')[0];
      } catch {
        // fallback
      }
    }
  }
  return String(dateVal || '');
};

export const formatCurrency = (val: number | string | undefined | null): string => {
  const num = typeof val === 'number' ? val : Number(val);
  const safeVal = isNaN(num) ? 0 : num;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeVal);
};

export const formatCurrencyDetailed = (val: number | string | undefined | null): string => {
  const num = typeof val === 'number' ? val : Number(val);
  const safeVal = isNaN(num) ? 0 : num;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeVal);
};

export const formatPercent = (val: number): string => {
  return `${(val || 0).toFixed(1)}%`;
};

export const formatDate = (dateStr: any): string => {
  if (!dateStr) return '-';
  try {
    const normalized = normalizeDateString(dateStr);
    if (!normalized) return '-';
    const dateOnly = normalized.split('T')[0];
    const parts = dateOnly.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const d = new Date(normalized);
    return isNaN(d.getTime()) ? normalized : d.toLocaleDateString('pt-BR');
  } catch {
    return typeof dateStr === 'string' ? dateStr : '-';
  }
};

export const formatKm = (km: number): string => {
  return `${(km || 0).toLocaleString('pt-BR')} km`;
};

export const formatKM = formatKm;

/**
 * Retorna a data de referência a ser usada para o cálculo de aging de pátio do veículo.
 * O relógio de Aging comercial SÓ conta a partir da data de chegada física ao pátio ('data_chegada_patio' ou 'dataEntradaPatio').
 * Veículos 'Em Trânsito' ou 'Em Preparação' não inflam os dias de Aging de pátio.
 */
export const getAgingDate = (veiculoOrData?: string | Partial<Veiculo>): string => {
  if (!veiculoOrData) return '';
  if (typeof veiculoOrData === 'string') return veiculoOrData;
  
  // Se estiver em trânsito ou em preparação e não tiver chegado ao pátio
  if (veiculoOrData.status_estoque === 'Em Trânsito') {
    return '';
  }
  if (veiculoOrData.status_estoque === 'Em Preparação' && !veiculoOrData.data_chegada_patio) {
    return '';
  }

  if (veiculoOrData.baseCalculoAging === 'dataAquisicao' && veiculoOrData.dataAquisicao) {
    return veiculoOrData.dataAquisicao;
  }
  return veiculoOrData.data_chegada_patio || veiculoOrData.dataEntradaPatio || veiculoOrData.dataEntrada || veiculoOrData.dataAquisicao || '';
};

/**
 * Calcula os dias totais desde a compra (ciclo completo aquisição + transporte + preparação + pátio)
 */
export const calculateTotalCicloDias = (dataAquisicao?: string): number => {
  if (!dataAquisicao) return 0;
  try {
    const today = new Date();
    const acqDate = new Date(dataAquisicao);
    const diffTime = Math.abs(today.getTime() - acqDate.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
};

export const calculateAging = (veiculoOrData?: string | Partial<Veiculo>): AgingSummary => {
  if (typeof veiculoOrData === 'object' && veiculoOrData !== null) {
    if (veiculoOrData.status_estoque === 'Em Trânsito') {
      return {
        dias: 0,
        faixa: '0-30',
        badgeColor: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
        textColor: 'text-indigo-400',
        descricaoFaixa: 'Em Trânsito / Guincho',
        alertaAcao: 'Aguardando Chegada na Cidade',
      };
    }
    if (veiculoOrData.status_estoque === 'Em Preparação' && !veiculoOrData.data_chegada_patio) {
      return {
        dias: 0,
        faixa: '0-30',
        badgeColor: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        textColor: 'text-amber-400',
        descricaoFaixa: 'Em Preparação / Oficina',
        alertaAcao: 'Em Revisão Externa (Fora do Pátio)',
      };
    }
  }

  const dataReferencia = getAgingDate(veiculoOrData);
  if (!dataReferencia) {
    return {
      dias: 0,
      faixa: '0-30',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      textColor: 'text-emerald-400',
      descricaoFaixa: 'Giro Rápido',
      alertaAcao: 'Margem Máxima',
    };
  }

  const today = new Date();
  const entryDate = new Date(dataReferencia);
  const diffTime = Math.abs(today.getTime() - entryDate.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays > 60) {
    return {
      dias: diffDays,
      faixa: '60+',
      badgeColor: 'bg-rose-500/15 text-rose-400 border-rose-500/30 animate-pulse',
      textColor: 'text-rose-400 font-bold',
      descricaoFaixa: 'Crítico / Encalhado',
      alertaAcao: 'Queima de Estoque / Acelerar Venda',
    };
  }
  if (diffDays > 30) {
    return {
      dias: diffDays,
      faixa: '31-60',
      badgeColor: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      textColor: 'text-amber-400 font-semibold',
      descricaoFaixa: 'Atenção / Pátio Médio',
      alertaAcao: 'Ajustar Preço / Impulsionar Anúncios',
    };
  }
  return {
    dias: diffDays,
    faixa: '0-30',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    textColor: 'text-emerald-400 font-medium',
    descricaoFaixa: 'Giro Rápido',
    alertaAcao: 'Margem Máxima Preservada',
  };
};

/**
 * Calcula apenas os custos genuínos de oficina, peças, recondicionamento e preparação do chassi.
 * Garante que:
 * 1. Despesas canceladas ou estornadas sejam desconsideradas.
 * 2. Nenhuma despesa de repasse, sócios, pró-labore ou bônus de sócios seja somada ao custo do veículo.
 * 3. Comissões de venda / gerenciais sejam segregadas e NUNCA somadas aqui, eliminando a dupla dedução no DRE e lucro por chassi.
 */
export const calculateTotalDespesas = (
  input: Veiculo | DespesaVeiculo[] | { despesas?: DespesaVeiculo[] } | undefined | null
): number => {
  if (!input) return 0;
  const despesas = Array.isArray(input) ? input : (input.despesas || []);
  if (!despesas || despesas.length === 0) return 0;
  return despesas
    .filter((curr) => {
      if (!curr) return false;
      // Excluir despesas canceladas ou estornadas
      if (
        curr.statusPagamento === 'Cancelada' ||
        curr.statusPagamento === 'Estornada' ||
        curr.statusEstorno === 'Estornado'
      ) {
        return false;
      }
      // Excluir repasses e distribuições de sócios
      if (isCategoriaRepasseDistribuicao(curr.categoria)) {
        return false;
      }
      // Segregação estrita: comissões comerciais de venda/gestor não são custos operacionais de preparação do chassi
      if (
        curr.categoria === 'Comissão' ||
        curr.tipoComissaoOrigem === 'manual_previsao' ||
        curr.tipoComissaoOrigem === 'automatica_venda' ||
        curr.tipoComissaoOrigem === 'automatica_gerencial' ||
        curr.descricao?.toLowerCase().includes('comissão da venda') ||
        curr.descricao?.toLowerCase().includes('comissão administrativa')
      ) {
        return false;
      }
      return true;
    })
    .reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);
};

export const calculateCustoTotal = (veiculo: Veiculo): number => {
  return (Number(veiculo.custoAquisicao) || 0) + calculateTotalDespesas(veiculo);
};

export interface ResumoComissoesVeiculo {
  totalComissoes: number;
  comissaoVendedor: number;
  comissaoGerencial: number;
  itensDetalhados: Array<{ nome: string; papel?: string; valor: number }>;
}

/**
 * Totaliza as comissões comerciais de vendedores e gestores de um veículo/venda,
 * mantendo a segregação estrita dos custos operacionais de preparação do chassi.
 */
export const calculateComissoesVeiculo = (
  veiculo?: Veiculo | null,
  venda?: VendaVeiculo | null
): ResumoComissoesVeiculo => {
  const v = venda || veiculo?.venda;
  let totalComissoes = 0;
  let comissaoVendedor = 0;
  let comissaoGerencial = 0;
  const itensDetalhados: Array<{ nome: string; papel?: string; valor: number }> = [];

  if (v?.comissoesDetalhadas && v.comissoesDetalhadas.length > 0) {
    v.comissoesDetalhadas.forEach((item) => {
      if (!item.isento) {
        const val = Number(item.valorCalculado) || 0;
        totalComissoes += val;
        if (item.beneficiarioPapel === 'Gerente' || item.usuarioCargo?.toLowerCase().includes('gerente')) {
          comissaoGerencial += val;
        } else {
          comissaoVendedor += val;
        }
        itensDetalhados.push({
          nome: item.usuarioNome || 'Beneficiário',
          papel: item.beneficiarioPapel || item.usuarioCargo || 'Vendedor',
          valor: val,
        });
      }
    });
  } else if (v) {
    comissaoVendedor = Number(v.comissaoValor || 0);
    comissaoGerencial = Number(v.comissaoGerencialValor || 0);
    totalComissoes = comissaoVendedor + comissaoGerencial;
    if (comissaoVendedor > 0) {
      itensDetalhados.push({
        nome: v.vendedorNome || 'Vendedor',
        papel: 'Vendedor',
        valor: comissaoVendedor,
      });
    }
    if (comissaoGerencial > 0) {
      itensDetalhados.push({
        nome: v.comissaoGerencialBeneficiarioNome || 'Gestão / Overriding',
        papel: 'Gerente',
        valor: comissaoGerencial,
      });
    }
  } else if (veiculo?.despesas && veiculo.despesas.length > 0) {
    veiculo.despesas.forEach((d) => {
      if (
        d.statusPagamento !== 'Cancelada' &&
        d.statusPagamento !== 'Estornada' &&
        d.statusEstorno !== 'Estornado' &&
        (d.categoria === 'Comissão' ||
          d.tipoComissaoOrigem === 'manual_previsao' ||
          d.tipoComissaoOrigem === 'automatica_venda' ||
          d.tipoComissaoOrigem === 'automatica_gerencial')
      ) {
        const val = Number(d.valor) || 0;
        totalComissoes += val;
        if (d.tipoComissaoOrigem === 'automatica_gerencial') {
          comissaoGerencial += val;
        } else {
          comissaoVendedor += val;
        }
        itensDetalhados.push({
          nome: d.beneficiarioNome || d.fornecedor || 'Comissão Prevista',
          papel: d.tipoComissaoOrigem === 'automatica_gerencial' ? 'Gerente' : 'Vendedor',
          valor: val,
        });
      }
    });
  }

  return {
    totalComissoes: Number(totalComissoes.toFixed(2)),
    comissaoVendedor: Number(comissaoVendedor.toFixed(2)),
    comissaoGerencial: Number(comissaoGerencial.toFixed(2)),
    itensDetalhados,
  };
};

export interface DemonstrativoLucroChassi {
  // Identificação
  veiculoId: string;
  chassi: string;
  placa: string;
  modelo: string;
  statusVeiculo: string;
  isVendido: boolean;

  // 1. Receitas
  valorVenda: number;
  retornoTac: number;
  taxasMaquininhas: number;
  receitaLiquidaVenda: number;

  // 2. Custos do Veículo (CMV)
  custoCompra: number;
  despesasOperacionais: number; // Apenas preparação, peças, oficina, laudos - SEM comissões, SEM repasses, SEM canceladas/estornadas
  custoTotalChassi: number; // custoCompra + despesasOperacionais

  // 3. Lucro Bruto
  lucroBruto: number; // receitaLiquidaVenda - custoTotalChassi
  margemBrutaPercent: number;

  // 4. Deduções Comerciais e de Marketing Pós-Margem
  comissoesVenda: number;
  detalhesComissoes: Array<{ nome: string; papel?: string; valor: number }>;
  despesasMarketingPosVenda: number;

  // 5. Lucro Líquido Real Recalculado
  lucroLiquidoRecalculado: number;
  margemLiquidaRecalculadaPercent: number;

  // 6. Auditoria de Lucro Histórico vs Recalculado
  lucroHistoricoOriginal: number;
  diferencaRecalculada: number;
  possuiDivergenciaDuplaDeducao: boolean;
  motivoDivergencia?: string;
}

/**
 * Motor canônico de apuração de Lucro por Chassi (DRE Unitário).
 * Segrega custos operacionais de preparação de comissões comerciais,
 * eliminando duplicidade de dedução e permitindo conciliação entre lucro histórico original e recalculado.
 */
export const calcularLucroPorChassi = (
  veiculo: Veiculo,
  vendaOverride?: VendaVeiculo | null,
  precoVendaAtualDefault?: number
): DemonstrativoLucroChassi => {
  const venda = vendaOverride || veiculo.venda;
  const isVendido = veiculo.status === 'Vendido' || Boolean(venda);

  const valorVenda = Number(venda?.valorVenda ?? (precoVendaAtualDefault || veiculo.valorVendaSugerido || 0));
  const retornoTac = Number(
    venda?.financiamentoDetalhes?.retornoComissaoBanco ??
    venda?.retornoFinanciamentoTac ??
    0
  );
  const taxasMaquininhas = Number(
    venda?.taxasMaquininhaTotal ??
    venda?.composicaoPagamento?.reduce((acc, p) => acc + (Number(p.taxaValor) || 0), 0) ??
    0
  );
  const receitaLiquidaVenda = Number((valorVenda + retornoTac - taxasMaquininhas).toFixed(2));

  const custoCompra = Number(venda?.valorCompra ?? veiculo.custoAquisicao ?? 0);
  const despesasOperacionais = calculateTotalDespesas(veiculo);
  const custoTotalChassi = Number((custoCompra + despesasOperacionais).toFixed(2));

  const lucroBruto = Number((receitaLiquidaVenda - custoTotalChassi).toFixed(2));
  const margemBrutaPercent = custoTotalChassi > 0 ? Number(((lucroBruto / custoTotalChassi) * 100).toFixed(2)) : 0;

  const { totalComissoes, itensDetalhados } = calculateComissoesVeiculo(veiculo, venda);
  const despesasMarketingPosVenda = Number(venda?.despesaMarketingAplicadaPosVenda || 0);

  const lucroLiquidoRecalculado = Number(
    (lucroBruto - totalComissoes - despesasMarketingPosVenda).toFixed(2)
  );
  const margemLiquidaRecalculadaPercent = custoTotalChassi > 0
    ? Number(((lucroLiquidoRecalculado / custoTotalChassi) * 100).toFixed(2))
    : 0;

  // Apuração do Lucro Histórico Original vs Recalculado
  let lucroHistoricoOriginal = lucroLiquidoRecalculado;
  if (isVendido && venda) {
    if (venda.lucroHistoricoOriginal !== undefined) {
      lucroHistoricoOriginal = Number(venda.lucroHistoricoOriginal);
    } else if (venda.lucroLiquido !== undefined) {
      lucroHistoricoOriginal = Number(venda.lucroLiquido);
    }
  }

  const diferencaRecalculada = Number((lucroLiquidoRecalculado - lucroHistoricoOriginal).toFixed(2));
  const possuiDivergenciaDuplaDeducao = isVendido && Math.abs(diferencaRecalculada) >= 0.01;

  let motivoDivergencia = '';
  if (possuiDivergenciaDuplaDeducao) {
    if (diferencaRecalculada > 0) {
      motivoDivergencia = `Eliminação de dupla dedução: o lucro histórico anterior deduzia comissões duplicadamente dos custos de recondicionamento. Ajuste: +${formatCurrency(diferencaRecalculada)}.`;
    } else {
      motivoDivergencia = `Ajuste contábil de apuração: inclusão de custos operacionais ou comissões posteriores. Ajuste: ${formatCurrency(diferencaRecalculada)}.`;
    }
  }

  return {
    veiculoId: veiculo.id,
    chassi: veiculo.chassi,
    placa: veiculo.placa,
    modelo: veiculo.modelo,
    statusVeiculo: veiculo.status,
    isVendido,
    valorVenda,
    retornoTac,
    taxasMaquininhas,
    receitaLiquidaVenda,
    custoCompra,
    despesasOperacionais,
    custoTotalChassi,
    lucroBruto,
    margemBrutaPercent,
    comissoesVenda: totalComissoes,
    detalhesComissoes: itensDetalhados,
    despesasMarketingPosVenda,
    lucroLiquidoRecalculado,
    margemLiquidaRecalculadaPercent,
    lucroHistoricoOriginal,
    diferencaRecalculada,
    possuiDivergenciaDuplaDeducao,
    motivoDivergencia,
  };
};

export const checkRevisaoNecessaria = (veiculo: Veiculo) => {
  const kmRodadosDesdeRevisao = (veiculo.kmAtual || 0) - (veiculo.kmUltimaRevisao || 0);
  const limiteRevisao = 10000;
  const isUrgente = kmRodadosDesdeRevisao >= limiteRevisao;
  const isAtencao = kmRodadosDesdeRevisao >= 8500 && !isUrgente;
  const porcentagem = Math.min(100, Math.round((kmRodadosDesdeRevisao / limiteRevisao) * 100));

  return {
    kmRodadosDesdeRevisao,
    isUrgente,
    isAtencao,
    porcentagem,
    kmRestantes: Math.max(0, limiteRevisao - kmRodadosDesdeRevisao),
  };
};

/**
 * Itens padrão de manutenção preventiva com limites personalizáveis de KM
 */
export const getItensManutencaoPadrao = (kmAtual: number): ItemManutencaoPreventiva[] => {
  // Arredonda para a última dezena de milhar próxima
  const baseKm = Math.floor(kmAtual / 10000) * 10000;

  return [
    {
      id: 'item-oleo',
      nome: 'Troca de Óleo do Motor e Filtros (Óleo, Ar, Combustível)',
      intervaloKm: 10000,
      kmUltimaTroca: baseKm,
      kmProximaTroca: baseKm + 10000,
      custoEstimado: 350,
    },
    {
      id: 'item-pastilhas',
      nome: 'Pastilhas de Freio e Fluido DOT4',
      intervaloKm: 20000,
      kmUltimaTroca: baseKm > 20000 ? baseKm - 5000 : 0,
      kmProximaTroca: (baseKm > 20000 ? baseKm - 5000 : 0) + 20000,
      custoEstimado: 280,
    },
    {
      id: 'item-pneus',
      nome: 'Jogo de Pneus / Troca e Alinhamento 3D',
      intervaloKm: 40000,
      kmUltimaTroca: baseKm > 40000 ? baseKm - 10000 : 0,
      kmProximaTroca: (baseKm > 40000 ? baseKm - 10000 : 0) + 40000,
      custoEstimado: 1400,
    },
    {
      id: 'item-correia',
      nome: 'Correia Dentada / Tensores e Bomba d\'Água',
      intervaloKm: 50000,
      kmUltimaTroca: baseKm > 50000 ? baseKm - 15000 : 0,
      kmProximaTroca: (baseKm > 50000 ? baseKm - 15000 : 0) + 50000,
      custoEstimado: 850,
    },
    {
      id: 'item-velas',
      nome: 'Velas de Ignição e Cabos',
      intervaloKm: 30000,
      kmUltimaTroca: baseKm > 30000 ? baseKm - 8000 : 0,
      kmProximaTroca: (baseKm > 30000 ? baseKm - 8000 : 0) + 30000,
      custoEstimado: 220,
    },
  ];
};

/**
 * Calcula o estado preditivo de cada item de manutenção baseado no KM Atual do veículo
 */
export const calcularStatusManutencao = (item: ItemManutencaoPreventiva, kmAtual: number) => {
  const kmRestante = item.kmProximaTroca - kmAtual;
  const kmPercorridoNoCiclo = kmAtual - item.kmUltimaTroca;
  const porcentagem = Math.min(100, Math.max(0, Math.round((kmPercorridoNoCiclo / item.intervaloKm) * 100)));

  // Critérios de Alerta Preditivo
  // Vencido: kmAtual >= kmProximaTroca (kmRestante <= 0)
  // Próximo de trocar: faltam menos de 1.200 km ou atingiu >= 88% do limite
  const isVencido = kmRestante <= 0;
  const isProximo = !isVencido && (kmRestante <= 1200 || porcentagem >= 88);
  const isOk = !isVencido && !isProximo;

  return {
    kmRestante,
    kmPercorridoNoCiclo,
    porcentagem,
    isVencido,
    isProximo,
    isOk,
    statusText: isVencido
      ? `VENCIDO (Passou ${formatKm(Math.abs(kmRestante))})`
      : isProximo
      ? `Próximo de trocar (Faltam ${formatKm(kmRestante)})`
      : `Em dia (Faltam ${formatKm(kmRestante)})`,
    badgeClass: isVencido
      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse'
      : isProximo
      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold'
      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  };
};

/**
 * Calcula saldos e totais de Caução e Reposição
 */
export const calcularResumoCaucao = (contrato: ContratoLocacao) => {
  const exigido = contrato.caucao || 0;
  const pago = contrato.caucaoTotalPago !== undefined ? contrato.caucaoTotalPago : exigido;
  const utilizado = contrato.caucaoUtilizado || 0;
  const saldoAtual = contrato.caucaoSaldoAtual !== undefined ? contrato.caucaoSaldoAtual : Math.max(0, pago - utilizado);
  const deficit = Math.max(0, exigido - saldoAtual);

  const reposicaoAtiva = contrato.reposicaoCaucao?.ativa === true;
  const valorParcelaReposicao = reposicaoAtiva ? (contrato.reposicaoCaucao?.valorParcelaSemanal || 0) : 0;

  return {
    exigido,
    pago,
    utilizado,
    saldoAtual,
    deficit,
    precisaRepor: deficit > 0,
    reposicaoAtiva,
    valorParcelaReposicao,
  };
};

/**
 * Calcula débitos pendentes do motorista
 */
export const calcularResumoDebitos = (debitos: DebitoMotorista[] = []) => {
  let totalDebitos = 0;
  let totalPago = 0;
  let totalPendente = 0;
  let qtdMultas = 0;
  let qtdAvarias = 0;

  debitos.forEach((d) => {
    totalDebitos += d.valorTotal || 0;
    totalPago += d.valorPago || 0;
    totalPendente += d.valorPendente || 0;
    if (d.tipo === 'Multa de Trânsito') qtdMultas++;
    if (d.tipo === 'Batida / Avaria' || d.tipo === 'Acidente / Sinistro') qtdAvarias++;
  });

  return {
    totalDebitos,
    totalPago,
    totalPendente,
    qtdTotal: debitos.length,
    qtdMultas,
    qtdAvarias,
  };
};

export interface DespesaCategoriaAgrupada {
  categoria: DespesaFixa['categoria'];
  nomeExibicao: string;
  icone: string;
  total: number;
  percentualReceita: number;
  itens: DespesaFixa[];
}

export interface ItemRepasseDistribuicao {
  id: string;
  descricao: string;
  categoria: CategoriaDespesa;
  valor: number;
  data: string;
  fornecedorOuBeneficiario?: string;
  placa?: string;
  chassi?: string;
  statusPagamento?: 'Pago' | 'Pendente' | 'Estornada' | 'Cancelada';
}

export interface GrupoRepasseDistribuicao {
  categoria: CategoriaDespesa;
  nomeExibicao: string;
  icone: string;
  total: number;
  percentualReceita: number;
  itens: ItemRepasseDistribuicao[];
}

export interface DRESummaryData {
  // 1. Receita Bruta
  receitaVendas: number;
  receitaLocacoes: number;
  receitaMultasAcessorias: number; // Multas por atraso, excesso de KM e taxas de vistoria (DRE)
  receitaRetornoTac: number;
  receitaOperacionalBruta: number;
  
  // Percentuais de Receita (base = receitaOperacionalBruta)
  pctReceitaVendas: number;
  pctReceitaLocacoes: number;
  pctReceitaMultasAcessorias: number;
  pctReceitaRetornoTac: number;

  // 2. CMV (Custo das Mercadorias Vendidas - Oficina/Peças/Aquisição)
  cmvCompraVendidos: number;
  cmvRecondicionamentoVendidos: number;
  cmvComissoesVendidos: number;
  cmvTotal: number;

  pctCmvCompra: number;
  pctCmvRecondicionamento: number;
  pctCmvComissoes: number;
  pctCmvTotal: number;

  // Subtotal 1: Lucro Bruto Operacional (Margem Bruta dos Veículos)
  lucroBrutoOperacional: number;
  margemBrutaPercent: number;

  // 3. Despesas Fixas Operacionais da Loja
  despesasPorCategoria: DespesaCategoriaAgrupada[];
  totalDespesasFixas: number;
  totalDespesasPagas: number;
  totalDespesasPendentes: number;
  pctDespesasFixas: number;

  // 4. Provisões Legais e Fiscais
  provisaoTributaria: number;
  provisaoGarantiaCdc: number;
  totalProvisoes: number;
  pctProvisaoTributaria: number;
  pctProvisaoGarantiaCdc: number;
  pctTotalProvisoes: number;

  // 5. Repasses e Distribuições (Dedução após Lucro Operacional)
  totalRepassesParceiros: number;
  totalDistribuicaoSocios: number;
  totalBonusFuncionarios: number;
  totalProLabore: number;
  totalRepassesEDistribuicoes: number;
  pctRepassesEDistribuicoes: number;
  repassesPorCategoria: GrupoRepasseDistribuicao[];
  quantidadeRepassesEDistribuicoes: number;

  // 6. Marketing e Tráfego Pago Pós-Venda Atribuído a Chassi
  totalMarketingPosVenda: number;
  pctMarketingPosVenda: number;

  // Resultado Final: Lucro Líquido Real & Margem Líquida
  lucroLiquidoReal: number;
  margemLiquidaPercent: number;

  // Contadores
  quantidadeVendas: number;
  quantidadeLocacoesAtivas: number;
  quantidadeDespesasFixas: number;
}

/**
 * Motor Contábil de Apuração do DRE em Cascata
 */
export const calculateDRESummary = (
  vendas: VendaVeiculo[],
  veiculos: Veiculo[],
  despesasFixas: DespesaFixa[],
  mesFiltro?: string // 'todos' ou 'YYYY-MM'
): DRESummaryData => {
  // 1. Filtrar Vendas por Mês (se aplicável)
  const vendasFiltradas = vendas.filter((v) => {
    if (!mesFiltro || mesFiltro === 'todos') return true;
    return v.dataVenda ? v.dataVenda.startsWith(mesFiltro) : true;
  });

  // 2. Filtrar Despesas Fixas por Mês (excluindo qualquer repasse/distribuição lançada como despesa fixa)
  const despesasFiltradas = despesasFixas.filter((d) => {
    if (isCategoriaRepasseDistribuicao(d.categoria as any)) return false;
    if (!mesFiltro || mesFiltro === 'todos') return true;
    if (d.mesReferencia) return d.mesReferencia === mesFiltro;
    if (d.dataVencimento) return d.dataVencimento.startsWith(mesFiltro);
    return true;
  });

  // 3. Receitas de Vendas & Retornos
  const receitaVendas = vendasFiltradas.reduce((sum, v) => sum + (v.valorVenda || 0), 0);
  const receitaRetornoTac = vendasFiltradas.reduce((sum, v) => sum + (v.retornoFinanciamentoTac || 0), 0);

  // Receitas de Locação (Aluguel Base) e Receitas Acessórias - Multas (Excesso KM, Atrasos e Vistorias)
  let receitaLocacoes = 0;
  let receitaMultasAcessorias = 0;
  let qtdLocacoesAtivas = 0;

  const todosContratos: ContratoLocacao[] = [];
  veiculos.forEach((v) => {
    if (v.contratoAtivo) todosContratos.push(v.contratoAtivo);
    if (v.historicoContratos && Array.isArray(v.historicoContratos)) {
      todosContratos.push(...v.historicoContratos);
    }
  });

  todosContratos.forEach((contrato) => {
    if (contrato.status === 'Ativo') qtdLocacoesAtivas++;

    // 1. Pagamentos de Aluguel Semanal e Multas por Atraso
    contrato.pagamentos?.forEach((p) => {
      if (p.status === 'Pago') {
        const dataRef = p.dataPagamento || p.dataVencimento;
        const noPeriodo = !mesFiltro || mesFiltro === 'todos' || (dataRef && dataRef.startsWith(mesFiltro));
        if (noPeriodo) {
          const valorMulta = p.multaAplicada || p.valorMultaAtraso || 0;
          const valorAluguelBase = p.valorAluguelBase !== undefined ? p.valorAluguelBase : Math.max(0, (p.valor || 0) - valorMulta);
          receitaLocacoes += valorAluguelBase;
          receitaMultasAcessorias += valorMulta;
        }
      }
    });

    // 2. Débitos Quitados do Motorista (Excesso de KM, Vistoria, Multas de Trânsito, etc.)
    contrato.debitosMotorista?.forEach((deb) => {
      const quitado = deb.status === 'Pago pelo Motorista' || deb.status === 'Descontado do Caução' || deb.status === 'Quitado';
      if (quitado && deb.valorPago > 0) {
        const dataRef = deb.dataOcorrencia;
        const noPeriodo = !mesFiltro || mesFiltro === 'todos' || (dataRef && dataRef.startsWith(mesFiltro));
        if (noPeriodo) {
          receitaMultasAcessorias += deb.valorPago;
        }
      }
    });
  });

  // Receita Operacional Bruta
  const receitaOperacionalBruta = receitaVendas + receitaLocacoes + receitaMultasAcessorias + receitaRetornoTac;

  const getPct = (val: number) => {
    if (receitaOperacionalBruta <= 0) return 0;
    return (val / receitaOperacionalBruta) * 100;
  };

  // 4. CMV (Custo das Mercadorias Vendidas - Aquisição, Oficina/Peças e Comissões)
  const cmvCompraVendidos = vendasFiltradas.reduce((sum, v) => sum + (v.valorCompra || 0), 0);
  
  // Recondicionamento: assegura que repasses/distribuições e comissões NÃO entrem no custo de oficina
  const cmvRecondicionamentoVendidos = vendasFiltradas.reduce((sum, v) => {
    const veic = veiculos.find((x) => x.id === v.veiculoId || (x.chassi && v.chassi && x.chassi === v.chassi));
    if (veic) {
      return sum + calculateTotalDespesas(veic);
    }
    return sum + (v.totalDespesas || 0);
  }, 0);

  // Comissões: totaliza vendas e gerência de forma segregada, garantindo zero sobreposição com oficina
  const cmvComissoesVendidos = vendasFiltradas.reduce((sum, v) => {
    const veic = veiculos.find((x) => x.id === v.veiculoId || (x.chassi && v.chassi && x.chassi === v.chassi));
    const { totalComissoes } = calculateComissoesVeiculo(veic, v);
    return sum + totalComissoes;
  }, 0);
  const cmvTotal = cmvCompraVendidos + cmvRecondicionamentoVendidos + cmvComissoesVendidos;

  // Lucro Bruto Operacional (Margem Bruta do Veículo)
  const lucroBrutoOperacional = receitaOperacionalBruta - cmvTotal;
  const margemBrutaPercent = getPct(lucroBrutoOperacional);

  // 5. Despesas Fixas da Loja (Agrupadas por Categoria)
  const categoriasConfig: { cat: DespesaFixa['categoria']; label: string; icon: string }[] = [
    { cat: 'Aluguel Pátio', label: 'Aluguel do Pátio & Espaço Físico', icon: 'Building' },
    { cat: 'Energia / Água / Net', label: 'Utilidades (Água, Luz, Internet & Telefonia)', icon: 'Zap' },
    { cat: 'Folha de Pagamento', label: 'Folha de Pagamento & Equipe', icon: 'Users' },
    { cat: 'Marketing / Anúncios', label: 'Marketing, Portais (Webmotors/OLX) & Tráfego', icon: 'Megaphone' },
    { cat: 'Sistemas / Software', label: 'Softwares, Plataformas & Tecnologia', icon: 'Laptop' },
    { cat: 'Contabilidade', label: 'Assessoria Contábil & Jurídica', icon: 'FileText' },
    { cat: 'Outros', label: 'Outras Despesas Fixas Operacionais', icon: 'MoreHorizontal' },
  ];

  const despesasPorCategoria: DespesaCategoriaAgrupada[] = categoriasConfig.map((cfg) => {
    const itens = despesasFiltradas.filter((d) => d.categoria === cfg.cat);
    const total = itens.reduce((sum, d) => sum + (d.valor || 0), 0);
    return {
      categoria: cfg.cat,
      nomeExibicao: cfg.label,
      icone: cfg.icon,
      total,
      percentualReceita: getPct(total),
      itens,
    };
  }).filter((c) => c.total > 0 || despesasFiltradas.length === 0);

  const totalDespesasFixas = despesasFiltradas.reduce((sum, d) => sum + (d.valor || 0), 0);
  const totalDespesasPagas = despesasFiltradas.filter((d) => d.status === 'Pago').reduce((sum, d) => sum + (d.valor || 0), 0);
  const totalDespesasPendentes = despesasFiltradas.filter((d) => d.status === 'Pendente').reduce((sum, d) => sum + (d.valor || 0), 0);

  // 6. Provisões Fiscais e Legais
  const provisaoTributaria = vendasFiltradas.reduce((sum, v) => sum + (v.impostoMargemEstimado || 0), 0);
  const provisaoGarantiaCdc = vendasFiltradas.reduce((sum, v) => sum + (v.fundoGarantiaProvisao?.valor || 0), 0);
  const totalProvisoes = provisaoTributaria + provisaoGarantiaCdc;

  // 7. SEÇÃO SEPARADA: Repasses e Distribuições de Lucro
  // Agrupa todas as despesas vinculadas a Parceiros, Sócios, Pró-labore e Bônus Extras
  const repassesItens: ItemRepasseDistribuicao[] = [];

  veiculos.forEach((veic) => {
    (veic.despesas || []).forEach((desp) => {
      if (isCategoriaRepasseDistribuicao(desp.categoria)) {
        const dataRef = desp.dataPagamento || desp.data;
        if (!mesFiltro || mesFiltro === 'todos' || (dataRef && dataRef.startsWith(mesFiltro))) {
          repassesItens.push({
            id: desp.id,
            descricao: desp.descricao,
            categoria: desp.categoria,
            valor: desp.valor || 0,
            data: dataRef || '',
            fornecedorOuBeneficiario: desp.beneficiarioNome || desp.fornecedor,
            placa: desp.placa || veic.placa,
            chassi: desp.chassi || veic.chassi,
            statusPagamento: desp.statusPagamento || 'Pago',
          });
        }
      }
    });
  });

  despesasFixas.forEach((d) => {
    if (isCategoriaRepasseDistribuicao(d.categoria as any)) {
      const dataRef = d.dataVencimento || d.mesReferencia;
      if (!mesFiltro || mesFiltro === 'todos' || (dataRef && dataRef.startsWith(mesFiltro))) {
        repassesItens.push({
          id: d.id,
          descricao: d.descricao,
          categoria: d.categoria as CategoriaDespesa,
          valor: d.valor || 0,
          data: dataRef || '',
          fornecedorOuBeneficiario: d.descricao || d.nome,
          statusPagamento: d.status === 'Pago' ? 'Pago' : 'Pendente',
        });
      }
    }
  });

  const repassesConfig: { cat: CategoriaDespesa; label: string; icon: string }[] = [
    { cat: 'Repasse de Lucro - Parceiro', label: 'Repasse de Lucro - Parceiro (Sócios / Investidores de Chassi)', icon: '🤝' },
    { cat: 'Distribuição de Lucro - Sócio/Dono', label: 'Distribuição de Lucro - Sócio / Dono (Dividendos)', icon: '💼' },
    { cat: 'Comissão/Bônus Extra - Funcionário', label: 'Comissão / Bônus Extra - Funcionário (Premiações)', icon: '⭐' },
    { cat: 'Pró-labore', label: 'Pró-labore (Retirada Fixa Mensal de Sócios / Diretoria)', icon: '👔' },
  ];

  const repassesPorCategoria: GrupoRepasseDistribuicao[] = repassesConfig.map((cfg) => {
    const itens = repassesItens.filter((r) => r.categoria === cfg.cat);
    const total = itens.reduce((sum, r) => sum + (r.valor || 0), 0);
    return {
      categoria: cfg.cat,
      nomeExibicao: cfg.label,
      icone: cfg.icon,
      total,
      percentualReceita: getPct(total),
      itens,
    };
  });

  const totalRepassesParceiros = repassesItens
    .filter((r) => r.categoria === 'Repasse de Lucro - Parceiro')
    .reduce((sum, r) => sum + r.valor, 0);

  const totalDistribuicaoSocios = repassesItens
    .filter((r) => r.categoria === 'Distribuição de Lucro - Sócio/Dono')
    .reduce((sum, r) => sum + r.valor, 0);

  const totalBonusFuncionarios = repassesItens
    .filter((r) => r.categoria === 'Comissão/Bônus Extra - Funcionário')
    .reduce((sum, r) => sum + r.valor, 0);

  const totalProLabore = repassesItens
    .filter((r) => r.categoria === 'Pró-labore')
    .reduce((sum, r) => sum + r.valor, 0);

  const totalRepassesEDistribuicoes = totalRepassesParceiros + totalDistribuicaoSocios + totalBonusFuncionarios + totalProLabore;
  const pctRepassesEDistribuicoes = getPct(totalRepassesEDistribuicoes);

  // 8. Despesa de Marketing & Tráfego Pago Pós-Venda Atribuído ao Chassi
  // REGRA CONTÁBIL CRÍTICA:
  // Este valor é deduzido do lucro líquido final no DRE, mas NÃO recalcula nem altera
  // a comissão já fixada e salva para os vendedores (cmvComissoesVendidos permanece inalterada).
  const totalMarketingPosVenda = vendasFiltradas.reduce((sum, v) => sum + (v.despesaMarketingAplicadaPosVenda || 0), 0);
  const pctMarketingPosVenda = getPct(totalMarketingPosVenda);

  // 9. Lucro Líquido Real da Operação (após deduzir Despesas Fixas, Provisões, Repasses/Distribuições e Marketing Pós-Venda)
  const lucroLiquidoReal = receitaOperacionalBruta - cmvTotal - totalDespesasFixas - totalProvisoes - totalRepassesEDistribuicoes - totalMarketingPosVenda;
  const margemLiquidaPercent = getPct(lucroLiquidoReal);

  return {
    receitaVendas,
    receitaLocacoes,
    receitaMultasAcessorias,
    receitaRetornoTac,
    receitaOperacionalBruta,
    pctReceitaVendas: getPct(receitaVendas),
    pctReceitaLocacoes: getPct(receitaLocacoes),
    pctReceitaMultasAcessorias: getPct(receitaMultasAcessorias),
    pctReceitaRetornoTac: getPct(receitaRetornoTac),

    cmvCompraVendidos,
    cmvRecondicionamentoVendidos,
    cmvComissoesVendidos,
    cmvTotal,
    pctCmvCompra: getPct(cmvCompraVendidos),
    pctCmvRecondicionamento: getPct(cmvRecondicionamentoVendidos),
    pctCmvComissoes: getPct(cmvComissoesVendidos),
    pctCmvTotal: getPct(cmvTotal),

    lucroBrutoOperacional,
    margemBrutaPercent,

    despesasPorCategoria,
    totalDespesasFixas,
    totalDespesasPagas,
    totalDespesasPendentes,
    pctDespesasFixas: getPct(totalDespesasFixas),

    provisaoTributaria,
    provisaoGarantiaCdc,
    totalProvisoes,
    pctProvisaoTributaria: getPct(provisaoTributaria),
    pctProvisaoGarantiaCdc: getPct(provisaoGarantiaCdc),
    pctTotalProvisoes: getPct(totalProvisoes),

    totalRepassesParceiros,
    totalDistribuicaoSocios,
    totalBonusFuncionarios,
    totalProLabore,
    totalRepassesEDistribuicoes,
    pctRepassesEDistribuicoes,
    repassesPorCategoria,
    quantidadeRepassesEDistribuicoes: repassesItens.length,

    totalMarketingPosVenda,
    pctMarketingPosVenda,

    lucroLiquidoReal,
    margemLiquidaPercent,

    quantidadeVendas: vendasFiltradas.length,
    quantidadeLocacoesAtivas: qtdLocacoesAtivas,
    quantidadeDespesasFixas: despesasFiltradas.length,
  };
};

/**
 * Helper unificado para buscar a venda correspondente a um veículo
 */
export const getVendaForVeiculo = (v: Veiculo, vendasList: VendaVeiculo[] = []): VendaVeiculo | undefined => {
  if (!v) return undefined;
  if (v.venda) return v.venda;
  if (!vendasList || vendasList.length === 0) return undefined;

  const cleanPlaca = (p?: string) => (p || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const cleanChassi = (c?: string) => (c || '').trim().toUpperCase();

  const vPlaca = cleanPlaca(v.placa);
  const vChassi = cleanChassi(v.chassi);

  return vendasList.find((vd) => {
    if (vd.veiculoId && (vd.veiculoId === v.id || vd.veiculoId === (v as any).veiculoId)) return true;
    if (vd.id && vd.id === v.id) return true;
    if (vPlaca && vd.placa && cleanPlaca(vd.placa) === vPlaca) return true;
    if (vChassi && vd.chassi && vChassi.length >= 6 && cleanChassi(vd.chassi) === vChassi) return true;
    return false;
  });
};

/**
 * REGRA CRÍTICA DE NEGÓCIO: Identifica com precisão absoluta se um veículo já foi vendido.
 * Um veículo é considerado vendido se:
 * 1) Seu status ou status_estoque for 'Vendido'
 * 2) Possui dataVenda preenchida ou objeto v.venda
 * 3) Possui qualquer registro correspondente na lista global de vendas (por ID, placa ou chassi)
 */
export const checkIsVeiculoVendido = (v: Veiculo, vendasList: VendaVeiculo[] = []): boolean => {
  if (!v) return false;
  if (
    v.status === 'Vendido' ||
    v.status_estoque === 'Vendido' ||
    Boolean(v.dataVenda) ||
    Boolean(v.venda)
  ) {
    return true;
  }
  return Boolean(getVendaForVeiculo(v, vendasList));
};

/**
 * Placas conhecidas dedicadas à Frota de Locação (ex: TCT0B54, TCQ4A22, TCR7D90)
 */
export const PLACAS_FROTA_LOCACAO: string[] = ['TCT0B54', 'TCQ4A22', 'TCR7D90'];

/**
 * Identifica com precisão se um veículo pertence à Frota de Locação (Aluguel):
 * 1. Placa está na lista de placas de locação (TCT0B54, TCQ4A22, TCR7D90)
 * 2. tipoOperacao === 'Locacao'
 * 3. Status é 'Alugado' ou possui contratoAtivo
 */
export const isVeiculoLocacao = (v?: Veiculo | null): boolean => {
  if (!v) return false;
  const placaLimpa = (v.placa || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (PLACAS_FROTA_LOCACAO.some((p) => p.toUpperCase() === placaLimpa)) return true;
  if (v.tipoOperacao === 'Locacao') return true;
  if (v.status === 'Alugado' || Boolean(v.contratoAtivo)) return true;
  return false;
};

/**
 * Estrutura detalhada de ROI, Custos, Receitas e Break-even da Frota de Locação
 */
export interface MetricasLocacaoVeiculo {
  custoAquisicao: number;
  custoFreteTaxas: number;
  totalDespesasManutencao: number;
  totalOutrasDespesas: number;
  custoTotalVeiculo: number;
  totalReceitaAluguel: number;
  totalOutrasReceitas: number;
  receitaTotalAcumulada: number;
  saldoBreakEven: number; // receitaTotalAcumulada - custoTotalVeiculo
  atingiuBreakEven: boolean; // saldoBreakEven >= 0
  percentualAmortizacao: number; // (receitaTotalAcumulada / custoTotalVeiculo) * 100
  valorFaltanteBreakEven: number; // quanto falta se não atingiu
  lucroLiquidoExcedente: number; // lucro excedente se atingiu
  semanasEstimadasParaBreakEven: number | null;
  despesasManutencaoList: any[];
  pagamentosRecebidosList: {
    id: string;
    data: string;
    semanaReferencia: string;
    valor: number;
    motoristaNome: string;
    metodoPagamento?: string;
  }[];
}

/**
 * Calcula o ROI, Break-even e métricas financeiras completas de um veículo da frota de locação
 */
export const calcularMetricasLocacaoVeiculo = (veiculo: Veiculo): MetricasLocacaoVeiculo => {
  const custoAquisicao = Number(veiculo.custoAquisicao || 0);
  const custoFreteTaxas = Number(veiculo.custo_frete_transporte || 0) + Number(veiculo.taxas_origem || 0);

  // Histórico de manutenções, peças e revisões periódicas
  const categoriasManutencao = [
    'Peças',
    'Mecânica / Mão de Obra',
    'Funilaria / Pintura',
    'Pneus',
    'Estética / Lavagem',
    'Frete / Guincho',
    'Combustível',
  ];

  const todasDespesas = Array.isArray(veiculo.despesas) ? veiculo.despesas : [];
  
  // Separar despesas de manutenção vs outras despesas operacionais
  const despesasManutencaoList = todasDespesas.filter((d) => 
    !isCategoriaRepasseDistribuicao(d.categoria)
  );

  let totalDespesasManutencao = 0;
  let totalOutrasDespesas = 0;

  despesasManutencaoList.forEach((d) => {
    const val = Number(d.valor || 0);
    if (categoriasManutencao.includes(d.categoria)) {
      totalDespesasManutencao += val;
    } else {
      totalOutrasDespesas += val;
    }
  });

  const totalCustosAdicionais = totalDespesasManutencao + totalOutrasDespesas;
  const custoTotalVeiculo = custoAquisicao + custoFreteTaxas + totalCustosAdicionais;

  // Receitas geradas (soma de todos os aluguéis semanais/mensais pagos)
  const pagamentosRecebidosList: {
    id: string;
    data: string;
    semanaReferencia: string;
    valor: number;
    motoristaNome: string;
    metodoPagamento?: string;
  }[] = [];

  let totalReceitaAluguel = 0;

  if (veiculo.contratoAtivo?.pagamentos && Array.isArray(veiculo.contratoAtivo.pagamentos)) {
    veiculo.contratoAtivo.pagamentos.forEach((p) => {
      if (p.status === 'Pago') {
        const val = Number(p.valor || 0);
        totalReceitaAluguel += val;
        pagamentosRecebidosList.push({
          id: p.id,
          data: p.dataPagamento || p.dataVencimento || '',
          semanaReferencia: p.semanaReferencia || 'Semana',
          valor: val,
          motoristaNome: p.motoristaNome || veiculo.contratoAtivo?.motoristaNome || 'Motorista',
          metodoPagamento: p.metodoPagamento || 'PIX',
        });
      }
    });
  }

  // Ordenar pagamentos por data decrescente
  pagamentosRecebidosList.sort((a, b) => new Date(b.data || 0).getTime() - new Date(a.data || 0).getTime());

  const totalOutrasReceitas = 0;
  const receitaTotalAcumulada = totalReceitaAluguel + totalOutrasReceitas;

  // Ponto de Equilíbrio (Break-Even): Receitas - Custos
  const saldoBreakEven = receitaTotalAcumulada - custoTotalVeiculo;
  const atingiuBreakEven = saldoBreakEven >= 0;

  const valorFaltanteBreakEven = atingiuBreakEven ? 0 : Math.abs(saldoBreakEven);
  const lucroLiquidoExcedente = atingiuBreakEven ? saldoBreakEven : 0;

  const percentualAmortizacao = custoTotalVeiculo > 0 
    ? (receitaTotalAcumulada / custoTotalVeiculo) * 100 
    : 100;

  // Projeção de Semanas para o Break-Even
  let semanasEstimadasParaBreakEven: number | null = null;
  const valorSemanalAtivo = Number(veiculo.contratoAtivo?.valorSemanal || 0);

  if (!atingiuBreakEven && valorSemanalAtivo > 0 && valorFaltanteBreakEven > 0) {
    semanasEstimadasParaBreakEven = Math.ceil(valorFaltanteBreakEven / valorSemanalAtivo);
  }

  return {
    custoAquisicao,
    custoFreteTaxas,
    totalDespesasManutencao,
    totalOutrasDespesas,
    custoTotalVeiculo,
    totalReceitaAluguel,
    totalOutrasReceitas,
    receitaTotalAcumulada,
    saldoBreakEven,
    atingiuBreakEven,
    percentualAmortizacao,
    valorFaltanteBreakEven,
    lucroLiquidoExcedente,
    semanasEstimadasParaBreakEven,
    despesasManutencaoList,
    pagamentosRecebidosList,
  };
};

/**
 * Retorna o início do ciclo semanal (Segunda-feira 00:00:00) correspondente à data informada
 */
export const getInicioCicloSemanal = (dateInput?: string | Date): Date => {
  const d = dateInput 
    ? (typeof dateInput === 'string' ? new Date(dateInput.length === 10 ? dateInput + 'T00:00:00' : dateInput) : new Date(dateInput))
    : new Date();
  
  const day = d.getDay(); // 0: Dom, 1: Seg, 2: Ter, 3: Qua, 4: Qui, 5: Sex, 6: Sáb
  const diff = day === 0 ? -6 : 1 - day; // Se Dom, volta 6 dias. Se Seg, 0. Se Ter, -1...
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
};

/**
 * Calcula a quilometragem rodada na semana corrente (ciclo Segunda a Segunda)
 * Respeita a dataInicioMedicaoKm (Data de Referência / Corte) caso definida no contrato:
 * Leituras anteriores a essa data são desconsideradas para multas/cobrança, servindo apenas como histórico.
 */
export const calcularKmSemanaAtual = (
  contrato: ContratoLocacao,
  novoKmLeitura?: number,
  dataLeitura?: string
) => {
  const limiteKmSemanal = contrato.limiteKmSemanal ?? 1750;
  const valorMultaPorKm = contrato.valorMultaPorKmExcedente ?? 1.20;

  const dataReferencia = dataLeitura || new Date().toISOString().split('T')[0];
  const inicioCiclo = getInicioCicloSemanal(dataReferencia);
  const inicioCicloStr = inicioCiclo.toISOString().split('T')[0];

  // Data de corte / início de medição de KM (para contratos migrados)
  const dataCorte = contrato.dataInicioMedicaoKm || '1970-01-01';

  // Leituras válidas que respeitam o corte
  const leiturasValidas = (contrato.registrosKmDiario || []).filter(
    (reg) => reg.data >= dataCorte
  );

  // A medição considera a partir da data de início do ciclo da semana ou da data de corte (o que for mais recente)
  const dataInicioEfetiva = dataCorte > inicioCicloStr ? dataCorte : inicioCicloStr;

  const leiturasSemana = leiturasValidas.filter((reg) => reg.data >= dataInicioEfetiva);

  let kmRodadoNaSemana = 0;

  if (leiturasSemana.length > 0) {
    kmRodadoNaSemana = leiturasSemana.reduce((sum, r) => sum + (r.kmRodadoNoDia || 0), 0);
  } else if (contrato.kmAtual && contrato.kmInicial && (!contrato.dataInicioMedicaoKm || contrato.dataInicioMedicaoKm <= inicioCicloStr)) {
    // Estimativa acumulada se não houver registros diários granulares
    kmRodadoNaSemana = Math.max(0, contrato.kmAtual - contrato.kmInicial);
  }

  // Se houver um novo KM sendo inserido no modal de leitura
  if (novoKmLeitura !== undefined && contrato.kmAtual !== undefined) {
    const diffNovo = Math.max(0, novoKmLeitura - contrato.kmAtual);
    kmRodadoNaSemana += diffNovo;
  }

  const kmExcedente = Math.max(0, kmRodadoNaSemana - limiteKmSemanal);
  const valorMulta = Number((kmExcedente * valorMultaPorKm).toFixed(2));
  const excedeuLimite = kmExcedente > 0;

  return {
    limiteKmSemanal,
    valorMultaPorKm,
    kmRodadoNaSemana,
    kmExcedente,
    valorMulta,
    excedeuLimite,
    inicioCicloStr,
    dataInicioEfetiva,
  };
};

/**
 * Calcula a multa por atraso no aluguel semanal (Padrão 40% parametrizável por contrato)
 */
export const calcularMultaAtrasoPagamento = (
  pagamento: PagamentoAluguel,
  percentualPadrao = 40,
  contratoPercentual?: number
) => {
  const percentual = contratoPercentual ?? percentualPadrao;
  const todayStr = new Date().toISOString().split('T')[0];
  const isAtrasado = pagamento.status === 'Atrasado' || (pagamento.status !== 'Pago' && pagamento.dataVencimento < todayStr);

  const valorBase = pagamento.valorAluguelBase ?? pagamento.valor;
  const valorMulta = isAtrasado ? Number((valorBase * (percentual / 100)).toFixed(2)) : (pagamento.multaAplicada || 0);
  const valorTotal = valorBase + valorMulta;

  return {
    isAtrasado,
    percentual,
    valorBase,
    valorMulta,
    valorTotal,
  };
};

/**
 * Calcula o status de carência de 30 dias para liberação/devolução da caução
 */
export const calcularCarenciaCaucao = (contrato: ContratoLocacao, dataEncerramentoInformada?: string) => {
  let dataLiberacao = contrato.dataLiberacaoCaucao;
  const dataRef = dataEncerramentoInformada || contrato.fechamentoCaucao?.dataEncerramento || contrato.dataDevolucao || contrato.dataFimPrevista;

  if (!dataLiberacao && dataRef) {
    const d = new Date(dataRef + 'T00:00:00');
    d.setDate(d.getDate() + 30);
    dataLiberacao = d.toISOString().split('T')[0];
  }

  if (!dataLiberacao) {
    // Se ainda não há encerramento formalizado, a carência prevista inicia ao devolver o carro
    const hojePrev = new Date();
    hojePrev.setDate(hojePrev.getDate() + 30);
    return {
      temCarencia: true,
      emCarencia: true,
      liberado: false,
      diasRestantes: 30,
      dataLiberacao: hojePrev.toISOString().split('T')[0],
    };
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const dataAlvo = new Date(dataLiberacao + 'T00:00:00');
  const diffMs = dataAlvo.getTime() - hoje.getTime();
  const diasRestantes = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  const emCarencia = diasRestantes > 0;
  const liberado = diasRestantes <= 0;

  return {
    temCarencia: true,
    emCarencia,
    liberado,
    diasRestantes: Math.max(0, diasRestantes),
    dataLiberacao,
  };
};


