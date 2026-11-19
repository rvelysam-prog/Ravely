/**
 * Service complet de gestion des dossiers de postulants et kits d'entretien
 * Supporte le Recrutement en Direct (Cas 1) et via Agence de Placement (Cas 2).
 * Inclut la génération de PDF vectoriels, templates emails responsive et persistance Firestore.
 */

import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { SiteSettings } from '../types';
import { CONTRACT_STATIC_ASSETS, loadStaticImageAsPngDataUrl } from './contractPdfGenerator';
import { saveInterviewSession, TicketEntretienData } from './contractGenerationService';
import type { LayoutTemplatesMap, ReferenceLayoutTemplate } from './layoutImitationService';
import type { PdfImportedAssetsConfig, UploadedAssetUrlsMap } from './departmentsAndEmailService';
import {
  DocEsPreloadedImages,
  FichesDocEsData,
  KitDocHeaderMap,
  KitDocLayoutMap,
  KitDocVisualScopeMap,
  buildDefaultFichesDocEsData,
  loadStoredFichesDocEsSync,
  getDocEsModelsForCasType,
  getDocEsActorRequirement,
  resolveActorAssetsForDocEsModel,
  renderDocEsPlainText,
  resolveLayoutTemplateForDocEsModel,
  preloadDocEsModelVisuals,
  generateKitDocEsCompiledPdf,
  generateKitDocEsIndividualPdfsAsync
} from './fichesEtDocEsService';

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

export interface PostulantKitGenerationOptions {
  uploadedAssets?: UploadedAssetUrlsMap;
  assetsConfig?: PdfImportedAssetsConfig;
  layoutTemplates?: LayoutTemplatesMap;
  kitDocLayouts?: KitDocLayoutMap;
  kitDocHeaders?: KitDocHeaderMap;
  kitDocVisualScopes?: KitDocVisualScopeMap;
}

/**
 * Génère le PDF complet du Kit Candidat constitué de l'ensemble des documents PDF
 * énumérés dans "Fiches et DOC ES" selon le type de candidature ('direct' : Modèles 1 à 8 | 'agence' : Modèles 9 à 15),
 * avec mise en page par document, modèle d'en-tête dédié et intégration stricte des visuels "3. Visuels, Logos & Tampons (6 Parties)".
 */
export async function generatePostulantKitPdf(
  p: PostulantInfo,
  settings: SiteSettings,
  customTextOverride?: string,
  docEsDataOverride?: FichesDocEsData,
  layoutTemplate?: ReferenceLayoutTemplate,
  kitOptions?: PostulantKitGenerationOptions
): Promise<{ doc: jsPDF; filename: string }> {
  const effectiveDocEsData =
    docEsDataOverride ||
    loadStoredFichesDocEsSync(p.id, buildDefaultFichesDocEsData(p, settings));

  const models = getDocEsModelsForCasType(p.casType);
  const mergedLayoutTemplates: LayoutTemplatesMap = {
    ...(kitOptions?.layoutTemplates || {}),
    ...(layoutTemplate ? { doc_es: layoutTemplate } : {})
  };

  const perModelLayouts: Record<number, ReferenceLayoutTemplate> = {};
  const perModelImages: Record<number, DocEsPreloadedImages> = {};

  await Promise.all(
    models.map(async (m) => {
      perModelLayouts[m.id] = resolveLayoutTemplateForDocEsModel(
        m.id,
        mergedLayoutTemplates,
        kitOptions?.kitDocLayouts,
        layoutTemplate || mergedLayoutTemplates.doc_es,
        kitOptions?.kitDocHeaders
      );
      perModelImages[m.id] = await preloadDocEsModelVisuals(
        m.id,
        p,
        kitOptions?.uploadedAssets,
        kitOptions?.assetsConfig,
        kitOptions?.kitDocVisualScopes?.[m.id]
      );
    })
  );

  // Résoudre aussi les visuels de la page de couverture sans jamais mélanger Employeur et Cabinet CRIC
  const firstModelId = models[0]?.id || (p.casType === 'agence' ? 9 : 1);
  const coverImages: DocEsPreloadedImages = perModelImages[firstModelId]
    ? { ...perModelImages[firstModelId] }
    : await preloadDocEsModelVisuals(
        firstModelId,
        p,
        kitOptions?.uploadedAssets,
        kitOptions?.assetsConfig,
        kitOptions?.kitDocVisualScopes?.[firstModelId]
      );

  try {
    if (!coverImages.logoEmp && p.logoUrl) {
      coverImages.logoEmp = await loadStaticImageAsPngDataUrl(p.logoUrl);
    }
    if (p.casType === 'agence' && !coverImages.logoAgence && p.logoAgenceUrl) {
      coverImages.logoAgence = await loadStaticImageAsPngDataUrl(p.logoAgenceUrl);
    }
    if (!coverImages.cachet && p.cachetUrl && p.casType !== 'agence') {
      coverImages.cachet = await loadStaticImageAsPngDataUrl(p.cachetUrl);
    }
    if (!coverImages.signature && p.signatureUrl && p.casType !== 'agence') {
      coverImages.signature = await loadStaticImageAsPngDataUrl(p.signatureUrl);
    }
    if (!coverImages.photo && p.photoUrl) {
      coverImages.photo = await loadStaticImageAsPngDataUrl(p.photoUrl);
    }
  } catch {}

  const { doc, filename } = generateKitDocEsCompiledPdf(
    p,
    effectiveDocEsData,
    settings,
    layoutTemplate || mergedLayoutTemplates.doc_es,
    coverImages,
    customTextOverride,
    perModelLayouts,
    perModelImages
  );

  return { doc, filename };
}

