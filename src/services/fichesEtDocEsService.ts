/**
 * Service pour le module "Fiches et DOC ES"
 * 15 Fiches et Formulaires RH structurés pour Candidature en Direct et Via Agence de Placement
 * Inclus : Remplacement dynamique de balises, export PDF jsPDF propre, persistance Firestore/localStorage
 */

import { jsPDF } from 'jspdf';
import type { PostulantInfo, RecrutementCasType } from './postulantDossierService';
import { SiteSettings } from '../types';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import {
  ActorScopeId,
  DEFAULT_PDF_ASSETS_CONFIG,
  ImportedAssetKey,
  PdfAssetItemSettings,
  PdfImportedAssetsConfig,
  UploadedAssetUrlsMap,
  renderAssetWithSettingsForPdf
} from './departmentsAndEmailService';
import { loadStaticImageAsPngDataUrl } from './contractPdfGenerator';
import {
  LayoutTemplatesMap,
  ReferenceLayoutTemplate,
  SpatialBlueprint,
  hexToRgbTuple,
  resolveEffectiveLayout
} from './layoutImitationService';

export interface DocEsModelMeta {
  id: number;
  canal: RecrutementCasType;
  category: 'interne' | 'externe' | 'tripartite';
  categoryLabel: string;
  number: string;
  title: string;
  isInteractive: boolean;
  description: string;
}

export const DOC_ES_MODELS_CATALOG: DocEsModelMeta[] = [
  // PARTIE 1 : Candidature en direct (Modèles 1 à 8)
  {
    id: 1,
    canal: 'direct',
    category: 'interne',
    categoryLabel: "Données enregistrées par l'entreprise",
    number: 'MODÈLE 1',
    title: 'Fiche de synthèse du candidat (Profil ATS)',
    isInteractive: false,
    description: 'Identification, compétences clés, critères validation RH et historique ATS'
  },
  {
    id: 2,
    canal: 'direct',
    category: 'interne',
    categoryLabel: "Données enregistrées par l'entreprise",
    number: 'MODÈLE 2',
    title: "Grille d'évaluation initiale (Entretien RH / Manager)",
    isInteractive: false,
    description: 'Notes de 1 à 4, points forts, axes à creuser et décision finale'
  },
  {
    id: 3,
    canal: 'direct',
    category: 'interne',
    categoryLabel: "Données enregistrées par l'entreprise",
    number: 'MODÈLE 3',
    title: 'Historique de planification des entretiens',
    isInteractive: false,
    description: 'Suivi des étapes 1, 2, 3 avec horaires, intervenants et logistique'
  },
  {
    id: 4,
    canal: 'direct',
    category: 'externe',
    categoryLabel: 'Formulaires et fiches à remettre au candidat',
    number: 'MODÈLE 4',
    title: "Livret d'accueil candidat (Culture d'entreprise)",
    isInteractive: false,
    description: 'Histoire, mission, 3 valeurs fondamentales et cadre de travail'
  },
  {
    id: 5,
    canal: 'direct',
    category: 'externe',
    categoryLabel: 'Formulaires et fiches à remettre au candidat',
    number: 'MODÈLE 5',
    title: 'Fiche de poste détaillée',
    isInteractive: false,
    description: 'Missions, environnement technique, rémunération et avantages'
  },
  {
    id: 6,
    canal: 'direct',
    category: 'externe',
    categoryLabel: 'Formulaires et fiches à remettre au candidat',
    number: 'MODÈLE 6',
    title: "Formulaire de demande d'emploi interne (Fiche de candidature)",
    isInteractive: true,
    description: 'Formulaire interactif avec composante, diplômes, motivations et signature'
  },
  {
    id: 7,
    canal: 'direct',
    category: 'externe',
    categoryLabel: 'Formulaires et fiches à remettre au candidat',
    number: 'MODÈLE 7',
    title: 'Autorisation de vérification des références professionnelles',
    isInteractive: true,
    description: "Formulaire interactif d'accord et contacts de référence 1 & 2"
  },
  {
    id: 8,
    canal: 'direct',
    category: 'externe',
    categoryLabel: 'Formulaires et fiches à remettre au candidat',
    number: 'MODÈLE 8',
    title: 'Accès aux tests de sélection & modalités',
    isInteractive: false,
    description: 'Questionnaire de personnalité soft skills et test technique hard skills'
  },

  // PARTIE 2 : Candidature via Agence de placement (Modèles 9 à 15)
  {
    id: 9,
    canal: 'agence',
    category: 'interne',
    categoryLabel: "Documents entre l'agence et l'employeur",
    number: 'MODÈLE 9',
    title: 'Brief de recrutement entreprise',
    isInteractive: false,
    description: "Critères indispensables no-go, contexte d'attractivité et budget global"
  },
  {
    id: 10,
    canal: 'agence',
    category: 'interne',
    categoryLabel: "Documents entre l'agence et l'employeur",
    number: 'MODÈLE 10',
    title: 'Contrat de prestation de services (Extrait RH)',
    isInteractive: false,
    description: 'Conditions financières, honoraires et clause de garantie de remplacement'
  },
  {
    id: 11,
    canal: 'agence',
    category: 'interne',
    categoryLabel: "Documents entre l'agence et l'employeur",
    number: 'MODÈLE 11',
    title: 'Dossier de présentation candidat (CV anonymisé)',
    isInteractive: false,
    description: 'Note de synthèse du consultant et extrait du parcours anonymisé'
  },
  {
    id: 12,
    canal: 'agence',
    category: 'externe',
    categoryLabel: "Documents entre l'agence et le candidat",
    number: 'MODÈLE 12',
    title: "Fiche d'inscription en agence du candidat",
    isInteractive: true,
    description: 'Formulaire interactif : état civil, recherche et cadre administratif'
  },
  {
    id: 13,
    canal: 'agence',
    category: 'externe',
    categoryLabel: "Documents entre l'agence et le candidat",
    number: 'MODÈLE 13',
    title: 'Accord de protection et transmission des données (RGPD)',
    isInteractive: true,
    description: 'Formulaire interactif de consentement informatique et vivier'
  },
  {
    id: 14,
    canal: 'agence',
    category: 'externe',
    categoryLabel: "Documents entre l'agence et le candidat",
    number: 'MODÈLE 14',
    title: "Fiche de préparation à l'entretien (Conseils)",
    isInteractive: false,
    description: 'Profil des managers interlocuteurs, attentes et conseils de pitch'
  },
  {
    id: 15,
    canal: 'agence',
    category: 'tripartite',
    categoryLabel: 'Document de liaison tripartite',
    number: 'MODÈLE 15',
    title: "Fiche de liaison d'entretien tripartite (Bon de présentation)",
    isInteractive: false,
    description: "Reconnaissance d'antériorité signée entre agence, employeur et candidat"
  }
];

export function getDocEsModelsForCasType(casType: RecrutementCasType): DocEsModelMeta[] {
  const targetCanal: RecrutementCasType = casType === 'agence' ? 'agence' : 'direct';
  return DOC_ES_MODELS_CATALOG.filter((m) => m.canal === targetCanal);
}

export interface FichesDocEsData {
  // --- Modèle 1 : Fiche de synthèse (Profil ATS) ---
  referenceDossier: string;
  linkedInUrl: string;
  villeRegion: string;
  specialiteMetier: string;
  anneesExperience: number;
  niveauEtudes: string;
  statutActuel: 'En poste' | 'En recherche active' | 'En préavis de 1 à 3 mois';
  hardSkills: {
    skill1Name: string; skill1Level: 'Débutant' | 'Intermédiaire' | 'Avancé' | 'Expert';
    skill2Name: string; skill2Level: 'Débutant' | 'Intermédiaire' | 'Avancé' | 'Expert';
    skill3Name: string; skill3Level: 'Débutant' | 'Intermédiaire' | 'Avancé' | 'Expert';
    skill4Name: string; skill4Level: 'Débutant' | 'Intermédiaire' | 'Avancé' | 'Expert';
  };
  pretentionsSalariales: string;
  disponibilite: string;
  mobiliteGeographique: string;
  teletravailSouhaite: string;
  syntheseRecruteur: string;
  statutProcessusAts: 'Tri CV' | 'Entretien RH' | 'Test Technique' | 'Entretien Manager' | 'Prise de Réf.' | 'Offre / Proposition' | 'Vivier' | 'Rejeté';

  // --- Modèle 2 : Grille d'évaluation initiale ---
  evaluateurNom: string;
  evaluateurFonction: string;
  notesEvaluation: {
    adequationPoste: number; // 1 à 4
    competencesTechniques: number;
    postureSoftSkills: number;
    adequationCulturelle: number;
    motivationProjet: number;
  };
  pointsForts: [string, string, string];
  axesVigilance: [string, string, string];
  decisionEvaluation: 'Poursuivre le processus' | 'Mettre en attente' | 'Stopper le processus';
  commentairesSyntheseEvaluateur: string;

  // --- Modèle 3 : Historique de planification ---
  etape1Preselection: { date: string; heure: string; duree: string; modalite: string; intervenant: string; statut: string };
  etape2EntretienRh: { date: string; heure: string; duree: string; modalite: string; intervenants: string; statut: string };
  etape3EntretienFinal: { date: string; heure: string; duree: string; modalite: string; intervenant: string; statut: string };
  notesLogistique: string;

  // --- Modèle 4 & 5 : Livret & Fiche de poste détaillée ---
  rattachementHierarchique: string;
  missionsPrincipales: string[];
  outilsMetiers: string;
  suiteBureautique: string;
  materielFourni: string;
  avantagesSociaux: { mutuelle: boolean; ticketsResto: boolean; transport: boolean; rtt: boolean };

  // --- Modèle 6 : Formulaire de demande d'emploi interne (interactif) ---
  posteActuelOccupe: string;
  diplomeEleve: string;
  certificationsCles: string;
  motivationEntreprise: string;
  atoutsPourEquipe: string;
  dateSignatureCandidat: string;
  lieuSignatureCandidat: string;

  // --- Modèle 7 : Autorisation de vérification des références (interactif) ---
  reference1: { nomPrenom: string; entreprise: string; poste: string; lien: string; tel: string; email: string };
  reference2: { nomPrenom: string; entreprise: string; poste: string; lien: string; tel: string; email: string };
  accordVerificationReferences: boolean;
  motifRefusReferences?: string;

  // --- Modèle 8 : Questionnaire de personnalité & tests ---
  lienTestPersonnalite: string;
  codeAccesPersonnalite: string;
  tempsEstimePersonnalite: string;
  dateLimitePersonnalite: string;
  lienTestTechnique: string;
  plateformeTechnique: string;
  tempsEstimeTechnique: string;
  dateLimiteTechnique: string;

  // --- Modèle 9 : Brief de recrutement (Agence) ---
  interlocuteurRhClient: string;
  managerFinalClient: string;
  motifOuverturePoste: 'Création de poste' | 'Remplacement';
  criteresNoGo: { etudesMin: string; expMin: string; outilIncontournable: string; langues: string };
  contexteAttractivite: string;
  styleManagement: string;
  structureSalaire: { fixePct: number; variablePct: number };

  // --- Modèle 10 : Contrat de prestation de services ---
  tauxHonorairesAgencePct: number;
  modeFacturation: 'Au succès' | 'Au forfait avec acomptes (33% lancement, 33% Shortlist, 34% recrutement)';
  dureeGarantieRemplacementMois: number;

  // --- Modèle 11 : Dossier de présentation candidat (anonymisé) ---
  referenceProfilAnonyme: string;
  noteSyntheseConsultant: string;
  parcoursRecent: [
    { poste: string; secteur: string; duree: string; realisationCle: string },
    { poste: string; secteur: string; duree: string; realisationCle: string }
  ];

  // --- Modèle 12 : Fiche d'inscription agence (interactif) ---
  typeContratRechercheAgence: 'CDI' | 'CDD' | 'Intérim' | 'Management de transition';
  zoneGeographiqueSouhaitee: string;
  pretentionsMinimalesAgence: string;
  documentIdentiteVerifie: boolean;
  cvMisAJourJoint: boolean;

  // --- Modèle 13 : Accord RGPD (interactif) ---
  dpoEmailAgence: string;
  accordConserverVivier: boolean;
  accordTransmettreEntreprises: boolean;

  // --- Modèle 14 : Fiche de préparation entretien ---
  interlocuteur1Profil: { nom: string; fonction: string; attentes: string };
  interlocuteur2Profil: { nom: string; fonction: string; attentes: string };
  conseilsPitch: string;
  conseilsPosture: string;

  // --- Modèle 15 : Fiche de liaison tripartite ---
  consultantAgenceNom: string;
  reconnaissanceAnterioriteValidee: boolean;
}

export const LOCAL_STORAGE_FICHES_DOC_ES_KEY = 'atlantic_fiches_doc_es_v1';

