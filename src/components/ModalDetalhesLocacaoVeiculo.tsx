import React, { useState, useMemo } from 'react';
import {
  X,
  Car,
  TrendingUp,
  DollarSign,
  Wrench,
  FileText,
  Calendar,
  User,
  Phone,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Edit3,
  Save,
  Plus,
  ArrowRight,
  ShieldCheck,
  Tag,
  Key,
  PieChart,
  Coins,
  Receipt,
  HelpCircle
} from 'lucide-react';
import { Veiculo, ContratoLocacao } from '../types';
import {
  formatCurrency,
  formatDate,
  formatKm,
  calcularMetricasLocacaoVeiculo,
  MetricasLocacaoVeiculo
} from '../utils/formatters';
import { ModalEditarContratoAtivo } from './ModalEditarContratoAtivo';

interface ModalDetalhesLocacaoVeiculoProps {
  isOpen?: boolean;
  veiculo: Veiculo;
  onClose: () => void;
  onSaveVeiculo?: (updatedVeiculo: Veiculo) => void;
  onUpdateVeiculo?: (updatedVeiculo: Veiculo) => void;
  onOpenNovoContrato?: (veiculo: Veiculo) => void;
  onOpenCadastrarDespesa?: (veiculo: Veiculo) => void;
  onOpenNovaDespesa?: (veiculo: Veiculo) => void;
  onOpenLancamentoExpresso?: (options?: { tipo?: 'Entrada' | 'Saída'; destino?: 'veiculo_locacao'; placa?: string; pagador?: string }) => void;
  todosVeiculos?: Veiculo[];
  onSalvarEdicaoContrato?: (
    veiculoAntigoId: string,
    veiculoNovoId: string,
    contratoAtualizado: ContratoLocacao
  ) => Promise<void> | void;
}

