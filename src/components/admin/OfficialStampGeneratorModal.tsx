import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Sparkles,
  Download,
  Check,
  RotateCcw,
  Sliders,
  ShieldCheck,
  Calendar,
  Building2,
  FileCheck2,
  Type
} from 'lucide-react';
import {
  StampOptions,
  StampShape,
  generateOfficialStampPngDataUrl,
  CANDIDATE_TICKET_STAMP_PRESETS
} from '../../services/stampGeneratorService';
import { SiteSettings } from '../../types';

interface OfficialStampGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyStamp: (stampDataUrl: string) => void;
  settings?: SiteSettings;
  initialMention?: string;
  initialPresetId?: string;
}

export const OfficialStampGeneratorModal: React.FC<OfficialStampGeneratorModalProps> = ({
  isOpen,
  onClose,
  onApplyStamp,
  settings,
  initialMention,
  initialPresetId
}) => {
  const companyName = settings?.company_name || 'ATLANTIC TRANSPORT LTD.';

  const [stampOptions, setStampOptions] = useState<StampOptions>({
    shape: 'circle',
    inkColor: '#004D99',
    companyName: companyName,
    subtitle: 'SURREY, COLOMBIE-BRITANNIQUE · CANADA',
    centerMention: initialMention || 'DIRECTION GÉNÉRALE',
    dateText: new Date().toLocaleDateString('fr-CA', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase(),
    emblemType: 'stars',
    weatheredEffect: true,
    rotation: -3
  });

  const [previewDataUrl, setPreviewDataUrl] = useState<string>('');
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);

  // Génération en direct du tampon à chaque changement
  useEffect(() => {
    let isCancelled = false;
    generateOfficialStampPngDataUrl(stampOptions).then((dataUrl) => {
      if (!isCancelled) {
        setPreviewDataUrl(dataUrl);
      }
    });
    return () => {
      isCancelled = true;
    };
  }, [stampOptions]);

  // Si preset demandé à l'ouverture
  useEffect(() => {
    if (initialPresetId) {
      const preset = CANDIDATE_TICKET_STAMP_PRESETS.find((p) => p.id === initialPresetId);
      if (preset) {
        setStampOptions((prev) => ({
          ...prev,
          shape: preset.shape,
          inkColor: preset.inkColor,
          centerMention: preset.centerMention,
          subtitle: preset.subtitle,
          emblemType: preset.emblemType
        }));
      }
    }
  }, [initialPresetId]);

  if (!isOpen) return null;

  const triggerToast = (msg: string) => {
    setCopiedNotification(msg);
    setTimeout(() => setCopiedNotification(null), 3000);
  };

  const handleDownloadPng = () => {
    if (!previewDataUrl) return;
    const a = document.createElement('a');
    a.href = previewDataUrl;
    a.download = `Tampon_Officiel_${stampOptions.centerMention.replace(/\s+/g, '_')}.png`;
    a.click();
    triggerToast('Tampon PNG transparent téléchargé !');
  };

  const handleApply = () => {
    if (!previewDataUrl) return;
    onApplyStamp(previewDataUrl);
    triggerToast('Tampon appliqué avec succès sur le document !');
    setTimeout(() => onClose(), 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#0B2545] text-white px-6 py-4 flex items-center justify-between border-b border-amber-400/20">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">Générateur de Tampon &amp; Cachet Officiel</h3>
              <p className="text-xs text-slate-300">Créez des tampons officiels consulaires et d'entreprise en haute définition</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toast */}
        {copiedNotification && (
          <div className="bg-emerald-600 text-white text-xs px-6 py-2 flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>{copiedNotification}</span>
          </div>
        )}

        {/* Corps modal en 2 colonnes */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6 overflow-y-auto">
          {/* Colonne Gauche : Paramètres de configuration */}
          <div className="md:col-span-7 space-y-4 text-xs">
            {/* Modèles rapides */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <span className="font-bold text-slate-700 block">Modèles d'attestation rapide (Ticket &amp; Mandat) :</span>
              <div className="grid grid-cols-2 gap-1.5">
                {CANDIDATE_TICKET_STAMP_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() =>
                      setStampOptions((prev) => ({
                        ...prev,
                        shape: p.shape,
                        inkColor: p.inkColor,
                        centerMention: p.centerMention,
                        subtitle: p.subtitle,
                        emblemType: p.emblemType
                      }))
                    }
                    className="p-2 rounded-lg border text-left bg-white hover:bg-blue-50/50 hover:border-blue-300 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.inkColor }} />
                      <span className="font-bold text-[11px] text-slate-800 line-clamp-1">{p.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Forme du tampon */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">Forme géométrique :</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'circle', label: 'Rond Consulaire' },
                  { id: 'rectangle', label: 'Rectangulaire Direction' },
                  { id: 'oval', label: 'Ovale Certification' }
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStampOptions({ ...stampOptions, shape: s.id as StampShape })}
                    className={`py-2 px-3 rounded-xl border font-bold text-xs transition-all cursor-pointer ${
                      stampOptions.shape === s.id
                        ? 'bg-[#0B2545] text-white border-[#0B2545] shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Couleur de l'encre */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">Couleur d'encrage :</label>
              <div className="flex items-center gap-2">
                {[
                  { color: '#004D99', name: 'Bleu Officiel' },
                  { color: '#B91C1C', name: 'Rouge Notarié' },
                  { color: '#15803D', name: 'Vert Validé' },
                  { color: '#1E293B', name: 'Noir Archivage' },
                  { color: '#6D28D9', name: 'Violet Souverain' }
                ].map((ink) => (
                  <button
                    key={ink.color}
                    type="button"
                    onClick={() => setStampOptions({ ...stampOptions, inkColor: ink.color })}
                    title={ink.name}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      stampOptions.inkColor === ink.color
                        ? 'ring-2 ring-blue-500 bg-slate-50 border-blue-400'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: ink.color }} />
                    <span className="hidden sm:inline">{ink.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Champs de texte */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Nom de l'entreprise (en-tête)</label>
                <input
                  type="text"
                  value={stampOptions.companyName}
                  onChange={(e) => setStampOptions({ ...stampOptions, companyName: e.target.value })}
                  className="w-full px-3 py-1.5 border rounded-lg font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Mention centrale principale</label>
                <input
                  type="text"
                  value={stampOptions.centerMention}
                  onChange={(e) => setStampOptions({ ...stampOptions, centerMention: e.target.value })}
                  className="w-full px-3 py-1.5 border rounded-lg font-bold text-blue-900"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Texte inférieur / Sous-titre</label>
                <input
                  type="text"
                  value={stampOptions.subtitle}
                  onChange={(e) => setStampOptions({ ...stampOptions, subtitle: e.target.value })}
                  className="w-full px-3 py-1.5 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Dateur apposé</label>
                <input
                  type="text"
                  value={stampOptions.dateText || ''}
                  onChange={(e) => setStampOptions({ ...stampOptions, dateText: e.target.value })}
                  className="w-full px-3 py-1.5 border rounded-lg font-mono"
                />
              </div>
            </div>

            {/* Options visuelles additionnelles */}
            <div className="flex flex-wrap items-center gap-4 pt-1">
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 font-medium">
                <input
                  type="checkbox"
                  checked={stampOptions.weatheredEffect}
                  onChange={(e) => setStampOptions({ ...stampOptions, weatheredEffect: e.target.checked })}
                  className="rounded text-blue-600"
                />
                <span>Effet d'encre tamponnée (grain réaliste)</span>
              </label>

              <div className="flex items-center gap-2">
                <span className="text-slate-600">Inclinaison :</span>
                <input
                  type="range"
                  min="-15"
                  max="15"
                  value={stampOptions.rotation || 0}
                  onChange={(e) => setStampOptions({ ...stampOptions, rotation: Number(e.target.value) })}
                  className="w-24 accent-[#0B2545]"
                />
                <span className="font-mono text-slate-700">{stampOptions.rotation || 0}°</span>
              </div>
            </div>
          </div>

          {/* Colonne Droite : Prévisualisation en direct */}
          <div className="md:col-span-5 flex flex-col items-center justify-between p-5 bg-slate-100 rounded-2xl border border-slate-200">
            <span className="text-xs font-bold text-slate-600 mb-2">Aperçu en direct (PNG transparent) :</span>

            {/* Zone de preview avec damier transparent */}
            <div
              className="w-full flex-1 min-h-[220px] flex items-center justify-center p-4 rounded-xl border border-slate-300 bg-white"
              style={{
                backgroundImage:
                  'linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)',
                backgroundSize: '16px 16px',
                backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px'
              }}
            >
              {previewDataUrl ? (
                <img
                  src={previewDataUrl}
                  alt="Tampon officiel généré"
                  className="max-h-48 max-w-full object-contain filter drop-shadow-md select-none pointer-events-none"
                />
              ) : (
                <span className="text-xs text-slate-400">Génération en cours...</span>
              )}
            </div>

            {/* Boutons d'action */}
            <div className="w-full flex flex-col gap-2 mt-4">
              <button
                type="button"
                onClick={handleApply}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-all active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>Appliquer comme Cachet Officiel</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadPng}
                className="w-full py-2 px-4 rounded-xl bg-[#0B2545] hover:bg-[#134074] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-all"
              >
                <Download className="w-4 h-4 text-amber-400" />
                <span>Télécharger Tampon PNG Transparent</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
