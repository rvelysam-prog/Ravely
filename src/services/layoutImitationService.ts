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

export interface SpatialBlueprint {
  headerLayout: 'filled_banner' | 'top_accent_bar' | 'split_lr' | 'left_clean' | 'centered_stack';
  headerHasDivider: boolean;
  headerBannerHeightMm: number;
  metaLayout: 'two_col_asymmetric' | 'two_col_equal' | 'single_col_left' | 'boxed_grid' | 'none';
  hasRefPill: boolean;
  titleAlign: 'left' | 'center' | 'right';
  titleHasBox: boolean;
  titleHasUnderline: boolean;
  titleUppercase: boolean;
  titleHasSubtitle: boolean;
  bodyLayout: 'prose_paragraphs' | 'numbered_sections' | 'structured_table' | 'cards';
  hasLeftAccentStripe: boolean;
  hasSectionDividers: boolean;
  tableHeaderStyle: 'filled_primary' | 'tinted' | 'bordered_plain';
  signatureLayout:
    | 'two_col_fait_a_right_sig'
    | 'two_col_bipartite'
    | 'three_col_footer'
    | 'right_block'
    | 'left_block';
  signatureHasTopBorder: boolean;
  footerLayout: 'qr_legal_page' | 'centered_legal' | 'rule_with_page' | 'minimal_page' | 'none';
  hasFooterDivider: boolean;
  hasTopRightMarker: boolean;
}

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
  spatialBlueprint?: SpatialBlueprint;
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

export function buildBlueprintFromLegacyTemplate(tpl: ReferenceLayoutTemplate): SpatialBlueprint {
  const headerLayout: SpatialBlueprint['headerLayout'] =
    tpl.headerStyle === 'bandeau_plein'
      ? 'filled_banner'
      : tpl.headerAlign === 'center'
      ? 'centered_stack'
      : tpl.headerStyle === 'split_officiel'
      ? 'split_lr'
      : 'left_clean';

  const metaLayout: SpatialBlueprint['metaLayout'] =
    tpl.hasTwoColumnMeta === false
      ? tpl.hasRefHighlightBox
        ? 'single_col_left'
        : 'none'
      : tpl.headerStyle === 'split_officiel'
      ? 'two_col_equal'
      : 'two_col_asymmetric';

  const titleAlign: SpatialBlueprint['titleAlign'] =
    tpl.hasCenteredTitleBlock === false
      ? 'left'
      : tpl.headerAlign === 'center' || tpl.hasCenteredTitleBlock
      ? 'center'
      : 'left';

  const bodyLayout: SpatialBlueprint['bodyLayout'] = tpl.hasTablesDetected
    ? 'structured_table'
    : tpl.borderStyle === 'card_blocks'
    ? 'cards'
    : tpl.headerStyle === 'entete_epure'
    ? 'prose_paragraphs'
    : 'numbered_sections';

  const signatureLayout: SpatialBlueprint['signatureLayout'] =
    tpl.signatureZoneStyle === 'three_col_footer'
      ? 'three_col_footer'
      : tpl.signaturePlacement === 'bottom_split'
      ? 'two_col_bipartite'
      : tpl.signaturePlacement === 'bottom_left'
      ? 'left_block'
      : tpl.hasTwoColumnMeta === false && tpl.headerStyle !== 'entete_epure'
      ? 'right_block'
      : 'two_col_fait_a_right_sig';

  return {
    headerLayout,
    headerHasDivider: headerLayout !== 'filled_banner' && tpl.headerStyle !== 'entete_epure',
    headerBannerHeightMm: headerLayout === 'filled_banner' ? 24 : 0,
    metaLayout,
    hasRefPill: Boolean(tpl.hasRefHighlightBox),
    titleAlign,
    titleHasBox: tpl.headerStyle === 'encadre_classique' && !tpl.hasRefHighlightBox,
    titleHasUnderline: tpl.borderStyle === 'official_band',
    titleUppercase: headerLayout === 'filled_banner' || tpl.borderStyle === 'double',
    titleHasSubtitle: true,
    bodyLayout,
    hasLeftAccentStripe: false,
    hasSectionDividers: tpl.borderStyle === 'card_blocks',
    tableHeaderStyle: headerLayout === 'filled_banner' ? 'filled_primary' : 'tinted',
    signatureLayout,
    signatureHasTopBorder: headerLayout !== 'left_clean' || tpl.signatureZoneStyle === 'three_col_footer',
    footerLayout:
      tpl.hasBottomLegalFooter === false
        ? 'rule_with_page'
        : tpl.detectedElements?.includes('qrcode')
        ? 'qr_legal_page'
        : 'centered_legal',
    hasFooterDivider: true,
    hasTopRightMarker: false
  };
}

