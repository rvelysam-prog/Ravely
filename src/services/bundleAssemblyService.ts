import { jsPDF } from 'jspdf';
import { SiteSettings } from '../types';
import { loadStaticImageAsPngDataUrl, CONTRACT_STATIC_ASSETS } from './contractPdfGenerator';
import { getSavedCustomCachet, getSavedCustomSignature } from './departmentsAndEmailService';
import { JobOfferData } from './jobOfferService';
import { CricContractVariables } from './cricContractService';
import { TicketEntretienData, generateSmallStackedBarcodeCanvasDataUrl } from './contractGenerationService';

export interface BundleAssemblyData {
  titreDossier: string;
  nomCandidat: string;
  titrePoste: string;
  codeCnp: string;
  referenceDossier: string;
  dateEtablissement: string;
  jobOffer: JobOfferData;
  cricVariables: CricContractVariables;
  ticketData: TicketEntretienData;
  logoUrl?: string;
  companyName?: string;
  selectedStampUrl?: string;
}

export const STANDARD_BC_BENEFITS = [
  "Assurance collective santé, soins dentaires, optique & télémédecine payée par l'employeur",
  "Régime Enregistré d'Épargne-Retraite (REER collectif) avec abondement employeur jusqu'à 5%",
  "3 semaines de congés payés dès la 1ère année + jours fériés provinciaux et fédéraux rémunérés",
  "Prime de sécurité routière, performance opérationnelle et assiduité versée chaque semestre",
  "Allocation annuelle pour bottes de sécurité homologuées CSA et Équipements de Protection Individuelle (EPI)",
  "Programme d'Aide aux Employés et à leur Famille (PAEF) confidentiel disponible 24/7",
  "Prise en charge intégrale des formations continues et du renouvellement des permis & cartes professionnelles."
];

/**
 * Génère le Bundle Assemblé complet au format PDF de manière 100% vectorielle et structurée :
 * 1. Page de garde stylisée comme une couverture de livre officiel avec le logo employeur
 * 2. Offre d'emploi avec stacked barcode sous la référence et avantages BC structurés
 * 3. Modèle 1 : Attestation de Mandat de Recrutement International
 * 4. Ticket d'Entretien d'Embauche avec stacked barcode scannable et tampon d'attestation
 */
