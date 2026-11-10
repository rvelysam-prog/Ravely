import { jsPDF } from 'jspdf';
import { collection, doc, getDocs, setDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { SiteSettings } from '../types';
import {
  OFFICIAL_DEPARTMENTS,
  findDepartmentDefinition,
  getSavedCustomCachet,
  getSavedCustomSignature
} from './departmentsAndEmailService';
import { loadStaticImageAsPngDataUrl, CONTRACT_STATIC_ASSETS } from './contractPdfGenerator';
import QRCode from 'qrcode';
import { generateSmallStackedBarcodeCanvasDataUrl } from './contractGenerationService';

export interface JobOfferData {
  id: string;
  reference: string;
  datePublication: string; // ex: "06 Novembre 2026"
  datePublicationIso?: string; // ex: "2026-11-06"
  heurePublication?: string; // ex: "14:30"
  titrePoste: string;
  departement: string;
  typeContrat: string;
  lieuTravail: string;
  horaires: string;
  presentationSociete: string;
  rattachementHierarchique: string;
  missionPrincipale: string;
  missionsDetaillees: string[];
  profilRequis: string;
  experienceRequise: string;
  qualitesHumaines: string[];
  // Normes salariales & normes canadiennes
  salaireMin: number;
  salaireMax: number;
  devise: string; // 'CAD'
  typeRemuneration: 'horaire' | 'annuel' | 'mensuel';
  periodicitePaie: string; // 'Bi-hebdomadaire (toutes les 2 semaines)'
  heuresHebdo: string; // '40 heures / semaine (Temps plein)'
  regimeHeuresSup: string; // 'Majorées à 150% (1.5x) après 8h/j ou 40h/semaine (Loi Colombie-Britannique)'
  avantagesSociaux: string[];
  remuneration: string; // Synthèse éditable affichée sur le document
  // Coordonnées et entreprise
  contactEmail: string;
  contactTelephone: string;
  contactAdresse: string;
  companyName: string;
  // Cachet & Signature
  afficherSignature: boolean;
  afficherCachet: boolean;
  signatureUrl?: string;
  cachetUrl?: string;
  // Publication sur le site public ("Nos offres")
  estPublie: boolean;
  publishedAt?: string;
  nombrePostesDisponibles?: number;
}

export interface PosteOption {
  titre: string;
  departement: string;
  codeDepartement: string;
}

const LOCAL_STORAGE_OFFERS_KEY = 'atlantic_job_offers_v2';

/**
 * Générateur de numéro de référence aléatoire réaliste selon les standards de transport & logistique canadiens
 */
export function generateRandomReference(deptCode?: string): string {
  const year = new Date().getFullYear();
  const prefixes = ['OFFRE-ATL', 'REF-ATL', 'REC-ATL', 'CAR-ATL', 'POSTE-ATL'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const cleanDept = (deptCode || 'EXP').replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase();
  const randomNum = Math.floor(100 + Math.random() * 900);
  const letterCode = String.fromCharCode(65 + Math.floor(Math.random() * 26));

  const templates = [
    `${prefix}-${year}-${cleanDept}-${randomNum}`,
    `${prefix}-BC-${cleanDept}-${randomNum}`,
    `OFFRE-${cleanDept}-${year}-${randomNum}${letterCode}`,
    `REF-ATL-${year}-${randomNum}`
  ];

  return templates[Math.floor(Math.random() * templates.length)];
}

/**
 * Formate une date ISO (AAAA-MM-JJ) en date lisible en français
 */
export function formatIsoToFrenchDate(isoDateStr: string): string {
  if (!isoDateStr) return '';
  const parts = isoDateStr.split('-');
  if (parts.length === 3) {
    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const months = [
      'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
      'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
    ];
    const monthName = months[monthIndex] || parts[1];
    return `${String(day).padStart(2, '0')} ${monthName} ${year}`;
  }
  return isoDateStr;
}

/**
 * Avantages sociaux complets conformes aux normes du travail au Canada et en Colombie-Britannique
 */
export const CANADIAN_STANDARD_BENEFITS: string[] = [
  "Assurance collective santé, soins dentaires, optique & télémédecine payée par l'employeur",
  "Régime Enregistré d'Épargne-Retraite (REER collectif) avec abondement employeur jusqu'à 5%",
  "3 semaines de congés payés dès la 1ère année + jours fériés provinciaux et fédéraux rémunérés",
  "Prime de sécurité routière, performance opérationnelle et assiduité versée chaque semestre",
  "Allocation annuelle pour bottes de sécurité homologuées CSA et Équipements de Protection Individuelle (EPI)",
  "Programme d'Aide aux Employés et à leur Famille (PAEF) confidentiel disponible 24/7",
  "Prise en charge intégrale des formations continues et du renouvellement des permis & cartes professionnelles"
];

/**
 * Grille de rémunération canadienne réaliste par catégorie de poste (taux horaire en $ CAD / heure)
 */
function getCanadianSalaryBenchmark(posteTitle: string): {
  min: number;
  max: number;
  type: 'horaire' | 'annuel' | 'mensuel';
  heures: string;
} {
  const norm = (posteTitle || '').toLowerCase();

  if (norm.includes('conducteur') || norm.includes('chauffeur') || norm.includes('routier')) {
    return { min: 28.5, max: 35.0, type: 'horaire', heures: '40 à 50 heures / semaine (selon trajets et repos légaux)' };
  }
  if (norm.includes('cariste') || norm.includes('magasinier') || norm.includes('manutention')) {
    return { min: 24.0, max: 28.5, type: 'horaire', heures: '40 heures / semaine (du lundi au vendredi)' };
  }
  if (norm.includes('préparateur') || norm.includes('préparatrice')) {
    return { min: 23.5, max: 27.5, type: 'horaire', heures: '40 heures / semaine' };
  }
  if (norm.includes('douane') || norm.includes('déclarant') || norm.includes('transit')) {
    return { min: 32.0, max: 42.0, type: 'horaire', heures: '40 heures / semaine (du lundi au vendredi)' };
  }
  if (norm.includes('infirmier') || norm.includes('santé') || norm.includes('ssmt')) {
    return { min: 42.0, max: 52.0, type: 'horaire', heures: '37.5 à 40 heures / semaine' };
  }
  if (norm.includes('agent de santé') || norm.includes('sécurité au travail') || norm.includes('qhse')) {
    return { min: 34.0, max: 44.0, type: 'horaire', heures: '40 heures / semaine' };
  }
  if (norm.includes('mécanicien') || norm.includes('technicien') || norm.includes('atelier')) {
    return { min: 35.0, max: 45.0, type: 'horaire', heures: '40 heures / semaine (du lundi au vendredi)' };
  }
  if (norm.includes('exploitant') || norm.includes('dispatcher') || norm.includes('répartiteur')) {
    return { min: 30.0, max: 38.0, type: 'horaire', heures: '40 heures / semaine (planning par roulement)' };
  }
  if (norm.includes('chef') || norm.includes('responsable') || norm.includes('directeur') || norm.includes('manager')) {
    return { min: 78000, max: 98000, type: 'annuel', heures: '40 heures / semaine (Statut cadre)' };
  }
  if (norm.includes('commercial') || norm.includes('pricing') || norm.includes('ventes')) {
    return { min: 62000, max: 82000, type: 'annuel', heures: '40 heures / semaine + commissions' };
  }
  if (norm.includes('comptable') || norm.includes('rh') || norm.includes('juriste') || norm.includes('it')) {
    return { min: 32.0, max: 44.0, type: 'horaire', heures: '40 heures / semaine (du lundi au vendredi)' };
  }

  return { min: 26.0, max: 34.0, type: 'horaire', heures: '40 heures / semaine' };
}

/**
 * Construit la description synthétique de rémunération selon les normes canadiennes
 */
export function buildSynthesizedRemunerationText(
  min: number,
  max: number,
  type: 'horaire' | 'annuel' | 'mensuel',
  heuresSup: string
): string {
  let baseText = '';
  if (type === 'horaire') {
    baseText = `Rémunération horaire : ${min.toFixed(2)} $ à ${max.toFixed(2)} $ CAD / heure selon profil et expérience (paie bimensuelle aux deux semaines).`;
  } else if (type === 'annuel') {
    baseText = `Rémunération annuelle : ${min.toLocaleString('fr-CA')} $ à ${max.toLocaleString('fr-CA')} $ CAD par an (selon qualifications et expérience).`;
  } else {
    baseText = `Rémunération mensuelle : ${min.toLocaleString('fr-CA')} $ à ${max.toLocaleString('fr-CA')} $ CAD / mois.`;
  }

  const overtime = heuresSup || "Heures supplémentaires majorées à 150% (1,5x) au-delà de 8h/jour ou 40h/semaine.";
  const benefits = "Avantages sociaux complets : assurance santé & dentaire payée par l'employeur, REER collectif abondé jusqu'à 5%, 3 semaines de congés payés, primes et allocation EPI.";

  return `${baseText} ${overtime} ${benefits}`;
}

/**
 * Récupère l'ensemble de tous les postes disponibles actuellement sur le site
 */
export function getAllAvailablePostes(): PosteOption[] {
  const list: PosteOption[] = [];
  for (const dept of OFFICIAL_DEPARTMENTS) {
    if (Array.isArray(dept.postesDetail) && dept.postesDetail.length > 0) {
      for (const p of dept.postesDetail) {
        list.push({
          titre: p.titre,
          departement: dept.name,
          codeDepartement: dept.code
        });
      }
    } else if (Array.isArray(dept.postesLies)) {
      for (const title of dept.postesLies) {
        list.push({
          titre: title,
          departement: dept.name,
          codeDepartement: dept.code
        });
      }
    }
  }
  return list;
}

/**
 * Déduit le supérieur hiérarchique approprié pour un poste/département
 */
function getSuperiorHierarchyForPoste(posteTitle: string, deptName: string): string {
  const normTitle = (posteTitle || '').toLowerCase();
  const normDept = (deptName || '').toLowerCase();

  if (normTitle.includes('conducteur') || normTitle.includes('chauffeur') || normTitle.includes('routier')) {
    return "au responsable d'exploitation";
  }
  if (normTitle.includes('exploitant') || normTitle.includes('dispatcher') || normTitle.includes('répartiteur')) {
    return "au directeur des opérations de transport";
  }
  if (normTitle.includes('chef de quai')) {
    return "au responsable d'exploitation transport";
  }
  if (normTitle.includes('cariste') || normTitle.includes('magasinier') || normTitle.includes('préparateur') || normTitle.includes('préparatrice')) {
    return "au chef d'équipe logistique et au responsable d'entrepôt";
  }
  if (normTitle.includes('stock') || normTitle.includes('agent logistique')) {
    return "au responsable de la gestion des stocks et d'entrepôt";
  }
  if (normTitle.includes('douane') || normTitle.includes('transit') || normTitle.includes('import')) {
    return "au responsable des opérations douanières et transit international";
  }
  if (normTitle.includes('mécanicien') || normTitle.includes('technicien') || normTitle.includes('flotte')) {
    return "au chef d'atelier de maintenance et responsable du parc automobile";
  }
  if (normTitle.includes('santé') || normTitle.includes('infirmier') || normTitle.includes('ssmt') || normDept.includes('ssmt')) {
    return "au coordonnateur santé, sécurité et mieux-être au travail (SSMT)";
  }
  if (normTitle.includes('qhse') || normTitle.includes('qualité') || normTitle.includes('sécurité')) {
    return "au directeur de la qualité, sécurité et environnement (QHSE)";
  }
  if (normTitle.includes('commercial') || normTitle.includes('pricing') || normTitle.includes('affaires')) {
    return "au directeur du développement commercial";
  }
  if (normTitle.includes('client') || normTitle.includes('litiges')) {
    return "au responsable du service relation clients et litiges";
  }
  if (normTitle.includes('rh') || normTitle.includes('recrutement') || normTitle.includes('paie')) {
    return "à la direction des ressources humaines";
  }
  if (normTitle.includes('comptable') || normTitle.includes('gestion') || normTitle.includes('finance')) {
    return "au directeur administratif et financier";
  }
  if (normTitle.includes('juriste') || normTitle.includes('juridique')) {
    return "au directeur des affaires juridiques et conformité";
  }
  if (normTitle.includes('achat') || normTitle.includes('approvisionnement')) {
    return "au responsable des achats et approvisionnements";
  }
  if (normTitle.includes('it') || normTitle.includes('système') || normTitle.includes('développeur')) {
    return "au responsable des systèmes d'information (DSI)";
  }

  return "au responsable de département";
}

/**
 * Déduit la mission principale synthétique d'un poste
 */
function getMainMissionForPoste(posteTitle: string): string {
  const normTitle = (posteTitle || '').toLowerCase();

  if (normTitle.includes('conducteur') || normTitle.includes('chauffeur') || normTitle.includes('routier')) {
    return "réaliser le transport et la livraison sécurisée des marchandises dans le respect strict des réglementations routières et des consignes d'exploitation.";
  }
  if (normTitle.includes('exploitant') || normTitle.includes('dispatcher')) {
    return "planifier, organiser et optimiser l'ensemble des tournées de transport en veillant au respect des délais et de la rentabilité opérationnelle.";
  }
  if (normTitle.includes('cariste') || normTitle.includes('magasinier')) {
    return "assurer la manutention, le déchargement, le stockage en hauteur et l'approvisionnement des marchandises dans le respect absolu des règles de sécurité.";
  }
  if (normTitle.includes('préparateur') || normTitle.includes('préparatrice')) {
    return "rassembler, conditionner et étiqueter les articles commandés avec rigueur et rapidité avant leur expédition aux clients.";
  }
  if (normTitle.includes('douane') || normTitle.includes('déclarant')) {
    return "gérer les déclarations douanières import/export et garantir la conformité intégrale des dossiers auprès des autorités frontalières (CBSA/ASFC).";
  }
  if (normTitle.includes('transit')) {
    return "coordonner l'acheminement international multimodal des cargaisons (mer, air, route) et gérer la documentation d'expédition.";
  }
  if (normTitle.includes('infirmier')) {
    return "assurer le suivi de la santé au travail des collaborateurs, prodiguer les premiers soins et déployer les actions de prévention ergonomique.";
  }
  if (normTitle.includes('mécanicien')) {
    return "assurer l'entretien préventif et curatif des véhicules moteurs et remorques pour garantir la sécurité et la disponibilité de la flotte.";
  }
  if (normTitle.includes('commercial')) {
    return "développer le portefeuille clients, négocier les offres de fret et promouvoir nos solutions logistiques et douanières.";
  }

  return "coordonner et exécuter les activités opérationnelles du service dans le respect des normes d'excellence d'Atlantic Transport Ltd.";
}

/**
 * Déduit le profil requis selon la spécialité
 */
function getRequiredProfileForPoste(posteTitle: string): string {
  const normTitle = (posteTitle || '').toLowerCase();

  if (normTitle.includes('conducteur') || normTitle.includes('chauffeur') || normTitle.includes('routier')) {
    return "Vous devez être titulaire d'un permis poids lourd valide (Permis Classe 1 au Canada ou Permis EC / SPL), avec formation continue à jour (FIMO/FCO ou équivalent). La détention de la mention matières dangereuses (TMD / ADR colisage) est un atout déterminant. Vous justifiez idéalement d'une expérience similaire réussie vous ayant permis de développer une connaissance forte du métier.";
  }
  if (normTitle.includes('cariste') || normTitle.includes('magasinier')) {
    return "Vous possédez une certification cariste valide (CACES 1, 3, 5 ou accréditation professionnelle équivalente de conduite de chariots élévateurs). Vous justifiez d'une première expérience réussie en entrepôt logistique et maîtrisez l'utilisation des terminaux scanner radiofréquence (WMS).";
  }
  if (normTitle.includes('préparateur') || normTitle.includes('préparatrice')) {
    return "Idéalement doté(e) d'une première expérience en préparation de commandes, logistique de distribution ou commerce de gros. Débutants rigoureux et motivés acceptés avec formation assurée en interne.";
  }
  if (normTitle.includes('douane') || normTitle.includes('déclarant')) {
    return "Formation supérieure en transport, logistique internationale ou douane (Bac+2/Bac+3 ou équivalent). Vous justifiez d'au moins 2 ans d'expérience dans la rédaction des déclarations douanières et maîtrisez le tarif douanier (Système Harmonisé) ainsi que les procédures CBSA / OEA.";
  }
  if (normTitle.includes('infirmier')) {
    return "Titulaire du diplôme d'État d'Infirmier avec autorisation d'exercice en règle. Une spécialisation ou expérience avérée en santé au travail ou médecine préventive en milieu industriel/logistique est exigée.";
  }
  if (normTitle.includes('mécanicien')) {
    return "Diplôme en mécanique poids lourds, véhicules industriels ou engins de chantier (DEP/CAP/Bac Pro ou équivalent). Vous justifiez d'une expérience pratique en diagnostic électronique, pneumatique et hydraulique.";
  }

  return "Formation professionnelle ou diplôme correspondant à la spécialité. Vous justifiez d'une expérience pertinente vous ayant permis de développer une excellente maîtrise des exigences du poste.";
}

/**
 * Construit une offre d'emploi par défaut pour un poste donné
 */
export function buildDefaultJobOfferForPoste(
  posteTitle: string,
  deptName?: string,
  settings?: SiteSettings
): JobOfferData {
  const cleanPoste = (posteTitle || '').trim();
  const allPostes = getAllAvailablePostes();
  const match = allPostes.find(
    (p) => p.titre.toLowerCase() === cleanPoste.toLowerCase()
  ) || allPostes[0];

  const resolvedDept = deptName || match?.departement || 'DEPARTEMENT EXPLOITATION TRANSPORT';
  const resolvedTitle = cleanPoste || match?.titre || 'Conducteur Routier International';
  const deptCode = match?.codeDepartement || 'EXP';

  // Format avec mention (H/F)
  const formattedTitle = resolvedTitle.includes('(H/F)')
    ? resolvedTitle
    : `${resolvedTitle} (H/F)`;

  // Récupération des missions détaillées
  let missions: string[] = [];
  const deptDef = findDepartmentDefinition(resolvedDept);
  if (deptDef && deptDef.postesDetail) {
    const pDef = deptDef.postesDetail.find(
      (p) => p.titre.toLowerCase() === resolvedTitle.toLowerCase()
    );
    if (pDef && Array.isArray(pDef.missions) && pDef.missions.length > 0) {
      missions = [...pDef.missions];
    }
  }

  if (missions.length === 0) {
    missions = [
      "Organiser l'activité quotidienne selon le planning transmis par la direction opérationnelle.",
      "Respecter scrupuleusement les consignes de sécurité, les procédures internes et la réglementation en vigueur.",
      "Assurer le suivi qualitatif des prestations et veiller à l'intégrité du matériel et des marchandises confiées.",
      "Communiquer régulièrement avec la hiérarchie et signaler immédiatement toute anomalie ou difficulté rencontrée.",
      "Participer activement à la démarche d'amélioration continue et à la satisfaction client."
    ];
  }

  const companyName = settings?.company_name || 'ATLANTIC TRANSPORT LTD.';
  const contactEmail = settings?.email || 'atlantictransport.int.contact@ik.me';
  const contactPhone = settings?.phone || '+15068022206';
  const contactAdresse = settings?.address || 'King George Blvd, Surrey, BC V3T 2W1, Canada';

  const defaultPresentation = `${companyName} est implantée à Surrey, en Colombie-Britannique (Canada) depuis de nombreuses années. Nous exploitons une flotte moderne de véhicules moteurs et d'équipements logistiques de pointe. Transitaire et commissionnaire en douane agréé CBSA / OEA, nous développons nos activités au Canada, en Amérique du Nord et à l'international.`;

  const rattachement = getSuperiorHierarchyForPoste(resolvedTitle, resolvedDept);
  const missionPrincipale = getMainMissionForPoste(resolvedTitle);
  const profilRequis = getRequiredProfileForPoste(resolvedTitle);

  const qualitesHumaines = [
    "Votre sérieux et votre respect des consignes de sécurité sont des atouts majeurs pour mener à bien cette mission.",
    "Vous êtes ponctuel, poli, courtois et vous savez communiquer.",
    "Organisé(e) et rigoureux (se), vous souhaitez évoluer dans une structure très dynamique.",
    "Vous êtes volontaire et vous savez travailler en équipe."
  ];

  const now = new Date();
  const datePublicationIso = now.toISOString().slice(0, 10); // AAAA-MM-JJ
  const datePublication = formatIsoToFrenchDate(datePublicationIso);

  const refCode = generateRandomReference(deptCode);
  const salaryBenchmark = getCanadianSalaryBenchmark(resolvedTitle);
  const regimeHeuresSup = "Heures supplémentaires majorées à 150% (1,5x) au-delà de 8h/jour ou 40h/semaine (Loi sur les normes d'emploi de la Colombie-Britannique).";
  const remuneration = buildSynthesizedRemunerationText(
    salaryBenchmark.min,
    salaryBenchmark.max,
    salaryBenchmark.type,
    regimeHeuresSup
  );

  return {
    id: `offer_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    reference: refCode,
    datePublication,
    datePublicationIso,
    titrePoste: formattedTitle,
    departement: resolvedDept,
    typeContrat: 'Contrat à Durée Indéterminée (CDI) — Temps Plein',
    lieuTravail: 'Surrey, Colombie-Britannique (Canada)',
    horaires: salaryBenchmark.heures,
    presentationSociete: defaultPresentation,
    rattachementHierarchique: rattachement,
    missionPrincipale,
    missionsDetaillees: missions,
    profilRequis,
    experienceRequise: '1 à 3 ans d’expérience souhaitée sur poste similaire',
    qualitesHumaines,
    salaireMin: salaryBenchmark.min,
    salaireMax: salaryBenchmark.max,
    devise: 'CAD',
    typeRemuneration: salaryBenchmark.type,
    periodicitePaie: 'Bi-hebdomadaire (toutes les deux semaines)',
    heuresHebdo: '40 heures / semaine (Temps plein)',
    regimeHeuresSup,
    avantagesSociaux: [...CANADIAN_STANDARD_BENEFITS],
    remuneration,
    contactEmail,
    contactTelephone: contactPhone,
    contactAdresse,
    companyName,
    afficherSignature: true,
    afficherCachet: true,
    signatureUrl: CONTRACT_STATIC_ASSETS.signature,
    cachetUrl: CONTRACT_STATIC_ASSETS.cachet,
    estPublie: false,
    nombrePostesDisponibles: 2
  };
}

/**
 * Génère le document PDF vectoriel A4 ultra-fidèle au modèle fourni (jsPDF)
 * Intègre le logo officiel, le cachet et la signature de l'entreprise
 */
export async function generateJobOfferPdf(
  offer: JobOfferData,
  customLogoUrl?: string
): Promise<{ doc: jsPDF; filename: string; dataUri: string }> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  const PAGE_WIDTH = 210;
  const PAGE_HEIGHT = 297;
  const MARGIN_LEFT = 22;
  const MARGIN_RIGHT = 22;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT; // 166 mm

  // Chargement des images statiques
  let logoDataUrl = '';
  let signatureDataUrl = '';
  let cachetDataUrl = '';

  try {
    const rawLogoUrl = customLogoUrl || CONTRACT_STATIC_ASSETS.logoAtlantic;
    logoDataUrl = await loadStaticImageAsPngDataUrl(rawLogoUrl);
  } catch {
    // Ignore logo loading error
  }

  if (offer.afficherSignature) {
    try {
      const sigUrl = offer.signatureUrl || getSavedCustomSignature() || CONTRACT_STATIC_ASSETS.signature;
      signatureDataUrl = await loadStaticImageAsPngDataUrl(sigUrl);
    } catch {
      // Ignore signature loading error
    }
  }

  if (offer.afficherCachet) {
    try {
      const cchUrl = offer.cachetUrl || getSavedCustomCachet() || CONTRACT_STATIC_ASSETS.cachet;
      cachetDataUrl = await loadStaticImageAsPngDataUrl(cchUrl);
    } catch {
      // Ignore cachet loading error
    }
  }

  // 1. Fond blanc propre
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 'F');

  let currentY = 16;

  // 2. Logo officiel en haut à gauche
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'PNG', MARGIN_LEFT, currentY, 44, 18);
    } catch {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(11, 37, 69);
      doc.text(offer.companyName, MARGIN_LEFT, currentY + 10);
    }
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(11, 37, 69);
    doc.text(offer.companyName, MARGIN_LEFT, currentY + 10);
  }

  // Date et Réf en haut à droite
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Réf : ${offer.reference}`, PAGE_WIDTH - MARGIN_RIGHT, currentY + 5, { align: 'right' });
  doc.text(`Date : ${offer.datePublication}`, PAGE_WIDTH - MARGIN_RIGHT, currentY + 9.5, { align: 'right' });

  // Stacked barcode de petite hauteur juste sous le numéro de référence avec redirection vers l'offre sur le site
  const baseUrl = typeof window !== 'undefined' ? `${window.location.origin}` : 'https://atlantic-transport.ca';
  const scanOfferUrl = `${baseUrl}/nos-offres?ref=${encodeURIComponent(offer.reference)}`;
  let qrScanDataUrl = '';
  try {
    qrScanDataUrl = await QRCode.toDataURL(scanOfferUrl, {
      width: 140,
      margin: 1,
      color: { dark: '#0B2545', light: '#FFFFFF' }
    });
  } catch {
    // Ignore error
  }
  const stackedBarcodeDataUrl = generateSmallStackedBarcodeCanvasDataUrl(offer.reference);

  const barcodeBoxWidth = 44;
  const barcodeBoxX = PAGE_WIDTH - MARGIN_RIGHT - barcodeBoxWidth;
  const barcodeY = currentY + 12;

  if (stackedBarcodeDataUrl) {
    try {
      doc.addImage(stackedBarcodeDataUrl, 'PNG', barcodeBoxX, barcodeY, barcodeBoxWidth, 5.5);
    } catch {
      // Ignore
    }
  }

  if (qrScanDataUrl) {
    try {
      doc.addImage(qrScanDataUrl, 'PNG', barcodeBoxX + barcodeBoxWidth - 11, barcodeY + 6.5, 11, 11);
    } catch {
      // Ignore
    }
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text('Scanner · Accéder à l’offre en ligne', barcodeBoxX, barcodeY + 10.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(0, 102, 179);
  doc.text(`[ ${offer.reference} ]`, barcodeBoxX, barcodeY + 14.5);

  currentY += 31;

  // 3. Titre Principal "OFFRE D’EMPLOI" en bleu ciel/cyan (#0066B3) centré sur la page
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(0, 102, 179); // #0066B3 Cyan/Bleu ROI fidèle au modèle
  doc.text('OFFRE D’EMPLOI', PAGE_WIDTH / 2, currentY, { align: 'center' });

  currentY += 12;

  // 4. Titre du poste : "Conducteur Routier International (H/F)"
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15.5);
  doc.setTextColor(29, 79, 136); // #1D4F88 Bleu acier soutenu
  doc.text(offer.titrePoste, MARGIN_LEFT, currentY);

  currentY += 4;

  // Fine ligne de séparation horizontale grise sous le titre du poste
  doc.setDrawColor(203, 213, 225); // #CBD5E1 Gris clair
  doc.setLineWidth(0.35);
  doc.line(MARGIN_LEFT, currentY, PAGE_WIDTH - MARGIN_RIGHT, currentY);

  currentY += 8;

  // Fonction utilitaire pour dessiner les titres de section soulignés en bleu
  const drawSectionTitle = (title: string, y: number): number => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 102, 179); // #0066B3
    doc.text(title, MARGIN_LEFT, y);

    const titleWidth = doc.getTextWidth(title);
    doc.setDrawColor(0, 102, 179);
    doc.setLineWidth(0.3);
    doc.line(MARGIN_LEFT, y + 1.2, MARGIN_LEFT + titleWidth, y + 1.2);

    return y + 6.5;
  };

  // 5. SECTION 1 : Présentation de la société
  currentY = drawSectionTitle('Présentation de la société', currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59); // #1E293B

  const presentationLines = doc.splitTextToSize(offer.presentationSociete, CONTENT_WIDTH);
  doc.text(presentationLines, MARGIN_LEFT, currentY);
  currentY += presentationLines.length * 4.6 + 5;

  // 6. SECTION 2 : Description du poste
  currentY = drawSectionTitle('Description du poste', currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);

  const introPoste = `Vous êtes directement rattaché(e) ${offer.rattachementHierarchique}. Votre mission principale consiste à ${offer.missionPrincipale}`;
  const introLines = doc.splitTextToSize(introPoste, CONTENT_WIDTH);
  doc.text(introLines, MARGIN_LEFT, currentY);
  currentY += introLines.length * 4.6 + 4;

  // Liste à puces des missions détaillées
  const bulletIndent = MARGIN_LEFT + 4;
  const textIndent = MARGIN_LEFT + 8;
  const bulletTextWidth = CONTENT_WIDTH - 8;

  for (const mission of offer.missionsDetaillees) {
    if (currentY > PAGE_HEIGHT - 65) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 102, 179);
    doc.text('•', bulletIndent, currentY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.2);
    doc.setTextColor(30, 41, 59);

    const mLines = doc.splitTextToSize(mission, bulletTextWidth);
    doc.text(mLines, textIndent, currentY);
    currentY += mLines.length * 4.4 + 2.2;
  }

  currentY += 4;

  // 7. SECTION 3 : Profil recherché
  if (currentY > PAGE_HEIGHT - 75) {
    doc.addPage();
    currentY = 20;
  }

  currentY = drawSectionTitle('Profil recherché', currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);

  // Paragraphe profil et expérience
  const profilLines = doc.splitTextToSize(offer.profilRequis, CONTENT_WIDTH);
  doc.text(profilLines, MARGIN_LEFT, currentY);
  currentY += profilLines.length * 4.6 + 3.5;

  // Qualités humaines et savoir-être
  for (const qualite of offer.qualitesHumaines) {
    if (currentY > PAGE_HEIGHT - 60) {
      doc.addPage();
      currentY = 20;
    }
    const qLines = doc.splitTextToSize(qualite, CONTENT_WIDTH);
    doc.text(qLines, MARGIN_LEFT, currentY);
    currentY += qLines.length * 4.4 + 2.2;
  }

  // Rémunération selon les normes canadiennes
  currentY += 1.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.3);
  const remLines = doc.splitTextToSize(offer.remuneration, CONTENT_WIDTH);
  doc.text(remLines, MARGIN_LEFT, currentY);
  currentY += remLines.length * 4.4 + 5;

  // 8. SECTION BAS DE PAGE : Contact et envoi de candidature
  if (currentY > PAGE_HEIGHT - 45) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text('Veuillez envoyer votre Curriculum Vitae et votre lettre de motivation à l’adresse suivante :', MARGIN_LEFT, currentY);

  currentY += 6;

  // Coordonnées : Email à gauche, Téléphone à droite
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 102, 179);
  doc.text(offer.contactEmail, MARGIN_LEFT, currentY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(offer.contactTelephone, MARGIN_LEFT + 75, currentY);

  currentY += 8;

  // 9. BLOC SIGNATURE & CACHET OFFICIEL DU SITE
  if (offer.afficherCachet || offer.afficherSignature) {
    if (currentY > PAGE_HEIGHT - 42) {
      doc.addPage();
      currentY = 20;
    }

    const stampBoxX = PAGE_WIDTH - MARGIN_RIGHT - 65;
    const stampBoxY = currentY;

    // Titre d'authentification
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(11, 37, 69);
    doc.text('Pour la Direction des Ressources Humaines', stampBoxX, stampBoxY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Visa & Certification officielle', stampBoxX, stampBoxY + 4);

    // Dessin du cachet officiel
    if (cachetDataUrl && offer.afficherCachet) {
      try {
        doc.addImage(cachetDataUrl, 'PNG', stampBoxX - 4, stampBoxY + 5, 28, 28);
      } catch {
        // Fallback text stamp
      }
    }

    // Dessin de la signature officielle superposée
    if (signatureDataUrl && offer.afficherSignature) {
      try {
        doc.addImage(signatureDataUrl, 'PNG', stampBoxX + 16, stampBoxY + 9, 36, 18);
      } catch {
        // Fallback signature
      }
    }
  }

  // Référence et date discrètes en pied de page
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184); // #94A3B8
  doc.text(
    `${offer.companyName} · Surrey, Colombie-Britannique (Canada) · Réf : ${offer.reference} · Publiée le ${offer.datePublication}`,
    MARGIN_LEFT,
    PAGE_HEIGHT - 8
  );

  const cleanName = offer.titrePoste
    .replace(/[^\w\d]/gi, '_')
    .replace(/_+/g, '_')
    .slice(0, 40);
  const filename = `Offre_Emploi_${cleanName}_${offer.reference}.pdf`;
  const dataUri = doc.output('datauristring');

  return { doc, filename, dataUri };
}

