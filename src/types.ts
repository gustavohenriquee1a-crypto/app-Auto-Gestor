export type CategoriaFornecedor = 
  | 'Agência de Tráfego / Marketing'
  | 'Posto de Combustível'
  | 'Oficina Mecânica'
  | 'Autopeças'
  | 'Funilaria e Pintura'
  | 'Lava Jato / Estética Automotiva'
  | 'Auto Elétrica / Acessórios'
  | 'Tapeçaria / Higienização'
  | 'Pneus / Borracharia'
  | 'Guincho / Reboque'
  | 'Vistoria Cautelar / Laudo'
  | 'Despachante'
  | 'Cartório / Serviços Notariais'
  | 'Concessionária / Concessionário'
  | 'Outro Parceiro';

export interface FornecedorPrestador {
  id: string;
  nome: string; // Nome Fantasia ou Nome Principal
  nomeEmpresa?: string; // Alias para compatibilidade
  razaoSocial?: string;
  cnpjCpf?: string;
  categoria: CategoriaFornecedor;
  telefone: string;
  whatsapp?: string;
  email?: string;
  responsavelContato?: string;
  endereco?: string;
  cidade?: string;
  cidadeUf?: string;
  chavePix?: string;
  tipoChavePix?: 'CNPJ' | 'CPF' | 'E-mail' | 'Telefone' | 'Aleatória';
  bancoDadosBancarios?: string;
  especialidades?: string[];
  observacoes?: string;
  status: 'Ativo' | 'Inativo';
  // Condições Comerciais & Faturamento
  tipoCobranca?: 'Avulso / No Ato do Serviço' | 'Faturamento Mensal (Lote / Fechamento)' | 'Fixo Mensal' | 'Variável por Volume/Serviço';
  diaFechamentoFatura?: number; // Ex: todo dia 20 (opcional para avulso)
  diaVencimentoPagamento?: number; // Ex: todo dia 28 (opcional para avulso)
  valorContratoMensal?: number; // Obrigatório se tipoCobranca === 'Fixo Mensal'
  createdAt?: string;
}

export type StatusVeiculo = 'Disponível' | 'Alugado' | 'Em Preparação' | 'Vendido' | 'Em Manutenção';

export type StatusEstoque = 'Em Trânsito' | 'Em Preparação' | 'No Pátio' | 'Vendido';

export type CategoriaDespesa = 
  | 'Anúncio Patrocinado (Meta/Google Ads)'
  | 'Combustível'
  | 'Peças'
  | 'Mecânica / Mão de Obra'
  | 'Funilaria / Pintura'
  | 'IPVA / Licenciamento'
  | 'Frete / Transporte'
  | 'Frete / Guincho'
  | 'Taxas de Origem / Leilão'
  | 'Cartório / Serviços Notariais'
  | 'Documentação / Despachante'
  | 'Estética / Lavagem'
  | 'Pneus'
  | 'Comissão'
  | 'Repasse de Lucro - Parceiro'
  | 'Distribuição de Lucro - Sócio/Dono'
  | 'Comissão/Bônus Extra - Funcionário'
  | 'Pró-labore'
  | 'Outros';

export interface DespesaVeiculo {
  id: string;
  veiculoId: string;
  chassi: string;
  placa: string;
  categoria: CategoriaDespesa;
  descricao: string;
  valor: number;
  data: string; // ISO format YYYY-MM-DD
  fornecedor: string;
  fornecedorId?: string;
  nfNumero?: string;
  comprovanteUrl?: string;
  statusPagamento: 'Pago' | 'Pendente';
  // Regra de Vencimento / Exigibilidade (ex: Cartório, Despachante)
  exigibilidade?: 'imediata' | 'no_ato_venda'; // 'imediata' = vence na data informada; 'no_ato_venda' = só vence/liquida quando o veículo for vendido
  dataVencimento?: string;
  // Dados de Abastecimento
  litrosAbastecidos?: number;
  kmAbastecimento?: number;
  responsavelAbastecimento?: string;
  motivoSaidaAbastecimento?: string;
  tipoCombustivelAbastecido?: string;
  valorPorLitro?: number;
  // Dados bancários e liquidação
  contaBancariaId?: string;
  contaBancariaNome?: string;
  // Gestão de Beneficiários e Comissões
  tipoComissaoOrigem?: 'automatica_venda' | 'manual_usuario' | 'previsao_generica';
  beneficiarioUsuarioId?: string;
  beneficiarioNome?: string;
  beneficiarioEmail?: string;
  vendaId?: string;
  dataPagamento?: string;
  formaPagamento?: string;
  observacaoPagamento?: string;
  observacoes?: string;
  // Parcelamento e Vínculo entre Despesas ("Restante do Pagamento", Entrada, Parcelas)
  tipoCondicao?: 'a_vista' | 'entrada_restante' | 'parcelado' | 'restante_vinculado';
  tipoVinculo?: 'entrada' | 'restante' | 'parcela' | 'complemento';
  despesaOrigemId?: string; // ID da despesa pai/origem à qual este restante ou complemento se vincula
  despesaOrigemDescricao?: string; // Descrição rápida de referência da despesa pai
  grupoParcelamentoId?: string; // Identificador comum a todas as parcelas ou partes do mesmo acordo
  parcelaNumero?: number; // Número da parcela (ex: 1, 2, 3...)
  totalParcelas?: number; // Total de parcelas do acordo (ex: 2, 3...)
  valorTotalAcordo?: number; // Valor integral contratado/acordado
}

