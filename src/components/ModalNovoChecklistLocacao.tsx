import React, { useState } from 'react';
import { 
  X, 
  ClipboardCheck, 
  Gauge, 
  Fuel, 
  ShieldCheck, 
  AlertTriangle, 
  Plus, 
  Trash2, 
  Check, 
  UserCheck,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Zap,
  ArrowDownRight
} from 'lucide-react';
import { Veiculo, ContratoLocacao, ChecklistLocacao, DebitoMotorista, TipoDebitoMotorista } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';

interface ModalNovoChecklistLocacaoProps {
  isOpen: boolean;
  onClose: () => void;
  contratosAtivos: { veiculo: Veiculo; contrato: ContratoLocacao }[];
  contratoSelecionadoPreviamente?: { veiculo: Veiculo; contrato: ContratoLocacao };
  checklistsExistentes?: ChecklistLocacao[];
  onSalvarChecklist: (checklist: ChecklistLocacao) => void;
  onGerarDebito?: (
    veiculoId: string,
    contratoId: string,
    novoDebito: DebitoMotorista,
    descontarCaucao: boolean,
    valorDescontarCaucao: number
  ) => void;
}

const FUEL_LEVELS: Record<string, number> = {
  'Reserva': 0,
  '1/4': 1,
  '1/2': 2,
  '3/4': 3,
  'Cheio': 4
};

