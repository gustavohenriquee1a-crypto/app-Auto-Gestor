import React, { useState, useMemo } from 'react';
import {
  X,
  CheckCircle2,
  Car,
  Gauge,
  Calendar,
  DollarSign,
  Building2,
  Clock,
  Sparkles,
  AlertCircle,
  ThumbsUp,
  FileCheck,
  Tag
} from 'lucide-react';
import {
  Veiculo,
  Usuario,
  FornecedorPrestador,
  ContaBancariaCaixa,
  CategoriaDespesa,
  DespesaVeiculo
} from '../types';
import { ParametrosRetornoPatio } from '../utils/auditLogger';
import { formatCurrency, formatKm } from '../utils/formatters';

interface ModalRetornoPatioProps {
  isOpen: boolean;
  onClose: () => void;
  veiculo: Veiculo | null;
  contasBancarias?: ContaBancariaCaixa[];
  currentUser: Usuario | null;
  onConfirmarRetorno: (data: {
    veiculoId: string;
    paramsRetorno: ParametrosRetornoPatio;
    despesaData?: Omit<DespesaVeiculo, 'id'>;
  }) => Promise<void> | void;
}

export const ModalRetornoPatio: React.FC<ModalRetornoPatioProps> = ({
  isOpen,
  onClose,
  veiculo,
  contasBancarias = [],
  currentUser,
  onConfirmarRetorno,
}) => {
  if (!isOpen || !veiculo) return null;

  // Initial State based on Vehicle
  const kmSaidaOriginal = veiculo.kmAtual || 0;
  const [kmRetorno, setKmRetorno] = useState<number | ''>(kmSaidaOriginal);
  const [dataRetorno, setDataRetorno] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  
  // Quality & Feedback
  const [avaliacaoQualidade, setAvaliacaoQualidade] = useState<string>('Excelente / Aprovado 100%');
  const [observacoes, setObservacoes] = useState<string>('');

  // Financial Adjustment / Final Cost
  const [lancarDespesaFinal, setLancarDespesaFinal] = useState<boolean>(
    Boolean(veiculo.custoEstimadoServico && veiculo.custoEstimadoServico > 0)
  );
  const [valorFinal, setValorFinal] = useState<number | ''>(
    veiculo.custoEstimadoServico || ''
  );
  const [statusPagamento, setStatusPagamento] = useState<'Pendente' | 'Pago'>('Pago');
  const [selectedContaBancariaId, setSelectedContaBancariaId] = useState<string>(
    contasBancarias.length > 0 ? contasBancarias[0].id : ''
  );
  const [formaPagamento, setFormaPagamento] = useState<string>('PIX');
  const [nfNumero, setNfNumero] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // KM Delta Calculation
  const kmDelta = useMemo(() => {
    if (kmRetorno === '' || isNaN(Number(kmRetorno))) return 0;
    return Number(kmRetorno) - kmSaidaOriginal;
  }, [kmRetorno, kmSaidaOriginal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const kmNum = kmRetorno !== '' ? Number(kmRetorno) : kmSaidaOriginal;
      const custoNum = valorFinal !== '' ? Number(valorFinal) : undefined;

      const paramsRetorno: ParametrosRetornoPatio = {
        veiculo,
        kmRetorno: kmNum,
        dataRetorno: dataRetorno || new Date().toISOString().split('T')[0],
        custoRealizado: custoNum,
        avaliacaoQualidade,
        observacoes: [
          observacoes.trim(),
          nfNumero ? `NF/Recibo nº: ${nfNumero.trim()}` : null,
        ].filter(Boolean).join(' | '),
        usuario: currentUser,
        origemModulo: 'Retorno Rápido ao Pátio',
      };

      let despesaData: Omit<DespesaVeiculo, 'id'> | undefined = undefined;
      if (lancarDespesaFinal && custoNum && custoNum > 0) {
        let catDespesa: CategoriaDespesa = 'Estética / Lavagem';
        if (veiculo.etapaKanban === 'Funilaria') catDespesa = 'Funilaria / Pintura';
        if (veiculo.etapaKanban === 'Oficina') catDespesa = 'Mecânica / Mão de Obra';

        const conta = contasBancarias.find((c) => c.id === selectedContaBancariaId);

        despesaData = {
          veiculoId: veiculo.id,
          chassi: veiculo.chassi,
          placa: veiculo.placa,
          categoria: catDespesa,
          descricao: `Conclusão de ${veiculo.etapaKanban || 'Serviço'}: ${veiculo.servicoAtualEmAndamento || 'Serviço Concluído'}${veiculo.fornecedorAtualNome ? ` (${veiculo.fornecedorAtualNome})` : ''}`,
          valor: custoNum,
          data: dataRetorno,
          fornecedor: veiculo.fornecedorAtualNome || 'Oficina / Parceiro',
          fornecedorId: veiculo.fornecedorAtualId || undefined,
          statusPagamento: statusPagamento,
          formaPagamento: statusPagamento === 'Pago' ? formaPagamento : undefined,
          contaBancariaId: statusPagamento === 'Pago' ? selectedContaBancariaId : undefined,
          contaBancariaNome: statusPagamento === 'Pago' ? conta?.nome : undefined,
          dataPagamento: statusPagamento === 'Pago' ? dataRetorno : undefined,
          comprovanteUrl: undefined,
          observacoes: nfNumero ? `NF: ${nfNumero}` : undefined,
        };
      }

      await onConfirmarRetorno({
        veiculoId: veiculo.id,
        paramsRetorno,
        despesaData,
      });

      onClose();
    } catch (err) {
      console.error('Erro ao confirmar retorno do veículo:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-xl max-h-[92vh] flex flex-col bg-gray-900 rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 p-5 bg-[#16171f] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">
                Confirmar Retorno ao Showroom / Pátio
              </h3>
              <p className="text-xs text-slate-400">
                Libera o veículo para venda (Disponível), fecha a etapa do Kanban e atualiza o histórico.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs">
          
          {/* Card Resumo do Veículo & Serviço */}
          <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg font-mono font-black text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {veiculo.placa}
                </span>
                <h4 className="font-bold text-white text-sm">{veiculo.modelo}</h4>
              </div>
              <span className="text-[11px] text-slate-400">{veiculo.marca} • {veiculo.ano}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 text-[11px]">
              <div className="space-y-0.5">
                <span className="text-slate-500 block">Etapa Atual:</span>
                <span className="font-bold text-orange-300">{veiculo.etapaKanban || 'Preparação'}</span>
              </div>

              <div className="space-y-0.5">
                <span className="text-slate-500 block">Prestador / Oficina:</span>
                <span className="font-bold text-slate-200 truncate block">
                  {veiculo.fornecedorAtualNome || 'Oficina Própria / Interno'}
                </span>
              </div>

              {veiculo.servicoAtualEmAndamento && (
                <div className="col-span-2 space-y-0.5 pt-1">
                  <span className="text-slate-500 block">Serviço Executado:</span>
                  <span className="font-medium text-slate-300 block">{veiculo.servicoAtualEmAndamento}</span>
                </div>
              )}
            </div>
          </div>

          {/* Odômetro de Retorno & Data */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-bold mb-1 flex items-center gap-1.5">
                <Gauge size={13} className="text-emerald-400" />
                <span>Odômetro Final (KM de Retorno) *</span>
              </label>
              <input
                type="number"
                required
                value={kmRetorno}
                onChange={(e) => setKmRetorno(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder={`KM anterior: ${kmSaidaOriginal}`}
                className={`w-full p-2.5 rounded-xl border font-mono font-bold outline-none bg-[#16171f] ${
                  kmDelta < 0
                    ? 'border-red-500 text-red-300'
                    : 'border-white/10 text-white focus:border-emerald-500'
                }`}
              />
              <div className="flex items-center justify-between text-[10px] mt-1 text-slate-400">
                <span>Saída: {kmSaidaOriginal.toLocaleString('pt-BR')} km</span>
                <span className={kmDelta < 0 ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                  {kmDelta < 0 ? `⚠️ Menor que saída (${kmDelta} km)` : `+${kmDelta} km rodados`}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1 flex items-center gap-1.5">
                <Calendar size={13} className="text-slate-400" />
                <span>Data de Retorno ao Pátio *</span>
              </label>
              <input
                type="date"
                required
                value={dataRetorno}
                onChange={(e) => setDataRetorno(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-white/10 bg-[#16171f] text-white outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Avaliação de Qualidade do Serviço */}
          <div>
            <label className="block text-slate-300 font-bold mb-1.5 flex items-center gap-1.5">
              <ThumbsUp size={13} className="text-slate-400" />
              <span>Avaliação do Serviço Realizado</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Aprovado 100%', cor: 'hover:border-emerald-500 text-emerald-300' },
                { label: 'Bom / Retoque Leve', cor: 'hover:border-amber-500 text-amber-300' },
                { label: 'Serviço Regular', cor: 'hover:border-slate-400 text-slate-300' },
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.label}
                  onClick={() => setAvaliacaoQualidade(opt.label)}
                  className={`p-2.5 rounded-xl border text-center font-bold text-[11px] transition cursor-pointer ${
                    avaliacaoQualidade === opt.label
                      ? 'bg-emerald-950/50 border-emerald-500 text-emerald-200 ring-1 ring-emerald-500'
                      : 'bg-black/30 border-white/10 text-slate-400'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custo Final / Ajuste de Despesa */}
          <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign size={16} className="text-emerald-400" />
                <span className="font-bold text-white text-xs">Custo Final do Serviço / NF</span>
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={lancarDespesaFinal}
                  onChange={(e) => setLancarDespesaFinal(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-500 focus:ring-0 bg-black/50 border-white/20"
                />
                <span className="font-bold text-xs">Registrar Despesa no Chassi</span>
              </label>
            </div>

            {lancarDespesaFinal && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-white/5 animate-fadeIn">
                <div>
                  <label className="block text-slate-400 text-[11px] font-bold mb-1">
                    Valor Pago / Nota (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required={lancarDespesaFinal}
                    value={valorFinal}
                    onChange={(e) => setValorFinal(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="Ex: 180.00"
                    className="w-full p-2 rounded-xl border border-emerald-500/30 bg-[#16171f] text-emerald-300 font-mono font-bold outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-[11px] font-bold mb-1">
                    Status do Pagamento
                  </label>
                  <select
                    value={statusPagamento}
                    onChange={(e) => setStatusPagamento(e.target.value as 'Pendente' | 'Pago')}
                    className="w-full p-2 rounded-xl border border-white/10 bg-[#16171f] text-white outline-none"
                  >
                    <option value="Pago">Pago (Liquidado)</option>
                    <option value="Pendente">Pendente (Contas a Pagar)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 text-[11px] font-bold mb-1">
                    Nº Nota Fiscal / Recibo
                  </label>
                  <input
                    type="text"
                    value={nfNumero}
                    onChange={(e) => setNfNumero(e.target.value)}
                    placeholder="Ex: NF-e 4521"
                    className="w-full p-2 rounded-xl border border-white/10 bg-[#16171f] text-white outline-none"
                  />
                </div>

                {statusPagamento === 'Pago' && (
                  <div className="sm:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-slate-400 text-[11px] font-bold mb-1">
                        Conta de Saída
                      </label>
                      <select
                        value={selectedContaBancariaId}
                        onChange={(e) => setSelectedContaBancariaId(e.target.value)}
                        className="w-full p-2 rounded-xl border border-white/10 bg-[#16171f] text-white outline-none"
                      >
                        {contasBancarias.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nome} ({formatCurrency(c.saldoAtual)})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 text-[11px] font-bold mb-1">
                        Forma de Pagamento
                      </label>
                      <select
                        value={formaPagamento}
                        onChange={(e) => setFormaPagamento(e.target.value)}
                        className="w-full p-2 rounded-xl border border-white/10 bg-[#16171f] text-white outline-none"
                      >
                        <option value="PIX">PIX</option>
                        <option value="Transferência Bancária">Transferência Bancária</option>
                        <option value="Cartão de Débito">Cartão de Débito</option>
                        <option value="Cartão de Crédito">Cartão de Crédito</option>
                        <option value="Dinheiro / Espécie">Dinheiro / Espécie</option>
                        <option value="Boleto Bancário">Boleto Bancário</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Observações */}
          <div>
            <label className="block text-slate-300 font-bold mb-1">
              Observações / Detalhes da Liberação (Opcional)
            </label>
            <textarea
              rows={2}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Ex: Veículo polido e higienizado com sucesso, pronto no showroom..."
              className="w-full p-2.5 rounded-xl border border-white/10 bg-[#16171f] text-white outline-none resize-none focus:border-emerald-500"
            />
          </div>

          {/* Feedback de Automação */}
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center gap-2 text-[11px]">
            <Sparkles size={16} className="text-emerald-400 shrink-0" />
            <span>O veículo será movido para <strong>Pronto para Pátio</strong> com status <strong>Disponível</strong> imediatamente.</span>
          </div>
        </form>

        {/* Footer */}
        <div className="bg-[#16171f] px-6 py-4 border-t border-white/10 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-slate-300 transition cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="px-6 py-2.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-2 shadow-lg shadow-emerald-950/40 cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 size={16} />
            <span>{isSubmitting ? 'Finalizando...' : 'Confirmar Retorno ao Showroom (1 Clique)'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