export async function generateAssembledBookBundlePdf(
  bundleData: BundleAssemblyData,
  settings?: SiteSettings
): Promise<{ doc: jsPDF; filename: string; dataUri: string }> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  const PAGE_WIDTH = 210;
  const PAGE_HEIGHT = 297;
  const companyName = bundleData.companyName || settings?.company_name || 'ATLANTIC TRANSPORT LTD.';

  let logoDataUrl = '';
  let cachetDataUrl = '';
  let signatureDataUrl = '';

  try {
    const rawLogo = bundleData.logoUrl || settings?.logo_url || CONTRACT_STATIC_ASSETS.logoAtlantic;
    logoDataUrl = await loadStaticImageAsPngDataUrl(rawLogo);
    cachetDataUrl = await loadStaticImageAsPngDataUrl(
      bundleData.selectedStampUrl || bundleData.cricVariables.cachetEmployeurUrl || getSavedCustomCachet() || CONTRACT_STATIC_ASSETS.cachet
    );
    signatureDataUrl = await loadStaticImageAsPngDataUrl(
      bundleData.cricVariables.signatureEmployeurUrl || getSavedCustomSignature() || CONTRACT_STATIC_ASSETS.signature
    );
  } catch {
    // Ignore error
  }

  // =========================================================================
  // PAGE 1 : PAGE DE GARDE / COUVERTURE DE LIVRE PDF
  // =========================================================================
  doc.setFillColor(11, 37, 69);
  doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 'F');

  // Double cadre or décoratif #D4A017
  doc.setDrawColor(212, 160, 23);
  doc.setLineWidth(0.8);
  doc.rect(12, 12, PAGE_WIDTH - 24, PAGE_HEIGHT - 24);
  doc.setLineWidth(0.35);
  doc.rect(14.5, 14.5, PAGE_WIDTH - 29, PAGE_HEIGHT - 29);

  // Coins décoratifs
  const drawCorner = (cx: number, cy: number) => {
    doc.setFillColor(212, 160, 23);
    doc.circle(cx, cy, 1.2, 'F');
  };
  drawCorner(14.5, 14.5);
  drawCorner(PAGE_WIDTH - 14.5, 14.5);
  drawCorner(14.5, PAGE_HEIGHT - 14.5);
  drawCorner(PAGE_WIDTH - 14.5, PAGE_HEIGHT - 14.5);

  let coverY = 32;

  // Bandeau supérieur institutionnel
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(212, 160, 23);
  doc.text('GOUVERNANCE DU RECRUTEMENT INTERNATIONAL · CANADA', PAGE_WIDTH / 2, coverY, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225);
  doc.text('CONFORME AUX NORMES DU TRAVAIL ET À LA LIPR (IRCC / EDSC)', PAGE_WIDTH / 2, coverY + 4.5, { align: 'center' });

  coverY += 22;

  // Cadre blanc central accueillant le Logo de l'entreprise employeur
  const logoCardWidth = 84;
  const logoCardHeight = 42;
  const logoCardX = (PAGE_WIDTH - logoCardWidth) / 2;

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(logoCardX, coverY, logoCardWidth, logoCardHeight, 4, 4, 'F');
  doc.setDrawColor(212, 160, 23);
  doc.setLineWidth(0.4);
  doc.roundedRect(logoCardX, coverY, logoCardWidth, logoCardHeight, 4, 4, 'D');

  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'PNG', logoCardX + 8, coverY + 6, logoCardWidth - 16, logoCardHeight - 12);
    } catch {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(11, 37, 69);
      doc.text(companyName, PAGE_WIDTH / 2, coverY + 24, { align: 'center' });
    }
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(11, 37, 69);
    doc.text(companyName, PAGE_WIDTH / 2, coverY + 24, { align: 'center' });
  }

  coverY += logoCardHeight + 20;

  // Titre principal du livre / dossier
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(255, 255, 255);
  doc.text('DOSSIER DE MOBILITÉ PROFESSIONNELLE', PAGE_WIDTH / 2, coverY, { align: 'center' });

  coverY += 7;
  doc.setFontSize(12);
  doc.setTextColor(212, 160, 23); // Or
  doc.text('RECUEIL OFFICIEL DES TITRES & CONVENTIONS', PAGE_WIDTH / 2, coverY, { align: 'center' });

  coverY += 6;
  doc.setDrawColor(212, 160, 23);
  doc.setLineWidth(0.6);
  doc.line(PAGE_WIDTH / 2 - 35, coverY, PAGE_WIDTH / 2 + 35, coverY);

  coverY += 16;

  // Cartouche d'identification du candidat et de la mission
  const cartoucheWidth = 140;
  const cartoucheX = (PAGE_WIDTH - cartoucheWidth) / 2;
  const cartoucheHeight = 58;

  doc.setFillColor(19, 64, 116); // #134074
  doc.roundedRect(cartoucheX, coverY, cartoucheWidth, cartoucheHeight, 3, 3, 'F');
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.2);
  doc.roundedRect(cartoucheX, coverY, cartoucheWidth, cartoucheHeight, 3, 3, 'D');

  let cY = coverY + 9;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text('CANDIDAT BÉNÉFICIAIRE :', cartoucheX + 12, cY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(bundleData.nomCandidat.toUpperCase(), cartoucheX + 60, cY);

  cY += 9;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text('POSTE ATTRIBUÉ :', cartoucheX + 12, cY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(253, 230, 138); // Jaune clair
  doc.text(`${bundleData.titrePoste} (CNP ${bundleData.codeCnp})`, cartoucheX + 60, cY);

  cY += 9;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text('RÉFÉRENCE UNIQUE :', cartoucheX + 12, cY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text(bundleData.referenceDossier, cartoucheX + 60, cY);

  cY += 9;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text('DATE D’ÉMISSION :', cartoucheX + 12, cY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(bundleData.dateEtablissement, cartoucheX + 60, cY);

  cY += 9;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text('SOMMAIRE DU BUNDLE :', cartoucheX + 12, cY);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.8);
  doc.setTextColor(212, 160, 23);
  doc.text('Offre d’Emploi · Attestation de Mandat · Ticket d’Entretien', cartoucheX + 60, cY);

  coverY += cartoucheHeight + 16;

  // Mentions légales en bas de couverture
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `${companyName} · Surrey, British Columbia, Canada`,
    PAGE_WIDTH / 2,
    PAGE_HEIGHT - 26,
    { align: 'center' }
  );
  doc.setFontSize(7.5);
  doc.text(
    'Document certifié conforme · Reproduction et transmission protégées par la législation canadienne',
    PAGE_WIDTH / 2,
    PAGE_HEIGHT - 21,
    { align: 'center' }
  );

  // =========================================================================
  // PAGE 2 : OFFRE D’EMPLOI (avec stacked barcode et avantages BC détaillés)
  // =========================================================================
  doc.addPage();
  await drawJobOfferPageDirect(doc, bundleData.jobOffer, bundleData.logoUrl);

  // =========================================================================
  // PAGE 3 : MODÈLE 1 - ATTESTATION DE MANDAT DE RECRUTEMENT INTERNATIONAL
  // =========================================================================
  doc.addPage();
  await drawAttestationPageDirect(doc, bundleData.cricVariables, bundleData.logoUrl, cachetDataUrl, signatureDataUrl);

  // =========================================================================
  // PAGE 4 : TICKET D'ENTRETIEN D'EMBAUCHE (avec barcode scannable et tampon)
  // =========================================================================
  doc.addPage();
  await drawTicketPageDirect(doc, bundleData.ticketData, bundleData.logoUrl, cachetDataUrl);

  const cleanCandidat = bundleData.nomCandidat.replace(/[^\w\d]/gi, '_').slice(0, 30);
  const filename = `Bundle_Complet_${cleanCandidat}_${bundleData.referenceDossier}.pdf`;
  const dataUri = doc.output('datauristring');

  return { doc, filename, dataUri };
}

/**
 * PAGE 2 : OFFRE D'EMPLOI
 * Remplissage harmonieux et aéré de la page A4 avec les avantages BC complets
 */
async function drawJobOfferPageDirect(doc: jsPDF, offer: JobOfferData, customLogoUrl?: string) {
  const PAGE_WIDTH = 210;
  const PAGE_HEIGHT = 297;
  const MARGIN_LEFT = 20;
  const MARGIN_RIGHT = 20;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

  let logoDataUrl = '';
  try {
    logoDataUrl = await loadStaticImageAsPngDataUrl(customLogoUrl || CONTRACT_STATIC_ASSETS.logoAtlantic);
  } catch {}

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 'F');

  let currentY = 16;
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'PNG', MARGIN_LEFT, currentY, 46, 19);
    } catch {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(offer.companyName, MARGIN_LEFT, currentY + 10);
    }
  }

  // Réf & Date & Stacked Barcode à droite
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Réf : ${offer.reference}`, PAGE_WIDTH - MARGIN_RIGHT, currentY + 4, { align: 'right' });
  doc.text(`Date : ${offer.datePublication}${offer.heurePublication ? ` à ${offer.heurePublication}` : ''}`, PAGE_WIDTH - MARGIN_RIGHT, currentY + 8.5, { align: 'right' });

  // Stacked barcode compact
  try {
    const barcodeUrl = await generateSmallStackedBarcodeCanvasDataUrl(offer.reference);
    if (barcodeUrl) {
      doc.addImage(barcodeUrl, 'PNG', PAGE_WIDTH - MARGIN_RIGHT - 36, currentY + 11, 36, 10);
    }
  } catch {}

  currentY += 26;

  // Titre OFFRE D'EMPLOI
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(0, 102, 179);
  doc.text('OFFRE D’EMPLOI', PAGE_WIDTH / 2, currentY, { align: 'center' });

  currentY += 8;
  doc.setFontSize(13);
  doc.setTextColor(29, 79, 136);
  doc.text(offer.titrePoste, MARGIN_LEFT, currentY);

  currentY += 4;
  doc.setDrawColor(0, 102, 179);
  doc.setLineWidth(0.6);
  doc.line(MARGIN_LEFT, currentY, PAGE_WIDTH - MARGIN_RIGHT, currentY);

  currentY += 8;

  // Présentation de la société
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(0, 102, 179);
  doc.text('Présentation de la société', MARGIN_LEFT, currentY);
  currentY += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  const pLines = doc.splitTextToSize(offer.presentationSociete, CONTENT_WIDTH);
  doc.text(pLines, MARGIN_LEFT, currentY);
  currentY += pLines.length * 4.4 + 6;

  // Description du poste & missions
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(0, 102, 179);
  doc.text('Description du poste', MARGIN_LEFT, currentY);
  currentY += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.8);
  doc.text(`Mission principale : ${offer.missionPrincipale}`, MARGIN_LEFT, currentY);
  currentY += 5;

  const missions = offer.missionsDetaillees && offer.missionsDetaillees.length > 0
    ? offer.missionsDetaillees.slice(0, 5)
    : [
        "Organiser l'activité quotidienne selon le planning transmis par la direction opérationnelle.",
        "Respecter scrupuleusement les consignes de sécurité, les procédures internes et la réglementation.",
        "Assurer le suivi qualitatif des prestations et veiller à l'intégrité du matériel confié.",
        "Communiquer régulièrement avec la hiérarchie et signaler immédiatement toute anomalie.",
        "Participer activement à la démarche d'amélioration continue et à la satisfaction client."
      ];

  for (const m of missions) {
    doc.text(`• ${m}`, MARGIN_LEFT + 4, currentY);
    currentY += 4.5;
  }

  currentY += 4;

  // Section Avantages sociaux & Normes de Colombie-Britannique
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(0, 102, 179);
  doc.text('Avantages sociaux & Normes de Colombie-Britannique', MARGIN_LEFT, currentY);
  currentY += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);

  const remunSummary = offer.remuneration ||
    "Rémunération horaire : 28.50 $ à 35.00 $ CAD / heure selon profil et expérience (paie bimensuelle aux deux semaines). Heures supplémentaires majorées à 150% (1,5x) au-delà de 8h/jour ou 40h/semaine (Loi sur les normes d'emploi de la Colombie-Britannique). Avantages sociaux complets : assurance santé & dentaire payée par l'employeur, REER collectif abondé jusqu'à 5%, 3 semaines de congés payés, primes et allocation EPI.";

  const rLines = doc.splitTextToSize(remunSummary, CONTENT_WIDTH);
  doc.text(rLines, MARGIN_LEFT, currentY);
  currentY += rLines.length * 4.2 + 5;

  // Les 7 avantages formatés avec coches
  const benefitsToPrint = STANDARD_BC_BENEFITS;
  for (const b of benefitsToPrint) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(21, 128, 61); // Vert coche
    doc.text('✓', MARGIN_LEFT + 2, currentY);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(8.2);
    const bLines = doc.splitTextToSize(b, CONTENT_WIDTH - 10);
    doc.text(bLines, MARGIN_LEFT + 7, currentY);
    currentY += bLines.length * 4.1 + 1.2;
  }

  // Bas de page
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`${offer.companyName} · Page 2 sur 4 · Offre d’Emploi Réf ${offer.reference}`, MARGIN_LEFT, PAGE_HEIGHT - 8);
}

/**
 * PAGE 3 : ATTESTATION DE MANDAT DE RECRUTEMENT INTERNATIONAL
 */
async function drawAttestationPageDirect(
  doc: jsPDF,
  v: CricContractVariables,
  customLogoUrl?: string,
  cachetDataUrl?: string,
  signatureDataUrl?: string
) {
  const PAGE_WIDTH = 210;
  const PAGE_HEIGHT = 297;
  const MARGIN_LEFT = 20;
  const MARGIN_RIGHT = 20;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

  let logoDataUrl = '';
  try {
    logoDataUrl = await loadStaticImageAsPngDataUrl(customLogoUrl || CONTRACT_STATIC_ASSETS.logoAtlantic);
  } catch {}

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 'F');

  let y = 18;
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'PNG', MARGIN_LEFT, y, 44, 18);
    } catch {}
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(11, 37, 69);
  doc.text('ATTESTATION DE MANDAT OFFICIEL', PAGE_WIDTH - MARGIN_RIGHT, y + 5, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Réf Gouvernementale : ${v.referenceEimtOuSuivi}`, PAGE_WIDTH - MARGIN_RIGHT, y + 10, { align: 'right' });

  y += 26;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(0, 102, 179);
  doc.text('ATTESTATION DE MANDAT DE RECRUTEMENT INTERNATIONAL', PAGE_WIDTH / 2, y, { align: 'center' });
  y += 4;
  doc.setDrawColor(0, 102, 179);
  doc.setLineWidth(0.6);
  doc.line(MARGIN_LEFT, y, PAGE_WIDTH - MARGIN_RIGHT, y);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);

  const intro = `Nous soussignés, ${v.nomEntrepriseCanada}, société constituée selon les lois de ${v.provinceCanadienne}, ayant son siège social au ${v.adresseEntrepriseCanada}, représentée par ${v.representantNomEmployeur}, en sa qualité de ${v.representantTitreEmployeur}, ci-après désignée "l'Employeur",\n\nATTESTONS PAR LA PRÉSENTE :`;
  const iLines = doc.splitTextToSize(intro, CONTENT_WIDTH);
  doc.text(iLines, MARGIN_LEFT, y);
  y += iLines.length * 4.6 + 6;

  const printSection = (num: string, title: string, text: string) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(0, 102, 179);
    doc.text(`${num}. ${title}`, MARGIN_LEFT, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    const lines = doc.splitTextToSize(text, CONTENT_WIDTH);
    doc.text(lines, MARGIN_LEFT, y);
    y += lines.length * 4.2 + 6;
  };

  printSection(
    '1',
    'CADRE DU MANDAT OFFICIEL & IDENTIFICATION DU POSTE',
    `L'Employeur a officiellement confié un mandat de sourcing et d'assistance au recrutement international au cabinet partenaire ${v.nomPrestataireFrance} (Permis CNESST ${v.permisCnesst}), pour le poste qualifié de ${v.intitulePoste} (Code CNP ${v.codeCnp}). Démarche d'immigration engagée sous le volet : ${v.typeDemarche} (Réf : ${v.referenceEimtOuSuivi}).`
  );

  printSection(
    '2',
    'ENGAGEMENT DE GRATUITÉ POUR LE TRAVAILLEUR ÉTRANGER',
    `Conformément aux dispositions impératives de la Loi sur l'immigration et la protection des réfugiés (LIPR) et aux normes provinciales du travail au Canada, l'ensemble des frais de recrutement est intégralement et exclusivement pris en charge par l'Employeur. Aucun honoraire ni frais direct ou indirect n'est exigible auprès du candidat.`
  );

  printSection(
    '3',
    'CONFORMITÉ JURIDIQUE & SUPERVISION PROFESSIONNELLE',
    `La gestion procédurale et la conformité administrative sont encadrées sous la supervision directe du consultant réglementé ou professionnel d'immigration ${v.nomProfessionnelImmigration} (Titulaire du N° Membre CCIC ${v.numeroMembreCcic}).`
  );

  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Fait à ${v.villeSignature}, le ${v.dateJour}.`, MARGIN_LEFT, y);
  y += 8;

  // Blocs de signature
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(MARGIN_LEFT, y, 78, 44, 3, 3, 'FD');
  doc.roundedRect(MARGIN_LEFT + 86, y, 78, 44, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(11, 37, 69);
  doc.text("Pour l'Employeur (Canada) :", MARGIN_LEFT + 4, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`${v.signataireNomEmployeur}`, MARGIN_LEFT + 4, y + 11);
  doc.text(`${v.signataireTitreEmployeur}`, MARGIN_LEFT + 4, y + 15);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text("Pour le Prestataire (Mandataire) :", MARGIN_LEFT + 90, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`${v.representantPrestataireNom}`, MARGIN_LEFT + 90, y + 11);
  doc.text(`${v.representantPrestataireTitre}`, MARGIN_LEFT + 90, y + 15);

  if (cachetDataUrl) {
    try {
      doc.addImage(cachetDataUrl, 'PNG', MARGIN_LEFT + 40, y + 14, 28, 28);
    } catch {}
  }
  if (signatureDataUrl) {
    try {
      doc.addImage(signatureDataUrl, 'PNG', MARGIN_LEFT + 6, y + 18, 36, 18);
    } catch {}
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`${v.nomEntrepriseCanada} · Page 3 sur 4 · Attestation officielle de mandat`, MARGIN_LEFT, PAGE_HEIGHT - 8);
}

/**
 * PAGE 4 : TICKET D'ENTRETIEN D'EMBAUCHE
 */
async function drawTicketPageDirect(
  doc: jsPDF,
  ticket: TicketEntretienData,
  customLogoUrl?: string,
  cachetDataUrl?: string
) {
  const PAGE_WIDTH = 210;
  const PAGE_HEIGHT = 297;
  const MARGIN_LEFT = 20;
  const MARGIN_RIGHT = 20;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

  let logoDataUrl = '';
  try {
    logoDataUrl = await loadStaticImageAsPngDataUrl(customLogoUrl || CONTRACT_STATIC_ASSETS.logoAtlantic);
  } catch {}

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 'F');

  let y = 18;
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'PNG', MARGIN_LEFT, y, 44, 18);
    } catch {}
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(11, 37, 69);
  doc.text('CONVOCATION & COUPON OFFICIEL', PAGE_WIDTH - MARGIN_RIGHT, y + 6, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Réf Candidat : ${ticket.codeIdCandidature}`, PAGE_WIDTH - MARGIN_RIGHT, y + 11, { align: 'right' });

  y += 28;

  // Coupon encadré d'or
  doc.setDrawColor(212, 160, 23);
  doc.setLineWidth(0.8);
  doc.setFillColor(254, 252, 246);
  doc.roundedRect(MARGIN_LEFT, y, CONTENT_WIDTH, 140, 4, 4, 'FD');

  // Bandeau bleu en-tête du ticket
  doc.setFillColor(11, 37, 69);
  doc.roundedRect(MARGIN_LEFT, y, CONTENT_WIDTH, 18, 4, 4, 'F');
  doc.rect(MARGIN_LEFT, y + 10, CONTENT_WIDTH, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text('TICKET D’ENTRETIEN D’EMBAUCHE OFFICIEL', MARGIN_LEFT + 8, y + 12);

  y += 26;

  // Détails candidat
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('CANDIDAT :', MARGIN_LEFT + 8, y);
  doc.setFontSize(13);
  doc.setTextColor(11, 37, 69);
  doc.text(ticket.candidatNom.toUpperCase(), MARGIN_LEFT + 8, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('CODE ID CANDIDATURE SÉCURISÉ :', MARGIN_LEFT + 85, y);
  doc.setFontSize(13);
  doc.setTextColor(0, 102, 179);
  doc.text(ticket.codeIdCandidature, MARGIN_LEFT + 85, y + 6);

  y += 18;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text(`Poste ciblé : ${ticket.posteConcerne} (Code CNP ${ticket.codeCnp})`, MARGIN_LEFT + 8, y);
  doc.text(`Département : ${ticket.departement}`, MARGIN_LEFT + 8, y + 6);
  doc.text(`Modalité retenue : ${ticket.typeEntretien}`, MARGIN_LEFT + 8, y + 12);
  doc.text(`Date & Heure : ${ticket.dateEntretien} à ${ticket.heureEntretien} (${ticket.fuseauHoraire || 'Heure du Pacifique'})`, MARGIN_LEFT + 8, y + 18);
  doc.text(`Interlocuteur RH : ${ticket.recruteurNom}`, MARGIN_LEFT + 8, y + 24);

  // Stacked barcode sous les infos
  try {
    const barcodeUrl = await generateSmallStackedBarcodeCanvasDataUrl(ticket.codeIdCandidature);
    if (barcodeUrl) {
      doc.addImage(barcodeUrl, 'PNG', MARGIN_LEFT + 8, y + 30, 48, 14);
    }
  } catch {}

  // Tampon officiel attestant la recevabilité du dossier candidat
  if (cachetDataUrl) {
    try {
      doc.addImage(cachetDataUrl, 'PNG', MARGIN_LEFT + 105, y + 24, 38, 38);
    } catch {}
  }

  y += 54;

  // Instructions importantes pour le candidat
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(MARGIN_LEFT + 8, y, CONTENT_WIDTH - 16, 26, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(11, 37, 69);
  doc.text('CONSIGNES D’ENTRETIEN ET D’ACCÈS :', MARGIN_LEFT + 12, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(71, 85, 105);
  doc.text('• Veuillez vous munir d’une pièce d’identité valide ainsi que de vos attestations et permis professionnels.', MARGIN_LEFT + 12, y + 12);
  doc.text('• Ce coupon certifie la recevabilité formelle de votre dossier auprès de la Direction des Ressources Humaines.', MARGIN_LEFT + 12, y + 17);
  doc.text('• La réussite de cet entretien valide définitivement l’engagement de la procédure de mobilité au Canada.', MARGIN_LEFT + 12, y + 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`${ticket.entrepriseNom} · Page 4 sur 4 · Ticket d’Entretien d’Embauche`, MARGIN_LEFT, PAGE_HEIGHT - 8);
}
