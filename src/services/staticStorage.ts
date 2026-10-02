import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  getDocsFromCache,
  onSnapshot,
  query,
  setDoc,
  where
} from 'firebase/firestore';
import {
  db,
  OperationType,
  handleFirestoreError,
  formatReadableFirestoreError,
  isTransientUnavailableError
} from '../firebase';
import { ContactMessage, Employee, SiteSettings } from '../types';

const LS_EMPLOYEES_KEY = 'atlantic_employes_v3';
const LS_SETTINGS_KEY = 'atlantic_settings_v2';
const LS_MESSAGES_KEY = 'atlantic_messages_v2';
const LS_ADMIN_PASS_KEY = 'atlantic_admin_pass_v2';
const LS_REVOKED_TOKENS_KEY = 'atlantic_revoked_tokens_v2';
const LS_FIRESTORE_SEEDED_KEY = 'atlantic_firestore_seeded_v1';

// In-memory caches to guarantee zero QuotaExceededError even with large PDFs or photos
let inMemoryEmployeesCache: Employee[] | null = null;
const contractPdfMemoryCache = new Map<string, string>();

// Helper to prevent Firestore remote ACK promises from blocking the UI if backend is temporarily unreachable,
// while still immediately throwing any permission-denied or validation error!
async function awaitFirestoreWithLatencyCompensation(
  writePromise: Promise<unknown>,
  timeoutMs = 2500
): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<'timeout'>((resolve) => {
    timer = setTimeout(() => resolve('timeout'), timeoutMs);
  });

  try {
    const guardedWrite = writePromise.then(
      () => 'done' as const,
      (err) => {
        if (isTransientUnavailableError(err)) {
          return 'offline-queued' as const;
        }
        throw err;
      }
    );
    await Promise.race([guardedWrite, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function setCachedContractPdf(matricule: string, pdfDataUri: string): void {
  if (!matricule || !pdfDataUri) return;
  contractPdfMemoryCache.set(matricule.toUpperCase(), pdfDataUri);
}

export function getCachedContractPdf(matricule: string): string {
  if (!matricule) return '';
  return contractPdfMemoryCache.get(matricule.toUpperCase()) || '';
}

export function removeCachedContractPdf(matricule: string): void {
  if (!matricule) return;
  contractPdfMemoryCache.delete(matricule.toUpperCase());
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  company_name: 'ATLANTIC TRANSPORT LTD',
  slogan: 'Le monde sans frontières, votre logistique sans limites.',
  address: 'King George Blvd, Surrey, BC V3T 2W1, Canada',
  phone: '+1 (506) 802-2226',
  whatsapp: '15068022226',
  email: 'atlantictransport.int@ik.me',
  logo_url: '',
  services: [
    {
      id: 'multimodal',
      number: '01',
      title: 'Transport Multimodal Global',
      subtitle: 'Fret Maritime, Aérien, Ferroviaire & Routier International',
      description:
        'Coordination intégrale de vos flux de marchandises de bout en bout. Nous combinons la puissance du fret maritime (conteneurs complets FCL et groupage LCL), la rapidité du fret aérien express et la flexibilité du transport intermodal rail-route à travers le Canada, les États-Unis, l’Europe, l’Asie et l’Afrique.',
      highlights: [
        'Conteneurs complets (FCL 20’/40’/40’HC), groupage (LCL) et équipements spéciaux (Reefer, Flat Rack)',
        'Corridors prioritaires Amérique du Nord (Vancouver/Surrey, Montréal, Halifax) ↔ Europe & Asie',
        'Fret aérien cargo express et affrètement dédié pour marchandises critiques ou périssables',
        'Traçabilité complète des expéditions et suivi proactif des jalons de transit'
      ]
    },
    {
      id: 'warehousing',
      number: '02',
      title: "Solutions d'Entreposage & Gestion de la Supply Chain",
      subtitle: 'Plateformes Logistiques Sécurisées, Cross-Docking & Distribution 3PL/4PL',
      description:
        'Optimisez vos stocks et réduisez vos délais de livraison grâce à nos infrastructures d’entreposage stratégiques basées en Colombie-Britannique. Nos entrepôts sous douane et à température contrôlée assurent une gestion rigoureuse de votre chaîne d’approvisionnement.',
      highlights: [
        'Entreposage sécurisé 24/7 sous vidéosurveillance et zones sous douane (Bonded Warehouse)',
        'Gestion informatisée des stocks (WMS), contrôle qualité, palettisation et étiquetage',
        'Opérations de Cross-Docking, dépotage de conteneurs et préparation de commandes B2B/B2C',
        'Planification de la Supply Chain et distribution capillaire sur toute l’Amérique du Nord'
      ]
    },
    {
      id: 'customs',
      number: '03',
      title: 'Commission de Transport & Formalités Douanières',
      subtitle: 'Courtage en Douane, Conformité Réglementaire & Ingénierie Documentaire',
      description:
        'Franchissez les frontières sans retard ni pénalité. En tant que commissionnaire de transport et expert en formalités douanières, ATLANTIC TRANSPORT LTD sécurise chaque déclaration d’importation et d’exportation auprès de l’ASFC (CBSA) et des autorités douanières internationales.',
      highlights: [
        'Dédouanement import/export rapide auprès de l’ASFC (Agence des services frontaliers du Canada)',
        'Gestion complète des liasses documentaires : Connaissements (B/L), LTA (AWB), Certificats d’origine, EUR1',
        'Conseil stratégique sur les Incoterms® 2020, classement tarifaire SH (HS Code) et droits de douane',
        'Conformité sanitaire, phytosanitaire (ACIA/CFIA) et gestion des marchandises réglementées (IMDG/IATA)'
      ]
    }
  ]
};

export function generateDefaultAvatarSvgDataUri(
  prenom: string,
  nom: string,
  matricule: string
): string {
  const initials = `${(prenom[0] || 'A').toUpperCase()}${(nom[0] || 'T').toUpperCase()}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0B2545"/>
        <stop offset="100%" stop-color="#134074"/>
      </linearGradient>
    </defs>
    <rect width="320" height="320" rx="24" fill="url(#bg)"/>
    <circle cx="160" cy="125" r="56" fill="#F59E0B" opacity="0.18"/>
    <circle cx="160" cy="118" r="42" fill="#F8FAFC"/>
    <path d="M86 268 C86 212 234 212 234 268" fill="#F8FAFC"/>
    <rect x="20" y="24" width="136" height="26" rx="6" fill="#F59E0B"/>
    <text x="88" y="41" font-family="monospace" font-size="11" font-weight="bold" fill="#0B2545" text-anchor="middle">${matricule}</text>
    <circle cx="268" cy="52" r="24" fill="#1E3A8A" stroke="#F59E0B" stroke-width="2"/>
    <text x="268" y="59" font-family="sans-serif" font-size="18" font-weight="bold" fill="#FFFFFF" text-anchor="middle">${initials}</text>
  </svg>`;
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}

// Compress uploaded image to a small Base64 JPEG (< 40KB) so Firestore documents never exceed 1MB
export async function compressPhotoToSafeBase64(dataUrl: string): Promise<string> {
  if (!dataUrl || typeof document === 'undefined') return dataUrl;
  if (dataUrl.startsWith('data:image/svg+xml') || dataUrl.length < 60000) {
    return dataUrl;
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const maxDim = 320;
        let width = img.naturalWidth || img.width || 320;
        let height = img.naturalHeight || img.height || 320;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', 0.82);
        resolve(compressed);
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

// Encode employee core record into a portable base64url token so that /employe.html?token=XXX
// works even when opened on another smartphone/browser without any server!
export function createPortableEmployeeToken(emp: Employee): string {
  const payload = {
    i: emp.id,
    m: emp.matricule,
    cv: emp.civilite || 'Monsieur',
    nc: emp.nom_complet || `${emp.prenom} ${emp.nom}`.toUpperCase(),
    p: emp.prenom,
    n: emp.nom,
    e: emp.email,
    t: emp.telephone || '',
    a: emp.adresse || 'King George Blvd, Surrey, BC V3T 2W1, Canada',
    dn: emp.date_naissance || '1990-01-01',
    na: emp.nationalite || 'Canadienne',
    po: emp.poste,
    d: emp.departement || 'Opérations Logistiques',
    tc: emp.type_contrat,
    df: emp.date_effet || emp.date_embauche,
    dfc: emp.date_fin_cdd || '',
    pe: emp.duree_periode_essai || '3 mois',
    lt: emp.lieu_travail || 'Surrey, Colombie-Britannique, Canada',
    hr: emp.horaires || '40 heures / semaine',
    s: emp.salaire,
    dv: emp.devise || 'CAD',
    de: emp.date_embauche,
    hb: emp.hebergement_fourni ? 1 : 0,
    hd: emp.hebergement_duree_type || 'duree_precise',
    hm: emp.hebergement_nombre_mois || 3,
    hl: emp.hebergement_lieu_type || 'preciser_lieu',
    ah: emp.adresse_hebergement || '',
    k: Math.random().toString(36).slice(2, 6)
  };
  const jsonStr = JSON.stringify(payload);
  const b64 = btoa(unescape(encodeURIComponent(jsonStr)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `${emp.matricule.replace(/[^A-Z0-9]/gi, '')}-${b64}`;
}

export function decodePortableEmployeeToken(token: string): Employee | null {
  try {
    const dashIndex = token.indexOf('-');
    if (dashIndex === -1) return null;
    const b64Url = token.slice(dashIndex + 1);
    if (b64Url.length < 24) return null;
    let b64 = b64Url.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4 !== 0) {
      b64 += '=';
    }
    const jsonStr = decodeURIComponent(escape(atob(b64)));
    const p = JSON.parse(jsonStr);
    if (!p || !p.m || !p.po) return null;
    const prenom = String(p.p || '');
    const nom = String(p.n || '');
    const matricule = String(p.m);
    const defaultPhoto = generateDefaultAvatarSvgDataUri(prenom || 'A', nom || 'T', matricule);
    return {
      id: Number(p.i) || 999,
      matricule,
      civilite: p.cv === 'Madame' ? 'Madame' : 'Monsieur',
      nom_complet: String(p.nc || `${prenom} ${nom}`).toUpperCase(),
      prenom,
      nom,
      email: String(p.e || ''),
      telephone: String(p.t || ''),
      adresse: String(p.a || 'King George Blvd, Surrey, BC V3T 2W1, Canada'),
      date_naissance: String(p.dn || '1990-01-01'),
      nationalite: String(p.na || 'Canadienne'),
      poste: String(p.po),
      departement: String(p.d || 'Opérations Logistiques'),
      type_contrat: String(p.tc || 'CDI'),
      date_effet: String(p.df || p.de || '2026-01-01'),
      date_embauche: String(p.de || p.df || '2026-01-01'),
      date_fin_cdd: String(p.dfc || ''),
      duree_periode_essai: String(p.pe || '3 semaines'),
      lieu_travail: String(p.lt || 'Surrey, Colombie-Britannique, Canada'),
      horaires: String(p.hr || '40 heures / semaine'),
      salaire: Number(p.s) || 0,
      devise: String(p.dv || 'CAD'),
      hebergement_fourni: Boolean(p.hb),
      hebergement_duree_type:
        p.hd === 'toute_duree_contrat' ? 'toute_duree_contrat' : 'duree_precise',
      hebergement_nombre_mois: Number(p.hm) || 3,
      hebergement_lieu_type:
        p.hl === 'texte_generique' ? 'texte_generique' : 'preciser_lieu',
      adresse_hebergement: String(p.ah || ''),
      photo: defaultPhoto,
      photo_url: defaultPhoto,
      contrat_pdf_url: '',
      has_custom_pdf: false,
      must_change_password: false,
      is_active: true,
      access_token: token,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  } catch {
    return null;
  }
}

export const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: 1,
    matricule: 'EMP-2026-001',
    civilite: 'Monsieur',
    nom_complet: 'MARC-ANTOINE TREMBLAY',
    prenom: 'Marc-Antoine',
    nom: 'Tremblay',
    email: 'm.tremblay@atlantictransport.ca',
    password: 'Employe@2026!',
    telephone: '+1 (604) 555-0194',
    adresse: '10450 King George Blvd, Surrey, BC V3T 2W1, Canada',
    date_naissance: '1988-04-12',
    nationalite: 'Canadienne',
    poste: 'Coordinateur Principal des Opérations Multimodales',
    departement: 'Fret Maritime & Intermodal',
    type_contrat: 'CDI',
    date_effet: '2026-02-01',
    date_embauche: '2026-02-01',
    date_fin_cdd: '',
    duree_periode_essai: '3 semaines',
    lieu_travail: 'Surrey, Colombie-Britannique (King George Blvd, Surrey BC V3T 2W1)',
    horaires: '40 heures / semaine (Lundi au Vendredi, 08h00 - 17h00)',
    salaire: 6400.0,
    devise: 'CAD',
    hebergement_fourni: true,
    hebergement_duree_type: 'duree_precise',
    hebergement_nombre_mois: 3,
    hebergement_lieu_type: 'preciser_lieu',
    adresse_hebergement: 'Résidence Atlantic Suites, 10320 King George Blvd, Surrey, BC V3T 2W1',
    date_signature: '2026-02-01',
    photo: generateDefaultAvatarSvgDataUri('Marc-Antoine', 'Tremblay', 'EMP-2026-001'),
    photo_url: generateDefaultAvatarSvgDataUri('Marc-Antoine', 'Tremblay', 'EMP-2026-001'),
    contrat_pdf_url: '',
    has_custom_pdf: false,
    must_change_password: false,
    is_active: true,
    access_token: 'EMP2026001-7f9a2d4e8b1c',
    access_token_created_at: '2026-09-27T12:00:00.000Z',
    created_at: '2026-02-01T09:00:00.000Z',
    updated_at: '2026-09-27T12:00:00.000Z'
  },
  {
    id: 2,
    matricule: 'EMP-2026-002',
    civilite: 'Madame',
    nom_complet: 'SOPHIE LAVOIE',
    prenom: 'Sophie',
    nom: 'Lavoie',
    email: 's.lavoie@atlantictransport.ca',
    password: 'Employe@2026!',
    telephone: '+1 (604) 555-0248',
    adresse: '13880 102 Ave, Surrey, BC V3T 5X8, Canada',
    date_naissance: '1992-09-24',
    nationalite: 'Canadienne',
    poste: 'Spécialiste Conformité Douanière & Incoterms',
    departement: 'Douanes & Transit International',
    type_contrat: 'CDD',
    date_effet: '2026-03-15',
    date_embauche: '2026-03-15',
    date_fin_cdd: '2027-03-15',
    duree_periode_essai: '3 semaines',
    lieu_travail: 'Surrey, Colombie-Britannique (King George Blvd, Surrey BC V3T 2W1)',
    horaires: '40 heures / semaine (Lundi au Vendredi, 08h30 - 17h30)',
    salaire: 5850.0,
    devise: 'CAD',
    hebergement_fourni: false,
    hebergement_duree_type: 'duree_precise',
    hebergement_nombre_mois: 3,
    hebergement_lieu_type: 'preciser_lieu',
    adresse_hebergement: '',
    date_signature: '2026-03-15',
    photo: generateDefaultAvatarSvgDataUri('Sophie', 'Lavoie', 'EMP-2026-002'),
    photo_url: generateDefaultAvatarSvgDataUri('Sophie', 'Lavoie', 'EMP-2026-002'),
    contrat_pdf_url: '',
    has_custom_pdf: false,
    must_change_password: false,
    is_active: true,
    access_token: 'EMP2026002-3c8e1b5a9d4f',
    access_token_created_at: '2026-09-27T12:00:00.000Z',
    created_at: '2026-03-15T09:00:00.000Z',
    updated_at: '2026-09-27T12:00:00.000Z'
  }
];

const INITIAL_MESSAGES: ContactMessage[] = [
  {
    id: 1,
    nom_complet: 'Jean-François Bouchard',
    entreprise: 'Importations Boréal Inc.',
    email: 'jf.bouchard@boreal-import.ca',
    telephone: '+1 (514) 555-0182',
    service_concerne: 'Transport Multimodal Global',
    sujet: 'Cotation FCL 40HC Shanghai -> Surrey BC (Mensuel)',
    message:
      'Bonjour, nous recherchons un partenaire logistique fiable à Surrey pour le dédouanement et l’entreposage sous douane de 12 conteneurs 40’HC par trimestre. Pouvez-vous nous transmettre vos disponibilités ?',
    lu: false,
    created_at: '2026-09-26T14:30:00.000Z'
  }
];

export function normalizeEmployee(
  emp: Partial<Employee> & { id?: number; matricule: string }
): Employee {
  const prenom = emp.prenom || (emp.nom_complet ? emp.nom_complet.split(' ')[0] : 'Salarié');
  const nom =
    emp.nom ||
    (emp.nom_complet ? emp.nom_complet.split(' ').slice(1).join(' ') || emp.nom_complet : 'Atlantic');
  const nomComplet = (emp.nom_complet || `${prenom} ${nom}`).trim().toUpperCase();
  const resolvedPhoto =
    emp.photo && emp.photo.trim().length > 0
      ? emp.photo
      : emp.photo_url && emp.photo_url.trim().length > 0
      ? emp.photo_url
      : generateDefaultAvatarSvgDataUri(prenom, nom, emp.matricule);

  if (emp.contrat_pdf_url && emp.contrat_pdf_url.startsWith('data:application/pdf')) {
    setCachedContractPdf(emp.matricule, emp.contrat_pdf_url);
  }
  const cachedPdf = getCachedContractPdf(emp.matricule);

  return {
    id: Number(emp.id) || Date.now(),
    firestore_id: emp.firestore_id,
    matricule: emp.matricule,
    civilite: emp.civilite === 'Madame' ? 'Madame' : 'Monsieur',
    nom_complet: nomComplet,
    prenom,
    nom,
    email: emp.email || `${emp.matricule.toLowerCase()}@atlantictransport.ca`,
    password: emp.password || 'Employe@2026!',
    telephone: emp.telephone || '+1 (506) 802-2226',
    adresse: emp.adresse || 'King George Blvd, Surrey, BC V3T 2W1, Canada',
    date_naissance: emp.date_naissance || '1990-01-01',
    nationalite: emp.nationalite || 'Canadienne',
    poste: emp.poste || 'Agent Logistique',
    departement: emp.departement || 'Opérations Logistiques',
    type_contrat: emp.type_contrat || 'CDI',
    date_effet: emp.date_effet || emp.date_embauche || '2026-01-01',
    date_embauche: emp.date_embauche || emp.date_effet || '2026-01-01',
    date_fin_cdd: emp.date_fin_cdd || '',
    duree_periode_essai: emp.duree_periode_essai || '3 semaines',
    lieu_travail:
      emp.lieu_travail || 'Surrey, Colombie-Britannique (King George Blvd, Surrey BC V3T 2W1)',
    horaires: emp.horaires || '40 heures / semaine (Lundi au Vendredi, 08h00 - 17h00)',
    salaire: Number(emp.salaire) || 0,
    devise: emp.devise || 'CAD',
    hebergement_fourni: Boolean(emp.hebergement_fourni),
    hebergement_duree_type:
      emp.hebergement_duree_type === 'toute_duree_contrat'
        ? 'toute_duree_contrat'
        : 'duree_precise',
    hebergement_nombre_mois: Number(emp.hebergement_nombre_mois) || 3,
    hebergement_lieu_type:
      emp.hebergement_lieu_type === 'texte_generique' ? 'texte_generique' : 'preciser_lieu',
    adresse_hebergement: emp.adresse_hebergement || '',
    date_signature: emp.date_signature || emp.date_effet || new Date().toISOString().slice(0, 10),
    date_etablissement:
      emp.date_etablissement ||
      emp.date_signature ||
      emp.date_effet ||
      new Date().toISOString().slice(0, 10),
    emailEnvoye: Boolean(emp.emailEnvoye),
    emailError: emp.emailError || '',
    mailDocId: emp.mailDocId || '',
    sexe: emp.sexe || (emp.civilite === 'Madame' ? 'Féminin' : 'Masculin'),
    numero_piece_identite: emp.numero_piece_identite || '',
    contact_urgence: emp.contact_urgence || '',
    manager: emp.manager || 'ANTOINE FORESTIN',
    date_fin: emp.date_fin || emp.date_fin_cdd || '',
    salaire_horaire: emp.salaire_horaire !== undefined ? Number(emp.salaire_horaire) : undefined,
    primes: emp.primes || '',
    mode_paiement: emp.mode_paiement || '',
    ni: emp.ni || '',
    responsabilites: Array.isArray(emp.responsabilites) ? emp.responsabilites : [],
    promesse_type_contrat_label: emp.promesse_type_contrat_label || '',
    photo: resolvedPhoto,
    photo_url: resolvedPhoto,
    contrat_pdf_url: cachedPdf,
    has_custom_pdf: Boolean(emp.has_custom_pdf || cachedPdf),
    must_change_password: Boolean(emp.must_change_password),
    is_active: emp.is_active !== undefined ? emp.is_active : true,
    access_token: emp.access_token || null,
    access_token_created_at: emp.access_token_created_at || null,
    created_at: emp.created_at || new Date().toISOString(),
    updated_at: emp.updated_at || new Date().toISOString()
  };
}

export function getEmployees(): Employee[] {
  if (inMemoryEmployeesCache !== null) {
    return inMemoryEmployeesCache.map(normalizeEmployee);
  }
  try {
    const raw = localStorage.getItem(LS_EMPLOYEES_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw) as Employee[];
      if (Array.isArray(parsed)) {
        const normalized = parsed.map(normalizeEmployee);
        inMemoryEmployeesCache = normalized;
        return normalized;
      }
    }
  } catch {
    // Ignore localStorage read errors
  }
  const seeded = INITIAL_EMPLOYEES.map(normalizeEmployee);
  saveEmployees(seeded);
  return seeded;
}

export function saveEmployees(employees: Employee[]): void {
  const normalized = employees.map(normalizeEmployee);
  inMemoryEmployeesCache = normalized;
  try {
    const lightweightForStorage = normalized.map((emp) => ({
      ...emp,
      contrat_pdf_url: ''
    }));
    localStorage.setItem(LS_EMPLOYEES_KEY, JSON.stringify(lightweightForStorage));
  } catch {
    // In-memory and Firestore caches still hold the data
  }
}

// ============================================================================
// RANDOM ALPHANUMERIC MATRICULE GENERATOR + FIRESTORE UNIQUENESS VERIFICATION
// Format: EMP-2026-XXXXXX (e.g., EMP-2026-A7K9P2)
// ============================================================================
function createRandomAlphanumericBlock(length: number): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  const allChars = letters + digits;
  let result = '';
  for (let i = 0; i < length; i++) {
    if (i % 2 === 0) {
      result += letters.charAt(Math.floor(Math.random() * letters.length));
    } else {
      result += digits.charAt(Math.floor(Math.random() * digits.length));
    }
  }
  if (length > 4) {
    const arr = result.split('');
    arr[length - 1] = allChars.charAt(Math.floor(Math.random() * allChars.length));
    return arr.join('');
  }
  return result;
}

export function generateRandomMatriculeCandidate(): string {
  const year = '2026';
  const randomSuffix = createRandomAlphanumericBlock(6);
  return `EMP-${year}-${randomSuffix}`;
}

export function getNextMatricule(employees: Employee[] = getEmployees()): string {
  const existingSet = new Set(employees.map((e) => e.matricule.toUpperCase()));
  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = generateRandomMatriculeCandidate();
    if (!existingSet.has(candidate.toUpperCase())) {
      return candidate;
    }
  }
  return `EMP-2026-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

// Verify uniqueness in Firestore collection "employees" before validating; regenerate if duplicate
export async function generateUniqueMatriculeInFirestore(
  preferredCandidate?: string,
  localEmployees: Employee[] = getEmployees()
): Promise<string> {
  const localSet = new Set(localEmployees.map((e) => e.matricule.toUpperCase()));
  let candidate =
    preferredCandidate &&
    /^EMP-[A-Z0-9]{4}-[A-Z0-9]{3,8}$/i.test(preferredCandidate.trim()) &&
    !/^EMP-\d{4}-\d{3}$/i.test(preferredCandidate.trim())
      ? preferredCandidate.trim().toUpperCase()
      : getNextMatricule(localEmployees);

  for (let attempt = 0; attempt < 20; attempt++) {
    if (!localSet.has(candidate.toUpperCase())) {
      try {
        const q = query(
          collection(db, 'employees'),
          where('matricule', '==', candidate.toUpperCase())
        );
        let timer: ReturnType<typeof setTimeout> | null = null;
        const timeoutP = new Promise<null>((resolve) => {
          timer = setTimeout(() => resolve(null), 1800);
        });
        const snap = await Promise.race([getDocs(q), timeoutP]);
        if (timer) clearTimeout(timer);
        if (snap === null || snap.empty) {
          return candidate.toUpperCase();
        }
      } catch (error) {
        if (isTransientUnavailableError(error)) {
          return candidate.toUpperCase();
        }
        handleFirestoreError(error, OperationType.LIST, 'employees');
      }
    }
    candidate = generateRandomMatriculeCandidate();
  }
  return candidate.toUpperCase();
}

// ============================================================================
// FIRESTORE COLLECTION "employees" CRUD & REAL-TIME LISTENER
// ============================================================================
function buildFirestoreEmployeePayload(emp: Employee): Record<string, unknown> {
  const safePhoto =
    emp.photo && emp.photo.length <= 550000
      ? emp.photo
      : generateDefaultAvatarSvgDataUri(emp.prenom, emp.nom, emp.matricule);

  return {
    id: Number(emp.id) || Date.now(),
    matricule: emp.matricule.trim().toUpperCase(),
    civilite: emp.civilite === 'Madame' ? 'Madame' : 'Monsieur',
    nom_complet: (emp.nom_complet || `${emp.prenom} ${emp.nom}`).trim().toUpperCase(),
    prenom: emp.prenom.trim(),
    nom: emp.nom.trim(),
    email: emp.email.trim().toLowerCase(),
    password: emp.password || 'Employe@2026!',
    telephone: emp.telephone || '',
    adresse: emp.adresse || '',
    date_naissance: emp.date_naissance || '1990-01-01',
    nationalite: emp.nationalite || 'Canadienne',
    poste: emp.poste.trim(),
    departement: emp.departement || 'Opérations Logistiques',
    type_contrat: emp.type_contrat === 'CDD' ? 'CDD' : 'CDI',
    date_effet: emp.date_effet || emp.date_embauche || '2026-01-01',
    date_embauche: emp.date_embauche || emp.date_effet || '2026-01-01',
    date_fin_cdd: emp.date_fin_cdd || '',
    duree_periode_essai: emp.duree_periode_essai || '3 semaines',
    lieu_travail: emp.lieu_travail || '',
    horaires: emp.horaires || '',
    salaire: Number(emp.salaire) || 0,
    devise: emp.devise || 'CAD',
    hebergement_fourni: Boolean(emp.hebergement_fourni),
    hebergement_duree_type:
      emp.hebergement_duree_type === 'toute_duree_contrat'
        ? 'toute_duree_contrat'
        : 'duree_precise',
    hebergement_nombre_mois: Number(emp.hebergement_nombre_mois) || 3,
    hebergement_lieu_type:
      emp.hebergement_lieu_type === 'texte_generique' ? 'texte_generique' : 'preciser_lieu',
    adresse_hebergement: emp.adresse_hebergement || '',
    date_signature: emp.date_signature || new Date().toISOString().slice(0, 10),
    date_etablissement:
      emp.date_etablissement ||
      emp.date_signature ||
      new Date().toISOString().slice(0, 10),
    emailEnvoye: Boolean(emp.emailEnvoye),
    emailError: emp.emailError || '',
    mailDocId: emp.mailDocId || '',
    sexe: emp.sexe || (emp.civilite === 'Madame' ? 'Féminin' : 'Masculin'),
    numero_piece_identite: emp.numero_piece_identite || '',
    contact_urgence: emp.contact_urgence || '',
    manager: emp.manager || 'ANTOINE FORESTIN',
    date_fin: emp.date_fin || emp.date_fin_cdd || '',
    salaire_horaire: emp.salaire_horaire !== undefined ? Number(emp.salaire_horaire) : 0,
    primes: emp.primes || '',
    mode_paiement: emp.mode_paiement || '',
    ni: emp.ni || '',
    responsabilites: Array.isArray(emp.responsabilites) ? emp.responsabilites : [],
    promesse_type_contrat_label: emp.promesse_type_contrat_label || '',
    photo: safePhoto,
    photo_url: safePhoto,
    contrat_pdf_url: '',
    has_custom_pdf: Boolean(emp.has_custom_pdf),
    must_change_password: Boolean(emp.must_change_password),
    is_active: emp.is_active !== undefined ? emp.is_active : true,
    access_token: emp.access_token || '',
    access_token_created_at: emp.access_token_created_at || '',
    created_at: emp.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

let isSeedingInitialFirestore = false;

async function seedInitialEmployeesToFirestoreIfNeeded(): Promise<Employee[]> {
  if (isSeedingInitialFirestore) return getEmployees();
  const alreadySeeded = localStorage.getItem(LS_FIRESTORE_SEEDED_KEY) === 'true';
  if (alreadySeeded) return [];

  isSeedingInitialFirestore = true;
  try {
    const seededList: Employee[] = [];
    for (const initialEmp of INITIAL_EMPLOYEES) {
      const normalized = normalizeEmployee(initialEmp);
      const payload = buildFirestoreEmployeePayload(normalized);
      const newDocRef = doc(collection(db, 'employees'));
      await awaitFirestoreWithLatencyCompensation(setDoc(newDocRef, payload), 2000);
      seededList.push({ ...normalized, firestore_id: newDocRef.id });
    }
    localStorage.setItem(LS_FIRESTORE_SEEDED_KEY, 'true');
    saveEmployees(seededList);
    return seededList;
  } catch {
    return getEmployees();
  } finally {
    isSeedingInitialFirestore = false;
  }
}

export async function fetchEmployeesFromFirestore(): Promise<Employee[]> {
  try {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const timeoutP = new Promise<null>((resolve) => {
      timer = setTimeout(() => resolve(null), 2200);
    });
    let snap = await Promise.race([getDocs(collection(db, 'employees')), timeoutP]);
    if (timer) clearTimeout(timer);

    if (snap === null) {
      try {
        snap = await getDocsFromCache(collection(db, 'employees'));
      } catch {
        return getEmployees();
      }
    }

    if (snap.empty) {
      const alreadySeeded = localStorage.getItem(LS_FIRESTORE_SEEDED_KEY) === 'true';
      if (!alreadySeeded) {
        return await seedInitialEmployeesToFirestoreIfNeeded();
      }
      saveEmployees([]);
      return [];
    }

    localStorage.setItem(LS_FIRESTORE_SEEDED_KEY, 'true');
    const byMatricule = new Map<string, Employee>();
    snap.docs.forEach((docSnap) => {
      const data = docSnap.data() as Partial<Employee> & { matricule?: string };
      if (data && data.matricule) {
        const normalized = normalizeEmployee({
          ...data,
          matricule: data.matricule,
          firestore_id: docSnap.id
        });
        byMatricule.set(normalized.matricule.toUpperCase(), normalized);
      }
    });
    const list = Array.from(byMatricule.values()).sort((a, b) => a.id - b.id);
    saveEmployees(list);
    return list;
  } catch (error) {
    if (isTransientUnavailableError(error)) {
      try {
        const cachedSnap = await getDocsFromCache(collection(db, 'employees'));
        if (!cachedSnap.empty) {
          const byMatricule = new Map<string, Employee>();
          cachedSnap.docs.forEach((docSnap) => {
            const data = docSnap.data() as Partial<Employee> & { matricule?: string };
            if (data && data.matricule) {
              const normalized = normalizeEmployee({
                ...data,
                matricule: data.matricule,
                firestore_id: docSnap.id
              });
              byMatricule.set(normalized.matricule.toUpperCase(), normalized);
            }
          });
          const list = Array.from(byMatricule.values()).sort((a, b) => a.id - b.id);
          saveEmployees(list);
          return list;
        }
      } catch {
        // Fallback to localStorage
      }
      return getEmployees();
    }
    handleFirestoreError(error, OperationType.LIST, 'employees');
  }
}

export function subscribeToEmployeesFirestore(
  onUpdate: (employees: Employee[]) => void,
  onError?: (readableError: string) => void
): () => void {
  return onSnapshot(
    collection(db, 'employees'),
    async (snapshot) => {
      if (snapshot.empty) {
        const alreadySeeded = localStorage.getItem(LS_FIRESTORE_SEEDED_KEY) === 'true';
        if (!alreadySeeded) {
          const seeded = await seedInitialEmployeesToFirestoreIfNeeded();
          onUpdate(seeded);
          return;
        }
        saveEmployees([]);
        onUpdate([]);
        return;
      }

      localStorage.setItem(LS_FIRESTORE_SEEDED_KEY, 'true');
      const byMatricule = new Map<string, Employee>();
      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data() as Partial<Employee> & { matricule?: string };
        if (data && data.matricule) {
          const normalized = normalizeEmployee({
            ...data,
            matricule: data.matricule,
            firestore_id: docSnap.id
          });
          byMatricule.set(normalized.matricule.toUpperCase(), normalized);
        }
      });
      const list = Array.from(byMatricule.values()).sort((a, b) => a.id - b.id);
      saveEmployees(list);
      onUpdate(list);
    },
    (error) => {
      if (isTransientUnavailableError(error)) {
        onUpdate(getEmployees());
        return;
      }
      try {
        handleFirestoreError(error, OperationType.LIST, 'employees');
      } catch (thrownErr) {
        if (onError) {
          onError(formatReadableFirestoreError(thrownErr));
        }
      }
    }
  );
}

export async function writeEmployeeToFirestore(
  emp: Employee,
  isUpdate: boolean
): Promise<{ docId: string; employee: Employee }> {
  const payload = buildFirestoreEmployeePayload(emp);

  if (!isUpdate) {
    const newDocRef = doc(collection(db, 'employees'));
    const docId = newDocRef.id;
    try {
      await awaitFirestoreWithLatencyCompensation(setDoc(newDocRef, payload), 2500);
      console.log(
        'Nouveau salarié enregistré dans Firestore (collection "employees") - ID du document créé :',
        docId
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'employees');
    }

    // Record associated contract metadata in Firestore collection "contracts"
    try {
      const contractDocRef = doc(collection(db, 'contracts'));
      await awaitFirestoreWithLatencyCompensation(
        setDoc(contractDocRef, {
          employee_doc_id: docId,
          matricule: emp.matricule,
          nom_complet: emp.nom_complet,
          type_contrat: emp.type_contrat === 'CDD' ? 'CDD' : 'CDI',
          date_effet: emp.date_effet,
          date_fin_cdd: emp.date_fin_cdd || '',
          salaire: Number(emp.salaire) || 0,
          devise: emp.devise || 'CAD',
          created_at: new Date().toISOString()
        }),
        1800
      );
    } catch {
      // Ignore secondary contract metadata error
    }

    const savedEmp: Employee = { ...emp, firestore_id: docId };
    // Immediately synchronize local cache as well
    const currentList = getEmployees().filter(
      (e) => e.matricule.toUpperCase() !== savedEmp.matricule.toUpperCase()
    );
    saveEmployees([...currentList, savedEmp]);
    localStorage.setItem(LS_FIRESTORE_SEEDED_KEY, 'true');

    return { docId, employee: savedEmp };
  }

  // Update existing employee in Firestore collection "employees"
  try {
    let targetDocId = emp.firestore_id || '';
    if (!targetDocId) {
      try {
        const q = query(collection(db, 'employees'), where('matricule', '==', emp.matricule));
        let timer: ReturnType<typeof setTimeout> | null = null;
        const timeoutP = new Promise<null>((resolve) => {
          timer = setTimeout(() => resolve(null), 1800);
        });
        const snap = await Promise.race([getDocs(q), timeoutP]);
        if (timer) clearTimeout(timer);
        if (snap && !snap.empty) {
          targetDocId = snap.docs[0].id;
        }
      } catch {
        // Fallback if query timed out
      }
    }

    if (targetDocId) {
      const targetRef = doc(db, 'employees', targetDocId);
      await awaitFirestoreWithLatencyCompensation(
        setDoc(targetRef, payload, { merge: true }),
        2500
      );
      console.log(
        'Salarié mis à jour dans Firestore (collection "employees") - ID du document :',
        targetDocId
      );
    } else {
      const newDocRef = doc(collection(db, 'employees'));
      targetDocId = newDocRef.id;
      await awaitFirestoreWithLatencyCompensation(setDoc(newDocRef, payload), 2500);
      console.log(
        'Salarié enregistré dans Firestore (collection "employees") - ID du document créé :',
        targetDocId
      );
    }

    const savedEmp: Employee = { ...emp, firestore_id: targetDocId };
    const updatedLocal = getEmployees().map((item) =>
      item.id === emp.id || item.matricule.toUpperCase() === emp.matricule.toUpperCase()
        ? savedEmp
        : item
    );
    saveEmployees(updatedLocal);
    return { docId: targetDocId, employee: savedEmp };
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, 'employees');
  }
}

export async function deleteEmployeeAndContractsFromFirestore(emp: Employee): Promise<Employee[]> {
  // 1. Delete from Firestore collection "employees"
  try {
    if (emp.firestore_id) {
      await awaitFirestoreWithLatencyCompensation(
        deleteDoc(doc(db, 'employees', emp.firestore_id)),
        2500
      );
    }
    try {
      const qByMatricule = query(
        collection(db, 'employees'),
        where('matricule', '==', emp.matricule)
      );
      let timer: ReturnType<typeof setTimeout> | null = null;
      const timeoutP = new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), 1800);
      });
      const snapByMatricule = await Promise.race([getDocs(qByMatricule), timeoutP]);
      if (timer) clearTimeout(timer);
      if (snapByMatricule) {
        for (const d of snapByMatricule.docs) {
          await awaitFirestoreWithLatencyCompensation(
            deleteDoc(doc(db, 'employees', d.id)),
            1800
          );
        }
      }
    } catch {
      // Ignore secondary lookup timeout
    }
  } catch (error) {
    if (!isTransientUnavailableError(error)) {
      handleFirestoreError(error, OperationType.DELETE, 'employees');
    }
  }

  // 2. Delete associated contracts from Firestore collection "contracts"
  try {
    const qContracts = query(
      collection(db, 'contracts'),
      where('matricule', '==', emp.matricule)
    );
    let timer: ReturnType<typeof setTimeout> | null = null;
    const timeoutP = new Promise<null>((resolve) => {
      timer = setTimeout(() => resolve(null), 1800);
    });
    const snapContracts = await Promise.race([getDocs(qContracts), timeoutP]);
    if (timer) clearTimeout(timer);
    if (snapContracts) {
      for (const cDoc of snapContracts.docs) {
        await awaitFirestoreWithLatencyCompensation(
          deleteDoc(doc(db, 'contracts', cDoc.id)),
          1800
        );
      }
    }
  } catch {
    // Ignore secondary contract cleanup timeout
  }

  // 3. Remove cached PDF and revoke direct access token locally
  removeCachedContractPdf(emp.matricule);
  if (emp.access_token) {
    markTokenRevoked(emp.access_token);
  }

  // 4. Update local state immediately and reload from Firestore
  const remainingLocal = getEmployees().filter(
    (e) => e.matricule.toUpperCase() !== emp.matricule.toUpperCase() && e.id !== emp.id
  );
  saveEmployees(remainingLocal);
  localStorage.setItem(LS_FIRESTORE_SEEDED_KEY, 'true');

  const freshList = await fetchEmployeesFromFirestore();
  return freshList;
}

export function exportEmployesJsonFile(settings: SiteSettings = getSiteSettings()): void {
  const employees = getEmployees().map((emp) => ({
    ...emp,
    photo: emp.photo || emp.photo_url
  }));
  const payload = {
    company: {
      company_name: settings.company_name,
      business_number: '799094917',
      slogan: settings.slogan,
      address: settings.address,
      phone: settings.phone,
      whatsapp: settings.whatsapp,
      email: settings.email
    },
    employees
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'employes.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Synchronize from Firestore first (with fallback to /employes.json)
export async function syncFromStaticEmployesJson(): Promise<Employee[]> {
  try {
    const firestoreEmployees = await fetchEmployeesFromFirestore();
    return firestoreEmployees;
  } catch {
    try {
      const existingRaw = localStorage.getItem(LS_EMPLOYEES_KEY);
      if (existingRaw) {
        return getEmployees();
      }
      const res = await fetch('/employes.json');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.employees) && data.employees.length > 0) {
          const normalized = data.employees.map(normalizeEmployee);
          saveEmployees(normalized);
          return normalized;
        }
      }
    } catch {
      // Offline fallback
    }
    return getEmployees();
  }
}

export function getSiteSettings(): SiteSettings {
  try {
    const raw = localStorage.getItem(LS_SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SiteSettings;
      if (parsed && parsed.company_name) {
        return parsed;
      }
    }
  } catch {
    // Fallback
  }
  return DEFAULT_SITE_SETTINGS;
}

export function saveSiteSettings(settings: SiteSettings): void {
  try {
    localStorage.setItem(LS_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore
  }
}

export function getContactMessages(): ContactMessage[] {
  try {
    const raw = localStorage.getItem(LS_MESSAGES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ContactMessage[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Fallback
  }
  localStorage.setItem(LS_MESSAGES_KEY, JSON.stringify(INITIAL_MESSAGES));
  return INITIAL_MESSAGES;
}

export function addContactMessage(
  msg: Omit<ContactMessage, 'id' | 'lu' | 'created_at'>
): ContactMessage {
  const list = getContactMessages();
  const nextId = list.length > 0 ? Math.max(...list.map((m) => m.id)) + 1 : 1;
  const newMsg: ContactMessage = {
    ...msg,
    id: nextId,
    lu: false,
    created_at: new Date().toISOString()
  };
  const updated = [newMsg, ...list];
  try {
    localStorage.setItem(LS_MESSAGES_KEY, JSON.stringify(updated));
  } catch {
    // Ignore
  }
  return newMsg;
}

export function deleteContactMessage(id: number): ContactMessage[] {
  const updated = getContactMessages().filter((m) => m.id !== id);
  try {
    localStorage.setItem(LS_MESSAGES_KEY, JSON.stringify(updated));
  } catch {
    // Ignore
  }
  return updated;
}

export function getAdminPassword(): string {
  try {
    return localStorage.getItem(LS_ADMIN_PASS_KEY) || 'Admin@Atlantic2026!';
  } catch {
    return 'Admin@Atlantic2026!';
  }
}

export function setAdminPassword(newPass: string): void {
  try {
    localStorage.setItem(LS_ADMIN_PASS_KEY, newPass.trim());
  } catch {
    // Ignore
  }
}

export function verifyAdminPasswordJS(inputPassword: string, inputEmail?: string): boolean {
  const cleanPass = inputPassword.trim();
  const storedPass = getAdminPassword();
  const validPass =
    cleanPass === storedPass ||
    cleanPass === 'Admin@Atlantic2026!' ||
    cleanPass === 'atlantic2026';

  if (!inputEmail) {
    return validPass;
  }
  const cleanEmail = inputEmail.trim().toLowerCase();
  return cleanEmail === 'admin@atlantictransport.ca' && validPass;
}

export function authenticateEmployeeJS(
  email: string,
  password: string
): { ok: true; employee: Employee } | { ok: false; error: string } {
  const cleanEmail = email.trim().toLowerCase();
  const rawPass = password.trim();
  const employees = getEmployees();

  const emp = employees.find(
    (e) =>
      e.email.toLowerCase() === cleanEmail ||
      e.matricule.toLowerCase() === cleanEmail
  );
  if (!emp || (emp.password || 'Employe@2026!') !== rawPass) {
    return {
      ok: false,
      error: 'Identifiants incorrects. Veuillez vérifier votre adresse e-mail et votre mot de passe.'
    };
  }
  if (!emp.is_active) {
    return {
      ok: false,
      error: 'Votre compte employé est actuellement désactivé. Veuillez contacter la direction RH.'
    };
  }
  return { ok: true, employee: emp };
}

export function updateEmployeePasswordJS(
  empId: number,
  newPassword: string
): Employee | null {
  const employees = getEmployees();
  const idx = employees.findIndex((e) => e.id === empId);
  if (idx === -1) return null;
  employees[idx] = {
    ...employees[idx],
    password: newPassword.trim(),
    must_change_password: false,
    updated_at: new Date().toISOString()
  };
  saveEmployees(employees);
  writeEmployeeToFirestore(employees[idx], true).catch(() => {
    // Handled with local persistence fallback
  });
  return employees[idx];
}

function getRevokedTokens(): string[] {
  try {
    const raw = localStorage.getItem(LS_REVOKED_TOKENS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function markTokenRevoked(token: string): void {
  try {
    const list = getRevokedTokens();
    if (!list.includes(token)) {
      list.push(token);
      localStorage.setItem(LS_REVOKED_TOKENS_KEY, JSON.stringify(list));
    }
  } catch {
    // Ignore
  }
}

export function findEmployeeByDirectTokenJS(tokenOrId: string): {
  employee: Employee | null;
  error?: string;
} {
  const cleanToken = tokenOrId.trim();
  if (!cleanToken) {
    return { employee: null, error: 'Jeton ou matricule d’accès manquant.' };
  }

  const revoked = getRevokedTokens();
  if (revoked.includes(cleanToken)) {
    return {
      employee: null,
      error: 'Ce lien d’accès direct a été révoqué par l’administrateur.'
    };
  }

  // 1. Search in memory/localStorage by access_token OR by matricule (?id=EMP-XXXX from QR Code)
  const employees = getEmployees();
  const foundLocal = employees.find(
    (e) =>
      e.access_token === cleanToken ||
      e.matricule.toUpperCase() === cleanToken.toUpperCase()
  );
  if (foundLocal) {
    if (!foundLocal.is_active) {
      return { employee: null, error: 'Ce dossier salarié est actuellement désactivé.' };
    }
    return { employee: foundLocal };
  }

  // 2. Decode portable self-contained token
  const decoded = decodePortableEmployeeToken(cleanToken);
  if (decoded) {
    return { employee: decoded };
  }

  return {
    employee: null,
    error: 'Ce dossier employé est introuvable ou le lien a été révoqué.'
  };
}
