import React, { useState, useEffect, useMemo } from 'react';
import { 
  Menu, 
  X, 
  Car, 
  ShieldCheck, 
  Plus, 
  Sparkles,
  Loader2
} from 'lucide-react';
import { 
  Veiculo, 
  VendaVeiculo, 
  DespesaFixa, 
  DespesaVeiculo, 
  ContratoLocacao, 
  PagamentoAluguel,
  Usuario,
  RegistroKmDiario,
  ItemManutencaoPreventiva,
  DebitoMotorista,
  ReposicaoCaucaoParcelada,
  EventoHistoricoVeiculo,
  FechamentoCaucaoResumo,
  FornecedorPrestador,
  BancoParceiro,
  ContaBancariaCaixa,
  MovimentacaoConta,
  RegistroTestDrive,
  LaudoVistoriaEntrada,
  EtapaKanbanPreparacao,
  StatusEstoque,
  StatusVeiculo
} from './types';
import { initialVeiculos, initialVendas, initialDespesasFixas } from './data/initialData';
import {
  subscribeVeiculos,
  subscribeVendas,
  subscribeDespesasFixas,
  subscribeProfissoes,
  saveProfissaoFirestore,
  DEFAULT_PROFISSOES,
  saveVeiculoFirestore,
  deleteVeiculoFirestore,
  saveVendaFirestore,
  deleteVendaFirestore,
  saveDespesaFixaFirestore,
  clearAllDemoDataFirestore,
  subscribeFornecedores,
  saveFornecedorFirestore,
  deleteFornecedorFirestore,
  DEFAULT_FORNECEDORES,
  processarRecebimentoVendaFinanceiro,
  subscribeContasBancarias,
  saveContaBancariaFirestore,
  saveMovimentacaoContaFirestore,
  processarLiquidacaoRecebivelFirestore,
  DEFAULT_CONTAS_BANCARIAS,
} from './services/firestoreService';
import {
  listenToAuthState, 
  subscribeUserProfile,
  subscribeAllUsers, 
  syncUserProfileInFirestore,
  logoutUser,
} from './services/authService';
import { LoginScreen } from './components/LoginScreen';
import { AguardandoAprovacaoScreen } from './components/AguardandoAprovacaoScreen';
import { CatalogoVendasView } from './components/CatalogoVendasView';
import { ComissoesVendasView } from './components/ComissoesVendasView';
import { DashboardVendedorView } from './components/DashboardVendedorView';
import { FornecedoresView } from './components/FornecedoresView';
import { BancosParceirosView } from './components/BancosParceirosView';
import { ContasPagarView } from './components/ContasPagarView';
import { ContasReceberView } from './components/ContasReceberView';
import { ModalNovoBanco } from './components/ModalNovoBanco';
import { bancosService } from './services/bancosService';
import { UsuariosModal } from './components/UsuariosModal';
import { ModalMeuPerfil } from './components/ModalMeuPerfil';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { EstoqueView } from './components/EstoqueView';
import { LocacaoView, TabLocacao } from './components/LocacaoView';
import { AgingView } from './components/AgingView';
import { RevisoesView } from './components/RevisoesView';
import { FinanceiroDREView } from './components/FinanceiroDREView';
import { CrmAnalyticsView } from './components/CrmAnalyticsView';
import { LogisticaTransitoView } from './components/LogisticaTransitoView';
import { DashboardExecutivoAvancado } from './components/DashboardExecutivoAvancado';
import { DossieModal } from './components/DossieModal';
import { ModalNovoVeiculo } from './components/ModalNovoVeiculo';
import { ModalNovaDespesa } from './components/ModalNovaDespesa';
import { ModalNovoContrato } from './components/ModalNovoContrato';
import { ModalVenderVeiculo } from './components/ModalVenderVeiculo';
import { ModalRegistrarRevisao } from './components/ModalRegistrarRevisao';
import { ModalNovaDespesaFixa } from './components/ModalNovaDespesaFixa';
import { ModalNovoLancamentoGlobal } from './components/ModalNovoLancamentoGlobal';
import { ModalBackupSeguranca } from './components/ModalBackupSeguranca';
import { ModalNovoFornecedor } from './components/ModalNovoFornecedor';
import { ModalTestDrive } from './components/ModalTestDrive';
import { ModalVistoria } from './components/ModalVistoria';
import { ModalRegistrarAbastecimento, DadosAbastecimento } from './components/ModalRegistrarAbastecimento';
import { ModalEnviarServico } from './components/ModalEnviarServico';
import { ModalRetornoPatio } from './components/ModalRetornoPatio';
import { FunilPreparacaoView } from './components/FunilPreparacaoView';
import { 
  aplicarEnvioServico, 
  aplicarRetornoPatio, 
  ParametrosEnviarServico, 
  ParametrosRetornoPatio 
} from './utils/auditLogger';
import { 
  ParametrosMovimentacaoVeiculo, 
  prepararMovimentacaoVeiculo 
} from './services/movimentacaoVeiculoService';
import { calculateAging, checkRevisaoNecessaria, calculateTotalDespesas, checkIsVeiculoVendido } from './utils/formatters';
import { ErrorBoundary } from './components/ErrorBoundary';

const STORAGE_KEYS = {
  VEICULOS: 'autogestor_veiculos_v1',
  VENDAS: 'autogestor_vendas_v1',
  DESPESAS_FIXAS: 'autogestor_despesas_fixas_v1',
  FORNECEDORES: 'autogestor_fornecedores_v1',
  BANCOS: 'autogestor_bancos_v1',
};

