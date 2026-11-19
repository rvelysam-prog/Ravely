/**
 * Parseur hybride gratuit et open-source pour documents Microsoft Word (.docx & .doc).
 * Extrait textes, paragraphes, polices, tailles, couleurs, alignements, tableaux,
 * séparateurs et images binaires embarquées (word/media/*) en conservant
 * strictement les pixels et proportions d'origine sans aucune génération IA.
 */

import JSZip from 'jszip';
import mammoth from 'mammoth';
import type {
  ReplicaAsset,
  ReplicaElement,
  ReplicaImageElement,
  ReplicaTableCell,
  ReplicaTableElement,
  ReplicaTextElement,
  ReplicaVisualRole
} from './documentReplicaService';

export interface ParsedWordDocumentResult {
  sourceFileType: 'docx' | 'doc';
  pageFormat: 'a4' | 'letter';
  orientation: 'portrait' | 'landscape';
  widthMm: number;
  heightMm: number;
  marginsMm: { top: number; right: number; bottom: number; left: number };
  pageCount: number;
  assets: ReplicaAsset[];
  elements: ReplicaElement[];
  palette: { primary: string; accent: string; text: string; highlight: string };
  sourcePageSnapshots: string[];
  engineNotes: string[];
}

function uint8ToDataUrl(bytes: Uint8Array, mime: string): string {
  let bin = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, Math.min(bytes.length, i + chunkSize));
    bin += String.fromCharCode(...slice);
  }
  return `data:${mime};base64,${btoa(bin)}`;
}

function computeHash(input: string): string {
  let h = 2166136261;
  const step = Math.max(1, Math.floor(input.length / 4000));
  for (let i = 0; i < input.length; i += step) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `h_${(h >>> 0).toString(16)}_${input.length}`;
}

function probeImageSize(src: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    if (typeof Image === 'undefined') {
      resolve({ w: 220, h: 100 });
      return;
    }
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth || 220, h: img.naturalHeight || 100 });
    img.onerror = () => resolve({ w: 220, h: 100 });
    img.src = src;
  });
}

function inferMimeFromFilename(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  if (lower.endsWith('.bmp')) return 'image/bmp';
  return 'image/png';
}

function normalizeHex(raw: string | null | undefined, fallback: string): string {
  if (!raw) return fallback;
  const clean = raw.trim().replace('#', '').toUpperCase();
  if (clean === 'AUTO' || clean === 'TRANSPARENT') return fallback;
  if (/^[0-9A-F]{6}$/.test(clean)) return `#${clean}`;
  if (/^[0-9A-F]{3}$/.test(clean)) {
    return `#${clean[0]}${clean[0]}${clean[1]}${clean[1]}${clean[2]}${clean[2]}`;
  }
  return fallback;
}

function classifyWordVisual(name: string, yPct: number, wPct: number, hPct: number, ratio: number): ReplicaVisualRole {
  const lower = name.toLowerCase();
  if (lower.includes('logo')) return 'logo';
  if (lower.includes('sign')) return 'signature';
  if (lower.includes('stamp') || lower.includes('cachet') || lower.includes('tampon')) return 'cachet';
  if (lower.includes('qr')) return 'qrcode';
  if (yPct < 24 && hPct < 20) return 'logo';
  if (yPct > 64 && wPct < 28 && ratio >= 0.7 && ratio <= 1.35) return 'cachet';
  if (yPct > 58 && hPct < 15) return 'signature';
  return 'illustration';
}

