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
  const partesCidadeUf = typeof cidadeUf === 'string' ? cidadeUf.split(/[-/]/).map((s) => s.trim()) : ['Presidente Prudente', 'SP'];
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
    ? `${endMot.logradouro || ''}${endMot.numero ? `, nº ${endMot.numero}` : ''}${endMot.complemento ? ` - ${endMot.complemento}` : ''}${endMot.bairro ? `, ${endMot.bairro}` : ''}`
    : '[ENDEREÇO NÃO INFORMADO]';

  const dataAssinaturaFormatada = contrato.dataInicio
    ? (() => {
        try {
          if (typeof contrato.dataInicio === 'string') {
            const partes = contrato.dataInicio.split('-');
            if (partes.length === 3) {
              const d = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
              return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
            }
          }
        } catch {
          // fallback
        }
        return new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
      })()
    : new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

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
                TROCA FÁCIL VEÍCULOS LTDA
              </h1>
              <p className="text-[11px] text-slate-600">
                CNPJ: 47.271.452/0001-71 • Rua Nicolau Cacciatori, nº 477, Jardim dos Pioneiros, CEP 19050-350, Presidente Prudente/SP
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

              {/* 1. LOCADORA (PROPRIETÁRIA/POSSUIDORA DIRETA) */}
              <div className="p-3.5 border-b border-slate-200 bg-white space-y-1">
                <span className="font-bold text-slate-800 uppercase block text-[10px]">
                  1. LOCADORA (PROPRIETÁRIA/POSSUIDORA DIRETA):
                </span>
                <p className="text-slate-700 leading-normal">
                  <strong>TROCA FÁCIL VEÍCULOS LTDA</strong>, pessoa jurídica de direito privado, devidamente inscrita no CNPJ sob o nº <strong>47.271.452/0001-71</strong>, com sede na Rua Nicolau Cacciatori, nº 477, Jardim dos Pioneiros, CEP 19050-350, na cidade de Presidente Prudente/SP.
                </p>
              </div>

              {/* 2. LOCATÁRIO (CONDUTOR RESPONSÁVEL) */}
              <div className="p-3.5 border-b border-slate-200 bg-slate-50/50 space-y-1">
                <span className="font-bold text-slate-800 uppercase block text-[10px]">
                  2. LOCATÁRIO (CONDUTOR RESPONSÁVEL):
                </span>
                <p className="text-slate-700 leading-normal">
                  <strong>{contrato.motoristaNome}</strong>, {contrato.motoristaNacionalidade || 'Brasileiro(a)'}, {contrato.motoristaEstadoCivil || 'Solteiro(a)'}, {contrato.motoristaProfissao || 'Motorista de Aplicativo'}, portador do RG nº <strong>{contrato.motoristaRg || '[NÃO INFORMADO]'}</strong>, inscrito no CPF sob o nº <strong>{contrato.motoristaCpf}</strong>, CNH nº <strong>{contrato.motoristaCnh || '[NÃO INFORMADO]'}</strong>{contrato.motoristaCnhCategoria ? ` (Categoria ${contrato.motoristaCnhCategoria})` : ''}, residente e domiciliado em <strong>{enderecoMotoristaStr}</strong>, CEP <strong>{endMot?.cep || '[NÃO INFORMADO]'}</strong>, cidade de <strong>{endMot?.cidade || 'Presidente Prudente'}/{endMot?.uf || 'SP'}</strong>, telefone <strong>{contrato.motoristaTelefone || '[NÃO INFORMADO]'}</strong>, e-mail <strong>{contrato.motoristaEmail || '[NÃO INFORMADO]'}</strong>.
                </p>
              </div>

              {/* 3. VEÍCULO AUTOMOTOR OBJETO DA LOCAÇÃO */}
              <div className="p-3.5 border-b border-slate-200 bg-white space-y-1">
                <span className="font-bold text-slate-800 uppercase block text-[10px]">
                  3. VEÍCULO AUTOMOTOR OBJETO DA LOCAÇÃO:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-700 pt-1">
                  <div><strong>Modelo:</strong> {veiculo.modelo}</div>
                  <div><strong>Marca:</strong> {veiculo.marca}</div>
                  <div><strong>Placa:</strong> <span className="font-mono font-bold text-blue-900">{veiculo.placa}</span></div>
                  <div><strong>Ano/Modelo:</strong> {veiculo.anoFabricacao || veiculo.ano}/{veiculo.anoModelo || veiculo.ano}</div>
                  <div><strong>Cor:</strong> {veiculo.cor}</div>
                  <div><strong>Chassi:</strong> <span className="font-mono">{veiculo.chassi || 'Constante no CRLV'}</span></div>
                  <div><strong>Renavam:</strong> <span className="font-mono">{veiculo.renavam || 'Constante no CRLV'}</span></div>
                  <div><strong>KM Inicial de Saída:</strong> {(contrato.kmInicial || 0).toLocaleString('pt-BR')} KM</div>
                </div>
              </div>

              {/* 4. CONDIÇÕES FINANCEIRAS & OPERACIONAIS */}
              <div className="p-3.5 bg-slate-50/50 space-y-1">
                <span className="font-bold text-slate-800 uppercase block text-[10px]">
                  4. CONDIÇÕES FINANCEIRAS & OPERACIONAIS:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-700 pt-1">
                  <div>
                    <strong>Aluguel Semanal:</strong> <span className="text-emerald-700 font-bold">{formatCurrency(contrato.valorSemanal || 770)}</span>
                  </div>
                  <div>
                    <strong>Vencimento Semanal:</strong> Toda segunda-feira, até as 11h00
                  </div>
                  <div>
                    <strong>Forma de Pagamento:</strong> PIX ou Dinheiro
                  </div>
                  <div>
                    <strong>Caução de Garantia:</strong> {formatCurrency(contrato.caucao || 600)}{' '}
                    {contrato.formaPagamentoCaucao === 'PARCELADO_SEMANAL'
                      ? `(${contrato.quantidadeParcelasCaucao || 6}x de ${formatCurrency(contrato.valorParcelaCaucao || (contrato.caucao / (contrato.quantidadeParcelasCaucao || 6)) || 100)})`
                      : '(À vista)'}
                  </div>
                  <div>
                    <strong>Limite Semanal de KM:</strong> {contrato.limiteKmSemanal || 1750} KM / semana
                  </div>
                  <div>
                    <strong>Valor KM Excedente:</strong> {formatCurrency(contrato.valorMultaPorKmExcedente || 1.20)} / KM
                  </div>
                  <div>
                    <strong>Multa por Atraso:</strong> 10% (dez por cento) sobre a locação + juros 1% a.m.
                  </div>
                  <div>
                    <strong>Bloqueio por Inadimplência:</strong> Bloqueio a partir das 18h00 do mesmo dia; rescisão após 24h
                  </div>
                  <div>
                    <strong>Participação em Sinistro:</strong> <span className="font-bold text-red-700">R$ 3.000,00</span> (G AUTOS)
                  </div>
                  <div className="sm:col-span-3 pt-1 border-t border-slate-200 flex flex-wrap gap-x-6 gap-y-1 text-[10px] text-slate-600">
                    <span><strong>Carência Devolução Caução:</strong> até 45 dias da assinatura do Laudo de Devolução</span>
                    <span><strong>Envio Foto Odômetro:</strong> toda segunda-feira (multa de R$ 50,00 por ocorrência)</span>
                    <span><strong>Raio de Circulação:</strong> até 100 km de Presidente Prudente/SP</span>
                  </div>
                </div>
              </div>
            </div>

            {/* IDENTIFICAÇÃO DAS PARTES */}
            <div className="space-y-2 pt-2 text-[11px] text-justify text-slate-800 leading-relaxed border-t border-slate-200">
              <h3 className="font-bold text-slate-900 uppercase text-xs tracking-wider">
                IDENTIFICAÇÃO DAS PARTES
              </h3>
              
              <p>
                <strong>LOCADORA:</strong> <strong>TROCA FÁCIL VEÍCULOS LTDA</strong>, pessoa jurídica de direito privado, devidamente inscrita no CNPJ sob o nº <strong>47.271.452/0001-71</strong>, com sede na Rua Nicolau Cacciatori, nº 477, Jardim dos Pioneiros, CEP 19050-350, na cidade de Presidente Prudente/SP.
              </p>

              <p>
                <strong>LOCATÁRIO:</strong> <strong>{contrato.motoristaNome}</strong>, {contrato.motoristaNacionalidade || 'Brasileiro(a)'}, {contrato.motoristaEstadoCivil || 'Solteiro(a)'}, {contrato.motoristaProfissao || 'Motorista de Aplicativo'}, portador do RG nº <strong>{contrato.motoristaRg || '[NÃO INFORMADO]'}</strong>, inscrito no CPF sob o nº <strong>{contrato.motoristaCpf}</strong>, CNH nº <strong>{contrato.motoristaCnh || '[NÃO INFORMADO]'}</strong>{contrato.motoristaCnhCategoria ? ` (Categoria ${contrato.motoristaCnhCategoria})` : ''}, residente e domiciliado em <strong>{enderecoMotoristaStr}</strong>, CEP <strong>{endMot?.cep || '[NÃO INFORMADO]'}</strong>, cidade de <strong>{endMot?.cidade || 'Presidente Prudente'}/{endMot?.uf || 'SP'}</strong>, telefone <strong>{contrato.motoristaTelefone || '[NÃO INFORMADO]'}</strong>, e-mail <strong>{contrato.motoristaEmail || '[NÃO INFORMADO]'}</strong>.
              </p>

              <p>
                As partes acima identificadas têm, entre si, justo e contratado o presente <strong>CONTRATO DE LOCAÇÃO DE AUTOMÓVEL</strong>, que se regerá pelas cláusulas e condições a seguir elencadas.
              </p>
            </div>

            {/* CLÁUSULAS CONTRATUAIS COMPLETAS */}
            <div className="space-y-3.5 text-[11px] text-justify text-slate-800 leading-relaxed">
              <div className="border-t border-slate-300 pt-3">
                <h4 className="font-bold text-slate-900 uppercase text-xs tracking-wider mb-2">
                  CLÁUSULA PRIMEIRA – DO OBJETO
                </h4>
                <p className="mb-1.5">
                  <strong>1.1.</strong> O presente contrato tem como objeto a locação do veículo de propriedade da LOCADORA, identificado no Quadro Resumo deste instrumento, em perfeito estado de conservação e funcionamento, que neste ato é entregue ao LOCATÁRIO para utilização conforme as condições aqui estabelecidas.
                </p>
                <p className="mb-1.5">
                  <strong>1.2.</strong> A expressão “veículo” compreende o automóvel, incluindo pneus, ferramentas, equipamentos, acessórios, placas, chaves e documentos.
                </p>
                <p className="mb-1.5">
                  <strong>1.3.</strong> As partes declaram terem efetuado a vistoria do objeto do presente contrato e que o mesmo se encontra em perfeito estado de conservação e funcionamento, conforme laudo de vistoria de retirada.
                </p>
                <p>
                  <strong>1.4.</strong> O veículo deverá ser devolvido na sede da LOCADORA ou onde esta indicar, na data e hora previamente estabelecidas, nas condições previstas neste contrato.
                </p>
              </div>

              <div className="border-t border-slate-200 pt-3">
                <h4 className="font-bold text-slate-900 uppercase text-xs tracking-wider mb-2">
                  CLÁUSULA SEGUNDA – DO USO DO VEÍCULO
                </h4>
                <p className="mb-1.5">
                  <strong>2.1.</strong> O veículo será utilizado unicamente pelo LOCATÁRIO com a finalidade de transporte de passageiros por meio de aplicativos, tais como Uber, 99, inDrive e congêneres, não sendo permitido seu uso por terceiros, sob pena de rescisão contratual e aplicação das multas previstas neste contrato.
                </p>
                <p className="mb-1.5">
                  <strong>2.2.</strong> É proibida a utilização e condução do veículo para:
                </p>
                <div className="pl-3 space-y-1 mb-1.5">
                  <p>(a) transporte de cargas, mediante cobrança de qualquer natureza, ou transporte de pessoas além da capacidade informada nas especificações técnicas do veículo;</p>
                  <p>(b) teste de velocidade, rachas ou competições de qualquer natureza;</p>
                  <p>(c) transporte de combustíveis, explosivos ou qualquer outro material inflamável, produtos proibidos por lei, ou qualquer fim incompatível com a finalidade descrita neste contrato;</p>
                  <p>(d) uso incompatível com as características do veículo ou em desacordo com a finalidade da locação;</p>
                  <p>(e) violação das normas do Código de Trânsito Brasileiro;</p>
                  <p>(f) guinchar, empurrar e/ou rebocar outros veículos;</p>
                  <p>(g) quaisquer finalidades ilícitas;</p>
                  <p>(h) campanha política;</p>
                  <p>(i) circulação em condições impróprias, tais como áreas inundadas, dunas, terrenos que não ofereçam segurança para a integridade do veículo e seus ocupantes;</p>
                  <p>(j) trânsito em cidades onde seja proibido o transporte por aplicativos, sendo de inteira responsabilidade do LOCATÁRIO quaisquer danos ocorridos em virtude de tal proibição, bem como despesas de liberação e apreensão do veículo;</p>
                  <p>(k) circulação fora do território nacional.</p>
                </div>
                <p className="mb-1.5">
                  <strong>2.3.</strong> O LOCATÁRIO é livre para determinar os dias e horários para a prestação de serviços, respeitada a legislação aplicável.
                </p>
                <p className="mb-1.5">
                  <strong>2.4.</strong> O veículo possui limite de <strong>1.750 km (mil e setecentos e cinquenta quilômetros) semanais</strong>, conforme cláusula específica deste contrato.
                </p>
                <p>
                  <strong>2.5.</strong> O veículo deve ser devolvido limpo e com o tanque de combustível na mesma quantidade em que foi entregue, sob pena de desconto na caução conforme previsto neste contrato.
                </p>
              </div>

              <div className="border-t border-slate-200 pt-3">
                <h4 className="font-bold text-slate-900 uppercase text-xs tracking-wider mb-2">
                  CLÁUSULA TERCEIRA – DO PAGAMENTO
                </h4>
                <p className="mb-1.5">
                  <strong>3.1.</strong> O pagamento da locação será realizado semanalmente, de forma antecipada e vincendo, sendo o valor inicial de <strong>R$ 770,00 (setecentos e setenta reais)</strong>.
                </p>
                <p className="mb-1.5">
                  <strong>3.2.</strong> Os pagamentos serão realizados por PIX ou dinheiro, em favor da LOCADORA, conforme dados informados no ato do pagamento.
                </p>
                <p className="mb-1.5">
                  <strong>3.3.</strong> Os pagamentos serão realizados semanalmente, <strong>todas as segundas-feiras, até as 11h00</strong>.
                </p>
                <p className="mb-1.5">
                  <strong>3.4.</strong> O atraso no pagamento sujeitará o LOCATÁRIO à incidência de multa moratória de <strong>10% (dez por cento)</strong> sobre o valor da locação, juros de mora de 1% ao mês e correção monetária.
                </p>
                <p className="mb-1.5">
                  <strong>3.5.</strong> Em caso de atraso no pagamento até as 11h00 de segunda-feira, sem comunicação prévia e justificativa aceita pela LOCADORA, o veículo poderá ser <strong>bloqueado eletronicamente a partir das 18h00 do mesmo dia</strong>, ficando o LOCATÁRIO obrigado a devolver imediatamente o veículo na sede da LOCADORA.
                </p>
                <p>
                  <strong>3.6.</strong> A inadimplência superior a <strong>24 (vinte e quatro) horas</strong> caracterizará rescisão automática do contrato por justa causa, facultando à LOCADORA a retomada imediata do veículo, independentemente de notificação judicial.
                </p>
              </div>

              <div className="border-t border-slate-200 pt-3">
                <h4 className="font-bold text-slate-900 uppercase text-xs tracking-wider mb-2">
                  CLÁUSULA QUARTA – DA CAUÇÃO DE GARANTIA
                </h4>
                <p className="mb-1.5">
                  <strong>4.1.</strong> Como garantia das obrigações assumidas neste contrato, o LOCATÁRIO entregará à LOCADORA, no ato da retirada do veículo, a quantia de <strong>R$ 600,00 (seiscentos reais)</strong> a título de caução, que poderá ser paga à vista ou parcelada em até 6 (seis) semanas de R$ 100,00.
                </p>
                <p className="mb-1.5">
                  <strong>4.2.</strong> A caução não será remunerada, não incidindo juros ou correção em favor do LOCATÁRIO, e será mantida pela LOCADORA como garantia de cumprimento das obrigações contratuais, conservação e restituição do veículo, e pagamento de multas, pedágios, taxas e demais débitos.
                </p>
                <p className="mb-1.5">
                  <strong>4.3.</strong> Em caso de devolução do veículo, a LOCADORA poderá reter a caução por até <strong>45 (quarenta e cinco) dias</strong>, contados da data de assinatura do Laudo de Devolução, para apuração de multas, pedágios, danos e demais débitos.
                </p>
                <p className="mb-1.5">
                  <strong>4.4.</strong> Findo o prazo de retenção e inexistindo débitos, a caução será restituída integralmente ao LOCATÁRIO, sem juros, em até 5 (cinco) dias úteis. Havendo pendências, estas serão deduzidas e o saldo remanescente será devolvido no mesmo prazo.
                </p>
                <p>
                  <strong>4.5.</strong> Caso o valor da caução seja utilizado para pagamento de multas ou outros débitos, o LOCATÁRIO deverá recompor o valor integral da caução (R$ 600,00) no prazo acordado com a LOCADORA, sob pena de rescisão contratual e retenção do veículo até a regularização.
                </p>
              </div>

              <div className="border-t border-slate-200 pt-3">
                <h4 className="font-bold text-slate-900 uppercase text-xs tracking-wider mb-2">
                  CLÁUSULA QUINTA – DO CONTROLE DE QUILOMETRAGEM
                </h4>
                <p className="mb-1.5">
                  <strong>5.1.</strong> O veículo possui limite semanal de rodagem de <strong>1.750 km (mil e setecentos e cinquenta quilômetros)</strong>, válido para todos os veículos da frota.
                </p>
                <p className="mb-1.5">
                  <strong>5.2.</strong> O excedente de quilometragem será cobrado ao valor fixo de <strong>R$ 1,20 (um real e vinte centavos) por quilômetro rodado além do limite</strong>, apurado semanalmente.
                </p>
                <p className="mb-1.5">
                  <strong>5.3.</strong> O LOCATÁRIO obriga-se a enviar, toda segunda-feira, juntamente com o dia do pagamento, fotografia clara e legível do painel do veículo, exibindo a quilometragem atual do odômetro.
                </p>
                <p className="mb-1.5">
                  <strong>5.4.</strong> A LOCADORA utilizará, como forma de controle complementar, os dados de quilometragem fornecidos pelo sistema de rastreamento veicular, podendo confrontar as informações com as fotos enviadas pelo LOCATÁRIO.
                </p>
                <p>
                  <strong>5.5.</strong> O não envio da fotografia do odômetro no prazo estabelecido sujeitará o LOCATÁRIO a multa contratual de <strong>R$ 50,00 (cinquenta reais)</strong> por ocorrência e bloqueio preventivo do veículo até a regularização da informação.
                </p>
              </div>

              <div className="border-t border-slate-200 pt-3">
                <h4 className="font-bold text-slate-900 uppercase text-xs tracking-wider mb-2">
                  CLÁUSULA SEXTA – DO SEGURO / PROTEÇÃO VEICULAR E PARTICIPAÇÃO EM SINISTRO
                </h4>
                <p className="mb-1.5">
                  <strong>6.1.</strong> O veículo conta com proteção veicular contratada junto à G AUTOS, que cobre eventos como colisão, furto, roubo e incêndio, conforme condições gerais da apólice/certificado.
                </p>
                <p className="mb-1.5">
                  <strong>6.2.</strong> Em caso de sinistro coberto (colisão, furto, roubo, incêndio, perda total), o LOCATÁRIO deverá arcar com participação obrigatória no valor fixo de <strong>R$ 3.000,00 (três mil reais)</strong>, a ser pago à LOCADORA em até 48 (quarenta e oito) horas da ocorrência.
                </p>
                <p className="mb-1.5">
                  <strong>6.3.</strong> A participação obrigatória de R$ 3.000,00 corresponde à parcela de responsabilidade do condutor nos custos do sinistro, sendo que a LOCADORA assumirá a diferença entre esse valor e a franquia real da proteção veicular, quando houver.
                </p>
                <p className="mb-1.5">
                  <strong>6.4.</strong> O pagamento da participação obrigatória será feito diretamente pelo LOCATÁRIO à LOCADORA, que repassará os valores à entidade de proteção veicular e/ou oficina, conforme o caso.
                </p>
                <p className="mb-1.5">
                  <strong>6.5.</strong> Em caso de perda total, furto ou roubo, além da participação obrigatória, o LOCATÁRIO responderá por lucros cessantes, calculados com base no valor do aluguel semanal dividido por 7 (sete), multiplicado pelo número de dias em que o veículo permaneceu indisponível para locação em razão do sinistro e/ou reparos.
                </p>
                <p>
                  <strong>6.6.</strong> A cobertura da proteção veicular não se aplicará e o LOCATÁRIO responderá integralmente pelos danos (incluindo valor do veículo com base na Tabela FIPE vigente e lucros cessantes) nas hipóteses de condução sob influência de álcool ou drogas, recusa ao teste do bafômetro, fuga do local do acidente, entrega da direção a terceiro não autorizado, ou prática de dolo ou culpa grave.
                </p>
              </div>

              <div className="border-t border-slate-200 pt-3">
                <h4 className="font-bold text-slate-900 uppercase text-xs tracking-wider mb-2">
                  CLÁUSULA SÉTIMA – DAS INFRAÇÕES DE TRÂNSITO
                </h4>
                <p className="mb-1.5">
                  <strong>7.1.</strong> O LOCATÁRIO assume integral responsabilidade civil, criminal e administrativa por todas as infrações de trânsito (CTB) cometidas durante a vigência da posse do veículo.
                </p>
                <p className="mb-1.5">
                  <strong>7.2.</strong> Em caso de notificação de infração, o LOCATÁRIO deverá fornecer, no prazo máximo de 48 (quarenta e oito) horas após a comunicação pela LOCADORA, todos os documentos necessários para a indicação do condutor infrator perante o órgão autuador.
                </p>
                <p className="mb-1.5">
                  <strong>7.3.</strong> O LOCATÁRIO reembolsará à LOCADORA o valor integral da multa e taxa administrativa de 15% (quinze por cento) sobre o valor da multa, a título de custos de atendimento, emissão de documentos e deslocamento.
                </p>
                <p className="mb-1.5">
                  <strong>7.4.</strong> O valor da multa e da taxa administrativa poderá ser descontado da caução, facultado ao LOCATÁRIO o parcelamento do débito, mediante acordo com a LOCADORA, sem prejuízo da obrigação de recompor o valor integral da caução.
                </p>
                <p>
                  <strong>7.5.</strong> Caso o LOCATÁRIO se negue a assinar a indicação do condutor infrator, ficará sujeito ao pagamento de multa contratual equivalente ao dobro do valor da multa original, uma vez que a recusa pode acarretar majoração do débito junto ao órgão emissor.
                </p>
              </div>

              <div className="border-t border-slate-200 pt-3">
                <h4 className="font-bold text-slate-900 uppercase text-xs tracking-wider mb-2">
                  CLÁUSULA OITAVA – DA MANUTENÇÃO PREVENTIVA E CONSERVAÇÃO
                </h4>
                <p className="mb-1.5">
                  <strong>8.1.</strong> As manutenções preventivas programadas por quilometragem (troca de óleo, filtros, revisões conforme manual do fabricante) são de responsabilidade da LOCADORA, que as realizará em oficinas parceiras/credenciadas, mediante agendamento prévio.
                </p>
                <p className="mb-1.5">
                  <strong>8.2.</strong> O LOCATÁRIO obriga-se a levar o veículo à oficina indicada no dia e horário agendados, comunicar imediatamente à LOCADORA qualquer anormalidade no funcionamento do veículo e realizar verificações diárias de nível de óleo, água do radiador e pressão dos pneus.
                </p>
                <p className="mb-1.5">
                  <strong>8.3.</strong> São de responsabilidade exclusiva do LOCATÁRIO os danos decorrentes de rodagem com falta de óleo e/ou água, ignorar luzes de alerta no painel, colisões, riscos, arranhões e amassados não constatados na vistoria de entrega, mau uso, negligência ou imperícia na condução do veículo.
                </p>
                <p>
                  <strong>8.4.</strong> O não comparecimento do LOCATÁRIO à revisão agendada sujeitará o LOCATÁRIO ao pagamento de multa contratual equivalente ao valor de uma diária (R$ 110,00), sem prejuízo da responsabilidade por danos decorrentes da falta de manutenção.
                </p>
              </div>

              <div className="border-t border-slate-200 pt-3">
                <h4 className="font-bold text-slate-900 uppercase text-xs tracking-wider mb-2">
                  CLÁUSULA NONA – DA VISTORIA, LIMPEZA E COMBUSTÍVEL
                </h4>
                <p className="mb-1.5">
                  <strong>9.1.</strong> O veículo será entregue ao LOCATÁRIO mediante laudo de vistoria de retirada, assinado por ambas as partes, com registro do estado de conservação, quilometragem e nível de combustível.
                </p>
                <p className="mb-1.5">
                  <strong>9.2.</strong> Na devolução, será realizada vistoria presencial obrigatória, com laudo comparativo em relação à vistoria de retirada, para apuração de danos, nível de combustível e condições de limpeza.
                </p>
                <p className="mb-1.5">
                  <strong>9.3.</strong> O LOCATÁRIO obriga-se a devolver o veículo nas mesmas condições de conservação em que o recebeu, considerado o desgaste normal pelo uso.
                </p>
                <p className="mb-1.5">
                  <strong>9.4.</strong> Caso o veículo seja devolvido sujo, será descontado da caução o valor de R$ 80,00 (oitenta reais) a título de lavagem.
                </p>
                <p>
                  <strong>9.5.</strong> O veículo deverá ser devolvido com o mesmo nível de combustível anotado na retirada. Caso contrário, será cobrado o valor do combustível necessário para completar o tanque, acrescido de taxa de serviço de R$ 20,00 (vinte reais).
                </p>
              </div>

              <div className="border-t border-slate-200 pt-3">
                <h4 className="font-bold text-slate-900 uppercase text-xs tracking-wider mb-2">
                  CLÁUSULA DÉCIMA – DO PRAZO DE DEVOLUÇÃO E RETOMADA DO VEÍCULO
                </h4>
                <p className="mb-1.5">
                  <strong>10.1.</strong> Em caso de rescisão do contrato, seja por inadimplência ou por vontade das partes, o LOCATÁRIO deverá devolver o veículo na sede da LOCADORA no prazo máximo e improrrogável de 12 (doze) horas, contados da notificação.
                </p>
                <p className="mb-1.5">
                  <strong>10.2.</strong> Ultrapassado o prazo de 12 horas sem a devolução, a LOCADORA poderá bloquear eletronicamente o veículo, notificar o LOCATÁRIO para devolução imediata e promover as medidas judiciais cabíveis, inclusive ação de busca e apreensão.
                </p>
                <p className="mb-1.5">
                  <strong>10.3.</strong> A não devolução do veículo no prazo estabelecido, após notificação, poderá configurar apropriação indébita (art. 168 do Código Penal), ficando o LOCATÁRIO responsável por todas as despesas de recuperação do bem, tais como chaveiro, combustível, guincho, pedágios, taxas judiciais, diárias de pátio, honorários advocatícios e demais custos necessários.
                </p>
                <p className="mb-1.5">
                  <strong>10.4.</strong> Em caso de inadimplência e notificação, ficará o LOCATÁRIO sujeito ao repasse de honorários advocatícios, 10% (dez por cento) a título de cobrança extrajudicial e 20% (vinte por cento) em caso de cobrança judicial, incidentes sobre o valor total do débito.
                </p>
                <p>
                  <strong>10.5.</strong> O LOCATÁRIO autoriza expressamente a LOCADORA a utilizar bloqueio eletrônico do veículo em situações de atraso no pagamento, descumprimento do prazo de devolução ou suspeita de uso indevido.
                </p>
              </div>

              <div className="border-t border-slate-200 pt-3">
                <h4 className="font-bold text-slate-900 uppercase text-xs tracking-wider mb-2">
                  CLÁUSULA DÉCIMA PRIMEIRA – DO RAIO DE CIRCULAÇÃO
                </h4>
                <p className="mb-1.5">
                  <strong>11.1.</strong> O veículo poderá circular livremente em um raio de até 100 km (cem quilômetros) da cidade de Presidente Prudente/SP, sede da LOCADORA.
                </p>
                <p className="mb-1.5">
                  <strong>11.2.</strong> Para deslocamentos além desse raio, o LOCATÁRIO deverá comunicar a LOCADORA com antecedência mínima de 48 (quarenta e oito) horas, informar o período previsto de ausência e o destino da viagem, e obter autorização expressa da LOCADORA.
                </p>
                <p>
                  <strong>11.3.</strong> O descumprimento desta cláusula sujeitará o LOCATÁRIO às penalidades previstas neste contrato, sem prejuízo da responsabilidade por eventuais danos ou prejuízos decorrentes.
                </p>
              </div>

              <div className="border-t border-slate-200 pt-3">
                <h4 className="font-bold text-slate-900 uppercase text-xs tracking-wider mb-2">
                  CLÁUSULA DÉCIMA SEGUNDA – DAS OBRIGAÇÕES DO LOCATÁRIO
                </h4>
                <div className="space-y-1.5">
                  <p><strong>12.1.</strong> Conduzir o veículo com segurança e cautela, respeitando as leis de trânsito e garantindo a integridade material do veículo, equipamentos e acessórios.</p>
                  <p><strong>12.2.</strong> Observar as restrições de circulação de veículos advindas do poder público, tais como rodízio, nas localidades em que existam leis municipais neste sentido.</p>
                  <p><strong>12.3.</strong> Observar as exigências constantes no manual do veículo quanto às revisões preventivas programadas, comunicando de imediato à LOCADORA e informando a quilometragem mensalmente.</p>
                  <p><strong>12.4.</strong> Não realizar quaisquer reparos ou serviços no veículo sem a prévia e expressa autorização da LOCADORA.</p>
                  <p><strong>12.5.</strong> Manter linha telefônica com pacote de dados, bem como suportar a despesa com referida linha telefônica.</p>
                  <p><strong>12.6.</strong> Não alterar as características originais do veículo sem prévia autorização por escrito da LOCADORA.</p>
                  <p><strong>12.7.</strong> Declarar que possui carteira nacional de habilitação para trabalho remunerado, comprometendo-se a mantê-la nesta categoria.</p>
                  <p><strong>12.8.</strong> Em caso de perda, suspensão ou cassação da CNH, informar e devolver o veículo à LOCADORA no prazo de 24 (vinte e quatro) horas.</p>
                  <p><strong>12.9.</strong> Atender aos requisitos exigidos pelos aplicativos Uber, 99, inDrive e congêneres, incluindo instalação de equipamento “Sem Parar”, fornecimento de água e bala aos passageiros, bem como a higiene diária do veículo.</p>
                  <p><strong>12.10.</strong> Em caso de exclusão do cadastro junto às plataformas, informar imediatamente a LOCADORA, devolvendo o veículo no prazo de 24 (vinte e quatro) horas.</p>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-3">
                <h4 className="font-bold text-slate-900 uppercase text-xs tracking-wider mb-2">
                  CLÁUSULA DÉCIMA TERCEIRA – DO SINISTRO
                </h4>
                <p className="mb-1.5">
                  <strong>13.1.</strong> Na hipótese de furto, roubo, incêndio, colisão ou perda total do veículo, considera-se para fins de encerramento do período de locação a data da entrega do Boletim de Ocorrência, juntamente com as chaves e documento do veículo, fornecendo ainda dados de possíveis testemunhas, do policial que o atendeu e outras informações que contribuam para o esclarecimento do sinistro.
                </p>
                <p className="mb-1.5">
                  <strong>13.2.</strong> No caso de acidente, o LOCATÁRIO deverá fornecer cópias dos documentos e demais informações do terceiro, sendo CNH e CRLV, telefones e endereços da(s) vítima(s) e do terceiro, arcando com o pagamento do valor da participação obrigatória estabelecida neste contrato.
                </p>
                <p className="mb-1.5">
                  <strong>13.3.</strong> No caso de furto/roubo, o LOCATÁRIO deverá registrar boletim de ocorrência imediatamente, fornecer cópia do mesmo e arcar com o pagamento do valor da participação obrigatória.
                </p>
                <p className="mb-1.5">
                  <strong>13.4.</strong> Caso o LOCATÁRIO não atenda todas as exigências deste item, fica integralmente responsável pelo pagamento do valor total do prejuízo, incluindo lucros cessantes.
                </p>
                <p>
                  <strong>13.5.</strong> O LOCATÁRIO responde ainda por eventual recusa do pagamento por parte da entidade de proteção veicular, responsabilizando-se civil e criminalmente pelos danos causados à LOCADORA e a terceiros.
                </p>
              </div>

              <div className="border-t border-slate-200 pt-3">
                <h4 className="font-bold text-slate-900 uppercase text-xs tracking-wider mb-2">
                  CLÁUSULA DÉCIMA QUARTA – DA RESCISÃO
                </h4>
                <p className="mb-1.5">
                  <strong>14.1.</strong> É assegurado às partes a rescisão do presente contrato a qualquer momento, desde que haja comunicação à outra parte com antecedência mínima de 30 (trinta) dias.
                </p>
                <p className="mb-1.5">
                  <strong>14.2.</strong> O descumprimento de qualquer das cláusulas por parte dos contratantes ensejará a rescisão deste instrumento com a imediata devolução do veículo e o devido pagamento de multa equivalente a dois salários mínimos vigentes em território nacional.
                </p>
                <p className="mb-1.5">
                  <strong>14.3.</strong> O LOCATÁRIO deverá devolver o veículo à LOCADORA nas mesmas condições em que estava quando o recebeu, respondendo pelos danos ou prejuízos causados.
                </p>
                <p>
                  <strong>14.4.</strong> Se a devolução do veículo ocorrer desacompanhada dos documentos de circulação e/ou das chaves, será cobrada do LOCATÁRIO, a título de multa, o valor equivalente a um salário mínimo vigente para cada uma das infrações, além do pagamento das despesas necessárias para obtenção de nova via dos documentos e/ou confecção de cópias das chaves.
                </p>
              </div>

              <div className="border-t border-slate-200 pt-3">
                <h4 className="font-bold text-slate-900 uppercase text-xs tracking-wider mb-2">
                  CLÁUSULA DÉCIMA QUINTA – DAS DISPOSIÇÕES GERAIS
                </h4>
                <p className="mb-1.5">
                  <strong>15.1.</strong> A LOCADORA não reconhece, exceto por autorização escrita, o LOCATÁRIO como seu preposto ou agente.
                </p>
                <p className="mb-1.5">
                  <strong>15.2.</strong> O presente contrato obriga, além dos contratantes, seus herdeiros e sucessores.
                </p>
                <p className="mb-1.5">
                  <strong>15.3.</strong> Na hipótese de a LOCADORA vir a ser acionada judicialmente por danos causados a terceiros pelo LOCATÁRIO, fica desde já assegurado à LOCADORA o direito de regresso contra o LOCATÁRIO pelos valores de sua eventual condenação.
                </p>
                <p className="mb-1.5">
                  <strong>15.4.</strong> O LOCATÁRIO concorda em aceitar qualquer pedido da LOCADORA, independentemente de sua forma processual, para seu ingresso em processo judicial contra ele promovido por terceiros, vítima em acidente causado pelo LOCATÁRIO na direção do veículo, comprometendo-se a reconhecer em juízo a limitação da responsabilidade da LOCADORA pelos danos contratualmente previstos.
                </p>
                <p>
                  <strong>15.5.</strong> A LOCADORA não responde, direta ou indiretamente, nem indeniza o LOCATÁRIO por quaisquer danos provenientes deste contrato, em especial por indenizações por danos materiais, morais e/ou pessoais causados ou sofridos pelo LOCATÁRIO e/ou seus passageiros ou terceiros, bens ou valores deixados no interior do veículo, atos ilícitos, lucros cessantes causados a terceiros e despesas de qualquer espécie.
                </p>
              </div>

              <div className="border-t border-slate-200 pt-3">
                <h4 className="font-bold text-slate-900 uppercase text-xs tracking-wider mb-2">
                  CLÁUSULA DÉCIMA SEXTA – DO FORO
                </h4>
                <p className="mb-1.5">
                  <strong>16.1.</strong> Para dirimir quaisquer controvérsias oriundas do presente contrato, as partes elegem o foro da Comarca de Presidente Prudente/SP, com exclusão de qualquer outro, por mais privilegiado que seja.
                </p>
                <p>
                  <strong>16.2.</strong> Por fim, o presente contrato não gera vínculo empregatício entre as partes.
                </p>
              </div>
            </div>

            {/* Assinaturas */}
            <div className="pt-6 space-y-6 break-inside-avoid">
              <p className="text-justify text-[11px] text-slate-800">
                Por estarem assim justos e contratados, firmam o presente instrumento, juntamente com duas testemunhas, para que produza seus regulares e jurídicos efeitos.
              </p>

              <div className="text-right text-[11px] text-slate-700 font-medium">
                Presidente Prudente/SP, {dataAssinaturaFormatada}.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4">
                {/* LOCADORA */}
                <div className="text-center space-y-1">
                  <div className="border-t border-slate-900 w-full pt-2"></div>
                  <strong className="block text-slate-900 uppercase text-[11px]">
                    TROCA FÁCIL VEÍCULOS LTDA
                  </strong>
                  <span className="text-[10px] text-slate-600 block">
                    CNPJ 47.271.452/0001-71
                  </span>
                  <span className="text-[10px] text-slate-700 font-bold block uppercase">
                    LOCADORA
                  </span>
                </div>

                {/* LOCATÁRIO */}
                <div className="text-center space-y-1">
                  <div className="border-t border-slate-900 w-full pt-2"></div>
                  <strong className="block text-slate-900 uppercase text-[11px]">
                    {contrato.motoristaNome}
                  </strong>
                  <span className="text-[10px] text-slate-600 block">
                    CPF {contrato.motoristaCpf}
                  </span>
                  <span className="text-[10px] text-slate-700 font-bold block uppercase">
                    LOCATÁRIO
                  </span>
                </div>
              </div>

              {/* Testemunhas */}
              <div className="pt-4 space-y-3">
                <p className="text-[10px] text-slate-500 font-medium">Testemunhas:</p>
                <div className="grid grid-cols-2 gap-8 text-center text-[10px] text-slate-600">
                  <div>
                    <div className="border-t border-slate-400 w-4/5 mx-auto pt-1"></div>
                    <span className="block font-medium">1. ______________________________________</span>
                    <span>CPF:</span>
                  </div>
                  <div>
                    <div className="border-t border-slate-400 w-4/5 mx-auto pt-1"></div>
                    <span className="block font-medium">2. ______________________________________</span>
                    <span>CPF:</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