export interface PagamentoAluguel {
  id: string;
  contratoId: string;
  veiculoId: string;
  motoristaNome: string;
  semanaReferencia: string; // Ex: '12/08 - 18/08'
  dataVencimento: string; // YYYY-MM-DD
  valor: number;
  valorAluguelBase?: number;
  valorParcelaCaucao?: number;
  valorParcelaDebito?: number;
  status: 'Pago' | 'Pendente' | 'Atrasado';
  dataPagamento?: string;
  metodoPagamento?: 'PIX' | 'Transferência' | 'Dinheiro' | 'Boleto';
  observacao?: string;
}

// 1. Registro Diário de KM
export interface RegistroKmDiario {
  id: string;
  data: string; // YYYY-MM-DD
  kmRegistrado: number;
  kmAnterior: number;
  kmRodadoNoDia: number;
  observacao?: string;
  registradoPor?: string;
  createdAt?: string;
}

// 2. Manutenção Preventiva Personalizável por KM
export interface ItemManutencaoPreventiva {
  id: string;
  nome: string; // Ex: "Troca de Óleo e Filtros", "Pastilhas de Freio", "Pneus", "Correia Dentada", etc.
  intervaloKm: number; // Intervalo personalizável em KM (Ex: 10000, 20000, 40000, 50000)
  kmUltimaTroca: number; // KM em que foi realizada a última manutenção
  kmProximaTroca: number; // kmUltimaTroca + intervaloKm
  custoEstimado?: number;
  dataUltimaTroca?: string;
  observacoes?: string;
}

// 3. Débitos Causados pelo Motorista (Multas, Batidas, Acidentes, etc.)
export type TipoDebitoMotorista = 
  | 'Multa de Trânsito'
  | 'Batida / Avaria'
  | 'Acidente / Sinistro'
  | 'Franquia de Seguro'
  | 'Guincho / Reboque'
  | 'Chaveiro / Acessório'
  | 'Outro';

export type StatusDebitoMotorista = 
  | 'Pendente'
  | 'Descontado do Caução'
  | 'Parcelado com Aluguel'
  | 'Pago pelo Motorista'
  | 'Quitado';

export interface DebitoMotorista {
  id: string;
  contratoId: string;
  veiculoId: string;
  tipo: TipoDebitoMotorista;
  descricao: string;
  valorTotal: number;
  dataOcorrencia: string;
  autoInfracao?: string;
  orgaoEmissor?: string;
  status: StatusDebitoMotorista;
  formaQuitacao?: 'Caução' | 'Parcelamento Semanal' | 'PIX / À Vista';
  valorPago: number;
  valorPendente: number;
  quantidadeParcelas?: number;
  valorParcelaSemanal?: number;
  parcelasPagas?: number;
  comprovanteUrl?: string;
  observacoes?: string;
}

// 4. Reposição de Caução Parcelada
export interface ReposicaoCaucaoParcelada {
  ativa: boolean;
  valorTotalRepor: number;
  quantidadeParcelas: number;
  valorParcelaSemanal: number;
  parcelasPagas: number;
  parcelasRestantes: number;
  motivoRepor?: string;
}

// 5. Histórico e Cronograma de Mudanças de Status do Veículo
export type TipoEventoStatus = 
  | 'Entrada / Aquisição'
  | 'Locação Iniciada'
  | 'Devolução / Encerramento'
  | 'Manutenção Preventiva'
  | 'Revisão Periódica'
  | 'Abastecimento'
  | 'Envio para Oficina'
  | 'Preparação / Estética'
  | 'Retorno ao Pátio'
  | 'Venda Concluída'
  | 'Atualização de KM'
  | 'Débito / Ocorrência'
  | 'Mudança de Status';

export interface EventoHistoricoVeiculo {
  id: string;
  data: string; // YYYY-MM-DD ou YYYY-MM-DDTHH:mm
  tipo: TipoEventoStatus;
  titulo: string;
  descricao: string;
  statusResultante?: StatusVeiculo;
  km?: number;
  motoristaNome?: string;
  motoristaCpf?: string;
  fornecedorOficina?: string;
  fornecedorNome?: string;
  valor?: number;
  usuarioRegistro?: string;
  observacoes?: string;
}

export interface ContratoLocacao {
  id: string;
  veiculoId: string;
  placa: string;
  modelo: string;
  motoristaNome: string;
  motoristaCpf: string;
  motoristaTelefone: string;
  motoristaApp: 'Uber' | '99' | 'Indrive' | 'Misto';
  motoristaFoto?: string;
  dataInicio: string; // YYYY-MM-DD
  dataFimPrevista?: string;
  valorSemanal: number;
  diaCobranca: 'Segunda-feira' | 'Terça-feira' | 'Quarta-feira' | 'Quinta-feira' | 'Sexta-feira' | 'Sábado' | 'Domingo';
  // Caução
  caucao: number; // Caução total exigido
  caucaoTotalPago?: number; // Quanto o motorista depositou
  caucaoUtilizado?: number; // Abatido em multas/avarias
  caucaoSaldoAtual?: number; // Saldo em garantia disponível
  reposicaoCaucao?: ReposicaoCaucaoParcelada;
  // Débitos, KM e Manutenções
  debitosMotorista?: DebitoMotorista[];
  registrosKmDiario?: RegistroKmDiario[];
  itensManutencao?: ItemManutencaoPreventiva[];
  proximoVencimento?: string;
  status: 'Ativo' | 'Encerrado' | 'Inadimplente';
  kmInicial: number;
  kmAtual: number;
  // Score e Risco do Motorista (PDD)
  scoreMotorista?: 'A' | 'B' | 'C' | 'D';
  provisaoDevedorDuvidoso?: number; // PDD
  extratoContaCorrente?: LancamentoContaMotorista[];
  contaCorrenteMotorista?: LancamentoContaMotorista[];
  checklistRetiradaId?: string;
  checklistDevolucaoId?: string;
  fechamentoCaucao?: FechamentoCaucaoResumo;
  pagamentos: PagamentoAluguel[];
}

