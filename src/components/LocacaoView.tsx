import React, { useState } from 'react';
import { 
  Calendar, 
  Car, 
  AlertTriangle, 
  CheckCircle2, 
  Plus, 
  Phone, 
  Smartphone, 
  DollarSign, 
  Wrench, 
  TrendingUp, 
  Clock, 
  ShieldCheck,
  ChevronRight,
  RefreshCw,
  Search,
  Gauge,
  ShieldAlert,
  Split,
  Settings2,
  FileText,
  AlertCircle
} from 'lucide-react';
import { 
  Veiculo, 
  ContratoLocacao, 
  PagamentoAluguel, 
  RegistroKmDiario, 
  ItemManutencaoPreventiva, 
  DebitoMotorista, 
  ReposicaoCaucaoParcelada,
  DespesaVeiculo 
} from '../types';
import { 
  formatCurrency, 
  formatDate, 
  formatKm, 
  checkRevisaoNecessaria,
  getItensManutencaoPadrao,
  calcularStatusManutencao,
  calcularResumoCaucao,
  calcularResumoDebitos
} from '../utils/formatters';

// Modals
import { ModalLancamentoKmDiario } from './ModalLancamentoKmDiario';
import { ModalGerenciarManutencoesLocacao } from './ModalGerenciarManutencoesLocacao';
import { ModalNovoDebitoMotorista } from './ModalNovoDebitoMotorista';
import { ModalGerenciarCaucao } from './ModalGerenciarCaucao';

interface LocacaoViewProps {
  veiculos: Veiculo[];
  initialSubTab?: TabLocacao;
  onOpenNovoContrato: (veiculo?: Veiculo) => void;
  onRegistrarPagamento: (contratoId: string, pagamentoId: string) => void;
  onOpenRegistrarRevisao: (veiculo: Veiculo) => void;
  onEncerrarContrato: (contratoId: string) => void;
  onAtualizarKm: (veiculoId: string, novaKm: number) => void;
  onSalvarKmDiario?: (veiculoId: string, contratoId: string, novoKm: number, registro: RegistroKmDiario) => void;
  onSalvarItensManutencao?: (veiculoId: string, contratoId: string, itens: ItemManutencaoPreventiva[]) => void;
  onRegistrarManutencaoRealizada?: (
    veiculoId: string,
    contratoId: string,
    itemAtualizado: ItemManutencaoPreventiva,
    despesa: DespesaVeiculo
  ) => void;
  onSalvarDebitoMotorista?: (
    veiculoId: string,
    contratoId: string,
    novoDebito: DebitoMotorista,
    descontarCaucao: boolean,
    valorDescontarCaucao: number
  ) => void;
  onSalvarCaucaoMotorista?: (
    veiculoId: string,
    contratoId: string,
    saldoAtual: number,
    totalPago: number,
    utilizado: number,
    reposicao?: ReposicaoCaucaoParcelada,
    fechamento?: any,
    score?: 'A' | 'B' | 'C' | 'D'
  ) => void;
  onOpenCadastrarDespesaVeiculo?: (veiculo: Veiculo) => void;
}

export type TabLocacao = 'contratos' | 'km_diario' | 'manutencoes' | 'debitos' | 'caucao';

