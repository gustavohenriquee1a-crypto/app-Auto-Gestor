import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  Car, 
  Edit3, 
  Trash2, 
  DollarSign, 
  Key, 
  Tag, 
  Copy, 
  Check, 
  Clock, 
  LayoutGrid, 
  List, 
  Sparkles,
  ArrowUpDown,
  AlertCircle,
  FileText,
  SlidersHorizontal,
  RotateCcw,
  X,
  ShieldCheck,
  AlertTriangle,
  Award,
  FileSpreadsheet,
  Download,
  Compass,
  ClipboardCheck,
  Palette,
  TrendingUp
} from 'lucide-react';
import { Veiculo, StatusVeiculo, Usuario, VendaVeiculo } from '../types';
import { 
  formatCurrency, 
  formatDate, 
  formatKm, 
  calculateAging, 
  calculateTotalDespesas, 
  calculateCustoTotal,
  checkIsVeiculoVendido,
  isVeiculoLocacao
} from '../utils/formatters';
import { CreatableSelect } from './CreatableSelect';
import {
  subscribeMarcas,
  subscribeCores,
  saveMarcaFirestore,
  saveCorFirestore,
  DEFAULT_MARCAS,
  DEFAULT_CORES
} from '../services/firestoreService';

interface EstoqueViewProps {
  veiculos: Veiculo[];
  vendas?: VendaVeiculo[];
  currentUser?: Usuario | null;
  onOpenDossie: (veiculo: Veiculo) => void;
  onOpenNovoVeiculo: () => void;
  onOpenNovaDespesa: (veiculo?: Veiculo) => void;
  onOpenNovoContrato: (veiculo?: Veiculo) => void;
  onOpenVenda: (veiculo: Veiculo) => void;
  onDeleteVeiculo: (id: string) => void;
  onEditVeiculo: (veiculo: Veiculo) => void;
  onOpenTestDrive?: (veiculo: Veiculo) => void;
  onOpenVistoria?: (veiculo: Veiculo) => void;
  onOpenDetalhesLocacao?: (veiculo: Veiculo) => void;
}

