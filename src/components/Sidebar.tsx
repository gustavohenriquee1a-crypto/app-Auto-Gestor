import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Car, 
  DollarSign, 
  Clock, 
  PlusCircle, 
  ShieldCheck, 
  Wrench, 
  Users, 
  LogOut, 
  Sparkles, 
  Award, 
  Camera, 
  Trash2, 
  Key, 
  Gauge, 
  AlertTriangle, 
  TrendingUp, 
  Target, 
  Building2, 
  Truck, 
  BarChart3, 
  SlidersHorizontal, 
  Receipt,
  ChevronDown,
  Briefcase,
  Layers,
  FolderCog,
  Shield,
  Calendar,
  Settings,
  Info
} from 'lucide-react';
import { Usuario, ConfiguracaoLoja } from '../types';
import { subscribeConfiguracoesLoja, saveConfiguracaoLojaFirestore, getConfiguracaoLojaFirestore } from '../services/firestoreService';
import { ModalDadosEmpresa } from './ModalDadosEmpresa';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  counts: {
    totalVeiculos: number;
    disponiveis: number;
    alugados: number;
    emTransito?: number;
    alertasAging: number;
    alertasPagamento: number;
    alertasRevisao: number;
    totalFornecedores?: number;
    totalBancos?: number;
    pendentesAprovacao?: number;
    comissoesPendentes?: number;
    comissoesGerenciaisPendentes?: number;
    despesasPendentes?: number;
    recebiveisPendentes?: number;
  };
  onOpenNovoLancamento: () => void;
  currentUser: Usuario | null;
  onOpenUsuarios: () => void;
  onOpenMeuPerfil?: () => void;
  onOpenBackup?: () => void;
  onLogout: () => void;
}

interface SubMenuItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: string | number | null;
  badgeColor?: string;
  alertCount?: number;
  visible: boolean;
  isActionModal?: boolean;
  onActionClick?: () => void;
}