export const ModalDetalhesLocacaoVeiculo: React.FC<ModalDetalhesLocacaoVeiculoProps> = ({
  isOpen = true,
  veiculo,
  onClose,
  onSaveVeiculo,
  onUpdateVeiculo,
  onOpenNovoContrato,
  onOpenCadastrarDespesa,
  onOpenNovaDespesa,
  onOpenLancamentoExpresso,
  todosVeiculos = [],
  onSalvarEdicaoContrato,
}) => {
  const [activeTab, setActiveTab] = useState<'roi' | 'manutencoes' | 'receitas' | 'editar'>('roi');
  const [modalEditarContratoOpen, setModalEditarContratoOpen] = useState(false);

  // Form State for Editing Vehicle
  const [editModelo, setEditModelo] = useState(veiculo.modelo || '');
  const [editMarca, setEditMarca] = useState(veiculo.marca || '');
  const [editPlaca, setEditPlaca] = useState(veiculo.placa || '');
  const [editAnoFabricacao, setEditAnoFabricacao] = useState(veiculo.anoFabricacao || '');
  const [editAnoModelo, setEditAnoModelo] = useState(veiculo.anoModelo || '');
  const [editCor, setEditCor] = useState(veiculo.cor || '');
  const [editKm, setEditKm] = useState(veiculo.km || 0);
  const [editCustoAquisicao, setEditCustoAquisicao] = useState(veiculo.custoAquisicao || 0);
  const [editTipoOperacao, setEditTipoOperacao] = useState<'Locacao' | 'Venda'>(
    veiculo.tipoOperacao === 'Venda' ? 'Venda' : 'Locacao'
  );
  const [editObservacoes, setEditObservacoes] = useState(veiculo.observacoes || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Metricas de ROI e Break-even
  const metricas: MetricasLocacaoVeiculo = useMemo(() => {
    return calcularMetricasLocacaoVeiculo(veiculo);
  }, [veiculo]);

  const contratoAtivo = veiculo.contratoAtivo && veiculo.contratoAtivo.status === 'Ativo' ? veiculo.contratoAtivo : null;

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updated: Veiculo = {
        ...veiculo,
        modelo: editModelo.trim(),
        marca: editMarca.trim(),
        placa: editPlaca.trim().toUpperCase(),
        anoFabricacao: editAnoFabricacao ? Number(editAnoFabricacao) : undefined,
        anoModelo: editAnoModelo ? Number(editAnoModelo) : undefined,
        cor: editCor.trim(),
        km: Number(editKm) || 0,
        custoAquisicao: Number(editCustoAquisicao) || 0,
        tipoOperacao: editTipoOperacao,
        observacoes: editObservacoes.trim(),
      };
      await onSaveVeiculo(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Erro ao salvar veículo de locação:', err);
      alert('Erro ao salvar alterações no veículo.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#0f1015] rounded-2xl shadow-2xl overflow-hidden border border-white/10">
        
        {/* TOP HEADER */}
        <div className="bg-[#16171f] text-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-600/30 shrink-0">
              <Car size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="font-extrabold text-lg sm:text-xl text-white">
                  {veiculo.modelo}
                </h3>
                {/* Placa Mercosul Badge */}
                <div className="inline-flex items-center bg-white text-black font-mono font-black text-xs px-2.5 py-0.5 rounded border-2 border-blue-600 tracking-wider shadow-sm">
                  {veiculo.placa}
                </div>
                {/* Finalidade Badge */}
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  veiculo.tipoOperacao === 'Venda' 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                    : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                }`}>
                  {veiculo.tipoOperacao === 'Venda' ? '🏷️ Venda' : '🚗 Frota Locação'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                <span>{veiculo.marca}</span>
                <span>•</span>
                <span>Ano {veiculo.anoFabricacao || veiculo.anoModelo || 'N/A'}/{veiculo.anoModelo || 'N/A'}</span>
                <span>•</span>
                <span>{veiculo.cor || 'Cor N/A'}</span>
                <span>•</span>
                <span className="font-mono text-slate-300">{formatKm(veiculo.km)}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {contratoAtivo ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Em Locação Ativa
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                Disponível na Frota
              </span>
            )}

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* MOTORISTA ATUAL BAR (IF ACTIVE CONTRACT) */}
        {contratoAtivo && (
          <div className="bg-[#13141c] px-5 py-3 border-b border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400 font-bold">
                <User size={14} />
              </div>
              <div>
                <span className="text-slate-400">Motorista Ativo: </span>
                <strong className="text-white ml-1">{contratoAtivo.motoristaNome}</strong>
                {contratoAtivo.motoristaApp && (
                  <span className="ml-2 px-2 py-0.2 rounded bg-white/10 text-slate-300 text-[10px] font-semibold">
                    {contratoAtivo.motoristaApp}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-slate-300">
                <Calendar size={13} className="text-slate-500" />
                <span>Início: <strong>{formatDate(contratoAtivo.dataInicio)}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold font-mono">
                <DollarSign size={13} />
                <span>{formatCurrency(contratoAtivo.valorSemanal)}/semana</span>
              </div>
              {contratoAtivo.motoristaTelefone && (
                <a
                  href={`https://wa.me/55${contratoAtivo.motoristaTelefone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white border border-emerald-500/30 transition flex items-center gap-1 font-semibold"
                >
                  <Phone size={12} /> WhatsApp
                </a>
              )}
              <button
                type="button"
                onClick={() => setModalEditarContratoOpen(true)}
                className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white border border-blue-400/30 transition flex items-center gap-1.5 font-bold text-xs cursor-pointer shadow-md shadow-blue-600/20"
                title="Editar dados do contrato ativo, alterar carro vinculado e histórico/saldos pagos"
              >
                <Edit3 size={13} /> Editar Contrato
              </button>
            </div>
          </div>
        )}

        {/* NAVIGATION TABS */}
        <div className="px-5 pt-3 bg-[#111116] border-b border-white/5 flex items-center gap-2 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('roi')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer border ${
              activeTab === 'roi'
                ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20'
                : 'bg-white/5 text-slate-400 border-transparent hover:text-white hover:bg-white/10'
            }`}
          >
            <TrendingUp size={15} />
            Cálculo de ROI & Break-Even
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('manutencoes')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer border ${
              activeTab === 'manutencoes'
                ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20'
                : 'bg-white/5 text-slate-400 border-transparent hover:text-white hover:bg-white/10'
            }`}
          >
            <Wrench size={15} />
            Histórico de Manutenções ({metricas.despesasManutencaoList.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('receitas')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer border ${
              activeTab === 'receitas'
                ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20'
                : 'bg-white/5 text-slate-400 border-transparent hover:text-white hover:bg-white/10'
            }`}
          >
            <Receipt size={15} />
            Receitas de Aluguel ({metricas.pagamentosRecebidosList.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('editar')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer border ${
              activeTab === 'editar'
                ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20'
                : 'bg-white/5 text-slate-400 border-transparent hover:text-white hover:bg-white/10'
            }`}
          >
            <Edit3 size={15} />
            Editar Veículo & Finalidade
          </button>
        </div>

        {/* TAB CONTENTS */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-xs bg-[#0a0a0c]">
          
          {/* ========================================================= */}
          {/* 1. ABA: CÁLCULO DE ROI E MÉTRICAS DE FROTA (BREAK-EVEN)   */}
          {/* ========================================================= */}
          {activeTab === 'roi' && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* STATUS DESTAQUE DO BREAK-EVEN */}
              <div className={`p-6 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-5 ${
                metricas.atingiuBreakEven
                  ? 'bg-gradient-to-br from-emerald-950/40 via-[#12201b] to-[#0d1613] border-emerald-500/40 shadow-xl shadow-emerald-950/20'
                  : 'bg-gradient-to-br from-blue-950/40 via-[#13192a] to-[#0e121d] border-blue-500/40 shadow-xl shadow-blue-950/20'
              }`}>
                <div className="space-y-2 max-w-xl">
                  <div className="flex items-center gap-2">
                    {metricas.atingiuBreakEven ? (
                      <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 size={20} />
                      </span>
                    ) : (
                      <span className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
                        <Clock size={20} />
                      </span>
                    )}
                    <span className={`font-black uppercase tracking-wider text-xs ${
                      metricas.atingiuBreakEven ? 'text-emerald-400' : 'text-blue-400'
                    }`}>
                      {metricas.atingiuBreakEven 
                        ? '🎉 Ponto de Equilíbrio Atingido (Break-Even Superado)' 
                        : '⏳ Em Amortização do Investimento'}
                    </span>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-black text-white">
                    {metricas.atingiuBreakEven ? (
                      <span>Veículo 100% Pago • Lucro Líquido: <strong className="text-emerald-400 font-mono">+{formatCurrency(metricas.lucroLiquidoExcedente)}</strong></span>
                    ) : (
                      <span>Faltam <strong className="text-blue-400 font-mono">{formatCurrency(metricas.valorFaltanteBreakEven)}</strong> para o carro se pagar</span>
                    )}
                  </h3>

                  <p className="text-slate-400 text-xs leading-relaxed">
                    {metricas.atingiuBreakEven ? (
                      'Este veículo já cobriu integralmente o custo de compra e todas as manutenções registradas. Todas as novas locações geram lucro operacional líquido para a empresa.'
                    ) : (
                      'O veículo está em fase de retorno financeiro. Os aluguéis semanais pagos pelos motoristas estão amortizando o valor de aquisição e manutenções.'
                    )}
                  </p>

                  {/* Previsão de Semanas */}
                  {!metricas.atingiuBreakEven && metricas.semanasEstimadasParaBreakEven !== null && (
                    <div className="pt-2 text-xs font-medium text-amber-300 flex items-center gap-2 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
                      <Clock size={14} className="shrink-0 text-amber-400" />
                      <span>
                        Previsão de Break-Even: <strong>~{metricas.semanasEstimadasParaBreakEven} semanas</strong> (~{(metricas.semanasEstimadasParaBreakEven / 4.33).toFixed(1)} meses) mantendo o aluguel semanal de {formatCurrency(veiculo.contratoAtivo?.valorSemanal || 0)}.
                      </span>
                    </div>
                  )}
                </div>

                {/* KPI Card Saldo Final */}
                <div className="bg-black/40 p-4 rounded-xl border border-white/10 text-right min-w-[200px] shrink-0 self-stretch md:self-auto flex flex-col justify-center">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    Saldo (Receitas - Custos)
                  </span>
                  <div className={`text-2xl font-black font-mono mt-1 ${
                    metricas.saldoBreakEven >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {metricas.saldoBreakEven >= 0 ? '+' : ''}{formatCurrency(metricas.saldoBreakEven)}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1">
                    Amortização: <strong className="text-white font-mono">{metricas.percentualAmortizacao.toFixed(1)}%</strong>
                  </span>
                </div>
              </div>

              {/* BARRA DE PROGRESSO DE AMORTIZAÇÃO */}
              <div className="bg-[#111116] p-5 rounded-2xl border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs flex items-center gap-2">
                    <PieChart size={15} className="text-blue-400" />
                    Progresso de Amortização do Veículo
                  </span>
                  <span className="font-mono font-bold text-xs text-white">
                    {formatCurrency(metricas.receitaTotalAcumulada)} / {formatCurrency(metricas.custoTotalVeiculo)}
                  </span>
                </div>

                <div className="w-full bg-white/5 h-3 rounded-full overflow-hidden p-0.5 border border-white/5 relative">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      metricas.atingiuBreakEven
                        ? 'bg-gradient-to-r from-blue-500 to-emerald-500'
                        : 'bg-gradient-to-r from-blue-600 to-indigo-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, metricas.percentualAmortizacao))}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>0% (Início)</span>
                  <span>50% (Metade)</span>
                  <span className={metricas.atingiuBreakEven ? 'text-emerald-400 font-bold' : ''}>
                    100% (Ponto de Equilíbrio / Break-Even)
                  </span>
                  {metricas.percentualAmortizacao > 100 && (
                    <span className="text-emerald-400 font-bold">
                      {(metricas.percentualAmortizacao - 100).toFixed(1)}% Excedente (Lucro)
                    </span>
                  )}
                </div>
              </div>

              {/* CARDS COM AS 4 MÉTRICAS SOLICITADAS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* 1. Custo Total de Aquisição */}
                <div className="bg-[#111116] p-4 rounded-2xl border border-white/5 space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Custo de Aquisição</span>
                    <DollarSign size={16} className="text-rose-400" />
                  </div>
                  <div className="text-xl font-black text-rose-400 font-mono">
                    {formatCurrency(metricas.custoAquisicao)}
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Valor de compra do carro no estoque próprio.
                  </p>
                </div>

                {/* 2. Histórico de Manutenções & Revisões */}
                <div className="bg-[#111116] p-4 rounded-2xl border border-white/5 space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Manutenções & Peças</span>
                    <Wrench size={16} className="text-amber-400" />
                  </div>
                  <div className="text-xl font-black text-amber-400 font-mono">
                    {formatCurrency(metricas.totalDespesasManutencao)}
                  </div>
                  <p className="text-[10px] text-slate-400">
                    {metricas.despesasManutencaoList.length} serviço(s) e revisão(ões) periódicas.
                  </p>
                </div>

                {/* 3. Custo Total Acumulado (Veículo + Gastos) */}
                <div className="bg-[#111116] p-4 rounded-2xl border border-white/5 space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Custo Total Acumulado</span>
                    <Coins size={16} className="text-purple-400" />
                  </div>
                  <div className="text-xl font-black text-purple-400 font-mono">
                    {formatCurrency(metricas.custoTotalVeiculo)}
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Compra + Manutenções + Custos Operacionais.
                  </p>
                </div>

                {/* 4. Receita Gerada (Aluguéis Pagos) */}
                <div className="bg-[#111116] p-4 rounded-2xl border border-white/5 space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Receita Gerada (Aluguéis)</span>
                    <TrendingUp size={16} className="text-emerald-400" />
                  </div>
                  <div className="text-xl font-black text-emerald-400 font-mono">
                    {formatCurrency(metricas.receitaTotalAcumulada)}
                  </div>
                  <p className="text-[10px] text-slate-400">
                    {metricas.pagamentosRecebidosList.length} aluguel(is) semanal(is) quitados.
                  </p>
                </div>
              </div>

              {/* BOTÕES DE AÇÃO RÁPIDA */}
              <div className="bg-[#111116] p-4 rounded-2xl border border-white/5 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-slate-400">
                  <span>Ações Rápidas da Frota de Locação:</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {onOpenCadastrarDespesa && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenCadastrarDespesa(veiculo);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-amber-600/20 text-amber-300 hover:bg-amber-600 hover:text-white border border-amber-500/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus size={14} /> Registrar Manutenção / Despesa
                    </button>
                  )}

                  {onOpenLancamentoExpresso && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenLancamentoExpresso({
                          tipo: 'Entrada',
                          destino: 'veiculo_locacao',
                          placa: veiculo.placa,
                          pagador: contratoAtivo?.motoristaNome
                        });
                      }}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600 hover:text-white border border-emerald-500/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus size={14} /> Lançar Pagamento / Aluguel
                    </button>
                  )}

                  {!contratoAtivo && onOpenNovoContrato && (
                    <button
                      type="button"
                      onClick={() => onOpenNovoContrato(veiculo)}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-blue-600/20 cursor-pointer"
                    >
                      <Key size={14} /> Alugar este Veículo (Novo Contrato)
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 2. ABA: HISTÓRICO DE MANUTENÇÕES & REVISÕES               */}
          {/* ========================================================= */}
          {activeTab === 'manutencoes' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white text-sm">Histórico de Manutenções e Revisões</h4>
                  <p className="text-slate-400 text-xs">
                    Custos de oficina mecânica, peças, revisões periódicas e serviços agregados ao veículo.
                  </p>
                </div>
                {onOpenCadastrarDespesa && (
                  <button
                    type="button"
                    onClick={() => onOpenCadastrarDespesa(veiculo)}
                    className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus size={14} /> Nova Despesa de Oficina
                  </button>
                )}
              </div>

              {metricas.despesasManutencaoList.length === 0 ? (
                <div className="bg-[#111116] p-8 rounded-2xl border border-white/5 text-center text-slate-400">
                  <Wrench size={36} className="mx-auto text-slate-600 mb-2" />
                  <p className="font-semibold text-white">Nenhuma manutenção ou despesa registrada para este veículo.</p>
                  <p className="text-[11px] mt-1">Clique no botão acima para adicionar registros de peças, óleo ou mecânica.</p>
                </div>
              ) : (
                <div className="bg-[#111116] rounded-2xl border border-white/5 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-white/5 text-slate-400 border-b border-white/5 font-semibold">
                          <th className="p-3">Data</th>
                          <th className="p-3">Categoria</th>
                          <th className="p-3">Descrição do Serviço</th>
                          <th className="p-3">Fornecedor / Oficina</th>
                          <th className="p-3 text-right">Valor R$</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {metricas.despesasManutencaoList.map((d, idx) => (
                          <tr key={d.id || idx} className="hover:bg-white/5 transition">
                            <td className="p-3 text-slate-300 font-mono">{formatDate(d.data)}</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded bg-white/10 text-slate-200 text-[10px] font-semibold">
                                {d.categoria}
                              </span>
                            </td>
                            <td className="p-3 text-white font-medium">{d.descricao}</td>
                            <td className="p-3 text-slate-400">{d.fornecedor || 'Oficina Geral'}</td>
                            <td className="p-3 text-right font-mono font-bold text-rose-400">
                              {formatCurrency(d.valor)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-[#16171f] font-bold text-white border-t border-white/10">
                          <td colSpan={4} className="p-3 text-right">Total Acumulado em Manutenções:</td>
                          <td className="p-3 text-right font-mono font-black text-rose-400">
                            {formatCurrency(metricas.totalDespesasManutencao)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* 3. ABA: RECEITAS DE ALUGUEL (ALUGUÉIS PAGOS)              */}
          {/* ========================================================= */}
          {activeTab === 'receitas' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white text-sm">Histórico de Aluguéis Semanais / Mensais Quitados</h4>
                  <p className="text-slate-400 text-xs">
                    Entradas financeiras registradas a partir dos pagamentos dos motoristas de aplicativo.
                  </p>
                </div>
                {onOpenLancamentoExpresso && (
                  <button
                    type="button"
                    onClick={() => onOpenLancamentoExpresso({
                      tipo: 'Entrada',
                      destino: 'veiculo_locacao',
                      placa: veiculo.placa,
                      pagador: contratoAtivo?.motoristaNome
                    })}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus size={14} /> Novo Lançamento de Receita
                  </button>
                )}
              </div>

              {metricas.pagamentosRecebidosList.length === 0 ? (
                <div className="bg-[#111116] p-8 rounded-2xl border border-white/5 text-center text-slate-400">
                  <Receipt size={36} className="mx-auto text-slate-600 mb-2" />
                  <p className="font-semibold text-white">Nenhum pagamento registrado ainda para este veículo.</p>
                  <p className="text-[11px] mt-1">Conforme os motoristas quitarem as cobranças semanais, os pagamentos aparecerão aqui.</p>
                </div>
              ) : (
                <div className="bg-[#111116] rounded-2xl border border-white/5 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-white/5 text-slate-400 border-b border-white/5 font-semibold">
                          <th className="p-3">Data</th>
                          <th className="p-3">Semana Ref.</th>
                          <th className="p-3">Motorista</th>
                          <th className="p-3">Método</th>
                          <th className="p-3 text-right">Valor Pago R$</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {metricas.pagamentosRecebidosList.map((p, idx) => (
                          <tr key={p.id || idx} className="hover:bg-white/5 transition">
                            <td className="p-3 text-slate-300 font-mono">{formatDate(p.data)}</td>
                            <td className="p-3 text-white font-medium">{p.semanaReferencia}</td>
                            <td className="p-3 text-slate-300">{p.motoristaNome}</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-semibold border border-emerald-500/30">
                                {p.metodoPagamento || 'PIX'}
                              </span>
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-emerald-400">
                              {formatCurrency(p.valor)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-[#16171f] font-bold text-white border-t border-white/10">
                          <td colSpan={4} className="p-3 text-right">Total Acumulado em Receitas de Aluguel:</td>
                          <td className="p-3 text-right font-mono font-black text-emerald-400">
                            {formatCurrency(metricas.receitaTotalAcumulada)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* 4. ABA: EDITAR DADOS DO VEÍCULO & FINALIDADE              */}
          {/* ========================================================= */}
          {activeTab === 'editar' && (
            <form onSubmit={handleSaveEdit} className="space-y-5 animate-fadeIn">
              
              {/* FINALIDADE DO VEÍCULO (SELETOR) */}
              <div className="p-4 bg-[#16171f] rounded-2xl border border-white/5 space-y-3">
                <label className="block text-slate-200 font-bold text-xs uppercase tracking-wide flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Tag size={16} className="text-blue-400" />
                    Finalidade do Veículo / Destinação Operacional *
                  </span>
                  <span className="text-[10px] text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                    Separação Showroom vs Frota
                  </span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setEditTipoOperacao('Locacao')}
                    className={`p-3.5 rounded-xl border text-left transition flex items-center gap-3 cursor-pointer ${
                      editTipoOperacao === 'Locacao'
                        ? 'bg-blue-600/20 border-blue-500 text-white shadow-sm ring-1 ring-blue-500/30'
                        : 'bg-black/40 border-white/10 text-slate-400 hover:border-white/20'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold shrink-0 ${
                      editTipoOperacao === 'Locacao' ? 'bg-blue-600 text-white' : 'bg-white/10 text-slate-400'
                    }`}>
                      <Key size={18} />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-white flex items-center gap-1.5">
                        <span>Locação</span>
                        <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.2 rounded font-semibold">Frota / Mini-ERP</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Carro da frota de aluguel para motoristas (não entra no catálogo comercial de vendas).
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditTipoOperacao('Venda')}
                    className={`p-3.5 rounded-xl border text-left transition flex items-center gap-3 cursor-pointer ${
                      editTipoOperacao === 'Venda'
                        ? 'bg-emerald-600/20 border-emerald-500 text-white shadow-sm ring-1 ring-emerald-500/30'
                        : 'bg-black/40 border-white/10 text-slate-400 hover:border-white/20'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold shrink-0 ${
                      editTipoOperacao === 'Venda' ? 'bg-emerald-600 text-white' : 'bg-white/10 text-slate-400'
                    }`}>
                      <Tag size={18} />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-white flex items-center gap-1.5">
                        <span>Venda</span>
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-semibold">Showroom / Vendas</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Carro destinado à venda no estoque e catálogo da loja.
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* DADOS CADASTRAIS DO VEÍCULO */}
              <div className="p-4 bg-[#16171f] rounded-2xl border border-white/5 space-y-4">
                <h4 className="font-bold text-white text-xs uppercase tracking-wide flex items-center gap-2">
                  <Car size={16} className="text-blue-400" />
                  Dados Gerais do Veículo
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Modelo do Veículo</label>
                    <input
                      type="text"
                      required
                      value={editModelo}
                      onChange={(e) => setEditModelo(e.target.value)}
                      className="w-full bg-[#111116] border border-white/10 rounded-xl px-3.5 py-2 text-white text-xs outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Marca</label>
                    <input
                      type="text"
                      required
                      value={editMarca}
                      onChange={(e) => setEditMarca(e.target.value)}
                      className="w-full bg-[#111116] border border-white/10 rounded-xl px-3.5 py-2 text-white text-xs outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Placa</label>
                    <input
                      type="text"
                      required
                      value={editPlaca}
                      onChange={(e) => setEditPlaca(e.target.value.toUpperCase())}
                      className="w-full bg-[#111116] border border-white/10 rounded-xl px-3.5 py-2 text-white text-xs font-mono uppercase outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Cor</label>
                    <input
                      type="text"
                      value={editCor}
                      onChange={(e) => setEditCor(e.target.value)}
                      className="w-full bg-[#111116] border border-white/10 rounded-xl px-3.5 py-2 text-white text-xs outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Ano Fabricação / Modelo</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        placeholder="Ex: 2021"
                        value={editAnoFabricacao}
                        onChange={(e) => setEditAnoFabricacao(e.target.value)}
                        className="w-full bg-[#111116] border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-blue-500"
                      />
                      <input
                        type="number"
                        placeholder="Ex: 2022"
                        value={editAnoModelo}
                        onChange={(e) => setEditAnoModelo(e.target.value)}
                        className="w-full bg-[#111116] border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">KM Atual</label>
                    <input
                      type="number"
                      value={editKm}
                      onChange={(e) => setEditKm(Number(e.target.value))}
                      className="w-full bg-[#111116] border border-white/10 rounded-xl px-3.5 py-2 text-white text-xs font-mono outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1 flex items-center justify-between">
                      <span>Custo de Aquisição (R$)</span>
                      <span className="text-[10px] text-amber-400">Usado no cálculo de ROI</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editCustoAquisicao}
                      onChange={(e) => setEditCustoAquisicao(Number(e.target.value))}
                      className="w-full bg-[#111116] border border-white/10 rounded-xl px-3.5 py-2 text-emerald-400 font-mono font-bold text-xs outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Observações da Frota</label>
                    <input
                      type="text"
                      value={editObservacoes}
                      onChange={(e) => setEditObservacoes(e.target.value)}
                      placeholder="Ex: Veículo reservado para motorista diamante..."
                      className="w-full bg-[#111116] border border-white/10 rounded-xl px-3.5 py-2 text-white text-xs outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* SUBMIT BUTTON */}
              <div className="flex items-center justify-between pt-2">
                {saveSuccess ? (
                  <span className="text-xs text-emerald-400 font-bold flex items-center gap-1.5 animate-fadeIn">
                    <CheckCircle2 size={16} /> Alterações salvas com sucesso!
                  </span>
                ) : <span />}

                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Save size={15} />
                  {isSaving ? 'Salvando...' : 'Salvar Alterações do Veículo'}
                </button>
              </div>
            </form>
          )}

        </div>

        {/* FOOTER */}
        <div className="p-4 bg-[#16171f] border-t border-white/10 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px]">Placa: <strong className="text-white font-mono">{veiculo.placa}</strong></span>
            <span>•</span>
            <span className="text-[11px]">Chassi: <span className="font-mono text-slate-300">{veiculo.chassi || 'N/D'}</span></span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold transition cursor-pointer"
          >
            Fechar Ficha
          </button>
        </div>

      </div>

      {modalEditarContratoOpen && contratoAtivo && onSalvarEdicaoContrato && (
        <ModalEditarContratoAtivo
          isOpen={modalEditarContratoOpen}
          onClose={() => setModalEditarContratoOpen(false)}
          veiculo={veiculo}
          contrato={contratoAtivo}
          todosVeiculos={todosVeiculos.length > 0 ? todosVeiculos : [veiculo]}
          onSalvarEdicaoContrato={async (oldId, newId, updatedCt) => {
            await onSalvarEdicaoContrato(oldId, newId, updatedCt);
            if (oldId === newId && onSaveVeiculo) {
              onSaveVeiculo({
                ...veiculo,
                contratoAtivo: updatedCt,
              });
            }
            setModalEditarContratoOpen(false);
          }}
        />
      )}
    </div>
  );
};
