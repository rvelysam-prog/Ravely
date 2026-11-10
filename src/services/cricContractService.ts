import { jsPDF } from 'jspdf';
import { SiteSettings } from '../types';
import { loadStaticImageAsPngDataUrl, CONTRACT_STATIC_ASSETS } from './contractPdfGenerator';
import {
  getSavedCustomCachet,
  getSavedCustomSignature,
  PdfImportedAssetsConfig
} from './departmentsAndEmailService';

/**
 * Liste officielle des Prestataires / Cabinets CRIC partenaires pré-configurés
 */
export interface PrestatairePreset {
  id: string;
  nomLegal: string;
  statutJuridique: string;
  adresse: string;
  representantNom: string;
  representantTitre: string;
  permisCnesst: string;
  professionnelNom: string;
  numeroCcic: string;
  email: string;
  telephone: string;
  descriptionCourt: string;
}

export const PRESTATAIRES_PRESETS: PrestatairePreset[] = [
  {
    id: 'canfrance_paris',
    nomLegal: 'CAN-FRANCE MOBILITÉ & IMMIGRATION INTERNATIONALE',
    statutJuridique: 'Société par Actions Simplifiée (SAS) au capital de 85 000 €',
    adresse: '48 Boulevard Haussmann, 75009 Paris, France',
    representantNom: 'Me Alexandre Vasseur',
    representantTitre: 'Directeur Général & Consultant Réglementé',
    permisCnesst: 'AR-2024-88419',
    professionnelNom: 'Me Alexandre Vasseur (CRIC)',
    numeroCcic: 'CCIC-R710492',
    email: 'contact@canfrance-mobilite.com',
    telephone: '+33 1 42 68 55 10',
    descriptionCourt: 'Cabinet spécialisé mobilité France-Canada (Permis CNESST & CCIC)'
  },
  {
    id: 'hexagone_bordeaux',
    nomLegal: 'AGENCE HEXAGONE RECRUTEMENT MONDIAL',
    statutJuridique: 'Société par Actions Simplifiée (SAS) au capital de 50 000 €',
    adresse: '12 Quai des Chartrons, 33000 Bordeaux, France',
    representantNom: 'M. Édouard Delacroix',
    representantTitre: 'Président Fondateur',
    permisCnesst: 'AR-2023-64210',
    professionnelNom: 'Mme Sophie Tremblay (CRIC)',
    numeroCcic: 'CCIC-R521894',
    email: 'recrutement@hexagone-mondial.fr',
    telephone: '+33 5 56 12 30 40',
    descriptionCourt: 'Agence de sourcing de main-d’œuvre internationale accréditée CNESST'
  },
  {
    id: 'juris_bc_vancouver',
    nomLegal: 'CABINET JURIS-IMMIGRATION BC & QUÉBEC',
    statutJuridique: 'Cabinet d’Avocats & Consultants en Droit de l’Immigration',
    adresse: '1500 West Georgia Street, Vancouver, BC V6G 2Z6, Canada & 24 Rue de la Paix, Paris',
    representantNom: 'Me Catherine Lemoine',
    representantTitre: 'Avocate associée & CRIC',
    permisCnesst: 'AR-2025-99104',
    professionnelNom: 'Me Catherine Lemoine (CRIC & Barreau)',
    numeroCcic: 'CCIC-R619840',
    email: 'clemoine@juris-immigration.ca',
    telephone: '+1 604 688 2900',
    descriptionCourt: 'Cabinet bilingue Colombie-Britannique / France (Expertise EIMT & IRCC)'
  },
  {
    id: 'alliance_nantes',
    nomLegal: 'ALLIANCE TALENTS LOGISTIQUE TRANSATLANTIQUE',
    statutJuridique: 'Société à Responsabilité Limitée (SARL) au capital de 40 000 €',
    adresse: '3 Place Graslin, 44000 Nantes, France',
    representantNom: 'M. François Mercier',
    representantTitre: 'Directeur des Opérations Internationales',
    permisCnesst: 'AR-2024-77320',
    professionnelNom: 'M. Marc-André Côté (CRIC)',
    numeroCcic: 'CCIC-R802315',
    email: 'dossier@alliance-talents.fr',
    telephone: '+33 2 40 89 15 22',
    descriptionCourt: 'Chasse de tête transport et supply chain accréditée'
  },
  {
    id: 'global_workforce',
    nomLegal: 'GLOBAL WORKFORCE IMMIGRATION PARTNERS',
    statutJuridique: 'Société de conseil en recrutement transfrontalier',
    adresse: '1055 West Hastings St, Vancouver, BC V6E 2E9, Canada',
    representantNom: 'Mme Hélène Bouchard',
    representantTitre: 'Directrice Juridique & Mobilité',
    permisCnesst: 'AR-2023-51208',
    professionnelNom: 'Mme Hélène Bouchard (CRIC)',
    numeroCcic: 'CCIC-R443210',
    email: 'immigration@globalworkforce.ca',
    telephone: '+1 604 718 6400',
    descriptionCourt: 'Partenaire international pour le recrutement technique'
  }
];

export interface CricContractVariables {
  // 1. Employeur (Canada)
  nomEntrepriseCanada: string;
  showNomEntrepriseCanada: boolean;

  provinceCanadienne: string;
  showProvinceCanadienne: boolean;

  adresseEntrepriseCanada: string;
  showAdresseEntrepriseCanada: boolean;

  representantNomEmployeur: string;
  showRepresentantNomEmployeur: boolean;

  representantTitreEmployeur: string;
  showRepresentantTitreEmployeur: boolean;

  // 2. Prestataire (Cabinet / Agence France & CRIC)
  prestatairePresetId: string; // ID sélectionné dans le Select Dropdown ou 'custom'

  nomPrestataireFrance: string;
  showNomPrestataireFrance: boolean;

  adressePrestataireFrance: string;
  showAdressePrestataireFrance: boolean;

  statutJuridiquePrestataire: string;
  showStatutJuridiquePrestataire: boolean;

  representantPrestataireNom: string;
  showRepresentantPrestataireNom: boolean;

  representantPrestataireTitre: string;
  showRepresentantPrestataireTitre: boolean;

  permisCnesst: string;
  showPermisCnesst: boolean;

  // 3. Identification du poste & Immigration
  intitulePoste: string;
  showIntitulePoste: boolean;

  codeCnp: string;
  showCodeCnp: boolean;

  typeDemarche: 'EIMT' | 'Volet des talents mondiaux' | 'Dispense';
  showTypeDemarche: boolean;

  referenceEimtOuSuivi: string;
  showReferenceEimtOuSuivi: boolean;

  nomProfessionnelImmigration: string; // CRIC ou Avocat canadien
  showNomProfessionnelImmigration: boolean;

  numeroMembreCcic: string;
  showNumeroMembreCcic: boolean;

  // 4. Paramètres financiers & légaux (Modèle 2)
  montantHonoraires: string;
  showMontantHonoraires: boolean;

  pourcentageSignature: number;
  pourcentageEimt: number;
  pourcentagePriseFonction: number;
  delaiPaiementFactureJours: number;
  moisGarantie: number;
  moisNonSollicitation: number;
  dureeExclusivite: string;
  delaiConservationDonnees: string;
  paysDroitApplicable: string;
  villeTribunalCompetent: string;

  // 5. Signature & Ville
  villeSignature: string;
  showVilleSignature: boolean;

  dateJour: string;
  showDateJour: boolean;

  signataireNomEmployeur: string;
  showSignataireNomEmployeur: boolean;

  signataireTitreEmployeur: string;
  showSignataireTitreEmployeur: boolean;

  // 6. Actifs visuels personnalisés (Employeur et Prestataire)
  logoEmployeurUrl?: string;
  signatureEmployeurUrl?: string;
  cachetEmployeurUrl?: string;
  filigraneEmployeurUrl?: string;
  arrierePlanUrl?: string;

  logoPrestataireUrl?: string;
  signaturePrestataireUrl?: string;
  cachetPrestataireUrl?: string;

  // Styles visuels éditables
  primaryColor: string;
  textColor: string;
  fontFamily: 'helvetica' | 'times' | 'courier';
}

