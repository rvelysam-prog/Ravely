import React, { useState } from 'react';
import {
  Phone,
  Mail,
  Building2,
  Check,
  Save,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  FileText
} from 'lucide-react';
import {
  CompanyContactConfig,
  DEFAULT_COMPANY_CONTACT_CONFIG,
  EMAIL_PRESETS,
  PHONE_PRESETS,
  getCompanyContactConfig,
  saveCompanyContactConfig
} from '../../services/companyConfigService';

interface CompanyContactSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (cfg: CompanyContactConfig) => void;
}

export const CompanyContactSettingsModal: React.FC<CompanyContactSettingsModalProps> = ({
  isOpen,
  onClose,
  onSaved
}) => {
  const [config, setConfig] = useState<CompanyContactConfig>(() => getCompanyContactConfig());
  const [phonePreset, setPhonePreset] = useState<string>(() => {
    const existing = PHONE_PRESETS.find((p) => p.value === getCompanyContactConfig().primaryPhone);
    return existing ? existing.value : 'custom';
  });
  const [emailPreset, setEmailPreset] = useState<string>(() => {
    const existing = EMAIL_PRESETS.find((p) => p.value === getCompanyContactConfig().primaryEmail);
    return existing ? existing.value : 'custom';
  });
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePhonePresetChange = (val: string) => {
    setPhonePreset(val);
    if (val !== 'custom') {
      setConfig((prev) => ({ ...prev, primaryPhone: val }));
    }
  };

  const handleEmailPresetChange = (val: string) => {
    setEmailPreset(val);
    if (val !== 'custom') {
      setConfig((prev) => ({ ...prev, primaryEmail: val }));
    }
  };

  const handleResetDefaults = () => {
    setConfig(DEFAULT_COMPANY_CONTACT_CONFIG);
    setPhonePreset(DEFAULT_COMPANY_CONTACT_CONFIG.primaryPhone);
    setEmailPreset(DEFAULT_COMPANY_CONTACT_CONFIG.primaryEmail);
    setFeedback('Valeurs par défaut restaurées.');
    setTimeout(() => setFeedback(null), 2500);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const saved = saveCompanyContactConfig(config);
    if (onSaved) onSaved(saved);
    setFeedback('Coordonnées enregistrées et propagées sur les contrats & promesses !');
    setTimeout(() => {
      setFeedback(null);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="bg-[#0B2545] text-white p-5 sm:p-6 flex items-center justify-between gap-4 border-b border-amber-400/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-mono uppercase text-amber-400 font-bold">
                Paramètres Système
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-white">
                Coordonnées de l'Entreprise (Téléphone &amp; Email)
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-300 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 sm:p-6 space-y-6">
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs sm:text-sm text-amber-950 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Les coordonnées sélectionnées ci-dessous s’injectent <strong>automatiquement</strong> sur
              tous les contrats de travail (CDI/CDD), les promesses d'embauche PDF, les mails générés et les cartes professionnelles.
            </span>
          </div>

          {feedback && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{feedback}</span>
            </div>
          )}

          {/* Section Téléphone de Contact */}
          <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <Phone className="w-4 h-4 text-emerald-600" />
              <span>Numéro de Téléphone Officiel de Contact</span>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-600">
                Sélectionner un numéro prédéfini :
              </label>
              <select
                value={phonePreset}
                onChange={(e) => handlePhonePresetChange(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs sm:text-sm bg-white font-medium focus:border-[#0B2545] focus:outline-none"
              >
                {PHONE_PRESETS.map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label} — {preset.value}
                  </option>
                ))}
                <option value="custom">-- Numéro personnalisé --</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Valeur exacte injectée (Format international ou local) :
              </label>
              <input
                type="text"
                required
                value={config.primaryPhone}
                onChange={(e) => {
                  setConfig({ ...config, primaryPhone: e.target.value });
                  setPhonePreset('custom');
                }}
                placeholder="+15068022206"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs sm:text-sm bg-white font-mono text-slate-900 focus:border-[#0B2545] focus:outline-none font-bold"
              />
            </div>
          </div>

          {/* Section Email de Contact */}
          <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <Mail className="w-4 h-4 text-amber-600" />
              <span>Adresse Email de Contact &amp; Expédition</span>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-600">
                Sélectionner une adresse prédéfinie :
              </label>
              <select
                value={emailPreset}
                onChange={(e) => handleEmailPresetChange(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs sm:text-sm bg-white font-medium focus:border-[#0B2545] focus:outline-none"
              >
                {EMAIL_PRESETS.map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label} — {preset.value}
                  </option>
                ))}
                <option value="custom">-- Email personnalisé --</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Valeur exacte injectée (Expéditeur &amp; En-tête) :
              </label>
              <input
                type="email"
                required
                value={config.primaryEmail}
                onChange={(e) => {
                  setConfig({ ...config, primaryEmail: e.target.value });
                  setEmailPreset('custom');
                }}
                placeholder="atlantictransport.int.contact@ik.me"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs sm:text-sm bg-white font-mono text-slate-900 focus:border-[#0B2545] focus:outline-none font-bold"
              />
            </div>
          </div>

          {/* Preview summary */}
          <div className="bg-slate-900 text-slate-200 p-4 rounded-xl text-xs space-y-1.5 font-mono">
            <div className="text-amber-400 font-bold mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              <span>Injection active sur les documents :</span>
            </div>
            <div>Téléphone : <span className="text-white font-bold">{config.primaryPhone}</span></div>
            <div>Email officiel : <span className="text-white font-bold">{config.primaryEmail}</span></div>
            <div>Siège : <span className="text-white">{config.companyAddress}</span></div>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Rétablir par défaut</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-[#0B2545] hover:bg-[#143763] text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <Save className="w-4 h-4 text-amber-400" />
                <span>Enregistrer &amp; Appliquer</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
