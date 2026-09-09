import React, { useState, useEffect } from 'react';
import { X, Calendar, Key, User, DollarSign, Smartphone, History, Gauge, AlertTriangle, ShieldCheck, CheckCircle2, Clock, Edit3 } from 'lucide-react';
import { Veiculo, ContratoLocacao } from '../types';

interface ModalNovoContratoProps {
  isOpen: boolean;
  onClose: () => void;
  veiculosDisponiveis: Veiculo[];
  defaultVeiculo?: Veiculo | null;
  contratoToEdit?: ContratoLocacao | null;
  checklistsExistentes?: any[];
  initialMotoristaData?: {
    nome?: string;
    cpf?: string;
    telefone?: string;
    app?: string;
    placaInteresse?: string;
  } | null;
  onSaveContrato: (
    veiculoId: string, 
    contratoData: Omit<ContratoLocacao, 'id' | 'pagamentos'>,
    editContratoId?: string
  ) => void;
}

export const ModalNovoContrato: React.FC<ModalNovoContratoProps> = ({
  isOpen,
  onClose,
  veiculosDisponiveis,
  defaultVeiculo,
  contratoToEdit,
  checklistsExistentes = [],
  initialMotoristaData,
  onSaveContrato,
}) => {
  const [selectedVeiculoId, setSelectedVeiculoId] = useState<string>('');
  const [motoristaNome, setMotoristaNome] = useState('');
  const [motoristaCpf, setMotoristaCpf] = useState('');
  const [motoristaRg, setMotoristaRg] = useState('');
  const [motoristaCnh, setMotoristaCnh] = useState('');
  const [motoristaCnhCategoria, setMotoristaCnhCategoria] = useState('B');
  const [motoristaCnhValidade, setMotoristaCnhValidade] = useState('');
  const [motoristaNacionalidade, setMotoristaNacionalidade] = useState('Brasileiro(a)');
  const [motoristaEstadoCivil, setMotoristaEstadoCivil] = useState('Solteiro(a)');
  const [motoristaProfissao, setMotoristaProfissao] = useState('Motorista de Aplicativo');
  const [motoristaEmail, setMotoristaEmail] = useState('');
  
  // Endereço do Motorista
  const [logradouro, setLogradouro] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [cep, setCep] = useState('');
  const [cidade, setCidade] = useState('');
  const [uf, setUf] = useState('SP');

  const [motoristaTelefone, setMotoristaTelefone] = useState('');
  const [motoristaApp, setMotoristaApp] = useState<'Uber' | '99' | 'Indrive' | 'Misto'>('Uber');
  const [valorSemanal, setValorSemanal] = useState<number>(770);
  const [diaCobranca, setDiaCobranca] = useState<any>('Segunda-feira');
  
  // Caução & Parcelamento
  const [caucao, setCaucao] = useState<number>(600);
  const [formaPagamentoCaucao, setFormaPagamentoCaucao] = useState<'A_VISTA' | 'PARCELADO_SEMANAL'>('A_VISTA');
  const [quantidadeParcelasCaucao, setQuantidadeParcelasCaucao] = useState<number>(6);

  // Representante Legal da Locadora
  const [representanteLocadoraNome, setRepresentanteLocadoraNome] = useState('Diretoria Auto Gestor');
  const [representanteLocadoraCpf, setRepresentanteLocadoraCpf] = useState('');

  // Vistoria Vinculada
  const [vistoriaRetiradaId, setVistoriaRetiradaId] = useState<string>('');

  const [dataInicio, setDataInicio] = useState(new Date().toISOString().split('T')[0]);

  // 1. Suporte a Contratos Ativos e Legados (Migração de Histórico)
  const [isMigracao, setIsMigracao] = useState<boolean>(false);
  const [dataInicioMedicaoKm, setDataInicioMedicaoKm] = useState<string>(new Date().toISOString().split('T')[0]);
  const [kmInicialCustom, setKmInicialCustom] = useState<number>(0);
  const [caucaoPendente, setCaucaoPendente] = useState<boolean>(false);

  // 2. Controle de Limite de KM e Multas Parametrizáveis
  const [limiteKmSemanal, setLimiteKmSemanal] = useState<number>(1750);
  const [valorMultaPorKmExcedente, setValorMultaPorKmExcedente] = useState<number>(1.20);
  const [percentualMultaAtraso, setPercentualMultaAtraso] = useState<number>(40);

  useEffect(() => {
    if (contratoToEdit) {
      setSelectedVeiculoId(contratoToEdit.veiculoId);
      setMotoristaNome(contratoToEdit.motoristaNome);
      setMotoristaCpf(contratoToEdit.motoristaCpf);
      setMotoristaRg(contratoToEdit.motoristaRg || '');
      setMotoristaCnh(contratoToEdit.motoristaCnh || '');
      setMotoristaCnhCategoria(contratoToEdit.motoristaCnhCategoria || 'B');
      setMotoristaCnhValidade(contratoToEdit.motoristaCnhValidade || '');
      if (contratoToEdit.motoristaEndereco) {
        setLogradouro(contratoToEdit.motoristaEndereco.logradouro || '');
        setNumero(contratoToEdit.motoristaEndereco.numero || '');
        setComplemento(contratoToEdit.motoristaEndereco.complemento || '');
        setBairro(contratoToEdit.motoristaEndereco.bairro || '');
        setCep(contratoToEdit.motoristaEndereco.cep || '');
        setCidade(contratoToEdit.motoristaEndereco.cidade || '');
        setUf(contratoToEdit.motoristaEndereco.uf || 'SP');
      }
      setMotoristaTelefone(contratoToEdit.motoristaTelefone || '');
      setMotoristaApp(contratoToEdit.motoristaApp || 'Uber');
      setMotoristaNacionalidade(contratoToEdit.motoristaNacionalidade || 'Brasileiro(a)');
      setMotoristaEstadoCivil(contratoToEdit.motoristaEstadoCivil || 'Solteiro(a)');
      setMotoristaProfissao(contratoToEdit.motoristaProfissao || 'Motorista de Aplicativo');
      setMotoristaEmail(contratoToEdit.motoristaEmail || '');
      setValorSemanal(contratoToEdit.valorSemanal || 770);
      setDiaCobranca(contratoToEdit.diaCobranca || 'Segunda-feira');
      setCaucao(contratoToEdit.caucao || 600);
      setFormaPagamentoCaucao(contratoToEdit.formaPagamentoCaucao || 'A_VISTA');
      setQuantidadeParcelasCaucao(contratoToEdit.quantidadeParcelasCaucao || 6);
      setRepresentanteLocadoraNome(contratoToEdit.representanteLocadoraNome || 'Diretoria Auto Gestor');
      setRepresentanteLocadoraCpf(contratoToEdit.representanteLocadoraCpf || '');
      setVistoriaRetiradaId(contratoToEdit.vistoriaRetiradaId || '');
      setDataInicio(contratoToEdit.dataInicio || new Date().toISOString().split('T')[0]);
      setIsMigracao(Boolean(contratoToEdit.isMigracao));
      setDataInicioMedicaoKm(contratoToEdit.dataInicioMedicaoKm || contratoToEdit.dataInicio || new Date().toISOString().split('T')[0]);
      setKmInicialCustom(contratoToEdit.kmInicial || 0);
      setCaucaoPendente(Boolean(contratoToEdit.caucaoPendente));
      setLimiteKmSemanal(contratoToEdit.limiteKmSemanal ?? 1750);
      setValorMultaPorKmExcedente(contratoToEdit.valorMultaPorKmExcedente ?? 1.20);
      setPercentualMultaAtraso(contratoToEdit.percentualMultaAtraso ?? 10);
    } else if (defaultVeiculo) {
      setSelectedVeiculoId(defaultVeiculo.id);
      setKmInicialCustom(defaultVeiculo.kmAtual || 0);
    } else if (veiculosDisponiveis.length > 0 && !selectedVeiculoId) {
      setSelectedVeiculoId(veiculosDisponiveis[0].id);
      setKmInicialCustom(veiculosDisponiveis[0].kmAtual || 0);
    }

    if (isOpen && initialMotoristaData && !contratoToEdit) {
      if (initialMotoristaData.nome) setMotoristaNome(initialMotoristaData.nome);
      if (initialMotoristaData.cpf) setMotoristaCpf(initialMotoristaData.cpf);
      if (initialMotoristaData.telefone) setMotoristaTelefone(initialMotoristaData.telefone);
      if (initialMotoristaData.app) {
        const appVal = initialMotoristaData.app;
        if (appVal === 'Uber' || appVal === '99' || appVal === 'Indrive' || appVal === 'Misto') {
          setMotoristaApp(appVal);
        }
      }
      if (initialMotoristaData.placaInteresse && !defaultVeiculo) {
        const matchingVeic = veiculosDisponiveis.find(
          (v) => v.placa.toUpperCase() === initialMotoristaData.placaInteresse?.toUpperCase()
        );
        if (matchingVeic) {
          setSelectedVeiculoId(matchingVeic.id);
          setKmInicialCustom(matchingVeic.kmAtual || 0);
        }
      }
    }
  }, [defaultVeiculo, veiculosDisponiveis, isOpen, initialMotoristaData, contratoToEdit]);

  if (!isOpen) return null;

  const currentVeiculo = veiculosDisponiveis.find((v) => v.id === selectedVeiculoId) || defaultVeiculo;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVeiculoId || !motoristaNome.trim()) {
      alert('Por favor, informe o motorista e selecione o veículo.');
      return;
    }

    if (!isMigracao && !motoristaCpf.trim()) {
      alert('Por favor, preencha o CPF do motorista.');
      return;
    }

    if (!currentVeiculo) return;

    const kmInicialDefinido = isMigracao && kmInicialCustom > 0 ? kmInicialCustom : (currentVeiculo.kmAtual || 0);

    const enderecoObj = (logradouro.trim() || cidade.trim()) ? {
      logradouro: logradouro.trim(),
      numero: numero.trim(),
      complemento: complemento.trim() || undefined,
      bairro: bairro.trim(),
      cep: cep.trim(),
      cidade: cidade.trim(),
      uf: uf.trim().toUpperCase() || 'SP',
    } : undefined;

    const valorParcelaCalc = formaPagamentoCaucao === 'PARCELADO_SEMANAL' && quantidadeParcelasCaucao > 0
      ? Number((Number(caucao) / quantidadeParcelasCaucao).toFixed(2))
      : undefined;

    onSaveContrato(
      selectedVeiculoId,
      {
        veiculoId: selectedVeiculoId,
        placa: currentVeiculo.placa,
        modelo: currentVeiculo.modelo,
        motoristaNome: motoristaNome.trim(),
        motoristaCpf: motoristaCpf.trim() || 'Migração - Não informado',
        motoristaRg: motoristaRg.trim() || undefined,
        motoristaCnh: motoristaCnh.trim() || undefined,
        motoristaCnhCategoria: motoristaCnhCategoria || 'B',
        motoristaCnhValidade: motoristaCnhValidade || undefined,
        motoristaNacionalidade: motoristaNacionalidade.trim() || 'Brasileiro(a)',
        motoristaEstadoCivil: motoristaEstadoCivil.trim() || 'Solteiro(a)',
        motoristaProfissao: motoristaProfissao.trim() || 'Motorista de Aplicativo',
        motoristaEmail: motoristaEmail.trim() || undefined,
        motoristaEndereco: enderecoObj,
        motoristaTelefone: motoristaTelefone.trim() || '(11) 99999-9999',
        motoristaApp,
        dataInicio,
        valorSemanal: Number(valorSemanal),
        diaCobranca,
        caucao: Number(caucao),
        formaPagamentoCaucao,
        quantidadeParcelasCaucao: formaPagamentoCaucao === 'PARCELADO_SEMANAL' ? quantidadeParcelasCaucao : undefined,
        valorParcelaCaucao: valorParcelaCalc,
        representanteLocadoraNome: representanteLocadoraNome.trim() || undefined,
        representanteLocadoraCpf: representanteLocadoraCpf.trim() || undefined,
        vistoriaRetiradaId: vistoriaRetiradaId || undefined,
        status: contratoToEdit?.status || 'Ativo',
        kmInicial: kmInicialDefinido,
        kmAtual: Math.max(kmInicialDefinido, currentVeiculo.kmAtual || kmInicialDefinido),
        // Novos campos
        isMigracao,
        dataInicioMedicaoKm: dataInicioMedicaoKm || dataInicio,
        caucaoPendente,
        limiteKmSemanal: Number(limiteKmSemanal) || 1750,
        valorMultaPorKmExcedente: Number(valorMultaPorKmExcedente) || 1.20,
        percentualMultaAtraso: Number(percentualMultaAtraso) || 10,
      },
      contratoToEdit?.id
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-2xl max-h-[92vh] flex flex-col bg-gray-900 rounded-2xl shadow-xl overflow-hidden border border-white/10">
        {/* Header */}
        <div className="bg-[#16171f] text-white p-5 sm:p-6 flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg ${
              contratoToEdit ? 'bg-amber-600 shadow-amber-950/40' : 'bg-emerald-600 shadow-emerald-950/40'
            }`}>
              {contratoToEdit ? <Edit3 size={22} /> : <Key size={22} />}
            </div>
            <div>
              <h3 className="font-extrabold text-lg flex items-center gap-2">
                {contratoToEdit ? 'Editar Contrato de Locação' : 'Novo Contrato de Locação'}
                {isMigracao && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    Modo Migração
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                {contratoToEdit 
                  ? 'Ajuste regras, limite de KM e valores. O histórico de pagamentos passados será preservado.'
                  : 'Gestão flexível para novos aluguéis e importação de contratos em andamento.'}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs">

            {/* Toggle de Contrato em Andamento (Migração de Histórico) */}
            <div className={`p-4 rounded-2xl border transition-all ${
              isMigracao 
                ? 'bg-blue-950/30 border-blue-500/40 shadow-inner' 
                : 'bg-[#16171f] border-white/10 hover:border-white/20'
            }`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl border ${isMigracao ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-white/5 text-slate-400 border-white/10'}`}>
                    <History size={20} />
                  </div>
                  <div>
                    <label htmlFor="toggle-migracao" className="font-bold text-sm text-white flex items-center gap-2 cursor-pointer">
                      Contrato em Andamento (Migração)
                    </label>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Ative se este contrato já estava em vigência antes do sistema. Torna vistorias e caução integral opcionais e ativa data de corte para KM.
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                  <input
                    id="toggle-migracao"
                    type="checkbox"
                    checked={isMigracao}
                    onChange={(e) => setIsMigracao(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Informações detalhadas do modo migração */}
              {isMigracao && (
                <div className="mt-3 pt-3 border-t border-blue-500/20 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] text-blue-200">
                  <div className="flex items-center gap-2 bg-blue-900/30 p-2 rounded-xl border border-blue-500/20">
                    <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                    <span>Vistoria Inicial de Retirada dispensada/opcional</span>
                  </div>
                  <div className="flex items-center gap-2 bg-blue-900/30 p-2 rounded-xl border border-blue-500/20">
                    <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                    <span>KM Inicial estimado e editável livremente</span>
                  </div>
                  <div className="flex items-center gap-2 bg-blue-900/30 p-2 rounded-xl border border-blue-500/20">
                    <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                    <span>Caução flexível (pode marcar como pendente)</span>
                  </div>
                  <div className="flex items-center gap-2 bg-blue-900/30 p-2 rounded-xl border border-blue-500/20">
                    <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                    <span>Data de corte de KM para evitar multas retroativas</span>
                  </div>
                </div>
              )}
            </div>

            {/* Veículo Selecionado */}
            <div>
              <label className="block text-slate-300 font-bold mb-1">Veículo da Frota *</label>
              {veiculosDisponiveis.length === 0 && !defaultVeiculo && !contratoToEdit ? (
                <p className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs">
                  Nenhum veículo disponível no pátio no momento.
                </p>
              ) : (
                <select
                  value={selectedVeiculoId}
                  disabled={Boolean(contratoToEdit)}
                  onChange={(e) => {
                    setSelectedVeiculoId(e.target.value);
                    const v = veiculosDisponiveis.find((x) => x.id === e.target.value);
                    if (v) setKmInicialCustom(v.kmAtual || 0);
                  }}
                  className="w-full p-2.5 rounded-xl border border-white/10 font-bold text-sm bg-[#16171f] text-slate-200 outline-none focus:border-blue-500 disabled:opacity-60"
                >
                  {contratoToEdit && (
                    <option value={contratoToEdit.veiculoId} className="bg-[#16171f] text-slate-200">
                      {contratoToEdit.placa} - {contratoToEdit.modelo}
                    </option>
                  )}
                  {veiculosDisponiveis.map((v) => (
                    <option key={v.id} value={v.id} className="bg-[#16171f] text-slate-200">
                      {v.placa} - {v.modelo} (KM: {v.kmAtual.toLocaleString()})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Dados do Motorista */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Nome Completo do Motorista *</label>
                <input
                  type="text"
                  required
                  value={motoristaNome}
                  onChange={(e) => setMotoristaNome(e.target.value)}
                  placeholder="Ex: Carlos Eduardo de Souza"
                  className="w-full p-2.5 rounded-xl border border-white/10 font-medium bg-[#16171f] text-slate-200 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1 flex items-center justify-between">
                  <span>CPF do Motorista {isMigracao ? '(Opcional em migração)' : '*'}</span>
                  {isMigracao && <span className="text-[10px] text-blue-400">Flexível</span>}
                </label>
                <input
                  type="text"
                  required={!isMigracao}
                  value={motoristaCpf}
                  onChange={(e) => setMotoristaCpf(e.target.value)}
                  placeholder="Ex: 123.456.789-00"
                  className="w-full p-2.5 rounded-xl border border-white/10 font-mono bg-[#16171f] text-slate-200 outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Documentos: RG e CNH */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] text-slate-300 font-semibold mb-1">RG do Motorista</label>
                <input
                  type="text"
                  value={motoristaRg}
                  onChange={(e) => setMotoristaRg(e.target.value)}
                  placeholder="Ex: 12.345.678-9"
                  className="w-full p-2 rounded-xl border border-white/10 text-xs bg-[#16171f] text-slate-200 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-300 font-semibold mb-1">Número da CNH</label>
                <input
                  type="text"
                  value={motoristaCnh}
                  onChange={(e) => setMotoristaCnh(e.target.value)}
                  placeholder="Ex: 01234567890"
                  className="w-full p-2 rounded-xl border border-white/10 font-mono text-xs bg-[#16171f] text-slate-200 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-300 font-semibold mb-1">Cat. CNH</label>
                <select
                  value={motoristaCnhCategoria}
                  onChange={(e) => setMotoristaCnhCategoria(e.target.value)}
                  className="w-full p-2 rounded-xl border border-white/10 text-xs bg-[#16171f] text-slate-200 outline-none focus:border-blue-500"
                >
                  <option value="B">B</option>
                  <option value="AB">AB</option>
                  <option value="A">A</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                  <option value="E">E</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-300 font-semibold mb-1">Validade CNH</label>
                <input
                  type="date"
                  value={motoristaCnhValidade}
                  onChange={(e) => setMotoristaCnhValidade(e.target.value)}
                  className="w-full p-2 rounded-xl border border-white/10 text-xs bg-[#16171f] text-slate-200 outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Qualificação Civil do Motorista */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] text-slate-300 font-semibold mb-1">Nacionalidade</label>
                <input
                  type="text"
                  value={motoristaNacionalidade}
                  onChange={(e) => setMotoristaNacionalidade(e.target.value)}
                  placeholder="Ex: Brasileiro(a)"
                  className="w-full p-2 rounded-xl border border-white/10 text-xs bg-[#16171f] text-slate-200 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-300 font-semibold mb-1">Estado Civil</label>
                <input
                  type="text"
                  value={motoristaEstadoCivil}
                  onChange={(e) => setMotoristaEstadoCivil(e.target.value)}
                  placeholder="Ex: Solteiro(a)"
                  className="w-full p-2 rounded-xl border border-white/10 text-xs bg-[#16171f] text-slate-200 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-300 font-semibold mb-1">Profissão</label>
                <input
                  type="text"
                  value={motoristaProfissao}
                  onChange={(e) => setMotoristaProfissao(e.target.value)}
                  placeholder="Ex: Motorista de Aplicativo"
                  className="w-full p-2 rounded-xl border border-white/10 text-xs bg-[#16171f] text-slate-200 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-300 font-semibold mb-1">E-mail do Condutor</label>
                <input
                  type="email"
                  value={motoristaEmail}
                  onChange={(e) => setMotoristaEmail(e.target.value)}
                  placeholder="Ex: motorista@email.com"
                  className="w-full p-2 rounded-xl border border-white/10 text-xs bg-[#16171f] text-slate-200 outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Endereço Residencial do Motorista */}
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-2.5">
              <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">
                Endereço Residencial do Motorista (Para Contrato)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    value={logradouro}
                    onChange={(e) => setLogradouro(e.target.value)}
                    placeholder="Logradouro / Rua / Av."
                    className="w-full p-2 rounded-xl border border-white/10 text-xs bg-[#16171f] text-slate-200 outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                    placeholder="Número / Compl."
                    className="w-full p-2 rounded-xl border border-white/10 text-xs bg-[#16171f] text-slate-200 outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <input
                    type="text"
                    value={bairro}
                    onChange={(e) => setBairro(e.target.value)}
                    placeholder="Bairro"
                    className="w-full p-2 rounded-xl border border-white/10 text-xs bg-[#16171f] text-slate-200 outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={cep}
                    onChange={(e) => setCep(e.target.value)}
                    placeholder="CEP (00000-000)"
                    className="w-full p-2 rounded-xl border border-white/10 text-xs bg-[#16171f] text-slate-200 outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                    placeholder="Cidade"
                    className="w-full p-2 rounded-xl border border-white/10 text-xs bg-[#16171f] text-slate-200 outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={uf}
                    maxLength={2}
                    onChange={(e) => setUf(e.target.value.toUpperCase())}
                    placeholder="UF (SP)"
                    className="w-full p-2 rounded-xl border border-white/10 text-xs bg-[#16171f] text-slate-200 outline-none focus:border-blue-500 text-center font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-bold mb-1">WhatsApp / Telefone de Contato</label>
                <input
                  type="text"
                  value={motoristaTelefone}
                  onChange={(e) => setMotoristaTelefone(e.target.value)}
                  placeholder="(11) 98765-4321"
                  className="w-full p-2.5 rounded-xl border border-white/10 font-medium bg-[#16171f] text-slate-200 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Aplicativo de Transporte Principal</label>
                <select
                  value={motoristaApp}
                  onChange={(e) => setMotoristaApp(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-white/10 font-semibold bg-[#16171f] text-slate-200 outline-none focus:border-blue-500"
                >
                  <option value="Uber" className="bg-[#16171f] text-slate-200">Uber</option>
                  <option value="99" className="bg-[#16171f] text-slate-200">99 Pop</option>
                  <option value="Indrive" className="bg-[#16171f] text-slate-200">InDrive</option>
                  <option value="Misto" className="bg-[#16171f] text-slate-200">Misto / Outros</option>
                </select>
              </div>
            </div>

            {/* Valores e Ciclo Financeiro */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-white/5">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Valor Semanal (R$) *</label>
                <div className="relative">
                  <input
                    type="number"
                    required
                    min={0}
                    step={10}
                    value={valorSemanal}
                    onChange={(e) => setValorSemanal(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-white/10 font-bold text-sm bg-[#16171f] text-emerald-400 outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Dia da Cobrança Semanal *</label>
                <select
                  value={diaCobranca}
                  onChange={(e) => setDiaCobranca(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-white/10 font-semibold bg-[#16171f] text-slate-200 outline-none focus:border-blue-500"
                >
                  <option value="Segunda-feira" className="bg-[#16171f] text-slate-200">Segunda-feira</option>
                  <option value="Terça-feira" className="bg-[#16171f] text-slate-200">Terça-feira</option>
                  <option value="Quarta-feira" className="bg-[#16171f] text-slate-200">Quarta-feira</option>
                  <option value="Quinta-feira" className="bg-[#16171f] text-slate-200">Quinta-feira</option>
                  <option value="Sexta-feira" className="bg-[#16171f] text-slate-200">Sexta-feira</option>
                  <option value="Sábado" className="bg-[#16171f] text-slate-200">Sábado</option>
                  <option value="Domingo" className="bg-[#16171f] text-slate-200">Domingo</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1 flex items-center justify-between">
                  <span>Caução Exigido (R$)</span>
                  {isMigracao && (
                    <span className="text-[10px] text-purple-400">Flexível</span>
                  )}
                </label>
                <input
                  type="number"
                  min={0}
                  step={50}
                  value={caucao}
                  onChange={(e) => setCaucao(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-white/10 font-bold text-sm bg-[#16171f] text-purple-400 outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {/* Parcelamento da Caução */}
            <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                  <ShieldCheck size={15} /> Condições de Pagamento da Caução
                </span>
                <span className="text-[10px] text-purple-300/70">Garantia Locatícia</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-300 font-semibold mb-1">Forma de Pagamento</label>
                  <select
                    value={formaPagamentoCaucao}
                    onChange={(e) => setFormaPagamentoCaucao(e.target.value as any)}
                    className="w-full p-2 rounded-xl border border-purple-500/30 text-xs bg-[#16171f] text-slate-200 outline-none focus:border-purple-500"
                  >
                    <option value="A_VISTA">À Vista na Assinatura (PIX / Transferência)</option>
                    <option value="PARCELADO_SEMANAL">Parcelado com os Aluguéis Semanais</option>
                  </select>
                </div>

                {formaPagamentoCaucao === 'PARCELADO_SEMANAL' ? (
                  <div>
                    <label className="block text-[11px] text-slate-300 font-semibold mb-1">Nº de Parcelas Semanais</label>
                    <select
                      value={quantidadeParcelasCaucao}
                      onChange={(e) => setQuantidadeParcelasCaucao(Number(e.target.value))}
                      className="w-full p-2 rounded-xl border border-purple-500/30 text-xs bg-[#16171f] text-purple-300 font-bold outline-none focus:border-purple-500"
                    >
                      <option value={2}>2 semanas (R$ {(caucao / 2).toFixed(2)}/sem)</option>
                      <option value={3}>3 semanas (R$ {(caucao / 3).toFixed(2)}/sem)</option>
                      <option value={4}>4 semanas (R$ {(caucao / 4).toFixed(2)}/sem)</option>
                      <option value={5}>5 semanas (R$ {(caucao / 5).toFixed(2)}/sem)</option>
                      <option value={6}>6 semanas (R$ {(caucao / 6).toFixed(2)}/sem)</option>
                    </select>
                  </div>
                ) : (
                  <div className="flex items-center text-[11px] text-purple-200/80 pt-4">
                    Integralização total de R$ {caucao.toLocaleString('pt-BR')} no ato da entrega das chaves.
                  </div>
                )}
              </div>
            </div>

            {/* Representante Legal da Locadora & Vistoria Vinculada */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">
                  Representante Legal da Locadora
                </span>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={representanteLocadoraNome}
                    onChange={(e) => setRepresentanteLocadoraNome(e.target.value)}
                    placeholder="Nome do Representante / Procurador"
                    className="w-full p-2 rounded-xl border border-white/10 text-xs bg-[#16171f] text-slate-200 outline-none focus:border-blue-500"
                  />
                  <input
                    type="text"
                    value={representanteLocadoraCpf}
                    onChange={(e) => setRepresentanteLocadoraCpf(e.target.value)}
                    placeholder="CPF do Representante (Opcional)"
                    className="w-full p-2 rounded-xl border border-white/10 text-xs bg-[#16171f] text-slate-200 outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Vistoria de Retirada
                  </span>
                  {isMigracao && <span className="text-[10px] text-blue-400 font-bold">Opcional</span>}
                </div>
                <p className="text-[10px] text-slate-500">
                  Vincular checklist com fotos e estado do veículo no início:
                </p>
                <select
                  value={vistoriaRetiradaId}
                  onChange={(e) => setVistoriaRetiradaId(e.target.value)}
                  className="w-full p-2 rounded-xl border border-white/10 text-xs bg-[#16171f] text-slate-200 outline-none focus:border-blue-500"
                >
                  <option value="">Nenhuma / Realizar vistoria separada posteriormente</option>
                  {checklistsExistentes
                    .filter((c) => !selectedVeiculoId || c.veiculoId === selectedVeiculoId)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        Vistoria #{c.id.slice(-5)} - {c.tipo} ({new Date(c.dataHora).toLocaleDateString()}) - KM {c.kmRegistrado}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Opções de Caução Pendente em Migração */}
            {isMigracao && (
              <div className="flex items-center gap-2 p-3 bg-purple-950/20 border border-purple-500/20 rounded-xl">
                <input
                  id="caucao-pendente-chk"
                  type="checkbox"
                  checked={caucaoPendente}
                  onChange={(e) => setCaucaoPendente(e.target.checked)}
                  className="rounded border-white/20 text-purple-600 focus:ring-purple-500 cursor-pointer"
                />
                <label htmlFor="caucao-pendente-chk" className="text-xs text-purple-200 cursor-pointer">
                  Caução pendente de integralização / não quitado integralmente na entrada
                </label>
              </div>
            )}

            {/* Regras e Parâmetros de KM e Multas */}
            <div className="p-4 rounded-2xl bg-[#16171f] border border-white/10 space-y-3">
              <div className="flex items-center gap-2 font-bold text-slate-200">
                <Gauge size={18} className="text-cyan-400" />
                <span>Parâmetros de Limite de KM e Multas</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-300 font-semibold mb-1">
                    Limite Semanal (KM) *
                  </label>
                  <input
                    type="number"
                    min={500}
                    step={50}
                    required
                    value={limiteKmSemanal}
                    onChange={(e) => setLimiteKmSemanal(Number(e.target.value))}
                    className="w-full p-2 rounded-xl border border-white/10 font-mono text-xs bg-slate-900 text-cyan-300 outline-none focus:border-cyan-500"
                  />
                  <span className="text-[10px] text-slate-500">Padrão: 1.750 km/semana</span>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-300 font-semibold mb-1">
                    Multa KM Excedente (R$/km) *
                  </label>
                  <input
                    type="number"
                    min={0.10}
                    step={0.05}
                    required
                    value={valorMultaPorKmExcedente}
                    onChange={(e) => setValorMultaPorKmExcedente(Number(e.target.value))}
                    className="w-full p-2 rounded-xl border border-white/10 font-mono text-xs bg-slate-900 text-rose-400 outline-none focus:border-rose-500"
                  />
                  <span className="text-[10px] text-slate-500">Padrão: R$ 1,20 por km</span>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-300 font-semibold mb-1">
                    Multa por Atraso no Aluguel (%) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={5}
                    required
                    value={percentualMultaAtraso}
                    onChange={(e) => setPercentualMultaAtraso(Number(e.target.value))}
                    className="w-full p-2 rounded-xl border border-white/10 font-mono text-xs bg-slate-900 text-amber-400 outline-none focus:border-amber-500"
                  />
                  <span className="text-[10px] text-slate-500">Padrão: 40% sobre a semana</span>
                </div>
              </div>

              {/* Data de Corte para KM e KM Inicial Flexível */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/5">
                <div>
                  <label className="block text-[11px] text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                    <Clock size={13} className="text-blue-400" />
                    <span>Data de Início da Medição de KM (Corte) *</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={dataInicioMedicaoKm}
                    onChange={(e) => setDataInicioMedicaoKm(e.target.value)}
                    className="w-full p-2 rounded-xl border border-white/10 text-xs bg-slate-900 text-white outline-none focus:border-blue-500"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1 leading-tight">
                    Leituras anteriores a esta data serão desconsideradas para multas/cobranças.
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-300 font-semibold mb-1 flex items-center justify-between">
                    <span>KM Inicial de Referência {isMigracao ? '(Editável)' : ''}</span>
                    {isMigracao && <span className="text-[10px] text-blue-400 font-bold">Opcional</span>}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={kmInicialCustom}
                    onChange={(e) => setKmInicialCustom(Number(e.target.value))}
                    disabled={!isMigracao}
                    className="w-full p-2 rounded-xl border border-white/10 font-mono text-xs bg-slate-900 text-white outline-none focus:border-blue-500 disabled:opacity-50"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1 leading-tight">
                    {isMigracao 
                      ? 'No modo migração, você pode informar um KM estimado ou anterior.'
                      : 'Herda automaticamente o odômetro atual do veículo no pátio.'}
                  </span>
                </div>
              </div>
            </div>

            {/* Datas do Contrato */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Data de Início do Contrato *</label>
                <div className="relative">
                  <Calendar size={14} className="absolute left-3 top-3 text-slate-500" />
                  <input
                    type="date"
                    required
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-white/10 text-xs bg-[#16171f] text-slate-200 outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Footer Actions */}
          <div className="p-4 sm:p-5 border-t border-white/10 bg-[#16171f] flex items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={veiculosDisponiveis.length === 0 && !defaultVeiculo && !contratoToEdit}
              className={`px-6 py-2.5 rounded-xl font-bold text-white shadow-lg disabled:opacity-50 transition cursor-pointer flex items-center gap-2 ${
                contratoToEdit 
                  ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-950/40' 
                  : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/40'
              }`}
            >
              {contratoToEdit ? <Edit3 size={16} /> : <Key size={16} />}
              <span>{contratoToEdit ? 'Salvar Alterações no Contrato' : 'Ativar Contrato de Locação'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