export function buildDefaultCricContractVariables(settings?: SiteSettings): CricContractVariables {
  const companyName = settings?.company_name || 'ATLANTIC TRANSPORT LTD.';
  const address = settings?.address || 'King George Blvd, Surrey, BC V3T 2W1, Canada';
  const defaultPreset = PRESTATAIRES_PRESETS[0];

  const now = new Date();
  const dateFormatted = now.toLocaleDateString('fr-CA', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  return {
    // Employeur
    nomEntrepriseCanada: companyName,
    showNomEntrepriseCanada: true,

    provinceCanadienne: 'Colombie-Britannique',
    showProvinceCanadienne: true,

    adresseEntrepriseCanada: address,
    showAdresseEntrepriseCanada: true,

    representantNomEmployeur: 'Antoine Forestin',
    showRepresentantNomEmployeur: true,

    representantTitreEmployeur: 'Directeur Général & Fondateur',
    showRepresentantTitreEmployeur: true,

    // Prestataire
    prestatairePresetId: defaultPreset.id,
    nomPrestataireFrance: defaultPreset.nomLegal,
    showNomPrestataireFrance: true,

    adressePrestataireFrance: defaultPreset.adresse,
    showAdressePrestataireFrance: true,

    statutJuridiquePrestataire: defaultPreset.statutJuridique,
    showStatutJuridiquePrestataire: true,

    representantPrestataireNom: defaultPreset.representantNom,
    showRepresentantPrestataireNom: true,

    representantPrestataireTitre: defaultPreset.representantTitre,
    showRepresentantPrestataireTitre: true,

    permisCnesst: defaultPreset.permisCnesst,
    showPermisCnesst: true,

    // Poste & Immigration
    intitulePoste: 'Conducteur Routier International (H/F)',
    showIntitulePoste: true,

    codeCnp: '73300',
    showCodeCnp: true,

    typeDemarche: 'EIMT',
    showTypeDemarche: true,

    referenceEimtOuSuivi: 'EIMT-BC-2026-94812',
    showReferenceEimtOuSuivi: true,

    nomProfessionnelImmigration: defaultPreset.professionnelNom,
    showNomProfessionnelImmigration: true,

    numeroMembreCcic: defaultPreset.numeroCcic,
    showNumeroMembreCcic: true,

    // Conditions financières & clauses
    montantHonoraires: '4 500 $ CAD forfaitaire par travailleur qualifié recruté',
    showMontantHonoraires: true,

    pourcentageSignature: 30,
    pourcentageEimt: 40,
    pourcentagePriseFonction: 30,
    delaiPaiementFactureJours: 15,
    moisGarantie: 6,
    moisNonSollicitation: 12,
    dureeExclusivite: '12 mois fermes',
    delaiConservationDonnees: '24 mois maximum',
    paysDroitApplicable: 'Colombie-Britannique et lois fédérales du Canada',
    villeTribunalCompetent: 'Surrey / Vancouver (Colombie-Britannique)',

    // Signatures
    villeSignature: 'Surrey, BC',
    showVilleSignature: true,

    dateJour: dateFormatted,
    showDateJour: true,

    signataireNomEmployeur: 'Antoine Forestin',
    showSignataireNomEmployeur: true,

    signataireTitreEmployeur: 'Directeur Général & Fondateur',
    showSignataireTitreEmployeur: true,

    // Actifs
    logoEmployeurUrl: CONTRACT_STATIC_ASSETS.logoAtlantic,
    signatureEmployeurUrl: CONTRACT_STATIC_ASSETS.signature,
    cachetEmployeurUrl: CONTRACT_STATIC_ASSETS.cachet,
    filigraneEmployeurUrl: '',

    logoPrestataireUrl: '',
    signaturePrestataireUrl: '',
    cachetPrestataireUrl: '',

    // Style
    primaryColor: '#0B2545',
    textColor: '#1E293B',
    fontFamily: 'helvetica'
  };
}

/**
 * Applique un Prestataire sélectionné dans les variables
 */
export function applyPrestatairePreset(
  current: CricContractVariables,
  presetId: string
): CricContractVariables {
  const found = PRESTATAIRES_PRESETS.find((p) => p.id === presetId);
  if (!found) {
    return {
      ...current,
      prestatairePresetId: 'custom'
    };
  }

  return {
    ...current,
    prestatairePresetId: found.id,
    nomPrestataireFrance: found.nomLegal,
    adressePrestataireFrance: found.adresse,
    statutJuridiquePrestataire: found.statutJuridique,
    representantPrestataireNom: found.representantNom,
    representantPrestataireTitre: found.representantTitre,
    permisCnesst: found.permisCnesst,
    nomProfessionnelImmigration: found.professionnelNom,
    numeroMembreCcic: found.numeroCcic
  };
}

/**
 * Génère le texte brut du MODÈLE 1 : ATTESTATION DE MANDAT DE RECRUTEMENT INTERNATIONAL
 */
export function generateModel1PlainText(v: CricContractVariables): string {
  const empNom = v.showNomEntrepriseCanada ? v.nomEntrepriseCanada : "l'entreprise employeuse dûment immatriculée au Canada";
  const empProvince = v.showProvinceCanadienne ? v.provinceCanadienne : 'Canada';
  const empAdresse = v.showAdresseEntrepriseCanada ? v.adresseEntrepriseCanada : 'son siège social légal au Canada';
  const empRepNom = v.showRepresentantNomEmployeur ? v.representantNomEmployeur : 'la direction générale habilitée';
  const empRepTitre = v.showRepresentantTitreEmployeur ? v.representantTitreEmployeur : 'Représentant légal';

  const prestNom = v.showNomPrestataireFrance ? v.nomPrestataireFrance : 'le prestataire agréé de recrutement international';
  const prestAdresse = v.showAdressePrestataireFrance ? v.adressePrestataireFrance : 'son siège social déclaré en France';
  const prestCnesst = v.showPermisCnesst ? v.permisCnesst : 'en cours de validité auprès des autorités compétentes';

  const poste = v.showIntitulePoste ? v.intitulePoste : 'Poste de travailleur qualifié au Canada';
  const cnp = v.showCodeCnp ? v.codeCnp : 'selon la classification officielle en vigueur';
  const demarche = v.showTypeDemarche ? v.typeDemarche : 'Démarche d’immigration officielle requise';
  const refEimt = v.showReferenceEimtOuSuivi ? v.referenceEimtOuSuivi : 'enregistrée sous référence confidentielle';

  const cricNom = v.showNomProfessionnelImmigration ? v.nomProfessionnelImmigration : 'un professionnel réglementé en immigration dûment accrédité';
  const cricCcic = v.showNumeroMembreCcic ? v.numeroMembreCcic : 'en règle auprès de l’ordre professionnel';

  const ville = v.showVilleSignature ? v.villeSignature : 'Surrey, BC';
  const date = v.showDateJour ? v.dateJour : new Date().toLocaleDateString('fr-CA');
  const signNom = v.showSignataireNomEmployeur ? v.signataireNomEmployeur : empRepNom;
  const signTitre = v.showSignataireTitreEmployeur ? v.signataireTitreEmployeur : empRepTitre;
  const prestRepNom = v.showRepresentantPrestataireNom ? v.representantPrestataireNom : 'le représentant habilité';
  const prestRepTitre = v.showRepresentantPrestataireTitre ? v.representantPrestataireTitre : 'Directeur du recrutement';

  return `ATTESTATION DE MANDAT DE RECRUTEMENT INTERNATIONAL
===============================================================================

À l'attention de tout candidat au recrutement international,

Nous soussignés,

${empNom}, société dûment constituée sous le régime des lois du ${empProvince}, ayant son siège social au ${empAdresse}, représentée par ${empRepNom}, en sa qualité de ${empRepTitre}, ci-après désignée "l'Employeur",

ATTESTONS PAR LA PRÉSENTE :

1. CADRE DE MANDAT OFFICIEL
L'Employeur a officiellement confié un mandat de recherche, de sourcing et de présélection de profils internationaux au prestataire :
${prestNom}, dont le siège social est situé au ${prestAdresse}, détentrice du permis de recrutement de travailleurs étrangers de la CNESST numéro ${prestCnesst}, ci-après désignée "le Prestataire".

2. IDENTIFICATION DU POSTE ET CONFORMITÉ DE L'IMMIGRATION
Ce mandat s'inscrit dans le cadre d'un processus rigoureux d'embauche de travailleurs étrangers au Canada pour le poste suivant :
- Intitulé du poste : ${poste}
- Code de la Classification nationale des professions (CNP) : ${cnp}
- Démarche d'immigration correspondante : ${demarche}, actuellement enregistrée ou en cours d'analyse sous la référence gouvernementale ${refEimt}.

3. PROTECTION ET DROITS DU CANDIDAT (RECRUTEMENT ÉTHIQUE)
Conformément à la réglementation du Code du travail du Canada et des provinces applicables :
- La présente démarche est entièrement gratuite pour le candidat. Aucun frais de recrutement ou de placement ne peut lui être réclamé par le Prestataire ou l'Employeur.
- Les démarches de visa de travail et de représentation légale auprès d'Immigration, Réfugiés et Citoyenneté Canada (IRCC) sont supervisées en toute conformité par ${cricNom}, membre du CCIC sous le numéro ${cricCcic}.
- Les données personnelles contenues dans le dossier de candidature (CV, diplômes, identité) sont strictement protégées et traitées conformément aux exigences du RGPD et des lois canadiennes sur la vie privée.

La présente attestation est délivrée pour valoir ce que de droit et confirmer au candidat la parfaite authenticité, la légalité et le sérieux des démarches entreprises par notre entreprise et notre partenaire de recrutement.

Fait à ${ville}, le ${date}.

Pour l'Employeur :                           Pour le Prestataire :
${signNom}                                   ${prestRepNom}
${signTitre}                                 ${prestRepTitre}
[Signature et cachet de l'entreprise]         [Signature et cachet du prestataire]
===============================================================================`;
}

/**
 * Génère le texte brut du MODÈLE 2 : CONTRAT DE PRESTATION DE SERVICES DE RECRUTEMENT INTERNATIONAL
 */
export function generateModel2PlainText(v: CricContractVariables): string {
  const empNom = v.showNomEntrepriseCanada ? v.nomEntrepriseCanada : "l'Employeur";
  const empProvince = v.showProvinceCanadienne ? v.provinceCanadienne : 'Canada';
  const empAdresse = v.showAdresseEntrepriseCanada ? v.adresseEntrepriseCanada : 'son siège social';
  const empRepNom = v.showRepresentantNomEmployeur ? v.representantNomEmployeur : 'la Direction Générale';
  const empRepTitre = v.showRepresentantTitreEmployeur ? v.representantTitreEmployeur : 'Représentant';

  const prestNom = v.showNomPrestataireFrance ? v.nomPrestataireFrance : 'le Prestataire';
  const prestStatut = v.showStatutJuridiquePrestataire ? v.statutJuridiquePrestataire : 'société de recrutement agréée';
  const prestAdresse = v.showAdressePrestataireFrance ? v.adressePrestataireFrance : 'son siège social';
  const prestCnesst = v.showPermisCnesst ? v.permisCnesst : 'délivré par les autorités provinciales';
  const prestRepNom = v.showRepresentantPrestataireNom ? v.representantPrestataireNom : 'le représentant légal';
  const prestRepTitre = v.showRepresentantPrestataireTitre ? v.representantPrestataireTitre : 'Directeur';

  const poste = v.showIntitulePoste ? v.intitulePoste : 'Poste de travailleur qualifié';
  const cnp = v.showCodeCnp ? v.codeCnp : 'selon la CNP applicable';
  const refEimt = v.showReferenceEimtOuSuivi ? v.referenceEimtOuSuivi : 'en cours d’attribution';
  const cricNom = v.showNomProfessionnelImmigration ? v.nomProfessionnelImmigration : 'le professionnel en immigration mandaté';
  const cricCcic = v.showNumeroMembreCcic ? v.numeroMembreCcic : 'en règle';

  const honoraires = v.showMontantHonoraires ? v.montantHonoraires : 'selon barème convenu';
  const ville = v.showVilleSignature ? v.villeSignature : 'Surrey, BC';
  const date = v.showDateJour ? v.dateJour : new Date().toLocaleDateString('fr-CA');

  return `CONTRAT DE PRESTATION DE SERVICES DE RECRUTEMENT INTERNATIONAL
(VERSION INTÉGRALE ET CONFIDENTIELLE - INTERNE)
===============================================================================

ENTRE LES SOUSSIGNÉS :

${empNom}, société dûment constituée sous le régime des lois du ${empProvince}, ayant son siège social au ${empAdresse}, représentée par ${empRepNom}, en sa qualité de ${empRepTitre}, ci-après désignée "l'Employeur" ou "le Client",

ET 

${prestNom}, ${prestStatut}, dont le siège social est situé au ${prestAdresse}, détentrice du permis de recrutement de travailleurs étrangers de la CNESST numéro ${prestCnesst}, représentée par ${prestRepNom}, en sa qualité de ${prestRepTitre}, ci-après désignée "le Prestataire".

L'Employeur et le Prestataire étant individuellement désignés "la Partie" et collectivement "les Parties".


IL A ÉTÉ CONVENU ET ARRÊTÉ CE QUI SUIT :

ARTICLE 1 : OBJET DE LA MISSION
L'Employeur confie au Prestataire, qui l'accepte, la mission de recherche, de sélection et d'assistance au recrutement international de travailleurs étrangers pour combler le(s) poste(s) suivant(s) au Canada :
- Poste : ${poste}, correspondant au code de la Classification nationale des professions (CNP) : ${cnp}.
Le Prestataire s'engage à agir en conformité stricte avec les lois canadiennes, provinciales et internationales régissant le recrutement éthique.

ARTICLE 2 : OBLIGATIONS DU PRESTATAIRE ET RECRUTEMENT ÉTHIQUE
Le Prestataire s'engage à mener sa mission selon les règles de l'art et les normes de l'Organisation internationale du Travail (OIT). 
Conformément aux lois canadiennes et provinciales, il est STRICTEMENT INTERDIT au Prestataire de facturer, directement ou indirectement, des frais de recrutement ou de placement aux candidats. Tous les frais afférents à la présente mission sont exclusivement à la charge de l'Employeur.

ARTICLE 3 : ASSISTANCE AUX DÉMARCHES D'IMMIGRATION CANADIENNE
Les Parties conviennent que l'intégration légale du travailleur étranger nécessite des démarches d'immigration. 
L'Employeur s'engage à initier la demande d'Étude d'Impact sur le Marché du Travail (EIMT) sous le numéro de dossier ${refEimt}.
Le Prestataire collaborera avec ${cricNom}, membre en règle du Collège des consultants en immigration et en citoyenneté (CCIC) sous le numéro ${cricCcic}, dûment mandaté via le formulaire officiel IMM 5476 pour la représentation légale des dossiers auprès d'Immigration, Réfugiés et Citoyenneté Canada (IRCC).

ARTICLE 4 : CONDITIONS FINANCIÈRES ET MODALITÉS DE PAIEMENT (CONFIDENTIEL)
En contrepartie de la réalisation de la mission, l'Employeur versera au Prestataire des honoraires fixés comme suit :
- Montant des honoraires : ${honoraires}.
- Calendrier des versements :
  * ${v.pourcentageSignature}% à la signature du présent contrat.
  * ${v.pourcentageEimt}% à la délivrance de l'EIMT positive par les autorités canadiennes.
  * ${v.pourcentagePriseFonction}% au premier jour de travail du candidat au sein de l'entreprise.
Toute facture sera payable sous un délai de ${v.delaiPaiementFactureJours} jours par virement bancaire international.

ARTICLE 5 : CLAUSE DE GARANTIE ET DE REMPLACEMENT (CONFIDENTIEL)
Si le travailleur recruté quitte son emploi ou si son contrat est résilié par l'Employeur au cours d'une période de ${v.moisGarantie} mois suivant sa prise de fonction (sauf cas de force majeure ou licenciement économique), le Prestataire s'engage à effectuer une nouvelle recherche pour le même poste, sans facturation d'honoraires supplémentaires.

ARTICLE 6 : CLAUSE DE NON-SOLLICITATION ET D'EXCLUSIVITÉ (CONFIDENTIEL)
L'Employeur s'engage à ne pas solliciter ni embaucher, directement ou indirectement, de membre du personnel du Prestataire pendant la durée du présent contrat et durant les ${v.moisNonSollicitation} mois suivants son expiration. 
L'Employeur accorde au Prestataire l'exclusivité de la recherche pour le poste mentionné à l'Article 1 pour une durée de ${v.dureeExclusivite}.

ARTICLE 7 : PROTECTION DES DONNÉES PERSONNELLES (RGPD ET LPRPDE)
Le Prestataire s'engage à traiter les données des candidats conformément au Règlement Général sur la Protection des Données (RGPD) européen et à la Loi sur la protection des renseignements personnels et les documents électroniques (LPRPDE) du Canada. Les dossiers des candidats non retenus seront détruits ou anonymisés dans un délai de ${v.delaiConservationDonnees}.

ARTICLE 8 : DROIT APPLICABLE ET TRIBUNAL COMPÉTENT
Le présent contrat est régi par les lois de ${v.paysDroitApplicable}. Tout litige relatif à son exécution ou son interprétation sera de la compétence exclusive des tribunaux de ${v.villeTribunalCompetent}.

Fait à ${ville}, le ${date}, en deux exemplaires originaux.

Pour l'Employeur :                           Pour le Prestataire :
${v.signataireNomEmployeur}                   ${prestRepNom}
${v.signataireTitreEmployeur}                 ${prestRepTitre}
[Signature et Cachet Employeur]               [Signature et Cachet Prestataire]
===============================================================================`;
}

/**
 * Exporte un document Word (.doc compatible Microsoft Word, LibreOffice, Google Docs)
 */
export function downloadWordDocument(filename: string, title: string, htmlBodyContent: string): void {
  const fullHtml = `<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset='utf-8'>
  <title>${title}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page {
      size: 21cm 29.7cm;
      margin: 2.2cm 2.2cm 2.2cm 2.2cm;
      mso-page-orientation: portrait;
    }
    body {
      font-family: 'Segoe UI', Calibri, Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #1E293B;
      background: #FFFFFF;
    }
    h1 {
      font-size: 15pt;
      color: #0B2545;
      text-align: center;
      text-transform: uppercase;
      border-bottom: 2pt solid #0066B3;
      padding-bottom: 6pt;
      margin-bottom: 16pt;
    }
    h2 {
      font-size: 12pt;
      color: #0066B3;
      margin-top: 14pt;
      margin-bottom: 4pt;
      text-transform: uppercase;
    }
    p {
      margin-bottom: 8pt;
      text-align: justify;
    }
    ul {
      margin-top: 4pt;
      margin-bottom: 8pt;
      padding-left: 20pt;
    }
    li {
      margin-bottom: 4pt;
    }
    .header-box {
      border: 1pt solid #CBD5E1;
      padding: 10pt;
      background: #F8FAFC;
      margin-bottom: 16pt;
    }
    .signature-table {
      width: 100%;
      margin-top: 24pt;
      border-collapse: collapse;
    }
    .signature-table td {
      width: 50%;
      vertical-align: top;
      padding: 8pt;
    }
  </style>
</head>
<body>
  ${htmlBodyContent}
</body>
</html>`;

  const blob = new Blob(['\ufeff' + fullHtml], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.doc') || filename.endsWith('.docx') ? filename : `${filename}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Génère le PDF vectoriel ultra-propre pour le Modèle 1 (ATTESTATION DE MANDAT DE RECRUTEMENT)
 */
export async function generateModel1AttestationPdf(
  v: CricContractVariables,
  customVisualText?: string
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
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

  let logoEmployeurDataUrl = '';
  let signatureEmployeurDataUrl = '';
  let cachetEmployeurDataUrl = '';
  let signaturePrestataireDataUrl = '';
  let cachetPrestataireDataUrl = '';

  try {
    const rawLogo = v.logoEmployeurUrl || CONTRACT_STATIC_ASSETS.logoAtlantic;
    logoEmployeurDataUrl = await loadStaticImageAsPngDataUrl(rawLogo);
    signatureEmployeurDataUrl = await loadStaticImageAsPngDataUrl(
      v.signatureEmployeurUrl || getSavedCustomSignature() || CONTRACT_STATIC_ASSETS.signature
    );
    cachetEmployeurDataUrl = await loadStaticImageAsPngDataUrl(
      v.cachetEmployeurUrl || getSavedCustomCachet() || CONTRACT_STATIC_ASSETS.cachet
    );
    if (v.signaturePrestataireUrl) {
      signaturePrestataireDataUrl = await loadStaticImageAsPngDataUrl(v.signaturePrestataireUrl);
    }
    if (v.cachetPrestataireUrl) {
      cachetPrestataireDataUrl = await loadStaticImageAsPngDataUrl(v.cachetPrestataireUrl);
    }
  } catch {
    // Ignore error
  }

  let y = 18;

  // Logo Employeur en haut à gauche
  if (logoEmployeurDataUrl) {
    try {
      doc.addImage(logoEmployeurDataUrl, 'PNG', MARGIN_LEFT, y, 42, 17);
    } catch {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(11, 37, 69);
      doc.text(v.nomEntrepriseCanada, MARGIN_LEFT, y + 8);
    }
  }

  // En-tête officiel à droite
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(11, 37, 69);
  doc.text('ATTESTATION OFFICIELLE DE MANDAT', PAGE_WIDTH - MARGIN_RIGHT, y + 5, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Recrutement International Éthique & LIPR', PAGE_WIDTH - MARGIN_RIGHT, y + 9.5, { align: 'right' });
  doc.text(`Réf : ${v.referenceEimtOuSuivi}`, PAGE_WIDTH - MARGIN_RIGHT, y + 14, { align: 'right' });

  y += 24;

  // Titre principal centré
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(0, 102, 179);
  doc.text('ATTESTATION DE MANDAT DE RECRUTEMENT INTERNATIONAL', PAGE_WIDTH / 2, y, { align: 'center' });
  y += 4;
  doc.setDrawColor(0, 102, 179);
  doc.setLineWidth(0.4);
  doc.line(MARGIN_LEFT, y, PAGE_WIDTH - MARGIN_RIGHT, y);
  y += 6;

  // À l'attention de tout candidat
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('À l’attention de tout candidat au recrutement international,', MARGIN_LEFT, y);
  y += 6;

  // Soussignés
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.8);
  doc.setTextColor(30, 41, 59);

  const empNom = v.showNomEntrepriseCanada ? v.nomEntrepriseCanada : "l'entreprise employeuse dûment immatriculée au Canada";
  const empProvince = v.showProvinceCanadienne ? v.provinceCanadienne : 'Colombie-Britannique';
  const empAdresse = v.showAdresseEntrepriseCanada ? v.adresseEntrepriseCanada : 'son siège social légal au Canada';
  const empRepNom = v.showRepresentantNomEmployeur ? v.representantNomEmployeur : 'la direction générale habilitée';
  const empRepTitre = v.showRepresentantTitreEmployeur ? v.representantTitreEmployeur : 'Représentant légal';

  const introText = `Nous soussignés, ${empNom}, société dûment constituée sous le régime des lois du ${empProvince}, ayant son siège social au ${empAdresse}, représentée par ${empRepNom}, en sa qualité de ${empRepTitre}, ci-après désignée "l'Employeur",\n\nATTESTONS PAR LA PRÉSENTE :`;
  const introLines = doc.splitTextToSize(introText, CONTENT_WIDTH);
  doc.text(introLines, MARGIN_LEFT, y);
  y += introLines.length * 4.4 + 4;

  // Helper article
  const drawSection = (num: string, title: string, bodyText: string) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(0, 102, 179);
    doc.text(`${num}. ${title}`, MARGIN_LEFT, y);
    y += 4.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.6);
    doc.setTextColor(30, 41, 59);
    const lines = doc.splitTextToSize(bodyText, CONTENT_WIDTH);
    doc.text(lines, MARGIN_LEFT, y);
    y += lines.length * 4.2 + 4;
  };

  const prestNom = v.showNomPrestataireFrance ? v.nomPrestataireFrance : 'le prestataire agréé de recrutement international';
  const prestAdresse = v.showAdressePrestataireFrance ? v.adressePrestataireFrance : 'son siège social déclaré en France';
  const prestCnesst = v.showPermisCnesst ? v.permisCnesst : 'en cours de validité auprès des autorités compétentes';

  drawSection(
    '1',
    'CADRE DE MANDAT OFFICIEL',
    `L'Employeur a officiellement confié un mandat de recherche, de sourcing et de présélection de profils internationaux au prestataire : ${prestNom}, dont le siège social est situé au ${prestAdresse}, détentrice du permis de recrutement de travailleurs étrangers de la CNESST numéro ${prestCnesst}, ci-après désignée "le Prestataire".`
  );

  const poste = v.showIntitulePoste ? v.intitulePoste : 'Poste de travailleur qualifié au Canada';
  const cnp = v.showCodeCnp ? v.codeCnp : 'Classification nationale des professions';
  const demarche = v.showTypeDemarche ? v.typeDemarche : 'Démarche d’immigration officielle';
  const refEimt = v.showReferenceEimtOuSuivi ? v.referenceEimtOuSuivi : 'enregistrée sous référence confidentielle';

  drawSection(
    '2',
    'IDENTIFICATION DU POSTE ET CONFORMITÉ DE L’IMMIGRATION',
    `Ce mandat s'inscrit dans le cadre d'un processus rigoureux d'embauche de travailleurs étrangers au Canada pour le poste suivant :\n• Intitulé du poste : ${poste}\n• Code de la Classification nationale des professions (CNP) : ${cnp}\n• Démarche d'immigration correspondante : ${demarche}, actuellement enregistrée ou en cours d'analyse sous la référence gouvernementale ${refEimt}.`
  );

  const cricNom = v.showNomProfessionnelImmigration ? v.nomProfessionnelImmigration : 'un professionnel réglementé en immigration dûment accrédité';
  const cricCcic = v.showNumeroMembreCcic ? v.numeroMembreCcic : 'en règle';

  drawSection(
    '3',
    'PROTECTION ET DROITS DU CANDIDAT (RECRUTEMENT ÉTHIQUE)',
    `Conformément à la réglementation du Code du travail du Canada et des provinces applicables :\n• La présente démarche est entièrement gratuite pour le candidat. Aucun frais de recrutement ou de placement ne peut lui être réclamé par le Prestataire ou l'Employeur.\n• Les démarches de visa de travail et de représentation légale auprès d'Immigration, Réfugiés et Citoyenneté Canada (IRCC) sont supervisées en toute conformité par ${cricNom}, membre du CCIC sous le numéro ${cricCcic}.\n• Les données personnelles contenues dans le dossier de candidature (CV, diplômes, identité) sont strictement protégées et traitées conformément aux exigences du RGPD et des lois canadiennes sur la vie privée.`
  );

  // Conclusion
  const conclText = "La présente attestation est délivrée pour valoir ce que de droit et confirmer au candidat la parfaite authenticité, la légalité et le sérieux des démarches entreprises par notre entreprise et notre partenaire de recrutement.";
  const cLines = doc.splitTextToSize(conclText, CONTENT_WIDTH);
  doc.setFont('helvetica', 'italic');
  doc.text(cLines, MARGIN_LEFT, y);
  y += cLines.length * 4.2 + 5;

  const ville = v.showVilleSignature ? v.villeSignature : 'Surrey, BC';
  const date = v.showDateJour ? v.dateJour : new Date().toLocaleDateString('fr-CA');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.8);
  doc.setTextColor(30, 41, 59);
  doc.text(`Fait à ${ville}, le ${date}.`, MARGIN_LEFT, y);
  y += 7;

  const col1X = MARGIN_LEFT;
  const col2X = MARGIN_LEFT + 86;
  const prestRepNom = v.showRepresentantPrestataireNom ? v.representantPrestataireNom : 'Représentant habilité';
  const prestRepTitre = v.showRepresentantPrestataireTitre ? v.representantPrestataireTitre : 'Directeur du recrutement';

  // En-têtes des deux colonnes
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(11, 37, 69);
  doc.text("Pour l'Employeur :", col1X, y);
  doc.text("Pour le Prestataire :", col2X, y);
  y += 4.5;

  // Noms et Titres
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(v.signataireNomEmployeur, col1X, y);
  doc.text(v.signataireTitreEmployeur, col1X, y + 4);

  doc.text(prestRepNom, col2X, y);
  doc.text(prestRepTitre, col2X, y + 4);

  // Cachet & Signature Employeur (Colonne 1)
  if (cachetEmployeurDataUrl) {
    try {
      doc.addImage(cachetEmployeurDataUrl, 'PNG', col1X, y + 8, 22, 22);
    } catch {
      // Ignore
    }
  }
  if (signatureEmployeurDataUrl) {
    try {
      doc.addImage(signatureEmployeurDataUrl, 'PNG', col1X + 22, y + 9, 30, 15);
    } catch {
      // Ignore
    }
  }

  // Cachet & Signature Prestataire (Colonne 2)
  if (cachetPrestataireDataUrl) {
    try {
      doc.addImage(cachetPrestataireDataUrl, 'PNG', col2X, y + 8, 22, 22);
    } catch {
      // Ignore
    }
  }
  if (signaturePrestataireDataUrl) {
    try {
      doc.addImage(signaturePrestataireDataUrl, 'PNG', col2X + 22, y + 9, 30, 15);
    } catch {
      // Ignore
    }
  }

  // Pied de page
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `${v.nomEntrepriseCanada} · Attestation de mandat officiel · Réf : ${v.referenceEimtOuSuivi} · Validité internationale`,
    MARGIN_LEFT,
    PAGE_HEIGHT - 8
  );

  const filename = `Attestation_Mandat_Recrutement_${v.referenceEimtOuSuivi}.pdf`;
  const dataUri = doc.output('datauristring');

  return { doc, filename, dataUri };
}

