import { collection, doc, getDoc, setDoc } from 'firebase/firestore';
import { db, isTransientUnavailableError } from '../firebase';

export interface DepartmentDefinition {
  code: string;
  name: string;
  missions: [string, string, string, string, string, string];
  postesLies: string[];
}

export const OFFICIAL_DEPARTMENTS: DepartmentDefinition[] = [
  {
    code: 'EXPLOITATION_TRANSPORT',
    name: 'DEPARTEMENT EXPLOITATION TRANSPORT',
    missions: [
      'Planification des tournées et affectation des chauffeurs',
      'Suivi des flottes en temps réel et géolocalisation',
      'Gestion des affrètements et des relations sous-traitants',
      'Optimisation des itinéraires et contrôle du respect des temps de conduite réglementaires',
      "Coordination des opérations de chargement et de livraison avec les quais d'expédition",
      'Contrôle des documents de transport et suivi quotidien de la ponctualité des livraisons'
    ],
    postesLies: [
      'Exploitant Transport',
      'Chauffeur Poids Lourd',
      'Conducteur Routier',
      'Dispatcher / Répartiteur',
      'Chef de Quai',
      'Responsable Exploitation Transport'
    ]
  },
  {
    code: 'LOGISTIQUE_ENTREPOSAGE',
    name: 'DEPARTEMENT LOGISTIQUE ET ENTREPOSAGE',
    missions: [
      'Réception, contrôle et déchargement des marchandises',
      'Stockage, gestion des emplacements et inventaires',
      'Préparation des commandes (picking) et conditionnement',
      'Emballage des marchandises dans des cartons ou des emballages adaptés au transport',
      "Étiquetage des colis et organisation des commandes dans les zones prévues pour l'expédition",
      'Participation à la gestion des stocks en signalant les produits manquants et marchandises endommagées'
    ],
    postesLies: [
      'Préparatrice de Commande',
      'Préparateur de Commandes',
      'Cariste / Magasinier',
      'Agent Logistique',
      'Gestionnaire de Stock',
      'Responsable Entrepôt Logistique'
    ]
  },
  {
    code: 'TRANSIT_DOUANE',
    name: 'DEPARTEMENT TRANSIT ET DOUANE',
    missions: [
      'Formalités douanières import/export',
      'Gestion des documents de transport internationaux (CMR, LTA)',
      'Veille sur les réglementations fiscales et douanières',
      'Établissement des déclarations en douane et contrôle de la nomenclature tarifaire (SH / HS)',
      'Coordination opérationnelle avec les transitaires, compagnies maritimes et autorités frontalières',
      'Suivi des régimes douaniers suspensifs, des cautions et apurement des dossiers import/export'
    ],
    postesLies: [
      'Déclarant en Douane',
      'Agent de Transit International',
      'Coordinateur Import / Export',
      'Responsable Douane & Conformité',
      'Gestionnaire Documentaire Transit'
    ]
  },
  {
    code: 'MAINTENANCE_FLOTTE',
    name: 'DEPARTEMENT MAINTENANCE ET GESTION DE FLOTTE',
    missions: [
      'Entretien mécanique et révision des véhicules',
      'Gestion du parc de matériel de manutention (chariots, palettes)',
      'Suivi de la consommation de carburant et des cartes péages',
      'Planification des visites réglementaires, contrôles techniques et inspections préventives',
      "Diagnostic des pannes, gestion du stock de pièces détachées et dépannages d'exploitation",
      'Tenue du registre de maintenance et optimisation du taux de disponibilité de la flotte'
    ],
    postesLies: [
      'Mécanicien Poids Lourd',
      'Gestionnaire de Flotte',
      'Technicien de Maintenance Engins',
      "Chef d'Atelier Maintenance",
      'Responsable Parc Automobile'
    ]
  },
  {
    code: 'COMMERCIAL_DEVELOPPEMENT',
    name: 'DEPARTEMENT COMMERCIAL ET DEVELOPPEMENT',
    missions: [
      'Prospection de nouveaux clients et suivi des grands comptes',
      "Réponse aux appels d'offres transport et logistique",
      'Élaboration des stratégies tarifaires (Pricing)',
      'Négociation des contrats commerciaux et développement du chiffre d’affaires régional et international',
      'Analyse des besoins logistiques des clients et conception de solutions de transport sur mesure',
      'Suivi des indicateurs de performance commerciale (KPI) et fidélisation du portefeuille clients'
    ],
    postesLies: [
      'Attaché Commercial Transport',
      'Assistant Commercial',
      'Ingénieur Commercial Grands Comptes',
      "Chargé d'Affaires Logistique",
      'Analyste Pricing & Appels d’Offres',
      'Directeur Commercial'
    ]
  },
  {
    code: 'SERVICE_CLIENT_LITIGES',
    name: 'DEPARTEMENT SERVICE CLIENT ET LITIGES',
    missions: [
      'Information client et suivi des livraisons',
      'Gestion des réclamations et constatation des avaries',
      "Traitement des dossiers d'assurances marchandises",
      'Interface quotidienne entre les clients destinataires, les chauffeurs et le service exploitation',
      "Mise en place d'actions correctives immédiates en cas d'aléas ou de retards de livraison",
      'Suivi de la qualité de service (OTIF), reporting client et traitement des retours marchandises'
    ],
    postesLies: [
      'Chargé de Service Client',
      'Gestionnaire Litiges & Avaries',
      'Conseiller Relation Client Transport',
      'Agent de Suivi des Livraisons',
      'Responsable Service Client'
    ]
  },
  {
    code: 'QHSE',
    name: 'DEPARTEMENT QUALITE, HYGIENE, SECURITE, ENVIRONNEMENT (QHSE)',
    missions: [
      'Audit des procédures de sécurité et prévention des accidents',
      'Gestion des protocoles de transport de matières dangereuses (ADR)',
      "Pilotage de la politique RSE et réduction de l'empreinte carbone",
      'Animation des sessions de sensibilisation sécurité et contrôle du port des équipements (EPI)',
      'Suivi des certifications qualité/environnement et mise à jour des registres réglementaires',
      "Analyse des incidents d'exploitation et déploiement des plans d'actions préventives"
    ],
    postesLies: [
      'Responsable QHSE',
      'Animateur Sécurité & Prévention',
      'Conseiller à la Sécurité ADR',
      'Auditeur Qualité & Environnement',
      'Coordinateur HSE Entrepôt'
    ]
  },
  {
    code: 'IT',
    name: "DEPARTEMENT SYSTEMES D'INFORMATION (IT)",
    missions: [
      'Maintenance des logiciels métiers (TMS, WMS)',
      'Intégration des flux de données clients (EDI)',
      'Gestion du parc informatique et de la cybersécurité',
      'Support technique aux équipes d’exploitation et d’entrepôt (terminaux RF, informatique embarquée)',
      'Administration des réseaux, serveurs, sauvegardes et continuité d’activité informatique',
      'Déploiement des évolutions applicatives et conception des tableaux de bord décisionnels (BI)'
    ],
    postesLies: [
      'Chef de Projet TMS / WMS',
      'Ingénieur Flux EDI & Intégration',
      'Administrateur Systèmes & Réseaux',
      'Technicien Support Informatique',
      'Responsable Systèmes d’Information'
    ]
  },
  {
    code: 'RESSOURCES_HUMAINES',
    name: 'DEPARTEMENT RESSOURCES HUMAINES',
    missions: [
      'Recrutement des profils pénuriques (chauffeurs, caristes)',
      'Suivi des formations obligatoires et recyclages (FIMO, FCO, CACES)',
      'Gestion de la paie et des plannings de modulation du temps de travail',
      "Rédaction des contrats de travail, promesses d'embauche et parcours d'intégration des salariés",
      'Gestion administrative du personnel, suivi des visites médicales et dossiers sociaux',
      'Accompagnement des managers opérationnels, dialogue social et suivi des indicateurs RH'
    ],
    postesLies: [
      'Chargé de Recrutement Transport',
      'Gestionnaire de Paie & Temps de Travail',
      'Assistant Ressources Humaines',
      'Chargé de Formation Réglementaire',
      'Responsable Ressources Humaines'
    ]
  },
  {
    code: 'FINANCE_COMPTABILITE',
    name: 'DEPARTEMENT FINANCE ET COMPTABILITE',
    missions: [
      'Facturation des prestations de transport et de stockage',
      'Recouvrement des créances et relances clients',
      'Calcul des coûts de revient au kilomètre et contrôle de gestion',
      'Saisie, vérification et règlement des factures fournisseurs, sous-traitants et notes de frais',
      'Établissement des déclarations fiscales, rapprochements bancaires et clôtures comptables',
      'Suivi de la trésorerie quotidienne et élaboration des budgets prévisionnels d’exploitation'
    ],
    postesLies: [
      'Comptable Général',
      'Contrôleur de Gestion Transport',
      'Gestionnaire Facturation & Recouvrement',
      'Assistant Comptable',
      'Directeur Administratif et Financier'
    ]
  },
  {
    code: 'JURIDIQUE',
    name: 'DEPARTEMENT JURIDIQUE',
    missions: [
      'Rédaction des contrats de prestation logistique',
      "Gestion des contentieux commerciaux et litiges prud'homaux",
      'Suivi de la conformité au droit du transport',
      'Validation juridique des conditions générales de vente et des contrats de sous-traitance',
      'Conseil juridique aux directions opérationnelles en droit routier, maritime et douanier',
      'Gestion des contrats d’assurance responsabilité civile professionnelle et flotte de véhicules'
    ],
    postesLies: [
      'Juriste Droit des Transports & Logistique',
      'Juriste Droit Social',
      'Paralégal / Assistant Juridique',
      'Responsable Juridique & Conformité'
    ]
  },
  {
    code: 'ACHATS_APPROVISIONNEMENTS',
    name: 'DEPARTEMENT ACHATS ET APPROVISIONNEMENTS',
    missions: [
      "Négociation des contrats de carburant et d'énergie",
      "Achat de matériels, de fournitures d'emballage et de pneumatiques",
      "Sélection des fournisseurs d'équipements de protection (EPI)",
      'Pilotage des appels d’offres fournisseurs et optimisation des coûts d’approvisionnement',
      'Gestion des stocks de consommables logistiques, palettes et équipements d’entrepôt',
      'Évaluation périodique de la performance des fournisseurs et suivi des délais de livraison'
    ],
    postesLies: [
      'Acheteur Transport & Flotte',
      'Gestionnaire des Approvisionnements',
      'Acheteur Consommables & EPI',
      'Responsable Achats & Services Généraux'
    ]
  }
];

function normalizeDeptKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();
}

export function formatMissionsWithBullets(missions: string[]): string {
  return missions
    .map((m) => m.replace(/^[\s•\-*]+/, '').trim())
    .filter((m) => m.length > 0)
    .map((m) => `• ${m}`)
    .join('\n');
}

export function parseMissionsFromText(text: string): string[] {
  return (text || '')
    .split('\n')
    .map((line) => line.replace(/^[\s•\-*]+/, '').trim())
    .filter((line) => line.length > 0);
}

export function findDepartmentDefinition(deptName?: string): DepartmentDefinition | undefined {
  if (!deptName) return undefined;
  const key = normalizeDeptKey(deptName);
  return OFFICIAL_DEPARTMENTS.find((d) => {
    const dKey = normalizeDeptKey(d.name);
    return (
      dKey === key ||
      dKey.includes(key) ||
      key.includes(dKey.replace(/^DEPARTEMENT\s+/, ''))
    );
  });
}

export function findDepartmentByPoste(posteName?: string): DepartmentDefinition | undefined {
  if (!posteName || !posteName.trim()) return undefined;
  const key = normalizeDeptKey(posteName);
  if (!key) return undefined;

  // 1. Exact or partial match on linked job titles (postesLies)
  for (const dept of OFFICIAL_DEPARTMENTS) {
    for (const linkedPoste of dept.postesLies) {
      const pKey = normalizeDeptKey(linkedPoste);
      if (pKey === key || pKey.includes(key) || key.includes(pKey)) {
        return dept;
      }
    }
  }

  // 2. Keyword matching for common transport/logistics job titles
  const keywordMap: Array<{ keywords: string[]; code: string }> = [
    {
      keywords: ['CHAUFFEUR', 'CONDUCTEUR', 'EXPLOITANT', 'DISPATCH', 'REPARTITEUR', 'QUAI', 'ROUTIER'],
      code: 'EXPLOITATION_TRANSPORT'
    },
    {
      keywords: ['PREPARAT', 'COMMANDE', 'CARISTE', 'MAGASINIER', 'ENTREPOT', 'STOCK', 'PICKING', 'MANUTENTION'],
      code: 'LOGISTIQUE_ENTREPOSAGE'
    },
    {
      keywords: ['DOUANE', 'TRANSIT', 'DECLARANT', 'IMPORT', 'EXPORT'],
      code: 'TRANSIT_DOUANE'
    },
    {
      keywords: ['MECANICIEN', 'FLOTTE', 'MAINTENANCE', 'ATELIER', 'GARAGE', 'PARC'],
      code: 'MAINTENANCE_FLOTTE'
    },
    {
      keywords: ['COMMERCIAL', 'PRICING', 'VENTE', 'COMPTE', 'AFFAIRE'],
      code: 'COMMERCIAL_DEVELOPPEMENT'
    },
    {
      keywords: ['LITIGE', 'CLIENT', 'AVARIE', 'SAV', 'RECLAMATION'],
      code: 'SERVICE_CLIENT_LITIGES'
    },
    {
      keywords: ['QHSE', 'SECURITE', 'QUALITE', 'HSE', 'ADR', 'RSE', 'ENVIRONNEMENT'],
      code: 'QHSE'
    },
    {
      keywords: ['INFORMATIQUE', 'SYSTEME', 'RESEAU', 'TMS', 'WMS', 'EDI', 'DEVELOPPEUR', 'SUPPORT IT'],
      code: 'IT'
    },
    {
      keywords: ['RECRUTEMENT', 'PAIE', 'RESSOURCES HUMAINES', 'FORMATION', 'RH'],
      code: 'RESSOURCES_HUMAINES'
    },
    {
      keywords: ['COMPTAB', 'FINANC', 'FACTURATION', 'RECOUVREMENT', 'GESTION', 'TRESORERIE'],
      code: 'FINANCE_COMPTABILITE'
    },
    {
      keywords: ['JURISTE', 'JURIDIQUE', 'CONTENTIEUX', 'PARALEGAL', 'CONFORMITE'],
      code: 'JURIDIQUE'
    },
    {
      keywords: ['ACHAT', 'APPROVISIONNEMENT', 'ACHETEUR', 'FOURNISSEUR'],
      code: 'ACHATS_APPROVISIONNEMENTS'
    }
  ];

  for (const entry of keywordMap) {
    if (entry.keywords.some((kw) => key.includes(kw))) {
      return OFFICIAL_DEPARTMENTS.find((d) => d.code === entry.code);
    }
  }

  return undefined;
}

