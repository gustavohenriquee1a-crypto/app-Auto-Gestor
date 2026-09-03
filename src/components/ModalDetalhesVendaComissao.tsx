import React, { useState, useEffect } from 'react';
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
  ArrowRightLeft
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
  const isAdminOrGestor = currentUser?.role === 'admin' || currentUser?.role === 'gestor';

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
            <span class="label">Nome do Vendedor:</span>
            <span class="value">${venda.vendedorNome || 'Não especificado'}</span>
          </div>
          <div class="row">
            <span class="label">E-mail / Identificação:</span>
            <span class="value">${venda.vendedorEmail || 'Vendedor cadastrado no sistema'}</span>
          </div>
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
            <div class="sig-name">${venda.vendedorNome || 'Vendedor Beneficiário'}</div>
            <div class="sig-role">Assinatura do Vendedor</div>
          </div>
          <div class="sig-box">
            <div class="sig-line"></div>
            <div class="sig-name">${currentUser?.displayName || 'Administração / Gerência'}</div>
            <div class="sig-role">Diretoria / Financeiro Loja</div>
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
            {isAdminOrGestor && onOpenDossie && (
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

            <button
              onClick={handleImprimirRecibo}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 font-semibold text-xs border border-white/10 flex items-center gap-1.5 cursor-pointer transition"
              title="Gerar e imprimir recibo oficial de comissão"
            >
              <Printer size={14} className="text-purple-400" />
              <span className="hidden sm:inline">Imprimir Recibo</span>
            </button>
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
          {/* BANNER ADMINISTRATIVO DE DOSSIÊ DO VEÍCULO VENDIDO */}
          {isAdminOrGestor && (
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

          {/* 1. SEÇÃO DE CARDS DE RESUMO FINANCEIRO DA TRANSAÇÃO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-[#16171f] p-3.5 rounded-2xl border border-white/5">
              <span className="text-[11px] text-slate-400 font-semibold uppercase">Valor da Venda</span>
              <p className="text-lg font-black text-white font-mono mt-0.5">
                {formatCurrency(venda.valorVenda)}
              </p>
              <span className="text-[10px] text-slate-500 font-mono">Faturamento Bruto</span>
            </div>

            <div className="bg-[#16171f] p-3.5 rounded-2xl border border-emerald-500/20">
              <span className="text-[11px] text-emerald-400 font-semibold uppercase">Lucro Líquido Real</span>
              <p className="text-lg font-black text-emerald-400 font-mono mt-0.5">
                {formatCurrency(venda.lucroLiquido)}
              </p>
              <span className="text-[10px] text-emerald-500/80 font-mono">
                Margem: {formatPercent(venda.margemLucroPercent || (venda.valorVenda > 0 ? (venda.lucroLiquido / venda.valorVenda) * 100 : 0))}
              </span>
            </div>

            <div className="bg-[#16171f] p-3.5 rounded-2xl border border-amber-500/20">
              <span className="text-[11px] text-amber-400 font-semibold uppercase">Comissão do Vendedor</span>
              <p className="text-lg font-black text-amber-400 font-mono mt-0.5">
                {formatCurrency(venda.comissaoValor)}
              </p>
              <span className="text-[10px] text-amber-500/80">
                {venda.vendedorNome || 'Vendedor'}
              </span>
            </div>

            <div className="bg-[#16171f] p-3.5 rounded-2xl border border-blue-500/20">
              <span className="text-[11px] text-blue-400 font-semibold uppercase">Custo Total Veículo</span>
              <p className="text-lg font-black text-blue-400 font-mono mt-0.5">
                {formatCurrency(venda.custoTotal)}
              </p>
              <span className="text-[10px] text-slate-500">
                Compra ({formatCurrency(venda.valorCompra)}) + Desp. ({formatCurrency(venda.totalDespesas)})
              </span>
            </div>
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

          {/* 4. ZONA DE EXCLUSÃO DA VENDA (SOMENTE ADMIN/GESTOR) */}
          {isAdminOrGestor && (
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
            {isAdminOrGestor && (
              <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-300 border border-blue-500/20 text-[10px] font-bold">
                Auditoria Admin
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isAdminOrGestor && onOpenDossie && (
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
