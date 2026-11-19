import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Upload,
  ScanText,
  Layers,
  Eye,
  Edit3,
  Mail,
  ShieldCheck,
  Download,
  Undo2,
  Redo2,
  Copy,
  ClipboardPaste,
  Trash2,
  Lock,
  Unlock,
  Plus,
  Minus,
  ZoomIn,
  ZoomOut,
  Hand,
  MousePointer2,
  ArrowUp,
  ArrowDown,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Bold,
  Italic,
  Underline,
  Image as ImageIcon,
  Table as TableIcon,
  Type,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Globe,
  RefreshCw,
  Wrench,
  FileText,
  FileSpreadsheet,
  Code2,
  Monitor,
  Smartphone,
  Send,
  Sparkles,
  RotateCw,
  ChevronRight,
  ChevronLeft,
  Square,
  Columns,
  SlidersHorizontal
} from 'lucide-react';
import { LayoutTargetDocKey } from '../../services/layoutImitationService';
import {
  ReplicaProject,
  ReplicaElement,
  ReplicaTextElement,
  ReplicaImageElement,
  ReplicaTableElement,
  ReplicaAsset,
  ReplicaVisualRole,
  HostingConfig,
  HostingProvider,
  HOSTING_PROVIDER_DOCS,
  EmailQualityAuditResult,
  VisualFidelityReport,
  deepAnalyzeSourceDocument,
  loadReplicaProject,
  saveReplicaProject,
  deleteReplicaProject,
  getSavedHostingConfig,
  saveHostingConfig,
  uploadSingleAssetToPublicHost,
  verifyPublicHttpsImageUrl,
  compileReplicaToEmailHtml,
  auditCompiledEmailHtml,
  repairCompiledEmailHtml,
  exportReplicaProjectToPdf,
  exportReplicaProjectToDocx,
  computeAspectLockedHeightPct,
  computeVisualFidelityReport,
  computeAsyncVisualCoverage,
  computeFastHash
} from '../../services/documentReplicaService';
import { ResponsivePaperWrapper } from '../common/ResponsivePaperWrapper';

interface InteractiveReplicaStudioProps {
  docKey: LayoutTargetDocKey;
  onOpenInWebmail?: (html: string) => void;
  onSyncedPalette?: (palette: { primary: string; accent: string; pageBgColor: string }) => void;
  onToast: (msg: string) => void;
}

const STUDIO_STEPS: { id: number; short: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 1, short: '1. Import', label: 'Importation source', icon: Upload },
  { id: 2, short: '2. Analyse', label: 'Analyse structure', icon: ScanText },
  { id: 3, short: '3. Visuels', label: 'Extraction & Actifs', icon: ImageIcon },
  { id: 4, short: '4. Spécimen', label: 'Spécimen fidèle', icon: Eye },
  { id: 5, short: '5. Canva', label: 'Éditeur complet', icon: Edit3 },
  { id: 6, short: '6. Email HTML', label: 'Email responsive', icon: Mail },
  { id: 7, short: '7. HTTPS & QA', label: 'Hébergement & Qualité', icon: ShieldCheck },
  { id: 8, short: '8. Export', label: 'PDF, Word & HTML', icon: Download }
];

const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

function createId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ''));
    r.onerror = () => reject(new Error('Impossible de lire le fichier image.'));
    r.readAsDataURL(file);
  });
}

function loadImageDimensions(src: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth || 200, h: img.naturalHeight || 100 });
    img.onerror = () => resolve({ w: 200, h: 100 });
    img.src = src;
  });
}

function createSampleLogoPngDataUrl(): string {
  if (typeof document === 'undefined') return '';
  const c = document.createElement('canvas');
  c.width = 240;
  c.height = 80;
  const ctx = c.getContext('2d');
  if (!ctx) return '';
  ctx.fillStyle = '#0B2545';
  ctx.fillRect(0, 0, 240, 80);
  ctx.fillStyle = '#D4A017';
  ctx.fillRect(0, 68, 240, 12);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 22px Arial';
  ctx.fillText('ATLANTIC DOCS', 18, 44);
  return c.toDataURL('image/png');
}

function buildDemoReplicaProject(docKey: LayoutTargetDocKey): ReplicaProject {
  const now = new Date().toISOString();
  const demoLogo = createSampleLogoPngDataUrl();
  const assets: ReplicaAsset[] = demoLogo
    ? [
        {
          id: 'asset_demo_logo',
          name: 'Logo En-tête Spécimen',
          role: 'logo',
          localDataUrl: demoLogo,
          hostingStatus: 'local',
          widthPx: 240,
          heightPx: 80,
          contentHash: computeFastHash(demoLogo)
        }
      ]
    : [];

  const elements: ReplicaElement[] = [
    ...(demoLogo
      ? [
          {
            id: 'img_demo_logo',
            kind: 'image' as const,
            name: 'Logo En-tête',
            pageIndex: 0,
            xPct: 6,
            yPct: 4,
            wPct: 24,
            hPct: 7,
            zIndex: 20,
            rotation: 0,
            opacity: 100,
            locked: false,
            visible: true,
            lockAspectRatio: true,
            assetId: 'asset_demo_logo',
            visualRole: 'logo' as const
          }
        ]
      : []),
    {
      id: 'txt_demo_ref',
      kind: 'text',
      name: 'Référence Dossier',
      pageIndex: 0,
      xPct: 58,
      yPct: 5,
      wPct: 36,
      hPct: 4,
      zIndex: 21,
      rotation: 0,
      opacity: 100,
      locked: false,
      visible: true,
      lockAspectRatio: false,
      text: 'RÉFÉRENCE : ATL-BC-2026-DEMO\nSurrey, Colombie-Britannique',
      fontFamily: 'sans-serif',
      fontSizePt: 9.5,
      fontWeight: '600',
      fontStyle: 'normal',
      textDecoration: 'none',
      color: '#475569',
      backgroundColor: 'transparent',
      textAlign: 'right',
      lineHeight: 1.35,
      letterSpacingEm: 0,
      role: 'header'
    },
    {
      id: 'shp_demo_line',
      kind: 'shape',
      name: 'Ligne séparatrice',
      pageIndex: 0,
      xPct: 6,
      yPct: 13,
      wPct: 88,
      hPct: 0.6,
      zIndex: 10,
      rotation: 0,
      opacity: 100,
      locked: false,
      visible: true,
      lockAspectRatio: false,
      shapeType: 'line_h',
      fillColor: '#0B2545',
      strokeColor: '#0066B3',
      strokeWidthPx: 2
    },
    {
      id: 'txt_demo_title',
      kind: 'text',
      name: 'Titre Principal',
      pageIndex: 0,
      xPct: 8,
      yPct: 16,
      wPct: 84,
      hPct: 5,
      zIndex: 22,
      rotation: 0,
      opacity: 100,
      locked: false,
      visible: true,
      lockAspectRatio: false,
      text: 'ATTESTATION OFFICIELLE — SPÉCIMEN INTERACTIF',
      fontFamily: 'sans-serif',
      fontSizePt: 15,
      fontWeight: '800',
      fontStyle: 'normal',
      textDecoration: 'none',
      color: '#0B2545',
      backgroundColor: 'transparent',
      textAlign: 'center',
      lineHeight: 1.3,
      letterSpacingEm: 0.02,
      role: 'title'
    },
    {
      id: 'txt_demo_body',
      kind: 'text',
      name: 'Paragraphe principal',
      pageIndex: 0,
      xPct: 6,
      yPct: 24,
      wPct: 88,
      hPct: 11,
      zIndex: 23,
      rotation: 0,
      opacity: 100,
      locked: false,
      visible: true,
      lockAspectRatio: false,
      text: 'Double-cliquez sur n’importe quel texte pour l’éditer directement. Déplacez ou redimensionnez chaque bloc, éditez le tableau ci-dessous ou importez votre propre PDF/image à l’Étape 1.',
      fontFamily: 'sans-serif',
      fontSizePt: 10.5,
      fontWeight: '400',
      fontStyle: 'normal',
      textDecoration: 'none',
      color: '#1E293B',
      backgroundColor: 'transparent',
      textAlign: 'left',
      lineHeight: 1.45,
      letterSpacingEm: 0,
      role: 'body'
    },
    {
      id: 'tbl_demo_main',
      kind: 'table',
      name: 'Tableau récapitulatif',
      pageIndex: 0,
      xPct: 6,
      yPct: 38,
      wPct: 88,
      hPct: 22,
      zIndex: 15,
      rotation: 0,
      opacity: 100,
      locked: false,
      visible: true,
      lockAspectRatio: false,
      rows: [
        [
          { text: 'Élément', bgColor: '#E8F2FF', textColor: '#0B2545', bold: true, align: 'left' },
          { text: 'Détail vérifié', bgColor: '#E8F2FF', textColor: '#0B2545', bold: true, align: 'left' },
          { text: 'Statut', bgColor: '#E8F2FF', textColor: '#0B2545', bold: true, align: 'center' }
        ],
        [
          { text: 'Employeur / Acteur', bgColor: '#FFFFFF', textColor: '#0F172A', bold: false, align: 'left' },
          { text: 'ATLANTIC TRANSPORT LTD', bgColor: '#FFFFFF', textColor: '#0F172A', bold: true, align: 'left' },
          { text: 'Conforme', bgColor: '#DCFCE7', textColor: '#166534', bold: true, align: 'center' }
        ],
        [
          { text: 'Province / Juridiction', bgColor: '#FFFFFF', textColor: '#0F172A', bold: false, align: 'left' },
          { text: 'Colombie-Britannique, Canada', bgColor: '#FFFFFF', textColor: '#0F172A', bold: false, align: 'left' },
          { text: 'Validé', bgColor: '#DCFCE7', textColor: '#166534', bold: true, align: 'center' }
        ]
      ],
      colWidthsPct: [28, 50, 22],
      borderColor: '#94A3B8',
      borderWidthPx: 1,
      cellPaddingPx: 7,
      fontSizePt: 10
    }
  ];

  return {
    id: `demo_${docKey}_${Date.now()}`,
    docKey,
    sourceFileName: 'Specimen_Demo_Interactif.pdf',
    sourceFileType: 'pdf',
    analyzedAt: now,
    pageFormat: 'a4',
    orientation: 'portrait',
    widthMm: 210,
    heightMm: 297,
    pageBgColor: '#FFFFFF',
    marginsMm: { top: 14, right: 14, bottom: 14, left: 14 },
    palette: { primary: '#0B2545', accent: '#0066B3', text: '#1E293B', highlight: '#E8F2FF' },
    pageCount: 1,
    assets,
    elements,
    emailSubject: 'Document Officiel — Spécimen Interactif',
    emailMaxWidthPx: 600,
    updatedAt: now
  };
}

type DragAction =
  | {
      type: 'move';
      startX: number;
      startY: number;
      initialPositions: Record<string, { xPct: number; yPct: number }>;
    }
  | {
      type: 'resize';
      elementId: string;
      handle: 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
      startX: number;
      startY: number;
      startRect: { xPct: number; yPct: number; wPct: number; hPct: number };
      lockRatio: boolean;
    }
  | {
      type: 'marquee';
      startX: number;
      startY: number;
      curX: number;
      curY: number;
    };

