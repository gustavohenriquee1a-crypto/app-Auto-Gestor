import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Zap,
  CheckCircle,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
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
  Wrench,
} from 'lucide-react';
import {
  ContaBancariaCaixa,
  Veiculo,
  ContratoLocacao,
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
  initialTipo?: 'Saída' | 'Entrada';
  initialDestino?: 'despesa_fixa' | 'veiculo_estoque' | 'veiculo_locacao' | 'retirada_socio' | 'receita_loja' | 'venda_realizada';
  initialPlaca?: string;
  initialPagador?: string;
  onSuccess?: (mensagem: string) => void;
  onUpdateVeiculo?: (veiculo: Veiculo) => void;
  onUpdateVeiculos?: (veiculos: Veiculo[]) => void;
  onOpenNovoContrato?: (veiculo?: Veiculo, motoristaData?: { nome?: string; cpf?: string; telefone?: string; app?: string; placaInteresse?: string }) => void;
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
    'Pneus / Alinhamento & Balanceamento',
    'Funilaria / Reparos de Lataria',
    'Lavagem / Higienização',
    'Seguro Frota / Rastreador & Telemetria',
    'Documentação, IPVA & Licenciamento',
    'Franquia / Coparticipação de Sinistro',
    'Frete / Guincho / Reboque Frota',
    'Combustível de Apoio / Pátio',
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
    'Recebimento Semanal (Aluguel Semanal / Semanalidade)',
    'Recebimento Quinzenal de Locação',
    'Recebimento Mensal de Locação',
    'Diária Avulsa de Locação',
    'Caução / Depósito de Garantia de Locação',
    'Cobrança de Multa de Trânsito / Notificação',
    'Taxa de Higienização / Limpeza / Devolução',
    'Reembolso de Combustível / Pedágio',
    'Coparticipação em Sinistro / Franquia',
    'Taxa de Adesão / Ativação de Motorista',
    'Acordo / Quitação de Débito de Locação',
    'Outras Receitas de Frota / Locação',
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
const CATEGORIAS_CUSTO_FROTA: string[] = CATEGORIAS_SAIDA.veiculo_locacao;

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
  initialTipo,
  initialDestino,
  initialPlaca,
  initialPagador,
  onSuccess,
  onUpdateVeiculo,
  onUpdateVeiculos,
  onOpenNovoContrato,
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

  // --- NOVOS CAMPOS PARA RECEITA DE FROTA & LOCAÇÃO ---
  const [periodicidadeRecebimento, setPeriodicidadeRecebimento] = useState<
    'Semanal' | 'Quinzenal' | 'Mensal' | 'Diária' | 'Avulso'
  >('Semanal');
  const [vincularAoPainelLocacao, setVincularAoPainelLocacao] = useState<boolean>(true);
  const [salvarNovoPagadorSemContrato, setSalvarNovoPagadorSemContrato] = useState<boolean>(false);
  const [dadosNovoPagador, setDadosNovoPagador] = useState<{
    cpf: string;
    telefone: string;
    app: string;
    observacoes: string;
  }>({ cpf: '', telefone: '', app: 'Uber / 99', observacoes: '' });

  // --- NOVOS CAMPOS PARA DESPESAS MULTI-VEÍCULOS / RATEIO PÁTIO E FROTA ---
  const [modoVeiculosDespesa, setModoVeiculosDespesa] = useState<'unico' | 'multiplos'>('unico');
  const [veiculosMultiplosSelecionados, setVeiculosMultiplosSelecionados] = useState<string[]>([]);
  const [modoRateio, setModoRateio] = useState<'igual' | 'personalizado'>('igual');
  const [valoresRateioCustom, setValoresRateioCustom] = useState<Record<string, string>>({});
  const [buscaVeiculoMultiplo, setBuscaVeiculoMultiplo] = useState<string>('');

  // Categorias Múltiplas / Abrangentes para Custos de Pátio
  const [categoriasMultiplas, setCategoriasMultiplas] = useState<string[]>([]);
  const [novaCategoriaInput, setNovaCategoriaInput] = useState<string>('');

  // Fornecedores Múltiplos
  const [fornecedoresMultiplos, setFornecedoresMultiplos] = useState<string[]>([]);
  const [novoFornecedorTagInput, setNovoFornecedorTagInput] = useState<string>('');

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

  // Contratos de locação ativos indexados
  const contratosAtivos = useMemo(() => {
    const lista: { veiculo: Veiculo; contrato: ContratoLocacao }[] = [];
    veiculos.forEach((v) => {
      if (v.contratoAtivo && v.contratoAtivo.status === 'Ativo') {
        lista.push({ veiculo: v, contrato: v.contratoAtivo });
      }
    });
    return lista;
  }, [veiculos]);

  // Detecção Automática de Contrato Ativo
  const contratoAtivoDetectado = useMemo(() => {
    if (destinoRoteamento !== 'veiculo_locacao') return null;
    const placaClean = veiculoLocacaoPlaca.trim().toUpperCase();
    const pagadorClean = pagadorRecebedor.trim().toLowerCase();

    if (placaClean) {
      const matchPlaca = contratosAtivos.find(
        (c) => c.veiculo.placa?.trim().toUpperCase() === placaClean
      );
      if (matchPlaca) return matchPlaca;
    }

    if (pagadorClean.length >= 3) {
      const matchNome = contratosAtivos.find(
        (c) =>
          c.contrato.motoristaNome?.toLowerCase().includes(pagadorClean) ||
          (c.contrato.motoristaCpf &&
            c.contrato.motoristaCpf.replace(/\D/g, '').includes(pagadorClean.replace(/\D/g, '')))
      );
      if (matchNome) return matchNome;
    }

    return null;
  }, [destinoRoteamento, veiculoLocacaoPlaca, pagadorRecebedor, contratosAtivos]);

  // Próximo vencimento projetado caso aluguel semanal
  const novoVencimentoCalculado = useMemo(() => {
    if (!contratoAtivoDetectado?.contrato) return null;
    const c = contratoAtivoDetectado.contrato;
    const baseStr = c.proximoVencimento || data || new Date().toISOString().split('T')[0];
    try {
      const d = new Date(baseStr + 'T12:00:00');
      if (periodicidadeRecebimento === 'Semanal') {
        d.setDate(d.getDate() + 7);
      } else if (periodicidadeRecebimento === 'Quinzenal') {
        d.setDate(d.getDate() + 15);
      } else if (periodicidadeRecebimento === 'Mensal') {
        d.setMonth(d.getMonth() + 1);
      } else if (periodicidadeRecebimento === 'Diária') {
        d.setDate(d.getDate() + 1);
      }
      return d.toISOString().split('T')[0];
    } catch {
      return null;
    }
  }, [contratoAtivoDetectado, periodicidadeRecebimento, data]);

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

  // Inicializar dados quando abre ou muda movimentacaoToEdit ou props iniciais
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
      const initialT = initialTipo || 'Saída';
      const initialD = initialDestino || (initialT === 'Saída' ? 'despesa_fixa' : 'veiculo_locacao');
      setTipo(initialT);
      setValor('');
      setData(new Date().toISOString().split('T')[0]);
      setContaId(contasBancarias[0]?.id || '');
      setFormaPagamento('PIX / Transf.');
      setPagadorRecebedor(initialPagador || '');
      setSalvarNovoFornecedor(false);
      setCategoriaNovoFornecedor('Outro Parceiro');
      setDestinoRoteamento(initialD);
      const mapa = initialT === 'Saída' ? CATEGORIAS_SAIDA : CATEGORIAS_ENTRADA;
      setCategoria(mapa[initialD]?.[0] || 'Despesa Operacional');
      setTipoCusto(initialT === 'Saída' ? (initialD === 'despesa_fixa' ? 'Fixo' : 'Variável') : 'Neutro');
      setModoDespesaFixa('nova');
      setDespesaFixaExistenteId('');
      setCategoriaDespesaFixa(CATEGORIAS_SAIDA.despesa_fixa[0]);
      setVeiculoEstoqueId(veiculos.filter((v) => v.status !== 'Vendido')[0]?.id || '');
      setCategoriaDespesaVeiculo('Mecânica / Mão de Obra');
      setVeiculoLocacaoPlaca(initialPlaca || '');
      setVeiculoLocacaoModelo('');
      setSalvarNovoVeiculoLocacao(false);
      setPeriodicidadeRecebimento('Semanal');
      setVincularAoPainelLocacao(true);
      setSalvarNovoPagadorSemContrato(false);
      setDadosNovoPagador({ cpf: '', telefone: '', app: 'Uber / 99', observacoes: '' });
      setModoVeiculosDespesa('unico');
      setVeiculosMultiplosSelecionados([]);
      setModoRateio('igual');
      setValoresRateioCustom({});
      setCategoriasMultiplas([]);
      setFornecedoresMultiplos([]);
      setVinculoVendaId('');
      setVinculoVendaTipo('Entrada no Caixa');
      setClienteNome('');
      setDescricao('');
      setObservacoes('');
      setErrorMsg(null);
    }
  }, [isOpen, movimentacaoToEdit, contasBancarias, veiculos, initialTipo, initialDestino, initialPlaca, initialPagador]);

  // Lista combinada de sugestões para Pagador/Recebedor
  const sugestoesNomes = useMemo(() => {
    const lista: string[] = [];
    fornecedores.forEach((f) => {
      if (f.nome && !lista.includes(f.nome)) lista.push(f.nome);
    });
    // Adicionar motoristas de locação ativos
    contratosAtivos.forEach((c) => {
      if (c.contrato.motoristaNome && !lista.includes(c.contrato.motoristaNome)) {
        lista.push(c.contrato.motoristaNome);
      }
    });
    usuarios.forEach((u) => {
      const nome = u.nomeCompleto || u.displayName;
      if (nome && !lista.includes(nome)) lista.push(nome);
    });
    return lista;
  }, [fornecedores, contratosAtivos, usuarios]);

  // Verifica se o texto digitado já existe
  const nomeExisteNoCadastro = useMemo(() => {
    const limpo = pagadorRecebedor.trim().toLowerCase();
    if (!limpo) return true;
    return sugestoesNomes.some((s) => s.toLowerCase() === limpo);
  }, [pagadorRecebedor, sugestoesNomes]);

  // Placas de veículos de locação existentes
  const placasLocacaoExistentes = useMemo(() => {
    return veiculos
      .filter((v) => v.tipoOperacao === 'Locacao' || v.contratoAtivo || v.status === 'Disponível')
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

  // Lista filtrada de todos os veículos ativos para rateio
  const veiculosParaRateio = useMemo(() => {
    const query = buscaVeiculoMultiplo.trim().toLowerCase();
    const lista = veiculos.filter((v) => v.status !== 'Vendido');
    if (!query) return lista;
    return lista.filter(
      (v) =>
        v.placa?.toLowerCase().includes(query) ||
        v.modelo?.toLowerCase().includes(query) ||
        v.marca?.toLowerCase().includes(query)
    );
  }, [veiculos, buscaVeiculoMultiplo]);

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

    if (destinoRoteamento === 'veiculo_estoque' && modoVeiculosDespesa === 'unico' && !veiculoEstoqueId) {
      setErrorMsg('Selecione um veículo em estoque para vincular a despesa.');
      return;
    }

    if (destinoRoteamento === 'veiculo_locacao') {
      if (tipo === 'Saída' && modoVeiculosDespesa === 'unico' && !veiculoLocacaoPlaca.trim()) {
        setErrorMsg('Informe a placa do veículo de locação.');
        return;
      }
      if (tipo === 'Entrada' && !veiculoLocacaoPlaca.trim() && !pagadorRecebedor.trim()) {
        setErrorMsg('Informe ao menos a placa do veículo ou o nome do pagador da frota.');
        return;
      }
    }

    if (tipo === 'Saída' && modoVeiculosDespesa === 'multiplos' && veiculosMultiplosSelecionados.length === 0) {
      setErrorMsg('Selecione ao menos um veículo para associar ao rateio de custos.');
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
        // MODO CRIAÇÃO: LANÇAMENTO EXPRESSO ULTRA-RÁPIDO COM SUPORTE MULTI-VEÍCULOS E FROTA
        const isMultiplo = tipo === 'Saída' && modoVeiculosDespesa === 'multiplos' && veiculosMultiplosSelecionados.length > 0;
        
        const listaVeiculosMultiplos = isMultiplo
          ? veiculosMultiplosSelecionados.map((vId) => {
              const v = veiculos.find((veic) => veic.id === vId);
              let valRateado = valorNum / veiculosMultiplosSelecionados.length;
              if (modoRateio === 'personalizado' && valoresRateioCustom[vId]) {
                const customVal = parseFloat(valoresRateioCustom[vId].replace(',', '.'));
                if (!isNaN(customVal) && customVal > 0) valRateado = customVal;
              }
              return {
                id: vId,
                placa: v?.placa || '',
                modelo: v?.modelo || '',
                valorRateado: valRateado,
              };
            })
          : undefined;

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
          // Novos parâmetros de Frota e Pátio
          modoRateioMultiplos: isMultiplo,
          veiculosMultiplos: listaVeiculosMultiplos,
          categoriasMultiplas: categoriasMultiplas.length > 0 ? categoriasMultiplas : undefined,
          fornecedoresMultiplos: fornecedoresMultiplos.length > 0 ? fornecedoresMultiplos : (pagadorRecebedor ? [pagadorRecebedor] : undefined),
          salvarNovoPagadorSemContrato: tipo === 'Entrada' && salvarNovoPagadorSemContrato,
          dadosNovoPagador: tipo === 'Entrada' && salvarNovoPagadorSemContrato ? dadosNovoPagador : undefined,
          contratoLocacaoId: contratoAtivoDetectado?.contrato.id,
          vincularAoPainelLocacao: tipo === 'Entrada' && vincularAoPainelLocacao,
          periodicidadeRecebimento: periodicidadeRecebimento,
        };

        const res = await salvarLancamentoExpressoFirestore(params);

        // Notificar e atualizar veículos no estado global
        if (res.veiculosAtualizados && res.veiculosAtualizados.length > 0) {
          onUpdateVeiculos?.(res.veiculosAtualizados);
          res.veiculosAtualizados.forEach((v) => onUpdateVeiculo?.(v));
        } else if (res.veiculoLocacaoAtualizado) {
          onUpdateVeiculo?.(res.veiculoLocacaoAtualizado);
        }

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

            {/* Rota 3: Veículo de Locação / Frota (Receitas e Custos Separados) */}
            {destinoRoteamento === 'veiculo_locacao' && (
              <div className="space-y-4">
                {/* 1. SE FOR ENTRADA: RECEITA DE FROTA TOTALMENTE INDEPENDENTE DE CUSTO */}
                {tipo === 'Entrada' ? (
                  <div className="space-y-3.5">
                    {/* Badge informativo de Receita de Frota */}
                    <div className="flex items-center justify-between p-2.5 bg-emerald-50/80 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800/60">
                      <div className="flex items-center gap-2">
                        <KeyRound size={16} className="text-emerald-600 dark:text-emerald-400" />
                        <div>
                          <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                            Recebimento de Locação de Frota
                          </span>
                          <p className="text-[10px] text-emerald-700 dark:text-emerald-300">
                            Entradas independentes de opções de custo, com controle de periodicidade e baixa automática.
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200/60 dark:bg-emerald-800/60 text-emerald-800 dark:text-emerald-200">
                        Receita Ativa
                      </span>
                    </div>

                    {/* Periodicidade de Recebimento */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Calendar size={13} className="text-indigo-600 dark:text-indigo-400" />
                          Periodicidade do Recebimento *
                        </label>
                        <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-medium">
                          ⚡ Padrão da rotina: Semanal (+7 dias de vigência)
                        </span>
                      </div>
                      <div className="grid grid-cols-5 gap-1.5">
                        {(['Semanal', 'Quinzenal', 'Mensal', 'Diária', 'Avulso'] as const).map((per) => (
                          <button
                            key={per}
                            type="button"
                            onClick={() => {
                              setPeriodicidadeRecebimento(per);
                              if (per === 'Semanal' && !categoria.toLowerCase().includes('semanal')) {
                                setCategoria('Recebimento Semanal (Aluguel Semanal / Semanalidade)');
                              }
                            }}
                            className={`py-2 px-1 rounded-xl text-xs font-bold transition-all text-center flex flex-col items-center justify-center gap-0.5 ${
                              periodicidadeRecebimento === per
                                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 ring-2 ring-emerald-500/30'
                                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750'
                            }`}
                          >
                            <span>{per}</span>
                            {per === 'Semanal' && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-800/60 text-emerald-100 font-normal">
                                Principal
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Seleção do Veículo da Frota e Motorista */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                          Placa do Veículo da Frota *
                        </label>
                        <input
                          type="text"
                          list="placas-locacao-lista"
                          placeholder="Ex: ABC1D23"
                          value={veiculoLocacaoPlaca}
                          onChange={(e) => {
                            const val = e.target.value.toUpperCase();
                            setVeiculoLocacaoPlaca(val);
                            // Se encontrar contrato por placa, sugere automaticamente o motorista
                            const match = contratosAtivos.find(
                              (c) => c.veiculo.placa?.trim().toUpperCase() === val.trim()
                            );
                            if (match) {
                              if (!pagadorRecebedor) setPagadorRecebedor(match.contrato.motoristaNome);
                              if (!valor || valor === '0') setValor(match.contrato.valorSemanal.toString());
                            }
                          }}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono uppercase text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                        <datalist id="placas-locacao-lista">
                          {placasLocacaoExistentes.map((p, idx) => (
                            <option key={idx} value={p} />
                          ))}
                        </datalist>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                          Motorista / Contrato Ativo
                        </label>
                        <select
                          value={contratoAtivoDetectado ? contratoAtivoDetectado.contrato.id : ''}
                          onChange={(e) => {
                            const match = contratosAtivos.find((c) => c.contrato.id === e.target.value);
                            if (match) {
                              setVeiculoLocacaoPlaca(match.veiculo.placa || '');
                              setPagadorRecebedor(match.contrato.motoristaNome);
                              if (!valor || valor === '0') setValor(match.contrato.valorSemanal.toString());
                              setDescricao(
                                `Recebimento ${periodicidadeRecebimento}: ${match.contrato.motoristaNome} (${match.veiculo.placa})`
                              );
                            }
                          }}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        >
                          <option value="">Selecione ou identifique pela placa/nome...</option>
                          {contratosAtivos.map((c, idx) => (
                            <option key={`${c.veiculo.id}_${c.contrato.id}_${idx}`} value={c.contrato.id}>
                              {c.contrato.motoristaNome} — {c.veiculo.placa} (R$ {c.contrato.valorSemanal}/sem)
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* CARD A: CONTRATO ATIVO ENCONTRADO -> VINCULAÇÃO AUTOMÁTICA AO PAINEL DE LOCAÇÃO */}
                    {contratoAtivoDetectado ? (
                      <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/40 rounded-xl border border-emerald-300 dark:border-emerald-800 space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 mt-0.5" />
                            <div>
                              <div className="text-xs font-bold text-emerald-950 dark:text-emerald-100">
                                Contrato Ativo Localizado: {contratoAtivoDetectado.contrato.motoristaNome}
                              </div>
                              <div className="text-[11px] text-emerald-800 dark:text-emerald-300">
                                Veículo: <strong>{contratoAtivoDetectado.veiculo.modelo}</strong> ({contratoAtivoDetectado.veiculo.placa}) | Valor Semanalidade: R$ {contratoAtivoDetectado.contrato.valorSemanal?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </div>
                            </div>
                          </div>
                          {novoVencimentoCalculado && (
                            <div className="text-right">
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Novo Vencimento:</span>
                              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                                {novoVencimentoCalculado.split('-').reverse().join('/')}
                              </span>
                            </div>
                          )}
                        </div>

                        <label className="flex items-center gap-2 cursor-pointer pt-1 border-t border-emerald-200 dark:border-emerald-800/80 text-xs font-medium text-emerald-900 dark:text-emerald-200">
                          <input
                            type="checkbox"
                            checked={vincularAoPainelLocacao}
                            onChange={(e) => setVincularAoPainelLocacao(e.target.checked)}
                            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-emerald-300"
                          />
                          <span>
                            <strong>Vincular automaticamente ao Painel de Locação:</strong> Gerar recibo de aluguel e avançar data do próximo vencimento (+7 dias).
                          </span>
                        </label>
                      </div>
                    ) : (
                      /* CARD B: PAGADOR SEM CONTRATO ATIVO -> PRÉ-CADASTRO */
                      <div className="p-3 bg-amber-50/70 dark:bg-amber-950/40 rounded-xl border border-amber-300 dark:border-amber-800 space-y-2.5">
                        <div className="flex items-start gap-2">
                          <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                          <div>
                            <div className="text-xs font-bold text-amber-950 dark:text-amber-200">
                              Pagador sem contrato ativo vinculado no momento
                            </div>
                            <p className="text-[11px] text-amber-800 dark:text-amber-300">
                              O valor será creditado no caixa/conta normalmente. Você pode pré-cadastrar este pagador para o painel de locação.
                            </p>
                          </div>
                        </div>

                        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-amber-900 dark:text-amber-200">
                          <input
                            type="checkbox"
                            checked={salvarNovoPagadorSemContrato}
                            onChange={(e) => setSalvarNovoPagadorSemContrato(e.target.checked)}
                            className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-amber-300"
                          />
                          <span>
                            Pré-cadastrar Pagador / Motorista no Painel de Locação (sem contrato ativo)
                          </span>
                        </label>

                        {salvarNovoPagadorSemContrato && (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-amber-200 dark:border-amber-800/80">
                            <div>
                              <label className="block text-[10px] font-semibold text-amber-950 dark:text-amber-200 mb-1">
                                CPF do Pagador
                              </label>
                              <input
                                type="text"
                                placeholder="000.000.000-00"
                                value={dadosNovoPagador.cpf}
                                onChange={(e) =>
                                  setDadosNovoPagador({ ...dadosNovoPagador, cpf: e.target.value })
                                }
                                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-semibold text-amber-950 dark:text-amber-200 mb-1">
                                WhatsApp / Telefone
                              </label>
                              <input
                                type="text"
                                placeholder="(11) 99999-9999"
                                value={dadosNovoPagador.telefone}
                                onChange={(e) =>
                                  setDadosNovoPagador({ ...dadosNovoPagador, telefone: e.target.value })
                                }
                                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-semibold text-amber-950 dark:text-amber-200 mb-1">
                                Aplicativo / Perfil
                              </label>
                              <select
                                value={dadosNovoPagador.app}
                                onChange={(e) =>
                                  setDadosNovoPagador({ ...dadosNovoPagador, app: e.target.value })
                                }
                                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none"
                              >
                                <option value="Uber / 99">Uber & 99 Pop</option>
                                <option value="Uber Black">Uber Black / Comfort</option>
                                <option value="Indrive">InDrive</option>
                                <option value="Entrega / Logística">Entrega / Logística</option>
                                <option value="Particular / Empresa">Particular / Frota Própria</option>
                              </select>
                            </div>
                          </div>
                        )}

                        {onOpenNovoContrato && (
                          <div className="pt-2 flex justify-end border-t border-amber-200/60 dark:border-amber-800/40">
                            <button
                              type="button"
                              onClick={() => {
                                const vMatch = veiculos.find(
                                  (veic) =>
                                    veic.placa.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() ===
                                    veiculoLocacaoPlaca.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
                                );
                                onClose();
                                onOpenNovoContrato(vMatch, {
                                  nome: pagadorRecebedor,
                                  cpf: dadosNovoPagador.cpf,
                                  telefone: dadosNovoPagador.telefone,
                                  app: dadosNovoPagador.app,
                                  placaInteresse: veiculoLocacaoPlaca,
                                });
                              }}
                              className="text-[11px] font-bold text-amber-900 dark:text-amber-200 hover:text-amber-950 dark:hover:text-white flex items-center gap-1.5 underline decoration-amber-400 cursor-pointer"
                            >
                              <FileText size={13} />
                              Formalizar Contrato completo agora com estes dados pré-preenchidos &rarr;
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  /* 2. SE FOR SAÍDA: CUSTO DE FROTA E MANUTENÇÃO COM MULTI-VEÍCULO E RATEIO */
                  <div className="space-y-3.5">
                    {/* Modo de aplicação de custo: Veículo único vs Múltiplos Veículos */}
                    <div className="flex items-center justify-between p-2.5 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Wrench size={14} className="text-rose-600 dark:text-rose-400" />
                        Destino do Custo de Frota:
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setModoVeiculosDespesa('unico')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                            modoVeiculosDespesa === 'unico'
                              ? 'bg-white dark:bg-slate-700 text-rose-700 dark:text-rose-300 shadow-sm'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          🚗 Veículo Único
                        </button>
                        <button
                          type="button"
                          onClick={() => setModoVeiculosDespesa('multiplos')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                            modoVeiculosDespesa === 'multiplos'
                              ? 'bg-rose-600 text-white shadow-sm'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          🚙 Múltiplos Veículos / Rateio Pátio ({veiculosMultiplosSelecionados.length})
                        </button>
                      </div>
                    </div>

                    {/* MODO VEÍCULO ÚNICO */}
                    {modoVeiculosDespesa === 'unico' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                            Placa do Veículo de Frota *
                          </label>
                          <input
                            type="text"
                            list="placas-locacao-lista"
                            placeholder="Ex: ABC1D23"
                            value={veiculoLocacaoPlaca}
                            onChange={(e) => setVeiculoLocacaoPlaca(e.target.value.toUpperCase())}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono uppercase text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none"
                          />
                          <datalist id="placas-locacao-lista">
                            {placasLocacaoExistentes.map((p, idx) => (
                              <option key={idx} value={p} />
                            ))}
                          </datalist>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                            Tipo de Custo de Frota / Manutenção
                          </label>
                          <select
                            value={categoriaDespesaVeiculo}
                            onChange={(e) => setCategoriaDespesaVeiculo(e.target.value as CategoriaDespesa)}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none"
                          >
                            {CATEGORIAS_CUSTO_FROTA.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ) : (
                      /* MODO MÚLTIPLOS VEÍCULOS / RATEIO PÁTIO E FROTA */
                      <div className="p-3 bg-rose-50/50 dark:bg-rose-950/20 rounded-xl border border-rose-200 dark:border-rose-900/60 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <span className="text-xs font-bold text-rose-950 dark:text-rose-200">
                              Selecione os veículos para rateio ({veiculosMultiplosSelecionados.length} selecionados)
                            </span>
                            <p className="text-[11px] text-rose-700 dark:text-rose-300">
                              O custo total será distribuído proporcionalmente na ficha financeira de cada veículo.
                            </p>
                          </div>

                          {/* Seletor do Modo de Rateio */}
                          <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-lg border border-rose-200 dark:border-rose-800 text-xs">
                            <button
                              type="button"
                              onClick={() => setModoRateio('igual')}
                              className={`px-2.5 py-1 rounded font-bold ${
                                modoRateio === 'igual'
                                  ? 'bg-rose-600 text-white'
                                  : 'text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              Divisão Igual
                            </button>
                            <button
                              type="button"
                              onClick={() => setModoRateio('personalizado')}
                              className={`px-2.5 py-1 rounded font-bold ${
                                modoRateio === 'personalizado'
                                  ? 'bg-rose-600 text-white'
                                  : 'text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              Personalizar
                            </button>
                          </div>
                        </div>

                        {/* Campo de Busca Rápida de Veículos */}
                        <div className="relative">
                          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Buscar veículo por placa, modelo ou marca..."
                            value={buscaVeiculoMultiplo}
                            onChange={(e) => setBuscaVeiculoMultiplo(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none"
                          />
                        </div>

                        {/* Lista de Seleção de Veículos com Scroll */}
                        <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                          {veiculosParaRateio.map((v) => {
                            const isSelected = veiculosMultiplosSelecionados.includes(v.id);
                            return (
                              <div
                                key={v.id}
                                onClick={() => {
                                  if (isSelected) {
                                    setVeiculosMultiplosSelecionados(
                                      veiculosMultiplosSelecionados.filter((id) => id !== v.id)
                                    );
                                  } else {
                                    setVeiculosMultiplosSelecionados([...veiculosMultiplosSelecionados, v.id]);
                                  }
                                }}
                                className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                                  isSelected
                                    ? 'bg-rose-100/60 dark:bg-rose-900/40 border-rose-400 dark:border-rose-700 text-rose-950 dark:text-rose-100 font-semibold'
                                    : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-750 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => {}} // tratado no onClick do container
                                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300"
                                  />
                                  <span className="font-mono text-xs uppercase px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-bold">
                                    {v.placa || 'S/ PLACA'}
                                  </span>
                                  <span className="text-xs truncate max-w-[200px]">
                                    {v.marca} {v.modelo}
                                  </span>
                                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                                    {v.tipoOperacao === 'Locacao' ? 'Frota' : 'Estoque'}
                                  </span>
                                </div>

                                {isSelected && modoRateio === 'personalizado' && (
                                  <div
                                    className="flex items-center gap-1"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <span className="text-[10px] text-slate-500">R$</span>
                                    <input
                                      type="text"
                                      placeholder="Valor"
                                      value={valoresRateioCustom[v.id] || ''}
                                      onChange={(e) =>
                                        setValoresRateioCustom({
                                          ...valoresRateioCustom,
                                          [v.id]: e.target.value,
                                        })
                                      }
                                      className="w-20 px-2 py-0.5 bg-white dark:bg-slate-800 border border-rose-300 dark:border-rose-700 rounded text-xs font-bold text-slate-900 dark:text-white"
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Resumo de Rateio */}
                        {veiculosMultiplosSelecionados.length > 0 && valor && (
                          <div className="pt-2 border-t border-rose-200 dark:border-rose-900/60 flex items-center justify-between text-xs text-rose-900 dark:text-rose-200">
                            <span>
                              Média por veículo:{' '}
                              <strong>
                                R${' '}
                                {(
                                  parseFloat(valor.replace(',', '.')) /
                                  veiculosMultiplosSelecionados.length
                                ).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </strong>
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400">
                              Lançamentos individuais serão registrados em cada veículo
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* CATEGORIAS ABRANGENTES / MÚLTIPLAS */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                        <span>Categorias Adicionais / Serviços Combinados (Opcional):</span>
                        <span className="text-[10px] text-slate-500 font-normal">Permite associar custos a várias áreas</span>
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {CATEGORIAS_CUSTO_FROTA.slice(0, 6).map((cat) => {
                          const isPicked = categoriasMultiplas.includes(cat);
                          return (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => {
                                if (isPicked) {
                                  setCategoriasMultiplas(categoriasMultiplas.filter((c) => c !== cat));
                                } else {
                                  setCategoriasMultiplas([...categoriasMultiplas, cat]);
                                }
                              }}
                              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                                isPicked
                                  ? 'bg-indigo-600 text-white shadow-sm'
                                  : 'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-400'
                              }`}
                            >
                              {isPicked ? '✓ ' : '+ '}
                              {cat}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* FORNECEDORES MÚLTIPLOS / SEM RESTRIÇÃO A UM ÚNICO FORNECEDOR */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Fornecedores & Parceiros Adicionais:
                        </label>
                        <span className="text-[10px] text-slate-500 font-normal">
                          Não se restrinja a um único prestador
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Adicionar outro fornecedor (ex: Auto Peças Silva, Guincho Express)..."
                          value={novoFornecedorTagInput}
                          onChange={(e) => setNovoFornecedorTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (novoFornecedorTagInput.trim()) {
                                setFornecedoresMultiplos([
                                  ...fornecedoresMultiplos,
                                  novoFornecedorTagInput.trim(),
                                ]);
                                setNovoFornecedorTagInput('');
                              }
                            }
                          }}
                          className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (novoFornecedorTagInput.trim()) {
                              setFornecedoresMultiplos([
                                ...fornecedoresMultiplos,
                                novoFornecedorTagInput.trim(),
                              ]);
                              setNovoFornecedorTagInput('');
                            }
                          }}
                          className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-bold hover:bg-slate-300"
                        >
                          Adicionar
                        </button>
                      </div>

                      {fornecedoresMultiplos.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {fornecedoresMultiplos.map((f, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs flex items-center gap-1"
                            >
                              <span>{f}</span>
                              <button
                                type="button"
                                onClick={() =>
                                  setFornecedoresMultiplos(fornecedoresMultiplos.filter((_, idx) => idx !== i))
                                }
                                className="hover:text-rose-500 font-bold ml-0.5"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
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
