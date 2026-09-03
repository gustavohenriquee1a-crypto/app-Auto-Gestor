import React, { useState, useEffect } from 'react';
import { 
  X, 
  Building2, 
  DollarSign, 
  Plus, 
  Calendar, 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  Wallet, 
  Layers, 
  Tag, 
  Receipt, 
  Users, 
  Coffee, 
  Sparkles, 
  Briefcase, 
  Building,
  HelpCircle
} from 'lucide-react';
import { DespesaFixa, FornecedorPrestador, ContaBancariaCaixa } from '../types';
import { subscribeFornecedores, subscribeContasBancarias } from '../services/firestoreService';

interface ModalNovaDespesaFixaProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveDespesaFixa: (despesa: Omit<DespesaFixa, 'id'>, id?: string) => Promise<void> | void;
  despesaToEdit?: DespesaFixa | null;
  fornecedores?: FornecedorPrestador[];
  contasBancarias?: ContaBancariaCaixa[];
}

interface GrupoCategorias {
  grupo: string;
  icone: string;
  itens: string[];
}

const GRUPOS_PADRAO: GrupoCategorias[] = [
  {
    grupo: 'Insumos de Atendimento / Copa',
    icone: '☕',
    itens: [
      'Insumos de Atendimento / Copa - Café & Açúcar',
      'Insumos de Atendimento / Copa - Água Mineral',
      'Insumos de Atendimento / Copa - Copos & Descartáveis',
      'Insumos de Atendimento / Copa - Lanches & Recepção de Clientes',
    ],
  },
  {
    grupo: 'Insumos de Pátio / Operação',
    icone: '🧼',
    itens: [
      'Insumos de Pátio / Operação - Produtos de Limpeza Automotiva',
      'Insumos de Pátio / Operação - Panos, Microfibras & Acessórios',
      'Insumos de Pátio / Operação - Ferramentas & Equipamentos',
      'Insumos de Pátio / Operação - Material de Escritório & Papelaria',
      'Insumos de Pátio / Operação - Uniformes & EPIs',
    ],
  },
  {
    grupo: 'Pessoal & Sócios',
    icone: '👥',
    itens: [
      'Pessoal & Sócios - Folha de Pagamento',
      'Pessoal & Sócios - Pró-labore',
      'Pessoal & Sócios - Distribuição de Lucros (Sócios/Donos)',
      'Pessoal & Sócios - Repasse a Investidores',
      'Pessoal & Sócios - Comissão Extra / Bônus de Funcionários',
      'Pessoal & Sócios - Benefícios (VT / VR)',
    ],
  },
  {
    grupo: 'Estruturais & Fiscais',
    icone: '🏢',
    itens: [
      'Estruturais & Fiscais - Aluguel Pátio / Loja',
      'Estruturais & Fiscais - Energia Elétrica',
      'Estruturais & Fiscais - Água e Saneamento',
      'Estruturais & Fiscais - Internet / Telefonia',
      'Estruturais & Fiscais - Sistemas / Software / ERP',
      'Estruturais & Fiscais - Contabilidade',
      'Estruturais & Fiscais - Impostos / DAS / Simples Nacional',
      'Estruturais & Fiscais - Taxas Bancárias / Maquininha',
    ],
  },
  {
    grupo: 'Marketing & Mídia Geral',
    icone: '🚀',
    itens: [
      'Marketing & Mídia - Mensalidade / Fee Fixo da Agência',
      'Marketing & Mídia - Anúncios Institucionais / Branding',
      'Marketing & Mídia - Fachada / Banners / Mídia Externa',
    ],
  },
  {
    grupo: 'Outras Despesas Operacionais',
    icone: '📦',
    itens: [
      'Manutenção Predial / Reformas',
      'Seguro Patrimonial',
      'Outros Custos Operacionais',
    ],
  },
];

const LOCAL_STORAGE_CUSTOM_CATEGORIES = 'custom_despesas_loja_categories_v1';

