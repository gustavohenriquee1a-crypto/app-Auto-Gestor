import React, { useState, useEffect, useMemo } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  PieChart as PieIcon, 
  Plus, 
  FileSpreadsheet, 
  CheckCircle2, 
  Printer, 
  ArrowUpRight,
  ArrowDownRight,
  Building,
  Car,
  Layers,
  Wallet,
  Building2,
  Lock,
  Eye,
  EyeOff,
  Scale,
  Receipt,
  Sparkles,
  ShieldCheck,
  PiggyBank,
  Percent,
  CreditCard,
  FileCheck,
  Trash2,
  Edit3,
  X,
  Info,
  HelpCircle,
  Briefcase,
  Zap,
  Users,
  Megaphone,
  Laptop,
  FileText,
  MoreHorizontal,
  ChevronDown,
  Download,
  AlertCircle,
  Wrench,
  Rocket,
  Target,
  Compass
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip as RechartsTooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell, 
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine
} from 'recharts';
import { Veiculo, VendaVeiculo, DespesaFixa, ContaBancariaCaixa, FechamentoCaixaDiario } from '../types';
import { 
  formatCurrency, 
  formatCurrencyDetailed, 
  formatDate, 
  formatPercent,
  calculateTotalDespesas, 
  calculateCustoTotal,
  calculateDRESummary,
  DRESummaryData,
  DespesaCategoriaAgrupada
} from '../utils/formatters';
import { 
  subscribeContasBancarias, 
  saveContaBancariaFirestore, 
  deleteContaBancariaFirestore,
  DEFAULT_CONTAS_BANCARIAS 
} from '../services/firestoreService';

interface FinanceiroDREViewProps {
  veiculos: Veiculo[];
  vendas: VendaVeiculo[];
  despesasFixas: DespesaFixa[];
  onOpenNovaDespesaFixa: () => void;
  onOpenNovaDespesaChassi: () => void;
}

type TabFinanceiro = 'dre' | 'contas_mes' | 'bancos_caixa' | 'fechamento_cego';