interface AccordionCategory {
  id: 'crm_vendas' | 'estoque_operacoes' | 'financeiro' | 'administracao';
  title: string;
  icon: React.ElementType;
  items: SubMenuItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  counts,
  onOpenNovoLancamento,
  currentUser,
  onOpenUsuarios,
  onOpenMeuPerfil,
  onOpenBackup,
  onLogout,
}) => {
  const isVendedor = currentUser?.role === 'vendedor';
  const isAdmin = currentUser?.role === 'admin';
  const perms = currentUser?.permissoes || {
    verEstoque: true,
    venderCarro: true,
    verCustosAquisicao: true,
    verFinanceiroDRE: true,
    gerenciarLocacao: true,
    gerenciarRevisoes: true,
    gerenciarUsuarios: true,
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [customLogo, setCustomLogo] = useState<string>('');
  const [configLoja, setConfigLoja] = useState<ConfiguracaoLoja | null>(null);
  const [modalEmpresaOpen, setModalEmpresaOpen] = useState(false);

  // Sincronização em tempo real das configurações e logotipo global da loja (documento 'geral' no Firestore)
  useEffect(() => {
    getConfiguracaoLojaFirestore().then((cfg) => {
      if (cfg) {
        setConfigLoja(cfg);
        if (cfg.logoUrl !== undefined) {
          setCustomLogo(cfg.logoUrl || '');
        }
      }
    });

    const unsub = subscribeConfiguracoesLoja((config) => {
      if (config) {
        setConfigLoja(config);
        if (config.logoUrl !== undefined) {
          setCustomLogo(config.logoUrl || '');
        }
      }
    });
    return () => unsub();
  }, []);

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isAdmin) {
      alert('Apenas administradores podem alterar o logotipo oficial da loja.');
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 3MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setCustomLogo(base64);
        try {
          await saveConfiguracaoLojaFirestore({
            logoUrl: base64,
            updatedBy: currentUser?.displayName || 'Administrador',
            updatedByEmail: currentUser?.email || '',
          });
        } catch (err) {
          console.error('Erro ao sincronizar logotipo no Firestore:', err);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAdmin) return;
    setCustomLogo('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    try {
      await saveConfiguracaoLojaFirestore({
        logoUrl: '',
        updatedBy: currentUser?.displayName || 'Administrador',
        updatedByEmail: currentUser?.email || '',
      });
    } catch (err) {
      console.error('Erro ao remover logotipo no Firestore:', err);
    }
  };

  // Definição estruturada dos Menus e Submenus categorizados
  const categories: AccordionCategory[] = useMemo(() => {
    return [
      // 1. CRM & Vendas
      {
        id: 'crm_vendas',
        title: 'CRM & Vendas',
        icon: Briefcase,
        items: [
          {
            id: 'catalogo',
            label: 'Catálogo / Showroom',
            icon: Sparkles,
            badge: `${counts.disponiveis} no pátio`,
            badgeColor: 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30',
            visible: perms.verCatalogo !== undefined ? perms.verCatalogo : perms.verEstoque !== false,
          },
          {
            id: 'vendedor-dash',
            label: 'Painel do Vendedor',
            icon: LayoutDashboard,
            badge: `${currentUser?.comissaoPadraoPercent || 1.5}% Comis.`,
            badgeColor: 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30',
            visible: perms.verVendedorDash !== undefined ? perms.verVendedorDash : (isVendedor || perms.venderCarro !== false),
          },
          {
            id: 'comissoes',
            label: isVendedor ? 'Minhas Vendas & Comissões' : 'Vendas & Comissões',
            icon: Award,
            badge: (counts.comissoesPendentes || 0) > 0 ? `${counts.comissoesPendentes} pendentes` : isVendedor ? 'Extrato' : 'Ranking',
            badgeColor: (counts.comissoesPendentes || 0) > 0 ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30 animate-pulse' : 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30',
            alertCount: counts.comissoesPendentes || 0,
            visible: perms.verComissoes !== undefined ? perms.verComissoes : true,
          },
          {
            id: 'crm-analytics',
            label: 'CRM Analytics',
            icon: Target,
            badge: 'Leads & Niver',
            badgeColor: 'bg-pink-500/20 text-pink-300 font-bold border border-pink-500/30',
            visible: perms.verCrmAnalytics !== undefined 
              ? perms.verCrmAnalytics 
              : !isVendedor && (perms.verCustosAquisicao !== false || perms.verFinanceiroDRE !== false),
          },
        ],
      },

      // 2. Estoque & Operações
      {
        id: 'estoque_operacoes',
        title: 'Estoque & Operações',
        icon: Car,
        items: [
          {
            id: 'estoque',
            label: 'Estoque Ativo por Chassi',
            icon: Car,
            badge: counts.totalVeiculos,
            badgeColor: 'bg-slate-700 text-slate-200 font-bold',
            visible: perms.verEstoque !== undefined ? perms.verEstoque : !isVendedor,
          },
          {
            id: 'funil-preparacao',
            label: 'Funil de Preparação Kanban',
            icon: SlidersHorizontal,
            badge: 'Kanban Pátio',
            badgeColor: 'bg-orange-500/20 text-orange-300 font-bold border border-orange-500/30',
            visible: perms.verFunilPreparacao !== undefined 
              ? perms.verFunilPreparacao 
              : perms.gerenciarRevisoes !== false || currentUser?.role === 'admin' || currentUser?.role === 'gestor',
          },
          {
            id: 'revisoes',
            label: 'Revisões & Oficinas',
            icon: Wrench,
            badge: !isVendedor && counts.alertasRevisao > 0 ? `${counts.alertasRevisao} urgente` : null,
            badgeColor: 'bg-rose-600 text-white font-bold',
            alertCount: isVendedor ? 0 : (counts.alertasRevisao || 0),
            visible: perms.verRevisoes !== undefined ? perms.verRevisoes : perms.gerenciarRevisoes !== false && !isVendedor,
          },
          {
            id: 'fornecedores',
            label: 'Fornecedores & Prestadores',
            icon: Building2,
            badge: (counts.totalFornecedores ?? 0) > 0 ? `${counts.totalFornecedores}` : null,
            badgeColor: 'bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30',
            visible: perms.verFornecedores !== undefined 
              ? perms.verFornecedores 
              : perms.gerenciarFornecedores !== false && !isVendedor,
          },
        ],
      },

      // 3. Financeiro
      {
        id: 'financeiro',
        title: 'Financeiro',
        icon: DollarSign,
        items: [
          {
            id: 'financeiro',
            label: 'DRE Executivo',
            icon: DollarSign,
            badge: 'DRE',
            badgeColor: 'bg-blue-900 text-blue-200',
            visible: perms.verFinanceiroDRE !== undefined 
              ? perms.verFinanceiroDRE 
              : !isVendedor && perms.verFinanceiroDRE !== false,
          },
          {
            id: 'contas-pagar',
            label: 'Contas a Pagar',
            icon: Receipt,
            badge: !isVendedor && (counts.despesasPendentes ?? 0) > 0 ? `${counts.despesasPendentes} pend.` : null,
            badgeColor: 'bg-amber-500 text-white font-bold',
            alertCount: isVendedor ? 0 : (counts.despesasPendentes || 0),
            visible: perms.verContasPagar !== undefined 
              ? perms.verContasPagar 
              : !isVendedor && perms.verFinanceiroDRE !== false,
          },
          {
            id: 'contas-receber',
            label: 'Contas a Receber',
            icon: TrendingUp,
            badge: !isVendedor && (counts.recebiveisPendentes ?? 0) > 0 ? `${counts.recebiveisPendentes} pend.` : null,
            badgeColor: 'bg-emerald-500 text-white font-bold',
            alertCount: isVendedor ? 0 : (counts.recebiveisPendentes || 0),
            visible: perms.verContasReceber !== undefined 
              ? perms.verContasReceber 
              : !isVendedor && perms.verFinanceiroDRE !== false,
          },
          {
            id: 'bancos',
            label: 'Bancos Parceiros',
            icon: ShieldCheck,
            badge: (counts.totalBancos ?? 0) > 0 ? `${counts.totalBancos}` : 'TAC',
            badgeColor: 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30',
            visible: perms.verBancos !== undefined 
              ? perms.verBancos 
              : (perms.gerenciarBancos !== false || perms.verCustosAquisicao !== false || perms.verFinanceiroDRE !== false) && !isVendedor,
          },
        ],
      },

      // 4. Administração (Acesso Restrito)
      {
        id: 'administracao',
        title: 'Administração',
        icon: FolderCog,
        items: [
          {
            id: 'comissoes-gerenciais',
            label: 'Comissões da Gestão',
            icon: Award,
            badge: (counts.comissoesGerenciaisPendentes ?? 0) > 0 ? `${counts.comissoesGerenciaisPendentes} pend.` : 'Overriding',
            badgeColor: (counts.comissoesGerenciaisPendentes ?? 0) > 0 ? 'bg-amber-500 text-slate-950 font-bold animate-pulse' : 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30',
            alertCount: counts.comissoesGerenciaisPendentes || 0,
            visible: perms.verComissoesGerenciais === true || (currentUser?.role === 'admin' && perms.verComissoesGerenciais !== false) || (currentUser?.role === 'gestor' && perms.verComissoesGerenciais !== false),
          },
          {
            id: 'usuarios-item',
            label: 'Gestão de Usuários',
            icon: Users,
            badge: (counts.pendentesAprovacao ?? 0) > 0 ? `${counts.pendentesAprovacao} Novos` : 'RBAC',
            badgeColor: (counts.pendentesAprovacao ?? 0) > 0 ? 'bg-amber-500 text-slate-950 font-bold animate-pulse' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20 font-mono',
            alertCount: counts.pendentesAprovacao || 0,
            isActionModal: true,
            onActionClick: onOpenUsuarios,
            visible: perms.gerenciarUsuarios === true || (currentUser?.role === 'admin' && perms.gerenciarUsuarios !== false),
          },
          {
            id: 'backup-item',
            label: 'Backup de Segurança',
            icon: ShieldCheck,
            badge: 'JSON AES',
            badgeColor: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono',
            isActionModal: true,
            onActionClick: onOpenBackup,
            visible: Boolean(onOpenBackup && (perms.verBackupSeguranca !== false && (currentUser?.role === 'admin' || perms.gerenciarUsuarios || perms.verBackupSeguranca === true))),
          },
        ],
      },
    ];
  }, [counts, perms, isVendedor, currentUser, onOpenUsuarios, onOpenBackup]);

  // Função para descobrir a qual categoria a aba ativa pertence
  const findCategoryForTab = (tab: string): string => {
    for (const cat of categories) {
      const match = cat.items.some(
        (item) => item.id === tab
      );
      if (match) return cat.id;
    }
    return 'crm_vendas';
  };

  // Estado dos Accordions abertos/fechados (guarda múltiplos ou abre a categoria correspondente)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const initialCategory = findCategoryForTab(activeTab);
    return {
      crm_vendas: true,
      estoque_operacoes: true,
      financeiro: true,
      administracao: false,
      [initialCategory]: true,
    };
  });

  // Auto-expande o menu pai se a aba mudar externamente
  useEffect(() => {
    const currentCategory = findCategoryForTab(activeTab);
    setOpenSections((prev) => ({
      ...prev,
      [currentCategory]: true,
    }));
  }, [activeTab]);

  const toggleSection = (categoryId: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  return (
    <aside id="main-sidebar" className="h-screen max-h-screen sticky top-0 flex flex-col w-64 xl:w-72 bg-[#0a0a0d] text-slate-200 border-r border-white/5 shrink-0 select-none overflow-hidden">
      {/* Input oculto para upload de logotipo - ADMIN ONLY */}
      {isAdmin && (
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleLogoFileChange}
          accept="image/*"
          className="hidden"
          id="sidebar-logo-file-input"
        />
      )}

      {/* Cabeçalho da Marca / Logo / Dados da Empresa */}
      <div className="p-4 xl:p-5 border-b border-white/5 flex items-center justify-between relative shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div
            onClick={() => {
              if (isAdmin) {
                fileInputRef.current?.click();
              }
            }}
            className={`group relative w-10 h-10 xl:w-11 xl:h-11 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white font-black text-xl overflow-hidden border border-white/10 shrink-0 ${
              isAdmin ? 'cursor-pointer hover:border-blue-400 transition' : 'cursor-default'
            }`}
            title={isAdmin ? "Clique para alterar o logotipo oficial da loja (Apenas Administrador)" : "Logotipo Oficial da Loja"}
          >
            {customLogo ? (
              <img
                src={customLogo}
                alt="Logo AutoGestor"
                className="w-full h-full object-contain p-1 rounded-xl bg-[#0e1017]"
              />
            ) : (
              <Car size={20} className="stroke-[2.5]" />
            )}

            {isAdmin && (
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                <Camera size={15} className="text-white drop-shadow" />
              </div>
            )}
          </div>

          <div
            onClick={() => setModalEmpresaOpen(true)}
            className="min-w-0 cursor-pointer group/empresa"
            title="Clique para ver e alterar as informações da empresa (CNPJ, Razão Social, Endereço)"
          >
            <span className="font-extrabold text-base xl:text-lg tracking-tight text-white flex items-center gap-1 truncate group-hover/empresa:text-blue-400 transition">
              {configLoja?.nomeLoja ? (
                <span>{configLoja.nomeLoja}</span>
              ) : (
                <>TROCA <span className="text-blue-400">FÁCIL</span></>
              )}
              <Info size={11} className="text-slate-500 group-hover/empresa:text-blue-400 shrink-0" />
            </span>
            <p className="text-[10px] xl:text-[11px] text-slate-400 font-medium truncate">
              {configLoja?.cnpj ? `CNPJ: ${configLoja.cnpj}` : 'Autos e Repasse'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setModalEmpresaOpen(true)}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-blue-600/20 text-slate-400 hover:text-blue-400 border border-white/5 hover:border-blue-500/30 transition cursor-pointer"
            title="Dados e Informações da Empresa (CNPJ, Razão Social, Endereço)"
          >
            <Building2 size={15} />
          </button>

          {customLogo && isAdmin && (
            <button
              onClick={handleRemoveLogo}
              className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/10 border border-white/5 transition shrink-0 cursor-pointer"
              title="Restaurar logo padrão (Admin)"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Botão de Ação Rápida */}
      <div className="p-3 xl:p-4 pb-2 shrink-0">
        <button
          id="btn-sidebar-quick-action"
          onClick={onOpenNovoLancamento}
          className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs xl:text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition duration-150 active:scale-[0.98] cursor-pointer"
        >
          <PlusCircle size={17} />
          <span>Novo Lançamento</span>
        </button>
      </div>

      {/* Navegação Vertical com Menus Expansíveis (Accordions) */}
      <nav className="flex-1 px-2.5 xl:px-3 space-y-2 overflow-y-auto pt-2 pb-4 scrollbar-thin scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20">
        {/* 📊 Dashboard Central (Torre de Controle Global) */}
        {(perms.verPainelExecutivo !== undefined ? perms.verPainelExecutivo : !isVendedor || perms.verFinanceiroDRE !== false) && (
          <button
            id="nav-item-torre-controle"
            type="button"
            onClick={() => setActiveTab('dash')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all mb-2 cursor-pointer ${
              activeTab === 'dash'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25 border border-blue-400/40'
                : 'text-slate-300 bg-white/[0.03] hover:bg-white/[0.06] hover:text-white border border-white/5'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`p-1.5 rounded-xl shrink-0 ${activeTab === 'dash' ? 'bg-white/20 text-white' : 'bg-blue-500/15 text-blue-400'}`}>
                <LayoutDashboard size={15} />
              </div>
              <div className="text-left truncate">
                <div className="font-bold text-xs truncate">Dashboard Central</div>
                <div className={`text-[10px] font-normal truncate ${activeTab === 'dash' ? 'text-blue-100' : 'text-slate-400'}`}>
                  Torre de Controle Global
                </div>
              </div>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${
              activeTab === 'dash' ? 'bg-white/25 text-white' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
            }`}>
              Torre
            </span>
          </button>
        )}

        {categories.map((category) => {
          const visibleItems = category.items.filter((item) => item.visible);
          // Oculta a categoria inteira caso não haja nenhuma rota autorizada para o perfil (RBAC)
          if (visibleItems.length === 0) return null;

          const isExpanded = !!openSections[category.id];
          const CategoryIcon = category.icon;

          // Consolidação de todos os alertas / badges numéricos dos subitens desta categoria
          const totalCategoryAlerts = visibleItems.reduce((sum, item) => {
            return sum + (item.alertCount || 0);
          }, 0);

          // Verifica se algum item interno está atualmente ativo
          const isAnyChildActive = visibleItems.some((item) => {
            return activeTab === item.id;
          });

          return (
            <div key={category.id} className="rounded-2xl bg-white/[0.02] border border-white/[0.04] overflow-hidden transition-all">
              {/* Header do Accordion (Menu Pai) */}
              <button
                id={`accordion-header-${category.id}`}
                type="button"
                onClick={() => toggleSection(category.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                  isAnyChildActive && !isExpanded
                    ? 'bg-blue-600/10 text-blue-300'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`p-1 rounded-lg ${isAnyChildActive ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-slate-400'}`}>
                    <CategoryIcon size={14} />
                  </div>
                  <span className="truncate">{category.title}</span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Badge Consolidado exibido quando o menu pai está FECHADO e possui itens pendentes (Apenas Admin/Gestor) */}
                  {!isExpanded && !isVendedor && totalCategoryAlerts > 0 && (
                    <span 
                      className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/20"
                      title={`${totalCategoryAlerts} item(ns) pendente(s) nesta categoria`}
                    >
                      {totalCategoryAlerts}
                    </span>
                  )}

                  {/* Ícone de Toggle Chevron */}
                  <ChevronDown
                    size={14}
                    className={`text-slate-500 transition-transform duration-200 ${
                      isExpanded ? 'rotate-180 text-slate-300' : ''
                    }`}
                  />
                </div>
              </button>

              {/* Submenus (Filhos) com transição expansível */}
              {isExpanded && (
                <div className="px-1.5 pb-2 pt-0.5 space-y-0.5 animate-in fade-in duration-150">
                  {visibleItems.map((item) => {
                    const SubIcon = item.icon;
                    const isActive = activeTab === item.id;

                    return (
                      <button
                        id={`nav-item-${item.id}`}
                        key={item.id}
                        type="button"
                        onClick={() => {
                          if (item.isActionModal && item.onActionClick) {
                            item.onActionClick();
                          } else {
                            setActiveTab(item.id);
                          }
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 group cursor-pointer ${
                          isActive
                            ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-sm font-semibold'
                            : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <SubIcon
                            size={16}
                            className={`shrink-0 transition-colors ${
                              isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'
                            }`}
                          />
                          <span className="truncate whitespace-nowrap">{item.label}</span>
                        </div>

                        {item.badge !== null && item.badge !== undefined && (
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ml-1.5 ${
                              item.badgeColor || 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* 🔑 Locadora & Frota (Módulo Mini-ERP Independente) */}
        {(perms.verLocacaoContratos !== undefined ? perms.verLocacaoContratos : perms.gerenciarLocacao !== false) && (
          <button
            id="nav-item-locadora-frota"
            type="button"
            onClick={() => setActiveTab('locacao')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all mt-2 cursor-pointer ${
              activeTab === 'locacao' || activeTab.startsWith('locacao-')
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/25 border border-amber-400/40'
                : 'text-slate-300 bg-white/[0.03] hover:bg-white/[0.06] hover:text-white border border-white/5'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`p-1.5 rounded-xl shrink-0 ${activeTab === 'locacao' || activeTab.startsWith('locacao-') ? 'bg-white/20 text-white' : 'bg-amber-500/15 text-amber-400'}`}>
                <Key size={15} />
              </div>
              <div className="text-left truncate">
                <div className="font-bold text-xs truncate">Locadora & Frota</div>
                <div className={`text-[10px] font-normal truncate ${activeTab === 'locacao' || activeTab.startsWith('locacao-') ? 'text-amber-100' : 'text-slate-400'}`}>
                  Mini-ERP Locação App
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {!isVendedor && counts.alertasPagamento > 0 ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500 text-white font-bold">
                  {counts.alertasPagamento} pend.
                </span>
              ) : (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                  activeTab === 'locacao' || activeTab.startsWith('locacao-') ? 'bg-white/25 text-white' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}>
                  {counts.alugados} ativos
                </span>
              )}
            </div>
          </button>
        )}
      </nav>

      {/* Perfil do Usuário & Sair */}
      <div className="p-3 border-t border-white/5 bg-[#0e0f14]">
        {currentUser ? (
          <div className="p-2 rounded-2xl bg-[#14151c] border border-white/5 flex items-center justify-between gap-1.5">
            <button
              id="btn-sidebar-user-profile"
              type="button"
              onClick={onOpenMeuPerfil}
              title="Meu Perfil / Dados Bancários"
              className="flex items-center gap-2.5 min-w-0 flex-1 text-left p-1 rounded-xl hover:bg-white/[0.05] transition cursor-pointer group"
            >
              <div className="relative shrink-0">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName}
                    referrerPolicy="no-referrer"
                    className="w-9 h-9 rounded-xl object-cover border border-white/10 shrink-0 group-hover:border-blue-500/50 transition"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0 font-bold text-xs group-hover:border-blue-500/50 transition">
                    {currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#0e0f14] border border-white/15 flex items-center justify-center text-slate-400 group-hover:text-blue-400 shadow-sm">
                  <Settings size={9} />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate leading-tight group-hover:text-blue-400 transition">
                  {currentUser.displayName}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] text-blue-400 font-semibold uppercase bg-blue-500/10 px-1 rounded">
                    {currentUser.role}
                  </span>
                  <span className="text-[10px] text-slate-400 truncate max-w-[85px]">
                    {currentUser.cargo || currentUser.email}
                  </span>
                </div>
              </div>
            </button>

            <div className="flex items-center gap-1 shrink-0">
              <button
                id="btn-sidebar-gear-profile"
                type="button"
                onClick={onOpenMeuPerfil}
                title="Meu Perfil / Dados Bancários"
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-blue-500/20 text-slate-400 hover:text-blue-400 border border-white/5 hover:border-blue-500/30 flex items-center justify-center transition cursor-pointer"
              >
                <Settings size={14} />
              </button>

              <button
                id="btn-sidebar-logout"
                type="button"
                onClick={onLogout}
                title="Sair da conta"
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-white/5 hover:border-rose-500/30 flex items-center justify-center transition cursor-pointer"
              >
                <LogOut size={14} />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-400" />
              Sessão Ativa
            </span>
          </div>
        )}
      </div>

      {/* MODAL DE DADOS E INFORMAÇÕES DA EMPRESA (CNPJ, RAZÃO SOCIAL, ENDEREÇO) */}
      <ModalDadosEmpresa
        isOpen={modalEmpresaOpen}
        onClose={() => setModalEmpresaOpen(false)}
        currentUser={currentUser}
      />
    </aside>
  );
};
