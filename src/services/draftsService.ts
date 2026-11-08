import { collection, doc, getDocs, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

export interface DraftItem {
  id: string;
  type: 'nouveau_salarie' | 'contrat_prestation' | 'offre_emploi' | 'ticket_entretien' | 'bundle';
  titre: string;
  nomCandidat?: string;
  poste?: string;
  departement?: string;
  codeCnp?: string;
  statut: 'brouillon' | 'en_attente' | 'pret_publication';
  donnees: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

const LOCAL_STORAGE_DRAFTS_KEY = 'atlantic_drafts_v1';

export async function saveDraftToStorage(draftData: Partial<DraftItem> & { titre: string }): Promise<DraftItem> {
  const now = new Date().toISOString();
  const id = draftData.id || `draft_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  const completeDraft: DraftItem = {
    id,
    type: draftData.type || 'nouveau_salarie',
    titre: draftData.titre,
    nomCandidat: draftData.nomCandidat || '',
    poste: draftData.poste || '',
    departement: draftData.departement || '',
    codeCnp: draftData.codeCnp || '',
    statut: draftData.statut || 'brouillon',
    donnees: draftData.donnees || {},
    createdAt: draftData.createdAt || now,
    updatedAt: now
  };

  // 1. Sauvegarde locale immédiate
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_DRAFTS_KEY);
    const list: DraftItem[] = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex((d) => d.id === id);
    if (idx >= 0) {
      list[idx] = completeDraft;
    } else {
      list.unshift(completeDraft);
    }
    localStorage.setItem(LOCAL_STORAGE_DRAFTS_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn('Erreur localStorage saveDraftToStorage:', err);
  }

  // 2. Sauvegarde Firestore
  try {
    const docRef = doc(db, 'drafts', id);
    await setDoc(docRef, {
      ...completeDraft,
      updated_at: now
    }, { merge: true });
  } catch (err) {
    console.warn('Erreur Firestore saveDraftToStorage (persistance locale active):', err);
  }

  return completeDraft;
}

export async function getAllDrafts(): Promise<DraftItem[]> {
  const map = new Map<string, DraftItem>();

  // 1. LocalStorage
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_DRAFTS_KEY);
    if (raw) {
      const list: DraftItem[] = JSON.parse(raw);
      for (const d of list) {
        map.set(d.id, d);
      }
    }
  } catch {
    // Ignore error
  }

  // 2. Firestore
  try {
    const snap = await getDocs(collection(db, 'drafts'));
    if (!snap.empty) {
      snap.forEach((d) => {
        const item = d.data() as DraftItem;
        map.set(item.id || d.id, { ...item, id: item.id || d.id });
      });
    }
  } catch {
    // Fallback silencieux vers le stockage local
  }

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
  );
}

export async function deleteDraft(id: string): Promise<void> {
  // 1. LocalStorage
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_DRAFTS_KEY);
    if (raw) {
      const list: DraftItem[] = JSON.parse(raw);
      const filtered = list.filter((d) => d.id !== id);
      localStorage.setItem(LOCAL_STORAGE_DRAFTS_KEY, JSON.stringify(filtered));
    }
  } catch {
    // Ignore error
  }

  // 2. Firestore
  try {
    await deleteDoc(doc(db, 'drafts', id));
  } catch {
    // Ignore error
  }
}
