import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Search,
  Filter,
  Calendar,
  DollarSign,
  ArrowDownRight,
  ArrowUpRight,
  Wallet,
  Car,
  User,
  ShieldCheck,
  Tag,
  Receipt,
  FileSpreadsheet,
  Layers,
  ChevronRight,
  Sparkles,
  RefreshCw,
  Eye,
  Check,
} from 'lucide-react';
import {
  VendaVeiculo,
  Veiculo,
  BancoParceiro,
  ContaBancariaCaixa,
  Usuario,
} from '../types';

export interface TituloContaReceber {
  id: string;
  vendaId: string;
  venda: VendaVeiculo;
  tipoTitulo: 'financiamento' | 'tac';
  tipoLabel: string;
  bancoNome: string;
  veiculoId: string;
  placa: string;
  modelo: string;
  compradorNome: string;
  compradorCpf: string;
  vendedorNome?: string;
  dataVenda: string;
  valor: number;
  status: 'Pendente' | 'Recebido';
  dataLiquidacao?: string;
  contaBancariaId?: string;
  contaBancariaNome?: string;
  formaLiquidacao?: string;
  observacoes?: string;
}

interface ContasReceberViewProps {
  vendas: VendaVeiculo[];
  veiculos: Veiculo[];
  bancosParceiros?: BancoParceiro[];
  contasBancarias?: ContaBancariaCaixa[];
  currentUser?: Usuario | null;
  onOpenDossie: (veiculo: Veiculo) => void;
  onProcessarLiquidacao: (params: {
    venda: VendaVeiculo;
    tipoTitulo: 'financiamento' | 'tac';
    dataLiquidacao: string;
    contaBancariaId: string;
    valorLiquidado: number;
    formaLiquidacao?: string;
    observacoes?: string;
  }) => Promise<void>;
}

