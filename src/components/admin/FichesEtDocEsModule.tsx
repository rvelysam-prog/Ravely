import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  CheckCircle2,
  Printer,
  Copy,
  UserCheck,
  ShieldAlert,
  Send,
  Eye,
  Edit3,
  Search,
  Filter,
  Briefcase,
  Layers,
  ChevronRight,
  Save,
  Check,
  Building,
  Users,
  Wand2,
  AlertTriangle
} from 'lucide-react';
import { PostulantInfo } from '../../services/postulantDossierService';
import { SiteSettings } from '../../types';
import {
  FichesDocEsData,
  DOC_ES_MODELS_CATALOG,
  KIT_LAYOUT_PRESETS,
  KIT_HEADER_PRESETS,
  KitDocHeaderMap,
  KitDocLayoutMap,
  KitDocVisualScopeMap,
  getDocEsActorRequirement,
  resolveActorAssetsForDocEsModel,
  renderDocEsPlainText,
  generateSingleDocEsPdfAsync,
  resolveLayoutTemplateForDocEsModel,
  computeAdaptivePageFitMetrics,
  saveFichesDocEsData
} from '../../services/fichesEtDocEsService';
import {
  ActorScopeId,
  PdfImportedAssetsConfig,
  UploadedAssetUrlsMap
} from '../../services/departmentsAndEmailService';
import { downloadWordDocument } from '../../services/cricContractService';
import {
  LayoutTemplatesMap,
  ReferenceLayoutTemplate,
  SpatialBlueprint,
  resolveEffectiveLayout
} from '../../services/layoutImitationService';

interface FichesEtDocEsModuleProps {
  postulant: PostulantInfo;
  docEsData: FichesDocEsData;
  onChangeDocEsData: (updated: FichesDocEsData) => void;
  settings: SiteSettings;
  layoutTemplate?: ReferenceLayoutTemplate;
  layoutTemplates?: LayoutTemplatesMap;
  kitDocLayouts?: KitDocLayoutMap;
  onChangeKitDocLayout?: (modelId: number, presetId: string) => void;
  kitDocHeaders?: KitDocHeaderMap;
  onChangeKitDocHeader?: (modelId: number, headerId: string) => void;
  kitDocVisualScopes?: KitDocVisualScopeMap;
  onChangeKitDocVisualScope?: (modelId: number, scope: ActorScopeId | 'auto') => void;
  uploadedAssets?: UploadedAssetUrlsMap;
  assetsConfig?: PdfImportedAssetsConfig;
  onOpenInWebmail?: (html: string) => void;
  onToast: (msg: string) => void;
}

