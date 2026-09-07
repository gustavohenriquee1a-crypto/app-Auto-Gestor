import React, { useState, useEffect } from 'react';
import { 
  X, 
  Car, 
  Plus, 
  Sparkles, 
  Tag, 
  Calendar, 
  DollarSign, 
  CheckCircle2, 
  Layers, 
  Compass, 
  User, 
  Award,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Gauge,
  Zap,
  Sliders,
  Check,
  Clock,
  Building2,
  Wrench,
  Truck,
  Navigation,
  MapPin,
  Megaphone
} from 'lucide-react';
import { 
  Veiculo, 
  StatusVeiculo,
  StatusEstoque, 
  VendaVeiculo, 
  CanalOrigemLead, 
  TipoPropriedadeVeiculo, 
  TipoCambioVeiculo,
  FornecedorPrestador 
} from '../types';
import { formatCurrency } from '../utils/formatters';
import { CreatableSelect } from './CreatableSelect';
import {
  subscribeMarcas,
  subscribeCores,
  saveMarcaFirestore,
  saveCorFirestore,
  DEFAULT_MARCAS,
  DEFAULT_CORES
} from '../services/firestoreService';

export interface NovoVeiculoFormData {
  veiculo: Partial<Veiculo>;
  isHistoricoVendido?: boolean;
  vendaHistorica?: {
    dataVenda: string;
    valorVenda: number;
    compradorNome?: string;
    compradorCpf?: string;
    vendedorNome?: string;
    canalOrigem?: CanalOrigemLead;
    formaPagamento?: 'À Vista PIX' | 'Financiamento' | 'Troca + Volta' | 'Cartão' | 'Dinheiro' | 'Composição Híbrida';
    comissaoValor?: number;
    observacoesVenda?: string;
  };
}

interface ModalNovoVeiculoProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Veiculo> & { isHistoricoVendido?: boolean; vendaHistorica?: any }) => void;
  veiculoToEdit?: Veiculo | null;
  fornecedores?: FornecedorPrestador[];
}