export function getDeduplicatedDepartmentsList(existingDepts: string[] = []): DepartmentDefinition[] {
  const result: DepartmentDefinition[] = [...OFFICIAL_DEPARTMENTS];
  const seenKeys = new Set<string>(OFFICIAL_DEPARTMENTS.map((d) => normalizeDeptKey(d.name)));

  // Map common aliases already on the site so they don't create duplicates
  const aliasPhrases = [
    'OPERATIONS LOGISTIQUES',
    'LOGISTIQUE ENTREPOT',
    'LOGISTIQUE ET ENTREPOT',
    'DOUANES TRANSIT INTERNATIONAL',
    'FRET MARITIME INTERMODAL'
  ];
  aliasPhrases.forEach((a) => seenKeys.add(a));

  for (const raw of existingDepts) {
    if (!raw || !raw.trim()) continue;
    const norm = normalizeDeptKey(raw);
    if (!norm || seenKeys.has(norm)) continue;
    const alreadyMatched = OFFICIAL_DEPARTMENTS.some((d) => {
      const dNorm = normalizeDeptKey(d.name);
      return (
        dNorm === norm ||
        dNorm.includes(norm) ||
        norm.includes(dNorm.replace(/^DEPARTEMENT\s+/, ''))
      );
    });
    if (!alreadyMatched) {
      seenKeys.add(norm);
      result.push({
        code: `CUSTOM_${norm.replace(/\s+/g, '_')}`,
        name: raw.trim(),
        missions: [
          `Exécution et supervision des opérations rattachées au ${raw.trim()}`,
          'Suivi quotidien des indicateurs de performance et respect des procédures internes',
          'Coordination opérationnelle avec les équipes Atlantic Transport Ltd.',
          'Contrôle de la conformité documentaire et de la traçabilité des flux',
          'Gestion des priorités opérationnelles et remontée des anomalies au manager',
          'Application stricte des consignes de qualité, d’hygiène et de sécurité au travail'
        ],
        postesLies: [`Agent ${raw.trim()}`, `Responsable ${raw.trim()}`]
      });
    }
  }

  return result;
}

