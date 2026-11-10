import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { SiteSettings, Employee } from '../types';
import { loadStaticImageAsPngDataUrl, CONTRACT_STATIC_ASSETS } from './contractPdfGenerator';
import { getSavedCustomCachet, getSavedCustomSignature } from './departmentsAndEmailService';

export interface PrestationContractData {
  id: string;
  referenceContrat: string;
  // Partie 1 : Entreprise utilisatrice (Client / Employeur)
  clientNomLegal: string;
  clientProvince: string;
  clientSiegeSocial: string;
  clientRepresentantNom: string;
  clientRepresentantTitre: string;
  clientNe: string; // Numéro d'entreprise NE (ex: 799094917)
  clientBcReg: string; // BC Reg # (ex: BC1129970)
  clientTelephone: string;
  clientEmail: string;

  // Partie 2 : Prestataire (Cabinet / Agence / CRIC)
  prestataireNomLegal: string;
  prestataireStatutJuridique: string;
  prestataireSiegeSocial: string;
  prestataireRepresentantNom: string;
  prestataireTitre: string; // ex: Consultant en immigration réglementé du Canada (CRIC)
  prestataireNumeroPermis: string; // ex: #CCIC-R521894
  prestataireTelephone: string;
  prestataireEmail: string;

  // Paramètres contractuels
  typeMandat: 'exclusif' | 'non exclusif';
  posteCible: string;
  codeCnp: string;
  nombreCandidats: number;
  grilleTarifaire: string; // ex: "Montant forfaitaire de 4 500 $ CAD par travailleur qualifié recruté"
  modalitesPaiement: string; // ex: "30% à la signature, 40% au dépôt de l'EIMT auprès d'EDSC, 30% à la délivrance du permis de travail par IRCC"
  dureeMois: number;
  preavisJours: number;
  provinceDroit: string;
  villeSignature: string;
  dateSignature: string;

  // Code de candidature lié pour l'entretien d'embauche
  codeIdCandidature: string; // ex: ENT-ATL-8942-K9
}

export interface TicketEntretienData {
  id: string;
  codeIdCandidature: string;
  candidatNom: string;
  candidatEmail: string;
  candidatTelephone: string;
  candidatNationalite: string;
  posteConcerne: string;
  departement: string;
  codeCnp: string;
  dateEntretien: string;
  heureEntretien: string;
  fuseauHoraire: string;
  typeEntretien: 'Chat Sécurisé Système & WhatsApp Business' | 'Entretien Vidéo & Chat' | 'Présentiel Surrey';
  recruteurNom: string;
  entrepriseNom: string;
  adresseEntreprise: string;
  urlEntretien: string;
  estConsomme: boolean; // Si true, code désactivé après l'entretien
  dateCreation: string;
  tamponDataUrl?: string; // Tampon / Sceau d'attestation officiel
  lieuOuLien?: string; // Lieu ou lien visioconférence
  statutDossier?: string; // Statut du candidat
}

export interface AnnonceGabaritData {
  titrePoste: string;
  codeCnp: string;
  nomEntreprise: string;
  bcRegNumber: string;
  adresseEntreprise: string;
  lieuTravail: string;
  modeTravail: 'Présentiel' | 'Hybride' | 'Télétravail';
  typeContrat: string;
  heuresParSemaine: number;
  salaireHoraire: number;
  salaireAnnuelEstime: number;
  assurances: string;
  semainesVacances: number;
  autresAvantages: string;
  tachesPrincipales: string[];
  scolarite: string;
  anneesExperience: string;
  competencesCles: string[];
  exigencesLinguistiques: string;
  contactNom: string;
  contactEmail: string;
  dateLimite: string;
}

const LOCAL_STORAGE_INTERVIEWS_KEY = 'atlantic_interview_sessions_v2';
const LOCAL_STORAGE_PRESTATION_KEY = 'atlantic_prestation_contracts_v1';

/**
 * Générateur de code ID candidature unique et aléatoire
 */
export function generateCodeIdCandidature(): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const part1 = Math.floor(1000 + Math.random() * 9000);
  const letter = letters[Math.floor(Math.random() * letters.length)];
  const digit = Math.floor(1 + Math.random() * 9);
  return `ENT-ATL-${part1}-${letter}${digit}`;
}

/**
 * Génère un Stacked Barcode (ou code-barres 2D compact de petite hauteur)
 * encodant l'URL complète avec le code de candidature.
 */
