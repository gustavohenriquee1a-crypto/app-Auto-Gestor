import React, { useState } from 'react';
import { X, Gauge, Calendar, AlertTriangle, CheckCircle2, TrendingUp, Car } from 'lucide-react';
import { Veiculo, ContratoLocacao, RegistroKmDiario } from '../types';
import { formatKm, calcularStatusManutencao, getItensManutencaoPadrao } from '../utils/formatters';

interface ModalLancamentoKmDiarioProps {
  isOpen: boolean;
  onClose: () => void;
  veiculo: Veiculo;
  contrato: ContratoLocacao;
  onSalvarKm: (veiculoId: string, contratoId: string, novoKm: number, registro: RegistroKmDiario) => void;
}

export const ModalLancamentoKmDiario: React.FC<ModalLancamentoKmDiarioProps> = ({
  isOpen,
  onClose,
  veiculo,
  contrato,
  onSalvarKm,
}) => {
  const kmAtualContrato = contrato.kmAtual || veiculo.kmAtual || 0;
  const [dataRegistro, setDataRegistro] = useState(new Date().toISOString().split('T')[0]);
  const [novoKm, setNovoKm] = useState<number>(kmAtualContrato);
  const [observacao, setObservacao] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  if (!isOpen) return null;

  const diferencaKm = Math.max(0, novoKm - kmAtualContrato);
  const itensManutencao = contrato.itensManutencao && contrato.itensManutencao.length > 0 
    ? contrato.itensManutencao 
    : getItensManutencaoPadrao(novoKm);

  // Analisar manutenções com o novo KM
  const alertasPreventivos = itensManutencao
    .map((item) => ({
      item,
      status: calcularStatusManutencao(item, novoKm),
    }))
    .filter((res) => res.status.isVencido || res.status.isProximo);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (novoKm < kmAtualContrato) {
      setErro(`A quilometragem informada (${formatKm(novoKm)}) não pode ser inferior ao odômetro atual (${formatKm(kmAtualContrato)}).`);
      return;
    }

    const registro: RegistroKmDiario = {
      id: `km-${Date.now()}`,
      data: dataRegistro,
      kmRegistrado: Number(novoKm),
      kmAnterior: kmAtualContrato,
      kmRodadoNoDia: diferencaKm,
      observacao: observacao.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    onSalvarKm(veiculo.id, contrato.id, Number(novoKm), registro);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg max-h-[90vh] flex flex-col bg-gray-900 rounded-2xl shadow-xl overflow-hidden border border-white/10">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-[#16171f] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Gauge size={22} />
            </div>
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                Atualização Diária de KM
              </h2>
              <p className="text-xs text-slate-400">
                {veiculo.modelo} • <span className="font-mono text-blue-400 font-bold">{veiculo.placa}</span> • {contrato.motoristaNome}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {erro && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0 text-rose-400" />
              {erro}
            </div>
          )}

          {/* Current vs New Meter */}
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-[#16171f] border border-white/5">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Odômetro Anterior</span>
              <p className="text-base font-black text-slate-300 font-mono mt-0.5">
                {formatKm(kmAtualContrato)}
              </p>
              <span className="text-[10px] text-slate-500">Última leitura registrada</span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-blue-400 flex items-center gap-1">
                <TrendingUp size={12} /> Rodado no Período
              </span>
              <p className="text-base font-black text-emerald-400 font-mono mt-0.5">
                +{formatKm(diferencaKm)}
              </p>
              <span className="text-[10px] text-slate-500">Incremento de rodagem</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-300 font-bold mb-1">Data da Leitura *</label>
              <div className="relative">
                <Calendar size={14} className="absolute left-3 top-3 text-slate-500" />
                <input
                  type="date"
                  required
                  value={dataRegistro}
                  onChange={(e) => setDataRegistro(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-white/10 bg-[#16171f] text-white text-xs font-medium outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-blue-400 font-bold mb-1">Novo Odômetro (KM Atual) *</label>
              <div className="relative">
                <Gauge size={14} className="absolute left-3 top-3 text-blue-400" />
                <input
                  type="number"
                  required
                  min={kmAtualContrato}
                  step="1"
                  value={novoKm}
                  onChange={(e) => {
                    setNovoKm(Number(e.target.value));
                    setErro(null);
                  }}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-blue-500/40 bg-[#16171f] text-white text-sm font-mono font-black outline-none focus:border-blue-500"
                  placeholder="Ex: 85400"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-300 font-bold mb-1">Observações do Motorista / Rota</label>
            <input
              type="text"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Ex: Rodou bastante no aeroporto / sem avarias"
              className="w-full p-2.5 rounded-xl border border-white/10 bg-[#16171f] text-white text-xs outline-none focus:border-blue-500"
            />
          </div>

          {/* Real-time Predictive Maintenance Alert Previews */}
          {alertasPreventivos.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-2">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                <AlertTriangle size={15} />
                <span>Atenção: Impacto nas Manutenções Preventivas</span>
              </div>
              <div className="space-y-1.5">
                {alertasPreventivos.map(({ item, status }) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-black/30 text-xs border border-white/5"
                  >
                    <span className="font-semibold text-slate-200">{item.nome}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${status.badgeClass}`}>
                      {status.statusText}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Info */}
          <div className="flex items-center gap-2 text-[11px] text-slate-400 bg-white/5 p-3 rounded-xl">
            <CheckCircle2 size={15} className="text-blue-400 shrink-0" />
            <span>
              Ao salvar, o odômetro do veículo e do contrato ativo serão sincronizados e o histórico ficará gravado no extrato do motorista.
            </span>
          </div>
          </div>

          {/* Fixed Footer Actions */}
          <div className="p-4 sm:p-5 border-t border-white/10 bg-[#16171f] flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition shadow-lg shadow-blue-600/30 flex items-center gap-2 cursor-pointer"
            >
              <Gauge size={15} />
              Confirmar Leitura Diária
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
