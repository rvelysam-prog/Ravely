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
  AlignmentType
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
// 2. HTML EMAIL RESPONSIVE (TABLEAUX IMBRIQUÉS COMPATIBLES GMAIL / OUTLOOK)
// ============================================================================

export function generateHousingTabEmailHtml(
  tabNumber: HousingTabNumber,
  data: HousingAndNotaryData,
  p: PostulantInfo,
  uploadedAssets: UploadedAssetUrlsMap,
  customText?: string
): string {
  const title = getTabDocumentTitle(tabNumber);
  const actor = getExclusiveActorForTab(tabNumber);
  const logoKey = `${actor}_logo` as keyof UploadedAssetUrlsMap;
  const sigKey = `${actor}_signature` as keyof UploadedAssetUrlsMap;
  const cachetKey = `${actor}_cachet` as keyof UploadedAssetUrlsMap;
  const logoSrc = uploadedAssets[logoKey] || '';
  const sigSrc = uploadedAssets[sigKey] || '';
  const cachetSrc = uploadedAssets[cachetKey] || '';

  const accentColor =
    tabNumber === 9 ? '#0B2545' : tabNumber === 10 ? '#1E293B' : tabNumber === 11 ? '#065F46' : '#312E81';

  const bodyText = customText && customText.trim() ? customText : getHousingTabPlainText(tabNumber, data, p);
  const escapedBody = bodyText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br/>');

  let extraTableHtml = '';
  if (tabNumber === 9 && !customText) {
    extraTableHtml = `
      <table width="100%" cellpadding="8" cellspacing="0" border="0" style="border-collapse: collapse; margin-top: 16px; font-family: Arial, sans-serif; font-size: 12px;">
        <tr style="background-color: #0B2545; color: #ffffff;">
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
      <table width="100%" cellpadding="6" cellspacing="0" border="0" style="border-collapse: collapse; margin-top: 16px; font-family: Arial, sans-serif; font-size: 11px;">
        <tr style="background-color: #065F46; color: #ffffff;">
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
<body style="margin: 0; padding: 20px; background-color: #f1f5f9; font-family: Arial, Helvetica, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden;">
          <tr>
            <td style="background-color: ${accentColor}; color: #ffffff; padding: 20px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td valign="middle">
                    ${logoSrc ? `<img src="${logoSrc}" alt="Logo Officiel" style="max-height: 48px; max-width: 160px; display: block; background: #ffffff; padding: 4px; border-radius: 4px;" />` : `<strong style="font-size: 14px; color: #D4A017;">PROVINCE OF BRITISH COLUMBIA · CANADA</strong>`}
                  </td>
                  <td align="right" valign="middle" style="font-family: Arial, sans-serif; font-size: 11px; color: #e2e8f0;">
                    Réf : <strong>${p.codeIdCandidature}</strong><br/>
                    Candidat : ${p.nomComplet}
                  </td>
                </tr>
              </table>
              <h1 style="margin: 12px 0 0 0; font-size: 16px; line-height: 1.3; color: #ffffff; font-family: Arial, sans-serif;">${title}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px; color: #1e293b; font-size: 12px; line-height: 1.6; font-family: Arial, sans-serif;">
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
// 3. GÉNÉRATION PDF A4 ORIGINAL AVEC LIAISON EXCLUSIVE DES ACTEURS
// ============================================================================

export async function generateHousingTabPdf(
  tabNumber: HousingTabNumber,
  data: HousingAndNotaryData,
  p: PostulantInfo,
  assetsConfig: PdfImportedAssetsConfig,
  uploadedAssets: UploadedAssetUrlsMap,
  customText?: string
): Promise<{ doc: jsPDF; filename: string }> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  const actorAssets = getTabActorAssets(tabNumber, assetsConfig, uploadedAssets);

  // 0. Arrière-plan exclusif de l'acteur
  if (actorAssets.arrierePlan.url) {
    try {
      const bgCfg = actorAssets.arrierePlan.cfg || assetsConfig.arrierePlan!;
      const rendered = await renderAssetWithSettingsForPdf(actorAssets.arrierePlan.url, bgCfg);
      doc.addImage(rendered.dataUrl, 'PNG', 0, 0, pageWidth, pageHeight);
    } catch {
      // ignore invalid background
    }
  }

  // 0b. Filigrane exclusif de l'acteur
  if (actorAssets.filigrane.url) {
    try {
      const wmCfg = actorAssets.filigrane.cfg || assetsConfig.filigrane;
      const rendered = await renderAssetWithSettingsForPdf(actorAssets.filigrane.url, wmCfg);
      const wMm = Math.min(120, Math.max(30, (wmCfg.widthValue || 290) * 0.264));
      const hMm = Math.min(140, Math.max(30, (wmCfg.heightValue || 360) * 0.264));
      doc.addImage(rendered.dataUrl, 'PNG', (pageWidth - wMm) / 2, (pageHeight - hMm) / 2, wMm, hMm);
    } catch {
      // ignore
    }
  }

  // En-tête officiel coloré selon l'onglet
  const headerRgb: [number, number, number] =
    tabNumber === 9 ? [11, 37, 69] : tabNumber === 10 ? [30, 41, 59] : tabNumber === 11 ? [6, 95, 70] : [49, 46, 129];

  doc.setFillColor(...headerRgb);
  doc.rect(0, 0, pageWidth, 28, 'F');
  doc.setFillColor(212, 160, 23);
  doc.rect(0, 28, pageWidth, 1.5, 'F');

  // Logo exclusif de l'acteur dans l'en-tête
  if (actorAssets.logo.url) {
    try {
      const lCfg = actorAssets.logo.cfg || assetsConfig.logo;
      const rendered = await renderAssetWithSettingsForPdf(actorAssets.logo.url, lCfg);
      const wMm = Math.min(42, Math.max(18, (lCfg.widthValue || 160) * 0.2));
      const hMm = Math.min(18, Math.max(8, (lCfg.heightValue || 55) * 0.22));
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(margin, 4, wMm + 3, hMm + 3, 1.5, 1.5, 'F');
      doc.addImage(rendered.dataUrl, 'PNG', margin + 1.5, 5.5, wMm, hMm);
    } catch {
      // ignore
    }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  const titleX = actorAssets.logo.url ? margin + 48 : margin;
  doc.text('PROVINCE OF BRITISH COLUMBIA / CANADA', titleX, 11);
  doc.setFontSize(9.5);
  doc.setTextColor(253, 224, 71);
  const docTitleLines = doc.splitTextToSize(getTabDocumentTitle(tabNumber).toUpperCase(), pageWidth - titleX - margin);
  doc.text(docTitleLines, titleX, 17);

  doc.setTextColor(226, 232, 240);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Dossier : ${p.codeIdCandidature} · Bénéficiaire : ${p.nomComplet}`, titleX, 24);

  // Corps du document
  let y = 37;
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);

  const plainText = customText && customText.trim() ? customText : getHousingTabPlainText(tabNumber, data, p);
  const lines = doc.splitTextToSize(plainText, contentWidth);

  for (const line of lines) {
    if (y > pageHeight - 52) {
      doc.addPage();
      y = 20;
    }
    const isHeaderLine =
      line.startsWith('1.') ||
      line.startsWith('2.') ||
      line.startsWith('3.') ||
      line.startsWith('4.') ||
      line.startsWith('5.') ||
      line.startsWith('===');
    if (isHeaderLine) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...headerRgb);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
    }
    doc.text(line, margin, y);
    y += 4.6;
  }

  // Bloc signatures + authentification exclusif en bas de dernière page
  if (y > pageHeight - 48) {
    doc.addPage();
    y = 20;
  }
  const footerY = Math.max(y + 6, pageHeight - 48);

  doc.setDrawColor(203, 213, 225);
  doc.line(margin, footerY - 3, pageWidth - margin, footerY - 3);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text('SIGNATURE OFFICIELLE', margin, footerY + 2);
  doc.text('CACHET / SCEAU OFFICIEL', margin + 62, footerY + 2);
  doc.text('AUTHENTIFICATION (BARCODE / QR)', margin + 122, footerY + 2);

  if (actorAssets.signature.url) {
    try {
      const sCfg = actorAssets.signature.cfg || assetsConfig.signature;
      const rendered = await renderAssetWithSettingsForPdf(actorAssets.signature.url, sCfg);
      doc.addImage(rendered.dataUrl, 'PNG', margin, footerY + 5, 36, 18);
    } catch {}
  }

  if (actorAssets.cachet.url) {
    try {
      const cCfg = actorAssets.cachet.cfg || assetsConfig.cachet;
      const rendered = await renderAssetWithSettingsForPdf(actorAssets.cachet.url, cCfg);
      doc.addImage(rendered.dataUrl, 'PNG', margin + 62, footerY + 5, 36, 22);
    } catch {}
  }

  // Code-barres (importé ou généré)
  try {
    const barcodeUrl =
      actorAssets.barcode.url ||
      generateSmallStackedBarcodeCanvasDataUrl(`${p.codeIdCandidature}-T${tabNumber}`);
    doc.addImage(barcodeUrl, 'PNG', margin + 122, footerY + 5, 34, 14);
  } catch {}

  // QR Code (importé ou généré)
  try {
    const qrUrl =
      actorAssets.qrcode.url ||
      (await QRCode.toDataURL(`VERIFY:${p.codeIdCandidature}:TAB${tabNumber}:${p.nomComplet}`, {
        width: 120,
        margin: 1
      }));
    doc.addImage(qrUrl, 'PNG', margin + 160, footerY + 4, 20, 20);
  } catch {}

  const safeSlug = p.nomComplet.replace(/[^a-zA-Z0-9]+/g, '_');
  const filename = `Onglet_${tabNumber}_${safeSlug}_${p.codeIdCandidature}.pdf`;
  return { doc, filename };
}