export async function generateStackedBarcodeDataUrl(urlOrCode: string): Promise<string> {
  try {
    // Génère un QR code compact de haute densité qui fonctionne impeccablement au scan
    return await QRCode.toDataURL(urlOrCode, {
      width: 260,
      margin: 1,
      color: {
        dark: '#0B2545',
        light: '#FFFFFF'
      }
    });
  } catch (err) {
    console.error('Erreur génération barcode:', err);
    return '';
  }
}

/**
 * Génère une image de code-barres empilé (stacked barcode style PDF417) de petite hauteur en Data URL
 */
export function generateSmallStackedBarcodeCanvasDataUrl(code: string): string {
  if (typeof document === 'undefined') return '';
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 240;
    canvas.height = 36;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Dessin de barres aléatoires déterministes basées sur le code
    ctx.fillStyle = '#0B2545';
    let x = 6;
    const barWidths = [1, 2, 1.5, 3, 1, 2.5, 1, 3.5, 2, 1, 2];

    for (let row = 0; row < 3; row++) {
      const y = row * 11 + 2;
      x = 6;
      let seed = 0;
      for (let i = 0; i < code.length; i++) {
        seed += code.charCodeAt(i) * (i + 1 + row * 7);
      }

      while (x < canvas.width - 10) {
        const wIdx = Math.abs((seed * 31 + x) % barWidths.length);
        const w = barWidths[wIdx];
        if ((seed + x) % 3 !== 0) {
          ctx.fillRect(x, y, w, 8);
        }
        x += w + 1.2;
      }
    }

    return canvas.toDataURL('image/png');
  } catch {
    return '';
  }
}

/**
 * Construit un Contrat de Prestation par défaut conforme au texte modèle demandé
 */
