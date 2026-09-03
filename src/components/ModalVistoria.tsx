import React, { useState } from 'react';
import { 
  X, 
  ClipboardCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Car, 
  Fuel, 
  Gauge, 
  FileText, 
  Wrench, 
  Printer, 
  Sparkles,
  ShieldCheck,
  RotateCcw,
  Check
} from 'lucide-react';
import { Veiculo, LaudoVistoriaEntrada, ItemVistoria, Usuario } from '../types';
import { formatKm, formatDate } from '../utils/formatters';

interface ModalVistoriaProps {
  isOpen: boolean;
  onClose: () => void;
  veiculo: Veiculo | null;
  currentUser?: Usuario | null;
  onSalvarVistoria: (laudo: LaudoVistoriaEntrada) => void;
}

const ITENS_VISTORIA_PADRAO: Array<{ id: string; categoria: ItemVistoria['categoria']; nome: string }> = [
  { id: '1', categoria: 'Pintura & Lataria', nome: 'Pintura Geral / Riscos e Amassados' },
  { id: '2', categoria: 'Pintura & Lataria', nome: 'Para-choques Dianteiro e Traseiro' },
  { id: '3', categoria: 'Pneus & Rodas', nome: 'Pneus Dianteiros e Traseiros (Sulco/Desgaste)' },
  { id: '4', categoria: 'Pneus & Rodas', nome: 'Estepe, Macaco e Chave de Roda' },
  { id: '5', categoria: 'Motor & Mecânica', nome: 'Nível de Óleo, Arrefecimento e Fluidos' },
  { id: '6', categoria: 'Motor & Mecânica', nome: 'Funcionamento do Motor / Ruídos e Suspensão' },
  { id: '7', categoria: 'Interior & Tapeçaria', nome: 'Estofamento dos Bancos e Higienização' },
  { id: '8', categoria: 'Interior & Tapeçaria', nome: 'Painel, Ar-Condicionado e Multimídia' },
  { id: '9', categoria: 'Elétrica & Vidros', nome: 'Faróis, Lanternas e Setas' },
  { id: '10', categoria: 'Elétrica & Vidros', nome: 'Vidros Elétricos, Travas e Parabrisa' },
  { id: '11', categoria: 'Documentação & Chaves', nome: 'Manual do Proprietário e Chave Reserva' },
  { id: '12', categoria: 'Documentação & Chaves', nome: 'Documento (CRLV) e Decalque Chassi' },
];