export const ContasReceberView: React.FC<ContasReceberViewProps> = ({
  vendas,
  veiculos,
  bancosParceiros = [],
  contasBancarias = [],
  currentUser,
  onOpenDossie,
  onProcessarLiquidacao,
}) => {
  // Estados de Filtros e Busca
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'Todos' | 'Pendente' | 'Recebido'>('Pendente');
  const [filtroTipo, setFiltroTipo] = useState<'Todos' | 'financiamento' | 'tac'>('Todos');
  const [filtroBanco, setFiltroBanco] = useState<string>('Todos');
  const [filtroPlaca, setFiltroPlaca] = useState<string>('Todas');
  const [filtroPeriodo, setFiltroPeriodo] = useState<'todos' | 'mes_atual' | 'ultimos_30' | 'ano_atual' | 'personalizado'>('todos');
  const [dataInicio, setDataInicio] = useState<string>('');
  const [dataFim, setDataFim] = useState<string>('');
  const [ordenacao, setOrdenacao] = useState<'data_desc' | 'data_asc' | 'valor_desc' | 'valor_asc'>('data_desc');

  // Estado do Modal de Baixa / Liquidação
  const [modalBaixaOpen, setModalBaixaOpen] = useState(false);
  const [selectedTituloParaBaixa, setSelectedTituloParaBaixa] = useState<TituloContaReceber | null>(null);
  const [dataLiquidacaoBaixa, setDataLiquidacaoBaixa] = useState<string>(new Date().toISOString().split('T')[0]);
  const [contaBancariaIdBaixa, setContaBancariaIdBaixa] = useState<string>('');
  const [formaLiquidacaoBaixa, setFormaLiquidacaoBaixa] = useState<string>('TED/PIX Financeira');
  const [valorLiquidadoBaixa, setValorLiquidadoBaixa] = useState<number>(0);
  const [obsLiquidacaoBaixa, setObsLiquidacaoBaixa] = useState<string>('');
  const [isProcessingBaixa, setIsProcessingBaixa] = useState(false);

  // 1. Extrair todos os títulos a receber das vendas (Financiamento Principal e Retorno TAC)
  const todosTitulos: TituloContaReceber[] = useMemo(() => {
    const lista: TituloContaReceber[] = [];

    vendas.forEach((v) => {
      const fin = v.financiamentoDetalhes;
      const bancoNomeStr =
        fin?.bancoParceiroNome ||
        (typeof fin?.bancoParceiro === 'string' ? fin.bancoParceiro : '') ||
        'Banco Parceiro';

      // 1. Título de Financiamento Principal (Repasse do Banco à Loja)
      const valorFinanciado = Number(fin?.valorFinanciado || 0);
      if (valorFinanciado > 0 || v.formaPagamento === 'Financiamento') {
        const isRecebido = fin?.statusLiquidacaoFinanciamento === 'Recebido';
        lista.push({
          id: `rec_${v.id}_fin`,
          vendaId: v.id,
          venda: v,
          tipoTitulo: 'financiamento',
          tipoLabel: 'Repasse de Financiamento',
          bancoNome: bancoNomeStr,
          veiculoId: v.veiculoId,
          placa: v.placa || 'Sem Placa',
          modelo: v.modelo || 'Veículo',
          compradorNome: v.compradorNome || 'Cliente',
          compradorCpf: v.compradorCpf || '',
          vendedorNome: v.vendedorNome,
          dataVenda: v.dataVenda || '',
          valor: valorFinanciado,
          status: isRecebido ? 'Recebido' : 'Pendente',
          dataLiquidacao: fin?.dataLiquidacaoFinanciamento,
          contaBancariaId: fin?.contaBancariaLiquidacaoId,
          contaBancariaNome: fin?.contaBancariaLiquidacaoNome,
          formaLiquidacao: fin?.formaLiquidacaoFinanciamento || 'TED/PIX Financeira',
          observacoes: fin?.observacoesLiquidacao,
        });
      }

      // 2. Título de Retorno / TAC da Financeira à Loja
      const valorTac = Number(fin?.retornoComissaoBanco || v.retornoFinanciamentoTac || 0);
      if (valorTac > 0) {
        const isRecebidoTac = fin?.statusLiquidacaoTac === 'Recebido';
        lista.push({
          id: `rec_${v.id}_tac`,
          vendaId: v.id,
          venda: v,
          tipoTitulo: 'tac',
          tipoLabel: 'Retorno / TAC da Financeira',
          bancoNome: bancoNomeStr,
          veiculoId: v.veiculoId,
          placa: v.placa || 'Sem Placa',
          modelo: v.modelo || 'Veículo',
          compradorNome: v.compradorNome || 'Cliente',
          compradorCpf: v.compradorCpf || '',
          vendedorNome: v.vendedorNome,
          dataVenda: v.dataVenda || '',
          valor: valorTac,
          status: isRecebidoTac ? 'Recebido' : 'Pendente',
          dataLiquidacao: fin?.dataLiquidacaoTac,
          contaBancariaId: fin?.contaBancariaTacId,
          contaBancariaNome: fin?.contaBancariaTacNome,
          formaLiquidacao: fin?.formaLiquidacaoTac || 'TED/PIX Financeira',
          observacoes: fin?.observacoesLiquidacao,
        });
      }
    });

    return lista;
  }, [vendas]);

  // Lista de bancos disponíveis para filtro
  const listaBancosDisponiveis = useMemo(() => {
    const set = new Set<string>();
    bancosParceiros.forEach((b) => {
      if (b.nomeFantasia) set.add(b.nomeFantasia);
      if (b.razaoSocial) set.add(b.razaoSocial);
    });
    todosTitulos.forEach((t) => {
      if (t.bancoNome && t.bancoNome.trim()) set.add(t.bancoNome.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [bancosParceiros, todosTitulos]);

  // Lista de placas únicas disponíveis para filtro
  const listaPlacasDisponiveis = useMemo(() => {
    const map = new Map<string, string>();
    todosTitulos.forEach((t) => {
      if (t.placa) {
        map.set(t.placa, `${t.placa} - ${t.modelo}`);
      }
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [todosTitulos]);

  // KPIs de Contas a Receber
  const kpis = useMemo(() => {
    const hoje = new Date();
    const mesAtualPrefix = hoje.toISOString().substring(0, 7);

    let totalPendente = 0;
    let qtdPendente = 0;
    let totalFinanciamentoPendente = 0;
    let qtdFinanciamentoPendente = 0;
    let totalTacPendente = 0;
    let qtdTacPendente = 0;
    let totalLiquidadoMes = 0;
    let qtdLiquidadoMes = 0;

    todosTitulos.forEach((t) => {
      const val = Number(t.valor || 0);
      if (t.status === 'Pendente') {
        totalPendente += val;
        qtdPendente++;

        if (t.tipoTitulo === 'financiamento') {
          totalFinanciamentoPendente += val;
          qtdFinanciamentoPendente++;
        } else if (t.tipoTitulo === 'tac') {
          totalTacPendente += val;
          qtdTacPendente++;
        }
      } else {
        const dataLiq = t.dataLiquidacao || t.dataVenda;
        if (dataLiq && dataLiq.startsWith(mesAtualPrefix)) {
          totalLiquidadoMes += val;
          qtdLiquidadoMes++;
        }
      }
    });

    return {
      totalPendente,
      qtdPendente,
      totalFinanciamentoPendente,
      qtdFinanciamentoPendente,
      totalTacPendente,
      qtdTacPendente,
      totalLiquidadoMes,
      qtdLiquidadoMes,
    };
  }, [todosTitulos]);

  // Filtragem e Ordenação
  const titulosFiltrados = useMemo(() => {
    const hoje = new Date();
    const mesAtualPrefix = hoje.toISOString().substring(0, 7);
    const anoAtualPrefix = hoje.getFullYear().toString();
    const trintaDiasAtras = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000);

    return todosTitulos.filter((item) => {
      // 1. Filtro Status
      if (filtroStatus !== 'Todos' && item.status !== filtroStatus) {
        return false;
      }

      // 2. Filtro Tipo de Título
      if (filtroTipo !== 'Todos' && item.tipoTitulo !== filtroTipo) {
        return false;
      }

      // 3. Filtro Banco
      if (filtroBanco !== 'Todos' && item.bancoNome.toLowerCase() !== filtroBanco.toLowerCase()) {
        return false;
      }

      // 4. Filtro Placa
      if (filtroPlaca !== 'Todas') {
        if (item.placa.toUpperCase().trim() !== filtroPlaca.toUpperCase().trim()) {
          return false;
        }
      }

      // 5. Filtro Data / Período
      const dataRef = item.dataLiquidacao || item.dataVenda || '';
      if (filtroPeriodo === 'mes_atual') {
        if (!dataRef.startsWith(mesAtualPrefix)) return false;
      } else if (filtroPeriodo === 'ano_atual') {
        if (!dataRef.startsWith(anoAtualPrefix)) return false;
      } else if (filtroPeriodo === 'ultimos_30') {
        if (!dataRef || new Date(dataRef) < trintaDiasAtras) return false;
      } else if (filtroPeriodo === 'personalizado' || dataInicio || dataFim) {
        if (dataInicio && dataRef < dataInicio) return false;
        if (dataFim && dataRef > dataFim) return false;
      }

      // Busca Textual Geral
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchPlaca = item.placa.toLowerCase().includes(term);
        const matchModelo = item.modelo.toLowerCase().includes(term);
        const matchCliente = item.compradorNome.toLowerCase().includes(term);
        const matchCpf = item.compradorCpf.toLowerCase().includes(term);
        const matchVendedor = item.vendedorNome?.toLowerCase().includes(term);
        const matchBanco = item.bancoNome.toLowerCase().includes(term);

        if (!matchPlaca && !matchModelo && !matchCliente && !matchCpf && !matchVendedor && !matchBanco) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (ordenacao === 'data_desc') {
        const dateA = new Date(a.dataVenda || '').getTime();
        const dateB = new Date(b.dataVenda || '').getTime();
        return dateB - dateA;
      }
      if (ordenacao === 'data_asc') {
        const dateA = new Date(a.dataVenda || '').getTime();
        const dateB = new Date(b.dataVenda || '').getTime();
        return dateA - dateB;
      }
      if (ordenacao === 'valor_desc') {
        return (b.valor || 0) - (a.valor || 0);
      }
      if (ordenacao === 'valor_asc') {
        return (a.valor || 0) - (b.valor || 0);
      }
      return 0;
    });
  }, [
    todosTitulos,
    filtroStatus,
    filtroTipo,
    filtroBanco,
    filtroPlaca,
    filtroPeriodo,
    dataInicio,
    dataFim,
    searchTerm,
    ordenacao,
  ]);

  const hasFiltrosAtivos =
    searchTerm !== '' ||
    filtroStatus !== 'Pendente' ||
    filtroTipo !== 'Todos' ||
    filtroBanco !== 'Todos' ||
    filtroPlaca !== 'Todas' ||
    filtroPeriodo !== 'todos' ||
    dataInicio !== '' ||
    dataFim !== '';

  const handleLimparFiltros = () => {
    setSearchTerm('');
    setFiltroStatus('Todos');
    setFiltroTipo('Todos');
    setFiltroBanco('Todos');
    setFiltroPlaca('Todas');
    setFiltroPeriodo('todos');
    setDataInicio('');
    setDataFim('');
  };

  // Abrir Modal de Baixa de Título
  const handleOpenBaixa = (item: TituloContaReceber) => {
    setSelectedTituloParaBaixa(item);
    setDataLiquidacaoBaixa(new Date().toISOString().split('T')[0]);
    setFormaLiquidacaoBaixa('TED/PIX Financeira');
    // Pre-selecionar primeira conta bancária disponível
    setContaBancariaIdBaixa(contasBancarias.length > 0 ? contasBancarias[0].id : '');
    setValorLiquidadoBaixa(item.valor);
    setObsLiquidacaoBaixa('');
    setModalBaixaOpen(true);
  };

  // Submissão da Liquidação
  const handleConfirmBaixa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTituloParaBaixa) return;
    if (!contaBancariaIdBaixa) {
      alert('Selecione uma conta bancária de destino para creditar o valor recebido.');
      return;
    }
    if (valorLiquidadoBaixa <= 0) {
      alert('O valor a liquidar deve ser maior que zero.');
      return;
    }

    setIsProcessingBaixa(true);
    try {
      await onProcessarLiquidacao({
        venda: selectedTituloParaBaixa.venda,
        tipoTitulo: selectedTituloParaBaixa.tipoTitulo,
        dataLiquidacao: dataLiquidacaoBaixa,
        contaBancariaId: contaBancariaIdBaixa,
        valorLiquidado: valorLiquidadoBaixa,
        formaLiquidacao: formaLiquidacaoBaixa,
        observacoes: obsLiquidacaoBaixa,
      });

      setModalBaixaOpen(false);
      setSelectedTituloParaBaixa(null);
    } catch (err) {
      console.error('Erro ao efetivar liquidação de recebível:', err);
      alert('Ocorreu um erro ao liquidar o título a receber. Tente novamente.');
    } finally {
      setIsProcessingBaixa(false);
    }
  };

  const findVeiculoByIdOrPlaca = (veiculoId: string, placa: string) => {
    return (
      veiculos.find((v) => v.id === veiculoId) ||
      veiculos.find((v) => v.placa === placa) || {
        id: veiculoId,
        placa,
        modelo: 'Veículo',
        marca: '',
        ano: 2024,
        chassi: '',
        valorCompra: 0,
        precoVenda: 0,
        status: 'Vendido' as any,
      }
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 1. Header Principal com Ações e Explicação */}
      <div className="bg-[#111116] p-5 sm:p-6 rounded-3xl border border-white/5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <TrendingUp size={22} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                Contas a Receber & Liquidações
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Financiamentos & TAC
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Controle de repasses bancários e comissões TAC de financeiras com baixa automática e crédito em conta.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="px-4 py-2 rounded-2xl bg-black/40 border border-white/10 text-xs flex items-center gap-2 text-slate-300">
            <Wallet size={16} className="text-emerald-400" />
            <span>Disponível em Bancos:</span>
            <strong className="text-white font-mono font-black">
              R$ {contasBancarias.reduce((acc, c) => acc + (c.saldo || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </strong>
          </div>
        </div>
      </div>

      {/* 2. Grid de KPIs Financeiros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total a Receber Pendente */}
        <div className="bg-[#16171f] p-5 rounded-2xl border border-amber-500/30 relative overflow-hidden group shadow-lg shadow-amber-950/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
              Total Pendente a Receber
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Clock size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono tracking-tight">
              R$ {kpis.totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-400 mt-1 font-medium">
              <strong>{kpis.qtdPendente}</strong> repasse{kpis.qtdPendente !== 1 ? 's' : ''} aguardando liberação
            </p>
          </div>
        </div>

        {/* Repasses de Financiamentos */}
        <div className="bg-[#16171f] p-5 rounded-2xl border border-blue-500/30 relative overflow-hidden group shadow-lg shadow-blue-950/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-300 uppercase tracking-wider">
              Financiamentos dos Bancos
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Building2 size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-blue-400 font-mono tracking-tight">
              R$ {kpis.totalFinanciamentoPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-400 mt-1 font-medium">
              <strong>{kpis.qtdFinanciamentoPendente}</strong> contrato{kpis.qtdFinanciamentoPendente !== 1 ? 's' : ''} de crédito
            </p>
          </div>
        </div>

        {/* Retornos e TACs de Financeiras */}
        <div className="bg-[#16171f] p-5 rounded-2xl border border-purple-500/30 relative overflow-hidden group shadow-lg shadow-purple-950/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">
              Retornos / TAC a Receber
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <ShieldCheck size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-purple-400 font-mono tracking-tight">
              R$ {kpis.totalTacPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-400 mt-1 font-medium">
              <strong>{kpis.qtdTacPendente}</strong> bônus TAC da loja
            </p>
          </div>
        </div>

        {/* Liquidado no Mês Atual */}
        <div className="bg-[#16171f] p-5 rounded-2xl border border-emerald-500/30 relative overflow-hidden group shadow-lg shadow-emerald-950/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
              Liquidado no Mês Atual
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono tracking-tight">
              R$ {kpis.totalLiquidadoMes.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-400 mt-1 font-medium">
              <strong>{kpis.qtdLiquidadoMes}</strong> título{kpis.qtdLiquidadoMes !== 1 ? 's' : ''} creditado{kpis.qtdLiquidadoMes !== 1 ? 's' : ''} em conta
            </p>
          </div>
        </div>
      </div>

      {/* 3. Barra de Filtros Avançados */}
      <div className="bg-[#111116] p-4 sm:p-5 rounded-3xl border border-white/5 space-y-4">
        {/* Linha Superior: Busca e 4 Seletores Principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Busca Textual */}
          <div className="relative">
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 tracking-wider">
              Busca Rápida
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Placa, modelo, cliente, CPF, banco..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#16171f] border border-white/10 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* 1. Filtro Status */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 tracking-wider">
              📌 Status de Recebimento
            </label>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value as any)}
              className="w-full py-2 px-3 rounded-xl bg-[#16171f] border border-white/10 text-xs font-bold text-slate-200 outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="Pendente">⏳ Apenas Pendentes (A Receber)</option>
              <option value="Recebido">✓ Apenas Liquidados (Creditados)</option>
              <option value="Todos">📊 Todos os Títulos (Histórico)</option>
            </select>
          </div>

          {/* 2. Filtro Tipo de Título */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 tracking-wider">
              🏷️ Tipo de Título
            </label>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value as any)}
              className="w-full py-2 px-3 rounded-xl bg-[#16171f] border border-white/10 text-xs font-semibold text-slate-200 outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="Todos">Todos os Tipos</option>
              <option value="financiamento">🏦 Repasse de Financiamento</option>
              <option value="tac">🎁 Retorno / TAC da Financeira</option>
            </select>
          </div>

          {/* 3. Filtro Banco Financiador */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 tracking-wider">
              🏢 Banco Parceiro
            </label>
            <select
              value={filtroBanco}
              onChange={(e) => setFiltroBanco(e.target.value)}
              className="w-full py-2 px-3 rounded-xl bg-[#16171f] border border-white/10 text-xs font-semibold text-slate-200 outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="Todos">Todos os Bancos ({listaBancosDisponiveis.length})</option>
              {listaBancosDisponiveis.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Filtro Placa */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 tracking-wider">
              🚗 Placa / Veículo
            </label>
            <select
              value={filtroPlaca}
              onChange={(e) => setFiltroPlaca(e.target.value)}
              className="w-full py-2 px-3 rounded-xl bg-[#16171f] border border-white/10 text-xs font-bold text-slate-200 outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="Todas">Todas as Placas ({listaPlacasDisponiveis.length})</option>
              {listaPlacasDisponiveis.map(([placa, label]) => (
                <option key={placa} value={placa}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Linha Inferior: Filtro de Data e Ordenação */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-3 border-t border-white/5 text-xs">
          {/* Períodos Rápidos e Inputs de Data */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="font-bold text-slate-400 flex items-center gap-1">
              <Calendar size={14} className="text-emerald-400" /> Data / Período:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: 'todos', label: 'Todos' },
                { id: 'mes_atual', label: 'Mês Atual' },
                { id: 'ultimos_30', label: 'Últimos 30 Dias' },
                { id: 'ano_atual', label: 'Ano Vigente' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setFiltroPeriodo(p.id as any);
                    setDataInicio('');
                    setDataFim('');
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    filtroPeriodo === p.id && !dataInicio && !dataFim
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                      : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Inputs de Range de Data Customizada */}
            <div className="flex items-center gap-1.5 bg-[#16171f] px-2.5 py-1 rounded-xl border border-white/10">
              <span className="text-[11px] text-slate-400 font-medium">De:</span>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => {
                  setDataInicio(e.target.value);
                  setFiltroPeriodo('personalizado');
                }}
                className="bg-transparent text-white text-xs outline-none cursor-pointer"
              />
              <span className="text-[11px] text-slate-400 font-medium ml-1">Até:</span>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => {
                  setDataFim(e.target.value);
                  setFiltroPeriodo('personalizado');
                }}
                className="bg-transparent text-white text-xs outline-none cursor-pointer"
              />
            </div>

            {/* Botão Limpar Filtros */}
            {hasFiltrosAtivos && (
              <button
                type="button"
                onClick={handleLimparFiltros}
                className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold transition flex items-center gap-1 border border-rose-500/30 cursor-pointer"
                title="Limpar filtros"
              >
                ✕ Limpar Filtros
              </button>
            )}
          </div>

          {/* Ordenação e Contagem */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-xs font-medium">Ordem:</span>
              <select
                value={ordenacao}
                onChange={(e) => setOrdenacao(e.target.value as any)}
                className="py-1 px-2.5 rounded-lg bg-[#16171f] border border-white/10 text-xs font-semibold text-slate-200 outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="data_desc">Data Venda (Mais recente)</option>
                <option value="data_asc">Data Venda (Mais antiga)</option>
                <option value="valor_desc">Valor (Maior para menor)</option>
                <option value="valor_asc">Valor (Menor para maior)</option>
              </select>
            </div>

            <div className="text-xs text-slate-400 font-medium pl-2 border-l border-white/10">
              Exibindo <strong className="text-white font-mono">{titulosFiltrados.length}</strong> título{titulosFiltrados.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Tabela de Títulos a Receber */}
      <div className="bg-[#111116] rounded-3xl border border-white/5 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#16171f] text-slate-400 font-extrabold uppercase tracking-wider border-b border-white/10 text-[11px]">
                <th className="py-4 px-4">Status / Liquidação</th>
                <th className="py-4 px-4">Tipo de Recebível</th>
                <th className="py-4 px-4">Veículo & Placa</th>
                <th className="py-4 px-4">Cliente / Vendedor</th>
                <th className="py-4 px-4">Banco Financiador</th>
                <th className="py-4 px-4">Data Contrato</th>
                <th className="py-4 px-4 text-right">Valor do Título</th>
                <th className="py-4 px-4 text-center">Ações de Baixa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              {titulosFiltrados.length > 0 ? (
                titulosFiltrados.map((item) => {
                  const isPendente = item.status === 'Pendente';
                  const valorNum = Number(item.valor || 0);

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-white/[0.02] transition group"
                    >
                      {/* Status / Quitação */}
                      <td className="py-3.5 px-4">
                        {isPendente ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                            Aguardando Repasse
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 size={12} />
                              Liquidado / Creditado
                            </div>
                            {item.dataLiquidacao && (
                              <p className="text-[10px] text-slate-400 font-medium">
                                Pago em {new Date(item.dataLiquidacao).toLocaleDateString('pt-BR')}
                              </p>
                            )}
                            {item.contaBancariaNome && (
                              <p className="text-[10px] text-emerald-400 font-semibold truncate max-w-[140px]">
                                {item.contaBancariaNome}
                              </p>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Tipo de Título */}
                      <td className="py-3.5 px-4">
                        {item.tipoTitulo === 'financiamento' ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0">
                              <Building2 size={13} />
                            </div>
                            <div>
                              <p className="font-bold text-white text-xs leading-tight">
                                Repasse Financiamento
                              </p>
                              <p className="text-[10px] text-slate-400">
                                Liberação Mesa de Crédito
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <div className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center flex-shrink-0">
                              <ShieldCheck size={13} />
                            </div>
                            <div>
                              <p className="font-bold text-purple-300 text-xs leading-tight">
                                Retorno TAC / Bônus
                              </p>
                              <p className="text-[10px] text-slate-400">
                                Comissão Financeira Loja
                              </p>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Veículo & Placa */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const veicObj = findVeiculoByIdOrPlaca(item.veiculoId, item.placa);
                              onOpenDossie(veicObj);
                            }}
                            className="font-mono font-black text-xs px-2 py-0.5 rounded-lg bg-black/50 text-white border border-white/15 hover:border-emerald-400 hover:text-emerald-400 transition cursor-pointer"
                            title="Abrir Dossiê do Veículo"
                          >
                            {item.placa}
                          </button>
                          <div className="truncate max-w-[150px]">
                            <p className="font-bold text-slate-200 text-xs truncate">
                              {item.modelo}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Cliente / Vendedor */}
                      <td className="py-3.5 px-4">
                        <div>
                          <p className="font-bold text-slate-200 text-xs truncate max-w-[140px]">
                            {item.compradorNome}
                          </p>
                          {item.vendedorNome && (
                            <p className="text-[10px] text-slate-400 truncate max-w-[140px]">
                              Vend: {item.vendedorNome}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Banco Financiador */}
                      <td className="py-3.5 px-4">
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 border border-white/10 font-bold text-xs text-slate-200">
                          <Building2 size={12} className="text-blue-400" />
                          <span>{item.bancoNome}</span>
                        </div>
                      </td>

                      {/* Data Contrato */}
                      <td className="py-3.5 px-4 text-slate-400 font-mono text-xs">
                        {item.dataVenda
                          ? new Date(item.dataVenda).toLocaleDateString('pt-BR')
                          : '-'}
                      </td>

                      {/* Valor do Título */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="font-mono font-black text-sm text-white">
                          R$ {valorNum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </td>

                      {/* Ações de Baixa */}
                      <td className="py-3.5 px-4 text-center">
                        {isPendente ? (
                          <button
                            type="button"
                            onClick={() => handleOpenBaixa(item)}
                            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-md shadow-emerald-950/40 transition flex items-center justify-center gap-1.5 cursor-pointer mx-auto group-hover:scale-105"
                            title="Efetivar recebimento e creditar saldo em conta"
                          >
                            <Check size={14} />
                            <span>Dar Baixa</span>
                          </button>
                        ) : (
                          <div className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400/80 bg-emerald-500/5 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                            <CheckCircle2 size={13} />
                            <span>Creditado</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="max-w-xs mx-auto space-y-2">
                      <TrendingUp size={36} className="mx-auto text-slate-600" />
                      <p className="font-bold text-white text-sm">
                        Nenhum título a receber encontrado
                      </p>
                      <p className="text-xs text-slate-400">
                        {hasFiltrosAtivos
                          ? 'Tente ajustar os filtros ou redefinir a busca.'
                          : 'Quando uma venda for realizada com financiamento bancário ou retorno TAC, os títulos aparecerão aqui automaticamente.'}
                      </p>
                      {hasFiltrosAtivos && (
                        <button
                          type="button"
                          onClick={handleLimparFiltros}
                          className="mt-2 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-bold transition cursor-pointer"
                        >
                          Limpar Filtros
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Modal de Liquidação / Dar Baixa no Título a Receber */}
      {modalBaixaOpen && selectedTituloParaBaixa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#15161e] border border-emerald-500/30 rounded-3xl p-6 w-full max-w-lg shadow-2xl relative">
            {/* Header do Modal */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  <ArrowDownRight size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">
                    Liquidação de Título a Receber
                  </h3>
                  <p className="text-xs text-slate-400">
                    {selectedTituloParaBaixa.tipoLabel}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalBaixaOpen(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center text-sm cursor-pointer transition"
              >
                ✕
              </button>
            </div>

            {/* Resumo do Título */}
            <div className="my-4 p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Veículo:</span>
                <span className="font-bold text-white flex items-center gap-1.5">
                  <span className="font-mono bg-black/60 px-2 py-0.5 rounded border border-white/10">
                    {selectedTituloParaBaixa.placa}
                  </span>
                  {selectedTituloParaBaixa.modelo}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Cliente Comprador:</span>
                <span className="font-bold text-slate-200">
                  {selectedTituloParaBaixa.compradorNome}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Banco Financiador:</span>
                <span className="font-bold text-blue-400">
                  {selectedTituloParaBaixa.bancoNome}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-white/10">
                <span className="text-slate-300 font-bold">Valor Original do Título:</span>
                <span className="font-mono text-emerald-400 font-black text-base">
                  R$ {selectedTituloParaBaixa.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Formulário de Baixa */}
            <form onSubmit={handleConfirmBaixa} className="space-y-4">
              {/* Data da Liquidação */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  📅 Data Efetiva da Liquidação / Crédito *
                </label>
                <input
                  type="date"
                  required
                  value={dataLiquidacaoBaixa}
                  onChange={(e) => setDataLiquidacaoBaixa(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1c1d29] border border-white/10 text-xs text-white outline-none focus:border-emerald-500 cursor-pointer"
                />
              </div>

              {/* Conta Bancária de Destino */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  🏦 Conta Bancária de Destino (Onde o valor será creditado) *
                </label>
                <select
                  required
                  value={contaBancariaIdBaixa}
                  onChange={(e) => setContaBancariaIdBaixa(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1c1d29] border border-white/10 text-xs font-bold text-slate-200 outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="">Selecione a Conta Bancária de Destino...</option>
                  {contasBancarias.map((conta) => (
                    <option key={conta.id} value={conta.id}>
                      {conta.nome} ({conta.tipo}) — Saldo Atual: R${' '}
                      {(conta.saldo || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </option>
                  ))}
                </select>
              </div>

              {/* Forma de Liquidação & Valor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    💳 Forma de Recebimento
                  </label>
                  <select
                    value={formaLiquidacaoBaixa}
                    onChange={(e) => setFormaLiquidacaoBaixa(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#1c1d29] border border-white/10 text-xs text-slate-200 outline-none focus:border-emerald-500 cursor-pointer font-semibold"
                  >
                    <option value="TED/PIX Financeira">TED / PIX da Financeira</option>
                    <option value="Crédito em Conta Corrente">Crédito em Conta Corrente</option>
                    <option value="Boleto Bancário">Boleto Bancário</option>
                    <option value="Cheque Administrativo">Cheque Administrativo</option>
                    <option value="Outra Forma">Outra Forma</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    💰 Valor Efetivo Creditado (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={valorLiquidadoBaixa}
                    onChange={(e) => setValorLiquidadoBaixa(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#1c1d29] border border-emerald-500/40 text-xs text-emerald-300 font-mono font-black outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              {/* Observações / Protocolo */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  📝 Observações / Nº de Protocolo do Repasse (Opcional)
                </label>
                <input
                  type="text"
                  value={obsLiquidacaoBaixa}
                  onChange={(e) => setObsLiquidacaoBaixa(e.target.value)}
                  placeholder="Ex: Protocolo repasse mesa BV nº 928192..."
                  className="w-full px-3.5 py-2 rounded-xl bg-[#1c1d29] border border-white/10 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500"
                />
              </div>

              {/* Aviso Informativo */}
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300 flex items-start gap-2">
                <Sparkles size={16} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                <p>
                  Ao confirmar a baixa, o valor de <strong>R$ {valorLiquidadoBaixa.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> será somado ao saldo da conta selecionada e um lançamento de <strong>Entrada</strong> será gerado automaticamente no extrato.
                </p>
              </div>

              {/* Botões de Ação */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={isProcessingBaixa}
                  onClick={() => setModalBaixaOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isProcessingBaixa}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-lg shadow-emerald-950/50 flex items-center gap-2 cursor-pointer transition disabled:opacity-50"
                >
                  {isProcessingBaixa ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Processando Liquidação...</span>
                    </>
                  ) : (
                    <>
                      <Check size={15} />
                      <span>Confirmar Baixa & Creditar Saldo</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