function renderSnapshotFromElements(
  elements: ReplicaElement[],
  assets: ReplicaAsset[],
  pageIndex: number,
  widthMm: number,
  heightMm: number
): string {
  if (typeof document === 'undefined') return '';
  const scale = 3.8;
  const cw = Math.round(widthMm * scale);
  const ch = Math.round(heightMm * scale);
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, cw, ch);

  const pageEls = elements.filter((e) => e.pageIndex === pageIndex).sort((a, b) => a.zIndex - b.zIndex);
  for (const el of pageEls) {
    const x = (el.xPct / 100) * cw;
    const y = (el.yPct / 100) * ch;
    const w = (el.wPct / 100) * cw;
    const h = (el.hPct / 100) * ch;

    if (el.kind === 'shape') {
      ctx.strokeStyle = el.strokeColor;
      ctx.lineWidth = Math.max(1, el.strokeWidthPx);
      if (el.shapeType === 'line_h') {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + w, y);
        ctx.stroke();
      } else {
        ctx.fillStyle = el.fillColor;
        ctx.fillRect(x, y, w, h);
      }
    } else if (el.kind === 'table') {
      const rCount = Math.max(1, el.rows.length);
      const rH = h / rCount;
      el.rows.forEach((row, rIdx) => {
        let cx = x;
        row.forEach((cell, cIdx) => {
          const cW = ((el.colWidthsPct[cIdx] || 100 / row.length) / 100) * w;
          ctx.fillStyle = cell.bgColor && cell.bgColor !== 'transparent' ? cell.bgColor : '#FFFFFF';
          ctx.fillRect(cx, y + rIdx * rH, cW, rH);
          ctx.strokeStyle = el.borderColor;
          ctx.lineWidth = 1;
          ctx.strokeRect(cx, y + rIdx * rH, cW, rH);
          ctx.fillStyle = cell.textColor || '#0F172A';
          ctx.font = `${cell.bold ? 'bold ' : ''}${Math.round(el.fontSizePt * 1.25)}px Arial`;
          ctx.fillText(cell.text.slice(0, 32), cx + 4, y + rIdx * rH + rH * 0.62, Math.max(8, cW - 8));
          cx += cW;
        });
      });
    } else if (el.kind === 'text') {
      if (el.backgroundColor && el.backgroundColor !== 'transparent') {
        ctx.fillStyle = el.backgroundColor;
        ctx.fillRect(x, y, w, h);
      }
      ctx.fillStyle = el.color || '#0F172A';
      const pxSize = Math.max(9, Math.round(el.fontSizePt * 1.28));
      const fFamily =
        el.fontFamily === 'serif' ? 'Georgia, serif' : el.fontFamily === 'monospace' ? 'monospace' : 'Arial, sans-serif';
      ctx.font = `${el.fontStyle === 'italic' ? 'italic ' : ''}${el.fontWeight === '700' || el.fontWeight === '800' ? 'bold ' : ''}${pxSize}px ${fFamily}`;
      const lines = el.text.split('\n');
      lines.forEach((line, lIdx) => {
        ctx.fillText(line, x, y + (lIdx + 0.85) * pxSize * el.lineHeight, Math.max(20, w));
      });
    }
  }

  // Note: images are asynchronous in canvas 2d; textual + structural snapshot already captures crisp page geometry.
  void assets;
  return canvas.toDataURL('image/png');
}

function getElementsByLocalName(parent: Document | Element, localName: string): Element[] {
  return Array.from(parent.getElementsByTagNameNS('*', localName));
}

function getFirstByLocalName(parent: Document | Element, localName: string): Element | null {
  return parent.getElementsByTagNameNS('*', localName)[0] || null;
}

