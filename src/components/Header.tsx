import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Plus, 
  Download, 
  Calendar as CalendarIcon, 
  CheckCircle2,
  Users,
  User,
  LogOut,
  ChevronDown,
  Shield,
  Sparkles,
  Award,
  Upload,
  Image as ImageIcon,
  Check
} from 'lucide-react';
import { formatDate } from '../utils/formatters';
import { Usuario } from '../types';
import { subscribeConfiguracoesLoja, saveConfiguracaoLojaFirestore, getConfiguracaoLojaFirestore } from '../services/firestoreService';

interface HeaderProps {
  title: string;
  subtitle?: string;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onOpenNovoLancamento: () => void;
  alertCounts: {
    aging: number;
    pagamento: number;
    revisao: number;
  };
  onSelectTab?: (tab: string) => void;
  currentUser?: Usuario | null;
  onOpenUsuarios?: () => void;
  onOpenMeuPerfil?: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  searchTerm,
  setSearchTerm,
  onOpenNovoLancamento,
  alertCounts,
  onSelectTab,
  currentUser,
  onOpenUsuarios,
  onOpenMeuPerfil,
  onLogout,
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [storeLogo, setStoreLogo] = useState<string>('');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = currentUser?.role === 'admin';
  const isVendedor = currentUser?.role === 'vendedor';

  // Subscrição em tempo real ao documento global 'configuracoes_loja/geral'
  useEffect(() => {
    const unsubscribe = subscribeConfiguracoesLoja((config) => {
      if (config && config.logoUrl !== undefined) {
        setStoreLogo(config.logoUrl || '');
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isAdmin) {
      alert('Apenas usuários com perfil Administrador podem alterar o logotipo oficial da loja.');
      return;
    }

    if (file.size > 2.5 * 1024 * 1024) {
      alert('A imagem do logotipo deve ter no máximo 2.5MB para rápida sincronização em nuvem.');
      return;
    }

    try {
      setIsUploadingLogo(true);
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Url = event.target?.result as string;
        if (base64Url) {
          await saveConfiguracaoLojaFirestore({ logoUrl: base64Url });
          setStoreLogo(base64Url);
        }
        setIsUploadingLogo(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Erro ao atualizar logotipo da loja:', err);
      alert('Falha ao sincronizar o novo logotipo da loja com o Firestore.');
      setIsUploadingLogo(false);
    }
  };

  const todayFormatted = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date());

  return (
    <header id="main-header" className="bg-[#0d0e12]/95 border-b border-white/5 px-4 sm:px-6 lg:px-8 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 sticky top-0 z-20 backdrop-blur-md shrink-0">
      <div className="min-w-0 flex-1 flex items-center gap-3.5">
        {/* Logotipo Oficial da Loja (Global do Firestore) */}
        <div className="relative group shrink-0">
          {storeLogo ? (
            <div className="relative">
              <img
                src={storeLogo}
                alt="Logotipo Oficial da Loja"
                className="h-10 w-auto max-w-[130px] object-contain rounded-xl border border-white/10 p-1 bg-white/5 hover:border-blue-500/40 transition shadow-xs"
              />
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Admin: Atualizar logotipo oficial da loja para todos os usuários"
                  className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-xl text-white text-[10px] font-bold transition cursor-pointer gap-1 backdrop-blur-xs"
                >
                  <Upload size={12} />
                  <span>Trocar</span>
                </button>
              )}
            </div>
          ) : (
            isAdmin ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Admin: Enviar logotipo global da loja (sincronizado para contratos e usuários)"
                className="h-10 px-2.5 rounded-xl border border-dashed border-white/20 hover:border-blue-500/60 bg-white/5 hover:bg-blue-500/10 text-slate-400 hover:text-blue-300 text-[11px] font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <ImageIcon size={14} className="text-blue-400" />
                <span className="hidden sm:inline">+ Logo Loja</span>
              </button>
            ) : null
          )}
          {isAdmin && (
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoUpload}
            />
          )}
        </div>