export function buildDefaultFichesDocEsData(
  postulant: PostulantInfo,
  settings: SiteSettings
): FichesDocEsData {
  const currentYear = new Date().getFullYear();
  const dateStr = new Date().toLocaleDateString('fr-CA');

  return {
    referenceDossier: `CAN-${currentYear}-${postulant.codeIdCandidature ? postulant.codeIdCandidature.slice(-4) : '001'}`,
    linkedInUrl: 'https://www.linkedin.com/in/' + postulant.prenom.toLowerCase() + '-' + postulant.nom.toLowerCase(),
    villeRegion: postulant.adresse || 'Montréal, QC, Canada',
    specialiteMetier: postulant.intitulePoste || 'Conducteur Routier International (H/F)',
    anneesExperience: 6,
    niveauEtudes: 'Baccalauréat Professionnel / Permis Poids Lourds Classe 1',
    statutActuel: 'En recherche active',
    hardSkills: {
      skill1Name: 'Conduite Poids Lourds & Semi-Remorques', skill1Level: 'Expert',
      skill2Name: 'Normes de Sécurité Routière & E-Log (Livre de bord électronique)', skill2Level: 'Avancé',
      skill3Name: 'Gestion de Fret Transfrontalier Canada/USA', skill3Level: 'Intermédiaire',
      skill4Name: 'Maintenance Préventive & Inspections de Sécurité', skill4Level: 'Avancé'
    },
    pretentionsSalariales: `${(postulant.salaireMensuel * 12).toLocaleString('fr-CA')} $ CAD bruts/an`,
    disponibilite: 'Immédiate (selon démarches administratives EIMT/Permis de travail)',
    mobiliteGeographique: 'Colombie-Britannique, Alberta, Québec & National Canada',
    teletravailSouhaite: 'Non applicable (Poste opérationnel itinérant)',
    syntheseRecruteur: `Candidat très motivé présentant une excellente expérience dans le transport et la logistique. Profil rigoureux, bilingue ou francophone solide, conforme aux prérequis EIMT et CNP ${postulant.codeCnp}. Dossier recommandé pour la phase contractuelle.`,
    statutProcessusAts: 'Entretien RH',

    evaluateurNom: postulant.representantEmployeurNom || 'Antoine Forestin',
    evaluateurFonction: postulant.representantEmployeurTitre || 'Directeur Général & Fondateur',
    notesEvaluation: {
      adequationPoste: 4,
      competencesTechniques: 4,
      postureSoftSkills: 3,
      adequationCulturelle: 4,
      motivationProjet: 4
    },
    pointsForts: [
      'Solide maîtrise technique de la conduite lourde et respect rigoureux des normes de sécurité',
      'Excellente posture professionnelle, autonomie avérée et sens de la relation client',
      'Expérience directement transposable au réseau de transport nord-américain'
    ],
    axesVigilance: [
      'Familiarisation avec la réglementation spécifique de Colombie-Britannique (surveillance lors des premières semaines)',
      'Perfectionnement de l’anglais technique radio et douane',
      'Planification des étapes d’installation et de logement à Surrey'
    ],
    decisionEvaluation: 'Poursuivre le processus',
    commentairesSyntheseEvaluateur: 'Avis très favorable. Le profil coche toutes les exigences requises pour notre développement logistique. Passer immédiatement à la finalisation du contrat et à la promesse d’embauche.',

    etape1Preselection: {
      date: postulant.dateEntretien,
      heure: '10:00',
      duree: '20 min',
      modalite: 'Téléphone / WhatsApp',
      intervenant: 'Équipe Recrutement RH',
      statut: 'Réalisé'
    },
    etape2EntretienRh: {
      date: postulant.dateEntretien,
      heure: postulant.heureEntretien,
      duree: '1 heure',
      modalite: postulant.modaliteEntretien || 'Visioconférence Teams Sécurisée',
      intervenants: postulant.managerRecruteur,
      statut: 'Planifié'
    },
    etape3EntretienFinal: {
      date: postulant.dateEntretien,
      heure: '16:00',
      duree: '45 min',
      modalite: 'Visioconférence Direction',
      intervenant: postulant.representantEmployeurNom,
      statut: 'Planifié'
    },
    notesLogistique: 'Candidat disponible sur le fuseau horaire convenu. Connexion haut débit confirmée pour la visio.',

    rattachementHierarchique: 'Directeur des Opérations Logistiques & Exploitation (N+1)',
    missionsPrincipales: [
      'Assurer l’acheminement sécurisé des marchandises sur les liaisons provinciales et régionales',
      'Effectuer les vérifications avant départ (inspection mécanique, arrimage, conformité e-log)',
      'Maintenir la traçabilité des bordereaux de livraison et communiquer avec le dispatcheur'
    ],
    outilsMetiers: 'Système télématique de flotte, E-Log électronique, GPS Trucking, Plateforme interne de dispatch',
    suiteBureautique: 'Application mobile de transport & messagerie interne d’entreprise',
    materielFourni: 'Véhicule utilitaire/tracteur de dernière génération, Tablette embarquée, Smartphone professionnel, EPI complets',
    avantagesSociaux: { mutuelle: true, ticketsResto: true, transport: true, rtt: true },

    posteActuelOccupe: 'Conducteur Poids Lourds',
    diplomeEleve: 'Baccalauréat Professionnel Transport & Logistique (2014)',
    certificationsCles: 'Permis EC / Classe 1 valide, FIMO/FCO Marchandises, ADR Matières dangereuses de base',
    motivationEntreprise: `Rejoindre ${postulant.nomEntreprise} représente une formidable opportunité d’évolution professionnelle au Canada au sein d’une structure reconnue pour sa bienveillance et son professionnalisme.`,
    atoutsPourEquipe: 'Rigueur, ponctualité exemplaire, respect absolu du matériel et esprit d’entraide entre chauffeurs.',
    dateSignatureCandidat: dateStr,
    lieuSignatureCandidat: postulant.villeSignature || 'Surrey, BC',

    reference1: {
      nomPrenom: 'Marc Laurent',
      entreprise: 'Transports Européens Express',
      poste: 'Directeur d’Exploitation',
      lien: 'Manager direct (N+1) pendant 4 ans',
      tel: '+33 6 12 34 56 78',
      email: 'm.laurent@transports-express.fr'
    },
    reference2: {
      nomPrenom: 'Sylvie Bernard',
      entreprise: 'Logistique Globale SA',
      poste: 'Responsable Ressources Humaines',
      lien: 'Directrice RH',
      tel: '+33 6 98 76 54 32',
      email: 's.bernard@logistique-globale.com'
    },
    accordVerificationReferences: true,
    motifRefusReferences: '',

    lienTestPersonnalite: 'https://assessment.atlantictransport.ca/personality?c=' + postulant.codeIdCandidature,
    codeAccesPersonnalite: `PERSO-BC-${postulant.codeIdCandidature.slice(-4)}`,
    tempsEstimePersonnalite: '15 à 20 minutes',
    dateLimitePersonnalite: postulant.dateEntretien + ' à 23h59',
    lienTestTechnique: 'https://eval.atlantictransport.ca/technical?code=' + postulant.codeIdCandidature,
    plateformeTechnique: 'Plateforme d’Évaluation des Compétences Transport Canada',
    tempsEstimeTechnique: '45 minutes (Chronométré)',
    dateLimiteTechnique: postulant.dateEntretien + ' à 23h59',

    interlocuteurRhClient: postulant.representantEmployeurNom,
    managerFinalClient: 'Direction Générale des Ressources Humaines',
    motifOuverturePoste: 'Création de poste',
    criteresNoGo: {
      etudesMin: 'Niveau Secondaire / Diplôme professionnel Transport',
      expMin: '3 ans d’expérience vérifiable sur véhicules lourds',
      outilIncontournable: 'Permis lourd valide et dossier de conduite vierge d’infractions graves',
      langues: 'Français courant obligatoire, notions d’anglais professionnel appréciées'
    },
    contexteAttractivite: `${postulant.nomEntreprise} connaît une forte expansion de ses lignes en Colombie-Britannique et dans l’Ouest Canadien, offrant des contrats stables en CDI avec d’excellentes conditions de travail.`,
    styleManagement: 'Management participatif, écoute active, sécurité prioritaire et esprit d’équipe solidaire.',
    structureSalaire: { fixePct: 85, variablePct: 15 },

    tauxHonorairesAgencePct: 18,
    modeFacturation: 'Au succès',
    dureeGarantieRemplacementMois: 6,

    referenceProfilAnonyme: `REF-${postulant.codeCnp}-${postulant.codeIdCandidature.slice(-4)}`,
    noteSyntheseConsultant: `Le candidat totalise plus de 6 ans d’expérience solide dans le secteur visé. Son évaluation technique et comportementale démontre un taux de conformité de 95% avec le cahier des charges de ${postulant.nomEntreprise}.`,
    parcoursRecent: [
      {
        poste: postulant.intitulePoste,
        secteur: 'Transport Routier International',
        duree: '3 ans et demi',
        realisationCle: 'Plus de 350 000 km parcourus sans aucun sinistre responsable et respect à 100% des délais.'
      },
      {
        poste: 'Chauffeur Livreur Régional Poids Lourds',
        secteur: 'Distribution et Fret',
        duree: '2 ans et demi',
        realisationCle: 'Optimisation des tournées quotidiennes et excellente notation lors des audits de sécurité.'
      }
    ],

    typeContratRechercheAgence: 'CDI',
    zoneGeographiqueSouhaitee: 'Canada (Colombie-Britannique et provinces éligibles)',
    pretentionsMinimalesAgence: `${(postulant.salaireMensuel * 12).toLocaleString('fr-CA')} $ CAD`,
    documentIdentiteVerifie: true,
    cvMisAJourJoint: true,

    dpoEmailAgence: 'dpo@mobilite-canada-recrutement.com',
    accordConserverVivier: true,
    accordTransmettreEntreprises: true,

    interlocuteur1Profil: {
      nom: postulant.representantEmployeurNom,
      fonction: postulant.representantEmployeurTitre,
      attentes: 'Très attaché à la ponctualité, à la rigueur technique, à la sécurité routière et à l’honnêteté.'
    },
    interlocuteur2Profil: {
      nom: postulant.managerRecruteur,
      fonction: 'Responsable du Recrutement & Intégration',
      attentes: 'Sens de la communication, capacité d’adaptation culturelle au Canada et esprit collectif.'
    },
    conseilsPitch: 'Présentez votre parcours chronologique en 3 minutes en insistant sur votre expérience sur route, la gestion des aléas et votre motivation à vous établir au Canada.',
    conseilsPosture: 'Soyez transparent, posez des questions sur le matériel de flotte et manifestez votre enthousiasme pour les valeurs de l’entreprise.',

    consultantAgenceNom: postulant.representantAgenceNom || 'Maître Thierry Marchand',
    reconnaissanceAnterioriteValidee: true
  };
}

export async function saveFichesDocEsData(
  postulantId: string,
  data: FichesDocEsData
): Promise<void> {
  // 1. LocalStorage
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_FICHES_DOC_ES_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[postulantId] = data;
    localStorage.setItem(LOCAL_STORAGE_FICHES_DOC_ES_KEY, JSON.stringify(map));
  } catch (err) {
    console.warn('Erreur localStorage fichesDocEs:', err);
  }

  // 2. Firestore
  try {
    const docRef = doc(db, 'postulants_fiches_doc_es', postulantId);
    await setDoc(docRef, { ...data, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    console.warn('Erreur Firestore fichesDocEs:', err);
  }
}

export async function loadFichesDocEsData(
  postulantId: string,
  fallback: FichesDocEsData
): Promise<FichesDocEsData> {
  // 1. LocalStorage
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_FICHES_DOC_ES_KEY);
    if (raw) {
      const map = JSON.parse(raw);
      if (map[postulantId]) return { ...fallback, ...map[postulantId] };
    }
  } catch {}

  // 2. Firestore
  try {
    const docRef = doc(db, 'postulants_fiches_doc_es', postulantId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { ...fallback, ...(snap.data() as FichesDocEsData) };
    }
  } catch {}

  return fallback;
}

export function loadStoredFichesDocEsSync(
  postulantId: string,
  fallback: FichesDocEsData
): FichesDocEsData {
  try {
    if (typeof localStorage === 'undefined') return fallback;
    const raw = localStorage.getItem(LOCAL_STORAGE_FICHES_DOC_ES_KEY);
    if (raw) {
      const map = JSON.parse(raw);
      if (map[postulantId]) return { ...fallback, ...map[postulantId] };
    }
  } catch {}
  return fallback;
}

/**
 * Rendu textuel formaté avec variables remplacées pour les 15 modèles
 */