export async function parseDocxDocument(file: File): Promise<ParsedWordDocumentResult> {
  const buffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);
  const engineNotes: string[] = [];

  const docXmlFile = zip.file('word/document.xml');
  if (!docXmlFile) {
    throw new Error('Archive DOCX invalide : word/document.xml introuvable.');
  }

  const docXmlText = await docXmlFile.async('string');
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(docXmlText, 'application/xml');

  // 1. Lire les relations images (word/_rels/document.xml.rels)
  const relMap = new Map<string, string>();
  const relsFile = zip.file('word/_rels/document.xml.rels');
  if (relsFile) {
    const relsXml = parser.parseFromString(await relsFile.async('string'), 'application/xml');
    for (const rel of getElementsByLocalName(relsXml, 'Relationship')) {
      const id = rel.getAttribute('Id') || '';
      const target = rel.getAttribute('Target') || '';
      if (id && target) {
        const cleanTarget = target.startsWith('word/') ? target : `word/${target.replace(/^\/+/, '')}`;
        relMap.set(id, cleanTarget);
      }
    }
  }

  // 2. Extraire tous les médias originaux dans word/media/* sans modification IA
  const mediaAssetsByPath = new Map<string, ReplicaAsset>();
  const mediaAssets: ReplicaAsset[] = [];
  for (const [zipPath, entry] of Object.entries(zip.files)) {
    if (!entry.dir && zipPath.startsWith('word/media/')) {
      const bytes = await entry.async('uint8array');
      const mime = inferMimeFromFilename(zipPath);
      const dataUrl = uint8ToDataUrl(bytes, mime);
      const dims = await probeImageSize(dataUrl);
      const fileName = zipPath.split('/').pop() || 'visuel.png';
      const asset: ReplicaAsset = {
        id: `asset_word_${mediaAssets.length + 1}`,
        name: fileName.replace(/\.[^.]+$/, ''),
        role: 'illustration',
        localDataUrl: dataUrl,
        hostingStatus: 'local',
        widthPx: dims.w,
        heightPx: dims.h,
        contentHash: computeHash(dataUrl),
        sourceEngine: 'word_media'
      };
      mediaAssetsByPath.set(zipPath, asset);
      mediaAssets.push(asset);
    }
  }
  if (mediaAssets.length > 0) {
    engineNotes.push(`${mediaAssets.length} média(s) Word originaux extraits depuis word/media/.`);
  }

  // 3. Lire géométrie page (w:pgSz & w:pgMar)
  let widthMm = 210;
  let heightMm = 297;
  let orientation: 'portrait' | 'landscape' = 'portrait';
  let pageFormat: 'a4' | 'letter' = 'a4';
  const marginsMm = { top: 18, right: 18, bottom: 18, left: 18 };

  const sectPr = getFirstByLocalName(xmlDoc, 'sectPr');
  if (sectPr) {
    const pgSz = getFirstByLocalName(sectPr, 'pgSz');
    if (pgSz) {
      const wTwip = Number(pgSz.getAttribute('w:w') || pgSz.getAttribute('w') || 11906);
      const hTwip = Number(pgSz.getAttribute('w:h') || pgSz.getAttribute('h') || 16838);
      const orientAttr = (pgSz.getAttribute('w:orient') || pgSz.getAttribute('orient') || '').toLowerCase();
      widthMm = Math.round((wTwip / 1440) * 25.4 * 10) / 10;
      heightMm = Math.round((hTwip / 1440) * 25.4 * 10) / 10;
      orientation = orientAttr === 'landscape' || widthMm > heightMm ? 'landscape' : 'portrait';
      const shortSide = Math.min(widthMm, heightMm);
      pageFormat = shortSide > 213 ? 'letter' : 'a4';
    }
    const pgMar = getFirstByLocalName(sectPr, 'pgMar');
    if (pgMar) {
      const twipToMm = (attr: string, def: number) => {
        const val = Number(pgMar.getAttribute(`w:${attr}`) || pgMar.getAttribute(attr));
        return Number.isFinite(val) && val > 0 ? Math.round((val / 1440) * 25.4) : def;
      };
      marginsMm.top = twipToMm('top', 18);
      marginsMm.right = twipToMm('right', 18);
      marginsMm.bottom = twipToMm('bottom', 18);
      marginsMm.left = twipToMm('left', 18);
    }
  }

  const contentLeftPct = Math.max(4, Math.min(20, (marginsMm.left / widthMm) * 100));
  const contentWidthPct = Math.max(55, 100 - contentLeftPct - Math.max(4, Math.min(20, (marginsMm.right / widthMm) * 100)));
  const contentTopPct = Math.max(4, Math.min(18, (marginsMm.top / heightMm) * 100));

  const body = getFirstByLocalName(xmlDoc, 'body');
  const elements: ReplicaElement[] = [];
  const paletteColorFreq = new Map<string, number>();

  let currentPage = 0;
  let cursorYPct = contentTopPct;
  const maxContentBottomPct = Math.max(82, 100 - (marginsMm.bottom / heightMm) * 100);
  const usedAssetIds = new Set<string>();

  const advancePageIfNeeded = (neededHPct: number) => {
    if (cursorYPct + neededHPct > maxContentBottomPct) {
      currentPage++;
      cursorYPct = contentTopPct;
    }
  };

  if (body) {
    const children = Array.from(body.children);
    for (const child of children) {
      const local = child.localName || child.nodeName.replace(/^.*:/, '');

      if (local === 'p') {
        // Saut de page explicite
        const hasPageBreak = getElementsByLocalName(child, 'br').some(
          (br) => (br.getAttribute('w:type') || br.getAttribute('type')) === 'page'
        );
        if (hasPageBreak && cursorYPct > contentTopPct + 2) {
          currentPage++;
          cursorYPct = contentTopPct;
        }

        // Vérifier dessins/images intégrés dans ce paragraphe
        const drawings = getElementsByLocalName(child, 'drawing');
        for (const drw of drawings) {
          const blip = getFirstByLocalName(drw, 'blip');
          const rEmbed = blip?.getAttribute('r:embed') || blip?.getAttribute('embed') || '';
          const mediaPath = relMap.get(rEmbed);
          const asset = mediaPath ? mediaAssetsByPath.get(mediaPath) : undefined;
          if (asset) {
            usedAssetIds.add(asset.id);
            const extent = getFirstByLocalName(drw, 'extent');
            const cxEmu = Number(extent?.getAttribute('cx') || 0);
            const cyEmu = Number(extent?.getAttribute('cy') || 0);
            const ratio = asset.heightPx > 0 ? asset.widthPx / asset.heightPx : 2;
            const wMmImg = cxEmu > 0 ? (cxEmu / 914400) * 25.4 : Math.min(72, widthMm * 0.28);
            const hMmImg = cyEmu > 0 ? (cyEmu / 914400) * 25.4 : wMmImg / Math.max(0.15, ratio);
            const wPct = Math.max(5, Math.min(contentWidthPct, Math.round((wMmImg / widthMm) * 1000) / 10));
            const hPct = Math.max(2.5, Math.min(45, Math.round((hMmImg / heightMm) * 1000) / 10));

            advancePageIfNeeded(hPct + 1);
            const pPr = getFirstByLocalName(child, 'pPr');
            const jcVal = (getFirstByLocalName(pPr || child, 'jc')?.getAttribute('w:val') || '').toLowerCase();
            const xPct =
              jcVal === 'right'
                ? contentLeftPct + contentWidthPct - wPct
                : jcVal === 'center'
                ? 50 - wPct / 2
                : contentLeftPct;

            const role = classifyWordVisual(asset.name, cursorYPct, wPct, hPct, ratio);
            asset.role = role;

            const imgEl: ReplicaImageElement = {
              id: `img_doc_p${currentPage + 1}_${elements.length + 1}`,
              kind: 'image',
              name: asset.name,
              pageIndex: currentPage,
              xPct: Math.round(xPct * 10) / 10,
              yPct: Math.round(cursorYPct * 10) / 10,
              wPct,
              hPct,
              zIndex: 24,
              rotation: 0,
              opacity: 100,
              locked: false,
              visible: true,
              lockAspectRatio: true,
              assetId: asset.id,
              visualRole: role
            };
            elements.push(imgEl);
            cursorYPct += hPct + 1.4;
          }
        }

        // Extraire texte & styles des runs w:r
        const pPr = getFirstByLocalName(child, 'pPr');
        const jcAttr = (
          getFirstByLocalName(pPr || child, 'jc')?.getAttribute('w:val') ||
          getFirstByLocalName(pPr || child, 'jc')?.getAttribute('val') ||
          'left'
        ).toLowerCase();
        const textAlign: ReplicaTextElement['textAlign'] =
          jcAttr === 'center'
            ? 'center'
            : jcAttr === 'right'
            ? 'right'
            : jcAttr === 'both' || jcAttr === 'justify'
            ? 'justify'
            : 'left';

        const pStyle = getFirstByLocalName(pPr || child, 'pStyle')?.getAttribute('w:val') || '';
        const shdFill = getFirstByLocalName(pPr || child, 'shd')?.getAttribute('w:fill');
        const pBgColor = shdFill && shdFill.toLowerCase() !== 'auto' ? normalizeHex(shdFill, 'transparent') : 'transparent';

        const runs = getElementsByLocalName(child, 'r');
        let fullText = '';
        let maxFontPt = pStyle.toLowerCase().includes('heading1') || pStyle.toLowerCase().includes('titre1') ? 16 : 10.5;
        let isBold = pStyle.toLowerCase().includes('heading') || pStyle.toLowerCase().includes('titre');
        let isItalic = false;
        let isUnderline = false;
        let textColor = '#1E293B';
        let fontFamily: ReplicaTextElement['fontFamily'] = 'sans-serif';

        for (const r of runs) {
          const rPr = getFirstByLocalName(r, 'rPr');
          if (rPr) {
            if (getFirstByLocalName(rPr, 'b')) isBold = true;
            if (getFirstByLocalName(rPr, 'i')) isItalic = true;
            if (getFirstByLocalName(rPr, 'u')) isUnderline = true;
            const szHalfPt = Number(
              getFirstByLocalName(rPr, 'sz')?.getAttribute('w:val') ||
                getFirstByLocalName(rPr, 'sz')?.getAttribute('val') ||
                0
            );
            if (szHalfPt > 0) maxFontPt = Math.max(maxFontPt, szHalfPt / 2);
            const colAttr =
              getFirstByLocalName(rPr, 'color')?.getAttribute('w:val') ||
              getFirstByLocalName(rPr, 'color')?.getAttribute('val');
            if (colAttr) {
              textColor = normalizeHex(colAttr, textColor);
              if (textColor !== '#000000' && textColor !== '#1E293B') {
                paletteColorFreq.set(textColor, (paletteColorFreq.get(textColor) || 0) + 1);
              }
            }
            const rFonts = getFirstByLocalName(rPr, 'rFonts');
            const fName = (
              rFonts?.getAttribute('w:ascii') ||
              rFonts?.getAttribute('w:hAnsi') ||
              ''
            ).toLowerCase();
            if (fName.includes('times') || fName.includes('georgia') || fName.includes('garamond') || fName.includes('cambria')) {
              fontFamily = 'serif';
            } else if (fName.includes('courier') || fName.includes('consolas') || fName.includes('mono')) {
              fontFamily = 'monospace';
            }
          }

          for (const node of Array.from(r.children)) {
            const nLocal = node.localName || node.nodeName.replace(/^.*:/, '');
            if (nLocal === 't') fullText += node.textContent || '';
            else if (nLocal === 'tab') fullText += '   ';
            else if (nLocal === 'br' && (node.getAttribute('w:type') || '') !== 'page') fullText += '\n';
          }
        }

        const cleanTxt = fullText.trim();
        if (cleanTxt.length > 0) {
          const lineEstimate = Math.max(
            1,
            cleanTxt.split('\n').reduce((sum, l) => sum + Math.max(1, Math.ceil(l.length / 78)), 0)
          );
          const hPct = Math.max(2.2, Math.min(35, lineEstimate * ((maxFontPt * 1.38) / (heightMm * 2.834)) * 100 + 0.6));
          advancePageIfNeeded(hPct);

          const role: ReplicaTextElement['role'] =
            cursorYPct < 13
              ? 'header'
              : maxFontPt >= 14.5
              ? 'title'
              : maxFontPt >= 12 && isBold
              ? 'subtitle'
              : cursorYPct > 86
              ? 'footer'
              : 'body';

          elements.push({
            id: `txt_doc_p${currentPage + 1}_${elements.length + 1}`,
            kind: 'text',
            name: cleanTxt.slice(0, 28),
            pageIndex: currentPage,
            xPct: Math.round(contentLeftPct * 10) / 10,
            yPct: Math.round(cursorYPct * 10) / 10,
            wPct: Math.round(contentWidthPct * 10) / 10,
            hPct: Math.round(hPct * 10) / 10,
            zIndex: 20,
            rotation: 0,
            opacity: 100,
            locked: false,
            visible: true,
            lockAspectRatio: false,
            text: cleanTxt,
            fontFamily,
            fontSizePt: Math.round(maxFontPt * 10) / 10,
            fontWeight: isBold ? '700' : '400',
            fontStyle: isItalic ? 'italic' : 'normal',
            textDecoration: isUnderline ? 'underline' : 'none',
            color: textColor,
            backgroundColor: pBgColor === '#FFFFFF' ? 'transparent' : pBgColor,
            textAlign,
            lineHeight: 1.36,
            letterSpacingEm: 0,
            role
          });
          cursorYPct += hPct + 1.0;
        } else {
          cursorYPct += 1.4;
        }

        // Ligne séparatrice sous paragraphe (w:pBdr -> w:bottom)
        const bottomBorder = getFirstByLocalName(pPr || child, 'bottom');
        if (bottomBorder && bottomBorder.getAttribute('w:val') && bottomBorder.getAttribute('w:val') !== 'none') {
          const lineColor = normalizeHex(bottomBorder.getAttribute('w:color'), '#0B2545');
          elements.push({
            id: `shp_doc_p${currentPage + 1}_${elements.length + 1}`,
            kind: 'shape',
            name: 'Filet horizontal Word',
            pageIndex: currentPage,
            xPct: Math.round(contentLeftPct * 10) / 10,
            yPct: Math.round(cursorYPct * 10) / 10,
            wPct: Math.round(contentWidthPct * 10) / 10,
            hPct: 0.4,
            zIndex: 10,
            rotation: 0,
            opacity: 100,
            locked: false,
            visible: true,
            lockAspectRatio: false,
            shapeType: 'line_h',
            fillColor: lineColor,
            strokeColor: lineColor,
            strokeWidthPx: 2
          });
          cursorYPct += 1.2;
        }
      } else if (local === 'tbl') {
        const wRows = getElementsByLocalName(child, 'tr');
        const rows: ReplicaTableCell[][] = [];
        let maxCols = 0;

        for (let rIdx = 0; rIdx < wRows.length; rIdx++) {
          const wCells = Array.from(wRows[rIdx].children).filter(
            (n) => (n.localName || n.nodeName.replace(/^.*:/, '')) === 'tc'
          );
          maxCols = Math.max(maxCols, wCells.length);
          const rowCells: ReplicaTableCell[] = wCells.map((tc) => {
            const cellText = getElementsByLocalName(tc, 'p')
              .map((p) =>
                getElementsByLocalName(p, 't')
                  .map((t) => t.textContent || '')
                  .join('')
              )
              .filter(Boolean)
              .join('\n')
              .trim();
            const tcPr = getFirstByLocalName(tc, 'tcPr');
            const shd = getFirstByLocalName(tcPr || tc, 'shd')?.getAttribute('w:fill');
            const cellBg = shd ? normalizeHex(shd, '#FFFFFF') : rIdx === 0 ? '#E8F2FF' : '#FFFFFF';
            const boldCell = rIdx === 0 || getElementsByLocalName(tc, 'b').length > 0;
            const jc = (getFirstByLocalName(tc, 'jc')?.getAttribute('w:val') || 'left').toLowerCase();
            const rColor = getFirstByLocalName(tc, 'color')?.getAttribute('w:val');
            return {
              text: cellText,
              bgColor: cellBg,
              textColor: normalizeHex(rColor, '#0F172A'),
              bold: boldCell,
              align: jc === 'center' ? 'center' : jc === 'right' ? 'right' : 'left'
            };
          });
          if (rowCells.length > 0) rows.push(rowCells);
        }

        if (rows.length > 0 && maxCols > 0) {
          // Normaliser nb colonnes par ligne
          for (const rw of rows) {
            while (rw.length < maxCols) {
              rw.push({ text: '', bgColor: '#FFFFFF', textColor: '#0F172A', bold: false, align: 'left' });
            }
          }

          const gridCols = getElementsByLocalName(child, 'gridCol').map((gc) =>
            Number(gc.getAttribute('w:w') || gc.getAttribute('w') || 1)
          );
          const totalGridW = gridCols.reduce((a, b) => a + b, 0);
          const colWidthsPct =
            gridCols.length === maxCols && totalGridW > 0
              ? gridCols.map((w) => Math.round((w / totalGridW) * 1000) / 10)
              : Array.from({ length: maxCols }, () => Math.round((100 / maxCols) * 10) / 10);

          const hPct = Math.max(7, Math.min(48, rows.length * 4.2 + 1.5));
          advancePageIfNeeded(hPct);

          const tblEl: ReplicaTableElement = {
            id: `tbl_doc_p${currentPage + 1}_${elements.length + 1}`,
            kind: 'table',
            name: `Tableau Word (${rows.length}×${maxCols})`,
            pageIndex: currentPage,
            xPct: Math.round(contentLeftPct * 10) / 10,
            yPct: Math.round(cursorYPct * 10) / 10,
            wPct: Math.round(contentWidthPct * 10) / 10,
            hPct: Math.round(hPct * 10) / 10,
            zIndex: 14,
            rotation: 0,
            opacity: 100,
            locked: false,
            visible: true,
            lockAspectRatio: false,
            rows,
            colWidthsPct,
            borderColor: '#94A3B8',
            borderWidthPx: 1,
            cellPaddingPx: 6,
            fontSizePt: 9.5
          };
          elements.push(tblEl);
          cursorYPct += hPct + 2.0;
        }
      }
    }
  }

  // Fallback si des médias n'étaient pas placés via w:drawing (ex: header/footer XML images)
  for (const asset of mediaAssets) {
    if (!usedAssetIds.has(asset.id)) {
      const ratio = asset.heightPx > 0 ? asset.widthPx / asset.heightPx : 2;
      const wPct = 20;
      const hPct = Math.max(3, Math.min(18, Math.round((wPct / Math.max(0.25, ratio)) * (widthMm / heightMm) * 10) / 10));
      asset.role = asset.name.toLowerCase().includes('sign') ? 'signature' : 'logo';
      elements.push({
        id: `img_doc_hdr_${elements.length + 1}`,
        kind: 'image',
        name: asset.name,
        pageIndex: 0,
        xPct: Math.round(contentLeftPct * 10) / 10,
        yPct: 4,
        wPct,
        hPct,
        zIndex: 25,
        rotation: 0,
        opacity: 100,
        locked: false,
        visible: true,
        lockAspectRatio: true,
        assetId: asset.id,
        visualRole: asset.role
      });
    }
  }

  // Palette dominante
  const rankedColors = Array.from(paletteColorFreq.entries()).sort((a, b) => b[1] - a[1]);
  const primary = rankedColors[0]?.[0] || '#0B2545';
  const accent = rankedColors[1]?.[0] || '#0066B3';

  const pageCount = Math.max(1, Math.min(6, currentPage + 1));
  const sourcePageSnapshots = Array.from({ length: pageCount }, (_, pIdx) =>
    renderSnapshotFromElements(elements, mediaAssets, pIdx, widthMm, heightMm)
  ).filter(Boolean);

  engineNotes.push(`OOXML Word (.docx) analysé : ${elements.filter((e) => e.kind === 'text').length} bloc(s) texte, ${elements.filter((e) => e.kind === 'table').length} tableau(x).`);

  return {
    sourceFileType: 'docx',
    pageFormat,
    orientation,
    widthMm,
    heightMm,
    marginsMm,
    pageCount,
    assets: mediaAssets,
    elements,
    palette: { primary, accent, text: '#1E293B', highlight: '#E8F2FF' },
    sourcePageSnapshots,
    engineNotes
  };
}

