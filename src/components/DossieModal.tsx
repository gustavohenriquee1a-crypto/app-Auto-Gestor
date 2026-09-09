import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  Car, 
  Calendar, 
  DollarSign, 
  Wrench, 
  Plus, 
  TrendingUp, 
  Clock, 
  FileText, 
  Tag, 
  CheckCircle2, 
  Sparkles, 
  Receipt,
  Trash2,
  Edit2,
  History,
  Activity,
  UserCheck,
  Building,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  ArrowUpRight,
  Filter,
  Check,
  Key,
  RotateCcw,
  Gauge,
  Sliders,
  Copy,
  Zap,
  Award,
  HelpCircle,
  ExternalLink,
  Compass,
  ClipboardCheck,
  Printer,
  FileCheck,
  User,
  Fuel,
  Link2,
  Megaphone,
  Shield,
  Info
} from 'lucide-react';
import { 
  Veiculo, 
  DespesaVeiculo, 
  EventoHistoricoVeiculo, 
  TipoEventoStatus, 
  StatusVeiculo, 
  StatusEstoque,
  Usuario,
  RegistroTestDrive,
  LaudoVistoriaEntrada,
  OrigemLeadType,
  VendaVeiculo
} from '../types';
import { 
  formatCurrency, 
  formatCurrencyDetailed, 
  formatDate, 
  formatKm, 
  calculateAging, 
  calculateTotalDespesas, 
  calculateCustoTotal,
  isCategoriaRepasseDistribuicao 
} from '../utils/formatters';
import { 
  registrarMudancaStatusEstoque, 
  formatarDataHoraAuditoria 
} from '../utils/auditLogger';
import { ParametrosMovimentacaoVeiculo, prepararMovimentacaoVeiculo } from '../services/movimentacaoVeiculoService';
import { saveVendaFirestore, saveVeiculoFirestore } from '../services/firestoreService';

interface DossieModalProps {
  veiculo: Veiculo;
  isOpen: boolean;
  onClose: () => void;
  onOpenNovaDespesa: (veiculo: Veiculo, despesaVinculadaOrigem?: DespesaVeiculo) => void;
  onOpenAbastecimento?: (veiculo: Veiculo) => void;
  onOpenVenda: (veiculo: Veiculo) => void;
  onDeleteDespesa: (veiculoId: string, despesaId: string) => void;
  onEditDespesa?: (veiculo: Veiculo, despesa: DespesaVeiculo) => void;
  onAdicionarEventoStatus?: (veiculoId: string, novoEvento: EventoHistoricoVeiculo) => void;
  onUpdateVeiculo?: (veiculo: Veiculo) => void;
  onUpdateVenda?: (venda: VendaVeiculo) => void;
  vendas?: VendaVeiculo[];
  onMovimentarVeiculo?: (params: ParametrosMovimentacaoVeiculo) => Promise<Veiculo>;
  onEditVeiculo?: (veiculo: Veiculo) => void;
  onOpenTestDrive?: (veiculo: Veiculo) => void;
  onOpenVistoria?: (veiculo: Veiculo) => void;
  onOpenEnviarServico?: (veiculo: Veiculo) => void;
  onOpenRetornoPatio?: (veiculo: Veiculo) => void;
  currentUser?: Usuario | null;
}

type TabType = 'detalhes' | 'custos' | 'timeline' | 'test_drive' | 'vistoria' | 'dre_chassi' | 'auditoria';
type TimelineFilter = 'todos' | 'locacao' | 'manutencao' | 'status';