/**
 * Génère le PDF vectoriel complet pour le Modèle 2 (CONTRAT DE PRESTATION DE SERVICES - 2 pages)
 */
export async function generateModel2ContratPdf(
  v: CricContractVariables,
  customVisualText?: string
): Promise<{ doc: jsPDF; filename: string; dataUri: string }> {
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

  let logoEmployeurDataUrl = '';
  let signatureEmployeurDataUrl = '';
  let cachetEmployeurDataUrl = '';
  let signaturePrestataireDataUrl = '';
  let cachetPrestataireDataUrl = '';

  try {
    logoEmployeurDataUrl = await loadStaticImageAsPngDataUrl(v.logoEmployeurUrl || CONTRACT_STATIC_ASSETS.logoAtlantic);
    signatureEmployeurDataUrl = await loadStaticImageAsPngDataUrl(v.signatureEmployeurUrl || getSavedCustomSignature() || CONTRACT_STATIC_ASSETS.signature);
    cachetEmployeurDataUrl = await loadStaticImageAsPngDataUrl(v.cachetEmployeurUrl || getSavedCustomCachet() || CONTRACT_STATIC_ASSETS.cachet);
    if (v.signaturePrestataireUrl) signaturePrestataireDataUrl = await loadStaticImageAsPngDataUrl(v.signaturePrestataireUrl);
    if (v.cachetPrestataireUrl) cachetPrestataireDataUrl = await loadStaticImageAsPngDataUrl(v.cachetPrestataireUrl);
  } catch {
    // Ignore error
  }

  // --- PAGE 1 : En-tête & Articles 1 à 4 ---
  let y = 16;

  if (logoEmployeurDataUrl) {
    try {
      doc.addImage(logoEmployeurDataUrl, 'PNG', MARGIN_LEFT, y, 40, 16);
    } catch {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text(v.nomEntrepriseCanada, MARGIN_LEFT, y + 8);
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(11, 37, 69);
  doc.text('CONTRAT DE PRESTATION DE SERVICES', PAGE_WIDTH - MARGIN_RIGHT, y + 5, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Recrutement International · Version Intégrale Confidentielle', PAGE_WIDTH - MARGIN_RIGHT, y + 9.5, { align: 'right' });
  doc.text(`Réf Dossier : ${v.referenceEimtOuSuivi}`, PAGE_WIDTH - MARGIN_RIGHT, y + 14, { align: 'right' });

  y += 22;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(0, 102, 179);
  doc.text('CONTRAT DE PRESTATION DE SERVICES DE RECRUTEMENT INTERNATIONAL', PAGE_WIDTH / 2, y, { align: 'center' });
  y += 4;
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('(VERSION INTÉGRALE ET CONFIDENTIELLE - INTERNE)', PAGE_WIDTH / 2, y, { align: 'center' });
  y += 4;
  doc.setDrawColor(0, 102, 179);
  doc.setLineWidth(0.4);
  doc.line(MARGIN_LEFT, y, PAGE_WIDTH - MARGIN_RIGHT, y);
  y += 5;

  // Entre les soussignés
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(11, 37, 69);
  doc.text('ENTRE LES SOUSSIGNÉS :', MARGIN_LEFT, y);
  y += 4.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.3);
  doc.setTextColor(30, 41, 59);

  const empNom = v.showNomEntrepriseCanada ? v.nomEntrepriseCanada : "l'Employeur";
  const empProvince = v.showProvinceCanadienne ? v.provinceCanadienne : 'Colombie-Britannique';
  const empAdresse = v.showAdresseEntrepriseCanada ? v.adresseEntrepriseCanada : 'son siège social';
  const empRepNom = v.showRepresentantNomEmployeur ? v.representantNomEmployeur : 'la Direction';
  const empRepTitre = v.showRepresentantTitreEmployeur ? v.representantTitreEmployeur : 'Représentant';

  const empP = `${empNom}, société dûment constituée sous le régime des lois du ${empProvince}, ayant son siège social au ${empAdresse}, représentée par ${empRepNom}, en sa qualité de ${empRepTitre}, ci-après désignée "l'Employeur" ou "le Client",`;
  const empLines = doc.splitTextToSize(empP, CONTENT_WIDTH);
  doc.text(empLines, MARGIN_LEFT, y);
  y += empLines.length * 3.8 + 2.5;

  doc.setFont('helvetica', 'bold');
  doc.text('ET', MARGIN_LEFT, y);
  y += 3.5;

  doc.setFont('helvetica', 'normal');
  const prestNom = v.showNomPrestataireFrance ? v.nomPrestataireFrance : 'le Prestataire';
  const prestStatut = v.showStatutJuridiquePrestataire ? v.statutJuridiquePrestataire : 'société de recrutement agréée';
  const prestAdresse = v.showAdressePrestataireFrance ? v.adressePrestataireFrance : 'son siège social';
  const prestCnesst = v.showPermisCnesst ? v.permisCnesst : 'délivré par la CNESST';
  const prestRepNom = v.showRepresentantPrestataireNom ? v.representantPrestataireNom : 'le représentant légal';
  const prestRepTitre = v.showRepresentantPrestataireTitre ? v.representantPrestataireTitre : 'Directeur';

  const prestP = `${prestNom}, ${prestStatut}, dont le siège social est situé au ${prestAdresse}, détentrice du permis de recrutement de travailleurs étrangers de la CNESST numéro ${prestCnesst}, représentée par ${prestRepNom}, en sa qualité de ${prestRepTitre}, ci-après désignée "le Prestataire".`;
  const prestLines = doc.splitTextToSize(prestP, CONTENT_WIDTH);
  doc.text(prestLines, MARGIN_LEFT, y);
  y += prestLines.length * 3.8 + 3.5;

  doc.setFont('helvetica', 'italic');
  doc.text("L'Employeur et le Prestataire étant individuellement désignés \"la Partie\" et collectivement \"les Parties\".", MARGIN_LEFT, y);
  y += 4.5;
  doc.setFont('helvetica', 'bold');
  doc.text('IL A ÉTÉ CONVENU ET ARRÊTÉ CE QUI SUIT :', MARGIN_LEFT, y);
  y += 5;

  // Helper pour articles
  const printArticle = (num: string, title: string, content: string) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.8);
    doc.setTextColor(0, 102, 179);
    doc.text(`ARTICLE ${num} : ${title}`, MARGIN_LEFT, y);
    y += 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    const lines = doc.splitTextToSize(content, CONTENT_WIDTH);
    doc.text(lines, MARGIN_LEFT, y);
    y += lines.length * 3.8 + 3.5;
  };

  const poste = v.showIntitulePoste ? v.intitulePoste : 'Poste de travailleur qualifié';
  const cnp = v.showCodeCnp ? v.codeCnp : 'selon la CNP applicable';
  const refEimt = v.showReferenceEimtOuSuivi ? v.referenceEimtOuSuivi : 'en cours d’attribution';
  const cricNom = v.showNomProfessionnelImmigration ? v.nomProfessionnelImmigration : 'le professionnel en immigration mandaté';
  const cricCcic = v.showNumeroMembreCcic ? v.numeroMembreCcic : 'en règle';
  const honoraires = v.showMontantHonoraires ? v.montantHonoraires : 'selon barème convenu';

  printArticle('1', 'OBJET DE LA MISSION', `L'Employeur confie au Prestataire, qui l'accepte, la mission de recherche, de sélection et d'assistance au recrutement international de travailleurs étrangers pour combler le(s) poste(s) suivant(s) au Canada :\n- Poste : ${poste}, correspondant au code de la Classification nationale des professions (CNP) : ${cnp}.\nLe Prestataire s'engage à agir en conformité stricte avec les lois canadiennes, provinciales et internationales régissant le recrutement éthique.`);

  printArticle('2', 'OBLIGATIONS DU PRESTATAIRE ET RECRUTEMENT ÉTHIQUE', `Le Prestataire s'engage à mener sa mission selon les règles de l'art et les normes de l'Organisation internationale du Travail (OIT).\nConformément aux lois canadiennes et provinciales, il est STRICTEMENT INTERDIT au Prestataire de facturer, directement ou indirectement, des frais de recrutement ou de placement aux candidats. Tous les frais afférents à la présente mission sont exclusivement à la charge de l'Employeur.`);

  printArticle('3', 'ASSISTANCE AUX DÉMARCHES D\'IMMIGRATION CANADIENNE', `Les Parties conviennent que l'intégration légale du travailleur étranger nécessite des démarches d'immigration.\nL'Employeur s'engage à initier la demande d'Étude d'Impact sur le Marché du Travail (EIMT) sous le numéro de dossier ${refEimt}.\nLe Prestataire collaborera avec ${cricNom}, membre en règle du Collège des consultants en immigration et en citoyenneté (CCIC) sous le numéro ${cricCcic}, dûment mandaté via le formulaire officiel IMM 5476 pour la représentation légale des dossiers auprès d'Immigration, Réfugiés et Citoyenneté Canada (IRCC).`);

  printArticle('4', 'CONDITIONS FINANCIÈRES ET MODALITÉS DE PAIEMENT (CONFIDENTIEL)', `En contrepartie de la réalisation de la mission, l'Employeur versera au Prestataire des honoraires fixés comme suit :\n- Montant des honoraires : ${honoraires}.\n- Calendrier des versements : ${v.pourcentageSignature}% à la signature du présent contrat ; ${v.pourcentageEimt}% à la délivrance de l'EIMT positive par les autorités canadiennes ; ${v.pourcentagePriseFonction}% au premier jour de travail du candidat au sein de l'entreprise.\nToute facture sera payable sous un délai de ${v.delaiPaiementFactureJours} jours par virement bancaire international.`);

  // --- PAGE 2 : Articles 5 à 8 et Signatures ---
  doc.addPage();
  y = 20;

  printArticle('5', 'CLAUSE DE GARANTIE ET DE REMPLACEMENT (CONFIDENTIEL)', `Si le travailleur recruté quitte son emploi ou si son contrat est résilié par l'Employeur au cours d'une période de ${v.moisGarantie} mois suivant sa prise de fonction (sauf cas de force majeure ou licenciement économique), le Prestataire s'engage à effectuer une nouvelle recherche pour le même poste, sans facturation d'honoraires supplémentaires.`);

  printArticle('6', 'CLAUSE DE NON-SOLLICITATION ET D\'EXCLUSIVITÉ (CONFIDENTIEL)', `L'Employeur s'engage à ne pas solliciter ni embaucher, directement ou indirectement, de membre du personnel du Prestataire pendant la durée du présent contrat et durant les ${v.moisNonSollicitation} mois suivants son expiration.\nL'Employeur accorde au Prestataire l'exclusivité de la recherche pour le poste mentionné à l'Article 1 pour une durée de ${v.dureeExclusivite}.`);

  printArticle('7', 'PROTECTION DES DONNÉES PERSONNELLES (RGPD ET LPRPDE)', `Le Prestataire s'engage à traiter les données des candidats conformément au Règlement Général sur la Protection des Données (RGPD) européen et à la Loi sur la protection des renseignements personnels et les documents électroniques (LPRPDE) du Canada. Les dossiers des candidats non retenus seront détruits ou anonymisés dans un délai de ${v.delaiConservationDonnees}.`);

  printArticle('8', 'DROIT APPLICABLE ET TRIBUNAL COMPÉTENT', `Le présent contrat est régi par les lois de ${v.paysDroitApplicable}. Tout litige relatif à son exécution ou son interprétation sera de la compétence exclusive des tribunaux de ${v.villeTribunalCompetent}.`);

  y += 4;
  const ville = v.showVilleSignature ? v.villeSignature : 'Surrey, BC';
  const date = v.showDateJour ? v.dateJour : new Date().toLocaleDateString('fr-CA');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.8);
  doc.text(`Fait à ${ville}, le ${date}, en deux (2) exemplaires originaux.`, MARGIN_LEFT, y);
  y += 12;

  // Signatures doubles
  const colWidth = CONTENT_WIDTH / 2 - 5;
  const col1X = MARGIN_LEFT;
  const col2X = MARGIN_LEFT + colWidth + 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(11, 37, 69);
  doc.text("Pour l'Employeur (Le Client) :", col1X, y);
  doc.text("Pour le Prestataire (Mandataire) :", col2X, y);

  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(30, 41, 59);
  doc.text(v.signataireNomEmployeur, col1X, y);
  doc.text(v.signataireTitreEmployeur, col1X, y + 4);

  doc.text(prestRepNom, col2X, y);
  doc.text(prestRepTitre, col2X, y + 4);

  // Cachet & Signature Employeur
  if (cachetEmployeurDataUrl) {
    try {
      doc.addImage(cachetEmployeurDataUrl, 'PNG', col1X, y + 10, 24, 24);
    } catch {
      // Ignore
    }
  }
  if (signatureEmployeurDataUrl) {
    try {
      doc.addImage(signatureEmployeurDataUrl, 'PNG', col1X + 18, y + 12, 32, 16);
    } catch {
      // Ignore
    }
  }

  // Cachet & Signature Prestataire
  if (cachetPrestataireDataUrl) {
    try {
      doc.addImage(cachetPrestataireDataUrl, 'PNG', col2X, y + 10, 24, 24);
    } catch {
      // Ignore
    }
  }
  if (signaturePrestataireDataUrl) {
    try {
      doc.addImage(signaturePrestataireDataUrl, 'PNG', col2X + 18, y + 12, 32, 16);
    } catch {
      // Ignore
    }
  }

  // Pied de page
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `${v.nomEntrepriseCanada} · Contrat de prestation CRIC · Réf : ${v.referenceEimtOuSuivi} · Page 2 sur 2`,
    MARGIN_LEFT,
    PAGE_HEIGHT - 8
  );

  const filename = `Contrat_Prestation_CRIC_Integrale_${v.referenceEimtOuSuivi}.pdf`;
  const dataUri = doc.output('datauristring');

  return { doc, filename, dataUri };
}