export interface ParcelaPagamentoHibrido {
  id: string;
  tipo: 'PIX' | 'Financiamento' | 'Cartão de Crédito' | 'Cartão de Débito' | 'TED/Transferência' | 'Dinheiro Espécie' | 'Veículo na Troca';
  valorBruto: number;
  taxaPercentual?: number;
  taxaValor?: number;
  valorLiquido: number;
  contaBancariaId?: string;
  bancoDestino?: string;
  detalhes?: string;
  // Detalhes se for Troca
  trocaPlaca?: string;
  trocaModelo?: string;
  trocaAno?: number;
  // Detalhes se for Financiamento
  bancoFinanciador?: string;
  retornoTacBanco?: number;
}

export interface LancamentoContaMotorista {
  id: string;
  data: string;
  tipo: 'DEBITO_DIARIA' | 'DEBITO_MULTA' | 'DEBITO_AVARIA' | 'DEBITO_JUROS_ATRASO' | 'CREDITO_PAGAMENTO' | 'CREDITO_CAUCAO' | 'DEVOLUCAO_CAUCAO';
  descricao: string;
  valor: number; // Positivo para crédito, negativo para débito
  saldoApos: number;
  comprovanteUrl?: string;
}

export interface FechamentoCaucaoResumo {
  caucaoTotalDepositado: number;
  debitosMultasAbatidos: number;
  avariasAbatidas: number;
  aluguelPendenteAbatido: number;
  saldoFinalDevolver: number;
  dataEncerramento: string;
  observacoes?: string;
}

export type OrigemLeadType = 'Meta Ads' | 'Google Ads' | 'Webmotors/OLX' | 'Passante' | 'Indicação' | 'WhatsApp';

export type CanalOrigemLead = 
  | 'Anúncio Pago (Tráfego / Ads)'
  | 'Orgânico / Pátio'
  | 'Portais (Webmotors/OLX)'
  | 'Indicação / Redes Sociais'
  | 'Redes Sociais (Instagram/Facebook)'
  | 'Anúncio Pago (Google/Meta)'
  | 'OLX/Webmotors'
  | 'Indicação de Cliente'
  | 'Passante/Pátio'
  | 'Cliente Base/Fidelizado'
  | 'Outro';

export type TipoAtendimentoLead = 'Presencial na Loja' | 'Online (WhatsApp/Telefone)' | 'Misto';

export type BancoFinanciamentoParceiro = 'Santander' | 'BV' | 'Itaú' | 'Bradesco' | 'Pan' | 'Safra' | 'C6' | 'Outro';

export interface BancoParceiro {
  id: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  codigoLojista?: string; // Código de Lojista / Operador / Correspondente
  codigoCompensacao?: string; // Código COMPE (ex: 033 Santander, 341 Itaú, 237 Bradesco, 104 Caixa)
  nomeGerente?: string; // Nome do Gerente de Conta do Banco / Mesa
  gerenteContato?: string; // Contato / Telefone direto do Gerente
  telefone?: string;
  whatsapp?: string;
  email?: string;
  linkPortal?: string; // URL do Portal do Banco / Financeira
  domicilioBancario?: string; // Resumo do Domicílio Bancário para Repasse da Loja
  bancoDomicilio?: string;
  agenciaDomicilio?: string;
  contaDomicilio?: string;
  pixDomicilio?: string;
  tipoContaDomicilio?: 'Conta Corrente PJ' | 'Conta Pagamento' | 'Poupança';
  taxaRetornoPadrao?: number; // % padrão de retorno/TAC da financeira à loja
  status: 'Ativo' | 'Inativo';
  observacoes?: string;
  createdAt?: string;
}

export interface FinanciamentoDetalhesVenda {
  bancoParceiroId?: string;
  bancoParceiroNome?: string;
  bancoParceiro: BancoFinanciamentoParceiro | string;
  valorEntrada: number;
  valorFinanciado: number;
  retornoComissaoBanco: number; // R$ de retorno/TAC da financeira à loja
  retornoTipo?: 'valor' | 'percentual';
  retornoPercentual?: number;
  contaDestinoEntrada?: string;
  contaDestinoEntradaId?: string;
  // Liquidação de Financiamento (Repasse do Banco Financiador à Loja)
  statusLiquidacaoFinanciamento?: 'Pendente' | 'Recebido';
  dataLiquidacaoFinanciamento?: string;
  contaBancariaLiquidacaoId?: string;
  contaBancariaLiquidacaoNome?: string;
  formaLiquidacaoFinanciamento?: string;
  // Liquidação de Retorno / TAC da Financeira à Loja
  statusLiquidacaoTac?: 'Pendente' | 'Recebido';
  dataLiquidacaoTac?: string;
  contaBancariaTacId?: string;
  contaBancariaTacNome?: string;
  formaLiquidacaoTac?: string;
  observacoesLiquidacao?: string;
}

