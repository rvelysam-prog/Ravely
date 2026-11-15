import React, { useState } from 'react';
import {
  Home,
  Scale,
  ClipboardCheck,
  ScrollText,
  FileText,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Trash2,
  Eye,
  Download,
  RefreshCw,
  Image as ImageIcon,
  Layers,
  Palette,
  Sliders,
  Check,
  Code2,
  Copy,
  Maximize2,
  X,
  ScanText,
  Wand2
} from 'lucide-react';
import { HousingAndNotaryData, HousingTabNumber } from '../../services/housingDocsService';
import { FichesDocEsData } from '../../services/fichesEtDocEsService';
import {
  ImportedAssetKey,
  UploadedAssetUrlsMap,
  PdfImportedAssetsConfig
} from '../../services/departmentsAndEmailService';
import { readAndOptimizeImageFile } from '../../services/imageTransparencyService';
import { generateSmallStackedBarcodeCanvasDataUrl } from '../../services/contractGenerationService';
import QRCode from 'qrcode';
import {
  DetectedRefElement,
  ELEMENT_LABELS,
  LayoutArchetype,
  LayoutTargetDocKey,
  LayoutTemplatesMap,
  ReferenceLayoutTemplate,
  SpatialBlueprint,
  analyzeReferenceDocumentFile,
  buildBlueprintFromLegacyTemplate,
  buildInteractiveHtmlTemplate,
  regenerateInteractiveHtmlWithOcr,
  getActorLabelForDocKey,
  getActorScopeForDocKey,
  getMissingVisualAssetsForTemplate,
  resolveEffectiveLayout,
  saveLayoutTemplateToFirestore,
  deleteLayoutTemplateFromFirestore
} from '../../services/layoutImitationService';
import { PanneauReglagesFichiersImportes } from '../common/PanneauReglagesFichiersImportes';

interface HousingAndDocEsStepWizardProps {
  activeDocKey: LayoutTargetDocKey;
  onChangeActiveDocKey: (key: LayoutTargetDocKey) => void;
  housingData: HousingAndNotaryData;
  onChangeHousingData: (updated: HousingAndNotaryData) => void;
  docEsData: FichesDocEsData;
  onChangeDocEsData: (updated: FichesDocEsData) => void;
  uploadedAssets: UploadedAssetUrlsMap;
  onUploadAsset: (key: ImportedAssetKey, dataUrl: string) => void;
  assetsConfig?: PdfImportedAssetsConfig;
  onChangeAssetsConfig?: (newConfig: PdfImportedAssetsConfig) => void;
  onOpenStampGenerator?: (targetCachetKey: ImportedAssetKey) => void;
  onOpenVisualGenerator?: (targetAssetKey: ImportedAssetKey, docKey?: LayoutTargetDocKey) => void;
  layoutTemplates: LayoutTemplatesMap;
  onUpdateLayoutTemplate: (docKey: LayoutTargetDocKey, template: ReferenceLayoutTemplate | undefined) => void;
  verificationCodeRef: string;
  onJumpToStudioTab: (docKey: LayoutTargetDocKey) => void;
  onDownloadDocPdf: (docKey: LayoutTargetDocKey) => void;
  onDownloadDocWord: (docKey: LayoutTargetDocKey) => void;
  onToast: (msg: string) => void;
}

const DOC_DEFINITIONS: {
  key: LayoutTargetDocKey;
  tabLabel: string;
  fullTitle: string;
  icon: React.ComponentType<{ className?: string }>;
  steps: string[];
}[] = [
  {
    key: 't9',
    tabLabel: 'Onglet 9 : Attestation Hébergement',
    fullTitle: "Attestation officielle de prise en charge de l'hébergement",
    icon: Home,
    steps: [
      '1. Modèle à imiter & Visuels',
      '2. Bénéficiaire & Logement',
      '3. Modalités financières',
      '4. Vérification & Génération'
    ]
  },
  {
    key: 't10',
    tabLabel: 'Onglet 10 : Notaire Public BC',
    fullTitle: "Certificat d'authentification notariale (Notaire Public BC)",
    icon: Scale,
    steps: [
      '1. Modèle à imiter & Visuels',
      '2. Étude notariale & Licence',
      '3. Formalités & Certification',
      '4. Vérification & Génération'
    ]
  },
  {
    key: 't11',
    tabLabel: 'Onglet 11 : Inspection HIR',
    fullTitle: "Rapport d'inspection du logement (HIR - 12 critères)",
    icon: ClipboardCheck,
    steps: [
      '1. Modèle à imiter & Visuels',
      '2. Organisme & Capacité',
      '3. Grille 12 critères & Conclusion',
      '4. Vérification & Génération'
    ]
  },
  {
    key: 't12',
    tabLabel: 'Onglet 12 : Déclaration Solennelle',
    fullTitle: 'Déclaration solennelle (Statutory Declaration)',
    icon: ScrollText,
    steps: [
      '1. Modèle à imiter & Visuels',
      '2. Autorité & Date/Lieu',
      '3. Durée & Conditions',
      '4. Vérification & Génération'
    ]
  },
  {
    key: 'doc_es',
    tabLabel: 'Onglet 13 : 15 Fiches DOC ES',
    fullTitle: 'Module Fiches et DOC ES (15 Modèles ATS & Agence)',
    icon: FileText,
    steps: [
      '1. Modèle à imiter & Visuels',
      '2. Profil ATS & Compétences',
      '3. Évaluation, Poste & Agence',
      '4. Vérification & Génération'
    ]
  }
];

const ALL_DETECTABLE_ELEMENTS: DetectedRefElement[] = [
  'logo',
  'signature',
  'cachet',
  'filigrane',
  'arrierePlan',
  'barcode',
  'qrcode'
];