/**
 * Télécharge directement le PDF de l'offre
 */
export async function downloadJobOfferPdf(offer: JobOfferData, customLogoUrl?: string): Promise<void> {
  const { doc, filename } = await generateJobOfferPdf(offer, customLogoUrl);
  doc.save(filename);
}

/**
 * Exporte l'offre d'emploi en texte brut formaté (pour LinkedIn, Indeed, emails)
 */
export function exportJobOfferAsPlainText(offer: JobOfferData): string {
  const missionsStr = offer.missionsDetaillees.map((m) => `  • ${m}`).join('\n');
  const qualitesStr = offer.qualitesHumaines.map((q) => `${q}`).join('\n');
  const avantagesStr = (offer.avantagesSociaux || []).map((a) => `  ✓ ${a}`).join('\n');

  return `======================================================================
${offer.companyName.toUpperCase()} — OFFRE D'EMPLOI
${offer.titrePoste.toUpperCase()}
======================================================================
Réf : ${offer.reference} | Date de publication : ${offer.datePublication}
Département : ${offer.departement}
Type de contrat : ${offer.typeContrat}
Lieu de travail : ${offer.lieuTravail}
Horaires : ${offer.horaires}

1. PRÉSENTATION DE LA SOCIÉTÉ
----------------------------------------------------------------------
${offer.presentationSociete}

2. DESCRIPTION DU POSTE
----------------------------------------------------------------------
Vous êtes directement rattaché(e) ${offer.rattachementHierarchique}.
Votre mission principale consiste à ${offer.missionPrincipale}

Missions principales :
${missionsStr}

3. PROFIL RECHERCHÉ
----------------------------------------------------------------------
${offer.profilRequis}

${qualitesStr}

4. RÉMUNÉRATION & NORMES DU TRAVAIL (CANADA / BC)
----------------------------------------------------------------------
${offer.remuneration}

Avantages sociaux inclus :
${avantagesStr}

5. CANDIDATURE
----------------------------------------------------------------------
Veuillez envoyer votre Curriculum Vitae et votre lettre de motivation à :
Email : ${offer.contactEmail}
Téléphone : ${offer.contactTelephone}
Adresse : ${offer.contactAdresse}
======================================================================`;
}

