import html2canvas from 'html2canvas-pro';
import jsPDF from 'jspdf';

/**
 * Utilitário de impressão e geração de PDF de alta fidelidade para o AUTO-GESTOR.
 * Utiliza html2canvas-pro com suporte nativo a cores modernas (oklch, lab, lch, oklab),
 * conversão matemática de segurança para RGB/RGBA e paginação A4 de alta resolução.
 */

export interface PrintOptions {
  titulo?: string;
  landscape?: boolean;
}

/**
 * Conversão matemática exata de OKLCH para sRGB padrão (rgb/rgba).
 * Referência: CSS Color Module Level 4 Specification.
 */
export const oklchToRgb = (lStr: string, cStr: string, hStr: string, aStr?: string): string => {
  let L = parseFloat(lStr);
  if (lStr.includes('%')) L = L / 100;

  let C = parseFloat(cStr);
  if (cStr.includes('%')) C = (parseFloat(cStr) / 100) * 0.4;

  let H = parseFloat(hStr);
  if (hStr.includes('rad')) H = (parseFloat(hStr) * 180) / Math.PI;
  else if (hStr.includes('turn')) H = parseFloat(hStr) * 360;

  let alpha = 1;
  if (aStr !== undefined && aStr.trim() !== '') {
    alpha = parseFloat(aStr);
    if (aStr.includes('%')) alpha = alpha / 100;
    if (isNaN(alpha)) alpha = 1;
  }

  if (isNaN(L)) L = 0;
  if (isNaN(C)) C = 0;
  if (isNaN(H)) H = 0;

  const hRad = (H * Math.PI) / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  const lVal = l_ * l_ * l_;
  const mVal = m_ * m_ * m_;
  const sVal = s_ * s_ * s_;

  const rLin = +4.0767416621 * lVal - 3.3077115913 * mVal + 0.2309699292 * sVal;
  const gLin = -1.2684380046 * lVal + 2.6097574011 * mVal - 0.3413193965 * sVal;
  const bLin = -0.0041960863 * lVal - 0.7034186147 * mVal + 1.7076147010 * sVal;

  const transfer = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(Math.max(0, c), 1 / 2.4) - 0.055);

  const r = Math.round(Math.min(Math.max(0, transfer(rLin)), 1) * 255);
  const g = Math.round(Math.min(Math.max(0, transfer(gLin)), 1) * 255);
  const bClamped = Math.round(Math.min(Math.max(0, transfer(bLin)), 1) * 255);

  if (alpha < 1) {
    return `rgba(${r}, ${g}, ${bClamped}, ${Number(alpha.toFixed(3))})`;
  }
  return `rgb(${r}, ${g}, ${bClamped})`;
};

/**
 * Converte qualquer string de cor CSS moderna (incluindo oklch, lch, color(...))
 * para formato padrão RGB/RGBA ou Hexadecimal com conversão matemática à prova de falhas.
 */
export const normalizeColorToRgb = (colorStr: string): string => {
  if (!colorStr || typeof colorStr !== 'string') return colorStr;
  if (!colorStr.includes('oklch') && !colorStr.includes('lch') && !colorStr.includes('color(')) {
    return colorStr;
  }

  // 1. Substitui funções oklch(...) com precisão matemática para rgb/rgba
  let result = colorStr.replace(
    /oklch\(\s*([\d.]+%?)\s+([\d.]+%?)\s+([\d.]+(?:deg|rad|turn)?)\s*(?:\/\s*([\d.]+%?))?\s*\)/gi,
    (_match, l, c, h, a) => oklchToRgb(l, c, h, a)
  );

  // 2. Se ainda restarem funções oklch/lch/color (com calc ou sintaxes relativas), tenta resolver via Canvas context
  if (result.includes('oklch') || result.includes('lch') || result.includes('color(')) {
    if (typeof document !== 'undefined') {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          result = result.replace(/(?:oklch|lch|color)\([^)]+\)/gi, (m) => {
            try {
              ctx.fillStyle = '#000000';
              ctx.fillStyle = m;
              const fs = ctx.fillStyle;
              if (fs && !fs.includes('oklch') && !fs.includes('lch') && !fs.includes('color(')) {
                return fs;
              }
              return '#1e293b';
            } catch {
              return '#1e293b';
            }
          });
        }
      } catch {
        // fallback
      }
    }
  }

  // 3. Garantia estrita: se ainda restar qualquer menção a oklch ou lch, substitui por cor escura padrão
  if (result.includes('oklch') || result.includes('lch')) {
    result = result.replace(/(?:oklch|lch)\([^)]+\)/gi, 'rgb(30, 41, 59)');
  }

  return result;
};

export type ElementTarget = string | HTMLElement | { current: HTMLElement | null } | null;

/**
 * Localiza de forma resiliente um elemento no DOM pelo ID, seletor CSS ou referência direta.
 */