// ============================================================================
// 4. GÉNÉRATION WORD ÉDITABLE (.DOCX) VIA BIBLIOTHÈQUE `docx`
// ============================================================================

export async function downloadHousingTabWordDocx(
  tabNumber: HousingTabNumber,
  data: HousingAndNotaryData,
  p: PostulantInfo,
  customText?: string
): Promise<void> {
  const title = getTabDocumentTitle(tabNumber);
  const bodyText = customText && customText.trim() ? customText : getHousingTabPlainText(tabNumber, data, p);
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
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: line,
          bold: isHeading,
          size: isHeading ? 24 : 21,
          font: 'Calibri',
          color: isHeading ? '0B2545' : '1E293B'
        })
      ]
    });
  });

  // Ajouter un tableau structuré natif Word pour Onglet 9 (finances) ou Onglet 11 (12 critères HIR)
  const extraChildren: (Paragraph | Table)[] = [];

  if (tabNumber === 11) {
    extraChildren.push(
      new Paragraph({
        text: "Tableau récapitulatif des 12 critères d'inspection (HIR)",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 }
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
                  children: [
                    new Paragraph({
                      children: [new TextRun({ text: h, bold: true, size: 20 })]
                    })
                  ]
                })
            )
          }),
          ...data.hirCriteres.map(
            (c) =>
              new TableRow({
                children: [c.critere, c.conforme ? 'Conforme' : 'Non conforme', c.observations].map(
                  (cellText) =>
                    new TableCell({
                      borders: {
                        top: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
                        bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
                        left: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
                        right: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' }
                      },
                      children: [new Paragraph({ children: [new TextRun({ text: cellText, size: 19 })] })]
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
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: title.toUpperCase(),
                bold: true,
                size: 28,
                color: '0B2545',
                font: 'Calibri'
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