/**
 * MOTEUR 1 : HTML EMAIL RESPONSIVE
 * Génère le template e-mail HTML 100% responsive compatible Gmail, Outlook et Kit CMS
 * avec préservation absolue des visuels importés (logos, signatures, cachets, filigranes)
 */
export interface CricMaquettismeOptions {
  customPrimaryColor?: string;
  customAccentColor?: string;
  customBgColor?: string;
  customContainerBgColor?: string;
  showWatermark?: boolean;
  showBackgroundTexture?: boolean;
}

export function generateCricContractResponsiveEmailHtml(
  v: CricContractVariables,
  modelChoice: 'model1' | 'model2',
  designVariation = 0,
  assetsConfig?: PdfImportedAssetsConfig,
  maquettisme?: CricMaquettismeOptions
): string {
  const isModel1 = modelChoice === 'model1';
  const title = isModel1
    ? 'ATTESTATION DE MANDAT DE RECRUTEMENT INTERNATIONAL'
    : 'CONTRAT DE PRESTATION DE SERVICES DE RECRUTEMENT INTERNATIONAL';

  const logoUrl = v.logoEmployeurUrl || CONTRACT_STATIC_ASSETS.logoAtlantic;
  const sigEmpUrl = v.signatureEmployeurUrl || CONTRACT_STATIC_ASSETS.signature;
  const cachetEmpUrl = v.cachetEmployeurUrl || CONTRACT_STATIC_ASSETS.cachet;
  const logoPrestUrl = v.logoPrestataireUrl || '';
  const sigPrestUrl = v.signaturePrestataireUrl || '';
  const cachetPrestUrl = v.cachetPrestataireUrl || '';

  const empNom = v.showNomEntrepriseCanada ? v.nomEntrepriseCanada : "L'Employeur (Canada)";
  const empAdresse = v.showAdresseEntrepriseCanada ? v.adresseEntrepriseCanada : 'Siège social Canada';
  const empRep = v.showRepresentantNomEmployeur ? v.representantNomEmployeur : 'La Direction Générale';
  const empTitre = v.showRepresentantTitreEmployeur ? v.representantTitreEmployeur : 'Représentant Légal';

  const prestNom = v.showNomPrestataireFrance ? v.nomPrestataireFrance : 'Cabinet CRIC Partenaire';
  const prestAdresse = v.showAdressePrestataireFrance ? v.adressePrestataireFrance : 'Siège social France';
  const prestRep = v.showRepresentantPrestataireNom ? v.representantPrestataireNom : 'Le Mandataire';
  const prestTitre = v.showRepresentantPrestataireTitre ? v.representantPrestataireTitre : 'Directeur';

  const poste = v.showIntitulePoste ? v.intitulePoste : 'Poste de travailleur qualifié';
  const cnp = v.showCodeCnp ? v.codeCnp : 'Classification CNP Canada';
  const ref = v.showReferenceEimtOuSuivi ? v.referenceEimtOuSuivi : 'REF-CONFIDENTIEL';
  const date = v.showDateJour ? v.dateJour : new Date().toLocaleDateString('fr-CA');
  const ville = v.showVilleSignature ? v.villeSignature : 'Surrey, BC';

  // Palette de styles selon la variante choisie (5 Modèles)
  const palettes = [
    { primary: '#0B2545', accent: '#D4A017', bg: '#F8FAFC', border: '#CBD5E1', name: 'Exécutif & Diplomatique' },
    { primary: '#0284C7', accent: '#0369A1', bg: '#F0F9FF', border: '#BAE6FD', name: 'Moderne Minimaliste' },
    { primary: '#1E293B', accent: '#94A3B8', bg: '#F8FAFC', border: '#E2E8F0', name: 'Notarié Solennel' },
    { primary: '#047857', accent: '#D97706', bg: '#ECFDF5', border: '#A7F3D0', name: 'Logistique & Fret' },
    { primary: '#7C3AED', accent: '#F59E0B', bg: '#FAF5FF', border: '#E9D5FF', name: 'Protocole Canadien Bilingue' }
  ];
  const p = palettes[designVariation % palettes.length];

  const primaryCol = maquettisme?.customPrimaryColor || p.primary;
  const accentCol = maquettisme?.customAccentColor || p.accent;
  const outerBg = maquettisme?.customBgColor || '#F1F5F9';
  const containerBg = maquettisme?.customContainerBgColor || '#FFFFFF';

  // Arrière-plan importé
  const bgDataUrl = assetsConfig?.arrierePlan?.dataUrl || v.arrierePlanUrl;
  const bgOpacity = (assetsConfig?.arrierePlan?.opacity ?? 20) / 100;
  const hasBgTexture = Boolean(bgDataUrl && maquettisme?.showBackgroundTexture !== false);

  // Filigrane importé
  const filigraneDataUrl = assetsConfig?.filigrane?.dataUrl || v.filigraneEmployeurUrl;
  const filigraneOpacity = (assetsConfig?.filigrane?.opacity ?? 15) / 100;
  const hasWatermark = Boolean(filigraneDataUrl && maquettisme?.showWatermark !== false);

  // Dimensions & superpositions
  const cachetEmpW = assetsConfig?.cachet?.widthValue || 90;
  const cachetEmpH = assetsConfig?.cachet?.heightValue || 52;
  const cachetEmpOpacity = (assetsConfig?.cachet?.opacity ?? 100) / 100;

  const sigEmpW = assetsConfig?.signature?.widthValue || 110;
  const sigEmpH = assetsConfig?.signature?.heightValue || 48;
  const sigEmpOpacity = (assetsConfig?.signature?.opacity ?? 100) / 100;

  const cachetPrestW = assetsConfig?.cachetPrestataire?.widthValue || 90;
  const cachetPrestH = assetsConfig?.cachetPrestataire?.heightValue || 52;
  const cachetPrestOpacity = (assetsConfig?.cachetPrestataire?.opacity ?? 100) / 100;

  const sigPrestW = assetsConfig?.signaturePrestataire?.widthValue || 110;
  const sigPrestH = assetsConfig?.signaturePrestataire?.heightValue || 48;
  const sigPrestOpacity = (assetsConfig?.signaturePrestataire?.opacity ?? 100) / 100;

  return `<!DOCTYPE html>
<html lang="fr" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background-color: ${outerBg}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
    table { border-collapse: collapse; }
    .email-container { max-width: 680px; margin: 0 auto; background-color: ${containerBg}; border-radius: 12px; overflow: hidden; border: 1px solid ${p.border}; box-shadow: 0 4px 12px rgba(0,0,0,0.06); position: relative; }
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; border-radius: 0 !important; }
      .col-half { display: block !important; width: 100% !important; margin-bottom: 16px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 20px 0; background-color: ${outerBg};">
  <center>
    <table role="presentation" class="email-container" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 680px; background-color: ${containerBg}; ${hasBgTexture ? `background-image: url('${bgDataUrl}'); background-size: cover; background-position: center;` : ''}">
      <!-- EN-TÊTE OFFICIEL PERSONNALISÉ -->
      <tr>
        <td style="padding: 24px 30px; background-color: ${primaryCol}; border-bottom: 3px solid ${accentCol};">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td align="left" valign="middle" style="width: 50%;">
                ${logoUrl ? `<img src="${logoUrl}" alt="${empNom}" style="max-height: 48px; max-width: 190px; height: auto; display: block;" border="0">` : `<span style="font-size: 18px; font-weight: bold; color: #FFFFFF;">${empNom}</span>`}
              </td>
              <td align="right" valign="middle" style="width: 50%; color: #FFFFFF; font-size: 11px;">
                <span style="display: block; font-weight: bold; color: ${accentCol}; text-transform: uppercase; letter-spacing: 0.5px;">Accréditation Officielle</span>
                <span style="display: block; color: #E2E8F0; font-family: monospace;">Réf : ${ref}</span>
                <span style="display: block; color: #94A3B8;">Émis le : ${date}</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- TITRE DU DOCUMENT -->
      <tr>
        <td style="padding: 28px 30px 10px 30px;">
          <h1 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 800; color: ${primaryCol}; text-transform: uppercase; letter-spacing: -0.2px; text-align: center;">
            ${title}
          </h1>
          <div style="width: 60px; height: 3px; background-color: ${accentCol}; margin: 0 auto 20px auto; border-radius: 2px;"></div>
          <p style="margin: 0 0 16px 0; font-size: 13px; line-height: 1.6; color: #475569; text-align: justify;">
            <strong>À l'attention du candidat et des autorités compétentes :</strong> La présente atteste des dispositions juridiques et des mandats professionnels officiellement conférés dans le cadre du recrutement international de travailleurs étrangers au Canada.
          </p>
        </td>
      </tr>

      <!-- CARTOUCHE DES PARTIES (AVEC LOGO PRESTATAIRE SI FOURNI) -->
      <tr>
        <td style="padding: 0 30px 20px 30px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${p.bg}; border: 1px solid ${p.border}; border-radius: 8px; padding: 14px;">
            <tr>
              <td class="col-half" valign="top" style="width: 50%; padding: 8px;">
                <span style="font-size: 10px; font-weight: bold; color: ${primaryCol}; text-transform: uppercase; display: block; margin-bottom: 4px;">1. L'Employeur (Canada)</span>
                <span style="font-size: 13px; font-weight: bold; color: #0F172A; display: block;">${empNom}</span>
                <span style="font-size: 11px; color: #64748B; display: block;">${empAdresse}</span>
                <span style="font-size: 11px; color: #334155; display: block; margin-top: 4px;">Représentant : <strong>${empRep}</strong> (${empTitre})</span>
              </td>
              <td class="col-half" valign="top" style="width: 50%; padding: 8px;">
                <div style="display: flex; align-items: center; justify-content: space-between;">
                  <span style="font-size: 10px; font-weight: bold; color: ${primaryCol}; text-transform: uppercase; display: block; margin-bottom: 4px;">2. Le Prestataire (Cabinet Mandaté)</span>
                  ${logoPrestUrl ? `<img src="${logoPrestUrl}" alt="Logo Prestataire" style="max-height: 28px; max-width: 90px; object-contain;" border="0">` : ''}
                </div>
                <span style="font-size: 13px; font-weight: bold; color: #0F172A; display: block;">${prestNom}</span>
                <span style="font-size: 11px; color: #64748B; display: block;">${prestAdresse}</span>
                <span style="font-size: 11px; color: #334155; display: block; margin-top: 4px;">Mandataire : <strong>${prestRep}</strong> (${prestTitre})</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- BLOC SPÉCIFIQUE DU POSTE & IMMIGRATION -->
      <tr>
        <td style="padding: 0 30px 20px 30px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid #E2E8F0; border-radius: 8px;">
            <tr style="background-color: #F8FAFC;">
              <td style="padding: 10px 14px; font-size: 12px; font-weight: bold; color: ${primaryCol}; border-bottom: 1px solid #E2E8F0;">
                DÉTAILS DU POSTE VISÉ &amp; ENCADREMENT
              </td>
            </tr>
            <tr>
              <td style="padding: 14px; font-size: 12px; line-height: 1.7; color: #334155;">
                • <strong>Intitulé officiel :</strong> ${poste}<br>
                • <strong>Code CNP (Canada) :</strong> <span style="font-family: monospace; font-weight: bold; color: ${primaryCol};">${cnp}</span><br>
                • <strong>Cadre réglementaire :</strong> Recrutement direct sans aucuns frais à la charge du candidat (Principe de conformité OIT &amp; LIPR Canada).
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- DOUBLE SECTION SIGNATURES ET CACHETS OFFICIELS (EMPLOYEUR & PRESTATAIRE) -->
      <tr>
        <td style="padding: 10px 30px 30px 30px;">
          <p style="font-size: 11px; color: #64748B; margin-bottom: 16px;">
            Fait à ${ville}, le ${date}, en foi de quoi les parties ont apposé leurs signatures et sceaux officiels.
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <!-- Colonne Employeur -->
              <td class="col-half" valign="top" style="width: 50%; padding-right: 12px;">
                <div style="border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px; background-color: #FFFFFF;">
                  <span style="font-size: 11px; font-weight: bold; color: ${primaryCol}; text-transform: uppercase; display: block;">Pour l'Employeur :</span>
                  <span style="font-size: 12px; font-weight: bold; color: #1E293B; display: block; margin-top: 2px;">${v.signataireNomEmployeur || empRep}</span>
                  <span style="font-size: 10px; color: #64748B; display: block;">${v.signataireTitreEmployeur || empTitre}</span>
                  <div style="margin-top: 10px; min-height: 55px;">
                    ${cachetEmpUrl ? `<img src="${cachetEmpUrl}" alt="Cachet Employeur" style="max-height: ${cachetEmpH}px; max-width: ${cachetEmpW}px; opacity: ${cachetEmpOpacity}; vertical-align: middle; margin-right: 6px;" border="0">` : ''}
                    ${sigEmpUrl ? `<img src="${sigEmpUrl}" alt="Signature Employeur" style="max-height: ${sigEmpH}px; max-width: ${sigEmpW}px; opacity: ${sigEmpOpacity}; vertical-align: middle;" border="0">` : ''}
                  </div>
                </div>
              </td>

              <!-- Colonne Prestataire -->
              <td class="col-half" valign="top" style="width: 50%; padding-left: 12px;">
                <div style="border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px; background-color: #FFFFFF;">
                  <span style="font-size: 11px; font-weight: bold; color: ${primaryCol}; text-transform: uppercase; display: block;">Pour le Prestataire :</span>
                  <span style="font-size: 12px; font-weight: bold; color: #1E293B; display: block; margin-top: 2px;">${prestRep}</span>
                  <span style="font-size: 10px; color: #64748B; display: block;">${prestTitre}</span>
                  <div style="margin-top: 10px; min-height: 55px;">
                    ${cachetPrestUrl ? `<img src="${cachetPrestUrl}" alt="Cachet Prestataire" style="max-height: ${cachetPrestH}px; max-width: ${cachetPrestW}px; opacity: ${cachetPrestOpacity}; vertical-align: middle; margin-right: 6px;" border="0">` : ''}
                    ${sigPrestUrl ? `<img src="${sigPrestUrl}" alt="Signature Prestataire" style="max-height: ${sigPrestH}px; max-width: ${sigPrestW}px; opacity: ${sigPrestOpacity}; vertical-align: middle;" border="0">` : ''}
                  </div>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- PIED DE PAGE FORMEL -->
      <tr>
        <td style="padding: 16px 30px; background-color: #0F172A; color: #94A3B8; font-size: 10px; text-align: center; border-top: 1px solid #334155;">
          ${empNom} · King George Blvd, Surrey, BC V3T 2W1, Canada<br>
          Document légal sécurisé · Validité internationale conforme aux lois canadiennes sur l'immigration
        </td>
      </tr>
    </table>
  </center>
</body>
</html>`;
}

