/**
 * Service de stockage documentaire local gratuit via IndexedDB
 * Dédié au module d'édition FORCUS Word 2013.
 * Aucune dépendance externe payante ni API cloud requise.
 */

export interface ForcusDocumentLayer {
  id: string;
  name: string;
  type: 'text' | 'image' | 'logo' | 'signature' | 'stamp' | 'watermark' | 'shape' | 'table';
  content: string; // texte ou dataURL d'image
  x: number; // millimètres ou pixels
  y: number;
  width: number;
  height: number;
  rotation: number; // degrés
  opacity: number; // 0 à 100
  zIndex: number;
  locked: boolean;
  visible: boolean;
  wrapMode: 'infront' | 'behind' | 'inline' | 'background'; // devant, derrière, dans le texte, arrière-plan
  style?: {
    fontFamily?: string;
    fontSize?: number;
    color?: string;
    backgroundColor?: string;
    borderColor?: string;
    borderWidth?: number;
    borderRadius?: number;
    textAlign?: 'left' | 'center' | 'right' | 'justify';
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    padding?: number;
  };
}

export interface ForcusDocumentPage {
  id: string;
  pageNumber: number;
  htmlContent: string; // Corps de texte principal paginé
  headerHtml?: string;
  footerHtml?: string;
  layers: ForcusDocumentLayer[];
}

export interface ForcusDocument {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  format: 'A4' | 'Letter' | 'Legal';
  orientation: 'portrait' | 'landscape';
  margins: {
    top: number; // en mm
    bottom: number;
    left: number;
    right: number;
  };
  theme: {
    name: string;
    primaryColor: string;
    accentColor: string;
    fontFamily: string;
    pageBackground: string;
  };
  watermark?: {
    enabled: boolean;
    type: 'text' | 'image';
    text?: string;
    imageUrl?: string;
    opacity: number;
    angle: number;
  };
  pages: ForcusDocumentPage[];
}

const DB_NAME = 'forcus_documents_db';
const DB_VERSION = 1;
const STORE_NAME = 'documents';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB non supporté'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e: any) => {
      const db = e.target.result as IDBDatabase;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Sauvegarde un document FORCUS dans IndexedDB
 */
export async function saveForcusDocument(doc: ForcusDocument): Promise<void> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put({
        ...doc,
        updatedAt: new Date().toISOString()
      });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    // Fallback localStorage si IndexedDB échoue
    try {
      localStorage.setItem(`forcus_doc_${doc.id}`, JSON.stringify(doc));
    } catch {
      console.warn('Erreur fallback localStorage');
    }
  }
}

/**
 * Charge un document par son ID
 */
export async function getForcusDocument(id: string): Promise<ForcusDocument | null> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    const raw = localStorage.getItem(`forcus_doc_${id}`);
    return raw ? JSON.parse(raw) : null;
  }
}

/**
 * Liste tous les documents sauvegardés
 */
export async function listForcusDocuments(): Promise<Array<{ id: string; title: string; updatedAt: string; pageCount: number }>> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const docs: ForcusDocument[] = req.result || [];
        const mapped = docs.map((d) => ({
          id: d.id,
          title: d.title || 'Document sans titre',
          updatedAt: d.updatedAt,
          pageCount: d.pages?.length || 1
        }));
        mapped.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        resolve(mapped);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

/**
 * Supprime un document par son ID
 */
export async function deleteForcusDocument(id: string): Promise<void> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    localStorage.removeItem(`forcus_doc_${id}`);
  }
}

/**
 * Crée un document FORCUS vierge par défaut (format A4)
 */
export function createDefaultForcusDocument(title = 'Nouveau Document Word'): ForcusDocument {
  const now = new Date().toISOString();
  return {
    id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title,
    createdAt: now,
    updatedAt: now,
    format: 'A4',
    orientation: 'portrait',
    margins: {
      top: 25,
      bottom: 25,
      left: 25,
      right: 25
    },
    theme: {
      name: 'Office 2013 Classique',
      primaryColor: '#0066B3',
      accentColor: '#D4A017',
      fontFamily: 'Calibri, sans-serif',
      pageBackground: '#FFFFFF'
    },
    watermark: {
      enabled: false,
      type: 'text',
      text: 'CONFIDENTIEL',
      opacity: 15,
      angle: -45
    },
    pages: [
      {
        id: 'page_1',
        pageNumber: 1,
        headerHtml: '<div style="font-size: 9pt; color: #64748B; text-align: right; border-bottom: 1px solid #CBD5E1; padding-bottom: 4px;">DOCUMENT OFFICIEL · ATLANTIC TRANSPORT LTD</div>',
        footerHtml: '<div style="font-size: 8.5pt; color: #94A3B8; text-align: center; border-top: 1px solid #E2E8F0; padding-top: 4px;">Page 1 sur 1 · Document certifié conforme</div>',
        htmlContent: `<h1 style="font-size: 20pt; color: #0B2545; font-weight: bold; margin-bottom: 12px; font-family: Calibri, sans-serif;">ATTESTATION PROFESSIONNELLE</h1>
<p style="font-size: 11pt; line-height: 1.5; color: #1E293B; margin-bottom: 12px;">Nous soussignés, <strong>ATLANTIC TRANSPORT LTD.</strong>, attestons par la présente la validité des engagements souscrits dans le cadre de notre organisation opérationnelle au Canada.</p>
<p style="font-size: 11pt; line-height: 1.5; color: #1E293B; margin-bottom: 12px;">Ce document a été édité et mis en page via l'environnement documentaire professionnel <strong>FORCUS</strong> (conforme à l'expérience Microsoft Word 2013).</p>
<p style="font-size: 11pt; line-height: 1.5; color: #1E293B; margin-bottom: 16px;">Vous pouvez modifier ce texte, ajouter des tableaux, importer votre logo, superposer votre signature et appliquer un cachet officiel avec gestion intégrale des calques.</p>`,
        layers: []
      }
    ]
  };
}
