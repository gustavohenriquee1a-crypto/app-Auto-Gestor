import React, { useState, useMemo } from 'react';
import {
  Award,
  DollarSign,
  TrendingUp,
  Users,
  Search,
  CheckCircle2,
  Clock,
  Car,
  Filter,
  ArrowUpRight,
  ShieldCheck,
  Download,
  Calendar,
  Sparkles,
  Eye,
  Trash2,
  FileCheck,
  Printer,
  FolderOpen,
  Settings,
  Link,
  Unlink,
  Edit3,
  Check,
  X,
  AlertCircle,
  HelpCircle,
  CreditCard,
  Building2,
  ChevronRight
} from 'lucide-react';
import { VendaVeiculo, Usuario, Veiculo, ConfiguracaoLoja, ContaBancariaCaixa } from '../types';
import { formatCurrency, formatPercent } from '../utils/formatters';
import { calcularComissaoGerencial, formatarTipoComissaoGerencial } from '../utils/comissaoGerencialUtils';
import { saveConfiguracaoLojaFirestore } from '../services/firestoreService';

interface ComissoesGerenciaisViewProps {
  vendas: VendaVeiculo[];
  veiculos?: Veiculo[];
  usuarios?: Usuario[];
  currentUser: Usuario | null;
  configLoja?: ConfiguracaoLoja | null;
  contasBancarias?: ContaBancariaCaixa[];
  onOpenDossie?: (veiculo: Veiculo) => void;
  onUpdateVenda?: (vendaAtualizada: VendaVeiculo) => Promise<void> | void;
  onRefreshConfig?: () => void;
}

