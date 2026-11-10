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
  Sparkles
} from 'lucide-react';
import {
  PdfImportedAssetsConfig,
  PdfAssetItemSettings,
  DEFAULT_PDF_ASSETS_CONFIG,
  savePdfAssetsConfigToFirestore
} from '../../services/departmentsAndEmailService';
import { removeImageBackground } from '../../services/imageTransparencyService';

export type AssetTabKey =
  | 'logo'
  | 'signature'
  | 'cachet'
  | 'filigrane'
  | 'arrierePlan'
  | 'logoPrestataire'
  | 'signaturePrestataire'
  | 'cachetPrestataire';

interface PanneauReglagesFichiersImportesProps {
  assetsConfig?: PdfImportedAssetsConfig;
  initialConfig?: PdfImportedAssetsConfig;
  onChangeConfig?: (newConfig: PdfImportedAssetsConfig) => void;
  onConfigChange?: (newConfig: PdfImportedAssetsConfig) => void;
  onUploadAsset?: (key: AssetTabKey, dataUrl: string, filename: string) => void;
  uploadedAssetUrls?: {
    logo?: string;
    signature?: string;
    cachet?: string;
    filigrane?: string;
    arrierePlan?: string;
    logoPrestataire?: string;
    signaturePrestataire?: string;
    cachetPrestataire?: string;
  };
  title?: string;
  moduleTitle?: string;
}