// ============================================================================
// CUSTOM UPLOADED PDF ASSETS (Logo, Signature, Cachet, Filigrane) STORAGE
// ============================================================================
const LS_CUSTOM_LOGO_KEY = 'atlantic_custom_pdf_logo_v1';
const LS_CUSTOM_SIGNATURE_KEY = 'atlantic_custom_pdf_signature_v1';
const LS_CUSTOM_CACHET_KEY = 'atlantic_custom_pdf_cachet_v1';
const LS_CUSTOM_FILIGRANE_KEY = 'atlantic_custom_pdf_filigrane_v1';
const LS_PDF_ASSETS_CONFIG_KEY = 'atlantic_pdf_imported_assets_config_v1';

export type AssetUnit = 'px' | '%';
export type HorizontalAlign = 'left' | 'center' | 'right';
export type VerticalAlign = 'top' | 'middle' | 'bottom';
export type ImportedAssetKey = 'logo' | 'signature' | 'cachet' | 'filigrane';

export interface PdfAssetItemSettings {
  widthValue: number;
  widthUnit: AssetUnit;
  heightValue: number;
  heightUnit: AssetUnit;
  opacity: number; // 0 to 100 (%)
  tintEnabled: boolean;
  tintColor: string; // Hex e.g. '#0C2366'
  offsetX: number; // px offset (-200 to +200)
  offsetY: number; // px offset (-200 to +200)
  alignX: HorizontalAlign;
  alignY: VerticalAlign;
  rotation: number; // degrees (-180 to 180)
  zIndex: number; // used primarily for filigrane (e.g. 0 = derrière le texte, 20 = devant le texte)
}

export interface PdfImportedAssetsConfig {
  logo: PdfAssetItemSettings;
  signature: PdfAssetItemSettings;
  cachet: PdfAssetItemSettings;
  filigrane: PdfAssetItemSettings;
  updated_at?: string;
}

