import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  Car, 
  AlertTriangle, 
  CheckCircle2, 
  Plus, 
  Phone, 
  DollarSign, 
  Wrench, 
  TrendingUp, 
  Clock, 
  ShieldCheck, 
  ChevronRight, 
  Search, 
  Gauge, 
  ShieldAlert, 
  Settings2, 
  FileText, 
  ClipboardCheck, 
  Fuel, 
  Check, 
  X, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Receipt, 
  CreditCard, 
  Percent,
  CheckCircle,
  HelpCircle,
  Eye
} from 'lucide-react';
import { 
  Veiculo, 
  ContratoLocacao, 
  PagamentoAluguel, 
  RegistroKmDiario, 
  ItemManutencaoPreventiva, 
  DebitoMotorista, 
  ReposicaoCaucaoParcelada, 
  DespesaVeiculo,
  ChecklistLocacao,
  LancamentoContaMotorista
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
import { ModalNovoChecklistLocacao } from './ModalNovoChecklistLocacao';

export type TabLocacao = 
  | 'dashboard_frota' 
  | 'contratos' 
  | 'checklists' 
  | 'manutencoes'
  // Sub-rotas mantidas para retrocompatibilidade
  | 'km_diario'
  | 'debitos'
  | 'caucao';

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
  // Estado da aba ativa
  const [activeSubTab, setActiveSubTab] = useState<TabLocacao>(() => {
    if (initialSubTab) return initialSubTab;
    return 'dashboard_frota';
  });

  React.useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterApp, setFilterApp] = useState<string>('Todos');
  const [filterChecklistTipo, setFilterChecklistTipo] = useState<'Todos' | 'Retirada' | 'Devolucao'>('Todos');

  // Modals state
  const [modalKmTarget, setModalKmTarget] = useState<{ veiculo: Veiculo; contrato: ContratoLocacao } | null>(null);
  const [modalManutTarget, setModalManutTarget] = useState<{ veiculo: Veiculo; contrato: ContratoLocacao } | null>(null);
  const [modalDebitoTarget, setModalDebitoTarget] = useState<{ veiculo: Veiculo; contrato: ContratoLocacao } | null>(null);
  const [modalCaucaoTarget, setModalCaucaoTarget] = useState<{ veiculo: Veiculo; contrato: ContratoLocacao } | null>(null);
  const [modalNovoChecklistOpen, setModalNovoChecklistOpen] = useState(false);
  const [modalContaCorrenteTarget, setModalContaCorrenteTarget] = useState<{ veiculo: Veiculo; contrato: ContratoLocacao } | null>(null);

  // Checklists persistidos em localStorage com seed inicial de qualidade
  const [checklists, setChecklists] = useState<ChecklistLocacao[]>(() => {
    const saved = localStorage.getItem('autogestor_checklists_locacao');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        // fallback
      }
    }
    return [
      {
        id: 'chk-01',
        contratoId: 'contrato-1',
        veiculoId: 'veic-1',
        placa: 'BRA2E19',
        modelo: 'Chevrolet Onix Plus 1.0 Turbo',
        motoristaNome: 'Carlos Eduardo Silva',
        tipo: 'Retirada',
        data: '2026-02-15',
        km: 42300,
        nivelCombustivel: 'Cheio',
        estadoPneus: 'Bons',
        estepe: true,
        macacoChaveRoda: true,
        documentoVeiculo: true,
        trianguloSinalizacao: true,
        limpeza: 'Impecável',
        avarias: [
          { item: 'Para-choque traseiro', descricao: 'Pequeno risco de 3cm próximo à placa', cobrarDoMotorista: false }
        ],
        responsavelVistoria: 'Marcos Silveira (Supervisor de Frota)',
        assinaturaMotoristaConcordou: true,
        createdAt: '2026-02-15T10:00:00.000Z',
        fotos: [
          'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=400'
        ]
      },
      {
        id: 'chk-02',
        contratoId: 'contrato-2',
        veiculoId: 'veic-2',
        placa: 'RIO9A88',
        modelo: 'Hyundai HB20 1.0 Sense',
        motoristaNome: 'Juliana Ferreira Santos',
        tipo: 'Retirada',
        data: '2026-01-20',
        km: 51200,
        nivelCombustivel: 'Cheio',
        estadoPneus: 'Novos',
        estepe: true,
        macacoChaveRoda: true,
        documentoVeiculo: true,
        trianguloSinalizacao: true,
        limpeza: 'Padrão',
        avarias: [],
        responsavelVistoria: 'Marcos Silveira (Supervisor de Frota)',
        assinaturaMotoristaConcordou: true,
        createdAt: '2026-01-20T14:30:00.000Z',
        fotos: [
          'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=400'
        ]
      }
    ];
  });

  const handleSalvarNovoChecklist = (novoChecklist: ChecklistLocacao) => {
    setChecklists(prev => {
      const updated = [novoChecklist, ...prev];
      try {
        localStorage.setItem('autogestor_checklists_locacao', JSON.stringify(updated));
      } catch (e) {
        console.error('Erro ao salvar vistoria no localStorage', e);
      }
      return updated;
    });
  };

  // Extrair veículos da frota de locação e contratos ativos
  const veiculosFrotaLocacao = useMemo(() => {
    return veiculos.filter(v => v.tipoOperacao === 'Locacao' || !!v.contratoAtivo || v.status === 'Alugado');
  }, [veiculos]);

  const contratosAtivos = useMemo(() => {
    return veiculos
      .filter((v) => v.contratoAtivo && v.contratoAtivo.status === 'Ativo')
      .map((v) => ({
        veiculo: v,
        contrato: v.contratoAtivo!,
      }));
  }, [veiculos]);

  const filteredContratos = useMemo(() => {
    return contratosAtivos.filter(({ veiculo, contrato }) => {
      const matchSearch =
        contrato.motoristaNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contrato.motoristaCpf.includes(searchTerm) ||
        veiculo.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
        veiculo.modelo.toLowerCase().includes(searchTerm.toLowerCase());

      const matchApp = filterApp === 'Todos' || contrato.motoristaApp === filterApp;
      return matchSearch && matchApp;
    });
  }, [contratosAtivos, searchTerm, filterApp]);

  // Cálculos de KPIs do Mini-ERP de Locação
  const totalReceitaSemanal = useMemo(() => {
    return contratosAtivos.reduce((acc, c) => acc + c.contrato.valorSemanal, 0);
  }, [contratosAtivos]);

  const faturamentoRecorrenteMensalMRR = totalReceitaSemanal * 4.33;

  const ticketMedioSemanal = useMemo(() => {
    if (contratosAtivos.length === 0) return 0;
    return totalReceitaSemanal / contratosAtivos.length;
  }, [totalReceitaSemanal, contratosAtivos.length]);

  // Taxa de ocupação da frota
  const totalCarrosFrota = Math.max(contratosAtivos.length, veiculosFrotaLocacao.length);
  const taxaOcupacaoFrota = totalCarrosFrota > 0 ? (contratosAtivos.length / totalCarrosFrota) * 100 : 0;

  // Pagamentos em atraso ou pendentes
  const pagamentosAtrasados = useMemo(() => {
    return contratosAtivos.flatMap((c) =>
      c.contrato.pagamentos
        .filter((p) => p.status === 'Atrasado' || p.status === 'Pendente')
        .map((p) => ({ contrato: c.contrato, veiculo: c.veiculo, pagamento: p }))
    );
  }, [contratosAtivos]);

  const totalInadimplencia = useMemo(() => {
    return pagamentosAtrasados.reduce((acc, item) => acc + item.pagamento.valor, 0);
  }, [pagamentosAtrasados]);

  // Alertas de Manutenção Preventiva
  const todosAlertasManutencao = useMemo(() => {
    return contratosAtivos.flatMap(({ veiculo, contrato }) => {
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
  }, [contratosAtivos]);

  // Total de Caução em Custódia
  const totalCaucaoSaldo = useMemo(() => {
    return contratosAtivos.reduce((acc, c) => {
      const r = calcularResumoCaucao(c.contrato);
      return acc + r.saldoAtual;
    }, 0);
  }, [contratosAtivos]);

  // Débitos e Multas
  const todosDebitos = useMemo(() => {
    return contratosAtivos.flatMap(({ veiculo, contrato }) =>
      (contrato.debitosMotorista || []).map((deb) => ({
        veiculo,
        contrato,
        debito: deb,
      }))
    );
  }, [contratosAtivos]);

  const debitosPendentes = useMemo(() => {
    return todosDebitos.filter(
      (d) => d.debito.status === 'Pendente' || d.debito.status === 'Parcelado com Aluguel'
    );
  }, [todosDebitos]);

  // Manutenções realizadas nos veículos da frota
  const historicoManutencoesFrota = useMemo(() => {
    const list: Array<{ veiculo: Veiculo; despesa: DespesaVeiculo }> = [];
    veiculosFrotaLocacao.forEach(v => {
      (v.despesas || []).forEach(d => {
        if (
          d.tipo === 'Mecânica / Revisão' || 
          d.tipo === 'Pneus' || 
          d.tipo === 'Funilaria / Pintura' || 
          d.descricao.toLowerCase().includes('óleo') ||
          d.descricao.toLowerCase().includes('revisão')
        ) {
          list.push({ veiculo: v, despesa: d });
        }
      });
    });
    return list.sort((a, b) => new Date(b.despesa.data).getTime() - new Date(a.despesa.data).getTime());
  }, [veiculosFrotaLocacao]);

  const totalCustoManutencoesFrota = useMemo(() => {
    return historicoManutencoesFrota.reduce((sum, item) => sum + item.despesa.valor, 0);
  }, [historicoManutencoesFrota]);

  // Função para derivar a Conta Corrente de um motorista
  const gerarContaCorrenteMotorista = (contrato: ContratoLocacao) => {
    const lancamentos: LancamentoContaMotorista[] = [];
    let saldoAcumulado = 0;

    // 1. Caução Depositado (Crédito)
    if (contrato.caucaoTotalPago && contrato.caucaoTotalPago > 0) {
      saldoAcumulado += contrato.caucaoTotalPago;
      lancamentos.push({
        id: `cc-caucao-${contrato.id}`,
        data: contrato.dataInicio,
        tipo: 'CREDITO_CAUCAO',
        descricao: 'Depósito Inicial de Caução Garantidor',
        valor: contrato.caucaoTotalPago,
        saldoApos: saldoAcumulado
      });
    }

    // 2. Pagamentos de Aluguel Efetuados (Crédito)
    contrato.pagamentos.forEach(p => {
      if (p.status === 'Pago') {
        saldoAcumulado += p.valor;
        lancamentos.push({
          id: `cc-pag-${p.id}`,
          data: p.dataPagamento || p.dataVencimento,
          tipo: 'CREDITO_PAGAMENTO',
          descricao: `Pagamento de Aluguel Semanal (${p.semanaReferencia})`,
          valor: p.valor,
          saldoApos: saldoAcumulado
        });
      }
    });

    // 3. Débitos de Semanas Vencidas (Débito)
    contrato.pagamentos.forEach(p => {
      saldoAcumulado -= p.valor;
      lancamentos.push({
        id: `cc-deb-sem-${p.id}`,
        data: p.dataVencimento,
        tipo: 'DEBITO_DIARIA',
        descricao: `Cobrança Semanal de Locação (${p.semanaReferencia})`,
        valor: -p.valor,
        saldoApos: saldoAcumulado
      });
    });

    // 4. Débitos de Multas e Avarias (Débito)
    (contrato.debitosMotorista || []).forEach(d => {
      saldoAcumulado -= d.valorTotal;
      lancamentos.push({
        id: `cc-multa-${d.id}`,
        data: d.dataOcorrencia,
        tipo: d.tipo === 'Multa de Trânsito' ? 'DEBITO_MULTA' : 'DEBITO_AVARIA',
        descricao: `${d.tipo}: ${d.descricao}`,
        valor: -d.valorTotal,
        saldoApos: saldoAcumulado
      });
    });

    // Ordenar por data
    lancamentos.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

    // Recalcular saldoApos em ordem cronológica
    let saldoCorrido = 0;
    lancamentos.forEach(l => {
      saldoCorrido += l.valor;
      l.saldoApos = saldoCorrido;
    });

    return {
      lancamentos,
      saldoFinal: saldoCorrido
    };
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* CABEÇALHO DO MINI-ERP DE LOCAÇÃO */}
      <div className="bg-[#111116] p-6 rounded-2xl border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Car size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                Gestão de Frota & Locadora (Motoristas de App)
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  Unidade de Negócio Independente
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Torre de controle operacional, contratos semanais, conta corrente de motoristas, vistorias e manutenção de frota
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setModalNovoChecklistOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-bold transition flex items-center gap-2 cursor-pointer"
          >
            <ClipboardCheck size={16} className="text-emerald-400" /> Nova Vistoria
          </button>

          <button
            type="button"
            onClick={() => onOpenNovoContrato()}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-blue-600/20 cursor-pointer"
          >
            <Plus size={16} /> Novo Contrato de Locação
          </button>
        </div>
      </div>

      {/* NAVEGAÇÃO PRINCIPAL DO MINI-ERP (4 ABAS REQUISITADAS) */}
      <div className="bg-[#111116] p-2 rounded-2xl border border-white/5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Aba 1: Dashboard de Frota */}
          <button
            type="button"
            onClick={() => setActiveSubTab('dashboard_frota')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'dashboard_frota'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <TrendingUp size={16} />
            🚗 Dashboard de Frota
          </button>

          {/* Aba 2: Contratos Ativos & Histórico */}
          <button
            type="button"
            onClick={() => setActiveSubTab('contratos')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'contratos'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <FileText size={16} />
            📄 Contratos Ativos & Histórico ({contratosAtivos.length})
          </button>

          {/* Aba 3: Checklists & Vistorias */}
          <button
            type="button"
            onClick={() => setActiveSubTab('checklists')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'checklists'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <ClipboardCheck size={16} />
            📋 Checklists & Vistorias ({checklists.length})
          </button>

          {/* Aba 4: Manutenções da Frota */}
          <button
            type="button"
            onClick={() => setActiveSubTab('manutencoes')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'manutencoes'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Wrench size={16} />
            🛠️ Manutenções da Frota
            {todosAlertasManutencao.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-black">
                {todosAlertasManutencao.length}
              </span>
            )}
          </button>
        </div>

        {/* Atalhos Rápidos secundários (retrocompatibilidade perfeita) */}
        <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-xl border border-white/5">
          <button
            type="button"
            onClick={() => setActiveSubTab('km_diario')}
            title="Leituras de Odômetro Diário"
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
              activeSubTab === 'km_diario' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Gauge size={13} /> KM Diário
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('debitos')}
            title="Multas e Débitos de Motoristas"
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
              activeSubTab === 'debitos' ? 'bg-rose-600 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldAlert size={13} /> Multas ({debitosPendentes.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('caucao')}
            title="Gestão de Caução e Garantia"
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
              activeSubTab === 'caucao' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck size={13} /> Caução
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. ABA: DASHBOARD DE FROTA (KPIS DEDICADOS E TORRE DE CONTROLE) */}
      {/* ========================================================================= */}
      {activeSubTab === 'dashboard_frota' && (
        <div className="space-y-6">
          {/* 4 KPIs Solicitados Rigorosamente */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Taxa de Ocupação da Frota */}
            <div className="bg-[#111116] p-5 rounded-2xl border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">Taxa de Ocupação da Frota</span>
                <Percent size={18} className="text-blue-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <h3 className="text-3xl font-black text-blue-400 font-mono">
                  {taxaOcupacaoFrota.toFixed(1)}%
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                {contratosAtivos.length} de {totalCarrosFrota} carros alugados em operação
              </p>
              <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden mt-2">
                <div className="bg-blue-500 h-full rounded-full transition-all" style={{ width: `${Math.min(100, taxaOcupacaoFrota)}%` }} />
              </div>
            </div>

            {/* KPI 2: Ticket Médio Semanal */}
            <div className="bg-[#111116] p-5 rounded-2xl border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">Ticket Médio Semanal</span>
                <DollarSign size={18} className="text-emerald-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <h3 className="text-3xl font-black text-emerald-400 font-mono">
                  {formatCurrency(ticketMedioSemanal)}
                </h3>
                <span className="text-xs text-slate-500 font-semibold">/semana</span>
              </div>
              <p className="text-xs text-slate-400">
                Média contratada por motorista de app ativo
              </p>
            </div>

            {/* KPI 3: Inadimplência R$ */}
            <div className="bg-[#111116] p-5 rounded-2xl border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">Inadimplência R$</span>
                <AlertTriangle size={18} className={totalInadimplencia > 0 ? "text-rose-400" : "text-slate-400"} />
              </div>
              <div className="flex items-baseline gap-2">
                <h3 className={`text-3xl font-black font-mono ${totalInadimplencia > 0 ? "text-rose-400" : "text-slate-300"}`}>
                  {formatCurrency(totalInadimplencia)}
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                {pagamentosAtrasados.length} cobrança(s) semanal(is) pendente(s) ou em atraso
              </p>
            </div>

            {/* KPI 4: Faturamento Recorrente Mensal (MRR) */}
            <div className="bg-[#111116] p-5 rounded-2xl border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">Faturamento Recorrente Mensal (MRR)</span>
                <TrendingUp size={18} className="text-purple-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <h3 className="text-3xl font-black text-purple-400 font-mono">
                  {formatCurrency(faturamentoRecorrenteMensalMRR)}
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                Projeção estimada ({formatCurrency(totalReceitaSemanal)} x 4.33 semanas)
              </p>
            </div>
          </div>

          {/* Seção Central: Status dos Veículos da Frota e Cobranças Prioritárias */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Coluna 1: Visão da Frota de Locação */}
            <div className="bg-[#111116] p-5 rounded-2xl border border-white/5 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <Car size={16} className="text-blue-400" /> Distribuição da Frota
                </h4>
                <span className="text-xs text-slate-400 font-mono">{totalCarrosFrota} carros</span>
              </div>

              <div className="space-y-2.5">
                <div className="p-3 rounded-xl bg-[#16171f] border border-white/5 flex items-center justify-between text-xs">
                  <span className="text-slate-300 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Em Operação (Alugados)
                  </span>
                  <span className="font-bold font-mono text-emerald-400">{contratosAtivos.length} veículos</span>
                </div>

                <div className="p-3 rounded-xl bg-[#16171f] border border-white/5 flex items-center justify-between text-xs">
                  <span className="text-slate-300 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Disponíveis no Pátio
                  </span>
                  <span className="font-bold font-mono text-blue-400">
                    {Math.max(0, totalCarrosFrota - contratosAtivos.length)} veículos
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#16171f] border border-white/5 flex items-center justify-between text-xs">
                  <span className="text-slate-300 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Em Manutenção / Revisão
                  </span>
                  <span className="font-bold font-mono text-amber-400">
                    {todosAlertasManutencao.length} veículo(s)
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#16171f] border border-white/5 flex items-center justify-between text-xs">
                  <span className="text-slate-300 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span> Caução em Custódia
                  </span>
                  <span className="font-bold font-mono text-purple-300">{formatCurrency(totalCaucaoSaldo)}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => onOpenNovoContrato()}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-600/20"
                >
                  <Plus size={14} /> Locar Carro Disponível
                </button>
              </div>
            </div>

            {/* Coluna 2 & 3: Central de Cobranças em Atraso com WhatsApp e Baixa PIX */}
            <div className="lg:col-span-2 bg-[#111116] p-5 rounded-2xl border border-white/5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <AlertTriangle size={18} className="text-amber-400" />
                  <span>Cobranças Semanais com Alerta de Vencimento ({pagamentosAtrasados.length})</span>
                </div>
                <span className="text-xs text-rose-400 font-mono font-bold">
                  Total: {formatCurrency(totalInadimplencia)}
                </span>
              </div>

              {pagamentosAtrasados.length === 0 ? (
                <div className="p-8 rounded-xl bg-[#16171f] border border-white/5 text-center text-xs text-slate-400 space-y-1">
                  <CheckCircle size={32} className="mx-auto text-emerald-400 mb-1" />
                  <p className="font-bold text-slate-200">Nenhuma cobrança em atraso no momento!</p>
                  <p>Todos os motoristas de aplicativo estão rigorosamente em dia com o aluguel semanal.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                  {pagamentosAtrasados.map(({ contrato, veiculo, pagamento }) => (
                    <div key={pagamento.id} className="bg-[#16171f] p-4 rounded-xl border border-amber-500/30 flex flex-col justify-between space-y-3">
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

                      <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
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
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. ABA: CONTRATOS ATIVOS & HISTÓRICO (COM CONTA CORRENTE DO MOTORISTA) */}
      {/* ========================================================================= */}
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
              const cc = gerarContaCorrenteMotorista(contrato);

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

                      {/* Badge Conta Corrente do Motorista */}
                      <button
                        type="button"
                        onClick={() => setModalContaCorrenteTarget({ veiculo, contrato })}
                        className={`px-3 py-2 rounded-xl border text-xs font-bold transition flex flex-col items-start cursor-pointer ${
                          cc.saldoFinal >= 0
                            ? 'bg-emerald-600/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-600/20'
                            : 'bg-rose-600/10 border-rose-500/30 text-rose-300 hover:bg-rose-600/20'
                        }`}
                        title="Ver extrato completo da Conta Corrente"
                      >
                        <span className="text-[9px] uppercase tracking-wider block opacity-80">Conta Corrente</span>
                        <span className="font-mono font-black text-sm">
                          {formatCurrency(cc.saldoFinal)}
                        </span>
                        <span className="text-[9px] underline mt-0.5 flex items-center gap-0.5">
                          Extrato <ChevronRight size={10} />
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Actions & Sub-features Bar */}
                  <div className="p-4 bg-white/[0.02] border-b border-white/5 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Botão Ver Extrato Conta Corrente */}
                      <button
                        type="button"
                        onClick={() => setModalContaCorrenteTarget({ veiculo, contrato })}
                        className="px-3 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Receipt size={14} /> Conta Corrente
                      </button>

                      {/* Botão Atualizar KM Diário */}
                      <button
                        type="button"
                        onClick={() => setModalKmTarget({ veiculo, contrato })}
                        className="px-3 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Gauge size={14} /> Atualizar KM
                      </button>

                      {/* Botão Manutenções Preventivas */}
                      <button
                        type="button"
                        onClick={() => setModalManutTarget({ veiculo, contrato })}
                        className="px-3 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-500/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Wrench size={14} /> Manutenções
                      </button>

                      {/* Botão Registrar Débito */}
                      <button
                        type="button"
                        onClick={() => setModalDebitoTarget({ veiculo, contrato })}
                        className="px-3 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <ShieldAlert size={14} /> Débito / Multa
                      </button>

                      {/* Botão Gerenciar Caução */}
                      <button
                        type="button"
                        onClick={() => setModalCaucaoTarget({ veiculo, contrato })}
                        className="px-3 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <ShieldCheck size={14} /> Gestão Caução
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={`https://wa.me/55${contrato.motoristaTelefone.replace(/\D/g, '')}?text=Olá ${encodeURIComponent(contrato.motoristaNome)}, tudo bem? Falamos da gestão de frotas sobre o veículo ${encodeURIComponent(veiculo.placa)}.`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Phone size={13} /> WhatsApp
                      </a>
                    </div>
                  </div>

                  {/* Contract Body: Payments Grid */}
                  <div className="p-6 space-y-6">
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

      {/* ========================================================================= */}
      {/* 3. ABA: CHECKLISTS & VISTORIAS (SAÍDA E DEVOLUÇÃO COM FOTOS E AVARIAS) */}
      {/* ========================================================================= */}
      {activeSubTab === 'checklists' && (
        <div className="space-y-4">
          <div className="bg-[#111116] p-4 rounded-2xl border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ClipboardCheck size={18} className="text-emerald-400" /> Controle de Vistorias & Checklists da Frota
              </h3>
              <p className="text-xs text-slate-400">
                Laudos fotográficos de retirada e devolução com nível de combustível, pneus, itens de segurança e avarias
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl text-xs font-semibold border border-white/10">
                {(['Todos', 'Retirada', 'Devolucao'] as const).map((tipo) => (
                  <button
                    key={tipo}
                    onClick={() => setFilterChecklistTipo(tipo)}
                    className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                      filterChecklistTipo === tipo ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {tipo === 'Todos' ? 'Todos' : tipo === 'Retirada' ? '🟢 Retirada' : '🔄 Devolução'}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setModalNovoChecklistOpen(true)}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/20 transition cursor-pointer"
              >
                <Plus size={16} /> Nova Vistoria
              </button>
            </div>
          </div>

          {/* Grid de Laudos de Vistoria */}
          {checklists
            .filter(chk => filterChecklistTipo === 'Todos' || chk.tipo === filterChecklistTipo)
            .length === 0 ? (
            <div className="bg-[#111116] rounded-2xl p-12 text-center border border-white/5">
              <ClipboardCheck size={48} className="mx-auto text-slate-600 mb-3" />
              <h4 className="text-base font-bold text-slate-200">Nenhuma vistoria registrada nesta categoria</h4>
              <p className="text-xs text-slate-400 mt-1">Realize a primeira vistoria de saída ou retorno para proteger a frota.</p>
              <button
                onClick={() => setModalNovoChecklistOpen(true)}
                className="mt-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-xl inline-flex items-center gap-1.5 transition cursor-pointer"
              >
                <Plus size={16} /> Registrar Vistoria
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {checklists
                .filter(chk => filterChecklistTipo === 'Todos' || chk.tipo === filterChecklistTipo)
                .map((chk) => (
                  <div key={chk.id} className="bg-[#111116] p-5 rounded-2xl border border-white/5 space-y-4 hover:border-white/15 transition">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-black border ${
                          chk.tipo === 'Retirada'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        }`}>
                          {chk.tipo === 'Retirada' ? '🟢 VISTORIA DE SAÍDA' : '🔄 VISTORIA DE DEVOLUÇÃO'}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">{formatDate(chk.data)}</span>
                      </div>
                      <span className="text-xs font-mono font-black text-blue-400">{formatKm(chk.km)}</span>
                    </div>

                    <div>
                      <h4 className="text-base font-bold text-white">{chk.modelo}</h4>
                      <p className="text-xs text-slate-400">
                        Placa: <strong className="font-mono text-slate-200">{chk.placa}</strong> • Motorista: <strong className="text-slate-200">{chk.motoristaNome}</strong>
                      </p>
                    </div>

                    {/* Especificações do Laudo */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                      <div className="p-2.5 rounded-xl bg-[#16171f] border border-white/5">
                        <span className="text-[10px] text-slate-400 block font-bold uppercase">Combustível</span>
                        <strong className="text-amber-400 font-bold">{chk.nivelCombustivel}</strong>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#16171f] border border-white/5">
                        <span className="text-[10px] text-slate-400 block font-bold uppercase">Pneus</span>
                        <strong className="text-slate-200 font-bold">{chk.estadoPneus}</strong>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#16171f] border border-white/5">
                        <span className="text-[10px] text-slate-400 block font-bold uppercase">Limpeza</span>
                        <strong className="text-slate-200 font-bold">{chk.limpeza}</strong>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#16171f] border border-white/5">
                        <span className="text-[10px] text-slate-400 block font-bold uppercase">Segurança</span>
                        <strong className="text-emerald-400 font-bold">
                          {chk.estepe && chk.macacoChaveRoda ? 'Completo' : 'Incompleto'}
                        </strong>
                      </div>
                    </div>

                    {/* Acessórios conferidos */}
                    <div className="flex flex-wrap gap-2 text-[11px]">
                      <span className={`px-2 py-0.5 rounded-md border ${chk.estepe ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                        Estepe {chk.estepe ? '✓' : '✗'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md border ${chk.macacoChaveRoda ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                        Macaco/Chave {chk.macacoChaveRoda ? '✓' : '✗'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md border ${chk.documentoVeiculo ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                        CRLV {chk.documentoVeiculo ? '✓' : '✗'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md border ${chk.trianguloSinalizacao ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                        Triângulo {chk.trianguloSinalizacao ? '✓' : '✗'}
                      </span>
                    </div>

                    {/* Avarias */}
                    {chk.avarias && chk.avarias.length > 0 && (
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1">
                        <span className="font-bold text-amber-300 block">Avarias Identificadas:</span>
                        {chk.avarias.map((av, idx) => (
                          <div key={idx} className="text-slate-300 flex justify-between">
                            <span>• {av.item}: {av.descricao}</span>
                            {av.cobrarDoMotorista && av.valorAvaria && (
                              <strong className="text-rose-400 font-mono">{formatCurrency(av.valorAvaria)}</strong>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
                      <span>Vistoriador: <strong>{chk.responsavelVistoria}</strong></span>
                      {chk.assinaturaMotoristaConcordou && (
                        <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                          <Check size={14} /> Assinado pelo Motorista
                        </span>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. ABA: MANUTENÇÕES DA FROTA (HISTÓRICO E PREVENTIVAS DEDICADAS) */}
      {/* ========================================================================= */}
      {activeSubTab === 'manutencoes' && (
        <div className="space-y-6">
          {/* Header & KPIs de Manutenção */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-[#111116] border border-white/5">
              <span className="text-[11px] font-bold uppercase text-slate-400">Total Investido em Frota</span>
              <h4 className="text-2xl font-black text-white font-mono mt-1">
                {formatCurrency(totalCustoManutencoesFrota)}
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                {historicoManutencoesFrota.length} serviços realizados em veículos alugados
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#111116] border border-white/5">
              <span className="text-[11px] font-bold uppercase text-slate-400">Alertas Preventivos (KM)</span>
              <h4 className={`text-2xl font-black font-mono mt-1 ${todosAlertasManutencao.length > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {todosAlertasManutencao.length}
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                Óleo, pastilhas, pneus próximos da substituição
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#111116] border border-white/5 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase text-slate-400">Carros Monitorados</span>
                <h4 className="text-2xl font-black text-blue-400 font-mono mt-1">
                  {veiculosFrotaLocacao.length}
                </h4>
              </div>
              <p className="text-xs text-slate-400">
                Veículos de locação com plano de preventivas ativo
              </p>
            </div>
          </div>

          {/* Cards de Preventivas por Veículo Alugado */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Wrench size={16} className="text-amber-400" /> Planos de Manutenção Preventiva por Veículo
            </h4>

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

          {/* Histórico de Despesas Realizadas */}
          {historicoManutencoesFrota.length > 0 && (
            <div className="bg-[#111116] p-5 rounded-2xl border border-white/5 space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Receipt size={16} className="text-blue-400" /> Histórico de Ordens de Serviço & Despesas de Oficina
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-[#16171f] text-slate-400 uppercase text-[10px] font-bold">
                    <tr>
                      <th className="p-3">Data</th>
                      <th className="p-3">Veículo</th>
                      <th className="p-3">Descrição do Serviço</th>
                      <th className="p-3">Oficina / Fornecedor</th>
                      <th className="p-3 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {historicoManutencoesFrota.map(({ veiculo, despesa }) => (
                      <tr key={despesa.id} className="hover:bg-white/[0.02]">
                        <td className="p-3 font-mono">{formatDate(despesa.data)}</td>
                        <td className="p-3 font-bold text-white">{veiculo.modelo} ({veiculo.placa})</td>
                        <td className="p-3">{despesa.descricao}</td>
                        <td className="p-3 text-slate-400">{despesa.fornecedor || 'Oficina Credenciada'}</td>
                        <td className="p-3 text-right font-mono font-bold text-white">{formatCurrency(despesa.valor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. SUB-ABA: KM DIÁRIO (RETROCOMPATIBILIDADE) */}
      {/* ========================================================================= */}
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

      {/* ========================================================================= */}
      {/* 6. SUB-ABA: DÉBITOS E MULTAS (RETROCOMPATIBILIDADE) */}
      {/* ========================================================================= */}
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

      {/* ========================================================================= */}
      {/* 7. SUB-ABA: CAUÇÃO E REPOSIÇÃO (RETROCOMPATIBILIDADE) */}
      {/* ========================================================================= */}
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

      {/* ========================================================================= */}
      {/* MODAL DE CONTA CORRENTE DO MOTORISTA (DÉBITOS VS CRÉDITOS / PAGAMENTOS) */}
      {/* ========================================================================= */}
      {modalContaCorrenteTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#111116] border border-white/10 rounded-2xl w-full max-w-2xl flex flex-col shadow-2xl overflow-hidden animate-fadeIn">
            {/* Header */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-[#16171f]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                  <Receipt size={22} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Conta Corrente: {modalContaCorrenteTarget.contrato.motoristaNome}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Veículo: {modalContaCorrenteTarget.veiculo.modelo} ({modalContaCorrenteTarget.veiculo.placa})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalContaCorrenteTarget(null)}
                className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-white/5 transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content Extrato */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Saldo Líquido Consolidado */}
              {(() => {
                const cc = gerarContaCorrenteMotorista(modalContaCorrenteTarget.contrato);
                const totalCreditos = cc.lancamentos.filter(l => l.valor > 0).reduce((acc, l) => acc + l.valor, 0);
                const totalDebitos = Math.abs(cc.lancamentos.filter(l => l.valor < 0).reduce((acc, l) => acc + l.valor, 0));

                return (
                  <>
                    <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-[#16171f] border border-white/5 text-center">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-emerald-400 block flex items-center justify-center gap-1">
                          <ArrowDownLeft size={12} /> Total Créditos / Pagos
                        </span>
                        <span className="text-sm font-black text-emerald-400 font-mono mt-0.5 block">
                          {formatCurrency(totalCreditos)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-rose-400 block flex items-center justify-center gap-1">
                          <ArrowUpRight size={12} /> Total Débitos / Cobrados
                        </span>
                        <span className="text-sm font-black text-rose-400 font-mono mt-0.5 block">
                          {formatCurrency(totalDebitos)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-300 block">
                          Saldo Líquido Atual
                        </span>
                        <span className={`text-base font-black font-mono mt-0.5 block ${cc.saldoFinal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {formatCurrency(cc.saldoFinal)}
                        </span>
                      </div>
                    </div>

                    {/* Extrato Detalhado */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Extrato Cronológico de Movimentações
                      </h4>

                      <div className="divide-y divide-white/5 border border-white/5 rounded-xl overflow-hidden bg-[#16171f]">
                        {cc.lancamentos.length === 0 ? (
                          <div className="p-6 text-center text-xs text-slate-400">
                            Nenhum lançamento registrado nesta conta corrente ainda.
                          </div>
                        ) : (
                          cc.lancamentos.map((item) => (
                            <div key={item.id} className="p-3 flex items-center justify-between text-xs hover:bg-white/[0.02] transition">
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-[11px] text-slate-400">{formatDate(item.data)}</span>
                                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                    item.valor > 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                                  }`}>
                                    {item.tipo.replace('_', ' ')}
                                  </span>
                                </div>
                                <p className="font-medium text-white">{item.descricao}</p>
                              </div>

                              <div className="text-right">
                                <span className={`font-mono font-bold text-sm block ${
                                  item.valor > 0 ? 'text-emerald-400' : 'text-rose-400'
                                }`}>
                                  {item.valor > 0 ? `+${formatCurrency(item.valor)}` : formatCurrency(item.valor)}
                                </span>
                                <span className="text-[10px] font-mono text-slate-400">
                                  Saldo: {formatCurrency(item.saldoApos)}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10 bg-[#16171f] flex justify-end">
              <button
                type="button"
                onClick={() => setModalContaCorrenteTarget(null)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition cursor-pointer"
              >
                Fechar Extrato
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE NOVA VISTORIA / CHECKLIST DE LOCAÇÃO */}
      {/* ========================================================================= */}
      {modalNovoChecklistOpen && (
        <ModalNovoChecklistLocacao
          isOpen={modalNovoChecklistOpen}
          onClose={() => setModalNovoChecklistOpen(false)}
          contratosAtivos={contratosAtivos}
          onSalvarChecklist={handleSalvarNovoChecklist}
        />
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
