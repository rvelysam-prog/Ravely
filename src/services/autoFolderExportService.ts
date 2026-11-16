/**
 * Service de classement et exportation groupée de « Génération Automatique »
 * Organise tous les documents sélectionnés dans un dossier nommé d'après le salarié/candidat
 * (mode Archive ZIP structurée multi-plateforme + support optionnel File System Access API).
 */

import JSZip from 'jszip';

export type FolderArrangementMode = 'by_category' | 'by_actor' | 'flat_ordered';

export type GeneratedFileCategory =
  | 'administratif_rh'
  | 'contrats_promesses'
  | 'hebergement_notaire_hir'
  | 'fiches_doc_es';

export type GeneratedFileActor =
  | 'Employeur'
  | 'Cabinet_CRIC'
  | 'Notaire_BC'
  | 'Inspecteur_HIR'
  | 'Candidat';

export interface PackagedDocumentFile {
  filename: string;
  blob: Blob;
  category: GeneratedFileCategory;
  actor: GeneratedFileActor;
  orderIndex: number;
  label: string;
}

export interface FolderExportOptions {
  employeeOrCandidateName: string;
  referenceCode?: string;
  customFolderName?: string;
  arrangementMode: FolderArrangementMode;
  preferNativeDirectoryPicker?: boolean;
  includeManifestTxt?: boolean;
}

export interface FolderExportResult {
  method: 'directory_picker' | 'zip_download';
  rootFolderName: string;
  fileCount: number;
  savedPaths: string[];
  warning?: string;
}

