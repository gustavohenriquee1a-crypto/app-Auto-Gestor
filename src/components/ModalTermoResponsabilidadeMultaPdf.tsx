import React, { useRef, useState, useEffect } from 'react';
import { X, Printer, Download, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { ContratoLocacao, Veiculo, DebitoMotorista, ConfiguracaoLoja } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { baixarElementoComoPdf, imprimirElemento } from '../utils/printPdfUtils';
import { getConfiguracaoLojaFirestore, subscribeConfiguracoesLoja } from '../services/firestoreService';

interface ModalTermoResponsabilidadeMultaPdfProps {
  isOpen: boolean;
  onClose: () => void;
  contrato: ContratoLocacao;
  veiculo: Veiculo;
  debito?: DebitoMotorista | null;
  configuracaoLoja?: ConfiguracaoLoja | null;
}

export const ModalTermoResponsabilidadeMultaPdf: React.FC<ModalTermoResponsabilidadeMultaPdfProps> = ({
  isOpen,
  onClose,
  contrato,
  veiculo,
  debito,
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
  const repNome = contrato.representanteLocadoraNome || configLoja?.responsavelLegal || 'Diretoria Executiva';
  const repCpf = contrato.representanteLocadoraCpf || configLoja?.cpfResponsavel || '000.000.000-00';

  const endMot = contrato.motoristaEndereco;
  const enderecoMotoristaStr = endMot
    ? `${endMot.logradouro || ''}, ${endMot.numero || 's/n'}${endMot.complemento ? ` - ${endMot.complemento}` : ''} - ${endMot.bairro || ''}, ${endMot.cidade || ''}/${endMot.uf || ''} - CEP: ${endMot.cep || ''}`
    : 'Conforme cadastro de locação';

  const autoInfracao = debito?.autoInfracao || 'AIT-00000000';
  const codigoInfracao = debito?.codigoInfracao || '7455-0';
  const orgaoEmissor = debito?.orgaoEmissor || 'DETRAN / ÓRGÃO AUTUADOR';
  const dataHoraInfracao = debito?.dataHoraInfracao || (debito?.dataOcorrencia ? `${formatDate(debito.dataOcorrencia)} às 14:00` : 'Data constante na notificação');
  const localInfracao = debito?.localInfracao || 'Via pública municipal / Rodovia estadual';
  const pontosCnh = debito?.pontosCnh || 4;
  const valorTotal = debito?.valorTotal || 195.23;

  const handlePrint = () => {
    if (printRef.current) {
      imprimirElemento(printRef.current, {
        titulo: `Termo-Indicacao-Condutor-${veiculo.placa}-${autoInfracao}`,
      });
    }
  };

  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    setIsDownloading(true);
    try {
      const sanitizedName = `Termo-Indicacao-Condutor-${veiculo.placa}-${contrato.motoristaNome.replace(/[^a-zA-Z0-9]/g, '_')}`;
      await baixarElementoComoPdf(printRef.current, sanitizedName);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error('Erro ao baixar termo de indicação de condutor em PDF:', err);
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
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h3 className="font-black text-sm text-white flex items-center gap-2">
                Termo de Responsabilidade & Indicação do Condutor Infrator
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono">
                  {autoInfracao}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Documento legal para transferência de pontos na CNH e responsabilização do motorista
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
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-amber-600/20 cursor-pointer disabled:opacity-50"
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
            id="documento-termo-multa"
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
              <h2 className="text-xs font-extrabold uppercase tracking-widest text-amber-900 pt-1">
                TERMO DE RESPONSABILIDADE CIVIL, CRIMINAL E DECLARAÇÃO DE INDICAÇÃO DO REAL CONDUTOR INFRATOR
              </h2>
              <p className="text-[10px] text-slate-500">
                (Fundamentado no Art. 257, § 7º da Lei Federal nº 9.503/97 - Código de Trânsito Brasileiro)
              </p>
            </div>

            {/* QUADRO DO PROPRIETÁRIO / VEÍCULO */}
            <div className="border border-slate-300 rounded-lg overflow-hidden space-y-0">
              <div className="bg-slate-100 px-4 py-2 border-b border-slate-300 font-bold uppercase tracking-wider text-[11px] text-slate-800">
                1. Dados do Proprietário (Locadora) e do Veículo
              </div>
              <div className="p-3.5 bg-white space-y-2">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-700">
                  <div><strong>Proprietário:</strong> {nomeLocadora}</div>
                  <div><strong>CNPJ:</strong> {cnpjLocadora}</div>
                  <div><strong>Veículo:</strong> {veiculo.modelo} ({veiculo.marca})</div>
                  <div><strong>Placa:</strong> <span className="font-mono font-bold text-slate-900">{veiculo.placa}</span></div>
                  <div><strong>Ano/Modelo:</strong> {veiculo.ano}</div>
                  <div><strong>Cor:</strong> {veiculo.cor}</div>
                  <div><strong>Renavam:</strong> <span className="font-mono">{veiculo.renavam || 'Conforme CRLV'}</span></div>
                  <div><strong>Chassi:</strong> <span className="font-mono">{veiculo.chassi || 'Conforme CRLV'}</span></div>
                </div>
              </div>
            </div>

            {/* QUADRO DO CONDUTOR INFRATOR */}
            <div className="border border-slate-300 rounded-lg overflow-hidden space-y-0">
              <div className="bg-slate-100 px-4 py-2 border-b border-slate-300 font-bold uppercase tracking-wider text-[11px] text-slate-800">
                2. Dados do Real Condutor Infrator (Locatário)
              </div>
              <div className="p-3.5 bg-white space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-700">
                  <div className="sm:col-span-2"><strong>Nome Completo:</strong> {contrato.motoristaNome}</div>
                  <div><strong>CPF:</strong> {contrato.motoristaCpf}</div>
                  <div><strong>RG:</strong> {contrato.motoristaRg || 'Constante no Contrato'}</div>
                  <div><strong>Nº de Registro da CNH:</strong> {contrato.motoristaCnh || 'Pendente de preenchimento'}</div>
                  <div><strong>Categoria / UF da CNH:</strong> {contrato.motoristaCnhCategoria || 'B'} / SP</div>
                  <div className="sm:col-span-3"><strong>Endereço Completo:</strong> {enderecoMotoristaStr}</div>
                  <div><strong>Telefone de Contato:</strong> {contrato.motoristaTelefone}</div>
                  <div className="sm:col-span-2"><strong>Contrato de Locação Vinculado:</strong> Nº {contrato.id.toUpperCase()}</div>
                </div>
              </div>
            </div>

            {/* QUADRO DA INFRAÇÃO DE TRÂNSITO */}
            <div className="border border-amber-300 bg-amber-50/40 rounded-lg overflow-hidden space-y-0">
              <div className="bg-amber-100/80 px-4 py-2 border-b border-amber-300 font-bold uppercase tracking-wider text-[11px] text-amber-950">
                3. Dados da Notificação de Autuação / Infração de Trânsito
              </div>
              <div className="p-3.5 space-y-2">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-800">
                  <div><strong>Auto de Infração (AIT):</strong> <span className="font-mono font-bold text-amber-900">{autoInfracao}</span></div>
                  <div><strong>Código de Enquadramento:</strong> <span className="font-mono font-bold">{codigoInfracao}</span></div>
                  <div><strong>Órgão Autuador:</strong> {orgaoEmissor}</div>
                  <div><strong>Data e Horário:</strong> {dataHoraInfracao}</div>
                  <div className="sm:col-span-2"><strong>Local da Infração:</strong> {localInfracao}</div>
                  <div><strong>Pontos a Transferir:</strong> <span className="font-bold text-rose-700">{pontosCnh} Pontos na CNH</span></div>
                  <div><strong>Valor da Multa:</strong> <span className="font-mono font-bold text-emerald-700">{formatCurrency(valorTotal)}</span></div>
                  <div><strong>Prazo Limite para Indicação:</strong> {debito?.dataLimiteIndicacao ? formatDate(debito.dataLimiteIndicacao) : 'Conforme Notificação Oficial'}</div>
                </div>
                {debito?.descricao && (
                  <p className="text-[10px] text-slate-600 pt-1 border-t border-amber-200">
                    <strong>Motivo/Descrição:</strong> {debito.descricao}
                  </p>
                )}
              </div>
            </div>

            {/* TEXTO DECLARATÓRIO FORMAL */}
            <div className="space-y-3 text-[11px] text-justify text-slate-700 leading-relaxed pt-2">
              <h4 className="font-bold text-slate-900 uppercase border-b border-slate-300 pb-1 text-xs">
                Termo de Confissão, Declaração e Compromisso
              </h4>

              <p>
                Eu, <strong>{contrato.motoristaNome}</strong>, devidamente qualificado como CONDUTOR INFRATOR neste ato, DECLARO, para todos os efeitos legais civis, criminais e administrativos, em conformidade com o <strong>Artigo 257, § 7º e seguintes do Código de Trânsito Brasileiro (CTB)</strong>, sob as penas da lei (especialmente o Artigo 299 do Código Penal Brasileiro referente à falsidade ideológica), que <strong>ESTAVA NA CONDUÇÃO DIRETA DO VEÍCULO ACIMA DESCRITO NO MOMENTO EXATO DO COMETIMENTO DA INFRAÇÃO DE TRÂNSITO</strong> constante na Notificação de Autuação supra identificada.
              </p>

              <p>
                DECLARO que <strong>reconheço integralmente a autoria da infração</strong> e AUTORIZO e REQUEIRO ao Órgão Executivo de Trânsito competente (DETRAN / PRF / DER / Município) a imediata e devida <strong>transferência da pontuação correspondente para o meu Prontuário Geral de Habilitação (CNH)</strong>, eximindo expressamente o proprietário/locadora de qualquer responsabilidade administrativa, pontual ou penal referente ao fato.
              </p>

              <p>
                ASSUMO, ainda, a obrigação líquida e certa de efetuar o ressarcimento/pagamento do valor integral da respectiva penalidade pecuniária à LOCADORA, autorizando desde logo o débito correspondente na caução de locação, parcelamento em conjunto com as parcelas semanais de aluguel ou desconto imediato em conta corrente/garantia.
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
                  <span className="text-[10px] text-slate-700 font-bold block">ASSINATURA DO CONDUTOR INFRATOR</span>
                  <span className="text-[9px] text-slate-500 block">(Assinatura idêntica à do documento de Habilitação - CNH)</span>
                  <span className="text-[10px] text-slate-600 block">CPF: {contrato.motoristaCpf} • CNH: {contrato.motoristaCnh || '________________'}</span>
                </div>

                <div className="text-center space-y-1">
                  <div className="border-t-2 border-slate-900 w-full pt-2"></div>
                  <strong className="block text-slate-900 uppercase text-[11px]">{nomeLocadora}</strong>
                  <span className="text-[10px] text-slate-700 font-bold block">PROPRIETÁRIO DO VEÍCULO / LOCADORA</span>
                  <span className="text-[10px] text-slate-600 block">Resp: {repNome} (CPF: {repCpf})</span>
                  <span className="text-[10px] text-slate-500 block">CNPJ: {cnpjLocadora}</span>
                </div>
              </div>

              {/* Anexos exigidos pelos órgãos de trânsito */}
              <div className="p-3 bg-slate-100 rounded border border-slate-300 text-[10px] text-slate-600 space-y-1">
                <strong className="text-slate-800 uppercase block">Documentos Obrigatórios em Anexo:</strong>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Cópia legível da Carteira Nacional de Habilitação (CNH) do condutor infrator com assinatura conferida;</li>
                  <li>Cópia do Contrato de Locação e Termo de Entrega do Veículo comprovando a posse direta na data da infração;</li>
                  <li>Cópia do CRLV do veículo e Notificação de Autuação de Infração de Trânsito (AIT).</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
