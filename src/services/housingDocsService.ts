/**
 * Service de génération documentaire pour les Onglets 9 à 12 :
 * - Onglet 9  : Attestation officielle de prise en charge de l'hébergement
 * - Onglet 10 : Certificat d'authentification notariale de l'attestation d'hébergement
 * - Onglet 11 : Rapport officiel d'inspection du logement (Housing Inspection Report – HIR)
 * - Onglet 12 : Déclaration solennelle de prise en charge de l'hébergement (Statutory Declaration)
 *
 * Prend en charge :
 * - Liaison exclusive des visuels importés par acteur (Logo, Signature, Cachet/Sceau, Filigrane, Arrière-plan, Code-Barres, QR Code)
 * - Génération PDF A4 Original (jsPDF)
 * - Génération Word éditable (.docx) via la bibliothèque open-source `docx`
 * - Génération HTML Email Responsive (tableaux imbriqués inline CSS)
 */

import { jsPDF } from 'jspdf';
import {
  Document as DocxDocument,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  ImageRun,
  ShadingType,
  PageOrientation,
  convertMillimetersToTwip
} from 'docx';
import { SiteSettings } from '../types';
import { PostulantInfo } from './postulantDossierService';
import {
  PdfImportedAssetsConfig,
  UploadedAssetUrlsMap,
  renderAssetWithSettingsForPdf,
  ActorScopeId
} from './departmentsAndEmailService';
import { generateSmallStackedBarcodeCanvasDataUrl } from './contractGenerationService';
import QRCode from 'qrcode';
import {
  ReferenceLayoutTemplate,
  hexToRgbTuple,
  resolveEffectiveLayout
} from './layoutImitationService';

export type HousingTabNumber = 9 | 10 | 11 | 12;

export type AccommodationTypeOption =
  | 'Appartement individuel'
  | 'Maison partagée'
  | 'Chambre individuelle meublée'
  | "Résidence d'entreprise";

export type EmployerPropertyRelation =
  | 'Propriétaire'
  | 'Locataire autorisé à héberger'
  | 'Convention de mise à disposition';

export type CostSplitOption = '100% employeur' | 'Prise en charge partielle' | 'À charge du salarié';
export type UtilitySplitOption = 'Inclus' | 'Non inclus';

export interface InspectionCriterionRow {
  id: string;
  critere: string;
  conforme: boolean;
  observations: string;
}

export interface HousingAndNotaryData {
  // ONGLET 9 : ATTESTATION D'HÉBERGEMENT
  employeurNumEnregistrement: string;
  employeurTel: string;
  employeurEmail: string;
  beneficiaireDateLieuNaissance: string;
  beneficiairePasseport: string;
  beneficiaireDateArriveePrevue: string;
  hebergementAdresseComplete: string;
  hebergementVilleProvince: string;
  hebergementTypeLogement: AccommodationTypeOption;
  hebergementNombreChambres: string;
  hebergementCapaciteAccueil: string;
  hebergementDateDisponibilite: string;
  hebergementDureeType: 'toute_duree_contrat' | 'duree_limitee';
  hebergementDureeMois: string;
  hebergementLienEmployeur: EmployerPropertyRelation;
  fraisLoyerOption: CostSplitOption;
  fraisLoyerMontant: string;
  fraisEau: 'Incluse' | 'Non incluse';
  fraisElectricite: 'Incluse' | 'Non incluse';
  fraisChauffage: UtilitySplitOption;
  fraisInternet: UtilitySplitOption;
  fraisAutres: string;
  attestationLieu: string;
  attestationDate: string;

  // ONGLET 10 : CERTIFICAT D'AUTHENTIFICATION NOTARIALE
  notaireNomComplet: string;
  notaireNumeroLicence: string;
  notaireVilleAdresse: string;
  notaireTelephone: string;
  notaireEmail: string;
  notaireNumeroDossier: string;
  notairePieceIdentiteSignataire: string;
  notaireFormaliteDevantMoi: boolean;
  notaireFormaliteReconnue: boolean;
  notaireFormaliteConforme: boolean;
  notaireDateCertification: string;
  notaireLieuCertification: string;

  // ONGLET 11 : RAPPORT OFFICIEL D'INSPECTION DU LOGEMENT (HIR)
  hirOrganismeNom: string;
  hirInspecteurNom: string;
  hirInspecteurTitre: string;
  hirNumeroInspection: string;
  hirDateVisite: string;
  hirSuperficie: string;
  hirNombrePiecesChambres: string;
  hirCapaciteMaximale: string;
  hirCriteres: InspectionCriterionRow[];
  hirRemarques: string;
  hirAnomaliesMineures: string;
  hirMesuresCorrectives: string;
  hirConclusionStatut:
    | 'Logement conforme aux normes d’habitation de Colombie-Britannique'
    | 'Logement conforme sous réserve des corrections mineures ci-dessus'
    | 'Logement non conforme';
  hirDateRapport: string;
  hirValiditeMois: string;

  // ONGLET 12 : DÉCLARATION SOLENNELLE (STATUTORY DECLARATION)
  declAutoriteType: 'Notaire Public en Colombie-Britannique' | 'Commissaire aux Affidavits';
  declAutoriteNom: string;
  declAutoriteNumeroCommission: string;
  declVilleProvince: string;
  declJour: string;
  declMoisAnnee: string;
  declDureeEtConditions: string;
}

export const DEFAULT_HIR_CRITERIA: InspectionCriterionRow[] = [
  { id: 'c1', critere: 'Structure générale du bâtiment', conforme: true, observations: 'Fondations, toiture et murs sains sans infiltration' },
  { id: 'c2', critere: 'Chauffage fonctionnel', conforme: true, observations: 'Système central thermostatique testé (21 °C)' },
  { id: 'c3', critere: 'Eau courante chaude et froide', conforme: true, observations: 'Pression nominale et chauffe-eau sécurisé' },
  { id: 'c4', critere: 'Installation électrique conforme', conforme: true, observations: 'Panneau aux normes BC Hydro, disjoncteurs actifs' },
  { id: 'c5', critere: 'Détecteurs de fumée', conforme: true, observations: 'Installés dans chaque chambre et couloir, testés OK' },
  { id: 'c6', critere: 'Détecteur de monoxyde de carbone', conforme: true, observations: 'Détecteur certifié UL installé et fonctionnel' },
  { id: 'c7', critere: 'Sanitaires fonctionnels', conforme: true, observations: 'Salle de bain ventilée, étanchéité et évacuation OK' },
  { id: 'c8', critere: 'Cuisine équipée', conforme: true, observations: 'Réfrigérateur, cuisinière et hotte fonctionnels' },
  { id: 'c9', critere: 'Ventilation adéquate', conforme: true, observations: 'Fenêtres ouvrantes et extraction mécanique actives' },
  { id: 'c10', critere: 'Issues de secours accessibles', conforme: true, observations: 'Accès dégagés conformes au BC Building Code' },
  { id: 'c11', critere: 'Sécurité des portes et fenêtres', conforme: true, observations: 'Serrures multipoints et loquets opérationnels' },
  { id: 'c12', critere: 'État de salubrité générale', conforme: true, observations: 'Logement propre, meublé et prêt à occuper' }
];

