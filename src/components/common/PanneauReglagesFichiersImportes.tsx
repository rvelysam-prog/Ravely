import React, { useState } from 'react';
import {
  Sliders,
  RotateCcw,
  Save,
  Upload,
  Image,
  Layers,
  Palette,
  Move,
  Maximize2,
  Check,
  Eye
} from 'lucide-react';
import {
  PdfImportedAssetsConfig,
  PdfAssetItemSettings,
  DEFAULT_PDF_ASSETS_CONFIG,
  savePdfAssetsConfigToFirestore
} from '../../services/departmentsAndEmailService';

export type AssetTabKey = 'logo' | 'signature' | 'cachet' | 'filigrane' | 'arrierePlan';

interface PanneauReglagesFichiersImportesProps {
  assetsConfig: PdfImportedAssetsConfig;
  onChangeConfig: (newConfig: PdfImportedAssetsConfig) => void;
  onUploadAsset?: (key: AssetTabKey, dataUrl: string, filename: string) => void;
  uploadedAssetUrls?: {
    logo?: string;
    signature?: string;
    cachet?: string;
    filigrane?: string;
    arrierePlan?: string;
  };
  title?: string;
}

export const PanneauReglagesFichiersImportes: React.FC<PanneauReglagesFichiersImportesProps> = ({
  assetsConfig,
  onChangeConfig,
  onUploadAsset,
  uploadedAssetUrls = {},
  title = "Panneau Réglages Fichiers Importés — Prévisualisation en direct & Sauvegarde Firestore"
}) => {
  const [activeTab, setActiveTab] = useState<AssetTabKey>('logo');
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const tabs: { key: AssetTabKey; label: string; badge: string }[] = [
    { key: 'logo', label: '1. Logo Officiel', badge: 'En-tête / Badge' },
    { key: 'signature', label: '2. Signature', badge: 'Zone Paraphes' },
    { key: 'cachet', label: '3. Cachet / Sceau', badge: 'Tampon Officiel' },
    { key: 'filigrane', label: '4. Filigrane', badge: 'Blason / Watermark' },
    { key: 'arrierePlan', label: '5. Arrière-Plan', badge: 'Fond de page' }
  ];

  const currentCfg: PdfAssetItemSettings = assetsConfig[activeTab] || DEFAULT_PDF_ASSETS_CONFIG[activeTab] || {
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
      ...assetsConfig,
      [activeTab]: updatedItem,
      updated_at: new Date().toISOString()
    };
    onChangeConfig(next);
  };

  const handleResetSingle = () => {
    const defaultItem = DEFAULT_PDF_ASSETS_CONFIG[activeTab] || currentCfg;
    const next: PdfImportedAssetsConfig = {
      ...assetsConfig,
      [activeTab]: defaultItem,
      updated_at: new Date().toISOString()
    };
    onChangeConfig(next);
    setFeedback(`Réglages de « ${activeTab} » réinitialisés`);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleResetAll = () => {
    onChangeConfig({
      ...DEFAULT_PDF_ASSETS_CONFIG,
      updated_at: new Date().toISOString()
    });
    setFeedback('Tous les réglages ont été réinitialisés aux valeurs d’origine');
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleSaveFirestore = async () => {
    setIsSaving(true);
    try {
      await savePdfAssetsConfigToFirestore(assetsConfig);
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

  return (
    <div className="rounded-2xl border border-slate-300 bg-slate-50 p-4 sm:p-5 space-y-4 shadow-xs">
      {/* Header du panneau */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2.5">
          <Sliders className="w-5 h-5 text-[#0B2545] shrink-0" />
          <div>
            <h5 className="text-sm font-bold text-[#0B2545]">{title}</h5>
            <p className="text-[11px] text-slate-600">
              Ajustez largeur, hauteur, opacité, position X/Y, rotation, couleur/teinte et superposition pour tous vos documents officiels.
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
            className="min-h-[36px] px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Réinitialiser</span>
          </button>

          <button
            type="button"
            onClick={handleResetAll}
            className="min-h-[36px] px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-600"
          >
            Tout réinitialiser
          </button>

          <button
            type="button"
            onClick={handleSaveFirestore}
            disabled={isSaving}
            className="min-h-[36px] px-4 py-1.5 rounded-xl bg-[#0B2545] hover:bg-[#134074] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs disabled:opacity-60"
          >
            <Save className="w-3.5 h-3.5 text-amber-400" />
            <span>{isSaving ? 'Sauvegarde...' : 'Sauvegarder dans Firestore'}</span>
          </button>
        </div>
      </div>

      {/* Onglets de sélection du fichier à régler */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {tabs.map((tab) => {
          const isSelected = activeTab === tab.key;
          const hasCustom = Boolean(uploadedAssetUrls[tab.key]);
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`p-2.5 rounded-xl border text-left transition-all relative ${
                isSelected
                  ? 'bg-[#0B2545] text-white border-[#0B2545] shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold truncate">{tab.label}</span>
                {hasCustom && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" title="Fichier importé personnalisé actif" />
                )}
              </div>
              <div
                className={`text-[10px] font-mono mt-0.5 ${
                  isSelected ? 'text-amber-300' : 'text-slate-500'
                }`}
              >
                {tab.badge}
              </div>
            </button>
          );
        })}
      </div>

      {/* Barre d'importation dédiée pour l'onglet actif */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white rounded-xl border border-slate-200">
        <div className="flex items-center gap-2.5">
          <Upload className="w-4 h-4 text-[#0B2545]" />
          <span className="text-xs font-semibold text-slate-800">
            Importer un fichier pour « {tabs.find((t) => t.key === activeTab)?.label} » :
          </span>
          {uploadedAssetUrls[activeTab] ? (
            <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              Actif &amp; visible en direct
            </span>
          ) : (
            <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
              Fichier standard du site
            </span>
          )}
        </div>

        <label className="cursor-pointer min-h-[34px] px-3.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-xs font-bold text-[#0B2545] inline-flex items-center gap-1.5 transition-colors">
          <Upload className="w-3.5 h-3.5 text-amber-600" />
          <span>Charger une image (PNG / JPG / WebP)</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFileInput}
            className="hidden"
          />
        </label>
      </div>

      {/* Contrôles détaillés pour l'élément sélectionné */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-white p-4 rounded-xl border border-slate-200">
        {/* 1. Largeur */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700">
              Largeur ({currentCfg.widthUnit})
            </label>
            <div className="inline-flex rounded-lg border border-slate-300 overflow-hidden text-[11px] font-mono">
              {(['px', '%'] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => updateSetting('widthUnit', u)}
                  className={`px-2 py-0.5 font-bold ${
                    currentCfg.widthUnit === u
                      ? 'bg-[#0B2545] text-white'
                      : 'bg-slate-50 text-slate-600'
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={currentCfg.widthUnit === '%' ? 10 : 20}
              max={currentCfg.widthUnit === '%' ? 100 : 700}
              value={currentCfg.widthValue}
              onChange={(e) => updateSetting('widthValue', Number(e.target.value))}
              className="w-full accent-[#0B2545]"
            />
            <span className="font-mono text-xs font-bold text-slate-800 w-12 text-right">
              {currentCfg.widthValue}
              {currentCfg.widthUnit}
            </span>
          </div>
        </div>

        {/* 2. Hauteur */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700">
              Hauteur ({currentCfg.heightUnit})
            </label>
            <div className="inline-flex rounded-lg border border-slate-300 overflow-hidden text-[11px] font-mono">
              {(['px', '%'] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => updateSetting('heightUnit', u)}
                  className={`px-2 py-0.5 font-bold ${
                    currentCfg.heightUnit === u
                      ? 'bg-[#0B2545] text-white'
                      : 'bg-slate-50 text-slate-600'
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={currentCfg.heightUnit === '%' ? 10 : 15}
              max={currentCfg.heightUnit === '%' ? 100 : 500}
              value={currentCfg.heightValue}
              onChange={(e) => updateSetting('heightValue', Number(e.target.value))}
              className="w-full accent-[#0B2545]"
            />
            <span className="font-mono text-xs font-bold text-slate-800 w-12 text-right">
              {currentCfg.heightValue}
              {currentCfg.heightUnit}
            </span>
          </div>
        </div>

        {/* 3. Opacité */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700">Opacité (%)</label>
            <span className="text-[10px] text-slate-500 font-mono">0-100%</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={5}
              max={100}
              value={currentCfg.opacity}
              onChange={(e) => updateSetting('opacity', Number(e.target.value))}
              className="w-full accent-[#0B2545]"
            />
            <span className="font-mono text-xs font-bold text-slate-800 w-12 text-right">
              {currentCfg.opacity}%
            </span>
          </div>
        </div>

        {/* 4. Rotation */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700">Rotation (°)</label>
            <button
              type="button"
              onClick={() => updateSetting('rotation', 0)}
              className="text-[10px] text-[#0066B3] hover:underline"
            >
              0°
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={-90}
              max={90}
              value={currentCfg.rotation}
              onChange={(e) => updateSetting('rotation', Number(e.target.value))}
              className="w-full accent-[#0B2545]"
            />
            <span className="font-mono text-xs font-bold text-slate-800 w-12 text-right">
              {currentCfg.rotation}°
            </span>
          </div>
        </div>

        {/* 5. Décalage X (px) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700">Position X (px)</label>
            <button
              type="button"
              onClick={() => updateSetting('offsetX', 0)}
              className="text-[10px] text-[#0066B3] hover:underline"
            >
              Centre
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={-200}
              max={200}
              value={currentCfg.offsetX}
              onChange={(e) => updateSetting('offsetX', Number(e.target.value))}
              className="w-full accent-[#0B2545]"
            />
            <span className="font-mono text-xs font-bold text-slate-800 w-12 text-right">
              {currentCfg.offsetX > 0 ? `+${currentCfg.offsetX}` : currentCfg.offsetX}px
            </span>
          </div>
        </div>

        {/* 6. Décalage Y (px) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700">Position Y (px)</label>
            <button
              type="button"
              onClick={() => updateSetting('offsetY', 0)}
              className="text-[10px] text-[#0066B3] hover:underline"
            >
              Centre
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={-200}
              max={200}
              value={currentCfg.offsetY}
              onChange={(e) => updateSetting('offsetY', Number(e.target.value))}
              className="w-full accent-[#0B2545]"
            />
            <span className="font-mono text-xs font-bold text-slate-800 w-12 text-right">
              {currentCfg.offsetY > 0 ? `+${currentCfg.offsetY}` : currentCfg.offsetY}px
            </span>
          </div>
        </div>

        {/* 7. Alignement horizontal */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 block">Alignement</label>
          <div className="grid grid-cols-3 gap-1">
            {(['left', 'center', 'right'] as const).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => updateSetting('alignX', a)}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold uppercase transition-all ${
                  currentCfg.alignX === a
                    ? 'bg-[#0B2545] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {a === 'left' ? 'Gauche' : a === 'center' ? 'Centré' : 'Droite'}
              </button>
            ))}
          </div>
        </div>

        {/* 8. Teinte / Filtre couleur */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700">Couleur / Teinte</label>
            <label className="inline-flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={currentCfg.tintEnabled}
                onChange={(e) => updateSetting('tintEnabled', e.target.checked)}
                className="w-3.5 h-3.5 rounded text-[#0B2545] accent-[#0B2545]"
              />
              <span className="text-[10px] font-semibold text-slate-600">Activer</span>
            </label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={currentCfg.tintColor}
              disabled={!currentCfg.tintEnabled}
              onChange={(e) => updateSetting('tintColor', e.target.value)}
              className="w-8 h-8 rounded-lg border border-slate-300 cursor-pointer disabled:opacity-40"
            />
            <input
              type="text"
              value={currentCfg.tintColor}
              disabled={!currentCfg.tintEnabled}
              onChange={(e) => updateSetting('tintColor', e.target.value)}
              className="w-full h-8 px-2 rounded-lg border border-slate-300 text-xs font-mono font-bold disabled:bg-slate-100"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