export interface VeiculoTrocaDetalhesVenda {
  possuiTroca: boolean;
  placa?: string;
  modelo?: string;
  marca?: string;
  ano?: number;
  anoFabricacao?: number;
  anoModelo?: number;
  chassi?: string;
  renavam?: string;
  cor?: string;
  combustivel?: string;
  km?: number;
  proprietarioAtual?: string;
  documentoProprietario?: string;
  valorAvaliacaoCompra?: number;
  margemRecondicionamentoEstimada?: number; // Custo estimado de reparo/recondicionamento
}

// 5. Dados do Cliente e Financiamento em Nome de Terceiro
export interface FinanciamentoTerceiro {
  ativo: boolean;
  nomeTerceiro: string;
  cpfTerceiro: string;
  rgTerceiro?: string;
  telefoneTerceiro?: string;
  emailTerceiro?: string;
  enderecoTerceiro?: string;
  dataNascimentoTerceiro?: string;
  profissaoTerceiro?: string;
  estadoCivilTerceiro?: string;
  grauParentesco: string; // Ex: "Pai / Mãe", "Cônjuge / Esposo(a)", "Filho(a)", "Irmão / Irmã", "Tio(a)", "Primo(a)", "Sócio / Empresa", "Amigo(a)", ou digitado livremente
  observacoes?: string;
}

export interface ProfissaoCadastrada {
  id: string;
  nome: string;
  criadoPor?: string;
  criadoEm?: string;
}

export interface VendaVeiculo {
  id: string;
  veiculoId: string;
  placa: string;
  modelo: string;
  chassi: string;
  valorCompra: number;
  totalDespesas: number;
  custoTotal: number;
  valorVenda: number;
  lucroLiquido: number;
  margemLucroPercent: number;
  dataEntrada: string;
  dataVenda: string;
  diasEmPatio: number;
  compradorNome: string;
  compradorCpf: string;
  compradorRg?: string;
  compradorEmail?: string;
  compradorTelefone?: string;
  compradorEndereco?: string;
  compradorEstadoCivil?: string;
  formaPagamento: 'À Vista PIX' | 'Financiamento' | 'Troca + Volta' | 'Cartão' | 'Dinheiro' | 'Composição Híbrida';
  
  // 1. Origem e Qualificação do Lead (Atração, Marketing & CRM)
  origemLead?: 'Meta Ads' | 'Google Ads' | 'Webmotors/OLX' | 'Passante' | 'Indicação' | 'WhatsApp';
  despesaMarketingAplicadaPosVenda?: number; // Custo de tráfego/ads alocado no pós-venda (deduz do lucro no DRE sem alterar comissão)
  canalOrigem?: CanalOrigemLead;
  tipoAtendimento?: TipoAtendimentoLead;
  investimentoAnuncioProprio?: number; // R$ alocado para anúncio do carro na venda caso não lançado previamente

  // 2. Histórico de Engajamento e Relacionamento
  quantidadeVisitas?: number;
  realizouTestDrive?: boolean;
  dataHoraTestDrive?: string;
  observacoesTestDrive?: string;

  // 3. Detalhamento do Financiamento
  financiamentoDetalhes?: FinanciamentoDetalhesVenda;
  financiamentoTerceiro?: FinanciamentoTerceiro;

  // 4. Veículo de Troca / Avaliação
  veiculoTrocaDetalhes?: VeiculoTrocaDetalhesVenda;

  // 5. Dados Complementares do Cliente e Pós-Venda
  compradorDataNascimento?: string;
  compradorProfissao?: string;
  previsaoEntregaVeiculo?: string;

  // Conta Bancária / Caixa de Destino do Recebimento (Bancos & Giro)
  contaBancariaDestinoId?: string;
  contaBancariaDestinoNome?: string;

  // Composição Híbrida & Taxas
  composicaoPagamento?: ParcelaPagamentoHibrido[];
  retornoFinanciamentoTac?: number;
  taxasMaquininhaTotal?: number;
  // Fundo de Garantia (Provisão Pós-Venda 90 dias)
  fundoGarantiaProvisao?: {
    percentual: number;
    valor: number;
    liberado: boolean;
  };
  // Impostos e Rateio Indireto
  impostoMargemEstimado?: number;
  rateioCustosIndiretosLoja?: number;
  custoOportunidadeCdi?: number;
  lucroLiquidoRealNoBolso?: number;
  // Veículo recebido na troca
  veiculoTrocaEntrada?: {
    placa: string;
    modelo: string;
    ano: number;
    valorAvaliado: number;
    novoVeiculoIdCriado?: string;
  };
  // Vendedor e Comissões
  vendedorId?: string;
  vendedorNome?: string;
  vendedorEmail?: string;
  tipoComissao?: 'percentual' | 'fixo';
  // Perfis de Comissionamento
  regraComissao?: 'admin_gerente' | 'vendedor_padrao' | 'vendedor_bonus_tac' | 'manual';
  comissaoBaseFixa?: number; // R$ fixo base para vendedor padrão ou vendedor com bônus
  comissaoPercentualTac?: number; // % sobre o retorno TAC/Financiamento
  comissaoBonusTacPercent?: number; // % sobre o retorno TAC
  comissaoBonusTacValor?: number; // R$ apurado do bônus TAC
  comissaoPercentual?: number;
  comissaoFixa?: number;
  comissaoValor: number; // Valor final em R$ (editável livremente na venda)
  comissaoAjustadaManualmente?: boolean;
  comissaoStatus?: 'Pendente' | 'Paga';
  comissaoDataPagamento?: string; // Data em que o admin efetuou o pagamento da comissão (YYYY-MM-DD)
  comissaoFormaPagamento?: 'PIX' | 'Transferência Bancária' | 'Dinheiro / Espécie' | 'Cheque' | 'Conta Corrente' | string;
  comissaoReciboAssinado?: boolean; // Se o vendedor assinou o recibo de quitação da comissão
  comissaoReciboDataAssinatura?: string; // Data em que o vendedor assinou o recibo
  comissaoObservacoesAdmin?: string; // Observações do administrador/financeiro sobre a comissão
  // Comissão Gerencial Separada (Admin / Gerente)
  comissaoGerencialValor?: number;
  comissaoGerencialPercentual?: number;
  comissaoGerencialStatus?: 'Pendente' | 'Paga';
  comissaoGerencialBeneficiarioId?: string;
  comissaoGerencialBeneficiarioNome?: string;
  // Motor de Comissões Dinâmicas (Regras por Usuário & Exceções por Venda)
  comissoesDetalhadas?: ComissaoDetalhadaVenda[];
  observacoesVenda?: string;
}

