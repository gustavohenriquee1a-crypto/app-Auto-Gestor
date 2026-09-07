import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Zap,
  CheckCircle,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  Car,
  KeyRound,
  UserCheck,
  DollarSign,
  Calendar,
  CreditCard,
  Search,
  FileText,
  Check,
  Edit3,
  HelpCircle,
  Link2,
  Tag,
  Receipt,
  Sparkles,
} from 'lucide-react';
import {
  ContaBancariaCaixa,
  Veiculo,
  FornecedorPrestador,
  Usuario,
  MovimentacaoConta,
  CategoriaFornecedor,
  CategoriaDespesa,
  DespesaFixa,
  VendaVeiculo,
} from '../types';
import {
  salvarLancamentoExpressoFirestore,
  editarMovimentacaoContaFirestore,
  ParametrosLancamentoExpresso,
  ParametrosEdicaoMovimentacao,
} from '../services/firestoreService';

interface ModalLancamentoExpressoProps {
  isOpen: boolean;
  onClose: () => void;
  contasBancarias: ContaBancariaCaixa[];
  veiculos: Veiculo[];
  fornecedores: FornecedorPrestador[];
  usuarios: Usuario[];
  despesasFixas?: DespesaFixa[];
  vendas?: VendaVeiculo[];
  currentUser?: Usuario | null;
  movimentacaoToEdit?: MovimentacaoConta | null;
  onSuccess?: (mensagem: string) => void;
}

export const CATEGORIAS_SAIDA: Record<string, string[]> = {
  despesa_fixa: [
    'Aluguel do Pátio / Salão',
    'Energia Elétrica / Água / Internet',
    'Marketing, Anúncios & WebMotors',
    'Contabilidade & Assessoria Jurídica',
    'Limpeza, Café & Insumos',
    'Impostos / Simples Nacional',
    'Tarifas Bancárias & Sistemas',
    'Manutenção Predial / Reformas',
    'Folha de Pagamento / Salários',
    'Outras Despesas Operacionais',
  ],
  veiculo_estoque: [
    'Mecânica / Mão de Obra',
    'Peças',
    'Funilaria / Pintura',
    'Estética / Lavagem',
    'Pneus',
    'Combustível',
    'Frete / Guincho',
    'Documentação / Despachante',
    'Cartório / Serviços Notariais',
    'IPVA / Licenciamento',
    'Anúncio Patrocinado (Meta/Google Ads)',
    'Outros Custos de Veículo',
  ],
  veiculo_locacao: [
    'Manutenção Preventiva / Revisão',
    'Peças & Troca de Óleo',
    'Pneus / Alinhamento',
    'Funilaria / Reparos',
    'Lavagem / Higienização',
    'Seguro Frota / Rastreador',
    'Documentação / IPVA',
    'Franquia / Sinistro',
    'Outros Custos de Frota',
  ],
  retirada_socio: [
    'Pró-labore',
    'Distribuição de Lucros',
    'Reembolso de Despesas',
    'Adiantamento a Sócio',
  ],
};

export const CATEGORIAS_ENTRADA: Record<string, string[]> = {
  receita_loja: [
    'Receita Genérica da Loja',
    'Venda de Acessórios / Peças',
    'Comissão / Intermediação',
    'Bonificação / Retorno Financeiro',
    'Receita de Serviços',
    'Rendimento de Aplicação',
    'Estorno / Reembolso Recebido',
    'Outras Receitas Operacionais',
  ],
  veiculo_estoque: [
    'Entrada / Sinal de Venda',
    'TED / Financiamento Liberado',
    'Retorno Bancário (TAC)',
    'Reembolso de Despachante / IPVA',
    'Venda de Peça / Acessório',
    'Receita Extra de Veículo',
  ],
  veiculo_locacao: [
    'Diária / Mensalidade de Locação',
    'Caução / Depósito de Garantia',
    'Cobrança de Multa / Sinistro',
    'Taxa de Limpeza / Combustível',
    'Outras Receitas de Locação',
  ],
  retirada_socio: [
    'Aporte de Sócio / Capital',
    'Empréstimo de Sócio para Empresa',
    'Devolução de Adiantamento',
    'Integralização de Capital',
  ],
};

const CATEGORIAS_LOJA = CATEGORIAS_SAIDA.despesa_fixa;
const CATEGORIAS_VEICULO: CategoriaDespesa[] = CATEGORIAS_SAIDA.veiculo_estoque as CategoriaDespesa[];

const CATEGORIAS_FORNECEDOR: CategoriaFornecedor[] = [
  'Oficina Mecânica',
  'Autopeças',
  'Funilaria e Pintura',
  'Lava Jato / Estética Automotiva',
  'Auto Elétrica / Acessórios',
  'Tapeçaria / Higienização',
  'Pneus / Borracharia',
  'Despachante',
  'Guincho / Reboque',
  'Agência de Tráfego / Marketing',
  'Posto de Combustível',
  'Vistoria Cautelar / Laudo',
  'Cartório / Serviços Notariais',
  'Concessionária / Concessionário',
  'Outro Parceiro',
];

