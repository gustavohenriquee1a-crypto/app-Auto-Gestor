import React, { useState, useMemo } from 'react';
import {
  Award,
  DollarSign,
  TrendingUp,
  Car,
  CheckCircle2,
  Clock,
  Search,
  Sparkles,
  Calendar,
  Tag,
  Target,
  ArrowUpRight,
  Filter,
  Layers,
  ChevronRight,
  Fuel,
  Gauge,
  MapPin,
  Calculator,
  FileText,
  Percent,
  Check,
  UserCheck,
  Zap,
  ShoppingBag
} from 'lucide-react';
import { Veiculo, VendaVeiculo, Usuario } from '../types';
import { formatCurrency, formatKm, checkIsVeiculoVendido, isVeiculoLocacao } from '../utils/formatters';

interface DashboardVendedorViewProps {
  vendas: VendaVeiculo[];
  veiculos: Veiculo[];
  currentUser: Usuario | null;
  onOpenVenda: (veiculo: Veiculo) => void;
  onOpenDossie: (veiculo: Veiculo) => void;
  onSelectTab?: (tab: string) => void;
  onNavigate?: (tab: string) => void;
}

export const DashboardVendedorView: React.FC<DashboardVendedorViewProps> = ({
  vendas,
  veiculos,
  currentUser,
  onOpenVenda,
  onOpenDossie,
  onSelectTab,
  onNavigate,
}) => {
  const handleSelectTab = (tab: string) => {
    if (typeof onSelectTab === 'function') {
      onSelectTab(tab);
    } else if (typeof onNavigate === 'function') {
      onNavigate(tab);
    }
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [statusComissaoFilter, setStatusComissaoFilter] = useState<'Todos' | 'Pendente' | 'Paga'>('Todos');
  const [catalogoTab, setCatalogoTab] = useState<'todos' | 'disponiveis' | 'preparacao'>('todos');
  const [selectedVendaRecibo, setSelectedVendaRecibo] = useState<VendaVeiculo | null>(null);

  // Commission simulation state
  const [simuladorValorCarro, setSimuladorValorCarro] = useState<number>(55000);
  const commissionRate = currentUser?.comissaoPadraoPercent ?? 1.5;
  const isComissaoFixa = currentUser?.tipoComissaoPadrao === 'fixo';
  const valorComissaoFixa = currentUser?.comissaoPadraoFixo ?? 500;

  // Filter sales belonging to current seller
  const minhasVendas = useMemo(() => {
    return vendas.filter((v) => {
      if (!currentUser) return true;
      if (v.vendedorId === currentUser.uid || v.vendedorEmail === currentUser.email) {
        return true;
      }
      // If seller name matches
      if (v.vendedorNome && currentUser.displayName && v.vendedorNome.toLowerCase() === currentUser.displayName.toLowerCase()) {
        return true;
      }
      // Fallback: if user is admin, allow viewing
      if (currentUser.role === 'admin' || currentUser.role === 'gestor') {
        return true;
      }
      return false;
    });
  }, [vendas, currentUser]);

  // Seller metrics calculations
  const stats = useMemo(() => {
    const currentMonthStr = new Date().toISOString().slice(0, 7); // YYYY-MM
    let totalVolume = 0;
    let totalComissoes = 0;
    let comissoesPagas = 0;
    let comissoesPendentes = 0;
    let vendasMesAtual = 0;
    let volumeMesAtual = 0;

    minhasVendas.forEach((v) => {
      const valor = v.valorVenda || 0;
      const comissao = v.comissaoValor || 0;

      totalVolume += valor;
      totalComissoes += comissao;

      if (v.comissaoStatus === 'Paga') {
        comissoesPagas += comissao;
      } else {
        comissoesPendentes += comissao;
      }

      if (v.dataVenda && v.dataVenda.startsWith(currentMonthStr)) {
        vendasMesAtual += 1;
        volumeMesAtual += valor;
      }
    });

    const ticketMedio = minhasVendas.length > 0 ? totalVolume / minhasVendas.length : 0;
    const metaCarrosMes = 5;
    const metaProgresso = Math.min(100, Math.round((vendasMesAtual / metaCarrosMes) * 100));

    return {
      totalVendas: minhasVendas.length,
      vendasMesAtual,
      totalVolume,
      volumeMesAtual,
      totalComissoes,
      comissoesPagas,
      comissoesPendentes,
      ticketMedio,
      metaCarrosMes,
      metaProgresso,
    };
  }, [minhasVendas]);

  // Filtered sales for the table
  const filteredMinhasVendas = useMemo(() => {
    return minhasVendas.filter((v) => {
      const matchSearch =
        v.modelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.compradorNome.toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus =
        statusComissaoFilter === 'Todos' ||
        (statusComissaoFilter === 'Pendente' && (v.comissaoStatus === 'Pendente' || !v.comissaoStatus)) ||
        (statusComissaoFilter === 'Paga' && v.comissaoStatus === 'Paga');

      return matchSearch && matchStatus;
    });
  }, [minhasVendas, searchTerm, statusComissaoFilter]);

  // Commercial catalog (Disponíveis + Em Preparação) - STRICTLY PROTECTED: NO PURCHASE COST OR REPAIR COSTS
  // Ocultar imediatamente qualquer veículo vendido ('Vendido' no estoque ou com venda registrada)
  const carrosComerciais = useMemo(() => {
    return veiculos.filter((v) => {
      // 1. Excluir veículos vendidos ou da frota de locação de qualquer vitrine de vendas
      if (checkIsVeiculoVendido(v, vendas) || isVeiculoLocacao(v) || v.tipoOperacao === 'Locacao') {
        return false;
      }
      if (v.status_estoque === 'Em Trânsito' || v.status === 'Alugado' || Boolean(v.contratoAtivo)) return false;

      const statusEstoque = v.status_estoque || (v.status === 'Em Preparação' ? 'Em Preparação' : 'No Pátio');
      if (statusEstoque !== 'No Pátio' && statusEstoque !== 'Em Preparação') return false;

      if (catalogoTab === 'disponiveis') return (statusEstoque === 'No Pátio' || v.status === 'Disponível') && statusEstoque !== 'Em Preparação';
      if (catalogoTab === 'preparacao') return statusEstoque === 'Em Preparação' || v.status === 'Em Preparação';
      return true;
    });
  }, [veiculos, vendas, catalogoTab]);

  const countDisponiveis = veiculos.filter((v) => 
    !checkIsVeiculoVendido(v, vendas) && 
    !isVeiculoLocacao(v) && 
    v.tipoOperacao !== 'Locacao' && 
    v.status_estoque !== 'Em Trânsito' && 
    v.status !== 'Alugado' && 
    (v.status === 'Disponível' || v.status_estoque === 'No Pátio') && 
    v.status_estoque !== 'Em Preparação'
  ).length;

  const countPreparacao = veiculos.filter((v) => 
    !checkIsVeiculoVendido(v, vendas) && 
    !isVeiculoLocacao(v) && 
    v.tipoOperacao !== 'Locacao' && 
    v.status_estoque !== 'Em Trânsito' && 
    v.status !== 'Alugado' && 
    (v.status === 'Em Preparação' || v.status_estoque === 'Em Preparação')
  ).length;

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* 1. Header Profile Banner */}
      <div className="bg-[#111116] p-6 rounded-3xl border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="relative">
            {currentUser?.photoURL ? (
              <img
                src={currentUser.photoURL}
                alt={currentUser.displayName}
                referrerPolicy="no-referrer"
                className="w-16 h-16 rounded-2xl object-cover border-2 border-blue-500/30 shadow-lg"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-blue-500/20">
                {currentUser?.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'V'}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-[#111116] flex items-center justify-center">
              <Check size={11} className="text-white stroke-[3]" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-2xl font-black text-white tracking-tight">
                Olá, {currentUser?.displayName || 'Vendedor'}!
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] font-bold uppercase tracking-wider">
                {currentUser?.cargo || 'Consultor Comercial'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Acompanhe seu desempenho de vendas, comissões apuradas e veículos disponíveis para negociação.
            </p>
          </div>
        </div>

        {/* Commission Rate Badge */}
        <div className="flex items-center gap-3">
          <div className="p-3.5 rounded-2xl bg-[#16171f] border border-white/5 text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Sua Comissão Padrão</span>
            <div className="flex items-center gap-1.5 justify-end mt-0.5">
              <Award size={16} className="text-amber-400" />
              <span className="text-lg font-black text-amber-400 font-mono">
                {isComissaoFixa ? formatCurrency(valorComissaoFixa) : `${commissionRate}%`}
              </span>
            </div>
          </div>

          <button
            onClick={() => handleSelectTab('catalogo')}
            className="px-4 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/20 transition active:scale-95 cursor-pointer"
          >
            <Sparkles size={16} />
            <span>Abrir Catálogo Completo</span>
          </button>
        </div>
      </div>

      {/* 2. Key Performance Indicators (KPI Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Carros Vendidos */}
        <div className="bg-[#111116] p-5 rounded-2xl border border-white/5 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Carros Vendidos</span>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Car size={20} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-black text-white">{stats.totalVendas}</p>
            <div className="flex items-center justify-between mt-1 text-[11px]">
              <span className="text-emerald-400 font-semibold">+{stats.vendasMesAtual} este mês</span>
              <span className="text-slate-500">Ticket: {formatCurrency(stats.ticketMedio)}</span>
            </div>
          </div>
        </div>

        {/* Volume Faturado */}
        <div className="bg-[#111116] p-5 rounded-2xl border border-white/5 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Volume Faturado</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-emerald-400 font-mono">{formatCurrency(stats.totalVolume)}</p>
            <div className="flex items-center justify-between mt-1 text-[11px]">
              <span className="text-slate-400">Mês atual:</span>
              <span className="text-white font-bold font-mono">{formatCurrency(stats.volumeMesAtual)}</span>
            </div>
          </div>
        </div>

        {/* Comissões a Receber (Pendentes) */}
        <div className="bg-[#111116] p-5 rounded-2xl border border-amber-500/20 bg-gradient-to-br from-[#111116] to-amber-950/10 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Comissão a Receber</span>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Clock size={20} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-amber-400 font-mono">{formatCurrency(stats.comissoesPendentes)}</p>
            <div className="flex items-center justify-between mt-1 text-[11px]">
              <span className="text-slate-400">Total acumulado:</span>
              <span className="text-white font-bold font-mono">{formatCurrency(stats.totalComissoes)}</span>
            </div>
          </div>
        </div>

        {/* Comissões Já Pagas */}
        <div className="bg-[#111116] p-5 rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-[#111116] to-emerald-950/10 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Comissão Já Paga</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-emerald-400 font-mono">{formatCurrency(stats.comissoesPagas)}</p>
            <div className="flex items-center justify-between mt-1 text-[11px]">
              <span className="text-slate-400">Status financeiro:</span>
              <span className="text-emerald-400 font-bold">100% Liquidado</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Monthly Goal & Commission Simulator Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Sales Goal Card */}
        <div className="bg-[#111116] p-6 rounded-3xl border border-white/5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Target size={18} className="text-purple-400" />
                <span>Meta de Vendas Mensal</span>
              </div>
              <span className="text-xs font-bold font-mono text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-500/20">
                {stats.metaProgresso}% Atingido
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Sua meta para este mês é de <strong>{stats.metaCarrosMes} carros vendidos</strong>.
            </p>
          </div>

          <div className="space-y-2">
            <div className="w-full bg-[#16171f] rounded-full h-3.5 p-0.5 border border-white/5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-purple-600 via-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.max(8, stats.metaProgresso)}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-400 font-medium">
              <span>{stats.vendasMesAtual} vendidos</span>
              <span>Faltam {Math.max(0, stats.metaCarrosMes - stats.vendasMesAtual)} para a meta</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#16171f] border border-white/5 flex items-center justify-between text-xs">
            <span className="text-slate-400">Estimativa bônus ao bater meta:</span>
            <span className="font-bold text-emerald-400 font-mono">+ R$ 1.000,00</span>
          </div>
        </div>

        {/* Live Commission Simulator for Seller */}
        <div className="lg:col-span-2 bg-[#111116] p-6 rounded-3xl border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <Calculator size={18} className="text-blue-400" />
              <span>Simulador Rápido de Comissão na Venda</span>
            </div>
            <span className="text-xs text-slate-400">Cálculo em tempo real</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
            {/* Input Valor Carro */}
            <div className="sm:col-span-2 space-y-2">
              <label className="text-xs font-semibold text-slate-400 block">
                Valor Negociado do Veículo (R$)
              </label>
              <div className="relative">
                <DollarSign size={16} className="absolute left-3 top-3 text-slate-500" />
                <input
                  type="number"
                  value={simuladorValorCarro}
                  onChange={(e) => setSimuladorValorCarro(Number(e.target.value))}
                  placeholder="Ex: 65000"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-white/10 bg-[#16171f] text-white font-mono font-bold text-base outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex gap-2">
                {[35000, 50000, 75000, 100000].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setSimuladorValorCarro(v)}
                    className={`px-2 py-1 rounded text-[10px] font-bold transition ${
                      simuladorValorCarro === v
                        ? 'bg-blue-600 text-white'
                        : 'bg-white/5 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    {formatCurrency(v)}
                  </button>
                ))}
              </div>
            </div>

            {/* Resultado Estimado */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/20 to-[#16171f] border border-emerald-500/30 text-right flex flex-col justify-center">
              <span className="text-[10px] uppercase font-bold text-emerald-400">Sua Comissão nesta Venda</span>
              <p className="text-2xl font-black text-emerald-400 font-mono mt-1">
                {isComissaoFixa
                  ? formatCurrency(valorComissaoFixa)
                  : formatCurrency((simuladorValorCarro * commissionRate) / 100)}
              </p>
              <span className="text-[10px] text-slate-400 mt-1">
                Base calculada: {isComissaoFixa ? 'Valor Fixo' : `${commissionRate}% sobre o valor`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Showcase: Available Vehicles & In Preparation (Zero Cost Leakage) */}
      <div className="bg-[#111116] p-6 rounded-3xl border border-white/5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-amber-400" />
              <h3 className="text-lg font-bold text-white">Carros Prontos e Chegando no Showroom</h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Consulte os veículos disponíveis no pátio e os carros em preparação para pré-venda aos seus clientes.
            </p>
          </div>

          {/* Filter tabs: Todos / Disponíveis / Em Preparação */}
          <div className="flex items-center bg-[#16171f] p-1 rounded-xl border border-white/10 text-xs">
            <button
              onClick={() => setCatalogoTab('todos')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                catalogoTab === 'todos'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Todos ({countDisponiveis + countPreparacao})
            </button>
            <button
              onClick={() => setCatalogoTab('disponiveis')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                catalogoTab === 'disponiveis'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Prontos no Pátio ({countDisponiveis})
            </button>
            <button
              onClick={() => setCatalogoTab('preparacao')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                catalogoTab === 'preparacao'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Em Preparação ({countPreparacao})
            </button>
          </div>
        </div>

        {/* Showcase Grid */}
        {carrosComerciais.length === 0 ? (
          <div className="p-8 text-center bg-[#16171f] rounded-2xl text-slate-400">
            <Car size={36} className="mx-auto text-slate-600 mb-2" />
            <p className="text-sm font-bold text-white">Nenhum veículo nessa categoria no momento</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {carrosComerciais.slice(0, 8).map((v) => {
              const effectivePrice = v.valorVendaSugerido || v.valorFipe || 55000;
              const estimatedComissao = isComissaoFixa ? valorComissaoFixa : (effectivePrice * commissionRate) / 100;
              const photoUrl = v.fotoUrl || 'https://images.unsplash.com/photo-1541348263662-e0c8de4259ba?w=600&auto=format&fit=crop&q=80';
              const isEmPreparacao = v.status === 'Em Preparação';

              return (
                <div
                  key={v.id}
                  className="bg-[#16171f] rounded-2xl border border-white/5 hover:border-blue-500/40 transition overflow-hidden flex flex-col justify-between group"
                >
                  <div className="relative h-40 bg-slate-950 overflow-hidden">
                    <img
                      src={photoUrl}
                      alt={v.modelo}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#16171f] via-transparent to-black/50" />

                    {/* Top status */}
                    <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
                      <span className="font-mono text-[11px] font-black bg-black/80 backdrop-blur-md text-white px-2 py-0.5 rounded border border-white/10">
                        {v.placa}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md shadow ${
                          isEmPreparacao
                            ? 'bg-amber-500 text-slate-950 font-black'
                            : 'bg-emerald-500 text-white'
                        }`}
                      >
                        {isEmPreparacao ? '🔧 Em Preparação' : '🟢 No Pátio'}
                      </span>
                    </div>
                  </div>

                  {/* Body Info */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">{v.marca}</span>
                      <h4 className="text-sm font-black text-white truncate">{v.modelo}</h4>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                        <span className="font-mono">{v.ano}</span>
                        <span>•</span>
                        <span className="font-mono">{formatKm(v.kmAtual)}</span>
                        <span>•</span>
                        <span>{v.cor}</span>
                      </div>
                    </div>

                    {/* Commercial Pricing Block */}
                    <div className="p-2.5 rounded-xl bg-[#111116] border border-white/5 space-y-1">
                      <div className="flex items-baseline justify-between">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Preço Sugerido:</span>
                        <span className="text-sm font-black text-white font-mono">{formatCurrency(effectivePrice)}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-white/5">
                        <span className="text-amber-400 font-medium">Sua Comissão:</span>
                        <span className="font-black font-mono text-emerald-400">{formatCurrency(estimatedComissao)}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-1 flex gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenDossie(v)}
                        className="py-2 px-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold border border-white/5 transition"
                        title="Ver Ficha Comercial"
                      >
                        <Layers size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenVenda(v)}
                        className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                      >
                        <Tag size={14} /> Vender Carro
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Detailed Sales & Commission Statement Table */}
      <div className="bg-[#111116] p-6 rounded-3xl border border-white/5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Award size={18} className="text-amber-400" />
              <h3 className="text-lg font-bold text-white">Extrato de Vendas & Comissões</h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Histórico de cada veículo que você negociou com valor exato de comissão e status de liquidação.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por placa, modelo ou comprador..."
                className="pl-8 pr-3 py-1.5 rounded-xl border border-white/10 bg-[#16171f] text-white outline-none focus:border-blue-500 text-xs"
              />
            </div>

            <select
              value={statusComissaoFilter}
              onChange={(e) => setStatusComissaoFilter(e.target.value as any)}
              className="p-2 rounded-xl border border-white/10 bg-[#16171f] text-white outline-none focus:border-blue-500 font-medium text-xs"
            >
              <option value="Todos">Todas as Comissões</option>
              <option value="Pendente">Apenas Pendentes</option>
              <option value="Paga">Apenas Pagas</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-white/5 overflow-hidden">
          {filteredMinhasVendas.length === 0 ? (
            <div className="p-10 text-center text-slate-400 space-y-2 bg-[#16171f]">
              <Car size={36} className="mx-auto text-slate-600" />
              <p className="text-sm font-bold text-white">Nenhuma venda encontrada no seu histórico</p>
              <p className="text-xs text-slate-500">
                Assim que você realizar a primeira venda de um veículo, o extrato da comissão aparecerá aqui.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#16171f] text-slate-400 border-b border-white/5 uppercase tracking-wider text-[10px]">
                    <th className="p-3.5 font-bold">Veículo / Placa</th>
                    <th className="p-3.5 font-bold">Data da Venda</th>
                    <th className="p-3.5 font-bold">Comprador</th>
                    <th className="p-3.5 font-bold">Valor Negociado</th>
                    <th className="p-3.5 font-bold">Sua Comissão</th>
                    <th className="p-3.5 font-bold">Status Comissão</th>
                    <th className="p-3.5 font-bold text-right">Comprovante</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-200">
                  {filteredMinhasVendas.map((v) => {
                    const isPaga = v.comissaoStatus === 'Paga';
                    const comissao = v.comissaoValor || (v.valorVenda * (v.comissaoPercentual || 1.5)) / 100;

                    return (
                      <tr key={v.id} className="hover:bg-white/[0.02] transition">
                        <td className="p-3.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold bg-white/5 border border-white/10 px-2 py-0.5 rounded text-[11px] text-white">
                              {v.placa}
                            </span>
                            <span className="font-bold text-white">{v.modelo}</span>
                          </div>
                        </td>
                        <td className="p-3.5 font-mono text-slate-400">{v.dataVenda}</td>
                        <td className="p-3.5">
                          <p className="font-bold text-white">{v.compradorNome}</p>
                          <span className="text-[10px] text-slate-500 font-mono">{v.formaPagamento}</span>
                        </td>
                        <td className="p-3.5 font-black font-mono text-white text-sm">
                          {formatCurrency(v.valorVenda)}
                        </td>
                        <td className="p-3.5 font-black font-mono text-emerald-400 text-sm">
                          {formatCurrency(comissao)}
                          {v.comissaoPercentual && (
                            <span className="text-[10px] text-slate-500 font-normal ml-1">
                              ({v.comissaoPercentual}%)
                            </span>
                          )}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isPaga
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}
                          >
                            {isPaga ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                            {isPaga ? 'Comissão Paga' : 'Comissão Pendente'}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedVendaRecibo(v)}
                            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-blue-400 border border-white/5 font-semibold text-[11px] transition inline-flex items-center gap-1"
                          >
                            <FileText size={12} /> Ver Recibo
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Recibo Modal */}
      {selectedVendaRecibo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md max-h-[90vh] flex flex-col bg-gray-900 rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-white/10 bg-[#16171e] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Award size={20} className="text-amber-400" />
                <h4 className="text-base font-bold text-white">Comprovante de Venda & Comissão</h4>
              </div>
              <button
                onClick={() => setSelectedVendaRecibo(null)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg bg-white/5 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-[#16171f] border border-white/5 flex justify-between items-center">
                <span className="text-slate-400">Veículo:</span>
                <span className="font-bold text-white">{selectedVendaRecibo.modelo} ({selectedVendaRecibo.placa})</span>
              </div>
              <div className="p-3 rounded-xl bg-[#16171f] border border-white/5 flex justify-between items-center">
                <span className="text-slate-400">Data da Venda:</span>
                <span className="font-mono text-white">{selectedVendaRecibo.dataVenda}</span>
              </div>
              <div className="p-3 rounded-xl bg-[#16171f] border border-white/5 flex justify-between items-center">
                <span className="text-slate-400">Comprador:</span>
                <span className="font-bold text-white">{selectedVendaRecibo.compradorNome}</span>
              </div>
              <div className="p-3 rounded-xl bg-[#16171f] border border-white/5 flex justify-between items-center">
                <span className="text-slate-400">Valor da Venda:</span>
                <span className="font-black font-mono text-white">{formatCurrency(selectedVendaRecibo.valorVenda)}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex justify-between items-center">
                <span className="text-emerald-400 font-bold">Comissão do Vendedor:</span>
                <span className="font-black font-mono text-emerald-400 text-base">
                  {formatCurrency(selectedVendaRecibo.comissaoValor)}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[#16171f] border border-white/5 flex justify-between items-center">
                <span className="text-slate-400">Status de Pagamento:</span>
                <span className={`font-bold ${selectedVendaRecibo.comissaoStatus === 'Paga' ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {selectedVendaRecibo.comissaoStatus === 'Paga' ? 'Paga / Liquidada' : 'Aguardando Pagamento Financeiro'}
                </span>
              </div>
            </div>

            <div className="p-4 sm:p-5 border-t border-white/10 bg-[#16171e] shrink-0">
              <button
                onClick={() => setSelectedVendaRecibo(null)}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition cursor-pointer shadow-lg shadow-blue-600/30"
              >
                Fechar Comprovante
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