export interface ComissaoDetalhadaVenda {
  id: string;
  usuarioId: string;
  usuarioNome: string;
  usuarioEmail?: string;
  usuarioCargo?: string;
  usuarioRole?: string;
  regraId: string;
  tipoBase: 'Venda Bruta' | 'Lucro do Veículo' | 'Retorno TAC' | 'Fixo por Carro';
  formato: 'Percentual' | 'Valor Fixo';
  valorOrPercentual: number;
  condicaoGatilho: 'Sempre' | 'Apenas se houver TAC' | 'Apenas se for Financiado';
  valorCalculado: number;
  isento?: boolean; // Se foi isentado/removido nesta venda específica
  motivoIsencao?: string;
  status?: 'Pendente' | 'Paga';
  dataPagamento?: string;
}

export interface RegraRemuneracao {
  id: string;
  tipoBase: 'Venda Bruta' | 'Lucro do Veículo' | 'Retorno TAC' | 'Fixo por Carro';
  formato: 'Percentual' | 'Valor Fixo';
  valorOrPercentual: number;
  condicaoGatilho: 'Sempre' | 'Apenas se houver TAC' | 'Apenas se for Financiado';
  descricao?: string;
}

export type TipoPropriedadeVeiculo = 'proprio' | 'consignado';
export type TipoCambioVeiculo = 'Manual' | 'Automático' | 'Automatizado' | 'CVT';
export type EtapaPipelinePreparacao = 'Entrada' | 'Oficina Mecânica' | 'Funilaria' | 'Lavagem' | 'Disponível no Pátio';