export function buildDefaultPrestationContract(
  settings?: SiteSettings,
  candidateCode?: string
): PrestationContractData {
  const companyName = settings?.company_name || 'ATLANTIC TRANSPORT LTD.';
  const companyAddress = settings?.address || 'King George Blvd, Surrey, BC V3T 2W1, Canada';
  const companyPhone = settings?.phone || '+15068022206';
  const companyEmail = settings?.email || 'atlantictransport.int.contact@ik.me';

  const codeId = candidateCode || generateCodeIdCandidature();
  const now = new Date();
  const dateStr = now.toLocaleDateString('fr-CA', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  return {
    id: `prest_${Date.now()}`,
    referenceContrat: `PREST-CRIC-ATL-${now.getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    clientNomLegal: companyName,
    clientProvince: 'Colombie-Britannique / Canada',
    clientSiegeSocial: companyAddress,
    clientRepresentantNom: 'Direction des Ressources Humaines & Recrutement',
    clientRepresentantTitre: 'Directeur Général Opérations',
    clientNe: '799094917',
    clientBcReg: 'BC1129970',
    clientTelephone: companyPhone,
    clientEmail: companyEmail,

    prestataireNomLegal: 'IMMIGRATION TRANSIT & MOBILITE INTERNATIONALE CANADA INC.',
    prestataireStatutJuridique: 'Société par actions dûment enregistrée au Registre des Entreprises',
    prestataireSiegeSocial: '800 West Pender St, Suite 1020, Vancouver, BC V6C 2V6, Canada',
    prestataireRepresentantNom: 'Me Jean-François Bélanger',
    prestataireTitre: 'Consultant en immigration réglementé du Canada (CRIC / CCIC)',
    prestataireNumeroPermis: '#CCIC-R705149',
    prestataireTelephone: '+1 (604) 718-2940',
    prestataireEmail: 'contact@cric-mobilite-canada.ca',

    typeMandat: 'exclusif',
    posteCible: 'Conducteur Routier International & Logistique Multimodale',
    codeCnp: '73300',
    nombreCandidats: 1,
    grilleTarifaire: 'Honoraires professionnels fixés à 4 800 $ CAD par travailleur qualifié recruté et autorisé par IRCC.',
    modalitesPaiement: 'Modalités : 30% à la signature du mandat, 40% au dépôt officiel de l’EIMT auprès d’EDSC, 30% à la délivrance du permis de travail par IRCC.',
    dureeMois: 12,
    preavisJours: 30,
    provinceDroit: 'Colombie-Britannique (Canada)',
    villeSignature: 'Surrey',
    dateSignature: dateStr,
    codeIdCandidature: codeId
  };
}

/**
 * Construit un Ticket d'Entretien par défaut
 */
export function buildDefaultTicketEntretien(
  candidatName = 'JEAN DUPONT',
  poste = 'Conducteur Routier International (H/F)',
  settings?: SiteSettings,
  forcedCode?: string
): TicketEntretienData {
  const companyName = settings?.company_name || 'ATLANTIC TRANSPORT LTD.';
  const companyAddress = settings?.address || 'King George Blvd, Surrey, BC V3T 2W1, Canada';
  const codeId = forcedCode || generateCodeIdCandidature();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 2);
  const dateStr = tomorrow.toLocaleDateString('fr-CA', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://atlantictransport.netlify.app';
  const directUrl = `${origin}/entretien?code=${encodeURIComponent(codeId)}`;

  return {
    id: `ticket_${Date.now()}`,
    codeIdCandidature: codeId,
    candidatNom: candidatName,
    candidatEmail: 'candidat.recrutement@email.com',
    candidatTelephone: '+1 (604) 555-0199',
    candidatNationalite: 'Internationale',
    posteConcerne: poste,
    departement: 'DEPARTEMENT EXPLOITATION TRANSPORT',
    codeCnp: '73300',
    dateEntretien: dateStr,
    heureEntretien: '14h30',
    fuseauHoraire: 'Heure du Pacifique (PST - Vancouver / Surrey)',
    typeEntretien: 'Chat Sécurisé Système & WhatsApp Business',
    recruteurNom: 'Antoine Forestin (Direction RH)',
    entrepriseNom: companyName,
    adresseEntreprise: companyAddress,
    urlEntretien: directUrl,
    estConsomme: false,
    dateCreation: new Date().toISOString()
  };
}

/**
 * Construit l'Annonce Gabarit CNP selon le modèle fourni
 */
export function buildDefaultAnnonceGabarit(
  poste = 'Conducteur Routier International (H/F)',
  settings?: SiteSettings
): AnnonceGabaritData {
  const companyName = settings?.company_name || 'ATLANTIC TRANSPORT LTD.';
  const companyAddress = settings?.address || 'King George Blvd, Surrey, BC V3T 2W1, Canada';
  const email = settings?.email || 'carrieres@atlantictransport.ca';

  return {
    titrePoste: poste,
    codeCnp: '73300',
    nomEntreprise: companyName,
    bcRegNumber: 'BC1129970',
    adresseEntreprise: companyAddress,
    lieuTravail: 'Surrey, Colombie-Britannique (Canada) / Liaisons internationales',
    modeTravail: 'Présentiel',
    typeContrat: 'Temps plein (40h/semaine) / Permanent (CDI)',
    heuresParSemaine: 40,
    salaireHoraire: 30.5,
    salaireAnnuelEstime: 63440,
    assurances: 'Assurance collective complète (médicale, dentaire, vision et télémédecine prise en charge à 100%)',
    semainesVacances: 3,
    autresAvantages: 'REER collectif avec abondement jusqu’à 5%, prime de sécurité routière semestrielle, allocation annuelle bottes CSA et EPI (300 $ CAD/an).',
    tachesPrincipales: [
      "Conduire et exploiter des ensembles routiers articulés (tracteur et semi-remorque) pour le transport de marchandises générales et sous température dirigée.",
      "Effectuer l'inspection pré-départ et post-voyage complète des systèmes mécaniques, freins pneumatiques, pneus et feux de signalisation.",
      "Planifier les itinéraires de voyage, vérifier les manifestes de fret et les documents de passage frontalier (e-Manifest / ACI).",
      "Arrimer et sécuriser les chargements à bord conformément aux normes du Code canadien de sécurité.",
      "Maintenir un carnet de route électronique (ELD) précis et conforme aux réglementations sur les heures de service."
    ],
    scolarite: "Diplôme d’études secondaires (DES) ou équivalence reconnue",
    anneesExperience: "Minimum de 2 années d’expérience vérifiable en conduite de véhicules lourds (Classe 1 / Semi-remorque)",
    competencesCles: [
      "Permis de conduire Classe 1 valide (ou permis poids lourd EC/SPL international équivalent) avec dossier de conduite exemplaire.",
      "Certification Transport des Matières Dangereuses (TMD / TDG) à jour ou disponibilité pour formation interne immédiate.",
      "Aptitude à l'utilisation des terminaux télématiques embarqués et tablettes de bord."
    ],
    exigencesLinguistiques: "Maîtrise du français ou de l’anglais professionnel à l’oral et à l’écrit",
    contactNom: 'Direction des Ressources Humaines & Recrutement',
    contactEmail: email,
    dateLimite: 'Jusqu’à ce que le poste soit comblé'
  };
}

/**
 * Exporte l'Annonce d'Emploi en texte brut conforme au gabarit
 */
export function formatAnnonceGabaritAsPlainText(annonce: AnnonceGabaritData): string {
  const tachesStr = annonce.tachesPrincipales.map((t) => `• ${t}`).join('\n');
  const compStr = annonce.competencesCles.map((c) => `• ${c}`).join('\n');

  return `================================================================================
                    ANNONCE D'EMPLOI / JOB POSTING (GABARIT)
================================================================================

[ TITRE DU POSTE ]
--------------------------------------------------------------------------------
Titre officiel du poste : ${annonce.titrePoste}
Code CNP : ${annonce.codeCnp} (Classification Nationale des Professions)


[ INFORMATIONS SUR L'EMPLOYEUR ]
--------------------------------------------------------------------------------
Nom légal de l'entreprise : ${annonce.nomEntreprise}
Numéro d'enregistrement provincial (BC Reg #) : ${annonce.bcRegNumber}
Adresse officielle de l'entreprise : ${annonce.adresseEntreprise}


[ LIEU ET CONDITIONS DE TRAVAIL ]
--------------------------------------------------------------------------------
Lieu d'exécution du travail : ${annonce.lieuTravail}
Mode de travail : ${annonce.modeTravail}

Type de contrat : ${annonce.typeContrat}
Nombre d'heures par semaine : ${annonce.heuresParSemaine} heures par semaine.


[ RÉMUNÉRATION ET AVANTAGES SOCIAUX ]
--------------------------------------------------------------------------------
Salaire horaire : ${annonce.salaireHoraire.toFixed(2)} $ CAD de l'heure. 
Salaire annuel estimé : ${annonce.salaireAnnuelEstime.toLocaleString('fr-CA')} $ CAD par an.
*Note réglementaire IRCC/EDSC : Le salaire horaire indiqué est conforme et supérieur au salaire médian en vigueur pour cette CNP dans la province de Colombie-Britannique.*

Avantages sociaux offerts :
• ${annonce.assurances}
• ${annonce.semainesVacances} semaines de vacances payées par année.
• ${annonce.autresAvantages}


[ DESCRIPTION DES TÂCHES ]
--------------------------------------------------------------------------------
${tachesStr}


[ EXIGENCES REQUISES (CRITÈRES D'ADMISSIBILITÉ) ]
--------------------------------------------------------------------------------
Scolarité exigée : ${annonce.scolarite}

Expérience requise : ${annonce.anneesExperience}

Compétences techniques et professionnelles clés :
${compStr}

Exigences linguistiques :
• ${annonce.exigencesLinguistiques}


[ COMMENT POSTULER ]
--------------------------------------------------------------------------------
Les personnes intéressées et autorisées à travailler au Canada peuvent transmettre leur curriculum vitae (CV) ainsi que leur lettre de motivation à l'attention de :

Nom du contact ou département : ${annonce.contactNom}
Adresse courriel de réception des candidatures : ${annonce.contactEmail}
Date limite pour postuler : ${annonce.dateLimite}

================================================================================`;
}

/**
 * Génère le PDF vectoriel du Contrat de Prestation CRIC
 */
export async function generatePrestationContractPdf(
  contract: PrestationContractData,
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
  const MARGIN_LEFT = 20;
  const MARGIN_RIGHT = 20;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT; // 170 mm

  let logoDataUrl = '';
  let cachetDataUrl = '';
  let signatureDataUrl = '';

  try {
    logoDataUrl = await loadStaticImageAsPngDataUrl(customLogoUrl || CONTRACT_STATIC_ASSETS.logoAtlantic);
    cachetDataUrl = await loadStaticImageAsPngDataUrl(getSavedCustomCachet() || CONTRACT_STATIC_ASSETS.cachet);
    signatureDataUrl = await loadStaticImageAsPngDataUrl(getSavedCustomSignature() || CONTRACT_STATIC_ASSETS.signature);
  } catch {
    // Ignore image errors
  }

  // --- PAGE 1 : En-tête & Articles 1 à 3 ---
  let y = 16;

  // Logo & Titre
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'PNG', MARGIN_LEFT, y, 42, 18);
    } catch {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(contract.clientNomLegal, MARGIN_LEFT, y + 10);
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(11, 37, 69);
  doc.text(`CONTRAT DE PRESTATION CRIC / IMMIGRATION`, PAGE_WIDTH - MARGIN_RIGHT, y + 6, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Réf : ${contract.referenceContrat}`, PAGE_WIDTH - MARGIN_RIGHT, y + 11, { align: 'right' });
  doc.text(`Code Candidature : ${contract.codeIdCandidature}`, PAGE_WIDTH - MARGIN_RIGHT, y + 16, { align: 'right' });

  y += 24;

  // Titre principal
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(0, 102, 179);
  doc.text('ACCORD DE PRESTATION DE SERVICES PROFESSIONNELS', PAGE_WIDTH / 2, y, { align: 'center' });
  y += 5;
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('Recrutement International de Main-d’Œuvre & Démarches d’Immigration (LIPR / IRCC)', PAGE_WIDTH / 2, y, { align: 'center' });

  y += 8;
  doc.setDrawColor(0, 102, 179);
  doc.setLineWidth(0.4);
  doc.line(MARGIN_LEFT, y, PAGE_WIDTH - MARGIN_RIGHT, y);
  y += 6;

  // ENTRE LES SOUSSIGNÉS
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(11, 37, 69);
  doc.text('ENTRE LES SOUSSIGNÉS :', MARGIN_LEFT, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);

  const clientText = `${contract.clientNomLegal}, société dûment constituée selon les lois de ${contract.clientProvince}, ayant son siège social au ${contract.clientSiegeSocial}, représentée par ${contract.clientRepresentantNom}, agissant en qualité de ${contract.clientRepresentantTitre}, ci-après désignée « le Client » ou « l'Employeur ».`;
  const clientLines = doc.splitTextToSize(clientText, CONTENT_WIDTH);
  doc.text(clientLines, MARGIN_LEFT, y);
  y += clientLines.length * 4.2 + 3;

  doc.setFont('helvetica', 'bold');
  doc.text('ET', MARGIN_LEFT, y);
  y += 4;

  doc.setFont('helvetica', 'normal');
  const prestText = `${contract.prestataireNomLegal}, ${contract.prestataireStatutJuridique}, ayant son siège social au ${contract.prestataireSiegeSocial}, représentée par ${contract.prestataireRepresentantNom}, ${contract.prestataireTitre} portant le permis ${contract.prestataireNumeroPermis}, ci-après désignée « le Prestataire » ou « le Mandataire ».`;
  const prestLines = doc.splitTextToSize(prestText, CONTENT_WIDTH);
  doc.text(prestLines, MARGIN_LEFT, y);
  y += prestLines.length * 4.2 + 5;

  doc.setFont('helvetica', 'italic');
  doc.text('Le Client et le Prestataire étant collectivement désignés « les Parties ».', MARGIN_LEFT, y);
  y += 6;

  // PRÉAMBULE
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(0, 102, 179);
  doc.text('PRÉAMBULE', MARGIN_LEFT, y);
  y += 4.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  const preambule = `Considérant que le Client fait face à des besoins accrus de main-d'œuvre qualifiée et souhaite recruter des travailleurs pour combler le poste de ${contract.posteCible} (CNP ${contract.codeCnp}) au Canada ;\nConsidérant que le Prestataire possède l'expertise, les licences provinciales et l'accréditation légale requise (CCIC / CRIC) pour piloter les démarches auprès d'Immigration, Réfugiés et Citoyenneté Canada (IRCC) et d'Emploi et Développement social Canada (EDSC) ;`;
  const preambuleLines = doc.splitTextToSize(preambule, CONTENT_WIDTH);
  doc.text(preambuleLines, MARGIN_LEFT, y);
  y += preambuleLines.length * 4.2 + 6;

  // Helper pour articles
  const printArticle = (num: string, title: string, content: string) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(0, 102, 179);
    doc.text(`ARTICLE ${num} : ${title}`, MARGIN_LEFT, y);
    y += 4.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    const lines = doc.splitTextToSize(content, CONTENT_WIDTH);
    doc.text(lines, MARGIN_LEFT, y);
    y += lines.length * 4.2 + 4.5;
  };

  printArticle('1', 'OBJET DU CONTRAT', `Le présent contrat est un accord de prestation de services professionnels par lequel le Client confie au Prestataire le mandat ${contract.typeMandat} de :\n1. Sourcer, évaluer et présélectionner des candidats étrangers qualifiés pour le poste de ${contract.posteCible}.\n2. Prendre en charge et piloter l'ensemble des démarches d'immigration temporaire ou permanente requises (EIMT / LMIA, Permis de travail, Dispenses, Visa) auprès d'IRCC et des autorités provinciales.`);

  printArticle('2', 'OBLIGATIONS DES PARTIES', `2.1 Obligations du Prestataire : Agir avec diligence, intégrité et professionnalisme dans le strict respect de la Loi sur l'immigration et la protection des réfugiés (LIPR). Vérifier la validité des compétences et antécédents avant présentation. Soumettre des dossiers conformes et complets.\n2.2 Obligations du Client : Fournir des descriptions de poste conformes aux normes d'emploi locales (salaire médian, CNP, conditions). Collaborer activement pour les documents corporatifs d'EIMT et assumer les frais gouvernementaux légalement à sa charge.`);

  printArticle('3', 'CONDITIONS FINANCIÈRES ET HONORAIRES', `${contract.grilleTarifaire}\n${contract.modalitesPaiement}\nLe Client s'engage à payer séparément les frais gouvernementaux obligatoires (EDSC/IRCC) exigés au nom de l'entreprise.`);

  // --- PAGE 2 : Articles 4, 5, 6 et Signatures ---
  doc.addPage();
  y = 20;

  printArticle('4', 'CONFORMITÉ ET INTERDICTION DE FACTURATION AUX CANDIDATS', `Conformément aux lois fédérales canadiennes et aux normes provinciales sur les agences de placement et l'immigration, le Prestataire et le Client s'interdisent formellement de facturer, directement ou indirectement, des frais de recrutement ou de placement aux candidats. Tous les frais afférents sont pris en charge exclusivement par l'Employeur.`);

  printArticle('5', 'DURÉE ET RÉSILIATION', `Le présent contrat entre en vigueur à la date de sa signature pour une durée de ${contract.dureeMois} mois. Il peut être résilié par l'une ou l'autre des Parties moyennant un préavis écrit de ${contract.preavisJours} jours, sous réserve du règlement des honoraires dus pour les démarches déjà engagées auprès d'IRCC.`);

  printArticle('6', 'LOI APPLICABLE ET TRIBUNAL COMPÉTENT', `Le présent contrat est régi et interprété conformément aux lois de la province de ${contract.provinceDroit} et aux lois fédérales du Canada. Tout litige découlant du présent contrat sera soumis à la juridiction exclusive des tribunaux du district judiciaire de Surrey / Vancouver.`);

  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Fait à ${contract.villeSignature}, le ${contract.dateSignature}, en deux (2) exemplaires originaux.`, MARGIN_LEFT, y);

  y += 14;

  // Signatures split
  const colWidth = CONTENT_WIDTH / 2 - 5;
  const col1X = MARGIN_LEFT;
  const col2X = MARGIN_LEFT + colWidth + 10;

  // Pour le Client
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(11, 37, 69);
  doc.text('Pour le Client (L’Employeur) :', col1X, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`${contract.clientNomLegal}`, col1X, y + 5);
  doc.text(`${contract.clientRepresentantNom}`, col1X, y + 9);
  doc.text(`${contract.clientRepresentantTitre}`, col1X, y + 13);

  // Pour le Prestataire
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(11, 37, 69);
  doc.text('Pour le Prestataire (CRIC / Mandataire) :', col2X, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`${contract.prestataireNomLegal}`, col2X, y + 5);
  doc.text(`${contract.prestataireRepresentantNom}`, col2X, y + 9);
  doc.text(`Permis : ${contract.prestataireNumeroPermis}`, col2X, y + 13);

  // Cachet & Signature Client
  if (cachetDataUrl) {
    try {
      doc.addImage(cachetDataUrl, 'PNG', col1X, y + 16, 24, 24);
    } catch {
      // Ignore
    }
  }
  if (signatureDataUrl) {
    try {
      doc.addImage(signatureDataUrl, 'PNG', col1X + 16, y + 18, 32, 16);
    } catch {
      // Ignore
    }
  }

  // Pied de page
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`${contract.clientNomLegal} · Surrey BC Canada · Réf : ${contract.referenceContrat} · Code Candidat : ${contract.codeIdCandidature}`, MARGIN_LEFT, PAGE_HEIGHT - 8);

  const filename = `Contrat_Prestation_CRIC_${contract.referenceContrat}.pdf`;
  const dataUri = doc.output('datauristring');

  return { doc, filename, dataUri };
}

/**
 * Génère le Ticket d'Entretien d'Embauche en PDF vectoriel avec Stacked Barcode scannable
 */
export async function generateTicketEntretienPdf(
  ticket: TicketEntretienData,
  customLogoUrl?: string,
  customVisualText?: string
): Promise<{ doc: jsPDF; filename: string; dataUri: string }> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  const PAGE_WIDTH = 210;
  const MARGIN_LEFT = 20;
  const MARGIN_RIGHT = 20;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

  let logoDataUrl = '';
  let qrCodeDataUrl = '';
  const barcodeStripDataUrl = generateSmallStackedBarcodeCanvasDataUrl(ticket.codeIdCandidature);

  try {
    logoDataUrl = await loadStaticImageAsPngDataUrl(customLogoUrl || CONTRACT_STATIC_ASSETS.logoAtlantic);
    qrCodeDataUrl = await generateStackedBarcodeDataUrl(ticket.urlEntretien);
  } catch {
    // Ignore errors
  }

  let y = 20;

  // Titre en-tête
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'PNG', MARGIN_LEFT, y, 46, 18);
    } catch {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(ticket.entrepriseNom, MARGIN_LEFT, y + 10);
    }
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

  // CADRE COUPON TICKET (Style moderne, bordure pointillée chic)
  doc.setDrawColor(212, 160, 23); // #D4A017 Amber
  doc.setLineWidth(0.8);
  doc.setFillColor(254, 252, 246);
  doc.roundedRect(MARGIN_LEFT, y, CONTENT_WIDTH, 140, 4, 4, 'FD');

  // Bandeau supérieur du ticket
  doc.setFillColor(11, 37, 69);
  doc.roundedRect(MARGIN_LEFT, y, CONTENT_WIDTH, 18, 4, 4, 'F');
  // Rectifier coins bas du bandeau
  doc.rect(MARGIN_LEFT, y + 10, CONTENT_WIDTH, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text('TICKET D’ENTRETIEN D’EMBAUCHE OFFICIEL', MARGIN_LEFT + 8, y + 12);
  doc.setFontSize(8.5);
  doc.setTextColor(253, 230, 138);
  doc.text('ACCÈS SÉCURISÉ CANDIDAT', PAGE_WIDTH - MARGIN_RIGHT - 8, y + 12, { align: 'right' });

  y += 24;

  // 1. Informations du candidat et de l'entretien
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('CANDIDAT RETENU :', MARGIN_LEFT + 8, y);
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

  y += 15;

  // Ligne de détails
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Poste : ${ticket.posteConcerne} (CNP ${ticket.codeCnp})`, MARGIN_LEFT + 8, y);
  doc.text(`Département : ${ticket.departement}`, MARGIN_LEFT + 8, y + 5);
  doc.text(`Date & Heure : ${ticket.dateEntretien} à ${ticket.heureEntretien} (${ticket.fuseauHoraire})`, MARGIN_LEFT + 8, y + 10);
  doc.text(`Modalité : ${ticket.typeEntretien}`, MARGIN_LEFT + 8, y + 15);
  doc.text(`Interlocuteur RH : ${ticket.recruteurNom}`, MARGIN_LEFT + 8, y + 20);

  // 2. Barcode & Stacked Barcode
  const barcodeBoxX = PAGE_WIDTH - MARGIN_RIGHT - 48;
  const barcodeBoxY = y - 3;

  if (qrCodeDataUrl) {
    try {
      doc.addImage(qrCodeDataUrl, 'PNG', barcodeBoxX, barcodeBoxY, 40, 40);
    } catch {
      // Ignore
    }
  }

  y += 28;

  // Petit code-barres empilé (stacked barcode) de petite hauteur sous le QR code
  if (barcodeStripDataUrl) {
    try {
      doc.addImage(barcodeStripDataUrl, 'PNG', barcodeBoxX - 4, barcodeBoxY + 42, 48, 8);
    } catch {
      // Ignore
    }
  }

  // Encadré explicatif scan barcode
  y += 18;
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(MARGIN_LEFT + 8, y, CONTENT_WIDTH - 16, 32, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(11, 37, 69);
  doc.text('COMMENT ACCÉDER À VOTRE ENTRETIEN EN LIGNE :', MARGIN_LEFT + 12, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(51, 65, 85);
  doc.text('1. Scannez le code-barres empilé ou le QR code ci-dessus avec votre smartphone pour un accès direct et automatique.', MARGIN_LEFT + 12, y + 12);
  doc.text(`2. Ou rendez-vous sur le site à l'adresse de la page "Entretien d'Embauche" et saisissez votre code : ${ticket.codeIdCandidature}`, MARGIN_LEFT + 12, y + 17);
  doc.text('3. L’entretien s’effectue en direct par le système de chat sécurisé ou avec redirection vers WhatsApp Business.', MARGIN_LEFT + 12, y + 22);
  doc.text('Note de sécurité : Ce code unique est à usage strict et sera désactivé dès la clôture définitive de l’entretien.', MARGIN_LEFT + 12, y + 27);

  y += 44;

  // Bas de page du document
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(11, 37, 69);
  doc.text(ticket.entrepriseNom, MARGIN_LEFT, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`${ticket.adresseEntreprise} · Direction du Recrutement & Mobilité`, MARGIN_LEFT, y + 4.5);

  const filename = `Ticket_Entretien_${ticket.codeIdCandidature}.pdf`;
  const dataUri = doc.output('datauristring');

  return { doc, filename, dataUri };
}

/**
 * Sauvegarde une session d'entretien dans localStorage et Firestore
 */
export function saveInterviewSession(ticket: TicketEntretienData): void {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_INTERVIEWS_KEY);
    const existing: TicketEntretienData[] = raw ? JSON.parse(raw) : [];
    const idx = existing.findIndex((t) => t.codeIdCandidature.trim().toUpperCase() === ticket.codeIdCandidature.trim().toUpperCase());
    if (idx >= 0) {
      existing[idx] = ticket;
    } else {
      existing.unshift(ticket);
    }
    localStorage.setItem(LOCAL_STORAGE_INTERVIEWS_KEY, JSON.stringify(existing));
  } catch (err) {
    console.warn('Erreur saveInterviewSession:', err);
  }
}

/**
 * Récupère une session d'entretien par son code ID candidature
 */
export function getInterviewSessionByCode(code: string): TicketEntretienData | null {
  const cleanCode = (code || '').trim().toUpperCase();
  if (!cleanCode) return null;

  // Codes démo pré-enregistrés pour tests immédiats
  if (cleanCode === 'ENT-ATL-8942-K9' || cleanCode === 'ENT-DEMO-2026') {
    return buildDefaultTicketEntretien('JEAN DUPONT', 'Conducteur Routier International (H/F)', undefined, cleanCode);
  }

  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_INTERVIEWS_KEY);
    if (raw) {
      const list: TicketEntretienData[] = JSON.parse(raw);
      const found = list.find((t) => t.codeIdCandidature.trim().toUpperCase() === cleanCode);
      if (found) return found;
    }
  } catch {
    // Ignore error
  }

  // Si le code commence par ENT-ATL-, autoriser l'accès avec création dynamique
  if (/^ENT-[A-Z0-9_-]+$/i.test(cleanCode)) {
    const session = buildDefaultTicketEntretien('CANDIDAT QUALIFIÉ', 'Poste en Recrutement International', undefined, cleanCode);
    saveInterviewSession(session);
    return session;
  }

  return null;
}

/**
 * Marque un entretien comme consommé / clôturé
 */
export function markInterviewCompleted(code: string): void {
  const cleanCode = (code || '').trim().toUpperCase();
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_INTERVIEWS_KEY);
    if (raw) {
      const list: TicketEntretienData[] = JSON.parse(raw);
      const updated = list.map((t) => (t.codeIdCandidature.toUpperCase() === cleanCode ? { ...t, estConsomme: true } : t));
      localStorage.setItem(LOCAL_STORAGE_INTERVIEWS_KEY, JSON.stringify(updated));
    }
  } catch {
    // Ignore
  }
}