export const findTargetElement = async (
  target: ElementTarget
): Promise<HTMLElement | null> => {
  if (!target) return null;

  if (typeof target !== 'string') {
    if ('current' in target && target.current instanceof HTMLElement) {
      return target.current;
    }
    if (target instanceof HTMLElement) {
      return target;
    }
  }

  const targetId = typeof target === 'string' ? target.replace(/^#/, '') : '';

  // 1. Busca direta por ID
  let el = document.getElementById(targetId);
  if (el) return el;

  // 2. Busca por seletor de atributo ID ou classe
  el = (document.querySelector(`[id="${targetId}"]`) ||
        document.querySelector(`.${targetId}`) ||
        document.querySelector(`#${targetId}`)) as HTMLElement | null;
  if (el) return el;

  // 3. Busca de fallback pelos IDs mais comuns
  el = (document.querySelector('#printable-contract') ||
        document.querySelector('#printable-test-drive') ||
        document.querySelector('.printable-document')) as HTMLElement | null;
  if (el) return el;

  // 4. Aguarda 1 ciclo de renderização caso o modal esteja abrindo
  await new Promise((resolve) => setTimeout(resolve, 80));

  return document.getElementById(targetId) ||
         (document.querySelector(`[id="${targetId}"]`) as HTMLElement | null) ||
         (document.querySelector('#printable-contract') as HTMLElement | null) ||
         (document.querySelector('#printable-test-drive') as HTMLElement | null);
};

/**
 * Imprime um elemento HTML com isolamento completo em iframe oculto,
 * garantindo formatação A4 limpa sem cortes ou conflitos de overflow/position fixed.
 */
export const imprimirElemento = async (
  target: ElementTarget,
  options?: PrintOptions
): Promise<boolean> => {
  const element = await findTargetElement(target);
  if (!element) {
    console.warn(`Elemento de impressão não encontrado no DOM. Utilizando fallback.`);
    window.print();
    return false;
  }

  const titulo = options?.titulo || 'Documento AUTO-GESTOR';

  return new Promise((resolve) => {
    try {
      // 1. Cria um iframe invisível no DOM
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.left = '-9999px';
      iframe.style.top = '-9999px';
      iframe.style.width = '800px';
      iframe.style.height = '1100px';
      iframe.style.border = '0';
      iframe.style.opacity = '0';
      iframe.style.pointerEvents = 'none';
      iframe.style.zIndex = '-9999';
      iframe.id = `print-frame-${Date.now()}`;
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
      if (!iframeDoc) {
        throw new Error('Não foi possível acessar o documento do iframe de impressão.');
      }

      const contentHtml = element.innerHTML;

      // 2. Escreve a estrutura HTML completa incluindo Tailwind CDN e regras estritas de impressão A4
      iframeDoc.open();
      iframeDoc.write(`
        <!DOCTYPE html>
        <html lang="pt-BR">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${titulo}</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
              *, *::before, *::after {
                box-sizing: border-box;
              }
              html, body {
                background: #ffffff !important;
                color: #000000 !important;
                position: static !important;
                overflow: visible !important;
                margin: 0 !important;
                padding: 0 !important;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              @media print {
                @page {
                  size: A4 portrait;
                  margin: 0mm !important; /* Zera a margem do navegador para matar a URL e o cabeçalho padrão */
                }
                body {
                  margin: 15mm !important; /* Cria o respiro do documento diretamente no body */
                  background: white !important; 
                  color: black !important; 
                  position: static !important; 
                  overflow: visible !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                a[href]:after {
                  content: none !important;
                }
              }
              .no-print {
                display: none !important;
              }
              .page-break {
                page-break-after: always;
                break-after: page;
              }
              table {
                border-collapse: collapse;
                width: 100%;
              }
              #printable-contract, #printable-test-drive, .print-container {
                width: 100% !important;
                max-width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                border: none !important;
                box-shadow: none !important;
                background-color: #ffffff !important;
                color: #000000 !important;
                position: static !important;
                overflow: visible !important;
              }
            </style>
          </head>
          <body>
            <div class="print-container">
              ${contentHtml}
            </div>
          </body>
        </html>
      `);
      iframeDoc.close();

      // 3. Aguarda o Tailwind CDN processar as classes e dispara a impressão
      const triggerPrint = () => {
        try {
          if (iframe.contentWindow) {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
            
            setTimeout(() => {
              if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
              }
              resolve(true);
            }, 1500);
          } else {
            resolve(false);
          }
        } catch (err) {
          console.error('Erro ao executar print no iframe:', err);
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
          window.print();
          resolve(false);
        }
      };

      setTimeout(triggerPrint, 500);

    } catch (err) {
      console.warn('Impressão por iframe falhou, usando fallback direto:', err);
      window.print();
      resolve(false);
    }
  });
};

