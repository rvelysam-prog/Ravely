import React, { useState, useRef } from 'react';
import {
  Copy,
  Check,
  Send,
  Download,
  FileText,
  Mail,
  Smartphone,
  Tablet,
  Monitor,
  Edit3,
  Layers,
  Sparkles,
  Columns,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Highlighter,
  Undo2,
  Redo2,
  RotateCcw
} from 'lucide-react';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import {
  PdfImportedAssetsConfig,
  PdfAssetItemSettings,
  UploadedAssetUrlsMap,
  ImportedAssetKey,
  DEFAULT_PDF_ASSETS_CONFIG
} from '../../services/departmentsAndEmailService';
import { ForcusWordEditor } from '../admin/ForcusWordEditor';
import { ForcusDocumentLayer } from '../../services/indexedDbDocStorage';
import { VisualHtmlEmailConverter } from './VisualHtmlEmailConverter';
import { EditableDocumentVisual } from './EditableDocumentVisual';
import { ResponsivePaperWrapper } from './ResponsivePaperWrapper';
import { ReferenceLayoutTemplate, resolveEffectiveLayout } from '../../services/layoutImitationService';

export interface InteractiveCanvasProps {
  title: string;
  documentTypeLabel: string;
  assetsConfig: PdfImportedAssetsConfig;
  onChangeAssetsConfig?: (config: PdfImportedAssetsConfig) => void;
  uploadedAssetUrls?: UploadedAssetUrlsMap;
  activeAssetKeyMap?: Partial<
    Record<'logo' | 'signature' | 'cachet' | 'filigrane' | 'arrierePlan' | 'barcode' | 'qrcode', ImportedAssetKey>
  >;
  exclusiveVisualSet?: {
    logo?: string;
    signature?: string;
    cachet?: string;
    filigrane?: string;
    arrierePlan?: string;
    barcode?: string;
    qrcode?: string;
  };
  layoutTemplate?: ReferenceLayoutTemplate;
  htmlEmailContent: string;
  onDownloadPdf?: () => void;
  onDownloadWord?: () => void;
  onDownloadHtml?: (compiledHtml: string) => void;
  onOpenInWebmail?: (html: string) => void;
  onOpenForcusEditor?: () => void;
  onTextEdited?: (editedText: string) => void;
  onResetText?: () => void;
  onClearExternalSelection?: () => void;
  onExportSuccess?: (msg: string) => void;
  hasCustomText?: boolean;
  hideGenericChrome?: boolean;
  preferCustomPdfDownloadWhenUnedited?: boolean;
  children: React.ReactNode;
}

type CanvasViewMode = 'a4' | 'email' | 'converter';

