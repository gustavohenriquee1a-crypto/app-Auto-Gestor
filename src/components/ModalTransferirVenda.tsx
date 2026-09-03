import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowRightLeft,
  User,
  Award,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  HelpCircle,
  Loader2,
  ShieldAlert,
  Sparkles,
  FileText
} from 'lucide-react';
import { VendaVeiculo, Usuario } from '../types';
import { formatCurrency, formatPercent } from '../utils/formatters';
import { saveVendaFirestore } from '../services/firestoreService';

interface ModalTransferirVendaProps {
  isOpen: boolean;
  onClose: () => void;
  venda: VendaVeiculo | null;
  usuarios: Usuario[];
  currentUser: Usuario | null;
  onTransferenciaSucesso?: (vendaAtualizada: VendaVeiculo) => void;
}

export const ModalTransferirVenda: React.FC<ModalTransferirVendaProps> = ({
  isOpen,
  onClose,
  venda,
  usuarios,
  currentUser,
  onTransferenciaSucesso,
}) => {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [isManualSeller, setIsManualSeller] = useState(false);
  const [manualNome, setManualNome] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  
  // Regra de comissão no destino
  const [tipoCalculoComissao, setTipoCalculoComissao] = useState<'manter' | 'recalcular' | 'personalizado'>('manter');
  const [valorComissaoCustom, setValorComissaoCustom] = useState<number | string>('');
  const [motivoTransferencia, setMotivoTransferencia] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Vendedor selecionado no dropdown
  const targetUser = usuarios.find((u) => u.uid === selectedUserId);

  useEffect(() => {
    if (venda && isOpen) {
      setSelectedUserId('');
      setIsManualSeller(false);
      setManualNome('');
      setManualEmail('');
      setTipoCalculoComissao('manter');
      setValorComissaoCustom(venda.comissaoValor || 0);
      setMotivoTransferencia('Agilização do processo de venda inicial / Regularização cadastral');
      setError(null);
    }
  }, [venda, isOpen]);

  if (!isOpen || !venda) return null;

  // Calcular valor sugerido com a regra do novo vendedor
  const calcularComissaoNovoVendedor = (): number => {
    if (!targetUser) return venda.comissaoValor || 0;

    const valorVenda = venda.valorVenda || 0;
    const lucroLiquido = venda.lucroLiquido || 0;

    // Regra fixa em R$
    if (targetUser.tipoComissaoPadrao === 'fixo' && targetUser.comissaoPadraoFixo !== undefined) {
      return targetUser.comissaoPadraoFixo;
    }

    // Regra percentual padrão
    if (targetUser.comissaoPadraoPercent !== undefined && targetUser.comissaoPadraoPercent > 0) {
      // Se percentual for sobre venda
      return (valorVenda * targetUser.comissaoPadraoPercent) / 100;
    }

    // Caso padrão: manter atual
    return venda.comissaoValor || 0;
  };

  const valorRecalculado = calcularComissaoNovoVendedor();

  const getValorComissaoFinal = (): number => {
    if (tipoCalculoComissao === 'manter') {
      return venda.comissaoValor || 0;
    }
    if (tipoCalculoComissao === 'recalcular') {
      return valorRecalculado;
    }
    if (tipoCalculoComissao === 'personalizado') {
      return Number(valorComissaoCustom) || 0;
    }
    return venda.comissaoValor || 0;
  };

  const handleConfirmarTransferencia = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let novoVendedorId: string | undefined = undefined;
    let novoVendedorNome = '';
    let novoVendedorEmail: string | undefined = undefined;

    if (isManualSeller) {
      if (!manualNome.trim()) {
        setError('Por favor, informe o nome do novo vendedor.');
        return;
      }
      novoVendedorNome = manualNome.trim();
      novoVendedorEmail = manualEmail.trim() || undefined;
    } else {
      if (!selectedUserId) {
        setError('Por favor, selecione um vendedor cadastrado ou marque a opção manual.');
        return;
      }
      if (!targetUser) {
        setError('Usuário de destino não encontrado.');
        return;
      }
      novoVendedorId = targetUser.uid;
      novoVendedorNome = targetUser.displayName || 'Vendedor';
      novoVendedorEmail = targetUser.email || undefined;
    }

    const valorFinalComissao = getValorComissaoFinal();
    const dataHora = new Date().toLocaleString('pt-BR');
    const autor = currentUser?.displayName || currentUser?.email || 'Administrador';

    const notaAuditoria = `\n[TRANSFERÊNCIA DE VENDA em ${dataHora} por ${autor}]: Venda transferida de "${venda.vendedorNome || 'Não especificado'}" para "${novoVendedorNome}". Comissão ajustada para ${formatCurrency(valorFinalComissao)}. Motivo: ${motivoTransferencia.trim() || 'Ajuste operacional'}`;

    const vendaAtualizada: VendaVeiculo = {
      ...venda,
      vendedorId: novoVendedorId,
      vendedorNome: novoVendedorNome,
      vendedorEmail: novoVendedorEmail,
      comissaoValor: valorFinalComissao,
      observacoesVenda: (venda.observacoesVenda || '') + notaAuditoria,
    };

    setIsSaving(true);
    try {
      await saveVendaFirestore(vendaAtualizada);
      if (onTransferenciaSucesso) {
        onTransferenciaSucesso(vendaAtualizada);
      }
      onClose();
    } catch (err: any) {
      console.error('Erro ao transferir venda no Firestore:', err);
      setError(err?.message || 'Falha ao salvar a transferência no Firestore.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-xl bg-[#0e0f14] border border-white/10 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col">
        {/* Header do Modal */}
        <div className="flex items-center justify-between p-5 border-b border-white/5 bg-[#12131a]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center justify-center shrink-0">
              <ArrowRightLeft size={18} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">
                Transferir Venda & Comissões
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Reatribuição oficial de venda para outro colaborador cadastrado
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Resumo da Venda Atual */}
        <div className="p-5 border-b border-white/5 bg-[#14151e] space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">
                Veículo Vendido
              </span>
              <h4 className="text-sm font-black text-white flex items-center gap-2">
                <span>{venda.modelo}</span>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-white/10 border border-white/10 text-blue-300">
                  {venda.placa}
                </span>
              </h4>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400">
                Valor da Venda
              </span>
              <p className="text-sm font-black text-emerald-400 font-mono">
                {formatCurrency(venda.valorVenda)}
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#0e0f14] border border-white/5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <User size={14} className="text-slate-400" />
              <div>
                <span className="text-slate-400 block text-[10px]">Vendedor Atual Registrado:</span>
                <span className="font-bold text-white">{venda.vendedorNome || 'Não especificado'}</span>
                {venda.vendedorEmail && (
                  <span className="text-slate-500 text-[10px] block">({venda.vendedorEmail})</span>
                )}
              </div>
            </div>

            <div className="text-right">
              <span className="text-slate-400 block text-[10px]">Comissão Atual:</span>
              <span className="font-bold text-amber-400 font-mono">
                {formatCurrency(venda.comissaoValor)}
              </span>
              <span className="block text-[10px] text-slate-500">
                Status: {venda.comissaoStatus || 'Pendente'}
              </span>
            </div>
          </div>
        </div>

        {/* Formulário de Transferência */}
        <form onSubmit={handleConfirmarTransferencia} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-semibold flex items-center gap-2">
              <AlertCircle size={16} className="text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Seleção do Novo Vendedor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200">
                Novo Vendedor Responsável <span className="text-rose-400">*</span>
              </label>
              <button
                type="button"
                onClick={() => setIsManualSeller(!isManualSeller)}
                className="text-[11px] text-purple-400 hover:text-purple-300 underline font-semibold cursor-pointer"
              >
                {isManualSeller ? 'Selecionar da Lista de Usuários' : 'Digitar nome manualmente'}
              </button>
            </div>

            {!isManualSeller ? (
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full bg-[#16171f] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-purple-500 outline-none"
              >
                <option value="">-- Selecione o colaborador na lista --</option>
                {usuarios.map((u) => (
                  <option key={u.uid} value={u.uid}>
                    {u.displayName} ({u.cargo || u.role}) - {u.email}
                  </option>
                ))}
              </select>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Nome do Novo Vendedor"
                  value={manualNome}
                  onChange={(e) => setManualNome(e.target.value)}
                  className="w-full bg-[#16171f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-purple-500 outline-none"
                />
                <input
                  type="email"
                  placeholder="E-mail (opcional)"
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  className="w-full bg-[#16171f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-purple-500 outline-none"
                />
              </div>
            )}
          </div>

          {/* Regra da Comissão */}
          <div className="space-y-2 bg-[#14151e] p-3.5 rounded-2xl border border-white/5">
            <label className="block text-xs font-bold text-slate-200">
              Tratamento da Comissão da Venda
            </label>

            <div className="space-y-2">
              <label className="flex items-center gap-2 p-2 rounded-xl bg-[#0e0f14] border border-white/5 cursor-pointer hover:border-purple-500/30 transition">
                <input
                  type="radio"
                  name="tipoCalculoComissao"
                  value="manter"
                  checked={tipoCalculoComissao === 'manter'}
                  onChange={() => setTipoCalculoComissao('manter')}
                  className="text-purple-600 focus:ring-0"
                />
                <div className="text-xs">
                  <span className="font-bold text-white block">
                    Manter o valor atual da comissão ({formatCurrency(venda.comissaoValor)})
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Transfere exatamente os {formatCurrency(venda.comissaoValor)} para o novo beneficiário.
                  </span>
                </div>
              </label>

              {targetUser && (
                <label className="flex items-center gap-2 p-2 rounded-xl bg-[#0e0f14] border border-white/5 cursor-pointer hover:border-purple-500/30 transition">
                  <input
                    type="radio"
                    name="tipoCalculoComissao"
                    value="recalcular"
                    checked={tipoCalculoComissao === 'recalcular'}
                    onChange={() => setTipoCalculoComissao('recalcular')}
                    className="text-purple-600 focus:ring-0"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-white block">
                      Recalcular pela regra cadastral do novo vendedor ({formatCurrency(valorRecalculado)})
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Aplica a taxa padrão de {targetUser.displayName} ({targetUser.comissaoPadraoPercent || 0}% ou R$ {targetUser.comissaoPadraoFixo || 0}).
                    </span>
                  </div>
                </label>
              )}

              <label className="flex items-center gap-2 p-2 rounded-xl bg-[#0e0f14] border border-white/5 cursor-pointer hover:border-purple-500/30 transition">
                <input
                  type="radio"
                  name="tipoCalculoComissao"
                  value="personalizado"
                  checked={tipoCalculoComissao === 'personalizado'}
                  onChange={() => setTipoCalculoComissao('personalizado')}
                  className="text-purple-600 focus:ring-0"
                />
                <div className="text-xs flex-1">
                  <span className="font-bold text-white block">
                    Definir novo valor fixo manual
                  </span>
                  {tipoCalculoComissao === 'personalizado' && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-mono">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={valorComissaoCustom}
                        onChange={(e) => setValorComissaoCustom(e.target.value)}
                        placeholder="0.00"
                        className="w-32 bg-[#16171f] border border-purple-500/40 rounded-lg px-2 py-1 text-xs text-white font-mono outline-none"
                      />
                    </div>
                  )}
                </div>
              </label>
            </div>
          </div>

          {/* Motivo da Transferência */}
          <div>
            <label className="block text-xs font-bold text-slate-200 mb-1">
              Motivo / Justificativa da Transferência (Histórico de Auditoria)
            </label>
            <input
              type="text"
              value={motivoTransferencia}
              onChange={(e) => setMotivoTransferencia(e.target.value)}
              placeholder="Ex: Vendedor novato ainda sem cadastro na data da venda; plantão de domingo"
              className="w-full bg-[#16171f] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-purple-500 outline-none"
            />
          </div>

          {/* Footer de Ações */}
          <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition shadow-lg shadow-purple-600/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Transferindo venda...</span>
                </>
              ) : (
                <>
                  <ArrowRightLeft size={14} />
                  <span>Confirmar Transferência</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