export const DEFAULT_PDF_ASSETS_CONFIG: PdfImportedAssetsConfig = {
  logo: {
    widthValue: 180,
    widthUnit: 'px',
    heightValue: 60,
    heightUnit: 'px',
    opacity: 100,
    tintEnabled: false,
    tintColor: '#0C2366',
    offsetX: 0,
    offsetY: 0,
    alignX: 'left',
    alignY: 'top',
    rotation: 0,
    zIndex: 10
  },
  signature: {
    widthValue: 130,
    widthUnit: 'px',
    heightValue: 68,
    heightUnit: 'px',
    opacity: 100,
    tintEnabled: false,
    tintColor: '#0C2366',
    offsetX: 0,
    offsetY: 0,
    alignX: 'center',
    alignY: 'middle',
    rotation: 0,
    zIndex: 12
  },
  cachet: {
    widthValue: 155,
    widthUnit: 'px',
    heightValue: 84,
    heightUnit: 'px',
    opacity: 100,
    tintEnabled: false,
    tintColor: '#1E3A8A',
    offsetX: 0,
    offsetY: 0,
    alignX: 'left',
    alignY: 'middle',
    rotation: 0,
    zIndex: 11
  },
  filigrane: {
    widthValue: 290,
    widthUnit: 'px',
    heightValue: 360,
    heightUnit: 'px',
    opacity: 100,
    tintEnabled: false,
    tintColor: '#64748B',
    offsetX: 0,
    offsetY: 0,
    alignX: 'center',
    alignY: 'middle',
    rotation: 0,
    zIndex: 0
  }
};

function sanitizeAssetItem(
  item: Partial<PdfAssetItemSettings> | undefined,
  fallback: PdfAssetItemSettings
): PdfAssetItemSettings {
  if (!item || typeof item !== 'object') return { ...fallback };
  return {
    widthValue:
      typeof item.widthValue === 'number' && !Number.isNaN(item.widthValue)
        ? Math.max(10, Math.min(1000, item.widthValue))
        : fallback.widthValue,
    widthUnit: item.widthUnit === '%' ? '%' : item.widthUnit === 'px' ? 'px' : fallback.widthUnit,
    heightValue:
      typeof item.heightValue === 'number' && !Number.isNaN(item.heightValue)
        ? Math.max(10, Math.min(1000, item.heightValue))
        : fallback.heightValue,
    heightUnit:
      item.heightUnit === '%' ? '%' : item.heightUnit === 'px' ? 'px' : fallback.heightUnit,
    opacity:
      typeof item.opacity === 'number' && !Number.isNaN(item.opacity)
        ? Math.max(0, Math.min(100, item.opacity))
        : fallback.opacity,
    tintEnabled: typeof item.tintEnabled === 'boolean' ? item.tintEnabled : fallback.tintEnabled,
    tintColor:
      typeof item.tintColor === 'string' && /^#[0-9A-Fa-f]{6}$/.test(item.tintColor)
        ? item.tintColor
        : fallback.tintColor,
    offsetX:
      typeof item.offsetX === 'number' && !Number.isNaN(item.offsetX)
        ? Math.max(-300, Math.min(300, item.offsetX))
        : fallback.offsetX,
    offsetY:
      typeof item.offsetY === 'number' && !Number.isNaN(item.offsetY)
        ? Math.max(-300, Math.min(300, item.offsetY))
        : fallback.offsetY,
    alignX:
      item.alignX === 'left' || item.alignX === 'center' || item.alignX === 'right'
        ? item.alignX
        : fallback.alignX,
    alignY:
      item.alignY === 'top' || item.alignY === 'middle' || item.alignY === 'bottom'
        ? item.alignY
        : fallback.alignY,
    rotation:
      typeof item.rotation === 'number' && !Number.isNaN(item.rotation)
        ? Math.max(-180, Math.min(180, item.rotation))
        : fallback.rotation,
    zIndex:
      typeof item.zIndex === 'number' && !Number.isNaN(item.zIndex)
        ? Math.max(-10, Math.min(50, item.zIndex))
        : fallback.zIndex
  };
}

export function normalizePdfAssetsConfig(
  raw?: Partial<PdfImportedAssetsConfig> | null
): PdfImportedAssetsConfig {
  return {
    logo: sanitizeAssetItem(raw?.logo, DEFAULT_PDF_ASSETS_CONFIG.logo),
    signature: sanitizeAssetItem(raw?.signature, DEFAULT_PDF_ASSETS_CONFIG.signature),
    cachet: sanitizeAssetItem(raw?.cachet, DEFAULT_PDF_ASSETS_CONFIG.cachet),
    filigrane: sanitizeAssetItem(raw?.filigrane, DEFAULT_PDF_ASSETS_CONFIG.filigrane),
    updated_at: raw?.updated_at || new Date().toISOString()
  };
}

export function getSavedPdfAssetsConfig(): PdfImportedAssetsConfig {
  try {
    const raw = localStorage.getItem(LS_PDF_ASSETS_CONFIG_KEY);
    if (!raw) return normalizePdfAssetsConfig(DEFAULT_PDF_ASSETS_CONFIG);
    return normalizePdfAssetsConfig(JSON.parse(raw));
  } catch {
    return normalizePdfAssetsConfig(DEFAULT_PDF_ASSETS_CONFIG);
  }
}

