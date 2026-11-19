/**
 * Moteur professionnel de reproduction fidèle hybride multi-étapes,
 * édition interactive style Canva, comparateur visuel de fidélité,
 * hébergement HTTPS d'actifs visuels avec vérification réelle,
 * compilation Email HTML multi-clients avec audit de compatibilité 10 points,
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
import { parseDocxDocument, parseLegacyDocDocument } from './replicaWordParser';

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
  httpsVerified?: boolean;
  httpsVerifyDetail?: string;
  widthPx: number;
  heightPx: number;
  contentHash: string;
  sourceEngine?: 'crop' | 'pdf_image' | 'word_media' | 'upload';
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

export interface ReplicaExtractionReport {
  textBlocksCount: number;
  tableCount: number;
  shapeCount: number;
  visualCount: number;
  ocrUsed: boolean;
  marginsDetectedMm: { top: number; right: number; bottom: number; left: number };
  engineNotes: string[];
}

export interface ReplicaProject {
  id: string;
  docKey: LayoutTargetDocKey;
  sourceFileName: string;
  sourceFileType: 'pdf' | 'image' | 'docx' | 'doc';
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
  sourcePageSnapshots?: string[];
  extractionReport?: ReplicaExtractionReport;
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
      'Quota Spark/Blaze du projet Firebase (5 Go stockage / 1 Go/jour sur Spark gratuit) selon règles Storage et CORS actifs.',
    needsCredentials: false,
    setupHint: 'Utilise le bucket configuré sur le projet Firebase si Cloud Storage et ses règles publiques sont activés.'
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
  htmlSizeKb: number;
}

export interface VisualFidelityIssue {
  severity: 'info' | 'warn' | 'error';
  code: 'distorted_image' | 'out_of_bounds' | 'missing_snapshot' | 'uncovered_zone' | 'unhosted_visual';
  message: string;
  elementId?: string;
}

export interface VisualFidelityReport {
  hasSourceSnapshot: boolean;
  dimensionsOk: boolean;
  distortedImagesCount: number;
  outOfBoundsCount: number;
  coveragePct: number | null;
  uncoveredZonesCount: number;
  fidelityScorePct: number;
  issues: VisualFidelityIssue[];
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
// OUTILS COULEURS, GÉOMÉTRIE & RATIO D'ASPECT STRICT
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

function colorDist(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

/**
 * Calcule la hauteur en % sur la page garantissant un ratio 100% fidèle à l'image naturelle.
 */
export function computeAspectLockedHeightPct(
  wPct: number,
  assetWidthPx: number,
  assetHeightPx: number,
  pageWidthMm: number,
  pageHeightMm: number
): number {
  if (!assetWidthPx || !assetHeightPx || !pageWidthMm || !pageHeightMm) return Math.max(2, wPct * 0.5);
  const wMm = (wPct / 100) * pageWidthMm;
  const hMm = wMm * (assetHeightPx / assetWidthPx);
  return Math.max(1.2, Math.min(85, Math.round(((hMm / pageHeightMm) * 100) * 10) / 10));
}

