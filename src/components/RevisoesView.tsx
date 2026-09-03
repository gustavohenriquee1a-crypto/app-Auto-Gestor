import React, { useState, useMemo } from 'react';
import { 
  Wrench, 
  Car, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  Plus, 
  ArrowRight,
  Sparkles,
  Building2,
  Phone,
  Send,
  Calendar,
  DollarSign,
  Filter,
  Check,
  Edit,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Layers,
  MapPin,
  Receipt,
  Copy,
  CreditCard,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';
import { Veiculo, FornecedorPrestador, EventoHistoricoVeiculo, DespesaVeiculo, Usuario, TipoEventoStatus } from '../types';
import { 
  formatCurrency, 
  formatDate, 
  formatKm, 
  checkRevisaoNecessaria 
} from '../utils/formatters';
import { registrarMudancaStatusEstoque } from '../utils/auditLogger';
import { MetricCard } from './MetricCard';

export interface GrupoFornecedorMetricas {
  id: string;
  nome: string;
  categoria: string;
  fornecedor?: FornecedorPrestador;
  veiculosEmServico: Veiculo[];
  despesasPendentes: { veiculo: Veiculo; despesa: DespesaVeiculo }[];
  despesasPagas: { veiculo: Veiculo; despesa: DespesaVeiculo }[];
  totalPendente: number;
  totalPago: number;
  totalGeral: number;
}

interface RevisoesViewProps {
  veiculos: Veiculo[];
  fornecedores?: FornecedorPrestador[];
  currentUser?: Usuario | null;
  onOpenRegistrarRevisao: (veiculo: Veiculo) => void;
  onOpenDossie: (veiculo: Veiculo) => void;
  onAtualizarKm: (veiculoId: string, novaKm: number) => void;
  onUpdateVeiculo?: (veiculo: Veiculo) => void;
  onOpenNovaDespesa?: (veiculo?: Veiculo) => void;
  onSelectTab?: (tab: string) => void;
}

export const RevisoesView: React.FC<RevisoesViewProps> = ({
  veiculos,
  fornecedores = [],
  currentUser,
  onOpenRegistrarRevisao,
  onOpenDossie,
  onAtualizarKm,
  onUpdateVeiculo,
  onOpenNovaDespesa,
  onSelectTab,
}) => {
  const [activeSegment, setActiveSegment] = useState<'preparacoes' | 'locacao_km'>('preparacoes');
  
  // Filtros rápidos
  const [fornecedorFiltro, setFornecedorFiltro] = useState<string>('todos');
  const [apenasPendenciasFinanceiras, setApenasPendenciasFinanceiras] = useState<boolean>(false);
  const [statusFiltro, setStatusFiltro] = useState<'todos' | 'pendente_pagamento' | 'pago' | 'em_execucao' | 'atrasados'>('todos');
  const [viewGrouping, setViewGrouping] = useState<'agrupado_fornecedor' | 'lista_geral'>('agrupado_fornecedor');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estado para expandir/recolher painel de acerto de contas por fornecedor
  const [fornecedoresExpandidos, setFornecedoresExpandidos] = useState<Record<string, boolean>>({});
  const [copiedToast, setCopiedToast] = useState<string | null>(null);

  // Modal rápido para enviar ou atualizar serviço/oficina de um veículo
  const [selectedVeiculoFornecedor, setSelectedVeiculoFornecedor] = useState<Veiculo | null>(null);
  const [modalFornecedorOpen, setModalFornecedorOpen] = useState(false);
  const [modalFormFornecedorId, setModalFormFornecedorId] = useState('');
  const [modalFormServico, setModalFormServico] = useState('');
  const [modalFormDataEnvio, setModalFormDataEnvio] = useState(new Date().toISOString().split('T')[0]);
  const [modalFormPrevisaoRetorno, setModalFormPrevisaoRetorno] = useState('');
  const [modalFormStatusPrep, setModalFormStatusPrep] = useState<'Aguardando Envio' | 'Em Orçamento' | 'Em Execução' | 'Pronto para Retirada'>('Em Execução');
  const [modalFormCustoEstimado, setModalFormCustoEstimado] = useState<number | ''>('');

  // 1. Veículos para Venda / Estoque
  const veiculosVenda = useMemo(() => {
    return veiculos.filter((v) => v.status !== 'Vendido' && v.status !== 'Alugado');
  }, [veiculos]);

  // Mapa consolidado de Despesas e Métricas por Fornecedor (em todo o catálogo de veículos)
  const metricasPorFornecedor = useMemo<Map<string, GrupoFornecedorMetricas>>(() => {
    const map = new Map<string, GrupoFornecedorMetricas>();

    // Inicializar grupos dos fornecedores cadastrados
    fornecedores.forEach((f) => {
      map.set(f.id, {
        id: f.id,
        nome: f.nome,
        categoria: f.categoria || 'Oficina / Prestador',
        fornecedor: f,
        veiculosEmServico: [],
        despesasPendentes: [],
        despesasPagas: [],
        totalPendente: 0,
        totalPago: 0,
        totalGeral: 0,
      });
    });

    // Grupo para outros prestadores não cadastrados
    map.set('outros', {
      id: 'outros',
      nome: 'Outros Prestadores / Serviços Avulsos',
      categoria: 'Geral',
      fornecedor: undefined,
      veiculosEmServico: [],
      despesasPendentes: [],
      despesasPagas: [],
      totalPendente: 0,
      totalPago: 0,
      totalGeral: 0,
    });

    // 1. Mapear veículos em oficina/preparação
    veiculos.forEach((v) => {
      const isEmServico = v.status === 'Em Preparação' || v.status === 'Em Manutenção' || Boolean(v.fornecedorAtualId || v.fornecedorAtualNome);
      if (isEmServico) {
        if (v.fornecedorAtualId && map.has(v.fornecedorAtualId)) {
          map.get(v.fornecedorAtualId)!.veiculosEmServico.push(v);
        } else if (v.fornecedorAtualNome) {
          const found = fornecedores.find((f) => f.nome.toLowerCase() === v.fornecedorAtualNome?.toLowerCase());
          if (found && map.has(found.id)) {
            map.get(found.id)!.veiculosEmServico.push(v);
          } else {
            map.get('outros')!.veiculosEmServico.push(v);
          }
        } else {
          map.get('outros')!.veiculosEmServico.push(v);
        }
      }

      // 2. Mapear despesas vinculadas a cada fornecedor
      (v.despesas || []).forEach((d) => {
        let grupoId = 'outros';
        if (d.fornecedorId && map.has(d.fornecedorId)) {
          grupoId = d.fornecedorId;
        } else if (d.fornecedor) {
          const found = fornecedores.find((f) => f.nome.toLowerCase() === d.fornecedor?.toLowerCase());
          if (found && map.has(found.id)) {
            grupoId = found.id;
          }
        }

        const grupo = map.get(grupoId)!;
        const valor = Number(d.valor) || 0;
        grupo.totalGeral += valor;

        const isPendente = d.statusPagamento === 'Pendente';
        if (isPendente) {
          grupo.totalPendente += valor;
          grupo.despesasPendentes.push({ veiculo: v, despesa: d });
        } else {
          grupo.totalPago += valor;
          grupo.despesasPagas.push({ veiculo: v, despesa: d });
        }
      });
    });

    return map;
  }, [veiculos, fornecedores]);

  // Totais Globais de Pendências Financeiras de Fornecedores
  const totaisFinanceirosFornecedores = useMemo(() => {
    let totalPendente = 0;
    let totalPago = 0;
    let totalDespesas = 0;
    let totalVeiculosEmServico = 0;
    let qtdFornecedoresComPendencia = 0;

    metricasPorFornecedor.forEach((m) => {
      totalPendente += m.totalPendente;
      totalPago += m.totalPago;
      totalDespesas += m.totalGeral;
      totalVeiculosEmServico += m.veiculosEmServico.length;
      if (m.totalPendente > 0) {
        qtdFornecedoresComPendencia++;
      }
    });

    return {
      totalPendente,
      totalPago,
      totalDespesas,
      totalVeiculosEmServico,
      qtdFornecedoresComPendencia,
    };
  }, [metricasPorFornecedor]);

  // Filtragem dos grupos de fornecedores com base nos filtros rápidos
  const gruposFornecedoresFiltrados = useMemo<GrupoFornecedorMetricas[]>(() => {
    const lista: GrupoFornecedorMetricas[] = Array.from(metricasPorFornecedor.values());

    return lista.filter((grupo) => {
      // Filtro de fornecedor específico
      if (fornecedorFiltro !== 'todos' && grupo.id !== fornecedorFiltro) {
        return false;
      }

      // Filtro rápido: Apenas com pendências financeiras
      if (apenasPendenciasFinanceiras && grupo.totalPendente <= 0) {
        return false;
      }

      // Se não houver nem carros em serviço nem despesas registradas
      if (grupo.veiculosEmServico.length === 0 && grupo.totalGeral === 0) {
        return false;
      }

      // Filtro de busca de texto
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchNome = grupo.nome.toLowerCase().includes(term);
        const matchCategoria = grupo.categoria.toLowerCase().includes(term);
        const matchCarro = grupo.veiculosEmServico.some(
          (v) =>
            v.modelo.toLowerCase().includes(term) ||
            v.placa.toLowerCase().includes(term) ||
            (v.servicoAtualEmAndamento && v.servicoAtualEmAndamento.toLowerCase().includes(term))
        );
        const matchDespesa = grupo.despesasPendentes.some(
          (dp) =>
            dp.despesa.descricao.toLowerCase().includes(term) ||
            dp.veiculo.placa.toLowerCase().includes(term) ||
            dp.veiculo.modelo.toLowerCase().includes(term)
        );

        if (!matchNome && !matchCategoria && !matchCarro && !matchDespesa) {
          return false;
        }
      }

      // Filtro por Status
      if (statusFiltro === 'pendente_pagamento' && grupo.totalPendente <= 0) {
        return false;
      }
      if (statusFiltro === 'pago' && grupo.totalPago <= 0) {
        return false;
      }
      if (statusFiltro === 'em_execucao' && grupo.veiculosEmServico.length === 0) {
        return false;
      }
      if (statusFiltro === 'atrasados') {
        const temAtrasado = grupo.veiculosEmServico.some((v) => {
          if (!v.previsaoRetornoOficina) return false;
          return new Date(v.previsaoRetornoOficina) < new Date();
        });
        if (!temAtrasado) return false;
      }

      return true;
    });
  }, [metricasPorFornecedor, fornecedorFiltro, apenasPendenciasFinanceiras, statusFiltro, searchTerm]);

  // Lista plana de veículos filtrados
  const veiculosEmPreparacaoOuOficina = useMemo(() => {
    return veiculosVenda.filter((v) => {
      const matchStatus = v.status === 'Em Preparação' || v.status === 'Em Manutenção' || Boolean(v.fornecedorAtualId || v.fornecedorAtualNome);
      const matchFornecedor =
        fornecedorFiltro === 'todos' ||
        v.fornecedorAtualId === fornecedorFiltro ||
        v.fornecedorAtualNome === fornecedorFiltro;
      const matchSearch =
        searchTerm === '' ||
        v.modelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.servicoAtualEmAndamento && v.servicoAtualEmAndamento.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (v.fornecedorAtualNome && v.fornecedorAtualNome.toLowerCase().includes(searchTerm.toLowerCase()));

      return matchStatus && matchFornecedor && matchSearch;
    });
  }, [veiculosVenda, fornecedorFiltro, searchTerm]);

  // 2. Veículos de Locação (Foco: Odômetro e Manutenção Preventiva por KM)
  const veiculosLocacao = useMemo(() => {
    return veiculos.filter((v) => v.status === 'Alugado' || Boolean(v.contratoAtivo));
  }, [veiculos]);

  const urgentesLocacao = veiculosLocacao.filter((v) => checkRevisaoNecessaria(v).isUrgente);
  const atencaoLocacao = veiculosLocacao.filter((v) => checkRevisaoNecessaria(v).isAtencao);

  // Toggle expansão do painel de acerto
  const toggleExpandirFornecedor = (id: string) => {
    setFornecedoresExpandidos((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Quitar despesa individual de um veículo diretamente
  const handleQuitarDespesa = (veiculo: Veiculo, despesaId: string) => {
    if (!onUpdateVeiculo) return;

    const hoje = new Date().toISOString().split('T')[0];
    const despesasAtualizadas = (veiculo.despesas || []).map((d) => {
      if (d.id === despesaId) {
        return {
          ...d,
          statusPagamento: 'Pago' as const,
          dataPagamento: hoje,
        };
      }
      return d;
    });

    const despesaQuitada = veiculo.despesas.find((d) => d.id === despesaId);

    const novoEvento: EventoHistoricoVeiculo = {
      id: `evt_quitar_${Date.now()}`,
      data: hoje,
      tipo: 'Manutenção Preventiva',
      titulo: 'Quitação de Despesa de Oficina',
      descricao: `Baixa de pagamento realizada para o serviço "${despesaQuitada?.descricao || 'Serviço'}" no valor de ${formatCurrency(despesaQuitada?.valor || 0)} ao parceiro ${despesaQuitada?.fornecedor || 'Oficina'}.`,
      statusResultante: veiculo.status,
      fornecedorOficina: despesaQuitada?.fornecedor,
      valor: despesaQuitada?.valor,
      usuarioRegistro: currentUser?.displayName || currentUser?.email || 'Administrador',
    };

    const veiculoAtualizado: Veiculo = {
      ...veiculo,
      despesas: despesasAtualizadas,
      historicoStatus: [...(veiculo.historicoStatus || []), novoEvento],
    };

    onUpdateVeiculo(veiculoAtualizado);
  };

  // Copiar relatório de acerto de contas pronto para WhatsApp
  const handleCopiarAcertoWhatsApp = (grupo: typeof gruposFornecedoresFiltrados[0]) => {
    const hoje = new Date().toLocaleDateString('pt-BR');
    let texto = `📋 *ACERTO DE CONTAS - AUTO GESTOR*\n`;
    texto += `🏢 *Parceiro:* ${grupo.nome}\n`;
    texto += `📅 *Data:* ${hoje}\n`;
    texto += `----------------------------------------\n`;
    
    if (grupo.despesasPendentes.length > 0) {
      texto += `*SERVIÇOS / PENDÊNCIAS EM ABERTO:*\n`;
      grupo.despesasPendentes.forEach(({ veiculo, despesa }, i) => {
        texto += `${i + 1}. [${veiculo.placa}] ${veiculo.modelo}\n`;
        texto += `   • Serviço: ${despesa.descricao}\n`;
        texto += `   • Valor: ${formatCurrency(despesa.valor)}\n`;
        if (despesa.numeroNotaRecibo) {
          texto += `   • NF/Recibo: ${despesa.numeroNotaRecibo}\n`;
        }
      });
      texto += `----------------------------------------\n`;
      texto += `💰 *TOTAL PENDENTE A PAGAR: ${formatCurrency(grupo.totalPendente)}*\n`;
    } else {
      texto += `✅ *Todas as pendências deste parceiro estão 100% quitadas!*\n`;
    }

    if (grupo.fornecedor?.chavePix) {
      texto += `🔑 *Chave PIX:* ${grupo.fornecedor.chavePix} (${grupo.fornecedor.tipoChavePix || 'PIX'})\n`;
    }
    if (grupo.fornecedor?.dadosBancarios) {
      texto += `🏦 *Banco:* ${grupo.fornecedor.dadosBancarios}\n`;
    }

    navigator.clipboard.writeText(texto);
    setCopiedToast(`Extrato copiado para WhatsApp (${grupo.nome})`);
    setTimeout(() => setCopiedToast(null), 3500);
  };

  // Copiar Chave PIX
  const handleCopiarChavePix = (chave: string, nome: string) => {
    navigator.clipboard.writeText(chave);
    setCopiedToast(`Chave PIX de ${nome} copiada com sucesso!`);
    setTimeout(() => setCopiedToast(null), 3000);
  };

  // Handlers para o Modal de Oficina / Serviço
  const handleOpenEnviarOficina = (veiculo: Veiculo) => {
    setSelectedVeiculoFornecedor(veiculo);
    setModalFormFornecedorId(veiculo.fornecedorAtualId || '');
    setModalFormServico(veiculo.servicoAtualEmAndamento || '');
    setModalFormDataEnvio(veiculo.dataEnvioOficina || new Date().toISOString().split('T')[0]);
    setModalFormPrevisaoRetorno(veiculo.previsaoRetornoOficina || '');
    setModalFormStatusPrep(veiculo.statusPreparacaoOficina || 'Em Execução');
    setModalFormCustoEstimado(veiculo.custoEstimadoServico || '');
    setModalFornecedorOpen(true);
  };

  const handleSalvarEnvioOficina = () => {
    if (!selectedVeiculoFornecedor || !onUpdateVeiculo) return;

    const fornSelected = fornecedores.find((f) => f.id === modalFormFornecedorId);
    const fornNome = fornSelected ? fornSelected.nome : modalFormFornecedorId ? modalFormFornecedorId : undefined;
    const fornCat = fornSelected?.categoria;

    const veiculoComAuditoria = registrarMudancaStatusEstoque(
      selectedVeiculoFornecedor,
      'Em Preparação',
      currentUser,
      'Preparações & Oficina',
      `Encaminhado para ${fornNome || 'Oficina'}: ${modalFormServico || 'Preparação'}`
    );

    const veiculoAtualizado: Veiculo = {
      ...veiculoComAuditoria,
      status: 'Em Preparação',
      status_estoque: 'Em Preparação',
      fornecedorAtualId: fornSelected?.id || undefined,
      fornecedorAtualNome: fornNome,
      fornecedorAtualCategoria: fornCat,
      servicoAtualEmAndamento: modalFormServico.trim() || undefined,
      dataEnvioOficina: modalFormDataEnvio,
      previsaoRetornoOficina: modalFormPrevisaoRetorno || undefined,
      statusPreparacaoOficina: modalFormStatusPrep,
      custoEstimadoServico: typeof modalFormCustoEstimado === 'number' ? modalFormCustoEstimado : undefined,
    };

    onUpdateVeiculo(veiculoAtualizado);
    setModalFornecedorOpen(false);
    setSelectedVeiculoFornecedor(null);
  };

  const handleConcluirServicoRetornoPatio = (veiculo: Veiculo) => {
    if (!onUpdateVeiculo) return;
    if (!confirm(`Confirmar que o veículo ${veiculo.modelo} (${veiculo.placa}) concluiu o serviço e retornou ao pátio disponível para venda?`)) {
      return;
    }

    const veiculoComAuditoria = registrarMudancaStatusEstoque(
      veiculo,
      'No Pátio',
      currentUser,
      'Preparações & Oficina',
      `Serviço concluído na empresa ${veiculo.fornecedorAtualNome || 'parceira'}. Liberado para o pátio.`
    );

    const veiculoAtualizado: Veiculo = {
      ...veiculoComAuditoria,
      status: 'Disponível',
      status_estoque: 'No Pátio',
      fornecedorAtualId: undefined,
      fornecedorAtualNome: undefined,
      fornecedorAtualCategoria: undefined,
      servicoAtualEmAndamento: undefined,
      statusPreparacaoOficina: 'Pátio / Pronto',
    };

    onUpdateVeiculo(veiculoAtualizado);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Toast Notification */}
      {copiedToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-bold animate-bounce border border-emerald-400/40">
          <CheckCircle2 size={16} />
          <span>{copiedToast}</span>
        </div>
      )}

      {/* 1. Header & Segment Switcher */}
      <div className="bg-[#111116] text-white p-6 rounded-2xl border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Wrench size={22} />
            </div>
            <div>
              <span className="text-[10px] uppercase font-black text-blue-400 tracking-wider">
                Oficina, Fornecedores & Acerto de Contas
              </span>
              <h3 className="font-black text-xl text-white">Preparações & Gestão de Parceiros</h3>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Acompanhe o andamento das oficinas, filtre pendências de cada prestador e realize o acerto de contas ágil com cada parceiro comercial.
          </p>
        </div>

        {/* Tab switcher: Venda/Preparações vs Locação/KM */}
        <div className="bg-[#16171e] p-1 rounded-2xl border border-white/10 flex gap-1 text-xs shrink-0">
          <button
            onClick={() => setActiveSegment('preparacoes')}
            className={`py-2 px-3.5 rounded-xl font-bold transition flex items-center gap-2 cursor-pointer ${
              activeSegment === 'preparacoes'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Car size={15} />
            <span>Preparações & Oficinas</span>
            <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">
              {totaisFinanceirosFornecedores.totalVeiculosEmServico}
            </span>
          </button>

          <button
            onClick={() => setActiveSegment('locacao_km')}
            className={`py-2 px-3.5 rounded-xl font-bold transition flex items-center gap-2 cursor-pointer ${
              activeSegment === 'locacao_km'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck size={15} />
            <span>Revisões Preventivas (KM)</span>
            {urgentesLocacao.length > 0 && (
              <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold animate-pulse">
                {urgentesLocacao.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SEGMENT 1: PREPARAÇÕES DE ESTOQUE / OFICINAS & ACERTO DE CONTAS           */}
      {/* ========================================================================= */}
      {activeSegment === 'preparacoes' && (
        <div className="space-y-6">
          {/* Métricas Consolidadas do Módulo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Veículos em Preparação"
              value={totaisFinanceirosFornecedores.totalVeiculosEmServico}
              subtitle="Em oficinas mecânicas, funilarias ou estética"
              icon={<Wrench className="text-blue-400" size={20} />}
            />
            <MetricCard
              title="Pendências a Pagar (Acerto)"
              value={formatCurrency(totaisFinanceirosFornecedores.totalPendente)}
              subtitle={`${totaisFinanceirosFornecedores.qtdFornecedoresComPendencia} parceiros com saldo em aberto`}
              icon={<Receipt className="text-rose-400" size={20} />}
              trend={totaisFinanceirosFornecedores.totalPendente > 0 ? { value: 'Acerto Pendente', isPositive: false } : undefined}
            />
            <MetricCard
              title="Total Já Liquidado"
              value={formatCurrency(totaisFinanceirosFornecedores.totalPago)}
              subtitle="Despesas de oficina quitadas"
              icon={<CheckCircle2 className="text-emerald-400" size={20} />}
            />
            <MetricCard
              title="Investimento Acumulado"
              value={formatCurrency(totaisFinanceirosFornecedores.totalDespesas)}
              subtitle="Gasto total em melhorias no estoque"
              icon={<DollarSign className="text-amber-400" size={20} />}
            />
          </div>

          {/* ===================================================================== */}
          {/* FILTROS RÁPIDOS PARA VISUALIZAR PENDÊNCIAS DE FORNECEDORES ESPECÍFICOS */}
          {/* ===================================================================== */}
          <div className="bg-[#111116] p-5 rounded-2xl border border-white/10 space-y-4 shadow-xl">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Filter size={16} className="text-blue-400" />
                  <h4 className="font-bold text-sm text-white">Filtros Rápidos & Acerto por Parceiro</h4>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Selecione um fornecedor para conferir exclusivamente suas ordens de serviço, valores pendentes e gerar extrato de acerto:
                </p>
              </div>

              {/* Botão de alternância Rápida: Somente Pendências Financeiras */}
              <button
                type="button"
                onClick={() => setApenasPendenciasFinanceiras(!apenasPendenciasFinanceiras)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer border ${
                  apenasPendenciasFinanceiras
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-lg shadow-rose-950/40'
                    : 'bg-[#16171e] text-slate-300 border-white/10 hover:border-white/20'
                }`}
              >
                <AlertCircle size={15} className={apenasPendenciasFinanceiras ? 'text-rose-400 animate-pulse' : 'text-slate-400'} />
                <span>Somente com Pendências Financeiras</span>
                {totaisFinanceirosFornecedores.qtdFornecedoresComPendencia > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${apenasPendenciasFinanceiras ? 'bg-rose-500 text-white' : 'bg-rose-500/20 text-rose-300'}`}>
                    {totaisFinanceirosFornecedores.qtdFornecedoresComPendencia}
                  </span>
                )}
              </button>
            </div>

            {/* BARRA HORIZONTAL DE CHIPS/PILLS DOS FORNECEDORES */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 scrollbar-thin scrollbar-thumb-white/10">
              {/* Chip: Todos os Fornecedores */}
              <button
                type="button"
                onClick={() => {
                  setFornecedorFiltro('todos');
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-2 cursor-pointer border ${
                  fornecedorFiltro === 'todos'
                    ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-900/30'
                    : 'bg-[#16171e] text-slate-300 border-white/10 hover:bg-white/5'
                }`}
              >
                <Building2 size={14} />
                <span>Todos os Fornecedores</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-black/30 text-slate-200">
                  {totaisFinanceirosFornecedores.totalVeiculosEmServico} carros
                </span>
              </button>

              {/* Chips por Fornecedor Cadastrado */}
              {Array.from(metricasPorFornecedor.values()).map((forn: GrupoFornecedorMetricas) => {
                if (forn.veiculosEmServico.length === 0 && forn.totalGeral === 0) return null;
                const isSelected = fornecedorFiltro === forn.id;
                const temPendencia = forn.totalPendente > 0;

                return (
                  <button
                    key={forn.id}
                    type="button"
                    onClick={() => {
                      setFornecedorFiltro(forn.id);
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-2 cursor-pointer border ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-900/30'
                        : temPendencia
                        ? 'bg-[#16171e] text-slate-200 border-rose-500/30 hover:border-rose-500/60'
                        : 'bg-[#16171e] text-slate-300 border-white/10 hover:bg-white/5'
                    }`}
                  >
                    <span>{forn.nome}</span>
                    
                    {/* Badge de Carros no local */}
                    {forn.veiculosEmServico.length > 0 && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        {forn.veiculosEmServico.length} {forn.veiculosEmServico.length === 1 ? 'carro' : 'carros'}
                      </span>
                    )}

                    {/* Badge de Pendência Financeira */}
                    {temPendencia ? (
                      <span className="text-[10px] font-mono font-black px-1.5 py-0.2 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                        <DollarSign size={10} />
                        {formatCurrency(forn.totalPendente)}
                      </span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-emerald-500/10 text-emerald-400">
                        Quitado
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Barra de Busca e Filtros Secundários */}
            <div className="pt-2 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="flex flex-1 items-center gap-2.5 w-full md:w-auto">
                <input
                  type="text"
                  placeholder="Buscar por placa, modelo, serviço ou descrição da despesa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full md:w-80 bg-[#16171e] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                />

                {/* Filtro de Status de Pagamento / Execução */}
                <select
                  value={statusFiltro}
                  onChange={(e) => setStatusFiltro(e.target.value as any)}
                  className="bg-[#16171e] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 shrink-0"
                >
                  <option value="todos">⚡ Todos os Status</option>
                  <option value="pendente_pagamento">💰 Somente Pendências de Acerto</option>
                  <option value="pago">✅ Serviços Já Pagos</option>
                  <option value="em_execucao">🛠️ Em Execução na Oficina</option>
                  <option value="atrasados">🚨 Prazos Atrasados</option>
                </select>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                {/* Visualização: Agrupado por Fornecedor vs Lista Geral */}
                <div className="bg-[#16171e] p-1 rounded-xl border border-white/10 flex text-xs">
                  <button
                    onClick={() => setViewGrouping('agrupado_fornecedor')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                      viewGrouping === 'agrupado_fornecedor'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Layers size={13} />
                    <span>Por Parceiro & Acerto</span>
                  </button>
                  <button
                    onClick={() => setViewGrouping('lista_geral')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                      viewGrouping === 'lista_geral'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Filter size={13} />
                    <span>Lista de Veículos</span>
                  </button>
                </div>

                {onSelectTab && (
                  <button
                    onClick={() => onSelectTab('fornecedores')}
                    className="px-3 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl border border-white/10 text-xs font-semibold transition flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <Building2 size={14} className="text-blue-400" />
                    <span>Gerenciar Parceiros</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* CONTEÚDO PRINCIPAL: AGRUPADO POR FORNECEDOR COM PAINEL DE ACERTO      */}
          {/* ===================================================================== */}
          {gruposFornecedoresFiltrados.length === 0 ? (
            <div className="bg-[#111116] rounded-2xl p-12 text-center border border-white/5 space-y-3 shadow-xl">
              <CheckCircle2 size={44} className="mx-auto text-emerald-500 mb-2" />
              <h5 className="text-base font-bold text-white">Nenhum registro encontrado para este filtro</h5>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Não foram encontrados veículos em oficina ou pendências de acerto para o fornecedor ou status selecionado.
              </p>
              <div className="pt-2 flex justify-center gap-3">
                <button
                  onClick={() => {
                    setFornecedorFiltro('todos');
                    setApenasPendenciasFinanceiras(false);
                    setStatusFiltro('todos');
                    setSearchTerm('');
                  }}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-200 rounded-xl text-xs font-bold border border-white/10 transition cursor-pointer"
                >
                  Limpar Filtros
                </button>
                {veiculosVenda.length > 0 && (
                  <button
                    onClick={() => handleOpenEnviarOficina(veiculosVenda[0])}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus size={14} /> Enviar Veículo para Oficina
                  </button>
                )}
              </div>
            </div>
          ) : viewGrouping === 'agrupado_fornecedor' ? (
            <div className="space-y-6">
              {gruposFornecedoresFiltrados.map((grupo) => {
                const forn = grupo.fornecedor;
                const whatsappNumeros = forn?.whatsapp ? forn.whatsapp.replace(/\D/g, '') : forn?.telefone ? forn.telefone.replace(/\D/g, '') : '';
                const whatsappLink = whatsappNumeros ? `https://wa.me/55${whatsappNumeros}` : null;
                const isPainelExpandido = fornecedoresExpandidos[grupo.id] ?? true;
                const temPendencia = grupo.totalPendente > 0;

                return (
                  <div
                    key={grupo.id}
                    className={`bg-[#111116] rounded-3xl border transition-all shadow-xl overflow-hidden ${
                      temPendencia ? 'border-rose-500/30' : 'border-white/10'
                    }`}
                  >
                    {/* Header do Fornecedor */}
                    <div className="p-5 bg-[#16171e] border-b border-white/5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex items-start sm:items-center gap-3.5">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black shrink-0 border ${
                          temPendencia
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                            : 'bg-blue-600/20 text-blue-400 border-blue-500/30'
                        }`}>
                          <Building2 size={22} />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-black text-lg text-white">{grupo.nome}</h4>
                            <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full font-bold">
                              {grupo.categoria}
                            </span>
                            {forn?.responsavelContato && (
                              <span className="text-xs text-slate-400">
                                • Contato: <strong className="text-slate-200">{forn.responsavelContato}</strong>
                              </span>
                            )}
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                            {forn?.telefone && (
                              <span className="flex items-center gap-1">
                                <Phone size={12} className="text-slate-500" />
                                {forn.telefone}
                              </span>
                            )}
                            {forn?.endereco && (
                              <span className="flex items-center gap-1 truncate max-w-sm">
                                <MapPin size={12} className="text-slate-500" />
                                {forn.endereco}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Resumo Financeiro & Ações de Acerto */}
                      <div className="flex flex-wrap items-center gap-3">
                        {/* Caixa de Acerto Financeiro */}
                        <div className={`px-4 py-2.5 rounded-2xl border flex items-center gap-3 ${
                          temPendencia
                            ? 'bg-rose-950/30 border-rose-500/40 text-rose-200'
                            : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                        }`}>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">
                              {temPendencia ? 'Saldo Pendente a Pagar' : 'Status Financeiro'}
                            </span>
                            <span className="font-mono font-black text-sm text-white">
                              {temPendencia ? formatCurrency(grupo.totalPendente) : '100% Quitado'}
                            </span>
                          </div>
                        </div>

                        {/* Botão Copiar Acerto p/ WhatsApp */}
                        <button
                          type="button"
                          onClick={() => handleCopiarAcertoWhatsApp(grupo)}
                          className="px-3.5 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                          title="Copiar relatório formatado de acerto de contas para enviar via WhatsApp"
                        >
                          <Send size={13} />
                          <span>Extrato WhatsApp</span>
                        </button>

                        {/* Botão Copiar Chave PIX se houver */}
                        {forn?.chavePix && (
                          <button
                            type="button"
                            onClick={() => handleCopiarChavePix(forn.chavePix!, grupo.nome)}
                            className="px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                            title={`Chave PIX: ${forn.chavePix}`}
                          >
                            <CreditCard size={13} className="text-amber-400" />
                            <span>Copiar PIX</span>
                          </button>
                        )}

                        {/* Botão Lançar Nova Despesa */}
                        {onOpenNovaDespesa && (
                          <button
                            type="button"
                            onClick={() => onOpenNovaDespesa(grupo.veiculosEmServico[0])}
                            className="px-3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                          >
                            <Plus size={13} />
                            <span>Lançar Despesa</span>
                          </button>
                        )}

                        {/* Toggle Detalhes de Acerto */}
                        <button
                          type="button"
                          onClick={() => toggleExpandirFornecedor(grupo.id)}
                          className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer border border-white/5"
                          title={isPainelExpandido ? 'Recolher detalhes' : 'Expandir detalhes'}
                        >
                          {isPainelExpandido ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </div>
                    </div>

                    {isPainelExpandido && (
                      <div className="p-5 space-y-6">
                        {/* ======================================================= */}
                        {/* SEÇÃO 1: TABELA / LISTA DE PENDÊNCIAS FINANCEIRAS DO PARCEIRO */}
                        {/* ======================================================= */}
                        <div className="bg-[#16171e] rounded-2xl p-4 border border-white/5 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Receipt size={16} className={temPendencia ? 'text-rose-400' : 'text-emerald-400'} />
                              <h5 className="font-bold text-xs text-white uppercase tracking-wider">
                                Acerto de Contas & Despesas ({grupo.despesasPendentes.length} pendente{grupo.despesasPendentes.length === 1 ? '' : 's'} • {grupo.despesasPagas.length} paga{grupo.despesasPagas.length === 1 ? '' : 's'})
                              </h5>
                            </div>
                            <div className="text-xs text-slate-400">
                              Total de Serviços: <strong className="text-slate-200">{formatCurrency(grupo.totalGeral)}</strong>
                            </div>
                          </div>

                          {/* Lista das despesas pendentes para quitação imediata */}
                          {grupo.despesasPendentes.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                  <tr className="border-b border-white/10 text-slate-400 font-semibold">
                                    <th className="py-2.5 px-3">Veículo / Placa</th>
                                    <th className="py-2.5 px-3">Descrição do Serviço</th>
                                    <th className="py-2.5 px-3">Data</th>
                                    <th className="py-2.5 px-3">NF / Recibo</th>
                                    <th className="py-2.5 px-3 text-right">Valor</th>
                                    <th className="py-2.5 px-3 text-center">Status</th>
                                    <th className="py-2.5 px-3 text-right">Ação de Quitação</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                  {grupo.despesasPendentes.map(({ veiculo, despesa }) => (
                                    <tr key={despesa.id} className="hover:bg-white/5 transition">
                                      <td className="py-2.5 px-3 font-medium text-white">
                                        <div className="flex items-center gap-2">
                                          <span className="font-mono text-[11px] bg-white/10 text-slate-200 px-1.5 py-0.5 rounded font-bold">
                                            {veiculo.placa}
                                          </span>
                                          <span className="truncate max-w-[140px]">{veiculo.modelo}</span>
                                        </div>
                                      </td>
                                      <td className="py-2.5 px-3 text-slate-300">
                                        {despesa.descricao}
                                        <span className="text-[10px] text-slate-500 block">{despesa.categoria}</span>
                                      </td>
                                      <td className="py-2.5 px-3 text-slate-400 font-mono">
                                        {formatDate(despesa.data)}
                                      </td>
                                      <td className="py-2.5 px-3 text-slate-400 font-mono">
                                        {despesa.numeroNotaRecibo || '-'}
                                      </td>
                                      <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-300">
                                        {formatCurrency(despesa.valor)}
                                      </td>
                                      <td className="py-2.5 px-3 text-center">
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                          Pendente
                                        </span>
                                      </td>
                                      <td className="py-2.5 px-3 text-right">
                                        <button
                                          type="button"
                                          onClick={() => handleQuitarDespesa(veiculo, despesa.id)}
                                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold transition inline-flex items-center gap-1 cursor-pointer shadow-xs"
                                          title="Registrar pagamento efetuado para esta despesa"
                                        >
                                          <Check size={12} />
                                          <span>Quitar / Baixar</span>
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="py-3 px-4 bg-emerald-950/20 rounded-xl border border-emerald-500/20 flex items-center justify-between text-xs text-emerald-300">
                              <span className="flex items-center gap-2">
                                <CheckCircle2 size={15} /> Todas as despesas deste parceiro estão devidamente quitadas e sem pendências financeiras.
                              </span>
                              <span className="font-bold">Total Liquidado: {formatCurrency(grupo.totalPago)}</span>
                            </div>
                          )}
                        </div>

                        {/* ======================================================= */}
                        {/* SEÇÃO 2: CARROS ATUALMENTE EM OFICINA NESTE PARCEIRO    */}
                        {/* ======================================================= */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h5 className="font-bold text-xs text-slate-300 uppercase tracking-wider flex items-center gap-2">
                              <Car size={14} className="text-blue-400" />
                              Veículos no Local ({grupo.veiculosEmServico.length})
                            </h5>
                          </div>

                          {grupo.veiculosEmServico.length === 0 ? (
                            <p className="text-xs text-slate-500 italic p-3 bg-white/5 rounded-xl">
                              Nenhum veículo físico na oficina no momento.
                            </p>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {grupo.veiculosEmServico.map((v) => {
                                const isAtrasado = v.previsaoRetornoOficina && new Date(v.previsaoRetornoOficina) < new Date();

                                return (
                                  <div
                                    key={v.id}
                                    className="bg-[#16171e] rounded-2xl p-4 border border-white/5 flex flex-col justify-between hover:border-blue-500/30 transition shadow-md"
                                  >
                                    <div>
                                      <div className="flex items-start justify-between gap-2">
                                        <div>
                                          <span className="font-mono font-bold text-xs bg-white/10 text-slate-200 px-2 py-0.5 rounded border border-white/10">
                                            {v.placa}
                                          </span>
                                          <h5 className="font-bold text-sm text-white mt-1">{v.modelo}</h5>
                                          <p className="text-xs text-slate-400">
                                            {v.ano} • {v.cor} • <span className="font-mono">{formatKm(v.kmAtual)}</span>
                                          </p>
                                        </div>

                                        <span
                                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                            v.statusPreparacaoOficina === 'Pronto para Retirada'
                                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                              : v.statusPreparacaoOficina === 'Em Execução'
                                              ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                                              : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                          }`}
                                        >
                                          {v.statusPreparacaoOficina || 'Em Execução'}
                                        </span>
                                      </div>

                                      {/* Serviço em andamento */}
                                      <div className="mt-3 p-2.5 bg-black/20 rounded-xl border border-white/5 space-y-1 text-xs">
                                        <p className="text-blue-400 font-semibold flex items-center gap-1.5">
                                          <Wrench size={12} />
                                          {v.servicoAtualEmAndamento || 'Serviço em execução'}
                                        </p>

                                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-white/5">
                                          <span>Envio: {formatDate(v.dataEnvioOficina || '')}</span>
                                          <span className={isAtrasado ? 'text-rose-400 font-bold' : 'text-slate-300 font-medium'}>
                                            Retorno: {v.previsaoRetornoOficina ? formatDate(v.previsaoRetornoOficina) : 'A definir'}
                                          </span>
                                        </div>

                                        {v.custoEstimadoServico && (
                                          <p className="text-[11px] text-slate-400">
                                            Orçamento Estimado: <strong className="text-amber-400 font-mono">{formatCurrency(v.custoEstimadoServico)}</strong>
                                          </p>
                                        )}
                                      </div>
                                    </div>

                                    {/* Ações do Veículo */}
                                    <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                                      <button
                                        onClick={() => handleConcluirServicoRetornoPatio(v)}
                                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                                      >
                                        <Check size={13} />
                                        <span>Retornar ao Pátio</span>
                                      </button>

                                      <div className="flex items-center gap-1.5">
                                        <button
                                          onClick={() => handleOpenEnviarOficina(v)}
                                          className="p-1.5 text-slate-300 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition cursor-pointer"
                                          title="Editar Serviço / Previsão"
                                        >
                                          <Edit size={13} />
                                        </button>
                                        <button
                                          onClick={() => onOpenDossie(v)}
                                          className="p-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 rounded-lg transition cursor-pointer"
                                          title="Abrir Dossiê Completo"
                                        >
                                          <ExternalLink size={13} />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* VISUALIZAÇÃO EM LISTA GERAL */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {veiculosEmPreparacaoOuOficina.map((v) => (
                <div
                  key={v.id}
                  className="bg-[#111116] rounded-2xl p-5 border border-white/10 flex flex-col justify-between shadow-lg"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono font-bold text-xs bg-white/5 text-slate-200 px-2 py-0.5 rounded border border-white/10">
                          {v.placa}
                        </span>
                        <h5 className="font-bold text-base text-white mt-1">{v.modelo}</h5>
                        <p className="text-xs text-slate-400">
                          Chassi: <span className="font-mono">{v.chassi}</span>
                        </p>
                      </div>

                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-amber-500/20 text-amber-300 border-amber-500/30">
                        {v.statusPreparacaoOficina || 'Em Preparação'}
                      </span>
                    </div>

                    <div className="mt-3.5 space-y-2 text-xs">
                      <div className="p-2.5 bg-[#16171e] rounded-xl border border-white/5 space-y-1">
                        <p className="text-slate-400">
                          🏢 <strong className="text-white">{v.fornecedorAtualNome || 'Oficina / Parceiro'}</strong>
                        </p>
                        <p className="text-blue-400 font-semibold">
                          🛠️ {v.servicoAtualEmAndamento || 'Serviço em execução'}
                        </p>
                        {v.previsaoRetornoOficina && (
                          <p className="text-[11px] text-slate-400">
                            📅 Previsão Retorno: <strong className="text-slate-200 font-mono">{formatDate(v.previsaoRetornoOficina)}</strong>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                    <button
                      onClick={() => handleConcluirServicoRetornoPatio(v)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Check size={13} />
                      <span>Retornar ao Pátio</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEnviarOficina(v)}
                        className="text-xs text-slate-300 bg-white/5 hover:bg-white/10 px-2.5 py-1.5 rounded-lg border border-white/10 transition font-semibold cursor-pointer"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => onOpenDossie(v)}
                        className="text-xs text-blue-400 hover:text-blue-300 font-semibold transition cursor-pointer"
                      >
                        Dossiê →
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SEGMENT 2: REVISÕES PREVENTIVAS DE KM (EXCLUSIVO PARA CARROS DE LOCAÇÃO) */}
      {/* ========================================================================= */}
      {activeSegment === 'locacao_km' && (
        <div className="space-y-6">
          <div className="bg-[#111116] text-white p-5 rounded-2xl border border-emerald-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="text-emerald-400" size={22} />
                <h4 className="font-bold text-base text-white">
                  Controle de Revisões Preventivas por Odômetro (Ciclo de 10.000 KM)
                </h4>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                ⚠️ <strong className="text-slate-300">Regra de Gestão:</strong> Alertas de quilometragem e manutenção preventiva periódica aplicam-se <strong>estritamente aos carros alugados para motoristas de aplicativo</strong>. Carros de estoque para venda não são afetados por este alerta.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="bg-rose-500/20 border border-rose-500/30 px-3.5 py-1.5 rounded-xl text-xs font-bold text-rose-300">
                {urgentesLocacao.length} {urgentesLocacao.length === 1 ? 'Revisão Vencida' : 'Revisões Vencidas'}
              </div>
            </div>
          </div>

          {veiculosLocacao.length === 0 ? (
            <div className="bg-[#111116] rounded-2xl p-12 text-center border border-white/5 space-y-3 shadow-xl">
              <ShieldCheck size={44} className="mx-auto text-slate-600 mb-2" />
              <h5 className="text-base font-bold text-white">Nenhum veículo em contrato de locação ativo</h5>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Assim que um contrato de locação for aberto para um motorista de aplicativo, o odômetro e os alertas de revisão a cada 10.000 KM serão monitorados automaticamente aqui.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {veiculosLocacao.map((v) => {
                const rev = checkRevisaoNecessaria(v);

                return (
                  <div
                    key={v.id}
                    className={`bg-[#111116] rounded-2xl p-5 border transition-all ${
                      rev.isUrgente
                        ? 'border-rose-500/50 shadow-lg shadow-rose-950/30'
                        : rev.isAtencao
                        ? 'border-amber-500/40'
                        : 'border-white/5'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs bg-white/5 text-slate-200 px-2 py-0.5 rounded border border-white/10">
                            {v.placa}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              rev.isUrgente
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                : rev.isAtencao
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            }`}
                          >
                            {rev.isUrgente ? '⚠️ VENCIDA (+10.000 KM)' : rev.isAtencao ? '🔔 ATENÇÃO (PERTO DE 10K)' : '✅ EM DIA'}
                          </span>
                        </div>
                        <h5 className="font-bold text-base text-white mt-1">{v.modelo}</h5>
                        <p className="text-xs text-slate-400">
                          Motorista: <strong className="text-slate-200">{v.contratoAtivo?.motoristaNome || 'Locação Ativa'}</strong> • Chassi: <span className="font-mono">{v.chassi}</span>
                        </p>
                      </div>

                      <button
                        onClick={() => onOpenDossie(v)}
                        className="text-xs text-blue-400 hover:text-blue-300 font-semibold transition cursor-pointer"
                      >
                        Dossiê →
                      </button>
                    </div>

                    {/* Progress Bar & Odômetro */}
                    <div className="mt-4 pt-3 border-t border-white/5 space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">
                          KM Atual: <strong className="text-slate-200">{formatKm(v.kmAtual)}</strong>
                        </span>
                        <span className="text-slate-400">
                          Última Revisão: <strong className="text-slate-200">{formatKm(v.kmUltimaRevisao)}</strong>
                        </span>
                      </div>

                      <div className="w-full bg-white/5 h-2.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            rev.isUrgente ? 'bg-rose-500' : rev.isAtencao ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${rev.porcentagem}%` }}
                        />
                      </div>

                      <div className="flex justify-between items-center text-[11px]">
                        <span className={`font-bold ${rev.isUrgente ? 'text-rose-400' : 'text-slate-300'}`}>
                          {formatKm(rev.kmRodadosDesdeRevisao)} rodados ({rev.porcentagem}% do ciclo de 10.000 KM)
                        </span>
                        <span className="text-slate-400">
                          {rev.isUrgente ? 'Excedeu em ' + formatKm(rev.kmRodadosDesdeRevisao - 10000) : formatKm(rev.kmRestantes) + ' até a próxima'}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                      <button
                        onClick={() => {
                          const novoKm = prompt(`Atualizar Odômetro Atual do veículo ${v.placa}:`, String(v.kmAtual));
                          if (novoKm && !isNaN(Number(novoKm))) {
                            onAtualizarKm(v.id, Number(novoKm));
                          }
                        }}
                        className="text-xs text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer"
                      >
                        Ajustar Odômetro
                      </button>

                      <button
                        onClick={() => onOpenRegistrarRevisao(v)}
                        className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Wrench size={14} /> Registrar Revisão Feita
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ENVIAR / ATUALIZAR VEÍCULO EM OFICINA / PREPARAÇÃO                */}
      {/* ========================================================================= */}
      {modalFornecedorOpen && selectedVeiculoFornecedor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg max-h-[90vh] flex flex-col bg-gray-900 border border-white/10 rounded-2xl text-white shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-white/10 bg-[#16171e] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold">
                  <Wrench size={20} />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">
                    Alocar em Oficina / Preparação
                  </h4>
                  <p className="text-xs text-slate-400">
                    {selectedVeiculoFornecedor.modelo} • <span className="font-mono text-slate-200">{selectedVeiculoFornecedor.placa}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setModalFornecedorOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg bg-white/5 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">
                  Fornecedor / Oficina Parceira *
                </label>
                <select
                  value={modalFormFornecedorId}
                  onChange={(e) => setModalFormFornecedorId(e.target.value)}
                  className="w-full bg-[#16171e] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">Selecione um parceiro cadastrado...</option>
                  {fornecedores.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome} — ({f.categoria})
                    </option>
                  ))}
                </select>
                {fornecedores.length === 0 && (
                  <p className="text-[11px] text-amber-400 mt-1">
                    Nenhum fornecedor cadastrado. Vá na aba de Fornecedores para cadastrar parceiros.
                  </p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">
                  Serviço a Ser Executado *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Revisão mecânica de freios, pintura para-choque, polimento técnico..."
                  value={modalFormServico}
                  onChange={(e) => setModalFormServico(e.target.value)}
                  className="w-full bg-[#16171e] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1.5">
                    Data de Envio
                  </label>
                  <input
                    type="date"
                    value={modalFormDataEnvio}
                    onChange={(e) => setModalFormDataEnvio(e.target.value)}
                    className="w-full bg-[#16171e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1.5">
                    Previsão de Retorno ao Pátio
                  </label>
                  <input
                    type="date"
                    value={modalFormPrevisaoRetorno}
                    onChange={(e) => setModalFormPrevisaoRetorno(e.target.value)}
                    className="w-full bg-[#16171e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1.5">
                    Status do Atendimento
                  </label>
                  <select
                    value={modalFormStatusPrep}
                    onChange={(e) => setModalFormStatusPrep(e.target.value as any)}
                    className="w-full bg-[#16171e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="Aguardando Envio">Aguardando Envio</option>
                    <option value="Em Orçamento">Em Orçamento</option>
                    <option value="Em Execução">Em Execução</option>
                    <option value="Pronto para Retirada">Pronto para Retirada</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1.5">
                    Custo Estimado (R$)
                  </label>
                  <input
                    type="number"
                    placeholder="0,00"
                    value={modalFormCustoEstimado}
                    onChange={(e) => setModalFormCustoEstimado(e.target.value ? Number(e.target.value) : '')}
                    className="w-full bg-[#16171e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-5 border-t border-white/10 bg-[#16171e] flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setModalFornecedorOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSalvarEnvioOficina}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Check size={14} />
                <span>Salvar Alocação</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
