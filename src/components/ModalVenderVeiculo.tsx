import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Tag,
  DollarSign,
  Sparkles,
  CheckCircle2,
  TrendingUp,
  Award,
  User,
  Percent,
  Layers,
  PlusCircle,
  Trash2,
  CreditCard,
  Building2,
  ShieldCheck,
  PiggyBank,
  Car,
  Receipt,
  HelpCircle,
  Clock,
  ArrowRight,
  Compass,
  Calendar,
  PhoneCall,
  Navigation,
  Briefcase,
  Gift,
  Truck,
  Check,
  AlertCircle,
  Users,
  UserCheck,
  ChevronDown,
  ChevronUp,
  Calculator,
  ToggleLeft,
  ToggleRight,
  FileText,
  Printer,
  Mail,
  MapPin
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ModalContratoVenda } from './ModalContratoVenda';
import { 
  Veiculo, 
  VendaVeiculo, 
  Usuario, 
  ParcelaPagamentoHibrido,
  CanalOrigemLead,
  OrigemLeadType,
  TipoAtendimentoLead,
  BancoFinanciamentoParceiro,
  BancoParceiro,
  ContaBancariaCaixa,
  RegraRemuneracao,
  ComissaoDetalhadaVenda,
  ConfiguracaoLoja
} from '../types';
import { subscribeContasBancarias, subscribeConfiguracoesLoja } from '../services/firestoreService';
import { calcularComissaoGerencial } from '../utils/comissaoGerencialUtils';
import { 
  formatCurrency, 
  calculateTotalDespesas, 
  calculateCustoTotal, 
  calculateAging 
} from '../utils/formatters';

interface ModalVenderVeiculoProps {
  isOpen: boolean;
  onClose: () => void;
  veiculo: Veiculo | null;
  currentUser?: Usuario | null;
  usuarios?: Usuario[];
  bancosParceiros?: BancoParceiro[];
  profissoesCadastradas?: string[];
  onCadastrarProfissao?: (novaProfissao: string) => Promise<string> | void;
  onConfirmarVenda: (vendaData: VendaVeiculo) => void;
  onAdicionarVeiculoTroca?: (veiculoTroca: Partial<Veiculo>) => void;
}