export function buildDefaultHousingAndNotaryData(
  postulant: PostulantInfo,
  settings: SiteSettings
): HousingAndNotaryData {
  const now = new Date();
  const dateIso = now.toLocaleDateString('fr-CA');
  const moisNoms = [
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

  return {
    employeurNumEnregistrement: postulant.numeroImmatriculationEntreprise || 'BC1129970 / NE 799094917',
    employeurTel: postulant.contactDocPhone || settings.phone || '+15068022206',
    employeurEmail: postulant.contactDocEmail || settings.email || 'direction@atlantictransport.ca',
    beneficiaireDateLieuNaissance: `${postulant.dateNaissance || '1988-06-15'} — (${postulant.nationalite})`,
    beneficiairePasseport: postulant.numeroPieceIdentite || 'C01294857',
    beneficiaireDateArriveePrevue: postulant.dateEffet || dateIso,
    hebergementAdresseComplete: '10420 132A Street, Unit 204, Surrey, BC V3T 3V4',
    hebergementVilleProvince: 'Surrey, Colombie-Britannique, Canada',
    hebergementTypeLogement: 'Appartement individuel',
    hebergementNombreChambres: '2 chambres fermées + salon',
    hebergementCapaciteAccueil: '2 occupants maximum',
    hebergementDateDisponibilite: postulant.dateEffet || dateIso,
    hebergementDureeType: 'toute_duree_contrat',
    hebergementDureeMois: '12',
    hebergementLienEmployeur: 'Locataire autorisé à héberger',
    fraisLoyerOption: '100% employeur',
    fraisLoyerMontant: '0 $ CAD',
    fraisEau: 'Incluse',
    fraisElectricite: 'Incluse',
    fraisChauffage: 'Inclus',
    fraisInternet: 'Inclus',
    fraisAutres: 'Mobilier complet, literie et stationnement résidentiel inclus',
    attestationLieu: 'Surrey, BC',
    attestationDate: dateIso,

    notaireNomComplet: 'Me Claire Henderson, Notary Public',
    notaireNumeroLicence: 'BCNP-2026-4418',
    notaireVilleAdresse: '10090 152 Street, Suite 310, Surrey, BC V3R 8X8, Canada',
    notaireTelephone: '+1 (604) 555-0194',
    notaireEmail: 'notary.office@bc-legal-notaries.ca',
    notaireNumeroDossier: `NOT-BC-${now.getFullYear()}-${postulant.codeIdCandidature.slice(-4) || '1042'}`,
    notairePieceIdentiteSignataire: 'Passeport Canadien / Permis de Conduire BC (Pièce vérifiée)',
    notaireFormaliteDevantMoi: true,
    notaireFormaliteReconnue: true,
    notaireFormaliteConforme: true,
    notaireDateCertification: dateIso,
    notaireLieuCertification: 'Surrey, Colombie-Britannique',

    hirOrganismeNom: 'BC Accommodation Compliance (BCAC)',
    hirInspecteurNom: 'Marc-André Pelletier, CHI (Certified Housing Inspector)',
    hirInspecteurTitre: 'Inspecteur résidentiel agréé — Colombie-Britannique',
    hirNumeroInspection: `HIR-BC-${now.getFullYear()}-${postulant.codeIdCandidature.slice(-4) || '8821'}`,
    hirDateVisite: dateIso,
    hirSuperficie: '78 m² (840 pi²)',
    hirNombrePiecesChambres: '4 pièces (2 chambres)',
    hirCapaciteMaximale: '2 adultes',
    hirCriteres: DEFAULT_HIR_CRITERIA.map((c) => ({ ...c })),
    hirRemarques: 'Logement situé à proximité des axes routiers et transports en commun de Surrey.',
    hirAnomaliesMineures: 'Aucune anomalie majeure relevée lors de la visite.',
    hirMesuresCorrectives: 'Néant — contrôle annuel planifié.',
    hirConclusionStatut: 'Logement conforme aux normes d’habitation de Colombie-Britannique',
    hirDateRapport: dateIso,
    hirValiditeMois: '12',

    declAutoriteType: 'Notaire Public en Colombie-Britannique',
    declAutoriteNom: 'Me Claire Henderson, Notary Public',
    declAutoriteNumeroCommission: 'BC-COM-89320',
    declVilleProvince: 'Surrey, Colombie-Britannique',
    declJour: String(now.getDate()),
    declMoisAnnee: `${moisNoms[now.getMonth()]} ${now.getFullYear()}`,
    declDureeEtConditions: 'Pour toute la durée du contrat de travail, sans frais de loyer ni charges à la charge du travailleur'
  };
}

export function getExclusiveActorForTab(tabNumber: HousingTabNumber): ActorScopeId {
  switch (tabNumber) {
    case 9:
      return 'hebEmployeur';
    case 10:
      return 'notaire';
    case 11:
      return 'inspecteurHir';
    case 12:
      return 'commissaireDeclaration';
  }
}

export function getTabActorAssets(
  tabNumber: HousingTabNumber,
  assetsConfig: PdfImportedAssetsConfig,
  uploadedAssets: UploadedAssetUrlsMap
) {
  const actor = getExclusiveActorForTab(tabNumber);
  const pick = (suffix: 'logo' | 'signature' | 'cachet' | 'filigrane' | 'arrierePlan' | 'barcode' | 'qrcode') => {
    const key = `${actor}_${suffix}` as keyof UploadedAssetUrlsMap & keyof PdfImportedAssetsConfig;
    const url = uploadedAssets[key];
    const cfg = assetsConfig[key];
    return { key, url, cfg };
  };

  return {
    actor,
    logo: pick('logo'),
    signature: pick('signature'),
    cachet: pick('cachet'),
    filigrane: pick('filigrane'),
    arrierePlan: pick('arrierePlan'),
    barcode: pick('barcode'),
    qrcode: pick('qrcode')
  };
}

export function getTabDocumentTitle(tabNumber: HousingTabNumber): string {
  switch (tabNumber) {
    case 9:
      return "Attestation officielle de prise en charge de l'hébergement";
    case 10:
      return "Certificat d'authentification notariale de l'attestation d'hébergement";
    case 11:
      return "Rapport officiel d'inspection du logement (Housing Inspection Report – HIR)";
    case 12:
      return "Déclaration solennelle de prise en charge de l'hébergement (Statutory Declaration)";
  }
}

// ============================================================================
// 1. GÉNÉRATION TEXTE STRUCTURÉ (ONGLETS 9, 10, 11, 12)
// ============================================================================

export function generateOnglet9PlainText(data: HousingAndNotaryData, p: PostulantInfo): string {
  const dureeText =
    data.hebergementDureeType === 'toute_duree_contrat'
      ? '[X] Pour la durée du contrat de travail'
      : `[X] Durée limitée : ${data.hebergementDureeMois || '12'} mois`;

  return `====================================================================
PROVINCE DE COLOMBIE-BRITANNIQUE / CANADA
ATTESTATION OFFICIELLE DE PRISE EN CHARGE DE L'HÉBERGEMENT
====================================================================

1. IDENTIFICATION DE L'EMPLOYEUR
• Raison sociale : ${p.nomEntreprise}
• Numéro d'immatriculation / d'enregistrement : ${data.employeurNumEnregistrement}
• Adresse du siège social : ${p.adresseEntreprise}
• Représentant légal : ${p.representantEmployeurNom} — Fonction : ${p.representantEmployeurTitre}
• Téléphone : ${data.employeurTel}
• Courriel : ${data.employeurEmail}

2. IDENTIFICATION DU BÉNÉFICIAIRE (TRAVAILLEUR)
• Nom complet : ${p.nomComplet}
• Date et lieu de naissance : ${data.beneficiaireDateLieuNaissance}
• Nationalité : ${p.nationalite}
• Numéro de passeport : ${data.beneficiairePasseport}
• Poste occupé : ${p.intitulePoste} (Code CNP ${p.codeCnp})
• Date prévue d'arrivée / début d'emploi : ${data.beneficiaireDateArriveePrevue}

3. DESCRIPTION DE L'HÉBERGEMENT MIS À DISPOSITION
• Adresse complète du logement : ${data.hebergementAdresseComplete}
• Ville / Province : ${data.hebergementVilleProvince}
• Type de logement : [X] ${data.hebergementTypeLogement}
• Nombre de chambres : ${data.hebergementNombreChambres}
• Capacité d'accueil : ${data.hebergementCapaciteAccueil}
• Date de disponibilité : ${data.hebergementDateDisponibilite}
• Durée prévue de mise à disposition : ${dureeText}
• Lien de l'employeur avec le logement : [X] ${data.hebergementLienEmployeur}

4. MODALITÉS FINANCIÈRES DE PRISE EN CHARGE
• Loyer mensuel : ${data.fraisLoyerOption}${data.fraisLoyerOption === 'Prise en charge partielle' ? ` (${data.fraisLoyerMontant})` : ''}
• Eau : ${data.fraisEau}
• Électricité : ${data.fraisElectricite}
• Chauffage : ${data.fraisChauffage}
• Internet : ${data.fraisInternet}
• Autres : ${data.fraisAutres}

5. ENGAGEMENT OFFICIEL DE L'EMPLOYEUR
Je soussigné(e) ${p.representantEmployeurNom}, agissant en qualité de ${p.representantEmployeurTitre} de l'entreprise ${p.nomEntreprise}, atteste sur l'honneur mettre à la disposition du travailleur désigné ci-dessus un logement conforme aux normes de salubrité, de sécurité et d'habitation en vigueur dans la province de Colombie-Britannique, pendant toute la durée indiquée ci-dessus.
La présente attestation est délivrée pour valoir ce que de droit auprès des autorités d'immigration, administratives et de contrôle.

Fait à ${data.attestationLieu}, le ${data.attestationDate}

Signature du représentant légal :
${p.representantEmployeurNom} — ${p.representantEmployeurTitre}
[Cachet / Sceau de l'entreprise]`;
}

export function generateOnglet10PlainText(data: HousingAndNotaryData, p: PostulantInfo): string {
  return `====================================================================
PROVINCE OF BRITISH COLUMBIA / CANADA
CERTIFICAT D'AUTHENTIFICATION NOTARIALE (NOTARIAL CERTIFICATE)
De l'attestation officielle de prise en charge de l'hébergement
====================================================================

RÉFÉRENCE DOSSIER NOTARIAL : ${data.notaireNumeroDossier}
LIEN DOSSIER CANDIDAT : ${p.codeIdCandidature} (${p.nomComplet})

Je soussigné(e), ${data.notaireNomComplet}, Notaire public dûment habilité(e) et exerçant dans la province de Colombie-Britannique, Canada, en vertu du Notaries Act [RSBC 1996] c. 334, certifie par les présentes que :

1. COMPARUTION ET VÉRIFICATION D'IDENTITÉ DU SIGNATAIRE
• Nom complet du signataire : ${p.representantEmployeurNom}
• Qualité / Fonction : ${p.representantEmployeurTitre} de ${p.nomEntreprise}
• Pièce d'identité officielle vérifiée : ${data.notairePieceIdentiteSignataire}

2. CONSTATATIONS ET FORMALITÉS NOTARIALES
Le signataire identifié ci-dessus a comparu devant moi à ${data.notaireLieuCertification} en date du ${data.notaireDateCertification}, et déclare que l'Attestation officielle de prise en charge de l'hébergement établie en faveur de ${p.nomComplet} (Passeport n° ${data.beneficiairePasseport}) pour le logement sis au ${data.hebergementAdresseComplete} est authentique :
• [${data.notaireFormaliteDevantMoi ? 'X' : ' '}] A été signée personnellement devant moi par le représentant légal autorisé.
• [${data.notaireFormaliteReconnue ? 'X' : ' '}] A reconnu sa signature manuscrite et numérique comme étant véritable et engageant l'entreprise ${p.nomEntreprise}.
• [${data.notaireFormaliteConforme ? 'X' : ' '}] A affirmé que les déclarations relatives à la mise à disposition du logement sont véridiques, volontaires et conformes.

3. IDENTIFICATION DU NOTAIRE PUBLIC INSTRUMENTAIRE
• Nom : ${data.notaireNomComplet}
• Numéro de membre / Licence : ${data.notaireNumeroLicence}
• Étude notariale : ${data.notaireVilleAdresse}
• Téléphone : ${data.notaireTelephone} · Courriel : ${data.notaireEmail}

EN FOI DE QUOI, j'ai signé le présent certificat et apposé mon sceau officiel notarial à ${data.notaireLieuCertification}, ce ${data.notaireDateCertification}.

Signature du Notaire public : ___________________________
[Sceau officiel notarial apposé]`;
}

export function generateOnglet11PlainText(data: HousingAndNotaryData, p: PostulantInfo): string {
  const rowsText = data.hirCriteres
    .map(
      (c, i) =>
        `${String(i + 1).padStart(2, '0')}. ${c.critere} : ${c.conforme ? '[CONFORME]' : '[NON CONFORME]'} — ${c.observations}`
    )
    .join('\n');

  return `====================================================================
HOUSING INSPECTION REPORT (HIR)
RAPPORT OFFICIEL D'INSPECTION DU LOGEMENT — COLOMBIE-BRITANNIQUE
====================================================================

1. INFORMATIONS SUR L'INSPECTION
• Organisme / Inspecteur : ${data.hirOrganismeNom}
• Inspecteur responsable : ${data.hirInspecteurNom} (${data.hirInspecteurTitre})
• Numéro d'inspection : ${data.hirNumeroInspection}
• Date de la visite : ${data.hirDateVisite}
• Travailleur concerné : ${p.nomComplet} (${p.intitulePoste}) · Employeur : ${p.nomEntreprise}

2. IDENTIFICATION DU LOGEMENT INSPECTÉ
• Adresse complète : ${data.hebergementAdresseComplete}, ${data.hebergementVilleProvince}
• Type de logement : ${data.hebergementTypeLogement}
• Superficie approximative : ${data.hirSuperficie}
• Nombre de pièces / chambres : ${data.hirNombrePiecesChambres}
• Capacité d'occupation maximale : ${data.hirCapaciteMaximale}

3. GRILLE D'ÉVALUATION TECHNIQUE ET SÉCURITAIRE (12 CRITÈRES)
${rowsText}

4. REMARQUES ET OBSERVATIONS
• Remarques complémentaires : ${data.hirRemarques}
• Anomalies mineures constatées : ${data.hirAnomaliesMineures}
• Mesures correctives demandées : ${data.hirMesuresCorrectives}

5. CONCLUSION OFFICIELLE
Statut : [X] ${data.hirConclusionStatut}
Validité du présent rapport : ${data.hirValiditeMois} mois à compter du ${data.hirDateRapport}.

Fait à ${data.hebergementVilleProvince}, le ${data.hirDateRapport}
Inspecteur responsable : ${data.hirInspecteurNom}
[Signature & Cachet officiel HIR]`;
}

export function generateOnglet12PlainText(data: HousingAndNotaryData, p: PostulantInfo): string {
  return `====================================================================
PROVINCE OF BRITISH COLUMBIA / CANADA
DÉCLARATION SOLENNELLE DE PRISE EN CHARGE DE L'HÉBERGEMENT
(STATUTORY DECLARATION)
====================================================================

Réf. Dossier : ${p.codeIdCandidature} · Travailleur : ${p.nomComplet}

AFFAIRE RELATIVE À L'HÉBERGEMENT D'UN TRAVAILLEUR ÉTRANGER EN COLOMBIE-BRITANNIQUE

Je soussigné(e), ${p.representantEmployeurNom}, exerçant les fonctions de ${p.representantEmployeurTitre} au sein de l'entreprise ${p.nomEntreprise}, résidant / domicilié(e) professionnellement au ${p.adresseEntreprise},

DÉCLARE SOLENNELLEMENT CE QUI SUIT :

1. Que l'entreprise ${p.nomEntreprise} (N° ${data.employeurNumEnregistrement}) procède au recrutement de ${p.nomComplet} (Passeport n° ${data.beneficiairePasseport}) pour le poste de ${p.intitulePoste} (CNP ${p.codeCnp}), avec une entrée en fonction prévue le ${data.beneficiaireDateArriveePrevue}.

2. Que l'entreprise ${p.nomEntreprise} s'engage fermement et irrévocablement à fournir / assurer l'hébergement du travailleur susnommé à l'adresse suivante :
   ${data.hebergementAdresseComplete}, ${data.hebergementVilleProvince} (${data.hebergementTypeLogement} — ${data.hebergementNombreChambres}).

3. Que le logement mis à disposition respecte pleinement les exigences légales de sécurité, d'hygiène, de superficie et de décence applicables en Colombie-Britannique (BC Residential Tenancy & Building Standards).

4. Que les conditions et la durée de prise en charge sont les suivantes :
   ${data.declDureeEtConditions}.
   Répartition : Loyer (${data.fraisLoyerOption}), Eau (${data.fraisEau}), Électricité (${data.fraisElectricite}), Chauffage (${data.fraisChauffage}), Internet (${data.fraisInternet}).

5. Que je fais la présente déclaration solennelle en la croyant consciencieusement vraie et sachant qu'elle a la même force et le même effet que si elle était faite sous serment en vertu de la Loi sur la preuve au Canada et des lois de la Colombie-Britannique.

DÉCLARÉ SOLENNELLEMENT devant moi à ${data.declVilleProvince},
ce ${data.declJour}e jour de ${data.declMoisAnnee}.

Déclarant : ${p.representantEmployeurNom} (${p.representantEmployeurTitre})
Signature du déclarant : ___________________________

Autorité assermentatrice (${data.declAutoriteType}) : ${data.declAutoriteNom}
N° de commission / licence : ${data.declAutoriteNumeroCommission}
Signature et sceau officiel de l'autorité : ___________________________`;
}

export function getHousingTabPlainText(
  tabNumber: HousingTabNumber,
  data: HousingAndNotaryData,
  p: PostulantInfo
): string {
  switch (tabNumber) {
    case 9:
      return generateOnglet9PlainText(data, p);
    case 10:
      return generateOnglet10PlainText(data, p);
    case 11:
      return generateOnglet11PlainText(data, p);
    case 12:
      return generateOnglet12PlainText(data, p);
  }
}

// ============================================================================
// 1B. MODÈLE STRUCTURÉ POUR IMITATION FIDÈLE DE MISE EN PAGE (SANS BARRES ===)
// ============================================================================

export interface StructuredTabDocumentModel {
  superLabel: string;
  mainTitle: string;
  mainSubtitle: string;
  senderLines: string[];
  recipientLines: string[];
  refPillLabel: string;
  refPairs: Array<{ label: string; value: string }>;
  introLines: string[];
  bodyParagraphs: string[];
  summaryTable?: {
    headers: string[];
    rows: string[][];
  };
  faitALine: string;
  signatoryHeading: string;
  signatorySubRole: string;
  signatoryPrintedName: string;
  footerLegalLines: string[];
}

export function buildStructuredHousingDocument(
  tabNumber: HousingTabNumber,
  data: HousingAndNotaryData,
  p: PostulantInfo
): StructuredTabDocumentModel {
  if (tabNumber === 9) {
    const dureeVal =
      data.hebergementDureeType === 'toute_duree_contrat'
        ? 'Pour toute la durée du contrat de travail'
        : `Durée limitée : ${data.hebergementDureeMois || '12'} mois`;

    return {
      superLabel: 'PROVINCE DE COLOMBIE-BRITANNIQUE / CANADA',
      mainTitle: "Attestation officielle de prise en charge de l'hébergement",
      mainSubtitle: 'HÉBERGEMENT DU TRAVAILLEUR & CONFORMITÉ IMMIGRATION',
      senderLines: [
        p.nomEntreprise.toUpperCase(),
        p.adresseEntreprise,
        `Immatriculation : ${data.employeurNumEnregistrement}`,
        `Téléphone : ${data.employeurTel}`,
        `Courriel : ${data.employeurEmail}`
      ],
      recipientLines: [
        `M. / Mme ${p.nomComplet.toUpperCase()}`,
        data.hebergementAdresseComplete,
        data.hebergementVilleProvince,
        `Passeport n° ${data.beneficiairePasseport}`
      ],
      refPillLabel: 'Vos références',
      refPairs: [
        { label: 'N° Dossier / ID', value: p.codeIdCandidature },
        { label: 'Poste / Code CNP', value: `${p.intitulePoste} (CNP ${p.codeCnp})` },
        { label: 'Date de début prévue', value: data.beneficiaireDateArriveePrevue }
      ],
      introLines: [
        `Employeur soussigné : ${p.nomEntreprise}, représenté par ${p.representantEmployeurNom} (${p.representantEmployeurTitre}).`,
        `Bénéficiaire désigné : ${p.nomComplet}, né(e) le ${data.beneficiaireDateLieuNaissance}, de nationalité ${p.nationalite}.`
      ],
      bodyParagraphs: [
        `Atteste, par la présente, mettre à la disposition du travailleur désigné ci-dessus un logement conforme aux normes de salubrité, de sécurité et d'habitation en vigueur en Colombie-Britannique, situé au ${data.hebergementAdresseComplete} (${data.hebergementVilleProvince}).`,
        `Caractéristiques du logement : ${data.hebergementTypeLogement} (${data.hebergementNombreChambres}, capacité maximale : ${data.hebergementCapaciteAccueil}), disponible dès le ${data.hebergementDateDisponibilite} (${dureeVal}). Lien de l'employeur avec le logement : ${data.hebergementLienEmployeur}.`,
        `Modalités financières : Loyer (${data.fraisLoyerOption}${data.fraisLoyerOption === 'Prise en charge partielle' ? ` — ${data.fraisLoyerMontant}` : ''}), Eau (${data.fraisEau}), Électricité (${data.fraisElectricite}), Chauffage (${data.fraisChauffage}), Internet (${data.fraisInternet}). ${data.fraisAutres}.`,
        `La présente attestation est délivrée pour servir et valoir ce que de droit auprès des autorités d'immigration, administratives et de contrôle.`
      ],
      faitALine: `Fait à ${data.attestationLieu} le ${data.attestationDate}`,
      signatoryHeading: "Pour l'employeur, par délégation :",
      signatorySubRole: p.representantEmployeurTitre,
      signatoryPrintedName: p.representantEmployeurNom,
      footerLegalLines: [
        `${p.nomEntreprise} — Immatriculation : ${data.employeurNumEnregistrement} — Siège : ${p.adresseEntreprise}`,
        `Document officiel de prise en charge d'hébergement — Colombie-Britannique, Canada.`,
        `Contact vérification : ${data.employeurEmail} · ${data.employeurTel}`
      ]
    };
  }

  if (tabNumber === 10) {
    return {
      superLabel: 'PROVINCE OF BRITISH COLUMBIA / CANADA',
      mainTitle: "Certificat d'authentification notariale",
      mainSubtitle: 'NOTARIAL CERTIFICATE — ATTESTATION D’HÉBERGEMENT',
      senderLines: [
        data.notaireNomComplet.toUpperCase(),
        `Licence Notaire BC : ${data.notaireNumeroLicence}`,
        data.notaireVilleAdresse,
        `Tél : ${data.notaireTelephone}`,
        `Courriel : ${data.notaireEmail}`
      ],
      recipientLines: [
        `Signataire : ${p.representantEmployeurNom}`,
        `${p.representantEmployeurTitre} — ${p.nomEntreprise}`,
        `Pour le travailleur : ${p.nomComplet}`,
        `Logement : ${data.hebergementAdresseComplete}`
      ],
      refPillLabel: 'Références notariales',
      refPairs: [
        { label: 'N° Dossier Notarial', value: data.notaireNumeroDossier },
        { label: 'Réf. Candidat', value: `${p.codeIdCandidature} (${p.nomComplet})` },
        { label: 'Pièce vérifiée', value: data.notairePieceIdentiteSignataire }
      ],
      introLines: [
        `Instrumentaire : ${data.notaireNomComplet}, Notaire Public dûment habilité(e) en Colombie-Britannique (Notaries Act [RSBC 1996] c. 334).`,
        `Comparant : ${p.representantEmployeurNom}, agissant pour ${p.nomEntreprise} (Passeport bénéficiaire : ${data.beneficiairePasseport}).`
      ],
      bodyParagraphs: [
        `Certifie que le signataire identifié ci-dessus a personnellement comparu devant moi à ${data.notaireLieuCertification} en date du ${data.notaireDateCertification} concernant l'Attestation officielle de prise en charge de l'hébergement établie en faveur de ${p.nomComplet}.`,
        `Formalités constatées : [${data.notaireFormaliteDevantMoi ? '✓' : ' '}] Signée personnellement devant moi ; [${data.notaireFormaliteReconnue ? '✓' : ' '}] Signature reconnue véritable ; [${data.notaireFormaliteConforme ? '✓' : ' '}] Déclarations déclarées véridiques et conformes.`,
        `En foi de quoi, j'ai signé le présent certificat et apposé mon sceau officiel notarial pour servir et valoir ce que de droit.`
      ],
      faitALine: `Fait à ${data.notaireLieuCertification} le ${data.notaireDateCertification}`,
      signatoryHeading: 'Le Notaire Public instrumentaire :',
      signatorySubRole: `Licence ${data.notaireNumeroLicence}`,
      signatoryPrintedName: data.notaireNomComplet,
      footerLegalLines: [
        `Étude notariale : ${data.notaireNomComplet} — ${data.notaireVilleAdresse}`,
        `Notaries Act [RSBC 1996] c. 334 — Province of British Columbia, Canada.`,
        `Vérification étude : ${data.notaireEmail} · ${data.notaireTelephone}`
      ]
    };
  }

  if (tabNumber === 11) {
    return {
      superLabel: 'HOUSING INSPECTION REPORT (HIR) — COLOMBIE-BRITANNIQUE',
      mainTitle: "Rapport officiel d'inspection du logement",
      mainSubtitle: 'GRILLE DE CONFORMITÉ TECHNIQUE ET SÉCURITAIRE',
      senderLines: [
        data.hirOrganismeNom.toUpperCase(),
        data.hirInspecteurNom,
        data.hirInspecteurTitre,
        `N° Inspection : ${data.hirNumeroInspection}`,
        `Visite effectuée le : ${data.hirDateVisite}`
      ],
      recipientLines: [
        `Employeur : ${p.nomEntreprise}`,
        `Travailleur : ${p.nomComplet}`,
        data.hebergementAdresseComplete,
        data.hebergementVilleProvince
      ],
      refPillLabel: 'Détails du logement inspecté',
      refPairs: [
        { label: 'Type & Superficie', value: `${data.hebergementTypeLogement} — ${data.hirSuperficie}` },
        { label: 'Pièces & Capacité', value: `${data.hirNombrePiecesChambres} · Max ${data.hirCapaciteMaximale}` },
        { label: 'Conclusion officielle', value: data.hirConclusionStatut }
      ],
      introLines: [
        `Observations générales : ${data.hirRemarques}`,
        `Anomalies : ${data.hirAnomaliesMineures} · Mesures : ${data.hirMesuresCorrectives}`
      ],
      bodyParagraphs: [
        `Validité du présent rapport : ${data.hirValiditeMois} mois à compter du ${data.hirDateRapport}.`
      ],
      summaryTable: {
        headers: ['Critère inspecté', 'Statut', 'Observations'],
        rows: data.hirCriteres.map((c, idx) => [
          `${String(idx + 1).padStart(2, '0')}. ${c.critere}`,
          c.conforme ? 'CONFORME' : 'NON CONFORME',
          c.observations
        ])
      },
      faitALine: `Fait à ${data.hebergementVilleProvince} le ${data.hirDateRapport}`,
      signatoryHeading: 'Inspecteur résidentiel responsable :',
      signatorySubRole: data.hirInspecteurTitre,
      signatoryPrintedName: data.hirInspecteurNom,
      footerLegalLines: [
        `${data.hirOrganismeNom} — Rapport n° ${data.hirNumeroInspection} — Colombie-Britannique, Canada`,
        `Conforme aux exigences BC Residential Tenancy & Building Standards.`,
        `Dossier candidat : ${p.codeIdCandidature} · ${p.nomComplet}`
      ]
    };
  }

  return {
    superLabel: 'PROVINCE OF BRITISH COLUMBIA / CANADA',
    mainTitle: "Déclaration solennelle de prise en charge de l'hébergement",
    mainSubtitle: 'STATUTORY DECLARATION — LOI SUR LA PREUVE AU CANADA',
    senderLines: [
      `DÉCLARANT : ${p.representantEmployeurNom.toUpperCase()}`,
      p.representantEmployeurTitre,
      p.nomEntreprise,
      p.adresseEntreprise,
      `Immatriculation : ${data.employeurNumEnregistrement}`
    ],
    recipientLines: [
      `TRAVAILLEUR : ${p.nomComplet.toUpperCase()}`,
      `Passeport n° ${data.beneficiairePasseport}`,
      data.hebergementAdresseComplete,
      data.hebergementVilleProvince
    ],
    refPillLabel: 'Références de la déclaration',
    refPairs: [
      { label: 'N° Dossier', value: p.codeIdCandidature },
      { label: 'Poste / CNP', value: `${p.intitulePoste} (CNP ${p.codeCnp})` },
      { label: 'Autorité assermentatrice', value: `${data.declAutoriteNom} (${data.declAutoriteNumeroCommission})` }
    ],
    introLines: [
      `Je soussigné(e), ${p.representantEmployeurNom}, exerçant les fonctions de ${p.representantEmployeurTitre} au sein de ${p.nomEntreprise}, déclare solennellement ce qui suit :`
    ],
    bodyParagraphs: [
      `1. L'entreprise ${p.nomEntreprise} procède au recrutement de ${p.nomComplet} (Passeport n° ${data.beneficiairePasseport}) pour le poste de ${p.intitulePoste} (CNP ${p.codeCnp}), entrée prévue le ${data.beneficiaireDateArriveePrevue}.`,
      `2. L'entreprise s'engage irrévocablement à assurer l'hébergement du travailleur au ${data.hebergementAdresseComplete}, ${data.hebergementVilleProvince} (${data.hebergementTypeLogement} — ${data.hebergementNombreChambres}), en conformité avec les normes BC Building Standards.`,
      `3. Conditions de prise en charge : ${data.declDureeEtConditions}. Loyer (${data.fraisLoyerOption}), Eau (${data.fraisEau}), Électricité (${data.fraisElectricite}), Chauffage (${data.fraisChauffage}), Internet (${data.fraisInternet}).`,
      `4. Je fais la présente déclaration solennelle en la croyant consciencieusement vraie et sachant qu'elle a la même force que sous serment en vertu de la Loi sur la preuve au Canada.`
    ],
    faitALine: `Déclaré à ${data.declVilleProvince} ce ${data.declJour}e jour de ${data.declMoisAnnee}`,
    signatoryHeading: `${data.declAutoriteType} :`,
    signatorySubRole: `Commission ${data.declAutoriteNumeroCommission}`,
    signatoryPrintedName: data.declAutoriteNom,
    footerLegalLines: [
      `Déclarant : ${p.representantEmployeurNom} — Autorité : ${data.declAutoriteNom} (${data.declAutoriteNumeroCommission})`,
      `Statutory Declaration — Canada Evidence Act / British Columbia Evidence Act.`,
      `Dossier : ${p.codeIdCandidature} · ${p.nomEntreprise}`
    ]
  };
}

// ============================================================================
// 2. HTML EMAIL RESPONSIVE (TABLEAUX IMBRIQUÉS COMPATIBLES GMAIL / OUTLOOK)
// ============================================================================

export function generateHousingTabEmailHtml(
  tabNumber: HousingTabNumber,
  data: HousingAndNotaryData,
  p: PostulantInfo,
  uploadedAssets: UploadedAssetUrlsMap,
  customText?: string,
  layoutTemplate?: ReferenceLayoutTemplate
): string {
  const effectiveLayout = resolveEffectiveLayout(layoutTemplate);
  const title = getTabDocumentTitle(tabNumber);
  const actor = getExclusiveActorForTab(tabNumber);
  const logoKey = `${actor}_logo` as keyof UploadedAssetUrlsMap;
  const sigKey = `${actor}_signature` as keyof UploadedAssetUrlsMap;
  const cachetKey = `${actor}_cachet` as keyof UploadedAssetUrlsMap;
  const qrKey = `${actor}_qrcode` as keyof UploadedAssetUrlsMap;
  const logoSrc = uploadedAssets[logoKey] || '';
  const sigSrc = uploadedAssets[sigKey] || '';
  const cachetSrc = uploadedAssets[cachetKey] || '';
  const qrSrc = uploadedAssets[qrKey] || '';

  const defaultAccent =
    tabNumber === 9 ? '#0B2545' : tabNumber === 10 ? '#1E293B' : tabNumber === 11 ? '#065F46' : '#312E81';
  const primaryColor = effectiveLayout?.primaryColor || defaultAccent;
  const accentColor = effectiveLayout?.headerBgColor || primaryColor;
  const accentBorderColor = effectiveLayout?.accentColor || primaryColor;
  const tintBg = effectiveLayout?.highlightTintColor || '#e2f5ee';
  const pageBg = effectiveLayout?.pageBgColor || '#ffffff';
  const bodyColor = effectiveLayout?.bodyTextColor || '#1e293b';
  const fontStack =
    effectiveLayout?.fontFamily === 'times'
      ? 'Georgia, "Times New Roman", Times, serif'
      : effectiveLayout?.fontFamily === 'courier'
      ? '"Courier New", Courier, monospace'
      : 'Arial, Helvetica, sans-serif';
  const padPx =
    effectiveLayout?.blockSpacing === 'compact'
      ? '24px 28px'
      : effectiveLayout?.blockSpacing === 'airy'
      ? '34px 36px'
      : '28px 32px';

  const isLetterheadSplit = effectiveLayout?.layoutArchetype === 'letterhead_split';
  const outerBorder =
    effectiveLayout?.borderStyle === 'double'
      ? `4px double ${effectiveLayout.borderColor || primaryColor}`
      : effectiveLayout?.borderStyle === 'simple'
      ? `2px solid ${effectiveLayout.borderColor || primaryColor}`
      : '1px solid #e2e8f0';

  if (isLetterheadSplit && !customText?.trim()) {
    const model = buildStructuredHousingDocument(tabNumber, data, p);
    const logoAlign =
      effectiveLayout.logoPlacement === 'top_right'
        ? 'right'
        : effectiveLayout.logoPlacement === 'top_center'
        ? 'center'
        : 'left';

    const refRowsHtml = model.refPairs
      .map(
        (pair) => `
        <tr>
          <td style="padding: 2px 12px 2px 0; color: #334155; font-size: 11px; white-space: nowrap;">${pair.label}</td>
          <td style="padding: 2px 0; color: #0f172a; font-size: 11px; font-weight: bold;">: ${pair.value}</td>
        </tr>`
      )
      .join('');

    const introHtml = model.introLines
      .map((l) => `<p style="margin: 0 0 4px 0; font-size: 12px; color: ${bodyColor};">${l}</p>`)
      .join('');

    const bodyParagraphsHtml = model.bodyParagraphs
      .map((para) => `<p style="margin: 8px 0; font-size: 12px; line-height: 1.55; color: ${bodyColor};">${para}</p>`)
      .join('');

    const tableHtml = model.summaryTable
      ? `<table width="100%" cellpadding="5" cellspacing="0" border="0" style="border-collapse: collapse; margin: 12px 0; font-family: ${fontStack}; font-size: 10.5px;">
          <tr style="background-color: ${tintBg}; color: ${primaryColor};">
            ${model.summaryTable.headers.map((h) => `<th align="left" style="border: 1px solid #cbd5e1; padding: 5px;">${h}</th>`).join('')}
          </tr>
          ${model.summaryTable.rows
            .map(
              (r, idx) =>
                `<tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">${r
                  .map((cell) => `<td style="border: 1px solid #cbd5e1; padding: 4px 6px;">${cell}</td>`)
                  .join('')}</tr>`
            )
            .join('')}
        </table>`
      : '';

    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${model.mainTitle}</title>
</head>
<body style="margin: 0; padding: 20px; background-color: #f1f5f9; font-family: ${fontStack};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center">
        <table role="presentation" width="640" cellpadding="0" cellspacing="0" border="0" style="max-width: 640px; width: 100%; background-color: ${pageBg}; border: ${outerBorder}; padding: ${padPx};">
          <tr>
            <td style="padding-bottom: 18px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="${logoAlign}" valign="middle">
                    ${logoSrc ? `<img src="${logoSrc}" alt="Logo Officiel" style="max-height: 50px; max-width: 180px; display: inline-block;" />` : `<strong style="font-size: 15px; color: ${primaryColor};">${p.nomEntreprise}</strong>`}
                  </td>
                  <td align="right" valign="top" style="width: 24px;">
                    <span style="display: inline-block; width: 10px; height: 10px; border: 1px solid #94a3b8;"></span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 16px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td width="52%" valign="top" style="font-size: 11px; line-height: 1.45; color: #334155;">
                    ${model.senderLines.map((l, i) => `<div>${i === 0 ? `<strong>${l}</strong>` : l}</div>`).join('')}
                  </td>
                  <td width="48%" valign="top" style="padding-top: 14px; font-size: 11px; line-height: 1.45; color: #0f172a;">
                    ${model.recipientLines.map((l, i) => `<div>${i === 0 ? `<strong>${l}</strong>` : l}</div>`).join('')}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 20px;">
              <span style="display: inline-block; background-color: ${tintBg}; color: ${primaryColor}; font-weight: bold; font-size: 11px; padding: 3px 10px; border-radius: 3px; margin-bottom: 6px;">${model.refPillLabel}</span>
              <table cellpadding="0" cellspacing="0" border="0">
                ${refRowsHtml}
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 10px 0 22px 0;">
              <h1 style="margin: 0; font-size: 18px; font-weight: bold; color: #0f172a; font-family: ${fontStack};">${model.mainTitle}</h1>
              <p style="margin: 4px 0 0 0; font-size: 11.5px; letter-spacing: 0.6px; color: #475569;">${model.mainSubtitle}</p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 22px;">
              <div style="margin-bottom: 10px;">${introHtml}</div>
              ${bodyParagraphsHtml}
              ${tableHtml}
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 26px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td width="52%" valign="top" style="font-size: 11.5px; color: ${bodyColor}; padding-top: 4px;">
                    ${model.faitALine}
                  </td>
                  <td width="48%" valign="top" style="font-size: 11.5px; color: #0f172a;">
                    <div style="font-weight: bold; margin-bottom: 6px;">${model.signatoryHeading}</div>
                    <div style="color: #475569; font-size: 11px; margin-bottom: 8px;">${model.signatorySubRole}</div>
                    <div>
                      ${sigSrc ? `<img src="${sigSrc}" alt="Signature" style="max-height: 48px; vertical-align: middle; margin-right: 8px;" />` : ''}
                      ${cachetSrc ? `<img src="${cachetSrc}" alt="Cachet" style="max-height: 52px; vertical-align: middle;" />` : ''}
                    </div>
                    <div style="margin-top: 6px; font-weight: bold;">${model.signatoryPrintedName}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding-top: 12px; border-top: 1px solid #e2e8f0;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td width="52" valign="middle">
                    ${qrSrc ? `<img src="${qrSrc}" alt="QR" style="width: 44px; height: 44px; display: block;" />` : ''}
                  </td>
                  <td valign="middle" style="font-size: 9px; line-height: 1.35; color: #64748b; padding: 0 8px;">
                    ${model.footerLegalLines.map((l) => `<div>${l}</div>`).join('')}
                  </td>
                  <td width="32" align="right" valign="bottom" style="font-size: 10px; font-weight: bold; color: #475569;">
                    1/1
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  const bodyText = (customText && customText.trim() ? customText : getHousingTabPlainText(tabNumber, data, p))
    .replace(/^=+\s*$/gm, '')
    .trim();
  const escapedBody = bodyText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br/>');

  let extraTableHtml = '';
  if (tabNumber === 9 && !customText) {
    extraTableHtml = `
      <table width="100%" cellpadding="8" cellspacing="0" border="0" style="border-collapse: collapse; margin-top: 16px; font-family: ${fontStack}; font-size: 12px;">
        <tr style="background-color: ${accentColor}; color: #ffffff;">
          <th align="left" style="border: 1px solid #cbd5e1;">Poste de dépense</th>
          <th align="left" style="border: 1px solid #cbd5e1;">Modalité de prise en charge</th>
        </tr>
        <tr><td style="border: 1px solid #cbd5e1;">Loyer mensuel</td><td style="border: 1px solid #cbd5e1;"><strong>${data.fraisLoyerOption}</strong> ${data.fraisLoyerOption === 'Prise en charge partielle' ? `(${data.fraisLoyerMontant})` : ''}</td></tr>
        <tr style="background-color: #f8fafc;"><td style="border: 1px solid #cbd5e1;">Eau / Électricité</td><td style="border: 1px solid #cbd5e1;">Eau : ${data.fraisEau} · Électricité : ${data.fraisElectricite}</td></tr>
        <tr><td style="border: 1px solid #cbd5e1;">Chauffage / Internet</td><td style="border: 1px solid #cbd5e1;">Chauffage : ${data.fraisChauffage} · Internet : ${data.fraisInternet}</td></tr>
        <tr style="background-color: #f8fafc;"><td style="border: 1px solid #cbd5e1;">Autres équipements</td><td style="border: 1px solid #cbd5e1;">${data.fraisAutres}</td></tr>
      </table>`;
  } else if (tabNumber === 11 && !customText) {
    const rowsHtml = data.hirCriteres
      .map(
        (c, idx) => `
        <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
          <td style="border: 1px solid #cbd5e1; padding: 6px; font-weight: bold;">${c.critere}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px; color: ${c.conforme ? '#065F46' : '#B91C1C'}; font-weight: bold;">${c.conforme ? '✓ Conforme' : '✗ Non conforme'}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px;">${c.observations}</td>
        </tr>`
      )
      .join('');
    extraTableHtml = `
      <table width="100%" cellpadding="6" cellspacing="0" border="0" style="border-collapse: collapse; margin-top: 16px; font-family: ${fontStack}; font-size: 11px;">
        <tr style="background-color: ${accentColor}; color: #ffffff;">
          <th align="left" style="border: 1px solid #cbd5e1;">Critère vérifié</th>
          <th align="left" style="border: 1px solid #cbd5e1;">Statut</th>
          <th align="left" style="border: 1px solid #cbd5e1;">Observations</th>
        </tr>
        ${rowsHtml}
      </table>`;
  }

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 20px; background-color: #f1f5f9; font-family: ${fontStack};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: ${pageBg}; border: ${outerBorder}; border-radius: 6px; overflow: hidden;">
          <tr>
            <td style="background-color: ${accentColor}; color: #ffffff; padding: 20px 24px; border-bottom: 3px solid ${accentBorderColor}; text-align: ${effectiveLayout?.headerAlign === 'center' ? 'center' : 'left'};">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td valign="middle">
                    ${logoSrc ? `<img src="${logoSrc}" alt="Logo Officiel" style="max-height: 48px; max-width: 160px; display: block; background: #ffffff; padding: 4px; border-radius: 4px;" />` : `<strong style="font-size: 14px; color: ${accentBorderColor};">PROVINCE OF BRITISH COLUMBIA · CANADA</strong>`}
                  </td>
                  <td align="right" valign="middle" style="font-family: ${fontStack}; font-size: 11px; color: #e2e8f0;">
                    Réf : <strong>${p.codeIdCandidature}</strong><br/>
                    Candidat : ${p.nomComplet}
                  </td>
                </tr>
              </table>
              <h1 style="margin: 12px 0 0 0; font-size: 16px; line-height: 1.3; color: #ffffff; font-family: ${fontStack};">${title}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: ${padPx}; color: ${bodyColor}; font-size: 12px; line-height: 1.6; font-family: ${fontStack};">
              <div style="white-space: pre-wrap;">${escapedBody}</div>
              ${extraTableHtml}
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 24px; border-top: 1px solid #e2e8f0; background-color: #f8fafc;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td width="50%" valign="top" style="font-size: 11px; color: #334155;">
                    <strong>Validation Officielle</strong><br/>
                    ${sigSrc ? `<img src="${sigSrc}" alt="Signature" style="max-height: 55px; margin-top: 6px;" />` : 'Signature manuscrite / habilitée'}
                  </td>
                  <td width="50%" align="right" valign="top" style="font-size: 11px; color: #334155;">
                    <strong>Sceau / Cachet</strong><br/>
                    ${cachetSrc ? `<img src="${cachetSrc}" alt="Sceau" style="max-height: 60px; margin-top: 6px;" />` : 'Sceau officiel apposé'}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ============================================================================
// 3. GÉNÉRATION PDF A4 / LETTRE FIDÈLE AU MODÈLE IMPORTÉ (1 PAGE CALÉE)
// ============================================================================

export async function generateHousingTabPdf(
  tabNumber: HousingTabNumber,
  data: HousingAndNotaryData,
  p: PostulantInfo,
  assetsConfig: PdfImportedAssetsConfig,
  uploadedAssets: UploadedAssetUrlsMap,
  customText?: string,
  layoutTemplate?: ReferenceLayoutTemplate
): Promise<{ doc: jsPDF; filename: string }> {
  const effectiveLayout = resolveEffectiveLayout(layoutTemplate);
  const orientation = effectiveLayout?.orientation || 'portrait';
  const pageFormat = effectiveLayout?.pageFormat || 'a4';
  const doc = new jsPDF({ orientation, unit: 'mm', format: pageFormat });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = effectiveLayout?.marginsMm?.left ?? 18;
  const marginRight = effectiveLayout?.marginsMm?.right ?? 18;
  const marginTop = effectiveLayout?.marginsMm?.top ?? 14;
  const marginBottom = effectiveLayout?.marginsMm?.bottom ?? 14;
  const contentWidth = pageWidth - marginLeft - marginRight;
  const pdfFont = effectiveLayout?.fontFamily || 'helvetica';
  const actorAssets = getTabActorAssets(tabNumber, assetsConfig, uploadedAssets);

  if (effectiveLayout?.pageBgColor && effectiveLayout.pageBgColor.toUpperCase() !== '#FFFFFF') {
    const bgRgb = hexToRgbTuple(effectiveLayout.pageBgColor);
    doc.setFillColor(...bgRgb);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
  }

  if (actorAssets.arrierePlan.url) {
    try {
      const bgCfg = actorAssets.arrierePlan.cfg || assetsConfig.arrierePlan!;
      const rendered = await renderAssetWithSettingsForPdf(actorAssets.arrierePlan.url, bgCfg);
      doc.addImage(rendered.dataUrl, 'PNG', 0, 0, pageWidth, pageHeight);
    } catch {}
  }

  if (actorAssets.filigrane.url) {
    try {
      const wmCfg = actorAssets.filigrane.cfg || assetsConfig.filigrane;
      const rendered = await renderAssetWithSettingsForPdf(actorAssets.filigrane.url, wmCfg);
      const wMm = Math.min(120, Math.max(30, (wmCfg.widthValue || 290) * 0.264));
      const hMm = Math.min(140, Math.max(30, (wmCfg.heightValue || 360) * 0.264));
      doc.addImage(rendered.dataUrl, 'PNG', (pageWidth - wMm) / 2, (pageHeight - hMm) / 2, wMm, hMm);
    } catch {}
  }

  const defaultHeaderRgb: [number, number, number] =
    tabNumber === 9 ? [11, 37, 69] : tabNumber === 10 ? [30, 41, 59] : tabNumber === 11 ? [6, 95, 70] : [49, 46, 129];
  const headerRgb: [number, number, number] = effectiveLayout?.headerBgColor
    ? hexToRgbTuple(effectiveLayout.headerBgColor)
    : defaultHeaderRgb;
  const primaryRgb: [number, number, number] = effectiveLayout?.primaryColor
    ? hexToRgbTuple(effectiveLayout.primaryColor)
    : headerRgb;
  const accentRgb: [number, number, number] = effectiveLayout?.accentColor
    ? hexToRgbTuple(effectiveLayout.accentColor)
    : [212, 160, 23];
  const borderRgb: [number, number, number] = effectiveLayout?.borderColor
    ? hexToRgbTuple(effectiveLayout.borderColor)
    : primaryRgb;
  const bodyRgb: [number, number, number] = effectiveLayout?.bodyTextColor
    ? hexToRgbTuple(effectiveLayout.bodyTextColor)
    : [30, 41, 59];

  const drawPageFrame = () => {
    if (effectiveLayout?.borderStyle === 'simple') {
      doc.setDrawColor(...borderRgb);
      doc.setLineWidth(0.5);
      doc.rect(
        Math.max(8, marginLeft - 5),
        Math.max(8, marginTop - 4),
        pageWidth - Math.max(16, marginLeft + marginRight - 10),
        pageHeight - Math.max(16, marginTop + marginBottom - 8)
      );
    } else if (effectiveLayout?.borderStyle === 'double') {
      doc.setDrawColor(...borderRgb);
      doc.setLineWidth(0.7);
      doc.rect(8, 8, pageWidth - 16, pageHeight - 16);
      doc.setDrawColor(...accentRgb);
      doc.setLineWidth(0.35);
      doc.rect(10.5, 10.5, pageWidth - 21, pageHeight - 21);
    }
  };

  drawPageFrame();

  if (effectiveLayout && effectiveLayout.layoutArchetype === 'letterhead_split' && !customText?.trim()) {
    const model = buildStructuredHousingDocument(tabNumber, data, p);
    const tintRgb = hexToRgbTuple(effectiveLayout.highlightTintColor);
    let y = Math.max(12, marginTop);

    // Zone 1 : Logo propre + petit repère discret en haut à droite
    if (actorAssets.logo.url) {
      try {
        const lCfg = actorAssets.logo.cfg || assetsConfig.logo;
        const rendered = await renderAssetWithSettingsForPdf(actorAssets.logo.url, lCfg);
        const wMm = Math.min(46, Math.max(18, (lCfg.widthValue || 160) * 0.21));
        const hMm = Math.min(18, Math.max(9, (lCfg.heightValue || 56) * 0.22));
        const logoX =
          effectiveLayout.logoPlacement === 'top_right'
            ? pageWidth - marginRight - wMm
            : effectiveLayout.logoPlacement === 'top_center'
            ? (pageWidth - wMm) / 2
            : marginLeft;
        doc.addImage(rendered.dataUrl, 'PNG', logoX, y, wMm, hMm);
      } catch {}
    } else {
      doc.setFont(pdfFont, 'bold');
      doc.setFontSize(13);
      doc.setTextColor(...primaryRgb);
      doc.text(p.nomEntreprise, marginLeft, y + 6);
    }

    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.25);
    doc.rect(pageWidth - marginRight - 4, y + 1, 3.2, 3.2);
    doc.setFillColor(15, 23, 42);
    doc.rect(pageWidth - marginRight - 3.3, y + 1.7, 1.5, 1.5, 'F');

    y += 22;

    // Zone 2 : Bloc 2 colonnes Expéditeur / Destinataire
    const rightColX = pageWidth * 0.56;
    const rightColW = pageWidth - marginRight - rightColX;
    const leftColW = rightColX - marginLeft - 8;

    let yLeft = y;
    doc.setFontSize(8.5);
    model.senderLines.forEach((line, idx) => {
      doc.setFont(pdfFont, idx === 0 ? 'bold' : 'normal');
      const lineRgb: [number, number, number] = idx === 0 ? [15, 23, 42] : [51, 65, 85];
      doc.setTextColor(...lineRgb);
      const wrapped = doc.splitTextToSize(line, leftColW);
      doc.text(wrapped, marginLeft, yLeft);
      yLeft += wrapped.length * 3.9;
    });

    let yRight = y + 6;
    model.recipientLines.forEach((line, idx) => {
      doc.setFont(pdfFont, idx === 0 ? 'bold' : 'normal');
      doc.setTextColor(15, 23, 42);
      const wrapped = doc.splitTextToSize(line, rightColW);
      doc.text(wrapped, rightColX, yRight);
      yRight += wrapped.length * 4.0;
    });

    y = Math.max(yLeft, yRight) + 5;

    // Zone 3 : Pastille teintée "Vos références" + paires clé : valeur
    const pillW = Math.min(54, doc.getTextWidth(model.refPillLabel) + 8);
    doc.setFillColor(...tintRgb);
    doc.roundedRect(marginLeft, y - 3.2, pillW, 5.2, 0.8, 0.8, 'F');
    doc.setFont(pdfFont, 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...primaryRgb);
    doc.text(model.refPillLabel, marginLeft + 2.5, y + 0.3);
    y += 5.5;

    doc.setFontSize(8.2);
    for (const pair of model.refPairs) {
      doc.setFont(pdfFont, 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text(pair.label, marginLeft, y);
      doc.setFont(pdfFont, 'bold');
      doc.setTextColor(15, 23, 42);
      const valWrapped = doc.splitTextToSize(`: ${pair.value}`, contentWidth - 46);
      doc.text(valWrapped, marginLeft + 44, y);
      y += Math.max(4.1, valWrapped.length * 3.8);
    }

    y += 8;

    // Zone 4 : Titre principal centré + sous-titre centré
    doc.setFont(pdfFont, 'bold');
    doc.setFontSize(13.5);
    doc.setTextColor(15, 23, 42);
    const titleWrapped = doc.splitTextToSize(model.mainTitle, contentWidth - 12);
    doc.text(titleWrapped, pageWidth / 2, y, { align: 'center' });
    y += titleWrapped.length * 5.4 + 1;

    doc.setFont(pdfFont, 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105);
    doc.text(model.mainSubtitle, pageWidth / 2, y, { align: 'center' });
    y += 10;

    // Zone 5 : Corps du texte épuré (calibré sur 1 page)
    const bottomReserve = 62;
    const availableBodyH = Math.max(45, pageHeight - marginBottom - bottomReserve - y);
    const bodyFontSize = model.summaryTable ? 8.0 : 8.7;
    const bodyStep = model.summaryTable ? 3.5 : 4.0;

    doc.setFontSize(bodyFontSize);
    for (const intro of model.introLines) {
      doc.setFont(pdfFont, 'normal');
      doc.setTextColor(15, 23, 42);
      const wrapped = doc.splitTextToSize(intro, contentWidth);
      doc.text(wrapped, marginLeft, y);
      y += wrapped.length * bodyStep;
    }
    y += 2;

    for (const para of model.bodyParagraphs) {
      if (y > pageHeight - bottomReserve && !effectiveLayout.singlePageFit) {
        doc.addPage();
        drawPageFrame();
        y = Math.max(16, marginTop);
      }
      doc.setFont(pdfFont, 'normal');
      doc.setTextColor(...bodyRgb);
      const wrapped = doc.splitTextToSize(para, contentWidth);
      doc.text(wrapped, marginLeft, y);
      y += wrapped.length * bodyStep + 2.2;
    }

    if (model.summaryTable) {
      const colWidths = [contentWidth * 0.34, contentWidth * 0.18, contentWidth * 0.48];
      const rowFontSize = availableBodyH < 75 ? 6.9 : 7.4;
      const rowPadY = availableBodyH < 75 ? 3.8 : 4.4;

      doc.setFillColor(...tintRgb);
      doc.rect(marginLeft, y, contentWidth, 5.4, 'F');
      doc.setFont(pdfFont, 'bold');
      doc.setFontSize(rowFontSize);
      doc.setTextColor(...primaryRgb);
      let cx = marginLeft + 1.5;
      model.summaryTable.headers.forEach((h, i) => {
        doc.text(h, cx, y + 3.7);
        cx += colWidths[i];
      });
      y += 5.4;

      for (let rIdx = 0; rIdx < model.summaryTable.rows.length; rIdx++) {
        if (y > pageHeight - 54) {
          doc.addPage();
          drawPageFrame();
          y = Math.max(16, marginTop);
        }
        const row = model.summaryTable.rows[rIdx];
        if (rIdx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(marginLeft, y, contentWidth, rowPadY, 'F');
        }
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.15);
        doc.line(marginLeft, y + rowPadY, pageWidth - marginRight, y + rowPadY);

        let rx = marginLeft + 1.5;
        row.forEach((cell, cIdx) => {
          const cellRgb: [number, number, number] =
            cIdx === 1 ? (cell === 'CONFORME' ? [6, 95, 70] : [185, 28, 28]) : bodyRgb;
          doc.setTextColor(...cellRgb);
          doc.setFont(pdfFont, cIdx === 1 ? 'bold' : 'normal');
          doc.setFontSize(rowFontSize);
          const txt = doc.splitTextToSize(cell, colWidths[cIdx] - 3)[0] || '';
          doc.text(txt, rx, y + rowPadY - 1.2);
          rx += colWidths[cIdx];
        });
        y += rowPadY;
      }
      y += 3;
    }

    // Zone 6 : Bloc 2 colonnes "Fait à" à gauche + Signataire / Signature / Cachet à droite
    if (y > pageHeight - 56) {
      doc.addPage();
      drawPageFrame();
      y = Math.max(16, marginTop);
    }
    const sigRowY = Math.max(y + 5, pageHeight - marginBottom - 56);
    const sigRightX = pageWidth * 0.56;

    doc.setFont(pdfFont, 'normal');
    doc.setFontSize(8.6);
    doc.setTextColor(...bodyRgb);
    doc.text(model.faitALine, marginLeft, sigRowY + 2);

    doc.setFont(pdfFont, 'bold');
    doc.setFontSize(8.6);
    doc.setTextColor(15, 23, 42);
    doc.text(model.signatoryHeading, sigRightX, sigRowY + 2);
    doc.setFont(pdfFont, 'normal');
    doc.setFontSize(8.2);
    doc.setTextColor(71, 85, 105);
    doc.text(model.signatorySubRole, sigRightX, sigRowY + 6.5);

    let sigImgOffsetY = sigRowY + 9;
    if (actorAssets.signature.url) {
      try {
        const sCfg = actorAssets.signature.cfg || assetsConfig.signature;
        const rendered = await renderAssetWithSettingsForPdf(actorAssets.signature.url, sCfg);
        doc.addImage(rendered.dataUrl, 'PNG', sigRightX, sigImgOffsetY, 30, 14);
      } catch {}
    }
    if (actorAssets.cachet.url) {
      try {
        const cCfg = actorAssets.cachet.cfg || assetsConfig.cachet;
        const rendered = await renderAssetWithSettingsForPdf(actorAssets.cachet.url, cCfg);
        doc.addImage(rendered.dataUrl, 'PNG', sigRightX + 32, sigImgOffsetY - 1, 20, 17);
      } catch {}
    }
    sigImgOffsetY += 17;

    doc.setFont(pdfFont, 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(model.signatoryPrintedName, sigRightX, sigImgOffsetY);

    // Zone 7 : Pied de page épuré (QR gauche + mentions légales centre + 1/1 droite)
    const bottomFooterY = pageHeight - marginBottom - 15;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(marginLeft, bottomFooterY - 2, pageWidth - marginRight, bottomFooterY - 2);

    try {
      const qrUrl =
        actorAssets.qrcode.url ||
        (await QRCode.toDataURL(`VERIFY:${p.codeIdCandidature}:TAB${tabNumber}:${p.nomComplet}`, {
          width: 120,
          margin: 1
        }));
      doc.addImage(qrUrl, 'PNG', marginLeft, bottomFooterY, 13, 13);
    } catch {}

    let legalX = marginLeft + 17;
    if (actorAssets.barcode.url) {
      try {
        const bCfg = actorAssets.barcode.cfg || assetsConfig.barcodeEmployeur || assetsConfig.logo;
        const rendered = await renderAssetWithSettingsForPdf(actorAssets.barcode.url, bCfg);
        doc.addImage(rendered.dataUrl, 'PNG', legalX, bottomFooterY + 1, 26, 10);
        legalX += 29;
      } catch {}
    }

    doc.setFont(pdfFont, 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    const legalMaxW = pageWidth - marginRight - legalX - 14;
    let ly = bottomFooterY + 3.2;
    for (const legalLine of model.footerLegalLines) {
      const wrappedLegal = doc.splitTextToSize(legalLine, legalMaxW)[0] || '';
      doc.text(wrappedLegal, legalX, ly);
      ly += 3.5;
    }

    const totalPages = doc.getNumberOfPages();
    doc.setFont(pdfFont, 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`1/${totalPages}`, pageWidth - marginRight, bottomFooterY + 11, { align: 'right' });

    const safeSlug = p.nomComplet.replace(/[^a-zA-Z0-9]+/g, '_');
    const filename = `Onglet_${tabNumber}_${safeSlug}_${p.codeIdCandidature}.pdf`;
    return { doc, filename };
  }

  // Rendu Encadré / Bandeau Exécutif
  const lineStep =
    effectiveLayout?.blockSpacing === 'compact'
      ? 3.9
      : effectiveLayout?.blockSpacing === 'airy'
      ? 5.0
      : 4.3;

  let y = marginTop + 20;
  if (effectiveLayout?.headerStyle === 'entete_epure' || effectiveLayout?.headerStyle === 'encadre_classique') {
    const startY = Math.max(10, marginTop - 2);
    if (actorAssets.logo.url) {
      try {
        const lCfg = actorAssets.logo.cfg || assetsConfig.logo;
        const rendered = await renderAssetWithSettingsForPdf(actorAssets.logo.url, lCfg);
        const wMm = Math.min(40, Math.max(16, (lCfg.widthValue || 150) * 0.2));
        const hMm = Math.min(18, Math.max(8, (lCfg.heightValue || 50) * 0.22));
        const logoX =
          effectiveLayout.logoPlacement === 'top_right'
            ? pageWidth - marginRight - wMm
            : effectiveLayout.logoPlacement === 'top_center'
            ? (pageWidth - wMm) / 2
            : marginLeft;
        doc.addImage(rendered.dataUrl, 'PNG', logoX, startY, wMm, hMm);
      } catch {}
    }

    const alignCenter = effectiveLayout.headerAlign === 'center';
    const textX = alignCenter
      ? pageWidth / 2
      : actorAssets.logo.url && effectiveLayout.logoPlacement === 'top_left'
      ? marginLeft + 44
      : marginLeft;
    doc.setTextColor(...headerRgb);
    doc.setFont(pdfFont, 'bold');
    doc.setFontSize(11);
    doc.text('PROVINCE OF BRITISH COLUMBIA / CANADA', textX, startY + 6, {
      align: alignCenter ? 'center' : 'left'
    });
    doc.setFontSize(9.5);
    doc.setTextColor(...accentRgb);
    doc.text(getTabDocumentTitle(tabNumber).toUpperCase(), textX, startY + 12, {
      align: alignCenter ? 'center' : 'left'
    });
    doc.setTextColor(71, 85, 105);
    doc.setFont(pdfFont, 'normal');
    doc.setFontSize(8);
    doc.text(`Dossier : ${p.codeIdCandidature} · Bénéficiaire : ${p.nomComplet}`, textX, startY + 17, {
      align: alignCenter ? 'center' : 'left'
    });
    doc.setDrawColor(...headerRgb);
    doc.setLineWidth(0.7);
    doc.line(marginLeft, startY + 21, pageWidth - marginRight, startY + 21);
    y = startY + 27;
  } else {
    doc.setFillColor(...headerRgb);
    doc.rect(0, 0, pageWidth, 26, 'F');
    doc.setFillColor(...accentRgb);
    doc.rect(0, 26, pageWidth, 1.5, 'F');

    if (actorAssets.logo.url) {
      try {
        const lCfg = actorAssets.logo.cfg || assetsConfig.logo;
        const rendered = await renderAssetWithSettingsForPdf(actorAssets.logo.url, lCfg);
        const wMm = Math.min(40, Math.max(16, (lCfg.widthValue || 160) * 0.2));
        const hMm = Math.min(16, Math.max(8, (lCfg.heightValue || 55) * 0.21));
        const logoX =
          effectiveLayout?.logoPlacement === 'top_right'
            ? pageWidth - marginRight - wMm - 3
            : marginLeft;
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(logoX, 4, wMm + 3, hMm + 2.5, 1.5, 1.5, 'F');
        doc.addImage(rendered.dataUrl, 'PNG', logoX + 1.5, 5.2, wMm, hMm);
      } catch {}
    }

    doc.setTextColor(255, 255, 255);
    doc.setFont(pdfFont, 'bold');
    doc.setFontSize(10.5);
    const titleX =
      effectiveLayout?.headerAlign === 'center'
        ? pageWidth / 2
        : actorAssets.logo.url && effectiveLayout?.logoPlacement !== 'top_right'
        ? marginLeft + 46
        : marginLeft;
    const alignOpt = effectiveLayout?.headerAlign === 'center' ? ('center' as const) : ('left' as const);
    doc.text('PROVINCE OF BRITISH COLUMBIA / CANADA', titleX, 10, { align: alignOpt });
    doc.setFontSize(9);
    doc.setTextColor(253, 224, 71);
    const docTitleLines = doc.splitTextToSize(getTabDocumentTitle(tabNumber).toUpperCase(), pageWidth - marginLeft - marginRight - 46);
    doc.text(docTitleLines, titleX, 16, { align: alignOpt });

    doc.setTextColor(226, 232, 240);
    doc.setFont(pdfFont, 'normal');
    doc.setFontSize(8);
    doc.text(`Dossier : ${p.codeIdCandidature} · Bénéficiaire : ${p.nomComplet}`, titleX, 22.5, { align: alignOpt });
    y = Math.max(33, marginTop + 19);
  }

  doc.setTextColor(...bodyRgb);
  doc.setFont(pdfFont, 'normal');
  doc.setFontSize(9);

  const plainText = (customText && customText.trim() ? customText : getHousingTabPlainText(tabNumber, data, p))
    .replace(/^=+\s*$/gm, '')
    .trim();
  const lines = doc.splitTextToSize(plainText, contentWidth);

  for (const line of lines) {
    if (y > pageHeight - 44) {
      doc.addPage();
      drawPageFrame();
      y = Math.max(16, marginTop);
    }
    const isHeaderLine =
      line.startsWith('1.') ||
      line.startsWith('2.') ||
      line.startsWith('3.') ||
      line.startsWith('4.') ||
      line.startsWith('5.');
    if (isHeaderLine) {
      doc.setFont(pdfFont, 'bold');
      doc.setTextColor(...headerRgb);
    } else {
      doc.setFont(pdfFont, 'normal');
      doc.setTextColor(...bodyRgb);
    }
    doc.text(line, marginLeft, y);
    y += lineStep;
  }

  if (y > pageHeight - 40) {
    doc.addPage();
    drawPageFrame();
    y = Math.max(16, marginTop);
  }
  const footerY = Math.max(y + 4, pageHeight - 40);

  doc.setDrawColor(203, 213, 225);
  doc.line(marginLeft, footerY - 3, pageWidth - marginRight, footerY - 3);

  doc.setFont(pdfFont, 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(51, 65, 85);
  doc.text('SIGNATURE OFFICIELLE', marginLeft, footerY + 2);
  doc.text('CACHET / SCEAU OFFICIEL', marginLeft + 62, footerY + 2);
  doc.text('AUTHENTIFICATION (BARCODE / QR)', marginLeft + 120, footerY + 2);

  if (actorAssets.signature.url) {
    try {
      const sCfg = actorAssets.signature.cfg || assetsConfig.signature;
      const rendered = await renderAssetWithSettingsForPdf(actorAssets.signature.url, sCfg);
      doc.addImage(rendered.dataUrl, 'PNG', marginLeft, footerY + 5, 34, 16);
    } catch {}
  }

  if (actorAssets.cachet.url) {
    try {
      const cCfg = actorAssets.cachet.cfg || assetsConfig.cachet;
      const rendered = await renderAssetWithSettingsForPdf(actorAssets.cachet.url, cCfg);
      doc.addImage(rendered.dataUrl, 'PNG', marginLeft + 62, footerY + 5, 32, 20);
    } catch {}
  }

  try {
    const barcodeUrl =
      actorAssets.barcode.url ||
      generateSmallStackedBarcodeCanvasDataUrl(`${p.codeIdCandidature}-T${tabNumber}`);
    doc.addImage(barcodeUrl, 'PNG', marginLeft + 120, footerY + 5, 32, 13);
  } catch {}

  try {
    const qrUrl =
      actorAssets.qrcode.url ||
      (await QRCode.toDataURL(`VERIFY:${p.codeIdCandidature}:TAB${tabNumber}:${p.nomComplet}`, {
        width: 120,
        margin: 1
      }));
    doc.addImage(qrUrl, 'PNG', Math.min(pageWidth - marginRight - 18, marginLeft + 158), footerY + 4, 18, 18);
  } catch {}

  const safeSlug = p.nomComplet.replace(/[^a-zA-Z0-9]+/g, '_');
  const filename = `Onglet_${tabNumber}_${safeSlug}_${p.codeIdCandidature}.pdf`;
  return { doc, filename };
}

// ============================================================================
// 4. GÉNÉRATION WORD ÉDITABLE (.DOCX) CALÉE SUR LE MODÈLE IMPORTÉ + VISUELS
// ============================================================================

async function dataUrlToPngBytes(dataUrl: string): Promise<Uint8Array | null> {
  if (!dataUrl || !dataUrl.trim()) return null;
  try {
    if (dataUrl.startsWith('data:image/png;base64,')) {
      const b64 = dataUrl.split(',')[1];
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return bytes;
    }
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.crossOrigin = 'anonymous';
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Image load failed'));
      el.src = dataUrl;
    });
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(40, img.naturalWidth || 240);
    canvas.height = Math.max(40, img.naturalHeight || 100);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const pngDataUrl = canvas.toDataURL('image/png');
    const b64 = pngDataUrl.split(',')[1];
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

const NO_CELL_BORDERS = {
  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
};

export async function downloadHousingTabWordDocx(
  tabNumber: HousingTabNumber,
  data: HousingAndNotaryData,
  p: PostulantInfo,
  customText?: string,
  layoutTemplate?: ReferenceLayoutTemplate,
  uploadedAssets?: UploadedAssetUrlsMap
): Promise<void> {
  const effectiveLayout = resolveEffectiveLayout(layoutTemplate);
  const wordFont =
    effectiveLayout?.fontFamily === 'times'
      ? 'Times New Roman'
      : effectiveLayout?.fontFamily === 'courier'
      ? 'Courier New'
      : 'Arial';
  const headingHex = (effectiveLayout?.primaryColor || '#0B2545').replace('#', '').toUpperCase();
  const tintHex = (effectiveLayout?.highlightTintColor || '#E2F5EE').replace('#', '').toUpperCase();

  const actor = getExclusiveActorForTab(tabNumber);
  const logoBytes = uploadedAssets?.[`${actor}_logo` as keyof UploadedAssetUrlsMap]
    ? await dataUrlToPngBytes(uploadedAssets[`${actor}_logo` as keyof UploadedAssetUrlsMap] || '')
    : null;
  const sigBytes = uploadedAssets?.[`${actor}_signature` as keyof UploadedAssetUrlsMap]
    ? await dataUrlToPngBytes(uploadedAssets[`${actor}_signature` as keyof UploadedAssetUrlsMap] || '')
    : null;
  const cachetBytes = uploadedAssets?.[`${actor}_cachet` as keyof UploadedAssetUrlsMap]
    ? await dataUrlToPngBytes(uploadedAssets[`${actor}_cachet` as keyof UploadedAssetUrlsMap] || '')
    : null;
  const qrDataUrl =
    uploadedAssets?.[`${actor}_qrcode` as keyof UploadedAssetUrlsMap] ||
    (await QRCode.toDataURL(`VERIFY:${p.codeIdCandidature}:TAB${tabNumber}`, { width: 110, margin: 1 }).catch(() => ''));
  const qrBytes = qrDataUrl ? await dataUrlToPngBytes(qrDataUrl) : null;

  const isLetter = effectiveLayout?.pageFormat === 'letter';
  const isLandscape = effectiveLayout?.orientation === 'landscape';
  const pageSize = {
    width: convertMillimetersToTwip(isLetter ? 215.9 : 210),
    height: convertMillimetersToTwip(isLetter ? 279.4 : 297),
    orientation: isLandscape ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT
  };
  const pageMargin = {
    top: convertMillimetersToTwip(effectiveLayout?.marginsMm?.top ?? 14),
    right: convertMillimetersToTwip(effectiveLayout?.marginsMm?.right ?? 18),
    bottom: convertMillimetersToTwip(effectiveLayout?.marginsMm?.bottom ?? 14),
    left: convertMillimetersToTwip(effectiveLayout?.marginsMm?.left ?? 18)
  };

  if (effectiveLayout?.layoutArchetype === 'letterhead_split' && !customText?.trim()) {
    const model = buildStructuredHousingDocument(tabNumber, data, p);
    const children: (Paragraph | Table)[] = [];

    // 1. Logo en haut
    children.push(
      new Paragraph({
        alignment:
          effectiveLayout.logoPlacement === 'top_right'
            ? AlignmentType.RIGHT
            : effectiveLayout.logoPlacement === 'top_center'
            ? AlignmentType.CENTER
            : AlignmentType.LEFT,
        spacing: { after: 220 },
        children: logoBytes
          ? [
              new ImageRun({
                data: logoBytes,
                type: 'png',
                transformation: { width: 145, height: 48 }
              })
            ]
          : [
              new TextRun({
                text: p.nomEntreprise.toUpperCase(),
                bold: true,
                size: 28,
                color: headingHex,
                font: wordFont
              })
            ]
      })
    );

    // 2. Tableau 2 colonnes Expéditeur / Destinataire sans bordures
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: NO_CELL_BORDERS,
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 54, type: WidthType.PERCENTAGE },
                borders: NO_CELL_BORDERS,
                children: model.senderLines.map(
                  (line, idx) =>
                    new Paragraph({
                      spacing: { after: 30 },
                      children: [
                        new TextRun({
                          text: line,
                          bold: idx === 0,
                          size: 18,
                          font: wordFont,
                          color: '334155'
                        })
                      ]
                    })
                )
              }),
              new TableCell({
                width: { size: 46, type: WidthType.PERCENTAGE },
                borders: NO_CELL_BORDERS,
                children: [
                  new Paragraph({ spacing: { before: 120 }, children: [] }),
                  ...model.recipientLines.map(
                    (line, idx) =>
                      new Paragraph({
                        spacing: { after: 30 },
                        children: [
                          new TextRun({
                            text: line,
                            bold: idx === 0,
                            size: 18,
                            font: wordFont,
                            color: '0F172A'
                          })
                        ]
                      })
                  )
                ]
              })
            ]
          })
        ]
      })
    );

    // 3. Pastille "Vos références" teintée + paires clé : valeur
    children.push(
      new Paragraph({ spacing: { before: 140, after: 60 }, children: [] }),
      new Table({
        width: { size: 32, type: WidthType.PERCENTAGE },
        borders: NO_CELL_BORDERS,
        rows: [
          new TableRow({
            children: [
              new TableCell({
                borders: NO_CELL_BORDERS,
                shading: { type: ShadingType.CLEAR, color: 'auto', fill: tintHex },
                children: [
                  new Paragraph({
                    spacing: { before: 40, after: 40 },
                    children: [
                      new TextRun({
                        text: `  ${model.refPillLabel}`,
                        bold: true,
                        size: 18,
                        font: wordFont,
                        color: headingHex
                      })
                    ]
                  })
                ]
              })
            ]
          })
        ]
      }),
      new Paragraph({ spacing: { after: 40 }, children: [] }),
      new Table({
        width: { size: 78, type: WidthType.PERCENTAGE },
        borders: NO_CELL_BORDERS,
        rows: model.refPairs.map(
          (pair) =>
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 36, type: WidthType.PERCENTAGE },
                  borders: NO_CELL_BORDERS,
                  children: [
                    new Paragraph({
                      spacing: { after: 20 },
                      children: [new TextRun({ text: pair.label, size: 17, font: wordFont, color: '475569' })]
                    })
                  ]
                }),
                new TableCell({
                  width: { size: 64, type: WidthType.PERCENTAGE },
                  borders: NO_CELL_BORDERS,
                  children: [
                    new Paragraph({
                      spacing: { after: 20 },
                      children: [new TextRun({ text: `: ${pair.value}`, bold: true, size: 17, font: wordFont, color: '0F172A' })]
                    })
                  ]
                })
              ]
            })
        )
      })
    );

    // 4. Titre centré + Sous-titre centré
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 260, after: 60 },
        children: [
          new TextRun({
            text: model.mainTitle,
            bold: true,
            size: 28,
            font: wordFont,
            color: '0F172A'
          })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 220 },
        children: [
          new TextRun({
            text: model.mainSubtitle,
            size: 20,
            font: wordFont,
            color: '475569'
          })
        ]
      })
    );

    // 5. Corps propre
    for (const intro of model.introLines) {
      children.push(
        new Paragraph({
          spacing: { after: 50 },
          children: [new TextRun({ text: intro, size: 18, font: wordFont, color: '0F172A' })]
        })
      );
    }
    children.push(new Paragraph({ spacing: { after: 60 }, children: [] }));

    for (const para of model.bodyParagraphs) {
      children.push(
        new Paragraph({
          spacing: { after: 110 },
          children: [new TextRun({ text: para, size: 18, font: wordFont, color: '1E293B' })]
        })
      );
    }

    if (model.summaryTable) {
      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: model.summaryTable.headers.map(
                (h) =>
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, color: 'auto', fill: tintHex },
                    borders: {
                      top: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
                      bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
                      left: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
                      right: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' }
                    },
                    children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 16, font: wordFont, color: headingHex })] })]
                  })
              )
            }),
            ...model.summaryTable.rows.map(
              (r) =>
                new TableRow({
                  children: r.map(
                    (cell, idx) =>
                      new TableCell({
                        borders: {
                          top: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
                          bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
                          left: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
                          right: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' }
                        },
                        children: [
                          new Paragraph({
                            children: [
                              new TextRun({
                                text: cell,
                                bold: idx === 1,
                                size: 16,
                                font: wordFont,
                                color: idx === 1 ? (cell === 'CONFORME' ? '065F46' : 'B91C1C') : '1E293B'
                              })
                            ]
                          })
                        ]
                      })
                  )
                })
            )
          ]
        })
      );
    }

    // 6. Signature 2 colonnes
    const sigChildren: Paragraph[] = [
      new Paragraph({
        spacing: { after: 30 },
        children: [new TextRun({ text: model.signatoryHeading, bold: true, size: 18, font: wordFont, color: '0F172A' })]
      }),
      new Paragraph({
        spacing: { after: 80 },
        children: [new TextRun({ text: model.signatorySubRole, size: 17, font: wordFont, color: '475569' })]
      })
    ];

    const sigRuns: (ImageRun | TextRun)[] = [];
    if (sigBytes) {
      sigRuns.push(new ImageRun({ data: sigBytes, type: 'png', transformation: { width: 95, height: 40 } }));
      sigRuns.push(new TextRun({ text: '   ' }));
    }
    if (cachetBytes) {
      sigRuns.push(new ImageRun({ data: cachetBytes, type: 'png', transformation: { width: 64, height: 55 } }));
    }
    if (sigRuns.length > 0) {
      sigChildren.push(new Paragraph({ spacing: { after: 60 }, children: sigRuns }));
    }

    sigChildren.push(
      new Paragraph({
        children: [new TextRun({ text: model.signatoryPrintedName, bold: true, size: 18, font: wordFont, color: '0F172A' })]
      })
    );

    children.push(
      new Paragraph({ spacing: { before: 180 }, children: [] }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: NO_CELL_BORDERS,
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 52, type: WidthType.PERCENTAGE },
                borders: NO_CELL_BORDERS,
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: model.faitALine, size: 18, font: wordFont, color: '1E293B' })]
                  })
                ]
              }),
              new TableCell({
                width: { size: 48, type: WidthType.PERCENTAGE },
                borders: NO_CELL_BORDERS,
                children: sigChildren
              })
            ]
          })
        ]
      })
    );

    // 7. Pied de page légal + QR code
    children.push(
      new Paragraph({ spacing: { before: 220 }, children: [] }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: NO_CELL_BORDERS,
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 14, type: WidthType.PERCENTAGE },
                borders: NO_CELL_BORDERS,
                children: [
                  new Paragraph({
                    children: qrBytes
                      ? [new ImageRun({ data: qrBytes, type: 'png', transformation: { width: 46, height: 46 } })]
                      : []
                  })
                ]
              }),
              new TableCell({
                width: { size: 78, type: WidthType.PERCENTAGE },
                borders: NO_CELL_BORDERS,
                children: model.footerLegalLines.map(
                  (line) =>
                    new Paragraph({
                      spacing: { after: 20 },
                      children: [new TextRun({ text: line, size: 14, font: wordFont, color: '64748B' })]
                    })
                )
              }),
              new TableCell({
                width: { size: 8, type: WidthType.PERCENTAGE },
                borders: NO_CELL_BORDERS,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [new TextRun({ text: '1/1', bold: true, size: 16, font: wordFont, color: '475569' })]
                  })
                ]
              })
            ]
          })
        ]
      })
    );

    const wordDoc = new DocxDocument({
      sections: [
        {
          properties: {
            page: {
              size: pageSize,
              margin: pageMargin
            }
          },
          children
        }
      ]
    });

    const blob = await Packer.toBlob(wordDoc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Onglet_${tabNumber}_${p.codeIdCandidature}.docx`;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  // Mode encadré / bandeau ou texte libre
  const title = getTabDocumentTitle(tabNumber);
  const bodyText = (customText && customText.trim() ? customText : getHousingTabPlainText(tabNumber, data, p))
    .replace(/^=+\s*$/gm, '')
    .trim();
  const spaceAfter =
    effectiveLayout?.blockSpacing === 'compact'
      ? 60
      : effectiveLayout?.blockSpacing === 'airy'
      ? 140
      : 90;

  const paragraphs = bodyText.split('\n').map((line) => {
    const trimmed = line.trim();
    const isHeading =
      /^[1-5]\.\s/.test(trimmed) ||
      trimmed.startsWith('PROVINCE') ||
      trimmed.startsWith('HOUSING') ||
      trimmed.startsWith('ATTESTATION') ||
      trimmed.startsWith('CERTIFICAT') ||
      trimmed.startsWith('DÉCLARATION');

    return new Paragraph({
      spacing: { after: spaceAfter },
      children: [
        new TextRun({
          text: line,
          bold: isHeading,
          size: isHeading ? 22 : 19,
          font: wordFont,
          color: isHeading ? headingHex : '1E293B'
        })
      ]
    });
  });

  const extraChildren: (Paragraph | Table)[] = [];

  if (tabNumber === 11) {
    extraChildren.push(
      new Paragraph({
        text: "Tableau récapitulatif des 12 critères d'inspection (HIR)",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 }
      }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: ['Critère vérifié', 'Statut', 'Observations'].map(
              (h) =>
                new TableCell({
                  borders: {
                    top: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
                    bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
                    left: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
                    right: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' }
                  },
                  children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 18, font: wordFont })] })]
                })
            )
          }),
          ...data.hirCriteres.map(
            (c) =>
              new TableRow({
                children: [c.critere, c.conforme ? 'CONFORME' : 'NON CONFORME', c.observations].map(
                  (cellText) =>
                    new TableCell({
                      borders: {
                        top: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
                        bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
                        left: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
                        right: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' }
                      },
                      children: [new Paragraph({ children: [new TextRun({ text: cellText, size: 17, font: wordFont })] })]
                    })
                )
              })
          )
        ]
      })
    );
  }

  const wordDoc = new DocxDocument({
    sections: [
      {
        properties: {
          page: {
            size: pageSize,
            margin: pageMargin
          }
        },
        children: [
          ...(logoBytes
            ? [
                new Paragraph({
                  spacing: { after: 120 },
                  children: [new ImageRun({ data: logoBytes, type: 'png', transformation: { width: 140, height: 46 } })]
                })
              ]
            : []),
          new Paragraph({
            alignment:
              effectiveLayout?.headerAlign === 'center'
                ? AlignmentType.CENTER
                : AlignmentType.LEFT,
            spacing: { after: 180 },
            children: [
              new TextRun({
                text: title.toUpperCase(),
                bold: true,
                size: 26,
                color: headingHex,
                font: wordFont
              })
            ]
          }),
          ...paragraphs,
          ...extraChildren
        ]
      }
    ]
  });

  const blob = await Packer.toBlob(wordDoc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Onglet_${tabNumber}_${p.codeIdCandidature}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}
