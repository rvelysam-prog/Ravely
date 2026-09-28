import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { PHP_DELIVERABLE_FILES } from './src/data/phpDeliverableFiles.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'atlantic_db.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const PHOTOS_DIR = path.join(UPLOADS_DIR, 'photos');
const CONTRATS_DIR = path.join(UPLOADS_DIR, 'contrats');
const PUBLIC_HTML_DIR = path.join(__dirname, 'public_html');

// Ensure directories exist
for (const dir of [DATA_DIR, UPLOADS_DIR, PHOTOS_DIR, CONTRATS_DIR, PUBLIC_HTML_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Write PHP/MySQL deliverable files into /public_html for deployment readiness
for (const file of PHP_DELIVERABLE_FILES) {
  const targetPath = path.join(PUBLIC_HTML_DIR, file.path);
  const parent = path.dirname(targetPath);
  if (!fs.existsSync(parent)) {
    fs.mkdirSync(parent, { recursive: true });
  }
  fs.writeFileSync(targetPath, file.content, 'utf-8');
}
for (const sub of ['uploads/photos', 'uploads/contrats']) {
  const targetSub = path.join(PUBLIC_HTML_DIR, sub);
  if (!fs.existsSync(targetSub)) {
    fs.mkdirSync(targetSub, { recursive: true });
  }
}

// Password hashing helpers (equivalent to PHP password_hash / password_verify)
function hashPassword(plain: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(plain, salt, 64).toString('hex');
  return `$scrypt$${salt}$${derived}`;
}

function verifyPassword(plain: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.startsWith('$scrypt$')) return false;
  const parts = storedHash.split('$');
  if (parts.length !== 4) return false;
  const [, , salt, keyHex] = parts;
  const derived = crypto.scryptSync(plain, salt, 64);
  const keyBuf = Buffer.from(keyHex, 'hex');
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

export interface SiteSettings {
  company_name: string;
  slogan: string;
  address: string;
  phone: string;
  whatsapp: string;
  email: string;
  logo_url: string;
  services: {
    id: string;
    number: string;
    title: string;
    subtitle: string;
    description: string;
    highlights: string[];
  }[];
}

export interface EmployeeRecord {
  id: number;
  matricule: string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  adresse: string;
  poste: string;
  departement: string;
  type_contrat: string;
  salaire: number;
  devise: string;
  date_embauche: string;
  photo_url: string;
  contrat_pdf_url: string;
  has_custom_pdf: boolean;
  password_hash: string;
  must_change_password: boolean;
  is_active: boolean;
  access_token?: string | null;
  access_token_created_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactMessage {
  id: number;
  nom_complet: string;
  entreprise: string;
  email: string;
  telephone: string;
  service_concerne: string;
  sujet: string;
  message: string;
  lu: boolean;
  created_at: string;
}

interface DatabaseSchema {
  site_settings: SiteSettings;
  admin: {
    id: number;
    nom_complet: string;
    email: string;
    password_hash: string;
  };
  employees: EmployeeRecord[];
  messages: ContactMessage[];
}

// Generate a valid PDF 1.4 binary buffer for an employee's work contract
function generateOfficialContractPdfBuffer(emp: EmployeeRecord, settings: SiteSettings): Buffer {
  const cleanAscii = (str: string) =>
    str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[()\\]/g, '');

  const lines = [
    '========================================================================',
    `  ${cleanAscii(settings.company_name)}`,
    `  ${cleanAscii(settings.slogan)}`,
    `  Siege social : ${cleanAscii(settings.address)}`,
    `  Tel / WhatsApp : ${cleanAscii(settings.phone)} | Email : ${cleanAscii(settings.email)}`,
    '========================================================================',
    '',
    '                CONTRAT DE TRAVAIL OFFICIEL - CONFIDENTIEL',
    '',
    `  Reference Matricule : ${cleanAscii(emp.matricule)}`,
    `  Date d'effet        : ${cleanAscii(emp.date_embauche)}`,
    '',
    '  ENTRE LES SOUSSIGNES :',
    `  L'Employeur : ${cleanAscii(settings.company_name)}, ayant son siege social a`,
    `  ${cleanAscii(settings.address)},`,
    '',
    '  ET LE SALARIE :',
    `  Nom et Prenom       : ${cleanAscii(emp.prenom)} ${cleanAscii(emp.nom)}`,
    `  Email professionnel : ${cleanAscii(emp.email)}`,
    `  Telephone           : ${cleanAscii(emp.telephone || 'Non renseigne')}`,
    `  Adresse             : ${cleanAscii(emp.adresse || 'Surrey, BC, Canada')}`,
    '',
    '  ARTICLE 1 - FONCTIONS ET AFFECTATION',
    `  Poste occupe        : ${cleanAscii(emp.poste)}`,
    `  Departement         : ${cleanAscii(emp.departement)}`,
    `  Nature du contrat   : ${cleanAscii(emp.type_contrat)}`,
    '',
    '  ARTICLE 2 - REMUNERATION MENSUELLE BRUTE',
    `  Salaire mensuel     : ${emp.salaire.toFixed(2)} ${cleanAscii(emp.devise)}`,
    '',
    '  ARTICLE 3 - OBLIGATIONS PROFESSIONNELLES ET CONFIDENTIALITE',
    '  Le Salarie s\'engage a exercer ses fonctions avec diligence au sein',
    '  d\'ATLANTIC TRANSPORT LTD et a respecter la confidentialite absolue',
    '  des operations logistiques, douanieres et commerciales.',
    '',
    '  ARTICLE 4 - PROTECTION DU DOCUMENT',
    '  Ce contrat est strictement personnel et confidentiel.',
    '  Toute reproduction ou diffusion externe non autorisee est interdite.',
    '',
    '  Fait a Surrey, Colombie-Britannique, Canada.',
    '  Pour ATLANTIC TRANSPORT LTD — Direction des Ressources Humaines',
    '========================================================================',
  ];

  let streamContent = 'BT\n/F1 11 Tf\n50 770 Td\n15 TL\n';
  for (const line of lines) {
    streamContent += `(${line}) Tj T*\n`;
  }
  streamContent += 'ET\n';

  const objects: string[] = [];
  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  objects.push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
  objects.push(
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n'
  );
  objects.push(
    `4 0 obj\n<< /Length ${Buffer.byteLength(streamContent, 'utf-8')} >>\nstream\n${streamContent}endstream\nendobj\n`
  );
  objects.push('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj\n');

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf-8'));
    pdf += obj;
  }
  const xrefStart = Buffer.byteLength(pdf, 'utf-8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i < offsets.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(pdf, 'utf-8');
}

// Generate SVG portrait avatar saved as PNG/SVG fallback if no custom photo uploaded
function generateDefaultAvatarSvgDataUri(prenom: string, nom: string, matricule: string): string {
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

function loadOrInitDb(): DatabaseSchema {
  if (fs.existsSync(DB_FILE)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8')) as DatabaseSchema;
      return parsed;
    } catch (e) {
      console.error('Error reading DB file, re-initializing:', e);
    }
  }

  const initialSettings: SiteSettings = {
    company_name: 'ATLANTIC TRANSPORT LTD',
    slogan: 'Le monde sans frontières, votre logistique sans limites.',
    address: 'King George Blvd, Surrey, BC V3T 2W1, Canada',
    phone: '+1 (506) 802-2226',
    whatsapp: '15068022226',
    email: 'atlantictransport.int@ik.me',
    logo_url: '', // uses built-in emblem or custom uploaded logo
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

  const emp1: EmployeeRecord = {
    id: 1,
    matricule: 'EMP-2026-001',
    prenom: 'Marc-Antoine',
    nom: 'Tremblay',
    email: 'm.tremblay@atlantictransport.ca',
    telephone: '+1 (604) 555-0194',
    adresse: '10450 King George Blvd, Surrey, BC V3T 2W1, Canada',
    poste: 'Coordinateur Principal des Opérations Multimodales',
    departement: 'Fret Maritime & Intermodal',
    type_contrat: 'CDI - Temps plein',
    salaire: 6400.0,
    devise: 'CAD',
    date_embauche: '2026-02-01',
    photo_url: generateDefaultAvatarSvgDataUri('Marc-Antoine', 'Tremblay', 'EMP-2026-001'),
    contrat_pdf_url: '/api/employee/contract-pdf/1',
    has_custom_pdf: false,
    password_hash: hashPassword('Employe@2026!'),
    must_change_password: true,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const emp2: EmployeeRecord = {
    id: 2,
    matricule: 'EMP-2026-002',
    prenom: 'Sophie',
    nom: 'Lavoie',
    email: 's.lavoie@atlantictransport.ca',
    telephone: '+1 (604) 555-0248',
    adresse: '13880 102 Ave, Surrey, BC V3T 5X8, Canada',
    poste: 'Spécialiste Conformité Douanière & Incoterms',
    departement: 'Douanes & Transit International',
    type_contrat: 'CDI - Temps plein',
    salaire: 5850.0,
    devise: 'CAD',
    date_embauche: '2026-03-15',
    photo_url: generateDefaultAvatarSvgDataUri('Sophie', 'Lavoie', 'EMP-2026-002'),
    contrat_pdf_url: '/api/employee/contract-pdf/2',
    has_custom_pdf: false,
    password_hash: hashPassword('Employe@2026!'),
    must_change_password: false,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Write physical PDF contracts into /uploads/contrats/
  fs.writeFileSync(
    path.join(CONTRATS_DIR, 'EMP-2026-001.pdf'),
    generateOfficialContractPdfBuffer(emp1, initialSettings)
  );
  fs.writeFileSync(
    path.join(CONTRATS_DIR, 'EMP-2026-002.pdf'),
    generateOfficialContractPdfBuffer(emp2, initialSettings)
  );

  const initialDb: DatabaseSchema = {
    site_settings: initialSettings,
    admin: {
      id: 1,
      nom_complet: 'Direction Générale — ATLANTIC TRANSPORT LTD',
      email: 'admin@atlantictransport.ca',
      password_hash: hashPassword('Admin@Atlantic2026!')
    },
    employees: [emp1, emp2],
    messages: [
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
        created_at: new Date(Date.now() - 86400000 * 2).toISOString()
      }
    ]
  };

  fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), 'utf-8');
  return initialDb;
}

let db = loadOrInitDb();

function saveDb() {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

function generateNextMatricule(): string {
  const year = '2026';
  let maxNum = 0;
  for (const emp of db.employees) {
    const match = emp.matricule.match(/^EMP-\d{4}-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }
  return `EMP-${year}-${String(maxNum + 1).padStart(3, '0')}`;
}

// Active session store in memory
interface SessionData {
  role: 'admin' | 'employee';
  userId: number;
  createdAt: number;
}
const sessions = new Map<string, SessionData>();

function createSession(role: 'admin' | 'employee', userId: number): string {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, { role, userId, createdAt: Date.now() });
  return token;
}

function getSessionFromReq(req: Request): SessionData | null {
  const authHeader = req.headers.authorization;
  const queryToken = typeof req.query.token === 'string' ? req.query.token : undefined;
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : queryToken;
  if (!token) return null;
  return sessions.get(token) || null;
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const session = getSessionFromReq(req);
  if (!session || session.role !== 'admin') {
    res.status(401).json({ error: 'Accès non autorisé. Authentification administrateur requise.' });
    return;
  }
  next();
}

function sanitizeEmployee(emp: EmployeeRecord) {
  const { password_hash, ...safe } = emp;
  return safe;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Allow larger payloads for base64 photo (JPG/PNG) & contract (PDF) uploads
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // Serve uploaded photos safely
  app.use('/uploads/photos', express.static(PHOTOS_DIR));

  // ============================================================================
  // PUBLIC API ENDPOINTS
  // ============================================================================
  app.get('/api/site', (_req, res) => {
    res.json({ settings: db.site_settings });
  });

  app.post('/api/contact', (req, res) => {
    const { nom_complet, entreprise, email, telephone, service_concerne, sujet, message } = req.body || {};
    if (!nom_complet || !email || !sujet || !message) {
      res.status(400).json({ error: 'Veuillez remplir tous les champs obligatoires.' });
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(String(email).trim())) {
      res.status(400).json({ error: 'Veuillez saisir une adresse e-mail valide.' });
      return;
    }

    const newMsg: ContactMessage = {
      id: db.messages.length > 0 ? Math.max(...db.messages.map((m) => m.id)) + 1 : 1,
      nom_complet: String(nom_complet).trim().slice(0, 120),
      entreprise: String(entreprise || '').trim().slice(0, 120),
      email: String(email).trim().slice(0, 150),
      telephone: String(telephone || '').trim().slice(0, 60),
      service_concerne: String(service_concerne || 'Transport Multimodal Global').trim().slice(0, 150),
      sujet: String(sujet).trim().slice(0, 180),
      message: String(message).trim().slice(0, 4000),
      lu: false,
      created_at: new Date().toISOString()
    };

    db.messages.unshift(newMsg);
    saveDb();
    res.json({
      success: true,
      message:
        'Votre demande a bien été transmise à notre équipe ATLANTIC TRANSPORT LTD. Nous vous répondrons sous 24h ouvrées.'
    });
  });

  // ============================================================================
  // UNIFIED AUTHENTICATION (ESPACE EMPLOYÉ + BACKOFFICE ADMIN)
  // ============================================================================
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      res.status(400).json({ error: 'Veuillez renseigner votre adresse e-mail et votre mot de passe.' });
      return;
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const rawPass = String(password);

    // 1. Check if this is the Admin logging in (works from both /admin and Espace Employé!)
    if (cleanEmail === db.admin.email.toLowerCase() && verifyPassword(rawPass, db.admin.password_hash)) {
      const token = createSession('admin', db.admin.id);
      res.json({
        role: 'admin',
        token,
        admin: {
          id: db.admin.id,
          nom_complet: db.admin.nom_complet,
          email: db.admin.email
        }
      });
      return;
    }

    // 2. Check Employee credentials
    const emp = db.employees.find((e) => e.email.toLowerCase() === cleanEmail);
    if (!emp || !verifyPassword(rawPass, emp.password_hash)) {
      res.status(401).json({
        error: 'Identifiants incorrects. Veuillez vérifier votre adresse e-mail et votre mot de passe.'
      });
      return;
    }

    if (!emp.is_active) {
      res.status(403).json({
        error: 'Votre compte employé est actuellement désactivé. Veuillez contacter la direction RH.'
      });
      return;
    }

    const token = createSession('employee', emp.id);
    res.json({
      role: 'employee',
      token,
      mustChangePassword: emp.must_change_password,
      employee: sanitizeEmployee(emp)
    });
  });

  app.post('/api/auth/logout', (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      sessions.delete(authHeader.slice(7).trim());
    }
    res.json({ success: true });
  });

  // ============================================================================
  // ESPACE EMPLOYÉ ENDPOINTS
  // ============================================================================
  app.get('/api/employee/me', (req, res) => {
    const session = getSessionFromReq(req);
    if (!session || session.role !== 'employee') {
      res.status(401).json({ error: 'Non connecté.' });
      return;
    }
    const emp = db.employees.find((e) => e.id === session.userId && e.is_active);
    if (!emp) {
      res.status(404).json({ error: 'Dossier employé introuvable ou désactivé.' });
      return;
    }
    res.json({ employee: sanitizeEmployee(emp) });
  });

  app.post('/api/employee/change-password', (req, res) => {
    const session = getSessionFromReq(req);
    if (!session || session.role !== 'employee') {
      res.status(401).json({ error: 'Session invalide.' });
      return;
    }
    const { newPassword, confirmPassword } = req.body || {};
    if (!newPassword || String(newPassword).length < 8) {
      res.status(400).json({ error: 'Le nouveau mot de passe doit contenir au moins 8 caractères.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      res.status(400).json({ error: 'La confirmation du mot de passe ne correspond pas.' });
      return;
    }

    const emp = db.employees.find((e) => e.id === session.userId);
    if (!emp) {
      res.status(404).json({ error: 'Employé introuvable.' });
      return;
    }

    emp.password_hash = hashPassword(String(newPassword));
    emp.must_change_password = false;
    emp.updated_at = new Date().toISOString();
    saveDb();

    res.json({
      success: true,
      employee: sanitizeEmployee(emp)
    });
  });

  // Stream PDF contract inline with anti-download headers
  app.get('/api/employee/contract-pdf/:id', (req, res) => {
    const session = getSessionFromReq(req);
    if (!session) {
      res.status(403).send('Accès interdit.');
      return;
    }
    const targetId = parseInt(req.params.id, 10);
    if (session.role === 'employee' && session.userId !== targetId) {
      res.status(403).send('Accès interdit à ce contrat.');
      return;
    }

    const emp = db.employees.find((e) => e.id === targetId);
    if (!emp) {
      res.status(404).send('Contrat introuvable.');
      return;
    }

    const pdfPath = path.join(CONTRATS_DIR, `${emp.matricule}.pdf`);
    let pdfBuffer: Buffer;
    if (fs.existsSync(pdfPath)) {
      pdfBuffer = fs.readFileSync(pdfPath);
    } else {
      pdfBuffer = generateOfficialContractPdfBuffer(emp, db.site_settings);
      fs.writeFileSync(pdfPath, pdfBuffer);
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Contrat-${emp.matricule}.pdf"`);
    res.setHeader('Cache-Control', 'private, no-store, no-cache, must-revalidate');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(pdfBuffer);
  });

  // Direct Employee Access via Unique Secure Token (/employe/TOKEN_UNIQUE) without login
  app.get('/api/employee/by-token/:token', (req, res) => {
    const token = String(req.params.token || '').trim();
    if (!token || token.length < 12) {
      res.status(404).json({ error: 'Lien d’accès direct invalide ou révoqué.' });
      return;
    }
    const emp = db.employees.find((e) => e.access_token === token);
    if (!emp) {
      res.status(404).json({ error: 'Ce lien d’accès direct est introuvable ou a été révoqué par l’administrateur.' });
      return;
    }
    if (!emp.is_active) {
      res.status(403).json({ error: 'Ce dossier salarié est actuellement désactivé.' });
      return;
    }
    res.json({ employee: sanitizeEmployee(emp) });
  });

  // Stream PDF contract inline via Direct Employee Token (/employe/TOKEN_UNIQUE)
  app.get('/api/employee/contract-pdf-by-token/:token', (req, res) => {
    const token = String(req.params.token || '').trim();
    if (!token || token.length < 12) {
      res.status(403).send('Lien invalide.');
      return;
    }
    const emp = db.employees.find((e) => e.access_token === token && e.is_active);
    if (!emp) {
      res.status(404).send('Contrat introuvable ou lien révoqué.');
      return;
    }

    const pdfPath = path.join(CONTRATS_DIR, `${emp.matricule}.pdf`);
    let pdfBuffer: Buffer;
    if (fs.existsSync(pdfPath)) {
      pdfBuffer = fs.readFileSync(pdfPath);
    } else {
      pdfBuffer = generateOfficialContractPdfBuffer(emp, db.site_settings);
      fs.writeFileSync(pdfPath, pdfBuffer);
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Contrat-${emp.matricule}.pdf"`);
    res.setHeader('Cache-Control', 'private, no-store, no-cache, must-revalidate');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(pdfBuffer);
  });

  // ============================================================================
  // BACKOFFICE ADMIN (/admin) ENDPOINTS
  // ============================================================================
  app.get('/api/admin/dashboard', requireAdmin, (_req, res) => {
    res.json({
      employees: db.employees.map(sanitizeEmployee),
      messages: db.messages,
      nextMatricule: generateNextMatricule(),
      settings: db.site_settings,
      admin: {
        id: db.admin.id,
        nom_complet: db.admin.nom_complet,
        email: db.admin.email
      }
    });
  });

  app.get('/api/admin/php-deliverables', requireAdmin, (_req, res) => {
    res.json({
      files: PHP_DELIVERABLE_FILES
    });
  });

  // Add new employee
  app.post('/api/admin/employees', requireAdmin, (req, res) => {
    const {
      prenom,
      nom,
      email,
      telephone,
      adresse,
      poste,
      departement,
      type_contrat,
      salaire,
      devise,
      date_embauche,
      password,
      photo_base64,
      contrat_pdf_base64
    } = req.body || {};

    if (!prenom || !nom || !email || !poste || !type_contrat || salaire === undefined || !date_embauche) {
      res.status(400).json({ error: 'Veuillez renseigner tous les champs obligatoires du salarié.' });
      return;
    }

    const cleanEmail = String(email).trim().toLowerCase();
    if (db.employees.some((e) => e.email.toLowerCase() === cleanEmail)) {
      res.status(400).json({ error: 'Un employé utilise déjà cette adresse e-mail.' });
      return;
    }

    const matricule = generateNextMatricule();
    const newId = db.employees.length > 0 ? Math.max(...db.employees.map((e) => e.id)) + 1 : 1;
    const initialPassword = password && String(password).trim().length >= 6 ? String(password).trim() : 'Employe@2026!';

    let photoUrl = generateDefaultAvatarSvgDataUri(String(prenom), String(nom), matricule);
    if (photo_base64 && typeof photo_base64 === 'string' && photo_base64.startsWith('data:image/')) {
      const matches = photo_base64.match(/^data:image\/(jpeg|jpg|png);base64,(.+)$/i);
      if (!matches) {
        res.status(400).json({ error: 'Format de photo non valide. Seuls les fichiers JPG et PNG sont acceptés.' });
        return;
      }
      const ext = matches[1].toLowerCase() === 'png' ? 'png' : 'jpg';
      const fileName = `${matricule}.${ext}`;
      fs.writeFileSync(path.join(PHOTOS_DIR, fileName), Buffer.from(matches[2], 'base64'));
      photoUrl = photo_base64;
    }

    const newEmp: EmployeeRecord = {
      id: newId,
      matricule,
      prenom: String(prenom).trim(),
      nom: String(nom).trim(),
      email: cleanEmail,
      telephone: String(telephone || '').trim(),
      adresse: String(adresse || 'Surrey, BC, Canada').trim(),
      poste: String(poste).trim(),
      departement: String(departement || 'Opérations Logistiques').trim(),
      type_contrat: String(type_contrat).trim(),
      salaire: Number(salaire) || 0,
      devise: String(devise || 'CAD').trim(),
      date_embauche: String(date_embauche).trim(),
      photo_url: photoUrl,
      contrat_pdf_url: `/api/employee/contract-pdf/${newId}`,
      has_custom_pdf: false,
      password_hash: hashPassword(initialPassword),
      must_change_password: true,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (
      contrat_pdf_base64 &&
      typeof contrat_pdf_base64 === 'string' &&
      contrat_pdf_base64.startsWith('data:application/pdf;base64,')
    ) {
      const base64Data = contrat_pdf_base64.replace(/^data:application\/pdf;base64,/, '');
      fs.writeFileSync(path.join(CONTRATS_DIR, `${matricule}.pdf`), Buffer.from(base64Data, 'base64'));
      newEmp.has_custom_pdf = true;
    } else {
      fs.writeFileSync(
        path.join(CONTRATS_DIR, `${matricule}.pdf`),
        generateOfficialContractPdfBuffer(newEmp, db.site_settings)
      );
    }

    db.employees.unshift(newEmp);
    saveDb();

    res.json({
      success: true,
      employee: sanitizeEmployee(newEmp),
      nextMatricule: generateNextMatricule()
    });
  });

  // Update employee
  app.put('/api/admin/employees/:id', requireAdmin, (req, res) => {
    const empId = parseInt(req.params.id, 10);
    const emp = db.employees.find((e) => e.id === empId);
    if (!emp) {
      res.status(404).json({ error: 'Employé introuvable.' });
      return;
    }

    const {
      prenom,
      nom,
      email,
      telephone,
      adresse,
      poste,
      departement,
      type_contrat,
      salaire,
      devise,
      date_embauche,
      photo_base64,
      contrat_pdf_base64
    } = req.body || {};

    if (email) {
      const cleanEmail = String(email).trim().toLowerCase();
      if (db.employees.some((e) => e.id !== empId && e.email.toLowerCase() === cleanEmail)) {
        res.status(400).json({ error: 'Cette adresse e-mail est déjà attribuée à un autre employé.' });
        return;
      }
      emp.email = cleanEmail;
    }

    if (prenom) emp.prenom = String(prenom).trim();
    if (nom) emp.nom = String(nom).trim();
    if (telephone !== undefined) emp.telephone = String(telephone).trim();
    if (adresse !== undefined) emp.adresse = String(adresse).trim();
    if (poste) emp.poste = String(poste).trim();
    if (departement) emp.departement = String(departement).trim();
    if (type_contrat) emp.type_contrat = String(type_contrat).trim();
    if (salaire !== undefined) emp.salaire = Number(salaire) || 0;
    if (devise) emp.devise = String(devise).trim();
    if (date_embauche) emp.date_embauche = String(date_embauche).trim();

    if (photo_base64 && typeof photo_base64 === 'string' && photo_base64.startsWith('data:image/')) {
      const matches = photo_base64.match(/^data:image\/(jpeg|jpg|png);base64,(.+)$/i);
      if (matches) {
        const ext = matches[1].toLowerCase() === 'png' ? 'png' : 'jpg';
        const fileName = `${emp.matricule}.${ext}`;
        fs.writeFileSync(path.join(PHOTOS_DIR, fileName), Buffer.from(matches[2], 'base64'));
        emp.photo_url = photo_base64;
      }
    }

    if (
      contrat_pdf_base64 &&
      typeof contrat_pdf_base64 === 'string' &&
      contrat_pdf_base64.startsWith('data:application/pdf;base64,')
    ) {
      const base64Data = contrat_pdf_base64.replace(/^data:application\/pdf;base64,/, '');
      fs.writeFileSync(path.join(CONTRATS_DIR, `${emp.matricule}.pdf`), Buffer.from(base64Data, 'base64'));
      emp.has_custom_pdf = true;
    } else if (!emp.has_custom_pdf) {
      fs.writeFileSync(
        path.join(CONTRATS_DIR, `${emp.matricule}.pdf`),
        generateOfficialContractPdfBuffer(emp, db.site_settings)
      );
    }

    emp.updated_at = new Date().toISOString();
    saveDb();

    res.json({
      success: true,
      employee: sanitizeEmployee(emp)
    });
  });

  // Toggle active / deactivated status
  app.post('/api/admin/employees/:id/toggle-active', requireAdmin, (req, res) => {
    const empId = parseInt(req.params.id, 10);
    const emp = db.employees.find((e) => e.id === empId);
    if (!emp) {
      res.status(404).json({ error: 'Employé introuvable.' });
      return;
    }
    emp.is_active = !emp.is_active;
    emp.updated_at = new Date().toISOString();
    saveDb();

    res.json({
      success: true,
      employee: sanitizeEmployee(emp)
    });
  });

  // Reset employee password & force change at next login
  app.post('/api/admin/employees/:id/reset-password', requireAdmin, (req, res) => {
    const empId = parseInt(req.params.id, 10);
    const emp = db.employees.find((e) => e.id === empId);
    if (!emp) {
      res.status(404).json({ error: 'Employé introuvable.' });
      return;
    }
    const { newPassword } = req.body || {};
    if (!newPassword || String(newPassword).trim().length < 6) {
      res.status(400).json({ error: 'Le mot de passe temporaire doit contenir au moins 6 caractères.' });
      return;
    }

    emp.password_hash = hashPassword(String(newPassword).trim());
    emp.must_change_password = true;
    emp.updated_at = new Date().toISOString();
    saveDb();

    res.json({
      success: true,
      employee: sanitizeEmployee(emp)
    });
  });

  // Generate or regenerate unique direct access link (/employe/TOKEN_UNIQUE) for an employee
  app.post('/api/admin/employees/:id/generate-link', requireAdmin, (req, res) => {
    const empId = parseInt(req.params.id, 10);
    const emp = db.employees.find((e) => e.id === empId);
    if (!emp) {
      res.status(404).json({ error: 'Employé introuvable.' });
      return;
    }

    const randomPart = crypto.randomBytes(16).toString('hex');
    emp.access_token = `${emp.matricule.toLowerCase()}-${randomPart}`;
    emp.access_token_created_at = new Date().toISOString();
    emp.updated_at = new Date().toISOString();
    saveDb();

    res.json({
      success: true,
      employee: sanitizeEmployee(emp),
      directPath: `/employe/${emp.access_token}`
    });
  });

  // Revoke direct access link for an employee
  app.delete('/api/admin/employees/:id/revoke-link', requireAdmin, (req, res) => {
    const empId = parseInt(req.params.id, 10);
    const emp = db.employees.find((e) => e.id === empId);
    if (!emp) {
      res.status(404).json({ error: 'Employé introuvable.' });
      return;
    }

    emp.access_token = null;
    emp.access_token_created_at = null;
    emp.updated_at = new Date().toISOString();
    saveDb();

    res.json({
      success: true,
      employee: sanitizeEmployee(emp)
    });
  });

  // Update Site Settings (Owner CMS)
  app.put('/api/admin/site', requireAdmin, (req, res) => {
    const { company_name, slogan, address, phone, whatsapp, email, logo_url, services, new_admin_password } =
      req.body || {};

    if (company_name) db.site_settings.company_name = String(company_name).trim();
    if (slogan) db.site_settings.slogan = String(slogan).trim();
    if (address) db.site_settings.address = String(address).trim();
    if (phone) db.site_settings.phone = String(phone).trim();
    if (whatsapp) db.site_settings.whatsapp = String(whatsapp).trim();
    if (email) db.site_settings.email = String(email).trim();
    if (logo_url !== undefined) db.site_settings.logo_url = String(logo_url);
    if (Array.isArray(services) && services.length === 3) {
      db.site_settings.services = services;
    }
    if (new_admin_password && String(new_admin_password).trim().length >= 8) {
      db.admin.password_hash = hashPassword(String(new_admin_password).trim());
    }

    saveDb();
    res.json({
      success: true,
      settings: db.site_settings
    });
  });

  // Contact messages management
  app.patch('/api/admin/messages/:id/read', requireAdmin, (req, res) => {
    const msgId = parseInt(req.params.id, 10);
    const msg = db.messages.find((m) => m.id === msgId);
    if (msg) {
      msg.lu = true;
      saveDb();
    }
    res.json({ success: true, messages: db.messages });
  });

  app.delete('/api/admin/messages/:id', requireAdmin, (req, res) => {
    const msgId = parseInt(req.params.id, 10);
    db.messages = db.messages.filter((m) => m.id !== msgId);
    saveDb();
    res.json({ success: true, messages: db.messages });
  });

  // ============================================================================
  // VITE MIDDLEWARE / STATIC SERVING
  // ============================================================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ATLANTIC TRANSPORT LTD server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
