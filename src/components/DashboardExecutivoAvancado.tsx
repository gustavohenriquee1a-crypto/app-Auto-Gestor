import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import {
  TrendingUp,
  DollarSign,
  PieChart as PieIcon,
  BarChart3,
  Calendar,
  Layers,
  Wrench,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
  Tag,
  Car,
  Filter,
  CheckCircle2,
  Building2
} from 'lucide-react';
import { Veiculo, VendaVeiculo, DespesaFixa, Usuario } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';

interface DashboardExecutivoAvancadoProps {
  veiculos: Veiculo[];
  vendas: VendaVeiculo[];
  despesasFixas: DespesaFixa[];
  currentUser?: Usuario | null;
  onOpenDossie?: (veiculo: Veiculo) => void;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export const DashboardExecutivoAvancado: React.FC<DashboardExecutivoAvancadoProps> = ({
  veiculos,
  vendas,
  despesasFixas,
  currentUser,
  onOpenDossie,
}) => {
  const [periodoFiltro, setPeriodoFiltro] = useState<'todos' | '30d' | '90d' | 'ano'>('todos');
  const [visTipoGrafico, setVisTipoGrafico] = useState<'bar' | 'area'>('bar');

  // Filtrar vendas pelo período selecionado
  const vendasFiltradas = useMemo(() => {
    if (periodoFiltro === 'todos') return vendas;

    const agora = new Date();
    const limite = new Date();
    if (periodoFiltro === '30d') limite.setDate(agora.getDate() - 30);
    else if (periodoFiltro === '90d') limite.setDate(agora.getDate() - 90);
    else if (periodoFiltro === 'ano') limite.setFullYear(agora.getFullYear(), 0, 1);

    return vendas.filter((v) => new Date(v.dataVenda) >= limite);
  }, [vendas, periodoFiltro]);

  // Cálculos Consolidados de DRE
  const dreConsolidado = useMemo(() => {
    let receitaBruta = 0;
    let custoAquisicaoTotal = 0;
    let custosOficinaPreparacaoTotal = 0;
    let custosFreteTransporteTotal = 0;
    let comissoesPagasTotal = 0;

    vendasFiltradas.forEach((venda) => {
      const precoVenda = Number(venda.valorVenda) || 0;
      receitaBruta += precoVenda;

      const veiculoOrig = veiculos.find((v) => v.id === venda.veiculoId);
      const custoCompra = Number(veiculoOrig?.custoAquisicao) || 0;
      custoAquisicaoTotal += custoCompra;

      // Despesas do veículo
      const despesas = veiculoOrig?.despesas || [];
      despesas.forEach((d) => {
        const val = Number(d.valor) || 0;
        if (d.categoria === 'Frete / Transporte' || d.categoria === 'Frete / Guincho') {
          custosFreteTransporteTotal += val;
        } else if (d.categoria === 'Comissão') {
          // Já contado ou somado
        } else {
          custosOficinaPreparacaoTotal += val;
        }
      });

      // Se houver frete inicial declarado no cadastro
      if (veiculoOrig?.custo_frete_transporte) {
        custosFreteTransporteTotal += Number(veiculoOrig.custo_frete_transporte);
      }

      comissoesPagasTotal += Number(venda.comissaoValor) || 0;
    });

    const despesasFixasTotal = despesasFixas.reduce((acc, df) => acc + (Number(df.valor) || 0), 0);

    const custoMercadoriaVendida = custoAquisicaoTotal + custosOficinaPreparacaoTotal + custosFreteTransporteTotal + comissoesPagasTotal;
    const lucroBruto = receitaBruta - custoMercadoriaVendida;
    const lucroLiquidoReal = lucroBruto - (periodoFiltro === 'todos' ? despesasFixasTotal : despesasFixasTotal / (periodoFiltro === '30d' ? 12 : 4));
    const margemBrutaPercent = receitaBruta > 0 ? (lucroBruto / receitaBruta) * 100 : 0;
    const margemLiquidaPercent = receitaBruta > 0 ? (lucroLiquidoReal / receitaBruta) * 100 : 0;
    const ticketMedio = vendasFiltradas.length > 0 ? receitaBruta / vendasFiltradas.length : 0;
    const lucroMedioPorCarro = vendasFiltradas.length > 0 ? lucroBruto / vendasFiltradas.length : 0;

    return {
      receitaBruta,
      custoAquisicaoTotal,
      custosOficinaPreparacaoTotal,
      custosFreteTransporteTotal,
      comissoesPagasTotal,
      despesasFixasTotal,
      custoMercadoriaVendida,
      lucroBruto,
      lucroLiquidoReal,
      margemBrutaPercent,
      margemLiquidaPercent,
      ticketMedio,
      lucroMedioPorCarro,
      quantidadeVendas: vendasFiltradas.length,
    };
  }, [vendasFiltradas, veiculos, despesasFixas, periodoFiltro]);

  // 1. Dados para o Gráfico de Barras do DRE Consolidado
  const dreChartData = useMemo(() => {
    return [
      {
        etapa: 'Faturamento Bruto',
        valor: dreConsolidado.receitaBruta,
        fill: '#3b82f6',
      },
      {
        etapa: 'Custos Aquisição',
        valor: dreConsolidado.custoAquisicaoTotal,
        fill: '#64748b',
      },
      {
        etapa: 'Oficina & Preparação',
        valor: dreConsolidado.custosOficinaPreparacaoTotal,
        fill: '#f59e0b',
      },
      {
        etapa: 'Frete & Transporte',
        valor: dreConsolidado.custosFreteTransporteTotal,
        fill: '#06b6d4',
      },
      {
        etapa: 'Comissões Vendedores',
        valor: dreConsolidado.comissoesPagasTotal,
        fill: '#ec4899',
      },
      {
        etapa: 'Lucro Bruto Operacional',
        valor: Math.max(0, dreConsolidado.lucroBruto),
        fill: '#10b981',
      },
    ];
  }, [dreConsolidado]);

  // 2. Margem de Lucro por Veículo Vendido
  const margensPorVeiculoData = useMemo(() => {
    return vendasFiltradas.map((venda) => {
      const vOrig = veiculos.find((v) => v.id === venda.veiculoId);
      const modelo = venda.veiculoModelo || vOrig?.modelo || 'Carro';
      const placa = venda.veiculoPlaca || vOrig?.placa || '';
      const precoVenda = Number(venda.valorVenda) || 0;
      const custoCompra = Number(vOrig?.custoAquisicao) || 0;
      const custoOficina = (vOrig?.despesas || []).reduce((s, d) => s + (Number(d.valor) || 0), 0) + (Number(vOrig?.custo_frete_transporte) || 0);
      const custoComissao = Number(venda.comissaoValor) || 0;
      const custoTotal = custoCompra + custoOficina + custoComissao;
      const lucroReais = precoVenda - custoTotal;
      const margemPercent = precoVenda > 0 ? (lucroReais / precoVenda) * 100 : 0;

      return {
        id: venda.id,
        veiculoId: venda.veiculoId,
        nome: `${placa} - ${modelo.split(' ')[0]}`,
        modeloCompleto: modelo,
        placa,
        precoVenda,
        custoCompra,
        custoOficina,
        custoTotal,
        lucroReais,
        margemPercent: Number(margemPercent.toFixed(1)),
      };
    }).sort((a, b) => b.lucroReais - a.lucroReais);
  }, [vendasFiltradas, veiculos]);

  // 3. Evolução dos Custos de Oficina e Preparação ao Longo dos Meses
  const evolucaoCustosOficinaData = useMemo(() => {
    const mesesMap: { [mes: string]: { mes: string; pecas: number; mecanica: number; funilaria: number; frete: number; total: number } } = {};

    veiculos.forEach((v) => {
      (v.despesas || []).forEach((d) => {
        if (!d || !d.data) return;
        const [ano, mes] = d.data.split('-');
        const chave = `${mes}/${ano.slice(2)}`;
        const val = Number(d.valor) || 0;

        if (!mesesMap[chave]) {
          mesesMap[chave] = { mes: chave, pecas: 0, mecanica: 0, funilaria: 0, frete: 0, total: 0 };
        }

        if (d.categoria === 'Peças' || d.categoria === 'Pneus') {
          mesesMap[chave].pecas += val;
        } else if (d.categoria === 'Mecânica / Mão de Obra') {
          mesesMap[chave].mecanica += val;
        } else if (d.categoria === 'Funilaria / Pintura' || d.categoria === 'Estética / Lavagem') {
          mesesMap[chave].funilaria += val;
        } else if (d.categoria === 'Frete / Transporte' || d.categoria === 'Frete / Guincho') {
          mesesMap[chave].frete += val;
        }
        mesesMap[chave].total += val;
      });
    });

    return Object.values(mesesMap).slice(-6); // Últimos 6 meses
  }, [veiculos]);

  // 4. Breakdown de Gastos por Categoria
  const categoriaDespesasData = useMemo(() => {
    const catMap: { [cat: string]: number } = {};

    veiculos.forEach((v) => {
      (v.despesas || []).forEach((d) => {
        const cat = d.categoria || 'Outros';
        catMap[cat] = (catMap[cat] || 0) + (Number(d.valor) || 0);
      });
    });

    return Object.entries(catMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [veiculos]);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Principal do Dashboard Executivo */}
      <div className="bg-gradient-to-r from-blue-950/60 via-[#111116] to-[#14121e] p-6 sm:p-8 rounded-3xl border border-blue-500/20 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
                <BarChart3 size={20} />
              </span>
              <span className="text-xs font-black uppercase text-blue-400 tracking-wider">
                Controladoria & Gestão Financeira Avançada
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Dashboard Executivo Avançado
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
              Análise profunda de DRE consolidado, margens líquidas por chassi, evolução de custos de oficina e retorno sobre investimento.
            </p>
          </div>

          {/* Filtro de Período */}
          <div className="flex items-center gap-2 p-1.5 bg-black/40 rounded-2xl border border-white/10">
            <Filter size={14} className="text-slate-400 ml-2" />
            <button
              type="button"
              onClick={() => setPeriodoFiltro('todos')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                periodoFiltro === 'todos' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Todo Histórico
            </button>
            <button
              type="button"
              onClick={() => setPeriodoFiltro('ano')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                periodoFiltro === 'ano' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Este Ano
            </button>
            <button
              type="button"
              onClick={() => setPeriodoFiltro('90d')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                periodoFiltro === '90d' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              90 Dias
            </button>
            <button
              type="button"
              onClick={() => setPeriodoFiltro('30d')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                periodoFiltro === '30d' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              30 Dias
            </button>
          </div>
        </div>

        {/* 4 Cards de Métricas Principais */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/5">
          <div className="p-4 rounded-2xl bg-black/30 border border-white/5 space-y-1">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
              <DollarSign size={13} className="text-blue-400" /> Faturamento Total
            </span>
            <p className="text-2xl font-black text-white font-mono">
              {formatCurrency(dreConsolidado.receitaBruta)}
            </p>
            <span className="text-[10px] text-emerald-400 font-bold">
              {dreConsolidado.quantidadeVendas} veículos vendidos
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-black/30 border border-white/5 space-y-1">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
              <TrendingUp size={13} className="text-emerald-400" /> Lucro Bruto Operacional
            </span>
            <p className="text-2xl font-black text-emerald-400 font-mono">
              {formatCurrency(dreConsolidado.lucroBruto)}
            </p>
            <span className="text-[10px] text-slate-400">
              Margem Bruta: <strong className="text-emerald-300">{dreConsolidado.margemBrutaPercent.toFixed(1)}%</strong>
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-black/30 border border-white/5 space-y-1">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
              <Wrench size={13} className="text-amber-400" /> Gastos em Preparação
            </span>
            <p className="text-2xl font-black text-amber-300 font-mono">
              {formatCurrency(dreConsolidado.custosOficinaPreparacaoTotal + dreConsolidado.custosFreteTransporteTotal)}
            </p>
            <span className="text-[10px] text-slate-400">
              Oficina, peças e fretes
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-black/30 border border-white/5 space-y-1">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
              <Sparkles size={13} className="text-purple-400" /> Lucro Médio / Carro
            </span>
            <p className="text-2xl font-black text-purple-300 font-mono">
              {formatCurrency(dreConsolidado.lucroMedioPorCarro)}
            </p>
            <span className="text-[10px] text-slate-400">
              Ticket Médio: {formatCurrency(dreConsolidado.ticketMedio)}
            </span>
          </div>
        </div>
      </div>

      {/* BLOCO 1: DRE Consolidado em Gráfico Visual */}
      <div className="bg-[#111116] rounded-3xl p-6 sm:p-7 border border-white/5 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <BarChart3 size={18} className="text-blue-400" />
              DRE Consolidado Visual (Demonstrativo de Resultado)
            </h3>
            <p className="text-xs text-slate-400">
              Composição visual de receitas, deduções operacionais e resultado líquido das vendas
            </p>
          </div>
        </div>

        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dreChartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
              <XAxis
                dataKey="etapa"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                interval={0}
              />
              <YAxis
                stroke="#64748b"
                fontSize={10}
                tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#16171f',
                  borderColor: '#ffffff20',
                  borderRadius: '16px',
                  color: '#fff',
                  fontSize: '12px',
                }}
                formatter={(val: any) => [formatCurrency(Number(val)), 'Valor']}
              />
              <Bar dataKey="valor" radius={[8, 8, 0, 0]}>
                {dreChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* BLOCO 2: Margem de Lucro por Veículo Vendido */}
      <div className="bg-[#111116] rounded-3xl p-6 sm:p-7 border border-white/5 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <TrendingUp size={18} className="text-emerald-400" />
              Margens de Lucro por Veículo Vendido
            </h3>
            <p className="text-xs text-slate-400">
              Rentabilidade líquida real apurada em cada carro (Preço de Venda menos Compra, Oficina, Frete e Comissão)
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Exibindo <strong>{margensPorVeiculoData.length}</strong> vendas no período
          </span>
        </div>

        {margensPorVeiculoData.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            Nenhuma venda registrada no período selecionado.
          </div>
        ) : (
          <div className="h-80 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={margensPorVeiculoData.slice(0, 10)}
                margin={{ top: 10, right: 10, left: 10, bottom: 25 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="nome" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis
                  stroke="#64748b"
                  fontSize={10}
                  tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#16171f',
                    borderColor: '#ffffff20',
                    borderRadius: '16px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                  formatter={(val: any, name: string) => [
                    name === 'margemPercent' ? `${val}%` : formatCurrency(Number(val)),
                    name === 'precoVenda'
                      ? 'Preço de Venda'
                      : name === 'custoTotal'
                      ? 'Custo Total'
                      : 'Lucro Líquido',
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="precoVenda" name="Preço de Venda" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="custoTotal" name="Custo Total" fill="#64748b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="lucroReais" name="Lucro Líquido" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Tabela dos 5 Melhores Retornos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-white/5">
          <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <ArrowUpRight size={14} /> Top 3 Maior Lucro em Reais (R$)
            </span>
            <div className="space-y-2">
              {margensPorVeiculoData.slice(0, 3).map((item, idx) => (
                <div key={item.id} className="flex items-center justify-between text-xs p-2 rounded-xl bg-black/40">
                  <span className="font-semibold text-white truncate max-w-[180px]">
                    {idx + 1}. {item.modeloCompleto} ({item.placa})
                  </span>
                  <span className="font-mono font-black text-emerald-300">
                    +{formatCurrency(item.lucroReais)} ({item.margemPercent}%)
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-blue-950/20 border border-blue-500/30 space-y-2">
            <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
              <Percent size={14} /> Top 3 Maior Margem Percentual (%)
            </span>
            <div className="space-y-2">
              {[...margensPorVeiculoData]
                .sort((a, b) => b.margemPercent - a.margemPercent)
                .slice(0, 3)
                .map((item, idx) => (
                  <div key={item.id} className="flex items-center justify-between text-xs p-2 rounded-xl bg-black/40">
                    <span className="font-semibold text-white truncate max-w-[180px]">
                      {idx + 1}. {item.modeloCompleto} ({item.placa})
                    </span>
                    <span className="font-mono font-black text-blue-300">
                      {item.margemPercent}% ({formatCurrency(item.lucroReais)})
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* BLOCO 3 & 4: Evolução de Custos de Oficina e Distribuição por Categoria */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Evolução de Custos de Oficina */}
        <div className="bg-[#111116] rounded-3xl p-6 sm:p-7 border border-white/5 shadow-xl space-y-4">
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Wrench size={16} className="text-amber-400" />
              Evolução dos Custos de Oficina & Preparação
            </h3>
            <p className="text-xs text-slate-400">
              Acompanhamento mensal de gastos com mecânica, funilaria, peças e transporte
            </p>
          </div>

          {evolucaoCustosOficinaData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-500 text-xs">
              Nenhuma despesa de oficina lançada no histórico.
            </div>
          ) : (
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={evolucaoCustosOficinaData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis dataKey="mes" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis
                    stroke="#64748b"
                    fontSize={10}
                    tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#16171f',
                      borderColor: '#ffffff20',
                      borderRadius: '16px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                    formatter={(val: any) => [formatCurrency(Number(val)), 'Gasto']}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    name="Custo Total Oficina"
                    stroke="#f59e0b"
                    fill="#f59e0b20"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Distribuição por Categoria de Custo */}
        <div className="bg-[#111116] rounded-3xl p-6 sm:p-7 border border-white/5 shadow-xl space-y-4">
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <PieIcon size={16} className="text-indigo-400" />
              Distribuição dos Gastos por Categoria
            </h3>
            <p className="text-xs text-slate-400">
              Proporção dos investimentos de preparação por especialidade técnica
            </p>
          </div>

          {categoriaDespesasData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-500 text-xs">
              Nenhuma categoria com despesas lançadas.
            </div>
          ) : (
            <div className="h-64 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoriaDespesasData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {categoriaDespesasData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#16171f',
                      borderColor: '#ffffff20',
                      borderRadius: '16px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                    formatter={(val: any) => [formatCurrency(Number(val)), 'Total']}
                  />
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    wrapperStyle={{ fontSize: '11px', color: '#cbd5e1' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
