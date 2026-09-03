import React, { useState, useEffect } from 'react';
import { X, Building2, Landmark, Phone, Mail, Globe, CreditCard, Percent, FileText, UserCheck, CheckCircle2 } from 'lucide-react';
import { BancoParceiro } from '../types';

interface ModalNovoBancoProps {
  isOpen: boolean;
  onClose: () => void;
  bancoToEdit?: BancoParceiro | null;
  onSaveBanco: (bancoData: BancoParceiro) => Promise<void> | void;
}

export const ModalNovoBanco: React.FC<ModalNovoBancoProps> = ({
  isOpen,
  onClose,
  bancoToEdit,
  onSaveBanco,
}) => {
  const isEditing = Boolean(bancoToEdit);

  const [razaoSocial, setRazaoSocial] = useState('');
  const [nomeFantasia, setNomeFantasia] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [codigoLojista, setCodigoLojista] = useState('');
  const [nomeGerente, setNomeGerente] = useState('');
  const [telefone, setTelefone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [linkPortal, setLinkPortal] = useState('');
  const [domicilioBancario, setDomicilioBancario] = useState('');
  const [taxaRetornoPadrao, setTaxaRetornoPadrao] = useState<number | string>(2.5);
  const [status, setStatus] = useState<'Ativo' | 'Inativo'>('Ativo');
  const [observacoes, setObservacoes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (bancoToEdit) {
      setRazaoSocial(bancoToEdit.razaoSocial || '');
      setNomeFantasia(bancoToEdit.nomeFantasia || '');
      setCnpj(bancoToEdit.cnpj || '');
      setCodigoLojista(bancoToEdit.codigoLojista || '');
      setNomeGerente(bancoToEdit.nomeGerente || '');
      setTelefone(bancoToEdit.telefone || '');
      setWhatsapp(bancoToEdit.whatsapp || '');
      setEmail(bancoToEdit.email || '');
      setLinkPortal(bancoToEdit.linkPortal || '');
      setDomicilioBancario(bancoToEdit.domicilioBancario || '');
      setTaxaRetornoPadrao(bancoToEdit.taxaRetornoPadrao ?? 2.5);
      setStatus(bancoToEdit.status || 'Ativo');
      setObservacoes(bancoToEdit.observacoes || '');
    } else {
      setRazaoSocial('');
      setNomeFantasia('');
      setCnpj('');
      setCodigoLojista('');
      setNomeGerente('');
      setTelefone('');
      setWhatsapp('');
      setEmail('');
      setLinkPortal('');
      setDomicilioBancario('');
      setTaxaRetornoPadrao(2.5);
      setStatus('Ativo');
      setObservacoes('');
    }
  }, [isOpen, bancoToEdit]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nomeFantasia.trim() || !cnpj.trim()) {
      alert('Por favor, informe pelo menos o Nome Fantasia e o CNPJ do Banco / Financeira.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: BancoParceiro = {
        id: bancoToEdit?.id || `banco-${Date.now()}`,
        razaoSocial: razaoSocial.trim() || nomeFantasia.trim(),
        nomeFantasia: nomeFantasia.trim(),
        cnpj: cnpj.trim(),
        codigoLojista: codigoLojista.trim() || undefined,
        nomeGerente: nomeGerente.trim() || undefined,
        telefone: telefone.trim() || undefined,
        whatsapp: whatsapp.trim() || undefined,
        email: email.trim() || undefined,
        linkPortal: linkPortal.trim() || undefined,
        domicilioBancario: domicilioBancario.trim() || undefined,
        taxaRetornoPadrao: Number(taxaRetornoPadrao) || 0,
        status,
        observacoes: observacoes.trim() || undefined,
        createdAt: bancoToEdit?.createdAt || new Date().toISOString(),
      };

      await onSaveBanco(payload);
      onClose();
    } catch (err) {
      console.error('Erro ao salvar banco:', err);
      alert('Erro ao salvar o banco parceiro. Verifique os dados e tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-gray-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-[#111116] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400">
              <Landmark size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {isEditing ? 'Editar Banco / Financeira Parceira' : 'Cadastrar Novo Banco / Financeira'}
              </h2>
              <p className="text-xs text-slate-400">
                Gerencie credenciamentos, códigos de lojista, taxas de TAC e gerentes de conta
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Dados Principais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Nome Fantasia / Instituição *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Santander Financiamentos, BV, Itaú"
                value={nomeFantasia}
                onChange={(e) => setNomeFantasia(e.target.value)}
                className="w-full bg-[#0d0e12] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Razão Social
              </label>
              <input
                type="text"
                placeholder="Ex: Aymoré CFI S.A. / Banco Pan S.A."
                value={razaoSocial}
                onChange={(e) => setRazaoSocial(e.target.value)}
                className="w-full bg-[#0d0e12] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                CNPJ da Instituição *
              </label>
              <input
                type="text"
                required
                placeholder="00.000.000/0000-00"
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                className="w-full bg-[#0d0e12] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none transition font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Código de Lojista / Correspondente
              </label>
              <input
                type="text"
                placeholder="Ex: SANT-88210 / LOJ-4091"
                value={codigoLojista}
                onChange={(e) => setCodigoLojista(e.target.value)}
                className="w-full bg-[#0d0e12] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-amber-300 focus:border-indigo-500 focus:outline-none transition font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Taxa Retorno / TAC Padrão (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  placeholder="2.5"
                  value={taxaRetornoPadrao}
                  onChange={(e) => setTaxaRetornoPadrao(e.target.value)}
                  className="w-full bg-[#0d0e12] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-emerald-400 focus:border-indigo-500 focus:outline-none transition font-mono font-bold pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-bold">%</span>
              </div>
            </div>
          </div>

          {/* Gerente & Contatos */}
          <div className="p-4 rounded-2xl bg-[#111116] border border-white/5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
              <UserCheck size={16} /> Contato do Gerente de Conta & Suporte
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  Nome do Gerente de Conta
                </label>
                <input
                  type="text"
                  placeholder="Ex: Rodrigo Alcantara"
                  value={nomeGerente}
                  onChange={(e) => setNomeGerente(e.target.value)}
                  className="w-full bg-[#0d0e12] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  WhatsApp do Gerente
                </label>
                <input
                  type="text"
                  placeholder="(11) 98877-6655"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full bg-[#0d0e12] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none transition font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  Telefone / Mesa de Crédito
                </label>
                <input
                  type="text"
                  placeholder="0800 / (11) 3004-5454"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  className="w-full bg-[#0d0e12] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none transition font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  E-mail do Gerente / Mesa
                </label>
                <input
                  type="email"
                  placeholder="gerente@financeira.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#0d0e12] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  Link do Portal de Financiamento
                </label>
                <input
                  type="url"
                  placeholder="https://portal.financeira.com.br"
                  value={linkPortal}
                  onChange={(e) => setLinkPortal(e.target.value)}
                  className="w-full bg-[#0d0e12] border border-white/10 rounded-xl px-3 py-2 text-sm text-indigo-300 focus:border-indigo-500 focus:outline-none transition font-mono"
                />
              </div>
            </div>
          </div>

          {/* Domicílio Bancário e Repasse */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <CreditCard size={14} className="text-emerald-400" />
              Domicílio Bancário para Repasse da Loja (Agência, Conta e Chave PIX)
            </label>
            <input
              type="text"
              placeholder="Ex: Agência: 0033 | Conta: 13004589-2 | Chave PIX: 07.707.650/0001-10"
              value={domicilioBancario}
              onChange={(e) => setDomicilioBancario(e.target.value)}
              className="w-full bg-[#0d0e12] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none transition"
            />
          </div>

          {/* Status e Observações */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Status do Credenciamento
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'Ativo' | 'Inativo')}
                className="w-full bg-[#0d0e12] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none transition cursor-pointer"
              >
                <option value="Ativo">Ativo (Disponível para Vendas)</option>
                <option value="Inativo">Inativo / Suspenso</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Observações / Políticas de Crédito
              </label>
              <input
                type="text"
                placeholder="Ex: Foco em score intermediário, aceita até 12 anos de fabricação..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="w-full bg-[#0d0e12] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none transition"
              />
            </div>
          </div>

          </div>

          {/* Fixed Footer Buttons */}
          <div className="p-4 sm:p-5 border-t border-white/10 bg-[#111116] flex items-center justify-end gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-white/10 text-xs font-bold text-slate-300 hover:bg-white/5 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-900/40 cursor-pointer transition disabled:opacity-50"
            >
              <CheckCircle2 size={16} />
              <span>{isSubmitting ? 'Salvando...' : isEditing ? 'Atualizar Banco' : 'Cadastrar Banco'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