export const PanneauReglagesFichiersImportes: React.FC<PanneauReglagesFichiersImportesProps> = ({
  assetsConfig: propAssetsConfig,
  initialConfig,
  onChangeConfig,
  onConfigChange,
  onUploadAsset,
  uploadedAssetUrls = {},
  title,
  moduleTitle
}) => {
  const effectiveConfig = propAssetsConfig || initialConfig || DEFAULT_PDF_ASSETS_CONFIG;
  const notifyChange = onChangeConfig || onConfigChange || (() => {});
  const displayTitle =
    title ||
    moduleTitle ||
    "Panneau Réglages Fichiers Importés — Prévisualisation en direct & Sauvegarde Firestore";

  const [activeScope, setActiveScope] = useState<'employeur' | 'prestataire'>('employeur');
  const [activeTab, setActiveTab] = useState<AssetTabKey>('logo');
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const employeurTabs: { key: AssetTabKey; label: string; badge: string }[] = [
    { key: 'logo', label: '1. Logo Officiel', badge: 'En-tête / Badge' },
    { key: 'signature', label: '2. Signature Employeur', badge: 'Zone Paraphes' },
    { key: 'cachet', label: '3. Cachet Employeur', badge: 'Tampon Officiel' },
    { key: 'filigrane', label: '4. Filigrane', badge: 'Blason / Watermark' },
    { key: 'arrierePlan', label: '5. Arrière-Plan', badge: 'Fond de page' }
  ];

  const prestataireTabs: { key: AssetTabKey; label: string; badge: string }[] = [
    { key: 'logoPrestataire', label: '1. Logo Prestataire', badge: 'Cabinet Mandaté' },
    { key: 'signaturePrestataire', label: '2. Signature Prestataire', badge: 'Signataire Mandataire' },
    { key: 'cachetPrestataire', label: '3. Cachet Prestataire', badge: 'Sceau / Tampon Mandat' }
  ];

  const currentTabs = activeScope === 'employeur' ? employeurTabs : prestataireTabs;

  const currentCfg: PdfAssetItemSettings =
    effectiveConfig[activeTab] ||
    DEFAULT_PDF_ASSETS_CONFIG[activeTab] || {
      widthValue: 100,
      widthUnit: 'px',
      heightValue: 100,
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

  const updateSetting = <K extends keyof PdfAssetItemSettings>(
    field: K,
    val: PdfAssetItemSettings[K]
  ) => {
    const updatedItem = {
      ...currentCfg,
      [field]: val
    };
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
    setFeedback(`Réglages de « ${activeTab} » réinitialisés`);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleResetAll = () => {
    const next = {
      ...DEFAULT_PDF_ASSETS_CONFIG,
      updated_at: new Date().toISOString()
    };
    notifyChange(next);
    setFeedback('Tous les réglages ont été réinitialisés aux valeurs d’origine');
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleSaveFirestore = async () => {
    setIsSaving(true);
    try {
      await savePdfAssetsConfigToFirestore(effectiveConfig);
      setFeedback('Réglages sauvegardés dans Firestore et synchronisés avec succès !');
    } catch {
      setFeedback('Enregistré localement (sauvegarde Firestore hors ligne)');
    } finally {
      setIsSaving(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUploadAsset) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onUploadAsset(activeTab, reader.result, file.name);
        setFeedback(`Fichier « ${file.name} » importé avec succès pour ${activeTab}`);
        setTimeout(() => setFeedback(null), 3500);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleMakeTransparent = async () => {
    const src = uploadedAssetUrls[activeTab];
    if (!src || !onUploadAsset) {
      setFeedback('Veuillez d’abord importer un fichier pour cet élément.');
      setTimeout(() => setFeedback(null), 3000);
      return;
    }
    try {
      setFeedback('Suppression du fond blanc/clair en cours...');
      const transparentDataUrl = await removeImageBackground(src, { tolerance: 35 });
      onUploadAsset(activeTab, transparentDataUrl, `${activeTab}_transparent.png`);
      setFeedback('Fond transparent appliqué avec succès !');
      setTimeout(() => setFeedback(null), 3500);
    } catch {
      setFeedback('Erreur lors du traitement de transparence.');
      setTimeout(() => setFeedback(null), 3500);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-300 bg-slate-50 p-4 sm:p-5 space-y-4 shadow-xs">
      {/* Header du panneau */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2.5">
          <Sliders className="w-5 h-5 text-[#0B2545] shrink-0" />
          <div>
            <h5 className="text-sm font-bold text-[#0B2545]">{displayTitle}</h5>
            <p className="text-[11px] text-slate-600">
              Ajustez largeur, hauteur, opacité, position X/Y, rotation, couleur/teinte et superposition pour tous vos documents officiels (Employeur &amp; Prestataire CRIC).
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {feedback && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-lg animate-fade-in">
              <Check className="w-3.5 h-3.5" />
              <span>{feedback}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleResetSingle}
            className="min-h-[36px] px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Réinitialiser</span>
          </button>

          <button
            type="button"
            onClick={handleResetAll}
            className="min-h-[36px] px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-600 cursor-pointer"
          >
            Tout réinitialiser
          </button>

          <button
            type="button"
            onClick={handleSaveFirestore}
            disabled={isSaving}
            className="min-h-[36px] px-4 py-1.5 rounded-xl bg-[#0B2545] hover:bg-[#134074] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs disabled:opacity-60 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5 text-amber-400" />
            <span>{isSaving ? 'Enregistrement...' : 'Sauvegarder dans Firestore'}</span>
          </button>
        </div>
      </div>

      {/* SÉLECTEUR DE SCOPE : EMPLOYEUR CANADA VS PRESTATAIRE CRIC */}
      <div className="flex items-center gap-2 p-1 bg-slate-200/70 rounded-xl w-fit">
        <button
          type="button"
          onClick={() => {
            setActiveScope('employeur');
            setActiveTab('logo');
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
            activeScope === 'employeur'
              ? 'bg-[#0B2545] text-white shadow-xs'
              : 'text-slate-700 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-3.5 h-3.5 text-amber-400" />
          <span>🏢 Entreprise Employeur (Canada)</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveScope('prestataire');
            setActiveTab('signaturePrestataire');
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
            activeScope === 'prestataire'
              ? 'bg-[#0066B3] text-white shadow-xs'
              : 'text-slate-700 hover:text-slate-900'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5 text-amber-300" />
          <span>🤝 Cabinet Prestataire CRIC</span>
        </button>
      </div>

      {/* Onglets de sélection du fichier ciblé */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {currentTabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActiveTab(t.key)}
            className={`min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer shrink-0 ${
              activeTab === t.key
                ? 'bg-white border-[#0B2545] text-[#0B2545] shadow-xs ring-2 ring-[#0B2545]/15'
                : 'bg-white/60 border-slate-200 text-slate-700 hover:bg-white'
            }`}
          >
            <span>{t.label}</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium ${
                activeTab === t.key
                  ? 'bg-[#0B2545] text-white'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {t.badge}
            </span>
          </button>
        ))}
      </div>

      {/* Zone de téléversement direct si activée */}
      {onUploadAsset && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-white border border-slate-200">
          <div className="flex items-center gap-3">
            {uploadedAssetUrls[activeTab] ? (
              <img
                src={uploadedAssetUrls[activeTab]}
                alt={activeTab}
                className="w-12 h-12 object-contain rounded-lg border border-slate-200 bg-slate-50 p-1 shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center text-slate-400 shrink-0">
                <ImageIcon className="w-5 h-5" />
              </div>
            )}
            <div>
              <span className="text-xs font-bold text-slate-800 block">
                Fichier source actif pour {activeTab}
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                {uploadedAssetUrls[activeTab] ? 'Fichier personnalisé chargé' : 'Utilise le fichier système par défaut'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {uploadedAssetUrls[activeTab] && (
              <button
                type="button"
                onClick={handleMakeTransparent}
                className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                title="Supprime automatiquement le fond blanc ou clair de ce fichier"
              >
                <Sparkles className="w-4 h-4 text-slate-950" />
                <span>Rendre Fond Transparent</span>
              </button>
            )}

            <label className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-white border border-slate-300 hover:border-[#0B2545] text-xs font-semibold text-slate-700 flex items-center gap-2 cursor-pointer shadow-2xs hover:bg-slate-50 transition-colors shrink-0">
              <Upload className="w-4 h-4 text-[#0B2545]" />
              <span>Remplacer ce fichier (PNG/JPG)</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleFileInput}
                className="hidden"
              />
            </label>
          </div>
        </div>
      )}

      {/* Grille de contrôles ergonomiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-white p-4 rounded-xl border border-slate-200">
        
        {/* Colonne 1 : Dimensions (Largeur & Hauteur) */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#0B2545]">
            <Maximize2 className="w-4 h-4 text-amber-600" />
            <span>Dimensions</span>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
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
                className="min-h-[30px] px-1.5 py-0.5 rounded-lg border border-slate-300 text-xs font-mono bg-white"
              >
                <option value="px">px</option>
                <option value="%">%</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
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
                className="min-h-[30px] px-1.5 py-0.5 rounded-lg border border-slate-300 text-xs font-mono bg-white"
              >
                <option value="px">px</option>
                <option value="%">%</option>
              </select>
            </div>
          </div>
        </div>

        {/* Colonne 2 : Opacité & Rotation */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#0B2545]">
            <Eye className="w-4 h-4 text-blue-600" />
            <span>Opacité &amp; Rotation</span>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
              <span>Opacité globale</span>
              <span className="font-mono font-bold text-slate-900">{currentCfg.opacity} %</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={currentCfg.opacity}
              onChange={(e) => updateSetting('opacity', parseInt(e.target.value, 10))}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
              <span>Rotation</span>
              <span className="font-mono font-bold text-slate-900">{currentCfg.rotation} °</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="-180"
                max="180"
                step="1"
                value={currentCfg.rotation}
                onChange={(e) => updateSetting('rotation', parseInt(e.target.value, 10))}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <button
                type="button"
                onClick={() => updateSetting('rotation', 0)}
                className="text-[11px] px-1.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer font-mono"
                title="Remettre à 0°"
              >
                0°
              </button>
            </div>
          </div>
        </div>

        {/* Colonne 3 : Décalages Position X/Y */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#0B2545]">
            <Move className="w-4 h-4 text-emerald-600" />
            <span>Position X / Y (Décalage)</span>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
              <span>Position X (Horizontal)</span>
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
                className="text-[11px] px-1.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer font-mono"
              >
                0
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
              <span>Position Y (Vertical)</span>
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
                className="text-[11px] px-1.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer font-mono"
              >
                0
              </button>
            </div>
          </div>
        </div>

        {/* Colonne 4 : Teinte Couleur & Superposition (Z-Index) */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#0B2545]">
            <Palette className="w-4 h-4 text-purple-600" />
            <span>Filtre Couleur &amp; Superposition</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs text-slate-600 flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={currentCfg.tintEnabled}
                  onChange={(e) => updateSetting('tintEnabled', e.target.checked)}
                  className="rounded text-[#0B2545] focus:ring-[#0B2545]"
                />
                <span>Appliquer teinte</span>
              </label>
              <span className="text-[11px] font-mono font-bold text-slate-700">
                {currentCfg.tintColor}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={currentCfg.tintColor}
                disabled={!currentCfg.tintEnabled}
                onChange={(e) => updateSetting('tintColor', e.target.value)}
                className="w-9 h-8 rounded border border-slate-300 p-0.5 cursor-pointer disabled:opacity-40"
              />
              <div className="flex items-center gap-1">
                {['#0B2545', '#0066B3', '#D4A017', '#1E293B', '#166534'].map((col) => (
                  <button
                    key={col}
                    type="button"
                    disabled={!currentCfg.tintEnabled}
                    onClick={() => updateSetting('tintColor', col)}
                    style={{ backgroundColor: col }}
                    className="w-5 h-5 rounded-full border border-white shadow-2xs cursor-pointer disabled:opacity-30"
                  />
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
              <span className="flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                <span>Plan / Z-Index</span>
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
              className="w-full accent-purple-600 cursor-pointer"
            />
          </div>
        </div>

      </div>
    </div>
  );
};
