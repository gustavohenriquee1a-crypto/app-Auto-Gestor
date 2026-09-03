import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Wrench,
  Paintbrush,
  Sparkles,
  Car,
  Building2,
  Calendar,
  Clock,
  DollarSign,
  User,
  FileText,
  AlertCircle,
  CheckCircle2,
  Gauge,
  Tag,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import {
  Veiculo,
  EtapaKanbanPreparacao,
  FornecedorPrestador,
  ContaBancariaCaixa,
  Usuario,
  CategoriaFornecedor,
  CategoriaDespesa,
  DespesaVeiculo
} from '../types';
import { ParametrosEnviarServico } from '../utils/auditLogger';
import { CreatableSelect } from './CreatableSelect';
import { formatCurrency, formatKm } from '../utils/formatters';

interface ModalEnviarServicoProps {
  isOpen: boolean;
  onClose: () => void;
  veiculos: Veiculo[];
  defaultVeiculo?: Veiculo | null;
  fornecedores?: FornecedorPrestador[];
  contasBancarias?: ContaBancariaCaixa[];
  currentUser: Usuario | null;
  onConfirmarEnvio: (data: {
    veiculoId: string;
    paramsEnvio: ParametrosEnviarServico;
    despesaData?: Omit<DespesaVeiculo, 'id'>;
  }) => Promise<void> | void;
}

const MOTIVOS_RAPIDOS: Record<EtapaKanbanPreparacao, string[]> = {
  'Estética': [
    'Lavagem de Motor & Chassi',
    'Higienização Interna Completa (Bancos e Carpete)',
    'Polimento Técnico / Cristalização',
    'Lavagem Comercial & Retoque de Showroom',
    'Higienização de Ar Condicionado (Oxi-sanitização)',
    'Revitalização de Plásticos & Faróis',
    'Retoque de Limpeza Pós-Chuva',
    'Setup Inicial de Entrada no Estoque',
  ],
  'Funilaria': [
    'Funilaria & Martelinho de Ouro',
    'Pintura de Para-choque Dianteiro / Traseiro',
    'Retoque de Pintura em Peça Específica',
    'Recuperação de Roda / Diamantação',
    'Troca de Para-brisa / Vidros',
    'Alinhamento de Portas e Painéis',
    'Pintura Geral / Banho de Tinta',
  ],
  'Oficina': [
    'Revisão Geral Preventiva (Óleo, Filtros e Velas)',
    'Freios (Discos, Pastilhas e Fluido)',
    'Suspensão, Amortecedores e Buchas',
    'Auto Elétrica, Bateria e Alternador',
    'Troca de Correia Dentada / Bomba d\'água',
    'Injeção Eletrônica & Diagnóstico Scanner',
    'Embreagem / Câmbio',
    'Ar Condicionado (Carga de Gás e Compressor)',
    'Geometria, Alinhamento e Balanceamento 3D',
  ],
  'Pronto para Pátio': [
    'Inspeção Final de Qualidade',
    'Fotos para Anúncio / Marketing',
  ],
};

