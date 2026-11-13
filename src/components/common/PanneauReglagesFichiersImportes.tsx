import React, { useState } from 'react';
import {
  Sliders,
  RotateCcw,
  Save,
  Upload,
  Image as ImageIcon,
  Layers,
  Palette,
  Move,
  Maximize2,
  Check,
  Eye,
  Building2,
  Briefcase,
  Sparkles,
  Home,
  Scale,
  ClipboardCheck,
  ScrollText,
  QrCode,
  Barcode,
  Trash2,
  AlertCircle
} from 'lucide-react';
import QRCode from 'qrcode';
import {
  PdfImportedAssetsConfig,
  PdfAssetItemSettings,
  DEFAULT_PDF_ASSETS_CONFIG,
  savePdfAssetsConfigToFirestore,
  saveActorUploadedAssetsToFirestore,
  ActorScopeId,
  ImportedAssetKey,
  UploadedAssetUrlsMap
} from '../../services/departmentsAndEmailService';
import {
  removeImageBackground,
  readAndOptimizeImageFile
} from '../../services/imageTransparencyService';
import { generateSmallStackedBarcodeCanvasDataUrl } from '../../services/contractGenerationService';

export type AssetTabKey = ImportedAssetKey;

interface PanneauReglagesFichiersImportesProps {
  assetsConfig?: PdfImportedAssetsConfig;
  initialConfig?: PdfImportedAssetsConfig;
  onChangeConfig?: (newConfig: PdfImportedAssetsConfig) => void;
  onConfigChange?: (newConfig: PdfImportedAssetsConfig) => void;
  onUploadAsset?: (key: AssetTabKey, dataUrl: string, filename: string) => void;
  uploadedAssetUrls?: UploadedAssetUrlsMap;
  title?: string;
  moduleTitle?: string;
  verificationCodeRef?: string;
}

interface SubTabDef {
  key: AssetTabKey;
  label: string;
  helper: string;
  isAuthTool?: 'barcode' | 'qrcode';
}

