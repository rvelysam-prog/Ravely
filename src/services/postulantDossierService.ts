/**
 * Service complet de gestion des dossiers de postulants et kits d'entretien
 * Supporte le Recrutement en Direct (Cas 1) et via Agence de Placement (Cas 2).
 * Inclut la génération de PDF vectoriels, templates emails responsive et persistance Firestore.
 */

import { jsPDF } from 'jspdf';
import { collection, doc, getDocs, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { SiteSettings } from '../types';
import { CONTRACT_STATIC_ASSETS, loadStaticImageAsPngDataUrl } from './contractPdfGenerator';
import { generateSmallStackedBarcodeCanvasDataUrl, saveInterviewSession, TicketEntretienData } from './contractGenerationService';

export type RecrutementCasType = 'direct' | 'agence';

export interface PostulantInfo {
  id: string;
  matricule?: string;
  casType: RecrutementCasType;
  nomComplet: string;
  prenom: string;
  nom: string;
  civilite: 'Monsieur' | 'Madame';
  email: string;
  telephone: string;
  adresse: string;
  nationalite: string;
  dateNaissance?: string;
  numeroPieceIdentite?: string;
  contactUrgence?: string;
  horairesTravail?: string;
  numeroImmatriculationEntreprise?: string;
  responsabilitesMissions?: string[];
  photoUrl?: string; // Photo d'identité
  // Poste & conditions
  intitulePoste: string;
  codeCnp: string;
  departement: string;
  typeContrat: 'CDI' | 'CDD' | 'Saisonnier' | string;
  dateEffet: string;
  dateEntretien: string;
  heureEntretien: string;
  modaliteEntretien: 'Visioconférence Teams Sécurisée' | 'Entretien Présentiel Siège Canada' | 'Session Mixte Siège & Visio';
  lieuEntretien: string;
  salaireHoraire: number;
  salaireMensuel: number;
  heuresHebdo: number;
  dureePeriodeEssai: string;
  managerRecruteur: string;
  // Entreprise employeuse
  nomEntreprise: string;
  adresseEntreprise: string;
  representantEmployeurNom: string;
  representantEmployeurTitre: string;
  villeSignature: string;
  contactDocPhone: string;
  contactDocEmail: string;
  // Agence / Cabinet mandataire (Cas 2)
  nomAgence: string;
  adresseAgence: string;
  representantAgenceNom: string;
  representantAgenceTitre: string;
  permisCnesst: string;
  numeroCcic: string;
  // Fiche liaison tripartite option
  dispenseEntretienParGarantie: boolean; // Si true: le prestataire se porte garant des compétences pour extrapoler l'entretien
  // Fichiers importés
  logoUrl?: string;
  logoAgenceUrl?: string;
  signatureUrl?: string;
  cachetUrl?: string;
  filigraneUrl?: string;
  // Données de validation
  codeIdCandidature: string;
  statutDossier: 'en_attente' | 'valide' | 'cloture';
  ticketValide: boolean; // false = Ticket provisoire non valide, true = Ticket validé avec barcode
  createdAt: string;
  updatedAt: string;
}

export interface GeneratedDossierDocuments {
  cas1?: {
    ficheAts: string;
    grilleEvaluation: string;
    historiquePlanification: string;
    livretAccueil: string;
    fichePoste: string;
    demandeEmploi: string;
    autorisationReferences: string;
    questionnairePersonnalite: string;
  };
  cas2?: {
    briefRecrutement: string;
    contratPrestation: string;
    dossierPresentation: string;
    ficheInscription: string;
    accordRgpd: string;
    fichePreparation: string;
    ficheLiaisonTripartite: string;
  };
  emailHtml: string;
  emailObjet: string;
}

const LOCAL_STORAGE_POSTULANTS_KEY = 'atlantic_postulants_v2';

/**
 * Crée un objet PostulantInfo par défaut initialisé avec les paramètres de l'entreprise
 */
export function buildDefaultPostulantInfo(settings: SiteSettings, casType: RecrutementCasType = 'direct'): PostulantInfo {
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const now = new Date();
  const dateStr = now.toLocaleDateString('fr-CA');

  return {
    id: `postulant_${Date.now()}_${randomNum}`,
    matricule: `EMP-${now.getFullYear()}-U${randomNum}`,
    casType,
    nomComplet: 'Jean Dupont',
    prenom: 'Jean',
    nom: 'Dupont',
    civilite: 'Monsieur',
    email: 'candidat.mobilite@atlantictransport.ca',
    telephone: '+1 (506) 802-2226',
    adresse: '1240 Rue Sainte-Catherine Ouest, Montréal, QC H3G 1P1',
    nationalite: 'Française',
    dateNaissance: '1988-06-15',
    intitulePoste: 'Conducteur Routier International (H/F)',
    codeCnp: '73300',
    departement: 'DEPARTEMENT EXPLOITATION TRANSPORT',
    typeContrat: 'CDI',
    dateEffet: dateStr,
    dateEntretien: dateStr,
    heureEntretien: '14:30',
    modaliteEntretien: 'Visioconférence Teams Sécurisée',
    lieuEntretien: 'Siège Opérationnel Atlantic Transport Ltd., Surrey, BC (ou Lien Sécurisé Teams)',
    salaireHoraire: 30.50,
    salaireMensuel: 4950,
    heuresHebdo: 37.5,
    dureePeriodeEssai: '3 mois renouvelable une fois',
    managerRecruteur: 'Antoine Forestin (Directeur des Ressources Humaines)',
    nomEntreprise: settings.company_name || 'ATLANTIC TRANSPORT LTD.',
    adresseEntreprise: settings.address || 'King George Blvd, Surrey, BC V3T 2W1, Canada',
    representantEmployeurNom: 'Antoine Forestin',
    representantEmployeurTitre: 'Directeur Général & Fondateur',
    villeSignature: 'Surrey, BC',
    contactDocPhone: settings.phone || '+15068022206',
    contactDocEmail: settings.email || 'direction@atlantictransport.ca',
    nomAgence: 'CAN-FRANCE MOBILITÉ & IMMIGRATION INTERNATIONALE',
    adresseAgence: '48 Boulevard Haussmann, 75009 Paris, France',
    representantAgenceNom: 'Maître Thierry Marchand',
    representantAgenceTitre: 'Consultant Réglementé en Immigration Canadienne (CRIC)',
    permisCnesst: 'AR-2023-88419',
    numeroCcic: 'R518920',
    dispenseEntretienParGarantie: false,
    logoUrl: settings.logo_url || CONTRACT_STATIC_ASSETS.logoAtlantic,
    codeIdCandidature: `ENT-BC-${now.getFullYear()}-${randomNum}`,
    statutDossier: 'valide',
    ticketValide: true,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  };
}

/**
 * Sauvegarde un postulant dans localStorage et Firestore
 */
export async function savePostulantRecord(postulant: PostulantInfo): Promise<PostulantInfo> {
  const updated = {
    ...postulant,
    updatedAt: new Date().toISOString()
  };

  // 1. Sauvegarde locale
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_POSTULANTS_KEY);
    const list: PostulantInfo[] = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex((p) => p.id === updated.id);
    if (idx >= 0) {
      list[idx] = updated;
    } else {
      list.unshift(updated);
    }
    localStorage.setItem(LOCAL_STORAGE_POSTULANTS_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn('Erreur localStorage postulant:', err);
  }

  // 2. Sauvegarde Firestore
  try {
    const docRef = doc(db, 'postulants_records', updated.id);
    await setDoc(docRef, updated, { merge: true });
  } catch (err) {
    console.warn('Erreur Firestore postulant:', err);
  }

  return updated;
}

