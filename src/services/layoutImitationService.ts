/**
 * Service gratuit et 100% côté client d'analyse visuelle de documents de référence
 * (PDF via pdfjs-dist et Images JPG/PNG/WEBP via HTML5 Canvas) pour imiter leur mise en page,
 * détecter les visuels requis (tampon, filigrane, logo, signature, codes) et persister
 * automatiquement chaque modèle dans Firestore.
 */

import * as pdfjsLib from 'pdfjs-dist';
import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import {
  ActorScopeId,
  ImportedAssetKey,
  UploadedAssetUrlsMap
} from './departmentsAndEmailService';

if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${
    pdfjsLib.version || '3.11.174'
  }/pdf.worker.min.js`;
}

export type LayoutTargetDocKey = 't9' | 't10' | 't11' | 't12' | 'doc_es';

export type DetectedRefElement =
  | 'logo'
  | 'signature'
  | 'cachet'
  | 'filigrane'
  | 'arrierePlan'
  | 'barcode'
  | 'qrcode';

export type LayoutArchetype =
  | 'letterhead_split'
  | 'boxed_certificate'
  | 'executive_banner'
  | 'table_report';

export interface ReferenceLayoutTemplate {
  docKey: LayoutTargetDocKey;
  sourceFileName: string;
  sourceFileType: 'pdf' | 'image';
  analyzedAt: string;
  previewThumbnailUrl: string;
  pageFormat: 'a4' | 'letter';
  orientation: 'portrait' | 'landscape';
  marginsMm: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  primaryColor: string;
  accentColor: string;
  highlightTintColor?: string;
  headerBgColor: string;
  headerTextColor: string;
  bodyTextColor: string;
  pageBgColor: string;
  borderColor: string;
  borderStyle: 'none' | 'simple' | 'double' | 'card_blocks' | 'official_band';
  headerStyle: 'bandeau_plein' | 'entete_epure' | 'encadre_classique' | 'split_officiel';
  headerAlign: 'left' | 'center' | 'split';
  fontFamily: 'helvetica' | 'times' | 'courier';
  blockSpacing: 'compact' | 'standard' | 'airy';
  logoPlacement: 'top_left' | 'top_center' | 'top_right';
  signaturePlacement: 'bottom_left' | 'bottom_right' | 'bottom_split';
  layoutArchetype?: LayoutArchetype;
  hasTwoColumnMeta?: boolean;
  hasRefHighlightBox?: boolean;
  hasCenteredTitleBlock?: boolean;
  signatureZoneStyle?: 'two_col_fait_a_right_sig' | 'three_col_footer';
  hasBottomLegalFooter?: boolean;
  singlePageFit?: boolean;
  hasTablesDetected: boolean;
  detectedElements: DetectedRefElement[];
  ignoredMissingElements: DetectedRefElement[];
  detectedSummary: string;
}

export function mixHexWithWhite(hex: string, whiteRatio = 0.86): string {
  const [r, g, b] = hexToRgbTuple(hex);
  const w = Math.max(0, Math.min(0.96, whiteRatio));
  const mr = Math.round(r * (1 - w) + 255 * w);
  const mg = Math.round(g * (1 - w) + 255 * w);
  const mb = Math.round(b * (1 - w) + 255 * w);
  return `#${[mr, mg, mb].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

export function resolveEffectiveLayout(
  tpl?: ReferenceLayoutTemplate
): (ReferenceLayoutTemplate & {
  layoutArchetype: LayoutArchetype;
  highlightTintColor: string;
  hasTwoColumnMeta: boolean;
  hasRefHighlightBox: boolean;
  hasCenteredTitleBlock: boolean;
  signatureZoneStyle: 'two_col_fait_a_right_sig' | 'three_col_footer';
  hasBottomLegalFooter: boolean;
  singlePageFit: boolean;
}) | undefined {
  if (!tpl) return undefined;
  const archetype: LayoutArchetype =
    tpl.layoutArchetype ||
    (tpl.headerStyle === 'bandeau_plein'
      ? 'executive_banner'
      : tpl.borderStyle === 'double' || tpl.borderStyle === 'simple'
      ? 'boxed_certificate'
      : 'letterhead_split');

  return {
    ...tpl,
    layoutArchetype: archetype,
    highlightTintColor: tpl.highlightTintColor || mixHexWithWhite(tpl.primaryColor || '#0B2545', 0.87),
    hasTwoColumnMeta: tpl.hasTwoColumnMeta ?? archetype === 'letterhead_split',
    hasRefHighlightBox: tpl.hasRefHighlightBox ?? archetype === 'letterhead_split',
    hasCenteredTitleBlock: tpl.hasCenteredTitleBlock ?? archetype === 'letterhead_split',
    signatureZoneStyle:
      tpl.signatureZoneStyle ||
      (archetype === 'letterhead_split' ? 'two_col_fait_a_right_sig' : 'three_col_footer'),
    hasBottomLegalFooter: tpl.hasBottomLegalFooter ?? archetype === 'letterhead_split',
    singlePageFit: tpl.singlePageFit ?? true
  };
}

