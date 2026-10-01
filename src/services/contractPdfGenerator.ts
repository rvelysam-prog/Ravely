import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { Employee } from '../types';
import {
  convertUploadedImageForPdf,
  getSavedCustomCachet,
  getSavedCustomLogo,
  getSavedCustomSignature
} from './departmentsAndEmailService';

// Strict A4 dimensions & 20mm margins as required
const PAGE_WIDTH_MM = 210;
const PAGE_HEIGHT_MM = 297;
const MARGIN_LEFT_MM = 20;
const MARGIN_RIGHT_MM = 20;
const MAX_CONTENT_WIDTH_MM = PAGE_WIDTH_MM - MARGIN_LEFT_MM - MARGIN_RIGHT_MM; // 170mm
const RIGHT_LIMIT_MM = PAGE_WIDTH_MM - MARGIN_RIGHT_MM; // 190mm

// Official colors required by the specification
const COLOR_BLUE_KEY: [number, number, number] = [0, 0, 170]; // #0000AA
const COLOR_BLACK: [number, number, number] = [0, 0, 0]; // #000000
const COLOR_BROWN_CLAUSE: [number, number, number] = [139, 69, 19]; // #8B4513
const COLOR_GREEN_HEADER: [number, number, number] = [46, 125, 50]; // #2E7D32

// Non-breaking space helper after dynamic variables
export function withNbsp(value?: string | number): string {
  const cleaned = String(value ?? '').trim();
  return `${cleaned}\u00A0`;
}

// Rule 5: Format salary ALWAYS as "X.XXX CAD" without any parasitic spaces (e.g. "4.600 CAD")
export function formatSalaryContract(
  amount: number | string | undefined,
  devise = 'CAD'
): string {
  const numeric = Math.round(Number(amount) || 0);
  const formattedNumber = String(numeric).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const cleanDevise = (devise || 'CAD').trim().toUpperCase();
  return `${formattedNumber} ${cleanDevise}`;
}

