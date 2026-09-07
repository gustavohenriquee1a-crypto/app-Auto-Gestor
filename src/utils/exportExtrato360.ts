import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { ItemExtrato360 } from '../components/ExtratoAvancadoView';
import { formatCurrency } from './formatters';

export interface ExtratoExportOptions {
  dataInicio: string;
  dataFim: string;
  contaNome: string;
  unidadeNegocio: string;
  categoriaCusto: string;
  metodoTransacao: string;
  tipoPessoa: string;
  buscaTexto?: string;
  totalEntradas: number;
  totalSaidas: number;
  saldoPeriodo: number;
  totalTransferenciasInternas: number;
  qtdTransferenciasInternas: number;
  empresaNome?: string;
}

const formatDatePtBr = (dateStr: string): string => {
  if (!dateStr) return '—';
  if (dateStr.includes('/')) return dateStr;
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

/**
 * 1. Exportação Completa para Microsoft Excel (.xlsx)
 * Gera um arquivo Excel real com duas planilhas:
 * - 'Extrato 360 Lançamentos': Todos os lançamentos detalhados com origem/destino de transferências e valores com sinal
 * - 'Resumo e Conciliação': Resumo executivo do período, filtros e KPIs
 */
export function exportarExtratoExcel(
  itens: ItemExtrato360[],
  opcoes: ExtratoExportOptions,
  customFilename?: string
): void {
  const wb = XLSX.utils.book_new();

  // A) Dados da Planilha Principal de Lançamentos
  const dadosLancamentos = itens.map((item) => {
    const isTransf = item.tipo === 'Transferência';
    const isDebito = item.direcaoTransferencia === 'debito' || (!isTransf && item.tipo === 'Saída');
    const valorComSinal = isDebito ? -Math.abs(item.valor) : Math.abs(item.valor);

    let tipoFormatado = item.tipo as string;
    if (isTransf) {
      tipoFormatado = item.direcaoTransferencia === 'debito'
        ? 'Transferência (Débito/Saída)'
        : 'Transferência (Crédito/Entrada)';
    }

    let fluxo = isDebito ? 'Débito (-)' : 'Crédito (+)';

    // Detalhamento de transferência
    let bancoOrigem = '';
    let bancoDestino = '';
    let detalheFluxo = '';

    if (isTransf) {
      bancoOrigem = item.contaOrigemNome || (item.direcaoTransferencia === 'debito' ? item.contaNome : 'Origem');
      bancoDestino = item.contaDestinoNome || item.terceiroNome || (item.direcaoTransferencia === 'credito' ? item.contaNome : 'Destino');
      detalheFluxo = `De: ${bancoOrigem} ➔ Para: ${bancoDestino}`;
    }

    return {
      'Data': formatDatePtBr(item.data),
      'Conta Bancária': item.contaNome,
      'Tipo de Lançamento': tipoFormatado,
      'Fluxo': fluxo,
      'Banco Origem (Saída)': bancoOrigem || '—',
      'Banco Destino (Entrada)': bancoDestino || '—',
      'Rastreamento Transferência': detalheFluxo || '—',
      'Valor Líquido (R$)': valorComSinal,
      'Descrição': item.descricao || '—',
      'Referência / Doc / Placa': item.referencia || '—',
      'Unidade de Negócio': item.unidadeNegocio,
      'Classificação Custo': item.categoriaCusto,
      'Método de Pagamento': item.metodoTransacao,
      'Tipo de Pessoa': item.tipoPessoa,
      'Categoria Contábil': item.categoria || 'Geral',
      'Status': item.statusPagamento || 'Efetivado',
    };
  });

  const wsLancamentos = XLSX.utils.json_to_sheet(dadosLancamentos);

  // Ajustar larguras das colunas da planilha de lançamentos
  wsLancamentos['!cols'] = [
    { wch: 12 }, // Data
    { wch: 22 }, // Conta
    { wch: 28 }, // Tipo de Lançamento
    { wch: 14 }, // Fluxo
    { wch: 22 }, // Banco Origem
    { wch: 22 }, // Banco Destino
    { wch: 35 }, // Rastreamento Transferência
    { wch: 18 }, // Valor Líquido
    { wch: 40 }, // Descrição
    { wch: 25 }, // Referência
    { wch: 20 }, // Unidade
    { wch: 18 }, // Custo
    { wch: 20 }, // Método
    { wch: 18 }, // Pessoa
    { wch: 22 }, // Categoria
    { wch: 14 }, // Status
  ];

  XLSX.utils.book_append_sheet(wb, wsLancamentos, 'Extrato 360 Lançamentos');

  // B) Planilha de Resumo e Metadados
  const dadosResumo = [
    { Indicador: 'Empresa / Sistema', Valor: opcoes.empresaNome || 'AutoGestor - Gestão de Frotas e Revenda' },
    { Indicador: 'Data de Emissão do Relatório', Valor: new Date().toLocaleString('pt-BR') },
    { Indicador: 'Período Inicial', Valor: formatDatePtBr(opcoes.dataInicio) },
    { Indicador: 'Período Final', Valor: formatDatePtBr(opcoes.dataFim) },
    { Indicador: 'Conta Bancária Selecionada', Valor: opcoes.contaNome },
    { Indicador: 'Unidade de Negócio Filtrada', Valor: opcoes.unidadeNegocio },
    { Indicador: 'Classificação de Custo', Valor: opcoes.categoriaCusto },
    { Indicador: 'Método de Transação', Valor: opcoes.metodoTransacao },
    { Indicador: 'Tipo de Pessoa', Valor: opcoes.tipoPessoa },
    { Indicador: 'Filtro por Busca / Termo', Valor: opcoes.buscaTexto || 'Nenhum (Todos)' },
    { Indicador: 'Total de Lançamentos Listados', Valor: itens.length },
    { Indicador: '----------------------------------------', Valor: '----------------------------------------' },
    { Indicador: 'TOTAL DE ENTRADAS (CRÉDITOS)', Valor: opcoes.totalEntradas },
    { Indicador: 'TOTAL DE SAÍDAS (DÉBITOS)', Valor: opcoes.totalSaidas },
    { Indicador: 'SALDO OPERACIONAL DO PERÍODO', Valor: opcoes.saldoPeriodo },
    { Indicador: 'TOTAL DE TRANSFERÊNCIAS ENTRE CONTAS', Valor: opcoes.totalTransferenciasInternas },
    { Indicador: 'QUANTIDADE DE TRANSFERÊNCIAS', Valor: opcoes.qtdTransferenciasInternas },
  ];

  const wsResumo = XLSX.utils.json_to_sheet(dadosResumo);
  wsResumo['!cols'] = [{ wch: 38 }, { wch: 45 }];
  XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo e Filtros');

  const dataAtual = new Date().toISOString().split('T')[0];
  const filename = customFilename || `extrato_360_autogestor_${dataAtual}.xlsx`;
  XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}

/**
 * 2. Exportação para CSV compatível com Excel pt-BR (delimitador ';' e BOM UTF-8)
 */
export function exportarExtratoCsv(
  itens: ItemExtrato360[],
  opcoes: ExtratoExportOptions,
  customFilename?: string
): void {
  const headers = [
    'Data',
    'Conta Bancária',
    'Tipo Lançamento',
    'Fluxo',
    'Banco Origem (Saída)',
    'Banco Destino (Entrada)',
    'Rastreamento Transferência',
    'Valor (R$)',
    'Descrição',
    'Referência',
    'Unidade de Negócio',
    'Tipo Custo',
    'Método',
    'Pessoa',
    'Categoria',
    'Status',
  ];

  const rows = itens.map((item) => {
    const isTransf = item.tipo === 'Transferência';
    const isDebito = item.direcaoTransferencia === 'debito' || (!isTransf && item.tipo === 'Saída');
    const valorComSinal = isDebito ? -Math.abs(item.valor) : Math.abs(item.valor);

    let tipoFormatado = item.tipo as string;
    if (isTransf) {
      tipoFormatado = item.direcaoTransferencia === 'debito'
        ? 'Transferência (Débito/Saída)'
        : 'Transferência (Crédito/Entrada)';
    }

    let bancoOrigem = '';
    let bancoDestino = '';
    let detalheFluxo = '';

    if (isTransf) {
      bancoOrigem = item.contaOrigemNome || (item.direcaoTransferencia === 'debito' ? item.contaNome : 'Origem');
      bancoDestino = item.contaDestinoNome || item.terceiroNome || (item.direcaoTransferencia === 'credito' ? item.contaNome : 'Destino');
      detalheFluxo = `De: ${bancoOrigem} -> Para: ${bancoDestino}`;
    }

    // Formatar valor para padrão numérico pt-BR (ex: 1234,56)
    const valorStr = valorComSinal.toFixed(2).replace('.', ',');

    return [
      formatDatePtBr(item.data),
      item.contaNome,
      tipoFormatado,
      isDebito ? 'Débito (-)' : 'Crédito (+)',
      bancoOrigem || '—',
      bancoDestino || '—',
      detalheFluxo || '—',
      valorStr,
      (item.descricao || '').replace(/;/g, ' '),
      (item.referencia || '').replace(/;/g, ' '),
      item.unidadeNegocio,
      item.categoriaCusto,
      item.metodoTransacao,
      item.tipoPessoa,
      item.categoria || 'Geral',
      item.statusPagamento || 'Efetivado',
    ];
  });

  const escapeCell = (c: any) => {
    const s = String(c ?? '');
    if (s.includes(';') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const csvLines = [
    headers.map(escapeCell).join(';'),
    ...rows.map((r) => r.map(escapeCell).join(';')),
  ];

  const csvContent = '\uFEFF' + csvLines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const dataAtual = new Date().toISOString().split('T')[0];
  const filename = customFilename || `extrato_360_autogestor_${dataAtual}.csv`;

  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 3. Exportação Completa e Elegante para PDF Direto (A4 Paisagem)
 * Gera um documento vetorial de alta definição com:
 * - Cabeçalho corporativo com carimbo de conciliação
 * - Resumo dos filtros aplicados
 * - Indicadores financeiros (Entradas, Saídas, Saldo Operacional, Transferências)
 * - Tabela completa de lançamentos com destaque visual nas transferências (banco de saída e banco de entrada)
 * - Paginação automática e rodapé
 */
export function exportarExtratoPdf(
  itens: ItemExtrato360[],
  opcoes: ExtratoExportOptions,
  customFilename?: string
): void {
  // Configura PDF em modo Paisagem (Landscape) para caberem todas as colunas
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 297mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 210mm
  const margin = 10;
  const usableWidth = pageWidth - margin * 2; // 277mm

  let cursorY = margin;

  // Função auxiliar para desenhar cabeçalho da página
  const drawPageHeader = (pageNumber: number) => {
    // Barra superior decorativa
    doc.setFillColor(79, 70, 229); // Indigo
    doc.rect(margin, cursorY, usableWidth, 2, 'F');
    cursorY += 5;

    // Título Principal
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text('AUTO-GESTOR — EXTRATO 360º & CONCILIAÇÃO BANCÁRIA', margin, cursorY);

    // Data de emissão e página
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Emissão: ${new Date().toLocaleString('pt-BR')}  |  Pág. ${pageNumber}`,
      pageWidth - margin,
      cursorY,
      { align: 'right' }
    );
    cursorY += 5;

    // Metadados dos Filtros
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    const filtrosTxt = `Período: ${formatDatePtBr(opcoes.dataInicio)} a ${formatDatePtBr(opcoes.dataFim)}  |  Conta: ${opcoes.contaNome}  |  Unidade: ${opcoes.unidadeNegocio}  |  Custo: ${opcoes.categoriaCusto}  |  Método: ${opcoes.metodoTransacao}`;
    doc.text(filtrosTxt, margin, cursorY);
    cursorY += 5;
  };

  // 1. PRIMEIRA PÁGINA: Cabeçalho + Bloco de KPIs Financeiros
  let currentPage = 1;
  drawPageHeader(currentPage);

  // Bloco de Cartões Resumo (KPIs)
  const cardWidth = (usableWidth - 9) / 4;
  const cardHeight = 16;

  // Card 1: Total Entradas
  doc.setFillColor(240, 253, 244); // bg-emerald-50
  doc.setDrawColor(187, 247, 208); // border-emerald-200
  doc.roundedRect(margin, cursorY, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(21, 128, 61); // text-emerald-700
  doc.text('TOTAL ENTRADAS (CRÉDITOS)', margin + 3, cursorY + 5);
  doc.setFontSize(10);
  doc.text(`+ ${formatCurrency(opcoes.totalEntradas)}`, margin + 3, cursorY + 12);

  // Card 2: Total Saídas
  const c2X = margin + cardWidth + 3;
  doc.setFillColor(255, 241, 242); // bg-rose-50
  doc.setDrawColor(254, 205, 211); // border-rose-200
  doc.roundedRect(c2X, cursorY, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(190, 18, 60); // text-rose-700
  doc.text('TOTAL SAÍDAS (DÉBITOS)', c2X + 3, cursorY + 5);
  doc.setFontSize(10);
  doc.text(`- ${formatCurrency(opcoes.totalSaidas)}`, c2X + 3, cursorY + 12);

  // Card 3: Saldo Líquido
  const c3X = c2X + cardWidth + 3;
  const isSaldoPositivo = opcoes.saldoPeriodo >= 0;
  doc.setFillColor(isSaldoPositivo ? 240 : 255, isSaldoPositivo ? 253 : 241, isSaldoPositivo ? 244 : 242);
  doc.setDrawColor(isSaldoPositivo ? 187 : 254, isSaldoPositivo ? 247 : 205, isSaldoPositivo ? 208 : 211);
  doc.roundedRect(c3X, cursorY, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(isSaldoPositivo ? 21 : 190, isSaldoPositivo ? 128 : 18, isSaldoPositivo ? 61 : 60);
  doc.text('SALDO OPERACIONAL DO PERÍODO', c3X + 3, cursorY + 5);
  doc.setFontSize(10);
  doc.text(
    `${isSaldoPositivo ? '+' : ''} ${formatCurrency(opcoes.saldoPeriodo)}`,
    c3X + 3,
    cursorY + 12
  );

  // Card 4: Transferências Internas
  const c4X = c3X + cardWidth + 3;
  doc.setFillColor(245, 243, 255); // bg-purple-50
  doc.setDrawColor(221, 214, 254); // border-purple-200
  doc.roundedRect(c4X, cursorY, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(109, 40, 217); // text-purple-700
  doc.text('TRANSF. ENTRE CONTAS (NEUTRO)', c4X + 3, cursorY + 5);
  doc.setFontSize(10);
  doc.text(
    `${formatCurrency(opcoes.totalTransferenciasInternas)} (${opcoes.qtdTransferenciasInternas}x)`,
    c4X + 3,
    cursorY + 12
  );

  cursorY += cardHeight + 5;

  // Definição de Colunas da Tabela
  // Total usableWidth = 277mm
  const cols = [
    { title: 'DATA', width: 18, align: 'left' as const },
    { title: 'CONTA BANCÁRIA', width: 34, align: 'left' as const },
    { title: 'TIPO / FLUXO', width: 34, align: 'left' as const },
    { title: 'DESCRIÇÃO / TRANSFERÊNCIA (DE ➔ PARA)', width: 85, align: 'left' as const },
    { title: 'UNIDADE', width: 26, align: 'left' as const },
    { title: 'MÉTODO', width: 20, align: 'left' as const },
    { title: 'PESSOA', width: 25, align: 'left' as const },
    { title: 'VALOR (R$)', width: 35, align: 'right' as const },
  ];

  const drawTableHeader = () => {
    doc.setFillColor(241, 245, 249); // slate-100
    doc.rect(margin, cursorY, usableWidth, 6.5, 'F');
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.line(margin, cursorY + 6.5, margin + usableWidth, cursorY + 6.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(51, 65, 85); // slate-700

    let curX = margin + 1.5;
    cols.forEach((col) => {
      if (col.align === 'right') {
        doc.text(col.title, curX + col.width - 3, cursorY + 4.5, { align: 'right' });
      } else {
        doc.text(col.title, curX, cursorY + 4.5);
      }
      curX += col.width;
    });

    cursorY += 7.5;
  };

  drawTableHeader();

  // Linhas da Tabela
  const rowHeight = 7.5;
  const maxRowsPerPage = Math.floor((pageHeight - margin - cursorY - 10) / rowHeight);
  let rowsOnCurrentPage = 0;

  itens.forEach((item, index) => {
    // Checar quebra de página
    if (cursorY + rowHeight > pageHeight - margin - 8) {
      doc.addPage();
      currentPage++;
      cursorY = margin;
      drawPageHeader(currentPage);
      drawTableHeader();
      rowsOnCurrentPage = 0;
    }

    const isTransf = item.tipo === 'Transferência';
    const isTransfDebito = isTransf && item.direcaoTransferencia === 'debito';
    const isTransfCredito = isTransf && item.direcaoTransferencia === 'credito';
    const isEntrada = item.tipo === 'Entrada';
    const isSaida = item.tipo === 'Saída';

    // Fundo zebrado suave
    if (index % 2 === 1) {
      doc.setFillColor(248, 250, 252); // slate-50
      doc.rect(margin, cursorY - 0.5, usableWidth, rowHeight, 'F');
    }

    // Destaque de fundo sutil para transferências
    if (isTransf) {
      if (isTransfDebito) {
        doc.setFillColor(254, 242, 242); // rose-50
        doc.rect(margin, cursorY - 0.5, usableWidth, rowHeight, 'F');
      } else {
        doc.setFillColor(236, 253, 245); // emerald-50
        doc.rect(margin, cursorY - 0.5, usableWidth, rowHeight, 'F');
      }
    }

    let curX = margin + 1.5;

    // 1. Data
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    doc.text(formatDatePtBr(item.data), curX, cursorY + 4.5);
    curX += cols[0].width;

    // 2. Conta Bancária
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    const contaText = doc.splitTextToSize(item.contaNome, cols[1].width - 2);
    doc.text(contaText[0] || item.contaNome, curX, cursorY + 4.5);
    curX += cols[1].width;

    // 3. Tipo / Fluxo
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    if (isTransfDebito) {
      doc.setTextColor(225, 29, 72); // rose-600
      doc.text('TRANSF. DÉBITO (SAÍDA)', curX, cursorY + 4.5);
    } else if (isTransfCredito) {
      doc.setTextColor(5, 150, 105); // emerald-600
      doc.text('TRANSF. CRÉDITO (ENTRADA)', curX, cursorY + 4.5);
    } else if (isEntrada) {
      doc.setTextColor(5, 150, 105);
      doc.text('ENTRADA (CRÉDITO)', curX, cursorY + 4.5);
    } else {
      doc.setTextColor(225, 29, 72);
      doc.text('SAÍDA (DÉBITO)', curX, cursorY + 4.5);
    }
    curX += cols[2].width;

    // 4. Descrição / Detalhe Transferência
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(30, 41, 59);

    let descLinha = item.descricao || '';
    if (isTransf) {
      const origem = item.contaOrigemNome || (isTransfDebito ? item.contaNome : 'Origem');
      const destino = item.contaDestinoNome || item.terceiroNome || (isTransfCredito ? item.contaNome : 'Destino');
      descLinha = `[${origem} ➔ ${destino}] - ${item.descricao || 'Transf. Interna'}`;
    } else if (item.referencia) {
      descLinha = `${item.descricao} (${item.referencia})`;
    }

    const descSplit = doc.splitTextToSize(descLinha, cols[3].width - 2);
    doc.text(descSplit[0] || descLinha, curX, cursorY + 4.5);
    curX += cols[3].width;

    // 5. Unidade
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text(item.unidadeNegocio, curX, cursorY + 4.5);
    curX += cols[4].width;

    // 6. Método
    doc.text(item.metodoTransacao, curX, cursorY + 4.5);
    curX += cols[5].width;

    // 7. Pessoa
    doc.text(item.tipoPessoa, curX, cursorY + 4.5);
    curX += cols[6].width;

    // 8. Valor (R$)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    const colValorX = curX + cols[7].width - 3;

    if (isTransfDebito) {
      doc.setTextColor(225, 29, 72); // rose-600
      doc.text(`- ${formatCurrency(item.valor)}`, colValorX, cursorY + 4.5, { align: 'right' });
    } else if (isTransfCredito) {
      doc.setTextColor(5, 150, 105); // emerald-600
      doc.text(`+ ${formatCurrency(item.valor)}`, colValorX, cursorY + 4.5, { align: 'right' });
    } else if (isEntrada) {
      doc.setTextColor(5, 150, 105);
      doc.text(`+ ${formatCurrency(item.valor)}`, colValorX, cursorY + 4.5, { align: 'right' });
    } else {
      doc.setTextColor(225, 29, 72);
      doc.text(`- ${formatCurrency(item.valor)}`, colValorX, cursorY + 4.5, { align: 'right' });
    }

    // Linha divisória sutil
    doc.setDrawColor(241, 245, 249);
    doc.line(margin, cursorY + rowHeight - 0.5, margin + usableWidth, cursorY + rowHeight - 0.5);

    cursorY += rowHeight;
    rowsOnCurrentPage++;
  });

  // Rodapé final na última página
  cursorY += 4;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Relatório emitido pelo módulo Extrato 360º — ${itens.length} lançamentos conciliados. Documento auditável.`,
    margin,
    cursorY
  );

  const dataAtual = new Date().toISOString().split('T')[0];
  const filename = customFilename || `extrato_360_autogestor_${dataAtual}.pdf`;
  doc.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
}