export const ModalNovaDespesaFixa: React.FC<ModalNovaDespesaFixaProps> = ({
  isOpen,
  onClose,
  onSaveDespesaFixa,
  despesaToEdit,
  fornecedores: initialFornecedores,
  contasBancarias: initialContasBancarias,
}) => {
  const [fornecedoresList, setFornecedoresList] = useState<FornecedorPrestador[]>(initialFornecedores || []);
  const [contasBancariasList, setContasBancariasList] = useState<ContaBancariaCaixa[]>(initialContasBancarias || []);

  // Form states
  const [categoria, setCategoria] = useState<string>('Estruturais & Fiscais - Aluguel Pátio / Loja');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState<number | string>(1500);
  const [mesReferencia, setMesReferencia] = useState(new Date().toISOString().slice(0, 7));
  const [dataVencimento, setDataVencimento] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<'Pago' | 'Pendente'>('Pago');
  
  // Fornecedor / Favorecido
  const [selectedFornecedorId, setSelectedFornecedorId] = useState<string>('');
  const [fornecedorNome, setFornecedorNome] = useState('');

  // Baixa / Liquidação
  const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().split('T')[0]);
  const [selectedContaBancariaId, setSelectedContaBancariaId] = useState<string>('');
  const [formaPagamento, setFormaPagamento] = useState<string>('PIX');
  const [nfNumero, setNfNumero] = useState('');
  const [observacoes, setObservacoes] = useState('');

  // Categorias personalizadas criadas dinamicamente
  const [customCategorias, setCustomCategorias] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_CUSTOM_CATEGORIES);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Modal / inline input de nova categoria
  const [isCriandoCategoria, setIsCriandoCategoria] = useState(false);
  const [novaCategoriaInput, setNovaCategoriaInput] = useState('');

  // Subscriptions se não vier por props
  useEffect(() => {
    if (initialFornecedores && initialFornecedores.length > 0) {
      setFornecedoresList(initialFornecedores);
    } else {
      const unsub = subscribeFornecedores((list) => {
        if (list) setFornecedoresList(list);
      });
      return () => unsub();
    }
  }, [initialFornecedores]);

  useEffect(() => {
    if (initialContasBancarias && initialContasBancarias.length > 0) {
      setContasBancariasList(initialContasBancarias);
    } else {
      const unsub = subscribeContasBancarias((list) => {
        if (list) setContasBancariasList(list);
      });
      return () => unsub();
    }
  }, [initialContasBancarias]);

  // Carregar dados na abertura
  useEffect(() => {
    if (!isOpen) return;

    if (despesaToEdit) {
      setCategoria(despesaToEdit.categoria || 'Estruturais & Fiscais - Aluguel Pátio / Loja');
      setDescricao(despesaToEdit.descricao || '');
      setValor(despesaToEdit.valor ?? 0);
      setMesReferencia(despesaToEdit.mesReferencia || new Date().toISOString().slice(0, 7));
      setDataVencimento(despesaToEdit.dataVencimento || new Date().toISOString().split('T')[0]);
      setStatus(despesaToEdit.status || 'Pago');
      setSelectedFornecedorId(despesaToEdit.fornecedorId || '');
      setFornecedorNome(despesaToEdit.fornecedorNome || '');
      setDataPagamento(despesaToEdit.dataPagamento || despesaToEdit.dataVencimento || new Date().toISOString().split('T')[0]);
      setSelectedContaBancariaId(despesaToEdit.contaBancariaId || '');
      setFormaPagamento(despesaToEdit.formaPagamento || 'PIX');
      setNfNumero(despesaToEdit.nfNumero || '');
      setObservacoes(despesaToEdit.observacoes || '');
    } else {
      setCategoria('Estruturais & Fiscais - Aluguel Pátio / Loja');
      setDescricao('');
      setValor(1500);
      setMesReferencia(new Date().toISOString().slice(0, 7));
      const today = new Date().toISOString().split('T')[0];
      setDataVencimento(today);
      setDataPagamento(today);
      setStatus('Pago');
      setSelectedFornecedorId('');
      setFornecedorNome('');
      setSelectedContaBancariaId('');
      setFormaPagamento('PIX');
      setNfNumero('');
      setObservacoes('');
    }
    setIsCriandoCategoria(false);
    setNovaCategoriaInput('');
  }, [despesaToEdit, isOpen]);

  if (!isOpen) return null;

  const handleFornecedorChange = (fornId: string) => {
    setSelectedFornecedorId(fornId);
    if (!fornId || fornId === '__manual__') {
      if (fornId === '') setFornecedorNome('');
      return;
    }

    const forn = fornecedoresList.find((f) => f.id === fornId);
    if (forn) {
      setFornecedorNome(forn.nome);

      // Preenchimento inteligente baseado no parceiro
      if (forn.categoria === 'Agência de Tráfego / Marketing') {
        setCategoria('Marketing & Mídia - Mensalidade / Fee Fixo da Agência');
        if (!descricao) setDescricao(`Fee Mensal de Marketing - ${forn.nome}`);
        if (forn.valorContratoMensal && (!valor || valor === 1500)) {
          setValor(forn.valorContratoMensal);
        }
      }

      if (forn.diaVencimentoPagamento) {
        const [ano, mes] = mesReferencia.split('-');
        const diaStr = String(forn.diaVencimentoPagamento).padStart(2, '0');
        setDataVencimento(`${ano}-${mes}-${diaStr}`);
      }
    }
  };

  const handleSalvarNovaCategoria = (e: React.FormEvent) => {
    e.preventDefault();
    const nomeLimpo = novaCategoriaInput.trim();
    if (!nomeLimpo) return;

    if (!customCategorias.includes(nomeLimpo)) {
      const atualizadas = [...customCategorias, nomeLimpo];
      setCustomCategorias(atualizadas);
      try {
        localStorage.setItem(LOCAL_STORAGE_CUSTOM_CATEGORIES, JSON.stringify(atualizadas));
      } catch (err) {
        console.error('Erro ao salvar categoria customizada no storage:', err);
      }
    }
    setCategoria(nomeLimpo);
    setIsCriandoCategoria(false);
    setNovaCategoriaInput('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numVal = Number(valor);
    if (!descricao.trim() || numVal <= 0 || isNaN(numVal)) {
      alert('Por favor, preencha a descrição do lançamento e um valor válido.');
      return;
    }

    const selectedConta = contasBancariasList.find((c) => c.id === selectedContaBancariaId);

    const payload: Omit<DespesaFixa, 'id'> = {
      categoria,
      descricao: descricao.trim(),
      valor: numVal,
      mesReferencia,
      dataVencimento,
      status,
      fornecedorId: selectedFornecedorId && selectedFornecedorId !== '__manual__' ? selectedFornecedorId : undefined,
      fornecedorNome: fornecedorNome.trim() || undefined,
      dataPagamento: status === 'Pago' ? (dataPagamento || dataVencimento) : undefined,
      formaPagamento: status === 'Pago' ? formaPagamento : undefined,
      contaBancariaId: status === 'Pago' && selectedContaBancariaId ? selectedContaBancariaId : undefined,
      contaBancariaNome: status === 'Pago' && selectedConta ? selectedConta.nome : undefined,
      nfNumero: nfNumero.trim() || undefined,
      observacoes: observacoes.trim() || undefined,
    };

    await onSaveDespesaFixa(payload, despesaToEdit ? despesaToEdit.id : undefined);
    onClose();
  };

  const fornecedoresAtivos = fornecedoresList.filter((f) => f.status !== 'Inativo');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-xl max-h-[92vh] flex flex-col bg-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-white/10">
        {/* Header */}
        <div className="bg-[#16171f] text-white p-5 flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 font-bold shadow-md">
              <Building2 size={22} />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-white">
                {despesaToEdit ? 'Editar Despesa Operacional da Loja' : 'Nova Despesa Operacional da Loja'}
              </h3>
              <p className="text-xs text-slate-400">
                Custos fixos, insumos, copa, sócios e despesas administrativas (DRE Geral)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Separador de Informação sobre Chassi vs Loja */}
        <div className="px-5 py-2.5 bg-blue-500/10 border-b border-blue-500/20 flex items-center gap-2 text-blue-300 text-xs shrink-0">
          <Sparkles size={14} className="text-blue-400 shrink-0" />
          <span>
            <strong>Despesa Exclusiva da Empresa:</strong> Este lançamento não vincula chassi e entra na apuração do resultado operacional da loja.
          </span>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs">
            
            {/* Categoria com Seleção Agrupada e Criação Dinâmica (CreatableSelect) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-slate-300 font-bold flex items-center gap-1.5">
                  <Tag size={14} className="text-blue-400" />
                  Categoria de Despesa Operacional *
                </label>
                {!isCriandoCategoria && (
                  <button
                    type="button"
                    onClick={() => setIsCriandoCategoria(true)}
                    className="text-[11px] font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={13} /> Criar Nova Categoria
                  </button>
                )}
              </div>

              {isCriandoCategoria ? (
                <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl space-y-2 animate-fadeIn">
                  <div className="flex items-center justify-between text-blue-300 font-bold text-xs">
                    <span>Nova Categoria Personalizada</span>
                    <button
                      type="button"
                      onClick={() => setIsCriandoCategoria(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      autoFocus
                      placeholder="Ex: Insumos de Copa - Café Gourmet / Treinamento Equipe..."
                      value={novaCategoriaInput}
                      onChange={(e) => setNovaCategoriaInput(e.target.value)}
                      className="flex-1 p-2.5 rounded-xl border border-white/10 bg-[#16171f] text-slate-200 outline-none focus:border-blue-500 text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleSalvarNovaCategoria}
                      className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition cursor-pointer"
                    >
                      Adicionar
                    </button>
                  </div>
                </div>
              ) : (
                <select
                  value={categoria}
                  onChange={(e) => {
                    if (e.target.value === '__nova_categoria__') {
                      setIsCriandoCategoria(true);
                    } else {
                      setCategoria(e.target.value);
                    }
                  }}
                  className="w-full p-2.5 rounded-xl border border-white/10 font-semibold bg-[#16171f] text-slate-200 outline-none focus:border-blue-500"
                >
                  {/* Categorias Customizadas */}
                  {customCategorias.length > 0 && (
                    <optgroup label="⭐ Minhas Categorias Personalizadas">
                      {customCategorias.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </optgroup>
                  )}

                  {/* Grupos Padrão do Sistema */}
                  {GRUPOS_PADRAO.map((grupo) => (
                    <optgroup key={grupo.grupo} label={`${grupo.icone} ${grupo.grupo}`}>
                      {grupo.itens.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </optgroup>
                  ))}

                  <option value="__nova_categoria__">➕ + Criar Outra Categoria Dinâmica...</option>
                </select>
              )}
            </div>

            {/* Descrição do Lançamento */}
            <div>
              <label className="block text-slate-300 font-bold mb-1">
                Descrição do Lançamento / Detalhes *
              </label>
              <input
                type="text"
                required
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Ex: Compra de café, água e descartáveis para a copa da recepção"
                className="w-full p-2.5 rounded-xl border border-white/10 font-medium bg-[#16171f] text-slate-200 outline-none focus:border-blue-500"
              />
            </div>

            {/* Fornecedor / Favorecido (Opcional) */}
            <div className="p-3.5 bg-white/[0.02] border border-white/10 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="block text-slate-300 font-bold flex items-center gap-1.5">
                  <Building2 size={15} className="text-blue-400" />
                  Fornecedor / Favorecido do Pagamento
                </label>
                <span className="text-[10px] text-slate-400">Contas a Pagar por Parceiro</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">Buscar Parceiro Homologado:</label>
                  <select
                    value={selectedFornecedorId}
                    onChange={(e) => handleFornecedorChange(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-white/10 bg-[#16171f] text-slate-200 outline-none focus:border-blue-500 text-xs font-semibold"
                  >
                    <option value="">-- Sem vínculo / Favorecido Avulso --</option>
                    {fornecedoresAtivos.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.nome} ({f.categoria}) {f.tipoCobranca === 'Fixo Mensal' ? '• [Fixo]' : ''}
                      </option>
                    ))}
                    <option value="__manual__">✍️ Outro (Digitar Nome Manualmente)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">Nome do Favorecido / Empresa:</label>
                  <input
                    type="text"
                    value={fornecedorNome}
                    onChange={(e) => {
                      setFornecedorNome(e.target.value);
                      if (selectedFornecedorId !== '__manual__' && selectedFornecedorId !== '') {
                        setSelectedFornecedorId('__manual__');
                      }
                    }}
                    placeholder="Ex: Atacadista Assaí, Copel, Imobiliária Silva..."
                    className="w-full p-2.5 rounded-xl border border-white/10 font-medium bg-[#16171f] text-slate-200 outline-none focus:border-blue-500 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Valor, Mês de Referência e Data de Vencimento */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Valor da Despesa (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-white/10 font-black text-sm bg-[#16171f] text-emerald-400 font-mono outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Mês de Competência *</label>
                <input
                  type="month"
                  required
                  value={mesReferencia}
                  onChange={(e) => setMesReferencia(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-white/10 font-medium bg-[#16171f] text-slate-200 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Data de Vencimento *</label>
                <input
                  type="date"
                  required
                  value={dataVencimento}
                  onChange={(e) => setDataVencimento(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-white/10 font-medium bg-[#16171f] text-slate-200 outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>

            {/* Status do Pagamento (Pago vs Pendente) */}
            <div className="p-4 bg-white/[0.02] border border-white/10 rounded-2xl space-y-3.5">
              <div className="flex items-center justify-between">
                <label className="block text-slate-300 font-bold flex items-center gap-1.5">
                  <CreditCard size={15} className="text-emerald-400" />
                  Status do Pagamento *
                </label>
                <span className="text-[10px] text-slate-400">Contas a Pagar / DRE</span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setStatus('Pago')}
                  className={`p-3 rounded-xl flex items-center justify-center gap-2 font-bold text-xs border transition cursor-pointer ${
                    status === 'Pago'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                      : 'bg-black/30 text-slate-400 border-white/10 hover:bg-white/5'
                  }`}
                >
                  <CheckCircle2 size={16} className={status === 'Pago' ? 'text-emerald-400' : 'text-slate-500'} />
                  ✓ Pago (Quitado)
                </button>

                <button
                  type="button"
                  onClick={() => setStatus('Pendente')}
                  className={`p-3 rounded-xl flex items-center justify-center gap-2 font-bold text-xs border transition cursor-pointer ${
                    status === 'Pendente'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                      : 'bg-black/30 text-slate-400 border-white/10 hover:bg-white/5'
                  }`}
                >
                  <Clock size={16} className={status === 'Pendente' ? 'text-amber-400' : 'text-slate-500'} />
                  ⏳ Pendente (A Pagar)
                </button>
              </div>

              {/* Se Pago: Detalhes de Baixa e Conta Bancária */}
              {status === 'Pago' ? (
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 size={15} /> Detalhes da Quitação
                    </span>
                    <span className="text-[10px] text-emerald-300/80 font-normal">
                      Bancos & Caixa (Opcional)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 text-[11px] mb-1 font-semibold">
                        Data da Quitação *
                      </label>
                      <input
                        type="date"
                        required
                        value={dataPagamento}
                        onChange={(e) => setDataPagamento(e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-white/10 bg-[#16171f] text-slate-200 text-xs outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 text-[11px] mb-1 font-semibold">
                        Forma de Pagamento
                      </label>
                      <select
                        value={formaPagamento}
                        onChange={(e) => setFormaPagamento(e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-white/10 bg-[#16171f] text-slate-200 text-xs outline-none focus:border-emerald-500"
                      >
                        <option value="PIX">PIX</option>
                        <option value="Boleto Bancário">Boleto Bancário</option>
                        <option value="Transferência Bancária">Transferência TED/DOC</option>
                        <option value="Débito Automático">Débito Automático</option>
                        <option value="Cartão de Crédito">Cartão de Crédito</option>
                        <option value="Cartão de Débito">Cartão de Débito</option>
                        <option value="Dinheiro / Espécie">Dinheiro / Caixa Físico</option>
                        <option value="Cheque">Cheque</option>
                        <option value="Outro">Outro</option>
                      </select>
                    </div>
                  </div>

                  {/* Conta Bancária */}
                  <div>
                    <label className="block text-slate-300 text-[11px] mb-1 font-semibold flex items-center gap-1.5">
                      <Wallet size={13} className="text-emerald-400" />
                      Conta Bancária / Caixa de Débito (Opcional)
                    </label>
                    <select
                      value={selectedContaBancariaId}
                      onChange={(e) => setSelectedContaBancariaId(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-white/10 bg-[#16171f] text-slate-200 text-xs font-semibold outline-none focus:border-emerald-500"
                    >
                      <option value="">-- Sem débito bancário imediato (Apenas registro no DRE) --</option>
                      {contasBancariasList.map((c) => (
                        <option key={c.id} value={c.id}>
                          🏦 {c.nome} ({c.banco || c.tipo}) — Saldo: R$ {Number(c.saldoAtual || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-amber-200 text-xs animate-fadeIn">
                  <Clock size={16} className="shrink-0 text-amber-400 mt-0.5" />
                  <div>
                    <strong className="text-amber-300">Despesa Pendente no Contas a Pagar:</strong>
                    <p className="text-[11px] text-amber-200/80 mt-0.5">
                      Ficará listada na aba de <strong>Contas a Pagar</strong> da loja com vencimento em {dataVencimento}.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* NF / Recibo e Observações */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-bold mb-1 flex items-center gap-1.5">
                  <Receipt size={14} className="text-slate-400" />
                  Nº Documento / Nota Fiscal (Opcional)
                </label>
                <input
                  type="text"
                  value={nfNumero}
                  onChange={(e) => setNfNumero(e.target.value)}
                  placeholder="Ex: NF-e 88392 ou Código de Barras"
                  className="w-full p-2.5 rounded-xl border border-white/10 font-mono bg-[#16171f] text-slate-200 outline-none focus:border-blue-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Observações Adicionais (Opcional)
                </label>
                <input
                  type="text"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Ex: Refaturado c/ desconto, parcelamento 1/3..."
                  className="w-full p-2.5 rounded-xl border border-white/10 font-medium bg-[#16171f] text-slate-200 outline-none focus:border-blue-500 text-xs"
                />
              </div>
            </div>

          </div>

          {/* Footer Actions */}
          <div className="p-4 sm:p-5 border-t border-white/10 bg-[#16171f] flex items-center justify-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-white text-xs shadow-lg shadow-blue-600/30 transition flex items-center gap-2 cursor-pointer"
            >
              <Building2 size={15} />
              {despesaToEdit ? 'Atualizar Despesa da Loja' : 'Salvar Despesa Operacional'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
