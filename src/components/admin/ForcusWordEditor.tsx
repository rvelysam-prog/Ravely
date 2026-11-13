import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FileText,
  Save,
  Undo,
  Redo,
  Printer,
  Download,
  Copy,
  Scissors,
  Clipboard,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Subscript,
  Superscript,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Indent,
  Outdent,
  Type,
  Palette,
  Image as ImageIcon,
  Table as TableIcon,
  Layers,
  Sparkles,
  Search,
  Replace,
  Check,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  Plus,
  RotateCw,
  Move,
  Maximize2,
  ZoomIn,
  ZoomOut,
  FolderOpen,
  FilePlus,
  Send,
  ExternalLink,
  ChevronDown,
  Columns,
  Square,
  ShieldCheck,
  CheckSquare,
  Smile,
  Hash,
  Sliders,
  Paintbrush
} from 'lucide-react';
import {
  ForcusDocument,
  ForcusDocumentPage,
  ForcusDocumentLayer,
  createDefaultForcusDocument,
  saveForcusDocument,
  getForcusDocument,
  listForcusDocuments,
  deleteForcusDocument
} from '../../services/indexedDbDocStorage';
import { OfficialStampGeneratorModal } from './OfficialStampGeneratorModal';
import { removeImageBackground } from '../../services/imageTransparencyService';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas-pro';
import mammoth from 'mammoth';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { SiteSettings } from '../../types';
import { VisualHtmlEmailConverter } from '../common/VisualHtmlEmailConverter';

export interface ForcusWordEditorProps {
  settings?: SiteSettings;
  onOpenInWebmail?: (html: string) => void;
  initialDocumentId?: string;
  initialHtmlContent?: string;
  initialTitle?: string;
  initialLayers?: ForcusDocumentLayer[];
  onApplyToDocument?: (htmlContent: string) => void;
  onClose?: () => void;
  isEmbeddedModal?: boolean;
}

type RibbonTab = 'FICHIER' | 'ACCUEIL' | 'INSERTION' | 'CRÉATION' | 'MISE_EN_PAGE';

