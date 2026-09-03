import React, { useState, useMemo } from 'react';
import { 
  Car, 
  DollarSign, 
  Percent, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  Calendar, 
  Wrench, 
  ArrowUpRight,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  Clock,
  ExternalLink,
  Plus,
  Layers,
  Building,
  Activity,
  Check,
  Zap,
  BarChart3,
  Gift,
  Target,
  Award
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  Legend,
  ReferenceLine
} from 'recharts';
import { Veiculo, VendaVeiculo, DespesaFixa, Usuario } from '../types';
import { MetricCard } from './MetricCard';
import { 
  formatCurrency, 
  formatDate, 
  formatKm, 
  calculateAging, 
  calculateCustoTotal,
  checkRevisaoNecessaria,
  checkIsVeiculoVendido
} from '../utils/formatters';

interface DashboardViewProps {
  veiculos: Veiculo[];
  vendas: VendaVeiculo[];
  despesasFixas: DespesaFixa[];
  currentUser?: Usuario | null;
  onOpenDossie: (veiculo: Veiculo) => void;
  onSelectTab?: (tab: string) => void;
  onOpenNovoLancamento: () => void;
  onRegistrarPagamento: (contratoId: string, pagamentoId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  veiculos,
  vendas,
  despesasFixas,
  currentUser,
  onOpenDossie,
  onSelectTab = (_tab: string) => {},
  onOpenNovoLancamento,
  onRegistrarPagamento,
}) => {
  const [tipoGraficoOperacional, setTipoGraficoOperacional] = useState<'mesAtual' | 'evolucao'>('mesAtual');

  // 1. Calculations for KPIs
  const veiculosAtivos = veiculos.filter(v => !checkIsVeiculoVendido(v, vendas));
  const veiculosAlugados = veiculosAtivos.filter(v => v.status === 'Alugado');
  const taxaOcupacao = veiculosAtivos.length > 0 
    ? Math.round((veiculosAlugados.length / veiculosAtivos.length) * 100) 
    : 0;

  // Total Capital Imobilizado em Pátio / Frota Ativa
  const capitalImobilizado = veiculosAtivos.reduce((sum, v) => sum + calculateCustoTotal(v), 0);

  // Total Receita Vendas este mês (ou base)
  const totalReceitaVendas = vendas.reduce((sum, v) => sum + v.valorVenda, 0);
  const totalLucroVendas = vendas.reduce((sum, v) => sum + v.lucroLiquido, 0);

  // Total Receita Aluguéis Pagos
  let totalReceitaAlugueis = 0;
  veiculos.forEach(v => {
    if (v.contratoAtivo) {
      v.contratoAtivo.pagamentos.forEach(p => {
        if (p.status === 'Pago') {
          totalReceitaAlugueis += p.valor;
        }
      });
    }
  });

  const faturamentoTotalMes = totalReceitaVendas + totalReceitaAlugueis;

  // ==========================================
  // CÁLCULOS ESPECÍFICOS DO MÊS VIGENTE (AGOSTO/2026)
  // ==========================================
  const mesAtualStr = '2026-08';

  // 1. Receita de Locações no Mês Vigente (Pagamentos confirmados/realizados no período)
  let receitaLocacoesMesVigente = 0;
  veiculos.forEach(v => {
    if (v.contratoAtivo) {
      v.contratoAtivo.pagamentos?.forEach(p => {
        if (p.status === 'Pago') {
          const ref = p.dataPagamento || p.dataVencimento;
          if (!ref || ref.startsWith(mesAtualStr)) {
            receitaLocacoesMesVigente += p.valor;
          }
        }
      });
    }
  });

  // 2. Despesas Fixas Operacionais do Mês Vigente
  const despesasFixasMesVigente = despesasFixas
    .filter(d => !d.mesReferencia || d.mesReferencia === mesAtualStr)
    .reduce((sum, d) => sum + d.valor, 0);

  // 3. Despesas de Manutenção / Preparação da Frota no Mês Vigente
  let despesasManutencaoFrotaMes = 0;
  veiculos.forEach(v => {
    v.despesas?.forEach(d => {
      if (d.data && d.data.startsWith(mesAtualStr)) {
        despesasManutencaoFrotaMes += d.valor;
      }
    });
  });

  // 4. Total de Despesas Operacionais do Mês Vigente
  const totalDespesasOperacionaisMes = despesasFixasMesVigente + despesasManutencaoFrotaMes;

  // 5. Resultado Líquido da Operação de Locação
  const resultadoOperacionalLocacoes = receitaLocacoesMesVigente - totalDespesasOperacionaisMes;
  const taxaCoberturaDespesas = totalDespesasOperacionaisMes > 0 
    ? Math.round((receitaLocacoesMesVigente / totalDespesasOperacionaisMes) * 100) 
    : (receitaLocacoesMesVigente > 0 ? 100 : 0);

  // Dados do Gráfico de Barras - Mês Vigente Detalhado
  const dadosGraficoMesVigente = [
    {
      categoria: 'Receita Locações',
      valor: receitaLocacoesMesVigente,
      fill: '#10B981', // Verde Esmeralda
      tipo: 'Receita',
      rotulo: 'Aluguéis Recebidos',
    },
    {
      categoria: 'Despesas Fixas',
      valor: despesasFixasMesVigente,
      fill: '#F59E0B', // Âmbar
      tipo: 'Despesa Fixa',
      rotulo: 'Pátio, Folha e Softwares',
    },
    {
      categoria: 'Manutenção Frota',
      valor: despesasManutencaoFrotaMes,
      fill: '#F43F5E', // Rosa/Vermelho
      tipo: 'Despesa Variável',
      rotulo: 'Oficina, Peças e Revisões',
    },
    {
      categoria: 'Total Despesas Op.',
      valor: totalDespesasOperacionaisMes,
      fill: '#EF4444', // Vermelho Forte
      tipo: 'Despesa Total',
      rotulo: 'Custos Totais da Operação',
    },
    {
      categoria: 'Saldo Operacional',
      valor: Math.max(0, resultadoOperacionalLocacoes),
      fill: resultadoOperacionalLocacoes >= 0 ? '#3B82F6' : '#64748B', // Azul
      tipo: 'Resultado Líquido',
      rotulo: resultadoOperacionalLocacoes >= 0 ? 'Superávit Operacional' : 'Déficit Operacional',
    },
  ];

  // Dados do Gráfico de Barras - Evolução Mensal (Calculado dinamicamente)
  const dadosEvolucaoLocacoesVsDespesas = [
    { 
      mes: 'Mês Vigente', 
      receitaLocacao: receitaLocacoesMesVigente, 
      despesasOperacionais: totalDespesasOperacionaisMes, 
      saldoLiquido: resultadoOperacionalLocacoes 
    },
  ];

  // ==========================================
  // ANÁLISE DE SAZONALIDADE & VENDAS ÚLTIMOS 6 MESES (RECHARTS)
  // ==========================================
  const dadosSazonalidade6Meses = React.useMemo(() => {
    const meses = [];
    const hoje = new Date();

    // Gerar os últimos 6 meses cronologicamente (do mais antigo para o mais recente)
    for (let i = 5; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const ano = d.getFullYear();
      const mesNum = (d.getMonth() + 1).toString().padStart(2, '0');
      const chaveMes = `${ano}-${mesNum}`;

      const nomesMeses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const nomesCompletos = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ];

      const rotuloMes = `${nomesMeses[d.getMonth()]}/${ano.toString().slice(-2)}`;
      const rotuloCompleto = `${nomesCompletos[d.getMonth()]} de ${ano}`;

      // Filtrar vendas ocorridas neste mês específico
      const vendasDoMes = vendas.filter(v => v.dataVenda && v.dataVenda.startsWith(chaveMes));
      const volumeTotal = vendasDoMes.reduce((acc, v) => acc + (v.valorVenda || 0), 0);
      const totalLucro = vendasDoMes.reduce((acc, v) => acc + (v.lucroLiquido || 0), 0);
      const quantidade = vendasDoMes.length;
      const ticketMedio = quantidade > 0 ? volumeTotal / quantidade : 0;

      meses.push({
        chave: chaveMes,
        mes: rotuloMes,
        mesCompleto: rotuloCompleto,
        volume: volumeTotal,
        quantidade: quantidade,
        lucro: totalLucro,
        ticketMedio: ticketMedio,
        isMesAtual: i === 0,
      });
    }

    const volumeTotalPeriodo = meses.reduce((acc, m) => acc + m.volume, 0);
    const quantidadeTotalPeriodo = meses.reduce((acc, m) => acc + m.quantidade, 0);
    const lucroTotalPeriodo = meses.reduce((acc, m) => acc + m.lucro, 0);
    const mediaMensalVolume = volumeTotalPeriodo / 6;
    const mediaMensalQtd = quantidadeTotalPeriodo / 6;

    // Identificar melhor e pior mês para leitura de sazonalidade
    const mesesComVenda = meses.filter(m => m.volume > 0);
    const melhorMes = meses.length > 0 ? [...meses].sort((a, b) => b.volume - a.volume)[0] : null;
    const piorMes = mesesComVenda.length > 0 ? [...mesesComVenda].sort((a, b) => a.volume - b.volume)[0] : null;

    return {
      dadosGrafico: meses,
      volumeTotalPeriodo,
      quantidadeTotalPeriodo,
      lucroTotalPeriodo,
      mediaMensalVolume,
      mediaMensalQtd,
      melhorMes,
      piorMes,
    };
  }, [vendas]);

  // Aging alerts (> 60 dias)
  const veiculosAgingCritico = veiculosAtivos.filter(v => calculateAging(v.dataEntrada).faixa === '60+');
  const veiculosAgingAtencao = veiculosAtivos.filter(v => calculateAging(v.dataEntrada).faixa === '31-60');

  // Revision alerts (>= 10.000 km)
  const veiculosRevisaoUrgente = veiculosAtivos.filter(v => checkRevisaoNecessaria(v).isUrgente);

  // Payment alerts (Atrasados ou Pendentes)
  const pagamentosPendentes: { veiculo: Veiculo; pagamento: any; contrato: any }[] = [];
  veiculosAtivos.forEach(v => {
    if (v.contratoAtivo) {
      v.contratoAtivo.pagamentos?.forEach(p => {
        if (p.status === 'Atrasado' || p.status === 'Pendente') {
          pagamentosPendentes.push({
            veiculo: v,
            pagamento: p,
            contrato: v.contratoAtivo,
          });
        }
      });
    }
  });

  // Comissões e Despesas Pendentes de Aprovação / Baixa
  const comissoesPendentes = useMemo(() => {
    return vendas.filter(v => (v.comissaoValor || 0) > 0 && (v.comissaoStatus === 'Pendente' || !v.comissaoStatus));
  }, [vendas]);

  const despesasPendentes = useMemo(() => {
    const list: { veiculo: Veiculo; despesa: any }[] = [];
    veiculos.forEach(v => {
      v.despesas?.forEach(d => {
        if (d.statusPagamento === 'Pendente') {
          list.push({ veiculo: v, despesa: d });
        }
      });
    });
    return list;
  }, [veiculos]);

  const totalComissoesPendentesValor = useMemo(() => {
    return comissoesPendentes.reduce((acc, v) => acc + (v.comissaoValor || 0), 0);
  }, [comissoesPendentes]);

  // Chart data: Monthly flow baseado nos dados reais
  const chartData = [
    { 
      mes: 'Atual', 
      vendas: totalReceitaVendas, 
      aluguel: totalReceitaAlugueis, 
      custos: totalDespesasOperacionaisMes + vendas.reduce((s, v) => s + (v.custoTotal || 0), 0) 
    },
  ];

  // Pie chart data: Status da frota
  const statusCounts = {
    'Disponível': veiculosAtivos.filter(v => v.status === 'Disponível').length,
    'Alugado': veiculosAtivos.filter(v => v.status === 'Alugado').length,
    'Em Preparação': veiculosAtivos.filter(v => v.status === 'Em Preparação').length,
    'Vendido (Histórico)': vendas.length,
  };

  const pieData = [
    { name: 'Disponível', value: statusCounts['Disponível'], color: '#10B981' },
    { name: 'Alugado', value: statusCounts['Alugado'], color: '#3B82F6' },
    { name: 'Em Preparação', value: statusCounts['Em Preparação'], color: '#F59E0B' },
    { name: 'Vendidos', value: statusCounts['Vendido (Histórico)'], color: '#64748B' },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 1. Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard
          id="kpi-faturamento"
          title="Faturamento Global"
          value={formatCurrency(faturamentoTotalMes)}
          subValue={`Vendas: ${formatCurrency(totalReceitaVendas)} | Aluguel: ${formatCurrency(totalReceitaAlugueis)}`}
          color="text-blue-600"
          badge="+18.4% vs mês ant."
          icon={TrendingUp}
          iconBg="bg-blue-50 text-blue-600"
        />

        <MetricCard
          id="kpi-patio"
          title="Custo em Pátio (Ativo)"
          value={formatCurrency(capitalImobilizado)}
          subValue={`${veiculosAtivos.length} veículos em estoque/frota`}
          color="text-orange-600"
          badge="Capital Imobilizado"
          icon={Car}
          iconBg="bg-orange-50 text-orange-600"
          onClick={() => onSelectTab('estoque')}
        />

        <MetricCard
          id="kpi-ocupacao"
          title="Taxa de Ocupação"
          value={`${taxaOcupacao}%`}
          subValue={`${veiculosAlugados.length} de ${veiculosAtivos.length} carros locados`}
          color="text-emerald-600"
          badge="Meta: > 80%"
          icon={Calendar}
          iconBg="bg-emerald-50 text-emerald-600"
          onClick={() => onSelectTab('locacao')}
        />

        <MetricCard
          id="kpi-alertas"
          title="Alertas de Gestão"
          value={`${veiculosAgingCritico.length + pagamentosPendentes.length + veiculosRevisaoUrgente.length + comissoesPendentes.length}`}
          subValue={`${comissoesPendentes.length > 0 ? `${comissoesPendentes.length} comissões • ` : ''}${veiculosAgingCritico.length} aging • ${pagamentosPendentes.length} cobrança`}
          color={veiculosAgingCritico.length + pagamentosPendentes.length + comissoesPendentes.length > 0 ? "text-rose-600 font-black" : "text-slate-700"}
          badge="Ação Necessária"
          icon={AlertTriangle}
          iconBg="bg-rose-50 text-rose-600"
        />
      </div>

      {/* 2. Critical Action Center / Priority Alerts */}
      {(pagamentosPendentes.length > 0 || veiculosRevisaoUrgente.length > 0 || veiculosAgingCritico.length > 0 || comissoesPendentes.length > 0) && (
        <div className="bg-[#111116] rounded-2xl p-6 text-white border border-white/10 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/5">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/30">
                <ShieldAlert size={20} />
              </span>
              <div>
                <h3 className="font-bold text-base text-white">Central de Alertas & Operações Urgentes</h3>
                <p className="text-xs text-slate-400">Ações recomendadas para evitar inadimplência, comissões pendentes e depreciação</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {comissoesPendentes.length > 0 && (
                <button
                  onClick={() => onSelectTab('comissoes')}
                  className="text-xs bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 px-3 py-1.5 rounded-lg border border-purple-500/30 transition font-medium flex items-center gap-1.5"
                >
                  <Award size={13} />
                  Ver Comissões ({comissoesPendentes.length})
                </button>
              )}
              <button
                onClick={() => onSelectTab('locacao')}
                className="text-xs bg-white/5 hover:bg-white/10 text-slate-200 px-3 py-1.5 rounded-lg border border-white/10 transition font-medium"
              >
                Ver Locações
              </button>
              <button
                onClick={() => onSelectTab('aging')}
                className="text-xs bg-white/5 hover:bg-white/10 text-slate-200 px-3 py-1.5 rounded-lg border border-white/10 transition font-medium"
              >
                Ver Aging
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
            {/* Alerta: Comissões Pendentes de Pagamento */}
            {comissoesPendentes.length > 0 && (
              <div className="bg-[#16171e] rounded-xl p-4 border border-purple-500/40 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-purple-400 font-bold text-xs mb-2">
                    <span className="flex items-center gap-1.5">
                      <Award size={14} /> Comissão de Venda
                    </span>
                    <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded text-[10px]">
                      {comissoesPendentes.length} PENDENTE{comissoesPendentes.length > 1 ? 'S' : ''}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-white">
                    {comissoesPendentes[0].vendedorNome || 'Vendedor'} • {comissoesPendentes[0].modelo}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Placa: <span className="font-mono font-bold text-slate-200 bg-black/40 border border-white/10 px-1.5 py-0.5 rounded">{comissoesPendentes[0].placa}</span>
                  </p>
                  <p className="text-xs text-purple-300 mt-1 font-mono font-bold">
                    Valor: {formatCurrency(comissoesPendentes[0].comissaoValor || 0)}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Total a quitar: <strong className="text-white">{formatCurrency(totalComissoesPendentesValor)}</strong>
                  </p>
                </div>
                <button
                  onClick={() => onSelectTab('comissoes')}
                  className="mt-3 w-full py-1.5 px-3 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-lg transition text-center shadow-md"
                >
                  Quitar / Detalhar Comissão
                </button>
              </div>
            )}
            {/* Alerta 1: Pagamento Pendente / Atrasado */}
            {pagamentosPendentes.length > 0 ? (
              <div className="bg-[#16171e] rounded-xl p-4 border border-amber-500/30 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-amber-400 font-bold text-xs mb-2">
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle size={14} /> Cobrança Semanal Pendente
                    </span>
                    <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded text-[10px]">
                      {pagamentosPendentes[0].pagamento.status === 'Atrasado' ? 'ATRASADO' : 'PENDENTE'}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-white">
                    {pagamentosPendentes[0].contrato.motoristaNome}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Veículo: <span className="font-mono font-bold text-slate-200 bg-black/40 border border-white/10 px-1.5 py-0.5 rounded">{pagamentosPendentes[0].veiculo.placa}</span> ({pagamentosPendentes[0].veiculo.modelo})
                  </p>
                  <p className="text-xs text-amber-300/90 mt-1 font-mono font-bold">
                    Valor: {formatCurrency(pagamentosPendentes[0].pagamento.valor)} • Ref: {pagamentosPendentes[0].pagamento.semanaReferencia}
                  </p>
                </div>
                <button
                  onClick={() => onRegistrarPagamento(pagamentosPendentes[0].contrato.id, pagamentosPendentes[0].pagamento.id)}
                  className="mt-3 w-full py-1.5 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition text-center shadow-md"
                >
                  Registrar Pagamento PIX
                </button>
              </div>
            ) : (
              <div className="bg-[#16171e] rounded-xl p-4 border border-white/5 flex items-center gap-3">
                <CheckCircle2 size={24} className="text-emerald-400" />
                <div>
                  <p className="text-xs font-bold text-white">Locações 100% em dia</p>
                  <p className="text-[11px] text-slate-400">Nenhum pagamento pendente no momento</p>
                </div>
              </div>
            )}

            {/* Alerta 2: Manutenção Preventiva 10k KM */}
            {veiculosRevisaoUrgente.length > 0 ? (
              <div className="bg-[#16171e] rounded-xl p-4 border border-rose-500/40 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-rose-400 font-bold text-xs mb-2">
                    <span className="flex items-center gap-1.5">
                      <Wrench size={14} /> Revisão 10.000 KM Excedida
                    </span>
                    <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded text-[10px]">
                      URGENTE
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-white">
                    {veiculosRevisaoUrgente[0].modelo}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Placa: <span className="font-mono font-bold text-slate-200 bg-black/40 border border-white/10 px-1.5 py-0.5 rounded">{veiculosRevisaoUrgente[0].placa}</span>
                  </p>
                  <p className="text-xs text-rose-300 mt-1 font-medium">
                    Rodou <strong className="text-white">{formatKm(veiculosRevisaoUrgente[0].kmAtual - veiculosRevisaoUrgente[0].kmUltimaRevisao)}</strong> desde a última revisão!
                  </p>
                </div>
                <button
                  onClick={() => onSelectTab('revisoes')}
                  className="mt-3 w-full py-1.5 px-3 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg transition text-center shadow-md"
                >
                  Agendar / Dar Baixa na Revisão
                </button>
              </div>
            ) : (
              <div className="bg-[#16171e] rounded-xl p-4 border border-white/5 flex items-center gap-3">
                <CheckCircle2 size={24} className="text-emerald-400" />
                <div>
                  <p className="text-xs font-bold text-white">Revisões Preventivas em Dia</p>
                  <p className="text-[11px] text-slate-400">Todos veículos abaixo de 10.000 km pós-revisão</p>
                </div>
              </div>
            )}

            {/* Alerta 3: Aging Crítico (> 60 dias) */}
            {veiculosAgingCritico.length > 0 ? (
              <div className="bg-[#16171e] rounded-xl p-4 border border-red-500/40 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-red-400 font-bold text-xs mb-2">
                    <span className="flex items-center gap-1.5">
                      <Clock size={14} /> Carro Encalhado (+60 Dias)
                    </span>
                    <span className="bg-red-500/20 text-red-300 border border-red-500/30 px-2 py-0.5 rounded text-[10px]">
                      {calculateAging(veiculosAgingCritico[0].dataEntrada).dias} DIAS
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-white truncate">
                    {veiculosAgingCritico[0].modelo}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Custo Total: <span className="font-bold text-white">{formatCurrency(calculateCustoTotal(veiculosAgingCritico[0]))}</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Recomendação: Aplicar queima ou impulsionar anúncios para girar capital.
                  </p>
                </div>
                <button
                  onClick={() => onOpenDossie(veiculosAgingCritico[0])}
                  className="mt-3 w-full py-1.5 px-3 bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold text-xs rounded-lg transition text-center"
                >
                  Abrir Dossiê & Simular Venda
                </button>
              </div>
            ) : (
              <div className="bg-[#16171e] rounded-xl p-4 border border-white/5 flex items-center gap-3">
                <CheckCircle2 size={24} className="text-emerald-400" />
                <div>
                  <p className="text-xs font-bold text-white">Giro de Estoque Saudável</p>
                  <p className="text-[11px] text-slate-400">Nenhum carro acima de 60 dias em pátio</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2.5 Banner de Acesso Rápido ao CRM & Inteligência de Vendas */}
      <div className="bg-gradient-to-r from-blue-950/40 via-[#141520] to-pink-950/30 p-5 rounded-2xl border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20 flex items-center justify-center font-bold shrink-0">
            <Gift size={20} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              Inteligência de Vendas, Origem dos Leads & CRM de Aniversariantes
              <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-bold border border-blue-500/30">
                Novo Módulo
              </span>
            </h4>
            <p className="text-xs text-slate-400">
              Acompanhe conversão por canal (Google, Insta, OLX), retorno TAC das financeiras, impacto do test-drive e envie felicitações de aniversário aos clientes.
            </p>
          </div>
        </div>

        <button
          onClick={() => onSelectTab('crm-analytics')}
          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/20 transition flex items-center justify-center gap-2 shrink-0 cursor-pointer"
        >
          <Target size={15} />
          <span>Explorar CRM & Conversão</span>
          <ArrowRight size={14} />
        </button>
      </div>

      {/* 3. Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Evolução Financeira */}
        <div className="lg:col-span-2 bg-[#111116] p-6 rounded-2xl border border-white/5 shadow-none">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-base text-white">Evolução Financeira & Faturamento</h3>
              <p className="text-xs text-slate-400">Comparativo de Vendas, Receita de Locação e Custos Totais</p>
            </div>
            <button
              onClick={() => onSelectTab('financeiro')}
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition"
            >
              Ver DRE Completo <ArrowRight size={14} />
            </button>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f212d" />
                <XAxis dataKey="mes" tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} stroke="#334155" />
                <YAxis 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickFormatter={(val) => `R$ ${val / 1000}k`}
                  stroke="#334155"
                />
                <Tooltip 
                  formatter={(val: number) => [formatCurrency(val), '']}
                  contentStyle={{ backgroundColor: '#111116', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '12px', color: '#f8fafc' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px', color: '#cbd5e1' }} />
                <Bar dataKey="vendas" name="Vendas (R$)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="aluguel" name="Aluguéis (R$)" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="custos" name="Custos Diretos (R$)" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Distribuição da Frota */}
        <div className="bg-[#111116] p-6 rounded-2xl border border-white/5 shadow-none flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-base text-white">Distribuição da Frota</h3>
            <p className="text-xs text-slate-400 mb-2">Composição de veículos por status operacional</p>
          </div>

          <div className="h-52 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [`${value} veículos`, 'Quantidade']}
                  contentStyle={{ backgroundColor: '#111116', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '12px', color: '#f8fafc' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
            {pieData.map((item) => (
              <div key={item.name} className="flex items-center gap-2 text-xs">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-slate-400 truncate">{item.name}:</span>
                <span className="font-bold text-white">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3.1. NOVO GRÁFICO RECHARTS: Volume de Vendas Mensais & Análise de Sazonalidade (Últimos 6 Meses) */}
      <div className="bg-[#111116] p-6 rounded-2xl border border-white/5 shadow-none space-y-6">
        {/* Header da Seção de Sazonalidade */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-600/20">
              <TrendingUp size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-base text-white">
                  Volume de Vendas Mensais & Análise de Sazonalidade
                </h3>
                <span className="text-[11px] font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-0.5 rounded-full">
                  Últimos 6 Meses
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Identificação de sazonalidade no faturamento comercial, unidades vendidas e ticket médio histórico por período
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start lg:self-center">
            <button
              onClick={() => onSelectTab('comissoes')}
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              Ver Extrato de Vendas <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* 4 Cards de Resumo da Sazonalidade */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#16171f] p-4 rounded-xl border border-blue-500/20 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Faturamento 6 Meses</span>
              <span className="p-1.5 rounded-lg bg-blue-500/15 text-blue-400">
                <DollarSign size={16} />
              </span>
            </div>
            <div className="mt-2">
              <span className="text-xl font-black text-blue-400 font-mono">
                {formatCurrency(dadosSazonalidade6Meses.volumeTotalPeriodo)}
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {dadosSazonalidade6Meses.quantidadeTotalPeriodo} {dadosSazonalidade6Meses.quantidadeTotalPeriodo === 1 ? 'veículo vendido' : 'veículos vendidos'}
              </p>
            </div>
          </div>

          <div className="bg-[#16171f] p-4 rounded-xl border border-emerald-500/20 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Média Mensal de Vendas</span>
              <span className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400">
                <TrendingUp size={16} />
              </span>
            </div>
            <div className="mt-2">
              <span className="text-xl font-black text-emerald-400 font-mono">
                {formatCurrency(dadosSazonalidade6Meses.mediaMensalVolume)}
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Média de {dadosSazonalidade6Meses.mediaMensalQtd.toFixed(1)} carros/mês
              </p>
            </div>
          </div>

          <div className="bg-[#16171f] p-4 rounded-xl border border-amber-500/20 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Pico Sazonal (Melhor Mês)</span>
              <span className="p-1.5 rounded-lg bg-amber-500/15 text-amber-400">
                <Target size={16} />
              </span>
            </div>
            <div className="mt-2">
              <span className="text-xl font-black text-amber-400 font-mono">
                {dadosSazonalidade6Meses.melhorMes && dadosSazonalidade6Meses.melhorMes.volume > 0
                  ? formatCurrency(dadosSazonalidade6Meses.melhorMes.volume)
                  : 'R$ 0,00'}
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {dadosSazonalidade6Meses.melhorMes && dadosSazonalidade6Meses.melhorMes.volume > 0
                  ? `${dadosSazonalidade6Meses.melhorMes.mesCompleto} (${dadosSazonalidade6Meses.melhorMes.quantidade} unid.)`
                  : 'Aguardando fechamento'}
              </p>
            </div>
          </div>

          <div className="bg-[#16171f] p-4 rounded-xl border border-purple-500/20 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Lucro Líquido Acumulado</span>
              <span className="p-1.5 rounded-lg bg-purple-500/15 text-purple-400">
                <Percent size={16} />
              </span>
            </div>
            <div className="mt-2">
              <span className="text-xl font-black text-purple-400 font-mono">
                {formatCurrency(dadosSazonalidade6Meses.lucroTotalPeriodo)}
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Margem no bolso apurada nas vendas
              </p>
            </div>
          </div>
        </div>

        {/* Gráfico Recharts de Barras para os Últimos 6 Meses */}
        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={dadosSazonalidade6Meses.dadosGrafico}
              margin={{ top: 15, right: 15, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f212d" />
              <XAxis 
                dataKey="mes" 
                tickLine={false} 
                tick={{ fontSize: 12, fill: '#cbd5e1' }} 
                stroke="#334155" 
              />
              <YAxis 
                tickLine={false} 
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                tickFormatter={(val) => `R$ ${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                stroke="#334155"
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-[#111116] p-4 rounded-xl border border-white/10 shadow-2xl text-xs space-y-2 min-w-[220px]">
                        <div className="flex items-center justify-between border-b border-white/10 pb-2">
                          <span className="font-bold text-white text-sm">{data.mesCompleto}</span>
                          {data.isMesAtual && (
                            <span className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded text-[10px] font-bold">
                              Mês Atual
                            </span>
                          )}
                        </div>
                        <div className="space-y-1 text-slate-300">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">Volume Faturado:</span>
                            <span className="font-bold text-blue-400 font-mono">{formatCurrency(data.volume)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">Carros Vendidos:</span>
                            <span className="font-bold text-white font-mono">{data.quantidade} unid.</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">Lucro Líquido:</span>
                            <span className="font-bold text-emerald-400 font-mono">{formatCurrency(data.lucro)}</span>
                          </div>
                          {data.quantidade > 0 && (
                            <div className="flex justify-between items-center pt-1 border-t border-white/5">
                              <span className="text-slate-400">Ticket Médio:</span>
                              <span className="font-semibold text-amber-300 font-mono">{formatCurrency(data.ticketMedio)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px', color: '#cbd5e1' }} />
              {dadosSazonalidade6Meses.mediaMensalVolume > 0 && (
                <ReferenceLine 
                  y={dadosSazonalidade6Meses.mediaMensalVolume} 
                  stroke="#f59e0b" 
                  strokeDasharray="4 4" 
                  label={{ 
                    value: `Média (R$ ${(dadosSazonalidade6Meses.mediaMensalVolume / 1000).toFixed(0)}k)`, 
                    fill: '#f59e0b', 
                    fontSize: 11, 
                    position: 'top' 
                  }} 
                />
              )}
              <Bar 
                dataKey="volume" 
                name="Volume Faturado em Vendas (R$)" 
                radius={[6, 6, 0, 0]}
              >
                {dadosSazonalidade6Meses.dadosGrafico.map((entry, index) => {
                  const isMax = dadosSazonalidade6Meses.melhorMes && dadosSazonalidade6Meses.melhorMes.volume > 0 && entry.volume === dadosSazonalidade6Meses.melhorMes.volume;
                  return (
                    <Cell 
                      key={`saz-cell-${index}`} 
                      fill={isMax ? '#3b82f6' : entry.isMesAtual ? '#6366f1' : '#334155'} 
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Rodapé com Diagnóstico e Dicas de Sazonalidade para Reposição de Estoque */}
        <div className="p-4 rounded-xl bg-[#16171f] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
              <Zap size={16} />
            </div>
            <div>
              <p className="text-slate-300">
                <strong className="text-white font-semibold">Diagnóstico Comercial de Sazonalidade: </strong>
                {dadosSazonalidade6Meses.quantidadeTotalPeriodo > 0 ? (
                  <>
                    Nos últimos 6 meses foram comercializados <strong className="text-white font-bold">{dadosSazonalidade6Meses.quantidadeTotalPeriodo} veículos</strong> com faturamento de <strong className="text-blue-400 font-mono font-bold">{formatCurrency(dadosSazonalidade6Meses.volumeTotalPeriodo)}</strong>. Use os meses de maior volume para planejar campanhas de captação de estoque e troca com antecedência de 30 a 45 dias.
                  </>
                ) : (
                  <>
                    Conforme novas vendas forem vinculadas e baixadas no catálogo pelos vendedores, a curva histórica de sazonalidade e picos de demanda será projetada automaticamente mês a mês.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 4. NOVO GRÁFICO RECHARTS: Receita de Locações vs Despesas Operacionais (Mês Vigente) */}
      <div className="bg-[#111116] p-6 rounded-2xl border border-white/5 shadow-none space-y-6">
        {/* Header com Título, Subtítulo e Controles de Visualização */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/5">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <BarChart3 size={20} />
              </span>
              <div>
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  Receita Mensal de Locações vs. Despesas Operacionais
                  <span className="text-[11px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    Mês Vigente ({mesAtualStr})
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Comparativo direto de sustentabilidade da frota: aluguéis de motoristas de aplicativo vs. custos operacionais e fixos do mês
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start lg:self-center">
            <div className="bg-[#16171f] p-1 rounded-xl border border-white/10 flex items-center gap-1 text-xs">
              <button
                onClick={() => setTipoGraficoOperacional('mesAtual')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  tipoGraficoOperacional === 'mesAtual'
                    ? 'bg-emerald-500 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Mês Vigente (Detalhado)
              </button>
              <button
                onClick={() => setTipoGraficoOperacional('evolucao')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  tipoGraficoOperacional === 'evolucao'
                    ? 'bg-emerald-500 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Evolução Mensal
              </button>
            </div>

            <button
              onClick={() => onSelectTab('locacao')}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 px-3 py-2 rounded-xl transition flex items-center gap-1.5"
            >
              Módulo Locação <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* 4 Cards de Indicadores Operacionais */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#16171f] p-4 rounded-xl border border-emerald-500/20 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Receita de Locações (Mês)</span>
              <span className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400">
                <DollarSign size={16} />
              </span>
            </div>
            <div className="mt-2">
              <span className="text-xl font-black text-emerald-400 font-mono">
                {formatCurrency(receitaLocacoesMesVigente)}
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {veiculosAlugados.length} contratos ativos de motoristas
              </p>
            </div>
          </div>

          <div className="bg-[#16171f] p-4 rounded-xl border border-amber-500/20 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Despesas Fixas (Operação)</span>
              <span className="p-1.5 rounded-lg bg-amber-500/15 text-amber-400">
                <Building size={16} />
              </span>
            </div>
            <div className="mt-2">
              <span className="text-xl font-black text-amber-400 font-mono">
                {formatCurrency(despesasFixasMesVigente)}
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Aluguel do pátio, equipe e sistemas
              </p>
            </div>
          </div>

          <div className="bg-[#16171f] p-4 rounded-xl border border-rose-500/20 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Total Despesas Operacionais</span>
              <span className="p-1.5 rounded-lg bg-rose-500/15 text-rose-400">
                <Wrench size={16} />
              </span>
            </div>
            <div className="mt-2">
              <span className="text-xl font-black text-rose-400 font-mono">
                {formatCurrency(totalDespesasOperacionaisMes)}
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Fixas ({formatCurrency(despesasFixasMesVigente)}) + Manut. ({formatCurrency(despesasManutencaoFrotaMes)})
              </p>
            </div>
          </div>

          <div className={`bg-[#16171f] p-4 rounded-xl border flex flex-col justify-between ${
            resultadoOperacionalLocacoes >= 0 ? 'border-blue-500/30' : 'border-rose-500/30'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Resultado Operacional Líquido</span>
              <span className={`p-1.5 rounded-lg ${
                resultadoOperacionalLocacoes >= 0 ? 'bg-blue-500/15 text-blue-400' : 'bg-rose-500/15 text-rose-400'
              }`}>
                <Activity size={16} />
              </span>
            </div>
            <div className="mt-2">
              <span className={`text-xl font-black font-mono ${
                resultadoOperacionalLocacoes >= 0 ? 'text-blue-400' : 'text-rose-400'
              }`}>
                {resultadoOperacionalLocacoes >= 0 ? '+' : ''}{formatCurrency(resultadoOperacionalLocacoes)}
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                Cobertura: <strong className="text-white font-mono">{taxaCoberturaDespesas}%</strong> das despesas
              </p>
            </div>
          </div>
        </div>

        {/* Área do Gráfico de Barras com Recharts */}
        <div className="h-72 w-full pt-2">
          {tipoGraficoOperacional === 'mesAtual' ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dadosGraficoMesVigente}
                margin={{ top: 15, right: 15, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f212d" />
                <XAxis 
                  dataKey="categoria" 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#cbd5e1' }} 
                  stroke="#334155" 
                />
                <YAxis 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickFormatter={(val) => `R$ ${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                  stroke="#334155"
                />
                <Tooltip 
                  formatter={(val: number, name: string, props: any) => [
                    formatCurrency(val), 
                    props.payload.rotulo || name
                  ]}
                  contentStyle={{ 
                    backgroundColor: '#111116', 
                    borderRadius: '12px', 
                    border: '1px solid rgba(255,255,255,0.1)', 
                    fontSize: '12px', 
                    color: '#f8fafc',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
                  }}
                  itemStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
                />
                <Bar 
                  dataKey="valor" 
                  name="Valor (R$)" 
                  radius={[6, 6, 0, 0]}
                >
                  {dadosGraficoMesVigente.map((entry, index) => (
                    <Cell key={`bar-cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dadosEvolucaoLocacoesVsDespesas}
                margin={{ top: 15, right: 15, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f212d" />
                <XAxis 
                  dataKey="mes" 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#cbd5e1' }} 
                  stroke="#334155" 
                />
                <YAxis 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickFormatter={(val) => `R$ ${val / 1000}k`}
                  stroke="#334155"
                />
                <Tooltip 
                  formatter={(val: number) => [formatCurrency(val), '']}
                  contentStyle={{ 
                    backgroundColor: '#111116', 
                    borderRadius: '12px', 
                    border: '1px solid rgba(255,255,255,0.1)', 
                    fontSize: '12px', 
                    color: '#f8fafc',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px', color: '#cbd5e1' }} />
                <Bar dataKey="receitaLocacao" name="Receita Locações (R$)" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="despesasOperacionais" name="Despesas Operacionais (R$)" fill="#EF4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="saldoLiquido" name="Saldo Operacional (R$)" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Rodapé Informativo com Análise de Ponto de Equilíbrio */}
        <div className="p-3.5 rounded-xl bg-[#16171f] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              taxaCoberturaDespesas >= 100 ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
            }`} />
            <p className="text-slate-300">
              {taxaCoberturaDespesas >= 100 ? (
                <>
                  <strong className="text-emerald-400 font-semibold">Operação Autossustentável:</strong> As receitas de locação cobrem <strong className="text-white font-bold">{taxaCoberturaDespesas}%</strong> de todas as despesas operacionais do mês, gerando um superávit livre de <strong className="text-emerald-300 font-mono">{formatCurrency(resultadoOperacionalLocacoes)}</strong>.
                </>
              ) : (
                <>
                  <strong className="text-amber-400 font-semibold">Atenção ao Ponto de Equilíbrio:</strong> As receitas de locação cobrem <strong className="text-white font-bold">{taxaCoberturaDespesas}%</strong> dos custos operacionais do mês vigente (Déficit operacional de <strong className="text-rose-400 font-mono">{formatCurrency(Math.abs(resultadoOperacionalLocacoes))}</strong>).
                </>
              )}
            </p>
          </div>
          <button
            onClick={() => onSelectTab('financeiro')}
            className="text-slate-400 hover:text-white font-semibold text-xs transition flex items-center gap-1 self-end sm:self-auto shrink-0"
          >
            Abrir DRE Completo <ArrowRight size={13} />
          </button>
        </div>
      </div>

      {/* 4. Tabela de Destaque da Frota / Acesso Rápido ao Dossiê */}
      <div className="bg-[#111116] rounded-2xl border border-white/5 shadow-none overflow-hidden">
        <div className="p-5 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-base text-white">Veículos em Pátio & Frota Ativa</h3>
            <p className="text-xs text-slate-400">Clique em qualquer veículo para abrir o <strong>Dossiê Financeiro por Chassi</strong></p>
          </div>
          <button
            onClick={() => onSelectTab('estoque')}
            className="text-xs font-semibold text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 px-3 py-1.5 rounded-lg transition flex items-center gap-1.5"
          >
            Ver Todos no Estoque <ArrowRight size={14} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#16171e] text-slate-400 uppercase font-semibold border-b border-white/5">
                <th className="py-3.5 px-4">Veículo & KM</th>
                <th className="py-3.5 px-4">Placa / Chassi</th>
                <th className="py-3.5 px-4">Custo Aquis.</th>
                <th className="py-3.5 px-4">Prep. & Despesas</th>
                <th className="py-3.5 px-4">Custo Final</th>
                <th className="py-3.5 px-4">Aging (Pátio)</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {veiculosAtivos.map((v) => {
                const aging = calculateAging(v.dataEntrada);
                const totalPrep = v.despesas?.reduce((s, d) => s + d.valor, 0) || 0;
                const custoFinal = (v.custoAquisicao || 0) + totalPrep;

                return (
                  <tr 
                    key={v.id}
                    onClick={() => onOpenDossie(v)}
                    className="hover:bg-white/[0.03] transition cursor-pointer group"
                  >
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-200 text-sm group-hover:text-blue-400 transition-colors">
                        {v.modelo}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {v.ano} • {formatKm(v.kmAtual)} • {v.cor}
                      </p>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold bg-white/5 text-slate-200 px-2 py-0.5 rounded border border-white/10 text-xs">
                        {v.placa}
                      </span>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate max-w-[140px]" title={v.chassi}>
                        {v.chassi}
                      </p>
                    </td>

                    <td className="py-3.5 px-4 font-medium text-slate-300">
                      {formatCurrency(v.custoAquisicao)}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-200">
                        {formatCurrency(totalPrep)}
                      </span>
                      <span className="block text-[10px] text-slate-400">
                        {v.despesas?.length || 0} lançamentos
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-black text-white">
                      {formatCurrency(custoFinal)}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-1 rounded-md text-[11px] font-bold border ${aging.badgeColor}`}>
                        {aging.dias} dias
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                          v.status === 'Disponível'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : v.status === 'Alugado'
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                            : v.status === 'Em Preparação'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : 'bg-white/5 text-slate-300 border-white/10'
                        }`}
                      >
                        {v.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenDossie(v);
                        }}
                        className="p-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-600 hover:text-white border border-blue-500/20 rounded-lg transition text-xs font-semibold flex items-center gap-1 ml-auto"
                        title="Ver Dossiê Financeiro"
                      >
                        <ArrowUpRight size={15} />
                        <span className="hidden sm:inline">Dossiê</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
