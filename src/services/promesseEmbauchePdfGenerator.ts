import { jsPDF } from 'jspdf';
import { CONTRACT_STATIC_ASSETS, loadStaticImageAsPngDataUrl } from './contractPdfGenerator';
import {
  PdfAssetItemSettings,
  PdfImportedAssetsConfig,
  convertUploadedImageForPdf,
  getSavedCustomCachet,
  getSavedCustomFiligrane,
  getSavedCustomLogo,
  getSavedCustomSignature,
  getSavedPdfAssetsConfig,
  normalizePdfAssetsConfig,
  renderAssetWithSettingsForPdf
} from './departmentsAndEmailService';

export interface PromesseEmbaucheData {
  nom_complet: string;
  date_naissance: string;
  sexe: 'Féminin' | 'Masculin' | string;
  nationalite: string;
  numero_piece_identite: string;
  telephone: string;
  email: string;
  adresse: string;
  contact_urgence: string;
  photo_base64?: string;
  poste: string;
  departement: string;
  manager: string;
  matricule: string;
  type_contrat: string;
  date_embauche: string;
  date_etablissement?: string;
  date_emission?: string;
  date_fin?: string;
  salaire_horaire: number | string;
  primes?: string;
  mode_paiement?: string;
  lieu_travail: string;
  horaire: string;
  ni: string;
  responsabilites: string[];
  logo_data_url?: string;
  signature_data_url?: string;
  cachet_data_url?: string;
  filigrane_data_url?: string;
  assets_config?: PdfImportedAssetsConfig;
}

export const DEFAULT_PROMESSE_RESPONSABILITES = [
  '• Préparer les commandes en rassemblant les articles demandés selon les bons de commande.',
  "• Vérifier les produits en contrôlant les références, les quantités et l'état des marchandises.",
  '• Emballer les marchandises dans des cartons ou des emballages adaptés au transport.',
  "• Étiqueter les colis et apposer les étiquettes d'expédition nécessaires.",
  "• Organiser les commandes préparées dans les zones prévues pour l'expédition et la livraison.",
  '• Participer à la gestion des stocks en signalant les produits manquants, les erreurs de préparation et les marchandises endommagées.'
].join('\n');

const MONTHS_FR_LOWER = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre'
];

