import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Search, 
  Filter, 
  Calendar, 
  Building2, 
  ArrowUpRight, 
  ArrowDownRight, 
  ArrowLeftRight, 
  ArrowRight,
  Zap, 
  Printer, 
  Download,
  FileSpreadsheet,
  ChevronDown,
  Check,
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown, 
  Car, 
  Building, 
  Key, 
  UserCheck, 
  CreditCard, 
  Wallet, 
  Layers, 
  DollarSign, 
  SlidersHorizontal,
  X,
  ExternalLink,
  ChevronRight,
  Info,
  Tag,
  ShieldCheck,
  Percent,
  Trash2,
  Edit3,
  Scale
} from 'lucide-react';
import { 
  MovimentacaoConta, 
  DespesaFixa, 
  ContaBancariaCaixa, 
  Veiculo, 
  VendaVeiculo, 
  FornecedorPrestador, 
  Usuario 
} from '../types';
import { formatCurrency, formatCurrencyDetailed, formatDate } from '../utils/formatters';
import { 
  exportarExtratoExcel, 
  exportarExtratoCsv, 
  exportarExtratoPdf, 
  ExtratoExportOptions 
} from '../utils/exportExtrato360';

export type UnidadeNegocioFiltro = 'Todas' | 'Vendas/Repasse' | 'Locação/Frota' | 'Institucional/Loja';
export type CategoriaCustoFiltro = 'Todos' | 'Fixos' | 'Variáveis';
export type MetodoTransacaoFiltro = 'Todos' | 'PIX' | 'Financiamento/TAC' | 'Dinheiro' | 'TED';
export type TipoPessoaFiltro = 'Todos' | 'Pessoa Física' | 'Fornecedor/Parceiro' | 'Sócio';

export interface ItemExtrato360 {
  id: string;
  origem: 'movimentacao_bancaria' | 'despesa_fixa';
  data: string; // YYYY-MM-DD
  contaId?: string;
  contaNome: string;
  tipo: 'Entrada' | 'Saída' | 'Transferência';
  unidadeNegocio: 'Vendas/Repasse' | 'Locação/Frota' | 'Institucional/Loja';
  categoriaCusto: 'Fixos' | 'Variáveis' | 'Neutro';
  metodoTransacao: 'PIX' | 'Financiamento/TAC' | 'Dinheiro' | 'TED' | 'Outro';
  tipoPessoa: 'Pessoa Física' | 'Fornecedor/Parceiro' | 'Sócio';
  descricao: string;
  referencia?: string; // ex: Placa, fornecedor ou documento
  valor: number;
  categoria: string;
  pagadorRecebedor?: string;
  isTransferenciaInterna?: boolean;
  direcaoTransferencia?: 'debito' | 'credito';
  contaOrigemNome?: string;
  contaDestinoNome?: string;
  terceiroNome?: string;
  statusPagamento?: string;
  movimentacaoOriginal?: MovimentacaoConta;
  despesaFixaOriginal?: DespesaFixa;
}

interface ExtratoAvancadoViewProps {
  movimentacoesContas: MovimentacaoConta[];
  despesasFixas: DespesaFixa[];
  contasBancarias: ContaBancariaCaixa[];
  veiculos: Veiculo[];
  vendas: VendaVeiculo[];
  fornecedores?: FornecedorPrestador[];
  usuarios?: Usuario[];
  currentUser?: Usuario | null;
  onOpenLancamentoExpresso: (mov?: MovimentacaoConta) => void;
  onOpenNovaTransferencia: () => void;
  onDeleteMovimentacao?: (movId: string) => Promise<void> | void;
}