export interface Veiculo {
  id: string;
  placa: string;
  chassi: string;
  renavam?: string;
  modelo: string;
  marca: string;
  ano: number; // Ano de referência principal
  anoFabricacao?: number; // Ano de fabricação (ex: 2023)
  anoModelo?: number; // Ano do modelo (ex: 2024)
  tipoOperacao?: 'Venda' | 'Locacao' | 'Misto'; // Discriminador de Operação: Venda, Locação ou Misto
  tipoPropriedade?: TipoPropriedadeVeiculo; // 'proprio' (Frota Própria / Comprado) ou 'consignado' (Consignação)
  proprietarioAnterior?: {
    nome?: string;
    documento?: string; // CPF ou CNPJ
    telefone?: string;
  };
  cambio?: TipoCambioVeiculo; // 'Manual' | 'Automático' | 'Automatizado' | 'CVT'
  motorizacao?: string; // Ex: '1.0 Flex', '1.4 Turbo', '2.0 16V'
  potencia?: string; // Ex: '116 CV', '150 HP'
  notaEntradaGerada?: boolean; // Se a nota fiscal de entrada foi emitida (Prevenção de multa de fiscalização)
  notaEntradaNumero?: string; // Ex: 'NF-e 10294'
  notaEntradaData?: string; // Data de emissão da NF-e de entrada
  notaEntradaChave?: string; // Chave de 44 dígitos da NF-e
  notaEntradaObs?: string;
  cor: string;
  combustivel: 'Flex' | 'Gasolina' | 'Etanol' | 'Diesel' | 'Híbrido' | 'Elétrico';
  kmAtual: number;
  kmUltimaRevisao: number;
  custoAquisicao: number;
  valorFipe?: number;
  valorVendaSugerido?: number;
  dataAquisicao?: string; // Data da compra/aquisição do veículo
  dataEntradaPatio?: string; // Data em que o carro chegou fisicamente ao pátio/showroom após transporte/mecânica
  baseCalculoAging?: 'dataEntradaPatio' | 'dataAquisicao'; // Base de cálculo dos dias de pátio (padrão: dataEntradaPatio)
  dataEntrada: string; // YYYY-MM-DD (Retrocompatibilidade)
  status: StatusVeiculo;
  // Nova Etapa de Logística & Estoque Operacional
  status_estoque?: StatusEstoque; // 'Em Trânsito' | 'Em Preparação' | 'No Pátio' | 'Vendido'
  etapaPipeline?: EtapaPipelinePreparacao; // 'Entrada' -> 'Oficina Mecânica' -> 'Funilaria' -> 'Lavagem' -> 'Disponível no Pátio'
  origemTrocaVendaId?: string; // ID da venda de origem caso tenha entrado como troca
  origemTrocaPlacaVendida?: string;
  origem_compra?: string; // Cidade / Empresa / Leilão / Site (ex: 'Copart Curitiba/PR', 'Webmotors Particular SP', 'Entrada na Troca')
  previsao_chegada?: string; // YYYY-MM-DD (Data estimada de entrega na cidade pelo guincho)
  previsao_termino_preparacao?: string; // YYYY-MM-DD (Previsão de término da oficina e liberação para o pátio)
  data_chegada_patio?: string; // YYYY-MM-DD (Data em que o carro virou 'No Pátio' - marco zero do relógio de Aging)
  custo_frete_transporte?: number; // Custo previsto ou realizado de frete/guincho
  taxas_origem?: number; // Taxas de leilão, laudo ou cartório na origem
  transportadora_guincho?: string; // Nome da transportadora / guincheiro
  telefone_transportadora?: string; // Telefone / WhatsApp do transportador
  rastreamento_transporte?: string; // Código ou link de rastreamento / observação
  localizacaoPatio?: string;
  // Rastreamento de Fornecedor de Origem / Compra
  fornecedorOrigemId?: string;
  fornecedorOrigemNome?: string;
  // Rastreamento de Preparações, Serviços & Oficinas Parceiras
  fornecedorAtualId?: string;
  fornecedorAtualNome?: string;
  fornecedorAtualCategoria?: CategoriaFornecedor;
  servicoAtualEmAndamento?: string; // Ex: 'Revisão Mecânica', 'Pintura Para-choque', 'Higienização e Polimento'
  dataEnvioOficina?: string; // YYYY-MM-DD
  previsaoRetornoOficina?: string; // YYYY-MM-DD
  statusPreparacaoOficina?: 'Pátio / Pronto' | 'Aguardando Envio' | 'Em Orçamento' | 'Em Execução' | 'Pronto para Retirada';
  custoEstimadoServico?: number;
  fotoUrl?: string;
  observacoes?: string;
  despesas: DespesaVeiculo[];
  contratoAtivo?: ContratoLocacao;
  dataVenda?: string;
  venda?: VendaVeiculo;
  // Rastreamento de Divulgação & Performance de Marketing
  anuncioAtivo?: boolean;
  plataformasAnuncio?: string[];
  historicoStatus?: EventoHistoricoVeiculo[];
  historicoAuditoriaStatus?: LogAuditoriaStatusEstoque[];
  // Novas Funcionalidades: Test Drive, Vistoria e Funil Kanban
  testDrives?: RegistroTestDrive[];
  historicoTestDrives?: RegistroTestDrive[];
  vistorias?: LaudoVistoriaEntrada[];
  laudosVistoria?: LaudoVistoriaEntrada[];
  etapaKanban?: EtapaKanbanPreparacao;
}

export type EtapaKanbanPreparacao = 'Oficina' | 'Funilaria' | 'Estética' | 'Pronto para Pátio';

// 6. Controle de Test Drive
export interface RegistroTestDrive {
  id: string;
  veiculoId: string;
  placa: string;
  modelo: string;
  clienteNome: string;
  clienteCnh: string;
  cnhCategoria?: string;
  clienteCpf?: string;
  clienteTelefone: string;
  dataHora: string; // ISO ou YYYY-MM-DDTHH:mm
  kmInicial: number;
  kmFinal?: number;
  observacoes?: string;
  vendedorId?: string;
  vendedorNome?: string;
  status: 'Agendado' | 'Em Andamento' | 'Concluído' | 'Cancelado';
  termoAssinado?: boolean;
  createdAt: string;
}

// 7. Vistoria Digital de Entrada
export interface ItemVistoria {
  id: string;
  categoria: 'Pintura & Lataria' | 'Pneus & Rodas' | 'Motor & Mecânica' | 'Interior & Tapeçaria' | 'Documentação & Chaves' | 'Elétrica & Vidros';
  nome: string;
  status: 'ok' | 'avaria';
  observacao?: string;
}

export interface LaudoVistoriaEntrada {
  id: string;
  veiculoId: string;
  placa: string;
  modelo: string;
  chassi?: string;
  dataVistoria: string; // YYYY-MM-DD
  responsavelNome: string;
  kmVistoria: number;
  nivelCombustivel: 'Reserva' | '1/4' | '1/2' | '3/4' | 'Cheio';
  itens: ItemVistoria[];
  observacoesGerais?: string;
  statusGeral: 'Aprovado' | 'Aprovado com Apontamentos' | 'Reprovado / Requer Oficina';
  avariasIdentificadas?: string[];
  createdAt: string;
}

export interface ChecklistLocacao {
  id: string;
  contratoId?: string;
  veiculoId: string;
  placa: string;
  modelo: string;
  motoristaNome: string;
  tipo: 'Retirada' | 'Devolucao'; // Check-in ou Check-out
  data: string; // YYYY-MM-DD ou ISO
  km: number;
  nivelCombustivel: 'Reserva' | '1/4' | '1/2' | '3/4' | 'Cheio';
  estadoPneus: 'Novos' | 'Bons' | 'Meia-vida' | 'Desgastados' | 'Troca Urgente';
  estepe: boolean;
  macacoChaveRoda: boolean;
  documentoVeiculo: boolean;
  trianguloSinalizacao: boolean;
  limpeza: 'Impecável' | 'Padrão' | 'Sujo' | 'Requer Higienização';
  avarias: {
    item: string;
    descricao: string;
    cobrarDoMotorista?: boolean;
    valorAvaria?: number;
  }[];
  fotos?: string[];
  observacoes?: string;
  responsavelVistoria: string;
  assinaturaMotoristaConcordou?: boolean;
  createdAt: string;
}