/**
 * Offres pré-configurées pour alimenter initialement la page "Nos Offres"
 */
export function getPreseededJobOffers(settings?: SiteSettings): JobOfferData[] {
  const cdi = 'Contrat à Durée Indéterminée (CDI) — Temps Plein';
  const surrey = 'Surrey, Colombie-Britannique (Canada)';

  const o1 = buildDefaultJobOfferForPoste('Conducteur Routier International', 'DEPARTEMENT EXPLOITATION TRANSPORT', settings);
  o1.id = 'preseed_conducteur_routier';
  o1.reference = 'OFFRE-ATL-2026-EXP-489';
  o1.estPublie = true;
  o1.publishedAt = new Date().toISOString();
  o1.nombrePostesDisponibles = 5;

  const o2 = buildDefaultJobOfferForPoste('Déclarant en Douane', 'DEPARTEMENT TRANSIT ET DOUANE', settings);
  o2.id = 'preseed_declarant_douane';
  o2.reference = 'OFFRE-ATL-2026-DOU-312';
  o2.estPublie = true;
  o2.publishedAt = new Date().toISOString();
  o2.nombrePostesDisponibles = 2;

  const o3 = buildDefaultJobOfferForPoste('Cariste', 'DEPARTEMENT LOGISTIQUE ET ENTREPOSAGE', settings);
  o3.id = 'preseed_cariste';
  o3.reference = 'OFFRE-ATL-2026-LOG-745';
  o3.estPublie = true;
  o3.publishedAt = new Date().toISOString();
  o3.nombrePostesDisponibles = 3;

  const o4 = buildDefaultJobOfferForPoste('Infirmier en santé au travail', 'DEPARTEMENT SANTE, SECURITE ET MIEUX-ETRE AU TRAVAIL (SSMT)', settings);
  o4.id = 'preseed_infirmier_ssmt';
  o4.reference = 'OFFRE-ATL-2026-SSMT-108';
  o4.estPublie = true;
  o4.publishedAt = new Date().toISOString();
  o4.nombrePostesDisponibles = 1;

  const o5 = buildDefaultJobOfferForPoste('Mécanicien Poids Lourds', 'DEPARTEMENT MAINTENANCE ET GESTION DU PARC AUTOMOBILE', settings);
  o5.id = 'preseed_mecanicien';
  o5.reference = 'OFFRE-ATL-2026-MNT-520';
  o5.estPublie = true;
  o5.publishedAt = new Date().toISOString();
  o5.nombrePostesDisponibles = 2;

  return [o1, o2, o3, o4, o5];
}