export const ModalVenderVeiculo: React.FC<ModalVenderVeiculoProps> = ({
  isOpen,
  onClose,
  veiculo,
  currentUser,
  usuarios = [],
  bancosParceiros = [],
  profissoesCadastradas,
  onCadastrarProfissao,
  onConfirmarVenda,
  onAdicionarVeiculoTroca,
}) => {
  const [valorVenda, setValorVenda] = useState<number>(0);
  const [compradorNome, setCompradorNome] = useState('');
  const [compradorCpf, setCompradorCpf] = useState('');
  const [compradorRg, setCompradorRg] = useState('');
  const [compradorEmail, setCompradorEmail] = useState('');
  const [compradorTelefone, setCompradorTelefone] = useState('');
  const [compradorEndereco, setCompradorEndereco] = useState('');
  const [compradorEstadoCivil, setCompradorEstadoCivil] = useState('Brasileiro(a), Solteiro(a)');
  const [dataVenda, setDataVenda] = useState(new Date().toISOString().split('T')[0]);
  const [observacoesVenda, setObservacoesVenda] = useState('');

  // 1. Origem e Qualificação do Lead (Atração & CRM)
  const [origemLead, setOrigemLead] = useState<OrigemLeadType>('Meta Ads');
  const [canalOrigem, setCanalOrigem] = useState<CanalOrigemLead>('Anúncio Pago (Tráfego / Ads)');
  const [tipoAtendimento, setTipoAtendimento] = useState<TipoAtendimentoLead>('Presencial na Loja');
  const [investimentoAnuncioProprio, setInvestimentoAnuncioProprio] = useState<number>(0);

  // 2. Histórico de Engajamento e Relacionamento
  const [quantidadeVisitas, setQuantidadeVisitas] = useState<number>(1);
  const [realizouTestDrive, setRealizouTestDrive] = useState<boolean>(false);
  const [dataHoraTestDrive, setDataHoraTestDrive] = useState<string>('');
  const [observacoesTestDrive, setObservacoesTestDrive] = useState<string>('');

  // 3. Detalhamento do Financiamento
  const [bancoParceiro, setBancoParceiro] = useState<string>('Santander');
  const [valorEntradaFinanciamento, setValorEntradaFinanciamento] = useState<number>(0);
  const [valorFinanciado, setValorFinanciado] = useState<number>(0);
  const [retornoComissaoBanco, setRetornoComissaoBanco] = useState<number>(0);
  const [retornoTipo, setRetornoTipo] = useState<'valor' | 'percentual'>('valor');
  const [retornoPercentual, setRetornoPercentual] = useState<number>(1.5);
  const [contaDestinoEntrada, setContaDestinoEntrada] = useState<string>('Banco Itaú PJ - Conta Corrente');

  // 4. Veículo de Troca / Avaliação
  const [possuiVeiculoTroca, setPossuiVeiculoTroca] = useState<boolean>(false);
  const [trocaPlaca, setTrocaPlaca] = useState<string>('');
  const [trocaModelo, setTrocaModelo] = useState<string>('');
  const [trocaMarca, setTrocaMarca] = useState<string>('');
  const [trocaAnoFabricacao, setTrocaAnoFabricacao] = useState<number>(new Date().getFullYear() - 5);
  const [trocaAnoModelo, setTrocaAnoModelo] = useState<number>(new Date().getFullYear() - 5);
  const [trocaChassi, setTrocaChassi] = useState<string>('');
  const [trocaRenavam, setTrocaRenavam] = useState<string>('');
  const [trocaCor, setTrocaCor] = useState<string>('Prata');
  const [trocaCombustivel, setTrocaCombustivel] = useState<string>('Flex');
  const [trocaKm, setTrocaKm] = useState<number>(0);
  const [trocaProprietarioAtual, setTrocaProprietarioAtual] = useState<string>('');
  const [trocaDocumentoProprietario, setTrocaDocumentoProprietario] = useState<string>('');
  const [trocaValorAvaliacao, setTrocaValorAvaliacao] = useState<number>(0);
  const [trocaMargemRecondicionamento, setTrocaMargemRecondicionamento] = useState<number>(1500);

  // 5. Dados Complementares do Cliente e Pós-Venda
  const [compradorDataNascimento, setCompradorDataNascimento] = useState<string>('');
  const [compradorProfissao, setCompradorProfissao] = useState<string>('');
  const [previsaoEntregaVeiculo, setPrevisaoEntregaVeiculo] = useState<string>('');

  // Gestão Dinâmica de Profissão com Auto-Save compartilhado
  const [isProfissaoDropdownOpen, setIsProfissaoDropdownOpen] = useState(false);
  const [profissaoFeedback, setProfissaoFeedback] = useState<string | null>(null);

  // Financiamento em Nome de Terceiro (Substituição no Contrato)
  const [financiamentoTerceiroAtivo, setFinanciamentoTerceiroAtivo] = useState<boolean>(false);
  const [terceiroNome, setTerceiroNome] = useState('');
  const [terceiroCpf, setTerceiroCpf] = useState('');
  const [terceiroRg, setTerceiroRg] = useState('');
  const [terceiroTelefone, setTerceiroTelefone] = useState('');
  const [terceiroEmail, setTerceiroEmail] = useState('');
  const [terceiroEndereco, setTerceiroEndereco] = useState('');
  const [terceiroEstadoCivil, setTerceiroEstadoCivil] = useState('Brasileiro(a), Solteiro(a)');
  const [terceiroProfissao, setTerceiroProfissao] = useState('');
  const [terceiroDataNascimento, setTerceiroDataNascimento] = useState('');
  const [terceiroGrauParentesco, setTerceiroGrauParentesco] = useState('Pai / Mãe');
  const [terceiroGrauCustom, setTerceiroGrauCustom] = useState('');
  const [terceiroObservacoes, setTerceiroObservacoes] = useState('');

  // Contas Bancárias & Caixas disponíveis no Financeiro DRE (Sincronizado com Firestore)
  const [contasBancariasList, setContasBancariasList] = useState<ContaBancariaCaixa[]>([]);
  const [contasBancariasDisponiveis, setContasBancariasDisponiveis] = useState<string[]>([
    'Banco Itaú PJ - Conta Corrente Principal',
    'Banco Santander PJ - Financiamentos',
    'Caixa Gaveta Showroom (Espécie)',
    'Fundo Reserva CDC Garantia 90d',
  ]);
  const [contaBancariaDestinoNome, setContaBancariaDestinoNome] = useState<string>('Banco Itaú PJ - Conta Corrente Principal');
  const [contaBancariaDestinoId, setContaBancariaDestinoId] = useState<string>('conta_itau_pj');

  useEffect(() => {
    const unsub = subscribeContasBancarias((contas) => {
      if (contas && contas.length > 0) {
        setContasBancariasList(contas);
        setContasBancariasDisponiveis(contas.map(c => c.nome));
        if (!contaBancariaDestinoNome || contaBancariaDestinoNome === 'Conta Bancária Principal') {
          setContaBancariaDestinoNome(contas[0].nome);
          setContaBancariaDestinoId(contas[0].id);
        }
        if (!contaDestinoEntrada || contaDestinoEntrada === 'Banco Itaú PJ - Conta Corrente') {
          setContaDestinoEntrada(contas[0].nome);
        }
      }
    });
    return () => unsub();
  }, []);

  // Seller and Commission: 3 Perfis de Comissionamento
  const [vendedorNome, setVendedorNome] = useState('');
  const [perfilComissao, setPerfilComissao] = useState<'admin_gerente' | 'vendedor_padrao' | 'vendedor_bonus_tac' | 'percentual_venda'>('vendedor_padrao');
  const [comissaoPercentualLucro, setComissaoPercentualLucro] = useState<number>(10); // Regra 1: % sobre lucro
  const [comissaoFixa, setComissaoFixa] = useState<number>(500); // Regra 2: Fixo
  const [comissaoBonusTacPercent, setComissaoBonusTacPercent] = useState<number>(20); // Regra 3: % da TAC do banco
  const [comissaoPercentualVenda, setComissaoPercentualVenda] = useState<number>(1.5); // % do valor bruto
  const [comissaoValorFinal, setComissaoValorFinal] = useState<number>(0);
  const [comissaoAjustadaManualmente, setComissaoAjustadaManualmente] = useState(false);

  // Configurações Globais da Loja e Comissão Gerencial (Overriding)
  const [configLoja, setConfigLoja] = useState<ConfiguracaoLoja | null>(null);
  const [comissaoGerencialAtiva, setComissaoGerencialAtiva] = useState<boolean>(true);
  const [comissaoGerencialTipo, setComissaoGerencialTipo] = useState<'porcentagem_venda' | 'porcentagem_lucro' | 'fixo' | 'manual'>('porcentagem_venda');
  const [comissaoGerencialTaxa, setComissaoGerencialTaxa] = useState<number>(1.0);
  const [comissaoGerencialValor, setComissaoGerencialValor] = useState<number>(0);
  const [comissaoGerencialBeneficiarioId, setComissaoGerencialBeneficiarioId] = useState<string>('');
  const [comissaoGerencialBeneficiarioNome, setComissaoGerencialBeneficiarioNome] = useState<string>('');
  const [comissaoGerencialBeneficiarioEmail, setComissaoGerencialBeneficiarioEmail] = useState<string>('');
  const [comissaoGerencialObservacoes, setComissaoGerencialObservacoes] = useState<string>('');
  const [comissaoGerencialAjustadaManualmente, setComissaoGerencialAjustadaManualmente] = useState<boolean>(false);

  // Modo de Pagamento: 'simples' ou 'hibrido'
  const [modoPagamento, setModoPagamento] = useState<'simples' | 'hibrido'>('simples');
  const [formaSimples, setFormaSimples] = useState<'À Vista PIX' | 'Financiamento' | 'Troca + Volta' | 'Cartão' | 'Dinheiro'>('À Vista PIX');

  // Múltiplas Parcelas / Linhas Híbridas
  const [parcelasHibridas, setParcelasHibridas] = useState<ParcelaPagamentoHibrido[]>([
    {
      id: 'parc-1',
      pagamentoId: 'pag_init_1',
      tipo: 'PIX',
      valorBruto: 0,
      valorLiquido: 0,
      bancoDestino: 'Conta Bancária Principal',
    }
  ]);

  // Fundo de Garantia Pós-Venda (90 Dias CDC) - Visível somente para Admin
  const [reterFundoGarantia, setReterFundoGarantia] = useState<boolean>(true);
  const [percentualFundoGarantia, setPercentualFundoGarantia] = useState<number>(2.0); // 2% da venda

  // Alíquota de Tributação sobre a Margem de Lucro - Visível somente para Admin
  const [aliquotaImpostoMargem, setAliquotaImpostoMargem] = useState<number>(5.93);

  // Rateio e CDI
  const [apropriarRateioLoja, setApropriarRateioLoja] = useState<boolean>(true);
  const custoFixoDiarioEstimado = 18.50; // R$ 18,50 por dia de pátio

  // Modal de Contrato de Venda A4
  const [showContratoModal, setShowContratoModal] = useState<boolean>(false);

  const isAdmin = currentUser?.role === 'admin';
  const isVendedor = currentUser?.role === 'vendedor';
  const podeGerarContrato = currentUser?.permissoes?.podeGerarContratoVenda !== false;

  useEffect(() => {
    if (veiculo) {
      const initialPrice = veiculo.valorVendaSugerido || veiculo.valorFipe || (calculateCustoTotal(veiculo) * 1.2);
      setValorVenda(Number(initialPrice.toFixed(2)));
      setParcelasHibridas([
        {
          id: '1',
          tipo: 'PIX',
          valorBruto: Number(initialPrice.toFixed(2)),
          valorLiquido: Number(initialPrice.toFixed(2)),
          bancoDestino: 'Conta Bancária Principal',
        }
      ]);
    }
    if (currentUser) {
      setVendedorNome(currentUser.displayName || 'Vendedor');
      if (currentUser.role === 'admin') {
        setPerfilComissao(currentUser.regraComissaoPadrao || 'admin_gerente');
      } else {
        // Vendedor ou outro perfil: segue a regra definida pelo Admin na aprovação
        const userRule = currentUser.regraComissaoPadrao || 
          (currentUser.tipoComissaoPadrao === 'fixo' ? 'vendedor_padrao' :
           currentUser.tipoComissaoPadrao === 'lucro_bruto' ? 'admin_gerente' :
           currentUser.tipoComissaoPadrao === 'vendedor_bonus_tac' ? 'vendedor_bonus_tac' :
           currentUser.tipoComissaoPadrao === 'percentual' ? 'percentual_venda' : 'vendedor_padrao');
        setPerfilComissao(userRule);
      }

      if (currentUser.comissaoPadraoFixo !== undefined && currentUser.comissaoPadraoFixo !== null) {
        setComissaoFixa(Number(currentUser.comissaoPadraoFixo));
      }
      if (currentUser.comissaoBonusTacPercent !== undefined && currentUser.comissaoBonusTacPercent !== null) {
        setComissaoBonusTacPercent(Number(currentUser.comissaoBonusTacPercent));
      }
      if (currentUser.comissaoPadraoPercent !== undefined && currentUser.comissaoPadraoPercent !== null) {
        setComissaoPercentualLucro(Number(currentUser.comissaoPadraoPercent));
        setComissaoPercentualVenda(Number(currentUser.comissaoPadraoPercent));
      }
    }
  }, [veiculo, currentUser]);

  // Carregar Configurações Globais da Loja para Comissão Gerencial (Overriding)
  useEffect(() => {
    const unsub = subscribeConfiguracoesLoja((cfg) => {
      if (cfg) {
        setConfigLoja(cfg);
        if (cfg.comissaoGerenteAtiva !== undefined) {
          setComissaoGerencialAtiva(cfg.comissaoGerenteAtiva);
        }
        if (cfg.comissaoGerenteTipo && cfg.comissaoGerenteTipo !== 'desativada') {
          setComissaoGerencialTipo(cfg.comissaoGerenteTipo as any);
        }
        if (cfg.comissaoGerenteTaxa !== undefined) {
          setComissaoGerencialTaxa(cfg.comissaoGerenteTaxa);
        }
        if (cfg.comissaoGerenteBeneficiarioId) {
          setComissaoGerencialBeneficiarioId(cfg.comissaoGerenteBeneficiarioId);
        }
        if (cfg.comissaoGerenteBeneficiarioNome) {
          setComissaoGerencialBeneficiarioNome(cfg.comissaoGerenteBeneficiarioNome);
        }
        if (cfg.comissaoGerenteBeneficiarioEmail) {
          setComissaoGerencialBeneficiarioEmail(cfg.comissaoGerenteBeneficiarioEmail);
        }
        if (cfg.comissaoGerenteObservacoes) {
          setComissaoGerencialObservacoes(cfg.comissaoGerenteObservacoes);
        }
      }
    });
    return () => {
      unsub();
    };
  }, []);

  // Detectar se financiamento ou troca estão ativos no pagamento
  const isFinanciamentoAtivo = useMemo(() => {
    if (modoPagamento === 'simples') {
      return formaSimples === 'Financiamento';
    }
    return parcelasHibridas.some((p) => p.tipo === 'Financiamento');
  }, [modoPagamento, formaSimples, parcelasHibridas]);

  const isTrocaAtiva = useMemo(() => {
    if (possuiVeiculoTroca) return true;
    if (modoPagamento === 'simples') {
      return formaSimples === 'Troca + Volta';
    }
    return parcelasHibridas.some((p) => p.tipo === 'Veículo na Troca');
  }, [possuiVeiculoTroca, modoPagamento, formaSimples, parcelasHibridas]);

  // Cálculos Avançados do Fechamento (Precisão de Centavos)
  const canViewCosts = currentUser?.permissoes?.verCustosAquisicao === true || isAdmin;
  const valorAnuncioAdicional = Number(investimentoAnuncioProprio) > 0 ? Number(investimentoAnuncioProprio) : 0;
  const totalDespesasBase = calculateTotalDespesas(veiculo);
  const totalDespesas = Number((totalDespesasBase + valorAnuncioAdicional).toFixed(2));
  const custoTotal = Number((calculateCustoTotal(veiculo) + valorAnuncioAdicional).toFixed(2));
  const aging = calculateAging(veiculo.dataEntrada);

  // Anúncios já lançados no histórico do veículo
  const anunciosJaLancadosDossie = (veiculo.despesas || [])
    .filter(d => d.categoria === 'Anúncio Patrocinado (Meta/Google Ads)')
    .reduce((sum, d) => sum + (Number(d.valor) || 0), 0);

  const totalRecebimentosBrutos = modoPagamento === 'hibrido'
    ? parcelasHibridas.reduce((acc, p) => acc + (p.valorBruto || 0), 0)
    : valorVenda;

  const totalTaxasMaquininhas = modoPagamento === 'hibrido'
    ? parcelasHibridas.reduce((acc, p) => acc + (p.taxaValor || 0), 0)
    : 0;

  const totalRetornoTacBancos = isFinanciamentoAtivo
    ? (retornoTipo === 'percentual' ? Number(((valorFinanciado * retornoPercentual) / 100).toFixed(2)) : Number(retornoComissaoBanco || 0))
    : 0;

  // Rateio de Custos Indiretos da Loja (Chassi-Dia)
  const rateioIndireto = apropriarRateioLoja ? Number((aging.dias * custoFixoDiarioEstimado).toFixed(2)) : 0;

  // Custo de Oportunidade CDI (10,5% a.a.)
  const custoCdiEstimado = Number((veiculo.custoAquisicao * (Math.pow(1 + 0.105, aging.dias / 365) - 1)).toFixed(2));

  // Lucro Bruto da Venda
  const lucroBruto = Number(((valorVenda + totalRetornoTacBancos) - custoTotal - totalTaxasMaquininhas).toFixed(2));
  const lucroBrutoSemTac = Number((valorVenda - custoTotal - totalTaxasMaquininhas).toFixed(2));

  // Fundo de Garantia
  const valorFundoGarantia = reterFundoGarantia
    ? Number(((valorVenda * percentualFundoGarantia) / 100).toFixed(2))
    : 0;

  // Imposto s/ Margem de Lucro
  const valorImpostoMargem = lucroBruto > 0
    ? Number(((lucroBruto * aliquotaImpostoMargem) / 100).toFixed(2))
    : 0;

  // Motor de Comissões Dinâmicas (Múltiplos Usuários e Isenções por Venda)
  const [isencaoUsuarios, setIsencaoUsuarios] = useState<Record<string, boolean>>({});
  const [isBlocoComissoesExpandido, setIsBlocoComissoesExpandido] = useState<boolean>(true);

  // Recalcular comissão do formulário principal de acordo com a Regra Selecionada
  useEffect(() => {
    if (!comissaoAjustadaManualmente) {
      let valorCalculado = 0;
      if (perfilComissao === 'admin_gerente') {
        // Regra 1: Percentual (%) sobre o Lucro Bruto
        const baseLucro = Math.max(0, lucroBrutoSemTac);
        valorCalculado = Number(((baseLucro * Number(comissaoPercentualLucro || 0)) / 100).toFixed(2));
      } else if (perfilComissao === 'vendedor_padrao') {
        // Regra 2: Valor Fixo (R$) por carro vendido
        valorCalculado = Number(comissaoFixa || 0);
      } else if (perfilComissao === 'vendedor_bonus_tac') {
        // Regra 3: Fixo (R$) + Bonificação/Percentual sobre o Retorno de Financiamento (TAC do Banco)
        const bonusTac = Number(((totalRetornoTacBancos * Number(comissaoBonusTacPercent || 0)) / 100).toFixed(2));
        valorCalculado = Number((Number(comissaoFixa || 0) + bonusTac).toFixed(2));
      } else {
        // Percentual clássico sobre a venda
        valorCalculado = Number(((Number(valorVenda || 0) * Number(comissaoPercentualVenda || 0)) / 100).toFixed(2));
      }
      setComissaoValorFinal(valorCalculado);
    }
  }, [
    valorVenda,
    perfilComissao,
    comissaoPercentualLucro,
    comissaoFixa,
    comissaoBonusTacPercent,
    comissaoPercentualVenda,
    totalRetornoTacBancos,
    lucroBrutoSemTac,
    comissaoAjustadaManualmente
  ]);

  // Recalcular comissão administrativa global (Overriding) do Gestor/Admin
  useEffect(() => {
    if (!comissaoGerencialAjustadaManualmente) {
      if (!comissaoGerencialAtiva) {
        setComissaoGerencialValor(0);
        return;
      }
      let val = 0;
      if (comissaoGerencialTipo === 'porcentagem_venda') {
        val = (Math.max(0, valorVenda) * Number(comissaoGerencialTaxa || 0)) / 100;
      } else if (comissaoGerencialTipo === 'porcentagem_lucro') {
        val = (Math.max(0, lucroBrutoSemTac) * Number(comissaoGerencialTaxa || 0)) / 100;
      } else if (comissaoGerencialTipo === 'fixo') {
        val = Number(comissaoGerencialTaxa || 0);
      }
      setComissaoGerencialValor(Number(val.toFixed(2)));
    }
  }, [
    comissaoGerencialAtiva,
    comissaoGerencialTipo,
    comissaoGerencialTaxa,
    comissaoGerencialAjustadaManualmente,
    valorVenda,
    lucroBrutoSemTac,
  ]);

  // Lista de usuários candidatos ao cálculo de comissão
  const usuariosCandidatos = useMemo(() => {
    const list: Usuario[] = [];
    const seenUids = new Set<string>();

    if (currentUser) {
      list.push(currentUser);
      seenUids.add(currentUser.uid);
    }

    if (usuarios && usuarios.length > 0) {
      usuarios.forEach((u) => {
        if (!seenUids.has(u.uid)) {
          if (u.statusAprovacao !== 'pendente') {
            list.push(u);
            seenUids.add(u.uid);
          }
        }
      });
    }

    return list;
  }, [usuarios, currentUser]);

  // Avaliação dinâmica das regras por usuário
  const comissoesUsuariosCalculadas = useMemo(() => {
    return usuariosCandidatos.map((u) => {
      const isCurrentUser = u.uid === currentUser?.uid;
      const isSeller = isCurrentUser || (vendedorNome && u.displayName?.toLowerCase() === vendedorNome.toLowerCase());

      // Regras de remuneração do usuário
      let regras: RegraRemuneracao[] = [];
      if (u.regrasRemuneracao && Array.isArray(u.regrasRemuneracao) && u.regrasRemuneracao.length > 0) {
        regras = u.regrasRemuneracao;
      } else if (isSeller) {
        // Regras configuradas para o vendedor no formulário
        if (perfilComissao === 'admin_gerente') {
          regras = [{
            id: 'reg_form_lucro',
            tipoBase: 'Lucro do Veículo',
            formato: 'Percentual',
            valorOrPercentual: comissaoPercentualLucro,
            condicaoGatilho: 'Sempre',
            descricao: 'Percentual sobre o Lucro da Venda',
          }];
        } else if (perfilComissao === 'vendedor_padrao') {
          regras = [{
            id: 'reg_form_fixo',
            tipoBase: 'Fixo por Carro',
            formato: 'Valor Fixo',
            valorOrPercentual: comissaoFixa,
            condicaoGatilho: 'Sempre',
            descricao: 'Comissão Fixa por Veículo',
          }];
        } else if (perfilComissao === 'vendedor_bonus_tac') {
          regras = [
            {
              id: 'reg_form_fixo_tac',
              tipoBase: 'Fixo por Carro',
              formato: 'Valor Fixo',
              valorOrPercentual: comissaoFixa,
              condicaoGatilho: 'Sempre',
              descricao: 'Fixo Base por Carro',
            },
            {
              id: 'reg_form_bonus_tac',
              tipoBase: 'Retorno TAC',
              formato: 'Percentual',
              valorOrPercentual: comissaoBonusTacPercent,
              condicaoGatilho: 'Apenas se houver TAC',
              descricao: 'Bônus sobre Retorno Financiamento (TAC)',
            },
          ];
        } else {
          regras = [{
            id: 'reg_form_venda',
            tipoBase: 'Venda Bruta',
            formato: 'Percentual',
            valorOrPercentual: comissaoPercentualVenda,
            condicaoGatilho: 'Sempre',
            descricao: 'Percentual sobre Valor Bruto de Venda',
          }];
        }
      } else {
        // Perfil legado do usuário
        if (u.regraComissaoPadrao === 'admin_gerente') {
          regras = [{
            id: `reg_${u.uid}_lucro`,
            tipoBase: 'Lucro do Veículo',
            formato: 'Percentual',
            valorOrPercentual: u.comissaoPadraoPercent ?? 10,
            condicaoGatilho: 'Sempre',
            descricao: 'Participação sobre o Lucro Líquido Real',
          }];
        } else if (u.regraComissaoPadrao === 'vendedor_bonus_tac') {
          regras = [
            {
              id: `reg_${u.uid}_fixo`,
              tipoBase: 'Fixo por Carro',
              formato: 'Valor Fixo',
              valorOrPercentual: u.comissaoPadraoFixo ?? 400,
              condicaoGatilho: 'Sempre',
              descricao: 'Fixo Base por Carro',
            },
            {
              id: `reg_${u.uid}_tac`,
              tipoBase: 'Retorno TAC',
              formato: 'Percentual',
              valorOrPercentual: u.comissaoBonusTacPercent ?? 20,
              condicaoGatilho: 'Apenas se houver TAC',
              descricao: 'Bônus sobre Retorno Financiamento (TAC)',
            },
          ];
        } else if (u.tipoComissaoPadrao === 'percentual' || u.regraComissaoPadrao === 'percentual_venda') {
          regras = [{
            id: `reg_${u.uid}_venda`,
            tipoBase: 'Venda Bruta',
            formato: 'Percentual',
            valorOrPercentual: u.comissaoPadraoPercent ?? 1.5,
            condicaoGatilho: 'Sempre',
            descricao: 'Percentual sobre Valor de Venda',
          }];
        } else if (u.comissaoPadraoFixo) {
          regras = [{
            id: `reg_${u.uid}_fixo`,
            tipoBase: 'Fixo por Carro',
            formato: 'Valor Fixo',
            valorOrPercentual: u.comissaoPadraoFixo,
            condicaoGatilho: 'Sempre',
            descricao: 'Fixo por Carro',
          }];
        }
      }

      // Avaliar regras individuais
      const regrasAvaliadas = regras.map((r) => {
        let gatilhoAtendido = true;
        let motivoNaoAtendido = '';

        if (r.condicaoGatilho === 'Apenas se houver TAC') {
          gatilhoAtendido = totalRetornoTacBancos > 0;
          if (!gatilhoAtendido) motivoNaoAtendido = 'Venda sem retorno de TAC bancária';
        } else if (r.condicaoGatilho === 'Apenas se for Financiado') {
          gatilhoAtendido = isFinanciamentoAtivo;
          if (!gatilhoAtendido) motivoNaoAtendido = 'Venda sem financiamento ativo';
        }

        let valorCalculado = 0;
        let detalheCalculo = '';
        let baseCalculo = 0;
        const aguardaLiquidacaoTac = r.tipoBase === 'Retorno TAC';

        if (!gatilhoAtendido) {
          valorCalculado = 0;
          detalheCalculo = `Inativo (${motivoNaoAtendido})`;
        } else {
          if (r.tipoBase === 'Fixo por Carro') {
            baseCalculo = Number(r.valorOrPercentual);
            valorCalculado = r.formato === 'Valor Fixo' ? Number(r.valorOrPercentual) : Number(((valorVenda * r.valorOrPercentual) / 100).toFixed(2));
            detalheCalculo = r.formato === 'Valor Fixo' ? `${formatCurrency(r.valorOrPercentual)} fixo` : `${r.valorOrPercentual}% sobre venda (${formatCurrency(valorVenda)})`;
          } else if (r.tipoBase === 'Retorno TAC') {
            baseCalculo = Number(totalRetornoTacBancos);
            valorCalculado = r.formato === 'Percentual' ? Number(((totalRetornoTacBancos * r.valorOrPercentual) / 100).toFixed(2)) : Number(r.valorOrPercentual);
            detalheCalculo = r.formato === 'Percentual' ? `${r.valorOrPercentual}% de ${formatCurrency(totalRetornoTacBancos)} TAC` : `${formatCurrency(r.valorOrPercentual)} fixo TAC`;
          } else if (r.tipoBase === 'Lucro do Veículo') {
            const baseLucro = Math.max(0, lucroBrutoSemTac);
            baseCalculo = baseLucro;
            valorCalculado = r.formato === 'Percentual' ? Number(((baseLucro * r.valorOrPercentual) / 100).toFixed(2)) : Number(r.valorOrPercentual);
            detalheCalculo = r.formato === 'Percentual' ? `${r.valorOrPercentual}% s/ lucro (${formatCurrency(baseLucro)})` : `${formatCurrency(r.valorOrPercentual)} fixo`;
          } else if (r.tipoBase === 'Venda Bruta') {
            baseCalculo = Number(valorVenda);
            valorCalculado = r.formato === 'Percentual' ? Number(((valorVenda * r.valorOrPercentual) / 100).toFixed(2)) : Number(r.valorOrPercentual);
            detalheCalculo = `${r.valorOrPercentual}% sobre venda (${formatCurrency(valorVenda)})`;
          }
        }

        return {
          regraId: r.id,
          tipoBase: r.tipoBase,
          formato: r.formato,
          valorOrPercentual: r.valorOrPercentual,
          condicaoGatilho: r.condicaoGatilho,
          descricao: r.descricao,
          gatilhoAtendido,
          baseCalculo,
          aguardaLiquidacaoTac,
          valorCalculado,
          detalheCalculo,
        };
      });

      // Total apurado das regras
      let totalRegras = regrasAvaliadas.reduce((acc, rg) => acc + (rg.gatilhoAtendido ? rg.valorCalculado : 0), 0);

      // Se o vendedor teve ajuste manual de valor na UI
      if (isSeller && comissaoAjustadaManualmente) {
        totalRegras = Number(comissaoValorFinal || 0);
      }

      const isIsento = isencaoUsuarios[u.uid] === true;

      // Verificar elegibilidade de exibição
      const temRegraAtiva = regrasAvaliadas.some((rg) => rg.gatilhoAtendido && rg.valorCalculado > 0);
      const isFinanciamentoCargo = (u.cargo?.toLowerCase().includes('financiamento') || u.cargo?.toLowerCase().includes('f&i') || u.cargo?.toLowerCase().includes('operador')) && (isFinanciamentoAtivo || totalRetornoTacBancos > 0);
      const elegivelExibicao = isSeller || temRegraAtiva || isFinanciamentoCargo || (regras.length > 0 && isAdmin);

      return {
        usuarioId: u.uid,
        usuarioNome: u.displayName || u.email || 'Usuário',
        usuarioEmail: u.email,
        usuarioCargo: u.cargo || (u.role === 'admin' ? 'Administrador' : u.role === 'gestor' ? 'Gestor' : 'Vendedor'),
        usuarioRole: u.role,
        isSeller,
        regrasAvaliadas,
        totalCalculado: totalRegras,
        isento: isIsento,
        elegivelExibicao,
      };
    }).filter((u) => u.elegivelExibicao);
  }, [
    usuariosCandidatos,
    currentUser,
    vendedorNome,
    perfilComissao,
    comissaoPercentualLucro,
    comissaoFixa,
    comissaoBonusTacPercent,
    comissaoPercentualVenda,
    comissaoValorFinal,
    comissaoAjustadaManualmente,
    totalRetornoTacBancos,
    isFinanciamentoAtivo,
    lucroBrutoSemTac,
    valorVenda,
    isencaoUsuarios,
    isAdmin,
  ]);

  // Total de comissões ativas debitadas do DRE
  const totalComissoesAtivasValor = useMemo(() => {
    return comissoesUsuariosCalculadas
      .filter((u) => !u.isento)
      .reduce((acc, u) => acc + u.totalCalculado, 0);
  }, [comissoesUsuariosCalculadas]);

  // Lista para salvar em VendaVeiculo.comissoesDetalhadas
  const comissoesDetalhadasParaVenda: ComissaoDetalhadaVenda[] = useMemo(() => {
    const list: ComissaoDetalhadaVenda[] = [];
    comissoesUsuariosCalculadas.forEach((u) => {
      u.regrasAvaliadas.forEach((r) => {
        const aguardaTac = r.aguardaLiquidacaoTac;
        list.push({
          id: `com_${veiculo.id}_${u.usuarioId}_${r.regraId}`,
          veiculoId: veiculo.id,
          placa: veiculo.placa,
          usuarioId: u.usuarioId,
          usuarioNome: u.usuarioNome,
          usuarioEmail: u.usuarioEmail,
          usuarioCargo: u.usuarioCargo,
          usuarioRole: u.usuarioRole,
          beneficiarioPapel: u.isSeller ? 'Vendedor' : (u.usuarioRole === 'admin' ? 'Gerente' : 'Responsavel_Financiamento'),
          regraId: r.regraId,
          tipoBase: r.tipoBase,
          formato: r.formato,
          valorOrPercentual: r.valorOrPercentual,
          condicaoGatilho: r.condicaoGatilho,
          baseCalculo: r.baseCalculo,
          valorCalculado: u.isento ? 0 : r.valorCalculado,
          isento: u.isento,
          motivoIsencao: u.isento ? 'Isentado nesta venda' : undefined,
          aguardaLiquidacaoTac: aguardaTac,
          statusLiberacao: aguardaTac ? 'Aguardando_Condicao' : 'Liberada_Para_Pagamento',
          statusPagamento: 'Pendente',
          status: 'Pendente',
        });
      });
    });
    return list;
  }, [comissoesUsuariosCalculadas, veiculo.id, veiculo.placa]);

  // Alternar isenção do usuário
  const handleToggleIsencao = (usuarioId: string) => {
    setIsencaoUsuarios((prev) => ({
      ...prev,
      [usuarioId]: !prev[usuarioId],
    }));
  };

  // Lucro Líquido Real no Bolso (imediata dedução de todas as comissões ativas)
  const lucroLiquidoRealNoBolso = Number((lucroBruto - totalComissoesAtivasValor - valorFundoGarantia - valorImpostoMargem - rateioIndireto).toFixed(2));
  const margemRealPercent = valorVenda > 0 ? (lucroLiquidoRealNoBolso / valorVenda) * 100 : 0;

  // Helper para adicionar nova linha de pagamento híbrido
  const handleAddParcela = () => {
    const totalJaAlocado = parcelasHibridas.reduce((acc, p) => acc + p.valorBruto, 0);
    const saldoRestante = Math.max(0, valorVenda - totalJaAlocado);
    const idUnico = `parc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const pagamentoIdUnico = `pag_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    setParcelasHibridas((prev) => [
      ...prev,
      {
        id: idUnico,
        pagamentoId: pagamentoIdUnico,
        tipo: 'Financiamento',
        valorBruto: saldoRestante,
        valorLiquido: saldoRestante,
        bancoDestino: bancoParceiro || 'BV Financeira',
      }
    ]);
  };

  const handleUpdateParcela = (id: string, updates: Partial<ParcelaPagamentoHibrido>) => {
    setParcelasHibridas((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const updated = { ...p, ...updates };
          // Se for cartão com taxa
          if (updated.taxaPercentual && updated.taxaPercentual > 0) {
            updated.taxaValor = Number(((updated.valorBruto * updated.taxaPercentual) / 100).toFixed(2));
            updated.valorLiquido = Number((updated.valorBruto - updated.taxaValor).toFixed(2));
          } else {
            updated.taxaValor = 0;
            updated.valorLiquido = updated.valorBruto;
          }
          return updated;
        }
        return p;
      })
    );
  };

  const handleRemoveParcela = (id: string) => {
    if (parcelasHibridas.length <= 1) return;
    setParcelasHibridas((prev) => prev.filter((p) => p.id !== id));
  };

  // Processamento e Autocomplete de Profissões
  const listaProfissoes = useMemo(() => {
    return profissoesCadastradas && profissoesCadastradas.length > 0
      ? profissoesCadastradas
      : [
          'Administrador(a)',
          'Advogado(a)',
          'Aposentado(a) / Pensionista',
          'Arquiteto(a) / Urbanista',
          'Autônomo(a) / Prestador de Serviços',
          'Bancário(a) / Finanças',
          'Comerciante / Lojista',
          'Contador(a) / Auditor(a)',
          'Dentista / Odontologista',
          'Desenvolvedor(a) / TI / Tech',
          'Empresário(a) / Produtor',
          'Enfermeiro(a) / Saúde',
          'Engenheiro(a)',
          'Farmacêutico(a)',
          'Fisioterapeuta',
          'Funcionário(a) CLT / Privado',
          'Mecânico(a) / Técnico Automotivo',
          'Médico(a)',
          'Motorista de Aplicativo / Uber / 99',
          'Motorista de Caminhão / Carreteiro',
          'Nutricionista',
          'Policial / Bombeiro / Militar',
          'Produtor(a) Rural / Agro',
          'Professor(a) / Educador(a)',
          'Psicólogo(a)',
          'Representante Comercial / Vendedor',
          'Servidor(a) Público(a) Municipal/Estadual/Federal',
          'Veterinário(a)',
          'Outra Profissão'
        ];
  }, [profissoesCadastradas]);

  const profissoesFiltradas = useMemo(() => {
    const q = compradorProfissao.trim().toLowerCase();
    if (!q) return listaProfissoes;
    return listaProfissoes.filter((p) => p.toLowerCase().includes(q));
  }, [listaProfissoes, compradorProfissao]);

  const existeCorrespondenciaExata = useMemo(() => {
    const q = compradorProfissao.trim().toLowerCase();
    if (!q) return true;
    return listaProfissoes.some((p) => p.toLowerCase() === q);
  }, [listaProfissoes, compradorProfissao]);

  const handleSalvarNovaProfissao = async (nomeParaSalvar?: string) => {
    const target = (nomeParaSalvar || compradorProfissao).trim();
    if (!target) return;

    if (onCadastrarProfissao) {
      const nomeFormatado = await onCadastrarProfissao(target);
      if (nomeFormatado) {
        setCompradorProfissao(nomeFormatado);
      } else {
        setCompradorProfissao(target);
      }
    } else {
      setCompradorProfissao(target);
    }

    setIsProfissaoDropdownOpen(false);
    setProfissaoFeedback(`✓ Profissão "${target}" salva e compartilhada com toda a equipe!`);
    setTimeout(() => setProfissaoFeedback(null), 3500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!compradorNome.trim() || valorVenda <= 0) {
      alert('Por favor, informe o nome do comprador e o valor de venda.');
      return;
    }

    if (modoPagamento === 'hibrido' && Math.abs(totalRecebimentosBrutos - valorVenda) > 1) {
      alert(`A soma das formas de pagamento (${formatCurrency(totalRecebimentosBrutos)}) deve ser exatamente igual ao valor de venda (${formatCurrency(valorVenda)}).`);
      return;
    }

    // Se o vendedor digitou uma profissão nova e não apertou enter antes, salva automaticamente no banco compartilhado
    if (compradorProfissao.trim() && !existeCorrespondenciaExata && onCadastrarProfissao) {
      onCadastrarProfissao(compradorProfissao.trim());
    }

    // Launch celebratory confetti
    try {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
      });
    } catch {
      // Ignore if blocked
    }

    // Se houver veículo de troca, verificar se cria no estoque
    let veiculoTrocaInfo = undefined;
    if (isTrocaAtiva && trocaPlaca.trim()) {
      const valorAvaliadoTroca = trocaValorAvaliacao > 0 
        ? trocaValorAvaliacao 
        : (parcelasHibridas.find(p => p.tipo === 'Veículo na Troca')?.valorBruto || 0);

      veiculoTrocaInfo = {
        placa: trocaPlaca.toUpperCase().trim(),
        modelo: trocaModelo.trim() || 'Veículo Recebido na Troca',
        marca: trocaMarca.trim() || 'Diversas',
        ano: Number(trocaAnoModelo) || Number(trocaAnoFabricacao) || new Date().getFullYear() - 5,
        valorAvaliado: valorAvaliadoTroca,
      };

      if (onAdicionarVeiculoTroca && valorAvaliadoTroca > 0) {
        onAdicionarVeiculoTroca({
          placa: trocaPlaca.toUpperCase().trim(),
          modelo: trocaModelo.trim() || 'Veículo Recebido na Troca',
          marca: trocaMarca.trim() || 'Diversas',
          ano: Number(trocaAnoModelo) || Number(trocaAnoFabricacao) || new Date().getFullYear() - 5,
          anoFabricacao: Number(trocaAnoFabricacao) || Number(trocaAnoModelo) || new Date().getFullYear() - 5,
          anoModelo: Number(trocaAnoModelo) || Number(trocaAnoFabricacao) || new Date().getFullYear() - 5,
          cor: trocaCor.trim() || 'Prata',
          chassi: trocaChassi.trim() ? trocaChassi.toUpperCase().trim() : `TROCA-${trocaPlaca.toUpperCase().trim().replace(/[^A-Z0-9]/g, '')}-${Date.now().toString().slice(-4)}`,
          renavam: trocaRenavam.trim() || undefined,
          combustivel: (trocaCombustivel as any) || 'Flex',
          kmAtual: Number(trocaKm) || 0,
          kmUltimaRevisao: Number(trocaKm) || 0,
          custoAquisicao: valorAvaliadoTroca,
          valorVendaSugerido: Number((valorAvaliadoTroca * 1.25).toFixed(2)),
          dataEntrada: new Date().toISOString().split('T')[0],
          dataAquisicao: new Date().toISOString().split('T')[0],
          status: 'Em Preparação',
          status_estoque: 'Em Preparação',
          proprietarioAnterior: {
            nome: trocaProprietarioAtual.trim() || undefined,
            documento: trocaDocumentoProprietario.trim() || undefined,
          },
          observacoes: `Veículo recebido na troca na venda do chassi ${veiculo.chassi} (${veiculo.placa}). Avaliação R$ ${valorAvaliadoTroca}. Margem recondicionamento: ${formatCurrency(trocaMargemRecondicionamento)}`,
          despesas: [],
        });
      }
    }

    const financiamentoTerceiroData = (financiamentoTerceiroAtivo && terceiroNome.trim()) ? {
      ativo: true,
      nomeTerceiro: terceiroNome.trim(),
      cpfTerceiro: terceiroCpf.trim() || 'Não informado',
      rgTerceiro: terceiroRg.trim() || undefined,
      telefoneTerceiro: terceiroTelefone.trim() || undefined,
      emailTerceiro: terceiroEmail.trim() || undefined,
      enderecoTerceiro: terceiroEndereco.trim() || undefined,
      estadoCivilTerceiro: terceiroEstadoCivil.trim() || undefined,
      profissaoTerceiro: terceiroProfissao.trim() || undefined,
      dataNascimentoTerceiro: terceiroDataNascimento || undefined,
      grauParentesco: terceiroGrauParentesco === 'Outro' 
        ? (terceiroGrauCustom.trim() || 'Outro Parentesco') 
        : terceiroGrauParentesco,
      observacoes: terceiroObservacoes.trim() || undefined,
    } : undefined;

    const novaVendaId = `venda-${Date.now()}`;
    const comissoesComVendaId = comissoesDetalhadasParaVenda.map((c) => ({
      ...c,
      id: `com_${novaVendaId}_${c.usuarioId}_${c.regraId || 'reg'}`,
      vendaId: novaVendaId,
    }));

    const novaVenda: VendaVeiculo = {
      id: novaVendaId,
      veiculoId: veiculo.id,
      placa: veiculo.placa,
      modelo: veiculo.modelo,
      chassi: veiculo.chassi,
      valorCompra: veiculo.custoAquisicao,
      totalDespesas,
      custoTotal,
      valorVenda: Number(valorVenda),
      lucroLiquido: lucroBruto,
      margemLucroPercent: custoTotal > 0 ? (lucroBruto / custoTotal) * 100 : 0,
      dataEntrada: veiculo.dataEntrada,
      dataVenda,
      diasEmPatio: aging.dias,
      compradorNome: compradorNome.trim(),
      compradorCpf: compradorCpf.trim() || '000.000.000-00',
      compradorRg: compradorRg.trim() || undefined,
      compradorEmail: compradorEmail.trim() || undefined,
      compradorTelefone: compradorTelefone.trim() || undefined,
      compradorEndereco: compradorEndereco.trim() || undefined,
      compradorEstadoCivil: compradorEstadoCivil.trim() || undefined,
      formaPagamento: modoPagamento === 'hibrido' ? 'Composição Híbrida' : formaSimples,

      // 1. Origem e Qualificação do Lead (Atração & CRM)
      origemLead,
      despesaMarketingAplicadaPosVenda: 0,
      canalOrigem,
      tipoAtendimento,
      investimentoAnuncioProprio: valorAnuncioAdicional > 0 ? valorAnuncioAdicional : undefined,

      // 2. Histórico de Engajamento e Relacionamento
      quantidadeVisitas: Number(quantidadeVisitas || 1),
      realizouTestDrive,
      dataHoraTestDrive: realizouTestDrive ? dataHoraTestDrive : undefined,
      observacoesTestDrive: realizouTestDrive ? observacoesTestDrive : undefined,

      // 3. Detalhamento do Financiamento
      financiamentoDetalhes: isFinanciamentoAtivo ? {
        bancoParceiro,
        valorEntrada: Number(valorEntradaFinanciamento || 0),
        valorFinanciado: Number(valorFinanciado || (valorVenda - valorEntradaFinanciamento)),
        retornoComissaoBanco: totalRetornoTacBancos,
        retornoTipo,
        retornoPercentual: retornoTipo === 'percentual' ? Number(retornoPercentual) : undefined,
        contaDestinoEntrada: valorEntradaFinanciamento > 0 ? contaDestinoEntrada : undefined,
      } : undefined,
      financiamentoTerceiro: financiamentoTerceiroData,

      // Conta Bancária / Caixa de Destino do Recebimento (Bancos & Giro)
      contaBancariaDestinoId: contaBancariaDestinoId || undefined,
      contaBancariaDestinoNome: contaBancariaDestinoNome || undefined,

      // 4. Veículo de Troca / Avaliação
      veiculoTrocaDetalhes: isTrocaAtiva ? {
        possuiTroca: true,
        placa: trocaPlaca.toUpperCase().trim(),
        modelo: trocaModelo.trim(),
        marca: trocaMarca.trim() || undefined,
        ano: Number(trocaAnoModelo) || Number(trocaAnoFabricacao) || new Date().getFullYear() - 5,
        anoFabricacao: Number(trocaAnoFabricacao) || undefined,
        anoModelo: Number(trocaAnoModelo) || undefined,
        chassi: trocaChassi.toUpperCase().trim() || undefined,
        renavam: trocaRenavam.trim() || undefined,
        cor: trocaCor.trim() || undefined,
        combustivel: trocaCombustivel.trim() || undefined,
        km: Number(trocaKm) || undefined,
        proprietarioAtual: trocaProprietarioAtual.trim() || undefined,
        documentoProprietario: trocaDocumentoProprietario.trim() || undefined,
        valorAvaliacaoCompra: Number(trocaValorAvaliacao),
        margemRecondicionamentoEstimada: Number(trocaMargemRecondicionamento || 0),
      } : undefined,

      // 5. Dados Complementares do Cliente e Pós-Venda
      compradorDataNascimento: compradorDataNascimento || undefined,
      compradorProfissao: compradorProfissao.trim() || undefined,
      previsaoEntregaVeiculo: previsaoEntregaVeiculo || undefined,

      // Detalhamento de Alta Granularidade
      composicaoPagamento: modoPagamento === 'hibrido'
        ? parcelasHibridas.map((p, idx) => ({
            ...p,
            pagamentoId: p.pagamentoId || p.id || `pag_${idx + 1}`,
          }))
        : undefined,
      retornoFinanciamentoTac: totalRetornoTacBancos,
      taxasMaquininhaTotal: totalTaxasMaquininhas,
      fundoGarantiaProvisao: reterFundoGarantia ? {
        percentual: percentualFundoGarantia,
        valor: valorFundoGarantia,
        liberado: false,
      } : undefined,
      impostoMargemEstimado: valorImpostoMargem,
      rateioCustosIndiretosLoja: rateioIndireto,
      custoOportunidadeCdi: custoCdiEstimado,
      lucroLiquidoRealNoBolso: lucroLiquidoRealNoBolso,
      veiculoTrocaEntrada: veiculoTrocaInfo,
      
      // Vendedor e Comissões
      vendedorId: currentUser?.uid,
      vendedorNome: vendedorNome || currentUser?.displayName || 'Vendedor do Pátio',
      vendedorEmail: currentUser?.email,
      tipoComissao: perfilComissao,
      comissaoPercentual: perfilComissao === 'admin_gerente' ? Number(comissaoPercentualLucro) : (perfilComissao === 'percentual_venda' ? Number(comissaoPercentualVenda) : undefined),
      comissaoFixa: (perfilComissao === 'vendedor_padrao' || perfilComissao === 'vendedor_bonus_tac') ? Number(comissaoFixa) : undefined,
      comissaoBonusTacPercent: perfilComissao === 'vendedor_bonus_tac' ? Number(comissaoBonusTacPercent) : undefined,
      comissaoValor: Number(totalComissoesAtivasValor),
      comissaoAjustadaManualmente,
      comissaoStatus: 'Pendente',
      comissoesDetalhadas: comissoesComVendaId,

      // Comissão Gerencial / Overriding (Admin / Gestor)
      comissaoGerencialAtiva: comissaoGerencialAtiva && Number(comissaoGerencialValor) > 0,
      comissaoGerencialTipo: comissaoGerencialTipo,
      comissaoGerencialTaxa: Number(comissaoGerencialTaxa),
      comissaoGerencialValor: comissaoGerencialAtiva ? Number(comissaoGerencialValor) : 0,
      comissaoGerencialStatus: 'Pendente',
      comissaoGerencialBeneficiarioId: comissaoGerencialBeneficiarioId || undefined,
      comissaoGerencialBeneficiarioNome: comissaoGerencialBeneficiarioNome || 'Diretoria / Gestor Geral',
      comissaoGerencialBeneficiarioEmail: comissaoGerencialBeneficiarioEmail || undefined,
      comissaoGerencialObservacoes: comissaoGerencialObservacoes || undefined,
      comissaoGerencialAjustadaManualmente: comissaoGerencialAjustadaManualmente,

      observacoesVenda,
    };

    onConfirmarVenda(novaVenda);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col bg-gray-900 rounded-2xl shadow-xl overflow-hidden border border-white/10">
        {/* Header */}
        <div className="bg-[#16171f] text-white p-5 flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white font-bold shadow-lg shadow-purple-500/20">
              <Tag size={22} />
            </div>
            <div>
              <h3 className="font-extrabold text-lg flex items-center gap-2">
                Fechamento de Venda & Baixa de Chassi
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono border border-purple-500/30">
                  CRM & Gestão Operacional
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Registro estratégico com qualificação do lead, engajamento, financiamento e pós-venda.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-xs bg-[#0a0a0c]">
          {/* Veículo Card Resumo */}
          <div className="p-4 bg-[#16171f] rounded-2xl border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold bg-white/10 text-white px-2 py-0.5 rounded text-xs">
                  {veiculo.placa}
                </span>
                <span className="text-slate-400 text-xs">{veiculo.marca}</span>
                <span className="text-slate-500 text-xs">• Chassi: <strong className="font-mono text-slate-300">{veiculo.chassi}</strong></span>
              </div>
              <h4 className="font-black text-white text-base mt-1">{veiculo.modelo} ({veiculo.ano})</h4>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Dias em Pátio:</span>
                <span className="font-bold text-amber-400">{aging.dias} dias</span>
              </div>
              {canViewCosts && (
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Custo Total Chassi:</span>
                  <span className="font-bold text-white">{formatCurrency(custoTotal)}</span>
                </div>
              )}
            </div>
          </div>

          {/* 1. Origem e Qualificação do Lead (Atração & CRM) */}
          <div className="p-4 bg-[#16171f] rounded-2xl border border-blue-500/20 space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Compass size={18} className="text-blue-400" />
                <h4 className="font-bold text-white text-xs uppercase tracking-wide">
                  1. Origem do Cliente & Rastreamento de Tráfego / Anúncios
                </h4>
              </div>
              <span className="text-[10px] text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20 font-semibold">
                Metrificação de ROI & Performance
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Origem do Lead (Atribuição) *</label>
                <select
                  value={origemLead}
                  onChange={(e) => {
                    const val = e.target.value as OrigemLeadType;
                    setOrigemLead(val);
                    if (val === 'Meta Ads' || val === 'Google Ads') {
                      setCanalOrigem('Anúncio Pago (Tráfego / Ads)');
                    } else if (val === 'Webmotors/OLX') {
                      setCanalOrigem('Portais (Webmotors/OLX)');
                    } else if (val === 'Passante') {
                      setCanalOrigem('Orgânico / Pátio');
                    } else if (val === 'Indicação') {
                      setCanalOrigem('Indicação / Redes Sociais');
                    } else if (val === 'WhatsApp') {
                      setCanalOrigem('Anúncio Pago (Tráfego / Ads)');
                    }
                  }}
                  className="w-full p-2.5 rounded-xl bg-black/40 border border-white/10 text-white font-semibold text-xs outline-none focus:border-blue-500"
                >
                  <option value="Meta Ads">📱 Meta Ads (Instagram / Facebook)</option>
                  <option value="Google Ads">🎯 Google Ads (Pesquisa / YouTube)</option>
                  <option value="Webmotors/OLX">🌐 Webmotors / OLX</option>
                  <option value="Passante">🚶 Passante / Loja Física</option>
                  <option value="Indicação">🤝 Indicação de Cliente</option>
                  <option value="WhatsApp">💬 WhatsApp Direto</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Canal de Origem CRM</label>
                <select
                  value={canalOrigem}
                  onChange={(e) => setCanalOrigem(e.target.value as CanalOrigemLead)}
                  className="w-full p-2.5 rounded-xl bg-black/40 border border-white/10 text-white font-semibold text-xs outline-none focus:border-blue-500"
                >
                  <option value="Anúncio Pago (Tráfego / Ads)">🚀 Anúncio Pago (Tráfego / Ads)</option>
                  <option value="Orgânico / Pátio">🚶 Orgânico / Pátio</option>
                  <option value="Portais (Webmotors/OLX)">🌐 Portais (Webmotors/OLX)</option>
                  <option value="Indicação / Redes Sociais">📱 Indicação / Redes Sociais</option>
                  {/* Opções legacy preservadas */}
                  <option value="Anúncio Pago (Google/Meta)">🎯 Anúncio Pago (Google / Meta Ads)</option>
                  <option value="Redes Sociais (Instagram/Facebook)">📸 Redes Sociais (Instagram / Facebook)</option>
                  <option value="OLX/Webmotors">📑 OLX / Webmotors</option>
                  <option value="Indicação de Cliente">🤝 Indicação de Cliente</option>
                  <option value="Passante/Pátio">🏬 Passante / Pátio</option>
                  <option value="Cliente Base/Fidelizado">⭐ Cliente Base / Fidelizado</option>
                  <option value="Outro">📌 Outro Canal</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Investimento em Anúncio deste Carro (R$) <span className="text-slate-400 font-normal">(Opcional)</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={investimentoAnuncioProprio || ''}
                  onChange={(e) => setInvestimentoAnuncioProprio(Math.max(0, Number(e.target.value)))}
                  placeholder="0,00 (caso não lançado no dossiê)"
                  className="w-full p-2.5 rounded-xl border border-purple-500/40 bg-black/40 text-purple-300 font-mono font-bold text-xs outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Tipo de Atendimento Inicial *</label>
                <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                  {(['Presencial na Loja', 'Online (WhatsApp/Telefone)', 'Misto'] as TipoAtendimentoLead[]).map((tipo) => (
                    <button
                      type="button"
                      key={tipo}
                      onClick={() => setTipoAtendimento(tipo)}
                      className={`p-2 rounded-xl text-center font-bold text-[11px] border transition cursor-pointer ${
                        tipoAtendimento === tipo
                          ? 'bg-blue-600/30 border-blue-500 text-blue-300 shadow-sm'
                          : 'bg-black/30 border-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      {tipo === 'Presencial na Loja' && '🏢 Loja'}
                      {tipo === 'Online (WhatsApp/Telefone)' && '📲 Online'}
                      {tipo === 'Misto' && '🔄 Misto'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Aviso informativo de investimento em anúncio */}
            {(anunciosJaLancadosDossie > 0 || valorAnuncioAdicional > 0) && (
              <div className="p-2.5 rounded-xl bg-purple-950/20 border border-purple-500/30 flex items-center justify-between text-xs text-purple-200">
                <div className="flex items-center gap-2">
                  <span className="text-base">🚀</span>
                  <span>
                    {anunciosJaLancadosDossie > 0 && `Já lançado no dossiê: ${formatCurrency(anunciosJaLancadosDossie)}. `}
                    {valorAnuncioAdicional > 0 && `Investimento adicional na venda: ${formatCurrency(valorAnuncioAdicional)} (computado no custo total e DRE).`}
                  </span>
                </div>
                <span className="font-mono font-bold text-purple-300">
                  Total Ads Carro: {formatCurrency(anunciosJaLancadosDossie + valorAnuncioAdicional)}
                </span>
              </div>
            )}
          </div>

          {/* 2. Histórico de Engajamento e Relacionamento */}
          <div className="p-4 bg-[#16171f] rounded-2xl border border-indigo-500/20 space-y-3">
            <div className="flex items-center gap-2 pb-1 border-b border-white/5">
              <Navigation size={18} className="text-indigo-400" />
              <h4 className="font-bold text-white text-xs uppercase tracking-wide">
                2. Histórico de Engajamento e Relacionamento
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 items-center">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Visitas à Loja antes do Fechamento</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={quantidadeVisitas}
                  onChange={(e) => setQuantidadeVisitas(Number(e.target.value))}
                  placeholder="Ex: 1 ou 2"
                  className="w-full p-2.5 rounded-xl border border-white/10 font-bold text-xs bg-black/40 text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div className="sm:col-span-2 flex items-center justify-between p-3 bg-black/30 rounded-xl border border-white/5">
                <div>
                  <span className="font-bold text-white block text-xs">Realizou Test-Drive no Veículo?</span>
                  <span className="text-[10px] text-slate-400">Avalia a experiência prática de direção do cliente</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setRealizouTestDrive(!realizouTestDrive)}
                    className={`px-3.5 py-1.5 rounded-xl font-extrabold text-xs transition cursor-pointer flex items-center gap-1.5 ${
                      realizouTestDrive
                        ? 'bg-emerald-500 text-black shadow-md shadow-emerald-950/50'
                        : 'bg-white/10 text-slate-300 hover:bg-white/20'
                    }`}
                  >
                    {realizouTestDrive ? <><Check size={14} /> Sim, Realizou</> : 'Não'}
                  </button>
                </div>
              </div>
            </div>

            {realizouTestDrive && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/5 animate-fadeIn">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Data / Horário do Test-Drive</label>
                  <input
                    type="datetime-local"
                    value={dataHoraTestDrive}
                    onChange={(e) => setDataHoraTestDrive(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-white/10 bg-black/40 text-slate-200 text-xs outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Observações do Test-Drive (Percurso/Feedback)</label>
                  <input
                    type="text"
                    value={observacoesTestDrive}
                    onChange={(e) => setObservacoesTestDrive(e.target.value)}
                    placeholder="Ex: Testou em rodovia e subida, elogiou suspensão"
                    className="w-full p-2.5 rounded-xl border border-white/10 bg-black/40 text-slate-200 text-xs outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Valor Negociado e Forma de Pagamento */}
          <div className="bg-[#16171f] p-4 rounded-2xl border border-white/5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-white font-bold text-sm flex items-center gap-1.5">
                <DollarSign size={16} className="text-emerald-400" />
                Valor Final Negociado da Venda (R$) *
              </label>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-xs">Formato de Pagamento:</span>
                <div className="flex bg-black/40 p-0.5 rounded-xl border border-white/10 text-xs">
                  <button
                    type="button"
                    onClick={() => setModoPagamento('simples')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                      modoPagamento === 'simples' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Simples (1 Meio)
                  </button>
                  <button
                    type="button"
                    onClick={() => setModoPagamento('hibrido')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                      modoPagamento === 'hibrido' ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Layers size={13} />
                    Híbrido (Múltiplas Fontes)
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <input
                type="number"
                required
                value={valorVenda}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setValorVenda(val);
                  if (modoPagamento === 'simples') {
                    setParcelasHibridas([{ id: '1', tipo: 'PIX', valorBruto: val, valorLiquido: val, bancoDestino: 'Conta Bancária Principal' }]);
                  }
                }}
                className="w-full p-3.5 rounded-xl border border-white/10 font-black text-2xl bg-black/40 text-emerald-400 font-mono outline-none focus:border-emerald-500"
              />

              <div>
                <label className="block text-slate-300 font-bold mb-1">Data Efetiva da Venda *</label>
                <input
                  type="date"
                  required
                  value={dataVenda}
                  onChange={(e) => setDataVenda(e.target.value)}
                  className="w-full p-3 rounded-xl border border-white/10 bg-black/40 text-white font-medium text-xs outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {modoPagamento === 'simples' && (
              <div className="pt-2 border-t border-white/5 space-y-2.5">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Forma de Pagamento Principal:</label>
                  <select
                    value={formaSimples}
                    onChange={(e) => setFormaSimples(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl bg-black/40 border border-white/10 text-white font-semibold text-xs outline-none"
                  >
                    <option value="À Vista PIX">⚡ À Vista PIX</option>
                    <option value="Financiamento">🏦 Financiamento Bancário</option>
                    <option value="Troca + Volta">🚗 Troca de Veículo + Volta</option>
                    <option value="Cartão">💳 Cartão de Crédito</option>
                    <option value="Dinheiro">💵 Dinheiro Espécie</option>
                  </select>
                </div>

                {(formaSimples === 'À Vista PIX' || formaSimples === 'Dinheiro' || formaSimples === 'Cartão' || formaSimples === 'Troca + Volta') && (
                  <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-xl space-y-1 animate-fadeIn">
                    <label className="block text-emerald-300 font-bold text-xs">
                      Conta Bancária / Caixa de Destino (Bancos & Giro) *
                    </label>
                    <p className="text-[10px] text-slate-400">
                      Selecione a conta bancária da loja para creditar o valor liquidado e alimentar o fluxo de caixa.
                    </p>
                    <select
                      required
                      value={contaBancariaDestinoNome}
                      onChange={(e) => {
                        const selectedName = e.target.value;
                        setContaBancariaDestinoNome(selectedName);
                        const found = contasBancariasList.find(c => c.nome === selectedName);
                        if (found) setContaBancariaDestinoId(found.id);
                      }}
                      className="w-full p-2.5 rounded-xl bg-black/50 border border-emerald-500/40 text-emerald-300 text-xs font-bold outline-none cursor-pointer"
                    >
                      {contasBancariasList.length > 0 ? (
                        contasBancariasList.map((c) => (
                          <option key={c.id} value={c.nome}>
                            {c.nome} (Saldo: {formatCurrency(c.saldo)})
                          </option>
                        ))
                      ) : (
                        contasBancariasDisponiveis.map((nome) => (
                          <option key={nome} value={nome}>
                            {nome}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Composição Híbrida se Ativo */}
          {modoPagamento === 'hibrido' && (
            <div className="bg-[#16171f] p-4 rounded-2xl border border-purple-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers size={18} className="text-purple-400" />
                  <div>
                    <h4 className="font-bold text-white text-xs">Composição Híbrida de Pagamento</h4>
                    <p className="text-[10px] text-slate-400">Divida em PIX, Financiamento, Cartão ou Veículo na Troca.</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddParcela}
                  className="px-2.5 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 font-bold border border-purple-500/30 flex items-center gap-1 cursor-pointer transition"
                >
                  <PlusCircle size={14} /> Adicionar Meio
                </button>
              </div>

              <div className="space-y-3">
                {parcelasHibridas.map((parcela, idx) => (
                  <div key={parcela.id} className="p-3 bg-black/40 rounded-xl border border-white/5 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
                      <div>
                        <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Fonte {idx + 1}:</label>
                        <select
                          value={parcela.tipo}
                          onChange={(e) => handleUpdateParcela(parcela.id, { tipo: e.target.value as any })}
                          className="w-full p-2 rounded-lg bg-[#16171f] border border-white/10 text-white font-semibold text-xs outline-none"
                        >
                          <option value="PIX">⚡ Entrada em PIX</option>
                          <option value="Financiamento">🏦 Financiamento Bancário</option>
                          <option value="Veículo na Troca">🚗 Veículo na Troca</option>
                          <option value="Cartão de Crédito">💳 Cartão de Crédito</option>
                          <option value="TED/Transferência">🏛️ TED Bancária</option>
                          <option value="Dinheiro Espécie">💵 Dinheiro Espécie</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Valor Bruto (R$):</label>
                        <input
                          type="number"
                          value={parcela.valorBruto}
                          onChange={(e) => handleUpdateParcela(parcela.id, { valorBruto: Number(e.target.value) })}
                          className="w-full p-2 rounded-lg bg-[#16171f] border border-white/10 text-white font-mono font-bold text-xs outline-none"
                        />
                      </div>

                      {/* Se for PIX, TED, Dinheiro ou Cartão: Seletor de Conta Bancária / Caixa de Destino */}
                      {(parcela.tipo === 'PIX' || parcela.tipo === 'TED/Transferência' || parcela.tipo === 'Dinheiro Espécie' || parcela.tipo === 'Cartão de Crédito') && (
                        <div>
                          <label className="text-[10px] text-emerald-400 uppercase font-bold block mb-1">
                            Conta Destino (Bancos):
                          </label>
                          <select
                            value={parcela.bancoDestino || contaBancariaDestinoNome}
                            onChange={(e) => {
                              const val = e.target.value;
                              const found = contasBancariasList.find(c => c.nome === val);
                              handleUpdateParcela(parcela.id, {
                                bancoDestino: val,
                                contaBancariaId: found?.id,
                              });
                            }}
                            className="w-full p-2 rounded-lg bg-[#16171f] border border-emerald-500/30 text-emerald-300 text-xs font-semibold outline-none"
                          >
                            {contasBancariasList.length > 0 ? (
                              contasBancariasList.map((c) => (
                                <option key={c.id} value={c.nome}>
                                  {c.nome}
                                </option>
                              ))
                            ) : (
                              contasBancariasDisponiveis.map((nome) => (
                                <option key={nome} value={nome}>
                                  {nome}
                                </option>
                              ))
                            )}
                          </select>
                        </div>
                      )}

                      {/* Se for Cartão: campo de taxa */}
                      {parcela.tipo === 'Cartão de Crédito' && (
                        <div>
                          <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Taxa Maquininha (%):</label>
                          <input
                            type="number"
                            step="0.1"
                            value={parcela.taxaPercentual || ''}
                            onChange={(e) => handleUpdateParcela(parcela.id, { taxaPercentual: Number(e.target.value) })}
                            placeholder="Ex: 3.2%"
                            className="w-full p-2 rounded-lg bg-[#16171f] border border-white/10 text-rose-400 font-mono font-bold text-xs outline-none"
                          />
                        </div>
                      )}

                      {/* Se for Financiamento: campo de Retorno / TAC */}
                      {parcela.tipo === 'Financiamento' && (
                        <div>
                          <label className="text-[10px] text-emerald-400 uppercase font-bold block mb-1">Retorno / TAC Banco (R$):</label>
                          <input
                            type="number"
                            value={parcela.retornoTacBanco || ''}
                            onChange={(e) => handleUpdateParcela(parcela.id, { retornoTacBanco: Number(e.target.value) })}
                            placeholder="Ex: 1200"
                            className="w-full p-2 rounded-lg bg-[#16171f] border border-emerald-500/30 text-emerald-400 font-mono font-bold text-xs outline-none"
                          />
                        </div>
                      )}

                      {/* Se for Veículo na Troca */}
                      {parcela.tipo === 'Veículo na Troca' && (
                        <div>
                          <label className="text-[10px] text-blue-400 uppercase font-bold block mb-1">Placa na Troca:</label>
                          <input
                            type="text"
                            value={parcela.trocaPlaca || ''}
                            onChange={(e) => {
                              const p = e.target.value.toUpperCase();
                              handleUpdateParcela(parcela.id, { trocaPlaca: p });
                              setTrocaPlaca(p);
                            }}
                            placeholder="Ex: ABC1D23"
                            className="w-full p-2 rounded-lg bg-[#16171f] border border-blue-500/30 text-blue-300 font-mono font-bold text-xs uppercase outline-none"
                          />
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2 pt-4 sm:pt-0">
                        <div className="min-w-0">
                          <span className="text-[10px] text-slate-500 block">Líquido Recebido:</span>
                          <span className="font-mono font-bold text-white text-xs">{formatCurrency(parcela.valorLiquido)}</span>
                        </div>
                        {parcelasHibridas.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveParcela(parcela.id)}
                            className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg bg-white/5 cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Status do Fechamento Híbrido */}
              <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-mono font-bold ${
                Math.abs(totalRecebimentosBrutos - valorVenda) < 1
                  ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-950/20 border-rose-500/30 text-rose-400'
              }`}>
                <span>Total Alocado: {formatCurrency(totalRecebimentosBrutos)} / {formatCurrency(valorVenda)}</span>
                <span>
                  {Math.abs(totalRecebimentosBrutos - valorVenda) < 1
                    ? '✓ 100% Balanceado'
                    : `Diferença: ${formatCurrency(valorVenda - totalRecebimentosBrutos)}`}
                </span>
              </div>
            </div>
          )}

          {/* 3. Detalhamento do Financiamento (Condicional Dinâmico) */}
          {isFinanciamentoAtivo && (
            <div className="p-4 bg-[#16171f] rounded-2xl border border-emerald-500/30 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between pb-1 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <Building2 size={18} className="text-emerald-400" />
                  <h4 className="font-bold text-white text-xs uppercase tracking-wide">
                    3. Detalhamento do Financiamento Bancário & Entrada
                  </h4>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                  Operação Bancária
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1 text-xs">Banco / Financeira Parceira *</label>
                  <select
                    value={bancoParceiro}
                    onChange={(e) => setBancoParceiro(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-black/40 border border-white/10 text-white font-semibold text-xs outline-none focus:border-emerald-500"
                  >
                    {bancosParceiros.length > 0 ? (
                      bancosParceiros.filter(b => b.ativo !== false).map((b) => (
                        <option key={b.id} value={b.nomeFantasia}>
                          {b.nomeFantasia} {b.codigoCompensacao ? `(${b.codigoCompensacao})` : ''} - TAC: {b.taxaRetornoPadrao}%
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="Santander">Santander Financiamentos</option>
                        <option value="BV">BV Financeira</option>
                        <option value="Itaú">Itaú Auto</option>
                        <option value="Bradesco">Bradesco Financiamentos</option>
                        <option value="Pan">Banco Pan</option>
                        <option value="Safra">Banco Safra</option>
                        <option value="C6 Bank">C6 Bank</option>
                        <option value="Outro">Outra Instituição</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1 text-xs">Valor de Entrada (R$)</label>
                  <input
                    type="number"
                    value={valorEntradaFinanciamento}
                    onChange={(e) => setValorEntradaFinanciamento(Number(e.target.value))}
                    placeholder="R$ Entrada"
                    className="w-full p-2.5 rounded-xl border border-white/10 font-bold text-xs bg-black/40 text-white outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1 text-xs">Valor Financiado Aprovado (R$)</label>
                  <input
                    type="number"
                    value={valorFinanciado || (valorVenda - valorEntradaFinanciamento)}
                    onChange={(e) => setValorFinanciado(Number(e.target.value))}
                    placeholder="R$ Financiado"
                    className="w-full p-2.5 rounded-xl border border-white/10 font-bold text-xs bg-black/40 text-emerald-400 outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-emerald-300 font-bold mb-1 text-xs">Retorno/TAC Banco (R$)</label>
                  <input
                    type="number"
                    value={retornoComissaoBanco}
                    onChange={(e) => setRetornoComissaoBanco(Number(e.target.value))}
                    placeholder="Ex: 1500"
                    className="w-full p-2.5 rounded-xl border border-emerald-500/40 font-bold text-xs bg-black/40 text-emerald-400 outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {valorEntradaFinanciamento > 0 && (
                <div className="pt-2 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs text-slate-400">Conta Bancária / Caixa de Destino da Entrada:</span>
                  <select
                    value={contaDestinoEntrada}
                    onChange={(e) => setContaDestinoEntrada(e.target.value)}
                    className="p-2 rounded-xl bg-black/40 border border-emerald-500/30 text-emerald-300 text-xs font-semibold outline-none"
                  >
                    {contasBancariasDisponiveis.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* 4. Veículo de Troca / Avaliação (Condicional Dinâmico) */}
          <div className="p-4 bg-[#16171f] rounded-2xl border border-amber-500/30 space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Car size={18} className="text-amber-400" />
                <h4 className="font-bold text-white text-xs uppercase tracking-wide">
                  4. Veículo de Troca / Avaliação
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400">Possui Veículo na Troca?</span>
                <input
                  type="checkbox"
                  checked={isTrocaAtiva}
                  onChange={(e) => setPossuiVeiculoTroca(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-0 cursor-pointer w-4 h-4"
                />
              </div>
            </div>

            {isTrocaAtiva && (
              <div className="space-y-3 pt-1 animate-fadeIn">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-amber-300 font-bold mb-1 text-xs">Placa da Troca *</label>
                    <input
                      type="text"
                      required={isTrocaAtiva}
                      value={trocaPlaca}
                      onChange={(e) => setTrocaPlaca(e.target.value.toUpperCase())}
                      placeholder="Ex: ABC1D23"
                      className="w-full p-2.5 rounded-xl border border-amber-500/40 font-mono font-bold text-xs uppercase bg-black/40 text-amber-300 outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1 text-xs">Marca da Troca</label>
                    <input
                      type="text"
                      value={trocaMarca}
                      onChange={(e) => setTrocaMarca(e.target.value)}
                      placeholder="Ex: Chevrolet, Hyundai, etc."
                      className="w-full p-2.5 rounded-xl border border-white/10 font-bold text-xs bg-black/40 text-white outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-slate-300 font-bold mb-1 text-xs">Modelo da Troca *</label>
                    <input
                      type="text"
                      required={isTrocaAtiva}
                      value={trocaModelo}
                      onChange={(e) => setTrocaModelo(e.target.value)}
                      placeholder="Ex: Onix 1.0 Turbo Premier Automático"
                      className="w-full p-2.5 rounded-xl border border-white/10 font-bold text-xs bg-black/40 text-white outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1 text-xs">Ano Fab.</label>
                    <input
                      type="number"
                      value={trocaAnoFabricacao}
                      onChange={(e) => setTrocaAnoFabricacao(Number(e.target.value))}
                      className="w-full p-2 rounded-xl border border-white/10 font-bold text-xs bg-black/40 text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1 text-xs">Ano Mod.</label>
                    <input
                      type="number"
                      value={trocaAnoModelo}
                      onChange={(e) => setTrocaAnoModelo(Number(e.target.value))}
                      className="w-full p-2 rounded-xl border border-white/10 font-bold text-xs bg-black/40 text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1 text-xs">Cor</label>
                    <input
                      type="text"
                      value={trocaCor}
                      onChange={(e) => setTrocaCor(e.target.value)}
                      placeholder="Ex: Prata"
                      className="w-full p-2 rounded-xl border border-white/10 text-xs bg-black/40 text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1 text-xs">Combustível</label>
                    <select
                      value={trocaCombustivel}
                      onChange={(e) => setTrocaCombustivel(e.target.value)}
                      className="w-full p-2 rounded-xl border border-white/10 text-xs bg-black/40 text-white outline-none"
                    >
                      <option value="Flex">Flex</option>
                      <option value="Gasolina">Gasolina</option>
                      <option value="Etanol">Etanol</option>
                      <option value="Diesel">Diesel</option>
                      <option value="Híbrido">Híbrido</option>
                      <option value="Elétrico">Elétrico</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1 text-xs">KM Atual</label>
                    <input
                      type="number"
                      value={trocaKm}
                      onChange={(e) => setTrocaKm(Number(e.target.value))}
                      placeholder="0"
                      className="w-full p-2 rounded-xl border border-white/10 text-xs font-mono bg-black/40 text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1 text-xs">Renavam</label>
                    <input
                      type="text"
                      value={trocaRenavam}
                      onChange={(e) => setTrocaRenavam(e.target.value)}
                      placeholder="00000000000"
                      className="w-full p-2 rounded-xl border border-white/10 text-xs font-mono bg-black/40 text-white outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1 text-xs">Chassi da Troca</label>
                    <input
                      type="text"
                      value={trocaChassi}
                      onChange={(e) => setTrocaChassi(e.target.value.toUpperCase())}
                      placeholder="9BW..."
                      className="w-full p-2 rounded-xl border border-white/10 font-mono text-xs uppercase bg-black/40 text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1 text-xs">Proprietário Atual no CRLV</label>
                    <input
                      type="text"
                      value={trocaProprietarioAtual}
                      onChange={(e) => setTrocaProprietarioAtual(e.target.value)}
                      placeholder="Nome constante no documento"
                      className="w-full p-2 rounded-xl border border-white/10 text-xs bg-black/40 text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1 text-xs">CPF/CNPJ do Proprietário Atual</label>
                    <input
                      type="text"
                      value={trocaDocumentoProprietario}
                      onChange={(e) => setTrocaDocumentoProprietario(e.target.value)}
                      placeholder="000.000.000-00"
                      className="w-full p-2 rounded-xl border border-white/10 font-mono text-xs bg-black/40 text-white outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-white/5">
                  <div>
                    <label className="block text-emerald-300 font-bold mb-1 text-xs">Valor de Avaliação / Entrada da Troca (R$) *</label>
                    <input
                      type="number"
                      required={isTrocaAtiva}
                      value={trocaValorAvaliacao}
                      onChange={(e) => setTrocaValorAvaliacao(Number(e.target.value))}
                      placeholder="Ex: 35000"
                      className="w-full p-2.5 rounded-xl border border-emerald-500/40 font-mono font-black text-xs bg-black/40 text-emerald-400 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1 text-xs">Margem Estimada de Recondicionamento (R$)</label>
                    <input
                      type="number"
                      value={trocaMargemRecondicionamento}
                      onChange={(e) => setTrocaMargemRecondicionamento(Number(e.target.value))}
                      placeholder="Ex: 1500 (funilaria, polimento, revisão)"
                      className="w-full p-2.5 rounded-xl border border-white/10 font-mono font-bold text-xs bg-black/40 text-rose-300 outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 5. Dados Completos do Comprador & Qualificação */}
          <div className="p-4 bg-[#16171f] rounded-2xl border border-purple-500/30 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <User size={18} className="text-purple-400" />
                <h4 className="font-bold text-white text-xs uppercase tracking-wide">
                  5. Dados do Comprador (Qualificação Cadastral & Contratual)
                </h4>
              </div>
              <span className="text-[10px] text-purple-300/80 bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-500/20 font-semibold">
                Campos Desmembrados para Contrato & CRM
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-300 font-bold mb-1 text-xs">Nome Completo do Comprador *</label>
                <input
                  type="text"
                  required
                  value={compradorNome}
                  onChange={(e) => setCompradorNome(e.target.value)}
                  placeholder="Ex: Carlos Eduardo Silveira"
                  className="w-full p-2.5 rounded-xl border border-white/10 font-medium bg-black/40 text-slate-200 text-xs outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1 text-xs">CPF ou CNPJ *</label>
                <input
                  type="text"
                  required
                  value={compradorCpf}
                  onChange={(e) => setCompradorCpf(e.target.value)}
                  placeholder="000.000.000-00 ou CNPJ"
                  className="w-full p-2.5 rounded-xl border border-white/10 font-mono bg-black/40 text-slate-200 text-xs outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1 text-xs">RG / Órgão Emissor</label>
                <input
                  type="text"
                  value={compradorRg}
                  onChange={(e) => setCompradorRg(e.target.value)}
                  placeholder="00.000.000-0 SSP/SP"
                  className="w-full p-2.5 rounded-xl border border-white/10 font-mono bg-black/40 text-slate-200 text-xs outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-300 font-bold mb-1 text-xs flex items-center gap-1">
                  <PhoneCall size={12} className="text-purple-400" /> Celular (WhatsApp) *
                </label>
                <input
                  type="text"
                  value={compradorTelefone}
                  onChange={(e) => setCompradorTelefone(e.target.value)}
                  placeholder="(18) 99999-9999"
                  className="w-full p-2.5 rounded-xl border border-white/10 font-mono bg-black/40 text-slate-200 text-xs outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1 text-xs flex items-center gap-1">
                  <Mail size={12} className="text-purple-400" /> E-mail do Comprador
                </label>
                <input
                  type="email"
                  value={compradorEmail}
                  onChange={(e) => setCompradorEmail(e.target.value)}
                  placeholder="cliente@email.com"
                  className="w-full p-2.5 rounded-xl border border-white/10 bg-black/40 text-slate-200 text-xs outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1 text-xs">Estado Civil / Qualificação</label>
                <input
                  type="text"
                  value={compradorEstadoCivil}
                  onChange={(e) => setCompradorEstadoCivil(e.target.value)}
                  placeholder="Brasileiro(a), Solteiro(a)"
                  className="w-full p-2.5 rounded-xl border border-white/10 bg-black/40 text-slate-200 text-xs outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1 text-xs flex items-center gap-1">
                <MapPin size={12} className="text-purple-400" /> Endereço Residencial Completo
              </label>
              <input
                type="text"
                value={compradorEndereco}
                onChange={(e) => setCompradorEndereco(e.target.value)}
                placeholder="Rua, Número, Bairro, CEP, Cidade - Estado"
                className="w-full p-2.5 rounded-xl border border-white/10 bg-black/40 text-slate-200 text-xs outline-none focus:border-purple-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="block text-slate-300 font-bold mb-1 text-xs flex items-center gap-1">
                  <Gift size={13} className="text-purple-400" /> Data de Nascimento
                </label>
                <input
                  type="date"
                  value={compradorDataNascimento}
                  onChange={(e) => setCompradorDataNascimento(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-white/10 bg-black/40 text-slate-200 text-xs outline-none focus:border-purple-500"
                />
              </div>

              {/* Campo Inteligente de Profissão com Salvamento Automático Compartilhado */}
              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-300 font-bold text-xs flex items-center gap-1">
                    <Briefcase size={13} className="text-purple-400" /> Profissão / Ramo
                  </label>
                  <span className="text-[9px] text-emerald-400/80 font-mono">
                    ENTER salva no banco
                  </span>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={compradorProfissao}
                    onFocus={() => setIsProfissaoDropdownOpen(true)}
                    onChange={(e) => {
                      setCompradorProfissao(e.target.value);
                      setIsProfissaoDropdownOpen(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (compradorProfissao.trim()) {
                          handleSalvarNovaProfissao(compradorProfissao);
                        }
                      }
                    }}
                    placeholder="Digite ou escolha a profissão..."
                    className="w-full p-2.5 pr-8 rounded-xl border border-white/10 bg-black/40 text-slate-200 text-xs outline-none focus:border-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() => setIsProfissaoDropdownOpen(!isProfissaoDropdownOpen)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                    title="Ver opções de profissões"
                  >
                    <ChevronDown size={14} className={`transition-transform ${isProfissaoDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {/* Feedback Toast de salvamento */}
                {profissaoFeedback && (
                  <div className="absolute z-30 -bottom-6 left-0 right-0 text-[10px] text-emerald-400 font-bold flex items-center gap-1 bg-emerald-950/90 px-2 py-0.5 rounded-lg border border-emerald-500/30 animate-pulse">
                    <Check size={11} />
                    <span>{profissaoFeedback}</span>
                  </div>
                )}

                {/* Dropdown Flutuante de Profissões */}
                {isProfissaoDropdownOpen && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-[#101118] border border-purple-500/30 rounded-xl shadow-2xl p-1.5 space-y-1 text-xs backdrop-blur-md">
                    {compradorProfissao.trim().length > 0 && !existeCorrespondenciaExata && (
                      <button
                        type="button"
                        onClick={() => handleSalvarNovaProfissao(compradorProfissao)}
                        className="w-full p-2 text-left bg-gradient-to-r from-purple-900/60 to-indigo-900/60 hover:from-purple-800/80 hover:to-indigo-800/80 text-purple-200 rounded-lg font-semibold flex items-center justify-between border border-purple-500/40 cursor-pointer transition mb-1"
                      >
                        <span className="truncate">
                          ➕ Adicionar <strong>"{compradorProfissao}"</strong>
                        </span>
                        <span className="text-[10px] bg-purple-500 text-white px-1.5 py-0.5 rounded font-mono shrink-0 ml-1">
                          ENTER
                        </span>
                      </button>
                    )}

                    {profissoesFiltradas.slice(0, 15).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          setCompradorProfissao(p);
                          setIsProfissaoDropdownOpen(false);
                        }}
                        className={`w-full p-2 text-left rounded-lg transition flex items-center justify-between cursor-pointer ${
                          compradorProfissao.toLowerCase() === p.toLowerCase()
                            ? 'bg-purple-600/30 text-purple-200 font-bold border border-purple-500/30'
                            : 'hover:bg-white/5 text-slate-300 hover:text-white'
                        }`}
                      >
                        <span className="truncate">{p}</span>
                        {compradorProfissao.toLowerCase() === p.toLowerCase() && (
                          <Check size={13} className="text-purple-400 shrink-0" />
                        )}
                      </button>
                    ))}

                    {profissoesFiltradas.length === 0 && compradorProfissao.trim().length === 0 && (
                      <div className="p-2 text-slate-500 text-center text-xs">
                        Nenhuma profissão encontrada.
                      </div>
                    )}

                    <div className="pt-1 mt-1 border-t border-white/5 text-[10px] text-slate-500 text-center flex items-center justify-between px-1">
                      <span>Profissões salvas no banco compartilhado</span>
                      <button
                        type="button"
                        onClick={() => setIsProfissaoDropdownOpen(false)}
                        className="text-purple-400 hover:underline"
                      >
                        Fechar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1 text-xs flex items-center gap-1">
                  <Truck size={13} className="text-blue-400" /> Previsão de Entrega Técnica
                </label>
                <input
                  type="date"
                  value={previsaoEntregaVeiculo}
                  onChange={(e) => setPrevisaoEntregaVeiculo(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-white/10 bg-black/40 text-slate-200 text-xs outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {/* SEÇÃO: Financiamento Realizado em Nome de Terceiro */}
            <div className="mt-3 pt-3 border-t border-white/10">
              <div 
                onClick={() => setFinanciamentoTerceiroAtivo(!financiamentoTerceiroAtivo)}
                className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                  financiamentoTerceiroAtivo
                    ? 'bg-indigo-950/40 border-indigo-500/50 shadow-lg shadow-indigo-950/30'
                    : 'bg-black/20 border-white/5 hover:border-white/15'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${
                    financiamentoTerceiroAtivo ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-400'
                  }`}>
                    <Users size={16} />
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-white flex items-center gap-2">
                      Financiamento realizado em nome de Terceiro?
                      {financiamentoTerceiroAtivo && (
                        <span className="text-[10px] bg-indigo-500 text-white px-2 py-0.2 rounded-full font-bold">
                          Substituirá Comprador no Contrato
                        </span>
                      )}
                    </h5>
                    <p className="text-[11px] text-slate-400">
                      Marque quando o financiamento for contratado por terceiro (ex: Pai/Mãe, Cônjuge, Sócio). O terceiro passará a ser o <strong>único titular</strong> qualificado no Contrato de Compra e Venda.
                    </p>
                  </div>
                </div>

                <input
                  type="checkbox"
                  checked={financiamentoTerceiroAtivo}
                  onChange={(e) => setFinanciamentoTerceiroAtivo(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>

              {/* Formulário Condicional do Terceiro Completo */}
              {financiamentoTerceiroAtivo && (
                <div className="mt-3 p-4 bg-[#12131c] rounded-xl border border-indigo-500/30 space-y-3 animate-fadeIn">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300 pb-1 border-b border-indigo-500/20">
                    <UserCheck size={15} className="text-indigo-400" />
                    <span>Dados do Terceiro (Titular Jurídico do Contrato & Financiamento)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-300 font-bold mb-1 text-xs">
                        Nome Completo do Terceiro *
                      </label>
                      <input
                        type="text"
                        required={financiamentoTerceiroAtivo}
                        value={terceiroNome}
                        onChange={(e) => setTerceiroNome(e.target.value)}
                        placeholder="Ex: Maria das Graças Silveira"
                        className="w-full p-2.5 rounded-xl border border-white/10 bg-black/40 text-slate-200 text-xs outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-bold mb-1 text-xs">
                        CPF / CNPJ do Terceiro *
                      </label>
                      <input
                        type="text"
                        required={financiamentoTerceiroAtivo}
                        value={terceiroCpf}
                        onChange={(e) => setTerceiroCpf(e.target.value)}
                        placeholder="000.000.000-00"
                        className="w-full p-2.5 rounded-xl border border-white/10 font-mono bg-black/40 text-slate-200 text-xs outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-bold mb-1 text-xs">
                        RG / Órgão Emissor
                      </label>
                      <input
                        type="text"
                        value={terceiroRg}
                        onChange={(e) => setTerceiroRg(e.target.value)}
                        placeholder="00.000.000-0 SSP/SP"
                        className="w-full p-2.5 rounded-xl border border-white/10 font-mono bg-black/40 text-slate-200 text-xs outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-300 font-bold mb-1 text-xs flex items-center gap-1">
                        <PhoneCall size={12} className="text-indigo-400" /> Celular (WhatsApp) do Terceiro
                      </label>
                      <input
                        type="text"
                        value={terceiroTelefone}
                        onChange={(e) => setTerceiroTelefone(e.target.value)}
                        placeholder="(18) 99999-9999"
                        className="w-full p-2.5 rounded-xl border border-white/10 bg-black/40 text-slate-200 text-xs outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-bold mb-1 text-xs flex items-center gap-1">
                        <Mail size={12} className="text-indigo-400" /> E-mail do Terceiro
                      </label>
                      <input
                        type="email"
                        value={terceiroEmail}
                        onChange={(e) => setTerceiroEmail(e.target.value)}
                        placeholder="terceiro@email.com"
                        className="w-full p-2.5 rounded-xl border border-white/10 bg-black/40 text-slate-200 text-xs outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-bold mb-1 text-xs">
                        Grau de Parentesco / Relação *
                      </label>
                      <select
                        value={terceiroGrauParentesco}
                        onChange={(e) => setTerceiroGrauParentesco(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-white/10 bg-[#191a24] text-slate-200 text-xs outline-none focus:border-indigo-500"
                      >
                        <option value="Pai / Mãe">Pai / Mãe</option>
                        <option value="Cônjuge / Esposo(a) / Companheiro(a)">Cônjuge / Esposo(a) / Companheiro(a)</option>
                        <option value="Filho(a)">Filho(a)</option>
                        <option value="Irmão / Irmã">Irmão / Irmã</option>
                        <option value="Tio(a)">Tio(a)</option>
                        <option value="Primo(a)">Primo(a)</option>
                        <option value="Sogro(a) / Genro / Nora">Sogro(a) / Genro / Nora</option>
                        <option value="Padrasto / Madrasta">Padrasto / Madrasta</option>
                        <option value="Sócio(a) / Empresa (PJ)">Sócio(a) / Empresa (PJ)</option>
                        <option value="Amigo(a) / Fiador">Amigo(a) / Fiador</option>
                        <option value="Outro">Outro Parentesco (digitar)...</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1 text-xs flex items-center gap-1">
                      <MapPin size={12} className="text-indigo-400" /> Endereço Residencial do Terceiro
                    </label>
                    <input
                      type="text"
                      value={terceiroEndereco}
                      onChange={(e) => setTerceiroEndereco(e.target.value)}
                      placeholder="Rua, Número, Bairro, CEP, Cidade - Estado"
                      className="w-full p-2.5 rounded-xl border border-white/10 bg-black/40 text-slate-200 text-xs outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-300 font-bold mb-1 text-xs">
                        Estado Civil do Terceiro
                      </label>
                      <input
                        type="text"
                        value={terceiroEstadoCivil}
                        onChange={(e) => setTerceiroEstadoCivil(e.target.value)}
                        placeholder="Brasileiro(a), Casado(a)"
                        className="w-full p-2.5 rounded-xl border border-white/10 bg-black/40 text-slate-200 text-xs outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-bold mb-1 text-xs">
                        Profissão do Terceiro
                      </label>
                      <input
                        type="text"
                        value={terceiroProfissao}
                        onChange={(e) => setTerceiroProfissao(e.target.value)}
                        placeholder="Ex: Aposentada / Funcionária Pública"
                        className="w-full p-2.5 rounded-xl border border-white/10 bg-black/40 text-slate-200 text-xs outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-bold mb-1 text-xs flex items-center gap-1">
                        <Gift size={12} className="text-indigo-400" /> Nascimento do Terceiro
                      </label>
                      <input
                        type="date"
                        value={terceiroDataNascimento}
                        onChange={(e) => setTerceiroDataNascimento(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-white/10 bg-black/40 text-slate-200 text-xs outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {terceiroGrauParentesco === 'Outro' && (
                    <div>
                      <label className="block text-slate-300 font-bold mb-1 text-xs">
                        Especifique a Relação / Vínculo *
                      </label>
                      <input
                        type="text"
                        value={terceiroGrauCustom}
                        onChange={(e) => setTerceiroGrauCustom(e.target.value)}
                        placeholder="Ex: Padrinho, Cunhado, etc."
                        className="w-full p-2.5 rounded-xl border border-white/10 bg-black/40 text-slate-200 text-xs outline-none focus:border-indigo-500"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-slate-300 font-bold mb-1 text-xs">
                      Observações / Justificativa do Financiamento
                    </label>
                    <input
                      type="text"
                      value={terceiroObservacoes}
                      onChange={(e) => setTerceiroObservacoes(e.target.value)}
                      placeholder="Ex: Financiamento aprovado via score da mãe; parcelas pagas pelo adquirente."
                      className="w-full p-2.5 rounded-xl border border-white/10 bg-black/40 text-slate-200 text-xs outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 6. Motor de Comissões Dinâmicas & Distribuição de Comissões Calculadas */}
          <div className="rounded-2xl bg-gradient-to-r from-purple-950/40 via-[#16171f] to-blue-950/40 border border-purple-500/30 overflow-hidden shadow-lg transition">
            {/* Header expansível com resumo das comissões */}
            <div
              onClick={() => setIsBlocoComissoesExpandido(!isBlocoComissoesExpandido)}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-white/[0.02] transition select-none"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
                  <Calculator size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-white text-xs sm:text-sm">
                      Distribuição de Comissões Calculadas
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono font-bold border border-purple-500/30">
                      Motor Dinâmico
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {comissoesUsuariosCalculadas.length} participante(s) • {comissoesUsuariosCalculadas.filter(u => !u.isento).length} ativo(s) na venda
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3">
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Total Comissões da Venda:
                  </span>
                  <span className="text-base sm:text-lg font-black text-emerald-400 font-mono">
                    {formatCurrency(totalComissoesAtivasValor)}
                  </span>
                </div>
                <div className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white transition">
                  {isBlocoComissoesExpandido ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
              </div>
            </div>

            {/* Conteúdo Expansível */}
            {isBlocoComissoesExpandido && (
              <div className="p-4 pt-0 space-y-4 border-t border-white/5 animate-fadeIn">
                {/* Banner Explicativo */}
                <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/20 text-[11px] text-purple-200/90 leading-relaxed flex items-start gap-2.5">
                  <Sparkles size={16} className="text-purple-400 shrink-0 mt-0.5" />
                  <span>
                    O <strong>Motor de Comissões Dinâmicas</strong> calcula as remunerações de cada colaborador a partir das regras configuradas (fixo, lucro, retorno de TAC e percentuais de venda). Você pode <strong>isentar ou remover</strong> qualquer colaborador desta venda clicando no interruptor; o DRE da venda é recalculado instantaneamente.
                  </span>
                </div>

                {/* Lista de Usuários e Regras Avaliadas */}
                <div className="space-y-3">
                  {comissoesUsuariosCalculadas.map((u) => {
                    const isIsento = u.isento;
                    return (
                      <div
                        key={u.usuarioId}
                        className={`p-3.5 rounded-xl border transition ${
                          isIsento
                            ? 'bg-rose-950/10 border-rose-500/30 opacity-80'
                            : 'bg-[#121319] border-white/10 hover:border-purple-500/30'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-white/5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white font-black text-xs">
                              {u.usuarioNome.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white text-xs">
                                  {u.usuarioNome}
                                </span>
                                {u.isSeller && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-semibold border border-blue-500/30">
                                    Vendedor Principal
                                  </span>
                                )}
                                {isIsento && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                                    Isento nesta Venda
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400">
                                {u.usuarioCargo} • {u.usuarioEmail || 'Sem e-mail'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 justify-between sm:justify-end">
                            {/* Botão de Isenção / Remoção de comissão para esta venda */}
                            <button
                              type="button"
                              onClick={() => handleToggleIsencao(u.usuarioId)}
                              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                                isIsento
                                  ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 hover:bg-rose-500/30'
                                  : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-rose-500/20 hover:border-rose-500/40 hover:text-rose-300'
                              }`}
                              title={isIsento ? 'Reativar comissão desta venda' : 'Isentar/remover comissão deste colaborador exclusivamente nesta venda'}
                            >
                              {isIsento ? (
                                <>
                                  <ToggleLeft size={16} /> Isento da Venda
                                </>
                              ) : (
                                <>
                                  <ToggleRight size={16} /> Ativo na Venda
                                </>
                              )}
                            </button>

                            {/* Valor Calculado */}
                            <div className="text-right min-w-[100px]">
                              {isIsento ? (
                                <div>
                                  <span className="line-through text-slate-500 font-mono text-[11px] block">
                                    {formatCurrency(u.totalCalculado)}
                                  </span>
                                  <span className="text-rose-400 font-mono font-bold text-xs">
                                    R$ 0,00
                                  </span>
                                </div>
                              ) : (
                                <span className="text-base font-black text-emerald-400 font-mono">
                                  {formatCurrency(u.totalCalculado)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Detalhamento do Cálculo das Regras */}
                        <div className="pt-2 space-y-1.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Detalhamento do Cálculo:
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            {u.regrasAvaliadas.map((rg, idx) => (
                              <div
                                key={rg.regraId || idx}
                                className={`p-2 rounded-lg border text-[11px] ${
                                  !rg.gatilhoAtendido
                                    ? 'bg-black/20 border-white/5 text-slate-500'
                                    : 'bg-black/30 border-white/5 text-slate-300'
                                }`}
                              >
                                <div className="flex items-center justify-between font-mono">
                                  <span className="font-bold text-slate-200">
                                    {rg.tipoBase}:
                                  </span>
                                  <span className={rg.gatilhoAtendido ? 'text-purple-300 font-bold' : 'text-slate-500'}>
                                    {rg.gatilhoAtendido ? formatCurrency(rg.valorCalculado) : 'R$ 0,00'}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  {rg.detalheCalculo}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Controles de Configuração Manual do Vendedor Principal (Admin) */}
                {isAdmin && (
                  <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-white/5">
                      <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <Award size={14} className="text-amber-400" />
                        Ajuste Manual / Sobrescrita do Vendedor Principal
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Opcional para personalização direta no fechamento
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPerfilComissao('admin_gerente');
                          setComissaoAjustadaManualmente(false);
                        }}
                        className={`p-2.5 rounded-xl border text-left flex flex-col gap-0.5 transition cursor-pointer ${
                          perfilComissao === 'admin_gerente'
                            ? 'bg-purple-600/30 border-purple-500 text-purple-200 ring-1 ring-purple-500'
                            : 'bg-black/30 border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        <span className="text-xs font-bold flex items-center gap-1.5 text-purple-300">
                          <TrendingUp size={13} /> 1. % Lucro Bruto
                        </span>
                        <span className="text-[10px] text-slate-400 leading-tight">
                          {comissaoPercentualLucro}% s/ Lucro
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setPerfilComissao('vendedor_padrao');
                          setComissaoAjustadaManualmente(false);
                        }}
                        className={`p-2.5 rounded-xl border text-left flex flex-col gap-0.5 transition cursor-pointer ${
                          perfilComissao === 'vendedor_padrao'
                            ? 'bg-blue-600/30 border-blue-500 text-blue-200 ring-1 ring-blue-500'
                            : 'bg-black/30 border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        <span className="text-xs font-bold flex items-center gap-1.5 text-blue-300">
                          <DollarSign size={13} /> 2. Fixo por Carro
                        </span>
                        <span className="text-[10px] text-slate-400 leading-tight">
                          {formatCurrency(comissaoFixa)}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setPerfilComissao('vendedor_bonus_tac');
                          setComissaoAjustadaManualmente(false);
                        }}
                        className={`p-2.5 rounded-xl border text-left flex flex-col gap-0.5 transition cursor-pointer ${
                          perfilComissao === 'vendedor_bonus_tac'
                            ? 'bg-amber-600/30 border-amber-500 text-amber-200 ring-1 ring-amber-500'
                            : 'bg-black/30 border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        <span className="text-xs font-bold flex items-center gap-1.5 text-amber-300">
                          <Sparkles size={13} /> 3. Fixo + Bônus TAC
                        </span>
                        <span className="text-[10px] text-slate-400 leading-tight">
                          Fixo + {comissaoBonusTacPercent}% Retorno
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setPerfilComissao('percentual_venda');
                          setComissaoAjustadaManualmente(false);
                        }}
                        className={`p-2.5 rounded-xl border text-left flex flex-col gap-0.5 transition cursor-pointer ${
                          perfilComissao === 'percentual_venda'
                            ? 'bg-emerald-600/30 border-emerald-500 text-emerald-200 ring-1 ring-emerald-500'
                            : 'bg-black/30 border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        <span className="text-xs font-bold flex items-center gap-1.5 text-emerald-300">
                          <Percent size={13} /> 4. % Valor Carro
                        </span>
                        <span className="text-[10px] text-slate-400 leading-tight">
                          {comissaoPercentualVenda}% do Veículo
                        </span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-1">
                      <div>
                        <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">Vendedor / Responsável</label>
                        <input
                          type="text"
                          required
                          value={vendedorNome}
                          onChange={(e) => setVendedorNome(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-white/10 bg-[#16171f] text-white text-xs font-medium outline-none"
                        />
                      </div>

                      {perfilComissao === 'admin_gerente' && (
                        <div>
                          <label className="block text-purple-300 text-[10px] uppercase font-bold mb-1">% sobre Lucro Bruto</label>
                          <input
                            type="number"
                            step="0.5"
                            value={comissaoPercentualLucro}
                            onChange={(e) => {
                              setComissaoPercentualLucro(Number(e.target.value));
                              setComissaoAjustadaManualmente(false);
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-purple-500/30 bg-[#16171f] text-purple-300 text-xs font-mono font-bold outline-none"
                          />
                        </div>
                      )}

                      {(perfilComissao === 'vendedor_padrao' || perfilComissao === 'vendedor_bonus_tac') && (
                        <div>
                          <label className="block text-blue-300 text-[10px] uppercase font-bold mb-1">Comissão Fixa (R$)</label>
                          <input
                            type="number"
                            step="50"
                            value={comissaoFixa}
                            onChange={(e) => {
                              setComissaoFixa(Number(e.target.value));
                              setComissaoAjustadaManualmente(false);
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-blue-500/30 bg-[#16171f] text-blue-300 text-xs font-mono font-bold outline-none"
                          />
                        </div>
                      )}

                      {perfilComissao === 'vendedor_bonus_tac' && (
                        <div>
                          <label className="block text-amber-300 text-[10px] uppercase font-bold mb-1">% Bônus TAC Banco</label>
                          <input
                            type="number"
                            step="1"
                            value={comissaoBonusTacPercent}
                            onChange={(e) => {
                              setComissaoBonusTacPercent(Number(e.target.value));
                              setComissaoAjustadaManualmente(false);
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-amber-500/30 bg-[#16171f] text-amber-300 text-xs font-mono font-bold outline-none"
                          />
                        </div>
                      )}

                      {perfilComissao === 'percentual_venda' && (
                        <div>
                          <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">% da Venda</label>
                          <input
                            type="number"
                            step="0.1"
                            value={comissaoPercentualVenda}
                            onChange={(e) => {
                              setComissaoPercentualVenda(Number(e.target.value));
                              setComissaoAjustadaManualmente(false);
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-white/10 bg-[#16171f] text-white text-xs font-mono font-bold outline-none"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-emerald-400 text-[10px] uppercase font-bold mb-1">
                          Comissão Direta R$ {comissaoAjustadaManualmente ? '(Manual)' : '(Auto)'}
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={comissaoValorFinal}
                          onChange={(e) => {
                            setComissaoValorFinal(Number(e.target.value));
                            setComissaoAjustadaManualmente(true);
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-emerald-500/50 bg-[#16171f] text-emerald-400 text-xs font-mono font-black outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 6.1 Comissão Administrativa Global (Overriding Gestor/Admin) */}
          {(isAdmin || currentUser?.role === 'gestor' || currentUser?.permissoes?.gerenciarComissoesGerenciais === true) && (
            <div className="p-4 rounded-2xl bg-[#16171f] border border-amber-500/30 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                    <Award size={16} />
                  </div>
                  <div>
                    <span className="font-extrabold text-white text-xs uppercase tracking-wider block">
                      Comissão de Gestão / Overriding
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Remuneração da Diretoria/Gestor apurada sobre esta venda
                    </span>
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs font-semibold text-amber-300">
                    {comissaoGerencialAtiva ? 'Vínculo Ativo' : 'Desvinculada'}
                  </span>
                  <input
                    type="checkbox"
                    checked={comissaoGerencialAtiva}
                    onChange={(e) => {
                      setComissaoGerencialAtiva(e.target.checked);
                      setComissaoGerencialAjustadaManualmente(true);
                    }}
                    className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                  />
                </label>
              </div>

              {comissaoGerencialAtiva && (
                <div className="space-y-3 pt-2 border-t border-white/5 text-xs">
                  {/* Modelos de Cálculo */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                      Modelo de Cálculo
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setComissaoGerencialTipo('porcentagem_venda');
                          setComissaoGerencialAjustadaManualmente(false);
                        }}
                        className={`py-1.5 px-2 rounded-lg text-center text-[11px] font-bold transition cursor-pointer ${
                          comissaoGerencialTipo === 'porcentagem_venda'
                            ? 'bg-amber-500 text-slate-950 shadow'
                            : 'bg-black/40 text-slate-400 border border-white/10 hover:text-white'
                        }`}
                      >
                        % Venda
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setComissaoGerencialTipo('porcentagem_lucro');
                          setComissaoGerencialAjustadaManualmente(false);
                        }}
                        className={`py-1.5 px-2 rounded-lg text-center text-[11px] font-bold transition cursor-pointer ${
                          comissaoGerencialTipo === 'porcentagem_lucro'
                            ? 'bg-amber-500 text-slate-950 shadow'
                            : 'bg-black/40 text-slate-400 border border-white/10 hover:text-white'
                        }`}
                      >
                        % Lucro
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setComissaoGerencialTipo('fixo');
                          setComissaoGerencialAjustadaManualmente(false);
                        }}
                        className={`py-1.5 px-2 rounded-lg text-center text-[11px] font-bold transition cursor-pointer ${
                          comissaoGerencialTipo === 'fixo'
                            ? 'bg-amber-500 text-slate-950 shadow'
                            : 'bg-black/40 text-slate-400 border border-white/10 hover:text-white'
                        }`}
                      >
                        Fixo R$
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setComissaoGerencialTipo('manual');
                          setComissaoGerencialAjustadaManualmente(true);
                        }}
                        className={`py-1.5 px-2 rounded-lg text-center text-[11px] font-bold transition cursor-pointer ${
                          comissaoGerencialTipo === 'manual'
                            ? 'bg-amber-500 text-slate-950 shadow'
                            : 'bg-black/40 text-slate-400 border border-white/10 hover:text-white'
                        }`}
                      >
                        Livre
                      </button>
                    </div>
                  </div>

                  {/* Alíquota e Valor Final */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {comissaoGerencialTipo !== 'manual' && (
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                          {comissaoGerencialTipo === 'fixo' ? 'Valor Fixo (R$)' : 'Alíquota de Comissão (%)'}
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={comissaoGerencialTaxa}
                          onChange={(e) => {
                            setComissaoGerencialTaxa(Number(e.target.value));
                            setComissaoGerencialAjustadaManualmente(false);
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-amber-500/30 bg-black/40 text-amber-300 font-mono font-bold text-xs outline-none"
                        />
                      </div>
                    )}

                    <div className={comissaoGerencialTipo === 'manual' ? 'sm:col-span-2' : ''}>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                        Valor da Comissão Administrativa {comissaoGerencialAjustadaManualmente ? '(Ajustado Manual)' : '(Calculado)'}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={comissaoGerencialValor}
                        onChange={(e) => {
                          setComissaoGerencialValor(Number(e.target.value));
                          setComissaoGerencialAjustadaManualmente(true);
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-amber-500/50 bg-black/40 text-amber-300 font-mono font-black text-sm outline-none"
                      />
                    </div>
                  </div>

                  {/* Beneficiário */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                      Beneficiário (Gestor / Administrador)
                    </label>
                    <select
                      value={comissaoGerencialBeneficiarioId}
                      onChange={(e) => {
                        const bId = e.target.value;
                        setComissaoGerencialBeneficiarioId(bId);
                        const sel = usuariosCandidatos.find((u) => u.uid === bId);
                        if (sel) {
                          setComissaoGerencialBeneficiarioNome(sel.displayName || sel.email || 'Gestor');
                          setComissaoGerencialBeneficiarioEmail(sel.email || '');
                        } else {
                          setComissaoGerencialBeneficiarioNome('Diretoria / Gestor Geral');
                        }
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-white/10 bg-black/40 text-white text-xs outline-none cursor-pointer"
                    >
                      <option value="">Diretoria Geral (Sem gestor específico vinculado)</option>
                      {usuariosCandidatos
                        .filter((u) => u.role === 'admin' || u.role === 'gestor' || u.recebeComissaoOverriding)
                        .map((u) => (
                          <option key={u.uid} value={u.uid}>
                            {u.displayName || u.email} ({u.role})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 7. Provisões Financeiras e DRE - EXCLUSIVO DO ADMIN */}
          {isAdmin && (
            <div className="space-y-4 pt-2 border-t border-white/10 animate-fadeIn">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-amber-400" />
                <span className="font-extrabold text-amber-300 text-xs uppercase tracking-wider">
                  Controles Fiscais & Provisões Internas (Visão Exclusiva do Administrador)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Fundo de Garantia CDC 90 dias */}
                <div className="p-4 rounded-2xl bg-[#16171f] border border-blue-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white flex items-center gap-1.5 text-xs">
                      <ShieldCheck size={16} className="text-blue-400" />
                      Fundo de Provisão Garantia (90d CDC)
                    </span>
                    <input
                      type="checkbox"
                      checked={reterFundoGarantia}
                      onChange={(e) => setReterFundoGarantia(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-0 cursor-pointer"
                    />
                  </div>

                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Reserva financeira prudencial para cobertura de motor e câmbio exigida pelo Art. 26 do Código de Defesa do Consumidor (CDC) durante 90 dias.
                  </p>

                  {reterFundoGarantia && (
                    <div className="space-y-1.5 pt-1 text-xs border-t border-white/5">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Percentual de Retenção:</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.5"
                            value={percentualFundoGarantia}
                            onChange={(e) => setPercentualFundoGarantia(Number(e.target.value))}
                            className="w-14 px-1.5 py-0.5 rounded bg-black/40 border border-white/10 text-white font-mono text-right font-bold"
                          />
                          <span className="text-slate-400">%</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center font-mono">
                        <span className="text-slate-400">Valor Alocado na Reserva:</span>
                        <span className="text-blue-400 font-bold">{formatCurrency(valorFundoGarantia)}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Tributação s/ Margem */}
                <div className="p-4 rounded-2xl bg-[#16171f] border border-amber-500/30 space-y-2">
                  <span className="font-bold text-white flex items-center gap-1.5 text-xs">
                    <Receipt size={16} className="text-amber-400" />
                    Provisão Tributária (Simples Nacional s/ Margem)
                  </span>

                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Estimativa de imposto apurado por equiparação comercial sobre a margem de lucro real da operação.
                  </p>

                  <div className="space-y-1.5 pt-1 text-xs border-t border-white/5">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Alíquota s/ Margem:</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="0.1"
                          value={aliquotaImpostoMargem}
                          onChange={(e) => setAliquotaImpostoMargem(Number(e.target.value))}
                          className="w-14 px-1.5 py-0.5 rounded bg-black/40 border border-white/10 text-white font-mono text-right font-bold"
                        />
                        <span className="text-slate-400">%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center font-mono">
                      <span className="text-slate-400">Imposto Estimado:</span>
                      <span className="text-amber-400 font-bold">{formatCurrency(valorImpostoMargem)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* DRE Sintético do Fechamento */}
              <div className="p-4 rounded-2xl bg-[#16171f] border border-emerald-500/30 space-y-2 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <TrendingUp size={16} className="text-emerald-400" />
                    DRE Sintético do Fechamento (Admin)
                  </span>
                  <span className="text-emerald-400 font-black text-sm">
                    Lucro Real no Bolso: {formatCurrency(lucroLiquidoRealNoBolso)}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                  <div>
                    <span className="text-slate-500 block">Lucro Bruto:</span>
                    <span className="text-white font-bold">{formatCurrency(lucroBruto)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Comissões ({comissoesUsuariosCalculadas.filter((u) => !u.isento).length} ativas):</span>
                    <span className="text-rose-400 font-bold">-{formatCurrency(totalComissoesAtivasValor)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Fundo Garantia (CDC):</span>
                    <span className="text-blue-400 font-bold">-{formatCurrency(valorFundoGarantia)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Margem Líquida Real:</span>
                    <span className="text-emerald-300 font-black">{margemRealPercent.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Observações Gerais */}
          <div>
            <label className="block text-slate-300 font-bold mb-1">Observações Internas da Venda (Opcional)</label>
            <textarea
              rows={2}
              value={observacoesVenda}
              onChange={(e) => setObservacoesVenda(e.target.value)}
              placeholder="Ex: Cliente solicitou entrega com tanque cheio, garantia estendida negociada..."
              className="w-full p-2.5 rounded-xl border border-white/10 bg-black/40 text-slate-200 text-xs outline-none focus:border-purple-500"
            />
          </div>
          </div>

          {/* Fixed Footer Actions */}
          <div className="p-4 sm:p-5 border-t border-white/10 bg-[#16171f] flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div>
              {podeGerarContrato && (
                <button
                  type="button"
                  onClick={() => setShowContratoModal(true)}
                  className="px-4 py-2.5 rounded-xl font-bold bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 transition flex items-center gap-2 text-xs cursor-pointer active:scale-95 shadow-sm"
                  title="Visualizar e Imprimir Contrato de Compra e Venda A4 com os dados preenchidos"
                >
                  <FileText size={15} className="text-purple-400" />
                  <span>Gerar Contrato (A4 / PDF)</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md shadow-purple-950/40 flex items-center gap-1.5 transition cursor-pointer active:scale-95"
              >
                <Sparkles size={16} /> Concluir Fechamento & Dar Baixa
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Modal de Impressão / Visualização do Contrato A4 */}
      {showContratoModal && veiculo && (
        <ModalContratoVenda
          isOpen={showContratoModal}
          onClose={() => setShowContratoModal(false)}
          veiculo={veiculo}
          currentUser={currentUser}
          vendaData={{
            valorVenda,
            compradorNome,
            compradorCpf,
            compradorRg,
            compradorEmail,
            compradorTelefone,
            compradorEndereco,
            compradorEstadoCivil,
            compradorProfissao,
            compradorDataNascimento,
            dataVenda,
            formaPagamento: modoPagamento === 'simples' ? formaSimples : 'Composição Híbrida',
            contaBancariaDestinoId,
            contaBancariaDestinoNome,
            observacoesVenda: observacoesVenda,
            previsaoEntregaVeiculo,
            composicaoPagamento: modoPagamento === 'hibrido'
              ? parcelasHibridas.map((p, idx) => ({
                  ...p,
                  pagamentoId: p.pagamentoId || p.id || `pag_${idx + 1}`,
                }))
              : undefined,
            financiamentoDetalhes: isFinanciamentoAtivo ? {
              bancoParceiro,
              valorEntrada: valorEntradaFinanciamento,
              valorFinanciado: valorFinanciado || (valorVenda - valorEntradaFinanciamento),
              retornoComissaoBanco: totalRetornoTacBancos,
              retornoTipo,
              retornoPercentual,
              contaDestinoEntrada: valorEntradaFinanciamento > 0 ? contaDestinoEntrada : undefined,
            } : undefined,
            veiculoTrocaDetalhes: isTrocaAtiva ? {
              possuiTroca: true,
              placa: trocaPlaca.toUpperCase().trim(),
              modelo: trocaModelo.trim(),
              marca: trocaMarca.trim() || undefined,
              ano: Number(trocaAnoModelo) || Number(trocaAnoFabricacao) || new Date().getFullYear() - 5,
              anoFabricacao: Number(trocaAnoFabricacao) || undefined,
              anoModelo: Number(trocaAnoModelo) || undefined,
              chassi: trocaChassi.toUpperCase().trim() || undefined,
              renavam: trocaRenavam.trim() || undefined,
              cor: trocaCor.trim() || undefined,
              combustivel: trocaCombustivel.trim() || undefined,
              km: Number(trocaKm) || undefined,
              proprietarioAtual: trocaProprietarioAtual.trim() || undefined,
              documentoProprietario: trocaDocumentoProprietario.trim() || undefined,
              valorAvaliacaoCompra: Number(trocaValorAvaliacao),
              margemRecondicionamentoEstimada: Number(trocaMargemRecondicionamento || 0)
            } : undefined,
            financiamentoTerceiro: financiamentoTerceiroAtivo ? {
              ativo: true,
              nomeTerceiro: terceiroNome,
              cpfTerceiro: terceiroCpf,
              rgTerceiro: terceiroRg,
              telefoneTerceiro: terceiroTelefone,
              emailTerceiro: terceiroEmail,
              enderecoTerceiro: terceiroEndereco,
              estadoCivilTerceiro: terceiroEstadoCivil,
              profissaoTerceiro: terceiroProfissao,
              dataNascimentoTerceiro: terceiroDataNascimento,
              grauParentesco: terceiroGrauParentesco === 'Outro' ? terceiroGrauCustom : terceiroGrauParentesco,
              observacoes: terceiroObservacoes,
            } : undefined,
          }}
        />
      )}
    </div>
  );
};