export const ComissoesGerenciaisView: React.FC<ComissoesGerenciaisViewProps> = ({
  vendas,
  veiculos = [],
  usuarios = [],
  currentUser,
  configLoja,
  contasBancarias = [],
  onOpenDossie,
  onUpdateVenda,
  onRefreshConfig,
}) => {
  // Controle de Acesso Restrito (Apenas Admin e Gestores autorizados)
  const isAuthorized = useMemo(() => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    if (currentUser.role === 'gestor' && currentUser.permissoes?.verComissoesGerenciais !== false) return true;
    return currentUser.permissoes?.verComissoesGerenciais === true;
  }, [currentUser]);

  const canManage = useMemo(() => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    if (currentUser.role === 'gestor' && currentUser.permissoes?.gerenciarComissoesGerenciais !== false) return true;
    return currentUser.permissoes?.gerenciarComissoesGerenciais === true;
  }, [currentUser]);

  // Filtros de Busca
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Todos' | 'Pendente' | 'Paga' | 'NaoVinculada'>('Todos');
  const [beneficiarioFilter, setBeneficiarioFilter] = useState<string>('Todos');
  const [vendedorFilter, setVendedorFilter] = useState<string>('Todos');

  // Modais de Controle
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [vendaParaEditar, setVendaParaEditar] = useState<VendaVeiculo | null>(null);
  const [vendaParaBaixa, setVendaParaBaixa] = useState<VendaVeiculo | null>(null);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchActionLoading, setBatchActionLoading] = useState(false);

  // Estado do Modal de Configuração Global
  const [cfgAtiva, setCfgAtiva] = useState(configLoja?.comissaoGerenteAtiva !== false);
  const [cfgTipo, setCfgTipo] = useState<'porcentagem_venda' | 'porcentagem_lucro' | 'fixo'>(
    (configLoja?.comissaoGerenteTipo as any) || 'porcentagem_venda'
  );
  const [cfgTaxa, setCfgTaxa] = useState<number>(configLoja?.comissaoGerenteTaxa ?? 1.0);
  const [cfgBeneficiarioId, setCfgBeneficiarioId] = useState<string>(
    configLoja?.comissaoGerenteBeneficiarioId || ''
  );
  const [cfgObservacoes, setCfgObservacoes] = useState(configLoja?.comissaoGerenteObservacoes || '');
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configSuccessMsg, setConfigSuccessMsg] = useState('');

  // Usuários com perfil de gestão/admin que podem receber comissão gerencial
  const gestoresDisponiveis = useMemo(() => {
    return usuarios.filter(
      (u) => u.role === 'admin' || u.role === 'gestor' || u.recebeComissaoOverriding === true
    );
  }, [usuarios]);

  // Lista de vendedores distintos que têm vendas
  const vendedoresComVendas = useMemo(() => {
    const list: { id: string; nome: string }[] = [];
    vendas.forEach((v) => {
      const vNome = v.vendedorNome || 'Vendedor do Pátio';
      const vId = v.vendedorId || vNome;
      if (!list.some((item) => item.nome === vNome)) {
        list.push({ id: vId, nome: vNome });
      }
    });
    return list;
  }, [vendas]);

  // Sincronizar estado local do modal de config se configLoja mudar
  React.useEffect(() => {
    if (configLoja) {
      setCfgAtiva(configLoja.comissaoGerenteAtiva !== false);
      if (configLoja.comissaoGerenteTipo && configLoja.comissaoGerenteTipo !== 'desativada') {
        setCfgTipo(configLoja.comissaoGerenteTipo as any);
      }
      if (configLoja.comissaoGerenteTaxa !== undefined) {
        setCfgTaxa(configLoja.comissaoGerenteTaxa);
      }
      if (configLoja.comissaoGerenteBeneficiarioId) {
        setCfgBeneficiarioId(configLoja.comissaoGerenteBeneficiarioId);
      }
      if (configLoja.comissaoGerenteObservacoes) {
        setCfgObservacoes(configLoja.comissaoGerenteObservacoes);
      }
    }
  }, [configLoja]);

  // Veículo associado para abrir dossiê
  const getVeiculoAssociado = (venda: VendaVeiculo | null): Veiculo | undefined => {
    if (!venda || !veiculos || veiculos.length === 0) return undefined;
    return veiculos.find((vec) => {
      if (venda.veiculoId && vec.id === venda.veiculoId) return true;
      if (venda.placa && vec.placa && vec.placa.trim().toUpperCase() === venda.placa.trim().toUpperCase()) return true;
      if (venda.chassi && vec.chassi && vec.chassi.trim().toUpperCase() === venda.chassi.trim().toUpperCase()) return true;
      return false;
    });
  };

  // Filtragem das Vendas
  const filteredVendas = useMemo(() => {
    return vendas.filter((v) => {
      // Busca textual
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesPlaca = v.placa?.toLowerCase().includes(term);
        const matchesModelo = v.modelo?.toLowerCase().includes(term);
        const matchesChassi = v.chassi?.toLowerCase().includes(term);
        const matchesComprador = v.compradorNome?.toLowerCase().includes(term);
        const matchesVendedor = v.vendedorNome?.toLowerCase().includes(term);
        const matchesBeneficiario = v.comissaoGerencialBeneficiarioNome?.toLowerCase().includes(term);
        if (
          !matchesPlaca &&
          !matchesModelo &&
          !matchesChassi &&
          !matchesComprador &&
          !matchesVendedor &&
          !matchesBeneficiario
        ) {
          return false;
        }
      }

      // Filtro de Status
      const isVinculada = v.comissaoGerencialAtiva === true && (v.comissaoGerencialValor ?? 0) > 0;
      const statusGerencial = v.comissaoGerencialStatus || 'Pendente';

      if (statusFilter === 'Pendente') {
        if (!isVinculada || statusGerencial !== 'Pendente') return false;
      } else if (statusFilter === 'Paga') {
        if (!isVinculada || statusGerencial !== 'Paga') return false;
      } else if (statusFilter === 'NaoVinculada') {
        if (isVinculada) return false;
      }

      // Filtro de Beneficiário
      if (beneficiarioFilter !== 'Todos') {
        if (v.comissaoGerencialBeneficiarioId !== beneficiarioFilter && v.comissaoGerencialBeneficiarioNome !== beneficiarioFilter) {
          return false;
        }
      }

      // Filtro de Vendedor
      if (vendedorFilter !== 'Todos') {
        if (v.vendedorId !== vendedorFilter && v.vendedorNome !== vendedorFilter) {
          return false;
        }
      }

      return true;
    });
  }, [vendas, searchTerm, statusFilter, beneficiarioFilter, vendedorFilter]);

  // Métricas Consolidadas
  const metrics = useMemo(() => {
    let totalComissaoAcumulada = 0;
    let totalPago = 0;
    let totalPendente = 0;
    let totalVendasComOverriding = 0;
    let totalVendasGerais = vendas.length;

    vendas.forEach((v) => {
      const isAtiva = v.comissaoGerencialAtiva === true && (v.comissaoGerencialValor ?? 0) > 0;
      if (isAtiva) {
        const val = Number(v.comissaoGerencialValor || 0);
        totalComissaoAcumulada += val;
        totalVendasComOverriding += 1;

        if (v.comissaoGerencialStatus === 'Paga') {
          totalPago += val;
        } else {
          totalPendente += val;
        }
      }
    });

    const ticketMedio = totalVendasComOverriding > 0 ? totalComissaoAcumulada / totalVendasComOverriding : 0;
    const taxaCobertura = totalVendasGerais > 0 ? (totalVendasComOverriding / totalVendasGerais) * 100 : 0;

    return {
      totalComissaoAcumulada,
      totalPago,
      totalPendente,
      totalVendasComOverriding,
      totalVendasGerais,
      ticketMedio,
      taxaCobertura,
    };
  }, [vendas]);

  // Vendas que não têm comissão gerencial vinculada
  const vendasSemOverriding = useMemo(() => {
    return vendas.filter((v) => !v.comissaoGerencialAtiva || !v.comissaoGerencialValor || v.comissaoGerencialValor <= 0);
  }, [vendas]);

  // Salvar Regra Global de Configuração da Loja
  const handleSaveConfiguracaoGlobal = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingConfig(true);
    try {
      const selectedUser = gestoresDisponiveis.find((u) => u.uid === cfgBeneficiarioId);
      await saveConfiguracaoLojaFirestore({
        comissaoGerenteAtiva: cfgAtiva,
        comissaoGerenteTipo: cfgTipo,
        comissaoGerenteTaxa: Number(cfgTaxa),
        comissaoGerenteBeneficiarioId: cfgBeneficiarioId || undefined,
        comissaoGerenteBeneficiarioNome: selectedUser?.displayName || (cfgBeneficiarioId ? 'Gestor' : 'Diretoria Geral'),
        comissaoGerenteBeneficiarioEmail: selectedUser?.email || undefined,
        comissaoGerenteObservacoes: cfgObservacoes,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser?.displayName || 'Admin',
        updatedByEmail: currentUser?.email || '',
      });

      setConfigSuccessMsg('Regra global de overriding atualizada com sucesso!');
      if (onRefreshConfig) onRefreshConfig();
      setTimeout(() => {
        setConfigSuccessMsg('');
        setIsConfigModalOpen(false);
      }, 1200);
    } catch (err) {
      console.error('Erro ao salvar configuração global de overriding:', err);
      alert('Erro ao salvar configuração de overriding. Tente novamente.');
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Vincular comissão administrativa em uma venda específica
  const handleVincularVenda = async (venda: VendaVeiculo) => {
    if (!onUpdateVenda) return;
    const calc = calcularComissaoGerencial(
      venda.valorVenda,
      venda.lucroLiquido,
      configLoja,
      null,
      usuarios
    );

    const updatedVenda: VendaVeiculo = {
      ...venda,
      comissaoGerencialAtiva: true,
      comissaoGerencialTipo: calc.tipo as any,
      comissaoGerencialTaxa: calc.taxa,
      comissaoGerencialValor: calc.valor > 0 ? calc.valor : (calc.taxa > 0 ? calc.taxa : 300),
      comissaoGerencialStatus: 'Pendente',
      comissaoGerencialBeneficiarioId: calc.beneficiarioId,
      comissaoGerencialBeneficiarioNome: calc.beneficiarioNome,
      comissaoGerencialBeneficiarioEmail: calc.beneficiarioEmail,
      comissaoGerencialObservacoes: `Comissão gerencial vinculada pelo gestor ${currentUser?.displayName || 'Admin'} em ${new Date().toLocaleDateString('pt-BR')}`,
    };

    await onUpdateVenda(updatedVenda);
  };

  // Remover / Desvincular comissão administrativa de uma venda específica
  const handleDesvincularVenda = async (venda: VendaVeiculo) => {
    if (!onUpdateVenda) return;
    const confirmacao = window.confirm(
      `Deseja realmente retirar a comissão administrativa da venda do ${venda.modelo} (Placa: ${venda.placa})?\n\n` +
      `O valor de R$ ${(venda.comissaoGerencialValor || 0).toFixed(2)} será desvinculado dos recebimentos de gestão.`
    );
    if (!confirmacao) return;

    const updatedVenda: VendaVeiculo = {
      ...venda,
      comissaoGerencialAtiva: false,
      comissaoGerencialTipo: 'nenhuma',
      comissaoGerencialValor: 0,
      comissaoGerencialObservacoes: `Comissão gerencial retirada pelo gestor ${currentUser?.displayName || 'Admin'} em ${new Date().toLocaleDateString('pt-BR')}`,
    };

    await onUpdateVenda(updatedVenda);
  };

  // Aplicação em lote nas vendas sem overriding
  const handleAplicarLote = async () => {
    if (!onUpdateVenda || vendasSemOverriding.length === 0) return;
    setBatchActionLoading(true);
    try {
      for (const venda of vendasSemOverriding) {
        const calc = calcularComissaoGerencial(
          venda.valorVenda,
          venda.lucroLiquido,
          configLoja,
          null,
          usuarios
        );

        const val = calc.valor > 0 ? calc.valor : (calc.taxa > 0 ? calc.taxa : 300);
        const updated: VendaVeiculo = {
          ...venda,
          comissaoGerencialAtiva: true,
          comissaoGerencialTipo: calc.tipo as any,
          comissaoGerencialTaxa: calc.taxa,
          comissaoGerencialValor: val,
          comissaoGerencialStatus: 'Pendente',
          comissaoGerencialBeneficiarioId: calc.beneficiarioId,
          comissaoGerencialBeneficiarioNome: calc.beneficiarioNome,
          comissaoGerencialBeneficiarioEmail: calc.beneficiarioEmail,
          comissaoGerencialObservacoes: `Vínculo em lote efetuado em ${new Date().toLocaleDateString('pt-BR')}`,
        };
        await onUpdateVenda(updated);
      }
      setIsBatchModalOpen(false);
      alert(`Sucesso! Comissão de overriding vinculada a ${vendasSemOverriding.length} vendas anteriores.`);
    } catch (err) {
      console.error('Erro ao aplicar comissões em lote:', err);
      alert('Houve um erro ao processar o lote. Verifique o console.');
    } finally {
      setBatchActionLoading(false);
    }
  };

  // Se o usuário não tiver permissão para ver comissões gerenciais, bloquear a tela com mensagem amigável e segura
  if (!isAuthorized) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-950 text-slate-200 min-h-[70vh]">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 shadow-lg shadow-amber-500/10">
          <ShieldCheck size={32} />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Painel de Acesso Restrito</h2>
        <p className="text-sm text-slate-400 max-w-md text-center mb-6">
          Este painel de comissões gerenciais e remuneração estratégica (overriding) é reservado exclusivamente para a Diretoria e Administradores com permissão expressa de governança.
        </p>
        <div className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-400">
          Usuário conectado: {currentUser?.displayName || 'Colaborador'} ({currentUser?.role || 'vendedor'})
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* Header & Ações Principais */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 sm:p-6 backdrop-blur-md shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-amber-500/20">
              <Award size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  Comissões de Gestão (Overriding)
                </h1>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Exclusivo Gestão & Admin
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400">
                Remuneração administrativa automática gerada sobre cada veículo faturado no pátio.
              </p>
            </div>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex flex-wrap items-center gap-2.5">
          {vendasSemOverriding.length > 0 && canManage && (
            <button
              onClick={() => setIsBatchModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold transition cursor-pointer"
            >
              <Link size={15} />
              <span>Vincular Vendas Anteriores ({vendasSemOverriding.length})</span>
            </button>
          )}

          {canManage && (
            <button
              onClick={() => setIsConfigModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition cursor-pointer"
            >
              <Settings size={15} />
              <span>Regra Global de Overriding</span>
            </button>
          )}

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80 text-xs font-medium transition cursor-pointer"
            title="Imprimir Relatório"
          >
            <Printer size={15} />
            <span className="hidden sm:inline">Imprimir</span>
          </button>
        </div>
      </div>

      {/* Faixa de Informação da Regra Atual em Vigor */}
      <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/20 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <ShieldCheck size={18} />
          </div>
          <div>
            <div className="font-semibold text-white flex items-center gap-2">
              <span>Regra Global Ativa:</span>
              <span className="text-amber-300 font-mono font-bold">
                {configLoja?.comissaoGerenteAtiva !== false
                  ? formatarTipoComissaoGerencial(configLoja?.comissaoGerenteTipo, configLoja?.comissaoGerenteTaxa)
                  : 'Desativada Globalmente'}
              </span>
            </div>
            <p className="text-slate-400 text-[11px]">
              Beneficiário padrão:{' '}
              <strong className="text-slate-200">
                {configLoja?.comissaoGerenteBeneficiarioNome || 'Diretoria / Gestor Geral'}
              </strong>
              {configLoja?.comissaoGerenteObservacoes && ` • ${configLoja.comissaoGerenteObservacoes}`}
            </p>
          </div>
        </div>
        {canManage && (
          <button
            onClick={() => setIsConfigModalOpen(true)}
            className="self-start md:self-auto text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 transition text-xs cursor-pointer"
          >
            <span>Alterar Regra</span>
            <ChevronRight size={14} />
          </button>
        )}
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Total Apurado</span>
            <DollarSign size={16} className="text-amber-400" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-white tracking-tight">
            {formatCurrency(metrics.totalComissaoAcumulada)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {metrics.totalVendasComOverriding} vendas com comissão
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Total Pago</span>
            <CheckCircle2 size={16} className="text-emerald-400" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-emerald-400 tracking-tight">
            {formatCurrency(metrics.totalPago)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Liquidados e quitados
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">A Pagar (Pendente)</span>
            <Clock size={16} className="text-amber-400" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-amber-300 tracking-tight">
            {formatCurrency(metrics.totalPendente)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Aguardando quitação
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Média por Veículo</span>
            <TrendingUp size={16} className="text-blue-400" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-blue-300 tracking-tight">
            {formatCurrency(metrics.ticketMedio)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Por venda com overriding
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Cobertura de Vendas</span>
            <Car size={16} className="text-purple-400" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-purple-300 tracking-tight">
            {metrics.taxaCobertura.toFixed(1)}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {metrics.totalVendasComOverriding} de {metrics.totalVendasGerais} vendas vinculadas
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por placa, modelo, chassi, vendedor ou beneficiário..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
          />
        </div>

        {/* Filtro Status */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setStatusFilter('Todos')}
              className={`px-3 py-1.5 rounded-lg transition font-medium cursor-pointer ${
                statusFilter === 'Todos' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setStatusFilter('Pendente')}
              className={`px-3 py-1.5 rounded-lg transition font-medium cursor-pointer ${
                statusFilter === 'Pendente' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Pendentes
            </button>
            <button
              onClick={() => setStatusFilter('Paga')}
              className={`px-3 py-1.5 rounded-lg transition font-medium cursor-pointer ${
                statusFilter === 'Paga' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Pagas
            </button>
            <button
              onClick={() => setStatusFilter('NaoVinculada')}
              className={`px-3 py-1.5 rounded-lg transition font-medium cursor-pointer ${
                statusFilter === 'NaoVinculada' ? 'bg-rose-500/20 text-rose-300 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Sem Vínculo
            </button>
          </div>

          {/* Filtro Beneficiário */}
          {gestoresDisponiveis.length > 1 && (
            <select
              value={beneficiarioFilter}
              onChange={(e) => setBeneficiarioFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500 transition cursor-pointer"
            >
              <option value="Todos">Todos Beneficiários</option>
              {gestoresDisponiveis.map((g) => (
                <option key={g.uid} value={g.uid}>
                  {g.displayName} ({g.role})
                </option>
              ))}
            </select>
          )}

          {/* Filtro Vendedor */}
          {vendedoresComVendas.length > 1 && (
            <select
              value={vendedorFilter}
              onChange={(e) => setVendedorFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500 transition cursor-pointer"
            >
              <option value="Todos">Todos Vendedores</option>
              {vendedoresComVendas.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.nome}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Tabela de Vendas e Comissões Gerenciais */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Veículo / Chassi</th>
                <th className="py-3.5 px-4 font-semibold">Data</th>
                <th className="py-3.5 px-4 font-semibold">Vendedor Negociador</th>
                <th className="py-3.5 px-4 font-semibold text-right">Venda / Margem</th>
                <th className="py-3.5 px-4 font-semibold">Regra Overriding</th>
                <th className="py-3.5 px-4 font-semibold text-right">Comissão Gestor</th>
                <th className="py-3.5 px-4 font-semibold">Beneficiário</th>
                <th className="py-3.5 px-4 font-semibold text-center">Status</th>
                <th className="py-3.5 px-4 font-semibold text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredVendas.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <AlertCircle size={32} className="mx-auto mb-2 text-slate-600" />
                    <p className="font-semibold text-slate-400 text-sm">Nenhuma venda encontrada com os filtros selecionados</p>
                    <p className="text-xs text-slate-500 mt-1">Ajuste os termos de busca ou filtros de status.</p>
                  </td>
                </tr>
              ) : (
                filteredVendas.map((venda) => {
                  const isVinculada = venda.comissaoGerencialAtiva === true && (venda.comissaoGerencialValor ?? 0) > 0;
                  const valorComissao = Number(venda.comissaoGerencialValor || 0);
                  const isPaga = isVinculada && venda.comissaoGerencialStatus === 'Paga';
                  const veiculoAssociado = getVeiculoAssociado(venda);

                  return (
                    <tr
                      key={venda.id}
                      className={`hover:bg-slate-800/40 transition ${
                        !isVinculada ? 'bg-slate-950/30 text-slate-400' : ''
                      }`}
                    >
                      {/* Veículo */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-white border border-slate-700 text-xs">
                            {venda.placa}
                          </span>
                          <div>
                            <div className="font-bold text-white text-xs">{venda.modelo}</div>
                            <div className="text-[11px] text-slate-400">{venda.ano} • {venda.cor}</div>
                          </div>
                        </div>
                      </td>

                      {/* Data */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="text-slate-200">
                          {venda.dataVenda ? new Date(venda.dataVenda + 'T12:00:00Z').toLocaleDateString('pt-BR') : '-'}
                        </div>
                        <div className="text-[10px] text-slate-500">{venda.formaPagamento}</div>
                      </td>

                      {/* Vendedor */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-200">{venda.vendedorNome || 'Vendedor do Pátio'}</div>
                        <div className="text-[10px] text-slate-500">Comissão Vendedor: {formatCurrency(venda.comissaoValor || 0)}</div>
                      </td>

                      {/* Venda e Margem */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="font-bold text-white">{formatCurrency(venda.valorVenda)}</div>
                        <div className="text-[10px] text-emerald-400 font-medium">
                          Lucro: {formatCurrency(venda.lucroLiquido)}
                        </div>
                      </td>

                      {/* Regra */}
                      <td className="py-3.5 px-4">
                        {isVinculada ? (
                          <div>
                            <span className="inline-block px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 font-mono text-[11px] border border-amber-500/20">
                              {formatarTipoComissaoGerencial(venda.comissaoGerencialTipo, venda.comissaoGerencialTaxa)}
                            </span>
                            {venda.comissaoGerencialAjustadaManualmente && (
                              <span className="ml-1 text-[10px] text-purple-300 font-semibold" title="Ajustado manualmente">
                                [manual]
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500 italic text-[11px]">Sem vínculo</span>
                        )}
                      </td>

                      {/* Valor Comissão Gestor */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {isVinculada ? (
                          <div className="font-black text-amber-300 text-sm tracking-tight">
                            {formatCurrency(valorComissao)}
                          </div>
                        ) : (
                          <span className="text-slate-500 font-mono">R$ 0,00</span>
                        )}
                      </td>

                      {/* Beneficiário */}
                      <td className="py-3.5 px-4">
                        {isVinculada ? (
                          <div>
                            <div className="font-semibold text-slate-200">
                              {venda.comissaoGerencialBeneficiarioNome || 'Diretoria / Gestor'}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {venda.comissaoGerencialBeneficiarioEmail || 'Gestão da Loja'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {!isVinculada ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                            Não Vinculada
                          </span>
                        ) : isPaga ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            <CheckCircle2 size={12} />
                            <span>Paga {venda.comissaoGerencialDataPagamento ? `(${new Date(venda.comissaoGerencialDataPagamento + 'T12:00:00Z').toLocaleDateString('pt-BR')})` : ''}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            <Clock size={12} />
                            <span>Pendente</span>
                          </span>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {canManage && !isVinculada && (
                            <button
                              onClick={() => handleVincularVenda(venda)}
                              className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] transition shadow flex items-center gap-1 cursor-pointer"
                              title="Vincular comissão administrativa automática a esta venda"
                            >
                              <Link size={13} />
                              <span>Vincular</span>
                            </button>
                          )}

                          {canManage && isVinculada && (
                            <>
                              <button
                                onClick={() => setVendaParaBaixa(venda)}
                                className={`px-2.5 py-1.5 rounded-lg font-bold text-[11px] transition flex items-center gap-1 cursor-pointer ${
                                  isPaga
                                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20'
                                }`}
                                title={isPaga ? 'Visualizar ou alterar quitação' : 'Dar baixa / Quitar comissão'}
                              >
                                <Check size={13} />
                                <span>{isPaga ? 'Quitação' : 'Pagar'}</span>
                              </button>

                              <button
                                onClick={() => setVendaParaEditar(venda)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
                                title="Editar valores e regras desta venda"
                              >
                                <Edit3 size={14} />
                              </button>

                              <button
                                onClick={() => handleDesvincularVenda(venda)}
                                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 transition cursor-pointer"
                                title="Tirar / Desvincular comissão administrativa desta venda"
                              >
                                <Unlink size={14} />
                              </button>
                            </>
                          )}

                          {veiculoAssociado && onOpenDossie && (
                            <button
                              onClick={() => onOpenDossie(veiculoAssociado)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition cursor-pointer"
                              title="Ver Dossiê do Chassi"
                            >
                              <FolderOpen size={14} />
                            </button>
                          )}
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

      {/* MODAL 1: Configuração Global da Regra de Overriding */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
            <div className="bg-slate-950 p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  <Settings size={18} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Regra Global de Overriding</h3>
                  <p className="text-xs text-slate-400">Definição corporativa da comissão administrativa por venda</p>
                </div>
              </div>
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveConfiguracaoGlobal} className="p-5 space-y-4 text-xs">
              {/* Ativação */}
              <div className="flex items-center justify-between p-3.5 bg-slate-950 rounded-xl border border-slate-800">
                <div>
                  <div className="font-bold text-white text-xs">Ativar Comissão de Overriding Global</div>
                  <div className="text-slate-400 text-[11px]">
                    Gera automaticamente a comissão administrativa na baixa de chassi
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={cfgAtiva}
                  onChange={(e) => setCfgAtiva(e.target.checked)}
                  className="w-5 h-5 accent-amber-500 cursor-pointer rounded"
                />
              </div>

              {cfgAtiva && (
                <>
                  {/* Modelo de Remuneração */}
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1.5">
                      Modelo de Cálculo da Comissão
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setCfgTipo('porcentagem_venda')}
                        className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                          cfgTipo === 'porcentagem_venda'
                            ? 'bg-amber-500/10 border-amber-500/50 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="font-bold text-xs">% sobre Venda</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Valor bruto negociado</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setCfgTipo('porcentagem_lucro')}
                        className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                          cfgTipo === 'porcentagem_lucro'
                            ? 'bg-amber-500/10 border-amber-500/50 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="font-bold text-xs">% sobre Lucro</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Margem apurada</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setCfgTipo('fixo')}
                        className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                          cfgTipo === 'fixo'
                            ? 'bg-amber-500/10 border-amber-500/50 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="font-bold text-xs">Valor Fixo (R$)</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Por carro faturado</div>
                      </button>
                    </div>
                  </div>

                  {/* Campo de Taxa / Valor */}
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">
                      {cfgTipo === 'fixo' ? 'Valor Fixo por Veículo (R$)' : 'Percentual de Comissão (%)'}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={cfgTaxa}
                        onChange={(e) => setCfgTaxa(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono font-bold focus:outline-none focus:border-amber-500 transition"
                        placeholder={cfgTipo === 'fixo' ? 'Ex: 300.00' : 'Ex: 1.00'}
                        required
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">
                        {cfgTipo === 'fixo' ? 'BRL' : '%'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {cfgTipo === 'porcentagem_venda' && `Exemplo: Um carro vendido por R$ 80.000 gerará R$ ${((80000 * cfgTaxa) / 100).toFixed(2)} de comissão administrativa.`}
                      {cfgTipo === 'porcentagem_lucro' && `Exemplo: Um lucro de R$ 8.000 gerará R$ ${((8000 * cfgTaxa) / 100).toFixed(2)} de comissão administrativa.`}
                      {cfgTipo === 'fixo' && `Exemplo: R$ ${cfgTaxa.toFixed(2)} serão creditados em cada veículo comercializado.`}
                    </p>
                  </div>

                  {/* Beneficiário Padrão */}
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">
                      Gerente / Admin Beneficiário Padrão
                    </label>
                    <select
                      value={cfgBeneficiarioId}
                      onChange={(e) => setCfgBeneficiarioId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-500 transition cursor-pointer"
                    >
                      <option value="">Diretoria Geral (Sem gestor específico vinculado)</option>
                      {gestoresDisponiveis.map((g) => (
                        <option key={g.uid} value={g.uid}>
                          {g.displayName} ({g.role} • {g.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Observações */}
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">
                      Observações / Justificativa Corporativa
                    </label>
                    <input
                      type="text"
                      value={cfgObservacoes}
                      onChange={(e) => setCfgObservacoes(e.target.value)}
                      placeholder="Ex: Política salarial aprovada pelo conselho de sócios 2026"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-500 transition"
                    />
                  </div>
                </>
              )}

              {configSuccessMsg && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  <span>{configSuccessMsg}</span>
                </div>
              )}

              {/* Botões */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsConfigModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingConfig}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-lg shadow-amber-500/20 transition cursor-pointer disabled:opacity-50"
                >
                  {isSavingConfig ? 'Salvando...' : 'Salvar Regra Global'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Editar Parâmetros da Comissão de uma Venda Específica */}
      {vendaParaEditar && (
        <ModalEditarComissaoVenda
          venda={vendaParaEditar}
          gestores={gestoresDisponiveis}
          onClose={() => setVendaParaEditar(null)}
          onSave={async (vendaAtualizada) => {
            if (onUpdateVenda) {
              await onUpdateVenda(vendaAtualizada);
            }
            setVendaParaEditar(null);
          }}
        />
      )}

      {/* MODAL 3: Quitação / Baixa de Pagamento de Comissão */}
      {vendaParaBaixa && (
        <ModalBaixaComissaoGerente
          venda={vendaParaBaixa}
          contasBancarias={contasBancarias}
          onClose={() => setVendaParaBaixa(null)}
          onSave={async (vendaAtualizada) => {
            if (onUpdateVenda) {
              await onUpdateVenda(vendaAtualizada);
            }
            setVendaParaBaixa(null);
          }}
        />
      )}

      {/* MODAL 4: Vínculo em Lote */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <Link size={24} />
              <h3 className="font-bold text-lg text-white">Vincular Comissões em Lote</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Existem <strong className="text-amber-300">{vendasSemOverriding.length} vendas</strong> cadastradas no sistema que não possuem comissão administrativa gerencial vinculada.
            </p>
            <p className="text-xs text-slate-400">
              Deseja aplicar a regra global em vigor (
              <strong className="text-white">
                {formatarTipoComissaoGerencial(configLoja?.comissaoGerenteTipo, configLoja?.comissaoGerenteTaxa)}
              </strong>
              ) em todas estas vendas de uma só vez?
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsBatchModalOpen(false)}
                disabled={batchActionLoading}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAplicarLote}
                disabled={batchActionLoading}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow transition cursor-pointer disabled:opacity-50"
              >
                {batchActionLoading ? 'Processando Lote...' : 'Confirmar Vínculo em Lote'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Sub-Modal: Edição de comissão de uma venda específica
interface ModalEditarComissaoVendaProps {
  venda: VendaVeiculo;
  gestores: Usuario[];
  onClose: () => void;
  onSave: (vendaAtualizada: VendaVeiculo) => Promise<void>;
}

const ModalEditarComissaoVenda: React.FC<ModalEditarComissaoVendaProps> = ({
  venda,
  gestores,
  onClose,
  onSave,
}) => {
  const [ativa, setAtiva] = useState(venda.comissaoGerencialAtiva !== false);
  const [tipo, setTipo] = useState<'porcentagem_venda' | 'porcentagem_lucro' | 'fixo' | 'manual'>(
    (venda.comissaoGerencialTipo as any) || 'porcentagem_venda'
  );
  const [taxa, setTaxa] = useState<number>(venda.comissaoGerencialTaxa ?? 1.0);
  const [valorFinal, setValorFinal] = useState<number>(venda.comissaoGerencialValor ?? 0);
  const [beneficiarioId, setBeneficiarioId] = useState<string>(venda.comissaoGerencialBeneficiarioId || '');
  const [beneficiarioNome, setBeneficiarioNome] = useState<string>(venda.comissaoGerencialBeneficiarioNome || '');
  const [observacoes, setObservacoes] = useState<string>(venda.comissaoGerencialObservacoes || '');
  const [isSaving, setIsSaving] = useState(false);

  // Recalcular valor se mudar o tipo ou a taxa quando não for manual
  React.useEffect(() => {
    if (tipo === 'porcentagem_venda') {
      const v = (venda.valorVenda * taxa) / 100;
      setValorFinal(Number(v.toFixed(2)));
    } else if (tipo === 'porcentagem_lucro') {
      const v = (Math.max(0, venda.lucroLiquido) * taxa) / 100;
      setValorFinal(Number(v.toFixed(2)));
    } else if (tipo === 'fixo') {
      setValorFinal(Number(taxa));
    }
  }, [tipo, taxa, venda.valorVenda, venda.lucroLiquido]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const selectedUser = gestores.find((g) => g.uid === beneficiarioId);
      const updated: VendaVeiculo = {
        ...venda,
        comissaoGerencialAtiva: ativa,
        comissaoGerencialTipo: ativa ? tipo : 'nenhuma',
        comissaoGerencialTaxa: ativa ? Number(taxa) : 0,
        comissaoGerencialValor: ativa ? Number(valorFinal) : 0,
        comissaoGerencialBeneficiarioId: beneficiarioId || undefined,
        comissaoGerencialBeneficiarioNome: selectedUser?.displayName || beneficiarioNome || 'Gestor Geral',
        comissaoGerencialBeneficiarioEmail: selectedUser?.email || undefined,
        comissaoGerencialObservacoes: observacoes,
        comissaoGerencialAjustadaManualmente: true,
      };

      await onSave(updated);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar alteração da comissão.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
        <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs">
              {venda.placa}
            </span>
            <h3 className="font-bold text-white text-sm">Editar Comissão Administrativa da Venda</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded transition">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Informações da Venda */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center">
            <div>
              <div className="font-bold text-white text-xs">{venda.modelo}</div>
              <div className="text-[11px] text-slate-400">Negociado por: {venda.vendedorNome || 'Vendedor'}</div>
            </div>
            <div className="text-right">
              <div className="font-bold text-white">{formatCurrency(venda.valorVenda)}</div>
              <div className="text-[11px] text-emerald-400">Margem: {formatCurrency(venda.lucroLiquido)}</div>
            </div>
          </div>

          {/* Vínculo Ativo */}
          <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
            <div>
              <div className="font-bold text-white text-xs">Comissão Administrativa Vinculada</div>
              <div className="text-slate-400 text-[11px]">Se desmarcado, esta venda não gerará overriding</div>
            </div>
            <input
              type="checkbox"
              checked={ativa}
              onChange={(e) => setAtiva(e.target.checked)}
              className="w-5 h-5 accent-amber-500 cursor-pointer rounded"
            />
          </div>

          {ativa && (
            <>
              {/* Modelo de Regra */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Modelo de Cálculo</label>
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTipo('porcentagem_venda')}
                    className={`py-2 px-1 text-center rounded-lg border text-[11px] transition cursor-pointer ${
                      tipo === 'porcentagem_venda' ? 'bg-amber-500 text-slate-950 font-bold border-amber-500' : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    % Venda
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipo('porcentagem_lucro')}
                    className={`py-2 px-1 text-center rounded-lg border text-[11px] transition cursor-pointer ${
                      tipo === 'porcentagem_lucro' ? 'bg-amber-500 text-slate-950 font-bold border-amber-500' : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    % Lucro
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipo('fixo')}
                    className={`py-2 px-1 text-center rounded-lg border text-[11px] transition cursor-pointer ${
                      tipo === 'fixo' ? 'bg-amber-500 text-slate-950 font-bold border-amber-500' : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    Fixo R$
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipo('manual')}
                    className={`py-2 px-1 text-center rounded-lg border text-[11px] transition cursor-pointer ${
                      tipo === 'manual' ? 'bg-amber-500 text-slate-950 font-bold border-amber-500' : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    Livre
                  </button>
                </div>
              </div>

              {/* Taxa e Valor */}
              <div className="grid grid-cols-2 gap-3">
                {tipo !== 'manual' && (
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">
                      {tipo === 'fixo' ? 'Valor Base (R$)' : 'Alíquota (%)'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={taxa}
                      onChange={(e) => setTaxa(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono font-bold"
                    />
                  </div>
                )}
                <div className={tipo === 'manual' ? 'col-span-2' : ''}>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Valor Final da Comissão (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={valorFinal}
                    onChange={(e) => {
                      setValorFinal(parseFloat(e.target.value) || 0);
                      setTipo('manual');
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-amber-300 font-mono font-bold text-sm"
                  />
                </div>
              </div>

              {/* Beneficiário */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Beneficiário (Gestor / Admin)</label>
                <select
                  value={beneficiarioId}
                  onChange={(e) => {
                    const gId = e.target.value;
                    setBeneficiarioId(gId);
                    const selected = gestores.find((g) => g.uid === gId);
                    if (selected) setBeneficiarioNome(selected.displayName);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                >
                  <option value="">Diretoria / Gestor Geral</option>
                  {gestores.map((g) => (
                    <option key={g.uid} value={g.uid}>
                      {g.displayName} ({g.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Observações */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Observações do Ajuste</label>
                <input
                  type="text"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Ex: Alíquota acordada com a diretoria para esta venda"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>
            </>
          )}

          {/* Botões */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition cursor-pointer"
            >
              {isSaving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Sub-Modal: Baixa / Quitação de Comissão
interface ModalBaixaComissaoGerenteProps {
  venda: VendaVeiculo;
  contasBancarias: ContaBancariaCaixa[];
  onClose: () => void;
  onSave: (vendaAtualizada: VendaVeiculo) => Promise<void>;
}

const ModalBaixaComissaoGerente: React.FC<ModalBaixaComissaoGerenteProps> = ({
  venda,
  contasBancarias,
  onClose,
  onSave,
}) => {
  const [status, setStatus] = useState<'Pendente' | 'Paga'>(venda.comissaoGerencialStatus || 'Pendente');
  const [dataPagamento, setDataPagamento] = useState<string>(
    venda.comissaoGerencialDataPagamento || new Date().toISOString().split('T')[0]
  );
  const [formaPagamento, setFormaPagamento] = useState<string>(
    venda.comissaoGerencialFormaPagamento || 'PIX'
  );
  const [contaOrigemId, setContaOrigemId] = useState<string>(
    venda.comissaoGerencialContaOrigemId || (contasBancarias[0]?.id || '')
  );
  const [observacoes, setObservacoes] = useState<string>(venda.comissaoGerencialObservacoes || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const contaSelecionada = contasBancarias.find((c) => c.id === contaOrigemId);
      const updated: VendaVeiculo = {
        ...venda,
        comissaoGerencialStatus: status,
        comissaoGerencialDataPagamento: status === 'Paga' ? dataPagamento : undefined,
        comissaoGerencialFormaPagamento: status === 'Paga' ? formaPagamento : undefined,
        comissaoGerencialContaOrigemId: status === 'Paga' ? contaOrigemId : undefined,
        comissaoGerencialContaOrigemNome: status === 'Paga' ? contaSelecionada?.nome : undefined,
        comissaoGerencialObservacoes: observacoes,
      };

      await onSave(updated);
    } catch (err) {
      console.error(err);
      alert('Erro ao registrar quitação da comissão.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
        <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Quitação de Comissão Administrativa</h3>
              <p className="text-[11px] text-slate-400">{venda.placa} • {venda.modelo}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded transition">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Card Resumo */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-slate-400">Beneficiário:</div>
              <div className="font-bold text-white text-xs">{venda.comissaoGerencialBeneficiarioNome || 'Gestor'}</div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-slate-400">Valor a Quitar:</div>
              <div className="font-black text-amber-300 text-base">{formatCurrency(venda.comissaoGerencialValor || 0)}</div>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block font-semibold text-slate-300 mb-1.5">Status da Comissão</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStatus('Pendente')}
                className={`py-2 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  status === 'Pendente'
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <Clock size={14} />
                <span>Pendente</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus('Paga')}
                className={`py-2 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  status === 'Paga'
                    ? 'bg-emerald-500 border-emerald-500 text-slate-950'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <CheckCircle2 size={14} />
                <span>Paga / Liquidada</span>
              </button>
            </div>
          </div>

          {status === 'Paga' && (
            <>
              {/* Data e Forma */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Data do Pagamento</label>
                  <input
                    type="date"
                    value={dataPagamento}
                    onChange={(e) => setDataPagamento(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Forma de Pagamento</label>
                  <select
                    value={formaPagamento}
                    onChange={(e) => setFormaPagamento(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="PIX">PIX</option>
                    <option value="Transferência TED/DOC">Transferência TED/DOC</option>
                    <option value="Dinheiro / Espécie">Dinheiro / Espécie</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Conta Corrente">Conta Corrente</option>
                  </select>
                </div>
              </div>

              {/* Conta Bancária / Caixa de Origem */}
              {contasBancarias.length > 0 && (
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Conta Bancária de Saída (Origem)</label>
                  <select
                    value={contaOrigemId}
                    onChange={(e) => setContaOrigemId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  >
                    {contasBancarias.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome} (Saldo: {formatCurrency(c.saldo)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Observações */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Observações / Comprovante</label>
                <input
                  type="text"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Ex: Comprovante PIX chave CPF do gestor"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>
            </>
          )}

          {/* Botões */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition cursor-pointer"
            >
              {isSaving ? 'Salvando...' : 'Salvar Quitação'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
