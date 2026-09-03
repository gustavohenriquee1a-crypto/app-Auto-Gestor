import React, { useState, useMemo } from 'react';
import {
  Receipt,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  Car,
  Building2,
  Calendar,
  CreditCard,
  Wallet,
  ArrowUpDown,
  PlusCircle,
  FileText,
  Tag,
  ExternalLink,
  Edit2,
  Trash2,
  Printer,
  ChevronRight,
  ChevronDown,
  ShieldCheck,
  Check,
  Building,
  Sparkles,
  Eye,
  EyeOff,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  Users,
  Briefcase,
  Layers,
  Percent,
  CheckSquare,
  Copy,
  CheckCheck,
  Send,
  Phone,
  ArrowUpRight,
  Wrench
} from 'lucide-react';
import {
  Veiculo,
  DespesaVeiculo,
  CategoriaDespesa,
  DespesaFixa,
  FornecedorPrestador,
  ContaBancariaCaixa,
  Usuario
} from '../types';

interface ContasPagarViewProps {
  veiculos: Veiculo[];
  despesasFixas?: DespesaFixa[];
  fornecedores?: FornecedorPrestador[];
  contasBancarias?: ContaBancariaCaixa[];
  currentUser?: Usuario | null;
  onOpenNovaDespesa: (veiculo?: Veiculo) => void;
  onOpenNovaDespesaFixa?: () => void;
  onOpenDossie: (veiculo: Veiculo) => void;
  onEditDespesa?: (despesa: DespesaVeiculo, veiculo: Veiculo) => void;
  onDeleteDespesa?: (veiculoId: string, despesaId: string) => void;
  onEfetivarPagamento: (
    veiculoId: string,
    despesaId: string,
    pagamentoInfo: {
      dataPagamento: string;
      formaPagamento: string;
      contaBancariaId?: string;
      contaBancariaNome?: string;
      observacaoPagamento?: string;
    }
  ) => Promise<void> | void;
  onEfetivarPagamentoDespesaFixa?: (
    despesaId: string,
    pagamentoInfo: {
      dataPagamento: string;
      formaPagamento: string;
      contaBancariaId?: string;
      contaBancariaNome?: string;
      observacaoPagamento?: string;
    }
  ) => Promise<void> | void;
}

export type TipoOrigemDespesa = 'todas' | 'chassi' | 'loja';

export type FiltroExigibilidade =
  | 'todas_ativas'           // Listagem Diária Normal: Imediatas + Condicionais já Liberadas pós-venda (Oculta condicionais de carros em estoque)
  | 'apenas_condicionais'    // Todas as Despesas Condicionais ("No ato da venda")
  | 'condicionais_aguardando'// Apenas Condicionais em Espera (Carro em estoque/preparação, invisíveis no dia a dia)
  | 'condicionais_liberadas' // Apenas Condicionais Liberadas (Veículo vendido, prontas p/ quitação)
  | 'apenas_imediatas'       // Apenas Despesas Imediatas / Sem Condição de Venda
  | 'todas';                 // Todas as Despesas sem qualquer restrição

export interface DespesaUnificadaItem {
  id: string;
  tipoOrigem: 'chassi' | 'loja';
  descricao: string;
  categoria: string;
  valor: number;
  dataCompetencia: string;
  dataVencimento?: string;
  statusPagamento: 'Pago' | 'Pendente';
  dataPagamento?: string;
  formaPagamento?: string;
  contaBancariaId?: string;
  contaBancariaNome?: string;
  fornecedorNome?: string;
  fornecedorId?: string;
  nfNumero?: string;
  observacoes?: string;
  
  // Específico de Chassi / Veículo
  veiculo?: Veiculo;
  veiculoId?: string;
  placa?: string;
  chassi?: string;
  modelo?: string;
  exigibilidade?: 'imediata' | 'no_ato_venda';
  isNoAtoVenda?: boolean;
  isCarroVendido?: boolean;
  
  // Referência original
  rawDespesaChassi?: DespesaVeiculo;
  rawDespesaFixa?: DespesaFixa;
}

export interface ExtratoParceiroResumo {
  fornecedorId?: string;
  nome: string;
  categoria?: string;
  tipoCobranca?: string;
  diaFechamentoFatura?: number;
  diaVencimentoPagamento?: number;
  valorContratoMensal?: number;
  telefone?: string;
  whatsapp?: string;
  chavePix?: string;
  tipoChavePix?: string;
  bancoDadosBancarios?: string;
  totalGeral: number;
  totalPendente: number;
  totalPago: number;
  totalVariavelPendente: number; // Despesas variáveis pendentes de liquidação
  totalRetidoEstoque: number; // Despesas no ato da venda aguardando venda do carro
  qtdServicosPendentes: number;
  qtdServicosTotal: number;
  itens: DespesaUnificadaItem[];
}

