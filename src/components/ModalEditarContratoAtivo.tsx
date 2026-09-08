import React, { useState, useMemo } from 'react';
import {
  X,
  Save,
  CheckCircle2,
  Car,
  User,
  DollarSign,
  Calendar,
  Layers,
  ArrowRightLeft,
  Receipt,
  Plus,
  Trash2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Check,
  Edit2,
  FileText,
  BadgeAlert
} from 'lucide-react';
import { ContratoLocacao, Veiculo, PagamentoAluguel } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';

interface ModalEditarContratoAtivoProps {
  isOpen: boolean;
  onClose: () => void;
  veiculo: Veiculo;
  contrato: ContratoLocacao;
  todosVeiculos: Veiculo[];
  onSalvarEdicaoContrato: (
    veiculoAntigoId: string,
    veiculoNovoId: string,
    contratoAtualizado: ContratoLocacao
  ) => Promise<void> | void;
  onExcluirContrato?: (veiculoId: string, contratoId: string) => Promise<void> | void;
}

export const ModalEditarContratoAtivo: React.FC<ModalEditarContratoAtivoProps> = ({
  isOpen,
  onClose,
  veiculo,
  contrato,
  todosVeiculos,
  onSalvarEdicaoContrato,
  onExcluirContrato,
}) => {
  const [activeTab, setActiveTab] = useState<'dados' | 'veiculo' | 'financeiro'>('dados');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // 1. DADOS DO MOTORISTA & CONTRATO
  const [motoristaNome, setMotoristaNome] = useState(contrato.motoristaNome || '');
  const [motoristaCpf, setMotoristaCpf] = useState(contrato.motoristaCpf || '');
  const [motoristaTelefone, setMotoristaTelefone] = useState(contrato.motoristaTelefone || '');
  const [motoristaApp, setMotoristaApp] = useState<'Uber' | '99' | 'Indrive' | 'Misto'>(
    contrato.motoristaApp || 'Uber'
  );
  const [statusContrato, setStatusContrato] = useState<'Ativo' | 'Encerrado' | 'Inadimplente'>(
    contrato.status || 'Ativo'
  );

  const [valorSemanal, setValorSemanal] = useState<number>(contrato.valorSemanal || 0);
  const [diaCobranca, setDiaCobranca] = useState<
    'Segunda-feira' | 'Terça-feira' | 'Quarta-feira' | 'Quinta-feira' | 'Sexta-feira' | 'Sábado' | 'Domingo'
  >(contrato.diaCobranca || 'Segunda-feira');
  const [dataInicio, setDataInicio] = useState(contrato.dataInicio || '');
  const [dataFimPrevista, setDataFimPrevista] = useState(contrato.dataFimPrevista || '');
  const [kmInicial, setKmInicial] = useState<number>(contrato.kmInicial || 0);

  // Parâmetros Operacionais
  const [limiteKmSemanal, setLimiteKmSemanal] = useState<number>(contrato.limiteKmSemanal || 1750);
  const [valorMultaPorKmExcedente, setValorMultaPorKmExcedente] = useState<number>(
    contrato.valorMultaPorKmExcedente || 1.2
  );
  const [percentualMultaAtraso, setPercentualMultaAtraso] = useState<number>(
    contrato.percentualMultaAtraso || 40
  );
  const [dataInicioMedicaoKm, setDataInicioMedicaoKm] = useState(contrato.dataInicioMedicaoKm || '');

  // Caução
  const [caucao, setCaucao] = useState<number>(contrato.caucao || 0);
  const [caucaoTotalPago, setCaucaoTotalPago] = useState<number>(
    contrato.caucaoTotalPago !== undefined ? contrato.caucaoTotalPago : contrato.caucao || 0
  );
  const [caucaoUtilizado, setCaucaoUtilizado] = useState<number>(contrato.caucaoUtilizado || 0);
  const [caucaoSaldoAtual, setCaucaoSaldoAtual] = useState<number>(
    contrato.caucaoSaldoAtual !== undefined ? contrato.caucaoSaldoAtual : contrato.caucao || 0
  );

  // 2. VINCULAÇÃO DE VEÍCULO
  const [targetVeiculoId, setTargetVeiculoId] = useState<string>(veiculo.id);

  // 3. GRADE DE PAGAMENTOS & SALDO JÁ PAGO
  const [pagamentosList, setPagamentosList] = useState<PagamentoAluguel[]>(
    contrato.pagamentos ? [...contrato.pagamentos] : []
  );

  // Estado para adicionar novo lançamento/parcela avulsa
  const [mostrarNovoLancamento, setMostrarNovoLancamento] = useState(false);
  const [novoSemanaRef, setNovoSemanaRef] = useState('');
  const [novoValor, setNovoValor] = useState<number>(contrato.valorSemanal || 0);
  const [novoVencimento, setNovoVencimento] = useState(new Date().toISOString().split('T')[0]);
  const [novoStatus, setNovoStatus] = useState<'Pago' | 'Pendente' | 'Atrasado'>('Pago');
  const [novoDataPag, setNovoDataPag] = useState(new Date().toISOString().split('T')[0]);
  const [novoMetodo, setNovoMetodo] = useState<'PIX' | 'Dinheiro' | 'Transferência' | 'Boleto'>('PIX');
  const [novoObs, setNovoObs] = useState('');

  // Edição rápida de item na lista
  const [editingPagId, setEditingPagId] = useState<string | null>(null);

  // Cálculos de saldo já pago e registrado
  const totaisFinanceiros = useMemo(() => {
    let totalPagoAlugueis = 0;
    let totalPendenteAlugueis = 0;
    let totalAtrasadoAlugueis = 0;
    let countPagos = 0;
    let countPendentes = 0;
    let countAtrasados = 0;

    pagamentosList.forEach((pag) => {
      const val = Number(pag.valor) || 0;
      if (pag.status === 'Pago') {
        totalPagoAlugueis += val;
        countPagos++;
      } else if (pag.status === 'Atrasado') {
        totalAtrasadoAlugueis += val;
        countAtrasados++;
      } else {
        totalPendenteAlugueis += val;
        countPendentes++;
      }
    });

    const totalGeralPagoRegistrado = totalPagoAlugueis + Number(caucaoTotalPago || 0);

    return {
      totalPagoAlugueis,
      totalPendenteAlugueis,
      totalAtrasadoAlugueis,
      totalGeralPagoRegistrado,
      countPagos,
      countPendentes,
      countAtrasados,
      totalParcelas: pagamentosList.length,
    };
  }, [pagamentosList, caucaoTotalPago]);

  // Handler para alternar status de pagamento
  const handleToggleStatusPagamento = (id: string) => {
    setPagamentosList((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const novoSt: 'Pago' | 'Pendente' | 'Atrasado' =
            p.status === 'Pago' ? 'Pendente' : p.status === 'Pendente' ? 'Atrasado' : 'Pago';
          return {
            ...p,
            status: novoSt,
            dataPagamento: novoSt === 'Pago' ? (p.dataPagamento || new Date().toISOString().split('T')[0]) : undefined,
          };
        }
        return p;
      })
    );
  };

  // Handler para atualizar valor ou campos de uma parcela
  const handleUpdatePagamentoCampo = (id: string, campo: keyof PagamentoAluguel, valor: any) => {
    setPagamentosList((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          return {
            ...p,
            [campo]: valor,
          };
        }
        return p;
      })
    );
  };

  // Handler para remover parcela
  const handleRemoverPagamento = (id: string) => {
    if (confirm('Deseja realmente remover esta parcela do histórico do contrato?')) {
      setPagamentosList((prev) => prev.filter((p) => p.id !== id));
    }
  };

  // Handler para adicionar nova parcela
  const handleAdicionarParcela = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoSemanaRef.trim()) {
      alert('Informe a referência da semana ou descrição da parcela.');
      return;
    }
    const novaParcela: PagamentoAluguel = {
      id: `pag-edit-${Date.now()}`,
      contratoId: contrato.id,
      veiculoId: targetVeiculoId,
      motoristaNome: motoristaNome.trim() || contrato.motoristaNome,
      semanaReferencia: novoSemanaRef.trim(),
      dataVencimento: novoVencimento || new Date().toISOString().split('T')[0],
      valor: Number(novoValor) || 0,
      status: novoStatus,
      dataPagamento: novoStatus === 'Pago' ? novoDataPag : undefined,
      metodoPagamento: novoMetodo,
      observacao: novoObs.trim() || 'Lançamento inserido/ajustado na edição de contrato',
    };

    setPagamentosList((prev) => [novaParcela, ...prev]);
    setNovoSemanaRef('');
    setNovoObs('');
    setMostrarNovoLancamento(false);
  };

  // Handler para salvar todas as alterações
  const handleSubmitGeral = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!motoristaNome.trim()) {
      alert('O nome do motorista é obrigatório.');
      return;
    }

    setIsSaving(true);
    try {
      const veiculoSelecionado = todosVeiculos.find((v) => v.id === targetVeiculoId) || veiculo;

      const contratoAtualizado: ContratoLocacao = {
        ...contrato,
        veiculoId: targetVeiculoId,
        placa: veiculoSelecionado.placa,
        modelo: veiculoSelecionado.modelo,
        motoristaNome: motoristaNome.trim(),
        motoristaCpf: motoristaCpf.trim(),
        motoristaTelefone: motoristaTelefone.trim(),
        motoristaApp,
        status: statusContrato,
        valorSemanal: Number(valorSemanal) || 0,
        diaCobranca,
        dataInicio,
        dataFimPrevista: dataFimPrevista || undefined,
        kmInicial: Number(kmInicial) || 0,
        limiteKmSemanal: Number(limiteKmSemanal) || 1750,
        valorMultaPorKmExcedente: Number(valorMultaPorKmExcedente) || 1.2,
        percentualMultaAtraso: Number(percentualMultaAtraso) || 40,
        dataInicioMedicaoKm: dataInicioMedicaoKm || undefined,
        caucao: Number(caucao) || 0,
        caucaoTotalPago: Number(caucaoTotalPago) || 0,
        caucaoUtilizado: Number(caucaoUtilizado) || 0,
        caucaoSaldoAtual: Number(caucaoSaldoAtual) || 0,
        pagamentos: pagamentosList,
      };

      await onSalvarEdicaoContrato(veiculo.id, targetVeiculoId, contratoAtualizado);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Erro ao salvar alterações no contrato:', err);
      alert('Erro ao salvar alterações no contrato. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const veiculoAlvo = todosVeiculos.find((v) => v.id === targetVeiculoId) || veiculo;
  const houveMudancaVeiculo = targetVeiculoId !== veiculo.id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#0e0f14] rounded-2xl shadow-2xl overflow-hidden border border-white/10">
        {/* HEADER */}
        <div className="bg-[#15161f] text-white p-5 flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-blue-600/30 shrink-0">
              <FileText size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="font-extrabold text-base sm:text-lg text-white">
                  Editar Contrato de Locação Ativo
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  {contrato.motoristaApp}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {statusContrato}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                <span>Motorista: <strong className="text-white">{contrato.motoristaNome}</strong></span>
                <span>•</span>
                <span>Veículo Atual: <strong className="font-mono text-blue-400">{veiculo.placa}</strong> ({veiculo.modelo})</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* FEEDBACK SUCCESS */}
        {saveSuccess && (
          <div className="bg-emerald-500/20 border-b border-emerald-500/30 px-5 py-3 text-emerald-300 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <span>Contrato atualizado com sucesso! Alterações e histórico salvos.</span>
          </div>
        )}

        {/* NAVIGATION TABS */}
        <div className="px-5 pt-3 bg-[#111116] border-b border-white/5 flex items-center gap-2 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('dados')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer border ${
              activeTab === 'dados'
                ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20'
                : 'bg-white/5 text-slate-400 border-transparent hover:text-white hover:bg-white/10'
            }`}
          >
            <User size={15} />
            Dados do Contrato & Motorista
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('veiculo')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer border ${
              activeTab === 'veiculo'
                ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20'
                : 'bg-white/5 text-slate-400 border-transparent hover:text-white hover:bg-white/10'
            }`}
          >
            <ArrowRightLeft size={15} />
            Vinculação de Carro
            {houveMudancaVeiculo && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('financeiro')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer border ${
              activeTab === 'financeiro'
                ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20'
                : 'bg-white/5 text-slate-400 border-transparent hover:text-white hover:bg-white/10'
            }`}
          >
            <Receipt size={15} />
            Saldo Já Pago & Total Registrado ({totaisFinanceiros.totalParcelas})
          </button>
        </div>

        {/* CONTENT */}
        <form onSubmit={handleSubmitGeral} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-xs text-slate-200">
          {/* ========================================================= */}
          {/* ABA 1: DADOS DO CONTRATO & MOTORISTA                      */}
          {/* ========================================================= */}
          {activeTab === 'dados' && (
            <div className="space-y-6">
              {/* DADOS DO MOTORISTA */}
              <div className="bg-white/[0.02] p-4 rounded-xl border border-white/5 space-y-4">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <User size={15} className="text-blue-400" /> Identificação do Motorista
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Nome do Motorista *
                    </label>
                    <input
                      type="text"
                      required
                      value={motoristaNome}
                      onChange={(e) => setMotoristaNome(e.target.value)}
                      className="w-full bg-[#161722] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      CPF do Motorista
                    </label>
                    <input
                      type="text"
                      value={motoristaCpf}
                      onChange={(e) => setMotoristaCpf(e.target.value)}
                      placeholder="000.000.000-00"
                      className="w-full bg-[#161722] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Telefone / WhatsApp
                    </label>
                    <input
                      type="text"
                      value={motoristaTelefone}
                      onChange={(e) => setMotoristaTelefone(e.target.value)}
                      placeholder="(18) 99999-0000"
                      className="w-full bg-[#161722] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Aplicativo de Atuação
                    </label>
                    <select
                      value={motoristaApp}
                      onChange={(e) => setMotoristaApp(e.target.value as any)}
                      className="w-full bg-[#161722] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition cursor-pointer"
                    >
                      <option value="Uber">Uber</option>
                      <option value="99">99</option>
                      <option value="Indrive">Indrive</option>
                      <option value="Misto">Misto</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Status do Contrato
                    </label>
                    <select
                      value={statusContrato}
                      onChange={(e) => setStatusContrato(e.target.value as any)}
                      className="w-full bg-[#161722] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition cursor-pointer"
                    >
                      <option value="Ativo">Ativo (Em andamento regular)</option>
                      <option value="Inadimplente">Inadimplente (Com pendências)</option>
                      <option value="Encerrado">Encerrado / Devolvido</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* CONDIÇÕES DE COBRANÇA */}
              <div className="bg-white/[0.02] p-4 rounded-xl border border-white/5 space-y-4">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <DollarSign size={15} className="text-emerald-400" /> Condições do Aluguel
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Valor Semanal (R$) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={valorSemanal}
                      onChange={(e) => setValorSemanal(parseFloat(e.target.value) || 0)}
                      className="w-full bg-[#161722] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Dia de Cobrança Semanal
                    </label>
                    <select
                      value={diaCobranca}
                      onChange={(e) => setDiaCobranca(e.target.value as any)}
                      className="w-full bg-[#161722] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition cursor-pointer"
                    >
                      <option value="Segunda-feira">Segunda-feira</option>
                      <option value="Terça-feira">Terça-feira</option>
                      <option value="Quarta-feira">Quarta-feira</option>
                      <option value="Quinta-feira">Quinta-feira</option>
                      <option value="Sexta-feira">Sexta-feira</option>
                      <option value="Sábado">Sábado</option>
                      <option value="Domingo">Domingo</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Data de Início do Contrato
                    </label>
                    <input
                      type="date"
                      value={dataInicio}
                      onChange={(e) => setDataInicio(e.target.value)}
                      className="w-full bg-[#161722] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Data Prevista de Término
                    </label>
                    <input
                      type="date"
                      value={dataFimPrevista}
                      onChange={(e) => setDataFimPrevista(e.target.value)}
                      className="w-full bg-[#161722] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition"
                    />
                  </div>
                </div>
              </div>

              {/* REGRAS OPERACIONAIS DE KM & MULTAS */}
              <div className="bg-white/[0.02] p-4 rounded-xl border border-white/5 space-y-4">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <BadgeAlert size={15} className="text-amber-400" /> Regras de KM & Penalidades
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Limite Semanal (KM)
                    </label>
                    <input
                      type="number"
                      value={limiteKmSemanal}
                      onChange={(e) => setLimiteKmSemanal(parseInt(e.target.value) || 0)}
                      placeholder="1750"
                      className="w-full bg-[#161722] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Multa por KM Excedente (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={valorMultaPorKmExcedente}
                      onChange={(e) => setValorMultaPorKmExcedente(parseFloat(e.target.value) || 0)}
                      placeholder="1.20"
                      className="w-full bg-[#161722] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Multa por Atraso (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={percentualMultaAtraso}
                      onChange={(e) => setPercentualMultaAtraso(parseFloat(e.target.value) || 0)}
                      placeholder="40"
                      className="w-full bg-[#161722] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Data Início Medição KM (Corte)
                    </label>
                    <input
                      type="date"
                      value={dataInicioMedicaoKm}
                      onChange={(e) => setDataInicioMedicaoKm(e.target.value)}
                      className="w-full bg-[#161722] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition"
                    />
                  </div>
                </div>
              </div>

              {/* CAUÇÃO & SALDOS DE GARANTIA */}
              <div className="bg-white/[0.02] p-4 rounded-xl border border-white/5 space-y-4">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <ShieldCheck size={15} className="text-purple-400" /> Caução de Garantia
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Caução Total Exigido (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={caucao}
                      onChange={(e) => setCaucao(parseFloat(e.target.value) || 0)}
                      className="w-full bg-[#161722] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Caução Já Pago pelo Motorista (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={caucaoTotalPago}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setCaucaoTotalPago(val);
                        setCaucaoSaldoAtual(Math.max(0, val - (caucaoUtilizado || 0)));
                      }}
                      className="w-full bg-[#161722] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Caução Utilizado / Abatido (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={caucaoUtilizado}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setCaucaoUtilizado(val);
                        setCaucaoSaldoAtual(Math.max(0, (caucaoTotalPago || 0) - val));
                      }}
                      className="w-full bg-[#161722] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Saldo Atual da Caução (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={caucaoSaldoAtual}
                      onChange={(e) => setCaucaoSaldoAtual(parseFloat(e.target.value) || 0)}
                      className="w-full bg-[#161722] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono transition"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* ABA 2: VINCULAÇÃO / TROCA DE VEÍCULO                      */}
          {/* ========================================================= */}
          {activeTab === 'veiculo' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 flex items-start gap-3">
                <ArrowRightLeft size={20} className="shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-bold text-xs">Transferência e Vinculação de Carro</h5>
                  <p className="text-[11px] text-blue-200/80 mt-1 leading-relaxed">
                    Você pode transferir este contrato ativo para outro veículo da frota. Caso selecione outro carro, o contrato será automaticamente transferido com todo o histórico de pagamentos, e o veículo anterior voltará para o status <strong>Disponível</strong>.
                  </p>
                </div>
              </div>

              {/* CARD VEÍCULO ATUAL */}
              <div className="bg-[#13141d] p-4 rounded-xl border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                    <Car size={24} />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Veículo Atualmente Vinculado</span>
                    <h4 className="font-extrabold text-sm text-white">{veiculo.modelo} ({veiculo.marca})</h4>
                    <span className="font-mono font-bold text-blue-400 text-xs">{veiculo.placa}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">KM Atual</span>
                  <strong className="font-mono text-emerald-400 text-sm">
                    {veiculo.kmAtual?.toLocaleString('pt-BR')} KM
                  </strong>
                </div>
              </div>

              {/* SELETOR DE NOVO VEÍCULO */}
              <div className="bg-white/[0.02] p-5 rounded-xl border border-white/5 space-y-4">
                <label className="block text-xs font-bold text-slate-200">
                  Selecione o Veículo Destino para este Contrato:
                </label>

                <select
                  value={targetVeiculoId}
                  onChange={(e) => setTargetVeiculoId(e.target.value)}
                  className="w-full bg-[#161722] border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-blue-500 transition cursor-pointer"
                >
                  <option value={veiculo.id}>
                    Manter no veículo atual: {veiculo.placa} - {veiculo.modelo} ({veiculo.status})
                  </option>
                  {todosVeiculos
                    .filter((v) => v.id !== veiculo.id)
                    .map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.placa} - {v.modelo} ({v.marca}) • Status: {v.status} • {v.kmAtual || v.km || 0} KM
                      </option>
                    ))}
                </select>

                {houveMudancaVeiculo && (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 space-y-2 animate-fadeIn">
                    <div className="flex items-center gap-2 font-bold text-xs">
                      <AlertTriangle size={16} className="text-amber-400" />
                      <span>Atenção: Transferência Selecionada!</span>
                    </div>
                    <p className="text-[11px] text-amber-200/90 leading-relaxed">
                      Ao salvar, o veículo <strong>{veiculo.placa}</strong> será desvinculado e ficará <strong>Disponível</strong>. O veículo <strong>{veiculoAlvo.placa}</strong> passará a ser <strong>Alugado</strong> para <strong>{motoristaNome}</strong>.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* ABA 3: SALDO JÁ PAGO & TOTAL REGISTRADO                   */}
          {/* ========================================================= */}
          {activeTab === 'financeiro' && (
            <div className="space-y-6">
              {/* SUMMARY CARDS */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-[#13141d] p-3.5 rounded-xl border border-white/10">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Já Pago</span>
                  <h4 className="font-mono font-black text-emerald-400 text-sm sm:text-base mt-1">
                    {formatCurrency(totaisFinanceiros.totalGeralPagoRegistrado)}
                  </h4>
                  <span className="text-[9px] text-slate-500 mt-0.5 block">Aluguéis + Caução</span>
                </div>

                <div className="bg-[#13141d] p-3.5 rounded-xl border border-white/10">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Aluguéis Quitados</span>
                  <h4 className="font-mono font-black text-emerald-400 text-sm sm:text-base mt-1">
                    {formatCurrency(totaisFinanceiros.totalPagoAlugueis)}
                  </h4>
                  <span className="text-[9px] text-slate-500 mt-0.5 block">
                    {totaisFinanceiros.countPagos} parcelas pagas
                  </span>
                </div>

                <div className="bg-[#13141d] p-3.5 rounded-xl border border-white/10">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Caução Registrado</span>
                  <h4 className="font-mono font-black text-purple-300 text-sm sm:text-base mt-1">
                    {formatCurrency(Number(caucaoTotalPago || 0))}
                  </h4>
                  <span className="text-[9px] text-slate-500 mt-0.5 block">
                    Saldo disponível: {formatCurrency(Number(caucaoSaldoAtual || 0))}
                  </span>
                </div>

                <div className="bg-[#13141d] p-3.5 rounded-xl border border-white/10">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Pendentes / Atrasadas</span>
                  <h4 className="font-mono font-black text-rose-400 text-sm sm:text-base mt-1">
                    {formatCurrency(totaisFinanceiros.totalPendenteAlugueis + totaisFinanceiros.totalAtrasadoAlugueis)}
                  </h4>
                  <span className="text-[9px] text-slate-500 mt-0.5 block">
                    {totaisFinanceiros.countPendentes + totaisFinanceiros.countAtrasados} parcelas
                  </span>
                </div>
              </div>

              {/* ACTION BAR: ADICIONAR / REGULARIZAR */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white/[0.02] p-3 rounded-xl border border-white/5">
                <div>
                  <h5 className="font-bold text-xs text-white">Grade de Cobranças Registradas</h5>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Edite valores, alterne entre pago/pendente ou adicione semanas pagas retroativamente para regularizar o saldo do contrato.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setMostrarNovoLancamento(!mostrarNovoLancamento)}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-blue-600/20 cursor-pointer"
                >
                  <Plus size={14} /> Adicionar Parcela Retroativa
                </button>
              </div>

              {/* FORMULÁRIO DE NOVA PARCELA RETROATIVA */}
              {mostrarNovoLancamento && (
                <div className="p-4 rounded-xl bg-[#141520] border border-blue-500/30 space-y-4 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-blue-300 flex items-center gap-2">
                      <Plus size={14} /> Nova Parcela / Registro Histórico
                    </span>
                    <button
                      type="button"
                      onClick={() => setMostrarNovoLancamento(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-300 mb-1">
                        Semana / Descrição *
                      </label>
                      <input
                        type="text"
                        value={novoSemanaRef}
                        onChange={(e) => setNovoSemanaRef(e.target.value)}
                        placeholder="Ex: Semana 1 (Retroativa)"
                        className="w-full bg-[#0a0a0d] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-300 mb-1">
                        Valor (R$) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={novoValor}
                        onChange={(e) => setNovoValor(parseFloat(e.target.value) || 0)}
                        className="w-full bg-[#0a0a0d] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-300 mb-1">
                        Status
                      </label>
                      <select
                        value={novoStatus}
                        onChange={(e) => setNovoStatus(e.target.value as any)}
                        className="w-full bg-[#0a0a0d] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                      >
                        <option value="Pago">Pago</option>
                        <option value="Pendente">Pendente</option>
                        <option value="Atrasado">Atrasado</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-300 mb-1">
                        Vencimento
                      </label>
                      <input
                        type="date"
                        value={novoVencimento}
                        onChange={(e) => setNovoVencimento(e.target.value)}
                        className="w-full bg-[#0a0a0d] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-300 mb-1">
                        Método
                      </label>
                      <select
                        value={novoMetodo}
                        onChange={(e) => setNovoMetodo(e.target.value as any)}
                        className="w-full bg-[#0a0a0d] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                      >
                        <option value="PIX">PIX</option>
                        <option value="Dinheiro">Dinheiro</option>
                        <option value="Transferência">Transferência</option>
                        <option value="Boleto">Boleto</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                    <button
                      type="button"
                      onClick={() => setMostrarNovoLancamento(false)}
                      className="px-3 py-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white text-xs"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleAdicionarParcela}
                      className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5"
                    >
                      <Check size={14} /> Salvar Parcela na Grade
                    </button>
                  </div>
                </div>
              )}

              {/* LISTA / TABELA DE PARCELAS REGISTRADAS */}
              <div className="bg-[#111116] rounded-xl border border-white/5 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#161720] text-slate-400 uppercase text-[10px] font-bold border-b border-white/5">
                      <tr>
                        <th className="p-3">Referência</th>
                        <th className="p-3">Vencimento</th>
                        <th className="p-3">Valor (R$)</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Data Pagamento</th>
                        <th className="p-3">Método</th>
                        <th className="p-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {pagamentosList.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-500">
                            Nenhum pagamento registrado nesta grade ainda.
                          </td>
                        </tr>
                      ) : (
                        pagamentosList.map((pag) => {
                          const isEdit = editingPagId === pag.id;

                          return (
                            <tr
                              key={pag.id}
                              className={`transition hover:bg-white/[0.02] ${
                                pag.status === 'Pago' ? 'bg-emerald-500/[0.02]' : ''
                              }`}
                            >
                              <td className="p-3 font-semibold text-white">
                                {isEdit ? (
                                  <input
                                    type="text"
                                    value={pag.semanaReferencia}
                                    onChange={(e) =>
                                      handleUpdatePagamentoCampo(pag.id, 'semanaReferencia', e.target.value)
                                    }
                                    className="bg-[#0e0f15] border border-white/10 rounded px-2 py-1 text-xs text-white"
                                  />
                                ) : (
                                  pag.semanaReferencia
                                )}
                              </td>

                              <td className="p-3 text-slate-400">
                                {isEdit ? (
                                  <input
                                    type="date"
                                    value={pag.dataVencimento || ''}
                                    onChange={(e) =>
                                      handleUpdatePagamentoCampo(pag.id, 'dataVencimento', e.target.value)
                                    }
                                    className="bg-[#0e0f15] border border-white/10 rounded px-2 py-1 text-xs text-white"
                                  />
                                ) : (
                                  formatDate(pag.dataVencimento)
                                )}
                              </td>

                              <td className="p-3 font-mono font-bold">
                                {isEdit ? (
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={pag.valor}
                                    onChange={(e) =>
                                      handleUpdatePagamentoCampo(pag.id, 'valor', parseFloat(e.target.value) || 0)
                                    }
                                    className="w-24 bg-[#0e0f15] border border-white/10 rounded px-2 py-1 text-xs text-white font-mono"
                                  />
                                ) : (
                                  <span className={pag.status === 'Pago' ? 'text-emerald-400' : 'text-slate-200'}>
                                    {formatCurrency(pag.valor)}
                                  </span>
                                )}
                              </td>

                              <td className="p-3">
                                <button
                                  type="button"
                                  onClick={() => handleToggleStatusPagamento(pag.id)}
                                  className={`px-2.5 py-1 rounded text-[10px] font-black border transition cursor-pointer ${
                                    pag.status === 'Pago'
                                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30'
                                      : pag.status === 'Atrasado'
                                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/30 hover:bg-rose-500/30'
                                      : 'bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/30'
                                  }`}
                                  title="Clique para alternar entre Pago / Pendente / Atrasado"
                                >
                                  {pag.status === 'Pago' ? '✓ Pago' : pag.status === 'Atrasado' ? '! Atrasado' : '⏳ Pendente'}
                                </button>
                              </td>

                              <td className="p-3 text-slate-400">
                                {isEdit ? (
                                  <input
                                    type="date"
                                    value={pag.dataPagamento || ''}
                                    onChange={(e) =>
                                      handleUpdatePagamentoCampo(pag.id, 'dataPagamento', e.target.value)
                                    }
                                    className="bg-[#0e0f15] border border-white/10 rounded px-2 py-1 text-xs text-white"
                                  />
                                ) : (
                                  pag.dataPagamento ? formatDate(pag.dataPagamento) : '-'
                                )}
                              </td>

                              <td className="p-3 text-slate-400">
                                {isEdit ? (
                                  <select
                                    value={pag.metodoPagamento || 'PIX'}
                                    onChange={(e) =>
                                      handleUpdatePagamentoCampo(pag.id, 'metodoPagamento', e.target.value)
                                    }
                                    className="bg-[#0e0f15] border border-white/10 rounded px-2 py-1 text-xs text-white"
                                  >
                                    <option value="PIX">PIX</option>
                                    <option value="Dinheiro">Dinheiro</option>
                                    <option value="Transferência">Transferência</option>
                                    <option value="Boleto">Boleto</option>
                                  </select>
                                ) : (
                                  pag.metodoPagamento || 'PIX'
                                )}
                              </td>

                              <td className="p-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setEditingPagId(isEdit ? null : pag.id)}
                                    className={`p-1.5 rounded-lg border transition cursor-pointer ${
                                      isEdit
                                        ? 'bg-blue-600 text-white border-blue-500'
                                        : 'bg-white/5 text-slate-400 hover:text-white border-white/5 hover:bg-white/10'
                                    }`}
                                    title={isEdit ? 'Concluir edição da linha' : 'Editar dados da linha'}
                                  >
                                    {isEdit ? <Check size={13} /> : <Edit2 size={13} />}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleRemoverPagamento(pag.id)}
                                    className="p-1.5 rounded-lg bg-white/5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 border border-white/5 transition cursor-pointer"
                                    title="Remover lançamento"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* FOOTER ACTIONS */}
          <div className="pt-4 flex flex-wrap items-center justify-between border-t border-white/10 gap-3">
            <div className="flex items-center gap-3 text-xs text-slate-400">
              {onExcluirContrato && (
                <button
                  type="button"
                  onClick={() => {
                    if (
                      window.confirm(
                        `ATENÇÃO: Deseja apagar permanentemente este registro de contrato do banco de dados?\n\nMotorista: ${contrato.motoristaNome}\nVeículo: ${veiculo.placa}\n\nUse esta opção se o contrato foi cadastrado por engano. O carro voltará a ficar disponível e o contrato será excluído.`
                      )
                    ) {
                      onExcluirContrato(veiculo.id, contrato.id);
                      onClose();
                    }
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-400/80 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 transition flex items-center gap-1.5 cursor-pointer"
                  title="Apagar contrato incorreto do banco de dados"
                >
                  <Trash2 size={13} /> Excluir Contrato (Lixeira)
                </button>
              )}

              {houveMudancaVeiculo && (
                <span className="text-amber-400 font-semibold flex items-center gap-1">
                  <AlertTriangle size={14} /> Contrato será transferido para {veiculoAlvo.placa}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition flex items-center gap-2 shadow-lg shadow-blue-600/25 cursor-pointer"
              >
                <Save size={15} />
                {isSaving ? 'Salvando...' : 'Salvar Todas as Alterações'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
