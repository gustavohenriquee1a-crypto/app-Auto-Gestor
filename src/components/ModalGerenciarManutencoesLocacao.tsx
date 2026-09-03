import React, { useState } from 'react';
import { X, Wrench, Plus, Trash2, CheckCircle2, AlertTriangle, Settings2, Gauge, DollarSign } from 'lucide-react';
import { Veiculo, ContratoLocacao, ItemManutencaoPreventiva, DespesaVeiculo } from '../types';
import { formatKm, formatCurrency, calcularStatusManutencao, getItensManutencaoPadrao } from '../utils/formatters';

interface ModalGerenciarManutencoesLocacaoProps {
  isOpen: boolean;
  onClose: () => void;
  veiculo: Veiculo;
  contrato: ContratoLocacao;
  onSalvarItensManutencao: (veiculoId: string, contratoId: string, itens: ItemManutencaoPreventiva[]) => void;
  onRegistrarManutencaoRealizada: (
    veiculoId: string,
    contratoId: string,
    itemAtualizado: ItemManutencaoPreventiva,
    despesa: DespesaVeiculo
  ) => void;
}

export const ModalGerenciarManutencoesLocacao: React.FC<ModalGerenciarManutencoesLocacaoProps> = ({
  isOpen,
  onClose,
  veiculo,
  contrato,
  onSalvarItensManutencao,
  onRegistrarManutencaoRealizada,
}) => {
  const kmAtual = contrato.kmAtual || veiculo.kmAtual || 0;

  // Itens em edição
  const [itens, setItens] = useState<ItemManutencaoPreventiva[]>(() => {
    if (contrato.itensManutencao && contrato.itensManutencao.length > 0) {
      return contrato.itensManutencao;
    }
    return getItensManutencaoPadrao(kmAtual);
  });

  const [modo, setModo] = useState<'lista' | 'configurar' | 'realizar'>('lista');
  const [itemParaRealizar, setItemParaRealizar] = useState<ItemManutencaoPreventiva | null>(null);

  // Form de Realização de Manutenção
  const [kmRealizacao, setKmRealizacao] = useState<number>(kmAtual);
  const [valorGasto, setValorGasto] = useState<number>(300);
  const [oficinaFornecedor, setOficinaFornecedor] = useState('Oficina Parceira');
  const [nfNumero, setNfNumero] = useState('');
  const [dataTroca, setDataTroca] = useState(new Date().toISOString().split('T')[0]);

  // Form de Novo Item Customizado
  const [novoNome, setNovoNome] = useState('');
  const [novoIntervalo, setNovoIntervalo] = useState<number>(10000);
  const [novoKmUltimaTroca, setNovoKmUltimaTroca] = useState<number>(kmAtual);

  if (!isOpen) return null;

  const handleSalvarConfiguracaoGeral = () => {
    onSalvarItensManutencao(veiculo.id, contrato.id, itens);
    setModo('lista');
  };

  const handleAdicionarItemCustomizado = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNome.trim()) return;

    const novoItem: ItemManutencaoPreventiva = {
      id: `item-${Date.now()}`,
      nome: novoNome.trim(),
      intervaloKm: Number(novoIntervalo),
      kmUltimaTroca: Number(novoKmUltimaTroca),
      kmProximaTroca: Number(novoKmUltimaTroca) + Number(novoIntervalo),
      custoEstimado: 0,
    };

    const novaLista = [...itens, novoItem];
    setItens(novaLista);
    onSalvarItensManutencao(veiculo.id, contrato.id, novaLista);
    setNovoNome('');
    setNovoIntervalo(10000);
  };

  const handleRemoverItem = (id: string) => {
    const filtrado = itens.filter((i) => i.id !== id);
    setItens(filtrado);
    onSalvarItensManutencao(veiculo.id, contrato.id, filtrado);
  };

  const handleAtualizarIntervalo = (id: string, novoIntervaloVal: number) => {
    const atualizados = itens.map((i) => {
      if (i.id === id) {
        return {
          ...i,
          intervaloKm: novoIntervaloVal,
          kmProximaTroca: (i.kmUltimaTroca || 0) + novoIntervaloVal,
        };
      }
      return i;
    });
    setItens(atualizados);
  };

  const handleConfirmarManutencaoRealizada = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemParaRealizar) return;

    const itemAtualizado: ItemManutencaoPreventiva = {
      ...itemParaRealizar,
      kmUltimaTroca: Number(kmRealizacao),
      kmProximaTroca: Number(kmRealizacao) + Number(itemParaRealizar.intervaloKm),
      dataUltimaTroca: dataTroca,
    };

    // Criar a despesa do veículo automaticamente
    const novaDespesa: DespesaVeiculo = {
      id: `desp-manut-${Date.now()}`,
      veiculoId: veiculo.id,
      chassi: veiculo.chassi,
      placa: veiculo.placa,
      categoria: 'Mecânica / Mão de Obra',
      descricao: `Manutenção Preventiva: ${itemParaRealizar.nome} aos ${formatKm(kmRealizacao)}`,
      valor: Number(valorGasto),
      data: dataTroca,
      fornecedor: oficinaFornecedor || 'Mecânica Especializada',
      nfNumero: nfNumero.trim() || undefined,
      statusPagamento: 'Pago',
    };

    onRegistrarManutencaoRealizada(veiculo.id, contrato.id, itemAtualizado, novaDespesa);

    // Atualiza estado local
    const novaLista = itens.map((i) => (i.id === itemParaRealizar.id ? itemAtualizado : i));
    setItens(novaLista);
    setItemParaRealizar(null);
    setModo('lista');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-gray-900 rounded-2xl shadow-xl border border-white/10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-[#16171f] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Wrench size={22} />
            </div>
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                Manutenções Preventivas & Alertas de KM
              </h2>
              <p className="text-xs text-slate-400">
                {veiculo.modelo} • <span className="font-mono text-blue-400 font-bold">{veiculo.placa}</span> • Odômetro Atual:{' '}
                <span className="text-emerald-400 font-mono font-bold">{formatKm(kmAtual)}</span>
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

        {/* Sub-Header Tabs */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-white/10 bg-[#13141b] text-xs shrink-0">
          <button
            type="button"
            onClick={() => setModo('lista')}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
              modo === 'lista' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Painel de Alertas Preditivos
          </button>
          <button
            type="button"
            onClick={() => setModo('configurar')}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
              modo === 'configurar' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Settings2 size={13} />
            Personalizar Intervalos de KM
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4">
          {/* MODO 1: LISTA E ALERTAS */}
          {modo === 'lista' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 block">Monitoramento em Tempo Real</span>
                  <p className="text-slate-200 font-bold">
                    O sistema avisa automaticamente quando qualquer item estiver a menos de 1.200 km ou vencido.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Odômetro Base</span>
                  <span className="font-mono text-emerald-400 font-black text-sm">{formatKm(kmAtual)}</span>
                </div>
              </div>

              <div className="space-y-3">
                {itens.map((item) => {
                  const status = calcularStatusManutencao(item, kmAtual);
                  return (
                    <div
                      key={item.id}
                      className="p-4 rounded-2xl bg-[#16171f] border border-white/5 hover:border-white/10 transition space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <h4 className="text-sm font-bold text-white flex items-center gap-2">
                            {item.nome}
                          </h4>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Intervalo: <span className="text-slate-200 font-mono font-bold">a cada {formatKm(item.intervaloKm)}</span> •
                            Última troca: <span className="text-slate-200 font-mono font-semibold">{formatKm(item.kmUltimaTroca)}</span> •
                            Próxima troca: <span className="text-blue-400 font-mono font-bold">{formatKm(item.kmProximaTroca)}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${status.badgeClass}`}>
                            {status.statusText}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setItemParaRealizar(item);
                              setKmRealizacao(kmAtual);
                              setModo('realizar');
                            }}
                            className="px-3 py-1.5 rounded-xl bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white border border-blue-500/30 text-xs font-bold transition cursor-pointer"
                          >
                            Registrar Troca
                          </button>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div>
                        <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                          <span>Vida útil do ciclo</span>
                          <span className="font-mono font-bold text-slate-200">{status.porcentagem}%</span>
                        </div>
                        <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              status.isVencido
                                ? 'bg-rose-500'
                                : status.isProximo
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${status.porcentagem}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* MODO 2: CONFIGURAR / PERSONALIZAR LIMITES */}
          {modo === 'configurar' && (
            <div className="space-y-5">
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Ajustar Quilometragens e Intervalos Deste Carro
                </h3>
                <div className="space-y-2">
                  {itens.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-2xl bg-[#16171f] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex-1">
                        <input
                          type="text"
                          value={item.nome}
                          onChange={(e) => {
                            const val = e.target.value;
                            setItens(itens.map((i) => (i.id === item.id ? { ...i, nome: val } : i)));
                          }}
                          className="w-full bg-transparent text-white font-bold text-xs outline-none border-b border-transparent focus:border-amber-500"
                        />
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400">
                          <span>Última Troca (KM):</span>
                          <input
                            type="number"
                            step="500"
                            value={item.kmUltimaTroca}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setItens(
                                itens.map((i) =>
                                  i.id === item.id
                                    ? { ...i, kmUltimaTroca: val, kmProximaTroca: val + i.intervaloKm }
                                    : i
                                )
                              );
                            }}
                            className="w-24 px-2 py-0.5 rounded bg-black/40 border border-white/10 text-white font-mono font-bold"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <label className="block text-[10px] text-slate-400 uppercase font-bold">A cada (KM):</label>
                          <input
                            type="number"
                            step="1000"
                            min="1000"
                            value={item.intervaloKm}
                            onChange={(e) => handleAtualizarIntervalo(item.id, Number(e.target.value))}
                            className="w-24 px-2 py-1 rounded-xl bg-black/40 border border-amber-500/30 text-amber-300 font-mono font-bold text-xs"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoverItem(item.id)}
                          className="p-2 text-slate-500 hover:text-rose-400 transition cursor-pointer"
                          title="Remover item"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Adicionar Novo Item Customizado */}
              <form onSubmit={handleAdicionarItemCustomizado} className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <Plus size={14} className="text-amber-400" /> Adicionar Outro Item de Manutenção (Personalizado)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Nome do Item / Peça</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Troca de Líquido de Arrefecimento, Amortecedores"
                      value={novoNome}
                      onChange={(e) => setNovoNome(e.target.value)}
                      className="w-full p-2 rounded-xl bg-[#16171f] border border-white/10 text-white text-xs outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Intervalo em KM</label>
                    <input
                      type="number"
                      required
                      step="1000"
                      min="1000"
                      value={novoIntervalo}
                      onChange={(e) => setNovoIntervalo(Number(e.target.value))}
                      className="w-full p-2 rounded-xl bg-[#16171f] border border-white/10 text-amber-400 font-mono font-bold text-xs outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus size={14} /> Salvar Novo Item
                </button>
              </form>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleSalvarConfiguracaoGeral}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/30"
                >
                  <CheckCircle2 size={16} /> Salvar Configurações
                </button>
              </div>
            </div>
          )}

          {/* MODO 3: REGISTRAR TROCA / REALIZADA */}
          {modo === 'realizar' && itemParaRealizar && (
            <form onSubmit={handleConfirmarManutencaoRealizada} className="space-y-4">
              <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 space-y-1">
                <span className="text-[10px] uppercase font-bold text-blue-400">Lançamento de Manutenção</span>
                <h3 className="text-base font-bold text-white">{itemParaRealizar.nome}</h3>
                <p className="text-xs text-slate-300">
                  Intervalo configurado: <span className="font-mono font-bold">a cada {formatKm(itemParaRealizar.intervaloKm)}</span>
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-300 font-bold mb-1">KM em que foi feita a troca *</label>
                  <div className="relative">
                    <Gauge size={14} className="absolute left-3 top-3 text-blue-400" />
                    <input
                      type="number"
                      required
                      value={kmRealizacao}
                      onChange={(e) => setKmRealizacao(Number(e.target.value))}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-white/10 bg-[#16171f] text-white text-xs font-mono font-bold outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-300 font-bold mb-1">Data da Manutenção *</label>
                  <input
                    type="date"
                    required
                    value={dataTroca}
                    onChange={(e) => setDataTroca(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-white/10 bg-[#16171f] text-white text-xs outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-300 font-bold mb-1">Custo / Valor Pago (R$) *</label>
                  <div className="relative">
                    <DollarSign size={14} className="absolute left-3 top-3 text-emerald-400" />
                    <input
                      type="number"
                      required
                      min="0"
                      step="10"
                      value={valorGasto}
                      onChange={(e) => setValorGasto(Number(e.target.value))}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-white/10 bg-[#16171f] text-emerald-400 text-sm font-mono font-black outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-300 font-bold mb-1">Oficina / Fornecedor *</label>
                  <input
                    type="text"
                    required
                    value={oficinaFornecedor}
                    onChange={(e) => setOficinaFornecedor(e.target.value)}
                    placeholder="Ex: Centro Automotivo Paulista"
                    className="w-full p-2.5 rounded-xl border border-white/10 bg-[#16171f] text-white text-xs outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-300 font-bold mb-1">Número da NF / Ordem de Serviço (Opcional)</label>
                <input
                  type="text"
                  value={nfNumero}
                  onChange={(e) => setNfNumero(e.target.value)}
                  placeholder="Ex: NF-e 84920"
                  className="w-full p-2.5 rounded-xl border border-white/10 bg-[#16171f] text-white text-xs outline-none focus:border-blue-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-white/5 text-[11px] text-slate-400 flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                <span>
                  Ao confirmar, o sistema registrará a despesa no histórico financeiro do veículo e recalculará a próxima troca para{' '}
                  <strong className="text-blue-400">{formatKm(Number(kmRealizacao) + Number(itemParaRealizar.intervaloKm))}</strong>.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModo('lista')}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition shadow-lg shadow-emerald-600/30 flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 size={16} /> Confirmar & Gerar Despesa
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