export const ModalNovoChecklistLocacao: React.FC<ModalNovoChecklistLocacaoProps> = ({
  isOpen,
  onClose,
  contratosAtivos,
  contratoSelecionadoPreviamente,
  checklistsExistentes,
  onSalvarChecklist,
  onGerarDebito,
}) => {
  const initialTarget = contratoSelecionadoPreviamente || contratosAtivos[0] || null;

  const [selectedContratoId, setSelectedContratoId] = useState<string>(
    initialTarget?.contrato.id || ''
  );
  const [tipo, setTipo] = useState<'Retirada' | 'Devolucao'>('Retirada');
  const [data, setData] = useState<string>(new Date().toISOString().split('T')[0]);
  const [km, setKm] = useState<number>(initialTarget?.veiculo.kmAtual || 0);
  const [nivelCombustivel, setNivelCombustivel] = useState<'Reserva' | '1/4' | '1/2' | '3/4' | 'Cheio'>('Cheio');
  const [estadoPneus, setEstadoPneus] = useState<'Novos' | 'Bons' | 'Meia-vida' | 'Desgastados' | 'Troca Urgente'>('Bons');
  
  // Itens de segurança
  const [estepe, setEstepe] = useState(true);
  const [macacoChaveRoda, setMacacoChaveRoda] = useState(true);
  const [documentoVeiculo, setDocumentoVeiculo] = useState(true);
  const [trianguloSinalizacao, setTrianguloSinalizacao] = useState(true);
  
  const [limpeza, setLimpeza] = useState<'Impecável' | 'Padrão' | 'Sujo' | 'Requer Higienização'>('Padrão');
  const [responsavelVistoria, setResponsavelVistoria] = useState('Vistoriador Auto-Gestor');
  const [observacoes, setObservacoes] = useState('');
  const [assinaturaMotorista, setAssinaturaMotorista] = useState(true);

  // Avarias
  const [avarias, setAvarias] = useState<Array<{ item: string; descricao: string; cobrarDoMotorista?: boolean; valorAvaria?: number }>>([]);
  const [novaAvariaItem, setNovaAvariaItem] = useState('');
  const [novaAvariaDesc, setNovaAvariaDesc] = useState('');
  const [novaAvariaValor, setNovaAvariaValor] = useState<number>(0);
  const [novaAvariaCobrar, setNovaAvariaCobrar] = useState(false);

  // Controle de débitos rápidos gerados na vistoria
  const [debitosGerados, setDebitosGerados] = useState<string[]>([]);

  if (!isOpen) return null;

  const currentPair = contratosAtivos.find(c => c.contrato.id === selectedContratoId) || initialTarget;

  // Localizar vistoria inicial (retirada) para comparação lado a lado
  const vistoriaInicial = checklistsExistentes?.find(
    c => c.contratoId === selectedContratoId && c.tipo === 'Retirada'
  ) || currentPair?.contrato.vistoriaRetirada;

  // Cálculos de divergência na devolução
  const fuelRankRetirada = vistoriaInicial ? (FUEL_LEVELS[vistoriaInicial.nivelCombustivel] ?? 4) : 4;
  const fuelRankDevolucao = FUEL_LEVELS[nivelCombustivel] ?? 4;
  const fuelDiffSteps = fuelRankRetirada - fuelRankDevolucao;
  const temMenosCombustivel = fuelDiffSteps > 0;
  const litrosFaltantes = temMenosCombustivel ? Number(((fuelDiffSteps / 4) * 50).toFixed(1)) : 0;
  const valorCombustivelFaltante = Math.round(litrosFaltantes * 6.20);

  const requerTaxaLimpeza = limpeza === 'Sujo' || limpeza === 'Requer Higienização';
  const valorTaxaHigienizacao = limpeza === 'Requer Higienização' ? 180 : 80;

  const handleGerarDebitoRapido = (
    tipoDebito: TipoDebitoMotorista,
    descricaoDebito: string,
    valorDebito: number,
    debitoKey: string
  ) => {
    if (!currentPair || !onGerarDebito) return;

    const novoDebito: DebitoMotorista = {
      id: `deb-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      contratoId: currentPair.contrato.id,
      veiculoId: currentPair.veiculo.id,
      tipo: tipoDebito,
      descricao: descricaoDebito,
      valorTotal: valorDebito,
      dataOcorrencia: data,
      status: 'Descontado do Caução',
      formaQuitacao: 'Caução',
      valorPago: valorDebito,
      valorPendente: 0,
      observacoes: 'Lançado via Vistoria de Devolução (Conferência de Laudo)',
    };

    onGerarDebito(
      currentPair.veiculo.id,
      currentPair.contrato.id,
      novoDebito,
      true,
      valorDebito
    );

    setDebitosGerados(prev => [...prev, debitoKey]);
  };

  const handleAddAvaria = () => {
    if (!novaAvariaItem.trim() || !novaAvariaDesc.trim()) return;
    setAvarias(prev => [
      ...prev,
      {
        item: novaAvariaItem.trim(),
        descricao: novaAvariaDesc.trim(),
        cobrarDoMotorista: novaAvariaCobrar,
        valorAvaria: novaAvariaCobrar ? Number(novaAvariaValor) : 0,
      }
    ]);
    setNovaAvariaItem('');
    setNovaAvariaDesc('');
    setNovaAvariaValor(0);
    setNovaAvariaCobrar(false);
  };

  const handleRemoveAvaria = (index: number) => {
    setAvarias(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPair) return;

    const novoChecklist: ChecklistLocacao = {
      id: `chk-${Date.now()}`,
      contratoId: currentPair.contrato.id,
      veiculoId: currentPair.veiculo.id,
      placa: currentPair.veiculo.placa,
      modelo: currentPair.veiculo.modelo,
      motoristaNome: currentPair.contrato.motoristaNome,
      tipo,
      data,
      km: Number(km) || currentPair.veiculo.kmAtual,
      nivelCombustivel,
      estadoPneus,
      estepe,
      macacoChaveRoda,
      documentoVeiculo,
      trianguloSinalizacao,
      limpeza,
      avarias,
      observacoes: observacoes.trim() || undefined,
      responsavelVistoria: responsavelVistoria.trim() || 'Equipe de Pátio',
      assinaturaMotoristaConcordou: assinaturaMotorista,
      createdAt: new Date().toISOString(),
      fotos: [
        'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=400',
        'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=400'
      ]
    };

    onSalvarChecklist(novoChecklist);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#111116] border border-white/10 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-[#16171f]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <ClipboardCheck size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Nova Vistoria / Laudo de Checklist</h3>
              <p className="text-xs text-slate-400">
                Registro detalhado de saída ou devolução de veículo da frota de locação
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-white/5 transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Tipo e Contrato */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Tipo de Vistoria
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTipo('Retirada')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold transition border cursor-pointer ${
                    tipo === 'Retirada'
                      ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-600/20'
                      : 'bg-[#16171f] border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  🟢 Retirada / Saída
                </button>
                <button
                  type="button"
                  onClick={() => setTipo('Devolucao')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold transition border cursor-pointer ${
                    tipo === 'Devolucao'
                      ? 'bg-amber-600 border-amber-500 text-white shadow-md shadow-amber-600/20'
                      : 'bg-[#16171f] border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  🔄 Devolução / Retorno
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Contrato & Veículo
              </label>
              <select
                value={selectedContratoId}
                onChange={(e) => {
                  setSelectedContratoId(e.target.value);
                  const p = contratosAtivos.find(c => c.contrato.id === e.target.value);
                  if (p) setKm(p.veiculo.kmAtual);
                }}
                className="w-full bg-[#16171f] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-blue-500"
              >
                {contratosAtivos.map(({ veiculo, contrato }, idx) => (
                  <option key={`${veiculo.id}_${contrato.id}_${idx}`} value={contrato.id}>
                    {veiculo.modelo} ({veiculo.placa}) - {contrato.motoristaNome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* COMPARATIVO LADO A LADO: RETIRADA VS DEVOLUÇÃO (QUANDO TIPO = DEVOLUÇÃO) */}
          {tipo === 'Devolucao' && (
            <div className="p-4 rounded-2xl bg-amber-500/[0.04] border border-amber-500/20 space-y-3">
              <div className="flex items-center justify-between border-b border-amber-500/10 pb-2">
                <h4 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <ClipboardCheck size={16} /> Comparativo de Vistoria: Retirada Inicial x Devolução
                </h4>
                <span className="text-[10px] text-slate-400">
                  {vistoriaInicial ? `Laudo Retirada: ${formatDate(vistoriaInicial.data)}` : 'Laudo Retirada: Não registrado (Legado/Migrado)'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Comparativo de Combustível */}
                <div className={`p-3 rounded-xl border space-y-2 ${
                  temMenosCombustivel 
                    ? 'bg-rose-500/10 border-rose-500/30' 
                    : 'bg-emerald-500/10 border-emerald-500/20'
                }`}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300 flex items-center gap-1">
                      <Fuel size={14} className={temMenosCombustivel ? 'text-rose-400' : 'text-emerald-400'} /> Nível de Tanque:
                    </span>
                    <span className="font-mono text-[11px] text-slate-300">
                      Entregue: <strong className="text-white">{vistoriaInicial?.nivelCombustivel || 'Cheio'}</strong> ➔ Devolvendo: <strong className={temMenosCombustivel ? 'text-rose-400' : 'text-emerald-400'}>{nivelCombustivel}</strong>
                    </span>
                  </div>

                  {temMenosCombustivel ? (
                    <div className="space-y-1.5 pt-1">
                      <p className="text-[11px] text-rose-300">
                        Veículo entregue com <strong className="text-white">{litrosFaltantes}L a menos</strong> de combustível (~{formatCurrency(valorCombustivelFaltante)}).
                      </p>
                      {onGerarDebito && (
                        <button
                          type="button"
                          onClick={() => handleGerarDebitoRapido(
                            'Taxa de Vistoria (Combustível/Limpeza)',
                            `Combustível faltante na devolução (${litrosFaltantes}L - Entregue: ${vistoriaInicial?.nivelCombustivel || 'Cheio'} / Devolvido: ${nivelCombustivel})`,
                            valorCombustivelFaltante,
                            'combustivel-faltante'
                          )}
                          disabled={debitosGerados.includes('combustivel-faltante')}
                          className={`w-full py-1.5 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                            debitosGerados.includes('combustivel-faltante')
                              ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 cursor-default'
                              : 'bg-rose-600 hover:bg-rose-500 text-white cursor-pointer shadow-md shadow-rose-600/20'
                          }`}
                        >
                          {debitosGerados.includes('combustivel-faltante') ? (
                            <>
                              <CheckCircle2 size={13} /> Débito de Combustível Gerado no Caução
                            </>
                          ) : (
                            <>
                              <Zap size={13} /> Gerar Débito no Contrato ({formatCurrency(valorCombustivelFaltante)})
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  ) : (
                    <p className="text-[11px] text-emerald-300">
                      Combustível devolvido em nível igual ou superior à retirada. Sem cobrança.
                    </p>
                  )}
                </div>

                {/* Comparativo de Higienização e Limpeza */}
                <div className={`p-3 rounded-xl border space-y-2 ${
                  requerTaxaLimpeza
                    ? 'bg-amber-500/10 border-amber-500/30'
                    : 'bg-emerald-500/10 border-emerald-500/20'
                }`}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300 flex items-center gap-1">
                      <Sparkles size={14} className={requerTaxaLimpeza ? 'text-amber-400' : 'text-emerald-400'} /> Higienização:
                    </span>
                    <span className="font-mono text-[11px] text-slate-300">
                      Entregue: <strong className="text-white">{vistoriaInicial?.limpeza || 'Padrão'}</strong> ➔ Devolvendo: <strong className={requerTaxaLimpeza ? 'text-amber-400' : 'text-emerald-400'}>{limpeza}</strong>
                    </span>
                  </div>

                  {requerTaxaLimpeza ? (
                    <div className="space-y-1.5 pt-1">
                      <p className="text-[11px] text-amber-300">
                        Veículo retornado fora do padrão de limpeza. Sugestão de taxa de lavagem/higienização: {formatCurrency(valorTaxaHigienizacao)}.
                      </p>
                      {onGerarDebito && (
                        <button
                          type="button"
                          onClick={() => handleGerarDebitoRapido(
                            'Taxa de Vistoria (Combustível/Limpeza)',
                            `Taxa de higienização por devolução com veículo em estado "${limpeza}"`,
                            valorTaxaHigienizacao,
                            'taxa-higienizacao'
                          )}
                          disabled={debitosGerados.includes('taxa-higienizacao')}
                          className={`w-full py-1.5 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                            debitosGerados.includes('taxa-higienizacao')
                              ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 cursor-default'
                              : 'bg-amber-600 hover:bg-amber-500 text-slate-950 cursor-pointer shadow-md shadow-amber-600/20'
                          }`}
                        >
                          {debitosGerados.includes('taxa-higienizacao') ? (
                            <>
                              <CheckCircle2 size={13} /> Taxa de Limpeza Gerada no Caução
                            </>
                          ) : (
                            <>
                              <Zap size={13} /> Gerar Débito de Higienização ({formatCurrency(valorTaxaHigienizacao)})
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  ) : (
                    <p className="text-[11px] text-emerald-300">
                      Veículo limpo e em bom estado estético. Sem taxa de higienização.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Odômetro e Data */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center gap-1.5">
                <Gauge size={14} className="text-blue-400" /> KM Atual do Odômetro
              </label>
              <input
                type="number"
                value={km}
                onChange={(e) => setKm(Number(e.target.value))}
                required
                className="w-full bg-[#16171f] border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Data do Laudo
              </label>
              <input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                required
                className="w-full bg-[#16171f] border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Nível de Combustível */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-2 flex items-center gap-1.5">
              <Fuel size={14} className="text-amber-400" /> Nível de Combustível
            </label>
            <div className="grid grid-cols-5 gap-2">
              {(['Reserva', '1/4', '1/2', '3/4', 'Cheio'] as const).map((nivel) => (
                <button
                  key={nivel}
                  type="button"
                  onClick={() => setNivelCombustivel(nivel)}
                  className={`py-2 px-2 rounded-xl text-xs font-bold transition border cursor-pointer ${
                    nivelCombustivel === nivel
                      ? 'bg-amber-600/30 border-amber-500 text-amber-300'
                      : 'bg-[#16171f] border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  {nivel}
                </button>
              ))}
            </div>
          </div>

          {/* Pneus e Limpeza */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Estado Geral dos Pneus
              </label>
              <select
                value={estadoPneus}
                onChange={(e) => setEstadoPneus(e.target.value as any)}
                className="w-full bg-[#16171f] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-blue-500"
              >
                <option value="Novos">Novos (100%)</option>
                <option value="Bons">Bons / Acima de 70%</option>
                <option value="Meia-vida">Meia-vida (50%)</option>
                <option value="Desgastados">Desgastados (Atenção)</option>
                <option value="Troca Urgente">Troca Urgente / No TWI</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Higienização & Limpeza
              </label>
              <select
                value={limpeza}
                onChange={(e) => setLimpeza(e.target.value as any)}
                className="w-full bg-[#16171f] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-blue-500"
              >
                <option value="Impecável">Impecável / Recém-lavado</option>
                <option value="Padrão">Padrão / Aceitável</option>
                <option value="Sujo">Sujo / Uso normal</option>
                <option value="Requer Higienização">Requer Higienização Pesada (Cobrar taxa)</option>
              </select>
            </div>
          </div>

          {/* Itens de Segurança Obrigatórios */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-2 flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-400" /> Itens de Segurança e Acessórios Obrigatórios
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <label className={`p-3 rounded-xl border flex items-center gap-2 cursor-pointer text-xs font-semibold transition ${
                estepe ? 'bg-emerald-600/10 border-emerald-500/30 text-emerald-300' : 'bg-[#16171f] border-white/10 text-slate-400'
              }`}>
                <input
                  type="checkbox"
                  checked={estepe}
                  onChange={(e) => setEstepe(e.target.checked)}
                  className="rounded text-emerald-600"
                />
                Estepe Calibrado
              </label>

              <label className={`p-3 rounded-xl border flex items-center gap-2 cursor-pointer text-xs font-semibold transition ${
                macacoChaveRoda ? 'bg-emerald-600/10 border-emerald-500/30 text-emerald-300' : 'bg-[#16171f] border-white/10 text-slate-400'
              }`}>
                <input
                  type="checkbox"
                  checked={macacoChaveRoda}
                  onChange={(e) => setMacacoChaveRoda(e.target.checked)}
                  className="rounded text-emerald-600"
                />
                Macaco + Chave
              </label>

              <label className={`p-3 rounded-xl border flex items-center gap-2 cursor-pointer text-xs font-semibold transition ${
                documentoVeiculo ? 'bg-emerald-600/10 border-emerald-500/30 text-emerald-300' : 'bg-[#16171f] border-white/10 text-slate-400'
              }`}>
                <input
                  type="checkbox"
                  checked={documentoVeiculo}
                  onChange={(e) => setDocumentoVeiculo(e.target.checked)}
                  className="rounded text-emerald-600"
                />
                CRLV no Porta-Luvas
              </label>

              <label className={`p-3 rounded-xl border flex items-center gap-2 cursor-pointer text-xs font-semibold transition ${
                trianguloSinalizacao ? 'bg-emerald-600/10 border-emerald-500/30 text-emerald-300' : 'bg-[#16171f] border-white/10 text-slate-400'
              }`}>
                <input
                  type="checkbox"
                  checked={trianguloSinalizacao}
                  onChange={(e) => setTrianguloSinalizacao(e.target.checked)}
                  className="rounded text-emerald-600"
                />
                Triângulo
              </label>
            </div>
          </div>

          {/* Avarias e Danos Identificados */}
          <div className="bg-[#16171f] p-4 rounded-xl border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <AlertTriangle size={14} className="text-amber-400" /> Registro de Avarias / Arranhões / Amassados
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                {avarias.length} item(ns) registrado(s)
              </span>
            </div>

            {/* Lista de avarias */}
            {avarias.map((av, index) => (
              <div key={index} className="flex items-center justify-between p-2.5 rounded-lg bg-[#111116] border border-white/5 text-xs">
                <div>
                  <strong className="text-white">{av.item}</strong>: <span className="text-slate-300">{av.descricao}</span>
                  {av.cobrarDoMotorista && (
                    <span className="ml-2 text-rose-400 font-bold font-mono">
                      (Cobrar: {formatCurrency(av.valorAvaria || 0)})
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveAvaria(index)}
                  className="text-slate-400 hover:text-rose-400 p-1 cursor-pointer transition"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}

            {/* Adicionar avaria rápida */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2">
              <input
                type="text"
                value={novaAvariaItem}
                onChange={(e) => setNovaAvariaItem(e.target.value)}
                placeholder="Ex: Para-choque dianteiro"
                className="bg-[#111116] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
              />
              <input
                type="text"
                value={novaAvariaDesc}
                onChange={(e) => setNovaAvariaDesc(e.target.value)}
                placeholder="Ex: Arranhão leve lado direito"
                className="bg-[#111116] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
              />
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={novaAvariaValor || ''}
                  onChange={(e) => setNovaAvariaValor(Number(e.target.value))}
                  placeholder="R$ Reparo"
                  className="w-24 bg-[#111116] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white font-mono"
                />
                <label className="text-[10px] text-slate-300 flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={novaAvariaCobrar}
                    onChange={(e) => setNovaAvariaCobrar(e.target.checked)}
                  />
                  Cobrar
                </label>
              </div>
              <button
                type="button"
                onClick={handleAddAvaria}
                className="bg-white/10 hover:bg-white/20 text-white rounded-lg px-3 py-1.5 text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer"
              >
                <Plus size={14} /> Adicionar
              </button>
            </div>
          </div>

          {/* Responsável e Observações */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Responsável pela Vistoria
              </label>
              <input
                type="text"
                value={responsavelVistoria}
                onChange={(e) => setResponsavelVistoria(e.target.value)}
                required
                className="w-full bg-[#16171f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Observações Gerais
              </label>
              <input
                type="text"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Ex: Veículo entregue lavado e polido"
                className="w-full bg-[#16171f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Concordância */}
          <label className="flex items-center gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 cursor-pointer">
            <input
              type="checkbox"
              checked={assinaturaMotorista}
              onChange={(e) => setAssinaturaMotorista(e.target.checked)}
              className="rounded text-blue-600"
            />
            <UserCheck size={16} />
            <span>Motorista conferiu presencialmente os itens e concordou com o laudo de vistoria.</span>
          </label>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 text-xs font-bold transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/20 transition cursor-pointer"
            >
              <Check size={16} /> Finalizar e Salvar Vistoria
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