function sampleRegionColors(
  imgData: ImageData,
  cw: number,
  ch: number,
  xPct: number,
  yPct: number,
  wPct: number,
  hPct: number,
  pageBgHex = '#FFFFFF'
): { inkHex: string; bgHex: string; inkRatio: number } {
  const x0 = Math.max(0, Math.floor((xPct / 100) * cw));
  const y0 = Math.max(0, Math.floor((yPct / 100) * ch));
  const x1 = Math.min(cw - 1, Math.ceil(((xPct + wPct) / 100) * cw));
  const y1 = Math.min(ch - 1, Math.ceil(((yPct + hPct) / 100) * ch));
  const [pBgR, pBgG, pBgB] = hexToRgb(pageBgHex);

  const data = imgData.data;
  let bgR = 0,
    bgG = 0,
    bgB = 0,
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
      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      const sat = maxC > 0 ? (maxC - minC) / maxC : 0;

      if (lum < 190 || (lum < 215 && sat > 0.35)) {
        inkR += r;
        inkG += g;
        inkB += b;
        inkCount++;
      } else {
        bgR += r;
        bgG += g;
        bgB += b;
        bgCount++;
      }
    }
  }

  const inkHex = inkCount > 0 ? rgbToHex(inkR / inkCount, inkG / inkCount, inkB / inkCount) : '#0F172A';
  let bgHex = 'transparent';
  if (bgCount > 4) {
    const avgR = bgR / bgCount;
    const avgG = bgG / bgCount;
    const avgB = bgB / bgCount;
    // N'attribuer un fond coloré que s'il diffère nettement du fond papier blanc/uniforme (ex: pastille bleue/verte)
    if (colorDist(avgR, avgG, avgB, pBgR, pBgG, pBgB) > 22 && bgCount / Math.max(1, total) > 0.4) {
      bgHex = rgbToHex(avgR, avgG, avgB);
    }
  }

  return {
    inkHex,
    bgHex,
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

  let bgR = 0,
    bgG = 0,
    bgB = 0,
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
// DÉTECTION DE TABLEAUX, LIGNES SÉPARATRICES, BANDES COLORÉES & VISUELS RÉELS
// ============================================================================

interface DetectedGridBox {
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
  rowTopsPct: number[];
  colLeftsPct: number[];
}

interface DetectedShapeBox {
  shapeType: 'rect' | 'line_h' | 'line_v';
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
  fillColor: string;
  strokeColor: string;
  strokeWidthPx: number;
}

function detectRuledTables(imgData: ImageData, cw: number, ch: number): DetectedGridBox[] {
  const data = imgData.data;
  const isInk = (x: number, y: number): boolean => {
    const idx = (y * cw + x) * 4;
    return 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2] < 195;
  };

  const hLines: { y: number; xStart: number; xEnd: number }[] = [];
  for (let y = Math.round(ch * 0.06); y < Math.round(ch * 0.94); y += 2) {
    let run = 0;
    let bestRun = 0;
    let bestStart = 0;
    let curStart = 0;
    for (let x = Math.round(cw * 0.03); x < Math.round(cw * 0.97); x += 2) {
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
    if (bestRun >= cw * 0.28) {
      if (hLines.length === 0 || y - hLines[hLines.length - 1].y > 10) {
        hLines.push({ y, xStart: bestStart, xEnd: bestStart + bestRun });
      }
    }
  }

  if (hLines.length < 3) return [];

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
    if (spanH < ch * 0.045) continue;

    const vLinesX: number[] = [minX];
    for (let x = minX + 16; x < maxX - 16; x += 3) {
      let vInk = 0;
      let vTotal = 0;
      for (let y = topY; y <= botY; y += 3) {
        vTotal++;
        if (isInk(x, y) || (x + 1 < cw && isInk(x + 1, y))) vInk++;
      }
      if (vTotal > 0 && vInk / vTotal >= 0.62) {
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

/**
 * Détecte les lignes horizontales décoratives isolées (hors tableaux) et bandeaux pleine largeur
 * afin de les convertir en formes vectorielles nettes plutôt qu'en rognages bitmap.
 */
function detectStandaloneShapesAndRules(
  imgData: ImageData,
  cw: number,
  ch: number,
  tableBoxes: DetectedGridBox[],
  textBoxes: BBoxPct[]
): DetectedShapeBox[] {
  const data = imgData.data;
  const shapes: DetectedShapeBox[] = [];

  const inTable = (xPct: number, yPct: number) =>
    tableBoxes.some(
      (t) =>
        xPct >= t.xPct - 1 &&
        xPct <= t.xPct + t.wPct + 1 &&
        yPct >= t.yPct - 1 &&
        yPct <= t.yPct + t.hPct + 1
    );

  const overlapsText = (xPct: number, yPct: number) =>
    textBoxes.some(
      (b) =>
        xPct >= b.xPct - 0.4 &&
        xPct <= b.xPct + b.wPct + 0.4 &&
        yPct >= b.yPct - 0.3 &&
        yPct <= b.yPct + b.hPct + 0.3
    );

  for (let y = Math.round(ch * 0.04); y < Math.round(ch * 0.96); y += 3) {
    const yPct = (y / ch) * 100;
    let run = 0;
    let bestRun = 0;
    let bestStart = 0;
    let curStart = 0;
    let rSum = 0,
      gSum = 0,
      bSum = 0,
      cSum = 0;

    for (let x = Math.round(cw * 0.03); x < Math.round(cw * 0.97); x += 3) {
      const idx = (y * cw + x) * 4;
      const r = data[idx],
        g = data[idx + 1],
        b = data[idx + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const isLinePixel = lum < 205;
      if (isLinePixel) {
        if (run === 0) curStart = x;
        run += 3;
        rSum += r;
        gSum += g;
        bSum += b;
        cSum++;
        if (run > bestRun) {
          bestRun = run;
          bestStart = curStart;
        }
      } else {
        run = 0;
      }
    }

    if (bestRun >= cw * 0.38) {
      const xPct = (bestStart / cw) * 100;
      const wPct = (bestRun / cw) * 100;
      const midX = xPct + wPct / 2;
      if (inTable(midX, yPct) || overlapsText(midX, yPct)) continue;

      // Vérifier qu'il s'agit bien d'une ligne fine (épaisseur verticale <= 1.2% de hauteur)
      let thicknessPx = 0;
      for (let dy = -3; dy <= 10; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= ch) continue;
        const idx = (yy * cw + Math.round(bestStart + bestRun * 0.5)) * 4;
        const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        if (lum < 205) thicknessPx++;
      }

      if (thicknessPx >= 1 && thicknessPx <= 9) {
        const lastShape = shapes[shapes.length - 1];
        if (lastShape && Math.abs(lastShape.yPct - yPct) < 1.2) continue;
        const hex = cSum > 0 ? rgbToHex(rSum / cSum, gSum / cSum, bSum / cSum) : '#0B2545';
        shapes.push({
          shapeType: 'line_h',
          xPct: Math.round(xPct * 10) / 10,
          yPct: Math.round(yPct * 10) / 10,
          wPct: Math.round(wPct * 10) / 10,
          hPct: 0.4,
          fillColor: hex,
          strokeColor: hex,
          strokeWidthPx: Math.max(1, Math.min(4, Math.round(thicknessPx / 2)))
        });
      }
    }
  }

  return shapes.slice(0, 14);
}

interface BBoxPct {
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
}

/**
 * Flood-fill depuis les 4 bords extérieurs uniquement : rend transparent le fond papier extérieur
 * sans jamais trouer les lettres blanches ou détails internes d'un logo foncé ou d'un QR code !
 */
function stripOuterPaperFloodFill(
  cropCanvas: HTMLCanvasElement,
  pageBgHex: string
): void {
  const ctx = cropCanvas.getContext('2d');
  if (!ctx) return;
  const w = cropCanvas.width;
  const h = cropCanvas.height;
  if (w < 4 || h < 4) return;

  const img = ctx.getImageData(0, 0, w, h);
  const px = img.data;
  const [bgR, bgG, bgB] = hexToRgb(pageBgHex);

  const isBackgroundCandidate = (idx4: number): boolean => {
    const r = px[idx4],
      g = px[idx4 + 1],
      b = px[idx4 + 2],
      a = px[idx4 + 3];
    if (a < 20) return true;
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const dist = colorDist(r, g, b, bgR, bgG, bgB);
    return lum > 236 || dist < 24;
  };

  // Vérifier d'abord que les coins contiennent effectivement du papier de fond (sinon c'est une photo pleine)
  let cornerBgHits = 0;
  for (const [cx, cy] of [
    [0, 0],
    [w - 1, 0],
    [0, h - 1],
    [w - 1, h - 1]
  ]) {
    if (isBackgroundCandidate((cy * w + cx) * 4)) cornerBgHits++;
  }
  if (cornerBgHits < 2) return;

  const visited = new Uint8Array(w * h);
  const stack: number[] = [];

  for (let x = 0; x < w; x++) {
    stack.push(x);
    stack.push((h - 1) * w + x);
  }
  for (let y = 1; y < h - 1; y++) {
    stack.push(y * w);
    stack.push(y * w + (w - 1));
  }

  while (stack.length > 0) {
    const pos = stack.pop()!;
    if (visited[pos]) continue;
    visited[pos] = 1;
    const idx4 = pos * 4;
    if (!isBackgroundCandidate(idx4)) continue;
    px[idx4 + 3] = 0;

    const x = pos % w;
    const y = (pos - x) / w;
    if (x > 0 && !visited[pos - 1]) stack.push(pos - 1);
    if (x + 1 < w && !visited[pos + 1]) stack.push(pos + 1);
    if (y > 0 && !visited[pos - w]) stack.push(pos - w);
    if (y + 1 < h && !visited[pos + w]) stack.push(pos + w);
  }

  ctx.putImageData(img, 0, 0);
}

function classifyCroppedGraphicRole(
  crop: HTMLCanvasElement,
  xPct: number,
  yPct: number,
  wPct: number,
  hPct: number,
  pageIndex: number
): { role: ReplicaVisualRole; name: string } {
  const aspect = crop.width / Math.max(1, crop.height);
  const ctx = crop.getContext('2d');
  let redOrBlueInkRatio = 0;
  let darkNeutralRatio = 0;
  let nonTransparentCount = 0;

  if (ctx) {
    const px = ctx.getImageData(0, 0, crop.width, crop.height).data;
    for (let i = 0; i < px.length; i += 16) {
      if (px[i + 3] < 40) continue;
      nonTransparentCount++;
      const r = px[i],
        g = px[i + 1],
        b = px[i + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      if (max - min > 38 && (r > g + 25 || b > g + 20)) redOrBlueInkRatio++;
      if (r < 95 && g < 95 && b < 95) darkNeutralRatio++;
    }
  }

  const coloredFrac = nonTransparentCount > 0 ? redOrBlueInkRatio / nonTransparentCount : 0;
  const darkFrac = nonTransparentCount > 0 ? darkNeutralRatio / nonTransparentCount : 0;

  if (yPct < 24 && hPct < 22) {
    return { role: 'logo', name: `Logo / En-tête (P${pageIndex + 1})` };
  }
  if (yPct > 76 && aspect > 2.5 && hPct < 9) {
    return { role: 'barcode', name: `Code-Barres (P${pageIndex + 1})` };
  }
  if (yPct > 74 && aspect >= 0.78 && aspect <= 1.25 && darkFrac > 0.35 && coloredFrac < 0.08 && wPct < 18) {
    return { role: 'qrcode', name: `QR Code / Code 2D (P${pageIndex + 1})` };
  }
  if ((coloredFrac > 0.18 || (yPct > 55 && aspect >= 0.68 && aspect <= 1.45 && wPct < 26)) && hPct < 20) {
    return { role: 'cachet', name: `Cachet / Tampon (P${pageIndex + 1})` };
  }
  if (yPct > 54 && hPct < 16 && darkFrac < 0.35 && aspect > 1.25) {
    return { role: 'signature', name: `Signature / Paraphe (P${pageIndex + 1})` };
  }
  if (wPct > 34 && hPct > 28) {
    return { role: 'filigrane', name: `Filigrane / Motif fond (P${pageIndex + 1})` };
  }
  return { role: 'illustration', name: `Visuel extrait (P${pageIndex + 1})` };
}

/**
 * Extraction réelle d'éléments graphiques non-textuels (logos, signatures, tampons, QR/barcodes)
 * directement découpés depuis les pixels originaux du document sans aucune image inventée.
 */
function extractGraphicRegionsFromCanvas(
  canvas: HTMLCanvasElement,
  imgData: ImageData,
  excludeBoxesPct: BBoxPct[],
  pageIndex: number,
  pageBgHex: string,
  pageWidthMm: number,
  pageHeightMm: number
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
  const gridW = 150;
  const gridH = Math.round((ch / cw) * gridW);
  const cellW = cw / gridW;
  const cellH = ch / gridH;
  const mask = new Uint8Array(gridW * gridH);
  const data = imgData.data;

  const isExcluded = (gx: number, gy: number): boolean => {
    const px = ((gx + 0.5) / gridW) * 100;
    const py = ((gy + 0.5) / gridH) * 100;
    return excludeBoxesPct.some(
      (b) => px >= b.xPct - 0.7 && px <= b.xPct + b.wPct + 0.7 && py >= b.yPct - 0.5 && py <= b.yPct + b.hPct + 0.5
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
          if (lum < 222) inkPixels++;
        }
      }
      if (totalPixels > 0 && inkPixels / totalPixels >= 0.08) {
        mask[gy * gridW + gx] = 1;
      }
    }
  }

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
      if (cells >= 4 && wCells >= 3 && hCells >= 2 && !(wCells > gridW * 0.85 && hCells > gridH * 0.85)) {
        comps.push({ minX, minY, maxX, maxY, cells });
      }
    }
  }

  comps.sort((a, b) => b.cells - a.cells);
  const picked = comps.slice(0, 12);

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

  for (const c of picked) {
    const padPx = 5;
    const sx = Math.max(0, Math.floor(c.minX * cellW) - padPx);
    const sy = Math.max(0, Math.floor(c.minY * cellH) - padPx);
    const ex = Math.min(cw, Math.ceil((c.maxX + 1) * cellW) + padPx);
    const ey = Math.min(ch, Math.ceil((c.maxY + 1) * cellH) + padPx);
    const sw = Math.max(12, ex - sx);
    const sh = Math.max(12, ey - sy);

    const xPct = Math.round(((sx / cw) * 100) * 10) / 10;
    const yPct = Math.round(((sy / ch) * 100) * 10) / 10;
    const wPct = Math.round(((sw / cw) * 100) * 10) / 10;
    const hPctRaw = Math.round(((sh / ch) * 100) * 10) / 10;

    if (hPctRaw < 1.2 || wPct < 2) continue;

    const crop = document.createElement('canvas');
    const maxCropDim = 1000;
    const scale = Math.min(1, maxCropDim / Math.max(sw, sh));
    crop.width = Math.max(16, Math.round(sw * scale));
    crop.height = Math.max(16, Math.round(sh * scale));
    const cctx = crop.getContext('2d');
    if (!cctx) continue;
    cctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, crop.width, crop.height);

    // Transparence uniquement connectée aux bords extérieurs — préserve le blanc interne des logos/QR
    stripOuterPaperFloodFill(crop, pageBgHex);

    const classified = classifyCroppedGraphicRole(crop, xPct, yPct, wPct, hPctRaw, pageIndex);
    const lockedHPct = computeAspectLockedHeightPct(wPct, crop.width, crop.height, pageWidthMm, pageHeightMm);

    results.push({
      role: classified.role,
      name: `${classified.name} #${results.length + 1}`,
      xPct,
      yPct,
      wPct,
      hPct: lockedHPct,
      dataUrl: crop.toDataURL('image/png'),
      widthPx: crop.width,
      heightPx: crop.height
    });
  }

  return results;
}