export const HousingAndDocEsStepWizard: React.FC<HousingAndDocEsStepWizardProps> = ({
  activeDocKey,
  onChangeActiveDocKey,
  housingData,
  onChangeHousingData,
  docEsData,
  onChangeDocEsData,
  uploadedAssets,
  onUploadAsset,
  assetsConfig,
  onChangeAssetsConfig,
  onOpenStampGenerator,
  onOpenVisualGenerator,
  layoutTemplates,
  onUpdateLayoutTemplate,
  verificationCodeRef,
  onJumpToStudioTab,
  onDownloadDocPdf,
  onDownloadDocWord,
  onToast
}) => {
  const [stepByDoc, setStepByDoc] = useState<Record<LayoutTargetDocKey, number>>({
    t9: 0,
    t10: 0,
    t11: 0,
    t12: 0,
    doc_es: 0
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRunningOcr, setIsRunningOcr] = useState(false);
  const [showInteractiveHtmlStudio, setShowInteractiveHtmlStudio] = useState(true);
  const [isInteractiveHtmlFullscreen, setIsInteractiveHtmlFullscreen] = useState(false);

  const activeDef = DOC_DEFINITIONS.find((d) => d.key === activeDocKey) || DOC_DEFINITIONS[0];
  const currentStep = stepByDoc[activeDocKey] || 0;
  const activeTemplate = layoutTemplates[activeDocKey];
  const missingNotices = getMissingVisualAssetsForTemplate(
    activeDocKey,
    activeTemplate,
    uploadedAssets
  );
  const activeUnresolvedMissing = missingNotices.filter((m) => !m.isIgnored);

  const setCurrentStep = (stepIndex: number) => {
    const clamped = Math.max(0, Math.min(activeDef.steps.length - 1, stepIndex));
    setStepByDoc((prev) => ({ ...prev, [activeDocKey]: clamped }));
  };

  const handleReferenceFileSelected = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setIsAnalyzing(true);
    try {
      const analyzed = await analyzeReferenceDocumentFile(file, activeDocKey);
      onUpdateLayoutTemplate(activeDocKey, analyzed);
      await saveLayoutTemplateToFirestore(activeDocKey, analyzed);
      onToast(
        `Modèle « ${file.name} » analysé et enregistré dans Firestore (${analyzed.detectedSummary}).`
      );
    } catch (err) {
      console.error(err);
      onToast(
        err instanceof Error
          ? err.message
          : 'Impossible d’analyser ce document de référence.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUpdateTemplateField = async (
    patch: Partial<ReferenceLayoutTemplate>
  ) => {
    if (!activeTemplate) return;
    const updated: ReferenceLayoutTemplate = {
      ...activeTemplate,
      ...patch
    };
    updated.interactiveHtmlTemplate = buildInteractiveHtmlTemplate(updated);
    onUpdateLayoutTemplate(activeDocKey, updated);
    await saveLayoutTemplateToFirestore(activeDocKey, updated);
  };

  const handleRunOcrReExtract = async () => {
    if (!activeTemplate) return;
    setIsRunningOcr(true);
    try {
      const updated = await regenerateInteractiveHtmlWithOcr(activeTemplate);
      onUpdateLayoutTemplate(activeDocKey, updated);
      await saveLayoutTemplateToFirestore(activeDocKey, updated);
      onToast(
        `Analyse OCR terminée (${updated.extractedTextBlocks?.length || 0} zones de texte éditables générées).`
      );
    } catch {
      onToast('Impossible d’exécuter l’extraction OCR sur cette miniature.');
    } finally {
      setIsRunningOcr(false);
    }
  };

  const handleUpdateBlueprintField = async (
    patch: Partial<SpatialBlueprint>
  ) => {
    if (!activeTemplate) return;
    const baseBp =
      resolveEffectiveLayout(activeTemplate)?.spatialBlueprint ||
      buildBlueprintFromLegacyTemplate(activeTemplate);
    const updatedBp: SpatialBlueprint = { ...baseBp, ...patch };
    await handleUpdateTemplateField({
      spatialBlueprint: updatedBp,
      hasTwoColumnMeta: updatedBp.metaLayout.startsWith('two_col'),
      hasRefHighlightBox: updatedBp.hasRefPill,
      hasCenteredTitleBlock: updatedBp.titleAlign === 'center',
      signatureZoneStyle:
        updatedBp.signatureLayout === 'three_col_footer'
          ? 'three_col_footer'
          : 'two_col_fait_a_right_sig',
      hasBottomLegalFooter: updatedBp.footerLayout !== 'none'
    });
  };

  const handleToggleDetectedElement = async (el: DetectedRefElement) => {
    if (!activeTemplate) return;
    const exists = activeTemplate.detectedElements.includes(el);
    const nextElements = exists
      ? activeTemplate.detectedElements.filter((x) => x !== el)
      : [...activeTemplate.detectedElements, el];
    await handleUpdateTemplateField({ detectedElements: nextElements });
  };

  const handleToggleIgnoreMissing = async (el: DetectedRefElement) => {
    if (!activeTemplate) return;
    const currentIgnored = activeTemplate.ignoredMissingElements || [];
    const isIgnored = currentIgnored.includes(el);
    const nextIgnored = isIgnored
      ? currentIgnored.filter((x) => x !== el)
      : [...currentIgnored, el];
    await handleUpdateTemplateField({ ignoredMissingElements: nextIgnored });
    onToast(
      isIgnored
        ? `Élément « ${ELEMENT_LABELS[el].label} » réactivé comme requis.`
        : `Élément « ${ELEMENT_LABELS[el].label} » laissé de côté pour ce modèle.`
    );
  };

  const handleDirectMissingAssetImport = async (
    assetKey: ImportedAssetKey,
    label: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const optimized = await readAndOptimizeImageFile(file, {
        maxDimension: 950,
        quality: 0.9
      });
      onUploadAsset(assetKey, optimized);
      onToast(`« ${label} » importé et enregistré automatiquement dans Firestore !`);
    } catch (err) {
      onToast(
        err instanceof Error ? err.message : `Erreur import ${label}`
      );
    }
  };

  const handleGenerateMissingAuthCode = async (
    element: 'barcode' | 'qrcode',
    assetKey: ImportedAssetKey,
    label: string
  ) => {
    try {
      if (element === 'barcode') {
        const url = generateSmallStackedBarcodeCanvasDataUrl(
          `${verificationCodeRef || 'ENT-BC-2026'}-${activeDocKey.toUpperCase()}`
        );
        onUploadAsset(assetKey, url);
        onToast(`${label} généré et enregistré dans Firestore !`);
      } else {
        const origin =
          typeof window !== 'undefined'
            ? window.location.origin
            : 'https://atlantictransport.ca';
        const qr = await QRCode.toDataURL(
          `${origin}/verify?ref=${encodeURIComponent(
            verificationCodeRef || 'ENT-BC-2026'
          )}&doc=${activeDocKey}`,
          { width: 220, margin: 1, color: { dark: '#0B2545', light: '#FFFFFF' } }
        );
        onUploadAsset(assetKey, qr);
        onToast(`${label} généré et enregistré dans Firestore !`);
      }
    } catch {
      onToast(`Impossible de générer ${label}.`);
    }
  };

  const handleRemoveTemplate = async () => {
    onUpdateLayoutTemplate(activeDocKey, undefined);
    await deleteLayoutTemplateFromFirestore(activeDocKey);
    onToast('Modèle de mise en page supprimé.');
  };

  return (
    <div className="space-y-5">
      {/* 1. SÉLECTEUR DES 5 DOCUMENTS LIÉS À LA SECTION 2 */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold">
        {DOC_DEFINITIONS.map((docDef) => {
          const Icon = docDef.icon;
          const isActive = activeDocKey === docDef.key;
          const hasRef = Boolean(layoutTemplates[docDef.key]);
          const missingCount = getMissingVisualAssetsForTemplate(
            docDef.key,
            layoutTemplates[docDef.key],
            uploadedAssets
          ).filter((m) => !m.isIgnored).length;

          return (
            <button
              key={docDef.key}
              type="button"
              onClick={() => onChangeActiveDocKey(docDef.key)}
              className={`px-3.5 py-2 rounded-lg cursor-pointer transition-colors inline-flex items-center gap-2 whitespace-nowrap ${
                isActive
                  ? 'bg-[#0066B3] text-white shadow-xs'
                  : 'text-slate-700 hover:bg-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{docDef.tabLabel}</span>
              {hasRef && (
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    missingCount > 0
                      ? 'bg-amber-400 text-slate-950'
                      : isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {missingCount > 0 ? `${missingCount} manquant(s)` : 'Modèle actif'}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 2. BARRE DE PROGRESSION MULTI-ÉTAPES (STEP BY STEP) */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#0066B3]">
              Parcours Multi-Étapes · {activeDef.tabLabel}
            </span>
            <h4 className="text-base font-extrabold text-[#0B2545] mt-0.5">
              {activeDef.fullTitle}
            </h4>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            Étape {currentStep + 1} sur {activeDef.steps.length}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {activeDef.steps.map((label, idx) => {
            const isCurrent = idx === currentStep;
            const isDone = idx < currentStep;
            return (
              <button
                key={label}
                type="button"
                onClick={() => setCurrentStep(idx)}
                className={`px-3 py-2.5 rounded-lg border text-left text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  isCurrent
                    ? 'bg-[#0B2545] text-white border-[#0B2545]'
                    : isDone
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full text-[11px] flex items-center justify-center shrink-0 font-black ${
                    isCurrent
                      ? 'bg-amber-400 text-slate-950'
                      : isDone
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {isDone ? <Check className="w-3 h-3" /> : idx + 1}
                </span>
                <span className="line-clamp-1">{label.replace(/^[0-9]\.\s*/, '')}</span>
              </button>
            );
          })}
        </div>

        {/* =================================================================== */}
        {/* ÉTAPE 1 : IMPORTATION MODÈLE À IMITER & DÉTECTION DES VISUELS       */}
        {/* =================================================================== */}
        {currentStep === 0 && (
          <div className="space-y-5 pt-2">
            <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1 max-w-2xl">
                <h5 className="text-sm font-bold text-[#0B2545] flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#0066B3]" />
                  <span>Importer un document modèle à imiter (PDF, JPG, PNG, WEBP)</span>
                </h5>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Importez un document type : le système analyse automatiquement le format de page, les marges, l’alignement, les couleurs, la police, les cadres et les visuels (logo, tampon, filigrane, signature) pour que le document généré imite fidèlement sa mise en page. Enregistré automatiquement dans Firestore.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <label className="min-h-[42px] px-4 py-2 rounded-lg bg-[#0066B3] hover:bg-[#005291] text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer whitespace-nowrap shadow-xs">
                  {isAnalyzing ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  <span>
                    {isAnalyzing
                      ? 'Analyse en cours...'
                      : activeTemplate
                      ? 'Remplacer le modèle'
                      : 'Importer un modèle (PDF/Image)'}
                  </span>
                  <input
                    type="file"
                    accept="application/pdf,image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handleReferenceFileSelected}
                  />
                </label>

                {activeTemplate && (
                  <button
                    type="button"
                    onClick={handleRemoveTemplate}
                    className="min-h-[42px] px-3 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Retirer</span>
                  </button>
                )}
              </div>
            </div>

            {activeTemplate ? (
              <div className="space-y-5">
                {/* APERÇU CÔTE À CÔTE + RÉGLAGES EXTRAITS */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                  {/* Aperçu miniature du document modèle importé */}
                  <div className="lg:col-span-4 p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#0B2545] truncate">
                        {activeTemplate.sourceFileName}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase">
                        Firestore OK
                      </span>
                    </div>
                    {activeTemplate.previewThumbnailUrl ? (
                      <div className="border border-slate-300 rounded-lg bg-white p-2 flex justify-center">
                        <img
                          src={activeTemplate.previewThumbnailUrl}
                          alt="Aperçu du modèle importé"
                          className="max-h-64 object-contain rounded"
                        />
                      </div>
                    ) : (
                      <div className="h-44 border border-dashed border-slate-300 rounded-lg flex items-center justify-center text-slate-400 text-xs">
                        Aperçu indisponible
                      </div>
                    )}
                    <p className="text-[11px] text-slate-600 font-mono">
                      {activeTemplate.detectedSummary}
                    </p>
                  </div>

                  {/* Paramètres détectés & ajustables en temps réel */}
                  <div className="lg:col-span-8 p-5 rounded-xl border border-slate-200 bg-white space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                      <h6 className="text-xs sm:text-sm font-bold text-[#0B2545] flex items-center gap-2">
                        <Sliders className="w-4 h-4 text-[#0066B3]" />
                        <span>Structure visuelle extraite (modifiable)</span>
                      </h6>
                      <span className="text-[11px] text-slate-500">
                        Appliquée automatiquement au PDF, Word, HTML et Aperçu A4
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">Archétype Structure</label>
                        <select
                          value={resolveEffectiveLayout(activeTemplate)?.layoutArchetype || 'letterhead_split'}
                          onChange={(e) => {
                            const nextArch = e.target.value as LayoutArchetype;
                            handleUpdateTemplateField({
                              layoutArchetype: nextArch,
                              ...(nextArch === 'letterhead_split'
                                ? {
                                    borderStyle: 'none',
                                    headerStyle: 'entete_epure',
                                    hasTwoColumnMeta: true,
                                    hasRefHighlightBox: true,
                                    hasCenteredTitleBlock: true,
                                    signatureZoneStyle: 'two_col_fait_a_right_sig',
                                    singlePageFit: true
                                  }
                                : nextArch === 'boxed_certificate'
                                ? {
                                    borderStyle: 'double',
                                    headerStyle: 'encadre_classique'
                                  }
                                : nextArch === 'executive_banner'
                                ? {
                                    borderStyle: 'official_band',
                                    headerStyle: 'bandeau_plein'
                                  }
                                : {
                                    borderStyle: 'card_blocks',
                                    headerStyle: 'split_officiel'
                                  })
                            });
                          }}
                          className="w-full px-2.5 py-2 border border-slate-300 rounded-lg bg-white font-semibold"
                        >
                          <option value="letterhead_split">Lettre Officielle Épurée (2 col.)</option>
                          <option value="boxed_certificate">Certificat Encadré</option>
                          <option value="executive_banner">Bandeau Exécutif</option>
                          <option value="table_report">Rapport / Tableau</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">Format</label>
                        <select
                          value={activeTemplate.pageFormat}
                          onChange={(e) =>
                            handleUpdateTemplateField({
                              pageFormat: e.target.value as 'a4' | 'letter'
                            })
                          }
                          className="w-full px-2.5 py-2 border border-slate-300 rounded-lg bg-white font-semibold"
                        >
                          <option value="a4">A4 (210 × 297 mm)</option>
                          <option value="letter">US Letter (Canada)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">Orientation</label>
                        <select
                          value={activeTemplate.orientation}
                          onChange={(e) =>
                            handleUpdateTemplateField({
                              orientation: e.target.value as 'portrait' | 'landscape'
                            })
                          }
                          className="w-full px-2.5 py-2 border border-slate-300 rounded-lg bg-white font-semibold"
                        >
                          <option value="portrait">Portrait</option>
                          <option value="landscape">Paysage</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">Encadrement</label>
                        <select
                          value={activeTemplate.borderStyle}
                          onChange={(e) =>
                            handleUpdateTemplateField({
                              borderStyle: e.target.value as ReferenceLayoutTemplate['borderStyle']
                            })
                          }
                          className="w-full px-2.5 py-2 border border-slate-300 rounded-lg bg-white font-semibold"
                        >
                          <option value="official_band">Bandeau officiel</option>
                          <option value="double">Cadre double filet</option>
                          <option value="simple">Cadre simple</option>
                          <option value="card_blocks">Blocs & Tableaux</option>
                          <option value="none">Sans cadre</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">Police</label>
                        <select
                          value={activeTemplate.fontFamily}
                          onChange={(e) =>
                            handleUpdateTemplateField({
                              fontFamily: e.target.value as ReferenceLayoutTemplate['fontFamily']
                            })
                          }
                          className="w-full px-2.5 py-2 border border-slate-300 rounded-lg bg-white font-semibold"
                        >
                          <option value="helvetica">Sans-Serif (Moderne)</option>
                          <option value="times">Serif (Notarié / Classique)</option>
                          <option value="courier">Monospace (Officiel)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">Style En-tête</label>
                        <select
                          value={activeTemplate.headerStyle}
                          onChange={(e) =>
                            handleUpdateTemplateField({
                              headerStyle: e.target.value as ReferenceLayoutTemplate['headerStyle']
                            })
                          }
                          className="w-full px-2.5 py-2 border border-slate-300 rounded-lg bg-white"
                        >
                          <option value="bandeau_plein">Bandeau coloré</option>
                          <option value="entete_epure">En-tête épuré</option>
                          <option value="encadre_classique">Encadré classique</option>
                          <option value="split_officiel">Séparé Gauche/Droite</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">Position Logo</label>
                        <select
                          value={activeTemplate.logoPlacement}
                          onChange={(e) =>
                            handleUpdateTemplateField({
                              logoPlacement: e.target.value as ReferenceLayoutTemplate['logoPlacement']
                            })
                          }
                          className="w-full px-2.5 py-2 border border-slate-300 rounded-lg bg-white"
                        >
                          <option value="top_left">En haut à gauche</option>
                          <option value="top_center">En haut centré</option>
                          <option value="top_right">En haut à droite</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">Espacements</label>
                        <select
                          value={activeTemplate.blockSpacing}
                          onChange={(e) =>
                            handleUpdateTemplateField({
                              blockSpacing: e.target.value as ReferenceLayoutTemplate['blockSpacing']
                            })
                          }
                          className="w-full px-2.5 py-2 border border-slate-300 rounded-lg bg-white"
                        >
                          <option value="compact">Compact</option>
                          <option value="standard">Standard</option>
                          <option value="airy">Aéré</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">Marges G/D/H (mm)</label>
                        <div className="grid grid-cols-3 gap-1">
                          <input
                            type="number"
                            min={6}
                            max={40}
                            value={activeTemplate.marginsMm.left}
                            onChange={(e) =>
                              handleUpdateTemplateField({
                                marginsMm: {
                                  ...activeTemplate.marginsMm,
                                  left: Number(e.target.value) || 15
                                }
                              })
                            }
                            title="Marge gauche (mm)"
                            className="px-1.5 py-1.5 border border-slate-300 rounded text-center font-mono"
                          />
                          <input
                            type="number"
                            min={6}
                            max={40}
                            value={activeTemplate.marginsMm.right}
                            onChange={(e) =>
                              handleUpdateTemplateField({
                                marginsMm: {
                                  ...activeTemplate.marginsMm,
                                  right: Number(e.target.value) || 15
                                }
                              })
                            }
                            title="Marge droite (mm)"
                            className="px-1.5 py-1.5 border border-slate-300 rounded text-center font-mono"
                          />
                          <input
                            type="number"
                            min={6}
                            max={40}
                            value={activeTemplate.marginsMm.top}
                            onChange={(e) =>
                              handleUpdateTemplateField({
                                marginsMm: {
                                  ...activeTemplate.marginsMm,
                                  top: Number(e.target.value) || 15
                                }
                              })
                            }
                            title="Marge haute (mm)"
                            className="px-1.5 py-1.5 border border-slate-300 rounded text-center font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Réglages détaillés du SpatialBlueprint mesuré (propre au fichier importé) */}
                    {(() => {
                      const bp =
                        resolveEffectiveLayout(activeTemplate)?.spatialBlueprint ||
                        buildBlueprintFromLegacyTemplate(activeTemplate);
                      return (
                        <div className="pt-3 border-t border-slate-100 space-y-3">
                          <div className="text-[11px] font-bold uppercase tracking-wide text-[#0066B3]">
                            Empreinte Spatiale exacte du document importé
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
                            <div>
                              <label className="block font-semibold text-slate-600 mb-1">Zone En-tête</label>
                              <select
                                value={bp.headerLayout}
                                onChange={(e) =>
                                  handleUpdateBlueprintField({
                                    headerLayout: e.target.value as SpatialBlueprint['headerLayout']
                                  })
                                }
                                className="w-full px-2 py-1.5 border border-slate-300 rounded-lg bg-white text-[11px] font-semibold"
                              >
                                <option value="filled_banner">Bandeau plein coloré</option>
                                <option value="top_accent_bar">Barre d’accent en haut</option>
                                <option value="split_lr">Séparé Gauche / Droite</option>
                                <option value="left_clean">Épuré à gauche</option>
                                <option value="centered_stack">Empilé centré</option>
                              </select>
                            </div>

                            <div>
                              <label className="block font-semibold text-slate-600 mb-1">Métadonnées</label>
                              <select
                                value={bp.metaLayout}
                                onChange={(e) =>
                                  handleUpdateBlueprintField({
                                    metaLayout: e.target.value as SpatialBlueprint['metaLayout']
                                  })
                                }
                                className="w-full px-2 py-1.5 border border-slate-300 rounded-lg bg-white text-[11px] font-semibold"
                              >
                                <option value="two_col_asymmetric">2 Col. Asymétriques</option>
                                <option value="two_col_equal">2 Col. Équilibrées</option>
                                <option value="single_col_left">1 Colonne Gauche</option>
                                <option value="boxed_grid">Grille Encadrée</option>
                                <option value="none">Aucune métadonnée</option>
                              </select>
                            </div>

                            <div>
                              <label className="block font-semibold text-slate-600 mb-1">Alignement Titre</label>
                              <select
                                value={bp.titleAlign}
                                onChange={(e) =>
                                  handleUpdateBlueprintField({
                                    titleAlign: e.target.value as SpatialBlueprint['titleAlign']
                                  })
                                }
                                className="w-full px-2 py-1.5 border border-slate-300 rounded-lg bg-white text-[11px] font-semibold"
                              >
                                <option value="left">Gauche</option>
                                <option value="center">Centré</option>
                                <option value="right">Droite</option>
                              </select>
                            </div>

                            <div>
                              <label className="block font-semibold text-slate-600 mb-1">Corps / Articles</label>
                              <select
                                value={bp.bodyLayout}
                                onChange={(e) =>
                                  handleUpdateBlueprintField({
                                    bodyLayout: e.target.value as SpatialBlueprint['bodyLayout']
                                  })
                                }
                                className="w-full px-2 py-1.5 border border-slate-300 rounded-lg bg-white text-[11px] font-semibold"
                              >
                                <option value="prose_paragraphs">Paragraphes fluides</option>
                                <option value="numbered_sections">Sections numérotées</option>
                                <option value="structured_table">Tableau structuré</option>
                                <option value="cards">Blocs encadrés</option>
                              </select>
                            </div>

                            <div>
                              <label className="block font-semibold text-slate-600 mb-1">Zone Signatures</label>
                              <select
                                value={bp.signatureLayout}
                                onChange={(e) =>
                                  handleUpdateBlueprintField({
                                    signatureLayout: e.target.value as SpatialBlueprint['signatureLayout']
                                  })
                                }
                                className="w-full px-2 py-1.5 border border-slate-300 rounded-lg bg-white text-[11px] font-semibold"
                              >
                                <option value="two_col_fait_a_right_sig">Fait à + Délégation droite</option>
                                <option value="two_col_bipartite">Bipartite (2 parties)</option>
                                <option value="three_col_footer">Grille 3 colonnes</option>
                                <option value="right_block">Bloc unique à droite</option>
                                <option value="left_block">Bloc unique à gauche</option>
                              </select>
                            </div>

                            <div>
                              <label className="block font-semibold text-slate-600 mb-1">Pied de page</label>
                              <select
                                value={bp.footerLayout}
                                onChange={(e) =>
                                  handleUpdateBlueprintField({
                                    footerLayout: e.target.value as SpatialBlueprint['footerLayout']
                                  })
                                }
                                className="w-full px-2 py-1.5 border border-slate-300 rounded-lg bg-white text-[11px] font-semibold"
                              >
                                <option value="qr_legal_page">QR + Mentions + Page</option>
                                <option value="centered_legal">Mentions centrées</option>
                                <option value="rule_with_page">Filet + N° de page</option>
                                <option value="minimal_page">N° de page minimal</option>
                                <option value="none">Aucun pied de page</option>
                              </select>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 text-[11px]">
                            {(
                              [
                                { key: 'hasRefPill', label: 'Pastille Références' },
                                { key: 'titleHasBox', label: 'Titre encadré' },
                                { key: 'titleHasUnderline', label: 'Titre souligné' },
                                { key: 'titleUppercase', label: 'Titre en MAJUSCULES' },
                                { key: 'hasLeftAccentStripe', label: 'Bande verticale gauche' },
                                { key: 'hasSectionDividers', label: 'Séparateurs de sections' },
                                { key: 'hasTopRightMarker', label: 'Repère haut-droit' }
                              ] as const
                            ).map((toggle) => (
                              <label
                                key={toggle.key}
                                className={`px-2 py-1 rounded-md border inline-flex items-center gap-1.5 cursor-pointer font-semibold ${
                                  bp[toggle.key]
                                    ? 'bg-blue-50 border-[#0066B3] text-[#0B2545]'
                                    : 'bg-slate-50 border-slate-200 text-slate-500'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={Boolean(bp[toggle.key])}
                                  onChange={(e) =>
                                    handleUpdateBlueprintField({ [toggle.key]: e.target.checked })
                                  }
                                  className="rounded text-[#0066B3]"
                                />
                                <span>{toggle.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Palette extraite */}
                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-4 text-xs">
                      <span className="font-bold text-slate-700 flex items-center gap-1.5">
                        <Palette className="w-3.5 h-3.5 text-[#0066B3]" />
                        Palette extraite :
                      </span>
                      {(
                        [
                          { field: 'primaryColor', label: 'Principale' },
                          { field: 'headerBgColor', label: 'En-tête' },
                          { field: 'accentColor', label: 'Accent' },
                          { field: 'highlightTintColor', label: 'Pastille Réf.' },
                          { field: 'pageBgColor', label: 'Fond page' }
                        ] as const
                      ).map((c) => (
                        <label key={c.field} className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="color"
                            value={
                              activeTemplate[c.field] ||
                              (c.field === 'highlightTintColor' ? '#D8F3EB' : '#FFFFFF')
                            }
                            onChange={(e) =>
                              handleUpdateTemplateField({ [c.field]: e.target.value })
                            }
                            className="w-6 h-6 rounded border border-slate-300 cursor-pointer"
                          />
                          <span className="text-slate-600 font-medium">{c.label}</span>
                        </label>
                      ))}
                    </div>

                    {/* Éléments repérés sur le modèle (cochables / ajustables) */}
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      <span className="text-xs font-bold text-slate-700 block">
                        Éléments visuels identifiés sur le document modèle :
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {ALL_DETECTABLE_ELEMENTS.map((el) => {
                          const checked = activeTemplate.detectedElements.includes(el);
                          return (
                            <label
                              key={el}
                              className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                                checked
                                  ? 'bg-blue-50 border-[#0066B3] text-[#0B2545]'
                                  : 'bg-slate-50 border-slate-200 text-slate-500'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => handleToggleDetectedElement(el)}
                                className="rounded text-[#0066B3]"
                              />
                              <span>{ELEMENT_LABELS[el].label.split('/')[0].trim()}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* NOTIFICATION DES ÉLÉMENTS VISUELS MANQUANTS (TAMPON, FILIGRANE, ETC.) */}
                {missingNotices.length > 0 && (
                  <div className="p-5 rounded-xl bg-amber-50 border-2 border-amber-300 space-y-3">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <h5 className="text-sm font-extrabold text-amber-950">
                          Éléments présents sur le document modèle mais absents de vos Visuels ({getActorLabelForDocKey(activeDocKey)})
                        </h5>
                        <p className="text-xs text-amber-800 mt-0.5">
                          Votre document de référence comporte les éléments ci-dessous qui ne sont pas encore importés dans « Visuels, Logos &amp; Tampons ». Choisissez d’importer chacun maintenant ou de le laisser de côté :
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {missingNotices.map((m) => (
                        <div
                          key={m.element}
                          className={`p-3.5 rounded-xl border flex flex-col justify-between gap-3 ${
                            m.isIgnored
                              ? 'bg-white/60 border-amber-200 opacity-75'
                              : 'bg-white border-amber-300 shadow-xs'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-extrabold text-slate-900">
                                {m.label}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                  m.isIgnored
                                    ? 'bg-slate-200 text-slate-700'
                                    : 'bg-amber-100 text-amber-900'
                                }`}
                              >
                                {m.isIgnored ? 'Laissé / Ignoré' : 'Manquant'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 mt-1">{m.description}</p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <label className="px-3 py-1.5 rounded-lg bg-[#0066B3] hover:bg-[#005291] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer">
                              <Upload className="w-3.5 h-3.5" />
                              <span>Importer maintenant</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) =>
                                  handleDirectMissingAssetImport(m.assetKey, m.label, e)
                                }
                              />
                            </label>

                            {(m.element === 'barcode' || m.element === 'qrcode') && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleGenerateMissingAuthCode(
                                    m.element as 'barcode' | 'qrcode',
                                    m.assetKey,
                                    m.label
                                  )
                                }
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Générer auto</span>
                              </button>
                            )}

                            {onOpenVisualGenerator && (
                              <button
                                type="button"
                                onClick={() => onOpenVisualGenerator(m.assetKey, activeDocKey)}
                                className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                              >
                                <Wand2 className="w-3.5 h-3.5" />
                                <span>Créer / Imiter</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleToggleIgnoreMissing(m.element)}
                              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                            >
                              {m.isIgnored ? 'Re-demander' : 'Laisser / Ignorer'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {missingNotices.length === 0 && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-xs font-semibold text-emerald-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      Tous les éléments visuels requis par ce document modèle sont déjà présents dans « Visuels, Logos &amp; Tampons » ({getActorLabelForDocKey(activeDocKey)}).
                    </span>
                  </div>
                )}

                {/* STUDIO MODÈLE INTERACTIF HTML / CSS / JS (STYLE CANVA) */}
                {(() => {
                  const interactiveHtml =
                    activeTemplate.interactiveHtmlTemplate || buildInteractiveHtmlTemplate(activeTemplate);
                  return (
                    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                      <div className="px-4 py-3 bg-[#0B2545] text-white flex flex-wrap items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2">
                          <Code2 className="w-4 h-4 text-amber-300 shrink-0" />
                          <div>
                            <h6 className="text-xs sm:text-sm font-bold">
                              Modèle HTML / CSS / JS Interactif &amp; Annoté (Éditable sur mesure)
                            </h6>
                            <p className="text-[11px] text-blue-200">
                              Textes éditables au clic, emplacements d’images remplaçables &amp; bouton « Aperçu annoté » (sans image de fond plate).
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                          <button
                            type="button"
                            onClick={handleRunOcrReExtract}
                            disabled={isRunningOcr}
                            className="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            title="Extraire ou ré-analyser le texte via OCR"
                          >
                            <ScanText className={`w-3.5 h-3.5 ${isRunningOcr ? 'animate-pulse text-amber-300' : ''}`} />
                            <span>{isRunningOcr ? 'OCR en cours...' : 'Analyser Texte (OCR)'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(interactiveHtml);
                                onToast('Code complet HTML / CSS / JS copié dans le presse-papiers !');
                              } catch {
                                onToast('Impossible de copier automatiquement.');
                              }
                            }}
                            className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copier Code HTML/CSS/JS</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const blob = new Blob([interactiveHtml], { type: 'text/html;charset=utf-8' });
                              const a = document.createElement('a');
                              a.href = URL.createObjectURL(blob);
                              a.download = `Modele_Interactif_${activeDocKey}.html`;
                              a.click();
                              onToast('Fichier modèle interactif (.html) téléchargé.');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Télécharger (.html)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setIsInteractiveHtmlFullscreen(true)}
                            className="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                            <span>Plein Écran</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setShowInteractiveHtmlStudio((v) => !v)}
                            className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-blue-100 inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>{showInteractiveHtmlStudio ? 'Masquer' : 'Afficher'}</span>
                          </button>
                        </div>
                      </div>

                      {showInteractiveHtmlStudio && (
                        <div className="bg-slate-200 p-2 sm:p-3">
                          <iframe
                            key={`${activeDocKey}_${activeTemplate.analyzedAt}_${activeTemplate.extractedTextBlocks?.length || 0}`}
                            title="Aperçu Modèle Interactif"
                            srcDoc={interactiveHtml}
                            className="w-full h-[540px] rounded-lg border border-slate-300 bg-white"
                          />
                        </div>
                      )}
                    </div>
                  );
                })()}

                {isInteractiveHtmlFullscreen && (
                  <div className="fixed inset-0 z-[120] bg-slate-950/85 flex flex-col p-3 sm:p-6">
                    <div className="bg-[#0B2545] text-white px-4 py-3 rounded-t-xl flex items-center justify-between">
                      <span className="text-sm font-bold flex items-center gap-2">
                        <Code2 className="w-4 h-4 text-amber-300" />
                        <span>Studio Modèle Interactif — {activeTemplate.sourceFileName}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsInteractiveHtmlFullscreen(false)}
                        className="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                        <span>Fermer</span>
                      </button>
                    </div>
                    <iframe
                      title="Aperçu Plein Écran Modèle Interactif"
                      srcDoc={activeTemplate.interactiveHtmlTemplate || buildInteractiveHtmlTemplate(activeTemplate)}
                      className="w-full flex-1 bg-white rounded-b-xl border border-slate-700"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 rounded-xl border border-dashed border-slate-300 bg-white text-center space-y-2">
                <ImageIcon className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs sm:text-sm font-semibold text-slate-700">
                  Aucun document modèle importé pour « {activeDef.tabLabel} ».
                </p>
                <p className="text-xs text-slate-500 max-w-lg mx-auto">
                  Vous pouvez importer un document type (PDF, JPG, PNG) pour que notre outil imite sa mise en page, ou passer directement à l’étape suivante pour utiliser la mise en page officielle standard.
                </p>
              </div>
            )}

            {/* LIAISON DIRECTE : PANNEAU VISUELS & TAMPONS DE CET ONGLET */}
            <PanneauReglagesFichiersImportes
              lockedActorScope={getActorScopeForDocKey(activeDocKey)}
              assetsConfig={assetsConfig}
              onChangeConfig={onChangeAssetsConfig}
              uploadedAssetUrls={uploadedAssets}
              onUploadAsset={(key, dataUrl) => onUploadAsset(key, dataUrl)}
              verificationCodeRef={verificationCodeRef}
              onOpenStampGenerator={onOpenStampGenerator}
              onOpenVisualGenerator={(key) => onOpenVisualGenerator?.(key, activeDocKey)}
              compact={true}
              title={`Visuels & Tampons liés — ${activeDef.tabLabel}`}
            />
          </div>
        )}

        {/* =================================================================== */}
        {/* ÉTAPE 2 : FORMULAIRES PRINCIPAUX PAR DOCUMENT                       */}
        {/* =================================================================== */}
        {currentStep === 1 && activeDocKey === 't9' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                N° Immatriculation Employeur
              </label>
              <input
                type="text"
                value={housingData.employeurNumEnregistrement}
                onChange={(e) =>
                  onChangeHousingData({
                    ...housingData,
                    employeurNumEnregistrement: e.target.value
                  })
                }
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Date &amp; Lieu naissance bénéficiaire
              </label>
              <input
                type="text"
                value={housingData.beneficiaireDateLieuNaissance}
                onChange={(e) =>
                  onChangeHousingData({
                    ...housingData,
                    beneficiaireDateLieuNaissance: e.target.value
                  })
                }
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                N° Passeport bénéficiaire
              </label>
              <input
                type="text"
                value={housingData.beneficiairePasseport}
                onChange={(e) =>
                  onChangeHousingData({
                    ...housingData,
                    beneficiairePasseport: e.target.value
                  })
                }
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg font-mono font-bold"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Adresse complète du logement mis à disposition
              </label>
              <input
                type="text"
                value={housingData.hebergementAdresseComplete}
                onChange={(e) =>
                  onChangeHousingData({
                    ...housingData,
                    hebergementAdresseComplete: e.target.value
                  })
                }
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Ville / Province
              </label>
              <input
                type="text"
                value={housingData.hebergementVilleProvince}
                onChange={(e) =>
                  onChangeHousingData({
                    ...housingData,
                    hebergementVilleProvince: e.target.value
                  })
                }
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Type de logement
              </label>
              <select
                value={housingData.hebergementTypeLogement}
                onChange={(e) =>
                  onChangeHousingData({
                    ...housingData,
                    hebergementTypeLogement: e.target
                      .value as HousingAndNotaryData['hebergementTypeLogement']
                  })
                }
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="Appartement individuel">Appartement individuel</option>
                <option value="Maison partagée">Maison partagée</option>
                <option value="Chambre individuelle meublée">Chambre individuelle meublée</option>
                <option value="Résidence d'entreprise">Résidence d’entreprise</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nombre de chambres / Capacité
              </label>
              <input
                type="text"
                value={housingData.hebergementNombreChambres}
                onChange={(e) =>
                  onChangeHousingData({
                    ...housingData,
                    hebergementNombreChambres: e.target.value
                  })
                }
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Lien de l’employeur avec le logement
              </label>
              <select
                value={housingData.hebergementLienEmployeur}
                onChange={(e) =>
                  onChangeHousingData({
                    ...housingData,
                    hebergementLienEmployeur: e.target
                      .value as HousingAndNotaryData['hebergementLienEmployeur']
                  })
                }
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="Propriétaire">Propriétaire</option>
                <option value="Locataire autorisé à héberger">Locataire autorisé à héberger</option>
                <option value="Convention de mise à disposition">Convention de mise à disposition</option>
              </select>
            </div>
          </div>
        )}

        {currentStep === 1 && activeDocKey === 't10' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nom du Notaire public (BC)
              </label>
              <input
                type="text"
                value={housingData.notaireNomComplet}
                onChange={(e) =>
                  onChangeHousingData({
                    ...housingData,
                    notaireNomComplet: e.target.value
                  })
                }
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                N° Licence / Membre Notaire
              </label>
              <input
                type="text"
                value={housingData.notaireNumeroLicence}
                onChange={(e) =>
                  onChangeHousingData({
                    ...housingData,
                    notaireNumeroLicence: e.target.value
                  })
                }
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                N° Dossier Notarial
              </label>
              <input
                type="text"
                value={housingData.notaireNumeroDossier}
                onChange={(e) =>
                  onChangeHousingData({
                    ...housingData,
                    notaireNumeroDossier: e.target.value
                  })
                }
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg font-mono text-blue-900 font-bold"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Adresse étude notariale (Colombie-Britannique)
              </label>
              <input
                type="text"
                value={housingData.notaireVilleAdresse}
                onChange={(e) =>
                  onChangeHousingData({
                    ...housingData,
                    notaireVilleAdresse: e.target.value
                  })
                }
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Pièce identité vérifiée du signataire
              </label>
              <input
                type="text"
                value={housingData.notairePieceIdentiteSignataire}
                onChange={(e) =>
                  onChangeHousingData({
                    ...housingData,
                    notairePieceIdentiteSignataire: e.target.value
                  })
                }
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>
        )}

        {currentStep === 1 && activeDocKey === 't11' && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-sm pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Organisme (BCAC / HIR)
              </label>
              <input
                type="text"
                value={housingData.hirOrganismeNom}
                onChange={(e) =>
                  onChangeHousingData({ ...housingData, hirOrganismeNom: e.target.value })
                }
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nom de l’Inspecteur
              </label>
              <input
                type="text"
                value={housingData.hirInspecteurNom}
                onChange={(e) =>
                  onChangeHousingData({ ...housingData, hirInspecteurNom: e.target.value })
                }
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                N° Inspection
              </label>
              <input
                type="text"
                value={housingData.hirNumeroInspection}
                onChange={(e) =>
                  onChangeHousingData({
                    ...housingData,
                    hirNumeroInspection: e.target.value
                  })
                }
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg font-mono font-bold text-emerald-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Superficie / Capacité
              </label>
              <input
                type="text"
                value={housingData.hirSuperficie}
                onChange={(e) =>
                  onChangeHousingData({ ...housingData, hirSuperficie: e.target.value })
                }
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>
        )}

        {currentStep === 1 && activeDocKey === 't12' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Autorité assermentatrice
              </label>
              <select
                value={housingData.declAutoriteType}
                onChange={(e) =>
                  onChangeHousingData({
                    ...housingData,
                    declAutoriteType: e.target
                      .value as HousingAndNotaryData['declAutoriteType']
                  })
                }
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="Notaire Public en Colombie-Britannique">
                  Notaire Public en Colombie-Britannique
                </option>
                <option value="Commissaire aux Affidavits">
                  Commissaire aux Affidavits
                </option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nom de l’Autorité
              </label>
              <input
                type="text"
                value={housingData.declAutoriteNom}
                onChange={(e) =>
                  onChangeHousingData({ ...housingData, declAutoriteNom: e.target.value })
                }
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                N° Commission / Licence
              </label>
              <input
                type="text"
                value={housingData.declAutoriteNumeroCommission}
                onChange={(e) =>
                  onChangeHousingData({
                    ...housingData,
                    declAutoriteNumeroCommission: e.target.value
                  })
                }
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Ville / Province de déclaration
              </label>
              <input
                type="text"
                value={housingData.declVilleProvince}
                onChange={(e) =>
                  onChangeHousingData({
                    ...housingData,
                    declVilleProvince: e.target.value
                  })
                }
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Jour / Mois &amp; Année
              </label>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  value={housingData.declJour}
                  onChange={(e) =>
                    onChangeHousingData({ ...housingData, declJour: e.target.value })
                  }
                  placeholder="Jour"
                  className="px-2.5 py-2 border border-slate-300 rounded-lg text-center"
                />
                <input
                  type="text"
                  value={housingData.declMoisAnnee}
                  onChange={(e) =>
                    onChangeHousingData({
                      ...housingData,
                      declMoisAnnee: e.target.value
                    })
                  }
                  placeholder="Mois Année"
                  className="col-span-2 px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>
          </div>
        )}

        {currentStep === 1 && activeDocKey === 'doc_es' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Référence dossier ATS
              </label>
              <input
                type="text"
                value={docEsData.referenceDossier}
                onChange={(e) =>
                  onChangeDocEsData({ ...docEsData, referenceDossier: e.target.value })
                }
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Spécialité métier
              </label>
              <input
                type="text"
                value={docEsData.specialiteMetier}
                onChange={(e) =>
                  onChangeDocEsData({ ...docEsData, specialiteMetier: e.target.value })
                }
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Années d’expérience
              </label>
              <input
                type="number"
                value={docEsData.anneesExperience}
                onChange={(e) =>
                  onChangeDocEsData({
                    ...docEsData,
                    anneesExperience: parseInt(e.target.value) || 0
                  })
                }
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Statut processus ATS
              </label>
              <select
                value={docEsData.statutProcessusAts}
                onChange={(e) =>
                  onChangeDocEsData({
                    ...docEsData,
                    statutProcessusAts: e.target
                      .value as FichesDocEsData['statutProcessusAts']
                  })
                }
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="Tri CV">Tri CV</option>
                <option value="Entretien RH">Entretien RH</option>
                <option value="Test Technique">Test Technique</option>
                <option value="Entretien Manager">Entretien Manager</option>
                <option value="Offre / Proposition">Offre / Proposition</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Synthèse du recruteur
              </label>
              <input
                type="text"
                value={docEsData.syntheseRecruteur}
                onChange={(e) =>
                  onChangeDocEsData({ ...docEsData, syntheseRecruteur: e.target.value })
                }
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* ÉTAPE 3 : DÉTAILS, CRITÈRES & CONDITIONS                            */}
        {/* =================================================================== */}
        {currentStep === 2 && activeDocKey === 't9' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Prise en charge Loyer mensuel
              </label>
              <select
                value={housingData.fraisLoyerOption}
                onChange={(e) =>
                  onChangeHousingData({
                    ...housingData,
                    fraisLoyerOption: e.target
                      .value as HousingAndNotaryData['fraisLoyerOption']
                  })
                }
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg bg-white font-semibold text-emerald-800"
              >
                <option value="100% employeur">100% employeur</option>
                <option value="Prise en charge partielle">Prise en charge partielle</option>
                <option value="À charge du salarié">À charge du salarié</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Eau / Électricité / Chauffage
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <select
                  value={housingData.fraisEau}
                  onChange={(e) =>
                    onChangeHousingData({
                      ...housingData,
                      fraisEau: e.target.value as 'Incluse' | 'Non incluse'
                    })
                  }
                  className="px-2 py-2 border border-slate-300 rounded-lg bg-white text-xs"
                >
                  <option value="Incluse">Eau: Oui</option>
                  <option value="Non incluse">Eau: Non</option>
                </select>
                <select
                  value={housingData.fraisElectricite}
                  onChange={(e) =>
                    onChangeHousingData({
                      ...housingData,
                      fraisElectricite: e.target.value as 'Incluse' | 'Non incluse'
                    })
                  }
                  className="px-2 py-2 border border-slate-300 rounded-lg bg-white text-xs"
                >
                  <option value="Incluse">Élec: Oui</option>
                  <option value="Non incluse">Élec: Non</option>
                </select>
                <select
                  value={housingData.fraisChauffage}
                  onChange={(e) =>
                    onChangeHousingData({
                      ...housingData,
                      fraisChauffage: e.target.value as 'Inclus' | 'Non inclus'
                    })
                  }
                  className="px-2 py-2 border border-slate-300 rounded-lg bg-white text-xs"
                >
                  <option value="Inclus">Chauf: Oui</option>
                  <option value="Non inclus">Chauf: Non</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Autres frais / équipements
              </label>
              <input
                type="text"
                value={housingData.fraisAutres}
                onChange={(e) =>
                  onChangeHousingData({ ...housingData, fraisAutres: e.target.value })
                }
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Lieu &amp; Date d’attestation
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={housingData.attestationLieu}
                  onChange={(e) =>
                    onChangeHousingData({
                      ...housingData,
                      attestationLieu: e.target.value
                    })
                  }
                  className="px-3 py-2 border border-slate-300 rounded-lg"
                />
                <input
                  type="text"
                  value={housingData.attestationDate}
                  onChange={(e) =>
                    onChangeHousingData({
                      ...housingData,
                      attestationDate: e.target.value
                    })
                  }
                  className="px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>
          </div>
        )}

        {currentStep === 2 && activeDocKey === 't10' && (
          <div className="space-y-4 text-sm pt-2">
            <div className="flex flex-wrap gap-5 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={housingData.notaireFormaliteDevantMoi}
                  onChange={(e) =>
                    onChangeHousingData({
                      ...housingData,
                      notaireFormaliteDevantMoi: e.target.checked
                    })
                  }
                />
                <span>Signée personnellement devant moi</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={housingData.notaireFormaliteReconnue}
                  onChange={(e) =>
                    onChangeHousingData({
                      ...housingData,
                      notaireFormaliteReconnue: e.target.checked
                    })
                  }
                />
                <span>Signature reconnue comme véritable</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={housingData.notaireFormaliteConforme}
                  onChange={(e) =>
                    onChangeHousingData({
                      ...housingData,
                      notaireFormaliteConforme: e.target.checked
                    })
                  }
                />
                <span>Déclaration volontaire &amp; conforme</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Lieu de certification notariale
                </label>
                <input
                  type="text"
                  value={housingData.notaireLieuCertification}
                  onChange={(e) =>
                    onChangeHousingData({
                      ...housingData,
                      notaireLieuCertification: e.target.value
                    })
                  }
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Date de certification
                </label>
                <input
                  type="text"
                  value={housingData.notaireDateCertification}
                  onChange={(e) =>
                    onChangeHousingData({
                      ...housingData,
                      notaireDateCertification: e.target.value
                    })
                  }
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>
          </div>
        )}

        {currentStep === 2 && activeDocKey === 't11' && (
          <div className="space-y-4 text-sm pt-2">
            <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-100 sticky top-0">
                  <tr>
                    <th className="p-2.5 border-b">Critère vérifié (12 points BC)</th>
                    <th className="p-2.5 border-b w-36">Statut</th>
                    <th className="p-2.5 border-b">Observations</th>
                  </tr>
                </thead>
                <tbody>
                  {housingData.hirCriteres.map((row, idx) => (
                    <tr key={row.id} className="border-b last:border-b-0">
                      <td className="p-2 font-semibold text-slate-800">{row.critere}</td>
                      <td className="p-2">
                        <select
                          value={row.conforme ? 'ok' : 'ko'}
                          onChange={(e) => {
                            const next = [...housingData.hirCriteres];
                            next[idx] = { ...row, conforme: e.target.value === 'ok' };
                            onChangeHousingData({ ...housingData, hirCriteres: next });
                          }}
                          className={`px-2 py-1.5 rounded border font-bold ${
                            row.conforme
                              ? 'text-emerald-800 bg-emerald-50'
                              : 'text-red-700 bg-red-50'
                          }`}
                        >
                          <option value="ok">Conforme</option>
                          <option value="ko">Non conforme</option>
                        </select>
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.observations}
                          onChange={(e) => {
                            const next = [...housingData.hirCriteres];
                            next[idx] = { ...row, observations: e.target.value };
                            onChangeHousingData({ ...housingData, hirCriteres: next });
                          }}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Conclusion Officielle HIR
              </label>
              <select
                value={housingData.hirConclusionStatut}
                onChange={(e) =>
                  onChangeHousingData({
                    ...housingData,
                    hirConclusionStatut: e.target
                      .value as HousingAndNotaryData['hirConclusionStatut']
                  })
                }
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg bg-white font-bold text-emerald-900"
              >
                <option value="Logement conforme aux normes d’habitation de Colombie-Britannique">
                  Logement conforme aux normes d’habitation de Colombie-Britannique
                </option>
                <option value="Logement conforme sous réserve des corrections mineures ci-dessus">
                  Logement conforme sous réserve des corrections mineures ci-dessus
                </option>
                <option value="Logement non conforme">Logement non conforme</option>
              </select>
            </div>
          </div>
        )}

        {currentStep === 2 && activeDocKey === 't12' && (
          <div className="space-y-4 text-sm pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Durée et conditions solennelles de prise en charge
              </label>
              <textarea
                rows={3}
                value={housingData.declDureeEtConditions}
                onChange={(e) =>
                  onChangeHousingData({
                    ...housingData,
                    declDureeEtConditions: e.target.value
                  })
                }
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg"
              />
            </div>
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600">
              <strong>Adresse de logement déclarée :</strong> {housingData.hebergementAdresseComplete},{' '}
              {housingData.hebergementVilleProvince} · Loyer : {housingData.fraisLoyerOption}
            </div>
          </div>
        )}

        {currentStep === 2 && activeDocKey === 'doc_es' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nom de l’évaluateur
              </label>
              <input
                type="text"
                value={docEsData.evaluateurNom}
                onChange={(e) =>
                  onChangeDocEsData({ ...docEsData, evaluateurNom: e.target.value })
                }
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Outils &amp; matériel fournis
              </label>
              <input
                type="text"
                value={docEsData.outilsMetiers}
                onChange={(e) =>
                  onChangeDocEsData({ ...docEsData, outilsMetiers: e.target.value })
                }
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Taux honoraires agence (%)
              </label>
              <input
                type="number"
                value={docEsData.tauxHonorairesAgencePct}
                onChange={(e) =>
                  onChangeDocEsData({
                    ...docEsData,
                    tauxHonorairesAgencePct: parseFloat(e.target.value) || 0
                  })
                }
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Garantie remplacement (mois)
              </label>
              <input
                type="number"
                value={docEsData.dureeGarantieRemplacementMois}
                onChange={(e) =>
                  onChangeDocEsData({
                    ...docEsData,
                    dureeGarantieRemplacementMois: parseInt(e.target.value) || 0
                  })
                }
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Code Test Personnalité
              </label>
              <input
                type="text"
                value={docEsData.codeAccesPersonnalite}
                onChange={(e) =>
                  onChangeDocEsData({
                    ...docEsData,
                    codeAccesPersonnalite: e.target.value
                  })
                }
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Décision Finale RH
              </label>
              <select
                value={docEsData.decisionEvaluation}
                onChange={(e) =>
                  onChangeDocEsData({
                    ...docEsData,
                    decisionEvaluation: e.target
                      .value as FichesDocEsData['decisionEvaluation']
                  })
                }
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg bg-white font-semibold"
              >
                <option value="Poursuivre le processus">Poursuivre le processus</option>
                <option value="Mettre en attente">Mettre en attente</option>
                <option value="Stopper le processus">Stopper le processus</option>
              </select>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* ÉTAPE 4 : VÉRIFICATION & GÉNÉRATION DU DOCUMENT IMITÉ               */}
        {/* =================================================================== */}
        {currentStep === 3 && (
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-xs">
                <span className="font-bold text-[#0B2545] uppercase tracking-wide block">
                  Mise en page active
                </span>
                {activeTemplate ? (
                  <>
                    <p className="font-semibold text-emerald-800 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Imitation active : {activeTemplate.sourceFileName}</span>
                    </p>
                    <p className="text-slate-600 font-mono">{activeTemplate.detectedSummary}</p>
                  </>
                ) : (
                  <p className="text-slate-600">
                    Mise en page officielle Atlantic Transport standard (A4 Portrait).
                  </p>
                )}
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-xs">
                <span className="font-bold text-[#0B2545] uppercase tracking-wide block">
                  Statut des Visuels ({getActorLabelForDocKey(activeDocKey)})
                </span>
                {activeUnresolvedMissing.length > 0 ? (
                  <div className="text-amber-800 font-semibold flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      {activeUnresolvedMissing.length} visuel(s) manquant(s) :{' '}
                      {activeUnresolvedMissing.map((x) => x.label).join(', ')}.{' '}
                      <button
                        type="button"
                        onClick={() => setCurrentStep(0)}
                        className="underline text-[#0066B3] cursor-pointer font-bold"
                      >
                        Importer à l’Étape 1
                      </button>
                    </span>
                  </div>
                ) : (
                  <p className="text-emerald-800 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Tous les visuels et tampons requis sont prêts.</span>
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => onJumpToStudioTab(activeDocKey)}
                className="min-h-[42px] px-4 py-2 rounded-lg bg-[#0B2545] hover:bg-[#134074] text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
              >
                <Eye className="w-4 h-4 text-amber-300" />
                <span>Ouvrir Aperçu &amp; Éditeur en Direct (ci-dessous)</span>
              </button>

              <button
                type="button"
                onClick={() => onDownloadDocPdf(activeDocKey)}
                className="min-h-[42px] px-4 py-2 rounded-lg bg-[#0066B3] hover:bg-[#005291] text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Télécharger PDF (Mise en page imitée)</span>
              </button>

              {activeDocKey !== 'doc_es' && (
                <button
                  type="button"
                  onClick={() => onDownloadDocWord(activeDocKey)}
                  className="min-h-[42px] px-4 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-[#0066B3]" />
                  <span>Télécharger Word (.docx)</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* PIED DE NAVIGATION PRÉCÉDENT / SUIVANT */}
        <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            disabled={currentStep === 0}
            onClick={() => setCurrentStep(currentStep - 1)}
            className="min-h-[38px] px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-800 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Étape précédente</span>
          </button>

          {currentStep < activeDef.steps.length - 1 ? (
            <button
              type="button"
              onClick={() => setCurrentStep(currentStep + 1)}
              className="min-h-[38px] px-4 py-2 rounded-lg bg-[#0066B3] hover:bg-[#005291] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span>Étape suivante</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onJumpToStudioTab(activeDocKey)}
              className="min-h-[38px] px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Voir le document généré ci-dessous</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