export function sanitizeFolderSegment(raw: string, fallback = 'Salarie_Candidat'): string {
  const clean = (raw || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')
    .slice(0, 60);
  return clean || fallback;
}

export function buildDefaultEmployeeFolderName(employeeName: string, referenceCode?: string): string {
  const safeName = sanitizeFolderSegment(employeeName, 'Dossier_Salarie');
  const safeRef = referenceCode ? sanitizeFolderSegment(referenceCode, '') : '';
  return safeRef ? `Dossier_${safeName}_${safeRef}` : `Dossier_${safeName}`;
}

const CATEGORY_FOLDER_LABELS: Record<GeneratedFileCategory, string> = {
  administratif_rh: '01_Administratif_Candidat_RH',
  contrats_promesses: '02_Contrats_Promesse_Offre',
  hebergement_notaire_hir: '03_Hebergement_Notaire_HIR',
  fiches_doc_es: '04_Fiches_DOC_ES'
};

const ACTOR_FOLDER_LABELS: Record<GeneratedFileActor, string> = {
  Employeur: '01_Employeur_Atlantic',
  Cabinet_CRIC: '02_Cabinet_CRIC',
  Notaire_BC: '03_Notaire_Public_BC',
  Inspecteur_HIR: '04_Inspecteur_Logement_HIR',
  Candidat: '05_Dossier_Candidat'
};

function resolveSubfolderForFile(file: PackagedDocumentFile, mode: FolderArrangementMode): string {
  if (mode === 'by_category') return CATEGORY_FOLDER_LABELS[file.category];
  if (mode === 'by_actor') return ACTOR_FOLDER_LABELS[file.actor];
  return '';
}

function resolveFileNameForMode(file: PackagedDocumentFile, mode: FolderArrangementMode): string {
  const prefix = String(file.orderIndex).padStart(2, '0');
  const cleanBase = file.filename.replace(/^(\d+_)+/, '');
  return mode === 'flat_ordered' ? `${prefix}_${cleanBase}` : cleanBase;
}

export async function buildStructuredDossierZip(
  files: PackagedDocumentFile[],
  options: FolderExportOptions
): Promise<{ zipBlob: Blob; rootFolderName: string; zipFileName: string; savedPaths: string[] }> {
  const rootFolderName = sanitizeFolderSegment(
    options.customFolderName?.trim() ||
      buildDefaultEmployeeFolderName(options.employeeOrCandidateName, options.referenceCode),
    'Dossier_Salarie'
  );

  const zip = new JSZip();
  const rootFolder = zip.folder(rootFolderName) || zip;
  const savedPaths: string[] = [];

  for (const file of files) {
    const subfolder = resolveSubfolderForFile(file, options.arrangementMode);
    const outName = resolveFileNameForMode(file, options.arrangementMode);
    const targetFolder = subfolder ? rootFolder.folder(subfolder) || rootFolder : rootFolder;
    targetFolder.file(outName, file.blob);
    savedPaths.push(subfolder ? `${rootFolderName}/${subfolder}/${outName}` : `${rootFolderName}/${outName}`);
  }

  if (options.includeManifestTxt !== false) {
    const manifestLines = [
      `DOSSIER GENERE AUTOMATIQUEMENT : ${rootFolderName}`,
      `Salarié / Postulant : ${options.employeeOrCandidateName}`,
      `Référence dossier : ${options.referenceCode || 'N/A'}`,
      `Mode de classement : ${
        options.arrangementMode === 'by_category'
          ? 'Par catégorie documentaire'
          : options.arrangementMode === 'by_actor'
          ? 'Par acteur signataire'
          : 'Dossier unique numéroté'
      }`,
      `Date d'exportation : ${new Date().toLocaleString('fr-CA')}`,
      `Nombre total de fichiers : ${files.length}`,
      '-----------------------------------------------------------------',
      ...savedPaths.map((p, idx) => `${idx + 1}. ${p}`)
    ];
    rootFolder.file('_INDEX_CLASSEMENT.txt', manifestLines.join('\n'));
  }

  const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  return {
    zipBlob,
    rootFolderName,
    zipFileName: `${rootFolderName}.zip`,
    savedPaths
  };
}

/**
 * Exporte et classe tous les fichiers sélectionnés dans un dossier nommé d'après le salarié.
 * Tente d'abord le sélecteur natif de dossier local si demandé et autorisé par le navigateur,
 * sinon télécharge une archive ZIP structurée contenant le dossier complet et ses sous-dossiers.
 */
export async function exportSelectedDocumentsIntoFolder(
  files: PackagedDocumentFile[],
  options: FolderExportOptions
): Promise<FolderExportResult> {
  const rootFolderName = sanitizeFolderSegment(
    options.customFolderName?.trim() ||
      buildDefaultEmployeeFolderName(options.employeeOrCandidateName, options.referenceCode),
    'Dossier_Salarie'
  );

  if (files.length === 0) {
    return {
      method: 'zip_download',
      rootFolderName,
      fileCount: 0,
      savedPaths: []
    };
  }

  // Option dossier local direct via File System Access API (Chrome/Edge hors iframe bloqué)
  if (
    options.preferNativeDirectoryPicker &&
    typeof window !== 'undefined' &&
    'showDirectoryPicker' in window
  ) {
    try {
      const pickerFn = (window as unknown as { showDirectoryPicker: (opts?: { mode?: string }) => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker;
      const baseHandle = await pickerFn({ mode: 'readwrite' });
      const rootHandle = await baseHandle.getDirectoryHandle(rootFolderName, { create: true });
      const savedPaths: string[] = [];

      for (const file of files) {
        const subfolder = resolveSubfolderForFile(file, options.arrangementMode);
        const outName = resolveFileNameForMode(file, options.arrangementMode);
        const destDir = subfolder
          ? await rootHandle.getDirectoryHandle(subfolder, { create: true })
          : rootHandle;
        const fileHandle = await destDir.getFileHandle(outName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(file.blob);
        await writable.close();
        savedPaths.push(subfolder ? `${rootFolderName}/${subfolder}/${outName}` : `${rootFolderName}/${outName}`);
      }

      if (options.includeManifestTxt !== false) {
        const manifestHandle = await rootHandle.getFileHandle('_INDEX_CLASSEMENT.txt', { create: true });
        const writable = await manifestHandle.createWritable();
        await writable.write(
          `Dossier : ${rootFolderName}\nSalarié : ${options.employeeOrCandidateName}\nFichiers (${files.length}) :\n` +
            savedPaths.map((p, i) => `${i + 1}. ${p}`).join('\n')
        );
        await writable.close();
      }

      return {
        method: 'directory_picker',
        rootFolderName,
        fileCount: files.length,
        savedPaths
      };
    } catch (err) {
      // Si annulé explicitement par l'utilisateur ou bloqué par iframe -> fallback ZIP propre
      const message = err instanceof Error ? err.message : 'Accès dossier direct bloqué';
      const zipRes = await buildStructuredDossierZip(files, options);
      triggerBlobDownload(zipRes.zipBlob, zipRes.zipFileName);
      return {
        method: 'zip_download',
        rootFolderName: zipRes.rootFolderName,
        fileCount: files.length,
        savedPaths: zipRes.savedPaths,
        warning: `Enregistrement dossier natif indisponible (${message}) : téléchargé en archive dossier « ${zipRes.zipFileName} ».`
      };
    }
  }

  // Mode universel : archive ZIP contenant directement le dossier nommé et ses sous-dossiers
  const zipRes = await buildStructuredDossierZip(files, options);
  triggerBlobDownload(zipRes.zipBlob, zipRes.zipFileName);
  return {
    method: 'zip_download',
    rootFolderName: zipRes.rootFolderName,
    fileCount: files.length,
    savedPaths: zipRes.savedPaths
  };
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  if (typeof document === 'undefined') return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
