import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Compass, 
  Printer, 
  CheckCircle2, 
  FileText, 
  Car, 
  User, 
  Phone, 
  CreditCard, 
  Calendar, 
  Gauge, 
  AlertTriangle,
  ArrowRight,
  RotateCcw,
  Download,
  Loader2
} from 'lucide-react';
import { Veiculo, RegistroTestDrive, Usuario, ConfiguracaoLoja } from '../types';
import { formatKm, formatDate } from '../utils/formatters';
import { imprimirElemento, baixarElementoComoPdf } from '../utils/printPdfUtils';
import { subscribeConfiguracoesLoja, getConfiguracaoLojaFirestore } from '../services/firestoreService';

interface ModalTestDriveProps {
  isOpen: boolean;
  onClose: () => void;
  veiculo: Veiculo | null;
  currentUser?: Usuario | null;
  onSalvarTestDrive: (veiculoId: string, testDrive: RegistroTestDrive) => void;
}

export const ModalTestDrive: React.FC<ModalTestDriveProps> = ({
  isOpen,
  onClose,
  veiculo,
  currentUser,
  onSalvarTestDrive,
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<'form' | 'termo'>('form');

  // Form States
  const [clienteNome, setClienteNome] = useState('');
  const [clienteCnh, setClienteCnh] = useState('');
  const [cnhCategoria, setCnhCategoria] = useState('B');
  const [clienteCpf, setClienteCpf] = useState('');
  const [clienteTelefone, setClienteTelefone] = useState('');
  const [dataHora, setDataHora] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [kmInicial, setKmInicial] = useState<number>(veiculo?.kmAtual || 0);
  const [vendedorNome, setVendedorNome] = useState(currentUser?.displayName || '');
  const [observacoes, setObservacoes] = useState('');
  const [termoAssinado, setTermoAssinado] = useState(true);

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [configLoja, setConfigLoja] = useState<ConfiguracaoLoja | null>(null);

  useEffect(() => {
    getConfiguracaoLojaFirestore().then((cfg) => {
      if (cfg) setConfigLoja(cfg);
    });
    const unsub = subscribeConfiguracoesLoja((cfg) => {
      if (cfg) setConfigLoja(cfg);
    });
    return () => unsub();
  }, []);

  if (!isOpen || !veiculo) return null;

  const handleGerarTermo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteNome.trim() || !clienteCnh.trim() || !clienteTelefone.trim()) {
      alert('Por favor, preencha o Nome do Cliente, CNH e Telefone.');
      return;
    }
    setStep('termo');
  };

  const handleFinalizarEGravar = () => {
    const novoRegistro: RegistroTestDrive = {
      id: `td_${Date.now()}`,
      veiculoId: veiculo.id,
      placa: veiculo.placa,
      modelo: veiculo.modelo,
      clienteNome,
      clienteCnh,
      cnhCategoria,
      clienteCpf,
      clienteTelefone,
      dataHora,
      kmInicial: Number(kmInicial) || veiculo.kmAtual,
      observacoes,
      vendedorId: currentUser?.uid,
      vendedorNome: vendedorNome || currentUser?.displayName,
      status: 'Em Andamento',
      termoAssinado,
      createdAt: new Date().toISOString(),
    };

    onSalvarTestDrive(veiculo.id, novoRegistro);
    onClose();
  };

  const handlePrintTermo = async () => {
    setIsPrinting(true);
    try {
      const target = printAreaRef.current || 'printable-test-drive';
      await imprimirElemento(target, {
        titulo: `Termo-TestDrive-${veiculo.placa}-${clienteNome.replace(/\s+/g, '_')}`
      });
    } catch (e) {
      console.error('Erro ao imprimir termo:', e);
    } finally {
      setIsPrinting(false);
    }
  };

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const nomeArquivo = `Termo-TestDrive-${veiculo.placa}-${clienteNome.replace(/[^a-zA-Z0-9]/g, '_') || 'cliente'}.pdf`;
      const target = printAreaRef.current || 'printable-test-drive';
      await baixarElementoComoPdf(target, nomeArquivo);
    } catch (e) {
      console.error('Erro ao gerar PDF do termo:', e);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-gray-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 bg-[#16171f] flex items-center justify-between shrink-0 no-print">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <Compass size={22} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Controle de Test Drive & Termo de Responsabilidade
              </h2>
              <p className="text-xs text-slate-400">
                {veiculo.modelo} ({veiculo.ano}) • Placa <span className="font-mono text-blue-300 font-bold">{veiculo.placa}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        {step === 'form' ? (
          <form onSubmit={handleGerarTermo} className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs">
              {/* Vehicle Highlight Card */}
              <div className="p-3 rounded-xl bg-blue-950/20 border border-blue-500/30 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Car size={18} className="text-blue-400" />
                  <div>
                    <span className="font-bold text-white text-sm block">{veiculo.modelo}</span>
                    <span className="text-slate-400 text-[11px]">
                      Placa: <strong className="font-mono text-slate-200">{veiculo.placa}</strong> • Cor: {veiculo.cor} • Câmbio: {veiculo.cambio || 'Manual'}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">KM de Saída</span>
                  <span className="text-blue-400 font-mono font-bold text-sm">{formatKm(kmInicial)}</span>
                </div>
              </div>

              {/* Client Details Form */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-1.5">
                  <User size={14} className="text-blue-400" /> 1. Dados do Condutor / Cliente
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-slate-300 font-bold mb-1">Nome Completo do Cliente *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Carlos Eduardo de Oliveira"
                      value={clienteNome}
                      onChange={(e) => setClienteNome(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-white/10 bg-black/40 text-slate-100 text-xs outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">CNH (Número do Registro) *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: 05489218492"
                      value={clienteCnh}
                      onChange={(e) => setClienteCnh(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-white/10 bg-black/40 text-slate-100 text-xs font-mono outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Categoria CNH *</label>
                    <select
                      value={cnhCategoria}
                      onChange={(e) => setCnhCategoria(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-white/10 bg-black/40 text-slate-100 text-xs outline-none focus:border-blue-500 font-bold"
                    >
                      <option value="B">B - Carros de Passeio</option>
                      <option value="AB">AB - Moto e Carro</option>
                      <option value="C">C - Caminhões e Vans</option>
                      <option value="D">D - Vans e Ônibus</option>
                      <option value="E">E - Carretas / Articulados</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Telefone / WhatsApp *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: (11) 98765-4321"
                      value={clienteTelefone}
                      onChange={(e) => setClienteTelefone(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-white/10 bg-black/40 text-slate-100 text-xs outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">CPF (Opcional)</label>
                    <input
                      type="text"
                      placeholder="Ex: 123.456.789-00"
                      value={clienteCpf}
                      onChange={(e) => setClienteCpf(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-white/10 bg-black/40 text-slate-100 text-xs font-mono outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Test Drive Details */}
              <div className="space-y-3 pt-2 border-t border-white/5">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-1.5">
                  <Compass size={14} className="text-blue-400" /> 2. Parâmetros da Saída
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Data e Hora de Saída *</label>
                    <input
                      type="datetime-local"
                      required
                      value={dataHora}
                      onChange={(e) => setDataHora(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-white/10 bg-black/40 text-slate-100 text-xs outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Odômetro Inicial (KM) *</label>
                    <input
                      type="number"
                      required
                      value={kmInicial}
                      onChange={(e) => setKmInicial(Number(e.target.value))}
                      className="w-full p-2.5 rounded-xl border border-white/10 bg-black/40 text-slate-100 text-xs font-mono outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Consultor / Acompanhante</label>
                    <input
                      type="text"
                      value={vendedorNome}
                      onChange={(e) => setVendedorNome(e.target.value)}
                      placeholder="Nome do consultor"
                      className="w-full p-2.5 rounded-xl border border-white/10 bg-black/40 text-slate-100 text-xs outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Rota Prevista / Observações</label>
                  <textarea
                    rows={2}
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Ex: Trajeto Av. Principal + teste em rodovia acompanhado pelo consultor..."
                    className="w-full p-2.5 rounded-xl border border-white/10 bg-black/40 text-slate-200 text-xs outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Fixed Footer */}
            <div className="p-4 sm:p-5 border-t border-white/10 bg-[#16171f] flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-950/50 flex items-center gap-2 transition cursor-pointer"
              >
                <span>Registrar Test Drive e Gerar Termo</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </form>
        ) : (
          /* Step 2: Provisional Liability Term Preview */
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#0a0a0d] flex justify-center">
              <div 
                id="printable-test-drive"
                ref={printAreaRef}
                className="w-full max-w-[650px] bg-white text-slate-900 rounded-xl shadow-2xl p-6 sm:p-8 text-[12px] leading-relaxed border border-slate-200 font-sans"
              >
                {/* Term Header */}
                <div className="border-b-2 border-slate-900 pb-3 mb-4 flex items-center justify-between">
                  <div>
                    <h1 className="text-base font-black uppercase text-slate-950">
                      TERMO DE RESPONSABILIDADE PARA TEST DRIVE
                    </h1>
                    <p className="text-[10px] text-slate-500 font-medium">
                      {(configLoja?.razaoSocial || configLoja?.nomeLoja || 'TROCA FÁCIL VEÍCULOS').toUpperCase()} • CNPJ: {configLoja?.cnpj || '47.271.452/0001-71'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono font-bold bg-slate-100 px-2 py-0.5 border rounded">
                      REGISTRO DE SAÍDA
                    </span>
                    <p className="text-[10px] text-slate-500 mt-0.5">{new Date(dataHora).toLocaleString('pt-BR')}</p>
                  </div>
                </div>

                {/* Identification Summary */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5 my-3 text-[11px]">
                  <p><strong>Condutor(a):</strong> {clienteNome}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <p><strong>CNH nº:</strong> {clienteCnh} (Cat. {cnhCategoria})</p>
                    <p><strong>Telefone / WhatsApp:</strong> {clienteTelefone}</p>
                    {clienteCpf && <p><strong>CPF:</strong> {clienteCpf}</p>}
                    <p><strong>Acompanhante da Loja:</strong> {vendedorNome || 'Consultor'}</p>
                  </div>
                  <div className="pt-1.5 border-t border-slate-200 grid grid-cols-2 gap-2 font-bold text-slate-950">
                    <p>Veículo: {veiculo.modelo} ({veiculo.ano})</p>
                    <p>Placa: {veiculo.placa} • KM Inicial: {formatKm(kmInicial)}</p>
                  </div>
                </div>

                {/* Terms and Clauses */}
                <div className="space-y-2 text-slate-700 text-justify text-[11px] my-3">
                  <p>
                    <strong>1. Habilitação Legal:</strong> O(A) condutor(a) declara estar devidamente habilitado(a) e com sua Carteira Nacional de Habilitação (CNH) válida e sem impedimentos legais perante o DETRAN/CONTRAN.
                  </p>
                  <p>
                    <strong>2. Infrações de Trânsito:</strong> O(A) condutor(a) assume total e irrestrita responsabilidade civil, administrativa e financeira por quaisquer multas, autuações e pontuações geradas no período do test drive, autorizando a transferência imediata de pontuação.
                  </p>
                  <p>
                    <strong>3. Cuidados e Danos:</strong> O(A) condutor(a) compromete-se a conduzir o veículo respeitando rigorosamente os limites de velocidade e regras do Código de Trânsito Brasileiro (CTB), respondendo integralmente por avarias, batidas ou franquia de seguro decorrentes de imperícia ou imprudência.
                  </p>
                  <p>
                    <strong>4. Proibição de Cessão:</strong> É terminantemente proibido repassar a direção do veículo a terceiros durante o trajeto.
                  </p>
                </div>

                {/* Signatures */}
                <div className="mt-8 pt-4 border-t border-slate-300 grid grid-cols-2 gap-8 text-center text-[10px]">
                  <div>
                    <div className="border-b border-slate-900 pb-1 mb-1 h-10 flex items-end justify-center">
                      <span className="font-serif italic text-slate-400">Assinatura do Condutor</span>
                    </div>
                    <p className="font-bold text-slate-900">{clienteNome}</p>
                    <p className="text-slate-500">CNH: {clienteCnh}</p>
                  </div>

                  <div>
                    <div className="border-b border-slate-900 pb-1 mb-1 h-10 flex items-end justify-center">
                      <span className="font-serif italic text-slate-400">Visto do Consultor</span>
                    </div>
                    <p className="font-bold text-slate-900">{vendedorNome || 'Troca Fácil'}</p>
                    <p className="text-slate-500">Consultor Responsável</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2 Actions Footer */}
            <div className="p-4 sm:p-5 border-t border-white/10 bg-[#16171f] flex items-center justify-between shrink-0 no-print">
              <button
                type="button"
                onClick={() => setStep('form')}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <RotateCcw size={14} />
                <span>Voltar ao Formulário</span>
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  disabled={isGeneratingPdf}
                  onClick={handleDownloadPdf}
                  className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                >
                  {isGeneratingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  <span>{isGeneratingPdf ? 'Gerando...' : 'Baixar PDF'}</span>
                </button>

                <button
                  type="button"
                  disabled={isPrinting}
                  onClick={handlePrintTermo}
                  className="px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                >
                  {isPrinting ? <Loader2 size={15} className="animate-spin" /> : <Printer size={15} />}
                  <span>{isPrinting ? 'Preparando...' : 'Imprimir Termo'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleFinalizarEGravar}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-950/50 transition cursor-pointer"
                >
                  <CheckCircle2 size={16} />
                  <span>Salvar & Iniciar Test Drive</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
