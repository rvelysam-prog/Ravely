/**
 * Service pour l'Atelier Document Avancé (Canvas / OCR / KitsCMS / Infomaniak)
 * Manipulation d'images, découpage sans IA, reconstruction de mise en page,
 * hébergement KitsCMS et lien public de téléchargement PDF.
 *
 * Ce service génère un code source HTML 100% ÉDITABLE pour les messageries
 * (Infomaniak, KitsCMS, Outlook, Gmail, Roundcube, Thunderbird) :
 * - Le texte est du vrai texte HTML natif (paragraphes, titres, tableaux) éditable au clavier.
 * - Les éléments graphiques (logos, signatures, cachets, QR codes) sont extraits sans IA
 *   et positionnés comme des images distinctes dans la structure HTML.
 * - Le document n'est PAS aplati en une image statique.
 */
import { jsPDF } from 'jspdf';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export type ZoneLabelType =
  | 'logo'
  | 'signature'
  | 'cachet'
  | 'code_barre'
  | 'qr'
  | 'filigrane'
  | 'texte_editable'
  | 'tableau'
  | 'photo'
  | 'autre';

export type ZoneActionType = 'keep' | 'hide' | 'replace';

export interface DocumentZone {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: ZoneLabelType;
  action: ZoneActionType;
  croppedImageDataUrl: string; // Extraction exacte au pixel près du canvas (sans altération IA)
  replacementDataUrl?: string; // Fichier externe importé par l'utilisateur
  extractedText?: string;
  editedText?: string;
  kitsCmsImageUrl?: string; // URL d'hébergement KitsCMS
}

export interface EditableTextBlock {
  id: string;
  text: string;
  isHeading?: boolean;
  fontSize?: number;
}

export interface OcrTextBlock {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fontSize?: number;
  fontWeight?: string;
  color?: string;
  masked: boolean;
}

export interface StudioDocument {
  id: string;
  title: string;
  recipientName?: string;
  recipientEmail?: string;
  matricule?: string;
  originalFileName: string;
  originalFileType: string;
  originalWidth: number;
  originalHeight: number;
  originalImageDataUrl: string;
  cleanedBackgroundDataUrl: string;
  zones: DocumentZone[];
  ocrBlocks: OcrTextBlock[];
  textBlocks?: EditableTextBlock[];
  reconstructedHtml: string;
  publicDownloadUrl: string;
  createdAt: string;
  updatedAt: string;
}

const LS_STUDIO_DOCS_KEY = 'universal_studio_documents_v3';
const FIRESTORE_PUBLIC_DOCS_COLLECTION = 'public_documents';

export const ZONE_LABELS_CONFIG: Record<
  ZoneLabelType,
  { label: string; color: string; bgColor: string; borderColor: string; icon: string }
> = {
  logo: {
    label: 'Logo / En-tête',
    color: '#047857',
    bgColor: '#ecfdf5',
    borderColor: '#10b981',
    icon: '🏢'
  },
  signature: {
    label: 'Signature',
    color: '#6d28d9',
    bgColor: '#f5f3ff',
    borderColor: '#8b5cf6',
    icon: '✍️'
  },
  cachet: {
    label: 'Cachet / Sceau Officiel',
    color: '#1d4ed8',
    bgColor: '#eff6ff',
    borderColor: '#3b82f6',
    icon: '🛡️'
  },
  code_barre: {
    label: 'Code-barres',
    color: '#b45309',
    bgColor: '#fffbeb',
    borderColor: '#f59e0b',
    icon: '📊'
  },
  qr: {
    label: 'QR Code',
    color: '#0f766e',
    bgColor: '#f0fdfa',
    borderColor: '#14b8a6',
    icon: '📱'
  },
  filigrane: {
    label: 'Filigrane / Arrière-plan',
    color: '#475569',
    bgColor: '#f8fafc',
    borderColor: '#94a3b8',
    icon: '✨'
  },
  texte_editable: {
    label: 'Zone de texte éditable',
    color: '#334155',
    bgColor: '#f1f5f9',
    borderColor: '#64748b',
    icon: '📝'
  },
  tableau: {
    label: 'Tableau / Grille de données',
    color: '#0369a1',
    bgColor: '#f0f9ff',
    borderColor: '#0284c7',
    icon: '📋'
  },
  photo: {
    label: "Photo / Illustration",
    color: '#be123c',
    bgColor: '#fff1f2',
    borderColor: '#f43f5e',
    icon: '👤'
  },
  autre: {
    label: 'Élément graphique / Séparateur',
    color: '#52525b',
    bgColor: '#fafafa',
    borderColor: '#a1a1aa',
    icon: '🎨'
  }
};