export function formatPromesseDateSlash(dateStr?: string): string {
  if (!dateStr || !dateStr.trim()) {
    const now = new Date();
    return `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  }
  const clean = dateStr.trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) {
    return clean;
  }
  const matchIso = clean.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (matchIso) {
    return `${matchIso[3]}/${matchIso[2]}/${matchIso[1]}`;
  }
  return clean;
}

export function formatPromesseDateLongFr(dateStr?: string): string {
  if (!dateStr || !dateStr.trim()) {
    return '04 janvier 2027';
  }
  const clean = dateStr.trim();
  const matchIso = clean.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (matchIso) {
    const day = String(parseInt(matchIso[3], 10)).padStart(2, '0');
    const monthIdx = parseInt(matchIso[2], 10) - 1;
    const year = matchIso[1];
    return `${day} ${MONTHS_FR_LOWER[monthIdx] || matchIso[2]} ${year}`;
  }
  const matchSlash = clean.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (matchSlash) {
    const day = String(parseInt(matchSlash[1], 10)).padStart(2, '0');
    const monthIdx = parseInt(matchSlash[2], 10) - 1;
    const year = matchSlash[3];
    return `${day} ${MONTHS_FR_LOWER[monthIdx] || matchSlash[2]} ${year}`;
  }
  return clean;
}

let cachedDefaultLargeBlasonWatermark = '';

export async function getDefaultLargeBlasonWatermarkDataUrl(): Promise<string> {
  if (cachedDefaultLargeBlasonWatermark) return cachedDefaultLargeBlasonWatermark;
  if (typeof document === 'undefined') return '';

  let rawBlason = await loadStaticImageAsPngDataUrl(CONTRACT_STATIC_ASSETS.blasonOriginal);
  if (!rawBlason) {
    rawBlason = await loadStaticImageAsPngDataUrl(CONTRACT_STATIC_ASSETS.blasonFallback);
  }
  if (!rawBlason) return '';

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width || 600;
        canvas.height = img.naturalHeight || img.height || 750;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve('');
          return;
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 0.085;
        ctx.filter = 'grayscale(100%)';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const fadedUrl = canvas.toDataURL('image/png');
        cachedDefaultLargeBlasonWatermark = fadedUrl;
        resolve(fadedUrl);
      } catch {
        resolve('');
      }
    };
    img.onerror = () => resolve('');
    img.src = rawBlason;
  });
}

function drawFooterPage(doc: jsPDF, pageNumber: number) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(String(pageNumber), 23.5, 288);

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.45);
  doc.line(35, 288.8, 187, 288.8);
}

function drawSectionHeaderBar(doc: jsPDF, y: number, title: string) {
  doc.setFillColor(244, 244, 244);
  doc.rect(15, y, 182, 7.5, 'F');

  doc.setDrawColor(198, 125, 38);
  doc.setLineWidth(0.35);
  doc.circle(20.2, y + 4.1, 1.05, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(198, 125, 38);
  doc.text(title, 25.5, y + 5.3);
}

/**
 * Draws a yellow highlight box (#FFFF00) behind text and renders the text in black on top,
 * matching the reference EMBAUCHE_SALIMATA1.pdf.
 */
function drawHighlightedValue(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  fontSize = 10.5,
  fontStyle: 'normal' | 'bold' = 'normal'
) {
  const clean = (text || '').trim();
  if (!clean) return;
  doc.setFont('helvetica', fontStyle);
  doc.setFontSize(fontSize);
  const textWidth = doc.getTextWidth(clean);

  // Yellow highlight rectangle (#FFFF00)
  doc.setFillColor(255, 255, 0);
  doc.rect(x - 0.8, y - 4.2, textWidth + 1.8, 5.6, 'F');

  // Text on top
  doc.setTextColor(0, 0, 0);
  doc.text(clean, x, y);
}

/**
 * Computes PDF placement (x, y, width, height in mm) from admin asset settings.
 */
function computePdfPlacementMm(
  cfg: PdfAssetItemSettings,
  refZone: {
    zoneX: number;
    zoneY: number;
    zoneW: number;
    zoneH: number;
    defaultWMm: number;
    defaultHMm: number;
    defaultWPx: number;
    defaultHPx: number;
  },
  boxScaleX = 1,
  boxScaleY = 1
): { x: number; y: number; w: number; h: number } {
  const baseW =
    cfg.widthUnit === '%'
      ? refZone.defaultWMm * (cfg.widthValue / 100)
      : refZone.defaultWMm * (cfg.widthValue / refZone.defaultWPx);
  const baseH =
    cfg.heightUnit === '%'
      ? refZone.defaultHMm * (cfg.heightValue / 100)
      : refZone.defaultHMm * (cfg.heightValue / refZone.defaultHPx);

  let anchorX = refZone.zoneX;
  if (cfg.alignX === 'center') {
    anchorX = refZone.zoneX + (refZone.zoneW - baseW) / 2;
  } else if (cfg.alignX === 'right') {
    anchorX = refZone.zoneX + refZone.zoneW - baseW;
  }

  let anchorY = refZone.zoneY;
  if (cfg.alignY === 'middle') {
    anchorY = refZone.zoneY + (refZone.zoneH - baseH) / 2;
  } else if (cfg.alignY === 'bottom') {
    anchorY = refZone.zoneY + refZone.zoneH - baseH;
  }

  // Convert pixel offsets to mm (~0.35mm per preview px)
  const shiftXMm = (cfg.offsetX || 0) * 0.35;
  const shiftYMm = (cfg.offsetY || 0) * 0.35;

  const centerX = anchorX + baseW / 2 + shiftXMm;
  const centerY = anchorY + baseH / 2 + shiftYMm;

  const finalW = Math.max(2, baseW * boxScaleX);
  const finalH = Math.max(2, baseH * boxScaleY);

  return {
    x: centerX - finalW / 2,
    y: centerY - finalH / 2,
    w: finalW,
    h: finalH
  };
}

export async function generatePromesseEmbauchePdfDoc(
  data: PromesseEmbaucheData
): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  const assetsConfig = normalizePdfAssetsConfig(data.assets_config || getSavedPdfAssetsConfig());

  // Load ONLY the user's static or uploaded files (no AI generation)
  const [
    defaultLogoAtlanticUrl,
    logoCanadaUrl,
    headerBlasonOriginalUrl,
    headerBlasonFallbackUrl,
    defaultLargeWatermarkUrl,
    defaultSignatureUrl,
    defaultCachetUrl
  ] = await Promise.all([
    loadStaticImageAsPngDataUrl(CONTRACT_STATIC_ASSETS.logoAtlantic),
    loadStaticImageAsPngDataUrl(CONTRACT_STATIC_ASSETS.logoCanada),
    loadStaticImageAsPngDataUrl(CONTRACT_STATIC_ASSETS.blasonOriginal),
    loadStaticImageAsPngDataUrl(CONTRACT_STATIC_ASSETS.blasonFallback),
    getDefaultLargeBlasonWatermarkDataUrl(),
    loadStaticImageAsPngDataUrl(CONTRACT_STATIC_ASSETS.signature),
    loadStaticImageAsPngDataUrl(CONTRACT_STATIC_ASSETS.cachet)
  ]);

  // 1. Logo (custom uploaded or default logo-atlantic.png) + Admin settings
  const rawLogo =
    (data.logo_data_url && data.logo_data_url.trim()) ||
    getSavedCustomLogo() ||
    defaultLogoAtlanticUrl;
  const cleanLogo = rawLogo
    ? await convertUploadedImageForPdf(rawLogo, {
        maxWidth: 700,
        maxHeight: 350,
        removeWhiteBackground: false
      })
    : defaultLogoAtlanticUrl;
  const styledLogo = await renderAssetWithSettingsForPdf(cleanLogo, assetsConfig.logo);

  // 2(a) Filigrane 1: Blason au niveau de l'en-tête (exactement le fichier blason original.png)
  const headerBlasonUrl = headerBlasonOriginalUrl || headerBlasonFallbackUrl;

  // 2(b) Filigrane 2: Grand blason en filigrane très clair couvrant le reste de la page 1 (et page 2)
  const customFiligraneRaw =
    (data.filigrane_data_url && data.filigrane_data_url.trim()) || getSavedCustomFiligrane();
  const cleanFiligrane = customFiligraneRaw
    ? await convertUploadedImageForPdf(customFiligraneRaw, {
        maxWidth: 900,
        maxHeight: 1100,
        removeWhiteBackground: false
      })
    : defaultLargeWatermarkUrl;
  const styledFiligrane = await renderAssetWithSettingsForPdf(
    cleanFiligrane,
    assetsConfig.filigrane
  );

  // 4. Signature & Cachet: Directement les fichiers uploadés ou signature.png / cachet.png + Admin settings
  const rawSignature =
    (data.signature_data_url && data.signature_data_url.trim()) ||
    getSavedCustomSignature() ||
    defaultSignatureUrl;
  const cleanSignature = rawSignature
    ? await convertUploadedImageForPdf(rawSignature, {
        maxWidth: 600,
        maxHeight: 350,
        removeWhiteBackground: true
      })
    : defaultSignatureUrl;
  const styledSignature = await renderAssetWithSettingsForPdf(
    cleanSignature,
    assetsConfig.signature
  );

  const rawCachet =
    (data.cachet_data_url && data.cachet_data_url.trim()) ||
    getSavedCustomCachet() ||
    defaultCachetUrl;
  const cleanCachet = rawCachet
    ? await convertUploadedImageForPdf(rawCachet, {
        maxWidth: 700,
        maxHeight: 450,
        removeWhiteBackground: true
      })
    : defaultCachetUrl;
  const styledCachet = await renderAssetWithSettingsForPdf(cleanCachet, assetsConfig.cachet);

  const nomCompletUpper = (data.nom_complet || 'SALIMATA TRAORER').trim().toUpperCase();
  const niValue = (data.ni || 'BC1129970').trim();
  const dateHeaderSlash = formatPromesseDateSlash(
    data.date_etablissement || data.date_emission || data.date_embauche
  );
  const datePriseFonctionLong = formatPromesseDateLongFr(data.date_embauche);
  const salutation =
    String(data.sexe || '').toLowerCase().startsWith('f') ||
    String(data.sexe || '').toLowerCase().includes('madame')
      ? 'Madame'
      : 'Monsieur';

  const salaireHoraireFormatted = String(data.salaire_horaire ?? '22').trim();

  const filigraneInFront = (assetsConfig.filigrane.zIndex ?? 0) > 10;

  const drawFiligranePage1 = () => {
    if (!styledFiligrane.dataUrl) return;
    try {
      const pos = computePdfPlacementMm(
        assetsConfig.filigrane,
        {
          zoneX: 15,
          zoneY: 90,
          zoneW: 180,
          zoneH: 158,
          defaultWMm: 114,
          defaultHMm: 142,
          defaultWPx: 290,
          defaultHPx: 360
        },
        styledFiligrane.boxScaleX,
        styledFiligrane.boxScaleY
      );
      doc.addImage(styledFiligrane.dataUrl, 'PNG', pos.x, pos.y, pos.w, pos.h, undefined, 'FAST');
    } catch {
      // Ignore invalid image format
    }
  };

  const drawFiligranePage2 = () => {
    if (!styledFiligrane.dataUrl) return;
    try {
      const pos = computePdfPlacementMm(
        assetsConfig.filigrane,
        {
          zoneX: 15,
          zoneY: 24,
          zoneW: 180,
          zoneH: 158,
          defaultWMm: 114,
          defaultHMm: 142,
          defaultWPx: 290,
          defaultHPx: 360
        },
        styledFiligrane.boxScaleX,
        styledFiligrane.boxScaleY
      );
      doc.addImage(styledFiligrane.dataUrl, 'PNG', pos.x, pos.y, pos.w, pos.h, undefined, 'FAST');
    } catch {
      // Ignore invalid image format
    }
  };

  // ============================================================================
  // PAGE 1
  // ============================================================================
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 210, 297, 'F');

  // Filigrane (b) en arrière-plan (si z-index <= 10)
  if (!filigraneInFront) {
    drawFiligranePage1();
  }

  // 1. En-tête gauche : Logo avec réglages admin (largeur, hauteur, opacité, teinte, X/Y, alignement, rotation)
  if (styledLogo.dataUrl) {
    try {
      const logoPos = computePdfPlacementMm(
        assetsConfig.logo,
        {
          zoneX: 14,
          zoneY: 6,
          zoneW: 76,
          zoneH: 25,
          defaultWMm: 67,
          defaultHMm: 23,
          defaultWPx: 180,
          defaultHPx: 60
        },
        styledLogo.boxScaleX,
        styledLogo.boxScaleY
      );
      doc.addImage(
        styledLogo.dataUrl,
        'PNG',
        logoPos.x,
        logoPos.y,
        logoPos.w,
        logoPos.h,
        undefined,
        'FAST'
      );
    } catch {
      // Ignore logo render error
    }
  }

  // En-tête droite : EXACTEMENT le fichier logo-canada.png
  if (logoCanadaUrl) {
    doc.addImage(logoCanadaUrl, 'PNG', 139, 7, 56, 19.5, undefined, 'FAST');
  }

  // Filigrane (a) : Blason au niveau de l'en-tête (à droite sous le logo Canada)
  if (headerBlasonUrl) {
    doc.addImage(headerBlasonUrl, 'PNG', 163, 42, 34, 15.5, undefined, 'FAST');
  }

  // Coordonnées gauche (Vert #3A6E48)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(58, 110, 72);
  doc.text('Atlantic Transport ltd.', 12.5, 33);
  doc.text('King George Blvd, Surrey', 12.5, 38);
  doc.text('BC V3T 2W1, Canada', 12.5, 43);
  doc.text('Téléphone : +1 (506) 802-2226', 12.5, 48);
  doc.text('Email : ', 12.5, 53);

  const emailPrefixW = doc.getTextWidth('Email : ');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(27, 108, 168);
  doc.text('atlantictransport.int@ik.me', 12.5 + emailPrefixW, 53);

  // Date d'établissement ("A Surrey, le [DATE]") & NE au centre
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(58, 110, 72);
  doc.text(`A Surrey, le ${dateHeaderSlash}`, 111, 38, { align: 'center' });
  doc.text("Numéro d'entreprise (NE): 799094917", 111, 44, { align: 'center' });

  // Ligne horizontale au-dessus du bandeau
  doc.setDrawColor(155, 155, 155);
  doc.setLineWidth(0.4);
  doc.line(12.5, 59, 197.5, 59);

  // Bandeau bleu marine "PROMESSE D'EMBAUCHE"
  doc.setFillColor(12, 35, 102);
  doc.rect(12.5, 64.5, 185, 15.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(21);
  doc.setTextColor(255, 255, 255);
  doc.text("PROMESSE D'EMBAUCHE", 105, 74.8, { align: 'center' });

  // Ligne horizontale sous le bandeau
  doc.setDrawColor(155, 155, 155);
  doc.setLineWidth(0.4);
  doc.line(12.5, 86.5, 197.5, 86.5);

  // Ligne "NI: [NI]" et "Destinataire: [NOM]"
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(198, 136, 44);
  doc.text('NI: ', 12.5, 96.5);
  const niLabelW = doc.getTextWidth('NI: ');
  doc.setTextColor(0, 0, 0);
  doc.text(niValue, 12.5 + niLabelW, 96.5);

  const destLabel = 'Destinataire: ';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  const destLabelW = doc.getTextWidth(destLabel);
  const destNameW = doc.getTextWidth(nomCompletUpper);
  const totalDestW = destLabelW + destNameW;
  const destStartX = Math.max(115, 197.5 - totalDestW);

  doc.setTextColor(198, 136, 44);
  doc.text(destLabel, destStartX, 96.5);
  doc.setTextColor(0, 0, 0);
  doc.text(nomCompletUpper, destStartX + destLabelW, 96.5);

  // Objet & Texte d'introduction
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(198, 125, 38);
  doc.text('Objet : ', 12.5, 113.5);
  const objetW = doc.getTextWidth('Objet : ');
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text("Lettre d'embauche.", 12.5 + objetW, 113.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.2);
  doc.setTextColor(0, 0, 0);
  doc.text(`${salutation},`, 12.5, 122.5);

  const introPart1 = 'Nous avons le plaisir de vous informer que la société ';
  const introBold = 'Atlantic Transport ltd';
  const introPart2 = ' a décidé de vous embaucher à';
  doc.setFont('helvetica', 'normal');
  doc.text(introPart1, 12.5, 128.5);
  const w1 = doc.getTextWidth(introPart1);
  doc.setFont('helvetica', 'bold');
  doc.text(introBold, 12.5 + w1, 128.5);
  const w2 = doc.getTextWidth(introBold);
  doc.setFont('helvetica', 'normal');
  doc.text(introPart2, 12.5 + w1 + w2, 128.5);
  doc.text("la suite de l'étude favorable de votre candidature.", 12.5, 134.5);

  // Section "Informations sur le poste:" (avec surlignage jaune #FFFF00 identique à l'exemplaire)
  drawSectionHeaderBar(doc, 142.5, 'Informations sur le poste:');

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.35);

  // Row 1: Poste (surligné en jaune)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text('Poste :', 28.5, 157);
  drawHighlightedValue(
    doc,
    data.poste || 'Préparatrice de Commande',
    49.5,
    157,
    10.5,
    'normal'
  );
  doc.line(28.5, 165.8, 188, 165.8);

  // Row 2: Type de contrat (surligné en jaune)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text('Type de contrat :', 28.5, 170.5);
  drawHighlightedValue(
    doc,
    data.type_contrat || 'Contrat à Durée Déterminée (CDI) de 2 ans',
    62.5,
    170.5,
    10,
    'normal'
  );
  doc.line(28.5, 179.2, 188, 179.2);

  // Row 3: Date de prise de fonction (surligné en jaune)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text('Date de prise de fonction :', 28.5, 184);
  drawHighlightedValue(doc, datePriseFonctionLong, 88.5, 184, 10.5, 'normal');
  doc.line(28.5, 192.6, 188, 192.6);

  // Row 4: Lieu de travail (surligné en jaune)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text('Lieu de travail :', 28.5, 197.5);
  drawHighlightedValue(
    doc,
    data.lieu_travail || 'Surrey, Colombie-Britanique, Canada',
    62.5,
    197.5,
    10.5,
    'normal'
  );
  doc.line(28.5, 206.2, 188, 206.2);

  // Row 5: Horaire (surligné en jaune)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text('Horaire :', 28.5, 211);
  drawHighlightedValue(
    doc,
    data.horaire || 'Temps plein – 40 heures par semaine',
    52,
    211,
    10,
    'normal'
  );

  // Section "Rémunération et avantages :"
  drawSectionHeaderBar(doc, 218.5, 'Rémunération et avantages :');

  // Bullet 1: Salaire (surligné en jaune)
  doc.setFillColor(0, 0, 0);
  doc.circle(20, 229.2, 0.75, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text('Salaire : ', 25.5, 230.5);
  const salLabelW = doc.getTextWidth('Salaire : ');
  drawHighlightedValue(
    doc,
    `${salaireHoraireFormatted} CAD par heure`,
    25.5 + salLabelW,
    230.5,
    11,
    'normal'
  );
  doc.line(19, 235.5, 179, 235.5);

  // Bullet 2
  doc.setFillColor(0, 0, 0);
  doc.circle(20, 239.2, 0.75, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text('Congés payés conformément à la législation en vigueur', 25.5, 240.5);
  doc.line(19, 244.5, 179, 244.5);

  // Bullet 3
  doc.circle(20, 248.2, 0.75, 'F');
  doc.text("Assurance collective après période d'essai", 25.5, 249.5);
  doc.line(19, 253.5, 179, 253.5);

  // Bullet 4
  doc.circle(20, 256.8, 0.75, 'F');
  doc.text("Possibilités d'évolution professionnelle", 25.5, 258);

  // Filigrane (b) au premier plan si z-index > 10
  if (filigraneInFront) {
    drawFiligranePage1();
  }

  // Footer Page 1
  drawFooterPage(doc, 1);

  // ============================================================================
  // PAGE 2
  // ============================================================================
  doc.addPage('a4', 'portrait');
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 210, 297, 'F');

  // Grand blason en filigrane sur la Page 2 (en arrière-plan si z-index <= 10)
  if (!filigraneInFront) {
    drawFiligranePage2();
  }

  // Section "Vos principales responsabilités"
  drawSectionHeaderBar(doc, 12.5, 'Vos principales responsabilités');

  const rawLines = (
    Array.isArray(data.responsabilites) && data.responsabilites.length > 0
      ? data.responsabilites
      : DEFAULT_PROMESSE_RESPONSABILITES.split('\n')
  )
    .map((line) => line.replace(/^[\s•\-*]+/, '').trim())
    .filter((line) => line.length > 0);

  let currentY = 24.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);

  for (const item of rawLines) {
    const wrapped = doc.splitTextToSize(item, 162) as string[];
    doc.setFillColor(0, 0, 0);
    doc.circle(26.3, currentY - 1.2, 0.75, 'F');
    for (let i = 0; i < wrapped.length; i++) {
      doc.text(wrapped[i], 31.8, currentY);
      currentY += 5.5;
    }
    currentY += 2.6;
  }

  // NB autorisations légales + formules de politesse
  const nbStartY = Math.max(currentY + 14, 92.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.2);
  doc.setTextColor(0, 0, 0);
  const nbPrefix = 'NB : ';
  doc.text(nbPrefix, 12.5, nbStartY);
  const nbPrefixW = doc.getTextWidth(nbPrefix);

  doc.setFont('helvetica', 'normal');
  doc.text(
    "Cette offre d'emploi est conditionnelle à l'obtention des autorisations légales de travail requises au",
    12.5 + nbPrefixW,
    nbStartY
  );
  doc.text('Canada.', 12.5, nbStartY + 5.8);

  const thankYouY = nbStartY + 14.5;
  doc.text(
    'Nous vous remercions de bien vouloir confirmer votre acceptation de cette offre par signature du',
    12.5,
    thankYouY
  );
  doc.text('document.', 12.5, thankYouY + 5.8);

  const salutationEndY = thankYouY + 14.8;
  doc.text(
    "Veuillez agréer, l'expression de nos salutations distinguées.",
    12.5,
    salutationEndY
  );

  // Bloc Signatures (Gauche : Pour Atlantic Transport Ltd. / ANTOINE FORESTIN + signature.png + cachet.png)
  const sigHeaderY = Math.max(salutationEndY + 19, 141);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(0, 0, 0);
  doc.text('Pour Atlantic Transport Ltd.', 25.5, sigHeaderY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13.2);
  doc.text((data.manager || 'ANTOINE FORESTIN').trim().toUpperCase(), 14.2, sigHeaderY + 10.5);

  const sigLineY = sigHeaderY + 37.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Signature : .........................', 25.5, sigLineY);

  // Utilisation DIRECTE des fichiers cachet.png et signature.png avec les réglages admin
  if (styledCachet.dataUrl) {
    try {
      const cachetPos = computePdfPlacementMm(
        assetsConfig.cachet,
        {
          zoneX: 35,
          zoneY: sigHeaderY + 12,
          zoneW: 68,
          zoneH: 36,
          defaultWMm: 56,
          defaultHMm: 30,
          defaultWPx: 155,
          defaultHPx: 84
        },
        styledCachet.boxScaleX,
        styledCachet.boxScaleY
      );
      doc.addImage(
        styledCachet.dataUrl,
        'PNG',
        cachetPos.x,
        cachetPos.y,
        cachetPos.w,
        cachetPos.h,
        undefined,
        'FAST'
      );
    } catch {
      // Ignore invalid image format
    }
  }
  if (styledSignature.dataUrl) {
    try {
      const sigPos = computePdfPlacementMm(
        assetsConfig.signature,
        {
          zoneX: 25,
          zoneY: sigHeaderY + 12,
          zoneW: 72,
          zoneH: 36,
          defaultWMm: 46,
          defaultHMm: 24,
          defaultWPx: 130,
          defaultHPx: 68
        },
        styledSignature.boxScaleX,
        styledSignature.boxScaleY
      );
      doc.addImage(
        styledSignature.dataUrl,
        'PNG',
        sigPos.x,
        sigPos.y,
        sigPos.w,
        sigPos.h,
        undefined,
        'FAST'
      );
    } catch {
      // Ignore invalid image format
    }
  }

  // Bloc Droite : Pour l'employer / [NOM SALARIE]
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.text("Pour l'employer", 144.5, sigHeaderY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13.2);
  doc.text(nomCompletUpper, 144, sigHeaderY + 10.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Signature : .........................', 150, sigLineY);

  // Mention "Fait en double exemplaire"
  const doubleExY = Math.max(sigLineY + 34.5, 213.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Fait en double exemplaire', 105, doubleExY, { align: 'center' });

  doc.setFillColor(0, 0, 0);
  doc.rect(33.5, doubleExY + 5.5, 143, 1.2, 'F');

  // Grand blason au premier plan sur la Page 2 si z-index > 10
  if (filigraneInFront) {
    drawFiligranePage2();
  }

  // Footer Page 2
  drawFooterPage(doc, 2);

  return doc;
}

export async function generatePromesseEmbauchePdfDataUri(
  data: PromesseEmbaucheData
): Promise<string> {
  const doc = await generatePromesseEmbauchePdfDoc(data);
  return doc.output('datauristring');
}

export async function generatePromesseEmbauchePdfBlobUrl(
  data: PromesseEmbaucheData
): Promise<string> {
  const doc = await generatePromesseEmbauchePdfDoc(data);
  const blob = doc.output('blob');
  return URL.createObjectURL(blob);
}

export async function downloadPromesseEmbauchePdf(
  data: PromesseEmbaucheData
): Promise<void> {
  const doc = await generatePromesseEmbauchePdfDoc(data);
  const cleanName = (data.nom_complet || 'SALARIE')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_');
  doc.save(`PROMESSE_EMBAUCHE_${cleanName}.pdf`);
}
