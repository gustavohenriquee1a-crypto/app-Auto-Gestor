import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Award,
  DollarSign,
  Calendar,
  User,
  Car,
  CheckCircle2,
  Clock,
  Trash2,
  Printer,
  FileCheck,
  PhoneCall,
  Compass,
  Building2,
  Briefcase,
  AlertTriangle,
  Receipt,
  Layers,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  Tag,
  FolderOpen,
  ArrowRightLeft,
  Link,
  Unlink,
  Edit3,
  Calculator,
  Check
} from 'lucide-react';
import { VendaVeiculo, Usuario, Veiculo } from '../types';
import { formatCurrency, formatPercent } from '../utils/formatters';
import { ModalTransferirVenda } from './ModalTransferirVenda';

interface ModalDetalhesVendaComissaoProps {
  isOpen: boolean;
  onClose: () => void;
  venda: VendaVeiculo | null;
  veiculoAssociado?: Veiculo | null;
  usuarios?: Usuario[];
  currentUser: Usuario | null;
  onOpenDossie?: (veiculo: Veiculo) => void;
  onUpdateVenda?: (vendaAtualizada: VendaVeiculo) => Promise<void> | void;
  onDeleteVenda?: (vendaId: string) => Promise<void> | void;
}

export const ModalDetalhesVendaComissao: React.FC<ModalDetalhesVendaComissaoProps> = ({
  isOpen,
  onClose,
  venda,
  veiculoAssociado,
  usuarios = [],
  currentUser,
  onOpenDossie,
  onUpdateVenda,
  onDeleteVenda,
}) => {
  const isAdmin = currentUser?.role === 'admin';
  const isAdminOrGestor = currentUser?.role === 'admin' || currentUser?.role === 'gestor';
  const canViewGerencial = isAdmin || (currentUser?.role === 'gestor' && currentUser?.permissoes?.verComissoesGerenciais !== false) || currentUser?.permissoes?.verComissoesGerenciais === true;
  const canManageGerencial = isAdmin || (currentUser?.role === 'gestor' && currentUser?.permissoes?.gerenciarComissoesGerenciais !== false) || currentUser?.permissoes?.gerenciarComissoesGerenciais === true;

  // Buscar dados cadastrais completos do vendedor na lista de usuários do sistema
  const vendedorUser = useMemo(() => {
    if (!venda) return null;
    return (
      usuarios.find((u) => u.uid === venda.vendedorId) ||
      usuarios.find(
        (u) =>
          u.displayName &&
          venda.vendedorNome &&
          u.displayName.trim().toLowerCase() === venda.vendedorNome.trim().toLowerCase()
      ) ||
      usuarios.find(
        (u) =>
          u.email &&
          venda.vendedorEmail &&
          u.email.trim().toLowerCase() === venda.vendedorEmail.trim().toLowerCase()
      ) ||
      null
    );
  }, [usuarios, venda]);

  // State for Transfer Modal
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  // Form State for Commission Management
  const [comissaoStatus, setComissaoStatus] = useState<'Pendente' | 'Paga'>('Pendente');
  const [comissaoDataPagamento, setComissaoDataPagamento] = useState('');
  const [comissaoFormaPagamento, setComissaoFormaPagamento] = useState('PIX');
  const [comissaoReciboAssinado, setComissaoReciboAssinado] = useState(false);
  const [comissaoReciboDataAssinatura, setComissaoReciboDataAssinatura] = useState('');
  const [comissaoObservacoesAdmin, setComissaoObservacoesAdmin] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Estado para Comissão Administrativa / Overriding (Gestor / Admin)
  const [comissaoGerencialAtiva, setComissaoGerencialAtiva] = useState(false);
  const [comissaoGerencialTipo, setComissaoGerencialTipo] = useState<'porcentagem_venda' | 'porcentagem_lucro' | 'fixo' | 'manual'>('porcentagem_venda');
  const [comissaoGerencialTaxa, setComissaoGerencialTaxa] = useState<number>(1.0);
  const [comissaoGerencialValor, setComissaoGerencialValor] = useState<number>(0);
  const [comissaoGerencialStatus, setComissaoGerencialStatus] = useState<'Pendente' | 'Paga'>('Pendente');
  const [comissaoGerencialBeneficiarioId, setComissaoGerencialBeneficiarioId] = useState<string>('');
  const [comissaoGerencialBeneficiarioNome, setComissaoGerencialBeneficiarioNome] = useState<string>('');
  const [comissaoGerencialBeneficiarioEmail, setComissaoGerencialBeneficiarioEmail] = useState<string>('');
  const [comissaoGerencialDataPagamento, setComissaoGerencialDataPagamento] = useState<string>('');
  const [comissaoGerencialFormaPagamento, setComissaoGerencialFormaPagamento] = useState<string>('PIX');
  const [comissaoGerencialObservacoes, setComissaoGerencialObservacoes] = useState<string>('');
  const [isEditingGerencial, setIsEditingGerencial] = useState(false);

  useEffect(() => {
    if (venda) {
      setComissaoStatus(venda.comissaoStatus || 'Pendente');
      setComissaoDataPagamento(
        venda.comissaoDataPagamento || (venda.comissaoStatus === 'Paga' ? new Date().toISOString().split('T')[0] : '')
      );
      setComissaoFormaPagamento(venda.comissaoFormaPagamento || 'PIX');
      setComissaoReciboAssinado(!!venda.comissaoReciboAssinado);
      setComissaoReciboDataAssinatura(venda.comissaoReciboDataAssinatura || '');
      setComissaoObservacoesAdmin(venda.comissaoObservacoesAdmin || '');

      // Dados de Overriding Gerencial
      const hasGerencial = venda.comissaoGerencialAtiva === true && (venda.comissaoGerencialValor ?? 0) > 0;
      setComissaoGerencialAtiva(hasGerencial);
      setComissaoGerencialTipo((venda.comissaoGerencialTipo as any) || 'porcentagem_venda');
      setComissaoGerencialTaxa(venda.comissaoGerencialTaxa ?? 1.0);
      setComissaoGerencialValor(venda.comissaoGerencialValor ?? 0);
      setComissaoGerencialStatus(venda.comissaoGerencialStatus || 'Pendente');
      setComissaoGerencialBeneficiarioId(venda.comissaoGerencialBeneficiarioId || '');
      setComissaoGerencialBeneficiarioNome(venda.comissaoGerencialBeneficiarioNome || '');
      setComissaoGerencialBeneficiarioEmail(venda.comissaoGerencialBeneficiarioEmail || '');
      setComissaoGerencialDataPagamento(venda.comissaoGerencialDataPagamento || '');
      setComissaoGerencialFormaPagamento(venda.comissaoGerencialFormaPagamento || 'PIX');
      setComissaoGerencialObservacoes(venda.comissaoGerencialObservacoes || '');
      setIsEditingGerencial(false);

      setSaveSuccess(false);
    }
  }, [venda]);

  if (!isOpen || !venda) return null;

  const handleOpenDossieCompleto = () => {
    if (!onOpenDossie || !venda) return;
    const targetVeiculo: Veiculo = veiculoAssociado || {
      id: venda.veiculoId || venda.id,
      modelo: venda.modelo,
      marca: venda.marca || '',
      ano: venda.anoModelo || venda.ano || new Date().getFullYear(),
      anoFabricacao: venda.anoFabricacao,
      anoModelo: venda.anoModelo || venda.ano,
      placa: venda.placa,
      chassi: venda.chassi || '',
      cor: '',
      combustivel: 'Flex',
      kmAtual: venda.kmVenda || 0,
      custoAquisicao: venda.valorCompra || 0,
      valorVendaSugerido: venda.valorVenda,
      valorVendaEfetivo: venda.valorVenda,
      status: 'Vendido',
      status_estoque: 'Vendido',
      dataEntrada: venda.dataEntrada || venda.dataVenda,
      dataVenda: venda.dataVenda,
      venda: venda,
      despesas: [],
    };
    onOpenDossie(targetVeiculo);
  };

  const handleSalvarComissao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateVenda) return;

    setIsSaving(true);
    try {
      const vendaAtualizada: VendaVeiculo = {
        ...venda,
        comissaoStatus,
        comissaoDataPagamento: comissaoStatus === 'Paga' ? (comissaoDataPagamento || new Date().toISOString().split('T')[0]) : undefined,
        comissaoFormaPagamento: comissaoStatus === 'Paga' ? comissaoFormaPagamento : undefined,
        comissaoReciboAssinado: comissaoStatus === 'Paga' ? comissaoReciboAssinado : false,
        comissaoReciboDataAssinatura: comissaoStatus === 'Paga' && comissaoReciboAssinado ? (comissaoReciboDataAssinatura || new Date().toISOString().split('T')[0]) : undefined,
        comissaoObservacoesAdmin: comissaoObservacoesAdmin.trim() || undefined,

        // Preservar ou atualizar comissão gerencial administrativa (Overriding)
        comissaoGerencialAtiva: comissaoGerencialAtiva && Number(comissaoGerencialValor) > 0,
        comissaoGerencialTipo: comissaoGerencialAtiva ? comissaoGerencialTipo : 'nenhuma',
        comissaoGerencialTaxa: comissaoGerencialAtiva ? Number(comissaoGerencialTaxa) : 0,
        comissaoGerencialValor: comissaoGerencialAtiva ? Number(comissaoGerencialValor) : 0,
        comissaoGerencialStatus: comissaoGerencialAtiva ? comissaoGerencialStatus : undefined,
        comissaoGerencialBeneficiarioId: comissaoGerencialAtiva ? (comissaoGerencialBeneficiarioId || undefined) : undefined,
        comissaoGerencialBeneficiarioNome: comissaoGerencialAtiva ? (comissaoGerencialBeneficiarioNome || 'Diretoria / Gestor Geral') : undefined,
        comissaoGerencialBeneficiarioEmail: comissaoGerencialAtiva ? (comissaoGerencialBeneficiarioEmail || undefined) : undefined,
        comissaoGerencialDataPagamento: (comissaoGerencialAtiva && comissaoGerencialStatus === 'Paga') ? (comissaoGerencialDataPagamento || new Date().toISOString().split('T')[0]) : undefined,
        comissaoGerencialFormaPagamento: (comissaoGerencialAtiva && comissaoGerencialStatus === 'Paga') ? comissaoGerencialFormaPagamento : undefined,
        comissaoGerencialObservacoes: comissaoGerencialObservacoes.trim() || undefined,
      };

      await onUpdateVenda(vendaAtualizada);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Erro ao salvar detalhes da comissão:', err);
      alert('Ocorreu um erro ao salvar as alterações da comissão.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleVincularGerencial = async () => {
    if (!onUpdateVenda || !venda) return;
    const taxaPadrao = 1.0;
    const valorCalculado = Number(((venda.valorVenda * taxaPadrao) / 100).toFixed(2));
    const nomePadrao = currentUser?.displayName || currentUser?.email || 'Diretoria / Gestor Geral';

    setComissaoGerencialAtiva(true);
    setComissaoGerencialTipo('porcentagem_venda');
    setComissaoGerencialTaxa(taxaPadrao);
    setComissaoGerencialValor(valorCalculado);
    setComissaoGerencialStatus('Pendente');
    setComissaoGerencialBeneficiarioId(currentUser?.uid || '');
    setComissaoGerencialBeneficiarioNome(nomePadrao);
    setComissaoGerencialBeneficiarioEmail(currentUser?.email || '');
    setIsEditingGerencial(true);

    try {
      setIsSaving(true);
      const vendaAtualizada: VendaVeiculo = {
        ...venda,
        comissaoGerencialAtiva: true,
        comissaoGerencialTipo: 'porcentagem_venda',
        comissaoGerencialTaxa: taxaPadrao,
        comissaoGerencialValor: valorCalculado,
        comissaoGerencialStatus: 'Pendente',
        comissaoGerencialBeneficiarioId: currentUser?.uid || undefined,
        comissaoGerencialBeneficiarioNome: nomePadrao,
        comissaoGerencialBeneficiarioEmail: currentUser?.email || undefined,
      };
      await onUpdateVenda(vendaAtualizada);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Erro ao vincular comissão gerencial:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDesvincularGerencial = async () => {
    if (!onUpdateVenda || !venda) return;
    const confirm = window.confirm(
      'Tem certeza que deseja desvincular e remover a comissão administrativa (overriding) desta venda?'
    );
    if (!confirm) return;

    setComissaoGerencialAtiva(false);
    setComissaoGerencialValor(0);
    setIsEditingGerencial(false);

    try {
      setIsSaving(true);
      const vendaAtualizada: VendaVeiculo = {
        ...venda,
        comissaoGerencialAtiva: false,
        comissaoGerencialValor: 0,
        comissaoGerencialStatus: undefined,
      };
      await onUpdateVenda(vendaAtualizada);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Erro ao desvincular comissão gerencial:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRecalcularValorGerencial = (tipo: 'porcentagem_venda' | 'porcentagem_lucro' | 'fixo' | 'manual', taxa: number) => {
    setComissaoGerencialTipo(tipo);
    setComissaoGerencialTaxa(taxa);
    if (tipo === 'porcentagem_venda') {
      const val = (venda.valorVenda * taxa) / 100;
      setComissaoGerencialValor(Number(val.toFixed(2)));
    } else if (tipo === 'porcentagem_lucro') {
      const lucro = Math.max(0, venda.lucroLiquido || 0);
      const val = (lucro * taxa) / 100;
      setComissaoGerencialValor(Number(val.toFixed(2)));
    } else if (tipo === 'fixo') {
      setComissaoGerencialValor(taxa);
    }
  };

  const handleExcluirVenda = async () => {
    const confirmacao = window.confirm(
      `⚠️ ATENÇÃO: Deseja realmente excluir o registro de venda do veículo ${venda.modelo} (Placa: ${venda.placa})?\n\n` +
      `• Esta venda será removida do histórico.\n` +
      `• A comissão vinculada será cancelada.\n` +
      `• O veículo retornará ao status "Disponível" no estoque do pátio.\n\n` +
      `Deseja prosseguir com a exclusão?`
    );

    if (confirmacao && onDeleteVenda) {
      try {
        await onDeleteVenda(venda.id);
        onClose();
      } catch (err) {
        console.error('Erro ao excluir venda:', err);
        alert('Erro ao excluir registro de venda.');
      }
    }
  };

  const handleImprimirRecibo = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const dataHojeFormatada = new Date().toLocaleDateString('pt-BR');
    const valorComissaoFormatado = formatCurrency(venda.comissaoValor);
    const dataPagamentoFormatada = comissaoDataPagamento
      ? new Date(comissaoDataPagamento + 'T12:00:00').toLocaleDateString('pt-BR')
      : dataHojeFormatada;

    const vendedorNomeCompleto = vendedorUser?.displayName || venda.vendedorNome || 'Não especificado';
    const vendedorCpfCnpj = vendedorUser?.cpfCnpj || 'Não informado';
    const vendedorTelefone = vendedorUser?.telefone || 'Não informado';
    const vendedorEmail = vendedorUser?.email || venda.vendedorEmail || 'Não informado';
    const vendedorCargo = vendedorUser?.cargo || (vendedorUser?.role === 'admin' ? 'Administrador' : 'Vendedor');
    const vendedorPix = vendedorUser?.dadosBancarios?.chavePix 
      ? `${vendedorUser.dadosBancarios.chavePix} (${vendedorUser.dadosBancarios.tipoChavePix || 'PIX'}${vendedorUser.dadosBancarios.banco ? ` • Banco: ${vendedorUser.dadosBancarios.banco}` : ''})`
      : '';

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Recibo de Pagamento de Comissão - ${venda.placa}</title>
        <style>
          @page { size: A4; margin: 20mm; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #111;
            margin: 0;
            padding: 20px;
            font-size: 13px;
            line-height: 1.5;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #222;
            padding-bottom: 12px;
            margin-bottom: 20px;
          }
          .header h1 {
            margin: 0;
            font-size: 20px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .header p {
            margin: 3px 0 0 0;
            font-size: 12px;
            color: #555;
          }
          .badge-recibo {
            display: inline-block;
            background: #f0f0f0;
            border: 1px solid #ccc;
            padding: 4px 12px;
            font-weight: bold;
            font-size: 14px;
            margin-top: 8px;
            border-radius: 4px;
          }
          .section {
            margin-bottom: 16px;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 6px;
            background: #fafafa;
          }
          .section-title {
            font-weight: bold;
            font-size: 13px;
            text-transform: uppercase;
            color: #333;
            margin-bottom: 8px;
            border-bottom: 1px solid #eee;
            padding-bottom: 4px;
          }
          .row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 6px;
          }
          .label {
            color: #666;
            font-weight: 500;
          }
          .value {
            font-weight: bold;
            color: #111;
          }
          .highlight-box {
            background: #eef2ff;
            border: 1px solid #c7d2fe;
            padding: 12px;
            border-radius: 6px;
            text-align: center;
            margin: 16px 0;
          }
          .highlight-box .amount {
            font-size: 24px;
            font-weight: 900;
            color: #1e3a8a;
          }
          .declaracao {
            margin: 24px 0;
            padding: 12px;
            border-left: 3px solid #3b82f6;
            background: #f8fafc;
            font-size: 12px;
            color: #334155;
            line-height: 1.6;
          }
          .signatures {
            margin-top: 50px;
            display: flex;
            justify-content: space-between;
            gap: 40px;
          }
          .sig-box {
            flex: 1;
            text-align: center;
          }
          .sig-line {
            border-top: 1px solid #333;
            margin-bottom: 6px;
          }
          .sig-name {
            font-weight: bold;
            font-size: 12px;
          }
          .sig-role {
            font-size: 11px;
            color: #666;
          }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>AutoGestor Pro • Gestão Automotiva</h1>
          <p>Comprovante Oficial de Quitação e Pagamento de Comissão de Vendas</p>
          <div class="badge-recibo">RECIBO Nº ${venda.id.slice(-6).toUpperCase()}</div>
        </div>

        <div class="highlight-box">
          <div style="font-size: 12px; color: #4338ca; font-weight: bold; text-transform: uppercase;">Valor Líquido da Comissão</div>
          <div class="amount">${valorComissaoFormatado}</div>
          <div style="font-size: 11px; color: #6b7280; margin-top: 2px;">
            Forma de Pagamento: ${comissaoFormaPagamento || 'PIX'} • Data do Pagamento: ${dataPagamentoFormatada}
          </div>
        </div>

        <div class="section">
          <div class="section-title">Dados do Vendedor / Beneficiário</div>
          <div class="row">
            <span class="label">Nome Completo:</span>
            <span class="value"><strong>${vendedorNomeCompleto}</strong></span>
          </div>
          <div class="row">
            <span class="label">CPF ou CNPJ:</span>
            <span class="value"><strong>${vendedorCpfCnpj}</strong></span>
          </div>
          <div class="row">
            <span class="label">Telefone de Contato:</span>
            <span class="value">${vendedorTelefone}</span>
          </div>
          <div class="row">
            <span class="label">E-mail de Cadastro:</span>
            <span class="value">${vendedorEmail}</span>
          </div>
          <div class="row">
            <span class="label">Cargo / Função:</span>
            <span class="value">${vendedorCargo}</span>
          </div>
          ${vendedorPix ? `
          <div class="row">
            <span class="label">Chave PIX / Recebimento:</span>
            <span class="value">${vendedorPix}</span>
          </div>
          ` : ''}
        </div>

        <div class="section">
          <div class="section-title">Dados da Venda do Veículo</div>
          <div class="row">
            <span class="label">Veículo Comercializado:</span>
            <span class="value">${venda.modelo}</span>
          </div>
          <div class="row">
            <span class="label">Placa / Chassi:</span>
            <span class="value">${venda.placa} • ${venda.chassi || 'N/D'}</span>
          </div>
          <div class="row">
            <span class="label">Data da Venda:</span>
            <span class="value">${venda.dataVenda}</span>
          </div>
          <div class="row">
            <span class="label">Valor Total da Venda:</span>
            <span class="value">${formatCurrency(venda.valorVenda)}</span>
          </div>
          <div class="row">
            <span class="label">Comprador:</span>
            <span class="value">${venda.compradorNome} (CPF: ${venda.compradorCpf || 'Registrado'})</span>
          </div>
          <div class="row">
            <span class="label">Forma de Pagamento da Venda:</span>
            <span class="value">${venda.formaPagamento}</span>
          </div>
        </div>

        <div class="declaracao">
          <strong>DECLARAÇÃO DE QUITAÇÃO:</strong> Recebi da empresa a quantia acima discriminada de <strong>${valorComissaoFormatado}</strong>, correspondente à comissão integral sobre a intermediação de venda do veículo especificado neste documento, dando plena, geral e irrevogável quitação de qualquer valor ou verba a este título.
        </div>

        <div class="signatures">
          <div class="sig-box">
            <div class="sig-line"></div>
            <div class="sig-name">${vendedorNomeCompleto}</div>
            <div class="sig-role">CPF/CNPJ: ${vendedorCpfCnpj} • Vendedor / Beneficiário</div>
          </div>
          <div class="sig-box">
            <div class="sig-line"></div>
            <div class="sig-name">${currentUser?.displayName || 'Administração / Gerência'}</div>
            <div class="sig-role">AutoGestor Pro • Quitação de Comissão</div>
          </div>
        </div>

        <div style="text-align: center; margin-top: 30px; font-size: 10px; color: #999;">
          Emitido pelo sistema AutoGestor Pro em ${dataHojeFormatada} às ${new Date().toLocaleTimeString('pt-BR')}
        </div>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col bg-gray-900 rounded-2xl shadow-xl overflow-hidden border border-white/10">
        {/* Header do Modal */}
        <div className="p-5 bg-gradient-to-r from-[#16171f] to-[#111116] border-b border-white/10 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-purple-600/30">
              <Award size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-lg text-white">
                  Dossiê de Venda & Liquidação de Comissão
                </h3>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1 ${
                    comissaoStatus === 'Paga'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  }`}
                >
                  {comissaoStatus === 'Paga' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                  {comissaoStatus === 'Paga' ? 'Comissão Paga' : 'Comissão Pendente'}
                </span>
                {comissaoReciboAssinado && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                    <FileCheck size={12} /> Recibo Assinado
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {venda.modelo} • Placa: <span className="font-mono font-bold text-white">{venda.placa}</span> • Vendido em {venda.dataVenda}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {isAdmin && onOpenDossie && (
              <button
                type="button"
                onClick={handleOpenDossieCompleto}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-900/40 border border-blue-400/30 flex items-center gap-1.5 cursor-pointer transition active:scale-[0.98]"
                title="Abrir Dossiê Completo do Veículo (Histórico de Custos, Peças, Laudos e DRE do Chassi)"
              >
                <FolderOpen size={14} className="text-blue-200" />
                <span className="hidden sm:inline">Dossiê Completo do Veículo (Histórico & Custos)</span>
                <span className="sm:hidden">Dossiê Completo</span>
              </button>
            )}

            {isAdmin && (
              <button
                onClick={handleImprimirRecibo}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 font-semibold text-xs border border-white/10 flex items-center gap-1.5 cursor-pointer transition"
                title="Gerar e imprimir recibo oficial de comissão"
              >
                <Printer size={14} className="text-purple-400" />
                <span className="hidden sm:inline">Imprimir Recibo</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Corpo do Modal (Scrollável) */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-300 flex-1">
          {/* BANNER ADMINISTRATIVO DE DOSSIÊ DO VEÍCULO VENDIDO - SOMENTE ADMIN */}
          {isAdmin && (
            <div className="p-3.5 bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-purple-950/20 rounded-2xl border border-blue-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold shrink-0">
                  <FolderOpen size={18} />
                </div>
                <div>
                  <h5 className="font-bold text-white text-xs flex items-center gap-2">
                    <span>Dossiê Permanente do Chassi Preservado</span>
                    <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 text-[10px] font-mono font-semibold border border-purple-500/30">
                      {venda.placa} {venda.chassi ? `• ${venda.chassi}` : ''}
                    </span>
                  </h5>
                  <p className="text-[11px] text-slate-400">
                    O veículo foi baixado do estoque de showroom e catálogo, mas todo o histórico de notas fiscais, despesas de oficina, peças, vistorias e DRE permanece auditável no sistema.
                  </p>
                </div>
              </div>
              {onOpenDossie && (
                <button
                  type="button"
                  onClick={handleOpenDossieCompleto}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-950/40 flex items-center gap-1.5 shrink-0 cursor-pointer transition border border-blue-400/30"
                >
                  <FolderOpen size={14} />
                  <span>Dossiê Completo</span>
                </button>
              )}
            </div>
          )}

          {/* 1. SEÇÃO DE CARDS DE RESUMO FINANCEIRO DA TRANSAÇÃO (RBAC: Lucro Real e Custo Total exclusivos de ADMIN) */}
          <div className={`grid grid-cols-1 ${isAdmin ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-2'} gap-3`}>
            <div className="bg-[#16171f] p-3.5 rounded-2xl border border-white/5">
              <span className="text-[11px] text-slate-400 font-semibold uppercase">Valor da Venda</span>
              <p className="text-lg font-black text-white font-mono mt-0.5">
                {formatCurrency(venda.valorVenda)}
              </p>
              <span className="text-[10px] text-slate-500 font-mono">Faturamento Bruto</span>
            </div>

            {isAdmin && (
              <div className="bg-[#16171f] p-3.5 rounded-2xl border border-emerald-500/20">
                <span className="text-[11px] text-emerald-400 font-semibold uppercase">Lucro Líquido Real</span>
                <p className="text-lg font-black text-emerald-400 font-mono mt-0.5">
                  {formatCurrency(venda.lucroLiquido)}
                </p>
                <span className="text-[10px] text-emerald-500/80 font-mono">
                  Margem: {formatPercent(venda.margemLucroPercent || (venda.valorVenda > 0 ? (venda.lucroLiquido / venda.valorVenda) * 100 : 0))}
                </span>
              </div>
            )}

            <div className="bg-[#16171f] p-3.5 rounded-2xl border border-amber-500/20">
              <span className="text-[11px] text-amber-400 font-semibold uppercase">Comissão da Venda</span>
              <p className="text-lg font-black text-amber-400 font-mono mt-0.5">
                {formatCurrency(venda.comissaoValor)}
              </p>
              <span className="text-[10px] text-amber-500/80 flex items-center gap-1">
                <span>Beneficiário: {venda.vendedorNome || 'Vendedor'}</span>
                <span>• Status: {comissaoStatus}</span>
              </span>
            </div>

            {isAdmin && (
              <div className="bg-[#16171f] p-3.5 rounded-2xl border border-blue-500/20">
                <span className="text-[11px] text-blue-400 font-semibold uppercase">Custo Total Veículo</span>
                <p className="text-lg font-black text-blue-400 font-mono mt-0.5">
                  {formatCurrency(venda.custoTotal)}
                </p>
                <span className="text-[10px] text-slate-500">
                  Compra ({formatCurrency(venda.valorCompra)}) + Desp. ({formatCurrency(venda.totalDespesas)})
                </span>
              </div>
            )}
          </div>

          {/* 2. COMO FOI FECHADA / PECHADA A VENDA */}
          <div className="bg-[#16171f] p-5 rounded-2xl border border-white/5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                <Compass size={16} className="text-purple-400" />
                <span>Como foi Fechada a Negociação & Detalhes da Venda</span>
              </h4>
              <span className="text-[11px] text-slate-400 font-mono">
                {venda.diasEmPatio ? `${venda.diasEmPatio} dias no pátio até a venda` : ''}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Coluna 1: Comprador & Atração */}
              <div className="space-y-3 bg-[#111116] p-4 rounded-xl border border-white/5">
                <div className="flex items-center gap-2 font-bold text-white text-xs border-b border-white/5 pb-2">
                  <User size={14} className="text-blue-400" />
                  <span>Dados do Comprador & Atendimento</span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Nome do Comprador:</span>
                    <span className="font-bold text-white">{venda.compradorNome}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">CPF do Comprador:</span>
                    <span className="font-mono text-slate-200">{venda.compradorCpf || 'Não informado'}</span>
                  </div>
                  {venda.compradorProfissao && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Profissão:</span>
                      <span className="text-slate-200">{venda.compradorProfissao}</span>
                    </div>
                  )}
                  {venda.compradorDataNascimento && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Data de Nascimento:</span>
                      <span className="text-slate-200">{venda.compradorDataNascimento}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-400">Canal de Origem:</span>
                    <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 font-semibold text-[11px]">
                      {venda.canalOrigem || 'Loja / Showroom'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Tipo de Atendimento:</span>
                    <span className="text-slate-200">{venda.tipoAtendimento || 'Presencial'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Test-Drive Realizado:</span>
                    <span className={`font-semibold ${venda.realizouTestDrive ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {venda.realizouTestDrive ? '✓ Sim, test-drive aprovado' : 'Não realizou'}
                    </span>
                  </div>
                  {venda.observacoesTestDrive && (
                    <div className="text-[11px] text-slate-400 bg-black/30 p-2 rounded-lg">
                      <strong className="text-slate-300">Obs Test-Drive:</strong> {venda.observacoesTestDrive}
                    </div>
                  )}
                </div>
              </div>

              {/* Coluna 2: Forma de Pagamento, Financiamento & Troca */}
              <div className="space-y-3 bg-[#111116] p-4 rounded-xl border border-white/5">
                <div className="flex items-center gap-2 font-bold text-white text-xs border-b border-white/5 pb-2">
                  <DollarSign size={14} className="text-emerald-400" />
                  <span>Condição Comercial & Pagamento</span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Forma Principal:</span>
                    <span className="font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded text-[11px]">
                      {venda.formaPagamento}
                    </span>
                  </div>

                  {/* Financiamento */}
                  {venda.financiamentoDetalhes && (
                    <div className="p-2.5 rounded-lg bg-[#16171f] border border-white/5 space-y-1">
                      <div className="flex justify-between text-slate-300 font-semibold">
                        <span>Banco Financiador:</span>
                        <span className="text-white">{venda.financiamentoDetalhes.bancoParceiro}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Entrada Paga:</span>
                        <span className="font-mono text-emerald-300">{formatCurrency(venda.financiamentoDetalhes.valorEntrada)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Valor Financiado:</span>
                        <span className="font-mono text-blue-300">{formatCurrency(venda.financiamentoDetalhes.valorFinanciado)}</span>
                      </div>
                      {venda.financiamentoDetalhes.retornoComissaoBanco > 0 && (
                        <div className="flex justify-between text-amber-300 font-semibold">
                          <span>Retorno TAC Financeira:</span>
                          <span className="font-mono">+{formatCurrency(venda.financiamentoDetalhes.retornoComissaoBanco)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Financiamento Terceiro */}
                  {venda.financiamentoTerceiro?.ativo && (
                    <div className="p-2 rounded-lg bg-purple-950/20 border border-purple-500/20 text-[11px] space-y-0.5">
                      <span className="font-bold text-purple-300 block">Financiamento em Nome de Terceiro:</span>
                      <p className="text-slate-200">
                        {venda.financiamentoTerceiro.nomeTerceiro} (Parentesco: {venda.financiamentoTerceiro.grauParentesco})
                      </p>
                      <p className="text-slate-400 font-mono">CPF: {venda.financiamentoTerceiro.cpfTerceiro}</p>
                    </div>
                  )}

                  {/* Veículo na Troca */}
                  {(venda.veiculoTrocaDetalhes?.possuiTroca || venda.veiculoTrocaEntrada) && (
                    <div className="p-2.5 rounded-lg bg-[#16171f] border border-amber-500/20 space-y-1">
                      <span className="font-bold text-amber-400 block text-[11px]">Veículo Recebido na Troca:</span>
                      <div className="flex justify-between">
                        <span className="text-slate-300 font-medium">
                          {venda.veiculoTrocaDetalhes?.modelo || venda.veiculoTrocaEntrada?.modelo}
                        </span>
                        <span className="font-mono font-bold text-amber-300">
                          {formatCurrency(venda.veiculoTrocaDetalhes?.valorAvaliacaoCompra || venda.veiculoTrocaEntrada?.valorAvaliado || 0)}
                        </span>
                      </div>
                      {(venda.veiculoTrocaDetalhes?.placa || venda.veiculoTrocaEntrada?.placa) && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          Placa: {venda.veiculoTrocaDetalhes?.placa || venda.veiculoTrocaEntrada?.placa}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Composição Híbrida */}
                  {venda.composicaoPagamento && venda.composicaoPagamento.length > 0 && (
                    <div className="p-2.5 rounded-lg bg-[#16171f] border border-white/5 space-y-1">
                      <span className="font-bold text-slate-300 block text-[11px]">Composição de Pagamentos:</span>
                      {venda.composicaoPagamento.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-[11px]">
                          <span className="text-slate-400">{item.forma}:</span>
                          <span className="font-mono text-white font-semibold">{formatCurrency(item.valor)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Observações da Venda */}
            {venda.observacoesVenda && (
              <div className="p-3 bg-[#111116] rounded-xl border border-white/5 text-[11px]">
                <strong className="text-slate-300 block mb-1">Observações da Venda / Fechamento:</strong>
                <p className="text-slate-400 whitespace-pre-line">{venda.observacoesVenda}</p>
              </div>
            )}
          </div>

          {/* 3. GESTÃO E QUITAÇÃO DA COMISSÃO DO VENDEDOR (ADMINISTRADOR) */}
          {isAdmin && (
            <form onSubmit={handleSalvarComissao} className="bg-gradient-to-br from-[#181a24] to-[#12131c] p-5 rounded-2xl border border-purple-500/30 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-500/20 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
                  <Award size={18} />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-white">
                    Gestão de Pagamento & Quitação de Comissão
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Controle administrativo do pagamento da comissão ao vendedor e registro de assinatura de recibo.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-slate-400">Vendedor Beneficiário:</span>
                <span className="font-bold text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-xl">
                  {venda.vendedorNome || 'Vendedor Não Atribuído'}
                </span>
                {isAdminOrGestor && (
                  <button
                    type="button"
                    onClick={() => setIsTransferModalOpen(true)}
                    className="px-2.5 py-1 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                    title="Transferir todos os dados da venda e comissão para outro vendedor"
                  >
                    <ArrowRightLeft size={13} />
                    <span>Transferir Vendedor</span>
                  </button>
                )}
              </div>
            </div>

            {/* Campos de Quitação */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Status do Pagamento */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Status da Comissão:
                </label>
                <select
                  value={comissaoStatus}
                  onChange={(e) => setComissaoStatus(e.target.value as 'Pendente' | 'Paga')}
                  disabled={!isAdminOrGestor}
                  className="w-full bg-[#111116] border border-purple-500/30 rounded-xl px-3 py-2.5 text-xs text-white font-bold outline-none focus:border-purple-400"
                >
                  <option value="Pendente">⏳ Pendente (Aguardando Pagamento)</option>
                  <option value="Paga">✓ Paga (Comissão Liquidada)</option>
                </select>
              </div>

              {/* Data do Pagamento */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Data em que a Comissão foi Paga:
                </label>
                <input
                  type="date"
                  value={comissaoDataPagamento}
                  onChange={(e) => setComissaoDataPagamento(e.target.value)}
                  disabled={!isAdminOrGestor}
                  className="w-full bg-[#111116] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white font-medium outline-none focus:border-purple-400"
                />
              </div>

              {/* Forma de Pagamento da Comissão */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Forma de Pagamento da Comissão:
                </label>
                <select
                  value={comissaoFormaPagamento}
                  onChange={(e) => setComissaoFormaPagamento(e.target.value)}
                  disabled={!isAdminOrGestor}
                  className="w-full bg-[#111116] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white font-medium outline-none focus:border-purple-400"
                >
                  <option value="PIX">⚡ Transferência Instantânea PIX</option>
                  <option value="Transferência Bancária">🏦 Transferência Bancária / TED</option>
                  <option value="Dinheiro / Espécie">💵 Dinheiro / Espécie em Mãos</option>
                  <option value="Cheque">📜 Cheque Nominal</option>
                  <option value="Conta Corrente">💼 Crédito em Conta Salário / PJ</option>
                </select>
              </div>
            </div>

            {/* Recibo Assinado pelo Vendedor */}
            <div className="bg-[#111116] p-4 rounded-xl border border-white/10 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={comissaoReciboAssinado}
                    onChange={(e) => {
                      setComissaoReciboAssinado(e.target.checked);
                      if (e.target.checked && !comissaoReciboDataAssinatura) {
                        setComissaoReciboDataAssinatura(new Date().toISOString().split('T')[0]);
                      }
                    }}
                    disabled={!isAdminOrGestor}
                    className="w-5 h-5 rounded border-white/20 text-purple-600 focus:ring-purple-500 bg-black/40 cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-white text-xs block">
                      Vendedor Assinou o Recibo de Quitação da Comissão
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Confirma que o vendedor assinou o comprovante físico ou digital dando quitação plena.
                    </span>
                  </div>
                </label>

                {comissaoReciboAssinado && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Data da Assinatura:</span>
                    <input
                      type="date"
                      value={comissaoReciboDataAssinatura}
                      onChange={(e) => setComissaoReciboDataAssinatura(e.target.value)}
                      disabled={!isAdminOrGestor}
                      className="bg-black/50 border border-purple-500/30 rounded-xl px-2.5 py-1.5 text-xs text-white font-medium outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Observações / Anotações do Financeiro */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Observações do Financeiro / Número do Recibo de Quitação:
                </label>
                <input
                  type="text"
                  value={comissaoObservacoesAdmin}
                  onChange={(e) => setComissaoObservacoesAdmin(e.target.value)}
                  placeholder="Ex: Recibo físico arquivado na pasta de comissões, comprovante PIX anexado."
                  disabled={!isAdminOrGestor}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-purple-400"
                />
              </div>
            </div>

            {/* Ações de Salvar e Feedback */}
            {isAdminOrGestor && (
              <div className="flex items-center justify-between pt-2">
                <div>
                  {saveSuccess && (
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 animate-fadeIn">
                      <CheckCircle2 size={15} /> Informações de comissão atualizadas com sucesso!
                    </span>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 flex items-center gap-2 cursor-pointer transition disabled:opacity-50"
                >
                  <FileCheck size={16} />
                  <span>{isSaving ? 'Salvando Alterações...' : 'Salvar Dados da Comissão'}</span>
                </button>
              </div>
            )}
          </form>
          )}

          {/* 3.1 GESTÃO DA COMISSÃO ADMINISTRATIVA GLOBAL (OVERRIDING GESTOR/ADMIN) */}
          {canViewGerencial && (
            <div className="bg-gradient-to-br from-[#1c1914] to-[#12131a] p-5 rounded-2xl border border-amber-500/30 space-y-4 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-500/20 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                    <Award size={18} />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                      <span>Comissão Administrativa de Gestão (Overriding)</span>
                      {comissaoGerencialAtiva ? (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                          comissaoGerencialStatus === 'Paga'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        }`}>
                          {comissaoGerencialStatus === 'Paga' ? '✓ Paga' : '⏳ Pendente'}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-white/10">
                          Desvinculada
                        </span>
                      )}
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Remuneração global destinada ao Gestor/Admin sobre as vendas da loja, calculada sem reduzir o valor do vendedor.
                    </p>
                  </div>
                </div>

                {canManageGerencial && (
                  <div className="flex items-center gap-2">
                    {comissaoGerencialAtiva ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setIsEditingGerencial(!isEditingGerencial)}
                          className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <Edit3 size={13} />
                          <span>{isEditingGerencial ? 'Recolher Edição' : 'Editar Regras'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleDesvincularGerencial}
                          className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                          title="Tirar a comissão administrativa desta venda"
                        >
                          <Unlink size={13} />
                          <span>Tirar Comissão</span>
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={handleVincularGerencial}
                        className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-black text-xs shadow-md shadow-amber-950/40 flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Link size={13} />
                        <span>Vincular Comissão Administrativa</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {comissaoGerencialAtiva ? (
                <div className="space-y-4">
                  {/* Resumo da Comissão Gerencial */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Valor a Receber</span>
                      <span className="text-base font-black text-amber-300 font-mono">
                        {formatCurrency(comissaoGerencialValor)}
                      </span>
                    </div>

                    <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Regra Aplicada</span>
                      <span className="text-xs font-bold text-white capitalize">
                        {comissaoGerencialTipo === 'porcentagem_venda' && `${comissaoGerencialTaxa}% sobre Venda`}
                        {comissaoGerencialTipo === 'porcentagem_lucro' && `${comissaoGerencialTaxa}% sobre Lucro`}
                        {comissaoGerencialTipo === 'fixo' && `Fixo (${formatCurrency(comissaoGerencialTaxa)})`}
                        {comissaoGerencialTipo === 'manual' && 'Definição Manual'}
                      </span>
                    </div>

                    <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Beneficiário</span>
                      <span className="text-xs font-bold text-slate-200 truncate block">
                        {comissaoGerencialBeneficiarioNome || 'Diretoria Geral'}
                      </span>
                    </div>

                    <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Status do Pagamento</span>
                      <span className={`text-xs font-bold flex items-center gap-1 ${
                        comissaoGerencialStatus === 'Paga' ? 'text-emerald-400' : 'text-amber-400'
                      }`}>
                        {comissaoGerencialStatus === 'Paga' ? (
                          <>
                            <Check size={13} /> Liquidada
                            {comissaoGerencialDataPagamento && ` (${comissaoGerencialDataPagamento.split('-').reverse().join('/')})`}
                          </>
                        ) : (
                          <>
                            <Clock size={13} /> Aguardando Liberação
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Painel de Edição da Comissão Administrativa */}
                  {(isEditingGerencial || canManageGerencial) && (
                    <div className="bg-black/40 p-4 rounded-xl border border-amber-500/20 space-y-4">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                          <Edit3 size={13} />
                          <span>Configuração e Liquidação do Overriding desta Venda</span>
                        </span>
                        <span className="text-[10px] text-slate-500">Exclusivo Admin / Gestor</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {/* Tipo de Regra */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-300 uppercase mb-1">
                            Modelo de Cálculo:
                          </label>
                          <select
                            value={comissaoGerencialTipo}
                            onChange={(e) => {
                              const tipo = e.target.value as any;
                              handleRecalcularValorGerencial(tipo, comissaoGerencialTaxa);
                            }}
                            className="w-full bg-[#16171f] border border-amber-500/30 rounded-xl px-2.5 py-2 text-xs text-white font-bold outline-none"
                          >
                            <option value="porcentagem_venda">% sobre Valor da Venda</option>
                            <option value="porcentagem_lucro">% sobre Lucro Líquido</option>
                            <option value="fixo">Valor Fixo em R$</option>
                            <option value="manual">Definição Livre / Manual</option>
                          </select>
                        </div>

                        {/* Taxa ou Alíquota */}
                        {comissaoGerencialTipo !== 'manual' && (
                          <div>
                            <label className="block text-[10px] font-bold text-slate-300 uppercase mb-1">
                              {comissaoGerencialTipo === 'fixo' ? 'Taxa Fixa (R$):' : 'Taxa / Alíquota (%):'}
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              value={comissaoGerencialTaxa}
                              onChange={(e) => {
                                const taxa = Number(e.target.value);
                                handleRecalcularValorGerencial(comissaoGerencialTipo, taxa);
                              }}
                              className="w-full bg-[#16171f] border border-white/10 rounded-xl px-2.5 py-2 text-xs text-amber-300 font-mono font-bold outline-none"
                            />
                          </div>
                        )}

                        {/* Valor Calculado / Ajustado */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-300 uppercase mb-1">
                            Valor Final da Comissão (R$):
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={comissaoGerencialValor}
                            onChange={(e) => setComissaoGerencialValor(Number(e.target.value))}
                            className="w-full bg-[#16171f] border border-amber-500/50 rounded-xl px-2.5 py-2 text-xs text-amber-300 font-mono font-black outline-none"
                          />
                        </div>

                        {/* Beneficiário */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-300 uppercase mb-1">
                            Beneficiário Administrativo:
                          </label>
                          <select
                            value={comissaoGerencialBeneficiarioId}
                            onChange={(e) => {
                              const bId = e.target.value;
                              setComissaoGerencialBeneficiarioId(bId);
                              const sel = usuarios.find((u) => u.uid === bId);
                              if (sel) {
                                setComissaoGerencialBeneficiarioNome(sel.displayName || sel.email || 'Gestor');
                                setComissaoGerencialBeneficiarioEmail(sel.email || '');
                              } else {
                                setComissaoGerencialBeneficiarioNome('Diretoria Geral');
                                setComissaoGerencialBeneficiarioEmail('');
                              }
                            }}
                            className="w-full bg-[#16171f] border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white font-medium outline-none"
                          >
                            <option value="">Diretoria Geral (Sem gestor específico)</option>
                            {usuarios
                              .filter((u) => u.role === 'admin' || u.role === 'gestor' || u.recebeComissaoOverriding)
                              .map((u) => (
                                <option key={u.uid} value={u.uid}>
                                  {u.displayName || u.email} ({u.role})
                                </option>
                              ))}
                          </select>
                        </div>
                      </div>

                      {/* Dados de Liquidação */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-white/5">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-300 uppercase mb-1">
                            Status da Quitação:
                          </label>
                          <select
                            value={comissaoGerencialStatus}
                            onChange={(e) => setComissaoGerencialStatus(e.target.value as 'Pendente' | 'Paga')}
                            className="w-full bg-[#16171f] border border-amber-500/30 rounded-xl px-2.5 py-2 text-xs text-white font-bold outline-none"
                          >
                            <option value="Pendente">⏳ Pendente (Aguardando)</option>
                            <option value="Paga">✓ Paga (Liquidada)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-300 uppercase mb-1">
                            Data do Pagamento:
                          </label>
                          <input
                            type="date"
                            value={comissaoGerencialDataPagamento}
                            onChange={(e) => setComissaoGerencialDataPagamento(e.target.value)}
                            className="w-full bg-[#16171f] border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-300 uppercase mb-1">
                            Forma de Pagamento:
                          </label>
                          <select
                            value={comissaoGerencialFormaPagamento}
                            onChange={(e) => setComissaoGerencialFormaPagamento(e.target.value)}
                            className="w-full bg-[#16171f] border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white outline-none"
                          >
                            <option value="PIX">⚡ Transferência Instantânea PIX</option>
                            <option value="Transferência Bancária">🏦 Transferência Bancária / TED</option>
                            <option value="Dinheiro / Espécie">💵 Dinheiro em Mãos</option>
                            <option value="Conta Corrente">💼 Crédito em Conta</option>
                          </select>
                        </div>
                      </div>

                      {/* Observações */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-300 uppercase mb-1">
                          Observações Internas da Comissão Administrativa:
                        </label>
                        <input
                          type="text"
                          value={comissaoGerencialObservacoes}
                          onChange={(e) => setComissaoGerencialObservacoes(e.target.value)}
                          placeholder="Ex: Pagamento referente ao fechamento quinzenal de vendas..."
                          className="w-full bg-[#16171f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none"
                        />
                      </div>

                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={handleSalvarComissao}
                          disabled={isSaving}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-black text-xs shadow-md shadow-amber-950/40 flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                        >
                          <FileCheck size={15} />
                          <span>{isSaving ? 'Salvando...' : 'Salvar Alterações da Comissão Administrativa'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-black/30 rounded-xl border border-dashed border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/5 text-slate-400 flex items-center justify-center font-bold shrink-0">
                      <Unlink size={16} />
                    </div>
                    <div>
                      <span className="font-bold text-white text-xs block">
                        Nenhuma comissão administrativa vinculada a esta venda
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Esta negociação foi registrada sem comissão para o Gestor/Admin. Você pode vinculá-la a qualquer momento.
                      </span>
                    </div>
                  </div>

                  {canManageGerencial && (
                    <button
                      type="button"
                      onClick={handleVincularGerencial}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md flex items-center gap-1.5 transition cursor-pointer shrink-0"
                    >
                      <Link size={14} />
                      <span>Vincular Comissão Agora</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 4. ZONA DE EXCLUSÃO DA VENDA (SOMENTE ADMIN) */}
          {isAdmin && (
            <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h5 className="font-bold text-rose-300 text-xs flex items-center gap-1.5">
                  <AlertTriangle size={15} className="text-rose-400" />
                  <span>Exclusão do Registro de Venda & Cancelamento de Comissão</span>
                </h5>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Caso a negociação tenha sido desfeita, esta ação restabelecerá o veículo como <strong>"Disponível"</strong> no pátio e apagará este registro de venda e comissão.
                </p>
              </div>

              <button
                type="button"
                onClick={handleExcluirVenda}
                className="px-4 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-200 border border-rose-500/40 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition shrink-0 self-start sm:self-center"
              >
                <Trash2 size={14} />
                <span>Excluir Venda & Comissão</span>
              </button>
            </div>
          )}
        </div>

        {/* Rodapé do Modal */}
        <div className="p-4 bg-[#16171f] border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500">
              ID da Transação: <span className="font-mono text-slate-400">{venda.id}</span>
            </span>
            {isAdmin && (
              <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-300 border border-blue-500/20 text-[10px] font-bold">
                Auditoria Admin
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && onOpenDossie && (
              <button
                type="button"
                onClick={handleOpenDossieCompleto}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-900/30 border border-blue-400/30 flex items-center gap-1.5 cursor-pointer transition"
              >
                <FolderOpen size={14} />
                <span>Dossiê Completo do Veículo (Histórico & Custos)</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition cursor-pointer"
            >
              Fechar Janela
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Transferência de Venda */}
      <ModalTransferirVenda
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        venda={venda}
        usuarios={usuarios}
        currentUser={currentUser}
        onTransferenciaSucesso={(vendaAtualizada) => {
          if (onUpdateVenda) {
            onUpdateVenda(vendaAtualizada);
          }
          setIsTransferModalOpen(false);
        }}
      />
    </div>
  );
};