export function setSavedPdfAssetsConfig(config: PdfImportedAssetsConfig): PdfImportedAssetsConfig {
  const normalized = normalizePdfAssetsConfig(config);
  try {
    localStorage.setItem(LS_PDF_ASSETS_CONFIG_KEY, JSON.stringify(normalized));
  } catch {
    // Ignore localStorage quota error
  }
  return normalized;
}

export async function savePdfAssetsConfigToFirestore(
  config: PdfImportedAssetsConfig
): Promise<PdfImportedAssetsConfig> {
  const normalized = setSavedPdfAssetsConfig({
    ...config,
    updated_at: new Date().toISOString()
  });

  try {
    const docRef = doc(collection(db, 'settings'), 'pdf_imported_assets');
    let timer: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<'timeout'>((resolve) => {
      timer = setTimeout(() => resolve('timeout'), 3500);
    });
    await Promise.race([setDoc(docRef, normalized, { merge: true }), timeoutPromise]);
    if (timer) clearTimeout(timer);
  } catch (err) {
    if (!isTransientUnavailableError(err)) {
      console.warn('Sauvegarde locale appliquée (Firestore indisponible):', err);
    }
  }

  return normalized;
}

export async function loadPdfAssetsConfigFromFirestore(): Promise<PdfImportedAssetsConfig> {
  const localConfig = getSavedPdfAssetsConfig();
  try {
    const docRef = doc(collection(db, 'settings'), 'pdf_imported_assets');
    let timer: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<null>((resolve) => {
      timer = setTimeout(() => resolve(null), 3000);
    });
    const snap = await Promise.race([getDoc(docRef), timeoutPromise]);
    if (timer) clearTimeout(timer);
    if (snap && snap.exists()) {
      const remoteData = snap.data() as Partial<PdfImportedAssetsConfig>;
      return setSavedPdfAssetsConfig(remoteData as PdfImportedAssetsConfig);
    }
  } catch {
    // Fallback to local config
  }
  return localConfig;
}

export function getSavedCustomLogo(): string {
  try {
    return localStorage.getItem(LS_CUSTOM_LOGO_KEY) || '';
  } catch {
    return '';
  }
}

export function setSavedCustomLogo(dataUrl: string): void {
  try {
    if (!dataUrl) {
      localStorage.removeItem(LS_CUSTOM_LOGO_KEY);
    } else {
      localStorage.setItem(LS_CUSTOM_LOGO_KEY, dataUrl);
    }
  } catch {
    // Ignore storage quota errors
  }
}

export function getSavedCustomSignature(): string {
  try {
    return localStorage.getItem(LS_CUSTOM_SIGNATURE_KEY) || '';
  } catch {
    return '';
  }
}

export function setSavedCustomSignature(dataUrl: string): void {
  try {
    if (!dataUrl) {
      localStorage.removeItem(LS_CUSTOM_SIGNATURE_KEY);
    } else {
      localStorage.setItem(LS_CUSTOM_SIGNATURE_KEY, dataUrl);
    }
  } catch {
    // Ignore storage quota errors
  }
}

export function getSavedCustomCachet(): string {
  try {
    return localStorage.getItem(LS_CUSTOM_CACHET_KEY) || '';
  } catch {
    return '';
  }
}

export function setSavedCustomCachet(dataUrl: string): void {
  try {
    if (!dataUrl) {
      localStorage.removeItem(LS_CUSTOM_CACHET_KEY);
    } else {
      localStorage.setItem(LS_CUSTOM_CACHET_KEY, dataUrl);
    }
  } catch {
    // Ignore storage quota errors
  }
}

export function getSavedCustomFiligrane(): string {
  try {
    return localStorage.getItem(LS_CUSTOM_FILIGRANE_KEY) || '';
  } catch {
    return '';
  }
}

export function setSavedCustomFiligrane(dataUrl: string): void {
  try {
    if (!dataUrl) {
      localStorage.removeItem(LS_CUSTOM_FILIGRANE_KEY);
    } else {
      localStorage.setItem(LS_CUSTOM_FILIGRANE_KEY, dataUrl);
    }
  } catch {
    // Ignore storage quota errors
  }
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').trim();
  if (clean.length !== 6) return [12, 35, 102];
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

/**
 * Applies color tinting to an image Data URL while preserving transparency and luminance shading.
 * Used for both the Live Preview and the jsPDF generator when `tintEnabled` is active.
 */
export async function applyTintToImageDataUrl(
  rawDataUrl: string,
  tintColorHex: string
): Promise<string> {
  if (!rawDataUrl || typeof document === 'undefined') return rawDataUrl;
  const [tr, tg, tb] = hexToRgb(tintColorHex);

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const w = img.naturalWidth || img.width || 300;
        const h = img.naturalHeight || img.height || 150;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(rawDataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const imgData = ctx.getImageData(0, 0, w, h);
        const d = imgData.data;
        for (let i = 0; i < d.length; i += 4) {
          const alpha = d[i + 3];
          if (alpha === 0) continue;
          const lum = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
          // Blend tint color with original luminance so details stay sharp
          d[i] = Math.min(255, Math.round(tr * (0.35 + 0.65 * lum)));
          d[i + 1] = Math.min(255, Math.round(tg * (0.35 + 0.65 * lum)));
          d[i + 2] = Math.min(255, Math.round(tb * (0.35 + 0.65 * lum)));
        }
        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(rawDataUrl);
      }
    };
    img.onerror = () => resolve(rawDataUrl);
    img.src = rawDataUrl;
  });
}

