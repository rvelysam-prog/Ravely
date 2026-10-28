/**
 * Service de conversion et rendu de fichiers PDF vers Canvas / Image Data URL
 * et extraction complète du texte natif pour templates e-mails éditables.
 * 100% exécuté côté client dans le navigateur.
 */
import * as pdfjsLib from 'pdfjs-dist';

// Configuration du worker PDF.js (CDN Cloudflare avec fallback local)
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '3.11.174'}/pdf.worker.min.js`;
}

export interface ExtractedTextBlock {
  id: string;
  text: string;
  fontSize: number;
  isHeading: boolean;
  y: number;
}

export interface PdfDocumentInfo {
  numPages: number;
  fileName: string;
  pagesDataUrls: string[];
  pagesTextLines: string[][];
  extractedTextBlocks: ExtractedTextBlock[];
}

/**
 * Charge un fichier PDF (File ou ArrayBuffer), convertit ses pages en images haute définition
 * ET extrait l'intégralité du texte natif (lignes, paragraphes, titres) pour créer un code HTML 100% éditable.
 */
export async function convertPdfFileToImages(
  fileOrBuffer: File | ArrayBuffer,
  options: { scale?: number; maxPages?: number } = {}
): Promise<PdfDocumentInfo> {
  const scale = options.scale || 1.8; // Échelle haute résolution pour rendu net
  const maxPages = options.maxPages || 10;

  let arrayBuffer: ArrayBuffer;
  let fileName = 'document.pdf';

  if (fileOrBuffer instanceof File) {
    fileName = fileOrBuffer.name;
    arrayBuffer = await fileOrBuffer.arrayBuffer();
  } else {
    arrayBuffer = fileOrBuffer;
  }

  // Chargement du document PDF via PDF.js
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    cMapUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '3.11.174'}/cmaps/`,
    cMapPacked: true
  });

  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  const pagesDataUrls: string[] = [];
  const pagesTextLines: string[][] = [];
  const extractedTextBlocks: ExtractedTextBlock[] = [];

  const pagesToRender = Math.min(numPages, maxPages);

  for (let pageNum = 1; pageNum <= pagesToRender; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    // 1. Rendu graphique Canvas pour aperçu haute définition
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (context) {
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);

      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);

      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };

      await page.render(renderContext).promise;
      const dataUrl = canvas.toDataURL('image/png', 0.95);
      pagesDataUrls.push(dataUrl);
    }

    // 2. Extraction du vrai texte natif du PDF pour template e-mail 100% éditable
    try {
      const textContent = await page.getTextContent();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items = (textContent.items || []) as Array<any>;

      const textItems = items
        .filter((item) => typeof item.str === 'string' && item.str.trim().length > 0)
        .map((item) => {
          const tx = item.transform || [12, 0, 0, 12, 0, 0];
          const [canvasX, canvasY] = viewport.convertToViewportPoint(tx[4], tx[5]);
          const fontHeight = Math.abs(tx[0]) || Math.abs(tx[3]) || 12;
          return {
            str: item.str,
            x: canvasX,
            y: canvasY,
            fontSize: fontHeight,
            width: item.width || 0
          };
        });

      // Trier verticalement de haut en bas, puis horizontalement
      textItems.sort((a, b) => {
        if (Math.abs(a.y - b.y) < 6) {
          return a.x - b.x;
        }
        return a.y - b.y;
      });

      // Grouper en lignes horizontales
      const pageLines: string[] = [];
      let currentLineItems: typeof textItems = [];
      let currentY = -1;

      for (const it of textItems) {
        if (currentY < 0 || Math.abs(it.y - currentY) < 7) {
          currentLineItems.push(it);
          currentY = it.y;
        } else {
          const lineStr = currentLineItems.map((ci) => ci.str).join(' ').trim();
          if (lineStr) pageLines.push(lineStr);
          currentLineItems = [it];
          currentY = it.y;
        }
      }
      if (currentLineItems.length > 0) {
        const lineStr = currentLineItems.map((ci) => ci.str).join(' ').trim();
        if (lineStr) pageLines.push(lineStr);
      }

      pagesTextLines.push(pageLines);

      // Grouper les lignes en paragraphes éditables
      let currentPara: string[] = [];
      let blockIdx = 1;

      for (const l of pageLines) {
        const trimmed = l.trim();
        // Si ligne courte isolée en majuscule ou avec deux-points -> titre de section
        const isHeader =
          trimmed.length < 65 &&
          (trimmed === trimmed.toUpperCase() || trimmed.endsWith(':')) &&
          !trimmed.match(/^[0-9\s.,-]+$/);

        if (isHeader) {
          if (currentPara.length > 0) {
            extractedTextBlocks.push({
              id: `para_${pageNum}_${blockIdx++}`,
              text: currentPara.join(' '),
              fontSize: 14,
              isHeading: false,
              y: 0
            });
            currentPara = [];
          }
          extractedTextBlocks.push({
            id: `head_${pageNum}_${blockIdx++}`,
            text: trimmed,
            fontSize: 17,
            isHeading: true,
            y: 0
          });
        } else {
          currentPara.push(trimmed);
          // Si la ligne se termine par un point et qu'on a déjà accumulé du texte -> nouveau paragraphe
          if (trimmed.endsWith('.') && currentPara.join(' ').length > 80) {
            extractedTextBlocks.push({
              id: `para_${pageNum}_${blockIdx++}`,
              text: currentPara.join(' '),
              fontSize: 14,
              isHeading: false,
              y: 0
            });
            currentPara = [];
          }
        }
      }

      if (currentPara.length > 0) {
        extractedTextBlocks.push({
          id: `para_${pageNum}_${blockIdx++}`,
          text: currentPara.join(' '),
          fontSize: 14,
          isHeading: false,
          y: 0
        });
      }
    } catch (textErr) {
      console.warn('Erreur extraction texte page PDF:', textErr);
    }
  }

  return {
    numPages,
    fileName,
    pagesDataUrls,
    pagesTextLines,
    extractedTextBlocks
  };
}
