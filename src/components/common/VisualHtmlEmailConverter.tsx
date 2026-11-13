import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Scissors,
  Type,
  MousePointer,
  ZoomIn,
  ZoomOut,
  Pipette,
  Square,
  Upload,
  Copy,
  Check,
  Trash2,
  RefreshCw,
  Send,
  Link2,
  ScanText,
  Image as ImageIcon,
  Camera,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import html2canvas from 'html2canvas-pro';
import Tesseract from 'tesseract.js';

if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${
    pdfjsLib.version || '3.11.174'
  }/pdf.worker.min.js`;
}

export type SliceZoneType = 'image' | 'text_ocr' | 'button';

export interface EmailSliceZone {
  id: string;
  index: number;
  x: number; // canvas natural pixels
  y: number;
  width: number;
  height: number;
  type: SliceZoneType;
  croppedDataUrl: string;
  hostedImageUrl?: string;
  extractedText?: string;
  buttonLabel?: string;
  linkUrl?: string;
  bgColor: string;
  textColor: string;
  isProcessing?: boolean;
}

export interface VisualHtmlEmailConverterProps {
  title: string;
  fallbackHtmlEmail: string;
  emailViewport?: 'desktop' | 'tablet' | 'mobile';
  captureTargetRef?: React.RefObject<HTMLDivElement | null>;
  autoCaptureSignal?: number;
  onOpenInWebmail?: (html: string) => void;
  onHtmlCompiled?: (html: string) => void;
}

const LS_IMGBB_KEY = 'atlantic_imgbb_api_key_v1';

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function sampleRegionColors(
  canvas: HTMLCanvasElement,
  rx: number,
  ry: number,
  rw: number,
  rh: number
): { bgColor: string; textColor: string } {
  try {
    const ctx = canvas.getContext('2d');
    if (!ctx) return { bgColor: '#ffffff', textColor: '#333333' };
    const sx = Math.max(0, Math.floor(rx));
    const sy = Math.max(0, Math.floor(ry));
    const sw = Math.max(1, Math.min(canvas.width - sx, Math.floor(rw)));
    const sh = Math.max(1, Math.min(canvas.height - sy, Math.floor(rh)));
    const imgData = ctx.getImageData(sx, sy, sw, sh).data;

    let bgR = 0;
    let bgG = 0;
    let bgB = 0;
    let bgCount = 0;
    let darkestLum = 999;
    let darkR = 51;
    let darkG = 51;
    let darkB = 51;

    // Sample corners/edges for background and darkest pixel for foreground text
    const step = Math.max(1, Math.floor((sw * sh) / 800));
    for (let p = 0; p < sw * sh; p += step) {
      const i = p * 4;
      const r = imgData[i];
      const g = imgData[i + 1];
      const b = imgData[i + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const px = p % sw;
      const py = Math.floor(p / sw);
      if (px < 4 || px > sw - 5 || py < 4 || py > sh - 5) {
        bgR += r;
        bgG += g;
        bgB += b;
        bgCount++;
      }
      if (lum < darkestLum) {
        darkestLum = lum;
        darkR = r;
        darkG = g;
        darkB = b;
      }
    }

    const finalBg =
      bgCount > 0
        ? rgbToHex(Math.round(bgR / bgCount), Math.round(bgG / bgCount), Math.round(bgB / bgCount))
        : '#ffffff';
    const bgLum =
      bgCount > 0
        ? (0.299 * bgR + 0.587 * bgG + 0.114 * bgB) / bgCount
        : 255;

    const finalFg = bgLum < 110 ? '#ffffff' : rgbToHex(darkR, darkG, darkB);
    return { bgColor: finalBg, textColor: finalFg };
  } catch {
    return { bgColor: '#ffffff', textColor: '#333333' };
  }
}

export const VisualHtmlEmailConverter: React.FC<VisualHtmlEmailConverterProps> = ({
  title,
  fallbackHtmlEmail,
  emailViewport = 'desktop',
  captureTargetRef,
  autoCaptureSignal = 0,
  onOpenInWebmail,
  onHtmlCompiled
}) => {
  const [imgbbKey, setImgbbKey] = useState<string>(() => {
    try {
      return localStorage.getItem(LS_IMGBB_KEY) || '';
    } catch {
      return '';
    }
  });
  const [imgbbVerified, setImgbbVerified] = useState<'idle' | 'ok' | 'invalid'>('idle');
  const [activeTool, setActiveTool] = useState<'slice' | 'ocr' | 'button' | 'select' | 'eyedropper'>('slice');
  const [zoom, setZoom] = useState<number>(100);
  const [slices, setSlices] = useState<EmailSliceZone[]>([]);
  const [selectedSliceId, setSelectedSliceId] = useState<string | null>(null);
  const [pickedColor, setPickedColor] = useState<string>('#0066B3');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [canvasDims, setCanvasDims] = useState<{ w: number; h: number }>({ w: 600, h: 840 });

  // Drawing rectangle state
  const [drawRect, setDrawRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const drawStartRef = useRef<{ x: number; y: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const showNotice = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 4000);
  };

  // Paint an Image or Source Canvas cleanly into our main interactive canvas
  const loadImageSourceIntoCanvas = useCallback((imgSource: HTMLImageElement | HTMLCanvasElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rawW = imgSource instanceof HTMLCanvasElement ? imgSource.width : imgSource.naturalWidth || 600;
    const rawH = imgSource instanceof HTMLCanvasElement ? imgSource.height : imgSource.naturalHeight || 840;
    const targetW = 600;
    const targetH = Math.max(200, Math.round((rawH / rawW) * targetW));
    canvas.width = targetW;
    canvas.height = targetH;
    setCanvasDims({ w: targetW, h: targetH });
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, targetW, targetH);
      ctx.drawImage(imgSource, 0, 0, targetW, targetH);
    }
  }, []);

  // Capture live A4 DOM target automatically or via button
  const handleCaptureA4Target = useCallback(async () => {
    if (!captureTargetRef?.current) {
      showNotice('Aperçu A4 non disponible pour capture directe.');
      return;
    }
    setIsCapturing(true);
    try {
      const renderedCanvas = await html2canvas(captureTargetRef.current, {
        scale: 1.5,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      loadImageSourceIntoCanvas(renderedCanvas);
      showNotice('Document A4 Original capturé sur le Canvas de découpage !');
    } catch (err) {
      console.error('Capture A4 error:', err);
      showNotice('Erreur lors de la capture du document A4.');
    } finally {
      setIsCapturing(false);
    }
  }, [captureTargetRef, loadImageSourceIntoCanvas]);

  // Initial or triggered capture when switching to Moteur 2 A4 Original
  useEffect(() => {
    if (captureTargetRef?.current) {
      const timer = setTimeout(() => {
        handleCaptureA4Target();
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [autoCaptureSignal, captureTargetRef, handleCaptureA4Target]);

  // Import PDF / Image (JPG, PNG)
  const handleImportExternalFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      try {
        showNotice('Chargement du PDF sur le Canvas...');
        const arrayBuf = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({
          data: arrayBuf,
          cMapUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '3.11.174'}/cmaps/`,
          cMapPacked: true
        }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.8 });
        const offscreen = document.createElement('canvas');
        offscreen.width = viewport.width;
        offscreen.height = viewport.height;
        const ctx = offscreen.getContext('2d');
        if (ctx) {
          await page.render({ canvasContext: ctx, viewport }).promise;
          loadImageSourceIntoCanvas(offscreen);
          setSlices([]);
          showNotice(`PDF « ${file.name} » importé (Page 1/${pdf.numPages}) ! Tracez vos slices.`);
        }
      } catch (err) {
        console.error(err);
        showNotice('Erreur de lecture PDF. Essayez un fichier JPG/PNG.');
      }
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result !== 'string') return;
        const img = new Image();
        img.onload = () => {
          loadImageSourceIntoCanvas(img);
          setSlices([]);
          showNotice(`Image « ${file.name} » chargée sur le Canvas !`);
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleVerifyImgbbKey = () => {
    const clean = imgbbKey.trim();
    try {
      localStorage.setItem(LS_IMGBB_KEY, clean);
    } catch {
      // ignore
    }
    if (clean.length >= 16) {
      setImgbbVerified('ok');
      showNotice('Clé API ImgBB enregistrée et prête pour l’hébergement gratuit des slices.');
    } else {
      setImgbbVerified('invalid');
      showNotice('Veuillez saisir une clé API ImgBB valide (gratuite sur api.imgbb.com).');
    }
  };

  // Upload a slice crop to ImgBB
  const uploadSliceToImgBB = async (sliceId: string, dataUrlOverride?: string) => {
    const target = slices.find((s) => s.id === sliceId);
    const dataUrl = dataUrlOverride || target?.croppedDataUrl;
    if (!dataUrl) return;
    if (!imgbbKey.trim()) {
      showNotice('Saisissez d’abord votre ImgBB API Key en haut à gauche pour obtenir une URL https://i.ibb.co/...');
      return;
    }

    setSlices((prev) => prev.map((s) => (s.id === sliceId ? { ...s, isProcessing: true } : s)));
    try {
      const base64Only = dataUrl.includes('base64,') ? dataUrl.split('base64,')[1] : dataUrl;
      const formData = new FormData();
      formData.append('image', base64Only);
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${encodeURIComponent(imgbbKey.trim())}`, {
        method: 'POST',
        body: formData
      });
      const json = await res.json();
      if (json?.success && json?.data?.url) {
        const publicUrl = json.data.url as string;
        setSlices((prev) =>
          prev.map((s) => (s.id === sliceId ? { ...s, hostedImageUrl: publicUrl, isProcessing: false } : s))
        );
        showNotice(`Image slice hébergée sur ImgBB : ${publicUrl}`);
      } else {
        throw new Error(json?.error?.message || 'Upload ImgBB refusé');
      }
    } catch (err) {
      setSlices((prev) => prev.map((s) => (s.id === sliceId ? { ...s, isProcessing: false } : s)));
      showNotice(`Échec upload ImgBB : ${err instanceof Error ? err.message : 'Erreur réseau'}`);
    }
  };

  // Run open-source Tesseract OCR on slice crop
  const runOcrOnSlice = async (sliceId: string, dataUrlOverride?: string) => {
    const target = slices.find((s) => s.id === sliceId);
    const dataUrl = dataUrlOverride || target?.croppedDataUrl;
    if (!dataUrl) return;

    setSlices((prev) => prev.map((s) => (s.id === sliceId ? { ...s, isProcessing: true } : s)));
    try {
      const result = await Tesseract.recognize(dataUrl, 'fra+eng');
      const cleaned = (result.data.text || '').trim().replace(/\n{3,}/g, '\n\n');
      setSlices((prev) =>
        prev.map((s) =>
          s.id === sliceId
            ? {
                ...s,
                extractedText: cleaned || 'Texte extrait (modifiable)',
                buttonLabel: s.type === 'button' ? cleaned || 'ACTION' : s.buttonLabel,
                isProcessing: false
              }
            : s
        )
      );
      showNotice('Texte extrait via Tesseract OCR avec succès !');
    } catch (err) {
      console.error('OCR error:', err);
      setSlices((prev) => prev.map((s) => (s.id === sliceId ? { ...s, isProcessing: false } : s)));
      showNotice('OCR impossible sur cette zone — saisissez le texte manuellement.');
    }
  };

  const getCanvasCoords = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = canvasDims.w / rect.width;
    const scaleY = canvasDims.h / rect.height;
    return {
      x: Math.max(0, Math.min(canvasDims.w, Math.round((e.clientX - rect.left) * scaleX))),
      y: Math.max(0, Math.min(canvasDims.h, Math.round((e.clientY - rect.top) * scaleY)))
    };
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const pt = getCanvasCoords(e);
    if (activeTool === 'eyedropper' && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        const px = ctx.getImageData(pt.x, pt.y, 1, 1).data;
        const hex = rgbToHex(px[0], px[1], px[2]);
        setPickedColor(hex);
        showNotice(`Couleur échantillonnée : ${hex}`);
      }
      return;
    }
    if (activeTool === 'select') return;
    drawStartRef.current = pt;
    setDrawRect({ x: pt.x, y: pt.y, w: 0, h: 0 });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!drawStartRef.current) return;
    const pt = getCanvasCoords(e);
    const x = Math.min(drawStartRef.current.x, pt.x);
    const y = Math.min(drawStartRef.current.y, pt.y);
    const w = Math.abs(pt.x - drawStartRef.current.x);
    const h = Math.abs(pt.y - drawStartRef.current.y);
    setDrawRect({ x, y, w, h });
  };

  const handleCanvasMouseUp = () => {
    if (!drawStartRef.current || !drawRect || !canvasRef.current) {
      drawStartRef.current = null;
      setDrawRect(null);
      return;
    }
    drawStartRef.current = null;
    if (drawRect.w < 16 || drawRect.h < 14) {
      setDrawRect(null);
      return;
    }

    // Crop the slice from main canvas
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = drawRect.w;
    cropCanvas.height = drawRect.h;
    const cropCtx = cropCanvas.getContext('2d');
    if (cropCtx) {
      cropCtx.drawImage(
        canvasRef.current,
        drawRect.x,
        drawRect.y,
        drawRect.w,
        drawRect.h,
        0,
        0,
        drawRect.w,
        drawRect.h
      );
    }
    const croppedDataUrl = cropCanvas.toDataURL('image/png');
    const sampled = sampleRegionColors(canvasRef.current, drawRect.x, drawRect.y, drawRect.w, drawRect.h);

    const sliceType: SliceZoneType =
      activeTool === 'ocr' ? 'text_ocr' : activeTool === 'button' ? 'button' : 'image';
    const id = `slice_${Date.now()}`;
    const newSlice: EmailSliceZone = {
      id,
      index: slices.length + 1,
      x: drawRect.x,
      y: drawRect.y,
      width: drawRect.w,
      height: drawRect.h,
      type: sliceType,
      croppedDataUrl,
      extractedText: sliceType === 'text_ocr' ? 'Extraction OCR en cours...' : undefined,
      buttonLabel: sliceType === 'button' ? 'Bouton CTA' : undefined,
      linkUrl: sliceType === 'button' ? 'https://atlantictransport.ca' : '',
      bgColor: sliceType === 'button' ? '#0066B3' : sampled.bgColor,
      textColor: sliceType === 'button' ? '#FFFFFF' : sampled.textColor
    };

    setSlices((prev) => [...prev, newSlice]);
    setSelectedSliceId(id);
    setDrawRect(null);

    if (sliceType === 'text_ocr') {
      runOcrOnSlice(id, croppedDataUrl);
    } else if (sliceType === 'image' && imgbbKey.trim().length >= 16) {
      uploadSliceToImgBB(id, croppedDataUrl);
    }
  };

  // Generate clean nested <table> HTML email from slices (strictly inline CSS)
  const buildCompiledTableHtml = useCallback((): string => {
    if (slices.length === 0) return fallbackHtmlEmail;

    const sorted = [...slices].sort((a, b) => a.y - b.y || a.x - b.x);
    const rowsHtml = sorted
      .map((s) => {
        if (s.type === 'image') {
          const imgSrc = s.hostedImageUrl || s.croppedDataUrl;
          const imgTag = `<img src="${imgSrc}" alt="Slice ${s.index}" width="${Math.min(600, s.width)}" style="display: block; max-width: 100%; height: auto; border: 0;" />`;
          const inner = s.linkUrl
            ? `<a href="${s.linkUrl}" target="_blank" style="text-decoration: none; border: 0;">${imgTag}</a>`
            : imgTag;
          return `    <tr>
      <td align="center" style="padding: 0; background-color: ${s.bgColor};">
        ${inner}
      </td>
    </tr>`;
        }

        if (s.type === 'button') {
          const btnHref = s.linkUrl || 'https://atlantictransport.ca';
          const btnText = (s.buttonLabel || s.extractedText || 'CONTINUER').replace(/</g, '&lt;');
          return `    <tr>
      <td align="center" style="padding: 16px 24px; background-color: #ffffff;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center" bgcolor="${s.bgColor}" style="border-radius: 6px; background-color: ${s.bgColor};">
              <a href="${btnHref}" target="_blank" style="display: inline-block; padding: 12px 28px; font-family: Arial, Helvetica, sans-serif; font-size: 14px; font-weight: bold; color: ${s.textColor}; text-decoration: none;">${btnText}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
        }

        // text_ocr
        const htmlParagraphs = (s.extractedText || 'Texte OCR extrait')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\n/g, '<br/>');
        return `    <tr>
      <td style="padding: 14px 24px; background-color: ${s.bgColor}; font-family: Arial, Helvetica, sans-serif; font-size: 13px; line-height: 1.55; color: ${s.textColor}; text-align: left;">
        ${htmlParagraphs}
      </td>
    </tr>`;
      })
      .join('\n');

    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 20px 0; background-color: #f1f5f9; font-family: Arial, Helvetica, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width: 600px; max-width: 100%; background-color: #ffffff; border: 1px solid #cbd5e1; border-collapse: collapse;">
