import React, { useState, useEffect, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import QRCode from 'qrcode';
import {
  X,
  Wand2,
  Download,
  Check,
  Upload,
  Sparkles,
  RotateCcw,
  Palette,
  Stamp,
  PenTool,
  Shield,
  Droplets,
  Frame,
  Barcode,
  QrCode
} from 'lucide-react';
import {
  generateOfficialStampPngDataUrl,
  StampOptions,
  StampShape
} from '../../services/stampGeneratorService';
import { ImportedAssetKey } from '../../services/departmentsAndEmailService';
import { SiteSettings } from '../../types';

export type UniversalVisualCategory =
  | 'logo'
  | 'signature'
  | 'cachet'
  | 'filigrane'
  | 'arrierePlan'
  | 'barcode'
  | 'qrcode';

export function inferVisualCategoryFromKey(assetKey: string): UniversalVisualCategory {
  const k = assetKey.toLowerCase();
  if (k.includes('signature')) return 'signature';
  if (k.includes('cachet')) return 'cachet';
  if (k.includes('filigrane')) return 'filigrane';
  if (k.includes('arriereplan')) return 'arrierePlan';
  if (k.includes('barcode')) return 'barcode';
  if (k.includes('qrcode')) return 'qrcode';
  return 'logo';
}

const CATEGORY_META: Record<
  UniversalVisualCategory,
  { label: string; subtitle: string; icon: React.ComponentType<{ className?: string }> }
> = {
  logo: {
    label: '1. Logo Officiel',
    subtitle: 'Créez ou imitez un logo vectoriel haute définition avec fond transparent ou badge.',
    icon: Shield
  },
  signature: {
    label: '2. Signature Manuscrite',
    subtitle: 'Générez une signature calligraphique fluide à l’encre bleue, noire ou marine.',
    icon: PenTool
  },
  cachet: {
    label: '3. Cachet / Sceau',
    subtitle: 'Tampon circulaire, ovale ou rectangulaire avec effet d’encre authentique.',
    icon: Stamp
  },
  filigrane: {
    label: '4. Filigrane (Watermark)',
    subtitle: 'Blason ou mention diagonale de sécurité en transparence sur page A4.',
    icon: Droplets
  },
  arrierePlan: {
    label: '5. Arrière-Plan & Cadre',
    subtitle: 'Fond de page teinté et encadrements officiels doubles, coins ou bandeaux.',
    icon: Frame
  },
  barcode: {
    label: '6. Code-Barres',
    subtitle: 'Code-barres haute densité personnalisable avec couleur et légende.',
    icon: Barcode
  },
  qrcode: {
    label: '7. QR Code',
    subtitle: 'QR Code de vérification officiel avec palette personnalisée et badge.',
    icon: QrCode
  }
};

interface UniversalVisualGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetAssetKey: ImportedAssetKey;
  onApplyVisual: (assetKey: ImportedAssetKey, dataUrl: string) => void;
  settings?: SiteSettings;
  defaultReferenceCode?: string;
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return `#${[clamp(r), clamp(g), clamp(b)]
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('')}`;
}