/**
 * Renders an asset image onto an offscreen canvas applying:
 * - Opacity (%)
 * - Color / Tint (if tintEnabled)
 * - Rotation (°)
 * Returns the transformed PNG DataURL and the bounding-box expansion ratios for jsPDF.
 */
export async function renderAssetWithSettingsForPdf(
  rawDataUrl: string,
  settings: PdfAssetItemSettings
): Promise<{ dataUrl: string; boxScaleX: number; boxScaleY: number }> {
  if (!rawDataUrl || typeof document === 'undefined') {
    return { dataUrl: rawDataUrl, boxScaleX: 1, boxScaleY: 1 };
  }

  const sourceUrl =
    settings.tintEnabled && settings.tintColor
      ? await applyTintToImageDataUrl(rawDataUrl, settings.tintColor)
      : rawDataUrl;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const w = img.naturalWidth || img.width || 300;
        const h = img.naturalHeight || img.height || 150;
        const rad = ((settings.rotation || 0) * Math.PI) / 180;
        const cos = Math.abs(Math.cos(rad));
        const sin = Math.abs(Math.sin(rad));

        const outW = Math.max(1, Math.round(w * cos + h * sin));
        const outH = Math.max(1, Math.round(w * sin + h * cos));

        const canvas = document.createElement('canvas');
        canvas.width = outW;
        canvas.height = outH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ dataUrl: sourceUrl, boxScaleX: 1, boxScaleY: 1 });
          return;
        }

        ctx.clearRect(0, 0, outW, outH);
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, (settings.opacity ?? 100) / 100));
        ctx.translate(outW / 2, outH / 2);
        if (settings.rotation) {
          ctx.rotate(rad);
        }
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
        ctx.restore();

        resolve({
          dataUrl: canvas.toDataURL('image/png'),
          boxScaleX: outW / w,
          boxScaleY: outH / h
        });
      } catch {
        resolve({ dataUrl: sourceUrl, boxScaleX: 1, boxScaleY: 1 });
      }
    };
    img.onerror = () => resolve({ dataUrl: sourceUrl, boxScaleX: 1, boxScaleY: 1 });
    img.src = sourceUrl;
  });
}

/**
 * Converts an uploaded PNG/JPG image to a clean PNG Data URL for jsPDF.
 * - Preserves the exact uploaded visual without any AI regeneration.
 * - If `removeWhiteBackground` is true (for signature/cachet JPGs), converts near-white background pixels to transparent.
 */
export async function convertUploadedImageForPdf(
  rawDataUrl: string,
  options: { maxWidth?: number; maxHeight?: number; removeWhiteBackground?: boolean } = {}
): Promise<string> {
  if (!rawDataUrl || typeof document === 'undefined') return rawDataUrl;
  const maxW = options.maxWidth || 900;
  const maxH = options.maxHeight || 900;
  const removeWhite = options.removeWhiteBackground ?? false;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        let w = img.naturalWidth || img.width || 400;
        let h = img.naturalHeight || img.height || 200;
        if (w > maxW || h > maxH) {
          const ratio = Math.min(maxW / w, maxH / h);
          w = Math.max(1, Math.round(w * ratio));
          h = Math.max(1, Math.round(h * ratio));
        }

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(rawDataUrl);
          return;
        }
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);

        if (removeWhite) {
          const imgData = ctx.getImageData(0, 0, w, h);
          const d = imgData.data;
          for (let i = 0; i < d.length; i += 4) {
            const r = d[i];
            const g = d[i + 1];
            const b = d[i + 2];
            // Near-white paper background -> make transparent so stamp/signature overlays cleanly
            if (r >= 236 && g >= 234 && b >= 228) {
              const luminance = (r + g + b) / 3;
              if (luminance >= 244) {
                d[i + 3] = 0;
              } else {
                d[i + 3] = Math.round(((244 - luminance) / 10) * d[i + 3]);
              }
            }
          }
          ctx.putImageData(imgData, 0, 0);
        }

        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(rawDataUrl);
      }
    };
    img.onerror = () => resolve(rawDataUrl);
    img.src = rawDataUrl;
  });
}

// ============================================================================
// FIREBASE EXTENSION TRIGGER EMAIL ("mail" collection)
// ============================================================================
export interface TriggerEmailParams {
  toEmail: string;
  nomComplet: string;
  civilite: 'Monsieur' | 'Madame' | string;
  poste: string;
  departement?: string;
  dateEmbauche: string;
  dateEtablissement?: string;
  matricule: string;
  pdfDataUri: string;
}

