import React, { useState, useEffect } from 'react';
import { 
  X, 
  Building2, 
  Save, 
  Phone, 
  Mail, 
  MapPin, 
  CreditCard, 
  FileText, 
  User, 
  CheckCircle2, 
  AlertCircle,
  Wrench,
  Sparkles,
  ShieldCheck,
  Calendar,
  DollarSign,
  Layers,
  Clock
} from 'lucide-react';
import { FornecedorPrestador, CategoriaFornecedor } from '../types';

interface ModalNovoFornecedorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (fornecedor: FornecedorPrestador) => Promise<void> | void;
  fornecedorToEdit?: FornecedorPrestador | null;
}

const CATEGORIAS_FORNECEDOR: CategoriaFornecedor[] = [
  'Agência de Tráfego / Marketing',
  'Posto de Combustível',
  'Oficina Mecânica',
  'Autopeças',
  'Funilaria e Pintura',
  'Lava Jato / Estética Automotiva',
  'Auto Elétrica / Acessórios',
  'Tapeçaria / Higienização',
  'Pneus / Borracharia',
  'Guincho / Reboque',
  'Vistoria Cautelar / Laudo',
  'Despachante',
  'Cartório / Serviços Notariais',
  'Concessionária / Concessionário',
  'Outro Parceiro',
];

