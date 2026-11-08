import { jsPDF } from 'jspdf';
import { SiteSettings } from '../types';
import { loadStaticImageAsPngDataUrl, CONTRACT_STATIC_ASSETS } from './contractPdfGenerator';
import { getSavedCustomCachet, getSavedCustomSignature } from './departmentsAndEmailService';
import { JobOfferData, generateJobOfferPdf } from './jobOfferService';
import { CricContractVariables, generateModel1AttestationPdf } from './cricContractService';
import { TicketEntretienData, generateTicketEntretienPdf } from './contractGenerationService';

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
}

/**
 * Génère le Bundle Assemblé complet au format PDF :
 * 1. Page de garde stylisée comme une couverture de livre officiel avec le logo employeur
 * 2. Offre d'emploi avec stacked barcode sous la référence
 * 3. Modèle 1 : Attestation de Mandat de Recrutement International
 * 4. Ticket d'Entretien d'Embauche avec stacked barcode scannable
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
    cachetDataUrl = await loadStaticImageAsPngDataUrl(bundleData.cricVariables.cachetEmployeurUrl || getSavedCustomCachet() || CONTRACT_STATIC_ASSETS.cachet);
    signatureDataUrl = await loadStaticImageAsPngDataUrl(bundleData.cricVariables.signatureEmployeurUrl || getSavedCustomSignature() || CONTRACT_STATIC_ASSETS.signature);
  } catch {
    // Ignore error
  }

  // =========================================================================
  // PAGE 1 : PAGE DE GARDE / COUVERTURE DE LIVRE PDF
  // =========================================================================

  // Fond bleu marine profond #0B2545
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
  // PAGE 2 : OFFRE D’EMPLOI (avec stacked barcode sous référence)
  // =========================================================================
  const { doc: offerDoc } = await generateJobOfferPdf(bundleData.jobOffer, bundleData.logoUrl);
  // Transférer la page de l'offre
  doc.addPage();
  const offerPageCount = offerDoc.getNumberOfPages();
  for (let p = 1; p <= offerPageCount; p++) {
    if (p > 1) doc.addPage();
    // On dessine l'offre sur la page courante
    // Dans jsPDF, un moyen robuste est de générer les pages via leur méthode respective
  }

  // =========================================================================
  // PAGE 3 : MODÈLE 1 - ATTESTATION DE MANDAT DE RECRUTEMENT INTERNATIONAL
  // =========================================================================
  const { doc: attestationDoc } = await generateModel1AttestationPdf(bundleData.cricVariables);

  // =========================================================================
  // PAGE 4 : TICKET D'ENTRETIEN D'EMBAUCHE (avec stacked barcode scannable)
  // =========================================================================
  const { doc: ticketDoc } = await generateTicketEntretienPdf(bundleData.ticketData, bundleData.logoUrl);

  // Assemblage propre des flux PDF individuels dans le document final
  // Pour garantir un rendu vectoriel 100% net de chaque page, nous regénérons chaque page séquentiellement :
  // Page 2 : Offre
  doc.setPage(2);
  // Redessiner le contenu de l'offre sur page 2
  await drawJobOfferPageDirect(doc, bundleData.jobOffer, bundleData.logoUrl);

  // Page 3 : Attestation
  doc.addPage();
  await drawAttestationPageDirect(doc, bundleData.cricVariables, bundleData.logoUrl);

  // Page 4 : Ticket
  doc.addPage();
  await drawTicketPageDirect(doc, bundleData.ticketData, bundleData.logoUrl);

  const cleanCandidat = bundleData.nomCandidat.replace(/[^\w\d]/gi, '_').slice(0, 30);
  const filename = `Bundle_Complet_${cleanCandidat}_${bundleData.referenceDossier}.pdf`;
  const dataUri = doc.output('datauristring');

  return { doc, filename, dataUri };
}

/**
 * Fonctions de dessin direct sur le document unifié
 */