export function resolveEffectiveLayout(
  tpl?: ReferenceLayoutTemplate
):
  | (ReferenceLayoutTemplate & {
      layoutArchetype: LayoutArchetype;
      highlightTintColor: string;
      hasTwoColumnMeta: boolean;
      hasRefHighlightBox: boolean;
      hasCenteredTitleBlock: boolean;
      signatureZoneStyle: 'two_col_fait_a_right_sig' | 'three_col_footer';
      hasBottomLegalFooter: boolean;
      singlePageFit: boolean;
      spatialBlueprint: SpatialBlueprint;
    })
  | undefined {
  if (!tpl) return undefined;
  const archetype: LayoutArchetype =
    tpl.layoutArchetype ||
    (tpl.headerStyle === 'bandeau_plein'
      ? 'executive_banner'
      : tpl.borderStyle === 'double' || tpl.borderStyle === 'simple'
      ? 'boxed_certificate'
      : tpl.hasTablesDetected
      ? 'table_report'
      : 'letterhead_split');

  const spatialBlueprint: SpatialBlueprint = tpl.spatialBlueprint
    ? { ...buildBlueprintFromLegacyTemplate(tpl), ...tpl.spatialBlueprint }
    : buildBlueprintFromLegacyTemplate({ ...tpl, layoutArchetype: archetype });

  return {
    ...tpl,
    layoutArchetype: archetype,
    highlightTintColor: tpl.highlightTintColor || mixHexWithWhite(tpl.primaryColor || '#0B2545', 0.87),
    hasTwoColumnMeta: tpl.hasTwoColumnMeta ?? spatialBlueprint.metaLayout.startsWith('two_col'),
    hasRefHighlightBox: tpl.hasRefHighlightBox ?? spatialBlueprint.hasRefPill,
    hasCenteredTitleBlock: tpl.hasCenteredTitleBlock ?? spatialBlueprint.titleAlign === 'center',
    signatureZoneStyle:
      tpl.signatureZoneStyle ||
      (spatialBlueprint.signatureLayout === 'three_col_footer'
        ? 'three_col_footer'
        : 'two_col_fait_a_right_sig'),
    hasBottomLegalFooter: tpl.hasBottomLegalFooter ?? spatialBlueprint.footerLayout !== 'none',
    singlePageFit: tpl.singlePageFit ?? true,
    spatialBlueprint
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
  detectedFontFamily?: 'helvetica' | 'times' | 'courier';
  hasLeftUpperBlock: boolean;
  hasRightUpperBlock: boolean;
  rightUpperIsLowerThanLeft: boolean;
  hasLeftRefKeyValues: boolean;
  titleAlign: 'left' | 'center' | 'right';
  titleUppercase: boolean;
  hasSubtitleLine: boolean;
  titleBandYMin?: number;
  titleBandYMax?: number;
  hasNumberedSections: boolean;
  hasBottomLeftText: boolean;
  hasBottomRightText: boolean;
  hasBottomCenterText: boolean;
  hasFooterStrip: boolean;
  lineCount: number;
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

    let pdfTextZones: PdfTextZonesInsight | undefined;
    try {
      const textContent = (await page.getTextContent()) as {
        items: Array<{ str?: string; transform?: number[]; width?: number; height?: number; fontName?: string }>;
        styles?: Record<string, { fontFamily?: string }>;
      };
      const pw = viewport0.width || 595;
      const ph = viewport0.height || 842;

      let serifCount = 0;
      let monoCount = 0;
      let sansCount = 0;

      if (textContent.styles) {
        Object.values(textContent.styles).forEach((st) => {
          const ff = (st.fontFamily || '').toLowerCase();
          if (ff.includes('serif') || ff.includes('times') || ff.includes('georgia') || ff.includes('garamond')) {
            serifCount++;
          } else if (ff.includes('mono') || ff.includes('courier')) {
            monoCount++;
          } else {
            sansCount++;
          }
        });
      }
      const detectedFontFamily: 'helvetica' | 'times' | 'courier' =
        serifCount > sansCount && serifCount >= monoCount
          ? 'times'
          : monoCount > sansCount && monoCount > serifCount
          ? 'courier'
          : 'helvetica';

      let leftUpper = 0;
      let rightUpper = 0;
      let leftUpperMinY = 1;
      let rightUpperMinY = 1;
      let leftRefCount = 0;
      let bottomLeftCount = 0;
      let bottomRightCount = 0;
      let bottomCenterCount = 0;
      let footerStripCount = 0;
      let numberedSectionsCount = 0;

      interface ParsedSpan {
        text: string;
        xPct: number;
        xCenterPct: number;
        yPctTop: number;
        fontSize: number;
      }
      const parsedSpans: ParsedSpan[] = [];

      for (const item of textContent.items) {
        const text = (item.str || '').trim();
        if (!text || !item.transform) continue;
        const tx = item.transform[4] || 0;
        const ty = item.transform[5] || 0;
        const fontSize = Math.abs(item.transform[0] || item.height || 10);
        const w = item.width || text.length * fontSize * 0.45;

        const xPct = tx / pw;
        const yPctTop = 1 - ty / ph;
        const xCenterPct = (tx + w / 2) / pw;

        parsedSpans.push({ text, xPct, xCenterPct, yPctTop, fontSize });

        if (item.fontName && textContent.styles?.[item.fontName]) {
          const ff = (textContent.styles[item.fontName].fontFamily || '').toLowerCase();
          if (ff.includes('serif') || ff.includes('times')) serifCount++;
          else if (ff.includes('mono') || ff.includes('courier')) monoCount++;
        }

        if (yPctTop >= 0.09 && yPctTop <= 0.36) {
          if (xPct < 0.44) {
            leftUpper++;
            if (yPctTop < leftUpperMinY) leftUpperMinY = yPctTop;
          }
          if (xPct > 0.50) {
            rightUpper++;
            if (yPctTop < rightUpperMinY) rightUpperMinY = yPctTop;
          }
        }
        if (yPctTop >= 0.21 && yPctTop <= 0.42 && xPct < 0.50) {
          if (text.includes(':') || text.toLowerCase().includes('réf') || text.includes('N°')) {
            leftRefCount++;
          }
        }
        if (/^([1-9]|[IVX]{1,4})\.\s+\S/i.test(text) || /^ARTICLE\s+\d+/i.test(text)) {
          numberedSectionsCount++;
        }
        if (yPctTop >= 0.64 && yPctTop <= 0.87) {
          if (xPct < 0.40) bottomLeftCount++;
          else if (xPct > 0.54) bottomRightCount++;
          else bottomCenterCount++;
        }
        if (yPctTop > 0.87) {
          footerStripCount++;
        }
      }

      // Identifier le titre principal réel dans la moitié supérieure (entre 10% et 56%)
      const upperCandidates = parsedSpans.filter(
        (s) => s.yPctTop >= 0.09 && s.yPctTop <= 0.56 && s.text.length >= 6
      );
      const maxFont = upperCandidates.reduce((m, s) => Math.max(m, s.fontSize), 0);
      const titleSpans = upperCandidates.filter((s) => s.fontSize >= Math.max(10.5, maxFont * 0.86));
      const primaryTitle = titleSpans[0];

      let titleAlign: 'left' | 'center' | 'right' = 'center';
      let titleUppercase = false;
      let hasSubtitleLine = false;
      let titleBandYMin: number | undefined;
      let titleBandYMax: number | undefined;

      if (primaryTitle) {
        if (primaryTitle.xPct < 0.22 && primaryTitle.xCenterPct < 0.42) {
          titleAlign = 'left';
        } else if (primaryTitle.xPct > 0.55) {
          titleAlign = 'right';
        } else {
          titleAlign = 'center';
        }
        const letters = primaryTitle.text.replace(/[^a-zA-ZÀ-ÿ]/g, '');
        const upperCount = (letters.match(/[A-ZÀ-Ý]/g) || []).length;
        titleUppercase = letters.length > 0 && upperCount / letters.length >= 0.72;
        titleBandYMin = Math.max(0.05, primaryTitle.yPctTop - 0.025);
        titleBandYMax = Math.min(0.65, primaryTitle.yPctTop + 0.04);
        hasSubtitleLine = upperCandidates.some(
          (s) =>
            s !== primaryTitle &&
            s.yPctTop > primaryTitle.yPctTop &&
            s.yPctTop <= primaryTitle.yPctTop + 0.045
        );
      }

      pdfTextZones = {
        numPages: pdf.numPages || 1,
        detectedFontFamily,
        hasLeftUpperBlock: leftUpper >= 2,
        hasRightUpperBlock: rightUpper >= 2,
        rightUpperIsLowerThanLeft:
          leftUpper >= 2 && rightUpper >= 2 && rightUpperMinY > leftUpperMinY + 0.03,
        hasLeftRefKeyValues: leftRefCount >= 2,
        titleAlign,
        titleUppercase,
        hasSubtitleLine,
        titleBandYMin,
        titleBandYMax,
        hasNumberedSections: numberedSectionsCount >= 2,
        hasBottomLeftText: bottomLeftCount >= 1,
        hasBottomRightText: bottomRightCount >= 1,
        hasBottomCenterText: bottomCenterCount >= 1,
        hasFooterStrip: footerStripCount >= 1,
        lineCount: parsedSpans.length
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
 * Analyse la géométrie réelle, la palette, l'alignement de titre, les diviseurs,
 * les colonnes, les encadrements, les polices et les visuels de N'IMPORTE QUEL
 * document modèle importé, sans aucun modèle codé en dur.
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

  // 2. Détection lignes horizontales / verticales réelles
  const checkHorizontalLineCoverage = (
    yStartPct: number,
    yEndPct: number,
    minRunRatio = 0.55
  ): { maxRun: number; lineCount: number } => {
    const y0 = Math.max(2, Math.round(h * yStartPct));
    const y1 = Math.min(h - 3, Math.round(h * yEndPct));
    const x0 = Math.round(w * 0.10);
    const x1 = Math.round(w * 0.90);
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
      if (cov >= minRunRatio) lineCount++;
    }
    return { maxRun, lineCount };
  };

  const checkVerticalLineCoverage = (
    xStartPct: number,
    xEndPct: number
  ): { maxRun: number; lineCount: number } => {
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
      if (cov > 0.58) lineCount++;
    }
    return { maxRun, lineCount };
  };

  const topFrame = checkHorizontalLineCoverage(0.015, 0.085, 0.62);
  const bottomFrame = checkHorizontalLineCoverage(0.915, 0.985, 0.62);
  const leftFrame = checkVerticalLineCoverage(0.015, 0.085);
  const rightFrame = checkVerticalLineCoverage(0.915, 0.985);

  const hasTrueOuterBox =
    topFrame.maxRun >= 0.58 &&
    bottomFrame.maxRun >= 0.58 &&
    leftFrame.maxRun >= 0.58 &&
    rightFrame.maxRun >= 0.58;
  const hasDoubleOuterBox =
    hasTrueOuterBox &&
    topFrame.lineCount >= 4 &&
    bottomFrame.lineCount >= 4 &&
    leftFrame.lineCount >= 4 &&
    rightFrame.lineCount >= 4;

  const hasLeftAccentStripe =
    !hasTrueOuterBox && leftFrame.maxRun >= 0.58 && rightFrame.maxRun < 0.35;

  // Bande d'accent tout en haut (ex: trait de couleur épais 2-8mm sans gros bandeau)
  const topAccentStrip = checkHorizontalLineCoverage(0.0, 0.045, 0.72);
  // Ligne séparatrice sous en-tête (entre 8% et 21% de hauteur)
  const headerDividerCheck = checkHorizontalLineCoverage(0.08, 0.21, 0.55);
  // Ligne séparatrice au-dessus du pied de page (entre 82% et 94%)
  const footerDividerCheck = checkHorizontalLineCoverage(0.82, 0.94, 0.50);

  // 3. Parcours des pixels par bandes réelles
  let minX = w;
  let maxX = 0;
  let minY = h;
  let maxY = 0;

  let headerFilledR = 0;
  let headerFilledG = 0;
  let headerFilledB = 0;
  let headerFilledCount = 0;

  let headerSaturatedScore = -1;
  let bestPrimary: [number, number, number] = [11, 37, 69];
  let bestAccent: [number, number, number] = [212, 160, 23];
  let accentScore = -1;

  let pastelR = 0;
  let pastelG = 0;
  let pastelB = 0;
  let pastelCount = 0;

  const headerEndY = Math.round(h * 0.14);
  const metaStartY = Math.round(h * 0.13);
  const metaEndY = Math.round(h * 0.36);
  const titleStartY = Math.round(h * (pdfTextZones?.titleBandYMin ?? 0.22));
  const titleEndY = Math.round(h * (pdfTextZones?.titleBandYMax ?? 0.50));
  const sigStartY = Math.round(h * 0.66);
  const footerStartY = Math.round(h * 0.85);
  const step = 2;

  let headerLeftInk = 0;
  let headerCenterInk = 0;
  let headerRightInk = 0;
  let topRightCornerTinyInk = 0;

  let metaLeftInk = 0;
  let metaRightInk = 0;
  let titleLeftInk = 0;
  let titleCenterInk = 0;
  let titleRightInk = 0;
  let titleFilledBgCount = 0;
  let sigLeftInk = 0;
  let sigRightInk = 0;
  let footerLeftQrInk = 0;
  let footerCenterInk = 0;
  let footerRightInk = 0;

  let centerWatermarkSoftCount = 0;
  let bottomStampSaturatedCount = 0;
  let midHorizontalLines = 0;
  let filledHeaderRows = 0;

  for (let y = 0; y < h; y += step) {
    let rowInkCount = 0;
    let rowBannerColorCount = 0;
    for (let x = 0; x < w; x += step) {
      const idx = (y * w + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      const sat = colorSaturation(r, g, b);
      const lum = luminance(r, g, b);

      // Détection réelle d'une pastille pastel dans la zone références (20%-44% H, 5%-46% W)
      if (
        y >= h * 0.20 &&
        y <= h * 0.44 &&
        x >= w * 0.05 &&
        x <= w * 0.46 &&
        sat >= 0.09 &&
        sat <= 0.48 &&
        lum >= 198 &&
        lum <= 246
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
          if (x < w * 0.36) headerLeftInk++;
          else if (x < w * 0.66) headerCenterInk++;
          else headerRightInk++;

          if (x > w * 0.89 && y < h * 0.08 && lum < 120) {
            topRightCornerTinyInk++;
          }

          if (lum < 175 || (sat > 0.25 && lum < 215)) {
            rowBannerColorCount++;
            headerFilledR += r;
            headerFilledG += g;
            headerFilledB += b;
            headerFilledCount++;
          }

          const score = sat * 115 + (220 - lum) * 0.35;
          if (sat > 0.16 && lum < 205 && score > headerSaturatedScore) {
            headerSaturatedScore = score;
            bestPrimary = [r, g, b];
          }
          if (sat > 0.28 && lum >= 95 && lum <= 228 && sat * 100 > accentScore) {
            accentScore = sat * 100;
            bestAccent = [r, g, b];
          }
        }

        // Zone coordonnées (13% - 36%)
        if (y >= metaStartY && y <= metaEndY) {
          if (x >= w * 0.05 && x < w * 0.46) metaLeftInk++;
          if (x >= w * 0.50 && x <= w * 0.94) metaRightInk++;
        }

        // Zone titre
        if (y >= titleStartY && y <= titleEndY) {
          if (x < w * 0.35) titleLeftInk++;
          else if (x <= w * 0.68) titleCenterInk++;
          else titleRightInk++;
          if ((sat > 0.14 && lum < 232) || lum < 215) {
            titleFilledBgCount++;
          }
        }

        // Filigrane centré doux
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

        // Signatures (66% - 85%)
        if (y >= sigStartY && y < footerStartY) {
          if (x < w * 0.45) sigLeftInk++;
          if (x >= w * 0.48) sigRightInk++;
          if (sat > 0.26 && lum < 210) {
            bottomStampSaturatedCount++;
          }
        }

        // Pied de page (85% - 98%)
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

    if (y < headerEndY && rowBannerColorCount > (w / step) * 0.65) {
      filledHeaderRows++;
    }
    if (y > headerEndY && y < sigStartY && rowInkCount > (w / step) * 0.55) {
      midHorizontalLines++;
    }
  }

  // Palette globale si le haut était très minimaliste
  if (headerSaturatedScore < 0) {
    for (let y = headerEndY; y < h; y += 6) {
      for (let x = 0; x < w; x += 6) {
        const idx = (y * w + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const sat = colorSaturation(r, g, b);
        const lum = luminance(r, g, b);
        if (sat > 0.22 && lum < 205) {
          const sc = sat * 100 + (210 - lum) * 0.3;
          if (sc > headerSaturatedScore) {
            headerSaturatedScore = sc;
            bestPrimary = [r, g, b];
          }
        }
      }
    }
  }

  // Marges réalistes (mm)
  const clampMm = (v: number, fallback: number) =>
    Number.isFinite(v) ? Math.max(10, Math.min(30, Math.round(v))) : fallback;

  const marginLeft = maxX > minX ? clampMm((minX / w) * pageWidthMm, 18) : 18;
  const marginRight = maxX > minX ? clampMm(((w - maxX) / w) * pageWidthMm, 18) : 18;
  const marginTop = maxY > minY ? clampMm((minY / h) * pageHeightMm, 14) : 14;
  const marginBottom = maxY > minY ? clampMm(((h - maxY) / h) * pageHeightMm, 14) : 14;

  // Couleurs extraites
  const primaryColor = rgbToHex(bestPrimary[0], bestPrimary[1], bestPrimary[2]);
  const accentColor =
    accentScore > 18 ? rgbToHex(bestAccent[0], bestAccent[1], bestAccent[2]) : primaryColor;
  const highlightTintColor =
    pastelCount >= 28
      ? rgbToHex(pastelR / pastelCount, pastelG / pastelCount, pastelB / pastelCount)
      : mixHexWithWhite(primaryColor, 0.87);

  // Bandeau plein vs fine barre d'accent en haut vs en-tête épuré
  const headerAreaPixels = (w * headerEndY) / (step * step);
  const bannerHeightMm = Math.round(((filledHeaderRows * step) / h) * pageHeightMm);
  const isFilledHeaderBanner =
    headerFilledCount > headerAreaPixels * 0.24 && bannerHeightMm >= 9;
  const isTopAccentBar = !isFilledHeaderBanner && topAccentStrip.lineCount >= 2 && topAccentStrip.lineCount <= 12;

  const headerBgColor =
    isFilledHeaderBanner && headerFilledCount > 0
      ? rgbToHex(
          headerFilledR / headerFilledCount,
          headerFilledG / headerFilledCount,
          headerFilledB / headerFilledCount
        )
      : primaryColor;
  const headerTextColor = '#FFFFFF';

  // Style d'encadrement réel
  const borderStyle: ReferenceLayoutTemplate['borderStyle'] = hasDoubleOuterBox
    ? 'double'
    : hasTrueOuterBox
    ? 'simple'
    : isTopAccentBar || hasLeftAccentStripe
    ? 'official_band'
    : midHorizontalLines >= 5 && !pdfTextZones
    ? 'card_blocks'
    : 'none';

  // Calcul fidèle du SpatialBlueprint propre À CE FICHIER
  const bpHeaderLayout: SpatialBlueprint['headerLayout'] = isFilledHeaderBanner
    ? 'filled_banner'
    : isTopAccentBar
    ? 'top_accent_bar'
    : headerCenterInk > headerLeftInk * 1.35 && headerCenterInk > headerRightInk * 1.35
    ? 'centered_stack'
    : headerLeftInk > 45 && headerRightInk > 35
    ? 'split_lr'
    : 'left_clean';

  const headerHasDivider =
    !isFilledHeaderBanner && headerDividerCheck.maxRun >= 0.55 && headerDividerCheck.lineCount >= 1;

  const hasRefPill = pastelCount >= 28;

  const metaLayout: SpatialBlueprint['metaLayout'] =
    midHorizontalLines >= 2 && metaLeftInk > 60 && metaRightInk > 60 && !hasRefPill && !pdfTextZones?.rightUpperIsLowerThanLeft
      ? 'boxed_grid'
      : pdfTextZones
      ? pdfTextZones.hasLeftUpperBlock && pdfTextZones.hasRightUpperBlock
        ? pdfTextZones.rightUpperIsLowerThanLeft
          ? 'two_col_asymmetric'
          : 'two_col_equal'
        : pdfTextZones.hasLeftUpperBlock || pdfTextZones.hasLeftRefKeyValues
        ? 'single_col_left'
        : 'none'
      : metaLeftInk > 70 && metaRightInk > 55
      ? 'two_col_equal'
      : metaLeftInk > 70
      ? 'single_col_left'
      : 'none';

  const titleAlign: SpatialBlueprint['titleAlign'] = pdfTextZones
    ? pdfTextZones.titleAlign
    : titleCenterInk > titleLeftInk * 1.25 && titleCenterInk > titleRightInk * 1.25
    ? 'center'
    : titleRightInk > titleLeftInk * 1.4
    ? 'right'
    : 'left';

  const titleAreaApprox = (w * Math.max(12, titleEndY - titleStartY)) / (step * step);
  const titleHasBox =
    titleAreaApprox > 0 && titleFilledBgCount > titleAreaApprox * 0.34;
  const titleUnderlineCheck = checkHorizontalLineCoverage(
    Math.min(0.60, (titleEndY / h) - 0.02),
    Math.min(0.64, (titleEndY / h) + 0.04),
    0.45
  );
  const titleHasUnderline = !titleHasBox && titleUnderlineCheck.lineCount >= 1 && titleUnderlineCheck.lineCount <= 4;
  const titleUppercase = pdfTextZones
    ? pdfTextZones.titleUppercase
    : bpHeaderLayout === 'filled_banner' || hasDoubleOuterBox;
  const titleHasSubtitle = pdfTextZones ? pdfTextZones.hasSubtitleLine : true;

  const hasTablesDetected = midHorizontalLines >= 4;
  const bodyLayout: SpatialBlueprint['bodyLayout'] = hasTablesDetected
    ? 'structured_table'
    : pdfTextZones?.hasNumberedSections
    ? 'numbered_sections'
    : borderStyle === 'card_blocks'
    ? 'cards'
    : 'prose_paragraphs';

  const signatureLayout: SpatialBlueprint['signatureLayout'] =
    sigLeftInk > 35 && sigRightInk > 55
      ? metaLayout === 'two_col_asymmetric' || hasRefPill
        ? 'two_col_fait_a_right_sig'
        : 'two_col_bipartite'
      : sigLeftInk > 45 && sigRightInk <= 35
      ? 'left_block'
      : sigRightInk > 45 && sigLeftInk <= 35
      ? 'right_block'
      : isFilledHeaderBanner || hasDoubleOuterBox
      ? 'three_col_footer'
      : 'two_col_bipartite';

  const hasFooterDivider = footerDividerCheck.maxRun >= 0.48;
  const footerLayout: SpatialBlueprint['footerLayout'] =
    footerLeftQrInk > 50 && footerCenterInk > 25
      ? 'qr_legal_page'
      : footerCenterInk > 45
      ? 'centered_legal'
      : hasFooterDivider || footerRightInk > 12
      ? 'rule_with_page'
      : footerCenterInk + footerRightInk > 8
      ? 'minimal_page'
      : 'none';

  const hasTopRightMarker = topRightCornerTinyInk >= 3 && topRightCornerTinyInk <= 65 && !hasTrueOuterBox;

  const spatialBlueprint: SpatialBlueprint = {
    headerLayout: bpHeaderLayout,
    headerHasDivider,
    headerBannerHeightMm: isFilledHeaderBanner ? Math.max(14, Math.min(34, bannerHeightMm || 22)) : 0,
    metaLayout,
    hasRefPill,
    titleAlign,
    titleHasBox,
    titleHasUnderline,
    titleUppercase,
    titleHasSubtitle,
    bodyLayout,
    hasLeftAccentStripe,
    hasSectionDividers: bodyLayout === 'numbered_sections' && midHorizontalLines >= 2,
    tableHeaderStyle: isFilledHeaderBanner ? 'filled_primary' : hasRefPill ? 'tinted' : 'bordered_plain',
    signatureLayout,
    signatureHasTopBorder: bpHeaderLayout !== 'left_clean' || signatureLayout === 'three_col_footer',
    footerLayout,
    hasFooterDivider,
    hasTopRightMarker
  };

  const headerStyle: ReferenceLayoutTemplate['headerStyle'] = isFilledHeaderBanner
    ? 'bandeau_plein'
    : hasDoubleOuterBox || hasTrueOuterBox
    ? 'encadre_classique'
    : bpHeaderLayout === 'split_lr'
    ? 'split_officiel'
    : 'entete_epure';

  const layoutArchetype: LayoutArchetype = isFilledHeaderBanner
    ? 'executive_banner'
    : hasDoubleOuterBox || hasTrueOuterBox
    ? 'boxed_certificate'
    : hasTablesDetected
    ? 'table_report'
    : 'letterhead_split';

  const headerAlign: ReferenceLayoutTemplate['headerAlign'] =
    titleAlign === 'center'
      ? 'center'
      : bpHeaderLayout === 'split_lr'
      ? 'split'
      : 'left';

  const logoPlacement: ReferenceLayoutTemplate['logoPlacement'] =
    headerRightInk > headerLeftInk * 1.6
      ? 'top_right'
      : headerCenterInk > headerLeftInk * 1.4
      ? 'top_center'
      : 'top_left';

  const hasTwoColumnMeta = metaLayout === 'two_col_asymmetric' || metaLayout === 'two_col_equal';
  const hasRefHighlightBox = hasRefPill || Boolean(pdfTextZones?.hasLeftRefKeyValues);
  const hasCenteredTitleBlock = titleAlign === 'center';
  const signatureZoneStyle: ReferenceLayoutTemplate['signatureZoneStyle'] =
    signatureLayout === 'three_col_footer' ? 'three_col_footer' : 'two_col_fait_a_right_sig';
  const hasBottomLegalFooter = footerLayout !== 'none';

  const blockSpacing: ReferenceLayoutTemplate['blockSpacing'] =
    pdfTextZones && pdfTextZones.lineCount > 90
      ? 'compact'
      : pdfTextZones && pdfTextZones.lineCount < 35
      ? 'airy'
      : 'standard';

  const fontFamily: ReferenceLayoutTemplate['fontFamily'] =
    pdfTextZones?.detectedFontFamily ||
    (borderStyle === 'double' ? 'times' : 'helvetica');

  // Éléments visuels détectés
  const detectedElements: DetectedRefElement[] = [];
  if (headerLeftInk > 40 || headerCenterInk > 60 || headerRightInk > 40) {
    detectedElements.push('logo');
  }
  if (sigRightInk > 55 || sigLeftInk > 65) {
    detectedElements.push('signature');
  }
  if (bottomStampSaturatedCount > 45 || borderStyle === 'double' || borderStyle === 'simple') {
    detectedElements.push('cachet');
  }
  if (centerWatermarkSoftCount > 260) {
    detectedElements.push('filigrane');
  }
  if (pageBgHex !== '#FFFFFF' || hasTrueOuterBox || hasLeftAccentStripe) {
    detectedElements.push('arrierePlan');
  }
  if (footerLeftQrInk > 55) {
    detectedElements.push('qrcode');
  }

  const previewThumbnailUrl = createCompressedThumbnail(canvas);

  const headerNameMap: Record<SpatialBlueprint['headerLayout'], string> = {
    filled_banner: 'Bandeau coloré',
    top_accent_bar: 'Barre haute accent',
    split_lr: 'En-tête Gauche/Droite',
    centered_stack: 'En-tête centré',
    left_clean: 'En-tête épuré gauche'
  };
  const titleNameMap: Record<SpatialBlueprint['titleAlign'], string> = {
    left: 'Titre à gauche',
    center: 'Titre centré',
    right: 'Titre à droite'
  };
  const bodyNameMap: Record<SpatialBlueprint['bodyLayout'], string> = {
    prose_paragraphs: 'Prose fluide',
    numbered_sections: 'Sections numérotées',
    structured_table: 'Tableau structuré',
    cards: 'Blocs encadrés'
  };

  const summaryParts = [
    `${pageFormat.toUpperCase()} ${orientation === 'portrait' ? 'Portrait' : 'Paysage'}`,
    `${headerNameMap[bpHeaderLayout]} · ${titleNameMap[titleAlign]} · ${bodyNameMap[bodyLayout]}`,
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
    signaturePlacement:
      signatureLayout === 'left_block'
        ? 'bottom_left'
        : signatureLayout === 'three_col_footer' || signatureLayout === 'two_col_bipartite'
        ? 'bottom_split'
        : 'bottom_right',
    layoutArchetype,
    hasTwoColumnMeta,
    hasRefHighlightBox,
    hasCenteredTitleBlock,
    signatureZoneStyle,
    hasBottomLegalFooter,
    singlePageFit: pdfTextZones ? pdfTextZones.numPages === 1 : true,
    hasTablesDetected,
    spatialBlueprint,
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
