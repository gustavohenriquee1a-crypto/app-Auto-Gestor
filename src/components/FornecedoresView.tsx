import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  Plus, 
  Search, 
  Phone, 
  Mail, 
  MapPin, 
  CreditCard, 
  ExternalLink, 
  Copy, 
  Check, 
  Wrench, 
  Car, 
  Edit, 
  Trash2, 
  SlidersHorizontal,
  Sparkles,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  Layers,
  ArrowRight,
  Eye,
  Loader2
} from 'lucide-react';
import { FornecedorPrestador, CategoriaFornecedor, Veiculo, Usuario } from '../types';
import { ParametrosMovimentacaoVeiculo } from '../services/movimentacaoVeiculoService';
import { MetricCard } from './MetricCard';

interface FornecedoresViewProps {
  fornecedores: FornecedorPrestador[];
  veiculos: Veiculo[];
  currentUser?: Usuario | null;
  onOpenNovoFornecedor?: () => void;
  onEditFornecedor?: (fornecedor: FornecedorPrestador) => void;
  onDeleteFornecedor?: (fornecedorId: string) => void;
  onOpenDossie: (veiculo: Veiculo) => void;
  onOpenRetornoPatio?: (veiculo: Veiculo) => void;
  onMovimentarVeiculo?: (params: ParametrosMovimentacaoVeiculo) => Promise<Veiculo>;
  onSelectTab?: (tab: string) => void;
}