// ============================================================================
// GROUPEMENT INTELLIGENT EN LIGNES & PARAGRAPHES (PRÉSERVE LES COLONNES)
// ============================================================================

interface RawTextSpan {
  text: string;
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
  fontSizePt: number;
  bold: boolean;
  italic: boolean;
  fontFamily: 'sans-serif' | 'serif' | 'monospace';
  color?: string;
  bgColor?: string;
}

function groupLinesAndParagraphs(
  spans: RawTextSpan[],
  imgData: ImageData,
  cw: number,
  ch: number,
  pageBgHex: string,
  excludeTableBoxes: DetectedGridBox[]
): { lines: RawTextSpan[]; consumedByTable: Set<number> } {
  spans.sort((a, b) => a.yPct - b.yPct || a.xPct - b.xPct);

  // 1. Fusionner fragments contigus sur une même ligne horizontale et même style (sans fusionner deux colonnes!)
  const mergedLines: RawTextSpan[] = [];
  for (const sp of spans) {
    const prev = mergedLines[mergedLines.length - 1];
    const gapPct = prev ? sp.xPct - (prev.xPct + prev.wPct) : 99;
    const sameRow = prev && Math.abs(prev.yPct - sp.yPct) < 0.72;
    const compatibleStyle =
      prev &&
      Math.abs(prev.fontSizePt - sp.fontSizePt) <= 1.8 &&
      prev.fontFamily === sp.fontFamily;
    if (prev && sameRow && compatibleStyle && gapPct >= -0.8 && gapPct < 2.2) {
      const gap = gapPct > 0.28 ? ' ' : '';
      prev.text = `${prev.text}${gap}${sp.text}`.replace(/\s+/g, ' ');
      const right = Math.max(prev.xPct + prev.wPct, sp.xPct + sp.wPct);
      prev.wPct = right - prev.xPct;
      prev.hPct = Math.max(prev.hPct, sp.hPct);
      prev.fontSizePt = Math.max(prev.fontSizePt, sp.fontSizePt);
      prev.bold = prev.bold || sp.bold;
      prev.italic = prev.italic || sp.italic;
    } else {
      mergedLines.push({ ...sp });
    }
  }

  // Enrichir chaque ligne avec sa vraie couleur d'encre & fond éventuel
  for (const ln of mergedLines) {
    const sample = sampleRegionColors(imgData, cw, ch, ln.xPct, ln.yPct, ln.wPct, ln.hPct, pageBgHex);
    ln.color = sample.inkHex;
    ln.bgColor = sample.bgHex;
  }

  // Identifier lignes appartenant à un tableau détecté avant de fusionner les paragraphes
  const consumedByTable = new Set<number>();
  excludeTableBoxes.forEach((tbl) => {
    mergedLines.forEach((ln, idx) => {
      const cx = ln.xPct + ln.wPct / 2;
      const cy = ln.yPct + ln.hPct / 2;
      if (
        cx >= tbl.xPct - 0.8 &&
        cx <= tbl.xPct + tbl.wPct + 0.8 &&
        cy >= tbl.yPct - 0.5 &&
        cy <= tbl.yPct + tbl.hPct + 0.5
      ) {
        consumedByTable.add(idx);
      }
    });
  });

  // 2. Regrouper lignes verticales consécutives en blocs paragraphes cohérents
  // (même colonne X, même taille/famille/graisse/couleur, espacement vertical serré)
  const outLines: RawTextSpan[] = [];
  const outConsumed = new Set<number>();
  const pending = mergedLines.map((ln, idx) => ({ ln, inTable: consumedByTable.has(idx) }));

  for (const item of pending) {
    if (item.inTable) {
      const newIdx = outLines.length;
      outLines.push(item.ln);
      outConsumed.add(newIdx);
      continue;
    }

    const prev = outLines.length > 0 && !outConsumed.has(outLines.length - 1) ? outLines[outLines.length - 1] : null;
    const prevYBottom = prev ? prev.yPct + prev.hPct : -99;
    const verticalGap = prev ? item.ln.yPct - prevYBottom : 99;
    const xAlignedLeft = prev && Math.abs(prev.xPct - item.ln.xPct) <= 1.8;
    const sameTypo =
      prev &&
      Math.abs(prev.fontSizePt - item.ln.fontSizePt) <= 0.9 &&
      prev.fontFamily === item.ln.fontFamily &&
      prev.bold === item.ln.bold &&
      prev.italic === item.ln.italic &&
      (prev.color || '#0F172A') === (item.ln.color || '#0F172A') &&
      (prev.bgColor || 'transparent') === (item.ln.bgColor || 'transparent');

    if (prev && xAlignedLeft && sameTypo && verticalGap >= -0.4 && verticalGap <= 1.45) {
      prev.text = `${prev.text}\n${item.ln.text}`;
      const right = Math.max(prev.xPct + prev.wPct, item.ln.xPct + item.ln.wPct);
      prev.wPct = right - prev.xPct;
      prev.hPct = item.ln.yPct + item.ln.hPct - prev.yPct;
    } else {
      outLines.push({ ...item.ln });
    }
  }

  return { lines: outLines, consumedByTable: outConsumed };
}

function estimateMarginsFromElements(
  elements: ReplicaElement[],
  widthMm: number,
  heightMm: number
): { top: number; right: number; bottom: number; left: number } {
  const firstPage = elements.filter((e) => e.pageIndex === 0 && e.visible);
  if (firstPage.length === 0) return { top: 14, right: 14, bottom: 14, left: 14 };
  const minX = Math.max(3, Math.min(...firstPage.map((e) => e.xPct)));
  const minY = Math.max(3, Math.min(...firstPage.map((e) => e.yPct)));
  const maxX = Math.min(97, Math.max(...firstPage.map((e) => e.xPct + e.wPct)));
  const maxY = Math.min(97, Math.max(...firstPage.map((e) => e.yPct + e.hPct)));

  const clampMargin = (mm: number) => Math.max(5, Math.min(35, Math.round(mm)));
  return {
    left: clampMargin((minX / 100) * widthMm),
    right: clampMargin(((100 - maxX) / 100) * widthMm),
    top: clampMargin((minY / 100) * heightMm),
    bottom: clampMargin(((100 - maxY) / 100) * heightMm)
  };
}

// ============================================================================
// ÉTAPES 1 À 3 : ANALYSE HYBRIDE (PDF, JPG, JPEG, PNG, DOC, DOCX)
// ============================================================================