export type LayoutTemplatesMap = Partial<Record<LayoutTargetDocKey, ReferenceLayoutTemplate>>;

export interface MissingVisualAssetNotice {
  element: DetectedRefElement;
  assetKey: ImportedAssetKey;
  label: string;
  description: string;
  actorLabel: string;
  isIgnored: boolean;
}

const LS_LAYOUT_TEMPLATES_KEY = 'atlantic_layout_templates_v1';
const COLLECTION_NAME = 'document_layout_templates';

export const ELEMENT_LABELS: Record<DetectedRefElement, { label: string; description: string }> = {
  logo: {
    label: 'Logo Officiel / En-tête',
    description: 'Un logo a été détecté en haut du document modèle.'
  },
  signature: {
    label: 'Signature manuscrite / habilitée',
    description: 'Une zone de signature a été repérée sur le document modèle.'
  },
  cachet: {
    label: 'Tampon / Cachet ou Sceau officiel',
    description: 'Un tampon ou sceau d’authentification est présent sur le document modèle.'
  },
  filigrane: {
    label: 'Filigrane (Watermark de fond)',
    description: 'Un filigrane centré en transparence est visible en arrière-fond du modèle.'
  },
  arrierePlan: {
    label: 'Arrière-plan / Cadre de page',
    description: 'Un habillage ou fond de page stylisé caractérise ce modèle.'
  },
  barcode: {
    label: 'Code-Barres d’authentification',
    description: 'Un code-barres horizontal est présent sur le modèle de référence.'
  },
  qrcode: {
    label: 'QR Code de vérification',
    description: 'Un QR Code carré est affiché sur le document modèle.'
  }
};

export function getActorScopeForDocKey(docKey: LayoutTargetDocKey): ActorScopeId {
  switch (docKey) {
    case 't9':
      return 'hebEmployeur';
    case 't10':
      return 'notaire';
    case 't11':
      return 'inspecteurHir';
    case 't12':
      return 'commissaireDeclaration';
    case 'doc_es':
      return 'employeur';
  }
}

export function getActorLabelForDocKey(docKey: LayoutTargetDocKey): string {
  switch (docKey) {
    case 't9':
      return '3. Hébergement (Onglet 9)';
    case 't10':
      return '4. Notaire BC (Onglet 10)';
    case 't11':
      return '5. Inspecteur HIR (Onglet 11)';
    case 't12':
      return '6. Déclaration CER-CLT (Onglet 12)';
    case 'doc_es':
      return '1. Entreprise Employeur (DOC ES)';
  }
}

export function getAssetKeysForDocKey(
  docKey: LayoutTargetDocKey
): Record<DetectedRefElement, ImportedAssetKey> {
  if (docKey === 'doc_es') {
    return {
      logo: 'logo',
      signature: 'signature',
      cachet: 'cachet',
      filigrane: 'filigrane',
      arrierePlan: 'arrierePlan',
      barcode: 'barcodeEmployeur',
      qrcode: 'qrcodeEmployeur'
    };
  }
  const actor = getActorScopeForDocKey(docKey);
  return {
    logo: `${actor}_logo` as ImportedAssetKey,
    signature: `${actor}_signature` as ImportedAssetKey,
    cachet: `${actor}_cachet` as ImportedAssetKey,
    filigrane: `${actor}_filigrane` as ImportedAssetKey,
    arrierePlan: `${actor}_arrierePlan` as ImportedAssetKey,
    barcode: `${actor}_barcode` as ImportedAssetKey,
    qrcode: `${actor}_qrcode` as ImportedAssetKey
  };
}

