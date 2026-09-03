import React, { useState, useMemo } from 'react';
import {
  Car,
  Search,
  Filter,
  DollarSign,
  Tag,
  Sparkles,
  CheckCircle2,
  Calendar,
  Gauge,
  Fuel,
  MapPin,
  TrendingUp,
  Percent,
  Award,
  Layers,
  ChevronRight,
  ShieldCheck,
  Eye,
  EyeOff,
  SlidersHorizontal,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Clock,
  Wrench,
  X,
  Compass
} from 'lucide-react';
import { Veiculo, Usuario } from '../types';
import { formatCurrency, formatKm, formatDate, calculateAging, calculateCustoTotal } from '../utils/formatters';

interface CatalogoVendasViewProps {
  veiculos: Veiculo[];
  currentUser: Usuario | null;
  onOpenVenda: (veiculo: Veiculo) => void;
  onOpenDossie?: (veiculo: Veiculo) => void;
  onOpenTestDrive?: (veiculo: Veiculo) => void;
}

export const CatalogoVendasView: React.FC<CatalogoVendasViewProps> = ({
  veiculos,
  currentUser,
  onOpenVenda,
  onOpenDossie,
  onOpenTestDrive,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Todos' | 'Disponível' | 'Em Preparação'>('Todos');
  const [marcaFilter, setMarcaFilter] = useState<string>('Todas');
  const [combustivelFilter, setCombustivelFilter] = useState<string>('Todos');
  const [anoMin, setAnoMin] = useState<number | ''>('');
  const [anoMax, setAnoMax] = useState<number | ''>('');
  const [precoMin, setPrecoMin] = useState<number | ''>('');
  const [precoMax, setPrecoMax] = useState<number | ''>('');
  const [faixaPrecoPreset, setFaixaPrecoPreset] = useState<string>('todos');
  const [sortOrder, setSortOrder] = useState<'preco-asc' | 'preco-desc' | 'recentes' | 'km' | 'ano-desc'>('recentes');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Check user permissions
  const isVendedor = currentUser?.role === 'vendedor';
  const canSell = currentUser?.permissoes?.venderCarro !== false;
  const canViewCosts = (currentUser?.permissoes?.verCustosAquisicao === true || currentUser?.role === 'admin') && !isVendedor;
  const isComissaoFixa = currentUser?.tipoComissaoPadrao === 'fixo';
  const valorComissaoFixa = currentUser?.comissaoPadraoFixo ?? 500;
  const commissionRate = currentUser?.comissaoPadraoPercent || 1.5;

  // Filter vehicles eligible for the sales catalog:
  // - Ocultar IMEDIATAMENTE veículos vendidos (status_estoque === 'Vendido', status === 'Vendido' ou com venda vinculada)
  // - O vendedor só deve ver veículos disponíveis ('No Pátio') ou 'Em Preparação'.
  // - Veículos 'Em Trânsito' ou 'Alugado' não entram no Catálogo Comercial de Vendas.
  const veiculosCatalogo = useMemo(() => {
    return veiculos.filter((v) => {
      // 1. EXCLUIR veículos vendidos de forma estrita
      if (
        v.status_estoque === 'Vendido' ||
        v.status === 'Vendido' ||
        Boolean(v.venda)
      ) {
        return false;
      }

      // 2. Veículos 'Em Trânsito' ou 'Alugado' NUNCA aparecem no catálogo comercial
      if (v.status_estoque === 'Em Trânsito' || v.status === 'Alugado') {
        return false;
      }

      // 3. Exibir APENAS veículos cujo status_estoque seja DIFERENTE de 'Vendido': 'No Pátio' ou 'Em Preparação'
      const statusEstoque = v.status_estoque || (v.status === 'Em Preparação' ? 'Em Preparação' : 'No Pátio');
      return statusEstoque === 'No Pátio' || statusEstoque === 'Em Preparação';
    });
  }, [veiculos]);

  // Extract unique brands with vehicle counts
  const uniqueBrands = useMemo(() => {
    const brandsMap = new Map<string, number>();
    veiculosCatalogo.forEach((v) => {
      if (v.marca) {
        brandsMap.set(v.marca, (brandsMap.get(v.marca) || 0) + 1);
      }
    });
    return Array.from(brandsMap.entries())
      .map(([marca, count]) => ({ marca, count }))
      .sort((a, b) => a.marca.localeCompare(b.marca));
  }, [veiculosCatalogo]);

  // Extract unique years available
  const uniqueAnos = useMemo(() => {
    const anos = new Set<number>();
    veiculosCatalogo.forEach((v) => {
      if (v.ano) anos.add(v.ano);
    });
    return Array.from(anos).sort((a, b) => b - a);
  }, [veiculosCatalogo]);

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchTerm.trim()) count++;
    if (statusFilter !== 'Todos') count++;
    if (marcaFilter !== 'Todas') count++;
    if (combustivelFilter !== 'Todos') count++;
    if (anoMin !== '' || anoMax !== '') count++;
    if (precoMin !== '' || precoMax !== '' || faixaPrecoPreset !== 'todos') count++;
    return count;
  }, [searchTerm, statusFilter, marcaFilter, combustivelFilter, anoMin, anoMax, precoMin, precoMax, faixaPrecoPreset]);

  const handlePricePreset = (preset: string) => {
    setFaixaPrecoPreset(preset);
    if (preset === 'todos') {
      setPrecoMin('');
      setPrecoMax('');
    } else if (preset === 'ate-40k') {
      setPrecoMin('');
      setPrecoMax(40000);
    } else if (preset === '40k-60k') {
      setPrecoMin(40000);
      setPrecoMax(60000);
    } else if (preset === '60k-80k') {
      setPrecoMin(60000);
      setPrecoMax(80000);
    } else if (preset === '80k+') {
      setPrecoMin(80000);
      setPrecoMax('');
    }
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('Todos');
    setMarcaFilter('Todas');
    setCombustivelFilter('Todos');
    setAnoMin('');
    setAnoMax('');
    setPrecoMin('');
    setPrecoMax('');
    setFaixaPrecoPreset('todos');
    setSortOrder('recentes');
  };

  // Filter and sort
  const filteredVeiculos = useMemo(() => {
    return veiculosCatalogo
      .filter((v) => {
        const matchesSearch =
          v.modelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
          v.marca.toLowerCase().includes(searchTerm.toLowerCase()) ||
          v.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (v.cor && v.cor.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesStatus = statusFilter === 'Todos' || v.status === statusFilter;
        const matchesMarca = marcaFilter === 'Todas' || v.marca === marcaFilter;
        const matchesCombustivel = combustivelFilter === 'Todos' || v.combustivel === combustivelFilter;

        // Year filter
        const matchesAnoMin = anoMin === '' || v.ano >= Number(anoMin);
        const matchesAnoMax = anoMax === '' || v.ano <= Number(anoMax);

        // Price filter (based on suggested sale price or FIPE)
        const effectivePrice = v.valorVendaSugerido || v.valorFipe || 50000;
        const matchesPrecoMin = precoMin === '' || effectivePrice >= Number(precoMin);
        const matchesPrecoMax = precoMax === '' || effectivePrice <= Number(precoMax);

        return (
          matchesSearch &&
          matchesStatus &&
          matchesMarca &&
          matchesCombustivel &&
          matchesAnoMin &&
          matchesAnoMax &&
          matchesPrecoMin &&
          matchesPrecoMax
        );
      })
      .sort((a, b) => {
        const priceA = a.valorVendaSugerido || a.valorFipe || 0;
        const priceB = b.valorVendaSugerido || b.valorFipe || 0;

        if (sortOrder === 'preco-asc') return priceA - priceB;
        if (sortOrder === 'preco-desc') return priceB - priceA;
        if (sortOrder === 'km') return a.kmAtual - b.kmAtual;
        if (sortOrder === 'ano-desc') return b.ano - a.ano;
        // Recentes
        return new Date(b.dataEntrada).getTime() - new Date(a.dataEntrada).getTime();
      });
  }, [veiculosCatalogo, searchTerm, statusFilter, marcaFilter, combustivelFilter, anoMin, anoMax, precoMin, precoMax, sortOrder]);

  // Calculate Catalog KPIs
  const stats = useMemo(() => {
    const totalCount = veiculosCatalogo.length;
    const disponiveisCount = veiculosCatalogo.filter(v => v.status === 'Disponível').length;
    const preparacaoCount = veiculosCatalogo.filter(v => v.status === 'Em Preparação').length;
    let totalValorEstoque = 0;

    veiculosCatalogo.forEach((v) => {
      totalValorEstoque += v.valorVendaSugerido || v.valorFipe || 0;
    });

    const ticketMedio = totalCount > 0 ? totalValorEstoque / totalCount : 0;

    return {
      totalCount,
      disponiveisCount,
      preparacaoCount,
      totalValorEstoque,
      ticketMedio,
    };
  }, [veiculosCatalogo]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900/40 via-indigo-900/20 to-purple-900/30 border border-blue-500/20 p-6 md:p-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-bold">
              <Sparkles size={14} className="text-blue-400" />
              <span>Showroom de Vendas & Baixa de Estoque</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Catálogo de Carros em Estoque
            </h2>
            <p className="text-xs md:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Consulte os veículos prontos para venda, confira tabelas FIPE, preço sugerido e registre a baixa da venda diretamente para apurar sua comissão.
            </p>
          </div>

          {/* Seller Commission Badge */}
          {currentUser && (
            <div className="bg-[#111116]/80 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-left shrink-0">
              <div className="flex items-center gap-2 text-xs text-slate-400 font-bold uppercase">
                <Award size={16} className="text-amber-400" />
                <span>Vendedor Conectado</span>
              </div>
              <p className="text-sm font-bold text-white mt-1 truncate">{currentUser.displayName}</p>
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/10 text-xs">
                <span className="text-slate-400">Sua Comissão Padrão:</span>
                <span className="font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-mono">
                  {commissionRate}%
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#111116] p-5 rounded-2xl border border-white/5 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Carros Disponíveis</span>
            <p className="text-2xl font-black text-white mt-1">{stats.totalCount}</p>
            <span className="text-[11px] text-slate-500">Prontos no pátio da loja</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
            <Car size={24} />
          </div>
        </div>

        <div className="bg-[#111116] p-5 rounded-2xl border border-white/5 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Volume do Showroom</span>
            <p className="text-2xl font-black text-emerald-400 mt-1">{formatCurrency(stats.totalValorEstoque)}</p>
            <span className="text-[11px] text-slate-500">Valor somado de venda sugerida</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
            <DollarSign size={24} />
          </div>
        </div>

        <div className="bg-[#111116] p-5 rounded-2xl border border-white/5 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ticket Médio</span>
            <p className="text-2xl font-black text-purple-400 mt-1">{formatCurrency(stats.ticketMedio)}</p>
            <span className="text-[11px] text-slate-500">Média por veículo no pátio</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
            <TrendingUp size={24} />
          </div>
        </div>
      </div>

      {/* Advanced Filter Toolbar */}
      <div className="bg-[#111116] p-5 rounded-2xl border border-white/5 space-y-4">
        {/* Main Search and Quick Actions */}
        <div className="space-y-3">
          {/* Status Filter Chips: Todos / Disponíveis / Em Preparação */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-400 font-semibold uppercase text-[10px] mr-1">Status no Showroom:</span>
            <button
              onClick={() => setStatusFilter('Todos')}
              className={`px-3 py-1.5 rounded-xl font-bold transition border ${
                statusFilter === 'Todos'
                  ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
                  : 'bg-white/5 text-slate-300 border-white/5 hover:bg-white/10'
              }`}
            >
              Todos ({stats.totalCount})
            </button>
            <button
              onClick={() => setStatusFilter('Disponível')}
              className={`px-3 py-1.5 rounded-xl font-bold transition border flex items-center gap-1.5 ${
                statusFilter === 'Disponível'
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                  : 'bg-white/5 text-slate-300 border-white/5 hover:bg-white/10'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              🟢 Prontos no Pátio ({stats.disponiveisCount})
            </button>
            <button
              onClick={() => setStatusFilter('Em Preparação')}
              className={`px-3 py-1.5 rounded-xl font-bold transition border flex items-center gap-1.5 ${
                statusFilter === 'Em Preparação'
                  ? 'bg-amber-600 text-white border-amber-500 shadow-xs'
                  : 'bg-white/5 text-slate-300 border-white/5 hover:bg-white/10'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              🔧 Em Preparação / Pré-Venda ({stats.preparacaoCount})
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 text-xs pt-1">
          {/* Search */}
          <div className="relative lg:col-span-4">
            <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por modelo, marca, placa ou cor..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-white/10 bg-[#16171f] text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-3 text-slate-400 hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Marca */}
          <div className="lg:col-span-3">
            <select
              value={marcaFilter}
              onChange={(e) => setMarcaFilter(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-white/10 bg-[#16171f] text-white outline-none focus:border-blue-500 font-medium cursor-pointer"
            >
              <option value="Todas">Todas as Marcas ({uniqueBrands.length})</option>
              {uniqueBrands.map((b) => (
                <option key={b.marca} value={b.marca}>
                  {b.marca} ({b.count})
                </option>
              ))}
            </select>
          </div>

          {/* Combustível */}
          <div className="lg:col-span-2">
            <select
              value={combustivelFilter}
              onChange={(e) => setCombustivelFilter(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-white/10 bg-[#16171f] text-white outline-none focus:border-blue-500 font-medium cursor-pointer"
            >
              <option value="Todos">Combustível (Todos)</option>
              <option value="Flex">Flex</option>
              <option value="Gasolina">Gasolina</option>
              <option value="Etanol">Etanol</option>
              <option value="Diesel">Diesel</option>
              <option value="Híbrido">Híbrido</option>
              <option value="Elétrico">Elétrico</option>
            </select>
          </div>

          {/* Ordenação */}
          <div className="lg:col-span-3 flex items-center gap-2">
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="w-full p-2.5 rounded-xl border border-white/10 bg-[#16171f] text-white outline-none focus:border-blue-500 font-medium cursor-pointer"
            >
              <option value="recentes">Mais Recentes no Pátio</option>
              <option value="preco-desc">Maior Preço (R$)</option>
              <option value="preco-asc">Menor Preço (R$)</option>
              <option value="km">Menor KM</option>
              <option value="ano-desc">Mais Novo (Ano)</option>
            </select>

            {/* Toggle Advanced Filters Button */}
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`p-2.5 rounded-xl border font-semibold flex items-center gap-1.5 transition shrink-0 ${
                showAdvancedFilters || activeFiltersCount > 0
                  ? 'bg-blue-600/20 text-blue-400 border-blue-500/40'
                  : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
              }`}
              title="Filtros avançados (Faixa de Preço, Ano)"
            >
              <SlidersHorizontal size={15} />
              {activeFiltersCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Quick Price Range Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5 text-xs">
          <span className="text-slate-400 font-semibold uppercase text-[10px] mr-1 flex items-center gap-1">
            <DollarSign size={12} className="text-emerald-400" /> Faixa de Preço:
          </span>
          {[
            { id: 'todos', label: 'Todos os Preços' },
            { id: 'ate-40k', label: 'Até R$ 40 mil' },
            { id: '40k-60k', label: 'R$ 40k a R$ 60k' },
            { id: '60k-80k', label: 'R$ 60k a R$ 80k' },
            { id: '80k+', label: 'Acima de R$ 80 mil' },
          ].map((preset) => (
            <button
              key={preset.id}
              onClick={() => handlePricePreset(preset.id)}
              className={`px-3 py-1 rounded-lg font-semibold transition border ${
                faixaPrecoPreset === preset.id && precoMin === (preset.id === '40k-60k' ? 40000 : preset.id === '60k-80k' ? 60000 : preset.id === '80k+' ? 80000 : '') && precoMax === (preset.id === 'ate-40k' ? 40000 : preset.id === '40k-60k' ? 60000 : preset.id === '60k-80k' ? 80000 : '')
                  ? 'bg-emerald-600 text-white border-emerald-500/40 shadow-xs'
                  : 'bg-white/5 text-slate-300 border-white/5 hover:bg-white/10 hover:text-white'
              }`}
            >
              {preset.label}
            </button>
          ))}

          {activeFiltersCount > 0 && (
            <button
              onClick={handleClearFilters}
              className="ml-auto text-rose-400 hover:text-rose-300 font-semibold text-xs flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 transition"
            >
              <RotateCcw size={12} /> Limpar Filtros ({activeFiltersCount})
            </button>
          )}
        </div>

        {/* Expandable Advanced Filter Panel (Custom Price & Year) */}
        {showAdvancedFilters && (
          <div className="pt-3 border-t border-white/5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-[#16171f]/60 p-3.5 rounded-xl border border-white/5 text-xs animate-fadeIn">
            {/* Preço Mínimo */}
            <div>
              <label className="text-slate-400 block font-semibold text-[11px] mb-1">Preço Mínimo (R$)</label>
              <input
                type="number"
                value={precoMin}
                onChange={(e) => {
                  setPrecoMin(e.target.value ? Number(e.target.value) : '');
                  setFaixaPrecoPreset('custom');
                }}
                placeholder="Ex: 30000"
                className="w-full p-2 rounded-lg border border-white/10 bg-[#111116] text-white outline-none focus:border-blue-500"
              />
            </div>

            {/* Preço Máximo */}
            <div>
              <label className="text-slate-400 block font-semibold text-[11px] mb-1">Preço Máximo (R$)</label>
              <input
                type="number"
                value={precoMax}
                onChange={(e) => {
                  setPrecoMax(e.target.value ? Number(e.target.value) : '');
                  setFaixaPrecoPreset('custom');
                }}
                placeholder="Ex: 90000"
                className="w-full p-2 rounded-lg border border-white/10 bg-[#111116] text-white outline-none focus:border-blue-500"
              />
            </div>

            {/* Ano Mínimo */}
            <div>
              <label className="text-slate-400 block font-semibold text-[11px] mb-1">Ano Fabricação A Partir De</label>
              <select
                value={anoMin}
                onChange={(e) => setAnoMin(e.target.value ? Number(e.target.value) : '')}
                className="w-full p-2 rounded-lg border border-white/10 bg-[#111116] text-white outline-none focus:border-blue-500"
              >
                <option value="">Qualquer Ano Mínimo</option>
                {uniqueAnos.map((ano) => (
                  <option key={ano} value={ano}>{ano}</option>
                ))}
              </select>
            </div>

            {/* Ano Máximo */}
            <div>
              <label className="text-slate-400 block font-semibold text-[11px] mb-1">Ano Fabricação Até</label>
              <select
                value={anoMax}
                onChange={(e) => setAnoMax(e.target.value ? Number(e.target.value) : '')}
                className="w-full p-2 rounded-lg border border-white/10 bg-[#111116] text-white outline-none focus:border-blue-500"
              >
                <option value="">Qualquer Ano Máximo</option>
                {uniqueAnos.map((ano) => (
                  <option key={ano} value={ano}>{ano}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-white/5">
          <span>
            Exibindo <strong>{filteredVeiculos.length}</strong> de {veiculosCatalogo.length} carros disponíveis no catálogo
          </span>
          {!canViewCosts && (
            <span className="flex items-center gap-1 text-[11px] text-slate-500">
              <EyeOff size={13} /> Visualização do Vendedor (Custos de compra protegidos)
            </span>
          )}
        </div>
      </div>

      {/* Vehicles Grid */}
      {filteredVeiculos.length === 0 ? (
        <div className="bg-[#111116] rounded-3xl p-12 text-center border border-white/5 space-y-3">
          <Car size={48} className="mx-auto text-slate-600 animate-bounce" />
          <h3 className="text-lg font-bold text-white">Nenhum veículo encontrado</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Não há carros correspondentes aos filtros selecionados ou todos os veículos disponíveis já foram negociados.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredVeiculos.map((v) => {
            const aging = calculateAging(v);
            const custoTotal = calculateCustoTotal(v);
            const effectivePrice = v.valorVendaSugerido || v.valorFipe || 60000;
            const isEmPreparacao = v.status === 'Em Preparação' || v.status_estoque === 'Em Preparação';
            const dataPrevisaoTermino = v.previsao_termino_preparacao || v.previsaoRetornoOficina;
            const estimatedCommission = isComissaoFixa ? valorComissaoFixa : (effectivePrice * commissionRate) / 100;
            const photoUrl = v.fotoUrl || `https://images.unsplash.com/photo-1541348263662-e0c8de4259ba?w=800&auto=format&fit=crop&q=80`;

            return (
              <div
                key={v.id}
                className={`rounded-3xl border transition-all duration-300 flex flex-col overflow-hidden shadow-xl hover:shadow-2xl group ${
                  isEmPreparacao
                    ? 'bg-[#14120e] border-amber-500/30 hover:border-amber-500/60 hover:shadow-amber-500/10'
                    : 'bg-[#111116] border-white/10 hover:border-blue-500/40 hover:shadow-blue-500/5'
                }`}
              >
                {/* Photo & Status Banner */}
                <div className="relative h-52 bg-slate-950 overflow-hidden">
                  <img
                    src={photoUrl}
                    alt={v.modelo}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#111116] via-transparent to-black/40" />

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                    <span className="font-mono text-xs font-black bg-black/70 backdrop-blur-md text-white px-2.5 py-1 rounded-lg border border-white/20">
                      {v.placa}
                    </span>
                    <span
                      className={`text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-lg backdrop-blur-md shadow-lg border flex items-center gap-1.5 ${
                        isEmPreparacao
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 border-amber-300 font-extrabold animate-pulse'
                          : 'bg-emerald-500/90 text-white border-emerald-400/40'
                      }`}
                    >
                      {isEmPreparacao ? '🛠️ EM PREPARAÇÃO' : '🟢 NO PÁTIO'}
                    </span>
                  </div>

                  {/* Commercial Tag / Aging & Location */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white">
                    {isEmPreparacao ? (
                      <span className="flex items-center gap-1 bg-amber-950/80 border border-amber-500/40 backdrop-blur-md px-2.5 py-1 rounded-lg text-[11px] text-amber-300 font-bold">
                        <Clock size={12} className="text-amber-400" />
                        {dataPrevisaoTermino ? `Previsão Pátio: ${formatDate(dataPrevisaoTermino)}` : 'Previsão: Em breve'}
                      </span>
                    ) : canViewCosts ? (
                      <span className="flex items-center gap-1 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[11px]">
                        <Calendar size={12} className="text-blue-400" />
                        {aging.dias} dias no pátio
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[11px] text-emerald-300 font-semibold">
                        <Sparkles size={12} className="text-amber-400" />
                        Pronta-Entrega
                      </span>
                    )}
                    {v.localizacaoPatio && !isEmPreparacao && (
                      <span className="flex items-center gap-1 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[11px] text-slate-300">
                        <MapPin size={12} className="text-amber-400" />
                        {v.localizacaoPatio}
                      </span>
                    )}
                  </div>
                </div>

                {/* Banner Específico de Aviso para Carros Em Preparação */}
                {isEmPreparacao && (
                  <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between text-[11px] text-amber-300 font-semibold">
                    <span className="flex items-center gap-1.5 truncate">
                      <Wrench size={13} className="text-amber-400 shrink-0" />
                      <span className="truncate">
                        {v.servicoAtualEmAndamento || (v.fornecedorAtualNome ? `Na oficina ${v.fornecedorAtualNome}` : 'Serviços de revisão')}
                      </span>
                    </span>
                    <span className="shrink-0 bg-amber-500/20 px-2 py-0.5 rounded font-mono font-bold text-amber-200 border border-amber-500/30">
                      📅 {dataPrevisaoTermino ? formatDate(dataPrevisaoTermino) : 'A definir'}
                    </span>
                  </div>
                )}

                {/* Body Details */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">{v.marca}</span>
                        <h3 className="text-lg font-black text-white tracking-tight">{v.modelo}</h3>
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-400 bg-white/5 px-2 py-1 rounded border border-white/5">
                        {v.ano}
                      </span>
                    </div>

                    {/* Specs chips */}
                    <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-300 pt-3">
                      <div className="p-2 rounded-xl bg-[#16171f] border border-white/5 flex items-center gap-1.5">
                        <Gauge size={13} className="text-slate-400 shrink-0" />
                        <span className="font-mono font-bold truncate">{formatKm(v.kmAtual)}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-[#16171f] border border-white/5 flex items-center gap-1.5">
                        <Fuel size={13} className="text-slate-400 shrink-0" />
                        <span className="truncate">{v.combustivel}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-[#16171f] border border-white/5 flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full border border-white/20 shrink-0" style={{ backgroundColor: v.cor.toLowerCase() === 'preto' ? '#111' : v.cor.toLowerCase() === 'branco' ? '#fff' : v.cor.toLowerCase() === 'prata' || v.cor.toLowerCase() === 'cinza' ? '#888' : '#3b82f6' }} />
                        <span className="truncate">{v.cor}</span>
                      </div>
                    </div>
                  </div>

                  {/* Price & Commissions Block */}
                  <div className="p-3.5 rounded-2xl bg-[#16171f] border border-white/5 space-y-2">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400">Preço Sugerido de Venda</span>
                        <p className="text-xl font-black text-white">
                          {formatCurrency(effectivePrice)}
                        </p>
                      </div>
                      {v.valorFipe && v.valorFipe > 0 && (
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-slate-500">Tabela FIPE</span>
                          <p className="text-xs font-mono font-bold text-slate-300">{formatCurrency(v.valorFipe)}</p>
                        </div>
                      )}
                    </div>

                    {/* Commission Highlight for Seller */}
                    <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
                      <span className="text-slate-400 flex items-center gap-1 font-medium">
                        <Award size={13} className="text-amber-400" />
                        Comissão Estimada ({isComissaoFixa ? 'Fixo' : `${commissionRate}%`}):
                      </span>
                      <span className="font-bold font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                        {formatCurrency(estimatedCommission)}
                      </span>
                    </div>

                    {/* Admin only: Internal cost */}
                    {canViewCosts && (
                      <div className="pt-1.5 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-500">
                        <span>Custo Total Loja: {formatCurrency(custoTotal)}</span>
                        <span className="text-blue-400 font-bold">
                          Margem Loja: {formatCurrency(effectivePrice - custoTotal)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-1 flex gap-2">
                    {onOpenDossie && (
                      <button
                        type="button"
                        onClick={() => onOpenDossie(v)}
                        className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold border border-white/5 transition"
                        title="Ver dossiê do veículo"
                      >
                        <Layers size={15} />
                      </button>
                    )}

                    {onOpenTestDrive && currentUser?.permissoes?.podeRealizarTestDrive !== false && (
                      <button
                        type="button"
                        onClick={() => onOpenTestDrive(v)}
                        className="py-2.5 px-3 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-xs font-bold transition cursor-pointer"
                        title="Registrar Test Drive com Cliente"
                      >
                        <Compass size={15} />
                      </button>
                    )}

                    {canSell && (
                      <button
                        type="button"
                        onClick={() => onOpenVenda(v)}
                        className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs shadow-lg flex items-center justify-center gap-2 transition cursor-pointer active:scale-[0.98] ${
                          isEmPreparacao
                            ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-amber-950/40'
                            : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-950/40'
                        }`}
                      >
                        <Tag size={15} />
                        <span>{isEmPreparacao ? 'Pré-Venda / Reserva' : 'Vender Carro'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
