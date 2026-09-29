import { jsPDF } from 'jspdf';
import { CONTRACT_STATIC_ASSETS, loadStaticImageAsPngDataUrl } from './contractPdfGenerator';

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
  date_fin?: string;
  salaire_horaire: number | string;
  primes?: string;
  mode_paiement?: string;
  lieu_travail: string;
  horaire: string;
  ni: string;
  responsabilites: string[];
  signature_data_url?: string;
  cachet_data_url?: string;
  date_emission?: string;
}

export const DEFAULT_PROMESSE_RESPONSABILITES = [
  'Préparer les commandes en rassemblant les articles demandés selon les bons de commande.',
  "Vérifier les produits en contrôlant les références, les quantités et l'état des marchandises.",
  'Emballer les marchandises dans des cartons ou des emballages adaptés au transport.',
  "Étiqueter les colis et apposer les étiquettes d'expédition nécessaires.",
  "Organiser les commandes préparées dans les zones prévues pour l'expédition et la livraison.",
  'Participer à la gestion des stocks en signalant les produits manquants, les erreurs de préparation et les marchandises endommagées.'
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

let cachedFadedBlasonWatermark = '';

async function getFadedBlasonWatermarkDataUrl(): Promise<string> {
  if (cachedFadedBlasonWatermark) return cachedFadedBlasonWatermark;
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
        ctx.globalAlpha = 0.09;
        ctx.filter = 'grayscale(100%)';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const fadedUrl = canvas.toDataURL('image/png');
        cachedFadedBlasonWatermark = fadedUrl;
        resolve(fadedUrl);
      } catch {
        resolve('');
      }
    };
    img.onerror = () => resolve('');
    img.src = rawBlason;
  });
}

let cachedRightHeaderCrest = '';

function getRightHeaderCrestDataUrl(): string {
  if (cachedRightHeaderCrest) return cachedRightHeaderCrest;
  if (typeof document === 'undefined') return '';

  const canvas = document.createElement('canvas');
  canvas.width = 340;
  canvas.height = 150;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#8C8C8C';
  ctx.fillStyle = '#9E9E9E';
  ctx.lineWidth = 3;

  // Left horizontal bars
  ctx.fillRect(18, 62, 95, 7);
  ctx.fillRect(8, 76, 105, 7);
  ctx.fillRect(30, 90, 83, 7);

  // Right horizontal bars
  ctx.fillRect(227, 62, 95, 7);
  ctx.fillRect(227, 76, 105, 7);
  ctx.fillRect(227, 90, 83, 7);

  // Central shield
  ctx.beginPath();
  ctx.moveTo(132, 42);
  ctx.lineTo(208, 42);
  ctx.lineTo(208, 86);
  ctx.quadraticCurveTo(208, 122, 170, 138);
  ctx.quadraticCurveTo(132, 122, 132, 86);
  ctx.closePath();
  ctx.fillStyle = '#B8B8B8';
  ctx.fill();
  ctx.strokeStyle = '#7A7A7A';
  ctx.lineWidth = 3.5;
  ctx.stroke();

  // Inner shield details
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(140, 74);
  ctx.quadraticCurveTo(170, 65, 200, 74);
  ctx.moveTo(142, 88);
  ctx.quadraticCurveTo(170, 79, 198, 88);
  ctx.stroke();

  // Top ship silhouette above shield
  ctx.fillStyle = '#8A8A8A';
  ctx.beginPath();
  ctx.moveTo(144, 34);
  ctx.lineTo(196, 34);
  ctx.lineTo(188, 22);
  ctx.lineTo(152, 22);
  ctx.closePath();
  ctx.fill();

  cachedRightHeaderCrest = canvas.toDataURL('image/png');
  return cachedRightHeaderCrest;
}

