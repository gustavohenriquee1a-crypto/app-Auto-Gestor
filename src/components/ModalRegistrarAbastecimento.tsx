import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Fuel,
  Gauge,
  User,
  Building2,
  Calendar,
  DollarSign,
  CreditCard,
  CheckCircle2,
  FileText,
  Clock,
  Sparkles,
  Plus,
  Navigation
} from 'lucide-react';
import {
  Veiculo,
  FornecedorPrestador,
  ContaBancariaCaixa,
  Usuario,
  DespesaVeiculo
} from '../types';

export interface DadosAbastecimento {
  veiculoId: string;
  postoNome: string;
  postoId?: string;
  responsavel: string;
  kmAtual: number;
  motivoSaida: string;
  motivoDetalhe?: string;
  litros: number;
  valorTotal: number;
  valorPorLitro: number;
  tipoCombustivel: string;
  data: string;
  statusPagamento: 'Pago' | 'Pendente';
  formaPagamento?: string;
  contaBancariaId?: string;
  contaBancariaNome?: string;
  nfNumero?: string;
  observacoes?: string;
}

interface ModalRegistrarAbastecimentoProps {
  isOpen: boolean;
  onClose: () => void;
  veiculo: Veiculo | null;
  fornecedores?: FornecedorPrestador[];
  contasBancarias?: ContaBancariaCaixa[];
  usuarios?: Usuario[];
  currentUser?: Usuario | null;
  onSaveAbastecimento: (dados: DadosAbastecimento) => Promise<void> | void;
  onOpenNovoFornecedor?: () => void;
}

const MOTIVOS_PREDEFINIDOS = [
  { id: 'Revisão Mecânica', label: '⚙️ Revisão / Mecânica', desc: 'Deslocamento até oficina ou teste de reparo' },
  { id: 'Lava-jato / Estética', label: '✨ Lava-jato / Estética', desc: 'Higienização, polimento ou lavagem' },
  { id: 'Test Drive com Cliente', label: '🚗 Test Drive / Demonstração', desc: 'Apresentação a potencial comprador' },
  { id: 'Transferência de Pátio', label: '📍 Transferência de Pátio', desc: 'Movimentação entre lojas ou pátios' },
  { id: 'Entrega de Veículo Vendido', label: '🤝 Entrega ao Cliente', desc: 'Tanque cortesia ou entrega técnica' },
  { id: 'Outro', label: '📝 Outro Motivo', desc: 'Outro deslocamento operacional' },
];

const TIPOS_COMBUSTIVEL = [
  'Gasolina Comum',
  'Gasolina Aditivada',
  'Etanol',
  'Diesel S10',
  'GNV',
];