export function getMissingVisualAssetsForTemplate(
  docKey: LayoutTargetDocKey,
  template: ReferenceLayoutTemplate | undefined,
  uploadedAssets: UploadedAssetUrlsMap
): MissingVisualAssetNotice[] {
  if (!template || !template.detectedElements?.length) return [];
  const keyMap = getAssetKeysForDocKey(docKey);
  const actorLabel = getActorLabelForDocKey(docKey);
  const ignoredSet = new Set(template.ignoredMissingElements || []);

  const missing: MissingVisualAssetNotice[] = [];
  for (const el of template.detectedElements) {
    const assetKey = keyMap[el];
    const currentUrl = uploadedAssets[assetKey];
    if (!currentUrl || !currentUrl.trim()) {
      missing.push({
        element: el,
        assetKey,
        label: ELEMENT_LABELS[el].label,
        description: ELEMENT_LABELS[el].description,
        actorLabel,
        isIgnored: ignoredSet.has(el)
      });
    }
  }
  return missing;
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return `#${[clamp(r), clamp(g), clamp(b)]
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('')}`;
}

export function hexToRgbTuple(hex: string): [number, number, number] {
  const clean = (hex || '#0B2545').replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean.padEnd(6, '0').slice(0, 6);
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return [11, 37, 69];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function isNearWhite(r: number, g: number, b: number, threshold = 238): boolean {
  return r >= threshold && g >= threshold && b >= threshold;
}

function colorSaturation(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

function luminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

interface PdfTextZonesInsight {
  numPages: number;
  hasLeftUpperBlock: boolean;
  hasRightUpperBlock: boolean;
  hasCenteredTitle: boolean;
  hasLeftRefKeyValues: boolean;
  hasBottomLeftFaitA: boolean;
  hasBottomRightSig: boolean;
  hasFooterStrip: boolean;
}

async function renderFileToAnalysisCanvas(file: File): Promise<{
  canvas: HTMLCanvasElement;
  fileType: 'pdf' | 'image';
  pdfTextZones?: PdfTextZonesInsight;
}> {
  const isPdf =
    file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

  if (isPdf) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);
    const viewport0 = page.getViewport({ scale: 1 });
    const targetScale = Math.min(2.0, Math.max(1.0, 760 / viewport0.width));
    const viewport = page.getViewport({ scale: targetScale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Contexte Canvas 2D indisponible.');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvasContext: ctx, viewport }).promise;

    // Extraire la géométrie exacte des zones de texte PDF
    let pdfTextZones: PdfTextZonesInsight | undefined;
    try {
      const textContent = await page.getTextContent();
      const pw = viewport0.width || 595;
      const ph = viewport0.height || 842;

      let leftUpper = 0;
      let rightUpper = 0;
      let centeredMidCount = 0;
      let leftRefCount = 0;
      let bottomLeftCount = 0;
      let bottomRightCount = 0;
      let footerStripCount = 0;

      for (const item of textContent.items as Array<{ str?: string; transform?: number[]; width?: number; height?: number }>) {
        const text = (item.str || '').trim();
        if (!text || !item.transform) continue;
        const tx = item.transform[4] || 0;
        const ty = item.transform[5] || 0;
        const fontSize = Math.abs(item.transform[0] || item.height || 10);
        const w = item.width || text.length * fontSize * 0.45;

        const xPct = tx / pw;
        const yPctTop = 1 - ty / ph; // 0 = haut de page, 1 = bas de page
        const xCenterPct = (tx + w / 2) / pw;

        if (yPctTop >= 0.10 && yPctTop <= 0.36) {
          if (xPct < 0.44) leftUpper++;
          if (xPct > 0.50) rightUpper++;
        }
        if (yPctTop >= 0.23 && yPctTop <= 0.42 && xPct < 0.50) {
          if (text.includes(':') || text.toLowerCase().includes('réf') || text.includes('N°')) {
            leftRefCount++;
          }
        }
        if (yPctTop >= 0.34 && yPctTop <= 0.54) {
          if (xCenterPct >= 0.34 && xCenterPct <= 0.68 && (fontSize >= 11 || text.length > 10)) {
            centeredMidCount++;
          }
        }
        if (yPctTop >= 0.64 && yPctTop <= 0.87) {
          if (xPct < 0.46) bottomLeftCount++;
          if (xPct > 0.48) bottomRightCount++;
        }
        if (yPctTop > 0.87) {
          footerStripCount++;
        }
      }

      pdfTextZones = {
        numPages: pdf.numPages || 1,
        hasLeftUpperBlock: leftUpper >= 2,
        hasRightUpperBlock: rightUpper >= 2,
        hasCenteredTitle: centeredMidCount >= 1,
        hasLeftRefKeyValues: leftRefCount >= 1,
        hasBottomLeftFaitA: bottomLeftCount >= 1,
        hasBottomRightSig: bottomRightCount >= 1,
        hasFooterStrip: footerStripCount >= 1
      };
    } catch {
      // Fallback sur analyse canvas si getTextContent indisponible
    }

    return { canvas, fileType: 'pdf', pdfTextZones };
  }

  // Image JPG / PNG / WEBP
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('Lecture du fichier image impossible.'));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Format image non supporté.'));
    el.src = dataUrl;
  });

  const maxW = 760;
  const scale = img.naturalWidth > maxW ? maxW / img.naturalWidth : 1;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(120, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(120, Math.round(img.naturalHeight * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Contexte Canvas 2D indisponible.');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  return { canvas, fileType: 'image' };
}

function createCompressedThumbnail(sourceCanvas: HTMLCanvasElement): string {
  const maxThumbW = 540;
  const scale = sourceCanvas.width > maxThumbW ? maxThumbW / sourceCanvas.width : 1;
  const thumb = document.createElement('canvas');
  thumb.width = Math.round(sourceCanvas.width * scale);
  thumb.height = Math.round(sourceCanvas.height * scale);
  const tctx = thumb.getContext('2d');
  if (!tctx) return '';
  tctx.fillStyle = '#ffffff';
  tctx.fillRect(0, 0, thumb.width, thumb.height);
  tctx.drawImage(sourceCanvas, 0, 0, thumb.width, thumb.height);
  return thumb.toDataURL('image/jpeg', 0.72);
}

/**
 * Analyse la géométrie, la palette, les colonnes, les zones structurelles,
 * les marges, les encadrements réels et les visuels présents sur un document modèle.
 */
export async function analyzeReferenceDocumentFile(
  file: File,
  docKey: LayoutTargetDocKey
): Promise<ReferenceLayoutTemplate> {
  const { canvas, fileType, pdfTextZones } = await renderFileToAnalysisCanvas(file);
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Analyse Canvas impossible.');
  const { data } = ctx.getImageData(0, 0, w, h);

  // 1. Format & orientation
  const orientation: 'portrait' | 'landscape' = w > h ? 'landscape' : 'portrait';
  const ratio = Math.min(w, h) / Math.max(w, h);
  const pageFormat: 'a4' | 'letter' = ratio > 0.745 ? 'letter' : 'a4';
  const pageWidthMm =
    orientation === 'portrait'
      ? pageFormat === 'a4'
        ? 210
        : 215.9
      : pageFormat === 'a4'
      ? 297
      : 279.4;
  const pageHeightMm =
    orientation === 'portrait'
      ? pageFormat === 'a4'
        ? 297
        : 279.4
      : pageFormat === 'a4'
      ? 210
      : 215.9;

  // Échantillonner fond de page depuis les bords (4px)
  let bgR = 0;
  let bgG = 0;
  let bgB = 0;
  let bgCount = 0;
  for (let y = 4; y < h - 4; y += 6) {
    for (const x of [4, w - 5]) {
      const idx = (y * w + x) * 4;
      bgR += data[idx];
      bgG += data[idx + 1];
      bgB += data[idx + 2];
      bgCount++;
    }
  }
  const avgBgR = bgCount ? bgR / bgCount : 255;
  const avgBgG = bgCount ? bgG / bgCount : 255;
  const avgBgB = bgCount ? bgB / bgCount : 255;
  const pageBgHex =
    luminance(avgBgR, avgBgG, avgBgB) > 246 ? '#FFFFFF' : rgbToHex(avgBgR, avgBgG, avgBgB);

  const isInkAt = (x: number, y: number): boolean => {
    const idx = (y * w + x) * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const diffBg = Math.abs(r - avgBgR) + Math.abs(g - avgBgG) + Math.abs(b - avgBgB);
    return !isNearWhite(r, g, b, 236) && diffBg > 24;
  };

  // 2. Détection stricte d'un VRAI cadre de bordure continu sur les 4 côtés
  const checkHorizontalLineCoverage = (yStartPct: number, yEndPct: number): { maxRun: number; lineCount: number } => {
    const y0 = Math.max(2, Math.round(h * yStartPct));
    const y1 = Math.min(h - 3, Math.round(h * yEndPct));
    const x0 = Math.round(w * 0.14);
    const x1 = Math.round(w * 0.86);
    const span = Math.max(1, (x1 - x0) / 2);
    let maxRun = 0;
    let lineCount = 0;
    for (let y = y0; y <= y1; y++) {
      let hits = 0;
      for (let x = x0; x <= x1; x += 2) {
        if (isInkAt(x, y)) hits++;
      }
      const cov = hits / span;
      if (cov > maxRun) maxRun = cov;
      if (cov > 0.62) lineCount++;
    }
    return { maxRun, lineCount };
  };

  const checkVerticalLineCoverage = (xStartPct: number, xEndPct: number): { maxRun: number; lineCount: number } => {
    const x0 = Math.max(2, Math.round(w * xStartPct));
    const x1 = Math.min(w - 3, Math.round(w * xEndPct));
    const y0 = Math.round(h * 0.14);
    const y1 = Math.round(h * 0.86);
    const span = Math.max(1, (y1 - y0) / 2);
    let maxRun = 0;
    let lineCount = 0;
    for (let x = x0; x <= x1; x++) {
      let hits = 0;
      for (let y = y0; y <= y1; y += 2) {
        if (isInkAt(x, y)) hits++;
      }
      const cov = hits / span;
      if (cov > maxRun) maxRun = cov;
      if (cov > 0.62) lineCount++;
    }
    return { maxRun, lineCount };
  };

  const topFrame = checkHorizontalLineCoverage(0.015, 0.085);
  const bottomFrame = checkHorizontalLineCoverage(0.915, 0.985);
  const leftFrame = checkVerticalLineCoverage(0.015, 0.085);
  const rightFrame = checkVerticalLineCoverage(0.915, 0.985);

  const hasTrueOuterBox =
    topFrame.maxRun >= 0.6 &&
    bottomFrame.maxRun >= 0.6 &&
    leftFrame.maxRun >= 0.6 &&
    rightFrame.maxRun >= 0.6;
  const hasDoubleOuterBox =
    hasTrueOuterBox &&
    topFrame.lineCount >= 4 &&
    bottomFrame.lineCount >= 4 &&
    leftFrame.lineCount >= 4 &&
    rightFrame.lineCount >= 4;

  // 3. Parcours des pixels pour bounding box, palette, pastel pill, zones 2-colonnes et visuels
  let minX = w;
  let maxX = 0;
  let minY = h;
  let maxY = 0;

  let headerDarkR = 0;
  let headerDarkG = 0;
  let headerDarkB = 0;
  let headerDarkCount = 0;

  let headerSaturatedScore = -1;
  let bestPrimary: [number, number, number] = [11, 37, 69];
  let bestAccent: [number, number, number] = [212, 160, 23];
  let accentScore = -1;

  let pastelR = 0;
  let pastelG = 0;
  let pastelB = 0;
  let pastelCount = 0;

  const headerEndY = Math.round(h * 0.14);
  const metaStartY = Math.round(h * 0.12);
  const metaEndY = Math.round(h * 0.37);
  const titleStartY = Math.round(h * 0.34);
  const titleEndY = Math.round(h * 0.52);
  const sigStartY = Math.round(h * 0.66);
  const footerStartY = Math.round(h * 0.85);
  const step = 2;

  let headerLeftInk = 0;
  let headerCenterInk = 0;
  let headerRightInk = 0;

  let metaLeftInk = 0;
  let metaRightInk = 0;
  let titleCenterInk = 0;
  let titleSideInk = 0;
  let sigLeftInk = 0;
  let sigRightInk = 0;
  let footerLeftQrInk = 0;
  let footerCenterInk = 0;
  let footerRightInk = 0;

  let centerWatermarkSoftCount = 0;
  let bottomStampSaturatedCount = 0;
  let midHorizontalLines = 0;

  for (let y = 0; y < h; y += step) {
    let rowInkCount = 0;
    for (let x = 0; x < w; x += step) {
      const idx = (y * w + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      const sat = colorSaturation(r, g, b);
      const lum = luminance(r, g, b);

      // Détection pastille pastel (ex: badge "Vos références" vert menthe / bleu pâle)
      if (
        y >= h * 0.20 &&
        y <= h * 0.44 &&
        x >= w * 0.05 &&
        x <= w * 0.46 &&
        sat >= 0.08 &&
        sat <= 0.45 &&
        lum >= 200 &&
        lum <= 248
      ) {
        pastelR += r;
        pastelG += g;
        pastelB += b;
        pastelCount++;
      }

      const diffBg = Math.abs(r - avgBgR) + Math.abs(g - avgBgG) + Math.abs(b - avgBgB);
      const nonWhite = !isNearWhite(r, g, b, 236) && diffBg > 24;

      if (nonWhite) {
        rowInkCount++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;

        // Zone en-tête supérieure (0 - 14%)
        if (y < headerEndY) {
          if (x < w * 0.38) headerLeftInk++;
          else if (x < w * 0.65) headerCenterInk++;
          else headerRightInk++;

          if (lum < 155) {
            headerDarkR += r;
            headerDarkG += g;
            headerDarkB += b;
            headerDarkCount++;
          }

          const score = sat * 110 + (220 - lum) * 0.35;
          if (sat > 0.18 && lum < 200 && score > headerSaturatedScore) {
            headerSaturatedScore = score;
            bestPrimary = [r, g, b];
          }
          if (sat > 0.30 && lum >= 100 && lum <= 225 && sat * 100 > accentScore) {
            accentScore = sat * 100;
            bestAccent = [r, g, b];
          }
        }

        // Zone coordonnées 2 colonnes (12% - 37%)
        if (y >= metaStartY && y <= metaEndY) {
          if (x >= w * 0.05 && x < w * 0.44) metaLeftInk++;
          if (x >= w * 0.50 && x <= w * 0.93) metaRightInk++;
        }

        // Zone titre central (34% - 52%)
        if (y >= titleStartY && y <= titleEndY) {
          if (x >= w * 0.25 && x <= w * 0.75) titleCenterInk++;
          else titleSideInk++;
        }

        // Zone filigrane (tons doux gris/pastel au centre, loin du texte noir vif)
        if (
          x > w * 0.25 &&
          x < w * 0.75 &&
          y > h * 0.32 &&
          y < h * 0.68 &&
          lum > 188 &&
          lum < 238
        ) {
          centerWatermarkSoftCount++;
        }

        // Zone signatures (66% - 86%)
        if (y >= sigStartY && y < footerStartY) {
          if (x < w * 0.45) sigLeftInk++;
          if (x >= w * 0.48) sigRightInk++;
          if (sat > 0.26 && lum < 210) {
            bottomStampSaturatedCount++;
          }
        }

        // Bandeau pied de page (85% - 98%)
        if (y >= footerStartY) {
          if (x < w * 0.22 && lum < 140) footerLeftQrInk++;
          else if (x >= w * 0.22 && x < w * 0.78) footerCenterInk++;
          else if (x >= w * 0.78) footerRightInk++;

          if (sat > 0.26 && lum < 210) {
            bottomStampSaturatedCount++;
          }
        }
      }
    }
    if (y > headerEndY && y < sigStartY && rowInkCount > (w / step) * 0.55) {
      midHorizontalLines++;
    }
  }

  // Marges réalistes (mm)
  const clampMm = (v: number, fallback: number) =>
    Number.isFinite(v) ? Math.max(10, Math.min(30, Math.round(v))) : fallback;

  const marginLeft = maxX > minX ? clampMm((minX / w) * pageWidthMm, 18) : 18;
  const marginRight = maxX > minX ? clampMm(((w - maxX) / w) * pageWidthMm, 18) : 18;
  const marginTop = maxY > minY ? clampMm((minY / h) * pageHeightMm, 14) : 14;
  const marginBottom = maxY > minY ? clampMm(((h - maxY) / w) * pageHeightMm, 14) : 14;

  // Couleurs extraites
  const primaryColor = rgbToHex(bestPrimary[0], bestPrimary[1], bestPrimary[2]);
  const accentColor =
    accentScore > 20 ? rgbToHex(bestAccent[0], bestAccent[1], bestAccent[2]) : primaryColor;
  const highlightTintColor =
    pastelCount >= 28
      ? rgbToHex(pastelR / pastelCount, pastelG / pastelCount, pastelB / pastelCount)
      : mixHexWithWhite(primaryColor, 0.87);

  // Bandeau d'en-tête plein uniquement si l'en-tête supérieur est massivement coloré (>28%)
  const headerAreaPixels = (w * headerEndY) / (step * step);
  const isFilledHeaderBanner = headerDarkCount > headerAreaPixels * 0.28;
  const headerBgColor = isFilledHeaderBanner
    ? rgbToHex(
        headerDarkR / headerDarkCount,
        headerDarkG / headerDarkCount,
        headerDarkB / headerDarkCount
      )
    : primaryColor;
  const headerTextColor = '#FFFFFF';

  // Style d'encadrement exact
  const borderStyle: ReferenceLayoutTemplate['borderStyle'] = hasDoubleOuterBox
    ? 'double'
    : hasTrueOuterBox
    ? 'simple'
    : midHorizontalLines >= 4 && !pdfTextZones?.hasCenteredTitle
    ? 'card_blocks'
    : 'none';

  // Style d'en-tête exact
  const headerStyle: ReferenceLayoutTemplate['headerStyle'] = isFilledHeaderBanner
    ? 'bandeau_plein'
    : borderStyle === 'double' || borderStyle === 'simple'
    ? 'encadre_classique'
    : headerLeftInk > 50 && headerRightInk > 30
    ? 'split_officiel'
    : 'entete_epure';

  // Zones structurelles détectées
  const hasTwoColumnMeta =
    Boolean(pdfTextZones?.hasLeftUpperBlock && pdfTextZones?.hasRightUpperBlock) ||
    (metaLeftInk > 80 && metaRightInk > 60);
  const hasCenteredTitleBlock =
    Boolean(pdfTextZones?.hasCenteredTitle) ||
    (titleCenterInk > 80 && titleCenterInk > titleSideInk * 1.15);
  const hasRefHighlightBox =
    pastelCount >= 24 || Boolean(pdfTextZones?.hasLeftRefKeyValues);
  const hasBottomLegalFooter =
    Boolean(pdfTextZones?.hasFooterStrip) || footerCenterInk > 40 || footerLeftQrInk > 50;

  const layoutArchetype: LayoutArchetype = isFilledHeaderBanner
    ? 'executive_banner'
    : borderStyle === 'double' || borderStyle === 'simple'
    ? 'boxed_certificate'
    : midHorizontalLines >= 6 && !hasCenteredTitleBlock
    ? 'table_report'
    : 'letterhead_split';

  const headerAlign: ReferenceLayoutTemplate['headerAlign'] =
    layoutArchetype === 'letterhead_split'
      ? 'left'
      : headerCenterInk > headerLeftInk * 1.4
      ? 'center'
      : 'left';

  const logoPlacement: ReferenceLayoutTemplate['logoPlacement'] =
    headerRightInk > headerLeftInk * 1.6
      ? 'top_right'
      : headerCenterInk > headerLeftInk * 1.5
      ? 'top_center'
      : 'top_left';

  const signatureZoneStyle: ReferenceLayoutTemplate['signatureZoneStyle'] =
    layoutArchetype === 'letterhead_split' ||
    (Boolean(pdfTextZones?.hasBottomLeftFaitA && pdfTextZones?.hasBottomRightSig) ||
      (sigLeftInk > 30 && sigRightInk > 70))
      ? 'two_col_fait_a_right_sig'
      : 'three_col_footer';

  const blockSpacing: ReferenceLayoutTemplate['blockSpacing'] =
    layoutArchetype === 'letterhead_split' ? 'compact' : 'standard';

  const fontFamily: ReferenceLayoutTemplate['fontFamily'] =
    borderStyle === 'double' ||
    file.name.toLowerCase().includes('notar') ||
    file.name.toLowerCase().includes('declar')
      ? 'times'
      : 'helvetica';

  // Éléments visuels détectés
  const detectedElements: DetectedRefElement[] = [];
  if (headerLeftInk > 40 || headerCenterInk > 60 || headerRightInk > 40) {
    detectedElements.push('logo');
  }
  if (sigRightInk > 65 || sigLeftInk > 80) {
    detectedElements.push('signature');
  }
  if (bottomStampSaturatedCount > 45 || borderStyle === 'double' || borderStyle === 'simple') {
    detectedElements.push('cachet');
  }
  if (centerWatermarkSoftCount > 260) {
    detectedElements.push('filigrane');
  }
  if (pageBgHex !== '#FFFFFF' || hasTrueOuterBox) {
    detectedElements.push('arrierePlan');
  }
  if (footerLeftQrInk > 55) {
    detectedElements.push('qrcode');
  }

  const hasTablesDetected = midHorizontalLines >= 3;
  const previewThumbnailUrl = createCompressedThumbnail(canvas);

  const archetypeLabel =
    layoutArchetype === 'letterhead_split'
      ? 'Lettre Officielle Épurée (2 col.)'
      : layoutArchetype === 'boxed_certificate'
      ? 'Certificat Encadré'
      : layoutArchetype === 'executive_banner'
      ? 'Bandeau Exécutif'
      : 'Rapport Tableau';

  const summaryParts = [
    `${pageFormat.toUpperCase()} ${orientation === 'portrait' ? 'Portrait' : 'Paysage'}`,
    archetypeLabel,
    `Marges ${marginTop}/${marginLeft} mm`,
    `Couleur ${primaryColor}`,
    `${detectedElements.length} visuel(s)`
  ];

  return {
    docKey,
    sourceFileName: file.name,
    sourceFileType: fileType,
    analyzedAt: new Date().toISOString(),
    previewThumbnailUrl,
    pageFormat,
    orientation,
    marginsMm: {
      top: marginTop,
      right: marginRight,
      bottom: marginBottom,
      left: marginLeft
    },
    primaryColor,
    accentColor,
    highlightTintColor,
    headerBgColor,
    headerTextColor,
    bodyTextColor: '#1E293B',
    pageBgColor: pageBgHex,
    borderColor: primaryColor,
    borderStyle,
    headerStyle,
    headerAlign,
    fontFamily,
    blockSpacing,
    logoPlacement,
    signaturePlacement: signatureZoneStyle === 'two_col_fait_a_right_sig' ? 'bottom_right' : 'bottom_split',
    layoutArchetype,
    hasTwoColumnMeta,
    hasRefHighlightBox,
    hasCenteredTitleBlock,
    signatureZoneStyle,
    hasBottomLegalFooter,
    singlePageFit: pdfTextZones ? pdfTextZones.numPages === 1 : true,
    hasTablesDetected,
    detectedElements,
    ignoredMissingElements: [],
    detectedSummary: summaryParts.join(' · ')
  };
}

// ============================================================================
// PERSISTANCE FIRESTORE + LOCALSTORAGE DES MODÈLES IMPORTÉS
// ============================================================================

function readLocalTemplates(): LayoutTemplatesMap {
  try {
    const raw = localStorage.getItem(LS_LAYOUT_TEMPLATES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeLocalTemplates(map: LayoutTemplatesMap): void {
  try {
    localStorage.setItem(LS_LAYOUT_TEMPLATES_KEY, JSON.stringify(map));
  } catch {
    // Ignorer dépassement de quota localStorage
  }
}

export function getSavedLayoutTemplatesLocal(): LayoutTemplatesMap {
  return readLocalTemplates();
}

export async function saveLayoutTemplateToFirestore(
  docKey: LayoutTargetDocKey,
  template: ReferenceLayoutTemplate
): Promise<void> {
  const local = readLocalTemplates();
  local[docKey] = template;
  writeLocalTemplates(local);

  try {
    const docRef = doc(collection(db, COLLECTION_NAME), `template_${docKey}`);
    let timer: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<'timeout'>((resolve) => {
      timer = setTimeout(() => resolve('timeout'), 4000);
    });
    await Promise.race([
      setDoc(docRef, { ...template, updatedAt: new Date().toISOString() }, { merge: true }),
      timeoutPromise
    ]);
    if (timer) clearTimeout(timer);
  } catch (err) {
    console.warn('[LayoutImitation] Sauvegarde locale appliquée (Firestore indisponible) :', err);
  }
}

export async function loadAllLayoutTemplatesFromFirestore(): Promise<LayoutTemplatesMap> {
  const local = readLocalTemplates();
  try {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<null>((resolve) => {
      timer = setTimeout(() => resolve(null), 4000);
    });
    const snap = await Promise.race([getDocs(collection(db, COLLECTION_NAME)), timeoutPromise]);
    if (timer) clearTimeout(timer);

    if (snap) {
      const merged: LayoutTemplatesMap = { ...local };
      snap.docs.forEach((d) => {
        const data = d.data() as ReferenceLayoutTemplate;
        if (data?.docKey) {
          merged[data.docKey] = data;
        }
      });
      writeLocalTemplates(merged);
      return merged;
    }
  } catch (err) {
    console.warn('[LayoutImitation] Chargement depuis cache local :', err);
  }
  return local;
}

export async function deleteLayoutTemplateFromFirestore(docKey: LayoutTargetDocKey): Promise<void> {
  const local = readLocalTemplates();
  delete local[docKey];
  writeLocalTemplates(local);

  try {
    await deleteDoc(doc(collection(db, COLLECTION_NAME), `template_${docKey}`));
  } catch {
    // Ignore offline error
  }
}
