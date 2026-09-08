import React, { useState } from 'react';
import { X, ShieldAlert, DollarSign, Calendar, FileText, Split, AlertTriangle, CheckCircle2, Clock, MapPin, Award } from 'lucide-react';
import { Veiculo, ContratoLocacao, DebitoMotorista, TipoDebitoMotorista } from '../types';
import { formatCurrency, calcularResumoCaucao } from '../utils/formatters';

interface ModalNovoDebitoMotoristaProps {
  isOpen: boolean;
  onClose: () => void;
  veiculo: Veiculo;
  contrato: ContratoLocacao;
  initialData?: {
    tipo?: TipoDebitoMotorista;
    descricao?: string;
    valorTotal?: number;
    formaQuitacao?: 'Caução' | 'Parcelamento Semanal' | 'PIX / À Vista';
  } | null;
  onSalvarDebito: (
    veiculoId: string,
    contratoId: string,
    novoDebito: DebitoMotorista,
    descontarCaucao: boolean,
    valorDescontarCaucao: number
  ) => void;
  onAbrirTermoMultaPdf?: (debito: DebitoMotorista) => void;
}

export const ModalNovoDebitoMotorista: React.FC<ModalNovoDebitoMotoristaProps> = ({
  isOpen,
  onClose,
  veiculo,
  contrato,
  initialData,
  onSalvarDebito,
  onAbrirTermoMultaPdf,
}) => {
  const resumoCaucao = calcularResumoCaucao(contrato);

  const [tipo, setTipo] = useState<TipoDebitoMotorista>(initialData?.tipo || 'Multa de Trânsito');
  const [descricao, setDescricao] = useState(initialData?.descricao || '');
  const [valorTotal, setValorTotal] = useState<number>(initialData?.valorTotal !== undefined ? initialData.valorTotal : 195.23);
  const [dataOcorrencia, setDataOcorrencia] = useState(new Date().toISOString().split('T')[0]);
  
  // Dados de Notificação de Autuação de Multa
  const [autoInfracao, setAutoInfracao] = useState('');
  const [codigoInfracao, setCodigoInfracao] = useState('7455-0');
  const [orgaoEmissor, setOrgaoEmissor] = useState('DETRAN');
  const [dataHoraInfracao, setDataHoraInfracao] = useState(`${new Date().toISOString().split('T')[0]}T14:30`);
  const [localInfracao, setLocalInfracao] = useState('');
  const [pontosCnh, setPontosCnh] = useState<number>(4);
  const [dataLimiteIndicacao, setDataLimiteIndicacao] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [statusNotificacao, setStatusNotificacao] = useState<'Aguardando Assinatura na Loja' | 'Assinado / Protocolado' | 'Pontos Transferidos' | 'Recurso' | 'Finalizado'>(
    'Aguardando Assinatura na Loja'
  );
  
  // Forma de Quitação
  const [formaQuitacao, setFormaQuitacao] = useState<'Caução' | 'Parcelamento Semanal' | 'PIX / À Vista'>(
    initialData?.formaQuitacao || 'Caução'
  );
  const [quantidadeParcelas, setQuantidadeParcelas] = useState<number>(4);
  const [observacoes, setObservacoes] = useState('');

  // Atualizar quando initialData mudar
  React.useEffect(() => {
    if (initialData) {
      if (initialData.tipo) setTipo(initialData.tipo);
      if (initialData.descricao) setDescricao(initialData.descricao);
      if (initialData.valorTotal !== undefined) setValorTotal(initialData.valorTotal);
      if (initialData.formaQuitacao) setFormaQuitacao(initialData.formaQuitacao);
    }
  }, [initialData]);

  if (!isOpen) return null;

  const valorParcelaSemanal = quantidadeParcelas > 0 ? Number((Number(valorTotal) / quantidadeParcelas).toFixed(2)) : Number(Number(valorTotal).toFixed(2));
  const podeDescontarCaucao = resumoCaucao.saldoAtual >= Number(valorTotal);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricao.trim() || valorTotal <= 0) {
      alert('Preencha a descrição do débito e o valor.');
      return;
    }

    const descontarDoCaucao = formaQuitacao === 'Caução';

    const novoDebito: DebitoMotorista = {
      id: `deb-${Date.now()}`,
      contratoId: contrato.id,
      veiculoId: veiculo.id,
      tipo,
      descricao: descricao.trim(),
      valorTotal: Number(valorTotal),
      dataOcorrencia,
      autoInfracao: autoInfracao.trim() || undefined,
      codigoInfracao: tipo === 'Multa de Trânsito' ? codigoInfracao.trim() : undefined,
      orgaoEmissor: orgaoEmissor.trim() || undefined,
      dataHoraInfracao: tipo === 'Multa de Trânsito' ? dataHoraInfracao : undefined,
      localInfracao: tipo === 'Multa de Trânsito' ? localInfracao.trim() : undefined,
      pontosCnh: tipo === 'Multa de Trânsito' ? pontosCnh : undefined,
      dataLimiteIndicacao: tipo === 'Multa de Trânsito' ? dataLimiteIndicacao : undefined,
      statusNotificacao: tipo === 'Multa de Trânsito' ? statusNotificacao : undefined,
      motoristaNotificado: true,
      status: descontarDoCaucao
        ? 'Descontado do Caução'
        : formaQuitacao === 'Parcelamento Semanal'
        ? 'Parcelado com Aluguel'
        : 'Pago pelo Motorista',
      formaQuitacao,
      valorPago: descontarDoCaucao || formaQuitacao === 'PIX / À Vista' ? Number(valorTotal) : 0,
      valorPendente: descontarDoCaucao || formaQuitacao === 'PIX / À Vista' ? 0 : Number(valorTotal),
      quantidadeParcelas: formaQuitacao === 'Parcelamento Semanal' ? quantidadeParcelas : undefined,
      valorParcelaSemanal: formaQuitacao === 'Parcelamento Semanal' ? valorParcelaSemanal : undefined,
      parcelasPagas: 0,
      observacoes: observacoes.trim() || undefined,
    };

    onSalvarDebito(
      veiculo.id,
      contrato.id,
      novoDebito,
      descontarDoCaucao,
      descontarDoCaucao ? Number(valorTotal) : 0
    );

    if (tipo === 'Multa de Trânsito' && onAbrirTermoMultaPdf && window.confirm('Débito registrado com sucesso! Deseja abrir e imprimir o Termo de Indicação do Condutor Infrator (PDF) agora?')) {
      onAbrirTermoMultaPdf(novoDebito);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-xl max-h-[90vh] flex flex-col bg-gray-900 rounded-2xl shadow-xl overflow-hidden border border-white/10">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-[#16171f] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <ShieldAlert size={22} />
            </div>
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                Registrar Débito do Motorista
              </h2>
              <p className="text-xs text-slate-400">
                {veiculo.modelo} • <span className="font-mono text-blue-400 font-bold">{veiculo.placa}</span> • {contrato.motoristaNome}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Tipo de Ocorrência */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-300 font-bold mb-1">Tipo de Ocorrência *</label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoDebitoMotorista)}
                className="w-full p-2.5 rounded-xl border border-white/10 bg-[#16171f] text-white text-xs font-semibold outline-none focus:border-rose-500"
              >
                <option value="Multa de Trânsito">Multa de Trânsito</option>
                <option value="Batida / Avaria">Batida / Avaria na Lataria</option>
                <option value="Acidente / Sinistro">Acidente / Sinistro</option>
                <option value="Franquia de Seguro">Franquia do Seguro</option>
                <option value="Guincho / Reboque">Guincho / Reboque</option>
                <option value="Chaveiro / Acessório">Chaveiro / Acessório Perdido</option>
                <option value="Outro">Outro Débito</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-300 font-bold mb-1">Data da Ocorrência *</label>
              <div className="relative">
                <Calendar size={14} className="absolute left-3 top-3 text-slate-500" />
                <input
                  type="date"
                  required
                  value={dataOcorrencia}
                  onChange={(e) => setDataOcorrencia(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-white/10 bg-[#16171f] text-white text-xs outline-none focus:border-rose-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-300 font-bold mb-1">Descrição Detalhada do Ocorrido *</label>
            <input
              type="text"
              required
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Excesso de velocidade 20% acima / Avaria no para-choque traseiro"
              className="w-full p-2.5 rounded-xl border border-white/10 bg-[#16171f] text-white text-xs outline-none focus:border-rose-500"
            />
          </div>

          {/* Dados Específicos se for Multa */}
          {tipo === 'Multa de Trânsito' && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-4">
              <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                <span className="font-bold text-xs text-amber-300 flex items-center gap-1.5">
                  <Award size={15} className="text-amber-400" /> Notificação de Autuação & Transferência de Pontos
                </span>
                <span className="text-[10px] text-amber-200/80">Procedimento CTB Art. 257</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-300 font-bold mb-1">Auto de Infração (AIT) *</label>
                  <input
                    type="text"
                    required
                    value={autoInfracao}
                    onChange={(e) => setAutoInfracao(e.target.value)}
                    placeholder="Ex: R482938-1 / T109283"
                    className="w-full p-2 rounded-xl border border-white/10 bg-[#16171f] text-white font-mono text-xs outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-300 font-bold mb-1">Cód. Enquadramento</label>
                  <input
                    type="text"
                    value={codigoInfracao}
                    onChange={(e) => setCodigoInfracao(e.target.value)}
                    placeholder="Ex: 7455-0 (Velocidade)"
                    className="w-full p-2 rounded-xl border border-white/10 bg-[#16171f] text-white font-mono text-xs outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-300 font-bold mb-1">Órgão Autuador</label>
                  <input
                    type="text"
                    value={orgaoEmissor}
                    onChange={(e) => setOrgaoEmissor(e.target.value)}
                    placeholder="DETRAN / PRF / CET / DER"
                    className="w-full p-2 rounded-xl border border-white/10 bg-[#16171f] text-white text-xs outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-300 font-bold mb-1">Data e Hora da Infração</label>
                  <input
                    type="datetime-local"
                    value={dataHoraInfracao}
                    onChange={(e) => setDataHoraInfracao(e.target.value)}
                    className="w-full p-2 rounded-xl border border-white/10 bg-[#16171f] text-white text-xs outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-300 font-bold mb-1">Gravidade & Pontos na CNH</label>
                  <select
                    value={pontosCnh}
                    onChange={(e) => {
                      const p = Number(e.target.value);
                      setPontosCnh(p);
                      if (p === 3) setValorTotal(88.38);
                      else if (p === 4) setValorTotal(130.16);
                      else if (p === 5) setValorTotal(195.23);
                      else if (p === 7) setValorTotal(293.47);
                    }}
                    className="w-full p-2 rounded-xl border border-white/10 bg-[#16171f] text-white font-bold text-xs outline-none focus:border-amber-500"
                  >
                    <option value={3}>Leve - 3 Pontos (R$ 88,38)</option>
                    <option value={4}>Média - 4 Pontos (R$ 130,16)</option>
                    <option value={5}>Grave - 5 Pontos (R$ 195,23)</option>
                    <option value={7}>Gravíssima - 7 Pontos (R$ 293,47)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-rose-300 font-bold mb-1">Prazo Limite Indicação</label>
                  <input
                    type="date"
                    value={dataLimiteIndicacao}
                    onChange={(e) => setDataLimiteIndicacao(e.target.value)}
                    className="w-full p-2 rounded-xl border border-rose-500/30 bg-[#16171f] text-white text-xs outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-300 font-bold mb-1">Local / Endereço da Infração</label>
                <div className="relative">
                  <MapPin size={13} className="absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    value={localInfracao}
                    onChange={(e) => setLocalInfracao(e.target.value)}
                    placeholder="Ex: Av. dos Bandeirantes, próx. ao nº 2500 / Rod. Castelo Branco KM 28"
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-white/10 bg-[#16171f] text-white text-xs outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-300 font-bold mb-1">Status da Transferência para o Motorista</label>
                <select
                  value={statusNotificacao}
                  onChange={(e) => setStatusNotificacao(e.target.value as any)}
                  className="w-full p-2 rounded-xl border border-white/10 bg-[#16171f] text-white text-xs outline-none focus:border-amber-500"
                >
                  <option value="Aguardando Assinatura na Loja">1. Aguardando Motorista Assinar Formulário na Loja</option>
                  <option value="Assinado / Protocolado">2. Termo Assinado e Protocolado no Órgão</option>
                  <option value="Pontos Transferidos">3. Pontos Transferidos com Sucesso para CNH</option>
                  <option value="Recurso">4. Em Recurso / Defesa Prévia</option>
                </select>
              </div>
            </div>
          )}

          {/* Valor */}
          <div>
            <label className="block text-xs text-rose-400 font-bold mb-1">Valor Total do Débito (R$) *</label>
            <div className="relative">
              <DollarSign size={16} className="absolute left-3 top-3 text-rose-400" />
              <input
                type="number"
                step="0.01"
                min="1"
                required
                value={valorTotal}
                onChange={(e) => setValorTotal(Number(e.target.value))}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-rose-500/40 bg-[#16171f] text-rose-300 font-mono font-black text-base outline-none focus:border-rose-500"
              />
            </div>
          </div>

          {/* Forma de Cobrança / Liquidação */}
          <div className="space-y-3 pt-2 border-t border-white/5">
            <label className="block text-xs font-bold text-slate-300">
              Como este débito será quitado pelo motorista?
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFormaQuitacao('Caução')}
                className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                  formaQuitacao === 'Caução'
                    ? 'bg-rose-500/20 border-rose-500 text-white'
                    : 'bg-[#16171f] border-white/5 text-slate-400 hover:text-white'
                }`}
              >
                <span className="text-xs font-bold block text-rose-400">1. Descontar do Caução</span>
                <span className="text-[10px] text-slate-400">Abate do saldo garantia e exige reposição</span>
              </button>

              <button
                type="button"
                onClick={() => setFormaQuitacao('Parcelamento Semanal')}
                className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                  formaQuitacao === 'Parcelamento Semanal'
                    ? 'bg-blue-500/20 border-blue-500 text-white'
                    : 'bg-[#16171f] border-white/5 text-slate-400 hover:text-white'
                }`}
              >
                <span className="text-xs font-bold block text-blue-400">2. Parcelar com Aluguel</span>
                <span className="text-[10px] text-slate-400">Soma parcelas semanais à cobrança do carro</span>
              </button>

              <button
                type="button"
                onClick={() => setFormaQuitacao('PIX / À Vista')}
                className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                  formaQuitacao === 'PIX / À Vista'
                    ? 'bg-emerald-500/20 border-emerald-500 text-white'
                    : 'bg-[#16171f] border-white/5 text-slate-400 hover:text-white'
                }`}
              >
                <span className="text-xs font-bold block text-emerald-400">3. À Vista / PIX</span>
                <span className="text-[10px] text-slate-400">Pago pelo motorista na hora</span>
              </button>
            </div>

            {/* Informações da Opção Escolhida */}
            {formaQuitacao === 'Caução' && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Saldo Atual do Caução:</span>
                  <span className="font-mono font-bold text-amber-300">{formatCurrency(resumoCaucao.saldoAtual)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Saldo Após o Abatimento:</span>
                  <span className="font-mono font-bold text-rose-400">
                    {formatCurrency(Math.max(0, resumoCaucao.saldoAtual - Number(valorTotal)))}
                  </span>
                </div>
                {!podeDescontarCaucao && (
                  <p className="text-rose-400 text-[11px] font-semibold pt-1 flex items-center gap-1">
                    <AlertTriangle size={13} />
                    O saldo caução ({formatCurrency(resumoCaucao.saldoAtual)}) é inferior ao débito. O restante precisará ser reposto ou parcelado.
                  </p>
                )}
              </div>
            )}

            {formaQuitacao === 'Parcelamento Semanal' && (
              <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-blue-300">Quantidade de Semanas / Parcelas:</label>
                  <select
                    value={quantidadeParcelas}
                    onChange={(e) => setQuantidadeParcelas(Number(e.target.value))}
                    className="p-1.5 rounded-lg bg-[#16171f] border border-blue-500/30 text-white font-mono font-bold text-xs"
                  >
                    <option value={1}>1 semana</option>
                    <option value={2}>2 semanas</option>
                    <option value={3}>3 semanas</option>
                    <option value={4}>4 semanas (1 mês)</option>
                    <option value={6}>6 semanas</option>
                    <option value={8}>8 semanas (2 meses)</option>
                    <option value={10}>10 semanas</option>
                    <option value={12}>12 semanas</option>
                  </select>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-black/40 text-xs">
                  <span className="text-slate-300">Acréscimo por semana no aluguel:</span>
                  <span className="font-mono font-black text-blue-400 text-sm">
                    +{formatCurrency(valorParcelaSemanal)} / semana
                  </span>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs text-slate-300 font-bold mb-1">Observações Adicionais</label>
            <input
              type="text"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Ex: Motorista admitiu infração e concordou com o abatimento"
              className="w-full p-2.5 rounded-xl border border-white/10 bg-[#16171f] text-white text-xs outline-none focus:border-rose-500"
            />
          </div>
          </div>

          {/* Fixed Footer Actions */}
          <div className="p-4 sm:p-5 border-t border-white/10 bg-[#16171f] flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 transition shadow-lg shadow-rose-600/30 flex items-center gap-2 cursor-pointer"
            >
              <ShieldAlert size={15} />
              Registrar Débito
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
