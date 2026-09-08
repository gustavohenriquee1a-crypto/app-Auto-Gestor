import React, { useRef, useState, useEffect } from 'react';
import { X, Printer, Download, FileText, CheckCircle2 } from 'lucide-react';
import { ContratoLocacao, Veiculo, ConfiguracaoLoja, ContaBancariaCaixa } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { baixarElementoComoPdf, imprimirElemento } from '../utils/printPdfUtils';
import { getConfiguracaoLojaFirestore, subscribeConfiguracoesLoja, subscribeContasBancarias } from '../services/firestoreService';

interface ModalContratoLocacaoPdfProps {
  isOpen: boolean;
  onClose: () => void;
  contrato: ContratoLocacao;
  veiculo: Veiculo;
  configuracaoLoja?: ConfiguracaoLoja | null;
  contasBancarias?: ContaBancariaCaixa[];
}

export const ModalContratoLocacaoPdf: React.FC<ModalContratoLocacaoPdfProps> = ({
  isOpen,
  onClose,
  contrato,
  veiculo,
  configuracaoLoja,
  contasBancarias,
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Estado dinâmico para dados da empresa e contas bancárias
  const [configLoja, setConfigLoja] = useState<ConfiguracaoLoja | null>(configuracaoLoja || null);
  const [contas, setContas] = useState<ContaBancariaCaixa[]>(contasBancarias || []);

  useEffect(() => {
    if (configuracaoLoja) {
      setConfigLoja(configuracaoLoja);
    } else {
      getConfiguracaoLojaFirestore().then((cfg) => {
        if (cfg) setConfigLoja(cfg);
      });
    }

    const unsubLoja = subscribeConfiguracoesLoja((cfg) => {
      if (cfg) setConfigLoja(cfg);
    });

    const unsubContas = subscribeContasBancarias((list) => {
      if (list && list.length > 0) setContas(list);
    });

    return () => {
      unsubLoja();
      unsubContas();
    };
  }, [configuracaoLoja]);

  useEffect(() => {
    if (contasBancarias && contasBancarias.length > 0) {
      setContas(contasBancarias);
    }
  }, [contasBancarias]);

  if (!isOpen) return null;

  // Extração das variáveis cadastrais da empresa
  const nomeFantasia = configLoja?.nomeLoja || 'Troca Fácil Veículos';
  const razaoSocial = configLoja?.razaoSocial || 'TROCA FÁCIL COMÉRCIO DE VEÍCULOS LTDA';
  const cnpj = configLoja?.cnpj || '47.271.452/0001-71';

  // Endereço completo formatado
  const enderecoCompleto = configLoja?.endereco || (
    configLoja?.logradouro
      ? `${configLoja.logradouro}, ${configLoja.numero || 'S/N'}${configLoja.bairro ? ` - ${configLoja.bairro}` : ''}${configLoja.cep ? `, CEP: ${configLoja.cep}` : ''}, ${configLoja.cidadeUf || 'Presidente Prudente - SP'}`
      : 'Rua Nicolau Cacciatori, 477, Jd. dos Pioneiros, CEP: 19050-340, Presidente Prudente - SP'
  );

  // Cidade e UF para Foro e Local da Assinatura
  const cidadeUf = configLoja?.cidadeUf || 'Presidente Prudente - SP';
  const partesCidadeUf = cidadeUf.split(/[-/]/).map((s) => s.trim());
  const cidadeForo = partesCidadeUf[0] || 'Presidente Prudente';
  const estadoForo = partesCidadeUf[1] || 'SP';

  // Chave PIX oficial da empresa
  const chavePix = configLoja?.chavePixPadrao || configLoja?.cnpj || '47.271.452/0001-71';

  // Dados Bancários da empresa
  const contaPrincipal = contas.find((c) => c.tipo === 'Conta Corrente PJ') || contas[0];
  const dadosBancarios = contaPrincipal && (contaPrincipal.banco || contaPrincipal.agencia || contaPrincipal.conta)
    ? `Banco: ${contaPrincipal.banco || 'Não informado'} | Agência: ${contaPrincipal.agencia || '-'} | Conta: ${contaPrincipal.conta || '-'} | Titular: ${contaPrincipal.titular || razaoSocial} | Chave PIX: ${contaPrincipal.chavePix || chavePix}`
    : `Chave PIX Oficial: ${chavePix} • Titular: ${razaoSocial} • CNPJ: ${cnpj}`;

  const repNome = contrato.representanteLocadoraNome || configLoja?.responsavelLegal || 'Diretoria Executiva';
  const repCpf = contrato.representanteLocadoraCpf || configLoja?.cpfResponsavel || '000.000.000-00';

  const endMot = contrato.motoristaEndereco;
  const enderecoMotoristaStr = endMot
    ? `${endMot.logradouro || ''}, ${endMot.numero || 's/n'}${endMot.complemento ? ` - ${endMot.complemento}` : ''} - ${endMot.bairro || ''}, ${endMot.cidade || ''}/${endMot.uf || ''} - CEP: ${endMot.cep || ''}`
    : 'Conforme cadastro';

  const handlePrint = () => {
    if (printRef.current) {
      imprimirElemento(printRef.current, {
        titulo: `Contrato-Locacao-${veiculo.placa}-${contrato.motoristaNome}`,
      });
    }
  };

  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    setIsDownloading(true);
    try {
      const sanitizedName = `Contrato-Locacao-${veiculo.placa}-${contrato.motoristaNome.replace(/[^a-zA-Z0-9]/g, '_')}`;
      await baixarElementoComoPdf(printRef.current, sanitizedName);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error('Erro ao baixar contrato em PDF:', err);
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
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="font-black text-sm text-white flex items-center gap-2">
                Contrato de Locação de Automóvel
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono">
                  {veiculo.placa}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Visualização do documento com texto jurídico integral, pronto para impressão e PDF
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
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-blue-600/20 cursor-pointer disabled:opacity-50"
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
            id="documento-contrato-locacao"
            className="w-full max-w-[794px] bg-white text-slate-900 p-8 sm:p-12 shadow-2xl rounded-sm font-sans text-xs leading-relaxed space-y-5"
            style={{ minHeight: '1122px' }}
          >
            {/* Header Timbrado */}
            <div className="border-b-2 border-slate-900 pb-4 text-center space-y-1">
              <h1 className="text-base font-black uppercase tracking-wider text-slate-900">
                {nomeFantasia ? `${nomeFantasia.toUpperCase()} • ${razaoSocial}` : razaoSocial}
              </h1>
              <p className="text-[11px] text-slate-600">
                CNPJ: {cnpj} • {enderecoCompleto}
                {configLoja?.telefone ? ` • Tel: ${configLoja.telefone}` : ''}
              </p>
              <div className="pt-2 pb-1">
                <h2 className="text-xs sm:text-[13px] font-extrabold uppercase tracking-wide text-blue-950 py-1.5 px-3 bg-slate-100 border border-slate-300 rounded inline-block">
                  CONTRATO DE LOCAÇÃO DE AUTOMÓVEL PARA UTILIZAÇÃO EM TRANSPORTE POR APLICATIVOS
                </h2>
              </div>
              <p className="text-[10px] text-slate-500 font-mono">
                INSTRUMENTO PARTICULAR Nº {contrato.id.toUpperCase()} • DATA DE INÍCIO: {formatDate(contrato.dataInicio)}
              </p>
            </div>

            {/* QUADRO RESUMO */}
            <div className="border border-slate-300 rounded-lg overflow-hidden break-inside-avoid">
              <div className="bg-slate-100 px-4 py-2 border-b border-slate-300 font-bold uppercase tracking-wider text-[11px] text-slate-800">
                Quadro Resumo das Partes, Veículo e Condições Comerciais
              </div>

              {/* LOCADORA */}
              <div className="p-3.5 border-b border-slate-200 bg-white space-y-1">
                <span className="font-bold text-slate-800 uppercase block text-[10px]">1. LOCADORA (PROPRIETÁRIA/POSSUIDORA DIRETA):</span>
                <p className="text-slate-700 leading-normal">
                  <strong>{razaoSocial}</strong> (Nome Fantasia: <strong>{nomeFantasia}</strong>), pessoa jurídica de direito privado inscrita no CNPJ sob o nº <strong>{cnpj}</strong>, com sede comercial estabelecida em <strong>{enderecoCompleto}</strong>, neste ato representada por seu representante legal infra-assinado <strong>{repNome}</strong>, portador do CPF nº <strong>{repCpf}</strong>.
                </p>
              </div>

              {/* LOCATÁRIO / MOTORISTA */}
              <div className="p-3.5 border-b border-slate-200 bg-slate-50/50 space-y-1">
                <span className="font-bold text-slate-800 uppercase block text-[10px]">2. LOCATÁRIO (CONDUTOR RESPONSÁVEL):</span>
                <p className="text-slate-700 leading-normal">
                  <strong>{contrato.motoristaNome}</strong>, portador do CPF nº <strong>{contrato.motoristaCpf}</strong>
                  {contrato.motoristaRg ? `, RG nº ${contrato.motoristaRg}` : ''}
                  {contrato.motoristaCnh ? `, CNH nº ${contrato.motoristaCnh} (Categoria ${contrato.motoristaCnhCategoria || 'B'})` : ''}
                  , residente e domiciliado em: {enderecoMotoristaStr}. Contato telefônico/WhatsApp: <strong>{contrato.motoristaTelefone}</strong>. Plataforma de mobilidade declarada: <strong>{contrato.motoristaApp}</strong>.
                </p>
              </div>

              {/* VEÍCULO */}
              <div className="p-3.5 border-b border-slate-200 bg-white space-y-1">
                <span className="font-bold text-slate-800 uppercase block text-[10px]">3. VEÍCULO AUTOMOTOR OBJETO DA LOCAÇÃO:</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-700 pt-1">
                  <div><strong>Modelo:</strong> {veiculo.modelo}</div>
                  <div><strong>Marca:</strong> {veiculo.marca}</div>
                  <div><strong>Placa:</strong> <span className="font-mono font-bold text-blue-900">{veiculo.placa}</span></div>
                  <div><strong>Ano/Modelo:</strong> {veiculo.ano}</div>
                  <div><strong>Cor:</strong> {veiculo.cor}</div>
                  <div><strong>Chassi:</strong> <span className="font-mono">{veiculo.chassi || 'Constante no CRLV'}</span></div>
                  <div><strong>Renavam:</strong> <span className="font-mono">{veiculo.renavam || 'Constante no CRLV'}</span></div>
                  <div><strong>KM Inicial de Saída:</strong> {contrato.kmInicial?.toLocaleString('pt-BR')} KM</div>
                </div>
              </div>

              {/* CONDIÇÕES FINANCEIRAS */}
              <div className="p-3.5 bg-slate-50/50 space-y-1">
                <span className="font-bold text-slate-800 uppercase block text-[10px]">4. CONDIÇÕES FINANCEIRAS & OPERACIONAIS:</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-700 pt-1">
                  <div><strong>Aluguel Semanal:</strong> <span className="text-emerald-700 font-bold">{formatCurrency(contrato.valorSemanal)}</span></div>
                  <div><strong>Dia de Cobrança:</strong> {contrato.diaCobranca}</div>
                  <div>
                    <strong>Caução de Garantia:</strong> {formatCurrency(contrato.caucao)}{' '}
                    {contrato.formaPagamentoCaucao === 'PARCELADO_SEMANAL'
                      ? `(${contrato.quantidadeParcelasCaucao || 4}x de ${formatCurrency(contrato.valorParcelaCaucao || (contrato.caucao / 4))})`
                      : '(À Vista)'}
                  </div>
                  <div><strong>Franquia Semanal de KM:</strong> {contrato.limiteKmSemanal || 1750} KM / semana</div>
                  <div><strong>Valor KM Excedente:</strong> {formatCurrency(contrato.valorMultaPorKmExcedente || 1.20)} / KM</div>
                  <div><strong>Multa por Atraso:</strong> {contrato.percentualMultaAtraso || 40}% do valor semanal</div>
                  <div className="sm:col-span-3 pt-1 border-t border-slate-200">
                    <strong>Franquia de Seguro em Caso de Sinistro/Colisão:</strong> <span className="font-bold text-red-700">R$ 3.000,00 (Três mil reais)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* CLÁUSULAS CONTRATUAIS COMPLETAS */}
            <div className="space-y-3.5 text-[11px] text-justify text-slate-800 leading-relaxed">
              <h4 className="font-bold text-slate-900 uppercase border-b border-slate-300 pb-1 text-xs tracking-wider">
                Cláusulas e Condições Gerais do Contrato
              </h4>

              <p>
                <strong>CLÁUSULA PRIMEIRA - DO OBJETO E DESTINAÇÃO EXCLUSIVA:</strong> O presente contrato tem por objeto a locação do veículo automotor individualizado no Quadro Resumo deste instrumento, de propriedade legítima ou legítima posse da <strong>LOCADORA</strong>, destinado única e exclusivamente para a exploração da atividade profissional de transporte individual remunerado de passageiros através de aplicativos e plataformas de mobilidade urbana (Uber, 99, inDrive e congêneres) pelo <strong>LOCATÁRIO</strong> devidamente credenciado.
              </p>

              <div className="p-2.5 bg-slate-50 border-l-2 border-amber-500 rounded text-slate-800">
                <strong>Parágrafo Único - Do Banimento ou Exclusão dos Aplicativos de Mobilidade:</strong> Na hipótese de o <strong>LOCATÁRIO</strong> sofrer suspensão preventiva, cancelamento ou banimento/exclusão definitiva de sua conta de motorista parceiro perante os aplicativos de mobilidade urbana em que opera, obriga-se a comunicar imediatamente o fato à <strong>LOCADORA</strong> e <strong>proceder à DEVOLUÇÃO IMEDIATA DO VEÍCULO na sede da LOCADORA no prazo máximo e improrrogável de 24 (vinte e quatro) horas</strong> contadas da notificação da suspensão ou banimento. O não cumprimento da devolução no prazo de 24 horas configurará retenção indevida e crime de apropriação indébita (Art. 168 do Código Penal), autorizando o bloqueio eletrônico do motor de partida e ajuizamento imediato de Ação de Busca e Apreensão, com cobrança cumulada de perdas e danos.
              </div>

              <div>
                <p>
                  <strong>CLÁUSULA SEGUNDA - DAS RESTRIÇÕES E VEDAÇÕES EXPRESSAS DE USO:</strong> O veículo locado deve ser utilizado estritamente com diligência e respeito às normas de trânsito e aos limites de sua capacidade. É expressamente vedado ao <strong>LOCATÁRIO</strong>, sob pena de rescisão contratual imediata por justa causa, retenção da caução, cobrança de perdas e danos e ação regressiva:
                </p>
                <div className="mt-1.5 space-y-1 pl-2">
                  <p>
                    <strong>a) Transporte de Cargas e Mercadorias:</strong> Utilizar o veículo para transporte de cargas volumosas ou pesadas, fretes, entregas de grande porte, carretos, materiais perigosos, inflamáveis, corrosivos, explosivos, entulho de obras ou qualquer volume que descaracterize o transporte exclusivo de passageiros ou exceda a capacidade de carga recomendada pelo fabricante do automóvel;
                  </p>
                  <p>
                    <strong>b) Corridas, Competições e Rachas:</strong> Utilizar, submeter ou permitir que o veículo participe de qualquer competição automobilística, corridas, provas de arrancada, gincanas, rally, testes de aceleração, manobras bruscas perigosas ("rachas" ou "pegas"), seja em vias públicas ou em pistas privadas;
                  </p>
                  <p>
                    <strong>c) Vias Alagadas e Terrenos Inóspitos:</strong> Trafegar ou transpor vias públicas sabidamente alagadas, poças d'água profundas, enchentes, enxurradas, estradas de terra severamente esburacadas ou lamacentas, praias, dunas ou terrenos acidentados, assumindo integral responsabilidade por danos causados na suspensão, lataria e especialmente calço hidráulico no motor;
                  </p>
                  <p>
                    <strong>d) Trânsito Fora do Território Nacional:</strong> Conduzir, levar ou transportar o veículo para fora das fronteiras da República Federativa do Brasil, sendo terminantemente proibida a travessia para países fronteiriços (como Paraguai, Argentina, Uruguai, Bolívia e demais nações vizinhas), sem autorização expressa, prévia e formal por escrito lavrada pela <strong>LOCADORA</strong>;
                  </p>
                  <p>
                    <strong>e) Sublocação ou Cessão a Terceiros:</strong> Sublocar, emprestar, ceder, alugar, doar ou permitir que qualquer terceiro não expressamente qualificado e homologado neste contrato conduza o veículo sob qualquer pretexto;
                  </p>
                  <p>
                    <strong>f) Reboque e Guincho:</strong> Utilizar o automóvel para empurrar, puxar, guinchar outros veículos ou tracionar carretas e reboques de qualquer espécie;
                  </p>
                  <p>
                    <strong>g) Ilícitos e Condução sob Substâncias:</strong> Conduzir o veículo sob influência de álcool, drogas ou entorpecentes ilícitos, ou utilizá-lo para a prática de qualquer ato ilícito, contrabando ou descaminho.
                  </p>
                </div>
              </div>

              <div>
                <p>
                  <strong>CLÁUSULA TERCEIRA - DO CONTROLE DE QUILOMETRAGEM E FOTO DO ODÔMETRO A CADA 30 DIAS:</strong> O <strong>LOCATÁRIO</strong> declara ciência do limite semanal de rodagem estabelecido no Quadro Resumo (<strong>{contrato.limiteKmSemanal || 1750} KM</strong>), obrigando-se a pagar o valor de <strong>{formatCurrency(contrato.valorMultaPorKmExcedente || 1.20)}</strong> por quilômetro excedente apurado semanalmente.
                </p>
                <div className="mt-1 p-2.5 bg-red-50 border-l-2 border-red-600 rounded text-slate-900">
                  <strong>Parágrafo Único - Do Envio Compulsório de Foto do Odômetro a Cada 30 Dias e Multa Cominatória:</strong> É dever indeclinável e obrigatório do <strong>LOCATÁRIO</strong> <strong>enviar à LOCADORA uma fotografia clara, nítida e legível do painel do automóvel exibindo a quilometragem atualizada do odômetro e o marcador de combustível com periodicidade improrrogável de a cada 30 (trinta) dias corridos</strong>, contados do início do contrato. <strong>O não envio da fotografia do odômetro ou o descumprimento do prazo acarretará a incidência automática de MULTA PENAL NO VALOR EQUIVALENTE A 2 (DOIS) SALÁRIOS MÍNIMOS NACIONAIS VIGENTES</strong>, além do acionamento de bloqueio preventivo do veículo por segurança e convocação imediata para vistoria presencial obrigatória na sede da <strong>LOCADORA</strong>.
                </div>
              </div>

              <div>
                <p>
                  <strong>CLÁUSULA QUARTA - DO PREÇO, PAGAMENTO E DADOS BANCÁRIOS / PIX DA EMPRESA:</strong> Pela locação do automóvel, o <strong>LOCATÁRIO</strong> pagará à <strong>LOCADORA</strong> a quantia semanal fixada no Quadro Resumo (<strong>{formatCurrency(contrato.valorSemanal)}</strong>), pontualmente em toda <strong>{contrato.diaCobranca}</strong>. O pagamento deverá ser efetuado exclusivamente através da Chave PIX ou dados bancários oficiais da <strong>LOCADORA</strong>:
                </p>
                <div className="mt-1 p-2 bg-slate-100 border border-slate-300 rounded font-mono text-[10px] space-y-0.5 text-slate-800">
                  <div><strong>• Titular / Favorecido:</strong> {razaoSocial} ({nomeFantasia})</div>
                  <div><strong>• CNPJ:</strong> {cnpj}</div>
                  <div><strong>• Chave PIX Oficial da Empresa:</strong> {chavePix}</div>
                  <div><strong>• Dados Bancários:</strong> {dadosBancarios}</div>
                </div>
                <p className="mt-1">
                  O atraso em qualquer pagamento semanal sujeitará o <strong>LOCATÁRIO</strong> à incidência de multa moratória de <strong>{contrato.percentualMultaAtraso || 40}%</strong> sobre o montante em atraso, juros de mora legais de 1% ao mês e atualização monetária. A inadimplência superior a 24 (vinte e quatro) horas caracterizará rescisão imediata com direito a bloqueio eletrônico de partida e recolhimento do veículo.
                </p>
              </div>

              <div>
                <p>
                  <strong>CLÁUSULA QUINTA - DA CAUÇÃO DE GARANTIA E PERÍODO DE CARÊNCIA DE 30 DIAS:</strong> O <strong>LOCATÁRIO</strong> entrega à <strong>LOCADORA</strong> a caução estipulada no Quadro Resumo como garantia integral das obrigações contratuais, conservação do bem e quitação de eventuais débitos pendentes.
                </p>
                <div className="mt-1 p-2 bg-slate-50 border-l-2 border-slate-400 rounded text-slate-800">
                  <strong>Parágrafo Único - Da Carência Obrigatória de 30 (Trinta) Dias para Devolução da Caução:</strong> Fica expressamente acordado entre as partes que, por ocasião do encerramento da locação e restituição física do veículo, a <strong>LOCADORA</strong> reterá a caução por um <strong>PERÍODO DE CARÊNCIA OBRIGATÓRIO DE 30 (TRINTA) DIAS</strong>, contados da data da lavratura do Laudo de Devolução. O referido prazo tem a finalidade exclusiva de permitir a consulta e lançamento de eventuais multas de trânsito emitidas pelos órgãos fiscalizadores (DETRAN, DER, DNIT, PRF, Prefeituras), evasões de pedágio ou danos mecânicos latentes ocorridos durante a posse do <strong>LOCATÁRIO</strong>. Findo o prazo de carência e inexistindo débitos, a caução será restituída integralmente; havendo pendências, estas serão deduzidas com a devolução do saldo restante.
                </div>
              </div>

              <div>
                <p>
                  <strong>CLÁUSULA SEXTA - DO SEGURO, PROTEÇÃO VEICULAR E FRANQUIA EM CASO DE SINISTRO:</strong> O veículo conta com cobertura de seguro ou proteção patrimonial contratada pela <strong>LOCADORA</strong> para cobertura de eventos de colisão, furto e roubo.
                </p>
                <div className="mt-1 p-2.5 bg-amber-50 border-l-2 border-amber-600 rounded text-slate-900">
                  <strong>Parágrafo Primeiro - Da Franquia Fixa Obrigatória em Caso de Sinistro ou Colisão:</strong> Em caso de qualquer sinistro envolvendo o veículo locado (tais como colisão, abalroamento, capotamento, danos a terceiros, perda parcial ou total, furto, roubo ou incêndio), <strong>o LOCATÁRIO é expressamente obrigado a arcar e pagar à LOCADORA o valor da FRANQUIA / PARTICIPAÇÃO OBRIGATÓRIA NO VALOR FIXO DE R$ 3.000,00 (TRÊS MIL REAIS)</strong> no prazo máximo e improrrogável de até 48 (quarenta e oito) horas da data do ocorrido.
                </div>
                <p className="mt-1">
                  <strong>Parágrafo Segundo - Perda de Cobertura e Culpa Grave:</strong> O <strong>LOCATÁRIO</strong> deverá providenciar o Boletim de Ocorrência policial em até 24h e entregá-lo à <strong>LOCADORA</strong>. A cobertura securitária cessará integralmente caso o condutor esteja sob efeito de álcool/drogas, recuse o teste do bafômetro, fuja do local do acidente, entregue a direção a terceiro não autorizado ou cometa dolo/culpa grave, hipóteses em que o <strong>LOCATÁRIO</strong> responderá com seu patrimônio pessoal pelo valor integral do veículo conforme Tabela FIPE somado aos lucros cessantes.
                </p>
              </div>

              <p>
                <strong>CLÁUSULA SÉTIMA - DAS INFRAÇÕES DE TRÂNSITO E TRANSFERÊNCIA DE PONTOS:</strong> O <strong>LOCATÁRIO</strong> assume integral responsabilidade civil, criminal e administrativa por toda e qualquer infração de trânsito (CTB) cometida durante a vigência da posse do veículo. O <strong>LOCATÁRIO</strong> compromete-se a comparecer à sede da <strong>LOCADORA</strong> no prazo improrrogável de 48 (quarenta e oito) horas após notificado para <strong>assinar o formulário de Indicação do Real Condutor Infrator perante o DETRAN, PRF, DER ou órgãos municipais</strong>, transferindo a pontuação gerada na CNH para o seu prontuário, bem como reembolsar o valor integral da multa acrescido de 15% de taxa administrativa de processamento. A omissão ou recusa autoriza o desconto imediato da caução e cobrança regressiva de perdas e danos.
              </p>

              <p>
                <strong>CLÁUSULA OITAVA - DA MANUTENÇÃO PREVENTIVA E CONSERVAÇÃO:</strong> Manutenções preventivas decorrentes de desgaste natural por quilometragem (troca de óleo de motor, filtros de óleo, combustível e ar) são de responsabilidade da <strong>LOCADORA</strong> em oficinas credenciadas conforme o cronograma oficial. É dever indeclinável e diário do <strong>LOCATÁRIO</strong> conferir os níveis do reservatório de arrefecimento (água do radiador), nível da vareta de óleo e pressão dos pneus. Danos provocados por negligência, motor superaquecido, ausência de água/óleo, pneus rasgados por guias ou buracos e avarias mecânicas decorrentes de mau uso correrão por conta exclusiva do <strong>LOCATÁRIO</strong>.
              </p>

              <p>
                <strong>CLÁUSULA NONA - DA VISTORIA E DEVOLUÇÃO DO AUTOMÓVEL:</strong> O veículo é entregue devidamente vistoriado conforme Laudo de Vistoria de Retirada, em perfeito estado mecânico, lataria, pneus e tapeçaria. O <strong>LOCATÁRIO</strong> obriga-se a devolvê-lo nas mesmas condições de limpeza e conservação em que o recebeu, e com a mesma quantidade de combustível anotada na saída.
              </p>

              <div>
                <p>
                  <strong>CLÁUSULA DÉCIMA - DA VIGÊNCIA, RESCISÃO VOLUNTÁRIA E AVISO PRÉVIO:</strong> O presente contrato vigora por prazo indeterminado a partir da data de sua assinatura.
                </p>
                <div className="mt-1 p-2.5 bg-red-50 border-l-2 border-red-600 rounded text-slate-900 space-y-1">
                  <p>
                    <strong>Parágrafo Primeiro - Do Aviso Prévio Obrigatório de 30 Dias:</strong> Qualquer uma das partes contratantes poderá rescindir este contrato unilateralmente e por vontade própria a qualquer momento, <strong>desde que notifique a outra parte com antecedência mínima e compulsória de 30 (TRINTA) DIAS DE AVISO PRÉVIO formal e escrito</strong>.
                  </p>
                  <p>
                    <strong>Parágrafo Segundo - Da Multa Rescisória de 2 Salários Mínimos por Descumprimento do Aviso Prévio:</strong> A devolução, entrega abrupta ou abandono do veículo pelo <strong>LOCATÁRIO</strong> sem a concessão ou cumprimento integral do aviso prévio de 30 (trinta) dias importará na aplicação automática de <strong>MULTA CONTRATUAL PENAL COMPENSATÓRIA NO VALOR EQUIVALENTE A 2 (DOIS) SALÁRIOS MÍNIMOS NACIONAIS VIGENTES</strong>, além de perdas e danos e cobrança das semanas faltantes.
                  </p>
                </div>
              </div>

              <p>
                <strong>CLÁUSULA DÉCIMA PRIMEIRA - DO FORO DA COMARCA:</strong> As partes elegem expressamente o <strong>FORO DA COMARCA DE {cidadeForo.toUpperCase()} - ESTADO DE {estadoForo.toUpperCase()}</strong>, onde se situa a sede da <strong>LOCADORA</strong>, com renúncia irrevogável a qualquer outro foro por mais privilegiado ou especial que seja, para dirimir quaisquer litígios ou dúvidas decorrentes da aplicação e execução deste contrato.
              </p>
            </div>

            {/* Assinaturas */}
            <div className="pt-6 space-y-8 break-inside-avoid">
              <div className="text-right text-[11px] text-slate-600">
                {cidadeForo} - {estadoForo}, {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4">
                <div className="text-center space-y-1">
                  <div className="border-t border-slate-900 w-full pt-2"></div>
                  <strong className="block text-slate-900 uppercase text-[11px]">{razaoSocial}</strong>
                  <span className="text-[10px] text-slate-600 block">{nomeFantasia} • CNPJ: {cnpj}</span>
                  <span className="text-[10px] text-slate-500 block">Representante Legal: {repNome} (CPF: {repCpf})</span>
                </div>

                <div className="text-center space-y-1">
                  <div className="border-t border-slate-900 w-full pt-2"></div>
                  <strong className="block text-slate-900 uppercase text-[11px]">{contrato.motoristaNome}</strong>
                  <span className="text-[10px] text-slate-600 block">LOCATÁRIO / CONDUTOR - CPF: {contrato.motoristaCpf}</span>
                  {contrato.motoristaCnh && (
                    <span className="text-[10px] text-slate-500 block">CNH: {contrato.motoristaCnh} (Cat. {contrato.motoristaCnhCategoria || 'B'})</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 pt-4 text-center text-[10px] text-slate-500">
                <div>
                  <div className="border-t border-slate-400 w-3/4 mx-auto pt-1"></div>
                  <span>Testemunha 1 (Nome e CPF)</span>
                </div>
                <div>
                  <div className="border-t border-slate-400 w-3/4 mx-auto pt-1"></div>
                  <span>Testemunha 2 (Nome e CPF)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