export async function createRectangularStampPngDataUrl(): Promise<string> {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 760;
  canvas.height = 360;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(380, 180);
  ctx.rotate((-7.5 * Math.PI) / 180);
  ctx.translate(-380, -180);

  const stampColor = '#1E5E7A';
  ctx.strokeStyle = stampColor;
  ctx.fillStyle = stampColor;

  // Outer rounded rect
  ctx.lineWidth = 5;
  ctx.strokeRect(36, 40, 688, 280);
  // Inner rounded rect
  ctx.lineWidth = 2.5;
  ctx.strokeRect(46, 50, 668, 260);

  // Left Maritime Ship Emblem inside stamp
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(85, 155);
  ctx.lineTo(205, 138);
  ctx.lineTo(192, 195);
  ctx.lineTo(95, 195);
  ctx.closePath();
  ctx.fill();

  // Ship cabin
  ctx.fillRect(120, 112, 52, 30);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(145, 90);
  ctx.lineTo(145, 115);
  ctx.moveTo(175, 100);
  ctx.lineTo(175, 140);
  ctx.stroke();

  ctx.font = 'bold 24px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('AtlanticLand', 148, 228);
  ctx.font = 'bold 13px Arial, sans-serif';
  ctx.fillText('T R A N S T E R A', 148, 246);
  ctx.restore();

  // Right text columns
  ctx.textAlign = 'center';
  ctx.font = 'bold 31px Georgia, "Times New Roman", serif';
  ctx.fillText('ATLANTIC TRANSPORTPORT', 465, 100);

  ctx.font = '26px Georgia, "Times New Roman", serif';
  ctx.fillText('Transport & Logistique', 465, 138);
  ctx.fillText('Canada', 465, 172);
  ctx.fillText('atlantictransport.int@ik.me', 465, 208);
  ctx.fillText("Numéro d'entreprise : 799094917", 465, 244);
  ctx.fillText('Année de création : 2005', 465, 280);

  ctx.restore();
  return canvas.toDataURL('image/png');
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
  // Light grey background bar
  doc.setFillColor(244, 244, 244);
  doc.rect(15, y, 182, 7.5, 'F');

  // Small hollow circle bullet in ochre
  doc.setDrawColor(198, 125, 38);
  doc.setLineWidth(0.35);
  doc.circle(20.2, y + 4.1, 1.05, 'S');

  // Section title in bold ochre
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(198, 125, 38);
  doc.text(title, 25.5, y + 5.3);
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

  const [logoAtlanticUrl, logoCanadaUrl, fadedBlasonUrl, defaultSignatureUrl, defaultCachetUrl] =
    await Promise.all([
      loadStaticImageAsPngDataUrl(CONTRACT_STATIC_ASSETS.logoAtlantic),
      loadStaticImageAsPngDataUrl(CONTRACT_STATIC_ASSETS.logoCanada),
      getFadedBlasonWatermarkDataUrl(),
      loadStaticImageAsPngDataUrl(CONTRACT_STATIC_ASSETS.signature),
      loadStaticImageAsPngDataUrl(CONTRACT_STATIC_ASSETS.cachet)
    ]);

  const rightHeaderCrestUrl = getRightHeaderCrestDataUrl();

  const signatureToUse =
    data.signature_data_url && data.signature_data_url.trim().length > 0
      ? data.signature_data_url
      : defaultSignatureUrl;

  const cachetToUse =
    data.cachet_data_url && data.cachet_data_url.trim().length > 0
      ? data.cachet_data_url
      : defaultCachetUrl;

  const nomCompletUpper = (data.nom_complet || 'SALIMATA TRAORER').trim().toUpperCase();
  const niValue = (data.ni || 'BC1129970').trim();
  const dateHeaderSlash = formatPromesseDateSlash(data.date_emission || data.date_embauche);
  const datePriseFonctionLong = formatPromesseDateLongFr(data.date_embauche);
  const salutation =
    String(data.sexe || '').toLowerCase().startsWith('f') ||
    String(data.sexe || '').toLowerCase().includes('madame')
      ? 'Madame'
      : 'Monsieur';

  const salaireHoraireFormatted = String(data.salaire_horaire ?? '22').trim();

  // ============================================================================
  // PAGE 1
  // ============================================================================
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 210, 297, 'F');

  // 1. Filigrane Blason Canada (center of Page 1)
  if (fadedBlasonUrl) {
    doc.addImage(fadedBlasonUrl, 'PNG', 52, 96, 106, 132, undefined, 'FAST');
  }

  // 2. Top-Left Header: Logo Atlantic Transport + coordonnées Surrey BC
  if (logoAtlanticUrl) {
    doc.addImage(logoAtlanticUrl, 'PNG', 14, 6, 67, 23, undefined, 'FAST');
  }

  // Top-Right Header: Government of Canada + grand Canada
  if (logoCanadaUrl) {
    doc.addImage(logoCanadaUrl, 'PNG', 139, 7, 56, 19.5, undefined, 'FAST');
  }

  // Small grey coat of arms below Canada logo on right
  if (rightHeaderCrestUrl) {
    doc.addImage(rightHeaderCrestUrl, 'PNG', 165, 43.5, 31, 13.5, undefined, 'FAST');
  }

  // Left Company Info (Green #3A6E48)
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

  // Center Date & NE (Bold Green #3A6E48)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(58, 110, 72);
  doc.text(`A Surrey, le ${dateHeaderSlash}`, 111, 38, { align: 'center' });
  doc.text("Numéro d'entreprise (NE): 799094917", 111, 44, { align: 'center' });

  // Horizontal line above banner
  doc.setDrawColor(155, 155, 155);
  doc.setLineWidth(0.4);
  doc.line(12.5, 59, 197.5, 59);

  // 3. Navy Blue Banner "PROMESSE D'EMBAUCHE"
  doc.setFillColor(12, 35, 102);
  doc.rect(12.5, 64.5, 185, 15.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(21);
  doc.setTextColor(255, 255, 255);
  doc.text("PROMESSE D'EMBAUCHE", 105, 74.8, { align: 'center' });

  // Horizontal line below banner
  doc.setDrawColor(155, 155, 155);
  doc.setLineWidth(0.4);
  doc.line(12.5, 86.5, 197.5, 86.5);

  // 4. Row "NI: [NI]" and "Destinataire: [NOM]"
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

  // 5. Objet & Texte d'introduction
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

  // Intro line 1 with bold "Atlantic Transport ltd"
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

  // 6. Section "Informations sur le poste:"
  drawSectionHeaderBar(doc, 142.5, 'Informations sur le poste:');

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.35);

  // Row 1: Poste
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text('Poste :', 28.5, 157);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.text(data.poste || 'Préparatrice de Commande', 49.5, 157);
  doc.line(28.5, 165.8, 188, 165.8);

  // Row 2: Type de contrat
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Type de contrat :', 28.5, 170.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(
    data.type_contrat || 'Contrat à Durée Déterminée (CDI) de 2 ans',
    62.5,
    170.5
  );
  doc.line(28.5, 179.2, 188, 179.2);

  // Row 3: Date de prise de fonction
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Date de prise de fonction :', 28.5, 184);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.text(datePriseFonctionLong, 88.5, 184);
  doc.line(28.5, 192.6, 188, 192.6);

  // Row 4: Lieu de travail
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Lieu de travail :', 28.5, 197.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.text(data.lieu_travail || 'Surrey, Colombie-Britanique, Canada', 62.5, 197.5);
  doc.line(28.5, 206.2, 188, 206.2);

  // Row 5: Horaire
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Horaire :', 28.5, 211);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(data.horaire || 'Temps plein – 40 heures par semaine', 52, 211);

  // 7. Section "Rémunération et avantages :"
  drawSectionHeaderBar(doc, 218.5, 'Rémunération et avantages :');

  // Bullet 1: Salaire
  doc.setFillColor(0, 0, 0);
  doc.circle(20, 229.2, 0.75, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text('Salaire : ', 25.5, 230.5);
  const salLabelW = doc.getTextWidth('Salaire : ');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`${salaireHoraireFormatted} CAD par heure`, 25.5 + salLabelW, 230.5);
  doc.line(19, 235.5, 179, 235.5);

  // Bullet 2
  doc.circle(20, 239.2, 0.75, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Congés payés conformément à la législation en vigueur', 25.5, 240.5);
  doc.line(19, 244.5, 179, 244.5);

  // Bullet 3
  doc.circle(20, 248.2, 0.75, 'F');
  doc.text("Assurance collective après période d'essai", 25.5, 249.5);
  doc.line(19, 253.5, 179, 253.5);

  // Bullet 4
  doc.circle(20, 256.8, 0.75, 'F');
  doc.text("Possibilités d'évolution professionnelle", 25.5, 258);

  // Footer Page 1
  drawFooterPage(doc, 1);

  // ============================================================================
  // PAGE 2
  // ============================================================================
  doc.addPage('a4', 'portrait');
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 210, 297, 'F');

  // 1. Filigrane Blason Canada on Page 2
  if (fadedBlasonUrl) {
    doc.addImage(fadedBlasonUrl, 'PNG', 52, 32, 106, 132, undefined, 'FAST');
  }

  // 2. Section "Vos principales responsabilités"
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

  // 3. NB autorisations légales + formules de politesse
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

  // 4. Signatures Block (Left: Employer + signature.png + cachet.png / Right: Employee)
  const sigHeaderY = Math.max(salutationEndY + 19, 141);

  // Left block
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

  // Cachet & Signature images provided by Admin on the left block
  if (cachetToUse) {
    try {
      doc.addImage(cachetToUse, 'PNG', 36, sigHeaderY + 16, 56, 30, undefined, 'FAST');
    } catch {
      // Ignore invalid image format
    }
  }
  if (signatureToUse) {
    try {
      doc.addImage(signatureToUse, 'PNG', 38, sigHeaderY + 19, 44, 22, undefined, 'FAST');
    } catch {
      // Ignore invalid image format
    }
  }

  // Right block
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.text("Pour l'employer", 144.5, sigHeaderY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13.2);
  doc.text(nomCompletUpper, 144, sigHeaderY + 10.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Signature : .........................', 150, sigLineY);

  // 5. Mention "Fait en double exemplaire" + thick black bottom line
  const doubleExY = Math.max(sigLineY + 34.5, 213.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Fait en double exemplaire', 105, doubleExY, { align: 'center' });

  doc.setFillColor(0, 0, 0);
  doc.rect(33.5, doubleExY + 5.5, 143, 1.2, 'F');

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
