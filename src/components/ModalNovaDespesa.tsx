import React, { useState, useEffect } from 'react';
import { 
  X, 
  DollarSign, 
  Receipt, 
  Car, 
  Tag, 
  UserCheck, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Building2, 
  CreditCard, 
  FileText,
  Calendar,
  Wallet,
  ShieldCheck,
  Fuel,
  Gauge
} from 'lucide-react';
import { 
  Veiculo, 
  CategoriaDespesa, 
  DespesaVeiculo, 
  Usuario, 
  FornecedorPrestador, 
  ContaBancariaCaixa 
} from '../types';
import { subscribeFornecedores, subscribeContasBancarias } from '../services/firestoreService';

interface ModalNovaDespesaProps {
  isOpen: boolean;
  onClose: () => void;
  veiculos: Veiculo[];
  defaultVeiculo?: Veiculo | null;
  despesaToEdit?: DespesaVeiculo | null;
  usuarios?: Usuario[];
  fornecedores?: FornecedorPrestador[];
  contasBancarias?: ContaBancariaCaixa[];
  onSaveDespesa: (
    veiculoIdOrData: string | Omit<DespesaVeiculo, 'id'>,
    despesaData?: Omit<DespesaVeiculo, 'id'>,
    despesaId?: string
  ) => void;
}

const CATEGORIAS_DESPESA: { value: CategoriaDespesa; label: string }[] = [
  { value: 'Peças', label: '🔧 Peças' },
  { value: 'Mecânica / Mão de Obra', label: '⚙️ Mecânica / Mão de Obra' },
  { value: 'Funilaria / Pintura', label: '🎨 Funilaria / Pintura' },
  { value: 'Estética / Lavagem', label: '✨ Estética / Lavagem' },
  { value: 'Pneus', label: '🛞 Pneus' },
  { value: 'Cartório / Serviços Notariais', label: '🏛️ Cartório / Serviços Notariais (No Ato da Venda)' },
  { value: 'Documentação / Despachante', label: '📄 Documentação / Despachante (No Ato da Venda)' },
  { value: 'Taxas de Origem / Leilão', label: '📑 Taxas de Origem / Leilão' },
  { value: 'IPVA / Licenciamento', label: '💳 IPVA / Licenciamento' },
  { value: 'Combustível', label: '⛽ Combustível / Abastecimento' },
  { value: 'Frete / Transporte', label: '🚚 Frete / Transporte (Cegonha/Guincho)' },
  { value: 'Frete / Guincho', label: '🛞 Frete / Guincho Local' },
  { value: 'Anúncio Patrocinado (Meta/Google Ads)', label: '🚀 Anúncio Patrocinado do Veículo' },
  { value: 'Comissão', label: '⭐ Comissão de Venda (No Ato da Venda)' },
  { value: 'Repasse de Lucro - Parceiro', label: '🤝 Repasse de Lucro - Parceiro' },
  { value: 'Outros', label: '📦 Outros Custos Diretos do Chassi' },
];

