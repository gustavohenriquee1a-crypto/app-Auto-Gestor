import React, { useState, useMemo } from 'react';
import {
  Landmark,
  Building2,
  Search,
  Plus,
  Phone,
  MessageCircle,
  ExternalLink,
  CreditCard,
  Percent,
  Copy,
  Check,
  Edit2,
  Trash2,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  UserCheck,
  Globe,
  FileSpreadsheet
} from 'lucide-react';
import { BancoParceiro, Usuario } from '../types';
import { ModalNovoBanco } from './ModalNovoBanco';

interface BancosParceirosViewProps {
  bancos: BancoParceiro[];
  currentUser: Usuario | null;
  onSaveBanco: (bancoData: BancoParceiro) => Promise<void> | void;
  onDeleteBanco: (bancoId: string) => Promise<void> | void;
}

export const BancosParceirosView: React.FC<BancosParceirosViewProps> = ({
  bancos = [],
  currentUser,
  onSaveBanco,
  onDeleteBanco,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Todos' | 'Ativo' | 'Inativo'>('Todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [bancoToEdit, setBancoToEdit] = useState<BancoParceiro | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const canManage = currentUser?.role === 'admin' || currentUser?.role === 'gestor' || currentUser?.permissoes?.gerenciarBancos !== false;

  const handleOpenNew = () => {
    setBancoToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (banco: BancoParceiro) => {
    setBancoToEdit(banco);
    setIsModalOpen(true);
  };

  const handleDelete = async (banco: BancoParceiro) => {
    if (!canManage) return;
    if (window.confirm(`Tem certeza que deseja remover o banco ${banco.nomeFantasia}?`)) {
      await onDeleteBanco(banco.id);
    }
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const filteredBancos = useMemo(() => {
    return bancos.filter((b) => {
      const matchSearch =
        b.nomeFantasia.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.razaoSocial.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.cnpj.includes(searchTerm) ||
        (b.codigoLojista && b.codigoLojista.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (b.nomeGerente && b.nomeGerente.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchStatus = statusFilter === 'Todos' || b.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [bancos, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const total = bancos.length;
    const ativos = bancos.filter((b) => b.status === 'Ativo').length;
    const mediaTac =
      total > 0
        ? bancos.reduce((acc, b) => acc + (b.taxaRetornoPadrao || 0), 0) / total
        : 0;

    return {
      total,
      ativos,
      inativos: total - ativos,
      mediaTac,
    };
  }, [bancos]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-950/70 via-[#111116] to-[#16171f] p-6 sm:p-8 rounded-3xl border border-blue-500/20 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-blue-600/10 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400">
                <Landmark size={24} />
              </div>
              <span className="text-xs uppercase font-black text-blue-400 tracking-wider">
                Correspondentes Bancários & Financeiras
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Bancos & Financeiras Parceiras
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
              Gerencie credenciamentos, códigos de operador/lojista, gerentes de conta, taxas de retorno TAC e links diretos para aprovação de crédito na venda de veículos.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {canManage && (
              <button
                type="button"
                onClick={handleOpenNew}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-950/50 flex items-center gap-2 cursor-pointer transition active:scale-95"
              >
                <Plus size={16} />
                <span>Cadastrar Banco Parceiro</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick KPI Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/5">
          <div className="p-4 rounded-2xl bg-black/40 border border-blue-500/20">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
              <Building2 size={13} className="text-blue-400" /> Total de Instituições
            </span>
            <p className="text-2xl font-black text-blue-300 mt-1 font-mono">
              {stats.total}
            </p>
            <span className="text-[10px] text-slate-500">Credenciadas na loja</span>
          </div>

          <div className="p-4 rounded-2xl bg-black/40 border border-emerald-500/20">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-emerald-400" /> Bancos Ativos
            </span>
            <p className="text-2xl font-black text-emerald-300 mt-1 font-mono">
              {stats.ativos}
            </p>
            <span className="text-[10px] text-slate-500">Liberados para vendas</span>
          </div>

          <div className="p-4 rounded-2xl bg-black/40 border border-amber-500/20">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
              <Percent size={13} className="text-amber-400" /> Retorno TAC Médio
            </span>
            <p className="text-2xl font-black text-amber-300 mt-1 font-mono">
              {stats.mediaTac.toFixed(1)}%
            </p>
            <span className="text-[10px] text-slate-500">Média de bonificação</span>
          </div>

          <div className="p-4 rounded-2xl bg-black/40 border border-slate-700/50">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-indigo-400" /> Vinculação na Venda
            </span>
            <p className="text-2xl font-black text-white mt-1 font-mono">
              100%
            </p>
            <span className="text-[10px] text-slate-500">Integrado ao Financiamento</span>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por instituição, CNPJ, código lojista ou gerente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#111116] border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none transition"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-[#111116] rounded-2xl border border-white/5">
            {(['Todos', 'Ativo', 'Inativo'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  statusFilter === st
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid of Bank Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredBancos.map((banco) => (
          <div
            key={banco.id}
            className="bg-[#111116] border border-white/5 hover:border-blue-500/30 rounded-3xl p-5 shadow-xl transition space-y-4 flex flex-col justify-between"
          >
            {/* Card Header */}
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                    <Landmark size={22} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white leading-tight">
                      {banco.nomeFantasia}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-1">
                      {banco.razaoSocial}
                    </p>
                  </div>
                </div>

                <span
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                    banco.status === 'Ativo'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {banco.status}
                </span>
              </div>

              {/* CNPJ & Código Lojista Badges */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <div className="px-2.5 py-1 rounded-xl bg-black/40 border border-white/5 text-[11px] font-mono text-slate-300">
                  CNPJ: {banco.cnpj}
                </div>
                {banco.codigoLojista && (
                  <div
                    onClick={() => handleCopyText(banco.codigoLojista!, `cod-${banco.id}`)}
                    className="px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] font-mono font-bold text-amber-300 flex items-center gap-1.5 cursor-pointer hover:bg-amber-500/20 transition"
                    title="Clique para copiar código de lojista"
                  >
                    <span>Lojista: {banco.codigoLojista}</span>
                    {copiedId === `cod-${banco.id}` ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  </div>
                )}
                {banco.taxaRetornoPadrao !== undefined && banco.taxaRetornoPadrao > 0 && (
                  <div className="px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-mono font-bold text-emerald-300 flex items-center gap-1">
                    <Percent size={11} /> Retorno TAC: {banco.taxaRetornoPadrao}%
                  </div>
                )}
              </div>
            </div>

            {/* Gerente & Contato */}
            <div className="p-3.5 rounded-2xl bg-black/30 border border-white/5 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                  <UserCheck size={13} className="text-blue-400" />
                  {banco.nomeGerente || 'Mesa de Financiamento'}
                </span>
                {banco.telefone && <span className="font-mono text-[11px]">{banco.telefone}</span>}
              </div>

              {banco.email && (
                <div className="text-slate-400 flex items-center gap-1.5 truncate">
                  <span className="text-slate-500">Email:</span>
                  <span className="text-slate-300 truncate">{banco.email}</span>
                </div>
              )}

              {banco.domicilioBancario && (
                <div
                  onClick={() => handleCopyText(banco.domicilioBancario!, `dom-${banco.id}`)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[11px] text-slate-300 flex items-center justify-between gap-2 cursor-pointer transition"
                  title="Clique para copiar dados bancários de repasse"
                >
                  <span className="truncate">
                    <CreditCard size={12} className="inline mr-1 text-emerald-400" />
                    {banco.domicilioBancario}
                  </span>
                  {copiedId === `dom-${banco.id}` ? (
                    <span className="text-[10px] text-emerald-400 font-bold whitespace-nowrap">Copiado!</span>
                  ) : (
                    <Copy size={12} className="text-slate-400 shrink-0" />
                  )}
                </div>
              )}

              {banco.observacoes && (
                <p className="text-[11px] text-slate-400 italic pt-1 border-t border-white/5">
                  "{banco.observacoes}"
                </p>
              )}
            </div>

            {/* Card Actions */}
            <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {banco.linkPortal && (
                  <a
                    href={banco.linkPortal}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-xs font-bold flex items-center gap-1.5 border border-blue-500/30 transition"
                  >
                    <Globe size={13} />
                    <span>Portal</span>
                    <ExternalLink size={11} />
                  </a>
                )}

                {banco.whatsapp && (
                  <a
                    href={`https://wa.me/55${banco.whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 transition"
                    title="Conversar com Gerente no WhatsApp"
                  >
                    <MessageCircle size={15} />
                  </a>
                )}
              </div>

              {canManage && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(banco)}
                    className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
                    title="Editar Banco"
                  >
                    <Edit2 size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(banco)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                    title="Excluir Banco"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredBancos.length === 0 && (
        <div className="p-12 text-center bg-[#111116] rounded-3xl border border-white/5 space-y-3">
          <Landmark size={36} className="mx-auto text-slate-600" />
          <h3 className="text-base font-bold text-white">Nenhum banco parceiro encontrado</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchTerm ? 'Tente ajustar os termos de busca para localizar o banco.' : 'Cadastre sua primeira financeira ou banco credenciado para integrar às simulações de vendas.'}
          </p>
        </div>
      )}

      {/* Modal */}
      <ModalNovoBanco
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        bancoToEdit={bancoToEdit}
        onSaveBanco={onSaveBanco}
      />
    </div>
  );
};
