/**
 * Moteur professionnel de reproduction fidèle multi-étapes, édition interactive style Canva,
 * hébergement HTTPS d'actifs visuels, compilation Email HTML responsive avec audit qualité,
 * et exportation fidèle PDF + Word (.docx réellement éditable) + HTML.
 */

import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';
import { jsPDF } from 'jspdf';
import {
  Document as DocxDocument,
  Packer,
  Paragraph,
  TextRun,
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
import { getStorage, ref as storageRef, uploadString, getDownloadURL } from 'firebase/storage';
import { app } from '../firebase';
import { LayoutTargetDocKey } from './layoutImitationService';

if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${
    pdfjsLib.version || '3.11.174'
  }/pdf.worker.min.js`;
}

// ============================================================================
// MODÈLE DE DONNÉES STRICT : ÉLÉMENTS RÉPLICA & ACTIFS PUBLICS
// ============================================================================

export type ReplicaElementKind = 'text' | 'image' | 'table' | 'shape';
export type ReplicaVisualRole =
  | 'logo'
  | 'signature'
  | 'cachet'
  | 'filigrane'
  | 'qrcode'
  | 'barcode'
  | 'illustration';

export interface ReplicaAsset {
  id: string;
  name: string;
  role: ReplicaVisualRole;
  localDataUrl: string;
  publicHttpsUrl?: string;
  hostingStatus: 'local' | 'uploading' | 'hosted' | 'error';
  hostingProvider?: HostingProvider;
  hostingError?: string;
  widthPx: number;
  heightPx: number;
  contentHash: string;
}

export interface ReplicaElementBase {
  id: string;
  kind: ReplicaElementKind;
  name: string;
  pageIndex: number;
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
  zIndex: number;
  rotation: number;
  opacity: number; // 0 à 100
  locked: boolean;
  visible: boolean;
  lockAspectRatio: boolean;
}

export interface ReplicaTextElement extends ReplicaElementBase {
  kind: 'text';
  text: string;
  fontFamily: 'sans-serif' | 'serif' | 'monospace';
  fontSizePt: number;
  fontWeight: '400' | '600' | '700' | '800';
  fontStyle: 'normal' | 'italic';
  textDecoration: 'none' | 'underline';
  color: string;
  backgroundColor: string;
  textAlign: 'left' | 'center' | 'right' | 'justify';
  lineHeight: number;
  letterSpacingEm: number;
  role: 'header' | 'title' | 'subtitle' | 'body' | 'footer';
}

export interface ReplicaImageElement extends ReplicaElementBase {
  kind: 'image';
  assetId: string;
  visualRole: ReplicaVisualRole;
}

export interface ReplicaTableCell {
  text: string;
  bgColor: string;
  textColor: string;
  bold: boolean;
  align: 'left' | 'center' | 'right';
}

export interface ReplicaTableElement extends ReplicaElementBase {
  kind: 'table';
  rows: ReplicaTableCell[][];
  colWidthsPct: number[];
  borderColor: string;
  borderWidthPx: number;
  cellPaddingPx: number;
  fontSizePt: number;
}

export interface ReplicaShapeElement extends ReplicaElementBase {
  kind: 'shape';
  shapeType: 'rect' | 'line_h' | 'line_v';
  fillColor: string;
  strokeColor: string;
  strokeWidthPx: number;
}

export type ReplicaElement =
  | ReplicaTextElement
  | ReplicaImageElement
  | ReplicaTableElement
  | ReplicaShapeElement;

export interface ReplicaProject {
  id: string;
  docKey: LayoutTargetDocKey;
  sourceFileName: string;
  sourceFileType: 'pdf' | 'image';
  analyzedAt: string;
  pageFormat: 'a4' | 'letter';
  orientation: 'portrait' | 'landscape';
  widthMm: number;
  heightMm: number;
  pageBgColor: string;
  marginsMm: { top: number; right: number; bottom: number; left: number };
  palette: { primary: string; accent: string; text: string; highlight: string };
  pageCount: number;
  assets: ReplicaAsset[];
  elements: ReplicaElement[];
  emailSubject: string;
  emailMaxWidthPx: number;
  updatedAt: string;
}

export type HostingProvider = 'cloudinary' | 'imgbb' | 'firebase_storage';

export interface HostingConfig {
  activeProvider: HostingProvider;
  cloudinaryCloudName: string;
  cloudinaryUploadPreset: string;
  imgbbApiKey: string;
}

export const HOSTING_PROVIDER_DOCS: Record<
  HostingProvider,
  {
    label: string;
    quotaInfo: string;
    needsCredentials: boolean;
    setupHint: string;
  }
> = {
  cloudinary: {
    label: 'Cloudinary Free (Upload non signé)',
    quotaInfo:
      'Plan gratuit officiel : 25 crédits/mois (~25 Go bande passante / 25 000 transformations), 10 Mo max/image. Aucune promesse illimitée.',
    needsCredentials: true,
    setupHint: 'Renseignez votre Cloud Name + Upload Preset non signé (Settings > Upload > Unsigned).'
  },
  imgbb: {
    label: 'ImgBB Free (API publique HTTPS)',
    quotaInfo:
      'Plan gratuit : jusqu’à 32 Mo par image, soumise aux limites de débit de l’API gratuite ImgBB.',
    needsCredentials: true,
    setupHint: 'Obtenez une clé gratuite sur api.imgbb.com et collez-la ci-dessous.'
  },
  firebase_storage: {
    label: 'Firebase Storage du Projet',
    quotaInfo:
      'Quota Spark/Blaze du projet Firebase (5 Go stockage / 1 Go/jour sur Spark gratuit) selon règles Storage actives.',
    needsCredentials: false,
    setupHint: 'Utilise le bucket configuré sur le projet Firebase si Cloud Storage et ses règles sont activés.'
  }
};

export interface AuditCheckItem {
  id: string;
  label: string;
  status: 'pass' | 'warn' | 'fail';
  detail: string;
}

export interface EmailQualityAuditResult {
  scorePct: number;
  passedAll: boolean;
  checks: AuditCheckItem[];
  unhostedImagesCount: number;
  missingTextsCount: number;
  totalTextsChecked: number;
  totalImagesChecked: number;
}

// ============================================================================
// PERSISTANCE INDEXEDDB & LOCALSTORAGE (ÉVITE LA LIMITE 1 MO DE FIRESTORE)
// ============================================================================

const IDB_NAME = 'atlantic_replica_studio_db_v1';
const IDB_STORE = 'replica_projects';
const LS_HOSTING_CFG_KEY = 'atlantic_replica_hosting_cfg_v1';
const LS_HOSTED_URL_CACHE_KEY = 'atlantic_replica_hosted_url_cache_v1';

function openReplicaDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB indisponible'));
      return;
    }
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: 'docKey' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Erreur ouverture IndexedDB'));
  });
}

export async function saveReplicaProject(project: ReplicaProject): Promise<void> {
  try {
    const db = await openReplicaDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put({ ...project, updatedAt: new Date().toISOString() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('[ReplicaStudio] Sauvegarde IndexedDB ignorée:', err);
  }
}

export async function loadReplicaProject(docKey: LayoutTargetDocKey): Promise<ReplicaProject | null> {
  try {
    const db = await openReplicaDb();
    return await new Promise<ReplicaProject | null>((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(docKey);
      req.onsuccess = () => resolve((req.result as ReplicaProject) || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function deleteReplicaProject(docKey: LayoutTargetDocKey): Promise<void> {
  try {
    const db = await openReplicaDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).delete(docKey);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // ignore
  }
}

export function getSavedHostingConfig(): HostingConfig {
  try {
    const raw = localStorage.getItem(LS_HOSTING_CFG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        activeProvider: parsed.activeProvider || 'cloudinary',
        cloudinaryCloudName: parsed.cloudinaryCloudName || '',
        cloudinaryUploadPreset: parsed.cloudinaryUploadPreset || '',
        imgbbApiKey: parsed.imgbbApiKey || ''
      };
    }
  } catch {
    // ignore
  }
  return {
    activeProvider: 'cloudinary',
    cloudinaryCloudName: '',
    cloudinaryUploadPreset: '',
    imgbbApiKey: ''
  };
}

export function saveHostingConfig(cfg: HostingConfig): void {
  try {
    localStorage.setItem(LS_HOSTING_CFG_KEY, JSON.stringify(cfg));
  } catch {
    // ignore
  }
}

function getHostedUrlCache(): Record<string, string> {
  try {
    const raw = localStorage.getItem(LS_HOSTED_URL_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setHostedUrlCache(hash: string, url: string): void {
  try {
    const cache = getHostedUrlCache();
    cache[hash] = url;
    localStorage.setItem(LS_HOSTED_URL_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore
  }
}

export function computeFastHash(input: string): string {
  let h = 2166136261;
  const step = Math.max(1, Math.floor(input.length / 4000));
  for (let i = 0; i < input.length; i += step) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `h_${(h >>> 0).toString(16)}_${input.length}`;
}

// ============================================================================
// OUTILS COULEURS & PIXELS POUR ANALYSE FIDÈLE
// ============================================================================

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b]
    .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'))
    .join('')}`.toUpperCase();
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = (hex || '#000000').replace('#', '');
  if (clean.length === 3) {
    return [
      parseInt(clean[0] + clean[0], 16) || 0,
      parseInt(clean[1] + clean[1], 16) || 0,
      parseInt(clean[2] + clean[2], 16) || 0
    ];
  }
  return [
    parseInt(clean.slice(0, 2), 16) || 0,
    parseInt(clean.slice(2, 4), 16) || 0,
    parseInt(clean.slice(4, 6), 16) || 0
  ];
}