export const ModalNovaDespesa: React.FC<ModalNovaDespesaProps> = ({
  isOpen,
  onClose,
  veiculos,
  defaultVeiculo,
  despesaToEdit,
  usuarios = [],
  fornecedores: initialFornecedores,
  contasBancarias: initialContasBancarias,
  onSaveDespesa,
}) => {
  const isEditing = Boolean(despesaToEdit);

  // Listas dinâmicas
  const [fornecedoresList, setFornecedoresList] = useState<FornecedorPrestador[]>(initialFornecedores || []);
  const [contasBancariasList, setContasBancariasList] = useState<ContaBancariaCaixa[]>(initialContasBancarias || []);

  // Form State
  const [selectedVeiculoId, setSelectedVeiculoId] = useState<string>('');
  const [categoria, setCategoria] = useState<CategoriaDespesa>('Peças');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState<number | string>(350);
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  
  // Fornecedor / Parceiro
  const [selectedFornecedorId, setSelectedFornecedorId] = useState<string>('');
  const [fornecedor, setFornecedor] = useState('');
  const [nfNumero, setNfNumero] = useState('');
  
  // Status de Pagamento, Exigibilidade e Liquidação Bancária
  const [statusPagamento, setStatusPagamento] = useState<'Pago' | 'Pendente'>('Pago');
  const [exigibilidade, setExigibilidade] = useState<'imediata' | 'no_ato_venda'>('imediata');
  const [dataVencimento, setDataVencimento] = useState<string>('');
  const [dataPagamento, setDataPagamento] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedContaBancariaId, setSelectedContaBancariaId] = useState<string>('');
  const [formaPagamento, setFormaPagamento] = useState<string>('PIX');

  // Campos específicos de Comissão
  const [modoVinculoComissao, setModoVinculoComissao] = useState<'previsao_generica' | 'usuario_sistema' | 'externo'>('previsao_generica');
  const [beneficiarioUsuarioId, setBeneficiarioUsuarioId] = useState<string>('');
  const [beneficiarioNome, setBeneficiarioNome] = useState<string>('');
  const [observacaoPagamento, setObservacaoPagamento] = useState<string>('');

  // Campos específicos de Combustível / Abastecimento
  const [litrosAbastecidos, setLitrosAbastecidos] = useState<number | string>('');
  const [kmAbastecimento, setKmAbastecimento] = useState<number | string>('');
  const [responsavelAbastecimento, setResponsavelAbastecimento] = useState<string>('');
  const [motivoSaidaAbastecimento, setMotivoSaidaAbastecimento] = useState<string>('Revisão / Oficina');
  const [tipoCombustivelAbastecido, setTipoCombustivelAbastecido] = useState<string>('Gasolina Comum');

  // Subscrição em tempo real de Fornecedores e Contas Bancárias caso não fornecidas via props
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

  // Inicialização do formulário
  useEffect(() => {
    if (!isOpen) return;

    if (despesaToEdit) {
      setSelectedVeiculoId(despesaToEdit.veiculoId);
      setCategoria(despesaToEdit.categoria || 'Peças');
      setDescricao(despesaToEdit.descricao || '');
      setValor(despesaToEdit.valor ?? 0);
      setData(despesaToEdit.data || new Date().toISOString().split('T')[0]);
      setFornecedor(despesaToEdit.fornecedor || '');
      setSelectedFornecedorId(despesaToEdit.fornecedorId || '');
      setNfNumero(despesaToEdit.nfNumero || '');
      const editExig =
        despesaToEdit.exigibilidade ||
        (['Cartório / Serviços Notariais', 'Documentação / Despachante', 'Comissão'].includes(despesaToEdit.categoria)
          ? 'no_ato_venda'
          : 'imediata');
      setExigibilidade(editExig);
      setStatusPagamento(despesaToEdit.statusPagamento || (editExig === 'no_ato_venda' ? 'Pendente' : 'Pago'));
      setDataVencimento(despesaToEdit.dataVencimento || '');
      setDataPagamento(despesaToEdit.dataPagamento || despesaToEdit.data || new Date().toISOString().split('T')[0]);
      setSelectedContaBancariaId(despesaToEdit.contaBancariaId || '');
      setFormaPagamento(despesaToEdit.formaPagamento || 'PIX');

      // Campos de combustível
      setLitrosAbastecidos(despesaToEdit.litrosAbastecidos || '');
      setKmAbastecimento(despesaToEdit.kmAbastecimento || '');
      setResponsavelAbastecimento(despesaToEdit.responsavelAbastecimento || '');
      setMotivoSaidaAbastecimento(despesaToEdit.motivoSaidaAbastecimento || 'Revisão / Oficina');
      setTipoCombustivelAbastecido(despesaToEdit.tipoCombustivelAbastecido || 'Gasolina Comum');

      if (despesaToEdit.categoria === 'Comissão' || despesaToEdit.beneficiarioNome || despesaToEdit.beneficiarioUsuarioId) {
        if (despesaToEdit.tipoComissaoOrigem === 'previsao_generica') {
          setModoVinculoComissao('previsao_generica');
        } else if (despesaToEdit.beneficiarioUsuarioId) {
          setModoVinculoComissao('usuario_sistema');
        } else {
          setModoVinculoComissao('externo');
        }
        setBeneficiarioUsuarioId(despesaToEdit.beneficiarioUsuarioId || '');
        setBeneficiarioNome(despesaToEdit.beneficiarioNome || '');
        setObservacaoPagamento(despesaToEdit.observacaoPagamento || '');
      }
    } else {
      // Nova Despesa
      if (defaultVeiculo) {
        setSelectedVeiculoId(defaultVeiculo.id);
        setKmAbastecimento(defaultVeiculo.kmAtual || '');
      } else if (veiculos.length > 0 && !selectedVeiculoId) {
        setSelectedVeiculoId(veiculos[0].id);
        setKmAbastecimento(veiculos[0].kmAtual || '');
      }
      setCategoria('Peças');
      setDescricao('');
      setValor(350);
      const today = new Date().toISOString().split('T')[0];
      setData(today);
      setDataPagamento(today);
      setDataVencimento('');
      setExigibilidade('imediata');
      setSelectedFornecedorId('');
      setFornecedor('');
      setNfNumero('');
      setStatusPagamento('Pago');
      setSelectedContaBancariaId('');
      setFormaPagamento('PIX');
      setModoVinculoComissao('previsao_generica');
      setBeneficiarioUsuarioId('');
      setBeneficiarioNome('');
      setObservacaoPagamento('');
      setLitrosAbastecidos('');
      setResponsavelAbastecimento('');
      setMotivoSaidaAbastecimento('Revisão / Oficina');
      setTipoCombustivelAbastecido('Gasolina Comum');
    }
  }, [defaultVeiculo, veiculos, despesaToEdit, isOpen, usuarios]);

  if (!isOpen) return null;

  const currentVeiculo = veiculos.find((v) => v.id === selectedVeiculoId);
  const fornecedoresAtivos = fornecedoresList.filter((f) => f.status !== 'Inativo');

  const handleFornecedorSelectChange = (val: string) => {
    setSelectedFornecedorId(val);
    if (!val || val === '__manual__') {
      if (val === '') setFornecedor('');
      return;
    }
    const found = fornecedoresList.find((f) => f.id === val);
    if (found) {
      setFornecedor(found.nome);
      // Mapeamento automático de categoria se aplicável
      if (found.categoria === 'Posto de Combustível') {
        setCategoria('Combustível');
        if (!descricao || descricao === 'Troca de pastilhas dianteiras e fluido de freio') {
          setDescricao(`Abastecimento em ${found.nome}`);
        }
      } else if (found.categoria === 'Cartório / Serviços Notariais') {
        setCategoria('Cartório / Serviços Notariais');
        setExigibilidade('no_ato_venda');
        setStatusPagamento('Pendente');
      } else if (found.categoria === 'Oficina Mecânica') {
        setCategoria('Mecânica / Mão de Obra');
      } else if (found.categoria === 'Autopeças') {
        setCategoria('Peças');
      } else if (found.categoria === 'Funilaria e Pintura') {
        setCategoria('Funilaria / Pintura');
      } else if (found.categoria === 'Despachante') {
        setCategoria('Documentação / Despachante');
        setExigibilidade('no_ato_venda');
        setStatusPagamento('Pendente');
      } else if (found.categoria === 'Lava Jato / Estética Automotiva') {
        setCategoria('Estética / Lavagem');
      } else if (found.categoria === 'Pneus / Borracharia') {
        setCategoria('Pneus');
      } else if (found.categoria === 'Guincho / Reboque') {
        setCategoria('Frete / Guincho');
      }
    }
  };

  const handleCategoriaChange = (newCat: CategoriaDespesa) => {
    setCategoria(newCat);
    if (newCat === 'Cartório / Serviços Notariais' || newCat === 'Documentação / Despachante' || newCat === 'Comissão') {
      setExigibilidade('no_ato_venda');
      setStatusPagamento('Pendente');
    }
    if (newCat === 'Combustível') {
      if (!descricao || descricao === 'Troca de pastilhas dianteiras e fluido de freio') {
        setDescricao('Abastecimento de Combustível');
      }
      if (currentVeiculo && !kmAbastecimento) {
        setKmAbastecimento(currentVeiculo.kmAtual || 0);
      }
    } else if (newCat === 'Comissão') {
      if (!descricao || descricao === 'Troca de pastilhas dianteiras e fluido de freio') {
        setDescricao('Comissão Prevista de Venda / Negociação');
      }
      if (!fornecedor) {
        setFornecedor('Provisão de Comissão de Venda');
      }
    }
  };

  const handleSelectUsuario = (uid: string) => {
    setBeneficiarioUsuarioId(uid);
    const u = usuarios.find((item) => item.uid === uid);
    if (u) {
      const nome = u.displayName || u.email;
      setBeneficiarioNome(nome);
      setFornecedor(nome);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numVal = Number(valor);
    if (!selectedVeiculoId || !descricao.trim() || numVal <= 0 || isNaN(numVal)) {
      alert('Por favor preencha todos os campos obrigatórios com valores válidos.');
      return;
    }

    if (!currentVeiculo) {
      alert('Selecione um veículo válido para vincular a despesa.');
      return;
    }

    const selectedConta = contasBancariasList.find((c) => c.id === selectedContaBancariaId);

    const payload: Omit<DespesaVeiculo, 'id'> = {
      veiculoId: selectedVeiculoId,
      chassi: currentVeiculo.chassi,
      placa: currentVeiculo.placa,
      categoria,
      descricao: descricao.trim(),
      valor: numVal,
      data,
      exigibilidade,
      dataVencimento: dataVencimento || undefined,
      fornecedor: (categoria === 'Comissão' ? (beneficiarioNome || fornecedor) : fornecedor) || 'Oficina / Fornecedor Parceiro',
      fornecedorId: selectedFornecedorId && selectedFornecedorId !== '__manual__' ? selectedFornecedorId : undefined,
      nfNumero: nfNumero.trim() || undefined,
      statusPagamento,
      dataPagamento: statusPagamento === 'Pago' ? (dataPagamento || data) : undefined,
      contaBancariaId: statusPagamento === 'Pago' && selectedContaBancariaId ? selectedContaBancariaId : undefined,
      contaBancariaNome: statusPagamento === 'Pago' && selectedConta ? selectedConta.nome : undefined,
      formaPagamento: statusPagamento === 'Pago' ? formaPagamento : undefined,
    };

    if (categoria === 'Combustível') {
      const litrosNum = Number(litrosAbastecidos);
      const kmNum = Number(kmAbastecimento);
      if (litrosNum > 0) {
        payload.litrosAbastecidos = litrosNum;
        payload.valorPorLitro = numVal / litrosNum;
      }
      if (kmNum > 0) {
        payload.kmAbastecimento = kmNum;
      }
      if (responsavelAbastecimento) {
        payload.responsavelAbastecimento = responsavelAbastecimento.trim();
      }
      if (motivoSaidaAbastecimento) {
        payload.motivoSaidaAbastecimento = motivoSaidaAbastecimento.trim();
      }
      if (tipoCombustivelAbastecido) {
        payload.tipoCombustivelAbastecido = tipoCombustivelAbastecido;
      }
    }

    if (categoria === 'Comissão') {
      if (modoVinculoComissao === 'previsao_generica') {
        payload.tipoComissaoOrigem = 'previsao_generica';
        payload.beneficiarioUsuarioId = undefined;
        payload.beneficiarioNome = beneficiarioNome.trim() || 'Previsão de Comissão de Venda (Loja / Terceiro)';
        payload.beneficiarioEmail = undefined;
      } else if (modoVinculoComissao === 'usuario_sistema') {
        payload.tipoComissaoOrigem = 'manual_usuario';
        payload.beneficiarioUsuarioId = beneficiarioUsuarioId || undefined;
        const u = usuarios.find((item) => item.uid === beneficiarioUsuarioId);
        payload.beneficiarioNome = u?.displayName || u?.email || beneficiarioNome.trim() || 'Vendedor do Sistema';
        payload.beneficiarioEmail = u?.email;
      } else {
        payload.tipoComissaoOrigem = undefined;
        payload.beneficiarioUsuarioId = undefined;
        payload.beneficiarioNome = beneficiarioNome.trim() || 'Vendedor Externo / Parceiro';
        payload.beneficiarioEmail = undefined;
      }

      if (statusPagamento === 'Pago') {
        payload.dataPagamento = dataPagamento || data;
        payload.formaPagamento = formaPagamento;
        payload.observacaoPagamento = observacaoPagamento.trim() || undefined;
      }
    }

    onSaveDespesa(selectedVeiculoId, payload, despesaToEdit ? despesaToEdit.id : undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-xl max-h-[92vh] flex flex-col bg-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-white/10">
        {/* Header */}
        <div className="bg-[#16171f] text-white p-5 flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-md ${categoria === 'Comissão' ? 'bg-amber-600' : 'bg-orange-600'}`}>
              <DollarSign size={22} />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg">
                {isEditing ? 'Editar Despesa do Veículo' : 'Lançar Despesa / Custo no Veículo'}
              </h3>
              <p className="text-xs text-slate-400">
                {categoria === 'Comissão'
                  ? 'Vincule a comissão a um vendedor/usuário e defina se está Paga ou Pendente de quitação'
                  : 'Esta despesa será somada ao custo de preparação do veículo selecionado.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs">
            {/* Veículo Selector */}
            <div>
              <label className="block text-slate-300 font-bold mb-1">
                Selecione o Veículo / Chassi *
              </label>
              <select
                value={selectedVeiculoId}
                onChange={(e) => setSelectedVeiculoId(e.target.value)}
                disabled={isEditing}
                className="w-full p-2.5 rounded-xl border border-white/10 font-bold text-sm bg-[#16171f] text-slate-200 outline-none focus:border-blue-500 disabled:opacity-60"
              >
                {veiculos.map((v) => (
                  <option key={v.id} value={v.id} className="bg-[#16171f] text-slate-200">
                    {v.placa} - {v.modelo} (Chassi: {v.chassi ? v.chassi.slice(0, 8) : 'S/N'}...)
                  </option>
                ))}
              </select>
              {currentVeiculo && (
                <p className="text-[11px] text-slate-400 font-mono mt-1">
                  Chassi: <strong className="text-slate-200">{currentVeiculo.chassi}</strong> | Placa: <strong className="text-emerald-400">{currentVeiculo.placa}</strong>
                </p>
              )}
            </div>

            {/* Categoria e Valor */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Categoria da Despesa *</label>
                <select
                  value={categoria}
                  onChange={(e) => handleCategoriaChange(e.target.value as CategoriaDespesa)}
                  className="w-full p-2.5 rounded-xl border border-white/10 font-semibold bg-[#16171f] text-slate-200 outline-none focus:border-blue-500"
                >
                  {CATEGORIAS_DESPESA.map((cat) => (
                    <option key={cat.value} value={cat.value} className="bg-[#16171f] text-slate-200">
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Valor da Despesa (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-white/10 font-black text-base bg-[#16171f] text-emerald-400 font-mono outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Seção Especial para Comissão */}
            {categoria === 'Comissão' && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between pb-2 border-b border-amber-500/20">
                  <div className="flex items-center gap-2">
                    <UserCheck size={16} className="text-amber-400" />
                    <span className="font-bold text-amber-300 uppercase tracking-wide text-xs">
                      Vínculo do Beneficiário da Comissão
                    </span>
                  </div>
                  <span className="text-[10px] text-amber-200/70 font-medium">Controle de Quitação</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setModoVinculoComissao('previsao_generica');
                      setBeneficiarioNome('Previsão de Comissão de Venda');
                      setFornecedor('Provisão de Comissão de Venda');
                    }}
                    className={`p-2.5 rounded-xl text-center font-bold text-xs border transition cursor-pointer ${
                      modoVinculoComissao === 'previsao_generica'
                        ? 'bg-amber-500 text-black border-amber-400 shadow-sm'
                        : 'bg-black/30 text-slate-300 border-white/10 hover:bg-white/5'
                    }`}
                  >
                    📊 Previsão Genérica
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setModoVinculoComissao('usuario_sistema');
                      if (usuarios.length > 0) {
                        const u = usuarios[0];
                        setBeneficiarioUsuarioId(u.uid);
                        setBeneficiarioNome(u.displayName || u.email);
                        setFornecedor(u.displayName || u.email);
                      }
                    }}
                    className={`p-2.5 rounded-xl text-center font-bold text-xs border transition cursor-pointer ${
                      modoVinculoComissao === 'usuario_sistema'
                        ? 'bg-amber-500 text-black border-amber-400 shadow-sm'
                        : 'bg-black/30 text-slate-300 border-white/10 hover:bg-white/5'
                    }`}
                  >
                    👤 Vendedor Cadastrado
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setModoVinculoComissao('externo');
                      setBeneficiarioNome('');
                      setFornecedor('');
                    }}
                    className={`p-2.5 rounded-xl text-center font-bold text-xs border transition cursor-pointer ${
                      modoVinculoComissao === 'externo'
                        ? 'bg-amber-500 text-black border-amber-400 shadow-sm'
                        : 'bg-black/30 text-slate-300 border-white/10 hover:bg-white/5'
                    }`}
                  >
                    💼 Vendedor Externo
                  </button>
                </div>

                {modoVinculoComissao === 'previsao_generica' ? (
                  <div className="p-3 bg-black/40 border border-white/10 rounded-xl space-y-1">
                    <div className="text-slate-300 font-bold text-xs">
                      Previsão de Custo sem Usuário Vinculado
                    </div>
                    <p className="text-[11px] text-slate-400">
                      O valor será debitado do lucro e comporá o DRE como previsão de despesa comercial da loja.
                    </p>
                  </div>
                ) : modoVinculoComissao === 'usuario_sistema' ? (
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">
                      Selecione o Usuário / Vendedor:
                    </label>
                    {usuarios.length > 0 ? (
                      <select
                        value={beneficiarioUsuarioId}
                        onChange={(e) => handleSelectUsuario(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-amber-500/30 bg-[#16171f] text-slate-200 font-bold outline-none focus:border-amber-400"
                      >
                        {usuarios.map((u) => (
                          <option key={u.uid} value={u.uid} className="bg-[#16171f] text-slate-200">
                            {u.displayName || u.email} ({u.role ? u.role.toUpperCase() : 'USUÁRIO'})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="p-2.5 bg-black/40 border border-white/10 rounded-xl text-slate-400 text-xs">
                        Nenhum usuário cadastrado encontrado. Você pode digitar o nome no modo Externo.
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">
                      Nome do Beneficiário / Parceiro Externo:
                    </label>
                    <input
                      type="text"
                      required
                      value={beneficiarioNome}
                      onChange={(e) => {
                        setBeneficiarioNome(e.target.value);
                        setFornecedor(e.target.value);
                      }}
                      placeholder="Ex: Carlos Eduardo (Indicação Externa)"
                      className="w-full p-2.5 rounded-xl border border-amber-500/30 bg-[#16171f] text-slate-200 font-medium outline-none focus:border-amber-400"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Seção Especial para Combustível / Abastecimento */}
            {categoria === 'Combustível' && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between pb-2 border-b border-amber-500/20">
                  <div className="flex items-center gap-2">
                    <Fuel size={16} className="text-amber-400" />
                    <span className="font-bold text-amber-300 uppercase tracking-wide text-xs">
                      Dados do Abastecimento
                    </span>
                  </div>
                  <span className="text-[10px] text-amber-200/70 font-medium">Controle de Frota</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Litros Abastecidos</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.1"
                      placeholder="Ex: 35.50"
                      value={litrosAbastecidos}
                      onChange={(e) => {
                        const l = e.target.value;
                        setLitrosAbastecidos(l);
                        if (Number(l) > 0 && Number(valor) > 0) {
                          // Info apenas
                        }
                      }}
                      className="w-full p-2.5 rounded-xl border border-white/10 bg-[#16171f] text-amber-400 font-bold outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">KM Atual no Odômetro</label>
                    <input
                      type="number"
                      placeholder="Ex: 45200"
                      value={kmAbastecimento}
                      onChange={(e) => setKmAbastecimento(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-white/10 bg-[#16171f] text-slate-200 font-bold outline-none focus:border-blue-400"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Tipo de Combustível</label>
                    <select
                      value={tipoCombustivelAbastecido}
                      onChange={(e) => setTipoCombustivelAbastecido(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-white/10 bg-[#16171f] text-slate-200 font-bold outline-none focus:border-amber-400"
                    >
                      <option value="Gasolina Comum">Gasolina Comum</option>
                      <option value="Gasolina Aditivada">Gasolina Aditivada</option>
                      <option value="Etanol">Etanol</option>
                      <option value="Diesel S10">Diesel S10</option>
                      <option value="GNV">GNV</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Motivo da Saída / Abastecimento</label>
                    <select
                      value={motivoSaidaAbastecimento}
                      onChange={(e) => setMotivoSaidaAbastecimento(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-white/10 bg-[#16171f] text-slate-200 font-semibold outline-none focus:border-amber-400"
                    >
                      <option value="Revisão Mecânica / Oficina">Revisão Mecânica / Oficina</option>
                      <option value="Lava-jato / Estética">Lava-jato / Estética</option>
                      <option value="Test Drive com Cliente">Test Drive com Cliente</option>
                      <option value="Transferência de Pátio / Showroom">Transferência de Pátio / Showroom</option>
                      <option value="Entrega ao Comprador">Entrega ao Comprador</option>
                      <option value="Outro Motivo">Outro Motivo</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Responsável / Condutor</label>
                    <input
                      type="text"
                      placeholder="Ex: Motorista Paulo / Vendedor Lucas"
                      value={responsavelAbastecimento}
                      onChange={(e) => setResponsavelAbastecimento(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-white/10 bg-[#16171f] text-slate-200 font-semibold outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Descrição */}
            <div>
              <label className="block text-slate-300 font-bold mb-1">Descrição do Serviço / Despesa *</label>
              <input
                type="text"
                required
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Ex: Troca de pastilhas dianteiras, autenticação em cartório, etc."
                className="w-full p-2.5 rounded-xl border border-white/10 font-medium bg-[#16171f] text-slate-200 outline-none focus:border-blue-500"
              />
            </div>

            {/* Fornecedor (Select Opcional + Campo de Texto) */}
            {categoria !== 'Comissão' && (
              <div className="p-3.5 bg-white/[0.02] border border-white/10 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-300 font-bold flex items-center gap-1.5">
                    <Building2 size={15} className="text-blue-400" />
                    Fornecedor / Prestador de Serviços (Opcional)
                  </label>
                  <span className="text-[10px] text-slate-400">Coleção de Parceiros</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Buscar Parceiro Cadastrado:</label>
                    <select
                      value={selectedFornecedorId}
                      onChange={(e) => handleFornecedorSelectChange(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-white/10 bg-[#16171f] text-slate-200 outline-none focus:border-blue-500 text-xs font-semibold"
                    >
                      <option value="">-- Selecionar Parceiro Ativo (Opcional) --</option>
                      {fornecedoresAtivos.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.nome} ({f.categoria})
                        </option>
                      ))}
                      <option value="__manual__">✍️ Outro (Digitar Nome Manualmente)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Nome do Fornecedor / Oficina:</label>
                    <input
                      type="text"
                      value={fornecedor}
                      onChange={(e) => {
                        setFornecedor(e.target.value);
                        if (selectedFornecedorId !== '__manual__' && selectedFornecedorId !== '') {
                          setSelectedFornecedorId('__manual__');
                        }
                      }}
                      placeholder="Ex: Cartório 1º Ofício, Auto Peças Express..."
                      className="w-full p-2.5 rounded-xl border border-white/10 font-medium bg-[#16171f] text-slate-200 outline-none focus:border-blue-500 text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Nota Fiscal / Recibo e Data da Despesa */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-slate-300 font-bold mb-1 flex items-center gap-1.5">
                  <Receipt size={14} className="text-slate-400" />
                  Nota Fiscal / Recibo (Opcional)
                </label>
                <input
                  type="text"
                  value={nfNumero}
                  onChange={(e) => setNfNumero(e.target.value)}
                  placeholder="Ex: NF-10492 ou Nº Recibo"
                  className="w-full p-2.5 rounded-xl border border-white/10 font-mono bg-[#16171f] text-slate-200 outline-none focus:border-blue-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1 flex items-center gap-1.5">
                  <Calendar size={14} className="text-slate-400" />
                  Data da Despesa / Competência *
                </label>
                <input
                  type="date"
                  required
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-white/10 font-medium bg-[#16171f] text-slate-200 outline-none focus:border-blue-500 text-xs"
                />
              </div>
            </div>

            {/* Seletor de Status de Pagamento (Pendente vs Pago) */}
            <div className="p-4 bg-white/[0.02] border border-white/10 rounded-2xl space-y-3.5">
              <div className="flex items-center justify-between">
                <label className="block text-slate-300 font-bold flex items-center gap-1.5">
                  <CreditCard size={15} className="text-emerald-400" />
                  Status Financeiro & Vencimento *
                </label>
                <span className="text-[10px] text-slate-400">Contas a Pagar / Liquidação</span>
              </div>

              {/* Exigibilidade / Vencimento do Pagamento */}
              <div className="p-3.5 bg-black/30 border border-white/10 rounded-xl space-y-2.5">
                <label className="block text-slate-300 font-bold text-xs flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Calendar size={14} className="text-blue-400" />
                    Exigibilidade / Regra de Vencimento
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">Contas a Pagar</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setExigibilidade('imediata');
                    }}
                    className={`p-3 rounded-xl text-left border transition cursor-pointer flex flex-col justify-between ${
                      exigibilidade === 'imediata'
                        ? 'bg-blue-600/20 border-blue-500/60 text-white shadow-sm'
                        : 'bg-black/20 text-slate-400 border-white/5 hover:bg-white/5'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center gap-1.5 text-blue-300">
                      ⚡ Imediata / Competência Atual
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                      Despesa corrente que vence na data definida ou já quitada imediatamente.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setExigibilidade('no_ato_venda');
                      setStatusPagamento('Pendente');
                    }}
                    className={`p-3 rounded-xl text-left border transition cursor-pointer flex flex-col justify-between ${
                      exigibilidade === 'no_ato_venda'
                        ? 'bg-amber-500/20 border-amber-500/60 text-white shadow-sm'
                        : 'bg-black/20 text-slate-400 border-white/5 hover:bg-white/5'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center gap-1.5 text-amber-300">
                      ⏳ No Ato da Venda do Veículo
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                      Cartório, despachante ou comissão: entra em Contas a Pagar apenas quando o carro for <strong>Vendido</strong>.
                    </p>
                  </button>
                </div>
              </div>

              {/* Lógica Diferenciada de Acordo com a Exigibilidade */}
              {exigibilidade === 'no_ato_venda' ? (
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-3 animate-fadeIn">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-300 shrink-0">
                      <Clock size={18} />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-amber-200 text-xs">
                          Provisão Condicional (No Ato da Venda)
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          ⏳ Pendente (Sem baixa obrigatória agora)
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-200/80 leading-relaxed">
                        Esta despesa fica registrada na composição de custos do veículo no Dossiê. <strong>Nenhuma data de pagamento ou forma de quitação é exigida agora</strong>, pois a baixa só será cobrada e efetivada no módulo de <em>Contas a Pagar</em> quando o carro for marcado como <strong>Vendido</strong>.
                      </p>
                    </div>
                  </div>

                  {statusPagamento === 'Pago' ? (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-2 text-xs">
                      <div className="flex items-center justify-between text-emerald-300 font-bold">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 size={14} /> Pagamento Antecipado Registrado
                        </span>
                        <button
                          type="button"
                          onClick={() => setStatusPagamento('Pendente')}
                          className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
                        >
                          Voltar para Pendente (Padrão)
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                        <div>
                          <label className="block text-slate-300 text-[11px] mb-1 font-semibold">Data do Pagamento</label>
                          <input
                            type="date"
                            value={dataPagamento}
                            onChange={(e) => setDataPagamento(e.target.value)}
                            className="w-full p-2 rounded-lg border border-white/10 bg-[#16171f] text-slate-200 text-xs outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-300 text-[11px] mb-1 font-semibold">Forma de Pagamento</label>
                          <select
                            value={formaPagamento}
                            onChange={(e) => setFormaPagamento(e.target.value)}
                            className="w-full p-2 rounded-lg border border-white/10 bg-[#16171f] text-slate-200 text-xs outline-none focus:border-emerald-500"
                          >
                            <option value="PIX">PIX</option>
                            <option value="Transferência Bancária">Transferência TED/DOC</option>
                            <option value="Cartão de Débito">Cartão de Débito</option>
                            <option value="Cartão de Crédito">Cartão de Crédito</option>
                            <option value="Boleto Bancário">Boleto Bancário</option>
                            <option value="Dinheiro / Espécie">Dinheiro / Espécie</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between pt-1 border-t border-amber-500/20 text-[11px] text-amber-300/70">
                      <span>✓ Não requer baixa imediata.</span>
                      <button
                        type="button"
                        onClick={() => setStatusPagamento('Pago')}
                        className="text-amber-300 hover:text-amber-100 hover:underline font-semibold cursor-pointer"
                      >
                        Já pagou antecipado e deseja registrar agora?
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* Exigibilidade Imediata: Seleção explícita entre Pago e Pendente */
                <div className="space-y-3">
                  <div>
                    <label className="block text-slate-300 font-bold text-xs mb-1.5">
                      Situação da Quitação:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setStatusPagamento('Pago')}
                        className={`p-2.5 rounded-xl font-bold text-xs border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                          statusPagamento === 'Pago'
                            ? 'bg-emerald-600/30 border-emerald-500/60 text-emerald-300 shadow-sm'
                            : 'bg-black/20 border-white/5 text-slate-400 hover:bg-white/5'
                        }`}
                      >
                        <CheckCircle2 size={14} /> ✓ Já Pago (Baixa Imediata)
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatusPagamento('Pendente')}
                        className={`p-2.5 rounded-xl font-bold text-xs border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                          statusPagamento === 'Pendente'
                            ? 'bg-amber-500/30 border-amber-500/60 text-amber-300 shadow-sm'
                            : 'bg-black/20 border-white/5 text-slate-400 hover:bg-white/5'
                        }`}
                      >
                        <Clock size={14} /> ⏳ Pendente (Contas a Pagar)
                      </button>
                    </div>
                  </div>

                  {statusPagamento === 'Pago' ? (
                    <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-3 animate-fadeIn">
                      <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 size={15} /> Detalhes da Baixa / Pagamento
                        </span>
                        <span className="text-[10px] text-emerald-300/80 font-normal">
                          Bancos & Giro (Opcional)
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-300 text-[11px] mb-1 font-semibold">
                            Data do Pagamento *
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
                            <option value="Transferência Bancária">Transferência TED/DOC</option>
                            <option value="Cartão de Débito">Cartão de Débito</option>
                            <option value="Cartão de Crédito">Cartão de Crédito</option>
                            <option value="Boleto Bancário">Boleto Bancário</option>
                            <option value="Dinheiro / Espécie">Dinheiro / Espécie</option>
                            <option value="Cheque">Cheque</option>
                            <option value="Outro">Outro</option>
                          </select>
                        </div>
                      </div>

                      {/* Select Opcional de Contas Correntes (Bancos & Giro) */}
                      <div>
                        <label className="block text-slate-300 text-[11px] mb-1 font-semibold flex items-center gap-1.5">
                          <Wallet size={13} className="text-emerald-400" />
                          Conta Bancária / Caixa de Origem (Opcional)
                        </label>
                        <select
                          value={selectedContaBancariaId}
                          onChange={(e) => setSelectedContaBancariaId(e.target.value)}
                          className="w-full p-2.5 rounded-xl border border-white/10 bg-[#16171f] text-slate-200 text-xs font-semibold outline-none focus:border-emerald-500"
                        >
                          <option value="">
                            -- Sem débito bancário imediato (Apenas registro de custo no veículo) --
                          </option>
                          {contasBancariasList.map((conta) => (
                            <option key={conta.id} value={conta.id}>
                              🏦 {conta.nome} ({conta.banco || conta.tipo}) — Saldo: R$ {Number(conta.saldoAtual || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </option>
                          ))}
                        </select>
                        <p className="text-[10px] text-slate-400 mt-1">
                          💡 <strong>Dica:</strong> Se você selecionar uma conta bancária, o saldo será debitado e lançado no extrato. Deixe em branco se for uma despesa antiga do estoque que já foi liquidada antes.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2.5 text-amber-200 text-xs animate-fadeIn">
                      <div className="flex items-start gap-2.5">
                        <Clock size={16} className="shrink-0 text-amber-400 mt-0.5" />
                        <div>
                          <strong className="text-amber-300">Despesa Pendente (Contas a Pagar):</strong>
                          <p className="text-[11px] text-amber-200/80 mt-0.5">
                            Ficará registrada no histórico do veículo e na central de pendências de <strong>Contas a Pagar</strong> até a sua baixa efetiva.
                          </p>
                        </div>
                      </div>

                      <div className="pt-1 border-t border-amber-500/20">
                        <label className="block text-slate-300 text-[11px] mb-1 font-semibold">
                          Data de Vencimento Prevista (Opcional):
                        </label>
                        <input
                          type="date"
                          value={dataVencimento}
                          onChange={(e) => setDataVencimento(e.target.value)}
                          className="w-full p-2.5 rounded-lg border border-white/10 bg-[#16171f] text-slate-200 text-xs outline-none focus:border-amber-500 font-mono"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Fixed Footer Actions */}
          <div className="p-4 sm:p-5 border-t border-white/10 bg-[#16171f] flex items-center justify-end gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 font-semibold text-xs transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs transition shadow-lg shadow-orange-600/30 flex items-center gap-2 cursor-pointer"
            >
              <DollarSign size={16} />
              {isEditing ? 'Salvar Alterações da Despesa' : 'Lançar Despesa no Veículo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