export const FichesEtDocEsModule: React.FC<FichesEtDocEsModuleProps> = ({
  postulant,
  docEsData,
  onChangeDocEsData,
  settings,
  layoutTemplate,
  layoutTemplates,
  kitDocLayouts,
  onChangeKitDocLayout,
  kitDocHeaders,
  onChangeKitDocHeader,
  kitDocVisualScopes,
  onChangeKitDocVisualScope,
  uploadedAssets,
  assetsConfig,
  onOpenInWebmail,
  onToast
}) => {
  // Sélection du canal (Candidature en direct vs Via agence)
  const [selectedCanal, setSelectedCanal] = useState<'direct' | 'agence'>(
    postulant.casType === 'agence' ? 'agence' : 'direct'
  );

  // Modèle actuellement sélectionné
  const [selectedModelId, setSelectedModelId] = useState<number>(
    selectedCanal === 'direct' ? 1 : 9
  );

  // Synchroniser automatiquement le canal si le casType du postulant change
  useEffect(() => {
    const nextCanal = postulant.casType === 'agence' ? 'agence' : 'direct';
    setSelectedCanal(nextCanal);
    setSelectedModelId((cur) => {
      if (nextCanal === 'direct' && (cur < 1 || cur > 8)) return 1;
      if (nextCanal === 'agence' && (cur < 9 || cur > 15)) return 9;
      return cur;
    });
  }, [postulant.casType]);

  // Mode de visualisation : 'preview' (Lecture / PDF) ou 'form' (Formulaire interactif si applicable)
  const [viewMode, setViewMode] = useState<'preview' | 'form'>('preview');

  // Filtre de recherche
  const [searchTerm, setSearchTerm] = useState('');

  // Rôle actif pour la visualisation des permissions
  const [userRole, setUserRole] = useState<'admin' | 'recruteur' | 'candidat'>('admin');

  // Définition exhaustive centralisée des 15 modèles
  const modelsCatalog = DOC_ES_MODELS_CATALOG;

  // Modèles filtrés par canal et terme de recherche
  const filteredModels = modelsCatalog.filter(
    (m) =>
      m.canal === selectedCanal &&
      (m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.number.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const activeModel = modelsCatalog.find((m) => m.id === selectedModelId) || modelsCatalog[0];
  const actorReq = getDocEsActorRequirement(selectedModelId);
  const resolvedActorVisuals = resolveActorAssetsForDocEsModel(
    selectedModelId,
    postulant,
    uploadedAssets,
    assetsConfig,
    kitDocVisualScopes?.[selectedModelId]
  );
  const resolvedModelLayout = resolveLayoutTemplateForDocEsModel(
    selectedModelId,
    layoutTemplates,
    kitDocLayouts,
    layoutTemplate,
    kitDocHeaders,
    docEsData.customModelLayouts
  );
  const effectiveLayout = resolveEffectiveLayout(resolvedModelLayout);
  const bp: SpatialBlueprint | undefined = effectiveLayout?.spatialBlueprint;
  const renderedContent = renderDocEsPlainText(selectedModelId, postulant, docEsData, settings);
  const cleanPreviewContent = renderedContent.content
    .replace(/^[=\-_]{4,}\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  const adaptiveFit = computeAdaptivePageFitMetrics(cleanPreviewContent, resolvedModelLayout, {
    hasSignatures: Boolean(resolvedActorVisuals.signature.url || resolvedActorVisuals.cachet.url),
    hasSubtitle: Boolean(renderedContent.subtitle),
    hasRefPill: bp?.hasRefPill
  });

  const handleApplyBalancedLayout = async () => {
    const modelKey = String(selectedModelId);
    const prevAll = docEsData.customModelLayouts || {};
    const updated: FichesDocEsData = {
      ...docEsData,
      customModelLayouts: {
        ...prevAll,
        [modelKey]: {
          ...(prevAll[modelKey] || {}),
          autoFitToPage: true,
          fontSizePt: adaptiveFit.fontSizePt,
          lineHeight: adaptiveFit.lineHeight,
          paragraphSpacingMm: adaptiveFit.paragraphSpacingMm,
          marginsMm: { ...adaptiveFit.marginsMm }
        }
      }
    };
    onChangeDocEsData(updated);
    await saveFichesDocEsData(postulant.id, updated);
    onToast(`Mise en page vérifiée et équilibrée pour ${activeModel.number} (${adaptiveFit.fillPct}% · interligne ${adaptiveFit.lineHeight}).`);
  };

  // Téléchargement PDF (avec mise en page, en-tête du document & visuels stricts des 6 Parties)
  const handleDownloadPdf = async () => {
    const { doc, filename } = await generateSingleDocEsPdfAsync(
      selectedModelId,
      postulant,
      docEsData,
      settings,
      { ...(layoutTemplates || {}), ...(layoutTemplate ? { doc_es: layoutTemplate } : {}) },
      kitDocLayouts,
      uploadedAssets,
      assetsConfig,
      kitDocVisualScopes,
      kitDocHeaders
    );
    doc.save(filename);
    onToast(`Document PDF ${activeModel.number} téléchargé avec mise en page, en-tête et visuels appliqués !`);
  };

  // Téléchargement Word (.docx)
  const handleDownloadWord = () => {
    const title = bp?.titleUppercase ? activeModel.title.toUpperCase() : activeModel.title;
    const primary = effectiveLayout?.primaryColor || '#0B2545';
    const tint = effectiveLayout?.highlightTintColor || '#D8F3EB';
    const fontCss =
      effectiveLayout?.fontFamily === 'times'
        ? 'Georgia, "Times New Roman", serif'
        : effectiveLayout?.fontFamily === 'courier'
        ? '"Courier New", monospace'
        : 'Calibri, Segoe UI, Arial, sans-serif';
    const titleAlign = bp?.titleAlign || (effectiveLayout?.headerAlign === 'left' ? 'left' : 'center');
    const refPillHtml = bp?.hasRefPill
      ? `<p style="display:inline-block; background:${tint}; color:${primary}; padding:3px 8px; font-weight:bold; font-size:10pt;">Vos références · ${docEsData.referenceDossier}</p>`
      : `<p style="font-size:9.5pt; color:#475569;">Réf. Dossier : <strong>${docEsData.referenceDossier}</strong> · Date : ${postulant.dateEffet}</p>`;

    downloadWordDocument(
      `DOC_ES_${activeModel.number.replace(/\s+/g, '_')}_${postulant.nom.toUpperCase()}`,
      activeModel.title,
      `<div style="font-family: ${fontCss}; color: ${effectiveLayout?.bodyTextColor || '#1e293b'};">
        <p style="font-weight:bold; color:${primary}; margin-bottom:2px;">${resolvedActorVisuals.primaryEntityName}${resolvedActorVisuals.secondaryEntityName ? ` &amp; ${resolvedActorVisuals.secondaryEntityName}` : ''}</p>
        <p style="font-size:9pt; color:#475569; margin:0 0 6px 0;">${resolvedActorVisuals.primarySubLine} · ${actorReq.badgeLabel}</p>
        ${refPillHtml}
        <h1 style="text-align:${titleAlign}; color:#0f172a; font-size:16pt; margin:14px 0 4px 0;">${title}</h1>
        <p style="text-align:${titleAlign}; color:#475569; font-size:10pt; margin:0 0 14px 0;">${renderedContent.subtitle}</p>
        <div style="white-space: pre-wrap; font-family: ${fontCss}; font-size: ${Math.max(9, Math.round((adaptiveFit.fontSizePt + 0.8) * 10) / 10)}pt; line-height: ${adaptiveFit.lineHeight};">${cleanPreviewContent}</div>
      </div>`
    );
    onToast(`Document Word (.docx) exporté !`);
  };

  // Copie texte brut
  const handleCopyText = () => {
    navigator.clipboard?.writeText(renderedContent.content);
    onToast('Texte du document copié dans le presse-papiers !');
  };

  // Soumission d'un formulaire interactif
  const handleSubmitInteractiveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveFichesDocEsData(postulant.id, docEsData);
    onToast(`Formulaire ${activeModel.number} enregistré avec succès dans la base de données !`);
    setViewMode('preview');
  };

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. EN-TÊTE DU MODULE "Fiches et DOC ES" AVEC FILTRES & RÔLES              */}
      {/* ========================================================================= */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-[#0B2545] to-[#134074] text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#D4A017] text-slate-950 uppercase tracking-wider">
              Module Officiel
            </span>
            <span className="text-xs text-blue-200">15 Modèles Structurés ATS &amp; Agence</span>
          </div>
          <h2 className="text-lg sm:text-xl font-black tracking-tight text-white mt-1 flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-400" />
            <span>Fiches et DOC ES</span>
          </h2>
          <p className="text-xs text-slate-300">
            Génération automatisée et centralisée de tous les documents de recrutement selon les normes canadiennes
          </p>
        </div>

        {/* Sélecteur de rôle & canal */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-900/60 p-2 rounded-xl border border-white/10">
          <span className="text-[11px] text-slate-300 font-bold">Rôle actif :</span>
          <div className="flex gap-1">
            {(['admin', 'recruteur', 'candidat'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setUserRole(r)}
                className={`px-2 py-1 text-[10px] font-bold rounded capitalize cursor-pointer transition-colors ${
                  userRole === r ? 'bg-amber-400 text-slate-950 shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
              >
                {r === 'admin' ? 'Admin RH' : r === 'recruteur' ? 'Recruteur' : 'Candidat'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. TYPOLOGIE : SÉPARATION STRICTE DES CANAUX (DIRECT VS VIA AGENCE)       */}
      {/* ========================================================================= */}
      <div className="bg-slate-100 border border-slate-200 rounded-2xl p-2 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => {
              setSelectedCanal('direct');
              setSelectedModelId(1);
            }}
            className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              selectedCanal === 'direct'
                ? 'bg-[#0B2545] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <UserCheck className="w-4 h-4 text-amber-400" />
            <span>Partie 1 : Candidature en direct (Sans intermédiaire)</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-blue-900/40 text-blue-200">
              Modèles 1 à 8
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedCanal('agence');
              setSelectedModelId(9);
            }}
            className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              selectedCanal === 'agence'
                ? 'bg-[#0B2545] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Building className="w-4 h-4 text-emerald-400" />
            <span>Partie 2 : Via Agence de Placement (Prestataire)</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-blue-900/40 text-blue-200">
              Modèles 9 à 15
            </span>
          </button>
        </div>

        {/* Barre de recherche */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher une fiche ou un modèle..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white rounded-xl border border-slate-300 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. GRILLE DE GAUCHE : LISTE DES MODÈLES & GRILLE DE DROITE : VISIONNEUSE   */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Colonne gauche : Liste des modèles classés (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1 flex items-center justify-between">
            <span>{selectedCanal === 'direct' ? '8 Modèles Candidature Directe' : '7 Modèles Agence Mandataire'}</span>
            <span className="text-[10px] text-blue-700">Sélectionnez pour prévisualiser</span>
          </div>

          <div className="space-y-2 max-h-[700px] overflow-y-auto pr-1">
            {filteredModels.map((m) => {
              const isSelected = selectedModelId === m.id;
              const isInternal = m.category === 'interne';

              return (
                <div
                  key={m.id}
                  onClick={() => {
                    setSelectedModelId(m.id);
                    setViewMode('preview');
                  }}
                  className={`p-3.5 rounded-xl border text-xs transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-blue-50/80 border-[#0066B3] shadow-xs ring-1 ring-[#0066B3]'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isInternal
                          ? 'bg-slate-200 text-slate-800'
                          : m.category === 'tripartite'
                          ? 'bg-purple-100 text-purple-900 font-extrabold'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {m.number} · {isInternal ? 'Interne RH' : m.category === 'tripartite' ? 'Tripartite' : 'Remis Candidat'}
                    </span>

                    {m.isInteractive && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                        Formulaire Interactif
                      </span>
                    )}
                  </div>

                  <h4 className="font-bold text-slate-900 text-sm mt-0.5 flex items-center justify-between">
                    <span>{m.title}</span>
                    <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${isSelected ? 'rotate-90 text-[#0066B3]' : 'text-slate-400'}`} />
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                    {m.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Colonne droite : Espace de visualisation et formulaire interactif (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Barre d'action supérieure du document sélectionné */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase">{activeModel.number}</span>
                {activeModel.isInteractive && (
                  <span className="text-[10px] bg-blue-100 text-blue-900 px-2 py-0.5 rounded font-bold">
                    Mode Remplissage Disponible
                  </span>
                )}
              </div>
              <h3 className="font-black text-sm text-[#0B2545]">{activeModel.title}</h3>
            </div>

            {/* Boutons d'actions : Téléchargement PDF, Word, Impression & Formulaire */}
            <div className="flex flex-wrap items-center gap-2">
              {activeModel.isInteractive && (
                <button
                  type="button"
                  onClick={() => setViewMode(viewMode === 'form' ? 'preview' : 'form')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl border flex items-center gap-1.5 cursor-pointer transition-colors ${
                    viewMode === 'form'
                      ? 'bg-amber-400 text-slate-950 border-amber-500'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{viewMode === 'form' ? 'Voir Aperçu Structuré' : 'Remplir Formulaire'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleDownloadPdf}
                className="px-3 py-1.5 text-xs font-bold bg-[#0B2545] hover:bg-[#134074] text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Télécharger en PDF structuré"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>Export PDF</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadWord}
                className="px-3 py-1.5 text-xs font-bold bg-blue-700 hover:bg-blue-800 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Télécharger au format Word (.docx)"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Word (.docx)</span>
              </button>

              <button
                type="button"
                onClick={handleCopyText}
                className="p-1.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                title="Copier le texte formaté"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>

            {(onChangeKitDocLayout || onChangeKitDocHeader || onChangeKitDocVisualScope) && (
              <div className="w-full pt-3 mt-1 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                {onChangeKitDocLayout && (
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase text-slate-500">
                      Mise en page de ce document
                    </span>
                    <select
                      value={kitDocLayouts?.[selectedModelId] || 'auto_doc'}
                      onChange={(e) => onChangeKitDocLayout(selectedModelId, e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-slate-50 font-semibold text-slate-800 cursor-pointer"
                    >
                      {KIT_LAYOUT_PRESETS.map((pr) => (
                        <option key={pr.id} value={pr.id}>
                          {pr.label}
                        </option>
                      ))}
                      {layoutTemplates?.t9 && <option value="import_t9">Modèle importé Onglet 9 (Hébergement)</option>}
                      {layoutTemplates?.t10 && <option value="import_t10">Modèle importé Onglet 10 (Notaire)</option>}
                      {layoutTemplates?.t11 && <option value="import_t11">Modèle importé Onglet 11 (HIR)</option>}
                      {layoutTemplates?.t12 && <option value="import_t12">Modèle importé Onglet 12 (Déclaration)</option>}
                    </select>
                  </label>
                )}
                {onChangeKitDocHeader && (
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase text-slate-500">
                      Modèle d&apos;en-tête
                    </span>
                    <select
                      value={kitDocHeaders?.[selectedModelId] || 'auto_header'}
                      onChange={(e) => onChangeKitDocHeader(selectedModelId, e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-slate-50 font-semibold text-slate-800 cursor-pointer"
                    >
                      {KIT_HEADER_PRESETS.map((hp) => (
                        <option key={hp.id} value={hp.id}>
                          {hp.label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {onChangeKitDocVisualScope && (
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase text-slate-500">
                      Visuels ({actorReq.badgeLabel})
                    </span>
                    <select
                      value={kitDocVisualScopes?.[selectedModelId] || 'auto'}
                      onChange={(e) =>
                        onChangeKitDocVisualScope(selectedModelId, e.target.value as ActorScopeId | 'auto')
                      }
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-slate-50 font-semibold text-slate-800 cursor-pointer"
                    >
                      <option value="auto">Automatique ({actorReq.badgeLabel})</option>
                      <option value="employeur">1. Entreprise Employeur</option>
                      <option value="prestataire">2. Cabinet CRIC (Agence)</option>
                      <option value="hebEmployeur">3. Hébergement (Onglet 9)</option>
                      <option value="notaire">4. Notaire BC (Onglet 10)</option>
                      <option value="inspecteurHir">5. Inspecteur HIR (Onglet 11)</option>
                      <option value="commissaireDeclaration">6. Déclaration (Onglet 12)</option>
                    </select>
                  </label>
                )}
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* VUE 1 : APERÇU STRUCTURÉ (VÉRIFIÉ ANTI-VIDE & ANTI-MÉLANGE)               */}
          {/* ========================================================================= */}
          {viewMode === 'preview' && (
            <div className="space-y-3">
              <div className="px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2 text-slate-700">
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {adaptiveFit.statusLabel}
                    </span>
                    <span className="text-slate-300">·</span>
                    <span>Occupation : <strong>{adaptiveFit.fillPct}%</strong> ({adaptiveFit.estimatedPages} p.)</span>
                    <span className="text-slate-300">·</span>
                    <span>Police <strong>{adaptiveFit.fontSizePt}pt</strong> · Interligne <strong>{adaptiveFit.lineHeight}</strong></span>
                  </div>
                  {adaptiveFit.warnings.length > 0 && (
                    <div className="flex items-center gap-1.5 text-[11px] text-amber-800">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>{adaptiveFit.warnings.join(' · ')}</span>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleApplyBalancedLayout}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>Vérifier &amp; Adapter à la page</span>
                </button>
              </div>

            <div
              className="rounded-sm shadow-sm flex flex-col justify-between transition-all relative overflow-hidden"
              style={{
                backgroundColor: effectiveLayout?.pageBgColor || '#ffffff',
                minHeight: `${Math.min(1060, Math.max(680, Math.round(adaptiveFit.minPaperHeightPx * 0.72)))}px`,
                borderTop:
                  effectiveLayout?.borderStyle === 'double'
                    ? `4px double ${effectiveLayout.borderColor || '#0B2545'}`
                    : effectiveLayout?.borderStyle === 'simple'
                    ? `2px solid ${effectiveLayout.borderColor || '#0B2545'}`
                    : '1px solid #e2e8f0',
                borderRight:
                  effectiveLayout?.borderStyle === 'double'
                    ? `4px double ${effectiveLayout.borderColor || '#0B2545'}`
                    : effectiveLayout?.borderStyle === 'simple'
                    ? `2px solid ${effectiveLayout.borderColor || '#0B2545'}`
                    : '1px solid #e2e8f0',
                borderBottom:
                  effectiveLayout?.borderStyle === 'double'
                    ? `4px double ${effectiveLayout.borderColor || '#0B2545'}`
                    : effectiveLayout?.borderStyle === 'simple'
                    ? `2px solid ${effectiveLayout.borderColor || '#0B2545'}`
                    : '1px solid #e2e8f0',
                borderLeft: bp?.hasLeftAccentStripe
                  ? `6px solid ${effectiveLayout?.primaryColor || '#0B2545'}`
                  : effectiveLayout?.borderStyle === 'double'
                  ? `4px double ${effectiveLayout.borderColor || '#0B2545'}`
                  : effectiveLayout?.borderStyle === 'simple'
                  ? `2px solid ${effectiveLayout.borderColor || '#0B2545'}`
                  : '1px solid #e2e8f0',
                paddingTop: `${Math.max(20, Math.round(adaptiveFit.padTopPx * 0.65))}px`,
                paddingRight: `${Math.max(20, Math.round(adaptiveFit.padRightPx * 0.65))}px`,
                paddingBottom: `${Math.max(20, Math.round(adaptiveFit.padBottomPx * 0.65))}px`,
                paddingLeft: `${Math.max(20, Math.round(adaptiveFit.padLeftPx * 0.65))}px`,
                fontFamily:
                  effectiveLayout?.fontFamily === 'times'
                    ? 'Georgia, "Times New Roman", serif'
                    : effectiveLayout?.fontFamily === 'courier'
                    ? '"Courier New", monospace'
                    : 'system-ui, -apple-system, sans-serif',
                color: effectiveLayout?.bodyTextColor || '#1e293b'
              }}
            >
              {/* Visuels de fond & filigrane strictement liés à l'acteur du document */}
              {resolvedActorVisuals.arrierePlan.url && (
                <img
                  src={resolvedActorVisuals.arrierePlan.url}
                  alt=""
                  className="pointer-events-none select-none absolute inset-0 w-full h-full object-cover opacity-15"
                />
              )}
              {resolvedActorVisuals.filigrane.url && (
                <img
                  src={resolvedActorVisuals.filigrane.url}
                  alt=""
                  className="pointer-events-none select-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 max-h-48 opacity-10 object-contain"
                />
              )}

              {/* Bandeau d'accentuation supérieur si top_accent_bar */}
              {bp?.headerLayout === 'top_accent_bar' && (
                <div
                  className="-mx-7 -mt-7 mb-4 h-2 relative z-10"
                  style={{ backgroundColor: effectiveLayout?.primaryColor || '#0B2545' }}
                />
              )}

              {/* En-tête de page piloté par le modèle d'en-tête & l'acteur strict */}
              {bp ? (
                <div className="space-y-3 relative z-10">
                  {bp.headerLayout === 'filled_banner' ? (
                    <div
                      className="p-4 rounded-md flex flex-wrap items-center justify-between gap-3 text-white"
                      style={{
                        backgroundColor: effectiveLayout?.headerBgColor || effectiveLayout?.primaryColor || '#0B2545',
                        borderBottom: `3px solid ${effectiveLayout?.accentColor || '#D4A017'}`
                      }}
                    >
                      <div className="flex items-center gap-3">
                        {resolvedActorVisuals.logo.url && (
                          <img
                            src={resolvedActorVisuals.logo.url}
                            alt={resolvedActorVisuals.primaryEntityName}
                            className="h-10 max-w-[110px] object-contain bg-white p-1 rounded"
                          />
                        )}
                        <div>
                          <h4 className="font-extrabold text-base">{resolvedActorVisuals.primaryEntityName}</h4>
                          <p className="text-[11px] opacity-85">{resolvedActorVisuals.primarySubLine} · {activeModel.number}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right text-[11px]">
                          <div className="font-bold">Réf : {docEsData.referenceDossier}</div>
                          <div className="opacity-85">Date : {postulant.dateEffet}</div>
                        </div>
                        {resolvedActorVisuals.logoSecondary?.url && (
                          <img
                            src={resolvedActorVisuals.logoSecondary.url}
                            alt={resolvedActorVisuals.secondaryEntityName || ''}
                            className="h-9 max-w-[90px] object-contain bg-white p-1 rounded"
                          />
                        )}
                      </div>
                    </div>
                  ) : bp.headerLayout === 'centered_stack' ? (
                    <div
                      className="text-center pb-3 space-y-1.5"
                      style={{
                        borderBottom: bp.headerHasDivider
                          ? `2px solid ${effectiveLayout?.primaryColor || '#0B2545'}`
                          : undefined
                      }}
                    >
                      {resolvedActorVisuals.logo.url && (
                        <img
                          src={resolvedActorVisuals.logo.url}
                          alt={resolvedActorVisuals.primaryEntityName}
                          className="h-10 max-w-[130px] object-contain mx-auto"
                        />
                      )}
                      <h4
                        className="font-extrabold text-lg"
                        style={{ color: effectiveLayout?.primaryColor || '#0B2545' }}
                      >
                        {resolvedActorVisuals.primaryEntityName}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {resolvedActorVisuals.primarySubLine} · Réf : {docEsData.referenceDossier}
                      </p>
                    </div>
                  ) : (
                    <div
                      className="flex flex-wrap items-start justify-between gap-3 pb-2.5"
                      style={{
                        borderBottom: bp.headerHasDivider
                          ? `2px solid ${effectiveLayout?.accentColor || effectiveLayout?.primaryColor || '#0B2545'}`
                          : undefined
                      }}
                    >
                      <div className="flex items-center gap-3">
                        {resolvedActorVisuals.logo.url && (
                          <img
                            src={resolvedActorVisuals.logo.url}
                            alt={resolvedActorVisuals.primaryEntityName}
                            className="h-10 max-w-[115px] object-contain"
                          />
                        )}
                        <div>
                          <h4
                            className="font-extrabold text-base sm:text-lg tracking-tight"
                            style={{ color: effectiveLayout?.primaryColor || '#0B2545' }}
                          >
                            {resolvedActorVisuals.primaryEntityName}
                          </h4>
                          <p className="text-[11px] text-slate-600">{resolvedActorVisuals.primarySubLine}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {bp.headerLayout === 'split_lr' ? (
                          <div className="text-right text-[11px] text-slate-600">
                            <span className="font-bold block" style={{ color: effectiveLayout?.primaryColor || '#0B2545' }}>
                              {resolvedActorVisuals.secondaryEntityName || `Réf : ${docEsData.referenceDossier}`}
                            </span>
                            <span>
                              {resolvedActorVisuals.secondaryEntityName
                                ? `Réf : ${docEsData.referenceDossier} · ${postulant.dateEffet}`
                                : `Date : ${postulant.dateEffet}`}
                            </span>
                          </div>
                        ) : bp.hasTopRightMarker ? (
                          <div className="w-3 h-3 border border-slate-300 flex items-center justify-center shrink-0">
                            <div className="w-1.5 h-1.5 bg-slate-900" />
                          </div>
                        ) : null}
                        {resolvedActorVisuals.logoSecondary?.url && (
                          <img
                            src={resolvedActorVisuals.logoSecondary.url}
                            alt={resolvedActorVisuals.secondaryEntityName || ''}
                            className="h-9 max-w-[95px] object-contain"
                          />
                        )}
                      </div>
                    </div>
                  )}

                  {/* Bloc Métadonnées selon metaLayout */}
                  {(bp.metaLayout === 'two_col_asymmetric' || bp.metaLayout === 'two_col_equal') && (
                    <div className="grid grid-cols-2 gap-4 text-[11px] text-slate-700 pt-1">
                      <div>
                        <div className="font-bold text-slate-900">{resolvedActorVisuals.primaryEntityName}</div>
                        <div>{postulant.intitulePoste} · CNP {postulant.codeCnp}</div>
                      </div>
                      <div className={bp.metaLayout === 'two_col_asymmetric' ? 'text-right pt-2' : 'text-right'}>
                        <div className="font-bold text-slate-900">CANDIDAT : {postulant.nomComplet.toUpperCase()}</div>
                        <div>Code ID : {postulant.codeIdCandidature}</div>
                      </div>
                    </div>
                  )}

                  {bp.metaLayout === 'boxed_grid' && (
                    <div className="grid grid-cols-2 border border-slate-300 bg-slate-50 text-[11px]">
                      <div className="p-2 border-r border-slate-300">
                        <div className="font-bold text-slate-900">{resolvedActorVisuals.primaryEntityName}</div>
                        <div className="text-slate-600">{resolvedActorVisuals.primarySubLine}</div>
                      </div>
                      <div className="p-2">
                        <div className="font-bold text-slate-900">{postulant.nomComplet}</div>
                        <div className="text-slate-600">Dossier : {docEsData.referenceDossier}</div>
                      </div>
                    </div>
                  )}

                  {bp.hasRefPill && (
                    <div className="space-y-1 text-[11px]">
                      <span
                        className="inline-block px-2.5 py-0.5 rounded-sm font-bold"
                        style={{
                          backgroundColor: effectiveLayout?.highlightTintColor || '#D8F3EB',
                          color: effectiveLayout?.primaryColor || '#0B663A'
                        }}
                      >
                        Vos références · {actorReq.badgeLabel}
                      </span>
                      <div className="text-slate-700">
                        N° Dossier : <strong className="text-slate-900">{docEsData.referenceDossier}</strong> · Date :{' '}
                        <strong className="text-slate-900">{postulant.dateEffet}</strong>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className="pb-3 flex items-center justify-between relative z-10"
                  style={{ borderBottom: `2px solid ${effectiveLayout?.accentColor || '#D4A017'}` }}
                >
                  <div className="flex items-center gap-3">
                    {resolvedActorVisuals.logo.url && (
                      <img
                        src={resolvedActorVisuals.logo.url}
                        alt={resolvedActorVisuals.primaryEntityName}
                        className="h-10 max-w-[110px] object-contain"
                      />
                    )}
                    <div>
                      <h4
                        className="font-bold text-sm"
                        style={{ color: effectiveLayout?.primaryColor || '#0B2545' }}
                      >
                        {resolvedActorVisuals.primaryEntityName}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {resolvedActorVisuals.primarySubLine} · {activeModel.number}
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-[11px] text-slate-600">
                    <span
                      className="font-bold block"
                      style={{ color: effectiveLayout?.primaryColor || '#1e3a8a' }}
                    >
                      Réf : {docEsData.referenceDossier}
                    </span>
                    <span>Date : {postulant.dateEffet}</span>
                  </div>
                </div>
              )}

              {/* Titre et sous-titre */}
              <div
                className={bp?.titleHasBox ? 'py-2.5 px-4 rounded-sm' : 'py-1.5'}
                style={{
                  textAlign: bp?.titleAlign || 'center',
                  backgroundColor: bp?.titleHasBox
                    ? effectiveLayout?.highlightTintColor || '#f1f5f9'
                    : 'transparent',
                  borderTop: bp?.titleHasBox
                    ? `1.5px solid ${effectiveLayout?.primaryColor || '#0B2545'}`
                    : undefined,
                  borderRight: bp?.titleHasBox
                    ? `1.5px solid ${effectiveLayout?.primaryColor || '#0B2545'}`
                    : undefined,
                  borderLeft: bp?.titleHasBox
                    ? `1.5px solid ${effectiveLayout?.primaryColor || '#0B2545'}`
                    : undefined,
                  borderBottom: bp?.titleHasUnderline
                    ? `2px solid ${effectiveLayout?.accentColor || '#D4A017'}`
                    : bp?.titleHasBox
                    ? `1.5px solid ${effectiveLayout?.primaryColor || '#0B2545'}`
                    : undefined
                }}
              >
                <h3
                  className={`font-bold text-base tracking-tight ${bp?.titleUppercase ? 'uppercase' : ''}`}
                  style={{
                    color: bp?.titleHasBox
                      ? effectiveLayout?.primaryColor || '#0B2545'
                      : '#0f172a'
                  }}
                >
                  {renderedContent.title}
                </h3>
                {renderedContent.subtitle && (bp ? bp.titleHasSubtitle : true) && (
                  <p className="text-[11px] mt-0.5 text-slate-500">
                    {renderedContent.subtitle}
                  </p>
                )}
              </div>

              {/* Contenu formaté propre sans lignes =====, avec interligne adaptatif */}
              <div
                className={
                  bp?.bodyLayout === 'cards'
                    ? 'whitespace-pre-wrap bg-slate-50/70 p-4 rounded-lg border border-slate-200 overflow-x-auto flex-1'
                    : 'whitespace-pre-wrap flex-1 py-2'
                }
                style={{
                  color: effectiveLayout?.bodyTextColor || '#1e293b',
                  fontSize: `${adaptiveFit.webFontPx}px`,
                  lineHeight: adaptiveFit.webLineHeight,
                  fontFamily:
                    effectiveLayout?.fontFamily === 'times'
                      ? 'Georgia, "Times New Roman", serif'
                      : effectiveLayout?.fontFamily === 'courier'
                      ? 'ui-monospace, SFMono-Regular, Menlo, monospace'
                      : 'system-ui, -apple-system, sans-serif'
                }}
              >
                {cleanPreviewContent}
              </div>

              {/* Signatures, cachets & codes auth strictement propres à l'acteur du document */}
              {(resolvedActorVisuals.signature.url ||
                resolvedActorVisuals.cachet.url ||
                resolvedActorVisuals.signatureSecondary?.url ||
                resolvedActorVisuals.cachetSecondary?.url ||
                resolvedActorVisuals.barcode.url ||
                resolvedActorVisuals.qrcode.url) && (
                <div className="relative z-10 pt-3 mt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {resolvedActorVisuals.barcode.url && (
                      <img src={resolvedActorVisuals.barcode.url} alt="Code-Barres" className="h-7 object-contain" />
                    )}
                    {resolvedActorVisuals.qrcode.url && (
                      <img src={resolvedActorVisuals.qrcode.url} alt="QR Code" className="w-10 h-10 object-contain border border-slate-200 rounded bg-white p-0.5" />
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    {(resolvedActorVisuals.cachetSecondary?.url || resolvedActorVisuals.signatureSecondary?.url) && (
                      <div className="text-right">
                        <span className="block text-[9px] font-bold text-slate-500 uppercase">
                          {resolvedActorVisuals.secondaryEntityName || 'Seconde partie'}
                        </span>
                        <div className="flex items-center gap-2 justify-end mt-0.5">
                          {resolvedActorVisuals.cachetSecondary?.url && (
                            <img src={resolvedActorVisuals.cachetSecondary.url} alt="Cachet 2" className="h-10 object-contain" />
                          )}
                          {resolvedActorVisuals.signatureSecondary?.url && (
                            <img src={resolvedActorVisuals.signatureSecondary.url} alt="Signature 2" className="h-8 object-contain" />
                          )}
                        </div>
                      </div>
                    )}
                    <div className="text-right">
                      <span className="block text-[9px] font-bold text-slate-500 uppercase">
                        {resolvedActorVisuals.primaryEntityName}
                      </span>
                      <div className="flex items-center gap-2 justify-end mt-0.5">
                        {resolvedActorVisuals.cachet.url && (
                          <img src={resolvedActorVisuals.cachet.url} alt="Cachet officiel" className="h-11 object-contain" />
                        )}
                        {resolvedActorVisuals.signature.url && (
                          <img src={resolvedActorVisuals.signature.url} alt="Signature officielle" className="h-9 object-contain" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Pied de page certifié selon footerLayout */}
              {(!bp || bp.footerLayout !== 'none') && (
                <div
                  className={`relative z-10 pt-3 flex items-center text-[10px] text-slate-500 ${
                    bp?.footerLayout === 'centered_legal' ? 'justify-center text-center' : 'justify-between'
                  }`}
                  style={{
                    borderTop: !bp || bp.hasFooterDivider ? '1px solid #e2e8f0' : undefined
                  }}
                >
                  {bp?.footerLayout !== 'minimal_page' && (
                    <span>{resolvedActorVisuals.primaryEntityName} · {resolvedActorVisuals.primarySubLine}</span>
                  )}
                  {bp?.footerLayout !== 'centered_legal' && (
                    <span className="font-bold text-slate-600 flex items-center gap-2">
                      {!bp && (
                        <span className="text-emerald-700 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Conforme EIMT &amp; Droit du Travail Canada
                        </span>
                      )}
                      {bp && <span>1/1</span>}
                    </span>
                  )}
                </div>
              )}
            </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* VUE 2 : FORMULAIRE INTERACTIF (MODÈLES 6, 7, 12, 13)                     */}
          {/* ========================================================================= */}
          {viewMode === 'form' && activeModel.isInteractive && (
            <form onSubmit={handleSubmitInteractiveForm} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 text-xs">
              <div className="flex items-center justify-between border-b pb-3">
                <h4 className="font-bold text-sm text-[#0B2545] flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-blue-600" />
                  <span>Saisie Interactive des Données — {activeModel.title}</span>
                </h4>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Enregistrer en Base</span>
                </button>
              </div>

              {/* Formulaire Modèle 6 : Demande d'emploi interne */}
              {selectedModelId === 6 && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Poste actuellement occupé (si en poste)</label>
                      <input
                        type="text"
                        value={docEsData.posteActuelOccupe}
                        onChange={(e) => onChangeDocEsData({ ...docEsData, posteActuelOccupe: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Diplôme le plus élevé</label>
                      <input
                        type="text"
                        value={docEsData.diplomeEleve}
                        onChange={(e) => onChangeDocEsData({ ...docEsData, diplomeEleve: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Certifications ou compétences clés</label>
                    <input
                      type="text"
                      value={docEsData.certificationsCles}
                      onChange={(e) => onChangeDocEsData({ ...docEsData, certificationsCles: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Pourquoi ce poste au sein de notre entreprise correspond-il à votre projet ?
                    </label>
                    <textarea
                      rows={3}
                      value={docEsData.motivationEntreprise}
                      onChange={(e) => onChangeDocEsData({ ...docEsData, motivationEntreprise: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Quels sont les principaux atouts que vous apporterez à l'équipe ?
                    </label>
                    <textarea
                      rows={3}
                      value={docEsData.atoutsPourEquipe}
                      onChange={(e) => onChangeDocEsData({ ...docEsData, atoutsPourEquipe: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg bg-white"
                    />
                  </div>
                </div>
              )}

              {/* Formulaire Modèle 7 : Autorisation de vérification des références */}
              {selectedModelId === 7 && (
                <div className="space-y-4">
                  <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                    <label className="flex items-center gap-2 font-bold text-blue-900 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={docEsData.accordVerificationReferences}
                        onChange={(e) => onChangeDocEsData({ ...docEsData, accordVerificationReferences: e.target.checked })}
                        className="rounded text-blue-600"
                      />
                      <span>J'accepte expressément que l'entreprise contacte mes anciens employeurs pour vérification</span>
                    </label>
                  </div>

                  <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2">
                    <h5 className="font-bold text-slate-800">Référence Professionnelle 1</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Nom & Prénom"
                        value={docEsData.reference1.nomPrenom}
                        onChange={(e) => onChangeDocEsData({ ...docEsData, reference1: { ...docEsData.reference1, nomPrenom: e.target.value } })}
                        className="px-2.5 py-1.5 border rounded bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Entreprise"
                        value={docEsData.reference1.entreprise}
                        onChange={(e) => onChangeDocEsData({ ...docEsData, reference1: { ...docEsData.reference1, entreprise: e.target.value } })}
                        className="px-2.5 py-1.5 border rounded bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Poste occupé"
                        value={docEsData.reference1.poste}
                        onChange={(e) => onChangeDocEsData({ ...docEsData, reference1: { ...docEsData.reference1, poste: e.target.value } })}
                        className="px-2.5 py-1.5 border rounded bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Lien hiérarchique (ex: Manager N+1)"
                        value={docEsData.reference1.lien}
                        onChange={(e) => onChangeDocEsData({ ...docEsData, reference1: { ...docEsData.reference1, lien: e.target.value } })}
                        className="px-2.5 py-1.5 border rounded bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Téléphone"
                        value={docEsData.reference1.tel}
                        onChange={(e) => onChangeDocEsData({ ...docEsData, reference1: { ...docEsData.reference1, tel: e.target.value } })}
                        className="px-2.5 py-1.5 border rounded bg-white"
                      />
                      <input
                        type="email"
                        placeholder="E-mail"
                        value={docEsData.reference1.email}
                        onChange={(e) => onChangeDocEsData({ ...docEsData, reference1: { ...docEsData.reference1, email: e.target.value } })}
                        className="px-2.5 py-1.5 border rounded bg-white"
                      />
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2">
                    <h5 className="font-bold text-slate-800">Référence Professionnelle 2</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Nom & Prénom"
                        value={docEsData.reference2.nomPrenom}
                        onChange={(e) => onChangeDocEsData({ ...docEsData, reference2: { ...docEsData.reference2, nomPrenom: e.target.value } })}
                        className="px-2.5 py-1.5 border rounded bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Entreprise"
                        value={docEsData.reference2.entreprise}
                        onChange={(e) => onChangeDocEsData({ ...docEsData, reference2: { ...docEsData.reference2, entreprise: e.target.value } })}
                        className="px-2.5 py-1.5 border rounded bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Poste occupé"
                        value={docEsData.reference2.poste}
                        onChange={(e) => onChangeDocEsData({ ...docEsData, reference2: { ...docEsData.reference2, poste: e.target.value } })}
                        className="px-2.5 py-1.5 border rounded bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Lien hiérarchique"
                        value={docEsData.reference2.lien}
                        onChange={(e) => onChangeDocEsData({ ...docEsData, reference2: { ...docEsData.reference2, lien: e.target.value } })}
                        className="px-2.5 py-1.5 border rounded bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Téléphone"
                        value={docEsData.reference2.tel}
                        onChange={(e) => onChangeDocEsData({ ...docEsData, reference2: { ...docEsData.reference2, tel: e.target.value } })}
                        className="px-2.5 py-1.5 border rounded bg-white"
                      />
                      <input
                        type="email"
                        placeholder="E-mail"
                        value={docEsData.reference2.email}
                        onChange={(e) => onChangeDocEsData({ ...docEsData, reference2: { ...docEsData.reference2, email: e.target.value } })}
                        className="px-2.5 py-1.5 border rounded bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Formulaire Modèle 12 : Inscription Agence */}
              {selectedModelId === 12 && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Type de contrat recherché</label>
                      <select
                        value={docEsData.typeContratRechercheAgence}
                        onChange={(e) => onChangeDocEsData({ ...docEsData, typeContratRechercheAgence: e.target.value as any })}
                        className="w-full px-3 py-2 border rounded-lg bg-white"
                      >
                        <option value="CDI">CDI (Contrat à Durée Indéterminée)</option>
                        <option value="CDD">CDD (Contrat à Durée Déterminée)</option>
                        <option value="Intérim">Intérim / Placement Temporaire</option>
                        <option value="Management de transition">Management de transition</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Prétentions minimales acceptées</label>
                      <input
                        type="text"
                        value={docEsData.pretentionsMinimalesAgence}
                        onChange={(e) => onChangeDocEsData({ ...docEsData, pretentionsMinimalesAgence: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Zone géographique souhaitée au Canada</label>
                    <input
                      type="text"
                      value={docEsData.zoneGeographiqueSouhaitee}
                      onChange={(e) => onChangeDocEsData({ ...docEsData, zoneGeographiqueSouhaitee: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg bg-white"
                    />
                  </div>

                  <div className="flex flex-wrap gap-4 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={docEsData.documentIdentiteVerifie}
                        onChange={(e) => onChangeDocEsData({ ...docEsData, documentIdentiteVerifie: e.target.checked })}
                        className="rounded text-blue-600"
                      />
                      <span className="font-bold text-slate-700">Document d'identité vérifié et certifié conforme</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={docEsData.cvMisAJourJoint}
                        onChange={(e) => onChangeDocEsData({ ...docEsData, cvMisAJourJoint: e.target.checked })}
                        className="rounded text-blue-600"
                      />
                      <span className="font-bold text-slate-700">CV actualisé au format canadien joint</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Formulaire Modèle 13 : Accord RGPD */}
              {selectedModelId === 13 && (
                <div className="space-y-4">
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                    <h5 className="font-bold text-amber-900 mb-1">Conformité RGPD &amp; Protection des Renseignements Personnels</h5>
                    <p className="text-[11px] text-amber-800">
                      Les informations recueillies sont nécessaires à l'instruction de votre dossier de mobilité internationale et ne sont jamais cédées à des tiers non autorisés.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-start gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50 border border-slate-200">
                      <input
                        type="checkbox"
                        checked={docEsData.accordConserverVivier}
                        onChange={(e) => onChangeDocEsData({ ...docEsData, accordConserverVivier: e.target.checked })}
                        className="rounded text-blue-600 mt-0.5"
                      />
                      <div>
                        <span className="font-bold text-slate-900 block">Conservation dans le vivier informatique</span>
                        <span className="text-[11px] text-slate-500">J'autorise l'agence à conserver mes informations pour toute opportunité future éligible.</span>
                      </div>
                    </label>

                    <label className="flex items-start gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50 border border-slate-200">
                      <input
                        type="checkbox"
                        checked={docEsData.accordTransmettreEntreprises}
                        onChange={(e) => onChangeDocEsData({ ...docEsData, accordTransmettreEntreprises: e.target.checked })}
                        className="rounded text-blue-600 mt-0.5"
                      />
                      <div>
                        <span className="font-bold text-slate-900 block">Transmission de mon profil aux entreprises clientes</span>
                        <span className="text-[11px] text-slate-500">J'autorise l'agence à présenter ma candidature auprès de l'employeur cible : {postulant.nomEntreprise}.</span>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0B2545] hover:bg-[#134074] text-white font-black rounded-xl cursor-pointer shadow-xs"
                >
                  Valider et Enregistrer
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