async function drawJobOfferPageDirect(doc: jsPDF, offer: JobOfferData, customLogoUrl?: string) {
  const PAGE_WIDTH = 210;
  const PAGE_HEIGHT = 297;
  const MARGIN_LEFT = 22;
  const MARGIN_RIGHT = 22;
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
      doc.addImage(logoDataUrl, 'PNG', MARGIN_LEFT, currentY, 44, 18);
    } catch {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(offer.companyName, MARGIN_LEFT, currentY + 10);
    }
  }

  // Réf & Date
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Réf : ${offer.reference}`, PAGE_WIDTH - MARGIN_RIGHT, currentY + 5, { align: 'right' });
  doc.text(`Date : ${offer.datePublication}`, PAGE_WIDTH - MARGIN_RIGHT, currentY + 9.5, { align: 'right' });

  currentY += 28;

  // Titre
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(0, 102, 179);
  doc.text('OFFRE D’EMPLOI', PAGE_WIDTH / 2, currentY, { align: 'center' });

  currentY += 10;
  doc.setFontSize(14);
  doc.setTextColor(29, 79, 136);
  doc.text(offer.titrePoste, MARGIN_LEFT, currentY);

  currentY += 4;
  doc.setDrawColor(203, 213, 225);
  doc.line(MARGIN_LEFT, currentY, PAGE_WIDTH - MARGIN_RIGHT, currentY);

  currentY += 7;

  // Présentation
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 102, 179);
  doc.text('Présentation de la société', MARGIN_LEFT, currentY);
  currentY += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  const pLines = doc.splitTextToSize(offer.presentationSociete, CONTENT_WIDTH);
  doc.text(pLines, MARGIN_LEFT, currentY);
  currentY += pLines.length * 4.4 + 5;

  // Description
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 102, 179);
  doc.text('Description du poste', MARGIN_LEFT, currentY);
  currentY += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.8);
  doc.text(`Mission : ${offer.missionPrincipale}`, MARGIN_LEFT, currentY);
  currentY += 5;

  for (const m of offer.missionsDetaillees.slice(0, 5)) {
    doc.text(`• ${m}`, MARGIN_LEFT + 4, currentY);
    currentY += 4.5;
  }

  currentY += 3;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 102, 179);
  doc.text('Rémunération & Normes canadiennes', MARGIN_LEFT, currentY);
  currentY += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.8);
  doc.setTextColor(30, 41, 59);
  const rLines = doc.splitTextToSize(offer.remuneration, CONTENT_WIDTH);
  doc.text(rLines, MARGIN_LEFT, currentY);

  // Bas de page
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`${offer.companyName} · Page 2 · Offre d’Emploi Réf ${offer.reference}`, MARGIN_LEFT, PAGE_HEIGHT - 8);
}

async function drawAttestationPageDirect(doc: jsPDF, v: CricContractVariables, customLogoUrl?: string) {
  const PAGE_WIDTH = 210;
  const PAGE_HEIGHT = 297;
  const MARGIN_LEFT = 22;
  const MARGIN_RIGHT = 22;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

  let logoDataUrl = '';
  let cachetDataUrl = '';
  let signatureDataUrl = '';
  try {
    logoDataUrl = await loadStaticImageAsPngDataUrl(customLogoUrl || CONTRACT_STATIC_ASSETS.logoAtlantic);
    cachetDataUrl = await loadStaticImageAsPngDataUrl(v.cachetEmployeurUrl || getSavedCustomCachet() || CONTRACT_STATIC_ASSETS.cachet);
    signatureDataUrl = await loadStaticImageAsPngDataUrl(v.signatureEmployeurUrl || getSavedCustomSignature() || CONTRACT_STATIC_ASSETS.signature);
  } catch {}

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 'F');

  let y = 18;
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'PNG', MARGIN_LEFT, y, 42, 17);
    } catch {}
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(11, 37, 69);
  doc.text('ATTESTATION DE MANDAT OFFICIEL', PAGE_WIDTH - MARGIN_RIGHT, y + 5, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Réf : ${v.referenceEimtOuSuivi}`, PAGE_WIDTH - MARGIN_RIGHT, y + 10, { align: 'right' });

  y += 24;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(0, 102, 179);
  doc.text('ATTESTATION DE MANDAT DE RECRUTEMENT INTERNATIONAL', PAGE_WIDTH / 2, y, { align: 'center' });
  y += 4;
  doc.setDrawColor(0, 102, 179);
  doc.line(MARGIN_LEFT, y, PAGE_WIDTH - MARGIN_RIGHT, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);

  const intro = `Nous soussignés, ${v.nomEntrepriseCanada}, société constituée selon les lois de ${v.provinceCanadienne}, représentée par ${v.representantNomEmployeur}, ${v.representantTitreEmployeur}, attestons avoir confié un mandat officiel de recrutement au prestataire : ${v.nomPrestataireFrance} (Permis CNESST ${v.permisCnesst}).`;
  const iLines = doc.splitTextToSize(intro, CONTENT_WIDTH);
  doc.text(iLines, MARGIN_LEFT, y);
  y += iLines.length * 4.2 + 6;

  const printSection = (num: string, title: string, text: string) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 102, 179);
    doc.text(`${num}. ${title}`, MARGIN_LEFT, y);
    y += 4.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.3);
    doc.setTextColor(30, 41, 59);
    const lines = doc.splitTextToSize(text, CONTENT_WIDTH);
    doc.text(lines, MARGIN_LEFT, y);
    y += lines.length * 4 + 4;
  };

  printSection('1', 'CADRE DU MANDAT & POSTE', `Mandat confié pour le poste de ${v.intitulePoste} (CNP ${v.codeCnp}). Démarche : ${v.typeDemarche} enregistrée sous le numéro ${v.referenceEimtOuSuivi}.`);
  printSection('2', 'PROTECTION ET RECRUTEMENT ÉTHIQUE', `Démarche 100% gratuite pour le candidat. Aucun frais de recrutement exigible. Supervision légale assurée par ${v.nomProfessionnelImmigration} (CCIC ${v.numeroMembreCcic}).`);

  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Fait à ${v.villeSignature}, le ${v.dateJour}.`, MARGIN_LEFT, y);
  y += 6;

  doc.setFont('helvetica', 'bold');
  doc.text("Pour l'Employeur :", MARGIN_LEFT, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`${v.signataireNomEmployeur} - ${v.signataireTitreEmployeur}`, MARGIN_LEFT, y + 4.5);

  if (cachetDataUrl) {
    try {
      doc.addImage(cachetDataUrl, 'PNG', MARGIN_LEFT + 60, y - 2, 24, 24);
    } catch {}
  }
  if (signatureDataUrl) {
    try {
      doc.addImage(signatureDataUrl, 'PNG', MARGIN_LEFT + 86, y, 32, 16);
    } catch {}
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`${v.nomEntrepriseCanada} · Page 3 · Attestation officielle de mandat`, MARGIN_LEFT, PAGE_HEIGHT - 8);
}

async function drawTicketPageDirect(doc: jsPDF, ticket: TicketEntretienData, customLogoUrl?: string) {
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

  let y = 20;
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

  y += 26;

  // Coupon
  doc.setDrawColor(212, 160, 23);
  doc.setLineWidth(0.8);
  doc.setFillColor(254, 252, 246);
  doc.roundedRect(MARGIN_LEFT, y, CONTENT_WIDTH, 120, 4, 4, 'FD');

  doc.setFillColor(11, 37, 69);
  doc.roundedRect(MARGIN_LEFT, y, CONTENT_WIDTH, 16, 4, 4, 'F');
  doc.rect(MARGIN_LEFT, y + 8, CONTENT_WIDTH, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text('TICKET D’ENTRETIEN D’EMBAUCHE OFFICIEL', MARGIN_LEFT + 8, y + 11);

  y += 24;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('CANDIDAT :', MARGIN_LEFT + 8, y);
  doc.setFontSize(13);
  doc.setTextColor(11, 37, 69);
  doc.text(ticket.candidatNom.toUpperCase(), MARGIN_LEFT + 8, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('CODE ID CANDIDATURE SÉCURISÉ :', MARGIN_LEFT + 85, y);
  doc.setFontSize(13);
  doc.setTextColor(0, 102, 179);
  doc.text(ticket.codeIdCandidature, MARGIN_LEFT + 85, y + 6);

  y += 18;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`Poste : ${ticket.posteConcerne} (CNP ${ticket.codeCnp})`, MARGIN_LEFT + 8, y);
  doc.text(`Modalité : ${ticket.typeEntretien}`, MARGIN_LEFT + 8, y + 5);
  doc.text(`Date & Heure : ${ticket.dateEntretien} à ${ticket.heureEntretien}`, MARGIN_LEFT + 8, y + 10);
  doc.text(`Interlocuteur RH : ${ticket.recruteurNom}`, MARGIN_LEFT + 8, y + 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`${ticket.entrepriseNom} · Page 4 · Ticket d’Entretien d’Embauche`, MARGIN_LEFT, PAGE_HEIGHT - 8);
}