export function renderDocEsPlainText(
  modelId: number,
  p: PostulantInfo,
  d: FichesDocEsData,
  settings: SiteSettings
): { title: string; subtitle: string; content: string; isInteractive: boolean; roleTarget: 'interne' | 'externe' } {
  switch (modelId) {
    case 1:
      return {
        title: 'FICHE DE SYNTHÈSE CANDIDAT (PROFIL ATS)',
        subtitle: 'Documents et données enregistrés par l’entreprise · Usage Interne RH',
        roleTarget: 'interne',
        isInteractive: false,
        content: `================================================================================
                    FICHE DE SYNTHÈSE CANDIDAT (PROFIL ATS)
================================================================================

1. IDENTIFICATION DU CANDIDAT
• Référence Dossier : ${d.referenceDossier} • Date de création : ${p.dateEffet || new Date().toLocaleDateString('fr-CA')}
• Nom : ${p.nom} • Prénom : ${p.prenom}
• Téléphone : ${p.telephone} • E-mail : ${p.email}
• Profil LinkedIn : ${d.linkedInUrl} • Ville/Région : ${d.villeRegion}

2. INFORMATIONS PROFESSIONNELLES
• Poste visé : ${p.intitulePoste} (Code CNP : ${p.codeCnp})
• Spécialité / Métier clé : ${d.specialiteMetier}
• Années d'expérience : ${d.anneesExperience} ans
• Niveau d'études : ${d.niveauEtudes}
• Statut actuel : ${d.statutActuel}

3. ÉVALUATION DES COMPÉTENCES CLÉS (Hard Skills)
• ${d.hardSkills.skill1Name} : [X] ${d.hardSkills.skill1Level}
• ${d.hardSkills.skill2Name} : [X] ${d.hardSkills.skill2Level}
• ${d.hardSkills.skill3Name} : [X] ${d.hardSkills.skill3Level}
• ${d.hardSkills.skill4Name} : [X] ${d.hardSkills.skill4Level}

4. CRITÈRES DE VALIDATION RH
• Prétentions salariales : ${d.pretentionsSalariales}
• Disponibilité : ${d.disponibilite}
• Mobilité géographique : ${d.mobiliteGeographique}
• Télétravail souhaité : ${d.teletravailSouhaite}

5. SYNTHÈSE DU RECRUTEUR (Aperçu rapide)
${d.syntheseRecruteur}

6. STATUT DU PROCESSUS (Sélectionner la phase actuelle)
Statut actuel : [X] ${d.statutProcessusAts}
(Phases : Tri CV · Entretien RH · Test Technique · Entretien Manager · Prise de Réf. · Offre / Proposition · Vivier)

HISTORIQUE DES ACTIONS
• ${p.dateEffet} : Réception de la candidature et validation de la conformité du profil initial.
• ${p.dateEntretien} : Entretien de sélection et test technique planifié.`
      };

    case 2:
      return {
        title: 'GRILLE D’ÉVALUATION INITIALE (ENTRETIEN RH / MANAGER)',
        subtitle: 'Documents et données enregistrés par l’entreprise · Usage Interne RH',
        roleTarget: 'interne',
        isInteractive: false,
        content: `================================================================================
              GRILLE D'ÉVALUATION INITIALE (ENTRETIEN RH / MANAGER)
================================================================================
CANDIDAT : ${p.nomComplet} · POSTE : ${p.intitulePoste} (CNP ${p.codeCnp})
DATE DE L'ENTRETIEN : ${p.dateEntretien} · ÉVALUATEUR : ${d.evaluateurNom} (${d.evaluateurFonction})

1. ÉVALUATION DES CRITÈRES (Note de 1 à 4 : 1=Insuffisant, 4=Excellent)
• Adéquation avec le profil du poste : [ ${d.notesEvaluation.adequationPoste} / 4 ] ${'★'.repeat(d.notesEvaluation.adequationPoste)}
• Compétences techniques (Hard Skills) : [ ${d.notesEvaluation.competencesTechniques} / 4 ] ${'★'.repeat(d.notesEvaluation.competencesTechniques)}
• Posture & Soft Skills (Écoute, comm) : [ ${d.notesEvaluation.postureSoftSkills} / 4 ] ${'★'.repeat(d.notesEvaluation.postureSoftSkills)}
• Adéquation culturelle / Valeurs : [ ${d.notesEvaluation.adequationCulturelle} / 4 ] ${'★'.repeat(d.notesEvaluation.adequationCulturelle)}
• Motivation & Clarté du projet prof. : [ ${d.notesEvaluation.motivationProjet} / 4 ] ${'★'.repeat(d.notesEvaluation.motivationProjet)}

2. POINTS FORTS (Éléments différenciants et atouts majeurs)
- Atout 1 : ${d.pointsForts[0]}
- Atout 2 : ${d.pointsForts[1]}
- Atout 3 : ${d.pointsForts[2]}

3. AXES À CREUSER / POINTS DE VIGILANCE (À vérifier aux étapes suivantes)
- Axe 1 : ${d.axesVigilance[0]}
- Axe 2 : ${d.axesVigilance[1]}
- Axe 3 : ${d.axesVigilance[2]}

4. CONCLUSION & DÉCISION
Décision retenue : [X] ${d.decisionEvaluation}

Commentaires de synthèse :
${d.commentairesSyntheseEvaluateur}`
      };

    case 3:
      return {
        title: 'HISTORIQUE DE PLANIFICATION DES ENTRETIENS',
        subtitle: 'Documents et données enregistrés par l’entreprise · Usage Interne RH',
        roleTarget: 'interne',
        isInteractive: false,
        content: `================================================================================
                    HISTORIQUE DE PLANIFICATION DES ENTRETIENS
================================================================================
CANDIDAT : ${p.nomComplet} · POSTE : ${p.intitulePoste}

SUIVI DES ÉTAPES DE RENCONTRE

[ÉTAPE 1] : ENTRETIEN DE PRÉ-SÉLECTION TÉLÉPHONIQUE
• Date : ${d.etape1Preselection.date} • Heure : ${d.etape1Preselection.heure} • Durée : ${d.etape1Preselection.duree}
• Modalité : ${d.etape1Preselection.modalite}
• Intervenant(s) : ${d.etape1Preselection.intervenant}
• Statut : [X] ${d.etape1Preselection.statut}

[ÉTAPE 2] : ENTRETIEN RH / OPÉRATIONNEL INITIAL
• Date : ${d.etape2EntretienRh.date} • Heure : ${d.etape2EntretienRh.heure} • Durée : ${d.etape2EntretienRh.duree}
• Modalité : ${d.etape2EntretienRh.modalite}
• Intervenant(s) : ${d.etape2EntretienRh.intervenants}
• Statut : [X] ${d.etape2EntretienRh.statut}

[ÉTAPE 3] : ENTRETIEN FINAL / VALIDATION DIRECTION
• Date : ${d.etape3EntretienFinal.date} • Heure : ${d.etape3EntretienFinal.heure} • Durée : ${d.etape3EntretienFinal.duree}
• Modalité : ${d.etape3EntretienFinal.modalite}
• Intervenant(s) : ${d.etape3EntretienFinal.intervenant}
• Statut : [X] ${d.etape3EntretienFinal.statut}

NOTES & COMMENTAIRES DE LOGISTIQUE
${d.notesLogistique}`
      };

    case 4:
      return {
        title: `BIENVENUE CHEZ ${p.nomEntreprise.toUpperCase()}`,
        subtitle: 'Livret d’Accueil Candidat (Culture d’entreprise) · Remis au Candidat',
        roleTarget: 'externe',
        isInteractive: false,
        content: `================================================================================
                       BIENVENUE CHEZ ${p.nomEntreprise.toUpperCase()}
                          - Livret d'Accueil Candidat -
================================================================================
Bonjour ${p.prenom},
Nous sommes ravis de vous compter parmi nos candidats. Ce document a été conçu pour vous donner un aperçu de qui nous sommes, de notre fonctionnement et de ce qui nous anime au quotidien.

1. NOTRE HISTOIRE & NOTRE MISSION
Fondée pour offrir l'excellence logistique et le transport interprovincial de premier ordre, ${p.nomEntreprise} s'est donné pour mission de relier les grands centres économiques canadiens avec rigueur, sécurité et fiabilité. Aujourd'hui, nous formons une équipe soudée de professionnels passionnés.

2. NOS 3 VALEURS FONDAMENTALES
• L'Audace : Nous encourageons la prise d'initiative et l'innovation continue.
• L'Esprit d'équipe : La réussite chez nous est collective, collaborative et fondée sur l'entraide.
• L'Excellence : Nous visons la qualité irréprochable et le respect absolu des engagements pris.

3. NOTRE CADRE ET NOTRE MODE DE TRAVAIL
• Nos bureaux et bases : Situés à ${p.adresseEntreprise}, nos installations offrent des espaces de travail modernes, de détente et un centre de dispatch à la pointe technologique.
• Flexibilité & Respect : Nous appliquons une politique respectueuse du rythme de repos et de la conciliation travail-vie personnelle.
• Convivialité : Des rituels réguliers (déjeuners d'accueil, bilans d'étape, célébrations de réussites) rythment notre vie d'équipe.

4. LE PROCESSUS DE RECRUTEMENT CHEZ NOUS
Pour que vous sachiez à quoi vous attendre, notre parcours classique comprend :
1. Un échange de qualification initiale (20 min)
2. Un entretien métier complet avec votre futur encadrement (1h)
3. Un cas pratique ou questionnaire de personnalité
4. Une rencontre finale avec la direction pour la validation contractuelle.`
      };

    case 5:
      return {
        title: 'FICHE DE POSTE DÉTAILLÉE',
        subtitle: 'Remise au Candidat · Descriptif de Poste & Conditions au Canada',
        roleTarget: 'externe',
        isInteractive: false,
        content: `================================================================================
                           FICHE DE POSTE DÉTAILLÉE
================================================================================
INTITULÉ DU POSTE : ${p.intitulePoste}
DÉPARTEMENT : ${p.departement}
RATTACHEMENT HIÉRARCHIQUE : ${d.rattachementHierarchique}
TYPE DE CONTRAT : ${p.typeContrat} (Base ${p.heuresHebdo}h/semaine)
CLASSIFICATION NATIONALE DU CANADA : Code CNP ${p.codeCnp}

1. MISSION PRINCIPALE
Assurer l'exécution irréprochable des activités opérationnelles liées au poste de ${p.intitulePoste}, en garantissant le respect des standards de sécurité routière, des normes canadiennes et la satisfaction client.

2. MISSIONS ET ACTIVITÉS COMPLÈTES
${d.missionsPrincipales.map((m, i) => `• Axe ${i + 1} : ${m}`).join('\n')}

3. ENVIRONNEMENT TECHNIQUE ET OUTILS DE TRAVAIL
Dans le cadre de vos fonctions, vous utiliserez au quotidien :
• Outils métiers : ${d.outilsMetiers}
• Suite bureautique / Applications : ${d.suiteBureautique}
• Matériel mis à disposition : ${d.materielFourni}

4. CONDITIONS DE TRAVAIL & AVANTAGES
• Lieu d'exercice : ${p.adresseEntreprise} et zones opérationnelles affiliées
• Rémunération : ${p.salaireHoraire.toFixed(2)} $ CAD/h (${p.salaireMensuel.toLocaleString('fr-CA')} $ CAD bruts/mois)
• Avantages sociaux :
  [X] Mutuelle d'entreprise & Assurance santé
  [X] Indemnités repas et déplacement
  [X] Prise en charge des équipements de sécurité professionnels
  [X] Accompagnement à l'installation au Canada`
      };

    case 6:
      return {
        title: 'FORMULAIRE DE DEMANDE D’EMPLOI INTERNE (FICHE DE CANDIDATURE)',
        subtitle: 'Formulaire Interactif à Remettre au Candidat · Saisie & Soumission',
        roleTarget: 'externe',
        isInteractive: true,
        content: `================================================================================
                    FORMULAIRE DE DEMANDE D'EMPLOI INTERNE
================================================================================

1. COMPOSANTE ET COORDONNÉES
• Nom : ${p.nom} • Prénom : ${p.prenom}
• E-mail : ${p.email} • Téléphone : ${p.telephone}
• Adresse de résidence : ${p.adresse}

2. PARCOURS ET RECHERCHE
• Poste actuellement occupé : ${d.posteActuelOccupe}
• Poste pour lequel vous candidatez aujourd'hui : ${p.intitulePoste}
• Date de disponibilité pour démarrer : ${p.dateEffet}

3. FORMATIONS ET DIPLÔMES PRINCIPAUX
• Diplôme le plus élevé : ${d.diplomeEleve}
• Certifications ou compétences clés : ${d.certificationsCles}

4. MOTIVATIONS (Réponses formulées par le candidat)
• Pourquoi ce poste au sein de notre entreprise correspond-il à votre projet ?
${d.motivationEntreprise}

• Quels sont les principaux atouts que vous apporterez à l'équipe ?
${d.atoutsPourEquipe}

5. ENGAGEMENT ET SIGNATURE
Je certifie sur l'honneur l'exactitude des informations mentionnées ci-dessus.
Fait à : ${d.lieuSignatureCandidat} Le : ${d.dateSignatureCandidat}
Signature du candidat : ${p.prenom} ${p.nom} (Certifié conforme)`
      };

    case 7:
      return {
        title: 'AUTORISATION DE VÉRIFICATION DES RÉFÉRENCES PROFESSIONNELLES',
        subtitle: 'Formulaire Interactif · Consentement et Contacts Référents',
        roleTarget: 'externe',
        isInteractive: true,
        content: `================================================================================
          AUTORISATION DE VÉRIFICATION DES RÉFÉRENCES PROFESSIONNELLES
================================================================================

1. ACCORD DU CANDIDAT
Je soussigné(e), ${p.nomComplet}, autorise expressément l'entreprise ${p.nomEntreprise} à prendre contact avec les personnes mentionnées ci-dessous afin de recueillir des informations professionnelles exclusives sur mon parcours, mes compétences et mes réalisations passées.

2. CONTACTS DE RÉFÉRENCE PROPOSÉS PAR LE CANDIDAT

RÉFÉRENCE 1 :
• Nom & Prénom : ${d.reference1.nomPrenom}
• Entreprise : ${d.reference1.entreprise} • Poste occupé : ${d.reference1.poste}
• Lien hiérarchique : ${d.reference1.lien}
• Téléphone : ${d.reference1.tel} • E-mail : ${d.reference1.email}

RÉFÉRENCE 2 :
• Nom & Prénom : ${d.reference2.nomPrenom}
• Entreprise : ${d.reference2.entreprise} • Poste occupé : ${d.reference2.poste}
• Lien hiérarchique : ${d.reference2.lien}
• Téléphone : ${d.reference2.tel} • E-mail : ${d.reference2.email}

3. DÉCISION DU CANDIDAT & SIGNATURE
${d.accordVerificationReferences ? '[X] J\'accepte que ces démarches soient effectuées en toute transparence.' : `[ ] Refus : ${d.motifRefusReferences}`}

Fait à : ${d.lieuSignatureCandidat} Le : ${d.dateSignatureCandidat}
Signature du candidat : ${p.nomComplet}`
      };

    case 8:
      return {
        title: 'ACCÈS AUX TESTS DE SÉLECTION & MODALITÉS',
        subtitle: 'Remis au Candidat · Liens & Codes d’accès individuels',
        roleTarget: 'externe',
        isInteractive: false,
        content: `================================================================================
                    ACCÈS AUX TESTS DE SÉLECTION & MODALITÉS
================================================================================
Bonjour ${p.prenom},
Pour faire suite à nos récents échanges, nous passons à l'étape d'évaluation. Celle-ci nous permet de mieux cerner votre profil et de préparer au mieux notre prochain entretien.

VOLET 1 : LE QUESTIONNAIRE DE PERSONNALITÉ & SOFT SKILLS
• Lien d'accès : ${d.lienTestPersonnalite}
• Code d'accès individuel : ${d.codeAccesPersonnalite}
• Temps estimé : ${d.tempsEstimePersonnalite}
• Date limite de réalisation : Avant le ${d.dateLimitePersonnalite}

VOLET 2 : LE TEST TECHNIQUE (HARD SKILLS)
• Lien d'accès : ${d.lienTestTechnique}
• Plateforme utilisée : ${d.plateformeTechnique}
• Temps estimé : ${d.tempsEstimeTechnique} (Le chronomètre démarre dès l'ouverture)
• Date limite de réalisation : Avant le ${d.dateLimiteTechnique}

CONSEILS DE RÉUSSITE :
• Assurez-vous d'avoir une connexion internet stable et un endroit calme.
• Lisez attentivement l'ensemble des consignes avant de cliquer sur "Démarrer le test".
• En cas d'aléa technique, contactez immédiatement l'équipe RH à : ${p.contactDocEmail}.`
      };

    case 9:
      return {
        title: 'BRIEF DE RECRUTEMENT ENTREPRISE',
        subtitle: 'Documents entre l’Agence et l’Employeur · Usage Professionnel & RH',
        roleTarget: 'interne',
        isInteractive: false,
        content: `================================================================================
                          BRIEF DE RECRUTEMENT ENTREPRISE
================================================================================

1. INFORMATIONS GÉNÉRALES
• Entreprise cliente : ${p.nomEntreprise}
• Interlocuteur RH : ${d.interlocuteurRhClient} • Manager final : ${d.managerFinalClient}
• Intitulé exact du poste : ${p.intitulePoste} (Code CNP : ${p.codeCnp})
• Motif de l'ouverture : [X] ${d.motifOuverturePoste}

2. CRITÈRES DE RECHERCHE INDISPENSABLES (No-Go criteria)
• Niveau d'études min. : ${d.criteresNoGo.etudesMin}
• Années d'expérience min. : ${d.criteresNoGo.expMin}
• Compétence tech incontournable : ${d.criteresNoGo.outilIncontournable}
• Langue(s) requise(s) : ${d.criteresNoGo.langues}

3. ÉLÉMENTS DE CONTEXTE ET ATTRACTIVITÉ (Vendre le poste)
• Pourquoi un bon profil rejoindrait cette équipe ?
${d.contexteAttractivite}

• Style de management de l'équipe :
${d.styleManagement}

4. CONDITIONS BUDGÉTAIRES ET LOGISTIQUES
• Budget global (Package) : ${(p.salaireMensuel * 12).toLocaleString('fr-CA')} $ CAD à ${Math.round(p.salaireMensuel * 13.5).toLocaleString('fr-CA')} $ CAD bruts/an
• Structure du salaire : Fixe ${d.structureSalaire.fixePct}% / Variable ${d.structureSalaire.variablePct}%
• Date de démarrage idéale : ${p.dateEffet}`
      };

    case 10:
      return {
        title: 'CONTRAT DE PRESTATION DE SERVICES - EXTRAIT RH',
        subtitle: 'Accord Commercial & Honoraires de Recrutement International',
        roleTarget: 'interne',
        isInteractive: false,
        content: `================================================================================
              CONTRAT DE PRESTATION DE SERVICES - EXTRAIT RH
================================================================================
ENTRE LES SOUSSIGNÉS :
${p.nomAgence} ("Le Prestataire"), titulaire du permis CNESST ${p.permisCnesst} et membre CCIC ${p.numeroCcic},
ET
${p.nomEntreprise} ("Le Client"), dont le siège est situé au ${p.adresseEntreprise}.

1. OBJET DE LA PRESTATION
Le Client confie au Prestataire la recherche, la sélection, l'évaluation et l'accompagnement réglementaire de candidatures pour le poste de : ${p.intitulePoste} (CNP ${p.codeCnp}).

2. CONDITIONS FINANCIÈRES & HONORAIRES
• Taux d'honoraires : ${d.tauxHonorairesAgencePct} % de la rémunération brute annuelle globale du candidat recruté.
• Facturation : [X] ${d.modeFacturation}

3. CLAUSE DE GARANTIE DE REMPLACEMENT
En cas de rupture du contrat de travail pendant la période de garantie de ${d.dureeGarantieRemplacementMois} mois, le Prestataire reprend sans délai la recherche d'un nouveau profil équivalent sans honoraires additionnels.

Fait à ${p.villeSignature}, le ${p.dateEffet}
Pour le Prestataire : ${p.representantAgenceNom} · Pour le Client : ${p.representantEmployeurNom}`
      };

    case 11:
      return {
        title: 'DOSSIER DE PRÉSENTATION CANDIDAT (CV ANONYMISÉ & SYNTHÈSE)',
        subtitle: 'Présentation de Candidature Transmise par l’Agence à l’Employeur',
        roleTarget: 'interne',
        isInteractive: false,
        content: `================================================================================
                        DOSSIER DE PRÉSENTATION CANDIDAT
================================================================================
• Référence Profil : ${d.referenceProfilAnonyme} • Date d'envoi : ${p.dateEffet}
• Poste ciblé : ${p.intitulePoste} (Code CNP : ${p.codeCnp})

1. NOTE DE SYNTHÈSE DU CONSULTANT
${d.noteSyntheseConsultant}

2. EXTRAIT DU PARCOURS ANONYMISÉ
• Poste Récent 1 : ${d.parcoursRecent[0].poste} - Secteur ${d.parcoursRecent[0].secteur} - Durée : ${d.parcoursRecent[0].duree}
  -> Réalisation clé : ${d.parcoursRecent[0].realisationCle}

• Poste Récent 2 : ${d.parcoursRecent[1].poste} - Secteur ${d.parcoursRecent[1].secteur} - Durée : ${d.parcoursRecent[1].duree}
  -> Réalisation clé : ${d.parcoursRecent[1].realisationCle}

3. DISPONIBILITÉ ET PRÉTENTIONS
• Salaire souhaité : ${d.pretentionsSalariales}
• Préavis / Disponibilité : ${d.disponibilite}`
      };

    case 12:
      return {
        title: 'FICHE D’INSCRIPTION EN AGENCE DU CANDIDAT',
        subtitle: 'Formulaire Interactif Agence-Candidat · Données Administratives',
        roleTarget: 'externe',
        isInteractive: true,
        content: `================================================================================
                         FICHE D'INSCRIPTION EN AGENCE
================================================================================

1. ÉTAT CIVIL & COORDONNÉES
• Nom : ${p.nom} • Prénom : ${p.prenom}
• Date de naissance : ${p.dateNaissance || '15/06/1988'} • Nationalité : ${p.nationalite}
• Téléphone : ${p.telephone} • E-mail : ${p.email}
• Adresse : ${p.adresse}

2. TYPE DE RECHERCHE DE CONTRAT
• Type de contrat recherché : [X] ${d.typeContratRechercheAgence}
• Zone géographique souhaitée : ${d.zoneGeographiqueSouhaitee}
• Prétentions minimales acceptées : ${d.pretentionsMinimalesAgence}

3. CADRE ADMINISTRATIF ENTRÉE
• Document d'identité vérifié : ${d.documentIdentiteVerifie ? '[X] Oui' : '[ ] Non'}
• CV mis à jour joint : ${d.cvMisAJourJoint ? '[X] Oui' : '[ ] Non'}

Fait à : ${d.lieuSignatureCandidat} Le : ${d.dateSignatureCandidat}
Signature du candidat : ${p.nomComplet}`
      };

    case 13:
      return {
        title: 'ACCORD DE PROTECTION ET TRANSMISSION DES DONNÉES (RGPD)',
        subtitle: 'Formulaire Interactif · Consentement Informé & Protection des Données',
        roleTarget: 'externe',
        isInteractive: true,
        content: `================================================================================
             ACCORD DE PROTECTION ET TRANSMISSION DES DONNÉES (RGPD)
================================================================================
• Les informations collectées servent exclusivement à vous positionner sur des opportunités d'emploi correspondantes et à instruire les formalités légales de travail au Canada.
• Vous disposez d'un droit permanent d'accès, de rectification et d'effacement via : ${d.dpoEmailAgence}.

AUTORISATION EXPRESSE DU CANDIDAT
Je soussigné(e) ${p.nomComplet}, autorise expressément l'agence ${p.nomAgence} à :
${d.accordConserverVivier ? '[X] Conserver mon dossier de candidature dans son vivier informatique sécurisé.' : '[ ] Refus vivier'}
${d.accordTransmettreEntreprises ? `[X] Transmettre mon profil (anonymisé ou complet) aux entreprises clientes partenaires, dont ${p.nomEntreprise}.` : '[ ] Refus transmission'}

Fait à : ${d.lieuSignatureCandidat} Le : ${d.dateSignatureCandidat}
Signature du candidat : ${p.nomComplet}`
      };

    case 14:
      return {
        title: 'FICHE DE PRÉPARATION ENTRETIEN (CONSEILS & PROFILS MANAGERS)',
        subtitle: 'Document Exclusif de Coaching Remis au Candidat par l’Agence',
        roleTarget: 'externe',
        isInteractive: false,
        content: `================================================================================
                         FICHE DE PRÉPARATION ENTRETIEN
================================================================================

1. LE RENDEZ-VOUS
• Entreprise cliente : ${p.nomEntreprise}
• Date & Heure : Le ${p.dateEntretien} à ${p.heureEntretien}
• Format : ${p.modaliteEntretien} (${p.lieuEntretien})

2. PROFIL DE VOS INTERLOCUTEURS (Les managers)
• Interlocuteur 1 : ${d.interlocuteur1Profil.nom} - Fonction : ${d.interlocuteur1Profil.fonction}
  -> Profil & Attentes : ${d.interlocuteur1Profil.attentes}

• Interlocuteur 2 : ${d.interlocuteur2Profil.nom} - Fonction : ${d.interlocuteur2Profil.fonction}
  -> Profil & Attentes : ${d.interlocuteur2Profil.attentes}

3. CONSEILS CLÉS DE L'AGENCE POUR RÉUSSIR
• Pitch initial : ${d.conseilsPitch}
• Posture & Questions : ${d.conseilsPosture}`
      };

    case 15:
      return {
        title: 'FICHE DE LIAISON D’ENTRETIEN TRIPARTITE (BON DE PRÉSENTATION)',
        subtitle: 'Document Officiel de Liaison Tripartite : Agence · Employeur · Candidat',
        roleTarget: 'interne',
        isInteractive: false,
        content: `================================================================================
                      FICHE DE LIAISON D'ENTRETIEN TRIPARTITE
================================================================================

1. IDENTIFICATION DES TROIS PARTIES
• L'AGENCE : ${p.nomAgence}
  Représentée par : ${d.consultantAgenceNom} (Permis CNESST : ${p.permisCnesst} · CCIC : ${p.numeroCcic})

• L'EMPLOYEUR : ${p.nomEntreprise}
  Représentée par : ${p.representantEmployeurNom} (${p.representantEmployeurTitre})

• LE CANDIDAT : ${p.nomComplet}
  Adresse : ${p.adresse} · Contact : ${p.telephone}

2. OBJET DE LA PRÉSENTATION
• Intitulé du poste concerné : ${p.intitulePoste} (Classification CNP : ${p.codeCnp})
• Date de la présentation / Entretien effectif : ${p.dateEntretien} à ${p.heureEntretien}

3. CADRE DE VALIDATION ET SUIVI
En signant cette fiche :
1. L'employeur reconnaît expressément l'antériorité de présentation de l'agence pour ce candidat.
2. Le candidat valide le suivi conjoint de sa candidature et son adhésion au projet d'embauche.
3. L'agence certifie l'authenticité des qualifications et attestations fournies.

Signatures conjointes :
[ Pour l'Agence ]                 [ Pour l'Employeur ]                 [ Pour le Candidat ]
${d.consultantAgenceNom}         ${p.representantEmployeurNom}         ${p.nomComplet}`
      };

    default:
      return {
        title: 'DOCUMENT NON SPÉCIFIÉ',
        subtitle: '',
        roleTarget: 'interne',
        isInteractive: false,
        content: ''
      };
  }
}