export interface LogAuditoriaStatusEstoque {
  id: string;
  dataHora: string; // ISO format YYYY-MM-DDTHH:mm:ss.sssZ
  dataHoraFormatada?: string; // Ex: '26/08/2026 às 14:35'
  statusAnterior?: StatusEstoque | string;
  statusNovo: StatusEstoque | string;
  usuarioNome: string;
  usuarioEmail?: string;
  usuarioId?: string;
  usuarioRole?: string;
  origemModulo: 'Logística & Trânsito' | 'Preparações & Oficina' | 'Estoque' | 'Cadastro / Edição' | 'Dossiê' | 'Vendas' | string;
  motivoObservacao?: string;
}

export type CategoriaDespesaFixa = 
  | 'Insumos de Atendimento / Copa'
  | 'Insumos de Pátio / Operação'
  | 'Folha de Pagamento'
  | 'Pró-labore'
  | 'Distribuição de Lucros (Sócios/Donos)'
  | 'Repasse a Investidores'
  | 'Comissão / Bônus de Funcionários'
  | 'Aluguel Pátio / Loja'
  | 'Energia / Água / Net'
  | 'Sistemas / Software / ERP'
  | 'Contabilidade'
  | 'Impostos / DAS / Tributos'
  | 'Taxas Bancárias / Maquininha'
  | 'Mensalidade / Fee Fixo da Agência'
  | 'Marketing / Anúncios Institucionais'
  | 'Outros'
  | string;

export interface DespesaFixa {
  id: string;
  nome?: string;
  categoria: CategoriaDespesaFixa;
  descricao: string;
  valor: number;
  mesReferencia: string; // YYYY-MM
  dataVencimento?: string;
  diaVencimento?: number;
  status: 'Pago' | 'Pendente';
  comprovanteUrl?: string;
  // Vínculo opcional com fornecedor/parceiro fixo e conta bancária
  fornecedorId?: string;
  fornecedorNome?: string;
  contaBancariaId?: string;
  contaBancariaNome?: string;
  formaPagamento?: string;
  dataPagamento?: string;
  beneficiarioUsuarioId?: string;
  beneficiarioNome?: string;
  nfNumero?: string;
  observacoes?: string;
}

export interface ConfiguracaoLoja {
  id: string;
  logoUrl?: string;
  nomeLoja?: string;
  razaoSocial?: string;
  cnpj?: string;
  endereco?: string;
  cidadeUf?: string;
  telefone?: string;
  chavePixPadrao?: string;
  updatedAt?: string;
  updatedBy?: string;
  updatedByEmail?: string;
}

export interface ContaBancariaCaixa {
  id: string;
  nome: string;
  tipo: 'Conta Corrente PJ' | 'Caixa Físico' | 'Fundo Garantia' | 'Investimento / CDI';
  banco?: string;
  agencia?: string;
  conta?: string;
  chavePix?: string;
  tipoChavePix?: 'CNPJ' | 'CPF' | 'E-mail' | 'Telefone' | 'Aleatória';
  titular?: string;
  saldo: number;
  corTag?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type TipoMovimentacaoConta = 'Receita' | 'Despesa' | 'Transferência';

export interface MovimentacaoConta {
  id: string;
  contaId: string;
  contaNome: string;
  tipo: TipoMovimentacaoConta;
  categoria: string;
  valor: number;
  data: string; // YYYY-MM-DD
  descricao: string;
  vinculoVendaId?: string;
  veiculoId?: string;
  placa?: string;
  clienteNome?: string;
  formaPagamento?: string;
  criadoPor?: string;
  createdAt: string;
  // Campos específicos de transferências entre contas e terceiros
  transferenciaId?: string;
  contaOrigemId?: string;
  contaOrigemNome?: string;
  contaDestinoId?: string;
  contaDestinoNome?: string;
  isTerceiro?: boolean;
  terceiroNome?: string;
  motivo?: string;
  comprovanteNumero?: string;
  observacoes?: string;
  // Roteamento contábil e referências do Lançamento Expresso
  destinoRoteamento?: 'despesa_fixa' | 'veiculo_estoque' | 'veiculo_locacao' | 'retirada_socio' | 'avulso' | 'venda_realizada' | 'receita_loja';
  pagadorRecebedor?: string;
  despesaFixaId?: string;
  despesaVeiculoId?: string;
  tipoCusto?: 'Fixo' | 'Variável' | 'Neutro';
  categoriaCusto?: 'Custo Fixo' | 'Custo Variável' | 'Retirada Sócio' | 'Receita Venda' | 'Receita Locação' | 'Neutro';
}

export interface FechamentoCaixaDiario {
  id: string;
  data: string;
  saldoEsperadoSistema: number;
  saldoInformadoOperador: number;
  diferenca: number;
  status: 'Batido' | 'Sobra' | 'Falta';
  operadorNome: string;
  observacoes?: string;
}

export interface AgingSummary {
  dias: number;
  faixa: '0-30' | '31-60' | '60+';
  badgeColor: string;
  textColor: string;
  descricaoFaixa: string;
  alertaAcao: string;
}

export type RoleUsuario = 'admin' | 'gestor' | 'vendedor' | 'operador';
export type StatusAprovacao = 'pendente' | 'aprovado' | 'recusado';

export interface PermissoesUsuario {
  // 1. Telas de Vendas & Estoque
  verPainelExecutivo?: boolean;
  verDashboardExecutivo?: boolean;
  verVendedorDash?: boolean;
  verCatalogo?: boolean;
  verComissoes?: boolean;
  verEstoque?: boolean;
  verLogistica?: boolean;
  verRevisoes?: boolean;
  verFornecedores?: boolean;
  verBancos?: boolean;
  verAging?: boolean;
  verCrmAnalytics?: boolean;
  verFinanceiroDRE?: boolean;
  verContasPagar?: boolean;
  verContasReceber?: boolean;