/**
 * Sauvegarde une offre en local (localStorage) et dans Firestore (collection 'job_offers')
 */
export async function saveJobOfferToStorage(offer: JobOfferData, publish = false): Promise<JobOfferData> {
  const updatedOffer: JobOfferData = {
    ...offer,
    estPublie: publish ? true : offer.estPublie,
    publishedAt: publish ? new Date().toISOString() : (offer.publishedAt || (offer.estPublie ? new Date().toISOString() : undefined))
  };

  // 1. Sauvegarde dans localStorage
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_OFFERS_KEY);
    const existing: JobOfferData[] = raw ? JSON.parse(raw) : [];
    const idx = existing.findIndex((o) => o.id === updatedOffer.id);
    if (idx >= 0) {
      existing[idx] = updatedOffer;
    } else {
      existing.unshift(updatedOffer);
    }
    localStorage.setItem(LOCAL_STORAGE_OFFERS_KEY, JSON.stringify(existing));
  } catch (err) {
    console.warn('Erreur localStorage saveJobOfferToStorage:', err);
  }

  // 2. Sauvegarde dans Firestore (collection 'job_offers')
  try {
    const safeDocId = (updatedOffer.id || `offer_${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '_');
    const docRef = doc(db, 'job_offers', safeDocId);
    await setDoc(docRef, {
      ...updatedOffer,
      updated_at: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.warn('Erreur Firestore saveJobOfferToStorage (fallback local actif):', err);
  }

  return updatedOffer;
}

/**
 * Publie une offre directement vers la page "Nos Offres"
 */
export async function publishJobOffer(offer: JobOfferData): Promise<JobOfferData> {
  return saveJobOfferToStorage(offer, true);
}

/**
 * Retire une offre de la publication
 */
export async function unpublishJobOffer(offerId: string): Promise<void> {
  // 1. LocalStorage
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_OFFERS_KEY);
    if (raw) {
      const existing: JobOfferData[] = JSON.parse(raw);
      const updated = existing.map((o) => (o.id === offerId ? { ...o, estPublie: false } : o));
      localStorage.setItem(LOCAL_STORAGE_OFFERS_KEY, JSON.stringify(updated));
    }
  } catch {
    // Ignore error
  }

  // 2. Firestore
  try {
    const safeDocId = offerId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const docRef = doc(db, 'job_offers', safeDocId);
    await setDoc(docRef, { estPublie: false, unpublishedAt: new Date().toISOString() }, { merge: true });
  } catch {
    // Ignore error
  }
}

/**
 * Supprime une offre d'emploi
 */
export async function deleteJobOffer(offerId: string): Promise<void> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_OFFERS_KEY);
    if (raw) {
      const existing: JobOfferData[] = JSON.parse(raw);
      const updated = existing.filter((o) => o.id !== offerId);
      localStorage.setItem(LOCAL_STORAGE_OFFERS_KEY, JSON.stringify(updated));
    }
  } catch {
    // Ignore error
  }

  try {
    const safeDocId = offerId.replace(/[^a-zA-Z0-9_-]/g, '_');
    await deleteDoc(doc(db, 'job_offers', safeDocId));
  } catch {
    // Ignore error
  }
}

/**
 * Récupère toutes les offres publiées pour la page publique "Nos Offres"
 */
export async function getPublishedJobOffers(settings?: SiteSettings): Promise<JobOfferData[]> {
  const mapById = new Map<string, JobOfferData>();

  // 1. Charger d'abord les offres pré-configurées
  const preseeded = getPreseededJobOffers(settings);
  for (const o of preseeded) {
    mapById.set(o.id, o);
  }

  // 2. Charger les offres depuis localStorage
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_OFFERS_KEY);
    if (raw) {
      const localList: JobOfferData[] = JSON.parse(raw);
      for (const o of localList) {
        if (o.estPublie) {
          mapById.set(o.id, o);
        } else {
          // Si explicitement retirée de la publication en local
          mapById.delete(o.id);
        }
      }
    }
  } catch {
    // Ignore error
  }

  // 3. Charger depuis Firestore si accessible
  try {
    const colRef = collection(db, 'job_offers');
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      snap.forEach((d) => {
        const data = d.data() as JobOfferData;
        if (data.estPublie) {
          mapById.set(data.id || d.id, { ...data, id: data.id || d.id });
        } else {
          mapById.delete(data.id || d.id);
        }
      });
    }
  } catch (err) {
    // Fallback silencieux vers le cache local
  }

  return Array.from(mapById.values());
}

/**
 * Récupère l'ensemble des offres enregistrées (publiées et brouillons) pour le backoffice admin
 */
export async function getAllStoredJobOffers(settings?: SiteSettings): Promise<JobOfferData[]> {
  const mapById = new Map<string, JobOfferData>();

  // Pré-configurées
  const preseeded = getPreseededJobOffers(settings);
  for (const o of preseeded) {
    mapById.set(o.id, o);
  }

  // LocalStorage
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_OFFERS_KEY);
    if (raw) {
      const localList: JobOfferData[] = JSON.parse(raw);
      for (const o of localList) {
        mapById.set(o.id, o);
      }
    }
  } catch {
    // Ignore error
  }

  // Firestore
  try {
    const colRef = collection(db, 'job_offers');
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      snap.forEach((d) => {
        const data = d.data() as JobOfferData;
        mapById.set(data.id || d.id, { ...data, id: data.id || d.id });
      });
    }
  } catch {
    // Ignore error
  }

  return Array.from(mapById.values());
}