/**
 * Parseur .DOC (Word 97-2003 binaire, RTF déguisé, HTML déguisé, ou ZIP DOCX renommé en .doc).
 * Extrait le texte propre et découpe les images PNG/JPEG binaires intactes si présentes.
 */
export async function parseLegacyDocDocument(file: File): Promise<ParsedWordDocumentResult> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // 1. Cas fréquent : fichier .docx renommé en .doc (signature PK\x03\x04)
  if (bytes.length > 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) {
    return parseDocxDocument(file);
  }

  // Essayer mammoth si compatible
  try {
    const mammothRes = await mammoth.extractRawText({ arrayBuffer: buffer });
    if (mammothRes.value && mammothRes.value.trim().length > 20) {
      return buildStructuredResultFromPlainParagraphs(mammothRes.value.split(/\r?\n+/), [], 'docx', [
        'Document converti via extracteur Word Mammoth.'
      ]);
    }
  } catch {
    // Continuer avec analyseur binaire .doc / RTF / HTML
  }

  const headText = new TextDecoder('utf-8', { fatal: false }).decode(bytes.subarray(0, Math.min(bytes.length, 4096)));

  // 2. Cas HTML enregistré en .doc
  if (/<html|<body|<!doctype/i.test(headText)) {
    const htmlStr = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    const doc = new DOMParser().parseFromString(htmlStr, 'text/html');
    const paras: string[] = [];
    doc.body?.querySelectorAll('h1,h2,h3,h4,p,li,div').forEach((el) => {
      if (el.children.length === 0 || el.tagName === 'P' || el.tagName.startsWith('H')) {
        const t = (el.textContent || '').replace(/\s+/g, ' ').trim();
        if (t && !paras.includes(t)) paras.push(t);
      }
    });
    return buildStructuredResultFromPlainParagraphs(paras, [], 'doc', [
      'Document HTML au format .doc analysé structurellement.'
    ]);
  }

  // 3. Extraire images embarquées (PNG / JPEG) directement depuis les octets du fichier .doc
  const carvedAssets: ReplicaAsset[] = [];
  let idx = 0;
  while (idx < bytes.length - 16 && carvedAssets.length < 8) {
    // Signature PNG : 89 50 4E 47 0D 0A 1A 0A ... IEND
    if (
      bytes[idx] === 0x89 &&
      bytes[idx + 1] === 0x50 &&
      bytes[idx + 2] === 0x4e &&
      bytes[idx + 3] === 0x47
    ) {
      for (let end = idx + 16; end < Math.min(bytes.length - 4, idx + 1_500_000); end++) {
        if (
          bytes[end] === 0x49 &&
          bytes[end + 1] === 0x45 &&
          bytes[end + 2] === 0x4e &&
          bytes[end + 3] === 0x44
        ) {
          const slice = bytes.subarray(idx, Math.min(bytes.length, end + 8));
          const url = uint8ToDataUrl(slice, 'image/png');
          const dims = await probeImageSize(url);
          if (dims.w >= 24 && dims.h >= 16) {
            carvedAssets.push({
              id: `asset_doc_${carvedAssets.length + 1}`,
              name: `Visuel extrait .doc #${carvedAssets.length + 1}`,
              role: carvedAssets.length === 0 ? 'logo' : 'illustration',
              localDataUrl: url,
              hostingStatus: 'local',
              widthPx: dims.w,
              heightPx: dims.h,
              contentHash: computeHash(url),
              sourceEngine: 'word_media'
            });
          }
          idx = end + 8;
          break;
        }
      }
    }
    // Signature JPEG : FF D8 FF ... FF D9
    if (bytes[idx] === 0xff && bytes[idx + 1] === 0xd8 && bytes[idx + 2] === 0xff) {
      for (let end = idx + 64; end < Math.min(bytes.length - 2, idx + 1_500_000); end++) {
        if (bytes[end] === 0xff && bytes[end + 1] === 0xd9) {
          const slice = bytes.subarray(idx, end + 2);
          const url = uint8ToDataUrl(slice, 'image/jpeg');
          const dims = await probeImageSize(url);
          if (dims.w >= 24 && dims.h >= 16) {
            carvedAssets.push({
              id: `asset_doc_${carvedAssets.length + 1}`,
              name: `Image extraite .doc #${carvedAssets.length + 1}`,
              role: carvedAssets.length === 0 ? 'logo' : 'illustration',
              localDataUrl: url,
              hostingStatus: 'local',
              widthPx: dims.w,
              heightPx: dims.h,
              contentHash: computeHash(url),
              sourceEngine: 'word_media'
            });
          }
          idx = end + 2;
          break;
        }
      }
    }
    idx++;
  }

  // 4. Extraire les séquences de texte lisibles UTF-16LE / Latin-1 du flux binaire OLE .doc
  const lines: string[] = [];
  const latinText = new TextDecoder('latin1', { fatal: false }).decode(bytes);
  const matches = latinText.match(/[A-Za-zÀ-ÖØ-öø-ÿ0-9][A-Za-zÀ-ÖØ-öø-ÿ0-9 ,.;:'"()/\-–—€$%@#]{4,}/g) || [];
  for (const m of matches) {
    const clean = m.replace(/\s+/g, ' ').trim();
    if (
      clean.length >= 4 &&
      !/^(Root Entry|WordDocument|1Table|SummaryInformation|Microsoft|Times New Roman|Calibri|Arial|Normal)$/i.test(clean) &&
      !lines.includes(clean)
    ) {
      lines.push(clean);
    }
  }

  if (lines.length === 0 && carvedAssets.length === 0) {
    throw new Error('Impossible d’extraire un contenu exploitable de ce fichier .doc (fichier protégé ou vide).');
  }

  return buildStructuredResultFromPlainParagraphs(lines.slice(0, 80), carvedAssets, 'doc', [
    `Extracteur binaire .DOC : ${lines.length} bloc(s) texte et ${carvedAssets.length} image(s) binaire(s) récupérés.`
  ]);
}

function buildStructuredResultFromPlainParagraphs(
  paragraphs: string[],
  assets: ReplicaAsset[],
  sourceFileType: 'doc' | 'docx',
  engineNotes: string[]
): ParsedWordDocumentResult {
  const widthMm = 210;
  const heightMm = 297;
  const elements: ReplicaElement[] = [];
  let yPct = 8;
  let pageIdx = 0;

  assets.forEach((asset, idx) => {
    const ratio = asset.heightPx > 0 ? asset.widthPx / asset.heightPx : 2;
    const wPct = 20;
    const hPct = Math.max(3, Math.min(18, Math.round((wPct / Math.max(0.25, ratio)) * (widthMm / heightMm) * 10) / 10));
    elements.push({
      id: `img_legacy_${idx + 1}`,
      kind: 'image',
      name: asset.name,
      pageIndex: 0,
      xPct: idx === 0 ? 8 : 68,
      yPct: idx === 0 ? 5 : 74,
      wPct,
      hPct,
      zIndex: 25,
      rotation: 0,
      opacity: 100,
      locked: false,
      visible: true,
      lockAspectRatio: true,
      assetId: asset.id,
      visualRole: asset.role
    });
    if (idx === 0) yPct = Math.max(yPct, 5 + hPct + 2);
  });

  paragraphs.forEach((p, idx) => {
    const t = p.trim();
    if (!t) return;
    if (yPct > 86) {
      pageIdx++;
      yPct = 8;
    }
    const isTitle = idx === 0 || (t === t.toUpperCase() && t.length <= 70);
    const fontSizePt = isTitle ? 13 : 10.5;
    const lines = Math.max(1, Math.ceil(t.length / 82));
    const hPct = Math.max(2.4, lines * 2.2);
    elements.push({
      id: `txt_legacy_${idx + 1}`,
      kind: 'text',
      name: t.slice(0, 26),
      pageIndex: pageIdx,
      xPct: 8,
      yPct: Math.round(yPct * 10) / 10,
      wPct: 84,
      hPct: Math.round(hPct * 10) / 10,
      zIndex: 20,
      rotation: 0,
      opacity: 100,
      locked: false,
      visible: true,
      lockAspectRatio: false,
      text: t,
      fontFamily: 'sans-serif',
      fontSizePt,
      fontWeight: isTitle ? '700' : '400',
      fontStyle: 'normal',
      textDecoration: 'none',
      color: isTitle ? '#0B2545' : '#1E293B',
      backgroundColor: 'transparent',
      textAlign: isTitle ? 'center' : 'left',
      lineHeight: 1.38,
      letterSpacingEm: 0,
      role: isTitle ? 'title' : 'body'
    });
    yPct += hPct + 1.0;
  });

  const pageCount = pageIdx + 1;
  const sourcePageSnapshots = Array.from({ length: pageCount }, (_, p) =>
    renderSnapshotFromElements(elements, assets, p, widthMm, heightMm)
  ).filter(Boolean);

  return {
    sourceFileType,
    pageFormat: 'a4',
    orientation: 'portrait',
    widthMm,
    heightMm,
    marginsMm: { top: 18, right: 18, bottom: 18, left: 18 },
    pageCount,
    assets,
    elements,
    palette: { primary: '#0B2545', accent: '#0066B3', text: '#1E293B', highlight: '#E8F2FF' },
    sourcePageSnapshots,
    engineNotes
  };
}