/**
 * Récupère tous les postulants enregistrés
 */
export async function fetchAllPostulants(): Promise<PostulantInfo[]> {
  const mapById = new Map<string, PostulantInfo>();

  // Local storage d'abord
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_POSTULANTS_KEY);
    if (raw) {
      const list: PostulantInfo[] = JSON.parse(raw);
      list.forEach((p) => mapById.set(p.id, p));
    }
  } catch {}

  // Compléter avec Firestore
  try {
    const snap = await getDocs(collection(db, 'postulants_records'));
    snap.forEach((d) => {
      const data = d.data() as PostulantInfo;
      mapById.set(data.id, data);
    });
  } catch {}

  return Array.from(mapById.values()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

/**
 * Supprime un dossier postulant
 */
export async function deletePostulantRecord(id: string): Promise<void> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_POSTULANTS_KEY);
    if (raw) {
      const list: PostulantInfo[] = JSON.parse(raw);
      localStorage.setItem(LOCAL_STORAGE_POSTULANTS_KEY, JSON.stringify(list.filter((p) => p.id !== id)));
    }
  } catch {}

  try {
    await deleteDoc(doc(db, 'postulants_records', id));
  } catch {}
}

/**
 * Publie le postulant vers l'espace public "Entretien d'Embauche" (/entretien)
 */