export const ModalNovoFornecedor: React.FC<ModalNovoFornecedorProps> = ({
  isOpen,
  onClose,
  onSave,
  fornecedorToEdit,
}) => {
  const [nome, setNome] = useState('');
  const [razaoSocial, setRazaoSocial] = useState('');
  const [cnpjCpf, setCnpjCpf] = useState('');
  const [categoria, setCategoria] = useState<CategoriaFornecedor>('Oficina Mecânica');
  const [telefone, setTelefone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [responsavelContato, setResponsavelContato] = useState('');
  const [endereco, setEndereco] = useState('');
  const [cidadeUf, setCidadeUf] = useState('');
  const [chavePix, setChavePix] = useState('');
  const [tipoChavePix, setTipoChavePix] = useState<'CNPJ' | 'CPF' | 'E-mail' | 'Telefone' | 'Aleatória'>('CNPJ');
  const [bancoDadosBancarios, setBancoDadosBancarios] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [status, setStatus] = useState<'Ativo' | 'Inativo'>('Ativo');
  
  // Condições Comerciais, Fechamento e Vencimento Fixo
  const [tipoCobranca, setTipoCobranca] = useState<
    'Avulso / No Ato do Serviço' | 'Faturamento Mensal (Lote / Fechamento)' | 'Fixo Mensal' | 'Variável por Volume/Serviço'
  >('Avulso / No Ato do Serviço');
  const [diaFechamentoFatura, setDiaFechamentoFatura] = useState<number | ''>('');
  const [diaVencimentoPagamento, setDiaVencimentoPagamento] = useState<number | ''>('');
  const [valorContratoMensal, setValorContratoMensal] = useState<number | ''>('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (fornecedorToEdit) {
      setNome(fornecedorToEdit.nome || '');
      setRazaoSocial(fornecedorToEdit.razaoSocial || '');
      setCnpjCpf(fornecedorToEdit.cnpjCpf || '');
      setCategoria(fornecedorToEdit.categoria || 'Oficina Mecânica');
      setTelefone(fornecedorToEdit.telefone || '');
      setWhatsapp(fornecedorToEdit.whatsapp || '');
      setEmail(fornecedorToEdit.email || '');
      setResponsavelContato(fornecedorToEdit.responsavelContato || '');
      setEndereco(fornecedorToEdit.endereco || '');
      setCidadeUf(fornecedorToEdit.cidadeUf || '');
      setChavePix(fornecedorToEdit.chavePix || '');
      setTipoChavePix(fornecedorToEdit.tipoChavePix || 'CNPJ');
      setBancoDadosBancarios(fornecedorToEdit.bancoDadosBancarios || '');
      setObservacoes(fornecedorToEdit.observacoes || '');
      setStatus(fornecedorToEdit.status || 'Ativo');
      
      const tipoSaved = fornecedorToEdit.tipoCobranca;
      if (tipoSaved === 'Fixo Mensal') {
        setTipoCobranca('Fixo Mensal');
      } else if (tipoSaved === 'Faturamento Mensal (Lote / Fechamento)' || (fornecedorToEdit.diaFechamentoFatura && tipoSaved === 'Variável por Volume/Serviço')) {
        setTipoCobranca('Faturamento Mensal (Lote / Fechamento)');
      } else {
        setTipoCobranca('Avulso / No Ato do Serviço');
      }

      setDiaFechamentoFatura(fornecedorToEdit.diaFechamentoFatura ?? '');
      setDiaVencimentoPagamento(fornecedorToEdit.diaVencimentoPagamento ?? '');
      setValorContratoMensal(fornecedorToEdit.valorContratoMensal ?? '');
    } else {
      setNome('');
      setRazaoSocial('');
      setCnpjCpf('');
      setCategoria('Oficina Mecânica');
      setTelefone('');
      setWhatsapp('');
      setEmail('');
      setResponsavelContato('');
      setEndereco('');
      setCidadeUf('');
      setChavePix('');
      setTipoChavePix('CNPJ');
      setBancoDadosBancarios('');
      setObservacoes('');
      setStatus('Ativo');
      
      setTipoCobranca('Avulso / No Ato do Serviço');
      setDiaFechamentoFatura('');
      setDiaVencimentoPagamento('');
      setValorContratoMensal('');
    }
    setErrorMsg('');
  }, [fornecedorToEdit, isOpen]);

  // Se a categoria for marketing ou sistema, sugerir Fixo Mensal por conveniência
  const handleCategoriaChange = (newCat: CategoriaFornecedor) => {
    setCategoria(newCat);
    if (!fornecedorToEdit) {
      if (newCat === 'Agência de Tráfego / Marketing') {
        setTipoCobranca('Fixo Mensal');
        setDiaVencimentoPagamento(10);
      } else {
        setTipoCobranca('Avulso / No Ato do Serviço');
        setDiaFechamentoFatura('');
        setDiaVencimentoPagamento('');
      }
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      setErrorMsg('Informe o nome ou razão social da empresa parceira.');
      return;
    }

    if (tipoCobranca === 'Fixo Mensal' && (!valorContratoMensal || Number(valorContratoMensal) <= 0)) {
      setErrorMsg('Para fornecedores com contrato "Fixo Mensal", informe o Valor Contratual Fixo (R$).');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');

      const fornecedorData: FornecedorPrestador = {
        id: fornecedorToEdit?.id || `forn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        nome: nome.trim(),
        razaoSocial: razaoSocial.trim() || undefined,
        cnpjCpf: cnpjCpf.trim() || undefined,
        categoria,
        telefone: telefone.trim(),
        whatsapp: whatsapp.trim() || undefined,
        email: email.trim() || undefined,
        responsavelContato: responsavelContato.trim() || undefined,
        endereco: endereco.trim() || undefined,
        cidadeUf: cidadeUf.trim() || undefined,
        chavePix: chavePix.trim() || undefined,
        tipoChavePix,
        bancoDadosBancarios: bancoDadosBancarios.trim() || undefined,
        observacoes: observacoes.trim() || undefined,
        status,
        // Condições Comerciais & Faturamento
        tipoCobranca,
        diaFechamentoFatura: diaFechamentoFatura !== '' ? Number(diaFechamentoFatura) : undefined,
        diaVencimentoPagamento: diaVencimentoPagamento !== '' ? Number(diaVencimentoPagamento) : undefined,
        valorContratoMensal: tipoCobranca === 'Fixo Mensal' && valorContratoMensal !== '' ? Number(valorContratoMensal) : undefined,
        createdAt: fornecedorToEdit?.createdAt || new Date().toISOString(),
      };

      await onSave(fornecedorData);
      onClose();
    } catch (err: any) {
      console.error('Erro ao salvar fornecedor:', err);
      setErrorMsg(err.message || 'Erro ao salvar fornecedor no sistema.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-gray-900 border border-white/10 rounded-2xl text-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-[#16171e] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-black">
              <Building2 size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {fornecedorToEdit ? 'Editar Fornecedor & Prestador' : 'Novo Fornecedor & Prestador de Serviços'}
              </h3>
              <p className="text-xs text-slate-400">
                Cadastre oficinas mecânicas, autopeças, funilarias, lava jatos e parceiros da loja
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl bg-white/5 hover:bg-white/10 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Dados Principais */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 size={14} className="text-blue-400" />
              Identificação da Empresa Parceira
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nome Fantasia / Nome Comercial *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Auto Mecânica Express, Funilaria Prime, Lava Jato Brilho..."
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full bg-[#16171e] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Categoria de Serviço / Atividade *
                </label>
                <select
                  value={categoria}
                  onChange={(e) => handleCategoriaChange(e.target.value as CategoriaFornecedor)}
                  className="w-full bg-[#16171e] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  {CATEGORIAS_FORNECEDOR.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  CNPJ ou CPF (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="00.000.000/0000-00"
                  value={cnpjCpf}
                  onChange={(e) => setCnpjCpf(e.target.value)}
                  className="w-full bg-[#16171e] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Razão Social (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Nome Jurídico completo"
                  value={razaoSocial}
                  onChange={(e) => setRazaoSocial(e.target.value)}
                  className="w-full bg-[#16171e] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Status de Atendimento
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'Ativo' | 'Inativo')}
                  className="w-full bg-[#16171e] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Ativo">✅ Ativo (Parceiro Homologado)</option>
                  <option value="Inativo">❌ Inativo / Suspenso</option>
                </select>
              </div>
            </div>
          </div>

          {/* Condições Comerciais, Fechamento de Lote & Vencimento */}
          <div className="space-y-4 pt-3 border-t border-white/5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar size={14} className="text-amber-400" />
                Regra Comercial, Cobrança & Vencimento
              </h4>
              <span className="text-[11px] text-slate-400">
                Selecione o modelo financeiro do prestador
              </span>
            </div>

            {/* 3 Opções de Tipo de Cobrança */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Opção 1: Avulso / No Ato do Serviço */}
              <div
                onClick={() => {
                  setTipoCobranca('Avulso / No Ato do Serviço');
                  setDiaFechamentoFatura('');
                  setDiaVencimentoPagamento('');
                }}
                className={`p-3.5 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                  tipoCobranca === 'Avulso / No Ato do Serviço'
                    ? 'bg-emerald-600/15 border-emerald-500/50 text-white ring-1 ring-emerald-500/30'
                    : 'bg-[#16171e] border-white/5 text-slate-400 hover:border-white/10'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Sparkles size={14} className="text-emerald-400" /> Avulso / No Ato
                  </span>
                  <input
                    type="radio"
                    name="tipoCobranca"
                    checked={tipoCobranca === 'Avulso / No Ato do Serviço'}
                    onChange={() => {
                      setTipoCobranca('Avulso / No Ato do Serviço');
                      setDiaFechamentoFatura('');
                      setDiaVencimentoPagamento('');
                    }}
                    className="accent-emerald-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Sem data de fechamento. Débitos lançados e quitados logo após a conclusão do serviço no carro.
                </p>
              </div>

              {/* Opção 2: Faturamento Mensal (Lote / Fechamento) */}
              <div
                onClick={() => {
                  setTipoCobranca('Faturamento Mensal (Lote / Fechamento)');
                  if (!diaFechamentoFatura) setDiaFechamentoFatura(20);
                  if (!diaVencimentoPagamento) setDiaVencimentoPagamento(28);
                }}
                className={`p-3.5 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                  tipoCobranca === 'Faturamento Mensal (Lote / Fechamento)' || tipoCobranca === 'Variável por Volume/Serviço'
                    ? 'bg-blue-600/15 border-blue-500/50 text-white ring-1 ring-blue-500/30'
                    : 'bg-[#16171e] border-white/5 text-slate-400 hover:border-white/10'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Layers size={14} className="text-blue-400" /> Fatura em Lote
                  </span>
                  <input
                    type="radio"
                    name="tipoCobranca"
                    checked={tipoCobranca === 'Faturamento Mensal (Lote / Fechamento)' || tipoCobranca === 'Variável por Volume/Serviço'}
                    onChange={() => {
                      setTipoCobranca('Faturamento Mensal (Lote / Fechamento)');
                      if (!diaFechamentoFatura) setDiaFechamentoFatura(20);
                      if (!diaVencimentoPagamento) setDiaVencimentoPagamento(28);
                    }}
                    className="accent-blue-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Acumula serviços no mês e fecha fatura no dia de corte com vencimento fixo acordado.
                </p>
              </div>

              {/* Opção 3: Fixo Mensal (Contrato) */}
              <div
                onClick={() => {
                  setTipoCobranca('Fixo Mensal');
                  if (!diaVencimentoPagamento) setDiaVencimentoPagamento(10);
                  setDiaFechamentoFatura('');
                }}
                className={`p-3.5 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                  tipoCobranca === 'Fixo Mensal'
                    ? 'bg-purple-600/15 border-purple-500/50 text-white ring-1 ring-purple-500/30'
                    : 'bg-[#16171e] border-white/5 text-slate-400 hover:border-white/10'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Clock size={14} className="text-purple-400" /> Fixo Mensal
                  </span>
                  <input
                    type="radio"
                    name="tipoCobranca"
                    checked={tipoCobranca === 'Fixo Mensal'}
                    onChange={() => {
                      setTipoCobranca('Fixo Mensal');
                      if (!diaVencimentoPagamento) setDiaVencimentoPagamento(10);
                      setDiaFechamentoFatura('');
                    }}
                    className="accent-purple-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Mensalidade recorrente fixa (ex: Marketing, Softwares, Assessoria Jurídica).
                </p>
              </div>
            </div>

            {/* Detalhes dinâmicos conforme a opção */}
            {tipoCobranca === 'Avulso / No Ato do Serviço' && (
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-200 leading-relaxed">
                  <span className="font-bold text-white">Parceiro Avulso / Por Serviço: </span>
                  Não exige contrato de fatura ou data fixa de fechamento. Ao marcar um serviço deste fornecedor como 
                  <span className="font-semibold text-emerald-300"> Concluído / Retorno ao Pátio</span> no Funil de Preparação ou no Dossiê, você poderá selecionar o pagamento imediato no ato (com baixa na conta bancária) ou manter em aberto, integrando 100% nas despesas do veículo.
                </div>
              </div>
            )}

            {(tipoCobranca === 'Faturamento Mensal (Lote / Fechamento)' || tipoCobranca === 'Variável por Volume/Serviço') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Dia de Fechamento da Fatura / Lote *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      max={31}
                      required
                      placeholder="Ex: 20"
                      value={diaFechamentoFatura}
                      onChange={(e) => setDiaFechamentoFatura(e.target.value ? Number(e.target.value) : '')}
                      className="w-full bg-[#16171e] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                    />
                    <span className="absolute right-3 top-2.5 text-[11px] text-slate-500 font-medium">Todo dia</span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">Corte das despesas do mês (ex: dia 20)</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Dia de Vencimento / Pagamento da Fatura *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      max={31}
                      required
                      placeholder="Ex: 28"
                      value={diaVencimentoPagamento}
                      onChange={(e) => setDiaVencimentoPagamento(e.target.value ? Number(e.target.value) : '')}
                      className="w-full bg-[#16171e] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                    />
                    <span className="absolute right-3 top-2.5 text-[11px] text-slate-500 font-medium">Todo dia</span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">Data de quitação do lote acordada (ex: dia 28)</span>
                </div>
              </div>
            )}

            {tipoCobranca === 'Fixo Mensal' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-purple-300 mb-1.5">
                    Valor Contratual Fixo Mensal (R$) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      required
                      placeholder="0,00"
                      value={valorContratoMensal}
                      onChange={(e) => setValorContratoMensal(e.target.value ? Number(e.target.value) : '')}
                      className="w-full bg-[#16171e] border border-purple-500/40 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-sm text-purple-200 placeholder:text-slate-500 focus:outline-none font-mono"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Valor fixo cobrado todo mês (lançado nas despesas operacionais da loja)
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Dia de Vencimento do Boleto / Pagamento *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      max={31}
                      required
                      placeholder="Ex: 10"
                      value={diaVencimentoPagamento}
                      onChange={(e) => setDiaVencimentoPagamento(e.target.value ? Number(e.target.value) : '')}
                      className="w-full bg-[#16171e] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500 font-mono"
                    />
                    <span className="absolute right-3 top-2.5 text-[11px] text-slate-500 font-medium">Todo dia</span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">Dia de vencimento da mensalidade (ex: dia 10)</span>
                </div>
              </div>
            )}
          </div>

          {/* Contato & Localização */}
          <div className="space-y-4 pt-3 border-t border-white/5">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Phone size={14} className="text-emerald-400" />
              Contatos & Endereço
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Telefone / Fixo
                </label>
                <input
                  type="text"
                  placeholder="(00) 0000-0000"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  className="w-full bg-[#16171e] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  WhatsApp (Direto)
                </label>
                <input
                  type="text"
                  placeholder="(00) 90000-0000"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full bg-[#16171e] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Responsável / Contato
                </label>
                <input
                  type="text"
                  placeholder="Ex: Carlos Mecânico, André Gerente..."
                  value={responsavelContato}
                  onChange={(e) => setResponsavelContato(e.target.value)}
                  className="w-full bg-[#16171e] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Endereço / Logradouro
                </label>
                <input
                  type="text"
                  placeholder="Rua, Número, Bairro"
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  className="w-full bg-[#16171e] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Cidade / UF
                </label>
                <input
                  type="text"
                  placeholder="Ex: São Paulo - SP"
                  value={cidadeUf}
                  onChange={(e) => setCidadeUf(e.target.value)}
                  className="w-full bg-[#16171e] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Dados Financeiros / PIX para Liquidação */}
          <div className="space-y-4 pt-3 border-t border-white/5">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard size={14} className="text-purple-400" />
              Chave PIX & Pagamentos de Serviços
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Tipo de Chave PIX
                </label>
                <select
                  value={tipoChavePix}
                  onChange={(e) => setTipoChavePix(e.target.value as any)}
                  className="w-full bg-[#16171e] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="CNPJ">CNPJ</option>
                  <option value="CPF">CPF</option>
                  <option value="Telefone">Telefone</option>
                  <option value="E-mail">E-mail</option>
                  <option value="Aleatória">Chave Aleatória (EVP)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Chave PIX para Liquidação de Despesas
                </label>
                <input
                  type="text"
                  placeholder="Insira a chave PIX do parceiro"
                  value={chavePix}
                  onChange={(e) => setChavePix(e.target.value)}
                  className="w-full bg-[#16171e] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Observações & Prazos de Atendimento
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Especialistas em injeção eletrônica, desconto de 10% nas peças, faturamento quinzenal..."
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  className="w-full bg-[#16171e] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>
            </div>
          </div>

          </div>

          {/* Fixed Footer Actions */}
          <div className="p-4 sm:p-5 border-t border-white/10 bg-[#16171e] flex items-center justify-end gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-semibold transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-lg shadow-blue-600/30 transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Save size={16} />
              <span>{loading ? 'Salvando...' : fornecedorToEdit ? 'Atualizar Fornecedor' : 'Cadastrar Fornecedor'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