${rowsHtml}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }, [slices, fallbackHtmlEmail, title]);

  const compiledHtml = buildCompiledTableHtml();

  useEffect(() => {
    if (onHtmlCompiled) {
      onHtmlCompiled(compiledHtml);
    }
  }, [compiledHtml, onHtmlCompiled]);

  const selectedSlice = slices.find((s) => s.id === selectedSliceId) || null;

  const previewMaxWidth =
    emailViewport === 'mobile' ? '375px' : emailViewport === 'tablet' ? '600px' : '600px';

  return (
    <div className="bg-[#16181D] text-slate-100 rounded-2xl border border-slate-700 overflow-hidden shadow-2xl">
      {/* BARRE SUPÉRIEURE DU CONVERTISSEUR 3 FENÊTRES */}
      <div className="bg-[#1E222A] border-b border-slate-700/80 px-3 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-[#111317] border border-slate-700 rounded-lg px-2 py-1">
            <span className="text-[10px] font-bold text-slate-400">ImgBB API Key</span>
            <input
              type="password"
              value={imgbbKey}
              onChange={(e) => {
                setImgbbKey(e.target.value);
                setImgbbVerified('idle');
              }}
              placeholder="Clé ImgBB..."
              className="bg-transparent text-xs text-white w-28 sm:w-36 outline-none font-mono"
            />
            <button
              type="button"
              onClick={handleVerifyImgbbKey}
              className="px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-[10px] font-bold text-white cursor-pointer flex items-center gap-1"
            >
              {imgbbVerified === 'ok' ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : null}
              <span>Verify</span>
            </button>
          </div>

          <label className="px-2.5 py-1.5 rounded-lg bg-[#0066B3] hover:bg-[#005291] text-white font-bold text-[11px] flex items-center gap-1.5 cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            <span>Importer PDF / Image</span>
            <input
              type="file"
              accept=".pdf,image/png,image/jpeg,image/webp"
              onChange={handleImportExternalFile}
              className="hidden"
            />
          </label>

          {captureTargetRef && (
            <button
              type="button"
              onClick={handleCaptureA4Target}
              disabled={isCapturing}
              className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Charger le document A4 actuel dans la fenêtre de découpage Canvas"
            >
              {isCapturing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
              <span>Capturer A4 sur Canvas</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {statusMsg && (
            <span className="text-[11px] text-amber-300 bg-slate-900 px-2.5 py-1 rounded-lg border border-amber-400/30 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {statusMsg}
            </span>
          )}
          <span
            className="w-4 h-4 rounded border border-slate-500 shrink-0"
            style={{ backgroundColor: pickedColor }}
            title={`Couleur active : ${pickedColor}`}
          />
          <span className="text-[10px] font-mono text-slate-400">{slices.length} slice(s)</span>
        </div>
      </div>

      {/* GRILLE DES 3 FENÊTRES SYNCHRONISÉES */}
      <div className="grid grid-cols-1 xl:grid-cols-12 divide-y xl:divide-y-0 xl:divide-x divide-slate-700/80 min-h-[680px]">
        {/* ================================================================= */}
        {/* FENÊTRE 1 (GAUCHE) : DÉCOUPAGE & CANVAS AVEC OUTILS PHOTOSHOP     */}
        {/* ================================================================= */}
        <div className="xl:col-span-4 flex flex-col bg-[#16181D]">
          <div className="px-3 py-2 border-b border-slate-700/80 bg-[#1B1E24] flex items-center justify-between">
            <div>
              <h5 className="text-xs font-bold text-white">Découpage &amp; Canvas</h5>
              <span className="text-[10px] text-slate-400">Tracez des zones sur le document A4 / image</span>
            </div>
            {slices.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSlices([]);
                  setSelectedSliceId(null);
                }}
                className="text-[10px] px-2 py-1 rounded bg-red-900/50 hover:bg-red-800 text-red-200 cursor-pointer"
              >
                Vider slices
              </button>
            )}
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Barre d'outils verticale façon Photoshop */}
            <div className="w-11 bg-[#1E222A] border-r border-slate-700/80 py-2 flex flex-col items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTool('slice')}
                title="Slice Knife (Découper zone Image)"
                className={`w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
                  activeTool === 'slice' ? 'bg-[#0066B3] text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <Scissors className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setActiveTool('ocr')}
                title="Texte OCR (Extraire texte éditable + couleurs)"
                className={`w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
                  activeTool === 'ocr' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <Type className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setActiveTool('button')}
                title="Zone Bouton CTA avec lien URL"
                className={`w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
                  activeTool === 'button' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <Square className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setActiveTool('select')}
                title="Sélectionner / Inspecter une tranche"
                className={`w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
                  activeTool === 'select' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <MousePointer className="w-4 h-4" />
              </button>
              <div className="w-6 h-[1px] bg-slate-700 my-0.5" />
              <button
                type="button"
                onClick={() => setActiveTool('eyedropper')}
                title="Pipette Couleur"
                className={`w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
                  activeTool === 'eyedropper' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <Pipette className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(160, z + 15))}
                title="Zoom +"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-700 hover:text-white cursor-pointer"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(50, z - 15))}
                title="Zoom -"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-700 hover:text-white cursor-pointer"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
            </div>

            {/* Zone Canvas avec grille sombre et tranches interactives */}
            <div
              className="flex-1 overflow-auto p-3 flex flex-col items-center justify-start"
              style={{
                backgroundImage:
                  'linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)',
                backgroundSize: '20px 20px'
              }}
            >
              <div
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                style={{
                  width: `${Math.round((canvasDims.w * zoom) / 100)}px`,
                  maxWidth: '100%',
                  cursor:
                    activeTool === 'select'
                      ? 'default'
                      : activeTool === 'eyedropper'
                      ? 'crosshair'
                      : 'crosshair'
                }}
                className="relative bg-white shadow-xl border border-slate-600 select-none"
              >
                <canvas
                  ref={canvasRef}
                  width={canvasDims.w}
                  height={canvasDims.h}
                  className="w-full h-auto block"
                />

                {/* Tranches (Slices) superposées */}
                {slices.map((s) => {
                  const isSel = selectedSliceId === s.id;
                  const badgeBg =
                    s.type === 'image'
                      ? 'bg-sky-600'
                      : s.type === 'text_ocr'
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-emerald-600';
                  return (
                    <div
                      key={s.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSliceId(s.id);
                      }}
                      style={{
                        left: `${(s.x / canvasDims.w) * 100}%`,
                        top: `${(s.y / canvasDims.h) * 100}%`,
                        width: `${(s.width / canvasDims.w) * 100}%`,
                        height: `${(s.height / canvasDims.h) * 100}%`
                      }}
                      className={`absolute border-2 cursor-pointer transition-all ${
                        isSel
                          ? 'border-amber-400 bg-amber-400/15 ring-2 ring-amber-400/40 z-20'
                          : 'border-sky-500 border-dashed bg-sky-500/10 hover:bg-sky-500/20 z-10'
                      }`}
                    >
                      <span
                        className={`absolute -top-5 left-0 px-1.5 py-0.5 text-[9px] font-bold rounded-t whitespace-nowrap text-white shadow-xs ${badgeBg}`}
                      >
                        Slice {s.index} ({s.type === 'image' ? 'Image' : s.type === 'text_ocr' ? 'Texte OCR' : 'Bouton'})
                      </span>
                    </div>
                  );
                })}

                {/* Rectangle de tracé en direct */}
                {drawRect && (
                  <div
                    style={{
                      left: `${(drawRect.x / canvasDims.w) * 100}%`,
                      top: `${(drawRect.y / canvasDims.h) * 100}%`,
                      width: `${(drawRect.w / canvasDims.w) * 100}%`,
                      height: `${(drawRect.h / canvasDims.h) * 100}%`
                    }}
                    className="absolute border-2 border-dashed border-amber-400 bg-amber-300/20 pointer-events-none z-30"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Inspecteur de la slice sélectionnée */}
          {selectedSlice && (
            <div className="p-2.5 bg-[#1E222A] border-t border-slate-700 space-y-2 text-[11px]">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-amber-300">
                  Slice {selectedSlice.index} ({selectedSlice.width}×{selectedSlice.height}px)
                </span>
                <div className="flex items-center gap-1">
                  <select
                    value={selectedSlice.type}
                    onChange={(e) => {
                      const nextType = e.target.value as SliceZoneType;
                      setSlices((prev) =>
                        prev.map((s) => (s.id === selectedSlice.id ? { ...s, type: nextType } : s))
                      );
                    }}
                    className="bg-slate-900 border border-slate-600 rounded px-1.5 py-0.5 text-[10px] text-white"
                  >
                    <option value="image">Image</option>
                    <option value="text_ocr">Texte OCR</option>
                    <option value="button">Bouton CTA</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setSlices((prev) => prev.filter((s) => s.id !== selectedSlice.id));
                      setSelectedSliceId(null);
                    }}
                    className="p-1 rounded bg-red-900/60 hover:bg-red-700 text-red-200 cursor-pointer"
                    title="Supprimer cette tranche"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {(selectedSlice.type === 'text_ocr' || selectedSlice.type === 'button') && (
                <textarea
                  rows={2}
                  value={
                    selectedSlice.type === 'button'
                      ? selectedSlice.buttonLabel || ''
                      : selectedSlice.extractedText || ''
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    setSlices((prev) =>
                      prev.map((s) =>
                        s.id === selectedSlice.id
                          ? selectedSlice.type === 'button'
                            ? { ...s, buttonLabel: val }
                            : { ...s, extractedText: val }
                          : s
                      )
                    );
                  }}
                  placeholder={selectedSlice.type === 'button' ? 'Texte du bouton...' : 'Texte extrait OCR...'}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-[11px] text-white"
                />
              )}

              <div className="flex flex-wrap items-center gap-1.5">
                <div className="flex items-center gap-1 flex-1 min-w-[140px] bg-slate-900 border border-slate-700 rounded px-1.5 py-1">
                  <Link2 className="w-3 h-3 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    value={selectedSlice.linkUrl || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSlices((prev) =>
                        prev.map((s) => (s.id === selectedSlice.id ? { ...s, linkUrl: val } : s))
                      );
                    }}
                    placeholder="Lien URL (optionnel https://...)"
                    className="bg-transparent text-[10px] text-white w-full outline-none"
                  />
                </div>

                {selectedSlice.type === 'text_ocr' && (
                  <button
                    type="button"
                    onClick={() => runOcrOnSlice(selectedSlice.id)}
                    className="px-2 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                  >
                    <ScanText className="w-3 h-3" />
                    <span>OCR</span>
                  </button>
                )}

                {selectedSlice.type === 'image' && (
                  <button
                    type="button"
                    onClick={() => uploadSliceToImgBB(selectedSlice.id)}
                    className="px-2 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                  >
                    <ImageIcon className="w-3 h-3" />
                    <span>{selectedSlice.hostedImageUrl ? 'Ré-uploader ImgBB' : 'Upload ImgBB'}</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ================================================================= */}
        {/* FENÊTRE 2 (MILIEU) : APERÇU EMAIL EN DIRECT (600px)               */}
        {/* ================================================================= */}
        <div className="xl:col-span-4 flex flex-col bg-[#20242C]">
          <div className="px-3 py-2 border-b border-slate-700/80 bg-[#1B1E24] flex items-center justify-between">
            <div>
              <h5 className="text-xs font-bold text-white">Aperçu Email en direct</h5>
              <span className="text-[10px] text-slate-400">
                Aperçu Email fixed at {previewMaxWidth} ({slices.length > 0 ? 'Assemblé via Slices' : 'Modèle Complet'})
              </span>
            </div>
            {onOpenInWebmail && (
              <button
                type="button"
                onClick={() => onOpenInWebmail(compiledHtml)}
                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <Send className="w-3 h-3" />
                <span>Webmail</span>
              </button>
            )}
          </div>

          <div className="flex-1 p-3 overflow-auto flex justify-center bg-[#2A2F3A]">
            <div
              style={{ width: previewMaxWidth, maxWidth: '100%' }}
              className="bg-white rounded-lg shadow-2xl overflow-hidden border border-slate-600 flex flex-col"
            >
              <div className="bg-slate-100 border-b border-slate-200 px-3 py-2 flex items-center justify-between text-[11px] text-slate-600 shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <span className="font-bold text-slate-700 ml-1">Webmail / Gmail Preview</span>
                </div>
                <span className="font-mono text-[10px] text-slate-500">HTML Table Responsive 100%</span>
              </div>
              <iframe
                title={`Aperçu Email ${title}`}
                srcDoc={compiledHtml}
                className="w-full flex-1 min-h-[580px] border-0 bg-white"
                sandbox="allow-same-origin"
              />
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* FENÊTRE 3 (DROITE) : CODE SOURCE HTML                             */}
        {/* ================================================================= */}
        <div className="xl:col-span-4 flex flex-col bg-[#111318]">
          <div className="px-3 py-2 border-b border-slate-700/80 bg-[#1B1E24] flex items-center justify-between">
            <div>
              <h5 className="text-xs font-bold text-white">Code Source HTML</h5>
              <span className="text-[10px] text-slate-400">Tableaux imbriqués &amp; CSS inline (Gmail / Outlook)</span>
            </div>
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard?.writeText(compiledHtml);
                setCopiedCode(true);
                setTimeout(() => setCopiedCode(false), 3000);
              }}
              className="px-3 py-1.5 rounded-lg bg-[#0066B3] hover:bg-[#005291] text-white font-bold text-[11px] flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Copié !' : 'Copier le HTML'}</span>
            </button>
          </div>

          <div className="flex-1 p-3 overflow-auto">
            <pre className="text-[11px] font-mono leading-relaxed text-sky-300 whitespace-pre-wrap break-all select-text">
              {compiledHtml}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