export const ContasPagarView: React.FC<ContasPagarViewProps> = ({
  veiculos,
  despesasFixas = [],
  fornecedores = [],
  contasBancarias = [],
  currentUser,
  onOpenNovaDespesa,
  onOpenNovaDespesaFixa,
  onOpenDossie,
  onEditDespesa,
  onDeleteDespesa,
  onEfetivarPagamento,
  onEfetivarPagamentoDespesaFixa,
}) => {
  // Aba Ativa Principal: Títulos/Faturas vs Agrupado por Fornecedor (Fechamento & Lote)
  const [activeTabContas, setActiveTabContas] = useState<'titulos' | 'agrupado_fornecedor'>('titulos');

  // Estados de Filtros e Busca Avançada - Aba Títulos Individuais
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroTipoOrigem, setFiltroTipoOrigem] = useState<TipoOrigemDespesa>('todas');
  const [filtroExigibilidade, setFiltroExigibilidade] = useState<FiltroExigibilidade>('todas_ativas');
  const [filtroStatus, setFiltroStatus] = useState<'Todos' | 'Pendente' | 'Pago'>('Pendente');
  const [filtroPlaca, setFiltroPlaca] = useState<string>('Todas');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('Todas');
  const [filtroFornecedor, setFiltroFornecedor] = useState<string>('Todos');
  const [filtroPeriodo, setFiltroPeriodo] = useState<'todos' | 'mes_atual' | 'ultimos_30' | 'ano_atual' | 'personalizado'>('todos');
  const [dataInicio, setDataInicio] = useState<string>('');
  const [dataFim, setDataFim] = useState<string>('');
  const [ordenacao, setOrdenacao] = useState<'data_desc' | 'data_asc' | 'valor_desc' | 'valor_asc'>('data_desc');

  // Estados Específicos da Aba Agrupada por Fornecedor (Fechamento & Lote)
  const [filtroFornecedorAgrupado, setFiltroFornecedorAgrupado] = useState<string>('todos');
  const [buscaFornecedorTexto, setBuscaFornecedorTexto] = useState<string>('');
  const [filtroPeriodoFechamento, setFiltroPeriodoFechamento] = useState<'todos' | 'mes_atual' | 'mes_anterior' | 'personalizado'>('mes_atual');
  const [dataFechamentoInicio, setDataFechamentoInicio] = useState<string>('');
  const [dataFechamentoFim, setDataFechamentoFim] = useState<string>('');
  const [filtroStatusAgrupado, setFiltroStatusAgrupado] = useState<'apenas_pendentes' | 'todos' | 'quitados'>('apenas_pendentes');

  // Parceiro selecionado no Extrato (para visualização de detalhe / gaveta de serviços)
  const [parceiroExtratoExpandido, setParceiroExtratoExpandido] = useState<string | null>(null);

  // Modal de Baixa Rápida Individual
  const [modalBaixaOpen, setModalBaixaOpen] = useState(false);
  const [selectedItemParaBaixa, setSelectedItemParaBaixa] = useState<DespesaUnificadaItem | null>(null);
  const [dataPagamentoBaixa, setDataPagamentoBaixa] = useState(new Date().toISOString().split('T')[0]);
  const [formaPagamentoBaixa, setFormaPagamentoBaixa] = useState('PIX');
  const [contaBancariaIdBaixa, setContaBancariaIdBaixa] = useState('');
  const [obsPagamentoBaixa, setObsPagamentoBaixa] = useState('');
  const [isProcessingBaixa, setIsProcessingBaixa] = useState(false);

  // Modal de Quitação em Lote por Parceiro
  const [modalLoteOpen, setModalLoteOpen] = useState(false);
  const [parceiroParaLote, setParceiroParaLote] = useState<ExtratoParceiroResumo | null>(null);
  const [itensSelecionadosLote, setItensSelecionadosLote] = useState<string[]>([]);
  const [isProcessingLote, setIsProcessingLote] = useState(false);
  const [pixCopiado, setPixCopiado] = useState(false);
  const [notificacaoSucessoLote, setNotificacaoSucessoLote] = useState<string | null>(null);

  // 1. Unificação Completa de Despesas de Chassi + Despesas da Loja
  const todasDespesasUnificadas: DespesaUnificadaItem[] = useMemo(() => {
    const lista: DespesaUnificadaItem[] = [];

    // A) Despesas por Chassi (Veículos)
    veiculos.forEach((v) => {
      const isCarroVendido = v.status === 'Vendido' || v.status_estoque === 'Vendido';

      if (v.despesas && Array.isArray(v.despesas)) {
        v.despesas.forEach((d) => {
          const isNoAtoVenda =
            d.exigibilidade === 'no_ato_venda' ||
            (!d.exigibilidade &&
              ['Cartório / Serviços Notariais', 'Documentação / Despachante', 'Comissão'].includes(
                d.categoria
              ));

          lista.push({
            id: d.id,
            tipoOrigem: 'chassi',
            descricao: d.descricao,
            categoria: d.categoria,
            valor: Number(d.valor || 0),
            dataCompetencia: d.data,
            dataVencimento: d.dataVencimento || d.data,
            statusPagamento: d.statusPagamento || 'Pago',
            dataPagamento: d.dataPagamento,
            formaPagamento: d.formaPagamento,
            contaBancariaId: d.contaBancariaId,
            contaBancariaNome: d.contaBancariaNome,
            fornecedorNome: d.fornecedor,
            fornecedorId: d.fornecedorId,
            nfNumero: d.nfNumero,
            observacoes: d.observacoes,
            veiculo: v,
            veiculoId: v.id,
            placa: d.placa || v.placa,
            chassi: d.chassi || v.chassi,
            modelo: v.modelo,
            exigibilidade: d.exigibilidade || (isNoAtoVenda ? 'no_ato_venda' : 'imediata'),
            isNoAtoVenda,
            isCarroVendido,
            rawDespesaChassi: d,
          });
        });
      }
    });

    // B) Despesas Operacionais / Fixas da Loja
    despesasFixas.forEach((df) => {
      lista.push({
        id: df.id,
        tipoOrigem: 'loja',
        descricao: df.descricao || df.nome || 'Despesa Operacional Loja',
        categoria: df.categoria || 'Estruturais & Fiscais',
        valor: Number(df.valor || 0),
        dataCompetencia: df.mesReferencia ? `${df.mesReferencia}-01` : df.dataVencimento || '',
        dataVencimento: df.dataVencimento,
        statusPagamento: df.status || 'Pago',
        dataPagamento: df.dataPagamento,
        formaPagamento: df.formaPagamento,
        contaBancariaId: df.contaBancariaId,
        contaBancariaNome: df.contaBancariaNome,
        fornecedorNome: df.fornecedorNome || df.nome || 'Favorecido Loja',
        fornecedorId: df.fornecedorId,
        nfNumero: df.nfNumero,
        observacoes: df.observacoes,
        exigibilidade: 'imediata',
        isNoAtoVenda: false,
        isCarroVendido: false,
        rawDespesaFixa: df,
      });
    });

    return lista;
  }, [veiculos, despesasFixas]);

  // Contagem e valores de Despesas Condicionais 'No Ato da Venda' retidas (Carro ainda em estoque)
  const previsoesNoAtoVendaPendentes = useMemo(() => {
    return todasDespesasUnificadas.filter(
      (item) =>
        item.tipoOrigem === 'chassi' &&
        item.statusPagamento === 'Pendente' &&
        item.isNoAtoVenda &&
        !item.isCarroVendido
    );
  }, [todasDespesasUnificadas]);

  const totalPrevisoesNoAtoVenda = useMemo(() => {
    return previsoesNoAtoVendaPendentes.reduce((acc, item) => acc + item.valor, 0);
  }, [previsoesNoAtoVendaPendentes]);

  // Despesas Condicionais 'No Ato da Venda' LIBERADAS (Veículo Vendido) prontas para pagamento
  const despesasCondicionaisLiberadas = useMemo(() => {
    return todasDespesasUnificadas.filter(
      (item) =>
        item.tipoOrigem === 'chassi' &&
        item.statusPagamento === 'Pendente' &&
        item.isNoAtoVenda &&
        item.isCarroVendido
    );
  }, [todasDespesasUnificadas]);

  const totalCondicionaisLiberadas = useMemo(() => {
    return despesasCondicionaisLiberadas.reduce((acc, item) => acc + item.valor, 0);
  }, [despesasCondicionaisLiberadas]);

  // Despesas Imediatas Pendentes
  const despesasImediatasPendentes = useMemo(() => {
    return todasDespesasUnificadas.filter(
      (item) => item.statusPagamento === 'Pendente' && !item.isNoAtoVenda
    );
  }, [todasDespesasUnificadas]);

  // Lista de placas únicas disponíveis para filtro
  const listaPlacasDisponiveis = useMemo(() => {
    const map = new Map<string, string>();
    veiculos.forEach((v) => {
      if (v.placa) {
        map.set(v.placa, `${v.placa} - ${v.modelo}`);
      }
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [veiculos]);

  // Lista de fornecedores únicos disponíveis para filtro
  const listaFornecedoresDisponiveis = useMemo(() => {
    const set = new Set<string>();
    fornecedores.forEach((f) => {
      if (f.nome && f.nome.trim()) set.add(f.nome.trim());
    });
    todasDespesasUnificadas.forEach((item) => {
      if (item.fornecedorNome && item.fornecedorNome.trim()) {
        set.add(item.fornecedorNome.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [fornecedores, todasDespesasUnificadas]);

  // Lista de categorias únicas para filtro
  const listaCategoriasDisponiveis = useMemo(() => {
    const set = new Set<string>();
    todasDespesasUnificadas.forEach((item) => {
      if (item.categoria) set.add(item.categoria);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [todasDespesasUnificadas]);

  // Cálculos de KPIs Globais (Considerando apenas pendências ativas exigíveis: Imediatas + Condicionais de Carros Vendidos)
  const kpis = useMemo(() => {
    const hoje = new Date();
    const mesAtualPrefix = hoje.toISOString().substring(0, 7);

    let totalPendente = 0;
    let qtdPendente = 0;
    let qtdImediatas = 0;
    let qtdLiberadasPorVenda = 0;
    let totalLiberadasPorVenda = 0;
    let totalCriticoAtrasado = 0;
    let qtdCriticoAtrasado = 0;
    let totalPagoMes = 0;
    let qtdPagoMes = 0;

    todasDespesasUnificadas.forEach((item) => {
      const valor = item.valor;
      const isPago = item.statusPagamento === 'Pago';

      // Regra de Exigibilidade:
      // Se for 'No ato da venda' e o carro ainda NÃO estiver vendido, não computa na dívida diária ativa.
      // Assim que o carro for Vendido (isCarroVendido === true), ela se torna exigível imediatamente!
      const isExigivelImediato = !(item.isNoAtoVenda && !item.isCarroVendido);

      if (!isPago) {
        if (isExigivelImediato) {
          totalPendente += valor;
          qtdPendente++;

          if (item.isNoAtoVenda && item.isCarroVendido) {
            qtdLiberadasPorVenda++;
            totalLiberadasPorVenda += valor;
          } else {
            qtdImediatas++;
          }

          // Vencimento ultrapassado ou em atraso
          if (item.dataVencimento) {
            const dataVenc = new Date(item.dataVencimento);
            if (dataVenc < hoje) {
              totalCriticoAtrasado += valor;
              qtdCriticoAtrasado++;
            }
          }
        }
      } else {
        const dataPag = item.dataPagamento || item.dataCompetencia;
        if (dataPag && dataPag.startsWith(mesAtualPrefix)) {
          totalPagoMes += valor;
          qtdPagoMes++;
        }
      }
    });

    return {
      totalPendente,
      qtdPendente,
      qtdImediatas,
      qtdLiberadasPorVenda,
      totalLiberadasPorVenda,
      totalCriticoAtrasado,
      qtdCriticoAtrasado,
      totalPagoMes,
      qtdPagoMes,
    };
  }, [todasDespesasUnificadas]);

  // Filtragem e Ordenação da Visão Analítica de Títulos
  const despesasFiltradas = useMemo(() => {
    const hoje = new Date();
    const mesAtualPrefix = hoje.toISOString().substring(0, 7);
    const anoAtualPrefix = hoje.getFullYear().toString();
    const trintaDiasAtras = new Date(hoje.getTime() - 30 * 24 * 60 * 1000);

    return todasDespesasUnificadas
      .filter((item) => {
        // Regra de Filtro de Exigibilidade / Despesas Condicionais 'No Ato da Venda':
        if (filtroExigibilidade === 'todas_ativas') {
          // Listagem Diária Normal de Contas a Pagar:
          // Se for 'No ato da venda' E o veículo NÃO estiver vendido, fica INVISÍVEL!
          // Assim que o status do veículo for alterado para 'Vendido' (item.isCarroVendido === true), o sistema LIBERA na grade diária!
          if (item.isNoAtoVenda && !item.isCarroVendido && item.statusPagamento === 'Pendente') {
            return false;
          }
        } else if (filtroExigibilidade === 'apenas_condicionais') {
          // Exibe todas as despesas condicionais ('No ato da venda')
          if (!item.isNoAtoVenda) return false;
        } else if (filtroExigibilidade === 'condicionais_aguardando') {
          // Apenas despesas condicionais de veículos ainda em estoque (aguardando venda)
          if (!item.isNoAtoVenda || item.isCarroVendido || item.statusPagamento !== 'Pendente') {
            return false;
          }
        } else if (filtroExigibilidade === 'condicionais_liberadas') {
          // Apenas despesas condicionais liberadas (veículo vendido no sistema)
          if (!item.isNoAtoVenda || !item.isCarroVendido) {
            return false;
          }
        } else if (filtroExigibilidade === 'apenas_imediatas') {
          // Apenas despesas com exigibilidade imediata / diretas
          if (item.isNoAtoVenda) return false;
        }
        // Se 'todas', não aplica nenhum filtro restritivo de exigibilidade.

        // 1. Filtro Tipo de Origem (Chassi vs Loja)
        if (filtroTipoOrigem === 'chassi' && item.tipoOrigem !== 'chassi') return false;
        if (filtroTipoOrigem === 'loja' && item.tipoOrigem !== 'loja') return false;

        // 2. Filtro Status
        if (filtroStatus !== 'Todos' && item.statusPagamento !== filtroStatus) {
          return false;
        }

        // 3. Filtro Placa
        if (filtroPlaca !== 'Todas') {
          const placaItem = (item.placa || '').toUpperCase().trim();
          if (placaItem !== filtroPlaca.toUpperCase().trim()) {
            return false;
          }
        }

        // 4. Filtro Categoria
        if (filtroCategoria !== 'Todas' && item.categoria !== filtroCategoria) {
          return false;
        }

        // 5. Filtro Fornecedor
        if (filtroFornecedor !== 'Todos') {
          const fornItem = item.fornecedorNome || '';
          if (
            fornItem.toLowerCase() !== filtroFornecedor.toLowerCase() &&
            item.fornecedorId !== filtroFornecedor
          ) {
            return false;
          }
        }

        // 6. Filtro Data / Período
        const dataRef = item.dataPagamento || item.dataVencimento || item.dataCompetencia || '';
        if (filtroPeriodo === 'mes_atual') {
          if (!dataRef.startsWith(mesAtualPrefix)) return false;
        } else if (filtroPeriodo === 'ano_atual') {
          if (!dataRef.startsWith(anoAtualPrefix)) return false;
        } else if (filtroPeriodo === 'ultimos_30') {
          if (!dataRef || new Date(dataRef) < trintaDiasAtras) return false;
        } else if (filtroPeriodo === 'personalizado' || dataInicio || dataFim) {
          if (dataInicio && dataRef < dataInicio) return false;
          if (dataFim && dataRef > dataFim) return false;
        }

        // 7. Busca Textual Geral
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          const matchPlaca = item.placa?.toLowerCase().includes(term);
          const matchModelo = item.modelo?.toLowerCase().includes(term);
          const matchChassi = item.chassi?.toLowerCase().includes(term);
          const matchDesc = item.descricao?.toLowerCase().includes(term);
          const matchForn = item.fornecedorNome?.toLowerCase().includes(term);
          const matchNf = item.nfNumero?.toLowerCase().includes(term);

          if (!matchPlaca && !matchModelo && !matchChassi && !matchDesc && !matchForn && !matchNf) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (ordenacao === 'data_desc') {
          const dateA = new Date(a.dataVencimento || a.dataCompetencia || '').getTime();
          const dateB = new Date(b.dataVencimento || b.dataCompetencia || '').getTime();
          return dateB - dateA;
        }
        if (ordenacao === 'data_asc') {
          const dateA = new Date(a.dataVencimento || a.dataCompetencia || '').getTime();
          const dateB = new Date(b.dataVencimento || b.dataCompetencia || '').getTime();
          return dateA - dateB;
        }
        if (ordenacao === 'valor_desc') {
          return b.valor - a.valor;
        }
        if (ordenacao === 'valor_asc') {
          return a.valor - b.valor;
        }
        return 0;
      });
  }, [
    todasDespesasUnificadas,
    filtroExigibilidade,
    filtroTipoOrigem,
    filtroStatus,
    filtroPlaca,
    filtroCategoria,
    filtroFornecedor,
    filtroPeriodo,
    dataInicio,
    dataFim,
    searchTerm,
    ordenacao,
  ]);

  // 2. Extrato Consolidado por Fornecedor / Parceiro (Agrupado por Fornecedor)
  const dataHojeRef = new Date().toISOString().split('T')[0];
  const anoMesAtualRef = dataHojeRef.substring(0, 7); // Ex: '2026-09'

  // Calcular mês anterior
  const anoMesAnteriorRef = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().substring(0, 7);
  }, []);

  const extratoParceiros: ExtratoParceiroResumo[] = useMemo(() => {
    const map = new Map<string, ExtratoParceiroResumo>();

    // Registrar fornecedores cadastrados
    fornecedores.forEach((f) => {
      const key = f.id || f.nome;
      map.set(key, {
        fornecedorId: f.id,
        nome: f.nome,
        categoria: f.categoria,
        tipoCobranca: f.tipoCobranca,
        diaFechamentoFatura: f.diaFechamentoFatura,
        diaVencimentoPagamento: f.diaVencimentoPagamento,
        valorContratoMensal: f.valorContratoMensal,
        telefone: f.telefone || f.whatsapp,
        whatsapp: f.whatsapp || f.telefone,
        chavePix: f.chavePix,
        tipoChavePix: f.tipoChavePix,
        bancoDadosBancarios: f.bancoDadosBancarios,
        totalGeral: 0,
        totalPendente: 0,
        totalPago: 0,
        totalVariavelPendente: 0,
        totalRetidoEstoque: 0,
        qtdServicosPendentes: 0,
        qtdServicosTotal: 0,
        itens: [],
      });
    });

    // Distribuir todas as despesas unificadas
    todasDespesasUnificadas.forEach((item) => {
      // Filtrar pelo período de fechamento selecionado
      if (filtroPeriodoFechamento === 'mes_atual') {
        const itemMes = (item.dataCompetencia || item.dataVencimento || '').substring(0, 7);
        if (itemMes && itemMes !== anoMesAtualRef) return;
      } else if (filtroPeriodoFechamento === 'mes_anterior') {
        const itemMes = (item.dataCompetencia || item.dataVencimento || '').substring(0, 7);
        if (itemMes && itemMes !== anoMesAnteriorRef) return;
      } else if (filtroPeriodoFechamento === 'personalizado') {
        const itemData = item.dataCompetencia || item.dataVencimento || '';
        if (dataFechamentoInicio && itemData < dataFechamentoInicio) return;
        if (dataFechamentoFim && itemData > dataFechamentoFim) return;
      }

      let key = item.fornecedorId;
      if (!key && item.fornecedorNome) {
        const fByName = fornecedores.find(
          (f) => f.nome.trim().toLowerCase() === item.fornecedorNome?.trim().toLowerCase()
        );
        if (fByName) {
          key = fByName.id || fByName.nome;
        } else {
          key = item.fornecedorNome.trim();
        }
      }

      if (!key) {
        key = 'Fornecedores Avulsos / Diversos';
      }

      if (!map.has(key)) {
        map.set(key, {
          fornecedorId: item.fornecedorId,
          nome: item.fornecedorNome || 'Fornecedor Parceiro',
          categoria: item.categoria,
          tipoCobranca: 'Variável por Serviço',
          totalGeral: 0,
          totalPendente: 0,
          totalPago: 0,
          totalVariavelPendente: 0,
          totalRetidoEstoque: 0,
          qtdServicosPendentes: 0,
          qtdServicosTotal: 0,
          itens: [],
        });
      }

      const entry = map.get(key)!;
      entry.itens.push(item);
      entry.totalGeral += item.valor;
      entry.qtdServicosTotal += 1;

      if (item.statusPagamento === 'Pago') {
        entry.totalPago += item.valor;
      } else {
        // Despesa pendente
        const isRetidoAguardandoVenda = item.isNoAtoVenda && !item.isCarroVendido;
        if (isRetidoAguardandoVenda) {
          entry.totalRetidoEstoque += item.valor;
        } else {
          entry.totalPendente += item.valor;
          entry.totalVariavelPendente += item.valor;
          entry.qtdServicosPendentes += 1;
        }
      }
    });

    // Converter para array e aplicar filtros de fornecedor, busca e status
    let resultado = Array.from(map.values()).filter(
      (p) => p.itens.length > 0 || (p.tipoCobranca === 'Fixo Mensal' && p.totalGeral >= 0)
    );

    // Filtro por Fornecedor Específico
    if (filtroFornecedorAgrupado !== 'todos') {
      resultado = resultado.filter(
        (p) => (p.fornecedorId && p.fornecedorId === filtroFornecedorAgrupado) || p.nome === filtroFornecedorAgrupado
      );
    }

    // Filtro por Texto de Busca (Nome, Categoria, Placa ou Descrição de Serviço)
    if (buscaFornecedorTexto.trim()) {
      const q = buscaFornecedorTexto.trim().toLowerCase();
      resultado = resultado.filter((p) => {
        const matchNome = p.nome.toLowerCase().includes(q);
        const matchCategoria = p.categoria?.toLowerCase().includes(q);
        const matchItens = p.itens.some(
          (it) =>
            it.descricao.toLowerCase().includes(q) ||
            it.placa?.toLowerCase().includes(q) ||
            it.modelo?.toLowerCase().includes(q)
        );
        return matchNome || matchCategoria || matchItens;
      });
    }

    // Filtro por Status das Contas do Parceiro
    if (filtroStatusAgrupado === 'apenas_pendentes') {
      resultado = resultado.filter((p) => p.totalVariavelPendente > 0);
    } else if (filtroStatusAgrupado === 'quitados') {
      resultado = resultado.filter((p) => p.totalPago > 0 && p.totalVariavelPendente === 0);
    }

    // Ordenação: parceiros com maior volume de despesas variáveis pendentes primeiro
    return resultado.sort((a, b) => b.totalVariavelPendente - a.totalVariavelPendente || b.totalGeral - a.totalGeral);
  }, [
    fornecedores,
    todasDespesasUnificadas,
    filtroPeriodoFechamento,
    anoMesAtualRef,
    anoMesAnteriorRef,
    dataFechamentoInicio,
    dataFechamentoFim,
    filtroFornecedorAgrupado,
    buscaFornecedorTexto,
    filtroStatusAgrupado,
  ]);

  // Indicadores Consolidados do Período de Fechamento
  const metricasFechamento = useMemo(() => {
    let totalPendenteVariavel = 0;
    let totalPago = 0;
    let totalGeral = 0;
    let totalServicosPendentes = 0;
    let fornecedoresComPendencia = 0;

    extratoParceiros.forEach((p) => {
      totalPendenteVariavel += p.totalVariavelPendente;
      totalPago += p.totalPago;
      totalGeral += p.totalGeral;
      totalServicosPendentes += p.qtdServicosPendentes;
      if (p.totalVariavelPendente > 0) {
        fornecedoresComPendencia += 1;
      }
    });

    return {
      totalPendenteVariavel,
      totalPago,
      totalGeral,
      totalServicosPendentes,
      fornecedoresComPendencia,
      totalFornecedoresVisiveis: extratoParceiros.length,
    };
  }, [extratoParceiros]);

  // Abertura do Modal de Baixa Rápida Individual
  const handleOpenBaixa = (item: DespesaUnificadaItem) => {
    setSelectedItemParaBaixa(item);
    setDataPagamentoBaixa(new Date().toISOString().split('T')[0]);
    setFormaPagamentoBaixa('PIX');
    setContaBancariaIdBaixa('');
    setObsPagamentoBaixa('');
    setModalBaixaOpen(true);
  };

  // Submissão da Baixa Rápida Individual
  const handleConfirmBaixa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemParaBaixa) return;

    setIsProcessingBaixa(true);
    try {
      const selectedConta = contasBancarias.find((c) => c.id === contaBancariaIdBaixa);

      if (selectedItemParaBaixa.tipoOrigem === 'chassi' && selectedItemParaBaixa.veiculoId) {
        await onEfetivarPagamento(
          selectedItemParaBaixa.veiculoId,
          selectedItemParaBaixa.id,
          {
            dataPagamento: dataPagamentoBaixa,
            formaPagamento: formaPagamentoBaixa,
            contaBancariaId: contaBancariaIdBaixa || undefined,
            contaBancariaNome: selectedConta ? selectedConta.nome : undefined,
            observacaoPagamento: obsPagamentoBaixa.trim() || undefined,
          }
        );
      } else if (selectedItemParaBaixa.tipoOrigem === 'loja' && onEfetivarPagamentoDespesaFixa) {
        await onEfetivarPagamentoDespesaFixa(
          selectedItemParaBaixa.id,
          {
            dataPagamento: dataPagamentoBaixa,
            formaPagamento: formaPagamentoBaixa,
            contaBancariaId: contaBancariaIdBaixa || undefined,
            contaBancariaNome: selectedConta ? selectedConta.nome : undefined,
            observacaoPagamento: obsPagamentoBaixa.trim() || undefined,
          }
        );
      }

      setModalBaixaOpen(false);
      setSelectedItemParaBaixa(null);
    } catch (err) {
      console.error('Erro ao efetivar pagamento:', err);
      alert('Ocorreu um erro ao registrar a baixa do pagamento.');
    } finally {
      setIsProcessingBaixa(false);
    }
  };

  // Itens Pendentes do Parceiro selecionado para o Modal de Lote
  const itensPendentesParaLote = useMemo(() => {
    if (!parceiroParaLote) return [];
    return parceiroParaLote.itens.filter(
      (i) => i.statusPagamento === 'Pendente' && !(i.isNoAtoVenda && !i.isCarroVendido)
    );
  }, [parceiroParaLote]);

  // Itens que estão efetivamente marcados no Modal de Lote
  const itensMarcadosNoLote = useMemo(() => {
    return itensPendentesParaLote.filter((i) => itensSelecionadosLote.includes(i.id));
  }, [itensPendentesParaLote, itensSelecionadosLote]);

  // Valor total acumulado dos itens selecionados no Lote
  const valorTotalLoteSelecionado = useMemo(() => {
    return itensMarcadosNoLote.reduce((acc, curr) => acc + curr.valor, 0);
  }, [itensMarcadosNoLote]);

  // Abrir Modal de Quitação em Lote
  const handleOpenQuitarLote = (parceiro: ExtratoParceiroResumo, servicoIdInicial?: string) => {
    setParceiroParaLote(parceiro);
    const pendentes = parceiro.itens.filter(
      (i) => i.statusPagamento === 'Pendente' && !(i.isNoAtoVenda && !i.isCarroVendido)
    );
    if (servicoIdInicial) {
      setItensSelecionadosLote([servicoIdInicial]);
    } else {
      setItensSelecionadosLote(pendentes.map((i) => i.id));
    }
    setDataPagamentoBaixa(new Date().toISOString().split('T')[0]);
    setFormaPagamentoBaixa('PIX');
    setContaBancariaIdBaixa('');
    setObsPagamentoBaixa(`Fechamento em Lote de Fatura - ${parceiro.nome}`);
    setModalLoteOpen(true);
  };

  // Alternar seleção de item no modal de quitação em lote
  const toggleItemLote = (itemId: string) => {
    setItensSelecionadosLote((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  // Marcar / Desmarcar todos no modal de lote
  const toggleTodosItensLote = () => {
    if (itensSelecionadosLote.length === itensPendentesParaLote.length) {
      setItensSelecionadosLote([]);
    } else {
      setItensSelecionadosLote(itensPendentesParaLote.map((i) => i.id));
    }
  };

  // Confirmar Quitação em Lote
  const handleConfirmQuitarLote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parceiroParaLote || itensMarcadosNoLote.length === 0) return;

    setIsProcessingLote(true);
    try {
      const selectedConta = contasBancarias.find((c) => c.id === contaBancariaIdBaixa);
      const totalBaixado = valorTotalLoteSelecionado;
      const qtdBaixada = itensMarcadosNoLote.length;

      for (const item of itensMarcadosNoLote) {
        if (item.tipoOrigem === 'chassi' && item.veiculoId) {
          await onEfetivarPagamento(item.veiculoId, item.id, {
            dataPagamento: dataPagamentoBaixa,
            formaPagamento: formaPagamentoBaixa,
            contaBancariaId: contaBancariaIdBaixa || undefined,
            contaBancariaNome: selectedConta ? selectedConta.nome : undefined,
            observacaoPagamento: obsPagamentoBaixa || `Liquidação em Lote (${parceiroParaLote.nome})`,
          });
        } else if (item.tipoOrigem === 'loja' && onEfetivarPagamentoDespesaFixa) {
          await onEfetivarPagamentoDespesaFixa(item.id, {
            dataPagamento: dataPagamentoBaixa,
            formaPagamento: formaPagamentoBaixa,
            contaBancariaId: contaBancariaIdBaixa || undefined,
            contaBancariaNome: selectedConta ? selectedConta.nome : undefined,
            observacaoPagamento: obsPagamentoBaixa || `Liquidação em Lote (${parceiroParaLote.nome})`,
          });
        }
      }

      setModalLoteOpen(false);
      setParceiroParaLote(null);
      setItensSelecionadosLote([]);
      setNotificacaoSucessoLote(
        `Quitação em lote concluída com sucesso! ${qtdBaixada} serviço(s) baixado(s), totalizando R$ ${totalBaixado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`
      );
      setTimeout(() => setNotificacaoSucessoLote(null), 6000);
    } catch (err) {
      console.error('Erro na baixa em lote:', err);
      alert('Ocorreu um erro ao processar os pagamentos em lote.');
    } finally {
      setIsProcessingLote(false);
    }
  };

  // Copiar chave PIX
  const handleCopiarPix = (chave: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(chave);
      setPixCopiado(true);
      setTimeout(() => setPixCopiado(false), 2000);
    }
  };

  // Gerar texto para conferência de fechamento via WhatsApp
  const handleCopiarTextoConferencia = (parceiro: ExtratoParceiroResumo) => {
    const pendentes = parceiro.itens.filter(
      (i) => i.statusPagamento === 'Pendente' && !(i.isNoAtoVenda && !i.isCarroVendido)
    );
    const linhasServicos = pendentes
      .map(
        (it) =>
          `• ${it.placa ? `[Placa ${it.placa}] ` : ''}${it.descricao} - R$ ${it.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${it.dataCompetencia})`
      )
      .join('\n');

    const texto = `📋 *FECHAMENTO DE FATURA - ${parceiro.nome.toUpperCase()}*\n` +
      `📅 Período de Fechamento: ${filtroPeriodoFechamento === 'mes_atual' ? 'Mês Atual' : 'Consolidado'}\n` +
      `🚗 Total de Serviços Vinculados: ${pendentes.length}\n` +
      `💰 *Total a Pagar / Fechamento: R$ ${parceiro.totalVariavelPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}*\n\n` +
      `*Relação dos Serviços Realizados:*\n` +
      `${linhasServicos}\n\n` +
      `Favor conferir os valores para autorização do repasse.`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(texto);
      alert('Resumo de fechamento copiado para a área de transferência! Pode colar diretamente no WhatsApp do parceiro.');
    }
  };

  const handleLimparFiltros = () => {
    setSearchTerm('');
    setFiltroTipoOrigem('todas');
    setFiltroExigibilidade('todas_ativas');
    setFiltroStatus('Todos');
    setFiltroPlaca('Todas');
    setFiltroCategoria('Todas');
    setFiltroFornecedor('Todos');
    setFiltroPeriodo('todos');
    setDataInicio('');
    setDataFim('');
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* 1. Header do Módulo & Ações */}
      <div className="bg-[#111116] p-5 sm:p-6 rounded-3xl border border-white/5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-md">
              <Receipt size={22} />
            </div>
            <div>
              <h2 className="font-black text-xl sm:text-2xl text-white tracking-tight flex items-center gap-2">
                Contas a Pagar & Extrato de Fornecedores
              </h2>
              <p className="text-xs text-slate-400">
                Separação rigorosa de custos por chassi vs. despesas operacionais da loja, com regras de vencimento e extrato por parceiro.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 text-xs font-bold transition flex items-center gap-2 cursor-pointer"
          >
            <Printer size={15} />
            Imprimir Relatório
          </button>

          {onOpenNovaDespesaFixa && (
            <button
              type="button"
              onClick={onOpenNovaDespesaFixa}
              className="px-4 py-2.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 text-xs font-bold transition flex items-center gap-2 cursor-pointer"
            >
              <Building2 size={16} />
              + Despesa da Loja (Operacional)
            </button>
          )}

          <button
            type="button"
            onClick={() => onOpenNovaDespesa()}
            className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-extrabold transition shadow-lg shadow-orange-600/30 flex items-center gap-2 cursor-pointer"
          >
            <PlusCircle size={16} />
            + Despesa no Chassi
          </button>
        </div>
      </div>

      {/* 2. KPI Cards Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total a Pagar Pendente Imediato (Grade Diária) */}
        <button
          type="button"
          onClick={() => {
            setFiltroExigibilidade('todas_ativas');
            setFiltroStatus('Pendente');
          }}
          className="text-left bg-[#16171f] p-5 rounded-2xl border border-amber-500/30 relative overflow-hidden group shadow-lg shadow-amber-950/10 hover:border-amber-500 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
              Contas a Pagar (Grade Diária)
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-110 transition">
              <Clock size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono tracking-tight">
              R$ {kpis.totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5 font-medium">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              <strong>{kpis.qtdPendente}</strong> conta{kpis.qtdPendente !== 1 ? 's' : ''} exigível{kpis.qtdPendente !== 1 ? 'is' : ''}
              {kpis.qtdLiberadasPorVenda > 0 && (
                <span className="text-emerald-400 font-semibold">({kpis.qtdLiberadasPorVenda} pós-venda)</span>
              )}
            </p>
          </div>
        </button>

        {/* Vencidas / Críticas */}
        <div className="bg-[#16171f] p-5 rounded-2xl border border-rose-500/30 relative overflow-hidden group shadow-lg shadow-rose-950/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-300 uppercase tracking-wider">
              Vencidas / Em Atraso
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <AlertCircle size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-rose-400 font-mono tracking-tight">
              R$ {kpis.totalCriticoAtrasado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-400 mt-1 font-medium">
              <strong>{kpis.qtdCriticoAtrasado}</strong> título{kpis.qtdCriticoAtrasado !== 1 ? 's' : ''} com prazo de vencimento estourado
            </p>
          </div>
        </div>

        {/* Quitado no Mês Atual */}
        <button
          type="button"
          onClick={() => {
            setFiltroStatus('Pago');
            setFiltroPeriodo('mes_atual');
          }}
          className="text-left bg-[#16171f] p-5 rounded-2xl border border-emerald-500/30 relative overflow-hidden group shadow-lg shadow-emerald-950/10 hover:border-emerald-500 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
              Quitado no Mês Atual
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono tracking-tight">
              R$ {kpis.totalPagoMes.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-400 mt-1 font-medium">
              <strong>{kpis.qtdPagoMes}</strong> baixa{kpis.qtdPagoMes !== 1 ? 's' : ''} processada{kpis.qtdPagoMes !== 1 ? 's' : ''} no caixa
            </p>
          </div>
        </button>

        {/* Despesas Condicionais 'No Ato da Venda' (Carros em Estoque / Invisíveis no Diário) */}
        <button
          type="button"
          onClick={() => {
            setFiltroExigibilidade(filtroExigibilidade === 'condicionais_aguardando' ? 'todas_ativas' : 'condicionais_aguardando');
          }}
          className={`text-left p-5 rounded-2xl border relative overflow-hidden group shadow-lg transition cursor-pointer ${
            filtroExigibilidade === 'condicionais_aguardando'
              ? 'bg-purple-900/30 border-purple-400 ring-2 ring-purple-500/30 shadow-purple-950/20'
              : 'bg-[#16171f] border-purple-500/30 hover:border-purple-400 shadow-purple-950/10'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">
              Condicionais (Aguardando Venda)
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center group-hover:scale-110 transition">
              <Sparkles size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-purple-300 font-mono tracking-tight">
              R$ {totalPrevisoesNoAtoVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-400 mt-1 font-medium flex items-center justify-between">
              <span><strong>{previsoesNoAtoVendaPendentes.length}</strong> retida{previsoesNoAtoVendaPendentes.length !== 1 ? 's' : ''} em estoque</span>
              <span className="text-[10px] text-purple-300 underline font-semibold">
                {filtroExigibilidade === 'condicionais_aguardando' ? 'Vendo Retidas' : 'Ver Retidas'}
              </span>
            </p>
          </div>
        </button>
      </div>

      {/* 3. Navegação de Abas: Títulos Analíticos vs Agrupado por Fornecedor (Fechamento) */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-2">
        <button
          type="button"
          onClick={() => setActiveTabContas('titulos')}
          className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition cursor-pointer ${
            activeTabContas === 'titulos'
              ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
              : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <Receipt size={15} />
          Títulos & Contas ({despesasFiltradas.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTabContas('agrupado_fornecedor')}
          className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition cursor-pointer ${
            activeTabContas === 'agrupado_fornecedor'
              ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
              : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <Building2 size={15} />
          <span>Agrupado por Fornecedor (Fechamento & Lote)</span>
          {metricasFechamento.totalPendenteVariavel > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              activeTabContas === 'agrupado_fornecedor' ? 'bg-black text-amber-300' : 'bg-amber-500/20 text-amber-300'
            }`}>
              R$ {metricasFechamento.totalPendenteVariavel.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
          )}
        </button>
      </div>

      {/* ================= ABA 1: TÍTULOS ANALÍTICOS ================= */}
      {activeTabContas === 'titulos' && (
        <div className="space-y-4 animate-fadeIn">
          {/* BANNER 1: Despesas Condicionais LIBERADAS PÓS-VENDA (Veículo Vendido) */}
          {despesasCondicionaisLiberadas.length > 0 && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3 text-emerald-200">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-300 shrink-0 shadow-sm shadow-emerald-500/20">
                  <Sparkles size={18} className="text-emerald-400 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="text-emerald-300 text-sm font-black">
                      🎉 {despesasCondicionaisLiberadas.length} Despesa(s) Condicional(is) Liberada(s) para Pagamento:
                    </strong>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                      Veículo Vendido
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-200/90 mt-0.5 leading-relaxed">
                    O status do veículo no sistema foi alterado para <strong>'Vendido'</strong>, liberando <strong>R$ {totalCondicionaisLiberadas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> em despesas condicionais (Cartório / Despachante / Comissão) para quitação imediata na grade de contas a pagar.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                {filtroExigibilidade !== 'condicionais_liberadas' ? (
                  <button
                    type="button"
                    onClick={() => setFiltroExigibilidade('condicionais_liberadas')}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-emerald-600/20"
                  >
                    <Sparkles size={14} /> Ver Liberadas ({despesasCondicionaisLiberadas.length})
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setFiltroExigibilidade('todas_ativas')}
                    className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    Ver Grade Diária Completa
                  </button>
                )}
              </div>
            </div>
          )}

          {/* BANNER 2: Informativo sobre Despesas Condicionais Retidas (Aguardando Venda) */}
          {previsoesNoAtoVendaPendentes.length > 0 && filtroExigibilidade === 'todas_ativas' && (
            <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3 text-purple-200">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-300 shrink-0">
                  <Clock size={16} />
                </div>
                <div>
                  <strong className="text-purple-300 font-bold">Filtro de Despesas Condicionais Ativo:</strong>
                  <p className="text-[11px] text-purple-200/80 mt-0.5">
                    Existem <strong>{previsoesNoAtoVendaPendentes.length}</strong> despesa(s) (Cartório, Despachante ou Comissão) somando <strong>R$ {totalPrevisoesNoAtoVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> que permanecem <strong>invisíveis na grade diária</strong> até que o status do respectivo veículo seja alterado para <strong>'Vendido'</strong>.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setFiltroExigibilidade('condicionais_aguardando')}
                className="px-3.5 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600/40 text-purple-200 border border-purple-500/40 text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto transition cursor-pointer shrink-0"
              >
                <Eye size={14} /> Ver Despesas Retidas em Estoque
              </button>
            </div>
          )}

          {/* Filtros e Barra de Busca */}
          <div className="bg-[#16171f] p-4 sm:p-5 rounded-2xl border border-white/10 space-y-3.5">
            {/* Linha 1: Filtro Rápido de Exigibilidade / Condicionais (Pills) */}
            <div className="flex items-center gap-1.5 flex-wrap pb-2 border-b border-white/5">
              <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
                <Filter size={13} /> Visão de Contas:
              </span>

              <button
                type="button"
                onClick={() => setFiltroExigibilidade('todas_ativas')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  filtroExigibilidade === 'todas_ativas'
                    ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                    : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                }`}
                title="Listagem Diária Normal: Imediatas + Condicionais de veículos já vendidos. Oculta custos de carros ainda em estoque."
              >
                <Clock size={13} />
                ⚡ Grade Diária Ativa
              </button>

              <button
                type="button"
                onClick={() => setFiltroExigibilidade('condicionais_liberadas')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  filtroExigibilidade === 'condicionais_liberadas'
                    ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
                    : 'bg-white/5 text-emerald-400/90 hover:text-emerald-300 hover:bg-emerald-500/10'
                }`}
                title="Despesas condicionais liberadas automaticamente porque o carro foi alterado para Vendido"
              >
                <Sparkles size={13} />
                🔥 Liberadas Pós-Venda ({despesasCondicionaisLiberadas.length})
              </button>

              <button
                type="button"
                onClick={() => setFiltroExigibilidade('condicionais_aguardando')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  filtroExigibilidade === 'condicionais_aguardando'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                    : 'bg-white/5 text-purple-300/90 hover:text-purple-200 hover:bg-purple-500/10'
                }`}
                title="Despesas com vencimento no ato da venda que estão retidas aguardando o carro ser vendido"
              >
                <Clock size={13} />
                ⏳ Aguardando Venda (Estoque) ({previsoesNoAtoVendaPendentes.length})
              </button>

              <button
                type="button"
                onClick={() => setFiltroExigibilidade('apenas_condicionais')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  filtroExigibilidade === 'apenas_condicionais'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'bg-white/5 text-indigo-300/90 hover:text-indigo-200 hover:bg-indigo-500/10'
                }`}
                title="Todas as despesas configuradas como No Ato da Venda (Cartórios, Despachantes, Comissões)"
              >
                <Sparkles size={13} />
                🔒 Todas Condicionais
              </button>

              <button
                type="button"
                onClick={() => setFiltroExigibilidade('apenas_imediatas')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  filtroExigibilidade === 'apenas_imediatas'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'bg-white/5 text-blue-300/90 hover:text-blue-200 hover:bg-blue-500/10'
                }`}
                title="Apenas despesas diretas / imediatas (sem regra de no ato da venda)"
              >
                <CheckCircle2 size={13} />
                🏢 Apenas Imediatas
              </button>

              <button
                type="button"
                onClick={() => setFiltroExigibilidade('todas')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  filtroExigibilidade === 'todas'
                    ? 'bg-slate-300 text-black shadow-md'
                    : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                }`}
                title="Todas as despesas sem qualquer filtro restritivo de exigibilidade"
              >
                🌐 Ver Todas
              </button>
            </div>

            {/* Linha 2: Tipo de Origem (Chassi vs Loja) + Busca Rápida */}
            <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
              {/* Filtro de Origem: Todas vs Chassi vs Loja */}
              <div className="flex items-center gap-1.5 p-1 bg-black/40 border border-white/10 rounded-xl w-full md:w-auto">
                <button
                  type="button"
                  onClick={() => setFiltroTipoOrigem('todas')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    filtroTipoOrigem === 'todas'
                      ? 'bg-amber-500 text-black shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Todas as Despesas
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroTipoOrigem('chassi')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    filtroTipoOrigem === 'chassi'
                      ? 'bg-orange-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Car size={13} /> Chassi (Carros)
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroTipoOrigem('loja')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    filtroTipoOrigem === 'loja'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Building2 size={13} /> Loja / Operacional
                </button>
              </div>

              {/* Input de Busca */}
              <div className="relative flex-1 w-full md:max-w-md">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por placa, modelo, chassi, parceiro, NF..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs outline-none focus:border-amber-500 placeholder-slate-500"
                />
              </div>
            </div>

            {/* Linha 3: Dropdowns de Filtro Avançado */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1 text-xs">
              {/* Exigibilidade / Condicional */}
              <div>
                <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">Exigibilidade:</label>
                <select
                  value={filtroExigibilidade}
                  onChange={(e) => setFiltroExigibilidade(e.target.value as any)}
                  className="w-full p-2 rounded-xl bg-black/40 border border-white/10 text-white outline-none focus:border-amber-500 font-semibold"
                >
                  <option value="todas_ativas">⚡ Grade Diária Ativa</option>
                  <option value="condicionais_liberadas">🔥 Liberadas Pós-Venda</option>
                  <option value="condicionais_aguardando">⏳ Em Estoque (Aguardando Venda)</option>
                  <option value="apenas_condicionais">🔒 Todas Condicionais</option>
                  <option value="apenas_imediatas">🏢 Apenas Imediatas</option>
                  <option value="todas">🌐 Todas as Contas</option>
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">Status:</label>
                <select
                  value={filtroStatus}
                  onChange={(e) => setFiltroStatus(e.target.value as any)}
                  className="w-full p-2 rounded-xl bg-black/40 border border-white/10 text-white outline-none focus:border-amber-500 font-semibold"
                >
                  <option value="Todos">Todos os Status</option>
                  <option value="Pendente">⏳ Apenas Pendentes</option>
                  <option value="Pago">✓ Apenas Pagos</option>
                </select>
              </div>

              {/* Veículo / Placa */}
              <div>
                <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">Placa / Carro:</label>
                <select
                  value={filtroPlaca}
                  onChange={(e) => setFiltroPlaca(e.target.value)}
                  className="w-full p-2 rounded-xl bg-black/40 border border-white/10 text-white outline-none focus:border-amber-500 font-semibold"
                >
                  <option value="Todas">Todas as Placas</option>
                  {listaPlacasDisponiveis.map(([placa, label]) => (
                    <option key={placa} value={placa}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Fornecedor */}
              <div>
                <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">Fornecedor / Parceiro:</label>
                <select
                  value={filtroFornecedor}
                  onChange={(e) => setFiltroFornecedor(e.target.value)}
                  className="w-full p-2 rounded-xl bg-black/40 border border-white/10 text-white outline-none focus:border-amber-500 font-semibold"
                >
                  <option value="Todos">Todos os Parceiros</option>
                  {listaFornecedoresDisponiveis.map((forn) => (
                    <option key={forn} value={forn}>
                      {forn}
                    </option>
                  ))}
                </select>
              </div>

              {/* Categoria */}
              <div>
                <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">Categoria:</label>
                <select
                  value={filtroCategoria}
                  onChange={(e) => setFiltroCategoria(e.target.value)}
                  className="w-full p-2 rounded-xl bg-black/40 border border-white/10 text-white outline-none focus:border-amber-500 font-semibold"
                >
                  <option value="Todas">Todas as Categorias</option>
                  {listaCategoriasDisponiveis.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Ordenação */}
              <div>
                <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">Ordenar Por:</label>
                <select
                  value={ordenacao}
                  onChange={(e) => setOrdenacao(e.target.value as any)}
                  className="w-full p-2 rounded-xl bg-black/40 border border-white/10 text-white outline-none focus:border-amber-500 font-semibold"
                >
                  <option value="data_desc">Data (Mais Recente)</option>
                  <option value="data_asc">Data (Mais Antiga)</option>
                  <option value="valor_desc">Maior Valor</option>
                  <option value="valor_asc">Menor Valor</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tabela de Títulos */}
          <div className="bg-[#111116] rounded-2xl border border-white/5 overflow-hidden">
            {despesasFiltradas.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <Receipt size={36} className="mx-auto text-slate-500" />
                <h4 className="font-bold text-white text-base">Nenhum título ou despesa encontrado</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {filtroExigibilidade === 'todas_ativas'
                    ? 'As despesas com exigibilidade "No ato da venda" de carros em estoque estão ocultas. Assim que o carro for Vendido, elas aparecem automaticamente aqui.'
                    : 'Ajuste os filtros selecionados ou cadastre uma nova despesa no chassi / loja.'}
                </p>
                <button
                  type="button"
                  onClick={handleLimparFiltros}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Limpar Todos os Filtros
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#16171f] text-slate-400 uppercase font-semibold border-b border-white/5 text-[11px]">
                      <th className="py-3.5 px-4">Origem / Chassi</th>
                      <th className="py-3.5 px-4">Descrição & Categoria</th>
                      <th className="py-3.5 px-4">Fornecedor / Favorecido</th>
                      <th className="py-3.5 px-4">Vencimento / Data</th>
                      <th className="py-3.5 px-4 text-right">Valor</th>
                      <th className="py-3.5 px-4 text-center">Status / Exigibilidade</th>
                      <th className="py-3.5 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {despesasFiltradas.map((item) => {
                      const isPendente = item.statusPagamento === 'Pendente';
                      const isNoAtoVendaAguardando = item.isNoAtoVenda && !item.isCarroVendido;
                      const isNoAtoVendaLiberado = item.isNoAtoVenda && item.isCarroVendido;

                      return (
                        <tr key={item.id} className="hover:bg-white/5 transition group">
                          {/* Origem / Chassi */}
                          <td className="py-3 px-4">
                            {item.tipoOrigem === 'chassi' && item.veiculo ? (
                              <button
                                type="button"
                                onClick={() => onOpenDossie(item.veiculo!)}
                                className="text-left group-hover:text-amber-400 transition cursor-pointer"
                              >
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-bold text-white block">
                                    {item.placa || 'SEM PLACA'}
                                  </span>
                                  {item.isCarroVendido && (
                                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-black border border-emerald-500/30">
                                      VENDIDO
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-400 line-clamp-1">
                                  {item.modelo || 'Veículo'}
                                </span>
                              </button>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <span className="px-2 py-0.5 rounded-md bg-blue-500/20 border border-blue-500/30 text-blue-300 font-bold text-[10px]">
                                  🏢 LOJA (FIXA)
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Descrição & Categoria */}
                          <td className="py-3 px-4">
                            <p className="font-bold text-white text-xs">{item.descricao}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-slate-400 font-medium bg-white/5 px-2 py-0.5 rounded border border-white/5">
                                {item.categoria}
                              </span>
                              {item.nfNumero && (
                                <span className="text-[10px] text-slate-400 font-mono">
                                  NF: {item.nfNumero}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Fornecedor */}
                          <td className="py-3 px-4">
                            <p className="font-semibold text-slate-200">{item.fornecedorNome || '—'}</p>
                          </td>

                          {/* Vencimento */}
                          <td className="py-3 px-4 font-mono text-slate-300">
                            {item.dataVencimento || item.dataCompetencia || '—'}
                          </td>

                          {/* Valor */}
                          <td className="py-3 px-4 text-right font-mono font-bold text-white text-sm">
                            R$ {item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>

                          {/* Status / Exigibilidade */}
                          <td className="py-3 px-4 text-center">
                            {item.statusPagamento === 'Pago' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                <CheckCircle2 size={11} /> Pago
                              </span>
                            ) : isNoAtoVendaLiberado ? (
                              <div className="inline-flex flex-col items-center">
                                <span
                                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-extrabold text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse shadow-sm shadow-emerald-500/10"
                                  title="Veículo Vendido! Despesa condicional liberada para pagamento na grade diária."
                                >
                                  <Sparkles size={12} className="text-emerald-400" /> 🔥 Liberada (Carro Vendido)
                                </span>
                                <span className="text-[9px] text-emerald-400/80 mt-0.5 font-medium">
                                  Liberada pós-venda
                                </span>
                              </div>
                            ) : isNoAtoVendaAguardando ? (
                              <div className="inline-flex flex-col items-center">
                                <span
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                  title="Despesa no ato da venda aguardando o veículo ser vendido. Fica invisível no diário."
                                >
                                  <Clock size={12} className="text-purple-400" /> ⏳ Condicional (Em Estoque)
                                </span>
                                <span className="text-[9px] text-purple-300/70 mt-0.5 font-medium">
                                  Invisível no diário até vender
                                </span>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                <Clock size={11} /> Pendente Imediato
                              </span>
                            )}
                          </td>

                          {/* Ações */}
                          <td className="py-3 px-4 text-right">
                            {isPendente ? (
                              <button
                                type="button"
                                onClick={() => handleOpenBaixa(item)}
                                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition shadow-sm flex items-center gap-1 ml-auto cursor-pointer ${
                                  isNoAtoVendaLiberado
                                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 ring-1 ring-emerald-400/50'
                                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                }`}
                              >
                                <Check size={13} /> Efetivar Baixa
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-500 font-mono">
                                Quitado em {item.dataPagamento || item.dataCompetencia}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= ABA 2: VISUALIZAÇÃO AGRUPADA POR FORNECEDOR (FECHAMENTO & LOTE) ================= */}
      {(activeTabContas === 'agrupado_fornecedor' || (activeTabContas as string) === 'extrato_parceiros') && (
        <div className="space-y-5 animate-fadeIn">
          {/* Banner de Notificação de Sucesso de Lote */}
          {notificacaoSucessoLote && (
            <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-between gap-3 text-emerald-200 animate-fadeIn shadow-lg shadow-emerald-950/20">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <CheckCircle2 size={18} />
                </div>
                <div>
                  <strong className="text-white text-xs">Baixa Registrada com Sucesso!</strong>
                  <p className="text-[11px] text-emerald-200/90 mt-0.5">{notificacaoSucessoLote}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setNotificacaoSucessoLote(null)}
                className="text-emerald-300 hover:text-white text-xs px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 cursor-pointer"
              >
                ✕ Fechar
              </button>
            </div>
          )}

          {/* Painel de Controle de Filtros do Fechamento Agrupado */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#16171e] border border-white/10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                  <Building2 size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-sm">
                    Painel de Fechamento por Fornecedor & Parceiro
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Soma de despesas variáveis e serviços pendentes, apuração do período e quitação em lote de faturas.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFiltroFornecedorAgrupado('todos');
                    setBuscaFornecedorTexto('');
                    setFiltroPeriodoFechamento('mes_atual');
                    setDataFechamentoInicio('');
                    setDataFechamentoFim('');
                    setFiltroStatusAgrupado('apenas_pendentes');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Filter size={13} />
                  Limpar Filtros
                </button>
              </div>
            </div>

            {/* Grid de Filtros */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* 1. Filtro por Fornecedor */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Filtrar por Parceiro / Oficina
                </label>
                <select
                  value={filtroFornecedorAgrupado}
                  onChange={(e) => setFiltroFornecedorAgrupado(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-black/40 border border-white/10 text-white outline-none focus:border-amber-500 text-xs font-semibold"
                >
                  <option value="todos">Todos os Fornecedores ({fornecedores.length || extratoParceiros.length})</option>
                  {fornecedores.map((f) => {
                    const resumo = extratoParceiros.find((p) => p.fornecedorId === f.id || p.nome === f.nome);
                    const pendenteVal = resumo ? resumo.totalVariavelPendente : 0;
                    return (
                      <option key={f.id || f.nome} value={f.id || f.nome}>
                        {f.nome} {pendenteVal > 0 ? `(R$ ${pendenteVal.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} pend.)` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* 2. Busca Rápida (Parceiro, Carro, Placa ou Serviço) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Busca por Texto / Placa
                </label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Nome, placa, funilaria..."
                    value={buscaFornecedorTexto}
                    onChange={(e) => setBuscaFornecedorTexto(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white outline-none focus:border-amber-500 text-xs"
                  />
                </div>
              </div>

              {/* 3. Período de Fechamento */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Período de Fechamento da Fatura
                </label>
                <select
                  value={filtroPeriodoFechamento}
                  onChange={(e) => setFiltroPeriodoFechamento(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl bg-black/40 border border-white/10 text-white outline-none focus:border-amber-500 text-xs font-semibold"
                >
                  <option value="mes_atual">Mês Atual ({anoMesAtualRef})</option>
                  <option value="mes_anterior">Mês Anterior ({anoMesAnteriorRef})</option>
                  <option value="todos">Todos os Períodos (Acumulado)</option>
                  <option value="personalizado">Personalizado (Data De/Até)</option>
                </select>
              </div>

              {/* 4. Status de Liquidação */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Status de Contas do Parceiro
                </label>
                <select
                  value={filtroStatusAgrupado}
                  onChange={(e) => setFiltroStatusAgrupado(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl bg-black/40 border border-white/10 text-white outline-none focus:border-amber-500 text-xs font-semibold"
                >
                  <option value="apenas_pendentes">Com Despesas a Pagar (Pendente)</option>
                  <option value="todos">Todos os Parceiros Cadastrados</option>
                  <option value="quitados">Apenas 100% Quitados no Período</option>
                </select>
              </div>
            </div>

            {/* Inputs de Período Personalizado */}
            {filtroPeriodoFechamento === 'personalizado' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/5 animate-fadeIn">
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-1">Data Início do Fechamento</label>
                  <input
                    type="date"
                    value={dataFechamentoInicio}
                    onChange={(e) => setDataFechamentoInicio(e.target.value)}
                    className="w-full p-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-1">Data Fim do Fechamento</label>
                  <input
                    type="date"
                    value={dataFechamentoFim}
                    onChange={(e) => setDataFechamentoFim(e.target.value)}
                    className="w-full p-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* KPI Cards do Fechamento Consolidado */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Total Pendente Variável a Pagar */}
            <div className="bg-[#16171f] p-5 rounded-2xl border border-amber-500/30 relative overflow-hidden shadow-lg shadow-amber-950/15">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">
                  Total Variável Pendente (A Pagar)
                </span>
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <DollarSign size={18} />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono tracking-tight">
                  R$ {metricasFechamento.totalPendenteVariavel.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 font-medium flex items-center justify-between">
                  <span>{metricasFechamento.totalServicosPendentes} serviço(s) aguardando lote</span>
                  <span className="text-amber-400/80 font-semibold">{metricasFechamento.fornecedoresComPendencia} parceiro(s)</span>
                </p>
              </div>
            </div>

            {/* KPI 2: Total Já Quitado no Período */}
            <div className="bg-[#16171f] p-5 rounded-2xl border border-emerald-500/30 relative overflow-hidden shadow-lg shadow-emerald-950/10">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">
                  Total Quitado no Período
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 size={18} />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono tracking-tight">
                  R$ {metricasFechamento.totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 font-medium">
                  Valores liquidados no período filtrado
                </p>
              </div>
            </div>

            {/* KPI 3: Total Geral Acumulado no Período */}
            <div className="bg-[#16171f] p-5 rounded-2xl border border-blue-500/30 relative overflow-hidden shadow-lg shadow-blue-950/10">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-blue-300 uppercase tracking-wider">
                  Total Geral Acumulado
                </span>
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <Receipt size={18} />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-black text-blue-300 font-mono tracking-tight">
                  R$ {metricasFechamento.totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 font-medium">
                  Volume bruto movimentado com parceiros
                </p>
              </div>
            </div>

            {/* KPI 4: Parceiros com Fatura em Aberto */}
            <div className="bg-[#16171f] p-5 rounded-2xl border border-white/10 relative overflow-hidden shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                  Parceiros a Fechar
                </span>
                <div className="w-8 h-8 rounded-xl bg-white/10 text-slate-300 flex items-center justify-center">
                  <Users size={18} />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
                  {metricasFechamento.fornecedoresComPendencia} / {metricasFechamento.totalFornecedoresVisiveis}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 font-medium">
                  Fornecedores com ordens abertas a pagar
                </p>
              </div>
            </div>
          </div>

          {/* Listagem de Faturas Agrupadas por Fornecedor */}
          {extratoParceiros.length === 0 ? (
            <div className="p-12 text-center bg-[#16171e] rounded-2xl border border-white/10">
              <Building2 size={36} className="mx-auto text-slate-600 mb-3" />
              <h4 className="text-white font-bold text-base">Nenhum fornecedor encontrado no filtro</h4>
              <p className="text-slate-400 text-xs mt-1 max-w-md mx-auto">
                Não foram localizadas despesas para o parceiro ou período selecionado. Tente alterar o período para "Todos os Períodos" ou limpar a busca.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {extratoParceiros.map((parceiro) => {
                const hasPendencias = parceiro.totalVariavelPendente > 0;
                const isExpanded = parceiroExtratoExpandido === parceiro.nome;
                const itensPendentes = parceiro.itens.filter(
                  (i) => i.statusPagamento === 'Pendente' && !(i.isNoAtoVenda && !i.isCarroVendido)
                );

                // Determinar status do ciclo de fechamento se houver dia cadastrado
                const diaHoje = new Date().getDate();
                const fechamentoPassou = parceiro.diaFechamentoFatura ? diaHoje >= parceiro.diaFechamentoFatura : false;

                return (
                  <div
                    key={parceiro.nome}
                    className={`rounded-2xl border transition-all flex flex-col justify-between overflow-hidden ${
                      hasPendencias
                        ? 'bg-[#15161f] border-amber-500/30 hover:border-amber-500/50 shadow-xl shadow-amber-950/10'
                        : 'bg-[#111116] border-white/10 hover:border-white/20'
                    }`}
                  >
                    {/* Topo do Card de Fornecedor */}
                    <div className="p-5 space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                            hasPendencias
                              ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          }`}>
                            <Wrench size={20} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-black text-white text-base leading-snug">
                                {parceiro.nome}
                              </h4>
                              {parceiro.tipoCobranca && (
                                <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${
                                  parceiro.tipoCobranca === 'Fixo Mensal'
                                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                                    : 'bg-white/5 text-slate-300 border-white/10'
                                }`}>
                                  {parceiro.tipoCobranca}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-400 mt-1 flex-wrap">
                              {parceiro.categoria && (
                                <span className="font-medium text-slate-300">{parceiro.categoria}</span>
                              )}
                              {parceiro.telefone && (
                                <>
                                  <span>•</span>
                                  <span className="text-slate-400 flex items-center gap-1 font-mono text-[11px]">
                                    <Phone size={11} /> {parceiro.telefone}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Botões Rápidos (PIX e WhatsApp) */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {parceiro.chavePix && (
                            <button
                              type="button"
                              onClick={() => handleCopiarPix(parceiro.chavePix!)}
                              title={`Copiar Chave PIX (${parceiro.chavePix})`}
                              className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-[11px] font-bold border border-white/10 flex items-center gap-1 transition cursor-pointer"
                            >
                              {pixCopiado ? <CheckCheck size={12} className="text-emerald-400" /> : <Copy size={12} />}
                              {pixCopiado ? 'Copiado!' : 'PIX'}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleCopiarTextoConferencia(parceiro)}
                            title="Copiar relatório formatado de fechamento para enviar no WhatsApp"
                            className="p-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition cursor-pointer"
                          >
                            <Send size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Informações Contratuais de Ciclo de Fechamento */}
                      <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-xs grid grid-cols-2 sm:grid-cols-3 gap-2">
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Fechamento da Fatura</span>
                          <span className="font-semibold text-slate-200">
                            {parceiro.diaFechamentoFatura ? `Todo dia ${parceiro.diaFechamentoFatura}` : 'Por Demanda'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Vencimento Repasse</span>
                          <span className="font-semibold text-amber-300 font-mono">
                            {parceiro.diaVencimentoPagamento ? `Todo dia ${parceiro.diaVencimentoPagamento}` : 'À Vista'}
                          </span>
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Status do Ciclo</span>
                          {parceiro.diaFechamentoFatura ? (
                            fechamentoPassou ? (
                              <span className="text-[10px] font-bold text-emerald-400 inline-flex items-center gap-1">
                                ● Fatura Fechada
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-blue-400 inline-flex items-center gap-1">
                                ○ Acumulando no Ciclo
                              </span>
                            )
                          ) : (
                            <span className="text-[10px] font-semibold text-slate-400">Fluxo Contínuo</span>
                          )}
                        </div>
                      </div>

                      {/* Bloco de Totais do Fechamento */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {/* 1. Despesas Variáveis Pendentes */}
                        <div className={`p-3 rounded-xl border ${
                          hasPendencias
                            ? 'bg-amber-500/10 border-amber-500/30'
                            : 'bg-white/[0.02] border-white/5'
                        }`}>
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">
                            Variável Pendente
                          </span>
                          <span className={`text-lg sm:text-xl font-black font-mono block mt-0.5 ${
                            hasPendencias ? 'text-amber-400' : 'text-slate-500'
                          }`}>
                            R$ {parceiro.totalVariavelPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[10px] text-slate-400 mt-0.5 block">
                            {itensPendentes.length} serviço{itensPendentes.length !== 1 ? 's' : ''} a liquidar
                          </span>
                        </div>

                        {/* 2. Total Quitado */}
                        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">
                            Total Já Quitado
                          </span>
                          <span className="text-lg sm:text-xl font-black font-mono text-emerald-400 block mt-0.5">
                            R$ {parceiro.totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[10px] text-emerald-400/80 mt-0.5 block">
                            Baixas efetivadas
                          </span>
                        </div>

                        {/* 3. Total Acumulado */}
                        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 col-span-2 sm:col-span-1">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">
                            Total do Período
                          </span>
                          <span className="text-lg sm:text-xl font-black font-mono text-white block mt-0.5">
                            R$ {parceiro.totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[10px] text-slate-400 mt-0.5 block">
                            {parceiro.qtdServicosTotal} lançamento(s)
                          </span>
                        </div>
                      </div>

                      {/* Aviso de Despesas Retidas em Estoque (No ato da venda) */}
                      {parceiro.totalRetidoEstoque > 0 && (
                        <div className="p-2.5 rounded-xl bg-purple-950/30 border border-purple-500/30 flex items-center justify-between text-xs text-purple-300">
                          <span className="flex items-center gap-1.5">
                            <Sparkles size={13} className="text-purple-400" />
                            Retido p/ Quitação após Venda:
                          </span>
                          <strong className="font-mono text-purple-200">
                            R$ {parceiro.totalRetidoEstoque.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </strong>
                        </div>
                      )}
                    </div>

                    {/* Rodapé do Card com Ações Principais */}
                    <div className="p-4 bg-black/30 border-t border-white/5 flex flex-wrap items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          setParceiroExtratoExpandido(isExpanded ? null : parceiro.nome)
                        }
                        className="text-xs text-slate-300 hover:text-white font-semibold flex items-center gap-1.5 py-1.5 px-2 rounded-lg hover:bg-white/5 transition cursor-pointer"
                      >
                        {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                        <span>{isExpanded ? 'Ocultar Detalhamento' : `Ver Serviços Vinculados (${parceiro.itens.length})`}</span>
                      </button>

                      <div className="flex items-center gap-2">
                        {hasPendencias && (
                          <button
                            type="button"
                            onClick={() => handleOpenQuitarLote(parceiro)}
                            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs shadow-lg shadow-amber-500/20 flex items-center gap-1.5 transition cursor-pointer"
                          >
                            <CheckSquare size={14} />
                            Quitar Fatura em Lote ({itensPendentes.length})
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Tabela Analítica de Serviços Vinculados (Expandida) */}
                    {isExpanded && (
                      <div className="p-4 bg-black/50 border-t border-white/10 space-y-3 animate-fadeIn">
                        <div className="flex items-center justify-between text-xs pb-2 border-b border-white/5">
                          <span className="font-bold text-slate-300 uppercase tracking-wider text-[10px]">
                            Relação Analítica de Serviços & Peças do Parceiro ({parceiro.itens.length})
                          </span>
                          {hasPendencias && (
                            <span className="text-[11px] text-amber-300 font-semibold">
                              {itensPendentes.length} pendência(s) de quitação
                            </span>
                          )}
                        </div>

                        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                          {parceiro.itens.map((item) => {
                            const isPendente = item.statusPagamento === 'Pendente';
                            const isRetido = item.isNoAtoVenda && !item.isCarroVendido;

                            return (
                              <div
                                key={item.id}
                                className={`p-3 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs ${
                                  isPendente
                                    ? isRetido
                                      ? 'bg-purple-950/20 border-purple-500/30'
                                      : 'bg-[#181924] border-amber-500/20 hover:border-amber-500/40'
                                    : 'bg-black/30 border-white/5 opacity-80'
                                }`}
                              >
                                <div className="space-y-1 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-white text-xs">{item.descricao}</span>
                                    <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] border ${
                                      item.statusPagamento === 'Pago'
                                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                        : isRetido
                                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                                        : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                    }`}>
                                      {isRetido ? 'No Ato da Venda (Aguardando Venda)' : item.statusPagamento}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2 text-[11px] text-slate-400 flex-wrap">
                                    {item.placa ? (
                                      <span className="text-slate-200 font-mono font-bold bg-white/5 px-1.5 py-0.5 rounded">
                                        🚗 Placa {item.placa} {item.modelo ? `• ${item.modelo}` : ''}
                                      </span>
                                    ) : (
                                      <span className="text-slate-300">🏢 Despesa Operacional Loja</span>
                                    )}
                                    <span>•</span>
                                    <span>Data: {item.dataCompetencia}</span>
                                    {item.tipoOrigem === 'chassi' && item.veiculo && (
                                      <button
                                        type="button"
                                        onClick={() => onOpenDossie(item.veiculo!)}
                                        className="text-amber-400 hover:underline flex items-center gap-0.5"
                                      >
                                        Ver Dossiê <ArrowUpRight size={11} />
                                      </button>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                                  <div className="text-right">
                                    <span className="font-mono font-extrabold text-white text-sm block">
                                      R$ {item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </span>
                                    {item.dataPagamento && (
                                      <span className="text-[10px] text-emerald-400 block">
                                        Pago em {item.dataPagamento}
                                      </span>
                                    )}
                                  </div>

                                  {isPendente && !isRetido && (
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => handleOpenBaixa(item)}
                                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition cursor-pointer"
                                      >
                                        Quitar
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleOpenQuitarLote(parceiro, item.id)}
                                        title="Abrir no fechamento em lote"
                                        className="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-[11px] transition cursor-pointer"
                                      >
                                        Lote
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= MODAL 1: BAIXA INDIVIDUAL DE PAGAMENTO ================= */}
      {modalBaixaOpen && selectedItemParaBaixa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-gray-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-white/10 bg-[#16171e] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <h4 className="font-extrabold text-white text-sm">Registrar Baixa de Pagamento</h4>
                  <p className="text-[11px] text-slate-400">Liquidação individual de conta / serviço</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalBaixaOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmBaixa} className="p-5 space-y-3.5 text-xs">
              {/* Card Resumo do Item */}
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 space-y-1">
                <div className="flex justify-between text-slate-300">
                  <span>Descrição:</span>
                  <strong className="text-white">{selectedItemParaBaixa.descricao}</strong>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Origem:</span>
                  <span className="font-semibold text-amber-300">
                    {selectedItemParaBaixa.tipoOrigem === 'chassi'
                      ? `Veículo ${selectedItemParaBaixa.placa || ''}`
                      : '🏢 Despesa Operacional Loja'}
                  </span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Fornecedor:</span>
                  <span>{selectedItemParaBaixa.fornecedorNome || '—'}</span>
                </div>
                <div className="flex justify-between font-black text-sm text-emerald-400 pt-1 border-t border-white/5">
                  <span>Valor a Liquidar:</span>
                  <span className="font-mono">
                    R$ {selectedItemParaBaixa.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Data da Quitação */}
              <div>
                <label className="block text-slate-300 font-bold mb-1">Data da Quitação *</label>
                <input
                  type="date"
                  required
                  value={dataPagamentoBaixa}
                  onChange={(e) => setDataPagamentoBaixa(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-black/40 border border-white/10 text-white outline-none focus:border-emerald-500"
                />
              </div>

              {/* Forma de Pagamento */}
              <div>
                <label className="block text-slate-300 font-bold mb-1">Forma de Pagamento *</label>
                <select
                  value={formaPagamentoBaixa}
                  onChange={(e) => setFormaPagamentoBaixa(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-black/40 border border-white/10 text-white outline-none focus:border-emerald-500 font-semibold"
                >
                  <option value="PIX">PIX</option>
                  <option value="Boleto Bancário">Boleto Bancário</option>
                  <option value="Transferência Bancária">Transferência TED/DOC</option>
                  <option value="Cartão de Débito">Cartão de Débito</option>
                  <option value="Cartão de Crédito">Cartão de Crédito</option>
                  <option value="Dinheiro / Espécie">Dinheiro / Espécie</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>

              {/* Conta Bancária / Caixa */}
              <div>
                <label className="block text-slate-300 font-bold mb-1 flex items-center gap-1.5">
                  <Wallet size={13} className="text-emerald-400" />
                  Conta Bancária / Caixa de Origem (Opcional)
                </label>
                <select
                  value={contaBancariaIdBaixa}
                  onChange={(e) => setContaBancariaIdBaixa(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-black/40 border border-white/10 text-white outline-none focus:border-emerald-500 font-semibold"
                >
                  <option value="">-- Sem débito bancário imediato --</option>
                  {contasBancarias.map((c) => (
                    <option key={c.id} value={c.id}>
                      🏦 {c.nome} ({c.banco || c.tipo}) — Saldo: R$ {Number(c.saldo || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </option>
                  ))}
                </select>
              </div>

              {/* Observação */}
              <div>
                <label className="block text-slate-300 font-bold mb-1">Observações da Baixa (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: Comprovante arquivado, desconto obtido..."
                  value={obsPagamentoBaixa}
                  onChange={(e) => setObsPagamentoBaixa(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-black/40 border border-white/10 text-white outline-none focus:border-emerald-500"
                />
              </div>

              {/* Ações */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setModalBaixaOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isProcessingBaixa}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 transition cursor-pointer"
                >
                  <Check size={14} />
                  {isProcessingBaixa ? 'Processando...' : 'Confirmar Liquidação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: QUITAÇÃO EM LOTE POR FORNECEDOR (FECHAMENTO DE FATURA) ================= */}
      {modalLoteOpen && parceiroParaLote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-2xl bg-gray-900 border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Cabeçalho do Modal */}
            <div className="p-5 border-b border-white/10 bg-[#16171e] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                  <CheckSquare size={22} />
                </div>
                <div>
                  <h4 className="font-black text-white text-base">Quitação de Fatura em Lote</h4>
                  <p className="text-xs text-amber-300 font-medium">
                    {parceiroParaLote.nome} {parceiroParaLote.categoria ? `• ${parceiroParaLote.categoria}` : ''}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalLoteOpen(false)}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmQuitarLote} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
              {/* Card de Dados Bancários / Chave PIX do Parceiro */}
              {(parceiroParaLote.chavePix || parceiroParaLote.bancoDadosBancarios) && (
                <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Dados para Pagamento do Parceiro:</span>
                    {parceiroParaLote.chavePix && (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-300">Chave PIX ({parceiroParaLote.tipoChavePix || 'PIX'}):</span>
                        <code className="text-amber-300 font-bold font-mono bg-black/50 px-2 py-0.5 rounded border border-white/5">
                          {parceiroParaLote.chavePix}
                        </code>
                      </div>
                    )}
                    {parceiroParaLote.bancoDadosBancarios && (
                      <span className="text-[11px] text-slate-400 block">{parceiroParaLote.bancoDadosBancarios}</span>
                    )}
                  </div>

                  {parceiroParaLote.chavePix && (
                    <button
                      type="button"
                      onClick={() => handleCopiarPix(parceiroParaLote.chavePix!)}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs border border-amber-500/30 flex items-center gap-1.5 transition cursor-pointer shrink-0"
                    >
                      {pixCopiado ? <CheckCheck size={14} className="text-emerald-400" /> : <Copy size={14} />}
                      {pixCopiado ? 'Chave Copiada!' : 'Copiar Chave PIX'}
                    </button>
                  )}
                </div>
              )}

              {/* Seletor de Itens / Ordens de Serviço a Incluir no Lote */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-200 font-bold">
                    Selecione os Serviços a Quitar ({itensMarcadosNoLote.length} de {itensPendentesParaLote.length} selecionados):
                  </label>
                  <button
                    type="button"
                    onClick={toggleTodosItensLote}
                    className="text-amber-400 hover:text-amber-300 font-semibold text-[11px] underline cursor-pointer"
                  >
                    {itensSelecionadosLote.length === itensPendentesParaLote.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                  </button>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-black/40 border border-white/10 pr-2">
                  {itensPendentesParaLote.map((subItem) => {
                    const isChecked = itensSelecionadosLote.includes(subItem.id);

                    return (
                      <label
                        key={subItem.id}
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition ${
                          isChecked
                            ? 'bg-amber-500/10 border-amber-500/40 text-white'
                            : 'bg-white/[0.02] border-white/5 text-slate-400 hover:bg-white/[0.05]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleItemLote(subItem.id)}
                            className="w-4 h-4 rounded text-amber-500 accent-amber-500 cursor-pointer"
                          />
                          <div>
                            <p className="font-bold text-xs text-white line-clamp-1">{subItem.descricao}</p>
                            <span className="text-[10px] text-slate-400">
                              {subItem.placa ? `🚗 ${subItem.placa}` : '🏢 Loja'} • Competência: {subItem.dataCompetencia}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="font-mono font-bold text-amber-300 text-xs">
                            R$ {subItem.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Totalizador Dinâmico do Lote */}
              <div className="p-4 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-amber-300 uppercase block">Total do Repasse em Lote:</span>
                  <p className="text-[10px] text-slate-300">{itensMarcadosNoLote.length} ordem(ns) de serviço selecionada(s)</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black font-mono text-amber-400">
                    R$ {valorTotalLoteSelecionado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Dados do Pagamento */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/10">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Data da Quitação do Lote *</label>
                  <input
                    type="date"
                    required
                    value={dataPagamentoBaixa}
                    onChange={(e) => setDataPagamentoBaixa(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-black/40 border border-white/10 text-white outline-none focus:border-amber-500 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Forma de Pagamento *</label>
                  <select
                    value={formaPagamentoBaixa}
                    onChange={(e) => setFormaPagamentoBaixa(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-black/40 border border-white/10 text-white outline-none focus:border-amber-500 text-xs font-semibold"
                  >
                    <option value="PIX">PIX</option>
                    <option value="Transferência Bancária">Transferência TED/DOC</option>
                    <option value="Boleto Bancário">Boleto Bancário</option>
                    <option value="Cartão de Débito">Cartão de Débito</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Dinheiro / Espécie">Dinheiro / Espécie</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1 flex items-center gap-1.5">
                  <Wallet size={13} className="text-amber-400" />
                  Conta Bancária / Caixa de Saída (Opcional)
                </label>
                <select
                  value={contaBancariaIdBaixa}
                  onChange={(e) => setContaBancariaIdBaixa(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-black/40 border border-white/10 text-white outline-none focus:border-amber-500 text-xs font-semibold"
                >
                  <option value="">-- Sem débito bancário imediato --</option>
                  {contasBancarias.map((c) => (
                    <option key={c.id} value={c.id}>
                      🏦 {c.nome} ({c.banco || c.tipo}) — Saldo: R$ {Number(c.saldo || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Observações da Quitação (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: Fatura referente a fechamento de agosto..."
                  value={obsPagamentoBaixa}
                  onChange={(e) => setObsPagamentoBaixa(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-black/40 border border-white/10 text-white outline-none focus:border-amber-500 text-xs"
                />
              </div>

              {/* Ações do Modal */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setModalLoteOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isProcessingLote || itensMarcadosNoLote.length === 0}
                  className={`px-5 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 shadow-lg transition cursor-pointer ${
                    itensMarcadosNoLote.length === 0
                      ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                      : 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/25'
                  }`}
                >
                  <CheckSquare size={15} />
                  {isProcessingLote
                    ? 'Processando Liquidação...'
                    : `Confirmar Quitação em Lote (${itensMarcadosNoLote.length} serviços)`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