export interface DocEsAssetSlotResolved {
  key: ImportedAssetKey;
  url: string;
  cfg: PdfAssetItemSettings;
}

export interface DocEsResolvedActorVisuals {
  primaryActor: ActorScopeId;
  secondaryActor?: ActorScopeId;
  primaryEntityName: string;
  primarySubLine: string;
  primaryRepName: string;
  primaryRepTitle: string;
  secondaryEntityName?: string;
  secondaryRepName?: string;
  secondaryRepTitle?: string;
  logo: DocEsAssetSlotResolved;
  logoSecondary?: DocEsAssetSlotResolved;
  signature: DocEsAssetSlotResolved;
  signatureSecondary?: DocEsAssetSlotResolved;
  cachet: DocEsAssetSlotResolved;
  cachetSecondary?: DocEsAssetSlotResolved;
  filigrane: DocEsAssetSlotResolved;
  arrierePlan: DocEsAssetSlotResolved;
  barcode: DocEsAssetSlotResolved;
  qrcode: DocEsAssetSlotResolved;
  photoUrl?: string;
}

export interface DocEsPreloadedImages {
  primaryActor?: ActorScopeId;
  secondaryActor?: ActorScopeId;
  primaryEntityName?: string;
  primarySubLine?: string;
  primaryRepName?: string;
  primaryRepTitle?: string;
  secondaryEntityName?: string;
  secondaryRepName?: string;
  secondaryRepTitle?: string;
  logoEmp?: string;
  logoAgence?: string;
  signature?: string;
  signatureSecondary?: string;
  cachet?: string;
  cachetSecondary?: string;
  filigrane?: string;
  arrierePlan?: string;
  barcode?: string;
  qrcode?: string;
  photo?: string;
  cfgs?: {
    logo?: PdfAssetItemSettings;
    logoSecondary?: PdfAssetItemSettings;
    signature?: PdfAssetItemSettings;
    signatureSecondary?: PdfAssetItemSettings;
    cachet?: PdfAssetItemSettings;
    cachetSecondary?: PdfAssetItemSettings;
    filigrane?: PdfAssetItemSettings;
    arrierePlan?: PdfAssetItemSettings;
    barcode?: PdfAssetItemSettings;
    qrcode?: PdfAssetItemSettings;
  };
}

export type KitLayoutPresetId =
  | 'auto_doc'
  | 'executif_navy'
  | 'moderne_azur'
  | 'notarial_double'
  | 'grille_ats'
  | 'protocole_canada'
  | 'modele_importe'
  | 'import_t9'
  | 'import_t10'
  | 'import_t11'
  | 'import_t12';

export interface KitLayoutPresetMeta {
  id: KitLayoutPresetId;
  label: string;
  shortDesc: string;
  primaryColor: string;
  accentColor: string;
}

export const KIT_LAYOUT_PRESETS: KitLayoutPresetMeta[] = [
  {
    id: 'auto_doc',
    label: 'Automatique (Adapté au document)',
    shortDesc: 'Mise en page dédiée selon la nature du document (ATS, Formulaire, Contrat ou Guide)',
    primaryColor: '#0B2545',
    accentColor: '#D4A017'
  },
  {
    id: 'executif_navy',
    label: 'Exécutif Navy & Or',
    shortDesc: 'Bandeau plein bleu marine, filet or diplomatique, cadre officiel',
    primaryColor: '#0B2545',
    accentColor: '#D4A017'
  },
  {
    id: 'moderne_azur',
    label: 'Moderne Azur Épuré',
    shortDesc: 'Barre supérieure azur, cartes aérées sans bordure lourde',
    primaryColor: '#0066B3',
    accentColor: '#38BDF8'
  },
  {
    id: 'notarial_double',
    label: 'Officiel Notarial Double Filet',
    shortDesc: 'Typographie Serif classique, double cadre solennel et zone tripartite',
    primaryColor: '#1E293B',
    accentColor: '#94A3B8'
  },
  {
    id: 'grille_ats',
    label: 'Analytique RH & Grille ATS',
    shortDesc: 'Bande verticale émeraude, pastille références et métadonnées encadrées',
    primaryColor: '#065F46',
    accentColor: '#10B981'
  },
  {
    id: 'protocole_canada',
    label: 'Protocole Canadien Bilingue',
    shortDesc: 'En-tête scindé rouge érable & marine avec bloc QR vérification',
    primaryColor: '#991B1B',
    accentColor: '#0B2545'
  },
  {
    id: 'modele_importe',
    label: 'Modèle Importé DOC ES (Imitation)',
    shortDesc: 'Applique le document de référence importé dans Fiches & DOC ES',
    primaryColor: '#0B2545',
    accentColor: '#0066B3'
  }
];

export type KitDocLayoutMap = Record<number, string>;
export type KitDocVisualScopeMap = Record<number, ActorScopeId | 'auto'>;

export type KitHeaderPresetId =
  | 'auto_header'
  | 'bandeau_royal'
  | 'en_tete_scinde'
  | 'centre_solennel'
  | 'barre_accent_haut'
  | 'gauche_epure'
  | 'bipartite_double_logo'
  | 'cartouche_institutionnel';

export interface KitHeaderPresetMeta {
  id: KitHeaderPresetId;
  label: string;
  shortDesc: string;
}

export const KIT_HEADER_PRESETS: KitHeaderPresetMeta[] = [
  {
    id: 'auto_header',
    label: 'Automatique (Selon mise en page)',
    shortDesc: 'Adapte automatiquement l’en-tête au document et aux acteurs impliqués'
  },
  {
    id: 'bandeau_royal',
    label: 'Bandeau Plein Exécutif',
    shortDesc: 'Bandeau plein coloré, logo encadré et références à droite'
  },
  {
    id: 'en_tete_scinde',
    label: 'En-tête Scindé (Logo Gauche · Réf. Droite)',
    shortDesc: 'Ligne d’en-tête aérée gauche/droite avec filet de séparation'
  },
  {
    id: 'centre_solennel',
    label: 'Centré Solennel (Sceau / Cabinet)',
    shortDesc: 'Logo centré en haut, titre institutionnel centré et ligne de séparation'
  },
  {
    id: 'barre_accent_haut',
    label: 'Barre Supérieure + En-tête Épuré',
    shortDesc: 'Liseré supérieur couleur primaire et en-tête épuré'
  },
  {
    id: 'gauche_epure',
    label: 'Minimaliste Gauche + Filet Discret',
    shortDesc: 'En-tête aligné à gauche avec filet discret et repère de page'
  },
  {
    id: 'bipartite_double_logo',
    label: 'Bipartite / Tripartite (Double Logo Cabinet & Employeur)',
    shortDesc: 'Affiche côte à côte les deux acteurs (Cabinet CRIC & Entreprise Employeur)'
  },
  {
    id: 'cartouche_institutionnel',
    label: 'Cartouche Institutionnel Encadré',
    shortDesc: 'Grand bandeau officiel 25 mm avec mention d’entité et cartouche référence'
  }
];

export type KitDocHeaderMap = Record<number, KitHeaderPresetId | string>;

const LS_KIT_DOC_LAYOUTS_KEY = 'atlantic_kit_doc_layouts_v1';
const LS_KIT_DOC_VISUAL_SCOPES_KEY = 'atlantic_kit_doc_visual_scopes_v1';
const LS_KIT_DOC_HEADERS_KEY = 'atlantic_kit_doc_headers_v1';

export function loadKitDocLayoutsSync(): KitDocLayoutMap {
  try {
    if (typeof localStorage === 'undefined') return {};
    const raw = localStorage.getItem(LS_KIT_DOC_LAYOUTS_KEY);
    return raw ? (JSON.parse(raw) as KitDocLayoutMap) : {};
  } catch {
    return {};
  }
}

export async function saveKitDocLayouts(map: KitDocLayoutMap): Promise<void> {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LS_KIT_DOC_LAYOUTS_KEY, JSON.stringify(map));
    }
  } catch {}
  try {
    await setDoc(
      doc(db, 'document_layout_templates', 'kit_doc_layouts'),
      {
        docKey: 'doc_es',
        sourceFileName: 'kit_doc_layouts',
        map,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );
  } catch {}
}

export async function loadKitDocLayoutsFromFirestore(): Promise<KitDocLayoutMap> {
  const local = loadKitDocLayoutsSync();
  try {
    const snap = await getDoc(doc(db, 'document_layout_templates', 'kit_doc_layouts'));
    if (snap.exists()) {
      const data = snap.data() as { map?: KitDocLayoutMap };
      if (data?.map) {
        const merged = { ...local, ...data.map };
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(LS_KIT_DOC_LAYOUTS_KEY, JSON.stringify(merged));
          }
        } catch {}
        return merged;
      }
    }
  } catch {}
  return local;
}

export function loadKitDocVisualScopesSync(): KitDocVisualScopeMap {
  try {
    if (typeof localStorage === 'undefined') return {};
    const raw = localStorage.getItem(LS_KIT_DOC_VISUAL_SCOPES_KEY);
    return raw ? (JSON.parse(raw) as KitDocVisualScopeMap) : {};
  } catch {
    return {};
  }
}

export async function saveKitDocVisualScopes(map: KitDocVisualScopeMap): Promise<void> {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LS_KIT_DOC_VISUAL_SCOPES_KEY, JSON.stringify(map));
    }
  } catch {}
  try {
    await setDoc(
      doc(db, 'document_layout_templates', 'kit_doc_visual_scopes'),
      {
        docKey: 'doc_es',
        sourceFileName: 'kit_doc_visual_scopes',
        map,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );
  } catch {}
}

export async function loadKitDocVisualScopesFromFirestore(): Promise<KitDocVisualScopeMap> {
  const local = loadKitDocVisualScopesSync();
  try {
    const snap = await getDoc(doc(db, 'document_layout_templates', 'kit_doc_visual_scopes'));
    if (snap.exists()) {
      const data = snap.data() as { map?: KitDocVisualScopeMap };
      if (data?.map) {
        const merged = { ...local, ...data.map };
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(LS_KIT_DOC_VISUAL_SCOPES_KEY, JSON.stringify(merged));
          }
        } catch {}
        return merged;
      }
    }
  } catch {}
  return local;
}

export function loadKitDocHeadersSync(): KitDocHeaderMap {
  try {
    if (typeof localStorage === 'undefined') return {};
    const raw = localStorage.getItem(LS_KIT_DOC_HEADERS_KEY);
    return raw ? (JSON.parse(raw) as KitDocHeaderMap) : {};
  } catch {
    return {};
  }
}

export async function saveKitDocHeaders(map: KitDocHeaderMap): Promise<void> {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LS_KIT_DOC_HEADERS_KEY, JSON.stringify(map));
    }
  } catch {}
  try {
    await setDoc(
      doc(db, 'document_layout_templates', 'kit_doc_headers'),
      {
        docKey: 'doc_es',
        sourceFileName: 'kit_doc_headers',
        map,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );
  } catch {}
}

export async function loadKitDocHeadersFromFirestore(): Promise<KitDocHeaderMap> {
  const local = loadKitDocHeadersSync();
  try {
    const snap = await getDoc(doc(db, 'document_layout_templates', 'kit_doc_headers'));
    if (snap.exists()) {
      const data = snap.data() as { map?: KitDocHeaderMap };
      if (data?.map) {
        const merged = { ...local, ...data.map };
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(LS_KIT_DOC_HEADERS_KEY, JSON.stringify(merged));
          }
        } catch {}
        return merged;
      }
    }
  } catch {}
  return local;
}

function buildPresetReferenceLayout(
  presetId: Exclude<KitLayoutPresetId, 'auto_doc' | 'modele_importe' | 'import_t9' | 'import_t10' | 'import_t11' | 'import_t12'>,
  modelId: number
): ReferenceLayoutTemplate {
  const base: Omit<
    ReferenceLayoutTemplate,
    | 'primaryColor'
    | 'accentColor'
    | 'headerBgColor'
    | 'headerTextColor'
    | 'borderColor'
    | 'borderStyle'
    | 'headerStyle'
    | 'headerAlign'
    | 'fontFamily'
    | 'blockSpacing'
    | 'logoPlacement'
    | 'signaturePlacement'
    | 'spatialBlueprint'
    | 'detectedSummary'
  > = {
    docKey: 'doc_es',
    sourceFileName: `Gabarit_${presetId}_M${modelId}`,
    sourceFileType: 'pdf',
    analyzedAt: new Date().toISOString(),
    previewThumbnailUrl: '',
    pageFormat: 'a4',
    orientation: 'portrait',
    marginsMm: { top: 16, right: 16, bottom: 16, left: 16 },
    bodyTextColor: '#1E293B',
    pageBgColor: '#FFFFFF',
    hasTablesDetected: modelId === 1 || modelId === 2 || modelId === 3 || modelId === 9,
    detectedElements: ['logo', 'signature', 'cachet'],
    ignoredMissingElements: []
  };

  if (presetId === 'moderne_azur') {
    return {
      ...base,
      primaryColor: '#0066B3',
      accentColor: '#38BDF8',
      highlightTintColor: '#E0F2FE',
      headerBgColor: '#0066B3',
      headerTextColor: '#FFFFFF',
      borderColor: '#BAE6FD',
      borderStyle: 'card_blocks',
      headerStyle: 'entete_epure',
      headerAlign: 'left',
      fontFamily: 'helvetica',
      blockSpacing: 'airy',
      logoPlacement: 'top_left',
      signaturePlacement: 'bottom_right',
      detectedSummary: 'Moderne Azur Épuré',
      spatialBlueprint: {
        headerLayout: 'top_accent_bar',
        headerHasDivider: true,
        headerBannerHeightMm: 0,
        metaLayout: 'two_col_asymmetric',
        hasRefPill: true,
        titleAlign: 'left',
        titleHasBox: false,
        titleHasUnderline: true,
        titleUppercase: false,
        titleHasSubtitle: true,
        bodyLayout: 'cards',
        hasLeftAccentStripe: false,
        hasSectionDividers: true,
        tableHeaderStyle: 'tinted',
        signatureLayout: 'two_col_fait_a_right_sig',
        signatureHasTopBorder: true,
        footerLayout: 'qr_legal_page',
        hasFooterDivider: true,
        hasTopRightMarker: false
      }
    };
  }

  if (presetId === 'notarial_double') {
    return {
      ...base,
      pageBgColor: '#FDFCF8',
      primaryColor: '#1E293B',
      accentColor: '#94A3B8',
      highlightTintColor: '#F1F5F9',
      headerBgColor: '#1E293B',
      headerTextColor: '#FFFFFF',
      borderColor: '#334155',
      borderStyle: 'double',
      headerStyle: 'encadre_classique',
      headerAlign: 'center',
      fontFamily: 'times',
      blockSpacing: 'standard',
      logoPlacement: 'top_center',
      signaturePlacement: 'bottom_split',
      detectedSummary: 'Officiel Notarial Double Filet',
      spatialBlueprint: {
        headerLayout: 'centered_stack',
        headerHasDivider: true,
        headerBannerHeightMm: 0,
        metaLayout: 'two_col_equal',
        hasRefPill: false,
        titleAlign: 'center',
        titleHasBox: true,
        titleHasUnderline: false,
        titleUppercase: true,
        titleHasSubtitle: true,
        bodyLayout: 'numbered_sections',
        hasLeftAccentStripe: false,
        hasSectionDividers: false,
        tableHeaderStyle: 'bordered_plain',
        signatureLayout: 'three_col_footer',
        signatureHasTopBorder: true,
        footerLayout: 'centered_legal',
        hasFooterDivider: true,
        hasTopRightMarker: false
      }
    };
  }

  if (presetId === 'grille_ats') {
    return {
      ...base,
      primaryColor: '#065F46',
      accentColor: '#10B981',
      highlightTintColor: '#D1FAE5',
      headerBgColor: '#065F46',
      headerTextColor: '#FFFFFF',
      borderColor: '#065F46',
      borderStyle: 'simple',
      headerStyle: 'split_officiel',
      headerAlign: 'split',
      fontFamily: 'helvetica',
      blockSpacing: 'compact',
      logoPlacement: 'top_left',
      signaturePlacement: 'bottom_right',
      detectedSummary: 'Analytique RH & Grille ATS',
      spatialBlueprint: {
        headerLayout: 'split_lr',
        headerHasDivider: true,
        headerBannerHeightMm: 0,
        metaLayout: 'boxed_grid',
        hasRefPill: true,
        titleAlign: 'left',
        titleHasBox: false,
        titleHasUnderline: true,
        titleUppercase: true,
        titleHasSubtitle: true,
        bodyLayout: 'cards',
        hasLeftAccentStripe: true,
        hasSectionDividers: true,
        tableHeaderStyle: 'filled_primary',
        signatureLayout: 'two_col_bipartite',
        signatureHasTopBorder: true,
        footerLayout: 'rule_with_page',
        hasFooterDivider: true,
        hasTopRightMarker: true
      }
    };
  }

  if (presetId === 'protocole_canada') {
    return {
      ...base,
      primaryColor: '#991B1B',
      accentColor: '#0B2545',
      highlightTintColor: '#FEE2E2',
      headerBgColor: '#0B2545',
      headerTextColor: '#FFFFFF',
      borderColor: '#991B1B',
      borderStyle: 'official_band',
      headerStyle: 'split_officiel',
      headerAlign: 'split',
      fontFamily: 'helvetica',
      blockSpacing: 'standard',
      logoPlacement: 'top_left',
      signaturePlacement: 'bottom_split',
      detectedSummary: 'Protocole Canadien Bilingue',
      spatialBlueprint: {
        headerLayout: 'split_lr',
        headerHasDivider: true,
        headerBannerHeightMm: 0,
        metaLayout: 'two_col_asymmetric',
        hasRefPill: true,
        titleAlign: 'center',
        titleHasBox: true,
        titleHasUnderline: true,
        titleUppercase: true,
        titleHasSubtitle: true,
        bodyLayout: 'numbered_sections',
        hasLeftAccentStripe: false,
        hasSectionDividers: true,
        tableHeaderStyle: 'filled_primary',
        signatureLayout: 'two_col_bipartite',
        signatureHasTopBorder: true,
        footerLayout: 'qr_legal_page',
        hasFooterDivider: true,
        hasTopRightMarker: false
      }
    };
  }

  // executif_navy (default crisp executive)
  return {
    ...base,
    primaryColor: '#0B2545',
    accentColor: '#D4A017',
    highlightTintColor: '#FEF3C7',
    headerBgColor: '#0B2545',
    headerTextColor: '#FFFFFF',
    borderColor: '#0B2545',
    borderStyle: 'official_band',
    headerStyle: 'bandeau_plein',
    headerAlign: 'left',
    fontFamily: 'helvetica',
    blockSpacing: 'standard',
    logoPlacement: 'top_left',
    signaturePlacement: 'bottom_right',
    detectedSummary: 'Exécutif Navy & Or',
    spatialBlueprint: {
      headerLayout: 'filled_banner',
      headerHasDivider: false,
      headerBannerHeightMm: 22,
      metaLayout: 'two_col_asymmetric',
      hasRefPill: true,
      titleAlign: 'center',
      titleHasBox: false,
      titleHasUnderline: true,
      titleUppercase: true,
      titleHasSubtitle: true,
      bodyLayout: 'numbered_sections',
      hasLeftAccentStripe: false,
      hasSectionDividers: true,
      tableHeaderStyle: 'filled_primary',
      signatureLayout: 'two_col_fait_a_right_sig',
      signatureHasTopBorder: true,
      footerLayout: 'qr_legal_page',
      hasFooterDivider: true,
      hasTopRightMarker: false
    }
  };
}

