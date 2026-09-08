import React, { useState } from 'react';
import { X, Clock, ShieldAlert, Calendar, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { ContratoLocacao, Veiculo } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';

interface ModalCarenciaDevolucaoProps {
  isOpen: boolean;
  onClose: () => void;
  contrato: ContratoLocacao;
  veiculo: Veiculo;
  onSalvarCarencia: (
    veiculoId: string,
    contratoId: string,
    carencia: {
      emCarencia: boolean;
      dataInicio: string;
      dataFimPrevista: string;
      diasCarencia: number;
      motivo?: string;
    },
    devolverCarroParaPatio: boolean
  ) => Promise<void>;
  onEncerrarDefinitivo: (veiculoId: string) => Promise<void>;
}

export const ModalCarenciaDevolucao: React.FC<ModalCarenciaDevolucaoProps> = ({
  isOpen,
  onClose,
  contrato,
  veiculo,
  onSalvarCarencia,
  onEncerrarDefinitivo,
}) => {
  const estaEmCarencia = contrato.carenciaDevolucao?.emCarencia || contrato.status === 'Em Carência';

  const [diasCarencia, setDiasCarencia] = useState<number>(contrato.carenciaDevolucao?.diasCarencia || 30);
  const [dataInicio, setDataInicio] = useState<string>(
    contrato.carenciaDevolucao?.dataInicio || new Date().toISOString().split('T')[0]
  );
  const [devolverCarroParaPatio, setDevolverCarroParaPatio] = useState<boolean>(true);
  const [motivo, setMotivo] = useState<string>(
    contrato.carenciaDevolucao?.motivo || 'Aguardando notificações de multas de trânsito dos órgãos competentes e fechamento de débitos'
  );
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  // Calcular data fim estimada
  const calcularDataFim = (inicioStr: string, dias: number) => {
    try {
      const d = new Date(inicioStr);
      d.setDate(d.getDate() + dias);
      return d.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  const dataFimCalculada = calcularDataFim(dataInicio, diasCarencia);

  const handleConfirmar = async () => {
    setIsSaving(true);
    try {
      await onSalvarCarencia(
        veiculo.id,
        contrato.id,
        {
          emCarencia: true,
          dataInicio,
          dataFimPrevista: dataFimCalculada,
          diasCarencia,
          motivo,
        },
        devolverCarroParaPatio
      );
      onClose();
    } catch (err) {
      console.error('Erro ao salvar carência:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEncerrarAgora = async () => {
    if (window.confirm(`Deseja realmente ENCERRAR DEFINITIVAMENTE a locação de ${contrato.motoristaNome} no veículo ${veiculo.placa}? As garantias residuais serão concluídas.`)) {
      setIsSaving(true);
      try {
        await onEncerrarDefinitivo(veiculo.id);
        onClose();
      } catch (err) {
        console.error('Erro ao encerrar locação:', err);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleCancelarCarencia = async () => {
    if (window.confirm(`Deseja cancelar o aviso de carência e reativar o contrato de locação normalmente?`)) {
      setIsSaving(true);
      try {
        await onSalvarCarencia(
          veiculo.id,
          contrato.id,
          {
            emCarencia: false,
            dataInicio: '',
            dataFimPrevista: '',
            diasCarencia: 0,
            motivo: 'Carência cancelada pelo gestor',
          },
          false
        );
        onClose();
      } catch (err) {
        console.error('Erro ao cancelar carência:', err);
      } finally {
        setIsSaving(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg bg-[#111116] rounded-2xl shadow-2xl overflow-hidden border border-white/10 flex flex-col">
        {/* Header */}
        <div className="bg-[#181924] p-5 flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
              <Clock size={20} />
            </div>
            <div>
              <h3 className="font-black text-sm text-white flex items-center gap-2">
                Período de Carência (Aviso de 30 Dias)
              </h3>
              <p className="text-xs text-slate-400">
                {veiculo.modelo} • <span className="font-mono text-blue-400 font-bold">{veiculo.placa}</span> • {contrato.motoristaNome}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs">
          {/* Informational Callout */}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 space-y-2">
            <div className="flex items-center gap-2 font-bold text-xs">
              <ShieldAlert size={16} className="text-amber-400 shrink-0" />
              <span>Para que serve o Período de Carência?</span>
            </div>
            <p className="text-[11px] text-amber-200/90 leading-relaxed">
              Órgãos de trânsito (DETRAN, PRF, Prefeituras) podem demorar <strong>até 30 dias</strong> para emitir notificações de autuação de multas e cobranças de pedágios tomadas pelo motorista.
              Ao ativar a carência, a caução de <strong>{formatCurrency(contrato.caucaoSaldoAtual || contrato.caucao)}</strong> fica retida para cobrir esses custos antes da liberação final ao motorista.
            </p>
          </div>

          {estaEmCarencia ? (
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs flex items-center gap-2 text-white">
                  <CheckCircle2 size={16} className="text-blue-400" /> Contrato atualmente em Carência
                </span>
                <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-blue-500/30 text-blue-300 font-bold">
                  {contrato.carenciaDevolucao?.diasCarencia || 30} dias
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Início: <strong>{formatDate(contrato.carenciaDevolucao?.dataInicio || '')}</strong> • Término Previsto: <strong>{formatDate(contrato.carenciaDevolucao?.dataFimPrevista || '')}</strong>
              </p>
              <div className="flex gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={handleEncerrarAgora}
                  disabled={isSaving}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition text-center cursor-pointer disabled:opacity-50"
                >
                  Encerrar Definitivamente
                </button>
                <button
                  type="button"
                  onClick={handleCancelarCarencia}
                  disabled={isSaving}
                  className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 font-bold transition text-center cursor-pointer disabled:opacity-50"
                >
                  Cancelar Carência
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Prazo de Carência (Dias)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={diasCarencia}
                    onChange={(e) => setDiasCarencia(parseInt(e.target.value) || 30)}
                    className="w-full bg-[#161722] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Padrão: 30 dias de aviso</span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Data de Início da Carência
                  </label>
                  <input
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="w-full bg-[#161722] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Data Prevista para Fechamento da Caução:</span>
                <strong className="font-mono text-amber-400 text-xs">
                  {formatDate(dataFimCalculada)}
                </strong>
              </div>

              {/* Status do Veículo */}
              <div className="space-y-2 pt-1">
                <label className="block text-[11px] font-bold text-slate-300">
                  Situação do Veículo ({veiculo.placa}):
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2.5 p-3 rounded-xl border border-white/10 bg-white/[0.02] cursor-pointer hover:bg-white/5 transition">
                    <input
                      type="radio"
                      checked={devolverCarroParaPatio}
                      onChange={() => setDevolverCarroParaPatio(true)}
                      className="accent-amber-500"
                    />
                    <div className="text-left">
                      <strong className="block text-white text-[11px]">Carro Devolvido ao Pátio (Liberar Carro para 'Disponível')</strong>
                      <span className="text-[10px] text-slate-400">O motorista já entregou as chaves; apenas a caução e eventuais multas aguardam o prazo.</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-3 rounded-xl border border-white/10 bg-white/[0.02] cursor-pointer hover:bg-white/5 transition">
                    <input
                      type="radio"
                      checked={!devolverCarroParaPatio}
                      onChange={() => setDevolverCarroParaPatio(false)}
                      className="accent-amber-500"
                    />
                    <div className="text-left">
                      <strong className="block text-white text-[11px]">Carro Permanece Alugado durante o Aviso Prévio</strong>
                      <span className="text-[10px] text-slate-400">O motorista continua rodando até o término dos 30 dias de aviso prévio.</span>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Motivo / Observações
                </label>
                <input
                  type="text"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  className="w-full bg-[#161722] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold transition text-center cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmar}
                  disabled={isSaving}
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-600/20 disabled:opacity-50"
                >
                  <Clock size={16} /> {isSaving ? 'Salvando...' : 'Ativar Carência (30 dias)'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