function sampleRegionColors(
  imgData: ImageData,
  cw: number,
  ch: number,
  xPct: number,
  yPct: number,
  wPct: number,
  hPct: number
): { inkHex: string; bgHex: string; inkRatio: number } {
  const x0 = Math.max(0, Math.floor((xPct / 100) * cw));
  const y0 = Math.max(0, Math.floor((yPct / 100) * ch));
  const x1 = Math.min(cw - 1, Math.ceil(((xPct + wPct) / 100) * cw));
  const y1 = Math.min(ch - 1, Math.ceil(((yPct + hPct) / 100) * ch));

  const data = imgData.data;
  let bgR = 255,
    bgG = 255,
    bgB = 255,
    bgCount = 0;
  let inkR = 0,
    inkG = 0,
    inkB = 0,
    inkCount = 0;
  let total = 0;

  for (let y = y0; y <= y1; y += 2) {
    for (let x = x0; x <= x1; x += 2) {
      total++;
      const idx = (y * cw + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      if (lum > 228) {
        bgR += r;
        bgG += g;
        bgB += b;
        bgCount++;
      } else {
        inkR += r;
        inkG += g;
        inkB += b;
        inkCount++;
      }
    }
  }

  const inkHex = inkCount > 0 ? rgbToHex(inkR / inkCount, inkG / inkCount, inkB / inkCount) : '#0F172A';
  const bgHex =
    bgCount > 0
      ? rgbToHex(bgR / bgCount, bgG / bgCount, bgB / bgCount)
      : 'transparent';
  return {
    inkHex,
    bgHex: bgHex === '#FFFFFF' || bgHex === '#FEFEFE' || bgHex === '#FDFDFD' ? 'transparent' : bgHex,
    inkRatio: total > 0 ? inkCount / total : 0
  };
}

function detectPageBackgroundAndPalette(
  imgData: ImageData,
  cw: number,
  ch: number
): { pageBgHex: string; primaryHex: string; accentHex: string; highlightHex: string } {
  const data = imgData.data;
  const colorBuckets = new Map<string, { count: number; r: number; g: number; b: number; sat: number }>();

  // Échantillonner bord pour la couleur de page
  let bgR = 255,
    bgG = 255,
    bgB = 255,
    bgSamples = 0;
  for (let x = 4; x < cw - 4; x += 8) {
    for (const y of [4, ch - 5]) {
      const idx = (y * cw + x) * 4;
      const r = data[idx],
        g = data[idx + 1],
        b = data[idx + 2];
      if (0.299 * r + 0.587 * g + 0.114 * b > 205) {
        bgR += r;
        bgG += g;
        bgB += b;
        bgSamples++;
      }
    }
  }
  const pageBgHex =
    bgSamples > 8 ? rgbToHex(bgR / bgSamples, bgG / bgSamples, bgB / bgSamples) : '#FFFFFF';

  for (let y = 0; y < ch; y += 5) {
    for (let x = 0; x < cw; x += 5) {
      const idx = (y * cw + x) * 4;
      const r = data[idx],
        g = data[idx + 1],
        b = data[idx + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const sat = max === 0 ? 0 : (max - min) / max;
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      if (lum > 235 || (lum < 35 && sat < 0.2)) continue;
      if (sat < 0.18) continue;
      const key = `${Math.round(r / 24)}_${Math.round(g / 24)}_${Math.round(b / 24)}`;
      const prev = colorBuckets.get(key);
      if (prev) {
        prev.count++;
      } else {
        colorBuckets.set(key, { count: 1, r, g, b, sat });
      }
    }
  }

  const ranked = Array.from(colorBuckets.values()).sort((a, b) => b.count * (1 + b.sat) - a.count * (1 + a.sat));
  const primaryHex = ranked[0] ? rgbToHex(ranked[0].r, ranked[0].g, ranked[0].b) : '#0B2545';
  const accentHex = ranked[1] ? rgbToHex(ranked[1].r, ranked[1].g, ranked[1].b) : '#0066B3';
  const [pr, pg, pb] = hexToRgb(primaryHex);
  const highlightHex = rgbToHex(pr * 0.14 + 255 * 0.86, pg * 0.14 + 255 * 0.86, pb * 0.14 + 255 * 0.86);

  return {
    pageBgHex: pageBgHex === '#FEFEFE' || pageBgHex === '#FDFDFD' ? '#FFFFFF' : pageBgHex,
    primaryHex,
    accentHex,
    highlightHex
  };
}

// ============================================================================
// DÉTECTION DE TABLEAUX & EXTRACTION DE COMPOSANTS VISUELS RÉELS (SANS IA)
// ============================================================================

interface DetectedGridBox {
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
  rowTopsPct: number[];
  colLeftsPct: number[];
}

function detectRuledTables(imgData: ImageData, cw: number, ch: number): DetectedGridBox[] {
  const data = imgData.data;
  const isInk = (x: number, y: number): boolean => {
    const idx = (y * cw + x) * 4;
    return 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2] < 195;
  };

  // Trouver lignes horizontales longues (>= 30% de la largeur)
  const hLines: { y: number; xStart: number; xEnd: number }[] = [];
  for (let y = Math.round(ch * 0.08); y < Math.round(ch * 0.92); y += 2) {
    let run = 0;
    let bestRun = 0;
    let bestStart = 0;
    let curStart = 0;
    for (let x = Math.round(cw * 0.04); x < Math.round(cw * 0.96); x += 2) {
      if (isInk(x, y) || (y + 1 < ch && isInk(x, y + 1))) {
        if (run === 0) curStart = x;
        run += 2;
        if (run > bestRun) {
          bestRun = run;
          bestStart = curStart;
        }
      } else {
        run = 0;
      }
    }
    if (bestRun >= cw * 0.3) {
      if (hLines.length === 0 || y - hLines[hLines.length - 1].y > 10) {
        hLines.push({ y, xStart: bestStart, xEnd: bestStart + bestRun });
      }
    }
  }

  if (hLines.length < 3) return [];

  // Regrouper les lignes horizontales verticalement proches en blocs de tableau
  const groups: typeof hLines[] = [];
  let curGroup: typeof hLines = [hLines[0]];
  for (let i = 1; i < hLines.length; i++) {
    if (hLines[i].y - hLines[i - 1].y <= ch * 0.14) {
      curGroup.push(hLines[i]);
    } else {
      if (curGroup.length >= 3) groups.push(curGroup);
      curGroup = [hLines[i]];
    }
  }
  if (curGroup.length >= 3) groups.push(curGroup);

  const tables: DetectedGridBox[] = [];
  for (const grp of groups) {
    const topY = grp[0].y;
    const botY = grp[grp.length - 1].y;
    const minX = Math.min(...grp.map((l) => l.xStart));
    const maxX = Math.max(...grp.map((l) => l.xEnd));
    const spanH = botY - topY;
    if (spanH < ch * 0.05) continue;

    // Chercher lignes verticales entre topY et botY
    const vLinesX: number[] = [minX];
    for (let x = minX + 16; x < maxX - 16; x += 3) {
      let vInk = 0;
      let vTotal = 0;
      for (let y = topY; y <= botY; y += 3) {
        vTotal++;
        if (isInk(x, y) || (x + 1 < cw && isInk(x + 1, y))) vInk++;
      }
      if (vTotal > 0 && vInk / vTotal >= 0.65) {
        if (x - vLinesX[vLinesX.length - 1] > cw * 0.05) {
          vLinesX.push(x);
        }
      }
    }
    vLinesX.push(maxX);

    if (vLinesX.length >= 3 && grp.length >= 3) {
      tables.push({
        xPct: (minX / cw) * 100,
        yPct: (topY / ch) * 100,
        wPct: ((maxX - minX) / cw) * 100,
        hPct: ((botY - topY) / ch) * 100,
        rowTopsPct: grp.map((l) => (l.y / ch) * 100),
        colLeftsPct: vLinesX.map((x) => (x / cw) * 100)
      });
    }
  }
  return tables;
}

interface BBoxPct {
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
}

/**
 * Extraction réelle d'éléments graphiques non-textuels (logos, signatures, tampons, QR/barcodes)
 * directement découpés depuis les pixels originaux du document sans aucune image générée.
 */
function extractGraphicRegionsFromCanvas(
  canvas: HTMLCanvasElement,
  imgData: ImageData,
  excludeBoxesPct: BBoxPct[],
  pageIndex: number
): Array<{
  role: ReplicaVisualRole;
  name: string;
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
  dataUrl: string;
  widthPx: number;
  heightPx: number;
}> {
  const cw = canvas.width;
  const ch = canvas.height;
  const gridW = 140;
  const gridH = Math.round((ch / cw) * gridW);
  const cellW = cw / gridW;
  const cellH = ch / gridH;
  const mask = new Uint8Array(gridW * gridH);
  const data = imgData.data;

  const isExcluded = (gx: number, gy: number): boolean => {
    const px = ((gx + 0.5) / gridW) * 100;
    const py = ((gy + 0.5) / gridH) * 100;
    return excludeBoxesPct.some(
      (b) => px >= b.xPct - 0.8 && px <= b.xPct + b.wPct + 0.8 && py >= b.yPct - 0.6 && py <= b.yPct + b.hPct + 0.6
    );
  };

  for (let gy = 1; gy < gridH - 1; gy++) {
    for (let gx = 1; gx < gridW - 1; gx++) {
      if (isExcluded(gx, gy)) continue;
      const sx = Math.floor(gx * cellW);
      const sy = Math.floor(gy * cellH);
      const ex = Math.min(cw - 1, Math.ceil((gx + 1) * cellW));
      const ey = Math.min(ch - 1, Math.ceil((gy + 1) * cellH));
      let inkPixels = 0;
      let totalPixels = 0;
      for (let y = sy; y <= ey; y += 2) {
        for (let x = sx; x <= ex; x += 2) {
          totalPixels++;
          const idx = (y * cw + x) * 4;
          const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
          if (lum < 215) inkPixels++;
        }
      }
      if (totalPixels > 0 && inkPixels / totalPixels >= 0.09) {
        mask[gy * gridW + gx] = 1;
      }
    }
  }

  // BFS Connected Components (avec voisinage à distance 2 pour regrouper logos/cachets)
  const visited = new Uint8Array(gridW * gridH);
  const comps: Array<{ minX: number; minY: number; maxX: number; maxY: number; cells: number }> = [];

  for (let gy = 0; gy < gridH; gy++) {
    for (let gx = 0; gx < gridW; gx++) {
      const start = gy * gridW + gx;
      if (!mask[start] || visited[start]) continue;
      const queue = [start];
      visited[start] = 1;
      let minX = gx,
        maxX = gx,
        minY = gy,
        maxY = gy,
        cells = 0;
      while (queue.length > 0) {
        const cur = queue.pop()!;
        const cx = cur % gridW;
        const cy = Math.floor(cur / gridW);
        cells++;
        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx < 0 || nx >= gridW || ny < 0 || ny >= gridH) continue;
            const nIdx = ny * gridW + nx;
            if (mask[nIdx] && !visited[nIdx]) {
              visited[nIdx] = 1;
              queue.push(nIdx);
            }
          }
        }
      }
      const wCells = maxX - minX + 1;
      const hCells = maxY - minY + 1;
      // Filtrer petites poussières ou cadres pleine page
      if (cells >= 4 && wCells >= 3 && hCells >= 2 && !(wCells > gridW * 0.85 && hCells > gridH * 0.85)) {
        comps.push({ minX, minY, maxX, maxY, cells });
      }
    }
  }

  // Trier par taille visuelle et limiter aux 10 composants graphiques significatifs par page
  comps.sort((a, b) => b.cells - a.cells);
  const picked = comps.slice(0, 10);

  const results: Array<{
    role: ReplicaVisualRole;
    name: string;
    xPct: number;
    yPct: number;
    wPct: number;
    hPct: number;
    dataUrl: string;
    widthPx: number;
    heightPx: number;
  }> = [];

  for (let i = 0; i < picked.length; i++) {
    const c = picked[i];
    const padPx = 6;
    const sx = Math.max(0, Math.floor(c.minX * cellW) - padPx);
    const sy = Math.max(0, Math.floor(c.minY * cellH) - padPx);
    const ex = Math.min(cw, Math.ceil((c.maxX + 1) * cellW) + padPx);
    const ey = Math.min(ch, Math.ceil((c.maxY + 1) * cellH) + padPx);
    const sw = Math.max(12, ex - sx);
    const sh = Math.max(12, ey - sy);

    const xPct = Math.round(((sx / cw) * 100) * 10) / 10;
    const yPct = Math.round(((sy / ch) * 100) * 10) / 10;
    const wPct = Math.round(((sw / cw) * 100) * 10) / 10;
    const hPct = Math.round(((sh / ch) * 100) * 10) / 10;

    // Ignorer fines lignes isolées (filets horizontaux/verticaux)
    if (hPct < 1.2 || wPct < 2) continue;

    // Rogner les pixels exacts du document source
    const crop = document.createElement('canvas');
    const maxCropDim = 560;
    const scale = Math.min(1, maxCropDim / Math.max(sw, sh));
    crop.width = Math.max(16, Math.round(sw * scale));
    crop.height = Math.max(16, Math.round(sh * scale));
    const cctx = crop.getContext('2d');
    if (!cctx) continue;
    cctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, crop.width, crop.height);

    // Rendre les pixels quasi-blancs transparents pour une incrustation propre sur tout fond
    const cropImg = cctx.getImageData(0, 0, crop.width, crop.height);
    const px = cropImg.data;
    for (let k = 0; k < px.length; k += 4) {
      if (px[k] > 242 && px[k + 1] > 242 && px[k + 2] > 242) {
        px[k + 3] = 0;
      }
    }
    cctx.putImageData(cropImg, 0, 0);

    const aspect = sw / sh;
    let role: ReplicaVisualRole = 'illustration';
    let label = `Visuel extrait #${i + 1}`;
    if (yPct < 24 && hPct < 22) {
      role = 'logo';
      label = `Logo / En-tête (P${pageIndex + 1})`;
    } else if (yPct > 64 && wPct < 26 && hPct < 16 && aspect >= 0.7 && aspect <= 1.35) {
      role = yPct > 80 && xPct < 24 ? 'qrcode' : 'cachet';
      label = role === 'qrcode' ? `QR Code / Code 2D (P${pageIndex + 1})` : `Cachet / Tampon (P${pageIndex + 1})`;
    } else if (yPct > 58 && yPct < 88 && hPct < 16) {
      role = 'signature';
      label = `Signature / Paraphe (P${pageIndex + 1})`;
    } else if (yPct > 82 && aspect > 2.6 && hPct < 9) {
      role = 'barcode';
      label = `Code-Barres (P${pageIndex + 1})`;
    } else if (wPct > 35 && hPct > 30) {
      role = 'filigrane';
      label = `Filigrane / Motif fond (P${pageIndex + 1})`;
    }

    results.push({
      role,
      name: label,
      xPct,
      yPct,
      wPct,
      hPct,
      dataUrl: crop.toDataURL('image/png'),
      widthPx: crop.width,
      heightPx: crop.height
    });
  }

  return results;
}