export function getRecommendedPresetForModel(modelId: number): Exclude<KitLayoutPresetId, 'auto_doc' | 'modele_importe' | 'import_t9' | 'import_t10' | 'import_t11' | 'import_t12'> {
  if ([1, 2, 3, 9, 11].includes(modelId)) return 'grille_ats';
  if ([4, 5, 8, 14].includes(modelId)) return 'moderne_azur';
  if ([6, 7, 12, 13].includes(modelId)) return 'protocole_canada';
  if ([10, 15].includes(modelId)) return 'notarial_double';
  return 'executif_navy';
}

export function getRecommendedHeaderPresetForModel(modelId: number): Exclude<KitHeaderPresetId, 'auto_header'> {
  if ([9, 10, 11, 15].includes(modelId)) return 'bipartite_double_logo';
  if ([4, 14].includes(modelId)) return 'barre_accent_haut';
  if ([6, 7, 12, 13].includes(modelId)) return 'centre_solennel';
  if ([1, 2, 3].includes(modelId)) return 'en_tete_scinde';
  if ([5, 8].includes(modelId)) return 'bandeau_royal';
  return 'bandeau_royal';
}

export function applyHeaderPresetToLayout(
  layout: ReferenceLayoutTemplate,
  headerPresetId: KitHeaderPresetId | string | undefined,
  modelId: number
): ReferenceLayoutTemplate & { _headerPresetId?: string; _forceDualHeader?: boolean } {
  const effectiveHeaderId =
    !headerPresetId || headerPresetId === 'auto_header'
      ? undefined
      : headerPresetId;

  const baseEffective = resolveEffectiveLayout(layout) || layout;
  if (!effectiveHeaderId) {
    return {
      ...baseEffective,
      _headerPresetId: getRecommendedHeaderPresetForModel(modelId),
      _forceDualHeader: [9, 10, 11, 15].includes(modelId)
    };
  }

  const curBp = baseEffective.spatialBlueprint!;
  if (effectiveHeaderId === 'bandeau_royal') {
    return {
      ...baseEffective,
      headerStyle: 'bandeau_plein',
      headerAlign: 'left',
      logoPlacement: 'top_left',
      spatialBlueprint: { ...curBp, headerLayout: 'filled_banner', headerHasDivider: false, headerBannerHeightMm: 22 },
      _headerPresetId: effectiveHeaderId
    };
  }
  if (effectiveHeaderId === 'cartouche_institutionnel') {
    return {
      ...baseEffective,
      headerStyle: 'bandeau_plein',
      headerAlign: 'left',
      logoPlacement: 'top_left',
      spatialBlueprint: { ...curBp, headerLayout: 'filled_banner', headerHasDivider: true, headerBannerHeightMm: 26 },
      _headerPresetId: effectiveHeaderId
    };
  }
  if (effectiveHeaderId === 'en_tete_scinde') {
    return {
      ...baseEffective,
      headerStyle: 'split_officiel',
      headerAlign: 'split',
      logoPlacement: 'top_left',
      spatialBlueprint: { ...curBp, headerLayout: 'split_lr', headerHasDivider: true, headerBannerHeightMm: 0 },
      _headerPresetId: effectiveHeaderId
    };
  }
  if (effectiveHeaderId === 'centre_solennel') {
    return {
      ...baseEffective,
      headerStyle: 'encadre_classique',
      headerAlign: 'center',
      logoPlacement: 'top_center',
      spatialBlueprint: { ...curBp, headerLayout: 'centered_stack', headerHasDivider: true, headerBannerHeightMm: 0 },
      _headerPresetId: effectiveHeaderId
    };
  }
  if (effectiveHeaderId === 'barre_accent_haut') {
    return {
      ...baseEffective,
      headerStyle: 'entete_epure',
      headerAlign: 'left',
      logoPlacement: 'top_left',
      spatialBlueprint: { ...curBp, headerLayout: 'top_accent_bar', headerHasDivider: true, headerBannerHeightMm: 0 },
      _headerPresetId: effectiveHeaderId
    };
  }
  if (effectiveHeaderId === 'gauche_epure') {
    return {
      ...baseEffective,
      headerStyle: 'entete_epure',
      headerAlign: 'left',
      logoPlacement: 'top_left',
      spatialBlueprint: { ...curBp, headerLayout: 'left_clean', headerHasDivider: true, headerBannerHeightMm: 0, hasTopRightMarker: true },
      _headerPresetId: effectiveHeaderId
    };
  }
  if (effectiveHeaderId === 'bipartite_double_logo') {
    return {
      ...baseEffective,
      headerStyle: 'split_officiel',
      headerAlign: 'split',
      logoPlacement: 'top_left',
      spatialBlueprint: { ...curBp, headerLayout: 'split_lr', headerHasDivider: true, headerBannerHeightMm: 0 },
      _headerPresetId: effectiveHeaderId,
      _forceDualHeader: true
    };
  }
  return baseEffective;
}

export function resolveLayoutTemplateForDocEsModel(
  modelId: number,
  layoutTemplates?: LayoutTemplatesMap,
  kitDocLayouts?: KitDocLayoutMap,
  fallbackDocEsTemplate?: ReferenceLayoutTemplate,
  kitDocHeaders?: KitDocHeaderMap
): ReferenceLayoutTemplate & { _headerPresetId?: string; _forceDualHeader?: boolean } {
  const chosenKey = kitDocLayouts?.[modelId] || 'auto_doc';
  let resolved: ReferenceLayoutTemplate;

  if (chosenKey === 'modele_importe') {
    resolved = layoutTemplates?.doc_es || fallbackDocEsTemplate || buildPresetReferenceLayout(getRecommendedPresetForModel(modelId), modelId);
  } else if (chosenKey === 'import_t9' && layoutTemplates?.t9) {
    resolved = layoutTemplates.t9;
  } else if (chosenKey === 'import_t10' && layoutTemplates?.t10) {
    resolved = layoutTemplates.t10;
  } else if (chosenKey === 'import_t11' && layoutTemplates?.t11) {
    resolved = layoutTemplates.t11;
  } else if (chosenKey === 'import_t12' && layoutTemplates?.t12) {
    resolved = layoutTemplates.t12;
  } else if (chosenKey === 'auto_doc') {
    if (fallbackDocEsTemplate && !kitDocLayouts?.[modelId]) {
      resolved = fallbackDocEsTemplate;
    } else {
      resolved = buildPresetReferenceLayout(getRecommendedPresetForModel(modelId), modelId);
    }
  } else if (
    chosenKey === 'executif_navy' ||
    chosenKey === 'moderne_azur' ||
    chosenKey === 'notarial_double' ||
    chosenKey === 'grille_ats' ||
    chosenKey === 'protocole_canada'
  ) {
    resolved = buildPresetReferenceLayout(chosenKey, modelId);
  } else {
    resolved =
      fallbackDocEsTemplate ||
      layoutTemplates?.doc_es ||
      buildPresetReferenceLayout(getRecommendedPresetForModel(modelId), modelId);
  }

  return applyHeaderPresetToLayout(resolved, kitDocHeaders?.[modelId], modelId);
}

/**
 * Classification stricte des documents selon les 6 parties ("3. Visuels, Logos & Tampons") :
 * - Modèles 1 à 8 (Direct) : Entreprise Employeur uniquement
 * - Modèle 9 (Brief de recrutement) : Entreprise Employeur (émetteur) -> Cabinet CRIC
 * - Modèles 10, 11, 15 (Prestation, Dossier présentation, Liaison tripartite) : Cabinet CRIC & Employeur
 * - Modèles 12, 13, 14 (Inscription agence, RGPD agence, Préparation entretien) : Cabinet CRIC (Agence) uniquement
 */
export function getDocEsActorRequirement(modelId: number): {
  primaryActor: ActorScopeId;
  secondaryActor?: ActorScopeId;
  isDualParty: boolean;
  badgeLabel: string;
} {
  if (modelId >= 1 && modelId <= 8) {
    return {
      primaryActor: 'employeur',
      isDualParty: false,
      badgeLabel: 'Employeur (Entreprise)'
    };
  }
  if (modelId === 9) {
    return {
      primaryActor: 'employeur',
      secondaryActor: 'prestataire',
      isDualParty: true,
      badgeLabel: 'Employeur ↔ Cabinet CRIC'
    };
  }
  if ([10, 11, 15].includes(modelId)) {
    return {
      primaryActor: 'prestataire',
      secondaryActor: 'employeur',
      isDualParty: true,
      badgeLabel: modelId === 15 ? 'Tripartite : Cabinet CRIC & Employeur' : 'Cabinet CRIC & Employeur'
    };
  }
  return {
    primaryActor: 'prestataire',
    isDualParty: false,
    badgeLabel: 'Cabinet / Agence CRIC'
  };
}

function getActorEntityInfo(
  actor: ActorScopeId,
  p: PostulantInfo
): { entityName: string; subLine: string; repName: string; repTitle: string } {
  if (actor === 'prestataire') {
    return {
      entityName: p.nomAgence || 'CABINET / AGENCE MANDATAIRE CRIC',
      subLine: `CNESST ${p.permisCnesst || 'N/A'} · CCIC ${p.numeroCcic || 'N/A'}`,
      repName: p.representantAgenceNom || 'Conseiller CRIC',
      repTitle: p.representantAgenceTitre || 'Consultant en Immigration (CRIC)'
    };
  }
  if (actor === 'notaire') {
    return {
      entityName: 'ÉTUDE NOTARIALE & ASSERMENTATION — C.-B.',
      subLine: `${p.villeSignature || 'Surrey, BC'} · Certification Officielle`,
      repName: 'Notaire Public Habilité',
      repTitle: 'Notary Public of British Columbia'
    };
  }
  if (actor === 'inspecteurHir') {
    return {
      entityName: 'INSPECTORAT CONFORMITÉ LOGEMENT (HIR / CM)',
      subLine: 'Inspection Salubrité & Normes Résidentielles C.-B.',
      repName: 'Inspecteur Certifié HIR',
      repTitle: 'Housing Inspection Representative'
    };
  }
  if (actor === 'commissaireDeclaration') {
    return {
      entityName: 'COMMISSARIAT À L’ASSERMENTATION (CER-CLT)',
      subLine: `${p.nomEntreprise} · Déclaration Officielle`,
      repName: p.representantEmployeurNom,
      repTitle: 'Commissaire / Déclarant Habilité'
    };
  }
  if (actor === 'hebEmployeur') {
    return {
      entityName: `${p.nomEntreprise} — SERVICE HÉBERGEMENT`,
      subLine: p.adresseEntreprise || 'Colombie-Britannique, Canada',
      repName: p.representantEmployeurNom,
      repTitle: p.representantEmployeurTitre
    };
  }
  return {
    entityName: p.nomEntreprise,
    subLine: p.adresseEntreprise || 'Colombie-Britannique, Canada',
    repName: p.representantEmployeurNom,
    repTitle: p.representantEmployeurTitre
  };
}

function getAssetKeysForActorScope(actor: ActorScopeId): {
  logo: ImportedAssetKey;
  signature: ImportedAssetKey;
  cachet: ImportedAssetKey;
  filigrane: ImportedAssetKey;
  arrierePlan: ImportedAssetKey;
  barcode: ImportedAssetKey;
  qrcode: ImportedAssetKey;
} {
  if (actor === 'employeur') {
    return {
      logo: 'logo',
      signature: 'signature',
      cachet: 'cachet',
      filigrane: 'filigrane',
      arrierePlan: 'arrierePlan',
      barcode: 'barcodeEmployeur',
      qrcode: 'qrcodeEmployeur'
    };
  }
  if (actor === 'prestataire') {
    return {
      logo: 'logoPrestataire',
      signature: 'signaturePrestataire',
      cachet: 'cachetPrestataire',
      filigrane: 'filigranePrestataire',
      arrierePlan: 'arrierePlanPrestataire',
      barcode: 'barcodePrestataire',
      qrcode: 'qrcodePrestataire'
    };
  }
  return {
    logo: `${actor}_logo` as ImportedAssetKey,
    signature: `${actor}_signature` as ImportedAssetKey,
    cachet: `${actor}_cachet` as ImportedAssetKey,
    filigrane: `${actor}_filigrane` as ImportedAssetKey,
    arrierePlan: `${actor}_arrierePlan` as ImportedAssetKey,
    barcode: `${actor}_barcode` as ImportedAssetKey,
    qrcode: `${actor}_qrcode` as ImportedAssetKey
  };
}

export function resolveActorAssetsForDocEsModel(
  modelId: number,
  p: PostulantInfo,
  uploadedAssets: UploadedAssetUrlsMap = {},
  assetsConfig: PdfImportedAssetsConfig = DEFAULT_PDF_ASSETS_CONFIG,
  scopeOverride?: ActorScopeId | 'auto'
): DocEsResolvedActorVisuals {
  const req = getDocEsActorRequirement(modelId);
  const primaryActor: ActorScopeId =
    scopeOverride && scopeOverride !== 'auto' ? scopeOverride : req.primaryActor;

  const primaryKeys = getAssetKeysForActorScope(primaryActor);
  const defaultCfgFor = (slot: keyof typeof primaryKeys, key: ImportedAssetKey): PdfAssetItemSettings =>
    assetsConfig[key] ||
    DEFAULT_PDF_ASSETS_CONFIG[key] ||
    DEFAULT_PDF_ASSETS_CONFIG[slot === 'barcode' ? 'barcodeEmployeur' : slot === 'qrcode' ? 'qrcodeEmployeur' : slot] ||
    DEFAULT_PDF_ASSETS_CONFIG.logo;

  const pickStrictActorSlot = (
    actor: ActorScopeId,
    slot: keyof typeof primaryKeys
  ): DocEsAssetSlotResolved => {
    const keys = getAssetKeysForActorScope(actor);
    const k = keys[slot];
    let url = uploadedAssets[k] || '';

    // Replis strictement bornés AU MÊME ACTEUR (jamais de mélange Cabinet <-> Employeur !)
    if (!url.trim()) {
      if (actor === 'employeur') {
        if (slot === 'logo') url = p.logoUrl || '';
        else if (slot === 'signature') url = p.signatureUrl || '';
        else if (slot === 'cachet') url = p.cachetUrl || '';
        else if (slot === 'filigrane') url = p.filigraneUrl || '';
      } else if (actor === 'prestataire') {
        if (slot === 'logo') url = p.logoAgenceUrl || '';
      }
    }

    return {
      key: k,
      url,
      cfg: defaultCfgFor(slot, k)
    };
  };

  const primaryEntity = getActorEntityInfo(primaryActor, p);

  const result: DocEsResolvedActorVisuals = {
    primaryActor,
    primaryEntityName: primaryEntity.entityName,
    primarySubLine: primaryEntity.subLine,
    primaryRepName: primaryEntity.repName,
    primaryRepTitle: primaryEntity.repTitle,
    logo: pickStrictActorSlot(primaryActor, 'logo'),
    signature: pickStrictActorSlot(primaryActor, 'signature'),
    cachet: pickStrictActorSlot(primaryActor, 'cachet'),
    filigrane: pickStrictActorSlot(primaryActor, 'filigrane'),
    arrierePlan: pickStrictActorSlot(primaryActor, 'arrierePlan'),
    barcode: pickStrictActorSlot(primaryActor, 'barcode'),
    qrcode: pickStrictActorSlot(primaryActor, 'qrcode'),
    photoUrl: uploadedAssets.photoCandidat || p.photoUrl
  };

  // Pour les documents bipartite / tripartite (Modèles 9, 10, 11, 15), inclure strictement le second acteur complémentaire
  const isManualOverrideSingle = Boolean(scopeOverride && scopeOverride !== 'auto');
  if (req.isDualParty && !isManualOverrideSingle) {
    const secActor: ActorScopeId =
      primaryActor === 'employeur' ? 'prestataire' : req.secondaryActor || 'employeur';
    if (secActor !== primaryActor) {
      const secEntity = getActorEntityInfo(secActor, p);
      result.secondaryActor = secActor;
      result.secondaryEntityName = secEntity.entityName;
      result.secondaryRepName = secEntity.repName;
      result.secondaryRepTitle = secEntity.repTitle;

      const secLogo = pickStrictActorSlot(secActor, 'logo');
      const secSig = pickStrictActorSlot(secActor, 'signature');
      const secCachet = pickStrictActorSlot(secActor, 'cachet');
      if (secLogo.url) result.logoSecondary = secLogo;
      if (secSig.url) result.signatureSecondary = secSig;
      if (secCachet.url) result.cachetSecondary = secCachet;
    }
  }

  return result;
}