export const ModalVistoria: React.FC<ModalVistoriaProps> = ({
  isOpen,
  onClose,
  veiculo,
  currentUser,
  onSalvarVistoria,
}) => {
  const [dataVistoria, setDataVistoria] = useState(() => new Date().toISOString().split('T')[0]);
  const [responsavelNome, setResponsavelNome] = useState(currentUser?.displayName || 'Vistoriador Técnico');
  const [kmVistoria, setKmVistoria] = useState<number>(veiculo?.kmAtual || 0);
  const [nivelCombustivel, setNivelCombustivel] = useState<LaudoVistoriaEntrada['nivelCombustivel']>('1/2');
  const [observacoesGerais, setObservacoesGerais] = useState('');
  
  // Checklist State Map
  const [checklist, setChecklist] = useState<Record<string, { status: 'ok' | 'avaria'; observacao: string }>>(() => {
    const initial: Record<string, { status: 'ok' | 'avaria'; observacao: string }> = {};
    ITENS_VISTORIA_PADRAO.forEach((item) => {
      initial[item.id] = { status: 'ok', observacao: '' };
    });
    return initial;
  });

  const [statusGeral, setStatusGeral] = useState<LaudoVistoriaEntrada['statusGeral']>('Aprovado');

  if (!isOpen || !veiculo) return null;

  const handleToggleItem = (itemId: string, status: 'ok' | 'avaria') => {
    setChecklist((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        status,
      },
    }));

    // Auto calculate suggested statusGeral
    setTimeout(() => {
      setChecklist((current) => {
        const items = Object.values(current) as Array<{ status: 'ok' | 'avaria'; observacao: string }>;
        const hasAvarias = items.some((i) => i.status === 'avaria');
        const countAvarias = items.filter((i) => i.status === 'avaria').length;
        if (countAvarias >= 3) {
          setStatusGeral('Reprovado / Requer Oficina');
        } else if (hasAvarias) {
          setStatusGeral('Aprovado com Apontamentos');
        } else {
          setStatusGeral('Aprovado');
        }
        return current;
      });
    }, 50);
  };

  const handleUpdateItemObs = (itemId: string, obs: string) => {
    setChecklist((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        observacao: obs,
      },
    }));
  };

  const handleFinalizarLaudo = (e: React.FormEvent) => {
    e.preventDefault();

    const itensMapeados: ItemVistoria[] = ITENS_VISTORIA_PADRAO.map((item) => ({
      id: item.id,
      categoria: item.categoria,
      nome: item.nome,
      status: checklist[item.id]?.status || 'ok',
      observacao: checklist[item.id]?.observacao || '',
    }));

    const avariasIdentificadas = itensMapeados
      .filter((i) => i.status === 'avaria')
      .map((i) => `${i.nome}${i.observacao ? ` (${i.observacao})` : ''}`);

    const novoLaudo: LaudoVistoriaEntrada = {
      id: `vist_${Date.now()}`,
      veiculoId: veiculo.id,
      placa: veiculo.placa,
      modelo: veiculo.modelo,
      chassi: veiculo.chassi,
      dataVistoria,
      responsavelNome,
      kmVistoria: Number(kmVistoria) || veiculo.kmAtual,
      nivelCombustivel,
      itens: itensMapeados,
      observacoesGerais,
      statusGeral,
      avariasIdentificadas,
      createdAt: new Date().toISOString(),
    };

    onSalvarVistoria(novoLaudo);
    onClose();
  };

  const totalAvarias = (Object.values(checklist) as Array<{ status: 'ok' | 'avaria'; observacao: string }>).filter((i) => i.status === 'avaria').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col bg-gray-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 bg-[#16171f] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <ClipboardCheck size={22} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Vistoria Digital de Entrada & Checklist Rápido
              </h2>
              <p className="text-xs text-slate-400">
                {veiculo.modelo} ({veiculo.ano}) • Placa <span className="font-mono text-emerald-300 font-bold">{veiculo.placa}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleFinalizarLaudo} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-xs">
            {/* Parameters Row */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Data da Vistoria</label>
                <input
                  type="date"
                  required
                  value={dataVistoria}
                  onChange={(e) => setDataVistoria(e.target.value)}
                  className="w-full p-2 bg-black/40 border border-white/10 rounded-lg text-white outline-none focus:border-emerald-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">KM na Entrada</label>
                <input
                  type="number"
                  required
                  value={kmVistoria}
                  onChange={(e) => setKmVistoria(Number(e.target.value))}
                  className="w-full p-2 bg-black/40 border border-white/10 rounded-lg text-white font-mono outline-none focus:border-emerald-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Nível de Combustível</label>
                <select
                  value={nivelCombustivel}
                  onChange={(e) => setNivelCombustivel(e.target.value as any)}
                  className="w-full p-2 bg-black/40 border border-white/10 rounded-lg text-white outline-none focus:border-emerald-500 text-xs font-semibold"
                >
                  <option value="Reserva">Reserva ⛽</option>
                  <option value="1/4">1/4 de Tanque</option>
                  <option value="1/2">1/2 (Meio Tanque)</option>
                  <option value="3/4">3/4 de Tanque</option>
                  <option value="Cheio">Tanque Cheio 🚀</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Vistoriador</label>
                <input
                  type="text"
                  required
                  value={responsavelNome}
                  onChange={(e) => setResponsavelNome(e.target.value)}
                  className="w-full p-2 bg-black/40 border border-white/10 rounded-lg text-white outline-none focus:border-emerald-500 text-xs"
                />
              </div>
            </div>

            {/* Checklist Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="font-bold text-slate-200 uppercase tracking-wider text-xs">
                  Itens Inspecionados no Veículo ({ITENS_VISTORIA_PADRAO.length} itens)
                </span>
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  totalAvarias > 0 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300'
                }`}>
                  {totalAvarias === 0 ? '✓ 100% Conforme' : `${totalAvarias} apontamento(s)`}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {ITENS_VISTORIA_PADRAO.map((item) => {
                  const state = checklist[item.id] || { status: 'ok', observacao: '' };
                  const isOk = state.status === 'ok';

                  return (
                    <div 
                      key={item.id}
                      className={`p-3 rounded-xl border transition ${
                        isOk 
                          ? 'bg-black/30 border-white/5' 
                          : 'bg-amber-950/20 border-amber-500/40 ring-1 ring-amber-500/20'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                            {item.categoria}
                          </span>
                          <span className="font-bold text-slate-200 text-xs">
                            {item.nome}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleItem(item.id, 'ok')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                              isOk 
                                ? 'bg-emerald-600 text-white shadow' 
                                : 'bg-white/5 text-slate-400 hover:text-white'
                            }`}
                          >
                            <Check size={13} /> Ok
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleItem(item.id, 'avaria')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                              !isOk 
                                ? 'bg-amber-600 text-white shadow' 
                                : 'bg-white/5 text-slate-400 hover:text-amber-300'
                            }`}
                          >
                            <AlertTriangle size={13} /> Avaria
                          </button>
                        </div>
                      </div>

                      {/* Observation Field for Avaria */}
                      {!isOk && (
                        <div className="mt-2 pt-2 border-t border-amber-500/20 animate-fadeIn">
                          <input
                            type="text"
                            placeholder="Descreva a avaria ou reparo necessário..."
                            value={state.observacao}
                            onChange={(e) => handleUpdateItemObs(item.id, e.target.value)}
                            className="w-full p-1.5 bg-black/50 border border-amber-500/30 rounded-lg text-amber-200 text-xs outline-none focus:border-amber-400 font-medium placeholder:text-amber-500/50"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* General Conclusion and Observations */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/5">
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Parecer Geral do Laudo *
                </label>
                <select
                  value={statusGeral}
                  onChange={(e) => setStatusGeral(e.target.value as any)}
                  className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl text-white outline-none focus:border-emerald-500 text-xs font-bold"
                >
                  <option value="Aprovado">✅ Aprovado (Liberado para Pátio / Showroom)</option>
                  <option value="Aprovado com Apontamentos">⚠️ Aprovado com Apontamentos / Detalhes</option>
                  <option value="Reprovado / Requer Oficina">❌ Reprovado (Encaminhar para Oficina / Funilaria)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Observações Finais do Vistoriador
                </label>
                <textarea
                  rows={2}
                  value={observacoesGerais}
                  onChange={(e) => setObservacoesGerais(e.target.value)}
                  placeholder="Ex: Veículo bem conservado, pequeno retoque sugerido no para-lama direito..."
                  className="w-full p-2 bg-black/40 border border-white/10 rounded-xl text-white text-xs outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 sm:p-5 border-t border-white/10 bg-[#16171f] flex items-center justify-between shrink-0">
            <span className="text-xs text-slate-400">
              O laudo ficará registrado no Dossiê 360º do chassi e histórico do veículo.
            </span>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-950/50 transition cursor-pointer"
              >
                <CheckCircle2 size={16} />
                <span>Finalizar Laudo</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