// ============================================================================
// ÉTAPES 1 À 3 : ANALYSE PROFONDE ET RECONSTRUCTION FIDÈLE D'UN DOCUMENT
// ============================================================================

export async function deepAnalyzeSourceDocument(
  file: File,
  docKey: LayoutTargetDocKey,
  onProgress?: (pct: number, label: string) => void
): Promise<ReplicaProject> {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  const projectId = `replica_${docKey}_${Date.now()}`;
  const assets: ReplicaAsset[] = [];
  const elements: ReplicaElement[] = [];

  let pageFormat: 'a4' | 'letter' = 'a4';
  let orientation: 'portrait' | 'landscape' = 'portrait';
  let widthMm = 210;
  let heightMm = 297;
  let pageBgColor = '#FFFFFF';
  let palette = { primary: '#0B2545', accent: '#0066B3', text: '#1E293B', highlight: '#E8F2FF' };
  let pageCount = 1;

  if (isPdf) {
    onProgress?.(10, 'Lecture du document PDF multi-pages...');
    const buffer = await file.arrayBuffer();
    const pdfDoc = await pdfjsLib.getDocument({ data: buffer }).promise;
    pageCount = Math.min(4, pdfDoc.numPages);

    for (let pNum = 1; pNum <= pageCount; pNum++) {
      onProgress?.(15 + Math.round((pNum / pageCount) * 55), `Analyse fidèle page ${pNum}/${pageCount}...`);
      const page = await pdfDoc.getPage(pNum);
      const viewport1x = page.getViewport({ scale: 1.0 });
      if (pNum === 1) {
        orientation = viewport1x.width > viewport1x.height ? 'landscape' : 'portrait';
        const shortPt = Math.min(viewport1x.width, viewport1x.height);
        pageFormat = shortPt > 602 ? 'letter' : 'a4';
        widthMm =
          orientation === 'landscape'
            ? pageFormat === 'letter'
              ? 279.4
              : 297
            : pageFormat === 'letter'
            ? 215.9
            : 210;
        heightMm =
          orientation === 'landscape'
            ? pageFormat === 'letter'
              ? 215.9
              : 210
            : pageFormat === 'letter'
            ? 279.4
            : 297;
      }

      const renderScale = 2.0;
      const vp = page.getViewport({ scale: renderScale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(vp.width);
      canvas.height = Math.round(vp.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport: vp }).promise;

      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      if (pNum === 1) {
        const pal = detectPageBackgroundAndPalette(imgData, canvas.width, canvas.height);
        pageBgColor = pal.pageBgHex;
        palette = {
          primary: pal.primaryHex,
          accent: pal.accentHex,
          text: '#1E293B',
          highlight: pal.highlightHex
        };
      }

      // Extraction texte natif PDF + styles
      const textContent = await page.getTextContent();
      const stylesMap = (textContent.styles || {}) as Record<string, { fontFamily?: string }>;

      interface RawSpan {
        text: string;
        xPct: number;
        yPct: number;
        wPct: number;
        hPct: number;
        fontSizePt: number;
        bold: boolean;
        italic: boolean;
        fontFamily: 'sans-serif' | 'serif' | 'monospace';
      }

      const spans: RawSpan[] = [];
      for (const rawItem of textContent.items as Array<{
        str?: string;
        transform?: number[];
        width?: number;
        height?: number;
        fontName?: string;
      }>) {
        const txt = (rawItem.str || '').replace(/\s+/g, ' ');
        if (!txt.trim() || !rawItem.transform) continue;
        const tx = rawItem.transform;
        const [vx, vy] = vp.convertToViewportPoint(tx[4], tx[5]);
        const fontHeightPt = Math.max(7, Math.min(34, Math.hypot(tx[2], tx[3]) || rawItem.height || 10));
        const hPx = fontHeightPt * renderScale;
        const wPx = Math.max(8, (rawItem.width || txt.length * fontHeightPt * 0.48) * renderScale);

        const xPct = Math.max(1, Math.min(97, (vx / canvas.width) * 100));
        const yPct = Math.max(1, Math.min(97, ((vy - hPx * 0.85) / canvas.height) * 100));
        const wPct = Math.max(2, Math.min(98 - xPct, (wPx / canvas.width) * 100));
        const hPct = Math.max(1.5, Math.min(12, (hPx / canvas.height) * 100));

        const styleName = `${rawItem.fontName || ''} ${stylesMap[rawItem.fontName || '']?.fontFamily || ''}`.toLowerCase();
        const fontFamily: 'sans-serif' | 'serif' | 'monospace' =
          styleName.includes('times') || styleName.includes('serif') || styleName.includes('garamond') || styleName.includes('georgia')
            ? 'serif'
            : styleName.includes('courier') || styleName.includes('mono')
            ? 'monospace'
            : 'sans-serif';

        spans.push({
          text: txt,
          xPct,
          yPct,
          wPct,
          hPct,
          fontSizePt: Math.round(fontHeightPt * 10) / 10,
          bold: styleName.includes('bold') || styleName.includes('black') || fontHeightPt >= 13.5,
          italic: styleName.includes('italic') || styleName.includes('oblique'),
          fontFamily
        });
      }

      // Fusionner fragments proches sur une même ligne et colonne (sans fusionner deux colonnes éloignées!)
      spans.sort((a, b) => a.yPct - b.yPct || a.xPct - b.xPct);
      const mergedLines: RawSpan[] = [];
      for (const sp of spans) {
        const prev = mergedLines[mergedLines.length - 1];
        if (
          prev &&
          Math.abs(prev.yPct - sp.yPct) < 0.75 &&
          sp.xPct - (prev.xPct + prev.wPct) < 3.2 &&
          sp.xPct >= prev.xPct - 1
        ) {
          const gap = sp.xPct - (prev.xPct + prev.wPct) > 0.3 ? ' ' : '';
          prev.text = `${prev.text}${gap}${sp.text}`.replace(/\s+/g, ' ');
          const right = Math.max(prev.xPct + prev.wPct, sp.xPct + sp.wPct);
          prev.wPct = right - prev.xPct;
          prev.hPct = Math.max(prev.hPct, sp.hPct);
          prev.fontSizePt = Math.max(prev.fontSizePt, sp.fontSizePt);
          prev.bold = prev.bold || sp.bold;
        } else {
          mergedLines.push({ ...sp });
        }
      }

      // Si PDF scanné (0 texte natif), fallback OCR Tesseract sur ce canvas
      if (mergedLines.length === 0) {
        const ocrSpans = await runCanvasOcrSpans(canvas, imgData);
        mergedLines.push(...ocrSpans);
      }

      // Détection de tableaux structurés sur la page
      const detectedTables = detectRuledTables(imgData, canvas.width, canvas.height);
      const consumedByTable = new Set<number>();

      detectedTables.forEach((tbl, tIdx) => {
        const rCount = tbl.rowTopsPct.length - 1;
        const cCount = tbl.colLeftsPct.length - 1;
        const rows: ReplicaTableCell[][] = [];
        for (let r = 0; r < rCount; r++) {
          const yA = tbl.rowTopsPct[r];
          const yB = tbl.rowTopsPct[r + 1];
          const rowCells: ReplicaTableCell[] = [];
          for (let c = 0; c < cCount; c++) {
            const xA = tbl.colLeftsPct[c];
            const xB = tbl.colLeftsPct[c + 1];
            const cellTexts: string[] = [];
            let anyBold = false;
            mergedLines.forEach((ln, lnIdx) => {
              const cx = ln.xPct + ln.wPct / 2;
              const cy = ln.yPct + ln.hPct / 2;
              if (cx >= xA - 0.8 && cx <= xB + 0.8 && cy >= yA - 0.5 && cy <= yB + 0.5) {
                cellTexts.push(ln.text.trim());
                anyBold = anyBold || ln.bold;
                consumedByTable.add(lnIdx);
              }
            });
            const sample = sampleRegionColors(imgData, canvas.width, canvas.height, xA + 0.5, yA + 0.4, Math.max(1, xB - xA - 1), Math.max(1, yB - yA - 0.8));
            const cellBg = sample.bgHex !== 'transparent' ? sample.bgHex : r === 0 ? palette.highlight : '#FFFFFF';
            rowCells.push({
              text: cellTexts.join(' '),
              bgColor: cellBg,
              textColor: sample.inkHex || '#0F172A',
              bold: r === 0 || anyBold,
              align: c > 0 && r > 0 ? 'center' : 'left'
            });
          }
          rows.push(rowCells);
        }

        const totalTblW = Math.max(1, tbl.wPct);
        const colWidthsPct = [];
        for (let c = 0; c < cCount; c++) {
          colWidthsPct.push(Math.round((((tbl.colLeftsPct[c + 1] - tbl.colLeftsPct[c]) / totalTblW) * 100) * 10) / 10);
        }

        elements.push({
          id: `tbl_p${pNum}_${tIdx + 1}`,
          kind: 'table',
          name: `Tableau P${pNum} (${rCount}×${cCount})`,
          pageIndex: pNum - 1,
          xPct: Math.round(tbl.xPct * 10) / 10,
          yPct: Math.round(tbl.yPct * 10) / 10,
          wPct: Math.round(tbl.wPct * 10) / 10,
          hPct: Math.round(tbl.hPct * 10) / 10,
          zIndex: 12,
          rotation: 0,
          opacity: 100,
          locked: false,
          visible: true,
          lockAspectRatio: false,
          rows,
          colWidthsPct,
          borderColor: '#94A3B8',
          borderWidthPx: 1,
          cellPaddingPx: 6,
          fontSizePt: 9.5
        });
      });

      // Ajouter les textes hors tableau avec couleurs réelles échantillonnées
      const excludeBoxes: BBoxPct[] = [...detectedTables];
      mergedLines.forEach((ln, idx) => {
        if (consumedByTable.has(idx)) return;
        excludeBoxes.push({ xPct: ln.xPct, yPct: ln.yPct, wPct: ln.wPct, hPct: ln.hPct });
        const sample = sampleRegionColors(imgData, canvas.width, canvas.height, ln.xPct, ln.yPct, ln.wPct, ln.hPct);
        const centerPct = ln.xPct + ln.wPct / 2;
        const align: 'left' | 'center' | 'right' =
          ln.xPct > 55 ? 'right' : Math.abs(centerPct - 50) < 8 && ln.xPct > 15 ? 'center' : 'left';
        const role: ReplicaTextElement['role'] =
          ln.yPct < 14
            ? 'header'
            : ln.fontSizePt >= 14.5
            ? 'title'
            : ln.fontSizePt >= 11.5 && ln.yPct < 45
            ? 'subtitle'
            : ln.yPct > 87
            ? 'footer'
            : 'body';

        elements.push({
          id: `txt_p${pNum}_${idx + 1}`,
          kind: 'text',
          name: ln.text.trim().slice(0, 26) || `Texte ${idx + 1}`,
          pageIndex: pNum - 1,
          xPct: Math.round(ln.xPct * 10) / 10,
          yPct: Math.round(ln.yPct * 10) / 10,
          wPct: Math.max(8, Math.round(ln.wPct * 10) / 10),
          hPct: Math.max(2.2, Math.round((ln.hPct + 0.6) * 10) / 10),
          zIndex: 20,
          rotation: 0,
          opacity: 100,
          locked: false,
          visible: true,
          lockAspectRatio: false,
          text: ln.text.trim(),
          fontFamily: ln.fontFamily,
          fontSizePt: ln.fontSizePt,
          fontWeight: ln.bold ? '700' : '400',
          fontStyle: ln.italic ? 'italic' : 'normal',
          textDecoration: 'none',
          color: sample.inkHex,
          backgroundColor: sample.bgHex,
          textAlign: align,
          lineHeight: 1.32,
          letterSpacingEm: 0,
          role
        });
      });

      // Extraction réelle des visuels découpés sur la page
      const crops = extractGraphicRegionsFromCanvas(canvas, imgData, excludeBoxes, pNum - 1);
      crops.forEach((crop, cIdx) => {
        const assetId = `asset_p${pNum}_${cIdx + 1}`;
        const hash = computeFastHash(crop.dataUrl);
        const cachedUrl = getHostedUrlCache()[hash];
        assets.push({
          id: assetId,
          name: crop.name,
          role: crop.role,
          localDataUrl: crop.dataUrl,
          publicHttpsUrl: cachedUrl,
          hostingStatus: cachedUrl ? 'hosted' : 'local',
          widthPx: crop.widthPx,
          heightPx: crop.heightPx,
          contentHash: hash
        });
        elements.push({
          id: `img_p${pNum}_${cIdx + 1}`,
          kind: 'image',
          name: crop.name,
          pageIndex: pNum - 1,
          xPct: crop.xPct,
          yPct: crop.yPct,
          wPct: crop.wPct,
          hPct: crop.hPct,
          zIndex: crop.role === 'filigrane' ? 5 : 25,
          rotation: 0,
          opacity: crop.role === 'filigrane' ? 35 : 100,
          locked: false,
          visible: true,
          lockAspectRatio: true,
          assetId,
          visualRole: crop.role
        });
      });
    }
  } else {
    // IMAGE SOURCE (PNG / JPG / WEBP)
    onProgress?.(20, 'Chargement haute résolution de l’image...');
    const imgUrl = await fileToDataUrl(file);
    const imgEl = await loadHtmlImage(imgUrl);
    const maxDim = 1550;
    const scale = Math.min(1, maxDim / Math.max(imgEl.naturalWidth || 800, imgEl.naturalHeight || 1100));
    const cw = Math.max(200, Math.round((imgEl.naturalWidth || 800) * scale));
    const ch = Math.max(200, Math.round((imgEl.naturalHeight || 1100) * scale));

    orientation = cw > ch ? 'landscape' : 'portrait';
    widthMm = orientation === 'landscape' ? 297 : 210;
    heightMm = orientation === 'landscape' ? 210 : 297;

    const canvas = document.createElement('canvas');
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(imgEl, 0, 0, cw, ch);
    const imgData = ctx.getImageData(0, 0, cw, ch);

    const pal = detectPageBackgroundAndPalette(imgData, cw, ch);
    pageBgColor = pal.pageBgHex;
    palette = { primary: pal.primaryHex, accent: pal.accentHex, text: '#1E293B', highlight: pal.highlightHex };

    onProgress?.(45, 'Reconnaissance OCR et extraction typographique...');
    const ocrSpans = await runCanvasOcrSpans(canvas, imgData);
    onProgress?.(72, 'Détection de tableaux & extraction des logos/tampons...');
    const detectedTables = detectRuledTables(imgData, cw, ch);
    const consumed = new Set<number>();

    detectedTables.forEach((tbl, tIdx) => {
      const rCount = tbl.rowTopsPct.length - 1;
      const cCount = tbl.colLeftsPct.length - 1;
      const rows: ReplicaTableCell[][] = [];
      for (let r = 0; r < rCount; r++) {
        const yA = tbl.rowTopsPct[r];
        const yB = tbl.rowTopsPct[r + 1];
        const rowCells: ReplicaTableCell[] = [];
        for (let c = 0; c < cCount; c++) {
          const xA = tbl.colLeftsPct[c];
          const xB = tbl.colLeftsPct[c + 1];
          const cellTexts: string[] = [];
          ocrSpans.forEach((ln, idx) => {
            const cx = ln.xPct + ln.wPct / 2;
            const cy = ln.yPct + ln.hPct / 2;
            if (cx >= xA - 1 && cx <= xB + 1 && cy >= yA - 0.8 && cy <= yB + 0.8) {
              cellTexts.push(ln.text.trim());
              consumed.add(idx);
            }
          });
          rowCells.push({
            text: cellTexts.join(' '),
            bgColor: r === 0 ? palette.highlight : '#FFFFFF',
            textColor: '#0F172A',
            bold: r === 0,
            align: c > 0 && r > 0 ? 'center' : 'left'
          });
        }
        rows.push(rowCells);
      }
      const totalW = Math.max(1, tbl.wPct);
      elements.push({
        id: `tbl_p1_${tIdx + 1}`,
        kind: 'table',
        name: `Tableau P1 (${rCount}×${cCount})`,
        pageIndex: 0,
        xPct: Math.round(tbl.xPct * 10) / 10,
        yPct: Math.round(tbl.yPct * 10) / 10,
        wPct: Math.round(tbl.wPct * 10) / 10,
        hPct: Math.round(tbl.hPct * 10) / 10,
        zIndex: 12,
        rotation: 0,
        opacity: 100,
        locked: false,
        visible: true,
        lockAspectRatio: false,
        rows,
        colWidthsPct: Array.from({ length: cCount }, (_, c) =>
          Math.round((((tbl.colLeftsPct[c + 1] - tbl.colLeftsPct[c]) / totalW) * 100) * 10) / 10
        ),
        borderColor: '#94A3B8',
        borderWidthPx: 1,
        cellPaddingPx: 6,
        fontSizePt: 9.5
      });
    });

    const excludeBoxes: BBoxPct[] = [...detectedTables];
    ocrSpans.forEach((ln, idx) => {
      if (consumed.has(idx)) return;
      excludeBoxes.push({ xPct: ln.xPct, yPct: ln.yPct, wPct: ln.wPct, hPct: ln.hPct });
      const sample = sampleRegionColors(imgData, cw, ch, ln.xPct, ln.yPct, ln.wPct, ln.hPct);
      const centerPct = ln.xPct + ln.wPct / 2;
      const align: 'left' | 'center' | 'right' =
        ln.xPct > 55 ? 'right' : Math.abs(centerPct - 50) < 8 && ln.xPct > 15 ? 'center' : 'left';
      elements.push({
        id: `txt_p1_${idx + 1}`,
        kind: 'text',
        name: ln.text.trim().slice(0, 26) || `Texte ${idx + 1}`,
        pageIndex: 0,
        xPct: Math.round(ln.xPct * 10) / 10,
        yPct: Math.round(ln.yPct * 10) / 10,
        wPct: Math.max(8, Math.round(ln.wPct * 10) / 10),
        hPct: Math.max(2.2, Math.round((ln.hPct + 0.6) * 10) / 10),
        zIndex: 20,
        rotation: 0,
        opacity: 100,
        locked: false,
        visible: true,
        lockAspectRatio: false,
        text: ln.text.trim(),
        fontFamily: ln.fontFamily,
        fontSizePt: ln.fontSizePt,
        fontWeight: ln.bold ? '700' : '400',
        fontStyle: 'normal',
        textDecoration: 'none',
        color: sample.inkHex,
        backgroundColor: sample.bgHex,
        textAlign: align,
        lineHeight: 1.32,
        letterSpacingEm: 0,
        role: ln.yPct < 14 ? 'header' : ln.fontSizePt >= 14 ? 'title' : 'body'
      });
    });

    const crops = extractGraphicRegionsFromCanvas(canvas, imgData, excludeBoxes, 0);
    crops.forEach((crop, cIdx) => {
      const assetId = `asset_p1_${cIdx + 1}`;
      const hash = computeFastHash(crop.dataUrl);
      const cachedUrl = getHostedUrlCache()[hash];
      assets.push({
        id: assetId,
        name: crop.name,
        role: crop.role,
        localDataUrl: crop.dataUrl,
        publicHttpsUrl: cachedUrl,
        hostingStatus: cachedUrl ? 'hosted' : 'local',
        widthPx: crop.widthPx,
        heightPx: crop.heightPx,
        contentHash: hash
      });
      elements.push({
        id: `img_p1_${cIdx + 1}`,
        kind: 'image',
        name: crop.name,
        pageIndex: 0,
        xPct: crop.xPct,
        yPct: crop.yPct,
        wPct: crop.wPct,
        hPct: crop.hPct,
        zIndex: crop.role === 'filigrane' ? 5 : 25,
        rotation: 0,
        opacity: crop.role === 'filigrane' ? 35 : 100,
        locked: false,
        visible: true,
        lockAspectRatio: true,
        assetId,
        visualRole: crop.role
      });
    });
  }

  onProgress?.(100, 'Reconstruction interactive prête.');
  const nowIso = new Date().toISOString();
  const project: ReplicaProject = {
    id: projectId,
    docKey,
    sourceFileName: file.name,
    sourceFileType: isPdf ? 'pdf' : 'image',
    analyzedAt: nowIso,
    pageFormat,
    orientation,
    widthMm,
    heightMm,
    pageBgColor,
    marginsMm: { top: 14, right: 14, bottom: 14, left: 14 },
    palette,
    pageCount,
    assets,
    elements,
    emailSubject: file.name.replace(/\.[^.]+$/, ''),
    emailMaxWidthPx: 600,
    updatedAt: nowIso
  };

  await saveReplicaProject(project);
  return project;
}

async function runCanvasOcrSpans(
  canvas: HTMLCanvasElement,
  _imgData: ImageData
): Promise<
  Array<{
    text: string;
    xPct: number;
    yPct: number;
    wPct: number;
    hPct: number;
    fontSizePt: number;
    bold: boolean;
    italic: boolean;
    fontFamily: 'sans-serif' | 'serif' | 'monospace';
  }>
> {
  try {
    const res = await Promise.race([
      Tesseract.recognize(canvas, 'fra+eng'),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 12000))
    ]);
    if (!res) return [];
    const dataAny = res.data as unknown as {
      lines?: Array<{ text?: string; bbox?: { x0: number; y0: number; x1: number; y1: number } }>;
    };
    const cw = Math.max(1, canvas.width);
    const ch = Math.max(1, canvas.height);
    const out: Array<{
      text: string;
      xPct: number;
      yPct: number;
      wPct: number;
      hPct: number;
      fontSizePt: number;
      bold: boolean;
      italic: boolean;
      fontFamily: 'sans-serif' | 'serif' | 'monospace';
    }> = [];

    for (const ln of dataAny.lines || []) {
      const clean = (ln.text || '').replace(/\s+/g, ' ').trim();
      if (clean.length < 2 || !ln.bbox) continue;
      const xPct = Math.max(2, Math.min(92, (ln.bbox.x0 / cw) * 100));
      const yPct = Math.max(2, Math.min(96, (ln.bbox.y0 / ch) * 100));
      const wPct = Math.max(6, Math.min(94 - xPct, ((ln.bbox.x1 - ln.bbox.x0) / cw) * 100));
      const hPx = Math.max(10, ln.bbox.y1 - ln.bbox.y0);
      const hPct = Math.max(1.8, Math.min(12, (hPx / ch) * 100));
      const fontSizePt = Math.max(8, Math.min(26, Math.round(((hPx / ch) * 842 * 0.72) * 10) / 10));
      out.push({
        text: clean,
        xPct,
        yPct,
        wPct,
        hPct,
        fontSizePt,
        bold: fontSizePt >= 12.5 || (clean === clean.toUpperCase() && clean.length >= 4),
        italic: false,
        fontFamily: 'sans-serif'
      });
    }
    return out;
  } catch {
    return [];
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ''));
    r.onerror = () => reject(new Error('Impossible de lire le fichier'));
    r.readAsDataURL(file);
  });
}

