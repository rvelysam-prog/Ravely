import React, { useState, useRef } from 'react';
import {
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Send,
  Download,
  FileText,
  Mail,
  Smartphone,
  Tablet,
  Monitor,
  Move,
  Edit3,
  Layers,
  Sparkles
} from 'lucide-react';
import { PdfImportedAssetsConfig, PdfAssetItemSettings } from '../../services/departmentsAndEmailService';

export interface InteractiveCanvasProps {
  title: string;
  documentTypeLabel: string;
  assetsConfig: PdfImportedAssetsConfig;
  onChangeAssetsConfig?: (config: PdfImportedAssetsConfig) => void;
  uploadedAssetUrls?: {
    logo?: string;
    signature?: string;
    cachet?: string;
    filigrane?: string;
    arrierePlan?: string;
  };
  htmlEmailContent: string;
  onDownloadPdf?: () => void;
  onDownloadWord?: () => void;
  onOpenInWebmail?: (html: string) => void;
  children: React.ReactNode;
}

export const InteractiveDocumentCanvas: React.FC<InteractiveCanvasProps> = ({
  title,
  documentTypeLabel,
  assetsConfig,
  onChangeAssetsConfig,
  uploadedAssetUrls = {},
  htmlEmailContent,
  onDownloadPdf,
  onDownloadWord,
  onOpenInWebmail,
  children
}) => {
  // Mode de rendu : 'pdf' (Moteur 2 : PDF Original Layout A4) vs 'email' (Moteur 1 : HTML Email Responsive)
  const [renderEngine, setRenderEngine] = useState<'pdf' | 'email'>('pdf');

  // En mode client mail : sélection de la largeur d'écran
  const [emailViewport, setEmailViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  // État de copie du code HTML
  const [copiedHtml, setCopiedHtml] = useState(false);

  // État de drag pour repositionnement direct à la souris
  const [draggingAssetKey, setDraggingAssetKey] = useState<
    'logo' | 'signature' | 'cachet' | 'filigrane' | 'arrierePlan' | null
  >(null);
  const dragStartRef = useRef<{ startX: number; startY: number; initialOffsetX: number; initialOffsetY: number } | null>(null);

  const handleCopyHtml = async () => {
    try {
      await navigator.clipboard.writeText(htmlEmailContent);
      setCopiedHtml(true);
      setTimeout(() => setCopiedHtml(false), 3000);
    } catch {
      // Fallback
    }
  };

  // Drag handlers
  const handleAssetMouseDown = (
    e: React.MouseEvent,
    key: 'logo' | 'signature' | 'cachet' | 'filigrane' | 'arrierePlan'
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const cfg = assetsConfig[key];
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialOffsetX: cfg?.offsetX || 0,
      initialOffsetY: cfg?.offsetY || 0
    };
    setDraggingAssetKey(key);

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!dragStartRef.current || !onChangeAssetsConfig) return;
      const dx = moveEvent.clientX - dragStartRef.current.startX;
      const dy = moveEvent.clientY - dragStartRef.current.startY;
      const newOffsetX = Math.round(dragStartRef.current.initialOffsetX + dx);
      const newOffsetY = Math.round(dragStartRef.current.initialOffsetY + dy);

      onChangeAssetsConfig({
        ...assetsConfig,
        [key]: {
          ...(assetsConfig[key] || {}),
          offsetX: Math.max(-300, Math.min(300, newOffsetX)),
          offsetY: Math.max(-300, Math.min(300, newOffsetY))
        } as PdfAssetItemSettings
      });
    };

    const onMouseUp = () => {
      setDraggingAssetKey(null);
      dragStartRef.current = null;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div className="space-y-4">
      {/* Barre de contrôle des deux moteurs de rendu */}
      <div className="bg-[#0B2545] text-white p-3 sm:p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2.5">
          <Layers className="w-5 h-5 text-[#D4A017] shrink-0" />
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm text-white">{title}</h4>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#134074] text-amber-300 border border-amber-400/30">
                {documentTypeLabel}
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              Double moteur de rendu indépendant : Cliquez sur les textes pour éditer directement, ou glissez les éléments importés pour ajuster leur position.
            </p>
          </div>
        </div>

        {/* Sélecteur Moteur 1 vs Moteur 2 */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl bg-slate-900/60 p-1 border border-white/10">
            <button
              type="button"
              onClick={() => setRenderEngine('pdf')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-all ${
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
              className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-all ${
                renderEngine === 'email'
                  ? 'bg-amber-400 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Mail className="w-3.5 h-3.5 text-slate-900" />
              <span>Moteur 1 : Client Mail Responsive</span>
            </button>
          </div>

          {renderEngine === 'email' && (
            <div className="inline-flex rounded-xl bg-slate-900/60 p-1 border border-white/10">
              <button
                type="button"
                onClick={() => setEmailViewport('desktop')}
                title="Aperçu Desktop / Large écran"
                className={`p-1.5 rounded-lg ${
                  emailViewport === 'desktop' ? 'bg-white/20 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setEmailViewport('tablet')}
                title="Aperçu Tablette (640px)"
                className={`p-1.5 rounded-lg ${
                  emailViewport === 'tablet' ? 'bg-white/20 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Tablet className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setEmailViewport('mobile')}
                title="Aperçu Mobile (375px)"
                className={`p-1.5 rounded-lg ${
                  emailViewport === 'mobile' ? 'bg-white/20 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Actions de téléchargement et d'envoi */}
          <div className="flex items-center gap-2">
            {onDownloadPdf && (
              <button
                type="button"
                onClick={onDownloadPdf}
                className="min-h-[34px] px-3 py-1.5 rounded-xl bg-[#0066B3] hover:bg-[#004f8c] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Télécharger PDF</span>
              </button>
            )}

            {onDownloadWord && (
              <button
                type="button"
                onClick={onDownloadWord}
                className="min-h-[34px] px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold inline-flex items-center gap-1.5 border border-white/10"
              >
                <FileText className="w-3.5 h-3.5 text-amber-300" />
                <span>Word (.docx)</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCopyHtml}
              className="min-h-[34px] px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold inline-flex items-center gap-1.5 shadow-xs"
            >
              {copiedHtml ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedHtml ? 'Code Copié !' : 'Copier HTML Responsive'}</span>
            </button>

            {onOpenInWebmail && (
              <button
                type="button"
                onClick={() => onOpenInWebmail(htmlEmailContent)}
                className="min-h-[34px] px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5"
                title="Transférer directement vers le Webmail Infomaniak"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Infomaniak</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ZONE D'AFFICHAGE DU DOCUMENT */}
      {renderEngine === 'pdf' ? (
        /* MOTEUR 2 : RENDU VECTORIEL FORMAT PAGE A4 */
        <div className="bg-slate-200/70 p-4 sm:p-8 rounded-2xl flex justify-center overflow-x-auto">
          <div
            className="w-full max-w-[850px] min-h-[1120px] bg-white text-slate-900 shadow-2xl rounded-sm p-8 sm:p-14 relative border border-slate-300 selection:bg-amber-100"
            style={{
              fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif'
            }}
          >
            {/* Arrière-plan importé / Filigrane blason */}
            {uploadedAssetUrls.arrierePlan && (
              <div
                className="absolute inset-0 pointer-events-none overflow-hidden z-0"
                style={{
                  backgroundImage: `url(${uploadedAssetUrls.arrierePlan})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  opacity: (assetsConfig.arrierePlan?.opacity ?? 20) / 100
                }}
              />
            )}

            {uploadedAssetUrls.filigrane && (
              <div
                className="absolute inset-0 pointer-events-none flex items-center justify-center z-0"
                style={{
                  transform: `translate(${assetsConfig.filigrane?.offsetX || 0}px, ${assetsConfig.filigrane?.offsetY || 0}px) rotate(${assetsConfig.filigrane?.rotation || 0}deg)`
                }}
              >
                <img
                  src={uploadedAssetUrls.filigrane}
                  alt="Filigrane Blason"
                  className="max-w-[420px] max-h-[520px] object-contain"
                  style={{
                    opacity: (assetsConfig.filigrane?.opacity ?? 15) / 100
                  }}
                />
              </div>
            )}

            {/* Contenu principal du document rendu */}
            <div className="relative z-10">{children}</div>
          </div>
        </div>
      ) : (
        /* MOTEUR 1 : RENDU CLIENT MAIL DESTINATAIRE (GMAIL / OUTLOOK / KIT CMS) */
        <div className="bg-slate-800 p-4 sm:p-8 rounded-2xl flex flex-col items-center gap-4">
          <div className="w-full flex items-center justify-between text-xs text-slate-300 px-2 max-w-4xl">
            <span className="font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Aperçu fidèle tel qu'affiché dans la boîte de réception du destinataire
            </span>
            <span className="font-mono text-amber-300">
              Largeur conteneur : {emailViewport === 'desktop' ? '100% (max 680px)' : emailViewport === 'tablet' ? '640px' : '375px (Mobile)'}
            </span>
          </div>

          <div
            className={`transition-all duration-300 bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-700 ${
              emailViewport === 'mobile'
                ? 'w-[375px]'
                : emailViewport === 'tablet'
                ? 'w-[640px]'
                : 'w-full max-w-[700px]'
            }`}
          >
            {/* Header simulation client mail */}
            <div className="bg-slate-100 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span className="font-bold text-slate-700 ml-2">Webmail / Gmail Preview</span>
              </div>
              <span className="text-[11px] font-mono text-slate-500">HTML Table Responsive 100%</span>
            </div>

            {/* Rendu HTML dans iframe sandbox sécurisée */}
            <div className="p-2 sm:p-4 bg-slate-50 min-h-[500px]">
              <iframe
                title="Aperçu Email Responsive"
                srcDoc={htmlEmailContent}
                className="w-full min-h-[750px] border-0 bg-white shadow-xs rounded-lg"
                sandbox="allow-same-origin"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