const SCOPE_TABS: {
  id: ActorScopeId;
  shortLabel: string;
  bindingHint: string;
  icon: React.ComponentType<{ className?: string }>;
  tabs: SubTabDef[];
}[] = [
  {
    id: 'employeur',
    shortLabel: '1. Entreprise Employeur',
    bindingHint: 'Appliqué au Kit Candidat, Promesse, Ticket, Offre, Modèles & Contrat (Onglets 1 à 7)',
    icon: Building2,
    tabs: [
      { key: 'logo', label: 'Logo Officiel', helper: 'En-tête des documents' },
      { key: 'signature', label: 'Signature Employeur', helper: 'Zone des paraphes' },
      { key: 'cachet', label: 'Cachet / Sceau', helper: 'Tampon officiel' },
      { key: 'filigrane', label: 'Filigrane', helper: 'Blason en transparence' },
      { key: 'arrierePlan', label: 'Arrière-Plan', helper: 'Fond de page A4' },
      { key: 'barcodeEmployeur', label: 'Code-Barres', helper: 'Authentification', isAuthTool: 'barcode' },
      { key: 'qrcodeEmployeur', label: 'QR Code', helper: 'Vérification rapide', isAuthTool: 'qrcode' }
    ]
  },
  {
    id: 'prestataire',
    shortLabel: '2. Cabinet CRIC',
    bindingHint: 'Appliqué au Contrat de Prestation & Dossier Agence (Onglet 2 & Cas 2)',
    icon: Briefcase,
    tabs: [
      { key: 'logoPrestataire', label: 'Logo Cabinet', helper: 'En-tête mandataire' },
      { key: 'signaturePrestataire', label: 'Signature Mandataire', helper: 'Signataire CRIC' },
      { key: 'cachetPrestataire', label: 'Cachet / Sceau CRIC', helper: 'Tampon du cabinet' },
      { key: 'filigranePrestataire', label: 'Filigrane', helper: 'Blason mandataire' },
      { key: 'arrierePlanPrestataire', label: 'Arrière-Plan', helper: 'Fond de page' },
      { key: 'barcodePrestataire', label: 'Code-Barres', helper: 'Référence CRIC', isAuthTool: 'barcode' },
      { key: 'qrcodePrestataire', label: 'QR Code', helper: 'Vérification CRIC', isAuthTool: 'qrcode' }
    ]
  },
  {
    id: 'hebEmployeur',
    shortLabel: '3. Hébergement (Onglet 9)',
    bindingHint: "Liaison exclusive : Onglet 9 (Attestation officielle de prise en charge de l'hébergement)",
    icon: Home,
    tabs: [
      { key: 'hebEmployeur_logo', label: 'Logo Officiel', helper: 'En-tête Onglet 9' },
      { key: 'hebEmployeur_signature', label: 'Signature', helper: 'Représentant hébergement' },
      { key: 'hebEmployeur_cachet', label: 'Cachet / Sceau', helper: 'Tampon employeur' },
      { key: 'hebEmployeur_filigrane', label: 'Filigrane', helper: 'Blason de fond' },
      { key: 'hebEmployeur_arrierePlan', label: 'Arrière-Plan', helper: 'Fond de page' },
      { key: 'hebEmployeur_barcode', label: 'Code-Barres', helper: 'Auth Onglet 9', isAuthTool: 'barcode' },
      { key: 'hebEmployeur_qrcode', label: 'QR Code', helper: 'Vérification Onglet 9', isAuthTool: 'qrcode' }
    ]
  },
  {
    id: 'notaire',
    shortLabel: '4. Notaire BC (Onglet 10)',
    bindingHint: "Liaison exclusive : Onglet 10 (Certificat d'authentification notariale)",
    icon: Scale,
    tabs: [
      { key: 'notaire_logo', label: 'Logo Étude', helper: 'En-tête notarial' },
      { key: 'notaire_signature', label: 'Signature Notaire', helper: 'Signature Notaire Public' },
      { key: 'notaire_cachet', label: 'Sceau Notarial', helper: 'Sceau officiel BC' },
      { key: 'notaire_filigrane', label: 'Filigrane Notarial', helper: 'Watermark' },
      { key: 'notaire_arrierePlan', label: 'Arrière-Plan', helper: 'Fond de page' },
      { key: 'notaire_barcode', label: 'Code-Barres', helper: 'Dossier notarial', isAuthTool: 'barcode' },
      { key: 'notaire_qrcode', label: 'QR Code', helper: 'Vérification notaire', isAuthTool: 'qrcode' }
    ]
  },
  {
    id: 'inspecteurHir',
    shortLabel: '5. Inspecteur HIR (Onglet 11)',
    bindingHint: "Liaison exclusive : Onglet 11 (Rapport officiel d'inspection du logement HIR)",
    icon: ClipboardCheck,
    tabs: [
      { key: 'inspecteurHir_logo', label: 'Logo Organisme', helper: 'En-tête BCAC / HIR' },
      { key: 'inspecteurHir_signature', label: 'Signature Inspecteur', helper: 'Inspecteur agréé' },
      { key: 'inspecteurHir_cachet', label: 'Tampon HIR', helper: 'Visa conformité' },
      { key: 'inspecteurHir_filigrane', label: 'Filigrane', helper: 'Watermark HIR' },
      { key: 'inspecteurHir_arrierePlan', label: 'Arrière-Plan', helper: 'Fond de page' },
      { key: 'inspecteurHir_barcode', label: 'Code-Barres', helper: 'N° Inspection HIR', isAuthTool: 'barcode' },
      { key: 'inspecteurHir_qrcode', label: 'QR Code', helper: 'Vérification HIR', isAuthTool: 'qrcode' }
    ]
  },
  {
    id: 'commissaireDeclaration',
    shortLabel: '6. Déclaration (Onglet 12)',
    bindingHint: 'Liaison exclusive : Onglet 12 (Déclaration solennelle / CER-CLT)',
    icon: ScrollText,
    tabs: [
      { key: 'commissaireDeclaration_logo', label: 'Logo Autorité', helper: 'En-tête Onglet 12' },
      { key: 'commissaireDeclaration_signature', label: 'Signature Autorité', helper: 'Assermentation' },
      { key: 'commissaireDeclaration_cachet', label: 'Sceau Officiel', helper: 'Tampon Affidavit' },
      { key: 'commissaireDeclaration_filigrane', label: 'Filigrane', helper: 'Watermark solennel' },
      { key: 'commissaireDeclaration_arrierePlan', label: 'Arrière-Plan', helper: 'Fond de page' },
      { key: 'commissaireDeclaration_barcode', label: 'Code-Barres', helper: 'Auth Affidavit', isAuthTool: 'barcode' },
      { key: 'commissaireDeclaration_qrcode', label: 'QR Code', helper: 'Vérification CER-CLT', isAuthTool: 'qrcode' }
    ]
  }
];

