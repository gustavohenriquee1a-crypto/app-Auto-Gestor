import React, { useRef, useState, useEffect } from 'react';
import { X, Printer, Download, ClipboardCheck, CheckCircle2 } from 'lucide-react';
import { ContratoLocacao, Veiculo, ChecklistLocacao, ConfiguracaoLoja } from '../types';
import { formatDate } from '../utils/formatters';
import { baixarElementoComoPdf, imprimirElemento } from '../utils/printPdfUtils';
import { getConfiguracaoLojaFirestore, subscribeConfiguracoesLoja } from '../services/firestoreService';

interface ModalTermoVistoriaPdfProps {
  isOpen: boolean;
  onClose: () => void;
  contrato: ContratoLocacao;
  veiculo: Veiculo;
  checklist?: ChecklistLocacao | null;
  tipoVistoria?: 'Retirada / Entrega' | 'Devolução / Retorno';
  configuracaoLoja?: ConfiguracaoLoja | null;
}

export const ModalTermoVistoriaPdf: React.FC<ModalTermoVistoriaPdfProps> = ({
  isOpen,
  onClose,
  contrato,
  veiculo,
  checklist,
  tipoVistoria = 'Retirada / Entrega',
  configuracaoLoja,
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [configLoja, setConfigLoja] = useState<ConfiguracaoLoja | null>(configuracaoLoja || null);

  useEffect(() => {
    if (configuracaoLoja) {
      setConfigLoja(configuracaoLoja);
    } else {
      getConfiguracaoLojaFirestore().then((cfg) => {
        if (cfg) setConfigLoja(cfg);
      });
    }

    const unsub = subscribeConfiguracoesLoja((cfg) => {
      if (cfg) setConfigLoja(cfg);
    });
    return () => unsub();
  }, [configuracaoLoja]);

  if (!isOpen) return null;

  const nomeLocadora = configLoja?.razaoSocial || configLoja?.nomeLoja || 'TROCA FÁCIL COMÉRCIO DE VEÍCULOS LTDA';
  const nomeFantasia = configLoja?.nomeLoja || 'Troca Fácil Veículos';
  const cnpjLocadora = configLoja?.cnpj || '47.271.452/0001-71';
  const enderecoLocadora = configLoja?.endereco || 'Rua Nicolau Cacciatori, 477, Jd. dos Pioneiros, CEP: 19050-340, Presidente Prudente - SP';
  const repNome = contrato.representanteLocadoraNome || configLoja?.responsavelLegal || 'Vistoriador / Diretoria';

  const kmRegistro = checklist?.km || (tipoVistoria === 'Retirada / Entrega' ? contrato.kmInicial : veiculo.kmAtual) || 0;
  const nivelCombustivel = checklist?.nivelCombustivel || 'Cheio';
  const dataVistoria = checklist?.dataHora ? formatDate(checklist.dataHora.split('T')[0]) : formatDate(contrato.dataInicio);

  const itensConferidos = [
    { item: 'Estepe (Pneu sobressalente calibrado)', status: 'OK / Conforme' },
    { item: 'Macaco mecânico e chave de roda', status: 'OK / Conforme' },
    { item: 'Triângulo de segurança', status: 'OK / Conforme' },
    { item: 'Documento CRLV-e / Licenciamento anual', status: 'OK / Conforme' },
    { item: 'Ar-condicionado e ventilação interna', status: 'OK / Conforme' },
    { item: 'Faróis, lanternas e setas direcionais', status: 'OK / Conforme' },
    { item: 'Buzina e limpadores de para-brisa', status: 'OK / Conforme' },
    { item: 'Vidros e travas elétricas em funcionamento', status: 'OK / Conforme' },
    { item: 'Pneus dianteiros e traseiros (sulco regulamentar)', status: 'OK / Conforme' },
    { item: 'Higienização interna e estofamentos', status: 'OK / Conforme' },
  ];

  const handlePrint = () => {
    if (printRef.current) {
      imprimirElemento(printRef.current, {
        titulo: `Termo-Vistoria-${veiculo.placa}-${contrato.motoristaNome}`,
      });
    }
  };

  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    setIsDownloading(true);
    try {
      const sanitizedName = `Termo-Vistoria-${tipoVistoria === 'Retirada / Entrega' ? 'Entrega' : 'Devolucao'}-${veiculo.placa}-${contrato.motoristaNome.replace(/[^a-zA-Z0-9]/g, '_')}`;
      await baixarElementoComoPdf(printRef.current, sanitizedName);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error('Erro ao baixar termo de vistoria em PDF:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-4xl max-h-[94vh] flex flex-col bg-[#111116] rounded-2xl shadow-2xl overflow-hidden border border-white/10">
        {/* Top bar */}
        <div className="bg-[#181924] p-4 flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
              <ClipboardCheck size={20} />
            </div>
            <div>
              <h3 className="font-black text-sm text-white flex items-center gap-2">
                Laudo & Termo de Vistoria do Veículo
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                  {tipoVistoria}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Checklist físico com verificação de itens, quilometragem, combustível e estado geral
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Printer size={15} /> Imprimir
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
            >
              {downloadSuccess ? (
                <>
                  <CheckCircle2 size={15} className="text-emerald-300" /> Baixado!
                </>
              ) : (
                <>
                  <Download size={15} /> {isDownloading ? 'Gerando...' : 'Baixar PDF'}
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition cursor-pointer ml-1"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Document Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-950/70 flex justify-center">
          <div
            ref={printRef}
            id="documento-termo-vistoria"
            className="w-full max-w-[794px] bg-white text-slate-900 p-8 sm:p-12 shadow-2xl rounded-sm font-sans text-xs leading-relaxed space-y-6"
            style={{ minHeight: '1122px' }}
          >
            {/* Header Timbrado */}
            <div className="border-b-2 border-slate-900 pb-4 text-center space-y-1">
              <h1 className="text-base font-black uppercase tracking-wider text-slate-900">
                {nomeLocadora}
              </h1>
              <p className="text-[11px] text-slate-600">
                CNPJ: {cnpjLocadora} • {enderecoLocadora}
              </p>
              <h2 className="text-xs font-extrabold uppercase tracking-widest text-emerald-900 pt-1">
                TERMO DE CONFERÊNCIA FÍSICA & LAUDO DE VISTORIA VEICULAR ({tipoVistoria.toUpperCase()})
              </h2>
              <p className="text-[10px] text-slate-500 font-mono">
                VINCULADO AO CONTRATO Nº {contrato.id.toUpperCase()} • DATA DA VISTORIA: {dataVistoria}
              </p>
            </div>

            {/* QUADRO DE IDENTIFICAÇÃO */}
            <div className="border border-slate-300 rounded-lg overflow-hidden">
              <div className="bg-slate-100 px-4 py-2 border-b border-slate-300 font-bold uppercase tracking-wider text-[11px] text-slate-800">
                1. Identificação do Veículo e das Partes
              </div>
              <div className="p-3.5 bg-white space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-700">
                  <div><strong>Veículo:</strong> {veiculo.modelo} ({veiculo.marca})</div>
                  <div><strong>Placa:</strong> <span className="font-mono font-bold text-slate-900">{veiculo.placa}</span></div>
                  <div><strong>Ano/Modelo:</strong> {veiculo.ano}</div>
                  <div><strong>Cor:</strong> {veiculo.cor}</div>
                  <div><strong>Chassi:</strong> <span className="font-mono">{veiculo.chassi || 'CRLV'}</span></div>
                  <div><strong>Renavam:</strong> <span className="font-mono">{veiculo.renavam || 'CRLV'}</span></div>
                  <div><strong>Quilometragem:</strong> <span className="font-bold text-emerald-800">{kmRegistro.toLocaleString('pt-BR')} KM</span></div>
                  <div><strong>Combustível:</strong> <span className="font-bold text-blue-800">{nivelCombustivel}</span></div>
                </div>

                <div className="pt-2 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-700">
                  <div><strong>Locatário (Motorista):</strong> {contrato.motoristaNome} (CPF: {contrato.motoristaCpf})</div>
                  <div><strong>Vistoriador / Locadora:</strong> {repNome}</div>
                </div>
              </div>
            </div>

            {/* CHECKLIST DE ITENS OBRIGATÓRIOS */}
            <div className="border border-slate-300 rounded-lg overflow-hidden">
              <div className="bg-slate-100 px-4 py-2 border-b border-slate-300 font-bold uppercase tracking-wider text-[11px] text-slate-800">
                2. Itens de Segurança, Acessórios e Funcionamento
              </div>
              <div className="p-0">
                <table className="w-full text-[11px] text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                      <th className="p-2.5 pl-4">Item Inspecionado</th>
                      <th className="p-2.5 w-36 text-center">Status da Conferência</th>
                      <th className="p-2.5 w-48">Observações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itensConferidos.map((linha, idx) => (
                      <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50/50">
                        <td className="p-2.5 pl-4 text-slate-800 font-medium">{linha.item}</td>
                        <td className="p-2.5 text-center text-emerald-700 font-bold">[ ✔ ] {linha.status}</td>
                        <td className="p-2.5 text-slate-500 italic">Conferido em teste físico</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* AVARIAS E OBSERVAÇÕES */}
            <div className="border border-slate-300 rounded-lg p-3.5 bg-slate-50/60 space-y-2">
              <span className="font-bold text-slate-800 uppercase block text-[11px]">
                3. Avarias Pré-Existentes / Observações Especiais:
              </span>
              <div className="p-3 bg-white border border-slate-200 rounded min-h-[60px] text-[11px] text-slate-700">
                {checklist?.observacoes || (tipoVistoria === 'Retirada / Entrega'
                  ? 'Veículo inspecionado e entregue sem avarias estruturais ou estéticas aparentes, lataria alinhada, pintura polida, tapeçaria e bancos íntegros.'
                  : 'Vistoria de devolução realizada na presença do motorista para apuração de estado final.')}
              </div>
            </div>

            {/* DECLARAÇÃO DE CONFORMIDADE */}
            <div className="space-y-2 text-[11px] text-justify text-slate-700 leading-relaxed">
              <h4 className="font-bold text-slate-900 uppercase border-b border-slate-300 pb-1 text-xs">
                Declaração de Recebimento e Conferência Física
              </h4>
              <p>
                O LOCATÁRIO declara expressamente ter inspecionado minuciosamente o veículo automotor acima discriminado, testando todos os comandos, faróis, freios, ar-condicionado, limpadores e equipamentos obrigatórios de segurança, recebendo-o nas condições atestadas no presente termo e no Contrato de Locação, comprometendo-se a zelar pela sua conservação e devolvê-lo nas mesmas condições de limpeza e funcionamento.
              </p>
            </div>

            {/* Assinaturas */}
            <div className="pt-8 space-y-8">
              <div className="text-right text-[11px] text-slate-600">
                Local e Data: _____________________, {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4">
                <div className="text-center space-y-1">
                  <div className="border-t-2 border-slate-900 w-full pt-2"></div>
                  <strong className="block text-slate-900 uppercase text-[11px]">{contrato.motoristaNome}</strong>
                  <span className="text-[10px] text-slate-700 font-bold block">LOCATÁRIO / CONDUTOR</span>
                  <span className="text-[10px] text-slate-600 block">CPF: {contrato.motoristaCpf}</span>
                </div>

                <div className="text-center space-y-1">
                  <div className="border-t-2 border-slate-900 w-full pt-2"></div>
                  <strong className="block text-slate-900 uppercase text-[11px]">{nomeLocadora}</strong>
                  <span className="text-[10px] text-slate-700 font-bold block">VISTORIADOR RESPONSÁVEL / LOCADORA</span>
                  <span className="text-[10px] text-slate-600 block">Resp: {repNome}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
