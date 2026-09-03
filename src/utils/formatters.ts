import { Veiculo, AgingSummary, ContratoLocacao, ItemManutencaoPreventiva, DebitoMotorista, VendaVeiculo, DespesaFixa, CategoriaDespesa } from '../types';

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

export const formatCurrency = (val: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val || 0);
};

export const formatCurrencyDetailed = (val: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val || 0);
};

export const formatPercent = (val: number): string => {
  return `${(val || 0).toFixed(1)}%`;
};

export const formatDate = (dateStr: string): string => {
  if (!dateStr) return '-';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR');
  } catch {
    return dateStr;
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
 * Garante que NENHUMA despesa de repasse, sócios, pró-labore ou bônus seja somada ao custo do veículo.
 */
export const calculateTotalDespesas = (veiculo: Veiculo): number => {
  if (!veiculo.despesas || veiculo.despesas.length === 0) return 0;
  return veiculo.despesas
    .filter((curr) => !isCategoriaRepasseDistribuicao(curr.categoria))
    .reduce((acc, curr) => acc + (curr.valor || 0), 0);
};

export const calculateCustoTotal = (veiculo: Veiculo): number => {
  return (veiculo.custoAquisicao || 0) + calculateTotalDespesas(veiculo);
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
  statusPagamento?: 'Pago' | 'Pendente';
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
  receitaRetornoTac: number;
  receitaOperacionalBruta: number;
  
  // Percentuais de Receita (base = receitaOperacionalBruta)
  pctReceitaVendas: number;
  pctReceitaLocacoes: number;
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

  // Receitas de Locação (pagamentos quitados no mês ou acumulados)
  let receitaLocacoes = 0;
  let qtdLocacoesAtivas = 0;

  veiculos.forEach((v) => {
    if (v.contratoAtivo) {
      if (v.contratoAtivo.status === 'Ativo') qtdLocacoesAtivas++;
      v.contratoAtivo.pagamentos.forEach((p) => {
        if (p.status === 'Pago') {
          if (!mesFiltro || mesFiltro === 'todos') {
            receitaLocacoes += p.valor || 0;
          } else {
            const dataRef = p.dataPagamento || p.dataVencimento;
            if (dataRef && dataRef.startsWith(mesFiltro)) {
              receitaLocacoes += p.valor || 0;
            }
          }
        }
      });
    }
  });

  // Receita Operacional Bruta
  const receitaOperacionalBruta = receitaVendas + receitaLocacoes + receitaRetornoTac;

  const getPct = (val: number) => {
    if (receitaOperacionalBruta <= 0) return 0;
    return (val / receitaOperacionalBruta) * 100;
  };

  // 4. CMV (Custo das Mercadorias Vendidas - Aquisição, Oficina/Peças e Comissões)
  const cmvCompraVendidos = vendasFiltradas.reduce((sum, v) => sum + (v.valorCompra || 0), 0);
  
  // Recondicionamento: assegura que repasses/distribuições NÃO entrem no custo de oficina
  const cmvRecondicionamentoVendidos = vendasFiltradas.reduce((sum, v) => {
    const veic = veiculos.find((x) => x.id === v.veiculoId || (x.chassi && v.chassi && x.chassi === v.chassi));
    if (veic) {
      return sum + calculateTotalDespesas(veic);
    }
    return sum + (v.totalDespesas || 0);
  }, 0);

  const cmvComissoesVendidos = vendasFiltradas.reduce((sum, v) => sum + (v.comissaoValor || 0), 0);
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

  // 8. Lucro Líquido Real da Operação (após deduzir Despesas Fixas, Provisões e Repasses/Distribuições)
  const lucroLiquidoReal = receitaOperacionalBruta - cmvTotal - totalDespesasFixas - totalProvisoes - totalRepassesEDistribuicoes;
  const margemLiquidaPercent = getPct(lucroLiquidoReal);

  return {
    receitaVendas,
    receitaLocacoes,
    receitaRetornoTac,
    receitaOperacionalBruta,
    pctReceitaVendas: getPct(receitaVendas),
    pctReceitaLocacoes: getPct(receitaLocacoes),
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

    lucroLiquidoReal,
    margemLiquidaPercent,

    quantidadeVendas: vendasFiltradas.length,
    quantidadeLocacoesAtivas: qtdLocacoesAtivas,
    quantidadeDespesasFixas: despesasFiltradas.length,
  };
};