export const ModalLancamentoExpresso: React.FC<ModalLancamentoExpressoProps> = ({
  isOpen,
  onClose,
  contasBancarias,
  veiculos,
  fornecedores,
  usuarios,
  despesasFixas = [],
  vendas = [],
  currentUser,
  movimentacaoToEdit,
  onSuccess,
}) => {
  const isEditing = !!movimentacaoToEdit;

  // Form State
  const [tipo, setTipo] = useState<'Saída' | 'Entrada'>('Saída');
  const [valor, setValor] = useState<string>('');
  const [data, setData] = useState<string>(new Date().toISOString().split('T')[0]);
  const [contaId, setContaId] = useState<string>('');
  const [formaPagamento, setFormaPagamento] = useState<string>('PIX / Transf.');

  // Pagador / Recebedor & Pre-cadastro
  const [pagadorRecebedor, setPagadorRecebedor] = useState<string>('');
  const [salvarNovoFornecedor, setSalvarNovoFornecedor] = useState<boolean>(false);
  const [categoriaNovoFornecedor, setCategoriaNovoFornecedor] = useState<CategoriaFornecedor>('Outro Parceiro');

  // Roteamento Contábil
  const [destinoRoteamento, setDestinoRoteamento] = useState<
    'despesa_fixa' | 'veiculo_estoque' | 'veiculo_locacao' | 'retirada_socio' | 'receita_loja' | 'venda_realizada'
  >('despesa_fixa');
  const [categoria, setCategoria] = useState<string>(CATEGORIAS_SAIDA.despesa_fixa[0]);

  // Classificação de Custo (Fixo / Variável / Neutro)
  const [tipoCusto, setTipoCusto] = useState<'Fixo' | 'Variável' | 'Neutro'>('Fixo');

  // Detalhes por Roteamento
  const [modoDespesaFixa, setModoDespesaFixa] = useState<'nova' | 'existente'>('nova');
  const [despesaFixaExistenteId, setDespesaFixaExistenteId] = useState<string>('');
  const [categoriaDespesaFixa, setCategoriaDespesaFixa] = useState<string>(CATEGORIAS_LOJA[0]);
  
  // Veículo Estoque
  const [veiculoEstoqueId, setVeiculoEstoqueId] = useState<string>('');
  const [categoriaDespesaVeiculo, setCategoriaDespesaVeiculo] = useState<CategoriaDespesa>('Mecânica / Mão de Obra');
  
  // Locação / Placa avulsa
  const [veiculoLocacaoPlaca, setVeiculoLocacaoPlaca] = useState<string>('');
  const [veiculoLocacaoModelo, setVeiculoLocacaoModelo] = useState<string>('');
  const [salvarNovoVeiculoLocacao, setSalvarNovoVeiculoLocacao] = useState<boolean>(false);

  // Vínculo Direto a Venda
  const [vinculoVendaId, setVinculoVendaId] = useState<string>('');
  const [vinculoVendaTipo, setVinculoVendaTipo] = useState<string>('Entrada no Caixa');
  const [clienteNome, setClienteNome] = useState<string>('');

  // Descrição & Observações
  const [descricao, setDescricao] = useState<string>('');
  const [observacoes, setObservacoes] = useState<string>('');

  // Status de Envio
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Lista dinâmica de categorias com base no Tipo e Destino
  const categoriasDisponiveis = useMemo(() => {
    const mapa = tipo === 'Saída' ? CATEGORIAS_SAIDA : CATEGORIAS_ENTRADA;
    const lista = mapa[destinoRoteamento] || (tipo === 'Saída' ? CATEGORIAS_SAIDA.despesa_fixa : CATEGORIAS_ENTRADA.receita_loja);
    if (categoria && !lista.includes(categoria)) {
      return [categoria, ...lista];
    }
    return lista;
  }, [tipo, destinoRoteamento, categoria]);

  // Troca dinâmica de Tipo sincronizando Rótulos, Destinos e Categorias
  const handleMudarTipo = (novoTipo: 'Saída' | 'Entrada') => {
    setTipo(novoTipo);
    if (novoTipo === 'Saída') {
      const dest =
        destinoRoteamento === 'receita_loja' || destinoRoteamento === 'venda_realizada'
          ? 'despesa_fixa'
          : destinoRoteamento;
      setDestinoRoteamento(dest);
      const lista = CATEGORIAS_SAIDA[dest] || CATEGORIAS_SAIDA.despesa_fixa;
      setCategoria(lista[0]);
      setTipoCusto(dest === 'despesa_fixa' ? 'Fixo' : dest === 'retirada_socio' ? 'Neutro' : 'Variável');
    } else {
      const dest =
        destinoRoteamento === 'despesa_fixa'
          ? 'receita_loja'
          : destinoRoteamento;
      setDestinoRoteamento(dest);
      const lista = CATEGORIAS_ENTRADA[dest] || CATEGORIAS_ENTRADA.receita_loja;
      setCategoria(lista[0]);
      setTipoCusto('Neutro');
    }
  };

  // Troca de Destino de Roteamento atualizando categoria sugerida
  const handleMudarDestino = (novoDest: any) => {
    setDestinoRoteamento(novoDest);
    const mapa = tipo === 'Saída' ? CATEGORIAS_SAIDA : CATEGORIAS_ENTRADA;
    const lista = mapa[novoDest] || (tipo === 'Saída' ? CATEGORIAS_SAIDA.despesa_fixa : CATEGORIAS_ENTRADA.receita_loja);
    if (lista && lista.length > 0) {
      setCategoria(lista[0]);
    }
    if (tipo === 'Saída') {
      if (novoDest === 'despesa_fixa') setTipoCusto('Fixo');
      else if (novoDest === 'retirada_socio') setTipoCusto('Neutro');
      else setTipoCusto('Variável');
    } else {
      setTipoCusto('Neutro');
    }
  };

  // Inicializar dados quando abre ou muda movimentacaoToEdit
  useEffect(() => {
    if (!isOpen) {
      setErrorMsg(null);
      return;
    }

    if (movimentacaoToEdit) {
      const isSaida = movimentacaoToEdit.tipo === 'Despesa';
      setTipo(isSaida ? 'Saída' : 'Entrada');
      setValor(movimentacaoToEdit.valor.toString());
      setData(movimentacaoToEdit.data || new Date().toISOString().split('T')[0]);
      setContaId(movimentacaoToEdit.contaId || (contasBancarias[0]?.id ?? ''));
      setFormaPagamento(movimentacaoToEdit.formaPagamento || 'PIX / Transf.');
      setPagadorRecebedor(movimentacaoToEdit.pagadorRecebedor || movimentacaoToEdit.clienteNome || '');
      setDescricao(movimentacaoToEdit.descricao || '');
      setObservacoes(movimentacaoToEdit.observacoes || '');
      setSalvarNovoFornecedor(false);
      setSalvarNovoVeiculoLocacao(false);
      setTipoCusto(movimentacaoToEdit.tipoCusto || (isSaida ? 'Fixo' : 'Neutro'));
      setVinculoVendaId(movimentacaoToEdit.vinculoVendaId || '');
      setDespesaFixaExistenteId(movimentacaoToEdit.despesaFixaId || '');
      if (movimentacaoToEdit.despesaFixaId) {
        setModoDespesaFixa('existente');
      } else {
        setModoDespesaFixa('nova');
      }

      let destFinal: any = isSaida ? 'despesa_fixa' : 'receita_loja';
      if (movimentacaoToEdit.destinoRoteamento) {
        destFinal = movimentacaoToEdit.destinoRoteamento;
      } else if (movimentacaoToEdit.vinculoVendaId) {
        destFinal = isSaida ? 'veiculo_estoque' : 'venda_realizada';
      } else if (movimentacaoToEdit.veiculoId) {
        destFinal = 'veiculo_estoque';
        setVeiculoEstoqueId(movimentacaoToEdit.veiculoId);
      } else if (movimentacaoToEdit.placa) {
        destFinal = 'veiculo_locacao';
        setVeiculoLocacaoPlaca(movimentacaoToEdit.placa);
      } else if (
        movimentacaoToEdit.categoria === 'Pró-labore' ||
        movimentacaoToEdit.categoria?.includes('Sócio') ||
        movimentacaoToEdit.descricao?.toLowerCase().includes('pró-labore')
      ) {
        destFinal = 'retirada_socio';
      }
      setDestinoRoteamento(destFinal);

      if (movimentacaoToEdit.categoria) {
        setCategoria(movimentacaoToEdit.categoria);
      } else {
        const mapa = isSaida ? CATEGORIAS_SAIDA : CATEGORIAS_ENTRADA;
        const lista = mapa[destFinal] || [];
        setCategoria(lista[0] || (isSaida ? 'Despesa Operacional' : 'Receita da Loja'));
      }
    } else {
      // Criação limpa
      setTipo('Saída');
      setValor('');
      setData(new Date().toISOString().split('T')[0]);
      setContaId(contasBancarias[0]?.id || '');
      setFormaPagamento('PIX / Transf.');
      setPagadorRecebedor('');
      setSalvarNovoFornecedor(false);
      setCategoriaNovoFornecedor('Outro Parceiro');
      setDestinoRoteamento('despesa_fixa');
      setCategoria(CATEGORIAS_SAIDA.despesa_fixa[0]);
      setTipoCusto('Fixo');
      setModoDespesaFixa('nova');
      setDespesaFixaExistenteId('');
      setCategoriaDespesaFixa(CATEGORIAS_SAIDA.despesa_fixa[0]);
      setVeiculoEstoqueId(veiculos.filter((v) => v.status !== 'Vendido')[0]?.id || '');
      setCategoriaDespesaVeiculo('Mecânica / Mão de Obra');
      setVeiculoLocacaoPlaca('');
      setVeiculoLocacaoModelo('');
      setSalvarNovoVeiculoLocacao(false);
      setVinculoVendaId('');
      setVinculoVendaTipo('Entrada no Caixa');
      setClienteNome('');
      setDescricao('');
      setObservacoes('');
      setErrorMsg(null);
    }
  }, [isOpen, movimentacaoToEdit, contasBancarias, veiculos]);

  // Lista combinada de sugestões para Pagador/Recebedor
  const sugestoesNomes = useMemo(() => {
    const lista: string[] = [];
    fornecedores.forEach((f) => {
      if (f.nome && !lista.includes(f.nome)) lista.push(f.nome);
    });
    usuarios.forEach((u) => {
      const nome = u.nomeCompleto || u.displayName;
      if (nome && !lista.includes(nome)) lista.push(nome);
    });
    return lista;
  }, [fornecedores, usuarios]);

  // Verifica se o texto digitado já existe
  const nomeExisteNoCadastro = useMemo(() => {
    const limpo = pagadorRecebedor.trim().toLowerCase();
    if (!limpo) return true;
    return sugestoesNomes.some((s) => s.toLowerCase() === limpo);
  }, [pagadorRecebedor, sugestoesNomes]);

  // Placas de veículos de locação existentes
  const placasLocacaoExistentes = useMemo(() => {
    return veiculos
      .filter((v) => v.tipoOperacao === 'Locacao' || v.status === 'Disponível')
      .map((v) => v.placa?.toUpperCase().trim())
      .filter(Boolean);
  }, [veiculos]);

  const placaLocacaoExiste = useMemo(() => {
    const limpa = veiculoLocacaoPlaca.trim().toUpperCase();
    if (!limpa) return true;
    return veiculos.some((v) => v.placa?.toUpperCase().trim() === limpa);
  }, [veiculoLocacaoPlaca, veiculos]);

  // Conta Selecionada
  const contaSelecionada = useMemo(() => {
    return contasBancarias.find((c) => c.id === contaId) || contasBancarias[0];
  }, [contasBancarias, contaId]);

  // Veículos de estoque disponíveis
  const veiculosEstoque = useMemo(() => {
    return veiculos.filter((v) => v.status !== 'Vendido');
  }, [veiculos]);

  // Cálculo da diferença de saldo em modo de edição
  const diferencaEdicao = useMemo(() => {
    if (!movimentacaoToEdit) return 0;
    const valorOriginal = Number(movimentacaoToEdit.valor || 0);
    const novoValor = Number(valor || 0);
    return novoValor - valorOriginal;
  }, [movimentacaoToEdit, valor]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const valorNum = parseFloat(valor.replace(',', '.'));
    if (isNaN(valorNum) || valorNum <= 0) {
      setErrorMsg('Informe um valor numérico válido maior que zero.');
      return;
    }

    if (!contaId) {
      setErrorMsg('Selecione uma conta bancária ou caixa de movimentação.');
      return;
    }

    if (destinoRoteamento === 'veiculo_estoque' && !veiculoEstoqueId) {
      setErrorMsg('Selecione um veículo em estoque para vincular a despesa.');
      return;
    }

    if (destinoRoteamento === 'veiculo_locacao' && !veiculoLocacaoPlaca.trim()) {
      setErrorMsg('Informe a placa do veículo de locação.');
      return;
    }

    if (destinoRoteamento === 'venda_realizada' && !vinculoVendaId) {
      setErrorMsg('Selecione uma venda realizada para vincular o lançamento.');
      return;
    }

    setLoading(true);

    try {
      const despesaFixaSelecionada = despesasFixas.find((d) => d.id === despesaFixaExistenteId);

      if (isEditing && movimentacaoToEdit) {
        // MODO EDIÇÃO: REGRA DE CAIXA DIFERENCIAL
        const paramEdicao: ParametrosEdicaoMovimentacao = {
          valor: valorNum,
          data: data,
          contaId: contaId,
          contaNome: contaSelecionada?.nome || movimentacaoToEdit.contaNome,
          tipo: tipo === 'Saída' ? 'Despesa' : 'Receita',
          categoria: categoria.trim() || (tipo === 'Saída' ? 'Despesa Operacional' : 'Receita da Loja'),
          descricao:
            descricao.trim() ||
            (tipo === 'Saída'
              ? `Despesa - ${pagadorRecebedor || 'Avulso'}`
              : `Receita - ${pagadorRecebedor || 'Avulso'}`),
          pagadorRecebedor: pagadorRecebedor.trim() || undefined,
          formaPagamento: formaPagamento,
          observacoes: observacoes.trim() || undefined,
          tipoCusto: tipoCusto,
          vinculoVendaId: vinculoVendaId || undefined,
        };

        const res = await editarMovimentacaoContaFirestore(
          movimentacaoToEdit,
          paramEdicao,
          currentUser?.displayName || currentUser?.email || 'Administrador'
        );

        onSuccess?.(
          `Lançamento atualizado com sucesso! Diferença de ${
            res.diferencaCalculada >= 0 ? '+' : ''
          }R$ ${res.diferencaCalculada.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
          })} aplicada no saldo da conta.`
        );
      } else {
        // MODO CRIAÇÃO: LANÇAMENTO EXPRESSO ULTRA-RÁPIDO
        const params: ParametrosLancamentoExpresso = {
          tipo: tipo,
          valor: valorNum,
          data: data,
          contaId: contaId,
          contaNome: contaSelecionada?.nome || 'Conta Loja',
          pagadorRecebedor: pagadorRecebedor.trim(),
          salvarNovoFornecedor: !nomeExisteNoCadastro && salvarNovoFornecedor,
          categoriaFornecedor: categoriaNovoFornecedor,
          destinoRoteamento: destinoRoteamento,
          categoria: categoria.trim() || (tipo === 'Saída' ? 'Despesa Operacional' : 'Receita da Loja'),
          categoriaDespesaFixa: modoDespesaFixa === 'existente' && despesaFixaSelecionada ? despesaFixaSelecionada.categoria : (categoria || categoriaDespesaFixa),
          despesaFixaExistenteId: modoDespesaFixa === 'existente' && despesaFixaExistenteId ? despesaFixaExistenteId : undefined,
          veiculoEstoqueId: veiculoEstoqueId,
          categoriaDespesaVeiculo: (categoria as CategoriaDespesa) || categoriaDespesaVeiculo,
          veiculoLocacaoPlaca: veiculoLocacaoPlaca.trim().toUpperCase(),
          veiculoLocacaoModelo: veiculoLocacaoModelo.trim(),
          salvarNovoVeiculoLocacao: !placaLocacaoExiste && salvarNovoVeiculoLocacao,
          vinculoVendaId: vinculoVendaId || undefined,
          vinculoVendaTipo: vinculoVendaTipo,
          clienteNome: clienteNome || undefined,
          tipoCusto: tipoCusto,
          descricao:
            descricao.trim() ||
            (tipo === 'Saída'
              ? `Despesa - ${pagadorRecebedor || 'Avulso'}`
              : `Receita - ${pagadorRecebedor || 'Avulso'}`),
          formaPagamento: formaPagamento,
          observacoes: observacoes.trim() || undefined,
          usuarioNome: currentUser?.displayName || currentUser?.email || 'Operador',
        };

        await salvarLancamentoExpressoFirestore(params);

        onSuccess?.(
          `Lançamento expresso de R$ ${valorNum.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
          })} realizado e conciliado com sucesso!`
        );
      }

      onClose();
    } catch (err: any) {
      console.error('Erro ao processar lançamento expresso:', err);
      setErrorMsg(err.message || 'Falha ao salvar lançamento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden my-auto max-h-[92vh]">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-md ${
                isEditing
                  ? 'bg-amber-500 shadow-amber-500/20'
                  : tipo === 'Saída'
                  ? 'bg-rose-500 shadow-rose-500/20'
                  : 'bg-emerald-500 shadow-emerald-500/20'
              }`}
            >
              {isEditing ? <Edit3 size={20} /> : <Zap size={20} />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {isEditing ? 'Editar Lançamento Bancário' : 'Lançamento Expresso & Conciliação'}
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    isEditing
                      ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                      : 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                  }`}
                >
                  {isEditing ? 'Modo Saldo Diferencial' : 'Giro Imediato'}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isEditing
                  ? 'Recalcula o saldo bancário com base na variação do valor sem desconciliar o extrato.'
                  : 'Entrada ou saída avulsa com roteamento contábil e pré-cadastro rápido.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm flex items-center gap-2.5">
              <AlertCircle size={18} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Destaque em Modo Edição: Alerta de Saldo Diferencial */}
          {isEditing && (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
              <HelpCircle size={16} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="font-semibold">Regra de Proteção de Caixa (Delta Diferencial):</p>
                <p className="text-amber-800 dark:text-amber-300 mt-0.5">
                  Valor original: <strong>R$ {Number(movimentacaoToEdit.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>.
                  {' '}Variação calculada:{' '}
                  <strong className={diferencaEdicao >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                    {diferencaEdicao >= 0 ? '+' : ''}R$ {diferencaEdicao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </strong>
                  . O saldo da conta será ajustado em exatamente essa diferença.
                </p>
              </div>
            </div>
          )}

          {/* 1. Bloco de Tipo (Entrada/Saída), Valor e Data */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            {/* Toggle Tipo */}
            <div className="sm:col-span-4">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Tipo da Transação *
              </label>
              <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => handleMudarTipo('Saída')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all ${
                    tipo === 'Saída'
                      ? 'bg-rose-500 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <ArrowDownRight size={15} />
                  Saída / Débito
                </button>
                <button
                  type="button"
                  onClick={() => handleMudarTipo('Entrada')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all ${
                    tipo === 'Entrada'
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <ArrowUpRight size={15} />
                  Entrada / Crédito
                </button>
              </div>
            </div>

            {/* Valor */}
            <div className="sm:col-span-4">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Valor (R$) *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-sm font-semibold">
                  R$
                </div>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0,00"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold text-base focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Data */}
            <div className="sm:col-span-4">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Data *
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* 2. Conta Bancária & Meio de Pagamento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Conta Bancária / Caixa de Origem *
              </label>
              <select
                required
                value={contaId}
                onChange={(e) => setContaId(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {contasBancarias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome} (Saldo atual: R$ {Number(c.saldo || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Forma de Movimentação
              </label>
              <select
                value={formaPagamento}
                onChange={(e) => setFormaPagamento(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="PIX / Transf.">PIX / Transferência Instantânea</option>
                <option value="TED / DOC">TED / DOC Bancário</option>
                <option value="Boleto Bancário">Boleto Bancário</option>
                <option value="Dinheiro Espécie">Dinheiro em Espécie (Caixa Físico)</option>
                <option value="Cartão de Débito">Cartão de Débito</option>
                <option value="Cartão de Crédito">Cartão de Crédito</option>
              </select>
            </div>
          </div>

          {/* 3. Pessoa / Fornecedor ou Pagador dinâmico */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <UserCheck size={14} className="text-indigo-500" />
                  {tipo === 'Saída' ? 'Beneficiário / Fornecedor' : 'Pagador / Origem do Crédito'} *
                </label>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {nomeExisteNoCadastro ? 'Parceiro existente' : 'Nome avulso'}
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  list="lista-parceiros-express"
                  placeholder={tipo === 'Saída' ? 'Beneficiário / Fornecedor (ex: Auto Peças Silva, Posto Shell...)' : 'Pagador / Origem do Crédito (ex: Banco BV, Comprador João, Sócio...)'}
                  value={pagadorRecebedor}
                  onChange={(e) => setPagadorRecebedor(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <datalist id="lista-parceiros-express">
                  {sugestoesNomes.map((nome, idx) => (
                    <option key={idx} value={nome} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Checkbox de Pré-cadastro de novo parceiro caso não exista (quando Saída) */}
            {tipo === 'Saída' && !nomeExisteNoCadastro && pagadorRecebedor.trim().length > 1 && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-indigo-700 dark:text-indigo-300">
                  <input
                    type="checkbox"
                    checked={salvarNovoFornecedor}
                    onChange={(e) => setSalvarNovoFornecedor(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                  />
                  <span>Salvar como novo Parceiro/Fornecedor (Pré-cadastro)</span>
                </label>

                {salvarNovoFornecedor && (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Ramo:</span>
                    <select
                      value={categoriaNovoFornecedor}
                      onChange={(e) => setCategoriaNovoFornecedor(e.target.value as CategoriaFornecedor)}
                      className="px-2 py-1 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs text-indigo-900 dark:text-indigo-200 focus:outline-none"
                    >
                      {CATEGORIAS_FORNECEDOR.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 4. Destino da Transação (Select Obrigatório dinâmico) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Building2 size={14} className="text-indigo-600 dark:text-indigo-400" />
                Destino da Transação *
              </label>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {tipo === 'Saída' ? 'Classificação de Saída / Débito' : 'Classificação de Entrada / Crédito'}
              </span>
            </div>

            {/* Select Dinâmico Solicitado */}
            <select
              id="select-destino-transacao"
              value={destinoRoteamento}
              onChange={(e) => handleMudarDestino(e.target.value as any)}
              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border-2 border-indigo-400 dark:border-indigo-600 rounded-xl text-slate-900 dark:text-white font-bold text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-sm"
            >
              {tipo === 'Saída' ? (
                <>
                  <option value="despesa_fixa">1. Despesa da Loja/Fixa</option>
                  <option value="veiculo_estoque">2. Custo de Veículo (Estoque)</option>
                  <option value="veiculo_locacao">3. Manutenção de Frota (Locação)</option>
                  <option value="retirada_socio">4. Retirada de Sócio/Pró-labore</option>
                </>
              ) : (
                <>
                  <option value="receita_loja">1. Receita Genérica da Loja</option>
                  <option value="veiculo_estoque">2. Receita Extra de Veículo (Estoque)</option>
                  <option value="veiculo_locacao">3. Receita de Frota (Locação)</option>
                  <option value="retirada_socio">4. Aporte de Sócio / Capital</option>
                </>
              )}
            </select>

            {/* Botões Rápidos Visuais */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {tipo === 'Saída' ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleMudarDestino('despesa_fixa')}
                    className={`p-2.5 rounded-xl border text-left flex flex-col justify-between gap-1 transition-all ${
                      destinoRoteamento === 'despesa_fixa'
                        ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/50 text-indigo-950 dark:text-indigo-200 ring-2 ring-indigo-500/20 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <Building2 size={16} className={destinoRoteamento === 'despesa_fixa' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'} />
                    <div>
                      <div className="text-xs font-bold leading-tight">1. Despesa Loja/Fixa</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">Contas fixas & pátio</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMudarDestino('veiculo_estoque')}
                    className={`p-2.5 rounded-xl border text-left flex flex-col justify-between gap-1 transition-all ${
                      destinoRoteamento === 'veiculo_estoque'
                        ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/50 text-indigo-950 dark:text-indigo-200 ring-2 ring-indigo-500/20 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <Car size={16} className={destinoRoteamento === 'veiculo_estoque' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'} />
                    <div>
                      <div className="text-xs font-bold leading-tight">2. Custo de Veículo</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">Estoque / DRE carro</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMudarDestino('veiculo_locacao')}
                    className={`p-2.5 rounded-xl border text-left flex flex-col justify-between gap-1 transition-all ${
                      destinoRoteamento === 'veiculo_locacao'
                        ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/50 text-indigo-950 dark:text-indigo-200 ring-2 ring-indigo-500/20 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <KeyRound size={16} className={destinoRoteamento === 'veiculo_locacao' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'} />
                    <div>
                      <div className="text-xs font-bold leading-tight">3. Manut. Frota</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">Veículo de locação</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMudarDestino('retirada_socio')}
                    className={`p-2.5 rounded-xl border text-left flex flex-col justify-between gap-1 transition-all ${
                      destinoRoteamento === 'retirada_socio'
                        ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/50 text-indigo-950 dark:text-indigo-200 ring-2 ring-indigo-500/20 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <UserCheck size={16} className={destinoRoteamento === 'retirada_socio' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'} />
                    <div>
                      <div className="text-xs font-bold leading-tight">4. Retirada Sócio</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">Pró-labore / repasse</div>
                    </div>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => handleMudarDestino('receita_loja')}
                    className={`p-2.5 rounded-xl border text-left flex flex-col justify-between gap-1 transition-all ${
                      destinoRoteamento === 'receita_loja'
                        ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/50 text-indigo-950 dark:text-indigo-200 ring-2 ring-indigo-500/20 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <Building2 size={16} className={destinoRoteamento === 'receita_loja' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'} />
                    <div>
                      <div className="text-xs font-bold leading-tight">1. Receita Genérica</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">Loja & serviços</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMudarDestino('veiculo_estoque')}
                    className={`p-2.5 rounded-xl border text-left flex flex-col justify-between gap-1 transition-all ${
                      destinoRoteamento === 'veiculo_estoque'
                        ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/50 text-indigo-950 dark:text-indigo-200 ring-2 ring-indigo-500/20 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <Car size={16} className={destinoRoteamento === 'veiculo_estoque' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'} />
                    <div>
                      <div className="text-xs font-bold leading-tight">2. Receita Veículo</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">Sinal, TED ou TAC</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMudarDestino('veiculo_locacao')}
                    className={`p-2.5 rounded-xl border text-left flex flex-col justify-between gap-1 transition-all ${
                      destinoRoteamento === 'veiculo_locacao'
                        ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/50 text-indigo-950 dark:text-indigo-200 ring-2 ring-indigo-500/20 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <KeyRound size={16} className={destinoRoteamento === 'veiculo_locacao' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'} />
                    <div>
                      <div className="text-xs font-bold leading-tight">3. Receita Frota</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">Aluguel & cauções</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMudarDestino('retirada_socio')}
                    className={`p-2.5 rounded-xl border text-left flex flex-col justify-between gap-1 transition-all ${
                      destinoRoteamento === 'retirada_socio'
                        ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/50 text-indigo-950 dark:text-indigo-200 ring-2 ring-indigo-500/20 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <UserCheck size={16} className={destinoRoteamento === 'retirada_socio' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'} />
                    <div>
                      <div className="text-xs font-bold leading-tight">4. Aporte Sócio</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">Capital / sócios</div>
                    </div>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* 5. Campo 'Categoria' exibido como <select> adequado ao Tipo e Destino escolhidos */}
          <div className="p-3.5 bg-indigo-50/60 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800/80 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                <Tag size={14} className="text-indigo-600 dark:text-indigo-400" />
                Categoria da Movimentação *
              </label>
              <span className="text-[11px] font-medium text-indigo-700 dark:text-indigo-300">
                Salvo diretamente no extrato bancário
              </span>
            </div>
            <select
              id="select-categoria-transacao"
              required
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-700 rounded-xl text-slate-900 dark:text-white text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-sm"
            >
              {categoriasDisponiveis.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Sub-configuração de acordo com o Destino Contábil */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            {/* Rota 1: Despesa da Loja */}
            {destinoRoteamento === 'despesa_fixa' && (
              <div className="space-y-3">
                {despesasFixas.length > 0 && (
                  <div className="flex items-center gap-2 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-lg w-fit text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setModoDespesaFixa('categoria');
                        setDespesaFixaExistenteId('');
                      }}
                      className={`px-3 py-1 rounded-md font-medium transition-all ${
                        modoDespesaFixa === 'categoria'
                          ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      Nova Categoria de Despesa
                    </button>
                    <button
                      type="button"
                      onClick={() => setModoDespesaFixa('existente')}
                      className={`px-3 py-1 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                        modoDespesaFixa === 'existente'
                          ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      <Receipt size={13} />
                      Baixar Conta/Despesa Fixa Cadastrada ({despesasFixas.length})
                    </button>
                  </div>
                )}

                {modoDespesaFixa === 'existente' && despesasFixas.length > 0 ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Selecione a Despesa Fixa para Liquidar / Vincular *
                    </label>
                    <select
                      value={despesaFixaExistenteId}
                      onChange={(e) => {
                        const sId = e.target.value;
                        setDespesaFixaExistenteId(sId);
                        const desp = despesasFixas.find((d) => d.id === sId);
                        if (desp) {
                          if (!valor || valor === '0') setValor(desp.valor.toString());
                          if (!descricao) setDescricao(`Baixa Despesa Fixa: ${desp.descricao}`);
                          if (desp.fornecedorNome && !pagadorRecebedor) setPagadorRecebedor(desp.fornecedorNome);
                          if (desp.categoria) setCategoriaDespesaFixa(desp.categoria);
                        }
                      }}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-700 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      <option value="">Selecione a conta cadastrada...</option>
                      {despesasFixas.map((df) => (
                        <option key={df.id} value={df.id}>
                          {df.status === 'Pago' ? '✓ [PAGO]' : '⏳ [PENDENTE]'} {df.descricao} — R$ {df.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({df.mesReferencia || df.dataVencimento})
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      Ao selecionar, o valor e a categoria são pré-preenchidos e a conta será conciliada no fluxo de caixa.
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Categoria da Despesa Fixa / Loja
                    </label>
                    <select
                      value={categoriaDespesaFixa}
                      onChange={(e) => setCategoriaDespesaFixa(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      {CATEGORIAS_LOJA.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Rota 2: Veículo em Estoque */}
            {destinoRoteamento === 'veiculo_estoque' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Veículo em Estoque *
                  </label>
                  <select
                    required
                    value={veiculoEstoqueId}
                    onChange={(e) => setVeiculoEstoqueId(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="">Selecione o veículo...</option>
                    {veiculosEstoque.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.placa} - {v.modelo} ({v.chassi?.slice(-6)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Tipo de Serviço / Manutenção
                  </label>
                  <select
                    value={categoriaDespesaVeiculo}
                    onChange={(e) => setCategoriaDespesaVeiculo(e.target.value as CategoriaDespesa)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {CATEGORIAS_VEICULO.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Rota 3: Veículo de Locação / Placa Avulsa */}
            {destinoRoteamento === 'veiculo_locacao' && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Placa do Veículo de Locação *
                    </label>
                    <input
                      type="text"
                      list="placas-locacao-lista"
                      placeholder="Ex: ABC1D23"
                      value={veiculoLocacaoPlaca}
                      onChange={(e) => setVeiculoLocacaoPlaca(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono uppercase text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    <datalist id="placas-locacao-lista">
                      {placasLocacaoExistentes.map((p, idx) => (
                        <option key={idx} value={p} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Tipo de Reparo / Categoria
                    </label>
                    <select
                      value={categoriaDespesaVeiculo}
                      onChange={(e) => setCategoriaDespesaVeiculo(e.target.value as CategoriaDespesa)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      {CATEGORIAS_VEICULO.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Opção de Salvar como Novo Veículo se não existir */}
                {!placaLocacaoExiste && veiculoLocacaoPlaca.trim().length >= 7 && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800/80 space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-amber-900 dark:text-amber-200">
                      <input
                        type="checkbox"
                        checked={salvarNovoVeiculoLocacao}
                        onChange={(e) => setSalvarNovoVeiculoLocacao(e.target.checked)}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                      />
                      <span>Placa não encontrada. Salvar como novo Veículo de Locação (Pré-cadastro)?</span>
                    </label>

                    {salvarNovoVeiculoLocacao && (
                      <div>
                        <input
                          type="text"
                          placeholder="Modelo do Veículo (ex: Fiat Cronos 1.3 Drive)"
                          value={veiculoLocacaoModelo}
                          onChange={(e) => setVeiculoLocacaoModelo(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Rota 4: Receita de Venda Realizada */}
            {destinoRoteamento === 'venda_realizada' && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Vincular à Venda Realizada *
                    </label>
                    <select
                      value={vinculoVendaId}
                      onChange={(e) => {
                        const vId = e.target.value;
                        setVinculoVendaId(vId);
                        const v = vendas.find((item) => item.id === vId);
                        if (v) {
                          setClienteNome(v.compradorNome || '');
                          if (!pagadorRecebedor) setPagadorRecebedor(v.compradorNome || '');
                          if (!descricao) setDescricao(`Venda: ${v.veiculoModelo || ''} (${v.veiculoPlaca || ''}) - ${vinculoVendaTipo}`);
                        }
                      }}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      <option value="">Selecione uma venda...</option>
                      {vendas.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.veiculoModelo} ({v.veiculoPlaca}) — R$ {v.valorVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} — {v.compradorNome || 'Sem comprador'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Tipo de Transação da Venda
                    </label>
                    <select
                      value={vinculoVendaTipo}
                      onChange={(e) => setVinculoVendaTipo(e.target.value as any)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      <option value="Entrada no Caixa">Entrada no Caixa (Sinal / TED Cliente)</option>
                      <option value="Financiamento BV">Financiamento Bancário (TED Banco/BV)</option>
                      <option value="Retorno TAC">Retorno de TAC Bancário</option>
                      <option value="Comissão Paga">Comissão Paga ao Vendedor/Operador</option>
                      <option value="Estorno / Ajuste">Estorno / Ajuste da Venda</option>
                      <option value="Outro Recebimento">Outro Recebimento Vinculado</option>
                    </select>
                  </div>
                </div>
                {clienteNome && (
                  <div className="text-[11px] text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                    <Sparkles size={13} />
                    <span>Comprador vinculado: <strong>{clienteNome}</strong></span>
                  </div>
                )}
              </div>
            )}

            {/* Rota 5: Retirada de Sócio / Pró-labore */}
            {destinoRoteamento === 'retirada_socio' && (
              <div className="p-2.5 bg-indigo-50/70 dark:bg-indigo-950/30 rounded-lg text-xs text-indigo-900 dark:text-indigo-200">
                <p className="font-semibold flex items-center gap-1.5">
                  <UserCheck size={14} className="text-indigo-600 dark:text-indigo-400" />
                  Roteamento de Pró-labore & Repasse
                </p>
                <p className="text-[11px] text-indigo-700 dark:text-indigo-300 mt-1">
                  Este lançamento será computado diretamente no Demonstrativo de Resultados (DRE) como retirada/pró-labore para o titular ou sócio indicado no campo de favorecido.
                </p>
              </div>
            )}
          </div>

          {/* Classificação do Custo (DRE & Extrato 360º) */}
          <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-700/80">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Tag size={14} className="text-indigo-600 dark:text-indigo-400" />
                Classificação Contábil (DRE & Extrato 360º) *
              </label>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Determina o filtro em relatórios analíticos
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTipoCusto('Fixo')}
                className={`p-2.5 rounded-xl border text-center text-xs transition-all flex flex-col items-center justify-center gap-1 ${
                  tipoCusto === 'Fixo'
                    ? 'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20 font-bold shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                <span className="font-bold">🏢 Custo Fixo</span>
                <span className="text-[10px] opacity-75">Estrutura & Loja</span>
              </button>
              <button
                type="button"
                onClick={() => setTipoCusto('Variável')}
                className={`p-2.5 rounded-xl border text-center text-xs transition-all flex flex-col items-center justify-center gap-1 ${
                  tipoCusto === 'Variável'
                    ? 'border-amber-600 bg-amber-50/80 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 ring-2 ring-amber-500/20 font-bold shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                <span className="font-bold">🚗 Custo Variável</span>
                <span className="text-[10px] opacity-75">Veículo / Venda</span>
              </button>
              <button
                type="button"
                onClick={() => setTipoCusto('Neutro')}
                className={`p-2.5 rounded-xl border text-center text-xs transition-all flex flex-col items-center justify-center gap-1 ${
                  tipoCusto === 'Neutro'
                    ? 'border-emerald-600 bg-emerald-50/80 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/20 font-bold shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                <span className="font-bold">⚡ Neutro / Capital</span>
                <span className="text-[10px] opacity-75">Entradas & Pró-labore</span>
              </button>
            </div>
          </div>

          {/* 5. Descrição Detalhada & Observações */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Descrição do Lançamento
              </label>
              <input
                type="text"
                placeholder="Ex: Pagamento referente troca de óleo e filtro"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Observações / Nº Comprovante
              </label>
              <input
                type="text"
                placeholder="Ex: Comprovante autenticado nº 9841"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm text-white shadow-md flex items-center gap-2 transition-all disabled:opacity-50 ${
                isEditing
                  ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/20'
                  : tipo === 'Saída'
                  ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
              }`}
            >
              {loading ? (
                <span>Salvando...</span>
              ) : isEditing ? (
                <>
                  <Check size={16} />
                  <span>Salvar Alterações com Saldo Diferencial</span>
                </>
              ) : (
                <>
                  <Zap size={16} />
                  <span>Efetivar Lançamento Expresso</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
