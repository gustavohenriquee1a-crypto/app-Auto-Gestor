import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  TrendingUp,
  Users,
  Gift,
  Briefcase,
  Building2,
  Calendar,
  Phone,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Car,
  DollarSign,
  Sparkles,
  ArrowUpRight,
  ChevronRight,
  Download,
  MessageSquare,
  Award,
  Zap,
  Target,
  BarChart3,
  PieChart as PieChartIcon,
  Compass,
  CreditCard,
  Truck,
  HelpCircle,
  ExternalLink,
  ShieldCheck,
  Percent,
  Flame,
  Star,
  FileSpreadsheet,
  Check,
  ChevronDown
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  TooltipProps
} from 'recharts';
import {
  VendaVeiculo,
  Veiculo,
  Usuario,
  CanalOrigemLead,
  BancoFinanciamentoParceiro
} from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  exportRelatorioVendasCsv,
  exportCrmClientesCsv,
  exportCanaisConversaoCsv,
  exportBancosFinanceirasCsv,
  exportAniversariantesCsv,
  exportProfissoesSegmentosCsv
} from '../utils/exportCsv';

interface CrmAnalyticsViewProps {
  vendas: VendaVeiculo[];
  veiculos: Veiculo[];
  currentUser?: Usuario | null;
  onOpenDossie?: (veiculo: Veiculo) => void;
}

type TabMode = 'dashboard' | 'aniversariantes' | 'profissoes' | 'bancos' | 'testdrive';

const CANAL_COLORS: Record<string, string> = {
  'Redes Sociais (Instagram/Facebook)': '#ec4899', // Pink
  'Anúncio Pago (Google/Meta)': '#3b82f6', // Blue
  'OLX/Webmotors': '#8b5cf6', // Violet
  'Indicação de Cliente': '#10b981', // Emerald
  'Passante/Pátio': '#f59e0b', // Amber
  'Cliente Base/Fidelizado': '#06b6d4', // Cyan
  'Outro': '#64748b', // Slate
};

const BANCO_COLORS: Record<string, string> = {
  'Santander': '#ef4444', // Red
  'BV': '#3b82f6', // Blue
  'Itaú': '#f97316', // Orange
  'Bradesco': '#dc2626', // Crimson
  'Pan': '#06b6d4', // Cyan
  'Outro': '#8b5cf6', // Purple
};