function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image source invalide'));
    img.src = src;
  });
}

// ============================================================================
// ÉTAPE 7 : HÉBERGEMENT PUBLIC HTTPS RÉEL DES VISUELS (SANS URL FICTIVE)
// ============================================================================

export async function uploadSingleAssetToPublicHost(
  asset: ReplicaAsset,
  cfg: HostingConfig
): Promise<ReplicaAsset> {
  if (!asset.localDataUrl) {
    return { ...asset, hostingStatus: 'error', hostingError: 'Aucune donnée image locale à transférer.' };
  }

  // Réutiliser si déjà en cache HTTPS pour ce hash exact
  const cached = getHostedUrlCache()[asset.contentHash];
  if (cached && cached.startsWith('https://')) {
    return {
      ...asset,
      publicHttpsUrl: cached,
      hostingStatus: 'hosted',
      hostingProvider: cfg.activeProvider,
      hostingError: undefined
    };
  }

  try {
    if (cfg.activeProvider === 'cloudinary') {
      const cloudName = cfg.cloudinaryCloudName.trim();
      const preset = cfg.cloudinaryUploadPreset.trim();
      if (!cloudName || !preset) {
        return {
          ...asset,
          hostingStatus: 'error',
          hostingProvider: 'cloudinary',
          hostingError: 'Configuration Cloudinary requise (Cloud Name et Upload Preset non signé).'
        };
      }
      const fd = new FormData();
      fd.append('file', asset.localDataUrl);
      fd.append('upload_preset', preset);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`, {
        method: 'POST',
        body: fd
      });
      const json = (await res.json()) as { secure_url?: string; error?: { message?: string } };
      if (!res.ok || !json.secure_url) {
        return {
          ...asset,
          hostingStatus: 'error',
          hostingProvider: 'cloudinary',
          hostingError: json.error?.message || `Erreur Cloudinary HTTP ${res.status}`
        };
      }
      setHostedUrlCache(asset.contentHash, json.secure_url);
      return {
        ...asset,
        publicHttpsUrl: json.secure_url,
        hostingStatus: 'hosted',
        hostingProvider: 'cloudinary',
        hostingError: undefined
      };
    }

    if (cfg.activeProvider === 'imgbb') {
      const apiKey = cfg.imgbbApiKey.trim();
      if (!apiKey) {
        return {
          ...asset,
          hostingStatus: 'error',
          hostingProvider: 'imgbb',
          hostingError: 'Clé API ImgBB gratuite requise.'
        };
      }
      const cleanBase64 = asset.localDataUrl.includes(',') ? asset.localDataUrl.split(',')[1] : asset.localDataUrl;
      const fd = new FormData();
      fd.append('image', cleanBase64);
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        body: fd
      });
      const json = (await res.json()) as { data?: { url?: string }; error?: { message?: string } };
      const secureUrl = json.data?.url?.replace(/^http:\/\//i, 'https://');
      if (!res.ok || !secureUrl) {
        return {
          ...asset,
          hostingStatus: 'error',
          hostingProvider: 'imgbb',
          hostingError: json.error?.message || `Erreur ImgBB HTTP ${res.status}`
        };
      }
      setHostedUrlCache(asset.contentHash, secureUrl);
      return {
        ...asset,
        publicHttpsUrl: secureUrl,
        hostingStatus: 'hosted',
        hostingProvider: 'imgbb',
        hostingError: undefined
      };
    }

    // Firebase Storage du projet
    const storage = getStorage(app);
    const sRef = storageRef(storage, `replica_public_assets/${asset.contentHash}_${Date.now()}.png`);
    await uploadString(sRef, asset.localDataUrl, 'data_url');
    const url = await getDownloadURL(sRef);
    setHostedUrlCache(asset.contentHash, url);
    return {
      ...asset,
      publicHttpsUrl: url,
      hostingStatus: 'hosted',
      hostingProvider: 'firebase_storage',
      hostingError: undefined
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Échec réseau lors de l’hébergement HTTPS.';
    return {
      ...asset,
      hostingStatus: 'error',
      hostingProvider: cfg.activeProvider,
      hostingError: errMsg
    };
  }
}

// ============================================================================
// ÉTAPE 6 : COMPILATEUR HTML EMAIL RESPONSIVE (TABLES + CSS INLINE + MSO)
// ============================================================================

export function compileReplicaToEmailHtml(
  project: ReplicaProject,
  options?: { preferPublicHttps?: boolean }
): string {
  const preferHttps = options?.preferPublicHttps !== false;
  const maxW = Math.max(480, Math.min(680, project.emailMaxWidthPx || 600));
  const assetById = new Map(project.assets.map((a) => [a.id, a]));
  const pagesIndices = Array.from(new Set(project.elements.filter((e) => e.visible).map((e) => e.pageIndex))).sort(
    (a, b) => a - b
  );

  const renderElementCellHtml = (el: ReplicaElement): string => {
    if (el.kind === 'text') {
      const fStack =
        el.fontFamily === 'serif'
          ? 'Georgia, "Times New Roman", Times, serif'
          : el.fontFamily === 'monospace'
          ? '"Courier New", Courier, monospace'
          : 'Arial, Helvetica, sans-serif';
      const pxSize = Math.max(10, Math.round(el.fontSizePt * 1.25));
      const bgStyle =
        el.backgroundColor && el.backgroundColor !== 'transparent'
          ? `background-color:${el.backgroundColor};padding:4px 8px;border-radius:3px;`
          : '';
      const escText = escapeXml(el.text).replace(/\n/g, '<br/>');
      return `<div style="font-family:${fStack};font-size:${pxSize}px;font-weight:${el.fontWeight};font-style:${el.fontStyle};text-decoration:${el.textDecoration};color:${el.color};text-align:${el.textAlign};line-height:${el.lineHeight};letter-spacing:${el.letterSpacingEm}em;${bgStyle}margin:0;">${escText}</div>`;
    }

    if (el.kind === 'image') {
      const asset = assetById.get(el.assetId);
      const src = preferHttps ? asset?.publicHttpsUrl || asset?.localDataUrl || '' : asset?.localDataUrl || '';
      const targetW = Math.max(28, Math.round((el.wPct / 100) * (maxW - 48)));
      const targetH = Math.max(18, Math.round((el.hPct / 100) * 760));
      if (!src) return '';
      return `<img src="${escapeXml(src)}" alt="${escapeXml(el.name)}" width="${targetW}" height="${targetH}" style="display:block;border:0;outline:none;text-decoration:none;max-width:100%;height:auto;width:${targetW}px;opacity:${(
        el.opacity / 100
      ).toFixed(2)};" />`;
    }

    if (el.kind === 'table') {
      const rowsHtml = el.rows
        .map((row) => {
          const cellsHtml = row
            .map((cell, cIdx) => {
              const colW = el.colWidthsPct[cIdx] ? `width:${el.colWidthsPct[cIdx]}%;` : '';
              return `<td align="${cell.align}" valign="middle" style="${colW}background-color:${cell.bgColor};color:${cell.textColor};font-family:Arial,Helvetica,sans-serif;font-size:${Math.max(
                10,
                Math.round(el.fontSizePt * 1.2)
              )}px;font-weight:${cell.bold ? '700' : '400'};padding:${el.cellPaddingPx}px;border:${
                el.borderWidthPx
              }px solid ${el.borderColor};">${escapeXml(cell.text)}</td>`;
            })
            .join('');
          return `<tr>${cellsHtml}</tr>`;
        })
        .join('');
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">${rowsHtml}</table>`;
    }

    if (el.kind === 'shape') {
      if (el.shapeType === 'line_h') {
        return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-top:${Math.max(
          1,
          el.strokeWidthPx
        )}px solid ${el.strokeColor};font-size:1px;line-height:1px;">&nbsp;</td></tr></table>`;
      }
      return `<div style="background-color:${el.fillColor};border:${el.strokeWidthPx}px solid ${el.strokeColor};height:16px;">&nbsp;</div>`;
    }

    return '';
  };

  const pageRowsHtml: string[] = [];

  for (const pageIdx of pagesIndices.length > 0 ? pagesIndices : [0]) {
    const pageEls = project.elements
      .filter((e) => e.visible && e.pageIndex === pageIdx && (e.kind !== 'image' || e.visualRole !== 'filigrane'))
      .sort((a, b) => a.yPct - b.yPct || a.xPct - b.xPct);

    // Regrouper en bandes horizontales pour préserver les colonnes côte à côte (en-têtes 2 col, signatures, etc.)
    const bands: ReplicaElement[][] = [];
    for (const el of pageEls) {
      const lastBand = bands[bands.length - 1];
      if (lastBand && Math.abs(lastBand[0].yPct - el.yPct) <= 3.6) {
        lastBand.push(el);
      } else {
        bands.push([el]);
      }
    }

    for (const band of bands) {
      band.sort((a, b) => a.xPct - b.xPct);
      if (band.length === 1) {
        const el = band[0];
        const inner = renderElementCellHtml(el);
        if (!inner) continue;
        const padLeft = el.kind === 'text' && el.textAlign === 'left' && el.xPct > 12 ? Math.min(48, Math.round(el.xPct * 2.2)) : 0;
        pageRowsHtml.push(
          `<tr><td style="padding:6px 24px 6px ${24 + padLeft}px;">${inner}</td></tr>`
        );
      } else {
        const tds = band
          .map((el) => {
            const w = Math.max(18, Math.min(82, Math.round(el.wPct)));
            const alignAttr = el.kind === 'text' ? el.textAlign : el.xPct > 52 ? 'right' : 'left';
            return `<td class="stack-col" width="${w}%" align="${alignAttr === 'justify' ? 'left' : alignAttr}" valign="top" style="padding:4px 8px;">${renderElementCellHtml(
              el
            )}</td>`;
          })
          .join('');
        pageRowsHtml.push(
          `<tr><td style="padding:6px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;"><tr>${tds}</tr></table></td></tr>`
        );
      }
    }
  }

  return `<!DOCTYPE html>
<html lang="fr" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${escapeXml(project.emailSubject || project.sourceFileName)}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td { font-family: Arial, Helvetica, sans-serif !important; }
  </style>
  <![endif]-->
  <style type="text/css">
    body { margin: 0 !important; padding: 0 !important; background-color: #f1f5f9; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    img { border: 0; line-height: 100%; outline: none; text-decoration: none; max-width: 100%; height: auto; }
    table { border-collapse: collapse !important; }
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
      .stack-col { display: block !important; width: 100% !important; max-width: 100% !important; text-align: left !important; padding-left: 0 !important; padding-right: 0 !important; }
    }
  </style>
</head>
<body style="margin:0;padding:18px 8px;background-color:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
  <center style="width:100%;background-color:#f1f5f9;">
    <!--[if mso]>
    <table role="presentation" align="center" border="0" cellspacing="0" cellpadding="0" width="${maxW}">
    <tr><td valign="top" width="${maxW}">
    <![endif]-->
    <table role="presentation" class="email-container" align="center" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:${maxW}px;margin:0 auto;background-color:${
    project.pageBgColor || '#ffffff'
  };border-radius:6px;overflow:hidden;box-shadow:0 2px 12px rgba(15,23,42,0.08);">
      <tbody>
        <tr><td style="height:6px;background-color:${project.palette.primary};font-size:1px;line-height:1px;">&nbsp;</td></tr>
        ${pageRowsHtml.join('\n        ')}
        <tr><td style="padding:14px 24px 18px 24px;border-top:1px solid #e2e8f0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#64748b;text-align:center;">Document HTML compatible messagerie responsive · ${escapeXml(
          project.sourceFileName
        )}</td></tr>
      </tbody>
    </table>
    <!--[if mso]>
    </td></tr></table>
    <![endif]-->
  </center>
</body>
</html>`;
}