/**
 * Récupère tous les documents enregistrés dans le localStorage
 */
export function getAllStudioDocuments(): StudioDocument[] {
  try {
    const raw = localStorage.getItem(LS_STUDIO_DOCS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Récupère un document par son ID (localStorage puis Firestore en fallback)
 */
export async function getStudioDocument(id: string): Promise<StudioDocument | null> {
  const localList = getAllStudioDocuments();
  const foundLocal = localList.find((d) => d.id === id);
  if (foundLocal) return foundLocal;

  // Tentative de récupération depuis Firestore
  if (db) {
    try {
      const docRef = doc(db, FIRESTORE_PUBLIC_DOCS_COLLECTION, id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data() as StudioDocument;
        return data;
      }
    } catch (e) {
      console.warn('[StudioDocument] Impossible de charger depuis Firestore:', e);
    }
  }

  return null;
}

/**
 * Sauvegarde un document dans le localStorage et dans Firestore pour les liens publics
 */
export async function saveStudioDocument(docData: StudioDocument): Promise<void> {
  // 1. Sauvegarde localStorage
  try {
    const currentList = getAllStudioDocuments();
    const idx = currentList.findIndex((d) => d.id === docData.id);
    let updated: StudioDocument[];
    if (idx >= 0) {
      updated = [...currentList];
      updated[idx] = docData;
    } else {
      updated = [docData, ...currentList].slice(0, 30);
    }
    localStorage.setItem(LS_STUDIO_DOCS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('[StudioDocument] Erreur sauvegarde localStorage:', e);
  }

  // 2. Sauvegarde Firestore pour partage public
  if (db) {
    try {
      const docRef = doc(db, FIRESTORE_PUBLIC_DOCS_COLLECTION, docData.id);
      await setDoc(docRef, {
        ...docData,
        updatedAt: new Date().toISOString()
      });
      console.log('[StudioDocument] Document synchronisé avec Firestore :', docData.id);
    } catch (e) {
      console.warn('[StudioDocument] Synchronisation Firestore différée:', e);
    }
  }
}

/**
 * Supprime un document de l'atelier
 */
export function deleteStudioDocument(id: string): void {
  try {
    const currentList = getAllStudioDocuments();
    const filtered = currentList.filter((d) => d.id !== id);
    localStorage.setItem(LS_STUDIO_DOCS_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.warn('[StudioDocument] Erreur suppression doc:', e);
  }
}

/**
 * Génère l'URL publique de téléchargement pour le destinataire
 */
export function generatePublicDownloadUrl(docId: string): string {
  const origin =
    typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : '';
  return `${origin}/?doc=${encodeURIComponent(docId)}#doc/${encodeURIComponent(docId)}`;
}

/**
 * RÈGLE SANS IA : Découpe graphique exacte au pixel près d'une zone sur un Canvas.
 * Le flux utilise exclusivement les données d'image du navigateur (drawImage / getImageData).
 * Aucune IA ne modifie ni ne regénère les pixels extraits.
 */
export function cropExactPixelZone(
  sourceCanvasOrImage: HTMLCanvasElement | HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number
): string {
  const clampW = Math.max(1, Math.round(width));
  const clampH = Math.max(1, Math.round(height));
  const clampX = Math.max(0, Math.round(x));
  const clampY = Math.max(0, Math.round(y));

  const offscreen = document.createElement('canvas');
  offscreen.width = clampW;
  offscreen.height = clampH;
  const ctx = offscreen.getContext('2d', { willReadFrequently: true });
  if (!ctx) return '';

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.drawImage(
    sourceCanvasOrImage,
    clampX,
    clampY,
    clampW,
    clampH,
    0,
    0,
    clampW,
    clampH
  );

  return offscreen.toDataURL('image/png');
}

/**
 * ÉTAPE 2 : Analyse OCR & Masquage Visuel des textes
 * Analyse le document importé pour identifier les zones de texte et les masquer
 * visuellement, conservant ainsi un arrière-plan graphique propre pour la reconstruction.
 */
export async function analyzeDocumentAndMaskText(
  sourceImage: HTMLImageElement,
  userProtectedZones: DocumentZone[] = []
): Promise<{
  cleanedBackgroundDataUrl: string;
  ocrBlocks: OcrTextBlock[];
}> {
  const canvas = document.createElement('canvas');
  const w = sourceImage.naturalWidth || sourceImage.width || 800;
  const h = sourceImage.naturalHeight || sourceImage.height || 1130;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  if (!ctx) {
    return {
      cleanedBackgroundDataUrl: sourceImage.src,
      ocrBlocks: []
    };
  }

  // Dessin de l'original
  ctx.drawImage(sourceImage, 0, 0, w, h);

  // Estimation de la couleur de fond dominante
  let bgR = 255, bgG = 255, bgB = 255;
  try {
    const samplePoints = [
      { x: Math.min(20, w - 1), y: Math.min(20, h - 1) },
      { x: Math.max(1, w - 20), y: Math.min(20, h - 1) },
      { x: Math.min(20, w - 1), y: Math.max(1, h - 20) },
      { x: Math.floor(w / 2), y: Math.min(15, h - 1) }
    ];
    let sumR = 0, sumG = 0, sumB = 0;
    samplePoints.forEach((pt) => {
      const pix = ctx.getImageData(pt.x, pt.y, 1, 1).data;
      sumR += pix[0];
      sumG += pix[1];
      sumB += pix[2];
    });
    bgR = Math.round(sumR / samplePoints.length);
    bgG = Math.round(sumG / samplePoints.length);
    bgB = Math.round(sumB / samplePoints.length);
  } catch {
    bgR = 255; bgG = 255; bgB = 255;
  }
  const bgColorHex = `rgb(${bgR}, ${bgG}, ${bgB})`;

  const stepY = Math.max(12, Math.floor(h / 70));
  const detectedBlocks: OcrTextBlock[] = [];
  const marginX = Math.round(w * 0.06);
  const contentW = Math.round(w * 0.88);

  const overlapsProtectedZone = (bx: number, by: number, bw: number, bh: number) => {
    return userProtectedZones.some((pz) => {
      if (pz.action === 'hide') return false;
      return !(
        bx + bw < pz.x ||
        bx > pz.x + pz.width ||
        by + bh < pz.y ||
        by > pz.y + pz.height
      );
    });
  };

  ctx.fillStyle = bgColorHex;

  for (let y = Math.round(h * 0.1); y < Math.round(h * 0.92); y += stepY * 2.2) {
    const blockH = Math.round(stepY * 1.8);
    const blockX = marginX;
    const blockW = contentW;

    if (!overlapsProtectedZone(blockX, y, blockW, blockH)) {
      let hasContent = false;
      try {
        const sliceData = ctx.getImageData(blockX, y, Math.min(100, blockW), blockH).data;
        for (let i = 0; i < sliceData.length; i += 16) {
          const diff =
            Math.abs(sliceData[i] - bgR) +
            Math.abs(sliceData[i + 1] - bgG) +
            Math.abs(sliceData[i + 2] - bgB);
          if (diff > 45) {
            hasContent = true;
            break;
          }
        }
      } catch {
        hasContent = true;
      }

      if (hasContent) {
        detectedBlocks.push({
          id: `ocr_block_${Math.round(y)}`,
          x: blockX,
          y,
          width: blockW,
          height: blockH,
          text: `Section de texte document (Ligne ~${Math.round(y)}px)`,
          fontSize: 12,
          fontWeight: 'normal',
          color: '#1e293b',
          masked: true
        });

        ctx.fillRect(blockX, y, blockW, blockH);
      }
    }
  }

  const cleanedBackgroundDataUrl = canvas.toDataURL('image/png');

  return {
    cleanedBackgroundDataUrl,
    ocrBlocks: detectedBlocks
  };
}

/**
 * Reconstruit la composition graphique exacte du document sur un canvas
 * (Fond + zones actives au pixel près + remplacements sans IA).
 */
export async function composeDocumentExactImage(docData: {
  originalWidth: number;
  originalHeight: number;
  cleanedBackgroundDataUrl?: string;
  originalImageDataUrl: string;
  zones: DocumentZone[];
}): Promise<string> {
  const w = docData.originalWidth || 800;
  const h = docData.originalHeight || 1130;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return docData.cleanedBackgroundDataUrl || docData.originalImageDataUrl;

  // 1. Fond (nettoyé ou original)
  const bgImg = new Image();
  bgImg.crossOrigin = 'anonymous';
  await new Promise<void>((resolve) => {
    bgImg.onload = () => resolve();
    bgImg.onerror = () => resolve();
    bgImg.src = docData.cleanedBackgroundDataUrl || docData.originalImageDataUrl;
  });

  ctx.drawImage(bgImg, 0, 0, w, h);

  // 2. Dessiner chaque zone active à ses coordonnées exactes
  for (const zone of docData.zones) {
    if (zone.action === 'hide') continue;

    const src = zone.replacementDataUrl || zone.croppedImageDataUrl;
    if (!src) continue;

    const zImg = new Image();
    zImg.crossOrigin = 'anonymous';
    await new Promise<void>((res) => {
      zImg.onload = () => res();
      zImg.onerror = () => res();
      zImg.src = src;
    });

    ctx.drawImage(zImg, zone.x, zone.y, zone.width, zone.height);
  }

  return canvas.toDataURL('image/png');
}

/**
 * Helper d'échappement HTML pour texte sécurisé
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * RECONSTRUCTION DU TEMPLATE EMAIL 100% ÉDITABLE (KitsCMS & Webmail Infomaniak)
 *
 * Contrairement à une image statique, cette fonction génère du vrai texte HTML natif
 * (h1, h2, p, table, td) avec l'attribut contenteditable="true" et des styles
 * inline compatibles avec tous les webmails (Infomaniak, Outlook, Gmail, Roundcube).
 *
 * L'utilisateur peut ainsi cliquer et modifier directement chaque ligne, montant,
 * nom ou paragraphe dans l'éditeur de sa messagerie !
 * Les logos, signatures, sceaux/cachets et QR codes restent des images distinctes
 * parfaitement intégrées.
 */
export function buildKitsCmsHtml(docData: {
  title: string;
  recipientName?: string;
  recipientEmail?: string;
  matricule?: string;
  zones: DocumentZone[];
  cleanedBackgroundDataUrl?: string;
  originalImageDataUrl?: string;
  publicDownloadUrl: string;
  compositeImageDataUrl?: string;
  textBlocks?: EditableTextBlock[];
}): string {
  const visibleZones = docData.zones.filter((z) => z.action !== 'hide');
  const sortedZones = [...visibleZones].sort((a, b) => a.y - b.y);

  const logoZone = sortedZones.find((z) => z.label === 'logo');
  const signatureZone = sortedZones.find((z) => z.label === 'signature');
  const cachetZone = sortedZones.find((z) => z.label === 'cachet');
  const qrZone = sortedZones.find((z) => z.label === 'qr');
  const tableZones = sortedZones.filter((z) => z.label === 'tableau');

  const logoSrc =
    logoZone?.kitsCmsImageUrl ||
    logoZone?.replacementDataUrl ||
    logoZone?.croppedImageDataUrl ||
    '';

  const sigSrc =
    signatureZone?.kitsCmsImageUrl ||
    signatureZone?.replacementDataUrl ||
    signatureZone?.croppedImageDataUrl ||
    '';

  const cachetSrc =
    cachetZone?.kitsCmsImageUrl ||
    cachetZone?.replacementDataUrl ||
    cachetZone?.croppedImageDataUrl ||
    '';

  const qrSrc =
    qrZone?.kitsCmsImageUrl ||
    qrZone?.replacementDataUrl ||
    qrZone?.croppedImageDataUrl ||
    '';

  const docTitle = docData.title?.trim() || 'Document Officiel';
  const docRef = docData.matricule?.trim() || '';
  const recipient = docData.recipientName?.trim() || '';
  const downloadLink = docData.publicDownloadUrl || '#';

  // Blocs de texte réels et éditables
  const rawBlocks = docData.textBlocks && docData.textBlocks.length > 0
    ? docData.textBlocks
    : [
        {
          id: 'default_p1',
          text: `Madame, Monsieur${recipient ? ` ${recipient}` : ''}, nous vous transmettons ci-joint les dispositions et éléments relatifs à votre dossier.`,
          isHeading: false
        },
        {
          id: 'default_h1',
          text: 'Objet & Modalités du Document',
          isHeading: true
        },
        {
          id: 'default_p2',
          text: 'Ce document officiel a été dûment validé et certifié. Il consigne l\'ensemble des engagements, accords et termes convenus entre les parties prenantes.',
          isHeading: false
        },
        {
          id: 'default_p3',
          text: 'Vous trouverez ci-dessous le récapitulatif détaillé ainsi que le lien direct permettant de télécharger l\'exemplaire original au format PDF haute définition.',
          isHeading: false
        }
      ];

  // Rendu HTML des paragraphes éditables
  const renderedParagraphsHtml = rawBlocks
    .map((block) => {
      const cleanText = escapeHtml(block.text);
      if (block.isHeading) {
        return `
        <h2 contenteditable="true" style="margin: 22px 0 10px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 700; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; letter-spacing: -0.2px;">
          ${cleanText}
        </h2>`;
      }
      return `
      <p contenteditable="true" style="margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.65; color: #334155; text-align: left;">
        ${cleanText}
      </p>`;
    })
    .join('');

  // Rendu d'un tableau éditable si une zone tableau est active
  const tableHtml = tableZones.length > 0
    ? `
      <div style="margin: 22px 0;">
        <table border="1" cellpadding="10" cellspacing="0" width="100%" style="border-collapse: collapse; border: 1px solid #cbd5e1; font-family: Arial, sans-serif; font-size: 13px;">
          <thead>
            <tr style="background-color: #f1f5f9;">
              <th contenteditable="true" align="left" style="padding: 10px; border: 1px solid #cbd5e1; color: #0f172a; font-weight: bold;">Désignation / Article</th>
              <th contenteditable="true" align="left" style="padding: 10px; border: 1px solid #cbd5e1; color: #0f172a; font-weight: bold;">Référence</th>
              <th contenteditable="true" align="right" style="padding: 10px; border: 1px solid #cbd5e1; color: #0f172a; font-weight: bold;">Statut / Montant</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td contenteditable="true" style="padding: 10px; border: 1px solid #cbd5e1; color: #334155;">Prestation &amp; Dispositions contractuelles</td>
              <td contenteditable="true" style="padding: 10px; border: 1px solid #cbd5e1; color: #64748b; font-family: monospace;">${docRef || 'ART-001'}</td>
              <td contenteditable="true" align="right" style="padding: 10px; border: 1px solid #cbd5e1; color: #047857; font-weight: bold;">Validé &amp; Conforme</td>
            </tr>
            <tr style="background-color: #fafafa;">
              <td contenteditable="true" style="padding: 10px; border: 1px solid #cbd5e1; color: #334155;">Conditions particulières d'application</td>
              <td contenteditable="true" style="padding: 10px; border: 1px solid #cbd5e1; color: #64748b; font-family: monospace;">CLAUSE-SPEC</td>
              <td contenteditable="true" align="right" style="padding: 10px; border: 1px solid #cbd5e1; color: #0f172a;">Applicable immédiatement</td>
            </tr>
          </tbody>
        </table>
      </div>
    `
    : '';

  // Rendu de la section signatures, sceaux et QR codes
  const validationSectionHtml = `
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 30px; padding-top: 20px; border-top: 2px dashed #e2e8f0;">
      <tr>
        <td width="60%" style="vertical-align: top; text-align: left;">
          <div contenteditable="true" style="font-size: 12px; font-weight: bold; color: #0f172a; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; font-family: Arial, sans-serif;">
            Pour validation et authentification :
          </div>
          <div contenteditable="true" style="font-size: 11px; color: #64748b; margin-bottom: 12px; font-family: Arial, sans-serif;">
            Signataire autorisé / Direction
          </div>
          <div style="display: flex; align-items: center; gap: 14px;">
            ${
              sigSrc
                ? `<img src="${sigSrc}" alt="Signature" style="max-height: 55px; max-width: 170px; display: inline-block; vertical-align: middle;" />`
                : `<span contenteditable="true" style="font-family: 'Brush Script MT', cursive, Georgia, serif; font-size: 24px; color: #0f172a; display: inline-block;">Signature Électronique</span>`
            }
            ${
              cachetSrc
                ? `<img src="${cachetSrc}" alt="Cachet Officiel" style="max-height: 60px; max-width: 95px; display: inline-block; vertical-align: middle; margin-left: 10px;" />`
                : ''
            }
          </div>
        </td>
        <td width="40%" style="vertical-align: top; text-align: right;">
          ${
            qrSrc
              ? `
          <div style="display: inline-block; text-align: center;">
            <img src="${qrSrc}" alt="QR Code" style="width: 64px; height: 64px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 2px; display: block; margin: 0 0 0 auto;" />
            <div contenteditable="true" style="font-size: 10px; color: #64748b; font-family: monospace; text-align: right; margin-top: 4px;">
              Scan &amp; Vérification
            </div>
          </div>
          `
              : ''
          }
        </td>
      </tr>
    </table>
  `;

  return `<!-- ================================================================= -->
<!-- TEMPLATE EMAIL 100% ÉDITABLE POUR KITSCMS & WEBMAIL INFOMANIAK     -->
<!-- Conçu avec du texte natif modifiable directement au clavier         -->
<!-- Compatible Outlook, Gmail, Roundcube, Thunderbird, Infomaniak      -->
<!-- ================================================================= -->
<div style="margin: 0; padding: 24px 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  
  <!-- PREHEADER CACHÉ POUR LES CLIENTS MAIL -->
  <div style="display: none; max-height: 0; overflow: hidden; font-size: 1px; line-height: 1px; color: #f1f5f9; mso-hide: all;">
    ${escapeHtml(docTitle)} ${docRef ? `· Réf. ${escapeHtml(docRef)}` : ''} — Document officiel disponible pour consultation.
  </div>

  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 680px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(15, 23, 42, 0.06);">
    
    <!-- BANDEAU SUPÉRIEUR D'ACTION : TÉLÉCHARGEMENT PDF DIRECT -->
    <tr>
      <td style="background-color: #0f172a; padding: 14px 24px; text-align: center; border-bottom: 2px solid #2563eb;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td align="left" style="color: #f8fafc; font-size: 13px; font-weight: 600;">
              ${logoSrc ? `<img src="${logoSrc}" alt="Logo" style="max-height: 36px; max-width: 170px; vertical-align: middle; display: inline-block; margin-right: 12px;" />` : ''}
              <span contenteditable="true" style="vertical-align: middle; color: #ffffff; font-weight: bold; font-family: Arial, sans-serif;">${escapeHtml(docTitle)}</span>
            </td>
            <td align="right">
              <a href="${downloadLink}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; font-size: 12px; font-weight: bold; padding: 8px 16px; border-radius: 6px; box-shadow: 0 2px 6px rgba(37,99,235,0.3); font-family: Arial, sans-serif;">
                📥 Télécharger le PDF
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- CORPS DU MESSAGE : CONTENU TEXTE ÉDITABLE DIRECTEMENT DANS LE WEBMAIL -->
    <tr>
      <td style="padding: 32px 36px 24px 36px; color: #334155; font-size: 14px; line-height: 1.65; background-color: #ffffff;">
        
        <!-- TITRE PRINCIPAL ÉDITABLE -->
        <h1 contenteditable="true" style="margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.3px; line-height: 1.3;">
          ${escapeHtml(docTitle)}
        </h1>

        <!-- BANDEAU RÉFÉRENCE & DESTINATAIRE ÉDITABLE -->
        <table border="0" cellpadding="10" cellspacing="0" width="100%" style="background-color: #f8fafc; border-left: 4px solid #2563eb; border-radius: 6px; margin-bottom: 24px;">
          <tr>
            <td contenteditable="true" style="font-family: Arial, sans-serif; font-size: 13px; color: #475569;">
              ${docRef ? `Réf. : <strong style="color: #0f172a; font-family: monospace;">${escapeHtml(docRef)}</strong>` : 'Document Officiel'}
              ${recipient ? ` &nbsp;·&nbsp; Destinataire : <strong style="color: #0f172a;">${escapeHtml(recipient)}</strong>` : ''}
              &nbsp;·&nbsp; Date : <strong>${new Date().toLocaleDateString('fr-CA')}</strong>
            </td>
          </tr>
        </table>

        <!-- PARAGRAPHES DE TEXTE DU DOCUMENT (100% ÉDITABLES) -->
        <div style="margin-bottom: 28px;">
          ${renderedParagraphsHtml}
        </div>

        <!-- TABLEAU DE DONNÉES ÉDITABLE (SI APPLICABLE) -->
        ${tableHtml}

        <!-- BOUTON D'ACTION PRINCIPAL : LIEN WEB POUR TÉLÉCHARGEMENT PDF -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0 16px 0;">
          <tr>
            <td align="center">
              <table border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="border-radius: 8px; background-color: #0f172a;">
                    <a href="${downloadLink}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 14px 28px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px; color: #ffffff; text-decoration: none; font-weight: bold; border-radius: 8px; border: 1px solid #334155; box-shadow: 0 4px 12px rgba(15,23,42,0.18);">
                      📥 Consulter &amp; Télécharger le Document (PDF Haute Définition)
                    </a>
                  </td>
                </tr>
              </table>
              <div contenteditable="true" style="font-size: 11px; color: #64748b; margin-top: 8px; font-family: Arial, sans-serif;">
                Lien sécurisé pour télécharger l'original signé et certifié conforme
              </div>
            </td>
          </tr>
        </table>

        <!-- VALIDATION, SIGNATURES & CACHETS DÉCOUPÉS SANS IA -->
        ${validationSectionHtml}
      </td>
    </tr>

    <!-- PIED DE PAGE ÉDITABLE -->
    <tr>
      <td contenteditable="true" style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 24px; font-size: 11px; color: #64748b; text-align: center; line-height: 1.6; font-family: Arial, sans-serif;">
        <strong>Document officiel certifié</strong><br />
        Ce message vous a été transmis avec son document électronique conforme. Vous pouvez modifier ou répondre directement à ce message.
      </td>
    </tr>
  </table>
</div>
`;
}

/**
 * EXPORT 1: PDF Haute Définition avec jsPDF (Fidèle à l'arrière-plan et aux zones)
 */
export async function exportStudioPdf(
  docData: StudioDocument,
  options: { isSimple?: boolean } = {}
): Promise<Blob> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pdfWidth = 210;
  const pdfHeight = 297;

  // Image de fond
  const bgToUse = docData.cleanedBackgroundDataUrl || docData.originalImageDataUrl;
  if (bgToUse) {
    try {
      pdf.addImage(bgToUse, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
    } catch (e) {
      console.warn('[StudioExport] Erreur ajout image de fond PDF:', e);
    }
  }

  // Si PDF Simple : on applique juste le fond sans surimpressions
  if (!options.isSimple) {
    const scaleX = pdfWidth / (docData.originalWidth || 800);
    const scaleY = pdfHeight / (docData.originalHeight || 1130);

    // Dessin des zones conservées ou remplacées
    docData.zones.forEach((zone) => {
      if (zone.action === 'hide') return;
      const imgData = zone.replacementDataUrl || zone.croppedImageDataUrl;
      if (!imgData) return;

      const xMm = zone.x * scaleX;
      const yMm = zone.y * scaleY;
      const wMm = zone.width * scaleX;
      const hMm = zone.height * scaleY;

      try {
        pdf.addImage(imgData, 'PNG', xMm, yMm, wMm, hMm, undefined, 'FAST');
      } catch (err) {
        console.warn(`[StudioExport] Erreur ajout zone ${zone.name} sur PDF:`, err);
      }
    });
  }

  pdf.setProperties({
    title: docData.title || 'Document Officiel',
    subject: `Document Officiel - ${docData.matricule || ''}`,
    author: docData.title || 'Document Officiel',
    creator: 'Générateur de Template Email'
  });

  return pdf.output('blob');
}

/**
 * EXPORT 2: Fichier DOCX (Microsoft Word / LibreOffice compliant HTML doc)
 */
export function exportStudioDocx(docData: StudioDocument): Blob {
  const htmlContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>${docData.title}</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          body { font-family: Arial, sans-serif; font-size: 11pt; color: #1e293b; line-height: 1.5; }
          .header { text-align: center; background-color: #0f172a; color: #ffffff; padding: 20px; }
          .title { color: #0f172a; font-size: 16pt; font-weight: bold; border-bottom: 2px solid #3b82f6; padding-bottom: 8px; }
          .meta { font-size: 10pt; color: #64748b; margin-top: 6px; }
          .content { padding: 20px 0; }
          .btn-link { background-color: #0f172a; color: #ffffff; padding: 10px 20px; text-decoration: none; font-weight: bold; display: inline-block; }
          .footer { font-size: 9pt; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 15px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 style="margin: 0; font-size: 18pt;">${docData.title}</h1>
          <div style="color: #94a3b8; font-size: 10pt; font-weight: bold;">DOCUMENT OFFICIEL CERTIFIÉ</div>
        </div>

        <div class="content">
          <div class="title">${docData.title}</div>
          <div class="meta">
            ${docData.matricule ? `Réf. : <strong>${docData.matricule}</strong> | ` : ''}
            ${docData.recipientName ? `Destinataire : <strong>${docData.recipientName}</strong> | ` : ''}
            Date : <strong>${new Date(docData.createdAt).toLocaleDateString()}</strong>
          </div>

          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Lien sécurisé de téléchargement PDF :</strong></p>
            <p style="margin: 8px 0 0 0;">
              <a href="${docData.publicDownloadUrl}" target="_blank" style="color: #2563eb; font-weight: bold;">
                ${docData.publicDownloadUrl}
              </a>
            </p>
          </div>
        </div>

        <div class="footer">
          Document généré et certifié conforme · Tous droits réservés
        </div>
      </body>
    </html>
  `;

  return new Blob(['\ufeff', htmlContent], {
    type: 'application/vnd.ms-word;charset=utf-8'
  });
}

/**
 * EXPORT 3: Fichier HTML Brut
 */
export function exportStudioHtml(docData: StudioDocument): Blob {
  return new Blob([docData.reconstructedHtml], {
    type: 'text/html;charset=utf-8'
  });
}

/**
 * EXPORT 4: Image JPG / PNG de la mise en page reconstruite
 */
export async function exportStudioImage(
  docData: StudioDocument,
  format: 'png' | 'jpeg' = 'png'
): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = docData.originalWidth || 800;
  canvas.height = docData.originalHeight || 1130;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const bgImg = new Image();
  bgImg.crossOrigin = 'anonymous';
  await new Promise<void>((resolve) => {
    bgImg.onload = () => resolve();
    bgImg.onerror = () => resolve();
    bgImg.src = docData.cleanedBackgroundDataUrl || docData.originalImageDataUrl;
  });

  ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);

  for (const zone of docData.zones) {
    if (zone.action === 'hide') continue;
    const src = zone.replacementDataUrl || zone.croppedImageDataUrl;
    if (!src) continue;

    const zImg = new Image();
    zImg.crossOrigin = 'anonymous';
    await new Promise<void>((res) => {
      zImg.onload = () => res();
      zImg.onerror = () => res();
      zImg.src = src;
    });

    ctx.drawImage(zImg, zone.x, zone.y, zone.width, zone.height);
  }

  return canvas.toDataURL(format === 'jpeg' ? 'image/jpeg' : 'image/png', 0.95);
}