export async function deepAnalyzeSourceDocument(
  file: File,
  docKey: LayoutTargetDocKey,
  onProgress?: (pct: number, label: string) => void
): Promise<ReplicaProject> {
  const lowerName = file.name.toLowerCase();
  const isPdf = file.type === 'application/pdf' || lowerName.endsWith('.pdf');
  const isDocx =
    lowerName.endsWith('.docx') ||
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  const isDoc = !isDocx && (lowerName.endsWith('.doc') || file.type === 'application/msword');

  const projectId = `replica_${docKey}_${Date.now()}`;
  const assets: ReplicaAsset[] = [];
  const elements: ReplicaElement[] = [];
  const sourcePageSnapshots: string[] = [];
  const engineNotes: string[] = [];

  let sourceFileType: ReplicaProject['sourceFileType'] = isPdf ? 'pdf' : isDocx ? 'docx' : isDoc ? 'doc' : 'image';
  let pageFormat: 'a4' | 'letter' = 'a4';
  let orientation: 'portrait' | 'landscape' = 'portrait';
  let widthMm = 210;
  let heightMm = 297;
  let pageBgColor = '#FFFFFF';
  let marginsMm = { top: 14, right: 14, bottom: 14, left: 14 };
  let palette = { primary: '#0B2545', accent: '#0066B3', text: '#1E293B', highlight: '#E8F2FF' };
  let pageCount = 1;
  let ocrUsed = false;

  if (isDocx || isDoc) {
    onProgress?.(20, `Extraction structurelle Word (${isDocx ? '.docx' : '.doc'})...`);
    const parsed = isDocx ? await parseDocxDocument(file) : await parseLegacyDocDocument(file);
    onProgress?.(85, 'Recomposition fidèle du modèle et médias embarqués...');
    sourceFileType = parsed.sourceFileType;
    pageFormat = parsed.pageFormat;
    orientation = parsed.orientation;
    widthMm = parsed.widthMm;
    heightMm = parsed.heightMm;
    marginsMm = parsed.marginsMm;
    pageCount = parsed.pageCount;
    palette = parsed.palette;
    assets.push(...parsed.assets);
    elements.push(...parsed.elements);
    sourcePageSnapshots.push(...parsed.sourcePageSnapshots);
    engineNotes.push(...parsed.engineNotes);
  } else if (isPdf) {
    onProgress?.(10, 'Lecture du document PDF multi-pages...');
    const buffer = await file.arrayBuffer();
    const pdfDoc = await pdfjsLib.getDocument({ data: buffer }).promise;
    pageCount = Math.min(4, pdfDoc.numPages);
    engineNotes.push(`PDF analysé via PDF.js + segmentation géométrique (${pageCount}/${pdfDoc.numPages} page(s)).`);

    for (let pNum = 1; pNum <= pageCount; pNum++) {
      onProgress?.(15 + Math.round((pNum / pageCount) * 55), `Analyse hybride page ${pNum}/${pageCount}...`);
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

      // Enregistrer la capture exacte de la page source pour le comparateur visuel
      sourcePageSnapshots.push(canvas.toDataURL('image/jpeg', 0.86));

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

      const textContent = await page.getTextContent();
      const stylesMap = (textContent.styles || {}) as Record<string, { fontFamily?: string }>;
      const rawSpans: RawTextSpan[] = [];

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

        rawSpans.push({
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

      if (rawSpans.length === 0) {
        ocrUsed = true;
        onProgress?.(45, `PDF numérisé détecté — OCR page ${pNum}...`);
        const ocrSpans = await runCanvasOcrSpans(canvas, imgData);
        rawSpans.push(...ocrSpans);
        engineNotes.push(`OCR Tesseract exécuté sur page ${pNum} (PDF sans flux texte natif).`);
      }

      const detectedTables = detectRuledTables(imgData, canvas.width, canvas.height);
      const { lines: groupedLines, consumedByTable } = groupLinesAndParagraphs(
        rawSpans,
        imgData,
        canvas.width,
        canvas.height,
        pageBgColor,
        detectedTables
      );

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
            groupedLines.forEach((ln, lnIdx) => {
              if (!consumedByTable.has(lnIdx)) return;
              const cx = ln.xPct + ln.wPct / 2;
              const cy = ln.yPct + ln.hPct / 2;
              if (cx >= xA - 0.8 && cx <= xB + 0.8 && cy >= yA - 0.5 && cy <= yB + 0.5) {
                cellTexts.push(ln.text.trim());
                anyBold = anyBold || ln.bold;
              }
            });
            const sample = sampleRegionColors(
              imgData,
              canvas.width,
              canvas.height,
              xA + 0.5,
              yA + 0.4,
              Math.max(1, xB - xA - 1),
              Math.max(1, yB - yA - 0.8),
              pageBgColor
            );
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
        const colWidthsPct = Array.from({ length: cCount }, (_, c) =>
          Math.round((((tbl.colLeftsPct[c + 1] - tbl.colLeftsPct[c]) / totalTblW) * 100) * 10) / 10
        );

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

      const excludeBoxes: BBoxPct[] = [...detectedTables];
      groupedLines.forEach((ln, idx) => {
        if (consumedByTable.has(idx)) return;
        excludeBoxes.push({ xPct: ln.xPct, yPct: ln.yPct, wPct: ln.wPct, hPct: ln.hPct });
        const centerPct = ln.xPct + ln.wPct / 2;
        const align: 'left' | 'center' | 'right' =
          ln.xPct > 54 && !ln.text.includes('\n')
            ? 'right'
            : Math.abs(centerPct - 50) < 7 && ln.xPct > 14 && !ln.text.includes('\n')
            ? 'center'
            : 'left';
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
          name: ln.text.split('\n')[0].trim().slice(0, 26) || `Texte ${idx + 1}`,
          pageIndex: pNum - 1,
          xPct: Math.round(ln.xPct * 10) / 10,
          yPct: Math.round(ln.yPct * 10) / 10,
          wPct: Math.max(8, Math.round(ln.wPct * 10) / 10),
          hPct: Math.max(2.2, Math.round((ln.hPct + 0.5) * 10) / 10),
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
          color: ln.color || '#0F172A',
          backgroundColor: ln.bgColor || 'transparent',
          textAlign: align,
          lineHeight: 1.32,
          letterSpacingEm: 0,
          role
        });
      });

      // Lignes séparatrices vectorielles détectées (masquées avant rognage des logos/cachets)
      const standaloneShapes = detectStandaloneShapesAndRules(imgData, canvas.width, canvas.height, detectedTables, excludeBoxes);
      standaloneShapes.forEach((shp, sIdx) => {
        excludeBoxes.push({ xPct: shp.xPct, yPct: shp.yPct - 0.5, wPct: shp.wPct, hPct: 1.2 });
        elements.push({
          id: `shp_p${pNum}_${sIdx + 1}`,
          kind: 'shape',
          name: `Filet séparateur P${pNum} #${sIdx + 1}`,
          pageIndex: pNum - 1,
          xPct: shp.xPct,
          yPct: shp.yPct,
          wPct: shp.wPct,
          hPct: shp.hPct,
          zIndex: 10,
          rotation: 0,
          opacity: 100,
          locked: false,
          visible: true,
          lockAspectRatio: false,
          shapeType: shp.shapeType,
          fillColor: shp.fillColor,
          strokeColor: shp.strokeColor,
          strokeWidthPx: shp.strokeWidthPx
        });
      });

      const crops = extractGraphicRegionsFromCanvas(
        canvas,
        imgData,
        excludeBoxes,
        pNum - 1,
        pageBgColor,
        widthMm,
        heightMm
      );
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
          contentHash: hash,
          sourceEngine: 'crop'
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
    marginsMm = estimateMarginsFromElements(elements, widthMm, heightMm);
  } else {
    // IMAGE SOURCE (PNG / JPG / JPEG / WEBP)
    onProgress?.(20, 'Chargement haute résolution de l’image...');
    const imgUrl = await fileToDataUrl(file);
    const imgEl = await loadHtmlImage(imgUrl);
    const maxDim = 1650;
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
    sourcePageSnapshots.push(canvas.toDataURL('image/jpeg', 0.88));
    const imgData = ctx.getImageData(0, 0, cw, ch);

    const pal = detectPageBackgroundAndPalette(imgData, cw, ch);
    pageBgColor = pal.pageBgHex;
    palette = { primary: pal.primaryHex, accent: pal.accentHex, text: '#1E293B', highlight: pal.highlightHex };

    ocrUsed = true;
    onProgress?.(45, 'Reconnaissance OCR et segmentation typographique...');
    const ocrSpans = await runCanvasOcrSpans(canvas, imgData);
    onProgress?.(72, 'Détection de tableaux, filets et extraction des visuels...');
    const detectedTables = detectRuledTables(imgData, cw, ch);
    const { lines: groupedLines, consumedByTable } = groupLinesAndParagraphs(
      ocrSpans,
      imgData,
      cw,
      ch,
      pageBgColor,
      detectedTables
    );

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
          groupedLines.forEach((ln, idx) => {
            if (!consumedByTable.has(idx)) return;
            const cx = ln.xPct + ln.wPct / 2;
            const cy = ln.yPct + ln.hPct / 2;
            if (cx >= xA - 1 && cx <= xB + 1 && cy >= yA - 0.8 && cy <= yB + 0.8) {
              cellTexts.push(ln.text.trim());
              anyBold = anyBold || ln.bold;
            }
          });
          const sample = sampleRegionColors(imgData, cw, ch, xA + 0.5, yA + 0.4, Math.max(1, xB - xA - 1), Math.max(1, yB - yA - 0.8), pageBgColor);
          rowCells.push({
            text: cellTexts.join(' '),
            bgColor: sample.bgHex !== 'transparent' ? sample.bgHex : r === 0 ? palette.highlight : '#FFFFFF',
            textColor: sample.inkHex || '#0F172A',
            bold: r === 0 || anyBold,
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
    groupedLines.forEach((ln, idx) => {
      if (consumedByTable.has(idx)) return;
      excludeBoxes.push({ xPct: ln.xPct, yPct: ln.yPct, wPct: ln.wPct, hPct: ln.hPct });
      const centerPct = ln.xPct + ln.wPct / 2;
      const align: 'left' | 'center' | 'right' =
        ln.xPct > 54 && !ln.text.includes('\n')
          ? 'right'
          : Math.abs(centerPct - 50) < 7 && ln.xPct > 14 && !ln.text.includes('\n')
          ? 'center'
          : 'left';
      elements.push({
        id: `txt_p1_${idx + 1}`,
        kind: 'text',
        name: ln.text.split('\n')[0].trim().slice(0, 26) || `Texte ${idx + 1}`,
        pageIndex: 0,
        xPct: Math.round(ln.xPct * 10) / 10,
        yPct: Math.round(ln.yPct * 10) / 10,
        wPct: Math.max(8, Math.round(ln.wPct * 10) / 10),
        hPct: Math.max(2.2, Math.round((ln.hPct + 0.5) * 10) / 10),
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
        color: ln.color || '#0F172A',
        backgroundColor: ln.bgColor || 'transparent',
        textAlign: align,
        lineHeight: 1.32,
        letterSpacingEm: 0,
        role: ln.yPct < 14 ? 'header' : ln.fontSizePt >= 14 ? 'title' : 'body'
      });
    });

    const standaloneShapes = detectStandaloneShapesAndRules(imgData, cw, ch, detectedTables, excludeBoxes);
    standaloneShapes.forEach((shp, sIdx) => {
      excludeBoxes.push({ xPct: shp.xPct, yPct: shp.yPct - 0.5, wPct: shp.wPct, hPct: 1.2 });
      elements.push({
        id: `shp_p1_${sIdx + 1}`,
        kind: 'shape',
        name: `Filet séparateur #${sIdx + 1}`,
        pageIndex: 0,
        xPct: shp.xPct,
        yPct: shp.yPct,
        wPct: shp.wPct,
        hPct: shp.hPct,
        zIndex: 10,
        rotation: 0,
        opacity: 100,
        locked: false,
        visible: true,
        lockAspectRatio: false,
        shapeType: shp.shapeType,
        fillColor: shp.fillColor,
        strokeColor: shp.strokeColor,
        strokeWidthPx: shp.strokeWidthPx
      });
    });

    const crops = extractGraphicRegionsFromCanvas(canvas, imgData, excludeBoxes, 0, pageBgColor, widthMm, heightMm);
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
        contentHash: hash,
        sourceEngine: 'crop'
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

    marginsMm = estimateMarginsFromElements(elements, widthMm, heightMm);
    engineNotes.push(`Image ${cw}×${ch}px segmentée (OCR Tesseract + détection tables/filets + rognage alpha bord-connecté).`);
  }

  onProgress?.(100, 'Reconstruction interactive prête.');
  const nowIso = new Date().toISOString();
  const project: ReplicaProject = {
    id: projectId,
    docKey,
    sourceFileName: file.name,
    sourceFileType,
    analyzedAt: nowIso,
    pageFormat,
    orientation,
    widthMm,
    heightMm,
    pageBgColor,
    marginsMm,
    palette,
    pageCount,
    assets,
    elements,
    sourcePageSnapshots,
    extractionReport: {
      textBlocksCount: elements.filter((e) => e.kind === 'text').length,
      tableCount: elements.filter((e) => e.kind === 'table').length,
      shapeCount: elements.filter((e) => e.kind === 'shape').length,
      visualCount: assets.length,
      ocrUsed,
      marginsDetectedMm: marginsMm,
      engineNotes
    },
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
): Promise<RawTextSpan[]> {
  try {
    const res = await Promise.race([
      Tesseract.recognize(canvas, 'fra+eng'),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 15000))
    ]);
    if (!res) return [];
    const dataAny = res.data as unknown as {
      lines?: Array<{
        text?: string;
        confidence?: number;
        bbox?: { x0: number; y0: number; x1: number; y1: number };
      }>;
    };
    const cw = Math.max(1, canvas.width);
    const ch = Math.max(1, canvas.height);
    const out: RawTextSpan[] = [];

    for (const ln of dataAny.lines || []) {
      const clean = (ln.text || '').replace(/\s+/g, ' ').trim();
      if (clean.length < 2 || !ln.bbox) continue;
      if (typeof ln.confidence === 'number' && ln.confidence < 32 && clean.length < 5) continue;
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
// ÉTAPE 4 : DIAGNOSTIC & COMPARATEUR DE FIDÉLITÉ VISUELLE (SANS BLUFF)
// ============================================================================

export function computeVisualFidelityReport(
  project: ReplicaProject,
  asyncCoverage?: { coveragePct: number; uncoveredZonesCount: number } | null
): VisualFidelityReport {
  const issues: VisualFidelityIssue[] = [];
  const assetById = new Map(project.assets.map((a) => [a.id, a]));
  const hasSourceSnapshot = Boolean(project.sourcePageSnapshots && project.sourcePageSnapshots.length > 0);
  const dimensionsOk = project.widthMm > 50 && project.heightMm > 50;

  let distortedImagesCount = 0;
  let outOfBoundsCount = 0;

  for (const el of project.elements) {
    if (!el.visible) continue;
    if (el.xPct < -0.5 || el.yPct < -0.5 || el.xPct + el.wPct > 100.8 || el.yPct + el.hPct > 100.8) {
      outOfBoundsCount++;
      issues.push({
        severity: 'warn',
        code: 'out_of_bounds',
        message: `Élément « ${el.name} » déborde hors des bords de page (${Math.round(el.xPct + el.wPct)}%).`,
        elementId: el.id
      });
    }

    if (el.kind === 'image') {
      const asset = assetById.get(el.assetId);
      if (asset && asset.widthPx > 0 && asset.heightPx > 0) {
        const assetRatio = asset.widthPx / asset.heightPx;
        const boxWmm = (el.wPct / 100) * project.widthMm;
        const boxHmm = Math.max(0.5, (el.hPct / 100) * project.heightMm);
        const boxRatio = boxWmm / boxHmm;
        const relDelta = Math.abs(boxRatio - assetRatio) / Math.max(0.1, assetRatio);
        if (relDelta > 0.06) {
          distortedImagesCount++;
          issues.push({
            severity: 'error',
            code: 'distorted_image',
            message: `Ratio de « ${el.name} » décalé de ${Math.round(relDelta * 100)}% vs pixels source (${asset.widthPx}×${asset.heightPx}). Utilisez "Ratio 1:1 original".`,
            elementId: el.id
          });
        }
      }
      if (asset && (!asset.publicHttpsUrl || !asset.publicHttpsUrl.startsWith('https://'))) {
        issues.push({
          severity: 'info',
          code: 'unhosted_visual',
          message: `Visuel « ${el.name} » encore en local (hébergement HTTPS requis avant envoi email).`,
          elementId: el.id
        });
      }
    }
  }

  if (!hasSourceSnapshot) {
    issues.push({
      severity: 'info',
      code: 'missing_snapshot',
      message: 'Aucune capture de page originale associée (spécimen de démonstration ou ancien projet).'
    });
  }

  const uncoveredZonesCount = asyncCoverage?.uncoveredZonesCount ?? 0;
  if (uncoveredZonesCount > 0) {
    issues.push({
      severity: 'warn',
      code: 'uncovered_zone',
      message: `${uncoveredZonesCount} zone(s) d’encre du document source ne sont pas encore couvertes par un bloc éditable.`
    });
  }

  let score = 100;
  score -= distortedImagesCount * 12;
  score -= outOfBoundsCount * 8;
  score -= Math.min(25, uncoveredZonesCount * 5);
  if (!hasSourceSnapshot) score -= 5;
  if (project.elements.length === 0) score = 0;

  return {
    hasSourceSnapshot,
    dimensionsOk,
    distortedImagesCount,
    outOfBoundsCount,
    coveragePct: asyncCoverage ? asyncCoverage.coveragePct : null,
    uncoveredZonesCount,
    fidelityScorePct: Math.max(0, Math.min(100, Math.round(score))),
    issues
  };
}

/**
 * Compare objectivement les cellules d'encre du document source contre la couverture des éléments reconstruits.
 */
export async function computeAsyncVisualCoverage(
  project: ReplicaProject,
  pageIndex: number
): Promise<{ coveragePct: number; uncoveredZonesCount: number } | null> {
  const snapshot = project.sourcePageSnapshots?.[pageIndex];
  if (!snapshot || typeof document === 'undefined') return null;

  try {
    const img = await loadHtmlImage(snapshot);
    const gridW = 50;
    const gridH = 70;
    const c = document.createElement('canvas');
    c.width = gridW;
    c.height = gridH;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, gridW, gridH);
    const px = ctx.getImageData(0, 0, gridW, gridH).data;

    const els = project.elements.filter((e) => e.visible && e.pageIndex === pageIndex);
    let sourceInkCells = 0;
    let coveredInkCells = 0;

    for (let y = 0; y < gridH; y++) {
      for (let x = 0; x < gridW; x++) {
        const idx = (y * gridW + x) * 4;
        const lum = 0.299 * px[idx] + 0.587 * px[idx + 1] + 0.114 * px[idx + 2];
        if (lum < 228) {
          sourceInkCells++;
          const cxPct = ((x + 0.5) / gridW) * 100;
          const cyPct = ((y + 0.5) / gridH) * 100;
          const hit = els.some(
            (e) =>
              cxPct >= e.xPct - 1.2 &&
              cxPct <= e.xPct + e.wPct + 1.2 &&
              cyPct >= e.yPct - 1.2 &&
              cyPct <= e.yPct + e.hPct + 1.2
          );
          if (hit) coveredInkCells++;
        }
      }
    }

    if (sourceInkCells === 0) return { coveragePct: 100, uncoveredZonesCount: 0 };
    const coveragePct = Math.min(100, Math.round((coveredInkCells / sourceInkCells) * 100));
    const missingCells = Math.max(0, sourceInkCells - coveredInkCells);
    const uncoveredZonesCount = missingCells > 14 ? Math.ceil(missingCells / 18) : 0;
    return { coveragePct, uncoveredZonesCount };
  } catch {
    return null;
  }
}

// ============================================================================
// ÉTAPE 7 : HÉBERGEMENT PUBLIC HTTPS RÉEL & VÉRIFICATION LIVE DES URL
// ============================================================================

export async function verifyPublicHttpsImageUrl(url: string): Promise<{ ok: boolean; detail: string }> {
  if (!url || !url.startsWith('https://')) {
    return { ok: false, detail: 'URL non HTTPS.' };
  }
  try {
    // 1. Test de chargement image réel (fonctionne même sans en-têtes CORS complets)
    const loaded = await new Promise<boolean>((resolve) => {
      if (typeof Image === 'undefined') {
        resolve(false);
        return;
      }
      const timer = setTimeout(() => resolve(false), 6000);
      const img = new Image();
      img.onload = () => {
        clearTimeout(timer);
        resolve(img.naturalWidth > 0);
      };
      img.onerror = () => {
        clearTimeout(timer);
        resolve(false);
      };
      img.src = url;
    });
    if (loaded) {
      return { ok: true, detail: 'Accessible publiquement via HTTPS.' };
    }
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok
      ? { ok: true, detail: `HTTP ${res.status} vérifié.` }
      : { ok: false, detail: `Réponse serveur HTTP ${res.status}.` };
  } catch {
    return { ok: false, detail: 'URL bloquée, expirée ou inaccessible publiquement.' };
  }
}

export async function uploadSingleAssetToPublicHost(
  asset: ReplicaAsset,
  cfg: HostingConfig
): Promise<ReplicaAsset> {
  if (!asset.localDataUrl) {
    return { ...asset, hostingStatus: 'error', hostingError: 'Aucune donnée image locale à transférer.' };
  }

  const cached = getHostedUrlCache()[asset.contentHash];
  if (cached && cached.startsWith('https://')) {
    const check = await verifyPublicHttpsImageUrl(cached);
    if (check.ok) {
      return {
        ...asset,
        publicHttpsUrl: cached,
        hostingStatus: 'hosted',
        hostingProvider: cfg.activeProvider,
        hostingError: undefined,
        httpsVerified: true,
        httpsVerifyDetail: check.detail
      };
    }
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
      const verified = await verifyPublicHttpsImageUrl(json.secure_url);
      setHostedUrlCache(asset.contentHash, json.secure_url);
      return {
        ...asset,
        publicHttpsUrl: json.secure_url,
        hostingStatus: 'hosted',
        hostingProvider: 'cloudinary',
        hostingError: undefined,
        httpsVerified: verified.ok,
        httpsVerifyDetail: verified.detail
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
      const verified = await verifyPublicHttpsImageUrl(secureUrl);
      setHostedUrlCache(asset.contentHash, secureUrl);
      return {
        ...asset,
        publicHttpsUrl: secureUrl,
        hostingStatus: 'hosted',
        hostingProvider: 'imgbb',
        hostingError: undefined,
        httpsVerified: verified.ok,
        httpsVerifyDetail: verified.detail
      };
    }

    // Firebase Storage du projet
    const storage = getStorage(app);
    const sRef = storageRef(storage, `replica_public_assets/${asset.contentHash}_${Date.now()}.png`);
    await uploadString(sRef, asset.localDataUrl, 'data_url');
    const url = await getDownloadURL(sRef);
    const verified = await verifyPublicHttpsImageUrl(url);
    setHostedUrlCache(asset.contentHash, url);
    return {
      ...asset,
      publicHttpsUrl: url,
      hostingStatus: 'hosted',
      hostingProvider: 'firebase_storage',
      hostingError: undefined,
      httpsVerified: verified.ok,
      httpsVerifyDetail: verified.detail
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Échec réseau lors de l’hébergement HTTPS.';
    return {
      ...asset,
      hostingStatus: 'error',
      hostingProvider: cfg.activeProvider,
      hostingError: errMsg,
      httpsVerified: false
    };
  }
}

// ============================================================================
// ÉTAPE 6 : COMPILATEUR HTML EMAIL MULTI-CLIENTS (GMAIL, OUTLOOK, KIT, APPLE)
// ============================================================================

export function compileReplicaToEmailHtml(
  project: ReplicaProject,
  options?: { preferPublicHttps?: boolean; includeFooterNote?: boolean }
): string {
  const preferHttps = options?.preferPublicHttps !== false;
  const includeFooterNote = options?.includeFooterNote === true;
  const maxW = Math.max(480, Math.min(680, project.emailMaxWidthPx || 600));
  const innerContentW = maxW - 40;
  const assetById = new Map(project.assets.map((a) => [a.id, a]));
  const pagesIndices = Array.from(new Set(project.elements.filter((e) => e.visible).map((e) => e.pageIndex))).sort(
    (a, b) => a - b
  );

  const renderElementCellHtml = (el: ReplicaElement, colFraction = 1): string => {
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
      return `<div style="font-family:${fStack};font-size:${pxSize}px;font-weight:${el.fontWeight};font-style:${el.fontStyle};text-decoration:${el.textDecoration};color:${el.color};text-align:${el.textAlign};line-height:${el.lineHeight};letter-spacing:${el.letterSpacingEm}em;${bgStyle}margin:0;mso-line-height-rule:exactly;">${escText}</div>`;
    }

    if (el.kind === 'image') {
      const asset = assetById.get(el.assetId);
      const src = preferHttps ? asset?.publicHttpsUrl || asset?.localDataUrl || '' : asset?.localDataUrl || '';
      if (!src) return '';
      const maxAllowW = Math.max(40, Math.round(innerContentW * colFraction));
      const rawTargetW = Math.max(28, Math.round((el.wPct / 100) * innerContentW));
      const targetW = Math.min(maxAllowW, rawTargetW);
      // Calcul strict du height depuis le ratio natif pour éviter toute déformation dans Outlook / Gmail / Kit
      const targetH =
        asset && asset.widthPx > 0 && asset.heightPx > 0
          ? Math.max(12, Math.round(targetW * (asset.heightPx / asset.widthPx)))
          : Math.max(18, Math.round((el.hPct / 100) * 760));
      const imgAlign = el.xPct > 54 ? 'margin-left:auto;' : el.xPct > 34 && el.wPct < 45 ? 'margin:0 auto;' : '';
      return `<img src="${escapeXml(src)}" alt="${escapeXml(el.name)}" width="${targetW}" height="${targetH}" border="0" style="display:block;${imgAlign}border:0;outline:none;text-decoration:none;max-width:100%;height:auto;width:${targetW}px;opacity:${(
        el.opacity / 100
      ).toFixed(2)};" />`;
    }

    if (el.kind === 'table') {
      const rowsHtml = el.rows
        .map((row) => {
          const cellsHtml = row
            .map((cell, cIdx) => {
              const colW = el.colWidthsPct[cIdx] ? `width:${el.colWidthsPct[cIdx]}%;` : '';
              return `<td align="${cell.align}" valign="middle" bgcolor="${escapeXml(cell.bgColor)}" style="${colW}background-color:${cell.bgColor};color:${cell.textColor};font-family:Arial,Helvetica,sans-serif;font-size:${Math.max(
                10,
                Math.round(el.fontSizePt * 1.2)
              )}px;font-weight:${cell.bold ? '700' : '400'};line-height:1.35;padding:${el.cellPaddingPx}px;border:${
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
        return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;"><tr><td style="border-top:${Math.max(
          1,
          el.strokeWidthPx
        )}px solid ${el.strokeColor};font-size:1px;line-height:1px;height:1px;">&nbsp;</td></tr></table>`;
      }
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${escapeXml(
        el.fillColor
      )}" style="background-color:${el.fillColor};border:${el.strokeWidthPx}px solid ${el.strokeColor};height:14px;font-size:1px;line-height:14px;">&nbsp;</td></tr></table>`;
    }

    return '';
  };

  const pageRowsHtml: string[] = [];

  for (const pageIdx of pagesIndices.length > 0 ? pagesIndices : [0]) {
    if (pageIdx > pagesIndices[0]) {
      pageRowsHtml.push(
        `<tr><td style="padding:10px 20px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-top:1px dashed #cbd5e1;font-size:1px;line-height:1px;">&nbsp;</td></tr></table></td></tr>`
      );
    }

    const pageEls = project.elements
      .filter((e) => e.visible && e.pageIndex === pageIdx && (e.kind !== 'image' || e.visualRole !== 'filigrane'))
      .sort((a, b) => a.yPct - b.yPct || a.xPct - b.xPct);

    // Regrouper en bandes horizontales fidèles tout en respectant l'ordre Y et les colonnes côte à côte
    const bands: ReplicaElement[][] = [];
    for (const el of pageEls) {
      const lastBand = bands[bands.length - 1];
      if (
        lastBand &&
        Math.abs(lastBand[0].yPct - el.yPct) <= 3.6 &&
        lastBand.every((x) => x.kind !== 'table') &&
        el.kind !== 'table'
      ) {
        lastBand.push(el);
      } else {
        bands.push([el]);
      }
    }

    for (const band of bands) {
      band.sort((a, b) => a.xPct - b.xPct);
      if (band.length === 1) {
        const el = band[0];
        const inner = renderElementCellHtml(el, 1);
        if (!inner) continue;
        const leftIndent =
          el.kind === 'text' && el.textAlign === 'left' && el.xPct > 12
            ? Math.min(72, Math.round(el.xPct * 2.4))
            : 0;
        const alignTd = el.kind === 'image' && el.xPct > 54 ? 'right' : el.kind === 'text' && el.textAlign === 'center' ? 'center' : 'left';
        pageRowsHtml.push(
          `<tr><td align="${alignTd}" style="padding:5px 20px 5px ${20 + leftIndent}px;">${inner}</td></tr>`
        );
      } else {
        const totalBandSpan = band.reduce((acc, item) => acc + Math.max(15, item.wPct), 0);
        const tds = band
          .map((el) => {
            const w = Math.max(18, Math.min(82, Math.round((Math.max(15, el.wPct) / totalBandSpan) * 100)));
            const alignAttr = el.kind === 'text' ? el.textAlign : el.xPct > 52 ? 'right' : 'left';
            return `<td class="stack-col" width="${w}%" align="${alignAttr === 'justify' ? 'left' : alignAttr}" valign="top" style="width:${w}%;padding:4px 8px;vertical-align:top;">${renderElementCellHtml(
              el,
              w / 100
            )}</td>`;
          })
          .join('');
        pageRowsHtml.push(
          `<tr><td style="padding:5px 12px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;"><tr>${tds}</tr></table></td></tr>`
        );
      }
    }
  }

  const footerRow = includeFooterNote
    ? `<tr><td style="padding:12px 20px 16px 20px;border-top:1px solid #e2e8f0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#64748b;text-align:center;">${escapeXml(
        project.sourceFileName
      )}</td></tr>`
    : '';

  return `<!DOCTYPE html>
<html lang="fr" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>${escapeXml(project.emailSubject || project.sourceFileName)}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:AllowPNG/>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <style type="text/css">
    body, table, td, p, a, div { font-family: Arial, Helvetica, sans-serif !important; }
  </style>
  <![endif]-->
  <style type="text/css">
    body { margin: 0 !important; padding: 0 !important; background-color: #f1f5f9; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    img { border: 0; line-height: 100%; outline: none; text-decoration: none; max-width: 100%; height: auto; -ms-interpolation-mode: bicubic; }
    table { border-collapse: collapse !important; mso-table-lspace: 0pt !important; mso-table-rspace: 0pt !important; }
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
      .stack-col { display: block !important; width: 100% !important; max-width: 100% !important; text-align: left !important; padding-left: 0 !important; padding-right: 0 !important; }
    }
  </style>
</head>
<body style="margin:0;padding:16px 8px;background-color:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
  <center style="width:100%;background-color:#f1f5f9;">
    <!--[if mso]>
    <table role="presentation" align="center" border="0" cellspacing="0" cellpadding="0" width="${maxW}">
    <tr><td valign="top" width="${maxW}">
    <![endif]-->
    <table role="presentation" class="email-container" align="center" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="${escapeXml(
      project.pageBgColor || '#ffffff'
    )}" style="width:100%;max-width:${maxW}px;margin:0 auto;background-color:${
    project.pageBgColor || '#ffffff'
  };border-collapse:collapse;border:1px solid #e2e8f0;mso-table-lspace:0pt;mso-table-rspace:0pt;">
      <tbody>
        <tr><td style="height:4px;background-color:${project.palette.primary};font-size:1px;line-height:1px;">&nbsp;</td></tr>
        ${pageRowsHtml.join('\n        ')}
        ${footerRow}
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
// ÉTAPE 7B : INSPECTEUR COMPATIBILITÉ EMAIL MULTI-CLIENTS (10 CONTRÔLES)
// ============================================================================

export function auditCompiledEmailHtml(project: ReplicaProject, html: string): EmailQualityAuditResult {
  const checks: AuditCheckItem[] = [];
  const lower = (html || '').toLowerCase();
  const htmlSizeKb = Math.round((new Blob([html || '']).size / 1024) * 10) / 10;

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
    label: '1. Complétude intégrale des textes & cellules',
    status: expectedTexts.length === 0 ? 'warn' : missingTexts.length === 0 ? 'pass' : 'fail',
    detail:
      missingTexts.length === 0
        ? `${expectedTexts.length}/${expectedTexts.length} blocs & cellules présents dans le HTML.`
        : `${missingTexts.length} texte(s) manquant(s) : « ${missingTexts[0].slice(0, 40)}... »`
  });

  // 2. Structure Tableaux & Zéro Flexbox/Grid/Position:absolute
  const hasPresentationTables = lower.includes('role="presentation"') && lower.includes('cellpadding="0"');
  const hasForbiddenLayout = /display:\s*(?:flex|grid)|position:\s*absolute/i.test(html);
  const hasTechOutline = /dashed\s+#dc2626|contenteditable/i.test(html);
  checks.push({
    id: 'table_architecture',
    label: '2. Tableaux HTML purs (sans Flex/Grid/Absolute/bordures tech)',
    status: hasPresentationTables && !hasForbiddenLayout && !hasTechOutline ? 'pass' : 'fail',
    detail:
      hasPresentationTables && !hasForbiddenLayout && !hasTechOutline
        ? 'Architecture <table> pure sans position:absolute, flexbox, grid ni contour studio.'
        : 'Propriété incompatible messagerie ou attribut studio détecté.'
  });

  // 3. Zéro JS & CSS Inline
  const hasScript = /<script\b/i.test(html);
  checks.push({
    id: 'no_js_inline_css',
    label: '3. Zéro JavaScript & CSS inline universel',
    status: !hasScript && lower.includes('style="') ? 'pass' : 'fail',
    detail: !hasScript ? 'Aucun script JS, règles CSS inline appliquées.' : 'Balise <script> interdite détectée.'
  });

  // 4. URL publiques HTTPS sur toutes les images
  const imgSrcMatches = Array.from(html.matchAll(/<img\b[^>]*\bsrc=["']([^"']*)["']/gi)).map((m) => m[1]);
  const unhostedImgs = imgSrcMatches.filter((s) => !/^https:\/\//i.test(s));
  checks.push({
    id: 'public_https_images',
    label: '4. Hébergement HTTPS public des images',
    status: imgSrcMatches.length === 0 ? 'pass' : unhostedImgs.length === 0 ? 'pass' : 'fail',
    detail:
      imgSrcMatches.length === 0
        ? 'Aucune image requise dans ce modèle.'
        : unhostedImgs.length === 0
        ? `${imgSrcMatches.length}/${imgSrcMatches.length} image(s) utilisent une URL HTTPS publique valide.`
        : `${unhostedImgs.length} image(s) non hébergée(s) (data:/blob: ou chemin local bloqué par Gmail/Outlook/Kit).`
  });

  // 5. Attributs width, height, alt, max-width:100%
  const imgTags = Array.from(html.matchAll(/<img\b[^>]*>/gi)).map((m) => m[0]);
  const badAttrs = imgTags.filter(
    (tag) => !/width=/i.test(tag) || !/height=/i.test(tag) || !/alt=/i.test(tag) || !/max-width:\s*100%/i.test(tag)
  );
  checks.push({
    id: 'image_attributes',
    label: '5. Proportions verrouillées & attributs images',
    status: badAttrs.length === 0 ? 'pass' : 'warn',
    detail:
      badAttrs.length === 0
        ? 'Attributs width, height, alt et max-width:100% conformes sur chaque visuel.'
        : `${badAttrs.length} balise(s) image sans width/height/alt complet.`
  });

  // 6. Contrôle débordement horizontal (max-width <= 680px)
  const containerMaxMatch = html.match(/class="email-container"[^>]*max-width:(\d+)px/i);
  const maxWidthVal = containerMaxMatch ? Number(containerMaxMatch[1]) : 600;
  checks.push({
    id: 'horizontal_overflow',
    label: '6. Largeur maîtrisée anti-débordement',
    status: maxWidthVal <= 680 ? 'pass' : 'warn',
    detail: `Conteneur principal calibré à ${maxWidthVal}px max avec fluides 100% sur mobile.`
  });

  // 7. Polices fallback email sûres
  const hasSafeFonts =
    lower.includes('arial, helvetica, sans-serif') ||
    lower.includes('arial,helvetica,sans-serif') ||
    lower.includes('georgia');
  checks.push({
    id: 'font_fallbacks',
    label: '7. Polices sûres avec fallback multi-OS',
    status: hasSafeFonts ? 'pass' : 'warn',
    detail: hasSafeFonts ? 'Piles email Arial / Georgia / Courier présentes.' : 'Ajouter une police fallback email.'
  });

  // 8. Responsive Mobile 620px
  const hasResponsiveCss = lower.includes('@media') && lower.includes('620px') && lower.includes('name="viewport"');
  checks.push({
    id: 'mobile_responsive',
    label: '8. Empilement responsive Mobile (<=620px)',
    status: hasResponsiveCss ? 'pass' : 'fail',
    detail: hasResponsiveCss
      ? 'Media query @media (max-width:620px) + .stack-col actifs.'
      : 'Règles responsive mobiles manquantes.'
  });

  // 9. Compatibilité Outlook MSO / Apple Mail / Yahoo / Kit
  const hasMsoFallback =
    lower.includes('<!--[if mso]>') &&
    lower.includes('mso-table-lspace:0pt') &&
    lower.includes('x-apple-disable-message-reformatting');
  checks.push({
    id: 'client_compat',
    label: '9. Spécificités Outlook MSO, Apple Mail, Yahoo & Kit',
    status: hasMsoFallback ? 'pass' : 'warn',
    detail: hasMsoFallback
      ? 'Conditionnels MSO, reset Apple reformatting et espacement tableaux Outlook actifs.'
      : 'Certaines directives Outlook MSO ou Apple Mail sont incomplètes.'
  });

  // 10. Limite Gmail Clipping (< 102 Ko HTML)
  checks.push({
    id: 'gmail_clipping',
    label: '10. Poids HTML anti-troncature Gmail (< 102 Ko)',
    status: htmlSizeKb < 95 ? 'pass' : htmlSizeKb <= 115 ? 'warn' : 'fail',
    detail: `Poids du source HTML compilé : ${htmlSizeKb} Ko ${
      htmlSizeKb < 95 ? '(optimal — non tronqué par Gmail).' : '(lourd — vérifiez les URI locales restantes).'
    }`
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
    totalImagesChecked: imgSrcMatches.length,
    htmlSizeKb
  };
}

export function repairCompiledEmailHtml(
  project: ReplicaProject,
  currentHtml: string
): { fixedHtml: string; audit: EmailQualityAuditResult } {
  let repaired = currentHtml
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\scontenteditable="true"/gi, '')
    .replace(/\soutline:[^;"]*dashed[^;"]*;?/gi, '');

  repaired = repaired.replace(/<img\b([^>]*)>/gi, (_full, attrs) => {
    let nextAttrs = attrs;
    if (!/alt=/i.test(nextAttrs)) nextAttrs += ' alt="Visuel document"';
    if (!/max-width:/i.test(nextAttrs)) {
      nextAttrs = nextAttrs.replace(/style="([^"]*)"/i, 'style="$1;max-width:100%;height:auto;"');
    }
    return `<img${nextAttrs}>`;
  });

  let audit = auditCompiledEmailHtml(project, repaired);
  if (
    audit.missingTextsCount > 0 ||
    !repaired.includes('role="presentation"') ||
    /display:\s*(?:flex|grid)|position:\s*absolute/i.test(repaired)
  ) {
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
            const drawHmm =
              el.lockAspectRatio && asset.widthPx > 0 && asset.heightPx > 0
                ? wMm * (asset.heightPx / asset.widthPx)
                : hMm;
            const imgFmt = asset.localDataUrl.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG';
            doc.addImage(asset.localDataUrl, imgFmt, xMm, yMm, wMm, drawHmm, undefined, 'FAST', el.rotation || 0);
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
        if (el.textDecoration === 'underline') {
          doc.setDrawColor(tr, tg, tb);
          doc.setLineWidth(0.22);
          doc.line(xMm, baselineY + 0.8, xMm + Math.min(wMm, doc.getTextWidth((el.text || '').split('\n')[0])), baselineY + 0.8);
        }
      }
    }
  }

  const baseName = project.sourceFileName.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]+/g, '_');
  const filename = `${baseName}_Reproduit_Modifie.pdf`;
  return { doc, filename, blob: doc.output('blob') };
}

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

  const usableWidthPx = Math.round(((project.widthMm - project.marginsMm.left - project.marginsMm.right) / 25.4) * 96);

  const elementToDocxBlock = (el: ReplicaElement): Array<Paragraph | Table> => {
    if (el.kind === 'text') {
      const fontName =
        el.fontFamily === 'serif' ? 'Georgia' : el.fontFamily === 'monospace' ? 'Courier New' : 'Calibri';
      const hexNoHash = (el.color || '#0F172A').replace('#', '');
      const textLines = el.text.split('\n');
      return textLines.map(
        (lineStr, idx) =>
          new Paragraph({
            alignment: mapDocxAlign(el.textAlign),
            spacing: { after: idx === textLines.length - 1 ? 100 : 25 },
            shading:
              el.backgroundColor && el.backgroundColor !== 'transparent'
                ? { fill: el.backgroundColor.replace('#', ''), type: ShadingType.CLEAR }
                : undefined,
            children: [
              new TextRun({
                text: lineStr,
                font: fontName,
                size: Math.max(14, Math.round(el.fontSizePt * 2)),
                bold: el.fontWeight === '700' || el.fontWeight === '800' || el.fontWeight === '600',
                italics: el.fontStyle === 'italic',
                underline: el.textDecoration === 'underline' ? {} : undefined,
                color: hexNoHash.length === 6 ? hexNoHash : '0F172A'
              })
            ]
          })
      );
    }

    if (el.kind === 'image') {
      const asset = assetById.get(el.assetId);
      const bytes = asset?.localDataUrl ? dataUrlToUint8(asset.localDataUrl) : null;
      if (!bytes) return [];
      const wPx = Math.max(28, Math.round((el.wPct / 100) * Math.max(460, usableWidthPx)));
      // Verrouiller les proportions natives exactes dans Word
      const hPx =
        asset && asset.widthPx > 0 && asset.heightPx > 0
          ? Math.max(16, Math.round(wPx * (asset.heightPx / asset.widthPx)))
          : Math.max(20, Math.round((el.hPct / 100) * 860));
      const imgType = asset?.localDataUrl.startsWith('data:image/jpeg') ? 'jpg' : 'png';
      return [
        new Paragraph({
          alignment: el.xPct > 52 ? AlignmentType.RIGHT : el.xPct > 28 ? AlignmentType.CENTER : AlignmentType.LEFT,
          spacing: { after: 100 },
          children: [
            new ImageRun({
              data: bytes,
              type: imgType,
              transformation: { width: wPx, height: hPx }
            })
          ]
        })
      ];
    }

    if (el.kind === 'shape' && el.shapeType === 'line_h') {
      const lineHex = (el.strokeColor || '#0B2545').replace('#', '');
      return [
        new Paragraph({
          spacing: { after: 80 },
          border: {
            bottom: { style: BorderStyle.SINGLE, size: Math.max(4, el.strokeWidthPx * 4), color: lineHex }
          },
          children: []
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
