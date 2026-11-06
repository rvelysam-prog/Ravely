import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Download,
  Copy,
  Check,
  RefreshCw,
  Plus,
  Trash2,
  Calendar,
  DollarSign,
  Globe,
  Globe2,
  FileText,
  Mail,
  Phone,
  Eye,
  X,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Dice5,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { SiteSettings } from '../../types';
import {
  JobOfferData,
  getAllAvailablePostes,
  buildDefaultJobOfferForPoste,
  downloadJobOfferPdf,
  exportJobOfferAsPlainText,
  generateRandomReference,
  formatIsoToFrenchDate,
  buildSynthesizedRemunerationText,
  publishJobOffer,
  unpublishJobOffer,
  CANADIAN_STANDARD_BENEFITS
} from '../../services/jobOfferService';
import { OFFICIAL_DEPARTMENTS } from '../../services/departmentsAndEmailService';
import { BrandLogo } from '../BrandLogo';

interface JobOfferGeneratorModalProps {
  settings: SiteSettings;
  isOpen: boolean;
  onClose?: () => void;
  initialPoste?: string;
  initialDept?: string;
  embeddedMode?: boolean;
}

export const JobOfferGeneratorModal: React.FC<JobOfferGeneratorModalProps> = ({
  settings,
  isOpen,
  onClose,
  initialPoste,
  initialDept,
  embeddedMode = false
}) => {
  const allPostes = getAllAvailablePostes();

  // State pour le département sélectionné
  const [selectedDept, setSelectedDept] = useState<string>(
    initialDept || OFFICIAL_DEPARTMENTS[0]?.name || 'DEPARTEMENT EXPLOITATION TRANSPORT'
  );

  // Postes filtrés pour ce département
  const filteredPostes = allPostes.filter((p) => p.departement === selectedDept);

  // Poste sélectionné
  const [selectedPosteTitle, setSelectedPosteTitle] = useState<string>(
    initialPoste || filteredPostes[0]?.titre || 'Conducteur Routier'
  );

  // Données de l'offre d'emploi en cours d'édition
  const [offer, setOffer] = useState<JobOfferData>(() =>
    buildDefaultJobOfferForPoste(
      initialPoste || filteredPostes[0]?.titre || 'Conducteur Routier',
      initialDept || OFFICIAL_DEPARTMENTS[0]?.name,
      settings
    )
  );

  // États UI
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [publishFeedback, setPublishFeedback] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [newMissionInput, setNewMissionInput] = useState('');
  const [activeTabConfig, setActiveTabConfig] = useState<
    'details' | 'missions' | 'salaire' | 'profil' | 'signature' | 'contact'
  >('details');
  const [previewScale] = useState<number>(0.92);

  // Mettre à jour l'offre quand l'utilisateur change de poste
  const handleSelectPoste = (posteTitle: string) => {
    setSelectedPosteTitle(posteTitle);
    const newOffer = buildDefaultJobOfferForPoste(posteTitle, selectedDept, settings);
    setOffer(newOffer);
  };

  // Mettre à jour quand on change de département
  const handleSelectDept = (deptName: string) => {
    setSelectedDept(deptName);
    const inDept = allPostes.filter((p) => p.departement === deptName);
    const firstPoste = inDept[0]?.titre || 'Conducteur Routier';
    setSelectedPosteTitle(firstPoste);
    const newOffer = buildDefaultJobOfferForPoste(firstPoste, deptName, settings);
    setOffer(newOffer);
  };

  // 1. GÉNÉRER NUMÉRO DE RÉFÉRENCE ALÉATOIRE
  const handleGenerateRandomRef = () => {
    const newRef = generateRandomReference(offer.departement);
    setOffer((prev) => ({
      ...prev,
      reference: newRef
    }));
  };

  // 2. MODIFIER LA DATE DE PUBLICATION
  const handleDateChange = (isoDateStr: string) => {
    const formattedDate = formatIsoToFrenchDate(isoDateStr);
    setOffer((prev) => ({
      ...prev,
      datePublicationIso: isoDateStr,
      datePublication: formattedDate
    }));
  };

  const handleSetTodayDate = () => {
    const todayIso = new Date().toISOString().slice(0, 10);
    handleDateChange(todayIso);
  };

  // 3. PUBLIER VERS "NOS OFFRES"
  const handlePublishToggle = async () => {
    try {
      setIsPublishing(true);
      if (offer.estPublie) {
        await unpublishJobOffer(offer.id);
        setOffer((prev) => ({ ...prev, estPublie: false }));
        setPublishFeedback('Offre retirée de la page "Nos Offres"');
      } else {
        const saved = await publishJobOffer(offer);
        setOffer(saved);
        setPublishFeedback('Offre publiée avec succès sur "Nos Offres" !');
      }
      setTimeout(() => setPublishFeedback(null), 3500);
    } catch (err) {
      console.error('Erreur publication:', err);
    } finally {
      setIsPublishing(false);
    }
  };

  // 4. RECALCULER RÉMUNÉRATION CANADIENNE
  const handleRecalculateSalaryText = () => {
    const text = buildSynthesizedRemunerationText(
      offer.salaireMin,
      offer.salaireMax,
      offer.typeRemuneration,
      offer.regimeHeuresSup
    );
    setOffer((prev) => ({ ...prev, remuneration: text }));
  };

  // Réinitialiser avec les valeurs par défaut
  const handleResetToStandard = () => {
    const defaultData = buildDefaultJobOfferForPoste(selectedPosteTitle, selectedDept, settings);
    setOffer(defaultData);
  };

  // Téléchargement du PDF
  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      await downloadJobOfferPdf(offer, settings.logo_url);
    } catch (err) {
      console.error('Erreur lors du téléchargement du PDF:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Copie du texte de l'offre
  const handleCopyText = async () => {
    const text = exportJobOfferAsPlainText(offer);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 3000);
    } catch {
      // Fallback
    }
  };

  // Gestion des missions
  const handleAddMission = () => {
    if (!newMissionInput.trim()) return;
    setOffer((prev) => ({
      ...prev,
      missionsDetaillees: [...prev.missionsDetaillees, newMissionInput.trim()]
    }));
    setNewMissionInput('');
  };

  const handleRemoveMission = (index: number) => {
    setOffer((prev) => ({
      ...prev,
      missionsDetaillees: prev.missionsDetaillees.filter((_, i) => i !== index)
    }));
  };

  const handleUpdateMission = (index: number, val: string) => {
    setOffer((prev) => {
      const updated = [...prev.missionsDetaillees];
      updated[index] = val;
      return { ...prev, missionsDetaillees: updated };
    });
  };

  // Gestion des qualités humaines
  const handleUpdateQualite = (index: number, val: string) => {
    setOffer((prev) => {
      const updated = [...prev.qualitesHumaines];
      updated[index] = val;
      return { ...prev, qualitesHumaines: updated };
    });
  };

  if (!isOpen && !embeddedMode) return null;

  const content = (
    <div className={`flex flex-col h-full bg-slate-50 text-slate-900 ${embeddedMode ? 'rounded-2xl border border-slate-200 overflow-hidden shadow-sm' : ''}`}>
      {/* Barre d'En-tête */}
      <div className="bg-[#0B2545] text-white px-5 sm:px-7 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-amber-400/20 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shrink-0">
            <Briefcase className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold bg-amber-400/10 px-2 py-0.5 rounded">
                Générateur d’Offres d’Emploi
              </span>
              <span className="text-[11px] text-slate-300">
                · Normes de Colombie-Britannique (Canada)
              </span>
              {offer.estPublie ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Publié sur &quot;Nos Offres&quot;
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                  Brouillon non publié
                </span>
              )}
            </div>
            <h2 className="font-bold text-lg sm:text-xl text-white tracking-tight">
              Création &amp; Publication d’Offres Officielles (Fiches A4 Signées)
            </h2>
          </div>
        </div>

        {/* Boutons d'action principaux */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* BOUTON PUBLIER VERS LA PAGE PUBLIQUE "NOS OFFRES" */}
          <button
            type="button"
            onClick={handlePublishToggle}
            disabled={isPublishing}
            className={`min-h-[40px] px-3.5 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer border shadow-xs ${
              offer.estPublie
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500'
                : 'bg-blue-600 hover:bg-blue-500 text-white border-blue-400'
            }`}
            title="Publier cette offre sur la page publique 'Nos Offres' du site"
          >
            <Globe className="w-4 h-4" />
            <span>
              {isPublishing
                ? 'Synchronisation...'
                : offer.estPublie
                ? 'En Ligne (Modifier / Dépublier)'
                : '🌐 Publier sur "Nos Offres"'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleCopyText}
            className="min-h-[40px] px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer border border-white/10"
            title="Copier le texte prêt à l'emploi pour Indeed / LinkedIn / Email"
          >
            {copiedNotification ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300 font-bold">Copié !</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-300" />
                <span>Copier Texte</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleResetToStandard}
            className="min-h-[40px] px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer border border-white/10"
            title="Rétablir les textes et missions standards du poste"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Rétablir Standard</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="min-h-[40px] px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs sm:text-sm transition-all flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
            title="Générer et télécharger le PDF vectoriel A4 ultra-fidèle signé et cacheté"
          >
            <Download className="w-4 h-4 text-slate-950" />
            <span>{isGeneratingPdf ? 'Génération PDF...' : 'Télécharger PDF Signé & Cacheté'}</span>
          </button>

          {!embeddedMode && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Fermer la fenêtre"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Notification Toast de Publication */}
      {publishFeedback && (
        <div className="bg-emerald-600 text-white text-xs px-6 py-2.5 flex items-center justify-between font-medium shadow-md">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
            <span>{publishFeedback}</span>
          </div>
          <span className="text-[10px] text-emerald-200 underline cursor-pointer" onClick={() => setPublishFeedback(null)}>
            Fermer
          </span>
        </div>
      )}

      {/* Barre de sélection du département et du poste */}
      <div className="bg-white border-b border-slate-200 px-5 sm:px-7 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Sélecteur de Département */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 whitespace-nowrap">
              Département :
            </span>
            <select
              value={selectedDept}
              onChange={(e) => handleSelectDept(e.target.value)}
              className="py-1.5 px-3 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:border-[#0B2545] focus:outline-none"
            >
              {OFFICIAL_DEPARTMENTS.map((d) => (
                <option key={d.code} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sélecteur de Poste */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 whitespace-nowrap">
              Poste à pourvoir :
            </span>
            <select
              value={selectedPosteTitle}
              onChange={(e) => handleSelectPoste(e.target.value)}
              className="py-1.5 px-3 rounded-xl border border-slate-300 text-xs font-semibold text-[#0B2545] bg-blue-50/50 focus:bg-white focus:border-[#0B2545] focus:outline-none max-w-[280px] sm:max-w-[340px] truncate"
            >
              {filteredPostes.map((p, idx) => (
                <option key={idx} value={p.titre}>
                  {p.titre}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Badges statut & Réf */}
        <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
          <span className="bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 font-bold">
            Réf : {offer.reference}
          </span>
          <span className="text-slate-400">
            Publiée le {offer.datePublication}
          </span>
        </div>
      </div>

      {/* Contenu Split-Screen : Éditeur à gauche / Prévisualisation A4 fidèle à droite */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* COLONNE GAUCHE (5 cols) : FORMULAIRE D'ÉDITION ÉTENDU */}
        <div className="lg:col-span-5 border-r border-slate-200 bg-white flex flex-col h-full overflow-hidden">
          {/* Onglets de configuration */}
          <div className="flex items-center border-b border-slate-200 bg-slate-100/70 px-4 pt-2 gap-1 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTabConfig('details')}
              className={`px-3 py-2 text-xs font-bold rounded-t-lg transition-colors whitespace-nowrap ${
                activeTabConfig === 'details'
                  ? 'bg-white text-[#0B2545] border-t-2 border-[#0B2545] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              1. En-tête &amp; Date
            </button>
            <button
              type="button"
              onClick={() => setActiveTabConfig('missions')}
              className={`px-3 py-2 text-xs font-bold rounded-t-lg transition-colors whitespace-nowrap ${
                activeTabConfig === 'missions'
                  ? 'bg-white text-[#0B2545] border-t-2 border-[#0B2545] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              2. Missions ({offer.missionsDetaillees.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTabConfig('salaire')}
              className={`px-3 py-2 text-xs font-bold rounded-t-lg transition-colors whitespace-nowrap ${
                activeTabConfig === 'salaire'
                  ? 'bg-white text-[#0B2545] border-t-2 border-[#0B2545] shadow-xs text-amber-700'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              3. Salaire &amp; Canada ($ CAD)
            </button>
            <button
              type="button"
              onClick={() => setActiveTabConfig('profil')}
              className={`px-3 py-2 text-xs font-bold rounded-t-lg transition-colors whitespace-nowrap ${
                activeTabConfig === 'profil'
                  ? 'bg-white text-[#0B2545] border-t-2 border-[#0B2545] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              4. Profil &amp; Critères
            </button>
            <button
              type="button"
              onClick={() => setActiveTabConfig('signature')}
              className={`px-3 py-2 text-xs font-bold rounded-t-lg transition-colors whitespace-nowrap ${
                activeTabConfig === 'signature'
                  ? 'bg-white text-[#0B2545] border-t-2 border-[#0B2545] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              5. Cachet &amp; Signature
            </button>
            <button
              type="button"
              onClick={() => setActiveTabConfig('contact')}
              className={`px-3 py-2 text-xs font-bold rounded-t-lg transition-colors whitespace-nowrap ${
                activeTabConfig === 'contact'
                  ? 'bg-white text-[#0B2545] border-t-2 border-[#0B2545] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              6. Coordonnées
            </button>
          </div>

          {/* Formulaire scrollable */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
            {/* ONGLET 1 : DÉTAILS, DATE DE PUBLICATION ET RÉFÉRENCE ALÉATOIRE */}
            {activeTabConfig === 'details' && (
              <div className="space-y-4">
                {/* 1. DATE DE PUBLICATION AVEC DATE PICKER */}
                <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-[#0B2545] flex items-center gap-1.5 text-xs">
                      <Calendar className="w-4 h-4 text-[#0066B3]" />
                      <span>Date de publication officielle</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleSetTodayDate}
                      className="text-[11px] font-bold text-[#0066B3] hover:underline"
                    >
                      Aujourd&apos;hui
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-500 block mb-0.5">Sélecteur de calendrier :</span>
                      <input
                        type="date"
                        value={offer.datePublicationIso || ''}
                        onChange={(e) => handleDateChange(e.target.value)}
                        className="w-full min-h-[36px] px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-medium focus:border-[#0B2545] focus:outline-none bg-white"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block mb-0.5">Libellé affiché sur le document :</span>
                      <input
                        type="text"
                        value={offer.datePublication}
                        onChange={(e) => setOffer({ ...offer, datePublication: e.target.value })}
                        placeholder="ex: 06 novembre 2026"
                        className="w-full min-h-[36px] px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-medium focus:border-[#0B2545] focus:outline-none bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. NUMÉRO DE RÉFÉRENCE AVEC GÉNÉRATEUR ALÉATOIRE */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-700 text-xs">
                      Numéro de référence de l&apos;offre
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateRandomRef}
                      className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[11px] flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                      title="Générer un numéro de référence aléatoire réaliste pour cette offre"
                    >
                      <Dice5 className="w-3.5 h-3.5" />
                      <span>Réf. aléatoire</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={offer.reference}
                      onChange={(e) => setOffer({ ...offer, reference: e.target.value })}
                      className="flex-1 min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-300 font-mono text-xs font-bold text-slate-800 focus:border-[#0B2545] focus:outline-none bg-white"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    Génère automatiquement des formats canadiens et internationaux normalisés.
                  </span>
                </div>

                {/* Titre du poste & Format (H/F) */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Intitulé du poste (avec mention H/F)
                  </label>
                  <input
                    type="text"
                    value={offer.titrePoste}
                    onChange={(e) => setOffer({ ...offer, titrePoste: e.target.value })}
                    className="w-full min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-[#1D4F88] focus:border-[#0B2545] focus:outline-none"
                  />
                </div>

                {/* Rattachement hiérarchique */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Rattachement hiérarchique
                  </label>
                  <input
                    type="text"
                    value={offer.rattachementHierarchique}
                    onChange={(e) => setOffer({ ...offer, rattachementHierarchique: e.target.value })}
                    placeholder="ex: au responsable d'exploitation"
                    className="w-full min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-300 text-xs focus:border-[#0B2545] focus:outline-none"
                  />
                </div>

                {/* Nombre de postes à pourvoir */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Nombre de postes ouverts
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={offer.nombrePostesDisponibles || 1}
                      onChange={(e) => setOffer({ ...offer, nombrePostesDisponibles: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                      className="w-full min-h-[36px] px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:border-[#0B2545] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Type de contrat
                    </label>
                    <input
                      type="text"
                      value={offer.typeContrat}
                      onChange={(e) => setOffer({ ...offer, typeContrat: e.target.value })}
                      className="w-full min-h-[36px] px-3 py-1.5 rounded-xl border border-slate-300 text-xs focus:border-[#0B2545] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Présentation de la société */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Présentation de la société
                  </label>
                  <textarea
                    rows={4}
                    value={offer.presentationSociete}
                    onChange={(e) => setOffer({ ...offer, presentationSociete: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs leading-relaxed focus:border-[#0B2545] focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* ONGLET 2 : MISSIONS DÉTAILLÉES */}
            {activeTabConfig === 'missions' && (
              <div className="space-y-3.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Mission principale (phrase de synthèse)
                  </label>
                  <textarea
                    rows={2}
                    value={offer.missionPrincipale}
                    onChange={(e) => setOffer({ ...offer, missionPrincipale: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:border-[#0B2545] focus:outline-none"
                  />
                </div>

                {/* Formulaire d'ajout rapide */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newMissionInput}
                    onChange={(e) => setNewMissionInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddMission();
                      }
                    }}
                    placeholder="Ajouter une mission ou consigne..."
                    className="flex-1 min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-300 text-xs focus:border-[#0B2545] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddMission}
                    className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-[#0B2545] hover:bg-[#134074] text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ajouter</span>
                  </button>
                </div>

                {/* Liste des missions éditables */}
                <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                  {offer.missionsDetaillees.map((mission, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2 group hover:border-slate-300"
                    >
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-[#0066B3] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <textarea
                        rows={2}
                        value={mission}
                        onChange={(e) => handleUpdateMission(idx, e.target.value)}
                        className="flex-1 px-2 py-1 bg-white rounded-lg border border-slate-200 text-xs leading-relaxed focus:border-[#0B2545] focus:outline-none resize-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveMission(idx)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Supprimer cette mission"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ONGLET 3 : SALAIRE & NORMES DU TRAVAIL CANADIENNES */}
            {activeTabConfig === 'salaire' && (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-[11px] text-amber-900 leading-relaxed">
                    <strong>Normes de Colombie-Britannique (ESA) &amp; Code du travail canadien :</strong><br />
                    Loi sur la transparence salariale en vigueur. Les offres doivent expliciter le taux horaire ou la fourchette salariale ainsi que le régime d&apos;heures supplémentaires.
                  </div>
                </div>

                {/* Fourchette de rémunération */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Type de rémunération
                    </label>
                    <select
                      value={offer.typeRemuneration}
                      onChange={(e) => setOffer({ ...offer, typeRemuneration: e.target.value as 'horaire' | 'annuel' | 'mensuel' })}
                      className="w-full min-h-[38px] px-3 rounded-xl border border-slate-300 text-xs font-semibold focus:border-[#0B2545] focus:outline-none"
                    >
                      <option value="horaire">Taux horaire ($ CAD / h)</option>
                      <option value="annuel">Salaire annuel ($ CAD / an)</option>
                      <option value="mensuel">Salaire mensuel ($ CAD / mois)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Montant minimum ($ CAD)
                    </label>
                    <input
                      type="number"
                      step={offer.typeRemuneration === 'horaire' ? '0.25' : '1000'}
                      value={offer.salaireMin}
                      onChange={(e) => setOffer({ ...offer, salaireMin: parseFloat(e.target.value) || 0 })}
                      className="w-full min-h-[38px] px-3 rounded-xl border border-slate-300 text-xs font-mono font-bold text-[#0B2545] focus:border-[#0B2545] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Montant maximum ($ CAD)
                    </label>
                    <input
                      type="number"
                      step={offer.typeRemuneration === 'horaire' ? '0.25' : '1000'}
                      value={offer.salaireMax}
                      onChange={(e) => setOffer({ ...offer, salaireMax: parseFloat(e.target.value) || 0 })}
                      className="w-full min-h-[38px] px-3 rounded-xl border border-slate-300 text-xs font-mono font-bold text-[#0B2545] focus:border-[#0B2545] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Périodicité et Heures */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Périodicité de paie
                    </label>
                    <input
                      type="text"
                      value={offer.periodicitePaie}
                      onChange={(e) => setOffer({ ...offer, periodicitePaie: e.target.value })}
                      placeholder="Bi-hebdomadaire (toutes les deux semaines)"
                      className="w-full min-h-[38px] px-3 rounded-xl border border-slate-300 text-xs focus:border-[#0B2545] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Durée du travail
                    </label>
                    <input
                      type="text"
                      value={offer.heuresHebdo}
                      onChange={(e) => setOffer({ ...offer, heuresHebdo: e.target.value })}
                      placeholder="40 heures / semaine (Temps plein)"
                      className="w-full min-h-[38px] px-3 rounded-xl border border-slate-300 text-xs focus:border-[#0B2545] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Heures supplémentaires */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Réglementation des heures supplémentaires (Colombie-Britannique)
                  </label>
                  <input
                    type="text"
                    value={offer.regimeHeuresSup}
                    onChange={(e) => setOffer({ ...offer, regimeHeuresSup: e.target.value })}
                    className="w-full min-h-[38px] px-3 rounded-xl border border-slate-300 text-xs focus:border-[#0B2545] focus:outline-none"
                  />
                </div>

                {/* Avantages sociaux canadiens */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="font-bold text-slate-700">
                      Avantages sociaux inclus (Normes Canada)
                    </label>
                    <span className="text-[10px] text-slate-500">
                      {(offer.avantagesSociaux || []).length} avantages actifs
                    </span>
                  </div>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto p-2 rounded-xl bg-slate-50 border border-slate-200">
                    {(offer.avantagesSociaux || CANADIAN_STANDARD_BENEFITS).map((av, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-[11px] text-slate-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="flex-1">{av}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Texte de synthèse éditable */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">
                      Texte complet de rémunération affiché sur le document PDF
                    </label>
                    <button
                      type="button"
                      onClick={handleRecalculateSalaryText}
                      className="text-[10px] font-bold text-[#0066B3] hover:underline"
                    >
                      ↻ Recalculer le texte
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    value={offer.remuneration}
                    onChange={(e) => setOffer({ ...offer, remuneration: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs leading-relaxed font-medium text-slate-800 focus:border-[#0B2545] focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* ONGLET 4 : PROFIL & SAVOIR-ÊTRE */}
            {activeTabConfig === 'profil' && (
              <div className="space-y-3.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Prérequis techniques &amp; qualifications (Permis, diplôme, expérience)
                  </label>
                  <textarea
                    rows={4}
                    value={offer.profilRequis}
                    onChange={(e) => setOffer({ ...offer, profilRequis: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs leading-relaxed focus:border-[#0B2545] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">
                    Qualités requises &amp; Savoir-être (Lignes conformes au modèle)
                  </label>
                  <div className="space-y-2">
                    {offer.qualitesHumaines.map((q, idx) => (
                      <input
                        key={idx}
                        type="text"
                        value={q}
                        onChange={(e) => handleUpdateQualite(idx, e.target.value)}
                        className="w-full min-h-[36px] px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:border-[#0B2545] focus:outline-none"
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Expérience requise
                  </label>
                  <input
                    type="text"
                    value={offer.experienceRequise}
                    onChange={(e) => setOffer({ ...offer, experienceRequise: e.target.value })}
                    className="w-full min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold focus:border-[#0B2545] focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* ONGLET 5 : CACHET ET SIGNATURE TYPE DU SITE */}
            {activeTabConfig === 'signature' && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="font-bold text-slate-800 text-xs flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Certification &amp; Authentification Officielle</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Le document généré intègre la signature manuscrite officielle et le cachet de la Direction des Ressources Humaines d&apos;Atlantic Transport Ltd.
                  </p>

                  <div className="space-y-2.5 pt-1">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={offer.afficherCachet}
                        onChange={(e) => setOffer({ ...offer, afficherCachet: e.target.checked })}
                        className="w-4 h-4 rounded text-[#0B2545] focus:ring-[#0B2545]"
                      />
                      <span className="text-xs font-semibold text-slate-800">
                        Afficher le cachet officiel &quot;Atlantic Transport Ltd.&quot;
                      </span>
                    </label>

                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={offer.afficherSignature}
                        onChange={(e) => setOffer({ ...offer, afficherSignature: e.target.checked })}
                        className="w-4 h-4 rounded text-[#0B2545] focus:ring-[#0B2545]"
                      />
                      <span className="text-xs font-semibold text-slate-800">
                        Afficher la signature officielle de la Direction RH
                      </span>
                    </label>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200 flex items-center justify-around">
                  <div className="text-center">
                    <div className="text-[10px] text-slate-400 font-mono mb-1">Aperçu Cachet :</div>
                    <img
                      src="/cachet.png"
                      alt="Cachet Atlantic Transport"
                      className="w-16 h-16 object-contain mx-auto"
                    />
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] text-slate-400 font-mono mb-1">Aperçu Signature :</div>
                    <img
                      src="/signature.png"
                      alt="Signature Direction RH"
                      className="w-24 h-12 object-contain mx-auto"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ONGLET 6 : CONTACT */}
            {activeTabConfig === 'contact' && (
              <div className="space-y-3.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Email de réception des candidatures
                  </label>
                  <input
                    type="email"
                    value={offer.contactEmail}
                    onChange={(e) => setOffer({ ...offer, contactEmail: e.target.value })}
                    className="w-full min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-[#0066B3] focus:border-[#0B2545] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Téléphone RH
                  </label>
                  <input
                    type="tel"
                    value={offer.contactTelephone}
                    onChange={(e) => setOffer({ ...offer, contactTelephone: e.target.value })}
                    className="w-full min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-mono font-bold focus:border-[#0B2545] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Adresse du siège
                  </label>
                  <input
                    type="text"
                    value={offer.contactAdresse}
                    onChange={(e) => setOffer({ ...offer, contactAdresse: e.target.value })}
                    className="w-full min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-300 text-xs focus:border-[#0B2545] focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* COLONNE DROITE (7 cols) : APERÇU LIVE A4 FIDÈLE AU MODÈLE */}
        <div className="lg:col-span-7 bg-slate-200/80 p-4 sm:p-6 overflow-y-auto flex flex-col items-center">
          <div className="w-full max-w-[650px] mb-3 flex items-center justify-between text-xs text-slate-600 px-2">
            <span className="font-bold flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-[#0066B3]" />
              <span>Aperçu Vectoriel A4 Conforme au Modèle Officiel</span>
            </span>
            <div className="flex items-center gap-2">
              {offer.estPublie ? (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Publié sur &quot;Nos Offres&quot;
                </span>
              ) : (
                <span className="text-[10px] text-slate-500">Brouillon</span>
              )}
              <span className="text-[10px] font-mono text-slate-500">Format 210 × 297 mm</span>
            </div>
          </div>

          {/* DOCUMENT FEUILLE BLANCHE A4 */}
          <div
            className="w-full max-w-[650px] bg-white rounded-sm shadow-xl p-8 sm:p-10 border border-slate-300 text-slate-900 transition-transform origin-top"
            style={{
              minHeight: '842px',
              fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}
          >
            {/* Haut de page : Logo officiel à gauche / Date & Réf à droite */}
            <div className="flex items-start justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <BrandLogo
                  customLogoUrl={settings.logo_url}
                  companyName={offer.companyName}
                  size="header"
                />
                <div>
                  <span className="font-bold text-base text-[#0B2545] tracking-tight block">
                    {offer.companyName}
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase block">
                    TRANSPORT &amp; LOGISTIQUE INTERNATIONALE
                  </span>
                </div>
              </div>

              <div className="text-right text-[10px] text-slate-500 font-mono">
                <div className="font-bold text-slate-700">Réf : {offer.reference}</div>
                <div>Date : {offer.datePublication}</div>
              </div>
            </div>

            {/* Titre Principal : OFFRE D’EMPLOI en Cyan/Bleu Roi centré */}
            <div className="text-center my-4">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0066B3] tracking-tight">
                OFFRE D’EMPLOI
              </h1>
            </div>

            {/* Titre du poste : Conducteur Routier International (H/F) en bleu acier */}
            <div className="mt-5 mb-2">
              <h2 className="text-lg sm:text-xl font-bold text-[#1D4F88]">
                {offer.titrePoste}
              </h2>
            </div>

            {/* Ligne fine de séparation horizontale grise */}
            <div className="w-full h-[1px] bg-slate-300 mb-5" />

            {/* SECTION 1 : Présentation de la société */}
            <div className="mb-5 space-y-1.5">
              <h3 className="text-xs sm:text-[13px] font-bold text-[#0066B3] underline underline-offset-4 decoration-[#0066B3]">
                Présentation de la société
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-700 leading-relaxed text-justify">
                {offer.presentationSociete}
              </p>
            </div>

            {/* SECTION 2 : Description du poste */}
            <div className="mb-5 space-y-2">
              <h3 className="text-xs sm:text-[13px] font-bold text-[#0066B3] underline underline-offset-4 decoration-[#0066B3]">
                Description du poste
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-700 leading-relaxed">
                Vous êtes directement rattaché(e) {offer.rattachementHierarchique}. Votre mission principale consiste à {offer.missionPrincipale}
              </p>

              {/* Puces détaillées */}
              <ul className="space-y-1.5 pt-1 pl-2">
                {offer.missionsDetaillees.map((mission, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-[11px] sm:text-xs text-slate-700 leading-snug">
                    <span className="text-[#0066B3] font-bold text-sm leading-none shrink-0 mt-0.5">•</span>
                    <span>{mission}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* SECTION 3 : Profil recherché */}
            <div className="mb-5 space-y-2">
              <h3 className="text-xs sm:text-[13px] font-bold text-[#0066B3] underline underline-offset-4 decoration-[#0066B3]">
                Profil recherché
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-700 leading-relaxed">
                {offer.profilRequis}
              </p>

              <div className="space-y-1 pt-1 text-[11px] sm:text-xs text-slate-700 leading-snug">
                {offer.qualitesHumaines.map((q, idx) => (
                  <p key={idx}>{q}</p>
                ))}
              </div>

              {/* Rémunération Canada */}
              <div className="pt-2 text-[11px] sm:text-xs text-slate-800 leading-relaxed">
                <span className="font-bold text-[#0B2545]">Rémunération &amp; Avantages : </span>
                <span>{offer.remuneration}</span>
              </div>
            </div>

            {/* SECTION 4 : Envoi candidature / Bas de page */}
            <div className="pt-4 border-t border-slate-200 text-[11px] sm:text-xs text-slate-700 space-y-2">
              <p className="leading-snug">
                Veuillez envoyer votre Curriculum Vitae et votre lettre de motivation à l’adresse suivante :
              </p>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 font-semibold">
                <a
                  href={`mailto:${offer.contactEmail}`}
                  className="text-[#0066B3] hover:underline font-bold"
                >
                  {offer.contactEmail}
                </a>
                <a
                  href={`tel:${offer.contactTelephone}`}
                  className="text-slate-900 font-mono hover:text-[#0066B3]"
                >
                  {offer.contactTelephone}
                </a>
              </div>
            </div>

            {/* SECTION 5 : SIGNATURE ET CACHET OFFICIEL */}
            {(offer.afficherCachet || offer.afficherSignature) && (
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="text-[10px] text-slate-500 space-y-0.5">
                  <div className="font-bold text-slate-700">Atlantic Transport Ltd.</div>
                  <div>Surrey, Colombie-Britannique (Canada)</div>
                  <div className="text-emerald-700 font-bold text-[9px] flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Document certifié conforme ESA / BC</span>
                  </div>
                </div>

                <div className="relative flex items-center gap-3">
                  <div className="text-right text-[10px] text-slate-600 font-semibold mr-1">
                    Pour la Direction des Ressources Humaines :
                  </div>

                  {offer.afficherCachet && (
                    <img
                      src="/cachet.png"
                      alt="Cachet de l'entreprise"
                      className="w-16 h-16 object-contain pointer-events-none select-none drop-shadow-2xs"
                    />
                  )}

                  {offer.afficherSignature && (
                    <img
                      src="/signature.png"
                      alt="Signature officielle"
                      className="w-20 h-10 object-contain -ml-6 pointer-events-none select-none"
                    />
                  )}
                </div>
              </div>
            )}

            {/* Pied de page discret */}
            <div className="mt-6 pt-2 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-400">
              <span>{offer.companyName} · Surrey, Colombie-Britannique, Canada</span>
              <span>Réf : {offer.reference} · Publiée le {offer.datePublication}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (embeddedMode) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
      <div className="w-full max-w-7xl h-[92vh] rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col my-auto border border-slate-200">
        {content}
      </div>
    </div>
  );
};
