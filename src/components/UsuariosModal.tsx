import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Clock,
  Mail,
  User,
  Check,
  Sparkles,
  Award,
  DollarSign,
  Lock,
  Eye,
  EyeOff,
  Phone,
  CheckCircle2,
  XCircle,
  Settings,
  Percent,
  Search,
  AlertTriangle,
  RotateCcw,
  Trash2,
  ChevronDown,
  LayoutDashboard,
  BarChart3,
  Car,
  Truck,
  Wrench,
  Building2,
  Key,
  Gauge,
  Database,
  Target,
  Compass,
  FileText,
  SlidersHorizontal,
} from 'lucide-react';
import { Usuario, RoleUsuario, PermissoesUsuario, StatusAprovacao } from '../types';
import {
  subscribeAllUsers,
  approveUserInFirestore,
  rejectUserInFirestore,
  revokeUserApprovalInFirestore,
  updateUserPermissionsInFirestore,
  deleteUserInFirestore,
  getDefaultPermissionsForRole,
  MASTER_ADMIN_EMAIL,
} from '../services/authService';
import { ModalMeuPerfil } from './ModalMeuPerfil';

interface UsuariosModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: Usuario | null;
}

export const UsuariosModal: React.FC<UsuariosModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const [users, setUsers] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pendentes' | 'aprovados' | 'recusados'>('pendentes');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserForPerms, setSelectedUserForPerms] = useState<Usuario | null>(null);
  const [editingUserPerfil, setEditingUserPerfil] = useState<Usuario | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Edit Permissions State
  const [tempRole, setTempRole] = useState<RoleUsuario>('vendedor');
  const [tempCargo, setTempCargo] = useState('');
  const [tempRegraComissao, setTempRegraComissao] = useState<'admin_gerente' | 'vendedor_padrao' | 'vendedor_bonus_tac' | 'percentual_venda'>('vendedor_padrao');
  const [tempTipoComissao, setTempTipoComissao] = useState<'percentual' | 'fixo'>('fixo');
  const [tempComissao, setTempComissao] = useState<number>(1.5);
  const [tempComissaoFixo, setTempComissaoFixo] = useState<number>(500);
  const [tempComissaoBonusTac, setTempComissaoBonusTac] = useState<number>(20);
  const [tempPermissoes, setTempPermissoes] = useState<PermissoesUsuario>(() => getDefaultPermissionsForRole('vendedor'));
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    const unsubscribe = subscribeAllUsers((userList) => {
      setUsers(userList);
      setLoading(false);
      // If there are pending users, auto-suggest the pendentes tab
      const pendentesCount = userList.filter((u) => u.statusAprovacao === 'pendente').length;
      if (pendentesCount > 0 && activeTab === 'aprovados' && userList.length === 1) {
        setActiveTab('pendentes');
      }
    });

    return () => unsubscribe();
  }, [isOpen]);

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMessage({ text, type });
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  if (!isOpen) return null;

  // RBAC: Somente Administradores têm acesso ao gerenciador de usuários e dados cadastrais da equipe
  if (currentUser?.role !== 'admin') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
        <div className="bg-[#0e0f14] border border-red-500/30 rounded-3xl p-6 text-center max-w-md shadow-2xl space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto">
            <Lock size={24} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Acesso Exclusivo para Administradores</h3>
            <p className="text-xs text-slate-400 mt-1">
              A gestão de usuários e visualização dos dados cadastrais da equipe é estritamente restrita a administradores do sistema.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition cursor-pointer"
          >
            Fechar Janela
          </button>
        </div>
      </div>
    );
  }

  const pendentes = users.filter((u) => u.statusAprovacao === 'pendente');
  const aprovados = users.filter((u) => u.statusAprovacao === 'aprovado' && u.ativo !== false);
  const recusados = users.filter((u) => u.statusAprovacao === 'recusado' || (u.statusAprovacao !== 'pendente' && u.ativo === false));

  const filterBySearch = (list: Usuario[]) => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (u) =>
        u.displayName?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.cargo?.toLowerCase().includes(q) ||
        u.role?.toLowerCase().includes(q) ||
        u.cpfCnpj?.toLowerCase().includes(q) ||
        u.telefone?.toLowerCase().includes(q)
    );
  };

  const handleOpenPermsModal = (user: Usuario) => {
    setSelectedUserForPerms(user);
    setTempRole(user.role || 'vendedor');
    setTempCargo(user.cargo || '');
    
    // Normalizar regra de comissão
    let regra: 'admin_gerente' | 'vendedor_padrao' | 'vendedor_bonus_tac' | 'percentual_venda' = 'vendedor_padrao';
    if (user.regraComissaoPadrao) {
      if (user.regraComissaoPadrao === 'admin_gerente') regra = 'admin_gerente';
      else if (user.regraComissaoPadrao === 'vendedor_bonus_tac') regra = 'vendedor_bonus_tac';
      else if (user.regraComissaoPadrao === 'percentual_venda' || user.regraComissaoPadrao === 'percentual') regra = 'percentual_venda';
      else regra = 'vendedor_padrao';
    } else if (user.tipoComissaoPadrao === 'percentual') {
      regra = 'percentual_venda';
    } else {
      regra = user.role === 'admin' || user.role === 'gestor' ? 'admin_gerente' : 'vendedor_padrao';
    }

    setTempRegraComissao(regra);
    setTempTipoComissao(regra === 'vendedor_padrao' ? 'fixo' : 'percentual');
    setTempComissao(user.comissaoPadraoPercent ?? (regra === 'admin_gerente' ? 10 : 1.5));
    setTempComissaoFixo(user.comissaoPadraoFixo ?? 500);
    setTempComissaoBonusTac(user.comissaoBonusTacPercent ?? 20);
    setTempPermissoes(
      user.permissoes ? { ...getDefaultPermissionsForRole(user.role || 'vendedor'), ...user.permissoes } : getDefaultPermissionsForRole(user.role || 'vendedor')
    );
  };

  const handleSavePerms = async () => {
    if (!selectedUserForPerms) return;
    try {
      setIsSaving(true);
      const isPending = selectedUserForPerms.statusAprovacao === 'pendente';
      
      const tipoComissaoFinal = (tempRegraComissao === 'vendedor_padrao' ? 'fixo' : 'percentual') as any;

      if (isPending) {
        await approveUserInFirestore(
          selectedUserForPerms.uid,
          tempRole,
          tempPermissoes,
          tempRegraComissao === 'vendedor_padrao' ? undefined : tempComissao,
          currentUser?.email || MASTER_ADMIN_EMAIL,
          tipoComissaoFinal,
          tempRegraComissao === 'vendedor_padrao' || tempRegraComissao === 'vendedor_bonus_tac' ? tempComissaoFixo : undefined,
          tempRegraComissao,
          tempRegraComissao === 'vendedor_bonus_tac' ? tempComissaoBonusTac : undefined
        );
        showFeedback(`Usuário ${selectedUserForPerms.displayName} aprovado com perfil de comissão definido!`);
      } else {
        await updateUserPermissionsInFirestore(selectedUserForPerms.uid, {
          permissoes: tempPermissoes,
          role: tempRole,
          cargo: tempCargo,
          regraComissaoPadrao: tempRegraComissao,
          tipoComissaoPadrao: tipoComissaoFinal,
          comissaoPadraoPercent: tempRegraComissao === 'vendedor_padrao' ? undefined : tempComissao,
          comissaoPadraoFixo: tempRegraComissao === 'vendedor_padrao' || tempRegraComissao === 'vendedor_bonus_tac' ? tempComissaoFixo : undefined,
          comissaoBonusTacPercent: tempRegraComissao === 'vendedor_bonus_tac' ? tempComissaoBonusTac : undefined,
        });
        showFeedback(`Permissões e plano de comissão de ${selectedUserForPerms.displayName} atualizados!`);
      }
      setSelectedUserForPerms(null);
    } catch (err) {
      console.error('Error updating permissions:', err);
      showFeedback('Erro ao salvar permissões no Firestore.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickApprove = async (user: Usuario, role: RoleUsuario = 'vendedor') => {
    try {
      const perms: PermissoesUsuario = getDefaultPermissionsForRole(role);
      let comissao = 1.5;

      if (role === 'admin') {
        comissao = 0;
      } else if (role === 'gestor') {
        comissao = 1.0;
      } else if (role === 'operador') {
        comissao = 0;
      } else {
        // Vendedor padrão
        comissao = 1.5;
      }

      await approveUserInFirestore(
        user.uid,
        role,
        perms,
        comissao,
        currentUser?.email || MASTER_ADMIN_EMAIL
      );
      showFeedback(`Acesso aprovado para ${user.displayName} como ${role.toUpperCase()}!`);
    } catch (err) {
      console.error('Error approving user:', err);
      showFeedback('Erro ao aprovar usuário no Firestore.', 'error');
    }
  };

  const handleReject = async (uid: string, nome: string) => {
    if (window.confirm(`Tem certeza que deseja recusar/bloquear o acesso de ${nome}?`)) {
      try {
        await rejectUserInFirestore(uid, 'Recusado pelo administrador.');
        showFeedback(`Acesso de ${nome} bloqueado.`);
      } catch (err) {
        console.error('Error rejecting user:', err);
        showFeedback('Erro ao recusar usuário.', 'error');
      }
    }
  };

  const handleRevokeToPending = async (uid: string, nome: string) => {
    if (window.confirm(`Deseja revogar a aprovação de ${nome} e torná-lo 'Pendente' novamente? Ele perderá o acesso imediatamente.`)) {
      try {
        await revokeUserApprovalInFirestore(uid);
        showFeedback(`Acesso de ${nome} revogado. Usuário voltou para o status Pendente.`);
      } catch (err) {
        console.error('Error revoking approval:', err);
        showFeedback('Erro ao revogar aprovação.', 'error');
      }
    }
  };

  const handleDelete = async (uid: string, nome: string) => {
    if (window.confirm(`ATENÇÃO: Excluir permanentemente o registro de ${nome} do Firestore?`)) {
      try {
        await deleteUserInFirestore(uid);
        showFeedback(`Registro de ${nome} removido.`);
      } catch (err) {
        console.error('Error deleting user:', err);
        showFeedback('Erro ao excluir usuário.', 'error');
      }
    }
  };

  const getRoleBadge = (role: RoleUsuario) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 border border-purple-500/30 text-purple-400">
            <ShieldCheck size={13} />
            <span>Administrador</span>
          </span>
        );
      case 'gestor':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 border border-blue-500/30 text-blue-400">
            <Shield size={13} />
            <span>Gestor de Pátio</span>
          </span>
        );
      case 'vendedor':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Award size={13} />
            <span>Vendedor</span>
          </span>
        );
      case 'operador':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 border border-slate-500/30 text-slate-300">
            <UserCheck size={13} />
            <span>Operador</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col bg-gray-900 rounded-2xl shadow-xl overflow-hidden border border-white/10">
        
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-[#16171f]/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
              <Users size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Gestão de Usuários & Autorização Prévia
              </h2>
              <p className="text-xs text-slate-400">
                Aprove novos usuários autenticados com Google ou E-mail e gerencie permissões restritas.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Security Alert Banner */}
        <div className="px-6 py-3 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between gap-3 text-xs text-amber-300 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldAlert size={16} className="text-amber-400 shrink-0" />
            <span>
              <strong>Acesso Restrito Ativo:</strong> Nenhum usuário autenticado via Google entra no sistema sem sua aprovação explícita.
            </span>
          </div>
          <span className="text-[11px] font-mono bg-amber-500/20 px-2 py-0.5 rounded text-amber-200 shrink-0">
            RBAC Seguro
          </span>
        </div>

        {/* Feedback Alert Toast */}
        {feedbackMessage && (
          <div
            className={`px-6 py-2.5 text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
              feedbackMessage.type === 'success'
                ? 'bg-emerald-500/20 text-emerald-300 border-b border-emerald-500/30'
                : 'bg-red-500/20 text-red-300 border-b border-red-500/30'
            }`}
          >
            {feedbackMessage.type === 'success' ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
            <span>{feedbackMessage.text}</span>
          </div>
        )}

        {/* Tab Navigation & Search Bar */}
        <div className="px-6 pt-3 pb-2 border-b border-white/5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#111116] shrink-0">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('pendentes')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'pendentes'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-white bg-white/5'
              }`}
            >
              <Clock size={14} />
              <span>Aguardando Aprovação</span>
              {pendentes.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black animate-pulse">
                  {pendentes.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('aprovados')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'aprovados'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-white bg-white/5'
              }`}
            >
              <ShieldCheck size={14} />
              <span>Usuários Aprovados ({aprovados.length})</span>
            </button>

            {recusados.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('recusados')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                  activeTab === 'recusados'
                    ? 'bg-red-500/20 text-red-300 border border-red-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-white bg-white/5'
                }`}
              >
                <XCircle size={14} />
                <span>Bloqueados ({recusados.length})</span>
              </button>
            )}
          </div>

          <div className="relative min-w-[200px]">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por nome ou e-mail..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-white/10 bg-[#16171f] text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {loading ? (
            <div className="py-12 text-center text-slate-400 space-y-3">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs">Carregando usuários do Cloud Firestore...</p>
            </div>
          ) : activeTab === 'pendentes' ? (
            /* TAB: PENDENTES */
            filterBySearch(pendentes).length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <CheckCircle2 size={38} className="mx-auto text-emerald-500" />
                <p className="text-sm font-bold text-white">Nenhum cadastro pendente de aprovação</p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Quando novos usuários realizarem login com o Google ou cadastrarem e-mail, suas solicitações aparecerão aqui para você autorizar.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filterBySearch(pendentes).map((u) => (
                  <div
                    key={u.uid}
                    className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/25 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition hover:border-amber-500/40"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {u.photoURL ? (
                        <img
                          src={u.photoURL}
                          alt={u.displayName}
                          className="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-base border border-amber-500/30 shrink-0">
                          {u.displayName?.charAt(0).toUpperCase() || 'U'}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-white">{u.displayName}</h4>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                            Pendente de Aprovação
                          </span>
                          {u.authProvider === 'google' ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                              Google Auth
                            </span>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-500/10 text-slate-300 border border-slate-500/20 font-medium">
                              E-mail/Senha
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">{u.email}</p>
                        <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1 flex-wrap">
                          {u.cpfCnpj ? (
                            <span className="flex items-center gap-1 text-slate-300">
                              <FileText size={11} className="text-purple-400" /> CPF/CNPJ: <strong className="font-mono text-white">{u.cpfCnpj}</strong>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-slate-500 italic">
                              <FileText size={11} /> CPF/CNPJ: Não cadastrado
                            </span>
                          )}
                          {u.telefone ? (
                            <span className="flex items-center gap-1 text-slate-300">
                              <Phone size={11} className="text-emerald-400" /> Tel: <strong className="text-white">{u.telefone}</strong>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-slate-500 italic">
                              <Phone size={11} /> Tel: Não informado
                            </span>
                          )}
                          <span>Função sugerida: <strong className="text-blue-400">{u.cargo || u.role}</strong></span>
                          <span>Cadastrado em: <strong className="text-slate-300">{new Date(u.createdAt || u.lastLoginAt).toLocaleDateString('pt-BR')}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Explicit Approval Actions */}
                    <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
                      <button
                        type="button"
                        onClick={() => setEditingUserPerfil(u)}
                        className="px-3 py-2 rounded-xl bg-purple-600/15 hover:bg-purple-600/25 text-purple-300 border border-purple-500/20 font-bold text-xs transition flex items-center gap-1 cursor-pointer"
                        title="Visualizar e alterar ficha cadastral completa antes de aprovar"
                      >
                        <UserCheck size={14} className="text-purple-400" />
                        <span>Ver / Alterar Cadastro</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleQuickApprove(u, 'vendedor')}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition flex items-center gap-1.5 cursor-pointer"
                        title="Aprova como vendedor com comissão de 1.5% e restrição de custos confidenciais"
                      >
                        <Check size={14} />
                        <span>Aprovar Vendedor</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleQuickApprove(u, 'gestor')}
                        className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition flex items-center gap-1.5 cursor-pointer"
                        title="Aprova como gestor de pátio e locações"
                      >
                        <Shield size={14} />
                        <span>Aprovar Gestor</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenPermsModal(u)}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition cursor-pointer"
                        title="Personalizar permissões e comissões antes de aprovar"
                      >
                        <Settings size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleReject(u.uid, u.displayName)}
                        className="px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-bold text-xs transition flex items-center gap-1 cursor-pointer"
                        title="Recusar o acesso deste usuário"
                      >
                        <XCircle size={14} /> Recusar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : activeTab === 'aprovados' ? (
            /* TAB: APROVADOS */
            filterBySearch(aprovados).length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <Users size={36} className="mx-auto text-slate-600" />
                <p className="text-sm font-bold text-white">Nenhum usuário aprovado encontrado com esse filtro</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filterBySearch(aprovados).map((u) => {
                  const isCurrent = currentUser?.uid === u.uid;
                  const isMaster = u.email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();

                  return (
                    <div
                      key={u.uid}
                      className={`p-4 rounded-2xl border transition flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                        isCurrent
                          ? 'bg-blue-500/10 border-blue-500/30 shadow-sm'
                          : 'bg-[#16171f] border-white/5 hover:border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {u.photoURL ? (
                          <img
                            src={u.photoURL}
                            alt={u.displayName}
                            className="w-11 h-11 rounded-xl object-cover border border-white/10 shrink-0"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center font-bold text-sm shrink-0">
                            {u.displayName?.charAt(0).toUpperCase() || 'U'}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-xs font-bold text-white">{u.displayName}</h4>
                            {isCurrent && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">
                                Você
                              </span>
                            )}
                            {getRoleBadge(u.role)}
                            {isMaster && (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                                Master Admin
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 font-mono mt-0.5">{u.email}</p>
                          <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1 flex-wrap">
                            {u.role === 'vendedor' && (
                              <span>Comissão: <strong className="text-emerald-400">{u.comissaoPadraoPercent ?? 1.5}%</strong></span>
                            )}
                            {u.cargo && <span>Cargo: <strong className="text-slate-300">{u.cargo}</strong></span>}
                            {u.dataAprovacao && (
                              <span>Aprovado em: <strong className="text-slate-300">{new Date(u.dataAprovacao).toLocaleDateString('pt-BR')}</strong></span>
                            )}
                          </div>

                          {/* Dados Cadastrais Registrados pelo Usuário ou Administrador */}
                          <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1.5 flex-wrap pt-1.5 border-t border-white/5">
                            <span className="flex items-center gap-1">
                              <FileText size={11} className={u.cpfCnpj ? 'text-purple-400' : 'text-slate-600'} />
                              CPF/CNPJ: {u.cpfCnpj ? <strong className="font-mono text-white">{u.cpfCnpj}</strong> : <span className="text-slate-500 italic">Não informado</span>}
                            </span>
                            <span className="flex items-center gap-1">
                              <Phone size={11} className={u.telefone ? 'text-emerald-400' : 'text-slate-600'} />
                              Tel: {u.telefone ? <strong className="text-white">{u.telefone}</strong> : <span className="text-slate-500 italic">Não informado</span>}
                            </span>
                            {u.dadosBancarios?.chavePix && (
                              <span className="flex items-center gap-1">
                                <DollarSign size={11} className="text-amber-400" />
                                PIX: <strong className="font-mono text-amber-300">{u.dadosBancarios.chavePix}</strong>
                              </span>
                            )}
                            {u.enderecoCompleto?.cidade && (
                              <span className="flex items-center gap-1">
                                <Building2 size={11} className="text-blue-400" />
                                {u.enderecoCompleto.cidade}{u.enderecoCompleto.uf ? `/${u.enderecoCompleto.uf}` : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Permissions summary & Edit Button */}
                      <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
                        <button
                          type="button"
                          onClick={() => setEditingUserPerfil(u)}
                          className="px-3.5 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 hover:text-purple-200 border border-purple-500/30 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                          title="Visualizar e alterar os dados cadastrais completos (CPF, Telefone, Endereço, Bancários, Vínculo)"
                        >
                          <UserCheck size={14} className="text-purple-400" />
                          <span>Ver / Alterar Cadastro</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenPermsModal(u)}
                          className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs border border-white/10 transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <Settings size={14} className="text-blue-400" />
                          <span>Gerenciar Acessos</span>
                        </button>

                        {!isCurrent && !isMaster && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleRevokeToPending(u.uid, u.displayName)}
                              className="px-2.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 font-bold text-xs transition flex items-center gap-1 cursor-pointer"
                              title="Tornar Pendente (Revoga acesso imediatamente)"
                            >
                              <RotateCcw size={13} />
                              <span className="hidden sm:inline">Suspender</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleReject(u.uid, u.displayName)}
                              className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition cursor-pointer"
                              title="Bloquear usuário"
                            >
                              <XCircle size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            /* TAB: RECUSADOS */
            <div className="space-y-3">
              {recusados.map((u) => (
                <div
                  key={u.uid}
                  className="p-4 rounded-2xl bg-red-500/5 border border-red-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 flex items-center justify-center font-bold text-sm shrink-0">
                      <XCircle size={22} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-white">{u.displayName}</h4>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-bold border border-red-500/30">
                          Acesso Bloqueado
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono">{u.email}</p>
                      {u.motivoRecusa && (
                        <p className="text-[11px] text-red-400/80 mt-0.5">Motivo: {u.motivoRecusa}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                    <button
                      type="button"
                      onClick={() => handleQuickApprove(u, 'vendedor')}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check size={14} />
                      <span>Reativar / Aprovar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(u.uid, u.displayName)}
                      className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-white/10 transition cursor-pointer"
                      title="Excluir do Firestore"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="px-6 py-3 border-t border-white/5 bg-[#16171f]/60 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Controle Firestore ABAC / RBAC Ativo</span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            Total: {users.length} usuários cadastrados ({pendentes.length} pendentes)
          </span>
        </div>
      </div>

      {/* Permissions & Roles Detailed Drawer / Modal */}
      {selectedUserForPerms && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg max-h-[90vh] flex flex-col bg-gray-900 rounded-2xl shadow-xl overflow-hidden border border-white/10">
            <div className="flex items-center justify-between border-b border-white/10 p-5 bg-[#16171f] shrink-0">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldCheck size={18} className="text-blue-400" />
                  {selectedUserForPerms.statusAprovacao === 'pendente' ? 'Aprovar & Configurar' : 'Permissões de'} {selectedUserForPerms.displayName}
                </h3>
                <p className="text-xs text-slate-400 font-mono">{selectedUserForPerms.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUserForPerms(null)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs">
              {/* Ficha Cadastral do Usuário */}
              <div className="p-3 bg-purple-950/30 border border-purple-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                    <UserCheck size={16} />
                  </div>
                  <div>
                    <h5 className="font-bold text-white text-xs">Dados Cadastrais do Usuário</h5>
                    <p className="text-[11px] text-slate-400">
                      CPF: <span className="font-mono text-purple-300 font-medium">{selectedUserForPerms.cpfCnpj || 'Não cadastrado'}</span> • Tel: <span className="text-white font-medium">{selectedUserForPerms.telefone || 'Não informado'}</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingUserPerfil(selectedUserForPerms)}
                  className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition shadow shrink-0"
                >
                  <UserCheck size={13} />
                  <span>Ver / Alterar Cadastro</span>
                </button>
              </div>

              {/* Role & Commission */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Perfil / Papel *</label>
                  <select
                    value={tempRole}
                    onChange={(e) => {
                      const newRole = e.target.value as RoleUsuario;
                      setTempRole(newRole);
                      setTempPermissoes(getDefaultPermissionsForRole(newRole));
                    }}
                    className="w-full p-2.5 rounded-xl border border-white/10 bg-[#16171f] text-white outline-none focus:border-blue-500 font-medium"
                  >
                    <option value="vendedor">Vendedor (Padrão)</option>
                    <option value="gestor">Gestor de Pátio</option>
                    <option value="operador">Operador de Frota</option>
                    <option value="admin">Administrador Geral</option>
                  </select>
                </div>

                <div className="col-span-2 space-y-2">
                  <label className="block text-slate-300 font-bold text-xs">
                    Modelo de Comissionamento Pré-Fixado (Definido pelo Administrador) *
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTempRegraComissao('vendedor_padrao')}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                        tempRegraComissao === 'vendedor_padrao'
                          ? 'bg-emerald-500/15 border-emerald-500/50 text-white shadow'
                          : 'bg-[#16171f] border-white/10 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div>
                        <span className="block font-bold text-[11px] text-emerald-400">1. Fixo por Carro</span>
                        <span className="text-[10px] text-slate-400">R$ Fixo por veículo vendido</span>
                      </div>
                      {tempRegraComissao === 'vendedor_padrao' && <Check size={14} className="text-emerald-400" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setTempRegraComissao('vendedor_bonus_tac')}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                        tempRegraComissao === 'vendedor_bonus_tac'
                          ? 'bg-blue-500/15 border-blue-500/50 text-white shadow'
                          : 'bg-[#16171f] border-white/10 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div>
                        <span className="block font-bold text-[11px] text-blue-400">2. Fixo + Bônus TAC</span>
                        <span className="text-[10px] text-slate-400">Fixo + % do retorno do banco</span>
                      </div>
                      {tempRegraComissao === 'vendedor_bonus_tac' && <Check size={14} className="text-blue-400" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setTempRegraComissao('admin_gerente')}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                        tempRegraComissao === 'admin_gerente'
                          ? 'bg-purple-500/15 border-purple-500/50 text-white shadow'
                          : 'bg-[#16171f] border-white/10 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div>
                        <span className="block font-bold text-[11px] text-purple-400">3. % do Lucro Bruto</span>
                        <span className="text-[10px] text-slate-400">Margem líquida da venda</span>
                      </div>
                      {tempRegraComissao === 'admin_gerente' && <Check size={14} className="text-purple-400" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setTempRegraComissao('percentual_venda')}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                        tempRegraComissao === 'percentual_venda'
                          ? 'bg-amber-500/15 border-amber-500/50 text-white shadow'
                          : 'bg-[#16171f] border-white/10 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div>
                        <span className="block font-bold text-[11px] text-amber-400">4. % Valor do Carro</span>
                        <span className="text-[10px] text-slate-400">% bruta sobre o valor de venda</span>
                      </div>
                      {tempRegraComissao === 'percentual_venda' && <Check size={14} className="text-amber-400" />}
                    </button>
                  </div>

                  {/* Detalhes e Inputs dos valores da regra */}
                  <div className="p-3 rounded-xl bg-[#16171f] border border-white/10 space-y-2.5">
                    {tempRegraComissao === 'vendedor_padrao' && (
                      <div>
                        <label className="block text-slate-400 text-[11px] font-bold mb-1">
                          Valor Fixo da Comissão (R$ por veículo):
                        </label>
                        <div className="relative">
                          <DollarSign size={13} className="absolute left-3 top-3 text-emerald-400" />
                          <input
                            type="number"
                            step="50"
                            min="0"
                            value={tempComissaoFixo}
                            onChange={(e) => setTempComissaoFixo(Number(e.target.value))}
                            className="w-full pl-9 pr-3 py-2 rounded-xl border border-white/10 bg-[#111116] text-emerald-400 outline-none focus:border-emerald-500 font-mono font-bold text-xs"
                            placeholder="500.00"
                          />
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">
                          Na tela de venda, o vendedor verá exatamente este valor fixo sem opção de alterar.
                        </p>
                      </div>
                    )}

                    {tempRegraComissao === 'vendedor_bonus_tac' && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-slate-400 text-[11px] font-bold mb-1">
                            Valor Fixo Base (R$):
                          </label>
                          <div className="relative">
                            <DollarSign size={13} className="absolute left-3 top-3 text-emerald-400" />
                            <input
                              type="number"
                              step="50"
                              min="0"
                              value={tempComissaoFixo}
                              onChange={(e) => setTempComissaoFixo(Number(e.target.value))}
                              className="w-full pl-9 pr-3 py-2 rounded-xl border border-white/10 bg-[#111116] text-emerald-400 outline-none focus:border-emerald-500 font-mono font-bold text-xs"
                              placeholder="400.00"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-slate-400 text-[11px] font-bold mb-1">
                            + Bônus sobre TAC do Banco (%):
                          </label>
                          <div className="relative">
                            <Percent size={13} className="absolute left-3 top-3 text-blue-400" />
                            <input
                              type="number"
                              step="1"
                              min="0"
                              max="100"
                              value={tempComissaoBonusTac}
                              onChange={(e) => setTempComissaoBonusTac(Number(e.target.value))}
                              className="w-full pl-9 pr-3 py-2 rounded-xl border border-white/10 bg-[#111116] text-blue-400 outline-none focus:border-blue-500 font-mono font-bold text-xs"
                              placeholder="20"
                            />
                          </div>
                        </div>
                        <p className="col-span-2 text-[10px] text-slate-500">
                          Na venda financiada, o vendedor verá o fixo + o percentual da TAC calculado automaticamente.
                        </p>
                      </div>
                    )}

                    {tempRegraComissao === 'admin_gerente' && (
                      <div>
                        <label className="block text-slate-400 text-[11px] font-bold mb-1">
                          Percentual sobre o Lucro Bruto Apurado (%):
                        </label>
                        <div className="relative">
                          <Percent size={13} className="absolute left-3 top-3 text-purple-400" />
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max="100"
                            value={tempComissao}
                            onChange={(e) => setTempComissao(Number(e.target.value))}
                            className="w-full pl-9 pr-3 py-2 rounded-xl border border-white/10 bg-[#111116] text-purple-400 outline-none focus:border-purple-500 font-mono font-bold text-xs"
                            placeholder="10.0"
                          />
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">
                          Calculado sobre (Valor Venda - Custo Compra - Despesas Recondicionamento).
                        </p>
                      </div>
                    )}

                    {tempRegraComissao === 'percentual_venda' && (
                      <div>
                        <label className="block text-slate-400 text-[11px] font-bold mb-1">
                          Percentual sobre o Valor Bruto de Venda do Veículo (%):
                        </label>
                        <div className="relative">
                          <Percent size={13} className="absolute left-3 top-3 text-amber-400" />
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            value={tempComissao}
                            onChange={(e) => setTempComissao(Number(e.target.value))}
                            className="w-full pl-9 pr-3 py-2 rounded-xl border border-white/10 bg-[#111116] text-amber-400 outline-none focus:border-amber-500 font-mono font-bold text-xs"
                            placeholder="1.5"
                          />
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">
                          Ex: 1.5% em um carro de R$ 60.000,00 gerará R$ 900,00 de comissão.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Cargo / Função Descritiva</label>
                <input
                  type="text"
                  value={tempCargo}
                  onChange={(e) => setTempCargo(e.target.value)}
                  placeholder="Ex: Consultor de Vendas, Gerente de Pátio"
                  className="w-full p-2.5 rounded-xl border border-white/10 bg-[#16171f] text-white outline-none focus:border-blue-500"
                />
              </div>

              {/* Granular Permission Toggles Organized by Section */}
              <div className="space-y-4 pt-3 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-300 font-bold text-xs uppercase tracking-wider">
                    Controle de Acesso às Telas da Sidebar & Ações:
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setTempPermissoes(getDefaultPermissionsForRole('admin'))}
                      className="px-2 py-1 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 text-[10px] font-bold transition"
                    >
                      Marcar Todas
                    </button>
                    <button
                      type="button"
                      onClick={() => setTempPermissoes(getDefaultPermissionsForRole('operador'))}
                      className="px-2 py-1 rounded-lg bg-white/5 text-slate-400 hover:bg-white/10 text-[10px] font-bold transition"
                    >
                      Mínimo
                    </button>
                  </div>
                </div>

                {/* Seção 1: Vendas & Estoque */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-blue-400 flex items-center gap-1.5">
                    <Car size={13} /> Telas de Vendas, Estoque & Inteligência Comercial
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <label className="flex items-center justify-between p-2.5 rounded-xl bg-[#16171f] border border-white/5 cursor-pointer hover:border-white/10">
                      <div>
                        <p className="text-xs font-bold text-white">Painel Executivo (CEO)</p>
                        <p className="text-[10px] text-slate-400">Metas globais, DRE e resumo financeiro</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={!!tempPermissoes.verPainelExecutivo}
                        onChange={(e) => setTempPermissoes({ ...tempPermissoes, verPainelExecutivo: e.target.checked })}
                        className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2.5 rounded-xl bg-[#16171f] border border-white/5 cursor-pointer hover:border-white/10">
                      <div>
                        <p className="text-xs font-bold text-white">Painel do Vendedor</p>
                        <p className="text-[10px] text-slate-400">Metas individuais, ranking e comissões próprias</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={!!tempPermissoes.verVendedorDash}
                        onChange={(e) => setTempPermissoes({ ...tempPermissoes, verVendedorDash: e.target.checked })}
                        className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2.5 rounded-xl bg-[#16171f] border border-white/5 cursor-pointer hover:border-white/10">
                      <div>
                        <p className="text-xs font-bold text-white">Catálogo & Showroom</p>
                        <p className="text-[10px] text-slate-400">Ver vitrine, fotos e especificações de venda</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={!!tempPermissoes.verCatalogo}
                        onChange={(e) => setTempPermissoes({ ...tempPermissoes, verCatalogo: e.target.checked })}
                        className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2.5 rounded-xl bg-[#16171f] border border-white/5 cursor-pointer hover:border-white/10">
                      <div>
                        <p className="text-xs font-bold text-white">Estoque de Veículos</p>
                        <p className="text-[10px] text-slate-400">Cadastro de veículos, histórico e status</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={!!tempPermissoes.verEstoque}
                        onChange={(e) => setTempPermissoes({ ...tempPermissoes, verEstoque: e.target.checked })}
                        className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2.5 rounded-xl bg-[#16171f] border border-white/5 cursor-pointer hover:border-white/10">
                      <div>
                        <p className="text-xs font-bold text-white">Comissões & Extrato</p>
                        <p className="text-[10px] text-slate-400">Relatório e histórico de pagamentos de comissão</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={!!tempPermissoes.verComissoes}
                        onChange={(e) => setTempPermissoes({ ...tempPermissoes, verComissoes: e.target.checked })}
                        className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2.5 rounded-xl bg-[#16171f] border border-white/5 cursor-pointer hover:border-white/10">
                      <div>
                        <p className="text-xs font-bold text-white">Logística & Despacho</p>
                        <p className="text-[10px] text-slate-400">Transferências, pátio e movimentações</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={!!tempPermissoes.verLogistica}
                        onChange={(e) => setTempPermissoes({ ...tempPermissoes, verLogistica: e.target.checked })}
                        className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2.5 rounded-xl bg-[#16171f] border border-white/5 cursor-pointer hover:border-white/10">
                      <div>
                        <p className="text-xs font-bold text-white">Oficina & Revisões</p>
                        <p className="text-[10px] text-slate-400">Ordem de serviço, mecânica e peças</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={!!tempPermissoes.verRevisoes}
                        onChange={(e) => setTempPermissoes({ ...tempPermissoes, verRevisoes: e.target.checked })}
                        className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2.5 rounded-xl bg-[#16171f] border border-white/5 cursor-pointer hover:border-white/10">
                      <div>
                        <p className="text-xs font-bold text-white">Fornecedores & Peças</p>
                        <p className="text-[10px] text-slate-400">Rede credenciada e compras</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={!!tempPermissoes.verFornecedores}
                        onChange={(e) => setTempPermissoes({ ...tempPermissoes, verFornecedores: e.target.checked })}
                        className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2.5 rounded-xl bg-[#16171f] border border-white/5 cursor-pointer hover:border-white/10">
                      <div>
                        <p className="text-xs font-bold text-white">Bancos & Financiadoras</p>
                        <p className="text-[10px] text-slate-400">Tabelas de TAC, promotoras e taxas</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={!!tempPermissoes.verBancos}
                        onChange={(e) => setTempPermissoes({ ...tempPermissoes, verBancos: e.target.checked })}
                        className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2.5 rounded-xl bg-[#16171f] border border-white/5 cursor-pointer hover:border-white/10">
                      <div>
                        <p className="text-xs font-bold text-white">Giro & Aging de Estoque</p>
                        <p className="text-[10px] text-slate-400">Tempo de pátio e alertas de carros parados</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={!!tempPermissoes.verAging}
                        onChange={(e) => setTempPermissoes({ ...tempPermissoes, verAging: e.target.checked })}
                        className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2.5 rounded-xl bg-[#16171f] border border-white/5 cursor-pointer hover:border-white/10">
                      <div>
                        <p className="text-xs font-bold text-white">CRM & Funil de Leads</p>
                        <p className="text-[10px] text-slate-400">Contatos de clientes e prospecções</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={!!tempPermissoes.verCrmAnalytics}
                        onChange={(e) => setTempPermissoes({ ...tempPermissoes, verCrmAnalytics: e.target.checked })}
                        className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2.5 rounded-xl bg-[#16171f] border border-white/5 cursor-pointer hover:border-white/10">
                      <div>
                        <p className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                          <Lock size={12} /> DRE Financeiro & Custos Fixos
                        </p>
                        <p className="text-[10px] text-slate-400">Demonstrativo de resultado e faturamento global</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={!!tempPermissoes.verFinanceiroDRE}
                        onChange={(e) => setTempPermissoes({ ...tempPermissoes, verFinanceiroDRE: e.target.checked })}
                        className="w-4 h-4 rounded text-amber-500 accent-amber-500 cursor-pointer"
                      />
                    </label>
                  </div>
                </div>

                {/* Seção 2: Módulo de Locação */}
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                    <Truck size={13} /> Telas do Módulo de Locação para Motoristas de App
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <label className="flex items-center justify-between p-2.5 rounded-xl bg-[#16171f] border border-white/5 cursor-pointer hover:border-white/10">
                      <div>
                        <p className="text-xs font-bold text-white">Contratos & Motoristas</p>
                        <p className="text-[10px] text-slate-400">Gestão de contratos e cobranças semanais</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={!!tempPermissoes.verLocacaoContratos}
                        onChange={(e) => setTempPermissoes({ ...tempPermissoes, verLocacaoContratos: e.target.checked })}
                        className="w-4 h-4 rounded text-emerald-600 accent-emerald-600 cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2.5 rounded-xl bg-[#16171f] border border-white/5 cursor-pointer hover:border-white/10">
                      <div>
                        <p className="text-xs font-bold text-white">Diário de Quilometragem (KM)</p>
                        <p className="text-[10px] text-slate-400">Lançamento diário e monitoramento de rodagem</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={!!tempPermissoes.verLocacaoKm}
                        onChange={(e) => setTempPermissoes({ ...tempPermissoes, verLocacaoKm: e.target.checked })}
                        className="w-4 h-4 rounded text-emerald-600 accent-emerald-600 cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2.5 rounded-xl bg-[#16171f] border border-white/5 cursor-pointer hover:border-white/10">
                      <div>
                        <p className="text-xs font-bold text-white">Manutenção Preventiva de Frota</p>
                        <p className="text-[10px] text-slate-400">Alertas de troca de óleo, freios e pneus por KM</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={!!tempPermissoes.verLocacaoManutencao}
                        onChange={(e) => setTempPermissoes({ ...tempPermissoes, verLocacaoManutencao: e.target.checked })}
                        className="w-4 h-4 rounded text-emerald-600 accent-emerald-600 cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2.5 rounded-xl bg-[#16171f] border border-white/5 cursor-pointer hover:border-white/10">
                      <div>
                        <p className="text-xs font-bold text-white">Débitos, Multas & Sinistros</p>
                        <p className="text-[10px] text-slate-400">Multas e avarias cobradas de motoristas</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={!!tempPermissoes.verLocacaoDebitos}
                        onChange={(e) => setTempPermissoes({ ...tempPermissoes, verLocacaoDebitos: e.target.checked })}
                        className="w-4 h-4 rounded text-emerald-600 accent-emerald-600 cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2.5 rounded-xl bg-[#16171f] border border-white/5 cursor-pointer hover:border-white/10 md:col-span-2">
                      <div>
                        <p className="text-xs font-bold text-white">Conta Caução da Frota</p>
                        <p className="text-[10px] text-slate-400">Depósitos de garantia, retenções e devoluções</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={!!tempPermissoes.verLocacaoCaucao}
                        onChange={(e) => setTempPermissoes({ ...tempPermissoes, verLocacaoCaucao: e.target.checked })}
                        className="w-4 h-4 rounded text-emerald-600 accent-emerald-600 cursor-pointer"
                      />
                    </label>
                  </div>
                </div>

                {/* Seção 3: Telas de Administração & Segurança */}
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <span className="text-[11px] font-bold text-purple-400 flex items-center gap-1.5">
                    <Shield size={13} /> Administração & Configurações Globais
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <label className="flex items-center justify-between p-2.5 rounded-xl bg-[#16171f] border border-white/5 cursor-pointer hover:border-white/10">
                      <div>
                        <p className="text-xs font-bold text-purple-300">Gestão de Usuários & Acessos</p>
                        <p className="text-[10px] text-slate-400">Aprovar equipe, alterar perfis e comissões</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={!!tempPermissoes.gerenciarUsuarios}
                        onChange={(e) => setTempPermissoes({ ...tempPermissoes, gerenciarUsuarios: e.target.checked })}
                        className="w-4 h-4 rounded text-purple-600 accent-purple-600 cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2.5 rounded-xl bg-[#16171f] border border-white/5 cursor-pointer hover:border-white/10">
                      <div>
                        <p className="text-xs font-bold text-purple-300">Backup & Segurança Cloud</p>
                        <p className="text-[10px] text-slate-400">Exportação de dados e segurança do sistema</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={!!tempPermissoes.verBackupSeguranca}
                        onChange={(e) => setTempPermissoes({ ...tempPermissoes, verBackupSeguranca: e.target.checked })}
                        className="w-4 h-4 rounded text-purple-600 accent-purple-600 cursor-pointer"
                      />
                    </label>
                  </div>
                </div>

                {/* Seção 4: Sigilo Comercial & Operações Críticas */}
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5">
                    <Lock size={13} /> Sigilo Comercial & Ações Críticas
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <label className="flex items-center justify-between p-2.5 rounded-xl bg-[#16171f] border border-white/5 cursor-pointer hover:border-white/10">
                      <div>
                        <p className="text-xs font-bold text-white">Efetuar Venda & Dar Baixa no Estoque</p>
                        <p className="text-[10px] text-slate-400">Concluir venda e gerar recibo de venda</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={!!tempPermissoes.venderCarro}
                        onChange={(e) => setTempPermissoes({ ...tempPermissoes, venderCarro: e.target.checked })}
                        className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2.5 rounded-xl bg-[#16171f] border border-white/5 cursor-pointer hover:border-white/10">
                      <div>
                        <p className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                          <Lock size={12} /> Ver Custo de Compra da Loja
                        </p>
                        <p className="text-[10px] text-slate-400">Protege o valor pago no veículo contra vazamentos</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={!!tempPermissoes.verCustosAquisicao}
                        onChange={(e) => setTempPermissoes({ ...tempPermissoes, verCustosAquisicao: e.target.checked })}
                        className="w-4 h-4 rounded text-amber-500 accent-amber-500 cursor-pointer"
                      />
                    </label>
                  </div>
                </div>

                {/* Seção 5: Mais Detalhes & Recursos Especiais (Customização Avançada) */}
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-cyan-400 flex items-center gap-1.5">
                      <Sparkles size={13} /> Mais Detalhes & Recursos Operacionais Especiais
                    </span>
                    <span className="text-[10px] text-cyan-400/80 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 font-semibold">
                      Customizável
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <label className="flex items-center justify-between p-2.5 rounded-xl bg-[#16171f] border border-white/5 cursor-pointer hover:border-white/10">
                      <div>
                        <p className="text-xs font-bold text-white flex items-center gap-1.5">
                          <FileText size={12} className="text-purple-400" /> Gerador de Contrato em PDF (A4)
                        </p>
                        <p className="text-[10px] text-slate-400">Botão no fluxo de venda para emitir contrato formal</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={tempPermissoes.podeGerarContratoVenda !== false}
                        onChange={(e) => setTempPermissoes({ ...tempPermissoes, podeGerarContratoVenda: e.target.checked })}
                        className="w-4 h-4 rounded text-purple-600 accent-purple-600 cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2.5 rounded-xl bg-[#16171f] border border-white/5 cursor-pointer hover:border-white/10">
                      <div>
                        <p className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Compass size={12} className="text-blue-400" /> Controle de Test Drive & Termo
                        </p>
                        <p className="text-[10px] text-slate-400">Registro de CNH e emissão do termo de responsabilidade</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={tempPermissoes.podeRealizarTestDrive !== false}
                        onChange={(e) => setTempPermissoes({ ...tempPermissoes, podeRealizarTestDrive: e.target.checked })}
                        className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2.5 rounded-xl bg-[#16171f] border border-white/5 cursor-pointer hover:border-white/10">
                      <div>
                        <p className="text-xs font-bold text-white flex items-center gap-1.5">
                          <CheckCircle2 size={12} className="text-emerald-400" /> Vistoria Digital de Entrada
                        </p>
                        <p className="text-[10px] text-slate-400">Checklist rápido de pintura, pneus, motor e laudo</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={tempPermissoes.podeFazerVistoria !== false}
                        onChange={(e) => setTempPermissoes({ ...tempPermissoes, podeFazerVistoria: e.target.checked })}
                        className="w-4 h-4 rounded text-emerald-600 accent-emerald-600 cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2.5 rounded-xl bg-[#16171f] border border-white/5 cursor-pointer hover:border-white/10">
                      <div>
                        <p className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Wrench size={12} className="text-orange-400" /> Ver Funil de Preparação (Kanban)
                        </p>
                        <p className="text-[10px] text-slate-400">Visualizar colunas: Oficina, Funilaria, Estética e Pátio</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={tempPermissoes.verFunilPreparacao !== false}
                        onChange={(e) => setTempPermissoes({ ...tempPermissoes, verFunilPreparacao: e.target.checked })}
                        className="w-4 h-4 rounded text-orange-600 accent-orange-600 cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2.5 rounded-xl bg-[#16171f] border border-white/5 cursor-pointer hover:border-white/10 md:col-span-2">
                      <div>
                        <p className="text-xs font-bold text-white flex items-center gap-1.5">
                          <SlidersHorizontal size={12} className="text-orange-400" /> Gerenciar Etapas do Funil de Preparação
                        </p>
                        <p className="text-[10px] text-slate-400">Permissão para arrastar e mover veículos entre as oficinas no Kanban</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={tempPermissoes.gerenciarFunilPreparacao !== false}
                        onChange={(e) => setTempPermissoes({ ...tempPermissoes, gerenciarFunilPreparacao: e.target.checked })}
                        className="w-4 h-4 rounded text-orange-600 accent-orange-600 cursor-pointer"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="p-4 sm:p-5 bg-[#16171f] border-t border-white/10 flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedUserForPerms(null)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white bg-white/5 text-xs font-bold transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSavePerms}
                className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSaving ? 'Salvando...' : selectedUserForPerms.statusAprovacao === 'pendente' ? 'Salvar & Aprovar Acesso' : 'Salvar Permissões'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para o Administrador Visualizar e Alterar Dados Cadastrais do Usuário */}
      {editingUserPerfil && (
        <ModalMeuPerfil
          isOpen={!!editingUserPerfil}
          onClose={() => setEditingUserPerfil(null)}
          currentUser={currentUser}
          targetUser={editingUserPerfil}
          onSaveSuccess={(updated) => {
            setUsers((prev) =>
              prev.map((usr) => (usr.uid === updated.uid ? { ...usr, ...updated } : usr))
            );
            if (selectedUserForPerms?.uid === updated.uid) {
              setSelectedUserForPerms((prev) => (prev ? { ...prev, ...updated } : null));
            }
            setEditingUserPerfil(null);
            showFeedback(`Dados cadastrais de ${updated.displayName} salvos com sucesso!`);
          }}
        />
      )}
    </div>
  );
};