export const ForcusWordEditor: React.FC<ForcusWordEditorProps> = ({
  settings,
  onOpenInWebmail,
  initialDocumentId,
  initialHtmlContent,
  initialTitle,
  initialLayers,
  onApplyToDocument,
  onClose,
  isEmbeddedModal
}) => {
  // Document actif
  const [doc, setDoc] = useState<ForcusDocument>(() => {
    const base = createDefaultForcusDocument();
    if (initialTitle) base.title = initialTitle;
    if (initialHtmlContent && base.pages[0]) {
      base.pages[0].htmlContent = initialHtmlContent;
    }
    if (initialLayers && base.pages[0]) {
      base.pages[0].layers = [...initialLayers];
    }
    return base;
  });

  useEffect(() => {
    if (initialHtmlContent) {
      setDoc((prev) => ({
        ...prev,
        title: initialTitle || prev.title,
        pages: prev.pages.map((p, idx) =>
          idx === 0
            ? {
                ...p,
                htmlContent: initialHtmlContent,
                layers: initialLayers ? [...initialLayers] : p.layers
              }
            : p
        )
      }));
    }
  }, [initialHtmlContent, initialTitle, initialLayers]);
  const [activeTab, setActiveTab] = useState<RibbonTab>('ACCUEIL');
  const [workspaceView, setWorkspaceView] = useState<'word_a4' | 'converter_3_panels'>('word_a4');
  const [zoomLevel, setZoomLevel] = useState<number>(100); // 50 à 200%
  const [isSelectionPaneOpen, setIsSelectionPaneOpen] = useState<boolean>(true);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);

  // Historique Undo / Redo
  const [history, setHistory] = useState<ForcusDocument[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // État de sauvegarde et notifications
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [lastSavedTime, setLastSavedTime] = useState<string>('Enregistré');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modale générateur de tampon
  const [isStampModalOpen, setIsStampModalOpen] = useState<boolean>(false);

  // Modale de liste des documents sauvegardés dans IndexedDB
  const [isDocListModalOpen, setIsDocListModalOpen] = useState<boolean>(false);
  const [savedDocsList, setSavedDocsList] = useState<Array<{ id: string; title: string; updatedAt: string; pageCount: number }>>([]);

  // Menu contextuel d'insertion flottant suite à un double-clic sur la feuille
  const [floatingInsertMenu, setFloatingInsertMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    pageId: string;
  } | null>(null);

  // Modal Table Grille
  const [showTablePicker, setShowTablePicker] = useState<boolean>(false);
  const [tableGridHover, setTableGridHover] = useState<{ rows: number; cols: number }>({ rows: 2, cols: 2 });

  // Référence d'édition de texte actif
  const activeEditorRef = useRef<HTMLDivElement | null>(null);

  // Outils de glisser / redimensionner un objet
  const [isDraggingLayer, setIsDraggingLayer] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ mouseX: number; mouseY: number; initialX: number; initialY: number } | null>(null);
  const [isResizingLayer, setIsResizingLayer] = useState<boolean>(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState<{ mouseX: number; mouseY: number; initialW: number; initialH: number; initialX: number; initialY: number } | null>(null);

  // Règle du magnétisme (snap to 5mm / ~19px)
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);

  // Pinceau mise en forme (Format Painter)
  const [copiedFormat, setCopiedFormat] = useState<Record<string, string> | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Chargement initial depuis IndexedDB si spécifié
  useEffect(() => {
    if (initialDocumentId) {
      getForcusDocument(initialDocumentId).then((loaded) => {
        if (loaded) {
          setDoc(loaded);
          setHistory([loaded]);
          setHistoryIndex(0);
        }
      });
    } else {
      setHistory([doc]);
      setHistoryIndex(0);
    }
  }, [initialDocumentId]);

  // Sauvegarde automatique toutes les 25 secondes
  useEffect(() => {
    const timer = setInterval(() => {
      saveForcusDocument(doc).then(() => {
        setLastSavedTime(`Sauvegardé à ${new Date().toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}`);
      });
    }, 25000);
    return () => clearInterval(timer);
  }, [doc]);

  // Enregistrement manuel
  const handleManualSave = async () => {
    try {
      setIsSaving(true);
      await saveForcusDocument(doc);
      setLastSavedTime(`Sauvegardé à ${new Date().toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}`);
      showToast('Document enregistré dans IndexedDB !');
    } catch {
      showToast('Erreur enregistrement');
    } finally {
      setIsSaving(false);
    }
  };

  // Enregistre un état dans l'historique
  const pushHistory = (newDoc: ForcusDocument) => {
    const updated = history.slice(0, historyIndex + 1);
    updated.push(newDoc);
    if (updated.length > 30) updated.shift();
    setHistory(updated);
    setHistoryIndex(updated.length - 1);
    setDoc(newDoc);
  };

  // Undo / Redo
  const handleUndo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setDoc(prev);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setDoc(next);
    }
  };

  // Commandes de mise en forme rich-text (execCommand standard Word)
  const execFormat = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (activeEditorRef.current) {
      // Mettre à jour l'HTML de la page active
      const activePageId = doc.pages[0]?.id;
      if (activePageId) {
        updatePageContent(activePageId, activeEditorRef.current.innerHTML);
      }
    }
  };

  const updatePageContent = (pageId: string, newHtml: string) => {
    setDoc((prev) => ({
      ...prev,
      pages: prev.pages.map((p) => (p.id === pageId ? { ...p, htmlContent: newHtml } : p))
    }));
  };

  // Raccourcis clavier Word 2013 (Ctrl+B, Ctrl+I, Ctrl+U, Ctrl+S, Ctrl+Z, Ctrl+Y, etc.)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
        switch (e.key.toLowerCase()) {
          case 's':
            e.preventDefault();
            handleManualSave();
            break;
          case 'b':
            e.preventDefault();
            execFormat('bold');
            break;
          case 'i':
            e.preventDefault();
            execFormat('italic');
            break;
          case 'u':
            e.preventDefault();
            execFormat('underline');
            break;
          case 'z':
            e.preventDefault();
            handleUndo();
            break;
          case 'y':
            e.preventDefault();
            handleRedo();
            break;
          default:
            break;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [doc, historyIndex]);

  // Ajout d'une nouvelle page vierge A4
  const handleAddPage = () => {
    const newPageNum = doc.pages.length + 1;
    const newPage: ForcusDocumentPage = {
      id: `page_${Date.now()}_${newPageNum}`,
      pageNumber: newPageNum,
      headerHtml: `<div style="font-size: 8.5pt; color: #64748B; text-align: right; border-bottom: 1px solid #CBD5E1; padding-bottom: 4px;">PAGE ${newPageNum} · ${doc.title.toUpperCase()}</div>`,
      footerHtml: `<div style="font-size: 8.5pt; color: #94A3B8; text-align: center; border-top: 1px solid #E2E8F0; padding-top: 4px;">Page ${newPageNum} sur ${newPageNum} · Validité juridique</div>`,
      htmlContent: `<p style="font-size: 11pt; line-height: 1.5; color: #1E293B;">Poursuite du document officiel en page ${newPageNum}...</p>`,
      layers: []
    };
    pushHistory({
      ...doc,
      pages: [...doc.pages, newPage]
    });
    showToast(`Page ${newPageNum} ajoutée avec succès !`);
  };

  // Suppression d'une page
  const handleDeletePage = (pageId: string) => {
    if (doc.pages.length <= 1) {
      showToast('Le document doit comporter au moins 1 page.');
      return;
    }
    const filtered = doc.pages.filter((p) => p.id !== pageId);
    // Renuméroter
    const renumbered = filtered.map((p, idx) => ({ ...p, pageNumber: idx + 1 }));
    pushHistory({ ...doc, pages: renumbered });
    showToast('Page supprimée');
  };

  // Ajout d'un objet / calque (image, signature, tampon, forme, zone de texte)
  const addLayerToPage = (
    pageId: string,
    layerData: Partial<ForcusDocumentLayer>
  ) => {
    const page = doc.pages.find((p) => p.id === pageId) || doc.pages[0];
    if (!page) return;

    const newLayer: ForcusDocumentLayer = {
      id: `layer_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: layerData.name || `Objet ${page.layers.length + 1}`,
      type: layerData.type || 'image',
      content: layerData.content || '',
      x: layerData.x ?? 40,
      y: layerData.y ?? 40,
      width: layerData.width ?? 180,
      height: layerData.height ?? 100,
      rotation: layerData.rotation ?? 0,
      opacity: layerData.opacity ?? 100,
      zIndex: (page.layers.length + 1) * 10,
      locked: false,
      visible: true,
      wrapMode: layerData.wrapMode || 'infront',
      style: layerData.style || {}
    };

    const updatedPages = doc.pages.map((p) =>
      p.id === page.id ? { ...p, layers: [...p.layers, newLayer] } : p
    );

    pushHistory({ ...doc, pages: updatedPages });
    setSelectedLayerId(newLayer.id);
    showToast(`Élément "${newLayer.name}" ajouté avec succès !`);
  };

  // Upload d'image direct
  const handleUploadImageFile = (e: React.ChangeEvent<HTMLInputElement>, pageId: string, type: 'image' | 'logo' | 'signature' = 'image') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target?.result as string;
      if (dataUrl) {
        addLayerToPage(pageId, {
          type,
          name: type === 'logo' ? 'Logo Importé' : type === 'signature' ? 'Signature Mandataire' : file.name.slice(0, 20),
          content: dataUrl,
          width: type === 'signature' ? 160 : type === 'logo' ? 180 : 220,
          height: type === 'signature' ? 70 : type === 'logo' ? 80 : 160
        });
      }
    };
    reader.readAsDataURL(file);
  };

  // Rendre fond transparent d'un objet image sélectionné
  const handleMakeSelectedLayerTransparent = async (layerId: string) => {
    for (const p of doc.pages) {
      const target = p.layers.find((l) => l.id === layerId);
      if (target && target.content.startsWith('data:image')) {
        const transparent = await removeImageBackground(target.content, { tolerance: 35 });
        const updatedLayers = p.layers.map((l) => (l.id === layerId ? { ...l, content: transparent } : l));
        pushHistory({
          ...doc,
          pages: doc.pages.map((pg) => (pg.id === p.id ? { ...pg, layers: updatedLayers } : pg))
        });
        showToast('Fond blanc/clair rendu transparent !');
        return;
      }
    }
  };

  // Importation directe de document local (.docx, .html, .txt, .json)
  const handleImportLocalFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      showToast(`Lecture de ${file.name}...`);

      if (ext === 'docx') {
        const arrayBuffer = await file.arrayBuffer();
        const mammothResult = await mammoth.convertToHtml({ arrayBuffer });
        const html = mammothResult.value;
        const pageId = doc.pages[0]?.id || 'page_1';
        updatePageContent(pageId, html);
        setDoc((prev) => ({ ...prev, title: file.name.replace(/\.[^/.]+$/, '') }));
        showToast(`Document Word "${file.name}" importé et converti avec succès !`);
      } else if (ext === 'html' || ext === 'htm') {
        const text = await file.text();
        const pageId = doc.pages[0]?.id || 'page_1';
        updatePageContent(pageId, text);
        setDoc((prev) => ({ ...prev, title: file.name.replace(/\.[^/.]+$/, '') }));
        showToast(`Document HTML "${file.name}" importé !`);
      } else if (ext === 'txt') {
        const text = await file.text();
        const formatted = `<p style="white-space: pre-wrap; font-family: Calibri, sans-serif; font-size: 11pt;">${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`;
        const pageId = doc.pages[0]?.id || 'page_1';
        updatePageContent(pageId, formatted);
        setDoc((prev) => ({ ...prev, title: file.name.replace(/\.[^/.]+$/, '') }));
        showToast(`Fichier texte "${file.name}" importé !`);
      } else if (ext === 'json') {
        const text = await file.text();
        const parsed = JSON.parse(text);
        if (parsed.pages && parsed.title) {
          setDoc(parsed);
          showToast(`Projet FORCUS "${parsed.title}" restauré !`);
        }
      } else {
        showToast('Format non supporté. Choisissez un fichier .docx, .html, .txt ou .json');
      }
    } catch (err) {
      console.error('Erreur importation locale:', err);
      showToast('Erreur lors de la lecture du fichier local');
    }
  };

  // Mise à jour fine des dimensions, rotation, opacité d'un calque
  const updateLayerProperty = (layerId: string, updates: Partial<ForcusDocumentLayer>) => {
    setDoc((prev) => ({
      ...prev,
      pages: prev.pages.map((p) => ({
        ...p,
        layers: p.layers.map((l) => (l.id === layerId ? { ...l, ...updates } : l))
      }))
    }));
  };

  // Duplication d'un calque sélectionné
  const duplicateLayer = (layerId: string) => {
    for (const p of doc.pages) {
      const target = p.layers.find((l) => l.id === layerId);
      if (target) {
        const newLayer: ForcusDocumentLayer = {
          ...target,
          id: `layer_${Date.now()}`,
          name: `${target.name} (Copie)`,
          x: target.x + 20,
          y: target.y + 20,
          zIndex: (p.layers.length + 1) * 10
        };
        setDoc((prev) => ({
          ...prev,
          pages: prev.pages.map((pg) => (pg.id === p.id ? { ...pg, layers: [...pg.layers, newLayer] } : pg))
        }));
        setSelectedLayerId(newLayer.id);
        showToast('Calque dupliqué !');
        return;
      }
    }
  };

  // Insertion d'un tableau HTML dans la page active
  const insertTableIntoPage = (rows: number, cols: number) => {
    let tableHtml = '<table style="width: 100%; border-collapse: collapse; margin: 12px 0; border: 1px solid #94A3B8;">';
    for (let r = 0; r < rows; r++) {
      tableHtml += '<tr>';
      for (let c = 0; c < cols; c++) {
        if (r === 0) {
          tableHtml += `<th style="border: 1px solid #CBD5E1; padding: 8px; background-color: #F1F5F9; font-weight: bold; font-size: 10pt; color: #0B2545;">En-tête ${c + 1}</th>`;
        } else {
          tableHtml += `<td style="border: 1px solid #CBD5E1; padding: 8px; font-size: 10pt; color: #1E293B;">Cellule ${r}-${c + 1}</td>`;
        }
      }
      tableHtml += '</tr>';
    }
    tableHtml += '</table><p></p>';

    execFormat('insertHTML', tableHtml);
    setShowTablePicker(false);
    showToast(`Tableau ${rows}x${cols} inséré !`);
  };

  // Calques : Changer l'ordre de superposition (z-index)
  const moveLayerOrder = (layerId: string, direction: 'up' | 'down' | 'front' | 'back') => {
    setDoc((prev) => {
      const updatedPages = prev.pages.map((p) => {
        const index = p.layers.findIndex((l) => l.id === layerId);
        if (index === -1) return p;

        const newLayers = [...p.layers];
        if (direction === 'up' && index < newLayers.length - 1) {
          const temp = newLayers[index];
          newLayers[index] = newLayers[index + 1];
          newLayers[index + 1] = temp;
        } else if (direction === 'down' && index > 0) {
          const temp = newLayers[index];
          newLayers[index] = newLayers[index - 1];
          newLayers[index - 1] = temp;
        } else if (direction === 'front') {
          const [item] = newLayers.splice(index, 1);
          newLayers.push(item);
        } else if (direction === 'back') {
          const [item] = newLayers.splice(index, 1);
          newLayers.unshift(item);
        }

        // Réassigner les zIndex consécutifs
        newLayers.forEach((l, idx) => {
          l.zIndex = (idx + 1) * 10;
        });

        return { ...p, layers: newLayers };
      });

      return { ...prev, pages: updatedPages };
    });
  };

  // Calques : Verrouiller / Masquer / Supprimer
  const toggleLayerLock = (layerId: string) => {
    setDoc((prev) => ({
      ...prev,
      pages: prev.pages.map((p) => ({
        ...p,
        layers: p.layers.map((l) => (l.id === layerId ? { ...l, locked: !l.locked } : l))
      }))
    }));
  };

  const toggleLayerVisible = (layerId: string) => {
    setDoc((prev) => ({
      ...prev,
      pages: prev.pages.map((p) => ({
        ...p,
        layers: p.layers.map((l) => (l.id === layerId ? { ...l, visible: !l.visible } : l))
      }))
    }));
  };

  const deleteLayer = (layerId: string) => {
    setDoc((prev) => ({
      ...prev,
      pages: prev.pages.map((p) => ({
        ...p,
        layers: p.layers.filter((l) => l.id !== layerId)
      }))
    }));
    if (selectedLayerId === layerId) setSelectedLayerId(null);
    showToast('Calque supprimé');
  };

  // Convertisseur vers HTML Mail Template
  const handleConvertToHtmlEmailTemplate = (respectDocStylesOnly = true) => {
    const fullBodyHtml = doc.pages.map((p) => p.htmlContent).join('<br/>');
    const primaryCol = respectDocStylesOnly ? doc.theme.primaryColor : (settings?.company_name ? '#0B2545' : '#0066B3');
    const containerBg = respectDocStylesOnly ? doc.theme.pageBackground : '#FFFFFF';

    const emailTemplateHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${doc.title}</title>
  <style>
    body { margin: 0; padding: 20px 0; background-color: #F1F5F9; font-family: ${doc.theme.fontFamily || '-apple-system, sans-serif'}; }
    .email-container { max-width: 680px; margin: 0 auto; background-color: ${containerBg}; border-radius: 8px; overflow: hidden; border: 1px solid #CBD5E1; box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
    .email-header { background-color: ${primaryCol}; color: #FFFFFF; padding: 20px 28px; }
    .email-body { padding: 30px; line-height: 1.6; color: #1E293B; font-size: 11pt; }
    .email-footer { background-color: #0F172A; color: #94A3B8; padding: 14px 28px; font-size: 10px; text-align: center; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <h2 style="margin: 0; font-size: 18px; font-weight: bold;">${doc.title}</h2>
      <span style="font-size: 11px; opacity: 0.85;">Édité via FORCUS Word 2013 · Conformité Documentaire</span>
    </div>
    <div class="email-body">
      ${fullBodyHtml}
    </div>
    <div class="email-footer">
      Document généré avec précision · Traçabilité sécurisée
    </div>
  </div>
</body>
</html>`;

    navigator.clipboard.writeText(emailTemplateHtml);
    showToast('Code HTML Email Responsive copié !');
    if (onOpenInWebmail) {
      onOpenInWebmail(emailTemplateHtml);
    }
  };

  // Export PDF haute fidélité
  const handleExportPdf = async () => {
    try {
      showToast('Génération du PDF en cours...');
      const pdf = new jsPDF({
        orientation: doc.orientation,
        unit: 'mm',
        format: 'a4'
      });

      const pagesEl = document.querySelectorAll('.forcus-page-sheet');
      for (let i = 0; i < pagesEl.length; i++) {
        const pageEl = pagesEl[i] as HTMLElement;
        if (i > 0) pdf.addPage();

        const canvas = await html2canvas(pageEl, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
      }

      pdf.save(`${doc.title.replace(/\s+/g, '_')}.pdf`);
      showToast('Document PDF téléchargé !');
    } catch (err) {
      console.error(err);
      showToast('Erreur génération PDF');
    }
  };

  // Export Word (.docx / .doc)
  const handleExportWordDocx = () => {
    const fullHtml = doc.pages.map((p) => p.htmlContent).join('<br/><hr/><br/>');
    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='utf-8'><title>${doc.title}</title>
<style>
  body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; line-height: 1.5; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #000; padding: 6px; }
</style>
</head><body>${fullHtml}</body></html>`;

    const blob = new Blob([header], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.title.replace(/\s+/g, '_')}.doc`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Document Word (.doc/.docx) exporté !');
  };

  // Calcule le nombre total de mots et de caractères
  const wordStats = doc.pages.reduce(
    (acc, p) => {
      const text = p.htmlContent.replace(/<[^>]*>/g, ' ');
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      return { words: acc.words + words, chars: acc.chars + text.length };
    },
    { words: 0, chars: 0 }
  );

  return (
    <div className="flex flex-col h-full bg-[#E1DFDD] border border-slate-300 rounded-2xl overflow-hidden shadow-2xl font-sans select-none">
      {/* 1. BARRE DE TITRE SUPÉRIEURE WORD 2013 (Bleu classique #2B579A) */}
      <div className="bg-[#2B579A] text-white px-4 py-2 flex items-center justify-between border-b border-[#1E3F70]">
        <div className="flex items-center gap-3">
          {/* Quick Access Toolbar */}
          <div className="flex items-center gap-1.5 pr-3 border-r border-white/20">
            <button
              type="button"
              onClick={handleManualSave}
              title="Enregistrer (Ctrl+S)"
              className="p-1 rounded hover:bg-white/15 text-white transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4 text-white" />
            </button>
            <button
              type="button"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              title="Annuler (Ctrl+Z)"
              className="p-1 rounded hover:bg-white/15 text-white disabled:opacity-40 transition-colors cursor-pointer"
            >
              <Undo className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              title="Rétablir (Ctrl+Y)"
              className="p-1 rounded hover:bg-white/15 text-white disabled:opacity-40 transition-colors cursor-pointer"
            >
              <Redo className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              title="Imprimer"
              className="p-1 rounded hover:bg-white/15 text-white transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>

          {/* Nom du document éditable en ligne */}
          <input
            type="text"
            value={doc.title}
            onChange={(e) => setDoc({ ...doc, title: e.target.value })}
            className="bg-transparent text-white font-bold text-xs sm:text-sm px-2 py-0.5 rounded hover:bg-white/10 focus:bg-white focus:text-slate-900 border-b border-transparent focus:border-amber-400 outline-none transition-all w-56 sm:w-80"
          />
          <span className="text-[11px] text-blue-200 hidden sm:inline">- FORCUS Word 2013</span>
        </div>

        {/* Actions rapides à droite */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-blue-200 font-mono hidden md:inline">{lastSavedTime}</span>

          <button
            type="button"
            onClick={() =>
              setWorkspaceView((v) => (v === 'word_a4' ? 'converter_3_panels' : 'word_a4'))
            }
            className={`px-3 py-1 font-bold text-xs rounded-md shadow-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              workspaceView === 'converter_3_panels'
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-white/15 hover:bg-white/25 text-white'
            }`}
            title="Basculer entre les pages Word A4 et le Convertisseur Visuel 3 Fenêtres (Canvas -> Email HTML)"
          >
            <Columns className="w-3.5 h-3.5" />
            <span>{workspaceView === 'converter_3_panels' ? 'Vue Pages Word A4' : 'Convertisseur 3 Fenêtres'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleConvertToHtmlEmailTemplate(true)}
            className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-md shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            title="Convertir directement en template e-mail pour Webmail Infomaniak"
          >
            <Send className="w-3.5 h-3.5 text-slate-950" />
            <span>Vers Webmail</span>
          </button>

          <button
            type="button"
            onClick={handleExportPdf}
            className="px-2.5 py-1 bg-white/15 hover:bg-white/25 text-white text-xs font-semibold rounded-md flex items-center gap-1 transition-colors cursor-pointer"
            title="Télécharger en PDF A4"
          >
            <Download className="w-3.5 h-3.5 text-amber-300" />
            <span>PDF</span>
          </button>

          <label
            className="px-2.5 py-1 bg-white/15 hover:bg-white/25 text-white text-xs font-semibold rounded-md flex items-center gap-1 transition-colors cursor-pointer"
            title="Importer un fichier local (.docx, .html, .txt, .json)"
          >
            <FolderOpen className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden sm:inline">Importer Local</span>
            <input
              type="file"
              accept=".docx,.doc,.html,.htm,.txt,.json"
              className="hidden"
              onChange={handleImportLocalFile}
            />
          </label>

          {onApplyToDocument && (
            <button
              type="button"
              onClick={() => {
                const fullHtml = doc.pages.map((p) => p.htmlContent).join('<br/>');
                onApplyToDocument(fullHtml);
                showToast('Modifications appliquées au document !');
                if (onClose) onClose();
              }}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-md shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Appliquer au document</span>
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-2.5 py-1 bg-white/15 hover:bg-red-600 text-white text-xs font-semibold rounded-md flex items-center gap-1 transition-colors cursor-pointer"
              title="Fermer ou Retourner au module"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Retour</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. RUBAN DES ONGLETS WORD 2013 */}
      <div className="bg-[#F3F2F1] border-b border-[#D2D0CE] px-4 pt-1 flex items-center gap-1 overflow-x-auto">
        {(['FICHIER', 'ACCUEIL', 'INSERTION', 'CRÉATION', 'MISE_EN_PAGE'] as RibbonTab[]).map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all rounded-t-md cursor-pointer ${
                tab === 'FICHIER'
                  ? 'bg-[#2B579A] text-white hover:bg-[#1E3F70]'
                  : isActive
                  ? 'bg-white text-[#2B579A] border-t-2 border-[#2B579A] shadow-xs'
                  : 'text-slate-700 hover:text-black hover:bg-slate-200/80'
              }`}
            >
              {tab.replace('_', ' ')}
            </button>
          );
        })}
      </div>

      {/* 3. CONTENU DÉTAILLÉ DU RUBAN SELON L'ONGLET ACTIF */}
      <div className="bg-white border-b border-[#D2D0CE] px-4 py-2.5 flex items-stretch gap-3 overflow-x-auto min-h-[92px] shadow-xs text-xs">
        {/* ======================= ONGLET FICHIER ======================= */}
        {activeTab === 'FICHIER' && (
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center justify-center p-2 rounded hover:bg-slate-100 cursor-pointer min-w-[60px]" onClick={() => pushHistory(createDefaultForcusDocument())}>
              <FilePlus className="w-5 h-5 text-blue-700 mb-1" />
              <span className="text-[11px] font-medium">Nouveau</span>
            </div>
            <div className="flex flex-col items-center justify-center p-2 rounded hover:bg-slate-100 cursor-pointer min-w-[60px]" onClick={() => {
              listForcusDocuments().then(setSavedDocsList);
              setIsDocListModalOpen(true);
            }}>
              <FolderOpen className="w-5 h-5 text-amber-600 mb-1" />
              <span className="text-[11px] font-medium">Ouvrir</span>
            </div>
            <div className="flex flex-col items-center justify-center p-2 rounded hover:bg-slate-100 cursor-pointer min-w-[60px]" onClick={handleManualSave}>
              <Save className="w-5 h-5 text-emerald-600 mb-1" />
              <span className="text-[11px] font-medium">Enregistrer</span>
            </div>
            <div className="w-[1px] bg-slate-300 self-stretch my-1" />
            <div className="flex flex-col items-center justify-center p-2 rounded hover:bg-slate-100 cursor-pointer min-w-[60px]" onClick={handleExportPdf}>
              <Download className="w-5 h-5 text-red-600 mb-1" />
              <span className="text-[11px] font-medium">Export PDF</span>
            </div>
            <div className="flex flex-col items-center justify-center p-2 rounded hover:bg-slate-100 cursor-pointer min-w-[60px]" onClick={handleExportWordDocx}>
              <FileText className="w-5 h-5 text-blue-800 mb-1" />
              <span className="text-[11px] font-medium">Export Word</span>
            </div>
          </div>
        )}

        {/* ======================= ONGLET ACCUEIL ======================= */}
        {activeTab === 'ACCUEIL' && (
          <div className="flex items-center gap-4">
            {/* Groupe Presse-papiers */}
            <div className="flex items-center gap-1 pr-3 border-r border-slate-300">
              <button
                type="button"
                onClick={() => execFormat('paste')}
                className="flex flex-col items-center p-1.5 rounded hover:bg-slate-100 cursor-pointer"
                title="Coller"
              >
                <Clipboard className="w-4 h-4 text-slate-700" />
                <span className="text-[10px] mt-0.5">Coller</span>
              </button>
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => execFormat('cut')}
                  className="p-1 rounded hover:bg-slate-100 text-slate-700 flex items-center gap-1 cursor-pointer"
                  title="Couper"
                >
                  <Scissors className="w-3.5 h-3.5" />
                  <span className="text-[10px]">Couper</span>
                </button>
                <button
                  type="button"
                  onClick={() => execFormat('copy')}
                  className="p-1 rounded hover:bg-slate-100 text-slate-700 flex items-center gap-1 cursor-pointer"
                  title="Copier"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span className="text-[10px]">Copier</span>
                </button>
              </div>
            </div>

            {/* Groupe Police */}
            <div className="flex flex-col justify-between pr-3 border-r border-slate-300">
              <div className="flex items-center gap-1.5 mb-1">
                <select
                  onChange={(e) => execFormat('fontName', e.target.value)}
                  className="px-2 py-0.5 rounded border border-slate-300 text-xs font-medium bg-white"
                  defaultValue="Calibri"
                >
                  <option value="Calibri, sans-serif">Calibri</option>
                  <option value="Arial, sans-serif">Arial</option>
                  <option value="'Times New Roman', serif">Times New Roman</option>
                  <option value="Georgia, serif">Georgia</option>
                  <option value="'Segoe UI', sans-serif">Segoe UI</option>
                  <option value="'Courier New', monospace">Courier New</option>
                </select>

                <select
                  onChange={(e) => execFormat('fontSize', e.target.value)}
                  className="px-2 py-0.5 rounded border border-slate-300 text-xs font-medium bg-white w-14"
                  defaultValue="3"
                >
                  <option value="1">8 pt</option>
                  <option value="2">10 pt</option>
                  <option value="3">11 pt</option>
                  <option value="4">12 pt</option>
                  <option value="5">14 pt</option>
                  <option value="6">18 pt</option>
                  <option value="7">24 pt</option>
                </select>
              </div>

              <div className="flex items-center gap-0.5">
                <button type="button" onClick={() => execFormat('bold')} className="p-1 rounded hover:bg-slate-100 text-slate-800 font-bold" title="Gras (Ctrl+B)">
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => execFormat('italic')} className="p-1 rounded hover:bg-slate-100 text-slate-800 italic" title="Italique (Ctrl+I)">
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => execFormat('underline')} className="p-1 rounded hover:bg-slate-100 text-slate-800 underline" title="Souligné (Ctrl+U)">
                  <Underline className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => execFormat('strikeThrough')} className="p-1 rounded hover:bg-slate-100 text-slate-800 line-through" title="Barré">
                  <Strikethrough className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => execFormat('subscript')} className="p-1 rounded hover:bg-slate-100 text-slate-800" title="Indice">
                  <Subscript className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => execFormat('superscript')} className="p-1 rounded hover:bg-slate-100 text-slate-800" title="Exposant">
                  <Superscript className="w-3.5 h-3.5" />
                </button>

                {/* Couleur de police */}
                <input
                  type="color"
                  onChange={(e) => execFormat('foreColor', e.target.value)}
                  className="w-5 h-5 rounded cursor-pointer border border-slate-300 ml-1"
                  title="Couleur de police"
                  defaultValue="#1E293B"
                />

                {/* Surlignage */}
                <input
                  type="color"
                  onChange={(e) => execFormat('hiliteColor', e.target.value)}
                  className="w-5 h-5 rounded cursor-pointer border border-slate-300 ml-0.5"
                  title="Couleur de surlignage"
                  defaultValue="#FEF08A"
                />
              </div>
            </div>

            {/* Groupe Paragraphe */}
            <div className="flex flex-col justify-between pr-3 border-r border-slate-300">
              <div className="flex items-center gap-1 mb-1">
                <button type="button" onClick={() => execFormat('insertUnorderedList')} className="p-1 rounded hover:bg-slate-100" title="Puces">
                  <List className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => execFormat('insertOrderedList')} className="p-1 rounded hover:bg-slate-100" title="Numérotation">
                  <ListOrdered className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => execFormat('outdent')} className="p-1 rounded hover:bg-slate-100" title="Diminuer le retrait">
                  <Outdent className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => execFormat('indent')} className="p-1 rounded hover:bg-slate-100" title="Augmenter le retrait">
                  <Indent className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-0.5">
                <button type="button" onClick={() => execFormat('justifyLeft')} className="p-1 rounded hover:bg-slate-100" title="Aligner à gauche">
                  <AlignLeft className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => execFormat('justifyCenter')} className="p-1 rounded hover:bg-slate-100" title="Centrer">
                  <AlignCenter className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => execFormat('justifyRight')} className="p-1 rounded hover:bg-slate-100" title="Aligner à droite">
                  <AlignRight className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => execFormat('justifyFull')} className="p-1 rounded hover:bg-slate-100" title="Justifier">
                  <AlignJustify className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Galerie de Styles Word 2013 */}
            <div className="flex items-center gap-1.5 overflow-x-auto pr-3 border-r border-slate-300">
              {[
                { label: 'Normal', tag: 'p', font: '11pt', style: 'color: #1E293B;' },
                { label: 'Titre 1', tag: 'h1', font: '18pt', style: 'color: #0066B3; font-weight: bold;' },
                { label: 'Titre 2', tag: 'h2', font: '14pt', style: 'color: #134074; font-weight: bold;' },
                { label: 'Sous-titre', tag: 'h3', font: '12pt', style: 'color: #64748B; font-style: italic;' },
                { label: 'Citation', tag: 'blockquote', font: '11pt', style: 'border-left: 3px solid #0066B3; padding-left: 10px; color: #475569;' }
              ].map((st) => (
                <button
                  key={st.label}
                  type="button"
                  onClick={() => execFormat('formatBlock', `<${st.tag}>`)}
                  className="px-2.5 py-1 rounded border border-slate-200 hover:border-blue-400 bg-white flex flex-col items-center justify-center min-w-[70px] h-[58px] cursor-pointer shadow-2xs"
                >
                  <span className="text-[12px] font-bold line-clamp-1" style={{ color: st.tag.startsWith('h') ? '#0066B3' : '#1E293B' }}>AaBbCc</span>
                  <span className="text-[10px] text-slate-500 mt-1">{st.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ======================= ONGLET INSERTION ======================= */}
        {activeTab === 'INSERTION' && (
          <div className="flex items-center gap-4">
            {/* Pages */}
            <div className="flex items-center gap-1 pr-3 border-r border-slate-300">
              <button
                type="button"
                onClick={handleAddPage}
                className="flex flex-col items-center p-1.5 rounded hover:bg-slate-100 cursor-pointer min-w-[60px]"
                title="Insérer une nouvelle page A4"
              >
                <Plus className="w-4 h-4 text-blue-700" />
                <span className="text-[10px] mt-0.5 font-medium">Page vierge</span>
              </button>
            </div>

            {/* Tableaux */}
            <div className="relative pr-3 border-r border-slate-300">
              <button
                type="button"
                onClick={() => setShowTablePicker(!showTablePicker)}
                className="flex flex-col items-center p-1.5 rounded hover:bg-slate-100 cursor-pointer min-w-[60px]"
              >
                <TableIcon className="w-4 h-4 text-emerald-700" />
                <span className="text-[10px] mt-0.5 font-medium">Tableau</span>
              </button>

              {/* Menu grille tableau interactif Word */}
              {showTablePicker && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-slate-300 shadow-xl rounded-xl p-3 z-50">
                  <span className="text-[11px] font-bold text-slate-700 block mb-2">
                    Insérer un tableau : {tableGridHover.rows} x {tableGridHover.cols}
                  </span>
                  <div className="grid grid-cols-5 gap-1 w-fit">
                    {Array.from({ length: 5 }).map((_, r) =>
                      Array.from({ length: 5 }).map((_, c) => {
                        const inSelection = r < tableGridHover.rows && c < tableGridHover.cols;
                        return (
                          <div
                            key={`${r}-${c}`}
                            onMouseEnter={() => setTableGridHover({ rows: r + 1, cols: c + 1 })}
                            onClick={() => insertTableIntoPage(r + 1, c + 1)}
                            className={`w-5 h-5 border cursor-pointer transition-colors ${
                              inSelection ? 'bg-blue-600 border-blue-700' : 'bg-slate-100 border-slate-300'
                            }`}
                          />
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Illustrations & Images */}
            <div className="flex items-center gap-2 pr-3 border-r border-slate-300">
              <label className="flex flex-col items-center p-1.5 rounded hover:bg-slate-100 cursor-pointer min-w-[60px]">
                <ImageIcon className="w-4 h-4 text-blue-600" />
                <span className="text-[10px] mt-0.5 font-medium">Image</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleUploadImageFile(e, doc.pages[0].id, 'image')}
                />
              </label>

              <label className="flex flex-col items-center p-1.5 rounded hover:bg-slate-100 cursor-pointer min-w-[60px]">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <span className="text-[10px] mt-0.5 font-medium">Logo</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleUploadImageFile(e, doc.pages[0].id, 'logo')}
                />
              </label>

              <label className="flex flex-col items-center p-1.5 rounded hover:bg-slate-100 cursor-pointer min-w-[60px]">
                <Paintbrush className="w-4 h-4 text-purple-600" />
                <span className="text-[10px] mt-0.5 font-medium">Signature</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleUploadImageFile(e, doc.pages[0].id, 'signature')}
                />
              </label>

              <button
                type="button"
                onClick={() => setIsStampModalOpen(true)}
                className="flex flex-col items-center p-1.5 rounded hover:bg-slate-100 cursor-pointer min-w-[60px]"
                title="Ouvrir le générateur de tampon officiel"
              >
                <Sparkles className="w-4 h-4 text-red-600" />
                <span className="text-[10px] mt-0.5 font-medium">Tampon</span>
              </button>
            </div>

            {/* Formes & Zones de texte */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  addLayerToPage(doc.pages[0].id, {
                    type: 'text',
                    name: 'Zone de texte',
                    content: 'Tapez votre texte ici...',
                    width: 200,
                    height: 80,
                    style: {
                      borderWidth: 1,
                      borderColor: '#94A3B8',
                      backgroundColor: '#FFFFFF',
                      padding: 8
                    }
                  })
                }
                className="flex flex-col items-center p-1.5 rounded hover:bg-slate-100 cursor-pointer min-w-[70px]"
              >
                <Type className="w-4 h-4 text-slate-700" />
                <span className="text-[10px] mt-0.5 font-medium">Zone de texte</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  addLayerToPage(doc.pages[0].id, {
                    type: 'shape',
                    name: 'Bandeau décoratif',
                    content: '',
                    width: 500,
                    height: 24,
                    style: {
                      backgroundColor: '#0B2545',
                      borderRadius: 4
                    }
                  })
                }
                className="flex flex-col items-center p-1.5 rounded hover:bg-slate-100 cursor-pointer min-w-[60px]"
              >
                <Square className="w-4 h-4 text-blue-900" />
                <span className="text-[10px] mt-0.5 font-medium">Forme</span>
              </button>
            </div>
          </div>
        )}

        {/* ======================= ONGLET CRÉATION ======================= */}
        {activeTab === 'CRÉATION' && (
          <div className="flex items-center gap-4">
            {/* Thèmes du document */}
            <div className="flex items-center gap-2 pr-3 border-r border-slate-300">
              <span className="text-[11px] font-bold text-slate-700">Thème :</span>
              {[
                { name: 'Office 2013', primary: '#2B579A', font: 'Calibri, sans-serif' },
                { name: 'Exécutif Canadien', primary: '#0B2545', font: 'Georgia, serif' },
                { name: 'Moderne Azur', primary: '#0284C7', font: 'Arial, sans-serif' },
                { name: 'Notarié', primary: '#1E293B', font: "'Times New Roman', serif" }
              ].map((th) => (
                <button
                  key={th.name}
                  type="button"
                  onClick={() =>
                    setDoc((prev) => ({
                      ...prev,
                      theme: { ...prev.theme, name: th.name, primaryColor: th.primary, fontFamily: th.font }
                    }))
                  }
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold border flex items-center gap-1.5 cursor-pointer ${
                    doc.theme.name === th.name ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: th.primary }} />
                  <span>{th.name}</span>
                </button>
              ))}
            </div>

            {/* Couleur de page */}
            <div className="flex items-center gap-2 pr-3 border-r border-slate-300">
              <span className="text-[11px] font-bold text-slate-700">Fond de page :</span>
              {[
                { label: 'Blanc', val: '#FFFFFF' },
                { label: 'Ivoire', val: '#FDFBF7' },
                { label: 'Crème', val: '#FEFCF6' }
              ].map((bg) => (
                <button
                  key={bg.label}
                  type="button"
                  onClick={() =>
                    setDoc((prev) => ({
                      ...prev,
                      theme: { ...prev.theme, pageBackground: bg.val }
                    }))
                  }
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer ${
                    doc.theme.pageBackground === bg.val ? 'bg-blue-600 text-white' : 'bg-white text-slate-700'
                  }`}
                >
                  {bg.label}
                </button>
              ))}
            </div>

            {/* Filigrane */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-700">Filigrane :</span>
              <button
                type="button"
                onClick={() =>
                  setDoc((prev) => ({
                    ...prev,
                    watermark: {
                      enabled: !prev.watermark?.enabled,
                      type: 'text',
                      text: prev.watermark?.text || 'CONFIDENTIEL',
                      opacity: 12,
                      angle: -45
                    }
                  }))
                }
                className={`px-2.5 py-1 rounded text-[11px] font-bold border cursor-pointer ${
                  doc.watermark?.enabled ? 'bg-emerald-600 text-white' : 'bg-white text-slate-700'
                }`}
              >
                {doc.watermark?.enabled ? 'Filigrane Actif' : 'Activer Filigrane'}
              </button>

              {doc.watermark?.enabled && (
                <input
                  type="text"
                  value={doc.watermark.text || ''}
                  onChange={(e) =>
                    setDoc((prev) => ({
                      ...prev,
                      watermark: { ...prev.watermark!, text: e.target.value }
                    }))
                  }
                  placeholder="Texte du filigrane"
                  className="px-2 py-0.5 rounded border text-xs font-bold w-36"
                />
              )}
            </div>
          </div>
        )}

        {/* ======================= ONGLET MISE EN PAGE ======================= */}
        {activeTab === 'MISE_EN_PAGE' && (
          <div className="flex items-center gap-4">
            {/* Marges */}
            <div className="flex items-center gap-2 pr-3 border-r border-slate-300">
              <span className="text-[11px] font-bold text-slate-700">Marges :</span>
              {[
                { label: 'Normales (25mm)', val: 25 },
                { label: 'Étroites (12.7mm)', val: 13 },
                { label: 'Larges (38mm)', val: 38 }
              ].map((m) => (
                <button
                  key={m.label}
                  type="button"
                  onClick={() =>
                    setDoc((prev) => ({
                      ...prev,
                      margins: { top: m.val, bottom: m.val, left: m.val, right: m.val }
                    }))
                  }
                  className={`px-2.5 py-1 rounded text-[10px] font-bold border cursor-pointer ${
                    doc.margins.left === m.val ? 'bg-blue-600 text-white' : 'bg-white text-slate-700'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Orientation */}
            <div className="flex items-center gap-2 pr-3 border-r border-slate-300">
              <span className="text-[11px] font-bold text-slate-700">Orientation :</span>
              <button
                type="button"
                onClick={() => setDoc({ ...doc, orientation: 'portrait' })}
                className={`px-2.5 py-1 rounded text-[10px] font-bold border cursor-pointer ${
                  doc.orientation === 'portrait' ? 'bg-blue-600 text-white' : 'bg-white text-slate-700'
                }`}
              >
                Portrait
              </button>
              <button
                type="button"
                onClick={() => setDoc({ ...doc, orientation: 'landscape' })}
                className={`px-2.5 py-1 rounded text-[10px] font-bold border cursor-pointer ${
                  doc.orientation === 'landscape' ? 'bg-blue-600 text-white' : 'bg-white text-slate-700'
                }`}
              >
                Paysage
              </button>
            </div>

            {/* Volet de sélection toggle */}
            <button
              type="button"
              onClick={() => setIsSelectionPaneOpen(!isSelectionPaneOpen)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1.5 cursor-pointer ${
                isSelectionPaneOpen ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Layers className="w-4 h-4 text-amber-400" />
              <span>Volet de sélection ({doc.pages.reduce((c, p) => c + p.layers.length, 0)} calques)</span>
            </button>
          </div>
        )}
      </div>

      {/* 4. ZONE CENTRALE : FEUILLES A4 AVEC RÈGLES OU CONVERTISSEUR 3 FENÊTRES + VOLET DE SÉLECTION */}
      <div className="flex-1 flex overflow-hidden relative">
        {workspaceView === 'converter_3_panels' ? (
          <div className="flex-1 overflow-auto p-4 bg-[#E1DFDD]">
            <VisualHtmlEmailConverter
              title={doc.title}
              fallbackHtmlEmail={doc.pages.map((p) => p.htmlContent).join('<br/>')}
              onOpenInWebmail={onOpenInWebmail}
            />
          </div>
        ) : (
        <div
          className="flex-1 overflow-auto p-8 flex flex-col items-center gap-10 bg-[#E1DFDD] relative"
          onClick={() => {
            if (floatingInsertMenu) setFloatingInsertMenu(null);
          }}
        >
          {/* Règle horizontale Word 2013 */}
          <div className="w-[210mm] max-w-full bg-white border border-slate-300 h-5 mb-2 rounded shadow-2xs flex items-center justify-between px-4 text-[9px] font-mono text-slate-400 select-none">
            <span>0 cm</span>
            <span>2.5 cm (Marge)</span>
            <span>5 cm</span>
            <span>10 cm</span>
            <span>15 cm</span>
            <span>18.5 cm (Marge)</span>
            <span>21 cm</span>
          </div>

          {/* Toast flottant */}
          {toastMessage && (
            <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-5 py-2 rounded-xl shadow-2xl text-xs z-50 flex items-center gap-2 border border-amber-400 animate-bounce">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Rendu des pages A4 physiques */}
          {doc.pages.map((page, pageIndex) => (
            <div
              key={page.id}
              style={{
                width: doc.orientation === 'landscape' ? '297mm' : '210mm',
                minHeight: doc.orientation === 'landscape' ? '210mm' : '297mm',
                backgroundColor: doc.theme.pageBackground || '#FFFFFF',
                paddingTop: `${doc.margins.top}mm`,
                paddingBottom: `${doc.margins.bottom}mm`,
                paddingLeft: `${doc.margins.left}mm`,
                paddingRight: `${doc.margins.right}mm`,
                transform: `scale(${zoomLevel / 100})`,
                transformOrigin: 'top center',
                fontFamily: doc.theme.fontFamily || 'Calibri, sans-serif'
              }}
              className="forcus-page-sheet relative bg-white shadow-2xl border border-slate-300 text-slate-900 rounded-xs mb-8 transition-transform"
              onDoubleClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const clickY = e.clientY - rect.top;
                setFloatingInsertMenu({
                  visible: true,
                  x: clickX,
                  y: clickY,
                  pageId: page.id
                });
              }}
            >
              {/* Filigrane de page si activé */}
              {doc.watermark?.enabled && doc.watermark.text && (
                <div
                  className="absolute inset-0 pointer-events-none flex items-center justify-center select-none overflow-hidden z-0"
                  style={{
                    transform: `rotate(${doc.watermark.angle || -45}deg)`,
                    opacity: (doc.watermark.opacity || 15) / 100
                  }}
                >
                  <span className="font-extrabold text-7xl text-slate-500 tracking-widest whitespace-nowrap">
                    {doc.watermark.text}
                  </span>
                </div>
              )}

              {/* En-tête de page cliquable */}
              <div
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => {
                  const newHeader = e.currentTarget.innerHTML;
                  setDoc((prev) => ({
                    ...prev,
                    pages: prev.pages.map((p) => (p.id === page.id ? { ...p, headerHtml: newHeader } : p))
                  }));
                }}
                dangerouslySetInnerHTML={{ __html: page.headerHtml || '' }}
                className="mb-4 outline-none hover:ring-1 hover:ring-blue-400/40 rounded transition-all cursor-text relative z-10"
              />

              {/* Corps de texte principal du document (Word-like contentEditable) */}
              <div
                ref={pageIndex === 0 ? activeEditorRef : undefined}
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => updatePageContent(page.id, e.currentTarget.innerHTML)}
                dangerouslySetInnerHTML={{ __html: page.htmlContent }}
                className="outline-none min-h-[500px] leading-relaxed relative z-10"
                style={{
                  fontSize: '11pt',
                  color: '#1E293B'
                }}
              />

              {/* Calques et objets superposés sur cette page */}
              {page.layers
                .filter((l) => l.visible)
                .map((layer) => {
                  const isSelected = selectedLayerId === layer.id;
                  return (
                    <div
                      key={layer.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedLayerId(layer.id);
                      }}
                      onMouseDown={(e) => {
                        if (layer.locked) return;
                        e.stopPropagation();
                        setSelectedLayerId(layer.id);
                        setIsDraggingLayer(true);
                        setDragStart({
                          mouseX: e.clientX,
                          mouseY: e.clientY,
                          initialX: layer.x,
                          initialY: layer.y
                        });

                        const handleMouseMove = (moveEvt: MouseEvent) => {
                          const dx = moveEvt.clientX - e.clientX;
                          const dy = moveEvt.clientY - e.clientY;
                          let newX = Math.round(layer.x + dx);
                          let newY = Math.round(layer.y + dy);

                          if (snapToGrid) {
                            newX = Math.round(newX / 10) * 10;
                            newY = Math.round(newY / 10) * 10;
                          }

                          setDoc((prev) => ({
                            ...prev,
                            pages: prev.pages.map((p) =>
                              p.id === page.id
                                ? {
                                    ...p,
                                    layers: p.layers.map((l) =>
                                      l.id === layer.id ? { ...l, x: newX, y: newY } : l
                                    )
                                  }
                                : p
                            )
                          }));
                        };

                        const handleMouseUp = () => {
                          setIsDraggingLayer(false);
                          window.removeEventListener('mousemove', handleMouseMove);
                          window.removeEventListener('mouseup', handleMouseUp);
                        };

                        window.addEventListener('mousemove', handleMouseMove);
                        window.addEventListener('mouseup', handleMouseUp);
                      }}
                      style={{
                        position: 'absolute',
                        left: `${layer.x}px`,
                        top: `${layer.y}px`,
                        width: `${layer.width}px`,
                        height: `${layer.height}px`,
                        transform: `rotate(${layer.rotation || 0}deg)`,
                        opacity: (layer.opacity || 100) / 100,
                        zIndex: layer.wrapMode === 'behind' ? 5 : layer.zIndex,
                        cursor: layer.locked ? 'default' : 'move'
                      }}
                      className={`group transition-shadow ${
                        isSelected ? 'ring-2 ring-blue-600 ring-offset-1 shadow-lg' : 'hover:ring-1 hover:ring-blue-400'
                      }`}
                    >
                      {/* Rendu du contenu du calque */}
                      {layer.type === 'text' && (
                        <div
                          contentEditable={!layer.locked}
                          suppressContentEditableWarning
                          style={layer.style as any}
                          className="w-full h-full p-2 outline-none break-words"
                        >
                          {layer.content}
                        </div>
                      )}

                      {layer.type === 'shape' && (
                        <div
                          style={{
                            ...layer.style,
                            width: '100%',
                            height: '100%'
                          }}
                        />
                      )}

                      {(layer.type === 'image' || layer.type === 'logo' || layer.type === 'signature' || layer.type === 'stamp') && (
                        <img
                          src={layer.content}
                          alt={layer.name}
                          className="w-full h-full object-contain pointer-events-none select-none"
                        />
                      )}

                      {/* Barre d'outils contextuelle flottante complète sur l'élément sélectionné */}
                      {isSelected && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                          className="absolute -top-11 left-0 flex flex-wrap items-center gap-1 bg-slate-900/95 backdrop-blur-md text-white px-2.5 py-1 rounded-lg shadow-2xl text-[10px] z-50 border border-slate-700 whitespace-nowrap"
                        >
                          <span className="font-bold text-amber-300 pr-1 border-r border-slate-700">{layer.name}</span>

                          {/* Dimensions & Taille */}
                          <div className="flex items-center gap-0.5 bg-slate-800 px-1 py-0.5 rounded border border-slate-700">
                            <span className="text-[9px] text-slate-400">Taille:</span>
                            <button
                              type="button"
                              onClick={() =>
                                updateLayerProperty(layer.id, {
                                  width: Math.max(30, Math.round(layer.width * 0.9)),
                                  height: Math.max(20, Math.round(layer.height * 0.9))
                                })
                              }
                              className="px-1 hover:bg-slate-700 rounded text-amber-400 font-bold"
                              title="Réduire de 10%"
                            >
                              -
                            </button>
                            <span className="text-[9px] font-mono text-white px-0.5">{layer.width}x{layer.height}</span>
                            <button
                              type="button"
                              onClick={() =>
                                updateLayerProperty(layer.id, {
                                  width: Math.round(layer.width * 1.1),
                                  height: Math.round(layer.height * 1.1)
                                })
                              }
                              className="px-1 hover:bg-slate-700 rounded text-amber-400 font-bold"
                              title="Agrandir de 10%"
                            >
                              +
                            </button>
                          </div>

                          {/* Rotation */}
                          <div className="flex items-center gap-0.5 bg-slate-800 px-1 py-0.5 rounded border border-slate-700">
                            <button
                              type="button"
                              onClick={() => updateLayerProperty(layer.id, { rotation: ((layer.rotation || 0) - 15 + 360) % 360 })}
                              className="px-1 hover:bg-slate-700 rounded text-sky-400 font-bold"
                              title="Pivoter -15°"
                            >
                              ↺ -15°
                            </button>
                            <button
                              type="button"
                              onClick={() => updateLayerProperty(layer.id, { rotation: 0 })}
                              className="px-1 hover:bg-slate-700 rounded text-slate-300"
                              title="Réinitialiser rotation"
                            >
                              0°
                            </button>
                            <button
                              type="button"
                              onClick={() => updateLayerProperty(layer.id, { rotation: ((layer.rotation || 0) + 15) % 360 })}
                              className="px-1 hover:bg-slate-700 rounded text-sky-400 font-bold"
                              title="Pivoter +15°"
                            >
                              ↻ +15°
                            </button>
                          </div>

                          {/* Superposition & Calques */}
                          <div className="flex items-center gap-0.5 bg-slate-800 px-1 py-0.5 rounded border border-slate-700">
                            <span className="text-[9px] text-slate-400">Calque:</span>
                            <button
                              type="button"
                              onClick={() => moveLayerOrder(layer.id, 'front')}
                              className="px-1 hover:bg-slate-700 rounded text-emerald-400"
                              title="Mettre au Premier Plan"
                            >
                              ⇪ 1er plan
                            </button>
                            <button
                              type="button"
                              onClick={() => moveLayerOrder(layer.id, 'up')}
                              className="px-1 hover:bg-slate-700 rounded text-emerald-300"
                              title="Avancer d'un calque"
                            >
                              ▲
                            </button>
                            <button
                              type="button"
                              onClick={() => moveLayerOrder(layer.id, 'down')}
                              className="px-1 hover:bg-slate-700 rounded text-emerald-300"
                              title="Reculer d'un calque"
                            >
                              ▼
                            </button>
                            <button
                              type="button"
                              onClick={() => moveLayerOrder(layer.id, 'back')}
                              className="px-1 hover:bg-slate-700 rounded text-slate-300"
                              title="Envoyer en Arrière-plan (Filigrane)"
                            >
                              ⇫ Arrière
                            </button>
                          </div>

                          {/* Opacité */}
                          <div className="flex items-center gap-0.5 bg-slate-800 px-1 py-0.5 rounded border border-slate-700">
                            <span className="text-[9px] text-slate-400">Opacité:</span>
                            <button
                              type="button"
                              onClick={() => updateLayerProperty(layer.id, { opacity: 100 })}
                              className={`px-1 rounded ${layer.opacity === 100 ? 'bg-blue-600 text-white' : 'hover:bg-slate-700 text-slate-300'}`}
                            >
                              100%
                            </button>
                            <button
                              type="button"
                              onClick={() => updateLayerProperty(layer.id, { opacity: 50 })}
                              className={`px-1 rounded ${layer.opacity === 50 ? 'bg-blue-600 text-white' : 'hover:bg-slate-700 text-slate-300'}`}
                            >
                              50%
                            </button>
                            <button
                              type="button"
                              onClick={() => updateLayerProperty(layer.id, { opacity: 20 })}
                              className={`px-1 rounded ${layer.opacity === 20 ? 'bg-blue-600 text-white' : 'hover:bg-slate-700 text-slate-300'}`}
                              title="Effet filigrane estompé"
                            >
                              20%
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleMakeSelectedLayerTransparent(layer.id)}
                            className="px-1.5 py-0.5 bg-blue-600 hover:bg-blue-700 rounded text-white font-bold"
                            title="Rendre le fond blanc/clair transparent (Chromakey)"
                          >
                            Fond transparent
                          </button>

                          <button
                            type="button"
                            onClick={() => duplicateLayer(layer.id)}
                            className="p-1 hover:bg-white/20 rounded text-amber-300"
                            title="Dupliquer l'élément"
                          >
                            <Copy className="w-3 h-3" />
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleLayerLock(layer.id)}
                            className="p-1 hover:bg-white/20 rounded"
                            title={layer.locked ? 'Déverrouiller' : 'Verrouiller'}
                          >
                            {layer.locked ? <Lock className="w-3 h-3 text-red-400" /> : <Unlock className="w-3 h-3 text-emerald-400" />}
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteLayer(layer.id)}
                            className="p-1 hover:bg-red-600 rounded text-white"
                            title="Supprimer l'élément"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      {/* Poignées de redimensionnement interactives */}
                      {isSelected && !layer.locked && (
                        <>
                          <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-blue-600 rounded-full border-2 border-white cursor-nwse-resize" />
                          <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-blue-600 rounded-full border-2 border-white cursor-nesw-resize" />
                          <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-blue-600 rounded-full border-2 border-white cursor-nesw-resize" />
                          <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-blue-600 rounded-full border-2 border-white cursor-nwse-resize" />
                        </>
                      )}
                    </div>
                  );
                })}

              {/* Pied de page cliquable */}
              <div
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => {
                  const newFooter = e.currentTarget.innerHTML;
                  setDoc((prev) => ({
                    ...prev,
                    pages: prev.pages.map((p) => (p.id === page.id ? { ...p, footerHtml: newFooter } : p))
                  }));
                }}
                dangerouslySetInnerHTML={{ __html: page.footerHtml || '' }}
                className="mt-6 outline-none hover:ring-1 hover:ring-blue-400/40 rounded transition-all cursor-text relative z-10"
              />

              {/* Numéro de page dans le coin */}
              <span className="absolute bottom-2 right-4 text-[9px] font-mono text-slate-400 pointer-events-none">
                Page {page.pageNumber} sur {doc.pages.length}
              </span>
            </div>
          ))}

          {/* Menu contextuel flottant suite à un double-clic */}
          {floatingInsertMenu && (
            <div
              style={{
                position: 'absolute',
                left: `${floatingInsertMenu.x}px`,
                top: `${floatingInsertMenu.y}px`
              }}
              className="bg-slate-900 text-white rounded-xl p-3 shadow-2xl border border-amber-400 z-50 text-xs flex flex-col gap-1.5 min-w-[200px] animate-scale-in"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-1.5 mb-1">
                <span className="font-bold text-amber-300">Insérer ici :</span>
                <button
                  type="button"
                  onClick={() => setFloatingInsertMenu(null)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  addLayerToPage(floatingInsertMenu.pageId, {
                    type: 'text',
                    name: 'Texte Libre',
                    content: 'Nouveau paragraphe...',
                    x: floatingInsertMenu.x,
                    y: floatingInsertMenu.y
                  });
                  setFloatingInsertMenu(null);
                }}
                className="p-1.5 hover:bg-white/10 rounded flex items-center gap-2 text-left"
              >
                <Type className="w-3.5 h-3.5 text-blue-400" />
                <span>Zone de texte libre</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsStampModalOpen(true);
                  setFloatingInsertMenu(null);
                }}
                className="p-1.5 hover:bg-white/10 rounded flex items-center gap-2 text-left"
              >
                <Sparkles className="w-3.5 h-3.5 text-red-400" />
                <span>Tampon officiel / Cachet</span>
              </button>

              <label className="p-1.5 hover:bg-white/10 rounded flex items-center gap-2 text-left cursor-pointer">
                <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                <span>Importer Image / Logo</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    handleUploadImageFile(e, floatingInsertMenu.pageId, 'image');
                    setFloatingInsertMenu(null);
                  }}
                />
              </label>

              <button
                type="button"
                onClick={() => {
                  insertTableIntoPage(2, 2);
                  setFloatingInsertMenu(null);
                }}
                className="p-1.5 hover:bg-white/10 rounded flex items-center gap-2 text-left"
              >
                <TableIcon className="w-3.5 h-3.5 text-amber-400" />
                <span>Tableau 2x2</span>
              </button>
            </div>
          )}
        </div>
        )}

        {/* 5. VOLET LATÉRAL DE GESTION DES CALQUES (Selection Pane) */}
        {isSelectionPaneOpen && (
          <div className="w-72 bg-white border-l border-slate-300 flex flex-col shadow-lg z-20">
            <div className="bg-[#2B579A] text-white p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-xs uppercase tracking-wide">Volet de Sélection</span>
              </div>
              <button
                type="button"
                onClick={() => setIsSelectionPaneOpen(false)}
                className="text-white hover:text-amber-300 cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>

            <div className="p-3 text-[11px] text-slate-500 border-b border-slate-100 bg-slate-50">
              Glissez ou cliquez sur les flèches pour modifier l'ordre de superposition (z-index).
            </div>

            {/* Liste ordonnée de tous les calques du document */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 text-xs">
              {doc.pages.flatMap((page) =>
                page.layers.map((layer) => {
                  const isSelected = selectedLayerId === layer.id;
                  return (
                    <div
                      key={layer.id}
                      onClick={() => setSelectedLayerId(layer.id)}
                      className={`p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50 border-blue-500 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2 h-2 rounded-full bg-blue-600" />
                        <span className="font-bold text-slate-900 truncate text-[11px]">{layer.name}</span>
                      </div>

                      {/* Actions rapides sur le calque */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            moveLayerOrder(layer.id, 'up');
                          }}
                          className="p-1 hover:bg-slate-200 rounded text-slate-600"
                          title="Avancer d'un niveau"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            moveLayerOrder(layer.id, 'down');
                          }}
                          className="p-1 hover:bg-slate-200 rounded text-slate-600"
                          title="Reculer d'un niveau"
                        >
                          ▼
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLayerLock(layer.id);
                          }}
                          className="p-1 hover:bg-slate-200 rounded"
                          title={layer.locked ? 'Déverrouiller' : 'Verrouiller'}
                        >
                          {layer.locked ? <Lock className="w-3.5 h-3.5 text-red-500" /> : <Unlock className="w-3.5 h-3.5 text-slate-400" />}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLayerVisible(layer.id);
                          }}
                          className="p-1 hover:bg-slate-200 rounded"
                          title={layer.visible ? 'Masquer' : 'Afficher'}
                        >
                          {layer.visible ? <Eye className="w-3.5 h-3.5 text-slate-600" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteLayer(layer.id);
                          }}
                          className="p-1 hover:bg-red-100 rounded text-red-600"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}

              {doc.pages.every((p) => p.layers.length === 0) && (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Aucun calque ou objet sur les pages.<br />
                  Insérez une image, un logo, un tampon ou une zone de texte.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 6. BARRE D'ÉTAT INFÉRIEURE WORD 2013 */}
      <div className="bg-[#2B579A] text-white px-4 py-1.5 flex items-center justify-between text-xs border-t border-[#1E3F70]">
        <div className="flex items-center gap-4">
          <span>Page 1 sur {doc.pages.length}</span>
          <span className="hidden sm:inline">|</span>
          <span className="hidden sm:inline">{wordStats.words} mots · {wordStats.chars} caractères</span>
          <span className="hidden md:inline">|</span>
          <span className="hidden md:inline">Français (Canada)</span>
        </div>

        {/* Contrôle de zoom Word 2013 */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setZoomLevel((z) => Math.max(50, z - 10))}
            className="p-1 hover:bg-white/20 rounded cursor-pointer"
            title="Réduire le zoom"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <input
            type="range"
            min="50"
            max="180"
            value={zoomLevel}
            onChange={(e) => setZoomLevel(Number(e.target.value))}
            className="w-24 accent-amber-400 cursor-pointer"
          />

          <button
            type="button"
            onClick={() => setZoomLevel((z) => Math.min(180, z + 10))}
            className="p-1 hover:bg-white/20 rounded cursor-pointer"
            title="Agrandir le zoom"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <span className="font-mono w-12 text-right">{zoomLevel}%</span>
        </div>
      </div>

      {/* Modale Générateur de Tampon Officiel */}
      <OfficialStampGeneratorModal
        isOpen={isStampModalOpen}
        onClose={() => setIsStampModalOpen(false)}
        settings={settings}
        onApplyStamp={(stampDataUrl) => {
          addLayerToPage(doc.pages[0].id, {
            type: 'stamp',
            name: 'Tampon Officiel',
            content: stampDataUrl,
            width: 140,
            height: 140,
            wrapMode: 'infront'
          });
        }}
      />

      {/* Modale Liste des Documents IndexedDB */}
      {isDocListModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h4 className="font-bold text-sm text-[#0B2545]">Documents enregistrés (IndexedDB local)</h4>
              <button type="button" onClick={() => setIsDocListModalOpen(false)} className="text-slate-400 hover:text-black">✕</button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2">
              {savedDocsList.map((d) => (
                <div key={d.id} className="p-3 rounded-xl border flex items-center justify-between hover:bg-slate-50">
                  <div>
                    <h5 className="font-bold text-xs text-slate-900">{d.title}</h5>
                    <span className="text-[10px] text-slate-500">{d.pageCount} page(s) · {new Date(d.updatedAt).toLocaleString('fr-CA')}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        getForcusDocument(d.id).then((loaded) => {
                          if (loaded) {
                            pushHistory(loaded);
                            setIsDocListModalOpen(false);
                            showToast(`Document "${loaded.title}" ouvert !`);
                          }
                        });
                      }}
                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold"
                    >
                      Ouvrir
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        deleteForcusDocument(d.id).then(() => {
                          setSavedDocsList((prev) => prev.filter((item) => item.id !== d.id));
                        });
                      }}
                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {savedDocsList.length === 0 && (
                <p className="text-center text-xs text-slate-400 py-4">Aucun document sauvegardé pour le moment.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