export const CrmAnalyticsView: React.FC<CrmAnalyticsViewProps> = ({
  vendas,
  veiculos,
  currentUser,
  onOpenDossie,
}) => {
  const [activeTab, setActiveTab] = useState<TabMode>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [filtroCanal, setFiltroCanal] = useState<string>('todos');
  const [filtroBanco, setFiltroBanco] = useState<string>('todos');
  const [filtroProfissao, setFiltroProfissao] = useState<string>('todos');
  const [filtroMesAniversario, setFiltroMesAniversario] = useState<string>('proximos30'); // 'todos', 'hoje', '7dias', 'esteMes', 'proximos30', '1'..'12'
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportNotification, setExportNotification] = useState<string | null>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Close export menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    }
    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExportMenu]);

  // Auto-hide export notification
  const triggerNotification = (msg: string) => {
    setExportNotification(msg);
    setTimeout(() => {
      setExportNotification(null);
    }, 4000);
  };

  // Hoje no fuso do sistema
  const hoje = new Date();
  const mesAtual = hoje.getMonth() + 1; // 1-12
  const diaAtual = hoje.getDate();

  // --- 1. Enriquecimento de Dados de Vendas e CRM ---
  const vendasProcessadas = useMemo(() => {
    return vendas.map((v) => {
      // Normalizar campos complementares se vierem vazios
      const canal: CanalOrigemLead = v.canalOrigem || 'Passante/Pátio';
      const realizouTestDrive = v.realizouTestDrive === true;
      const banco: BancoFinanciamentoParceiro = v.financiamentoDetalhes?.bancoParceiro || 'Outro';
      const valorFinanciado = v.financiamentoDetalhes?.valorFinanciado || (v.formaPagamento === 'Financiamento' ? v.valorVenda * 0.8 : 0);
      const retornoTac = v.retornoFinanciamentoTac || v.financiamentoDetalhes?.retornoComissaoBanco || 0;
      
      // Análise de Aniversário
      let mesNiver: number | null = null;
      let diaNiver: number | null = null;
      let diasAteNiver: number | null = null;
      let idade: number | null = null;

      if (v.compradorDataNascimento) {
        try {
          const parts = v.compradorDataNascimento.split('-');
          if (parts.length === 3) {
            const anoN = parseInt(parts[0], 10);
            const mesN = parseInt(parts[1], 10);
            const diaN = parseInt(parts[2], 10);
            mesNiver = mesN;
            diaNiver = diaN;

            idade = hoje.getFullYear() - anoN;
            
            // Calcular quantos dias faltam para o próximo aniversário
            const niverEsteAno = new Date(hoje.getFullYear(), mesN - 1, diaN);
            if (niverEsteAno < new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())) {
              niverEsteAno.setFullYear(hoje.getFullYear() + 1);
            }
            const diffTime = niverEsteAno.getTime() - new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).getTime();
            diasAteNiver = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          }
        } catch {
          // Ignore parse errors
        }
      }

      return {
        ...v,
        canalNormalizado: canal,
        realizouTestDriveNormalizado: realizouTestDrive,
        bancoNormalizado: banco,
        valorFinanciadoCalculado: valorFinanciado,
        retornoTacCalculado: retornoTac,
        mesNiver,
        diaNiver,
        diasAteNiver,
        idade,
        profissaoNormalizada: (v.compradorProfissao || 'Não Informada').trim(),
      };
    });
  }, [vendas]);

  // --- 2. Métricas Consolidadas de Canais de Origem ---
  const metricasCanais = useMemo(() => {
    const map: Record<string, {
      canal: string;
      vendasQtd: number;
      receitaTotal: number;
      lucroTotal: number;
      diasMedioPatio: number;
      somaDias: number;
      ticketMedio: number;
      margemMedia: number;
      testDriveQtd: number;
    }> = {};

    vendasProcessadas.forEach((v) => {
      const canal = v.canalNormalizado;
      if (!map[canal]) {
        map[canal] = {
          canal,
          vendasQtd: 0,
          receitaTotal: 0,
          lucroTotal: 0,
          diasMedioPatio: 0,
          somaDias: 0,
          ticketMedio: 0,
          margemMedia: 0,
          testDriveQtd: 0,
        };
      }
      map[canal].vendasQtd += 1;
      map[canal].receitaTotal += v.valorVenda;
      map[canal].lucroTotal += v.lucroLiquido;
      map[canal].somaDias += v.diasEmPatio || 0;
      if (v.realizouTestDriveNormalizado) {
        map[canal].testDriveQtd += 1;
      }
    });

    const lista = Object.values(map).map((item) => {
      const ticketMedio = item.vendasQtd > 0 ? Number((item.receitaTotal / item.vendasQtd).toFixed(2)) : 0;
      const margemMedia = item.receitaTotal > 0 ? ((item.lucroTotal / item.receitaTotal) * 100) : 0;
      const diasMedioPatio = item.vendasQtd > 0 ? Math.round(item.somaDias / item.vendasQtd) : 0;
      return {
        ...item,
        ticketMedio,
        margemMedia: Number(margemMedia.toFixed(1)),
        diasMedioPatio,
        taxaTestDrive: item.vendasQtd > 0 ? Math.round((item.testDriveQtd / item.vendasQtd) * 100) : 0,
      };
    });

    return lista.sort((a, b) => b.vendasQtd - a.vendasQtd);
  }, [vendasProcessadas]);

  // Dados para Gráficos de Canais
  const dadosGraficoCanaisPizza = useMemo(() => {
    return metricasCanais.map((c) => ({
      name: c.canal.split(' ')[0], // Nome curto
      fullName: c.canal,
      value: c.vendasQtd,
      receita: c.receitaTotal,
      lucro: c.lucroTotal,
      color: CANAL_COLORS[c.canal] || '#64748b',
    }));
  }, [metricasCanais]);

  // --- 3. Métricas de Impacto de Test-Drive ---
  const metricasTestDrive = useMemo(() => {
    const comTestDrive = vendasProcessadas.filter((v) => v.realizouTestDriveNormalizado);
    const semTestDrive = vendasProcessadas.filter((v) => !v.realizouTestDriveNormalizado);

    const totalVendas = vendasProcessadas.length;
    const taxaTestDriveGeral = totalVendas > 0 ? Math.round((comTestDrive.length / totalVendas) * 100) : 0;

    const calcMedia = (lista: typeof vendasProcessadas) => {
      if (lista.length === 0) {
        return { qtd: 0, ticketMedio: 0, lucroMedio: 0, margemMedia: 0, diasPatioMedio: 0, visitasMedio: 0 };
      }
      const somaReceita = lista.reduce((s, v) => s + v.valorVenda, 0);
      const somaLucro = lista.reduce((s, v) => s + v.lucroLiquido, 0);
      const somaDias = lista.reduce((s, v) => s + (v.diasEmPatio || 0), 0);
      const somaVisitas = lista.reduce((s, v) => s + (v.quantidadeVisitas || 1), 0);

      return {
        qtd: lista.length,
        ticketMedio: Number((somaReceita / lista.length).toFixed(2)),
        lucroMedio: Number((somaLucro / lista.length).toFixed(2)),
        margemMedia: somaReceita > 0 ? Number(((somaLucro / somaReceita) * 100).toFixed(1)) : 0,
        diasPatioMedio: Math.round(somaDias / lista.length),
        visitasMedio: Number((somaVisitas / lista.length).toFixed(1)),
      };
    };

    const statsCom = calcMedia(comTestDrive);
    const statsSem = calcMedia(semTestDrive);

    // Comparativo para gráfico
    const dadosComparativo = [
      {
        metrica: 'Ticket Médio (k)',
        ComTestDrive: Math.round(statsCom.ticketMedio / 1000),
        SemTestDrive: Math.round(statsSem.ticketMedio / 1000),
      },
      {
        metrica: 'Lucro Médio (k)',
        ComTestDrive: Math.round(statsCom.lucroMedio / 1000),
        SemTestDrive: Math.round(statsSem.lucroMedio / 1000),
      },
      {
        metrica: 'Margem %',
        ComTestDrive: statsCom.margemMedia,
        SemTestDrive: statsSem.margemMedia,
      },
      {
        metrica: 'Giro (Dias Pátio)',
        ComTestDrive: statsCom.diasPatioMedio,
        SemTestDrive: statsSem.diasPatioMedio,
      },
    ];

    return {
      comTestDrive,
      semTestDrive,
      taxaTestDriveGeral,
      statsCom,
      statsSem,
      dadosComparativo,
    };
  }, [vendasProcessadas]);

  // --- 4. Métricas de Financiamentos & Bancos Parceiros ---
  const metricasBancos = useMemo(() => {
    const map: Record<string, {
      banco: string;
      contratosQtd: number;
      volumeFinanciadoTotal: number;
      retornoTacTotal: number;
    }> = {};

    let totalVolumeFinanciadoGeral = 0;
    let totalRetornoTacGeral = 0;
    let totalVendasFinanciadas = 0;

    vendasProcessadas.forEach((v) => {
      const isFinanc = v.formaPagamento === 'Financiamento' || !!v.financiamentoDetalhes || (v.retornoFinanciamentoTac || 0) > 0;
      if (isFinanc) {
        totalVendasFinanciadas += 1;
        const banco = v.bancoNormalizado;
        const vol = v.valorFinanciadoCalculado;
        const tac = v.retornoTacCalculado;

        totalVolumeFinanciadoGeral += vol;
        totalRetornoTacGeral += tac;

        if (!map[banco]) {
          map[banco] = {
            banco,
            contratosQtd: 0,
            volumeFinanciadoTotal: 0,
            retornoTacTotal: 0,
          };
        }
        map[banco].contratosQtd += 1;
        map[banco].volumeFinanciadoTotal += vol;
        map[banco].retornoTacTotal += tac;
      }
    });

    const lista = Object.values(map).map((item) => {
      const retornoMedioPercent = item.volumeFinanciadoTotal > 0
        ? Number(((item.retornoTacTotal / item.volumeFinanciadoTotal) * 100).toFixed(2))
        : 0;
      const ticketMedioFinanciado = item.contratosQtd > 0
        ? Number((item.volumeFinanciadoTotal / item.contratosQtd).toFixed(2))
        : 0;
      return {
        ...item,
        retornoMedioPercent,
        ticketMedioFinanciado,
        marketShareVolume: totalVolumeFinanciadoGeral > 0
          ? Number(((item.volumeFinanciadoTotal / totalVolumeFinanciadoGeral) * 100).toFixed(1))
          : 0,
      };
    });

    return {
      lista: lista.sort((a, b) => b.volumeFinanciadoTotal - a.volumeFinanciadoTotal),
      totalVolumeFinanciadoGeral,
      totalRetornoTacGeral,
      totalVendasFinanciadas,
      taxaRetornoMediaGeral: totalVolumeFinanciadoGeral > 0
        ? Number(((totalRetornoTacGeral / totalVolumeFinanciadoGeral) * 100).toFixed(2))
        : 0,
    };
  }, [vendasProcessadas]);

  // --- 5. Análise de Perfis Profissionais ---
  const metricasProfissoes = useMemo(() => {
    const map: Record<string, {
      profissao: string;
      qtdClientes: number;
      receitaTotal: number;
      ticketMedio: number;
      modelosPreferidos: Record<string, number>;
      canaisPreferidos: Record<string, number>;
    }> = {};

    vendasProcessadas.forEach((v) => {
      const prof = v.profissaoNormalizada;
      if (!map[prof]) {
        map[prof] = {
          profissao: prof,
          qtdClientes: 0,
          receitaTotal: 0,
          ticketMedio: 0,
          modelosPreferidos: {},
          canaisPreferidos: {},
        };
      }
      map[prof].qtdClientes += 1;
      map[prof].receitaTotal += v.valorVenda;

      // Modelos
      map[prof].modelosPreferidos[v.modelo] = (map[prof].modelosPreferidos[v.modelo] || 0) + 1;
      // Canais
      map[prof].canaisPreferidos[v.canalNormalizado] = (map[prof].canaisPreferidos[v.canalNormalizado] || 0) + 1;
    });

    const lista = Object.values(map).map((p) => {
      // Obter modelo mais comprado
      const modeloTop = Object.entries(p.modelosPreferidos).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Diversos';
      const canalTop = Object.entries(p.canaisPreferidos).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Geral';
      return {
        ...p,
        ticketMedio: p.qtdClientes > 0 ? Number((p.receitaTotal / p.qtdClientes).toFixed(2)) : 0,
        modeloTop,
        canalTop,
      };
    });

    return lista.sort((a, b) => b.qtdClientes - a.qtdClientes);
  }, [vendasProcessadas]);

  // --- 6. Lista Filtrada de Clientes CRM e Aniversários ---
  const clientesFiltrados = useMemo(() => {
    return vendasProcessadas.filter((v) => {
      // Busca geral
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNome = v.compradorNome.toLowerCase().includes(q);
        const matchCpf = v.compradorCpf.toLowerCase().includes(q);
        const matchModelo = v.modelo.toLowerCase().includes(q);
        const matchPlaca = v.placa.toLowerCase().includes(q);
        const matchProfissao = (v.compradorProfissao || '').toLowerCase().includes(q);
        if (!matchNome && !matchCpf && !matchModelo && !matchPlaca && !matchProfissao) {
          return false;
        }
      }

      // Filtro de Canal
      if (filtroCanal !== 'todos' && v.canalNormalizado !== filtroCanal) {
        return false;
      }

      // Filtro de Banco
      if (filtroBanco !== 'todos' && v.bancoNormalizado !== filtroBanco) {
        return false;
      }

      // Filtro de Profissão
      if (filtroProfissao !== 'todos' && v.profissaoNormalizada !== filtroProfissao) {
        return false;
      }

      // Filtro de Aniversário
      if (activeTab === 'aniversariantes' || filtroMesAniversario !== 'todos') {
        if (!v.compradorDataNascimento || v.diasAteNiver === null) {
          if (filtroMesAniversario !== 'todos') return false;
        } else {
          if (filtroMesAniversario === 'hoje') {
            if (v.diasAteNiver !== 0) return false;
          } else if (filtroMesAniversario === '7dias') {
            if (v.diasAteNiver < 0 || v.diasAteNiver > 7) return false;
          } else if (filtroMesAniversario === 'esteMes') {
            if (v.mesNiver !== mesAtual) return false;
          } else if (filtroMesAniversario === 'proximos30') {
            if (v.diasAteNiver < 0 || v.diasAteNiver > 30) return false;
          } else if (!isNaN(parseInt(filtroMesAniversario, 10))) {
            if (v.mesNiver !== parseInt(filtroMesAniversario, 10)) return false;
          }
        }
      }

      return true;
    });
  }, [vendasProcessadas, searchQuery, filtroCanal, filtroBanco, filtroProfissao, filtroMesAniversario, activeTab, mesAtual]);

  // Contadores rápidos de Aniversários
  const aniversariantesHoje = useMemo(() => {
    return vendasProcessadas.filter((v) => v.diasAteNiver === 0);
  }, [vendasProcessadas]);

  const aniversariantesProximos30 = useMemo(() => {
    return vendasProcessadas.filter((v) => v.diasAteNiver !== null && v.diasAteNiver >= 0 && v.diasAteNiver <= 30);
  }, [vendasProcessadas]);

  // Ação de WhatsApp para Aniversário
  const handleEnviarMsgAniversario = (v: typeof vendasProcessadas[0]) => {
    const nome = v.compradorNome.split(' ')[0];
    const carro = v.modelo;
    const msg = encodeURIComponent(
      `Olá ${nome}! 🎉 A equipe da Troca Fácil Autos passa para te desejar um Feliz Aniversário! 🎂 Que seu novo ano seja repleto de conquistas e ótimas viagens com seu ${carro}. Como presente especial, você ganhou uma higienização/cortesia VIP na sua próxima revisão conosco! Um grande abraço!`
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  // Ação de WhatsApp para Acompanhamento de Entrega / Pós-Venda
  const handleEnviarMsgPosVenda = (v: typeof vendasProcessadas[0]) => {
    const nome = v.compradorNome.split(' ')[0];
    const carro = v.modelo;
    const msg = encodeURIComponent(
      `Olá ${nome}, tudo bem? Aqui é da Troca Fácil Autos! Passando para checar como está sua experiência com o ${carro}. Qualquer dúvida ou suporte que precisar com seu veículo, nossa equipe está 100% à sua disposição!`
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  // --- Funções de Exportação CSV para Excel ---
  const handleExportVendas = () => {
    exportRelatorioVendasCsv(vendas);
    triggerNotification('Relatório completo de vendas exportado em CSV para o Excel!');
    setShowExportMenu(false);
  };

  const handleExportClientesCrm = () => {
    exportCrmClientesCsv(vendasProcessadas);
    triggerNotification('Base de clientes e aniversariantes do CRM exportada com sucesso!');
    setShowExportMenu(false);
  };

  const handleExportAniversariantes30d = () => {
    exportAniversariantesCsv(aniversariantesProximos30);
    triggerNotification(`Lista de ${aniversariantesProximos30.length} aniversariantes exportada com sucesso!`);
    setShowExportMenu(false);
  };

  const handleExportCanais = () => {
    exportCanaisConversaoCsv(metricasCanais);
    triggerNotification('Métricas de conversão de canais exportadas em CSV!');
    setShowExportMenu(false);
  };

  const handleExportBancos = () => {
    exportBancosFinanceirasCsv(metricasBancos.lista);
    triggerNotification('Performance de financiamento e TAC bancário exportada!');
    setShowExportMenu(false);
  };

  const handleExportProfissoes = () => {
    exportProfissoesSegmentosCsv(metricasProfissoes);
    triggerNotification('Relatório de segmentos profissionais e ticket médio exportado!');
    setShowExportMenu(false);
  };

  const handleExportClientesFiltrados = () => {
    exportCrmClientesCsv(clientesFiltrados, `CRM_Clientes_Filtrados_${new Date().toISOString().split('T')[0]}`);
    triggerNotification(`${clientesFiltrados.length} clientes filtrados exportados para o Excel!`);
    setShowExportMenu(false);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification de Sucesso no Export */}
      {exportNotification && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#16171f] text-white px-5 py-3.5 rounded-2xl border border-emerald-500/40 shadow-2xl shadow-emerald-950/50 flex items-center gap-3 animate-fadeIn">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
            <Check size={18} />
          </div>
          <div>
            <p className="text-xs font-bold text-white">Download Iniciado</p>
            <p className="text-[11px] text-slate-300">{exportNotification}</p>
          </div>
        </div>
      )}

      {/* Header com Visão Executiva e Troca de Abas */}
      <div className="bg-[#111116] rounded-3xl p-6 border border-white/5 shadow-2xl relative overflow-hidden">
        {/* Background glow visual */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider">
              <Sparkles size={14} className="animate-pulse" />
              <span>Inteligência de Vendas & CRM Estratégico</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              Conversão, Test-Drive & Fidelização de Clientes
            </h1>
            <p className="text-slate-400 text-xs lg:text-sm max-w-3xl leading-relaxed">
              Análise em tempo real de taxas de conversão por canal de atração, retorno das financeiras parceiras, impacto do test-drive e radar ativo de aniversariantes para ações de CRM.
            </p>
          </div>

          {/* Quick Metrics Badges & Export Button */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-[#181922] px-4 py-2.5 rounded-2xl border border-white/5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-pink-500/10 text-pink-400 flex items-center justify-center font-bold">
                <Gift size={20} />
              </div>
              <div>
                <span className="text-[11px] text-slate-400 font-medium block">Nivers Próximos 30d</span>
                <span className="text-base font-black text-white">{aniversariantesProximos30.length} clientes</span>
              </div>
            </div>

            <div className="bg-[#181922] px-4 py-2.5 rounded-2xl border border-white/5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                <Target size={20} />
              </div>
              <div>
                <span className="text-[11px] text-slate-400 font-medium block">Taxa Test-Drive</span>
                <span className="text-base font-black text-emerald-400">{metricasTestDrive.taxaTestDriveGeral}% das vendas</span>
              </div>
            </div>

            {/* Menu de Exportação CSV para Excel */}
            <div className="relative" ref={exportMenuRef}>
              <button
                id="btn-exportar-csv-crm"
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 sm:py-3 rounded-2xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition cursor-pointer select-none"
                title="Exportar dados do CRM e Vendas em formato CSV compatível com Excel"
                aria-expanded={showExportMenu}
                aria-haspopup="true"
              >
                <FileSpreadsheet size={16} />
                <span>Exportar CSV (Excel)</span>
                <ChevronDown size={14} className={`transition-transform duration-200 ${showExportMenu ? 'rotate-180' : ''}`} />
              </button>

              {showExportMenu && (
                <div 
                  className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] sm:w-96 max-w-[400px] bg-[#14151c]/98 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/90 z-50 overflow-hidden flex flex-col max-h-[80vh] animate-fadeIn"
                  style={{ maxHeight: 'min(80vh, 520px)' }}
                >
                  {/* Top Header */}
                  <div className="px-3.5 py-3 bg-[#181924] border-b border-white/10 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                        <FileSpreadsheet size={13} />
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">Formatos Disponíveis</span>
                        <p className="text-xs font-black text-white">Exportação Excel (pt-BR / CSV)</p>
                      </div>
                    </div>
                    <span className="text-[10px] bg-white/10 text-slate-300 px-2 py-0.5 rounded-full font-mono font-bold">
                      {searchQuery || filtroCanal !== 'todos' || filtroBanco !== 'todos' ? '7 opções' : '6 opções'}
                    </span>
                  </div>

                  {/* Scrollable Container with defined height and smooth scrolling */}
                  <div className="overflow-y-auto flex-1 p-2 space-y-1 overscroll-contain divide-y divide-white/[0.03]">
                    {/* 1. Relatório Geral de Vendas */}
                    <button
                      id="btn-export-vendas-csv"
                      onClick={handleExportVendas}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-white/5 text-xs text-white transition flex items-start gap-2.5 cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-blue-500 group-hover:text-white transition">
                        <Car size={15} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-100 group-hover:text-blue-400 transition">Relatório Geral de Vendas</p>
                        <p className="text-[10px] text-slate-400 leading-tight">Todos os veículos, custos, margens, compradores e lucro líquido real</p>
                      </div>
                    </button>

                    {/* 2. Base de Clientes & CRM */}
                    <button
                      id="btn-export-crm-clientes-csv"
                      onClick={handleExportClientesCrm}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-white/5 text-xs text-white transition flex items-start gap-2.5 cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-pink-500/10 text-pink-400 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-pink-500 group-hover:text-white transition">
                        <Users size={15} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-100 group-hover:text-pink-400 transition">Base Geral de Clientes & CRM</p>
                        <p className="text-[10px] text-slate-400 leading-tight">Aniversários, profissões, CPF e histórico de compras</p>
                      </div>
                    </button>

                    {/* 3. Aniversariantes dos Próximos 30 Dias */}
                    <button
                      id="btn-export-aniversariantes-30d-csv"
                      onClick={handleExportAniversariantes30d}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-white/5 text-xs text-white transition flex items-start gap-2.5 cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-rose-500 group-hover:text-white transition">
                        <Gift size={15} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-slate-100 group-hover:text-rose-400 transition">Aniversariantes Próximos 30d</p>
                          <span className="text-[9px] bg-rose-500/20 text-rose-300 px-1.5 py-0.2 rounded font-bold">
                            {aniversariantesProximos30.length}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-tight">Lista ativa para envio de felicitações e campanhas de fidelização</p>
                      </div>
                    </button>

                    {/* 4. Conversão por Canal de Lead */}
                    <button
                      id="btn-export-canais-csv"
                      onClick={handleExportCanais}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-white/5 text-xs text-white transition flex items-start gap-2.5 cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-purple-500 group-hover:text-white transition">
                        <Compass size={15} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-100 group-hover:text-purple-400 transition">Conversão por Canal de Lead</p>
                        <p className="text-[10px] text-slate-400 leading-tight">Faturamento, aging médio em pátio e taxa de test-drive</p>
                      </div>
                    </button>

                    {/* 5. Bancos Parceiros & TAC */}
                    <button
                      id="btn-export-bancos-csv"
                      onClick={handleExportBancos}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-white/5 text-xs text-white transition flex items-start gap-2.5 cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-indigo-500 group-hover:text-white transition">
                        <Building2 size={15} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-100 group-hover:text-indigo-400 transition">Bancos Parceiros & Retorno TAC</p>
                        <p className="text-[10px] text-slate-400 leading-tight">Volume financiado, ticket médio e retorno de comissão para a loja</p>
                      </div>
                    </button>

                    {/* 6. Perfis & Profissões dos Compradores */}
                    <button
                      id="btn-export-profissoes-csv"
                      onClick={handleExportProfissoes}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-white/5 text-xs text-white transition flex items-start gap-2.5 cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-emerald-500 group-hover:text-white transition">
                        <Briefcase size={15} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-100 group-hover:text-emerald-400 transition">Segmentação por Profissões</p>
                        <p className="text-[10px] text-slate-400 leading-tight">Categorias profissionais, ticket médio gasto e veículos favoritos</p>
                      </div>
                    </button>

                    {/* 7. Clientes Filtrados (se houver filtro) */}
                    {(searchQuery || filtroCanal !== 'todos' || filtroBanco !== 'todos' || filtroProfissao !== 'todos') && (
                      <button
                        id="btn-export-filtrados-csv"
                        onClick={handleExportClientesFiltrados}
                        className="w-full text-left p-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-xs text-white transition flex items-start gap-2.5 cursor-pointer group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-amber-500 group-hover:text-white transition">
                          <Filter size={15} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="font-bold text-amber-300">Exportar Filtro Atual</p>
                            <span className="text-[9px] bg-amber-500/30 text-amber-200 px-1.5 py-0.2 rounded font-bold">
                              {clientesFiltrados.length} registros
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 leading-tight">Exporta apenas os clientes visíveis com os filtros selecionados</p>
                        </div>
                      </button>
                    )}
                  </div>

                  {/* Footer Info & Close */}
                  <div className="px-3.5 py-2.5 bg-[#101117] border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400 shrink-0">
                    <span className="flex items-center gap-1">
                      <Check size={12} className="text-emerald-400" />
                      Excel pt-BR (;) e UTF-8 BOM
                    </span>
                    <button
                      onClick={() => setShowExportMenu(false)}
                      className="text-slate-400 hover:text-white font-bold cursor-pointer transition"
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Barra de Navegação Interna de Módulos */}
        <div className="flex flex-wrap gap-2 mt-6 pt-5 border-t border-white/5">
          <button
            id="tab-btn-dashboard"
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                : 'bg-[#181922] text-slate-400 hover:text-white hover:bg-white/5 border border-white/5'
            }`}
          >
            <BarChart3 size={16} />
            <span>Painel de Conversão & Canais</span>
          </button>

          <button
            id="tab-btn-aniversariantes"
            onClick={() => setActiveTab('aniversariantes')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'aniversariantes'
                ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-lg shadow-pink-500/25'
                : 'bg-[#181922] text-slate-400 hover:text-white hover:bg-white/5 border border-white/5'
            }`}
          >
            <Gift size={16} />
            <span>Aniversariantes & Relacionamento</span>
            {aniversariantesProximos30.length > 0 && (
              <span className="bg-white/20 text-white text-[10px] px-2 py-0.5 rounded-full font-black">
                {aniversariantesProximos30.length}
              </span>
            )}
          </button>

          <button
            id="tab-btn-profissoes"
            onClick={() => setActiveTab('profissoes')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'profissoes'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25'
                : 'bg-[#181922] text-slate-400 hover:text-white hover:bg-white/5 border border-white/5'
            }`}
          >
            <Briefcase size={16} />
            <span>Perfis Profissionais & Segmentos</span>
          </button>

          <button
            id="tab-btn-bancos"
            onClick={() => setActiveTab('bancos')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'bancos'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                : 'bg-[#181922] text-slate-400 hover:text-white hover:bg-white/5 border border-white/5'
            }`}
          >
            <CreditCard size={16} />
            <span>Parcerias Bancárias & TAC</span>
          </button>

          <button
            id="tab-btn-testdrive"
            onClick={() => setActiveTab('testdrive')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'testdrive'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/25'
                : 'bg-[#181922] text-slate-400 hover:text-white hover:bg-white/5 border border-white/5'
            }`}
          >
            <Car size={16} />
            <span>Impacto do Test-Drive</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* ABA 1: PAINEL DE CONVERSÃO & CANAIS DE ORIGEM            */}
      {/* ======================================================== */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Grid de Métricas Principais */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#111116] p-5 rounded-3xl border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
                <span>Canal Mais Produtivo</span>
                <Sparkles size={16} className="text-pink-400" />
              </div>
              <p className="text-xl font-extrabold text-white truncate">
                {metricasCanais[0]?.canal.split('(')[0] || 'Sem dados'}
              </p>
              <div className="flex items-center gap-2 text-xs text-emerald-400 font-bold">
                <span>{metricasCanais[0]?.vendasQtd || 0} veículos vendidos</span>
                <span className="text-slate-500">•</span>
                <span>{formatCurrency(metricasCanais[0]?.receitaTotal || 0)}</span>
              </div>
            </div>

            <div className="bg-[#111116] p-5 rounded-3xl border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
                <span>Maior Margem de Lucro</span>
                <TrendingUp size={16} className="text-emerald-400" />
              </div>
              <p className="text-xl font-extrabold text-white truncate">
                {[...metricasCanais].sort((a, b) => b.margemMedia - a.margemMedia)[0]?.canal.split('(')[0] || 'Sem dados'}
              </p>
              <div className="flex items-center gap-2 text-xs text-emerald-400 font-bold">
                <span>{[...metricasCanais].sort((a, b) => b.margemMedia - a.margemMedia)[0]?.margemMedia || 0}% de margem média</span>
              </div>
            </div>

            <div className="bg-[#111116] p-5 rounded-3xl border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
                <span>Giro Mais Rápido (Menor Aging)</span>
                <Clock size={16} className="text-blue-400" />
              </div>
              <p className="text-xl font-extrabold text-white truncate">
                {[...metricasCanais].filter(c => c.diasMedioPatio > 0).sort((a, b) => a.diasMedioPatio - b.diasMedioPatio)[0]?.canal.split('(')[0] || 'Passante'}
              </p>
              <div className="flex items-center gap-2 text-xs text-blue-400 font-bold">
                <span>{[...metricasCanais].filter(c => c.diasMedioPatio > 0).sort((a, b) => a.diasMedioPatio - b.diasMedioPatio)[0]?.diasMedioPatio || 0} dias em média</span>
              </div>
            </div>

            <div className="bg-[#111116] p-5 rounded-3xl border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
                <span>Retorno TAC Médio / Financiamento</span>
                <Building2 size={16} className="text-indigo-400" />
              </div>
              <p className="text-xl font-extrabold text-white">
                {metricasBancos.taxaRetornoMediaGeral}%
              </p>
              <div className="flex items-center gap-2 text-xs text-indigo-300 font-bold">
                <span>Total de {formatCurrency(metricasBancos.totalRetornoTacGeral)} para a loja</span>
              </div>
            </div>
          </div>

          {/* Gráficos com Recharts: Volume & Receita por Canal e Distribuição */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Gráfico de Barras: Volume de Vendas e Lucro por Canal */}
            <div className="lg:col-span-2 bg-[#111116] p-6 rounded-3xl border border-white/5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-white text-base flex items-center gap-2">
                    <BarChart3 size={18} className="text-blue-400" />
                    Volume de Vendas e Lucro por Canal de Atração
                  </h3>
                  <p className="text-xs text-slate-400">
                    Comparativo da receita bruta e resultado líquido apurado por canal de entrada do lead.
                  </p>
                </div>
              </div>

              <div className="h-80 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={metricasCanais.map(c => ({
                      name: c.canal.split(' ')[0],
                      ReceitaMil: Math.round(c.receitaTotal / 1000),
                      LucroMil: Math.round(c.lucroTotal / 1000),
                      VendasQtd: c.vendasQtd,
                    }))}
                    margin={{ top: 10, right: 10, left: -10, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#232635" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} unit="k" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#181922', borderColor: '#2e3346', borderRadius: '16px', color: '#fff', fontSize: '12px' }}
                      formatter={(value: any, name: any) => [
                        name === 'VendasQtd' ? `${value} carros` : `R$ ${value}k`,
                        name === 'ReceitaMil' ? 'Receita Total' : name === 'LucroMil' ? 'Lucro Líquido' : 'Qtd Vendas'
                      ]}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Bar dataKey="ReceitaMil" name="Receita (R$ mil)" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="LucroMil" name="Lucro Líquido (R$ mil)" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Donut Chart: Participação % das Vendas */}
            <div className="bg-[#111116] p-6 rounded-3xl border border-white/5 space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="font-extrabold text-white text-base flex items-center gap-2">
                  <PieChartIcon size={18} className="text-pink-400" />
                  Origem dos Leads Fechados
                </h3>
                <p className="text-xs text-slate-400">
                  Fatia de mercado de cada canal no volume de conversão.
                </p>
              </div>

              <div className="h-64 w-full relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dadosGraficoCanaisPizza}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {dadosGraficoCanaisPizza.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#181922', borderColor: '#2e3346', borderRadius: '16px', color: '#fff', fontSize: '12px' }}
                      formatter={(value: any, name: any, item: any) => [
                        `${value} vendas (${formatCurrency(item.payload.receita)})`,
                        item.payload.fullName
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2 pt-2 border-t border-white/5">
                {dadosGraficoCanaisPizza.slice(0, 4).map((c, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                      <span className="text-slate-300 font-medium truncate max-w-[150px]">{c.fullName}</span>
                    </div>
                    <span className="font-bold text-white font-mono">{c.value} vendas</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tabela Estruturada de Canais & Conversão */}
          <div className="bg-[#111116] rounded-3xl border border-white/5 overflow-hidden">
            <div className="p-5 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-extrabold text-white text-base flex items-center gap-2">
                  <Compass size={18} className="text-indigo-400" />
                  Performance Comparativa por Canal de Atração
                </h4>
                <p className="text-xs text-slate-400">
                  Métricas de vendas, margens médias, agilidade de fechamento e adesão a test-drive.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  id="btn-export-canais-tab1"
                  onClick={handleExportCanais}
                  className="px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  title="Exportar métricas de conversão dos canais em CSV"
                >
                  <Download size={13} />
                  <span>Exportar Canais (CSV)</span>
                </button>
                <button
                  id="btn-export-vendas-tab1"
                  onClick={handleExportVendas}
                  className="px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/20 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  title="Exportar todas as vendas detalhadas em CSV"
                >
                  <FileSpreadsheet size={13} />
                  <span>Exportar Vendas (CSV)</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#16171f] text-slate-400 uppercase font-sans border-b border-white/5 text-[11px]">
                    <th className="py-3.5 px-5">Canal de Origem</th>
                    <th className="py-3.5 px-4 text-center">Vendas Fechadas</th>
                    <th className="py-3.5 px-4 text-right">Faturamento Total</th>
                    <th className="py-3.5 px-4 text-right">Lucro Líquido</th>
                    <th className="py-3.5 px-4 text-right">Margem Média %</th>
                    <th className="py-3.5 px-4 text-center">Aging Médio</th>
                    <th className="py-3.5 px-4 text-center">Taxa Test-Drive</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono text-slate-300">
                  {metricasCanais.map((c, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.02] transition">
                      <td className="py-3.5 px-5 font-sans font-bold text-white flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CANAL_COLORS[c.canal] || '#64748b' }} />
                        <span>{c.canal}</span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-white">{c.vendasQtd}</td>
                      <td className="py-3.5 px-4 text-right text-slate-200 font-bold">{formatCurrency(c.receitaTotal)}</td>
                      <td className="py-3.5 px-4 text-right text-emerald-400 font-bold">{formatCurrency(c.lucroTotal)}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-blue-400">{c.margemMedia}%</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[11px] font-bold">
                          {c.diasMedioPatio} dias
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[11px] font-bold">
                          {c.taxaTestDrive}%
                        </span>
                      </td>
                    </tr>
                  ))}
                  {metricasCanais.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500 font-sans">
                        Nenhuma venda registrada até o momento para compor o painel de conversão.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 2: ANIVERSARIANTES & CRM DE RELACIONAMENTO          */}
      {/* ======================================================== */}
      {activeTab === 'aniversariantes' && (
        <div className="space-y-6">
          {/* Banner de Ação de CRM */}
          <div className="bg-gradient-to-r from-pink-950/40 via-[#18131e] to-rose-950/30 p-6 rounded-3xl border border-pink-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-600 to-rose-500 text-white flex items-center justify-center font-black shadow-lg shadow-pink-500/30 shrink-0">
                <Gift size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                  Radar Ativo de Aniversários de Clientes
                  {aniversariantesHoje.length > 0 && (
                    <span className="bg-pink-500 text-white text-xs px-2.5 py-0.5 rounded-full animate-bounce font-black">
                      {aniversariantesHoje.length} aniversariando hoje! 🎈
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-300">
                  Envie felicitações automáticas via WhatsApp com 1 clique para fidelizar compradores e oferecer cortesias de pós-venda.
                </p>
              </div>
            </div>

            {/* Filtros Rápidos de Data */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setFiltroMesAniversario('hoje')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  filtroMesAniversario === 'hoje'
                    ? 'bg-pink-600 text-white shadow-md'
                    : 'bg-[#12131a] text-slate-400 hover:text-white border border-white/5'
                }`}
              >
                <span>Hoje</span>
                {aniversariantesHoje.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                )}
              </button>

              <button
                onClick={() => setFiltroMesAniversario('7dias')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  filtroMesAniversario === '7dias'
                    ? 'bg-pink-600 text-white shadow-md'
                    : 'bg-[#12131a] text-slate-400 hover:text-white border border-white/5'
                }`}
              >
                Próximos 7 dias
              </button>

              <button
                onClick={() => setFiltroMesAniversario('esteMes')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  filtroMesAniversario === 'esteMes'
                    ? 'bg-pink-600 text-white shadow-md'
                    : 'bg-[#12131a] text-slate-400 hover:text-white border border-white/5'
                }`}
              >
                Este Mês (Mês {mesAtual})
              </button>

              <button
                onClick={() => setFiltroMesAniversario('proximos30')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  filtroMesAniversario === 'proximos30'
                    ? 'bg-pink-600 text-white shadow-md'
                    : 'bg-[#12131a] text-slate-400 hover:text-white border border-white/5'
                }`}
              >
                Próximos 30 dias ({aniversariantesProximos30.length})
              </button>

              <button
                onClick={() => setFiltroMesAniversario('todos')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  filtroMesAniversario === 'todos'
                    ? 'bg-pink-600 text-white shadow-md'
                    : 'bg-[#12131a] text-slate-400 hover:text-white border border-white/5'
                }`}
              >
                Todos com Nascimento
              </button>
            </div>
          </div>

          {/* Barra de Busca e Filtros de CRM */}
          <div className="bg-[#111116] p-4 rounded-2xl border border-white/5 flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative flex-1 w-full">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar cliente por nome, CPF, profissão ou carro comprado..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#181922] border border-white/5 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 transition"
              />
            </div>

            <div className="flex flex-wrap gap-2 w-full md:w-auto items-center">
              <select
                value={filtroCanal}
                onChange={(e) => setFiltroCanal(e.target.value)}
                className="px-3 py-2 bg-[#181922] border border-white/5 rounded-xl text-xs text-slate-300 focus:outline-none"
              >
                <option value="todos">Todos os Canais</option>
                {Object.keys(CANAL_COLORS).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <button
                id="btn-export-clientes-filtrados"
                onClick={handleExportClientesFiltrados}
                className="px-3.5 py-2 rounded-xl bg-pink-500/10 hover:bg-pink-500/20 text-pink-300 border border-pink-500/20 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                title="Exportar clientes filtrados para análise no Excel (CSV)"
              >
                <FileSpreadsheet size={14} />
                <span>Exportar Filtrados ({clientesFiltrados.length})</span>
              </button>
            </div>
          </div>

          {/* Lista de Clientes Aniversariantes */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clientesFiltrados.map((v) => {
              const isAniverHoje = v.diasAteNiver === 0;
              const isAniverProximo = v.diasAteNiver !== null && v.diasAteNiver > 0 && v.diasAteNiver <= 7;

              return (
                <div
                  key={v.id}
                  className={`bg-[#111116] rounded-3xl p-5 border transition flex flex-col justify-between gap-4 ${
                    isAniverHoje
                      ? 'border-pink-500 shadow-xl shadow-pink-500/10 bg-gradient-to-b from-[#19111b] to-[#111116]'
                      : isAniverProximo
                      ? 'border-pink-500/40'
                      : 'border-white/5'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-mono block">Cliente / Comprador</span>
                        <h4 className="text-base font-extrabold text-white">{v.compradorNome}</h4>
                        <p className="text-xs text-slate-400 font-mono">{v.compradorCpf}</p>
                      </div>

                      {/* Badge de Aniversário */}
                      {v.compradorDataNascimento ? (
                        <div className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
                          isAniverHoje
                            ? 'bg-pink-500 text-white animate-pulse'
                            : isAniverProximo
                            ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
                            : 'bg-white/5 text-slate-300'
                        }`}>
                          <Gift size={13} />
                          <span>
                            {isAniverHoje
                              ? 'Hoje! 🎉'
                              : v.diasAteNiver !== null
                              ? `Em ${v.diasAteNiver}d`
                              : formatDate(v.compradorDataNascimento)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-500 bg-white/5 px-2 py-0.5 rounded">Sem data</span>
                      )}
                    </div>

                    {/* Informações Profissionais e de Compra */}
                    <div className="bg-[#16171f] p-3 rounded-2xl space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-slate-500 flex items-center gap-1">
                          <Briefcase size={13} />
                          Profissão:
                        </span>
                        <span className="font-semibold text-white">{v.compradorProfissao || 'Não informada'}</span>
                      </div>

                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-slate-500 flex items-center gap-1">
                          <Car size={13} />
                          Veículo:
                        </span>
                        <span className="font-semibold text-white truncate max-w-[150px]">{v.modelo}</span>
                      </div>

                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-slate-500 flex items-center gap-1">
                          <DollarSign size={13} />
                          Valor Compra:
                        </span>
                        <span className="font-bold text-emerald-400 font-mono">{formatCurrency(v.valorVenda)}</span>
                      </div>

                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-slate-500 flex items-center gap-1">
                          <Compass size={13} />
                          Canal Origem:
                        </span>
                        <span className="font-semibold text-pink-300">{v.canalNormalizado.split('(')[0]}</span>
                      </div>

                      {v.financiamentoTerceiro?.ativo && (
                        <div className="pt-1.5 border-t border-white/5 flex items-center justify-between text-[11px]">
                          <span className="text-indigo-400 font-semibold flex items-center gap-1">
                            <Users size={12} />
                            Financ. Terceiro:
                          </span>
                          <span className="text-slate-300 truncate max-w-[140px]" title={`${v.financiamentoTerceiro.nomeTerceiro} (${v.financiamentoTerceiro.grauParentesco})`}>
                            {v.financiamentoTerceiro.nomeTerceiro.split(' ')[0]} ({v.financiamentoTerceiro.grauParentesco})
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ações Rápidas de CRM */}
                  <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                    <button
                      onClick={() => handleEnviarMsgAniversario(v)}
                      className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-pink-600/20 transition cursor-pointer"
                      title="Enviar felicitação de aniversário personalizada com cortesia VIP"
                    >
                      <MessageSquare size={14} />
                      <span>Felicitar WhatsApp</span>
                    </button>

                    <button
                      onClick={() => handleEnviarMsgPosVenda(v)}
                      className="py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-medium text-xs flex items-center justify-center transition cursor-pointer"
                      title="Mensagem de pós-venda / checagem de satisfação"
                    >
                      <span>Pós-Venda</span>
                    </button>
                  </div>
                </div>
              );
            })}

            {clientesFiltrados.length === 0 && (
              <div className="col-span-full py-12 text-center bg-[#111116] rounded-3xl border border-white/5 space-y-3">
                <Gift size={36} className="text-slate-600 mx-auto" />
                <p className="text-slate-400 text-sm font-medium">
                  Nenhum cliente encontrado com os filtros de aniversário selecionados.
                </p>
                <p className="text-xs text-slate-500">
                  Dica: Ao fechar uma venda, preencha o campo "Data de Nascimento" para ativar o radar de CRM.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 3: PERFIS PROFISSIONAIS & SEGMENTAÇÃO                */}
      {/* ======================================================== */}
      {activeTab === 'profissoes' && (
        <div className="space-y-6">
          <div className="bg-[#111116] p-6 rounded-3xl border border-white/5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-white text-base flex items-center gap-2">
                  <Briefcase size={18} className="text-purple-400" />
                  Segmentação de Clientes por Perfil Profissional
                </h3>
                <p className="text-xs text-slate-400">
                  Entenda o perfil de renda e modelos preferidos de cada segmento profissional para direcionar campanhas e anúncios.
                </p>
              </div>

              <button
                id="btn-export-profissoes"
                onClick={handleExportClientesCrm}
                className="px-3.5 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                title="Exportar base detalhada de clientes com profissão e compras em CSV"
              >
                <FileSpreadsheet size={14} />
                <span>Exportar Clientes & Profissões (CSV)</span>
              </button>
            </div>

            {/* Grid de Cards de Profissão */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {metricasProfissoes.map((p, idx) => (
                <div key={idx} className="bg-[#16171f] p-5 rounded-2xl border border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-purple-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Briefcase size={14} />
                      {p.profissao}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono text-xs font-bold">
                      {p.qtdClientes} clientes
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-300">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Faturamento Acumulado:</span>
                      <span className="font-bold text-white font-mono">{formatCurrency(p.receitaTotal)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Ticket Médio por Carro:</span>
                      <span className="font-bold text-emerald-400 font-mono">{formatCurrency(p.ticketMedio)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Modelo Mais Comprado:</span>
                      <span className="font-semibold text-white truncate max-w-[130px]">{p.modeloTop}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Canal Principal de Entrada:</span>
                      <span className="font-semibold text-pink-300 truncate max-w-[130px]">{p.canalTop.split('(')[0]}</span>
                    </div>
                  </div>
                </div>
              ))}
              {metricasProfissoes.length === 0 && (
                <div className="col-span-full py-8 text-center text-slate-500 text-xs">
                  Nenhum registro de profissão capturado nas vendas ainda.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 4: PARCERIAS BANCÁRIAS & RETORNO TAC                 */}
      {/* ======================================================== */}
      {activeTab === 'bancos' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#111116] p-5 rounded-3xl border border-white/5 space-y-2">
              <span className="text-slate-400 text-xs font-semibold uppercase">Volume Total Financiado</span>
              <p className="text-2xl font-black text-white font-mono">{formatCurrency(metricasBancos.totalVolumeFinanciadoGeral)}</p>
              <p className="text-xs text-slate-400">{metricasBancos.totalVendasFinanciadas} contratos intermediados</p>
            </div>

            <div className="bg-[#111116] p-5 rounded-3xl border border-white/5 space-y-2">
              <span className="text-slate-400 text-xs font-semibold uppercase">Retorno Total TAC / Loja</span>
              <p className="text-2xl font-black text-emerald-400 font-mono">{formatCurrency(metricasBancos.totalRetornoTacGeral)}</p>
              <p className="text-xs text-emerald-300 font-semibold">{metricasBancos.taxaRetornoMediaGeral}% de retorno médio s/ volume</p>
            </div>

            <div className="bg-[#111116] p-5 rounded-3xl border border-white/5 space-y-2">
              <span className="text-slate-400 text-xs font-semibold uppercase">Banco Parceiro Líder</span>
              <p className="text-2xl font-black text-white">{metricasBancos.lista[0]?.banco || 'N/A'}</p>
              <p className="text-xs text-indigo-300 font-semibold">{metricasBancos.lista[0]?.marketShareVolume || 0}% do share financiado</p>
            </div>
          </div>

          {/* Gráfico de Barras: Volume e Retorno por Banco */}
          <div className="bg-[#111116] p-6 rounded-3xl border border-white/5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-white text-base flex items-center gap-2">
                  <Building2 size={18} className="text-indigo-400" />
                  Volume Financiado e Comissão (TAC) por Banco Parceiro
                </h3>
                <p className="text-xs text-slate-400">
                  Acompanhamento de repasse financeiro e penetração de crédito nos negócios fechados.
                </p>
              </div>

              <button
                id="btn-export-bancos-tab4"
                onClick={handleExportBancos}
                className="px-3.5 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                title="Exportar dados de financiamento e TAC por banco parceiro em CSV"
              >
                <FileSpreadsheet size={14} />
                <span>Exportar Bancos & TAC (CSV)</span>
              </button>
            </div>

            <div className="h-80 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={metricasBancos.lista.map(b => ({
                    name: b.banco,
                    VolumeMil: Math.round(b.volumeFinanciadoTotal / 1000),
                    RetornoMil: Math.round(b.retornoTacTotal / 1000),
                    Contratos: b.contratosQtd,
                  }))}
                  margin={{ top: 10, right: 10, left: -10, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#232635" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} unit="k" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#181922', borderColor: '#2e3346', borderRadius: '16px', color: '#fff', fontSize: '12px' }}
                    formatter={(value: any, name: any) => [
                      `R$ ${value} mil`,
                      name === 'VolumeMil' ? 'Volume Financiado' : 'Retorno TAC Loja'
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Bar dataKey="VolumeMil" name="Volume Financiado (R$ mil)" fill="#6366f1" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="RetornoMil" name="Retorno TAC Loja (R$ mil)" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 5: IMPACTO DO TEST-DRIVE                             */}
      {/* ======================================================== */}
      {activeTab === 'testdrive' && (
        <div className="space-y-6">
          {/* Card Comparativo com / sem Test Drive */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-b from-emerald-950/30 to-[#111116] p-6 rounded-3xl border border-emerald-500/20 space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase flex items-center gap-1.5">
                  <CheckCircle2 size={14} />
                  Com Realização de Test-Drive
                </span>
                <span className="font-mono text-xs text-slate-400">{metricasTestDrive.statsCom.qtd} vendas</span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-[#16171f] p-3.5 rounded-2xl">
                  <span className="text-[11px] text-slate-400 block">Ticket Médio</span>
                  <span className="text-lg font-extrabold text-white font-mono">{formatCurrency(metricasTestDrive.statsCom.ticketMedio)}</span>
                </div>
                <div className="bg-[#16171f] p-3.5 rounded-2xl">
                  <span className="text-[11px] text-slate-400 block">Lucro Médio</span>
                  <span className="text-lg font-extrabold text-emerald-400 font-mono">{formatCurrency(metricasTestDrive.statsCom.lucroMedio)}</span>
                </div>
                <div className="bg-[#16171f] p-3.5 rounded-2xl">
                  <span className="text-[11px] text-slate-400 block">Margem Média</span>
                  <span className="text-lg font-extrabold text-blue-400">{metricasTestDrive.statsCom.margemMedia}%</span>
                </div>
                <div className="bg-[#16171f] p-3.5 rounded-2xl">
                  <span className="text-[11px] text-slate-400 block">Giro Médio (Aging)</span>
                  <span className="text-lg font-extrabold text-amber-400 font-mono">{metricasTestDrive.statsCom.diasPatioMedio} dias</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-b from-slate-900/40 to-[#111116] p-6 rounded-3xl border border-white/5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-bold uppercase flex items-center gap-1.5">
                  <Clock size={14} />
                  Sem Test-Drive Registrado
                </span>
                <span className="font-mono text-xs text-slate-400">{metricasTestDrive.statsSem.qtd} vendas</span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-[#16171f] p-3.5 rounded-2xl">
                  <span className="text-[11px] text-slate-400 block">Ticket Médio</span>
                  <span className="text-lg font-extrabold text-white font-mono">{formatCurrency(metricasTestDrive.statsSem.ticketMedio)}</span>
                </div>
                <div className="bg-[#16171f] p-3.5 rounded-2xl">
                  <span className="text-[11px] text-slate-400 block">Lucro Médio</span>
                  <span className="text-lg font-extrabold text-emerald-400 font-mono">{formatCurrency(metricasTestDrive.statsSem.lucroMedio)}</span>
                </div>
                <div className="bg-[#16171f] p-3.5 rounded-2xl">
                  <span className="text-[11px] text-slate-400 block">Margem Média</span>
                  <span className="text-lg font-extrabold text-blue-400">{metricasTestDrive.statsSem.margemMedia}%</span>
                </div>
                <div className="bg-[#16171f] p-3.5 rounded-2xl">
                  <span className="text-[11px] text-slate-400 block">Giro Médio (Aging)</span>
                  <span className="text-lg font-extrabold text-amber-400 font-mono">{metricasTestDrive.statsSem.diasPatioMedio} dias</span>
                </div>
              </div>
            </div>
          </div>

          {/* Gráfico Comparativo Recharts */}
          <div className="bg-[#111116] p-6 rounded-3xl border border-white/5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-white text-base flex items-center gap-2">
                  <TrendingUp size={18} className="text-emerald-400" />
                  Comparativo de Desempenho: Com vs Sem Test-Drive
                </h3>
                <p className="text-xs text-slate-400">
                  Avaliação empírica do aumento de conversão, margens e redução de dias em estoque.
                </p>
              </div>

              <button
                id="btn-export-testdrive-tab5"
                onClick={handleExportVendas}
                className="px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                title="Exportar base completa de vendas com status de test-drive em CSV"
              >
                <FileSpreadsheet size={14} />
                <span>Exportar Dados de Vendas (CSV)</span>
              </button>
            </div>

            <div className="h-80 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={metricasTestDrive.dadosComparativo}
                  margin={{ top: 10, right: 10, left: -10, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#232635" vertical={false} />
                  <XAxis dataKey="metrica" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#181922', borderColor: '#2e3346', borderRadius: '16px', color: '#fff', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Bar dataKey="ComTestDrive" name="Com Test-Drive" fill="#10b981" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="SemTestDrive" name="Sem Test-Drive" fill="#64748b" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
