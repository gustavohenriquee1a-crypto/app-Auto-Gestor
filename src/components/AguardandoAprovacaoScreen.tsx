import React from 'react';
import { Clock, ShieldAlert, CheckCircle, LogOut, RefreshCw, Car, UserCheck, MessageSquare } from 'lucide-react';
import { Usuario } from '../types';
import { logoutUser } from '../services/authService';

interface AguardandoAprovacaoScreenProps {
  user: Usuario;
  onRefresh?: () => void;
}

export const AguardandoAprovacaoScreen: React.FC<AguardandoAprovacaoScreenProps> = ({
  user,
  onRefresh,
}) => {
  const isRecusado = user.statusAprovacao === 'recusado' || user.ativo === false;

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-amber-500/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-md w-full bg-[#111116] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 text-center space-y-6">
        {/* Top Icon */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-[#16171f] border border-white/10 flex items-center justify-center relative shadow-inner">
          {isRecusado ? (
            <ShieldAlert size={32} className="text-red-400 animate-pulse" />
          ) : (
            <Clock size={32} className="text-amber-400 animate-pulse" />
          )}
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px]">
            <Car size={12} />
          </div>
        </div>

        {/* Header */}
        <div className="space-y-1.5">
          <span
            className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
              isRecusado
                ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
            }`}
          >
            {isRecusado ? 'Acesso Não Autorizado' : 'Cadastro em Análise'}
          </span>
          <h2 className="text-xl font-black text-white">
            {isRecusado ? 'Acesso Recusado ou Bloqueado' : 'Aguardando Aprovação do Administrador'}
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            {isRecusado
              ? 'Seu cadastro foi desativado ou recusado pela administração do sistema.'
              : 'Seu cadastro foi recebido com sucesso no banco de dados. O Administrador precisa autorizar seu acesso e definir suas permissões.'}
          </p>
        </div>

        {/* User Card */}
        <div className="p-4 rounded-2xl bg-[#16171f] border border-white/5 text-left space-y-3">
          <div className="flex items-center gap-3">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName}
                className="w-11 h-11 rounded-xl object-cover border border-white/10"
              />
            ) : (
              <div className="w-11 h-11 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center font-bold text-sm">
                {user.displayName?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">{user.displayName}</p>
              <p className="text-[11px] text-slate-400 font-mono truncate">{user.email}</p>
              <span className="inline-block mt-0.5 text-[10px] font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
                Função solicitada: {user.cargo || user.role}
              </span>
            </div>
          </div>

          <div className="pt-2.5 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
            <span>Status no Firestore:</span>
            <span className="font-mono font-bold text-amber-400 uppercase text-[10px] bg-amber-400/10 px-2 py-0.5 rounded">
              {user.statusAprovacao}
            </span>
          </div>
        </div>

        {/* Instructions */}
        <div className="p-3.5 rounded-xl bg-blue-500/5 border border-blue-500/10 text-[11px] text-slate-300 text-left flex items-start gap-2.5">
          <UserCheck size={16} className="text-blue-400 shrink-0 mt-0.5" />
          <p>
            Assim que o Administrador aprovar seu usuário no painel de gestão, esta tela será liberada em tempo real automaticamente.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5 pt-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex items-center justify-center gap-2 transition"
            >
              <RefreshCw size={14} /> Verificar Atualização
            </button>
          )}

          <button
            onClick={() => logoutUser()}
            className="w-full py-2.5 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-bold text-xs flex items-center justify-center gap-2 transition"
          >
            <LogOut size={14} /> Sair da Conta
          </button>
        </div>
      </div>
    </div>
  );
};
