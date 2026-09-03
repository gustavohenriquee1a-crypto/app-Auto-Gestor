import { VendaVeiculo } from '../types';

/**
 * Utilitário de formatação para CSV compatível com Excel brasileiro:
 * - Delimitador ';' (padrão do Excel pt-BR)
 * - Prefixo BOM '\uFEFF' (garante suporte nativo a acentos e cedilha no Windows/Mac)
 * - Tratamento de aspas e quebras de linha
 */

function escapeCsvValue(val: any): string {
  if (val === null || val === undefined) return '';
  let str = String(val);
  // Se contiver ponto e vírgula, quebra de linha ou aspas duplas, envolver entre aspas
  if (str.includes(';') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    str = `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadCsv(content: string, filename: string) {
  // \uFEFF é o Byte Order Mark (BOM) UTF-8, essencial para o Microsoft Excel abrir caracteres UTF-8 corretamente
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 1. Exporta Relatório Completo de Vendas da Loja
 */
export function exportRelatorioVendasCsv(vendas: VendaVeiculo[], customFilename?: string) {
  const headers = [
    'ID Venda',
    'Data da Venda',
    'Data Entrada Pátio',
    'Dias em Pátio (Aging)',
    'Veículo / Modelo',
    'Placa',
    'Chassi',
    'Vendedor Responsável',
    'Valor Compra (R$)',
    'Despesas Preparação (R$)',
    'Custo Total (R$)',
    'Valor Venda (R$)',
    'Lucro Líquido Real (R$)',
    'Margem Lucro (%)',
    'Forma Pagamento',
    'Canal Origem Lead',
    'Realizou Test-Drive',
    'Qtd Visitas',
    'Banco Parceiro',
    'Valor Financiado (R$)',
    'Retorno TAC Banco (R$)',
    'Fundo Garantia CDC 90d (R$)',
    'Provisão Simples Nacional (R$)',
    'Nome do Comprador',
    'CPF Comprador',
    'Profissão Comprador',
    'Data Nascimento Comprador',
    'Financ. Nome Terceiro',
    'Nome Titular Financiamento',
    'CPF Titular Terceiro',
    'Grau Parentesco Terceiro',
    'Observações da Venda'
  ];

  const rows = vendas.map((v) => {
    const valorCompra = Number(v.valorCompra || 0).toFixed(2).replace('.', ',');
    const totalDesp = Number(v.totalDespesas || 0).toFixed(2).replace('.', ',');
    const custoTotal = Number(v.custoTotal || 0).toFixed(2).replace('.', ',');
    const valorVenda = Number(v.valorVenda || 0).toFixed(2).replace('.', ',');
    const lucroLiquido = Number(v.lucroLiquido || 0).toFixed(2).replace('.', ',');
    const margem = Number(v.margemLucroPercent || 0).toFixed(2).replace('.', ',');
    const valorFinanc = Number(v.financiamentoDetalhes?.valorFinanciado || (v.formaPagamento === 'Financiamento' ? v.valorVenda * 0.8 : 0)).toFixed(2).replace('.', ',');
    const retornoTac = Number(v.retornoFinanciamentoTac || v.financiamentoDetalhes?.retornoComissaoBanco || 0).toFixed(2).replace('.', ',');
    const provGarantiaVal = typeof v.fundoGarantiaProvisao === 'object' && v.fundoGarantiaProvisao !== null 
      ? v.fundoGarantiaProvisao.valor 
      : Number(v.fundoGarantiaProvisao || 0);
    const provGarantia = Number(provGarantiaVal || 0).toFixed(2).replace('.', ',');
    const provSimples = Number(v.impostoMargemEstimado || 0).toFixed(2).replace('.', ',');

    const isTerceiro = v.financiamentoTerceiro?.ativo ? 'Sim' : 'Não';
    const nomeTerceiro = v.financiamentoTerceiro?.nomeTerceiro || '';
    const cpfTerceiro = v.financiamentoTerceiro?.cpfTerceiro || '';
    const parentescoTerceiro = v.financiamentoTerceiro?.grauParentesco || '';

    return [
      v.id || '',
      v.dataVenda || '',
      v.dataEntrada || '',
      v.diasEmPatio ?? '',
      v.modelo || '',
      v.placa || '',
      v.chassi || '',
      v.vendedorNome || 'Não informado',
      valorCompra,
      totalDesp,
      custoTotal,
      valorVenda,
      lucroLiquido,
      margem,
      v.formaPagamento || 'Outro',
      v.canalOrigem || 'Passante/Pátio',
      v.realizouTestDrive ? 'Sim' : 'Não',
      v.quantidadeVisitas || 1,
      v.financiamentoDetalhes?.bancoParceiro || (v.formaPagamento === 'Financiamento' ? 'Diversos' : 'N/A'),
      valorFinanc,
      retornoTac,
      provGarantia,
      provSimples,
      v.compradorNome || '',
      v.compradorCpf || '',
      v.compradorProfissao || 'Não informada',
      v.compradorDataNascimento || '',
      isTerceiro,
      nomeTerceiro,
      cpfTerceiro,
      parentescoTerceiro,
      v.observacoesVenda || ''
    ].map(escapeCsvValue).join(';');
  });

  const csvContent = [headers.join(';'), ...rows].join('\r\n');
  const filename = customFilename || `Relatorio_Vendas_TrocaFacil_${new Date().toISOString().split('T')[0]}`;
  downloadCsv(csvContent, filename);
}

/**
 * 2. Exporta Base de Clientes do CRM e Aniversariantes
 */
export function exportCrmClientesCsv(clientes: any[], customFilename?: string) {
  const headers = [
    'Nome do Cliente',
    'CPF',
    'Data de Nascimento',
    'Idade Aprox.',
    'Dias p/ Próximo Aniversário',
    'Profissão / Segmento',
    'Veículo Comprado',
    'Placa',
    'Data da Compra',
    'Valor Pago (R$)',
    'Lucro Gerado (R$)',
    'Canal de Captação',
    'Fez Test-Drive',
    'Forma de Pagamento',
    'Banco Financiamento',
    'Financ. Nome Terceiro',
    'Titular Financiamento',
    'Grau Parentesco Terceiro',
    'Vendedor Responsável'
  ];

  const rows = clientes.map((c) => {
    const valorPago = Number(c.valorVenda || 0).toFixed(2).replace('.', ',');
    const lucro = Number(c.lucroLiquido || 0).toFixed(2).replace('.', ',');

    const isTerceiro = c.financiamentoTerceiro?.ativo ? 'Sim' : 'Não';
    const nomeTerceiro = c.financiamentoTerceiro?.nomeTerceiro || '';
    const parentescoTerceiro = c.financiamentoTerceiro?.grauParentesco || '';

    return [
      c.compradorNome || '',
      c.compradorCpf || '',
      c.compradorDataNascimento || 'Não informada',
      c.idade !== null && c.idade !== undefined ? `${c.idade} anos` : 'N/A',
      c.diasAteNiver === 0 ? 'HOJE' : c.diasAteNiver !== null ? `${c.diasAteNiver} dias` : 'N/A',
      c.compradorProfissao || c.profissaoNormalizada || 'Não informada',
      c.modelo || '',
      c.placa || '',
      c.dataVenda || '',
      valorPago,
      lucro,
      c.canalOrigem || c.canalNormalizado || 'Passante/Pátio',
      c.realizouTestDrive ? 'Sim' : 'Não',
      c.formaPagamento || 'Outro',
      c.bancoNormalizado || c.financiamentoDetalhes?.bancoParceiro || 'N/A',
      isTerceiro,
      nomeTerceiro,
      parentescoTerceiro,
      c.vendedorNome || 'Vendedor da Loja'
    ].map(escapeCsvValue).join(';');
  });

  const csvContent = [headers.join(';'), ...rows].join('\r\n');
  const filename = customFilename || `CRM_Clientes_Aniversarios_TrocaFacil_${new Date().toISOString().split('T')[0]}`;
  downloadCsv(csvContent, filename);
}

/**
 * 3. Exporta Métricas Consolidadas de Canais e Conversão
 */
export function exportCanaisConversaoCsv(metricasCanais: any[], customFilename?: string) {
  const headers = [
    'Canal de Origem do Lead',
    'Vendas Concluídas (Qtd)',
    'Faturamento Bruto Total (R$)',
    'Lucro Líquido Real (R$)',
    'Margem Média (%)',
    'Ticket Médio (R$)',
    'Aging Médio em Pátio (Dias)',
    'Taxa de Adesão ao Test-Drive (%)'
  ];

  const rows = metricasCanais.map((c) => [
    c.canal || '',
    c.vendasQtd || 0,
    Number(c.receitaTotal || 0).toFixed(2).replace('.', ','),
    Number(c.lucroTotal || 0).toFixed(2).replace('.', ','),
    Number(c.margemMedia || 0).toFixed(2).replace('.', ','),
    Number(c.ticketMedio || 0).toFixed(2).replace('.', ','),
    c.diasMedioPatio || 0,
    `${c.taxaTestDrive || 0}%`
  ].map(escapeCsvValue).join(';'));

  const csvContent = [headers.join(';'), ...rows].join('\r\n');
  const filename = customFilename || `Analise_Conversao_Canais_TrocaFacil_${new Date().toISOString().split('T')[0]}`;
  downloadCsv(csvContent, filename);
}

/**
 * 4. Exporta Performance dos Bancos e Retorno TAC
 */
export function exportBancosFinanceirasCsv(metricasBancos: any[], customFilename?: string) {
  const headers = [
    'Instituição Bancária / Financeira',
    'Contratos Concluídos (Qtd)',
    'Volume Total Financiado (R$)',
    'Ticket Médio Financiado (R$)',
    'Comissão / Retorno TAC para Loja (R$)',
    'Taxa Média de Retorno TAC (%)',
    'Market Share no Volume Financiado (%)'
  ];

  const rows = metricasBancos.map((b) => [
    b.banco || '',
    b.contratosQtd || 0,
    Number(b.volumeFinanciadoTotal || 0).toFixed(2).replace('.', ','),
    Number(b.ticketMedioFinanciado || 0).toFixed(2).replace('.', ','),
    Number(b.retornoTacTotal || 0).toFixed(2).replace('.', ','),
    `${Number(b.retornoMedioPercent || 0).toFixed(2).replace('.', ',')}%`,
    `${Number(b.marketShareVolume || 0).toFixed(2).replace('.', ',')}%`
  ].map(escapeCsvValue).join(';'));

  const csvContent = [headers.join(';'), ...rows].join('\r\n');
  const filename = customFilename || `Performance_Bancos_TAC_TrocaFacil_${new Date().toISOString().split('T')[0]}`;
  downloadCsv(csvContent, filename);
}

/**
 * 5. Exporta Aniversariantes Próximos (Campanhas de Pós-Venda & Fidelização)
 */
export function exportAniversariantesCsv(aniversariantes: any[], customFilename?: string) {
  const headers = [
    'Status Aniversário',
    'Dias Restantes',
    'Nome do Cliente',
    'Data de Nascimento',
    'Idade a Completar',
    'CPF',
    'Profissão',
    'Veículo Comprado',
    'Placa',
    'Data da Compra',
    'Vendedor Responsável'
  ];

  const rows = aniversariantes.map((a) => [
    a.diasAteNiver === 0 ? 'ANIVERSÁRIO HOJE!' : `Em ${a.diasAteNiver} dias`,
    a.diasAteNiver ?? '',
    a.compradorNome || '',
    a.compradorDataNascimento || '',
    a.idade !== null && a.idade !== undefined ? `${a.idade + 1} anos` : 'N/A',
    a.compradorCpf || '',
    a.compradorProfissao || 'Não informada',
    a.modelo || '',
    a.placa || '',
    a.dataVenda || '',
    a.vendedorNome || 'Vendedor'
  ].map(escapeCsvValue).join(';'));

  const csvContent = [headers.join(';'), ...rows].join('\r\n');
  const filename = customFilename || `Aniversariantes_Proximos_TrocaFacil_${new Date().toISOString().split('T')[0]}`;
  downloadCsv(csvContent, filename);
}

/**
 * 6. Exporta Segmentação por Profissões & Perfil de Compra
 */
export function exportProfissoesSegmentosCsv(profissoes: any[], customFilename?: string) {
  const headers = [
    'Profissão / Segmento do Comprador',
    'Volume de Clientes (Qtd)',
    'Volume Total em Compras (R$)',
    'Ticket Médio Gasto (R$)',
    'Lucro Médio Gerado (R$)',
    'Percentual da Base (%)'
  ];

  const rows = profissoes.map((p) => [
    p.profissao || '',
    p.qtd || 0,
    Number(p.volumeTotal || 0).toFixed(2).replace('.', ','),
    Number(p.ticketMedio || 0).toFixed(2).replace('.', ','),
    Number(p.lucroMedio || 0).toFixed(2).replace('.', ','),
    `${Number(p.percentual || 0).toFixed(2).replace('.', ',')}%`
  ].map(escapeCsvValue).join(';'));

  const csvContent = [headers.join(';'), ...rows].join('\r\n');
  const filename = customFilename || `Perfil_Profissoes_Clientes_TrocaFacil_${new Date().toISOString().split('T')[0]}`;
  downloadCsv(csvContent, filename);
}