        <div className="min-w-0">
          <h1 className="text-base sm:text-lg lg:text-xl font-bold text-white tracking-tight truncate">
            {title}
          </h1>
          {subtitle ? (
            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{subtitle}</p>
          ) : (
            <p className="text-xs text-slate-400 capitalize mt-0.5 flex items-center gap-1.5">
              <CalendarIcon size={13} className="text-slate-400 shrink-0" />
              <span className="truncate">{todayFormatted}</span>
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-start md:justify-end">
        {/* Cloud Sync Status */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>Nuvem Firestore</span>
        </div>

        {/* Global Search Bar */}
        <div className="relative w-full sm:w-56 md:w-60 lg:w-72">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          <input
            id="input-global-search"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar Placa, Chassi ou Modelo..."
            className="pl-9 pr-4 py-2 w-full text-xs rounded-xl border border-white/10 bg-[#14151c] hover:border-white/20 focus:border-blue-500/60 focus:bg-[#181924] focus:ring-2 focus:ring-blue-500/20 outline-none transition font-medium placeholder:text-slate-400 text-slate-100"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-slate-200 bg-white/10 rounded-full w-4 h-4 flex items-center justify-center cursor-pointer"
            >
              ×
            </button>
          )}
        </div>

        {/* Primary Action Button (Oculto para Vendedores) */}
        {!isVendedor && (
          <button
            id="header-btn-novo-lancamento"
            onClick={onOpenNovoLancamento}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 transition duration-150 cursor-pointer"
          >
            <Plus size={16} />
            <span>Novo Lançamento</span>
          </button>
        )}

        {/* User Profile Header Dropdown */}
        {currentUser && (
          <div className="relative">
            <button
              id="header-btn-user-profile"
              type="button"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 p-1.5 rounded-xl bg-[#14151c] hover:bg-[#1a1b24] border border-white/10 transition cursor-pointer"
            >
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName}
                  referrerPolicy="no-referrer"
                  className="w-7 h-7 rounded-lg object-cover border border-white/10"
                />
              ) : (
                <div className="w-7 h-7 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-xs">
                  {currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
              <span className="text-xs font-semibold text-slate-200 hidden md:inline truncate max-w-[100px]">
                {currentUser.displayName.split(' ')[0]}
              </span>
              <ChevronDown size={14} className="text-slate-400" />
            </button>

            {showProfileMenu && (
              <div
                className="absolute right-0 mt-2 w-56 bg-[#16171f] border border-white/10 rounded-2xl shadow-2xl p-2 z-30 animate-in fade-in zoom-in-95 duration-150"
                onMouseLeave={() => setShowProfileMenu(false)}
              >
                <div className="p-2 border-b border-white/5 mb-1">
                  <p className="text-xs font-bold text-white truncate">{currentUser.displayName}</p>
                  <p className="text-[11px] text-slate-400 truncate">{currentUser.email}</p>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/20 text-blue-300 capitalize">
                      {currentUser.role}
                    </span>
                    {currentUser.comissaoPadraoPercent && (
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 font-mono">
                        {currentUser.comissaoPadraoPercent}% comissão
                      </span>
                    )}
                  </div>
                </div>

                {onOpenMeuPerfil && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      onOpenMeuPerfil();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition cursor-pointer"
                  >
                    <User size={15} className="text-purple-400" />
                    <span>Meu Perfil & RH</span>
                  </button>
                )}

                {currentUser.permissoes?.gerenciarUsuarios !== false && onOpenUsuarios && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      onOpenUsuarios();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition cursor-pointer"
                  >
                    <Users size={15} className="text-blue-400" />
                    <span>Gestão de Usuários</span>
                  </button>
                )}

                {onLogout && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-rose-300 hover:text-rose-200 hover:bg-rose-500/10 rounded-xl transition cursor-pointer"
                  >
                    <LogOut size={15} className="text-rose-400" />
                    <span>Sair da Conta</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
