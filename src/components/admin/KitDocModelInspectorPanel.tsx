import React, { useState, useEffect } from 'react';
import {
  SlidersHorizontal,
  Edit3,
  Palette,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Save,
  Layers,
  Wand2
} from 'lucide-react';
import { SiteSettings } from '../../types';
import { PostulantInfo } from '../../services/postulantDossierService';
import {
  AdaptivePageFitMetrics,
  DocEsModelMeta,
  FichesDocEsData,
  KIT_HEADER_PRESETS,
  KIT_LAYOUT_PRESETS,
  KitDocHeaderMap,
  KitDocLayoutMap,
  KitDocVisualScopeMap,
  getDocEsActorRequirement,
  renderDocEsPlainText
} from '../../services/fichesEtDocEsService';
import {
  ActorScopeId,
  ImportedAssetKey,
  PdfImportedAssetsConfig,
  UploadedAssetUrlsMap
} from '../../services/departmentsAndEmailService';
import {
  LayoutTemplatesMap,
  ReferenceLayoutTemplate,
  SpatialBlueprint,
  resolveEffectiveLayout
} from '../../services/layoutImitationService';
import { PanneauReglagesFichiersImportes } from '../common/PanneauReglagesFichiersImportes';
import { InteractiveReplicaStudio } from './InteractiveReplicaStudio';

type InspectorTabId = 'fields' | 'layout' | 'visuals' | 'studio';

interface KitDocModelInspectorPanelProps {
  model: DocEsModelMeta;
  postulant: PostulantInfo;
  settings: SiteSettings;
  docEsData: FichesDocEsData;
  onSaveDocEsData: (updated: FichesDocEsData, toastMsg?: string) => void;
  resolvedLayout: ReferenceLayoutTemplate;
  adaptiveFit: AdaptivePageFitMetrics;
  layoutTemplates: LayoutTemplatesMap;
  kitDocLayouts: KitDocLayoutMap;
  onChangeKitDocLayout: (modelId: number, presetId: string) => void;
  kitDocHeaders: KitDocHeaderMap;
  onChangeKitDocHeader: (modelId: number, headerId: string) => void;
  kitDocVisualScopes: KitDocVisualScopeMap;
  onChangeKitDocVisualScope: (modelId: number, scope: ActorScopeId | 'auto') => void;
  uploadedAssets: UploadedAssetUrlsMap;
  assetsConfig: PdfImportedAssetsConfig;
  onChangeAssetsConfig: (cfg: PdfImportedAssetsConfig) => void;
  onUploadAsset: (key: ImportedAssetKey, dataUrl: string, filename: string) => void;
  onOpenStampGenerator?: (key: ImportedAssetKey) => void;
  onOpenVisualGenerator?: (key: ImportedAssetKey) => void;
  onOpenInWebmail?: (html: string) => void;
  onUpdateDocEsTemplate?: (patch: Partial<ReferenceLayoutTemplate>) => void;
  onToast: (msg: string) => void;
}

