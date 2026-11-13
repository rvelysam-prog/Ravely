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
  Eye
} from 'lucide-react';
import {
  PdfImportedAssetsConfig,
  UploadedAssetUrlsMap
} from '../../services/departmentsAndEmailService';
import { ForcusWordEditor } from '../admin/ForcusWordEditor';
import { VisualHtmlEmailConverter } from './VisualHtmlEmailConverter';

export interface InteractiveCanvasProps {
  title: string;
  documentTypeLabel: string;
  assetsConfig: PdfImportedAssetsConfig;
  onChangeAssetsConfig?: (config: PdfImportedAssetsConfig) => void;
  uploadedAssetUrls?: UploadedAssetUrlsMap;
  exclusiveVisualSet?: {
    logo?: string;
    signature?: string;
    cachet?: string;
    filigrane?: string;
    arrierePlan?: string;
    barcode?: string;
    qrcode?: string;
  };
  htmlEmailContent: string;
  onDownloadPdf?: () => void;
  onDownloadWord?: () => void;
  onDownloadHtml?: (compiledHtml: string) => void;
  onOpenInWebmail?: (html: string) => void;
  onOpenForcusEditor?: () => void;
  onTextEdited?: (editedText: string) => void;
  children: React.ReactNode;
}

export const InteractiveDocumentCanvas: React.FC<InteractiveCanvasProps> = ({
  title,
  documentTypeLabel,
  assetsConfig,
  uploadedAssetUrls = {},
  exclusiveVisualSet,
  htmlEmailContent,
  onDownloadPdf,
  onDownloadWord,
  onDownloadHtml,
  onOpenInWebmail,
  onOpenForcusEditor,
  onTextEdited,
  children
}) => {
  // Moteur 2 (PDF A4 Original) vs Moteur 1 (Client Mail Responsive)
  const [renderEngine, setRenderEngine] = useState<'pdf' | 'email'>('pdf');
  // Mode d'affichage : Vue 3 Fenêtres (Canvas + Aperçu Email + Code Source) vs Feuille A4 Directe (pour édition texte directe)
  const [workspaceMode, setWorkspaceMode] = useState<'three_panels' | 'a4_direct_edit'>('three_panels');
  const [captureSignal, setCaptureSignal] = useState<number>(1);
  const [compiledEmailHtml, setCompiledEmailHtml] = useState<string>(htmlEmailContent);

  const [isInPlaceForcusOpen, setIsInPlaceForcusOpen] = useState(false);
  const [emailViewport, setEmailViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [copiedHtml, setCopiedHtml] = useState(false);
  const [floatingMenu, setFloatingMenu] = useState<{ x: number; y: number } | null>(null);

  const a4SheetRef = useRef<HTMLDivElement | null>(null);

  const activeArrierePlan = exclusiveVisualSet?.arrierePlan || uploadedAssetUrls.arrierePlan;
  const activeFiligrane = exclusiveVisualSet?.filigrane || uploadedAssetUrls.filigrane;
  const activeLogo = exclusiveVisualSet?.logo || uploadedAssetUrls.logo;
  const activeSignature = exclusiveVisualSet?.signature || uploadedAssetUrls.signature;
  const activeCachet = exclusiveVisualSet?.cachet || uploadedAssetUrls.cachet;
  const activeBarcode = exclusiveVisualSet?.barcode || uploadedAssetUrls.barcodeEmployeur;
  const activeQrCode = exclusiveVisualSet?.qrcode || uploadedAssetUrls.qrcodeEmployeur;

  const effectiveHtml = compiledEmailHtml || htmlEmailContent;

  const handleCopyHtml = async () => {
    try {
      await navigator.clipboard.writeText(effectiveHtml);
      setCopiedHtml(true);
      setTimeout(() => setCopiedHtml(false), 3000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="space-y-4">
      {/* BARRE DE CONTRÔLE SOMBRE DES DEUX MOTEURS DE RENDU */}
      <div className="bg-[#0B2545] text-white p-3 sm:p-4 rounded-2xl flex flex-col xl:flex-row xl:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2.5">
          <Layers className="w-5 h-5 text-[#D4A017] shrink-0" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-bold text-sm text-white">{title}</h4>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#134074] text-amber-300 border border-amber-400/30">
                {documentTypeLabel}
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              Double moteur de rendu &amp; Convertisseur 3 Fenêtres : Cliquez sur « Moteur 2 : PDF A4 Original » pour découper le A4 sur Canvas, ou éditez directement le texte.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Sélecteur Moteur 2 vs Moteur 1 */}
          <div className="inline-flex rounded-xl bg-slate-900/60 p-1 border border-white/10">
            <button
              type="button"
              onClick={() => {
                setRenderEngine('pdf');
                setWorkspaceMode('three_panels');
                setCaptureSignal((s) => s + 1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                renderEngine === 'pdf'
                  ? 'bg-white text-[#0B2545] shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-[#0066B3]" />
              <span>Moteur 2 : PDF A4 Original</span>
            </button>

            <button
              type="button"
              onClick={() => setRenderEngine('email')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                renderEngine === 'email'
                  ? 'bg-amber-400 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Mail className="w-3.5 h-3.5 text-slate-900" />
              <span>Moteur 1 : Client Mail Responsive</span>
            </button>
          </div>

          {/* Bascule Vue 3 Fenêtres vs Édition Texte Directe A4 */}
          {renderEngine === 'pdf' && (
            <div className="inline-flex rounded-xl bg-slate-900/60 p-1 border border-white/10">
              <button
                type="button"
                onClick={() => {
                  setWorkspaceMode('three_panels');
                  setCaptureSignal((s) => s + 1);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer ${
                  workspaceMode === 'three_panels'
                    ? 'bg-[#0066B3] text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Columns className="w-3.5 h-3.5" />
                <span>3 Fenêtres</span>
              </button>
              <button
                type="button"
                onClick={() => setWorkspaceMode('a4_direct_edit')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer ${
                  workspaceMode === 'a4_direct_edit'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Éditer A4 Direct</span>
              </button>
            </div>
          )}

          {/* Boutons viewport */}
          <div className="inline-flex rounded-xl bg-slate-900/60 p-1 border border-white/10">
            <button
              type="button"
              onClick={() => setEmailViewport('desktop')}
              title="Aperçu Desktop (600px)"
              className={`p-1.5 rounded-lg cursor-pointer ${
                emailViewport === 'desktop' ? 'bg-white/20 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setEmailViewport('tablet')}
              title="Aperçu Tablette"
              className={`p-1.5 rounded-lg cursor-pointer ${
                emailViewport === 'tablet' ? 'bg-white/20 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Tablet className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setEmailViewport('mobile')}
              title="Aperçu Mobile (375px)"
              className={`p-1.5 rounded-lg cursor-pointer ${
                emailViewport === 'mobile' ? 'bg-white/20 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Actions d'édition et d'export */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsInPlaceForcusOpen(true)}
              className="min-h-[34px] px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="Ouvrir l'éditeur complet FORCUS Word 2013 directement sur ce document"
            >
              <Edit3 className="w-3.5 h-3.5 text-amber-300" />
              <span>Éditer avec FORCUS</span>
            </button>

            {onDownloadPdf && (
              <button
                type="button"
                onClick={onDownloadPdf}
                className="min-h-[34px] px-3 py-1.5 rounded-xl bg-[#0066B3] hover:bg-[#004f8c] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Télécharger PDF</span>
              </button>
            )}

            {onDownloadWord && (
              <button
                type="button"
                onClick={onDownloadWord}
                className="min-h-[34px] px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold inline-flex items-center gap-1.5 border border-white/10 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-amber-300" />
                <span>Word (.docx)</span>
              </button>
            )}

            {onDownloadHtml && (
              <button
                type="button"
                onClick={() => onDownloadHtml(effectiveHtml)}
                className="min-h-[34px] px-3 py-1.5 rounded-xl bg-indigo-700 hover:bg-indigo-600 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>.HTML</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCopyHtml}
              className="min-h-[34px] px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              {copiedHtml ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedHtml ? 'Code Copié !' : 'Copier HTML Responsive'}</span>
            </button>

            {onOpenInWebmail && (
              <button
                type="button"
                onClick={() => onOpenInWebmail(effectiveHtml)}
                className="min-h-[34px] px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                title="Transférer directement vers le Webmail Infomaniak"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Infomaniak</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* FEUILLE A4 ORIGINALE (Visible en mode 'a4_direct_edit', rendue hors-écran en mode 'three_panels' pour capture fidèle via html2canvas) */}
      <div
        className={
          renderEngine === 'pdf' && workspaceMode === 'a4_direct_edit'
            ? 'bg-slate-200/70 p-4 sm:p-8 rounded-2xl flex justify-center overflow-x-auto'
            : 'fixed -left-[9999px] top-0 pointer-events-none opacity-100'
        }
        aria-hidden={!(renderEngine === 'pdf' && workspaceMode === 'a4_direct_edit')}
      >
        <div
          ref={a4SheetRef}
          onDoubleClick={(e) => {
            if (workspaceMode !== 'a4_direct_edit') return;
            const rect = e.currentTarget.getBoundingClientRect();
            setFloatingMenu({
              x: Math.round(e.clientX - rect.left),
              y: Math.round(e.clientY - rect.top)
            });
          }}
          onClick={() => {
            if (floatingMenu) setFloatingMenu(null);
          }}
          className="w-[794px] min-h-[1122px] bg-white text-slate-900 shadow-2xl rounded-sm p-10 sm:p-12 relative border border-slate-300 flex flex-col justify-between"
          style={{
            fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif'
          }}
        >
          {floatingMenu && (
            <div
              style={{
                position: 'absolute',
                left: `${floatingMenu.x}px`,
                top: `${floatingMenu.y}px`
              }}
              className="bg-slate-900 text-white rounded-xl p-3 shadow-2xl border border-amber-400 z-50 text-xs flex flex-col gap-1.5 min-w-[210px]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-1.5 mb-1">
                <span className="font-bold text-amber-300">Options d'insertion :</span>
                <button
                  type="button"
                  onClick={() => setFloatingMenu(null)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              {onOpenForcusEditor && (
                <button
                  type="button"
                  onClick={() => {
                    setFloatingMenu(null);
                    onOpenForcusEditor();
                  }}
                  className="p-1.5 hover:bg-white/10 rounded flex items-center gap-2 text-left"
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
                className="p-1.5 hover:bg-white/10 rounded flex items-center gap-2 text-left"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Insérer paragraphe ici</span>
              </button>
            </div>
          )}

          {/* Arrière-plan & Filigrane */}
          {activeArrierePlan && (
            <div
              className="absolute inset-0 pointer-events-none overflow-hidden z-0"
              style={{
                backgroundImage: `url(${activeArrierePlan})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                opacity: (assetsConfig.arrierePlan?.opacity ?? 20) / 100
              }}
            />
          )}

          {activeFiligrane && (
            <div
              className="absolute inset-0 pointer-events-none flex items-center justify-center z-0"
              style={{
                transform: `translate(${assetsConfig.filigrane?.offsetX || 0}px, ${
                  assetsConfig.filigrane?.offsetY || 0
                }px) rotate(${assetsConfig.filigrane?.rotation || 0}deg)`
              }}
            >
              <img
                src={activeFiligrane}
                alt="Filigrane"
                className="max-w-[400px] max-h-[500px] object-contain"
                style={{ opacity: (assetsConfig.filigrane?.opacity ?? 15) / 100 }}
              />
            </div>
          )}

          {/* En-tête Logo Acteur si présent */}
          <div className="relative z-10 space-y-4">
            {activeLogo && (
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <img
                  src={activeLogo}
                  alt="Logo officiel"
                  style={{
                    width: `${assetsConfig.logo?.widthValue || 150}px`,
                    maxHeight: `${assetsConfig.logo?.heightValue || 60}px`,
                    opacity: (assetsConfig.logo?.opacity ?? 100) / 100
                  }}
                  className="object-contain"
                />
                <span className="text-[10px] font-mono text-slate-500 uppercase">
                  {documentTypeLabel}
                </span>
              </div>
            )}

            {/* Contenu principal du document */}
            <div
              className="outline-none"
              onInput={(e) => {
                const target = e.target as HTMLElement;
                if (onTextEdited) {
                  onTextEdited(target.innerText || target.innerHTML);
                }
              }}
            >
              {children}
            </div>
          </div>

          {/* Pied de page visuel avec Signature, Cachet, Code-Barres, QR Code de l'acteur lié */}
          {(activeSignature || activeCachet || activeBarcode || activeQrCode) && (
            <div className="relative z-10 mt-8 pt-4 border-t border-slate-200 flex items-end justify-between gap-4">
              <div className="flex items-center gap-4">
                {activeSignature && (
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block mb-1">Signature</span>
                    <img
                      src={activeSignature}
                      alt="Signature"
                      className="max-h-14 max-w-[130px] object-contain"
                    />
                  </div>
                )}
                {activeCachet && (
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block mb-1">Cachet / Sceau</span>
                    <img
                      src={activeCachet}
                      alt="Cachet"
                      className="max-h-16 max-w-[140px] object-contain"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                {activeBarcode && (
                  <img
                    src={activeBarcode}
                    alt="Code-Barres"
                    className="max-h-12 max-w-[140px] object-contain"
                  />
                )}
                {activeQrCode && (
                  <img
                    src={activeQrCode}
                    alt="QR Code"
                    className="w-14 h-14 object-contain border border-slate-200 p-0.5 rounded bg-white"
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AFFICHAGE PRINCIPAL : VUE 3 FENÊTRES (DÉCOUPAGE CANVAS + APERÇU EMAIL + CODE SOURCE) OU MOTEUR 1 MAIL */}
      {renderEngine === 'pdf' && workspaceMode === 'three_panels' ? (
        <VisualHtmlEmailConverter
          title={title}
          fallbackHtmlEmail={htmlEmailContent}
          emailViewport={emailViewport}
          captureTargetRef={a4SheetRef}
          autoCaptureSignal={captureSignal}
          onOpenInWebmail={onOpenInWebmail}
          onHtmlCompiled={setCompiledEmailHtml}
        />
      ) : renderEngine === 'email' ? (
        <div className="bg-slate-800 p-4 sm:p-8 rounded-2xl flex flex-col items-center gap-4">
          <div className="w-full flex items-center justify-between text-xs text-slate-300 px-2 max-w-4xl">
            <span className="font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Aperçu fidèle tel qu'affiché dans la boîte de réception du destinataire
            </span>
            <span className="font-mono text-amber-300">
              Largeur conteneur :{' '}
              {emailViewport === 'desktop'
                ? '600px (Webmail)'
                : emailViewport === 'tablet'
                ? '640px'
                : '375px (Mobile)'}
            </span>
          </div>

          <div
            className={`transition-all duration-300 bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-700 ${
              emailViewport === 'mobile'
                ? 'w-[375px]'
                : emailViewport === 'tablet'
                ? 'w-[640px]'
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
              <span className="text-[11px] font-mono text-slate-500">HTML Table Responsive 100%</span>
            </div>

            <div className="p-2 sm:p-4 bg-slate-50 min-h-[500px]">
              <iframe
                title="Aperçu Email Responsive"
                srcDoc={effectiveHtml}
                className="w-full min-h-[750px] border-0 bg-white shadow-xs rounded-lg"
                sandbox="allow-same-origin"
              />
            </div>
          </div>
        </div>
      ) : null}

      {/* Modale d'édition FORCUS In-Situ */}
      {isInPlaceForcusOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-fade-in">
          <div className="w-full max-w-7xl h-[94vh] bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col border border-slate-700">
            <ForcusWordEditor
              isEmbeddedModal={true}
              initialTitle={title}
              initialHtmlContent={htmlEmailContent}
              onApplyToDocument={(newHtml) => {
                if (onTextEdited) onTextEdited(newHtml);
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