// ============================================================================
// ÉTAPE 7 : CONTRÔLE QUALITÉ AUTOMATIQUE & AUTO-CORRECTION HTML EMAIL
// ============================================================================

export function auditCompiledEmailHtml(project: ReplicaProject, html: string): EmailQualityAuditResult {
  const checks: AuditCheckItem[] = [];
  const lower = (html || '').toLowerCase();

  // 1. Complétude des textes visibles (text + tableaux)
  const expectedTexts: string[] = [];
  for (const el of project.elements) {
    if (!el.visible) continue;
    if (el.kind === 'text' && el.text.trim().length > 0) {
      expectedTexts.push(el.text.trim());
    } else if (el.kind === 'table') {
      for (const row of el.rows) {
        for (const cell of row) {
          if (cell.text.trim().length > 0) expectedTexts.push(cell.text.trim());
        }
      }
    }
  }
  const decodedHtmlText = html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();

  const missingTexts = expectedTexts.filter((t) => !decodedHtmlText.includes(t.replace(/\s+/g, ' ').trim()));
  checks.push({
    id: 'text_completeness',
    label: '1. Complétude intégrale des textes',
    status: expectedTexts.length === 0 ? 'warn' : missingTexts.length === 0 ? 'pass' : 'fail',
    detail:
      missingTexts.length === 0
        ? `${expectedTexts.length}/${expectedTexts.length} blocs & cellules présents dans le HTML.`
        : `${missingTexts.length} texte(s) manquant(s) : « ${missingTexts[0].slice(0, 40)}... »`
  });

  // 2. URL publiques HTTPS sur toutes les images visibles
  const imgSrcMatches = Array.from(html.matchAll(/<img\b[^>]*\bsrc=["']([^"']*)["']/gi)).map((m) => m[1]);
  const unhostedImgs = imgSrcMatches.filter((s) => !/^https:\/\//i.test(s));
  checks.push({
    id: 'public_https_images',
    label: '2. Visuels hébergés en HTTPS public',
    status:
      imgSrcMatches.length === 0
        ? 'pass'
        : unhostedImgs.length === 0
        ? 'pass'
        : 'fail',
    detail:
      imgSrcMatches.length === 0
        ? 'Aucune balise image requise dans ce modèle.'
        : unhostedImgs.length === 0
        ? `${imgSrcMatches.length}/${imgSrcMatches.length} images utilisent une URL HTTPS publique valide.`
        : `${unhostedImgs.length} image(s) non hébergée(s) (URI locale data:/blob: — Gmail/Outlook bloqueront l’affichage).`
  });

  // 3. Attributs width, height, alt, max-width:100%
  const imgTags = Array.from(html.matchAll(/<img\b[^>]*>/gi)).map((m) => m[0]);
  const badAttrs = imgTags.filter(
    (tag) => !/width=/i.test(tag) || !/alt=/i.test(tag) || !/max-width:\s*100%/i.test(tag)
  );
  checks.push({
    id: 'image_attributes',
    label: '3. Proportions & attributs HTML images',
    status: badAttrs.length === 0 ? 'pass' : 'warn',
    detail:
      badAttrs.length === 0
        ? 'Dimensions explicites, attribut alt et max-width:100% conformes.'
        : `${badAttrs.length} balise(s) image sans attribut width/alt/max-width.`
  });

  // 4. Architecture tableau sans bordures techniques
  const hasPresentationTables = lower.includes('role="presentation"') && lower.includes('cellpadding="0"');
  const hasTechOutline = /dashed\s+#dc2626|contenteditable/i.test(html);
  checks.push({
    id: 'table_architecture',
    label: '4. Structure en tableaux & zéro bordure technique',
    status: hasPresentationTables && !hasTechOutline ? 'pass' : 'fail',
    detail:
      hasPresentationTables && !hasTechOutline
        ? 'Structure tableaux email propre sans attributs contenteditable ni pointillés de studio.'
        : 'Bordure technique ou attribut studio détecté dans la sortie email.'
  });

  // 5. Zéro JS & CSS inline
  const hasScript = /<script\b/i.test(html);
  checks.push({
    id: 'no_js_inline_css',
    label: '5. Zéro JavaScript & CSS inline email-safe',
    status: !hasScript && lower.includes('style="') ? 'pass' : 'fail',
    detail: !hasScript ? 'Aucun script JS, styles inline conformes.' : 'Balise <script> interdite détectée.'
  });

  // 6. Responsive Mobile 620px
  const hasResponsiveCss = lower.includes('@media') && lower.includes('620px') && lower.includes('name="viewport"');
  checks.push({
    id: 'mobile_responsive',
    label: '6. Adaptation responsive Mobile / Tablette',
    status: hasResponsiveCss ? 'pass' : 'fail',
    detail: hasResponsiveCss
      ? 'Media query @media (max-width:620px) et viewport mobile actifs.'
      : 'Règles responsive mobiles manquantes.'
  });

  // 7. Compatibilité Gmail / Outlook / Apple Mail / Yahoo
  const hasMsoFallback = lower.includes('<!--[if mso]>') && lower.includes('arial,helvetica,sans-serif');
  checks.push({
    id: 'client_compat',
    label: '7. Compatibilité Gmail, Outlook, Yahoo, Apple Mail',
    status: hasMsoFallback ? 'pass' : 'warn',
    detail: hasMsoFallback
      ? 'Commentaires conditionnels MSO Outlook et piles de polices email présents.'
      : 'Ajouter les commentaires conditionnels Outlook MSO.'
  });

  const passWeight = checks.reduce((acc, c) => acc + (c.status === 'pass' ? 1 : c.status === 'warn' ? 0.5 : 0), 0);
  const scorePct = Math.round((passWeight / checks.length) * 100);
  const passedAll = checks.every((c) => c.status === 'pass');

  return {
    scorePct,
    passedAll,
    checks,
    unhostedImagesCount: unhostedImgs.length,
    missingTextsCount: missingTexts.length,
    totalTextsChecked: expectedTexts.length,
    totalImagesChecked: imgSrcMatches.length
  };
}

export function repairCompiledEmailHtml(
  project: ReplicaProject,
  currentHtml: string
): { fixedHtml: string; audit: EmailQualityAuditResult } {
  // Régénération propre si bordure technique ou attribut studio présent, sinon patch CSS/attributs
  let repaired = currentHtml
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\scontenteditable="true"/gi, '')
    .replace(/\soutline:[^;"]*dashed[^;"]*;?/gi, '');

  repaired = repaired.replace(/<img\b([^>]*)>/gi, (full, attrs) => {
    let nextAttrs = attrs;
    if (!/alt=/i.test(nextAttrs)) nextAttrs += ' alt="Visuel document"';
    if (!/max-width:/i.test(nextAttrs)) {
      nextAttrs = nextAttrs.replace(/style="([^"]*)"/i, 'style="$1;max-width:100%;height:auto;"');
    }
    return `<img${nextAttrs}>`;
  });

  let audit = auditCompiledEmailHtml(project, repaired);
  if (audit.missingTextsCount > 0 || !repaired.includes('role="presentation"')) {
    repaired = compileReplicaToEmailHtml(project, { preferPublicHttps: true });
    audit = auditCompiledEmailHtml(project, repaired);
  }
  return { fixedHtml: repaired, audit };
}

