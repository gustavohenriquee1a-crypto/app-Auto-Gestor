import React, { useState } from 'react';
import {
  Car,
  ShieldCheck,
  Users,
  Database,
  Lock,
  ArrowRight,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  KeyRound,
  Mail,
  UserPlus,
  LogIn,
  Phone,
  Briefcase,
  User,
} from 'lucide-react';
import { loginWithGoogle, loginWithEmail, registerWithEmail } from '../services/authService';
import { RoleUsuario } from '../types';

interface LoginScreenProps {
  onLoginSuccess?: () => void;
  onSimulateUser?: (email: string, name: string, role: RoleUsuario) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, onSimulateUser }) => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [desiredRole, setDesiredRole] = useState<RoleUsuario>('vendedor');

  // Handle Google Login
  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      await loginWithGoogle();
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (err: any) {
      console.error('Google login error:', err);
      setError(err?.message || 'Falha ao autenticar com o Google. Experimente o cadastro com E-mail abaixo.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Email Form Submit (Login or Register)
  const handleSubmitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (authMode === 'register') {
        if (!nome.trim() || !email.trim() || !password.trim()) {
          throw new Error('Preencha todos os campos obrigatórios (Nome, E-mail e Senha).');
        }
        await registerWithEmail(nome, email, password, desiredRole, telefone);
        setSuccessMsg('Cadastro realizado com sucesso! Aguarde a aprovação do administrador.');
      } else {
        if (!email.trim() || !password.trim()) {
          throw new Error('Informe seu e-mail e senha.');
        }
        await loginWithEmail(email, password);
      }

      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (err: any) {
      setError(err?.message || 'Erro ao processar solicitação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 relative overflow-y-auto">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center z-10 py-6 my-auto">
        {/* Left Column: Brand & System Features */}
        <div className="lg:col-span-6 space-y-6 text-left">
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
            <ShieldCheck size={16} className="text-blue-400" />
            <span>Sistema Corporativo com Aprovação de Usuários</span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 shrink-0">
                <Car size={26} />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
                  TROCA FÁCIL <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-slate-300 font-mono font-medium">PRO</span>
                </h1>
                <p className="text-xs text-slate-400">Autos e Repasse • Gestão de Estoque e Vendas</p>
              </div>
            </div>

            <p className="text-slate-300 text-sm leading-relaxed pt-1">
              Plataforma com gestão de permissões por perfil, showroom para vendedores com baixa imediata de veículos e cálculo automático de comissões.
            </p>
          </div>

          {/* Feature Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3 rounded-2xl bg-[#111116] border border-white/5 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                <Users size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Aprovação de Equipe</h4>
                <p className="text-[11px] text-slate-400">O Administrador aprova cadastros e limita acessos.</p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-[#111116] border border-white/5 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
                <Sparkles size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Catálogo do Vendedor</h4>
                <p className="text-[11px] text-slate-400">Vendedores dão baixa na venda direto do celular.</p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-[#111116] border border-white/5 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                <TrendingUp size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Comissões em Tempo Real</h4>
                <p className="text-[11px] text-slate-400">Controle de quem vendeu e comissão devida.</p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-[#111116] border border-white/5 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                <Lock size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Custos Ocultos</h4>
                <p className="text-[11px] text-slate-400">Preço de custo da loja protegido por permissão.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Login / Register Box */}
        <div className="lg:col-span-6 w-full">
          <div className="bg-[#111116] border border-white/10 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden backdrop-blur-md">
            {/* Tab switch */}
            <div className="flex bg-[#16171f] p-1 rounded-2xl mb-5 border border-white/5">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setError(null);
                  setSuccessMsg(null);
                }}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  authMode === 'login'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LogIn size={14} /> Entrar na Conta
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  setError(null);
                  setSuccessMsg(null);
                }}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  authMode === 'register'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <UserPlus size={14} /> Solicitar Cadastro
              </button>
            </div>

            {/* Google Fast Sign-in */}
            <div className="space-y-3 mb-4">
              <button
                id="btn-google-login"
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs flex items-center justify-center gap-2.5 transition shadow hover:shadow-md active:scale-[0.99] disabled:opacity-60 cursor-pointer"
              >
                {/* Google SVG Icon */}
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.97 0 12s.45 3.84 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>{authMode === 'login' ? 'Entrar com Conta Google' : 'Cadastrar com Conta Google'}</span>
              </button>

              <div className="flex items-center gap-2 my-2">
                <div className="h-px bg-white/10 flex-1" />
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">ou com e-mail e senha</span>
                <div className="h-px bg-white/10 flex-1" />
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2">
                <AlertCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2">
                <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Email Form */}
            <form onSubmit={handleSubmitEmail} className="space-y-3 text-xs">
              {authMode === 'register' && (
                <>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Nome Completo *</label>
                    <div className="relative">
                      <User size={14} className="absolute left-3 top-3 text-slate-500" />
                      <input
                        type="text"
                        required
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        placeholder="Ex: João Vendedor"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-white/10 bg-[#16171f] text-white outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">Função / Cargo *</label>
                      <select
                        value={desiredRole}
                        onChange={(e) => setDesiredRole(e.target.value as RoleUsuario)}
                        className="w-full p-2.5 rounded-xl border border-white/10 bg-[#16171f] text-white outline-none focus:border-blue-500 font-medium"
                      >
                        <option value="vendedor">Vendedor de Estoque</option>
                        <option value="gestor">Gestor de Pátio</option>
                        <option value="operador">Operador de Frota</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-bold mb-1">WhatsApp / Tel</label>
                      <div className="relative">
                        <Phone size={14} className="absolute left-3 top-3 text-slate-500" />
                        <input
                          type="text"
                          value={telefone}
                          onChange={(e) => setTelefone(e.target.value)}
                          placeholder="(11) 99999-9999"
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-white/10 bg-[#16171f] text-white outline-none focus:border-blue-500 font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-slate-300 font-bold mb-1">E-mail *</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-3 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@empresa.com"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-white/10 bg-[#16171f] text-white outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Senha *</label>
                <div className="relative">
                  <KeyRound size={14} className="absolute left-3 top-3 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-white/10 bg-[#16171f] text-white outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition cursor-pointer mt-4"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : authMode === 'register' ? (
                  <>
                    <UserPlus size={15} /> Cadastrar e Solicitar Aprovação
                  </>
                ) : (
                  <>
                    <LogIn size={15} /> Acessar Sistema
                  </>
                )}
              </button>
            </form>

            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
              <span>Aprovação manual de novos membros</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <ShieldCheck size={12} /> RBAC Ativo
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