/**
 * Génère l'archive ZIP contenant tous les PDF individuels "Fiches et DOC ES" + le Kit PDF compilé
 * correspondant au type de candidature ('direct' vs 'agence'), avec mise en page, en-têtes et visuels 6 Parties.
 */
export async function generateKitCandidatZipPackage(
  p: PostulantInfo,
  settings: SiteSettings,
  docEsDataOverride?: FichesDocEsData,
  layoutTemplate?: ReferenceLayoutTemplate,
  customTextOverride?: string,
  kitOptions?: PostulantKitGenerationOptions
): Promise<{ zipBlob: Blob; zipFilename: string; pdfCount: number }> {
  const effectiveDocEsData =
    docEsDataOverride ||
    loadStoredFichesDocEsSync(p.id, buildDefaultFichesDocEsData(p, settings));

  const mergedLayoutTemplates: LayoutTemplatesMap = {
    ...(kitOptions?.layoutTemplates || {}),
    ...(layoutTemplate ? { doc_es: layoutTemplate } : {})
  };

  const compiled = await generatePostulantKitPdf(
    p,
    settings,
    customTextOverride,
    effectiveDocEsData,
    layoutTemplate,
    kitOptions
  );
  const individuals = await generateKitDocEsIndividualPdfsAsync(
    p,
    effectiveDocEsData,
    settings,
    mergedLayoutTemplates,
    kitOptions?.kitDocLayouts,
    kitOptions?.uploadedAssets,
    kitOptions?.assetsConfig,
    kitOptions?.kitDocVisualScopes,
    kitOptions?.kitDocHeaders
  );

  const zip = new JSZip();
  const modeTag = p.casType === 'agence' ? 'Agence_Placement' : 'Candidature_Directe';
  const safeName = (p.nomComplet || p.nom || 'Candidat').replace(/[^a-zA-Z0-9_-]+/g, '_');
  const rootName = `Kit_${safeName}_${modeTag}_${p.codeIdCandidature}`;
  const folder = zip.folder(rootName) || zip;

  folder.file(`00_${compiled.filename}`, compiled.doc.output('blob'));
  individuals.forEach((item, idx) => {
    const prefix = String(idx + 1).padStart(2, '0');
    folder.file(`${prefix}_${item.filename}`, item.doc.output('blob'));
  });

  const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  return {
    zipBlob,
    zipFilename: `${rootName}.zip`,
    pdfCount: individuals.length + 1
  };
}

/**
 * Construit le contenu HTML complet (multi-sections) du Kit Candidat pour export Word (.docx) / HTML.
 */