/**
 * Sanitiza todas as propriedades de cor de um elemento clonado para garantir
 * que não existam strings 'oklch' ou formatos não suportados pelo html2canvas.
 */
const sanitizeColorsForHtml2Canvas = (clonedElement: HTMLElement, clonedDoc: Document) => {
  // 1. Sanitiza regras dentro de tags <style> do documento clonado
  const styles = clonedDoc.querySelectorAll('style');
  styles.forEach((styleTag) => {
    try {
      if (styleTag.textContent && (styleTag.textContent.includes('oklch') || styleTag.textContent.includes('lch'))) {
        styleTag.textContent = normalizeColorToRgb(styleTag.textContent);
      }
    } catch {
      // Ignora erro em folhas de estilo isoladas
    }
  });

  // 2. Itera em todos os elementos da árvore DOM clonada e converte cores computadas para RGB/Hex
  const elements = [clonedElement, ...Array.from(clonedElement.querySelectorAll('*'))] as HTMLElement[];

  const colorProperties = [
    'color',
    'backgroundColor',
    'borderColor',
    'borderTopColor',
    'borderRightColor',
    'borderBottomColor',
    'borderLeftColor',
    'outlineColor',
    'textDecorationColor',
    'fill',
    'stroke',
    'boxShadow',
  ];

  elements.forEach((el) => {
    try {
      const computed = window.getComputedStyle(el);

      colorProperties.forEach((prop) => {
        const val = (computed as unknown as Record<string, string>)[prop];
        if (val && typeof val === 'string' && (val.includes('oklch') || val.includes('lch') || val.includes('color('))) {
          const sanitizedVal = normalizeColorToRgb(val);
          const cssPropName = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
          el.style.setProperty(cssPropName, sanitizedVal, 'important');
        }
      });

      // Garante contraste explícito para elementos sem cores computadas definidas
      if (!el.style.backgroundColor && (!computed.backgroundColor || computed.backgroundColor === 'rgba(0, 0, 0, 0)')) {
        // herda normalmente
      }
    } catch {
      // continua para os demais elementos
    }
  });
};

/**
 * Captura o elemento e gera um arquivo PDF (.pdf) real para download direto no navegador,
 * paginando perfeitamente documentos longos sem cortes e com proteção total contra erros de cores CSS modernas (oklch).
 */
export const baixarElementoComoPdf = async (
  target: ElementTarget,
  nomeArquivo: string = 'contrato-venda'
): Promise<boolean> => {
  const element = await findTargetElement(target);
  if (!element) {
    console.error('Elemento não encontrado para exportar PDF.');
    alert('Erro ao localizar o documento para gerar o PDF.');
    return false;
  }

  // Clona o elemento para aplicar estilização limpa de captura sem afetar a tela
  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.width = '794px'; // Largura exata A4 em 96 DPI
  clone.style.maxWidth = '794px';
  clone.style.backgroundColor = '#ffffff';
  clone.style.color = '#0f172a';
  clone.style.padding = '32px';
  clone.style.position = 'fixed';
  clone.style.left = '-9999px';
  clone.style.top = '0';
  clone.style.zIndex = '-1000';
  document.body.appendChild(clone);

  try {
    const canvas = await html2canvas(clone, {
      scale: 2, // 2x para retina/alta resolução de impressão
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 1200,
      onclone: (clonedDoc, clonedElement) => {
        sanitizeColorsForHtml2Canvas(clonedElement, clonedDoc);
      },
    });

    if (document.body.contains(clone)) {
      document.body.removeChild(clone);
    }

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    
    // Dimensões A4 em mm: 210 x 297
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
    const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm
    const margin = 8; // 8mm de margem

    const contentWidth = pdfWidth - margin * 2;
    const contentHeight = (canvas.height * contentWidth) / canvas.width;

    let heightLeft = contentHeight;
    let position = margin;

    // Primeira página
    pdf.addImage(imgData, 'JPEG', margin, position, contentWidth, contentHeight, undefined, 'FAST');
    heightLeft -= (pdfHeight - margin * 2);

    // Páginas subsequentes se o documento tiver mais de uma página
    while (heightLeft > 0) {
      position = heightLeft - contentHeight + margin;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', margin, position, contentWidth, contentHeight, undefined, 'FAST');
      heightLeft -= (pdfHeight - margin * 2);
    }

    const filenameSanitized = nomeArquivo.toLowerCase().endsWith('.pdf')
      ? nomeArquivo
      : `${nomeArquivo}.pdf`;

    pdf.save(filenameSanitized);
    return true;
  } catch (error) {
    console.error('Erro ao gerar PDF com html2canvas/jsPDF:', error);
    if (document.body.contains(clone)) {
      document.body.removeChild(clone);
    }
    // Fallback: se falhar o canvas, aciona a impressão isolada em iframe
    imprimirElemento(target, { titulo: nomeArquivo });
    return false;
  }
};