export const ExtratoAvancadoView: React.FC<ExtratoAvancadoViewProps> = ({
  movimentacoesContas,
  despesasFixas,
  contasBancarias,
  veiculos,
  vendas,
  fornecedores = [],
  usuarios = [],
  currentUser,
  onOpenLancamentoExpresso,
  onOpenNovaTransferencia,
  onDeleteMovimentacao,
}) => {
  // 1. FILTROS MÚLTIPLOS
  const [dataInicio, setDataInicio] = useState<string>(() => {
    const d = new Date();
    d.setDate(1); // Primeiro dia do mês atual
    return d.toISOString().split('T')[0];
  });
  const [dataFim, setDataFim] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [contaSelecionada, setContaSelecionada] = useState<string>('todas');
  const [unidadeNegocio, setUnidadeNegocio] = useState<UnidadeNegocioFiltro>('Todas');
  const [categoriaCusto, setCategoriaCusto] = useState<CategoriaCustoFiltro>('Todos');
  const [metodoTransacao, setMetodoTransacao] = useState<MetodoTransacaoFiltro>('Todos');
  const [tipoPessoa, setTipoPessoa] = useState<TipoPessoaFiltro>('Todos');
  const [buscaTexto, setBuscaTexto] = useState<string>('');
  
  // Modal de Detalhe de Transação
  const [transacaoDetalhe, setTransacaoDetalhe] = useState<ItemExtrato360 | null>(null);

  // Mapa rápido de veículos por ID ou Placa
  const veiculosMap = useMemo(() => {
    const map = new Map<string, Veiculo>();
    veiculos.forEach((v) => {
      map.set(v.id, v);
      if (v.placa) map.set(v.placa.toUpperCase(), v);
    });
    return map;
  }, [veiculos]);

  // Lista de nomes de fornecedores em caixa baixa
  const fornecedoresNomes = useMemo(() => {
    return fornecedores.map(f => (f.nome || '').toLowerCase().trim());
  }, [fornecedores]);

  // Lista de sócios
  const sociosNomes = useMemo(() => {
    return usuarios
      .filter(u => u.role === 'admin' || (u.cargo && u.cargo.toLowerCase().includes('sócio')) || (u.cargo && u.cargo.toLowerCase().includes('socio')))
      .map(u => (u.displayName || u.email || '').toLowerCase().trim());
  }, [usuarios]);

  // 2. CONSOLIDAÇÃO UNIFICADA DO EXTRATO 360º (MovimentacoesConta + DespesaFixa)
  const itensExtratoUnificados = useMemo(() => {
    const itens: ItemExtrato360[] = [];
    const despesasFixasRegistradasIds = new Set<string>();

    // A) Processar Movimentações Bancárias da coleção MovimentacoesConta
    (movimentacoesContas || []).forEach((mov) => {
      if (!mov) return;
      if (mov.despesaFixaId) {
        despesasFixasRegistradasIds.add(mov.despesaFixaId);
      }

      // Detectar se é transferência interna ou com terceiro
      const isTransf =
        mov.tipo === 'Transferência' ||
        Boolean(mov.transferenciaId) ||
        (mov.categoria && mov.categoria.toLowerCase().includes('transferência'));
      const isTransfInterna = isTransf && !mov.isTerceiro;

      let direcaoTransf: 'debito' | 'credito' | undefined = undefined;
      let cOrigemNome = mov.contaOrigemNome;
      let cDestinoNome = mov.contaDestinoNome || mov.terceiroNome;

      if (isTransf) {
        const descLowerMov = (mov.descricao || '').toLowerCase();
        const catLowerMov = (mov.categoria || '').toLowerCase();
        const motivoLowerMov = (mov.motivo || '').toLowerCase();

        if (mov.contaOrigemId && mov.contaId === mov.contaOrigemId) {
          direcaoTransf = 'debito';
        } else if (mov.contaDestinoId && mov.contaId === mov.contaDestinoId) {
          direcaoTransf = 'credito';
        } else if (
          catLowerMov.includes('enviada') ||
          catLowerMov.includes('terceiro') ||
          descLowerMov.includes('enviada') ||
          descLowerMov.includes('débito') ||
          descLowerMov.includes('debito') ||
          motivoLowerMov.includes('débito') ||
          motivoLowerMov.includes('debito') ||
          mov.tipo === 'Despesa'
        ) {
          direcaoTransf = 'debito';
        } else {
          direcaoTransf = 'credito';
        }

        if (!cOrigemNome) {
          if (direcaoTransf === 'debito') {
            cOrigemNome = mov.contaNome;
          } else if (mov.pagadorRecebedor) {
            cOrigemNome = mov.pagadorRecebedor;
          }
        }

        if (!cDestinoNome) {
          if (direcaoTransf === 'credito') {
            cDestinoNome = mov.contaNome;
          } else if (mov.pagadorRecebedor || mov.terceiroNome) {
            cDestinoNome = mov.pagadorRecebedor || mov.terceiroNome;
          }
        }
      }

      let tipoFinal: 'Entrada' | 'Saída' | 'Transferência' = 'Saída';
      if (isTransf) {
        tipoFinal = 'Transferência';
      } else if (mov.tipo === 'Receita' || mov.categoria === 'Transferência Recebida') {
        tipoFinal = 'Entrada';
      } else {
        tipoFinal = 'Saída';
      }

      // Normalizar Unidade de Negócio
      let unidade: 'Vendas/Repasse' | 'Locação/Frota' | 'Institucional/Loja' = 'Institucional/Loja';
      const descLower = (mov.descricao || '').toLowerCase();
      const catLower = (mov.categoria || '').toLowerCase();
      const placaRef = mov.placa ? mov.placa.toUpperCase() : '';
      const veiculoRef = placaRef ? veiculosMap.get(placaRef) : (mov.veiculoId ? veiculosMap.get(mov.veiculoId) : undefined);

      if (
        mov.destinoRoteamento === 'veiculo_locacao' ||
        descLower.includes('locação') ||
        descLower.includes('locacao') ||
        descLower.includes('aluguel de carro') ||
        descLower.includes('caução') ||
        descLower.includes('caucao') ||
        descLower.includes('motorista') ||
        catLower.includes('locação') ||
        catLower.includes('aluguel') ||
        veiculoRef?.tipoOperacao === 'Locacao'
      ) {
        unidade = 'Locação/Frota';
      } else if (
        mov.destinoRoteamento === 'veiculo_estoque' ||
        mov.vinculoVendaId ||
        placaRef ||
        descLower.includes('venda') ||
        descLower.includes('veículo') ||
        descLower.includes('veiculo') ||
        descLower.includes('chassi') ||
        descLower.includes('tac') ||
        descLower.includes('comissão') ||
        descLower.includes('recondicionamento') ||
        descLower.includes('oficina') ||
        descLower.includes('funilaria') ||
        descLower.includes('peças') ||
        catLower.includes('venda') ||
        catLower.includes('comissão') ||
        catLower.includes('peças') ||
        veiculoRef?.tipoOperacao === 'Venda' ||
        veiculoRef?.tipoOperacao === 'Misto'
      ) {
        unidade = 'Vendas/Repasse';
      } else {
        unidade = 'Institucional/Loja';
      }

      // Normalizar Categoria de Custo (Fixos vs Variáveis vs Neutro)
      let catCusto: 'Fixos' | 'Variáveis' | 'Neutro' = 'Neutro';
      if (tipoFinal === 'Transferência') {
        catCusto = 'Neutro';
      } else if (mov.tipoCusto === 'Fixo') {
        catCusto = 'Fixos';
      } else if (mov.tipoCusto === 'Variável') {
        catCusto = 'Variáveis';
      } else if (mov.tipoCusto === 'Neutro') {
        catCusto = 'Neutro';
      } else if (tipoFinal === 'Saída') {
        if (
          unidade === 'Institucional/Loja' ||
          mov.destinoRoteamento === 'despesa_fixa' ||
          catLower.includes('fixa') ||
          catLower.includes('folha') ||
          catLower.includes('pró-labore') ||
          catLower.includes('pro-labore') ||
          catLower.includes('aluguel loja') ||
          catLower.includes('contabilidade') ||
          catLower.includes('imposto') ||
          catLower.includes('sistema')
        ) {
          catCusto = 'Fixos';
        } else {
          catCusto = 'Variáveis';
        }
      } else {
        catCusto = 'Neutro';
      }

      // Normalizar Método de Transação
      let metodo: 'PIX' | 'Financiamento/TAC' | 'Dinheiro' | 'TED' | 'Outro' = 'Outro';
      const fpLower = (mov.formaPagamento || '').toLowerCase();
      if (fpLower.includes('pix') || descLower.includes('pix')) {
        metodo = 'PIX';
      } else if (
        fpLower.includes('financiamento') ||
        fpLower.includes('tac') ||
        descLower.includes('financiamento') ||
        descLower.includes('retorno tac') ||
        descLower.includes('banco pan') ||
        descLower.includes('safra') ||
        descLower.includes('bv') ||
        descLower.includes('santander')
      ) {
        metodo = 'Financiamento/TAC';
      } else if (fpLower.includes('dinheiro') || fpLower.includes('espécie') || fpLower.includes('caixa')) {
        metodo = 'Dinheiro';
      } else if (fpLower.includes('ted') || fpLower.includes('doc') || fpLower.includes('transferência')) {
        metodo = 'TED';
      }

      // Normalizar Tipo de Pessoa
      let pessoa: 'Pessoa Física' | 'Fornecedor/Parceiro' | 'Sócio' = 'Pessoa Física';
      const pagRecLower = (mov.pagadorRecebedor || mov.clienteNome || mov.terceiroNome || '').toLowerCase();

      if (
        mov.destinoRoteamento === 'retirada_socio' ||
        catLower.includes('pró-labore') ||
        catLower.includes('pro-labore') ||
        catLower.includes('sócio') ||
        catLower.includes('socio') ||
        descLower.includes('sócio') ||
        descLower.includes('pró-labore') ||
        sociosNomes.some(s => pagRecLower.includes(s) && s.length > 2)
      ) {
        pessoa = 'Sócio';
      } else if (
        fornecedoresNomes.some(f => pagRecLower.includes(f) && f.length > 2) ||
        catLower.includes('oficina') ||
        catLower.includes('peças') ||
        catLower.includes('cartório') ||
        catLower.includes('posto') ||
        catLower.includes('funilaria') ||
        descLower.includes('posto') ||
        descLower.includes('oficina') ||
        descLower.includes('mecânica')
      ) {
        pessoa = 'Fornecedor/Parceiro';
      } else {
        pessoa = 'Pessoa Física';
      }

      // Referência Visual
      let ref = '';
      if (isTransf) {
        if (direcaoTransf === 'debito') {
          ref = cDestinoNome ? `➔ Para: ${cDestinoNome}` : 'Transferência Enviada';
        } else {
          ref = cOrigemNome ? `⬅ De: ${cOrigemNome}` : 'Transferência Recebida';
        }
      } else if (placaRef) {
        ref = `Placa ${placaRef}`;
      } else if (mov.pagadorRecebedor) {
        ref = mov.pagadorRecebedor;
      } else if (mov.clienteNome) {
        ref = mov.clienteNome;
      } else if (mov.terceiroNome) {
        ref = `Terceiro: ${mov.terceiroNome}`;
      } else if (mov.comprovanteNumero) {
        ref = `Doc: ${mov.comprovanteNumero}`;
      } else {
        ref = 'Loja AutoGestor';
      }

      itens.push({
        id: mov.id,
        origem: 'movimentacao_bancaria',
        data: mov.data || (mov.createdAt ? mov.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]),
        contaId: mov.contaId,
        contaNome: mov.contaNome || 'Conta Bancária',
        tipo: tipoFinal,
        unidadeNegocio: unidade,
        categoriaCusto: catCusto,
        metodoTransacao: metodo,
        tipoPessoa: pessoa,
        descricao: mov.descricao || mov.motivo || 'Movimentação Bancária',
        referencia: ref,
        valor: Number(mov.valor) || 0,
        categoria: mov.categoria || 'Geral',
        pagadorRecebedor: mov.pagadorRecebedor || mov.clienteNome || mov.terceiroNome,
        isTransferenciaInterna: isTransfInterna,
        direcaoTransferencia: direcaoTransf,
        contaOrigemNome: cOrigemNome,
        contaDestinoNome: cDestinoNome,
        terceiroNome: mov.terceiroNome,
        statusPagamento: 'Efetivado',
        movimentacaoOriginal: mov,
      });
    });

    // B) Processar Despesas Fixas que ainda não foram integradas como movimentação
    (despesasFixas || []).forEach((df) => {
      if (!df) return;
      // Se já constar no extrato bancário via despesaFixaId, ignorar duplicidade
      if (despesasFixasRegistradasIds.has(df.id)) return;

      const dataRef = df.dataPagamento || df.dataVencimento || (df.mesReferencia ? `${df.mesReferencia}-10` : new Date().toISOString().split('T')[0]);

      let metodo: 'PIX' | 'Financiamento/TAC' | 'Dinheiro' | 'TED' | 'Outro' = 'Outro';
      const fpLower = (df.formaPagamento || '').toLowerCase();
      if (fpLower.includes('pix')) metodo = 'PIX';
      else if (fpLower.includes('dinheiro')) metodo = 'Dinheiro';
      else if (fpLower.includes('ted') || fpLower.includes('transferência')) metodo = 'TED';

      let pessoa: 'Pessoa Física' | 'Fornecedor/Parceiro' | 'Sócio' = 'Fornecedor/Parceiro';
      const catLower = (df.categoria || '').toLowerCase();
      if (
        catLower.includes('pró-labore') ||
        catLower.includes('pro-labore') ||
        catLower.includes('sócio') ||
        catLower.includes('distribuição de lucros')
      ) {
        pessoa = 'Sócio';
      } else if (df.beneficiarioNome) {
        pessoa = 'Pessoa Física';
      }

      itens.push({
        id: `df_${df.id}`,
        origem: 'despesa_fixa',
        data: dataRef,
        contaId: df.contaBancariaId,
        contaNome: df.contaBancariaNome || 'Conta Principal Loja',
        tipo: 'Saída',
        unidadeNegocio: 'Institucional/Loja',
        categoriaCusto: 'Fixos',
        metodoTransacao: metodo,
        tipoPessoa: pessoa,
        descricao: `${df.categoria}: ${df.descricao || 'Despesa Fixa'}`,
        referencia: df.fornecedorNome || df.beneficiarioNome || 'Estrutura Loja',
        valor: Number(df.valor) || 0,
        categoria: df.categoria || 'Despesa Fixa',
        pagadorRecebedor: df.fornecedorNome || df.beneficiarioNome,
        isTransferenciaInterna: false,
        statusPagamento: df.status,
        despesaFixaOriginal: df,
      });
    });

    // Ordenar por data decrescente (mais recente primeiro)
    return itens.sort((a, b) => new Date(b?.data || 0).getTime() - new Date(a?.data || 0).getTime());
  }, [movimentacoesContas, despesasFixas, veiculosMap, fornecedoresNomes, sociosNomes]);

  // 3. APLICAÇÃO DOS FILTROS MÚLTIPLOS PROFUNDOS
  const itensFiltrados = useMemo(() => {
    return itensExtratoUnificados.filter((item) => {
      if (!item) return false;
      // Filtro de Período de Data
      if (dataInicio && item.data && item.data < dataInicio) return false;
      if (dataFim && item.data && item.data > dataFim) return false;

      // Filtro de Conta Bancária
      if (contaSelecionada !== 'todas' && item.contaId !== contaSelecionada) {
        return false;
      }

      // Filtro de Unidade de Negócio
      if (unidadeNegocio !== 'Todas' && item.unidadeNegocio !== unidadeNegocio) {
        return false;
      }

      // Filtro de Categoria de Custo (Fixos vs Variáveis)
      if (categoriaCusto !== 'Todos') {
        if (item.tipo === 'Saída' && item.categoriaCusto !== categoriaCusto) {
          return false;
        }
      }

      // Filtro de Método de Transação
      if (metodoTransacao !== 'Todos' && item.metodoTransacao !== metodoTransacao) {
        return false;
      }

      // Filtro de Tipo de Pessoa
      if (tipoPessoa !== 'Todos' && item.tipoPessoa !== tipoPessoa) {
        return false;
      }

      // Busca Textual Livre (Descrição, Referência, Conta, Pagador/Recebedor, Categoria)
      if (buscaTexto.trim()) {
        const q = buscaTexto.trim().toLowerCase();
        const matchDesc = item.descricao.toLowerCase().includes(q);
        const matchRef = (item.referencia || '').toLowerCase().includes(q);
        const matchConta = item.contaNome.toLowerCase().includes(q);
        const matchPagRec = (item.pagadorRecebedor || '').toLowerCase().includes(q);
        const matchCat = item.categoria.toLowerCase().includes(q);
        if (!matchDesc && !matchRef && !matchConta && !matchPagRec && !matchCat) {
          return false;
        }
      }

      return true;
    });
  }, [
    itensExtratoUnificados,
    dataInicio,
    dataFim,
    contaSelecionada,
    unidadeNegocio,
    categoriaCusto,
    metodoTransacao,
    tipoPessoa,
    buscaTexto,
  ]);

  // 4. INTELIGÊNCIA DE AGRUPAMENTO (4 CARDS DINÂMICOS RESUMO)
  const cardsResumo = useMemo(() => {
    let totalEntradas = 0;
    let entradasPix = 0;
    let entradasFinanciamento = 0;

    let totalSaidas = 0;
    let saidasFixas = 0;
    let saidasVariaveis = 0;
    let qtdSaidas = 0;

    let saidasVendas = 0;
    let qtdSaidasVendas = 0;
    let saidasLocacao = 0;
    let qtdSaidasLocacao = 0;
    let saidasLoja = 0;
    let qtdSaidasLoja = 0;

    let totalTransferenciasInternas = 0;
    let qtdTransferenciasInternas = 0;

    itensFiltrados.forEach((item) => {
      // Se for transferência interna, isolar no card de transferências (sem impactar saldo DRE)
      if (item.isTransferenciaInterna) {
        // Se todas as contas estiverem selecionadas, contamos apenas o lado de débito para não duplicar o volume movimentado
        if (contaSelecionada === 'todas') {
          if (item.direcaoTransferencia === 'debito') {
            totalTransferenciasInternas += item.valor;
            qtdTransferenciasInternas++;
          }
        } else {
          totalTransferenciasInternas += item.valor;
          qtdTransferenciasInternas++;
        }
        return;
      }

      const isEntradaOp = item.tipo === 'Entrada' || (item.tipo === 'Transferência' && item.direcaoTransferencia === 'credito');
      const isSaidaOp = item.tipo === 'Saída' || (item.tipo === 'Transferência' && item.direcaoTransferencia === 'debito');

      if (isEntradaOp) {
        totalEntradas += item.valor;
        if (item.metodoTransacao === 'PIX') {
          entradasPix += item.valor;
        } else if (item.metodoTransacao === 'Financiamento/TAC') {
          entradasFinanciamento += item.valor;
        }
      } else if (isSaidaOp) {
        totalSaidas += item.valor;
        qtdSaidas++;
        if (item.categoriaCusto === 'Fixos') {
          saidasFixas += item.valor;
        } else if (item.categoriaCusto === 'Variáveis') {
          saidasVariaveis += item.valor;
        }

        if (item.unidadeNegocio === 'Vendas/Repasse') {
          saidasVendas += item.valor;
          qtdSaidasVendas++;
        } else if (item.unidadeNegocio === 'Locação/Frota') {
          saidasLocacao += item.valor;
          qtdSaidasLocacao++;
        } else {
          saidasLoja += item.valor;
          qtdSaidasLoja++;
        }
      }
    });

    // Percentuais de Entradas
    const pctEntradasPix = totalEntradas > 0 ? (entradasPix / totalEntradas) * 100 : 0;
    const pctEntradasFinanciamento = totalEntradas > 0 ? (entradasFinanciamento / totalEntradas) * 100 : 0;

    // Percentuais de Saídas
    const pctSaidasFixas = totalSaidas > 0 ? (saidasFixas / totalSaidas) * 100 : 0;
    const pctSaidasVariaveis = totalSaidas > 0 ? (saidasVariaveis / totalSaidas) * 100 : 0;

    // Saldo Líquido do Período
    const saldoPeriodo = totalEntradas - totalSaidas;

    // Ticket Médio de Saída
    const ticketMedioGeral = qtdSaidas > 0 ? totalSaidas / qtdSaidas : 0;
    const ticketMedioVendas = qtdSaidasVendas > 0 ? saidasVendas / qtdSaidasVendas : 0;
    const ticketMedioLocacao = qtdSaidasLocacao > 0 ? saidasLocacao / qtdSaidasLocacao : 0;
    const ticketMedioLoja = qtdSaidasLoja > 0 ? saidasLoja / qtdSaidasLoja : 0;

    return {
      totalEntradas,
      entradasPix,
      entradasFinanciamento,
      pctEntradasPix,
      pctEntradasFinanciamento,
      totalSaidas,
      saidasFixas,
      saidasVariaveis,
      pctSaidasFixas,
      pctSaidasVariaveis,
      qtdSaidas,
      ticketMedioGeral,
      ticketMedioVendas,
      ticketMedioLocacao,
      ticketMedioLoja,
      saldoPeriodo,
      totalTransferenciasInternas,
      qtdTransferenciasInternas,
    };
  }, [itensFiltrados]);

  // Presets Rápidos de Data
  const aplicarPresetData = (preset: 'hoje' | '7d' | 'mes_atual' | 'mes_anterior' | '90d' | 'ano' | 'tudo') => {
    const hoje = new Date();
    const hojeStr = hoje.toISOString().split('T')[0];

    if (preset === 'hoje') {
      setDataInicio(hojeStr);
      setDataFim(hojeStr);
    } else if (preset === '7d') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setDataInicio(d.toISOString().split('T')[0]);
      setDataFim(hojeStr);
    } else if (preset === 'mes_atual') {
      const d = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      setDataInicio(d.toISOString().split('T')[0]);
      setDataFim(hojeStr);
    } else if (preset === 'mes_anterior') {
      const dInicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
      const dFim = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
      setDataInicio(dInicio.toISOString().split('T')[0]);
      setDataFim(dFim.toISOString().split('T')[0]);
    } else if (preset === '90d') {
      const d = new Date();
      d.setDate(d.getDate() - 90);
      setDataInicio(d.toISOString().split('T')[0]);
      setDataFim(hojeStr);
    } else if (preset === 'ano') {
      const d = new Date(hoje.getFullYear(), 0, 1);
      setDataInicio(d.toISOString().split('T')[0]);
      setDataFim(hojeStr);
    } else if (preset === 'tudo') {
      setDataInicio('');
      setDataFim('');
    }
  };

  const limparFiltros = () => {
    aplicarPresetData('mes_atual');
    setContaSelecionada('todas');
    setUnidadeNegocio('Todas');
    setCategoriaCusto('Todos');
    setMetodoTransacao('Todos');
    setTipoPessoa('Todos');
    setBuscaTexto('');
  };

  const [exportMenuAberto, setExportMenuAberto] = useState(false);
  const [statusExportacao, setStatusExportacao] = useState<string | null>(null);

  const getExportOptions = (): ExtratoExportOptions => {
    const nomeConta = contaSelecionada === 'todas'
      ? 'Todas as Contas'
      : (contasBancarias.find(c => c.id === contaSelecionada)?.nome || 'Conta Selecionada');

    return {
      dataInicio: dataInicio || 'Início',
      dataFim: dataFim || 'Hoje',
      contaNome: nomeConta,
      unidadeNegocio,
      categoriaCusto,
      metodoTransacao,
      tipoPessoa,
      buscaTexto,
      totalEntradas: cardsResumo.totalEntradas,
      totalSaidas: cardsResumo.totalSaidas,
      saldoPeriodo: cardsResumo.saldoPeriodo,
      totalTransferenciasInternas: cardsResumo.totalTransferenciasInternas,
      qtdTransferenciasInternas: cardsResumo.qtdTransferenciasInternas,
      empresaNome: 'AutoGestor - Gestão Automotiva e Frotas',
    };
  };

  const handleExportarExcel = () => {
    try {
      setStatusExportacao('Gerando arquivo Excel (.xlsx)...');
      exportarExtratoExcel(itensFiltrados, getExportOptions());
      setTimeout(() => {
        setStatusExportacao('Planilha Excel (.xlsx) baixada com sucesso!');
        setTimeout(() => setStatusExportacao(null), 3500);
      }, 500);
    } catch (err) {
      console.error('Erro ao exportar Excel:', err);
      setStatusExportacao('Erro ao exportar Excel. Tente novamente.');
      setTimeout(() => setStatusExportacao(null), 3500);
    }
  };

  const handleExportarPdf = () => {
    try {
      setStatusExportacao('Gerando relatório corporativo em PDF...');
      exportarExtratoPdf(itensFiltrados, getExportOptions());
      setTimeout(() => {
        setStatusExportacao('Relatório PDF baixado com sucesso!');
        setTimeout(() => setStatusExportacao(null), 3500);
      }, 500);
    } catch (err) {
      console.error('Erro ao exportar PDF:', err);
      setStatusExportacao('Erro ao exportar PDF. Tente novamente.');
      setTimeout(() => setStatusExportacao(null), 3500);
    }
  };

  const handleExportarCsv = () => {
    try {
      setStatusExportacao('Gerando planilha CSV (Excel pt-BR)...');
      exportarExtratoCsv(itensFiltrados, getExportOptions());
      setTimeout(() => {
        setStatusExportacao('Planilha CSV baixada com sucesso!');
        setTimeout(() => setStatusExportacao(null), 3500);
      }, 500);
    } catch (err) {
      console.error('Erro ao exportar CSV:', err);
      setStatusExportacao('Erro ao exportar CSV. Tente novamente.');
      setTimeout(() => setStatusExportacao(null), 3500);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Toast Informativo de Exportação */}
      {statusExportacao && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-xs shadow-2xl flex items-center gap-2.5 animate-slideUp border border-indigo-400/40">
          <CheckCircle2 size={16} className="text-emerald-300 animate-pulse" />
          <span>{statusExportacao}</span>
        </div>
      )}

      {/* ================= HEADER DO MÓDULO EXTRATO 360º ================= */}
      <div className="bg-[#111116] rounded-3xl border border-white/5 p-5 sm:p-6 shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/25">
              <Layers size={22} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                Extrato 360º & Movimentações Avançadas
                <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Tempo Real
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Auditoria bancária e conciliação cruzada entre Contas da Loja, Chassis em Estoque, Locação e Despesas Fixas.
              </p>
            </div>
          </div>
        </div>

        {/* Botões de Ação de Alto Nível */}
        <div className="flex items-center gap-2.5 flex-wrap w-full lg:w-auto">
          <button
            onClick={() => onOpenLancamentoExpresso()}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-600 hover:via-orange-600 hover:to-rose-600 text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-rose-500/25 cursor-pointer transition active:scale-95"
            title="Abrir Lançamento Expresso Bancário"
          >
            <Zap size={15} className="animate-pulse" />
            <span>Lançamento Expresso</span>
          </button>

          <button
            onClick={onOpenNovaTransferencia}
            className="px-3.5 py-2.5 rounded-2xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-bold flex items-center gap-2 cursor-pointer transition"
          >
            <ArrowLeftRight size={15} />
            <span>Nova Transferência</span>
          </button>

          {/* Menu Dropdown de Exportação Completa (Excel, PDF, CSV, Print) */}
          <div className="relative">
            <button
              onClick={() => setExportMenuAberto(!exportMenuAberto)}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-indigo-600/25 cursor-pointer transition active:scale-95 border border-indigo-400/30"
              title="Opções de exportação do extrato filtrado"
            >
              <Download size={14} />
              <span>Exportar Extrato</span>
              <ChevronDown size={13} className={`transition-transform duration-200 ${exportMenuAberto ? 'rotate-180' : ''}`} />
            </button>

            {exportMenuAberto && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setExportMenuAberto(false)}
                />
                <div className="absolute right-0 mt-2 w-72 rounded-3xl bg-[#16171f] border border-white/10 shadow-2xl p-2 z-50 space-y-1 animate-scaleIn">
                  <div className="px-3 py-2.5 border-b border-white/5">
                    <p className="text-xs font-black text-white flex items-center gap-1.5">
                      <FileText size={13} className="text-indigo-400" /> Exportação de Dados
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Exporta <strong>{itensFiltrados.length} lançamentos</strong> segundo os filtros ativos na tela.
                    </p>
                  </div>

                  {/* Excel (.xlsx) */}
                  <button
                    onClick={() => {
                      setExportMenuAberto(false);
                      handleExportarExcel();
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-2xl hover:bg-white/5 text-xs text-slate-200 hover:text-white flex items-center gap-3 transition cursor-pointer group"
                  >
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition border border-emerald-500/30">
                      <FileSpreadsheet size={16} />
                    </div>
                    <div>
                      <p className="font-bold text-white text-xs flex items-center gap-1.5">
                        Planilha Excel (.xlsx)
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">Nativo</span>
                      </p>
                      <p className="text-[10px] text-slate-400">Abas de lançamentos + resumo executivo</p>
                    </div>
                  </button>

                  {/* PDF (.pdf) */}
                  <button
                    onClick={() => {
                      setExportMenuAberto(false);
                      handleExportarPdf();
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-2xl hover:bg-white/5 text-xs text-slate-200 hover:text-white flex items-center gap-3 transition cursor-pointer group"
                  >
                    <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition border border-rose-500/30">
                      <FileText size={16} />
                    </div>
                    <div>
                      <p className="font-bold text-white text-xs flex items-center gap-1.5">
                        Relatório em PDF (.pdf)
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">A4 Paisagem</span>
                      </p>
                      <p className="text-[10px] text-slate-400">Layout para auditoria e conciliação</p>
                    </div>
                  </button>

                  {/* CSV */}
                  <button
                    onClick={() => {
                      setExportMenuAberto(false);
                      handleExportarCsv();
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-2xl hover:bg-white/5 text-xs text-slate-200 hover:text-white flex items-center gap-3 transition cursor-pointer group"
                  >
                    <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition border border-blue-500/30">
                      <FileText size={16} />
                    </div>
                    <div>
                      <p className="font-bold text-white text-xs">Planilha CSV (;)</p>
                      <p className="text-[10px] text-slate-400">Compatível nativamente com Excel pt-BR</p>
                    </div>
                  </button>

                  {/* Imprimir A4 */}
                  <button
                    onClick={() => {
                      setExportMenuAberto(false);
                      handlePrint();
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-2xl hover:bg-white/5 text-xs text-slate-200 hover:text-white flex items-center gap-3 transition cursor-pointer group border-t border-white/5"
                  >
                    <div className="w-8 h-8 rounded-xl bg-slate-500/20 text-slate-300 flex items-center justify-center shrink-0 group-hover:scale-110 transition border border-slate-500/30">
                      <Printer size={16} />
                    </div>
                    <div>
                      <p className="font-bold text-white text-xs">Imprimir A4 / Navegador</p>
                      <p className="text-[10px] text-slate-400">Impressão direta ou salvar em PDF</p>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ================= 1. PAINEL DE FILTROS MÚLTIPLOS PROFUNDOS ================= */}
      <div className="bg-[#111116] rounded-3xl border border-white/5 p-5 sm:p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={16} className="text-purple-400" />
            <h3 className="font-extrabold text-white text-sm">Filtros Avançados de Movimentação</h3>
            <span className="text-[11px] text-slate-400 bg-white/5 px-2 py-0.5 rounded-full">
              {itensFiltrados.length} encontrados
            </span>
          </div>

          {/* Atalhos Rápidos de Período */}
          <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
            <span className="text-slate-500 mr-1 hidden md:inline">Atalhos:</span>
            <button
              onClick={() => aplicarPresetData('hoje')}
              className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
            >
              Hoje
            </button>
            <button
              onClick={() => aplicarPresetData('7d')}
              className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
            >
              7 Dias
            </button>
            <button
              onClick={() => aplicarPresetData('mes_atual')}
              className="px-2 py-1 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold transition cursor-pointer"
            >
              Este Mês
            </button>
            <button
              onClick={() => aplicarPresetData('mes_anterior')}
              className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
            >
              Mês Anterior
            </button>
            <button
              onClick={() => aplicarPresetData('90d')}
              className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
            >
              90 Dias
            </button>
            <button
              onClick={() => aplicarPresetData('tudo')}
              className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
            >
              Tudo
            </button>
            <button
              onClick={limparFiltros}
              className="px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition cursor-pointer flex items-center gap-1 ml-1"
              title="Restaurar todos os filtros para o padrão"
            >
              <RotateCcw size={11} /> Limpar
            </button>
          </div>
        </div>

        {/* Grade de Controles de Filtros */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
          {/* Período: Início */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1 flex items-center gap-1">
              <Calendar size={12} className="text-purple-400" /> Data Início
            </label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:border-purple-500 outline-none cursor-pointer"
            />
          </div>

          {/* Período: Fim */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1 flex items-center gap-1">
              <Calendar size={12} className="text-purple-400" /> Data Fim
            </label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:border-purple-500 outline-none cursor-pointer"
            />
          </div>

          {/* Conta Bancária */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1 flex items-center gap-1">
              <Building2 size={12} className="text-purple-400" /> Conta Bancária / Caixa
            </label>
            <select
              value={contaSelecionada}
              onChange={(e) => setContaSelecionada(e.target.value)}
              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-slate-200 focus:border-purple-500 outline-none cursor-pointer"
            >
              <option value="todas">🏦 Todas as Contas e Caixas</option>
              {contasBancarias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome} ({formatCurrency(c.saldo)})
                </option>
              ))}
            </select>
          </div>

          {/* Unidade de Negócio */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1 flex items-center gap-1">
              <Car size={12} className="text-purple-400" /> Unidade de Negócio
            </label>
            <select
              value={unidadeNegocio}
              onChange={(e) => setUnidadeNegocio(e.target.value as UnidadeNegocioFiltro)}
              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-slate-200 focus:border-purple-500 outline-none cursor-pointer"
            >
              <option value="Todas">🌐 Todas as Unidades</option>
              <option value="Vendas/Repasse">🟢 Vendas / Repasse</option>
              <option value="Locação/Frota">🔵 Locação / Frota</option>
              <option value="Institucional/Loja">🟣 Institucional / Loja</option>
            </select>
          </div>

          {/* Categoria de Custo */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1 flex items-center gap-1">
              <Tag size={12} className="text-purple-400" /> Categoria de Custo
            </label>
            <select
              value={categoriaCusto}
              onChange={(e) => setCategoriaCusto(e.target.value as CategoriaCustoFiltro)}
              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-slate-200 focus:border-purple-500 outline-none cursor-pointer"
            >
              <option value="Todos">⚖️ Todos (Fixos e Variáveis)</option>
              <option value="Fixos">🏢 Apenas Custos Fixos</option>
              <option value="Variáveis">⚙️ Apenas Custos Variáveis</option>
            </select>
          </div>

          {/* Método de Transação */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1 flex items-center gap-1">
              <CreditCard size={12} className="text-purple-400" /> Método de Transação
            </label>
            <select
              value={metodoTransacao}
              onChange={(e) => setMetodoTransacao(e.target.value as MetodoTransacaoFiltro)}
              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-slate-200 focus:border-purple-500 outline-none cursor-pointer"
            >
              <option value="Todos">💳 Todos os Métodos</option>
              <option value="PIX">⚡ PIX</option>
              <option value="Financiamento/TAC">🏦 Financiamento / Retorno TAC</option>
              <option value="Dinheiro">💵 Dinheiro / Espécie</option>
              <option value="TED">📑 TED / Transferência</option>
            </select>
          </div>
        </div>

        {/* Linha Secundária: Tipo de Pessoa & Busca Rápida */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
          {/* Tipo de Pessoa */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1 flex items-center gap-1">
              <UserCheck size={12} className="text-purple-400" /> Tipo de Pessoa / Envolvido
            </label>
            <select
              value={tipoPessoa}
              onChange={(e) => setTipoPessoa(e.target.value as TipoPessoaFiltro)}
              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-slate-200 focus:border-purple-500 outline-none cursor-pointer"
            >
              <option value="Todos">👥 Todos os Tipos de Pessoa</option>
              <option value="Pessoa Física">👤 Pessoa Física (Clientes / Motoristas)</option>
              <option value="Fornecedor/Parceiro">🏭 Fornecedor / Parceiro</option>
              <option value="Sócio">👔 Sócio / Dono / Pró-labore</option>
            </select>
          </div>

          {/* Campo de Busca Rápida */}
          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold text-slate-400 mb-1 flex items-center gap-1">
              <Search size={12} className="text-purple-400" /> Busca Textual Inteligente
            </label>
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por placa (ex: ABC1D23), fornecedor, cliente, motivo ou categoria..."
                value={buscaTexto}
                onChange={(e) => setBuscaTexto(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-500 outline-none focus:border-purple-500"
              />
              {buscaTexto && (
                <button
                  onClick={() => setBuscaTexto('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ================= 2. INTELIGÊNCIA DE AGRUPAMENTO (4 CARDS DINÂMICOS RESUMO) ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CARD 1: TOTAL DE ENTRADAS */}
        <div className="bg-[#111116] rounded-3xl border border-white/5 p-5 relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total de Entradas</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <ArrowUpRight size={18} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-emerald-400 font-mono tracking-tight">
              {formatCurrencyDetailed(cardsResumo.totalEntradas)}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Receitas operacionais do período filtrado
            </p>
          </div>

          {/* Subdivisão: % PIX vs % Financiamento */}
          <div className="mt-4 pt-3 border-t border-white/5 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-300 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> PIX:
              </span>
              <span className="font-mono font-bold text-white">
                {formatCurrency(cardsResumo.entradasPix)} ({cardsResumo.pctEntradasPix.toFixed(1)}%)
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-300 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> Financiamento/TAC:
              </span>
              <span className="font-mono font-bold text-white">
                {formatCurrency(cardsResumo.entradasFinanciamento)} ({cardsResumo.pctEntradasFinanciamento.toFixed(1)}%)
              </span>
            </div>

            {/* Mini barra proporcional */}
            <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden flex">
              <div
                style={{ width: `${cardsResumo.pctEntradasPix}%` }}
                className="bg-emerald-400 h-full"
                title={`PIX: ${cardsResumo.pctEntradasPix.toFixed(1)}%`}
              />
              <div
                style={{ width: `${cardsResumo.pctEntradasFinanciamento}%` }}
                className="bg-blue-400 h-full"
                title={`Financiamento/TAC: ${cardsResumo.pctEntradasFinanciamento.toFixed(1)}%`}
              />
            </div>
          </div>
        </div>

        {/* CARD 2: TOTAL DE SAÍDAS */}
        <div className="bg-[#111116] rounded-3xl border border-white/5 p-5 relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total de Saídas</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <ArrowDownRight size={18} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-rose-400 font-mono tracking-tight">
              {formatCurrencyDetailed(cardsResumo.totalSaidas)}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Custos e despesas quitados no período
            </p>
          </div>

          {/* Subdivisão: % Custos Fixos vs % Custos Variáveis */}
          <div className="mt-4 pt-3 border-t border-white/5 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-300 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-purple-400 inline-block" /> Custos Fixos:
              </span>
              <span className="font-mono font-bold text-white">
                {formatCurrency(cardsResumo.saidasFixas)} ({cardsResumo.pctSaidasFixas.toFixed(1)}%)
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-300 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Custos Variáveis:
              </span>
              <span className="font-mono font-bold text-white">
                {formatCurrency(cardsResumo.saidasVariaveis)} ({cardsResumo.pctSaidasVariaveis.toFixed(1)}%)
              </span>
            </div>

            {/* Mini barra proporcional */}
            <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden flex">
              <div
                style={{ width: `${cardsResumo.pctSaidasFixas}%` }}
                className="bg-purple-400 h-full"
                title={`Fixos: ${cardsResumo.pctSaidasFixas.toFixed(1)}%`}
              />
              <div
                style={{ width: `${cardsResumo.pctSaidasVariaveis}%` }}
                className="bg-amber-400 h-full"
                title={`Variáveis: ${cardsResumo.pctSaidasVariaveis.toFixed(1)}%`}
              />
            </div>
          </div>
        </div>

        {/* CARD 3: SALDO DO PERÍODO FILTRADO */}
        <div className="bg-[#111116] rounded-3xl border border-white/5 p-5 relative overflow-hidden shadow-xl">
          <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl pointer-events-none ${
            cardsResumo.saldoPeriodo >= 0 ? 'bg-indigo-500/10' : 'bg-rose-500/10'
          }`} />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Saldo do Período</span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              cardsResumo.saldoPeriodo >= 0 ? 'bg-indigo-500/10 text-indigo-400' : 'bg-rose-500/10 text-rose-400'
            }`}>
              {cardsResumo.saldoPeriodo >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
            </div>
          </div>
          <div className="mt-3">
            <h3 className={`text-2xl font-black font-mono tracking-tight ${
              cardsResumo.saldoPeriodo >= 0 ? 'text-indigo-300' : 'text-rose-400'
            }`}>
              {cardsResumo.saldoPeriodo >= 0 ? '+' : ''}
              {formatCurrencyDetailed(cardsResumo.saldoPeriodo)}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                cardsResumo.saldoPeriodo >= 0 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}>
                {cardsResumo.saldoPeriodo >= 0 ? '✓ Superávit de Caixa' : '⚠️ Déficit de Caixa'}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
            <span>Eficiência do Caixa:</span>
            <span className="font-mono font-bold text-slate-200">
              {cardsResumo.totalEntradas > 0 
                ? `${((cardsResumo.saldoPeriodo / cardsResumo.totalEntradas) * 100).toFixed(1)}% de margem` 
                : '0.0%'}
            </span>
          </div>
        </div>

        {/* CARD 4: TICKET MÉDIO DE SAÍDA */}
        <div className="bg-[#111116] rounded-3xl border border-white/5 p-5 relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ticket Médio de Saída</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Scale size={18} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-amber-300 font-mono tracking-tight">
              {formatCurrencyDetailed(cardsResumo.ticketMedioGeral)}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Média por lançamento ({cardsResumo.qtdSaidas} pagamentos efetuados)
            </p>
          </div>

          {/* Subdivisão do Ticket Médio por Unidade */}
          <div className="mt-4 pt-3 border-t border-white/5 space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Vendas/Repasse:
              </span>
              <span className="font-mono font-bold text-slate-200">
                {formatCurrency(cardsResumo.ticketMedioVendas)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" /> Locação/Frota:
              </span>
              <span className="font-mono font-bold text-slate-200">
                {formatCurrency(cardsResumo.ticketMedioLocacao)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" /> Institucional/Loja:
              </span>
              <span className="font-mono font-bold text-slate-200">
                {formatCurrency(cardsResumo.ticketMedioLoja)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Banner de Transferências Internas (se houver no período) */}
      {cardsResumo.totalTransferenciasInternas > 0 && (
        <div className="bg-purple-950/20 border border-purple-500/20 rounded-2xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-purple-300 font-bold">
            <ArrowLeftRight size={16} className="shrink-0" />
            <span>Transferências entre Contas Internas no Período:</span>
            <span className="font-mono font-black text-white">{formatCurrency(cardsResumo.totalTransferenciasInternas)}</span>
            <span className="text-[11px] font-normal text-purple-400">({cardsResumo.qtdTransferenciasInternas} operações)</span>
          </div>
          <span className="text-[11px] text-slate-400">
            Impacto neutro no DRE (liquidez transferida internamente)
          </span>
        </div>
      )}

      {/* ================= 3. TABELA DE MOVIMENTAÇÕES AVANÇADA ================= */}
      <div className="bg-[#111116] rounded-3xl border border-white/5 p-5 sm:p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-purple-400" />
              <h3 className="font-extrabold text-white text-base">Livro Caixa & Extrato Detalhado</h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Visualização analítica unificada de cada débito, crédito e liquidação bancária.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs flex-wrap">
            <span className="text-slate-400">Total listado:</span>
            <span className="font-mono font-bold text-white bg-white/5 px-2.5 py-1 rounded-xl border border-white/10">
              {itensFiltrados.length} lançamentos
            </span>

            {/* Atalhos Rápidos de Exportação */}
            <div className="flex items-center gap-1.5 ml-1">
              <button
                onClick={handleExportarExcel}
                className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition shadow-sm"
                title="Exportar para Excel (.xlsx)"
              >
                <FileSpreadsheet size={13} />
                <span>.XLSX</span>
              </button>

              <button
                onClick={handleExportarPdf}
                className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition shadow-sm"
                title="Exportar para PDF (.pdf)"
              >
                <FileText size={13} />
                <span>.PDF</span>
              </button>

              <button
                onClick={handlePrint}
                className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-[11px] cursor-pointer transition"
                title="Imprimir"
              >
                <Printer size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* Tabela Responsiva */}
        {itensFiltrados.length === 0 ? (
          <div className="py-12 px-4 text-center rounded-2xl bg-black/20 border border-dashed border-white/10 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-white/5 text-slate-500 mx-auto flex items-center justify-center">
              <Search size={22} />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white">Nenhum lançamento encontrado para os filtros selecionados</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Tente ajustar o intervalo de datas, a conta bancária ou clique em "Limpar Filtros" para ver todas as movimentações.
              </p>
            </div>
            <button
              onClick={limparFiltros}
              className="px-3.5 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-bold transition cursor-pointer"
            >
              Restaurar Filtros Padrão
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/5">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#16171f] text-slate-400 uppercase font-semibold border-b border-white/5 text-[11px]">
                  <th className="py-3 px-3.5">Data</th>
                  <th className="py-3 px-3.5">Conta Envolvida</th>
                  <th className="py-3 px-3.5">Descrição / Referência</th>
                  <th className="py-3 px-3.5">Categoria</th>
                  <th className="py-3 px-3.5">Método</th>
                  <th className="py-3 px-3.5">Pessoa</th>
                  <th className="py-3 px-3.5 text-right">Valor</th>
                  <th className="py-3 px-3.5 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans">
                {itensFiltrados.map((item) => {
                  const isEntrada = item.tipo === 'Entrada';
                  const isSaida = item.tipo === 'Saída';
                  const isTransf = item.tipo === 'Transferência';
                  const isTransfDebito = isTransf && item.direcaoTransferencia === 'debito';
                  const isTransfCredito = isTransf && item.direcaoTransferencia === 'credito';

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-white/[0.02] transition cursor-pointer group"
                      onClick={() => setTransacaoDetalhe(item)}
                    >
                      {/* Data */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-slate-300 font-mono text-[11px]">
                        {item.data.includes('-') ? formatDate(item.data) : item.data}
                      </td>

                      {/* Conta Envolvida */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <Building2
                              size={13}
                              className={`shrink-0 ${
                                isTransf
                                  ? isTransfDebito
                                    ? 'text-rose-400'
                                    : 'text-emerald-400'
                                  : 'text-purple-400'
                              }`}
                            />
                            <span className="font-semibold text-slate-200">
                              {item.contaNome}
                            </span>
                            {isTransf && (
                              <span
                                className={`text-[9px] px-1.5 py-0.2 rounded font-bold border ${
                                  isTransfDebito
                                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                }`}
                              >
                                {isTransfDebito ? 'Débito' : 'Crédito'}
                              </span>
                            )}
                          </div>
                          {isTransf && (
                            <div className="flex items-center gap-1 text-[10px]">
                              {isTransfDebito ? (
                                <>
                                  <span className="text-slate-400">Saiu p/:</span>
                                  <span
                                    className="text-purple-300 font-semibold truncate max-w-[130px]"
                                    title={item.contaDestinoNome || item.terceiroNome}
                                  >
                                    {item.contaDestinoNome || item.terceiroNome || 'Destino'}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span className="text-slate-400">Veio de:</span>
                                  <span
                                    className="text-purple-300 font-semibold truncate max-w-[130px]"
                                    title={item.contaOrigemNome}
                                  >
                                    {item.contaOrigemNome || 'Origem'}
                                  </span>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Descrição / Referência */}
                      <td className="py-3 px-3.5 max-w-xs md:max-w-md">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {isTransf && (
                              <span
                                className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                                  isTransfDebito
                                    ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                                    : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                }`}
                              >
                                <ArrowLeftRight size={10} />
                                {isTransfDebito ? 'Transferência Enviada' : 'Transferência Recebida'}
                              </span>
                            )}
                            <p className="font-medium text-white truncate text-xs" title={item.descricao}>
                              {item.descricao}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-slate-400">
                            {isTransf ? (
                              <span className="font-mono bg-purple-500/10 text-purple-200 px-1.5 py-0.2 rounded border border-purple-500/20 text-[10px] font-semibold flex items-center gap-1">
                                {item.contaOrigemNome || (isTransfDebito ? item.contaNome : 'Origem')}
                                <ArrowRight size={10} className="text-purple-400" />
                                {item.contaDestinoNome || item.terceiroNome || (isTransfCredito ? item.contaNome : 'Destino')}
                              </span>
                            ) : (
                              item.referencia && (
                                <span className="font-mono bg-white/5 px-1.5 py-0.2 rounded border border-white/5 text-slate-300 font-semibold">
                                  {item.referencia}
                                </span>
                              )
                            )}
                            <span>• {item.categoria}</span>
                          </div>
                        </div>
                      </td>

                      {/* Categoria */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-slate-200 text-xs">
                            {item.categoria || item.categoriaCusto || 'Operacional'}
                          </span>
                          {item.unidadeNegocio && (
                            <span className="text-[10px] text-slate-400">
                              {item.unidadeNegocio}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Método de Transação */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          item.metodoTransacao === 'PIX'
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                            : item.metodoTransacao === 'Financiamento/TAC'
                            ? 'bg-blue-500/10 text-blue-300 border-blue-500/20'
                            : item.metodoTransacao === 'Dinheiro'
                            ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                            : 'bg-white/5 text-slate-300 border-white/10'
                        }`}>
                          {item.metodoTransacao}
                        </span>
                      </td>

                      {/* Tipo de Pessoa */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-slate-400 text-[11px]">
                        {item.tipoPessoa === 'Sócio' && (
                          <span className="text-amber-400 font-semibold flex items-center gap-1">
                            👔 Sócio
                          </span>
                        )}
                        {item.tipoPessoa === 'Fornecedor/Parceiro' && (
                          <span className="text-purple-300 font-medium flex items-center gap-1">
                            🏭 Fornecedor
                          </span>
                        )}
                        {item.tipoPessoa === 'Pessoa Física' && (
                          <span className="text-slate-300">
                            👤 Físico
                          </span>
                        )}
                      </td>

                      {/* Tipo e Valor */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-right font-mono">
                        {isTransf ? (
                          isTransfDebito ? (
                            <span className="font-bold text-xs inline-flex items-center justify-end gap-1.5 text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-xl border border-rose-500/20">
                              <ArrowDownRight size={13} className="text-rose-400 shrink-0" />
                              <ArrowLeftRight size={12} className="text-rose-300 shrink-0" title="Transferência entre contas (Saída/Débito)" />
                              <span>- {formatCurrencyDetailed(item.valor)}</span>
                            </span>
                          ) : (
                            <span className="font-bold text-xs inline-flex items-center justify-end gap-1.5 text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/20">
                              <ArrowUpRight size={13} className="text-emerald-400 shrink-0" />
                              <ArrowLeftRight size={12} className="text-emerald-300 shrink-0" title="Transferência entre contas (Entrada/Crédito)" />
                              <span>+ {formatCurrencyDetailed(item.valor)}</span>
                            </span>
                          )
                        ) : isEntrada ? (
                          <span className="font-bold text-xs inline-flex items-center justify-end gap-1 text-emerald-400">
                            <ArrowUpRight size={13} className="shrink-0" />
                            <span>+ {formatCurrencyDetailed(item.valor)}</span>
                          </span>
                        ) : (
                          <span className="font-bold text-xs inline-flex items-center justify-end gap-1 text-rose-400">
                            <ArrowDownRight size={13} className="shrink-0" />
                            <span>- {formatCurrencyDetailed(item.valor)}</span>
                          </span>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              const movToEdit = item.movimentacaoOriginal || {
                                id: item.id,
                                contaId: item.contaId || '',
                                tipo: item.tipo === 'Entrada' ? 'Receita' : 'Despesa',
                                valor: item.valor,
                                data: item.data,
                                descricao: item.descricao,
                                categoria: item.categoria,
                                formaPagamento: (item.metodoTransacao as any) || 'PIX / Transf.',
                                pagadorRecebedor: item.pagadorRecebedor,
                                despesaFixaId: item.despesaFixaOriginal?.id,
                                destinoRoteamento: 'despesa_fixa',
                                createdAt: new Date().toISOString(),
                              };
                              onOpenLancamentoExpresso(movToEdit);
                            }}
                            className="px-2.5 py-1 rounded-lg text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 transition cursor-pointer flex items-center gap-1.5 text-xs font-bold shadow-sm"
                            title="Editar este lançamento"
                          >
                            <Edit3 size={13} />
                            <span>Editar</span>
                          </button>

                          <button
                            onClick={() => setTransacaoDetalhe(item)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                            title="Ver Detalhes do Lançamento"
                          >
                            <ChevronRight size={15} />
                          </button>

                          {item.movimentacaoOriginal && onDeleteMovimentacao && (
                            <button
                              onClick={() => {
                                if (window.confirm('Deseja excluir este registro de movimentação do extrato?')) {
                                  onDeleteMovimentacao(item.id);
                                }
                              }}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                              title="Excluir do Extrato"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================= MODAL DE DETALHES DA TRANSAÇÃO ================= */}
      {transacaoDetalhe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-[#16171f] border border-white/10 rounded-3xl w-full max-w-lg p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                  transacaoDetalhe.tipo === 'Entrada'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : transacaoDetalhe.tipo === 'Saída'
                    ? 'bg-rose-500/20 text-rose-400'
                    : transacaoDetalhe.direcaoTransferencia === 'debito'
                    ? 'bg-rose-500/20 text-rose-400'
                    : 'bg-emerald-500/20 text-emerald-400'
                }`}>
                  {transacaoDetalhe.tipo === 'Entrada' && <ArrowUpRight size={20} />}
                  {transacaoDetalhe.tipo === 'Saída' && <ArrowDownRight size={20} />}
                  {transacaoDetalhe.tipo === 'Transferência' && (
                    <div className="flex items-center -space-x-1">
                      {transacaoDetalhe.direcaoTransferencia === 'debito' ? (
                        <ArrowDownRight size={16} className="text-rose-400" />
                      ) : (
                        <ArrowUpRight size={16} className="text-emerald-400" />
                      )}
                      <ArrowLeftRight size={14} className="text-purple-300" />
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-white flex items-center gap-2">
                    Detalhes do Lançamento
                    {transacaoDetalhe.tipo === 'Transferência' && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                        transacaoDetalhe.direcaoTransferencia === 'debito'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      }`}>
                        {transacaoDetalhe.direcaoTransferencia === 'debito' ? 'Transferência (Débito)' : 'Transferência (Crédito)'}
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-slate-400">ID: {transacaoDetalhe.id}</p>
                </div>
              </div>
              <button
                onClick={() => setTransacaoDetalhe(null)}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Valor da Operação:</span>
                <span className={`text-xl font-black font-mono ${
                  transacaoDetalhe.tipo === 'Entrada'
                    ? 'text-emerald-400'
                    : transacaoDetalhe.tipo === 'Saída'
                    ? 'text-rose-400'
                    : transacaoDetalhe.direcaoTransferencia === 'debito'
                    ? 'text-rose-400'
                    : 'text-emerald-400'
                }`}>
                  {transacaoDetalhe.tipo === 'Entrada'
                    ? '+'
                    : transacaoDetalhe.tipo === 'Saída'
                    ? '-'
                    : transacaoDetalhe.direcaoTransferencia === 'debito'
                    ? '-'
                    : '+'}{' '}
                  {formatCurrencyDetailed(transacaoDetalhe.valor)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Data de Liquidação:</span>
                <span className="font-mono text-white font-bold">{formatDate(transacaoDetalhe.data)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Conta Bancária:</span>
                <span className="text-white font-bold">{transacaoDetalhe.contaNome}</span>
              </div>
              {transacaoDetalhe.tipo === 'Transferência' && (
                <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
                  <span className="text-slate-400">
                    {transacaoDetalhe.direcaoTransferencia === 'debito' ? 'Conta Destino:' : 'Conta Origem:'}
                  </span>
                  <span className="text-purple-300 font-bold">
                    {transacaoDetalhe.direcaoTransferencia === 'debito'
                      ? (transacaoDetalhe.contaDestinoNome || transacaoDetalhe.terceiroNome || 'Destino')
                      : (transacaoDetalhe.contaOrigemNome || 'Origem')}
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                <span className="text-[11px] text-slate-500 uppercase font-bold">Unidade de Negócio</span>
                <p className="font-bold text-slate-200">{transacaoDetalhe.unidadeNegocio}</p>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                <span className="text-[11px] text-slate-500 uppercase font-bold">Categoria de Custo</span>
                <p className="font-bold text-slate-200">{transacaoDetalhe.categoriaCusto}</p>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                <span className="text-[11px] text-slate-500 uppercase font-bold">Método de Transação</span>
                <p className="font-bold text-slate-200">{transacaoDetalhe.metodoTransacao}</p>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                <span className="text-[11px] text-slate-500 uppercase font-bold">Tipo de Pessoa</span>
                <p className="font-bold text-slate-200">{transacaoDetalhe.tipoPessoa}</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1 text-xs">
              <span className="text-[11px] text-slate-500 uppercase font-bold">Descrição Completa</span>
              <p className="text-slate-200">{transacaoDetalhe.descricao}</p>
              {transacaoDetalhe.referencia && (
                <p className="text-slate-400 text-[11px] pt-1">
                  Referência: <strong className="text-slate-300">{transacaoDetalhe.referencia}</strong>
                </p>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/5">
              <button
                onClick={() => {
                  const movToEdit = transacaoDetalhe.movimentacaoOriginal || {
                    id: transacaoDetalhe.id,
                    contaId: transacaoDetalhe.contaId || '',
                    tipo: transacaoDetalhe.tipo === 'Entrada' ? 'Receita' : 'Despesa',
                    valor: transacaoDetalhe.valor,
                    data: transacaoDetalhe.data,
                    descricao: transacaoDetalhe.descricao,
                    categoria: transacaoDetalhe.categoria,
                    formaPagamento: (transacaoDetalhe.metodoTransacao as any) || 'PIX / Transf.',
                    pagadorRecebedor: transacaoDetalhe.pagadorRecebedor,
                    despesaFixaId: transacaoDetalhe.despesaFixaOriginal?.id,
                    destinoRoteamento: 'despesa_fixa',
                    createdAt: new Date().toISOString(),
                  };
                  setTransacaoDetalhe(null);
                  onOpenLancamentoExpresso(movToEdit);
                }}
                className="px-4 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold cursor-pointer transition flex items-center gap-1.5 shadow-sm"
              >
                <Edit3 size={14} />
                Editar Lançamento
              </button>

              <button
                onClick={() => setTransacaoDetalhe(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-bold cursor-pointer transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