  // 2. Telas de Locação de Veículos (Motoristas de App)
  verLocacaoContratos?: boolean;
  verLocacaoKm?: boolean;
  verLocacaoManutencao?: boolean;
  verLocacaoDebitos?: boolean;
  verLocacaoCaucao?: boolean;

  // 3. Telas de Administração & Segurança
  gerenciarUsuarios?: boolean;
  verBackupSeguranca?: boolean;

  // 4. Ações Operacionais & Sigilo Comercial
  venderCarro?: boolean;
  verCustosAquisicao?: boolean; // se false, vendedor não vê custo de compra da loja nem margem interna
  gerenciarLocacao?: boolean;
  gerenciarRevisoes?: boolean;
  gerenciarFornecedores?: boolean;
  gerenciarContasPagar?: boolean;
  gerenciarContasReceber?: boolean;
  gerenciarLogistica?: boolean;
  gerenciarBancos?: boolean;

  // 5. Mais Detalhes & Recursos Especiais (Customizáveis pelo Admin)
  podeGerarContratoVenda?: boolean;
  podeRealizarTestDrive?: boolean;
  podeFazerVistoria?: boolean;
  verFunilPreparacao?: boolean;
  gerenciarFunilPreparacao?: boolean;
}

export interface Usuario {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: RoleUsuario;
  statusAprovacao: StatusAprovacao;
  permissoes: PermissoesUsuario;
  regrasRemuneracao?: RegraRemuneracao[];
  regraComissaoPadrao?: 'admin_gerente' | 'vendedor_padrao' | 'vendedor_bonus_tac' | 'percentual_venda' | 'percentual' | 'fixo';
  tipoComissaoPadrao?: 'percentual' | 'fixo' | 'admin_gerente' | 'vendedor_padrao' | 'vendedor_bonus_tac' | 'percentual_venda';
  comissaoPadraoPercent?: number; // Ex: 1.5 (%) ou % sobre Lucro Bruto
  comissaoPadraoFixo?: number; // Ex: R$ 500,00 (Valor fixo em R$)
  comissaoBonusTacPercent?: number; // Ex: 20 (% de bônus sobre o retorno TAC do banco)
  cargo?: string;
  telefone?: string;
  ativo: boolean;
  authProvider?: 'google' | 'password' | 'outro';
  aprovadoPor?: string;
  dataAprovacao?: string;
  motivoRecusa?: string;
  createdAt: string;
  lastLoginAt?: string;

  // 1. Dados Pessoais & Documentos (Gestão de RH)
  cpfCnpj?: string;
  rg?: string;
  orgaoEmissor?: string;
  dataNascimento?: string;
  estadoCivil?: string;

  // 2. Endereço Residencial Completo
  enderecoCompleto?: {
    cep?: string;
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cidade?: string;
    uf?: string;
  };

  // 3. Dados Bancários (PIX para recebimento de salários e comissões)
  dadosBancarios?: {
    banco?: string;
    agencia?: string;
    conta?: string;
    tipoConta?: 'Corrente' | 'Poupança' | 'Pagamento' | string;
    tipoChavePix?: string;
    chavePix?: string;
    titular?: string;
  };

  // 4. Regras de Remuneração e Dados Contratuais (RBAC - Exclusivo Admin)
  dadosContratuais?: {
    tipoVinculo?: 'Autônomo / Comissionista Puro' | 'PJ / Prestador' | 'CLT / Funcionário' | 'Sócio / Parceiro';
    dataAdmissao?: string;
    salarioBaseFixo?: number;
    encargosTrabalhistasEstimados?: number; // Valor ou % de provisão de impostos
    percentualParticipacaoLucros?: number; // Para Sócios/Gestores
    observacoesContrato?: string;
  };
}

// Estrutura de Fechamento de Folha de Pagamento & RH
export interface ResumoFolhaUsuario {
  usuarioId: string;
  usuarioNome: string;
  usuarioEmail: string;
  cargo: string;
  tipoVinculo: string;
  mesReferencia: string; // YYYY-MM
  salarioBaseFixo: number;
  encargosTrabalhistasEstimados: number;
  comissoesPendentesValor: number;
  vendasComissoes: VendaVeiculo[];
  percentualPLR: number;
  lucroGlobalMes: number;
  valorPLRApurado: number;
  totalLiquidoColaborador: number; // Salário Fixo + Comissões + PLR
  custoTotalEmpresa: number; // Salário Fixo + Encargos + Comissões + PLR
  dadosBancarios?: Usuario['dadosBancarios'];
}