// ============================================================================
// ÉTAPE 8 : EXPORTATEURS FIDÈLES PDF ET WORD (.DOCX RÉELLEMENT ÉDITABLE)
// ============================================================================

export async function exportReplicaProjectToPdf(
  project: ReplicaProject
): Promise<{ doc: jsPDF; filename: string; blob: Blob }> {
  const doc = new jsPDF({
    orientation: project.orientation,
    unit: 'mm',
    format: project.pageFormat,
    compress: true
  });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const assetById = new Map(project.assets.map((a) => [a.id, a]));
  const pages = Math.max(1, project.pageCount);
  const [bgR, bgG, bgB] = hexToRgb(project.pageBgColor || '#FFFFFF');

  for (let p = 0; p < pages; p++) {
    if (p > 0) doc.addPage(project.pageFormat, project.orientation);
    doc.setFillColor(bgR, bgG, bgB);
    doc.rect(0, 0, pageW, pageH, 'F');

    const pageEls = project.elements
      .filter((e) => e.visible && e.pageIndex === p)
      .sort((a, b) => a.zIndex - b.zIndex);

    for (const el of pageEls) {
      const xMm = (el.xPct / 100) * pageW;
      const yMm = (el.yPct / 100) * pageH;
      const wMm = (el.wPct / 100) * pageW;
      const hMm = (el.hPct / 100) * pageH;

      if (el.kind === 'shape') {
        const [sr, sg, sb] = hexToRgb(el.strokeColor || '#0B2545');
        const [fr, fg, fb] = hexToRgb(el.fillColor || '#FFFFFF');
        doc.setDrawColor(sr, sg, sb);
        doc.setLineWidth(Math.max(0.2, el.strokeWidthPx * 0.26));
        if (el.shapeType === 'line_h') {
          doc.line(xMm, yMm, xMm + wMm, yMm);
        } else if (el.shapeType === 'line_v') {
          doc.line(xMm, yMm, xMm, yMm + hMm);
        } else {
          doc.setFillColor(fr, fg, fb);
          doc.rect(xMm, yMm, wMm, hMm, 'FD');
        }
      } else if (el.kind === 'image') {
        const asset = assetById.get(el.assetId);
        if (asset?.localDataUrl) {
          try {
            doc.addImage(asset.localDataUrl, 'PNG', xMm, yMm, wMm, hMm, undefined, 'FAST', el.rotation || 0);
          } catch {
            // ignore bad format
          }
        }
      } else if (el.kind === 'table') {
        const rCount = el.rows.length;
        if (rCount === 0) continue;
        const rowH = hMm / rCount;
        let curY = yMm;
        const [br, bg, bb] = hexToRgb(el.borderColor || '#94A3B8');
        doc.setDrawColor(br, bg, bb);
        doc.setLineWidth(Math.max(0.18, el.borderWidthPx * 0.24));

        for (const row of el.rows) {
          let curX = xMm;
          for (let c = 0; c < row.length; c++) {
            const cell = row[c];
            const colRatio = (el.colWidthsPct[c] || 100 / row.length) / 100;
            const cW = wMm * colRatio;
            if (cell.bgColor && cell.bgColor !== 'transparent') {
              const [cr, cg, cb] = hexToRgb(cell.bgColor);
              doc.setFillColor(cr, cg, cb);
              doc.rect(curX, curY, cW, rowH, 'FD');
            } else {
              doc.rect(curX, curY, cW, rowH, 'D');
            }
            const [tr, tg, tb] = hexToRgb(cell.textColor || '#0F172A');
            doc.setTextColor(tr, tg, tb);
            doc.setFont('helvetica', cell.bold ? 'bold' : 'normal');
            doc.setFontSize(Math.max(6.5, el.fontSizePt));
            const tx =
              cell.align === 'center' ? curX + cW / 2 : cell.align === 'right' ? curX + cW - 1.5 : curX + 1.5;
            doc.text(cell.text || '', tx, curY + rowH * 0.62, {
              align: cell.align,
              maxWidth: Math.max(4, cW - 3)
            });
            curX += cW;
          }
          curY += rowH;
        }
      } else if (el.kind === 'text') {
        if (el.backgroundColor && el.backgroundColor !== 'transparent') {
          const [br, bg, bb] = hexToRgb(el.backgroundColor);
          doc.setFillColor(br, bg, bb);
          doc.rect(xMm - 0.5, yMm, wMm + 1, Math.max(hMm, el.fontSizePt * 0.45), 'F');
        }
        const pdfFont =
          el.fontFamily === 'serif' ? 'times' : el.fontFamily === 'monospace' ? 'courier' : 'helvetica';
        const isBold = el.fontWeight === '700' || el.fontWeight === '800' || el.fontWeight === '600';
        const isItalic = el.fontStyle === 'italic';
        const pdfStyle = isBold && isItalic ? 'bolditalic' : isBold ? 'bold' : isItalic ? 'italic' : 'normal';
        doc.setFont(pdfFont, pdfStyle);
        doc.setFontSize(Math.max(6.5, el.fontSizePt));
        const [tr, tg, tb] = hexToRgb(el.color || '#0F172A');
        doc.setTextColor(tr, tg, tb);
        const baselineY = yMm + el.fontSizePt * 0.36;
        const alignX =
          el.textAlign === 'center' ? xMm + wMm / 2 : el.textAlign === 'right' ? xMm + wMm : xMm;
        doc.text(el.text || '', alignX, baselineY, {
          align: el.textAlign === 'justify' ? 'left' : el.textAlign,
          maxWidth: Math.max(12, wMm)
        });
      }
    }
  }

  const baseName = project.sourceFileName.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]+/g, '_');
  const filename = `${baseName}_Reproduit_Modifie.pdf`;
  return { doc, filename, blob: doc.output('blob') };
}