export const KitDocModelInspectorPanel: React.FC<KitDocModelInspectorPanelProps> = ({
  model,
  postulant,
  settings,
  docEsData,
  onSaveDocEsData,
  resolvedLayout,
  adaptiveFit,
  layoutTemplates,
  kitDocLayouts,
  onChangeKitDocLayout,
  kitDocHeaders,
  onChangeKitDocHeader,
  kitDocVisualScopes,
  onChangeKitDocVisualScope,
  uploadedAssets,
  assetsConfig,
  onChangeAssetsConfig,
  onUploadAsset,
  onOpenStampGenerator,
  onOpenVisualGenerator,
  onOpenInWebmail,
  onUpdateDocEsTemplate,
  onToast
}) => {
  const [activeTab, setActiveTab] = useState<InspectorTabId>('fields');
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const actorReq = getDocEsActorRequirement(model.id);
  const effectiveActorScope: ActorScopeId =
    kitDocVisualScopes[model.id] && kitDocVisualScopes[model.id] !== 'auto'
      ? (kitDocVisualScopes[model.id] as ActorScopeId)
      : actorReq.primaryActor;

  const [visualActorFocus, setVisualActorFocus] = useState<ActorScopeId>(effectiveActorScope);

  useEffect(() => {
    setVisualActorFocus(effectiveActorScope);
  }, [effectiveActorScope, model.id]);

  const effectiveLayout = resolveEffectiveLayout(resolvedLayout) || resolvedLayout;
  const bp: SpatialBlueprint = effectiveLayout.spatialBlueprint!;
  const modelKey = String(model.id);
  const customLayoutPatch = docEsData.customModelLayouts?.[modelKey] || {};
  const hasCustomText = Boolean(docEsData.customModelTexts?.[modelKey]?.trim());

  const generatedBaseline = renderDocEsPlainText(model.id, postulant, docEsData, settings, {
    ignoreCustomOverride: true
  });
  const [draftCustomText, setDraftCustomText] = useState<string>(
    docEsData.customModelTexts?.[modelKey] || generatedBaseline.content
  );

  useEffect(() => {
    setDraftCustomText(docEsData.customModelTexts?.[modelKey] || generatedBaseline.content);
  }, [model.id, docEsData.customModelTexts?.[modelKey], generatedBaseline.content]);

  const updateCustomLayout = (
    patch: Partial<ReferenceLayoutTemplate>,
    toastMsg?: string
  ) => {
    const prevAll = docEsData.customModelLayouts || {};
    const prevModel = prevAll[modelKey] || {};
    const nextModel: Partial<ReferenceLayoutTemplate> = {
      ...prevModel,
      ...patch,
      marginsMm: patch.marginsMm
        ? { ...(prevModel.marginsMm || effectiveLayout.marginsMm || adaptiveFit.marginsMm), ...patch.marginsMm }
        : prevModel.marginsMm,
      spatialBlueprint: patch.spatialBlueprint
        ? { ...(prevModel.spatialBlueprint || bp), ...patch.spatialBlueprint }
        : prevModel.spatialBlueprint
    };
    onSaveDocEsData(
      {
        ...docEsData,
        customModelLayouts: {
          ...prevAll,
          [modelKey]: nextModel
        }
      },
      toastMsg
    );
  };

  const resetCustomLayout = () => {
    const prevAll = { ...(docEsData.customModelLayouts || {}) };
    delete prevAll[modelKey];
    onSaveDocEsData(
      {
        ...docEsData,
        customModelLayouts: prevAll
      },
      `Réglages de mise en page et d’espacement réinitialisés pour ${model.number}.`
    );
  };

  const handleApplyAutoBalancedFit = () => {
    updateCustomLayout(
      {
        autoFitToPage: true,
        fontSizePt: adaptiveFit.fontSizePt,
        lineHeight: adaptiveFit.lineHeight,
        paragraphSpacingMm: adaptiveFit.paragraphSpacingMm,
        marginsMm: { ...adaptiveFit.marginsMm }
      },
      `Mise en page vérifiée et équilibrée pour ${model.number} (${adaptiveFit.fillPct}% de page · interligne ${adaptiveFit.lineHeight}).`
    );
  };

  const handleSaveCustomText = () => {
    const prevTexts = docEsData.customModelTexts || {};
    onSaveDocEsData(
      {
        ...docEsData,
        customModelTexts: {
          ...prevTexts,
          [modelKey]: draftCustomText
        }
      },
      `Texte personnalisé enregistré pour ${model.number}.`
    );
  };

  const handleResetCustomText = () => {
    const prevTexts = { ...(docEsData.customModelTexts || {}) };
    delete prevTexts[modelKey];
    onSaveDocEsData(
      {
        ...docEsData,
        customModelTexts: prevTexts
      },
      `Texte réinitialisé sur les données structurées de ${model.number}.`
    );
  };

  const updateFields = (patch: Partial<FichesDocEsData>) => {
    onSaveDocEsData({
      ...docEsData,
      ...patch
    });
  };

  return (
    <div className="bg-white border border-slate-300 rounded-xl shadow-xs overflow-hidden">
      {/* Barre supérieure compacte de vérification de mise en page (toujours visible) */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-mono font-bold text-[#0B2545]">{model.number}</span>
            <span className="text-slate-300">|</span>
            <span className="font-bold text-slate-900 truncate">{model.title}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-slate-600">
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              {adaptiveFit.statusLabel}
            </span>
            <span>·</span>
            <span>
              Format : <strong className="text-slate-800">{(effectiveLayout.pageFormat || 'a4').toUpperCase()} {effectiveLayout.orientation === 'landscape' ? 'Paysage' : 'Portrait'}</strong>
            </span>
            <span>·</span>
            <span>
              Occupation : <strong className="text-slate-800">{adaptiveFit.fillPct}%</strong> ({adaptiveFit.estimatedPages} page{adaptiveFit.estimatedPages > 1 ? 's' : ''})
            </span>
            <span>·</span>
            <span>
              Police <strong className="text-slate-800">{adaptiveFit.fontSizePt}pt</strong> · Interligne <strong className="text-slate-800">{adaptiveFit.lineHeight}</strong> · Parag. <strong className="text-slate-800">{adaptiveFit.paragraphSpacingMm}mm</strong>
            </span>
          </div>
          {adaptiveFit.warnings.length > 0 && (
            <div className="flex items-start gap-1.5 text-[11px] text-amber-800 pt-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
              <span>{adaptiveFit.warnings.join(' · ')}</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleApplyAutoBalancedFit}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
            title="Vérifier l'occupation de la page, supprimer le vide excessif ou éviter les débordements"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>Vérifier &amp; Adapter à la page</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded((v) => !v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
              isExpanded
                ? 'bg-[#0B2545] text-white border-[#0B2545]'
                : 'bg-white hover:bg-slate-100 text-[#0B2545] border-slate-300'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{isExpanded ? 'Masquer l’éditeur avancé' : 'Éditer champs, mise en page & Canva'}</span>
          </button>
        </div>
      </div>

      {/* Corps dépliable de l'éditeur multi-onglets du document */}
      {isExpanded && (
        <div className="p-4 space-y-4 bg-white">
          {/* Onglets segmentés */}
          <div className="flex flex-wrap gap-1.5 border-b border-slate-200 pb-3">
            {(
              [
                { id: 'fields', label: '1. Champs & Texte du document', icon: Edit3 },
                { id: 'layout', label: '2. Mise en page, Interligne & Espacement', icon: Layers },
                { id: 'visuals', label: `3. Visuels & Tampons (${actorReq.badgeLabel})`, icon: Palette },
                { id: 'studio', label: '4. Studio Canva & Imitation Modèle', icon: Sparkles }
              ] as const
            ).map((t) => {
              const Icon = t.icon;
              const isAct = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                    isAct
                      ? 'bg-[#0066B3] text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* =============================================================== */}
          {/* ONGLET 1 : CHAMPS STRUCTURÉS + ÉDITEUR DE TEXTE LIBRE           */}
          {/* =============================================================== */}
          {activeTab === 'fields' && (
            <div className="space-y-4 text-xs">
              {/* Champs structurés selon le modelId */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
                <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
                  <span className="font-bold text-[#0B2545] uppercase text-[11px]">
                    Champs structurés — {model.number}
                  </span>
                  <button
                    type="button"
                    onClick={() => onSaveDocEsData(docEsData, `Données de ${model.number} sauvegardées.`)}
                    className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Save className="w-3 h-3" />
                    <span>Sauvegarder en base</span>
                  </button>
                </div>

                {model.id === 1 && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <label className="block">
                      <span className="font-semibold text-slate-600 block mb-1">Spécialité métier</span>
                      <input
                        type="text"
                        value={docEsData.specialiteMetier}
                        onChange={(e) => updateFields({ specialiteMetier: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                      />
                    </label>
                    <label className="block">
                      <span className="font-semibold text-slate-600 block mb-1">Années d&apos;expérience</span>
                      <input
                        type="number"
                        value={docEsData.anneesExperience}
                        onChange={(e) => updateFields({ anneesExperience: Number(e.target.value) || 0 })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                      />
                    </label>
                    <label className="block">
                      <span className="font-semibold text-slate-600 block mb-1">Statut processus ATS</span>
                      <select
                        value={docEsData.statutProcessusAts}
                        onChange={(e) => updateFields({ statutProcessusAts: e.target.value as FichesDocEsData['statutProcessusAts'] })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                      >
                        {['Tri CV', 'Entretien RH', 'Test Technique', 'Entretien Manager', 'Prise de Réf.', 'Offre / Proposition', 'Vivier', 'Rejeté'].map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="font-semibold text-slate-600 block mb-1">Niveau d&apos;études</span>
                      <input
                        type="text"
                        value={docEsData.niveauEtudes}
                        onChange={(e) => updateFields({ niveauEtudes: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                      />
                    </label>
                    <label className="block">
                      <span className="font-semibold text-slate-600 block mb-1">Mobilité géographique</span>
                      <input
                        type="text"
                        value={docEsData.mobiliteGeographique}
                        onChange={(e) => updateFields({ mobiliteGeographique: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                      />
                    </label>
                    <label className="block">
                      <span className="font-semibold text-slate-600 block mb-1">Disponibilité</span>
                      <input
                        type="text"
                        value={docEsData.disponibilite}
                        onChange={(e) => updateFields({ disponibilite: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                      />
                    </label>
                    <label className="block sm:col-span-3">
                      <span className="font-semibold text-slate-600 block mb-1">Synthèse recruteur</span>
                      <textarea
                        rows={2}
                        value={docEsData.syntheseRecruteur}
                        onChange={(e) => updateFields({ syntheseRecruteur: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                      />
                    </label>
                  </div>
                )}

                {model.id === 2 && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <label className="block">
                      <span className="font-semibold text-slate-600 block mb-1">Évaluateur</span>
                      <input
                        type="text"
                        value={docEsData.evaluateurNom}
                        onChange={(e) => updateFields({ evaluateurNom: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                      />
                    </label>
                    <label className="block">
                      <span className="font-semibold text-slate-600 block mb-1">Fonction évaluateur</span>
                      <input
                        type="text"
                        value={docEsData.evaluateurFonction}
                        onChange={(e) => updateFields({ evaluateurFonction: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                      />
                    </label>
                    <label className="block">
                      <span className="font-semibold text-slate-600 block mb-1">Décision d&apos;évaluation</span>
                      <select
                        value={docEsData.decisionEvaluation}
                        onChange={(e) => updateFields({ decisionEvaluation: e.target.value as FichesDocEsData['decisionEvaluation'] })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                      >
                        <option value="Poursuivre le processus">Poursuivre le processus</option>
                        <option value="Mettre en attente">Mettre en attente</option>
                        <option value="Stopper le processus">Stopper le processus</option>
                      </select>
                    </label>
                    <label className="block sm:col-span-3">
                      <span className="font-semibold text-slate-600 block mb-1">Commentaires de synthèse</span>
                      <textarea
                        rows={2}
                        value={docEsData.commentairesSyntheseEvaluateur}
                        onChange={(e) => updateFields({ commentairesSyntheseEvaluateur: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                      />
                    </label>
                  </div>
                )}

                {model.id === 3 && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <label className="block">
                        <span className="font-semibold text-slate-600 block mb-1">Étape 1 (Date &amp; Statut)</span>
                        <input
                          type="text"
                          value={`${docEsData.etape1Preselection.date} · ${docEsData.etape1Preselection.statut}`}
                          onChange={(e) => {
                            const [dPart, ...rest] = e.target.value.split('·');
                            updateFields({
                              etape1Preselection: {
                                ...docEsData.etape1Preselection,
                                date: (dPart || '').trim(),
                                statut: rest.join('·').trim() || docEsData.etape1Preselection.statut
                              }
                            });
                          }}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                        />
                      </label>
                      <label className="block">
                        <span className="font-semibold text-slate-600 block mb-1">Étape 2 RH (Date &amp; Heure)</span>
                        <input
                          type="text"
                          value={docEsData.etape2EntretienRh.date}
                          onChange={(e) =>
                            updateFields({
                              etape2EntretienRh: { ...docEsData.etape2EntretienRh, date: e.target.value }
                            })
                          }
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                        />
                      </label>
                      <label className="block">
                        <span className="font-semibold text-slate-600 block mb-1">Étape 3 Final (Intervenant)</span>
                        <input
                          type="text"
                          value={docEsData.etape3EntretienFinal.intervenant}
                          onChange={(e) =>
                            updateFields({
                              etape3EntretienFinal: { ...docEsData.etape3EntretienFinal, intervenant: e.target.value }
                            })
                          }
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                        />
                      </label>
                    </div>
                    <label className="block">
                      <span className="font-semibold text-slate-600 block mb-1">Notes logistiques</span>
                      <textarea
                        rows={2}
                        value={docEsData.notesLogistique}
                        onChange={(e) => updateFields({ notesLogistique: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                      />
                    </label>
                  </div>
                )}

                {(model.id === 4 || model.id === 5) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <label className="block">
                      <span className="font-semibold text-slate-600 block mb-1">Rattachement hiérarchique</span>
                      <input
                        type="text"
                        value={docEsData.rattachementHierarchique}
                        onChange={(e) => updateFields({ rattachementHierarchique: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                      />
                    </label>
                    <label className="block">
                      <span className="font-semibold text-slate-600 block mb-1">Outils métiers</span>
                      <input
                        type="text"
                        value={docEsData.outilsMetiers}
                        onChange={(e) => updateFields({ outilsMetiers: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                      />
                    </label>
                    <label className="block sm:col-span-2">
                      <span className="font-semibold text-slate-600 block mb-1">Missions principales (1 par ligne)</span>
                      <textarea
                        rows={3}
                        value={docEsData.missionsPrincipales.join('\n')}
                        onChange={(e) =>
                          updateFields({
                            missionsPrincipales: e.target.value.split('\n').filter((l) => l.trim().length > 0)
                          })
                        }
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                      />
                    </label>
                  </div>
                )}

                {model.id === 6 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <label className="block">
                      <span className="font-semibold text-slate-600 block mb-1">Poste actuel occupé</span>
                      <input
                        type="text"
                        value={docEsData.posteActuelOccupe}
                        onChange={(e) => updateFields({ posteActuelOccupe: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                      />
                    </label>
                    <label className="block">
                      <span className="font-semibold text-slate-600 block mb-1">Diplôme le plus élevé</span>
                      <input
                        type="text"
                        value={docEsData.diplomeEleve}
                        onChange={(e) => updateFields({ diplomeEleve: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                      />
                    </label>
                    <label className="block sm:col-span-2">
                      <span className="font-semibold text-slate-600 block mb-1">Motivation entreprise</span>
                      <textarea
                        rows={2}
                        value={docEsData.motivationEntreprise}
                        onChange={(e) => updateFields({ motivationEntreprise: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                      />
                    </label>
                    <label className="block sm:col-span-2">
                      <span className="font-semibold text-slate-600 block mb-1">Atouts pour l&apos;équipe</span>
                      <textarea
                        rows={2}
                        value={docEsData.atoutsPourEquipe}
                        onChange={(e) => updateFields({ atoutsPourEquipe: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                      />
                    </label>
                  </div>
                )}

                {model.id === 7 && (
                  <div className="space-y-2.5">
                    <label className="flex items-center gap-2 font-semibold text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={docEsData.accordVerificationReferences}
                        onChange={(e) => updateFields({ accordVerificationReferences: e.target.checked })}
                      />
                      <span>Accord vérification des références professionnelles</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Référence 1 : Nom & Prénom"
                        value={docEsData.reference1.nomPrenom}
                        onChange={(e) =>
                          updateFields({ reference1: { ...docEsData.reference1, nomPrenom: e.target.value } })
                        }
                        className="px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Référence 1 : Entreprise"
                        value={docEsData.reference1.entreprise}
                        onChange={(e) =>
                          updateFields({ reference1: { ...docEsData.reference1, entreprise: e.target.value } })
                        }
                        className="px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Référence 2 : Nom & Prénom"
                        value={docEsData.reference2.nomPrenom}
                        onChange={(e) =>
                          updateFields({ reference2: { ...docEsData.reference2, nomPrenom: e.target.value } })
                        }
                        className="px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Référence 2 : Entreprise"
                        value={docEsData.reference2.entreprise}
                        onChange={(e) =>
                          updateFields({ reference2: { ...docEsData.reference2, entreprise: e.target.value } })
                        }
                        className="px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                      />
                    </div>
                  </div>
                )}

                {model.id === 8 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <label className="block">
                      <span className="font-semibold text-slate-600 block mb-1">Lien test personnalité</span>
                      <input
                        type="text"
                        value={docEsData.lienTestPersonnalite}
                        onChange={(e) => updateFields({ lienTestPersonnalite: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                      />
                    </label>
                    <label className="block">
                      <span className="font-semibold text-slate-600 block mb-1">Code d&apos;accès</span>
                      <input
                        type="text"
                        value={docEsData.codeAccesPersonnalite}
                        onChange={(e) => updateFields({ codeAccesPersonnalite: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                      />
                    </label>
                    <label className="block">
                      <span className="font-semibold text-slate-600 block mb-1">Lien test technique</span>
                      <input
                        type="text"
                        value={docEsData.lienTestTechnique}
                        onChange={(e) => updateFields({ lienTestTechnique: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                      />
                    </label>
                    <label className="block">
                      <span className="font-semibold text-slate-600 block mb-1">Date limite technique</span>
                      <input
                        type="text"
                        value={docEsData.dateLimiteTechnique}
                        onChange={(e) => updateFields({ dateLimiteTechnique: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                      />
                    </label>
                  </div>
                )}

                {model.id === 9 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <label className="block">
                      <span className="font-semibold text-slate-600 block mb-1">Interlocuteur RH Client</span>
                      <input
                        type="text"
                        value={docEsData.interlocuteurRhClient}
                        onChange={(e) => updateFields({ interlocuteurRhClient: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                      />
                    </label>
                    <label className="block">
                      <span className="font-semibold text-slate-600 block mb-1">Manager final</span>
                      <input
                        type="text"
                        value={docEsData.managerFinalClient}
                        onChange={(e) => updateFields({ managerFinalClient: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                      />
                    </label>
                    <label className="block sm:col-span-2">
                      <span className="font-semibold text-slate-600 block mb-1">Contexte &amp; attractivité du poste</span>
                      <textarea
                        rows={2}
                        value={docEsData.contexteAttractivite}
                        onChange={(e) => updateFields({ contexteAttractivite: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                      />
                    </label>
                  </div>
                )}

                {model.id === 10 && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <label className="block">
                      <span className="font-semibold text-slate-600 block mb-1">Taux honoraires (%)</span>
                      <input
                        type="number"
                        value={docEsData.tauxHonorairesAgencePct}
                        onChange={(e) => updateFields({ tauxHonorairesAgencePct: Number(e.target.value) || 0 })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                      />
                    </label>
                    <label className="block">
                      <span className="font-semibold text-slate-600 block mb-1">Garantie remplacement (mois)</span>
                      <input
                        type="number"
                        value={docEsData.dureeGarantieRemplacementMois}
                        onChange={(e) => updateFields({ dureeGarantieRemplacementMois: Number(e.target.value) || 0 })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                      />
                    </label>
                    <label className="block">
                      <span className="font-semibold text-slate-600 block mb-1">Mode facturation</span>
                      <select
                        value={docEsData.modeFacturation}
                        onChange={(e) => updateFields({ modeFacturation: e.target.value as FichesDocEsData['modeFacturation'] })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                      >
                        <option value="Au succès">Au succès</option>
                        <option value="Au forfait avec acomptes (33% lancement, 33% Shortlist, 34% recrutement)">Au forfait avec acomptes</option>
                      </select>
                    </label>
                  </div>
                )}

                {model.id === 11 && (
                  <div className="space-y-2.5">
                    <label className="block">
                      <span className="font-semibold text-slate-600 block mb-1">Référence profil anonyme</span>
                      <input
                        type="text"
                        value={docEsData.referenceProfilAnonyme}
                        onChange={(e) => updateFields({ referenceProfilAnonyme: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                      />
                    </label>
                    <label className="block">
                      <span className="font-semibold text-slate-600 block mb-1">Note de synthèse du consultant</span>
                      <textarea
                        rows={2}
                        value={docEsData.noteSyntheseConsultant}
                        onChange={(e) => updateFields({ noteSyntheseConsultant: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                      />
                    </label>
                  </div>
                )}

                {model.id === 12 && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <label className="block">
                      <span className="font-semibold text-slate-600 block mb-1">Type de contrat recherché</span>
                      <select
                        value={docEsData.typeContratRechercheAgence}
                        onChange={(e) => updateFields({ typeContratRechercheAgence: e.target.value as FichesDocEsData['typeContratRechercheAgence'] })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                      >
                        <option value="CDI">CDI</option>
                        <option value="CDD">CDD</option>
                        <option value="Intérim">Intérim</option>
                        <option value="Management de transition">Management de transition</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="font-semibold text-slate-600 block mb-1">Prétentions minimales</span>
                      <input
                        type="text"
                        value={docEsData.pretentionsMinimalesAgence}
                        onChange={(e) => updateFields({ pretentionsMinimalesAgence: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                      />
                    </label>
                    <label className="block">
                      <span className="font-semibold text-slate-600 block mb-1">Zone géographique</span>
                      <input
                        type="text"
                        value={docEsData.zoneGeographiqueSouhaitee}
                        onChange={(e) => updateFields({ zoneGeographiqueSouhaitee: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                      />
                    </label>
                  </div>
                )}

                {model.id === 13 && (
                  <div className="space-y-2">
                    <label className="block">
                      <span className="font-semibold text-slate-600 block mb-1">E-mail DPO Agence</span>
                      <input
                        type="email"
                        value={docEsData.dpoEmailAgence}
                        onChange={(e) => updateFields({ dpoEmailAgence: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                      />
                    </label>
                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={docEsData.accordConserverVivier}
                          onChange={(e) => updateFields({ accordConserverVivier: e.target.checked })}
                        />
                        <span className="font-semibold">Conserver dans le vivier</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={docEsData.accordTransmettreEntreprises}
                          onChange={(e) => updateFields({ accordTransmettreEntreprises: e.target.checked })}
                        />
                        <span className="font-semibold">Transmettre aux entreprises clientes</span>
                      </label>
                    </div>
                  </div>
                )}

                {model.id === 14 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <label className="block">
                      <span className="font-semibold text-slate-600 block mb-1">Conseils Pitch initial</span>
                      <textarea
                        rows={2}
                        value={docEsData.conseilsPitch}
                        onChange={(e) => updateFields({ conseilsPitch: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                      />
                    </label>
                    <label className="block">
                      <span className="font-semibold text-slate-600 block mb-1">Conseils Posture &amp; Questions</span>
                      <textarea
                        rows={2}
                        value={docEsData.conseilsPosture}
                        onChange={(e) => updateFields({ conseilsPosture: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                      />
                    </label>
                  </div>
                )}

                {model.id === 15 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-center">
                    <label className="block">
                      <span className="font-semibold text-slate-600 block mb-1">Consultant Agence Signataire</span>
                      <input
                        type="text"
                        value={docEsData.consultantAgenceNom}
                        onChange={(e) => updateFields({ consultantAgenceNom: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                      />
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer pt-4">
                      <input
                        type="checkbox"
                        checked={docEsData.reconnaissanceAnterioriteValidee}
                        onChange={(e) => updateFields({ reconnaissanceAnterioriteValidee: e.target.checked })}
                      />
                      <span className="font-semibold">Reconnaissance d&apos;antériorité validée</span>
                    </label>
                  </div>
                )}
              </div>

              {/* Éditeur texte libre du document individuel */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-[#0B2545]">
                      Texte intégral éditable de {model.number}
                    </span>
                    <span className="ml-2 text-[11px] text-slate-500">
                      {hasCustomText ? '(Version modifiée manuellement)' : '(Synchronisé automatiquement avec les champs)'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasCustomText && (
                      <button
                        type="button"
                        onClick={handleResetCustomText}
                        className="px-2.5 py-1 rounded border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Réinitialiser au texte généré</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleSaveCustomText}
                      className="px-3 py-1 rounded bg-[#0066B3] hover:bg-[#005291] text-white font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Save className="w-3 h-3" />
                      <span>Appliquer ce texte au document</span>
                    </button>
                  </div>
                </div>
                <textarea
                  rows={7}
                  value={draftCustomText}
                  onChange={(e) => setDraftCustomText(e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-lg font-mono text-[11px] leading-relaxed text-slate-800 bg-slate-50/40 focus:bg-white focus:outline-none focus:border-[#0066B3]"
                />
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* ONGLET 2 : MISE EN PAGE, INTERLIGNE, ESPACEMENT & ÉQUILIBRE     */}
          {/* =============================================================== */}
          {activeTab === 'layout' && (
            <div className="space-y-4 text-xs">
              {/* Ligne 1 : Préréglages Preset + En-tête + Visuels */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <label className="block">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                    Modèle de mise en page
                  </span>
                  <select
                    value={kitDocLayouts[model.id] || 'auto_doc'}
                    onChange={(e) => onChangeKitDocLayout(model.id, e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800 cursor-pointer"
                  >
                    {KIT_LAYOUT_PRESETS.map((pr) => (
                      <option key={pr.id} value={pr.id}>{pr.label}</option>
                    ))}
                    {layoutTemplates.t9 && <option value="import_t9">Importé Onglet 9 (Hébergement)</option>}
                    {layoutTemplates.t10 && <option value="import_t10">Importé Onglet 10 (Notaire)</option>}
                    {layoutTemplates.t11 && <option value="import_t11">Importé Onglet 11 (HIR)</option>}
                    {layoutTemplates.t12 && <option value="import_t12">Importé Onglet 12 (Déclaration)</option>}
                  </select>
                </label>

                <label className="block">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                    Modèle d&apos;en-tête
                  </span>
                  <select
                    value={kitDocHeaders[model.id] || 'auto_header'}
                    onChange={(e) => onChangeKitDocHeader(model.id, e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800 cursor-pointer"
                  >
                    {KIT_HEADER_PRESETS.map((hp) => (
                      <option key={hp.id} value={hp.id}>{hp.label}</option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                    Visuels appliqués (6 Parties)
                  </span>
                  <select
                    value={kitDocVisualScopes[model.id] || 'auto'}
                    onChange={(e) => onChangeKitDocVisualScope(model.id, e.target.value as ActorScopeId | 'auto')}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800 cursor-pointer"
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
              </div>

              {/* Ligne 2 : Interligne, Police, Espacements, Marges & Adaptation Page */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                  <span className="font-bold text-[#0B2545] uppercase text-[11px]">
                    Typographie, Interligne, Marges &amp; Adaptation au Format de Page
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex items-center gap-1.5 font-semibold text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={effectiveLayout.autoFitToPage !== false}
                        onChange={(e) => updateCustomLayout({ autoFitToPage: e.target.checked })}
                      />
                      <span>Auto-adapter à la page (anti-vide &amp; anti-mélange)</span>
                    </label>
                    <button
                      type="button"
                      onClick={resetCustomLayout}
                      className="px-2 py-1 rounded border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Réinitialiser</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <label className="block">
                    <span className="font-semibold text-slate-600 block mb-1">Format papier</span>
                    <select
                      value={effectiveLayout.pageFormat || 'a4'}
                      onChange={(e) => updateCustomLayout({ pageFormat: e.target.value as 'a4' | 'letter' })}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white font-semibold"
                    >
                      <option value="a4">A4 (210 × 297 mm)</option>
                      <option value="letter">US Letter (215,9 × 279,4 mm)</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="font-semibold text-slate-600 block mb-1">Orientation</span>
                    <select
                      value={effectiveLayout.orientation || 'portrait'}
                      onChange={(e) => updateCustomLayout({ orientation: e.target.value as 'portrait' | 'landscape' })}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white font-semibold"
                    >
                      <option value="portrait">Portrait</option>
                      <option value="landscape">Paysage</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="font-semibold text-slate-600 block mb-1">Police du document</span>
                    <select
                      value={effectiveLayout.fontFamily || 'helvetica'}
                      onChange={(e) =>
                        updateCustomLayout({ fontFamily: e.target.value as 'helvetica' | 'times' | 'courier' })
                      }
                      className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white font-semibold"
                    >
                      <option value="helvetica">Sans-Serif Moderne (Helvetica)</option>
                      <option value="times">Classique Juridique (Times)</option>
                      <option value="courier">Machine / Technique (Courier)</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="font-semibold text-slate-600 block mb-1">Aération globale</span>
                    <select
                      value={effectiveLayout.blockSpacing || 'standard'}
                      onChange={(e) =>
                        updateCustomLayout({ blockSpacing: e.target.value as 'compact' | 'standard' | 'airy' })
                      }
                      className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white font-semibold"
                    >
                      <option value="compact">Compacte (Dense)</option>
                      <option value="standard">Standard Équilibrée</option>
                      <option value="airy">Aérée (Large)</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="font-semibold text-slate-600 block mb-1">
                      Taille police (pt) : {customLayoutPatch.fontSizePt ?? adaptiveFit.fontSizePt}
                    </span>
                    <input
                      type="number"
                      step={0.2}
                      min={7.2}
                      max={12.5}
                      value={customLayoutPatch.fontSizePt ?? adaptiveFit.fontSizePt}
                      onChange={(e) => updateCustomLayout({ fontSizePt: Number(e.target.value) || 8.8 })}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white font-mono"
                    />
                  </label>

                  <label className="block">
                    <span className="font-semibold text-slate-600 block mb-1">
                      Interligne : {customLayoutPatch.lineHeight ?? adaptiveFit.lineHeight}
                    </span>
                    <input
                      type="number"
                      step={0.05}
                      min={1.1}
                      max={2.1}
                      value={customLayoutPatch.lineHeight ?? adaptiveFit.lineHeight}
                      onChange={(e) => updateCustomLayout({ lineHeight: Number(e.target.value) || 1.44 })}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white font-mono"
                    />
                  </label>

                  <label className="block">
                    <span className="font-semibold text-slate-600 block mb-1">
                      Espacement parag. (mm) : {customLayoutPatch.paragraphSpacingMm ?? adaptiveFit.paragraphSpacingMm}
                    </span>
                    <input
                      type="number"
                      step={0.2}
                      min={0.8}
                      max={8.0}
                      value={customLayoutPatch.paragraphSpacingMm ?? adaptiveFit.paragraphSpacingMm}
                      onChange={(e) => updateCustomLayout({ paragraphSpacingMm: Number(e.target.value) || 2.4 })}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white font-mono"
                    />
                  </label>

                  <label className="block">
                    <span className="font-semibold text-slate-600 block mb-1">Style bordure</span>
                    <select
                      value={effectiveLayout.borderStyle || 'simple'}
                      onChange={(e) =>
                        updateCustomLayout({ borderStyle: e.target.value as ReferenceLayoutTemplate['borderStyle'] })
                      }
                      className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white font-semibold"
                    >
                      <option value="simple">Bordure simple</option>
                      <option value="double">Double filet officiel</option>
                      <option value="official_band">Bandeau supérieur épais</option>
                      <option value="card_blocks">Blocs encadrés légers</option>
                      <option value="none">Sans bordure</option>
                    </select>
                  </label>
                </div>

                {/* Marges & Couleurs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                  <div>
                    <span className="font-semibold text-slate-600 block mb-1">Marges G / D / H / B (mm)</span>
                    <div className="grid grid-cols-4 gap-1.5">
                      {(['left', 'right', 'top', 'bottom'] as const).map((side) => (
                        <input
                          key={side}
                          type="number"
                          min={8}
                          max={35}
                          value={adaptiveFit.marginsMm[side]}
                          onChange={(e) =>
                            updateCustomLayout({
                              marginsMm: {
                                ...adaptiveFit.marginsMm,
                                [side]: Number(e.target.value) || 15
                              }
                            })
                          }
                          title={`Marge ${side} (mm)`}
                          className="px-1.5 py-1 border border-slate-300 rounded text-center font-mono"
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-4 sm:pt-0">
                    {(
                      [
                        { field: 'primaryColor', label: 'Principale' },
                        { field: 'headerBgColor', label: 'En-tête' },
                        { field: 'accentColor', label: 'Accent' },
                        { field: 'pageBgColor', label: 'Fond' }
                      ] as const
                    ).map((c) => (
                      <label key={c.field} className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="color"
                          value={effectiveLayout[c.field] || '#FFFFFF'}
                          onChange={(e) => updateCustomLayout({ [c.field]: e.target.value })}
                          className="w-6 h-6 rounded border border-slate-300 cursor-pointer"
                        />
                        <span className="text-slate-600 font-medium">{c.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Structure spatiale */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <span className="font-semibold text-slate-600 block">
                    Structure spatiale (En-tête, Corps, Signatures, Pied de page)
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    <select
                      value={bp.headerLayout}
                      onChange={(e) =>
                        updateCustomLayout({
                          spatialBlueprint: { ...bp, headerLayout: e.target.value as SpatialBlueprint['headerLayout'] }
                        })
                      }
                      className="px-2 py-1.5 border border-slate-300 rounded bg-white text-[11px] font-semibold"
                    >
                      <option value="filled_banner">Bandeau plein</option>
                      <option value="top_accent_bar">Barre d&apos;accent</option>
                      <option value="split_lr">Séparé G / D</option>
                      <option value="left_clean">Épuré gauche</option>
                      <option value="centered_stack">Centré empilé</option>
                    </select>
                    <select
                      value={bp.titleAlign}
                      onChange={(e) =>
                        updateCustomLayout({
                          spatialBlueprint: { ...bp, titleAlign: e.target.value as SpatialBlueprint['titleAlign'] }
                        })
                      }
                      className="px-2 py-1.5 border border-slate-300 rounded bg-white text-[11px] font-semibold"
                    >
                      <option value="left">Titre à gauche</option>
                      <option value="center">Titre centré</option>
                      <option value="right">Titre à droite</option>
                    </select>
                    <select
                      value={bp.bodyLayout}
                      onChange={(e) =>
                        updateCustomLayout({
                          spatialBlueprint: { ...bp, bodyLayout: e.target.value as SpatialBlueprint['bodyLayout'] }
                        })
                      }
                      className="px-2 py-1.5 border border-slate-300 rounded bg-white text-[11px] font-semibold"
                    >
                      <option value="prose_paragraphs">Paragraphes fluides</option>
                      <option value="numbered_sections">Sections numérotées</option>
                      <option value="cards">Blocs encadrés</option>
                    </select>
                    <select
                      value={bp.signatureLayout}
                      onChange={(e) =>
                        updateCustomLayout({
                          spatialBlueprint: { ...bp, signatureLayout: e.target.value as SpatialBlueprint['signatureLayout'] }
                        })
                      }
                      className="px-2 py-1.5 border border-slate-300 rounded bg-white text-[11px] font-semibold"
                    >
                      <option value="two_col_fait_a_right_sig">Fait à + Droite</option>
                      <option value="two_col_bipartite">Bipartite</option>
                      <option value="three_col_footer">3 colonnes</option>
                      <option value="right_block">Bloc droite</option>
                      <option value="left_block">Bloc gauche</option>
                    </select>
                    <select
                      value={bp.footerLayout}
                      onChange={(e) =>
                        updateCustomLayout({
                          spatialBlueprint: { ...bp, footerLayout: e.target.value as SpatialBlueprint['footerLayout'] }
                        })
                      }
                      className="px-2 py-1.5 border border-slate-300 rounded bg-white text-[11px] font-semibold"
                    >
                      <option value="qr_legal_page">QR + Mentions + Page</option>
                      <option value="centered_legal">Mentions centrées</option>
                      <option value="rule_with_page">Filet + Page</option>
                      <option value="minimal_page">Page minimale</option>
                      <option value="none">Sans pied de page</option>
                    </select>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[11px]">
                    {(
                      [
                        { key: 'hasRefPill', label: 'Pastille Réf.' },
                        { key: 'titleHasBox', label: 'Titre encadré' },
                        { key: 'titleHasUnderline', label: 'Titre souligné' },
                        { key: 'titleUppercase', label: 'Titre MAJUSCULES' },
                        { key: 'hasLeftAccentStripe', label: 'Bande gauche' },
                        { key: 'hasSectionDividers', label: 'Séparateurs sections' }
                      ] as const
                    ).map((tog) => (
                      <label key={tog.key} className="inline-flex items-center gap-1.5 px-2 py-1 rounded border border-slate-200 bg-slate-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(bp[tog.key])}
                          onChange={(e) =>
                            updateCustomLayout({
                              spatialBlueprint: { ...bp, [tog.key]: e.target.checked }
                            })
                          }
                        />
                        <span>{tog.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* ONGLET 3 : VISUELS & TAMPONS STRICTEMENT LIÉS À L'ACTEUR        */}
          {/* =============================================================== */}
          {activeTab === 'visuals' && (
            <div className="space-y-3">
              {actorReq.isDualParty && actorReq.secondaryActor && (
                <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                  <span className="font-semibold text-slate-700">
                    Document bipartite / tripartite — Sélectionnez l&apos;acteur dont vous souhaitez régler les visuels :
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setVisualActorFocus(actorReq.primaryActor)}
                      className={`px-2.5 py-1 rounded font-bold cursor-pointer ${
                        visualActorFocus === actorReq.primaryActor
                          ? 'bg-[#0B2545] text-white'
                          : 'bg-white border border-slate-300 text-slate-700'
                      }`}
                    >
                      Acteur Principal ({actorReq.primaryActor === 'prestataire' ? 'Cabinet CRIC' : 'Employeur'})
                    </button>
                    <button
                      type="button"
                      onClick={() => setVisualActorFocus(actorReq.secondaryActor!)}
                      className={`px-2.5 py-1 rounded font-bold cursor-pointer ${
                        visualActorFocus === actorReq.secondaryActor
                          ? 'bg-[#0B2545] text-white'
                          : 'bg-white border border-slate-300 text-slate-700'
                      }`}
                    >
                      Seconde Partie ({actorReq.secondaryActor === 'prestataire' ? 'Cabinet CRIC' : 'Employeur'})
                    </button>
                  </div>
                </div>
              )}

              <PanneauReglagesFichiersImportes
                lockedActorScope={visualActorFocus}
                assetsConfig={assetsConfig}
                onChangeConfig={onChangeAssetsConfig}
                uploadedAssetUrls={uploadedAssets}
                onUploadAsset={onUploadAsset}
                verificationCodeRef={postulant.codeIdCandidature}
                onOpenStampGenerator={onOpenStampGenerator}
                onOpenVisualGenerator={onOpenVisualGenerator}
                compact={true}
                title={`Visuels & Tampons de ${model.number} (${actorReq.badgeLabel})`}
              />
            </div>
          )}

          {/* =============================================================== */}
          {/* ONGLET 4 : STUDIO CANVA & REPRODUCTION FIDÈLE                   */}
          {/* =============================================================== */}
          {activeTab === 'studio' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs">
                <span className="text-[#0B2545] font-semibold">
                  Importez un modèle externe (PDF, JPG, PNG, DOCX), cliquez sur n&apos;importe quelle zone pour la convertir en texte éditable ou appliquez la palette extraite à {model.number}.
                </span>
                {kitDocLayouts[model.id] !== 'modele_importe' && (
                  <button
                    type="button"
                    onClick={() => {
                      onChangeKitDocLayout(model.id, 'modele_importe');
                      onToast(`${model.number} lié au Modèle Importé / Studio Canva.`);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#0066B3] hover:bg-[#005291] text-white font-bold cursor-pointer"
                  >
                    Appliquer le modèle du Studio à {model.number}
                  </button>
                )}
              </div>

              <InteractiveReplicaStudio
                docKey="doc_es"
                onOpenInWebmail={onOpenInWebmail}
                onSyncedPalette={(pal) => {
                  updateCustomLayout(
                    {
                      primaryColor: pal.primary,
                      accentColor: pal.accent,
                      pageBgColor: pal.pageBgColor
                    },
                    `Palette du Studio appliquée à ${model.number}.`
                  );
                  onUpdateDocEsTemplate?.({
                    primaryColor: pal.primary,
                    accentColor: pal.accent,
                    pageBgColor: pal.pageBgColor
                  });
                }}
                onToast={onToast}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