export const EstoqueView: React.FC<EstoqueViewProps> = ({
  veiculos,
  vendas = [],
  currentUser,
  onOpenDossie,
  onOpenNovoVeiculo,
  onOpenNovaDespesa,
  onOpenNovoContrato,
  onOpenVenda,
  onDeleteVeiculo,
  onEditVeiculo,
  onOpenTestDrive,
  onOpenVistoria,
  onOpenDetalhesLocacao,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [finalidadeFilter, setFinalidadeFilter] = useState<'todos' | 'venda' | 'locacao'>('todos');
  const [statusFilter, setStatusFilter] = useState<string>('Todos');
  const [marcaFilter, setMarcaFilter] = useState<string>('Todas');
  const [corFilter, setCorFilter] = useState<string>('Todas');
  const [tipoPropriedadeFilter, setTipoPropriedadeFilter] = useState<string>('Todos');
  const [notaEntradaFilter, setNotaEntradaFilter] = useState<string>('Todos');
  const [combustivelFilter, setCombustivelFilter] = useState<string>('Todos');
  const [agingFilter, setAgingFilter] = useState<string>('Todos');
  const [anoMin, setAnoMin] = useState<number | ''>('');
  const [anoMax, setAnoMax] = useState<number | ''>('');
  const [precoMin, setPrecoMin] = useState<number | ''>('');
  const [precoMax, setPrecoMax] = useState<number | ''>('');
  const [faixaPrecoPreset, setFaixaPrecoPreset] = useState<string>('todos');
  const [sortOrder, setSortOrder] = useState<'recentes' | 'preco-desc' | 'preco-asc' | 'km-asc' | 'ano-desc' | 'aging-desc'>('recentes');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [copiedChassi, setCopiedChassi] = useState<string | null>(null);
  const [exportToast, setExportToast] = useState<string | null>(null);

  // Listas de Marcas e Cores (Sincronizadas com Firestore / Cache Local)
  const [marcasList, setMarcasList] = useState<string[]>(() => {
    try {
      const cached = localStorage.getItem('autogestor_marcas_v1');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      // fallback
    }
    return DEFAULT_MARCAS;
  });

  const [coresList, setCoresList] = useState<string[]>(() => {
    try {
      const cached = localStorage.getItem('autogestor_cores_v1');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      // fallback
    }
    return DEFAULT_CORES;
  });

  useEffect(() => {
    const unsubMarcas = subscribeMarcas((list) => {
      if (list && list.length > 0) setMarcasList(list);
    });
    const unsubCores = subscribeCores((list) => {
      if (list && list.length > 0) setCoresList(list);
    });
    return () => {
      unsubMarcas();
      unsubCores();
    };
  }, []);

  const handleCreateMarca = async (newMarca: string) => {
    try {
      await saveMarcaFirestore(newMarca);
      setMarcasList((prev) => {
        if (prev.some((m) => m.toLowerCase() === newMarca.toLowerCase())) return prev;
        return [...prev, newMarca].sort((a, b) => a.localeCompare(b, 'pt-BR'));
      });
    } catch (err) {
      console.error('Erro ao salvar nova marca no Firestore:', err);
    }
  };

  const handleCreateCor = async (newCor: string) => {
    try {
      await saveCorFirestore(newCor);
      setCoresList((prev) => {
        if (prev.some((c) => c.toLowerCase() === newCor.toLowerCase())) return prev;
        return [...prev, newCor].sort((a, b) => a.localeCompare(b, 'pt-BR'));
      });
    } catch (err) {
      console.error('Erro ao salvar nova cor no Firestore:', err);
    }
  };

  const handleCopyChassi = (chassi: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(chassi);
    setCopiedChassi(chassi);
    setTimeout(() => setCopiedChassi(null), 2000);
  };

  // Exportar Estoque Atual em formato CSV
  const handleExportarEstoqueCsv = () => {
    if (filteredVeiculos.length === 0) {
      alert('Não há veículos na listagem atual para exportar.');
      return;
    }

    const headers = [
      'Placa',
      'Modelo',
      'Marca',
      'Ano/Modelo',
      'Status do Estoque',
      'Status Comercial',
      'Custo de Aquisição (R$)',
      'Total Despesas Oficina (R$)',
      'Custo Total Acumulado (R$)',
      'Preço Sugerido Venda (R$)',
      'Margem Bruta Estimada (R$)',
      'Dias em Pátio (Aging)',
      'Chassi',
      'KM Atual',
      'Combustível',
      'Cor',
      'Nota Fiscal de Entrada',
      'Data de Entrada no Pátio',
      'Origem Compra',
      'Fornecedor / Oficina Atual',
      'Serviço em Andamento',
    ];

    const rows = filteredVeiculos.map((v) => {
      const custoAquisicao = Number(v.custoAquisicao) || 0;
      const totalDespesas = calculateTotalDespesas(v.despesas);
      const custoTotal = calculateCustoTotal(v);
      const valorVenda = Number(v.valorVendaSugerido) || 0;
      const margemEstimada = valorVenda > 0 ? valorVenda - custoTotal : 0;
      const agingInfo = calculateAging(v);
      const statusEstoque = v.status_estoque || (v.status === 'Em Preparação' ? 'Em Preparação' : v.status === 'Vendido' ? 'Vendido' : 'No Pátio');

      return [
        `"${v.placa || ''}"`,
        `"${(v.modelo || '').replace(/"/g, '""')}"`,
        `"${(v.marca || '').replace(/"/g, '""')}"`,
        `"${v.anoFabricacao ? `${v.anoFabricacao}/${v.anoModelo || v.ano}` : (v.anoModelo || v.ano || '')}"`,
        `"${statusEstoque}"`,
        `"${v.status || ''}"`,
        custoAquisicao.toFixed(2).replace('.', ','),
        totalDespesas.toFixed(2).replace('.', ','),
        custoTotal.toFixed(2).replace('.', ','),
        valorVenda.toFixed(2).replace('.', ','),
        margemEstimada.toFixed(2).replace('.', ','),
        agingInfo.dias,
        `"${v.chassi || ''}"`,
        v.kmAtual || 0,
        `"${v.combustivel || ''}"`,
        `"${v.cor || ''}"`,
        `"${v.notaEntradaGerada ? (v.notaEntradaNumero ? `NF ${v.notaEntradaNumero}` : 'Gerada') : 'Pendente'}"`,
        `"${v.dataEntradaPatio ? formatDate(v.dataEntradaPatio) : (v.dataEntrada ? formatDate(v.dataEntrada) : '-')}"`,
        `"${(v.origem_compra || '').replace(/"/g, '""')}"`,
        `"${(v.fornecedorAtualNome || '').replace(/"/g, '""')}"`,
        `"${(v.servicoAtualEmAndamento || '').replace(/"/g, '""')}"`,
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dataHoje = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `estoque_atual_${dataHoje}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setExportToast(`Estoque exportado com sucesso! (${filteredVeiculos.length} veículos no arquivo CSV)`);
    setTimeout(() => setExportToast(null), 3500);
  };

  // Filtro de estoque ativo de pátio por chassi: mantém todos os carros (venda e frota de locação)
  // Veículos vendidos são excluídos do estoque ativo
  const veiculosEstoqueAtivo = useMemo(() => {
    return veiculos.filter((v) => {
      if (checkIsVeiculoVendido(v, vendas)) return false;
      return true;
    });
  }, [veiculos, vendas]);

  const countVenda = useMemo(() => {
    return veiculosEstoqueAtivo.filter((v) => !isVeiculoLocacao(v) && v.tipoOperacao !== 'Locacao').length;
  }, [veiculosEstoqueAtivo]);

  const countLocacao = useMemo(() => {
    return veiculosEstoqueAtivo.filter((v) => isVeiculoLocacao(v) || v.tipoOperacao === 'Locacao').length;
  }, [veiculosEstoqueAtivo]);

  // Dynamic Brand & Color options with stock counts
  const brandOptions = useMemo(() => {
    const brandsMap = new Map<string, number>();
    veiculosEstoqueAtivo.forEach((v) => {
      if (v.marca) {
        const key = v.marca.trim().toLowerCase();
        brandsMap.set(key, (brandsMap.get(key) || 0) + 1);
      }
    });

    const allBrandsSet = new Set<string>();
    marcasList.forEach((m) => allBrandsSet.add(m.trim()));
    veiculosEstoqueAtivo.forEach((v) => {
      if (v.marca) allBrandsSet.add(v.marca.trim());
    });

    return Array.from(allBrandsSet)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, 'pt-BR'))
      .map((marca) => {
        const count = brandsMap.get(marca.toLowerCase()) || 0;
        return {
          value: marca,
          label: count > 0 ? `${marca} (${count})` : marca,
        };
      });
  }, [veiculosEstoqueAtivo, marcasList]);

  const colorOptions = useMemo(() => {
    const colorsMap = new Map<string, number>();
    veiculosEstoqueAtivo.forEach((v) => {
      if (v.cor) {
        const key = v.cor.trim().toLowerCase();
        colorsMap.set(key, (colorsMap.get(key) || 0) + 1);
      }
    });

    const allColorsSet = new Set<string>();
    coresList.forEach((c) => allColorsSet.add(c.trim()));
    veiculosEstoqueAtivo.forEach((v) => {
      if (v.cor) allColorsSet.add(v.cor.trim());
    });

    return Array.from(allColorsSet)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, 'pt-BR'))
      .map((cor) => {
        const count = colorsMap.get(cor.toLowerCase()) || 0;
        return {
          value: cor,
          label: count > 0 ? `${cor} (${count})` : cor,
        };
      });
  }, [veiculosEstoqueAtivo, coresList]);

  // Unique Years
  const uniqueAnos = useMemo(() => {
    const anos = new Set<number>();
    veiculosEstoqueAtivo.forEach((v) => {
      if (v.anoModelo) anos.add(v.anoModelo);
      else if (v.ano) anos.add(v.ano);
    });
    return Array.from(anos).sort((a, b) => b - a);
  }, [veiculosEstoqueAtivo]);

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchTerm.trim()) count++;
    if (statusFilter !== 'Todos') count++;
    if (marcaFilter !== 'Todas' && marcaFilter !== '') count++;
    if (corFilter !== 'Todas' && corFilter !== '') count++;
    if (tipoPropriedadeFilter !== 'Todos') count++;
    if (notaEntradaFilter !== 'Todos') count++;
    if (combustivelFilter !== 'Todos') count++;
    if (agingFilter !== 'Todos') count++;
    if (anoMin !== '' || anoMax !== '') count++;
    if (precoMin !== '' || precoMax !== '' || faixaPrecoPreset !== 'todos') count++;
    return count;
  }, [searchTerm, statusFilter, marcaFilter, corFilter, tipoPropriedadeFilter, notaEntradaFilter, combustivelFilter, agingFilter, anoMin, anoMax, precoMin, precoMax, faixaPrecoPreset]);

  const handlePricePreset = (preset: string) => {
    setFaixaPrecoPreset(preset);
    if (preset === 'todos') {
      setPrecoMin('');
      setPrecoMax('');
    } else if (preset === 'ate-30k') {
      setPrecoMin('');
      setPrecoMax(30000);
    } else if (preset === '30k-50k') {
      setPrecoMin(30000);
      setPrecoMax(50000);
    } else if (preset === '50k-80k') {
      setPrecoMin(50000);
      setPrecoMax(80000);
    } else if (preset === '80k-120k') {
      setPrecoMin(80000);
      setPrecoMax(120000);
    } else if (preset === 'acima-120k') {
      setPrecoMin(120000);
      setPrecoMax('');
    }
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('Todos');
    setMarcaFilter('Todas');
    setCorFilter('Todas');
    setTipoPropriedadeFilter('Todos');
    setNotaEntradaFilter('Todos');
    setCombustivelFilter('Todos');
    setAgingFilter('Todos');
    setAnoMin('');
    setAnoMax('');
    setPrecoMin('');
    setPrecoMax('');
    setFaixaPrecoPreset('todos');
    setSortOrder('recentes');
  };

  const statusCounts = useMemo(() => {
    return {
      todos: veiculosEstoqueAtivo.length,
      disponivel: veiculosEstoqueAtivo.filter((v) => v.status === 'Disponível').length,
      preparacao: veiculosEstoqueAtivo.filter((v) => v.status === 'Em Preparação').length,
      manutencao: veiculosEstoqueAtivo.filter((v) => v.status === 'Em Manutenção').length,
    };
  }, [veiculosEstoqueAtivo]);

  const filteredVeiculos = useMemo(() => {
    return veiculosEstoqueAtivo
      .filter((v) => {
        // Filtro rápido de finalidade: Venda vs Frota de Locação
        if (finalidadeFilter === 'venda') {
          if (isVeiculoLocacao(v) || v.tipoOperacao === 'Locacao') return false;
        } else if (finalidadeFilter === 'locacao') {
          if (!isVeiculoLocacao(v) && v.tipoOperacao !== 'Locacao') return false;
        }

        const matchesSearch =
          v.modelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
          v.marca.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (v.cor && v.cor.toLowerCase().includes(searchTerm.toLowerCase())) ||
          v.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
          v.chassi.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (v.motorizacao && v.motorizacao.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (v.cambio && v.cambio.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (v.localizacaoPatio && v.localizacaoPatio.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesStatus = statusFilter === 'Todos' || v.status === statusFilter;
        const matchesMarca = marcaFilter === 'Todas' || !marcaFilter || v.marca?.toLowerCase() === marcaFilter.toLowerCase();
        const matchesCor = corFilter === 'Todas' || !corFilter || v.cor?.toLowerCase() === corFilter.toLowerCase();
        const matchesPropriedade = tipoPropriedadeFilter === 'Todos' || (v.tipoPropriedade || 'proprio') === tipoPropriedadeFilter;
        
        const isNotaEmitida = v.notaEntradaGerada !== false;
        const matchesNota = 
          notaEntradaFilter === 'Todos' ||
          (notaEntradaFilter === 'emitida' && isNotaEmitida) ||
          (notaEntradaFilter === 'pendente' && !isNotaEmitida);

        const matchesCombustivel = combustivelFilter === 'Todos' || v.combustivel === combustivelFilter;

        // Aging
        let matchesAging = true;
        if (agingFilter !== 'Todos') {
          const dias = calculateAging(v.dataEntrada).dias;
          if (agingFilter === '0-15') matchesAging = dias <= 15;
          else if (agingFilter === '16-30') matchesAging = dias > 15 && dias <= 30;
          else if (agingFilter === '31-60') matchesAging = dias > 30 && dias <= 60;
          else if (agingFilter === '60+') matchesAging = dias > 60;
        }

        // Ano (compara anoModelo ou ano)
        const anoComparacao = v.anoModelo || v.ano || 0;
        const matchesAnoMin = anoMin === '' || anoComparacao >= Number(anoMin);
        const matchesAnoMax = anoMax === '' || anoComparacao <= Number(anoMax);

        // Preço
        const custoTotal = calculateCustoTotal(v);
        const precoComparacao = v.valorVendaSugerido || custoTotal;
        const matchesPrecoMin = precoMin === '' || precoComparacao >= Number(precoMin);
        const matchesPrecoMax = precoMax === '' || precoComparacao <= Number(precoMax);

        return (
          matchesSearch &&
          matchesStatus &&
          matchesMarca &&
          matchesCor &&
          matchesPropriedade &&
          matchesNota &&
          matchesCombustivel &&
          matchesAging &&
          matchesAnoMin &&
          matchesAnoMax &&
          matchesPrecoMin &&
          matchesPrecoMax
        );
      })
      .sort((a, b) => {
        if (sortOrder === 'recentes') {
          return new Date(b.dataEntrada).getTime() - new Date(a.dataEntrada).getTime();
        }
        if (sortOrder === 'preco-desc') {
          const pA = a.valorVendaSugerido || calculateCustoTotal(a);
          const pB = b.valorVendaSugerido || calculateCustoTotal(b);
          return pB - pA;
        }
        if (sortOrder === 'preco-asc') {
          const pA = a.valorVendaSugerido || calculateCustoTotal(a);
          const pB = b.valorVendaSugerido || calculateCustoTotal(b);
          return pA - pB;
        }
        if (sortOrder === 'km-asc') {
          return (a.kmAtual || 0) - (b.kmAtual || 0);
        }
        if (sortOrder === 'ano-desc') {
          return (b.anoModelo || b.ano || 0) - (a.anoModelo || a.ano || 0);
        }
        if (sortOrder === 'aging-desc') {
          return calculateAging(b.dataEntrada).dias - calculateAging(a.dataEntrada).dias;
        }
        return 0;
      });
  }, [
    veiculosEstoqueAtivo,
    finalidadeFilter,
    searchTerm,
    statusFilter,
    marcaFilter,
    tipoPropriedadeFilter,
    notaEntradaFilter,
    combustivelFilter,
    agingFilter,
    anoMin,
    anoMax,
    precoMin,
    precoMax,
    sortOrder,
  ]);

  // Summary Metrics of Filtered Vehicles
  const totalCustoEstoque = useMemo(() => {
    return filteredVeiculos.reduce((sum, v) => sum + calculateCustoTotal(v), 0);
  }, [filteredVeiculos]);

  const totalSemNota = useMemo(() => {
    return veiculosEstoqueAtivo.filter((v) => v.notaEntradaGerada === false).length;
  }, [veiculosEstoqueAtivo]);

  return (
    <div className="space-y-6 animate-fadeIn text-slate-200">
      {/* Toast Notification */}
      {exportToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-bold animate-bounce border border-emerald-400/40">
          <FileSpreadsheet size={16} />
          <span>{exportToast}</span>
        </div>
      )}
      
      {/* Alerta Fiscal Banner se houver carros sem nota de entrada */}
      {totalSemNota > 0 && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg shadow-rose-950/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 flex items-center justify-center text-white shrink-0 shadow-md">
              <AlertTriangle size={20} />
            </div>
            <div>
              <strong className="text-sm text-white font-bold block">
                {totalSemNota} {totalSemNota === 1 ? 'veículo está' : 'veículos estão'} sem Nota Fiscal de Entrada no Pátio!
              </strong>
              <p className="text-xs text-rose-300">
                Veículos em estoque sem nota fiscal de entrada geram alto risco de autuação e multas pesadas da fiscalização.
              </p>
            </div>
          </div>
          <button
            onClick={() => setNotaEntradaFilter('pendente')}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition self-start sm:self-center cursor-pointer shadow-sm"
          >
            Filtrar Carros sem NF-e
          </button>
        </div>
      )}

      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Estoque e Pátio</span>
            <span className="text-xs font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2.5 py-0.5 rounded-full">
              {filteredVeiculos.length} {filteredVeiculos.length === 1 ? 'carro' : 'carros'}
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Valor consolidado em pátio: <strong className="text-slate-200">{formatCurrency(totalCustoEstoque)}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center bg-[#16171f] p-1 rounded-xl border border-white/5">
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg transition ${
                viewMode === 'table' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Visualização em Tabela"
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition ${
                viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Visualização em Cards"
            >
              <LayoutGrid size={16} />
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportarEstoqueCsv}
            className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold px-3.5 py-2.5 rounded-xl flex items-center gap-2 transition cursor-pointer shadow-xs active:scale-95"
            title="Exportar listagem de veículos do estoque atual em arquivo CSV (Excel)"
          >
            <FileSpreadsheet size={16} />
            <span>Exportar Estoque Atual (CSV)</span>
          </button>

          <button
            onClick={() => onOpenNovaDespesa()}
            className="bg-[#16171f] hover:bg-white/10 text-orange-400 border border-orange-500/30 text-xs font-bold px-3.5 py-2.5 rounded-xl flex items-center gap-2 transition cursor-pointer"
          >
            <DollarSign size={16} />
            <span>Lançar Custo / Peça</span>
          </button>

          <button
            onClick={onOpenNovoVeiculo}
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-900/30 transition cursor-pointer"
          >
            <Plus size={16} />
            <span>Cadastrar Veículo</span>
          </button>
        </div>
      </div>

      {/* 2. Filter & Search Panel */}
      <div className="bg-[#111116] p-4 rounded-2xl border border-white/5 space-y-3.5">
        {/* Quick Filter: Finalidade Operacional (Venda vs Frota de Locação) */}
        <div className="p-1.5 bg-[#16171f] rounded-2xl border border-white/5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setFinalidadeFilter('todos')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                finalidadeFilter === 'todos'
                  ? 'bg-white/15 text-white border border-white/20 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Car size={14} />
              <span>Estoque Completo</span>
              <span className="px-2 py-0.5 rounded-full bg-white/10 text-white text-[10px] font-mono font-bold">
                {veiculosEstoqueAtivo.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFinalidadeFilter('venda')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                finalidadeFilter === 'venda'
                  ? 'bg-emerald-600 text-white border border-emerald-500 shadow-sm shadow-emerald-950/40'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Tag size={14} className={finalidadeFilter === 'venda' ? 'text-white' : 'text-emerald-400'} />
              <span>Venda (Disponíveis / Preparação)</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                finalidadeFilter === 'venda' ? 'bg-emerald-700 text-white' : 'bg-emerald-500/10 text-emerald-400'
              }`}>
                {countVenda}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFinalidadeFilter('locacao')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                finalidadeFilter === 'locacao'
                  ? 'bg-blue-600 text-white border border-blue-500 shadow-sm shadow-blue-950/40'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Key size={14} className={finalidadeFilter === 'locacao' ? 'text-white' : 'text-blue-400'} />
              <span>Frota de Locação</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                finalidadeFilter === 'locacao' ? 'bg-blue-700 text-white' : 'bg-blue-500/10 text-blue-400'
              }`}>
                {countLocacao}
              </span>
            </button>
          </div>

          <div className="text-[11px] text-slate-400 px-2 py-1 bg-black/20 rounded-lg hidden lg:flex items-center gap-1.5 border border-white/5">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span>Frota separada com métricas de ROI e Mini-ERP</span>
          </div>
        </div>

        {/* Quick Status Selection Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setStatusFilter('Todos')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'Todos'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-[#16171f] text-slate-400 hover:text-white border border-white/5'
            }`}
          >
            <span>Todos os Veículos</span>
            <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${
              statusFilter === 'Todos' ? 'bg-blue-700 text-white' : 'bg-white/5 text-slate-400'
            }`}>
              {statusCounts.todos}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('Disponível')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'Disponível'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-[#16171f] text-slate-400 hover:text-emerald-400 border border-white/5'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Disponíveis</span>
            <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${
              statusFilter === 'Disponível' ? 'bg-emerald-700 text-white' : 'bg-emerald-500/10 text-emerald-400'
            }`}>
              {statusCounts.disponivel}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('Em Preparação')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'Em Preparação'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-[#16171f] text-slate-400 hover:text-amber-400 border border-white/5'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>Em Preparação</span>
            <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${
              statusFilter === 'Em Preparação' ? 'bg-amber-700 text-white' : 'bg-amber-500/10 text-amber-400'
            }`}>
              {statusCounts.preparacao}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('Em Manutenção')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'Em Manutenção'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-[#16171f] text-slate-400 hover:text-rose-400 border border-white/5'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            <span>Em Manutenção</span>
            <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${
              statusFilter === 'Em Manutenção' ? 'bg-rose-700 text-white' : 'bg-rose-500/10 text-rose-400'
            }`}>
              {statusCounts.manutencao}
            </span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Bar */}
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-3 text-slate-400" size={16} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por modelo, placa, chassi, motor..."
              className="w-full pl-9 pr-4 py-2.5 bg-[#16171f] border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:border-blue-500 outline-none"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-3 text-slate-400 hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full p-2.5 bg-[#16171f] border border-white/10 rounded-xl text-xs text-slate-200 outline-none focus:border-blue-500 font-semibold"
            >
              <option value="Todos">Status: Todos</option>
              <option value="Disponível">Disponível</option>
              <option value="Em Preparação">Em Preparação</option>
              <option value="Em Manutenção">Em Manutenção</option>
            </select>
          </div>

          {/* Propriedade (Frota Própria vs Consignado) */}
          <div>
            <select
              value={tipoPropriedadeFilter}
              onChange={(e) => setTipoPropriedadeFilter(e.target.value)}
              className="w-full p-2.5 bg-[#16171f] border border-white/10 rounded-xl text-xs text-slate-200 outline-none focus:border-blue-500 font-semibold"
            >
              <option value="Todos">Origem: Todas</option>
              <option value="proprio">🚗 Frota Própria (Comprado)</option>
              <option value="consignado">🤝 Consignação (Terceiro)</option>
            </select>
          </div>

          {/* Sort Order */}
          <div>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="w-full p-2.5 bg-[#16171f] border border-white/10 rounded-xl text-xs text-slate-200 outline-none focus:border-blue-500 font-semibold"
            >
              <option value="recentes">Mais Recentes</option>
              <option value="preco-desc">Maior Preço</option>
              <option value="preco-asc">Menor Preço</option>
              <option value="ano-desc">Mais Novos (Ano)</option>
              <option value="km-asc">Menor KM</option>
              <option value="aging-desc">Mais Tempo em Pátio</option>
            </select>
          </div>
        </div>

        {/* Quick Fiscal Filter Tags & Advanced Toggle */}
        <div className="flex items-center justify-between pt-2 border-t border-white/5 flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-400 text-[11px] font-semibold">Nota de Entrada:</span>
            <button
              onClick={() => setNotaEntradaFilter('Todos')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                notaEntradaFilter === 'Todos'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setNotaEntradaFilter('emitida')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                notaEntradaFilter === 'emitida'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white/5 text-slate-400 hover:text-emerald-300'
              }`}
            >
              <Check size={12} /> Emitidas
            </button>
            <button
              onClick={() => setNotaEntradaFilter('pendente')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                notaEntradaFilter === 'pendente'
                  ? 'bg-rose-600 text-white'
                  : 'bg-white/5 text-slate-400 hover:text-rose-300'
              }`}
            >
              <AlertTriangle size={12} /> Sem Nota ({totalSemNota})
            </button>
          </div>

          <div className="flex items-center gap-2">
            {activeFiltersCount > 0 && (
              <button
                onClick={handleResetFilters}
                className="text-xs text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw size={12} /> Limpar ({activeFiltersCount})
              </button>
            )}
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="text-xs text-blue-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
            >
              <SlidersHorizontal size={13} />
              {showAdvancedFilters ? 'Ocultar Filtros Extras' : 'Mais Filtros (Marca, Ano, KM)'}
            </button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-3 border-t border-white/5 text-xs animate-fadeIn">
            <div>
              <label className="block text-slate-400 font-semibold mb-1 flex items-center justify-between">
                <span>Montadora / Marca</span>
                {marcaFilter !== 'Todas' && (
                  <button
                    onClick={() => setMarcaFilter('Todas')}
                    className="text-[10px] text-blue-400 hover:underline cursor-pointer"
                  >
                    Todas
                  </button>
                )}
              </label>
              <CreatableSelect
                value={marcaFilter === 'Todas' ? '' : marcaFilter}
                onChange={(val) => setMarcaFilter(val || 'Todas')}
                options={brandOptions}
                onCreateOption={handleCreateMarca}
                placeholder="Todas as Marcas"
                searchPlaceholder="Filtrar ou cadastrar marca..."
                emptyLabel="Todas as Marcas"
                isClearable
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1 flex items-center justify-between">
                <span>Cor do Veículo</span>
                {corFilter !== 'Todas' && (
                  <button
                    onClick={() => setCorFilter('Todas')}
                    className="text-[10px] text-blue-400 hover:underline cursor-pointer"
                  >
                    Todas
                  </button>
                )}
              </label>
              <CreatableSelect
                value={corFilter === 'Todas' ? '' : corFilter}
                onChange={(val) => setCorFilter(val || 'Todas')}
                options={colorOptions}
                onCreateOption={handleCreateCor}
                placeholder="Todas as Cores"
                searchPlaceholder="Filtrar ou cadastrar cor..."
                emptyLabel="Todas as Cores"
                isClearable
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Combustível</label>
              <select
                value={combustivelFilter}
                onChange={(e) => setCombustivelFilter(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-[#16171f] border border-white/10 text-white outline-none"
              >
                <option value="Todos">Todos os Combustíveis</option>
                <option value="Flex">Flex</option>
                <option value="Gasolina">Gasolina</option>
                <option value="Etanol">Etanol</option>
                <option value="Diesel">Diesel</option>
                <option value="Híbrido">Híbrido</option>
                <option value="Elétrico">Elétrico</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Aging em Pátio</label>
              <select
                value={agingFilter}
                onChange={(e) => setAgingFilter(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-[#16171f] border border-white/10 text-white outline-none"
              >
                <option value="Todos">Todos os Prazos</option>
                <option value="0-15">Até 15 dias</option>
                <option value="16-30">16 a 30 dias</option>
                <option value="31-60">31 a 60 dias (Alerta Amarelo)</option>
                <option value="60+">Mais de 60 dias (Crítico)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Ano Modelo (Min/Max)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="De"
                  value={anoMin}
                  onChange={(e) => setAnoMin(e.target.value ? Number(e.target.value) : '')}
                  className="w-1/2 p-2.5 rounded-xl bg-[#16171f] border border-white/10 text-white outline-none text-xs"
                />
                <input
                  type="number"
                  placeholder="Até"
                  value={anoMax}
                  onChange={(e) => setAnoMax(e.target.value ? Number(e.target.value) : '')}
                  className="w-1/2 p-2.5 rounded-xl bg-[#16171f] border border-white/10 text-white outline-none text-xs"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Vehicles List / Grid */}
      {filteredVeiculos.length === 0 ? (
        <div className="bg-[#111116] rounded-2xl p-12 text-center border border-white/5">
          <Car size={48} className="mx-auto text-slate-600 mb-3" />
          <h4 className="text-base font-bold text-slate-200">Nenhum veículo encontrado</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Não encontramos veículos correspondentes aos filtros selecionados. Tente ajustar os filtros ou cadastrar um novo veículo.
          </p>
          <button
            onClick={onOpenNovoVeiculo}
            className="mt-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-xl inline-flex items-center gap-1.5 transition cursor-pointer"
          >
            <Plus size={16} /> Cadastrar Veículo no Estoque
          </button>
        </div>
      ) : viewMode === 'table' ? (
        <div className="bg-[#111116] rounded-2xl border border-white/5 shadow-none overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#16171f] text-slate-400 uppercase font-semibold border-b border-white/5 text-[11px]">
                  <th className="py-4 px-4">Veículo & Ficha</th>
                  <th className="py-4 px-4">Placa / Chassi</th>
                  <th className="py-4 px-4">Fiscal / Origem</th>
                  <th className="py-4 px-4">Custo Compra</th>
                  <th className="py-4 px-4">Despesas Chassi</th>
                  <th className="py-4 px-4">Custo Total</th>
                  <th className="py-4 px-4">Preço Venda</th>
                  <th className="py-4 px-4">Status / Aging</th>
                  <th className="py-4 px-4 text-right">Ações & Dossiê</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredVeiculos.map((v) => {
                  const totalDesp = calculateTotalDespesas(v);
                  const custoTotal = calculateCustoTotal(v);
                  const aging = calculateAging(v.dataEntrada);
                  const isNotaEmitida = v.notaEntradaGerada !== false;
                  const fabYear = v.anoFabricacao || v.ano;
                  const modYear = v.anoModelo || v.ano;

                  return (
                    <tr
                      key={v.id}
                      onClick={() => onOpenDossie(v)}
                      className="hover:bg-white/[0.03] transition cursor-pointer group"
                    >
                      {/* Veículo & Ficha */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          {v.fotoUrl && (
                            <img
                              src={v.fotoUrl}
                              alt={v.modelo}
                              className="w-12 h-10 object-cover rounded-lg border border-white/10 shrink-0 hidden sm:block"
                              referrerPolicy="no-referrer"
                            />
                          )}
                          <div>
                            <p className="font-bold text-slate-200 text-sm group-hover:text-blue-400 transition-colors flex items-center gap-1.5">
                              <span>{v.modelo}</span>
                              {(isVeiculoLocacao(v) || v.tipoOperacao === 'Locacao') ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                  <Key size={10} /> Frota Locação
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  <Tag size={10} /> Venda
                                </span>
                              )}
                            </p>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium flex-wrap mt-0.5">
                              <span>{v.marca}</span>
                              <span>•</span>
                              <strong className="text-white font-mono">{fabYear}/{modYear}</strong>
                              <span>•</span>
                              <span>{v.motorizacao || '1.0'}</span>
                              <span>•</span>
                              <span>{v.cambio || 'Manual'}</span>
                              <span>•</span>
                              <span>{formatKm(v.kmAtual)}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Placa / Chassi */}
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <span className="font-mono font-black text-slate-200 bg-white/5 border border-white/10 px-2 py-0.5 rounded text-xs block w-fit">
                            {v.placa}
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-400 font-mono truncate max-w-[110px]" title={v.chassi}>
                              {v.chassi}
                            </span>
                            <button
                              onClick={(e) => handleCopyChassi(v.chassi, e)}
                              className="text-slate-400 hover:text-slate-200"
                              title="Copiar Chassi"
                            >
                              {copiedChassi === v.chassi ? (
                                <Check size={12} className="text-emerald-400" />
                              ) : (
                                <Copy size={12} />
                              )}
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Fiscal / Origem */}
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                            isNotaEmitida
                              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                          }`}>
                            {isNotaEmitida ? <Check size={10} /> : <AlertTriangle size={10} />}
                            {isNotaEmitida ? 'NF-e OK' : 'SEM NOTA'}
                          </span>

                          <span className={`block text-[10px] font-medium ${
                            v.tipoPropriedade === 'consignado' ? 'text-amber-400' : 'text-slate-400'
                          }`}>
                            {v.tipoPropriedade === 'consignado' ? '🤝 Consignação' : '🚗 Próprio'}
                          </span>
                        </div>
                      </td>

                      {/* Custo Compra */}
                      <td className="py-4 px-4 font-semibold text-slate-300">
                        {formatCurrency(v.custoAquisicao)}
                      </td>

                      {/* Despesas */}
                      <td className="py-4 px-4">
                        <span className="font-bold text-amber-400">
                          {formatCurrency(totalDesp)}
                        </span>
                        <span className="block text-[10px] text-slate-400">
                          {v.despesas?.length || 0} lançamentos
                        </span>
                      </td>

                      {/* Custo Final */}
                      <td className="py-4 px-4">
                        <span className="font-black text-white text-sm">
                          {formatCurrency(custoTotal)}
                        </span>
                        <span className="block text-[10px] text-blue-400/80">
                          Custo Total
                        </span>
                      </td>

                      {/* Preço de Venda */}
                      <td className="py-4 px-4">
                        {v.status === 'Vendido' && v.venda ? (
                          <div>
                            <span className="font-black text-purple-300 text-sm">
                              {formatCurrency(v.venda.valorVenda)}
                            </span>
                            <span className="block text-[10px] font-semibold text-emerald-400">
                              Lucro: {formatCurrency(v.venda.lucroLiquido)}
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span className="font-black text-emerald-400 text-sm">
                              {formatCurrency(v.valorVendaSugerido || custoTotal * 1.2)}
                            </span>
                            {v.valorFipe && (
                              <span className="block text-[10px] text-slate-400">
                                Fipe: {formatCurrency(v.valorFipe)}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Status / Aging */}
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              v.status === 'Disponível'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : v.status === 'Alugado'
                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                                : v.status === 'Em Preparação'
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                : v.status === 'Vendido'
                                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 font-black'
                                : 'bg-white/5 text-slate-300 border-white/10'
                            }`}
                          >
                            {v.status === 'Vendido' ? '✓ Vendido (Baixa)' : v.status}
                          </span>
                          {v.status === 'Vendido' && v.venda ? (
                            <span className="block text-[10px] font-medium text-slate-300 truncate max-w-[130px]" title={`Vendido por ${v.venda.vendedorNome || 'Vendedor'}`}>
                              Por: {v.venda.vendedorNome || 'Vendedor'}
                            </span>
                          ) : (
                            <span className={`block text-[10px] font-semibold ${aging.badgeColor.replace('bg-', 'text-').split(' ')[0]}`}>
                              {aging.dias}d no pátio
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Ações */}
                      <td className="py-4 px-4 text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onOpenDossie(v)}
                          className="p-1.5 text-blue-400 hover:bg-blue-500/20 rounded-lg transition cursor-pointer"
                          title="Ver Detalhes e Dossiê Completo"
                        >
                          <FileText size={16} />
                        </button>
                        {onOpenDetalhesLocacao && (isVeiculoLocacao(v) || v.tipoOperacao === 'Locacao') && (
                          <button
                            onClick={() => onOpenDetalhesLocacao(v)}
                            className="p-1.5 text-cyan-400 hover:bg-cyan-500/20 rounded-lg transition cursor-pointer"
                            title="Métricas de Locação & ROI (Mini-ERP)"
                          >
                            <TrendingUp size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => onOpenNovaDespesa(v)}
                          className="p-1.5 text-amber-400 hover:bg-amber-500/20 rounded-lg transition cursor-pointer"
                          title="Adicionar Custo / Despesa"
                        >
                          <DollarSign size={16} />
                        </button>
                        {onOpenTestDrive && currentUser?.permissoes?.podeRealizarTestDrive !== false && (
                          <button
                            onClick={() => onOpenTestDrive(v)}
                            className="p-1.5 text-blue-400 hover:bg-blue-500/20 rounded-lg transition cursor-pointer"
                            title="Registrar Test Drive & Termo"
                          >
                            <Compass size={16} />
                          </button>
                        )}
                        {onOpenVistoria && currentUser?.permissoes?.podeFazerVistoria !== false && (
                          <button
                            onClick={() => onOpenVistoria(v)}
                            className="p-1.5 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition cursor-pointer"
                            title="Vistoria Digital de Entrada"
                          >
                            <ClipboardCheck size={16} />
                          </button>
                        )}
                        {v.status === 'Disponível' && (
                          <button
                            onClick={() => onOpenVenda(v)}
                            className="p-1.5 text-purple-400 hover:bg-purple-500/20 rounded-lg transition cursor-pointer"
                            title="Registrar Venda do Veículo"
                          >
                            <Tag size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => onEditVeiculo(v)}
                          className="p-1.5 text-slate-400 hover:bg-white/10 rounded-lg transition cursor-pointer"
                          title="Editar Dados do Veículo"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Deseja realmente remover o veículo ${v.modelo} (${v.placa})?`)) {
                              onDeleteVeiculo(v.id);
                            }
                          }}
                          className="p-1.5 text-rose-400 hover:bg-rose-500/20 rounded-lg transition cursor-pointer"
                          title="Excluir Veículo"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Grid Cards View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVeiculos.map((v) => {
            const totalDesp = calculateTotalDespesas(v);
            const custoTotal = calculateCustoTotal(v);
            const aging = calculateAging(v.dataEntrada);
            const isNotaEmitida = v.notaEntradaGerada !== false;
            const fabYear = v.anoFabricacao || v.ano;
            const modYear = v.anoModelo || v.ano;

            return (
              <div
                key={v.id}
                onClick={() => onOpenDossie(v)}
                className="bg-[#111116] rounded-2xl border border-white/5 hover:border-white/15 transition-all cursor-pointer overflow-hidden flex flex-col justify-between group shadow-lg"
              >
                <div>
                  {/* Card Header & Photo */}
                  <div className="relative h-44 bg-[#16171f] overflow-hidden">
                    {v.fotoUrl ? (
                      <img
                        src={v.fotoUrl}
                        alt={v.modelo}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600">
                        <Car size={48} />
                      </div>
                    )}

                    {/* Placa & Propriedade */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono font-black text-xs bg-black/80 backdrop-blur-md text-slate-100 px-2.5 py-1 rounded-md border border-white/10">
                        {v.placa}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-md ${
                        v.tipoPropriedade === 'consignado'
                          ? 'bg-amber-950/80 text-amber-300 border border-amber-500/30'
                          : 'bg-blue-950/80 text-blue-300 border border-blue-500/30'
                      }`}>
                        {v.tipoPropriedade === 'consignado' ? 'Consignação' : 'Próprio'}
                      </span>
                    </div>

                    {/* Status & Fiscal */}
                    <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold border backdrop-blur-md ${
                          v.status === 'Disponível'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : v.status === 'Alugado'
                            ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                            : v.status === 'Em Preparação'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            : v.status === 'Vendido'
                            ? 'bg-purple-500/30 text-purple-200 border-purple-500/50 font-black'
                            : 'bg-white/10 text-slate-300 border-white/10'
                        }`}
                      >
                        {v.status === 'Vendido' ? '✓ Vendido (Baixa)' : v.status}
                      </span>

                      {(isVeiculoLocacao(v) || v.tipoOperacao === 'Locacao') ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold border backdrop-blur-md bg-blue-950/90 text-blue-300 border-blue-500/40 flex items-center gap-1">
                          <Key size={10} /> Frota Locação
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold border backdrop-blur-md bg-emerald-950/90 text-emerald-300 border-emerald-500/40 flex items-center gap-1">
                          <Tag size={10} /> Venda
                        </span>
                      )}

                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border backdrop-blur-md ${
                        isNotaEmitida
                          ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30'
                          : 'bg-rose-950/80 text-rose-300 border-rose-500/50 animate-pulse'
                      }`}>
                        {isNotaEmitida ? '✅ NF-e OK' : '🚨 SEM NOTA'}
                      </span>
                    </div>

                    <div className="absolute bottom-2 right-2">
                      {v.status === 'Vendido' && v.venda ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold border backdrop-blur-md bg-purple-950/80 text-purple-300 border-purple-500/30">
                          Vendido por: {v.venda.vendedorNome || 'Vendedor'}
                        </span>
                      ) : (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border backdrop-blur-md ${aging.badgeColor}`}>
                          {aging.dias} dias em pátio
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-5 space-y-3">
                    <div>
                      <h4 className="font-bold text-base text-white group-hover:text-blue-400 transition-colors">
                        {v.modelo}
                      </h4>
                      <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span>{v.marca}</span>
                        <span>•</span>
                        <strong className="text-white font-mono">Ano: {fabYear}/{modYear}</strong>
                        <span>•</span>
                        <span>{v.cor}</span>
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-400">
                        <span className="bg-white/5 px-2 py-0.5 rounded border border-white/5 font-semibold text-slate-300">
                          {v.motorizacao || '1.0 Flex'}
                        </span>
                        <span className="bg-white/5 px-2 py-0.5 rounded border border-white/5 text-slate-300">
                          {v.cambio || 'Manual'}
                        </span>
                        <span className="font-mono text-slate-400">{formatKm(v.kmAtual)}</span>
                      </div>
                    </div>

                    {/* Cost Decomposition */}
                    <div className="bg-white/[0.03] p-3 rounded-xl border border-white/5 space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-400">
                        <span>Compra / Aquisição:</span>
                        <span className="font-semibold text-slate-200">{formatCurrency(v.custoAquisicao)}</span>
                      </div>
                      <div className="flex justify-between text-orange-400">
                        <span>Despesas (+{v.despesas?.length || 0} lançamentos):</span>
                        <span className="font-semibold">+{formatCurrency(totalDesp)}</span>
                      </div>
                      <div className="flex justify-between text-slate-200 pt-1.5 border-t border-white/5 font-bold">
                        <span>Custo Total:</span>
                        <span className="text-blue-400 font-mono">{formatCurrency(custoTotal)}</span>
                      </div>
                      {v.status === 'Vendido' && v.venda ? (
                        <div className="flex justify-between text-purple-300 pt-1 font-bold">
                          <span>Vendido Por:</span>
                          <span className="font-mono text-sm">{formatCurrency(v.venda.valorVenda)}</span>
                        </div>
                      ) : (
                        <div className="flex justify-between text-emerald-400 pt-1 font-bold">
                          <span>Preço de Venda Loja:</span>
                          <span className="font-mono text-sm">{formatCurrency(v.valorVendaSugerido || custoTotal * 1.2)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="p-4 bg-white/[0.02] border-t border-white/5 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onOpenDossie(v)}
                    className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition cursor-pointer"
                  >
                    Ver Dossiê e Ficha <FileText size={14} />
                  </button>

                  <div className="flex items-center gap-1">
                    {onOpenDetalhesLocacao && (isVeiculoLocacao(v) || v.tipoOperacao === 'Locacao') && (
                      <button
                        onClick={() => onOpenDetalhesLocacao(v)}
                        className="p-1.5 text-cyan-400 hover:bg-cyan-500/20 rounded-lg text-xs transition cursor-pointer"
                        title="Métricas de Locação & ROI (Mini-ERP)"
                      >
                        <TrendingUp size={15} />
                      </button>
                    )}
                    {onOpenTestDrive && currentUser?.permissoes?.podeRealizarTestDrive !== false && (
                      <button
                        onClick={() => onOpenTestDrive(v)}
                        className="p-1.5 text-blue-400 hover:bg-blue-500/20 rounded-lg text-xs transition cursor-pointer"
                        title="Registrar Test Drive & Termo"
                      >
                        <Compass size={15} />
                      </button>
                    )}
                    {onOpenVistoria && currentUser?.permissoes?.podeFazerVistoria !== false && (
                      <button
                        onClick={() => onOpenVistoria(v)}
                        className="p-1.5 text-emerald-400 hover:bg-emerald-500/20 rounded-lg text-xs transition cursor-pointer"
                        title="Vistoria Digital de Entrada"
                      >
                        <ClipboardCheck size={15} />
                      </button>
                    )}
                    <button
                      onClick={() => onOpenNovaDespesa(v)}
                      className="p-1.5 text-orange-400 hover:bg-orange-500/20 rounded-lg text-xs transition cursor-pointer"
                      title="Adicionar Despesa"
                    >
                      <DollarSign size={15} />
                    </button>
                    {v.status === 'Disponível' && (
                      <button
                        onClick={() => onOpenVenda(v)}
                        className="p-1.5 text-purple-400 hover:bg-purple-500/20 rounded-lg text-xs transition cursor-pointer"
                        title="Vender Veículo"
                      >
                        <Tag size={15} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