async function prepareSafeAssetForPdf(url: string | undefined, cfg: PdfAssetItemSettings | undefined): Promise<string | undefined> {
  if (!url || !url.trim()) return undefined;
  try {
    const pngBase = url.startsWith('data:image/') ? url : await loadStaticImageAsPngDataUrl(url);
    if (!pngBase) return undefined;
    if (cfg && typeof document !== 'undefined') {
      const rendered = await renderAssetWithSettingsForPdf(pngBase, cfg);
      return rendered.dataUrl || pngBase;
    }
    return pngBase;
  } catch {
    return url.startsWith('data:image/') ? url : undefined;
  }
}

export async function preloadDocEsModelVisuals(
  modelId: number,
  p: PostulantInfo,
  uploadedAssets: UploadedAssetUrlsMap = {},
  assetsConfig: PdfImportedAssetsConfig = DEFAULT_PDF_ASSETS_CONFIG,
  scopeOverride?: ActorScopeId | 'auto'
): Promise<DocEsPreloadedImages> {
  const resolved = resolveActorAssetsForDocEsModel(modelId, p, uploadedAssets, assetsConfig, scopeOverride);

  const [
    logoEmp,
    logoAgence,
    signature,
    signatureSecondary,
    cachet,
    cachetSecondary,
    filigrane,
    arrierePlan,
    barcode,
    qrcode,
    photo
  ] = await Promise.all([
    prepareSafeAssetForPdf(resolved.logo.url, resolved.logo.cfg),
    prepareSafeAssetForPdf(resolved.logoSecondary?.url, resolved.logoSecondary?.cfg),
    prepareSafeAssetForPdf(resolved.signature.url, resolved.signature.cfg),
    prepareSafeAssetForPdf(resolved.signatureSecondary?.url, resolved.signatureSecondary?.cfg),
    prepareSafeAssetForPdf(resolved.cachet.url, resolved.cachet.cfg),
    prepareSafeAssetForPdf(resolved.cachetSecondary?.url, resolved.cachetSecondary?.cfg),
    prepareSafeAssetForPdf(resolved.filigrane.url, resolved.filigrane.cfg),
    prepareSafeAssetForPdf(resolved.arrierePlan.url, resolved.arrierePlan.cfg),
    prepareSafeAssetForPdf(resolved.barcode.url, resolved.barcode.cfg),
    prepareSafeAssetForPdf(resolved.qrcode.url, resolved.qrcode.cfg),
    prepareSafeAssetForPdf(resolved.photoUrl, undefined)
  ]);

  return {
    primaryActor: resolved.primaryActor,
    secondaryActor: resolved.secondaryActor,
    primaryEntityName: resolved.primaryEntityName,
    primarySubLine: resolved.primarySubLine,
    primaryRepName: resolved.primaryRepName,
    primaryRepTitle: resolved.primaryRepTitle,
    secondaryEntityName: resolved.secondaryEntityName,
    secondaryRepName: resolved.secondaryRepName,
    secondaryRepTitle: resolved.secondaryRepTitle,
    logoEmp,
    logoAgence,
    signature,
    signatureSecondary,
    cachet,
    cachetSecondary,
    filigrane,
    arrierePlan,
    barcode,
    qrcode,
    photo,
    cfgs: {
      logo: resolved.logo.cfg,
      logoSecondary: resolved.logoSecondary?.cfg,
      signature: resolved.signature.cfg,
      signatureSecondary: resolved.signatureSecondary?.cfg,
      cachet: resolved.cachet.cfg,
      cachetSecondary: resolved.cachetSecondary?.cfg,
      filigrane: resolved.filigrane.cfg,
      arrierePlan: resolved.arrierePlan.cfg,
      barcode: resolved.barcode.cfg,
      qrcode: resolved.qrcode.cfg
    }
  };
}

function pxCfgToMm(
  cfg: PdfAssetItemSettings | undefined,
  defaultWmm: number,
  defaultHmm: number,
  maxWmm: number,
  maxHmm: number
): { w: number; h: number; dx: number; dy: number } {
  if (!cfg) return { w: defaultWmm, h: defaultHmm, dx: 0, dy: 0 };
  const rawW = cfg.widthUnit === 'px' ? cfg.widthValue * 0.22 : defaultWmm * (cfg.widthValue / 100);
  const rawH = cfg.heightUnit === 'px' ? cfg.heightValue * 0.22 : defaultHmm * (cfg.heightValue / 100);
  return {
    w: Math.max(8, Math.min(maxWmm, rawW || defaultWmm)),
    h: Math.max(6, Math.min(maxHmm, rawH || defaultHmm)),
    dx: Math.max(-28, Math.min(28, (cfg.offsetX || 0) * 0.2)),
    dy: Math.max(-28, Math.min(28, (cfg.offsetY || 0) * 0.2))
  };
}

/**
 * Rend un modèle "Fiches et DOC ES" dans un document jsPDF existant (page courante ou nouvelle page).
 * Applique fidèlement la mise en page choisie pour ce document et les visuels des 6 parties.
 */