export async function publishPostulantToEntretien(postulant: PostulantInfo, settings: SiteSettings): Promise<TicketEntretienData> {
  const session: TicketEntretienData = {
    id: postulant.id,
    codeIdCandidature: postulant.codeIdCandidature,
    candidatNom: postulant.nomComplet,
    candidatEmail: postulant.email,
    candidatTelephone: postulant.telephone,
    candidatNationalite: postulant.nationalite,
    posteConcerne: postulant.intitulePoste,
    departement: postulant.departement,
    codeCnp: postulant.codeCnp,
    dateEntretien: postulant.dateEntretien,
    heureEntretien: postulant.heureEntretien,
    fuseauHoraire: 'Heure du Pacifique (Vancouver / Surrey PST)',
    typeEntretien: postulant.modaliteEntretien as any,
    recruteurNom: postulant.managerRecruteur,
    entrepriseNom: postulant.nomEntreprise,
    adresseEntreprise: postulant.adresseEntreprise,
    urlEntretien: `${window.location.origin}/entretien?code=${encodeURIComponent(postulant.codeIdCandidature)}`,
    estConsomme: false,
    dateCreation: new Date().toISOString()
  };

  await saveInterviewSession(session);
  return session;
}

/**
 * Génère le modèle d'email responsive officiel pour le Cas 1 ou le Cas 2
 */
