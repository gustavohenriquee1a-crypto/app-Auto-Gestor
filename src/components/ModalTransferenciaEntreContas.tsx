import React, { useState, useMemo, useEffect } from 'react';
import {
  ArrowLeftRight,
  X,
  Building2,
  UserCheck,
  Calendar,
  DollarSign,
  FileText,
  AlertCircle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { ContaBancariaCaixa, Usuario } from '../types';
import { ParametrosTransferencia } from '../services/firestoreService';

interface ModalTransferenciaEntreContasProps {
  isOpen: boolean;
  onClose: () => void;
  contasBancarias: ContaBancariaCaixa[];
  onConfirmarTransferencia: (params: ParametrosTransferencia) => Promise<void>;
  currentUser?: Usuario | null;
}

export const ModalTransferenciaEntreContas: React.FC<ModalTransferenciaEntreContasProps> = ({
  isOpen,
  onClose,
  contasBancarias,
  onConfirmarTransferencia,
  currentUser,
}) => {
  const [contaOrigemId, setContaOrigemId] = useState<string>('');
  const [contaDestinoId, setContaDestinoId] = useState<string>('');
  const [isTerceiro, setIsTerceiro] = useState<boolean>(false);
  const [terceiroDestinoNome, setTerceiroDestinoNome] = useState<string>('');
  const [valor, setValor] = useState<string>('');
  const [data, setData] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [motivo, setMotivo] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [erroValidacao, setErroValidacao] = useState<string | null>(null);

  // Inicializa conta de origem com a primeira disponível quando o modal abre
  useEffect(() => {
    if (isOpen) {
      setErroValidacao(null);
      setIsSubmitting(false);
      setData(new Date().toISOString().split('T')[0]);

      if (contasBancarias.length > 0) {
        if (!contaOrigemId || !contasBancarias.some((c) => c.id === contaOrigemId)) {
          setContaOrigemId(contasBancarias[0].id);
        }
        // Seleciona a segunda conta como destino inicial (se houver)
        const outraConta = contasBancarias.find((c) => c.id !== contasBancarias[0].id);
        if (outraConta) {
          setContaDestinoId(outraConta.id);
        }
      }
    }
  }, [isOpen, contasBancarias]);

  // Se a conta de origem mudar e for igual à de destino, redefine a de destino
  useEffect(() => {
    if (!isTerceiro && contaOrigemId === contaDestinoId) {
      const alternativa = contasBancarias.find((c) => c.id !== contaOrigemId);
      if (alternativa) {
        setContaDestinoId(alternativa.id);
      } else {
        setContaDestinoId('');
      }
    }
  }, [contaOrigemId, isTerceiro, contasBancarias]);

  const contaOrigem = useMemo(() => {
    return contasBancarias.find((c) => c.id === contaOrigemId);
  }, [contasBancarias, contaOrigemId]);

  const contaDestino = useMemo(() => {
    if (isTerceiro) return null;
    return contasBancarias.find((c) => c.id === contaDestinoId);
  }, [contasBancarias, contaDestinoId, isTerceiro]);

  const valorNumerico = useMemo(() => {
    const v = parseFloat(valor);
    return isNaN(v) ? 0 : v;
  }, [valor]);

  const saldoOrigemPosTransferencia = useMemo(() => {
    if (!contaOrigem) return 0;
    return Number(contaOrigem.saldo || 0) - valorNumerico;
  }, [contaOrigem, valorNumerico]);

  const saldoDestinoPosTransferencia = useMemo(() => {
    if (!contaDestino) return 0;
    return Number(contaDestino.saldo || 0) + valorNumerico;
  }, [contaDestino, valorNumerico]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroValidacao(null);

    if (!contaOrigemId) {
      setErroValidacao('Selecione a Conta de Origem.');
      return;
    }

    if (valorNumerico <= 0) {
      setErroValidacao('Informe um valor de transferência maior que R$ 0,00.');
      return;
    }

    if (!isTerceiro) {
      if (!contaDestinoId) {
        setErroValidacao('Selecione a Conta de Destino interna.');
        return;
      }
      if (contaOrigemId === contaDestinoId) {
        setErroValidacao('A Conta de Origem e a Conta de Destino não podem ser iguais.');
        return;
      }
    } else {
      if (!terceiroDestinoNome.trim()) {
        setErroValidacao('Informe o nome ou instituição do terceiro favorecido.');
        return;
      }
    }

    if (!motivo.trim()) {
      setErroValidacao('Informe a Descrição / Motivo da transferência.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirmarTransferencia({
        contaOrigemId,
        contaDestinoId: isTerceiro ? undefined : contaDestinoId,
        isTerceiro,
        terceiroDestinoNome: isTerceiro ? terceiroDestinoNome.trim() : undefined,
        valor: valorNumerico,
        data,
        motivo: motivo.trim(),
        usuarioNome: currentUser?.displayName || currentUser?.email || 'Operador',
      });

      // Limpar campos
      setValor('');
      setMotivo('');
      setTerceiroDestinoNome('');
      setIsTerceiro(false);
      onClose();
    } catch (err: any) {
      console.error('Erro ao efetivar transferência:', err);
      setErroValidacao(err?.message || 'Ocorreu um erro ao processar a transferência.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="modal-nova-transferencia-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        id="modal-nova-transferencia-dialog"
        className="bg-[#14151d] border border-purple-500/30 rounded-3xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-scaleIn"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-white/10 bg-[#191a24] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center justify-center shadow-md">
              <ArrowLeftRight size={22} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                Nova Transferência entre Contas
              </h3>
              <p className="text-xs text-slate-400">
                Movimentação financeira com conciliação automática e extrato detalhado.
              </p>
            </div>
          </div>
          <button
            type="button"
            id="btn-fechar-modal-transferencia"
            disabled={isSubmitting}
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Formulário com Scroll se necessário */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs font-sans">
          {erroValidacao && (
            <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-300 flex items-start gap-2.5 font-medium animate-fadeIn">
              <AlertCircle size={18} className="shrink-0 text-rose-400 mt-0.5" />
              <span>{erroValidacao}</span>
            </div>
          )}

          {/* 1. Conta de Origem */}
          <div>
            <label className="text-slate-200 font-bold block mb-1.5 flex items-center gap-1.5">
              <Building2 size={14} className="text-purple-400" />
              Conta de Origem (Débito) *
            </label>
            <select
              id="select-conta-origem"
              value={contaOrigemId}
              onChange={(e) => setContaOrigemId(e.target.value)}
              required
              className="w-full p-3 rounded-xl bg-black/50 border border-white/10 text-white outline-none focus:border-purple-500 font-medium text-xs sm:text-sm cursor-pointer"
            >
              <option value="" disabled>
                Selecione a conta de origem...
              </option>
              {contasBancarias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome} — Saldo: R$ {Number(c.saldo || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </option>
              ))}
            </select>

            {contaOrigem && (
              <div className="mt-2 p-2.5 rounded-xl bg-purple-950/20 border border-purple-500/20 flex items-center justify-between font-mono">
                <span className="text-slate-400">Saldo Atual da Origem:</span>
                <span className="text-emerald-400 font-black text-xs sm:text-sm">
                  R$ {Number(contaOrigem.saldo || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>

          {/* 2. Checkbox: Transferência para Terceiros */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/40 transition">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                id="checkbox-transferencia-terceiros"
                checked={isTerceiro}
                onChange={(e) => setIsTerceiro(e.target.checked)}
                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-black/40 border-white/20 cursor-pointer accent-purple-600"
              />
              <div className="flex-1">
                <div className="font-bold text-white flex items-center gap-2">
                  <UserCheck size={14} className={isTerceiro ? 'text-amber-400' : 'text-slate-400'} />
                  Transferência para Terceiros
                  {isTerceiro && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                      Favorecido Externo
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {isTerceiro
                    ? 'O valor será debitado da Conta de Origem e registrado no extrato para o terceiro externo.'
                    : 'Transferência interna: o valor será creditado no saldo da conta de destino selecionada.'}
                </p>
              </div>
            </label>
          </div>

          {/* 3. Conta de Destino (Select se interna, Input livre se terceiro) */}
          <div>
            <label className="text-slate-200 font-bold block mb-1.5 flex items-center gap-1.5">
              {isTerceiro ? (
                <>
                  <UserCheck size={14} className="text-amber-400" />
                  Nome / Banco do Terceiro Favorecido *
                </>
              ) : (
                <>
                  <Building2 size={14} className="text-emerald-400" />
                  Conta de Destino (Crédito Interno) *
                </>
              )}
            </label>

            {isTerceiro ? (
              <input
                type="text"
                id="input-terceiro-destino"
                required
                placeholder="Ex: Fornecedor Auto Peças - Bradesco Ag 0450 C/C 12345 (PIX CNPJ...)"
                value={terceiroDestinoNome}
                onChange={(e) => setTerceiroDestinoNome(e.target.value)}
                className="w-full p-3 rounded-xl bg-black/50 border border-amber-500/30 text-white outline-none focus:border-amber-400 font-medium text-xs sm:text-sm"
              />
            ) : (
              <>
                <select
                  id="select-conta-destino"
                  value={contaDestinoId}
                  onChange={(e) => setContaDestinoId(e.target.value)}
                  required
                  className="w-full p-3 rounded-xl bg-black/50 border border-white/10 text-white outline-none focus:border-emerald-500 font-medium text-xs sm:text-sm cursor-pointer"
                >
                  <option value="" disabled>
                    Selecione a conta de destino...
                  </option>
                  {contasBancarias
                    .filter((c) => c.id !== contaOrigemId)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome} — Saldo Atual: R${' '}
                        {Number(c.saldo || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </option>
                    ))}
                </select>

                {contaDestino && (
                  <div className="mt-2 p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-500/20 flex items-center justify-between font-mono">
                    <span className="text-slate-400">Saldo Atual do Destino:</span>
                    <span className="text-emerald-400 font-black text-xs sm:text-sm">
                      R$ {Number(contaDestino.saldo || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* 4. Linha: Valor e Data */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-slate-200 font-bold block mb-1.5 flex items-center gap-1.5">
                <DollarSign size={14} className="text-emerald-400" />
                Valor da Transferência (R$) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold">
                  R$
                </span>
                <input
                  type="number"
                  id="input-valor-transferencia"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0,00"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 rounded-xl bg-black/50 border border-emerald-500/30 text-emerald-400 font-mono font-black text-base sm:text-lg outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-200 font-bold block mb-1.5 flex items-center gap-1.5">
                <Calendar size={14} className="text-purple-400" />
                Data da Movimentação *
              </label>
              <input
                type="date"
                id="input-data-transferencia"
                required
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="w-full p-3 rounded-xl bg-black/50 border border-white/10 text-white outline-none focus:border-purple-500 font-medium text-xs sm:text-sm"
              />
            </div>
          </div>

          {/* 5. Descrição / Motivo */}
          <div>
            <label className="text-slate-200 font-bold block mb-1.5 flex items-center gap-1.5">
              <FileText size={14} className="text-purple-400" />
              Descrição / Motivo da Transferência *
            </label>
            <input
              type="text"
              id="input-motivo-transferencia"
              required
              placeholder="Ex: Aporte de capital de giro, reposição de caixa da loja, adiantamento..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full p-3 rounded-xl bg-black/50 border border-white/10 text-white outline-none focus:border-purple-500 font-medium text-xs sm:text-sm"
            />
          </div>

          {/* Resumo e Projeção de Saldos */}
          {valorNumerico > 0 && contaOrigem && (
            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2 font-mono text-[11px] animate-fadeIn">
              <div className="text-slate-300 font-bold text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-purple-400" />
                Projeção de Conciliação Financeira
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1">
                  <TrendingDown size={13} className="text-rose-400" />
                  {contaOrigem.nome} (Débito):
                </span>
                <span
                  className={`font-black ${
                    saldoOrigemPosTransferencia < 0 ? 'text-rose-400' : 'text-slate-200'
                  }`}
                >
                  R$ {saldoOrigemPosTransferencia.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {!isTerceiro && contaDestino && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1">
                    <TrendingUp size={13} className="text-emerald-400" />
                    {contaDestino.nome} (Crédito):
                  </span>
                  <span className="text-emerald-400 font-black">
                    R$ {saldoDestinoPosTransferencia.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              {isTerceiro && (
                <div className="flex items-center justify-between text-amber-300">
                  <span>Favorecido Externo:</span>
                  <span className="font-bold">{terceiroDestinoNome || 'Terceiro'}</span>
                </div>
              )}

              {saldoOrigemPosTransferencia < 0 && (
                <div className="p-2 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-[10px] flex items-center gap-1.5 mt-1 font-sans">
                  <AlertCircle size={14} className="shrink-0 text-rose-400" />
                  <span>Aviso: O saldo da conta de origem ficará negativo após esta transferência.</span>
                </div>
              )}
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              id="btn-confirmar-transferencia"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-extrabold text-xs shadow-lg shadow-purple-600/30 flex items-center gap-2 transition cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Processando...
                </>
              ) : (
                <>
                  <ArrowLeftRight size={15} />
                  Confirmar Transferência
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