/**
 * Exporte le projet répliqué en un vrai fichier Word (.docx) entièrement éditable
 * (paragraphes, styles de texte, tableaux Word modifiables, et images extraites intégrées)
 * sans aplatir la page en une seule capture image.
 */
export async function exportReplicaProjectToDocx(
  project: ReplicaProject
): Promise<{ blob: Blob; filename: string }> {
  const assetById = new Map(project.assets.map((a) => [a.id, a]));
  const pagesIndices = Array.from(new Set(project.elements.filter((e) => e.visible).map((e) => e.pageIndex))).sort(
    (a, b) => a - b
  );

  const dataUrlToUint8 = (dataUrl: string): Uint8Array | null => {
    try {
      const b64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
      const bin = atob(b64);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      return arr;
    } catch {
      return null;
    }
  };

  const mapDocxAlign = (align: string) =>
    align === 'center'
      ? AlignmentType.CENTER
      : align === 'right'
      ? AlignmentType.RIGHT
      : align === 'justify'
      ? AlignmentType.JUSTIFIED
      : AlignmentType.LEFT;

  const elementToDocxBlock = (el: ReplicaElement): Array<Paragraph | Table> => {
    if (el.kind === 'text') {
      const fontName =
        el.fontFamily === 'serif' ? 'Georgia' : el.fontFamily === 'monospace' ? 'Courier New' : 'Calibri';
      const hexNoHash = (el.color || '#0F172A').replace('#', '');
      return [
        new Paragraph({
          alignment: mapDocxAlign(el.textAlign),
          spacing: { after: 100 },
          children: [
            new TextRun({
              text: el.text,
              font: fontName,
              size: Math.max(14, Math.round(el.fontSizePt * 2)),
              bold: el.fontWeight === '700' || el.fontWeight === '800' || el.fontWeight === '600',
              italics: el.fontStyle === 'italic',
              underline: el.textDecoration === 'underline' ? {} : undefined,
              color: hexNoHash.length === 6 ? hexNoHash : '0F172A'
            })
          ]
        })
      ];
    }

    if (el.kind === 'image') {
      const asset = assetById.get(el.assetId);
      const bytes = asset?.localDataUrl ? dataUrlToUint8(asset.localDataUrl) : null;
      if (!bytes) return [];
      const wPx = Math.max(28, Math.round((el.wPct / 100) * 620));
      const hPx = Math.max(20, Math.round((el.hPct / 100) * 860));
      return [
        new Paragraph({
          alignment: el.xPct > 52 ? AlignmentType.RIGHT : el.xPct > 28 ? AlignmentType.CENTER : AlignmentType.LEFT,
          spacing: { after: 100 },
          children: [
            new ImageRun({
              data: bytes,
              type: 'png',
              transformation: { width: wPx, height: hPx }
            })
          ]
        })
      ];
    }

    if (el.kind === 'table') {
      const borderHex = (el.borderColor || '#94A3B8').replace('#', '');
      const borders = {
        top: { style: BorderStyle.SINGLE, size: 4, color: borderHex },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: borderHex },
        left: { style: BorderStyle.SINGLE, size: 4, color: borderHex },
        right: { style: BorderStyle.SINGLE, size: 4, color: borderHex }
      };
      const rows = el.rows.map(
        (r) =>
          new TableRow({
            children: r.map(
              (cell, cIdx) =>
                new TableCell({
                  width: {
                    size: Math.round(el.colWidthsPct[cIdx] || 100 / r.length),
                    type: WidthType.PERCENTAGE
                  },
                  shading:
                    cell.bgColor && cell.bgColor !== 'transparent'
                      ? { fill: cell.bgColor.replace('#', ''), type: ShadingType.CLEAR }
                      : undefined,
                  borders,
                  children: [
                    new Paragraph({
                      alignment: mapDocxAlign(cell.align),
                      children: [
                        new TextRun({
                          text: cell.text,
                          bold: cell.bold,
                          size: Math.max(16, Math.round(el.fontSizePt * 2)),
                          color: (cell.textColor || '#0F172A').replace('#', '')
                        })
                      ]
                    })
                  ]
                })
            )
          })
      );
      return [
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows
        }),
        new Paragraph({ text: '' })
      ];
    }

    return [];
  };

  const sections = (pagesIndices.length > 0 ? pagesIndices : [0]).map((pIdx) => {
    const pageEls = project.elements
      .filter((e) => e.visible && e.pageIndex === pIdx && (e.kind !== 'image' || e.visualRole !== 'filigrane'))
      .sort((a, b) => a.yPct - b.yPct || a.xPct - b.xPct);

    // Grouper en bandes horizontales : si >=2 éléments côte à côte, utiliser une table Word sans bordures
    const bands: ReplicaElement[][] = [];
    for (const el of pageEls) {
      const last = bands[bands.length - 1];
      if (last && Math.abs(last[0].yPct - el.yPct) <= 3.5 && last.every((x) => x.kind !== 'table') && el.kind !== 'table') {
        last.push(el);
      } else {
        bands.push([el]);
      }
    }

    const children: Array<Paragraph | Table> = [];
    const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };

    for (const band of bands) {
      band.sort((a, b) => a.xPct - b.xPct);
      if (band.length === 1) {
        children.push(...elementToDocxBlock(band[0]));
      } else {
        children.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: band.map(
                  (colEl) =>
                    new TableCell({
                      width: { size: Math.round(100 / band.length), type: WidthType.PERCENTAGE },
                      borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
                      children: elementToDocxBlock(colEl)
                    })
                )
              })
            ]
          })
        );
      }
    }

    return {
      properties: {
        page: {
          size: {
            width: convertMillimetersToTwip(project.widthMm),
            height: convertMillimetersToTwip(project.heightMm),
            orientation:
              project.orientation === 'landscape' ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT
          },
          margin: {
            top: convertMillimetersToTwip(project.marginsMm.top),
            right: convertMillimetersToTwip(project.marginsMm.right),
            bottom: convertMillimetersToTwip(project.marginsMm.bottom),
            left: convertMillimetersToTwip(project.marginsMm.left)
          }
        }
      },
      children
    };
  });

  const docx = new DocxDocument({ sections });
  const blob = await Packer.toBlob(docx);
  const baseName = project.sourceFileName.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]+/g, '_');
  return { blob, filename: `${baseName}_Editable.docx` };
}

function escapeXml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