export const DossieModal: React.FC<DossieModalProps> = ({
  veiculo,
  isOpen,
  onClose,
  onOpenNovaDespesa,
  onOpenAbastecimento,
  onOpenVenda,
  onDeleteDespesa,
  onEditDespesa,
  onAdicionarEventoStatus,
  onUpdateVeiculo,
  onUpdateVenda,
  vendas,
  onMovimentarVeiculo,
  onEditVeiculo,
  onOpenTestDrive,
  onOpenVistoria,
  onOpenEnviarServico,
  onOpenRetornoPatio,
  currentUser,
}) => {
  const isVendedor = currentUser?.role === 'vendedor';
  const canViewCosts = !isVendedor && currentUser?.permissoes?.verCustosAquisicao !== false;
  const canViewAging = !isVendedor;
  const canDoTestDrive = currentUser?.permissoes?.podeRealizarTestDrive !== false;
  const canDoVistoria = currentUser?.permissoes?.podeFazerVistoria !== false;

  const [activeTab, setActiveTab] = useState<TabType>('detalhes');
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>('todos');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [isNovoEventoModalOpen, setIsNovoEventoModalOpen] = useState(false);
  const [copiedChassi, setCopiedChassi] = useState(false);

  // Quick edit state for Nota Fiscal de Entrada inside the modal
  const [isEditingNota, setIsEditingNota] = useState(false);
  const [notaGeradaInput, setNotaGeradaInput] = useState(veiculo.notaEntradaGerada !== false);
  const [notaNumeroInput, setNotaNumeroInput] = useState(veiculo.notaEntradaNumero || '');
  const [notaDataInput, setNotaDataInput] = useState(veiculo.notaEntradaData || veiculo.dataEntrada || new Date().toISOString().split('T')[0]);
  const [notaChaveInput, setNotaChaveInput] = useState(veiculo.notaEntradaChave || '');

  // Quick Audit & Stock Status State
  const [novoStatusEstoqueInput, setNovoStatusEstoqueInput] = useState<StatusEstoque>(
    veiculo.status_estoque || (veiculo.status === 'Em Preparação' ? 'Em Preparação' : veiculo.status === 'Vendido' ? 'Vendido' : 'No Pátio')
  );
  const [motivoMudancaStatusInput, setMotivoMudancaStatusInput] = useState('');
  const [statusFeedbackMsg, setStatusFeedbackMsg] = useState<string | null>(null);

  useEffect(() => {
    if (veiculo.status_estoque) {
      setNovoStatusEstoqueInput(veiculo.status_estoque);
    }
  }, [veiculo.status_estoque]);

  const handleExecutarMudancaStatus = async (statusParaAplicar?: StatusEstoque, motivo?: string) => {
    if (!onUpdateVeiculo && !onMovimentarVeiculo) return;
    const statusDestino = statusParaAplicar || novoStatusEstoqueInput;
    const motivoFinal = motivo !== undefined ? motivo : motivoMudancaStatusInput;

    if (onMovimentarVeiculo) {
      await onMovimentarVeiculo({
        veiculo,
        novoStatusEstoque: statusDestino,
        motivoObservacao: motivoFinal,
        origemModulo: 'Dossiê do Veículo',
        usuario: currentUser,
      });
    } else if (onUpdateVeiculo) {
      const veiculoAtualizado = prepararMovimentacaoVeiculo({
        veiculo,
        novoStatusEstoque: statusDestino,
        motivoObservacao: motivoFinal,
        origemModulo: 'Dossiê do Veículo',
        usuario: currentUser,
      });
      onUpdateVeiculo(veiculoAtualizado);
    }

    setNovoStatusEstoqueInput(statusDestino);
    setMotivoMudancaStatusInput('');
    setStatusFeedbackMsg(`Status alterado para "${statusDestino}" com log de auditoria registrado!`);
    setTimeout(() => setStatusFeedbackMsg(null), 4000);
  };

  // Form State for New Timeline Event
  const [novoEventoForm, setNovoEventoForm] = useState<{
    tipo: TipoEventoStatus;
    titulo: string;
    descricao: string;
    data: string;
    statusResultante: StatusVeiculo;
    km: number | '';
    motoristaNome: string;
    fornecedorOficina: string;
    valor: number | '';
    observacoes: string;
  }>({
    tipo: 'Mudança de Status',
    titulo: '',
    descricao: '',
    data: new Date().toISOString().split('T')[0],
    statusResultante: veiculo.status,
    km: veiculo.kmAtual,
    motoristaNome: veiculo.contratoAtivo?.motoristaNome || '',
    fornecedorOficina: '',
    valor: '',
    observacoes: '',
  });

  const [simuladorPreco, setSimuladorPreco] = useState<number>(
    veiculo.valorVendaSugerido || (veiculo.custoAquisicao * 1.22)
  );

  const handleCopyChassi = () => {
    navigator.clipboard.writeText(veiculo.chassi);
    setCopiedChassi(true);
    setTimeout(() => setCopiedChassi(false), 2000);
  };

  const handleSalvarNotaEntrada = () => {
    if (onUpdateVeiculo) {
      const updatedVeiculo: Veiculo = {
        ...veiculo,
        notaEntradaGerada: notaGeradaInput,
        notaEntradaNumero: notaNumeroInput.trim() || undefined,
        notaEntradaData: notaDataInput || undefined,
        notaEntradaChave: notaChaveInput.trim() || undefined,
      };
      onUpdateVeiculo(updatedVeiculo);
    }
    setIsEditingNota(false);
  };

  // Profit simulations
  const totalDespesas = calculateTotalDespesas(veiculo);
  const custoFinal = calculateCustoTotal(veiculo);
  const aging = calculateAging(veiculo);
  const precoVendaAtual = veiculo.valorVendaSugerido || simuladorPreco;
  const lucroEstimado = precoVendaAtual - custoFinal;
  const margemPercentual = custoFinal > 0 ? ((lucroEstimado / custoFinal) * 100) : 0;

  // Venda associada (do objeto do veículo ou da listagem global de vendas)
  const vendaCorrespondente = useMemo(() => {
    return veiculo.venda || (vendas ? vendas.find(v => v.veiculoId === veiculo.id || (v.placa && veiculo.placa && v.placa === veiculo.placa)) : undefined);
  }, [veiculo.venda, veiculo.id, veiculo.placa, vendas]);

  // Marketing & Tráfego Pós-Venda Modal State
  const [modalMarketingAberto, setModalMarketingAberto] = useState(false);
  const [valorMarketingInput, setValorMarketingInput] = useState<string>('');
  const [origemLeadInput, setOrigemLeadInput] = useState<OrigemLeadType>('Meta Ads');
  const [isSalvandoMarketing, setIsSalvandoMarketing] = useState(false);
  const [feedbackMarketingMsg, setFeedbackMarketingMsg] = useState<string | null>(null);

  // Marketing & Divulgação no Estoque (veículo ativo)
  const [anuncioAtivoVeiculo, setAnuncioAtivoVeiculo] = useState(veiculo.anuncioAtivo ?? false);
  const [plataformasAnuncioVeiculo, setPlataformasAnuncioVeiculo] = useState<string[]>(veiculo.plataformasAnuncio || []);

  useEffect(() => {
    setAnuncioAtivoVeiculo(veiculo.anuncioAtivo ?? false);
    setPlataformasAnuncioVeiculo(veiculo.plataformasAnuncio || []);
  }, [veiculo.anuncioAtivo, veiculo.plataformasAnuncio]);

  const handleSalvarMarketingVeiculo = async (novoAtivo: boolean, novasPlataformas: string[]) => {
    setAnuncioAtivoVeiculo(novoAtivo);
    setPlataformasAnuncioVeiculo(novasPlataformas);
    const veicAtualizado: Veiculo = {
      ...veiculo,
      anuncioAtivo: novoAtivo,
      plataformasAnuncio: novasPlataformas,
    };
    if (onUpdateVeiculo) {
      onUpdateVeiculo(veicAtualizado);
    }
    await saveVeiculoFirestore(veicAtualizado);
  };

  const handleAbrirModalMarketing = () => {
    const valAtual = vendaCorrespondente?.despesaMarketingAplicadaPosVenda;
    setValorMarketingInput(valAtual !== undefined && valAtual !== null ? String(valAtual) : '');
    setOrigemLeadInput(vendaCorrespondente?.origemLead || 'Meta Ads');
    setFeedbackMarketingMsg(null);
    setModalMarketingAberto(true);
  };

  const handleSalvarCustoMarketing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendaCorrespondente) return;
    setIsSalvandoMarketing(true);
    try {
      const novoCustoMkt = Math.max(0, Number(valorMarketingInput) || 0);
      const custoMktAnterior = Number(vendaCorrespondente.despesaMarketingAplicadaPosVenda || 0);
      const diferencaMkt = novoCustoMkt - custoMktAnterior;

      // REGRA CONTÁBIL CRÍTICA:
      // Este valor deve ser deduzido do lucroLiquido final do carro no DRE,
      // mas NÃO deve recalcular ou alterar o valor da comissão que já foi fixada
      // e salva para os vendedores no momento do fechamento da venda.
      const lucroAnterior = Number(vendaCorrespondente.lucroLiquido) || 0;
      const novoLucroLiquido = lucroAnterior - diferencaMkt;
      const custoTotalBase = Number(vendaCorrespondente.custoTotal) || (veiculo.custoAquisicao + totalDespesas);
      const novaMargemLucro = custoTotalBase > 0 ? (novoLucroLiquido / custoTotalBase) * 100 : 0;

      const vendaAtualizada: VendaVeiculo = {
        ...vendaCorrespondente,
        despesaMarketingAplicadaPosVenda: novoCustoMkt,
        origemLead: origemLeadInput,
        lucroLiquido: novoLucroLiquido,
        margemLucroPercent: novaMargemLucro,
        // Comissões permanecem inalteradas:
        comissaoValor: vendaCorrespondente.comissaoValor,
        comissaoPercentual: vendaCorrespondente.comissaoPercentual,
        comissoesMultiplas: vendaCorrespondente.comissoesMultiplas,
      };

      const veiculoAtualizado: Veiculo = {
        ...veiculo,
        venda: vendaAtualizada,
      };

      if (onUpdateVenda) {
        onUpdateVenda(vendaAtualizada);
      }
      if (onUpdateVeiculo) {
        onUpdateVeiculo(veiculoAtualizado);
      }

      await saveVendaFirestore(vendaAtualizada);
      await saveVeiculoFirestore(veiculoAtualizado);

      setFeedbackMarketingMsg('Custo de marketing lançado com sucesso! Lucro Líquido atualizado no DRE com comissões preservadas.');
      setTimeout(() => {
        setFeedbackMarketingMsg(null);
        setModalMarketingAberto(false);
      }, 1200);
    } catch (error) {
      console.error('Erro ao salvar custo de marketing pós-venda:', error);
      setFeedbackMarketingMsg('Erro ao salvar no banco de dados. Tente novamente.');
    } finally {
      setIsSalvandoMarketing(false);
    }
  };

  const handleQuitarDespesaDirect = async (despesaId: string) => {
    const updatedDespesas = (veiculo.despesas || []).map((d) => {
      if (d.id === despesaId) {
        return {
          ...d,
          statusPagamento: 'Pago' as const,
          dataPagamento: new Date().toISOString().split('T')[0],
          formaPagamento: d.formaPagamento || 'PIX',
        };
      }
      return d;
    });

    const veiculoAtualizado: Veiculo = {
      ...veiculo,
      despesas: updatedDespesas,
    };

    if (onUpdateVeiculo) {
      onUpdateVeiculo(veiculoAtualizado);
    }
    await saveVeiculoFirestore(veiculoAtualizado);
  };

  // Group expenses by category for quick insights
  const despesasPorCategoria = (veiculo.despesas || []).reduce((acc, d) => {
    if (!d) return acc;
    const cat = d.categoria || 'Geral';
    acc[cat] = (acc[cat] || 0) + (Number(d.valor) || 0);
    return acc;
  }, {} as Record<string, number>);

  // Consolidate & Auto-generate unified chronological timeline events
  const timelineEventos = useMemo(() => {
    const rawEvents: EventoHistoricoVeiculo[] = [];

    // 1. Explicit registered status events
    if (veiculo.historicoStatus && veiculo.historicoStatus.length > 0) {
      rawEvents.push(...veiculo.historicoStatus.filter((ev) => ev != null));
    } else {
      // Base acquisition event if not explicitly registered
      rawEvents.push({
        id: `hs-init-${veiculo.id}`,
        data: veiculo.dataEntrada,
        tipo: 'Entrada / Aquisição',
        titulo: 'Entrada no Pátio & Aquisição',
        descricao: canViewCosts
          ? `Veículo integrado ao estoque com valor de compra de ${formatCurrency(veiculo.custoAquisicao)}.`
          : `Veículo integrado ao estoque para comercialização e showroom.`,
        statusResultante: 'Em Preparação',
        km: veiculo.kmAtual,
        valor: canViewCosts ? veiculo.custoAquisicao : undefined,
      });
    }

    // 2. Add active rental contract event if not already present
    if (veiculo.contratoAtivo) {
      const hasContratoEvent = rawEvents.some(
        (e) => e && e.tipo === 'Locação Iniciada' && e.data === veiculo.contratoAtivo?.dataInicio
      );
      if (!hasContratoEvent) {
        rawEvents.push({
          id: `hs-contrato-${veiculo.contratoAtivo.id}`,
          data: veiculo.contratoAtivo.dataInicio,
          tipo: 'Locação Iniciada',
          titulo: `Contrato de Locação Ativo (${veiculo.contratoAtivo.motoristaApp})`,
          descricao: `Locação com ${veiculo.contratoAtivo.motoristaNome}. R$ ${veiculo.contratoAtivo.valorSemanal}/sem. Caução: ${formatCurrency(veiculo.contratoAtivo.caucao)}.`,
          statusResultante: 'Alugado',
          km: veiculo.contratoAtivo.kmInicial,
          motoristaNome: veiculo.contratoAtivo.motoristaNome,
          motoristaCpf: veiculo.contratoAtivo.motoristaCpf,
          valor: veiculo.contratoAtivo.valorSemanal,
        });
      }
    }

    // 3. Add Sale event if vehicle is sold
    if (veiculo.venda) {
      const hasVendaEvent = rawEvents.some((e) => e && e.tipo === 'Venda Concluída');
      if (!hasVendaEvent) {
        rawEvents.push({
          id: `hs-venda-${veiculo.venda.id}`,
          data: veiculo.venda.dataVenda,
          tipo: 'Venda Concluída',
          titulo: `Venda Concluída (${veiculo.venda.formaPagamento})`,
          descricao: canViewCosts
            ? `Veículo vendido para ${veiculo.venda.compradorNome} por ${formatCurrency(veiculo.venda.valorVenda)} (Lucro: ${formatCurrency(veiculo.venda.lucroLiquido)}).`
            : `Veículo vendido para ${veiculo.venda.compradorNome}.`,
          statusResultante: 'Vendido',
          km: veiculo.kmAtual,
          valor: veiculo.venda.valorVenda,
        });
      }
    }

    // Deduplicate by ID
    const uniqueMap = new Map<string, EventoHistoricoVeiculo>();
    rawEvents.forEach((ev) => {
      if (!ev) return;
      if (!uniqueMap.has(ev.id)) {
        uniqueMap.set(ev.id, ev);
      }
    });

    const list = Array.from(uniqueMap.values());

    // Sort by date
    list.sort((a, b) => {
      const dateA = a?.data ? new Date(a.data).getTime() : 0;
      const dateB = b?.data ? new Date(b.data).getTime() : 0;
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    return list;
  }, [veiculo, sortOrder, canViewCosts]);

  // Filtered timeline events
  const filteredTimeline = useMemo(() => {
    return timelineEventos.filter((ev) => {
      if (timelineFilter === 'todos') return true;
      if (timelineFilter === 'locacao') {
        return (
          ev.tipo === 'Locação Iniciada' ||
          ev.tipo === 'Devolução / Encerramento' ||
          ev.motoristaNome !== undefined
        );
      }
      if (timelineFilter === 'manutencao') {
        return (
          ev.tipo === 'Manutenção Preventiva' ||
          ev.tipo === 'Revisão Periódica' ||
          ev.tipo === 'Envio para Oficina' ||
          ev.fornecedorOficina !== undefined
        );
      }
      if (timelineFilter === 'status') {
        return (
          ev.tipo === 'Mudança de Status' ||
          ev.tipo === 'Entrada / Aquisição' ||
          ev.tipo === 'Retorno ao Pátio' ||
          ev.tipo === 'Preparação / Estética' ||
          ev.tipo === 'Venda Concluída' ||
          ev.tipo === 'Atualização de KM'
        );
      }
      return true;
    });
  }, [timelineEventos, timelineFilter]);

  const totalLocacoes = timelineEventos.filter((e) => e.tipo === 'Locação Iniciada').length;
  const totalManutencoes = timelineEventos.filter(
    (e) => e.tipo === 'Manutenção Preventiva' || e.tipo === 'Revisão Periódica' || e.tipo === 'Envio para Oficina'
  ).length;

  const handleSalvarNovoEvento = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoEventoForm.titulo.trim()) {
      alert('Por favor, informe um título para o evento.');
      return;
    }

    const novoEvento: EventoHistoricoVeiculo = {
      id: `hs-${Date.now()}`,
      tipo: novoEventoForm.tipo,
      titulo: novoEventoForm.titulo.trim(),
      descricao: novoEventoForm.descricao.trim(),
      data: novoEventoForm.data,
      statusResultante: novoEventoForm.statusResultante,
      km: novoEventoForm.km !== '' ? Number(novoEventoForm.km) : undefined,
      motoristaNome: novoEventoForm.motoristaNome.trim() || undefined,
      fornecedorOficina: novoEventoForm.fornecedorOficina.trim() || undefined,
      valor: novoEventoForm.valor !== '' ? Number(novoEventoForm.valor) : undefined,
      usuarioRegistro: currentUser?.displayName || currentUser?.email || 'Administrador',
      observacoes: novoEventoForm.observacoes.trim() || undefined,
    };

    if (onAdicionarEventoStatus) {
      onAdicionarEventoStatus(veiculo.id, novoEvento);
    }

    setIsNovoEventoModalOpen(false);
  };

  const getEventBadge = (tipo: TipoEventoStatus) => {
    switch (tipo) {
      case 'Locação Iniciada':
        return {
          bg: 'bg-emerald-500/15',
          text: 'text-emerald-400',
          border: 'border-emerald-500/30',
          icon: Key,
          label: 'Locação Iniciada',
        };
      case 'Devolução / Encerramento':
        return {
          bg: 'bg-purple-500/15',
          text: 'text-purple-400',
          border: 'border-purple-500/30',
          icon: RotateCcw,
          label: 'Devolução / Encerramento',
        };
      case 'Manutenção Preventiva':
      case 'Revisão Periódica':
        return {
          bg: 'bg-amber-500/15',
          text: 'text-amber-400',
          border: 'border-amber-500/30',
          icon: Wrench,
          label: tipo,
        };
      case 'Envio para Oficina':
      case 'Preparação / Estética':
        return {
          bg: 'bg-yellow-500/15',
          text: 'text-yellow-400',
          border: 'border-yellow-500/30',
          icon: Sparkles,
          label: tipo,
        };
      case 'Entrada / Aquisição':
        return {
          bg: 'bg-blue-500/15',
          text: 'text-blue-400',
          border: 'border-blue-500/30',
          icon: Car,
          label: 'Entrada / Aquisição',
        };
      case 'Venda Concluída':
        return {
          bg: 'bg-emerald-500/20',
          text: 'text-emerald-300',
          border: 'border-emerald-500/40',
          icon: DollarSign,
          label: 'Venda Concluída',
        };
      case 'Abastecimento':
        return {
          bg: 'bg-amber-500/15',
          text: 'text-amber-400',
          border: 'border-amber-500/30',
          icon: Fuel,
          label: 'Abastecimento',
        };
      case 'Retorno ao Pátio':
        return {
          bg: 'bg-cyan-500/15',
          text: 'text-cyan-400',
          border: 'border-cyan-500/30',
          icon: CheckCircle2,
          label: 'Retorno ao Pátio',
        };
      case 'Atualização de KM':
        return {
          bg: 'bg-indigo-500/15',
          text: 'text-indigo-400',
          border: 'border-indigo-500/30',
          icon: Gauge,
          label: 'Odômetro / Telemetria',
        };
      default:
        return {
          bg: 'bg-slate-500/15',
          text: 'text-slate-300',
          border: 'border-slate-500/30',
          icon: Activity,
          label: tipo,
        };
    }
  };

  const getStatusBadgeColor = (status: StatusVeiculo) => {
    switch (status) {
      case 'Alugado':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'Disponível':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'Em Preparação':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'Em Manutenção':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      case 'Vendido':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  const calculateDaysAgo = (dateStr: string) => {
    try {
      const eventDate = new Date(dateStr);
      const today = new Date();
      const diffTime = today.getTime() - eventDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays === 0) return 'Hoje';
      if (diffDays === 1) return 'Ontem';
      if (diffDays < 30) return `Há ${diffDays} dias`;
      const months = Math.floor(diffDays / 30);
      return `Há ~${months} ${months === 1 ? 'mês' : 'meses'}`;
    } catch {
      return '';
    }
  };

  if (!isOpen) return null;

  const fabYear = veiculo.anoFabricacao || veiculo.ano;
  const modYear = veiculo.anoModelo || veiculo.ano;
  const isNotaEmitida = veiculo.notaEntradaGerada !== false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col bg-gray-900 rounded-2xl shadow-xl overflow-hidden border border-white/10">
        
        {/* Modal Header */}
        <div className="bg-[#16171f] text-white p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 gap-4 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-blue-900/30 shrink-0">
              <Car size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-mono font-black bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2.5 py-0.5 rounded-lg text-xs tracking-wider">
                  {veiculo.placa}
                </span>

                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${getStatusBadgeColor(veiculo.status)} flex items-center gap-1.5`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                  {veiculo.status}
                </span>

                {/* Badge de Propriedade */}
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                  veiculo.tipoPropriedade === 'consignado'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                }`}>
                  {veiculo.tipoPropriedade === 'consignado' ? '🤝 Consignação' : '🚗 Frota Própria'}
                </span>

                {/* Badge Fiscal de Nota de Entrada */}
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border flex items-center gap-1 ${
                  isNotaEmitida
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                }`}>
                  {isNotaEmitida ? (
                    <>
                      <Check size={12} /> NF-e Entrada OK
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={12} /> SEM NOTA DE ENTRADA
                    </>
                  )}
                </span>
              </div>

              <h2 className="text-xl font-black text-white flex items-center gap-2 flex-wrap">
                <span>{veiculo.modelo}</span>
                <span className="text-sm font-mono font-normal text-slate-400 bg-white/5 px-2 py-0.5 rounded">
                  Ano: {fabYear}/{modYear}
                </span>
              </h2>

              <p className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-2 flex-wrap">
                <span>Chassi: <strong className="text-slate-200">{veiculo.chassi}</strong></span>
                <button
                  onClick={handleCopyChassi}
                  className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
                  title="Copiar Chassi"
                >
                  <Copy size={12} />
                  {copiedChassi ? 'Copiado!' : 'Copiar'}
                </button>
                <span>• {veiculo.cor}</span>
                <span>• {formatKm(veiculo.kmAtual)}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center flex-wrap">
            {/* Quick Actions for Service / Return */}
            {(veiculo.status === 'Em Preparação' || veiculo.status === 'Em Manutenção' || veiculo.status_estoque === 'Em Preparação') ? (
              <>
                {onOpenRetornoPatio && (
                  <button
                    type="button"
                    onClick={() => onOpenRetornoPatio(veiculo)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition flex items-center gap-1.5 text-xs font-black shadow-md cursor-pointer"
                    title="Confirmar retorno do veículo ao showroom com 1 clique"
                  >
                    <CheckCircle2 size={14} />
                    <span>Retorno ao Pátio (1 Clique)</span>
                  </button>
                )}

                {onOpenEnviarServico && (
                  <button
                    type="button"
                    onClick={() => onOpenEnviarServico(veiculo)}
                    className="px-2.5 py-1.5 text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                    title="Alterar oficina ou reenviar para novo serviço"
                  >
                    <Wrench size={14} className="text-orange-400" />
                    <span>Alterar Serviço</span>
                  </button>
                )}
              </>
            ) : (
              veiculo.status !== 'Vendido' && veiculo.status !== 'Alugado' && onOpenEnviarServico && (
                <button
                  type="button"
                  onClick={() => onOpenEnviarServico(veiculo)}
                  className="px-3 py-1.5 bg-orange-600/20 hover:bg-orange-600/30 text-orange-300 border border-orange-500/30 rounded-xl transition flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                  title="Enviar veículo para Oficina, Funilaria ou Estética com sincronização no Kanban"
                >
                  <Wrench size={14} />
                  <span>Enviar para Preparação</span>
                </button>
              )
            )}

            {onEditVeiculo && (
              <button
                onClick={() => onEditVeiculo(veiculo)}
                className="p-2 text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                title="Editar Cadastro"
              >
                <Edit2 size={15} />
                <span className="hidden sm:inline">Editar</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition cursor-pointer"
              title="Fechar"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-[#14151c] px-6 border-b border-white/10 flex items-center justify-between gap-4 overflow-x-auto flex-shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('detalhes')}
              className={`py-3.5 px-4 font-bold text-xs border-b-2 transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'detalhes'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Car size={16} />
              <span>Ficha Técnica & Detalhes</span>
            </button>

            {canViewCosts && (
              <button
                onClick={() => setActiveTab('custos')}
                className={`py-3.5 px-4 font-bold text-xs border-b-2 transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'custos'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Receipt size={16} />
                <span>Custos & Despesas de Oficina</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-white/10 text-slate-300 font-bold">
                  {veiculo.despesas?.length || 0}
                </span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('timeline')}
              className={`py-3.5 px-4 font-bold text-xs border-b-2 transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'timeline'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <History size={16} />
              <span>Cronograma & Histórico</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold">
                {timelineEventos.length}
              </span>
            </button>

            {canViewCosts && (
              <button
                onClick={() => setActiveTab('dre_chassi')}
                className={`py-3.5 px-4 font-bold text-xs border-b-2 transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'dre_chassi'
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <TrendingUp size={16} />
                <span>DRE Individual por Chassi</span>
              </button>
            )}

            {canDoTestDrive && (
              <button
                onClick={() => setActiveTab('test_drive')}
                className={`py-3.5 px-4 font-bold text-xs border-b-2 transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'test_drive'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Compass size={16} />
                <span>Test Drive & Termos</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold ${
                  (veiculo.historicoTestDrives?.length || 0) > 0
                    ? 'bg-blue-500/20 text-blue-300'
                    : 'bg-white/10 text-slate-400'
                }`}>
                  {veiculo.historicoTestDrives?.length || 0}
                </span>
              </button>
            )}

            {canDoVistoria && (
              <button
                onClick={() => setActiveTab('vistoria')}
                className={`py-3.5 px-4 font-bold text-xs border-b-2 transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'vistoria'
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <ClipboardCheck size={16} />
                <span>Vistorias Digitais</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold ${
                  (veiculo.laudosVistoria?.length || 0) > 0
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-white/10 text-slate-400'
                }`}>
                  {veiculo.laudosVistoria?.length || 0}
                </span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('auditoria')}
              className={`py-3.5 px-4 font-bold text-xs border-b-2 transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'auditoria'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck size={16} />
              <span>Auditoria de Status</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold ${
                (veiculo.historicoAuditoriaStatus?.length || 0) > 0
                  ? 'bg-indigo-500/20 text-indigo-300'
                  : 'bg-white/10 text-slate-400'
              }`}>
                {veiculo.historicoAuditoriaStatus?.length || 0}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2 py-2">
            {activeTab === 'test_drive' && canDoTestDrive && onOpenTestDrive && (
              <button
                onClick={() => onOpenTestDrive(veiculo)}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm transition whitespace-nowrap cursor-pointer"
              >
                <Plus size={14} /> Novo Test Drive
              </button>
            )}
            {activeTab === 'vistoria' && canDoVistoria && onOpenVistoria && (
              <button
                onClick={() => onOpenVistoria(veiculo)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm transition whitespace-nowrap cursor-pointer"
              >
                <Plus size={14} /> Nova Vistoria
              </button>
            )}
            {activeTab === 'timeline' && (
              <button
                onClick={() => setIsNovoEventoModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm transition whitespace-nowrap cursor-pointer"
              >
                <Plus size={14} /> Registrar Evento
              </button>
            )}
            {activeTab === 'custos' && (
              <div className="flex items-center gap-2">
                {onOpenAbastecimento && (
                  <button
                    onClick={() => onOpenAbastecimento(veiculo)}
                    className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black text-xs font-black px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm transition whitespace-nowrap cursor-pointer"
                  >
                    <Fuel size={14} /> Registrar Abastecimento
                  </button>
                )}
                <button
                  onClick={() => onOpenNovaDespesa(veiculo)}
                  className="bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm transition whitespace-nowrap cursor-pointer"
                >
                  <Plus size={14} /> Lançar Despesa
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 bg-[#0a0a0c]">
          
          {/* ================= ABA 1: FICHA TÉCNICA & DETALHES GERAIS ================= */}
          {activeTab === 'detalhes' && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* CARD FISCAL: CONTROLE DE NOTA FISCAL DE ENTRADA (ANTI-MULTA FISCALIZAÇÃO) */}
              <div className={`p-5 rounded-2xl border transition-all ${
                isNotaEmitida 
                  ? 'bg-gradient-to-r from-emerald-950/20 via-[#16171f] to-[#16171f] border-emerald-500/30' 
                  : 'bg-gradient-to-r from-rose-950/30 via-[#16171f] to-[#16171f] border-rose-500/50'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shrink-0 ${
                      isNotaEmitida ? 'bg-emerald-600' : 'bg-rose-600 animate-pulse'
                    }`}>
                      <FileText size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-sm text-white">
                          Status Fiscal: Nota de Entrada no Pátio
                        </h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          isNotaEmitida ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                        }`}>
                          {isNotaEmitida ? 'Regularizado' : 'Pendente / Risco Fiscal'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {isNotaEmitida
                          ? 'Veículo com Nota de Entrada devidamente emitida e vinculado à loja.'
                          : 'Atenção: Carro em pátio sem comprovação de entrada emitida. Risco de autuação em blitz fiscal.'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsEditingNota(!isEditingNota)}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 transition flex items-center gap-1.5 self-start sm:self-center cursor-pointer"
                  >
                    <Edit2 size={13} />
                    <span>{isEditingNota ? 'Cancelar Edição' : 'Alterar Status da Nota'}</span>
                  </button>
                </div>

                {/* Inline Quick Editor for Fiscal Data */}
                {isEditingNota ? (
                  <div className="pt-4 space-y-3 animate-fadeIn">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-slate-300 font-bold text-xs mb-1">Status da NF-e</label>
                        <select
                          value={notaGeradaInput ? 'sim' : 'nao'}
                          onChange={(e) => setNotaGeradaInput(e.target.value === 'sim')}
                          className="w-full p-2.5 rounded-xl border border-white/10 bg-[#16171f] text-white text-xs font-bold outline-none"
                        >
                          <option value="sim">✅ Emitida / Regular</option>
                          <option value="nao">🚨 Pendente / Não Emitida</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-300 font-bold text-xs mb-1">Número da Nota (NF-e)</label>
                        <input
                          type="text"
                          value={notaNumeroInput}
                          onChange={(e) => setNotaNumeroInput(e.target.value)}
                          placeholder="Ex: NF-e 004921"
                          className="w-full p-2.5 rounded-xl border border-white/10 bg-[#16171f] text-white text-xs font-mono outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-300 font-bold text-xs mb-1">Data de Emissão</label>
                        <input
                          type="date"
                          value={notaDataInput}
                          onChange={(e) => setNotaDataInput(e.target.value)}
                          className="w-full p-2.5 rounded-xl border border-white/10 bg-[#16171f] text-white text-xs outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-300 font-bold text-xs mb-1">Chave NF-e (Opcional)</label>
                        <input
                          type="text"
                          value={notaChaveInput}
                          onChange={(e) => setNotaChaveInput(e.target.value)}
                          placeholder="44 dígitos da chave"
                          className="w-full p-2.5 rounded-xl border border-white/10 bg-[#16171f] text-white text-xs font-mono outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        onClick={() => setIsEditingNota(false)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-400"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleSalvarNotaEntrada}
                        className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm flex items-center gap-1.5 cursor-pointer"
                      >
                        <Check size={14} /> Salvar Dados Fiscais
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="pt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Número da NF-e</span>
                      <strong className="text-slate-200 font-mono">
                        {veiculo.notaEntradaNumero || (isNotaEmitida ? 'Registrada no Pátio' : 'Não Informado')}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Data de Emissão</span>
                      <strong className="text-slate-200">
                        {veiculo.notaEntradaData ? formatDate(veiculo.notaEntradaData) : formatDate(veiculo.dataEntrada)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Origem / Aquisição</span>
                      <strong className="text-slate-200">
                        {veiculo.tipoPropriedade === 'consignado' ? 'Entrada em Consignação' : 'Compra p/ Estoque'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Chave NF-e</span>
                      <strong className="text-slate-200 font-mono text-[10px] truncate block" title={veiculo.notaEntradaChave || ''}>
                        {veiculo.notaEntradaChave ? `${veiculo.notaEntradaChave.slice(0, 15)}...` : '---'}
                      </strong>
                    </div>
                  </div>
                )}
              </div>

              {/* GRADE DE FICHA TÉCNICA E ESPECIFICAÇÕES COMPLETAS */}
              <div className="bg-[#111116] p-5 rounded-2xl border border-white/5 space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <h3 className="font-bold text-sm text-white uppercase tracking-wide flex items-center gap-2">
                    <Sliders size={16} className="text-blue-400" />
                    Ficha Técnica & Informações Cadastradas
                  </h3>
                  <span className="text-xs text-slate-400">
                    Marca: <strong className="text-white">{veiculo.marca}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div className="bg-[#16171f] p-3.5 rounded-xl border border-white/5">
                    <span className="text-[11px] text-slate-400 block font-semibold">Ano de Fabricação</span>
                    <strong className="text-base font-black text-white font-mono mt-0.5 block">{fabYear}</strong>
                    <span className="text-[10px] text-slate-500">Ano real de montagem</span>
                  </div>

                  <div className="bg-[#16171f] p-3.5 rounded-xl border border-white/5">
                    <span className="text-[11px] text-emerald-400 block font-semibold">Ano do Modelo</span>
                    <strong className="text-base font-black text-emerald-400 font-mono mt-0.5 block">{modYear}</strong>
                    <span className="text-[10px] text-slate-500">Versão comercial</span>
                  </div>

                  <div className="bg-[#16171f] p-3.5 rounded-xl border border-white/5">
                    <span className="text-[11px] text-slate-400 block font-semibold">Tipo de Câmbio</span>
                    <strong className="text-sm font-bold text-white mt-0.5 block">{veiculo.cambio || 'Manual'}</strong>
                    <span className="text-[10px] text-slate-500">Transmissão</span>
                  </div>

                  <div className="bg-[#16171f] p-3.5 rounded-xl border border-white/5">
                    <span className="text-[11px] text-slate-400 block font-semibold">Motorização</span>
                    <strong className="text-sm font-bold text-blue-400 mt-0.5 block">{veiculo.motorizacao || '1.0 Flex'}</strong>
                    <span className="text-[10px] text-slate-500">Configuração do motor</span>
                  </div>

                  <div className="bg-[#16171f] p-3.5 rounded-xl border border-white/5">
                    <span className="text-[11px] text-slate-400 block font-semibold">Potência</span>
                    <strong className="text-sm font-bold text-white mt-0.5 block">{veiculo.potencia || '---'}</strong>
                    <span className="text-[10px] text-slate-500">HP / CV</span>
                  </div>

                  <div className="bg-[#16171f] p-3.5 rounded-xl border border-white/5">
                    <span className="text-[11px] text-slate-400 block font-semibold">Combustível</span>
                    <strong className="text-sm font-bold text-white mt-0.5 block">{veiculo.combustivel}</strong>
                    <span className="text-[10px] text-slate-500">Tipo de alimentação</span>
                  </div>

                  <div className="bg-[#16171f] p-3.5 rounded-xl border border-white/5">
                    <span className="text-[11px] text-slate-400 block font-semibold">KM Atual</span>
                    <strong className="text-base font-black text-indigo-300 font-mono mt-0.5 block">{formatKm(veiculo.kmAtual)}</strong>
                    <span className="text-[10px] text-slate-500">Última rev: {formatKm(veiculo.kmUltimaRevisao)}</span>
                  </div>

                  <div className="bg-[#16171f] p-3.5 rounded-xl border border-white/5">
                    <span className="text-[11px] text-slate-400 block font-semibold">Cor & Pintura</span>
                    <strong className="text-sm font-bold text-white mt-0.5 block">{veiculo.cor}</strong>
                    <span className="text-[10px] text-slate-500">{veiculo.localizacaoPatio || 'Pátio Principal'}</span>
                  </div>
                </div>
              </div>

              {/* RESUMO FINANCEIRO & PREÇO DE VENDA */}
              {canViewCosts && (
                <div className="bg-[#111116] p-5 rounded-2xl border border-white/5 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <h3 className="font-bold text-sm text-white uppercase tracking-wide flex items-center gap-2">
                      <DollarSign size={16} className="text-emerald-400" />
                      Estrutura de Custos & Precificação da Loja
                    </h3>
                    <button
                      onClick={() => setActiveTab('custos')}
                      className="text-xs font-semibold text-blue-400 hover:underline flex items-center gap-1"
                    >
                      Ver Extrato Completo <ArrowRight size={13} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div className="bg-[#16171f] p-3.5 rounded-xl border border-white/5">
                      <span className="text-[11px] text-slate-400 block font-semibold">Custo de Compra</span>
                      <strong className="text-base font-black text-white font-mono mt-0.5 block">
                        {formatCurrency(veiculo.custoAquisicao)}
                      </strong>
                      <span className="text-[10px] text-slate-500">Aquisição em {formatDate(veiculo.dataEntrada)}</span>
                    </div>

                    <div className="bg-[#16171f] p-3.5 rounded-xl border border-orange-500/20">
                      <span className="text-[11px] text-orange-400 block font-semibold">+ Despesas Oficina</span>
                      <strong className="text-base font-black text-orange-400 font-mono mt-0.5 block">
                        +{formatCurrency(totalDespesas)}
                      </strong>
                      <span className="text-[10px] text-orange-400/70">{veiculo.despesas?.length || 0} manutenções</span>
                    </div>

                    <div className="bg-[#16171f] p-3.5 rounded-xl border border-blue-500/20">
                      <span className="text-[11px] text-blue-400 block font-semibold">Custo Total de Pátio</span>
                      <strong className="text-base font-black text-blue-400 font-mono mt-0.5 block">
                        {formatCurrency(custoFinal)}
                      </strong>
                      <span className="text-[10px] text-blue-400/70">Break-even</span>
                    </div>

                    <div className="bg-[#16171f] p-3.5 rounded-xl border border-emerald-500/20">
                      <span className="text-[11px] text-emerald-400 block font-semibold">Preço Pretendido Loja</span>
                      <strong className="text-base font-black text-emerald-400 font-mono mt-0.5 block">
                        {formatCurrency(precoVendaAtual)}
                      </strong>
                      <span className="text-[10px] text-emerald-400/80 font-bold">
                        Margem: {formatCurrency(lucroEstimado)} ({margemPercentual.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* CARD DE STATUS OPERACIONAL DO ESTOQUE E AUDITORIA */}
              <div className="bg-[#111116] p-5 rounded-2xl border border-indigo-500/20 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold shrink-0">
                      <ShieldCheck size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-extrabold text-sm text-white">
                          Status Operacional do Estoque
                        </h3>
                        <span className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${
                          (veiculo.status_estoque || 'No Pátio') === 'No Pátio'
                            ? 'bg-blue-500/20 text-blue-300 border-blue-400/30'
                            : (veiculo.status_estoque || 'No Pátio') === 'Em Preparação'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-400/30'
                            : (veiculo.status_estoque || 'No Pátio') === 'Em Trânsito'
                            ? 'bg-purple-500/20 text-purple-300 border-purple-400/30'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                        }`}>
                          📍 {veiculo.status_estoque || 'No Pátio'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {veiculo.historicoAuditoriaStatus && veiculo.historicoAuditoriaStatus.length > 0
                          ? `Última alteração: Movido para "${veiculo.historicoAuditoriaStatus[0].statusNovo}" por ${veiculo.historicoAuditoriaStatus[0].usuarioNome} em ${veiculo.historicoAuditoriaStatus[0].dataHoraFormatada || formatarDataHoraAuditoria(veiculo.historicoAuditoriaStatus[0].dataHora)}`
                          : 'Rastreabilidade e auditoria de movimentação do pátio ativadas.'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab('auditoria')}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition flex items-center gap-1.5 self-start sm:self-center cursor-pointer shadow-xs"
                  >
                    <ShieldCheck size={14} />
                    <span>Ver Logs & Mover Status</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-[#16171f] p-3 rounded-xl border border-white/5">
                    <span className="text-[11px] text-slate-400 block font-semibold">Localização</span>
                    <strong className="text-sm font-bold text-white mt-0.5 block">{veiculo.localizacaoPatio || 'Pátio Principal'}</strong>
                  </div>
                  <div className="bg-[#16171f] p-3 rounded-xl border border-white/5">
                    <span className="text-[11px] text-slate-400 block font-semibold">Oficina Atual</span>
                    <strong className="text-sm font-bold text-slate-200 mt-0.5 block truncate" title={veiculo.fornecedorAtualNome || 'Nenhuma'}>
                      {veiculo.fornecedorAtualNome || 'Próprio Pátio'}
                    </strong>
                  </div>
                  <div className="bg-[#16171f] p-3 rounded-xl border border-white/5">
                    <span className="text-[11px] text-slate-400 block font-semibold">Entrada no Pátio</span>
                    <strong className="text-sm font-bold text-slate-200 mt-0.5 block">
                      {veiculo.dataEntradaPatio ? formatDate(veiculo.dataEntradaPatio) : formatDate(veiculo.dataEntrada)}
                    </strong>
                  </div>
                  <div className="bg-[#16171f] p-3 rounded-xl border border-white/5">
                    <span className="text-[11px] text-slate-400 block font-semibold">Registros de Auditoria</span>
                    <strong className="text-sm font-bold text-indigo-300 mt-0.5 block">
                      {veiculo.historicoAuditoriaStatus?.length || 0} alterações registradas
                    </strong>
                  </div>
                </div>
              </div>

              {/* CARD DE MARKETING & ANÚNCIOS */}
              <div className="bg-[#111116] p-5 rounded-2xl border border-pink-500/20 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-pink-600/20 border border-pink-500/30 flex items-center justify-center text-pink-400 font-bold shrink-0">
                      <Megaphone size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-extrabold text-sm text-white">
                          Marketing & Tráfego Pago do Chassi
                        </h3>
                        {anuncioAtivoVeiculo ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
                            📣 Em Campanha Ativa
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/10">
                            ⚪ Sem Campanha Ativa
                          </span>
                        )}
                        {vendaCorrespondente?.origemLead && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            🎯 Lead: {vendaCorrespondente.origemLead}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {veiculo.status === 'Vendido' || !!vendaCorrespondente
                          ? `Veículo vendido com custo de marketing registrado de ${formatCurrency(vendaCorrespondente?.despesaMarketingAplicadaPosVenda || 0)}.`
                          : 'Rastreamento de campanhas digitais e canais de atração de clientes para este veículo.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {veiculo.status !== 'Vendido' && (
                      <button
                        type="button"
                        onClick={() => handleSalvarMarketingVeiculo(!anuncioAtivoVeiculo, plataformasAnuncioVeiculo)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                          anuncioAtivoVeiculo
                            ? 'bg-pink-600/20 text-pink-300 border-pink-500/40 hover:bg-pink-600/30'
                            : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        <Megaphone size={13} />
                        <span>{anuncioAtivoVeiculo ? 'Desativar Anúncio' : 'Ativar Anúncio'}</span>
                      </button>
                    )}

                    {(veiculo.status === 'Vendido' || !!vendaCorrespondente) && (
                      <button
                        type="button"
                        onClick={handleAbrirModalMarketing}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-pink-600 hover:bg-pink-500 text-white transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Megaphone size={14} />
                        <span>Lançar Custo de Marketing</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Plataformas e Métricas */}
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-slate-400 font-semibold text-[11px]">Plataformas de Anúncio:</span>
                    {plataformasAnuncioVeiculo.length > 0 ? (
                      plataformasAnuncioVeiculo.map((plat) => (
                        <span
                          key={plat}
                          className="px-2 py-0.5 rounded-lg bg-pink-950/40 text-pink-300 border border-pink-500/20 font-medium text-[11px]"
                        >
                          {plat}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-500 text-[11px] italic">Nenhuma plataforma vinculada</span>
                    )}
                  </div>

                  {(veiculo.status === 'Vendido' || !!vendaCorrespondente) && (
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">Custo de Mkt Pós-Venda</span>
                        <strong className="text-xs font-mono font-bold text-pink-400">
                          {formatCurrency(vendaCorrespondente?.despesaMarketingAplicadaPosVenda || 0)}
                        </strong>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">Lucro Líquido Real</span>
                        <strong className={`text-xs font-mono font-bold ${
                          (vendaCorrespondente?.lucroLiquido || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          {formatCurrency(vendaCorrespondente?.lucroLiquido || 0)}
                        </strong>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Ações Rápidas de Operação */}
              <div className="p-4 bg-[#16171f] rounded-2xl border border-white/5 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-slate-400">
                  <span>Veículo cadastrado no sistema em <strong>{formatDate(veiculo.dataEntrada)}</strong> ({aging.dias} dias de estoque).</span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Service & Preparation Quick Buttons */}
                  {(veiculo.status === 'Em Preparação' || veiculo.status === 'Em Manutenção' || veiculo.status_estoque === 'Em Preparação') ? (
                    <>
                      {onOpenRetornoPatio && (
                        <button
                          type="button"
                          onClick={() => onOpenRetornoPatio(veiculo)}
                          className="px-3.5 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                          title="Confirmar retorno ao pátio e liberar veículo para venda"
                        >
                          <CheckCircle2 size={14} /> Retornar ao Pátio (1 Clique)
                        </button>
                      )}
                      {onOpenEnviarServico && (
                        <button
                          type="button"
                          onClick={() => onOpenEnviarServico(veiculo)}
                          className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                          title="Alterar etapa ou oficina no Kanban"
                        >
                          <Wrench size={14} className="text-orange-400" /> Alterar Serviço / Oficina
                        </button>
                      )}
                    </>
                  ) : (
                    veiculo.status !== 'Vendido' && veiculo.status !== 'Alugado' && onOpenEnviarServico && (
                      <button
                        type="button"
                        onClick={() => onOpenEnviarServico(veiculo)}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-orange-600/20 hover:bg-orange-600/30 text-orange-300 border border-orange-500/30 transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                        title="Enviar para Oficina, Funilaria ou Estética com sincronização no Kanban"
                      >
                        <Wrench size={14} /> Enviar para Serviço / Preparação
                      </button>
                    )
                  )}

                  {onOpenAbastecimento && (
                    <button
                      onClick={() => onOpenAbastecimento(veiculo)}
                      className="px-3.5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Fuel size={14} /> Registrar Abastecimento
                    </button>
                  )}

                  {canViewCosts && (
                    <button
                      onClick={() => onOpenNovaDespesa(veiculo)}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Plus size={14} /> Lançar Custo / Peça
                    </button>
                  )}

                  {(veiculo.status === 'Vendido' || !!vendaCorrespondente) && (
                    <button
                      type="button"
                      onClick={handleAbrirModalMarketing}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-pink-600 hover:bg-pink-500 text-white transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                      title="Atribuir custo de marketing ou tráfego pago pós-venda para este chassi"
                    >
                      <Megaphone size={14} /> <span>Lançar Custo de Marketing da Venda</span>
                    </button>
                  )}

                  {veiculo.status !== 'Vendido' && (
                    <button
                      onClick={() => onOpenVenda(veiculo)}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <DollarSign size={14} /> Registrar Venda
                    </button>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* ================= ABA 2: CRONOGRAMA & TIMELINE ================= */}
          {activeTab === 'timeline' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-[#111116] p-3.5 rounded-2xl border border-white/5 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-semibold">Status Atual</span>
                    <span className={`w-2 h-2 rounded-full ${veiculo.status === 'Alugado' ? 'bg-emerald-400 animate-pulse' : 'bg-blue-400'}`} />
                  </div>
                  <div className="mt-2">
                    <span className="text-base font-black text-white">{veiculo.status}</span>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {veiculo.status === 'Alugado' && veiculo.contratoAtivo ? veiculo.contratoAtivo.motoristaNome : `${aging.dias} dias no pátio`}
                    </p>
                  </div>
                </div>

                <div className="bg-[#111116] p-3.5 rounded-2xl border border-white/5 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-semibold">Ciclos de Locação</span>
                    <Key className="text-emerald-400" size={14} />
                  </div>
                  <div className="mt-2">
                    <span className="text-base font-black text-emerald-400 font-mono">
                      {totalLocacoes} {totalLocacoes === 1 ? 'contrato' : 'contratos'}
                    </span>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {veiculo.contratoAtivo ? '1 locação em andamento' : 'Nenhuma ativa no momento'}
                    </p>
                  </div>
                </div>

                <div className="bg-[#111116] p-3.5 rounded-2xl border border-white/5 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-semibold">Manutenções</span>
                    <Wrench className="text-amber-400" size={14} />
                  </div>
                  <div className="mt-2">
                    <span className="text-base font-black text-amber-400 font-mono">
                      {totalManutencoes} registradas
                    </span>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Última rev: {formatKm(veiculo.kmUltimaRevisao)}
                    </p>
                  </div>
                </div>

                <div className="bg-[#111116] p-3.5 rounded-2xl border border-white/5 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-semibold">Odômetro Atual</span>
                    <Gauge className="text-indigo-400" size={14} />
                  </div>
                  <div className="mt-2">
                    <span className="text-base font-black text-indigo-300 font-mono">
                      {formatKm(veiculo.kmAtual)}
                    </span>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Entrada: {formatDate(veiculo.dataEntrada)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Filter Bar & Sort Controls */}
              <div className="bg-[#111116] p-3 rounded-2xl border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
                  <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1 mr-1">
                    <Filter size={12} /> Filtrar:
                  </span>
                  <button
                    onClick={() => setTimelineFilter('todos')}
                    className={`px-3 py-1 rounded-xl font-semibold transition cursor-pointer ${
                      timelineFilter === 'todos'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    Todos ({timelineEventos.length})
                  </button>
                  <button
                    onClick={() => setTimelineFilter('locacao')}
                    className={`px-3 py-1 rounded-xl font-semibold transition flex items-center gap-1 cursor-pointer ${
                      timelineFilter === 'locacao'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white/5 text-slate-400 hover:text-emerald-300'
                    }`}
                  >
                    <Key size={12} /> Locações & Devoluções
                  </button>
                  <button
                    onClick={() => setTimelineFilter('manutencao')}
                    className={`px-3 py-1 rounded-xl font-semibold transition flex items-center gap-1 cursor-pointer ${
                      timelineFilter === 'manutencao'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-white/5 text-slate-400 hover:text-amber-300'
                    }`}
                  >
                    <Wrench size={12} /> Manutenções & Revisões
                  </button>
                  <button
                    onClick={() => setTimelineFilter('status')}
                    className={`px-3 py-1 rounded-xl font-semibold transition flex items-center gap-1 cursor-pointer ${
                      timelineFilter === 'status'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'bg-white/5 text-slate-400 hover:text-purple-300'
                    }`}
                  >
                    <Activity size={12} /> Status & Pátio
                  </button>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
                    className="text-[11px] font-semibold text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-2.5 py-1.5 rounded-xl transition flex items-center gap-1 cursor-pointer"
                    title="Inverter ordenação cronológica"
                  >
                    <Clock size={12} />
                    {sortOrder === 'desc' ? 'Mais recentes primeiro' : 'Mais antigos primeiro'}
                  </button>
                </div>
              </div>

              {/* The Visual Timeline Tree */}
              <div className="bg-[#111116] p-6 rounded-2xl border border-white/5 space-y-6">
                {filteredTimeline.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-white/10 rounded-xl space-y-2">
                    <p>Nenhum registro encontrado para o filtro selecionado.</p>
                    <button
                      onClick={() => setTimelineFilter('todos')}
                      className="text-blue-400 hover:underline font-semibold cursor-pointer"
                    >
                      Limpar filtros
                    </button>
                  </div>
                ) : (
                  <div className="relative pl-6 sm:pl-8 space-y-8 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-blue-500 before:via-white/10 before:to-slate-800">
                    {filteredTimeline.map((evento, index) => {
                      const badge = getEventBadge(evento.tipo);
                      const IconComponent = badge.icon;

                      return (
                        <div key={evento.id || index} className="relative group">
                          {/* Node Icon on Timeline Line */}
                          <div className={`absolute -left-6 sm:-left-8 top-1 w-7 h-7 rounded-xl border flex items-center justify-center transition-transform group-hover:scale-110 shadow-md ${badge.bg} ${badge.border} ${badge.text}`}>
                            <IconComponent size={14} />
                          </div>

                          {/* Event Card Container */}
                          <div className="bg-[#16171f] hover:bg-[#1a1b24] p-4 rounded-2xl border border-white/5 hover:border-white/15 transition space-y-2.5">
                            {/* Card Top Row: Type, Status Result, Date */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${badge.bg} ${badge.text} ${badge.border} flex items-center gap-1`}>
                                  <IconComponent size={11} /> {badge.label}
                                </span>

                                {evento.statusResultante && (
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadgeColor(evento.statusResultante)}`}>
                                    Status: {evento.statusResultante}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 text-xs text-slate-400">
                                <span className="font-mono text-slate-300 font-semibold flex items-center gap-1">
                                  <Calendar size={12} className="text-slate-500" />
                                  {formatDate(evento.data)}
                                </span>
                                <span className="text-[11px] text-slate-500">
                                  ({calculateDaysAgo(evento.data)})
                                </span>
                              </div>
                            </div>

                            {/* Title and Description */}
                            <div>
                              <h4 className="font-bold text-sm text-white flex items-center gap-2">
                                {evento.titulo}
                              </h4>
                              {evento.descricao && (
                                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                                  {evento.descricao}
                                </p>
                              )}
                            </div>

                            {/* Badges / Metadata Details Row */}
                            <div className="flex items-center gap-3 flex-wrap pt-2 border-t border-white/5 text-xs text-slate-400">
                              {evento.km !== undefined && (
                                <span className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-lg border border-white/5 text-slate-300">
                                  <Gauge size={12} className="text-indigo-400" />
                                  <strong>{formatKm(evento.km)}</strong>
                                </span>
                              )}

                              {evento.motoristaNome && (
                                <span className="flex items-center gap-1 bg-emerald-500/10 text-emerald-300 px-2 py-1 rounded-lg border border-emerald-500/20">
                                  <UserCheck size={12} className="text-emerald-400" />
                                  Motorista: <strong>{evento.motoristaNome}</strong>
                                </span>
                              )}

                              {evento.fornecedorOficina && (
                                <span className="flex items-center gap-1 bg-amber-500/10 text-amber-300 px-2 py-1 rounded-lg border border-amber-500/20">
                                  <Building size={12} className="text-amber-400" />
                                  Oficina: <strong>{evento.fornecedorOficina}</strong>
                                </span>
                              )}

                              {evento.valor !== undefined && evento.valor > 0 && (
                                <span className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-lg border border-white/5 text-slate-200">
                                  <DollarSign size={12} className="text-emerald-400" />
                                  Valor: <strong>{formatCurrencyDetailed(evento.valor)}</strong>
                                </span>
                              )}

                              {evento.usuarioRegistro && (
                                <span className="text-[10px] text-slate-500 ml-auto">
                                  Reg por: {evento.usuarioRegistro}
                                </span>
                              )}
                            </div>

                            {/* Additional notes if any */}
                            {evento.observacoes && (
                              <div className="p-2 rounded-lg bg-black/30 border border-white/5 text-[11px] text-slate-400 italic">
                                "{evento.observacoes}"
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= ABA 3: CUSTOS & DESPESAS DO CHASSI ================= */}
          {activeTab === 'custos' && (
            <div className="space-y-6 animate-fadeIn">
              {/* 1. Raio-X Financeiro do Chassi */}
              <div className="bg-[#111116] p-5 rounded-2xl border border-white/5 space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div>
                    <h3 className="font-bold text-base text-white flex items-center gap-2">
                      <Receipt className="text-blue-400" size={18} />
                      Dossiê de Custos do Chassi
                    </h3>
                    <p className="text-xs text-slate-400">
                      Cálculo contábil: <code className="text-slate-300">Custo_Final = Preço_Compra + (Peças + MãoDeObra + IPVA + Frete)</code>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {onOpenAbastecimento && (
                      <button
                        onClick={() => onOpenAbastecimento(veiculo)}
                        className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black text-xs font-black px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                      >
                        <Fuel size={14} /> Registrar Abastecimento
                      </button>
                    )}
                    <button
                      onClick={() => onOpenNovaDespesa(veiculo)}
                      className="bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                    >
                      <Plus size={14} /> Adicionar Despesa
                    </button>
                  </div>
                </div>

                {/* Formula Block */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-[#16171f] p-4 rounded-xl border border-white/5">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase">1. Valor de Aquisição</span>
                    <p className="text-xl font-bold text-white mt-1">{formatCurrency(veiculo.custoAquisicao)}</p>
                    <span className="text-[10px] text-slate-500">Entrada: {formatDate(veiculo.dataEntrada)}</span>
                  </div>

                  <div className="bg-[#16171f] p-4 rounded-xl border border-orange-500/20">
                    <span className="text-[11px] font-semibold text-orange-400 uppercase">2. Preparação / Despesas</span>
                    <p className="text-xl font-bold text-orange-400 mt-1">+{formatCurrency(totalDespesas)}</p>
                    <span className="text-[10px] text-orange-400/80 font-medium">{veiculo.despesas?.length || 0} lançamentos vinculados</span>
                  </div>

                  <div className="bg-[#16171f] p-4 rounded-xl border border-blue-500/20">
                    <span className="text-[11px] font-semibold text-blue-400 uppercase">3. Custo Total Consolidado</span>
                    <p className="text-2xl font-black text-blue-400 mt-1">{formatCurrency(custoFinal)}</p>
                    <span className="text-[10px] text-blue-400/80 font-medium">Ponto de Equilíbrio (Break-even)</span>
                  </div>
                </div>

                {/* Category breakdown tags */}
                {Object.keys(despesasPorCategoria).length > 0 && (
                  <div className="pt-2">
                    <p className="text-xs font-semibold text-slate-400 mb-2">Composição das Despesas por Categoria:</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(despesasPorCategoria).map(([cat, val]) => (
                        <div key={cat} className="bg-[#16171f] border border-white/5 px-3 py-1 rounded-lg text-xs flex items-center gap-2">
                          <span className="text-slate-400">{cat}:</span>
                          <strong className="text-slate-200">{formatCurrency(val as number)}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Timeline de Despesas e Manutenções */}
              <div className="bg-[#111116] p-5 rounded-2xl border border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    <Wrench className="text-slate-400" size={16} />
                    Histórico & Lançamentos Financeiros Vinculados a este Chassi
                  </h3>
                  <span className="text-xs text-slate-400 font-medium">
                    {veiculo.despesas?.length || 0} registros
                  </span>
                </div>

                {(!veiculo.despesas || veiculo.despesas.length === 0) ? (
                  <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-white/10 rounded-xl space-y-2">
                    <p>Nenhuma despesa ou custo lançado para este chassi até o momento.</p>
                    <button
                      onClick={() => onOpenNovaDespesa(veiculo)}
                      className="text-orange-400 hover:underline font-semibold cursor-pointer"
                    >
                      + Lançar primeiro custo de oficina
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {veiculo.despesas.map((desp, index) => (
                      <div
                        key={desp.id || index}
                        className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                          isCategoriaRepasseDistribuicao(desp.categoria)
                            ? 'bg-fuchsia-950/20 border-fuchsia-500/30 hover:border-fuchsia-500/50'
                            : desp.categoria === 'Comissão'
                            ? 'bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40'
                            : 'bg-[#16171f] border-white/5 hover:border-white/10'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1 ${
                              isCategoriaRepasseDistribuicao(desp.categoria)
                                ? 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40'
                                : desp.categoria === 'Comissão'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : desp.categoria === 'Combustível'
                                ? 'bg-orange-500/20 text-orange-300 border-orange-500/40'
                                : desp.categoria === 'Anúncio Patrocinado (Meta/Google Ads)'
                                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 font-bold'
                                : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                            }`}>
                              {desp.categoria === 'Anúncio Patrocinado (Meta/Google Ads)' && <span>🚀</span>}
                              {desp.categoria === 'Combustível' && <Fuel size={12} className="text-orange-400" />}
                              {isCategoriaRepasseDistribuicao(desp.categoria) && <span>🤝</span>}
                              {desp.categoria === 'Comissão' && <span>⭐</span>}
                              {desp.categoria}
                            </span>
                            {desp.litrosAbastecidos !== undefined && desp.litrosAbastecidos > 0 && (
                              <span className="text-[10px] bg-orange-500/10 text-orange-300 border border-orange-500/20 px-1.5 py-0.2 rounded font-mono font-bold">
                                ⛽ {desp.litrosAbastecidos} L {desp.tipoCombustivelAbastecido ? `(${desp.tipoCombustivelAbastecido})` : ''}
                              </span>
                            )}
                            {desp.kmAbastecimento !== undefined && desp.kmAbastecimento > 0 && (
                              <span className="text-[10px] bg-blue-500/10 text-blue-300 border border-blue-500/20 px-1.5 py-0.2 rounded font-mono">
                                ⏱️ {desp.kmAbastecimento.toLocaleString('pt-BR')} km
                              </span>
                            )}
                            {desp.motivoSaidaAbastecimento && (
                              <span className="text-[10px] bg-slate-800 text-slate-300 border border-white/10 px-1.5 py-0.2 rounded">
                                Motivo: {desp.motivoSaidaAbastecimento}
                              </span>
                            )}
                            {isCategoriaRepasseDistribuicao(desp.categoria) && (
                              <span className="text-[10px] text-fuchsia-400/90 font-medium bg-fuchsia-500/10 px-2 py-0.5 rounded border border-fuchsia-500/20">
                                ℹ️ Repasse pós-lucro (Não entra no custo de oficina)
                              </span>
                            )}
                            <span className="text-xs text-slate-400">
                              {formatDate(desp.data)}
                            </span>
                            {desp.nfNumero && (
                              <span className="text-[10px] font-mono text-slate-300 bg-white/5 border border-white/10 px-1.5 py-0.2 rounded">
                                {desp.nfNumero}
                              </span>
                            )}
                            {desp.tipoComissaoOrigem === 'automatica_venda' && (
                              <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.2 rounded font-medium">
                                ⚡ Venda Automática
                              </span>
                            )}
                            {/* Badges de Parcelamento e Restante Vinculado */}
                            {desp.tipoVinculo === 'entrada' && (
                              <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                                🟢 Entrada / Sinal
                              </span>
                            )}
                            {desp.tipoVinculo === 'restante' && (
                              <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                                🟡 Restante do Pagamento
                              </span>
                            )}
                            {desp.tipoVinculo === 'parcela' && (
                              <span className="text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                                💳 Parcela {desp.parcelaNumero}/{desp.totalParcelas}
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-semibold text-slate-200">
                            {desp.descricao}
                          </p>
                          <div className="flex items-center gap-3 text-[11px] text-slate-400 flex-wrap">
                            {desp.despesaOrigemDescricao && (
                              <span className="text-amber-400/90 font-medium flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                <Link2 size={11} className="text-amber-400" />
                                Vinculada a: <strong>{desp.despesaOrigemDescricao}</strong>
                              </span>
                            )}
                            {desp.valorTotalAcordo !== undefined && desp.valorTotalAcordo > 0 && (
                              <span className="text-slate-300 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                                Acordo Total: <strong className="text-white font-mono">{formatCurrencyDetailed(desp.valorTotalAcordo)}</strong>
                              </span>
                            )}
                            <span>
                              {desp.categoria === 'Comissão' ? 'Beneficiário / Vendedor:' : desp.categoria === 'Combustível' ? 'Posto de Combustível:' : 'Fornecedor:'}{' '}
                              <strong className="text-slate-300">{desp.beneficiarioNome || desp.fornecedor}</strong>
                            </span>
                            {desp.responsavelAbastecimento && (
                              <span>
                                Motorista/Resp: <strong className="text-slate-300">{desp.responsavelAbastecimento}</strong>
                              </span>
                            )}
                            {desp.valorPorLitro !== undefined && desp.valorPorLitro > 0 && (
                              <span className="text-slate-400">
                                Preço/L: <strong className="text-slate-300 font-mono">R$ {desp.valorPorLitro.toFixed(2)}</strong>
                              </span>
                            )}
                            {desp.formaPagamento && desp.statusPagamento === 'Pago' && (
                              <span className="text-emerald-400/90 text-[10px]">
                                • Pago via {desp.formaPagamento} em {formatDate(desp.dataPagamento || desp.data)}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-center flex-wrap">
                          <div className="text-right">
                            <span className={`font-bold text-sm font-mono ${desp.categoria === 'Comissão' ? 'text-amber-300' : 'text-slate-200'}`}>
                              {formatCurrencyDetailed(desp.valor)}
                            </span>
                            <span className={`block text-[10px] font-bold ${desp.statusPagamento === 'Pago' ? 'text-emerald-400' : 'text-amber-400'}`}>
                              {desp.statusPagamento === 'Pago' ? '✓ Pago' : '⏳ Pendente'}
                            </span>
                          </div>

                          {/* Botão de Quitação Rápida para Admin */}
                          {desp.statusPagamento === 'Pendente' && canViewCosts && (
                            <button
                              onClick={() => handleQuitarDespesaDirect(desp.id)}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 transition flex items-center gap-1 cursor-pointer"
                              title="Registrar pagamento e dar baixa agora"
                            >
                              <CheckCircle2 size={13} /> Quitar
                            </button>
                          )}

                          {/* Botão de Lançar Restante Vinculado */}
                          {canViewCosts && desp.tipoVinculo !== 'restante' && desp.tipoCondicao !== 'parcelado' && (
                            <button
                              onClick={() => onOpenNovaDespesa(veiculo, desp)}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition flex items-center gap-1 cursor-pointer"
                              title="Lançar o restante do pagamento vinculado a este custo"
                            >
                              <Link2 size={12} />
                              <span className="hidden sm:inline">+ Restante</span>
                            </button>
                          )}

                          {/* Botão de Editar Despesa */}
                          {canViewCosts && (
                            <button
                              onClick={() => {
                                if (onEditDespesa) {
                                  onEditDespesa(veiculo, desp);
                                } else {
                                  onOpenNovaDespesa(veiculo);
                                }
                              }}
                              className="text-slate-400 hover:text-blue-400 p-1.5 rounded-lg bg-white/5 hover:bg-blue-500/10 border border-transparent hover:border-blue-500/20 transition cursor-pointer"
                              title="Editar despesa / comissão"
                            >
                              <Edit2 size={14} />
                            </button>
                          )}

                          {/* Botão de Excluir */}
                          {canViewCosts && (
                            <button
                              onClick={() => onDeleteDespesa(veiculo.id, desp.id)}
                              className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition cursor-pointer"
                              title="Excluir despesa"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. Simulador de Preço de Venda & Margem Líquida */}
              <div className="bg-[#111116] text-white p-6 rounded-2xl border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="text-amber-400" size={18} />
                    <h3 className="font-bold text-sm text-white">Simulador de Margem & Preço de Venda</h3>
                  </div>
                  <span className="text-xs text-slate-400">
                    Fipe Ref: <strong className="text-slate-200">{formatCurrency(veiculo.valorFipe || 0)}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                  <div>
                    <label className="block text-xs text-slate-400 font-semibold mb-1">
                      Preço Pretendido de Venda (R$)
                    </label>
                    <input
                      type="number"
                      step="500"
                      value={simuladorPreco}
                      onChange={(e) => setSimuladorPreco(Number(e.target.value))}
                      className="w-full bg-[#16171f] border border-white/10 text-white px-3 py-2 rounded-xl text-lg font-bold font-mono focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div className="bg-[#16171f] p-3.5 rounded-xl border border-white/5 text-center">
                    <span className="text-[11px] text-slate-400 block">Lucro Projetado</span>
                    <strong className={`text-xl font-bold font-mono ${lucroEstimado >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {formatCurrency(lucroEstimado)}
                    </strong>
                  </div>

                  <div className="bg-[#16171f] p-3.5 rounded-xl border border-white/5 text-center">
                    <span className="text-[11px] text-slate-400 block">Margem s/ Custo Total</span>
                    <strong className={`text-xl font-bold font-mono ${margemPercentual >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {margemPercentual.toFixed(1)}%
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= ABA 4: DRE INDIVIDUAL POR CHASSI ================= */}
          {activeTab === 'dre_chassi' && (() => {
            const isVendidoOperacao = veiculo.status === 'Vendido' || !!vendaCorrespondente;
            const receitaRealOuPrevista = vendaCorrespondente?.valorVenda || precoVendaAtual;
            const custoCompraEfetivo = vendaCorrespondente?.valorCompra || veiculo.custoAquisicao;
            const custosOficinaEfetivo = vendaCorrespondente?.totalDespesas ?? totalDespesas;
            const mktPosVenda = vendaCorrespondente?.despesaMarketingAplicadaPosVenda || 0;
            const comissaoEfetiva = vendaCorrespondente?.comissaoValor || 0;

            const lucroBrutoRealizado = receitaRealOuPrevista - custoCompraEfetivo - custosOficinaEfetivo;
            const lucroLiquidoRealizado = vendaCorrespondente?.lucroLiquido !== undefined
              ? vendaCorrespondente.lucroLiquido
              : (lucroBrutoRealizado - mktPosVenda - comissaoEfetiva);

            const margemLiquidaRealizada = (custoCompraEfetivo + custosOficinaEfetivo) > 0
              ? (lucroLiquidoRealizado / (custoCompraEfetivo + custosOficinaEfetivo)) * 100
              : 0;

            return (
              <div className="space-y-6 animate-fadeIn">
                <div className="bg-[#111116] p-6 rounded-2xl border border-white/5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
                    <div>
                      <h3 className="font-bold text-base text-white flex items-center gap-2">
                        <TrendingUp className="text-emerald-400" size={18} />
                        Demonstrativo de Resultado Unitário (DRE por Chassi)
                      </h3>
                      <p className="text-xs text-slate-400">
                        {isVendidoOperacao 
                          ? 'DRE definitivo com apuração pós-venda, custos diretos, tráfego pago e comissão protegida.'
                          : 'Extrato contábil projetado com apuração de receitas, custos diretos e margem de contribuição.'}
                      </p>
                    </div>

                    {isVendidoOperacao && (
                      <button
                        type="button"
                        onClick={handleAbrirModalMarketing}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-pink-600 hover:bg-pink-500 text-white transition flex items-center gap-1.5 cursor-pointer shadow-xs self-start sm:self-center"
                      >
                        <Megaphone size={14} />
                        <span>Lançar Custo de Marketing</span>
                      </button>
                    )}
                  </div>

                  {/* DRE Rows */}
                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between py-2 border-b border-white/5 font-semibold">
                      <span className="text-slate-300 flex items-center gap-1.5">
                        <span>Receita Bruta {isVendidoOperacao ? 'Realizada' : 'Projetada'}</span>
                        {isVendidoOperacao && <span className="text-[10px] text-emerald-400 font-mono">(Venda)</span>}
                      </span>
                      <span className="font-mono text-emerald-400 font-bold">{formatCurrency(receitaRealOuPrevista)}</span>
                    </div>

                    <div className="flex justify-between py-2 border-b border-white/5 font-semibold text-slate-400">
                      <span>(-) Custo de Aquisição (Compra da Loja)</span>
                      <span className="font-mono text-rose-400">-{formatCurrency(custoCompraEfetivo)}</span>
                    </div>

                    <div className="flex justify-between py-2 border-b border-white/5 font-semibold text-slate-400">
                      <span>(-) Custos de Preparação, Funilaria, Peças e Oficina</span>
                      <span className="font-mono text-rose-400">-{formatCurrency(custosOficinaEfetivo)}</span>
                    </div>

                    <div className="flex justify-between py-2.5 border-t border-b border-white/10 font-bold text-xs bg-white/5 px-3 rounded-lg">
                      <span className="text-slate-200">(=) Lucro Bruto do Veículo</span>
                      <span className={`font-mono ${lucroBrutoRealizado >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatCurrency(lucroBrutoRealizado)}
                      </span>
                    </div>

                    {isVendidoOperacao && (
                      <>
                        <div className="flex justify-between items-center py-2 border-b border-white/5 font-semibold text-slate-300">
                          <div className="flex flex-col">
                            <span className="flex items-center gap-1.5 text-pink-300">
                              <Megaphone size={13} className="text-pink-400" />
                              (-) Despesa de Marketing & Tráfego Pago Pós-Venda
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Atribuído ao chassi ({vendaCorrespondente?.origemLead || 'Campanhas'}) • Não afeta comissão dos vendedores
                            </span>
                          </div>
                          <span className={`font-mono font-bold ${mktPosVenda > 0 ? 'text-pink-400' : 'text-slate-400'}`}>
                            {mktPosVenda > 0 ? `-${formatCurrency(mktPosVenda)}` : 'R$ 0,00'}
                          </span>
                        </div>

                        <div className="flex justify-between items-center py-2 border-b border-white/5 font-semibold text-slate-300">
                          <div className="flex flex-col">
                            <span className="flex items-center gap-1.5 text-amber-300">
                              <Shield size={13} className="text-amber-400" />
                              (-) Comissões da Equipe de Vendas
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Comissão contratual fixada no fechamento da venda • 100% protegida
                            </span>
                          </div>
                          <span className="font-mono font-bold text-amber-400">
                            -{formatCurrency(comissaoEfetiva)}
                          </span>
                        </div>
                      </>
                    )}

                    <div className="flex justify-between py-3 border-t-2 border-white/10 font-bold text-sm bg-black/40 p-3 rounded-xl mt-2">
                      <div className="flex flex-col">
                        <span className="text-white">
                          (=) Lucro Líquido Real da Operação
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          {isVendidoOperacao
                            ? 'Resultado contábil após dedução de marketing atribuído e comissões'
                            : 'Resultado preliminar projetado da venda'}
                        </span>
                      </div>
                      <span className={`font-mono text-base font-black ${lucroLiquidoRealizado >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatCurrency(lucroLiquidoRealizado)} ({margemLiquidaRealizada.toFixed(1)}%)
                      </span>
                    </div>
                  </div>

                  {/* Informational Accounting Rule Box */}
                  {isVendidoOperacao && (
                    <div className="p-3.5 bg-pink-950/20 border border-pink-500/20 rounded-xl text-xs text-pink-200/90 flex items-start gap-2.5">
                      <Shield size={16} className="text-pink-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-pink-300 font-bold block mb-0.5">
                          Regra de Contabilidade & Atribuição de Tráfego:
                        </strong>
                        O valor de tráfego pago lançado neste chassi (<strong>{formatCurrency(mktPosVenda)}</strong>) é descontado unicamente do <strong>Lucro Líquido Real da Operação</strong> e entra no DRE geral da empresa. A comissão dos vendedores ({formatCurrency(comissaoEfetiva)}) foi mantida e fixada pelo fechamento da venda.
                      </div>
                    </div>
                  )}

                  {/* Quadro Detalhado de Comissões por Regra / Usuário */}
                  {isVendidoOperacao && vendaCorrespondente?.comissoesDetalhadas && vendaCorrespondente.comissoesDetalhadas.length > 0 && (
                    <div className="mt-4 p-4 rounded-xl bg-[#16171f] border border-amber-500/20 space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-white/5">
                        <div className="flex items-center gap-2">
                          <Shield size={15} className="text-amber-400" />
                          <h4 className="font-bold text-xs text-white">Comissões Detalhadas da Venda por Beneficiário</h4>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          {vendaCorrespondente.comissoesDetalhadas.length} item(ns) auditados
                        </span>
                      </div>

                      <div className="space-y-2">
                        {vendaCorrespondente.comissoesDetalhadas.map((comItem) => (
                          <div
                            key={comItem.id}
                            className="p-2.5 rounded-lg bg-black/40 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-200">{comItem.usuarioNome}</span>
                                {comItem.beneficiarioPapel && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/5 text-slate-400">
                                    {comItem.beneficiarioPapel}
                                  </span>
                                )}
                                {comItem.isento && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300">
                                    Isento nesta venda
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                Base: <strong className="text-slate-300">{comItem.tipoBase}</strong> • Regra: {comItem.formato === 'Percentual' ? `${comItem.valorOrPercentual}%` : formatCurrency(comItem.valorOrPercentual)}
                                {comItem.baseCalculo !== undefined && comItem.baseCalculo > 0 && ` (Base: ${formatCurrency(comItem.baseCalculo)})`}
                                {comItem.condicaoGatilho && comItem.condicaoGatilho !== 'Sempre' && ` • Gatilho: ${comItem.condicaoGatilho}`}
                              </p>
                            </div>

                            <div className="flex sm:flex-col items-end justify-between sm:justify-center">
                              <span className={`font-mono font-bold ${comItem.isento ? 'text-slate-500 line-through' : 'text-amber-400'}`}>
                                {formatCurrency(comItem.valorCalculado)}
                              </span>
                              <div className="flex items-center gap-1.5 text-[10px] mt-0.5">
                                <span className={`px-1.5 py-0.2 rounded font-mono ${
                                  comItem.statusLiberacao === 'Liberada_Para_Pagamento'
                                    ? 'bg-emerald-500/10 text-emerald-400'
                                    : 'bg-amber-500/10 text-amber-400'
                                }`}>
                                  {comItem.statusLiberacao === 'Liberada_Para_Pagamento' ? 'Liberada' : 'Aguardando'}
                                </span>
                                <span className={`px-1.5 py-0.2 rounded font-mono ${
                                  comItem.statusPagamento === 'Pago'
                                    ? 'bg-blue-500/10 text-blue-400'
                                    : 'bg-slate-500/10 text-slate-400'
                                }`}>
                                  {comItem.statusPagamento || comItem.status || 'Pendente'}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* ================= ABA 5: AUDITORIA DE STATUS DO ESTOQUE ================= */}
          {activeTab === 'auditoria' && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Feedback toast/banner */}
              {statusFeedbackMsg && (
                <div className="p-4 bg-emerald-950/50 border border-emerald-500/50 rounded-2xl text-emerald-200 text-xs font-bold flex items-center gap-2.5 shadow-lg animate-bounce">
                  <ShieldCheck size={18} className="text-emerald-400 shrink-0" />
                  <span>{statusFeedbackMsg}</span>
                </div>
              )}

              {/* CARD PRINCIPAL DE STATUS ATUAL & OPERADOR LOGADO */}
              <div className="bg-gradient-to-r from-indigo-950/30 via-[#111116] to-[#111116] p-6 rounded-2xl border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-900/30 shrink-0">
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-base text-white">Log de Auditoria de Status</h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30 uppercase">
                        Rastreabilidade Ativa
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Registro imutável de transições de status de estoque, data/hora e identificação do usuário responsável.
                    </p>
                  </div>
                </div>

                <div className="bg-[#16171f] px-4 py-2.5 rounded-xl border border-white/5 flex items-center gap-3">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Status de Estoque Vigente</span>
                    <strong className="text-sm font-black text-indigo-300 font-mono">
                      {veiculo.status_estoque || (veiculo.status === 'Em Preparação' ? 'Em Preparação' : 'No Pátio')}
                    </strong>
                  </div>
                  <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-ping" />
                </div>
              </div>

              {/* FORMULÁRIO DE MOVIMENTAÇÃO COM REGISTRO DE AUDITORIA */}
              <div className="bg-[#111116] p-6 rounded-2xl border border-white/10 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <h4 className="font-bold text-sm text-white flex items-center gap-2">
                    <RotateCcw size={16} className="text-indigo-400" />
                    <span>Mover Veículo / Alterar Status de Estoque</span>
                  </h4>
                  <span className="text-xs text-slate-400">
                    Operador Atual: <strong className="text-slate-200">{currentUser?.displayName || 'Administrador'}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-slate-300 font-bold mb-1.5">
                      Novo Status de Estoque
                    </label>
                    <select
                      value={novoStatusEstoqueInput}
                      onChange={(e) => setNovoStatusEstoqueInput(e.target.value as StatusEstoque)}
                      className="w-full bg-[#16171f] border border-white/10 text-white px-3 py-2.5 rounded-xl text-xs font-bold outline-none focus:border-indigo-500"
                    >
                      <option value="No Pátio">📍 No Pátio (Disponível no Showroom)</option>
                      <option value="Em Trânsito">🚚 Em Trânsito (Cegonha / Transferência)</option>
                      <option value="Em Preparação">🔧 Em Preparação (Oficina / Estética)</option>
                      <option value="Vendido">🤝 Vendido (Processo Comercial Concluído)</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs text-slate-300 font-bold mb-1.5">
                      Motivo / Justificativa da Movimentação (Opcional)
                    </label>
                    <input
                      type="text"
                      value={motivoMudancaStatusInput}
                      onChange={(e) => setMotivoMudancaStatusInput(e.target.value)}
                      placeholder="Ex: Chegada da transportadora, encaminhado para polimento, etc."
                      className="w-full bg-[#16171f] border border-white/10 text-white px-3.5 py-2.5 rounded-xl text-xs outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Ações Rápidas de Transição */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] text-slate-400 font-semibold mr-1">Atalhos:</span>
                    <button
                      type="button"
                      onClick={() => handleExecutarMudancaStatus('No Pátio', 'Veículo alocado e disponível no pátio da loja')}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 transition cursor-pointer"
                    >
                      📍 Mover para No Pátio
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExecutarMudancaStatus('Em Trânsito', 'Veículo despachado / em trânsito de transporte')}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/30 transition cursor-pointer"
                    >
                      🚚 Mover para Em Trânsito
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExecutarMudancaStatus('Em Preparação', 'Veículo enviado para revisão / preparação')}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-500/30 transition cursor-pointer"
                    >
                      🔧 Mover para Em Preparação
                    </button>

                    {onOpenEnviarServico && (
                      <button
                        type="button"
                        onClick={() => onOpenEnviarServico(veiculo)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-black bg-orange-600 hover:bg-orange-500 text-white transition cursor-pointer flex items-center gap-1 shadow-sm"
                      >
                        <Wrench size={12} /> Envio Completo c/ Kanban
                      </button>
                    )}

                    {onOpenRetornoPatio && (veiculo.status === 'Em Preparação' || veiculo.status === 'Em Manutenção' || veiculo.status_estoque === 'Em Preparação') && (
                      <button
                        type="button"
                        onClick={() => onOpenRetornoPatio(veiculo)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-black bg-emerald-600 hover:bg-emerald-500 text-white transition cursor-pointer flex items-center gap-1 shadow-sm"
                      >
                        <CheckCircle2 size={12} /> Retorno 1-Clique
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleExecutarMudancaStatus()}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/30 flex items-center gap-2 transition cursor-pointer active:scale-95 ml-auto"
                  >
                    <Check size={15} />
                    <span>Salvar & Registrar na Auditoria</span>
                  </button>
                </div>
              </div>

              {/* LISTA COMPLETA DOS LOGS DE AUDITORIA */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Clock size={14} className="text-slate-400" />
                    <span>Histórico Cronológico de Auditoria ({veiculo.historicoAuditoriaStatus?.length || 0})</span>
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Ordenado por registros mais recentes
                  </span>
                </div>

                {(!veiculo.historicoAuditoriaStatus || veiculo.historicoAuditoriaStatus.length === 0) ? (
                  <div className="p-8 text-center bg-[#111116] rounded-2xl border border-white/5 space-y-3">
                    <ShieldCheck size={36} className="mx-auto text-slate-600" />
                    <p className="text-sm font-semibold text-slate-300">
                      Nenhuma movimentação manual de estoque registrada ainda
                    </p>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      O veículo está atualmente com status inicial <strong>"{veiculo.status_estoque || (veiculo.status === 'Em Preparação' ? 'Em Preparação' : 'No Pátio')}"</strong>. 
                      Qualquer mudança realizada pelo painel acima será devidamente auditada com usuário, data e hora.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleExecutarMudancaStatus(
                        (veiculo.status_estoque || 'No Pátio') as StatusEstoque,
                        'Registro de marco inicial de auditoria'
                      )}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10 transition cursor-pointer"
                    >
                      Inicializar Marco de Auditoria
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {veiculo.historicoAuditoriaStatus.map((log, index) => {
                      const isFirst = index === 0;
                      return (
                        <div
                          key={log.id || `audit-${index}`}
                          className={`p-4 rounded-2xl border transition-all ${
                            isFirst
                              ? 'bg-[#16171f] border-indigo-500/40 shadow-md'
                              : 'bg-[#111116] border-white/5 hover:border-white/10'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-white/5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs px-2 py-0.5 rounded-lg font-bold bg-slate-800 text-slate-300 border border-white/10">
                                {log.statusAnterior || 'Inicial'}
                              </span>
                              <ArrowRight size={14} className="text-slate-500" />
                              <span className={`text-xs px-2.5 py-0.5 rounded-lg font-bold border ${
                                log.statusNovo === 'No Pátio'
                                  ? 'bg-blue-500/20 text-blue-300 border-blue-400/30'
                                  : log.statusNovo === 'Em Preparação'
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-400/30'
                                  : log.statusNovo === 'Em Trânsito'
                                  ? 'bg-purple-500/20 text-purple-300 border-purple-400/30'
                                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                              }`}>
                                {log.statusNovo}
                              </span>

                              {isFirst && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 uppercase tracking-wide">
                                  Última Movimentação
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 text-xs text-slate-400">
                              <span className="text-[11px] font-mono bg-white/5 px-2 py-0.5 rounded-md text-slate-300">
                                {log.dataHoraFormatada || formatarDataHoraAuditoria(log.dataHora)}
                              </span>
                              <span className="text-[10px] text-slate-500 border border-white/5 px-2 py-0.5 rounded-md">
                                {log.origemModulo || 'Estoque'}
                              </span>
                            </div>
                          </div>

                          <div className="pt-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                            <div className="space-y-1">
                              <p className="text-slate-200 font-semibold">
                                Movido de <strong className="text-white">"{log.statusAnterior || 'Inicial'}"</strong> para <strong className="text-indigo-300">"{log.statusNovo}"</strong> por <strong className="text-white">{log.usuarioNome}</strong> na data <span className="text-slate-300">{log.dataHoraFormatada || formatarDataHoraAuditoria(log.dataHora)}</span>.
                              </p>
                              {log.motivoObservacao && (
                                <p className="text-slate-400 text-xs italic bg-black/30 px-3 py-1.5 rounded-xl border border-white/5 inline-block">
                                  "{log.motivoObservacao}"
                                </p>
                              )}
                            </div>

                            {log.usuarioRole && (
                              <span className="text-[10px] font-bold text-slate-400 bg-white/5 px-2 py-1 rounded-lg shrink-0 self-start sm:self-center">
                                Perfil: {log.usuarioRole}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ================= ABA: TEST DRIVE & TERMOS DE RESPONSABILIDADE ================= */}
          {activeTab === 'test_drive' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Header Banner */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-950/40 via-[#16171f] to-[#16171f] border border-blue-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center font-bold text-xl shrink-0">
                    <Compass size={24} />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-white flex items-center gap-2">
                      <span>Controle de Test Drive & Termos de Responsabilidade</span>
                      <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">
                        {veiculo.historicoTestDrives?.length || 0} Registrados
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Registro de motoristas em teste, controle de CNH e emissão automática do Termo de Responsabilidade Jurídico.
                    </p>
                  </div>
                </div>

                {canDoTestDrive && onOpenTestDrive && (
                  <button
                    onClick={() => onOpenTestDrive(veiculo)}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-900/30 flex items-center gap-2 transition cursor-pointer self-start sm:self-center shrink-0"
                  >
                    <Plus size={16} /> Realizar Novo Test Drive
                  </button>
                )}
              </div>

              {/* Lista de Test Drives */}
              {(!veiculo.historicoTestDrives || veiculo.historicoTestDrives.length === 0) ? (
                <div className="p-8 rounded-2xl bg-[#111116] border border-white/5 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-white/5 text-slate-500 mx-auto flex items-center justify-center">
                    <Compass size={24} />
                  </div>
                  <h4 className="text-sm font-bold text-slate-300">Nenhum Test Drive Registrado</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Este veículo ainda não possui registros de test drive realizados com clientes. Clique no botão acima para registrar um novo teste.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {veiculo.historicoTestDrives.map((td, index) => (
                    <div
                      key={td.id || `td-${index}`}
                      className="p-5 rounded-2xl bg-[#111116] border border-white/10 hover:border-blue-500/30 transition-all space-y-4 shadow-md"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold shrink-0">
                            <User size={20} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-extrabold text-sm text-white">{td.clienteNome}</h4>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                                td.status === 'Concluído'
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                  : td.status === 'Em Andamento'
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse'
                                  : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                              }`}>
                                {td.status || 'Concluído'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                              CNH: <strong className="text-slate-200">{td.clienteCnh}</strong> (Cat. {td.cnhCategoria || 'B'})
                              {td.clienteTelefone && ` • Tel: ${td.clienteTelefone}`}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <span className="bg-white/5 border border-white/5 px-2.5 py-1 rounded-lg text-slate-300 font-mono text-[11px]">
                            📅 {formatDate(td.dataHora.split('T')[0])} {td.dataHora.includes('T') ? td.dataHora.split('T')[1].slice(0, 5) : ''}
                          </span>
                        </div>
                      </div>

                      {/* Métricas e Detalhes */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div className="p-3 rounded-xl bg-[#16171f] border border-white/5">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold">KM Inicial</span>
                          <p className="text-white font-mono font-bold mt-0.5">{formatKm(td.kmInicial)}</p>
                        </div>

                        <div className="p-3 rounded-xl bg-[#16171f] border border-white/5">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold">KM Final</span>
                          <p className="text-white font-mono font-bold mt-0.5">
                            {td.kmFinal ? formatKm(td.kmFinal) : 'Em rota'}
                          </p>
                        </div>

                        <div className="p-3 rounded-xl bg-[#16171f] border border-white/5">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold">KM Percorrido</span>
                          <p className="text-blue-400 font-mono font-bold mt-0.5">
                            {td.kmPercorrido !== undefined ? `+${td.kmPercorrido} km` : (td.kmFinal ? `+${td.kmFinal - td.kmInicial} km` : '-')}
                          </p>
                        </div>

                        <div className="p-3 rounded-xl bg-[#16171f] border border-white/5">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold">Acompanhado Por</span>
                          <p className="text-slate-200 font-medium mt-0.5 truncate">{td.vendedorNome || 'Consultor'}</p>
                        </div>
                      </div>

                      {td.observacoes && (
                        <div className="p-3 rounded-xl bg-[#16171f] border border-white/5 text-xs text-slate-300">
                          <span className="text-slate-400 font-semibold block mb-0.5">Observações / Feedback do Cliente:</span>
                          <p className="italic">{td.observacoes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ================= ABA: VISTORIAS DIGITAIS DE ENTRADA ================= */}
          {activeTab === 'vistoria' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Header Banner */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-[#16171f] to-[#16171f] border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-xl shrink-0">
                    <ClipboardCheck size={24} />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-white flex items-center gap-2">
                      <span>Vistorias Digitais de Entrada & Checklists</span>
                      <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                        {veiculo.laudosVistoria?.length || 0} Laudos
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Auditoria técnica de recebimento do veículo: lataria, pneus, motor, elétrica, interior e itens de segurança.
                    </p>
                  </div>
                </div>

                {canDoVistoria && onOpenVistoria && (
                  <button
                    onClick={() => onOpenVistoria(veiculo)}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-900/30 flex items-center gap-2 transition cursor-pointer self-start sm:self-center shrink-0"
                  >
                    <Plus size={16} /> Nova Vistoria de Entrada
                  </button>
                )}
              </div>

              {/* Lista de Laudos de Vistoria */}
              {(!veiculo.laudosVistoria || veiculo.laudosVistoria.length === 0) ? (
                <div className="p-8 rounded-2xl bg-[#111116] border border-white/5 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-white/5 text-slate-500 mx-auto flex items-center justify-center">
                    <ClipboardCheck size={24} />
                  </div>
                  <h4 className="text-sm font-bold text-slate-300">Nenhum Laudo de Vistoria Cadastrado</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Realize o checklist de entrada deste veículo para comprovar o estado de entrega e proteger o pátio contra avarias pré-existentes.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {veiculo.laudosVistoria.map((laudo, index) => (
                    <div
                      key={laudo.id || `laudo-${index}`}
                      className="p-5 rounded-2xl bg-[#111116] border border-white/10 hover:border-emerald-500/30 transition-all space-y-4 shadow-md"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">
                            <FileCheck size={20} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-extrabold text-sm text-white">
                                Laudo Técnico #{laudo.id.slice(-6).toUpperCase()}
                              </h4>
                              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase border ${
                                laudo.statusGeral === 'Aprovado'
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                  : laudo.statusGeral === 'Aprovado com Ressalvas'
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                  : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                              }`}>
                                {laudo.statusGeral}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                              Vistoriador: <strong className="text-slate-200">{laudo.responsavelVistoriaNome}</strong> • KM: {formatKm(laudo.kmNaVistoria)} • Tanque: {laudo.nivelCombustivel || '1/2'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="bg-white/5 border border-white/5 px-2.5 py-1 rounded-lg text-slate-300 font-mono text-[11px]">
                            📅 {formatDate(laudo.dataVistoria)}
                          </span>
                          <span className="text-xs font-bold font-mono px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                            {laudo.itensAprovados}/{laudo.totalItens} OK
                          </span>
                        </div>
                      </div>

                      {/* Checklist Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
                        {laudo.itens.map((item) => (
                          <div
                            key={item.id}
                            className={`p-2.5 rounded-xl border text-xs flex flex-col justify-between ${
                              item.status === 'ok'
                                ? 'bg-emerald-950/20 border-emerald-500/20 text-slate-300'
                                : 'bg-rose-950/30 border-rose-500/30 text-rose-200'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1.5">
                              <span className="font-semibold text-slate-200 truncate">{item.nome}</span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                                item.status === 'ok' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/30 text-rose-300'
                              }`}>
                                {item.status === 'ok' ? '✓ OK' : '✕ Avaria'}
                              </span>
                            </div>
                            {item.status === 'avaria' && item.observacao && (
                              <p className="text-[11px] text-rose-300/90 italic mt-1 bg-black/20 p-1 rounded">
                                {item.observacao}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>

                      {laudo.observacoesGerais && (
                        <div className="p-3 rounded-xl bg-[#16171f] border border-white/5 text-xs text-slate-300">
                          <span className="text-slate-400 font-semibold block mb-0.5">Observações Gerais da Vistoria:</span>
                          <p className="italic">{laudo.observacoesGerais}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-[#16171f] px-6 py-4 border-t border-white/10 flex items-center justify-between flex-shrink-0">
          <span className="text-xs text-slate-400">
            {veiculo.marca} {veiculo.modelo} • Placa: <strong className="text-white">{veiculo.placa}</strong>
          </span>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition cursor-pointer"
          >
            Fechar Dossiê
          </button>
        </div>
      </div>

      {/* Submodal: Registrar Novo Evento de Histórico */}
      {isNovoEventoModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md max-h-[90vh] flex flex-col bg-gray-900 rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/10 p-5 bg-[#16171f] shrink-0">
              <h4 className="font-bold text-sm text-white flex items-center gap-2">
                <Plus size={16} className="text-blue-400" />
                Registrar Evento no Histórico
              </h4>
              <button
                onClick={() => setIsNovoEventoModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSalvarNovoEvento} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Tipo de Evento *</label>
                <select
                  value={novoEventoForm.tipo}
                  onChange={(e) => setNovoEventoForm({ ...novoEventoForm, tipo: e.target.value as TipoEventoStatus })}
                  className="w-full p-2.5 rounded-xl border border-white/10 bg-[#16171f] text-white outline-none"
                >
                  <option value="Mudança de Status">Mudança de Status</option>
                  <option value="Manutenção Preventiva">Manutenção Preventiva</option>
                  <option value="Revisão Periódica">Revisão Periódica</option>
                  <option value="Envio para Oficina">Envio para Oficina</option>
                  <option value="Preparação / Estética">Preparação / Estética</option>
                  <option value="Retorno ao Pátio">Retorno ao Pátio</option>
                  <option value="Atualização de KM">Atualização de KM</option>
                  <option value="Débito / Ocorrência">Débito / Ocorrência</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Título do Evento *</label>
                <input
                  type="text"
                  required
                  value={novoEventoForm.titulo}
                  onChange={(e) => setNovoEventoForm({ ...novoEventoForm, titulo: e.target.value })}
                  placeholder="Ex: Troca de Óleo e Filtros realizada"
                  className="w-full p-2.5 rounded-xl border border-white/10 bg-[#16171f] text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Data *</label>
                <input
                  type="date"
                  required
                  value={novoEventoForm.data}
                  onChange={(e) => setNovoEventoForm({ ...novoEventoForm, data: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-white/10 bg-[#16171f] text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Descrição Detalhada</label>
                <textarea
                  rows={2}
                  value={novoEventoForm.descricao}
                  onChange={(e) => setNovoEventoForm({ ...novoEventoForm, descricao: e.target.value })}
                  placeholder="Detalhes sobre o serviço, motorista ou status..."
                  className="w-full p-2.5 rounded-xl border border-white/10 bg-[#16171f] text-white outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">KM Registrado</label>
                  <input
                    type="number"
                    value={novoEventoForm.km}
                    onChange={(e) => setNovoEventoForm({ ...novoEventoForm, km: e.target.value === '' ? '' : Number(e.target.value) })}
                    placeholder={String(veiculo.kmAtual)}
                    className="w-full p-2.5 rounded-xl border border-white/10 bg-[#16171f] text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Valor (R$ se houver)</label>
                  <input
                    type="number"
                    value={novoEventoForm.valor}
                    onChange={(e) => setNovoEventoForm({ ...novoEventoForm, valor: e.target.value === '' ? '' : Number(e.target.value) })}
                    placeholder="0.00"
                    className="w-full p-2.5 rounded-xl border border-white/10 bg-[#16171f] text-white outline-none"
                  />
                </div>
              </div>
              </div>

              <div className="flex justify-end gap-2 p-4 border-t border-white/10 bg-[#16171f] shrink-0">
                <button
                  type="button"
                  onClick={() => setIsNovoEventoModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold cursor-pointer"
                >
                  Salvar Evento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Submodal: Lançar Custo de Marketing da Venda (Pós-Venda) */}
      {modalMarketingAberto && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg flex flex-col bg-gray-900 rounded-2xl border border-pink-500/30 shadow-2xl overflow-hidden animate-scaleUp">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-pink-500/20 p-5 bg-gradient-to-r from-pink-950/40 via-[#16171f] to-[#16171f] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-pink-600/20 border border-pink-500/30 flex items-center justify-center text-pink-400 font-bold shrink-0">
                  <Megaphone size={20} />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-white">
                    Lançar Custo de Marketing da Venda
                  </h4>
                  <p className="text-[11px] text-pink-300/80">
                    {veiculo.modelo} • {veiculo.placa} • Chassi: {veiculo.chassi.slice(-6)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalMarketingAberto(false)}
                className="text-slate-400 hover:text-white cursor-pointer p-1 rounded-lg hover:bg-white/5 transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSalvarCustoMarketing} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="p-5 space-y-4 text-xs overflow-y-auto max-h-[75vh]">
                {/* Regra Contábil Crítica Box */}
                <div className="p-4 rounded-xl bg-pink-950/30 border border-pink-500/30 space-y-1 text-xs">
                  <div className="flex items-center gap-2 font-bold text-pink-300">
                    <Shield size={16} className="text-pink-400 shrink-0" />
                    <span>REGRA CONTÁBIL CRÍTICA:</span>
                  </div>
                  <p className="text-pink-200/90 leading-relaxed text-[11px]">
                    Este valor deve ser deduzido do <strong>Lucro Líquido final do carro no DRE</strong>, mas <strong>NÃO</strong> recalcula nem altera o valor da comissão que já foi fixada e salva para os vendedores no momento do fechamento da venda.
                  </p>
                </div>

                {/* Feedback Toast */}
                {feedbackMarketingMsg && (
                  <div className="p-3 bg-emerald-950/60 border border-emerald-500/60 rounded-xl text-emerald-200 text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                    <span>{feedbackMarketingMsg}</span>
                  </div>
                )}

                {/* Campo 1: Origem do Lead */}
                <div>
                  <label className="block text-slate-200 font-bold mb-1.5 flex items-center justify-between">
                    <span>Origem do Lead (Canal de Atribuição)</span>
                    <span className="text-[10px] text-pink-400 font-semibold uppercase">Rastreabilidade</span>
                  </label>
                  <select
                    value={origemLeadInput}
                    onChange={(e) => setOrigemLeadInput(e.target.value as OrigemLeadType)}
                    className="w-full p-3 rounded-xl border border-white/10 bg-[#16171f] text-white font-medium text-xs outline-none focus:border-pink-500"
                  >
                    <option value="Meta Ads">Meta Ads (Instagram / Facebook)</option>
                    <option value="Google Ads">Google Ads (Pesquisa / Display)</option>
                    <option value="Webmotors/OLX">Webmotors / OLX / Portais</option>
                    <option value="Passante">Passante (Showroom / Pátio)</option>
                    <option value="Indicação">Indicação de Cliente / Parceiro</option>
                    <option value="WhatsApp">WhatsApp / Contato Direto</option>
                  </select>
                </div>

                {/* Campo 2: Gasto de Anúncios para este Veículo */}
                <div>
                  <label className="block text-slate-200 font-bold mb-1.5 flex items-center justify-between">
                    <span>Valor Gasto em Anúncios para este Chassi (R$)</span>
                    <span className="text-[10px] text-pink-400 font-bold">Dedução no DRE</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-slate-400 font-bold">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={valorMarketingInput}
                      onChange={(e) => setValorMarketingInput(e.target.value)}
                      placeholder="Ex: 350.00"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-pink-500/30 bg-[#16171f] text-white font-mono font-bold text-sm outline-none focus:border-pink-400"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Custo total de tráfego pago investido na campanha deste veículo até sua conversão.
                  </span>
                </div>

                {/* Simulação em Tempo Real */}
                {(() => {
                  const valVenda = Number(vendaCorrespondente?.valorVenda) || precoVendaAtual;
                  const valCompra = Number(vendaCorrespondente?.valorCompra) || veiculo.custoAquisicao;
                  const valOficina = Number(vendaCorrespondente?.totalDespesas ?? totalDespesas);
                  const valComissao = Number(vendaCorrespondente?.comissaoValor || 0);
                  const valMkt = Math.max(0, Number(valorMarketingInput) || 0);
                  const lucroSimulado = valVenda - valCompra - valOficina - valComissao - valMkt;

                  return (
                    <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
                      <span className="text-[11px] font-bold text-slate-300 block uppercase tracking-wide">
                        Simulação do DRE deste Chassi:
                      </span>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between text-slate-400">
                          <span>Receita da Venda:</span>
                          <span className="font-mono text-emerald-400 font-semibold">{formatCurrency(valVenda)}</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>(-) Custos Totais (Compra + Oficina):</span>
                          <span className="font-mono text-rose-400 font-semibold">-{formatCurrency(valCompra + valOficina)}</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span className="flex items-center gap-1">
                            (-) Comissão dos Vendedores:
                            <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold">🔒 FIXADA</span>
                          </span>
                          <span className="font-mono text-amber-400 font-semibold">-{formatCurrency(valComissao)}</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>(-) Custo de Marketing / Anúncios:</span>
                          <span className="font-mono text-pink-400 font-bold">-{formatCurrency(valMkt)}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-white/10 font-bold text-xs">
                          <span className="text-white">(=) Novo Lucro Líquido Real:</span>
                          <span className={`font-mono text-sm font-black ${lucroSimulado >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {formatCurrency(lucroSimulado)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-2 p-4 border-t border-white/10 bg-[#16171f] shrink-0">
                <button
                  type="button"
                  onClick={() => setModalMarketingAberto(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white cursor-pointer transition text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSalvandoMarketing}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold cursor-pointer transition shadow-lg text-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Megaphone size={14} />
                  <span>{isSalvandoMarketing ? 'Salvando...' : 'Salvar Custo de Marketing'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