export const ModalRegistrarAbastecimento: React.FC<ModalRegistrarAbastecimentoProps> = ({
  isOpen,
  onClose,
  veiculo,
  fornecedores = [],
  contasBancarias = [],
  usuarios = [],
  currentUser,
  onSaveAbastecimento,
  onOpenNovoFornecedor,
}) => {
  if (!isOpen || !veiculo) return null;

  // Filtrar e ordenar postos parceiros primeiro
  const postosCombustivel = useMemo(() => {
    return fornecedores.filter((f) => f.categoria === 'Posto de Combustível' && f.status !== 'Inativo');
  }, [fornecedores]);

  const outrosFornecedores = useMemo(() => {
    return fornecedores.filter((f) => f.categoria !== 'Posto de Combustível' && f.status !== 'Inativo');
  }, [fornecedores]);

  // Form State
  const [selectedPostoId, setSelectedPostoId] = useState<string>('');
  const [postoNomeManual, setPostoNomeManual] = useState<string>('');
  const [responsavel, setResponsavel] = useState<string>('');
  const [kmAtual, setKmAtual] = useState<number | string>(veiculo.kmAtual || 0);
  const [motivoSaida, setMotivoSaida] = useState<string>('Revisão Mecânica');
  const [motivoDetalhe, setMotivoDetalhe] = useState<string>('');
  const [litros, setLitros] = useState<number | string>(20);
  const [valorTotal, setValorTotal] = useState<number | string>(120);
  const [tipoCombustivel, setTipoCombustivel] = useState<string>(
    veiculo.combustivel?.toLowerCase().includes('diesel')
      ? 'Diesel S10'
      : veiculo.combustivel?.toLowerCase().includes('etanol')
      ? 'Etanol'
      : 'Gasolina Comum'
  );
  const [data, setData] = useState<string>(new Date().toISOString().split('T')[0]);
  const [statusPagamento, setStatusPagamento] = useState<'Pago' | 'Pendente'>('Pago');
  const [formaPagamento, setFormaPagamento] = useState<string>('PIX');
  const [selectedContaBancariaId, setSelectedContaBancariaId] = useState<string>('');
  const [nfNumero, setNfNumero] = useState<string>('');
  const [observacoes, setObservacoes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inicializar dados quando o modal abre
  useEffect(() => {
    if (isOpen && veiculo) {
      setKmAtual(veiculo.kmAtual || 0);
      setData(new Date().toISOString().split('T')[0]);
      
      // Auto selecionar o primeiro posto de combustível se houver
      if (postosCombustivel.length > 0) {
        setSelectedPostoId(postosCombustivel[0].id);
        setPostoNomeManual(postosCombustivel[0].nome);
      } else if (fornecedores.length > 0) {
        setSelectedPostoId(fornecedores[0].id);
        setPostoNomeManual(fornecedores[0].nome);
      } else {
        setSelectedPostoId('');
        setPostoNomeManual('Posto de Combustível Local');
      }

      // Auto selecionar responsável (usuário atual ou motorista de contrato ativo)
      if (veiculo.contratoAtivo?.motoristaNome) {
        setResponsavel(veiculo.contratoAtivo.motoristaNome);
      } else if (currentUser?.displayName) {
        setResponsavel(currentUser.displayName);
      } else if (usuarios.length > 0) {
        setResponsavel(usuarios[0].displayName || usuarios[0].email);
      } else {
        setResponsavel('Operador do Pátio');
      }

      // Definir conta bancária padrão
      if (contasBancarias.length > 0) {
        setSelectedContaBancariaId(contasBancarias[0].id);
      }
    }
  }, [isOpen, veiculo, postosCombustivel, fornecedores, contasBancarias, currentUser, usuarios]);

  // Cálculos dinâmicos
  const numLitros = Math.max(0, Number(litros) || 0);
  const numValorTotal = Math.max(0, Number(valorTotal) || 0);
  const valorPorLitro = numLitros > 0 ? numValorTotal / numLitros : 0;
  const kmAtualNum = Number(kmAtual) || 0;
  const kmAnterior = veiculo.kmAtual || 0;
  const diferencaKm = kmAtualNum - kmAnterior;

  const handlePostoChange = (id: string) => {
    setSelectedPostoId(id);
    if (!id || id === '__manual__') {
      if (id === '') setPostoNomeManual('');
      return;
    }
    const forn = fornecedores.find((f) => f.id === id);
    if (forn) {
      setPostoNomeManual(forn.nome);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numValorTotal <= 0) {
      alert('Informe um valor total válido para o abastecimento.');
      return;
    }
    if (numLitros <= 0) {
      alert('Informe a quantidade de litros abastecidos.');
      return;
    }
    if (!postoNomeManual.trim()) {
      alert('Informe o posto de combustível.');
      return;
    }
    if (!responsavel.trim()) {
      alert('Informe o responsável ou condutor do veículo.');
      return;
    }
    if (kmAtualNum < kmAnterior) {
      const confirmRetro = window.confirm(
        `O KM informado (${kmAtualNum.toLocaleString('pt-BR')} km) é menor que o KM registrado atualmente no veículo (${kmAnterior.toLocaleString('pt-BR')} km). Deseja continuar assim mesmo?`
      );
      if (!confirmRetro) return;
    }

    try {
      setIsSubmitting(true);
      const selectedConta = contasBancarias.find((c) => c.id === selectedContaBancariaId);

      const dados: DadosAbastecimento = {
        veiculoId: veiculo.id,
        postoNome: postoNomeManual.trim(),
        postoId: selectedPostoId && selectedPostoId !== '__manual__' ? selectedPostoId : undefined,
        responsavel: responsavel.trim(),
        kmAtual: kmAtualNum,
        motivoSaida,
        motivoDetalhe: motivoDetalhe.trim() || undefined,
        litros: numLitros,
        valorTotal: numValorTotal,
        valorPorLitro,
        tipoCombustivel,
        data,
        statusPagamento,
        formaPagamento: statusPagamento === 'Pago' ? formaPagamento : undefined,
        contaBancariaId: statusPagamento === 'Pago' && selectedContaBancariaId ? selectedContaBancariaId : undefined,
        contaBancariaNome: statusPagamento === 'Pago' && selectedConta ? selectedConta.nome : undefined,
        nfNumero: nfNumero.trim() || undefined,
        observacoes: observacoes.trim() || undefined,
      };

      await onSaveAbastecimento(dados);
      onClose();
    } catch (err: any) {
      console.error('Erro ao registrar abastecimento:', err);
      alert('Ocorreu um erro ao registrar o abastecimento. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-2xl max-h-[92vh] flex flex-col bg-[#111116] rounded-2xl shadow-2xl overflow-hidden border border-amber-500/30">
        {/* Header com identidade visual de Abastecimento */}
        <div className="bg-gradient-to-r from-amber-600/30 via-orange-600/20 to-transparent p-5 flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-500 text-black flex items-center justify-center font-black shadow-lg shadow-amber-500/20">
              <Fuel size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-white">
                  Registrar Abastecimento
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase tracking-wider">
                  Controle de Frota
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Lançamento rápido de combustível com atualização automática de KM e Dossiê.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Resumo do Veículo */}
        <div className="bg-[#16171f] px-5 py-3 border-b border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-mono font-black text-xs px-2.5 py-1 bg-black/50 text-emerald-400 border border-emerald-500/30 rounded-lg">
              {veiculo.placa}
            </span>
            <span className="font-bold text-white">
              {veiculo.modelo} ({veiculo.ano || veiculo.anoModelo})
            </span>
            <span className="text-slate-400 hidden sm:inline">
              Chassi: <strong className="text-slate-300 font-mono">{veiculo.chassi.slice(0, 10)}...</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 text-slate-300">
            <Gauge size={14} className="text-amber-400" />
            <span>KM Atual no Sistema:</span>
            <strong className="text-amber-300 font-mono font-bold">
              {(veiculo.kmAtual || 0).toLocaleString('pt-BR')} km
            </strong>
          </div>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs">
            
            {/* Bloco 1: Posto e Tipo de Combustível */}
            <div className="p-4 bg-white/[0.02] border border-white/10 rounded-2xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <label className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Building2 size={15} className="text-amber-400" />
                  Posto de Combustível / Estabelecimento *
                </label>
                {onOpenNovoFornecedor && (
                  <button
                    type="button"
                    onClick={onOpenNovoFornecedor}
                    className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 transition"
                  >
                    <Plus size={12} /> Cadastrar Novo Posto
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">Selecionar Posto Conveniado:</label>
                  <select
                    value={selectedPostoId}
                    onChange={(e) => handlePostoChange(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-white/10 bg-[#16171f] text-slate-200 outline-none focus:border-amber-400 text-xs font-semibold"
                  >
                    <option value="__manual__">-- Digitar Nome Manualmente --</option>
                    {postosCombustivel.length > 0 && (
                      <optgroup label="⛽ Postos de Combustível Cadastrados">
                        {postosCombustivel.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nome} {p.cidadeUf ? `(${p.cidadeUf})` : ''}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {outrosFornecedores.length > 0 && (
                      <optgroup label="Outros Parceiros / Fornecedores">
                        {outrosFornecedores.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.nome} ({f.categoria})
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">Nome do Posto / Estabelecimento *</label>
                  <input
                    type="text"
                    required
                    value={postoNomeManual}
                    onChange={(e) => setPostoNomeManual(e.target.value)}
                    placeholder="Ex: Posto Ipiranga Rota 101"
                    className="w-full p-2.5 rounded-xl border border-white/10 bg-[#16171f] text-slate-200 outline-none focus:border-amber-400 font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Bloco 2: Valores, Litros e Cálculo em Tempo Real */}
            <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-amber-500/20">
                <span className="font-bold text-amber-300 flex items-center gap-1.5 text-xs">
                  <Fuel size={15} className="text-amber-400" />
                  Litros, Valores & Combustível
                </span>
                <span className="text-[11px] text-amber-200/70 font-mono">
                  {numLitros > 0 && numValorTotal > 0
                    ? `Preço Médio: R$ ${valorPorLitro.toFixed(2)}/Litro`
                    : 'Cálculo automático por litro'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Valor Total (R$) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={valorTotal}
                      onChange={(e) => setValorTotal(e.target.value)}
                      placeholder="0,00"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-amber-500/40 bg-[#16171f] text-emerald-400 font-mono font-black text-base outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Litros Abastecidos *</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0.1"
                      required
                      value={litros}
                      onChange={(e) => setLitros(e.target.value)}
                      placeholder="Ex: 35.50"
                      className="w-full px-3 py-2.5 rounded-xl border border-white/10 bg-[#16171f] text-amber-400 font-mono font-bold text-base outline-none focus:border-amber-400"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">L</span>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Tipo de Combustível *</label>
                  <select
                    value={tipoCombustivel}
                    onChange={(e) => setTipoCombustivel(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-white/10 bg-[#16171f] text-slate-200 font-bold outline-none focus:border-amber-400"
                  >
                    {TIPOS_COMBUSTIVEL.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Bloco 3: Odômetro / KM e Responsável */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="p-4 bg-white/[0.02] border border-white/10 rounded-2xl space-y-2">
                <label className="block text-slate-200 font-bold flex items-center gap-1.5">
                  <Gauge size={15} className="text-blue-400" />
                  KM Atual no Odômetro *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    required
                    value={kmAtual}
                    onChange={(e) => setKmAtual(e.target.value)}
                    placeholder="Ex: 45000"
                    className="w-full px-3 py-2.5 rounded-xl border border-white/10 bg-[#16171f] text-white font-mono font-black text-sm outline-none focus:border-blue-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">KM</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Anterior: {kmAnterior.toLocaleString('pt-BR')} km</span>
                  <span className={diferencaKm >= 0 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                    {diferencaKm >= 0 ? `+${diferencaKm.toLocaleString('pt-BR')} km rodados` : `${diferencaKm} km (menor)`}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-white/[0.02] border border-white/10 rounded-2xl space-y-2">
                <label className="block text-slate-200 font-bold flex items-center gap-1.5">
                  <User size={15} className="text-emerald-400" />
                  Responsável / Motorista *
                </label>
                <input
                  type="text"
                  required
                  value={responsavel}
                  onChange={(e) => setResponsavel(e.target.value)}
                  placeholder="Ex: Paulo Santos (Motorista / Vendedor)"
                  className="w-full px-3 py-2.5 rounded-xl border border-white/10 bg-[#16171f] text-slate-200 font-semibold outline-none focus:border-emerald-500"
                />
                <p className="text-[10px] text-slate-500">
                  Condutor que realizou o abastecimento ou autorizou a saída.
                </p>
              </div>
            </div>

            {/* Bloco 4: Motivo da Saída com botões interativos */}
            <div className="p-4 bg-white/[0.02] border border-white/10 rounded-2xl space-y-3">
              <label className="block font-bold text-slate-200 flex items-center gap-1.5">
                <Navigation size={15} className="text-orange-400" />
                Motivo da Saída / Abastecimento *
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {MOTIVOS_PREDEFINIDOS.map((m) => {
                  const isSelected = motivoSaida === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMotivoSaida(m.id)}
                      className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500/20 border-amber-500 text-amber-200 shadow-md'
                          : 'bg-black/30 border-white/5 text-slate-400 hover:border-white/20 hover:text-slate-200'
                      }`}
                    >
                      <div className="font-bold text-xs">{m.label}</div>
                      <div className="text-[10px] opacity-70 mt-0.5 line-clamp-1">{m.desc}</div>
                    </button>
                  );
                })}
              </div>

              {motivoSaida === 'Outro' && (
                <div className="pt-2">
                  <input
                    type="text"
                    required
                    value={motivoDetalhe}
                    onChange={(e) => setMotivoDetalhe(e.target.value)}
                    placeholder="Descreva o motivo específico da saída do veículo..."
                    className="w-full p-2.5 rounded-xl border border-white/10 bg-[#16171f] text-slate-200 outline-none focus:border-amber-400 text-xs font-medium"
                  />
                </div>
              )}
            </div>

            {/* Bloco 5: Financeiro, Quitação e Cupom */}
            <div className="p-4 bg-white/[0.02] border border-white/10 rounded-2xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <span className="font-bold text-slate-200 flex items-center gap-1.5 text-xs">
                  <DollarSign size={15} className="text-emerald-400" />
                  Status de Pagamento & Quitação
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStatusPagamento('Pago')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      statusPagamento === 'Pago'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-black/40 text-slate-400 border border-white/10'
                    }`}
                  >
                    ✓ Pago
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusPagamento('Pendente')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      statusPagamento === 'Pendente'
                        ? 'bg-amber-600 text-white'
                        : 'bg-black/40 text-slate-400 border border-white/10'
                    }`}
                  >
                    ⏳ A Pagar (Faturado)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">Data do Abastecimento:</label>
                  <input
                    type="date"
                    required
                    value={data}
                    onChange={(e) => setData(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-white/10 bg-[#16171f] text-slate-200 outline-none focus:border-blue-400 font-semibold"
                  />
                </div>

                {statusPagamento === 'Pago' ? (
                  <>
                    <div>
                      <label className="block text-slate-400 text-[11px] mb-1">Forma de Pagamento:</label>
                      <select
                        value={formaPagamento}
                        onChange={(e) => setFormaPagamento(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-white/10 bg-[#16171f] text-slate-200 outline-none focus:border-blue-400 font-semibold"
                      >
                        <option value="PIX">PIX</option>
                        <option value="Cartão de Débito (Empresa)">Cartão de Débito (Empresa)</option>
                        <option value="Cartão de Crédito">Cartão de Crédito</option>
                        <option value="Dinheiro / Caixa">Dinheiro / Caixa</option>
                        <option value="Boleto Bancário">Boleto Bancário</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 text-[11px] mb-1">Conta de Débito:</label>
                      <select
                        value={selectedContaBancariaId}
                        onChange={(e) => setSelectedContaBancariaId(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-white/10 bg-[#16171f] text-slate-200 outline-none focus:border-blue-400 font-semibold text-xs"
                      >
                        <option value="">-- Não debitar de conta --</option>
                        {contasBancarias.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nome} (R$ {(c.saldoAtual || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                ) : (
                  <div className="sm:col-span-2 flex items-center">
                    <p className="text-[11px] text-amber-300/80 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 w-full">
                      Esta despesa ficará pendente no módulo de <strong>Contas a Pagar</strong> para quitação futura (ex: fatura mensal do posto parceiro).
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">Número do Cupom / NF (Opcional):</label>
                  <input
                    type="text"
                    value={nfNumero}
                    onChange={(e) => setNfNumero(e.target.value)}
                    placeholder="Ex: CF-102938"
                    className="w-full p-2.5 rounded-xl border border-white/10 bg-[#16171f] text-slate-200 outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">Observações Adicionais:</label>
                  <input
                    type="text"
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Ex: Tanque completo antes do transporte"
                    className="w-full p-2.5 rounded-xl border border-white/10 bg-[#16171f] text-slate-200 outline-none focus:border-blue-400"
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Footer Action Buttons */}
          <div className="p-4 bg-[#16171f] border-t border-white/10 flex items-center justify-between shrink-0">
            <div className="text-xs text-slate-400 hidden sm:block">
              Total a lançar: <strong className="text-emerald-400 font-mono font-black text-sm">R$ {numValorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 font-bold transition text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black font-black transition shadow-lg shadow-amber-500/20 text-xs flex items-center gap-2"
              >
                {isSubmitting ? (
                  <span>Salvando...</span>
                ) : (
                  <>
                    <Fuel size={16} /> Salvar & Atualizar KM do Carro
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
