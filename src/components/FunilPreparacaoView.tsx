import React, { useState, useMemo } from 'react';
import { 
  Wrench, 
  Paintbrush, 
  Sparkles, 
  CheckCircle2, 
  Car, 
  Search, 
  Filter, 
  Clock, 
  Calendar, 
  DollarSign, 
  ChevronRight, 
  ChevronLeft, 
  FileText, 
  ArrowRight,
  Plus,
  Building2,
  Tag,
  AlertCircle
} from 'lucide-react';
import { Veiculo, EtapaKanbanPreparacao, Usuario, DespesaVeiculo, FornecedorPrestador, EventoHistoricoVeiculo } from '../types';
import { formatCurrency, formatKm, formatDate, calculateAging, calculateTotalDespesas } from '../utils/formatters';

interface FunilPreparacaoViewProps {
  veiculos: Veiculo[];
  fornecedores?: FornecedorPrestador[];
  currentUser: Usuario | null;
  onUpdateEtapaKanban?: (veiculoId: string, novaEtapa: EtapaKanbanPreparacao) => void;
  onOpenDossie: (veiculo: Veiculo) => void;
  onOpenNovaDespesa: (veiculo: Veiculo) => void;
  onOpenVenda: (veiculo: Veiculo) => void;
  onOpenRegistrarRevisao?: (veiculo: Veiculo) => void;
  onUpdateVeiculo?: (veiculo: Veiculo) => void;
  onAdicionarEventoStatus?: (veiculoId: string, evento: EventoHistoricoVeiculo) => void;
  onOpenVistoria?: (veiculo: Veiculo) => void;
  onOpenEnviarServico?: (veiculo?: Veiculo | null) => void;
  onOpenRetornoPatio?: (veiculo: Veiculo) => void;
}

interface ColunaKanban {
  id: EtapaKanbanPreparacao;
  titulo: string;
  subtitulo: string;
  icon: any;
  corHeader: string;
  corBorda: string;
  badgeCor: string;
}

const COLUNAS_KANBAN: ColunaKanban[] = [
  {
    id: 'Oficina',
    titulo: 'Oficina Mecânica',
    subtitulo: 'Revisão mecânica, suspensão e freios',
    icon: Wrench,
    corHeader: 'text-blue-400 bg-blue-500/10',
    corBorda: 'border-blue-500/30',
    badgeCor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  },
  {
    id: 'Funilaria',
    titulo: 'Funilaria & Pintura',
    subtitulo: 'Retoques, para-choques e martelinho',
    icon: Paintbrush,
    corHeader: 'text-amber-400 bg-amber-500/10',
    corBorda: 'border-amber-500/30',
    badgeCor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  },
  {
    id: 'Estética',
    titulo: 'Estética & Higienização',
    subtitulo: 'Polimento técnico, detalhamento e lavagem',
    icon: Sparkles,
    corHeader: 'text-purple-400 bg-purple-500/10',
    corBorda: 'border-purple-500/30',
    badgeCor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  },
  {
    id: 'Pronto para Pátio',
    titulo: 'Pronto para Pátio',
    subtitulo: '100% preparado e liberado para venda',
    icon: CheckCircle2,
    corHeader: 'text-emerald-400 bg-emerald-500/10',
    corBorda: 'border-emerald-500/30',
    badgeCor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  },
];

