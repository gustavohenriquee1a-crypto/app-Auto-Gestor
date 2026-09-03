import React, { useState, useEffect } from 'react';
import { X, Calendar, Key, User, DollarSign, Smartphone } from 'lucide-react';
import { Veiculo, ContratoLocacao } from '../types';

interface ModalNovoContratoProps {
  isOpen: boolean;
  onClose: () => void;
  veiculosDisponiveis: Veiculo[];
  defaultVeiculo?: Veiculo | null;
  onSaveContrato: (veiculoId: string, contratoData: Omit<ContratoLocacao, 'id' | 'pagamentos'>) => void;
}

export const ModalNovoContrato: React.FC<ModalNovoContratoProps> = ({
  isOpen,
  onClose,
  veiculosDisponiveis,
  defaultVeiculo,
  onSaveContrato,
}) => {
  const [selectedVeiculoId, setSelectedVeiculoId] = useState<string>('');
  const [motoristaNome, setMotoristaNome] = useState('');
  const [motoristaCpf, setMotoristaCpf] = useState('');
  const [motoristaTelefone, setMotoristaTelefone] = useState('');
  const [motoristaApp, setMotoristaApp] = useState<'Uber' | '99' | 'Indrive' | 'Misto'>('Uber');
  const [valorSemanal, setValorSemanal] = useState<number>(650);
  const [diaCobranca, setDiaCobranca] = useState<any>('Segunda-feira');
  const [caucao, setCaucao] = useState<number>(1400);
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (defaultVeiculo) {
      setSelectedVeiculoId(defaultVeiculo.id);
    } else if (veiculosDisponiveis.length > 0 && !selectedVeiculoId) {
      setSelectedVeiculoId(veiculosDisponiveis[0].id);
    }
  }, [defaultVeiculo, veiculosDisponiveis, isOpen]);

  if (!isOpen) return null;

  const currentVeiculo = veiculosDisponiveis.find((v) => v.id === selectedVeiculoId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVeiculoId || !motoristaNome || !motoristaCpf) {
      alert('Por favor, preencha o motorista, CPF e selecione o veículo.');
      return;
    }

    if (!currentVeiculo) return;

    onSaveContrato(selectedVeiculoId, {
      veiculoId: selectedVeiculoId,
      placa: currentVeiculo.placa,
      modelo: currentVeiculo.modelo,
      motoristaNome,
      motoristaCpf,
      motoristaTelefone: motoristaTelefone || '(11) 99999-9999',
      motoristaApp,
      dataInicio,
      valorSemanal: Number(valorSemanal),
      diaCobranca,
      caucao: Number(caucao),
      status: 'Ativo',
      kmInicial: currentVeiculo.kmAtual,
      kmAtual: currentVeiculo.kmAtual,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-xl max-h-[90vh] flex flex-col bg-gray-900 rounded-2xl shadow-xl overflow-hidden border border-white/10">
        <div className="bg-[#16171f] text-white p-6 flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold">
              <Key size={22} />
            </div>
            <div>
              <h3 className="font-extrabold text-lg">Novo Contrato de Locação</h3>
              <p className="text-xs text-slate-400">
                Aluguel semanal para motoristas de aplicativos (Uber, 99, etc.)
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition cursor-pointer">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-bold mb-1">Veículo Disponível para Locação *</label>
            {veiculosDisponiveis.length === 0 ? (
              <p className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs">
                Nenhum veículo com status &quot;Disponível&quot; no momento.
              </p>
            ) : (
              <select
                value={selectedVeiculoId}
                onChange={(e) => setSelectedVeiculoId(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-white/10 font-bold text-sm bg-[#16171f] text-slate-200 outline-none focus:border-blue-500"
              >
                {veiculosDisponiveis.map((v) => (
                  <option key={v.id} value={v.id} className="bg-[#16171f] text-slate-200">
                    {v.placa} - {v.modelo} (KM: {v.kmAtual.toLocaleString()})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-bold mb-1">Nome do Motorista *</label>
              <input
                type="text"
                required
                value={motoristaNome}
                onChange={(e) => setMotoristaNome(e.target.value)}
                placeholder="Ex: João da Silva"
                className="w-full p-2.5 rounded-xl border border-white/10 font-medium bg-[#16171f] text-slate-200 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">CPF do Motorista *</label>
              <input
                type="text"
                required
                value={motoristaCpf}
                onChange={(e) => setMotoristaCpf(e.target.value)}
                placeholder="Ex: 123.456.789-00"
                className="w-full p-2.5 rounded-xl border border-white/10 font-mono bg-[#16171f] text-slate-200 outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-bold mb-1">WhatsApp / Telefone *</label>
              <input
                type="text"
                required
                value={motoristaTelefone}
                onChange={(e) => setMotoristaTelefone(e.target.value)}
                placeholder="(11) 98765-4321"
                className="w-full p-2.5 rounded-xl border border-white/10 font-medium bg-[#16171f] text-slate-200 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">Aplicativo Principal</label>
              <select
                value={motoristaApp}
                onChange={(e) => setMotoristaApp(e.target.value as any)}
                className="w-full p-2.5 rounded-xl border border-white/10 font-semibold bg-[#16171f] text-slate-200 outline-none focus:border-blue-500"
              >
                <option value="Uber" className="bg-[#16171f] text-slate-200">Uber</option>
                <option value="99" className="bg-[#16171f] text-slate-200">99 Pop</option>
                <option value="Indrive" className="bg-[#16171f] text-slate-200">InDrive</option>
                <option value="Misto" className="bg-[#16171f] text-slate-200">Misto / Outros</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-white/5">
            <div>
              <label className="block text-slate-300 font-bold mb-1">Valor Semanal (R$) *</label>
              <input
                type="number"
                required
                value={valorSemanal}
                onChange={(e) => setValorSemanal(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-white/10 font-bold text-sm bg-[#16171f] text-emerald-400 outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">Dia da Cobrança *</label>
              <select
                value={diaCobranca}
                onChange={(e) => setDiaCobranca(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-white/10 font-semibold bg-[#16171f] text-slate-200 outline-none focus:border-blue-500"
              >
                <option value="Segunda-feira" className="bg-[#16171f] text-slate-200">Segunda-feira</option>
                <option value="Terça-feira" className="bg-[#16171f] text-slate-200">Terça-feira</option>
                <option value="Quarta-feira" className="bg-[#16171f] text-slate-200">Quarta-feira</option>
                <option value="Quinta-feira" className="bg-[#16171f] text-slate-200">Quinta-feira</option>
                <option value="Sexta-feira" className="bg-[#16171f] text-slate-200">Sexta-feira</option>
                <option value="Sábado" className="bg-[#16171f] text-slate-200">Sábado</option>
                <option value="Domingo" className="bg-[#16171f] text-slate-200">Domingo</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">Caução de Garantia (R$)</label>
              <input
                type="number"
                value={caucao}
                onChange={(e) => setCaucao(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-white/10 font-bold text-sm bg-[#16171f] text-purple-400 outline-none focus:border-purple-500"
              />
            </div>
          </div>
          </div>

          <div className="p-4 sm:p-5 border-t border-white/10 bg-[#16171f] flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={veiculosDisponiveis.length === 0}
              className="px-6 py-2.5 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/40 disabled:opacity-50 transition cursor-pointer"
            >
              Ativar Contrato de Locação
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
