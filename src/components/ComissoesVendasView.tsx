import React, { useState, useMemo } from 'react';
import {
  Award,
  DollarSign,
  TrendingUp,
  Users,
  Search,
  CheckCircle2,
  Clock,
  Car,
  Filter,
  ArrowUpRight,
  ShieldCheck,
  Download,
  Calendar,
  Sparkles,
  Eye,
  Trash2,
  FileCheck,
  Printer
} from 'lucide-react';
import { VendaVeiculo, Usuario, Veiculo } from '../types';
import { formatCurrency } from '../utils/formatters';
import { ModalDetalhesVendaComissao } from './ModalDetalhesVendaComissao';

interface ComissoesVendasViewProps {
  vendas: VendaVeiculo[];
  veiculos?: Veiculo[];
  currentUser: Usuario | null;
  onUpdateVendaComissao?: (vendaId: string, novoStatus: 'Pendente' | 'Paga') => void;
  onUpdateVenda?: (vendaAtualizada: VendaVeiculo) => Promise<void> | void;
  onDeleteVenda?: (vendaId: string) => Promise<void> | void;
}

export const ComissoesVendasView: React.FC<ComissoesVendasViewProps> = ({
  vendas,
  veiculos = [],
  currentUser,
  onUpdateVendaComissao,
  onUpdateVenda,
  onDeleteVenda,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Todos' | 'Pendente' | 'Paga'>('Todos');
  const [vendedorFilter, setVendedorFilter] = useState<string>('Todos');
  const [selectedVendaDetails, setSelectedVendaDetails] = useState<VendaVeiculo | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const isAdminOrGestor = currentUser?.role === 'admin' || currentUser?.role === 'gestor';

  const handleOpenDetails = (v: VendaVeiculo) => {
    setSelectedVendaDetails(v);
    setIsDetailsOpen(true);
  };

  const handleCloseDetails = () => {
    setIsDetailsOpen(false);
    setSelectedVendaDetails(null);
  };

  const handleDeleteClick = (e: React.MouseEvent, venda: VendaVeiculo) => {
    e.stopPropagation();
    if (!onDeleteVenda) return;
    const confirmacao = window.confirm(
      `⚠️ Tem certeza que deseja excluir o registro de venda do veículo ${venda.modelo} (Placa: ${venda.placa})?\n\n` +
      `• O veículo retornará ao status "Disponível" no estoque.\n` +
      `• O lançamento de comissão será removido.\n\n` +
      `Confirmar exclusão?`
    );
    if (confirmacao) {
      onDeleteVenda(venda.id);
    }
  };

  // Filter sales
  const filteredVendas = useMemo(() => {
    return vendas.filter((v) => {
      // Se for vendedor, mostrar apenas as vendas feitas por ele
      if (!isAdminOrGestor && currentUser) {
        const matchesSeller =
          (v.vendedorId && v.vendedorId === currentUser.uid) ||
          (v.vendedorEmail && v.vendedorEmail.toLowerCase() === (currentUser.email || '').toLowerCase()) ||
          (v.vendedorNome && currentUser.displayName && v.vendedorNome.toLowerCase() === currentUser.displayName.toLowerCase());
        if (!matchesSeller) {
          return false;
        }
      }

      const matchesSearch =
        v.modelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.compradorNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.vendedorNome && v.vendedorNome.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus =
        statusFilter === 'Todos' ||
        (statusFilter === 'Pendente' && (v.comissaoStatus === 'Pendente' || !v.comissaoStatus)) ||
        (statusFilter === 'Paga' && v.comissaoStatus === 'Paga');

      const matchesVendedor =
        vendedorFilter === 'Todos' || v.vendedorNome === vendedorFilter || v.vendedorId === vendedorFilter;

      return matchesSearch && matchesStatus && matchesVendedor;
    });
  }, [vendas, searchTerm, statusFilter, vendedorFilter, isAdminOrGestor, currentUser]);

  // Unique Sellers for filter
  const uniqueSellers = useMemo(() => {
    const map = new Map<string, string>();
    vendas.forEach((v) => {
      if (v.vendedorId && v.vendedorNome) {
        map.set(v.vendedorId, v.vendedorNome);
      }
    });
    return Array.from(map.entries());
  }, [vendas]);

  // Calculations
  const stats = useMemo(() => {
    let totalVolume = 0;
    let totalComissoes = 0;
    let comissoesPagas = 0;
    let comissoesPendentes = 0;

    filteredVendas.forEach((v) => {
      totalVolume += v.valorVenda || 0;
      const comissao = v.comissaoValor || 0;
      totalComissoes += comissao;
      if (v.comissaoStatus === 'Paga') {
        comissoesPagas += comissao;
      } else {
        comissoesPendentes += comissao;
      }
    });

    return {
      totalVendas: filteredVendas.length,
      totalVolume,
      totalComissoes,
      comissoesPagas,
      comissoesPendentes,
    };
  }, [filteredVendas]);

  // Ranking by Seller
  const sellerRanking = useMemo(() => {
    const map: Record<string, { nome: string; email?: string; count: number; volume: number; comissao: number }> = {};

    vendas.forEach((v) => {
      const id = v.vendedorId || v.vendedorNome || 'Não Atribuído';
      const nome = v.vendedorNome || 'Venda sem Vendedor';
      if (!map[id]) {
        map[id] = { nome, email: v.vendedorEmail, count: 0, volume: 0, comissao: 0 };
      }
      map[id].count += 1;
      map[id].volume += v.valorVenda || 0;
      map[id].comissao += v.comissaoValor || 0;
    });

    return Object.values(map).sort((a, b) => b.volume - a.volume);
  }, [vendas]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="bg-[#111116] p-6 rounded-3xl border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold mb-2">
            <Award size={14} />
            <span>{isAdminOrGestor ? 'Gestão Geral de Comissões & Vendas' : 'Minhas Vendas & Comissões'}</span>
          </div>
          <h2 className="text-2xl font-black text-white">
            {isAdminOrGestor ? 'Controle de Vendas da Equipe' : 'Extrato de Comissões de Vendas'}
          </h2>
          <p className="text-xs text-slate-400">
            {isAdminOrGestor
              ? 'Acompanhamento de quem vendeu cada veículo, apuração de comissões e baixa de pagamentos.'
              : 'Histórico dos carros que você vendeu com o valor de cada comissão apurada.'}
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#111116] p-5 rounded-2xl border border-white/5 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Carros Vendidos</span>
            <p className="text-2xl font-black text-white mt-1">{stats.totalVendas}</p>
            <span className="text-[11px] text-slate-500">Total de negociações</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
            <Car size={22} />
          </div>
        </div>

        <div className="bg-[#111116] p-5 rounded-2xl border border-white/5 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Volume Faturado</span>
            <p className="text-2xl font-black text-emerald-400 mt-1">{formatCurrency(stats.totalVolume)}</p>
            <span className="text-[11px] text-slate-500">Valor total bruto</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
            <TrendingUp size={22} />
          </div>
        </div>

        <div className="bg-[#111116] p-5 rounded-2xl border border-white/5 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Comissões</span>
            <p className="text-2xl font-black text-amber-400 mt-1">{formatCurrency(stats.totalComissoes)}</p>
            <span className="text-[11px] text-slate-500">Geração de comissão</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
            <Award size={22} />
          </div>
        </div>

        <div className="bg-[#111116] p-5 rounded-2xl border border-white/5 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Comissão Pendente</span>
            <p className="text-2xl font-black text-purple-400 mt-1">{formatCurrency(stats.comissoesPendentes)}</p>
            <span className="text-[11px] text-emerald-400 font-medium">Pagas: {formatCurrency(stats.comissoesPagas)}</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
            <DollarSign size={22} />
          </div>
        </div>
      </div>

      {/* Seller Ranking Table (Visible for Admins & Managers) */}
      {isAdminOrGestor && sellerRanking.length > 0 && (
        <div className="bg-[#111116] p-5 rounded-2xl border border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <Users size={16} className="text-blue-400" />
              <span>Ranking de Produtividade dos Vendedores</span>
            </div>
            <span className="text-xs text-slate-400">{sellerRanking.length} vendedores registrados</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sellerRanking.map((s, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-[#16171f] border border-white/5 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                    idx === 0 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-white/5 text-slate-300'
                  }`}>
                    #{idx + 1}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">{s.nome}</h4>
                    <p className="text-[11px] text-slate-400">{s.count} {s.count === 1 ? 'carro vendido' : 'carros vendidos'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold font-mono text-emerald-400">{formatCurrency(s.volume)}</span>
                  <p className="text-[10px] text-amber-400 font-mono">Comissão: {formatCurrency(s.comissao)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sales List Toolbar */}
      <div className="bg-[#111116] p-4 rounded-2xl border border-white/5 flex flex-col sm:flex-row gap-3 items-center justify-between text-xs">
        <div className="relative flex-1 w-full">
          <Search size={15} className="absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por comprador, modelo, placa ou vendedor..."
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-white/10 bg-[#16171f] text-white outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          {isAdminOrGestor && uniqueSellers.length > 0 && (
            <select
              value={vendedorFilter}
              onChange={(e) => setVendedorFilter(e.target.value)}
              className="p-2.5 rounded-xl border border-white/10 bg-[#16171f] text-white outline-none focus:border-blue-500 font-medium"
            >
              <option value="Todos">Todos os Vendedores</option>
              {uniqueSellers.map(([id, nome]) => (
                <option key={id} value={id}>{nome}</option>
              ))}
            </select>
          )}

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="p-2.5 rounded-xl border border-white/10 bg-[#16171f] text-white outline-none focus:border-blue-500 font-medium"
          >
            <option value="Todos">Todos os Status</option>
            <option value="Pendente">Comissão Pendente</option>
            <option value="Paga">Comissão Paga</option>
          </select>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-[#111116] rounded-3xl border border-white/5 overflow-hidden">
        {filteredVendas.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Car size={40} className="mx-auto text-slate-600" />
            <p className="text-sm font-bold text-white">Nenhuma venda registrada com esses filtros</p>
            <p className="text-xs text-slate-500">As vendas efetuadas no showroom aparecerão aqui em tempo real.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#16171f] text-slate-400 border-b border-white/5 uppercase tracking-wider text-[10px]">
                  <th className="p-4 font-bold">Veículo / Placa</th>
                  <th className="p-4 font-bold">Data Venda</th>
                  <th className="p-4 font-bold">Comprador</th>
                  <th className="p-4 font-bold">Vendedor</th>
                  <th className="p-4 font-bold">Valor da Venda</th>
                  <th className="p-4 font-bold">Comissão Apurada</th>
                  <th className="p-4 font-bold">Status & Quitação</th>
                  <th className="p-4 font-bold text-right">Ações & Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-200">
                {filteredVendas.map((v) => {
                  const comissao = v.comissaoValor || (v.valorVenda * (v.comissaoPercentual || 1.5)) / 100;
                  const isPaga = v.comissaoStatus === 'Paga';

                  return (
                    <tr 
                      key={v.id} 
                      onClick={() => handleOpenDetails(v)}
                      className="hover:bg-white/[0.03] transition cursor-pointer group"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold bg-white/5 border border-white/10 px-2 py-0.5 rounded text-[11px] text-white">
                            {v.placa}
                          </span>
                          <div>
                            <span className="font-bold text-white group-hover:text-blue-400 transition">{v.modelo}</span>
                            <span className="block text-[10px] text-slate-500">Clique para ver dossiê</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-mono text-slate-400">{v.dataVenda}</td>
                      <td className="p-4">
                        <p className="font-bold text-white">{v.compradorNome}</p>
                        <span className="text-[10px] text-slate-500 font-mono">{v.formaPagamento}</span>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 font-bold text-[11px]">
                          <Award size={12} className="text-blue-400" />
                          {v.vendedorNome || 'Não especificado'}
                        </span>
                      </td>
                      <td className="p-4 font-black font-mono text-white text-sm">
                        {formatCurrency(v.valorVenda)}
                      </td>
                      <td className="p-4">
                        <span className="font-black font-mono text-emerald-400 text-sm block">
                          {formatCurrency(comissao)}
                        </span>
                        {v.comissaoPercentual && (
                          <span className="text-[10px] text-slate-500 font-normal">({v.comissaoPercentual}%)</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
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

                          {isPaga && v.comissaoDataPagamento && (
                            <span className="block text-[10px] text-slate-400 font-mono">
                              Pago em: {v.comissaoDataPagamento}
                            </span>
                          )}

                          {v.comissaoReciboAssinado ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                              <FileCheck size={10} /> Recibo Assinado
                            </span>
                          ) : isPaga ? (
                            <span className="block text-[10px] text-amber-500/80">
                              Recibo pendente
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenDetails(v)}
                            className="px-2.5 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 font-bold text-[11px] flex items-center gap-1.5 transition cursor-pointer"
                            title="Abrir detalhes completos da venda e quitação"
                          >
                            <Eye size={13} />
                            <span>Detalhes</span>
                          </button>

                          {isAdminOrGestor && onUpdateVendaComissao && (
                            <button
                              type="button"
                              onClick={() => onUpdateVendaComissao(v.id, isPaga ? 'Pendente' : 'Paga')}
                              className={`px-2.5 py-1.5 rounded-xl font-bold text-[11px] transition cursor-pointer ${
                                isPaga
                                  ? 'bg-white/5 hover:bg-white/10 text-slate-400'
                                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow'
                              }`}
                              title={isPaga ? 'Reverter para Pendente' : 'Registrar Quitação Imediata'}
                            >
                              {isPaga ? 'Reverter' : 'Pagar'}
                            </button>
                          )}

                          {isAdminOrGestor && onDeleteVenda && (
                            <button
                              type="button"
                              onClick={(e) => handleDeleteClick(e, v)}
                              className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition cursor-pointer"
                              title="Excluir Venda e Cancelar Comissão"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Detalhes da Venda & Quitação de Comissão */}
      {isDetailsOpen && selectedVendaDetails && (
        <ModalDetalhesVendaComissao
          isOpen={isDetailsOpen}
          onClose={handleCloseDetails}
          venda={selectedVendaDetails}
          veiculoAssociado={veiculos.find((vec) => vec.id === selectedVendaDetails.veiculoId || vec.placa === selectedVendaDetails.placa)}
          currentUser={currentUser}
          onUpdateVenda={onUpdateVenda}
          onDeleteVenda={onDeleteVenda}
        />
      )}
    </div>
  );
};