export const InteractiveReplicaStudio: React.FC<InteractiveReplicaStudioProps> = ({
  docKey,
  onOpenInWebmail,
  onSyncedPalette,
  onToast
}) => {
  const [step, setStep] = useState<number>(1);
  const [project, setProject] = useState<ReplicaProject | null>(null);
  const [historyPast, setHistoryPast] = useState<ReplicaProject[]>([]);
  const [historyFuture, setHistoryFuture] = useState<ReplicaProject[]>([]);
  const [clipboardElements, setClipboardElements] = useState<ReplicaElement[]>([]);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisPct, setAnalysisPct] = useState(0);
  const [analysisStatus, setAnalysisStatus] = useState('');

  const [activePageIndex, setActivePageIndex] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [activeTableCell, setActiveTableCell] = useState<{ elId: string; r: number; c: number } | null>(null);
  const [showLayersPanel, setShowLayersPanel] = useState(false);
  const [layerKindFilter, setLayerKindFilter] = useState<'all' | 'text' | 'image' | 'table' | 'shape'>('all');

  // Comparateur visuel de fidélité (Étape 4 & 5)
  const [compareMode, setCompareMode] = useState<'editor' | 'side_by_side' | 'overlay'>('editor');
  const [overlayOpacityPct, setOverlayOpacityPct] = useState(45);
  const [fidelityReport, setFidelityReport] = useState<VisualFidelityReport | null>(null);

  const [zoomPct, setZoomPct] = useState(100);
  const [isPanMode, setIsPanMode] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const panStartRef = useRef<{ x: number; y: number; origX: number; origY: number } | null>(null);

  const paperRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragAction | null>(null);
  const [marqueeBox, setMarqueeBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  // Étape 6 & 7 : Email HTML, Hébergement HTTPS, Audit Qualité
  const [compiledHtml, setCompiledHtml] = useState<string>('');
  const [emailPreviewDevice, setEmailPreviewDevice] = useState<
    'desktop' | 'mobile' | 'gmail' | 'outlook' | 'kit' | 'code'
  >('desktop');
  const [hostingConfig, setHostingConfig] = useState<HostingConfig>(() => getSavedHostingConfig());
  const [isUploadingAll, setIsUploadingAll] = useState(false);
  const [isVerifyingUrls, setIsVerifyingUrls] = useState(false);
  const [auditResult, setAuditResult] = useState<EmailQualityAuditResult | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);

  // Charger projet depuis IndexedDB quand docKey change
  useEffect(() => {
    let active = true;
    setSelectedIds([]);
    setEditingTextId(null);
    setActiveTableCell(null);
    setHistoryPast([]);
    setHistoryFuture([]);

    loadReplicaProject(docKey).then((loaded) => {
      if (!active) return;
      if (loaded) {
        setProject(loaded);
        setActivePageIndex(0);
        setStep(4);
      } else {
        setProject(null);
        setStep(1);
      }
    });

    return () => {
      active = false;
    };
  }, [docKey]);

  // Persister automatiquement chaque changement de projet en IndexedDB
  useEffect(() => {
    if (!project) return;
    const t = setTimeout(() => {
      void saveReplicaProject(project);
    }, 350);
    return () => clearTimeout(t);
  }, [project]);

  // Recompiler HTML & Audit automatiquement quand on visite Étapes 6, 7 ou 8
  useEffect(() => {
    if (!project) return;
    if (step >= 6) {
      const html = compileReplicaToEmailHtml(project, { preferPublicHttps: true });
      setCompiledHtml(html);
      setAuditResult(auditCompiledEmailHtml(project, html));
    }
  }, [project, step]);

  // Mettre à jour le rapport objectif de fidélité visuelle en Étapes 4 & 5
  useEffect(() => {
    if (!project || (step !== 4 && step !== 5)) return;
    let active = true;
    setFidelityReport(computeVisualFidelityReport(project, null));
    const timer = setTimeout(() => {
      void computeAsyncVisualCoverage(project, activePageIndex).then((cov) => {
        if (!active) return;
        setFidelityReport(computeVisualFidelityReport(project, cov));
      });
    }, 220);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [project, step, activePageIndex]);

  const commitProjectChange = (updater: (prev: ReplicaProject) => ReplicaProject, recordHistory = true) => {
    setProject((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      if (recordHistory) {
        setHistoryPast((p) => [...p.slice(-39), prev]);
        setHistoryFuture([]);
      }
      return { ...next, updatedAt: new Date().toISOString() };
    });
  };

  const handleUndo = () => {
    if (!project || historyPast.length === 0) return;
    const prevSnapshot = historyPast[historyPast.length - 1];
    setHistoryPast((p) => p.slice(0, -1));
    setHistoryFuture((f) => [project, ...f.slice(0, 39)]);
    setProject(prevSnapshot);
    setSelectedIds([]);
  };

  const handleRedo = () => {
    if (!project || historyFuture.length === 0) return;
    const nextSnapshot = historyFuture[0];
    setHistoryFuture((f) => f.slice(1));
    setHistoryPast((p) => [...p.slice(-39), project]);
    setProject(nextSnapshot);
    setSelectedIds([]);
  };

  const handleCopySelected = () => {
    if (!project || selectedIds.length === 0) return;
    const picked = project.elements.filter((el) => selectedIds.includes(el.id));
    setClipboardElements(JSON.parse(JSON.stringify(picked)));
    onToast(`${picked.length} élément(s) copié(s).`);
  };

  const handlePasteClipboard = () => {
    if (!project || clipboardElements.length === 0) return;
    const newIds: string[] = [];
    commitProjectChange((prev) => {
      const clones = clipboardElements.map((el, i) => {
        const nid = createId(el.kind);
        newIds.push(nid);
        return {
          ...JSON.parse(JSON.stringify(el)),
          id: nid,
          name: `${el.name} (copie)`,
          pageIndex: activePageIndex,
          xPct: clamp(el.xPct + 3, 0, 90),
          yPct: clamp(el.yPct + 3, 0, 92),
          zIndex: prev.elements.length + 30 + i,
          locked: false
        } as ReplicaElement;
      });
      return { ...prev, elements: [...prev.elements, ...clones] };
    });
    setSelectedIds(newIds);
  };

  const handleDuplicateSelected = () => {
    if (!project || selectedIds.length === 0) return;
    const picked = project.elements.filter((el) => selectedIds.includes(el.id));
    const newIds: string[] = [];
    commitProjectChange((prev) => {
      const clones = picked.map((el, i) => {
        const nid = createId(el.kind);
        newIds.push(nid);
        return {
          ...JSON.parse(JSON.stringify(el)),
          id: nid,
          name: `${el.name} (dup.)`,
          xPct: clamp(el.xPct + 2.5, 0, 90),
          yPct: clamp(el.yPct + 2.5, 0, 92),
          zIndex: prev.elements.length + 30 + i,
          locked: false
        } as ReplicaElement;
      });
      return { ...prev, elements: [...prev.elements, ...clones] };
    });
    setSelectedIds(newIds);
  };

  const handleDeleteSelected = () => {
    if (!project || selectedIds.length === 0) return;
    commitProjectChange((prev) => ({
      ...prev,
      elements: prev.elements.filter((el) => !selectedIds.includes(el.id) || el.locked)
    }));
    setSelectedIds([]);
  };

  const handleToggleLockSelected = () => {
    if (!project || selectedIds.length === 0) return;
    const anyUnlocked = project.elements.some((el) => selectedIds.includes(el.id) && !el.locked);
    commitProjectChange((prev) => ({
      ...prev,
      elements: prev.elements.map((el) =>
        selectedIds.includes(el.id) ? { ...el, locked: anyUnlocked } : el
      )
    }));
  };

  // Raccourcis clavier (Undo/Redo/Copy/Paste/Duplicate/Delete)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (step !== 4 && step !== 5) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        handleCopySelected();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        handlePasteClipboard();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        handleDuplicateSelected();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.length > 0 && !editingTextId) {
          e.preventDefault();
          handleDeleteSelected();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  // Upload & Deep Analyze (Étape 1)
  const handleUploadSourceDocument = async (file: File) => {
    setIsAnalyzing(true);
    setAnalysisPct(5);
    setAnalysisStatus('Initialisation de l’analyse profonde...');
    try {
      const analyzed = await deepAnalyzeSourceDocument(file, docKey, (pct, msg) => {
        setAnalysisPct(pct);
        setAnalysisStatus(msg);
      });
      setProject(analyzed);
      setHistoryPast([]);
      setHistoryFuture([]);
      setSelectedIds([]);
      setActivePageIndex(0);
      onSyncedPalette?.({
        primary: analyzed.palette.primary,
        accent: analyzed.palette.accent,
        pageBgColor: analyzed.pageBgColor
      });
      onToast(
        `Analyse terminée : ${analyzed.elements.filter((e) => e.kind === 'text').length} textes, ${
          analyzed.elements.filter((e) => e.kind === 'table').length
        } tableaux, ${analyzed.assets.length} visuels découpés.`
      );
      setStep(2);
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Erreur lors de l’analyse du fichier.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleLoadDemoProject = async () => {
    const demo = buildDemoReplicaProject(docKey);
    await saveReplicaProject(demo);
    setProject(demo);
    setHistoryPast([]);
    setHistoryFuture([]);
    setActivePageIndex(0);
    setSelectedIds([]);
    setStep(4);
    onToast('Spécimen de démonstration prêt dans l’éditeur interactif.');
  };

  const handleResetProject = async () => {
    await deleteReplicaProject(docKey);
    setProject(null);
    setHistoryPast([]);
    setHistoryFuture([]);
    setSelectedIds([]);
    setStep(1);
    onToast('Projet de réplication réinitialisé.');
  };

  // Gestion Drag / Resize / Marquee sur la feuille Canva
  const getPaperPercentPos = (clientX: number, clientY: number) => {
    const rect = paperRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return { xPct: 0, yPct: 0 };
    return {
      xPct: ((clientX - rect.left) / rect.width) * 100,
      yPct: ((clientY - rect.top) / rect.height) * 100
    };
  };

  const handlePaperPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!project) return;
    if (isPanMode) {
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        origX: panOffset.x,
        origY: panOffset.y
      };
      return;
    }

    if (e.target === e.currentTarget || (e.target as HTMLElement).dataset.paperBackdrop === '1') {
      setEditingTextId(null);
      setActiveTableCell(null);
      const pt = getPaperPercentPos(e.clientX, e.clientY);
      dragRef.current = {
        type: 'marquee',
        startX: pt.xPct,
        startY: pt.yPct,
        curX: pt.xPct,
        curY: pt.yPct
      };
      setMarqueeBox({ x: pt.xPct, y: pt.yPct, w: 0, h: 0 });
      if (!e.shiftKey) setSelectedIds([]);
    }
  };

  const handleElementPointerDown = (e: React.PointerEvent, el: ReplicaElement) => {
    e.stopPropagation();
    if (!project || isPanMode) return;
    if (editingTextId === el.id) return;

    setEditingTextId(null);
    if (el.kind !== 'table') setActiveTableCell(null);

    let nextSelected = selectedIds;
    if (e.shiftKey) {
      nextSelected = selectedIds.includes(el.id)
        ? selectedIds.filter((id) => id !== el.id)
        : [...selectedIds, el.id];
      setSelectedIds(nextSelected);
    } else if (!selectedIds.includes(el.id)) {
      nextSelected = [el.id];
      setSelectedIds(nextSelected);
    }

    if (el.locked) return;

    const pt = getPaperPercentPos(e.clientX, e.clientY);
    const initialPositions: Record<string, { xPct: number; yPct: number }> = {};
    for (const item of project.elements) {
      if (nextSelected.includes(item.id) && !item.locked) {
        initialPositions[item.id] = { xPct: item.xPct, yPct: item.yPct };
      }
    }

    setHistoryPast((p) => [...p.slice(-39), project]);
    setHistoryFuture([]);

    dragRef.current = {
      type: 'move',
      startX: pt.xPct,
      startY: pt.yPct,
      initialPositions
    };
  };

  const handleResizeHandleDown = (
    e: React.PointerEvent,
    el: ReplicaElement,
    handle: 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'
  ) => {
    e.stopPropagation();
    if (!project || el.locked || isPanMode) return;
    const pt = getPaperPercentPos(e.clientX, e.clientY);

    setHistoryPast((p) => [...p.slice(-39), project]);
    setHistoryFuture([]);

    dragRef.current = {
      type: 'resize',
      elementId: el.id,
      handle,
      startX: pt.xPct,
      startY: pt.yPct,
      startRect: { xPct: el.xPct, yPct: el.yPct, wPct: el.wPct, hPct: el.hPct },
      lockRatio: el.lockAspectRatio && !e.shiftKey
    };
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (panStartRef.current && isPanMode) {
        const dx = e.clientX - panStartRef.current.x;
        const dy = e.clientY - panStartRef.current.y;
        setPanOffset({ x: panStartRef.current.origX + dx, y: panStartRef.current.origY + dy });
        return;
      }

      const action = dragRef.current;
      if (!action || !project) return;
      const pt = getPaperPercentPos(e.clientX, e.clientY);

      if (action.type === 'marquee') {
        action.curX = pt.xPct;
        action.curY = pt.yPct;
        const x = Math.min(action.startX, action.curX);
        const y = Math.min(action.startY, action.curY);
        const w = Math.abs(action.curX - action.startX);
        const h = Math.abs(action.curY - action.startY);
        setMarqueeBox({ x, y, w, h });
        return;
      }

      if (action.type === 'move') {
        const dx = pt.xPct - action.startX;
        const dy = pt.yPct - action.startY;
        setProject((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            elements: prev.elements.map((item) => {
              const init = action.initialPositions[item.id];
              if (!init) return item;
              return {
                ...item,
                xPct: Math.round(clamp(init.xPct + dx, 0, 100 - item.wPct) * 10) / 10,
                yPct: Math.round(clamp(init.yPct + dy, 0, 100 - item.hPct) * 10) / 10
              };
            })
          };
        });
        return;
      }

      if (action.type === 'resize') {
        const dx = pt.xPct - action.startX;
        const dy = pt.yPct - action.startY;
        const { xPct, yPct, wPct, hPct } = action.startRect;

        // Pour les visuels verrouillés, calculer le ratio exact en % page à partir des dimensions naturelles
        const targetEl = project.elements.find((x) => x.id === action.elementId);
        const linkedAsset =
          targetEl?.kind === 'image' ? project.assets.find((a) => a.id === targetEl.assetId) : undefined;
        const ratio =
          action.lockRatio && linkedAsset && linkedAsset.widthPx > 0 && linkedAsset.heightPx > 0
            ? (linkedAsset.widthPx / linkedAsset.heightPx) * (project.heightMm / project.widthMm)
            : hPct > 0
            ? wPct / hPct
            : 1;

        let nx = xPct;
        let ny = yPct;
        let nw = wPct;
        let nh = hPct;

        if (action.handle.includes('e')) nw = clamp(wPct + dx, 3, 98 - xPct);
        if (action.handle.includes('s')) nh = clamp(hPct + dy, 1.5, 98 - yPct);
        if (action.handle.includes('w')) {
          const maxShift = wPct - 3;
          const shift = clamp(dx, -xPct, maxShift);
          nx = xPct + shift;
          nw = wPct - shift;
        }
        if (action.handle.includes('n')) {
          const maxShift = hPct - 1.5;
          const shift = clamp(dy, -yPct, maxShift);
          ny = yPct + shift;
          nh = hPct - shift;
        }

        if (action.lockRatio && ratio > 0) {
          if (action.handle === 'n' || action.handle === 's') {
            nw = clamp(nh * ratio, 3, 98 - nx);
          } else {
            nh = clamp(nw / ratio, 1.2, 98 - ny);
          }
        }

        setProject((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            elements: prev.elements.map((item) =>
              item.id === action.elementId
                ? {
                    ...item,
                    xPct: Math.round(nx * 10) / 10,
                    yPct: Math.round(ny * 10) / 10,
                    wPct: Math.round(nw * 10) / 10,
                    hPct: Math.round(nh * 10) / 10
                  }
                : item
            )
          };
        });
      }
    };

    const onUp = () => {
      if (panStartRef.current) panStartRef.current = null;

      const action = dragRef.current;
      if (action?.type === 'marquee' && project) {
        const x1 = Math.min(action.startX, action.curX);
        const y1 = Math.min(action.startY, action.curY);
        const x2 = Math.max(action.startX, action.curX);
        const y2 = Math.max(action.startY, action.curY);
        if (x2 - x1 > 1.2 || y2 - y1 > 1.2) {
          const hits = project.elements
            .filter(
              (el) =>
                el.visible &&
                el.pageIndex === activePageIndex &&
                el.xPct + el.wPct >= x1 &&
                el.xPct <= x2 &&
                el.yPct + el.hPct >= y1 &&
                el.yPct <= y2
            )
            .map((el) => el.id);
          setSelectedIds(hits);
        }
        setMarqueeBox(null);
      }
      dragRef.current = null;
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [project, activePageIndex, isPanMode]);

  // Ajout d'éléments (Texte / Tableau / Image locale)
  const handleAddTextBlock = () => {
    if (!project) return;
    const id = createId('txt');
    commitProjectChange((prev) => ({
      ...prev,
      elements: [
        ...prev.elements,
        {
          id,
          kind: 'text',
          name: 'Nouveau texte',
          pageIndex: activePageIndex,
          xPct: 12,
          yPct: 45,
          wPct: 50,
          hPct: 5,
          zIndex: prev.elements.length + 30,
          rotation: 0,
          opacity: 100,
          locked: false,
          visible: true,
          lockAspectRatio: false,
          text: 'Double-cliquez pour saisir votre texte',
          fontFamily: 'sans-serif',
          fontSizePt: 11,
          fontWeight: '400',
          fontStyle: 'normal',
          textDecoration: 'none',
          color: prev.palette.text || '#0F172A',
          backgroundColor: 'transparent',
          textAlign: 'left',
          lineHeight: 1.38,
          letterSpacingEm: 0,
          role: 'body'
        }
      ]
    }));
    setSelectedIds([id]);
    setStep(5);
  };

  const handleAddTableBlock = () => {
    if (!project) return;
    const id = createId('tbl');
    commitProjectChange((prev) => ({
      ...prev,
      elements: [
        ...prev.elements,
        {
          id,
          kind: 'table',
          name: 'Tableau 3×3',
          pageIndex: activePageIndex,
          xPct: 8,
          yPct: 52,
          wPct: 84,
          hPct: 18,
          zIndex: prev.elements.length + 30,
          rotation: 0,
          opacity: 100,
          locked: false,
          visible: true,
          lockAspectRatio: false,
          rows: [
            [
              { text: 'Colonne 1', bgColor: prev.palette.highlight || '#E8F2FF', textColor: '#0B2545', bold: true, align: 'left' },
              { text: 'Colonne 2', bgColor: prev.palette.highlight || '#E8F2FF', textColor: '#0B2545', bold: true, align: 'left' },
              { text: 'Colonne 3', bgColor: prev.palette.highlight || '#E8F2FF', textColor: '#0B2545', bold: true, align: 'center' }
            ],
            [
              { text: 'Donnée A', bgColor: '#FFFFFF', textColor: '#0F172A', bold: false, align: 'left' },
              { text: 'Valeur 1', bgColor: '#FFFFFF', textColor: '#0F172A', bold: false, align: 'left' },
              { text: 'OK', bgColor: '#FFFFFF', textColor: '#0F172A', bold: false, align: 'center' }
            ],
            [
              { text: 'Donnée B', bgColor: '#FFFFFF', textColor: '#0F172A', bold: false, align: 'left' },
              { text: 'Valeur 2', bgColor: '#FFFFFF', textColor: '#0F172A', bold: false, align: 'left' },
              { text: 'OK', bgColor: '#FFFFFF', textColor: '#0F172A', bold: false, align: 'center' }
            ]
          ],
          colWidthsPct: [34, 42, 24],
          borderColor: '#94A3B8',
          borderWidthPx: 1,
          cellPaddingPx: 6,
          fontSizePt: 10
        }
      ]
    }));
    setSelectedIds([id]);
    setStep(5);
  };

  const handleAddImageFile = async (file: File, role: ReplicaVisualRole = 'illustration') => {
    if (!project) return;
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const dims = await loadImageDimensions(dataUrl);
      const assetId = createId('asset');
      const elId = createId('img');
      const wPct = clamp(Math.round((dims.w / 794) * 100), 10, 38);
      const hPct = computeAspectLockedHeightPct(wPct, dims.w, dims.h, project.widthMm, project.heightMm);

      commitProjectChange((prev) => ({
        ...prev,
        assets: [
          ...prev.assets,
          {
            id: assetId,
            name: file.name.replace(/\.[^.]+$/, ''),
            role,
            localDataUrl: dataUrl,
            hostingStatus: 'local',
            widthPx: dims.w,
            heightPx: dims.h,
            contentHash: computeFastHash(dataUrl),
            sourceEngine: 'upload'
          }
        ],
        elements: [
          ...prev.elements,
          {
            id: elId,
            kind: 'image',
            name: file.name.replace(/\.[^.]+$/, ''),
            pageIndex: activePageIndex,
            xPct: 12,
            yPct: 68,
            wPct,
            hPct,
            zIndex: prev.elements.length + 35,
            rotation: 0,
            opacity: role === 'filigrane' ? 35 : 100,
            locked: false,
            visible: true,
            lockAspectRatio: true,
            assetId,
            visualRole: role
          }
        ]
      }));
      setSelectedIds([elId]);
      onToast(`Visuel « ${file.name} » ajouté.`);
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Erreur import visuel.');
    }
  };

  const handleReplaceAssetImage = async (assetId: string, file: File) => {
    if (!project) return;
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const dims = await loadImageDimensions(dataUrl);
      const hash = computeFastHash(dataUrl);
      commitProjectChange((prev) => ({
        ...prev,
        assets: prev.assets.map((a) =>
          a.id === assetId
            ? {
                ...a,
                localDataUrl: dataUrl,
                publicHttpsUrl: undefined,
                hostingStatus: 'local',
                hostingError: undefined,
                widthPx: dims.w,
                heightPx: dims.h,
                contentHash: hash
              }
            : a
        )
      }));
      onToast(`Visuel remplacé par « ${file.name} » (pensez à ré-héberger en HTTPS à l'Étape 7).`);
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Impossible de remplacer le visuel.');
    }
  };

  const handleDeleteAsset = (assetId: string) => {
    if (!project) return;
    commitProjectChange((prev) => ({
      ...prev,
      assets: prev.assets.filter((a) => a.id !== assetId),
      elements: prev.elements.filter((el) => !(el.kind === 'image' && el.assetId === assetId))
    }));
    setSelectedIds([]);
  };

  // Étape 7 : Hébergement HTTPS public réel de tous les visuels locaux
  const handleHostAllAssets = async () => {
    if (!project) return;
    saveHostingConfig(hostingConfig);
    setIsUploadingAll(true);

    let updatedAssets = [...project.assets];
    let hostedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < updatedAssets.length; i++) {
      const asset = updatedAssets[i];
      if (asset.publicHttpsUrl && asset.publicHttpsUrl.startsWith('https://')) {
        hostedCount++;
        continue;
      }
      updatedAssets[i] = { ...asset, hostingStatus: 'uploading', hostingError: undefined };
      setProject((p) => (p ? { ...p, assets: [...updatedAssets] } : p));

      const resAsset = await uploadSingleAssetToPublicHost(asset, hostingConfig);
      updatedAssets[i] = resAsset;
      if (resAsset.hostingStatus === 'hosted') hostedCount++;
      else failedCount++;
      setProject((p) => (p ? { ...p, assets: [...updatedAssets] } : p));
    }

    setIsUploadingAll(false);
    if (failedCount > 0) {
      onToast(
        `${hostedCount} image(s) hébergée(s) en HTTPS, ${failedCount} erreur(s) — vérifiez vos identifiants ${HOSTING_PROVIDER_DOCS[hostingConfig.activeProvider].label}.`
      );
    } else {
      onToast(`Toutes les images (${hostedCount}) sont hébergées et vérifiées en HTTPS public.`);
    }
  };

  const handleVerifyAllHostedUrls = async () => {
    if (!project) return;
    const hosted = project.assets.filter((a) => a.publicHttpsUrl && a.publicHttpsUrl.startsWith('https://'));
    if (hosted.length === 0) {
      onToast('Aucune URL HTTPS à vérifier — hébergez d’abord vos visuels locaux.');
      return;
    }
    setIsVerifyingUrls(true);
    let okCount = 0;
    const nextAssets = [...project.assets];
    for (let i = 0; i < nextAssets.length; i++) {
      const a = nextAssets[i];
      if (!a.publicHttpsUrl || !a.publicHttpsUrl.startsWith('https://')) continue;
      const check = await verifyPublicHttpsImageUrl(a.publicHttpsUrl);
      if (check.ok) okCount++;
      nextAssets[i] = {
        ...a,
        httpsVerified: check.ok,
        httpsVerifyDetail: check.detail
      };
    }
    setProject((p) => (p ? { ...p, assets: nextAssets } : p));
    setIsVerifyingUrls(false);
    onToast(`Vérification HTTPS : ${okCount}/${hosted.length} image(s) accessibles publiquement.`);
  };

  const handleAlignSelectedMulti = (mode: 'left' | 'center' | 'right' | 'top') => {
    if (!project || selectedIds.length < 2) return;
    const targets = project.elements.filter((e) => selectedIds.includes(e.id) && !e.locked);
    if (targets.length < 2) return;
    const minX = Math.min(...targets.map((e) => e.xPct));
    const maxR = Math.max(...targets.map((e) => e.xPct + e.wPct));
    const midX = (minX + maxR) / 2;
    const minY = Math.min(...targets.map((e) => e.yPct));

    commitProjectChange((prev) => ({
      ...prev,
      elements: prev.elements.map((el) => {
        if (!selectedIds.includes(el.id) || el.locked) return el;
        if (mode === 'left') return { ...el, xPct: Math.round(minX * 10) / 10 };
        if (mode === 'right') return { ...el, xPct: Math.round((maxR - el.wPct) * 10) / 10 };
        if (mode === 'center') return { ...el, xPct: Math.round((midX - el.wPct / 2) * 10) / 10 };
        return { ...el, yPct: Math.round(minY * 10) / 10 };
      })
    }));
  };

  const handleRunRepairAudit = () => {
    if (!project) return;
    const { fixedHtml, audit } = repairCompiledEmailHtml(project, compiledHtml);
    setCompiledHtml(fixedHtml);
    setAuditResult(audit);
    onToast(
      audit.passedAll
        ? `Audit Qualité validé à ${audit.scorePct}% !`
        : `Réparation appliquée (${audit.scorePct}%). Corrigez les avertissements restants.`
    );
  };

  const pageElements = useMemo(() => {
    if (!project) return [];
    return project.elements
      .filter((el) => el.pageIndex === activePageIndex)
      .sort((a, b) => a.zIndex - b.zIndex);
  }, [project, activePageIndex]);

  const primarySelected = useMemo(() => {
    if (!project || selectedIds.length !== 1) return null;
    return project.elements.find((e) => e.id === selectedIds[0]) || null;
  }, [project, selectedIds]);

  const assetById = useMemo(() => {
    const map = new Map<string, ReplicaAsset>();
    for (const a of project?.assets || []) map.set(a.id, a);
    return map;
  }, [project?.assets]);

  const paperWidthPx = project?.orientation === 'landscape' ? 1122 : 794;
  const paperHeightPx = project?.orientation === 'landscape' ? 794 : 1122;

  const updateSelectedElement = (patch: Partial<ReplicaElement>) => {
    if (!primarySelected) return;
    commitProjectChange((prev) => ({
      ...prev,
      elements: prev.elements.map((el) =>
        el.id === primarySelected.id ? ({ ...el, ...patch } as ReplicaElement) : el
      )
    }));
  };

  const unhostedCount = (project?.assets || []).filter(
    (a) => !a.publicHttpsUrl || !a.publicHttpsUrl.startsWith('https://')
  ).length;

  return (
    <div className="rounded-2xl border-2 border-[#0B2545]/15 bg-white shadow-sm overflow-hidden">
      {/* EN-TÊTE STUDIO & STEPPER 8 ÉTAPES */}
      <div className="bg-[#0B2545] text-white px-4 py-3.5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 font-black">
              <Layers className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h5 className="text-sm sm:text-base font-extrabold truncate">
                Studio de Reproduction Fidèle &amp; Éditeur Interactif (Style Canva)
              </h5>
              <p className="text-[11px] text-blue-200 truncate">
                {project
                  ? `${project.sourceFileName} · ${project.pageFormat.toUpperCase()} ${project.orientation} · ${project.elements.length} blocs`
                  : 'Parcours complet en 8 étapes · Import, Analyse, Découpe réelle, Édition, HTML HTTPS & Export'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {project && (
              <button
                type="button"
                onClick={handleResetProject}
                className="min-h-[38px] px-3 py-1.5 rounded-lg bg-white/10 hover:bg-red-500/80 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Nouveau document</span>
              </button>
            )}
          </div>
        </div>

        {/* BARRE DES 8 ÉTAPES */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {STUDIO_STEPS.map((st) => {
            const Icon = st.icon;
            const disabled = st.id > 1 && !project;
            const active = step === st.id;
            return (
              <button
                key={st.id}
                type="button"
                disabled={disabled}
                onClick={() => setStep(st.id)}
                className={`min-h-[40px] px-2.5 py-1.5 rounded-lg text-[11px] font-bold inline-flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  active
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'bg-white/10 hover:bg-white/20 text-blue-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{st.short}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* CONTENU DES 8 ÉTAPES */}
      <div className="p-4 sm:p-5 bg-slate-50/70 space-y-4">
        {/* ================================================================= */}
        {/* ÉTAPE 1 : IMPORTATION DU DOCUMENT SOURCE                          */}
        {/* ================================================================= */}
        {step === 1 && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-8 text-center space-y-5">
            <div className="max-w-xl mx-auto space-y-2">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#0066B3]">
                <Upload className="w-7 h-7" />
              </div>
              <h4 className="text-base sm:text-lg font-extrabold text-[#0B2545]">
                Étape 1 — Importer le document source à reproduire fidèlement
              </h4>
              <p className="text-xs sm:text-sm text-slate-600">
                Importez un document officiel (<strong>PDF, JPG, JPEG, PNG, DOC, DOCX</strong>). Notre moteur hybride extrait chaque bloc texte réel (police, taille, couleur, position), détecte les tableaux et séparateurs vectoriels modifiables et prélève vos logos/signatures/cachets directement depuis la source sans aucune altération IA.
              </p>
            </div>

            {isAnalyzing ? (
              <div className="max-w-md mx-auto p-4 rounded-xl bg-blue-50 border border-blue-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-[#0B2545]">
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-[#0066B3]" />
                    <span>{analysisStatus}</span>
                  </span>
                  <span>{analysisPct}%</span>
                </div>
                <div className="w-full h-2.5 bg-white rounded-full overflow-hidden border border-blue-200">
                  <div
                    className="h-full bg-[#0066B3] transition-all duration-300"
                    style={{ width: `${analysisPct}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-center gap-3">
                <label className="min-h-[46px] px-5 py-2.5 rounded-xl bg-[#0066B3] hover:bg-[#005291] text-white text-xs sm:text-sm font-bold inline-flex items-center gap-2 cursor-pointer shadow-xs">
                  <Upload className="w-4 h-4" />
                  <span>Sélectionner PDF / JPG / PNG / DOC / DOCX</span>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,image/png,image/jpeg,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = '';
                      if (f) void handleUploadSourceDocument(f);
                    }}
                  />
                </label>

                <button
                  type="button"
                  onClick={handleLoadDemoProject}
                  className="min-h-[46px] px-4 py-2.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 text-xs sm:text-sm font-bold inline-flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Charger un Spécimen de Démonstration</span>
                </button>
              </div>
            )}

            {project && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="text-xs font-bold text-[#0066B3] hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Reprendre le spécimen actuel ({project.sourceFileName})</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* ÉTAPE 2 : ANALYSE INTELLIGENTE & STRUCTURE                        */}
        {/* ================================================================= */}
        {step === 2 && project && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <h4 className="text-sm sm:text-base font-extrabold text-[#0B2545]">
                  Étape 2 — Analyse structurelle &amp; typographique extraite
                </h4>
                <p className="text-xs text-slate-500">
                  Vérifiez les paramètres géométriques, les marges et la palette détectés automatiquement.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="min-h-[42px] px-4 py-2 rounded-lg bg-[#0066B3] hover:bg-[#005291] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <span>Suivant : Visuels extraits</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block">Format &amp; Orientation</span>
                <strong className="text-sm text-[#0B2545]">
                  {project.pageFormat.toUpperCase()} · {project.orientation === 'portrait' ? 'Portrait' : 'Paysage'}
                </strong>
                <span className="block text-[11px] text-slate-500 mt-0.5">
                  {project.widthMm} × {project.heightMm} mm · {project.pageCount} page(s)
                </span>
              </div>
              <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200">
                <span className="text-blue-800 block">Blocs de texte</span>
                <strong className="text-lg text-[#0B2545]">
                  {project.elements.filter((e) => e.kind === 'text').length}
                </strong>
                <span className="block text-[11px] text-slate-600">
                  {project.extractionReport?.ocrUsed ? 'OCR + styles extraits' : 'Polices & couleurs exactes'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
                <span className="text-emerald-800 block">Tableaux structurés</span>
                <strong className="text-lg text-emerald-950">
                  {project.elements.filter((e) => e.kind === 'table').length}
                </strong>
                <span className="block text-[11px] text-slate-600">Cellules modifiables</span>
              </div>
              <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200">
                <span className="text-purple-900 block">Filets &amp; Formes</span>
                <strong className="text-lg text-purple-950">
                  {project.elements.filter((e) => e.kind === 'shape').length}
                </strong>
                <span className="block text-[11px] text-slate-600">Séparateurs &amp; cadres</span>
              </div>
              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200">
                <span className="text-amber-900 block">Visuels prélevés</span>
                <strong className="text-lg text-amber-950">{project.assets.length}</strong>
                <span className="block text-[11px] text-slate-600">Logos, tampons, signatures</span>
              </div>
            </div>

            {project.extractionReport && project.extractionReport.engineNotes.length > 0 && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-700 space-y-1">
                <strong className="text-[#0B2545] block">Journal d’analyse hybride :</strong>
                {project.extractionReport.engineNotes.map((note, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{note}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl border border-slate-200 space-y-3">
                <span className="font-bold text-[#0B2545] block">Palette &amp; Fond de page détectés</span>
                <div className="flex flex-wrap gap-3">
                  {(
                    [
                      { key: 'primary', label: 'Principale' },
                      { key: 'accent', label: 'Accent' },
                      { key: 'text', label: 'Texte' },
                      { key: 'highlight', label: 'Pastille' }
                    ] as const
                  ).map((item) => (
                    <label key={item.key} className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="color"
                        value={project.palette[item.key]}
                        onChange={(e) => {
                          const val = e.target.value;
                          commitProjectChange((prev) => ({
                            ...prev,
                            palette: { ...prev.palette, [item.key]: val }
                          }));
                        }}
                        className="w-7 h-7 rounded border border-slate-300 cursor-pointer"
                      />
                      <span className="font-semibold text-slate-700">{item.label}</span>
                    </label>
                  ))}
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="color"
                      value={project.pageBgColor}
                      onChange={(e) =>
                        commitProjectChange((prev) => ({ ...prev, pageBgColor: e.target.value }))
                      }
                      className="w-7 h-7 rounded border border-slate-300 cursor-pointer"
                    />
                    <span className="font-semibold text-slate-700">Fond papier</span>
                  </label>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 space-y-3">
                <span className="font-bold text-[#0B2545] block">Marges document (mm)</span>
                <div className="grid grid-cols-4 gap-2">
                  {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
                    <label key={side} className="space-y-1">
                      <span className="text-[11px] uppercase text-slate-500 block">{side}</span>
                      <input
                        type="number"
                        min={4}
                        max={45}
                        value={project.marginsMm[side]}
                        onChange={(e) =>
                          commitProjectChange((prev) => ({
                            ...prev,
                            marginsMm: {
                              ...prev.marginsMm,
                              [side]: clamp(Number(e.target.value) || 12, 4, 45)
                            }
                          }))
                        }
                        className="w-full px-2 py-1.5 border border-slate-300 rounded-lg font-mono"
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* ÉTAPE 3 : EXTRACTION & BIBLIOTHÈQUE DES VISUELS RÉELS             */}
        {/* ================================================================= */}
        {step === 3 && project && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <h4 className="text-sm sm:text-base font-extrabold text-[#0B2545]">
                  Étape 3 — Visuels authentiques découpés depuis le document source
                </h4>
                <p className="text-xs text-slate-500">
                  Chaque logo, cachet, signature ou code 2D est prélevé fidèlement sans aucune altération IA. Vous pouvez remplacer ou ajouter un visuel local.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="min-h-[40px] px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer">
                  <Plus className="w-4 h-4 text-[#0066B3]" />
                  <span>Ajouter un visuel</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = '';
                      if (f) void handleAddImageFile(f);
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="min-h-[40px] px-4 py-2 rounded-lg bg-[#0066B3] hover:bg-[#005291] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Ouvrir Spécimen Interactif</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {project.assets.length === 0 ? (
              <div className="p-8 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-500">
                Aucun visuel graphique isolé détecté. Vous pouvez importer un logo, une signature ou un cachet via « Ajouter un visuel ».
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {project.assets.map((asset) => (
                  <div
                    key={asset.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between gap-3"
                  >
                    <div className="space-y-2">
                      <div className="h-28 rounded-lg bg-white border border-slate-200 flex items-center justify-center p-2 overflow-hidden">
                        <img
                          src={asset.localDataUrl}
                          alt={asset.name}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <input
                        type="text"
                        value={asset.name}
                        onChange={(e) =>
                          commitProjectChange((prev) => ({
                            ...prev,
                            assets: prev.assets.map((a) =>
                              a.id === asset.id ? { ...a, name: e.target.value } : a
                            )
                          }))
                        }
                        className="w-full px-2.5 py-1.5 text-xs font-bold bg-white border border-slate-300 rounded-lg"
                      />
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <select
                          value={asset.role}
                          onChange={(e) =>
                            commitProjectChange((prev) => ({
                              ...prev,
                              assets: prev.assets.map((a) =>
                                a.id === asset.id
                                  ? { ...a, role: e.target.value as ReplicaVisualRole }
                                  : a
                              )
                            }))
                          }
                          className="px-2 py-1 rounded border border-slate-300 bg-white font-semibold"
                        >
                          <option value="logo">Logo</option>
                          <option value="signature">Signature</option>
                          <option value="cachet">Cachet / Tampon</option>
                          <option value="filigrane">Filigrane</option>
                          <option value="qrcode">QR Code</option>
                          <option value="barcode">Code-Barres</option>
                          <option value="illustration">Illustration</option>
                        </select>
                        <span className="text-slate-500 font-mono">
                          {asset.widthPx}×{asset.heightPx}px
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200">
                      <label className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-[11px] font-bold text-slate-700 cursor-pointer inline-flex items-center gap-1">
                        <Upload className="w-3 h-3" />
                        <span>Remplacer</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            e.target.value = '';
                            if (f) void handleReplaceAssetImage(asset.id, f);
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => handleDeleteAsset(asset.id)}
                        className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 cursor-pointer"
                        title="Supprimer ce visuel"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* ÉTAPES 4 & 5 : SPÉCIMEN INTERACTIF & ÉDITEUR CANVA COMPLET        */}
        {/* ================================================================= */}
        {(step === 4 || step === 5) && project && (
          <div className="space-y-3">
            {/* BANDEAU ÉTAPE 4 OU BARRE D'OUTILS CANVA COMPLÈTE (ÉTAPE 5) */}
            {step === 4 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-3.5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-extrabold text-[#0B2545]">
                      Étape 4 — Spécimen interactif fidèle &amp; Comparateur Visuel (Page {activePageIndex + 1}/{project.pageCount})
                    </h4>
                    <p className="text-xs text-slate-600">
                      Comparez côte à côte ou par superposition contre l’original, ou cliquez directement sur tout élément pour le corriger.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setStep(5)}
                      className="min-h-[42px] px-4 py-2 rounded-lg bg-[#0066B3] hover:bg-[#005291] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                      <span>Ouvrir Outils Canva (Étape 5)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep(6)}
                      className="min-h-[42px] px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Mail className="w-4 h-4" />
                      <span>Générer Email HTML (Étape 6)</span>
                    </button>
                  </div>
                </div>

                {/* BARRE COMPARATEUR VISUEL & DIAGNOSTIC FIDÉLITÉ */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                  <div className="inline-flex bg-slate-100 p-1 rounded-lg font-bold">
                    <button
                      type="button"
                      onClick={() => setCompareMode('editor')}
                      className={`px-2.5 py-1 rounded-md inline-flex items-center gap-1 cursor-pointer ${
                        compareMode === 'editor' ? 'bg-white text-[#0B2545] shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" /> Vue Interactive
                    </button>
                    <button
                      type="button"
                      disabled={!project.sourcePageSnapshots?.[activePageIndex]}
                      onClick={() => setCompareMode('side_by_side')}
                      className={`px-2.5 py-1 rounded-md inline-flex items-center gap-1 cursor-pointer disabled:opacity-40 ${
                        compareMode === 'side_by_side' ? 'bg-white text-[#0B2545] shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      <Columns className="w-3.5 h-3.5" /> Côte à côte (Original / Réplique)
                    </button>
                    <button
                      type="button"
                      disabled={!project.sourcePageSnapshots?.[activePageIndex]}
                      onClick={() => setCompareMode('overlay')}
                      className={`px-2.5 py-1 rounded-md inline-flex items-center gap-1 cursor-pointer disabled:opacity-40 ${
                        compareMode === 'overlay' ? 'bg-white text-[#0B2545] shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" /> Superposition Calque
                    </button>
                  </div>

                  {compareMode === 'overlay' && (
                    <label className="inline-flex items-center gap-2 font-semibold text-slate-700 bg-blue-50 px-3 py-1 rounded-lg border border-blue-200">
                      <span>Opacité Original :</span>
                      <input
                        type="range"
                        min={10}
                        max={90}
                        value={overlayOpacityPct}
                        onChange={(e) => setOverlayOpacityPct(Number(e.target.value))}
                        className="w-24"
                      />
                      <span className="font-mono">{overlayOpacityPct}%</span>
                    </label>
                  )}

                  {fidelityReport && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2.5 py-1 rounded-lg font-bold inline-flex items-center gap-1 border ${
                          fidelityReport.fidelityScorePct >= 88
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-amber-50 text-amber-900 border-amber-200'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Fidélité vérifiée : {fidelityReport.fidelityScorePct}%</span>
                      </span>
                      {fidelityReport.coveragePct !== null && (
                        <span className="px-2 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold">
                          Couverture source : {fidelityReport.coveragePct}%
                        </span>
                      )}
                      {fidelityReport.distortedImagesCount > 0 && (
                        <span className="px-2 py-1 rounded-lg bg-red-100 text-red-800 font-bold">
                          {fidelityReport.distortedImagesCount} visuel(s) déformé(s)
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {fidelityReport && fidelityReport.issues.filter((i) => i.severity !== 'info').length > 0 && (
                  <div className="p-2.5 rounded-lg bg-amber-50/80 border border-amber-200 text-[11px] text-amber-950 space-y-1">
                    {fidelityReport.issues
                      .filter((i) => i.severity !== 'info')
                      .slice(0, 3)
                      .map((issue, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>{issue.message}</span>
                          </span>
                          {issue.elementId && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedIds([issue.elementId!]);
                                setStep(5);
                              }}
                              className="px-2 py-0.5 rounded bg-white border border-amber-300 font-bold hover:bg-amber-100 cursor-pointer shrink-0"
                            >
                              Sélectionner
                            </button>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 p-2.5 flex flex-wrap items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={historyPast.length === 0}
                  className="min-h-[38px] px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold inline-flex items-center gap-1 cursor-pointer disabled:opacity-40"
                  title="Annuler (Ctrl+Z)"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Annuler</span>
                </button>
                <button
                  type="button"
                  onClick={handleRedo}
                  disabled={historyFuture.length === 0}
                  className="min-h-[38px] px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold inline-flex items-center gap-1 cursor-pointer disabled:opacity-40"
                  title="Rétablir (Ctrl+Y)"
                >
                  <Redo2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Rétablir</span>
                </button>

                <span className="h-5 w-px bg-slate-200 mx-0.5" />

                <button
                  type="button"
                  onClick={handleCopySelected}
                  disabled={selectedIds.length === 0}
                  className="min-h-[38px] px-2 py-1.5 rounded-lg hover:bg-slate-100 text-slate-700 font-semibold inline-flex items-center gap-1 cursor-pointer disabled:opacity-40"
                  title="Copier (Ctrl+C)"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  disabled={clipboardElements.length === 0}
                  className="min-h-[38px] px-2 py-1.5 rounded-lg hover:bg-slate-100 text-slate-700 font-semibold inline-flex items-center gap-1 cursor-pointer disabled:opacity-40"
                  title="Coller (Ctrl+V)"
                >
                  <ClipboardPaste className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleDuplicateSelected}
                  disabled={selectedIds.length === 0}
                  className="min-h-[38px] px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-slate-700 font-semibold inline-flex items-center gap-1 cursor-pointer disabled:opacity-40"
                  title="Dupliquer (Ctrl+D)"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Dupliquer</span>
                </button>
                <button
                  type="button"
                  onClick={handleToggleLockSelected}
                  disabled={selectedIds.length === 0}
                  className="min-h-[38px] px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-slate-700 font-semibold inline-flex items-center gap-1 cursor-pointer disabled:opacity-40"
                  title="Verrouiller / Déverrouiller"
                >
                  {primarySelected?.locked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  disabled={selectedIds.length === 0}
                  className="min-h-[38px] px-2.5 py-1.5 rounded-lg hover:bg-red-50 text-red-600 font-semibold inline-flex items-center gap-1 cursor-pointer disabled:opacity-40"
                  title="Supprimer (Suppr)"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                <span className="h-5 w-px bg-slate-200 mx-0.5" />

                <button
                  type="button"
                  onClick={handleAddTextBlock}
                  className="min-h-[38px] px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#0B2545] font-bold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Type className="w-3.5 h-3.5 text-[#0066B3]" />
                  <span>+ Texte</span>
                </button>
                <button
                  type="button"
                  onClick={handleAddTableBlock}
                  className="min-h-[38px] px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-950 font-bold inline-flex items-center gap-1 cursor-pointer"
                >
                  <TableIcon className="w-3.5 h-3.5 text-emerald-700" />
                  <span>+ Tableau</span>
                </button>
                <label className="min-h-[38px] px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-950 font-bold inline-flex items-center gap-1 cursor-pointer">
                  <ImageIcon className="w-3.5 h-3.5 text-amber-700" />
                  <span>+ Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = '';
                      if (f) void handleAddImageFile(f);
                    }}
                  />
                </label>

                <div className="flex-1" />

                <button
                  type="button"
                  onClick={() => setIsPanMode((v) => !v)}
                  className={`min-h-[38px] px-2.5 py-1.5 rounded-lg font-bold inline-flex items-center gap-1 cursor-pointer ${
                    isPanMode ? 'bg-[#0B2545] text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                  title="Mode déplacement / Pan"
                >
                  {isPanMode ? <Hand className="w-3.5 h-3.5" /> : <MousePointer2 className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">{isPanMode ? 'Main (Pan)' : 'Sélection'}</span>
                </button>

                <div className="inline-flex items-center bg-slate-100 rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => setZoomPct((z) => clamp(z - 15, 50, 160))}
                    className="p-1.5 rounded hover:bg-white cursor-pointer"
                    title="Zoom -"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setZoomPct(100);
                      setPanOffset({ x: 0, y: 0 });
                    }}
                    className="px-2 text-[11px] font-bold cursor-pointer"
                  >
                    {zoomPct}%
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomPct((z) => clamp(z + 15, 50, 160))}
                    className="p-1.5 rounded hover:bg-white cursor-pointer"
                    title="Zoom +"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowLayersPanel((v) => !v)}
                  className={`min-h-[38px] px-2.5 py-1.5 rounded-lg font-bold inline-flex items-center gap-1 cursor-pointer ${
                    showLayersPanel ? 'bg-[#0066B3] text-white' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Calques ({pageElements.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStep(6)}
                  className="min-h-[38px] px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Email HTML</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* SÉLECTEUR MULTI-PAGES SI > 1 PAGE */}
            {project.pageCount > 1 && (
              <div className="flex flex-wrap items-center gap-2">
                {Array.from({ length: project.pageCount }, (_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setActivePageIndex(idx);
                      setSelectedIds([]);
                    }}
                    className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-bold cursor-pointer border ${
                      activePageIndex === idx
                        ? 'bg-[#0B2545] text-white border-[#0B2545]'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Page {idx + 1}
                  </button>
                ))}
              </div>
            )}

            {/* BARRE MULTI-SÉLECTION (QUAND >= 2 ÉLÉMENTS SÉLECTIONNÉS) */}
            {(step === 4 || step === 5) && selectedIds.length > 1 && (
              <div className="bg-blue-50 border border-[#0066B3]/30 rounded-xl px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-extrabold text-[#0B2545]">
                  {selectedIds.length} éléments sélectionnés (glissez-les ensemble ou alignez) :
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleAlignSelectedMulti('left')}
                    className="px-2.5 py-1 rounded bg-white border border-slate-300 hover:bg-slate-100 font-bold cursor-pointer"
                  >
                    Aligner Gauche
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAlignSelectedMulti('center')}
                    className="px-2.5 py-1 rounded bg-white border border-slate-300 hover:bg-slate-100 font-bold cursor-pointer"
                  >
                    Centrer H
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAlignSelectedMulti('right')}
                    className="px-2.5 py-1 rounded bg-white border border-slate-300 hover:bg-slate-100 font-bold cursor-pointer"
                  >
                    Aligner Droite
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAlignSelectedMulti('top')}
                    className="px-2.5 py-1 rounded bg-white border border-slate-300 hover:bg-slate-100 font-bold cursor-pointer"
                  >
                    Aligner Haut
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteSelected}
                    className="px-2.5 py-1 rounded bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 font-bold cursor-pointer"
                  >
                    Supprimer ({selectedIds.length})
                  </button>
                </div>
              </div>
            )}

            {/* BARRE CONTEXTUELLE D'INSPECTION DE L'ÉLÉMENT SÉLECTIONNÉ */}
            {step === 5 && primarySelected && (
              <div className="bg-white rounded-xl border-2 border-[#0066B3]/30 p-3 space-y-2.5 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                  <span className="font-extrabold text-[#0B2545] flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] uppercase font-extrabold ${
                        primarySelected.kind === 'image'
                          ? 'bg-emerald-100 text-emerald-800'
                          : primarySelected.kind === 'table'
                          ? 'bg-indigo-100 text-indigo-800'
                          : primarySelected.kind === 'shape'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {primarySelected.kind === 'image'
                        ? 'Visuel Graphique'
                        : primarySelected.kind === 'table'
                        ? 'Tableau'
                        : primarySelected.kind === 'shape'
                        ? 'Décoratif'
                        : 'Texte Éditable'}
                    </span>
                    <span>{primarySelected.name}</span>
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    {primarySelected.kind === 'text' && !primarySelected.locked && (
                      <button
                        type="button"
                        onClick={() =>
                          setEditingTextId((cur) => (cur === primarySelected.id ? null : primarySelected.id))
                        }
                        className="px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 text-[#0066B3] font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>{editingTextId === primarySelected.id ? 'Terminer texte' : 'Éditer texte'}</span>
                      </button>
                    )}
                    <label className="inline-flex items-center gap-1">
                      <span className="text-slate-500">Opacité</span>
                      <input
                        type="range"
                        min={10}
                        max={100}
                        value={primarySelected.opacity}
                        onChange={(e) => updateSelectedElement({ opacity: Number(e.target.value) })}
                        className="w-16"
                      />
                      <span className="font-mono w-8">{primarySelected.opacity}%</span>
                    </label>
                    <label className="inline-flex items-center gap-1">
                      <RotateCw className="w-3 h-3 text-slate-500" />
                      <input
                        type="number"
                        min={-180}
                        max={180}
                        value={primarySelected.rotation}
                        onChange={(e) => updateSelectedElement({ rotation: Number(e.target.value) || 0 })}
                        className="w-14 px-1.5 py-0.5 border border-slate-300 rounded font-mono"
                      />
                      <span>°</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => updateSelectedElement({ zIndex: primarySelected.zIndex + 2 })}
                      className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 font-semibold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowUp className="w-3 h-3" /> Avant
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateSelectedElement({ zIndex: Math.max(1, primarySelected.zIndex - 2) })
                      }
                      className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 font-semibold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowDown className="w-3 h-3" /> Arrière
                    </button>
                  </div>
                </div>

                {/* PROPRIÉTÉS TEXTE */}
                {primarySelected.kind === 'text' && (
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={primarySelected.fontFamily}
                      onChange={(e) =>
                        updateSelectedElement({
                          fontFamily: e.target.value as ReplicaTextElement['fontFamily']
                        })
                      }
                      className="px-2 py-1.5 rounded border border-slate-300 bg-white font-semibold"
                    >
                      <option value="sans-serif">Sans-serif (Arial/Calibri)</option>
                      <option value="serif">Serif (Times/Georgia)</option>
                      <option value="monospace">Monospace (Courier)</option>
                    </select>

                    <label className="inline-flex items-center gap-1">
                      <span>Taille</span>
                      <input
                        type="number"
                        min={6}
                        max={48}
                        step={0.5}
                        value={primarySelected.fontSizePt}
                        onChange={(e) =>
                          updateSelectedElement({ fontSizePt: Number(e.target.value) || 10 })
                        }
                        className="w-14 px-1.5 py-1 border border-slate-300 rounded font-mono"
                      />
                      <span>pt</span>
                    </label>

                    <button
                      type="button"
                      onClick={() =>
                        updateSelectedElement({
                          fontWeight:
                            primarySelected.fontWeight === '700' || primarySelected.fontWeight === '800'
                              ? '400'
                              : '700'
                        })
                      }
                      className={`p-1.5 rounded border cursor-pointer ${
                        primarySelected.fontWeight === '700' || primarySelected.fontWeight === '800'
                          ? 'bg-[#0B2545] text-white border-[#0B2545]'
                          : 'bg-white border-slate-300'
                      }`}
                    >
                      <Bold className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateSelectedElement({
                          fontStyle: primarySelected.fontStyle === 'italic' ? 'normal' : 'italic'
                        })
                      }
                      className={`p-1.5 rounded border cursor-pointer ${
                        primarySelected.fontStyle === 'italic'
                          ? 'bg-[#0B2545] text-white border-[#0B2545]'
                          : 'bg-white border-slate-300'
                      }`}
                    >
                      <Italic className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateSelectedElement({
                          textDecoration:
                            primarySelected.textDecoration === 'underline' ? 'none' : 'underline'
                        })
                      }
                      className={`p-1.5 rounded border cursor-pointer ${
                        primarySelected.textDecoration === 'underline'
                          ? 'bg-[#0B2545] text-white border-[#0B2545]'
                          : 'bg-white border-slate-300'
                      }`}
                    >
                      <Underline className="w-3.5 h-3.5" />
                    </button>

                    <div className="inline-flex border border-slate-300 rounded overflow-hidden">
                      {(
                        [
                          { val: 'left', icon: AlignLeft },
                          { val: 'center', icon: AlignCenter },
                          { val: 'right', icon: AlignRight },
                          { val: 'justify', icon: AlignJustify }
                        ] as const
                      ).map((al) => {
                        const AlIcon = al.icon;
                        return (
                          <button
                            key={al.val}
                            type="button"
                            onClick={() => updateSelectedElement({ textAlign: al.val })}
                            className={`p-1.5 cursor-pointer ${
                              primarySelected.textAlign === al.val
                                ? 'bg-[#0066B3] text-white'
                                : 'bg-white hover:bg-slate-100'
                            }`}
                          >
                            <AlIcon className="w-3.5 h-3.5" />
                          </button>
                        );
                      })}
                    </div>

                    <label className="inline-flex items-center gap-1 cursor-pointer">
                      <span>Texte</span>
                      <input
                        type="color"
                        value={primarySelected.color}
                        onChange={(e) => updateSelectedElement({ color: e.target.value })}
                        className="w-6 h-6 rounded border border-slate-300"
                      />
                    </label>
                    <label className="inline-flex items-center gap-1 cursor-pointer">
                      <span>Fond</span>
                      <input
                        type="color"
                        value={
                          primarySelected.backgroundColor === 'transparent'
                            ? '#FFFFFF'
                            : primarySelected.backgroundColor
                        }
                        onChange={(e) => updateSelectedElement({ backgroundColor: e.target.value })}
                        className="w-6 h-6 rounded border border-slate-300"
                      />
                      {primarySelected.backgroundColor !== 'transparent' && (
                        <button
                          type="button"
                          onClick={() => updateSelectedElement({ backgroundColor: 'transparent' })}
                          className="text-[10px] underline text-slate-500 cursor-pointer"
                        >
                          Transp.
                        </button>
                      )}
                    </label>

                    <label className="inline-flex items-center gap-1">
                      <span>Interligne</span>
                      <input
                        type="number"
                        min={1}
                        max={2.5}
                        step={0.05}
                        value={primarySelected.lineHeight}
                        onChange={(e) =>
                          updateSelectedElement({ lineHeight: Number(e.target.value) || 1.3 })
                        }
                        className="w-14 px-1.5 py-1 border border-slate-300 rounded font-mono"
                      />
                    </label>
                    <label className="inline-flex items-center gap-1">
                      <span>Esp. lettres</span>
                      <input
                        type="number"
                        min={-0.05}
                        max={0.3}
                        step={0.01}
                        value={primarySelected.letterSpacingEm}
                        onChange={(e) =>
                          updateSelectedElement({ letterSpacingEm: Number(e.target.value) || 0 })
                        }
                        className="w-14 px-1.5 py-1 border border-slate-300 rounded font-mono"
                      />
                    </label>
                  </div>
                )}

                {/* PROPRIÉTÉS IMAGE */}
                {primarySelected.kind === 'image' && (
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="inline-flex items-center gap-1.5 font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={primarySelected.lockAspectRatio}
                        onChange={(e) =>
                          updateSelectedElement({ lockAspectRatio: e.target.checked })
                        }
                      />
                      <span>Conserver les proportions</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const asset = assetById.get((primarySelected as ReplicaImageElement).assetId);
                        if (!asset) return;
                        const lockedH = computeAspectLockedHeightPct(
                          primarySelected.wPct,
                          asset.widthPx,
                          asset.heightPx,
                          project.widthMm,
                          project.heightMm
                        );
                        updateSelectedElement({ hPct: lockedH, lockAspectRatio: true });
                        onToast('Proportions natives exactes restaurées.');
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 font-bold cursor-pointer"
                    >
                      Ratio 1:1 original
                    </button>
                    <label className="px-3 py-1.5 rounded-lg bg-[#0066B3] hover:bg-[#005291] text-white font-bold cursor-pointer inline-flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Remplacer cette image</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          e.target.value = '';
                          if (f)
                            void handleReplaceAssetImage(
                              (primarySelected as ReplicaImageElement).assetId,
                              f
                            );
                        }}
                      />
                    </label>
                  </div>
                )}

                {/* PROPRIÉTÉS TABLEAU */}
                {primarySelected.kind === 'table' && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const tbl = primarySelected as ReplicaTableElement;
                        const cols = tbl.rows[0]?.length || 2;
                        updateSelectedElement({
                          rows: [
                            ...tbl.rows,
                            Array.from({ length: cols }, () => ({
                              text: 'Nouvelle cellule',
                              bgColor: '#FFFFFF',
                              textColor: '#0F172A',
                              bold: false,
                              align: 'left' as const
                            }))
                          ]
                        });
                      }}
                      className="px-2.5 py-1 rounded bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold cursor-pointer"
                    >
                      + Ligne
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const tbl = primarySelected as ReplicaTableElement;
                        if (tbl.rows.length <= 1) return;
                        updateSelectedElement({ rows: tbl.rows.slice(0, -1) });
                      }}
                      className="px-2.5 py-1 rounded bg-slate-100 border border-slate-200 font-semibold cursor-pointer"
                    >
                      - Ligne
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const tbl = primarySelected as ReplicaTableElement;
                        const nextCols = (tbl.rows[0]?.length || 1) + 1;
                        updateSelectedElement({
                          rows: tbl.rows.map((r, rIdx) => [
                            ...r,
                            {
                              text: rIdx === 0 ? `Col ${nextCols}` : 'Valeur',
                              bgColor: rIdx === 0 ? project.palette.highlight : '#FFFFFF',
                              textColor: '#0F172A',
                              bold: rIdx === 0,
                              align: 'left' as const
                            }
                          ]),
                          colWidthsPct: Array.from({ length: nextCols }, () =>
                            Math.round((100 / nextCols) * 10) / 10
                          )
                        });
                      }}
                      className="px-2.5 py-1 rounded bg-blue-50 border border-blue-200 text-[#0B2545] font-bold cursor-pointer"
                    >
                      + Colonne
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const tbl = primarySelected as ReplicaTableElement;
                        if ((tbl.rows[0]?.length || 0) <= 1) return;
                        const nextCols = tbl.rows[0].length - 1;
                        updateSelectedElement({
                          rows: tbl.rows.map((r) => r.slice(0, -1)),
                          colWidthsPct: Array.from({ length: nextCols }, () =>
                            Math.round((100 / nextCols) * 10) / 10
                          )
                        });
                      }}
                      className="px-2.5 py-1 rounded bg-slate-100 border border-slate-200 font-semibold cursor-pointer"
                    >
                      - Colonne
                    </button>
                    <label className="inline-flex items-center gap-1">
                      <span>Bordure</span>
                      <input
                        type="color"
                        value={primarySelected.borderColor}
                        onChange={(e) => updateSelectedElement({ borderColor: e.target.value })}
                        className="w-6 h-6 rounded border border-slate-300"
                      />
                    </label>
                    <label className="inline-flex items-center gap-1">
                      <span>Padding</span>
                      <input
                        type="number"
                        min={2}
                        max={18}
                        value={primarySelected.cellPaddingPx}
                        onChange={(e) =>
                          updateSelectedElement({ cellPaddingPx: Number(e.target.value) || 6 })
                        }
                        className="w-12 px-1 py-0.5 border border-slate-300 rounded font-mono"
                      />
                    </label>
                    {activeTableCell && activeTableCell.elId === primarySelected.id && (
                      <div className="flex items-center gap-1.5 pl-2 border-l border-slate-300">
                        <span className="font-bold text-[#0066B3]">
                          Cellule L{activeTableCell.r + 1}:C{activeTableCell.c + 1}
                        </span>
                        <input
                          type="color"
                          value={
                            primarySelected.rows[activeTableCell.r]?.[activeTableCell.c]?.bgColor ||
                            '#FFFFFF'
                          }
                          onChange={(e) => {
                            const tbl = primarySelected as ReplicaTableElement;
                            const nextRows = tbl.rows.map((row, ri) =>
                              ri === activeTableCell.r
                                ? row.map((cell, ci) =>
                                    ci === activeTableCell.c
                                      ? { ...cell, bgColor: e.target.value }
                                      : cell
                                  )
                                : row
                            );
                            updateSelectedElement({ rows: nextRows });
                          }}
                          className="w-6 h-6 rounded border border-slate-300"
                          title="Fond cellule"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const tbl = primarySelected as ReplicaTableElement;
                            const nextRows = tbl.rows.map((row, ri) =>
                              ri === activeTableCell.r
                                ? row.map((cell, ci) =>
                                    ci === activeTableCell.c ? { ...cell, bold: !cell.bold } : cell
                                  )
                                : row
                            );
                            updateSelectedElement({ rows: nextRows });
                          }}
                          className="px-2 py-1 rounded border border-slate-300 bg-white font-bold cursor-pointer"
                        >
                          Gras
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ZONE CENTRALE : COMPARATEUR CÔTE À CÔTE + FEUILLE CANVA + PANNEAU CALQUES */}
            <div className="flex flex-col lg:flex-row gap-4 items-start">
              {compareMode === 'side_by_side' && project.sourcePageSnapshots?.[activePageIndex] && (
                <div className="w-full lg:w-[46%] rounded-xl bg-slate-100 border border-slate-300 p-2 sm:p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs font-extrabold text-[#0B2545] px-1">
                    <span>Document Source Original (Page {activePageIndex + 1})</span>
                    <span className="text-[11px] font-mono text-slate-500">
                      {project.widthMm} × {project.heightMm} mm
                    </span>
                  </div>
                  <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                    <img
                      src={project.sourcePageSnapshots[activePageIndex]}
                      alt={`Original page ${activePageIndex + 1}`}
                      className="w-full h-auto block"
                    />
                  </div>
                </div>
              )}

              <div
                className={`flex-1 w-full min-w-0 rounded-xl bg-slate-200/80 border border-slate-300 p-2 sm:p-4 overflow-hidden ${
                  isPanMode ? 'cursor-grab active:cursor-grabbing' : ''
                }`}
              >
                <div style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px)` }}>
                  <ResponsivePaperWrapper
                    paperWidthPx={paperWidthPx}
                    minPaperHeightPx={paperHeightPx}
                    manualZoomPct={zoomPct}
                  >
                    <div
                      ref={paperRef}
                      data-paper-backdrop="1"
                      onPointerDown={handlePaperPointerDown}
                      className="relative shadow-lg select-none overflow-hidden"
                      style={{
                        width: `${paperWidthPx}px`,
                        height: `${paperHeightPx}px`,
                        backgroundColor: project.pageBgColor || '#FFFFFF'
                      }}
                    >
                      {compareMode === 'overlay' && project.sourcePageSnapshots?.[activePageIndex] && (
                        <img
                          src={project.sourcePageSnapshots[activePageIndex]}
                          alt="Calque comparateur source"
                          draggable={false}
                          className="absolute inset-0 w-full h-full object-fill pointer-events-none z-[85]"
                          style={{ opacity: overlayOpacityPct / 100 }}
                        />
                      )}

                      {pageElements.map((el) => {
                        if (!el.visible) return null;
                        const isSelected = selectedIds.includes(el.id);
                        const selectionColor =
                          el.locked
                            ? '#F59E0B'
                            : el.kind === 'image'
                            ? '#059669'
                            : el.kind === 'table'
                            ? '#4F46E5'
                            : el.kind === 'shape'
                            ? '#D97706'
                            : '#0066B3';

                        return (
                          <div
                            key={el.id}
                            onPointerDown={(e) => handleElementPointerDown(e, el)}
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              if (el.kind === 'text' && !el.locked) {
                                setEditingTextId(el.id);
                                setSelectedIds([el.id]);
                                setStep(5);
                              }
                            }}
                            style={{
                              position: 'absolute',
                              left: `${el.xPct}%`,
                              top: `${el.yPct}%`,
                              width: `${el.wPct}%`,
                              height: el.kind === 'text' ? 'auto' : `${el.hPct}%`,
                              minHeight: el.kind === 'text' ? `${el.hPct}%` : undefined,
                              zIndex: el.zIndex,
                              opacity: el.opacity / 100,
                              transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
                              outline: isSelected
                                ? `2px solid ${selectionColor}`
                                : '1px solid transparent',
                              outlineOffset: '2px',
                              cursor: el.locked ? 'not-allowed' : isPanMode ? 'grab' : 'move'
                            }}
                          >
                            {isSelected && (
                              <span
                                className="absolute -top-5 left-0 px-1.5 py-0.5 rounded text-[9px] font-bold text-white pointer-events-none shadow-xs whitespace-nowrap"
                                style={{ backgroundColor: selectionColor }}
                              >
                                {el.kind === 'image'
                                  ? 'Visuel'
                                  : el.kind === 'table'
                                  ? 'Tableau'
                                  : el.kind === 'shape'
                                  ? 'Forme'
                                  : 'Texte'}
                              </span>
                            )}
                            {/* RENDU TEXTE */}
                            {el.kind === 'text' &&
                              (editingTextId === el.id ? (
                                <textarea
                                  autoFocus
                                  value={el.text}
                                  onChange={(e) =>
                                    commitProjectChange(
                                      (prev) => ({
                                        ...prev,
                                        elements: prev.elements.map((item) =>
                                          item.id === el.id
                                            ? ({ ...item, text: e.target.value } as ReplicaElement)
                                            : item
                                        )
                                      }),
                                      false
                                    )
                                  }
                                  onBlur={() => setEditingTextId(null)}
                                  className="w-full h-full min-h-[28px] p-0.5 border border-[#0066B3] bg-white/95 outline-none resize-y"
                                  style={{
                                    fontFamily:
                                      el.fontFamily === 'serif'
                                        ? 'Georgia, serif'
                                        : el.fontFamily === 'monospace'
                                        ? 'monospace'
                                        : 'Arial, sans-serif',
                                    fontSize: `${el.fontSizePt}pt`,
                                    fontWeight: el.fontWeight,
                                    fontStyle: el.fontStyle,
                                    color: el.color,
                                    textAlign: el.textAlign,
                                    lineHeight: el.lineHeight,
                                    letterSpacing: `${el.letterSpacingEm}em`
                                  }}
                                />
                              ) : (
                                <div
                                  className="w-full whitespace-pre-wrap break-words"
                                  style={{
                                    fontFamily:
                                      el.fontFamily === 'serif'
                                        ? 'Georgia, serif'
                                        : el.fontFamily === 'monospace'
                                        ? 'monospace'
                                        : 'Arial, sans-serif',
                                    fontSize: `${el.fontSizePt}pt`,
                                    fontWeight: el.fontWeight,
                                    fontStyle: el.fontStyle,
                                    textDecoration: el.textDecoration,
                                    color: el.color,
                                    backgroundColor:
                                      el.backgroundColor && el.backgroundColor !== 'transparent'
                                        ? el.backgroundColor
                                        : undefined,
                                    textAlign: el.textAlign,
                                    lineHeight: el.lineHeight,
                                    letterSpacing: `${el.letterSpacingEm}em`,
                                    padding: el.backgroundColor !== 'transparent' ? '2px 4px' : undefined
                                  }}
                                >
                                  {el.text}
                                </div>
                              ))}

                            {/* RENDU IMAGE EXTRAITE */}
                            {el.kind === 'image' &&
                              (() => {
                                const asset = assetById.get(el.assetId);
                                return asset ? (
                                  <img
                                    src={asset.localDataUrl}
                                    alt={el.name}
                                    draggable={false}
                                    className="w-full h-full object-contain pointer-events-none"
                                  />
                                ) : null;
                              })()}

                            {/* RENDU TABLEAU INTERACTIF */}
                            {el.kind === 'table' && (
                              <table
                                className="w-full h-full border-collapse"
                                style={{ fontSize: `${el.fontSizePt}pt` }}
                              >
                                <tbody>
                                  {el.rows.map((row, rIdx) => (
                                    <tr key={rIdx}>
                                      {row.map((cell, cIdx) => (
                                        <td
                                          key={cIdx}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedIds([el.id]);
                                            setActiveTableCell({ elId: el.id, r: rIdx, c: cIdx });
                                            setStep(5);
                                          }}
                                          style={{
                                            width: el.colWidthsPct[cIdx]
                                              ? `${el.colWidthsPct[cIdx]}%`
                                              : undefined,
                                            backgroundColor: cell.bgColor,
                                            color: cell.textColor,
                                            fontWeight: cell.bold ? 700 : 400,
                                            textAlign: cell.align,
                                            padding: `${el.cellPaddingPx}px`,
                                            border: `${el.borderWidthPx}px solid ${el.borderColor}`
                                          }}
                                        >
                                          <input
                                            type="text"
                                            value={cell.text}
                                            onChange={(e) => {
                                              const val = e.target.value;
                                              commitProjectChange(
                                                (prev) => ({
                                                  ...prev,
                                                  elements: prev.elements.map((item) => {
                                                    if (item.id !== el.id || item.kind !== 'table')
                                                      return item;
                                                    return {
                                                      ...item,
                                                      rows: item.rows.map((rw, ri) =>
                                                        ri === rIdx
                                                          ? rw.map((cl, ci) =>
                                                              ci === cIdx
                                                                ? { ...cl, text: val }
                                                                : cl
                                                            )
                                                          : rw
                                                      )
                                                    };
                                                  })
                                                }),
                                                false
                                              );
                                            }}
                                            className="w-full bg-transparent outline-none"
                                            style={{
                                              textAlign: cell.align,
                                              fontWeight: cell.bold ? 700 : 400,
                                              color: cell.textColor
                                            }}
                                          />
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}

                            {/* RENDU FORME / FILET */}
                            {el.kind === 'shape' && (
                              <div
                                className="w-full h-full"
                                style={{
                                  borderTop:
                                    el.shapeType === 'line_h' || el.shapeType === 'rect'
                                      ? `${el.strokeWidthPx}px solid ${el.strokeColor}`
                                      : undefined,
                                  borderLeft:
                                    el.shapeType === 'line_v' || el.shapeType === 'rect'
                                      ? `${el.strokeWidthPx}px solid ${el.strokeColor}`
                                      : undefined,
                                  borderRight:
                                    el.shapeType === 'rect'
                                      ? `${el.strokeWidthPx}px solid ${el.strokeColor}`
                                      : undefined,
                                  borderBottom:
                                    el.shapeType === 'rect'
                                      ? `${el.strokeWidthPx}px solid ${el.strokeColor}`
                                      : undefined,
                                  backgroundColor:
                                    el.shapeType === 'rect' ? el.fillColor : 'transparent'
                                }}
                              />
                            )}

                            {/* 8 POIGNÉES DE REDIMENSIONNEMENT */}
                            {isSelected && !el.locked && (
                              <>
                                {(
                                  [
                                    { h: 'nw', cls: '-top-1.5 -left-1.5 cursor-nwse-resize' },
                                    { h: 'n', cls: '-top-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize' },
                                    { h: 'ne', cls: '-top-1.5 -right-1.5 cursor-nesw-resize' },
                                    { h: 'e', cls: 'top-1/2 -right-1.5 -translate-y-1/2 cursor-ew-resize' },
                                    { h: 'se', cls: '-bottom-1.5 -right-1.5 cursor-nwse-resize' },
                                    { h: 's', cls: '-bottom-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize' },
                                    { h: 'sw', cls: '-bottom-1.5 -left-1.5 cursor-nesw-resize' },
                                    { h: 'w', cls: 'top-1/2 -left-1.5 -translate-y-1/2 cursor-ew-resize' }
                                  ] as const
                                ).map((handle) => (
                                  <span
                                    key={handle.h}
                                    onPointerDown={(e) => handleResizeHandleDown(e, el, handle.h)}
                                    className={`absolute w-3 h-3 rounded-full bg-white border-2 border-[#0066B3] shadow-xs z-50 ${handle.cls}`}
                                  />
                                ))}
                              </>
                            )}
                          </div>
                        );
                      })}

                      {/* RECTANGLE DE SÉLECTION MULTIPLE (MARQUEE) */}
                      {marqueeBox && (
                        <div
                          className="absolute border-2 border-dashed border-[#0066B3] bg-[#0066B3]/10 pointer-events-none z-[99]"
                          style={{
                            left: `${marqueeBox.x}%`,
                            top: `${marqueeBox.y}%`,
                            width: `${marqueeBox.w}%`,
                            height: `${marqueeBox.h}%`
                          }}
                        />
                      )}
                    </div>
                  </ResponsivePaperWrapper>
                </div>
              </div>

              {/* PANNEAU CALQUES AVEC FILTRES PAR CATÉGORIE */}
              {showLayersPanel && (
                <div className="w-full lg:w-72 shrink-0 bg-white rounded-xl border border-slate-200 p-3 space-y-2 max-h-[680px] overflow-y-auto">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-extrabold text-[#0B2545] flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-[#0066B3]" />
                      <span>Calques (Page {activePageIndex + 1})</span>
                    </span>
                    <span className="text-[10px] text-slate-500">{pageElements.length} objets</span>
                  </div>

                  <div className="flex flex-wrap gap-1 pb-1">
                    {(
                      [
                        { id: 'all', label: 'Tous' },
                        { id: 'text', label: 'Textes' },
                        { id: 'image', label: 'Visuels' },
                        { id: 'table', label: 'Tableaux' },
                        { id: 'shape', label: 'Formes' }
                      ] as const
                    ).map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setLayerKindFilter(f.id)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                          layerKindFilter === f.id
                            ? 'bg-[#0B2545] text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {[...pageElements]
                    .filter((el) => layerKindFilter === 'all' || el.kind === layerKindFilter)
                    .sort((a, b) => b.zIndex - a.zIndex)
                    .map((el) => {
                      const active = selectedIds.includes(el.id);
                      return (
                        <div
                          key={el.id}
                          onClick={(e) =>
                            setSelectedIds((prev) =>
                              e.shiftKey ? (prev.includes(el.id) ? prev.filter((x) => x !== el.id) : [...prev, el.id]) : [el.id]
                            )
                          }
                          className={`p-2 rounded-lg border text-xs flex items-center justify-between gap-1.5 cursor-pointer ${
                            active
                              ? 'bg-blue-50 border-[#0066B3] text-[#0B2545]'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <span className="font-bold truncate block">{el.name}</span>
                            <span className="text-[10px] text-slate-500 uppercase">
                              {el.kind === 'image'
                                ? `Visuel (${el.visualRole})`
                                : el.kind === 'table'
                                ? 'Tableau'
                                : el.kind === 'shape'
                                ? 'Décoratif'
                                : 'Texte'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                commitProjectChange((prev) => ({
                                  ...prev,
                                  elements: prev.elements.map((x) =>
                                    x.id === el.id ? { ...x, visible: !x.visible } : x
                                  )
                                }));
                              }}
                              className="p-1 rounded hover:bg-white cursor-pointer"
                              title={el.visible ? 'Masquer' : 'Afficher'}
                            >
                              <Eye className={`w-3.5 h-3.5 ${el.visible ? 'text-[#0066B3]' : 'text-slate-300'}`} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                commitProjectChange((prev) => ({
                                  ...prev,
                                  elements: prev.elements.map((x) =>
                                    x.id === el.id ? { ...x, locked: !x.locked } : x
                                  )
                                }));
                              }}
                              className="p-1 rounded hover:bg-white cursor-pointer"
                              title={el.locked ? 'Déverrouiller' : 'Verrouiller'}
                            >
                              {el.locked ? (
                                <Lock className="w-3.5 h-3.5 text-amber-600" />
                              ) : (
                                <Unlock className="w-3.5 h-3.5 text-slate-400" />
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* ÉTAPE 6 : GÉNÉRATION EMAIL HTML RESPONSIVE                        */}
        {/* ================================================================= */}
        {step === 6 && project && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <h4 className="text-sm sm:text-base font-extrabold text-[#0B2545]">
                  Étape 6 — Compilation Email HTML Professionnelle Responsive (Tableaux + CSS Inline)
                </h4>
                <p className="text-xs text-slate-500">
                  Zéro JavaScript, zéro bordure technique de studio, compatible Outlook (MSO) / Gmail / Apple Mail, largeur max 600px.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex flex-wrap bg-slate-100 p-1 rounded-lg text-xs font-bold gap-0.5">
                  {(
                    [
                      { id: 'desktop', label: 'Desktop', icon: Monitor },
                      { id: 'mobile', label: 'Mobile', icon: Smartphone },
                      { id: 'gmail', label: 'Gmail', icon: Mail },
                      { id: 'outlook', label: 'Outlook MSO', icon: Mail },
                      { id: 'kit', label: 'Kit', icon: Mail },
                      { id: 'code', label: 'Code', icon: Code2 }
                    ] as const
                  ).map((prof) => {
                    const ProfIcon = prof.icon;
                    return (
                      <button
                        key={prof.id}
                        type="button"
                        onClick={() => setEmailPreviewDevice(prof.id)}
                        className={`px-2 py-1.5 rounded-md inline-flex items-center gap-1 cursor-pointer ${
                          emailPreviewDevice === prof.id
                            ? 'bg-white text-[#0B2545] shadow-xs'
                            : 'text-slate-600'
                        }`}
                      >
                        <ProfIcon className="w-3.5 h-3.5" /> {prof.label}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setStep(7)}
                  className="min-h-[40px] px-4 py-2 rounded-lg bg-[#0066B3] hover:bg-[#005291] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Étape 7 : Hébergement HTTPS &amp; Audit</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <label className="sm:col-span-2 space-y-1">
                <span className="font-bold text-slate-700 block">Objet / Titre du courriel HTML</span>
                <input
                  type="text"
                  value={project.emailSubject}
                  onChange={(e) =>
                    commitProjectChange((prev) => ({ ...prev, emailSubject: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-semibold"
                />
              </label>
              <label className="space-y-1">
                <span className="font-bold text-slate-700 block">Largeur max (px)</span>
                <input
                  type="number"
                  min={480}
                  max={680}
                  value={project.emailMaxWidthPx}
                  onChange={(e) =>
                    commitProjectChange((prev) => ({
                      ...prev,
                      emailMaxWidthPx: clamp(Number(e.target.value) || 600, 480, 680)
                    }))
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-mono"
                />
              </label>
            </div>

            {emailPreviewDevice === 'code' ? (
              <textarea
                readOnly
                value={compiledHtml}
                className="w-full h-[440px] p-3 font-mono text-[11px] bg-slate-950 text-emerald-300 rounded-xl border border-slate-700"
              />
            ) : (
              <div className="bg-slate-200 p-3 rounded-xl flex flex-col items-center gap-2 overflow-x-auto">
                {(emailPreviewDevice === 'gmail' || emailPreviewDevice === 'outlook' || emailPreviewDevice === 'kit') && (
                  <div className="w-full max-w-[740px] bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-[11px] flex flex-wrap items-center justify-between gap-2 text-slate-700">
                    <span className="font-bold text-[#0B2545]">
                      Simulation client :{' '}
                      {emailPreviewDevice === 'gmail'
                        ? 'Gmail Web (poids HTML ' + (auditResult?.htmlSizeKb ?? 0) + ' Ko / 102 Ko max)'
                        : emailPreviewDevice === 'outlook'
                        ? 'Outlook Desktop (Moteur MSO Tableaux + Word)'
                        : 'Kit / Newsletter Responsive (600px centré)'}
                    </span>
                    <span className="text-slate-500">Objet : {project.emailSubject}</span>
                  </div>
                )}
                <iframe
                  title="Aperçu Email HTML Responsive"
                  srcDoc={compiledHtml}
                  className="bg-white rounded-lg border border-slate-300 shadow-sm transition-all"
                  style={{
                    width: emailPreviewDevice === 'mobile' ? '375px' : '100%',
                    maxWidth:
                      emailPreviewDevice === 'mobile'
                        ? '375px'
                        : emailPreviewDevice === 'outlook'
                        ? `${Math.max(600, project.emailMaxWidthPx + 40)}px`
                        : '740px',
                    height: '520px'
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* ÉTAPE 7 : HÉBERGEMENT PUBLIC HTTPS RÉEL & CONTRÔLE QUALITÉ HTML   */}
        {/* ================================================================= */}
        {step === 7 && project && (
          <div className="space-y-4">
            {/* BLOC A : HÉBERGEMENT PUBLIC HTTPS DES VISUELS */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div>
                  <h4 className="text-sm sm:text-base font-extrabold text-[#0B2545] flex items-center gap-2">
                    <Globe className="w-4 h-4 text-[#0066B3]" />
                    <span>Étape 7A — Hébergement Public HTTPS des Visuels (Sans URL fictive)</span>
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Les clients email (Gmail, Outlook, Infomaniak) bloquent les images locales base64. Transférez vos visuels vers un hébergeur gratuit réel avec quota transparent.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleVerifyAllHostedUrls}
                    disabled={isVerifyingUrls || project.assets.every((a) => !a.publicHttpsUrl)}
                    className="min-h-[42px] px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-45"
                  >
                    <ShieldCheck className={`w-4 h-4 ${isVerifyingUrls ? 'animate-pulse text-[#0066B3]' : 'text-emerald-700'}`} />
                    <span>{isVerifyingUrls ? 'Test HTTPS...' : 'Tester URLs HTTPS'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleHostAllAssets}
                    disabled={isUploadingAll || project.assets.length === 0}
                    className="min-h-[42px] px-4 py-2 rounded-lg bg-[#0066B3] hover:bg-[#005291] text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isUploadingAll ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Globe className="w-4 h-4" />
                    )}
                    <span>
                      {isUploadingAll ? 'Téléversement HTTPS...' : 'Héberger toutes les images en HTTPS'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                {(['cloudinary', 'imgbb', 'firebase_storage'] as HostingProvider[]).map((prov) => {
                  const info = HOSTING_PROVIDER_DOCS[prov];
                  const active = hostingConfig.activeProvider === prov;
                  return (
                    <button
                      key={prov}
                      type="button"
                      onClick={() => {
                        const next = { ...hostingConfig, activeProvider: prov };
                        setHostingConfig(next);
                        saveHostingConfig(next);
                      }}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        active
                          ? 'bg-blue-50 border-[#0066B3] ring-2 ring-[#0066B3]/15'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span className="font-extrabold text-[#0B2545] block">{info.label}</span>
                      <span className="text-[11px] text-slate-600 block mt-1">{info.quotaInfo}</span>
                    </button>
                  );
                })}
              </div>

              {/* CHAMPS IDENTIFIANTS DU FOURNISSEUR ACTIF */}
              {hostingConfig.activeProvider === 'cloudinary' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <label className="space-y-1">
                    <span className="font-bold text-slate-700 block">Cloudinary Cloud Name</span>
                    <input
                      type="text"
                      value={hostingConfig.cloudinaryCloudName}
                      onChange={(e) => {
                        const next = { ...hostingConfig, cloudinaryCloudName: e.target.value };
                        setHostingConfig(next);
                        saveHostingConfig(next);
                      }}
                      placeholder="ex: mon-cloud-gratuit"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="font-bold text-slate-700 block">Upload Preset (Unsigned)</span>
                    <input
                      type="text"
                      value={hostingConfig.cloudinaryUploadPreset}
                      onChange={(e) => {
                        const next = { ...hostingConfig, cloudinaryUploadPreset: e.target.value };
                        setHostingConfig(next);
                        saveHostingConfig(next);
                      }}
                      placeholder="ex: ml_default_unsigned"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                    />
                  </label>
                </div>
              )}

              {hostingConfig.activeProvider === 'imgbb' && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <label className="space-y-1 block max-w-md">
                    <span className="font-bold text-slate-700 block">Clé API ImgBB Free (api.imgbb.com)</span>
                    <input
                      type="password"
                      value={hostingConfig.imgbbApiKey}
                      onChange={(e) => {
                        const next = { ...hostingConfig, imgbbApiKey: e.target.value };
                        setHostingConfig(next);
                        saveHostingConfig(next);
                      }}
                      placeholder="Collez votre clé API ImgBB gratuite"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-mono"
                    />
                  </label>
                </div>
              )}

              {/* LISTE DES ACTIFS ET STATUT HTTPS */}
              <div className="space-y-2">
                {project.assets.map((asset) => (
                  <div
                    key={asset.id}
                    className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={asset.localDataUrl}
                        alt={asset.name}
                        className="w-10 h-10 object-contain rounded border border-slate-200 bg-white shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="font-bold text-slate-900 block truncate">{asset.name}</span>
                        {asset.publicHttpsUrl ? (
                          <span className="text-[11px] text-emerald-700 font-mono truncate block max-w-md">
                            {asset.publicHttpsUrl}
                            {asset.httpsVerifyDetail ? ` (${asset.httpsVerifyDetail})` : ''}
                          </span>
                        ) : asset.hostingError ? (
                          <span className="text-[11px] text-red-700 font-semibold block">
                            {asset.hostingError}
                          </span>
                        ) : (
                          <span className="text-[11px] text-amber-700 font-semibold block">
                            Stockage local uniquement (non visible dans Gmail/Outlook)
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          asset.hostingStatus === 'hosted'
                            ? asset.httpsVerified === false
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                            : asset.hostingStatus === 'error'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {asset.hostingStatus === 'hosted'
                          ? asset.httpsVerified
                            ? 'HTTPS Vérifié'
                            : 'Hébergé HTTPS'
                          : asset.hostingStatus === 'error'
                          ? 'Erreur'
                          : 'Local'}
                      </span>
                      {asset.publicHttpsUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            void navigator.clipboard.writeText(asset.publicHttpsUrl || '');
                            onToast('Lien HTTPS copié.');
                          }}
                          className="p-1.5 rounded bg-white border border-slate-300 hover:bg-slate-100 cursor-pointer"
                          title="Copier URL HTTPS"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* BLOC B : CONTRÔLE DE QUALITÉ HTML AUTOMATIQUE */}
            {auditResult && (
              <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                  <div>
                    <h4 className="text-sm sm:text-base font-extrabold text-[#0B2545] flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#0066B3]" />
                      <span>
                        Étape 7B — Inspecteur Compatibilité Email 10 points ({auditResult.scorePct}% · {auditResult.htmlSizeKb} Ko)
                      </span>
                    </h4>
                    <p className="text-xs text-slate-500">
                      Vérifie imbrication tableaux, CSS inline, URL HTTPS, largeurs max, fallback polices, responsive mobile, MSO Outlook et poids Gmail.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleRunRepairAudit}
                      className="min-h-[40px] px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Wrench className="w-3.5 h-3.5 text-amber-300" />
                      <span>Corriger &amp; Ré-auditer automatiquement</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep(8)}
                      className="min-h-[40px] px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Étape 8 : Exporter</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                  {auditResult.checks.map((c) => (
                    <div
                      key={c.id}
                      className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                        c.status === 'pass'
                          ? 'bg-emerald-50/70 border-emerald-200'
                          : c.status === 'warn'
                          ? 'bg-amber-50/70 border-amber-200'
                          : 'bg-red-50/70 border-red-200'
                      }`}
                    >
                      {c.status === 'pass' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      ) : c.status === 'warn' ? (
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <span className="font-bold text-slate-900 block">{c.label}</span>
                        <span className="text-[11px] text-slate-600 block mt-0.5">{c.detail}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* ÉTAPE 8 : EXPORTATION FINALE PDF, WORD ÉDITABLE (.DOCX) & HTML    */}
        {/* ================================================================= */}
        {step === 8 && project && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 space-y-5">
            <div className="border-b border-slate-200 pb-3">
              <h4 className="text-base sm:text-lg font-extrabold text-[#0B2545]">
                Étape 8 — Exportation Fidèle (PDF, Word .docx réellement éditable &amp; HTML Email)
              </h4>
              <p className="text-xs text-slate-600 mt-0.5">
                Toutes vos modifications effectuées dans le studio sont appliquées fidèlement dans chaque format sans aplatir la page en une seule capture.
              </p>
            </div>

            {unhostedCount > 0 && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-950">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Attention pour l’export Email HTML :</strong> {unhostedCount} image(s) utilisent encore une donnée locale (<code>data:</code>). Retournez à l’Étape 7 pour les héberger en HTTPS public avant d’envoyer par messagerie.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(7)}
                  className="px-3 py-1.5 rounded-lg bg-amber-200 hover:bg-amber-300 font-bold shrink-0 cursor-pointer"
                >
                  Aller à l’Étape 7
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <button
                type="button"
                disabled={isExportingPdf}
                onClick={async () => {
                  setIsExportingPdf(true);
                  try {
                    const { doc, filename } = await exportReplicaProjectToPdf(project);
                    doc.save(filename);
                    onToast(`PDF fidèle « ${filename} » téléchargé.`);
                  } finally {
                    setIsExportingPdf(false);
                  }
                }}
                className="min-h-[54px] p-4 rounded-xl bg-[#0066B3] hover:bg-[#005291] text-white text-left space-y-1 cursor-pointer disabled:opacity-50"
              >
                <div className="flex items-center gap-2 font-extrabold text-sm">
                  <FileText className="w-4 h-4" />
                  <span>{isExportingPdf ? 'Génération PDF...' : 'Télécharger PDF'}</span>
                </div>
                <span className="text-[11px] text-blue-100 block">
                  Textes vectoriels, tableaux et visuels positionnés
                </span>
              </button>

              <button
                type="button"
                disabled={isExportingDocx}
                onClick={async () => {
                  setIsExportingDocx(true);
                  try {
                    const { blob, filename } = await exportReplicaProjectToDocx(project);
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = filename;
                    a.click();
                    setTimeout(() => URL.revokeObjectURL(url), 1500);
                    onToast(`Document Word éditable « ${filename} » téléchargé.`);
                  } finally {
                    setIsExportingDocx(false);
                  }
                }}
                className="min-h-[54px] p-4 rounded-xl bg-[#0B2545] hover:bg-[#134074] text-white text-left space-y-1 cursor-pointer disabled:opacity-50"
              >
                <div className="flex items-center gap-2 font-extrabold text-sm">
                  <FileSpreadsheet className="w-4 h-4 text-amber-300" />
                  <span>{isExportingDocx ? 'Génération Word...' : 'Word Éditable (.docx)'}</span>
                </div>
                <span className="text-[11px] text-blue-100 block">
                  Paragraphes, tableaux Word et images extraites intégrées
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const html = compileReplicaToEmailHtml(project, { preferPublicHttps: true });
                  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${project.sourceFileName.replace(/\.[^.]+$/, '')}_Email_Responsive.html`;
                  a.click();
                  setTimeout(() => URL.revokeObjectURL(url), 1500);
                  onToast('Fichier Email HTML (.html) téléchargé.');
                }}
                className="min-h-[54px] p-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-left space-y-1 cursor-pointer"
              >
                <div className="flex items-center gap-2 font-extrabold text-sm">
                  <Code2 className="w-4 h-4" />
                  <span>Télécharger HTML Email</span>
                </div>
                <span className="text-[11px] text-slate-800 block">
                  Tableaux CSS inline · Score QA {auditResult?.scorePct ?? 100}%
                </span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  const html = compileReplicaToEmailHtml(project, { preferPublicHttps: true });
                  await navigator.clipboard.writeText(html);
                  onToast('Code Email HTML copié dans le presse-papiers !');
                }}
                className="min-h-[54px] p-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-left space-y-1 cursor-pointer"
              >
                <div className="flex items-center gap-2 font-extrabold text-sm">
                  <Copy className="w-4 h-4" />
                  <span>Copier Code Email</span>
                </div>
                <span className="text-[11px] text-emerald-100 block">
                  Prêt à coller dans votre messagerie
                </span>
              </button>
            </div>

            {onOpenInWebmail && (
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    const html = compileReplicaToEmailHtml(project, { preferPublicHttps: true });
                    onOpenInWebmail(html);
                  }}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold inline-flex items-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Envoyer directement vers Infomaniak Webmail</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* PIED DE NAVIGATION ENTRE ÉTAPES */}
        {project && (
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              disabled={step <= 1}
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              className="min-h-[40px] px-3.5 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-xs font-bold text-slate-700 inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Étape précédente</span>
            </button>

            <button
              type="button"
              disabled={step >= 8}
              onClick={() => setStep((s) => Math.min(8, s + 1))}
              className="min-h-[40px] px-3.5 py-2 rounded-lg bg-[#0B2545] hover:bg-[#134074] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              <span>Étape suivante</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
