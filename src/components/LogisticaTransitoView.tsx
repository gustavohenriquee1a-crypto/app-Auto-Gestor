import React, { useState, useMemo } from 'react';
import {
  Truck,
  MapPin,
  Calendar,
  Clock,
  DollarSign,
  Phone,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Wrench,
  Search,
  Filter,
  Plus,
  Compass,
  Building2,
  Car,
  ChevronRight,
  ShieldAlert,
  Sparkles,
  Receipt
} from 'lucide-react';
import { Veiculo, FornecedorPrestador } from '../types';
import { formatCurrency, formatDate, calculateAging } from '../utils/formatters';

interface LogisticaTransitoViewProps {
  veiculos: Veiculo[];
  fornecedores?: FornecedorPrestador[];
  onOpenNovoVeiculoEmTransito?: () => void;
  onOpenDossie?: (veiculo: Veiculo) => void;
  onOpenNovaDespesa?: (veiculo: Veiculo) => void;
  onUpdateVeiculo: (veiculo: Veiculo) => Promise<void> | void;
}

export const LogisticaTransitoView: React.FC<LogisticaTransitoViewProps> = ({
  veiculos,
  fornecedores = [],
  onOpenNovoVeiculoEmTransito,
  onOpenDossie,
  onOpenNovaDespesa,
  onUpdateVeiculo,
}) => {
  const [activeTab, setActiveTab] = useState<'transito' | 'preparacao' | 'patio' | 'todos'>('transito');
  const [searchTerm, setSearchTerm] = useState('');
  const [origemFilter, setOrigemFilter] = useState('Todas');
  
  // Modal de Recebimento / Transição de Status
  const [selectedVeiculoRecebimento, setSelectedVeiculoRecebimento] = useState<Veiculo | null>(null);
  const [destinoRecebimento, setDestinoRecebimento] = useState<'Em Preparação' | 'No Pátio'>('Em Preparação');
  const [dataChegadaConfirmada, setDataChegadaConfirmada] = useState(new Date().toISOString().split('T')[0]);
  const [previsaoTerminoInput, setPrevisaoTerminoInput] = useState('');
  const [fornecedorOficinaId, setFornecedorOficinaId] = useState('');
  const [servicoOficinaInput, setServicoOficinaInput] = useState('');
  const [localizacaoPatioInput, setLocalizacaoPatioInput] = useState('Pátio Principal');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Classificação dos veículos de acordo com o status_estoque
  const veiculosEmTransito = useMemo(() => {
    return veiculos.filter(v => v.status_estoque === 'Em Trânsito');
  }, [veiculos]);

  const veiculosEmPreparacao = useMemo(() => {
    return veiculos.filter(v => v.status_estoque === 'Em Preparação' || v.status === 'Em Preparação');
  }, [veiculos]);

  const veiculosNoPatio = useMemo(() => {
    return veiculos.filter(v => v.status_estoque === 'No Pátio' || (v.status === 'Disponível' && v.status_estoque !== 'Em Trânsito' && v.status_estoque !== 'Em Preparação'));
  }, [veiculos]);

  // Lista a exibir conforme a tab ativa
  const veiculosFiltrados = useMemo(() => {
    let list: Veiculo[] = [];
    if (activeTab === 'transito') list = veiculosEmTransito;
    else if (activeTab === 'preparacao') list = veiculosEmPreparacao;
    else if (activeTab === 'patio') list = veiculosNoPatio;
    else list = veiculos.filter(v => v.status !== 'Vendido');

    return list.filter(v => {
      const matchSearch = 
        v.modelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.marca.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.chassi.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.origem_compra && v.origem_compra.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (v.transportadora_guincho && v.transportadora_guincho.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchOrigem = origemFilter === 'Todas' || (v.origem_compra && v.origem_compra.includes(origemFilter));

      return matchSearch && matchOrigem;
    });
  }, [veiculos, activeTab, veiculosEmTransito, veiculosEmPreparacao, veiculosNoPatio, searchTerm, origemFilter]);

  // Origens únicas para o filtro
  const uniqueOrigens = useMemo(() => {
    const set = new Set<string>();
    veiculos.forEach(v => {
      if (v.origem_compra) set.add(v.origem_compra);
    });
    return Array.from(set);
  }, [veiculos]);

  // Métricas Consolidadas de Logística
  const totalFretesInvestidos = useMemo(() => {
    return veiculos.reduce((acc, v) => {
      const custoFrete = Number(v.custo_frete_transporte) || 0;
      const despesasFrete = (v.despesas || [])
        .filter(d => d.categoria === 'Frete / Transporte' || d.categoria === 'Frete / Guincho')
        .reduce((sum, d) => sum + (Number(d.valor) || 0), 0);
      return acc + custoFrete + despesasFrete;
    }, 0);
  }, [veiculos]);

  const totalTaxasOrigem = useMemo(() => {
    return veiculos.reduce((acc, v) => {
      const taxas = Number(v.taxas_origem) || 0;
      const despesasTaxas = (v.despesas || [])
        .filter(d => d.categoria === 'Taxas de Origem / Leilão')
        .reduce((sum, d) => sum + (Number(d.valor) || 0), 0);
      return acc + taxas + despesasTaxas;
    }, 0);
  }, [veiculos]);

  // Helpers de Prazos de Chegada
  const getPrevisaoBadge = (previsaoData?: string) => {
    if (!previsaoData) {
      return (
        <span className="px-2.5 py-1 rounded-lg text-xs bg-slate-800 text-slate-400 font-medium">
          A definir
        </span>
      );
    }
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dPrev = new Date(previsaoData);
    dPrev.setHours(0, 0, 0, 0);
    const diffDias = Math.round((dPrev.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDias < 0) {
      return (
        <span className="px-2.5 py-1 rounded-lg text-xs bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30 flex items-center gap-1 animate-pulse">
          <AlertTriangle size={12} /> Atrasado ({Math.abs(diffDias)}d)
        </span>
      );
    }
    if (diffDias === 0) {
      return (
        <span className="px-2.5 py-1 rounded-lg text-xs bg-amber-500/20 text-amber-300 font-black border border-amber-500/30 flex items-center gap-1">
          <Clock size={12} /> Chega Hoje!
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-lg text-xs bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30 flex items-center gap-1">
        <Calendar size={12} /> Em {diffDias} dia{diffDias > 1 ? 's' : ''} ({formatDate(previsaoData)})
      </span>
    );
  };

  const handleOpenRecebimento = (veiculo: Veiculo) => {
    setSelectedVeiculoRecebimento(veiculo);
    setDestinoRecebimento('Em Preparação');
    setDataChegadaConfirmada(new Date().toISOString().split('T')[0]);
    setPrevisaoTerminoInput(veiculo.previsao_termino_preparacao || '');
    setFornecedorOficinaId(veiculo.fornecedorAtualId || '');
    setServicoOficinaInput(veiculo.servicoAtualEmAndamento || '');
    setLocalizacaoPatioInput(veiculo.localizacaoPatio || 'Pátio Principal');
  };

  const handleConfirmarRecebimento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVeiculoRecebimento) return;

    setIsSubmitting(true);
    try {
      const parceiro = fornecedores.find(f => f.id === fornecedorOficinaId);

      const updated: Veiculo = {
        ...selectedVeiculoRecebimento,
        status_estoque: destinoRecebimento,
        status: destinoRecebimento === 'No Pátio' ? 'Disponível' : 'Em Preparação',
        data_chegada_patio: destinoRecebimento === 'No Pátio' ? dataChegadaConfirmada : undefined,
        dataEntradaPatio: destinoRecebimento === 'No Pátio' ? dataChegadaConfirmada : selectedVeiculoRecebimento.dataEntradaPatio,
        previsao_termino_preparacao: destinoRecebimento === 'Em Preparação' ? (previsaoTerminoInput || undefined) : undefined,
        fornecedorAtualId: destinoRecebimento === 'Em Preparação' ? (fornecedorOficinaId || undefined) : undefined,
        fornecedorAtualNome: destinoRecebimento === 'Em Preparação' ? (parceiro?.nome || parceiro?.nomeEmpresa || undefined) : undefined,
        servicoAtualEmAndamento: destinoRecebimento === 'Em Preparação' ? (servicoOficinaInput || undefined) : undefined,
        localizacaoPatio: destinoRecebimento === 'No Pátio' ? localizacaoPatioInput : (selectedVeiculoRecebimento.localizacaoPatio || 'Pátio Principal'),
      };

      await onUpdateVeiculo(updated);
      setSelectedVeiculoRecebimento(null);
    } catch (err) {
      console.error('Erro ao confirmar recebimento:', err);
      alert('Erro ao atualizar status do veículo. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Title */}
      <div className="bg-gradient-to-r from-indigo-950/70 via-[#111116] to-[#16171f] p-6 sm:p-8 rounded-3xl border border-indigo-500/20 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-indigo-600/10 to-transparent pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400">
                <Truck size={24} />
              </div>
              <span className="text-xs uppercase font-black text-indigo-400 tracking-wider">
                Logística, Cegonhas & Recebimento
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Rastreamento de Carros em Trânsito
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
              Controle a chegada de veículos comprados fora da cidade (leilões, locadoras, frotas ou particulares).
              O relógio comercial de <strong>Aging de Pátio</strong> só é disparado quando o carro chega fisicamente na loja.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {onOpenNovoVeiculoEmTransito && (
              <button
                type="button"
                onClick={onOpenNovoVeiculoEmTransito}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-indigo-950/50 flex items-center gap-2 cursor-pointer transition active:scale-95"
              >
                <Plus size={16} />
                <span>Comprar / Cadastrar em Trânsito</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick KPI Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/5">
          <div className="p-4 rounded-2xl bg-black/40 border border-indigo-500/20">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
              <Truck size={13} className="text-indigo-400" /> Em Trânsito
            </span>
            <p className="text-2xl font-black text-indigo-300 mt-1 font-mono">
              {veiculosEmTransito.length}
            </p>
            <span className="text-[10px] text-slate-500">A caminho da loja</span>
          </div>

          <div className="p-4 rounded-2xl bg-black/40 border border-amber-500/20">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
              <Wrench size={13} className="text-amber-400" /> Em Preparação
            </span>
            <p className="text-2xl font-black text-amber-300 mt-1 font-mono">
              {veiculosEmPreparacao.length}
            </p>
            <span className="text-[10px] text-slate-500">Oficinas / Detailing</span>
          </div>

          <div className="p-4 rounded-2xl bg-black/40 border border-cyan-500/20">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
              <Receipt size={13} className="text-cyan-400" /> Fretes Investidos
            </span>
            <p className="text-2xl font-black text-cyan-300 mt-1 font-mono">
              {formatCurrency(totalFretesInvestidos)}
            </p>
            <span className="text-[10px] text-slate-500">Custos de transporte</span>
          </div>

          <div className="p-4 rounded-2xl bg-black/40 border border-emerald-500/20">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-emerald-400" /> Recebidos no Pátio
            </span>
            <p className="text-2xl font-black text-emerald-300 mt-1 font-mono">
              {veiculosNoPatio.length}
            </p>
            <span className="text-[10px] text-slate-500">Showroom ativo</span>
          </div>
        </div>
      </div>

      {/* Tabs & Search Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 p-1 bg-[#111116] rounded-2xl border border-white/5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('transito')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'transito'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Truck size={14} />
            <span>Em Trânsito ({veiculosEmTransito.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('preparacao')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'preparacao'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Wrench size={14} />
            <span>Em Preparação ({veiculosEmPreparacao.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('patio')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'patio'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <CheckCircle2 size={14} />
            <span>No Pátio ({veiculosNoPatio.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('todos')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'todos'
                ? 'bg-white/15 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>Todos Ativos</span>
          </button>
        </div>

        {/* Search and filter */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por placa, modelo, origem..."
              className="w-full pl-9 pr-3 py-2 bg-[#111116] border border-white/10 rounded-xl text-xs text-slate-200 outline-none focus:border-indigo-500"
            />
          </div>

          {uniqueOrigens.length > 0 && (
            <select
              value={origemFilter}
              onChange={(e) => setOrigemFilter(e.target.value)}
              className="bg-[#111116] border border-white/10 text-slate-300 text-xs rounded-xl px-3 py-2 outline-none focus:border-indigo-500"
            >
              <option value="Todas">Todas as Origens</option>
              {uniqueOrigens.map((origem) => (
                <option key={origem} value={origem}>
                  {origem}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Grid of Vehicles */}
      {veiculosFiltrados.length === 0 ? (
        <div className="bg-[#111116] rounded-3xl p-12 text-center border border-white/5 space-y-3">
          <Truck size={48} className="mx-auto text-slate-600 animate-bounce" />
          <h3 className="text-lg font-bold text-white">Nenhum veículo encontrado nesta etapa</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Não há registros com os filtros aplicados. Cadastre novos veículos comprados fora da loja informando a origem e prazo de transporte.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {veiculosFiltrados.map((v) => {
            const isEmTransito = v.status_estoque === 'Em Trânsito';
            const isEmPrep = v.status_estoque === 'Em Preparação' || v.status === 'Em Preparação';
            const custoTotal = (v.custoAquisicao || 0) + (v.despesas || []).reduce((s, d) => s + (Number(d.valor) || 0), 0);
            const photoUrl = v.fotoUrl || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80';

            return (
              <div
                key={v.id}
                className={`rounded-3xl border transition-all duration-300 flex flex-col overflow-hidden shadow-xl hover:shadow-2xl ${
                  isEmTransito
                    ? 'bg-[#12131f] border-indigo-500/30 hover:border-indigo-500/60 shadow-indigo-950/20'
                    : isEmPrep
                    ? 'bg-[#15130f] border-amber-500/30 hover:border-amber-500/60 shadow-amber-950/20'
                    : 'bg-[#111116] border-white/10 hover:border-emerald-500/40 shadow-emerald-950/10'
                }`}
              >
                {/* Header Card Photo & Status */}
                <div className="relative h-44 bg-slate-950 overflow-hidden">
                  <img
                    src={photoUrl}
                    alt={v.modelo}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#111116] via-transparent to-black/60" />

                  {/* Badges Top */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                    <span className="font-mono text-xs font-black bg-black/80 backdrop-blur-md text-white px-2.5 py-1 rounded-lg border border-white/20">
                      {v.placa}
                    </span>
                    <span
                      className={`text-[11px] font-black uppercase px-3 py-1 rounded-lg backdrop-blur-md border ${
                        isEmTransito
                          ? 'bg-indigo-600/90 text-white border-indigo-400'
                          : isEmPrep
                          ? 'bg-amber-500 text-slate-950 border-amber-300 font-extrabold'
                          : 'bg-emerald-500 text-white border-emerald-400'
                      }`}
                    >
                      {isEmTransito ? '🚚 Em Trânsito' : isEmPrep ? '🛠️ Em Preparação' : '🟢 No Pátio'}
                    </span>
                  </div>

                  {/* Badges Bottom */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white">
                    {isEmTransito ? (
                      getPrevisaoBadge(v.previsao_chegada)
                    ) : isEmPrep ? (
                      <span className="px-2.5 py-1 rounded-lg text-xs bg-amber-950/80 text-amber-300 font-bold border border-amber-500/40 flex items-center gap-1">
                        <Clock size={12} className="text-amber-400" />
                        Término: {v.previsao_termino_preparacao ? formatDate(v.previsao_termino_preparacao) : 'Em andamento'}
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg text-xs bg-emerald-950/80 text-emerald-300 font-bold border border-emerald-500/40 flex items-center gap-1">
                        <Calendar size={12} className="text-emerald-400" />
                        {calculateAging(v).dias} dias no Showroom
                      </span>
                    )}

                    {v.origem_compra && (
                      <span className="bg-black/70 backdrop-blur-md px-2 py-0.5 rounded text-[10px] text-slate-300 flex items-center gap-1 truncate max-w-[150px]">
                        <MapPin size={11} className="text-amber-400 shrink-0" />
                        <span className="truncate">{v.origem_compra}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                          {v.marca}
                        </span>
                        <h3 className="text-base font-black text-white">{v.modelo}</h3>
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                        {v.ano}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 font-mono mt-1">
                      Chassi: <strong className="text-slate-300">{v.chassi}</strong>
                    </p>

                    {/* Detalhes de Transporte / Logística */}
                    <div className="mt-3 p-3 rounded-2xl bg-black/30 border border-white/5 space-y-2 text-xs">
                      {isEmTransito && (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 flex items-center gap-1">
                              <Compass size={12} className="text-indigo-400" /> Origem:
                            </span>
                            <span className="font-semibold text-slate-200 truncate max-w-[180px]">
                              {v.origem_compra || 'Não informada'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 flex items-center gap-1">
                              <Truck size={12} className="text-cyan-400" /> Transportadora:
                            </span>
                            <span className="font-semibold text-slate-200 truncate max-w-[180px]">
                              {v.transportadora_guincho || 'Frete Próprio/Outro'}
                            </span>
                          </div>

                          {v.telefone_transportadora && (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400 flex items-center gap-1">
                                <Phone size={12} className="text-emerald-400" /> Contato Guincho:
                              </span>
                              <a
                                href={`tel:${v.telefone_transportadora}`}
                                className="font-mono font-bold text-emerald-400 hover:underline"
                              >
                                {v.telefone_transportadora}
                              </a>
                            </div>
                          )}
                        </>
                      )}

                      {isEmPrep && (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 flex items-center gap-1">
                              <Building2 size={12} className="text-amber-400" /> Oficina / Parceiro:
                            </span>
                            <span className="font-semibold text-amber-300 truncate max-w-[180px]">
                              {v.fornecedorAtualNome || 'Oficina Própria / Interna'}
                            </span>
                          </div>

                          {v.servicoAtualEmAndamento && (
                            <div className="pt-1 border-t border-white/5 text-[11px] text-slate-300">
                              <span className="text-slate-500 block text-[10px]">Serviço em execução:</span>
                              <p className="line-clamp-2">{v.servicoAtualEmAndamento}</p>
                            </div>
                          )}
                        </>
                      )}

                      <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
                        <span className="text-slate-400">Custo Total Atual:</span>
                        <span className="font-black font-mono text-emerald-400">
                          {formatCurrency(custoTotal)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Buttons */}
                  <div className="pt-2 flex items-center gap-2">
                    {onOpenDossie && (
                      <button
                        type="button"
                        onClick={() => onOpenDossie(v)}
                        className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 transition"
                        title="Ver dossiê completo"
                      >
                        <Layers size={15} />
                      </button>
                    )}

                    {onOpenNovaDespesa && (
                      <button
                        type="button"
                        onClick={() => onOpenNovaDespesa(v)}
                        className="py-2.5 px-3 rounded-xl bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 text-indigo-300 font-bold text-xs transition flex items-center gap-1"
                        title="Lançar frete ou despesa no chassi"
                      >
                        <Plus size={14} /> Frete/Despesa
                      </button>
                    )}

                    {isEmTransito ? (
                      <button
                        type="button"
                        onClick={() => handleOpenRecebimento(v)}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-950/40 flex items-center justify-center gap-1.5 cursor-pointer transition active:scale-95"
                      >
                        <CheckCircle2 size={15} />
                        <span>Confirmar Chegada</span>
                      </button>
                    ) : isEmPrep ? (
                      <button
                        type="button"
                        onClick={() => handleOpenRecebimento(v)}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs shadow-md shadow-amber-950/40 flex items-center justify-center gap-1.5 cursor-pointer transition active:scale-95"
                      >
                        <ArrowRight size={15} />
                        <span>Mover p/ Pátio</span>
                      </button>
                    ) : (
                      <div className="flex-1 text-center py-2 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                        🟢 Pronto no Showroom
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Confirmação de Recebimento / Transição de Etapa */}
      {selectedVeiculoRecebimento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg max-h-[90vh] flex flex-col bg-gray-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-white/10 bg-[#16171e] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-600/20 text-emerald-400">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Confirmar Recebimento do Veículo
                  </h3>
                  <p className="text-xs text-slate-400">
                    {selectedVeiculoRecebimento.placa} - {selectedVeiculoRecebimento.modelo}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedVeiculoRecebimento(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-white/5 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmarRecebimento} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div>
                  <label className="block text-slate-300 font-bold text-xs mb-2">
                    Qual é o próximo destino deste veículo? *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setDestinoRecebimento('Em Preparação')}
                      className={`p-3 rounded-2xl border text-left flex flex-col gap-1 transition ${
                        destinoRecebimento === 'Em Preparação'
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 ring-1 ring-amber-500'
                          : 'bg-black/30 border-white/10 text-slate-400'
                      }`}
                    >
                      <span className="text-sm font-bold flex items-center gap-1.5">
                        <Wrench size={15} /> 1. Oficina / Funilaria
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Vai passar por revisão, reparo ou estética antes do pátio
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDestinoRecebimento('No Pátio')}
                      className={`p-3 rounded-2xl border text-left flex flex-col gap-1 transition ${
                        destinoRecebimento === 'No Pátio'
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500'
                          : 'bg-black/30 border-white/10 text-slate-400'
                      }`}
                    >
                      <span className="text-sm font-bold flex items-center gap-1.5">
                        <CheckCircle2 size={15} /> 2. Direto p/ Pátio
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Carro 100% pronto. Dispara o relógio de Aging hoje!
                      </span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1 text-xs">
                    Data de Chegada / Descarregamento *
                  </label>
                  <input
                    type="date"
                    required
                    value={dataChegadaConfirmada}
                    onChange={(e) => setDataChegadaConfirmada(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-white/10 bg-black/50 text-slate-200 text-xs outline-none focus:border-emerald-500"
                  />
                </div>

                {destinoRecebimento === 'Em Preparação' ? (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-3 animate-fadeIn">
                    <div>
                      <label className="block text-slate-300 font-bold mb-1 text-xs">
                        Previsão de Término da Preparação * (Obrigatório p/ Vendas)
                      </label>
                      <input
                        type="date"
                        required
                        value={previsaoTerminoInput}
                        onChange={(e) => setPrevisaoTerminoInput(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-amber-500/40 bg-black/60 text-amber-300 text-xs outline-none font-bold"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        Data exibida aos vendedores no Catálogo para liberação de pré-venda.
                      </p>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-bold mb-1 text-xs">
                        Oficina / Funilaria Parceira
                      </label>
                      <select
                        value={fornecedorOficinaId}
                        onChange={(e) => setFornecedorOficinaId(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-white/10 bg-black/60 text-slate-200 text-xs outline-none"
                      >
                        <option value="">Oficina Interna / Não especificada</option>
                        {fornecedores.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.nome || f.nomeEmpresa} ({f.categoria})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-bold mb-1 text-xs">
                        Serviço a ser realizado
                      </label>
                      <input
                        type="text"
                        value={servicoOficinaInput}
                        onChange={(e) => setServicoOficinaInput(e.target.value)}
                        placeholder="Ex: Polimento técnico, higienização e troca de óleo"
                        className="w-full p-2.5 rounded-xl border border-white/10 bg-black/60 text-slate-200 text-xs outline-none"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl space-y-3 animate-fadeIn">
                    <div>
                      <label className="block text-slate-300 font-bold mb-1 text-xs">
                        Localização no Pátio
                      </label>
                      <input
                        type="text"
                        value={localizacaoPatioInput}
                        onChange={(e) => setLocalizacaoPatioInput(e.target.value)}
                        placeholder="Ex: Showroom Frente / Vaga 04"
                        className="w-full p-2.5 rounded-xl border border-white/10 bg-black/60 text-slate-200 text-xs outline-none"
                      />
                    </div>
                    <p className="text-[11px] text-emerald-300 font-medium">
                      ✨ Ao confirmar, o veículo estará disponível para venda pronta-entrega no catálogo e seu Aging começará a contar a partir de hoje.
                    </p>
                  </div>
                )}
              </div>

              <div className="p-4 sm:p-5 border-t border-white/10 bg-[#16171e] flex justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedVeiculoRecebimento(null)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/50 flex items-center gap-2 cursor-pointer transition disabled:opacity-50"
                >
                  <CheckCircle2 size={16} />
                  <span>{isSubmitting ? 'Salvando...' : 'Confirmar e Atualizar'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