export const FinanceiroDREView: React.FC<FinanceiroDREViewProps> = ({
  veiculos,
  vendas,
  despesasFixas,
  onOpenNovaDespesaFixa,
  onOpenNovaDespesaChassi,
}) => {
  const [activeTab, setActiveTab] = useState<TabFinanceiro>('dre');
  const [filtroPeriodo, setFiltroPeriodo] = useState<string>('todos');
  const [tooltipAtivo, setTooltipAtivo] = useState<string | null>(null);

  // Extrair lista de meses únicos com movimentações para o filtro
  const listaMesesDisponiveis = useMemo(() => {
    const mesesSet = new Set<string>();
    
    vendas.forEach((v) => {
      if (v.dataVenda && v.dataVenda.length >= 7) {
        mesesSet.add(v.dataVenda.substring(0, 7));
      }
    });

    despesasFixas.forEach((d) => {
      if (d.mesReferencia && d.mesReferencia.length >= 7) {
        mesesSet.add(d.mesReferencia.substring(0, 7));
      } else if (d.dataVencimento && d.dataVencimento.length >= 7) {
        mesesSet.add(d.dataVencimento.substring(0, 7));
      }
    });

    // Incluir o mês atual caso não haja registros ainda
    const mesAtual = new Date().toISOString().substring(0, 7);
    mesesSet.add(mesAtual);

    return Array.from(mesesSet).sort().reverse();
  }, [vendas, despesasFixas]);

  // Apuração do DRE utilizando o motor de cálculo unificado
  const dre: DRESummaryData = useMemo(() => {
    return calculateDRESummary(vendas, veiculos, despesasFixas, filtroPeriodo);
  }, [vendas, veiculos, despesasFixas, filtroPeriodo]);

  // Estado de Contas Bancárias & Caixas (Sincronizado com Firestore)
  const [contasBancarias, setContasBancarias] = useState<ContaBancariaCaixa[]>(() => {
    try {
      const saved = localStorage.getItem('autogestor_contas_bancarias');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_CONTAS_BANCARIAS;
  });

  useEffect(() => {
    const unsub = subscribeContasBancarias((contas) => {
      if (contas && contas.length > 0) {
        setContasBancarias(contas);
      }
    });
    return () => unsub();
  }, []);

  // Modal de Conta Bancária
  const [modalContaOpen, setModalContaOpen] = useState(false);
  const [editingContaId, setEditingContaId] = useState<string | null>(null);
  const [formConta, setFormConta] = useState({
    nome: '',
    tipo: 'Conta Corrente PJ' as ContaBancariaCaixa['tipo'],
    banco: '',
    agencia: '',
    conta: '',
    saldo: 0,
  });

  const handleOpenNovaConta = () => {
    setEditingContaId(null);
    setFormConta({
      nome: '',
      tipo: 'Conta Corrente PJ',
      banco: '',
      agencia: '',
      conta: '',
      saldo: 0,
    });
    setModalContaOpen(true);
  };

  const handleOpenEditarConta = (conta: ContaBancariaCaixa) => {
    setEditingContaId(conta.id);
    setFormConta({
      nome: conta.nome,
      tipo: conta.tipo,
      banco: conta.banco || '',
      agencia: conta.agencia || '',
      conta: conta.conta || '',
      saldo: conta.saldo,
    });
    setModalContaOpen(true);
  };

  const handleSaveConta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formConta.nome.trim()) return;

    if (editingContaId) {
      const existing = contasBancarias.find(c => c.id === editingContaId);
      const updated: ContaBancariaCaixa = {
        ...(existing || { id: editingContaId }),
        ...formConta,
      };
      setContasBancarias((prev) =>
        prev.map((c) => (c.id === editingContaId ? updated : c))
      );
      await saveContaBancariaFirestore(updated);
    } else {
      const newConta: ContaBancariaCaixa = {
        id: 'banco-' + Date.now(),
        ...formConta,
      };
      setContasBancarias((prev) => [...prev, newConta]);
      await saveContaBancariaFirestore(newConta);
    }
    setModalContaOpen(false);
  };

  const handleDeleteConta = async (id: string) => {
    if (window.confirm('Deseja realmente remover esta conta bancária?')) {
      setContasBancarias((prev) => prev.filter((c) => c.id !== id));
      await deleteContaBancariaFirestore(id);
    }
  };

  // Fechamento Cego de Caixa
  const [valorInformadoOperador, setValorInformadoOperador] = useState<number | ''>('');
  const [operadorNome, setOperadorNome] = useState('Operador de Caixa');
  const [obsFechamentoCego, setObsFechamentoCego] = useState('');
  const [fechamentoConcluido, setFechamentoConcluido] = useState<FechamentoCaixaDiario | null>(null);

  // Capital Investido em Estoque de Carros no Pátio (Frota Ativa)
  const capitalEstoqueAtivo = veiculos.filter(v => v.status !== 'Vendido').reduce((acc, v) => acc + calculateCustoTotal(v), 0);
  const saldoTotalBancos = contasBancarias.reduce((acc, c) => acc + c.saldo, 0);

  // Dados para Gráfico de Distribuição de Despesas & Custos
  const pieExpensesData = useMemo(() => {
    return [
      { name: 'Custo Compra (Vendidos)', value: dre.cmvCompraVendidos, color: '#3B82F6' },
      { name: 'Recondicionamento & Oficinas', value: dre.cmvRecondicionamentoVendidos, color: '#F97316' },
      { name: 'Comissões de Vendedores', value: dre.cmvComissoesVendidos, color: '#EC4899' },
      { name: 'Despesas Fixas da Loja', value: dre.totalDespesasFixas, color: '#8B5CF6' },
      { name: 'Provisão Tributária (Simples)', value: dre.provisaoTributaria, color: '#F59E0B' },
      { name: 'Fundo Garantia CDC 90d', value: dre.provisaoGarantiaCdc, color: '#06B6D4' },
      { name: 'Repasses & Distribuições', value: dre.totalRepassesEDistribuicoes, color: '#D946EF' },
    ].filter((d) => d.value > 0);
  }, [dre]);

  // Dados para Gráfico Waterfall em Barras do DRE
  const barBreakdownData = useMemo(() => {
    return [
      { name: 'Rec. Bruta', valor: dre.receitaOperacionalBruta, fill: '#10B981', tipo: 'receita' },
      { name: 'CMV Total', valor: dre.cmvTotal, fill: '#EF4444', tipo: 'custo' },
      { name: 'Lucro Bruto', valor: dre.lucroBrutoOperacional, fill: '#3B82F6', tipo: 'subtotal' },
      { name: 'Desp. Fixas', valor: dre.totalDespesasFixas, fill: '#F59E0B', tipo: 'despesa' },
      { name: 'Provisões', valor: dre.totalProvisoes, fill: '#8B5CF6', tipo: 'provisao' },
      { name: 'Repasses & Dist.', valor: dre.totalRepassesEDistribuicoes, fill: '#D946EF', tipo: 'distribuicao' },
      { name: 'Lucro Líquido', valor: dre.lucroLiquidoReal, fill: dre.lucroLiquidoReal >= 0 ? '#10B981' : '#F43F5E', tipo: 'resultado' },
    ];
  }, [dre]);

  // Estado para expandir tabela de auditoria de vendas via tráfego
  const [mostrarDetalhesAgencia, setMostrarDetalhesAgencia] = useState(false);

  // Métrica Analítica: Viabilidade da Agência de Tráfego & Performance de Anúncios
  const viabilidadeMarketing = useMemo(() => {
    const vendasFiltradas = filtroPeriodo === 'todos'
      ? vendas
      : vendas.filter((v) => v.dataVenda && v.dataVenda.startsWith(filtroPeriodo));

    const despesasFixasFiltradas = filtroPeriodo === 'todos'
      ? despesasFixas
      : despesasFixas.filter((df) => {
          if (df.mesReferencia && df.mesReferencia.startsWith(filtroPeriodo)) return true;
          if (df.dataVencimento && df.dataVencimento.startsWith(filtroPeriodo)) return true;
          if (df.dataPagamento && df.dataPagamento.startsWith(filtroPeriodo)) return true;
          return false;
        });

    // 1. Fee Fixo da Agência de Tráfego / Marketing
    const feeFixoAgencia = despesasFixasFiltradas
      .filter((df) => 
        df.categoria === 'Mensalidade / Fee Fixo da Agência' || 
        (df.categoria === 'Marketing / Publicidade' && (
          df.descricao?.toLowerCase().includes('fee') ||
          df.descricao?.toLowerCase().includes('agência') ||
          df.descricao?.toLowerCase().includes('agencia') ||
          df.descricao?.toLowerCase().includes('tráfego') ||
          df.descricao?.toLowerCase().includes('trafego')
        ))
      )
      .reduce((acc, df) => acc + (Number(df.valor) || 0), 0);

    // 2. Anúncios Patrocinados alocados por veículo/chassi no período
    let totalAnunciosChassis = 0;
    veiculos.forEach((v) => {
      (v.despesas || []).forEach((dp) => {
        if (dp.categoria === 'Anúncio Patrocinado (Meta/Google Ads)') {
          if (filtroPeriodo === 'todos' || (dp.data && dp.data.startsWith(filtroPeriodo))) {
            totalAnunciosChassis += (Number(dp.valor) || 0);
          }
        }
      });
    });

    // Anúncios informados na venda que não duplicam com despesas de chassi
    const totalAnunciosVendasNaoDuplicadas = vendasFiltradas.reduce((acc, v) => {
      const veic = veiculos.find((x) => x.id === v.veiculoId);
      const temDespesaNoChassi = veic?.despesas?.some((d) => d.categoria === 'Anúncio Patrocinado (Meta/Google Ads)');
      if (!temDespesaNoChassi && v.investimentoAnuncioProprio) {
        return acc + Number(v.investimentoAnuncioProprio);
      }
      return acc;
    }, 0);

    const custoTotalAnunciosCarros = totalAnunciosChassis + totalAnunciosVendasNaoDuplicadas;

    // 3. Custo Total de Marketing (Fee Fixo + Anúncios)
    const custoTotalMarketing = feeFixoAgencia + custoTotalAnunciosCarros;

    // 4. Vendas originadas em Tráfego Pago / Anúncios
    const vendasViaAds = vendasFiltradas.filter((v) => {
      const canal = (v.canalOrigem || '').toLowerCase();
      return (
        canal.includes('anúncio pago') ||
        canal.includes('anuncio pago') ||
        canal.includes('tráfego') ||
        canal.includes('trafego') ||
        canal.includes('ads')
      );
    });

    const totalVendasAds = vendasViaAds.length;
    const faturamentoAds = vendasViaAds.reduce((acc, v) => acc + (Number(v.valorVenda) || 0), 0);
    const lucroBrutoAds = vendasViaAds.reduce((acc, v) => {
      const lucro = v.lucroLiquido !== undefined ? Number(v.lucroLiquido) : (Number(v.valorVenda) - Number(v.custoTotal));
      return acc + (lucro || 0);
    }, 0);

    // 5. Lucro Líquido Real do Canal = Lucro Bruto Ads - Custo Total de Marketing
    const lucroLiquidoRealCanal = lucroBrutoAds - custoTotalMarketing;

    // 6. CAC Médio (Custo de Aquisição por Cliente) = Custo Total de Marketing / Total de Vendas via Ads
    const cacMedio = totalVendasAds > 0 ? (custoTotalMarketing / totalVendasAds) : custoTotalMarketing;

    // 7. ROI & ROAS
    const roas = custoTotalMarketing > 0 ? (faturamentoAds / custoTotalMarketing) : 0;
    const roi = custoTotalMarketing > 0 ? ((lucroLiquidoRealCanal / custoTotalMarketing) * 100) : 0;

    // 8. Indicador de Viabilidade
    const isViabilidadePositiva = lucroLiquidoRealCanal >= 0;

    return {
      feeFixoAgencia,
      custoTotalAnunciosCarros,
      custoTotalMarketing,
      totalVendasAds,
      faturamentoAds,
      lucroBrutoAds,
      lucroLiquidoRealCanal,
      cacMedio,
      roas,
      roi,
      isViabilidadePositiva,
      vendasViaAds,
    };
  }, [vendas, veiculos, despesasFixas, filtroPeriodo]);

  // Comparativo Semestral dos Últimos 6 Meses: Custos Fixos vs. Custos Variáveis (Chassi/Oficinas) vs. Receita Bruta (Vendas + Aluguéis)
  const dadosComparativo6Meses = useMemo(() => {
    const meses = [];
    const hoje = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const ano = d.getFullYear();
      const mesNum = (d.getMonth() + 1).toString().padStart(2, '0');
      const chaveMes = `${ano}-${mesNum}`;

      const nomesMeses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const nomesCompletos = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ];
      const rotuloMes = `${nomesMeses[d.getMonth()]}/${ano.toString().slice(-2)}`;
      const rotuloCompleto = `${nomesCompletos[d.getMonth()]} de ${ano}`;

      // 1. Receita Bruta = Vendas do mês + Aluguéis de locações recebidos no mês + Retornos TAC
      const vendasDoMes = vendas.filter((v) => v.dataVenda && v.dataVenda.startsWith(chaveMes));
      const receitaVendas = vendasDoMes.reduce((acc, v) => acc + (v.valorVenda || 0), 0);
      const receitaRetornoTac = vendasDoMes.reduce((acc, v) => acc + (v.retornoFinanciamentoTac || 0), 0);

      // Aluguéis de locações com pagamento realizado no mês
      let receitaAlugueis = 0;
      veiculos.forEach((v) => {
        if (v.contratoAtivo?.pagamentos) {
          v.contratoAtivo.pagamentos.forEach((p) => {
            if (p.status === 'Pago' && p.dataPagamento && p.dataPagamento.startsWith(chaveMes)) {
              receitaAlugueis += p.valor;
            }
          });
        }
      });

      const receitaBrutaTotal = receitaVendas + receitaAlugueis + receitaRetornoTac;

      // 2. Custos Fixos (Estrutura fixa da loja: Aluguel, salários administrativos, softwares, luz, água)
      const fixasDoMes = despesasFixas.filter((df) => {
        if (df.mesReferencia && df.mesReferencia.startsWith(chaveMes)) return true;
        if (df.dataVencimento && df.dataVencimento.startsWith(chaveMes)) return true;
        if (df.dataPagamento && df.dataPagamento.startsWith(chaveMes)) return true;
        return false;
      });
      const totalCustosFixos = fixasDoMes.reduce((acc, df) => acc + (df.valor || 0), 0);

      // 3. Custos Variáveis (Manutenção / Despesas de Chassi / Oficinas / Peças / Funilaria lançadas no mês)
      let totalCustosVariaveisChassi = 0;
      let qtdServicosChassi = 0;
      veiculos.forEach((v) => {
        if (v.despesas && Array.isArray(v.despesas)) {
          v.despesas.forEach((dp) => {
            if (dp.data && dp.data.startsWith(chaveMes)) {
              totalCustosVariaveisChassi += (dp.valor || 0);
              qtdServicosChassi++;
            }
          });
        }
      });

      const totalCustosOperacionais = totalCustosFixos + totalCustosVariaveisChassi;
      const resultadoOperacional = receitaBrutaTotal - totalCustosOperacionais;
      const margemOperacionalPct = receitaBrutaTotal > 0 ? (resultadoOperacional / receitaBrutaTotal) * 100 : 0;
      const coberturaFixos = totalCustosFixos > 0 ? (receitaBrutaTotal / totalCustosFixos) : 0;

      meses.push({
        chave: chaveMes,
        mes: rotuloMes,
        mesCompleto: rotuloCompleto,
        receitaBruta: receitaBrutaTotal,
        receitaVendas,
        receitaAlugueis,
        receitaRetornoTac,
        custosFixos: totalCustosFixos,
        custosVariaveis: totalCustosVariaveisChassi,
        totalCustos: totalCustosOperacionais,
        resultadoOperacional,
        margemOperacionalPct,
        coberturaFixos,
        qtdVendas: vendasDoMes.length,
        qtdServicosChassi,
        isMesAtual: i === 0,
      });
    }

    const totalReceita6M = meses.reduce((acc, m) => acc + m.receitaBruta, 0);
    const totalFixos6M = meses.reduce((acc, m) => acc + m.custosFixos, 0);
    const totalVariaveis6M = meses.reduce((acc, m) => acc + m.custosVariaveis, 0);
    const totalResultado6M = totalReceita6M - (totalFixos6M + totalVariaveis6M);
    const mediaReceitaMensal = totalReceita6M / 6;
    const mediaCustosMensal = (totalFixos6M + totalVariaveis6M) / 6;

    return {
      meses,
      totalReceita6M,
      totalFixos6M,
      totalVariaveis6M,
      totalResultado6M,
      mediaReceitaMensal,
      mediaCustosMensal,
    };
  }, [vendas, veiculos, despesasFixas]);

  // Fechamento Cego de Caixa Submissão
  const handleExecutarFechamentoCego = (e: React.FormEvent) => {
    e.preventDefault();
    if (valorInformadoOperador === '') return;

    const saldoEsperadoSistema = contasBancarias.find(c => c.tipo === 'Caixa Físico')?.saldo || 6450.00;
    const diferenca = Number(valorInformadoOperador) - saldoEsperadoSistema;

    const res: FechamentoCaixaDiario = {
      id: `fcd-${Date.now()}`,
      data: new Date().toISOString().split('T')[0],
      saldoEsperadoSistema,
      saldoInformadoOperador: Number(valorInformadoOperador),
      diferenca,
      status: Math.abs(diferenca) < 0.01 ? 'Batido' : diferenca > 0 ? 'Sobra' : 'Falta',
      operadorNome,
      observacoes: obsFechamentoCego.trim() || undefined,
    };

    setFechamentoConcluido(res);
  };

  // Função para imprimir DRE Contábil
  const handleImprimirDRE = () => {
    window.print();
  };

  // Formatar rótulo do mês selecionado
  const formatNomeMes = (mesStr: string) => {
    if (mesStr === 'todos') return 'Acumulado Geral (Todos os Períodos)';
    const [ano, mes] = mesStr.split('-');
    const nomes = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const idx = parseInt(mes, 10) - 1;
    return `${nomes[idx] || mes} de ${ano}`;
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 1. Top Header com Filtro de Período e Ações */}
      <div className="bg-[#111116] p-5 rounded-3xl border border-white/5 shadow-none flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <DollarSign size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-white tracking-tight">
                Controle Financeiro & DRE Gerencial
              </h3>
              <p className="text-xs text-slate-400">
                Demonstrativo de Resultado do Exercício de alta granularidade contábil, CMV real e provisões legais.
              </p>
            </div>
          </div>
        </div>

        {/* Subtabs Selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-black/40 p-1 rounded-2xl border border-white/10 text-xs">
            <button
              onClick={() => setActiveTab('dre')}
              className={`px-3.5 py-2 rounded-xl font-bold transition whitespace-nowrap cursor-pointer ${
                activeTab === 'dre' ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              📊 DRE Consolidado
            </button>
            <button
              onClick={() => setActiveTab('contas_mes')}
              className={`px-3.5 py-2 rounded-xl font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'contas_mes' ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Receipt size={14} /> Contas da Loja ({despesasFixas.length})
            </button>
            <button
              onClick={() => setActiveTab('bancos_caixa')}
              className={`px-3.5 py-2 rounded-xl font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'bancos_caixa' ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Building2 size={14} /> Bancos & Giro
            </button>
            <button
              onClick={() => setActiveTab('fechamento_cego')}
              className={`px-3.5 py-2 rounded-xl font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'fechamento_cego' ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Lock size={14} /> Fechamento Cego
            </button>
          </div>
        </div>
      </div>

      {/* ================= ABA 1: DRE CONSOLIDADO & CASCATA CONTÁBIL ================= */}
      {activeTab === 'dre' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Barra de Filtro de Competência e Botão de Impressão */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#13141c] p-3.5 rounded-2xl border border-white/5">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-purple-400" />
              <span className="text-xs font-bold text-slate-300">Competência de Apuração:</span>
              <select
                value={filtroPeriodo}
                onChange={(e) => setFiltroPeriodo(e.target.value)}
                className="bg-black/50 border border-purple-500/30 rounded-xl px-3 py-1.5 text-xs text-purple-200 font-bold outline-none cursor-pointer focus:border-purple-400"
              >
                <option value="todos">🌐 Todo o Histórico (Acumulado Geral)</option>
                {listaMesesDisponiveis.map((m) => (
                  <option key={m} value={m}>
                    📅 {formatNomeMes(m)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onOpenNovaDespesaFixa}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 font-semibold text-xs border border-white/10 flex items-center gap-1.5 cursor-pointer transition"
              >
                <Plus size={14} className="text-amber-400" />
                <span>+ Lançar Conta da Loja</span>
              </button>

              <button
                onClick={handleImprimirDRE}
                className="px-3.5 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-200 font-bold text-xs border border-purple-500/30 flex items-center gap-1.5 cursor-pointer transition"
                title="Imprimir ou exportar relatório em PDF"
              >
                <Printer size={14} />
                <span>Imprimir DRE</span>
              </button>
            </div>
          </div>

          {/* 1. TOP CARDS DE RESUMO TOTALIZADORES GRANDES E COLORIDOS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Receita Operacional Bruta */}
            <div className="bg-gradient-to-br from-[#121c16] to-[#0d1410] p-5 rounded-3xl border border-emerald-500/30 shadow-lg shadow-emerald-950/20 relative overflow-hidden group hover:border-emerald-500/50 transition">
              <div className="flex items-center justify-between pb-2">
                <span className="text-[11px] text-emerald-400 uppercase font-black tracking-wider flex items-center gap-1.5">
                  <TrendingUp size={14} />
                  1. Receita Operacional Bruta
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold border border-emerald-500/30">
                  Base 100%
                </span>
              </div>
              <p className="text-2xl font-black text-white font-mono tracking-tight mt-1">
                {formatCurrency(dre.receitaOperacionalBruta)}
              </p>
              <div className="mt-3 pt-2 border-t border-emerald-500/15 space-y-1 text-[11px] text-slate-300 font-medium">
                <div className="flex justify-between">
                  <span className="text-slate-400">Vendas ({dre.quantidadeVendas}):</span>
                  <span className="font-mono text-emerald-300 font-bold">{formatCurrency(dre.receitaVendas)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Locações de Frota:</span>
                  <span className="font-mono text-emerald-300">{formatCurrency(dre.receitaLocacoes)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Retornos TAC Bancários:</span>
                  <span className="font-mono text-emerald-300 font-bold">+{formatCurrency(dre.receitaRetornoTac)}</span>
                </div>
              </div>
            </div>

            {/* Card 2: CMV (Custo das Mercadorias Vendidas) */}
            <div className="bg-gradient-to-br from-[#1f1214] to-[#170d0e] p-5 rounded-3xl border border-rose-500/30 shadow-lg shadow-rose-950/20 relative overflow-hidden group hover:border-rose-500/50 transition">
              <div className="flex items-center justify-between pb-2">
                <span className="text-[11px] text-rose-400 uppercase font-black tracking-wider flex items-center gap-1.5">
                  <Car size={14} />
                  2. CMV (Custos dos Veículos)
                </span>
                <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full font-bold border border-rose-500/30 font-mono">
                  {formatPercent(dre.pctCmvTotal)}
                </span>
              </div>
              <p className="text-2xl font-black text-rose-400 font-mono tracking-tight mt-1">
                -{formatCurrency(dre.cmvTotal)}
              </p>
              <div className="mt-3 pt-2 border-t border-rose-500/15 space-y-1 text-[11px] text-slate-300 font-medium">
                <div className="flex justify-between">
                  <span className="text-slate-400">Compra / Aquisição:</span>
                  <span className="font-mono text-rose-300 font-bold">{formatCurrency(dre.cmvCompraVendidos)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Oficinas & Preparação:</span>
                  <span className="font-mono text-rose-300">{formatCurrency(dre.cmvRecondicionamentoVendidos)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Comissões de Venda:</span>
                  <span className="font-mono text-rose-300">{formatCurrency(dre.cmvComissoesVendidos)}</span>
                </div>
              </div>
            </div>

            {/* Card 3: Despesas Fixas Operacionais */}
            <div className="bg-gradient-to-br from-[#1c1710] to-[#14100b] p-5 rounded-3xl border border-amber-500/30 shadow-lg shadow-amber-950/20 relative overflow-hidden group hover:border-amber-500/50 transition">
              <div className="flex items-center justify-between pb-2">
                <span className="text-[11px] text-amber-400 uppercase font-black tracking-wider flex items-center gap-1.5">
                  <Building size={14} />
                  3. Despesas Fixas da Loja
                </span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold border border-amber-500/30 font-mono">
                  {formatPercent(dre.pctDespesasFixas)}
                </span>
              </div>
              <p className="text-2xl font-black text-amber-400 font-mono tracking-tight mt-1">
                -{formatCurrency(dre.totalDespesasFixas)}
              </p>
              <div className="mt-3 pt-2 border-t border-amber-500/15 space-y-1 text-[11px] text-slate-300 font-medium">
                <div className="flex justify-between">
                  <span className="text-slate-400">Contas Liquidadas:</span>
                  <span className="font-mono text-emerald-400 font-bold">{formatCurrency(dre.totalDespesasPagas)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Pendentes / A Vencer:</span>
                  <span className="font-mono text-amber-300">{formatCurrency(dre.totalDespesasPendentes)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Provisões Legais & CDC:</span>
                  <span className="font-mono text-purple-300 font-bold">-{formatCurrency(dre.totalProvisoes)}</span>
                </div>
              </div>
            </div>

            {/* Card 4: Lucro Líquido Real & Margem Líquida */}
            <div className="bg-gradient-to-br from-[#0c2419] via-[#0d1d17] to-[#121324] p-5 rounded-3xl border border-emerald-500/50 shadow-xl shadow-emerald-950/40 relative overflow-hidden group hover:border-emerald-400 transition">
              <div className="flex items-center justify-between pb-2">
                <span className="text-[11px] text-emerald-300 uppercase font-black tracking-wider flex items-center gap-1.5">
                  <Sparkles size={14} className="text-yellow-400" />
                  Lucro Líquido Real
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-black border font-mono ${
                  dre.margemLiquidaPercent >= 10 
                    ? 'bg-emerald-500 text-black border-emerald-400' 
                    : dre.margemLiquidaPercent > 0 
                    ? 'bg-emerald-500/30 text-emerald-300 border-emerald-500/40' 
                    : 'bg-rose-500/30 text-rose-300 border-rose-500/40'
                }`}>
                  Margem: {formatPercent(dre.margemLiquidaPercent)}
                </span>
              </div>
              <p className={`text-2xl font-black font-mono tracking-tight mt-1 ${
                dre.lucroLiquidoReal >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {formatCurrency(dre.lucroLiquidoReal)}
              </p>
              <div className="mt-3 pt-2 border-t border-emerald-500/20 space-y-1 text-[11px] font-medium">
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">Lucro Bruto Operacional:</span>
                  <span className="font-mono text-blue-400 font-bold">{formatCurrency(dre.lucroBrutoOperacional)}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">Margem Bruta (s/ CMV):</span>
                  <span className="font-mono text-blue-300 font-bold">{formatPercent(dre.margemBrutaPercent)}</span>
                </div>
                <div className="flex justify-between items-center text-emerald-300 pt-0.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Resultado Final:</span>
                  <span className="text-[10px] bg-emerald-500/20 px-1.5 py-0.2 rounded text-emerald-300 font-bold">
                    100% Livre de Custos
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 1.1 CARD ANALÍTICO DE PERFORMANCE & VIABILIDADE DA AGÊNCIA DE TRÁFEGO */}
          <div className="bg-gradient-to-br from-[#13111c] via-[#101018] to-[#0c0d14] p-6 rounded-3xl border border-purple-500/30 shadow-xl shadow-purple-950/20 relative overflow-hidden space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-purple-500/20 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center border border-purple-500/30">
                    <Rocket size={17} />
                  </div>
                  <h4 className="font-extrabold text-base text-white flex items-center gap-2">
                    <span>Viabilidade da Agência de Tráfego & Custo de Anúncios</span>
                  </h4>
                  <span className="text-[10px] bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    Retorno sobre Investimento (ROI Marketing)
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Metrificação real do fee fixo da agência somado aos custos de anúncios patrocinados por carro vs. margem líquida gerada nas vendas convertidas por tráfego.
                </p>
              </div>

              {/* BADGE DE VIABILIDADE: VERDE (LUCRO) OU VERMELHO (PREJUÍZO) */}
              <div className="flex items-center gap-2">
                {viabilidadeMarketing.isViabilidadePositiva ? (
                  <div className="flex items-center gap-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-3.5 py-1.5 rounded-2xl shadow-lg shadow-emerald-950/30">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-black uppercase tracking-wider">
                      Viabilidade Positiva • Agência Dá Lucro (+{formatCurrency(viabilidadeMarketing.lucroLiquidoRealCanal)})
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 bg-rose-500/20 text-rose-300 border border-rose-500/40 px-3.5 py-1.5 rounded-2xl shadow-lg shadow-rose-950/30">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-400 animate-pulse" />
                    <span className="text-xs font-black uppercase tracking-wider">
                      Viabilidade Negativa • Agência em Alerta ({formatCurrency(viabilidadeMarketing.lucroLiquidoRealCanal)})
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 4 MÉTRICAS-CHAVE DA AGÊNCIA */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1. Custo Total de Marketing */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between">
                  <span>1. Custo Total de Marketing</span>
                  <span className="text-slate-500 font-mono">Fee + Ads</span>
                </span>
                <p className="text-xl font-black text-rose-400 font-mono">
                  {formatCurrency(viabilidadeMarketing.custoTotalMarketing)}
                </p>
                <div className="pt-2 mt-1 border-t border-white/5 text-[11px] text-slate-400 space-y-0.5">
                  <div className="flex justify-between">
                    <span>Fee Fixo Agência:</span>
                    <span className="font-mono text-slate-300 font-semibold">{formatCurrency(viabilidadeMarketing.feeFixoAgencia)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Anúncios dos Carros:</span>
                    <span className="font-mono text-slate-300 font-semibold">{formatCurrency(viabilidadeMarketing.custoTotalAnunciosCarros)}</span>
                  </div>
                </div>
              </div>

              {/* 2. Lucro Bruto Ads */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between">
                  <span>2. Lucro Bruto (Vendas Ads)</span>
                  <span className="text-blue-400 font-mono font-bold">{viabilidadeMarketing.totalVendasAds} vendas</span>
                </span>
                <p className="text-xl font-black text-blue-400 font-mono">
                  {formatCurrency(viabilidadeMarketing.lucroBrutoAds)}
                </p>
                <div className="pt-2 mt-1 border-t border-white/5 text-[11px] text-slate-400 space-y-0.5">
                  <div className="flex justify-between">
                    <span>Faturamento Ads:</span>
                    <span className="font-mono text-slate-300 font-semibold">{formatCurrency(viabilidadeMarketing.faturamentoAds)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ROAS (Receita / Custo):</span>
                    <span className="font-mono text-blue-300 font-bold">{viabilidadeMarketing.roas.toFixed(2)}x</span>
                  </div>
                </div>
              </div>

              {/* 3. Lucro Líquido Real do Canal */}
              <div className={`p-4 rounded-2xl border space-y-1 ${
                viabilidadeMarketing.isViabilidadePositiva 
                  ? 'bg-emerald-950/20 border-emerald-500/30' 
                  : 'bg-rose-950/20 border-rose-500/30'
              }`}>
                <span className="text-[10px] uppercase font-bold flex items-center justify-between text-slate-300">
                  <span>3. Lucro Líquido Real</span>
                  <span className="font-mono text-[9px] text-slate-400">Lucro Ads - Custos Mkt</span>
                </span>
                <p className={`text-xl font-black font-mono ${
                  viabilidadeMarketing.lucroLiquidoRealCanal >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {formatCurrency(viabilidadeMarketing.lucroLiquidoRealCanal)}
                </p>
                <div className="pt-2 mt-1 border-t border-white/5 text-[11px] space-y-0.5">
                  <div className="flex justify-between text-slate-300">
                    <span>ROI sobre Marketing:</span>
                    <span className={`font-mono font-bold ${
                      viabilidadeMarketing.roi >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {viabilidadeMarketing.roi >= 0 ? '+' : ''}{viabilidadeMarketing.roi.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Margem Real:</span>
                    <span className="font-mono text-slate-300">
                      {viabilidadeMarketing.faturamentoAds > 0 
                        ? `${((viabilidadeMarketing.lucroLiquidoRealCanal / viabilidadeMarketing.faturamentoAds) * 100).toFixed(1)}%` 
                        : '0,0%'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 4. CAC Médio */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between">
                  <span>4. CAC Médio</span>
                  <span className="text-purple-400 font-mono font-bold">Por Carro Vendido</span>
                </span>
                <p className="text-xl font-black text-purple-300 font-mono">
                  {formatCurrency(viabilidadeMarketing.cacMedio)}
                </p>
                <div className="pt-2 mt-1 border-t border-white/5 text-[11px] text-slate-400 space-y-0.5">
                  <div className="flex justify-between">
                    <span>Carros Vendidos via Ads:</span>
                    <span className="font-mono text-slate-300 font-bold">{viabilidadeMarketing.totalVendasAds}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Eficiência do CAC:</span>
                    <span className="font-mono text-purple-300 font-semibold">
                      {viabilidadeMarketing.totalVendasAds > 0 ? 'Convertendo' : 'Sem Vendas no Período'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* BOTÃO E LISTAGEM DE DETALHES DE VENDAS DO CANAL */}
            <div className="pt-1 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setMostrarDetalhesAgencia(!mostrarDetalhesAgencia)}
                className="self-start text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1.5 bg-purple-500/10 hover:bg-purple-500/20 px-3.5 py-1.5 rounded-xl border border-purple-500/20 transition cursor-pointer"
              >
                <Target size={14} />
                <span>{mostrarDetalhesAgencia ? 'Ocultar Veículos Vendidos por Tráfego' : `Ver Detalhamento dos ${viabilidadeMarketing.totalVendasAds} Carros Vendidos por Tráfego`}</span>
                <ChevronDown size={14} className={`transform transition-transform ${mostrarDetalhesAgencia ? 'rotate-180' : ''}`} />
              </button>

              {mostrarDetalhesAgencia && (
                <div className="bg-black/40 rounded-2xl border border-white/10 p-4 space-y-3 animate-fadeIn">
                  <h5 className="font-bold text-xs text-white flex items-center gap-2">
                    <span>Auditoria de Conversões & Lucro por Chassi (Origem: Tráfego Pago / Anúncios)</span>
                  </h5>

                  {viabilidadeMarketing.vendasViaAds.length === 0 ? (
                    <p className="text-xs text-slate-400 py-3 text-center">
                      Nenhuma venda registrada com origem em Tráfego Pago / Anúncios no período selecionado.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-white/10 text-slate-400 text-[10px] uppercase font-bold">
                            <th className="py-2 px-3">Data</th>
                            <th className="py-2 px-3">Veículo / Placa</th>
                            <th className="py-2 px-3">Comprador</th>
                            <th className="py-2 px-3 text-right">Valor Venda</th>
                            <th className="py-2 px-3 text-right">Custo Total</th>
                            <th className="py-2 px-3 text-right">Lucro Bruto</th>
                            <th className="py-2 px-3 text-right">Ads Alocado</th>
                            <th className="py-2 px-3 text-center">Canal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-slate-200 font-medium">
                          {viabilidadeMarketing.vendasViaAds.map((v) => {
                            const veic = veiculos.find((x) => x.id === v.veiculoId);
                            const adsChassi = (veic?.despesas || [])
                              .filter((d) => d.categoria === 'Anúncio Patrocinado (Meta/Google Ads)')
                              .reduce((s, d) => s + (Number(d.valor) || 0), 0);
                            const adsVenda = Number(v.investimentoAnuncioProprio) || 0;
                            const adsTotalCarro = adsChassi > 0 ? adsChassi : adsVenda;

                            return (
                              <tr key={v.id} className="hover:bg-white/5 transition">
                                <td className="py-2.5 px-3 font-mono text-slate-400">{formatDate(v.dataVenda)}</td>
                                <td className="py-2.5 px-3">
                                  <span className="font-bold text-white block">{v.modelo}</span>
                                  <span className="font-mono text-[10px] text-slate-400">{v.placa}</span>
                                </td>
                                <td className="py-2.5 px-3 text-slate-300">{v.compradorNome}</td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                                  {formatCurrency(v.valorVenda)}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                                  {formatCurrency(v.custoTotal)}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                                  {formatCurrency(v.lucroLiquido)}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono text-purple-300 font-semibold">
                                  {adsTotalCarro > 0 ? formatCurrency(adsTotalCarro) : '-'}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                    {v.canalOrigem}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* NOVO COMPONENTE RECHARTS: COMPARATIVO SEMESTRAL CUSTOS FIXOS VS. CUSTOS VARIÁVEIS VS. RECEITA BRUTA */}
          <div className="bg-[#111116] p-6 rounded-3xl border border-white/5 space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/5 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h4 className="font-extrabold text-base text-white flex items-center gap-2">
                    <TrendingUp size={20} className="text-emerald-400" />
                    <span>Comparativo Semestral: Custos Fixos vs. Custos Variáveis vs. Receita Bruta</span>
                  </h4>
                  <span className="text-[10px] bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    Últimos 6 Meses • Ponto de Equilíbrio
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Visão comparativa da evolução de <strong>Receita Bruta (Vendas + Aluguéis)</strong>, <strong>Custos Fixos da Loja</strong> e <strong>Custos Variáveis (Manutenções/Despesas de Chassi)</strong>.
                </p>
              </div>

              {/* Legenda Customizada */}
              <div className="flex items-center gap-4 text-xs font-semibold flex-wrap bg-[#16171f] px-3.5 py-2 rounded-2xl border border-white/5">
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-3 h-3 rounded bg-emerald-500 inline-block" />
                  <span>Receita Bruta (Vendas + Locações)</span>
                </div>
                <div className="flex items-center gap-1.5 text-amber-400">
                  <span className="w-3 h-3 rounded bg-amber-500 inline-block" />
                  <span>Custos Fixos (Estrutura)</span>
                </div>
                <div className="flex items-center gap-1.5 text-orange-400">
                  <span className="w-3 h-3 rounded bg-orange-500 inline-block" />
                  <span>Custos Variáveis (Chassi/Oficinas)</span>
                </div>
                <div className="flex items-center gap-1.5 text-indigo-400">
                  <span className="w-3 h-1 rounded bg-indigo-400 inline-block" />
                  <span>Resultado Líquido</span>
                </div>
              </div>
            </div>

            {/* 4 Cards Totalizadores do Semestre */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Receita Bruta 6M */}
              <div className="bg-[#16171f] p-4 rounded-2xl border border-emerald-500/20 space-y-1">
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
                  Receita Bruta Semestral
                </span>
                <p className="text-xl font-black text-white font-mono">
                  {formatCurrency(dadosComparativo6Meses.totalReceita6M)}
                </p>
                <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1">
                  <span>Média Mensal:</span>
                  <span className="font-mono text-emerald-300 font-bold">
                    {formatCurrency(dadosComparativo6Meses.mediaReceitaMensal)}/mês
                  </span>
                </div>
              </div>

              {/* Card 2: Custos Fixos 6M */}
              <div className="bg-[#16171f] p-4 rounded-2xl border border-amber-500/20 space-y-1">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
                  Custos Fixos Totais
                </span>
                <p className="text-xl font-black text-white font-mono">
                  {formatCurrency(dadosComparativo6Meses.totalFixos6M)}
                </p>
                <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1">
                  <span>% da Receita Bruta:</span>
                  <span className="font-mono text-amber-300 font-bold">
                    {dadosComparativo6Meses.totalReceita6M > 0
                      ? formatPercent((dadosComparativo6Meses.totalFixos6M / dadosComparativo6Meses.totalReceita6M) * 100)
                      : '0.0%'}
                  </span>
                </div>
              </div>

              {/* Card 3: Custos Variáveis Chassi 6M */}
              <div className="bg-[#16171f] p-4 rounded-2xl border border-orange-500/20 space-y-1">
                <span className="text-[11px] font-bold text-orange-400 uppercase tracking-wider block">
                  Custos Variáveis de Chassi
                </span>
                <p className="text-xl font-black text-white font-mono">
                  {formatCurrency(dadosComparativo6Meses.totalVariaveis6M)}
                </p>
                <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1">
                  <span>Oficinas & Recondicionamento:</span>
                  <span className="font-mono text-orange-300 font-bold">
                    {dadosComparativo6Meses.totalReceita6M > 0
                      ? formatPercent((dadosComparativo6Meses.totalVariaveis6M / dadosComparativo6Meses.totalReceita6M) * 100)
                      : '0.0%'}
                  </span>
                </div>
              </div>

              {/* Card 4: Resultado Operacional 6M */}
              <div className="bg-[#16171f] p-4 rounded-2xl border border-indigo-500/20 space-y-1">
                <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider block">
                  Resultado Operacional Semestre
                </span>
                <p className={`text-xl font-black font-mono ${
                  dadosComparativo6Meses.totalResultado6M >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {formatCurrency(dadosComparativo6Meses.totalResultado6M)}
                </p>
                <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1">
                  <span>Margem Operacional Média:</span>
                  <span className="font-mono text-indigo-300 font-bold">
                    {dadosComparativo6Meses.totalReceita6M > 0
                      ? formatPercent((dadosComparativo6Meses.totalResultado6M / dadosComparativo6Meses.totalReceita6M) * 100)
                      : '0.0%'}
                  </span>
                </div>
              </div>
            </div>

            {/* Gráfico Recharts ComposedChart (Barras Agrupadas + Linha de Resultado) */}
            <div className="h-80 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={dadosComparativo6Meses.meses} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis 
                    dataKey="mes" 
                    stroke="#94A3B8" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={{ stroke: '#ffffff20' }}
                  />
                  <YAxis 
                    stroke="#94A3B8" 
                    fontSize={11} 
                    tickLine={false}
                    axisLine={{ stroke: '#ffffff20' }}
                    tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`} 
                  />
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-[#16171f] border border-white/20 p-4 rounded-2xl shadow-2xl text-xs space-y-2.5 min-w-[260px] text-white">
                            <div className="border-b border-white/10 pb-1.5 flex items-center justify-between">
                              <span className="font-extrabold text-sm text-purple-300">{data.mesCompleto}</span>
                              {data.isMesAtual && (
                                <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded font-bold">
                                  Mês Atual
                                </span>
                              )}
                            </div>

                            {/* Detalhe de Receita */}
                            <div className="space-y-1">
                              <div className="flex justify-between font-bold text-emerald-400">
                                <span>(+) Receita Bruta Total:</span>
                                <span className="font-mono">{formatCurrency(data.receitaBruta)}</span>
                              </div>
                              <div className="flex justify-between text-[11px] text-slate-400 pl-2">
                                <span>• Vendas de Veículos ({data.qtdVendas} un):</span>
                                <span className="font-mono text-slate-200">{formatCurrency(data.receitaVendas)}</span>
                              </div>
                              <div className="flex justify-between text-[11px] text-slate-400 pl-2">
                                <span>• Aluguéis de Locações:</span>
                                <span className="font-mono text-slate-200">{formatCurrency(data.receitaAlugueis)}</span>
                              </div>
                              {data.receitaRetornoTac > 0 && (
                                <div className="flex justify-between text-[11px] text-slate-400 pl-2">
                                  <span>• Retorno TAC Financeiras:</span>
                                  <span className="font-mono text-slate-200">{formatCurrency(data.receitaRetornoTac)}</span>
                                </div>
                              )}
                            </div>

                            {/* Detalhe de Custos */}
                            <div className="space-y-1 pt-1 border-t border-white/10">
                              <div className="flex justify-between font-semibold text-amber-400">
                                <span>(-) Custos Fixos Loja:</span>
                                <span className="font-mono">{formatCurrency(data.custosFixos)}</span>
                              </div>
                              <div className="flex justify-between font-semibold text-orange-400">
                                <span>(-) Custos Variáveis Chassi ({data.qtdServicosChassi} serv):</span>
                                <span className="font-mono">{formatCurrency(data.custosVariaveis)}</span>
                              </div>
                              <div className="flex justify-between font-bold text-rose-400 pt-0.5">
                                <span>(=) Total de Custos:</span>
                                <span className="font-mono">{formatCurrency(data.totalCustos)}</span>
                              </div>
                            </div>

                            {/* Resultado Líquido */}
                            <div className="pt-2 border-t border-white/10 flex justify-between items-center font-black">
                              <span className="text-slate-300">Resultado Operacional:</span>
                              <span className={`font-mono text-sm ${data.resultadoOperacional >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {formatCurrency(data.resultadoOperacional)}
                              </span>
                            </div>
                            <div className="flex justify-between text-[10px] text-slate-400">
                              <span>Margem Operacional:</span>
                              <span className="font-mono font-bold text-indigo-300">{formatPercent(data.margemOperacionalPct)}</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  
                  {/* Linha Zero */}
                  <ReferenceLine y={0} stroke="#ffffff30" />

                  {/* Barras Agrupadas */}
                  <Bar dataKey="receitaBruta" name="Receita Bruta" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="custosFixos" name="Custos Fixos" fill="#F59E0B" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="custosVariaveis" name="Custos Variáveis Chassi" fill="#F97316" radius={[4, 4, 0, 0]} maxBarSize={32} />

                  {/* Linha de Resultado Operacional */}
                  <Line 
                    type="monotone" 
                    dataKey="resultadoOperacional" 
                    name="Resultado Operacional" 
                    stroke="#818CF8" 
                    strokeWidth={3} 
                    dot={{ r: 4, fill: '#818CF8', strokeWidth: 2, stroke: '#111116' }}
                    activeDot={{ r: 6, fill: '#A5B4FC' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Dica Gerencial e Análise de Equilíbrio */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-3.5 bg-[#16171f] rounded-2xl border border-white/5 text-xs space-y-1">
                <span className="font-bold text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-400" />
                  <span>Cobertura de Custos Fixos & Margem de Segurança</span>
                </span>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  A receita operacional média de <strong>{formatCurrency(dadosComparativo6Meses.mediaReceitaMensal)}</strong> permite absorver a estrutura fixa da loja de forma previsível, garantindo que o faturamento de vendas e aluguéis cubra com folga as despesas estruturais.
                </p>
              </div>

              <div className="p-3.5 bg-[#16171f] rounded-2xl border border-white/5 text-xs space-y-1">
                <span className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Wrench size={14} className="text-orange-400" />
                  <span>Impacto dos Custos Variáveis de Chassi</span>
                </span>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Os custos com recondicionamento, funilaria e peças somaram <strong>{formatCurrency(dadosComparativo6Meses.totalVariaveis6M)}</strong> no semestre. O acompanhamento chassi a chassi evita desvios no CMV e preserva a margem real de cada veículo.
                </p>
              </div>
            </div>
          </div>

          {/* Gráficos Visuais da Cascata do DRE */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Gráfico 1: Cascata / Fluxo Contábil */}
            <div className="lg:col-span-2 bg-[#111116] p-5 rounded-3xl border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <TrendingUp size={16} className="text-emerald-400" />
                  Fluxo Contábil em Cascata do DRE (R$)
                </h4>
                <span className="text-[10px] text-slate-400 bg-white/5 px-2 py-0.5 rounded-full">
                  Receitas → Deduções → Lucro
                </span>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barBreakdownData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                    <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} />
                    <YAxis stroke="#94A3B8" fontSize={11} tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`} />
                    <RechartsTooltip 
                      formatter={(val: any) => [formatCurrency(Number(val)), 'Total']}
                      contentStyle={{ backgroundColor: '#16171f', borderColor: '#ffffff20', borderRadius: '12px', color: '#fff' }}
                    />
                    <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
                      {barBreakdownData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfico 2: Composição de Custos & Despesas */}
            <div className="bg-[#111116] p-5 rounded-3xl border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <PieIcon size={16} className="text-purple-400" />
                  Composição de Custos & Despesas
                </h4>
              </div>
              <div className="h-64">
                {pieExpensesData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-500 text-xs text-center p-4">
                    Nenhuma despesa ou custo registrado no período selecionado.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieExpensesData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={75}
                        innerRadius={45}
                        paddingAngle={3}
                      >
                        {pieExpensesData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        formatter={(val: any) => [formatCurrency(Number(val)), 'Valor']}
                        contentStyle={{ backgroundColor: '#16171f', borderColor: '#ffffff20', borderRadius: '12px', color: '#fff' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* 2. TABELA DO DRE GERENCIAL CONSOLIDADO (ESTILO RELATÓRIO CONTÁBIL) */}
          <div className="bg-[#111116] rounded-3xl border border-white/5 p-5 space-y-4 shadow-none">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
              <div>
                <h4 className="font-extrabold text-white text-base flex items-center gap-2">
                  <FileSpreadsheet size={18} className="text-emerald-400" />
                  Demonstrativo do Resultado do Exercício (DRE Gerencial em Cascata)
                </h4>
                <p className="text-xs text-slate-400">
                  Visão contábil precisa com segregação de Receita Operacional, CMV, Despesas Fixas por Categoria e Provisões Fiscais/CDC.
                </p>
              </div>

              <span className="text-[11px] bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2.5 py-1 rounded-xl font-mono">
                {formatNomeMes(filtroPeriodo)}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="bg-[#16171f] text-slate-400 uppercase font-sans border-b border-white/5 text-[11px]">
                    <th className="py-3 px-4">Rubrica / Conta Contábil</th>
                    <th className="py-3 px-4 text-right">Valor Consolidado (R$)</th>
                    <th className="py-3 px-4 text-right">% s/ Receita Bruta</th>
                    <th className="py-3 px-4 text-center w-12">Info</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {/* 1. RECEITA OPERACIONAL BRUTA */}
                  <tr className="bg-emerald-950/20 font-bold text-white">
                    <td className="py-3 px-4 flex items-center gap-2 font-sans text-sm">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
                      <span>1. (+) RECEITA OPERACIONAL BRUTA</span>
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-400 font-bold text-sm">
                      {formatCurrency(dre.receitaOperacionalBruta)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-200 font-bold">
                      100.0%
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button 
                        onClick={() => setTooltipAtivo(tooltipAtivo === 'rec_bruta' ? null : 'rec_bruta')}
                        className="text-slate-400 hover:text-emerald-400 p-1 cursor-pointer"
                        title="Ver detalhes da Receita Bruta"
                      >
                        <Info size={14} />
                      </button>
                    </td>
                  </tr>

                  {/* 1.1 Vendas */}
                  <tr className="text-slate-300 hover:bg-white/5 transition">
                    <td className="py-2.5 px-8 font-sans text-slate-300 flex items-center gap-2">
                      <span className="text-slate-500">•</span>
                      <span>Receita com Vendas de Veículos ({dre.quantidadeVendas} unidades)</span>
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-200">{formatCurrency(dre.receitaVendas)}</td>
                    <td className="py-2.5 px-4 text-right text-slate-400">{formatPercent(dre.pctReceitaVendas)}</td>
                    <td className="py-2.5 px-4"></td>
                  </tr>

                  {/* 1.2 Locações */}
                  <tr className="text-slate-300 hover:bg-white/5 transition">
                    <td className="py-2.5 px-8 font-sans text-slate-300 flex items-center gap-2">
                      <span className="text-slate-500">•</span>
                      <span>Receita com Locação / Aluguel de Frota ({dre.quantidadeLocacoesAtivas} ativas)</span>
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-200">{formatCurrency(dre.receitaLocacoes)}</td>
                    <td className="py-2.5 px-4 text-right text-slate-400">{formatPercent(dre.pctReceitaLocacoes)}</td>
                    <td className="py-2.5 px-4"></td>
                  </tr>

                  {/* 1.3 Retornos TAC */}
                  <tr className="text-slate-300 hover:bg-white/5 transition">
                    <td className="py-2.5 px-8 font-sans text-slate-300 flex items-center gap-2">
                      <span className="text-slate-500">•</span>
                      <span>Retornos de Financiamento Bancário (TAC / Comissões de Bancos Parceiros)</span>
                    </td>
                    <td className="py-2.5 px-4 text-right text-emerald-400 font-semibold">+{formatCurrency(dre.receitaRetornoTac)}</td>
                    <td className="py-2.5 px-4 text-right text-slate-400">{formatPercent(dre.pctReceitaRetornoTac)}</td>
                    <td className="py-2.5 px-4"></td>
                  </tr>

                  {/* 2. CUSTO DAS MERCADORIAS VENDIDAS (CMV) */}
                  <tr className="bg-rose-950/20 font-bold text-white">
                    <td className="py-3 px-4 flex items-center gap-2 font-sans text-sm">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-400 shrink-0" />
                      <span>2. (-) CUSTO DAS MERCADORIAS VENDIDAS (CMV)</span>
                    </td>
                    <td className="py-3 px-4 text-right text-rose-400 font-bold text-sm">
                      -{formatCurrency(dre.cmvTotal)}
                    </td>
                    <td className="py-3 px-4 text-right text-rose-300 font-bold">
                      {formatPercent(dre.pctCmvTotal)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button 
                        onClick={() => setTooltipAtivo(tooltipAtivo === 'cmv' ? null : 'cmv')}
                        className="text-slate-400 hover:text-rose-400 p-1 cursor-pointer"
                        title="Ver detalhes do CMV"
                      >
                        <Info size={14} />
                      </button>
                    </td>
                  </tr>

                  {/* 2.1 Custo Aquisição */}
                  <tr className="text-slate-300 hover:bg-white/5 transition">
                    <td className="py-2.5 px-8 font-sans text-slate-300 flex items-center gap-2">
                      <span className="text-slate-500">•</span>
                      <span>Custo de Aquisição (Compra dos Veículos Vendidos)</span>
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-300">-{formatCurrency(dre.cmvCompraVendidos)}</td>
                    <td className="py-2.5 px-4 text-right text-slate-400">{formatPercent(dre.pctCmvCompra)}</td>
                    <td className="py-2.5 px-4"></td>
                  </tr>

                  {/* 2.2 Recondicionamento / Oficina */}
                  <tr className="text-slate-300 hover:bg-white/5 transition">
                    <td className="py-2.5 px-8 font-sans text-slate-300 flex items-center gap-2">
                      <span className="text-slate-500">•</span>
                      <span>Gastos de Recondicionamento, Mecânica, Funilaria e Estética (Vendidos)</span>
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-300">-{formatCurrency(dre.cmvRecondicionamentoVendidos)}</td>
                    <td className="py-2.5 px-4 text-right text-slate-400">{formatPercent(dre.pctCmvRecondicionamento)}</td>
                    <td className="py-2.5 px-4"></td>
                  </tr>

                  {/* 2.3 Comissões */}
                  <tr className="text-slate-300 hover:bg-white/5 transition">
                    <td className="py-2.5 px-8 font-sans text-slate-300 flex items-center gap-2">
                      <span className="text-slate-500">•</span>
                      <span>Comissões Pagas a Vendedores / Equipe Comercial</span>
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-300">-{formatCurrency(dre.cmvComissoesVendidos)}</td>
                    <td className="py-2.5 px-4 text-right text-slate-400">{formatPercent(dre.pctCmvComissoes)}</td>
                    <td className="py-2.5 px-4"></td>
                  </tr>

                  {/* (=) LUCRO BRUTO OPERACIONAL */}
                  <tr className="bg-blue-950/30 font-black text-white border-y border-blue-500/30">
                    <td className="py-3 px-4 font-sans text-blue-300 text-sm">
                      (=) LUCRO BRUTO OPERACIONAL (MARGEM BRUTA)
                    </td>
                    <td className="py-3 px-4 text-right text-blue-400 font-bold text-sm">
                      {formatCurrency(dre.lucroBrutoOperacional)}
                    </td>
                    <td className="py-3 px-4 text-right text-blue-300 font-bold">
                      {formatPercent(dre.margemBrutaPercent)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-[10px] text-blue-400 bg-blue-500/20 px-1.5 py-0.5 rounded font-bold">
                        Margem
                      </span>
                    </td>
                  </tr>

                  {/* 3. DESPESAS FIXAS OPERACIONAIS */}
                  <tr className="bg-amber-950/20 font-bold text-white">
                    <td className="py-3 px-4 flex items-center gap-2 font-sans text-sm">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
                      <span>3. (-) DESPESAS FIXAS OPERACIONAIS DA LOJA</span>
                    </td>
                    <td className="py-3 px-4 text-right text-amber-400 font-bold text-sm">
                      -{formatCurrency(dre.totalDespesasFixas)}
                    </td>
                    <td className="py-3 px-4 text-right text-amber-300 font-bold">
                      {formatPercent(dre.pctDespesasFixas)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button 
                        onClick={() => setTooltipAtivo(tooltipAtivo === 'despesas_fixas' ? null : 'despesas_fixas')}
                        className="text-slate-400 hover:text-amber-400 p-1 cursor-pointer"
                        title="Ver detalhes das Despesas Fixas"
                      >
                        <Info size={14} />
                      </button>
                    </td>
                  </tr>

                  {/* Linhas Agrupadas por Categoria de Despesas Fixas */}
                  {dre.despesasPorCategoria.map((cat) => (
                    <tr key={cat.categoria} className="text-slate-300 hover:bg-white/5 transition">
                      <td className="py-2.5 px-8 font-sans text-slate-300 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500">•</span>
                          <span>{cat.nomeExibicao}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 bg-white/5 px-2 py-0.2 rounded font-sans">
                          {cat.itens.length} fatura(s)
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right text-slate-300">-{formatCurrency(cat.total)}</td>
                      <td className="py-2.5 px-4 text-right text-slate-400">{formatPercent(cat.percentualReceita)}</td>
                      <td className="py-2.5 px-4"></td>
                    </tr>
                  ))}

                  {dre.despesasPorCategoria.length === 0 && (
                    <tr className="text-slate-500 italic">
                      <td className="py-2 px-8 font-sans">Nenhuma despesa fixa cadastrada no período.</td>
                      <td className="py-2 px-4 text-right">R$ 0</td>
                      <td className="py-2 px-4 text-right">0.0%</td>
                      <td className="py-2 px-4"></td>
                    </tr>
                  )}

                  {/* 4. PROVISÕES LEGAIS E FISCAIS */}
                  <tr className="bg-purple-950/20 font-bold text-white">
                    <td className="py-3 px-4 flex items-center gap-2 font-sans text-sm">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-400 shrink-0" />
                      <span>4. (-) PROVISÕES LEGAIS E FISCAIS</span>
                    </td>
                    <td className="py-3 px-4 text-right text-purple-300 font-bold text-sm">
                      -{formatCurrency(dre.totalProvisoes)}
                    </td>
                    <td className="py-3 px-4 text-right text-purple-300 font-bold">
                      {formatPercent(dre.pctTotalProvisoes)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button 
                        onClick={() => setTooltipAtivo(tooltipAtivo === 'provisoes' ? null : 'provisoes')}
                        className="text-slate-400 hover:text-purple-400 p-1 cursor-pointer"
                        title="Ver detalhes das Provisões"
                      >
                        <Info size={14} />
                      </button>
                    </td>
                  </tr>

                  {/* 4.1 Provisão Tributária */}
                  <tr className="text-slate-300 hover:bg-white/5 transition">
                    <td className="py-2.5 px-8 font-sans text-slate-300 flex items-center gap-2">
                      <span className="text-slate-500">•</span>
                      <span>Provisão Tributária (Simples Nacional s/ Margem Bruta Efetiva)</span>
                    </td>
                    <td className="py-2.5 px-4 text-right text-amber-300">-{formatCurrency(dre.provisaoTributaria)}</td>
                    <td className="py-2.5 px-4 text-right text-slate-400">{formatPercent(dre.pctProvisaoTributaria)}</td>
                    <td className="py-2.5 px-4"></td>
                  </tr>

                  {/* 4.2 Fundo de Provisão de Garantia CDC 90d */}
                  <tr className="text-slate-300 hover:bg-white/5 transition">
                    <td className="py-2.5 px-8 font-sans text-slate-300 flex items-center gap-2">
                      <span className="text-slate-500">•</span>
                      <span>Fundo de Provisão de Garantia (90 Dias CDC - Motor e Câmbio)</span>
                    </td>
                    <td className="py-2.5 px-4 text-right text-cyan-300">-{formatCurrency(dre.provisaoGarantiaCdc)}</td>
                    <td className="py-2.5 px-4 text-right text-slate-400">{formatPercent(dre.pctProvisaoGarantiaCdc)}</td>
                    <td className="py-2.5 px-4"></td>
                  </tr>

                  {/* 5. REPASSES E DISTRIBUIÇÕES DE LUCRO */}
                  <tr className="bg-fuchsia-950/20 font-bold text-white">
                    <td className="py-3 px-4 flex items-center gap-2 font-sans text-sm">
                      <span className="w-2.5 h-2.5 rounded-full bg-fuchsia-400 shrink-0" />
                      <span>5. (-) REPASSES E DISTRIBUIÇÕES DE LUCRO</span>
                    </td>
                    <td className="py-3 px-4 text-right text-fuchsia-400 font-bold text-sm">
                      -{formatCurrency(dre.totalRepassesEDistribuicoes)}
                    </td>
                    <td className="py-3 px-4 text-right text-fuchsia-300 font-bold">
                      {formatPercent(dre.pctRepassesEDistribuicoes)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button 
                        onClick={() => setTooltipAtivo(tooltipAtivo === 'repasses' ? null : 'repasses')}
                        className="text-slate-400 hover:text-fuchsia-400 p-1 cursor-pointer"
                        title="Ver detalhes dos Repasses e Distribuições"
                      >
                        <Info size={14} />
                      </button>
                    </td>
                  </tr>

                  {/* 5.1 Repasse de Lucro - Parceiro */}
                  <tr className="text-slate-300 hover:bg-white/5 transition">
                    <td className="py-2.5 px-8 font-sans text-slate-300 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">•</span>
                        <span>🤝 Repasse de Lucro - Parceiro (Sócios / Investidores de Veículo)</span>
                      </div>
                      <span className="text-[10px] text-slate-500 bg-white/5 px-2 py-0.5 rounded font-sans">
                        {dre.repassesPorCategoria.find(r => r.categoria === 'Repasse de Lucro - Parceiro')?.itens.length || 0} lançamento(s)
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right text-fuchsia-300">-{formatCurrency(dre.totalRepassesParceiros)}</td>
                    <td className="py-2.5 px-4 text-right text-slate-400">{formatPercent(dre.receitaOperacionalBruta > 0 ? (dre.totalRepassesParceiros / dre.receitaOperacionalBruta) * 100 : 0)}</td>
                    <td className="py-2.5 px-4"></td>
                  </tr>

                  {/* 5.2 Distribuição de Lucro - Sócio/Dono */}
                  <tr className="text-slate-300 hover:bg-white/5 transition">
                    <td className="py-2.5 px-8 font-sans text-slate-300 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">•</span>
                        <span>💼 Distribuição de Lucro - Sócio/Dono (Dividendos & Retiradas)</span>
                      </div>
                      <span className="text-[10px] text-slate-500 bg-white/5 px-2 py-0.5 rounded font-sans">
                        {dre.repassesPorCategoria.find(r => r.categoria === 'Distribuição de Lucro - Sócio/Dono')?.itens.length || 0} lançamento(s)
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right text-fuchsia-300">-{formatCurrency(dre.totalDistribuicaoSocios)}</td>
                    <td className="py-2.5 px-4 text-right text-slate-400">{formatPercent(dre.receitaOperacionalBruta > 0 ? (dre.totalDistribuicaoSocios / dre.receitaOperacionalBruta) * 100 : 0)}</td>
                    <td className="py-2.5 px-4"></td>
                  </tr>

                  {/* 5.3 Comissão/Bônus Extra - Funcionário */}
                  <tr className="text-slate-300 hover:bg-white/5 transition">
                    <td className="py-2.5 px-8 font-sans text-slate-300 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">•</span>
                        <span>⭐ Comissão/Bônus Extra - Funcionário (Premiações Comerciais)</span>
                      </div>
                      <span className="text-[10px] text-slate-500 bg-white/5 px-2 py-0.5 rounded font-sans">
                        {dre.repassesPorCategoria.find(r => r.categoria === 'Comissão/Bônus Extra - Funcionário')?.itens.length || 0} lançamento(s)
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right text-fuchsia-300">-{formatCurrency(dre.totalBonusFuncionarios)}</td>
                    <td className="py-2.5 px-4 text-right text-slate-400">{formatPercent(dre.receitaOperacionalBruta > 0 ? (dre.totalBonusFuncionarios / dre.receitaOperacionalBruta) * 100 : 0)}</td>
                    <td className="py-2.5 px-4"></td>
                  </tr>

                  {/* 5.4 Pró-labore */}
                  <tr className="text-slate-300 hover:bg-white/5 transition">
                    <td className="py-2.5 px-8 font-sans text-slate-300 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">•</span>
                        <span>👔 Pró-labore (Retirada Mensal de Sócios / Diretoria)</span>
                      </div>
                      <span className="text-[10px] text-slate-500 bg-white/5 px-2 py-0.5 rounded font-sans">
                        {dre.repassesPorCategoria.find(r => r.categoria === 'Pró-labore')?.itens.length || 0} lançamento(s)
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right text-fuchsia-300">-{formatCurrency(dre.totalProLabore)}</td>
                    <td className="py-2.5 px-4 text-right text-slate-400">{formatPercent(dre.receitaOperacionalBruta > 0 ? (dre.totalProLabore / dre.receitaOperacionalBruta) * 100 : 0)}</td>
                    <td className="py-2.5 px-4"></td>
                  </tr>

                  {/* (=) LUCRO LÍQUIDO REAL DA OPERAÇÃO */}
                  <tr className="bg-gradient-to-r from-emerald-950/50 via-teal-950/40 to-indigo-950/50 font-black text-white text-sm border-t-2 border-emerald-500/50">
                    <td className="py-3.5 px-4 font-sans uppercase tracking-wider text-emerald-300 flex items-center gap-2">
                      <Sparkles size={16} className="text-yellow-400" />
                      <span>(=) LUCRO LÍQUIDO REAL DA OPERAÇÃO</span>
                    </td>
                    <td className={`py-3.5 px-4 text-right font-bold text-base ${
                      dre.lucroLiquidoReal >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {formatCurrency(dre.lucroLiquidoReal)}
                    </td>
                    <td className="py-3.5 px-4 text-right text-emerald-300 font-black text-sm">
                      {formatPercent(dre.margemLiquidaPercent)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="text-[10px] bg-emerald-500 text-black px-1.5 py-0.5 rounded font-black">
                        LÍQUIDO
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Painel Explicativo Flutuante / Inline caso ativado pelo botão Info */}
            {tooltipAtivo && (
              <div className="p-4 rounded-2xl bg-[#161722] border border-purple-500/30 text-xs space-y-2 animate-fadeIn">
                <div className="flex items-center justify-between text-purple-300 font-bold pb-1 border-b border-white/5">
                  <span className="flex items-center gap-1.5">
                    <HelpCircle size={14} />
                    Detalhamento Metodológico da Conta
                  </span>
                  <button onClick={() => setTooltipAtivo(null)} className="text-slate-400 hover:text-white">
                    <X size={14} />
                  </button>
                </div>
                {tooltipAtivo === 'rec_bruta' && (
                  <p className="text-slate-300 leading-relaxed">
                    <strong>Receita Operacional Bruta:</strong> Soma de todas as entradas faturadas pela empresa no período, englobando venda de veículos seminovos, faturamento de locação semanal/mensal de frotas e retornos bancários (TAC/Comissão das financeiras).
                  </p>
                )}
                {tooltipAtivo === 'cmv' && (
                  <p className="text-slate-300 leading-relaxed">
                    <strong>Custo das Mercadorias Vendidas (CMV):</strong> Custos diretamente associados aos carros vendidos, incluindo valor de aquisição/compra, serviços de recondicionamento mecânico, funilaria, pneus, lavagem e as comissões pagas aos consultores de vendas.
                  </p>
                )}
                {tooltipAtivo === 'despesas_fixas' && (
                  <p className="text-slate-300 leading-relaxed">
                    <strong>Despesas Fixas Operacionais:</strong> Despesas estruturais recorrentes da loja que independem do volume de vendas, como aluguel do pátio, energia, água, internet, folha de pagamento da equipe, softwares e contabilidade.
                  </p>
                )}
                {tooltipAtivo === 'provisoes' && (
                  <p className="text-slate-300 leading-relaxed">
                    <strong>Provisões Legais e Fiscais:</strong> Dedução preventiva de impostos incidentes sobre a margem de lucro (Simples Nacional por Equiparação) e retenção preventiva de reserva técnica de garantia CDC (90 dias de motor e câmbio).
                  </p>
                )}
                {tooltipAtivo === 'repasses' && (
                  <p className="text-slate-300 leading-relaxed">
                    <strong>Repasses e Distribuições:</strong> Destinações de lucro para parceiros investidores do veículo, distribuições de dividendos para sócios/proprietários, comissões ou premiações extras e pró-labore. <em>Não compõem o custo de oficina/preparação do veículo</em> e entram como dedução após apuração do Lucro Operacional.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* 3. TEXTOS EXPLICATIVOS E ORIENTAÇÃO GERENCIAL PARA O DIRETOR / GESTOR */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card Explicativo 1: Fundo de Provisão de Garantia CDC 90 dias */}
            <div className="p-5 rounded-3xl bg-[#111116] border border-cyan-500/20 space-y-2.5 relative overflow-hidden">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wide">
                <ShieldCheck size={18} />
                <span>Fundo de Provisão de Garantia CDC (Art. 26 Lei 8.078/90)</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Por determinação do <strong>Código de Defesa do Consumidor</strong>, toda revendedora de veículos responde obrigatoriamente por vícios aparentes ou ocultos em seminovos pelo prazo de <strong>90 dias</strong> (especialmente motor e câmbio).
              </p>
              <div className="p-3 bg-cyan-950/30 rounded-xl border border-cyan-500/20 text-[11px] text-cyan-200">
                💡 <strong>Finalidade no DRE:</strong> Retém preventivamente uma reserva (sugerido de 2% a 3% do valor do carro) para que chamados de pós-venda sejam cobertos pelo fundo sem descapitalizar o caixa operacional da loja.
              </div>
            </div>

            {/* Card Explicativo 2: Provisão Tributária Simples Nacional por Margem */}
            <div className="p-5 rounded-3xl bg-[#111116] border border-amber-500/20 space-y-2.5 relative overflow-hidden">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wide">
                <Receipt size={18} />
                <span>Provisão Tributária (Simples Nacional s/ Margem Bruta)</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Na comercialização de seminovos sob o regime de <strong>Equiparação Comercial no Simples Nacional</strong>, a base de cálculo dos tributos incide sobre a <strong>margem bruta</strong> (diferença entre o preço de venda e o custo de compra).
              </p>
              <div className="p-3 bg-amber-950/30 rounded-xl border border-amber-500/20 text-[11px] text-amber-200">
                💡 <strong>Finalidade no DRE:</strong> Garante que a empresa visualize seu <em>Lucro Líquido Real</em> já descontada a estimativa exata da alíquota do DAS, evitando surpresas no fechamento contábil mensal.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= ABA 2: CONTAS DO MÊS & DESPESAS DA LOJA ================= */}
      {activeTab === 'contas_mes' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="font-extrabold text-white text-base">Contas do Mês & Despesas Fixas da Loja</h4>
              <p className="text-xs text-slate-400">Controle rigoroso de faturas mensais, prazos de vencimento, pagamentos quitados e comprovantes anexos.</p>
            </div>

            <button
              onClick={onOpenNovaDespesaFixa}
              className="px-4 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-purple-600/20 cursor-pointer transition"
            >
              <Plus size={16} /> Cadastrar Nova Conta da Loja
            </button>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="p-4 rounded-2xl bg-[#111116] border border-white/5">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total de Contas</span>
              <p className="text-xl font-black text-white font-mono mt-1">{formatCurrency(dre.totalDespesasFixas)}</p>
              <span className="text-[10px] text-slate-500">{despesasFixas.length} contas cadastradas</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#111116] border border-emerald-500/20">
              <span className="text-[10px] uppercase font-bold text-emerald-400 block">Total Já Liquidado</span>
              <p className="text-xl font-black text-emerald-400 font-mono mt-1">{formatCurrency(dre.totalDespesasPagas)}</p>
              <span className="text-[10px] text-emerald-500 font-medium">Faturas pagas</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#111116] border border-amber-500/20">
              <span className="text-[10px] uppercase font-bold text-amber-400 block">Pendente / A Vencer</span>
              <p className="text-xl font-black text-amber-400 font-mono mt-1">{formatCurrency(dre.totalDespesasPendentes)}</p>
              <span className="text-[10px] text-amber-500 font-medium">Aguardando quitação</span>
            </div>
          </div>

          {/* Tabela de Contas com Agrupamento por Categoria */}
          <div className="bg-[#111116] rounded-2xl border border-white/5 overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#16171f] text-slate-400 uppercase font-semibold border-b border-white/5">
                  <th className="py-3.5 px-4">Conta / Despesa</th>
                  <th className="py-3.5 px-4">Categoria</th>
                  <th className="py-3.5 px-4">Vencimento</th>
                  <th className="py-3.5 px-4 text-right">Valor Fatura</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Mês Ref.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {despesasFixas.map((df) => (
                  <tr key={df.id} className="hover:bg-white/5 transition">
                    <td className="py-3 px-4">
                      <p className="font-bold text-white">{df.nome || df.descricao}</p>
                      {df.descricao && df.nome && <span className="text-[10px] text-slate-400">{df.descricao}</span>}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 font-medium text-[11px]">
                        {df.categoria}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {df.dataVencimento ? formatDate(df.dataVencimento) : `Dia ${df.diaVencimento || 10}`}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-white text-right">
                      {formatCurrency(df.valor)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] border ${
                        df.status === 'Pago' 
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      }`}>
                        {df.status || 'Pendente'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {df.mesReferencia || 'Agosto/2026'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= ABA 3: BANCOS & CAPITAL DE GIRO ================= */}
      {activeTab === 'bancos_caixa' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="font-extrabold text-white text-base">Contas Bancárias, Caixas & Capital de Giro</h4>
              <p className="text-xs text-slate-400">Controle de saldos bancários, caixas físicos e patrimônio investido em estoque de veículos.</p>
            </div>

            <button
              onClick={handleOpenNovaConta}
              className="px-4 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-purple-600/20 cursor-pointer transition"
            >
              <Plus size={16} /> Nova Conta Bancária / Caixa
            </button>
          </div>

          {/* Cards de Saldo Global */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-3xl bg-[#111116] border border-white/5 space-y-1">
              <span className="text-[11px] uppercase font-bold text-slate-400 block">Saldo Total em Bancos & Caixa</span>
              <p className="text-2xl font-black text-emerald-400 font-mono">{formatCurrency(saldoTotalBancos)}</p>
              <span className="text-[10px] text-slate-500">Liquidez imediata disponível</span>
            </div>

            <div className="p-5 rounded-3xl bg-[#111116] border border-white/5 space-y-1">
              <span className="text-[11px] uppercase font-bold text-slate-400 block">Capital Investido em Veículos no Pátio</span>
              <p className="text-2xl font-black text-blue-400 font-mono">{formatCurrency(capitalEstoqueAtivo)}</p>
              <span className="text-[10px] text-slate-500">{veiculos.filter(v => v.status !== 'Vendido').length} veículos em estoque</span>
            </div>

            <div className="p-5 rounded-3xl bg-gradient-to-r from-purple-950/40 to-blue-950/40 border border-purple-500/30 space-y-1">
              <span className="text-[11px] uppercase font-black text-purple-300 block">Patrimônio Líquido Operacional</span>
              <p className="text-2xl font-black text-white font-mono">{formatCurrency(saldoTotalBancos + capitalEstoqueAtivo)}</p>
              <span className="text-[10px] text-purple-300 font-medium">Bancos + Frota ativa no pátio</span>
            </div>
          </div>

          {/* Lista de Contas Bancárias */}
          {contasBancarias.length === 0 ? (
            <div className="bg-[#111116] border border-white/5 rounded-3xl p-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mx-auto text-slate-400">
                <Building2 size={24} />
              </div>
              <h5 className="font-bold text-white text-sm">Nenhuma conta bancária ou caixa cadastrado</h5>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Cadastre as contas correntes PJ, caixas da gaveta da loja ou fundos de garantia para acompanhar o saldo real da empresa.
              </p>
              <button
                onClick={handleOpenNovaConta}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer mt-2"
              >
                <Plus size={14} /> Adicionar Minha Primeira Conta
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {contasBancarias.map((conta) => (
                <div key={conta.id} className="p-5 rounded-2xl bg-[#111116] border border-white/5 hover:border-white/10 transition flex justify-between items-center group">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Building2 size={16} className="text-purple-400" />
                      <h5 className="font-bold text-white text-sm">{conta.nome}</h5>
                    </div>
                    {conta.banco && <p className="text-xs text-slate-400">{conta.banco} {conta.agencia ? `• Ag: ${conta.agencia}` : ''} {conta.conta ? `• CC: ${conta.conta}` : ''}</p>}
                    <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-slate-400 font-mono border border-white/5 inline-block">
                      {conta.tipo}
                    </span>
                  </div>

                  <div className="text-right space-y-2">
                    <div>
                      <span className="text-xs text-slate-400 block">Saldo Atual:</span>
                      <span className="text-lg font-black text-emerald-400 font-mono">{formatCurrency(conta.saldo)}</span>
                    </div>
                    <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition">
                      <button
                        onClick={() => handleOpenEditarConta(conta)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer"
                        title="Editar Conta"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteConta(conta.id)}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 cursor-pointer"
                        title="Excluir Conta"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Modal Adicionar/Editar Conta */}
          {modalContaOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
              <div className="w-full max-w-md max-h-[90vh] flex flex-col bg-gray-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                <div className="p-5 border-b border-white/10 bg-[#16171e] flex items-center justify-between shrink-0">
                  <h4 className="font-extrabold text-white text-base">
                    {editingContaId ? 'Editar Conta / Caixa' : 'Nova Conta Bancária / Caixa'}
                  </h4>
                  <button
                    onClick={() => setModalContaOpen(false)}
                    className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleSaveConta} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                  <div className="flex-1 overflow-y-auto p-6 space-y-3.5 text-xs">
                    <div>
                      <label className="text-slate-300 font-bold block mb-1">Identificação da Conta *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Itaú Conta Corrente PJ, Gaveta Caixa"
                        value={formConta.nome}
                        onChange={(e) => setFormConta({ ...formConta, nome: e.target.value })}
                        className="w-full p-2.5 rounded-xl bg-black/40 border border-white/10 text-white outline-none focus:border-purple-500"
                      />
                    </div>

                    <div>
                      <label className="text-slate-300 font-bold block mb-1">Tipo de Conta / Caixa *</label>
                      <select
                        value={formConta.tipo}
                        onChange={(e) => setFormConta({ ...formConta, tipo: e.target.value as any })}
                        className="w-full p-2.5 rounded-xl bg-black/40 border border-white/10 text-white outline-none focus:border-purple-500"
                      >
                        <option value="Conta Corrente PJ">Conta Corrente PJ</option>
                        <option value="Caixa Físico">Caixa Físico / Gaveta</option>
                        <option value="Investimento / CDI">Investimento / CDI / Giro</option>
                        <option value="Fundo Garantia">Fundo de Reserva / Garantia</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-slate-300 font-bold block mb-1">Instituição Bancária</label>
                        <input
                          type="text"
                          placeholder="Ex: Itaú, Bradesco, Santander"
                          value={formConta.banco}
                          onChange={(e) => setFormConta({ ...formConta, banco: e.target.value })}
                          className="w-full p-2.5 rounded-xl bg-black/40 border border-white/10 text-white outline-none focus:border-purple-500"
                        />
                      </div>
                      <div>
                        <label className="text-slate-300 font-bold block mb-1">Saldo Atual (R$) *</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={formConta.saldo}
                          onChange={(e) => setFormConta({ ...formConta, saldo: Number(e.target.value) })}
                          className="w-full p-2.5 rounded-xl bg-black/40 border border-emerald-500/40 text-emerald-400 font-bold font-mono outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-slate-300 font-bold block mb-1">Agência</label>
                        <input
                          type="text"
                          placeholder="Ex: 0452"
                          value={formConta.agencia}
                          onChange={(e) => setFormConta({ ...formConta, agencia: e.target.value })}
                          className="w-full p-2.5 rounded-xl bg-black/40 border border-white/10 text-white outline-none focus:border-purple-500"
                        />
                      </div>
                      <div>
                        <label className="text-slate-300 font-bold block mb-1">Nº Conta</label>
                        <input
                          type="text"
                          placeholder="Ex: 12345-6"
                          value={formConta.conta}
                          onChange={(e) => setFormConta({ ...formConta, conta: e.target.value })}
                          className="w-full p-2.5 rounded-xl bg-black/40 border border-white/10 text-white outline-none focus:border-purple-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-4 sm:p-5 border-t border-white/10 bg-[#16171e] flex gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => setModalContaOpen(false)}
                      className="w-1/2 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs transition cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="w-1/2 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition cursor-pointer"
                    >
                      Salvar Conta
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= ABA 4: FECHAMENTO CEGO DE CAIXA ================= */}
      {activeTab === 'fechamento_cego' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-[#111116] p-6 rounded-3xl border border-purple-500/20 max-w-xl mx-auto space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center justify-center font-bold">
                <Lock size={22} />
              </div>
              <div>
                <h4 className="font-black text-white text-base">Fechamento Cego de Caixa Diário</h4>
                <p className="text-xs text-slate-400">O operador digita a contagem física das notas sem ver o saldo prévio do sistema, garantindo auditoria 100% à prova de desvios.</p>
              </div>
            </div>

            <form onSubmit={handleExecutarFechamentoCego} className="space-y-4 text-xs font-mono">
              <div>
                <label className="text-slate-300 font-bold block mb-1">Nome do Operador / Responsável:</label>
                <input
                  type="text"
                  required
                  value={operadorNome}
                  onChange={(e) => setOperadorNome(e.target.value)}
                  className="w-full p-3 rounded-xl bg-black/40 border border-white/10 text-white outline-none"
                />
              </div>

              <div>
                <label className="text-emerald-400 font-bold block mb-1">Contagem Física das Cédulas / Espécie (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="Informe o valor contado na gaveta"
                  value={valorInformadoOperador}
                  onChange={(e) => setValorInformadoOperador(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full p-3.5 rounded-xl bg-black/40 border border-emerald-500/40 text-emerald-400 font-black text-xl outline-none"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Observações do Turno:</label>
                <input
                  type="text"
                  placeholder="Ex: Turno encerrado sem intercorrências"
                  value={obsFechamentoCego}
                  onChange={(e) => setObsFechamentoCego(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-black/40 border border-white/10 text-white outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 cursor-pointer transition"
              >
                <Scale size={16} /> Auditar & Fechar Caixa
              </button>
            </form>

            {fechamentoConcluido && (
              <div className={`p-4 rounded-2xl border space-y-2 font-mono text-xs animate-fadeIn ${
                fechamentoConcluido.status === 'Batido' 
                  ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300' 
                  : 'bg-amber-950/30 border-amber-500/40 text-amber-300'
              }`}>
                <div className="flex justify-between items-center font-bold">
                  <span>Resultado da Auditoria Cega:</span>
                  <span className="text-sm px-2 py-0.5 rounded bg-black/40">{fechamentoConcluido.status.toUpperCase()}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div>Saldo Esperado Sistema: {formatCurrency(fechamentoConcluido.saldoEsperadoSistema)}</div>
                  <div>Valor Contado Operador: {formatCurrency(fechamentoConcluido.saldoInformadoOperador)}</div>
                  <div className="col-span-2 font-bold text-white">
                    Diferença Apurada: {fechamentoConcluido.diferenca >= 0 ? '+' : ''}{formatCurrency(fechamentoConcluido.diferenca)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