export function formatDateFr(dateStr?: string): string {
  if (!dateStr) {
    const now = new Date();
    return `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr.trim())) {
    return dateStr.trim();
  }
  const matchIso = dateStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (matchIso) {
    return `${matchIso[3]}/${matchIso[2]}/${matchIso[1]}`;
  }
  return dateStr.trim();
}

const MONTHS_FR = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre'
];

export function formatDateLongFr(dateStr?: string): string {
  if (!dateStr) return '24 Août 1984';
  const matchIso = dateStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (matchIso) {
    const day = parseInt(matchIso[3], 10);
    const monthIdx = parseInt(matchIso[2], 10) - 1;
    const year = matchIso[1];
    return `${day} ${MONTHS_FR[monthIdx] || matchIso[2]} ${year}`;
  }
  const matchSlash = dateStr.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (matchSlash) {
    const day = parseInt(matchSlash[1], 10);
    const monthIdx = parseInt(matchSlash[2], 10) - 1;
    const year = matchSlash[3];
    return `${day} ${MONTHS_FR[monthIdx] || matchSlash[2]} ${year}`;
  }
  return dateStr.trim();
}

// Rule 9: Conditional accommodation text for Point 2 ("2. Conditions d'hébergement")
export function buildHebergementPoint2Text(emp: Partial<Employee>): string {
  if (!emp.hebergement_fourni) {
    return 'Non applicable';
  }
  const dureeType = emp.hebergement_duree_type || 'duree_precise';
  const nbMois = Math.max(1, Number(emp.hebergement_nombre_mois) || 3);
  const dureePhrase =
    dureeType === 'toute_duree_contrat'
      ? "pendant toute la durée où le salarié travaille dans l'entreprise"
      : `pendant une durée de ${nbMois}\u00A0mois`;

  const lieuType = emp.hebergement_lieu_type || 'preciser_lieu';
  if (lieuType === 'texte_generique') {
    return `L'employeur prend en charge l'hébergement du salarié ${dureePhrase}. Le logement mis à disposition devra répondre aux normes de salubrité et de sécurité en vigueur.`;
  }

  const adresseLogement = (
    emp.adresse_hebergement || 'King George Blvd, Surrey, Colombie-Britannique Canada'
  ).trim();

  return `L'employeur prend en charge l'hébergement du salarié ${dureePhrase}. Le logement mis à disposition sera situé à ${withNbsp(adresseLogement)}; et devra répondre aux normes de salubrité et de sécurité en vigueur.`;
}

export function getEmployeeStatusUrl(matricule: string): string {
  const origin =
    typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : 'https://atlantictransport.netlify.app';
  return `${origin}/employe.html?id=${encodeURIComponent(matricule)}`;
}

export async function generateEmployeeQrDataUrl(matricule: string): Promise<string> {
  const url = getEmployeeStatusUrl(matricule);
  return QRCode.toDataURL(url, {
    width: 240,
    margin: 0,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  });
}

// Static PNG Asset URLs (Rule 2 & Rule 6: use ONLY the attached files, never regenerate logos)
export const CONTRACT_STATIC_ASSETS = {
  logoAtlantic: '/logo-atlantic.png',
  logoCanada: '/logo-canada.png',
  blasonOriginal: '/blason original.png',
  blasonFallback: '/blason-original.png',
  signature: '/signature.png',
  cachet: '/cachet.png'
};

const assetDataUrlCache: Record<string, string> = {};

export async function loadStaticImageAsPngDataUrl(url: string): Promise<string> {
  if (assetDataUrlCache[url]) {
    return assetDataUrlCache[url];
  }
  if (typeof window === 'undefined') return '';

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width || 300;
        canvas.height = img.naturalHeight || img.height || 150;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve('');
          return;
        }
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        assetDataUrlCache[url] = dataUrl;
        resolve(dataUrl);
      } catch {
        resolve('');
      }
    };
    img.onerror = () => resolve('');
    img.src = encodeURI(url);
  });
}

// Script Title "Contrat de Travail" with double blue underline and circle dot (typographic title)
export function createScriptTitlePngDataUrl(): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 760;
  canvas.height = 140;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.textAlign = 'center';
  ctx.font =
    'italic 72px "Brush Script MT", "Lucida Handwriting", "Edwardian Script ITC", Georgia, serif';
  ctx.fillStyle = '#002060';
  ctx.fillText('Contrat de Travail', 380, 78);

  ctx.strokeStyle = '#002060';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(85, 102);
  ctx.lineTo(665, 102);
  ctx.moveTo(95, 109);
  ctx.lineTo(665, 109);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(85, 105, 9, Math.PI * 0.5, Math.PI * 1.8);
  ctx.stroke();

  ctx.fillStyle = '#0000AA';
  ctx.beginPath();
  ctx.arc(670, 105.5, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#002060';
  ctx.lineWidth = 2;
  ctx.stroke();

  return canvas.toDataURL('image/png');
}

// 4-Pointed Star Bullet Icon for ARTICLES I to IX
export function createArticleStarIconPngDataUrl(): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const cx = 32;
  const cy = 32;

  ctx.fillStyle = '#F59E0B';
  ctx.beginPath();
  ctx.moveTo(cx - 4, 4);
  ctx.lineTo(cx + 3, cy - 7);
  ctx.lineTo(56, cy - 4);
  ctx.lineTo(cx + 3, cy + 3);
  ctx.lineTo(cx - 4, 56);
  ctx.lineTo(cx - 11, cy + 3);
  ctx.lineTo(4, cy - 4);
  ctx.lineTo(cx - 11, cy - 7);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#002060';
  ctx.beginPath();
  ctx.moveTo(cx + 2, 6);
  ctx.lineTo(cx + 9, cy - 5);
  ctx.lineTo(60, cy + 2);
  ctx.lineTo(cx + 9, cy + 9);
  ctx.lineTo(cx + 2, 60);
  ctx.lineTo(cx - 5, cy + 9);
  ctx.lineTo(8, cy + 2);
  ctx.lineTo(cx - 5, cy - 5);
  ctx.closePath();
  ctx.fill();

  return canvas.toDataURL('image/png');
}

// Rule 1 & Rule 3: White background + quasi-invisible "ATLANTICLAND TRANSPORT LTD" watermark
// + bottom-right logo-atlantic.png + fixed black footer band with centered white text
function drawPageBackgroundAndFooter(doc: jsPDF, logoAtlanticDataUrl: string) {
  // White A4 background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, PAGE_WIDTH_MM, PAGE_HEIGHT_MM, 'F');

  // Rule 1: Quasi-invisible watermark "ATLANTICLAND TRANSPORT LTD" repeated in very light grey
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(246, 246, 246); // Quasi invisible light grey on white background

  const watermarkLine =
    'ATLANTICLAND TRANSPORT LTD     ATLANTICLAND TRANSPORT LTD     ATLANTICLAND TRANSPORT LTD     ATLANTICLAND TRANSPORT LTD';
  for (let wy = 8; wy <= 280; wy += 7.5) {
    doc.text(watermarkLine, 6, wy);
  }

  // Bottom-right original logo-atlantic.png above footer bar
  if (logoAtlanticDataUrl) {
    doc.addImage(logoAtlanticDataUrl, 'PNG', 156, 263, 42, 18.5);
  }

  // Rule 3: Fixed black footer bar on every page with centered white text
  doc.setFillColor(0, 0, 0);
  doc.rect(0, 285, PAGE_WIDTH_MM, 12, 'F');

  doc.setFont('times', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(255, 255, 255);
  doc.text('King George Blvd, Surrey, Colombie-Britanique', PAGE_WIDTH_MM / 2, 292.5, {
    align: 'center'
  });
}

// Rich text segment definition for automatic word wrapping within 20mm margins (Rule 4)
interface RichSegment {
  text: string;
  fontStyle?: 'normal' | 'bold' | 'italic' | 'bolditalic';
  fontSize?: number;
  color?: [number, number, number];
}

// Rule 4: Automatic word-wrapping renderer with strict 20mm left & right margins
// Preserves non-breaking spaces (\u00A0 -> space width) and prevents any right-side text clipping
function drawRichParagraph(
  doc: jsPDF,
  segments: RichSegment[],
  startY: number,
  options?: {
    firstLineIndentMm?: number;
    lineHeightMm?: number;
    defaultFontSize?: number;
    defaultFontStyle?: 'normal' | 'bold' | 'italic' | 'bolditalic';
  }
): number {
  const firstLineIndent = options?.firstLineIndentMm ?? 0;
  const lineHeight = options?.lineHeightMm ?? 7.4;
  const defaultFontSize = options?.defaultFontSize ?? 12.5;
  const defaultFontStyle = options?.defaultFontStyle ?? 'bolditalic';

  let cursorX = MARGIN_LEFT_MM + firstLineIndent;
  let cursorY = startY;

  for (const seg of segments) {
    const style = seg.fontStyle || defaultFontStyle;
    const size = seg.fontSize || defaultFontSize;
    const color = seg.color || COLOR_BLACK;

    doc.setFont('times', style);
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);

    // Convert non-breaking spaces to regular spaces for jsPDF standard font rendering while keeping trailing spaces
    const normalized = seg.text.replace(/\u00A0/g, ' ');
    // Split into tokens keeping whitespace tokens
    const tokens = normalized.split(/(\s+)/);

    for (const token of tokens) {
      if (!token) continue;

      const isWhitespace = /^\s+$/.test(token);
      const tokenToMeasure = isWhitespace ? ' ' : token;
      const tokenWidth = doc.getTextWidth(tokenToMeasure);

      if (isWhitespace) {
        // Only advance cursor if not at the very start of a new line
        if (cursorX > MARGIN_LEFT_MM && cursorX + tokenWidth <= RIGHT_LIMIT_MM) {
          cursorX += tokenWidth;
        }
        continue;
      }

      // If the word exceeds the 20mm right margin (190mm), wrap to next line at 20mm left margin
      if (cursorX > MARGIN_LEFT_MM && cursorX + tokenWidth > RIGHT_LIMIT_MM) {
        cursorX = MARGIN_LEFT_MM;
        cursorY += lineHeight;
      }

      // If a single extraordinarily long token is wider than MAX_CONTENT_WIDTH_MM (170mm), split it safely
      if (tokenWidth > MAX_CONTENT_WIDTH_MM) {
        const subLines: string[] = doc.splitTextToSize(token, MAX_CONTENT_WIDTH_MM);
        subLines.forEach((subLine, idx) => {
          if (idx > 0) {
            cursorX = MARGIN_LEFT_MM;
            cursorY += lineHeight;
          }
          doc.text(subLine, cursorX, cursorY);
          cursorX += doc.getTextWidth(subLine);
        });
      } else {
        doc.text(token, cursorX, cursorY);
        cursorX += tokenWidth;
      }
    }
  }

  return cursorY + lineHeight;
}

// Helper: Draw Article Heading with 4-pointed star icon + Bold Underlined "ARTICLE X" + ": TITLE"
function drawArticleHeading(
  doc: jsPDF,
  starIconDataUrl: string,
  romanNum: string,
  titleRight: string,
  y: number
) {
  if (starIconDataUrl) {
    doc.addImage(starIconDataUrl, 'PNG', MARGIN_LEFT_MM, y - 4.6, 5.2, 5.2);
  }
  const artLabel = `ARTICLE ${romanNum}`;
  const textStartX = MARGIN_LEFT_MM + 7;
  doc.setFont('times', 'bold');
  doc.setFontSize(12.8);
  doc.setTextColor(0, 0, 0);
  doc.text(artLabel, textStartX, y);

  const labelW = doc.getTextWidth(artLabel);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.45);
  doc.line(textStartX, y + 1, textStartX + labelW, y + 1);

  doc.setFont('times', 'italic');
  doc.setFontSize(12.8);
  doc.text(` : ${titleRight}`, textStartX + labelW, y);
}

export async function generateEmployeeContractPdfDataUri(emp: Employee): Promise<string> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Load ONLY the user's attached static PNG files (no regenerated logos!)
  const [
    defaultLogoAtlanticDataUrl,
    logoCanadaDataUrl,
    blasonPrimaryDataUrl,
    blasonFallbackDataUrl,
    defaultSignatureDataUrl,
    defaultCachetDataUrl,
    qrDataUrl
  ] = await Promise.all([
    loadStaticImageAsPngDataUrl(CONTRACT_STATIC_ASSETS.logoAtlantic),
    loadStaticImageAsPngDataUrl(CONTRACT_STATIC_ASSETS.logoCanada),
    loadStaticImageAsPngDataUrl(CONTRACT_STATIC_ASSETS.blasonOriginal),
    loadStaticImageAsPngDataUrl(CONTRACT_STATIC_ASSETS.blasonFallback),
    loadStaticImageAsPngDataUrl(CONTRACT_STATIC_ASSETS.signature),
    loadStaticImageAsPngDataUrl(CONTRACT_STATIC_ASSETS.cachet),
    generateEmployeeQrDataUrl(emp.matricule)
  ]);

  const rawLogo = getSavedCustomLogo() || defaultLogoAtlanticDataUrl;
  const logoAtlanticDataUrl = rawLogo
    ? await convertUploadedImageForPdf(rawLogo, {
        maxWidth: 700,
        maxHeight: 350,
        removeWhiteBackground: false
      })
    : defaultLogoAtlanticDataUrl;

  const rawSig = emp.signature_url || getSavedCustomSignature() || defaultSignatureDataUrl;
  const signatureDataUrl = rawSig
    ? await convertUploadedImageForPdf(rawSig, {
        maxWidth: 600,
        maxHeight: 350,
        removeWhiteBackground: true
      })
    : defaultSignatureDataUrl;

  const rawCachet = emp.cachet_url || getSavedCustomCachet() || defaultCachetDataUrl;
  const cachetDataUrl = rawCachet
    ? await convertUploadedImageForPdf(rawCachet, {
        maxWidth: 650,
        maxHeight: 450,
        removeWhiteBackground: true
      })
    : defaultCachetDataUrl;

  const blasonDataUrl = blasonPrimaryDataUrl || blasonFallbackDataUrl;
  const scriptTitleDataUrl = createScriptTitlePngDataUrl();
  const starIconDataUrl = createArticleStarIconPngDataUrl();

  // Dynamic employee variables with non-breaking spaces (Rule 4, 5, 7)
  const isCDD = String(emp.type_contrat).toUpperCase().includes('CDD');
  const civilite = (emp.civilite || 'Monsieur').trim();
  const fullNameUpper = (emp.nom_complet || `${emp.prenom} ${emp.nom}`).trim().toUpperCase();
  const dateNaissanceLong = formatDateLongFr(emp.date_naissance || '1984-08-24');
  const nationalite = (emp.nationalite || 'Canadienne').trim();
  const adresseResidence = (
    emp.adresse || 'King George Blvd, Surrey, BC V3T 2W1, Canada'
  ).trim();
  const posteOccupe = (emp.poste || 'Assistant Commercial').trim();
  const dateEffet = formatDateFr(emp.date_effet || emp.date_embauche);
  const dateFinCdd = formatDateFr(emp.date_fin_cdd || '2027-03-16');
  const periodeEssai = (emp.duree_periode_essai || '3 semaines').trim();
  const lieuTravail = (emp.lieu_travail || 'SURREY, COLOMBIE-BRITANNIQUE').trim().toUpperCase();
  const formattedSalaire = formatSalaryContract(emp.salaire, emp.devise);
  const dateEtablissement = formatDateFr(
    emp.date_etablissement || emp.date_signature || emp.date_effet || emp.date_embauche
  );
  const dateSignature = dateEtablissement;

  // =========================================================================
  // PAGE 1 : En-tête officiel, Titre, QR Code & Entre les soussignés
  // =========================================================================
  drawPageBackgroundAndFooter(doc, logoAtlanticDataUrl);

  // Rule 2: Left header -> logo-atlantic.png + Green address details
  if (logoAtlanticDataUrl) {
    doc.addImage(logoAtlanticDataUrl, 'PNG', MARGIN_LEFT_MM, 7, 56, 25);
  }
  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(COLOR_GREEN_HEADER[0], COLOR_GREEN_HEADER[1], COLOR_GREEN_HEADER[2]);
  doc.text('Atlantic Transport ltd.', MARGIN_LEFT_MM, 36);
  doc.text('King George Blvd, Surrey', MARGIN_LEFT_MM, 41.2);
  doc.text('BC V3T 2W1, Canada', MARGIN_LEFT_MM, 46.4);
  doc.text('Téléphone: +1 (506) 802-2226', MARGIN_LEFT_MM, 51.6);
  doc.text('Email : atlantictransport.int@ik.me', MARGIN_LEFT_MM, 56.8);

  // Center header -> Green Bold "A Surrey, le [DATE]" + "Numéro d'entreprise (NE): 799094917"
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(COLOR_GREEN_HEADER[0], COLOR_GREEN_HEADER[1], COLOR_GREEN_HEADER[2]);
  doc.text(`A Surrey, le ${dateEtablissement}`, 110, 40.8, { align: 'center' });
  doc.text("Numéro d'entreprise (NE): 799094917", 110, 46.4, { align: 'center' });

  // Rule 2: Right header -> logo-canada.png on top + blason original.png below
  if (logoCanadaDataUrl) {
    doc.addImage(logoCanadaDataUrl, 'PNG', 138, 9, 52, 22);
  }
  if (blasonDataUrl) {
    doc.addImage(blasonDataUrl, 'PNG', 150, 38, 40, 20);
  }

  // Horizontal separator line under header
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(MARGIN_LEFT_MM, 60.5, RIGHT_LIMIT_MM, 60.5);

  // Script Title "Contrat de Travail" + (à durée indéterminée / déterminée)
  if (scriptTitleDataUrl) {
    doc.addImage(scriptTitleDataUrl, 'PNG', 60, 66, 90, 20);
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(58, 46, 33);
  doc.text(
    isCDD ? '(à durée déterminée)' : '(à durée indéterminée)',
    PAGE_WIDTH_MM / 2,
    91,
    { align: 'center' }
  );

  // QR Code on the left below header + "Scanner for Status"
  if (qrDataUrl) {
    doc.addImage(qrDataUrl, 'PNG', MARGIN_LEFT_MM, 83, 26, 26);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.8);
    doc.setTextColor(0, 0, 0);
    doc.text('Scanner for Status', MARGIN_LEFT_MM + 13, 113, { align: 'center' });
  }

  // "Entre les soussignés :"
  let y = 125;
  doc.setFont('times', 'italic');
  doc.setFontSize(19);
  doc.setTextColor(0, 0, 0);
  doc.text('Entre les soussignés :', MARGIN_LEFT_MM, y);

  // Company paragraph wrapped cleanly within 20mm margins
  y += 12;
  y = drawRichParagraph(
    doc,
    [
      {
        text: "L'entreprise : ATLANTIC TRANSPORT LTD dont le siège social est situé à King George Blvd, Surrey, BC V3T 2W1, Canada. Immatriculée auprès du Registre de commerce et des Sociétés sous le numéro 799094917 Et représentée par Monsieur: ",
        fontStyle: 'bolditalic'
      }
    ],
    y,
    { lineHeightMm: 7.8, defaultFontSize: 12.5 }
  );

  // Representative name in BLUE #0000AA
  y = drawRichParagraph(
    doc,
    [
      {
        text: withNbsp('ANTOINE FORESTIN'),
        fontStyle: 'normal',
        color: COLOR_BLUE_KEY
      }
    ],
    y + 1,
    { lineHeightMm: 8, defaultFontSize: 12.5 }
  );

  y = drawRichParagraph(
    doc,
    [
      {
        text: 'Agissant en qualité de DIRECTEUR GENERAL',
        fontStyle: 'bolditalic'
      }
    ],
    y + 1,
    { firstLineIndentMm: 8, lineHeightMm: 8, defaultFontSize: 12.5 }
  );

  // "D'une part,"
  y += 4;
  doc.setFont('times', 'italic');
  doc.setFontSize(17);
  doc.setTextColor(0, 0, 0);
  doc.text("D'une part,", MARGIN_LEFT_MM + 4, y);

  // "Et"
  y += 10;
  doc.setFont('times', 'bolditalic');
  doc.setFontSize(12.5);
  doc.text('Et', MARGIN_LEFT_MM + 8, y);

  // Employee identification paragraph with non-breaking spaces after every dynamic variable & 20mm margins
  y += 9;
  y = drawRichParagraph(
    doc,
    [
      { text: `${civilite}:\u00A0`, fontStyle: 'bolditalic', color: COLOR_BLACK },
      { text: withNbsp(fullNameUpper), fontStyle: 'normal', color: COLOR_BLUE_KEY },
      {
        text: `demeurant\u00A0: ${withNbsp(adresseResidence)}né(e) le ${withNbsp(dateNaissanceLong)}de nationalité\u00A0: ${withNbsp(nationalite)}, qui déclare expressément être libre de tout engagement, ne pas être soumis(e) à une clause de non-concurrence et être en mesure de conclure le présent contrat.`,
        fontStyle: 'bolditalic',
        color: COLOR_BLACK
      }
    ],
    y,
    { firstLineIndentMm: 2, lineHeightMm: 7.8, defaultFontSize: 12.5 }
  );

  // "D'autre part,"
  y += 4;
  doc.setFont('times', 'italic');
  doc.setFontSize(17);
  doc.setTextColor(0, 0, 0);
  doc.text("D'autre part,", MARGIN_LEFT_MM + 4, y);

  // "IL A ETE CONVENU CE QUI SUIT :"
  y += 11;
  doc.setFont('times', 'bolditalic');
  doc.setFontSize(12.5);
  doc.text('IL A ETE CONVENU CE QUI SUIT :', MARGIN_LEFT_MM + 8, y);

  // =========================================================================
  // PAGE 2 : ARTICLES I à VI (Marges 20mm + variables bleues #0000AA)
  // =========================================================================
  doc.addPage();
  drawPageBackgroundAndFooter(doc, logoAtlanticDataUrl);

  y = 30;

  // ARTICLE I : MOTIF (1)
  drawArticleHeading(doc, starIconDataUrl, 'I', 'MOTIF (1)', y);
  y += 9;
  y = drawRichParagraph(
    doc,
    [
      { text: `${withNbsp(civilite)}`, fontStyle: 'bolditalic' },
      { text: withNbsp(fullNameUpper), fontStyle: 'normal', color: COLOR_BLUE_KEY },
      {
        text: "est engagé(e) par l'entreprise en vue de servir la clientèle.",
        fontStyle: 'bolditalic'
      }
    ],
    y,
    { firstLineIndentMm: 4, lineHeightMm: 7.6, defaultFontSize: 12.5 }
  );

  // ARTICLE II : EMPLOI OCCUPE
  y += 8;
  drawArticleHeading(doc, starIconDataUrl, 'II', 'EMPLOI OCCUPE', y);
  y += 9;
  y = drawRichParagraph(
    doc,
    [
      { text: `${withNbsp(civilite)}`, fontStyle: 'bolditalic' },
      { text: withNbsp(fullNameUpper), fontStyle: 'normal', color: COLOR_BLUE_KEY },
      {
        text: `est employé(e) en qualité de ${withNbsp(posteOccupe)}au sein de l'Entreprise Atlantic Transport.`,
        fontStyle: 'bolditalic'
      }
    ],
    y,
    { firstLineIndentMm: 4, lineHeightMm: 7.6, defaultFontSize: 12.5 }
  );

  // ARTICLE III : DUREE (Logique CDI / CDD inchangée)
  y += 8;
  drawArticleHeading(doc, starIconDataUrl, 'III', 'DUREE', y);
  y += 9;
  if (isCDD) {
    y = drawRichParagraph(
      doc,
      [
        {
          text: 'Le présent contrat est conclu pour une durée déterminée du\u00A0',
          fontStyle: 'bolditalic'
        },
        {
          text: withNbsp(`${dateEffet} au ${dateFinCdd}.`),
          fontStyle: 'normal',
          color: COLOR_BLUE_KEY
        },
        {
          text: "Il pourra y être mis fin par l'une ou l'autre des parties, sous réserve de respecter les règles de procédure légales.",
          fontStyle: 'bolditalic'
        }
      ],
      y,
      { firstLineIndentMm: 4, lineHeightMm: 7.6, defaultFontSize: 12.5 }
    );
  } else {
    y = drawRichParagraph(
      doc,
      [
        {
          text: 'Le présent contrat est conclu pour une durée indéterminée et prend effet le\u00A0',
          fontStyle: 'bolditalic'
        },
        {
          text: withNbsp(`${dateEffet}.`),
          fontStyle: 'normal',
          color: COLOR_BLUE_KEY
        },
        {
          text: "Il pourra y être mis fin par l'une ou l'autre des parties, sous réserve de respecter les règles de procédure légales.",
          fontStyle: 'bolditalic'
        }
      ],
      y,
      { firstLineIndentMm: 4, lineHeightMm: 7.6, defaultFontSize: 12.5 }
    );
  }

  // ARTICLE IV : PERIODE D'ESSAI
  y += 8;
  drawArticleHeading(doc, starIconDataUrl, 'IV', "PERIODE D'ESSAI", y);
  y += 9;
  y = drawRichParagraph(
    doc,
    [
      {
        text: "Le contrat ne deviendra définitif qu'à l'issue d'une formation interne d'essai de\u00A0",
        fontStyle: 'bolditalic'
      },
      {
        text: withNbsp(`${periodeEssai},`),
        fontStyle: 'italic',
        color: COLOR_BLUE_KEY
      },
      {
        text: 'au cours de laquelle chacune des parties pourra rompre le contrat sans indemnité.',
        fontStyle: 'bolditalic'
      }
    ],
    y,
    { firstLineIndentMm: 4, lineHeightMm: 7.6, defaultFontSize: 12.5 }
  );

  // ARTICLE V : LIEU DE TRAVAIL
  y += 8;
  drawArticleHeading(doc, starIconDataUrl, 'V', 'LIEU DE TRAVAIL', y);
  y += 9;
  y = drawRichParagraph(
    doc,
    [
      {
        text: `Le lieu de travail est situé à ${withNbsp(lieuTravail)}`,
        fontStyle: 'bolditalic'
      }
    ],
    y,
    { firstLineIndentMm: 4, lineHeightMm: 7.6, defaultFontSize: 12.5 }
  );

  // ARTICLE VI : HORAIRE DE TRAVAIL
  y += 8;
  drawArticleHeading(doc, starIconDataUrl, 'VI', 'HORAIRE DE TRAVAIL', y);
  y += 9;
  doc.setFont('times', 'bolditalic');
  doc.setFontSize(12.5);
  doc.setTextColor(0, 0, 0);
  doc.text('Les horaires seront les suivants :', MARGIN_LEFT_MM + 4, y);

  const scheduleLines = [
    'Le lundi de 08H à 17H',
    'Le mardi de 08H à 17H',
    'Le mercredi de 08H à 15 H',
    'Le jeudi de 08H à 17 H',
    'Le vendredi de 08 H à 14H'
  ];

  scheduleLines.forEach((line) => {
    y += 8;
    const clockX = MARGIN_LEFT_MM + 28;
    doc.setDrawColor(60, 60, 60);
    doc.setLineWidth(0.35);
    doc.circle(clockX, y - 1.5, 1.8);
    doc.line(clockX, y - 1.5, clockX, y - 2.6);
    doc.line(clockX, y - 1.5, clockX + 1, y - 1.5);

    doc.setFont('times', 'bolditalic');
    doc.setFontSize(12.5);
    doc.setTextColor(0, 0, 0);
    doc.text(line, clockX + 5, y);
  });

  // =========================================================================
  // PAGE 3 : ARTICLES VII à IX + Clause des obligations de l'employeur (1 & 2)
  // =========================================================================
  doc.addPage();
  drawPageBackgroundAndFooter(doc, logoAtlanticDataUrl);

  y = 32;

  // ARTICLE VII : REMUNERATION (Rule 5: "X.XXX CAD", Rule 7: #0000AA)
  drawArticleHeading(doc, starIconDataUrl, 'VII', 'REMUNERATION', y);
  y += 9;
  y = drawRichParagraph(
    doc,
    [
      {
        text: `En contrepartie de ses fonctions, ${withNbsp(civilite)}`,
        fontStyle: 'bolditalic'
      },
      {
        text: withNbsp(fullNameUpper),
        fontStyle: 'normal',
        color: COLOR_BLUE_KEY
      },
      {
        text: 'percevra une rémunération brute mensuelle de\u00A0',
        fontStyle: 'bolditalic'
      },
      {
        text: withNbsp(formattedSalaire),
        fontStyle: 'bolditalic',
        color: COLOR_BLUE_KEY
      },
      {
        text: 'pour un horaire hebdomadaire moyen de\u00A0',
        fontStyle: 'bolditalic'
      },
      {
        text: withNbsp('40 heures.'),
        fontStyle: 'bolditalic',
        color: COLOR_BLUE_KEY
      },
      {
        text: 'Elle lui sera versée à la fin de chaque mois.',
        fontStyle: 'bolditalic'
      }
    ],
    y,
    { firstLineIndentMm: 4, lineHeightMm: 7.6, defaultFontSize: 12.5 }
  );

  // ARTICLE VIII : RUPTURE POUR FAUTE GRAVE OU FORCE MAJEURE
  y += 9;
  drawArticleHeading(
    doc,
    starIconDataUrl,
    'VIII',
    'RUPTURE POUR FAUTE GRAVE OU FORCE MAJEURE',
    y
  );
  y += 9;
  y = drawRichParagraph(
    doc,
    [
      {
        text: "Chacune des parties se réserve mutuellement le droit de mettre fin au contrat immédiatement en cas de faute grave de l'autre parties ou cas de force majeure.",
        fontStyle: 'bolditalic'
      }
    ],
    y,
    { firstLineIndentMm: 4, lineHeightMm: 7.6, defaultFontSize: 12.5 }
  );

  // ARTICLE IX : INDEMNITE DE FIN DE CONTRAT
  y += 9;
  drawArticleHeading(doc, starIconDataUrl, 'IX', 'INDEMNITE DE FIN DE CONTRAT', y);
  y += 9;
  y = drawRichParagraph(
    doc,
    [
      {
        text: `A la cessation de ses fonctions dans l'entreprise, ${withNbsp(civilite)}`,
        fontStyle: 'bolditalic'
      },
      {
        text: withNbsp(fullNameUpper),
        fontStyle: 'normal',
        color: COLOR_BLUE_KEY
      },
      {
        text: 'percevra une indemnité de fin de contrat aux conditions et taux fixés par le code du travail.',
        fontStyle: 'bolditalic'
      }
    ],
    y,
    { firstLineIndentMm: 4, lineHeightMm: 7.6, defaultFontSize: 12.5 }
  );

  // Rule 7: "Clause des obligations de l'employeur" in brown #8B4513 underlined
  y += 14;
  const clauseHeading = "Clause des obligations de l'employeur";
  doc.setFont('times', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(
    COLOR_BROWN_CLAUSE[0],
    COLOR_BROWN_CLAUSE[1],
    COLOR_BROWN_CLAUSE[2]
  );
  doc.text(clauseHeading, PAGE_WIDTH_MM / 2, y, { align: 'center' });
  const cw = doc.getTextWidth(clauseHeading);
  doc.setDrawColor(
    COLOR_BROWN_CLAUSE[0],
    COLOR_BROWN_CLAUSE[1],
    COLOR_BROWN_CLAUSE[2]
  );
  doc.setLineWidth(0.5);
  doc.line((PAGE_WIDTH_MM - cw) / 2, y + 1.2, (PAGE_WIDTH_MM + cw) / 2, y + 1.2);

  // Intro paragraph of Clause
  y += 14;
  y = drawRichParagraph(
    doc,
    [
      {
        text: "L'employeur s'engage à fournir au salarié les moyens nécessaires à l'exécution de ses fonctions dans les conditions définies par le présent contrat. À ce titre, l'employeur assume les obligations suivantes :",
        fontStyle: 'bolditalic'
      }
    ],
    y,
    { firstLineIndentMm: 4, lineHeightMm: 7.4, defaultFontSize: 12 }
  );

  // Rule 8: Differentiate obligation titles (bold black size 12) from paragraphs (normal italic size 10)
  // 1. Mise à disposition du poste de travail
  y += 7;
  doc.setFont('times', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text('1. Mise à disposition du poste de travail', MARGIN_LEFT_MM + 4, y);

  y += 7;
  y = drawRichParagraph(
    doc,
    [
      {
        text: "L'employeur garantit au salarié l'accès aux outils, équipements et ressources nécessaires à l'exercice de ses fonctions.",
        fontStyle: 'italic',
        fontSize: 10
      }
    ],
    y,
    { firstLineIndentMm: 6, lineHeightMm: 6.2, defaultFontSize: 10, defaultFontStyle: 'italic' }
  );

  // 2. Conditions d'hébergement (Title at bottom of Page 3, just like original BOCOUM)
  y += 9;
  doc.setFont('times', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text("2. Conditions d'hébergement", MARGIN_LEFT_MM + 4, y);

  // =========================================================================
  // PAGE 4 : Point 2 body + Points 3, 4, 5 + Date, Signature & Cachet
  // =========================================================================
  doc.addPage();
  drawPageBackgroundAndFooter(doc, logoAtlanticDataUrl);

  y = 30;

  // Rule 8 & Rule 9: Explanatory paragraph for Point 2 (in normal italic size 10, conditional on hebergement_fourni)
  const point2Text = buildHebergementPoint2Text(emp);
  y = drawRichParagraph(
    doc,
    [
      {
        text: point2Text,
        fontStyle: 'italic',
        fontSize: 10
      }
    ],
    y,
    { firstLineIndentMm: 6, lineHeightMm: 6.4, defaultFontSize: 10, defaultFontStyle: 'italic' }
  );

  // 3. Protection de la santé et de la sécurité (Title bold black size 12, body normal italic size 10)
  y += 8;
  doc.setFont('times', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text('3. Protection de la santé et de la sécurité', MARGIN_LEFT_MM + 4, y);

  y += 7;
  y = drawRichParagraph(
    doc,
    [
      {
        text: "Conformément à l'article L4121-1 du Code du travail, l'employeur met en œuvre les mesures nécessaires pour assurer la sécurité et protéger la santé physique et mentale du salarié sur le lieu de travail.",
        fontStyle: 'italic',
        fontSize: 10
      }
    ],
    y,
    { firstLineIndentMm: 6, lineHeightMm: 6.4, defaultFontSize: 10, defaultFontStyle: 'italic' }
  );

  // 4. Respect des droits du salarié (Title bold black size 12, body normal italic size 10)
  y += 8;
  doc.setFont('times', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text('4. Respect des droits du salarié', MARGIN_LEFT_MM + 4, y);

  y += 7;
  y = drawRichParagraph(
    doc,
    [
      {
        text: "L'employeur s'engage à respecter les droits fondamentaux du salarié, notamment en matière de temps de travail, de repos, de non-discrimination et de dignité au travail.",
        fontStyle: 'italic',
        fontSize: 10
      }
    ],
    y,
    { firstLineIndentMm: 6, lineHeightMm: 6.4, defaultFontSize: 10, defaultFontStyle: 'italic' }
  );

  // 5. Congés payés (Title bold black size 12, 3 paragraphs normal italic size 10)
  y += 8;
  doc.setFont('times', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text('5. Congés payés', MARGIN_LEFT_MM + 4, y);

  y += 7;
  y = drawRichParagraph(
    doc,
    [
      {
        text: 'Le salarié bénéficie de congés payés conformément aux dispositions légales en vigueur.',
        fontStyle: 'italic',
        fontSize: 10
      }
    ],
    y,
    { firstLineIndentMm: 6, lineHeightMm: 6.4, defaultFontSize: 10, defaultFontStyle: 'italic' }
  );

  y += 2;
  y = drawRichParagraph(
    doc,
    [
      {
        text: "Les dates de congés sont fixées en accord avec l'employeur, dans le respect des nécessités de service et du calendrier de l'entreprise.",
        fontStyle: 'italic',
        fontSize: 10
      }
    ],
    y,
    { firstLineIndentMm: 6, lineHeightMm: 6.4, defaultFontSize: 10, defaultFontStyle: 'italic' }
  );

  y += 2;
  y = drawRichParagraph(
    doc,
    [
      {
        text: 'Durant ses congés, le salarié percevra une indemnité équivalente à sa rémunération habituelle.',
        fontStyle: 'italic',
        fontSize: 10
      }
    ],
    y,
    { firstLineIndentMm: 6, lineHeightMm: 6.4, defaultFontSize: 10, defaultFontStyle: 'italic' }
  );

  // =========================================================================
  // Rule 6: Page signature — "Canada, Le [DATE_JOUR]" on the right ABOVE,
  // then signature.png and cachet.png offset below on the bottom-right without masking the date
  // =========================================================================
  const faitY = Math.max(y + 14, 186);
  const faitStr = 'Fait en double exemplaire,';
  doc.setFont('times', 'bolditalic');
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(faitStr, PAGE_WIDTH_MM / 2, faitY, { align: 'center' });
  const faitW = doc.getTextWidth(faitStr);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.45);
  doc.line(
    (PAGE_WIDTH_MM - faitW) / 2,
    faitY + 1.2,
    (PAGE_WIDTH_MM + faitW) / 2,
    faitY + 1.2
  );

  // "Canada, Le [DATE_JOUR]" on the right ABOVE signature & stamp
  const dateY = faitY + 11;
  doc.setFont('times', 'normal');
  doc.setFontSize(11.5);
  doc.setTextColor(0, 0, 0);
  doc.text(`Canada, Le ${withNbsp(dateSignature).trim()}`, RIGHT_LIMIT_MM, dateY, {
    align: 'right'
  });

  // Left: "Le Salarié" underlined
  const sigHeaderY = dateY + 14;
  doc.setFont('times', 'bold');
  doc.setFontSize(13.5);
  doc.setTextColor(0, 0, 0);
  doc.text('Le Salarié', MARGIN_LEFT_MM, sigHeaderY);
  const salW = doc.getTextWidth('Le Salarié');
  doc.line(MARGIN_LEFT_MM, sigHeaderY + 1.2, MARGIN_LEFT_MM + salW, sigHeaderY + 1.2);

  // Right: "L'employeur" underlined + "Directeur"
  const empTitleX = 142;
  doc.setFont('times', 'bold');
  doc.setFontSize(13.5);
  doc.text("L'employeur", empTitleX, sigHeaderY);
  const empW = doc.getTextWidth("L'employeur");
  doc.line(empTitleX, sigHeaderY + 1.2, empTitleX + empW, sigHeaderY + 1.2);

  doc.setFont('times', 'bold');
  doc.setFontSize(9.5);
  doc.text('Directeur', empTitleX + 14, sigHeaderY + 5);

  // Place cachet.png and signature.png shifted below dateY (starting at dateY + 3mm) so the date is NEVER masked
  if (cachetDataUrl) {
    doc.addImage(cachetDataUrl, 'PNG', 146, dateY + 3, 42, 42);
  }
  if (signatureDataUrl) {
    doc.addImage(signatureDataUrl, 'PNG', 124, dateY + 7, 50, 36);
  }

  return doc.output('datauristring');
}

export async function downloadEmployeeContractPdf(emp: Employee): Promise<string> {
  const dataUri = await generateEmployeeContractPdfDataUri(emp);
  const link = document.createElement('a');
  link.href = dataUri;
  link.download = `Contrat_Travail_${emp.matricule}_${emp.nom.replace(/\s+/g, '_')}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return dataUri;
}