export const ModalNovoVeiculo: React.FC<ModalNovoVeiculoProps> = ({
  isOpen,
  onClose,
  onSave,
  veiculoToEdit,
  fornecedores = [],
}) => {
  // Modo de cadastro: 'estoque' ou 'historico_vendido'
  const [modoCadastro, setModoCadastro] = useState<'estoque' | 'historico_vendido'>('estoque');

  // Campos Básicos do Veículo
  const [modelo, setModelo] = useState('');
  const [marca, setMarca] = useState('Chevrolet');
  const [anoFabricacao, setAnoFabricacao] = useState<number | string>(new Date().getFullYear());
  const [anoModelo, setAnoModelo] = useState<number | string>(new Date().getFullYear());
  const [cor, setCor] = useState('Prata');
  const [placa, setPlaca] = useState('');

  // Listas dinâmicas de Marcas e Cores (Sincronizadas com Firestore / Cache Local)
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
  const [chassi, setChassi] = useState('');
  const [renavam, setRenavam] = useState('');
  const [proprietarioNome, setProprietarioNome] = useState('');
  const [proprietarioDocumento, setProprietarioDocumento] = useState('');
  const [proprietarioTelefone, setProprietarioTelefone] = useState('');
  const [combustivel, setCombustivel] = useState<'Flex' | 'Gasolina' | 'Etanol' | 'Diesel' | 'Híbrido' | 'Elétrico'>('Flex');
  const [tipoPropriedade, setTipoPropriedade] = useState<TipoPropriedadeVeiculo>('proprio');
  const [cambio, setCambio] = useState<TipoCambioVeiculo>('Manual');
  const [motorizacao, setMotorizacao] = useState('1.0 Flex');
  const [potencia, setPotencia] = useState('');
  
  // Fiscal / Nota de Entrada
  const [notaEntradaGerada, setNotaEntradaGerada] = useState<boolean>(true);
  const [notaEntradaNumero, setNotaEntradaNumero] = useState('');
  const [notaEntradaData, setNotaEntradaData] = useState(new Date().toISOString().split('T')[0]);
  const [notaEntradaChave, setNotaEntradaChave] = useState('');
  const [notaEntradaObs, setNotaEntradaObs] = useState('');

  // KM e Pátio
  const [kmAtual, setKmAtual] = useState<number | string>(30000);
  const [kmUltimaRevisao, setKmUltimaRevisao] = useState<number | string>(30000);
  const [status, setStatus] = useState<StatusVeiculo>('Disponível');
  const [localizacaoPatio, setLocalizacaoPatio] = useState('Pátio Principal');
  const [fotoUrl, setFotoUrl] = useState('');

  // Fornecedor / Parceiros e Preparações
  const [fornecedorOrigemId, setFornecedorOrigemId] = useState('');
  const [fornecedorOrigemNome, setFornecedorOrigemNome] = useState('');
  const [fornecedorAtualId, setFornecedorAtualId] = useState('');
  const [fornecedorAtualNome, setFornecedorAtualNome] = useState('');
  const [servicoAtualEmAndamento, setServicoAtualEmAndamento] = useState('');
  const [dataEnvioOficina, setDataEnvioOficina] = useState('');
  const [previsaoRetornoOficina, setPrevisaoRetornoOficina] = useState('');
  const [statusPreparacaoOficina, setStatusPreparacaoOficina] = useState<'Aguardando Envio' | 'Em Oficina' | 'Pronto / Retornado'>('Aguardando Envio');
  const [custoEstimadoServico, setCustoEstimadoServico] = useState<number | string>('');

  // Logística e Recebimento de Carros de Fora
  const [statusEstoque, setStatusEstoque] = useState<StatusEstoque>('No Pátio');
  const [origemCompra, setOrigemCompra] = useState('');
  const [previsaoChegada, setPrevisaoChegada] = useState('');
  const [previsaoTerminoPreparacao, setPrevisaoTerminoPreparacao] = useState('');
  const [transportadoraGuincho, setTransportadoraGuincho] = useState('');
  const [telefoneTransportadora, setTelefoneTransportadora] = useState('');
  const [custoFreteTransporte, setCustoFreteTransporte] = useState<number | string>('');
  const [taxasOrigem, setTaxasOrigem] = useState<number | string>('');

  // Valores Financeiros & Datas de Entrada
  const [custoAquisicao, setCustoAquisicao] = useState<number | string>(50000);
  const [valorVendaSugerido, setValorVendaSugerido] = useState<number | string>(59500);
  const [valorFipe, setValorFipe] = useState<number | string>(60000);
  const [dataAquisicao, setDataAquisicao] = useState(new Date().toISOString().split('T')[0]);
  const [dataEntradaPatio, setDataEntradaPatio] = useState(new Date().toISOString().split('T')[0]);
  const [baseCalculoAging, setBaseCalculoAging] = useState<'dataEntradaPatio' | 'dataAquisicao'>('dataEntradaPatio');
  const [dataEntrada, setDataEntrada] = useState(new Date().toISOString().split('T')[0]);

  // Campos de Venda Retroativa (quando for Histórico Vendido)
  const [dataVendaRetroativa, setDataVendaRetroativa] = useState(new Date().toISOString().split('T')[0]);
  const [valorVendaRetroativa, setValorVendaRetroativa] = useState<number | string>(60000);
  const [compradorNome, setCompradorNome] = useState('Cliente Particular');
  const [compradorCpf, setCompradorCpf] = useState('');
  const [vendedorNome, setVendedorNome] = useState('');
  const [canalOrigem, setCanalOrigem] = useState<CanalOrigemLead>('Passante/Pátio');
  const [formaPagamento, setFormaPagamento] = useState<'À Vista PIX' | 'Financiamento' | 'Troca + Volta' | 'Cartão' | 'Dinheiro' | 'Composição Híbrida'>('À Vista PIX');
  const [comissaoVenda, setComissaoVenda] = useState<number | string>(500);
  const [observacoesHistorico, setObservacoesHistorico] = useState('');

  // Divulgação & Marketing
  const [anuncioAtivo, setAnuncioAtivo] = useState(false);
  const [plataformasAnuncio, setPlataformasAnuncio] = useState<string[]>([]);

  useEffect(() => {
    if (veiculoToEdit) {
      setModoCadastro(veiculoToEdit.status === 'Vendido' ? 'historico_vendido' : 'estoque');
      setModelo(veiculoToEdit.modelo || '');
      setMarca(veiculoToEdit.marca || 'Chevrolet');
      setAnoFabricacao(veiculoToEdit.anoFabricacao || veiculoToEdit.ano || 2023);
      setAnoModelo(veiculoToEdit.anoModelo || veiculoToEdit.ano || 2023);
      setCor(veiculoToEdit.cor || 'Prata');
      setPlaca(veiculoToEdit.placa || '');
      setChassi(veiculoToEdit.chassi || '');
      setRenavam(veiculoToEdit.renavam || '');
      setProprietarioNome(veiculoToEdit.proprietarioAnterior?.nome || '');
      setProprietarioDocumento(veiculoToEdit.proprietarioAnterior?.documento || '');
      setProprietarioTelefone(veiculoToEdit.proprietarioAnterior?.telefone || '');
      setCombustivel(veiculoToEdit.combustivel || 'Flex');
      setTipoPropriedade(veiculoToEdit.tipoPropriedade || 'proprio');
      setCambio(veiculoToEdit.cambio || 'Manual');
      setMotorizacao(veiculoToEdit.motorizacao || '1.0 Flex');
      setPotencia(veiculoToEdit.potencia || '');
      
      setNotaEntradaGerada(veiculoToEdit.notaEntradaGerada !== false);
      setNotaEntradaNumero(veiculoToEdit.notaEntradaNumero || '');
      setNotaEntradaData(veiculoToEdit.notaEntradaData || veiculoToEdit.dataEntrada || new Date().toISOString().split('T')[0]);
      setNotaEntradaChave(veiculoToEdit.notaEntradaChave || '');
      setNotaEntradaObs(veiculoToEdit.notaEntradaObs || '');

      setKmAtual(veiculoToEdit.kmAtual ?? 30000);
      setKmUltimaRevisao(veiculoToEdit.kmUltimaRevisao ?? 30000);
      setCustoAquisicao(veiculoToEdit.custoAquisicao ?? 50000);
      setValorVendaSugerido(veiculoToEdit.valorVendaSugerido || 0);
      setValorFipe(veiculoToEdit.valorFipe || 0);
      const initialAcq = veiculoToEdit.dataAquisicao || veiculoToEdit.dataEntrada || new Date().toISOString().split('T')[0];
      const initialPatio = veiculoToEdit.dataEntradaPatio || veiculoToEdit.dataEntrada || initialAcq;
      setDataAquisicao(initialAcq);
      setDataEntradaPatio(initialPatio);
      setBaseCalculoAging(veiculoToEdit.baseCalculoAging || 'dataEntradaPatio');
      setDataEntrada(initialPatio);
      setStatus(veiculoToEdit.status || 'Disponível');
      setLocalizacaoPatio(veiculoToEdit.localizacaoPatio || 'Pátio Principal');
      setFotoUrl(veiculoToEdit.fotoUrl || '');

      setFornecedorOrigemId(veiculoToEdit.fornecedorOrigemId || '');
      setFornecedorOrigemNome(veiculoToEdit.fornecedorOrigemNome || '');
      setFornecedorAtualId(veiculoToEdit.fornecedorAtualId || '');
      setFornecedorAtualNome(veiculoToEdit.fornecedorAtualNome || '');
      setServicoAtualEmAndamento(veiculoToEdit.servicoAtualEmAndamento || '');
      setDataEnvioOficina(veiculoToEdit.dataEnvioOficina || '');
      setPrevisaoRetornoOficina(veiculoToEdit.previsaoRetornoOficina || '');
      setStatusPreparacaoOficina(veiculoToEdit.statusPreparacaoOficina || 'Aguardando Envio');
      setCustoEstimadoServico(veiculoToEdit.custoEstimadoServico ?? '');

      // Logística
      setStatusEstoque(veiculoToEdit.status_estoque || (veiculoToEdit.status === 'Vendido' ? 'Vendido' : veiculoToEdit.status === 'Em Preparação' ? 'Em Preparação' : 'No Pátio'));
      setOrigemCompra(veiculoToEdit.origem_compra || '');
      setPrevisaoChegada(veiculoToEdit.previsao_chegada || '');
      setPrevisaoTerminoPreparacao(veiculoToEdit.previsao_termino_preparacao || veiculoToEdit.previsaoRetornoOficina || '');
      setTransportadoraGuincho(veiculoToEdit.transportadora_guincho || '');
      setTelefoneTransportadora(veiculoToEdit.telefone_transportadora || '');
      setCustoFreteTransporte(veiculoToEdit.custo_frete_transporte ?? '');
      setTaxasOrigem(veiculoToEdit.taxas_origem ?? '');
      setAnuncioAtivo(veiculoToEdit.anuncioAtivo ?? false);
      setPlataformasAnuncio(veiculoToEdit.plataformasAnuncio || []);

      if (veiculoToEdit.venda) {
        setDataVendaRetroativa(veiculoToEdit.venda.dataVenda || new Date().toISOString().split('T')[0]);
        setValorVendaRetroativa(veiculoToEdit.venda.valorVenda || 60000);
        setCompradorNome(veiculoToEdit.venda.compradorNome || 'Cliente');
        setCompradorCpf(veiculoToEdit.venda.compradorCpf || '');
        setVendedorNome(veiculoToEdit.venda.vendedorNome || '');
        setCanalOrigem(veiculoToEdit.venda.canalOrigem || 'Passante/Pátio');
        setFormaPagamento(veiculoToEdit.venda.formaPagamento || 'À Vista PIX');
        setComissaoVenda(veiculoToEdit.venda.comissaoValor || 0);
      }
    } else {
      // Reset Default
      setModoCadastro('estoque');
      setModelo('');
      setMarca('Chevrolet');
      const currentYear = new Date().getFullYear();
      setAnoFabricacao(currentYear);
      setAnoModelo(currentYear);
      setCor('Prata');
      setPlaca('');
      setChassi('');
      setRenavam('');
      setProprietarioNome('');
      setProprietarioDocumento('');
      setProprietarioTelefone('');
      setCombustivel('Flex');
      setTipoPropriedade('proprio');
      setCambio('Manual');
      setMotorizacao('1.0 Flex');
      setPotencia('116 CV');
      
      setNotaEntradaGerada(true);
      setNotaEntradaNumero('');
      setNotaEntradaData(new Date().toISOString().split('T')[0]);
      setNotaEntradaChave('');
      setNotaEntradaObs('');

      setKmAtual(30000);
      setKmUltimaRevisao(30000);
      setCustoAquisicao(50000);
      setValorVendaSugerido(59500);
      setValorFipe(60000);
      const hoje = new Date().toISOString().split('T')[0];
      setDataAquisicao(hoje);
      setDataEntradaPatio(hoje);
      setBaseCalculoAging('dataEntradaPatio');
      setDataEntrada(hoje);
      setStatus('Disponível');
      setLocalizacaoPatio('Pátio Principal');
      setFotoUrl('https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=600&q=80');

      setFornecedorOrigemId('');
      setFornecedorOrigemNome('');
      setFornecedorAtualId('');
      setFornecedorAtualNome('');
      setServicoAtualEmAndamento('');
      setDataEnvioOficina('');
      setPrevisaoRetornoOficina('');
      setStatusPreparacaoOficina('Aguardando Envio');
      setCustoEstimadoServico('');

      // Logística Defaults
      setStatusEstoque('No Pátio');
      setOrigemCompra('');
      setPrevisaoChegada('');
      setPrevisaoTerminoPreparacao('');
      setTransportadoraGuincho('');
      setTelefoneTransportadora('');
      setCustoFreteTransporte('');
      setTaxasOrigem('');
      setAnuncioAtivo(false);
      setPlataformasAnuncio([]);

      // Venda Retroativa Defaults
      setDataVendaRetroativa(new Date().toISOString().split('T')[0]);
      setValorVendaRetroativa(60000);
      setCompradorNome('Cliente Particular');
      setCompradorCpf('');
      setVendedorNome('');
      setCanalOrigem('Passante/Pátio');
      setFormaPagamento('À Vista PIX');
      setComissaoVenda(500);
      setObservacoesHistorico('');
    }
  }, [veiculoToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validação de Campos Obrigatórios
    if (!modelo.trim()) {
      alert('Por favor, informe o Modelo do Veículo (Campo Obrigatório).');
      return;
    }
    if (!placa.trim()) {
      alert('Por favor, informe a Placa do Veículo (Campo Obrigatório).');
      return;
    }
    if (Number(custoAquisicao) < 0 || isNaN(Number(custoAquisicao))) {
      alert('Por favor, informe um Preço de Compra válido (Campo Obrigatório).');
      return;
    }

    // Se chassi estiver vazio no modo histórico antigo, gerar um identificador amigável
    const chassiFinal = chassi.trim() 
      ? chassi.toUpperCase().trim() 
      : `HIST-${placa.toUpperCase().trim().replace(/[^A-Z0-9]/g, '')}-${Date.now().toString().slice(-4)}`;

    const isVendido = modoCadastro === 'historico_vendido';

    if (isVendido) {
      if (!dataVendaRetroativa) {
        alert('Por favor, informe a Data da Venda do Veículo (Campo Obrigatório para cálculo mensal do Dashboard).');
        return;
      }
      if (Number(valorVendaRetroativa) <= 0 || isNaN(Number(valorVendaRetroativa))) {
        alert('Por favor, informe o Valor de Venda do Veículo (Campo Obrigatório).');
        return;
      }
    }

    const fabYear = Number(anoFabricacao) || new Date().getFullYear();
    const modYear = Number(anoModelo) || fabYear;

    const dataEntradaEfetiva = dataEntradaPatio || dataAquisicao || dataEntrada || new Date().toISOString().split('T')[0];

    const payload: Partial<Veiculo> & { isHistoricoVendido?: boolean; vendaHistorica?: any } = {
      modelo: modelo.trim(),
      marca: marca.trim() || 'Diversas',
      ano: modYear, // Referência principal
      anoFabricacao: fabYear,
      anoModelo: modYear,
      tipoPropriedade,
      cambio,
      motorizacao: motorizacao.trim(),
      potencia: potencia.trim(),
      notaEntradaGerada,
      notaEntradaNumero: notaEntradaNumero.trim() || undefined,
      notaEntradaData: notaEntradaData || undefined,
      notaEntradaChave: notaEntradaChave.trim() || undefined,
      notaEntradaObs: notaEntradaObs.trim() || undefined,
      cor: cor.trim() || 'Prata',
      placa: placa.toUpperCase().trim(),
      chassi: chassiFinal,
      renavam: renavam.trim() || undefined,
      proprietarioAnterior: (proprietarioNome.trim() || proprietarioDocumento.trim() || proprietarioTelefone.trim())
        ? {
            nome: proprietarioNome.trim() || undefined,
            documento: proprietarioDocumento.trim() || undefined,
            telefone: proprietarioTelefone.trim() || undefined,
          }
        : undefined,
      combustivel,
      kmAtual: Number(kmAtual) || 0,
      kmUltimaRevisao: Number(kmUltimaRevisao) || Number(kmAtual) || 0,
      custoAquisicao: Number(custoAquisicao) || 0,
      valorVendaSugerido: Number(valorVendaSugerido) || 0,
      valorFipe: Number(valorFipe) || 0,
      dataAquisicao: dataAquisicao || dataEntradaEfetiva,
      dataEntradaPatio: dataEntradaPatio || dataEntradaEfetiva,
      baseCalculoAging,
      dataEntrada: dataEntradaEfetiva,
      status: isVendido ? 'Vendido' : statusEstoque === 'Em Trânsito' ? 'Disponível' : statusEstoque === 'Em Preparação' ? 'Em Preparação' : status,
      status_estoque: isVendido ? 'Vendido' : statusEstoque,
      origem_compra: origemCompra.trim() || undefined,
      previsao_chegada: previsaoChegada || undefined,
      previsao_termino_preparacao: previsaoTerminoPreparacao || previsaoRetornoOficina || undefined,
      transportadora_guincho: transportadoraGuincho.trim() || undefined,
      telefone_transportadora: telefoneTransportadora.trim() || undefined,
      custo_frete_transporte: custoFreteTransporte !== '' ? Number(custoFreteTransporte) : undefined,
      taxas_origem: taxasOrigem !== '' ? Number(taxasOrigem) : undefined,
      data_chegada_patio: statusEstoque === 'No Pátio' ? (dataEntradaPatio || dataEntradaEfetiva) : undefined,
      localizacaoPatio: localizacaoPatio || 'Pátio Principal',
      fotoUrl: fotoUrl || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80',
      fornecedorOrigemId: fornecedorOrigemId || undefined,
      fornecedorOrigemNome: fornecedorOrigemNome || undefined,
      fornecedorAtualId: fornecedorAtualId || undefined,
      fornecedorAtualNome: fornecedorAtualNome || undefined,
      servicoAtualEmAndamento: servicoAtualEmAndamento.trim() || undefined,
      dataEnvioOficina: dataEnvioOficina || undefined,
      previsaoRetornoOficina: previsaoRetornoOficina || undefined,
      statusPreparacaoOficina: status === 'Em Preparação' ? statusPreparacaoOficina : undefined,
      custoEstimadoServico: custoEstimadoServico !== '' ? Number(custoEstimadoServico) : undefined,
      anuncioAtivo,
      plataformasAnuncio: anuncioAtivo ? plataformasAnuncio : [],
      isHistoricoVendido: isVendido,
    };

    if (isVendido) {
      payload.vendaHistorica = {
        dataVenda: dataVendaRetroativa,
        valorVenda: Number(valorVendaRetroativa),
        compradorNome: compradorNome.trim() || 'Cliente Particular',
        compradorCpf: compradorCpf.trim() || '000.000.000-00',
        vendedorNome: vendedorNome.trim() || 'Vendedor do Pátio',
        canalOrigem,
        formaPagamento,
        comissaoValor: Number(comissaoVenda) || 0,
        observacoesVenda: observacoesHistorico.trim() || 'Cadastro retroativo de venda histórica',
      };
    }

    onSave(payload);
    onClose();
  };

  // Cálculo da Margem Projetada em Tempo Real
  const numCompra = Number(custoAquisicao) || 0;
  const numVenda = Number(valorVendaSugerido) || 0;
  const lucroEstimado = numVenda - numCompra;
  const margemEstimada = numCompra > 0 ? ((lucroEstimado / numCompra) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col bg-gray-900 rounded-2xl shadow-xl overflow-hidden border border-white/10">
        {/* Header */}
        <div className="bg-[#16171f] text-white p-5 flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg ${
              modoCadastro === 'historico_vendido' 
                ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 shadow-purple-500/20' 
                : 'bg-blue-600 shadow-blue-500/20'
            }`}>
              {modoCadastro === 'historico_vendido' ? <Tag size={22} /> : <Car size={22} />}
            </div>
            <div>
              <h3 className="font-extrabold text-lg flex items-center gap-2">
                {veiculoToEdit 
                  ? 'Editar Informações do Veículo' 
                  : (modoCadastro === 'historico_vendido' ? 'Cadastrar Veículo Já Vendido (Histórico Retroativo)' : 'Cadastrar Novo Veículo no Estoque')}
              </h3>
              <p className="text-xs text-slate-400">
                {modoCadastro === 'historico_vendido'
                  ? 'Registre vendas de meses passados com dados essenciais e fiscais consolidados.'
                  : 'Cadastre veículos ativos que estão entrando no pátio da loja com controle fiscal e ficha técnica.'}
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

        {/* Tabs de Seleção de Modo */}
        {!veiculoToEdit && (
          <div className="px-6 pt-4 pb-2 bg-[#16171f]/50 border-b border-white/5 flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setModoCadastro('estoque')}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer border ${
                modoCadastro === 'estoque'
                  ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                  : 'bg-black/30 text-slate-400 border-white/5 hover:text-white hover:bg-white/5'
              }`}
            >
              <Car size={15} />
              <span>1. Veículo em Estoque / Pátio</span>
            </button>
            <button
              type="button"
              onClick={() => setModoCadastro('historico_vendido')}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer border ${
                modoCadastro === 'historico_vendido'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-500 shadow-sm'
                  : 'bg-black/30 text-slate-400 border-white/5 hover:text-white hover:bg-white/5'
              }`}
            >
              <Tag size={15} />
              <span>2. Veículo Já Vendido (Retroativo / Meses Anteriores)</span>
            </button>
          </div>
        )}

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Scrollable Content Body */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-xs bg-[#0a0a0c]">
          
          {/* SEÇÃO 1: Tipo de Propriedade do Veículo */}
          <div className="p-4 bg-[#16171f] rounded-2xl border border-white/5 space-y-3">
            <label className="block text-slate-300 font-bold text-xs uppercase tracking-wide flex items-center gap-2">
              <ShieldCheck size={16} className="text-blue-400" />
              Origem & Propriedade do Veículo *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTipoPropriedade('proprio')}
                className={`p-3.5 rounded-xl border text-left transition flex items-center gap-3 cursor-pointer ${
                  tipoPropriedade === 'proprio'
                    ? 'bg-blue-600/20 border-blue-500 text-white shadow-sm'
                    : 'bg-black/40 border-white/10 text-slate-400 hover:border-white/20'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold shrink-0 ${
                  tipoPropriedade === 'proprio' ? 'bg-blue-600 text-white' : 'bg-white/10 text-slate-400'
                }`}>
                  <Car size={16} />
                </div>
                <div>
                  <div className="font-bold text-xs text-white">Frota Própria (Comprado)</div>
                  <div className="text-[10px] text-slate-400">Veículo adquirido pela loja, 100% de patrimônio próprio.</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTipoPropriedade('consignado')}
                className={`p-3.5 rounded-xl border text-left transition flex items-center gap-3 cursor-pointer ${
                  tipoPropriedade === 'consignado'
                    ? 'bg-amber-600/20 border-amber-500 text-white shadow-sm'
                    : 'bg-black/40 border-white/10 text-slate-400 hover:border-white/20'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold shrink-0 ${
                  tipoPropriedade === 'consignado' ? 'bg-amber-600 text-white' : 'bg-white/10 text-slate-400'
                }`}>
                  <Award size={16} />
                </div>
                <div>
                  <div className="font-bold text-xs text-white">Consignação (Carro de Terceiro)</div>
                  <div className="text-[10px] text-slate-400">Carro em demonstração no pátio sob comissão acordada.</div>
                </div>
              </button>
            </div>
          </div>

          {/* SEÇÃO 2: Identificação e Ficha Técnica */}
          <div className="p-4 bg-[#16171f] rounded-2xl border border-white/5 space-y-4">
            <h4 className="font-bold text-white text-xs uppercase tracking-wide flex items-center gap-2">
              <Car size={16} className="text-blue-400" />
              Identificação & Ficha Técnica do Veículo
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-slate-300 font-bold mb-1 flex items-center justify-between">
                  <span>Modelo do Veículo *</span>
                  <span className="text-[10px] text-rose-400 font-bold uppercase">Obrigatório</span>
                </label>
                <input
                  type="text"
                  required
                  value={modelo}
                  onChange={(e) => setModelo(e.target.value)}
                  placeholder="Ex: Onix Plus LTZ, Compass Longitude..."
                  className="w-full p-2.5 rounded-xl border border-white/10 text-xs font-semibold bg-black/40 text-slate-200 focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1 flex items-center justify-between">
                  <span>Marca / Montadora</span>
                  <span className="text-[10px] text-slate-400 uppercase">Seleção Rápida</span>
                </label>
                <CreatableSelect
                  value={marca}
                  onChange={(val) => setMarca(val)}
                  options={marcasList}
                  onCreateOption={handleCreateMarca}
                  placeholder="Selecione ou cadastre marca..."
                  searchPlaceholder="Pesquisar ou criar montadora..."
                  isClearable
                />
              </div>
            </div>

            {/* Placa, Renavam e Chassi */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-slate-300 font-bold mb-1 flex items-center justify-between">
                  <span>Placa *</span>
                  <span className="text-[10px] text-rose-400 font-bold uppercase">Obrigatório</span>
                </label>
                <input
                  type="text"
                  required
                  value={placa}
                  onChange={(e) => setPlaca(e.target.value)}
                  placeholder="Ex: BRA2E19"
                  className="w-full p-2.5 rounded-xl border border-white/10 text-xs font-mono font-bold uppercase bg-black/40 text-slate-200 focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1 flex items-center justify-between">
                  <span>Renavam</span>
                  <span className="text-[10px] text-slate-400 uppercase">Documento</span>
                </label>
                <input
                  type="text"
                  value={renavam}
                  onChange={(e) => setRenavam(e.target.value)}
                  placeholder="Ex: 01234567890"
                  className="w-full p-2.5 rounded-xl border border-white/10 text-xs font-mono bg-black/40 text-slate-200 focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1 flex items-center justify-between">
                  <span>Chassi (17 Dígitos)</span>
                  <span className="text-[10px] text-slate-400 uppercase">
                    {modoCadastro === 'historico_vendido' ? 'Opcional p/ Histórico' : 'Obrigatório *'}
                  </span>
                </label>
                <input
                  type="text"
                  required={modoCadastro === 'estoque'}
                  value={chassi}
                  onChange={(e) => setChassi(e.target.value)}
                  placeholder={modoCadastro === 'historico_vendido' ? "Auto-gerar se vazio" : "Ex: 9BG116AG4MG184920"}
                  className="w-full p-2.5 rounded-xl border border-white/10 text-xs font-mono uppercase bg-black/40 text-slate-200 focus:border-blue-500 outline-none"
                />
              </div>
            </div>

            {/* Proprietário Original / Anterior / Consignante no CRLV */}
            <div className="bg-black/30 p-3.5 rounded-xl border border-white/5 space-y-2">
              <label className="block text-slate-300 font-bold text-[11px] uppercase tracking-wide flex items-center justify-between">
                <span>Proprietário Anterior / Consignante no CRLV (Para Contrato de Venda)</span>
                <span className="text-[10px] text-slate-400 font-normal">Nome e CPF do titular anterior</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <input
                    type="text"
                    value={proprietarioNome}
                    onChange={(e) => setProprietarioNome(e.target.value)}
                    placeholder="Nome do Titular no Documento"
                    className="w-full p-2 rounded-lg border border-white/10 text-xs bg-black/40 text-slate-200 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={proprietarioDocumento}
                    onChange={(e) => setProprietarioDocumento(e.target.value)}
                    placeholder="CPF ou CNPJ do Titular"
                    className="w-full p-2 rounded-lg border border-white/10 text-xs font-mono bg-black/40 text-slate-200 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={proprietarioTelefone}
                    onChange={(e) => setProprietarioTelefone(e.target.value)}
                    placeholder="Telefone / WhatsApp"
                    className="w-full p-2 rounded-lg border border-white/10 text-xs font-mono bg-black/40 text-slate-200 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Anos Separados: Fabricação e Modelo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-black/30 p-3.5 rounded-xl border border-white/5">
              <div>
                <label className="block text-slate-300 font-bold mb-1 flex items-center justify-between">
                  <span>Ano de Fabricação *</span>
                  <span className="text-[10px] text-blue-400 font-bold font-mono">Ano Real Montagem</span>
                </label>
                <input
                  type="number"
                  required
                  value={anoFabricacao}
                  onChange={(e) => setAnoFabricacao(e.target.value)}
                  placeholder="Ex: 2023"
                  className="w-full p-2.5 rounded-xl border border-white/10 font-bold text-sm bg-black/50 text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1 flex items-center justify-between">
                  <span>Ano do Modelo *</span>
                  <span className="text-[10px] text-emerald-400 font-bold font-mono">Versão Comercial</span>
                </label>
                <input
                  type="number"
                  required
                  value={anoModelo}
                  onChange={(e) => setAnoModelo(e.target.value)}
                  placeholder="Ex: 2024"
                  className="w-full p-2.5 rounded-xl border border-white/10 font-bold text-sm bg-black/50 text-white outline-none focus:border-emerald-500"
                />
              </div>
              <div className="sm:col-span-2 text-[11px] text-slate-400 flex items-center gap-1.5">
                <Sparkles size={13} className="text-blue-400" />
                <span>Exibição no Pátio: <strong className="text-white font-mono">{anoFabricacao || '---'}/{anoModelo || '---'}</strong> (Ideal para carros cujo modelo é mais novo que a fabricação).</span>
              </div>
            </div>

            {/* Câmbio, Motorização, Potência e Combustível */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Câmbio *</label>
                <select
                  value={cambio}
                  onChange={(e) => setCambio(e.target.value as TipoCambioVeiculo)}
                  className="w-full p-2.5 rounded-xl border border-white/10 font-semibold bg-black/40 text-slate-200 outline-none focus:border-blue-500"
                >
                  <option value="Manual">Manual</option>
                  <option value="Automático">Automático</option>
                  <option value="Automatizado">Automatizado</option>
                  <option value="CVT">CVT</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Motorização *</label>
                <input
                  type="text"
                  value={motorizacao}
                  onChange={(e) => setMotorizacao(e.target.value)}
                  placeholder="Ex: 1.0 12V, 1.4 Turbo, 2.0 TSI"
                  className="w-full p-2.5 rounded-xl border border-white/10 font-medium bg-black/40 text-slate-200 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Potência (HP/CV)</label>
                <input
                  type="text"
                  value={potencia}
                  onChange={(e) => setPotencia(e.target.value)}
                  placeholder="Ex: 116 CV, 150 HP"
                  className="w-full p-2.5 rounded-xl border border-white/10 font-medium bg-black/40 text-slate-200 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Combustível</label>
                <select
                  value={combustivel}
                  onChange={(e) => setCombustivel(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-white/10 font-medium bg-black/40 text-slate-200 outline-none focus:border-blue-500"
                >
                  <option value="Flex">Flex</option>
                  <option value="Gasolina">Gasolina</option>
                  <option value="Etanol">Etanol</option>
                  <option value="Diesel">Diesel</option>
                  <option value="Híbrido">Híbrido</option>
                  <option value="Elétrico">Elétrico</option>
                </select>
              </div>
            </div>

            {/* Cor, KM, Revisão, Localização e Status */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Cor</label>
                <CreatableSelect
                  value={cor}
                  onChange={(val) => setCor(val)}
                  options={coresList}
                  onCreateOption={handleCreateCor}
                  placeholder="Selecione ou crie cor..."
                  searchPlaceholder="Pesquisar ou cadastrar cor..."
                  isClearable
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">KM Atual</label>
                <input
                  type="number"
                  value={kmAtual}
                  onChange={(e) => setKmAtual(e.target.value)}
                  placeholder="Ex: 45000"
                  className="w-full p-2.5 rounded-xl border border-white/10 font-bold bg-black/40 text-slate-200 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Localização</label>
                <input
                  type="text"
                  value={localizacaoPatio}
                  onChange={(e) => setLocalizacaoPatio(e.target.value)}
                  placeholder="Ex: Pátio Principal"
                  className="w-full p-2.5 rounded-xl border border-white/10 font-medium bg-black/40 text-slate-200 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Status Operacional</label>
                {modoCadastro === 'historico_vendido' ? (
                  <div className="w-full p-2.5 rounded-xl border border-purple-500/30 bg-purple-950/20 text-purple-300 font-bold text-center">
                    Vendido
                  </div>
                ) : (
                  <select
                    value={status}
                    onChange={(e) => {
                      const newStatus = e.target.value as StatusVeiculo;
                      setStatus(newStatus);
                      if (newStatus === 'Em Preparação') {
                        setStatusEstoque('Em Preparação');
                      } else if (newStatus === 'Disponível' && statusEstoque === 'Em Preparação') {
                        setStatusEstoque('No Pátio');
                      }
                    }}
                    className="w-full p-2.5 rounded-xl border border-white/10 font-bold bg-black/40 text-blue-400 outline-none focus:border-blue-500"
                  >
                    <option value="Disponível">Disponível</option>
                    <option value="Em Preparação">Em Preparação</option>
                    <option value="Alugado">Alugado</option>
                    <option value="Em Manutenção">Em Manutenção</option>
                  </select>
                )}
              </div>
            </div>
          </div>

          {/* NOVA SEÇÃO: LOGÍSTICA, RECEBIMENTO & ETAPA DO ESTOQUE */}
          {modoCadastro !== 'historico_vendido' && (
            <div className="p-4 bg-[#14151f] rounded-2xl border border-indigo-500/20 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <Truck size={18} className="text-indigo-400" />
                  <div>
                    <h4 className="font-bold text-white text-xs uppercase tracking-wide">
                      Etapa de Logística & Status de Estoque
                    </h4>
                    <p className="text-[10px] text-slate-400">
                      Rastreie a jornada desde a compra externa até a chegada física ao pátio da loja
                    </p>
                  </div>
                </div>
                <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-0.5 rounded-full font-bold">
                  Logística Integrada
                </span>
              </div>

              {/* Status do Estoque Seletor */}
              <div>
                <label className="block text-slate-300 font-bold text-xs mb-2">
                  Qual é o status físico atual deste veículo? *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setStatusEstoque('Em Trânsito');
                      setStatus('Disponível');
                    }}
                    className={`p-3 rounded-xl border flex flex-col items-center text-center gap-1 transition cursor-pointer ${
                      statusEstoque === 'Em Trânsito'
                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-md ring-1 ring-indigo-500'
                        : 'bg-black/30 border-white/5 text-slate-400 hover:border-white/20'
                    }`}
                  >
                    <span className="text-lg">🚚</span>
                    <span className="text-xs font-black">Em Trânsito</span>
                    <span className="text-[10px] text-slate-400">Comprado fora, a caminho</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStatusEstoque('Em Preparação');
                      setStatus('Em Preparação');
                    }}
                    className={`p-3 rounded-xl border flex flex-col items-center text-center gap-1 transition cursor-pointer ${
                      statusEstoque === 'Em Preparação'
                        ? 'bg-amber-600/20 border-amber-500 text-amber-300 shadow-md ring-1 ring-amber-500'
                        : 'bg-black/30 border-white/5 text-slate-400 hover:border-white/20'
                    }`}
                  >
                    <span className="text-lg">🛠️</span>
                    <span className="text-xs font-black">Em Preparação</span>
                    <span className="text-[10px] text-slate-400">Oficina / Funilaria / Detailing</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStatusEstoque('No Pátio');
                      setStatus('Disponível');
                    }}
                    className={`p-3 rounded-xl border flex flex-col items-center text-center gap-1 transition cursor-pointer ${
                      statusEstoque === 'No Pátio'
                        ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 shadow-md ring-1 ring-emerald-500'
                        : 'bg-black/30 border-white/5 text-slate-400 hover:border-white/20'
                    }`}
                  >
                    <span className="text-lg">🟢</span>
                    <span className="text-xs font-black">No Pátio</span>
                    <span className="text-[10px] text-slate-400">Pronto no showroom</span>
                  </button>
                </div>
              </div>

              {/* Campos Condicionais: Em Trânsito */}
              {statusEstoque === 'Em Trânsito' && (
                <div className="p-3.5 bg-black/40 rounded-xl border border-indigo-500/30 space-y-3 animate-fadeIn">
                  <div className="flex items-center gap-1.5 text-indigo-400 text-xs font-bold">
                    <Navigation size={14} />
                    <span>Detalhes do Deslocamento & Frete</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-bold mb-1 text-xs">
                        Origem da Compra (Cidade / Loja / Leilão)
                      </label>
                      <input
                        type="text"
                        value={origemCompra}
                        onChange={(e) => setOrigemCompra(e.target.value)}
                        placeholder="Ex: Curitiba/PR - Leilão Sodré Santoro"
                        className="w-full p-2.5 rounded-xl border border-white/10 bg-black/50 text-slate-200 text-xs outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-bold mb-1 text-xs">
                        Previsão de Chegada na Cidade/Loja
                      </label>
                      <input
                        type="date"
                        value={previsaoChegada}
                        onChange={(e) => setPrevisaoChegada(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-white/10 bg-black/50 text-indigo-300 text-xs outline-none font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-slate-300 font-bold mb-1 text-xs">
                        Transportadora / Guincho
                      </label>
                      <input
                        type="text"
                        value={transportadoraGuincho}
                        onChange={(e) => setTransportadoraGuincho(e.target.value)}
                        placeholder="Ex: Cegonha Express Sul"
                        className="w-full p-2 rounded-lg border border-white/10 bg-black/50 text-slate-200 text-xs outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-bold mb-1 text-xs">
                        Telefone Guincho
                      </label>
                      <input
                        type="text"
                        value={telefoneTransportadora}
                        onChange={(e) => setTelefoneTransportadora(e.target.value)}
                        placeholder="(11) 99999-0000"
                        className="w-full p-2 rounded-lg border border-white/10 bg-black/50 text-slate-200 text-xs outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-bold mb-1 text-xs">
                        Custo do Frete (R$)
                      </label>
                      <input
                        type="number"
                        value={custoFreteTransporte}
                        onChange={(e) => setCustoFreteTransporte(e.target.value)}
                        placeholder="Ex: 1500"
                        className="w-full p-2 rounded-lg border border-white/10 bg-black/50 text-emerald-400 font-mono text-xs outline-none font-bold"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Campos Condicionais: Em Preparação */}
              {statusEstoque === 'Em Preparação' && (
                <div className="p-3.5 bg-black/40 rounded-xl border border-amber-500/30 space-y-3 animate-fadeIn">
                  <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold">
                    <Clock size={14} />
                    <span>Previsão de Conclusão para Vendas & Showroom</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-bold mb-1 text-xs">
                        Previsão de Término da Preparação *
                      </label>
                      <input
                        type="date"
                        value={previsaoTerminoPreparacao}
                        onChange={(e) => {
                          setPrevisaoTerminoPreparacao(e.target.value);
                          setPrevisaoRetornoOficina(e.target.value);
                        }}
                        className="w-full p-2.5 rounded-xl border border-amber-500/40 bg-black/50 text-amber-300 text-xs outline-none font-bold"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        Data obrigatória para visibilidade do vendedor no Catálogo de Vendas.
                      </p>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-bold mb-1 text-xs">
                        Taxas de Origem / Leilão / Laudo (R$)
                      </label>
                      <input
                        type="number"
                        value={taxasOrigem}
                        onChange={(e) => setTaxasOrigem(e.target.value)}
                        placeholder="Ex: 800"
                        className="w-full p-2.5 rounded-xl border border-white/10 bg-black/50 text-cyan-400 font-mono text-xs outline-none font-bold"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SEÇÃO DE FORNECEDORES & PRESTADORES DE SERVIÇOS (PARCEIROS) */}
          <div className="p-4 bg-[#16171f] rounded-2xl border border-white/5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Building2 size={18} className="text-indigo-400" />
                <div>
                  <h4 className="font-bold text-white text-xs uppercase tracking-wide">
                    Fornecedor de Origem & Prestador Parceiro
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    Vincule a empresa parceira de compra ou a oficina/funilaria onde o veículo está sendo preparado
                  </p>
                </div>
              </div>
              <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full font-bold">
                Rede de Parceiros
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Fornecedor de Origem / Compra */}
              <div>
                <label className="block text-slate-300 font-bold mb-1 flex items-center justify-between">
                  <span>🏢 Fornecedor de Origem / Compra</span>
                  <span className="text-[10px] text-slate-500">Opcional</span>
                </label>
                <select
                  value={fornecedorOrigemId}
                  onChange={(e) => {
                    const selId = e.target.value;
                    setFornecedorOrigemId(selId);
                    const f = fornecedores.find(item => item.id === selId);
                    setFornecedorOrigemNome(f ? (f.nome || f.nomeEmpresa || '') : '');
                  }}
                  className="w-full p-2.5 rounded-xl border border-white/10 font-semibold bg-black/40 text-slate-200 text-xs outline-none focus:border-indigo-500"
                >
                  <option value="">Nenhum / Particular / Outro</option>
                  {fornecedores.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.nome || f.nomeEmpresa} ({f.categoria}) {f.cidadeUf || f.cidade ? `- ${f.cidadeUf || f.cidade}` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Empresa/parceiro de quem o veículo foi adquirido.
                </p>
              </div>

              {/* Oficina / Prestador Atual */}
              <div>
                <label className="block text-slate-300 font-bold mb-1 flex items-center justify-between">
                  <span>🛠️ Oficina / Prestador em Andamento</span>
                  <span className="text-[10px] text-amber-400 font-bold">
                    {status === 'Em Preparação' ? 'Em Andamento' : 'Opcional'}
                  </span>
                </label>
                <select
                  value={fornecedorAtualId}
                  onChange={(e) => {
                    const selId = e.target.value;
                    setFornecedorAtualId(selId);
                    const f = fornecedores.find(item => item.id === selId);
                    setFornecedorAtualNome(f ? (f.nome || f.nomeEmpresa || '') : '');
                  }}
                  className="w-full p-2.5 rounded-xl border border-white/10 font-semibold bg-black/40 text-slate-200 text-xs outline-none focus:border-amber-500"
                >
                  <option value="">Nenhum (No Pátio)</option>
                  {fornecedores.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.nome || f.nomeEmpresa} ({f.categoria}) {f.cidadeUf || f.cidade ? `• ${f.cidadeUf || f.cidade}` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Local atual onde o carro está executando serviços externos.
                </p>
              </div>
            </div>

            {/* Se houver oficina vinculada ou status 'Em Preparação', exibir campos detalhados de serviço */}
            {(fornecedorAtualId || status === 'Em Preparação') && (
              <div className="p-3.5 bg-black/30 rounded-xl border border-white/5 space-y-3 animate-fadeIn">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                  <Wrench size={15} />
                  <span>Detalhamento do Serviço & Prazo na Oficina / Funilaria</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-slate-300 font-bold mb-1 text-xs">
                      Serviço Sendo Feito
                    </label>
                    <input
                      type="text"
                      value={servicoAtualEmAndamento}
                      onChange={(e) => setServicoAtualEmAndamento(e.target.value)}
                      placeholder="Ex: Pintura de para-choque, polimento técnico e troca de pastilhas"
                      className="w-full p-2 rounded-lg border border-white/10 bg-black/50 text-slate-200 text-xs outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1 text-xs">
                      Custo Estimado (R$)
                    </label>
                    <input
                      type="number"
                      value={custoEstimadoServico}
                      onChange={(e) => setCustoEstimadoServico(e.target.value)}
                      placeholder="Ex: 850"
                      className="w-full p-2 rounded-lg border border-white/10 bg-black/50 text-emerald-400 font-mono text-xs outline-none focus:border-emerald-500 font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1 text-xs">
                      Data de Envio
                    </label>
                    <input
                      type="date"
                      value={dataEnvioOficina}
                      onChange={(e) => setDataEnvioOficina(e.target.value)}
                      className="w-full p-2 rounded-lg border border-white/10 bg-black/50 text-slate-200 text-xs outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1 text-xs">
                      Previsão de Retorno
                    </label>
                    <input
                      type="date"
                      value={previsaoRetornoOficina}
                      onChange={(e) => setPrevisaoRetornoOficina(e.target.value)}
                      className="w-full p-2 rounded-lg border border-white/10 bg-black/50 text-amber-300 text-xs outline-none font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1 text-xs">
                      Status da Oficina
                    </label>
                    <select
                      value={statusPreparacaoOficina}
                      onChange={(e) => setStatusPreparacaoOficina(e.target.value as any)}
                      className="w-full p-2 rounded-lg border border-white/10 bg-black/50 text-slate-200 text-xs outline-none font-semibold"
                    >
                      <option value="Aguardando Envio">⏳ Aguardando Envio</option>
                      <option value="Em Oficina">🛠️ Em Oficina</option>
                      <option value="Pronto / Retornado">✅ Pronto / Retornado</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SEÇÃO 3: Controle Fiscal & Nota de Entrada (Prevenção de Multas) */}
          <div className={`p-4 rounded-2xl border transition-all ${
            notaEntradaGerada 
              ? 'bg-[#16171f] border-emerald-500/30' 
              : 'bg-rose-950/20 border-rose-500/40'
          }`}>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <FileText size={18} className={notaEntradaGerada ? 'text-emerald-400' : 'text-rose-400'} />
                <div>
                  <h4 className="font-bold text-white text-xs uppercase tracking-wide">
                    Controle Fiscal & Nota Fiscal de Entrada
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    Obrigatório para veículos em pátio de concessionária para evitar autuação e multas de fiscalização.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setNotaEntradaGerada(true)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    notaEntradaGerada
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  <Check size={14} />
                  <span>Nota Emitida</span>
                </button>

                <button
                  type="button"
                  onClick={() => setNotaEntradaGerada(false)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    !notaEntradaGerada
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  <AlertTriangle size={14} />
                  <span>Pendente</span>
                </button>
              </div>
            </div>

            {!notaEntradaGerada && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px] flex items-start gap-2 mb-3">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <div>
                  <strong>Atenção Fiscal:</strong> Este veículo constará com pendência de Nota de Entrada. Certifique-se de emitir a NF-e de entrada assim que possível para evitar penalidades fiscais.
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Número da Nota Fiscal (NF-e)</label>
                <input
                  type="text"
                  value={notaEntradaNumero}
                  onChange={(e) => setNotaEntradaNumero(e.target.value)}
                  placeholder="Ex: NF-e 004819"
                  className="w-full p-2.5 rounded-xl border border-white/10 font-mono text-xs bg-black/40 text-slate-200 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Data de Emissão da Nota</label>
                <input
                  type="date"
                  value={notaEntradaData}
                  onChange={(e) => setNotaEntradaData(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-white/10 font-medium text-xs bg-black/40 text-slate-200 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Chave de Acesso (44 Dígitos)</label>
                <input
                  type="text"
                  value={notaEntradaChave}
                  onChange={(e) => setNotaEntradaChave(e.target.value)}
                  placeholder="Opcional (chave NF-e)"
                  className="w-full p-2.5 rounded-xl border border-white/10 font-mono text-xs bg-black/40 text-slate-200 outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* SEÇÃO 4: Custo, Preço de Venda da Loja e Data de Aquisição */}
          <div className="p-4 bg-[#16171f] rounded-2xl border border-white/5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <h4 className="font-bold text-white text-xs uppercase tracking-wide flex items-center gap-2">
                <DollarSign size={16} className="text-emerald-400" />
                Custo de Aquisição & Preço de Venda Pretendido
              </h4>
              <span className="text-[11px] text-slate-400">
                Defina o valor de compra e o preço anunciado da loja
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-slate-300 font-bold mb-1 flex items-center justify-between">
                  <span>Preço de Compra (R$) *</span>
                  <span className="text-[10px] text-rose-400 font-bold uppercase">Obrigatório</span>
                </label>
                <input
                  type="number"
                  required
                  value={custoAquisicao}
                  onChange={(e) => setCustoAquisicao(e.target.value)}
                  placeholder="50000"
                  className="w-full p-2.5 rounded-xl border border-white/10 font-black text-sm bg-black/40 text-emerald-400 font-mono outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1 flex items-center justify-between">
                  <span>Preço de Venda Loja (R$)</span>
                  <span className="text-[10px] text-blue-400 font-bold uppercase">Anúncio</span>
                </label>
                <input
                  type="number"
                  value={valorVendaSugerido}
                  onChange={(e) => setValorVendaSugerido(e.target.value)}
                  placeholder="59500"
                  className="w-full p-2.5 rounded-xl border border-white/10 font-black text-sm bg-black/40 text-blue-400 font-mono outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1 flex items-center justify-between">
                  <span>Tabela FIPE (R$)</span>
                  <span className="text-[10px] text-slate-500 uppercase">Opcional</span>
                </label>
                <input
                  type="number"
                  value={valorFipe}
                  onChange={(e) => setValorFipe(e.target.value)}
                  placeholder="60000"
                  className="w-full p-2.5 rounded-xl border border-white/10 font-bold bg-black/40 text-slate-300 font-mono outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* SEPARADOR DE DATAS: AQUISIÇÃO vs CHEGADA NO PÁTIO */}
            <div className="p-3.5 bg-black/40 rounded-xl border border-white/10 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-amber-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wide">
                    Controle de Prazos & Aging de Estoque
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  Diferenciação de data de compra e data em que o carro ficou pronto no showroom
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-slate-300 font-bold mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      📅 Data de Aquisição / Compra *
                    </span>
                    <span className="text-[10px] text-amber-400 font-bold uppercase">Nota/Contrato</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={dataAquisicao}
                    onChange={(e) => {
                      setDataAquisicao(e.target.value);
                      if (!dataEntradaPatio || dataEntradaPatio < e.target.value) {
                        setDataEntradaPatio(e.target.value);
                      }
                      setDataEntrada(dataEntradaPatio || e.target.value);
                    }}
                    className="w-full p-2.5 rounded-xl border border-white/10 font-medium bg-black/60 text-slate-200 outline-none focus:border-amber-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Dia em que o veículo foi comprado (leilão, particular ou troca).
                  </p>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      🏁 Data de Chegada / Pronto no Pátio *
                    </span>
                    <span className="text-[10px] text-emerald-400 font-bold uppercase">Showroom (Aging)</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={dataEntradaPatio}
                    onChange={(e) => {
                      setDataEntradaPatio(e.target.value);
                      setDataEntrada(e.target.value);
                    }}
                    className="w-full p-2.5 rounded-xl border border-white/10 font-medium bg-black/60 text-slate-200 outline-none focus:border-emerald-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Dia em que o carro chegou à loja após funilaria, mecânica e lavagem.
                  </p>
                </div>
              </div>

              {/* Critério do Aging e Resumo de Prazos */}
              <div className="pt-2 border-t border-white/5 flex items-center justify-between flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 font-medium">Contar Aging a partir de:</span>
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white text-xs">
                    <input
                      type="radio"
                      name="baseAging"
                      checked={baseCalculoAging === 'dataEntradaPatio'}
                      onChange={() => setBaseCalculoAging('dataEntradaPatio')}
                      className="accent-emerald-500"
                    />
                    <span>Chegada no Pátio (Recomendado)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white text-xs">
                    <input
                      type="radio"
                      name="baseAging"
                      checked={baseCalculoAging === 'dataAquisicao'}
                      onChange={() => setBaseCalculoAging('dataAquisicao')}
                      className="accent-blue-500"
                    />
                    <span>Data de Aquisição</span>
                  </label>
                </div>

                {dataAquisicao && dataEntradaPatio && (
                  <div className="text-[11px] text-slate-400 flex items-center gap-2">
                    {(() => {
                      const dAcq = new Date(dataAquisicao);
                      const dPat = new Date(dataEntradaPatio);
                      const diffPrep = Math.max(0, Math.floor((dPat.getTime() - dAcq.getTime()) / (1000 * 60 * 60 * 24)));
                      return (
                        <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300">
                          ⏱️ Tempo de Preparação/Transporte: <strong>{diffPrep} dia(s)</strong>
                        </span>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>

            {/* Live Profit Preview */}
            <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Margem Bruta Projetada:</span>
                <span className={`font-mono font-bold ${lucroEstimado >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatCurrency(lucroEstimado)} ({margemEstimada.toFixed(1)}%)
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                Despesas de oficina lançadas no chassi serão somadas automaticamente ao custo.
              </div>
            </div>

            {/* SEÇÃO MARKETING & PERFORMANCE DE ANÚNCIOS */}
            <div className="p-4 bg-gradient-to-r from-pink-950/20 via-purple-950/20 to-black/40 rounded-2xl border border-pink-500/20 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20">
                    <Megaphone size={16} />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-xs uppercase tracking-wide">
                      Divulgação & Tráfego Pago
                    </h4>
                    <p className="text-[10px] text-slate-400">
                      Rastreie se o veículo está anunciado ativamente e em quais plataformas
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAnuncioAtivo(!anuncioAtivo)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer border ${
                    anuncioAtivo
                      ? 'bg-pink-600 text-white border-pink-400 shadow-sm'
                      : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
                  }`}
                >
                  <span>{anuncioAtivo ? '📣 Anúncio Ativo' : '⚪ Sem Campanha Ativa'}</span>
                </button>
              </div>

              {anuncioAtivo && (
                <div className="pt-2 border-t border-white/5 space-y-2">
                  <label className="block text-[11px] font-bold text-pink-300">
                    Plataformas com Anúncio em Veiculação
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'Meta Ads (Instagram/Facebook)',
                      'Google Ads',
                      'Webmotors',
                      'OLX',
                      'Mercado Livre',
                      'WhatsApp / Catálogo'
                    ].map((plat) => {
                      const isSelected = plataformasAnuncio.includes(plat);
                      return (
                        <button
                          key={plat}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setPlataformasAnuncio(plataformasAnuncio.filter((p) => p !== plat));
                            } else {
                              setPlataformasAnuncio([...plataformasAnuncio, plat]);
                            }
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer border ${
                            isSelected
                              ? 'bg-pink-500/20 text-pink-200 border-pink-400/50'
                              : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
                          }`}
                        >
                          {isSelected ? '✓ ' : '+ '}{plat}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SEÇÃO 5: DETALHES DA VENDA HISTÓRICA RETROATIVA (Aparece se for Histórico Vendido) */}
          {modoCadastro === 'historico_vendido' && (
            <div className="p-4 bg-gradient-to-br from-[#1b172b] to-[#16171f] rounded-2xl border border-purple-500/30 space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between pb-2 border-b border-purple-500/20">
                <div className="flex items-center gap-2">
                  <Tag size={18} className="text-purple-400" />
                  <div>
                    <h4 className="font-bold text-white text-xs uppercase tracking-wide">
                      Registro da Venda Histórica Retroativa
                    </h4>
                    <p className="text-[10px] text-slate-400">
                      Alimenta o faturamento, gráficos de meses e o DRE da empresa.
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono font-bold text-[10px]">
                  Venda Concluída
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-purple-300 font-bold mb-1 flex items-center justify-between">
                    <span>Data Efetiva da Venda *</span>
                    <span className="text-[10px] text-rose-400 font-bold uppercase">Obrigatório</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={dataVendaRetroativa}
                    onChange={(e) => setDataVendaRetroativa(e.target.value)}
                    className="w-full p-3 rounded-xl border border-purple-500/30 bg-black/50 text-white font-bold text-xs outline-none focus:border-purple-400"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Esta data define o mês no dashboard e relatórios (ex: Janeiro/2026).
                  </span>
                </div>

                <div>
                  <label className="block text-emerald-400 font-bold mb-1 flex items-center justify-between">
                    <span>Valor Total da Venda (R$) *</span>
                    <span className="text-[10px] text-rose-400 font-bold uppercase">Obrigatório</span>
                  </label>
                  <input
                    type="number"
                    required
                    value={valorVendaRetroativa}
                    onChange={(e) => setValorVendaRetroativa(e.target.value)}
                    placeholder="60000"
                    className="w-full p-3 rounded-xl border border-emerald-500/30 bg-black/50 text-emerald-400 font-mono font-black text-lg outline-none focus:border-emerald-400"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Lucro calculado: {formatCurrency(Number(valorVendaRetroativa || 0) - Number(custoAquisicao || 0))}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                <div>
                  <label className="block text-slate-300 font-bold mb-1 flex items-center justify-between">
                    <span>Nome do Comprador / Cliente</span>
                    <span className="text-[9px] text-slate-500">Opcional</span>
                  </label>
                  <input
                    type="text"
                    value={compradorNome}
                    onChange={(e) => setCompradorNome(e.target.value)}
                    placeholder="Ex: Carlos Alberto ou Cliente Particular"
                    className="w-full p-2.5 rounded-xl border border-white/10 bg-black/40 text-slate-200 text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1 flex items-center justify-between">
                    <span>CPF / Contato</span>
                    <span className="text-[9px] text-slate-500">Opcional</span>
                  </label>
                  <input
                    type="text"
                    value={compradorCpf}
                    onChange={(e) => setCompradorCpf(e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full p-2.5 rounded-xl border border-white/10 bg-black/40 text-slate-200 text-xs outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
                <div>
                  <label className="block text-slate-300 font-bold mb-1 flex items-center justify-between">
                    <span>Canal de Origem</span>
                    <span className="text-[9px] text-slate-500">Opcional</span>
                  </label>
                  <select
                    value={canalOrigem}
                    onChange={(e) => setCanalOrigem(e.target.value as CanalOrigemLead)}
                    className="w-full p-2.5 rounded-xl border border-white/10 bg-black/40 text-slate-200 text-xs outline-none"
                  >
                    <option value="Passante/Pátio">🚶 Passante / Pátio</option>
                    <option value="Redes Sociais (Instagram/Facebook)">📱 Redes Sociais</option>
                    <option value="Anúncio Pago (Google/Meta)">🎯 Anúncio Pago</option>
                    <option value="OLX/Webmotors">🌐 OLX / Webmotors</option>
                    <option value="Indicação de Cliente">🤝 Indicação</option>
                    <option value="Cliente Base/Fidelizado">⭐ Base / Fidelizado</option>
                    <option value="Outro">📌 Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1 flex items-center justify-between">
                    <span>Forma de Pagamento</span>
                    <span className="text-[9px] text-slate-500">Opcional</span>
                  </label>
                  <select
                    value={formaPagamento}
                    onChange={(e) => setFormaPagamento(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-white/10 bg-black/40 text-slate-200 text-xs outline-none"
                  >
                    <option value="À Vista PIX">⚡ À Vista PIX</option>
                    <option value="Financiamento">🏦 Financiamento</option>
                    <option value="Troca + Volta">🚗 Troca + Volta</option>
                    <option value="Cartão">💳 Cartão</option>
                    <option value="Dinheiro">💵 Dinheiro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1 flex items-center justify-between">
                    <span>Vendedor Responsável</span>
                    <span className="text-[9px] text-slate-500">Opcional</span>
                  </label>
                  <input
                    type="text"
                    value={vendedorNome}
                    onChange={(e) => setVendedorNome(e.target.value)}
                    placeholder="Ex: João Silva"
                    className="w-full p-2.5 rounded-xl border border-white/10 bg-black/40 text-slate-200 text-xs outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* URL da Foto (Opcional) */}
          <div>
            <label className="block text-slate-300 font-bold mb-1 flex items-center justify-between">
              <span>URL da Foto do Veículo</span>
              <span className="text-[10px] text-slate-500 uppercase">Opcional</span>
            </label>
            <input
              type="text"
              value={fotoUrl}
              onChange={(e) => setFotoUrl(e.target.value)}
              placeholder="https://..."
              className="w-full p-2.5 rounded-xl border border-white/10 text-xs font-mono bg-[#16171f] text-slate-200 outline-none focus:border-blue-500"
            />
          </div>

          </div>

          {/* Fixed Footer Buttons */}
          <div className="p-4 sm:p-5 border-t border-white/10 bg-[#16171f] flex items-center justify-end gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={`px-6 py-2.5 rounded-xl font-bold text-white shadow-md transition cursor-pointer active:scale-95 flex items-center gap-2 ${
                modoCadastro === 'historico_vendido'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-purple-900/30'
                  : 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/30'
              }`}
            >
              {modoCadastro === 'historico_vendido' ? (
                <>
                  <Tag size={16} /> Salvar Venda no Histórico
                </>
              ) : (
                <>
                  <Plus size={16} /> Salvar Veículo no Estoque
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