export default function App() {
  // --- Auth State ---
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<Usuario | null>(null);
  const [isUsuariosModalOpen, setIsUsuariosModalOpen] = useState<boolean>(false);
  const [isMeuPerfilOpen, setIsMeuPerfilOpen] = useState<boolean>(false);
  const [targetUserPerfil, setTargetUserPerfil] = useState<Usuario | null>(null);
  const [allUsersList, setAllUsersList] = useState<Usuario[]>([]);

  // --- Persistent States ---
  const [veiculos, setVeiculos] = useState<Veiculo[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.VEICULOS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch {
        return [];
      }
    }
    return [];
  });

  const [vendas, setVendas] = useState<VendaVeiculo[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.VENDAS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch {
        return [];
      }
    }
    return [];
  });

  const [despesasFixas, setDespesasFixas] = useState<DespesaFixa[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.DESPESAS_FIXAS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch {
        return [];
      }
    }
    return [];
  });

  // Fornecedores & Prestadores de Serviços (Rede Parceira)
  const [fornecedores, setFornecedores] = useState<FornecedorPrestador[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.FORNECEDORES);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch {
        // fallback
      }
    }
    return DEFAULT_FORNECEDORES;
  });

  // Lista de Profissões Dinâmicas Sincronizadas
  const [profissoes, setProfissoes] = useState<string[]>(() => {
    const saved = localStorage.getItem('autogestor_profissoes_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        // fallback
      }
    }
    return DEFAULT_PROFISSOES;
  });

  // Bancos Parceiros & Retornos Financeiros (TAC)
  const [bancos, setBancos] = useState<BancoParceiro[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.BANCOS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        // fallback
      }
    }
    return [];
  });

  // Contas Bancárias & Caixas da Loja (Bancos & Giro)
  const [contasBancarias, setContasBancarias] = useState<ContaBancariaCaixa[]>(() => {
    const saved = localStorage.getItem('autogestor_contas_bancarias_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        // fallback
      }
    }
    return DEFAULT_CONTAS_BANCARIAS;
  });

  // UI State
  const [activeTab, setActiveTab] = useState<string>('catalogo');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // Modals state
  const [isNovoVeiculoOpen, setIsNovoVeiculoOpen] = useState(false);
  const [veiculoToEdit, setVeiculoToEdit] = useState<Veiculo | null>(null);
  const [isNovaDespesaOpen, setIsNovaDespesaOpen] = useState(false);
  const [despesaTargetVeiculo, setDespesaTargetVeiculo] = useState<Veiculo | null>(null);
  const [despesaToEdit, setDespesaToEdit] = useState<DespesaVeiculo | null>(null);
  const [despesaVinculadaOrigem, setDespesaVinculadaOrigem] = useState<DespesaVeiculo | undefined>(undefined);
  const [isNovoContratoOpen, setIsNovoContratoOpen] = useState(false);
  const [contratoTargetVeiculo, setContratoTargetVeiculo] = useState<Veiculo | null>(null);
  const [isVendaModalOpen, setIsVendaModalOpen] = useState(false);
  const [vendaTargetVeiculo, setVendaTargetVeiculo] = useState<Veiculo | null>(null);
  const [isRevisaoModalOpen, setIsRevisaoModalOpen] = useState(false);
  const [revisaoTargetVeiculo, setRevisaoTargetVeiculo] = useState<Veiculo | null>(null);
  const [isDossieOpen, setIsDossieOpen] = useState(false);
  const [dossieVeiculo, setDossieVeiculo] = useState<Veiculo | null>(null);
  const [isNovaDespesaFixaOpen, setIsNovaDespesaFixaOpen] = useState(false);
  const [isNovoLancamentoGlobalOpen, setIsNovoLancamentoGlobalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isNovoFornecedorOpen, setIsNovoFornecedorOpen] = useState(false);
  const [fornecedorToEdit, setFornecedorToEdit] = useState<FornecedorPrestador | null>(null);
  const [isNovoBancoOpen, setIsNovoBancoOpen] = useState(false);
  const [bancoToEdit, setBancoToEdit] = useState<BancoParceiro | null>(null);
  const [isTestDriveModalOpen, setIsTestDriveModalOpen] = useState(false);
  const [testDriveTargetVeiculo, setTestDriveTargetVeiculo] = useState<Veiculo | null>(null);
  const [isVistoriaModalOpen, setIsVistoriaModalOpen] = useState(false);
  const [vistoriaTargetVeiculo, setVistoriaTargetVeiculo] = useState<Veiculo | null>(null);
  const [isAbastecimentoOpen, setIsAbastecimentoOpen] = useState(false);
  const [abastecimentoTargetVeiculo, setAbastecimentoTargetVeiculo] = useState<Veiculo | null>(null);
  const [isModalEnviarServicoOpen, setIsModalEnviarServicoOpen] = useState(false);
  const [veiculoParaEnviarServico, setVeiculoParaEnviarServico] = useState<Veiculo | null>(null);
  const [isModalRetornoPatioOpen, setIsModalRetornoPatioOpen] = useState(false);
  const [veiculoParaRetornoPatio, setVeiculoParaRetornoPatio] = useState<Veiculo | null>(null);

  // 1. Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribeAuth = listenToAuthState(async (fbUser) => {
      setCurrentUser(fbUser);
      if (fbUser) {
        try {
          const profile = await syncUserProfileInFirestore(fbUser);
          setCurrentUserProfile(profile);
          // If role is vendedor, default tab is catalogo
          if (profile.role === 'vendedor') {
            setActiveTab('catalogo');
          }
        } catch (err) {
          console.warn('Error syncing profile in Firestore:', err);
        }
      } else {
        setCurrentUserProfile(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  // 2. Realtime listener to current user profile updates (e.g. approval, role change)
  useEffect(() => {
    if (!currentUser?.uid) return;

    const unsubscribeProfile = subscribeUserProfile(currentUser.uid, (profile) => {
      if (profile) {
        setCurrentUserProfile(profile);
      }
    });

    return () => unsubscribeProfile();
  }, [currentUser?.uid]);

  // 3. Realtime listener to all users (for pending count badge)
  useEffect(() => {
    if (!currentUserProfile || currentUserProfile.statusAprovacao !== 'aprovado') return;

    const unsubscribeUsers = subscribeAllUsers((users) => {
      setAllUsersList(users);
    });

    return () => unsubscribeUsers();
  }, [currentUserProfile?.statusAprovacao]);

  // 4. Firestore Realtime Subscriptions & Cloud Sync (Active when authenticated and approved, or fallback)
  useEffect(() => {
    if (!currentUser || currentUserProfile?.statusAprovacao === 'pendente' || currentUserProfile?.statusAprovacao === 'recusado') return;

    // Subscribe to Veículos
    const unsubscribeVeiculos = subscribeVeiculos((firestoreVeiculos) => {
      if (firestoreVeiculos) {
        setVeiculos(firestoreVeiculos);
        setDossieVeiculo((prevDossie) => {
          if (!prevDossie) return null;
          const fresh = firestoreVeiculos.find((v) => v.id === prevDossie.id);
          return fresh || prevDossie;
        });
      }
    });

    // Subscribe to Vendas
    const unsubscribeVendas = subscribeVendas((firestoreVendas) => {
      if (firestoreVendas) {
        setVendas(firestoreVendas);
      }
    });

    // Subscribe to Despesas Fixas
    const unsubscribeDespesas = subscribeDespesasFixas((firestoreDespesas) => {
      if (firestoreDespesas) {
        setDespesasFixas(firestoreDespesas);
      }
    });

    // Subscribe to Fornecedores & Prestadores (Firestore)
    const unsubscribeFornecedores = subscribeFornecedores((fornecedoresList) => {
      if (fornecedoresList && fornecedoresList.length > 0) {
        setFornecedores(fornecedoresList);
      }
    });

    // Subscribe to Profissões Compartilhadas (Firestore)
    const unsubscribeProfissoes = subscribeProfissoes((profissoesList) => {
      if (profissoesList && profissoesList.length > 0) {
        setProfissoes(profissoesList);
      }
    });

    // Subscribe to Bancos Parceiros (Firestore)
    const unsubscribeBancos = bancosService.subscribeBancos((bancosList) => {
      if (bancosList && bancosList.length > 0) {
        setBancos(bancosList);
      }
    });

    // Subscribe to Contas Bancárias & Caixas (Firestore)
    const unsubscribeContas = subscribeContasBancarias((contasList) => {
      if (contasList && contasList.length > 0) {
        setContasBancarias(contasList);
      }
    });

    return () => {
      unsubscribeVeiculos();
      unsubscribeVendas();
      unsubscribeDespesas();
      unsubscribeFornecedores();
      unsubscribeProfissoes();
      unsubscribeBancos();
      unsubscribeContas();
    };
  }, [currentUser, currentUserProfile?.statusAprovacao]);

  // Save to localStorage as offline fallback cache
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.VEICULOS, JSON.stringify(veiculos));
  }, [veiculos]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.VENDAS, JSON.stringify(vendas));
  }, [vendas]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DESPESAS_FIXAS, JSON.stringify(despesasFixas));
  }, [despesasFixas]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.FORNECEDORES, JSON.stringify(fornecedores));
  }, [fornecedores]);

  useEffect(() => {
    localStorage.setItem('autogestor_profissoes_v1', JSON.stringify(profissoes));
  }, [profissoes]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.BANCOS, JSON.stringify(bancos));
  }, [bancos]);

  useEffect(() => {
    localStorage.setItem('autogestor_contas_bancarias_v1', JSON.stringify(contasBancarias));
  }, [contasBancarias]);

  // Reconciliação e persistência automática: garante que qualquer veículo que conste na lista/aba de vendas
  // seja formalmente atualizado como 'Vendido' no estoque e no Firestore, impedindo contagem indevida
  useEffect(() => {
    if (!vendas || vendas.length === 0 || !veiculos || veiculos.length === 0) return;

    const cleanPlaca = (p?: string) => (p || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const cleanChassi = (c?: string) => (c || '').trim().toUpperCase();

    let needsStateUpdate = false;
    const reconciled = veiculos.map((v) => {
      const vPlaca = cleanPlaca(v.placa);
      const vChassi = cleanChassi(v.chassi);

      const matchingVenda = vendas.find((vd) => {
        if (vd.veiculoId && (vd.veiculoId === v.id || vd.veiculoId === (v as any).veiculoId)) return true;
        if (vd.id && vd.id === v.id) return true;
        if (vPlaca && vd.placa && cleanPlaca(vd.placa) === vPlaca) return true;
        if (vChassi && vd.chassi && vChassi.length >= 6 && cleanChassi(vd.chassi) === vChassi) return true;
        return false;
      });

      if (matchingVenda) {
        const isNotFormallyMarked = v.status !== 'Vendido' || v.status_estoque !== 'Vendido' || !v.venda;
        if (isNotFormallyMarked) {
          needsStateUpdate = true;
          const updated: Veiculo = {
            ...v,
            status: 'Vendido',
            status_estoque: 'Vendido',
            dataVenda: v.dataVenda || matchingVenda.dataVenda,
            venda: v.venda || matchingVenda,
          };
          saveVeiculoFirestore(updated).catch((err) => {
            console.error('Erro ao persistir status de veículo vendido no Firestore:', err);
          });
          return updated;
        }
      }
      return v;
    });

    if (needsStateUpdate) {
      setVeiculos(reconciled);
    }
  }, [vendas, veiculos]);

  // Global counts for alerts and badges
  const counts = useMemo(() => {
    let alugados = 0;
    let disponiveis = 0;
    let emTransito = 0;
    let alertasAging = 0;
    let alertasPagamento = 0;
    let alertasRevisao = 0;
    let estoqueAtivoCount = 0;

    veiculos.forEach((v) => {
      const isVendido = checkIsVeiculoVendido(v, vendas);
      if (isVendido) {
        // Veículos vendidos não entram na contagem de estoque ativo nem do showroom comercial
        return;
      }

      estoqueAtivoCount++;
      if (v.status === 'Alugado') alugados++;
      if (v.status === 'Disponível') disponiveis++;
      if (v.status_estoque === 'Em Trânsito') emTransito++;

      // Aging check
      if (v.status === 'Disponível') {
        const aging = calculateAging(v.dataEntrada);
        if (aging.faixa === '60+') alertasAging++;
      }

      // Revisão check (10.000 KM)
      const rev = checkRevisaoNecessaria(v);
      if (rev.isUrgente) {
        alertasRevisao++;
      }

      // Locação atraso check
      if (v.contratoAtivo) {
        const hoje = new Date();
        const vencimento = new Date(v.contratoAtivo.proximoVencimento);
        if (vencimento < hoje) {
          alertasPagamento++;
        }
      }
    });

    const pendentesAprovacao = allUsersList.filter((u) => u.statusAprovacao === 'pendente').length;
    let comissoesPendentes = 0;
    let recebiveisPendentes = 0;
    vendas.forEach((v) => {
      if ((v.comissaoValor || 0) > 0 && (v.comissaoStatus === 'Pendente' || !v.comissaoStatus)) {
        comissoesPendentes++;
      }
      const fin = v.financiamentoDetalhes;
      if ((Number(fin?.valorFinanciado || 0) > 0 || v.formaPagamento === 'Financiamento') && fin?.statusLiquidacaoFinanciamento !== 'Recebido') {
        recebiveisPendentes++;
      }
      if (Number(fin?.retornoComissaoBanco || v.retornoFinanciamentoTac || 0) > 0 && fin?.statusLiquidacaoTac !== 'Recebido') {
        recebiveisPendentes++;
      }
    });

    let despesasPendentes = 0;
    veiculos.forEach((v) => {
      (v.despesas || []).forEach((d) => {
        if (d.statusPagamento === 'Pendente' || !d.statusPagamento) {
          despesasPendentes++;
        }
      });
    });

    return {
      totalVeiculos: estoqueAtivoCount,
      disponiveis,
      alugados,
      emTransito,
      alertasAging,
      alertasPagamento,
      alertasRevisao,
      totalFornecedores: fornecedores.length,
      totalBancos: bancos.length,
      pendentesAprovacao,
      comissoesPendentes,
      despesasPendentes,
      recebiveisPendentes,
    };
  }, [veiculos, allUsersList, vendas, fornecedores, bancos]);

  // --- Handlers de Fornecedores & Prestadores ---
  const handleSaveFornecedor = async (fornecedor: FornecedorPrestador) => {
    setFornecedores((prev) => {
      const exists = prev.some((f) => f.id === fornecedor.id);
      if (exists) {
        return prev.map((f) => (f.id === fornecedor.id ? fornecedor : f));
      }
      return [fornecedor, ...prev];
    });
    await saveFornecedorFirestore(fornecedor);
  };

  const handleDeleteFornecedor = async (id: string) => {
    setFornecedores((prev) => prev.filter((f) => f.id !== id));
    await deleteFornecedorFirestore(id);
  };

  // --- Business Logic Handlers ---

  // 1. Cadastrar / Editar Veículo (Com suporte a Histórico Retroativo de Vendas)
  const handleSaveVeiculo = async (veiculoData: Partial<Veiculo> & { isHistoricoVendido?: boolean; vendaHistorica?: any }) => {
    const isHistorico = veiculoData.isHistoricoVendido === true || veiculoData.status === 'Vendido';
    const vendaInfo = veiculoData.vendaHistorica;

    if (veiculoToEdit || veiculoData.id) {
      const idToUpdate = veiculoToEdit?.id || veiculoData.id;
      let targetVeiculoUpdated: Veiculo | null = null;
      let vendaGerada: VendaVeiculo | null = null;

      const custoAquisicao = veiculoData.custoAquisicao ?? veiculoToEdit?.custoAquisicao ?? 0;
      const dataEntrada = veiculoData.dataEntrada || veiculoToEdit?.dataEntrada || new Date().toISOString().split('T')[0];

      if (isHistorico && vendaInfo && veiculoToEdit) {
        const dataVenda = vendaInfo.dataVenda || new Date().toISOString().split('T')[0];
        const valorVenda = Number(vendaInfo.valorVenda || 0);
        const diasEmPatio = Math.max(0, Math.round((new Date(dataVenda).getTime() - new Date(dataEntrada).getTime()) / (1000 * 60 * 60 * 24)));
        const totalDesp = calculateTotalDespesas(veiculoToEdit);
        const custoTotal = custoAquisicao + totalDesp;
        const lucro = valorVenda - custoTotal;

        vendaGerada = {
          id: veiculoToEdit.venda?.id || `venda-${Date.now()}`,
          veiculoId: veiculoToEdit.id,
          placa: (veiculoData.placa || veiculoToEdit.placa).toUpperCase().trim(),
          modelo: veiculoData.modelo || veiculoToEdit.modelo,
          chassi: veiculoData.chassi || veiculoToEdit.chassi,
          valorCompra: custoAquisicao,
          totalDespesas: totalDesp,
          custoTotal,
          valorVenda,
          lucroLiquido: lucro,
          margemLucroPercent: custoTotal > 0 ? (lucro / custoTotal) * 100 : 0,
          dataEntrada,
          dataVenda,
          diasEmPatio,
          compradorNome: vendaInfo.compradorNome || 'Cliente Particular',
          compradorCpf: vendaInfo.compradorCpf || '000.000.000-00',
          formaPagamento: vendaInfo.formaPagamento || 'À Vista PIX',
          canalOrigem: vendaInfo.canalOrigem || 'Passante/Pátio',
          vendedorNome: vendaInfo.vendedorNome || 'Vendedor do Pátio',
          comissaoValor: Number(vendaInfo.comissaoValor || 0),
          observacoesVenda: vendaInfo.observacoesVenda || 'Venda retroativa histórica',
        };
      }

      setVeiculos((prev) =>
        prev.map((v) => {
          if (v.id === idToUpdate) {
            const updated: Veiculo = {
              ...v,
              ...veiculoData,
              id: v.id,
              status: isHistorico ? 'Vendido' : (veiculoData.status || v.status || 'Disponível'),
              despesas: v.despesas || [],
              venda: vendaGerada || v.venda,
            };
            targetVeiculoUpdated = updated;
            return updated;
          }
          return v;
        })
      );

      if (vendaGerada) {
        setVendas((prev) => {
          const filtered = prev.filter((item) => item.veiculoId !== idToUpdate && item.id !== (vendaGerada as VendaVeiculo).id);
          return [vendaGerada as VendaVeiculo, ...filtered];
        });
        await saveVendaFirestore(vendaGerada);
      }

      if (targetVeiculoUpdated) {
        await saveVeiculoFirestore(targetVeiculoUpdated);
        if (dossieVeiculo?.id === idToUpdate) {
          setDossieVeiculo(targetVeiculoUpdated);
        }
      }
    } else {
      const novoVeiculoId = `v-${Date.now()}`;
      const dataEntrada = veiculoData.dataEntrada || new Date().toISOString().split('T')[0];
      const custoAquisicao = Number(veiculoData.custoAquisicao || 0);

      let vendaGerada: VendaVeiculo | undefined = undefined;

      if (isHistorico && vendaInfo) {
        const dataVenda = vendaInfo.dataVenda || new Date().toISOString().split('T')[0];
        const valorVenda = Number(vendaInfo.valorVenda || 0);
        const diasEmPatio = Math.max(0, Math.round((new Date(dataVenda).getTime() - new Date(dataEntrada).getTime()) / (1000 * 60 * 60 * 24)));
        const lucro = valorVenda - custoAquisicao;

        vendaGerada = {
          id: `venda-${Date.now()}`,
          veiculoId: novoVeiculoId,
          placa: (veiculoData.placa || 'PLACA').toUpperCase().trim(),
          modelo: veiculoData.modelo || 'Modelo Não Informado',
          chassi: veiculoData.chassi || `CH-${Date.now().toString().slice(-6)}`,
          valorCompra: custoAquisicao,
          totalDespesas: 0,
          custoTotal: custoAquisicao,
          valorVenda,
          lucroLiquido: lucro,
          margemLucroPercent: custoAquisicao > 0 ? (lucro / custoAquisicao) * 100 : 0,
          dataEntrada,
          dataVenda,
          diasEmPatio,
          compradorNome: vendaInfo.compradorNome || 'Cliente Particular',
          compradorCpf: vendaInfo.compradorCpf || '000.000.000-00',
          formaPagamento: vendaInfo.formaPagamento || 'À Vista PIX',
          canalOrigem: vendaInfo.canalOrigem || 'Passante/Pátio',
          vendedorNome: vendaInfo.vendedorNome || 'Vendedor do Pátio',
          comissaoValor: Number(vendaInfo.comissaoValor || 0),
          observacoesVenda: vendaInfo.observacoesVenda || 'Cadastro retroativo de venda histórica',
        };
      }

      const fabYear = Number(veiculoData.anoFabricacao) || Number(veiculoData.ano) || new Date().getFullYear();
      const modYear = Number(veiculoData.anoModelo) || Number(veiculoData.ano) || new Date().getFullYear();

      const newVeiculo: Veiculo = {
        modelo: veiculoData.modelo || '',
        marca: veiculoData.marca || 'Diversas',
        ano: modYear,
        anoFabricacao: fabYear,
        anoModelo: modYear,
        tipoPropriedade: veiculoData.tipoPropriedade || 'proprio',
        cambio: veiculoData.cambio || 'Manual',
        motorizacao: veiculoData.motorizacao || '1.0 Flex',
        potencia: veiculoData.potencia || '',
        notaEntradaGerada: veiculoData.notaEntradaGerada !== false,
        notaEntradaNumero: veiculoData.notaEntradaNumero,
        notaEntradaData: veiculoData.notaEntradaData,
        notaEntradaChave: veiculoData.notaEntradaChave,
        notaEntradaObs: veiculoData.notaEntradaObs,
        cor: veiculoData.cor || 'Prata',
        placa: (veiculoData.placa || '').toUpperCase().trim(),
        chassi: veiculoData.chassi || `CH-${Date.now().toString().slice(-6)}`,
        combustivel: veiculoData.combustivel || 'Flex',
        kmAtual: Number(veiculoData.kmAtual) || 0,
        kmUltimaRevisao: Number(veiculoData.kmUltimaRevisao) || Number(veiculoData.kmAtual) || 0,
        custoAquisicao,
        valorFipe: Number(veiculoData.valorFipe) || 0,
        valorVendaSugerido: Number(veiculoData.valorVendaSugerido) || Number(veiculoData.valorFipe) || 0,
        dataEntrada,
        localizacaoPatio: veiculoData.localizacaoPatio || 'Pátio Principal',
        fotoUrl: veiculoData.fotoUrl || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80',
        id: novoVeiculoId,
        status: isHistorico ? 'Vendido' : (veiculoData.status || 'Disponível'),
        despesas: [],
        venda: vendaGerada,
      };

      setVeiculos((prev) => [newVeiculo, ...prev]);
      await saveVeiculoFirestore(newVeiculo);

      if (vendaGerada) {
        setVendas((prev) => [vendaGerada as VendaVeiculo, ...prev]);
        await saveVendaFirestore(vendaGerada);
      }
    }
    setVeiculoToEdit(null);
  };

  const handleEditVeiculo = (veiculo: Veiculo) => {
    setVeiculoToEdit(veiculo);
    setIsNovoVeiculoOpen(true);
  };

  const handleDeleteVeiculo = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este veículo e seu histórico por completo?')) {
      setVeiculos((prev) => prev.filter((v) => v.id !== id));
      await deleteVeiculoFirestore(id);
    }
  };

  // Atualização direta de veículo (por exemplo, status fiscal e notas fiscais)
  const handleUpdateVeiculoDirect = async (updatedVeiculo: Veiculo) => {
    setVeiculos((prev) =>
      prev.map((v) => (v.id === updatedVeiculo.id ? updatedVeiculo : v))
    );
    await saveVeiculoFirestore(updatedVeiculo);
    if (dossieVeiculo?.id === updatedVeiculo.id) {
      setDossieVeiculo(updatedVeiculo);
    }
  };

  // 2. Lançar ou Editar Custo / Despesa / Comissão no Chassi
  const handleSaveDespesa = async (
    veiculoIdOrData: string | Omit<DespesaVeiculo, 'id'>,
    maybeData?: Omit<DespesaVeiculo, 'id'> | Omit<DespesaVeiculo, 'id'>[],
    despesaIdToEdit?: string
  ) => {
    let targetVeiculoId: string;
    const novasDespesas: DespesaVeiculo[] = [];

    if (typeof veiculoIdOrData === 'string' && maybeData) {
      targetVeiculoId = veiculoIdOrData;
      if (Array.isArray(maybeData)) {
        // Múltiplas despesas (ex: Entrada + Restante ou Parcelamento em série)
        let idEntrada: string | undefined = undefined;
        const now = Date.now();
        maybeData.forEach((item, index) => {
          const id = `desp-parc-${now}-${index + 1}-${Math.random().toString(36).substring(2, 5)}`;
          if (index === 0 && item.tipoVinculo === 'entrada') {
            idEntrada = id;
          }
          const despFinal: DespesaVeiculo = {
            ...item,
            id,
            veiculoId: targetVeiculoId,
            despesaOrigemId: item.despesaOrigemId === 'TEMP_ENTRADA_ID' && idEntrada ? idEntrada : item.despesaOrigemId,
          };
          novasDespesas.push(despFinal);
        });
      } else {
        novasDespesas.push({
          ...maybeData,
          id: despesaIdToEdit || `desp-${Date.now()}`,
          veiculoId: targetVeiculoId,
        });
      }
    } else {
      const single = veiculoIdOrData as Omit<DespesaVeiculo, 'id'>;
      targetVeiculoId = single.veiculoId;
      novasDespesas.push({
        ...single,
        id: despesaIdToEdit || `desp-${Date.now()}`,
        veiculoId: targetVeiculoId,
      });
    }

    let targetVeiculoUpdated: Veiculo | null = null;

    setVeiculos((prev) =>
      prev.map((v) => {
        if (v.id === targetVeiculoId) {
          let updatedDespesas: DespesaVeiculo[];
          if (despesaIdToEdit) {
            updatedDespesas = (v.despesas || []).map((d) => (d.id === despesaIdToEdit ? novasDespesas[0] : d));
          } else {
            updatedDespesas = [...novasDespesas, ...(v.despesas || [])];
          }
          const updated: Veiculo = {
            ...v,
            despesas: updatedDespesas,
          };
          targetVeiculoUpdated = updated;
          return updated;
        }
        return v;
      })
    );

    if (targetVeiculoUpdated) {
      await saveVeiculoFirestore(targetVeiculoUpdated);
      if (dossieVeiculo?.id === targetVeiculoId) {
        setDossieVeiculo(targetVeiculoUpdated);
      }
    }

    // Processamento de baixa bancária automática para despesas quitadas no ato
    for (const desp of novasDespesas) {
      if (desp.statusPagamento === 'Pago' && desp.contaBancariaId) {
        const conta = contasBancarias.find((c) => c.id === desp.contaBancariaId);
        if (conta) {
          const movId = `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          const novaMov: MovimentacaoConta = {
            id: movId,
            contaId: conta.id,
            contaNome: conta.nome,
            tipo: 'Despesa',
            categoria: desp.categoria,
            valor: desp.valor,
            data: desp.dataPagamento || desp.data,
            descricao: desp.descricao,
            veiculoId: targetVeiculoId,
            placa: desp.placa,
            formaPagamento: desp.formaPagamento || 'PIX',
            criadoPor: currentUserProfile?.displayName || 'Administrador',
            createdAt: new Date().toISOString(),
          };
          const contaAtualizada: ContaBancariaCaixa = {
            ...conta,
            saldoAtual: (conta.saldoAtual || 0) - desp.valor,
            historicoMovimentacoes: [novaMov, ...(conta.historicoMovimentacoes || [])],
          };
          setContasBancarias((prev) => prev.map((c) => (c.id === conta.id ? contaAtualizada : c)));
          await saveContaBancariaFirestore(contaAtualizada);
          await saveMovimentacaoContaFirestore(novaMov);
        }
      }
    }
  };

  const handleDeleteDespesa = async (veiculoId: string, despesaId: string) => {
    let targetVeiculoUpdated: Veiculo | null = null;

    setVeiculos((prev) =>
      prev.map((v) => {
        if (v.id === veiculoId) {
          const updated: Veiculo = {
            ...v,
            despesas: (v.despesas || []).filter((d) => d.id !== despesaId),
          };
          targetVeiculoUpdated = updated;
          return updated;
        }
        return v;
      })
    );

    if (targetVeiculoUpdated) {
      await saveVeiculoFirestore(targetVeiculoUpdated);
      if (dossieVeiculo?.id === veiculoId) {
        setDossieVeiculo(targetVeiculoUpdated);
      }
    }
  };

  // 3. Locação Contrato
  const handleSaveContrato = async (
    veiculoId: string,
    contratoData: Omit<ContratoLocacao, 'id' | 'pagamentos'>
  ) => {
    const contratoId = `ct-${Date.now()}`;
    const novoContrato: ContratoLocacao = {
      ...contratoData,
      id: contratoId,
      pagamentos: [
        {
          id: `pag-caucao-${Date.now()}`,
          contratoId,
          veiculoId,
          motoristaNome: contratoData.motoristaNome,
          semanaReferencia: 'Caução Inicial',
          dataVencimento: contratoData.dataInicio,
          dataPagamento: contratoData.dataInicio,
          metodoPagamento: 'PIX',
          valor: contratoData.caucao,
          status: 'Pago',
          observacao: 'Caução de garantia na retirada do veículo',
        },
      ],
    };

    const eventoLocacao: EventoHistoricoVeiculo = {
      id: `hs-loc-${Date.now()}`,
      data: contratoData.dataInicio,
      tipo: 'Locação Iniciada',
      titulo: `Contrato de Locação Iniciado (${contratoData.motoristaApp})`,
      descricao: `Início de contrato com o motorista ${contratoData.motoristaNome}. R$ ${contratoData.valorSemanal}/semana. Caução depositado: R$ ${contratoData.caucao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
      statusResultante: 'Alugado',
      km: contratoData.kmInicial,
      motoristaNome: contratoData.motoristaNome,
      motoristaCpf: contratoData.motoristaCpf,
      valor: contratoData.valorSemanal,
      usuarioRegistro: currentUserProfile?.displayName || 'Gestor',
    };

    let targetVeiculoUpdated: Veiculo | null = null;

    setVeiculos((prev) =>
      prev.map((v) => {
        if (v.id === veiculoId) {
          const updated: Veiculo = {
            ...v,
            status: 'Alugado',
            contratoAtivo: novoContrato,
            historicoStatus: [eventoLocacao, ...(v.historicoStatus || [])],
          };
          targetVeiculoUpdated = updated;
          return updated;
        }
        return v;
      })
    );

    if (targetVeiculoUpdated) {
      await saveVeiculoFirestore(targetVeiculoUpdated);
      if (dossieVeiculo?.id === veiculoId) {
        setDossieVeiculo(targetVeiculoUpdated);
      }
    }
  };

  const handleRegistrarPagamento = async (
    veiculoId: string,
    pagamentoData: Omit<PagamentoAluguel, 'id'>,
    proximaDataVencimento?: string
  ) => {
    const novoPagamento: PagamentoAluguel = {
      ...pagamentoData,
      id: `pag-${Date.now()}`,
    };

    let targetVeiculoUpdated: Veiculo | null = null;

    setVeiculos((prev) =>
      prev.map((v) => {
        if (v.id === veiculoId && v.contratoAtivo) {
          const updatedContrato: ContratoLocacao = {
            ...v.contratoAtivo,
            proximoVencimento: proximaDataVencimento || v.contratoAtivo.proximoVencimento,
            pagamentos: [novoPagamento, ...(v.contratoAtivo.pagamentos || [])],
          };
          const updated: Veiculo = {
            ...v,
            contratoAtivo: updatedContrato,
          };
          targetVeiculoUpdated = updated;
          return updated;
        }
        return v;
      })
    );

    if (targetVeiculoUpdated) {
      await saveVeiculoFirestore(targetVeiculoUpdated);
    }
  };

  const handleEncerrarContrato = async (veiculoId: string) => {
    if (window.confirm('Confirma o encerramento do contrato de locação e retorno do veículo para o pátio?')) {
      let targetVeiculoUpdated: Veiculo | null = null;

      setVeiculos((prev) =>
        prev.map((v) => {
          if (v.id === veiculoId) {
            const motoristaNome = v.contratoAtivo?.motoristaNome;
            const eventoDevolucao: EventoHistoricoVeiculo = {
              id: `hs-dev-${Date.now()}`,
              data: new Date().toISOString().split('T')[0],
              tipo: 'Devolução / Encerramento',
              titulo: 'Devolução do Veículo & Retorno ao Pátio',
              descricao: `Contrato de locação com ${motoristaNome || 'o motorista'} encerrado. Veículo vistoriado e retornado ao pátio disponível.`,
              statusResultante: 'Disponível',
              km: v.kmAtual,
              motoristaNome: motoristaNome,
              usuarioRegistro: currentUserProfile?.displayName || 'Gestor',
            };

            const updated: Veiculo = {
              ...v,
              status: 'Disponível',
              contratoAtivo: undefined,
              historicoStatus: [eventoDevolucao, ...(v.historicoStatus || [])],
            };
            targetVeiculoUpdated = updated;
            return updated;
          }
          return v;
        })
      );

      if (targetVeiculoUpdated) {
        await saveVeiculoFirestore(targetVeiculoUpdated);
        if (dossieVeiculo?.id === veiculoId) {
          setDossieVeiculo(targetVeiculoUpdated);
        }
      }
    }
  };

  const handleAdicionarEventoStatus = async (
    veiculoId: string,
    novoEvento: EventoHistoricoVeiculo
  ) => {
    let targetVeiculoUpdated: Veiculo | null = null;

    setVeiculos((prev) =>
      prev.map((v) => {
        if (v.id === veiculoId) {
          let novaEtapaKanban: EtapaKanbanPreparacao = v.etapaKanban || 'Oficina';
          let novoStatusEstoque: StatusEstoque = v.status_estoque || 'No Pátio';
          let novoStatusVeiculo: StatusVeiculo = novoEvento.statusResultante || v.status;

          // Sincronização inteligente de status baseada no tipo de evento
          if (novoEvento.tipo === 'Preparação / Estética') {
            novaEtapaKanban = 'Estética';
            novoStatusEstoque = 'Em Preparação';
            if (novoStatusVeiculo !== 'Alugado' && novoStatusVeiculo !== 'Vendido') {
              novoStatusVeiculo = 'Em Preparação';
            }
          } else if (
            novoEvento.tipo === 'Envio para Oficina' || 
            novoEvento.tipo === 'Manutenção Preventiva' || 
            novoEvento.tipo === 'Revisão Periódica'
          ) {
            novaEtapaKanban = 'Oficina';
            novoStatusEstoque = 'Em Preparação';
            if (novoStatusVeiculo !== 'Alugado' && novoStatusVeiculo !== 'Vendido') {
              novoStatusVeiculo = 'Em Manutenção';
            }
          } else if (novoEvento.tipo === 'Retorno ao Pátio') {
            novaEtapaKanban = 'Pronto para Pátio';
            novoStatusEstoque = 'No Pátio';
            if (novoStatusVeiculo !== 'Alugado' && novoStatusVeiculo !== 'Vendido') {
              novoStatusVeiculo = 'Disponível';
            }
          }

          const updated: Veiculo = {
            ...v,
            status: novoStatusVeiculo,
            status_estoque: novoStatusEstoque,
            etapaKanban: novaEtapaKanban,
            fornecedorAtualNome: novoEvento.fornecedorOficina || v.fornecedorAtualNome,
            kmAtual: novoEvento.km !== undefined ? Math.max(v.kmAtual, novoEvento.km) : v.kmAtual,
            historicoStatus: [novoEvento, ...(v.historicoStatus || [])],
          };
          targetVeiculoUpdated = updated;
          return updated;
        }
        return v;
      })
    );

    if (targetVeiculoUpdated) {
      await saveVeiculoFirestore(targetVeiculoUpdated);
      if (dossieVeiculo?.id === veiculoId) {
        setDossieVeiculo(targetVeiculoUpdated);
      }
    }
  };

  // 4. Função Centralizada de Movimentação de Veículo (Kanban, Fornecedores, Auditoria e Estoque)
  const handleMovimentarVeiculo = async (
    params: ParametrosMovimentacaoVeiculo
  ): Promise<Veiculo> => {
    // 1. Unificação de regras de negócio, status_estoque, etapaKanban, desassociação de fornecedor e log de auditoria
    const veiculoAtualizado = prepararMovimentacaoVeiculo({
      ...params,
      usuario: params.usuario || currentUserProfile,
    });

    // 2. Atualização otimista no estado da aplicação
    setVeiculos((prev) =>
      prev.map((v) => (v.id === veiculoAtualizado.id ? veiculoAtualizado : v))
    );
    if (dossieVeiculo?.id === veiculoAtualizado.id) {
      setDossieVeiculo(veiculoAtualizado);
    }

    // 3. Persistência atômica no Firestore (garantindo limpeza de prestador via null se aplicável)
    await saveVeiculoFirestore(veiculoAtualizado);

    return veiculoAtualizado;
  };

  // Atualizar Etapa no Funil de Preparação (Kanban)
  const handleUpdateEtapaKanban = async (
    veiculoId: string,
    novaEtapa: EtapaKanbanPreparacao
  ) => {
    const veiculo = veiculos.find((v) => v.id === veiculoId);
    if (!veiculo) return;

    await handleMovimentarVeiculo({
      veiculo,
      novaEtapaKanban: novaEtapa,
      origemModulo: 'Funil de Preparação (Kanban)',
      usuario: currentUserProfile,
    });
  };

  // Handlers para Envio e Retorno de Serviço Rápido (Sincronização 100% Automática)
  const handleConfirmarEnvioServico = async ({
    veiculoId,
    paramsEnvio,
    despesaData,
  }: {
    veiculoId: string;
    paramsEnvio: ParametrosEnviarServico;
    despesaData?: Omit<DespesaVeiculo, 'id'>;
  }) => {
    const veiculo = veiculos.find((v) => v.id === veiculoId) || paramsEnvio.veiculo;
    if (!veiculo) return;

    let veiculoAtualizado = prepararMovimentacaoVeiculo({
      veiculo,
      novaEtapaKanban: paramsEnvio.etapaKanban,
      novoStatusEstoque: 'Em Preparação',
      fornecedorId: paramsEnvio.fornecedorId,
      fornecedorNome: paramsEnvio.fornecedorNome,
      fornecedorCategoria: paramsEnvio.fornecedorCategoria,
      servicoDescricao: paramsEnvio.servicoDescricao,
      km: paramsEnvio.kmSaida,
      custo: paramsEnvio.custoEstimado,
      motivoObservacao: paramsEnvio.motivoSaida,
      origemModulo: 'Envio para Serviço',
      usuario: currentUserProfile,
    });

    if (despesaData) {
      const novaDesp: DespesaVeiculo = {
        ...despesaData,
        id: `desp-servico-${Date.now()}`,
        veiculoId: veiculo.id,
      };
      veiculoAtualizado = {
        ...veiculoAtualizado,
        despesas: [novaDesp, ...(veiculoAtualizado.despesas || [])],
      };
    }

    setVeiculos((prev) =>
      prev.map((v) => (v.id === veiculoId ? veiculoAtualizado : v))
    );
    if (dossieVeiculo?.id === veiculoId) {
      setDossieVeiculo(veiculoAtualizado);
    }

    await saveVeiculoFirestore(veiculoAtualizado);

    if (despesaData && despesaData.statusPagamento === 'Pago' && despesaData.contaBancariaId) {
      const conta = contasBancarias.find((c) => c.id === despesaData.contaBancariaId);
      if (conta) {
        const movId = `mov-${Date.now()}`;
        const novaMov: MovimentacaoConta = {
          id: movId,
          contaId: conta.id,
          contaNome: conta.nome,
          tipo: 'Despesa',
          categoria: despesaData.categoria,
          valor: despesaData.valor,
          data: despesaData.data,
          descricao: despesaData.descricao,
          veiculoId: veiculoId,
          placa: despesaData.placa,
          formaPagamento: despesaData.formaPagamento || 'PIX',
          criadoPor: currentUserProfile?.displayName || 'Administrador',
          createdAt: new Date().toISOString(),
        };
        const contaAtualizada: ContaBancariaCaixa = {
          ...conta,
          saldoAtual: (conta.saldoAtual || 0) - despesaData.valor,
          historicoMovimentacoes: [novaMov, ...(conta.historicoMovimentacoes || [])],
        };
        setContasBancarias((prev) => prev.map((c) => (c.id === conta.id ? contaAtualizada : c)));
        await saveContaBancariaFirestore(contaAtualizada);
        await saveMovimentacaoContaFirestore(novaMov);
      }
    }
  };

  const handleConfirmarRetornoPatio = async ({
    veiculoId,
    paramsRetorno,
    despesaData,
  }: {
    veiculoId: string;
    paramsRetorno: ParametrosRetornoPatio;
    despesaData?: Omit<DespesaVeiculo, 'id'>;
  }) => {
    const veiculo = veiculos.find((v) => v.id === veiculoId) || paramsRetorno.veiculo;
    if (!veiculo) return;

    let veiculoAtualizado = prepararMovimentacaoVeiculo({
      veiculo,
      novaEtapaKanban: 'Pronto para Pátio',
      novoStatusEstoque: 'No Pátio',
      km: paramsRetorno.kmRetorno,
      custo: paramsRetorno.custoRealizado,
      avaliacaoQualidade: paramsRetorno.avaliacaoQualidade,
      motivoObservacao: paramsRetorno.observacoes,
      origemModulo: 'Retorno ao Pátio',
      usuario: currentUserProfile,
    });

    if (despesaData) {
      const novaDesp: DespesaVeiculo = {
        ...despesaData,
        id: `desp-retorno-${Date.now()}`,
        veiculoId: veiculo.id,
      };
      veiculoAtualizado = {
        ...veiculoAtualizado,
        despesas: [novaDesp, ...(veiculoAtualizado.despesas || [])],
      };
    }

    setVeiculos((prev) =>
      prev.map((v) => (v.id === veiculoId ? veiculoAtualizado : v))
    );
    if (dossieVeiculo?.id === veiculoId) {
      setDossieVeiculo(veiculoAtualizado);
    }

    await saveVeiculoFirestore(veiculoAtualizado);

    if (despesaData && despesaData.statusPagamento === 'Pago' && despesaData.contaBancariaId) {
      const conta = contasBancarias.find((c) => c.id === despesaData.contaBancariaId);
      if (conta) {
        const movId = `mov-${Date.now()}`;
        const novaMov: MovimentacaoConta = {
          id: movId,
          contaId: conta.id,
          contaNome: conta.nome,
          tipo: 'Despesa',
          categoria: despesaData.categoria,
          valor: despesaData.valor,
          data: despesaData.data,
          descricao: despesaData.descricao,
          veiculoId: veiculoId,
          placa: despesaData.placa,
          formaPagamento: despesaData.formaPagamento || 'PIX',
          criadoPor: currentUserProfile?.displayName || 'Administrador',
          createdAt: new Date().toISOString(),
        };
        const contaAtualizada: ContaBancariaCaixa = {
          ...conta,
          saldoAtual: (conta.saldoAtual || 0) - despesaData.valor,
          historicoMovimentacoes: [novaMov, ...(conta.historicoMovimentacoes || [])],
        };
        setContasBancarias((prev) => prev.map((c) => (c.id === conta.id ? contaAtualizada : c)));
        await saveContaBancariaFirestore(contaAtualizada);
        await saveMovimentacaoContaFirestore(novaMov);
      }
    }
  };

  const openEnviarServico = (veiculo?: Veiculo | null) => {
    setVeiculoParaEnviarServico(veiculo || null);
    setIsModalEnviarServicoOpen(true);
  };

  const openRetornoPatio = (veiculo: Veiculo) => {
    setVeiculoParaRetornoPatio(veiculo);
    setIsModalRetornoPatioOpen(true);
  };

  const handleAtualizarKm = async (veiculoId: string, novoKm: number) => {
    let targetVeiculoUpdated: Veiculo | null = null;

    setVeiculos((prev) =>
      prev.map((v) => {
        if (v.id === veiculoId) {
          const updatedContrato = v.contratoAtivo
            ? { ...v.contratoAtivo, kmAtual: Math.max(v.contratoAtivo.kmAtual || 0, novoKm) }
            : undefined;
          const updated: Veiculo = {
            ...v,
            kmAtual: Math.max(v.kmAtual, novoKm),
            contratoAtivo: updatedContrato,
          };
          targetVeiculoUpdated = updated;
          return updated;
        }
        return v;
      })
    );

    if (targetVeiculoUpdated) {
      await saveVeiculoFirestore(targetVeiculoUpdated);
    }
  };

  // Handlers para Módulo Locação App Drivers
  const handleSalvarKmDiario = async (
    veiculoId: string,
    contratoId: string,
    novoKm: number,
    registro: RegistroKmDiario
  ) => {
    let targetVeiculoUpdated: Veiculo | null = null;

    setVeiculos((prev) =>
      prev.map((v) => {
        if (v.id === veiculoId && v.contratoAtivo && v.contratoAtivo.id === contratoId) {
          const novosRegistros = [registro, ...(v.contratoAtivo.registrosKmDiario || [])];
          const updatedContrato: ContratoLocacao = {
            ...v.contratoAtivo,
            kmAtual: novoKm,
            registrosKmDiario: novosRegistros,
          };
          const updated: Veiculo = {
            ...v,
            kmAtual: novoKm,
            contratoAtivo: updatedContrato,
          };
          targetVeiculoUpdated = updated;
          return updated;
        }
        return v;
      })
    );

    if (targetVeiculoUpdated) {
      await saveVeiculoFirestore(targetVeiculoUpdated);
    }
  };

  const handleSalvarItensManutencao = async (
    veiculoId: string,
    contratoId: string,
    itens: ItemManutencaoPreventiva[]
  ) => {
    let targetVeiculoUpdated: Veiculo | null = null;

    setVeiculos((prev) =>
      prev.map((v) => {
        if (v.id === veiculoId && v.contratoAtivo && v.contratoAtivo.id === contratoId) {
          const updatedContrato: ContratoLocacao = {
            ...v.contratoAtivo,
            itensManutencao: itens,
          };
          const updated: Veiculo = {
            ...v,
            contratoAtivo: updatedContrato,
          };
          targetVeiculoUpdated = updated;
          return updated;
        }
        return v;
      })
    );

    if (targetVeiculoUpdated) {
      await saveVeiculoFirestore(targetVeiculoUpdated);
    }
  };

  const handleRegistrarManutencaoRealizada = async (
    veiculoId: string,
    contratoId: string,
    itemAtualizado: ItemManutencaoPreventiva,
    despesa: DespesaVeiculo
  ) => {
    let targetVeiculoUpdated: Veiculo | null = null;

    setVeiculos((prev) =>
      prev.map((v) => {
        if (v.id === veiculoId && v.contratoAtivo && v.contratoAtivo.id === contratoId) {
          const novosItens = (v.contratoAtivo.itensManutencao || []).map((i) =>
            i.id === itemAtualizado.id ? itemAtualizado : i
          );
          const updatedContrato: ContratoLocacao = {
            ...v.contratoAtivo,
            itensManutencao: novosItens,
          };
          const updated: Veiculo = {
            ...v,
            despesas: [despesa, ...(v.despesas || [])],
            contratoAtivo: updatedContrato,
          };
          targetVeiculoUpdated = updated;
          return updated;
        }
        return v;
      })
    );

    if (targetVeiculoUpdated) {
      await saveVeiculoFirestore(targetVeiculoUpdated);
    }
  };

  const handleSalvarDebitoMotorista = async (
    veiculoId: string,
    contratoId: string,
    novoDebito: DebitoMotorista,
    descontarCaucao: boolean,
    valorDescontarCaucao: number
  ) => {
    let targetVeiculoUpdated: Veiculo | null = null;

    setVeiculos((prev) =>
      prev.map((v) => {
        if (v.id === veiculoId && v.contratoAtivo && v.contratoAtivo.id === contratoId) {
          const novosDebitos = [novoDebito, ...(v.contratoAtivo.debitosMotorista || [])];
          const saldoAtual = v.contratoAtivo.caucaoSaldoAtual !== undefined ? v.contratoAtivo.caucaoSaldoAtual : v.contratoAtivo.caucao;
          const utilizadoAtual = v.contratoAtivo.caucaoUtilizado || 0;

          const updatedContrato: ContratoLocacao = {
            ...v.contratoAtivo,
            debitosMotorista: novosDebitos,
            caucaoSaldoAtual: descontarCaucao ? Math.max(0, saldoAtual - valorDescontarCaucao) : saldoAtual,
            caucaoUtilizado: descontarCaucao ? utilizadoAtual + valorDescontarCaucao : utilizadoAtual,
          };
          const updated: Veiculo = {
            ...v,
            contratoAtivo: updatedContrato,
          };
          targetVeiculoUpdated = updated;
          return updated;
        }
        return v;
      })
    );

    if (targetVeiculoUpdated) {
      await saveVeiculoFirestore(targetVeiculoUpdated);
    }
  };

  const handleSalvarCaucaoMotorista = async (
    veiculoId: string,
    contratoId: string,
    saldoAtual: number,
    totalPago: number,
    utilizado: number,
    reposicao?: ReposicaoCaucaoParcelada,
    fechamento?: FechamentoCaucaoResumo,
    score?: 'A' | 'B' | 'C' | 'D'
  ) => {
    let targetVeiculoUpdated: Veiculo | null = null;

    setVeiculos((prev) =>
      prev.map((v) => {
        if (v.id === veiculoId && v.contratoAtivo && v.contratoAtivo.id === contratoId) {
          const updatedContrato: ContratoLocacao = {
            ...v.contratoAtivo,
            caucaoSaldoAtual: saldoAtual,
            caucaoTotalPago: totalPago,
            caucaoUtilizado: utilizado,
            reposicaoCaucao: reposicao,
            fechamentoCaucao: fechamento || v.contratoAtivo.fechamentoCaucao,
            scoreMotorista: score || v.contratoAtivo.scoreMotorista,
          };
          const updated: Veiculo = {
            ...v,
            contratoAtivo: updatedContrato,
          };
          targetVeiculoUpdated = updated;
          return updated;
        }
        return v;
      })
    );

    if (targetVeiculoUpdated) {
      await saveVeiculoFirestore(targetVeiculoUpdated);
    }
  };

  const handleAdicionarVeiculoTroca = async (veiculoTroca: Partial<Veiculo>) => {
    const novoId = `veic-troca-${Date.now()}`;
    const novoVeiculo: Veiculo = {
      id: novoId,
      placa: veiculoTroca.placa || 'TRO-0000',
      chassi: `CH-TR-${Date.now().toString().slice(-8)}`,
      modelo: veiculoTroca.modelo || 'Veículo Recebido na Troca',
      marca: veiculoTroca.marca || 'Diversas',
      ano: veiculoTroca.ano || new Date().getFullYear(),
      cor: veiculoTroca.cor || 'Prata',
      combustivel: veiculoTroca.combustivel || 'Flex',
      kmAtual: veiculoTroca.kmAtual || 60000,
      kmUltimaRevisao: veiculoTroca.kmUltimaRevisao || 60000,
      custoAquisicao: veiculoTroca.custoAquisicao || 0,
      dataEntrada: veiculoTroca.dataEntrada || new Date().toISOString().split('T')[0],
      status: 'Em Preparação',
      despesas: [],
      observacoes: veiculoTroca.observacoes || 'Veículo recebido na troca em venda.',
    };

    setVeiculos((prev) => [novoVeiculo, ...prev]);
    await saveVeiculoFirestore(novoVeiculo);
  };

  // 4. Revisão 10.000 KM
  const handleConfirmarRevisao = async (
    veiculoId: string,
    novaKmRevisao: number,
    custoRevisao: number,
    oficina: string
  ) => {
    const revDespesa: DespesaVeiculo = {
      id: `desp-rev-${Date.now()}`,
      veiculoId,
      chassi: '',
      placa: '',
      categoria: 'Mecânica / Mão de Obra',
      descricao: `Revisão Preventiva Geral dos 10.000 km realizada na ${oficina}`,
      valor: custoRevisao,
      data: new Date().toISOString().split('T')[0],
      fornecedor: oficina,
      statusPagamento: 'Pago',
    };

    const eventoRevisao: EventoHistoricoVeiculo = {
      id: `hs-rev-${Date.now()}`,
      data: new Date().toISOString().split('T')[0],
      tipo: 'Revisão Periódica',
      titulo: `Revisão Preventiva dos ${novaKmRevisao.toLocaleString('pt-BR')} KM`,
      descricao: `Revisão periódica preventiva realizada na oficina ${oficina}. Valor investido: R$ ${custoRevisao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
      statusResultante: 'Disponível',
      km: novaKmRevisao,
      fornecedorOficina: oficina,
      valor: custoRevisao,
      usuarioRegistro: currentUserProfile?.displayName || 'Gestor',
    };

    let targetVeiculoUpdated: Veiculo | null = null;

    setVeiculos((prev) =>
      prev.map((v) => {
        if (v.id === veiculoId) {
          revDespesa.chassi = v.chassi;
          revDespesa.placa = v.placa;
          const updated: Veiculo = {
            ...v,
            kmUltimaRevisao: novaKmRevisao,
            kmAtual: Math.max(v.kmAtual, novaKmRevisao),
            status: v.status === 'Em Manutenção' ? 'Disponível' : v.status,
            despesas: [revDespesa, ...(v.despesas || [])],
            historicoStatus: [eventoRevisao, ...(v.historicoStatus || [])],
          };
          targetVeiculoUpdated = updated;
          return updated;
        }
        return v;
      })
    );

    if (targetVeiculoUpdated) {
      await saveVeiculoFirestore(targetVeiculoUpdated);
      if (dossieVeiculo?.id === veiculoId) {
        setDossieVeiculo(targetVeiculoUpdated);
      }
    }
  };

  // 5. Venda de Veículo (Baixa imediata no estoque & Lançamento de Comissão)
  const handleConfirmarVenda = async (novaVenda: VendaVeiculo) => {
    setVendas((prev) => [novaVenda, ...prev]);
    await saveVendaFirestore(novaVenda);

    const eventoVenda: EventoHistoricoVeiculo = {
      id: `hs-venda-${Date.now()}`,
      data: novaVenda.dataVenda,
      tipo: 'Venda Concluída',
      titulo: `Venda Concluída (${novaVenda.formaPagamento})`,
      descricao: `Veículo vendido para ${novaVenda.compradorNome}. Valor de venda: R$ ${novaVenda.valorVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (Lucro líquido apurado: R$ ${novaVenda.lucroLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}).`,
      statusResultante: 'Vendido',
      valor: novaVenda.valorVenda,
      usuarioRegistro: currentUserProfile?.displayName || 'Gestor',
    };

    let targetVeiculoUpdated: Veiculo | null = null;

    setVeiculos((prev) =>
      prev.map((v) => {
        if (v.id === novaVenda.veiculoId) {
          let currentDespesas = [...(v.despesas || [])];

          // Se houver investimento em anúncio lançado no fechamento, vincular nas despesas do chassi
          if (novaVenda.investimentoAnuncioProprio !== undefined && novaVenda.investimentoAnuncioProprio > 0) {
            const adsDespesaData: DespesaVeiculo = {
              id: `desp-ads-${Date.now()}`,
              veiculoId: novaVenda.veiculoId,
              chassi: novaVenda.chassi,
              placa: novaVenda.placa,
              categoria: 'Anúncio Patrocinado (Meta/Google Ads)',
              descricao: `Investimento em Anúncio Patrocinado alocado no Fechamento da Venda`,
              valor: Number(novaVenda.investimentoAnuncioProprio),
              data: novaVenda.dataVenda,
              fornecedor: 'Agência de Tráfego / Meta / Google Ads',
              statusPagamento: 'Pago',
            };
            currentDespesas = [adsDespesaData, ...currentDespesas];
          }

          // Se houver comissão apurada na venda, vincular ou atualizar despesa do chassi
          if (novaVenda.comissaoValor !== undefined && novaVenda.comissaoValor > 0) {
            const comissaoIndex = currentDespesas.findIndex(
              (d) => d.categoria === 'Comissão' || d.tipoComissaoOrigem === 'manual_previsao' || d.tipoComissaoOrigem === 'automatica_venda'
            );

            const comissaoDespesaData: DespesaVeiculo = {
              id: comissaoIndex >= 0 ? currentDespesas[comissaoIndex].id : `desp-comissao-${Date.now()}`,
              veiculoId: novaVenda.veiculoId,
              chassi: novaVenda.chassi,
              placa: novaVenda.placa,
              categoria: 'Comissão',
              descricao: `Comissão da Venda do Veículo (${novaVenda.vendedorNome || 'Vendedor'})`,
              valor: Number(novaVenda.comissaoValor),
              data: novaVenda.dataVenda,
              fornecedor: novaVenda.vendedorNome || 'Vendedor',
              statusPagamento: (novaVenda.comissaoStatus as any) || 'Pendente',
              tipoComissaoOrigem: 'automatica_venda',
              beneficiarioUsuarioId: novaVenda.vendedorId,
              beneficiarioNome: novaVenda.vendedorNome,
              beneficiarioEmail: novaVenda.vendedorEmail,
            };

            if (comissaoIndex >= 0) {
              currentDespesas[comissaoIndex] = comissaoDespesaData;
            } else {
              currentDespesas = [comissaoDespesaData, ...currentDespesas];
            }
          }

          const updated: Veiculo = {
            ...v,
            status: 'Vendido',
            status_estoque: 'Vendido',
            despesas: currentDespesas,
            venda: novaVenda,
            historicoStatus: [eventoVenda, ...(v.historicoStatus || [])],
          };
          targetVeiculoUpdated = updated;
          return updated;
        }
        return v;
      })
    );

    if (targetVeiculoUpdated) {
      await saveVeiculoFirestore(targetVeiculoUpdated);
      if (dossieVeiculo?.id === novaVenda.veiculoId) {
        setDossieVeiculo(targetVeiculoUpdated);
      }
    }

    // 5.1. Automação de Entrada de Veículo na Troca (Pipeline de Logística & Estoque)
    if (novaVenda.veiculoTrocaDetalhes?.possuiTroca && novaVenda.veiculoTrocaDetalhes.placa) {
      const trocaPlaca = novaVenda.veiculoTrocaDetalhes.placa.toUpperCase().trim();
      const trocaValor = Number((novaVenda.veiculoTrocaDetalhes.valorAvaliacaoCompra || 0).toFixed(2));
      
      const novoVeiculoTroca: Veiculo = {
        id: `veic-troca-${Date.now()}`,
        placa: trocaPlaca,
        chassi: `CH-TR-${Date.now().toString().slice(-8)}`,
        modelo: novaVenda.veiculoTrocaDetalhes.modelo || 'Veículo Recebido na Troca',
        marca: 'Diversas',
        ano: Number(novaVenda.veiculoTrocaDetalhes.ano) || new Date().getFullYear(),
        anoFabricacao: Number(novaVenda.veiculoTrocaDetalhes.ano) || new Date().getFullYear(),
        anoModelo: Number(novaVenda.veiculoTrocaDetalhes.ano) || new Date().getFullYear(),
        cor: 'Prata',
        combustivel: 'Flex',
        tipoPropriedade: 'proprio',
        cambio: 'Manual',
        motorizacao: '1.0 Flex',
        kmAtual: 60000,
        kmUltimaRevisao: 60000,
        custoAquisicao: trocaValor,
        dataEntrada: novaVenda.dataVenda || new Date().toISOString().split('T')[0],
        dataEntradaPatio: novaVenda.dataVenda || new Date().toISOString().split('T')[0],
        status: 'Em Preparação',
        status_estoque: 'Em Preparação',
        etapaPipeline: 'Entrada',
        origem_compra: `Entrada na Troca (Venda ${novaVenda.placa} - ${novaVenda.modelo})`,
        despesas: [],
        observacoes: `Veículo recebido na troca na venda do chassi ${novaVenda.chassi} (${novaVenda.modelo}) pelo cliente ${novaVenda.compradorNome}. Avaliação: R$ ${trocaValor.toFixed(2)}. Margem recondicionamento estimada: R$ ${(novaVenda.veiculoTrocaDetalhes.margemRecondicionamentoEstimada || 0).toFixed(2)}.`,
        historicoStatus: [
          {
            id: `hs-troca-in-${Date.now()}`,
            data: novaVenda.dataVenda || new Date().toISOString().split('T')[0],
            tipo: 'Entrada / Aquisição',
            titulo: 'Entrada por Veículo de Troca na Venda',
            descricao: `Veículo recebido como parte de pagamento da venda do ${novaVenda.modelo} (${novaVenda.placa}). Ingressou automaticamente no pipeline de preparação e triagem.`,
            statusResultante: 'Em Preparação',
            valor: trocaValor,
            usuarioRegistro: currentUserProfile?.displayName || 'Sistema AutoGestor',
          }
        ],
      };

      setVeiculos((prev) => {
        if (prev.some(v => v.placa === trocaPlaca && v.status !== 'Vendido')) {
          return prev;
        }
        return [novoVeiculoTroca, ...prev];
      });
      await saveVeiculoFirestore(novoVeiculoTroca);
    }

    // 5.2. Integração Automática com Módulo Financeiro & Contas Bancárias (Bancos & Giro)
    try {
      await processarRecebimentoVendaFinanceiro(novaVenda, targetVeiculoUpdated);
    } catch (err) {
      console.error('Erro ao processar integração financeira da venda:', err);
    }
  };

  // 5.2. Handlers do Módulo de Bancos Parceiros & Financiamentos
  const handleSaveBanco = async (bancoData: Omit<BancoParceiro, 'id'>, idToEdit?: string) => {
    try {
      const id = await bancosService.saveBanco(bancoData, idToEdit);
      const savedBanco: BancoParceiro = {
        ...bancoData,
        id: idToEdit || id,
      };
      setBancos((prev) => {
        if (idToEdit) {
          return prev.map((b) => (b.id === idToEdit ? savedBanco : b));
        }
        return [savedBanco, ...prev];
      });
    } catch (err) {
      console.error('Erro ao salvar banco parceiro:', err);
      alert('Erro ao salvar banco parceiro. Tente novamente.');
    }
  };

  const handleDeleteBanco = async (bancoId: string) => {
    try {
      await bancosService.deleteBanco(bancoId);
      setBancos((prev) => prev.filter((b) => b.id !== bancoId));
    } catch (err) {
      console.error('Erro ao excluir banco parceiro:', err);
      alert('Erro ao excluir banco parceiro.');
    }
  };

  const handleToggleStatusBanco = async (bancoId: string, novoStatus: 'ativo' | 'inativo') => {
    try {
      await bancosService.toggleStatus(bancoId, novoStatus);
      setBancos((prev) =>
        prev.map((b) => (b.id === bancoId ? { ...b, status: novoStatus } : b))
      );
    } catch (err) {
      console.error('Erro ao alterar status do banco:', err);
    }
  };

  // Cadastrar nova profissão de comprador no Firestore compartilhado
  const handleCadastrarProfissao = async (novaProfissao: string): Promise<string> => {
    try {
      const nomeSalvo = await saveProfissaoFirestore(
        novaProfissao,
        currentUserProfile?.displayName || 'Vendedor'
      );
      if (nomeSalvo) {
        setProfissoes((prev) => {
          if (prev.some((p) => p.toLowerCase() === nomeSalvo.toLowerCase())) {
            return prev;
          }
          return [...prev, nomeSalvo].sort((a, b) => a.localeCompare(b, 'pt-BR'));
        });
      }
      return nomeSalvo;
    } catch (err) {
      console.error('Erro ao salvar profissão no Firestore:', err);
      return novaProfissao.trim();
    }
  };

  // 6. Atualizar Status de Pagamento de Comissão
  const handleUpdateVendaComissao = async (vendaId: string, novoStatus: 'Pendente' | 'Paga') => {
    let updatedVendaObj: VendaVeiculo | null = null;

    setVendas((prev) =>
      prev.map((v) => {
        if (v.id === vendaId) {
          const updated: VendaVeiculo = {
            ...v,
            comissaoStatus: novoStatus,
            comissaoDataPagamento: novoStatus === 'Paga' ? new Date().toISOString().split('T')[0] : undefined,
          };
          updatedVendaObj = updated;
          return updated;
        }
        return v;
      })
    );

    if (updatedVendaObj) {
      await saveVendaFirestore(updatedVendaObj);
    }
  };

  // 6.1. Atualização Completa da Venda & Quitação de Comissão
  const handleUpdateVenda = async (vendaAtualizada: VendaVeiculo) => {
    setVendas((prev) =>
      prev.map((v) => (v.id === vendaAtualizada.id ? vendaAtualizada : v))
    );
    await saveVendaFirestore(vendaAtualizada);

    // Também sincronizar com o objeto veiculo correspondente caso esteja em estoque
    let targetVeiculoUpdated: Veiculo | null = null;
    setVeiculos((prev) =>
      prev.map((v) => {
        if (v.id === vendaAtualizada.veiculoId || v.placa === vendaAtualizada.placa) {
          const updated: Veiculo = {
            ...v,
            venda: vendaAtualizada,
          };
          targetVeiculoUpdated = updated;
          return updated;
        }
        return v;
      })
    );

    if (targetVeiculoUpdated) {
      await saveVeiculoFirestore(targetVeiculoUpdated);
      if (dossieVeiculo?.id === targetVeiculoUpdated.id) {
        setDossieVeiculo(targetVeiculoUpdated);
      }
    }
  };

  // 6.2. Excluir Venda & Restabelecer Veículo no Estoque
  const handleDeleteVenda = async (vendaId: string) => {
    const vendaToDelete = vendas.find((v) => v.id === vendaId);
    setVendas((prev) => prev.filter((v) => v.id !== vendaId));
    await deleteVendaFirestore(vendaId);

    // Se o veículo associado existir, reverter status para "Disponível" e remover a venda
    if (vendaToDelete) {
      let targetVeiculoUpdated: Veiculo | null = null;
      setVeiculos((prev) =>
        prev.map((v) => {
          if (v.id === vendaToDelete.veiculoId || v.placa === vendaToDelete.placa) {
            const eventoCancelamento: EventoHistoricoVeiculo = {
              id: `hs-canc-${Date.now()}`,
              data: new Date().toISOString().split('T')[0],
              tipo: 'Mudança de Status',
              titulo: 'Venda Cancelada / Excluída',
              descricao: `Registro de venda excluído pelo gestor ${currentUserProfile?.displayName || 'Admin'}. Veículo restabelecido ao catálogo de vendas do pátio como Disponível.`,
              statusResultante: 'Disponível',
              usuarioRegistro: currentUserProfile?.displayName || 'Gestor',
            };

            const updated: Veiculo = {
              ...v,
              status: 'Disponível',
              status_estoque: 'No Pátio',
              venda: undefined,
              historicoStatus: [eventoCancelamento, ...(v.historicoStatus || [])],
            };
            targetVeiculoUpdated = updated;
            return updated;
          }
          return v;
        })
      );

      if (targetVeiculoUpdated) {
        await saveVeiculoFirestore(targetVeiculoUpdated);
        if (dossieVeiculo?.id === targetVeiculoUpdated.id) {
          setDossieVeiculo(targetVeiculoUpdated);
        }
      }
    }
  };

  // 7. Despesa Fixa Operacional
  const handleSaveDespesaFixa = async (despesaData: Omit<DespesaFixa, 'id'>) => {
    const newDf: DespesaFixa = {
      ...despesaData,
      id: `df-${Date.now()}`,
    };
    setDespesasFixas((prev) => [newDf, ...prev]);
    await saveDespesaFixaFirestore(newDf);
  };

  // 7.1. Efetivar Pagamento de Despesa de Veículo (Contas a Pagar & Extrato Bancário)
  const handleEfetivarPagamentoDespesa = async (
    veiculoId: string,
    despesaId: string,
    pagamentoInfo: {
      dataPagamento: string;
      formaPagamento: string;
      contaBancariaId?: string;
      contaBancariaNome?: string;
      observacaoPagamento?: string;
    }
  ) => {
    let targetVeiculoUpdated: Veiculo | null = null;
    let despesaPaga: DespesaVeiculo | null = null;

    setVeiculos((prev) =>
      prev.map((v) => {
        if (v.id === veiculoId && v.despesas) {
          const updatedDespesas = v.despesas.map((d) => {
            if (d.id === despesaId) {
              const updatedD: DespesaVeiculo = {
                ...d,
                statusPagamento: 'Pago',
                dataPagamento: pagamentoInfo.dataPagamento,
                formaPagamento: pagamentoInfo.formaPagamento,
                contaBancariaId: pagamentoInfo.contaBancariaId,
                contaBancariaNome: pagamentoInfo.contaBancariaNome,
                observacoes: pagamentoInfo.observacaoPagamento
                  ? `${d.observacoes ? d.observacoes + ' | ' : ''}${pagamentoInfo.observacaoPagamento}`
                  : d.observacoes,
              };
              despesaPaga = updatedD;
              return updatedD;
            }
            return d;
          });

          const updated: Veiculo = {
            ...v,
            despesas: updatedDespesas,
          };
          targetVeiculoUpdated = updated;
          return updated;
        }
        return v;
      })
    );

    if (targetVeiculoUpdated) {
      await saveVeiculoFirestore(targetVeiculoUpdated);
      if (dossieVeiculo?.id === veiculoId) {
        setDossieVeiculo(targetVeiculoUpdated);
      }
    }

    // Se uma conta bancária foi selecionada, debitar do saldo e registrar extrato
    if (pagamentoInfo.contaBancariaId && despesaPaga) {
      try {
        const contaTarget = contasBancarias.find((c) => c.id === pagamentoInfo.contaBancariaId);
        if (contaTarget) {
          const valorPago = Number((despesaPaga as DespesaVeiculo).valor || 0);
          const novoSaldo = Math.max(0, Number((contaTarget.saldo - valorPago).toFixed(2)));
          const contaAtualizada: ContaBancariaCaixa = {
            ...contaTarget,
            saldo: novoSaldo,
          };

          await saveContaBancariaFirestore(contaAtualizada);

          const veiculoRef = veiculos.find((v) => v.id === veiculoId);
          const novaMovimentacao: MovimentacaoConta = {
            id: `mov_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            contaId: contaTarget.id,
            contaNome: contaTarget.nome,
            data: pagamentoInfo.dataPagamento || new Date().toISOString().split('T')[0],
            tipo: 'Despesa',
            categoria: (despesaPaga as DespesaVeiculo).categoria || 'Despesa Veículo',
            descricao: `Pagamento de Despesa: ${(despesaPaga as DespesaVeiculo).categoria} - Fornecedor: ${(despesaPaga as DespesaVeiculo).fornecedor || 'Não Informado'} - Veículo: ${veiculoRef?.placa || 'Sem Placa'}`,
            valor: valorPago,
            formaPagamento: pagamentoInfo.formaPagamento,
            veiculoId: veiculoId,
            placa: veiculoRef?.placa,
            criadoPor: currentUserProfile?.displayName || currentUserProfile?.email || 'Sistema AutoGestor',
            createdAt: new Date().toISOString(),
          };

          await saveMovimentacaoContaFirestore(novaMovimentacao);
        }
      } catch (err) {
        console.error('Erro ao debitar da conta bancária no pagamento de despesa:', err);
      }
    }
  };

  // 7.1.1. Efetivar Pagamento de Despesa Operacional/Fixa da Loja
  const handleEfetivarPagamentoDespesaFixa = async (
    despesaId: string,
    pagamentoInfo: {
      dataPagamento: string;
      formaPagamento: string;
      contaBancariaId?: string;
      contaBancariaNome?: string;
      observacaoPagamento?: string;
    }
  ) => {
    let despesaPaga: DespesaFixa | null = null;

    setDespesasFixas((prev) =>
      prev.map((df) => {
        if (df.id === despesaId) {
          const updatedDf: DespesaFixa = {
            ...df,
            status: 'Pago',
            dataPagamento: pagamentoInfo.dataPagamento,
            formaPagamento: pagamentoInfo.formaPagamento,
            contaBancariaId: pagamentoInfo.contaBancariaId,
            contaBancariaNome: pagamentoInfo.contaBancariaNome,
            observacoes: pagamentoInfo.observacaoPagamento
              ? `${df.observacoes ? df.observacoes + ' | ' : ''}${pagamentoInfo.observacaoPagamento}`
              : df.observacoes,
          };
          despesaPaga = updatedDf;
          return updatedDf;
        }
        return df;
      })
    );

    if (despesaPaga) {
      await saveDespesaFixaFirestore(despesaPaga);

      // Debitar de conta bancária se selecionada
      if (pagamentoInfo.contaBancariaId) {
        try {
          const contaTarget = contasBancarias.find((c) => c.id === pagamentoInfo.contaBancariaId);
          if (contaTarget) {
            const valorPago = Number((despesaPaga as DespesaFixa).valor || 0);
            const novoSaldo = Math.max(0, Number((contaTarget.saldo - valorPago).toFixed(2)));
            const contaAtualizada: ContaBancariaCaixa = {
              ...contaTarget,
              saldo: novoSaldo,
            };

            await saveContaBancariaFirestore(contaAtualizada);

            const novaMovimentacao: MovimentacaoConta = {
              id: `mov_fixa_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              contaId: contaTarget.id,
              contaNome: contaTarget.nome,
              data: pagamentoInfo.dataPagamento || new Date().toISOString().split('T')[0],
              tipo: 'Despesa',
              categoria: (despesaPaga as DespesaFixa).categoria || 'Despesa da Loja',
              descricao: `Pagamento de Conta da Loja: ${(despesaPaga as DespesaFixa).nome || (despesaPaga as DespesaFixa).descricao} - Categoria: ${(despesaPaga as DespesaFixa).categoria}`,
              valor: valorPago,
              formaPagamento: pagamentoInfo.formaPagamento,
              criadoPor: currentUserProfile?.displayName || currentUserProfile?.email || 'Sistema AutoGestor',
              createdAt: new Date().toISOString(),
            };

            await saveMovimentacaoContaFirestore(novaMovimentacao);
          }
        } catch (err) {
          console.error('Erro ao debitar conta bancária na despesa fixa:', err);
        }
      }
    }
  };

  // 7.2. Processar Liquidação de Recebível (Financiamento ou TAC - Contas a Receber)
  const handleProcessarLiquidacaoRecebivel = async (params: {
    venda: VendaVeiculo;
    tipoTitulo: 'financiamento' | 'tac';
    dataLiquidacao: string;
    contaBancariaId: string;
    valorLiquidado: number;
    formaLiquidacao?: string;
    observacoes?: string;
  }) => {
    const contaTarget = contasBancarias.find((c) => c.id === params.contaBancariaId);
    const contaNome = contaTarget ? contaTarget.nome : 'Conta Bancária';

    await processarLiquidacaoRecebivelFirestore({
      venda: params.venda,
      tipoTitulo: params.tipoTitulo,
      dataLiquidacao: params.dataLiquidacao,
      contaBancariaId: params.contaBancariaId,
      valorLiquidado: params.valorLiquidado,
      formaLiquidacao: params.formaLiquidacao,
      observacoes: params.observacoes,
      usuarioNome: currentUserProfile?.displayName || currentUserProfile?.email || 'Sistema AutoGestor',
    });

    // Atualizar estado local de vendas
    setVendas((prev) =>
      prev.map((v) => {
        if (v.id === params.venda.id) {
          const fin = v.financiamentoDetalhes || {};
          if (params.tipoTitulo === 'financiamento') {
            return {
              ...v,
              financiamentoDetalhes: {
                ...fin,
                statusLiquidacaoFinanciamento: 'Recebido',
                dataLiquidacaoFinanciamento: params.dataLiquidacao,
                contaBancariaLiquidacaoId: params.contaBancariaId,
                contaBancariaLiquidacaoNome: contaNome,
                formaLiquidacaoFinanciamento: params.formaLiquidacao,
                observacoesLiquidacao: params.observacoes,
              },
            };
          } else {
            return {
              ...v,
              financiamentoDetalhes: {
                ...fin,
                statusLiquidacaoTac: 'Recebido',
                dataLiquidacaoTac: params.dataLiquidacao,
                contaBancariaTacId: params.contaBancariaId,
                contaBancariaTacNome: contaNome,
                formaLiquidacaoTac: params.formaLiquidacao,
                observacoesLiquidacao: params.observacoes,
              },
            };
          }
        }
        return v;
      })
    );
  };

  // Logout Handler
  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Quick Open Modal Helpers
  const openDossie = (veiculo: Veiculo) => {
    setDossieVeiculo(veiculo);
    setIsDossieOpen(true);
  };

  const openNovaDespesa = (veiculo?: Veiculo, despesaVinculada?: DespesaVeiculo) => {
    setDespesaTargetVeiculo(veiculo || null);
    setDespesaToEdit(null);
    setDespesaVinculadaOrigem(despesaVinculada || undefined);
    setIsNovaDespesaOpen(true);
  };

  const openEditDespesa = (veiculo: Veiculo, despesa: DespesaVeiculo) => {
    setDespesaTargetVeiculo(veiculo);
    setDespesaToEdit(despesa);
    setDespesaVinculadaOrigem(undefined);
    setIsNovaDespesaOpen(true);
  };

  const openNovoContrato = (veiculo?: Veiculo) => {
    setContratoTargetVeiculo(veiculo || null);
    setIsNovoContratoOpen(true);
  };

  const openVenda = (veiculo: Veiculo) => {
    setVendaTargetVeiculo(veiculo);
    setIsVendaModalOpen(true);
  };

  const openRegistrarRevisao = (veiculo: Veiculo) => {
    setRevisaoTargetVeiculo(veiculo);
    setIsRevisaoModalOpen(true);
  };

  const openTestDrive = (veiculo?: Veiculo) => {
    setTestDriveTargetVeiculo(veiculo || veiculos[0] || null);
    setIsTestDriveModalOpen(true);
  };

  const handleConfirmTestDrive = async (testDrive: RegistroTestDrive) => {
    if (!testDrive.veiculoId) return;
    
    let updatedVeiculoRef: Veiculo | null = null;
    setVeiculos((prev) =>
      prev.map((v) => {
        if (v.id === testDrive.veiculoId) {
          const historico = [testDrive, ...(v.testDrives || v.historicoTestDrives || [])];
          const updated: Veiculo = {
            ...v,
            testDrives: historico,
            historicoTestDrives: historico,
            kmAtual: testDrive.kmFinal && testDrive.kmFinal > v.kmAtual ? testDrive.kmFinal : v.kmAtual,
          };
          updatedVeiculoRef = updated;
          return updated;
        }
        return v;
      })
    );

    if (updatedVeiculoRef) {
      await saveVeiculoFirestore(updatedVeiculoRef);
      if (dossieVeiculo?.id === (updatedVeiculoRef as Veiculo).id) {
        setDossieVeiculo(updatedVeiculoRef);
      }
    }
  };

  const openVistoria = (veiculo?: Veiculo) => {
    setVistoriaTargetVeiculo(veiculo || veiculos[0] || null);
    setIsVistoriaModalOpen(true);
  };

  const handleConfirmVistoria = async (laudo: LaudoVistoriaEntrada) => {
    if (!laudo.veiculoId) return;

    let updatedVeiculoRef: Veiculo | null = null;
    setVeiculos((prev) =>
      prev.map((v) => {
        if (v.id === laudo.veiculoId) {
          const laudos = [laudo, ...(v.vistorias || v.laudosVistoria || [])];
          const updated: Veiculo = {
            ...v,
            vistorias: laudos,
            laudosVistoria: laudos,
            kmAtual: laudo.kmVistoria && laudo.kmVistoria > v.kmAtual ? laudo.kmVistoria : v.kmAtual,
          };
          updatedVeiculoRef = updated;
          return updated;
        }
        return v;
      })
    );

    if (updatedVeiculoRef) {
      await saveVeiculoFirestore(updatedVeiculoRef);
      if (dossieVeiculo?.id === (updatedVeiculoRef as Veiculo).id) {
        setDossieVeiculo(updatedVeiculoRef);
      }
    }
  };

  const openAbastecimento = (veiculo?: Veiculo) => {
    setAbastecimentoTargetVeiculo(veiculo || dossieVeiculo || veiculos[0] || null);
    setIsAbastecimentoOpen(true);
  };

  const handleSaveAbastecimento = async (dados: DadosAbastecimento) => {
    const targetVeiculo = veiculos.find((v) => v.id === dados.veiculoId) || (dossieVeiculo?.id === dados.veiculoId ? dossieVeiculo : null);
    if (!targetVeiculo) return;

    const novaDespesa: DespesaVeiculo = {
      id: `desp-comb-${Date.now()}`,
      veiculoId: dados.veiculoId,
      chassi: targetVeiculo.chassi,
      placa: targetVeiculo.placa,
      categoria: 'Combustível',
      descricao: `Abastecimento (${dados.tipoCombustivel}) - ${dados.postoNome}`,
      valor: dados.valorTotal,
      data: dados.data,
      fornecedor: dados.postoNome,
      fornecedorId: dados.postoId,
      statusPagamento: dados.statusPagamento,
      formaPagamento: dados.formaPagamento,
      dataPagamento: dados.statusPagamento === 'Pago' ? dados.data : undefined,
      contaBancariaId: dados.contaBancariaId,
      contaBancariaNome: dados.contaBancariaNome,
      nfNumero: dados.nfNumero,
      observacoes: dados.observacoes,
      litrosAbastecidos: dados.litros,
      valorPorLitro: dados.valorPorLitro,
      kmAbastecimento: dados.kmAtual,
      responsavelAbastecimento: dados.responsavel,
      motivoSaidaAbastecimento: dados.motivoSaida === 'Outro' && dados.motivoDetalhe ? dados.motivoDetalhe : dados.motivoSaida,
      tipoCombustivelAbastecido: dados.tipoCombustivel,
    };

    const eventoAbastecimento: EventoHistoricoVeiculo = {
      id: `hs-comb-${Date.now()}`,
      data: dados.data,
      tipo: 'Abastecimento',
      titulo: `Abastecimento: ${dados.litros}L (${dados.tipoCombustivel})`,
      descricao: `Posto: ${dados.postoNome}. Motivo: ${dados.motivoSaida}. Condutor/Resp: ${dados.responsavel}. Odômetro: ${dados.kmAtual.toLocaleString('pt-BR')} km. Valor: R$ ${dados.valorTotal.toFixed(2)} (R$ ${dados.valorPorLitro.toFixed(2)}/L).`,
      km: dados.kmAtual,
      valor: dados.valorTotal,
      fornecedorNome: dados.postoNome,
      usuarioRegistro: currentUserProfile?.displayName || currentUserProfile?.email || 'Sistema AutoGestor',
      observacoes: dados.observacoes,
    };

    let targetVeiculoUpdated: Veiculo | null = null;

    setVeiculos((prev) =>
      prev.map((v) => {
        if (v.id === dados.veiculoId) {
          const updated: Veiculo = {
            ...v,
            kmAtual: Math.max(v.kmAtual || 0, dados.kmAtual),
            despesas: [novaDespesa, ...(v.despesas || [])],
            historicoStatus: [eventoAbastecimento, ...(v.historicoStatus || [])],
          };
          targetVeiculoUpdated = updated;
          return updated;
        }
        return v;
      })
    );

    if (targetVeiculoUpdated) {
      await saveVeiculoFirestore(targetVeiculoUpdated);
      if (dossieVeiculo?.id === dados.veiculoId) {
        setDossieVeiculo(targetVeiculoUpdated);
      }
    }

    // Se o pagamento for à vista/pago com conta bancária vinculada, debitar do saldo e salvar movimentação
    if (dados.statusPagamento === 'Pago' && dados.contaBancariaId) {
      const conta = contasBancarias.find((c) => c.id === dados.contaBancariaId);
      if (conta) {
        const novoSaldo = Math.max(0, Number((conta.saldo - dados.valorTotal).toFixed(2)));
        const novaMovimentacao: MovimentacaoConta = {
          id: `mov-comb-${Date.now()}`,
          contaId: conta.id,
          contaNome: conta.nome,
          tipo: 'Despesa',
          categoria: 'Combustível',
          valor: dados.valorTotal,
          data: dados.data,
          descricao: `Abastecimento Placa ${targetVeiculo.placa} (${dados.litros}L) - ${dados.postoNome}`,
          formaPagamento: dados.formaPagamento,
          veiculoId: targetVeiculo.id,
          placa: targetVeiculo.placa,
          criadoPor: currentUserProfile?.displayName || currentUserProfile?.email || 'Sistema AutoGestor',
          createdAt: new Date().toISOString(),
        };
        const updatedConta: ContaBancariaCaixa = {
          ...conta,
          saldo: novoSaldo,
        };
        setContasBancarias((prev) =>
          prev.map((c) => (c.id === updatedConta.id ? updatedConta : c))
        );
        await saveContaBancariaFirestore(updatedConta);
        await saveMovimentacaoContaFirestore(novaMovimentacao);
      }
    }
  };

  const handleGlobalLauncherOption = (option: 'veiculo' | 'despesa-chassi' | 'abastecimento' | 'locacao' | 'despesa-fixa' | 'test-drive' | 'vistoria') => {
    if (option === 'veiculo') {
      setVeiculoToEdit(null);
      setIsNovoVeiculoOpen(true);
    } else if (option === 'despesa-chassi') {
      openNovaDespesa();
    } else if (option === 'abastecimento') {
      openAbastecimento();
    } else if (option === 'locacao') {
      openNovoContrato();
    } else if (option === 'despesa-fixa') {
      setIsNovaDespesaFixaOpen(true);
    } else if (option === 'test-drive') {
      openTestDrive();
    } else if (option === 'vistoria') {
      openVistoria();
    }
  };

  const veiculosDisponiveis = useMemo(() => {
    return veiculos.filter((v) => v.status === 'Disponível');
  }, [veiculos]);

  // Loading Screen while authenticating
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex flex-col items-center justify-center text-slate-300 gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-blue-600/30 animate-pulse">
          <Car size={30} />
        </div>
        <div className="flex items-center gap-2.5 text-xs text-slate-400 font-medium">
          <Loader2 size={16} className="animate-spin text-blue-500" />
          <span>Verificando credenciais e acessos corporativos...</span>
        </div>
      </div>
    );
  }

  // If not authenticated, require Google or Email Login
  if (!currentUser) {
    return <LoginScreen />;
  }

  // If authenticated but user profile is loading from Firestore
  if (!currentUserProfile) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex flex-col items-center justify-center text-slate-300 gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-blue-600/30 animate-pulse">
          <Car size={30} />
        </div>
        <div className="flex items-center gap-2.5 text-xs text-slate-400 font-medium">
          <Loader2 size={16} className="animate-spin text-blue-500" />
          <span>Verificando perfil e autorização de acesso no Firestore...</span>
        </div>
      </div>
    );
  }

  // STRICT GATING: If user profile is pending admin approval, blocked or inactive, block access immediately
  if (currentUserProfile.statusAprovacao !== 'aprovado' || currentUserProfile.ativo === false) {
    return <AguardandoAprovacaoScreen user={currentUserProfile} />;
  }

  return (
    <div className="min-h-screen h-screen bg-[#0a0a0c] flex flex-col md:flex-row text-slate-200 font-sans antialiased selection:bg-blue-600 selection:text-white overflow-hidden">
      {/* Mobile Header Bar */}
      <div className="md:hidden bg-[#0d0e12] text-white p-3.5 flex items-center justify-between border-b border-white/5 sticky top-0 z-30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-black shadow-md shadow-blue-500/20">
            <Car size={18} />
          </div>
          <span className="font-extrabold text-base tracking-tight">
            TROCA <span className="text-blue-400">FÁCIL</span>
          </span>
        </div>
        <button
          onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          className="p-2 text-slate-300 hover:text-white rounded-lg bg-white/5 border border-white/5 cursor-pointer"
        >
          {isMobileSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Sidebar for Desktop & Mobile Overlay */}
      <div
        className={`${
          isMobileSidebarOpen ? 'block fixed inset-0 z-40' : 'hidden'
        } md:block md:relative md:z-auto h-full shrink-0`}
      >
        <Sidebar
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
            setIsMobileSidebarOpen(false);
          }}
          counts={counts}
          onOpenNovoLancamento={() => setIsNovoLancamentoGlobalOpen(true)}
          currentUser={currentUserProfile}
          onOpenUsuarios={() => setIsUsuariosModalOpen(true)}
          onOpenMeuPerfil={() => {
            setTargetUserPerfil(null);
            setIsMeuPerfilOpen(true);
          }}
          onOpenBackup={() => setIsBackupModalOpen(true)}
          onLogout={handleLogout}
        />
      </div>

      {/* Main Container with smooth desktop responsiveness */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto overflow-x-hidden">
        {/* Top Header */}
        <Header
          title={
            activeTab === 'dash'
              ? currentUserProfile?.role === 'vendedor' ? 'Painel do Vendedor' : 'Dashboard Central'
              : activeTab === 'vendedor-dash'
              ? 'Painel do Vendedor'
              : activeTab === 'catalogo'
              ? 'Catálogo de Veículos'
              : activeTab === 'comissoes'
              ? currentUserProfile?.role === 'vendedor' ? 'Minhas Vendas & Comissões' : 'Vendas & Comissões'
              : activeTab === 'crm-analytics'
              ? 'CRM & Análise de Vendas'
              : activeTab === 'estoque'
              ? 'Estoque por Chassi'
              : activeTab === 'funil-preparacao'
              ? 'Funil de Preparação'
              : activeTab === 'revisoes'
              ? 'Revisões & Manutenção'
              : activeTab === 'fornecedores'
              ? 'Gestão de Fornecedores'
              : activeTab === 'contas-pagar'
              ? 'Contas a Pagar'
              : activeTab === 'contas-receber'
              ? 'Contas a Receber'
              : activeTab === 'bancos'
              ? 'Bancos Parceiros & TAC'
              : activeTab === 'financeiro'
              ? 'DRE & Controle Financeiro'
              : (activeTab === 'locacao' || activeTab.startsWith('locacao-'))
              ? 'Locadora & Frota'
              : activeTab === 'aging'
              ? 'Gestão de Aging & Giro'
              : activeTab === 'logistica'
              ? 'Logística & Trânsito'
              : activeTab === 'dashboard-executivo'
              ? 'Dashboard Executivo'
              : 'AutoGestor'
          }
          subtitle={
            activeTab === 'dash'
              ? currentUserProfile?.role === 'vendedor'
                ? 'Metas, comissões apuradas e catálogo para atendimento rápido'
                : 'Visão geral do pátio, indicadores de vendas e saúde financeira da loja'
              : activeTab === 'vendedor-dash'
              ? 'Metas, comissões apuradas e catálogo para atendimento rápido'
              : activeTab === 'catalogo'
              ? 'Consulte os veículos no pátio e efetue a baixa de venda imediata com cálculo de comissão'
              : activeTab === 'comissoes'
              ? 'Histórico de carros vendidos, comissão apurada por vendedor e controle de baixa de pagamentos'
              : activeTab === 'crm-analytics'
              ? 'Origem dos leads, aniversariantes do mês, conversão de propostas e retorno TAC'
              : activeTab === 'estoque'
              ? 'Controle de custos incrementais de compra + preparação vinculados à placa e chassi'
              : activeTab === 'funil-preparacao'
              ? 'Acompanhamento do pipeline de oficinas, funilaria, estética e liberação para o pátio'
              : activeTab === 'revisoes'
              ? 'Ciclo preventivo de 10.000 KM para frotas de locação e histórico de oficina'
              : activeTab === 'fornecedores'
              ? 'Cadastro e extrato financeiro de parceiros, oficinas e prestadores de serviços automotivos'
              : activeTab === 'contas-pagar'
              ? 'Gestão unificada de despesas de veículos e parceiros com quitação bancária e extrato'
              : activeTab === 'contas-receber'
              ? 'Painel de liquidação de financiamentos bancários e comissões TAC com crédito em conta e extrato'
              : activeTab === 'bancos'
              ? 'Cadastro de instituições financeiras parceiras, tabelas de retorno TAC e gerentes de conta'
              : activeTab === 'financeiro'
              ? 'Demonstrativo de Resultado do Exercício com separação de Caixa, DRE e Extrato 360º'
              : (activeTab === 'locacao' || activeTab.startsWith('locacao-'))
              ? 'Acompanhamento de cobranças semanais, controle de caução e odômetro de motoristas de app'
              : activeTab === 'aging'
              ? 'Matriz de giro de pátio: 0-30d (Verde), 31-60d (Amarelo) e +60d (Crítico)'
              : activeTab === 'logistica'
              ? 'Rastreie veículos comprados fora da loja, controle fretes/prazos de cegonha e confirme o recebimento'
              : activeTab === 'dashboard-executivo'
              ? 'DRE consolidado, margens líquidas por chassi e gráficos de evolução de custos'
              : undefined
          }
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onOpenNovoLancamento={() => setIsNovoLancamentoGlobalOpen(true)}
          alertCounts={{
            aging: counts.alertasAging,
            pagamento: counts.alertasPagamento,
            revisao: counts.alertasRevisao,
          }}
          onSelectTab={setActiveTab}
          currentUser={currentUserProfile}
          onOpenUsuarios={() => setIsUsuariosModalOpen(true)}
          onOpenMeuPerfil={() => {
            setTargetUserPerfil(null);
            setIsMeuPerfilOpen(true);
          }}
          onLogout={handleLogout}
        />

        {/* View Router with container responsive auto-scaling */}
        <main className="p-4 sm:p-6 lg:p-8 flex-1 space-y-6 max-w-[1920px] w-full mx-auto">
          <ErrorBoundary fallbackTitle="Ocorreu um imprevisto na renderização deste módulo">
          {(activeTab === 'vendedor-dash' || (activeTab === 'dash' && currentUserProfile?.role === 'vendedor')) && (
            <DashboardVendedorView
              veiculos={veiculos}
              vendas={vendas}
              currentUser={currentUserProfile}
              onOpenVenda={openVenda}
              onOpenDossie={openDossie}
              onSelectTab={setActiveTab}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === 'catalogo' && (
            <CatalogoVendasView
              veiculos={veiculos}
              vendas={vendas}
              currentUser={currentUserProfile}
              onOpenVenda={openVenda}
              onOpenDossie={openDossie}
              onOpenTestDrive={openTestDrive}
            />
          )}

          {activeTab === 'comissoes' && (
            <ComissoesVendasView
              vendas={vendas}
              veiculos={veiculos}
              usuarios={allUsersList}
              currentUser={currentUserProfile}
              onOpenDossie={openDossie}
              onUpdateVendaComissao={handleUpdateVendaComissao}
              onUpdateVenda={handleUpdateVenda}
              onDeleteVenda={handleDeleteVenda}
            />
          )}

          {activeTab === 'dash' && currentUserProfile?.role !== 'vendedor' && (
            <DashboardView
              veiculos={veiculos}
              vendas={vendas}
              despesasFixas={despesasFixas}
              currentUser={currentUserProfile}
              onOpenDossie={openDossie}
              onSelectTab={setActiveTab}
              onOpenNovoLancamento={() => setIsNovoLancamentoGlobalOpen(true)}
              onRegistrarPagamento={handleRegistrarPagamento}
            />
          )}

          {activeTab === 'dashboard-executivo' && (
            <DashboardExecutivoAvancado
              veiculos={veiculos}
              vendas={vendas}
              despesasFixas={despesasFixas}
              currentUser={currentUserProfile}
              onOpenDossie={openDossie}
            />
          )}

          {activeTab === 'logistica' && (
            <LogisticaTransitoView
              veiculos={veiculos}
              fornecedores={fornecedores}
              currentUser={currentUserProfile}
              onOpenNovoVeiculoEmTransito={() => {
                setVeiculoToEdit(null);
                setIsNovoVeiculoOpen(true);
              }}
              onOpenDossie={openDossie}
              onOpenNovaDespesa={openNovaDespesa}
              onUpdateVeiculo={handleUpdateVeiculoDirect}
              onMovimentarVeiculo={handleMovimentarVeiculo}
            />
          )}

          {activeTab === 'estoque' && (
            <EstoqueView
              veiculos={veiculos}
              vendas={vendas}
              currentUser={currentUserProfile}
              onOpenDossie={openDossie}
              onOpenNovoVeiculo={() => {
                setVeiculoToEdit(null);
                setIsNovoVeiculoOpen(true);
              }}
              onOpenNovaDespesa={openNovaDespesa}
              onOpenNovoContrato={openNovoContrato}
              onOpenVenda={openVenda}
              onDeleteVeiculo={handleDeleteVeiculo}
              onEditVeiculo={handleEditVeiculo}
              onOpenTestDrive={openTestDrive}
              onOpenVistoria={openVistoria}
            />
          )}

          {(activeTab === 'locacao' || activeTab.startsWith('locacao-')) && (
            <LocacaoView
              veiculos={veiculos}
              initialSubTab={
                activeTab === 'locacao-km'
                  ? 'km_diario'
                  : activeTab === 'locacao-manutencao'
                  ? 'manutencoes'
                  : activeTab === 'locacao-debitos'
                  ? 'debitos'
                  : activeTab === 'locacao-caucao'
                  ? 'caucao'
                  : 'contratos'
              }
              onOpenNovoContrato={openNovoContrato}
              onRegistrarPagamento={handleRegistrarPagamento}
              onOpenRegistrarRevisao={openRegistrarRevisao}
              onEncerrarContrato={handleEncerrarContrato}
              onAtualizarKm={handleAtualizarKm}
              onSalvarKmDiario={handleSalvarKmDiario}
              onSalvarItensManutencao={handleSalvarItensManutencao}
              onRegistrarManutencaoRealizada={handleRegistrarManutencaoRealizada}
              onSalvarDebitoMotorista={handleSalvarDebitoMotorista}
              onSalvarCaucaoMotorista={handleSalvarCaucaoMotorista}
              onOpenCadastrarDespesaVeiculo={openNovaDespesa}
            />
          )}

          {activeTab === 'aging' && (
            <AgingView
              veiculos={veiculos}
              vendas={vendas}
              onOpenDossie={openDossie}
              onOpenVenda={openVenda}
            />
          )}

          {activeTab === 'revisoes' && (
            <RevisoesView
              veiculos={veiculos}
              fornecedores={fornecedores}
              currentUser={currentUserProfile}
              onOpenRegistrarRevisao={openRegistrarRevisao}
              onOpenDossie={openDossie}
              onAtualizarKm={handleAtualizarKm}
              onUpdateVeiculo={handleUpdateVeiculoDirect}
              onMovimentarVeiculo={handleMovimentarVeiculo}
              onOpenNovaDespesa={openNovaDespesa}
              onSelectTab={setActiveTab}
            />
          )}

          {activeTab === 'funil-preparacao' && (
            <FunilPreparacaoView
              veiculos={veiculos}
              fornecedores={fornecedores}
              currentUser={currentUserProfile}
              onUpdateEtapaKanban={handleUpdateEtapaKanban}
              onMovimentarVeiculo={handleMovimentarVeiculo}
              onOpenDossie={openDossie}
              onOpenNovaDespesa={openNovaDespesa}
              onOpenRegistrarRevisao={openRegistrarRevisao}
              onUpdateVeiculo={handleUpdateVeiculoDirect}
              onAdicionarEventoStatus={handleAdicionarEventoStatus}
              onOpenVenda={openVenda}
              onOpenVistoria={openVistoria}
              onOpenEnviarServico={openEnviarServico}
              onOpenRetornoPatio={openRetornoPatio}
            />
          )}

          {activeTab === 'fornecedores' && (
            <FornecedoresView
              fornecedores={fornecedores}
              veiculos={veiculos}
              currentUser={currentUserProfile}
              onMovimentarVeiculo={handleMovimentarVeiculo}
              onOpenNovoFornecedor={() => {
                setFornecedorToEdit(null);
                setIsNovoFornecedorOpen(true);
              }}
              onEditFornecedor={(forn) => {
                setFornecedorToEdit(forn);
                setIsNovoFornecedorOpen(true);
              }}
              onDeleteFornecedor={handleDeleteFornecedor}
              onOpenDossie={openDossie}
              onSelectTab={setActiveTab}
            />
          )}

          {activeTab === 'bancos' && (
            <BancosParceirosView
              bancos={bancos}
              vendas={vendas}
              onOpenNovoBanco={() => {
                setBancoToEdit(null);
                setIsNovoBancoOpen(true);
              }}
              onEditBanco={(banco) => {
                setBancoToEdit(banco);
                setIsNovoBancoOpen(true);
              }}
              onDeleteBanco={handleDeleteBanco}
              onToggleStatusBanco={handleToggleStatusBanco}
            />
          )}

          {activeTab === 'contas-pagar' && (
            <ContasPagarView
              veiculos={veiculos}
              vendas={vendas}
              despesasFixas={despesasFixas}
              fornecedores={fornecedores}
              contasBancarias={contasBancarias}
              currentUser={currentUserProfile}
              onOpenNovaDespesa={openNovaDespesa}
              onOpenNovaDespesaFixa={() => setIsNovaDespesaFixaOpen(true)}
              onOpenDossie={openDossie}
              onEfetivarPagamento={handleEfetivarPagamentoDespesa}
              onEfetivarPagamentoDespesaFixa={handleEfetivarPagamentoDespesaFixa}
              onEditDespesa={openEditDespesa}
              onDeleteDespesa={handleDeleteDespesa}
            />
          )}

          {activeTab === 'contas-receber' && (
            <ContasReceberView
              vendas={vendas}
              veiculos={veiculos}
              bancosParceiros={bancos}
              contasBancarias={contasBancarias}
              currentUser={currentUserProfile}
              onOpenDossie={openDossie}
              onProcessarLiquidacao={handleProcessarLiquidacaoRecebivel}
            />
          )}

          {activeTab === 'financeiro' && (
            <FinanceiroDREView
              veiculos={veiculos}
              vendas={vendas}
              despesasFixas={despesasFixas}
              fornecedores={fornecedores}
              usuarios={allUsersList}
              currentUser={currentUserProfile}
              onOpenNovaDespesaFixa={() => setIsNovaDespesaFixaOpen(true)}
              onOpenNovaDespesaChassi={() => openNovaDespesa()}
              onOpenMeuPerfil={() => {
                setTargetUserPerfil(null);
                setIsMeuPerfilOpen(true);
              }}
              onUpdateVenda={(updatedVenda) => {
                setVendas((prev) => prev.map((v) => (v.id === updatedVenda.id ? updatedVenda : v)));
              }}
              onSaveDespesaFixa={(newDespesa) => {
                setDespesasFixas((prev) => {
                  const exists = prev.some((d) => d.id === newDespesa.id);
                  if (exists) {
                    return prev.map((d) => (d.id === newDespesa.id ? newDespesa : d));
                  }
                  return [newDespesa, ...prev];
                });
              }}
            />
          )}

          {activeTab === 'crm-analytics' && (
            <CrmAnalyticsView
              vendas={vendas}
              veiculos={veiculos}
              currentUser={currentUserProfile}
              onOpenDossie={openDossie}
            />
          )}
          </ErrorBoundary>
        </main>
      </div>

      {/* --- Modals --- */}
      {isUsuariosModalOpen && (
        <UsuariosModal
          isOpen={isUsuariosModalOpen}
          onClose={() => setIsUsuariosModalOpen(false)}
          currentUser={currentUserProfile}
        />
      )}

      {isMeuPerfilOpen && (
        <ModalMeuPerfil
          isOpen={isMeuPerfilOpen}
          onClose={() => {
            setIsMeuPerfilOpen(false);
            setTargetUserPerfil(null);
          }}
          currentUser={currentUserProfile}
          targetUser={targetUserPerfil}
          onSaveSuccess={(updated) => {
            if (currentUserProfile?.uid === updated.uid) {
              setCurrentUserProfile(updated);
            }
            setAllUsersList((prev) =>
              prev.map((u) => (u.uid === updated.uid ? { ...u, ...updated } : u))
            );
          }}
        />
      )}

      {isDossieOpen && dossieVeiculo && (
        <DossieModal
          veiculo={dossieVeiculo}
          isOpen={isDossieOpen}
          onClose={() => setIsDossieOpen(false)}
          onOpenNovaDespesa={(v, despOrigem) => openNovaDespesa(v, despOrigem)}
          onOpenAbastecimento={(v) => openAbastecimento(v)}
          onOpenVenda={(v) => openVenda(v)}
          onDeleteDespesa={handleDeleteDespesa}
          onEditDespesa={openEditDespesa}
          onEditVeiculo={handleEditVeiculo}
          onUpdateVeiculo={handleUpdateVeiculoDirect}
          onUpdateVenda={handleUpdateVenda}
          vendas={vendas}
          onMovimentarVeiculo={handleMovimentarVeiculo}
          onAdicionarEventoStatus={handleAdicionarEventoStatus}
          onOpenTestDrive={openTestDrive}
          onOpenVistoria={openVistoria}
          onOpenEnviarServico={openEnviarServico}
          onOpenRetornoPatio={openRetornoPatio}
          currentUser={currentUserProfile}
        />
      )}

      {isNovoVeiculoOpen && (
        <ModalNovoVeiculo
          isOpen={isNovoVeiculoOpen}
          onClose={() => {
            setIsNovoVeiculoOpen(false);
            setVeiculoToEdit(null);
          }}
          onSave={handleSaveVeiculo}
          veiculoToEdit={veiculoToEdit}
          fornecedores={fornecedores}
        />
      )}

      {isNovaDespesaOpen && (
        <ModalNovaDespesa
          isOpen={isNovaDespesaOpen}
          onClose={() => {
            setIsNovaDespesaOpen(false);
            setDespesaToEdit(null);
            setDespesaVinculadaOrigem(undefined);
          }}
          veiculos={veiculos}
          defaultVeiculo={despesaTargetVeiculo}
          despesaToEdit={despesaToEdit}
          despesaVinculadaOrigem={despesaVinculadaOrigem}
          usuarios={allUsersList}
          fornecedores={fornecedores}
          contasBancarias={contasBancarias}
          onSaveDespesa={handleSaveDespesa}
        />
      )}

      {isNovoContratoOpen && (
        <ModalNovoContrato
          isOpen={isNovoContratoOpen}
          onClose={() => setIsNovoContratoOpen(false)}
          veiculosDisponiveis={veiculosDisponiveis}
          defaultVeiculo={contratoTargetVeiculo}
          onSaveContrato={handleSaveContrato}
        />
      )}

      {isVendaModalOpen && vendaTargetVeiculo && (
        <ModalVenderVeiculo
          isOpen={isVendaModalOpen}
          onClose={() => setIsVendaModalOpen(false)}
          veiculo={vendaTargetVeiculo}
          currentUser={currentUserProfile}
          usuarios={allUsersList}
          profissoesCadastradas={profissoes}
          bancosParceiros={bancos}
          onCadastrarProfissao={handleCadastrarProfissao}
          onConfirmarVenda={handleConfirmarVenda}
          onAdicionarVeiculoTroca={handleAdicionarVeiculoTroca}
        />
      )}

      {isRevisaoModalOpen && revisaoTargetVeiculo && (
        <ModalRegistrarRevisao
          isOpen={isRevisaoModalOpen}
          onClose={() => setIsRevisaoModalOpen(false)}
          veiculo={revisaoTargetVeiculo}
          onConfirmarRevisao={handleConfirmarRevisao}
        />
      )}

      {isNovaDespesaFixaOpen && (
        <ModalNovaDespesaFixa
          isOpen={isNovaDespesaFixaOpen}
          onClose={() => setIsNovaDespesaFixaOpen(false)}
          onSaveDespesaFixa={handleSaveDespesaFixa}
        />
      )}

      {isNovoLancamentoGlobalOpen && (
        <ModalNovoLancamentoGlobal
          isOpen={isNovoLancamentoGlobalOpen}
          onClose={() => setIsNovoLancamentoGlobalOpen(false)}
          onSelectOption={handleGlobalLauncherOption}
        />
      )}

      {isBackupModalOpen && (
        <ModalBackupSeguranca
          isOpen={isBackupModalOpen}
          onClose={() => setIsBackupModalOpen(false)}
          veiculos={veiculos}
          vendas={vendas}
          despesasFixas={despesasFixas}
          profissoes={profissoes}
          currentUser={currentUserProfile}
          onDataRestored={() => {
            // Firestore subscriptions will automatically update state
          }}
        />
      )}

      {isNovoFornecedorOpen && (
        <ModalNovoFornecedor
          isOpen={isNovoFornecedorOpen}
          onClose={() => {
            setIsNovoFornecedorOpen(false);
            setFornecedorToEdit(null);
          }}
          onSave={handleSaveFornecedor}
          fornecedorToEdit={fornecedorToEdit}
        />
      )}

      {isNovoBancoOpen && (
        <ModalNovoBanco
          isOpen={isNovoBancoOpen}
          onClose={() => {
            setIsNovoBancoOpen(false);
            setBancoToEdit(null);
          }}
          onSave={handleSaveBanco}
          bancoToEdit={bancoToEdit}
        />
      )}

      {isTestDriveModalOpen && testDriveTargetVeiculo && (
        <ModalTestDrive
          isOpen={isTestDriveModalOpen}
          onClose={() => {
            setIsTestDriveModalOpen(false);
            setTestDriveTargetVeiculo(null);
          }}
          veiculo={testDriveTargetVeiculo}
          currentUser={currentUserProfile}
          onConfirmarTestDrive={handleConfirmTestDrive}
        />
      )}

      {isVistoriaModalOpen && vistoriaTargetVeiculo && (
        <ModalVistoria
          isOpen={isVistoriaModalOpen}
          onClose={() => {
            setIsVistoriaModalOpen(false);
            setVistoriaTargetVeiculo(null);
          }}
          veiculo={vistoriaTargetVeiculo}
          currentUser={currentUserProfile}
          onSalvarVistoria={handleConfirmVistoria}
        />
      )}

      {isAbastecimentoOpen && (
        <ModalRegistrarAbastecimento
          isOpen={isAbastecimentoOpen}
          onClose={() => {
            setIsAbastecimentoOpen(false);
            setAbastecimentoTargetVeiculo(null);
          }}
          veiculos={veiculos}
          defaultVeiculo={abastecimentoTargetVeiculo}
          fornecedores={fornecedores}
          contasBancarias={contasBancarias}
          onSaveAbastecimento={handleSaveAbastecimento}
        />
      )}

      {isModalEnviarServicoOpen && (
        <ModalEnviarServico
          isOpen={isModalEnviarServicoOpen}
          onClose={() => {
            setIsModalEnviarServicoOpen(false);
            setVeiculoParaEnviarServico(null);
          }}
          veiculos={veiculos}
          veiculoSelecionado={veiculoParaEnviarServico}
          fornecedores={fornecedores}
          contasBancarias={contasBancarias}
          currentUser={currentUserProfile}
          onConfirmarEnvio={handleConfirmarEnvioServico}
        />
      )}

      {isModalRetornoPatioOpen && veiculoParaRetornoPatio && (
        <ModalRetornoPatio
          isOpen={isModalRetornoPatioOpen}
          onClose={() => {
            setIsModalRetornoPatioOpen(false);
            setVeiculoParaRetornoPatio(null);
          }}
          veiculo={veiculoParaRetornoPatio}
          contasBancarias={contasBancarias}
          currentUser={currentUserProfile}
          onConfirmarRetorno={handleConfirmarRetornoPatio}
        />
      )}
    </div>
  );
}
