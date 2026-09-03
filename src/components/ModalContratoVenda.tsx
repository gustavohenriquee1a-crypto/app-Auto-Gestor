import React, { useRef, useState, useEffect } from 'react';
import { 
  X, 
  Printer, 
  FileText, 
  Car, 
  ShieldCheck, 
  Calendar, 
  Building2, 
  User, 
  DollarSign, 
  CheckCircle2,
  Download,
  Loader2,
  Edit3,
  Check,
  RefreshCw,
  PlusCircle,
  FileSpreadsheet
} from 'lucide-react';
import { Veiculo, VendaVeiculo, Usuario } from '../types';
import { formatCurrency, formatDate, formatKm } from '../utils/formatters';
import { imprimirElemento, baixarElementoComoPdf } from '../utils/printPdfUtils';
import { subscribeConfiguracoesLoja, getConfiguracaoLojaFirestore } from '../services/firestoreService';

interface ModalContratoVendaProps {
  isOpen: boolean;
  onClose: () => void;
  veiculo: Veiculo | null;
  vendaData?: Partial<VendaVeiculo> | null;
  currentUser?: Usuario | null;
}

export const ModalContratoVenda: React.FC<ModalContratoVendaProps> = ({
  isOpen,
  onClose,
  veiculo,
  vendaData,
  currentUser,
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isEditingDadosExtras, setIsEditingDadosExtras] = useState(false);

  // Logo Oficial Global Fixa no Contrato (Definida pelo Admin no Firestore documento 'geral')
  const [contractLogo, setContractLogo] = useState<string>('');

  useEffect(() => {
    // Busca inicial imediata no Firestore (coleção 'configuracoes_loja', documento 'geral')
    getConfiguracaoLojaFirestore().then((cfg) => {
      if (cfg?.logoUrl) {
        setContractLogo(cfg.logoUrl);
      }
    });

    // Escuta em tempo real atualizações feitas pelo Admin
    const unsub = subscribeConfiguracoesLoja((config) => {
      if (config && config.logoUrl !== undefined) {
        setContractLogo(config.logoUrl || '');
      }
    });
    return () => unsub();
  }, []);

  if (!isOpen || !veiculo) return null;

  const dataAtualFormatada = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  // 1. Dados da Loja Fixos
  const DADOS_LOJA = {
    razaoSocial: 'TROCA FÁCIL COMÉRCIO DE VEÍCULOS LTDA',
    cnpj: '47.271.452/0001-71',
    endereco: 'RUA NICOLAU CACCIATORI, 477, JD DOS PIONEIROS, CEP: 19.050-340, PRESIDENTE PRUDENTE-SP',
    cidadeUf: 'Presidente Prudente - SP',
  };

  // 2. Lógica de Titularidade (Se houver Financiamento em Terceiro, o terceiro substitui o comprador como único titular)
  const isTerceiroFinanciado = Boolean(
    vendaData?.financiamentoTerceiro?.ativo && vendaData?.financiamentoTerceiro?.nomeTerceiro
  );

  const titularNome = isTerceiroFinanciado
    ? (vendaData!.financiamentoTerceiro!.nomeTerceiro)
    : (vendaData?.compradorNome || 'CLIENTE NÃO INFORMADO');

  const titularCpf = isTerceiroFinanciado
    ? (vendaData!.financiamentoTerceiro!.cpfTerceiro || '000.000.000-00')
    : (vendaData?.compradorCpf || '000.000.000-00');

  const titularRg = isTerceiroFinanciado
    ? (vendaData!.financiamentoTerceiro!.rgTerceiro || '00.000.000-0 SSP/SP')
    : (vendaData?.compradorRg || '00.000.000-0 SSP/SP');

  const titularEmail = isTerceiroFinanciado
    ? (vendaData!.financiamentoTerceiro!.emailTerceiro || 'cliente@email.com')
    : (vendaData?.compradorEmail || 'cliente@email.com');

  const titularTelefone = isTerceiroFinanciado
    ? (vendaData!.financiamentoTerceiro!.telefoneTerceiro || '(18) 99999-0000')
    : (vendaData?.compradorTelefone || '(18) 99999-0000');

  const titularEstadoCivil = isTerceiroFinanciado
    ? (vendaData!.financiamentoTerceiro!.estadoCivilTerceiro || 'Brasileiro(a), Solteiro(a)')
    : (vendaData?.compradorEstadoCivil || 'Brasileiro(a), Solteiro(a)');

  const titularProfissao = isTerceiroFinanciado
    ? (vendaData!.financiamentoTerceiro!.profissaoTerceiro || 'Autônomo(a) / Empresário(a)')
    : (vendaData?.compradorProfissao || 'Autônomo(a) / Empresário(a)');

  const titularEndereco = isTerceiroFinanciado
    ? (vendaData!.financiamentoTerceiro!.enderecoTerceiro || 'Presidente Prudente - SP')
    : (vendaData?.compradorEndereco || 'Presidente Prudente - SP');

  // Estados Editáveis da Qualificação do Comprador
  const [compradorNome, setCompradorNome] = useState(titularNome);
  const [compradorCpf, setCompradorCpf] = useState(titularCpf);
  const [compradorRg, setCompradorRg] = useState(titularRg);
  const [compradorEmail, setCompradorEmail] = useState(titularEmail);
  const [compradorTelefone, setCompradorTelefone] = useState(titularTelefone);
  const [compradorEstadoCivil, setCompradorEstadoCivil] = useState(titularEstadoCivil);
  const [compradorProfissao, setCompradorProfissao] = useState(titularProfissao);
  const [compradorEndereco, setCompradorEndereco] = useState(titularEndereco);
  const [cidadeContrato, setCidadeContrato] = useState('Presidente Prudente - SP');

  // 3. Propriedade Original do Veículo Vendido
  const [proprietarioOriginalNome, setProprietarioOriginalNome] = useState(
    veiculo.proprietarioAnterior?.nome || 
    (veiculo.tipoPropriedade === 'consignado' ? 'PROPRIETÁRIO CONSIGNANTE' : 'TROCA FÁCIL COMÉRCIO DE VEÍCULOS LTDA')
  );
  const [proprietarioOriginalDoc, setProprietarioOriginalDoc] = useState(
    veiculo.proprietarioAnterior?.documento || 
    (veiculo.tipoPropriedade === 'consignado' ? '000.000.000-00' : '47.271.452/0001-71')
  );

  // 4. Veículo Recebido na Troca (Cláusula / Tabela Adicional)
  const initialPossuiTroca = Boolean(
    vendaData?.veiculoTrocaDetalhes?.possuiTroca ||
    vendaData?.veiculoTrocaEntrada?.placa ||
    vendaData?.formaPagamento === 'Troca + Volta' ||
    vendaData?.composicaoPagamento?.some((p) => p.tipo === 'Veículo na Troca')
  );

  const [possuiTroca, setPossuiTroca] = useState(initialPossuiTroca);
  const [trocaMarca, setTrocaMarca] = useState(vendaData?.veiculoTrocaDetalhes?.marca || 'Não informado');
  const [trocaModelo, setTrocaModelo] = useState(
    vendaData?.veiculoTrocaDetalhes?.modelo || vendaData?.veiculoTrocaEntrada?.modelo || 'VEÍCULO USADO'
  );
  const [trocaAno, setTrocaAno] = useState(
    vendaData?.veiculoTrocaDetalhes?.ano || vendaData?.veiculoTrocaEntrada?.ano || new Date().getFullYear() - 5
  );
  const [trocaPlaca, setTrocaPlaca] = useState(
    vendaData?.veiculoTrocaDetalhes?.placa || vendaData?.veiculoTrocaEntrada?.placa || 'ABC-0000'
  );
  const [trocaRenavam, setTrocaRenavam] = useState(vendaData?.veiculoTrocaDetalhes?.renavam || '00000000000');
  const [trocaChassi, setTrocaChassi] = useState(vendaData?.veiculoTrocaDetalhes?.chassi || '9BWZZZ00000000000');
  const [trocaKm, setTrocaKm] = useState(vendaData?.veiculoTrocaDetalhes?.km || 0);
  const [trocaCor, setTrocaCor] = useState(vendaData?.veiculoTrocaDetalhes?.cor || 'Prata');
  const [trocaCombustivel, setTrocaCombustivel] = useState(vendaData?.veiculoTrocaDetalhes?.combustivel || 'Flex');
  const [trocaProprietarioAtual, setTrocaProprietarioAtual] = useState(
    vendaData?.veiculoTrocaDetalhes?.proprietarioAtual || compradorNome
  );
  const [trocaProprietarioDoc, setTrocaProprietarioDoc] = useState(
    vendaData?.veiculoTrocaDetalhes?.documentoProprietario || compradorCpf
  );
  const [trocaValorAvaliado, setTrocaValorAvaliado] = useState(
    vendaData?.veiculoTrocaDetalhes?.valorAvaliacaoCompra || vendaData?.veiculoTrocaEntrada?.valorAvaliado || 0
  );

  // 5. Pagamento & Condições
  const valorVenda = vendaData?.valorVenda || veiculo.valorVendaSugerido || veiculo.custoAquisicao * 1.2;
  const dataVenda = vendaData?.dataVenda ? formatDate(vendaData.dataVenda) : dataAtualFormatada;
  const formaPagamento = vendaData?.formaPagamento || 'À Vista PIX / Transferência';
  const numeroContrato = `CTR-${veiculo.placa.replace('-', '')}-${new Date().getFullYear()}`;

  // 6. Adendos / Observações Contratuais Extras
  const [observacoesExtras, setObservacoesExtras] = useState(
    vendaData?.observacoesVenda || vendaData?.observacoes || ''
  );

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      const target = printAreaRef.current || 'printable-contract';
      await imprimirElemento(target, {
        titulo: `Contrato-Venda-${veiculo.placa}-${compradorNome.replace(/\s+/g, '_')}`
      });
    } catch (err) {
      console.error('Erro ao imprimir contrato:', err);
    } finally {
      setIsPrinting(false);
    }
  };

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const nomeArquivo = `Contrato-Venda-${veiculo.placa}-${veiculo.modelo.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      const target = printAreaRef.current || 'printable-contract';
      await baixarElementoComoPdf(target, nomeArquivo);
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-5xl max-h-[94vh] flex flex-col bg-[#111116] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Fixed Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 bg-[#16171f] flex flex-wrap items-center justify-between gap-3 shrink-0 no-print">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <FileText size={22} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Contrato de Compra e Venda de Veículo (A4)</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                  {numeroContrato}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {veiculo.modelo} • Placa <span className="font-mono text-purple-300 font-bold">{veiculo.placa}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditingDadosExtras(!isEditingDadosExtras)}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border ${
                isEditingDadosExtras 
                  ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-950/40' 
                  : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
              }`}
              title="Personalizar dados do comprador, proprietário original, troca ou adendos"
            >
              <Edit3 size={14} />
              <span>{isEditingDadosExtras ? 'Ocultar Edição' : 'Editar Dados do Contrato'}</span>
            </button>

            <button
              type="button"
              disabled={isGeneratingPdf}
              onClick={handleDownloadPdf}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-950/40 transition cursor-pointer disabled:opacity-50"
            >
              {isGeneratingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              <span>{isGeneratingPdf ? 'Gerando PDF...' : 'Baixar PDF'}</span>
            </button>

            <button
              type="button"
              disabled={isPrinting}
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-purple-950/50 transition cursor-pointer disabled:opacity-50"
            >
              {isPrinting ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />}
              <span>{isPrinting ? 'Imprimindo...' : 'Imprimir'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 transition cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Quick Edit Bar */}
        {isEditingDadosExtras && (
          <div className="p-4 sm:p-5 bg-[#191a24] border-b border-purple-500/20 text-xs no-print max-h-[40vh] overflow-y-auto animate-fadeIn">
            <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
              <span className="font-bold text-purple-300 flex items-center gap-1.5">
                <Edit3 size={15} /> Personalização do Contrato em Tempo Real:
              </span>
              <button
                type="button"
                onClick={() => setIsEditingDadosExtras(false)}
                className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <Check size={13} className="text-emerald-400" /> Concluir edição
              </button>
            </div>

            {/* Seção 1: Qualificação Comprador */}
            <div className="mb-4">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-2">
                1. Qualificação do(a) Comprador(a) (Refletida no PDF)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5 font-medium">Nome Completo</label>
                  <input
                    type="text"
                    value={compradorNome}
                    onChange={(e) => setCompradorNome(e.target.value)}
                    className="w-full p-2 bg-black/40 border border-white/10 rounded-lg text-white text-xs outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5 font-medium">CPF / CNPJ</label>
                  <input
                    type="text"
                    value={compradorCpf}
                    onChange={(e) => setCompradorCpf(e.target.value)}
                    className="w-full p-2 bg-black/40 border border-white/10 rounded-lg text-white font-mono text-xs outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5 font-medium">RG / Órgão Emissor</label>
                  <input
                    type="text"
                    value={compradorRg}
                    onChange={(e) => setCompradorRg(e.target.value)}
                    className="w-full p-2 bg-black/40 border border-white/10 rounded-lg text-white text-xs outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5 font-medium">E-mail</label>
                  <input
                    type="email"
                    value={compradorEmail}
                    onChange={(e) => setCompradorEmail(e.target.value)}
                    placeholder="email@cliente.com"
                    className="w-full p-2 bg-black/40 border border-white/10 rounded-lg text-white text-xs outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5 font-medium">Celular / WhatsApp</label>
                  <input
                    type="text"
                    value={compradorTelefone}
                    onChange={(e) => setCompradorTelefone(e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="w-full p-2 bg-black/40 border border-white/10 rounded-lg text-white font-mono text-xs outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5 font-medium">Nacionalidade / Estado Civil</label>
                  <input
                    type="text"
                    value={compradorEstadoCivil}
                    onChange={(e) => setCompradorEstadoCivil(e.target.value)}
                    className="w-full p-2 bg-black/40 border border-white/10 rounded-lg text-white text-xs outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5 font-medium">Profissão</label>
                  <input
                    type="text"
                    value={compradorProfissao}
                    onChange={(e) => setCompradorProfissao(e.target.value)}
                    className="w-full p-2 bg-black/40 border border-white/10 rounded-lg text-white text-xs outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5 font-medium">Endereço Residencial Completo</label>
                  <input
                    type="text"
                    value={compradorEndereco}
                    onChange={(e) => setCompradorEndereco(e.target.value)}
                    className="w-full p-2 bg-black/40 border border-white/10 rounded-lg text-white text-xs outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            </div>

            {/* Seção 2: Propriedade Original do Carro Vendido */}
            <div className="mb-4 pt-3 border-t border-white/10">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-2">
                2. Propriedade Original do Veículo Vendido (Carro Consignado ou Próprio)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5 font-medium">Em Nome de (Proprietário no Documento)</label>
                  <input
                    type="text"
                    value={proprietarioOriginalNome}
                    onChange={(e) => setProprietarioOriginalNome(e.target.value)}
                    placeholder="Nome do Proprietário Anterior / Consignante"
                    className="w-full p-2 bg-black/40 border border-white/10 rounded-lg text-white text-xs outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5 font-medium">CPF / CNPJ do Proprietário no Documento</label>
                  <input
                    type="text"
                    value={proprietarioOriginalDoc}
                    onChange={(e) => setProprietarioOriginalDoc(e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full p-2 bg-black/40 border border-white/10 rounded-lg text-white font-mono text-xs outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5 font-medium">Cidade / Foro do Contrato</label>
                  <input
                    type="text"
                    value={cidadeContrato}
                    onChange={(e) => setCidadeContrato(e.target.value)}
                    className="w-full p-2 bg-black/40 border border-white/10 rounded-lg text-white text-xs outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            </div>

            {/* Seção 3: Veículo na Troca */}
            <div className="mb-4 pt-3 border-t border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                  3. Veículo Recebido na Troca (Segunda Tabela no Contrato)
                </span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={possuiTroca}
                    onChange={(e) => setPossuiTroca(e.target.checked)}
                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-black/40 border-white/10"
                  />
                  <span className="text-xs text-purple-300 font-bold">Incluir Veículo de Troca no Contrato</span>
                </label>
              </div>

              {possuiTroca && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 p-3 rounded-xl bg-black/30 border border-purple-500/20 animate-fadeIn">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Marca / Modelo Troca</label>
                    <input
                      type="text"
                      value={trocaModelo}
                      onChange={(e) => setTrocaModelo(e.target.value)}
                      placeholder="Ex: Fiat Uno Way"
                      className="w-full p-2 bg-black/40 border border-white/10 rounded-lg text-white text-xs outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Ano Fab / Mod</label>
                    <input
                      type="text"
                      value={trocaAno}
                      onChange={(e) => setTrocaAno(e.target.value as any)}
                      placeholder="Ex: 2018/2019"
                      className="w-full p-2 bg-black/40 border border-white/10 rounded-lg text-white text-xs outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Placa</label>
                    <input
                      type="text"
                      value={trocaPlaca}
                      onChange={(e) => setTrocaPlaca(e.target.value.toUpperCase())}
                      placeholder="ABC-1234"
                      className="w-full p-2 bg-black/40 border border-white/10 rounded-lg text-white font-mono text-xs outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Renavam</label>
                    <input
                      type="text"
                      value={trocaRenavam}
                      onChange={(e) => setTrocaRenavam(e.target.value)}
                      placeholder="00000000000"
                      className="w-full p-2 bg-black/40 border border-white/10 rounded-lg text-white font-mono text-xs outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Chassi</label>
                    <input
                      type="text"
                      value={trocaChassi}
                      onChange={(e) => setTrocaChassi(e.target.value.toUpperCase())}
                      placeholder="Chassi"
                      className="w-full p-2 bg-black/40 border border-white/10 rounded-lg text-white font-mono text-xs outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">KM / Cor / Combustível</label>
                    <input
                      type="text"
                      value={`${trocaKm} km • ${trocaCor} • ${trocaCombustivel}`}
                      onChange={(e) => {
                        const parts = e.target.value.split('•');
                        if (parts[0]) setTrocaKm(Number(parts[0].replace(/[^0-9]/g, '')) || 0);
                        if (parts[1]) setTrocaCor(parts[1].trim());
                        if (parts[2]) setTrocaCombustivel(parts[2].trim());
                      }}
                      className="w-full p-2 bg-black/40 border border-white/10 rounded-lg text-white text-xs outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Proprietário no Documento (Troca)</label>
                    <input
                      type="text"
                      value={trocaProprietarioAtual}
                      onChange={(e) => setTrocaProprietarioAtual(e.target.value)}
                      placeholder="Nome do titular no DUT"
                      className="w-full p-2 bg-black/40 border border-white/10 rounded-lg text-white text-xs outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Valor Avaliado de Entrada (R$)</label>
                    <input
                      type="number"
                      value={trocaValorAvaliado}
                      onChange={(e) => setTrocaValorAvaliado(Number(e.target.value))}
                      placeholder="0.00"
                      className="w-full p-2 bg-black/40 border border-white/10 rounded-lg text-emerald-400 font-bold text-xs outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Seção 4: Adendos / Observações Contratuais Extras */}
            <div className="pt-3 border-t border-white/10">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                4. Observações Contratuais Extras (Parágrafo Único da Cláusula Terceira/Quarta)
              </label>
              <textarea
                rows={2}
                value={observacoesExtras}
                onChange={(e) => setObservacoesExtras(e.target.value)}
                placeholder="Ex: Multas e débitos anteriores à data desta tradição serão quitados pela Vendedora; Comprador ciente de pequenos retoques de pintura conforme vistoria prévia; Entrega prevista para DD/MM/AAAA com laudo aprovado."
                className="w-full p-2.5 bg-black/40 border border-white/10 rounded-lg text-white text-xs outline-none focus:border-purple-500"
              />
            </div>
          </div>
        )}

        {/* Scrollable Document Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#0a0a0d] flex justify-center">
          <div 
            id="printable-contract"
            ref={printAreaRef}
            className="w-full max-w-[820px] bg-white text-slate-900 rounded-xl shadow-2xl p-6 sm:p-10 text-[13px] leading-relaxed border border-slate-200 font-sans"
            style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
          >
            {/* Header Documento */}
            <div className="border-b-2 border-slate-900 pb-4 mb-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                {contractLogo ? (
                  <img
                    src={contractLogo}
                    alt="Logo da Loja"
                    className="w-14 h-14 object-contain rounded-lg border border-slate-200 p-0.5 shrink-0 bg-white"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-xl shrink-0">
                    TF
                  </div>
                )}
                <div>
                  <h1 className="text-xl font-black tracking-tight text-slate-950 uppercase">
                    {DADOS_LOJA.razaoSocial}
                  </h1>
                  <p className="text-[10.5px] text-slate-600 font-mono">
                    CNPJ: {DADOS_LOJA.cnpj} • {DADOS_LOJA.endereco}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="inline-block px-3 py-1 bg-slate-100 border border-slate-300 rounded font-mono text-[11px] font-bold text-slate-800">
                  {numeroContrato}
                </span>
                <p className="text-[11px] text-slate-500 mt-1">Data: {dataVenda}</p>
              </div>
            </div>

            <div className="text-center my-3.5">
              <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 bg-slate-100 py-1.5 rounded border border-slate-300">
                INSTRUMENTO PARTICULAR DE COMPRA E VENDA DE VEÍCULO AUTOMOTOR
              </h2>
            </div>

            {/* Partes */}
            <div className="space-y-3.5 my-4">
              {/* 1. Vendedora */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <h3 className="text-xs font-bold uppercase text-slate-900 border-b border-slate-200 pb-1 mb-1.5">
                  1. VENDEDORA (ESTABELECIMENTO COMERCIAL)
                </h3>
                <p className="text-slate-700 leading-relaxed text-[12px]">
                  <strong>Razão Social:</strong> {DADOS_LOJA.razaoSocial}, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº <strong>{DADOS_LOJA.cnpj}</strong>, com sede e showroom comercial situado na {DADOS_LOJA.endereco}.
                </p>
              </div>

              {/* 2. Comprador */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <h3 className="text-xs font-bold uppercase text-slate-900 border-b border-slate-200 pb-1 mb-1.5">
                  2. COMPRADOR(A) / ADQUIRENTE
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-[12px] text-slate-700">
                  <p><strong>Nome Completo:</strong> {compradorNome}</p>
                  <p><strong>CPF / CNPJ:</strong> <span className="font-mono">{compradorCpf}</span></p>
                  <p><strong>RG / Órgão Emissor:</strong> {compradorRg}</p>
                  <p><strong>Celular / WhatsApp:</strong> <span className="font-mono">{compradorTelefone}</span></p>
                  <p><strong>E-mail:</strong> {compradorEmail}</p>
                  <p><strong>Qualificação:</strong> {compradorEstadoCivil}</p>
                  <p><strong>Profissão:</strong> {compradorProfissao}</p>
                  <p><strong>Endereço Residencial:</strong> {compradorEndereco}</p>
                </div>
              </div>

              {/* 3. Veículo Principal Objeto da Venda */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <h3 className="text-xs font-bold uppercase text-slate-900 border-b border-slate-200 pb-1 mb-1.5 flex items-center justify-between">
                  <span>3. VEÍCULO OBJETO DA COMPRA E VENDA</span>
                  <span className="text-[10px] text-slate-500 font-normal">
                    {veiculo.tipoPropriedade === 'consignado' ? 'Regime de Consignação' : 'Frota Própria'}
                  </span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1 text-[12px] text-slate-700">
                  <p><strong>Marca / Modelo:</strong> {veiculo.marca} {veiculo.modelo}</p>
                  <p><strong>Placa:</strong> <span className="font-mono font-bold text-slate-950">{veiculo.placa}</span></p>
                  <p><strong>Chassi:</strong> <span className="font-mono text-[11px]">{veiculo.chassi}</span></p>
                  <p><strong>Ano Fab/Mod:</strong> {veiculo.anoFabricacao || veiculo.ano}/{veiculo.anoModelo || veiculo.ano}</p>
                  <p><strong>Renavam:</strong> <span className="font-mono">{veiculo.renavam || 'Constante no Doc.'}</span></p>
                  <p><strong>Cor:</strong> {veiculo.cor}</p>
                  <p><strong>Combustível:</strong> {veiculo.combustivel}</p>
                  <p><strong>KM Registrado:</strong> {formatKm(veiculo.kmAtual)}</p>
                  <p><strong>Câmbio / Motor:</strong> {veiculo.cambio || 'Manual'} ({veiculo.motorizacao || '1.0'})</p>
                </div>
                {/* Propriedade Original */}
                <div className="mt-2 pt-1.5 border-t border-slate-200 text-[11.5px] text-slate-800 bg-white/60 p-1.5 rounded">
                  <strong>EM NOME DE:</strong> {proprietarioOriginalNome} — <strong>CPF/CNPJ:</strong> <span className="font-mono">{proprietarioOriginalDoc}</span>
                </div>
              </div>

              {/* 3.1. Tabela Adicional: Veículo Dado na Troca (Se Houver) */}
              {possuiTroca && (
                <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-300">
                  <h3 className="text-xs font-bold uppercase text-amber-950 border-b border-amber-200 pb-1 mb-1.5 flex items-center justify-between">
                    <span>3.1. VEÍCULO RECEBIDO COMO PARTE DO PAGAMENTO (TROCA)</span>
                    <span className="text-[11px] font-mono text-emerald-800 font-bold bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                      Avaliado em: {formatCurrency(trocaValorAvaliado)}
                    </span>
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1 text-[12px] text-slate-800">
                    <p><strong>Marca / Modelo:</strong> {trocaModelo}</p>
                    <p><strong>Placa:</strong> <span className="font-mono font-bold text-slate-950">{trocaPlaca}</span></p>
                    <p><strong>Chassi:</strong> <span className="font-mono text-[11px]">{trocaChassi}</span></p>
                    <p><strong>Ano Fab/Mod:</strong> {trocaAno}</p>
                    <p><strong>Renavam:</strong> <span className="font-mono">{trocaRenavam}</span></p>
                    <p><strong>Cor:</strong> {trocaCor}</p>
                    <p><strong>Combustível:</strong> {trocaCombustivel}</p>
                    <p><strong>KM Registrado:</strong> {formatKm(Number(trocaKm) || 0)}</p>
                    <p><strong>Destinação:</strong> Entrada na Troca</p>
                  </div>
                  {/* Propriedade Atual da Troca */}
                  <div className="mt-2 pt-1.5 border-t border-amber-200 text-[11.5px] text-amber-950 bg-white/70 p-1.5 rounded">
                    <strong>EM NOME DE:</strong> {trocaProprietarioAtual} — <strong>CPF/CNPJ:</strong> <span className="font-mono">{trocaProprietarioDoc}</span>
                  </div>
                </div>
              )}

              {/* 4. Preço Ajustado e Condições de Pagamento */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <h3 className="text-xs font-bold uppercase text-slate-900 border-b border-slate-200 pb-1 mb-1.5">
                  4. PREÇO AJUSTADO E CONDIÇÕES DE PAGAMENTO
                </h3>
                <p className="text-slate-900 font-bold mb-2 text-[12.5px]">
                  O valor total e irreajustável da presente transação é de <strong>{formatCurrency(valorVenda)}</strong>, discriminado e quitado sob a seguinte composição:
                </p>

                {/* Discriminação Quebrada em Linhas */}
                <div className="space-y-1.5 text-[12px] text-slate-800 bg-white p-2.5 rounded border border-slate-200">
                  {/* Se houver parcelas híbridas detalhadas */}
                  {vendaData?.composicaoPagamento && vendaData.composicaoPagamento.length > 0 ? (
                    <div className="space-y-1">
                      {vendaData.composicaoPagamento.map((p, idx) => {
                        // 1. Veículo na Troca: NÃO EXIBA nenhuma instituição financeira. Exiba apenas: Veículo na Troca: [Placa/Modelo] - R$ [Valor]
                        if (p.tipo === 'Veículo na Troca' || p.tipo === 'Troca') {
                          const infoTroca = [p.trocaPlaca || trocaPlaca, trocaModelo].filter(Boolean).join(' / ') || 'Veículo Entregue na Troca';
                          return (
                            <div key={p.id || idx} className="flex items-center justify-between border-b border-slate-100 pb-0.5 last:border-0">
                              <span>
                                • <strong>Veículo na Troca:</strong> {infoTroca}
                              </span>
                              <span className="font-mono font-bold text-slate-900">{formatCurrency(p.valorBruto)}</span>
                            </div>
                          );
                        }

                        // 2. Financiamento: Busque a variável do banco selecionado no bloco '3. Detalhamento do Financiamento Bancário' (ex: BV, Santander, Pan) e exiba o nome dele
                        if (p.tipo === 'Financiamento') {
                          const bancoFinanciamento = vendaData?.financiamentoDetalhes?.bancoParceiro || p.bancoDestino || 'Banco Parceiro';
                          return (
                            <div key={p.id || idx} className="flex items-center justify-between border-b border-slate-100 pb-0.5 last:border-0">
                              <span>
                                • <strong>Financiamento Bancário:</strong> ({bancoFinanciamento})
                              </span>
                              <span className="font-mono font-bold text-slate-900">{formatCurrency(p.valorBruto)}</span>
                            </div>
                          );
                        }

                        // 3. PIX ou TED: Exiba a instituição bancária selecionada na lista de contas da loja (Bancos & Giro)
                        if (p.tipo === 'PIX' || p.tipo === 'TED/Transferência' || p.tipo === 'TED' || p.tipo === 'Transferência') {
                          const contaLoja = p.bancoDestino || 'Conta Bancária da Loja';
                          return (
                            <div key={p.id || idx} className="flex items-center justify-between border-b border-slate-100 pb-0.5 last:border-0">
                              <span>
                                • <strong>{p.tipo}:</strong> ({contaLoja})
                              </span>
                              <span className="font-mono font-bold text-slate-900">{formatCurrency(p.valorBruto)}</span>
                            </div>
                          );
                        }

                        // Outras fontes (Cartão de Crédito, Dinheiro Espécie, etc.)
                        return (
                          <div key={p.id || idx} className="flex items-center justify-between border-b border-slate-100 pb-0.5 last:border-0">
                            <span>
                              • <strong>{p.tipo}:</strong> {p.detalhes ? `(${p.detalhes})` : ''}
                            </span>
                            <span className="font-mono font-bold text-slate-900">{formatCurrency(p.valorBruto)}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Discriminação estruturada automática */
                    <div className="space-y-1">
                      {/* Caso 1: Pagamento via PIX / Transferência / Entrada */}
                      {vendaData?.financiamentoDetalhes && vendaData.financiamentoDetalhes.valorEntrada > 0 && (
                        <div className="flex items-center justify-between border-b border-slate-100 pb-0.5">
                          <span>
                            • <strong>Entrada via PIX / Transferência Bancária:</strong> ({vendaData.financiamentoDetalhes.contaDestinoEntrada || vendaData.contaBancariaDestinoNome || 'Conta Bancária da Loja'})
                          </span>
                          <span className="font-mono font-bold text-slate-900">{formatCurrency(vendaData.financiamentoDetalhes.valorEntrada)}</span>
                        </div>
                      )}

                      {/* Caso 2: Financiamento Bancário */}
                      {vendaData?.financiamentoDetalhes && vendaData.financiamentoDetalhes.valorFinanciado > 0 && (
                        <div className="flex items-center justify-between border-b border-slate-100 pb-0.5">
                          <span>
                            • <strong>Financiamento Bancário:</strong> ({vendaData.financiamentoDetalhes.bancoParceiro})
                          </span>
                          <span className="font-mono font-bold text-slate-900">{formatCurrency(vendaData.financiamentoDetalhes.valorFinanciado)}</span>
                        </div>
                      )}

                      {/* Caso 3: Veículo na Troca */}
                      {possuiTroca && trocaValorAvaliado > 0 && (
                        <div className="flex items-center justify-between border-b border-slate-100 pb-0.5">
                          <span>
                            • <strong>Veículo na Troca:</strong> {trocaPlaca} / {trocaModelo}
                          </span>
                          <span className="font-mono font-bold text-slate-900">{formatCurrency(trocaValorAvaliado)}</span>
                        </div>
                      )}

                      {/* Caso 4: Pagamento Simples À Vista */}
                      {(!vendaData?.financiamentoDetalhes || vendaData.financiamentoDetalhes.valorFinanciado === 0) && (!possuiTroca || trocaValorAvaliado === 0) && (
                        <div className="flex items-center justify-between">
                          <span>
                            • <strong>Modalidade de Quitação:</strong> {formaPagamento}
                            {vendaData?.contaBancariaDestinoNome && (formaPagamento.includes('PIX') || formaPagamento.includes('Dinheiro') || formaPagamento.includes('TED') || formaPagamento.includes('Transferência')) ? ` (${vendaData.contaBancariaDestinoNome})` : ''}
                          </span>
                          <span className="font-mono font-bold text-slate-900">{formatCurrency(valorVenda)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {vendaData?.previsaoEntregaVeiculo && (
                    <div className="pt-1.5 border-t border-slate-200 text-[11px] text-slate-600">
                      <strong>Previsão de Entrega / Retirada do Showroom:</strong> {formatDate(vendaData.previsaoEntregaVeiculo)}
                    </div>
                  )}
                </div>

                {/* Parágrafo Único: Observações e Adendos Contratuais Extras */}
                {observacoesExtras && (
                  <div className="mt-2.5 p-2 bg-purple-50/70 rounded border border-purple-200 text-[11.5px] text-purple-950 leading-relaxed text-justify">
                    <strong>PARÁGRAFO ÚNICO - OBSERVAÇÕES E ADENDOS COMPLEMENTARES:</strong> {observacoesExtras}
                  </div>
                )}
              </div>
            </div>

            {/* Cláusulas Contratuais e Blindagem Jurídica */}
            <div className="space-y-3 text-[11px] sm:text-[11.5px] text-slate-750 text-justify border-t border-slate-300 pt-3 leading-relaxed">
              <p>
                <strong>CLÁUSULA PRIMEIRA - DO ESTADO DO VEÍCULO E VISTORIA FACULTATIVA:</strong> O(A) COMPRADOR(A) declara para todos os fins de direito que vistoriou pessoalmente o veículo objeto deste contrato, inspecionou seu estado aparente de conservação, pintura, lataria, tapeçaria, vidros, pneus, parte elétrica e mecânica, realizando os testes de rodagem pertinentes e aceitando-o expressamente nas condições em que se encontra. 
                <br />
                <strong>Parágrafo Único:</strong> Declara o(a) COMPRADOR(A) que lhe foi expressamente franqueada e oferecida pela VENDEDORA a oportunidade prévia de submeter o veículo à avaliação e vistoria técnica por mecânico e profissional de sua livre escolha e confiança antes da celebração deste negócio. Caso tenha optado por não realizar referida vistoria especializada, o(a) COMPRADOR(A) assume integralmente tal decisão, isentando a VENDEDORA de quaisquer reclamações futuras atinentes ao estado de conservação aparente ou itens inspecionáveis.
              </p>

              <p>
                <strong>CLÁUSULA SEGUNDA - DA GARANTIA LEGAL, LIMITAÇÕES E REGRAS DE ATENDIMENTO:</strong> Em estrito cumprimento ao art. 26, inciso II, da Lei Federal nº 8.078/90 (Código de Defesa do Consumidor), a VENDEDORA concede garantia legal pelo prazo improrrogável de <strong>90 (noventa) dias ou 3.000 (três mil) quilômetros rodados</strong>, prevalecendo o que primeiro ocorrer, restrita e exclusivamente a vícios ocultos em componentes internos lubrificados de <strong>MOTOR E CÂMBIO</strong>.
                <br />
                <strong>Parágrafo Primeiro:</strong> Constatada qualquer anormalidade coberta, o veículo deverá ser obrigatoriamente apresentado e encaminhado para reparo em <strong>oficina credenciada indicada pela VENDEDORA</strong>, mediante prévia vistoria e orçamento formalmente aprovado por esta. Fica expressamente vedada a realização de reparos em oficinas terceiras sem autorização prévia, escrita e inequívoca da VENDEDORA, sob pena de perda imediata e irrevogável da garantia.
                <br />
                <strong>Parágrafo Segundo (Exclusão de Despesas Indiretas):</strong> A responsabilidade da VENDEDORA limita-se estritamente ao reparo ou substituição das peças defeituosas cobertas de motor e câmbio, restando a VENDEDORA <strong>totalmente isenta de responsabilidade</strong> sobre despesas acessórias, indiretas ou lucros cessantes de qualquer natureza, tais como reboque/guincho, passagens, táxi, hospedagem, transporte por aplicativo, aluguel de veículo reserva ou diárias de trabalho.
                <br />
                <strong>Parágrafo Terceiro (Itens de Desgaste Natural Excluídos):</strong> Estão expressamente excluídos da garantia legal todos os componentes sujeitos ao desgaste natural pelo tempo e uso, incluindo, mas não se limitando a: kit de embreagem, pastilhas e discos de freio, amortecedores, molas, buchas, pivôs, terminais e componentes de suspensão, correias dentadas e de acessórios, rolamentos externos, velas de ignição, fluidos, filtros, palhetas, bateria, lâmpadas, pneus, alinhamento e balanceamento.
              </p>

              <p>
                <strong>CLÁUSULA TERCEIRA - DA MULTA RESCISÓRIA E ARREPENDIMENTO:</strong> O presente contrato é celebrado em caráter irrevogável e irretratável. Em caso de desistência imotivada, inadimplemento ou rescisão contratual culposa por qualquer uma das partes antes da tradição ou formalização final, incidirá de pleno direito <strong>multa penal rescisória compensatória de 10% (dez por cento) sobre o valor total do contrato</strong>, além da retenção das despesas administrativas e operacionais comprovadamente suportadas pela parte inocente.
                <br />
                <strong>Parágrafo Único (Inaplicabilidade do Art. 49 do CDC):</strong> O(A) COMPRADOR(A) declara plena e expressa ciência de que, tendo a negociação, vistoria física e assinatura ocorrido em estabelecimento comercial físico (showroom da VENDEDORA), <strong>não se aplica o direito de arrependimento imotivado de 7 (sete) dias</strong> previsto no artigo 49 do Código de Defesa do Consumidor, cuja incidência é adstrita a compras realizadas fora do estabelecimento comercial (online/telefone).
              </p>

              <p>
                <strong>CLÁUSULA QUARTA - DA RESPONSABILIDADE CIVIL, CRIMINAL E EVICÇÃO:</strong> A partir da entrega efetiva das chaves e posse do veículo (tradição), o(a) COMPRADOR(A) assume integral e irrestrita responsabilidade civil, criminal, fiscal e de trânsito por quaisquer fatos, acidentes, danos a terceiros, multas, infrações, pedágios, pontuações na CNH ou atos ilícitos praticados na condução e posse do bem adquirido.
              </p>

              {possuiTroca && (
                <p>
                  <strong>CLÁUSULA QUINTA - DA BLINDAGEM, EVICÇÃO E VÍCIOS DO VEÍCULO DADO NA TROCA:</strong> O(A) COMPRADOR(A) declara e garante, sob as penas da lei, que o veículo oferecido na troca (descrito no item 3.1) é de procedência estritamente lícita, livre e desembaraçado de todo e qualquer ônus real, gravame, alienação fiduciária, débitos fiscais, tributários ou multas geradas até a data da tradição, bem como inexistência de sinistros com perda total ou leilão.
                  <br />
                  <strong>Parágrafo Primeiro (Evicção e Vícios Redibitórios):</strong> O(A) COMPRADOR(A) responde perante a VENDEDORA, na forma dos artigos 441 e 447 do Código Civil, pela <strong>evicção de direito e por eventuais vícios redibitórios</strong> ocultos ou fraudes preexistentes (incluindo adulteração de hodômetro, motor ou chassi) constatados no veículo dado na troca.
                  <br />
                  <strong>Parágrafo Segundo (Blindagem contra Ações Judiciais e Recusa):</strong> A VENDEDORA reserva-se o direito expresso de <strong>recusar o recebimento ou anular a aceitação do veículo de troca</strong> caso venham a ser identificadas ações judiciais em curso (cíveis, trabalhistas, execuções fiscais, falimentares ou criminais) em face do proprietário do veículo ou do alienante que possam ensejar fraude à execução, constrição, bloqueio judicial via RENAJUD ou indisponibilidade de bens.
                </p>
              )}

              <p>
                <strong>CLÁUSULA SEXTA - DO CONDICIONAMENTO DA TRANSFERÊNCIA (DETRAN):</strong> A outorga definitiva de transferência de titularidade perante o DETRAN (assinatura de ATPV-e / DUT e comunicação de venda) fica <strong>expressamente condicionada à quitação total e integral do preço pactuado</strong>, à regular compensação de todos os cheques, TEDs/PIXs e títulos de crédito emitidos, bem como à efetiva aprovação e liquidação do contrato de financiamento bancário pela instituição financeira parceira.
                <br />
                <strong>Parágrafo Único:</strong> Uma vez adimplidas integralmente todas as condições financeiras e entregue o ATPV-e/DUT preenchido, o(a) COMPRADOR(A) obriga-se a concluir a transferência perante o DETRAN no prazo legal de 30 (trinta) dias corridos, sob pena de responder pelas sanções administrativas e custos de bloqueio por falta de transferência.
              </p>

              <p>
                <strong>CLÁUSULA SÉTIMA - DO FORO DE ELEIÇÃO:</strong> Para dirimir quaisquer litígios oriundos deste instrumento que não possam ser solucionados amigavelmente, as partes elegem o Foro da Comarca de <strong>{cidadeContrato}</strong>, com renúncia expressa a qualquer outro, por mais especial ou privilegiado que seja.
              </p>
            </div>

            {/* Assinaturas */}
            <div className="mt-8 pt-4 border-t-2 border-slate-300">
              <p className="text-right text-[11px] text-slate-500 mb-8">
                {cidadeContrato}, {dataVenda}.
              </p>

              <div className="grid grid-cols-2 gap-8 text-center">
                <div>
                  <div className="border-b border-slate-900 pb-1 mb-1 h-12 flex items-end justify-center">
                    <span className="font-serif italic text-slate-400 text-xs">Assinatura Vendedora</span>
                  </div>
                  <p className="font-bold text-xs text-slate-900">{DADOS_LOJA.razaoSocial}</p>
                  <p className="text-[10.5px] font-mono text-slate-500">CNPJ: {DADOS_LOJA.cnpj}</p>
                </div>

                <div>
                  <div className="border-b border-slate-900 pb-1 mb-1 h-12 flex items-end justify-center">
                    <span className="font-serif italic text-slate-400 text-xs">Assinatura Comprador(a)</span>
                  </div>
                  <p className="font-bold text-xs text-slate-900">{compradorNome}</p>
                  <p className="text-[10.5px] font-mono text-slate-500">CPF/CNPJ: {compradorCpf}</p>
                </div>
              </div>

              <div className="mt-6 pt-3 border-t border-dashed border-slate-300 grid grid-cols-2 gap-8 text-center text-[10px] text-slate-500">
                <div>
                  <div className="border-b border-slate-300 pb-1 mb-1 h-7"></div>
                  <p>Testemunha 1 (Nome e CPF)</p>
                </div>
                <div>
                  <div className="border-b border-slate-300 pb-1 mb-1 h-7"></div>
                  <p>Testemunha 2 (Nome e CPF)</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-[#16171f] flex flex-wrap items-center justify-between gap-3 shrink-0 no-print">
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 size={15} className="text-emerald-400" />
            <span>Documento pronto para impressão em A4 e arquivamento digital em PDF.</span>
          </span>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-semibold transition cursor-pointer"
            >
              Fechar
            </button>
            <button
              type="button"
              disabled={isGeneratingPdf}
              onClick={handleDownloadPdf}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-950/40 transition cursor-pointer disabled:opacity-50"
            >
              {isGeneratingPdf ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
              <span>{isGeneratingPdf ? 'Gerando...' : 'Baixar PDF'}</span>
            </button>
            <button
              type="button"
              disabled={isPrinting}
              onClick={handlePrint}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-purple-950/50 transition cursor-pointer disabled:opacity-50"
            >
              {isPrinting ? <Loader2 size={15} className="animate-spin" /> : <Printer size={15} />}
              <span>{isPrinting ? 'Preparando...' : 'Imprimir Contrato'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
