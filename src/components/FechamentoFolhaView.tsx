import React, { useState, useMemo } from 'react';
import {
  Users,
  DollarSign,
  Wallet,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Printer,
  Copy,
  Check,
  Building2,
  FileText,
  CreditCard,
  ShieldCheck,
  PieChart,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Award,
  Loader2,
  X,
  ExternalLink,
  Receipt,
  UserCheck
} from 'lucide-react';
import {
  Usuario,
  VendaVeiculo,
  DespesaFixa,
  ContaBancariaCaixa,
  MovimentacaoConta,
  Veiculo
} from '../types';
import { formatCurrency, formatDate, formatPercent } from '../utils/formatters';
import {
  saveContaBancariaFirestore,
  saveMovimentacaoContaFirestore,
  saveDespesaFixaFirestore,
  saveVendaFirestore
} from '../services/firestoreService';

interface FechamentoFolhaViewProps {
  usuarios: Usuario[];
  vendas: VendaVeiculo[];
  despesasFixas: DespesaFixa[];
  contasBancarias: ContaBancariaCaixa[];
  veiculos?: Veiculo[];
  currentUser?: Usuario | null;
  onOpenMeuPerfil?: () => void;
  onUpdateVenda?: (venda: VendaVeiculo) => Promise<void> | void;
  onSaveDespesaFixa?: (despesa: DespesaFixa) => Promise<void> | void;
}