const CATEGORIAS_FILTRO: (CategoriaFornecedor | 'Todas')[] = [
  'Todas',
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

export const FornecedoresView: React.FC<FornecedoresViewProps> = ({
  fornecedores,
  veiculos,
  currentUser,
  onOpenNovoFornecedor,
  onEditFornecedor,
  onDeleteFornecedor,
  onOpenDossie,
  onOpenRetornoPatio,
  onMovimentarVeiculo,
  onSelectTab,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<CategoriaFornecedor | 'Todas'>('Todas');
  const [statusFiltro, setStatusFiltro] = useState<'Todos' | 'Ativo' | 'Inativo'>('Todos');
  const [copiedPixId, setCopiedPixId] = useState<string | null>(null);
  const [retornandoCarroId, setRetornandoCarroId] = useState<string | null>(null);

  // Mapear quantos e quais carros estão em cada fornecedor atualmente
  // O veículo só é contado/exibido se estiver ativamente em preparação e não retornado ao pátio/vendido
  const veiculosPorFornecedor = useMemo(() => {
    const map = new Map<string, Veiculo[]>();
    veiculos.forEach((v) => {
      const estaEmServico = 
        v.status !== 'Vendido' &&
        v.status_estoque !== 'Vendido' &&
        v.status_estoque !== 'No Pátio' &&
        v.etapaKanban !== 'Pronto para Pátio' &&
        (v.status === 'Em Preparação' || v.status === 'Em Manutenção' || v.status_estoque === 'Em Preparação');

      if (estaEmServico) {
        const fornKey = v.fornecedorAtualId || v.fornecedorAtualNome;
        if (fornKey) {
          const list = map.get(fornKey) || [];
          list.push(v);
          map.set(fornKey, list);
        }
      }
    });
    return map;
  }, [veiculos]);

  // Filtragem dos fornecedores
  const fornecedoresFiltrados = useMemo(() => {
    return fornecedores.filter((f) => {
      const matchSearch =
        searchTerm === '' ||
        f.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (f.razaoSocial && f.razaoSocial.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (f.cnpjCpf && f.cnpjCpf.includes(searchTerm)) ||
        (f.responsavelContato && f.responsavelContato.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (f.cidadeUf && f.cidadeUf.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchCat = categoriaFiltro === 'Todas' || f.categoria === categoriaFiltro;
      const matchStatus = statusFiltro === 'Todos' || f.status === statusFiltro;

      return matchSearch && matchCat && matchStatus;
    });
  }, [fornecedores, searchTerm, categoriaFiltro, statusFiltro]);

  // Estatísticas e Métricas
  const totalParceiros = fornecedores.length;
  const totalMecanicas = fornecedores.filter((f) => f.categoria === 'Oficina Mecânica').length;
  const totalFunilariaEstetica = fornecedores.filter(
    (f) => f.categoria === 'Funilaria e Pintura' || f.categoria === 'Lava Jato / Estética Automotiva'
  ).length;

  const totalCarrosEmOficina = useMemo(() => {
    return veiculos.filter(
      (v) =>
        v.status !== 'Vendido' &&
        v.status_estoque !== 'Vendido' &&
        v.status_estoque !== 'No Pátio' &&
        v.etapaKanban !== 'Pronto para Pátio' &&
        Boolean(v.fornecedorAtualId || v.fornecedorAtualNome) &&
        (v.status === 'Em Preparação' || v.status === 'Em Manutenção' || v.status_estoque === 'Em Preparação')
    ).length;
  }, [veiculos]);

  const handleRetornarAoPatio = async (e: React.MouseEvent, car: Veiculo) => {
    e.stopPropagation();
    if (onOpenRetornoPatio) {
      onOpenRetornoPatio(car);
      return;
    }

    if (onMovimentarVeiculo) {
      if (!confirm(`Confirmar o retorno do veículo ${car.modelo} (${car.placa}) para o pátio da loja? Ele será removido imediatamente deste prestador e disponibilizado no showroom.`)) {
        return;
      }
      setRetornandoCarroId(car.id);
      try {
        await onMovimentarVeiculo({
          veiculo: car,
          novaEtapaKanban: 'Pronto para Pátio',
          novoStatusEstoque: 'No Pátio',
          origemModulo: 'Fornecedores & Parceiros',
          usuario: currentUser,
        });
      } catch (err) {
        console.error('Erro ao retornar veículo ao pátio:', err);
      } finally {
        setRetornandoCarroId(null);
      }
    }
  };

  const handleCopyPix = (pix: string, id: string) => {
    if (!pix) return;
    navigator.clipboard.writeText(pix);
    setCopiedPixId(id);
    setTimeout(() => setCopiedPixId(null), 2500);
  };

  const getCategoriaBadge = (cat: CategoriaFornecedor) => {
    switch (cat) {
      case 'Agência de Tráfego / Marketing':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40 font-bold';
      case 'Posto de Combustível':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-black';
      case 'Oficina Mecânica':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'Funilaria e Pintura':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      case 'Lava Jato / Estética Automotiva':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
      case 'Autopeças':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'Auto Elétrica / Acessórios':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'Pneus / Borracharia':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'Guincho / Reboque':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 1. Top Action & Banner */}
      <div className="bg-[#111116] text-white p-6 rounded-2xl border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Building2 className="text-blue-400" size={24} />
            <h3 className="font-black text-xl text-white">Fornecedores & Prestadores de Serviços</h3>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Rede de parceiros estratégicos: mecânicas, funilarias, autopeças, estética e serviços terceirizados vinculados ao estoque e custos de preparação.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {onSelectTab && (
            <button
              onClick={() => onSelectTab('revisoes')}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Wrench size={14} className="text-amber-400" />
              <span>Ver Preparações & Oficina</span>
            </button>
          )}
          {onOpenNovoFornecedor && (
            <button
              onClick={onOpenNovoFornecedor}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={16} />
              <span>Cadastrar Novo Fornecedor</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          id="kpi-forn-total"
          title="Parceiros Cadastrados"
          value={String(totalParceiros)}
          subValue={`${fornecedores.filter((f) => f.status === 'Ativo').length} ativos no sistema`}
          color="text-blue-400"
          badge="Rede Homologada"
          icon={Building2}
          iconBg="bg-blue-500/10 text-blue-400"
        />

        <MetricCard
          id="kpi-forn-mecanicas"
          title="Oficinas & Mecânicas"
          value={String(totalMecanicas)}
          subValue="Revisão, injeção e suspensão"
          color="text-indigo-400"
          badge="Mecânica"
          icon={Wrench}
          iconBg="bg-indigo-500/10 text-indigo-400"
        />

        <MetricCard
          id="kpi-forn-estetica"
          title="Funilaria & Estética"
          value={String(totalFunilariaEstetica)}
          subValue="Pintura, martelinho e polimento"
          color="text-amber-400"
          badge="Lataria / Brilho"
          icon={Sparkles}
          iconBg="bg-amber-500/10 text-amber-400"
        />

        <MetricCard
          id="kpi-forn-carros-servico"
          title="Carros em Serviço Externo"
          value={String(totalCarrosEmOficina)}
          subValue="Alocados em fornecedores"
          color={totalCarrosEmOficina > 0 ? "text-emerald-400 font-bold" : "text-slate-400"}
          badge="Preparações"
          icon={Car}
          iconBg="bg-emerald-500/10 text-emerald-400"
        />
      </div>

      {/* 3. Filters & Search Toolbar */}
      <div className="bg-[#111116] p-4 rounded-2xl border border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por nome, CNPJ, responsável, cidade..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#16171e] border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Categorias Tabs / Filter */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <select
            value={categoriaFiltro}
            onChange={(e) => setCategoriaFiltro(e.target.value as any)}
            className="bg-[#16171e] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          >
            {CATEGORIAS_FILTRO.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'Todas' ? 'Todas as Categorias' : cat}
              </option>
            ))}
          </select>

          <select
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value as any)}
            className="bg-[#16171e] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          >
            <option value="Todos">Todos os Status</option>
            <option value="Ativo">Apenas Ativos</option>
            <option value="Inativo">Apenas Inativos</option>
          </select>
        </div>
      </div>

      {/* 4. Suppliers Grid */}
      {fornecedoresFiltrados.length === 0 ? (
        <div className="bg-[#111116] rounded-2xl p-12 text-center border border-white/5 space-y-3">
          <Building2 size={44} className="mx-auto text-slate-600 mb-2" />
          <h5 className="text-base font-bold text-white">Nenhum fornecedor encontrado</h5>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {searchTerm || categoriaFiltro !== 'Todas' || statusFiltro !== 'Todos'
              ? 'Nenhum resultado corresponde aos filtros selecionados. Tente redefinir a busca.'
              : 'Cadastre suas oficinas parceiras, funilarias e autopeças para associar aos veículos e custos de preparação.'}
          </p>
          <button
            onClick={onOpenNovoFornecedor}
            className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5"
          >
            <Plus size={14} /> Cadastrar Primeiro Parceiro
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {fornecedoresFiltrados.map((forn) => {
            const carrosNoLocal = (veiculosPorFornecedor.get(forn.id) || []).concat(
              veiculosPorFornecedor.get(forn.nome) || []
            );
            // Deduplicate if needed
            const uniqueCarros = Array.from(new Set(carrosNoLocal.map((c) => c.id)))
              .map((id) => carrosNoLocal.find((c) => c.id === id)!)
              .filter(Boolean);

            const whatsappNumeros = forn.whatsapp ? forn.whatsapp.replace(/\D/g, '') : '';
            const whatsappLink = whatsappNumeros ? `https://wa.me/55${whatsappNumeros}` : null;

            return (
              <div
                key={forn.id}
                className={`bg-[#111116] rounded-2xl border transition-all hover:border-white/20 p-5 flex flex-col justify-between ${
                  forn.status === 'Inativo' ? 'border-white/5 opacity-60' : 'border-white/10 shadow-lg'
                }`}
              >
                <div>
                  {/* Top row: Category Badge & Actions */}
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-white/5">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${getCategoriaBadge(
                        forn.categoria
                      )}`}
                    >
                      {forn.categoria}
                    </span>

                    <div className="flex items-center gap-1">
                      {onEditFornecedor && (
                        <button
                          onClick={() => onEditFornecedor(forn)}
                          title="Editar Fornecedor"
                          className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-white/5 rounded-lg transition"
                        >
                          <Edit size={14} />
                        </button>
                      )}
                      {onDeleteFornecedor && (
                        <button
                          onClick={() => {
                            if (confirm(`Tem certeza que deseja excluir o parceiro "${forn.nome}"?`)) {
                              onDeleteFornecedor(forn.id);
                            }
                          }}
                          title="Excluir Fornecedor"
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Company Name & Details */}
                  <div className="mt-3">
                    <h4 className="font-bold text-base text-white">{forn.nome}</h4>
                    {forn.razaoSocial && forn.razaoSocial !== forn.nome && (
                      <p className="text-[11px] text-slate-400 truncate">{forn.razaoSocial}</p>
                    )}
                    {forn.cnpjCpf && (
                      <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                        Doc: <span className="text-slate-300">{forn.cnpjCpf}</span>
                      </p>
                    )}

                    {/* Badge de Modelo de Cobrança / Faturamento */}
                    <div className="mt-2">
                      {forn.tipoCobranca === 'Fixo Mensal' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/20 font-semibold">
                          <Clock size={11} />
                          <span>Fixo Mensal: R$ {forn.valorContratoMensal ? Number(forn.valorContratoMensal).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}/mês {forn.diaVencimentoPagamento ? `(Venc. dia ${forn.diaVencimentoPagamento})` : ''}</span>
                        </span>
                      ) : forn.tipoCobranca === 'Faturamento Mensal (Lote / Fechamento)' || forn.diaFechamentoFatura ? (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/20 font-semibold">
                          <Layers size={11} />
                          <span>Fatura em Lote (Corte: dia {forn.diaFechamentoFatura || 20} • Venc: dia {forn.diaVencimentoPagamento || 28})</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-semibold">
                          <Sparkles size={11} />
                          <span>⚡ Débito Avulso / No Ato do Serviço</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Contact & Location Info */}
                  <div className="mt-3.5 space-y-2 text-xs text-slate-300">
                    {forn.responsavelContato && (
                      <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                        <span className="font-semibold text-slate-300">Contato:</span> {forn.responsavelContato}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      {forn.telefone && (
                        <a
                          href={`tel:${forn.telefone.replace(/\D/g, '')}`}
                          className="inline-flex items-center gap-1 text-slate-300 hover:text-blue-400 transition"
                        >
                          <Phone size={13} className="text-blue-400" />
                          <span>{forn.telefone}</span>
                        </a>
                      )}

                      {whatsappLink && (
                        <a
                          href={whatsappLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/20 transition text-[11px]"
                        >
                          <Send size={11} />
                          <span>WhatsApp</span>
                        </a>
                      )}
                    </div>

                    {forn.endereco && (
                      <p className="text-[11px] text-slate-400 flex items-start gap-1.5 pt-1">
                        <MapPin size={13} className="text-slate-500 shrink-0 mt-0.5" />
                        <span className="truncate">
                          {forn.endereco} {forn.cidadeUf ? `• ${forn.cidadeUf}` : ''}
                        </span>
                      </p>
                    )}

                    {/* PIX Key Box */}
                    {forn.chavePix && (
                      <div className="mt-2 p-2 bg-[#16171e] rounded-xl border border-white/5 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-[9px] text-purple-400 uppercase font-bold tracking-wider block">
                            Chave PIX ({forn.tipoChavePix || 'PIX'})
                          </span>
                          <span className="font-mono text-[11px] text-slate-200 truncate block">
                            {forn.chavePix}
                          </span>
                        </div>
                        <button
                          onClick={() => handleCopyPix(forn.chavePix!, forn.id)}
                          className="px-2 py-1 bg-white/5 hover:bg-white/10 text-slate-300 rounded text-[10px] font-semibold flex items-center gap-1 transition shrink-0"
                          title="Copiar Chave PIX"
                        >
                          {copiedPixId === forn.id ? (
                            <>
                              <Check size={12} className="text-emerald-400" />
                              <span className="text-emerald-400">Copiado</span>
                            </>
                          ) : (
                            <>
                              <Copy size={12} />
                              <span>Copiar</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {forn.observacoes && (
                      <p className="text-[11px] text-slate-400 italic bg-white/[0.02] p-2 rounded-lg border border-white/5 mt-2">
                        "{forn.observacoes}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Bottom Section: Veículos em Serviço no Parceiro */}
                <div className="mt-4 pt-3 border-t border-white/5">
                  {uniqueCarros.length > 0 ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-amber-400 flex items-center gap-1">
                          <Car size={13} /> {uniqueCarros.length} veículo{uniqueCarros.length > 1 ? 's' : ''} no local
                        </span>
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded">
                          Em Atendimento
                        </span>
                      </div>

                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {uniqueCarros.map((car) => (
                          <div
                            key={car.id}
                            className="bg-[#16171e] hover:bg-white/5 p-2 rounded-xl border border-white/5 flex items-center justify-between gap-2 text-xs transition group"
                          >
                            <div
                              onClick={() => onOpenDossie(car)}
                              className="min-w-0 flex-1 cursor-pointer"
                              title="Clique para ver o dossiê do veículo"
                            >
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-white truncate block group-hover:text-blue-400 transition">{car.modelo}</span>
                                <span className="font-mono text-[10px] text-slate-400 bg-black/40 px-1 py-0.5 rounded border border-white/5">{car.placa}</span>
                              </div>
                              <span className="text-[10px] text-blue-400 font-semibold truncate block mt-0.5">
                                {car.servicoAtualEmAndamento || 'Em Preparação'}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => handleRetornarAoPatio(e, car)}
                                disabled={retornandoCarroId === car.id}
                                title="Concluir serviço e retornar veículo ao Pátio da loja (Showroom Liberado)"
                                className="px-2 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1 transition shadow-sm cursor-pointer disabled:opacity-50"
                              >
                                {retornandoCarroId === car.id ? (
                                  <Loader2 size={11} className="animate-spin" />
                                ) : (
                                  <MapPin size={11} />
                                )}
                                <span>Retornar ao Pátio</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => onOpenDossie(car)}
                                title="Ver Dossiê Completo"
                                className="p-1 text-slate-400 hover:text-white rounded hover:bg-white/5 transition"
                              >
                                <Eye size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="flex items-center gap-1 text-[11px]">
                        <CheckCircle2 size={13} className="text-slate-600" />
                        Nenhum veículo em serviço no momento
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
