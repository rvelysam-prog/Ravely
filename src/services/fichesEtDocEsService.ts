/**
 * Service pour le module "Fiches et DOC ES"
 * 15 Fiches et Formulaires RH structurés pour Candidature en Direct et Via Agence de Placement
 * Inclus : Remplacement dynamique de balises, export PDF jsPDF propre, persistance Firestore/localStorage
 */

import { jsPDF } from 'jspdf';
import { PostulantInfo } from './postulantDossierService';
import { SiteSettings } from '../types';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

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

/**
 * Générateur PDF jsPDF structuré et soigné pour chaque modèle
 */
export function generateSingleDocEsPdf(
  modelId: number,
  p: PostulantInfo,
  d: FichesDocEsData,
  settings: SiteSettings
): { doc: jsPDF; filename: string } {
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

  const rendered = renderDocEsPlainText(modelId, p, d, settings);

  // Cadre élégant
  doc.setDrawColor(11, 37, 69);
  doc.setLineWidth(0.8);
  doc.rect(12, 12, PAGE_WIDTH - 24, PAGE_HEIGHT - 24);
  doc.setDrawColor(212, 160, 23);
  doc.setLineWidth(0.3);
  doc.rect(14, 14, PAGE_WIDTH - 28, PAGE_HEIGHT - 28);

  // Bandeau supérieur
  doc.setFillColor(11, 37, 69);
  doc.rect(15, 15, PAGE_WIDTH - 30, 22, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text(p.nomEntreprise.toUpperCase(), MARGIN_LEFT, 24);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(212, 160, 23);
  doc.text(`MODULE FICHES ET DOC ES · MODÈLE ${modelId}`, MARGIN_LEFT, 31);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(220, 230, 242);
  doc.text(`Réf. Dossier : ${d.referenceDossier}`, PAGE_WIDTH - MARGIN_RIGHT, 24, { align: 'right' });
  doc.text(`Date : ${p.dateEffet}`, PAGE_WIDTH - MARGIN_RIGHT, 31, { align: 'right' });

  // Titre du document
  let y = 46;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(11, 37, 69);
  doc.text(rendered.title, PAGE_WIDTH / 2, y, { align: 'center' });

  if (rendered.subtitle) {
    y += 5;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(rendered.subtitle, PAGE_WIDTH / 2, y, { align: 'center' });
  }

  y += 7;
  doc.setDrawColor(0, 102, 179);
  doc.setLineWidth(0.5);
  doc.line(MARGIN_LEFT, y, PAGE_WIDTH - MARGIN_RIGHT, y);

  y += 6;

  // Corps du texte
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);

  const lines = doc.splitTextToSize(rendered.content, CONTENT_WIDTH);
  for (let i = 0; i < lines.length; i++) {
    if (y > PAGE_HEIGHT - 25) {
      doc.addPage();
      // Cadre nouvelle page
      doc.setDrawColor(11, 37, 69);
      doc.setLineWidth(0.8);
      doc.rect(12, 12, PAGE_WIDTH - 24, PAGE_HEIGHT - 24);
      y = 22;
    }
    const line = lines[i];
    if (line.startsWith('===') || line.startsWith('---')) {
      // Ignorer séparateurs ASCII
      continue;
    }
    if (line.match(/^[0-9]\./) || line.startsWith('CANDIDAT :') || line.startsWith('RÉFÉRENCE') || line.startsWith('VOLET')) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(11, 37, 69);
      y += 1.5;
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
    }
    doc.text(line, MARGIN_LEFT, y);
    y += 4.5;
  }

  // Pied de page
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `${p.nomEntreprise} · Système ATS Certifié · Modèle ${modelId} · Document Officiel`,
    PAGE_WIDTH / 2,
    PAGE_HEIGHT - 17,
    { align: 'center' }
  );

  const safeTitle = rendered.title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
  const filename = `DOC_ES_M${modelId}_${safeTitle}_${p.nom.toUpperCase()}.pdf`;
  return { doc, filename };
}
