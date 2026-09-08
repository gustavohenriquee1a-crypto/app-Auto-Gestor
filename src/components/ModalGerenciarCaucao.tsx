import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  DollarSign, 
  Plus, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  Split, 
  ArrowUpRight,
  Receipt,
  FileCheck,
  Award,
  Wallet,
  TrendingDown,
  ArrowDownLeft
} from 'lucide-react';
import { Veiculo, ContratoLocacao, ReposicaoCaucaoParcelada, FechamentoCaucaoResumo, LancamentoContaMotorista } from '../types';
import { formatCurrency, calcularResumoCaucao, formatDate, calcularCarenciaCaucao } from '../utils/formatters';
import { Clock } from 'lucide-react';

interface ModalGerenciarCaucaoProps {
  isOpen: boolean;
  onClose: () => void;
  veiculo: Veiculo;
  contrato: ContratoLocacao;
  onSalvarCaucao: (
    veiculoId: string,
    contratoId: string,
    saldoAtual: number,
    totalPago: number,
    utilizado: number,
    reposicao?: ReposicaoCaucaoParcelada,
    fechamento?: FechamentoCaucaoResumo,
    score?: 'A' | 'B' | 'C' | 'D'
  ) => void;
}

export const ModalGerenciarCaucao: React.FC<ModalGerenciarCaucaoProps> = ({
  isOpen,
  onClose,
  veiculo,
  contrato,
  onSalvarCaucao,
}) => {
  const resumo = calcularResumoCaucao(contrato);

  // Estados locais
  const [modo, setModo] = useState<'extrato' | 'parcelar_reposicao' | 'adicionar_deposito' | 'fechamento_devolucao' | 'conta_corrente'>('extrato');
  
  // Parcelamento da reposição
  const [valorRepor, setValorRepor] = useState<number>(resumo.deficit > 0 ? resumo.deficit : 500);
  const [qtdParcelas, setQtdParcelas] = useState<number>(4);
  const [motivo, setMotivo] = useState('Reposição de caução utilizado em multas/avarias');

  // Depósito à vista
  const [valorDeposito, setValorDeposito] = useState<number>(resumo.deficit > 0 ? resumo.deficit : 500);

  // Fechamento de Caução
  const [dataEncerramento, setDataEncerramento] = useState<string>(
    contrato.fechamentoCaucao?.dataEncerramento || new Date().toISOString().split('T')[0]
  );
  const [avariasDescontar, setAvariasDescontar] = useState<number>(0);
  const [multasDescontar, setMultasDescontar] = useState<number>(
    contrato.debitosMotorista?.filter(d => d.status === 'Pendente').reduce((acc, d) => acc + d.valor, 0) || 0
  );
  const [aluguelPendenteDescontar, setAluguelPendenteDescontar] = useState<number>(0);
  const [obsFechamento, setObsFechamento] = useState('');

  // Carência de 30 dias para liberação da caução pós-devolução
  const carencia = calcularCarenciaCaucao(contrato, dataEncerramento);

  // Score do Motorista
  const [motoristaScore, setMotoristaScore] = useState<'A' | 'B' | 'C' | 'D'>(contrato.scoreMotorista || 'A');

  if (!isOpen) return null;

  const valorParcelaCalculado = qtdParcelas > 0 ? Number((valorRepor / qtdParcelas).toFixed(2)) : Number(valorRepor.toFixed(2));

  // Cálculo de Devolução do Fechamento
  const totalCaucaoDepositado = resumo.pago;
  const totalDescontosFechamento = Number(avariasDescontar || 0) + Number(multasDescontar || 0) + Number(aluguelPendenteDescontar || 0);
  const saldoFinalDevolver = Math.max(0, totalCaucaoDepositado - totalDescontosFechamento);

  const handleSalvarParcelamento = (e: React.FormEvent) => {
    e.preventDefault();
    const novaReposicao: ReposicaoCaucaoParcelada = {
      ativa: true,
      valorTotalRepor: Number(valorRepor),
      quantidadeParcelas: Number(qtdParcelas),
      valorParcelaSemanal: valorParcelaCalculado,
      parcelasPagas: 0,
      parcelasRestantes: Number(qtdParcelas),
      motivoRepor: motivo.trim() || undefined,
    };

    onSalvarCaucao(
      veiculo.id,
      contrato.id,
      resumo.saldoAtual,
      resumo.pago,
      resumo.utilizado,
      novaReposicao,
      undefined,
      motoristaScore
    );

    setModo('extrato');
  };

  const handleCancelarParcelamento = () => {
    onSalvarCaucao(
      veiculo.id,
      contrato.id,
      resumo.saldoAtual,
      resumo.pago,
      resumo.utilizado,
      undefined,
      undefined,
      motoristaScore
    );
  };

  const handleSalvarDepositoAVista = (e: React.FormEvent) => {
    e.preventDefault();
    const novoTotalPago = resumo.pago + Number(valorDeposito);
    const novoSaldo = resumo.saldoAtual + Number(valorDeposito);

    onSalvarCaucao(
      veiculo.id,
      contrato.id,
      novoSaldo,
      novoTotalPago,
      resumo.utilizado,
      contrato.reposicaoCaucao,
      undefined,
      motoristaScore
    );

    setModo('extrato');
  };

  const handleConfirmarFechamento = (e: React.FormEvent) => {
    e.preventDefault();
    const fechamento: FechamentoCaucaoResumo = {
      caucaoTotalDepositado: totalCaucaoDepositado,
      debitosMultasAbatidos: Number(multasDescontar),
      avariasAbatidas: Number(avariasDescontar),
      aluguelPendenteAbatido: Number(aluguelPendenteDescontar),
      saldoFinalDevolver,
      dataEncerramento,
      observacoes: obsFechamento.trim() || undefined,
    };

    onSalvarCaucao(
      veiculo.id,
      contrato.id,
      0, // Saldo zerado pós-encerramento
      resumo.pago,
      totalDescontosFechamento,
      undefined,
      fechamento,
      motoristaScore
    );

    setModo('extrato');
  };

  // Mock / Computação da Conta Corrente do Motorista
  const contaCorrenteMock: LancamentoContaMotorista[] = [
    {
      id: 'cc-1',
      data: contrato.dataInicio,
      tipo: 'CREDITO_CAUCAO',
      descricao: 'Depósito Inicial de Caução em Garantia',
      valor: resumo.pago,
      saldoApos: resumo.pago,
    },
    ...(contrato.pagamentos || []).map((pag, idx) => ({
      id: `cc-pag-${idx}`,
      data: pag.dataPagamento,
      tipo: 'CREDITO_PAGAMENTO' as const,
      descricao: `Aluguel Semanal (${pag.semanaReferencia || 'Semana'}) - ${pag.formaPagamento}`,
      valor: pag.valorPago,
      saldoApos: resumo.pago + pag.valorPago,
    })),
    ...(contrato.debitosMotorista || []).map((deb, idx) => ({
      id: `cc-deb-${idx}`,
      data: deb.data,
      tipo: deb.tipo === 'Multa' ? 'DEBITO_MULTA' as const : 'DEBITO_AVARIA' as const,
      descricao: `${deb.tipo}: ${deb.descricao} (${deb.status})`,
      valor: -deb.valor,
      saldoApos: resumo.pago - deb.valor,
    })),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-xl max-h-[90vh] flex flex-col bg-gray-900 rounded-2xl shadow-xl overflow-hidden border border-white/10">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-[#16171f] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                Conta Corrente & Caução do Motorista
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

        {/* Content */}
        <div className="flex-1 p-5 space-y-4 overflow-y-auto text-xs">
          {/* Overview Cards */}
          <div className="grid grid-cols-4 gap-2">
            <div className="p-2.5 rounded-2xl bg-[#16171f] border border-white/5">
              <span className="text-[9px] uppercase font-bold text-slate-400 block">Exigido</span>
              <p className="text-xs font-black text-white font-mono mt-0.5">{formatCurrency(resumo.exigido)}</p>
            </div>

            <div className="p-2.5 rounded-2xl bg-[#16171f] border border-white/5">
              <span className="text-[9px] uppercase font-bold text-emerald-400 block">Saldo Atual</span>
              <p className="text-xs font-black text-emerald-400 font-mono mt-0.5">{formatCurrency(resumo.saldoAtual)}</p>
            </div>

            <div className="p-2.5 rounded-2xl bg-[#16171f] border border-white/5">
              <span className="text-[9px] uppercase font-bold text-rose-400 block">Abatido</span>
              <p className="text-xs font-black text-rose-400 font-mono mt-0.5">{formatCurrency(resumo.utilizado)}</p>
            </div>

            <div className="p-2.5 rounded-2xl bg-[#16171f] border border-purple-500/20">
              <span className="text-[9px] uppercase font-bold text-purple-300 block">Score Risco</span>
              <div className="flex items-center gap-1 mt-0.5">
                <span className={`text-xs font-black px-1.5 py-0.2 rounded font-mono ${
                  motoristaScore === 'A' ? 'bg-emerald-500/20 text-emerald-300' :
                  motoristaScore === 'B' ? 'bg-blue-500/20 text-blue-300' :
                  motoristaScore === 'C' ? 'bg-amber-500/20 text-amber-300' : 'bg-rose-500/20 text-rose-300'
                }`}>
                  Classe {motoristaScore}
                </span>
              </div>
            </div>
          </div>

          {/* Status Alert if Deficit */}
          {resumo.precisaRepor && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-amber-300">Caução Abaixo do Exigido (Déficit: {formatCurrency(resumo.deficit)})</h4>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Como parte do caução foi abatido para pagar débitos do motorista, ele precisa repor o valor para manter a garantia.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Reposição Parcelada Ativa */}
          {contrato.reposicaoCaucao?.ativa && (
            <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/25 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
                  <Split size={14} /> Parcelamento de Reposição Ativo
                </span>
                <button
                  type="button"
                  onClick={handleCancelarParcelamento}
                  className="text-[10px] text-rose-400 hover:underline cursor-pointer"
                >
                  Encerrar Reposição
                </button>
              </div>
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-300">Acréscimo Semanal no Aluguel:</span>
                <span className="font-mono font-black text-blue-400 text-sm">
                  +{formatCurrency(contrato.reposicaoCaucao.valorParcelaSemanal)} / semana
                </span>
              </div>
            </div>
          )}

          {/* Fechamento Concluído Anteriormente */}
          {contrato.fechamentoCaucao && (
            <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/30 space-y-2 font-mono">
              <div className="flex items-center justify-between text-purple-300 font-bold">
                <span className="flex items-center gap-1">
                  <FileCheck size={15} /> Fechamento de Caução Realizado
                </span>
                <span>{formatDate(contrato.fechamentoCaucao.dataEncerramento)}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300 pt-1">
                <div>Total Depositado: {formatCurrency(contrato.fechamentoCaucao.caucaoTotalDepositado)}</div>
                <div>Avarias/Multas: -{formatCurrency(contrato.fechamentoCaucao.avariasAbatidas + contrato.fechamentoCaucao.debitosMultasAbatidos)}</div>
                <div className="col-span-2 font-bold text-emerald-400">
                  Saldo Devolvido ao Motorista: {formatCurrency(contrato.fechamentoCaucao.saldoFinalDevolver)}
                </div>
              </div>
            </div>
          )}

          {/* NAVEGAÇÃO DE AÇÕES */}
          <div className="flex flex-wrap gap-2 pt-1 border-t border-white/5">
            <button
              type="button"
              onClick={() => setModo('extrato')}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                modo === 'extrato' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Visão Geral
            </button>
            <button
              type="button"
              onClick={() => setModo('conta_corrente')}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
                modo === 'conta_corrente' ? 'bg-purple-600/30 text-purple-300 border border-purple-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Wallet size={14} /> Conta Corrente
            </button>
            <button
              type="button"
              onClick={() => setModo('adicionar_deposito')}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
                modo === 'adicionar_deposito' ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              <ArrowUpRight size={14} /> Entrada / Depósito
            </button>
            <button
              type="button"
              onClick={() => setModo('parcelar_reposicao')}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
                modo === 'parcelar_reposicao' ? 'bg-blue-600/30 text-blue-300 border border-blue-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Split size={14} /> Parcelar Reposição
            </button>
            <button
              type="button"
              onClick={() => setModo('fechamento_devolucao')}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
                modo === 'fechamento_devolucao' ? 'bg-amber-600/30 text-amber-300 border border-amber-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Receipt size={14} /> Fechamento & Devolução
            </button>
          </div>

          {/* MODO: CONTA CORRENTE DO MOTORISTA */}
          {modo === 'conta_corrente' && (
            <div className="space-y-3 p-4 rounded-2xl bg-black/40 border border-white/10 font-mono">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                  <Wallet size={15} className="text-purple-400" />
                  Extrato da Conta Corrente (Auditável)
                </h4>
                <span className="text-[10px] text-slate-400">{contaCorrenteMock.length} movimentações</span>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto">
                {contaCorrenteMock.map((lanc) => (
                  <div key={lanc.id} className="p-2.5 rounded-xl bg-[#16171f] border border-white/5 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">{formatDate(lanc.data)}</span>
                      <p className="font-medium text-slate-200">{lanc.descricao}</p>
                    </div>
                    <div className="text-right">
                      <span className={`font-black ${lanc.valor >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {lanc.valor >= 0 ? '+' : ''}{formatCurrency(lanc.valor)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MODO: FECHAMENTO DE CAUÇÃO & DEVOLUÇÃO */}
          {modo === 'fechamento_devolucao' && (
            <form onSubmit={handleConfirmarFechamento} className="space-y-4 p-4 rounded-2xl bg-black/40 border border-amber-500/30 font-mono">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <h4 className="font-bold text-amber-300 text-xs flex items-center gap-1.5">
                  <Receipt size={15} /> Fechamento de Caução & Quitação de Contrato
                </h4>
              </div>

              <div className="space-y-3 text-xs">
                {/* Alerta de Carência de 30 Dias para Devolução da Caução */}
                <div className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                  carencia.emCarencia 
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-200' 
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                }`}>
                  <Clock size={18} className={`shrink-0 mt-0.5 ${carencia.emCarencia ? 'text-amber-400 animate-pulse' : 'text-emerald-400'}`} />
                  <div className="space-y-1">
                    <p className="font-bold text-xs">
                      {carencia.emCarencia
                        ? 'Carência Obrigatória de 30 Dias (Proteção Contra Multas DETRAN/PRF)'
                        : 'Carência de 30 Dias Cumprida — Caução Liberada'}
                    </p>
                    <p className="text-[11px] leading-relaxed opacity-90">
                      {carencia.emCarencia ? (
                        <>
                          <span className="font-semibold text-amber-300">
                            Caução retido para conferência de multas: {carencia.diasRestantes} {carencia.diasRestantes === 1 ? 'dia restante' : 'dias restantes'}
                          </span>{' '}
                          (liberação em {formatDate(carencia.dataLiberacao)}). O botão de liberação financeira ficará desbloqueado automaticamente após esse prazo.
                        </>
                      ) : (
                        `O prazo de 30 dias após a devolução foi superado com sucesso em ${formatDate(carencia.dataLiberacao)}. A caução pode ser devolvida ao motorista.`
                      )}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-white/[0.02] rounded-xl border border-white/5">
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                      Data de Devolução do Veículo:
                    </label>
                    <input
                      type="date"
                      value={dataEncerramento}
                      onChange={(e) => setDataEncerramento(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#16171f] border border-white/10 text-white font-mono text-xs outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                      Data Prevista de Liberação (30 dias):
                    </label>
                    <div className="px-2.5 py-1.5 rounded-lg bg-[#16171f] border border-white/10 text-amber-400 font-mono font-bold text-xs">
                      {formatDate(carencia.dataLiberacao)}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center text-slate-300 pt-1">
                  <span>(+) Caução Total Depositado:</span>
                  <span className="font-bold text-emerald-400">{formatCurrency(totalCaucaoDepositado)}</span>
                </div>

                <div className="flex justify-between items-center text-slate-300">
                  <span>(-) Avarias & Vistoria Final (R$):</span>
                  <input
                    type="number"
                    value={avariasDescontar}
                    onChange={(e) => setAvariasDescontar(Number(e.target.value))}
                    className="w-24 px-2 py-1 rounded bg-[#16171f] border border-white/10 text-rose-400 text-right font-bold"
                  />
                </div>

                <div className="flex justify-between items-center text-slate-300">
                  <span>(-) Multas Pendentes (R$):</span>
                  <input
                    type="number"
                    value={multasDescontar}
                    onChange={(e) => setMultasDescontar(Number(e.target.value))}
                    className="w-24 px-2 py-1 rounded bg-[#16171f] border border-white/10 text-rose-400 text-right font-bold"
                  />
                </div>

                <div className="flex justify-between items-center text-slate-300">
                  <span>(-) Aluguéis Atrasados (R$):</span>
                  <input
                    type="number"
                    value={aluguelPendenteDescontar}
                    onChange={(e) => setAluguelPendenteDescontar(Number(e.target.value))}
                    className="w-24 px-2 py-1 rounded bg-[#16171f] border border-white/10 text-rose-400 text-right font-bold"
                  />
                </div>

                <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/40 flex justify-between items-center text-emerald-300 font-bold">
                  <span>(=) Saldo a Devolver ao Motorista:</span>
                  <span className="text-base font-black text-emerald-400">{formatCurrency(saldoFinalDevolver)}</span>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 uppercase block mb-1">Termo / Observação do Fechamento:</label>
                  <input
                    type="text"
                    value={obsFechamento}
                    onChange={(e) => setObsFechamento(e.target.value)}
                    placeholder="Ex: Veículo devolvido em perfeito estado, aguardando carência de multas"
                    className="w-full p-2 rounded-lg bg-[#16171f] border border-white/10 text-white text-xs outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <div className="text-[11px] text-slate-400">
                  {carencia.emCarencia ? (
                    <span className="text-amber-400 font-semibold flex items-center gap-1">
                      <Clock size={12} /> Bloqueado: restam {carencia.diasRestantes} dias de carência
                    </span>
                  ) : (
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 size={12} /> Carência de 30 dias expirada. Devolução liberada!
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setModo('extrato')}
                    className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={carencia.emCarencia}
                    className={`px-4 py-2 rounded-xl font-black text-xs transition flex items-center gap-1.5 ${
                      carencia.emCarencia
                        ? 'bg-slate-800 text-slate-500 border border-white/10 cursor-not-allowed opacity-60'
                        : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 cursor-pointer'
                    }`}
                    title={
                      carencia.emCarencia
                        ? `Aguardando término da carência de 30 dias (${carencia.diasRestantes} dias restantes)`
                        : 'Confirmar devolução do saldo da caução ao motorista'
                    }
                  >
                    <CheckCircle2 size={15} /> Confirmar Devolução da Caução
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* FORM PARCELAR REPOSIÇÃO */}
          {modo === 'parcelar_reposicao' && (
            <form onSubmit={handleSalvarParcelamento} className="space-y-4 p-4 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <Split size={15} className="text-blue-400" /> Configurar Parcelamento de Caução
                </h4>
                <button
                  type="button"
                  onClick={() => setModo('extrato')}
                  className="text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Voltar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-300 font-bold mb-1">Valor Total a Repor (R$) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={valorRepor}
                    onChange={(e) => setValorRepor(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-[#16171f] border border-white/10 text-white font-mono font-bold text-xs outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-300 font-bold mb-1">Qtd. Semanas / Parcelas *</label>
                  <select
                    value={qtdParcelas}
                    onChange={(e) => setQtdParcelas(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-[#16171f] border border-white/10 text-white font-semibold text-xs outline-none focus:border-blue-500"
                  >
                    <option value={2}>2 semanas</option>
                    <option value={3}>3 semanas</option>
                    <option value={4}>4 semanas (1 mês)</option>
                    <option value={6}>6 semanas</option>
                    <option value={8}>8 semanas</option>
                    <option value={10}>10 semanas</option>
                    <option value={12}>12 semanas</option>
                  </select>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between text-xs">
                <span className="text-blue-300 font-semibold">Valor somado à parcela semanal:</span>
                <span className="font-mono font-black text-blue-400 text-sm">
                  +{formatCurrency(valorParcelaCalculado)} / semana
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModo('extrato')}
                  className="px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-blue-600/30"
                >
                  <CheckCircle2 size={15} /> Ativar Parcelamento
                </button>
              </div>
            </form>
          )}

          {/* FORM DEPÓSITO À VISTA */}
          {modo === 'adicionar_deposito' && (
            <form onSubmit={handleSalvarDepositoAVista} className="space-y-4 p-4 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <ArrowUpRight size={15} className="text-emerald-400" /> Registrar Entrada de Caução
                </h4>
                <button
                  type="button"
                  onClick={() => setModo('extrato')}
                  className="text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Voltar
                </button>
              </div>

              <div>
                <label className="block text-[11px] text-slate-300 font-bold mb-1">Valor do Depósito (R$) *</label>
                <div className="relative">
                  <DollarSign size={14} className="absolute left-3 top-3 text-emerald-400" />
                  <input
                    type="number"
                    required
                    min="1"
                    value={valorDeposito}
                    onChange={(e) => setValorDeposito(Number(e.target.value))}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#16171f] border border-white/10 text-emerald-400 font-mono font-black text-sm outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModo('extrato')}
                  className="px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-600/30"
                >
                  <CheckCircle2 size={15} /> Confirmar Entrada
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