export const ModalEnviarServico: React.FC<ModalEnviarServicoProps> = ({
  isOpen,
  onClose,
  veiculos,
  defaultVeiculo,
  fornecedores = [],
  contasBancarias = [],
  currentUser,
  onConfirmarEnvio,
}) => {
  if (!isOpen) return null;

  // Selected Vehicle State
  const [selectedVeiculoId, setSelectedVeiculoId] = useState<string>(
    defaultVeiculo?.id || (veiculos.length > 0 ? veiculos[0].id : '')
  );

  const veiculoSelecionado = useMemo(() => {
    return veiculos.find((v) => v.id === selectedVeiculoId) || defaultVeiculo || null;
  }, [veiculos, selectedVeiculoId, defaultVeiculo]);

  // Stage Selection
  const [etapa, setEtapa] = useState<EtapaKanbanPreparacao>('Estética');

  // Reason & Service Description
  const [motivoSaida, setMotivoSaida] = useState<string>('Lavagem de Motor & Chassi');
  const [servicoDetalhe, setServicoDetalhe] = useState<string>('');

  // Supplier
  const [selectedFornecedorId, setSelectedFornecedorId] = useState<string>('');
  const [fornecedorNome, setFornecedorNome] = useState<string>('');

  // Odometer & Dates
  const [kmSaida, setKmSaida] = useState<number | ''>(
    veiculoSelecionado?.kmAtual || ''
  );
  const [dataSaida, setDataSaida] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [previsaoRetorno, setPrevisaoRetorno] = useState<string>('');
  const [motoristaTranslado, setMotoristaTranslado] = useState<string>('');

  // Financial Cost Integration
  const [lancarDespesa, setLancarDespesa] = useState<boolean>(false);
  const [valorCusto, setValorCusto] = useState<number | ''>('');
  const [statusPagamento, setStatusPagamento] = useState<'Pendente' | 'Pago'>('Pendente');
  const [selectedContaBancariaId, setSelectedContaBancariaId] = useState<string>(
    contasBancarias.length > 0 ? contasBancarias[0].id : ''
  );
  const [formaPagamento, setFormaPagamento] = useState<string>('PIX');
  const [dataVencimento, setDataVencimento] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const [observacoes, setObservacoes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Sync default vehicle if changed
  useEffect(() => {
    if (defaultVeiculo) {
      setSelectedVeiculoId(defaultVeiculo.id);
      setKmSaida(defaultVeiculo.kmAtual || '');
      if (defaultVeiculo.etapaKanban && defaultVeiculo.etapaKanban !== 'Pronto para Pátio') {
        setEtapa(defaultVeiculo.etapaKanban);
      }
      if (defaultVeiculo.fornecedorAtualNome) {
        setFornecedorNome(defaultVeiculo.fornecedorAtualNome);
        setSelectedFornecedorId(defaultVeiculo.fornecedorAtualId || '');
      }
    }
  }, [defaultVeiculo]);

  // Update KM when vehicle selector changes
  const handleSelectVeiculo = (vId: string) => {
    setSelectedVeiculoId(vId);
    const v = veiculos.find((x) => x.id === vId);
    if (v) {
      setKmSaida(v.kmAtual || '');
      if (v.etapaKanban && v.etapaKanban !== 'Pronto para Pátio') {
        setEtapa(v.etapaKanban);
      }
    }
  };

  // Filter suppliers by current stage category
  const fornecedoresFiltrados = useMemo(() => {
    return fornecedores.filter((f) => {
      if (etapa === 'Estética') {
        return f.categoria === 'Estética Automotiva / Lava Rápido' || f.categoria === 'Outros';
      }
      if (etapa === 'Funilaria') {
        return f.categoria === 'Funilaria e Pintura' || f.categoria === 'Outros';
      }
      if (etapa === 'Oficina') {
        return (
          f.categoria === 'Oficina Mecânica' ||
          f.categoria === 'Auto Elétrica' ||
          f.categoria === 'Pneus e Rodas' ||
          f.categoria === 'Autopeças / Peças' ||
          f.categoria === 'Outros'
        );
      }
      return true;
    });
  }, [fornecedores, etapa]);

  const supplierOptions = useMemo(() => {
    return fornecedoresFiltrados.map((f) => ({
      value: f.nome,
      label: f.nome,
      subtitle: `${f.categoria}${f.telefone ? ` • ${f.telefone}` : ''}`,
    }));
  }, [fornecedoresFiltrados]);

  // Handle supplier change
  const handleSupplierSelect = (val: string) => {
    setFornecedorNome(val);
    const found = fornecedores.find((f) => f.nome.toLowerCase() === val.toLowerCase());
    if (found) {
      setSelectedFornecedorId(found.id);
    } else {
      setSelectedFornecedorId('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!veiculoSelecionado) return;

    setIsSubmitting(true);
    try {
      const custoNum = valorCusto !== '' ? Number(valorCusto) : undefined;
      const kmNum = kmSaida !== '' ? Number(kmSaida) : veiculoSelecionado.kmAtual;

      const matchedFornecedor = fornecedores.find(
        (f) => f.id === selectedFornecedorId || f.nome.toLowerCase() === fornecedorNome.toLowerCase()
      );

      let catFornecedor: CategoriaFornecedor = 'Outro Parceiro';
      if (etapa === 'Estética') catFornecedor = 'Lava Jato / Estética Automotiva';
      else if (etapa === 'Funilaria') catFornecedor = 'Funilaria e Pintura';
      else if (etapa === 'Oficina') catFornecedor = 'Oficina Mecânica';

      const paramsEnvio: ParametrosEnviarServico = {
        veiculo: veiculoSelecionado,
        etapaKanban: etapa,
        motivoSaida: motivoSaida || 'Preparação de Estoque',
        servicoDescricao: servicoDetalhe.trim() || motivoSaida,
        fornecedorId: matchedFornecedor?.id || undefined,
        fornecedorNome: fornecedorNome.trim() || undefined,
        fornecedorCategoria: matchedFornecedor?.categoria || catFornecedor,
        kmSaida: kmNum,
        previsaoRetorno: previsaoRetorno || undefined,
        dataSaida: dataSaida || new Date().toISOString().split('T')[0],
        custoEstimado: custoNum,
        motoristaTranslado: motoristaTranslado.trim() || undefined,
        observacoes: observacoes.trim() || undefined,
        usuario: currentUser,
        origemModulo: 'Envio Rápido para Serviço',
      };

      // Optional financial expense integration
      let despesaData: Omit<DespesaVeiculo, 'id'> | undefined = undefined;
      if (lancarDespesa && custoNum && custoNum > 0) {
        let catDespesa: CategoriaDespesa = 'Estética / Lavagem';
        if (etapa === 'Funilaria') catDespesa = 'Funilaria / Pintura';
        if (etapa === 'Oficina') catDespesa = 'Mecânica / Mão de Obra';

        const conta = contasBancarias.find((c) => c.id === selectedContaBancariaId);

        despesaData = {
          veiculoId: veiculoSelecionado.id,
          chassi: veiculoSelecionado.chassi,
          placa: veiculoSelecionado.placa,
          categoria: catDespesa,
          descricao: `Serviço de ${etapa}: ${servicoDetalhe.trim() || motivoSaida}${fornecedorNome ? ` (${fornecedorNome})` : ''}`,
          valor: custoNum,
          data: dataSaida,
          fornecedor: fornecedorNome.trim() || 'Oficina / Parceiro Externo',
          fornecedorId: matchedFornecedor?.id || undefined,
          statusPagamento: statusPagamento,
          formaPagamento: statusPagamento === 'Pago' ? formaPagamento : undefined,
          contaBancariaId: statusPagamento === 'Pago' ? selectedContaBancariaId : undefined,
          contaBancariaNome: statusPagamento === 'Pago' ? conta?.nome : undefined,
          dataPagamento: statusPagamento === 'Pago' ? dataSaida : undefined,
          observacoes: observacoes.trim() || undefined,
          comprovanteUrl: undefined,
        };
      }

      await onConfirmarEnvio({
        veiculoId: veiculoSelecionado.id,
        paramsEnvio,
        despesaData,
      });

      onClose();
    } catch (err) {
      console.error('Erro ao enviar veículo para serviço:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-2xl max-h-[92vh] flex flex-col bg-gray-900 rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 p-5 bg-[#16171f] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center justify-center">
              <Wrench size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                <span>Enviar Veículo para Serviço / Preparação</span>
              </h3>
              <p className="text-xs text-slate-400">
                Sincroniza automaticamente a coluna do Kanban, status de pátio e auditoria do chassi.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-xs">
          
          {/* 1. SELEÇÃO DO VEÍCULO */}
          <div className="p-4 rounded-2xl bg-black/30 border border-white/5 space-y-3">
            <label className="block text-slate-300 font-bold uppercase tracking-wider text-[11px] flex items-center gap-2">
              <Car size={14} className="text-orange-400" />
              <span>1. Veículo a ser Movimentado *</span>
            </label>

            {defaultVeiculo ? (
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#16171f] border border-white/10">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded font-mono font-black text-xs bg-orange-500/20 text-orange-300 border border-orange-500/30">
                      {defaultVeiculo.placa}
                    </span>
                    <h4 className="font-bold text-white text-sm">{defaultVeiculo.modelo}</h4>
                  </div>
                  <span className="text-[11px] text-slate-400 block">
                    {defaultVeiculo.marca} • {defaultVeiculo.ano} • {defaultVeiculo.cor} • Status atual: <strong className="text-slate-200">{defaultVeiculo.status}</strong>
                  </span>
                </div>

                <span className="text-xs font-mono font-bold text-slate-300 bg-black/40 px-2.5 py-1 rounded-lg border border-white/5">
                  {formatKm(defaultVeiculo.kmAtual)}
                </span>
              </div>
            ) : (
              <select
                required
                value={selectedVeiculoId}
                onChange={(e) => handleSelectVeiculo(e.target.value)}
                className="w-full p-3 rounded-xl border border-white/10 bg-[#16171f] text-white font-medium outline-none focus:border-orange-500"
              >
                {veiculos
                  .filter((v) => v.status !== 'Vendido')
                  .map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.placa} - {v.modelo} ({v.marca} {v.ano}) • {v.status}
                    </option>
                  ))}
              </select>
            )}
          </div>

          {/* 2. ETAPA KANBAN (OFICINA, FUNILARIA OU ESTÉTICA) */}
          <div className="space-y-2">
            <label className="block text-slate-300 font-bold uppercase tracking-wider text-[11px]">
              2. Etapa de Destino no Funil *
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setEtapa('Estética');
                  setMotivoSaida(MOTIVOS_RAPIDOS['Estética'][0]);
                }}
                className={`p-3 rounded-2xl border text-left flex flex-col items-center justify-center gap-1.5 transition cursor-pointer ${
                  etapa === 'Estética'
                    ? 'bg-purple-950/40 border-purple-500 text-white shadow-lg shadow-purple-950/40 ring-1 ring-purple-500'
                    : 'bg-black/30 border-white/5 text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Sparkles size={20} className={etapa === 'Estética' ? 'text-purple-400' : 'text-slate-500'} />
                <span className="font-bold text-xs text-center">3. Estética & Lavagem</span>
                <span className="text-[10px] text-slate-500 text-center">Polimento, lava-jato, higienização</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEtapa('Oficina');
                  setMotivoSaida(MOTIVOS_RAPIDOS['Oficina'][0]);
                }}
                className={`p-3 rounded-2xl border text-left flex flex-col items-center justify-center gap-1.5 transition cursor-pointer ${
                  etapa === 'Oficina'
                    ? 'bg-orange-950/40 border-orange-500 text-white shadow-lg shadow-orange-950/40 ring-1 ring-orange-500'
                    : 'bg-black/30 border-white/5 text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Wrench size={20} className={etapa === 'Oficina' ? 'text-orange-400' : 'text-slate-500'} />
                <span className="font-bold text-xs text-center">1. Oficina Mecânica</span>
                <span className="text-[10px] text-slate-500 text-center">Revisão, freios, motor, elétrica</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEtapa('Funilaria');
                  setMotivoSaida(MOTIVOS_RAPIDOS['Funilaria'][0]);
                }}
                className={`p-3 rounded-2xl border text-left flex flex-col items-center justify-center gap-1.5 transition cursor-pointer ${
                  etapa === 'Funilaria'
                    ? 'bg-blue-950/40 border-blue-500 text-white shadow-lg shadow-blue-950/40 ring-1 ring-blue-500'
                    : 'bg-black/30 border-white/5 text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Paintbrush size={20} className={etapa === 'Funilaria' ? 'text-blue-400' : 'text-slate-500'} />
                <span className="font-bold text-xs text-center">2. Funilaria & Pintura</span>
                <span className="text-[10px] text-slate-500 text-center">Martelinho, retoques, peças</span>
              </button>
            </div>
          </div>

          {/* 3. MOTIVO DA SAÍDA COM TAGS RÁPIDAS */}
          <div className="space-y-2.5">
            <label className="block text-slate-300 font-bold uppercase tracking-wider text-[11px] flex items-center justify-between">
              <span>3. Motivo da Saída / Tipo de Serviço *</span>
              <span className="text-slate-500 font-normal">Clique para selecionar rápido</span>
            </label>

            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-black/20 rounded-xl border border-white/5">
              {MOTIVOS_RAPIDOS[etapa].map((motivo) => (
                <button
                  type="button"
                  key={motivo}
                  onClick={() => setMotivoSaida(motivo)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                    motivoSaida === motivo
                      ? 'bg-orange-500 text-white font-bold shadow'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {motivo}
                </button>
              ))}
            </div>

            <input
              type="text"
              required
              value={motivoSaida}
              onChange={(e) => setMotivoSaida(e.target.value)}
              placeholder="Digite ou personalize o motivo da saída..."
              className="w-full p-2.5 rounded-xl border border-white/10 bg-[#16171f] text-white outline-none focus:border-orange-500"
            />
          </div>

          {/* 4. PRESTADOR / FORNECEDOR */}
          <div className="space-y-2">
            <label className="block text-slate-300 font-bold uppercase tracking-wider text-[11px] flex items-center gap-2">
              <Building2 size={14} className="text-orange-400" />
              <span>4. Fornecedor / Parceiro Prestador</span>
            </label>

            <CreatableSelect
              value={fornecedorNome}
              onChange={handleSupplierSelect}
              options={supplierOptions}
              placeholder="Selecione um parceiro cadastrado ou digite novo..."
              searchPlaceholder="Buscar prestador de serviço..."
              className="w-full"
            />
          </div>

          {/* 5. KM, DATAS & PREVISÕES */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-300 font-bold mb-1 flex items-center gap-1.5">
                <Gauge size={13} className="text-slate-400" />
                <span>KM de Saída (Odômetro)</span>
              </label>
              <input
                type="number"
                value={kmSaida}
                onChange={(e) => setKmSaida(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="Ex: 85200"
                className="w-full p-2.5 rounded-xl border border-white/10 bg-[#16171f] text-white font-mono outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1 flex items-center gap-1.5">
                <Calendar size={13} className="text-slate-400" />
                <span>Data da Saída *</span>
              </label>
              <input
                type="date"
                required
                value={dataSaida}
                onChange={(e) => setDataSaida(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-white/10 bg-[#16171f] text-white outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1 flex items-center gap-1.5">
                <Clock size={13} className="text-slate-400" />
                <span>Previsão de Retorno</span>
              </label>
              <input
                type="date"
                value={previsaoRetorno}
                onChange={(e) => setPrevisaoRetorno(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-white/10 bg-[#16171f] text-white outline-none focus:border-orange-500"
              />
            </div>
          </div>

          {/* 6. MOTORISTA / RESPONSÁVEL PELO TRANSLADO */}
          <div>
            <label className="block text-slate-300 font-bold mb-1 flex items-center gap-1.5">
              <User size={13} className="text-slate-400" />
              <span>Motorista / Responsável pelo Transporte (Opcional)</span>
            </label>
            <input
              type="text"
              value={motoristaTranslado}
              onChange={(e) => setMotoristaTranslado(e.target.value)}
              placeholder="Nome do motorista, guincheiro ou funcionário..."
              className="w-full p-2.5 rounded-xl border border-white/10 bg-[#16171f] text-white outline-none focus:border-orange-500"
            />
          </div>

          {/* 7. INTEGRAÇÃO FINANCEIRA: LANÇAR CUSTO ESTIMADO NO CHASSI */}
          <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign size={16} className="text-emerald-400" />
                <span className="font-bold text-white text-xs">Custo Previsto / Despesa no Chassi</span>
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={lancarDespesa}
                  onChange={(e) => setLancarDespesa(e.target.checked)}
                  className="w-4 h-4 rounded text-orange-500 focus:ring-0 bg-black/50 border-white/20"
                />
                <span className="font-bold text-xs">Lançar no Contas a Pagar / CMV</span>
              </label>
            </div>

            {lancarDespesa && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-white/5 animate-fadeIn">
                <div>
                  <label className="block text-slate-400 text-[11px] font-bold mb-1">
                    Valor Estimado (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required={lancarDespesa}
                    value={valorCusto}
                    onChange={(e) => setValorCusto(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="Ex: 150.00"
                    className="w-full p-2 rounded-xl border border-emerald-500/30 bg-[#16171f] text-emerald-300 font-mono font-bold outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-[11px] font-bold mb-1">
                    Status do Pagamento
                  </label>
                  <select
                    value={statusPagamento}
                    onChange={(e) => setStatusPagamento(e.target.value as 'Pendente' | 'Pago')}
                    className="w-full p-2 rounded-xl border border-white/10 bg-[#16171f] text-white outline-none"
                  >
                    <option value="Pendente">Pendente (Contas a Pagar)</option>
                    <option value="Pago">Pago (Liquidado Agora)</option>
                  </select>
                </div>

                {statusPagamento === 'Pago' ? (
                  <div>
                    <label className="block text-slate-400 text-[11px] font-bold mb-1">
                      Conta de Saída
                    </label>
                    <select
                      value={selectedContaBancariaId}
                      onChange={(e) => setSelectedContaBancariaId(e.target.value)}
                      className="w-full p-2 rounded-xl border border-white/10 bg-[#16171f] text-white outline-none"
                    >
                      {contasBancarias.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome} ({formatCurrency(c.saldoAtual)})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-slate-400 text-[11px] font-bold mb-1">
                      Vencimento do Pagamento
                    </label>
                    <input
                      type="date"
                      value={dataVencimento}
                      onChange={(e) => setDataVencimento(e.target.value)}
                      className="w-full p-2 rounded-xl border border-white/10 bg-[#16171f] text-white outline-none"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 8. OBSERVAÇÕES */}
          <div>
            <label className="block text-slate-300 font-bold mb-1">
              Observações Adicionais (Opcional)
            </label>
            <textarea
              rows={2}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Instruções específicas para o prestador ou para a equipe..."
              className="w-full p-2.5 rounded-xl border border-white/10 bg-[#16171f] text-white outline-none resize-none focus:border-orange-500"
            />
          </div>

          {/* INFO CARD DE SINCRONIZAÇÃO AUTOMÁTICA */}
          <div className="p-3.5 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-200 flex items-start gap-2.5">
            <CheckCircle2 size={16} className="text-orange-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-[11px] block">Sincronização 100% Automática:</span>
              <p className="text-[10px] text-orange-200/80 leading-relaxed">
                Ao confirmar, o veículo será movido para a coluna <strong>{etapa}</strong> no Funil Kanban, seu status de estoque virará <strong>Em Preparação</strong> ({etapa === 'Oficina' ? 'Em Manutenção' : 'Em Preparação'}) e o histórico será registrado na Linha do Tempo do Chassi.
              </p>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="bg-[#16171f] px-6 py-4 border-t border-white/10 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-slate-300 transition cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={isSubmitting || !veiculoSelecionado}
            onClick={handleSubmit}
            className="px-6 py-2.5 rounded-xl text-xs font-black bg-orange-600 hover:bg-orange-500 text-white transition flex items-center gap-2 shadow-lg shadow-orange-950/40 cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 size={16} />
            <span>{isSubmitting ? 'Sincronizando...' : 'Confirmar Envio & Sincronizar'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