export const PanneauReglagesFichiersImportes: React.FC<PanneauReglagesFichiersImportesProps> = ({
  assetsConfig: propAssetsConfig,
  initialConfig,
  onChangeConfig,
  onConfigChange,
  onUploadAsset,
  uploadedAssetUrls = {},
  title,
  moduleTitle,
  verificationCodeRef = 'ENT-BC-2026-AUTH'
}) => {
  const effectiveConfig = propAssetsConfig || initialConfig || DEFAULT_PDF_ASSETS_CONFIG;
  const notifyChange = onChangeConfig || onConfigChange || (() => {});
  const displayTitle = title || moduleTitle || 'Visuels, Tampons & Signatures des 6 Parties';

  const [activeScope, setActiveScope] = useState<ActorScopeId>('employeur');
  const [activeTab, setActiveTab] = useState<AssetTabKey>('logo');
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [localFallbackUrls, setLocalFallbackUrls] = useState<UploadedAssetUrlsMap>({});

  const mergedUrls: UploadedAssetUrlsMap = { ...localFallbackUrls, ...uploadedAssetUrls };
  const currentScopeDef = SCOPE_TABS.find((s) => s.id === activeScope) || SCOPE_TABS[0];
  const currentTabs = currentScopeDef.tabs;
  const activeSubTabDef = currentTabs.find((t) => t.key === activeTab) || currentTabs[0];

  const currentCfg: PdfAssetItemSettings =
    effectiveConfig[activeTab] ||
    DEFAULT_PDF_ASSETS_CONFIG[activeTab] || {
      widthValue: 160,
      widthUnit: 'px',
      heightValue: 64,
      heightUnit: 'px',
      opacity: 100,
      tintEnabled: false,
      tintColor: '#0B2545',
      offsetX: 0,
      offsetY: 0,
      alignX: 'center',
      alignY: 'middle',
      rotation: 0,
      zIndex: 10
    };

  const showFeedback = (text: string, type: 'ok' | 'err' = 'ok') => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  const commitUploadedAsset = (key: AssetTabKey, dataUrl: string, filename: string) => {
    setLocalFallbackUrls((prev) => ({ ...prev, [key]: dataUrl }));
    if (onUploadAsset) {
      onUploadAsset(key, dataUrl, filename);
    }
  };

  const updateSetting = <K extends keyof PdfAssetItemSettings>(
    field: K,
    val: PdfAssetItemSettings[K]
  ) => {
    const updatedItem = { ...currentCfg, [field]: val };
    const next: PdfImportedAssetsConfig = {
      ...effectiveConfig,
      [activeTab]: updatedItem,
      updated_at: new Date().toISOString()
    };
    notifyChange(next);
  };

  const handleResetSingle = () => {
    const defaultItem = DEFAULT_PDF_ASSETS_CONFIG[activeTab] || currentCfg;
    const next: PdfImportedAssetsConfig = {
      ...effectiveConfig,
      [activeTab]: defaultItem,
      updated_at: new Date().toISOString()
    };
    notifyChange(next);
    showFeedback(`Réglages de « ${activeSubTabDef.label} » réinitialisés.`);
  };

  const handleResetAll = () => {
    notifyChange({ ...DEFAULT_PDF_ASSETS_CONFIG, updated_at: new Date().toISOString() });
    showFeedback('Tous les réglages ont été remis aux valeurs d’origine.');
  };

  const handleSaveFirestore = async () => {
    setIsSaving(true);
    try {
      await Promise.all([
        savePdfAssetsConfigToFirestore(effectiveConfig),
        saveActorUploadedAssetsToFirestore(mergedUrls)
      ]);
      showFeedback('Réglages et fichiers enregistrés dans Firestore avec succès !');
    } catch {
      showFeedback('Enregistré localement (synchronisation Firestore en attente).');
    } finally {
      setIsSaving(false);
    }
  };

  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/') && !/\.(png|jpe?g|webp|svg)$/i.test(file.name)) {
      showFeedback('Veuillez choisir une image PNG, JPG, WebP ou SVG.', 'err');
      return;
    }
    setIsProcessingUpload(true);
    try {
      const optimizedUrl = await readAndOptimizeImageFile(file, { maxDimension: 900 });
      commitUploadedAsset(activeTab, optimizedUrl, file.name);
      showFeedback(`« ${file.name} » importé et appliqué instantanément.`);
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : 'Erreur lors de la lecture du fichier.', 'err');
    } finally {
      setIsProcessingUpload(false);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    await processFile(file);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await processFile(file);
  };

  const handleMakeTransparent = async () => {
    const src = mergedUrls[activeTab];
    if (!src) {
      showFeedback('Importez d’abord une image pour cet élément.', 'err');
      return;
    }
    try {
      setIsProcessingUpload(true);
      const transparentDataUrl = await removeImageBackground(src, { tolerance: 36 });
      commitUploadedAsset(activeTab, transparentDataUrl, `${activeTab}_transparent.png`);
      showFeedback('Fond blanc supprimé — transparence PNG appliquée.');
    } catch {
      showFeedback('Impossible de supprimer le fond de cette image.', 'err');
    } finally {
      setIsProcessingUpload(false);
    }
  };

  const handleAutoGenerateAuthAsset = async (type: 'barcode' | 'qrcode') => {
    try {
      if (type === 'barcode') {
        const barcodeUrl = generateSmallStackedBarcodeCanvasDataUrl(
          `${verificationCodeRef}-${activeScope.toUpperCase()}`
        );
        commitUploadedAsset(activeTab, barcodeUrl, `${activeTab}_barcode.png`);
        showFeedback(`Code-Barres généré pour ${currentScopeDef.shortLabel}.`);
      } else {
        const qrUrl = await QRCode.toDataURL(
          `AUTH:${verificationCodeRef}|ACTOR:${activeScope}|VERIFY:ATLANTIC-BC`,
          { width: 220, margin: 1 }
        );
        commitUploadedAsset(activeTab, qrUrl, `${activeTab}_qrcode.png`);
        showFeedback(`QR Code généré pour ${currentScopeDef.shortLabel}.`);
      }
    } catch {
      showFeedback('Erreur lors de la génération automatique.', 'err');
    }
  };

  const activeImageSrc = mergedUrls[activeTab];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-6 shadow-xs">
      {/* En-tête simple et lisible */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-[#0B2545] shrink-0">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h5 className="text-base font-bold text-[#0B2545]">{displayTitle}</h5>
            <p className="text-sm text-slate-600 mt-0.5">
              Choisissez une partie (1 à 6), importez vos logos, signatures ou sceaux, et ajustez leur rendu en direct.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {feedback && (
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                feedback.type === 'err' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              }`}
            >
              {feedback.type === 'err' ? <AlertCircle className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
              <span>{feedback.text}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleResetSingle}
            className="min-h-[40px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Réinitialiser cet élément</span>
          </button>

          <button
            type="button"
            onClick={handleResetAll}
            className="min-h-[40px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-600 cursor-pointer whitespace-nowrap"
          >
            Tout réinitialiser
          </button>

          <button
            type="button"
            onClick={handleSaveFirestore}
            disabled={isSaving}
            className="min-h-[40px] px-4 py-2 rounded-xl bg-[#0B2545] hover:bg-[#134074] text-white text-xs font-bold inline-flex items-center gap-2 shadow-xs disabled:opacity-60 cursor-pointer whitespace-nowrap"
          >
            <Save className="w-4 h-4 text-amber-400" />
            <span>{isSaving ? 'Sauvegarde...' : 'Sauvegarder dans Firestore'}</span>
          </button>
        </div>
      </div>

      {/* ÉTAPE 1 : CHOIX DE LA PARTIE / ACTEUR */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
            Étape 1 · Sélectionnez la partie concernée
          </span>
          <span className="text-xs text-[#0066B3] font-medium">{currentScopeDef.bindingHint}</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 p-1.5 bg-slate-100 rounded-xl">
          {SCOPE_TABS.map((scope) => {
            const Icon = scope.icon;
            const isCurrent = activeScope === scope.id;
            const activeFilesCount = scope.tabs.filter((t) => Boolean(mergedUrls[t.key])).length;
            return (
              <button
                key={scope.id}
                type="button"
                onClick={() => {
                  setActiveScope(scope.id);
                  setActiveTab(scope.tabs[0].key);
                }}
                className={`min-h-[44px] px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between gap-2 transition-all cursor-pointer text-left ${
                  isCurrent
                    ? 'bg-[#0B2545] text-white shadow-xs'
                    : 'text-slate-700 hover:bg-white hover:text-slate-950'
                }`}
              >
                <span className="flex items-center gap-2 truncate">
                  <Icon className={`w-4 h-4 shrink-0 ${isCurrent ? 'text-amber-300' : 'text-slate-500'}`} />
                  <span className="truncate">{scope.shortLabel}</span>
                </span>
                {activeFilesCount > 0 && (
                  <span
                    className={`text-[11px] font-mono tabular-nums shrink-0 ${
                      isCurrent ? 'text-amber-300' : 'text-emerald-700 font-bold'
                    }`}
                  >
                    {activeFilesCount}/7
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ÉTAPE 2 : CHOIX DU VISUEL (7 ÉLÉMENTS) */}
      <div className="space-y-2.5">
        <span className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
          Étape 2 · Choisissez l'élément à importer ou régler
        </span>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {currentTabs.map((t, index) => {
            const hasCustomFile = Boolean(mergedUrls[t.key]);
            const isSel = activeTab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveTab(t.key)}
                className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                  isSel
                    ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                    : hasCustomFile
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900 hover:bg-emerald-50'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-white'
                }`}
              >
                <span className="font-mono text-[11px] opacity-70">{index + 1}.</span>
                <span>{t.label}</span>
                {hasCustomFile && (
                  <Check className={`w-3.5 h-3.5 ${isSel ? 'text-emerald-300' : 'text-emerald-600'}`} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ÉTAPE 3 : ZONE D'IMPORTATION PAR GLISSER-DÉPOSER + APERÇU DIRECT */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`rounded-2xl border-2 border-dashed p-5 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-5 ${
          isDragging ? 'border-[#0066B3] bg-blue-50/60' : 'border-slate-300 bg-slate-50/70'
        }`}
      >
        <div className="flex items-center gap-4">
          {/* Aperçu visuel en direct avec les réglages appliqués */}
          <div
            className="w-28 h-24 rounded-xl border border-slate-200 bg-white flex items-center justify-center overflow-hidden shrink-0 relative p-2"
            style={{
              backgroundImage:
                'linear-gradient(45deg, #f1f5f9 25%, transparent 25%), linear-gradient(-45deg, #f1f5f9 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f1f5f9 75%), linear-gradient(-45deg, transparent 75%, #f1f5f9 75%)',
              backgroundSize: '12px 12px',
              backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0'
            }}
          >
            {activeImageSrc ? (
              <img
                src={activeImageSrc}
                alt={activeSubTabDef.label}
                style={{
                  opacity: currentCfg.opacity / 100,
                  transform: `rotate(${currentCfg.rotation}deg)`,
                  filter: currentCfg.tintEnabled
                    ? `drop-shadow(0 0 0 ${currentCfg.tintColor}) contrast(1.08)`
                    : undefined
                }}
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <div className="text-center text-slate-400">
                <ImageIcon className="w-6 h-6 mx-auto mb-1" />
                <span className="text-[10px] block">Aucun fichier</span>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <h6 className="text-sm font-bold text-slate-900">
              {activeSubTabDef.label} — {currentScopeDef.shortLabel}
            </h6>
            <p className="text-xs text-slate-600">{activeSubTabDef.helper}</p>
            <p className="text-xs font-medium text-slate-500">
              {isProcessingUpload
                ? 'Traitement de l’image en cours...'
                : activeImageSrc
                ? 'Fichier actif : affiché automatiquement sur les aperçus A4, emails et PDF.'
                : 'Glissez-déposez une image ici ou cliquez sur « Importer une image ».'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {activeSubTabDef.isAuthTool === 'barcode' && (
            <button
              type="button"
              onClick={() => handleAutoGenerateAuthAsset('barcode')}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 text-xs font-bold inline-flex items-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <Barcode className="w-4 h-4" />
              <span>Générer Code-Barres</span>
            </button>
          )}

          {activeSubTabDef.isAuthTool === 'qrcode' && (
            <button
              type="button"
              onClick={() => handleAutoGenerateAuthAsset('qrcode')}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-300 text-xs font-bold inline-flex items-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <QrCode className="w-4 h-4" />
              <span>Générer QR Code</span>
            </button>
          )}

          {activeImageSrc && (
            <>
              <button
                type="button"
                onClick={handleMakeTransparent}
                disabled={isProcessingUpload}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap disabled:opacity-50"
                title="Supprime automatiquement le fond blanc de votre logo ou signature"
              >
                <Sparkles className="w-4 h-4" />
                <span>Supprimer fond blanc</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  commitUploadedAsset(activeTab, '', '');
                  showFeedback(`Visuel « ${activeSubTabDef.label} » retiré.`);
                }}
                className="min-h-[40px] px-3 py-2 rounded-xl border border-red-200 bg-white hover:bg-red-50 text-red-700 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                title="Retirer ce fichier"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Retirer</span>
              </button>
            </>
          )}

          <label className="min-h-[40px] px-4 py-2 rounded-xl bg-[#0066B3] hover:bg-[#005291] text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer shadow-xs transition-colors whitespace-nowrap">
            <Upload className="w-4 h-4" />
            <span>{activeImageSrc ? 'Remplacer le fichier' : 'Importer une image (PNG/JPG)'}</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={handleFileInput}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* ÉTAPE 4 : RÉGLAGES D'AFFICHAGE AÉRÉS (4 COLONNES SIMPLES) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-2">
        {/* Colonne 1 : Dimensions */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-[#0B2545]">
            <Maximize2 className="w-4 h-4 text-amber-600" />
            <span>Dimensions</span>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs text-slate-600 mb-1.5">
              <span>Largeur</span>
              <span className="font-mono font-bold text-slate-900">
                {currentCfg.widthValue} {currentCfg.widthUnit}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="10"
                max={currentCfg.widthUnit === '%' ? 100 : 700}
                step="1"
                value={currentCfg.widthValue}
                onChange={(e) => updateSetting('widthValue', parseFloat(e.target.value))}
                className="w-full accent-[#0B2545] cursor-pointer"
              />
              <select
                value={currentCfg.widthUnit}
                onChange={(e) => updateSetting('widthUnit', e.target.value as 'px' | '%')}
                className="min-h-[32px] px-2 rounded-lg border border-slate-300 text-xs font-mono bg-white"
              >
                <option value="px">px</option>
                <option value="%">%</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs text-slate-600 mb-1.5">
              <span>Hauteur</span>
              <span className="font-mono font-bold text-slate-900">
                {currentCfg.heightValue} {currentCfg.heightUnit}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="10"
                max={currentCfg.heightUnit === '%' ? 100 : 600}
                step="1"
                value={currentCfg.heightValue}
                onChange={(e) => updateSetting('heightValue', parseFloat(e.target.value))}
                className="w-full accent-[#0B2545] cursor-pointer"
              />
              <select
                value={currentCfg.heightUnit}
                onChange={(e) => updateSetting('heightUnit', e.target.value as 'px' | '%')}
                className="min-h-[32px] px-2 rounded-lg border border-slate-300 text-xs font-mono bg-white"
              >
                <option value="px">px</option>
                <option value="%">%</option>
              </select>
            </div>
          </div>
        </div>

        {/* Colonne 2 : Opacité & Rotation */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-[#0B2545]">
            <Eye className="w-4 h-4 text-[#0066B3]" />
            <span>Opacité &amp; Rotation</span>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs text-slate-600 mb-1.5">
              <span>Opacité</span>
              <span className="font-mono font-bold text-slate-900">{currentCfg.opacity} %</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={currentCfg.opacity}
              onChange={(e) => updateSetting('opacity', parseInt(e.target.value, 10))}
              className="w-full accent-[#0066B3] cursor-pointer"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-xs text-slate-600 mb-1.5">
              <span>Rotation</span>
              <span className="font-mono font-bold text-slate-900">{currentCfg.rotation}°</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="-180"
                max="180"
                step="1"
                value={currentCfg.rotation}
                onChange={(e) => updateSetting('rotation', parseInt(e.target.value, 10))}
                className="w-full accent-[#0066B3] cursor-pointer"
              />
              <button
                type="button"
                onClick={() => updateSetting('rotation', 0)}
                className="text-xs px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer font-mono"
                title="Remettre à 0°"
              >
                0°
              </button>
            </div>
          </div>
        </div>

        {/* Colonne 3 : Position X/Y */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-[#0B2545]">
            <Move className="w-4 h-4 text-emerald-600" />
            <span>Position (Décalage)</span>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs text-slate-600 mb-1.5">
              <span>Horizontal (X)</span>
              <span className="font-mono font-bold text-slate-900">{currentCfg.offsetX} px</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="-250"
                max="250"
                step="1"
                value={currentCfg.offsetX}
                onChange={(e) => updateSetting('offsetX', parseInt(e.target.value, 10))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <button
                type="button"
                onClick={() => updateSetting('offsetX', 0)}
                className="text-xs px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer font-mono"
              >
                0
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs text-slate-600 mb-1.5">
              <span>Vertical (Y)</span>
              <span className="font-mono font-bold text-slate-900">{currentCfg.offsetY} px</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="-250"
                max="250"
                step="1"
                value={currentCfg.offsetY}
                onChange={(e) => updateSetting('offsetY', parseInt(e.target.value, 10))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <button
                type="button"
                onClick={() => updateSetting('offsetY', 0)}
                className="text-xs px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer font-mono"
              >
                0
              </button>
            </div>
          </div>
        </div>

        {/* Colonne 4 : Couleur & Plan Z */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-[#0B2545]">
            <Palette className="w-4 h-4 text-slate-700" />
            <span>Couleur &amp; Plan (Z-Index)</span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-slate-700 flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={currentCfg.tintEnabled}
                  onChange={(e) => updateSetting('tintEnabled', e.target.checked)}
                  className="rounded text-[#0B2545]"
                />
                <span>Appliquer une teinte</span>
              </label>
              <span className="text-xs font-mono text-slate-600">{currentCfg.tintColor}</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={currentCfg.tintColor}
                disabled={!currentCfg.tintEnabled}
                onChange={(e) => updateSetting('tintColor', e.target.value)}
                className="w-9 h-8 rounded border border-slate-300 p-0.5 cursor-pointer disabled:opacity-40"
              />
              <div className="flex items-center gap-1.5">
                {['#0B2545', '#0066B3', '#D4A017', '#1E293B', '#166534'].map((col) => (
                  <button
                    key={col}
                    type="button"
                    disabled={!currentCfg.tintEnabled}
                    onClick={() => updateSetting('tintColor', col)}
                    style={{ backgroundColor: col }}
                    className="w-5 h-5 rounded-full border border-slate-300 cursor-pointer disabled:opacity-30"
                  />
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs text-slate-600 mb-1.5">
              <span className="flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                <span>Ordre (Z-Index)</span>
              </span>
              <span className="font-mono font-bold text-slate-900">{currentCfg.zIndex}</span>
            </div>
            <input
              type="range"
              min="-5"
              max="30"
              step="1"
              value={currentCfg.zIndex}
              onChange={(e) => updateSetting('zIndex', parseInt(e.target.value, 10))}
              className="w-full accent-[#0B2545] cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
