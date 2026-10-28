import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Upload,
  Sparkles,
  MousePointer,
  Crosshair,
  Scissors,
  FileSearch,
  Layout,
  RotateCcw,
  Save,
  Code,
  Copy,
  Check,
  Globe,
  Download,
  Send,
  ExternalLink,
  Layers,
  Image as ImageIcon,
  Eye,
  Trash2,
  Plus,
  RefreshCw,
  FileText,
  FileCode,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Type
} from 'lucide-react';
import { Employee } from '../../types';
import {
  DocumentZone,
  EditableTextBlock,
  OcrTextBlock,
  StudioDocument,
  ZoneLabelType,
  ZoneActionType,
  ZONE_LABELS_CONFIG,
  analyzeDocumentAndMaskText,
  buildKitsCmsHtml,
  composeDocumentExactImage,
  cropExactPixelZone,
  exportStudioDocx,
  exportStudioHtml,
  exportStudioImage,
  exportStudioPdf,
  generatePublicDownloadUrl,
  getAllStudioDocuments,
  saveStudioDocument
} from '../../services/documentStudioService';
import { DocumentStudioCanvas } from './DocumentStudioCanvas';
import { convertPdfFileToImages } from '../../services/pdfRendererService';
import { HtmlRastModal } from './HtmlRastModal';

interface DocumentStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  selectedEmployee?: Employee | null;
  onOpenInWebmail?: (emailContent: {
    recipient: string;
    subject: string;
    htmlBody: string;
  }) => void;
}