export async function sendCandidatureAcceptanceEmailViaFirebase(
  params: TriggerEmailParams
): Promise<{ emailEnvoye: boolean; mailDocId: string }> {
  const cleanName = (params.nomComplet || 'SALARIE')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_');

  const pdfBase64 = params.pdfDataUri.includes('base64,')
    ? params.pdfDataUri.split('base64,')[1]
    : params.pdfDataUri;

  const subject = 'Atlantic Transport Ltd. - Acceptation de votre candidature';
  const salutation =
    String(params.civilite).toLowerCase().includes('madame') ||
    String(params.civilite).toLowerCase().startsWith('f')
      ? 'Madame'
      : 'Monsieur';

  const textBody = `${salutation} ${params.nomComplet},

Nous avons le plaisir de vous informer que la société Atlantic Transport Ltd. a décidé de retenir votre candidature au poste de ${params.poste} (Prise de fonction : ${params.dateEmbauche}).

Vous trouverez en pièce jointe votre Promesse d'Embauche officielle établie à Surrey le ${params.dateEtablissement || params.dateEmbauche} (Matricule : ${params.matricule}).

Nous vous remercions de bien vouloir nous confirmer votre acceptation en nous retournant ce document signé.

Veuillez agréer, ${salutation}, l'expression de nos salutations distinguées.

Direction des Ressources Humaines
Atlantic Transport Ltd.
King George Blvd, Surrey, BC V3T 2W1, Canada
Email : atlantictransport.int@ik.me
Téléphone : +1 (506) 802-2226`;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; color: #1e293b; line-height: 1.6; max-width: 640px;">
      <h2 style="color: #0C2366; margin-bottom: 12px;">Atlantic Transport Ltd. — Acceptation de votre candidature</h2>
      <p>${salutation} <strong>${params.nomComplet}</strong>,</p>
      <p>
        Nous avons le plaisir de vous informer que la société <strong>Atlantic Transport Ltd.</strong> a décidé de vous embaucher à la suite de l'étude favorable de votre candidature au poste de <strong>${params.poste}</strong>${params.departement ? ` (${params.departement})` : ''}.
      </p>
      <p>
        <strong>Date de prise de fonction :</strong> ${params.dateEmbauche}<br/>
        <strong>Matricule :</strong> ${params.matricule}
      </p>
      <p>
        Vous trouverez en pièce jointe votre <strong>Promesse d'embauche officielle (PDF)</strong>. Nous vous remercions de bien vouloir confirmer votre acceptation de cette offre par signature du document.
      </p>
      <p>Veuillez agréer, ${salutation}, l'expression de nos salutations distinguées.</p>
      <hr style="border: none; border-top: 1px solid #cbd5e1; margin: 20px 0;" />
      <p style="font-size: 12px; color: #3A6E48;">
        <strong>Atlantic Transport Ltd.</strong><br/>
        King George Blvd, Surrey, BC V3T 2W1, Canada<br/>
        Numéro d'entreprise (NE) : 799094917<br/>
        Téléphone : +1 (506) 802-2226 · Email : <a href="mailto:atlantictransport.int@ik.me">atlantictransport.int@ik.me</a>
      </p>
    </div>
  `;

  const mailCollectionRef = collection(db, 'mail');
  const mailDocRef = doc(mailCollectionRef);

  const mailPayload: Record<string, unknown> = {
    from: 'Atlantic Transport Ltd. <atlantictransport.int@ik.me>',
    replyTo: 'atlantictransport.int@ik.me',
    to: [params.toEmail.trim()],
    matricule: params.matricule,
    nom_complet: params.nomComplet,
    poste: params.poste,
    date_embauche: params.dateEmbauche,
    emailEnvoye: true,
    created_at: new Date().toISOString(),
    message: {
      subject,
      text: textBody,
      html: htmlBody,
      attachments: [
        {
          filename: `PROMESSE_EMBAUCHE_${cleanName}.pdf`,
          content: pdfBase64,
          encoding: 'base64',
          contentType: 'application/pdf'
        }
      ]
    }
  };

  try {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<'timeout'>((resolve) => {
      timer = setTimeout(() => resolve('timeout'), 3000);
    });
    await Promise.race([setDoc(mailDocRef, mailPayload), timeoutPromise]);
    if (timer) clearTimeout(timer);
  } catch (error) {
    if (!isTransientUnavailableError(error)) {
      try {
        await setDoc(mailDocRef, {
          ...mailPayload,
          message: {
            subject,
            text: textBody,
            html: htmlBody
          }
        });
      } catch {
        // Ignore secondary error
      }
    }
  }

  console.log('emailEnvoye=true', {
    emailEnvoye: true,
    mailDocId: mailDocRef.id,
    from: 'atlantictransport.int@ik.me',
    to: params.toEmail,
    subject
  });

  return {
    emailEnvoye: true,
    mailDocId: mailDocRef.id
  };
}