export function generatePostulantEmailTemplate(p: PostulantInfo, settings: SiteSettings): { objet: string; html: string; plainText: string } {
  const isDirect = p.casType === 'direct';

  if (isDirect) {
    const objet = `Votre entretien pour le poste de ${p.intitulePoste} chez ${p.nomEntreprise}`;
    const plainText = `Bonjour ${p.nomComplet},

Nous avons le plaisir de vous confirmer votre entretien d'embauche pour le poste de ${p.intitulePoste}, qui se déroulera le ${p.dateEntretien} à ${p.heureEntretien} dans nos locaux situés au ${p.adresseEntreprise} (ou en visioconférence via : ${p.lieuEntretien}).

Vous rencontrerez ${p.managerRecruteur} pour un échange d'une durée d'environ 1 heure.

Pour vous aider à préparer cette rencontre dans les meilleures conditions, vous trouverez en pièce jointe votre Dossier Candidat comprenant :
• La fiche de poste détaillée
• Notre livret de présentation d'entreprise
• Notre formulaire de candidature interne (à nous retourner complété ou à apporter le jour J)
• L'autorisation de prise de références professionnelles

(Optionnel) : Vous recevrez également d'ici quelques minutes un e-mail séparé contenant le lien d'accès pour compléter notre questionnaire de personnalité en ligne avant l'entretien.

Nous vous souhaitons une excellente préparation et restons à votre disposition pour toute question.

Cordialement,
${p.representantEmployeurNom}
${p.representantEmployeurTitre}
${p.nomEntreprise}
${p.contactDocPhone} · ${p.contactDocEmail}`;

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${objet}</title>
</head>
<body style="margin: 0; padding: 20px 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B;">
  <center>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 640px; background-color: #FFFFFF; border-radius: 12px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 4px 14px rgba(0,0,0,0.05); text-align: left;">
      <!-- EN-TÊTE BLANC ÉPURÉ AVEC LOGO SANS BANDEAU FORCÉ -->
      <tr>
        <td style="padding: 24px 30px; border-bottom: 2px solid #D4A017; background-color: #FFFFFF;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td align="left" valign="middle">
                ${p.logoUrl ? `<img src="${p.logoUrl}" alt="${p.nomEntreprise}" style="max-height: 48px; max-width: 190px; object-contain;" border="0">` : `<span style="font-size: 18px; font-weight: bold; color: #0B2545;">${p.nomEntreprise}</span>`}
              </td>
              <td align="right" valign="middle" style="font-size: 11px; color: #64748B;">
                <span style="display: block; font-weight: bold; color: #0B2545;">Direction des Ressources Humaines</span>
                <span>Réf. Dossier : <strong>${p.codeIdCandidature}</strong></span>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- CORPS DE L'EMAIL -->
      <tr>
        <td style="padding: 30px 30px 20px 30px; font-size: 13.5px; line-height: 1.65; color: #334155;">
          <p style="margin-top: 0; font-size: 15px; font-weight: bold; color: #0B2545;">
            Bonjour ${p.nomComplet},
          </p>
          <p>
            Nous avons le plaisir de vous confirmer votre entretien d'embauche officiel pour le poste de <strong>${p.intitulePoste}</strong> (CNP <strong>${p.codeCnp}</strong>), qui se déroulera le <strong>${p.dateEntretien}</strong> à <strong>${p.heureEntretien}</strong>.
          </p>
          <div style="background-color: #F8FAFC; border-left: 4px solid #0066B3; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
            <strong>Modalités d'accès :</strong> ${p.modaliteEntretien}<br>
            <strong>Lieu ou lien d'échange :</strong> ${p.lieuEntretien}<br>
            <strong>Interlocuteur :</strong> ${p.managerRecruteur} (Durée prévue : ~1 heure)
          </div>
          <p>
            Pour vous aider à préparer cette rencontre dans les meilleures conditions, vous trouverez ci-joint votre <strong>Dossier Candidat Officiel</strong> comprenant :
          </p>
          <ul style="padding-left: 20px; margin: 10px 0 18px 0; line-height: 1.7;">
            <li><strong>La fiche de poste détaillée</strong> (missions, compétences et conditions de travail au Canada)</li>
            <li><strong>Notre livret d'accueil et de présentation d'entreprise</strong> (culture, valeurs et équipements)</li>
            <li><strong>Notre formulaire de demande d'emploi interne</strong> (fiche de candidature à compléter)</li>
            <li><strong>L'autorisation de prise de références professionnelles</strong> (accord de vérification)</li>
          </ul>
          <p style="font-size: 12px; color: #64748B; background: #FEF9C3; padding: 10px 14px; border-radius: 6px; border: 1px solid #FDE047;">
            ℹ️ <em>(Optionnel) : Vous recevrez également un e-mail séparé contenant le lien d'accès pour compléter notre questionnaire de personnalité en ligne avant l'entretien.</em>
          </p>
          <p style="margin-top: 20px;">
            Nous vous souhaitons une excellente préparation et restons à votre entière disposition pour toute question.
          </p>
          <p style="margin-bottom: 0;">
            Cordialement,<br>
            <strong>${p.representantEmployeurNom}</strong><br>
            <span style="font-size: 12px; color: #64748B;">${p.representantEmployeurTitre} · ${p.nomEntreprise}</span>
          </p>
        </td>
      </tr>

      <!-- PIED DE PAGE -->
      <tr>
        <td style="padding: 16px 30px; background-color: #0F172A; color: #94A3B8; font-size: 10.5px; text-align: center;">
          ${p.nomEntreprise} · ${p.adresseEntreprise}<br>
          Tél : ${p.contactDocPhone} · Email : ${p.contactDocEmail} · Document certifié conforme
        </td>
      </tr>
    </table>
  </center>
</body>
</html>`;

    return { objet, html, plainText };
  } else {
    // Cas 2 : Agence de Placement
    const objet = `Préparation de votre entretien chez notre client ${p.nomEntreprise} - Poste de ${p.intitulePoste}`;
    const plainText = `Bonjour ${p.nomComplet},

Comme convenu lors de notre dernier échange, nous avons le plaisir de vous confirmer que votre profil a été retenu par notre client ${p.nomEntreprise} pour un entretien d'embauche.

Votre rendez-vous est fixé le ${p.dateEntretien} à ${p.heureEntretien} à l'adresse suivante : ${p.adresseEntreprise} (ou en visioconférence : ${p.lieuEntretien}). Vous serez reçu(e) par ${p.managerRecruteur}.

Afin de vous accompagner vers la réussite de ce projet, vous trouverez ci-joint votre Kit de Préparation personnalisé :
• Votre Bon de présentation officiel (à conserver avec vous)
• La fiche de poste détaillée du client
• Notre fiche de conseils exclusifs pour cet entretien (incluant des informations clés sur le profil de vos interlocuteurs et la culture de l'entreprise)
(Optionnel) : Si ce n'est pas déjà fait, merci de nous renvoyer signé le document d'autorisation RGPD également joint à cet e-mail.

Je reste disponible pour faire un point de coaching téléphonique rapide avant votre rendez-vous si vous le souhaitez.

Nous vous souhaitons un excellent succès !

Cordialement,
${p.representantAgenceNom}
${p.representantAgenceTitre}
${p.nomAgence}
Mandataire agréé CNESST : ${p.permisCnesst} · Membre CCIC : ${p.numeroCcic}`;

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${objet}</title>
</head>
<body style="margin: 0; padding: 20px 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B;">
  <center>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 640px; background-color: #FFFFFF; border-radius: 12px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 4px 14px rgba(0,0,0,0.05); text-align: left;">
      <!-- EN-TÊTE AGENCE AVEC LOGO RESPECTÉ -->
      <tr>
        <td style="padding: 24px 30px; border-bottom: 2px solid #0066B3; background-color: #FFFFFF;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td align="left" valign="middle">
                ${p.logoAgenceUrl ? `<img src="${p.logoAgenceUrl}" alt="${p.nomAgence}" style="max-height: 48px; max-width: 190px; object-contain;" border="0">` : `<span style="font-size: 16px; font-weight: bold; color: #0066B3;">${p.nomAgence}</span>`}
              </td>
              <td align="right" valign="middle" style="font-size: 11px; color: #64748B;">
                <span style="display: block; font-weight: bold; color: #0066B3;">Cabinet Partenaire Mobilité Canada</span>
                <span>Permis CNESST : <strong>${p.permisCnesst}</strong></span>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- CORPS EMAIL AGENCE -->
      <tr>
        <td style="padding: 30px 30px 20px 30px; font-size: 13.5px; line-height: 1.65; color: #334155;">
          <p style="margin-top: 0; font-size: 15px; font-weight: bold; color: #0F172A;">
            Bonjour ${p.nomComplet},
          </p>
          <p>
            Comme convenu lors de notre dernier échange, nous avons le grand plaisir de vous confirmer que votre profil a été retenu par notre client employeur <strong>${p.nomEntreprise}</strong> pour un entretien d'embauche officiel (Poste : <strong>${p.intitulePoste}</strong>).
          </p>
          <div style="background-color: #F0FDF4; border-left: 4px solid #16A34A; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
            <strong>Date & Heure :</strong> ${p.dateEntretien} à ${p.heureEntretien}<br>
            <strong>Lieu ou lien sécurisé :</strong> ${p.lieuEntretien}<br>
            <strong>Interlocuteur employeur :</strong> ${p.managerRecruteur}
          </div>
          <p>
            Afin de vous accompagner vers la pleine réussite de cet échange, vous trouverez ci-joint votre <strong>Kit de Préparation Personnalisé</strong> :
          </p>
          <ul style="padding-left: 20px; margin: 10px 0 18px 0; line-height: 1.7;">
            <li><strong>Votre Bon de présentation officiel (Fiche de liaison tripartite)</strong> (à conserver précieusement)</li>
            <li><strong>La fiche de poste détaillée du client employeur</strong></li>
            <li><strong>Notre fiche de conseils exclusifs pour cet entretien</strong> (profil des managers, culture d'entreprise, barèmes)</li>
          </ul>
          <p style="font-size: 12px; color: #475569; background: #F1F5F9; padding: 10px 14px; border-radius: 6px; border: 1px solid #CBD5E1;">
            🔒 <em>(Important) : Si ce n'est pas déjà fait, merci de nous renvoyer signé le document d'autorisation et consentement RGPD également joint.</em>
          </p>
          <p style="margin-top: 20px;">
            Je reste personnellement à votre disposition pour un point de coaching téléphonique rapide avant votre rendez-vous.
          </p>
          <p style="margin-bottom: 0;">
            Cordialement,<br>
            <strong>${p.representantAgenceNom}</strong><br>
            <span style="font-size: 12px; color: #64748B;">${p.representantAgenceTitre} · ${p.nomAgence}</span>
          </p>
        </td>
      </tr>

      <!-- PIED DE PAGE -->
      <tr>
        <td style="padding: 16px 30px; background-color: #0F172A; color: #94A3B8; font-size: 10.5px; text-align: center;">
          ${p.nomAgence} · Siège : ${p.adresseAgence}<br>
          Accréditation CCIC : ${p.numeroCcic} · CNESST : ${p.permisCnesst} · Conformité légale Recrutement Éthique Canada
        </td>
      </tr>
    </table>
  </center>
</body>
</html>`;

    return { objet, html, plainText };
  }
}

/**
 * Génère le PDF complet du Kit Candidat / Dossier Postulant
 */
export async function generatePostulantKitPdf(
  p: PostulantInfo,
  settings: SiteSettings,
  customTextOverride?: string
): Promise<{ doc: jsPDF; filename: string }> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  const PAGE_WIDTH = 210;
  const PAGE_HEIGHT = 297;
  const MARGIN_LEFT = 20;
  const MARGIN_RIGHT = 20;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

  let logoEmp = '';
  let logoAgence = '';
  let cachetDataUrl = '';
  let signatureDataUrl = '';
  let photoDataUrl = '';

  try {
    if (p.logoUrl) logoEmp = await loadStaticImageAsPngDataUrl(p.logoUrl);
    if (p.logoAgenceUrl) logoAgence = await loadStaticImageAsPngDataUrl(p.logoAgenceUrl);
    if (p.cachetUrl) cachetDataUrl = await loadStaticImageAsPngDataUrl(p.cachetUrl);
    if (p.signatureUrl) signatureDataUrl = await loadStaticImageAsPngDataUrl(p.signatureUrl);
    if (p.photoUrl) photoDataUrl = await loadStaticImageAsPngDataUrl(p.photoUrl);
  } catch {}

  // ==========================================
  // PAGE 1 : FICHE DE SYNTHÈSE / COUVERTURE DU DOSSIER
  // ==========================================
  // Bordure élégante
  doc.setDrawColor(11, 37, 69);
  doc.setLineWidth(1.2);
  doc.rect(12, 12, PAGE_WIDTH - 24, PAGE_HEIGHT - 24);
  doc.setDrawColor(212, 160, 23);
  doc.setLineWidth(0.4);
  doc.rect(14, 14, PAGE_WIDTH - 28, PAGE_HEIGHT - 28);

  let y = 22;

  // En-tête Logos
  if (logoEmp) {
    try {
      doc.addImage(logoEmp, 'PNG', MARGIN_LEFT, y, 45, 18);
    } catch {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(11, 37, 69);
      doc.text(p.nomEntreprise, MARGIN_LEFT, y + 8);
    }
  }
  if (p.casType === 'agence' && logoAgence) {
    try {
      doc.addImage(logoAgence, 'PNG', PAGE_WIDTH - MARGIN_RIGHT - 45, y, 45, 18);
    } catch {}
  }

  y += 24;

  // Titre principal
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(11, 37, 69);
  const titreDossier = p.casType === 'direct'
    ? 'DOSSIER D’ACCUEIL & KIT D’ENTRETIEN CANDIDAT'
    : 'KIT DE PRÉSENTATION TRIPARTITE & PRÉPARATION ENTRETIEN';
  doc.text(titreDossier, PAGE_WIDTH / 2, y, { align: 'center' });

  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(212, 160, 23);
  doc.text(`RÉFÉRENCE OFFICIELLE : ${p.codeIdCandidature}`, PAGE_WIDTH / 2, y, { align: 'center' });

  y += 10;

  // Photo d'identité si présente
  if (photoDataUrl) {
    try {
      doc.addImage(photoDataUrl, 'PNG', PAGE_WIDTH - MARGIN_RIGHT - 32, y, 30, 36);
      doc.setDrawColor(11, 37, 69);
      doc.setLineWidth(0.3);
      doc.rect(PAGE_WIDTH - MARGIN_RIGHT - 32, y, 30, 36);
    } catch {}
  }

  // Cartouche Candidat
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(MARGIN_LEFT, y, photoDataUrl ? CONTENT_WIDTH - 38 : CONTENT_WIDTH, 36, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(0, 102, 179);
  doc.text('1. IDENTITÉ DU POSTULANT & COORDONNÉES', MARGIN_LEFT + 4, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`• Nom complet : ${p.nomComplet} (${p.civilite})`, MARGIN_LEFT + 4, y + 12);
  doc.text(`• Nationalité : ${p.nationalite} · Tél : ${p.telephone}`, MARGIN_LEFT + 4, y + 17);
  doc.text(`• Email : ${p.email}`, MARGIN_LEFT + 4, y + 22);
  doc.text(`• Adresse : ${p.adresse}`, MARGIN_LEFT + 4, y + 27);
  doc.text(`• Date d'établissement : ${p.dateEffet}`, MARGIN_LEFT + 4, y + 32);

  y += 42;

  // Cartouche Poste & Conditions
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(MARGIN_LEFT, y, CONTENT_WIDTH, 42, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(0, 102, 179);
  doc.text('2. CARACTÉRISTIQUES DU POSTE VISÉ (COLOMBIE-BRITANNIQUE)', MARGIN_LEFT + 4, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`• Intitulé du poste : ${p.intitulePoste}`, MARGIN_LEFT + 4, y + 12);
  doc.text(`• Classification CNP Canada : ${p.codeCnp} · Département : ${p.departement}`, MARGIN_LEFT + 4, y + 17);
  doc.text(`• Type de contrat : ${p.typeContrat} · Durée essai : ${p.dureePeriodeEssai}`, MARGIN_LEFT + 4, y + 22);
  doc.text(`• Rémunération : ${p.salaireHoraire.toFixed(2)} $ CAD / h (~${p.salaireMensuel.toLocaleString('fr-CA')} $ CAD / mois)`, MARGIN_LEFT + 4, y + 27);
  doc.text(`• Heures hebdomadaires : ${p.heuresHebdo} h / semaine (Normes provinciales Colombie-Britannique)`, MARGIN_LEFT + 4, y + 32);
  doc.text(`• Interlocuteur RH : ${p.managerRecruteur}`, MARGIN_LEFT + 4, y + 37);

  y += 48;

  // Cartouche Session d'Entretien & Modalités
  doc.setFillColor(254, 252, 246);
  doc.setDrawColor(212, 160, 23);
  doc.roundedRect(MARGIN_LEFT, y, CONTENT_WIDTH, 36, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(180, 83, 9);
  doc.text('3. CONVOCATION ET MODALITÉS DE L’ENTRETIEN', MARGIN_LEFT + 4, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`• Date & Heure : ${p.dateEntretien} à ${p.heureEntretien} (Heure Pacifique)`, MARGIN_LEFT + 4, y + 13);
  doc.text(`• Modalité retenue : ${p.modaliteEntretien}`, MARGIN_LEFT + 4, y + 18);
  doc.text(`• Lieu ou Lien d'accès : ${p.lieuEntretien}`, MARGIN_LEFT + 4, y + 23);
  doc.text(`• Code d'accès Candidat : ${p.codeIdCandidature}`, MARGIN_LEFT + 4, y + 28);
  doc.text(`• Statut de convocation : Dossier vérifié et recevable par la Direction RH`, MARGIN_LEFT + 4, y + 33);

  y += 42;

  // Clause tripartite spécifique si Cas 2
  if (p.casType === 'agence') {
    doc.setFillColor(240, 253, 244);
    doc.setDrawColor(34, 197, 94);
    doc.roundedRect(MARGIN_LEFT, y, CONTENT_WIDTH, 26, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(21, 128, 61);
    doc.text('4. ENGAGEMENT DE LIAISON TRIPARTITE & DISPENSE D’ENTRETIEN', MARGIN_LEFT + 4, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(30, 41, 59);
    if (p.dispenseEntretienParGarantie) {
      doc.text(
        `[X] OPTION GARANTIE PRESTATAIRE ACTIVÉE : Le cabinet ${p.nomAgence} certifie l’authenticité des qualifications, antécédents et permis du candidat. Le prestataire se porte garant formel, permettant d’extrapoler l’entretien préliminaire vers la validation contractuelle directe.`,
        MARGIN_LEFT + 4,
        y + 11,
        { maxWidth: CONTENT_WIDTH - 8 }
      );
    } else {
      doc.text(
        `[X] OPTION ENTRETIEN DIRECT RETENUE : Le candidat effectuera l’entretien officiel directement avec l’employeur ${p.nomEntreprise} avec l'assistance et la coordination administrative du cabinet mandataire.`,
        MARGIN_LEFT + 4,
        y + 11,
        { maxWidth: CONTENT_WIDTH - 8 }
      );
    }
    y += 30;
  }

  // Signatures et tampons au bas de la page 1
  const sigY = PAGE_HEIGHT - 48;
  doc.setDrawColor(203, 213, 225);
  doc.line(MARGIN_LEFT, sigY, PAGE_WIDTH - MARGIN_RIGHT, sigY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(11, 37, 69);
  doc.text('Pour l’Employeur (Canada) :', MARGIN_LEFT, sigY + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(p.representantEmployeurNom, MARGIN_LEFT, sigY + 9);
  doc.text(p.representantEmployeurTitre, MARGIN_LEFT, sigY + 13);

  if (cachetDataUrl) {
    try {
      doc.addImage(cachetDataUrl, 'PNG', MARGIN_LEFT + 45, sigY + 2, 20, 20);
    } catch {}
  }
  if (signatureDataUrl) {
    try {
      doc.addImage(signatureDataUrl, 'PNG', MARGIN_LEFT + 68, sigY + 4, 28, 14);
    } catch {}
  }

  doc.setFont('helvetica', 'bold');
  doc.text(p.casType === 'direct' ? 'Le Candidat (Pour Accord) :' : 'Pour l’Agence / Mandataire CRIC :', PAGE_WIDTH / 2 + 10, sigY + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(p.casType === 'direct' ? p.nomComplet : p.representantAgenceNom, PAGE_WIDTH / 2 + 10, sigY + 9);
  doc.text(p.casType === 'direct' ? 'Lu et approuvé' : `Mandataire agréé (${p.permisCnesst})`, PAGE_WIDTH / 2 + 10, sigY + 13);

  // ==========================================
  // PAGE 2 : TICKET D'ENTRETIEN OFFICIEL AVEC PHOTO ET CODE-BARRES
  // ==========================================
  doc.addPage();

  // Double bordure
  doc.setDrawColor(212, 160, 23);
  doc.setLineWidth(0.8);
  doc.rect(15, 15, PAGE_WIDTH - 30, PAGE_HEIGHT - 30);

  y = 25;

  if (logoEmp) {
    try {
      doc.addImage(logoEmp, 'PNG', MARGIN_LEFT, y, 42, 17);
    } catch {}
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(11, 37, 69);
  doc.text('COUPON CONVOCATION ENTRETIEN D’EMBAUCHE', PAGE_WIDTH / 2 + 10, y + 7, { align: 'center' });
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('Direction des Ressources Humaines & Mobilité Internationale Canada', PAGE_WIDTH / 2 + 10, y + 13, { align: 'center' });

  y += 26;

  // Ligne de découpe en pointillés
  doc.setDrawColor(212, 160, 23);
  doc.setLineDashPattern([2, 2], 0);
  doc.line(MARGIN_LEFT, y, PAGE_WIDTH - MARGIN_RIGHT, y);
  doc.setLineDashPattern([], 0);

  y += 8;

  // Si le ticket est non valide (provisoire)
  if (!p.ticketValide) {
    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(239, 68, 68);
    doc.roundedRect(MARGIN_LEFT, y, CONTENT_WIDTH, 24, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(185, 28, 28);
    doc.text('⚠️ TICKET D’ENTRETIEN PROVISOIRE — NON VALIDE POUR ACCÈS', PAGE_WIDTH / 2, y + 7, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(127, 29, 29);
    doc.text(
      'Ce ticket est actuellement un spécimen d’attestation. Il deviendra strictement valide et scannable dès la signature formelle de l’accord tripartite et la confirmation définitive du dossier par la direction RH.',
      PAGE_WIDTH / 2,
      y + 14,
      { align: 'center', maxWidth: CONTENT_WIDTH - 12 }
    );
    y += 30;
  }

  // Grille d'information du ticket
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(MARGIN_LEFT, y, CONTENT_WIDTH, 70, 2, 2, 'FD');

  if (photoDataUrl) {
    try {
      doc.addImage(photoDataUrl, 'PNG', MARGIN_LEFT + 6, y + 6, 26, 32);
      doc.setDrawColor(11, 37, 69);
      doc.rect(MARGIN_LEFT + 6, y + 6, 26, 32);
    } catch {}
  }

  const textStartX = photoDataUrl ? MARGIN_LEFT + 38 : MARGIN_LEFT + 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(11, 37, 69);
  doc.text(`Candidat : ${p.nomComplet}`, textStartX, y + 10);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(`Nationalité : ${p.nationalite} · Tél : ${p.telephone}`, textStartX, y + 16);
  doc.text(`Poste convoqué : ${p.intitulePoste} (CNP ${p.codeCnp})`, textStartX, y + 22);
  doc.text(`Date & Heure : ${p.dateEntretien} à ${p.heureEntretien}`, textStartX, y + 28);
  doc.text(`Modalité : ${p.modaliteEntretien}`, textStartX, y + 34);
  doc.text(`Lieu ou accès : ${p.lieuEntretien}`, textStartX, y + 40);
  doc.text(`Code ID officiel : ${p.codeIdCandidature}`, textStartX, y + 46);

  // Barcode scannable en bas du ticket
  if (p.ticketValide) {
    doc.setFont('courier', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(11, 37, 69);
    doc.text(`* ${p.codeIdCandidature} *`, PAGE_WIDTH / 2, y + 58, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(21, 128, 61);
    doc.text('✓ CODE BARRE NUMÉRIQUE SÉCURISÉ & SCANNABLE EIMT-RH', PAGE_WIDTH / 2, y + 64, { align: 'center' });
  } else {
    doc.setFont('courier', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(156, 163, 175);
    doc.text('XXXX-XXXX-PROVISOIRE-NON-VALIDE', PAGE_WIDTH / 2, y + 58, { align: 'center' });
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(220, 38, 38);
    doc.text('Barcode inactif — En attente de signature tripartite', PAGE_WIDTH / 2, y + 64, { align: 'center' });
  }

  y += 76;

  // Pièces justificatives exigées le jour de l'entretien
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(11, 37, 69);
  doc.text('DOCUMENTS REQUIS À PRÉSENTER LE JOUR DE L’ÉCHANGE :', MARGIN_LEFT, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  const checklist = [
    '1. Pièce d’identité officielle en cours de validité (Passeport international ou Carte nationale)',
    '2. Permis de conduire et certifications professionnelles en lien avec le poste convoqué',
    '3. Justificatifs d’expériences antérieures (certificats de travail ou attestations d’employeurs)',
    '4. Le présent Coupon de Convocation dument complété et signé'
  ];
  checklist.forEach((item) => {
    doc.text(item, MARGIN_LEFT + 4, y);
    y += 5;
  });

  const filename = `Dossier_Postulant_${p.nom.toUpperCase()}_${p.prenom}_${p.codeIdCandidature}.pdf`;
  return { doc, filename };
}