export const DocumentStudioModal: React.FC<DocumentStudioModalProps> = ({
  isOpen,
  onClose,
  employees,
  selectedEmployee,
  onOpenInWebmail
}) => {
  // Identifiant unique du document
  const [docId, setDocId] = useState<string>(() => `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);

  // Métadonnées du document (100% dynamiques et agnostiques)
  const [docTitle, setDocTitle] = useState<string>('');
  const [recipientName, setRecipientName] = useState<string>('');
  const [recipientEmail, setRecipientEmail] = useState<string>('');
  const [matricule, setMatricule] = useState<string>(() => `REF-${Math.floor(100000 + Math.random() * 900000)}`);

  // Images du document
  const [originalImageSrc, setOriginalImageSrc] = useState<string>('');
  const [originalFileName, setOriginalFileName] = useState<string>('');
  const [cleanedBackgroundSrc, setCleanedBackgroundSrc] = useState<string>('');
  const [compositeDocSrc, setCompositeDocSrc] = useState<string>('');
  const [pdfPages, setPdfPages] = useState<string[]>([]);
  const [currentPdfPageIndex, setCurrentPdfPageIndex] = useState<number>(0);
  const [isLoadingPdf, setIsLoadingPdf] = useState<boolean>(false);

  // Dimensions naturelles du document
  const [docDimensions, setDocDimensions] = useState<{ width: number; height: number }>({
    width: 800,
    height: 1130
  });

  // Workflow states
  const [zones, setZones] = useState<DocumentZone[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [currentLabelForNewZone, setCurrentLabelForNewZone] = useState<ZoneLabelType>('logo');
  const [isSelectionModeActive, setIsSelectionModeActive] = useState<boolean>(true); // Étape 1 : actif d'office
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Blocs de texte réels et éditables (extraits du document, zéro texte fictif)
  const [textBlocks, setTextBlocks] = useState<EditableTextBlock[]>([]);

  // Onglet actif dans le panneau inférieur
  const [activeBottomTab, setActiveBottomTab] = useState<'zones' | 'texts'>('zones');

  // OCR
  const [ocrBlocks, setOcrBlocks] = useState<OcrTextBlock[]>([]);
  const [isAnalyzingOcr, setIsAnalyzingOcr] = useState<boolean>(false);
  const [ocrAnalyzed, setOcrAnalyzed] = useState<boolean>(false);

  // Layout View mode
  const [canvasViewMode, setCanvasViewMode] = useState<'original' | 'cleaned' | 'reconstructed'>('original');

  // KitsCMS & Webmail Code
  const [reconstructedHtml, setReconstructedHtml] = useState<string>('');
  const [copiedKitsCmsCode, setCopiedKitsCmsCode] = useState<boolean>(false);
  const [copiedPublicUrl, setCopiedPublicUrl] = useState<boolean>(false);

  // Modals annexes
  const [isHostingModalOpen, setIsHostingModalOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isHtmlRastModalOpen, setIsHtmlRastModalOpen] = useState<boolean>(false);

  // Notifications
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  // Helper pour afficher les messages
  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 3500);
  };

  // URL publique générée
  const publicUrl = generatePublicDownloadUrl(docId);

  // Traitement universel des fichiers importés (PDF, JPG, PNG, Word)
  const processUploadedFile = async (file: File) => {
    setOriginalFileName(file.name);

    const cleanName = file.name
      .replace(/\.[^/.]+$/, '')
      .replace(/[_-]/g, ' ')
      .trim();
    if (!docTitle || docTitle.trim().length === 0) {
      setDocTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }

    const isPdf =
      file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    // 1. FICHIERS PDF : Rendu haute définition ET extraction du vrai texte natif
    if (isPdf) {
      setIsLoadingPdf(true);
      showToast(`Extraction vectorielle et lecture du texte du PDF "${file.name}"...`, 'info');
      try {
        const info = await convertPdfFileToImages(file, { scale: 1.8 });
        if (info.pagesDataUrls.length > 0) {
          setPdfPages(info.pagesDataUrls);
          setCurrentPdfPageIndex(0);
          setOriginalImageSrc(info.pagesDataUrls[0]);
          setCleanedBackgroundSrc('');
          setCompositeDocSrc('');
          setZones([]);
          setSelectedZoneId(null);
          setOcrAnalyzed(false);
          setIsSelectionModeActive(true);
          setCurrentStep(1);
          setCanvasViewMode('original');

          // Si du texte a été extrait du PDF, on peuple les blocs de texte éditables
          if (info.extractedTextBlocks && info.extractedTextBlocks.length > 0) {
            setTextBlocks(info.extractedTextBlocks);
            showToast(
              `PDF chargé : ${info.extractedTextBlocks.length} paragraphe(s) de texte natif extrait(s) et modifiable(s) !`
            );
          } else {
            setTextBlocks([]);
            showToast(
              `PDF "${file.name}" affiché (${info.numPages} page(s)). Étape 1 : Tracez vos rectangles sur le document.`
            );
          }

          const testImg = new Image();
          testImg.onload = () => {
            setDocDimensions({
              width: testImg.naturalWidth || 800,
              height: testImg.naturalHeight || 1130
            });
          };
          testImg.src = info.pagesDataUrls[0];
        } else {
          showToast("Aucune page n'a pu être extraite du fichier PDF.", 'error');
        }
      } catch (pdfErr) {
        console.error('Erreur lecture PDF:', pdfErr);
        showToast('Erreur lors de la lecture du fichier PDF.', 'error');
      } finally {
        setIsLoadingPdf(false);
      }
      return;
    }

    // 2. FICHIERS IMAGES (PNG, JPG, WEBP, SVG)
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          const res = reader.result;
          setPdfPages([res]);
          setCurrentPdfPageIndex(0);
          setOriginalImageSrc(res);
          setCleanedBackgroundSrc('');
          setCompositeDocSrc('');
          setZones([]);
          setSelectedZoneId(null);
          setTextBlocks([]);
          setOcrAnalyzed(false);
          setIsSelectionModeActive(true);
          setCurrentStep(1);
          setCanvasViewMode('original');

          const testImg = new Image();
          testImg.onload = () => {
            setDocDimensions({
              width: testImg.naturalWidth || 800,
              height: testImg.naturalHeight || 1130
            });
          };
          testImg.src = res;

          showToast(`Document "${file.name}" chargé. Étape 1 : Tracez vos rectangles sur le document.`);
        }
      };
      reader.readAsDataURL(file);
      return;
    }

    // 3. FICHIERS BUREAUTIQUES (DOCX, TXT...)
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      const lines = content.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
      
      if (lines.length > 0) {
        setTextBlocks(
          lines.slice(0, 8).map((l, i) => ({
            id: `docx_line_${i}`,
            text: l,
            isHeading: i === 0 || l.length < 50
          }))
        );
      }

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 800;
      tempCanvas.height = 1130;
      const ctx = tempCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 800, 1130);
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 20px Arial';
        ctx.fillText(cleanName.toUpperCase(), 60, 80);

        ctx.font = '13px Arial';
        ctx.fillStyle = '#334155';
        let yPos = 140;
        for (const line of lines.slice(0, 30)) {
          ctx.fillText(line.slice(0, 85), 60, yPos);
          yPos += 24;
        }

        const converted = tempCanvas.toDataURL('image/png');
        setPdfPages([converted]);
        setCurrentPdfPageIndex(0);
        setOriginalImageSrc(converted);
        setCleanedBackgroundSrc('');
        setCompositeDocSrc('');
        setZones([]);
        setIsSelectionModeActive(true);
        setCurrentStep(1);
        setCanvasViewMode('original');
        showToast(`Document "${file.name}" importé avec ${lines.length} ligne(s) de texte éditable.`);
      }
    };
    reader.readAsText(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
  };

  // Helper pour générer le code source HTML 100% éditable
  const generateEmailHtml = async (
    currentZones: DocumentZone[] = zones,
    currentTexts: EditableTextBlock[] = textBlocks
  ) => {
    return buildKitsCmsHtml({
      title: docTitle || 'Document Officiel',
      recipientName,
      recipientEmail,
      matricule,
      zones: currentZones,
      cleanedBackgroundDataUrl: cleanedBackgroundSrc || originalImageSrc,
      originalImageDataUrl: originalImageSrc,
      publicDownloadUrl: publicUrl,
      textBlocks: currentTexts
    });
  };

  // ACTION 2 : ÉTAPE 2 - ANALYSER LE DOCUMENT (OCR & Masquage Visuel des textes)
  const handleAnalyzeDocument = async () => {
    if (!originalImageSrc) {
      showToast("Veuillez d'abord importer un document de référence.", "error");
      return;
    }
    setIsAnalyzingOcr(true);
    showToast("Analyse OCR du document... Détection et masquage visuel des textes.", "info");

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      try {
        const { cleanedBackgroundDataUrl, ocrBlocks: detectedBlocks } =
          await analyzeDocumentAndMaskText(img, zones);

        setCleanedBackgroundSrc(cleanedBackgroundDataUrl);
        setOcrBlocks(detectedBlocks);
        setOcrAnalyzed(true);
        setCurrentStep(2);
        setCanvasViewMode('cleaned');
        showToast("Étape 2 terminée : Textes masqués avec succès. L'arrière-plan graphique est propre.");
      } catch (err) {
        console.error("Erreur analyse OCR:", err);
        showToast("Erreur lors de l'analyse OCR.", "error");
      } finally {
        setIsAnalyzingOcr(false);
      }
    };
    img.src = originalImageSrc;
  };

  // ACTION 3 : ÉTAPE 2 / 3 - RECONSTRUIRE LA MISE EN PAGE
  const handleReconstructLayout = async () => {
    if (!originalImageSrc) {
      showToast("Veuillez d'abord importer votre document de référence.", "error");
      return;
    }

    const html = await generateEmailHtml(zones, textBlocks);
    setReconstructedHtml(html);
    setCanvasViewMode('reconstructed');
    setCurrentStep(3);
    showToast("Mise en page reconstruite : le template contient du texte 100% éditable pour votre webmail.");
  };

  // ACTION 4 : RESTAURER INITIAL
  const handleRestoreInitial = () => {
    setCleanedBackgroundSrc('');
    setCompositeDocSrc('');
    setZones([]);
    setSelectedZoneId(null);
    setOcrAnalyzed(false);
    setCanvasViewMode('original');
    setIsSelectionModeActive(true);
    setCurrentStep(1);
    showToast("Document restauré à l'état initial. Vous pouvez redessiner vos zones.");
  };

  // ACTION 5 : ENREGISTRER LE DOCUMENT
  const handleSaveDocument = async () => {
    if (!originalImageSrc) {
      showToast("Aucun document à enregistrer.", "error");
      return;
    }

    const currentHtml = reconstructedHtml || (await generateEmailHtml(zones, textBlocks));

    const studioDoc: StudioDocument = {
      id: docId,
      title: docTitle || 'Document Officiel',
      recipientName,
      recipientEmail,
      matricule,
      originalFileName: originalFileName || 'document.pdf',
      originalFileType: 'image/png',
      originalWidth: docDimensions.width,
      originalHeight: docDimensions.height,
      originalImageDataUrl: originalImageSrc,
      cleanedBackgroundDataUrl: cleanedBackgroundSrc || originalImageSrc,
      zones,
      ocrBlocks,
      textBlocks,
      reconstructedHtml: currentHtml,
      publicDownloadUrl: publicUrl,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await saveStudioDocument(studioDoc);
    showToast("Document enregistré et synchronisé pour le lien public de téléchargement !");
  };

  // ACTION 6 : PRÉPARER POUR KITSCMS
  const handlePrepareKitsCms = async () => {
    if (!originalImageSrc) {
      showToast("Veuillez d'abord importer votre document de référence.", "error");
      return;
    }

    const html = await generateEmailHtml(zones, textBlocks);
    setReconstructedHtml(html);
    setCurrentStep(4);
    showToast("Document préparé pour KitsCMS. Le code source avec texte éditable est prêt.");
  };

  // ACTION 7 : COPIER LE CODE HTML POUR KITSCMS (BOUTON PRINCIPAL D'ACTION)
  const handleCopyKitsCmsHtml = async () => {
    if (!originalImageSrc) {
      showToast("Veuillez d'abord importer un document de référence.", "error");
      return;
    }

    const code = reconstructedHtml || (await generateEmailHtml(zones, textBlocks));

    try {
      await navigator.clipboard.writeText(code.trim());
      setCopiedKitsCmsCode(true);
      showToast("Code HTML copié ! Chaque mot et paragraphe est modifiable dans votre messagerie.");
      setTimeout(() => setCopiedKitsCmsCode(false), 3000);
    } catch {
      showToast("Impossible d'accéder au presse-papier.", "error");
    }
  };

  // ACTION 8 : COPIER LE LIEN WEB POUR TÉLÉCHARGEMENT PDF (POUR LE DESTINATAIRE)
  const handleCopyPublicUrl = async () => {
    if (!originalImageSrc) {
      showToast("Veuillez importer un document avant de générer le lien.", "error");
      return;
    }
    await handleSaveDocument();
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopiedPublicUrl(true);
      showToast("Lien web de téléchargement PDF copié !");
      setTimeout(() => setCopiedPublicUrl(false), 3000);
    } catch {
      showToast("Impossible de copier le lien.", "error");
    }
  };

  // ACTION 9 : TRANSFÉRER VERS LE WEBMAIL INFOMANIAK
  const handleTransferToWebmail = async () => {
    if (!originalImageSrc) {
      showToast("Veuillez d'abord importer votre document de référence.", "error");
      return;
    }

    const code = reconstructedHtml || (await generateEmailHtml(zones, textBlocks));

    if (onOpenInWebmail) {
      onOpenInWebmail({
        recipient: recipientEmail,
        subject: `${docTitle || 'Document Officiel'}${matricule ? ` - ${matricule}` : ''}`,
        htmlBody: code
      });
      onClose();
    } else {
      showToast("Redirection vers le Webmail Infomaniak...", "info");
    }
  };

  // Actions de zone (ÉTAPES 3 & 4)
  const handleUpdateZoneAction = (zoneId: string, action: ZoneActionType) => {
    const updated = zones.map((z) => (z.id === zoneId ? { ...z, action } : z));
    setZones(updated);
  };

  const handleUpdateZoneLabel = (zoneId: string, label: ZoneLabelType) => {
    const updated = zones.map((z) => {
      if (z.id !== zoneId) return z;
      const conf = ZONE_LABELS_CONFIG[label];
      return {
        ...z,
        label,
        name: `${conf?.label || label}`
      };
    });
    setZones(updated);
  };

  const handleReplaceZoneFile = (
    zoneId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const updated = zones.map((z) =>
          z.id === zoneId
            ? {
                ...z,
                action: 'replace' as ZoneActionType,
                replacementDataUrl: reader.result as string
              }
            : z
        );
        setZones(updated);
        showToast(`Fichier de remplacement appliqué à la zone "${file.name}".`);
      }
    };
    reader.readAsDataURL(file);
  };

  // Gestion des blocs de texte éditables
  const handleUpdateTextBlock = (id: string, newText: string) => {
    setTextBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, text: newText } : b))
    );
  };

  const handleToggleHeading = (id: string) => {
    setTextBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, isHeading: !b.isHeading } : b))
    );
  };

  const handleDeleteTextBlock = (id: string) => {
    setTextBlocks((prev) => prev.filter((b) => b.id !== id));
  };

  const handleAddTextBlock = () => {
    const newBlock: EditableTextBlock = {
      id: `custom_para_${Date.now()}`,
      text: "Nouveau paragraphe éditable à insérer dans le template e-mail...",
      isHeading: false
    };
    setTextBlocks((prev) => [...prev, newBlock]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-7xl w-full border border-slate-200 shadow-2xl overflow-hidden my-auto max-h-[96vh] flex flex-col font-sans">
        
        {/* ================================================================= */}
        {/* EN-TÊTE MODAL : RESPECT STRICT DE LA CHARTE DE L'APPLICATION      */}
        {/* ================================================================= */}
        <div className="bg-[#0B2545] text-white p-4 sm:p-5 flex items-center justify-between gap-4 border-b-2 border-amber-400/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono uppercase text-amber-400 font-bold tracking-wider">
                  Générateur de Template E-mail
                </span>
                <span className="bg-amber-400/10 text-amber-300 text-[10px] px-2 py-0.5 rounded-full border border-amber-400/20 font-bold">
                  Texte 100% Éditable · KitsCMS · Infomaniak
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
                Mise en page HTML native &amp; Texte modifiable au clavier
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (!originalImageSrc) {
                  showToast("Veuillez d'abord importer un document de référence.", "error");
                  return;
                }
                setIsHtmlRastModalOpen(true);
              }}
              className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 hover:brightness-105 text-slate-950 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-md border border-amber-300"
              title="Générer un template e-mail reproduisant fidèlement le document original avec HTML RAST"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              <span>FONCTION HTML RAST</span>
            </button>

            <label className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer border border-white/20">
              <Upload className="w-3.5 h-3.5 text-amber-400" />
              <span>Importer Doc (PDF, JPG, PNG)</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,application/pdf,.doc,.docx"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <button
              type="button"
              onClick={onClose}
              className="text-slate-300 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* BANDEAU DE CONFIGURATION DU DOCUMENT                              */}
        {/* ================================================================= */}
        <div className="bg-slate-100 border-b border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="flex items-center gap-1.5 min-w-[200px] flex-1">
              <span className="text-slate-500 font-semibold shrink-0">Titre template :</span>
              <input
                type="text"
                placeholder="Ex : Facture N° 1024, Contrat de mission, etc."
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                className="w-full px-2.5 py-1 bg-white rounded-lg border border-slate-300 text-xs font-bold text-[#0B2545] focus:outline-none focus:border-[#0B2545]"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-semibold shrink-0">Réf. dossier :</span>
              <input
                type="text"
                placeholder="REF-001"
                value={matricule}
                onChange={(e) => setMatricule(e.target.value)}
                className="w-28 px-2 py-1 bg-white rounded-lg border border-slate-300 text-xs font-mono font-bold text-amber-700 focus:outline-none focus:border-[#0B2545]"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-semibold shrink-0">Destinataire :</span>
              <input
                type="text"
                placeholder="Nom du client / salarié"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                className="w-36 px-2 py-1 bg-white rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-[#0B2545]"
              />
            </div>
          </div>

          {originalFileName && (
            <div className="text-[11px] text-slate-500 flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
              <FileText className="w-3 h-3 text-amber-500" />
              <span className="font-mono truncate max-w-[150px]">{originalFileName}</span>
            </div>
          )}
        </div>

        {/* ================================================================= */}
        {/* CORPS PRINCIPAL : CANVAS / APERÇU HTML + PANNEAUX D'ACTIONS       */}
        {/* ================================================================= */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-5 bg-slate-50">
          
          {/* Notification Toast */}
          {toastMsg && (
            <div
              className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2.5 transition-all shadow-sm ${
                toastMsg.type === 'error'
                  ? 'bg-red-50 text-red-800 border border-red-200'
                  : toastMsg.type === 'info'
                  ? 'bg-blue-50 text-blue-900 border border-blue-200'
                  : 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              }`}
            >
              {toastMsg.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              ) : toastMsg.type === 'info' ? (
                <RefreshCw className="w-4 h-4 text-blue-600 shrink-0 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              )}
              <span>{toastMsg.text}</span>
            </div>
          )}

          {/* Grille principale : Canvas/Aperçu à gauche + Contrôles à droite */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            {/* Colonne GAUCHE : Canvas interactif OU Aperçu Live HTML Éditable */}
            <div className="lg:col-span-8 space-y-3">
              {/* Sélecteur de vue */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCanvasViewMode('original')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      canvasViewMode === 'original'
                        ? 'bg-[#0B2545] text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Image Originale</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!cleanedBackgroundSrc) {
                        handleAnalyzeDocument();
                      } else {
                        setCanvasViewMode('cleaned');
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      canvasViewMode === 'cleaned'
                        ? 'bg-[#0B2545] text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Fond Nettoyé (Après OCR)</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      if (!reconstructedHtml) {
                        const html = await generateEmailHtml(zones, textBlocks);
                        setReconstructedHtml(html);
                      }
                      setCanvasViewMode('reconstructed');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      canvasViewMode === 'reconstructed'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Layout className="w-3.5 h-3.5 text-amber-400" />
                    <span>Aperçu HTML Éditable</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-slate-700">Rôle nouvelle zone :</label>
                  <select
                    value={currentLabelForNewZone}
                    onChange={(e) => setCurrentLabelForNewZone(e.target.value as ZoneLabelType)}
                    className="px-2.5 py-1 rounded-lg border border-slate-300 text-xs font-medium bg-white focus:border-[#0B2545] focus:outline-none"
                  >
                    {Object.entries(ZONE_LABELS_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.icon} {v.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Pagination PDF si document multi-pages */}
              {pdfPages.length > 1 && canvasViewMode !== 'reconstructed' && (
                <div className="bg-[#0B2545] text-white px-4 py-2 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs border border-amber-400/30 shadow-sm">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-amber-400" />
                    <span className="font-semibold text-slate-100">
                      Document multi-pages :
                    </span>
                    <span className="bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded font-mono">
                      Page {currentPdfPageIndex + 1} sur {pdfPages.length}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={currentPdfPageIndex === 0}
                      onClick={() => {
                        const newIdx = currentPdfPageIndex - 1;
                        setCurrentPdfPageIndex(newIdx);
                        setOriginalImageSrc(pdfPages[newIdx]);
                        setCleanedBackgroundSrc('');
                        setCompositeDocSrc('');
                        setCanvasViewMode('original');
                        showToast(`Affichage de la page ${newIdx + 1} / ${pdfPages.length}`);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Page précédente</span>
                    </button>

                    <button
                      type="button"
                      disabled={currentPdfPageIndex >= pdfPages.length - 1}
                      onClick={() => {
                        const newIdx = currentPdfPageIndex + 1;
                        setCurrentPdfPageIndex(newIdx);
                        setOriginalImageSrc(pdfPages[newIdx]);
                        setCleanedBackgroundSrc('');
                        setCompositeDocSrc('');
                        setCanvasViewMode('original');
                        showToast(`Affichage de la page ${newIdx + 1} / ${pdfPages.length}`);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    >
                      <span>Page suivante</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Surface d'affichage : Canvas Interactif OU Aperçu Live HTML Éditable */}
              <div className="relative">
                {isLoadingPdf && (
                  <div className="absolute inset-0 z-30 bg-slate-950/75 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-white rounded-2xl">
                    <RefreshCw className="w-10 h-10 text-amber-400 animate-spin mb-3" />
                    <span className="text-sm font-bold">Rendu vectoriel du PDF &amp; extraction de texte...</span>
                    <span className="text-xs text-slate-300 mt-1">Génération du document haute définition et des paragraphes modifiables</span>
                  </div>
                )}

                {canvasViewMode === 'reconstructed' ? (
                  <div className="bg-slate-100 rounded-2xl border border-slate-200 p-4 max-h-[600px] overflow-auto shadow-inner space-y-3">
                    <div className="bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-xl flex items-center justify-between text-xs text-emerald-900 font-semibold">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Aperçu HTML Éditable : Vous pouvez cliquer et taper directement dans les textes ci-dessous !</span>
                      </div>
                      <span className="text-[11px] font-mono bg-emerald-100 px-2 py-0.5 rounded text-emerald-800">
                        100% natif
                      </span>
                    </div>

                    <div
                      contentEditable
                      suppressContentEditableWarning
                      dangerouslySetInnerHTML={{
                        __html:
                          reconstructedHtml ||
                          buildKitsCmsHtml({
                            title: docTitle || 'Document Officiel',
                            recipientName,
                            recipientEmail,
                            matricule,
                            zones,
                            cleanedBackgroundDataUrl: cleanedBackgroundSrc || originalImageSrc,
                            originalImageDataUrl: originalImageSrc,
                            publicDownloadUrl: publicUrl,
                            textBlocks
                          })
                      }}
                      className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                  </div>
                ) : (
                  <DocumentStudioCanvas
                    imageSrc={originalImageSrc}
                    cleanedBackgroundSrc={cleanedBackgroundSrc}
                    zones={zones}
                    selectedZoneId={selectedZoneId}
                    onSelectZone={setSelectedZoneId}
                    onZonesChange={setZones}
                    isSelectionModeActive={isSelectionModeActive}
                    onToggleSelectionMode={() => setIsSelectionModeActive(!isSelectionModeActive)}
                    currentLabel={currentLabelForNewZone}
                    viewMode={canvasViewMode}
                    onFileUpload={processUploadedFile}
                  />
                )}
              </div>
            </div>

            {/* Colonne DROITE : Sections requises par le cahier des charges */}
            <div className="lg:col-span-4 space-y-4">
              
              {/* ============================================================= */}
              {/* SECTION 1 : "ACTIONS SUR LE DOCUMENT" (EXACTEMENT REQUISE)    */}
              {/* ============================================================= */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <h3 className="font-bold text-xs uppercase tracking-wider text-[#0B2545]">
                      ACTIONS SUR LE DOCUMENT
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">Étape {currentStep}/4</span>
                </div>

                <div className="space-y-2">
                  {/* Bouton : "SÉLECTION MANUELLE DES ZONES" */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsSelectionModeActive(true);
                      setCanvasViewMode('original');
                      showToast("Mode sélection manuelle activé : tracez un rectangle sur le document avec la souris.");
                    }}
                    className={`w-full min-h-[42px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-between transition-all cursor-pointer ${
                      isSelectionModeActive && canvasViewMode === 'original'
                        ? 'bg-amber-500 text-slate-950 shadow-sm ring-2 ring-amber-300'
                        : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Crosshair className="w-4 h-4 text-slate-950" />
                      <span>SÉLECTION MANUELLE DES ZONES</span>
                    </span>
                    <span className="text-[10px] bg-slate-950/10 px-2 py-0.5 rounded-full font-mono">
                      Étape 1
                    </span>
                  </button>

                  {/* Bouton : "1. ANALYSER LE DOCUMENT" */}
                  <button
                    type="button"
                    onClick={handleAnalyzeDocument}
                    disabled={isAnalyzingOcr || !originalImageSrc}
                    className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-[#0B2545] hover:bg-[#134074] text-white text-xs sm:text-sm font-bold flex items-center justify-between transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
                  >
                    <span className="flex items-center gap-2">
                      {isAnalyzingOcr ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                      ) : (
                        <FileSearch className="w-4 h-4 text-amber-400" />
                      )}
                      <span>1. ANALYSER LE DOCUMENT</span>
                    </span>
                    <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full font-mono">
                      OCR &amp; Masquage
                    </span>
                  </button>

                  {/* Bouton : "2. RECONSTRUIRE LA MISE EN PAGE" */}
                  <button
                    type="button"
                    onClick={handleReconstructLayout}
                    disabled={!originalImageSrc}
                    className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs sm:text-sm font-bold flex items-center justify-between transition-colors cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    <span className="flex items-center gap-2">
                      <Layout className="w-4 h-4 text-emerald-400" />
                      <span>2. RECONSTRUIRE LA MISE EN PAGE</span>
                    </span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-mono">
                      Texte Éditable
                    </span>
                  </button>

                  {/* Ligne d'actions : Bouton "Restaurer initial" et Bouton "Enregistrer" */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleRestoreInitial}
                      className="min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                      <span>Restaurer initial</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveDocument}
                      className="min-h-[38px] px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Enregistrer</span>
                    </button>
                  </div>

                  {/* Bouton : "PRÉPARER POUR KITSCMS" */}
                  <button
                    type="button"
                    onClick={handlePrepareKitsCms}
                    disabled={!originalImageSrc}
                    className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#0B2545] border border-slate-300 text-xs sm:text-sm font-bold flex items-center justify-between transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <span className="flex items-center gap-2">
                      <Code className="w-4 h-4 text-amber-600" />
                      <span>PRÉPARER POUR KITSCMS</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">Format Webmail</span>
                  </button>

                  {/* Bouton Principal d'action : "COPIER LE CODE HTML POUR KITSCMS" */}
                  <button
                    type="button"
                    onClick={handleCopyKitsCmsHtml}
                    disabled={!originalImageSrc}
                    className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {copiedKitsCmsCode ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-300">Code HTML KitsCMS copié !</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-amber-400" />
                        <span>COPIER LE CODE HTML POUR KITSCMS</span>
                      </>
                    )}
                  </button>

                  {/* Bouton Expert : "FONCTION HTML RAST : REPRODUCTION FIDÈLE" */}
                  <button
                    type="button"
                    onClick={() => {
                      if (!originalImageSrc) {
                        showToast("Veuillez d'abord importer un document de référence.", "error");
                        return;
                      }
                      setIsHtmlRastModalOpen(true);
                    }}
                    disabled={!originalImageSrc}
                    className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:brightness-105 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-between transition-all shadow-md cursor-pointer disabled:opacity-50 border border-amber-300 ring-2 ring-amber-400/20"
                  >
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-slate-950" />
                      <span>FONCTION HTML RAST</span>
                    </span>
                    <span className="text-[10px] bg-slate-950 text-amber-300 px-2 py-0.5 rounded-full font-mono font-bold">
                      Mode Expert
                    </span>
                  </button>
                </div>
              </div>

              {/* ============================================================= */}
              {/* SECTION 2 : "HÉBERGEMENT & EXPORTATIONS" (EXACTEMENT REQUISE) */}
              {/* ============================================================= */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <h3 className="font-bold text-xs uppercase tracking-wider text-[#0B2545]">
                      HÉBERGEMENT &amp; EXPORTATIONS
                    </h3>
                  </div>
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                </div>

                <div className="space-y-2">
                  {/* Bouton : "Hébergement des images (KitsCMS)" */}
                  <button
                    type="button"
                    onClick={() => setIsHostingModalOpen(true)}
                    className="w-full min-h-[40px] px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#0B2545] text-xs sm:text-sm font-semibold flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-amber-500" />
                      <span>Hébergement des images (KitsCMS)</span>
                    </span>
                    <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded-full font-mono">
                      {zones.length} zone(s)
                    </span>
                  </button>

                  {/* Bouton : "EXPORTER LE DOCUMENT (DOCX, PDF, HTML, JPG...)" */}
                  <button
                    type="button"
                    onClick={() => setIsExportModalOpen(true)}
                    disabled={!originalImageSrc}
                    className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-[#0B2545] hover:bg-[#134074] text-white text-xs sm:text-sm font-bold flex items-center justify-between transition-colors cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    <span className="flex items-center gap-2">
                      <Download className="w-4 h-4 text-amber-400" />
                      <span>EXPORTER LE DOCUMENT (DOCX, PDF, HTML, JPG...)</span>
                    </span>
                    <span className="text-[10px] bg-amber-400/20 text-amber-300 px-1.5 py-0.5 rounded font-mono">
                      Multi-format
                    </span>
                  </button>

                  {/* Options complémentaires : Bouton "HTML Brut", Bouton "PDF Simple" */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={async () => {
                        const code = reconstructedHtml || (await generateEmailHtml(zones, textBlocks));
                        const blob = new Blob([code], { type: 'text/html' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${matricule || 'document'}_kitscms.html`;
                        a.click();
                        URL.revokeObjectURL(url);
                        showToast("Fichier HTML Brut téléchargé.");
                      }}
                      disabled={!originalImageSrc}
                      className="min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <FileCode className="w-3.5 h-3.5 text-slate-500" />
                      <span>HTML Brut</span>
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        showToast("Génération du PDF Simple...", "info");
                        const studioDoc: StudioDocument = {
                          id: docId,
                          title: docTitle || 'Document',
                          matricule,
                          originalFileName,
                          originalFileType: 'image/png',
                          originalWidth: docDimensions.width,
                          originalHeight: docDimensions.height,
                          originalImageDataUrl: originalImageSrc,
                          cleanedBackgroundDataUrl: cleanedBackgroundSrc || originalImageSrc,
                          zones,
                          ocrBlocks,
                          textBlocks,
                          reconstructedHtml: '',
                          publicDownloadUrl: publicUrl,
                          createdAt: new Date().toISOString(),
                          updatedAt: new Date().toISOString()
                        };
                        const blob = await exportStudioPdf(studioDoc, { isSimple: true });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${matricule || 'document'}_pdf_simple.pdf`;
                        a.click();
                        URL.revokeObjectURL(url);
                        showToast("PDF Simple téléchargé.");
                      }}
                      disabled={!originalImageSrc}
                      className="min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <FileText className="w-3.5 h-3.5 text-amber-600" />
                      <span>PDF Simple</span>
                    </button>
                  </div>

                  {/* Bouton/Zone : "Lien Page Web pour Téléchargement PDF" */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#0B2545] flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-amber-600" />
                        <span>Lien Page Web pour Téléchargement PDF</span>
                      </span>
                      <a
                        href={publicUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-blue-600 hover:underline inline-flex items-center gap-0.5"
                      >
                        <span>Ouvrir</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        readOnly
                        value={publicUrl}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-[11px] text-slate-600"
                      />
                      <button
                        type="button"
                        onClick={handleCopyPublicUrl}
                        className="px-3 py-1.5 rounded-lg bg-[#0B2545] hover:bg-[#134074] text-white text-xs font-bold transition-colors shrink-0 cursor-pointer"
                        title="Copier le lien public"
                      >
                        {copiedPublicUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      Ce lien unique est automatiquement intégré au template e-mail pour permettre au destinataire de télécharger directement le document au format PDF.
                    </p>
                  </div>

                  {/* Bouton d'action : "TRANSFÉRER VERS LE WEBMAIL INFOMANIAK" */}
                  <button
                    type="button"
                    onClick={handleTransferToWebmail}
                    disabled={!originalImageSrc}
                    className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    <span>TRANSFÉRER VERS LE WEBMAIL INFOMANIAK</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ================================================================= */}
          {/* PANNEAU INFÉRIEUR : GESTION DES ZONES ET CONTENU TEXTE ÉDITABLE    */}
          {/* ================================================================= */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-4">
            
            {/* Onglets de sélection */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveBottomTab('zones')}
                  className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer ${
                    activeBottomTab === 'zones'
                      ? 'bg-[#0B2545] text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Layers className="w-4 h-4 text-amber-400" />
                  <span>Zones Découpées ({zones.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveBottomTab('texts')}
                  className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer ${
                    activeBottomTab === 'texts'
                      ? 'bg-[#0B2545] text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Type className="w-4 h-4 text-emerald-400" />
                  <span>Contenu Texte Éditable du Mail ({textBlocks.length})</span>
                </button>
              </div>

              <div className="bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl text-xs text-amber-900 font-semibold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                <span>RÈGLE SANS IA : Logos &amp; signatures au pixel exact + texte HTML modifiable</span>
              </div>
            </div>

            {/* TAB 1 : ZONES DÉCOUPÉES */}
            {activeBottomTab === 'zones' && (
              <div>
                {zones.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded-xl space-y-2">
                    <MousePointer className="w-8 h-8 text-slate-400 mx-auto" />
                    <h4 className="font-bold text-sm text-slate-700">Aucune zone découpée</h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      {originalImageSrc ? (
                        <span>
                          Tracez un rectangle avec votre souris sur le canvas pour découper un <strong>Logo</strong>, une <strong>Signature</strong> ou un <strong>Cachet officiel</strong>.
                        </span>
                      ) : (
                        <span>
                          Veuillez d'abord <strong>importer un document de référence</strong> pour pouvoir tracer des zones.
                        </span>
                      )}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {zones.map((zone) => {
                      const conf = ZONE_LABELS_CONFIG[zone.label] || ZONE_LABELS_CONFIG.autre;
                      const isSelected = zone.id === selectedZoneId;
                      const displayImage = zone.replacementDataUrl || zone.croppedImageDataUrl;

                      return (
                        <div
                          key={zone.id}
                          onClick={() => setSelectedZoneId(zone.id)}
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-3 ${
                            isSelected
                              ? 'border-[#0B2545] bg-blue-50/40 shadow-sm ring-1 ring-[#0B2545]'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span
                              style={{ backgroundColor: conf.bgColor, color: conf.color }}
                              className="px-2 py-0.5 rounded-md font-bold text-xs inline-flex items-center gap-1 border"
                            >
                              <span>{conf.icon}</span>
                              <span>{zone.name}</span>
                            </span>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setZones(zones.filter((z) => z.id !== zone.id));
                                if (selectedZoneId === zone.id) setSelectedZoneId(null);
                              }}
                              className="text-slate-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50"
                              title="Supprimer cette zone"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="h-20 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center p-1.5 relative">
                            {displayImage ? (
                              <img
                                src={displayImage}
                                alt={zone.name}
                                className="max-h-full max-w-full object-contain"
                              />
                            ) : (
                              <span className="text-[11px] text-slate-400 font-mono">Image extraite</span>
                            )}
                            <span className="absolute bottom-1 right-1 bg-slate-900/80 text-white font-mono text-[9px] px-1 rounded">
                              {zone.width} × {zone.height} px
                            </span>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Attribuer un Rôle :
                            </label>
                            <select
                              value={zone.label}
                              onChange={(e) => handleUpdateZoneLabel(zone.id, e.target.value as ZoneLabelType)}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white focus:border-[#0B2545] focus:outline-none"
                            >
                              {Object.entries(ZONE_LABELS_CONFIG).map(([k, v]) => (
                                <option key={k} value={k}>
                                  {v.icon} {v.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Option de Traitement :
                            </label>
                            <div className="grid grid-cols-3 gap-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUpdateZoneAction(zone.id, 'keep');
                                }}
                                className={`px-2 py-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                                  zone.action === 'keep'
                                    ? 'bg-emerald-600 text-white shadow-2xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                Afficher
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUpdateZoneAction(zone.id, 'hide');
                                }}
                                className={`px-2 py-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                                  zone.action === 'hide'
                                    ? 'bg-slate-800 text-white shadow-2xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                Masquer
                              </button>

                              <label
                                onClick={(e) => e.stopPropagation()}
                                className={`px-2 py-1.5 rounded-lg text-[11px] font-bold transition-colors text-center cursor-pointer ${
                                  zone.action === 'replace'
                                    ? 'bg-amber-500 text-slate-950 shadow-2xs font-extrabold'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                <span>Remplacer</span>
                                <input
                                  type="file"
                                  accept="image/png,image/jpeg,image/webp"
                                  onChange={(e) => handleReplaceZoneFile(zone.id, e)}
                                  className="hidden"
                                />
                              </label>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2 : CONTENU TEXTE ÉDITABLE DU MAIL */}
            {activeBottomTab === 'texts' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-600">
                    Ces textes sont injectés directement en <strong>vrai texte HTML natif</strong> dans votre template e-mail.
                    Chaque paragraphe est 100% éditable au clavier dans KitsCMS et le webmail Infomaniak.
                  </p>
                  <button
                    type="button"
                    onClick={handleAddTextBlock}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ajouter un paragraphe</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {textBlocks.map((block, idx) => (
                    <div
                      key={block.id}
                      className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                            #{idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggleHeading(block.id)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                              block.isHeading
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                            }`}
                          >
                            {block.isHeading ? 'Titre / En-tête (H2)' : 'Paragraphe Normal'}
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteTextBlock(block.id)}
                          className="text-slate-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50"
                          title="Supprimer ce paragraphe"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <textarea
                        value={block.text}
                        onChange={(e) => handleUpdateTextBlock(block.id, e.target.value)}
                        rows={block.isHeading ? 1 : 2}
                        className={`w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#0B2545] ${
                          block.isHeading ? 'font-bold text-slate-900' : ''
                        }`}
                        placeholder="Saisissez ou modifiez le contenu du paragraphe..."
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ================================================================= */}
        {/* PIED DU MODAL : ACTIONS RAPIDES & FERMETURE                       */}
        {/* ================================================================= */}
        <div className="bg-slate-100 border-t border-slate-200 p-4 px-6 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-[#0B2545]">
              Template : <strong>{docTitle || 'Document sans titre'}</strong>
            </span>
            <span>·</span>
            <span>Réf. : <strong className="font-mono text-amber-700">{matricule}</strong></span>
            {recipientName && (
              <>
                <span>·</span>
                <span>Destinataire : <strong>{recipientName}</strong></span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyKitsCmsHtml}
              disabled={!originalImageSrc}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm disabled:opacity-50"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copier Code KitsCMS</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white border border-slate-300 font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Fermer l'Atelier
            </button>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* SOUS-MODAL : HÉBERGEMENT DES IMAGES (KITSCMS)                      */}
      {/* =================================================================== */}
      {isHostingModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-base text-[#0B2545]">
                  Hébergement des Images (KitsCMS)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsHostingModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Pour une compatibilité optimale avec KitsCMS et les clients de messagerie (Outlook, Gmail),
              vous pouvez renseigner ci-dessous l'URL CDN publique hébergée pour chaque élément découpé.
              Si vous laissez vide, l'image est automatiquement intégrée en Base64 sécurisée.
            </p>

            <div className="max-h-64 overflow-y-auto space-y-3">
              {zones.map((z) => (
                <div key={z.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[#0B2545]">{z.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {z.width} × {z.height} px
                    </span>
                  </div>
                  <input
                    type="text"
                    placeholder="https://votre-site.com/uploads/image.png (ou KitsCMS CDN)"
                    value={z.kitsCmsImageUrl || ''}
                    onChange={(e) => {
                      const updated = zones.map((item) =>
                        item.id === z.id ? { ...item, kitsCmsImageUrl: e.target.value.trim() } : item
                      );
                      setZones(updated);
                    }}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-mono text-xs bg-white focus:border-[#0B2545] focus:outline-none"
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsHostingModalOpen(false);
                  showToast("URLs d'hébergement KitsCMS enregistrées pour vos zones.");
                }}
                className="px-4 py-2 rounded-xl bg-[#0B2545] hover:bg-[#134074] text-white font-bold text-xs cursor-pointer"
              >
                Valider les URLs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* SOUS-MODAL : EXPORT DU DOCUMENT (DOCX, PDF, HTML, JPG...)          */}
      {/* =================================================================== */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Download className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-base text-[#0B2545]">
                  Exporter le Document Multi-format
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Choisissez le format d'exportation souhaité pour archiver ou transmettre ce document :
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              {/* PDF Complet */}
              <button
                type="button"
                onClick={async () => {
                  showToast("Génération PDF complet en cours...", "info");
                  const studioDoc: StudioDocument = {
                    id: docId,
                    title: docTitle || 'Document',
                    matricule,
                    originalFileName,
                    originalFileType: 'image/png',
                    originalWidth: docDimensions.width,
                    originalHeight: docDimensions.height,
                    originalImageDataUrl: originalImageSrc,
                    cleanedBackgroundDataUrl: cleanedBackgroundSrc || originalImageSrc,
                    zones,
                    ocrBlocks,
                    textBlocks,
                    reconstructedHtml,
                    publicDownloadUrl: publicUrl,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                  };
                  const blob = await exportStudioPdf(studioDoc);
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${matricule || 'document'}_complet.pdf`;
                  a.click();
                  URL.revokeObjectURL(url);
                  setIsExportModalOpen(false);
                  showToast("PDF Complet téléchargé avec succès !");
                }}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-[#0B2545] bg-slate-50 hover:bg-blue-50/50 text-left transition-all cursor-pointer space-y-1"
              >
                <div className="font-bold text-xs text-[#0B2545] flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-red-600" />
                  <span>PDF Complet (Haute Déf.)</span>
                </div>
                <div className="text-[10px] text-slate-500">
                  Fond nettoyé + zones actives intégrées
                </div>
              </button>

              {/* DOCX Word */}
              <button
                type="button"
                onClick={() => {
                  const studioDoc: StudioDocument = {
                    id: docId,
                    title: docTitle || 'Document',
                    matricule,
                    recipientName,
                    recipientEmail,
                    originalFileName,
                    originalFileType: 'image/png',
                    originalWidth: docDimensions.width,
                    originalHeight: docDimensions.height,
                    originalImageDataUrl: originalImageSrc,
                    cleanedBackgroundDataUrl: cleanedBackgroundSrc || originalImageSrc,
                    zones,
                    ocrBlocks,
                    textBlocks,
                    reconstructedHtml,
                    publicDownloadUrl: publicUrl,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                  };
                  const blob = exportStudioDocx(studioDoc);
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${matricule || 'document'}.doc`;
                  a.click();
                  URL.revokeObjectURL(url);
                  setIsExportModalOpen(false);
                  showToast("Fichier DOCX Word téléchargé avec succès !");
                }}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-[#0B2545] bg-slate-50 hover:bg-blue-50/50 text-left transition-all cursor-pointer space-y-1"
              >
                <div className="font-bold text-xs text-[#0B2545] flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>Microsoft Word (DOCX)</span>
                </div>
                <div className="text-[10px] text-slate-500">
                  Format bureautique éditable
                </div>
              </button>

              {/* HTML Brut */}
              <button
                type="button"
                onClick={async () => {
                  const code = reconstructedHtml || (await generateEmailHtml(zones, textBlocks));
                  const blob = new Blob([code], { type: 'text/html' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${matricule || 'document'}.html`;
                  a.click();
                  URL.revokeObjectURL(url);
                  setIsExportModalOpen(false);
                  showToast("Fichier HTML Brut téléchargé !");
                }}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-[#0B2545] bg-slate-50 hover:bg-blue-50/50 text-left transition-all cursor-pointer space-y-1"
              >
                <div className="font-bold text-xs text-[#0B2545] flex items-center gap-1.5">
                  <FileCode className="w-4 h-4 text-emerald-600" />
                  <span>HTML Brut (Webmail)</span>
                </div>
                <div className="text-[10px] text-slate-500">
                  Code source complet responsive
                </div>
              </button>

              {/* JPG / PNG Image */}
              <button
                type="button"
                onClick={async () => {
                  const studioDoc: StudioDocument = {
                    id: docId,
                    title: docTitle || 'Document',
                    matricule,
                    originalFileName,
                    originalFileType: 'image/png',
                    originalWidth: docDimensions.width,
                    originalHeight: docDimensions.height,
                    originalImageDataUrl: originalImageSrc,
                    cleanedBackgroundDataUrl: cleanedBackgroundSrc || originalImageSrc,
                    zones,
                    ocrBlocks,
                    textBlocks,
                    reconstructedHtml,
                    publicDownloadUrl: publicUrl,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                  };
                  const dataUrl = await exportStudioImage(studioDoc, 'png');
                  const a = document.createElement('a');
                  a.href = dataUrl;
                  a.download = `${matricule || 'document'}_rendu.png`;
                  a.click();
                  setIsExportModalOpen(false);
                  showToast("Image PNG haute résolution téléchargée !");
                }}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-[#0B2545] bg-slate-50 hover:bg-blue-50/50 text-left transition-all cursor-pointer space-y-1"
              >
                <div className="font-bold text-xs text-[#0B2545] flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-amber-600" />
                  <span>Image PNG (300 DPI)</span>
                </div>
                <div className="text-[10px] text-slate-500">
                  Capture visuelle fidèle
                </div>
              </button>
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs hover:bg-slate-200 cursor-pointer"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL FONCTION HTML RAST : REPRODUCTION FIDÈLE DU DOCUMENT         */}
      {/* =================================================================== */}
      <HtmlRastModal
        isOpen={isHtmlRastModalOpen}
        onClose={() => setIsHtmlRastModalOpen(false)}
        inputData={{
          documentTitle: docTitle || 'Document Officiel',
          originalFileName,
          originalImageDataUrl: originalImageSrc,
          cleanedBackgroundDataUrl: cleanedBackgroundSrc,
          publicDownloadUrl: publicUrl,
          zones,
          textBlocks,
          recipientName,
          recipientEmail,
          referenceNumber: matricule
        }}
        onOpenInWebmail={onOpenInWebmail}
      />
    </div>
  );
};
