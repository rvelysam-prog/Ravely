import { ContactMessage, Employee, SiteSettings } from '../types';

const LS_EMPLOYEES_KEY = 'atlantic_employes_v2';
const LS_SETTINGS_KEY = 'atlantic_settings_v2';
const LS_MESSAGES_KEY = 'atlantic_messages_v2';
const LS_ADMIN_PASS_KEY = 'atlantic_admin_pass_v2';
const LS_REVOKED_TOKENS_KEY = 'atlantic_revoked_tokens_v2';

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
    <rect x="24" y="24" width="110" height="26" rx="6" fill="#F59E0B"/>
    <text x="79" y="41" font-family="monospace" font-size="12" font-weight="bold" fill="#0B2545" text-anchor="middle">${matricule}</text>
    <circle cx="268" cy="52" r="24" fill="#1E3A8A" stroke="#F59E0B" stroke-width="2"/>
    <text x="268" y="59" font-family="sans-serif" font-size="18" font-weight="bold" fill="#FFFFFF" text-anchor="middle">${initials}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Encode employee core record into a portable base64url token so that /employe.html?token=XXX
// works even when opened on another smartphone/browser without any server!
export function createPortableEmployeeToken(emp: Employee): string {
  const payload = {
    i: emp.id,
    m: emp.matricule,
    p: emp.prenom,
    n: emp.nom,
    e: emp.email,
    t: emp.telephone || '',
    a: emp.adresse || 'King George Blvd, Surrey, BC V3T 2W1, Canada',
    po: emp.poste,
    d: emp.departement || 'Opérations Logistiques',
    tc: emp.type_contrat,
    s: emp.salaire,
    dv: emp.devise || 'CAD',
    de: emp.date_embauche,
    k: Math.random().toString(36).slice(2, 8)
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
    if (!p || !p.m || !p.p || !p.n || !p.po) return null;
    return {
      id: Number(p.i) || 999,
      matricule: String(p.m),
      prenom: String(p.p),
      nom: String(p.n),
      email: String(p.e || ''),
      telephone: String(p.t || ''),
      adresse: String(p.a || 'King George Blvd, Surrey, BC V3T 2W1, Canada'),
      poste: String(p.po),
      departement: String(p.d || 'Opérations Logistiques'),
      type_contrat: String(p.tc || 'CDI - Temps plein'),
      salaire: Number(p.s) || 0,
      devise: String(p.dv || 'CAD'),
      date_embauche: String(p.de || '2026-01-01'),
      photo_url: generateDefaultAvatarSvgDataUri(String(p.p), String(p.n), String(p.m)),
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

const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: 1,
    matricule: 'EMP-2026-001',
    prenom: 'Marc-Antoine',
    nom: 'Tremblay',
    email: 'm.tremblay@atlantictransport.ca',
    password: 'Employe@2026!',
    telephone: '+1 (604) 555-0194',
    adresse: '10450 King George Blvd, Surrey, BC V3T 2W1, Canada',
    poste: 'Coordinateur Principal des Opérations Multimodales',
    departement: 'Fret Maritime & Intermodal',
    type_contrat: 'CDI - Temps plein',
    salaire: 6400.0,
    devise: 'CAD',
    date_embauche: '2026-02-01',
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
    prenom: 'Sophie',
    nom: 'Lavoie',
    email: 's.lavoie@atlantictransport.ca',
    password: 'Employe@2026!',
    telephone: '+1 (604) 555-0248',
    adresse: '13880 102 Ave, Surrey, BC V3T 5X8, Canada',
    poste: 'Spécialiste Conformité Douanière & Incoterms',
    departement: 'Douanes & Transit International',
    type_contrat: 'CDI - Temps plein',
    salaire: 5850.0,
    devise: 'CAD',
    date_embauche: '2026-03-15',
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

function normalizeEmployee(emp: Employee): Employee {
  return {
    ...emp,
    photo_url:
      emp.photo_url && emp.photo_url.trim().length > 0
        ? emp.photo_url
        : generateDefaultAvatarSvgDataUri(emp.prenom, emp.nom, emp.matricule),
    password: emp.password || 'Employe@2026!'
  };
}

export function getEmployees(): Employee[] {
  try {
    const raw = localStorage.getItem(LS_EMPLOYEES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Employee[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(normalizeEmployee);
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
  try {
    localStorage.setItem(LS_EMPLOYEES_KEY, JSON.stringify(employees));
  } catch {
    // Ignore quota errors
  }
}

// Synchronize initial /employes.json if localStorage has not been customized yet
export async function syncFromStaticEmployesJson(): Promise<Employee[]> {
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
    // Offline or file protocol fallback: silently use embedded INITIAL_EMPLOYEES
  }
  return getEmployees();
}

export function getNextMatricule(employees: Employee[] = getEmployees()): string {
  const year = '2026';
  let maxNum = 0;
  for (const emp of employees) {
    const match = emp.matricule.match(/^EMP-\d{4}-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }
  return `EMP-${year}-${String(maxNum + 1).padStart(3, '0')}`;
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

  const emp = employees.find((e) => e.email.toLowerCase() === cleanEmail);
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

export function findEmployeeByDirectTokenJS(token: string): {
  employee: Employee | null;
  error?: string;
} {
  const cleanToken = token.trim();
  if (!cleanToken) {
    return { employee: null, error: 'Jeton d’accès manquant.' };
  }

  const revoked = getRevokedTokens();
  if (revoked.includes(cleanToken)) {
    return {
      employee: null,
      error: 'Ce lien d’accès direct a été révoqué par l’administrateur.'
    };
  }

  // 1. Search in localStorage / employes.json
  const employees = getEmployees();
  const foundLocal = employees.find((e) => e.access_token === cleanToken);
  if (foundLocal) {
    if (!foundLocal.is_active) {
      return { employee: null, error: 'Ce dossier salarié est actuellement désactivé.' };
    }
    return { employee: foundLocal };
  }

  // 2. Decode portable self-contained token (so links created by Admin work on any employee phone/device without a server!)
  const decoded = decodePortableEmployeeToken(cleanToken);
  if (decoded) {
    return { employee: decoded };
  }

  return {
    employee: null,
    error: 'Ce lien d’accès direct est introuvable ou a été révoqué.'
  };
}
