import React, { useState } from 'react';
import { X, Wrench, CheckCircle2 } from 'lucide-react';
import { Veiculo } from '../types';

interface ModalRegistrarRevisaoProps {
  isOpen: boolean;
  onClose: () => void;
  veiculo: Veiculo | null;
  onConfirmarRevisao: (veiculoId: string, novaKmRevisao: number, custoRevisao: number, oficina: string) => void;
}

export const ModalRegistrarRevisao: React.FC<ModalRegistrarRevisaoProps> = ({
  isOpen,
  onClose,
  veiculo,
  onConfirmarRevisao,
}) => {
  const [novoKm, setNovoKm] = useState<number>(() => veiculo?.kmAtual || 45000);
  const [custoRevisao, setCustoRevisao] = useState<number>(650);
  const [oficina, setOficina] = useState('Oficina MasterTech');

  if (!isOpen || !veiculo) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirmarRevisao(veiculo.id, Number(novoKm), Number(custoRevisao), oficina);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md max-h-[90vh] flex flex-col bg-gray-900 rounded-2xl shadow-xl overflow-hidden border border-white/10">
        <div className="bg-[#16171f] text-white p-5 flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold">
              <Wrench size={22} />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">Registrar Revisão Realizada</h3>
              <p className="text-xs text-slate-400">Atualiza o ciclo de 10.000 KM</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition cursor-pointer">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs bg-[#0a0a0c]">
          <div className="p-3 bg-[#16171f] rounded-xl border border-white/5">
            <p className="font-bold text-white">{veiculo.modelo} ({veiculo.placa})</p>
            <p className="text-[11px] text-slate-400 font-mono">Chassi: {veiculo.chassi}</p>
          </div>

          <div>
            <label className="block text-slate-300 font-bold mb-1">
              KM Realizado na Revisão *
            </label>
            <input
              type="number"
              required
              value={novoKm}
              onChange={(e) => setNovoKm(Number(e.target.value))}
              className="w-full p-2.5 rounded-xl border border-white/10 font-black text-sm bg-[#16171f] text-white outline-none focus:border-blue-500"
            />
            <span className="text-[10px] text-slate-400">
              O próximo alerta de revisão ocorrerá aos {(novoKm + 10000).toLocaleString('pt-BR')} KM.
            </span>
          </div>

          <div>
            <label className="block text-slate-300 font-bold mb-1">
              Custo Total da Revisão (R$)
            </label>
            <input
              type="number"
              required
              value={custoRevisao}
              onChange={(e) => setCustoRevisao(Number(e.target.value))}
              className="w-full p-2.5 rounded-xl border border-white/10 font-bold text-sm bg-[#16171f] text-white outline-none focus:border-blue-500"
            />
            <span className="text-[10px] text-slate-400">
              Este valor será adicionado automaticamente como despesa de manutenção ao chassi.
            </span>
          </div>

          <div>
            <label className="block text-slate-300 font-bold mb-1">
              Oficina / Prestador de Serviço
            </label>
            <input
              type="text"
              required
              value={oficina}
              onChange={(e) => setOficina(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-white/10 font-medium bg-[#16171f] text-slate-200 outline-none focus:border-blue-500"
            />
          </div>
          </div>

          <div className="p-4 sm:p-5 border-t border-white/10 bg-[#16171f] flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-900/30 transition cursor-pointer"
            >
              Confirmar Revisão
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