export function buildKitCandidatWordHtml(
  p: PostulantInfo,
  d: FichesDocEsData,
  settings: SiteSettings,
  customTextOverride?: string,
  kitOptions?: PostulantKitGenerationOptions
): string {
  const models = getDocEsModelsForCasType(p.casType);
  const isAgence = p.casType === 'agence';

  const tocItems = models
    .map(
      (m) =>
        `<li><strong>${m.number}</strong> — ${m.title} <em>(${m.categoryLabel}${m.isInteractive ? ' · Formulaire interactif' : ''})</em></li>`
    )
    .join('');

  const sectionsHtml = models
    .map((m) => {
      const rendered = renderDocEsPlainText(m.id, p, d, settings);
      const docTpl = resolveLayoutTemplateForDocEsModel(
        m.id,
        kitOptions?.layoutTemplates,
        kitOptions?.kitDocLayouts,
        kitOptions?.layoutTemplates?.doc_es,
        kitOptions?.kitDocHeaders
      );
      const actorReq = getDocEsActorRequirement(m.id);
      const visuals = resolveActorAssetsForDocEsModel(
        m.id,
        p,
        kitOptions?.uploadedAssets,
        kitOptions?.assetsConfig,
        kitOptions?.kitDocVisualScopes?.[m.id]
      );
      const primaryColor = docTpl?.primaryColor || '#0B2545';
      const accentColor = docTpl?.accentColor || '#0066B3';
      const headerMode = docTpl?.spatialBlueprint?.headerLayout || 'split_lr';
      const cleanBody = rendered.content
        .replace(/^[=\-_]{4,}\s*$/gm, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      const headerHtml =
        headerMode === 'filled_banner'
          ? `<div style="background:${docTpl?.headerBgColor || primaryColor}; color:#ffffff; padding:12px 14px; border-bottom:3px solid ${accentColor}; margin-bottom:12px;">
               <div style="font-size:11pt; font-weight:bold;">${visuals.primaryEntityName}</div>
               <div style="font-size:8.5pt; opacity:0.85;">${visuals.primarySubLine} · ${actorReq.badgeLabel}</div>
             </div>`
          : headerMode === 'centered_stack'
          ? `<div style="text-align:center; border-bottom:2px solid ${primaryColor}; padding-bottom:8px; margin-bottom:12px;">
               <div style="font-size:11.5pt; font-weight:bold; color:${primaryColor};">${visuals.primaryEntityName}</div>
               <div style="font-size:8.5pt; color:#475569;">${visuals.primarySubLine} · Réf. ${d.referenceDossier}</div>
             </div>`
          : `<div style="border-bottom:2px solid ${accentColor}; padding-bottom:8px; margin-bottom:12px;">
               <div style="font-size:11pt; font-weight:bold; color:${primaryColor};">${visuals.primaryEntityName}${visuals.secondaryEntityName ? ` &amp; ${visuals.secondaryEntityName}` : ''}</div>
               <div style="font-size:8.5pt; color:#475569;">${visuals.primarySubLine} · ${actorReq.badgeLabel}</div>
             </div>`;
      return `
        <div style="page-break-before: always; border: 1.5px solid ${accentColor}; border-top: 5px solid ${primaryColor}; padding: 20px; margin-top: 24px;">
          ${headerHtml}
          <p style="font-size: 9pt; font-weight: bold; color: ${accentColor}; margin: 0 0 4px 0;">${m.number} · ${m.categoryLabel}</p>
          <h2 style="font-size: 14pt; color: ${primaryColor}; margin: 0 0 4px 0;">${rendered.title}</h2>
          <p style="font-size: 9.5pt; color: #475569; margin: 0 0 12px 0;">${rendered.subtitle}</p>
          <div style="white-space: pre-wrap; font-family: Calibri, Arial, sans-serif; font-size: 10.5pt; line-height: 1.5; color: #1e293b;">${cleanBody}</div>
        </div>
      `;
    })
    .join('');

  return `
    <div style="font-family: Calibri, Arial, sans-serif; color: #0f172a;">
      <h1 style="text-align: center; color: #0B2545; font-size: 16pt;">
        ${isAgence ? 'KIT CANDIDAT — CANDIDATURE VIA AGENCE DE PLACEMENT' : 'KIT CANDIDAT — CANDIDATURE EN DIRECT'}
      </h1>
      <p style="text-align: center; color: #475569; font-size: 10pt;">
        Réf. ${p.codeIdCandidature} · ${p.nomComplet} · ${p.intitulePoste} (CNP ${p.codeCnp})
      </p>
      <p><strong>Documents PDF inclus issus de « Fiches et DOC ES » (${models.length} documents) :</strong></p>
      <ul>${tocItems}</ul>
      ${customTextOverride ? `<div style="background:#fef9c3; padding:10px; border:1px solid #eab308; margin:12px 0;">${customTextOverride}</div>` : ''}
      ${sectionsHtml}
    </div>
  `;
}