export const LocacaoView: React.FC<LocacaoViewProps> = ({
  veiculos,
  initialSubTab,
  onOpenNovoContrato,
  onRegistrarPagamento,
  onOpenRegistrarRevisao,
  onEncerrarContrato,
  onAtualizarKm,
  onSalvarKmDiario,
  onSalvarItensManutencao,
  onRegistrarManutencaoRealizada,
  onSalvarDebitoMotorista,
  onSalvarCaucaoMotorista,
  onOpenCadastrarDespesaVeiculo,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<TabLocacao>(initialSubTab || 'contratos');

  React.useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterApp, setFilterApp] = useState<string>('Todos');

  // Modals state
  const [modalKmTarget, setModalKmTarget] = useState<{ veiculo: Veiculo; contrato: ContratoLocacao } | null>(null);
  const [modalManutTarget, setModalManutTarget] = useState<{ veiculo: Veiculo; contrato: ContratoLocacao } | null>(null);
  const [modalDebitoTarget, setModalDebitoTarget] = useState<{ veiculo: Veiculo; contrato: ContratoLocacao } | null>(null);
  const [modalCaucaoTarget, setModalCaucaoTarget] = useState<{ veiculo: Veiculo; contrato: ContratoLocacao } | null>(null);

  // Extract all active contracts and linked vehicles
  const contratosAtivos = veiculos
    .filter((v) => v.contratoAtivo && v.contratoAtivo.status === 'Ativo')
    .map((v) => ({
      veiculo: v,
      contrato: v.contratoAtivo!,
    }));

  const filteredContratos = contratosAtivos.filter(({ veiculo, contrato }) => {
    const matchSearch =
      contrato.motoristaNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contrato.motoristaCpf.includes(searchTerm) ||
      veiculo.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
      veiculo.modelo.toLowerCase().includes(searchTerm.toLowerCase());

    const matchApp = filterApp === 'Todos' || contrato.motoristaApp === filterApp;
    return matchSearch && matchApp;
  });

  // Calculate totals
  const totalReceitaSemanal = contratosAtivos.reduce((acc, c) => acc + c.contrato.valorSemanal, 0);
  const totalReceitaMensalEstimada = totalReceitaSemanal * 4.33;

  // Payments needing attention
  const pagamentosAtrasados = contratosAtivos.flatMap((c) =>
    c.contrato.pagamentos
      .filter((p) => p.status === 'Atrasado' || p.status === 'Pendente')
      .map((p) => ({ contrato: c.contrato, veiculo: c.veiculo, pagamento: p }))
  );

  // Maintenance predictive alerts
  const todosAlertasManutencao = contratosAtivos.flatMap(({ veiculo, contrato }) => {
    const itens = contrato.itensManutencao && contrato.itensManutencao.length > 0
      ? contrato.itensManutencao
      : getItensManutencaoPadrao(veiculo.kmAtual);

    return itens
      .map((item) => ({
        veiculo,
        contrato,
        item,
        status: calcularStatusManutencao(item, veiculo.kmAtual),
      }))
      .filter((res) => res.status.isVencido || res.status.isProximo);
  });

  // Debts needing attention
  const todosDebitos = contratosAtivos.flatMap(({ veiculo, contrato }) =>
    (contrato.debitosMotorista || []).map((deb) => ({
      veiculo,
      contrato,
      debito: deb,
    }))
  );

  const debitosPendentes = todosDebitos.filter(
    (d) => d.debito.status === 'Pendente' || d.debito.status === 'Parcelado com Aluguel'
  );

  // Total Security Deposit
  const totalCaucaoSaldo = contratosAtivos.reduce((acc, c) => {
    const r = calcularResumoCaucao(c.contrato);
    return acc + r.saldoAtual;
  }, 0);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Level KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#111116] p-5 rounded-2xl border border-white/5 shadow-none">
          <span className="text-[11px] font-semibold uppercase text-slate-400">Contratos Ativos</span>
          <h4 className="text-2xl font-black text-blue-400 mt-1">{contratosAtivos.length}</h4>
          <p className="text-xs text-slate-400 mt-1">Carros em operação com motoristas de app</p>
        </div>

        <div className="bg-[#111116] p-5 rounded-2xl border border-white/5 shadow-none">
          <span className="text-[11px] font-semibold uppercase text-slate-400">Receita Recorrente Semanal</span>
          <h4 className="text-2xl font-black text-emerald-400 mt-1">{formatCurrency(totalReceitaSemanal)}</h4>
          <p className="text-xs text-slate-400 mt-1">~ {formatCurrency(totalReceitaMensalEstimada)} / mês previsto</p>
        </div>

        <div className="bg-[#111116] p-5 rounded-2xl border border-white/5 shadow-none">
          <span className="text-[11px] font-semibold uppercase text-slate-400">Alertas Preventivos (KM)</span>
          <h4 className={`text-2xl font-black mt-1 ${todosAlertasManutencao.length > 0 ? 'text-amber-400' : 'text-slate-200'}`}>
            {todosAlertasManutencao.length}
          </h4>
          <p className="text-xs text-slate-400 mt-1">Óleo, pastilhas, pneus próximos ou vencidos</p>
        </div>

        <div className="bg-[#111116] p-5 rounded-2xl border border-white/5 shadow-none">
          <span className="text-[11px] font-semibold uppercase text-slate-400">Caução Líquido em Custódia</span>
          <h4 className="text-2xl font-black text-purple-400 mt-1">
            {formatCurrency(totalCaucaoSaldo)}
          </h4>
          <p className="text-xs text-slate-400 mt-1">Garantia retida dos motoristas ativos</p>
        </div>
      </div>

      {/* Overdue Payments Warning Banner */}
      {pagamentosAtrasados.length > 0 && (
        <div className="bg-amber-950/20 border border-amber-500/25 rounded-2xl p-5 shadow-none space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
              <AlertTriangle size={18} className="text-amber-400" />
              <span>Cobranças Semanais com Alerta de Vencimento ou Atraso ({pagamentosAtrasados.length})</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pagamentosAtrasados.map(({ contrato, veiculo, pagamento }) => (
              <div key={pagamento.id} className="bg-[#111116] p-4 rounded-xl border border-amber-500/30 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h5 className="font-bold text-white text-sm">{contrato.motoristaNome}</h5>
                      <p className="text-xs text-slate-400">{veiculo.modelo} ({veiculo.placa})</p>
                    </div>
                    <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold px-2 py-0.5 rounded">
                      {pagamento.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-2 font-mono">
                    Ref: <strong>{pagamento.semanaReferencia}</strong> • Venc: {formatDate(pagamento.dataVencimento)}
                  </p>
                  <p className="text-base font-black text-white mt-1">
                    {formatCurrency(pagamento.valor)}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                  <a
                    href={`https://wa.me/55${contrato.motoristaTelefone.replace(/\D/g, '')}?text=Olá ${encodeURIComponent(contrato.motoristaNome)}, segue cobrança do aluguel semanal do veículo ${encodeURIComponent(veiculo.placa)} no valor de ${encodeURIComponent(formatCurrency(pagamento.valor))}.`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 transition"
                  >
                    <Phone size={13} /> Cobrar WhatsApp
                  </a>
                  <button
                    onClick={() => onRegistrarPagamento(contrato.id, pagamento.id)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition cursor-pointer"
                  >
                    Dar Baixa PIX
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub-Navigation Tabs for Locação App Drivers */}
      <div className="bg-[#111116] p-2 rounded-2xl border border-white/5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveSubTab('contratos')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'contratos'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Car size={15} />
          Motoristas & Contratos Ativos ({contratosAtivos.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('km_diario')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'km_diario'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Gauge size={15} />
          Atualização Diária de KM & Odômetro
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('manutencoes')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'manutencoes'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Wrench size={15} />
          Manutenções Preventivas & Alertas de KM
          {todosAlertasManutencao.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-black">
              {todosAlertasManutencao.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('debitos')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'debitos'
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <ShieldAlert size={15} />
          Multas & Débitos do Motorista
          {debitosPendentes.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-black">
              {debitosPendentes.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('caucao')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'caucao'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <ShieldCheck size={15} />
          Gestão de Caução & Reposição
        </button>
      </div>

      {/* 1. ABA: CONTRATOS & MOTORISTAS ATIVOS */}
      {activeSubTab === 'contratos' && (
        <div className="space-y-4">
          {/* Controls & Filter */}
          <div className="bg-[#111116] p-4 rounded-2xl border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 text-slate-400" size={18} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por Motorista, CPF ou Placa do Veículo..."
                className="pl-10 pr-4 py-2.5 w-full rounded-xl border border-white/10 bg-[#16171f] text-slate-100 placeholder:text-slate-500 text-sm outline-none font-medium focus:border-blue-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl text-xs font-semibold border border-white/10">
                {['Todos', 'Uber', '99', 'Indrive'].map((app) => (
                  <button
                    key={app}
                    onClick={() => setFilterApp(app)}
                    className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                      filterApp === app ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {app}
                  </button>
                ))}
              </div>

              <button
                onClick={() => onOpenNovoContrato()}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/20 transition cursor-pointer"
              >
                <Plus size={16} /> Novo Contrato de Locação
              </button>
            </div>
          </div>

          {/* List of Contracts */}
          {filteredContratos.length === 0 ? (
            <div className="bg-[#111116] rounded-2xl p-12 text-center border border-white/5">
              <Car size={48} className="mx-auto text-slate-600 mb-3" />
              <h4 className="text-base font-bold text-slate-200">Nenhum contrato ativo encontrado</h4>
              <p className="text-xs text-slate-400 mt-1">Crie um novo contrato de locação para motoristas de aplicativo.</p>
              <button
                onClick={() => onOpenNovoContrato()}
                className="mt-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-xl inline-flex items-center gap-1.5 transition cursor-pointer"
              >
                <Plus size={16} /> Criar Contrato de Locação
              </button>
            </div>
          ) : (
            filteredContratos.map(({ veiculo, contrato }) => {
              const caucaoInfo = calcularResumoCaucao(contrato);
              const debitosInfo = calcularResumoDebitos(contrato.debitosMotorista || []);
              const revisao = checkRevisaoNecessaria(veiculo);

              return (
                <div
                  key={contrato.id}
                  className="bg-[#111116] rounded-2xl border border-white/5 overflow-hidden transition hover:border-white/15"
                >
                  {/* Contract Header Bar */}
                  <div className="p-5 bg-[#16171f] text-white flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/5">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black text-lg shadow-md shrink-0">
                        {contrato.motoristaNome.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-base text-white">{contrato.motoristaNome}</h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                            {contrato.motoristaApp}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">
                          CPF: {contrato.motoristaCpf} • Tel: {contrato.motoristaTelefone}
                        </p>
                      </div>
                    </div>

                    {/* Quick Metric Badges */}
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <div className="bg-[#111116] px-3 py-2 rounded-xl border border-white/10">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Veículo Locado</span>
                        <p className="font-bold text-white mt-0.5">{veiculo.modelo}</p>
                        <span className="font-mono text-blue-400 font-bold">{veiculo.placa}</span>
                      </div>

                      <div className="bg-[#111116] px-3 py-2 rounded-xl border border-white/10">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Odômetro Atual</span>
                        <p className="font-mono font-black text-emerald-400 mt-0.5">{formatKm(veiculo.kmAtual)}</p>
                        <span className="text-[10px] text-slate-400">Leitura ativa</span>
                      </div>

                      <div className="bg-[#111116] px-3 py-2 rounded-xl border border-white/10">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Aluguel Semanal</span>
                        <p className="font-bold text-emerald-400 mt-0.5">{formatCurrency(contrato.valorSemanal)}</p>
                        <span className="text-[10px] text-slate-400">{contrato.diaCobranca}</span>
                      </div>

                      <div className="bg-[#111116] px-3 py-2 rounded-xl border border-white/10">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Caução Saldo</span>
                        <p className="font-mono font-bold text-purple-300 mt-0.5">{formatCurrency(caucaoInfo.saldoAtual)}</p>
                        <span className="text-[10px] text-slate-400">Exigido: {formatCurrency(caucaoInfo.exigido)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Sub-features Bar */}
                  <div className="p-4 bg-white/[0.02] border-b border-white/5 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Botão Atualizar KM Diário */}
                      <button
                        type="button"
                        onClick={() => setModalKmTarget({ veiculo, contrato })}
                        className="px-3 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Gauge size={14} /> Atualizar KM Diário
                      </button>

                      {/* Botão Manutenções Preventivas */}
                      <button
                        type="button"
                        onClick={() => setModalManutTarget({ veiculo, contrato })}
                        className="px-3 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-500/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Wrench size={14} /> Manutenções & Alertas
                      </button>

                      {/* Botão Registrar Débito */}
                      <button
                        type="button"
                        onClick={() => setModalDebitoTarget({ veiculo, contrato })}
                        className="px-3 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <ShieldAlert size={14} /> Registrar Débito / Multa
                      </button>

                      {/* Botão Gerenciar Caução */}
                      <button
                        type="button"
                        onClick={() => setModalCaucaoTarget({ veiculo, contrato })}
                        className="px-3 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <ShieldCheck size={14} /> Gestão de Caução
                      </button>

                      {/* Botão Despesa Direta do Carro */}
                      {onOpenCadastrarDespesaVeiculo && (
                        <button
                          type="button"
                          onClick={() => onOpenCadastrarDespesaVeiculo(veiculo)}
                          className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <DollarSign size={14} /> Cadastrar Despesa Carro
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={`https://wa.me/55${contrato.motoristaTelefone.replace(/\D/g, '')}?text=Olá ${encodeURIComponent(contrato.motoristaNome)}, tudo bem? Falamos da gestão de frotas sobre o veículo ${encodeURIComponent(veiculo.placa)}.`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Phone size={13} /> WhatsApp Motorista
                      </a>
                    </div>
                  </div>

                  {/* Contract Body: Payments Grid & Maintenance Status */}
                  <div className="p-6 space-y-6">
                    {/* Grade de Cobranças Semanais */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="font-bold text-xs uppercase tracking-wider text-slate-400">
                          Grade de Cobranças Semanais
                        </h5>
                        <span className="text-xs text-slate-400">
                          Vencimentos toda <strong>{contrato.diaCobranca}</strong>
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {contrato.pagamentos.map((pag) => (
                          <div
                            key={pag.id}
                            className={`p-3.5 rounded-xl border text-xs flex flex-col justify-between ${
                              pag.status === 'Pago'
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                                : pag.status === 'Atrasado'
                                ? 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                                : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                            }`}
                          >
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <span className="font-bold font-mono text-[11px] text-slate-200">{pag.semanaReferencia}</span>
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                                    pag.status === 'Pago'
                                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                      : pag.status === 'Atrasado'
                                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                      : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                  }`}
                                >
                                  {pag.status}
                                </span>
                              </div>
                              <p className="text-base font-black mt-1 text-white">
                                {formatCurrency(pag.valor)}
                              </p>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                Vencimento: {formatDate(pag.dataVencimento)}
                              </p>
                            </div>

                            {pag.status !== 'Pago' ? (
                              <button
                                onClick={() => onRegistrarPagamento(contrato.id, pag.id)}
                                className="mt-3 w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-center shadow-xs transition cursor-pointer"
                              >
                                Dar Baixa PIX
                              </button>
                            ) : (
                              <div className="mt-2 text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
                                <CheckCircle2 size={13} /> Pago em {formatDate(pag.dataPagamento || '')}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Actions footer */}
                    <div className="flex justify-end pt-3 border-t border-white/5 gap-2">
                      <button
                        onClick={() => {
                          if (window.confirm(`Deseja realmente encerrar a locação de ${contrato.motoristaNome} com devolução do veículo ${veiculo.placa}?`)) {
                            onEncerrarContrato(contrato.id);
                          }
                        }}
                        className="text-xs text-rose-400 hover:bg-rose-500/10 border border-rose-500/30 font-semibold px-3 py-2 rounded-xl transition cursor-pointer"
                      >
                        Encerrar Contrato & Devolver Carro
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 2. ABA: ATUALIZAÇÃO DIÁRIA DE KM & ODÔMETRO */}
      {activeSubTab === 'km_diario' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-[#111116] border border-white/5 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Gauge size={16} className="text-blue-400" /> Painel de Leituras Diárias de Quilometragem
              </h3>
              <p className="text-xs text-slate-400">
                Acompanhe o odômetro de cada veículo locado, média diária rodada e histórico de leituras.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {contratosAtivos.map(({ veiculo, contrato }) => {
              const registros = contrato.registrosKmDiario || [];
              const ultimoRegistro = registros[registros.length - 1];

              return (
                <div key={contrato.id} className="p-5 rounded-2xl bg-[#111116] border border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-extrabold text-base text-white">{contrato.motoristaNome}</h4>
                      <p className="text-xs text-slate-400">
                        {veiculo.modelo} • <span className="text-blue-400 font-mono font-bold">{veiculo.placa}</span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setModalKmTarget({ veiculo, contrato })}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-blue-600/20"
                    >
                      <Gauge size={14} /> Lançar KM Hoje
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-[#16171f] border border-white/5 text-center">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Odômetro Atual</span>
                      <span className="text-sm font-black text-emerald-400 font-mono">{formatKm(veiculo.kmAtual)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">KM Inicial Contrato</span>
                      <span className="text-sm font-bold text-slate-300 font-mono">{formatKm(contrato.kmInicial || 0)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-blue-400 block">Total Rodado</span>
                      <span className="text-sm font-black text-blue-400 font-mono">
                        {formatKm(Math.max(0, veiculo.kmAtual - (contrato.kmInicial || 0)))}
                      </span>
                    </div>
                  </div>

                  {/* Histórico Recente de Leituras */}
                  <div>
                    <span className="text-[11px] font-bold uppercase text-slate-400 block mb-2">
                      Histórico Recente de Leituras Diárias
                    </span>
                    {registros.length === 0 ? (
                      <div className="p-3 rounded-xl bg-white/5 text-xs text-slate-400 text-center">
                        Nenhum registro diário lançado ainda. Clique em "Lançar KM Hoje" para registrar.
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {registros.slice().reverse().map((reg) => (
                          <div
                            key={reg.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-[#16171f] text-xs border border-white/5"
                          >
                            <span className="text-slate-300 font-medium">{formatDate(reg.data)}</span>
                            <span className="font-mono text-white font-bold">{formatKm(reg.kmRegistrado)}</span>
                            <span className="font-mono text-emerald-400 font-semibold">+{formatKm(reg.kmRodadoNoDia)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. ABA: MANUTENÇÕES PREVENTIVAS & ALERTAS PREDITIVOS */}
      {activeSubTab === 'manutencoes' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-[#111116] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Wrench size={16} className="text-amber-400" /> Central de Manutenções Preventivas & Alertas de KM
              </h3>
              <p className="text-xs text-slate-400">
                Configure os intervalos de KM para troca de óleo, pastilhas, pneus e correias para cada carro da frota.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {contratosAtivos.map(({ veiculo, contrato }) => {
              const itens = contrato.itensManutencao && contrato.itensManutencao.length > 0
                ? contrato.itensManutencao
                : getItensManutencaoPadrao(veiculo.kmAtual);

              return (
                <div key={contrato.id} className="p-5 rounded-2xl bg-[#111116] border border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-extrabold text-base text-white">{contrato.motoristaNome}</h4>
                      <p className="text-xs text-slate-400">
                        {veiculo.modelo} • <span className="text-blue-400 font-mono font-bold">{veiculo.placa}</span> • Odômetro:{' '}
                        <strong className="text-emerald-400 font-mono">{formatKm(veiculo.kmAtual)}</strong>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setModalManutTarget({ veiculo, contrato })}
                      className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-600/20"
                    >
                      <Settings2 size={14} /> Personalizar / Registrar
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {itens.map((item) => {
                      const st = calcularStatusManutencao(item, veiculo.kmAtual);
                      return (
                        <div
                          key={item.id}
                          className="p-3 rounded-xl bg-[#16171f] border border-white/5 space-y-1.5"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-white">{item.nome}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${st.badgeClass}`}>
                              {st.statusText}
                            </span>
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-400">
                            <span>A cada {formatKm(item.intervaloKm)}</span>
                            <span>Próxima: {formatKm(item.kmProximaTroca)}</span>
                          </div>
                          <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                st.isVencido ? 'bg-rose-500' : st.isProximo ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${st.porcentagem}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. ABA: MULTAS & DÉBITOS DO MOTORISTA */}
      {activeSubTab === 'debitos' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-[#111116] border border-white/5 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldAlert size={16} className="text-rose-400" /> Central de Multas, Batidas e Débitos do Motorista
              </h3>
              <p className="text-xs text-slate-400">
                Registre infrações de trânsito ou avarias causadas e controle o desconto via caução ou parcelamento no aluguel.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {contratosAtivos.map(({ veiculo, contrato }) => {
              const debitos = contrato.debitosMotorista || [];
              const resumoDeb = calcularResumoDebitos(debitos);

              return (
                <div key={contrato.id} className="p-5 rounded-2xl bg-[#111116] border border-white/5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="font-extrabold text-base text-white">{contrato.motoristaNome}</h4>
                      <p className="text-xs text-slate-400">
                        {veiculo.modelo} • <span className="text-blue-400 font-mono font-bold">{veiculo.placa}</span> • Total em Débitos:{' '}
                        <strong className="text-rose-400 font-mono">{formatCurrency(resumoDeb.totalDebitos)}</strong>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setModalDebitoTarget({ veiculo, contrato })}
                      className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-rose-600/20"
                    >
                      <Plus size={14} /> Registrar Novo Débito / Multa
                    </button>
                  </div>

                  {debitos.length === 0 ? (
                    <div className="p-4 rounded-xl bg-white/5 text-xs text-slate-400 text-center">
                      Nenhum débito ou multa registrado para este motorista.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {debitos.map((deb) => (
                        <div
                          key={deb.id}
                          className="p-3.5 rounded-xl bg-[#16171f] border border-white/5 space-y-2 text-xs"
                        >
                          <div className="flex justify-between items-start">
                            <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold">
                              {deb.tipo}
                            </span>
                            <span className="text-slate-400 font-mono">{formatDate(deb.dataOcorrencia)}</span>
                          </div>
                          <p className="font-bold text-white text-xs line-clamp-2">{deb.descricao}</p>
                          <div className="flex justify-between items-center pt-1 border-t border-white/5">
                            <span className="text-[10px] text-slate-400">Valor:</span>
                            <span className="font-mono font-black text-rose-400 text-sm">
                              {formatCurrency(deb.valorTotal)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-slate-400">Status Quitação:</span>
                            <span className="font-semibold text-amber-300">{deb.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. ABA: GESTÃO DE CAUÇÃO & REPOSIÇÃO */}
      {activeSubTab === 'caucao' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-[#111116] border border-white/5 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck size={16} className="text-purple-400" /> Central de Caução & Reposição Parcelada
              </h3>
              <p className="text-xs text-slate-400">
                Monitore o saldo em garantia de cada motorista e gerencie a reposição de caução abatido em multas ou avarias.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {contratosAtivos.map(({ veiculo, contrato }) => {
              const res = calcularResumoCaucao(contrato);

              return (
                <div key={contrato.id} className="p-5 rounded-2xl bg-[#111116] border border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-extrabold text-base text-white">{contrato.motoristaNome}</h4>
                      <p className="text-xs text-slate-400">
                        {veiculo.modelo} • <span className="text-blue-400 font-mono font-bold">{veiculo.placa}</span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setModalCaucaoTarget({ veiculo, contrato })}
                      className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-purple-600/20"
                    >
                      <ShieldCheck size={14} /> Gerenciar Caução
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-[#16171f] border border-white/5 text-center">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Exigido</span>
                      <span className="text-sm font-black text-white font-mono">{formatCurrency(res.exigido)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-emerald-400 block">Saldo Líquido</span>
                      <span className="text-sm font-black text-emerald-400 font-mono">{formatCurrency(res.saldoAtual)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-rose-400 block">Utilizado</span>
                      <span className="text-sm font-black text-rose-400 font-mono">{formatCurrency(res.utilizado)}</span>
                    </div>
                  </div>

                  {res.precisaRepor && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center justify-between">
                      <span>Déficit de garantia a repor:</span>
                      <strong className="font-mono text-rose-400">{formatCurrency(res.deficit)}</strong>
                    </div>
                  )}

                  {contrato.reposicaoCaucao?.ativa && (
                    <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs space-y-1">
                      <div className="flex justify-between font-bold text-blue-300">
                        <span>Reposição Semanal Ativa:</span>
                        <span>+{formatCurrency(contrato.reposicaoCaucao.valorParcelaSemanal)} / semana</span>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        {contrato.reposicaoCaucao.parcelasPagas} de {contrato.reposicaoCaucao.quantidadeParcelas} semanas pagas
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAIS DEDICADOS */}
      {modalKmTarget && onSalvarKmDiario && (
        <ModalLancamentoKmDiario
          isOpen={!!modalKmTarget}
          onClose={() => setModalKmTarget(null)}
          veiculo={modalKmTarget.veiculo}
          contrato={modalKmTarget.contrato}
          onSalvarKm={onSalvarKmDiario}
        />
      )}

      {modalManutTarget && onSalvarItensManutencao && onRegistrarManutencaoRealizada && (
        <ModalGerenciarManutencoesLocacao
          isOpen={!!modalManutTarget}
          onClose={() => setModalManutTarget(null)}
          veiculo={modalManutTarget.veiculo}
          contrato={modalManutTarget.contrato}
          onSalvarItensManutencao={onSalvarItensManutencao}
          onRegistrarManutencaoRealizada={onRegistrarManutencaoRealizada}
        />
      )}

      {modalDebitoTarget && onSalvarDebitoMotorista && (
        <ModalNovoDebitoMotorista
          isOpen={!!modalDebitoTarget}
          onClose={() => setModalDebitoTarget(null)}
          veiculo={modalDebitoTarget.veiculo}
          contrato={modalDebitoTarget.contrato}
          onSalvarDebito={onSalvarDebitoMotorista}
        />
      )}

      {modalCaucaoTarget && onSalvarCaucaoMotorista && (
        <ModalGerenciarCaucao
          isOpen={!!modalCaucaoTarget}
          onClose={() => setModalCaucaoTarget(null)}
          veiculo={modalCaucaoTarget.veiculo}
          contrato={modalCaucaoTarget.contrato}
          onSalvarCaucao={onSalvarCaucaoMotorista}
        />
      )}
    </div>
  );
};
