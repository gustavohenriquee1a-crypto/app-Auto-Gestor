import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  MapPin,
  CreditCard,
  Briefcase,
  ShieldCheck,
  Lock,
  Save,
  CheckCircle2,
  AlertCircle,
  Building2,
  Calendar,
  DollarSign,
  Percent,
  Search,
  Loader2,
  FileText,
  BadgeCheck,
  Clock,
  Sparkles
} from 'lucide-react';
import { Usuario } from '../types';
import { updateUserProfileFirestore } from '../services/authService';
import { formatCurrency } from '../utils/formatters';

interface ModalMeuPerfilProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: Usuario | null;
  targetUser?: Usuario | null; // Se admin estiver editando outro colaborador
  onSaveSuccess?: (updatedUser: Usuario) => void;
}

type TabPerfil = 'pessoais' | 'endereco' | 'bancarios' | 'contratuais';

export const ModalMeuPerfil: React.FC<ModalMeuPerfilProps> = ({
  isOpen,
  onClose,
  currentUser,
  targetUser,
  onSaveSuccess,
}) => {
  // O usuário que está sendo editado (pode ser o próprio currentUser ou targetUser caso passado por um admin)
  const user = targetUser || currentUser;
  const isAdmin = currentUser?.role === 'admin';
  const isEditingOtherUser = !!targetUser && targetUser.uid !== currentUser?.uid;

  const [activeTab, setActiveTab] = useState<TabPerfil>('pessoais');
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSearchingCep, setIsSearchingCep] = useState(false);

  // Form State: 1. Dados Pessoais & Documentos
  const [displayName, setDisplayName] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cargo, setCargo] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [rg, setRg] = useState('');
  const [orgaoEmissor, setOrgaoEmissor] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [estadoCivil, setEstadoCivil] = useState('Solteiro(a)');

  // Form State: 2. Endereço
  const [cep, setCep] = useState('');
  const [logradouro, setLogradouro] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [uf, setUf] = useState('');

  // Form State: 3. Dados Bancários
  const [banco, setBanco] = useState('');
  const [agencia, setAgencia] = useState('');
  const [conta, setConta] = useState('');
  const [tipoConta, setTipoConta] = useState('Corrente');
  const [tipoChavePix, setTipoChavePix] = useState('CPF');
  const [chavePix, setChavePix] = useState('');
  const [titular, setTitular] = useState('');

  // Form State: 4. Dados Contratuais (RBAC: Admin can edit, others read-only)
  const [tipoVinculo, setTipoVinculo] = useState<
    'Autônomo / Comissionista Puro' | 'PJ / Prestador' | 'CLT / Funcionário' | 'Sócio / Parceiro'
  >('Autônomo / Comissionista Puro');
  const [dataAdmissao, setDataAdmissao] = useState('');
  const [salarioBaseFixo, setSalarioBaseFixo] = useState<number | string>('');
  const [encargosTrabalhistasEstimados, setEncargosTrabalhistasEstimados] = useState<number | string>('');
  const [percentualParticipacaoLucros, setPercentualParticipacaoLucros] = useState<number | string>('');
  const [observacoesContrato, setObservacoesContrato] = useState('');

  // Initialize form state when user changes or modal opens
  useEffect(() => {
    if (user && isOpen) {
      setDisplayName(user.displayName || '');
      setTelefone(user.telefone || '');
      setCargo(user.cargo || '');
      setCpfCnpj(user.cpfCnpj || '');
      setRg(user.rg || '');
      setOrgaoEmissor(user.orgaoEmissor || '');
      setDataNascimento(user.dataNascimento || '');
      setEstadoCivil(user.estadoCivil || 'Solteiro(a)');

      // Endereço
      setCep(user.enderecoCompleto?.cep || '');
      setLogradouro(user.enderecoCompleto?.logradouro || '');
      setNumero(user.enderecoCompleto?.numero || '');
      setComplemento(user.enderecoCompleto?.complemento || '');
      setBairro(user.enderecoCompleto?.bairro || '');
      setCidade(user.enderecoCompleto?.cidade || '');
      setUf(user.enderecoCompleto?.uf || '');

      // Bancários
      setBanco(user.dadosBancarios?.banco || '');
      setAgencia(user.dadosBancarios?.agencia || '');
      setConta(user.dadosBancarios?.conta || '');
      setTipoConta(user.dadosBancarios?.tipoConta || 'Corrente');
      setTipoChavePix(user.dadosBancarios?.tipoChavePix || 'CPF');
      setChavePix(user.dadosBancarios?.chavePix || '');
      setTitular(user.dadosBancarios?.titular || user.displayName || '');

      // Contratuais
      setTipoVinculo(user.dadosContratuais?.tipoVinculo || 'Autônomo / Comissionista Puro');
      setDataAdmissao(user.dadosContratuais?.dataAdmissao || '');
      setSalarioBaseFixo(user.dadosContratuais?.salarioBaseFixo !== undefined ? user.dadosContratuais.salarioBaseFixo : '');
      setEncargosTrabalhistasEstimados(
        user.dadosContratuais?.encargosTrabalhistasEstimados !== undefined
          ? user.dadosContratuais.encargosTrabalhistasEstimados
          : ''
      );
      setPercentualParticipacaoLucros(
        user.dadosContratuais?.percentualParticipacaoLucros !== undefined
          ? user.dadosContratuais.percentualParticipacaoLucros
          : ''
      );
      setObservacoesContrato(user.dadosContratuais?.observacoesContrato || '');

      setSuccessMessage(null);
      setErrorMessage(null);
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  // Busca rápida de CEP no serviço público ViaCEP
  const handleBuscarCep = async () => {
    const limpo = cep.replace(/\D/g, '');
    if (limpo.length !== 8) {
      setErrorMessage('Digite um CEP válido com 8 dígitos.');
      return;
    }

    setIsSearchingCep(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${limpo}/json/`);
      const data = await res.json();
      if (data.erro) {
        setErrorMessage('CEP não encontrado.');
      } else {
        setLogradouro(data.logradouro || '');
        setBairro(data.bairro || '');
        setCidade(data.localidade || '');
        setUf(data.uf || '');
      }
    } catch {
      setErrorMessage('Falha ao consultar o CEP. Preencha manualmente os campos.');
    } finally {
      setIsSearchingCep(false);
    }
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const updatedData: Partial<Usuario> = {
        displayName: displayName.trim() || user.displayName,
        telefone: telefone.trim() || undefined,
        cargo: cargo.trim() || undefined,
        cpfCnpj: cpfCnpj.trim() || undefined,
        rg: rg.trim() || undefined,
        orgaoEmissor: orgaoEmissor.trim() || undefined,
        dataNascimento: dataNascimento || undefined,
        estadoCivil: estadoCivil || undefined,

        enderecoCompleto: {
          cep: cep.trim() || undefined,
          logradouro: logradouro.trim() || undefined,
          numero: numero.trim() || undefined,
          complemento: complemento.trim() || undefined,
          bairro: bairro.trim() || undefined,
          cidade: cidade.trim() || undefined,
          uf: uf.trim().toUpperCase() || undefined,
        },

        dadosBancarios: {
          banco: banco.trim() || undefined,
          agencia: agencia.trim() || undefined,
          conta: conta.trim() || undefined,
          tipoConta: tipoConta || 'Corrente',
          tipoChavePix: tipoChavePix || undefined,
          chavePix: chavePix.trim() || undefined,
          titular: titular.trim() || displayName.trim() || user.displayName,
        },
      };

      // RBAC: Somente ADMIN pode atualizar dados contratuais e remuneração
      if (isAdmin) {
        updatedData.dadosContratuais = {
          tipoVinculo,
          dataAdmissao: dataAdmissao || undefined,
          salarioBaseFixo: salarioBaseFixo !== '' ? Number(salarioBaseFixo) : 0,
          encargosTrabalhistasEstimados:
            encargosTrabalhistasEstimados !== '' ? Number(encargosTrabalhistasEstimados) : 0,
          percentualParticipacaoLucros:
            percentualParticipacaoLucros !== '' ? Number(percentualParticipacaoLucros) : 0,
          observacoesContrato: observacoesContrato.trim() || undefined,
        };
      }

      await updateUserProfileFirestore(user.uid, updatedData);

      const fullMergedUser: Usuario = {
        ...user,
        ...updatedData,
        enderecoCompleto: updatedData.enderecoCompleto,
        dadosBancarios: updatedData.dadosBancarios,
        dadosContratuais: updatedData.dadosContratuais || user.dadosContratuais,
      };

      setSuccessMessage('Dados atualizados com sucesso no sistema!');
      if (onSaveSuccess) {
        onSaveSuccess(fullMergedUser);
      }

      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err: any) {
      console.error('Erro ao atualizar perfil do usuário:', err);
      setErrorMessage(err?.message || 'Erro ao persistir dados no Firestore.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-[#0e0f14] border border-white/10 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Header do Modal */}
        <div className="flex items-center justify-between p-5 border-b border-white/5 bg-[#12131a]">
          <div className="flex items-center gap-3">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName}
                referrerPolicy="no-referrer"
                className="w-11 h-11 rounded-2xl object-cover border border-white/10 shrink-0"
              />
            ) : (
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black flex items-center justify-center text-base shrink-0 shadow-md shadow-blue-500/20">
                {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white leading-snug">
                  {isEditingOtherUser ? `Perfil de ${user.displayName}` : 'Meu Perfil & Gestão de RH'}
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/25">
                  {user.role}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {user.email} • {user.cargo || 'Membro da Equipe'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
            title="Fechar modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Abas de Navegação */}
        <div className="flex border-b border-white/5 bg-[#14151e] px-4 pt-2 gap-1 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('pessoais')}
            className={`px-3.5 py-2.5 rounded-t-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'pessoais'
                ? 'bg-[#0e0f14] text-blue-400 border-t-2 border-blue-500 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
            }`}
          >
            <User size={14} />
            <span>Dados Pessoais & Documentos</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('endereco')}
            className={`px-3.5 py-2.5 rounded-t-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'endereco'
                ? 'bg-[#0e0f14] text-emerald-400 border-t-2 border-emerald-500 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
            }`}
          >
            <MapPin size={14} />
            <span>Endereço</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('bancarios')}
            className={`px-3.5 py-2.5 rounded-t-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'bancarios'
                ? 'bg-[#0e0f14] text-purple-400 border-t-2 border-purple-500 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
            }`}
          >
            <CreditCard size={14} />
            <span>Dados Bancários (PIX)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('contratuais')}
            className={`px-3.5 py-2.5 rounded-t-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'contratuais'
                ? 'bg-[#0e0f14] text-amber-400 border-t-2 border-amber-500 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
            }`}
          >
            <Briefcase size={14} />
            <div className="flex items-center gap-1.5">
              <span>Dados Contratuais & Remuneração</span>
              {!isAdmin && <Lock size={12} className="text-amber-400/80" />}
            </div>
          </button>
        </div>

        {/* Notificações de Sucesso ou Erro */}
        {successMessage && (
          <div className="mx-6 mt-4 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-semibold flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Conteúdo do Formulário */}
        <form onSubmit={handleSalvar} className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* ================= ABA 1: DADOS PESSOAIS & DOCUMENTOS ================= */}
          {activeTab === 'pessoais' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-[#14151e] p-4 rounded-2xl border border-white/5 space-y-4">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-blue-400 flex items-center gap-2">
                  <User size={15} /> Identificação Principal
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Nome Completo <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full bg-[#0e0f14] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      E-mail de Acesso (Login)
                    </label>
                    <input
                      type="email"
                      disabled
                      value={user.email}
                      className="w-full bg-[#1b1c26]/60 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-slate-400 cursor-not-allowed outline-none"
                      title="O e-mail é vinculado à sua conta de autenticação e não pode ser alterado diretamente."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Cargo / Função na Loja
                    </label>
                    <input
                      type="text"
                      value={cargo}
                      onChange={(e) => setCargo(e.target.value)}
                      placeholder="Ex: Consultor de Vendas, Gerente Comercial, Sócio Diretor"
                      className="w-full bg-[#0e0f14] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Telefone / WhatsApp de Contato
                    </label>
                    <input
                      type="text"
                      value={telefone}
                      onChange={(e) => setTelefone(e.target.value)}
                      placeholder="(11) 98765-4321"
                      className="w-full bg-[#0e0f14] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-[#14151e] p-4 rounded-2xl border border-white/5 space-y-4">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <FileText size={15} className="text-blue-400" /> Documentação Pessoal & Estado Civil
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      CPF ou CNPJ
                    </label>
                    <input
                      type="text"
                      value={cpfCnpj}
                      onChange={(e) => setCpfCnpj(e.target.value)}
                      placeholder="000.000.000-00"
                      className="w-full bg-[#0e0f14] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      RG / Registro Geral
                    </label>
                    <input
                      type="text"
                      value={rg}
                      onChange={(e) => setRg(e.target.value)}
                      placeholder="00.000.000-0"
                      className="w-full bg-[#0e0f14] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Órgão Emissor / UF
                    </label>
                    <input
                      type="text"
                      value={orgaoEmissor}
                      onChange={(e) => setOrgaoEmissor(e.target.value)}
                      placeholder="SSP/SP, DETRAN, etc."
                      className="w-full bg-[#0e0f14] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 outline-none uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Data de Nascimento
                    </label>
                    <input
                      type="date"
                      value={dataNascimento}
                      onChange={(e) => setDataNascimento(e.target.value)}
                      className="w-full bg-[#0e0f14] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Estado Civil
                    </label>
                    <select
                      value={estadoCivil}
                      onChange={(e) => setEstadoCivil(e.target.value)}
                      className="w-full bg-[#0e0f14] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-blue-500 outline-none"
                    >
                      <option value="Solteiro(a)">Solteiro(a)</option>
                      <option value="Casado(a)">Casado(a)</option>
                      <option value="União Estável">União Estável</option>
                      <option value="Divorciado(a)">Divorciado(a)</option>
                      <option value="Viúvo(a)">Viúvo(a)</option>
                      <option value="Separado(a) Judicialmente">Separado(a) Judicialmente</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= ABA 2: ENDEREÇO ================= */}
          {activeTab === 'endereco' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-[#14151e] p-4 rounded-2xl border border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                    <MapPin size={15} /> Endereço Residencial Completo
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Utilizado para contratos, recibos e RH
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* CEP com Busca */}
                  <div className="sm:col-span-1">
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      CEP
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={cep}
                        onChange={(e) => setCep(e.target.value)}
                        placeholder="00000-000"
                        className="w-full bg-[#0e0f14] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white font-mono focus:border-emerald-500 outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleBuscarCep}
                        disabled={isSearchingCep}
                        className="px-3 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 font-bold text-xs flex items-center gap-1 transition shrink-0 cursor-pointer"
                        title="Buscar endereço pelo CEP"
                      >
                        {isSearchingCep ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Logradouro */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Logradouro (Rua, Avenida, etc.)
                    </label>
                    <input
                      type="text"
                      value={logradouro}
                      onChange={(e) => setLogradouro(e.target.value)}
                      placeholder="Ex: Av. Paulista, Rua das Flores"
                      className="w-full bg-[#0e0f14] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-emerald-500 outline-none"
                    />
                  </div>

                  {/* Número */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Número
                    </label>
                    <input
                      type="text"
                      value={numero}
                      onChange={(e) => setNumero(e.target.value)}
                      placeholder="123 ou S/N"
                      className="w-full bg-[#0e0f14] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-emerald-500 outline-none"
                    />
                  </div>

                  {/* Complemento */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Complemento
                    </label>
                    <input
                      type="text"
                      value={complemento}
                      onChange={(e) => setComplemento(e.target.value)}
                      placeholder="Apto 42, Bloco B"
                      className="w-full bg-[#0e0f14] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-emerald-500 outline-none"
                    />
                  </div>

                  {/* Bairro */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Bairro
                    </label>
                    <input
                      type="text"
                      value={bairro}
                      onChange={(e) => setBairro(e.target.value)}
                      placeholder="Centro, Jardim América"
                      className="w-full bg-[#0e0f14] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-emerald-500 outline-none"
                    />
                  </div>

                  {/* Cidade */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Cidade
                    </label>
                    <input
                      type="text"
                      value={cidade}
                      onChange={(e) => setCidade(e.target.value)}
                      placeholder="São Paulo, Campinas"
                      className="w-full bg-[#0e0f14] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-emerald-500 outline-none"
                    />
                  </div>

                  {/* UF */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Estado (UF)
                    </label>
                    <input
                      type="text"
                      maxLength={2}
                      value={uf}
                      onChange={(e) => setUf(e.target.value.toUpperCase())}
                      placeholder="SP"
                      className="w-full bg-[#0e0f14] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-emerald-500 outline-none uppercase font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= ABA 3: DADOS BANCÁRIOS (PIX) ================= */}
          {activeTab === 'bancarios' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-[#14151e] p-4 rounded-2xl border border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-purple-400 flex items-center gap-2">
                    <CreditCard size={15} /> Conta Bancária & Chave PIX para Recebimento
                  </h4>
                  <span className="text-[11px] text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                    Comissões & Salários
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Estes dados são utilizados pelo financeiro para realizar os pagamentos de comissões de venda, fechamentos de folha e retiradas com agilidade.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Tipo de Chave PIX */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Tipo de Chave PIX
                    </label>
                    <select
                      value={tipoChavePix}
                      onChange={(e) => setTipoChavePix(e.target.value)}
                      className="w-full bg-[#0e0f14] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-purple-500 outline-none"
                    >
                      <option value="CPF">CPF</option>
                      <option value="CNPJ">CNPJ</option>
                      <option value="Celular / Telefone">Celular / Telefone</option>
                      <option value="E-mail">E-mail</option>
                      <option value="Chave Aleatória (EVP)">Chave Aleatória (EVP)</option>
                    </select>
                  </div>

                  {/* Chave PIX */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Chave PIX
                    </label>
                    <input
                      type="text"
                      value={chavePix}
                      onChange={(e) => setChavePix(e.target.value)}
                      placeholder="Informe a chave PIX exata"
                      className="w-full bg-[#0e0f14] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:border-purple-500 outline-none"
                    />
                  </div>

                  {/* Titular da Conta */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Titular da Conta / Favorecido
                    </label>
                    <input
                      type="text"
                      value={titular}
                      onChange={(e) => setTitular(e.target.value)}
                      placeholder="Nome completo ou Razão Social do titular da conta"
                      className="w-full bg-[#0e0f14] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-purple-500 outline-none"
                    />
                  </div>

                  {/* Banco */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Instituição Financeira / Banco
                    </label>
                    <input
                      type="text"
                      value={banco}
                      onChange={(e) => setBanco(e.target.value)}
                      placeholder="Ex: Nubank, Itaú, Santander, Banco do Brasil, Bradesco, Inter"
                      className="w-full bg-[#0e0f14] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-purple-500 outline-none"
                    />
                  </div>

                  {/* Tipo de Conta */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Tipo de Conta
                    </label>
                    <select
                      value={tipoConta}
                      onChange={(e) => setTipoConta(e.target.value)}
                      className="w-full bg-[#0e0f14] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-purple-500 outline-none"
                    >
                      <option value="Corrente">Conta Corrente</option>
                      <option value="Poupança">Conta Poupança</option>
                      <option value="Pagamento">Conta de Pagamento</option>
                    </select>
                  </div>

                  {/* Agência */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Agência (com dígito se houver)
                    </label>
                    <input
                      type="text"
                      value={agencia}
                      onChange={(e) => setAgencia(e.target.value)}
                      placeholder="0001"
                      className="w-full bg-[#0e0f14] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:border-purple-500 outline-none"
                    />
                  </div>

                  {/* Conta */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Número da Conta com Dígito
                    </label>
                    <input
                      type="text"
                      value={conta}
                      onChange={(e) => setConta(e.target.value)}
                      placeholder="123456-7"
                      className="w-full bg-[#0e0f14] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:border-purple-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= ABA 4: DADOS CONTRATUAIS & REMUNERAÇÃO (RBAC) ================= */}
          {activeTab === 'contratuais' && (
            <div className="space-y-4 animate-fadeIn">
              {/* Aviso de Regra de Segurança (RBAC) */}
              {!isAdmin ? (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-200 flex items-start gap-3 shadow-md">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
                    <Lock size={16} />
                  </div>
                  <div className="text-xs space-y-1">
                    <p className="font-extrabold text-amber-300">
                      Visualização em Modo Somente Leitura
                    </p>
                    <p className="text-amber-200/90 leading-relaxed">
                      Regras de remuneração, salário base, vínculo e contratação são gerenciadas exclusivamente pela Administração. Em caso de dúvidas ou alterações, solicite ao Gestor ou Diretor da Loja.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/25 text-blue-200 flex items-start gap-3 shadow-md">
                  <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 shrink-0 mt-0.5">
                    <ShieldCheck size={16} />
                  </div>
                  <div className="text-xs space-y-1">
                    <p className="font-extrabold text-blue-300">
                      Gestão Administrativa de Contratação & Folha
                    </p>
                    <p className="text-blue-200/90 leading-relaxed">
                      Como Administrador, você possui permissão para definir o Salário Base Fixo, encargos trabalhistas estimados, regime de vínculo e percentual de participação nos lucros (PLR).
                    </p>
                  </div>
                </div>
              )}

              <div className="bg-[#14151e] p-4 rounded-2xl border border-white/5 space-y-4">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                  <Briefcase size={15} /> Regime de Trabalho & Contratação
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Tipo de Vínculo */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Tipo de Vínculo Contratual
                    </label>
                    <select
                      disabled={!isAdmin}
                      value={tipoVinculo}
                      onChange={(e) => setTipoVinculo(e.target.value as any)}
                      className={`w-full border rounded-xl px-3.5 py-2.5 text-xs text-white outline-none ${
                        !isAdmin
                          ? 'bg-[#1b1c26]/60 border-white/5 text-slate-400 cursor-not-allowed'
                          : 'bg-[#0e0f14] border-white/10 focus:border-amber-500'
                      }`}
                    >
                      <option value="Autônomo / Comissionista Puro">Autônomo / Comissionista Puro</option>
                      <option value="PJ / Prestador">PJ / Prestador de Serviço</option>
                      <option value="CLT / Funcionário">CLT / Funcionário</option>
                      <option value="Sócio / Parceiro">Sócio / Parceiro</option>
                    </select>
                  </div>

                  {/* Data de Admissão */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Data de Admissão / Início das Atividades
                    </label>
                    <input
                      type="date"
                      disabled={!isAdmin}
                      value={dataAdmissao}
                      onChange={(e) => setDataAdmissao(e.target.value)}
                      className={`w-full border rounded-xl px-3.5 py-2.5 text-xs text-white outline-none ${
                        !isAdmin
                          ? 'bg-[#1b1c26]/60 border-white/5 text-slate-400 cursor-not-allowed'
                          : 'bg-[#0e0f14] border-white/10 focus:border-amber-500'
                      }`}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-[#14151e] p-4 rounded-2xl border border-white/5 space-y-4">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <DollarSign size={15} className="text-amber-400" /> Parâmetros de Remuneração Fixa & Encargos
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Salário Base Fixo */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Salário Base Fixo (R$)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-500 font-mono text-xs">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        disabled={!isAdmin}
                        value={salarioBaseFixo}
                        onChange={(e) => setSalarioBaseFixo(e.target.value)}
                        placeholder="0.00"
                        className={`w-full border rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white font-mono outline-none ${
                          !isAdmin
                            ? 'bg-[#1b1c26]/60 border-white/5 text-slate-400 cursor-not-allowed'
                            : 'bg-[#0e0f14] border-white/10 focus:border-amber-500'
                        }`}
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Fixo mensal pago em folha
                    </span>
                  </div>

                  {/* Encargos Trabalhistas */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Encargos / Tributos (R$)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-500 font-mono text-xs">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        disabled={!isAdmin}
                        value={encargosTrabalhistasEstimados}
                        onChange={(e) => setEncargosTrabalhistasEstimados(e.target.value)}
                        placeholder="0.00"
                        className={`w-full border rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white font-mono outline-none ${
                          !isAdmin
                            ? 'bg-[#1b1c26]/60 border-white/5 text-slate-400 cursor-not-allowed'
                            : 'bg-[#0e0f14] border-white/10 focus:border-amber-500'
                        }`}
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      INSS, FGTS ou provisões
                    </span>
                  </div>

                  {/* PLR para Sócios/Gestores */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Participação Lucros / PLR (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        disabled={!isAdmin}
                        value={percentualParticipacaoLucros}
                        onChange={(e) => setPercentualParticipacaoLucros(e.target.value)}
                        placeholder="0.0"
                        className={`w-full border rounded-xl pl-3.5 pr-8 py-2.5 text-xs text-white font-mono outline-none ${
                          !isAdmin
                            ? 'bg-[#1b1c26]/60 border-white/5 text-slate-400 cursor-not-allowed'
                            : 'bg-[#0e0f14] border-white/10 focus:border-amber-500'
                        }`}
                      />
                      <span className="absolute right-3 top-2.5 text-slate-500 font-mono text-xs">%</span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Sobre o Lucro Líquido do mês
                    </span>
                  </div>
                </div>

                {/* Observações Contratuais */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Observações & Cláusulas Especiais de Contrato
                  </label>
                  <textarea
                    rows={2}
                    disabled={!isAdmin}
                    value={observacoesContrato}
                    onChange={(e) => setObservacoesContrato(e.target.value)}
                    placeholder="Acordos especiais de comissionamento, metas mínimas, etc."
                    className={`w-full border rounded-xl p-3 text-xs text-white outline-none resize-none ${
                      !isAdmin
                        ? 'bg-[#1b1c26]/60 border-white/5 text-slate-400 cursor-not-allowed'
                        : 'bg-[#0e0f14] border-white/10 focus:border-amber-500'
                    }`}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Footer de Ações do Modal */}
          <div className="pt-4 border-t border-white/5 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-lg shadow-blue-600/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Salvando no Firestore...</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>Salvar Alterações</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