export function renderDocEsModelIntoPdf(
  doc: jsPDF,
  modelId: number,
  p: PostulantInfo,
  d: FichesDocEsData,
  settings: SiteSettings,
  layoutTemplate?: ReferenceLayoutTemplate,
  options?: {
    addNewPageFirst?: boolean;
    skipFooter?: boolean;
    images?: DocEsPreloadedImages;
  }
): { startPage: number; endPage: number; title: string } {
  const effective = resolveEffectiveLayout(layoutTemplate);
  const bp: SpatialBlueprint | undefined = effective?.spatialBlueprint;
  const pdfFont = effective?.fontFamily || 'helvetica';
  const lineStep =
    effective?.blockSpacing === 'compact'
      ? 3.85
      : effective?.blockSpacing === 'airy'
      ? 5.0
      : 4.35;

  const primaryRgb = effective?.primaryColor ? hexToRgbTuple(effective.primaryColor) : ([11, 37, 69] as [number, number, number]);
  const headerRgb = effective?.headerBgColor ? hexToRgbTuple(effective.headerBgColor) : primaryRgb;
  const accentRgb = effective?.accentColor ? hexToRgbTuple(effective.accentColor) : ([212, 160, 23] as [number, number, number]);
  const tintRgb = effective?.highlightTintColor ? hexToRgbTuple(effective.highlightTintColor) : ([216, 243, 235] as [number, number, number]);
  const bodyRgb = effective?.bodyTextColor ? hexToRgbTuple(effective.bodyTextColor) : ([30, 41, 59] as [number, number, number]);
  const borderRgb = effective?.borderColor ? hexToRgbTuple(effective.borderColor) : primaryRgb;

  if (options?.addNewPageFirst) {
    doc.addPage();
  }
  const startPage = doc.getNumberOfPages();

  const PAGE_WIDTH = doc.internal.pageSize.getWidth();
  const PAGE_HEIGHT = doc.internal.pageSize.getHeight();
  const MARGIN_LEFT = effective?.marginsMm?.left ?? 18;
  const MARGIN_RIGHT = effective?.marginsMm?.right ?? 18;
  const MARGIN_TOP = effective?.marginsMm?.top ?? 15;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

  const rendered = renderDocEsPlainText(modelId, p, d, settings);
  const imgs = options?.images;

  const drawPageBackgroundAndFrame = () => {
    if (effective?.pageBgColor && effective.pageBgColor.toUpperCase() !== '#FFFFFF') {
      doc.setFillColor(...hexToRgbTuple(effective.pageBgColor));
      doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 'F');
    }
    if (imgs?.arrierePlan) {
      try {
        doc.addImage(imgs.arrierePlan, 'PNG', 0, 0, PAGE_WIDTH, PAGE_HEIGHT);
      } catch {}
    }
    if (imgs?.filigrane) {
      try {
        const wmBox = pxCfgToMm(imgs.cfgs?.filigrane, 78, 92, 130, 150);
        doc.addImage(
          imgs.filigrane,
          'PNG',
          (PAGE_WIDTH - wmBox.w) / 2 + wmBox.dx,
          (PAGE_HEIGHT - wmBox.h) / 2 + wmBox.dy,
          wmBox.w,
          wmBox.h
        );
      } catch {}
    }
    if (bp?.hasLeftAccentStripe) {
      doc.setFillColor(...primaryRgb);
      doc.rect(0, 0, 5.5, PAGE_HEIGHT, 'F');
    }
    if (!effective) {
      doc.setDrawColor(...primaryRgb);
      doc.setLineWidth(0.8);
      doc.rect(12, 12, PAGE_WIDTH - 24, PAGE_HEIGHT - 24);
      doc.setDrawColor(...accentRgb);
      doc.setLineWidth(0.3);
      doc.rect(14, 14, PAGE_WIDTH - 28, PAGE_HEIGHT - 28);
      return;
    }
    if (effective.borderStyle === 'none') return;
    doc.setDrawColor(...borderRgb);
    doc.setLineWidth(effective.borderStyle === 'official_band' ? 1.1 : 0.7);
    doc.rect(11, 11, PAGE_WIDTH - 22, PAGE_HEIGHT - 22);
    if (effective.borderStyle === 'double' || effective.borderStyle === 'official_band') {
      doc.setDrawColor(...accentRgb);
      doc.setLineWidth(0.35);
      doc.rect(13.5, 13.5, PAGE_WIDTH - 27, PAGE_HEIGHT - 27);
    }
  };

  drawPageBackgroundAndFrame();

  let y = Math.max(15, MARGIN_TOP);

  const drawHeaderLogos = (inFilledBanner: boolean, bannerY: number, bannerH: number) => {
    const logoBox = pxCfgToMm(imgs?.cfgs?.logo, 32, 12, 44, 16);
    if (imgs?.logoEmp) {
      try {
        const lx =
          effective?.logoPlacement === 'top_right'
            ? PAGE_WIDTH - MARGIN_RIGHT - logoBox.w + logoBox.dx
            : effective?.logoPlacement === 'top_center'
            ? (PAGE_WIDTH - logoBox.w) / 2 + logoBox.dx
            : MARGIN_LEFT + logoBox.dx;
        const ly = inFilledBanner ? bannerY + Math.max(1.5, (bannerH - logoBox.h) / 2) : bannerY;
        if (inFilledBanner) {
          doc.setFillColor(255, 255, 255);
          doc.roundedRect(lx - 1, ly - 1, logoBox.w + 2, logoBox.h + 2, 1, 1, 'F');
        }
        doc.addImage(imgs.logoEmp, 'PNG', lx, ly, logoBox.w, logoBox.h);
      } catch {}
    }
    if (imgs?.logoAgence && imgs.logoAgence !== imgs.logoEmp) {
      try {
        const secBox = pxCfgToMm(imgs?.cfgs?.logoSecondary, 28, 11, 38, 14);
        const sx =
          effective?.logoPlacement === 'top_right'
            ? MARGIN_LEFT
            : PAGE_WIDTH - MARGIN_RIGHT - secBox.w;
        const sy = inFilledBanner ? bannerY + Math.max(1.5, (bannerH - secBox.h) / 2) : bannerY;
        if (inFilledBanner) {
          doc.setFillColor(255, 255, 255);
          doc.roundedRect(sx - 1, sy - 1, secBox.w + 2, secBox.h + 2, 1, 1, 'F');
        }
        doc.addImage(imgs.logoAgence, 'PNG', sx, sy, secBox.w, secBox.h);
      } catch {}
    }
  };

  const actorMeta = getDocEsActorRequirement(modelId);
  const headerMetaExtras = layoutTemplate as (ReferenceLayoutTemplate & { _headerPresetId?: string; _forceDualHeader?: boolean }) | undefined;
  const headerEntityFallback =
    actorMeta.primaryActor === 'prestataire'
      ? p.nomAgence || p.nomEntreprise
      : p.nomEntreprise;
  const primaryEntityLabel = (imgs?.primaryEntityName || headerEntityFallback).toUpperCase();
  const primarySubLabel =
    imgs?.primarySubLine ||
    (actorMeta.primaryActor === 'prestataire'
      ? `CABINET CRIC · CNESST ${p.permisCnesst} · MODÈLE ${modelId}`
      : `MODULE FICHES ET DOC ES · MODÈLE ${modelId}`);
  const isDualHeader = Boolean(headerMetaExtras?._forceDualHeader || imgs?.logoAgence || imgs?.secondaryEntityName);

  if (bp) {
    // 1. En-tête piloté strictement par le SpatialBlueprint & le modèle d'en-tête choisi
    if (bp.headerLayout === 'top_accent_bar') {
      doc.setFillColor(...primaryRgb);
      doc.rect(0, 0, PAGE_WIDTH, 5, 'F');
    }

    if (bp.headerLayout === 'filled_banner') {
      const bannerH = Math.max(18, Math.min(30, bp.headerBannerHeightMm || 22));
      const bx = effective?.borderStyle !== 'none' ? 14 : 0;
      const bw = effective?.borderStyle !== 'none' ? PAGE_WIDTH - 28 : PAGE_WIDTH;
      doc.setFillColor(...headerRgb);
      doc.rect(bx, y - 2, bw, bannerH, 'F');
      if (bp.headerHasDivider) {
        doc.setDrawColor(...accentRgb);
        doc.setLineWidth(0.75);
        doc.line(bx, y - 2 + bannerH, bx + bw, y - 2 + bannerH);
      }

      drawHeaderLogos(true, y - 2, bannerH);

      const headerTextRgb = effective?.headerTextColor
        ? hexToRgbTuple(effective.headerTextColor)
        : ([255, 255, 255] as [number, number, number]);
      const textStartX =
        imgs?.logoEmp && effective?.logoPlacement !== 'top_right' && effective?.logoPlacement !== 'top_center'
          ? MARGIN_LEFT + 36
          : MARGIN_LEFT;
      doc.setFont(pdfFont, 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(...headerTextRgb);
      doc.text(primaryEntityLabel, textStartX, y + 6.5, { maxWidth: isDualHeader ? 72 : 108 });
      doc.setFont(pdfFont, 'normal');
      doc.setFontSize(7.6);
      doc.setTextColor(...accentRgb);
      doc.text(primarySubLabel, textStartX, y + 12.5, { maxWidth: isDualHeader ? 74 : 112 });

      if (!imgs?.logoAgence || imgs.logoAgence === imgs.logoEmp || effective?.logoPlacement === 'top_right') {
        doc.setFontSize(8);
        doc.setTextColor(...headerTextRgb);
        doc.text(`Réf. Dossier : ${d.referenceDossier}`, PAGE_WIDTH - MARGIN_RIGHT - 2, y + 6.5, { align: 'right' });
        doc.text(`Date : ${p.dateEffet}`, PAGE_WIDTH - MARGIN_RIGHT - 2, y + 12.5, { align: 'right' });
      }
      y += bannerH + 4;
    } else if (bp.headerLayout === 'centered_stack') {
      if (imgs?.logoEmp) {
        drawHeaderLogos(false, y, 13);
        y += 14.5;
      }
      doc.setFont(pdfFont, 'bold');
      doc.setFontSize(12.5);
      doc.setTextColor(...primaryRgb);
      doc.text(primaryEntityLabel, PAGE_WIDTH / 2, y + 3.5, { align: 'center', maxWidth: CONTENT_WIDTH - 10 });
      doc.setFont(pdfFont, 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(`${primarySubLabel} · RÉF : ${d.referenceDossier}`, PAGE_WIDTH / 2, y + 8.5, {
        align: 'center'
      });
      y += 12;
      if (bp.headerHasDivider) {
        doc.setDrawColor(...primaryRgb);
        doc.setLineWidth(0.5);
        doc.line(MARGIN_LEFT, y, PAGE_WIDTH - MARGIN_RIGHT, y);
        y += 4;
      }
    } else if (bp.headerLayout === 'split_lr') {
      if (imgs?.logoEmp || imgs?.logoAgence) {
        drawHeaderLogos(false, y - 1, 13);
      }
      const leftTextX = imgs?.logoEmp && effective?.logoPlacement !== 'top_right' ? MARGIN_LEFT + 35 : MARGIN_LEFT;
      doc.setFont(pdfFont, 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(...primaryRgb);
      doc.text(primaryEntityLabel, leftTextX, y + 4.2, { maxWidth: isDualHeader ? 68 : 96 });
      doc.setFont(pdfFont, 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(primarySubLabel, leftTextX, y + 8.6, { maxWidth: isDualHeader ? 68 : 96 });

      const rightTextX = imgs?.logoAgence && imgs.logoAgence !== imgs.logoEmp
        ? PAGE_WIDTH - MARGIN_RIGHT - 32
        : PAGE_WIDTH - MARGIN_RIGHT;
      if (isDualHeader && imgs?.secondaryEntityName) {
        doc.setFont(pdfFont, 'bold');
        doc.setFontSize(8.2);
        doc.setTextColor(...primaryRgb);
        doc.text(imgs.secondaryEntityName.toUpperCase(), rightTextX, y + 4.2, { align: 'right', maxWidth: 60 });
        doc.setFont(pdfFont, 'normal');
        doc.setFontSize(7.3);
        doc.setTextColor(71, 85, 105);
        doc.text(`Réf. ${d.referenceDossier}`, rightTextX, y + 8.6, { align: 'right' });
      } else if (!imgs?.logoAgence || imgs.logoAgence === imgs.logoEmp) {
        doc.text(`Modèle ${modelId} · ${actorMeta.badgeLabel}`, PAGE_WIDTH - MARGIN_RIGHT, y + 3.5, { align: 'right' });
        doc.text(`Dossier : ${d.referenceDossier}`, PAGE_WIDTH - MARGIN_RIGHT, y + 8, { align: 'right' });
      }
      y += imgs?.logoEmp || imgs?.logoAgence ? 15 : 11;
      if (bp.headerHasDivider) {
        doc.setDrawColor(...accentRgb);
        doc.setLineWidth(0.5);
        doc.line(MARGIN_LEFT, y, PAGE_WIDTH - MARGIN_RIGHT, y);
        y += 4;
      }
    } else {
      // left_clean / top_accent_bar
      if (imgs?.logoEmp) {
        drawHeaderLogos(false, y, 13);
      }
      const leftTextX = imgs?.logoEmp && effective?.logoPlacement !== 'top_right' ? MARGIN_LEFT + 36 : MARGIN_LEFT;
      doc.setFont(pdfFont, 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...primaryRgb);
      doc.text(primaryEntityLabel, leftTextX, y + 5, { maxWidth: 112 });
      doc.setFont(pdfFont, 'normal');
      doc.setFontSize(7.6);
      doc.setTextColor(71, 85, 105);
      doc.text(`${primarySubLabel} · Dossier ${d.referenceDossier}`, leftTextX, y + 9.8, { maxWidth: 112 });
      if (bp.hasTopRightMarker) {
        doc.setDrawColor(180, 190, 200);
        doc.setLineWidth(0.2);
        doc.rect(PAGE_WIDTH - MARGIN_RIGHT - 3, y, 3, 3);
        doc.setFillColor(20, 25, 35);
        doc.rect(PAGE_WIDTH - MARGIN_RIGHT - 2.1, y + 0.9, 1.2, 1.2, 'F');
      }
      y += imgs?.logoEmp ? 15 : 12;
      if (bp.headerHasDivider) {
        doc.setDrawColor(...primaryRgb);
        doc.setLineWidth(0.35);
        doc.line(MARGIN_LEFT, y, PAGE_WIDTH - MARGIN_RIGHT, y);
        y += 4;
      }
    }

    // Photo candidat sur fiches profil / inscription (Modèles 1, 6, 11, 12)
    if (imgs?.photo && [1, 6, 11, 12].includes(modelId)) {
      try {
        doc.addImage(imgs.photo, 'PNG', PAGE_WIDTH - MARGIN_RIGHT - 21, y, 19, 23);
        doc.setDrawColor(...primaryRgb);
        doc.setLineWidth(0.25);
        doc.rect(PAGE_WIDTH - MARGIN_RIGHT - 21, y, 19, 23);
      } catch {}
    }

    // 2. Métadonnées Expéditeur / Destinataire selon metaLayout
    const metaRightPad = imgs?.photo && [1, 6, 11, 12].includes(modelId) ? 23 : 0;
    if (bp.metaLayout === 'two_col_asymmetric' || bp.metaLayout === 'two_col_equal') {
      const rightOffset = bp.metaLayout === 'two_col_asymmetric' ? 3.5 : 0;
      doc.setFont(pdfFont, 'normal');
      doc.setFontSize(8.2);
      doc.setTextColor(71, 85, 105);
      doc.text(p.adresseEntreprise || 'Canada', MARGIN_LEFT, y);
      doc.text(`Système ATS · ${p.intitulePoste}`, MARGIN_LEFT, y + 4);

      doc.setFont(pdfFont, 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(`CANDIDAT : ${p.nomComplet.toUpperCase()}`, PAGE_WIDTH - MARGIN_RIGHT - metaRightPad, y + rightOffset, { align: 'right' });
      doc.setFont(pdfFont, 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(`Code ID : ${p.codeIdCandidature}`, PAGE_WIDTH - MARGIN_RIGHT - metaRightPad, y + rightOffset + 4, { align: 'right' });
      y += Math.max(rightOffset + 9, metaRightPad > 0 ? 24 : 0);
    } else if (bp.metaLayout === 'boxed_grid') {
      const boxW = CONTENT_WIDTH - metaRightPad;
      doc.setDrawColor(203, 213, 225);
      doc.setFillColor(248, 250, 252);
      doc.rect(MARGIN_LEFT, y, boxW, 13, 'FD');
      doc.line(MARGIN_LEFT + boxW / 2, y, MARGIN_LEFT + boxW / 2, y + 13);
      doc.setFont(pdfFont, 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text(p.nomEntreprise, MARGIN_LEFT + 3, y + 4.8);
      doc.text(`CANDIDAT : ${p.nomComplet}`, MARGIN_LEFT + boxW / 2 + 3, y + 4.8);
      doc.setFont(pdfFont, 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(p.adresseEntreprise || 'Canada', MARGIN_LEFT + 3, y + 9.5);
      doc.text(`Dossier : ${d.referenceDossier}`, MARGIN_LEFT + boxW / 2 + 3, y + 9.5);
      y += Math.max(17, metaRightPad > 0 ? 25 : 0);
    } else if (bp.metaLayout === 'single_col_left') {
      doc.setFont(pdfFont, 'normal');
      doc.setFontSize(8.2);
      doc.setTextColor(71, 85, 105);
      doc.text(`${p.adresseEntreprise || 'Canada'} · Candidat : ${p.nomComplet} (${p.codeIdCandidature})`, MARGIN_LEFT, y);
      y += Math.max(7, metaRightPad > 0 ? 24 : 0);
    }

    // 3. Pastille de références uniquement si détectée sur le modèle
    if (bp.hasRefPill) {
      doc.setFillColor(...tintRgb);
      doc.roundedRect(MARGIN_LEFT, y, 34, 5.5, 1, 1, 'F');
      doc.setFont(pdfFont, 'bold');
      doc.setFontSize(8.2);
      doc.setTextColor(...primaryRgb);
      doc.text('Vos références', MARGIN_LEFT + 2, y + 3.8);

      y += 8;
      doc.setFontSize(8.2);
      doc.setTextColor(71, 85, 105);
      doc.setFont(pdfFont, 'normal');
      doc.text('N° Dossier', MARGIN_LEFT, y);
      doc.setFont(pdfFont, 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(`: ${d.referenceDossier}`, MARGIN_LEFT + 34, y);

      y += 4.2;
      doc.setFont(pdfFont, 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text('Date d’effet', MARGIN_LEFT, y);
      doc.setFont(pdfFont, 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(`: ${p.dateEffet} · Modèle ${modelId}`, MARGIN_LEFT + 34, y);
      y += 7.5;
    }

    // 4. Titre piloté par titleAlign / titleHasBox / titleHasUnderline / titleUppercase
    const titleStr = bp.titleUppercase ? rendered.title.toUpperCase() : rendered.title;
    const alignTitle = bp.titleAlign === 'left' ? 'left' : bp.titleAlign === 'right' ? 'right' : 'center';
    const titleX = alignTitle === 'center' ? PAGE_WIDTH / 2 : alignTitle === 'right' ? PAGE_WIDTH - MARGIN_RIGHT : MARGIN_LEFT;

    if (bp.titleHasBox) {
      doc.setFillColor(...tintRgb);
      doc.setDrawColor(...primaryRgb);
      doc.setLineWidth(0.5);
      doc.rect(MARGIN_LEFT, y - 3.5, CONTENT_WIDTH, bp.titleHasSubtitle && rendered.subtitle ? 13 : 9, 'FD');
      y += 1.5;
    }

    doc.setFont(pdfFont, 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...(bp.titleHasBox ? primaryRgb : ([15, 23, 42] as [number, number, number])));
    doc.text(titleStr, titleX, y, { align: alignTitle });

    if (bp.titleHasSubtitle && rendered.subtitle) {
      y += 5;
      doc.setFont(pdfFont, 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(rendered.subtitle, titleX, y, { align: alignTitle });
    }

    if (bp.titleHasUnderline) {
      y += 3.5;
      doc.setDrawColor(...accentRgb);
      doc.setLineWidth(0.5);
      doc.line(MARGIN_LEFT, y, PAGE_WIDTH - MARGIN_RIGHT, y);
    }
    y += 7;
  } else {
    // Fallback classique sans modèle importé
    doc.setFillColor(...headerRgb);
    doc.rect(15, 15, PAGE_WIDTH - 30, 22, 'F');
    drawHeaderLogos(true, 15, 22);
    const textStartX = imgs?.logoEmp ? MARGIN_LEFT + 36 : MARGIN_LEFT;
    doc.setFont(pdfFont, 'bold');
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text(p.nomEntreprise.toUpperCase(), textStartX, 24);
    doc.setFont(pdfFont, 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...accentRgb);
    doc.text(`MODULE FICHES ET DOC ES · MODÈLE ${modelId}`, textStartX, 31);
    doc.setFontSize(8);
    doc.setTextColor(220, 230, 242);
    doc.text(`Réf. Dossier : ${d.referenceDossier}`, PAGE_WIDTH - MARGIN_RIGHT - 2, 24, { align: 'right' });
    doc.text(`Date : ${p.dateEffet}`, PAGE_WIDTH - MARGIN_RIGHT - 2, 31, { align: 'right' });
    y = Math.max(46, MARGIN_TOP + 28);

    doc.setFont(pdfFont, 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...primaryRgb);
    doc.text(rendered.title, PAGE_WIDTH / 2, y, { align: 'center' });
    if (rendered.subtitle) {
      y += 5;
      doc.setFont(pdfFont, 'italic');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(rendered.subtitle, PAGE_WIDTH / 2, y, { align: 'center' });
    }
    y += 7;
    doc.setDrawColor(...accentRgb);
    doc.setLineWidth(0.5);
    doc.line(MARGIN_LEFT, y, PAGE_WIDTH - MARGIN_RIGHT, y);
    y += 6.5;
  }

  // Corps du texte nettoyé
  const sanitizedContent = rendered.content
    .replace(/^[=\-_]{4,}\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  doc.setFont(pdfFont, 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...bodyRgb);

  const lines = doc.splitTextToSize(sanitizedContent, CONTENT_WIDTH - (bp?.bodyLayout === 'cards' ? 4 : 0));
  for (let i = 0; i < lines.length; i++) {
    if (y > PAGE_HEIGHT - 24) {
      doc.addPage();
      drawPageBackgroundAndFrame();
      y = Math.max(20, MARGIN_TOP);
    }
    const line = lines[i];
    if (/^[=\-_]{3,}/.test(line.trim())) {
      continue;
    }
    const isHeading =
      Boolean(line.match(/^[0-9]\./)) ||
      line.startsWith('CANDIDAT :') ||
      line.startsWith('RÉFÉRENCE') ||
      line.startsWith('VOLET');

    if (isHeading) {
      if (bp?.hasSectionDividers && i > 0) {
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.25);
        doc.line(MARGIN_LEFT, y - 1, PAGE_WIDTH - MARGIN_RIGHT, y - 1);
      }
      if (bp?.bodyLayout === 'cards') {
        doc.setFillColor(...tintRgb);
        doc.rect(MARGIN_LEFT, y - 3, CONTENT_WIDTH, 4.8, 'F');
      }
      doc.setFont(pdfFont, 'bold');
      doc.setTextColor(...primaryRgb);
      y += 1.2;
    } else {
      doc.setFont(pdfFont, 'normal');
      doc.setTextColor(...bodyRgb);
    }
    doc.text(line, bp?.bodyLayout === 'cards' ? MARGIN_LEFT + 2 : MARGIN_LEFT, y);
    y += lineStep;
  }

  // Signatures, tampons & codes d'authentification issus des 6 Parties
  if (imgs && (imgs.cachet || imgs.signature || imgs.signatureSecondary || imgs.cachetSecondary || imgs.barcode || imgs.qrcode)) {
    if (y > PAGE_HEIGHT - 46) {
      doc.addPage();
      drawPageBackgroundAndFrame();
      y = Math.max(20, MARGIN_TOP);
    }
    const sigBlockY = Math.max(y + 4, PAGE_HEIGHT - 44);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.25);
    doc.line(MARGIN_LEFT, sigBlockY - 2, PAGE_WIDTH - MARGIN_RIGHT, sigBlockY - 2);
    doc.setFont(pdfFont, 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...primaryRgb);
    const sigEntityHeader = imgs.secondaryEntityName
      ? `${imgs.primaryEntityName || primaryEntityLabel}  |  ${imgs.secondaryEntityName}`
      : `${imgs.primaryEntityName || primaryEntityLabel} · ${imgs.primaryRepName || p.representantEmployeurNom}`;
    doc.text(sigEntityHeader.slice(0, 105), MARGIN_LEFT, sigBlockY + 4);

    if (imgs.barcode) {
      try {
        const bcBox = pxCfgToMm(imgs.cfgs?.barcode, 30, 10, 40, 14);
        doc.addImage(imgs.barcode, 'PNG', MARGIN_LEFT + bcBox.dx, sigBlockY + 7 + bcBox.dy, bcBox.w, bcBox.h);
      } catch {}
    }
    if (imgs.qrcode) {
      try {
        const qrBox = pxCfgToMm(imgs.cfgs?.qrcode, 14, 14, 22, 22);
        doc.addImage(imgs.qrcode, 'PNG', MARGIN_LEFT + 34 + qrBox.dx, sigBlockY + 5 + qrBox.dy, qrBox.w, qrBox.h);
      } catch {}
    }

    if (imgs.cachetSecondary || imgs.signatureSecondary) {
      doc.setFont(pdfFont, 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(71, 85, 105);
      doc.text(
        imgs.secondaryActor === 'employeur' ? 'Pour l’Entreprise (Employeur) :' : 'Pour le Cabinet CRIC :',
        PAGE_WIDTH / 2 - 4,
        sigBlockY + 8
      );
    }
    if (imgs.cachetSecondary) {
      try {
        const csBox = pxCfgToMm(imgs.cfgs?.cachetSecondary, 16, 16, 26, 26);
        doc.addImage(imgs.cachetSecondary, 'PNG', PAGE_WIDTH / 2 - 4 + csBox.dx, sigBlockY + 9 + csBox.dy, csBox.w, csBox.h);
      } catch {}
    }
    if (imgs.signatureSecondary) {
      try {
        const ssBox = pxCfgToMm(imgs.cfgs?.signatureSecondary, 22, 11, 34, 16);
        doc.addImage(imgs.signatureSecondary, 'PNG', PAGE_WIDTH / 2 + 14 + ssBox.dx, sigBlockY + 11 + ssBox.dy, ssBox.w, ssBox.h);
      } catch {}
    }

    if (imgs.cachet || imgs.signature) {
      doc.setFont(pdfFont, 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(...primaryRgb);
      doc.text(
        imgs.primaryActor === 'prestataire'
          ? 'Visa & Cachet Cabinet CRIC :'
          : 'Visa & Cachet Employeur :',
        PAGE_WIDTH - MARGIN_RIGHT,
        sigBlockY + 8,
        { align: 'right' }
      );
    }
    if (imgs.cachet) {
      try {
        const cBox = pxCfgToMm(imgs.cfgs?.cachet, 18, 18, 28, 28);
        doc.addImage(imgs.cachet, 'PNG', PAGE_WIDTH - MARGIN_RIGHT - 48 + cBox.dx, sigBlockY + 9 + cBox.dy, cBox.w, cBox.h);
      } catch {}
    }
    if (imgs.signature) {
      try {
        const sBox = pxCfgToMm(imgs.cfgs?.signature, 25, 12, 36, 18);
        doc.addImage(imgs.signature, 'PNG', PAGE_WIDTH - MARGIN_RIGHT - 26 + sBox.dx, sigBlockY + 11 + sBox.dy, sBox.w, sBox.h);
      } catch {}
    }
  }

  const endPage = doc.getNumberOfPages();

  // Pied de page piloté par footerLayout (sauf si géré au niveau du Kit compilé)
  if (!options?.skipFooter) {
    const fLayout = bp?.footerLayout || 'centered_legal';
    if (fLayout !== 'none') {
      for (let pg = startPage; pg <= endPage; pg++) {
        doc.setPage(pg);
        if (bp?.hasFooterDivider) {
          doc.setDrawColor(203, 213, 225);
          doc.setLineWidth(0.25);
          doc.line(MARGIN_LEFT, PAGE_HEIGHT - 16, PAGE_WIDTH - MARGIN_RIGHT, PAGE_HEIGHT - 16);
        }
        doc.setFont(pdfFont, 'normal');
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);

        if (fLayout === 'centered_legal') {
          doc.text(
            `${p.nomEntreprise} · Système ATS Certifié · Modèle ${modelId} · Document Officiel`,
            PAGE_WIDTH / 2,
            PAGE_HEIGHT - 12,
            { align: 'center' }
          );
        } else {
          if (fLayout !== 'minimal_page') {
            doc.text(
              `${p.nomEntreprise} · Modèle ${modelId} · Réf. ${d.referenceDossier}`,
              MARGIN_LEFT,
              PAGE_HEIGHT - 12
            );
          }
          doc.setFont(pdfFont, 'bold');
          doc.text(`${pg - startPage + 1}/${endPage - startPage + 1}`, PAGE_WIDTH - MARGIN_RIGHT, PAGE_HEIGHT - 12, {
            align: 'right'
          });
        }
      }
    }
  }

  return { startPage, endPage, title: rendered.title };
}

/**
 * Générateur PDF jsPDF structuré et soigné pour chaque modèle unitaire
 */
export function generateSingleDocEsPdf(
  modelId: number,
  p: PostulantInfo,
  d: FichesDocEsData,
  settings: SiteSettings,
  layoutTemplate?: ReferenceLayoutTemplate,
  preloadedImages?: DocEsPreloadedImages
): { doc: jsPDF; filename: string } {
  const effective = resolveEffectiveLayout(layoutTemplate);
  const orientation = effective?.orientation || 'portrait';
  const pageFormat = effective?.pageFormat || 'a4';
  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: pageFormat,
    compress: true
  });

  const { title } = renderDocEsModelIntoPdf(doc, modelId, p, d, settings, layoutTemplate, {
    addNewPageFirst: false,
    skipFooter: false,
    images: preloadedImages
  });

  const safeTitle = title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
  const filename = `DOC_ES_M${modelId}_${safeTitle}_${p.nom.toUpperCase()}.pdf`;
  return { doc, filename };
}

/**
 * Générateur asynchrone de PDF unitaire intégrant la mise en page du document et les visuels des 6 Parties
 */
export async function generateSingleDocEsPdfAsync(
  modelId: number,
  p: PostulantInfo,
  d: FichesDocEsData,
  settings: SiteSettings,
  layoutTemplates?: LayoutTemplatesMap,
  kitDocLayouts?: KitDocLayoutMap,
  uploadedAssets?: UploadedAssetUrlsMap,
  assetsConfig?: PdfImportedAssetsConfig,
  kitDocVisualScopes?: KitDocVisualScopeMap,
  kitDocHeaders?: KitDocHeaderMap
): Promise<{ doc: jsPDF; filename: string }> {
  const layoutTpl = resolveLayoutTemplateForDocEsModel(
    modelId,
    layoutTemplates,
    kitDocLayouts,
    layoutTemplates?.doc_es,
    kitDocHeaders
  );
  const preloadedImages = await preloadDocEsModelVisuals(
    modelId,
    p,
    uploadedAssets,
    assetsConfig,
    kitDocVisualScopes?.[modelId]
  );
  return generateSingleDocEsPdf(modelId, p, d, settings, layoutTpl, preloadedImages);
}

/**
 * Génère le Kit Candidat complet constitué de TOUS les documents PDF énumérés dans "Fiches et DOC ES"
 * correspondant au type de candidature sélectionné (Direct : Modèles 1 à 8 | Agence : Modèles 9 à 15),
 * avec mise en page par document et intégration des visuels "3. Visuels, Logos & Tampons (6 Parties)".
 */
export function generateKitDocEsCompiledPdf(
  p: PostulantInfo,
  d: FichesDocEsData,
  settings: SiteSettings,
  layoutTemplate?: ReferenceLayoutTemplate,
  images?: DocEsPreloadedImages,
  customTextOverride?: string,
  perModelLayouts?: Record<number, ReferenceLayoutTemplate>,
  perModelImages?: Record<number, DocEsPreloadedImages>
): { doc: jsPDF; filename: string; modelsIncluded: DocEsModelMeta[] } {
  const effective = resolveEffectiveLayout(layoutTemplate);
  const orientation = effective?.orientation || 'portrait';
  const pageFormat = effective?.pageFormat || 'a4';
  const pdfFont = effective?.fontFamily || 'helvetica';
  const primaryRgb = effective?.primaryColor ? hexToRgbTuple(effective.primaryColor) : ([11, 37, 69] as [number, number, number]);
  const accentRgb = effective?.accentColor ? hexToRgbTuple(effective.accentColor) : ([212, 160, 23] as [number, number, number]);

  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: pageFormat,
    compress: true
  });

  const PAGE_WIDTH = doc.internal.pageSize.getWidth();
  const PAGE_HEIGHT = doc.internal.pageSize.getHeight();
  const MARGIN_LEFT = 18;
  const MARGIN_RIGHT = 18;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

  const isAgence = p.casType === 'agence';
  const modelsIncluded = getDocEsModelsForCasType(p.casType);

  // =========================================================================
  // PAGE 1 : COUVERTURE & SOMMAIRE DU KIT CANDIDAT (FICHES ET DOC ES)
  // =========================================================================
  if (images?.arrierePlan) {
    try {
      doc.addImage(images.arrierePlan, 'PNG', 0, 0, PAGE_WIDTH, PAGE_HEIGHT);
    } catch {}
  }
  if (images?.filigrane) {
    try {
      doc.addImage(images.filigrane, 'PNG', (PAGE_WIDTH - 80) / 2, (PAGE_HEIGHT - 95) / 2, 80, 95);
    } catch {}
  }

  doc.setDrawColor(...primaryRgb);
  doc.setLineWidth(1.1);
  doc.rect(11, 11, PAGE_WIDTH - 22, PAGE_HEIGHT - 22);
  doc.setDrawColor(...accentRgb);
  doc.setLineWidth(0.35);
  doc.rect(13.5, 13.5, PAGE_WIDTH - 27, PAGE_HEIGHT - 27);

  let y = 21;

  if (images?.logoEmp) {
    try {
      const lBox = pxCfgToMm(images.cfgs?.logo, 38, 15, 48, 18);
      doc.addImage(images.logoEmp, 'PNG', MARGIN_LEFT + lBox.dx, y + lBox.dy, lBox.w, lBox.h);
    } catch {}
  }
  if (isAgence && images?.logoAgence) {
    try {
      const sBox = pxCfgToMm(images.cfgs?.logoSecondary, 38, 15, 48, 18);
      doc.addImage(images.logoAgence, 'PNG', PAGE_WIDTH - MARGIN_RIGHT - sBox.w + sBox.dx, y + sBox.dy, sBox.w, sBox.h);
    } catch {}
  }

  y += 22;

  doc.setFont(pdfFont, 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...primaryRgb);
  doc.text(
    isAgence
      ? 'KIT CANDIDAT OFFICIEL — CANDIDATURE VIA AGENCE DE PLACEMENT'
      : 'KIT CANDIDAT OFFICIEL — CANDIDATURE EN DIRECT',
    PAGE_WIDTH / 2,
    y,
    { align: 'center', maxWidth: CONTENT_WIDTH }
  );

  y += 8;
  doc.setFont(pdfFont, 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...accentRgb);
  doc.text(
    `DOSSIER COMPILÉ « FICHES ET DOC ES » (${modelsIncluded.length} DOCUMENTS PDF) · RÉF. ${p.codeIdCandidature}`,
    PAGE_WIDTH / 2,
    y,
    { align: 'center' }
  );

  y += 9;

  // Cartouche Identité & Poste
  if (images?.photo) {
    try {
      doc.addImage(images.photo, 'PNG', PAGE_WIDTH - MARGIN_RIGHT - 28, y, 26, 32);
      doc.setDrawColor(...primaryRgb);
      doc.setLineWidth(0.3);
      doc.rect(PAGE_WIDTH - MARGIN_RIGHT - 28, y, 26, 32);
    } catch {}
  }

  const infoBoxWidth = images?.photo ? CONTENT_WIDTH - 34 : CONTENT_WIDTH;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(MARGIN_LEFT, y, infoBoxWidth, 34, 2, 2, 'FD');

  doc.setFont(pdfFont, 'bold');
  doc.setFontSize(9);
  doc.setTextColor(0, 102, 179);
  doc.text('IDENTITÉ DU POSTULANT & AFFECTATION', MARGIN_LEFT + 4, y + 6);

  doc.setFont(pdfFont, 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(30, 41, 59);
  doc.text(`• Postulant : ${p.nomComplet} (${p.civilite}) · Nationalité : ${p.nationalite}`, MARGIN_LEFT + 4, y + 12);
  doc.text(`• Poste visé : ${p.intitulePoste} (CNP ${p.codeCnp}) · ${p.typeContrat}`, MARGIN_LEFT + 4, y + 17);
  doc.text(`• Employeur : ${p.nomEntreprise} · Date d'effet : ${p.dateEffet}`, MARGIN_LEFT + 4, y + 22);
  doc.text(
    isAgence
      ? `• Cabinet mandataire : ${p.nomAgence} (CNESST ${p.permisCnesst} · CCIC ${p.numeroCcic})`
      : `• Parcours sélectionné : Candidature directe (Sans intermédiaire) · Entretien : ${p.dateEntretien} à ${p.heureEntretien}`,
    MARGIN_LEFT + 4,
    y + 27,
    { maxWidth: infoBoxWidth - 8 }
  );

  y += 41;

  // Sommaire des documents inclus (placeholders mis à jour après rendu de chaque modèle)
  doc.setFont(pdfFont, 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...primaryRgb);
  doc.text(
    isAgence
      ? 'SOMMAIRE DES DOCUMENTS PDF INCLUS (PARTIE 2 : AGENCE DE PLACEMENT — MODÈLES 9 À 15)'
      : 'SOMMAIRE DES DOCUMENTS PDF INCLUS (PARTIE 1 : CANDIDATURE DIRECTE — MODÈLES 1 À 8)',
    MARGIN_LEFT,
    y
  );
  y += 5;

  const tocEntryPositions: { page: number; y: number; model: DocEsModelMeta }[] = [];
  modelsIncluded.forEach((m, idx) => {
    doc.setFillColor(idx % 2 === 0 ? 248 : 255, idx % 2 === 0 ? 250 : 255, idx % 2 === 0 ? 252 : 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(MARGIN_LEFT, y, CONTENT_WIDTH, 11.5, 1.5, 1.5, 'FD');

    doc.setFont(pdfFont, 'bold');
    doc.setFontSize(8);
    doc.setTextColor(0, 102, 179);
    doc.text(`${m.number}`, MARGIN_LEFT + 3, y + 4.8);

    doc.setTextColor(15, 23, 42);
    doc.text(m.title, MARGIN_LEFT + 26, y + 4.8, { maxWidth: CONTENT_WIDTH - 52 });

    doc.setFont(pdfFont, 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(100, 116, 139);
    const docTpl = perModelLayouts?.[m.id];
    const layoutTag = docTpl?.detectedSummary ? ` · Mise en page : ${docTpl.detectedSummary}` : '';
    doc.text(`${m.categoryLabel}${m.isInteractive ? ' · Formulaire interactif' : ''}${layoutTag}`, MARGIN_LEFT + 26, y + 9.2, {
      maxWidth: CONTENT_WIDTH - 52
    });

    tocEntryPositions.push({ page: 1, y: y + 6, model: m });
    y += 13;
  });

  if (customTextOverride && customTextOverride.trim()) {
    y += 2;
    doc.setFillColor(254, 249, 195);
    doc.setDrawColor(234, 179, 8);
    doc.roundedRect(MARGIN_LEFT, y, CONTENT_WIDTH, 18, 1.5, 1.5, 'FD');
    doc.setFont(pdfFont, 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(133, 77, 14);
    doc.text('NOTE / ANNOTATION COMPLÉMENTAIRE DU DOSSIER :', MARGIN_LEFT + 3, y + 5);
    doc.setFont(pdfFont, 'normal');
    doc.text(customTextOverride.trim().slice(0, 260), MARGIN_LEFT + 3, y + 10, { maxWidth: CONTENT_WIDTH - 6 });
  }

  // Signatures, cachet & codes auth en bas de couverture
  const sigY = PAGE_HEIGHT - 38;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.line(MARGIN_LEFT, sigY, PAGE_WIDTH - MARGIN_RIGHT, sigY);
  doc.setFont(pdfFont, 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...primaryRgb);
  doc.text('Pour l’Employeur (Canada) :', MARGIN_LEFT, sigY + 5);
  doc.setFont(pdfFont, 'normal');
  doc.text(`${p.representantEmployeurNom} — ${p.representantEmployeurTitre}`, MARGIN_LEFT, sigY + 9.5);

  if (images?.barcode) {
    try {
      doc.addImage(images.barcode, 'PNG', MARGIN_LEFT, sigY + 12, 28, 8);
    } catch {}
  }
  if (images?.qrcode) {
    try {
      doc.addImage(images.qrcode, 'PNG', MARGIN_LEFT + 31, sigY + 10, 12, 12);
    } catch {}
  }

  if (images?.cachet) {
    try {
      const cBox = pxCfgToMm(images.cfgs?.cachet, 18, 18, 26, 26);
      doc.addImage(images.cachet, 'PNG', PAGE_WIDTH / 2 - 5 + cBox.dx, sigY + 1 + cBox.dy, cBox.w, cBox.h);
    } catch {}
  }
  if (images?.signature) {
    try {
      const sBox = pxCfgToMm(images.cfgs?.signature, 25, 12, 34, 16);
      doc.addImage(images.signature, 'PNG', PAGE_WIDTH / 2 + 16 + sBox.dx, sigY + 3 + sBox.dy, sBox.w, sBox.h);
    } catch {}
  }

  doc.setFont(pdfFont, 'bold');
  doc.text(isAgence ? 'Pour l’Agence Mandataire :' : 'Pour le Candidat :', PAGE_WIDTH - MARGIN_RIGHT, sigY + 5, {
    align: 'right'
  });
  doc.setFont(pdfFont, 'normal');
  doc.text(isAgence ? p.representantAgenceNom : p.nomComplet, PAGE_WIDTH - MARGIN_RIGHT, sigY + 9.5, {
    align: 'right'
  });

  // =========================================================================
  // PAGES SUIVANTES : RENDU COMPLET DE CHAQUE DOCUMENT "FICHES ET DOC ES"
  // =========================================================================
  const renderedRanges: { model: DocEsModelMeta; startPage: number; endPage: number }[] = [];
  for (const model of modelsIncluded) {
    const modelLayout = perModelLayouts?.[model.id] || layoutTemplate;
    const modelImgs = perModelImages?.[model.id] || images;
    const res = renderDocEsModelIntoPdf(doc, model.id, p, d, settings, modelLayout, {
      addNewPageFirst: true,
      skipFooter: true,
      images: modelImgs
    });
    renderedRanges.push({ model, startPage: res.startPage, endPage: res.endPage });
  }

  // Mise à jour des numéros de pages sur le Sommaire (Page 1)
  doc.setPage(1);
  tocEntryPositions.forEach((pos, idx) => {
    const range = renderedRanges[idx];
    if (!range) return;
    doc.setFont(pdfFont, 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...primaryRgb);
    const label =
      range.startPage === range.endPage ? `p. ${range.startPage}` : `pp. ${range.startPage}-${range.endPage}`;
    doc.text(label, PAGE_WIDTH - MARGIN_RIGHT - 3, pos.y, { align: 'right' });
  });

  // Pied de page global unifié sur toutes les pages du Kit
  const totalPages = doc.getNumberOfPages();
  for (let pg = 1; pg <= totalPages; pg++) {
    doc.setPage(pg);
    doc.setFont(pdfFont, 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    const matchingModel = renderedRanges.find((r) => pg >= r.startPage && pg <= r.endPage);
    const footerLeft = matchingModel
      ? `Kit Candidat (${isAgence ? 'Via Agence' : 'Direct'}) · ${matchingModel.model.number} : ${matchingModel.model.title}`
      : `Kit Candidat (${isAgence ? 'Via Agence' : 'Direct'}) · Sommaire & Fiches DOC ES`;
    doc.text(footerLeft.slice(0, 95), MARGIN_LEFT, PAGE_HEIGHT - 10);
    doc.setFont(pdfFont, 'bold');
    doc.text(`Page ${pg} / ${totalPages}`, PAGE_WIDTH - MARGIN_RIGHT, PAGE_HEIGHT - 10, { align: 'right' });
  }

  const modeTag = isAgence ? 'Agence' : 'Direct';
  const filename = `Kit_Candidat_${modeTag}_${p.nom.toUpperCase()}_${p.codeIdCandidature}.pdf`;
  return { doc, filename, modelsIncluded };
}

/**
 * Génère individuellement tous les PDF énumérés dans "Fiches et DOC ES" selon le casType (sync fallback).
 */
export function generateKitDocEsIndividualPdfs(
  p: PostulantInfo,
  d: FichesDocEsData,
  settings: SiteSettings,
  layoutTemplate?: ReferenceLayoutTemplate
): { model: DocEsModelMeta; doc: jsPDF; filename: string }[] {
  const models = getDocEsModelsForCasType(p.casType);
  return models.map((model) => {
    const { doc, filename } = generateSingleDocEsPdf(model.id, p, d, settings, layoutTemplate);
    return { model, doc, filename };
  });
}

/**
 * Génère individuellement tous les PDF "Fiches et DOC ES" avec leur mise en page dédiée et les visuels des 6 parties.
 */
export async function generateKitDocEsIndividualPdfsAsync(
  p: PostulantInfo,
  d: FichesDocEsData,
  settings: SiteSettings,
  layoutTemplates?: LayoutTemplatesMap,
  kitDocLayouts?: KitDocLayoutMap,
  uploadedAssets?: UploadedAssetUrlsMap,
  assetsConfig?: PdfImportedAssetsConfig,
  kitDocVisualScopes?: KitDocVisualScopeMap,
  kitDocHeaders?: KitDocHeaderMap
): Promise<{ model: DocEsModelMeta; doc: jsPDF; filename: string }[]> {
  const models = getDocEsModelsForCasType(p.casType);
  const results: { model: DocEsModelMeta; doc: jsPDF; filename: string }[] = [];
  for (const model of models) {
    const { doc, filename } = await generateSingleDocEsPdfAsync(
      model.id,
      p,
      d,
      settings,
      layoutTemplates,
      kitDocLayouts,
      uploadedAssets,
      assetsConfig,
      kitDocVisualScopes,
      kitDocHeaders
    );
    results.push({ model, doc, filename });
  }
  return results;
}