export const FechamentoFolhaView: React.FC<FechamentoFolhaViewProps> = ({
  usuarios = [],
  vendas = [],
  despesasFixas = [],
  contasBancarias = [],
  veiculos = [],
  currentUser,
  onOpenMeuPerfil,
  onUpdateVenda,
  onSaveDespesaFixa,
}) => {
  // Mês de referência atual (YYYY-MM)
  const mesAtualPadrao = useMemo(() => {
    const d = new Date();
    const ano = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    return `${ano}-${mes}`;
  }, []);

  const [mesReferencia, setMesReferencia] = useState<string>(mesAtualPadrao);
  const [termoBusca, setTermoBusca] = useState('');
  const [filtroVinculo, setFiltroVinculo] = useState<string>('todos');
  const [copiadoPixId, setCopiadoPixId] = useState<string | null>(null);

  // Usuário selecionado para expandir detalhes das vendas
  const [colaboradorExpandidoId, setColaboradorExpandidoId] = useState<string | null>(null);

  // Modal de Liquidação / Pagamento
  const [usuarioParaLiquidar, setUsuarioParaLiquidar] = useState<Usuario | null>(null);
  const [contaOrigemId, setContaOrigemId] = useState<string>('');
  const [formaPagamento, setFormaPagamento] = useState<string>('PIX');
  const [dataPagamento, setDataPagamento] = useState<string>(new Date().toISOString().split('T')[0]);
  const [observacaoPagamento, setObservacaoPagamento] = useState<string>('');
  const [isProcessando, setIsProcessando] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [erroLiquidacao, setErroLiquidacao] = useState<string | null>(null);

  // Modal de Holerite / Recibo para impressão
  const [holeriteUsuario, setHoleriteUsuario] = useState<{
    usuario: Usuario;
    salarioBase: number;
    encargos: number;
    comissoes: number;
    vendasAssociadas: VendaVeiculo[];
    plr: number;
    totalLiquido: number;
    custoTotal: number;
    dataHora: string;
  } | null>(null);

  // Lista de meses disponíveis para seleção
  const listaMesesDisponiveis = useMemo(() => {
    const setMeses = new Set<string>();
    setMeses.add(mesAtualPadrao);

    // Adicionar mês passado
    const dPassado = new Date();
    dPassado.setMonth(dPassado.getMonth() - 1);
    const mesPassado = `${dPassado.getFullYear()}-${String(dPassado.getMonth() + 1).padStart(2, '0')}`;
    setMeses.add(mesPassado);

    vendas.forEach((v) => {
      if (v.dataVenda && v.dataVenda.length >= 7) {
        setMeses.add(v.dataVenda.substring(0, 7));
      }
    });

    despesasFixas.forEach((d) => {
      if (d.mesReferencia && d.mesReferencia.length >= 7) {
        setMeses.add(d.mesReferencia.substring(0, 7));
      }
    });

    return Array.from(setMeses).sort().reverse();
  }, [vendas, despesasFixas, mesAtualPadrao]);

  // 1. Apuração do Lucro Líquido Real do Mês de Referência (para cálculo do PLR de Sócios/Gestores)
  const apuracaoResultadoMes = useMemo(() => {
    // Vendas realizadas no mês
    const vendasDoMes = vendas.filter((v) => v.dataVenda?.startsWith(mesReferencia));
    const receitaVendas = vendasDoMes.reduce((acc, v) => acc + (v.valorVenda || 0), 0);
    const cmvVeiculos = vendasDoMes.reduce((acc, v) => acc + (v.valorCompra || 0), 0);
    const custosVeiculos = vendasDoMes.reduce((acc, v) => acc + (v.totalDespesasVeiculo || 0), 0);
    const comissoesVendasMes = vendasDoMes.reduce((acc, v) => acc + (v.comissaoValor || 0), 0);

    // Despesas fixas do mês (excluindo distribuições de lucros já pagas para evitar loop)
    const despesasFixasDoMes = despesasFixas.filter(
      (d) =>
        (d.mesReferencia === mesReferencia || d.dataVencimento?.startsWith(mesReferencia)) &&
        d.categoria !== 'Distribuição de Lucros (Sócios/Donos)'
    );
    const totalDespesasFixas = despesasFixasDoMes.reduce((acc, d) => acc + (d.valor || 0), 0);

    const lucroBruto = receitaVendas - (cmvVeiculos + custosVeiculos + comissoesVendasMes);
    const lucroLiquidoReal = lucroBruto - totalDespesasFixas;

    return {
      receitaVendas,
      totalVendasCount: vendasDoMes.length,
      lucroLiquidoReal: Math.max(0, lucroLiquidoReal),
    };
  }, [vendas, despesasFixas, mesReferencia]);

  // 2. Colaboradores ativos e cálculo individual
  const colaboradoresCalculados = useMemo(() => {
    // Filtrar colaboradores aprovados e ativos
    const ativos = usuarios.filter(
      (u) => (u.statusAprovacao === 'aprovado' || !u.statusAprovacao) && u.ativo !== false
    );

    return ativos.map((u) => {
      const vinculo = u.dadosContratuais?.tipoVinculo || (u.role === 'admin' ? 'Sócio / Pró-labore' : 'CLT');
      const salarioBase = Number(u.dadosContratuais?.salarioBaseFixo || 0);
      const encargos = Number(u.dadosContratuais?.encargosTrabalhistasEstimados || 0);

      // Comissões pendentes deste vendedor (acumuladas até este mês de referência)
      const vendasDoVendedor = vendas.filter((v) => {
        const isVendedor =
          v.vendedorId === u.uid ||
          (v.vendedorNome && v.vendedorNome.trim().toLowerCase() === u.displayName?.trim().toLowerCase());
        return isVendedor;
      });

      // Vendas pendentes de pagamento no mês ou acumuladas
      const vendasPendentes = vendasDoVendedor.filter(
        (v) =>
          v.comissaoStatus !== 'Paga' &&
          (v.dataVenda?.startsWith(mesReferencia) || (!v.dataVenda && true))
      );

      const totalComissoesPendentes = vendasPendentes.reduce(
        (acc, v) => acc + (Number(v.comissaoValor) || 0),
        0
      );

      // Vendas já pagas no mês
      const vendasPagas = vendasDoVendedor.filter(
        (v) =>
          v.comissaoStatus === 'Paga' &&
          (v.comissaoDataPagamento?.startsWith(mesReferencia) || v.dataVenda?.startsWith(mesReferencia))
      );
      const totalComissoesPagas = vendasPagas.reduce(
        (acc, v) => acc + (Number(v.comissaoValor) || 0),
        0
      );

      // PLR / Participação nos Lucros (se Sócio, Gerente ou se possuir percentual cadastrado)
      let percentualPlr = Number(u.dadosContratuais?.percentualParticipacaoLucros || 0);
      if (percentualPlr === 0 && (u.role === 'admin' || vinculo === 'Sócio / Pró-labore')) {
        // Se for admin e não tiver configurado %, assume pró-labore fixo apenas
        percentualPlr = 0;
      }
      const valorPlr =
        percentualPlr > 0 && apuracaoResultadoMes.lucroLiquidoReal > 0
          ? (apuracaoResultadoMes.lucroLiquidoReal * percentualPlr) / 100
          : 0;

      // Verificação se o salário/pró-labore deste colaborador já foi registrado/pago neste mês de referência
      const despesaFolhaPaga = despesasFixas.find(
        (df) =>
          df.mesReferencia === mesReferencia &&
          df.status === 'Pago' &&
          (df.beneficiarioUsuarioId === u.uid ||
            (df.descricao && df.descricao.toLowerCase().includes(u.displayName?.toLowerCase() || '---'))) &&
          (df.categoria === 'Folha de Pagamento' ||
            df.categoria === 'Pró-labore' ||
            df.categoria === 'Distribuição de Lucros (Sócios/Donos)')
      );

      const isFolhaPaga = !!despesaFolhaPaga;
      const totalLiquidoAPagar = salarioBase + totalComissoesPendentes + valorPlr;
      const custoTotalEmpresa = totalLiquidoAPagar + encargos;

      return {
        usuario: u,
        vinculo,
        salarioBase,
        encargos,
        vendasPendentes,
        vendasPagas,
        totalComissoesPendentes,
        totalComissoesPagas,
        percentualPlr,
        valorPlr,
        totalLiquidoAPagar,
        custoTotalEmpresa,
        isFolhaPaga,
        despesaFolhaPaga,
      };
    });
  }, [usuarios, vendas, despesasFixas, mesReferencia, apuracaoResultadoMes]);

  // Filtros de busca e tipo de vínculo
  const colaboradoresFiltrados = useMemo(() => {
    return colaboradoresCalculados.filter((item) => {
      const matchTexto =
        item.usuario.displayName?.toLowerCase().includes(termoBusca.toLowerCase()) ||
        item.usuario.email?.toLowerCase().includes(termoBusca.toLowerCase()) ||
        item.usuario.cargo?.toLowerCase().includes(termoBusca.toLowerCase()) ||
        item.usuario.role?.toLowerCase().includes(termoBusca.toLowerCase());

      const matchVinculo = filtroVinculo === 'todos' || item.vinculo === filtroVinculo;

      return matchTexto && matchVinculo;
    });
  }, [colaboradoresCalculados, termoBusca, filtroVinculo]);

  // Totais consolidados da folha
  const totaisGerais = useMemo(() => {
    return colaboradoresCalculados.reduce(
      (acc, curr) => ({
        salariosBase: acc.salariosBase + curr.salarioBase,
        encargos: acc.encargos + curr.encargos,
        comissoesPendentes: acc.comissoesPendentes + curr.totalComissoesPendentes,
        comissoesPagas: acc.comissoesPagas + curr.totalComissoesPagas,
        plrEstimado: acc.plrEstimado + curr.valorPlr,
        liquidoTotal: acc.liquidoTotal + curr.totalLiquidoAPagar,
        custoTotal: acc.custoTotal + curr.custoTotalEmpresa,
      }),
      {
        salariosBase: 0,
        encargos: 0,
        comissoesPendentes: 0,
        comissoesPagas: 0,
        plrEstimado: 0,
        liquidoTotal: 0,
        custoTotal: 0,
      }
    );
  }, [colaboradoresCalculados]);

  // Copiar chave PIX
  const handleCopiarPix = (chave: string, id: string) => {
    navigator.clipboard.writeText(chave);
    setCopiadoPixId(id);
    setTimeout(() => setCopiadoPixId(null), 2500);
  };

  // Abrir modal de liquidação
  const handleAbrirLiquidacao = (usuario: Usuario) => {
    setUsuarioParaLiquidar(usuario);
    // Seleciona primeira conta corrente com saldo ou a primeira disponível
    const contaSugerida = contasBancarias.find((c) => c.saldo > 0) || contasBancarias[0];
    setContaOrigemId(contaSugerida?.id || '');
    setFormaPagamento(usuario.dadosBancarios?.tipoChavePix ? 'PIX' : 'Transferência TED');
    setDataPagamento(new Date().toISOString().split('T')[0]);
    setObservacaoPagamento(`Liquidação Folha Ref. ${mesReferencia} - ${usuario.displayName}`);
    setErroLiquidacao(null);
  };

  // 3. Efetivação do Pagamento e Liquidação Bancária no Firestore
  const handleConfirmarLiquidacao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioParaLiquidar) return;

    const colabInfo = colaboradoresCalculados.find((c) => c.usuario.uid === usuarioParaLiquidar.uid);
    if (!colabInfo) return;

    if (!contaOrigemId) {
      setErroLiquidacao('Por favor, selecione uma conta bancária de origem para o débito.');
      return;
    }

    const contaSelecionada = contasBancarias.find((c) => c.id === contaOrigemId);
    if (!contaSelecionada) {
      setErroLiquidacao('Conta bancária de origem não encontrada.');
      return;
    }

    const totalLiquido = colabInfo.totalLiquidoAPagar;
    if (totalLiquido <= 0) {
      setErroLiquidacao('Não há valores líquidos pendentes para este colaborador no momento.');
      return;
    }

    setIsProcessando(true);
    setErroLiquidacao(null);

    try {
      const dataHoraIso = new Date().toISOString();
      const autorNome = currentUser?.displayName || currentUser?.email || 'Administrador';

      // 1. Debitar valor líquido da Conta Bancária e registrar Movimentação / Extrato
      const novoSaldo = Math.max(0, Number((contaSelecionada.saldo - totalLiquido).toFixed(2)));
      const contaAtualizada: ContaBancariaCaixa = {
        ...contaSelecionada,
        saldo: novoSaldo,
      };
      await saveContaBancariaFirestore(contaAtualizada);

      const novaMovimentacao: MovimentacaoConta = {
        id: `mov_folha_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        contaId: contaSelecionada.id,
        contaNome: contaSelecionada.nome,
        tipo: 'Despesa',
        categoria: 'Folha de Pagamento',
        descricao: `Pagamento Folha/Comissões [${usuarioParaLiquidar.displayName}] - Ref ${mesReferencia}`,
        valor: totalLiquido,
        data: dataPagamento,
        formaPagamento: formaPagamento,
        comprovanteNumero: `FOLHA-${mesReferencia}-${usuarioParaLiquidar.uid.substring(0, 5)}`,
        observacoes: observacaoPagamento.trim() || undefined,
        criadoPor: autorNome,
        createdAt: dataHoraIso,
      };
      await saveMovimentacaoContaFirestore(novaMovimentacao);

      // 2. Se houver Salário Base Fixo: criar Despesa Fixa no Contas a Pagar
      if (colabInfo.salarioBase > 0) {
        const categoriaSalario =
          colabInfo.vinculo === 'Sócio / Pró-labore' ? 'Pró-labore' : 'Folha de Pagamento';

        const despesaSalario: DespesaFixa = {
          id: `desp_folha_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          nome: `Salário Base - ${usuarioParaLiquidar.displayName} (${mesReferencia})`,
          categoria: categoriaSalario,
          descricao: `Salário base / Pró-labore mensal ref. ${mesReferencia} - ${usuarioParaLiquidar.displayName}`,
          valor: colabInfo.salarioBase,
          mesReferencia: mesReferencia,
          dataVencimento: dataPagamento,
          status: 'Pago',
          dataPagamento: dataPagamento,
          formaPagamento: formaPagamento,
          contaBancariaId: contaSelecionada.id,
          contaBancariaNome: contaSelecionada.nome,
          beneficiarioUsuarioId: usuarioParaLiquidar.uid,
          observacoes: `Liquidado via Folha de Pagamento em ${formatDate(dataPagamento)}. Autor: ${autorNome}`,
        };
        await saveDespesaFixaFirestore(despesaSalario);
        if (onSaveDespesaFixa) {
          onSaveDespesaFixa(despesaSalario);
        }
      }

      // 3. Se houver Encargos Trabalhistas Estimados: criar Despesa Fixa de Encargos
      if (colabInfo.encargos > 0) {
        const despesaEncargos: DespesaFixa = {
          id: `desp_encargos_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          nome: `Encargos Trabalhistas - ${usuarioParaLiquidar.displayName} (${mesReferencia})`,
          categoria: 'Impostos / DAS / Tributos',
          descricao: `Encargos trabalhistas (INSS/FGTS estimados) ref. ${mesReferencia} - ${usuarioParaLiquidar.displayName}`,
          valor: colabInfo.encargos,
          mesReferencia: mesReferencia,
          dataVencimento: dataPagamento,
          status: 'Pago',
          dataPagamento: dataPagamento,
          formaPagamento: formaPagamento,
          contaBancariaId: contaSelecionada.id,
          contaBancariaNome: contaSelecionada.nome,
          beneficiarioUsuarioId: usuarioParaLiquidar.uid,
          observacoes: `Provisão/Quitação de encargos em ${formatDate(dataPagamento)}.`,
        };
        await saveDespesaFixaFirestore(despesaEncargos);
        if (onSaveDespesaFixa) {
          onSaveDespesaFixa(despesaEncargos);
        }
      }

      // 4. Se houver PLR / Participação nos Lucros de Sócios/Gestores: criar Despesa Fixa de Distribuição
      if (colabInfo.valorPlr > 0) {
        const despesaPlr: DespesaFixa = {
          id: `desp_plr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          nome: `Distribuição de Lucros (PLR) - ${usuarioParaLiquidar.displayName} (${mesReferencia})`,
          categoria: 'Distribuição de Lucros (Sócios/Donos)',
          descricao: `Participação nos lucros (${colabInfo.percentualPlr}% do resultado líquido mensal de ${formatCurrency(
            apuracaoResultadoMes.lucroLiquidoReal
          )}) - ${usuarioParaLiquidar.displayName}`,
          valor: colabInfo.valorPlr,
          mesReferencia: mesReferencia,
          dataVencimento: dataPagamento,
          status: 'Pago',
          dataPagamento: dataPagamento,
          formaPagamento: formaPagamento,
          contaBancariaId: contaSelecionada.id,
          contaBancariaNome: contaSelecionada.nome,
          beneficiarioUsuarioId: usuarioParaLiquidar.uid,
          observacoes: `PLR calculado e quitado via Fechamento de Folha em ${formatDate(dataPagamento)}.`,
        };
        await saveDespesaFixaFirestore(despesaPlr);
        if (onSaveDespesaFixa) {
          onSaveDespesaFixa(despesaPlr);
        }
      }

      // 5. Atualizar status de cada comissão de venda pendente para "Paga"
      // (IMPORTANTE: Comissões de venda já compõem o CMV/custo do veículo na venda, logo NÃO são somadas como despesa fixa novamente)
      for (const v of colabInfo.vendasPendentes) {
        const vendaAtualizada: VendaVeiculo = {
          ...v,
          comissaoStatus: 'Paga',
          comissaoDataPagamento: dataPagamento,
          observacoesVenda: (v.observacoesVenda || '') + `\n[COMISSÃO PAGA em ${formatDate(dataPagamento)} via Fechamento de Folha Ref. ${mesReferencia} - Conta ${contaSelecionada.nome}]`,
        };
        await saveVendaFirestore(vendaAtualizada);
        if (onUpdateVenda) {
          onUpdateVenda(vendaAtualizada);
        }
      }

      setMensagemSucesso(
        `Folha de ${usuarioParaLiquidar.displayName} liquidada com sucesso! ${formatCurrency(
          totalLiquido
        )} debitado de ${contaSelecionada.nome}.`
      );

      // Prepara holerite para visualização imediata
      setHoleriteUsuario({
        usuario: usuarioParaLiquidar,
        salarioBase: colabInfo.salarioBase,
        encargos: colabInfo.encargos,
        comissoes: colabInfo.totalComissoesPendentes,
        vendasAssociadas: colabInfo.vendasPendentes,
        plr: colabInfo.valorPlr,
        totalLiquido,
        custoTotal: colabInfo.custoTotalEmpresa,
        dataHora: new Date().toLocaleString('pt-BR'),
      });

      setUsuarioParaLiquidar(null);
      setTimeout(() => setMensagemSucesso(null), 6000);
    } catch (err: any) {
      console.error('Erro na liquidação da folha:', err);
      setErroLiquidacao(err?.message || 'Falha ao processar a liquidação da folha no Firestore.');
    } finally {
      setIsProcessando(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Banner de Feedback de Sucesso */}
      {mensagemSucesso && (
        <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 flex items-center justify-between gap-3 shadow-lg shadow-emerald-950/50">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
            <p className="text-sm font-semibold">{mensagemSucesso}</p>
          </div>
          <button
            onClick={() => setMensagemSucesso(null)}
            className="text-emerald-400 hover:text-emerald-200 p-1"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Barra de Filtros e Seleção do Mês */}
      <div className="p-4 rounded-3xl bg-[#0e0f14] border border-white/10 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center justify-center shrink-0">
            <Users size={20} />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              <span>Fechamento de Folha & RH</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono font-normal">
                {colaboradoresCalculados.length} Colaboradores Ativos
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Salários base, encargos estimados, comissões acumuladas e PLR/pró-labore de sócios
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Seletor do Mês de Referência */}
          <div className="flex items-center gap-2 bg-[#14151e] px-3.5 py-1.5 rounded-2xl border border-white/10">
            <Calendar size={15} className="text-purple-400" />
            <span className="text-xs font-bold text-slate-300">Competência:</span>
            <select
              value={mesReferencia}
              onChange={(e) => setMesReferencia(e.target.value)}
              className="bg-transparent text-xs font-black text-purple-300 outline-none cursor-pointer"
            >
              {listaMesesDisponiveis.map((mes) => (
                <option key={mes} value={mes} className="bg-[#14151e] text-white">
                  {mes} {mes === mesAtualPadrao ? '(Mês Vigente)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Tipo de Vínculo */}
          <select
            value={filtroVinculo}
            onChange={(e) => setFiltroVinculo(e.target.value)}
            className="bg-[#14151e] text-xs text-slate-300 px-3 py-2 rounded-2xl border border-white/10 outline-none cursor-pointer"
          >
            <option value="todos">Todos os Vínculos</option>
            <option value="CLT">CLT</option>
            <option value="PJ / Prestador">PJ / Prestador</option>
            <option value="Sócio / Pró-labore">Sócio / Pró-labore</option>
            <option value="Comissionado Puro">Comissionado Puro</option>
            <option value="Estagiário / Jovem">Estagiário / Jovem</option>
          </select>

          {/* Campo de Busca */}
          <input
            type="text"
            placeholder="Buscar por colaborador..."
            value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
            className="bg-[#14151e] text-xs text-white placeholder-slate-500 px-3.5 py-2 rounded-2xl border border-white/10 outline-none w-48 focus:border-purple-500"
          />
        </div>
      </div>

      {/* Cards de Métricas Consolidadas da Folha */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* 1. Salários Base Fixos */}
        <div className="p-4 rounded-3xl bg-[#0e0f14] border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Salários Base Fixos</span>
            <DollarSign size={16} className="text-blue-400" />
          </div>
          <p className="text-lg font-black text-white font-mono">
            {formatCurrency(totaisGerais.salariosBase)}
          </p>
          <span className="text-[10px] text-slate-500 block">
            Folha contratual registrada
          </span>
        </div>

        {/* 2. Encargos Trabalhistas */}
        <div className="p-4 rounded-3xl bg-[#0e0f14] border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Encargos Estimados</span>
            <ShieldCheck size={16} className="text-amber-400" />
          </div>
          <p className="text-lg font-black text-amber-400 font-mono">
            {formatCurrency(totaisGerais.encargos)}
          </p>
          <span className="text-[10px] text-slate-500 block">
            INSS, FGTS e provisões
          </span>
        </div>

        {/* 3. Comissões Pendentes do Mês */}
        <div className="p-4 rounded-3xl bg-[#0e0f14] border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Comissões Pendentes</span>
            <Award size={16} className="text-purple-400" />
          </div>
          <p className="text-lg font-black text-purple-400 font-mono">
            {formatCurrency(totaisGerais.comissoesPendentes)}
          </p>
          <span className="text-[10px] text-slate-500 block">
            Aguardando quitação em folha
          </span>
        </div>

        {/* 4. PLR / Sócios */}
        <div className="p-4 rounded-3xl bg-[#0e0f14] border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>PLR / Sócios</span>
            <PieChart size={16} className="text-emerald-400" />
          </div>
          <p className="text-lg font-black text-emerald-400 font-mono">
            {formatCurrency(totaisGerais.plrEstimado)}
          </p>
          <span className="text-[10px] text-slate-500 block">
            Sobre lucro líq. {formatCurrency(apuracaoResultadoMes.lucroLiquidoReal)}
          </span>
        </div>

        {/* 5. Custo Total Consolidado */}
        <div className="p-4 rounded-3xl bg-gradient-to-br from-purple-950/40 to-[#0e0f14] border border-purple-500/30 space-y-1">
          <div className="flex items-center justify-between text-purple-300 text-xs font-bold">
            <span>Custo Total Loja</span>
            <Wallet size={16} className="text-purple-400" />
          </div>
          <p className="text-lg font-black text-white font-mono">
            {formatCurrency(totaisGerais.custoTotal)}
          </p>
          <span className="text-[10px] text-purple-300/80 block font-mono">
            Líquido Colaboradores: {formatCurrency(totaisGerais.liquidoTotal)}
          </span>
        </div>
      </div>

      {/* Lista / Tabela de Fechamento por Colaborador */}
      <div className="space-y-3">
        {colaboradoresFiltrados.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-[#0e0f14] border border-white/5">
            <Users size={36} className="mx-auto text-slate-600 mb-2" />
            <p className="text-sm font-bold text-slate-400">Nenhum colaborador encontrado com os filtros atuais.</p>
            <p className="text-xs text-slate-500 mt-1">
              Verifique a busca ou aprove novos usuários no painel de Usuários.
            </p>
          </div>
        ) : (
          colaboradoresFiltrados.map((item) => {
            const {
              usuario,
              vinculo,
              salarioBase,
              encargos,
              vendasPendentes,
              totalComissoesPendentes,
              percentualPlr,
              valorPlr,
              totalLiquidoAPagar,
              custoTotalEmpresa,
              isFolhaPaga,
              despesaFolhaPaga,
            } = item;

            const isExpandido = colaboradorExpandidoId === usuario.uid;
            const hasDadosBancarios = !!(
              usuario.dadosBancarios?.banco ||
              usuario.dadosBancarios?.chavePix
            );

            return (
              <div
                key={usuario.uid}
                className={`rounded-3xl border transition overflow-hidden ${
                  isFolhaPaga
                    ? 'bg-[#0f121a] border-emerald-500/20'
                    : 'bg-[#0e0f14] border-white/10 hover:border-white/20'
                }`}
              >
                {/* Header do Card do Colaborador */}
                <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Perfil & Vínculo */}
                  <div className="flex items-center gap-3 min-w-0">
                    {usuario.photoURL ? (
                      <img
                        src={usuario.photoURL}
                        alt={usuario.displayName}
                        referrerPolicy="no-referrer"
                        className="w-12 h-12 rounded-2xl object-cover border border-white/10 shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-2xl bg-purple-600/20 text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0 font-bold text-base">
                        {usuario.displayName ? usuario.displayName.charAt(0).toUpperCase() : 'U'}
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-extrabold text-white truncate">
                          {usuario.displayName}
                        </h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-300">
                          {vinculo}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300">
                          {usuario.cargo || usuario.role}
                        </span>
                        {isFolhaPaga && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 size={11} />
                            <span>Quitado</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 truncate">{usuario.email}</p>

                      {/* Informações bancárias rápidas */}
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-400 flex-wrap">
                        {usuario.dadosBancarios?.chavePix ? (
                          <div className="flex items-center gap-1.5 bg-black/40 px-2 py-0.5 rounded-lg border border-white/5">
                            <span className="text-[10px] text-purple-400 font-bold">PIX:</span>
                            <span className="font-mono text-slate-300">
                              {usuario.dadosBancarios.chavePix}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handleCopiarPix(usuario.dadosBancarios!.chavePix!, usuario.uid)
                              }
                              className="text-slate-400 hover:text-white cursor-pointer ml-1"
                              title="Copiar Chave PIX"
                            >
                              {copiadoPixId === usuario.uid ? (
                                <Check size={12} className="text-emerald-400" />
                              ) : (
                                <Copy size={12} />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-amber-400/80 text-[10px]">
                            ⚠️ PIX / Dados bancários não cadastrados
                          </span>
                        )}

                        {usuario.dadosBancarios?.banco && (
                          <span className="text-slate-400 text-[10px]">
                            • {usuario.dadosBancarios.banco} Ag: {usuario.dadosBancarios.agencia || '-'} Conta:{' '}
                            {usuario.dadosBancarios.conta || '-'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Detalhamento dos Componentes Financeiros */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#14151e] p-3 rounded-2xl border border-white/5">
                    {/* Salário Base */}
                    <div>
                      <span className="text-[10px] text-slate-400 block">Salário Base</span>
                      <span className="text-xs font-bold text-white font-mono">
                        {formatCurrency(salarioBase)}
                      </span>
                    </div>

                    {/* Encargos */}
                    <div>
                      <span className="text-[10px] text-slate-400 block">Encargos</span>
                      <span className="text-xs font-bold text-amber-400 font-mono">
                        {formatCurrency(encargos)}
                      </span>
                    </div>

                    {/* Comissões Pendentes */}
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-400 block">Comissões</span>
                        {vendasPendentes.length > 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              setColaboradorExpandidoId(isExpandido ? null : usuario.uid)
                            }
                            className="text-[10px] text-purple-400 hover:underline cursor-pointer flex items-center"
                          >
                            ({vendasPendentes.length} {isExpandido ? '▲' : '▼'})
                          </button>
                        )}
                      </div>
                      <span className="text-xs font-bold text-purple-400 font-mono">
                        {formatCurrency(totalComissoesPendentes)}
                      </span>
                    </div>

                    {/* PLR / Sócios */}
                    <div>
                      <span className="text-[10px] text-slate-400 block">
                        PLR ({percentualPlr}%)
                      </span>
                      <span className="text-xs font-bold text-emerald-400 font-mono">
                        {formatCurrency(valorPlr)}
                      </span>
                    </div>
                  </div>

                  {/* Resumo Líquido & Botão de Liquidação */}
                  <div className="flex items-center justify-between lg:justify-end gap-3 shrink-0">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">Líquido a Pagar</span>
                      <p className="text-base font-black text-emerald-400 font-mono">
                        {formatCurrency(totalLiquidoAPagar)}
                      </p>
                      <span className="text-[10px] text-slate-500 block">
                        Custo Loja: {formatCurrency(custoTotalEmpresa)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setHoleriteUsuario({
                            usuario,
                            salarioBase,
                            encargos,
                            comissoes: totalComissoesPendentes,
                            vendasAssociadas: vendasPendentes,
                            plr: valorPlr,
                            totalLiquido: totalLiquidoAPagar,
                            custoTotal: custoTotalEmpresa,
                            dataHora: new Date().toLocaleString('pt-BR'),
                          })
                        }
                        className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-bold transition cursor-pointer"
                        title="Ver Holerite / Recibo"
                      >
                        <FileText size={16} />
                      </button>

                      <button
                        type="button"
                        disabled={totalLiquidoAPagar <= 0}
                        onClick={() => handleAbrirLiquidacao(usuario)}
                        className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-lg ${
                          totalLiquidoAPagar > 0
                            ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/30'
                            : 'bg-white/5 text-slate-500 border border-white/5 cursor-not-allowed'
                        }`}
                      >
                        <CreditCard size={15} />
                        <span>{isFolhaPaga ? 'Liquidar Restante' : 'Liquidar Folha'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Bloco Expandido: Lista das Vendas Pendentes vinculadas */}
                {isExpandido && vendasPendentes.length > 0 && (
                  <div className="p-4 bg-[#12131c] border-t border-white/5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-purple-300 flex items-center gap-1.5">
                        <Award size={14} />
                        <span>Vendas do Mês Aguardando Baixa de Comissão ({vendasPendentes.length})</span>
                      </span>
                      <span className="text-slate-400 text-[11px]">
                        Ao liquidar a folha, essas vendas serão marcadas como 'Paga' sem gerar despesa fixa duplicada.
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {vendasPendentes.map((v) => (
                        <div
                          key={v.id}
                          className="p-2.5 rounded-xl bg-[#0e0f14] border border-white/5 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-bold text-white block">{v.modelo}</span>
                            <span className="text-[10px] font-mono text-slate-400">
                              Placa: {v.placa} • {v.dataVenda ? formatDate(v.dataVenda) : 'Data N/I'}
                            </span>
                          </div>
                          <div className="text-right font-mono">
                            <span className="text-[10px] text-slate-400 block">Comissão</span>
                            <span className="font-bold text-amber-400">
                              {formatCurrency(v.comissaoValor)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* MODAL DE LIQUIDAÇÃO E PAGAMENTO BANCÁRIO */}
      {usuarioParaLiquidar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto animate-fadeIn">
          <div className="relative w-full max-w-lg bg-[#0e0f14] border border-white/10 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/5 bg-[#12131a]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center justify-center shrink-0">
                  <CreditCard size={18} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    Liquidação Bancária de Folha
                  </h3>
                  <p className="text-xs text-slate-400">
                    Competência {mesReferencia} • {usuarioParaLiquidar.displayName}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setUsuarioParaLiquidar(null)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Formulário de Liquidação */}
            <form onSubmit={handleConfirmarLiquidacao} className="p-5 space-y-4">
              {erroLiquidacao && (
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle size={16} className="text-rose-400 shrink-0" />
                  <span>{erroLiquidacao}</span>
                </div>
              )}

              {/* Resumo da composição */}
              {(() => {
                const c = colaboradoresCalculados.find((item) => item.usuario.uid === usuarioParaLiquidar.uid);
                if (!c) return null;
                return (
                  <div className="p-4 rounded-2xl bg-[#14151e] border border-white/5 space-y-2.5 text-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Discriminação dos Valores a Liquidar:
                    </span>
                    <div className="flex items-center justify-between text-slate-300">
                      <span>Salário Base Fixo:</span>
                      <span className="font-mono font-bold text-white">{formatCurrency(c.salarioBase)}</span>
                    </div>
                    {c.encargos > 0 && (
                      <div className="flex items-center justify-between text-slate-300">
                        <span>Encargos Trabalhistas Estimados:</span>
                        <span className="font-mono font-bold text-amber-400">{formatCurrency(c.encargos)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-slate-300">
                      <span>Comissões de Vendas Pendentes ({c.vendasPendentes.length}):</span>
                      <span className="font-mono font-bold text-purple-400">
                        {formatCurrency(c.totalComissoesPendentes)}
                      </span>
                    </div>
                    {c.valorPlr > 0 && (
                      <div className="flex items-center justify-between text-slate-300">
                        <span>PLR / Participação ({c.percentualPlr}%):</span>
                        <span className="font-mono font-bold text-emerald-400">
                          {formatCurrency(c.valorPlr)}
                        </span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-white/5 flex items-center justify-between font-black text-sm">
                      <span className="text-white">Líquido a Transferir:</span>
                      <span className="text-emerald-400 font-mono text-base">
                        {formatCurrency(c.totalLiquidoAPagar)}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Seleção de Conta Bancária de Origem */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-200">
                  Conta Bancária da Loja (Origem do Débito) <span className="text-rose-400">*</span>
                </label>
                <select
                  value={contaOrigemId}
                  onChange={(e) => setContaOrigemId(e.target.value)}
                  className="w-full bg-[#16171f] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-purple-500 outline-none"
                >
                  <option value="">-- Selecione a conta bancária da loja --</option>
                  {contasBancarias.map((conta) => (
                    <option key={conta.id} value={conta.id}>
                      {conta.nome} ({conta.tipo}) - Saldo Atual: {formatCurrency(conta.saldo)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Forma e Data de Pagamento */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1">
                    Forma de Pagamento
                  </label>
                  <select
                    value={formaPagamento}
                    onChange={(e) => setFormaPagamento(e.target.value)}
                    className="w-full bg-[#16171f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-purple-500 outline-none"
                  >
                    <option value="PIX">PIX</option>
                    <option value="Transferência TED">Transferência TED</option>
                    <option value="Espécie / Dinheiro">Espécie / Dinheiro</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1">
                    Data da Liquidação
                  </label>
                  <input
                    type="date"
                    value={dataPagamento}
                    onChange={(e) => setDataPagamento(e.target.value)}
                    className="w-full bg-[#16171f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-purple-500 outline-none font-mono"
                  />
                </div>
              </div>

              {/* Dados do Destinatário */}
              {usuarioParaLiquidar.dadosBancarios?.chavePix && (
                <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/20 text-xs flex items-center justify-between">
                  <div>
                    <span className="text-purple-300 block font-bold text-[11px]">Chave PIX do Destinatário:</span>
                    <span className="font-mono text-white text-xs">{usuarioParaLiquidar.dadosBancarios.chavePix}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopiarPix(usuarioParaLiquidar.dadosBancarios!.chavePix!, 'modal')
                    }
                    className="px-2.5 py-1 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 text-[11px] font-bold transition flex items-center gap-1"
                  >
                    {copiadoPixId === 'modal' ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copiadoPixId === 'modal' ? 'Copiado' : 'Copiar PIX'}</span>
                  </button>
                </div>
              )}

              {/* Observações / Notas */}
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1">
                  Observações / Histórico de Auditoria
                </label>
                <input
                  type="text"
                  value={observacaoPagamento}
                  onChange={(e) => setObservacaoPagamento(e.target.value)}
                  placeholder="Ex: Pagamento efetuado via PIX agendado pelo gestor"
                  className="w-full bg-[#16171f] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-purple-500 outline-none"
                />
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setUsuarioParaLiquidar(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isProcessando}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition shadow-lg shadow-purple-600/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isProcessando ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Liquidando folha...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} />
                      <span>Confirmar & Baixar Folha</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE RECIBO / HOLERITE PARA IMPRESSÃO */}
      {holeriteUsuario && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto animate-fadeIn">
          <div className="relative w-full max-w-xl bg-white text-slate-900 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col p-6 font-sans">
            {/* Header Holerite */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
                  Demonstrativo de Pagamento Mensal
                </h3>
                <p className="text-xs text-slate-500">
                  Competência: {mesReferencia} • Emitido em {holeriteUsuario.dataHora}
                </p>
              </div>
              <div className="flex items-center gap-2 print:hidden">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Printer size={14} />
                  <span>Imprimir</span>
                </button>
                <button
                  onClick={() => setHoleriteUsuario(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Dados do Colaborador */}
            <div className="my-4 p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-500 block text-[10px]">Colaborador:</span>
                <span className="font-bold text-slate-900">{holeriteUsuario.usuario.displayName}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Cargo / Função:</span>
                <span className="font-bold text-slate-900">{holeriteUsuario.usuario.cargo || holeriteUsuario.usuario.role}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">CPF / Documento:</span>
                <span className="font-mono text-slate-900">{holeriteUsuario.usuario.cpfCnpj || 'Não informado'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Chave PIX:</span>
                <span className="font-mono text-slate-900">{holeriteUsuario.usuario.dadosBancarios?.chavePix || 'Não informada'}</span>
              </div>
            </div>

            {/* Discriminação dos Proventos */}
            <div className="space-y-2 text-xs">
              <span className="font-bold text-slate-700 uppercase text-[10px] tracking-wider block">
                Discriminação dos Proventos & Comissões
              </span>

              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                <div className="flex justify-between p-2.5 bg-slate-50 text-slate-600 font-bold">
                  <span>Descrição do Evento</span>
                  <span>Valor (R$)</span>
                </div>

                <div className="flex justify-between p-2.5">
                  <span>001 - Salário Base Mensal / Pró-labore</span>
                  <span className="font-mono font-bold">{formatCurrency(holeriteUsuario.salarioBase)}</span>
                </div>

                <div className="flex justify-between p-2.5">
                  <div>
                    <span>002 - Comissões de Vendas de Veículos</span>
                    <span className="text-[10px] text-slate-500 block">
                      {holeriteUsuario.vendasAssociadas.length} veículo(s) comercializado(s)
                    </span>
                  </div>
                  <span className="font-mono font-bold text-purple-700">
                    {formatCurrency(holeriteUsuario.comissoes)}
                  </span>
                </div>

                {holeriteUsuario.plr > 0 && (
                  <div className="flex justify-between p-2.5">
                    <span>003 - Participação nos Lucros & Resultados (PLR)</span>
                    <span className="font-mono font-bold text-emerald-700">
                      {formatCurrency(holeriteUsuario.plr)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between p-3 bg-slate-900 text-white font-black text-sm">
                  <span>VALOR LÍQUIDO A RECEBER:</span>
                  <span className="font-mono text-base text-emerald-400">
                    {formatCurrency(holeriteUsuario.totalLiquido)}
                  </span>
                </div>
              </div>
            </div>

            {/* Assinaturas */}
            <div className="mt-8 pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-xs">
              <div>
                <div className="border-t border-slate-400 w-4/5 mx-auto mb-1"></div>
                <span className="text-slate-600 font-semibold block">Assinatura da Empresa</span>
                <span className="text-[10px] text-slate-400">Departamento Financeiro</span>
              </div>
              <div>
                <div className="border-t border-slate-400 w-4/5 mx-auto mb-1"></div>
                <span className="text-slate-600 font-semibold block">Assinatura do Colaborador</span>
                <span className="text-[10px] text-slate-400">{holeriteUsuario.usuario.displayName}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