export const UniversalVisualGeneratorModal: React.FC<UniversalVisualGeneratorModalProps> = ({
  isOpen,
  onClose,
  targetAssetKey,
  onApplyVisual,
  settings,
  defaultReferenceCode
}) => {
  const companyName = settings?.company_name || 'ATLANTIC TRANSPORT LTD.';
  const [category, setCategory] = useState<UniversalVisualCategory>(() =>
    inferVisualCategoryFromKey(targetAssetKey)
  );

  // Référence modèle importée à imiter
  const [refThumbnail, setRefThumbnail] = useState<string>('');
  const [refAnalysisNote, setRefAnalysisNote] = useState<string>('');
  const [isAnalyzingRef, setIsAnalyzingRef] = useState(false);

  // 1. Logo state
  const [logoTitle, setLogoTitle] = useState(companyName);
  const [logoSubtitle, setLogoSubtitle] = useState('COLOMBIE-BRITANNIQUE · CANADA');
  const [logoMonogram, setLogoMonogram] = useState('AT');
  const [logoStyle, setLogoStyle] = useState<'badge_left' | 'banner_pill' | 'crest_centered' | 'monogram_box'>(
    'badge_left'
  );
  const [logoPrimaryColor, setLogoPrimaryColor] = useState('#0B2545');
  const [logoAccentColor, setLogoAccentColor] = useState('#D4A017');
  const [logoTransparentBg, setLogoTransparentBg] = useState(true);

  // 2. Signature state
  const [sigName, setSigName] = useState('Antoine Forestin');
  const [sigCaption, setSigCaption] = useState('Directeur Général & Fondateur');
  const [sigShowCaption, setSigShowCaption] = useState(false);
  const [sigStyle, setSigStyle] = useState<'calligraphic' | 'executive_sharp' | 'paraphe_loop'>('calligraphic');
  const [sigInkColor, setSigInkColor] = useState('#0B2545');
  const [sigStrokeWidth, setSigStrokeWidth] = useState(3.2);
  const [sigSlant, setSigSlant] = useState(-6);

  // 3. Cachet state
  const [stampOptions, setStampOptions] = useState<StampOptions>({
    shape: 'circle',
    inkColor: '#B91C1C',
    companyName,
    subtitle: 'SURREY, COLOMBIE-BRITANNIQUE · CANADA',
    centerMention: 'CERTIFIÉ CONFORME',
    dateText: new Date()
      .toLocaleDateString('fr-CA', { day: '2-digit', month: 'short', year: 'numeric' })
      .toUpperCase(),
    emblemType: 'stars',
    weatheredEffect: true,
    rotation: -4
  });

  // 4. Filigrane state
  const [wmMainText, setWmMainText] = useState(companyName);
  const [wmSubText, setWmSubText] = useState('DOCUMENT OFFICIEL AUTHENTIFIÉ');
  const [wmMode, setWmMode] = useState<'center_seal' | 'tiled_diagonal'>('center_seal');
  const [wmColor, setWmColor] = useState('#0B2545');
  const [wmAngle, setWmAngle] = useState(-28);

  // 5. Arrière-plan state
  const [bgPaperColor, setBgPaperColor] = useState('#FFFFFF');
  const [bgPrimaryColor, setBgPrimaryColor] = useState('#0B2545');
  const [bgAccentColor, setBgAccentColor] = useState('#D4A017');
  const [bgFrameStyle, setBgFrameStyle] = useState<'double' | 'simple' | 'corners' | 'top_band' | 'left_stripe'>(
    'double'
  );

  // 6. Barcode state
  const [bcValue, setBcValue] = useState(defaultReferenceCode || 'ENT-BC-2026-0001');
  const [bcColor, setBcColor] = useState('#0B2545');
  const [bcTransparentBg, setBcTransparentBg] = useState(true);
  const [bcShowText, setBcShowText] = useState(true);

  // 7. QR Code state
  const [qrPayload, setQrPayload] = useState(
    `https://atlantictransport.ca/verify?ref=${encodeURIComponent(defaultReferenceCode || 'ENT-BC-2026-0001')}`
  );
  const [qrDarkColor, setQrDarkColor] = useState('#0B2545');
  const [qrTransparentBg, setQrTransparentBg] = useState(false);
  const [qrCaption, setQrCaption] = useState(defaultReferenceCode || 'VÉRIFICATION');

  const [previewDataUrl, setPreviewDataUrl] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCategory(inferVisualCategoryFromKey(targetAssetKey));
      setRefThumbnail('');
      setRefAnalysisNote('');
    }
  }, [isOpen, targetAssetKey]);

  const showNotice = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3200);
  };

  // Génération haute définition du PNG selon la catégorie active
  const renderPreview = useCallback(async () => {
    if (category === 'cachet') {
      const url = await generateOfficialStampPngDataUrl(stampOptions);
      setPreviewDataUrl(url);
      return;
    }

    if (category === 'qrcode') {
      const canvas = document.createElement('canvas');
      canvas.width = 420;
      canvas.height = qrCaption.trim() ? 470 : 420;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!qrTransparentBg) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      const qrCanvas = document.createElement('canvas');
      await QRCode.toCanvas(qrCanvas, qrPayload || 'https://atlantictransport.ca', {
        width: 380,
        margin: 2,
        color: {
          dark: qrDarkColor,
          light: qrTransparentBg ? '#00000000' : '#FFFFFF'
        }
      });
      ctx.drawImage(qrCanvas, 20, 16, 380, 380);
      if (qrCaption.trim()) {
        ctx.fillStyle = qrDarkColor;
        ctx.font = 'bold 22px "IBM Plex Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(qrCaption.trim().toUpperCase(), canvas.width / 2, 438);
      }
      setPreviewDataUrl(canvas.toDataURL('image/png'));
      return;
    }

    if (category === 'barcode') {
      const canvas = document.createElement('canvas');
      canvas.width = 560;
      canvas.height = bcShowText ? 190 : 145;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!bcTransparentBg) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      const text = (bcValue || 'ENT-BC-2026').toUpperCase();
      ctx.fillStyle = bcColor;
      let x = 28;
      const barTop = 18;
      const barH = 108;
      // Start guard bars
      ctx.fillRect(x, barTop, 4, barH + 10);
      x += 8;
      ctx.fillRect(x, barTop, 2, barH + 10);
      x += 8;
      for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i);
        for (let bit = 0; bit < 5; bit++) {
          const w = ((code >> bit) & 1) === 1 ? 5 : 2;
          if (bit % 2 === 0 || (code + bit) % 3 === 0) {
            ctx.fillRect(x, barTop, w, barH);
          }
          x += w + 3;
          if (x > canvas.width - 42) break;
        }
      }
      ctx.fillRect(canvas.width - 36, barTop, 2, barH + 10);
      ctx.fillRect(canvas.width - 30, barTop, 4, barH + 10);
      if (bcShowText) {
        ctx.font = 'bold 22px "IBM Plex Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(text, canvas.width / 2, barTop + barH + 38);
      }
      setPreviewDataUrl(canvas.toDataURL('image/png'));
      return;
    }

    if (category === 'logo') {
      const canvas = document.createElement('canvas');
      canvas.width = 760;
      canvas.height = 240;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!logoTransparentBg) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      if (logoStyle === 'crest_centered') {
        ctx.fillStyle = logoPrimaryColor;
        ctx.beginPath();
        ctx.roundRect(330, 18, 100, 88, 18);
        ctx.fill();
        ctx.strokeStyle = logoAccentColor;
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '900 38px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((logoMonogram || 'AT').toUpperCase().slice(0, 3), 380, 64);

        ctx.fillStyle = logoPrimaryColor;
        ctx.font = '800 32px sans-serif';
        ctx.fillText(logoTitle.toUpperCase(), 380, 146);
        ctx.fillStyle = logoAccentColor;
        ctx.font = '700 16px sans-serif';
        ctx.fillText(logoSubtitle.toUpperCase(), 380, 186);
      } else if (logoStyle === 'banner_pill') {
        ctx.fillStyle = logoPrimaryColor;
        ctx.beginPath();
        ctx.roundRect(24, 34, 712, 168, 22);
        ctx.fill();
        ctx.fillStyle = logoAccentColor;
        ctx.fillRect(24, 188, 712, 14);
        ctx.fillStyle = logoAccentColor;
        ctx.beginPath();
        ctx.arc(110, 118, 48, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = logoPrimaryColor;
        ctx.font = '900 34px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((logoMonogram || 'AT').toUpperCase().slice(0, 3), 110, 120);
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'left';
        ctx.font = '800 32px sans-serif';
        ctx.fillText(logoTitle.toUpperCase(), 184, 98);
        ctx.fillStyle = '#E2E8F0';
        ctx.font = '600 17px sans-serif';
        ctx.fillText(logoSubtitle.toUpperCase(), 184, 142);
      } else if (logoStyle === 'monogram_box') {
        ctx.strokeStyle = logoPrimaryColor;
        ctx.lineWidth = 6;
        ctx.strokeRect(26, 36, 150, 160);
        ctx.fillStyle = logoPrimaryColor;
        ctx.font = '900 56px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((logoMonogram || 'AT').toUpperCase().slice(0, 3), 101, 118);
        ctx.fillStyle = logoPrimaryColor;
        ctx.textAlign = 'left';
        ctx.font = '800 33px Georgia, serif';
        ctx.fillText(logoTitle.toUpperCase(), 204, 98);
        ctx.fillStyle = logoAccentColor;
        ctx.fillRect(204, 122, 180, 4);
        ctx.fillStyle = '#475569';
        ctx.font = '700 16px sans-serif';
        ctx.fillText(logoSubtitle.toUpperCase(), 204, 154);
      } else {
        // badge_left
        ctx.fillStyle = logoPrimaryColor;
        ctx.beginPath();
        ctx.roundRect(24, 42, 132, 146, 20);
        ctx.fill();
        ctx.strokeStyle = logoAccentColor;
        ctx.lineWidth = 5;
        ctx.stroke();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '900 48px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((logoMonogram || 'AT').toUpperCase().slice(0, 3), 90, 116);

        ctx.textAlign = 'left';
        ctx.fillStyle = logoPrimaryColor;
        ctx.font = '900 34px sans-serif';
        ctx.fillText(logoTitle.toUpperCase(), 182, 95);
        ctx.fillStyle = logoAccentColor;
        ctx.fillRect(182, 122, 120, 4);
        ctx.fillStyle = '#334155';
        ctx.font = '700 17px sans-serif';
        ctx.fillText(logoSubtitle.toUpperCase(), 182, 156);
      }
      setPreviewDataUrl(canvas.toDataURL('image/png'));
      return;
    }

    if (category === 'signature') {
      const canvas = document.createElement('canvas');
      canvas.width = 620;
      canvas.height = 240;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.translate(310, 110);
      ctx.rotate((sigSlant * Math.PI) / 180);
      ctx.strokeStyle = sigInkColor;
      ctx.fillStyle = sigInkColor;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (sigStyle === 'paraphe_loop') {
        ctx.lineWidth = sigStrokeWidth;
        ctx.beginPath();
        ctx.moveTo(-210, 18);
        ctx.bezierCurveTo(-180, -70, -110, -68, -108, 12);
        ctx.bezierCurveTo(-106, 55, -52, -45, -18, 8);
        ctx.bezierCurveTo(10, 48, 52, -36, 98, 2);
        ctx.bezierCurveTo(132, 30, 165, -24, 215, -10);
        ctx.stroke();
        ctx.font = 'italic 700 54px "Brush Script MT", "Segoe Script", Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText(sigName, 0, -4);
      } else if (sigStyle === 'executive_sharp') {
        ctx.font = 'italic 700 58px Georgia, "Times New Roman", serif';
        ctx.textAlign = 'center';
        ctx.fillText(sigName, 0, 0);
        ctx.lineWidth = sigStrokeWidth * 1.1;
        ctx.beginPath();
        ctx.moveTo(-190, 26);
        ctx.quadraticCurveTo(0, 8, 215, 18);
        ctx.stroke();
      } else {
        ctx.font = 'italic 64px "Brush Script MT", "Segoe Script", cursive, Georgia';
        ctx.textAlign = 'center';
        ctx.fillText(sigName, 0, 2);
        ctx.lineWidth = sigStrokeWidth;
        ctx.beginPath();
        ctx.moveTo(-210, 24);
        ctx.bezierCurveTo(-90, 44, 70, 6, 220, 22);
        ctx.stroke();
      }
      ctx.restore();

      if (sigShowCaption && sigCaption.trim()) {
        ctx.fillStyle = sigInkColor;
        ctx.font = '600 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(sigCaption.trim(), 310, 208);
      }
      setPreviewDataUrl(canvas.toDataURL('image/png'));
      return;
    }

    if (category === 'filigrane') {
      const canvas = document.createElement('canvas');
      canvas.width = 760;
      canvas.height = 760;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = wmColor;
      ctx.fillStyle = wmColor;

      if (wmMode === 'tiled_diagonal') {
        ctx.save();
        ctx.translate(380, 380);
        ctx.rotate((wmAngle * Math.PI) / 180);
        ctx.textAlign = 'center';
        ctx.globalAlpha = 0.25;
        ctx.font = '900 34px sans-serif';
        for (let y = -360; y <= 360; y += 130) {
          for (let x = -340; x <= 340; x += 340) {
            ctx.fillText(wmMainText.toUpperCase(), x, y);
          }
        }
        ctx.restore();
      } else {
        ctx.save();
        ctx.translate(380, 380);
        ctx.globalAlpha = 0.24;
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(0, 0, 270, 0, Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 244, 0, Math.PI * 2);
        ctx.stroke();
        ctx.rotate((wmAngle * Math.PI) / 180);
        ctx.textAlign = 'center';
        ctx.font = '900 44px Georgia, serif';
        ctx.fillText(wmMainText.toUpperCase(), 0, -10);
        ctx.font = '700 22px sans-serif';
        ctx.fillText(wmSubText.toUpperCase(), 0, 36);
        ctx.restore();
      }
      setPreviewDataUrl(canvas.toDataURL('image/png'));
      return;
    }

    if (category === 'arrierePlan') {
      const canvas = document.createElement('canvas');
      canvas.width = 630;
      canvas.height = 891;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = bgPaperColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (bgFrameStyle === 'double') {
        ctx.strokeStyle = bgPrimaryColor;
        ctx.lineWidth = 5;
        ctx.strokeRect(24, 24, canvas.width - 48, canvas.height - 48);
        ctx.strokeStyle = bgAccentColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(34, 34, canvas.width - 68, canvas.height - 68);
      } else if (bgFrameStyle === 'simple') {
        ctx.strokeStyle = bgPrimaryColor;
        ctx.lineWidth = 4;
        ctx.strokeRect(26, 26, canvas.width - 52, canvas.height - 52);
      } else if (bgFrameStyle === 'top_band') {
        ctx.fillStyle = bgPrimaryColor;
        ctx.fillRect(0, 0, canvas.width, 28);
        ctx.fillStyle = bgAccentColor;
        ctx.fillRect(0, 28, canvas.width, 7);
        ctx.fillStyle = bgPrimaryColor;
        ctx.fillRect(0, canvas.height - 16, canvas.width, 16);
      } else if (bgFrameStyle === 'left_stripe') {
        ctx.fillStyle = bgPrimaryColor;
        ctx.fillRect(0, 0, 24, canvas.height);
        ctx.fillStyle = bgAccentColor;
        ctx.fillRect(24, 0, 6, canvas.height);
      } else {
        // corners
        ctx.strokeStyle = bgPrimaryColor;
        ctx.lineWidth = 6;
        const m = 24;
        const s = 54;
        ctx.beginPath();
        ctx.moveTo(m, m + s); ctx.lineTo(m, m); ctx.lineTo(m + s, m);
        ctx.moveTo(canvas.width - m - s, m); ctx.lineTo(canvas.width - m, m); ctx.lineTo(canvas.width - m, m + s);
        ctx.moveTo(m, canvas.height - m - s); ctx.lineTo(m, canvas.height - m); ctx.lineTo(m + s, canvas.height - m);
        ctx.moveTo(canvas.width - m - s, canvas.height - m); ctx.lineTo(canvas.width - m, canvas.height - m); ctx.lineTo(canvas.width - m, canvas.height - m - s);
        ctx.stroke();
      }
      setPreviewDataUrl(canvas.toDataURL('image/png'));
    }
  }, [
    category,
    stampOptions,
    qrPayload,
    qrDarkColor,
    qrTransparentBg,
    qrCaption,
    bcValue,
    bcColor,
    bcTransparentBg,
    bcShowText,
    logoTitle,
    logoSubtitle,
    logoMonogram,
    logoStyle,
    logoPrimaryColor,
    logoAccentColor,
    logoTransparentBg,
    sigName,
    sigCaption,
    sigShowCaption,
    sigStyle,
    sigInkColor,
    sigStrokeWidth,
    sigSlant,
    wmMainText,
    wmSubText,
    wmMode,
    wmColor,
    wmAngle,
    bgPaperColor,
    bgPrimaryColor,
    bgAccentColor,
    bgFrameStyle
  ]);

  useEffect(() => {
    if (!isOpen) return;
    renderPreview();
  }, [isOpen, renderPreview]);

  // Analyse visuelle d'un fichier de référence importé pour imiter ses couleurs, sa forme et son style
  const handleAnalyzeReferenceVisual = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setIsAnalyzingRef(true);
    try {
      const canvas = document.createElement('canvas');
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      if (isPdf) {
        const buf = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
        const page = await pdf.getPage(1);
        const vp = page.getViewport({ scale: 1.2 });
        canvas.width = Math.round(vp.width);
        canvas.height = Math.round(vp.height);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          await page.render({ canvasContext: ctx, viewport: vp }).promise;
        }
      } else {
        const url = await new Promise<string>((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(String(r.result || ''));
          r.onerror = () => reject(new Error('Lecture impossible'));
          r.readAsDataURL(file);
        });
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const el = new Image();
          el.onload = () => resolve(el);
          el.onerror = () => reject(new Error('Image invalide'));
          el.src = url;
        });
        const sc = Math.min(1, 500 / Math.max(img.naturalWidth, img.naturalHeight));
        canvas.width = Math.max(40, Math.round(img.naturalWidth * sc));
        canvas.height = Math.max(40, Math.round(img.naturalHeight * sc));
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }
      }

      setRefThumbnail(canvas.toDataURL('image/png'));

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

      let bestPrimary: [number, number, number] = [11, 37, 69];
      let bestPrimaryScore = -1;
      let bestAccent: [number, number, number] = [212, 160, 23];
      let bestAccentScore = -1;
      let hasTransparentCorners = false;

      const corners = [0, (canvas.width - 1) * 4, ((canvas.height - 1) * canvas.width) * 4];
      for (const cIdx of corners) {
        if ((data[cIdx + 3] ?? 255) < 120) hasTransparentCorners = true;
      }

      for (let i = 0; i < data.length; i += 16) {
        const a = data[i + 3];
        if (a < 80) continue;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        if (lum > 235) continue;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const sat = max === 0 ? 0 : (max - min) / max;

        const score = sat * 100 + (220 - lum) * 0.35;
        if (score > bestPrimaryScore) {
          bestPrimaryScore = score;
          bestPrimary = [r, g, b];
        }
        const distPrimary = Math.abs(r - bestPrimary[0]) + Math.abs(g - bestPrimary[1]) + Math.abs(b - bestPrimary[2]);
        if (sat > 0.25 && distPrimary > 90 && sat * 100 > bestAccentScore) {
          bestAccentScore = sat * 100;
          bestAccent = [r, g, b];
        }
      }

      const detectedPrimary = rgbToHex(bestPrimary[0], bestPrimary[1], bestPrimary[2]);
      const detectedAccent = bestAccentScore > 0 ? rgbToHex(bestAccent[0], bestAccent[1], bestAccent[2]) : detectedPrimary;
      const ratio = canvas.width / Math.max(1, canvas.height);

      if (category === 'cachet') {
        const shape: StampShape = ratio > 1.45 ? 'rectangle' : ratio > 1.18 ? 'oval' : 'circle';
        setStampOptions((prev) => ({ ...prev, inkColor: detectedPrimary, shape }));
      } else if (category === 'logo') {
        setLogoPrimaryColor(detectedPrimary);
        setLogoAccentColor(detectedAccent);
        setLogoTransparentBg(hasTransparentCorners || true);
        setLogoStyle(ratio > 2.2 ? 'banner_pill' : ratio < 1.15 ? 'crest_centered' : 'badge_left');
      } else if (category === 'signature') {
        setSigInkColor(detectedPrimary);
      } else if (category === 'filigrane') {
        setWmColor(detectedPrimary);
      } else if (category === 'arrierePlan') {
        setBgPrimaryColor(detectedPrimary);
        setBgAccentColor(detectedAccent);
      } else if (category === 'barcode') {
        setBcColor(detectedPrimary);
      } else if (category === 'qrcode') {
        setQrDarkColor(detectedPrimary);
      }

      setRefAnalysisNote(
        `Imitation active · Couleur dominante ${detectedPrimary} · Accent ${detectedAccent} · Ratio ${ratio.toFixed(2)}`
      );
      showNotice(`Visuel de référence « ${file.name} » analysé et imité automatiquement !`);
    } catch {
      showNotice('Impossible d’analyser ce fichier de référence.');
    } finally {
      setIsAnalyzingRef(false);
    }
  };

  if (!isOpen) return null;

  const meta = CATEGORY_META[category];
  const CatIcon = meta.icon;

  return (
    <div className="fixed inset-0 z-[130] bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden flex flex-col my-auto max-h-[93vh]">
        {/* En-tête */}
        <div className="bg-[#0B2545] text-white px-5 py-4 flex items-center justify-between border-b border-amber-400/20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-300/30 flex items-center justify-center">
              <CatIcon className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-white">
                Générateur Universel de Visuels &amp; Imitation par Modèle
              </h3>
              <p className="text-xs text-blue-200">{meta.subtitle}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Barre des 7 catégories */}
        <div className="bg-slate-100 border-b border-slate-200 px-4 py-2.5 flex flex-wrap gap-1.5">
          {(Object.keys(CATEGORY_META) as UniversalVisualCategory[]).map((cat) => {
            const CIcon = CATEGORY_META[cat].icon;
            const active = category === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                  active
                    ? 'bg-[#0B2545] text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <CIcon className={`w-3.5 h-3.5 ${active ? 'text-amber-300' : 'text-[#0066B3]'}`} />
                <span>{CATEGORY_META[cat].label}</span>
              </button>
            );
          })}
        </div>

        {feedbackMsg && (
          <div className="bg-emerald-600 text-white text-xs px-5 py-2 font-semibold flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 overflow-y-auto">
          {/* Colonne Gauche : Imitation de modèle + Paramètres de la catégorie */}
          <div className="lg:col-span-7 space-y-4 text-xs">
            {/* Bloc Imitation de modèle de référence */}
            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="font-extrabold text-[#0B2545] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#0066B3]" />
                  <span>Imiter un visuel de référence (PDF / PNG / JPG)</span>
                </span>
                <p className="text-[11px] text-slate-600">
                  {refAnalysisNote ||
                    'Importez un exemple : le générateur extrait ses couleurs et son style pour créer votre version personnalisée.'}
                </p>
              </div>
              <label className="px-3.5 py-2 rounded-lg bg-[#0066B3] hover:bg-[#005291] text-white font-bold inline-flex items-center gap-1.5 cursor-pointer shrink-0">
                <Upload className="w-3.5 h-3.5" />
                <span>{isAnalyzingRef ? 'Analyse...' : 'Importer exemple'}</span>
                <input
                  type="file"
                  accept="application/pdf,image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleAnalyzeReferenceVisual}
                />
              </label>
            </div>

            {/* Paramètres selon catégorie */}
            {category === 'logo' && (
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Nom / Raison sociale</label>
                    <input
                      type="text"
                      value={logoTitle}
                      onChange={(e) => setLogoTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Monogramme (2-3 lettres)</label>
                    <input
                      type="text"
                      maxLength={3}
                      value={logoMonogram}
                      onChange={(e) => setLogoMonogram(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold uppercase"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Sous-titre / Localisation</label>
                  <input
                    type="text"
                    value={logoSubtitle}
                    onChange={(e) => setLogoSubtitle(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3 items-center">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Style</label>
                    <select
                      value={logoStyle}
                      onChange={(e) => setLogoStyle(e.target.value as typeof logoStyle)}
                      className="w-full px-2.5 py-2 border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="badge_left">Badge à gauche</option>
                      <option value="banner_pill">Bandeau exécutif</option>
                      <option value="crest_centered">Blason centré</option>
                      <option value="monogram_box">Cadre notarié Serif</option>
                    </select>
                  </div>
                  <label className="flex items-center gap-2 pt-5 cursor-pointer">
                    <input type="color" value={logoPrimaryColor} onChange={(e) => setLogoPrimaryColor(e.target.value)} />
                    <span className="font-semibold">Principale</span>
                  </label>
                  <label className="flex items-center gap-2 pt-5 cursor-pointer">
                    <input type="color" value={logoAccentColor} onChange={(e) => setLogoAccentColor(e.target.value)} />
                    <span className="font-semibold">Accent</span>
                  </label>
                </div>
                <label className="inline-flex items-center gap-2 font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={logoTransparentBg}
                    onChange={(e) => setLogoTransparentBg(e.target.checked)}
                  />
                  <span>Fond transparent (PNG détouré)</span>
                </label>
              </div>
            )}

            {category === 'signature' && (
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Nom du signataire</label>
                    <input
                      type="text"
                      value={sigName}
                      onChange={(e) => setSigName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Style calligraphique</label>
                    <select
                      value={sigStyle}
                      onChange={(e) => setSigStyle(e.target.value as typeof sigStyle)}
                      className="w-full px-2.5 py-2 border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="calligraphic">Plume fluide &amp; paraphe</option>
                      <option value="executive_sharp">Signature directionnelle</option>
                      <option value="paraphe_loop">Paraphe bouclé stylisé</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 items-center">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="color" value={sigInkColor} onChange={(e) => setSigInkColor(e.target.value)} />
                    <span className="font-semibold">Encre</span>
                  </label>
                  <div>
                    <label className="block font-semibold mb-1">Épaisseur ({sigStrokeWidth}px)</label>
                    <input
                      type="range"
                      min={1.5}
                      max={6}
                      step={0.3}
                      value={sigStrokeWidth}
                      onChange={(e) => setSigStrokeWidth(parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Inclinaison ({sigSlant}°)</label>
                    <input
                      type="range"
                      min={-15}
                      max={10}
                      step={1}
                      value={sigSlant}
                      onChange={(e) => setSigSlant(parseInt(e.target.value, 10))}
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sigShowCaption}
                      onChange={(e) => setSigShowCaption(e.target.checked)}
                    />
                    <span>Afficher fonction sous signature :</span>
                  </label>
                  {sigShowCaption && (
                    <input
                      type="text"
                      value={sigCaption}
                      onChange={(e) => setSigCaption(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 border border-slate-300 rounded-lg"
                    />
                  )}
                </div>
              </div>
            )}

            {category === 'cachet' && (
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Forme</label>
                    <select
                      value={stampOptions.shape}
                      onChange={(e) => setStampOptions({ ...stampOptions, shape: e.target.value as StampShape })}
                      className="w-full px-2.5 py-2 border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="circle">Rond officiel</option>
                      <option value="oval">Ovale notarial</option>
                      <option value="rectangle">Rectangle administratif</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Mention centrale</label>
                    <input
                      type="text"
                      value={stampOptions.centerMention}
                      onChange={(e) => setStampOptions({ ...stampOptions, centerMention: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold"
                    />
                  </div>
                  <label className="flex items-center gap-2 pt-5 cursor-pointer">
                    <input
                      type="color"
                      value={stampOptions.inkColor}
                      onChange={(e) => setStampOptions({ ...stampOptions, inkColor: e.target.value })}
                    />
                    <span className="font-semibold">Couleur encre</span>
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Couronne haute (Organisation)</label>
                    <input
                      type="text"
                      value={stampOptions.companyName}
                      onChange={(e) => setStampOptions({ ...stampOptions, companyName: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Couronne basse / Lieu</label>
                    <input
                      type="text"
                      value={stampOptions.subtitle || ''}
                      onChange={(e) => setStampOptions({ ...stampOptions, subtitle: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <label className="inline-flex items-center gap-2 font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(stampOptions.weatheredEffect)}
                      onChange={(e) => setStampOptions({ ...stampOptions, weatheredEffect: e.target.checked })}
                    />
                    <span>Grain d’encre réaliste</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Rotation ({stampOptions.rotation || 0}°)</span>
                    <input
                      type="range"
                      min={-25}
                      max={25}
                      value={stampOptions.rotation || 0}
                      onChange={(e) =>
                        setStampOptions({ ...stampOptions, rotation: parseInt(e.target.value, 10) })
                      }
                    />
                  </div>
                </div>
              </div>
            )}

            {category === 'filigrane' && (
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Texte principal</label>
                    <input
                      type="text"
                      value={wmMainText}
                      onChange={(e) => setWmMainText(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Disposition</label>
                    <select
                      value={wmMode}
                      onChange={(e) => setWmMode(e.target.value as typeof wmMode)}
                      className="w-full px-2.5 py-2 border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="center_seal">Sceau centré</option>
                      <option value="tiled_diagonal">Répétition diagonale</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 items-center">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Sous-texte</label>
                    <input
                      type="text"
                      value={wmSubText}
                      onChange={(e) => setWmSubText(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div className="flex items-center gap-4 pt-4">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="color" value={wmColor} onChange={(e) => setWmColor(e.target.value)} />
                      <span className="font-semibold">Couleur</span>
                    </label>
                    <input
                      type="range"
                      min={-45}
                      max={45}
                      value={wmAngle}
                      onChange={(e) => setWmAngle(parseInt(e.target.value, 10))}
                      className="w-24"
                    />
                  </div>
                </div>
              </div>
            )}

            {category === 'arrierePlan' && (
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-center">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Style de cadre</label>
                    <select
                      value={bgFrameStyle}
                      onChange={(e) => setBgFrameStyle(e.target.value as typeof bgFrameStyle)}
                      className="w-full px-2.5 py-2 border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="double">Double filet officiel</option>
                      <option value="simple">Cadre simple</option>
                      <option value="corners">Coins diplomatiques</option>
                      <option value="top_band">Bandeau haut/bas</option>
                      <option value="left_stripe">Bande verticale gauche</option>
                    </select>
                  </div>
                  <label className="flex items-center gap-1.5 pt-5 cursor-pointer">
                    <input type="color" value={bgPaperColor} onChange={(e) => setBgPaperColor(e.target.value)} />
                    <span className="font-semibold">Papier</span>
                  </label>
                  <label className="flex items-center gap-1.5 pt-5 cursor-pointer">
                    <input type="color" value={bgPrimaryColor} onChange={(e) => setBgPrimaryColor(e.target.value)} />
                    <span className="font-semibold">Cadre</span>
                  </label>
                  <label className="flex items-center gap-1.5 pt-5 cursor-pointer">
                    <input type="color" value={bgAccentColor} onChange={(e) => setBgAccentColor(e.target.value)} />
                    <span className="font-semibold">Accent</span>
                  </label>
                </div>
              </div>
            )}

            {category === 'barcode' && (
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Code à encoder</label>
                    <input
                      type="text"
                      value={bcValue}
                      onChange={(e) => setBcValue(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold"
                    />
                  </div>
                  <label className="flex items-center gap-2 pt-5 cursor-pointer">
                    <input type="color" value={bcColor} onChange={(e) => setBcColor(e.target.value)} />
                    <span className="font-semibold">Couleur des barres</span>
                  </label>
                </div>
                <div className="flex items-center gap-5">
                  <label className="inline-flex items-center gap-2 font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bcTransparentBg}
                      onChange={(e) => setBcTransparentBg(e.target.checked)}
                    />
                    <span>Fond transparent</span>
                  </label>
                  <label className="inline-flex items-center gap-2 font-semibold cursor-pointer">
                    <input type="checkbox" checked={bcShowText} onChange={(e) => setBcShowText(e.target.checked)} />
                    <span>Afficher le texte sous les barres</span>
                  </label>
                </div>
              </div>
            )}

            {category === 'qrcode' && (
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">URL ou données du QR Code</label>
                  <input
                    type="text"
                    value={qrPayload}
                    onChange={(e) => setQrPayload(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 items-center">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Légende sous le QR</label>
                    <input
                      type="text"
                      value={qrCaption}
                      onChange={(e) => setQrCaption(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div className="space-y-2 pt-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="color" value={qrDarkColor} onChange={(e) => setQrDarkColor(e.target.value)} />
                      <span className="font-semibold">Couleur du QR Code</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={qrTransparentBg}
                        onChange={(e) => setQrTransparentBg(e.target.checked)}
                      />
                      <span className="font-semibold">Fond transparent</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Colonne Droite : Aperçu haute définition & Actions */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-4">
            <div
              className="rounded-xl border border-slate-300 p-4 flex-1 min-h-[270px] flex flex-col items-center justify-center relative overflow-hidden"
              style={{
                backgroundImage:
                  'linear-gradient(45deg, #f1f5f9 25%, transparent 25%), linear-gradient(-45deg, #f1f5f9 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f1f5f9 75%), linear-gradient(-45deg, transparent 75%, #f1f5f9 75%)',
                backgroundSize: '14px 14px',
                backgroundPosition: '0 0, 0 7px, 7px -7px, -7px 0'
              }}
            >
              {previewDataUrl ? (
                <img
                  src={previewDataUrl}
                  alt="Aperçu généré"
                  className="max-h-56 max-w-full object-contain drop-shadow-xs"
                />
              ) : (
                <span className="text-xs text-slate-400">Génération de l’aperçu...</span>
              )}

              {refThumbnail && (
                <div className="mt-3 pt-2 border-t border-slate-200/80 w-full flex items-center gap-2 bg-white/90 px-2.5 py-1.5 rounded-lg">
                  <img src={refThumbnail} alt="Référence imitée" className="w-10 h-10 object-contain border rounded" />
                  <span className="text-[11px] font-semibold text-slate-700 truncate">
                    Modèle imité actif
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => renderPreview()}
                className="px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Actualiser</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!previewDataUrl) return;
                  const a = document.createElement('a');
                  a.href = previewDataUrl;
                  a.download = `Visuel_${category}_${Date.now()}.png`;
                  a.click();
                  showNotice('PNG haute définition téléchargé.');
                }}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Télécharger PNG</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!previewDataUrl) return;
                  onApplyVisual(targetAssetKey, previewDataUrl);
                  onClose();
                }}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>Appliquer au Dossier (Firestore)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
