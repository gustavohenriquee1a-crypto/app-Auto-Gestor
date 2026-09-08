import React, { useState, useEffect } from 'react';
import {
  Building2,
  X,
  Save,
  CheckCircle2,
  FileText,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  UserCheck,
  Hash,
  AlertCircle
} from 'lucide-react';
import { ConfiguracaoLoja } from '../types';
import {
  getConfiguracaoLojaFirestore,
  saveConfiguracaoLojaFirestore,
  subscribeConfiguracoesLoja,
  DEFAULT_CONFIGURACOES_LOJA,
} from '../services/firestoreService';

interface ModalDadosEmpresaProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: any;
}

export const ModalDadosEmpresa: React.FC<ModalDadosEmpresaProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const [config, setConfig] = useState<ConfiguracaoLoja>(DEFAULT_CONFIGURACOES_LOJA);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form states
  const [nomeLoja, setNomeLoja] = useState('');
  const [razaoSocial, setRazaoSocial] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [inscricaoEstadual, setInscricaoEstadual] = useState('');
  const [logradouro, setLogradouro] = useState('');
  const [numero, setNumero] = useState('');
  const [bairro, setBairro] = useState('');
  const [cep, setCep] = useState('');
  const [cidadeUf, setCidadeUf] = useState('');
  const [enderecoCompleto, setEnderecoCompleto] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [chavePixPadrao, setChavePixPadrao] = useState('');
  const [responsavelLegal, setResponsavelLegal] = useState('');
  const [cpfResponsavel, setCpfResponsavel] = useState('');

  // Sincroniza dados da empresa
  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    getConfiguracaoLojaFirestore().then((data) => {
      populateFields(data);
      setLoading(false);
    });

    const unsub = subscribeConfiguracoesLoja((data) => {
      if (data) {
        populateFields(data);
      }
    });

    return () => unsub();
  }, [isOpen]);

  const populateFields = (data: ConfiguracaoLoja) => {
    setConfig(data);
    setNomeLoja(data.nomeLoja || DEFAULT_CONFIGURACOES_LOJA.nomeLoja || '');
    setRazaoSocial(data.razaoSocial || DEFAULT_CONFIGURACOES_LOJA.razaoSocial || '');
    setCnpj(data.cnpj || DEFAULT_CONFIGURACOES_LOJA.cnpj || '');
    setInscricaoEstadual(data.inscricaoEstadual || 'ISENTO');
    setLogradouro(data.logradouro || 'Rua Nicolau Cacciatori');
    setNumero(data.numero || '477');
    setBairro(data.bairro || 'Jd. dos Pioneiros');
    setCep(data.cep || '19050-340');
    setCidadeUf(data.cidadeUf || 'Presidente Prudente - SP');
    setEnderecoCompleto(
      data.endereco ||
        'RUA NICOLAU CACCIATORI, 477, JD DOS PIONEIROS, CEP: 19.050-340, PRESIDENTE PRUDENTE-SP'
    );
    setTelefone(data.telefone || '(18) 3222-0000');
    setEmail(data.email || 'contato@trocafacil.com.br');
    setChavePixPadrao(data.chavePixPadrao || data.cnpj || '47.271.452/0001-71');
    setResponsavelLegal(data.responsavelLegal || 'Diretoria Executiva');
    setCpfResponsavel(data.cpfResponsavel || '000.000.000-00');
  };

  // Atualiza endereço completo consolidado automaticamente quando logradouro/numero/bairro mudam
  const handleAtualizarEnderecoConsolidado = () => {
    const r = logradouro.trim();
    const n = numero.trim();
    const b = bairro.trim();
    const c = cep.trim();
    const cid = cidadeUf.trim();
    const partes: string[] = [];
    if (r) partes.push(r.toUpperCase());
    if (n) partes.push(n);
    if (b) partes.push(b.toUpperCase());
    if (c) partes.push(`CEP: ${c}`);
    if (cid) partes.push(cid.toUpperCase());
    if (partes.length > 0) {
      setEnderecoCompleto(partes.join(', '));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updateData: Partial<ConfiguracaoLoja> = {
        nomeLoja: nomeLoja.trim(),
        razaoSocial: razaoSocial.trim().toUpperCase(),
        cnpj: cnpj.trim(),
        inscricaoEstadual: inscricaoEstadual.trim().toUpperCase(),
        logradouro: logradouro.trim(),
        numero: numero.trim(),
        bairro: bairro.trim(),
        cep: cep.trim(),
        cidadeUf: cidadeUf.trim(),
        endereco: enderecoCompleto.trim().toUpperCase() || `${logradouro}, ${numero}, ${bairro} - ${cidadeUf}`,
        telefone: telefone.trim(),
        email: email.trim(),
        chavePixPadrao: chavePixPadrao.trim(),
        responsavelLegal: responsavelLegal.trim(),
        cpfResponsavel: cpfResponsavel.trim(),
        updatedBy: currentUser?.displayName || 'Administrador',
        updatedByEmail: currentUser?.email || '',
      };

      await saveConfiguracaoLojaFirestore(updateData);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3500);
    } catch (err) {
      console.error('Erro ao salvar dados da empresa:', err);
      alert('Erro ao salvar informações da empresa no Firestore. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-3xl max-h-[92vh] flex flex-col bg-[#0e0f14] rounded-2xl shadow-2xl overflow-hidden border border-white/10">
        {/* HEADER */}
        <div className="bg-[#15161f] text-white p-5 flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-blue-600/30 shrink-0">
              <Building2 size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-white">
                  Informações & Dados da Empresa
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  Documentos & Contratos
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Dados cadastrais e fiscais que compõem contratos gerados, termos de test-drive, recibos e laudos da frota.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* FEEDBACK BANNER */}
        {saveSuccess && (
          <div className="bg-emerald-500/15 border-b border-emerald-500/30 px-5 py-3 text-emerald-300 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <span>Dados da empresa atualizados com sucesso! Todos os contratos, termos e recibos refletirão estas alterações automaticamente.</span>
          </div>
        )}

        {/* BODY */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-xs text-slate-200">
          {/* AVISO EXPLICATIVO */}
          <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 flex items-start gap-2.5">
            <AlertCircle size={17} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-xs">Sincronização em Tempo Real</p>
              <p className="text-[11px] text-blue-200/80 mt-0.5">
                Ao alterar Razão Social, CNPJ ou Endereço neste painel, o sistema atualiza imediatamente todos os formulários de geração de contratos de venda, termos de locação para motoristas e recibos de pagamento.
              </p>
            </div>
          </div>

          {/* 1. DADOS JURÍDICOS E IDENTIFICAÇÃO */}
          <div className="bg-white/[0.02] p-4 rounded-xl border border-white/5 space-y-4">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Building2 size={15} className="text-blue-400" /> Identificação Corporativa
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Nome Fantasia (Exibição no Sistema) *
                </label>
                <input
                  type="text"
                  required
                  value={nomeLoja}
                  onChange={(e) => setNomeLoja(e.target.value)}
                  placeholder="Ex: Troca Fácil Veículos"
                  className="w-full bg-[#161722] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Razão Social Completa (Para Contratos e Termos) *
                </label>
                <input
                  type="text"
                  required
                  value={razaoSocial}
                  onChange={(e) => setRazaoSocial(e.target.value)}
                  placeholder="Ex: TROCA FÁCIL COMÉRCIO DE VEÍCULOS LTDA"
                  className="w-full bg-[#161722] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  CNPJ *
                </label>
                <input
                  type="text"
                  required
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                  placeholder="00.000.000/0001-00"
                  className="w-full bg-[#161722] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Inscrição Estadual (IE)
                </label>
                <input
                  type="text"
                  value={inscricaoEstadual}
                  onChange={(e) => setInscricaoEstadual(e.target.value)}
                  placeholder="Ex: ISENTO ou 000.000.000.000"
                  className="w-full bg-[#161722] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono transition"
                />
              </div>
            </div>
          </div>

          {/* 2. CONTATOS & COBRANÇA */}
          <div className="bg-white/[0.02] p-4 rounded-xl border border-white/5 space-y-4">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Phone size={15} className="text-emerald-400" /> Contatos & Pagamentos
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Telefone / WhatsApp Comercial
                </label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-3 text-slate-500" />
                  <input
                    type="text"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    placeholder="(18) 3222-0000"
                    className="w-full bg-[#161722] border border-white/10 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  E-mail Institucional
                </label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-3 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contato@empresa.com.br"
                    className="w-full bg-[#161722] border border-white/10 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Chave PIX Padrão da Loja
                </label>
                <div className="relative">
                  <CreditCard size={14} className="absolute left-3 top-3 text-slate-500" />
                  <input
                    type="text"
                    value={chavePixPadrao}
                    onChange={(e) => setChavePixPadrao(e.target.value)}
                    placeholder="CNPJ, E-mail ou Celular"
                    className="w-full bg-[#161722] border border-white/10 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono transition"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 3. ENDEREÇO DA SEDE */}
          <div className="bg-white/[0.02] p-4 rounded-xl border border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <MapPin size={15} className="text-amber-400" /> Endereço Oficial da Sede
              </h4>
              <button
                type="button"
                onClick={handleAtualizarEnderecoConsolidado}
                className="text-[11px] text-blue-400 hover:text-blue-300 underline cursor-pointer"
              >
                Recalcular Linha Completa
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Logradouro (Rua, Avenida)
                </label>
                <input
                  type="text"
                  value={logradouro}
                  onChange={(e) => setLogradouro(e.target.value)}
                  onBlur={handleAtualizarEnderecoConsolidado}
                  placeholder="Ex: Rua Nicolau Cacciatori"
                  className="w-full bg-[#161722] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Número e Complemento
                </label>
                <input
                  type="text"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  onBlur={handleAtualizarEnderecoConsolidado}
                  placeholder="Ex: 477, Sala 02"
                  className="w-full bg-[#161722] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Bairro
                </label>
                <input
                  type="text"
                  value={bairro}
                  onChange={(e) => setBairro(e.target.value)}
                  onBlur={handleAtualizarEnderecoConsolidado}
                  placeholder="Ex: Jd. dos Pioneiros"
                  className="w-full bg-[#161722] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  CEP
                </label>
                <input
                  type="text"
                  value={cep}
                  onChange={(e) => setCep(e.target.value)}
                  onBlur={handleAtualizarEnderecoConsolidado}
                  placeholder="19050-340"
                  className="w-full bg-[#161722] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Cidade e UF
                </label>
                <input
                  type="text"
                  value={cidadeUf}
                  onChange={(e) => setCidadeUf(e.target.value)}
                  onBlur={handleAtualizarEnderecoConsolidado}
                  placeholder="Presidente Prudente - SP"
                  className="w-full bg-[#161722] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Endereço Completo Consolidado (Linha que sai no cabeçalho e cláusulas dos contratos) *
                </label>
                <input
                  type="text"
                  required
                  value={enderecoCompleto}
                  onChange={(e) => setEnderecoCompleto(e.target.value)}
                  placeholder="RUA NICOLAU CACCIATORI, 477, JD DOS PIONEIROS, CEP: 19.050-340, PRESIDENTE PRUDENTE-SP"
                  className="w-full bg-[#161722] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono transition"
                />
              </div>
            </div>
          </div>

          {/* 4. REPRESENTANTE LEGAL */}
          <div className="bg-white/[0.02] p-4 rounded-xl border border-white/5 space-y-4">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <UserCheck size={15} className="text-purple-400" /> Representante Legal / Assinatura
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Nome do Responsável Legal (Assinatura Contratual)
                </label>
                <input
                  type="text"
                  value={responsavelLegal}
                  onChange={(e) => setResponsavelLegal(e.target.value)}
                  placeholder="Ex: Nome do Sócio Administrador ou Gestor"
                  className="w-full bg-[#161722] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  CPF do Responsável Legal
                </label>
                <input
                  type="text"
                  value={cpfResponsavel}
                  onChange={(e) => setCpfResponsavel(e.target.value)}
                  placeholder="000.000.000-00"
                  className="w-full bg-[#161722] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono transition"
                />
              </div>
            </div>
          </div>

          {/* PREVIEW DO CABEÇALHO DO CONTRATO */}
          <div className="p-4 rounded-xl bg-[#090a0f] border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
                <FileText size={13} className="text-blue-400" /> Preview no Contrato Oficial
              </span>
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Visualização do Topo dos Documentos
              </span>
            </div>

            <div className="p-4 rounded-lg bg-white text-slate-900 font-sans border border-slate-300 shadow-inner">
              <div className="text-center border-b pb-2">
                <h5 className="font-black text-sm tracking-wide text-slate-950 uppercase">
                  {razaoSocial || 'NOME DA EMPRESA'}
                </h5>
                <p className="text-[10px] text-slate-600 font-mono mt-0.5">
                  CNPJ: {cnpj || '00.000.000/0001-00'} {inscricaoEstadual ? `• IE: ${inscricaoEstadual}` : ''}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {enderecoCompleto || 'ENDEREÇO DA EMPRESA'}
                </p>
                <p className="text-[9px] text-slate-500 mt-0.5">
                  Telefone: {telefone || '(00) 0000-0000'} • E-mail: {email || 'contato@empresa.com'}
                </p>
              </div>
            </div>
          </div>

          {/* BOTÕES */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition cursor-pointer"
            >
              Fechar
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition flex items-center gap-2 shadow-lg shadow-blue-600/25 cursor-pointer"
            >
              <Save size={15} />
              {saving ? 'Salvando...' : 'Salvar Informações da Empresa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