export const InteractiveDocumentCanvas: React.FC<InteractiveCanvasProps> = ({
  title,
  documentTypeLabel,
  assetsConfig,
  onChangeAssetsConfig,
  uploadedAssetUrls = {},
  activeAssetKeyMap,
  exclusiveVisualSet,
  layoutTemplate,
  htmlEmailContent,
  onDownloadPdf,
  onDownloadWord,
  onDownloadHtml,
  onOpenInWebmail,
  onOpenForcusEditor,
  onTextEdited,
  onResetText,
  onClearExternalSelection,
  onExportSuccess,
  hasCustomText = false,
  hideGenericChrome = false,
  preferCustomPdfDownloadWhenUnedited = false,
  children
}) => {
  const effectiveLayout = resolveEffectiveLayout(layoutTemplate);
  // Vue par défaut : Document A4 Direct (immédiatement lisible et éditable pour les débutants)
  const [viewMode, setViewMode] = useState<CanvasViewMode>('a4');
  const [captureSignal, setCaptureSignal] = useState<number>(1);
  const [preCapturedA4DataUrl, setPreCapturedA4DataUrl] = useState<string | null>(null);
  const [compiledEmailHtml, setCompiledEmailHtml] = useState<string>('');
  const [liveSyncedEmailHtml, setLiveSyncedEmailHtml] = useState<string>(htmlEmailContent);

  const [isInPlaceForcusOpen, setIsInPlaceForcusOpen] = useState(false);
  const [forcusInitialHtml, setForcusInitialHtml] = useState<string>(htmlEmailContent);
  const [forcusInitialLayers, setForcusInitialLayers] = useState<ForcusDocumentLayer[]>([]);
  const [appliedForcusHtml, setAppliedForcusHtml] = useState<string | null>(null);
  const [hasInlineEdits, setHasInlineEdits] = useState<boolean>(false);
  const [resetNonce, setResetNonce] = useState<number>(0);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [isCapturingConverter, setIsCapturingConverter] = useState<boolean>(false);

  const [emailViewport, setEmailViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [copiedHtml, setCopiedHtml] = useState(false);
  const [floatingMenu, setFloatingMenu] = useState<{ x: number; y: number } | null>(null);
  const [selectedVisualKey, setSelectedVisualKey] = useState<string | null>(null);
  const [activeFontName, setActiveFontName] = useState<string>('Arial');
  const [activeFontSize, setActiveFontSize] = useState<string>('3');
  const [activeTextColor, setActiveTextColor] = useState<string>('#0f172a');
  const [activeHighlightColor, setActiveHighlightColor] = useState<string>('#fef08a');

  const a4SheetRef = useRef<HTMLDivElement | null>(null);
  const editableWrapperRef = useRef<HTMLDivElement | null>(null);

  const activeArrierePlan = exclusiveVisualSet?.arrierePlan || uploadedAssetUrls.arrierePlan;
  const activeFiligrane = exclusiveVisualSet?.filigrane || uploadedAssetUrls.filigrane;
  const activeLogo = exclusiveVisualSet?.logo || uploadedAssetUrls.logo;
  const activeSignature = exclusiveVisualSet?.signature || uploadedAssetUrls.signature;
  const activeCachet = exclusiveVisualSet?.cachet || uploadedAssetUrls.cachet;
  const activeBarcode = exclusiveVisualSet?.barcode || uploadedAssetUrls.barcodeEmployeur;
  const activeQrCode = exclusiveVisualSet?.qrcode || uploadedAssetUrls.qrcodeEmployeur;

  const DEFAULT_SLOT_KEY: Record<
    'logo' | 'signature' | 'cachet' | 'filigrane' | 'arrierePlan' | 'barcode' | 'qrcode',
    ImportedAssetKey
  > = {
    logo: 'logo',
    signature: 'signature',
    cachet: 'cachet',
    filigrane: 'filigrane',
    arrierePlan: 'arrierePlan',
    barcode: 'barcodeEmployeur',
    qrcode: 'qrcodeEmployeur'
  };

  const resolveSlotKey = (
    slot: 'logo' | 'signature' | 'cachet' | 'filigrane' | 'arrierePlan' | 'barcode' | 'qrcode'
  ): ImportedAssetKey => activeAssetKeyMap?.[slot] || DEFAULT_SLOT_KEY[slot];

  const getSlotSettings = (
    slot: 'logo' | 'signature' | 'cachet' | 'filigrane' | 'arrierePlan' | 'barcode' | 'qrcode'
  ): PdfAssetItemSettings => {
    const key = resolveSlotKey(slot);
    return (
      assetsConfig[key] ||
      DEFAULT_PDF_ASSETS_CONFIG[key] || {
        widthValue: 150,
        widthUnit: 'px',
        heightValue: 64,
        heightUnit: 'px',
        opacity: 100,
        tintEnabled: false,
        tintColor: '#0B2545',
        offsetX: 0,
        offsetY: 0,
        alignX: 'center',
        alignY: 'middle',
        rotation: 0,
        zIndex: 10,
        wrapMode: 'inline'
      }
    );
  };

  const updateSlotSettings = (
    slot: 'logo' | 'signature' | 'cachet' | 'filigrane' | 'arrierePlan' | 'barcode' | 'qrcode',
    patch: Partial<PdfAssetItemSettings>
  ) => {
    if (!onChangeAssetsConfig) return;
    const key = resolveSlotKey(slot);
    const current = getSlotSettings(slot);
    onChangeAssetsConfig({
      ...assetsConfig,
      [key]: { ...current, ...patch },
      updated_at: new Date().toISOString()
    });
  };

  const resetSlotSettings = (
    slot: 'logo' | 'signature' | 'cachet' | 'filigrane' | 'arrierePlan' | 'barcode' | 'qrcode'
  ) => {
    if (!onChangeAssetsConfig) return;
    const key = resolveSlotKey(slot);
    const def = DEFAULT_PDF_ASSETS_CONFIG[key];
    if (!def) return;
    onChangeAssetsConfig({
      ...assetsConfig,
      [key]: { ...def },
      updated_at: new Date().toISOString()
    });
  };

  const buildSyncedEmailHtmlFromLiveA4 = (): string => {
    if (compiledEmailHtml) return compiledEmailHtml;
    const sheet = a4SheetRef.current;
    if (!sheet) return htmlEmailContent;

    const clone = sheet.cloneNode(true) as HTMLElement;
    clone
      .querySelectorAll('[data-html2canvas-ignore="true"], .print\\:hidden')
      .forEach((node) => node.remove());

    // Copier les styles essentiels en inline pour compatibilité Webmail / Infomaniak / Gmail / Word
    const srcEls = Array.from(sheet.querySelectorAll('*')) as HTMLElement[];
    const dstEls = Array.from(clone.querySelectorAll('*')) as HTMLElement[];
    const len = Math.min(srcEls.length, dstEls.length);

    for (let i = 0; i < len; i++) {
      const s = srcEls[i];
      const d = dstEls[i];
      if (!s || !d || d.hasAttribute('data-html2canvas-ignore')) continue;
      const cs = window.getComputedStyle(s);
      const tag = d.tagName.toLowerCase();

      if (tag === 'img') {
        const rect = s.getBoundingClientRect();
        if (rect.width > 0) d.style.width = `${Math.round(rect.width)}px`;
        if (rect.height > 0) d.style.height = `${Math.round(rect.height)}px`;
        d.style.objectFit = 'contain';
        d.style.opacity = cs.opacity;
        if (cs.transform && cs.transform !== 'none') {
          d.style.transform = cs.transform;
        }
        continue;
      }

      if (cs.display === 'grid') {
        d.style.display = 'table';
        d.style.width = '100%';
        d.style.tableLayout = 'fixed';
      } else if (cs.display === 'flex') {
        d.style.display = 'flex';
        d.style.justifyContent = cs.justifyContent;
        d.style.alignItems = cs.alignItems;
        d.style.flexDirection = cs.flexDirection;
        d.style.gap = cs.gap;
      }
      if (cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent') {
        d.style.backgroundColor = cs.backgroundColor;
      }
      if (cs.color) d.style.color = cs.color;
      if (cs.fontSize) d.style.fontSize = cs.fontSize;
      if (cs.fontWeight && cs.fontWeight !== '400') d.style.fontWeight = cs.fontWeight;
      if (cs.textAlign && cs.textAlign !== 'start') d.style.textAlign = cs.textAlign;
      if (cs.borderBottomWidth && cs.borderBottomWidth !== '0px') {
        d.style.borderBottom = `${cs.borderBottomWidth} ${cs.borderBottomStyle} ${cs.borderBottomColor}`;
      }
      if (cs.borderTopWidth && cs.borderTopWidth !== '0px') {
        d.style.borderTop = `${cs.borderTopWidth} ${cs.borderTopStyle} ${cs.borderTopColor}`;
      }
      if (cs.borderLeftWidth && cs.borderLeftWidth !== '0px') {
        d.style.borderLeft = `${cs.borderLeftWidth} ${cs.borderLeftStyle} ${cs.borderLeftColor}`;
      }
      if (cs.padding && cs.padding !== '0px') d.style.padding = cs.padding;
      if (cs.marginBottom && cs.marginBottom !== '0px') d.style.marginBottom = cs.marginBottom;
      if (cs.transform && cs.transform !== 'none' && s.hasAttribute('data-editable-visual')) {
        d.style.transform = cs.transform;
        d.style.display = 'inline-block';
      }
      d.removeAttribute('contenteditable');
    }

    const bgHex = effectiveLayout?.pageBgColor || '#FFFFFF';
    const primaryHex = effectiveLayout?.primaryColor || '#0B2545';
    const borderCss =
      effectiveLayout?.borderStyle === 'double'
        ? `4px double ${effectiveLayout.borderColor || primaryHex}`
        : effectiveLayout?.borderStyle === 'simple'
        ? `2px solid ${effectiveLayout.borderColor || primaryHex}`
        : '1px solid #cbd5e1';

    return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title>
<style>
  body { margin: 0; padding: 20px; background-color: #f1f5f9; font-family: Arial, Helvetica, sans-serif; color: #0f172a; }
  .doc-sheet { max-width: 740px; margin: 0 auto; background-color: ${bgHex}; border: ${borderCss}; padding: 28px 34px; box-sizing: border-box; position: relative; }
  table { border-collapse: collapse; width: 100%; }
  p { margin: 0 0 8px 0; }
</style>
</head>
<body>
  <div class="doc-sheet">
    ${clone.innerHTML}
  </div>
</body>
</html>`;
  };

  const getSyncedHtmlNow = (): string => {
    const html = buildSyncedEmailHtmlFromLiveA4();
    setLiveSyncedEmailHtml(html);
    return html;
  };

  const effectiveHtml = compiledEmailHtml || liveSyncedEmailHtml || htmlEmailContent;

  const handleCopyHtml = async () => {
    try {
      const freshHtml = getSyncedHtmlNow();
      await navigator.clipboard.writeText(freshHtml);
      setCopiedHtml(true);
      onExportSuccess?.('Code HTML complet (modifications incluses) copié dans le presse-papier.');
      setTimeout(() => setCopiedHtml(false), 3000);
    } catch {
      // ignore
    }
  };

  const handleExportLiveA4Pdf = async () => {
    const sheet = a4SheetRef.current;
    if (!sheet) {
      onDownloadPdf?.();
      return;
    }
    try {
      setSelectedVisualKey(null);
      setFloatingMenu(null);
      onClearExternalSelection?.();
      setIsExportingPdf(true);

      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 60)))
      );

      const canvas = await html2canvas(sheet, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: effectiveLayout?.pageBgColor || '#ffffff',
        ignoreElements: (el) => el.getAttribute('data-html2canvas-ignore') === 'true'
      });

      const orientation = effectiveLayout?.orientation || 'portrait';
      const pageFormat = effectiveLayout?.pageFormat || 'a4';
      const pdf = new jsPDF({ orientation, unit: 'mm', format: pageFormat });
      const pdfPageW = pdf.internal.pageSize.getWidth();
      const pdfPageH = pdf.internal.pageSize.getHeight();

      const imgWidthMm = pdfPageW;
      const imgHeightMm = (canvas.height * imgWidthMm) / canvas.width;
      const imgData = canvas.toDataURL('image/jpeg', 0.96);

      // Si le document tient pratiquement sur 1 page (tolérance 8mm), caler proprement sur 1 page exacte
      if (imgHeightMm <= pdfPageH + 8) {
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfPageW, Math.min(pdfPageH, imgHeightMm));
      } else {
        let heightLeft = imgHeightMm;
        let positionY = 0;
        pdf.addImage(imgData, 'JPEG', 0, positionY, imgWidthMm, imgHeightMm);
        heightLeft -= pdfPageH;

        while (heightLeft > 4) {
          positionY = heightLeft - imgHeightMm;
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, positionY, imgWidthMm, imgHeightMm);
          heightLeft -= pdfPageH;
        }
      }

      const safeFileName = `${title
        .replace(/[^a-zA-Z0-9À-ÿ_-]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 60) || 'Document'}.pdf`;
      pdf.save(safeFileName);
      onExportSuccess?.(`PDF « ${safeFileName} » téléchargé à l'identique de l'aperçu A4.`);
    } catch (err) {
      console.error('[InteractiveDocumentCanvas] Erreur capture PDF A4:', err);
      onDownloadPdf?.();
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleOpenInPlaceForcus = () => {
    setSelectedVisualKey(null);
    setFloatingMenu(null);
    onClearExternalSelection?.();

    const wrapper = editableWrapperRef.current;
    let bodyHtml = htmlEmailContent;
    if (wrapper) {
      const clone = wrapper.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('[data-html2canvas-ignore="true"], .print\\:hidden').forEach((n) => n.remove());
      clone.querySelectorAll('[data-editable-visual="true"]').forEach((n) => n.remove());
      bodyHtml = clone.innerHTML;
    }

    const layers: ForcusDocumentLayer[] = [];
    const buildLayerFromSlot = (
      slot: 'logo' | 'signature' | 'cachet' | 'filigrane' | 'barcode' | 'qrcode',
      src: string | undefined,
      name: string,
      layerType: ForcusDocumentLayer['type'],
      defaultX: number,
      defaultY: number,
      defaultW: number,
      defaultH: number
    ) => {
      if (!src) return;
      const cfg = getSlotSettings(slot);
      const w = cfg.widthUnit === 'px' && cfg.widthValue ? Math.round(cfg.widthValue) : defaultW;
      const h = cfg.heightUnit === 'px' && cfg.heightValue ? Math.round(cfg.heightValue) : defaultH;
      layers.push({
        id: `layer_sync_${slot}_${Date.now()}`,
        name,
        type: layerType,
        content: src,
        x: Math.max(10, Math.min(680, defaultX + Math.round(cfg.offsetX || 0))),
        y: Math.max(10, Math.min(960, defaultY + Math.round(cfg.offsetY || 0))),
        width: w,
        height: h,
        rotation: cfg.rotation || 0,
        opacity: cfg.opacity ?? 100,
        zIndex: cfg.zIndex ?? 20,
        locked: false,
        visible: true,
        wrapMode: cfg.wrapMode === 'behind_text' ? 'behind' : 'infront',
        style: {}
      });
    };

    buildLayerFromSlot('logo', activeLogo, 'Logo Officiel', 'logo', 40, 32, 160, 56);
    buildLayerFromSlot('filigrane', activeFiligrane, 'Filigrane', 'image', 210, 340, 340, 360);
    buildLayerFromSlot('signature', activeSignature, 'Signature', 'signature', 420, 760, 140, 56);
    buildLayerFromSlot('cachet', activeCachet, 'Cachet / Sceau', 'stamp', 560, 745, 110, 110);
    buildLayerFromSlot('qrcode', activeQrCode, 'QR Code', 'image', 40, 930, 60, 60);
    buildLayerFromSlot('barcode', activeBarcode, 'Code-Barres', 'image', 560, 945, 130, 36);

    setForcusInitialHtml(bodyHtml);
    setForcusInitialLayers(layers);
    setIsInPlaceForcusOpen(true);
  };

  // Capture la page A4 tant qu'elle est affichée puis ouvre le Convertisseur 3 Fenêtres sans écran vide
  const handleSwitchToConverter = async () => {
    setSelectedVisualKey(null);
    setFloatingMenu(null);
    onClearExternalSelection?.();
    if (a4SheetRef.current && viewMode === 'a4') {
      try {
        setIsCapturingConverter(true);
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        const rendered = await html2canvas(a4SheetRef.current, {
          scale: 1.4,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          ignoreElements: (el) => el.getAttribute('data-html2canvas-ignore') === 'true'
        });
        if (rendered.width > 0 && rendered.height > 0) {
          setPreCapturedA4DataUrl(rendered.toDataURL('image/png'));
        }
      } catch {
        // Fallback géré par VisualHtmlEmailConverter
      } finally {
        setIsCapturingConverter(false);
      }
    }
    setViewMode('converter');
    setCaptureSignal((s) => s + 1);
  };

  const applyRichCommand = (command: string, value?: string) => {
    try {
      document.execCommand(command, false, value);
      setHasInlineEdits(true);
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-4">
      {/* BARRE DE CONTRÔLE PRINCIPALE */}
      <div className="bg-[#0B2545] text-white p-4 rounded-xl flex flex-col xl:flex-row xl:items-center justify-between gap-4 border border-[#1E3A5F]">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-white/10 shrink-0 mt-0.5">
            <Layers className="w-5 h-5 text-[#D4A017]" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-bold text-sm sm:text-base text-white">{title}</h4>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#134074] text-amber-200 border border-amber-400/30 whitespace-nowrap">
                {documentTypeLabel}
              </span>
              {effectiveLayout && (
                <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 whitespace-nowrap">
                  Modèle imité : {effectiveLayout.sourceFileName}
                </span>
              )}
            </div>
            <p className="text-xs text-blue-100/90 mt-1">
              Cliquez directement sur la feuille A4 pour modifier le texte, passez en Aperçu Email, ou lancez FORCUS Word.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Sélecteur de Vue (3 options claires) */}
          <div className="inline-flex flex-wrap rounded-lg bg-slate-900/70 p-1 border border-white/15 gap-1">
            <button
              type="button"
              onClick={() => setViewMode('a4')}
              className={`min-h-[36px] px-3 py-1.5 rounded-md text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                viewMode === 'a4'
                  ? 'bg-white text-[#0B2545]'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-[#0066B3]" />
              <span>Document A4 (Éditer)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                getSyncedHtmlNow();
                setViewMode('email');
              }}
              className={`min-h-[36px] px-3 py-1.5 rounded-md text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                viewMode === 'email'
                  ? 'bg-amber-400 text-slate-950'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Aperçu Email</span>
            </button>

            <button
              type="button"
              onClick={handleSwitchToConverter}
              className={`min-h-[36px] px-3 py-1.5 rounded-md text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                viewMode === 'converter'
                  ? 'bg-[#0066B3] text-white'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>3 Fenêtres HTML</span>
            </button>
          </div>

          {/* Boutons viewport (visibles en Email / Convertisseur) */}
          {viewMode !== 'a4' && (
            <div className="inline-flex rounded-lg bg-slate-900/70 p-1 border border-white/15">
              <button
                type="button"
                onClick={() => setEmailViewport('desktop')}
                title="Aperçu Desktop (600px)"
                className={`p-1.5 rounded cursor-pointer ${
                  emailViewport === 'desktop' ? 'bg-white/20 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Monitor className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setEmailViewport('tablet')}
                title="Aperçu Tablette"
                className={`p-1.5 rounded cursor-pointer ${
                  emailViewport === 'tablet' ? 'bg-white/20 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Tablet className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setEmailViewport('mobile')}
                title="Aperçu Mobile (375px)"
                className={`p-1.5 rounded cursor-pointer ${
                  emailViewport === 'mobile' ? 'bg-white/20 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* BARRE D'ACTIONS D'EXPORT & ÉDITION */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleOpenInPlaceForcus}
            className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-[#2B579A] hover:bg-[#23477F] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Edit3 className="w-3.5 h-3.5 text-amber-300" />
            <span>Ouvrir FORCUS Word</span>
          </button>

          {viewMode === 'a4' && (
            <div className="inline-flex flex-wrap items-center gap-1 bg-white border border-slate-200 rounded-lg p-1">
              {/* Police & Taille style Word 2013 */}
              <select
                value={activeFontName}
                onMouseDown={(e) => e.stopPropagation()}
                onChange={(e) => {
                  setActiveFontName(e.target.value);
                  applyRichCommand('fontName', e.target.value);
                }}
                title="Police du texte sélectionné"
                className="h-7 px-1.5 rounded border border-slate-200 text-[11px] font-semibold text-slate-700 bg-slate-50 cursor-pointer"
              >
                <option value="Arial">Arial</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Georgia">Georgia</option>
                <option value="Calibri">Calibri</option>
                <option value="Verdana">Verdana</option>
                <option value="Courier New">Courier New</option>
              </select>

              <select
                value={activeFontSize}
                onMouseDown={(e) => e.stopPropagation()}
                onChange={(e) => {
                  setActiveFontSize(e.target.value);
                  applyRichCommand('fontSize', e.target.value);
                }}
                title="Taille de police"
                className="h-7 px-1.5 rounded border border-slate-200 text-[11px] font-mono text-slate-700 bg-slate-50 cursor-pointer"
              >
                <option value="1">8 pt</option>
                <option value="2">10 pt</option>
                <option value="3">12 pt</option>
                <option value="4">14 pt</option>
                <option value="5">18 pt</option>
                <option value="6">24 pt</option>
              </select>

              <span className="w-px h-4 bg-slate-200 mx-0.5" />

              <button
                type="button"
                onClick={() => applyRichCommand('bold')}
                title="Gras (Ctrl+B)"
                className="p-1.5 rounded hover:bg-slate-100 text-slate-700 cursor-pointer"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => applyRichCommand('italic')}
                title="Italique (Ctrl+I)"
                className="p-1.5 rounded hover:bg-slate-100 text-slate-700 cursor-pointer"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => applyRichCommand('underline')}
                title="Souligné (Ctrl+U)"
                className="p-1.5 rounded hover:bg-slate-100 text-slate-700 cursor-pointer"
              >
                <Underline className="w-3.5 h-3.5" />
              </button>

              <label
                title="Couleur du texte"
                className="px-1 py-0.5 rounded hover:bg-slate-100 cursor-pointer inline-flex items-center gap-1"
              >
                <span className="text-[11px] font-extrabold underline" style={{ color: activeTextColor }}>
                  A
                </span>
                <input
                  type="color"
                  value={activeTextColor}
                  onChange={(e) => {
                    setActiveTextColor(e.target.value);
                    applyRichCommand('foreColor', e.target.value);
                  }}
                  className="w-4 h-4 p-0 border-0 bg-transparent cursor-pointer"
                />
              </label>

              <label
                title="Surlignage du texte"
                className="px-1 py-0.5 rounded hover:bg-slate-100 cursor-pointer inline-flex items-center gap-0.5"
              >
                <Highlighter className="w-3.5 h-3.5 text-amber-600" />
                <input
                  type="color"
                  value={activeHighlightColor}
                  onChange={(e) => {
                    setActiveHighlightColor(e.target.value);
                    applyRichCommand('hiliteColor', e.target.value);
                  }}
                  className="w-4 h-4 p-0 border-0 bg-transparent cursor-pointer"
                />
              </label>

              <span className="w-px h-4 bg-slate-200 mx-0.5" />
              <button
                type="button"
                onClick={() => applyRichCommand('insertUnorderedList')}
                title="Liste à puces"
                className="p-1.5 rounded hover:bg-slate-100 text-slate-700 cursor-pointer"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => applyRichCommand('insertOrderedList')}
                title="Liste numérotée"
                className="p-1.5 rounded hover:bg-slate-100 text-slate-700 cursor-pointer"
              >
                <ListOrdered className="w-3.5 h-3.5" />
              </button>

              <span className="w-px h-4 bg-slate-200 mx-0.5" />
              <button
                type="button"
                onClick={() => applyRichCommand('justifyLeft')}
                title="Aligner à gauche"
                className="p-1.5 rounded hover:bg-slate-100 text-slate-700 cursor-pointer"
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => applyRichCommand('justifyCenter')}
                title="Centrer"
                className="p-1.5 rounded hover:bg-slate-100 text-slate-700 cursor-pointer"
              >
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => applyRichCommand('justifyRight')}
                title="Aligner à droite"
                className="p-1.5 rounded hover:bg-slate-100 text-slate-700 cursor-pointer"
              >
                <AlignRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => applyRichCommand('justifyFull')}
                title="Justifier"
                className="p-1.5 rounded hover:bg-slate-100 text-slate-700 cursor-pointer"
              >
                <AlignJustify className="w-3.5 h-3.5" />
              </button>
              <span className="w-px h-4 bg-slate-200 mx-0.5" />
              <button
                type="button"
                onClick={() => applyRichCommand('undo')}
                title="Annuler"
                className="p-1.5 rounded hover:bg-slate-100 text-slate-700 cursor-pointer"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => applyRichCommand('redo')}
                title="Rétablir"
                className="p-1.5 rounded hover:bg-slate-100 text-slate-700 cursor-pointer"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
              {(hasCustomText || hasInlineEdits || appliedForcusHtml !== null) && (
                <>
                  <span className="w-px h-4 bg-slate-200 mx-0.5" />
                  <button
                    type="button"
                    onClick={() => {
                      setHasInlineEdits(false);
                      setAppliedForcusHtml(null);
                      setCompiledEmailHtml('');
                      setResetNonce((n) => n + 1);
                      onResetText?.();
                    }}
                    className="px-2 py-1 rounded hover:bg-amber-50 text-amber-800 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Réinitialiser texte</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (
                preferCustomPdfDownloadWhenUnedited &&
                onDownloadPdf &&
                !hasInlineEdits &&
                appliedForcusHtml === null
              ) {
                onDownloadPdf();
                return;
              }
              handleExportLiveA4Pdf();
            }}
            disabled={isExportingPdf}
            className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-[#0066B3] hover:bg-[#004f8c] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap disabled:opacity-60"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExportingPdf ? 'Export PDF...' : 'Télécharger PDF'}</span>
          </button>

          {onDownloadWord && (
            <button
              type="button"
              onClick={onDownloadWord}
              className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold inline-flex items-center gap-1.5 border border-slate-300 cursor-pointer whitespace-nowrap"
            >
              <FileText className="w-3.5 h-3.5 text-[#0066B3]" />
              <span>Word (.docx)</span>
            </button>
          )}

          {onDownloadHtml && (
            <button
              type="button"
              onClick={() => onDownloadHtml(getSyncedHtmlNow())}
              className="min-h-[38px] px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold inline-flex items-center gap-1.5 border border-slate-300 cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600" />
              <span>.HTML</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCopyHtml}
            className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            {copiedHtml ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedHtml ? 'Code Copié !' : 'Copier HTML'}</span>
          </button>

          {onOpenInWebmail && (
            <button
              type="button"
              onClick={() => onOpenInWebmail(getSyncedHtmlNow())}
              className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              title="Transférer directement vers le Webmail Infomaniak"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Infomaniak</span>
            </button>
          )}
        </div>
      </div>

      {/* FEUILLE A4 ORIGINALE (Adaptée proportionnellement sur mobile/tablette ; non scalée lors de la capture PDF/HTML) */}
      <div
        className={
          viewMode === 'a4'
            ? 'bg-slate-100 border border-slate-200 p-2 sm:p-6 rounded-xl overflow-hidden'
            : 'fixed -left-[9999px] top-0 pointer-events-none opacity-100'
        }
        aria-hidden={viewMode !== 'a4'}
      >
        <ResponsivePaperWrapper
          paperWidthPx={effectiveLayout?.orientation === 'landscape' ? 1050 : 794}
          minPaperHeightPx={effectiveLayout?.orientation === 'landscape' ? 794 : 1122}
          bypassScale={isExportingPdf || isCapturingConverter || viewMode !== 'a4'}
        >
        <div
          ref={a4SheetRef}
          onDoubleClick={(e) => {
            if (viewMode !== 'a4') return;
            const rect = e.currentTarget.getBoundingClientRect();
            setFloatingMenu({
              x: Math.round(e.clientX - rect.left),
              y: Math.round(e.clientY - rect.top)
            });
          }}
          onClick={() => {
            if (floatingMenu) setFloatingMenu(null);
            if (selectedVisualKey) setSelectedVisualKey(null);
          }}
          className="shadow-lg rounded-sm relative flex flex-col justify-between transition-all"
          style={{
            width: effectiveLayout?.orientation === 'landscape' ? '1050px' : '794px',
            minHeight: effectiveLayout?.orientation === 'landscape' ? '794px' : '1122px',
            backgroundColor: effectiveLayout?.pageBgColor || '#ffffff',
            color: effectiveLayout?.bodyTextColor || '#0f172a',
            paddingTop: effectiveLayout ? `${Math.round(effectiveLayout.marginsMm.top * 2.8)}px` : '44px',
            paddingRight: effectiveLayout ? `${Math.round(effectiveLayout.marginsMm.right * 2.8)}px` : '44px',
            paddingBottom: effectiveLayout ? `${Math.round(effectiveLayout.marginsMm.bottom * 2.8)}px` : '44px',
            paddingLeft: effectiveLayout ? `${Math.round(effectiveLayout.marginsMm.left * 2.8)}px` : '44px',
            border:
              effectiveLayout?.borderStyle === 'double'
                ? `4px double ${effectiveLayout.borderColor || '#0B2545'}`
                : effectiveLayout?.borderStyle === 'simple'
                ? `2px solid ${effectiveLayout.borderColor || '#0B2545'}`
                : effectiveLayout?.borderStyle === 'official_band'
                ? `3px solid ${effectiveLayout.primaryColor || '#0B2545'}`
                : '1px solid #e2e8f0',
            fontFamily:
              effectiveLayout?.fontFamily === 'times'
                ? 'Georgia, "Times New Roman", Times, serif'
                : effectiveLayout?.fontFamily === 'courier'
                ? '"Courier New", Courier, monospace'
                : 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif'
          }}
        >
          {floatingMenu && !isExportingPdf && (
            <div
              data-html2canvas-ignore="true"
              style={{
                position: 'absolute',
                left: `${floatingMenu.x}px`,
                top: `${floatingMenu.y}px`
              }}
              className="print:hidden bg-slate-900 text-white rounded-xl p-3 shadow-2xl border border-amber-400 z-50 text-xs flex flex-col gap-1.5 min-w-[210px]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-1.5 mb-1">
                <span className="font-bold text-amber-300">Options rapides :</span>
                <button
                  type="button"
                  onClick={() => setFloatingMenu(null)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>
              {onOpenForcusEditor ? (
                <button
                  type="button"
                  onClick={() => {
                    setFloatingMenu(null);
                    onOpenForcusEditor();
                  }}
                  className="p-1.5 hover:bg-white/10 rounded flex items-center gap-2 text-left cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-blue-400" />
                  <span>Ouvrir dans FORCUS Word</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setFloatingMenu(null);
                    handleOpenInPlaceForcus();
                  }}
                  className="p-1.5 hover:bg-white/10 rounded flex items-center gap-2 text-left cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-blue-400" />
                  <span>Ouvrir dans FORCUS Word</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setFloatingMenu(null);
                  document.execCommand('insertText', false, ' [Texte inséré] ');
                }}
                className="p-1.5 hover:bg-white/10 rounded flex items-center gap-2 text-left cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Insérer un paragraphe ici</span>
              </button>
            </div>
          )}

          {/* Arrière-plan & Filigrane avec réglages exacts */}
          {activeArrierePlan && (
            <div
              className="absolute inset-0 pointer-events-none overflow-hidden"
              style={{
                backgroundImage: `url(${activeArrierePlan})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                opacity: (getSlotSettings('arrierePlan').opacity ?? 20) / 100,
                zIndex: 0
              }}
            />
          )}

          {activeFiligrane && (
            <div
              className="absolute inset-0 pointer-events-none flex items-center justify-center"
              style={{
                zIndex: getSlotSettings('filigrane').zIndex ?? 0
              }}
            >
              <div className={onChangeAssetsConfig ? 'pointer-events-auto' : 'pointer-events-none'}>
                <EditableDocumentVisual
                  src={activeFiligrane}
                  alt="Filigrane"
                  label="Filigrane"
                  settings={{
                    ...getSlotSettings('filigrane'),
                    opacity: getSlotSettings('filigrane').opacity ?? 15
                  }}
                  isSelected={selectedVisualKey === 'filigrane' && !isExportingPdf}
                  onSelect={() => setSelectedVisualKey('filigrane')}
                  onDeselect={() => setSelectedVisualKey((cur) => (cur === 'filigrane' ? null : cur))}
                  onUpdateSettings={(patch) => updateSlotSettings('filigrane', patch)}
                  onReset={() => resetSlotSettings('filigrane')}
                  defaultWidthPx={380}
                  defaultHeightPx={460}
                  interactive={Boolean(onChangeAssetsConfig)}
                />
              </div>
            </div>
          )}

          {/* En-tête Logo Acteur + Contenu Principal */}
          <div className="relative z-10 space-y-5 flex-1 flex flex-col">
            {!hideGenericChrome && activeLogo && (
              <div
                className={`flex items-center border-b border-slate-200 pb-4 ${
                  effectiveLayout?.logoPlacement === 'top_right'
                    ? 'flex-row-reverse justify-between'
                    : effectiveLayout?.logoPlacement === 'top_center'
                    ? 'flex-col justify-center gap-2 text-center'
                    : 'justify-between'
                }`}
              >
                <EditableDocumentVisual
                  src={activeLogo}
                  alt="Logo officiel"
                  label="Logo"
                  settings={getSlotSettings('logo')}
                  isSelected={selectedVisualKey === 'logo' && !isExportingPdf}
                  onSelect={() => setSelectedVisualKey('logo')}
                  onDeselect={() => setSelectedVisualKey((cur) => (cur === 'logo' ? null : cur))}
                  onUpdateSettings={(patch) => updateSlotSettings('logo', patch)}
                  onReset={() => resetSlotSettings('logo')}
                  defaultWidthPx={180}
                  defaultHeightPx={65}
                  interactive={Boolean(onChangeAssetsConfig)}
                />
                <span className="text-[11px] font-mono text-slate-500 uppercase">
                  {documentTypeLabel}
                </span>
              </div>
            )}

            <div
              key={resetNonce}
              ref={editableWrapperRef}
              className="outline-none flex-1 flex flex-col"
              style={{
                lineHeight:
                  effectiveLayout?.blockSpacing === 'compact'
                    ? 1.42
                    : effectiveLayout?.blockSpacing === 'airy'
                    ? 1.85
                    : 1.55
              }}
              onInput={() => {
                // Conserver la mise en page intacte dans le DOM éditable sans écraser useBlueprintLayout
                if (!hasInlineEdits) setHasInlineEdits(true);
              }}
            >
              {appliedForcusHtml !== null ? (
                <div
                  contentEditable
                  suppressContentEditableWarning
                  className="outline-none space-y-3"
                  dangerouslySetInnerHTML={{ __html: appliedForcusHtml }}
                />
              ) : (
                children
              )}
            </div>
          </div>

          {/* Pied de page visuel avec Signature, Cachet, Code-Barres, QR Code */}
          {!hideGenericChrome && (activeSignature || activeCachet || activeBarcode || activeQrCode) && (
            <div className="relative z-10 mt-8 pt-5 border-t border-slate-200 flex items-end justify-between gap-4">
              <div className="flex items-end gap-6">
                {activeSignature && (
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block mb-1">Signature</span>
                    <EditableDocumentVisual
                      src={activeSignature}
                      alt="Signature"
                      label="Signature"
                      settings={getSlotSettings('signature')}
                      isSelected={selectedVisualKey === 'signature' && !isExportingPdf}
                      onSelect={() => setSelectedVisualKey('signature')}
                      onDeselect={() => setSelectedVisualKey((cur) => (cur === 'signature' ? null : cur))}
                      onUpdateSettings={(patch) => updateSlotSettings('signature', patch)}
                      onReset={() => resetSlotSettings('signature')}
                      defaultWidthPx={140}
                      defaultHeightPx={56}
                      interactive={Boolean(onChangeAssetsConfig)}
                    />
                  </div>
                )}
                {activeCachet && (
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block mb-1">Cachet / Sceau</span>
                    <EditableDocumentVisual
                      src={activeCachet}
                      alt="Cachet"
                      label="Cachet / Sceau"
                      settings={getSlotSettings('cachet')}
                      isSelected={selectedVisualKey === 'cachet' && !isExportingPdf}
                      onSelect={() => setSelectedVisualKey('cachet')}
                      onDeselect={() => setSelectedVisualKey((cur) => (cur === 'cachet' ? null : cur))}
                      onUpdateSettings={(patch) => updateSlotSettings('cachet', patch)}
                      onReset={() => resetSlotSettings('cachet')}
                      defaultWidthPx={140}
                      defaultHeightPx={70}
                      interactive={Boolean(onChangeAssetsConfig)}
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                {activeBarcode && (
                  <EditableDocumentVisual
                    src={activeBarcode}
                    alt="Code-Barres"
                    label="Code-Barres"
                    settings={getSlotSettings('barcode')}
                    isSelected={selectedVisualKey === 'barcode' && !isExportingPdf}
                    onSelect={() => setSelectedVisualKey('barcode')}
                    onDeselect={() => setSelectedVisualKey((cur) => (cur === 'barcode' ? null : cur))}
                    onUpdateSettings={(patch) => updateSlotSettings('barcode', patch)}
                    onReset={() => resetSlotSettings('barcode')}
                    defaultWidthPx={150}
                    defaultHeightPx={48}
                    interactive={Boolean(onChangeAssetsConfig)}
                  />
                )}
                {activeQrCode && (
                  <EditableDocumentVisual
                    src={activeQrCode}
                    alt="QR Code"
                    label="QR Code"
                    settings={getSlotSettings('qrcode')}
                    isSelected={selectedVisualKey === 'qrcode' && !isExportingPdf}
                    onSelect={() => setSelectedVisualKey('qrcode')}
                    onDeselect={() => setSelectedVisualKey((cur) => (cur === 'qrcode' ? null : cur))}
                    onUpdateSettings={(patch) => updateSlotSettings('qrcode', patch)}
                    onReset={() => resetSlotSettings('qrcode')}
                    defaultWidthPx={64}
                    defaultHeightPx={64}
                    className="border border-slate-200 p-0.5 rounded bg-white"
                    interactive={Boolean(onChangeAssetsConfig)}
                  />
                )}
              </div>
            </div>
          )}
        </div>
        </ResponsivePaperWrapper>
      </div>

      {/* VUE 3 FENÊTRES (DÉCOUPAGE CANVAS + APERÇU EMAIL + CODE SOURCE) */}
      {viewMode === 'converter' && (
        <VisualHtmlEmailConverter
          title={title}
          fallbackHtmlEmail={effectiveHtml}
          emailViewport={emailViewport}
          captureTargetRef={a4SheetRef}
          initialCanvasDataUrl={preCapturedA4DataUrl}
          autoCaptureSignal={captureSignal}
          onOpenInWebmail={onOpenInWebmail}
          onHtmlCompiled={setCompiledEmailHtml}
        />
      )}

      {/* VUE APERÇU EMAIL RESPONSIVE */}
      {viewMode === 'email' && (
        <div className="bg-slate-800 p-4 sm:p-8 rounded-xl flex flex-col items-center gap-4">
          <div className="w-full flex items-center justify-between text-xs text-slate-300 px-2 max-w-4xl">
            <span className="font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Aperçu fidèle tel qu’affiché dans la boîte de réception du destinataire
            </span>
            <span className="font-mono text-amber-300 tabular-nums">
              {emailViewport === 'desktop'
                ? '600px (Webmail)'
                : emailViewport === 'tablet'
                ? '640px (Tablette)'
                : '375px (Mobile)'}
            </span>
          </div>

          <div
            className={`transition-all duration-300 bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-700 ${
              emailViewport === 'mobile'
                ? 'w-full max-w-[375px]'
                : emailViewport === 'tablet'
                ? 'w-full max-w-[640px]'
                : 'w-full max-w-[680px]'
            }`}
          >
            <div className="bg-slate-100 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span className="font-bold text-slate-700 ml-2">Webmail / Gmail Preview</span>
              </div>
              <span className="text-[11px] font-mono text-slate-500">HTML Table Responsive</span>
            </div>

            <div className="p-3 sm:p-4 bg-slate-50 min-h-[500px]">
              <iframe
                title="Aperçu Email Responsive"
                srcDoc={effectiveHtml}
                className="w-full min-h-[720px] border-0 bg-white shadow-xs rounded-lg"
                sandbox="allow-same-origin"
              />
            </div>
          </div>
        </div>
      )}

      {/* Modale d'édition FORCUS In-Situ */}
      {isInPlaceForcusOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-fade-in">
          <div className="w-full max-w-7xl h-[94vh] bg-white rounded-xl overflow-hidden shadow-2xl flex flex-col border border-slate-700">
            <ForcusWordEditor
              isEmbeddedModal={true}
              initialTitle={title}
              initialHtmlContent={forcusInitialHtml}
              initialLayers={forcusInitialLayers}
              onApplyToDocument={(newHtml) => {
                setAppliedForcusHtml(newHtml);
                setHasInlineEdits(true);
                setCompiledEmailHtml('');
                setIsInPlaceForcusOpen(false);
              }}
              onClose={() => setIsInPlaceForcusOpen(false)}
              onOpenInWebmail={onOpenInWebmail}
            />
          </div>
        </div>
      )}
    </div>
  );
};
