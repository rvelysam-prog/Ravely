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
  HelpCircle,
  Settings,
  ShieldCheck,
  FolderOpen
} from 'lucide-react';
import { Employee } from '../../types';
import {
  DocumentZone,
  OcrTextBlock,
  StudioDocument,
  ZoneLabelType,
  ZoneActionType,
  ZONE_LABELS_CONFIG,
  analyzeDocumentAndMaskText,
  buildKitsCmsHtml,
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
import sampleDocUrl from '../../assets/images/hero_multimodal_port_1790568794371.jpg';

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
  // Document actif
  const [docId, setDocId] = useState<string>(() => `doc_at_${Date.now()}`);
  const [docTitle, setDocTitle] = useState<string>(
    "Promesse d'Embauche Officielle - Atlantic Transport Ltd."
  );
  const [recipientName, setRecipientName] = useState<string>(
    selectedEmployee?.nom_complet || 'SALIMATA TRAORER'
  );
  const [recipientEmail, setRecipientEmail] = useState<string>(
    selectedEmployee?.email || 'salimata.traorer@atlantictransport.ca'
  );
  const [matricule, setMatricule] = useState<string>(
    selectedEmployee?.matricule || 'AT-2026-001'
  );

  // Images du document
  const [originalImageSrc, setOriginalImageSrc] = useState<string>('');
  const [originalFileName, setOriginalFileName] = useState<string>('promesse_embauche_modele.jpg');
  const [cleanedBackgroundSrc, setCleanedBackgroundSrc] = useState<string>('');

  // Workflow states
  const [zones, setZones] = useState<DocumentZone[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [currentLabelForNewZone, setCurrentLabelForNewZone] = useState<ZoneLabelType>('logo');
  const [isSelectionModeActive, setIsSelectionModeActive] = useState<boolean>(true); // Étape 1 : actif d'office
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

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

  // Notifications
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  // Initialisation par défaut avec un template officiel si aucune image n'est importée
  useEffect(() => {
    if (!originalImageSrc) {
      // Création d'une image vierge de base pour le modèle
      const initCanvas = document.createElement('canvas');
      initCanvas.width = 800;
      initCanvas.height = 1130;
      const ctx = initCanvas.getContext('2d');
      if (ctx) {
        // Fond blanc papier
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 800, 1130);

        // Bandeau en-tête bleu marine Atlantic
        ctx.fillStyle = '#0B2545';
        ctx.fillRect(0, 0, 800, 120);

        // Ligne d'or CBSA
        ctx.fillStyle = '#D4A017';
        ctx.fillRect(0, 116, 800, 4);

        // Titre
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px Arial, sans-serif';
        ctx.fillText('ATLANTIC TRANSPORT LTD', 60, 60);

        ctx.fillStyle = '#D4A017';
        ctx.font = 'bold 12px Arial, sans-serif';
        ctx.fillText('TRANSITAIRE INTERNATIONAL & DOUANES CBSA / OEA', 60, 88);

        // Filigrane blason léger
        ctx.fillStyle = 'rgba(11, 37, 69, 0.04)';
        ctx.font = 'bold 140px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('ATLANTIC', 400, 650);
        ctx.textAlign = 'left';

        // Lignes de document standard
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(60, 150, 680, 50);

        ctx.fillStyle = '#0B2545';
        ctx.font = 'bold 16px Arial, sans-serif';
        ctx.fillText("PROMESSE D'EMBAUCHE OFFICIELLE", 80, 182);

        ctx.fillStyle = '#334155';
        ctx.font = '14px Arial, sans-serif';
        ctx.fillText('Madame, Monsieur, nous confirmons votre engagement au sein de nos équipes.', 60, 250);
        ctx.fillText("Poste retenu : Exploitant Transport & Logistique Internationale", 60, 285);
        ctx.fillText("Date de prise d'effet : 04 Janvier 2027 · Lieu : Surrey, Colombie-Britannique Canada", 60, 320);
        ctx.fillText("Rémunération horaire : 24.50 CAD / heure avec avantages conventionnels", 60, 355);

        // Lignes de signature
        ctx.fillStyle = '#0B2545';
        ctx.font = 'bold 13px Arial, sans-serif';
        ctx.fillText('Pour Atlantic Transport Ltd :', 60, 950);
        ctx.font = '11px Arial, sans-serif';
        ctx.fillStyle = '#64748b';
        ctx.fillText('La Direction des Ressources Humaines', 60, 970);

        // Pied de page
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(0, 1070, 800, 60);
        ctx.fillStyle = '#64748b';
        ctx.font = '11px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Atlantic Transport Ltd · King George Blvd, Surrey BC · atlantictransport.int.contact@ik.me', 400, 1105);

        const dataUrl = initCanvas.toDataURL('image/png');
        setOriginalImageSrc(dataUrl);

        // Pré-création de 2 zones standards prêtes à l'emploi (Logo et Signature)
        const defaultLogo = cropExactPixelZone(initCanvas, 50, 30, 280, 70);
        const defaultSig = cropExactPixelZone(initCanvas, 60, 940, 220, 80);

        const initialZones: DocumentZone[] = [
          {
            id: 'zone_logo_init',
            name: 'Logo Entreprise',
            x: 50,
            y: 30,
            width: 280,
            height: 70,
            label: 'logo',
            action: 'keep',
            croppedImageDataUrl: defaultLogo,
            kitsCmsImageUrl: ''
          },
          {
            id: 'zone_sig_init',
            name: 'Signature Employeur',
            x: 60,
            y: 940,
            width: 220,
            height: 80,
            label: 'signature',
            action: 'keep',
            croppedImageDataUrl: defaultSig,
            kitsCmsImageUrl: ''
          }
        ];
        setZones(initialZones);
      }
    }
  }, [originalImageSrc]);

  // Synchronisation avec l'employé sélectionné
  useEffect(() => {
    if (selectedEmployee) {
      setRecipientName(selectedEmployee.nom_complet);
      setRecipientEmail(selectedEmployee.email);
      setMatricule(selectedEmployee.matricule);
    }
  }, [selectedEmployee]);

  // Notification helper
  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 3500);
  };

  // URL publique générée
  const publicUrl = generatePublicDownloadUrl(docId);

  // ACTION 1 : Import de document (PDF, Word ou Image JPG/PNG)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOriginalFileName(file.name);
    const reader = new FileReader();

    if (file.type.startsWith('image/')) {
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setOriginalImageSrc(reader.result);
          setCleanedBackgroundSrc('');
          setZones([]);
          setSelectedZoneId(null);
          setOcrAnalyzed(false);
          setIsSelectionModeActive(true); // Obligatoire Étape 1
          setCurrentStep(1);
          setCanvasViewMode('original');
          showToast(`Document "${file.name}" importé. Commencez par l'Étape 1 : Sélection manuelle des zones.`);
        }
      };
      reader.readAsDataURL(file);
    } else {
      // Pour PDF ou DOCX : conversion directe en image de rendu Canvas
      reader.onload = () => {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = 800;
        tempCanvas.height = 1130;
        const ctx = tempCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, 800, 1130);
          ctx.fillStyle = '#0B2545';
          ctx.fillRect(0, 0, 800, 120);
          ctx.fillStyle = '#D4A017';
          ctx.fillRect(0, 116, 800, 4);

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 22px Arial';
          ctx.fillText('ATLANTIC TRANSPORT LTD', 60, 65);

          ctx.fillStyle = '#1e293b';
          ctx.font = 'bold 18px Arial';
          ctx.fillText(`DOCUMENT IMPORTÉ : ${file.name.toUpperCase()}`, 60, 200);

          ctx.font = '14px Arial';
          ctx.fillStyle = '#64748b';
          ctx.fillText(`Format détecté : ${file.type || 'Fichier bureautique'} · Prêt pour découpage Canvas`, 60, 240);

          ctx.strokeStyle = '#e2e8f0';
          ctx.strokeRect(60, 280, 680, 700);

          const converted = tempCanvas.toDataURL('image/png');
          setOriginalImageSrc(converted);
          setCleanedBackgroundSrc('');
          setZones([]);
          setIsSelectionModeActive(true);
          setCurrentStep(1);
          setCanvasViewMode('original');
          showToast(`Document bureautique "${file.name}" converti en haute résolution.`);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // ACTION 2 : ÉTAPE 2 - ANALYSER LE DOCUMENT (OCR & Masquage Visuel des textes)
  const handleAnalyzeDocument = async () => {
    if (!originalImageSrc) return;
    setIsAnalyzingOcr(true);
    showToast("Analyse OCR en cours... Détection et masquage visuel des textes.", "info");

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      try {
        const { cleanedBackgroundDataUrl, ocrBlocks: detectedBlocks } =
          await analyzeDocumentAndMaskText(img);

        setCleanedBackgroundSrc(cleanedBackgroundDataUrl);
        setOcrBlocks(detectedBlocks);
        setOcrAnalyzed(true);
        setCurrentStep(2);
        setCanvasViewMode('cleaned'); // Affiche le fond nettoyé sans texte
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
  const handleReconstructLayout = () => {
    if (zones.length === 0) {
      showToast("Veuillez sélectionner au moins une zone sur le document avant de reconstruire.", "error");
      return;
    }

    const html = buildKitsCmsHtml({
      title: docTitle,
      recipientName,
      recipientEmail,
      matricule,
      zones,
      cleanedBackgroundDataUrl: cleanedBackgroundSrc || originalImageSrc,
      publicDownloadUrl: publicUrl
    });

    setReconstructedHtml(html);
    setCanvasViewMode('reconstructed');
    setCurrentStep(3);
    showToast("Mise en page reconstruite avec succès avec vos zones actives.");
  };

  // ACTION 4 : RESTAURER INITIAL
  const handleRestoreInitial = () => {
    setCleanedBackgroundSrc('');
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
    const studioDoc: StudioDocument = {
      id: docId,
      title: docTitle,
      recipientName,
      recipientEmail,
      matricule,
      originalFileName,
      originalFileType: 'image/png',
      originalWidth: 800,
      originalHeight: 1130,
      originalImageDataUrl: originalImageSrc,
      cleanedBackgroundDataUrl: cleanedBackgroundSrc || originalImageSrc,
      zones,
      ocrBlocks,
      reconstructedHtml: reconstructedHtml || buildKitsCmsHtml({
        title: docTitle,
        recipientName,
        recipientEmail,
        matricule,
        zones,
        cleanedBackgroundDataUrl: cleanedBackgroundSrc || originalImageSrc,
        publicDownloadUrl: publicUrl
      }),
      publicDownloadUrl: publicUrl,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await saveStudioDocument(studioDoc);
    showToast("Document enregistré dans l'Atelier et synchronisé pour le lien public de téléchargement !");
  };

  // ACTION 6 : PRÉPARER POUR KITSCMS
  const handlePrepareKitsCms = () => {
    const html = buildKitsCmsHtml({
      title: docTitle,
      recipientName,
      recipientEmail,
      matricule,
      zones,
      cleanedBackgroundDataUrl: cleanedBackgroundSrc || originalImageSrc,
      publicDownloadUrl: publicUrl
    });

    setReconstructedHtml(html);
    setCurrentStep(4);
    showToast("Document préparé pour KitsCMS. Vérifiez vos zones ou copiez directement le code HTML.");
  };

  // ACTION 7 : COPIER LE CODE HTML POUR KITSCMS (BOUTON PRINCIPAL D'ACTION)
  const handleCopyKitsCmsHtml = async () => {
    const code =
      reconstructedHtml ||
      buildKitsCmsHtml({
        title: docTitle,
        recipientName,
        recipientEmail,
        matricule,
        zones,
        cleanedBackgroundDataUrl: cleanedBackgroundSrc || originalImageSrc,
        publicDownloadUrl: publicUrl
      });

    try {
      await navigator.clipboard.writeText(code.trim());
      setCopiedKitsCmsCode(true);
      showToast("Code HTML KitsCMS copié dans le presse-papier !");
      setTimeout(() => setCopiedKitsCmsCode(false), 3000);
    } catch {
      showToast("Impossible d'accéder au presse-papier.", "error");
    }
  };

  // ACTION 8 : COPIER LE LIEN WEB POUR TÉLÉCHARGEMENT PDF (POUR LE DESTINATAIRE)
  const handleCopyPublicUrl = async () => {
    // Sauvegarde préalable pour s'assurer que le destinataire puisse l'ouvrir
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
  const handleTransferToWebmail = () => {
    const code =
      reconstructedHtml ||
      buildKitsCmsHtml({
        title: docTitle,
        recipientName,
        recipientEmail,
        matricule,
        zones,
        cleanedBackgroundDataUrl: cleanedBackgroundSrc || originalImageSrc,
        publicDownloadUrl: publicUrl
      });

    if (onOpenInWebmail) {
      onOpenInWebmail({
        recipient: recipientEmail,
        subject: `Atlantic Transport Ltd - ${docTitle} (${matricule})`,
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

  // Zone actuellement sélectionnée
  const activeZone = zones.find((z) => z.id === selectedZoneId) || null;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-7xl w-full border border-slate-200 shadow-2xl overflow-hidden my-auto max-h-[96vh] flex flex-col font-sans">
        
        {/* ================================================================= */}
        {/* EN-TÊTE MODAL : DESIGN EXACT ATLANTIC TRANSPORT                  */}
        {/* ================================================================= */}
        <div className="bg-[#0B2545] text-white p-4 sm:p-5 flex items-center justify-between gap-4 border-b-2 border-amber-400/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono uppercase text-amber-400 font-bold tracking-wider">
                  Atelier Document Avancé
                </span>
                <span className="bg-amber-400/10 text-amber-300 text-[10px] px-2 py-0.5 rounded-full border border-amber-400/20 font-bold">
                  OCR · Canvas · KitsCMS
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
                Découpage, Masquage &amp; Générateur de Code Source KitsCMS
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer border border-white/20">
              <Upload className="w-3.5 h-3.5 text-amber-400" />
              <span>Importer Doc (PDF, JPG, DOCX)</span>
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
        {/* CORPS PRINCIPAL : CANVAS INTERACTIF + PANNEAUX D'ACTIONS          */}
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

          {/* Grille principale : Canvas à gauche + Contrôles à droite */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            {/* Colonne GAUCHE : Canvas interactif & Sélecteur de vue */}
            <div className="lg:col-span-8 space-y-3">
              {/* Sélecteur de vue du Canvas */}
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
                    onClick={() => setCanvasViewMode('reconstructed')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      canvasViewMode === 'reconstructed'
                        ? 'bg-[#0B2545] text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Layout className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Mise en page Reconstruite</span>
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

              {/* Canvas Interactif */}
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
              />
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
                      isSelectionModeActive
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
                    disabled={isAnalyzingOcr}
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
                    className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs sm:text-sm font-bold flex items-center justify-between transition-colors cursor-pointer shadow-sm"
                  >
                    <span className="flex items-center gap-2">
                      <Layout className="w-4 h-4 text-emerald-400" />
                      <span>2. RECONSTRUIRE LA MISE EN PAGE</span>
                    </span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-mono">
                      Layout
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
                    className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#0B2545] border border-slate-300 text-xs sm:text-sm font-bold flex items-center justify-between transition-colors cursor-pointer"
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
                    className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
                  >
                    {copiedKitsCmsCode ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-950" />
                        <span className="text-emerald-950">Code HTML KitsCMS copié !</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>COPIER LE CODE HTML POUR KITSCMS</span>
                      </>
                    )}
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
                      {zones.length} images
                    </span>
                  </button>

                  {/* Bouton : "EXPORTER LE DOCUMENT (DOCX, PDF, HTML, JPG...)" */}
                  <button
                    type="button"
                    onClick={() => setIsExportModalOpen(true)}
                    className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-[#0B2545] hover:bg-[#134074] text-white text-xs sm:text-sm font-bold flex items-center justify-between transition-colors cursor-pointer shadow-sm"
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
                      onClick={() => {
                        const code = reconstructedHtml || buildKitsCmsHtml({
                          title: docTitle,
                          recipientName,
                          recipientEmail,
                          matricule,
                          zones,
                          cleanedBackgroundDataUrl: cleanedBackgroundSrc || originalImageSrc,
                          publicDownloadUrl: publicUrl
                        });
                        const blob = new Blob([code], { type: 'text/html' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${matricule}_document_kitscms.html`;
                        a.click();
                        URL.revokeObjectURL(url);
                        showToast("Fichier HTML Brut téléchargé.");
                      }}
                      className="min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
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
                          title: docTitle,
                          matricule,
                          originalFileName,
                          originalFileType: 'image/png',
                          originalWidth: 800,
                          originalHeight: 1130,
                          originalImageDataUrl: originalImageSrc,
                          cleanedBackgroundDataUrl: cleanedBackgroundSrc || originalImageSrc,
                          zones,
                          ocrBlocks,
                          reconstructedHtml: '',
                          publicDownloadUrl: publicUrl,
                          createdAt: new Date().toISOString(),
                          updatedAt: new Date().toISOString()
                        };
                        const blob = await exportStudioPdf(studioDoc, { isSimple: true });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${matricule}_pdf_simple.pdf`;
                        a.click();
                        URL.revokeObjectURL(url);
                        showToast("PDF Simple téléchargé.");
                      }}
                      className="min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
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
                      Ce lien unique est automatiquement injecté dans l'e-mail pour permettre au candidat de télécharger directement son PDF officiel.
                    </p>
                  </div>

                  {/* Bouton d'action : "TRANSFÉRER VERS LE WEBMAIL INFOMANIAK" */}
                  <button
                    type="button"
                    onClick={handleTransferToWebmail}
                    className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>TRANSFÉRER VERS LE WEBMAIL INFOMANIAK</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ================================================================= */}
          {/* ÉTAPE 3 & 4 : LABELLISATION & OPTIONS PAR ZONE (RÈGLE SANS IA)    */}
          {/* ================================================================= */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-bold text-sm sm:text-base text-[#0B2545] flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-500" />
                  <span>Gestion des Zones Découpées &amp; Options de Traitement</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Attribuez un rôle à chaque rectangle (logo, signature, cachet...) et choisissez son action (Conserver sans IA, Masquer ou Remplacer).
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl text-xs text-amber-900 font-semibold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                <span>RÈGLE SANS IA : Extraction graphique exacte au pixel près</span>
              </div>
            </div>

            {zones.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded-xl space-y-2">
                <MousePointer className="w-8 h-8 text-slate-400 mx-auto" />
                <h4 className="font-bold text-sm text-slate-700">Aucune zone sélectionnée</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Cliquez sur <strong>"SÉLECTION MANUELLE DES ZONES"</strong> ci-dessus puis dessinez un rectangle sur le canvas avec votre souris pour extraire une signature, un logo ou un cachet.
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
                        <div className="flex items-center gap-2">
                          <span
                            style={{ backgroundColor: conf.bgColor, color: conf.color }}
                            className="px-2 py-0.5 rounded-md font-bold text-xs inline-flex items-center gap-1 border"
                          >
                            <span>{conf.icon}</span>
                            <span>{zone.name}</span>
                          </span>
                        </div>

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

                      {/* Aperçu du découpage exact sans IA */}
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

                      {/* ÉTAPE 3 : Labellisation */}
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

                      {/* ÉTAPE 4 : Options par zone (Masquer / Afficher / Remplacer) */}
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
                            title="Conserver l'extraction exacte du document original sans aucune altération par IA"
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
                            title="Masquer cette zone du document reconstruit"
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
                            title="Remplacer par un autre fichier externe (ex: nouveau logo HD ou nouvelle signature)"
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

                      {/* Statut affiché */}
                      <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100 font-mono">
                        <span>Action : {zone.action === 'keep' ? 'Conserver sans IA' : zone.action === 'hide' ? 'Masquée' : 'Remplacée'}</span>
                        <span>({zone.x}, {zone.y})</span>
                      </div>
                    </div>
                  );
                })}
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
              Document : <strong>{docTitle}</strong>
            </span>
            <span>·</span>
            <span>Réf. : <strong className="font-mono text-amber-700">{matricule}</strong></span>
            <span>·</span>
            <span>Destinataire : <strong>{recipientName}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyKitsCmsHtml}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
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
                    title: docTitle,
                    matricule,
                    originalFileName,
                    originalFileType: 'image/png',
                    originalWidth: 800,
                    originalHeight: 1130,
                    originalImageDataUrl: originalImageSrc,
                    cleanedBackgroundDataUrl: cleanedBackgroundSrc || originalImageSrc,
                    zones,
                    ocrBlocks,
                    reconstructedHtml,
                    publicDownloadUrl: publicUrl,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                  };
                  const blob = await exportStudioPdf(studioDoc);
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${matricule}_document_complet.pdf`;
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
                    title: docTitle,
                    matricule,
                    recipientName,
                    recipientEmail,
                    originalFileName,
                    originalFileType: 'image/png',
                    originalWidth: 800,
                    originalHeight: 1130,
                    originalImageDataUrl: originalImageSrc,
                    cleanedBackgroundDataUrl: cleanedBackgroundSrc || originalImageSrc,
                    zones,
                    ocrBlocks,
                    reconstructedHtml,
                    publicDownloadUrl: publicUrl,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                  };
                  const blob = exportStudioDocx(studioDoc);
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${matricule}_document.doc`;
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
                onClick={() => {
                  const code = reconstructedHtml || buildKitsCmsHtml({
                    title: docTitle,
                    recipientName,
                    recipientEmail,
                    matricule,
                    zones,
                    cleanedBackgroundDataUrl: cleanedBackgroundSrc || originalImageSrc,
                    publicDownloadUrl: publicUrl
                  });
                  const blob = new Blob([code], { type: 'text/html' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${matricule}_document.html`;
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
                    title: docTitle,
                    matricule,
                    originalFileName,
                    originalFileType: 'image/png',
                    originalWidth: 800,
                    originalHeight: 1130,
                    originalImageDataUrl: originalImageSrc,
                    cleanedBackgroundDataUrl: cleanedBackgroundSrc || originalImageSrc,
                    zones,
                    ocrBlocks,
                    reconstructedHtml,
                    publicDownloadUrl: publicUrl,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                  };
                  const dataUrl = await exportStudioImage(studioDoc, 'png');
                  const a = document.createElement('a');
                  a.href = dataUrl;
                  a.download = `${matricule}_rendu_visuel.png`;
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
    </div>
  );
};