export const FunilPreparacaoView: React.FC<FunilPreparacaoViewProps> = ({
  veiculos,
  fornecedores = [],
  currentUser,
  onUpdateEtapaKanban,
  onOpenDossie,
  onOpenNovaDespesa,
  onOpenVenda,
  onOpenRegistrarRevisao,
  onUpdateVeiculo,
  onAdicionarEventoStatus,
  onOpenVistoria,
  onOpenEnviarServico,
  onOpenRetornoPatio,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [fornecedorFilter, setFornecedorFilter] = useState('Todos');

  const podeGerenciar = currentUser?.role === 'admin' || currentUser?.role === 'gestor' || currentUser?.permissoes?.gerenciarFunilPreparacao !== false;

  // Safe handler for updating vehicle Kanban stage
  const handleAtualizarEtapa = (veiculoId: string, novaEtapa: EtapaKanbanPreparacao) => {
    const veiculo = veiculos.find((v) => v.id === veiculoId);
    // Se estiver movendo para Pronto para Pátio e tem oficina/serviço pendente, abrir modal de conclusão para lançar custo e forma de pagamento
    if (novaEtapa === 'Pronto para Pátio' && veiculo && (veiculo.fornecedorAtualNome || veiculo.servicoAtualEmAndamento) && onOpenRetornoPatio) {
      onOpenRetornoPatio(veiculo);
      return;
    }

    if (typeof onUpdateEtapaKanban === 'function') {
      onUpdateEtapaKanban(veiculoId, novaEtapa);
    } else if (typeof onUpdateVeiculo === 'function') {
      if (veiculo) {
        let novoStatus = veiculo.status;
        let novoStatusEstoque = veiculo.status_estoque;
        if (novaEtapa === 'Pronto para Pátio') {
          novoStatus = 'Disponível';
          novoStatusEstoque = 'No Pátio';
        } else if (novaEtapa === 'Oficina') {
          novoStatus = 'Em Manutenção';
          novoStatusEstoque = 'Em Preparação';
        } else {
          novoStatus = 'Em Preparação';
          novoStatusEstoque = 'Em Preparação';
        }
        onUpdateVeiculo({
          ...veiculo,
          etapaKanban: novaEtapa,
          status: novoStatus,
          status_estoque: novoStatusEstoque,
        });
      }
    }
  };

  // Derive initial or fallback Kanban stages for vehicles
  const veiculosComEtapa = useMemo(() => {
    return veiculos.map((v) => {
      // If already assigned an explicit etapa, use it
      if (v.etapaKanban) return v;

      // Otherwise derive from status
      if (v.status === 'Disponível' || v.status_estoque === 'No Pátio') {
        return { ...v, etapaKanban: 'Pronto para Pátio' as EtapaKanbanPreparacao };
      }
      if (v.status === 'Em Manutenção' || v.servicoAtualEmAndamento?.toLowerCase().includes('mecânica')) {
        return { ...v, etapaKanban: 'Oficina' as EtapaKanbanPreparacao };
      }
      if (v.servicoAtualEmAndamento?.toLowerCase().includes('pintura') || v.servicoAtualEmAndamento?.toLowerCase().includes('funilaria')) {
        return { ...v, etapaKanban: 'Funilaria' as EtapaKanbanPreparacao };
      }
      if (v.status === 'Em Preparação' || v.status_estoque === 'Em Preparação') {
        return { ...v, etapaKanban: 'Estética' as EtapaKanbanPreparacao };
      }

      return { ...v, etapaKanban: 'Oficina' as EtapaKanbanPreparacao };
    });
  }, [veiculos]);

  // Filter vehicles
  const filteredVeiculos = useMemo(() => {
    return veiculosComEtapa.filter((v) => {
      // Don't show sold vehicles in preparation funnel
      if (v.status === 'Vendido' || v.status_estoque === 'Vendido') return false;

      const matchesSearch = 
        v.modelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.marca.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.fornecedorAtualNome && v.fornecedorAtualNome.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesFornecedor = fornecedorFilter === 'Todos' || v.fornecedorAtualNome === fornecedorFilter;

      return matchesSearch && matchesFornecedor;
    });
  }, [veiculosComEtapa, searchTerm, fornecedorFilter]);

  // Group vehicles by Kanban column
  const colunasData = useMemo(() => {
    const map: Record<EtapaKanbanPreparacao, Veiculo[]> = {
      'Oficina': [],
      'Funilaria': [],
      'Estética': [],
      'Pronto para Pátio': [],
    };

    filteredVeiculos.forEach((v) => {
      const etapa = v.etapaKanban || 'Oficina';
      if (map[etapa]) {
        map[etapa].push(v);
      } else {
        map['Oficina'].push(v);
      }
    });

    return map;
  }, [filteredVeiculos]);

  // Unique suppliers
  const fornecedoresUnicos = useMemo(() => {
    const set = new Set<string>();
    veiculos.forEach((v) => {
      if (v.fornecedorAtualNome) set.add(v.fornecedorAtualNome);
    });
    return Array.from(set).sort();
  }, [veiculos]);

  // KPIs
  const totalEmPreparacao = (colunasData['Oficina'].length + colunasData['Funilaria'].length + colunasData['Estética'].length);
  const totalProntos = colunasData['Pronto para Pátio'].length;

  const handleMoverEtapa = (veiculoId: string, etapaAtual: EtapaKanbanPreparacao, direcao: 'next' | 'prev') => {
    const etapas: EtapaKanbanPreparacao[] = ['Oficina', 'Funilaria', 'Estética', 'Pronto para Pátio'];
    const idx = etapas.indexOf(etapaAtual);
    if (idx === -1) return;

    const novoIdx = direcao === 'next' ? Math.min(idx + 1, etapas.length - 1) : Math.max(idx - 1, 0);
    const novaEtapa = etapas[novoIdx];
    handleAtualizarEtapa(veiculoId, novaEtapa);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
              <Wrench size={22} />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Funil de Preparação (Kanban de Pátio)
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Acompanhe o fluxo visual de setup dos veículos: da oficina mecânica até a liberação 100% no showroom.
          </p>
        </div>

        {podeGerenciar && onOpenEnviarServico && (
          <button
            type="button"
            onClick={() => onOpenEnviarServico()}
            className="px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-orange-950/40 transition cursor-pointer shrink-0"
          >
            <Plus size={16} />
            <span>Enviar para Serviço / Preparação</span>
          </button>
        )}
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#111116] border border-white/5 shadow-lg">
          <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider block">
            Em Preparação Ativa
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-amber-400 font-mono">
              {totalEmPreparacao}
            </span>
            <span className="text-xs text-slate-500">veículos em setup</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#111116] border border-white/5 shadow-lg">
          <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider block">
            Na Oficina Mecânica
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-blue-400 font-mono">
              {colunasData['Oficina'].length}
            </span>
            <span className="text-xs text-slate-500">revisões e freios</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#111116] border border-white/5 shadow-lg">
          <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider block">
            Funilaria & Estética
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-purple-400 font-mono">
              {colunasData['Funilaria'].length + colunasData['Estética'].length}
            </span>
            <span className="text-xs text-slate-500">detalhamento e retoques</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#111116] border border-white/5 shadow-lg">
          <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider block">
            Prontos para Showroom
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-emerald-400 font-mono">
              {totalProntos}
            </span>
            <span className="text-xs text-emerald-400/80 font-bold">100% liberados</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-[#111116] border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por placa, modelo ou oficina..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[#16171f] border border-white/10 rounded-xl text-white outline-none focus:border-orange-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-slate-400 font-semibold shrink-0">Filtrar Oficina / Prestador:</span>
          <select
            value={fornecedorFilter}
            onChange={(e) => setFornecedorFilter(e.target.value)}
            className="p-2 bg-[#16171f] border border-white/10 rounded-xl text-white outline-none focus:border-orange-500 font-semibold"
          >
            <option value="Todos">Todas as Oficinas / Parceiros</option>
            {fornecedoresUnicos.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Kanban Board Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
        {COLUNAS_KANBAN.map((coluna, colIdx) => {
          const veiculosDaColuna = colunasData[coluna.id] || [];
          const Icon = coluna.icon;

          return (
            <div 
              key={coluna.id}
              className="bg-[#111116] rounded-2xl border border-white/5 flex flex-col min-h-[500px] overflow-hidden shadow-xl"
            >
              {/* Column Header */}
              <div className={`p-3.5 border-b border-white/5 ${coluna.corHeader} flex items-center justify-between shrink-0`}>
                <div className="flex items-center gap-2">
                  <Icon size={18} />
                  <div>
                    <h3 className="font-bold text-white text-xs">
                      {coluna.titulo}
                    </h3>
                    <p className="text-[10px] text-slate-400 leading-tight">
                      {coluna.subtitulo}
                    </p>
                  </div>
                </div>

                <span className={`px-2 py-0.5 rounded-full font-mono font-black text-xs border ${coluna.badgeCor}`}>
                  {veiculosDaColuna.length}
                </span>
              </div>

              {/* Column Cards Container */}
              <div className="p-3 flex-1 overflow-y-auto space-y-3 max-h-[70vh]">
                {veiculosDaColuna.length === 0 ? (
                  <div className="py-12 px-4 text-center border-2 border-dashed border-white/5 rounded-xl text-slate-500 text-xs">
                    Nenhum veículo nesta etapa
                  </div>
                ) : (
                  veiculosDaColuna.map((veiculo) => {
                    const aging = calculateAging(veiculo.dataEntrada);
                    const totalDesp = calculateTotalDespesas(veiculo);

                    return (
                      <div
                        key={veiculo.id}
                        onClick={() => onOpenDossie(veiculo)}
                        className="p-3.5 rounded-xl bg-[#16171f] border border-white/5 hover:border-white/20 transition-all cursor-pointer space-y-2.5 shadow-md group"
                      >
                        {/* Header: Placa & Model */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-mono text-[11px] font-black px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white block w-max">
                              {veiculo.placa}
                            </span>
                            <h4 className="font-bold text-white text-xs mt-1 leading-snug group-hover:text-orange-400 transition">
                              {veiculo.modelo}
                            </h4>
                            <span className="text-[10px] text-slate-400">
                              {veiculo.marca} • {veiculo.ano} • {veiculo.cor}
                            </span>
                          </div>

                          {veiculo.fotoUrl && (
                            <img 
                              src={veiculo.fotoUrl} 
                              alt={veiculo.modelo} 
                              className="w-12 h-12 rounded-lg object-cover border border-white/10 shrink-0" 
                            />
                          )}
                        </div>

                        {/* Service / Workshop Tag */}
                        {veiculo.fornecedorAtualNome ? (
                          <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5 text-[11px] space-y-1">
                            <div className="flex items-center gap-1 text-slate-300 font-semibold">
                              <Building2 size={12} className="text-orange-400" />
                              <span className="truncate">{veiculo.fornecedorAtualNome}</span>
                            </div>
                            {veiculo.servicoAtualEmAndamento && (
                              <p className="text-[10px] text-slate-400 truncate">
                                {veiculo.servicoAtualEmAndamento}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-500 italic">
                            Sem oficina externa vinculada
                          </div>
                        )}

                        {/* Cost & Aging Footer inside Card */}
                        <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px]">
                          <span className="text-slate-400 flex items-center gap-1">
                            <Clock size={11} /> {aging.dias} dias em pátio
                          </span>
                          <span className="font-bold font-mono text-amber-400">
                            {formatCurrency(totalDesp)}
                          </span>
                        </div>

                        {/* Quick Service Dispatch & Return Actions */}
                        {podeGerenciar && (
                          <div 
                            className="pt-2 border-t border-white/5 space-y-1.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {coluna.id !== 'Pronto para Pátio' ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                {onOpenRetornoPatio && (
                                  <button
                                    type="button"
                                    onClick={() => onOpenRetornoPatio(veiculo)}
                                    className="px-2 py-1.5 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-white font-black text-[10px] flex items-center justify-center gap-1 transition shadow cursor-pointer sm:col-span-2"
                                    title="Confirmar conclusão de serviço, registrar custo e quitação no ato ou pendência"
                                  >
                                    <CheckCircle2 size={13} />
                                    <span>Concluir Serviço & Lançar Pagamento</span>
                                  </button>
                                )}

                                {onOpenEnviarServico && (
                                  <button
                                    type="button"
                                    onClick={() => onOpenEnviarServico(veiculo)}
                                    className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-bold text-[10px] flex items-center justify-center gap-1 transition border border-white/5 cursor-pointer sm:col-span-2"
                                  >
                                    <Wrench size={11} className="text-orange-400" />
                                    <span>Alterar / Reenviar Serviço</span>
                                  </button>
                                )}
                              </div>
                            ) : (
                              onOpenEnviarServico && (
                                <button
                                  type="button"
                                  onClick={() => onOpenEnviarServico(veiculo)}
                                  className="w-full px-2 py-1.5 rounded-lg bg-orange-600/20 hover:bg-orange-600/30 text-orange-300 border border-orange-500/30 font-bold text-[10px] flex items-center justify-center gap-1 transition cursor-pointer"
                                >
                                  <Sparkles size={12} className="text-orange-400" />
                                  <span>Reenviar para Serviço / Retoque</span>
                                </button>
                              )
                            )}
                          </div>
                        )}

                        {/* Kanban Step Controls */}
                        {podeGerenciar && (
                          <div 
                            className="pt-2 border-t border-white/5 flex items-center justify-between gap-1.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              disabled={colIdx === 0}
                              onClick={() => handleMoverEtapa(veiculo.id, coluna.id, 'prev')}
                              className={`p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                                colIdx === 0 
                                  ? 'opacity-20 cursor-not-allowed text-slate-600' 
                                  : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer'
                              }`}
                              title="Recuar etapa"
                            >
                              <ChevronLeft size={14} />
                            </button>

                            <select
                              value={coluna.id}
                              onChange={(e) => handleAtualizarEtapa(veiculo.id, e.target.value as EtapaKanbanPreparacao)}
                              className="flex-1 p-1 bg-black/40 border border-white/10 rounded-lg text-[10px] text-slate-200 outline-none font-semibold cursor-pointer text-center"
                            >
                              <option value="Oficina">1. Oficina</option>
                              <option value="Funilaria">2. Funilaria</option>
                              <option value="Estética">3. Estética</option>
                              <option value="Pronto para Pátio">4. Pronto Pátio</option>
                            </select>

                            <button
                              type="button"
                              disabled={colIdx === COLUNAS_KANBAN.length - 1}
                              onClick={() => handleMoverEtapa(veiculo.id, coluna.id, 'next')}
                              className={`p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                                colIdx === COLUNAS_KANBAN.length - 1 
                                  ? 'opacity-20 cursor-not-allowed text-slate-600' 
                                  : 'bg-orange-600 hover:bg-orange-500 text-white cursor-pointer'
                              }`}
                              title="Avançar etapa"
                            >
                              <ChevronRight size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
