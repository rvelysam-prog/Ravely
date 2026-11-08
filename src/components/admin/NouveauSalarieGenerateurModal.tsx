import React, { useState, useEffect } from 'react';
import {
  FileText,
  Briefcase,
  Ticket,
  Layers,
  Download,
  Copy,
  Check,
  Globe,
  Building2,
  Calendar,
  DollarSign,
  User,
  ShieldCheck,
  Send,
  Printer,
  Sparkles,
  RefreshCw,
  QrCode,
  FileCheck2,
  Upload,
  UserCheck,
  UserX,
  ExternalLink,
  ChevronRight,
  Eye,
  X,
  Clock,
  ArrowRight
} from 'lucide-react';
import { SiteSettings, Employee } from '../../types';
import { CONTRACT_STATIC_ASSETS } from '../../services/contractPdfGenerator';
import {
  CricContractVariables,
  PRESTATAIRES_PRESETS,
  buildDefaultCricContractVariables,
  applyPrestatairePreset,
  generateModel1PlainText,
  generateModel2PlainText,
  generateModel1AttestationPdf,
  generateModel2ContratPdf,
  downloadWordDocument
} from '../../services/cricContractService';
import {
  TicketEntretienData,
  buildDefaultTicketEntretien,
  generateTicketEntretienPdf,
  generateCodeIdCandidature,
  saveInterviewSession
} from '../../services/contractGenerationService';
import {
  JobOfferData,
  buildDefaultJobOfferForPoste,
  generateJobOfferPdf,
  downloadJobOfferPdf,
  publishJobOffer
} from '../../services/jobOfferService';
import {
  generateAssembledBookBundlePdf,
  BundleAssemblyData
} from '../../services/bundleAssemblyService';
import { saveDraftToStorage, DraftItem } from '../../services/draftsService';
import { PosteInputWithAnalyze } from '../common/PosteInputWithAnalyze';
import { BrandLogo } from '../BrandLogo';

interface NouveauSalarieGenerateurModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeData?: Partial<Employee>;
  settings: SiteSettings;
  onSavedDraft?: (draft: DraftItem) => void;
  onPublishedOffer?: (offer: JobOfferData) => void;
  onOpenInWebmail?: (html: string) => void;
  onEnrollEmployee?: (emp: Employee) => void;
}

export const NouveauSalarieGenerateurModal: React.FC<NouveauSalarieGenerateurModalProps> = ({
  isOpen,
  onClose,
  employeeData,
  settings,
  onSavedDraft,
  onPublishedOffer,
  onOpenInWebmail,
  onEnrollEmployee
}) => {
  if (!isOpen) return null;

  // Sous-onglets de la fenêtre de génération :
  const [activeTab, setActiveTab] = useState<'promesse' | 'prestation' | 'ticket' | 'offre' | 'bundle'>('promesse');

  // État Salarié / Candidat
  const [candidatNom, setCandidatNom] = useState(
    employeeData?.nom_complet || `${employeeData?.prenom || 'Jean'} ${employeeData?.nom || 'Dupont'}`
  );
  const [posteTitre, setPosteTitre] = useState(
    employeeData?.poste || 'Conducteur Routier International (H/F)'
  );
  const [salaireHoraire, setSalaireHoraire] = useState(
    employeeData?.salaire_horaire || 30.0
  );
  const [salaireMensuel, setSalaireMensuel] = useState(
    employeeData?.salaire || 4800
  );
  const [codeCnp, setCodeCnp] = useState('73300');
  const [departement, setDepartement] = useState(
    employeeData?.departement || 'DEPARTEMENT EXPLOITATION TRANSPORT'
  );

  // Variables Contrat CRIC (Modèle 1 & 2)
  const [cricVars, setCricVars] = useState<CricContractVariables>(() => {
    const base = buildDefaultCricContractVariables(settings);
    base.intitulePoste = posteTitre;
    base.codeCnp = codeCnp;
    return base;
  });

  // Modèle CRIC actif (1: Attestation, 2: Contrat Intégral)
  const [cricModelChoice, setCricModelChoice] = useState<'model1' | 'model2'>('model1');

  // Données Ticket d'entretien
  const [ticketData, setTicketData] = useState<TicketEntretienData>(() =>
    buildDefaultTicketEntretien(candidatNom, posteTitre, settings)
  );

  // Données Offre d'emploi
  const [jobOffer, setJobOffer] = useState<JobOfferData>(() =>
    buildDefaultJobOfferForPoste(posteTitre, departement, settings)
  );

  // États de feedback
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [draftSavedSuccess, setDraftSavedSuccess] = useState(false);
  const [isPublishingOffer, setIsPublishingOffer] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Vue code HTML mail
  const [showHtmlConverter, setShowHtmlConverter] = useState(false);
  const [htmlCopied, setHtmlCopied] = useState(false);

  // Synchronisation lors de l'analyse du poste
  const handlePosteAnalyzed = (res: { poste: any; isNewlyCreated: boolean }) => {
    setPosteTitre(res.poste.titre);
    setCodeCnp(res.poste.codeCnp);
    setDepartement(res.poste.departement);
    setSalaireHoraire(res.poste.salaireHoraireDefaut);
    setSalaireMensuel(res.poste.salaireMensuelDefaut);

    setCricVars((prev) => ({
      ...prev,
      intitulePoste: res.poste.titre,
      codeCnp: res.poste.codeCnp
    }));

    setTicketData((prev) => ({
      ...prev,
      posteConcerne: res.poste.titre,
      codeCnp: res.poste.codeCnp,
      departement: res.poste.departement
    }));

    setJobOffer(buildDefaultJobOfferForPoste(res.poste.titre, res.poste.departement, settings));
  };

  // 1. ACTION : [Enregistrer au brouillon]
  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    try {
      const draftPayload = {
        titre: `Dossier ${candidatNom} - ${posteTitre}`,
        type: 'nouveau_salarie' as const,
        nomCandidat: candidatNom,
        poste: posteTitre,
        departement,
        codeCnp,
        donnees: {
          candidatNom,
          posteTitre,
          salaireHoraire,
          salaireMensuel,
          codeCnp,
          departement,
          cricVars,
          ticketData,
          jobOffer
        }
      };

      const saved = await saveDraftToStorage(draftPayload);
      setDraftSavedSuccess(true);
      if (onSavedDraft) onSavedDraft(saved);
      setTimeout(() => setDraftSavedSuccess(false), 4000);
    } catch (err) {
      console.error('Erreur sauvegarde brouillon:', err);
    } finally {
      setIsSavingDraft(false);
    }
  };

  // 2. ACTION : [Publier sur nos offres]
  const handlePublishOffer = async () => {
    setIsPublishingOffer(true);
    try {
      const offerToPublish: JobOfferData = {
        ...jobOffer,
        titrePoste: posteTitre,
        departement,
        salaireMin: salaireHoraire,
        estPublie: true
      };
      const published = await publishJobOffer(offerToPublish);
      setPublishSuccess(true);
      if (onPublishedOffer) onPublishedOffer(published);
      setTimeout(() => setPublishSuccess(false), 4000);
    } catch (err) {
      console.error('Erreur publication offre:', err);
    } finally {
      setIsPublishingOffer(false);
    }
  };

  // 3. ACTION : [CTR v HTML]
  const handleOpenHtmlMail = () => {
    setShowHtmlConverter(true);
  };

  // Génération du code HTML mail responsive
  const generateMailHtmlContent = (): string => {
    const logoUrl = settings.logo_url || CONTRACT_STATIC_ASSETS.logoAtlantic;
    const bodyContent =
      cricModelChoice === 'model1'
        ? generateModel1PlainText(cricVars).replace(/\n/g, '<br/>')
        : generateModel2PlainText(cricVars).replace(/\n/g, '<br/>');

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dossier Officiel - ${candidatNom}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F1F5F9; padding: 24px 0;">
    <tr>
      <td align="center">
        <table width="640" border="0" cellspacing="0" cellpadding="0" style="background-color: #FFFFFF; border-radius: 8px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
          <!-- En-tête -->
          <tr>
            <td style="background-color: #0B2545; padding: 20px 28px; text-align: left;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <img src="${logoUrl}" alt="${settings.company_name}" style="height: 38px; display: block;" border="0">
                  </td>
                  <td align="right" style="color: #D4A017; font-size: 11px; font-weight: bold; text-transform: uppercase;">
                    Réf : ${ticketData.codeIdCandidature}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Corps -->
          <tr>
            <td style="padding: 28px; color: #1E293B; font-size: 14px; line-height: 1.6;">
              <h2 style="color: #0066B3; margin-top: 0; font-size: 18px; border-bottom: 2px solid #0066B3; padding-bottom: 8px;">
                ${cricModelChoice === 'model1' ? 'ATTESTATION DE MANDAT DE RECRUTEMENT INTERNATIONAL' : 'CONTRAT DE PRESTATION CRIC'}
              </h2>
              <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 16px; margin: 18px 0; font-size: 12.5px;">
                <strong>Candidat :</strong> ${candidatNom}<br>
                <strong>Poste :</strong> ${posteTitre} (CNP ${codeCnp})<br>
                <strong>Rémunération horaire :</strong> ${salaireHoraire.toFixed(2)} $ CAD / h
              </div>
              <div style="font-size: 12.5px; line-height: 1.6; color: #334155;">
                ${bodyContent}
              </div>
            </td>
          </tr>
          <!-- Pied de page -->
          <tr>
            <td style="background-color: #F8FAFC; padding: 16px 28px; border-top: 1px solid #E2E8F0; text-align: center; font-size: 11px; color: #64748B;">
              ${settings.company_name} · Surrey, BC, Canada · Transitaire et Douanes Agréés CBSA
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in">
      <div className="bg-white w-full max-w-6xl max-h-[92vh] rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
        {/* TOP HEADER */}
        <div className="bg-[#0B2545] text-white px-6 py-4 flex items-center justify-between border-b border-[#D4A017]/30 shrink-0">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-[#D4A017]/20 border border-[#D4A017]/40 rounded-xl text-[#D4A017]">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-wide">
                  CENTRE DE GÉNÉRATION AUTOMATIQUE DES DOCUMENTS DU SALARIÉ
                </h2>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 px-2 py-0.5 rounded-full font-bold">
                  Synchronisation Active
                </span>
              </div>
              <p className="text-xs text-gray-300">
                Génération instantanée : Promesse d'embauche, Contrat CRIC, Ticket d'entretien, Offre d'emploi &amp; Bundle
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CADRE INFORMATIONS CANDIDAT & ANALYSE DU POSTE */}
        <div className="bg-gradient-to-r from-slate-50 to-amber-50/40 border-b border-gray-200 px-6 py-3.5 shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                Nom complet du salarié / candidat
              </label>
              <input
                type="text"
                value={candidatNom}
                onChange={(e) => {
                  setCandidatNom(e.target.value);
                  setTicketData((prev) => ({ ...prev, candidatNom: e.target.value }));
                }}
                className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg font-bold text-gray-900 focus:ring-2 focus:ring-[#0066B3]"
              />
            </div>

            <div className="lg:col-span-2">
              <PosteInputWithAnalyze
                label="Intitulé du poste (Analyseur universel)"
                value={posteTitre}
                onChange={setPosteTitre}
                onAnalyzed={handlePosteAnalyzed}
                deptHint={departement}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-gray-600 mb-1">
                  Salaire horaire ($ CAD/h)
                </label>
                <input
                  type="number"
                  step="0.25"
                  value={salaireHoraire}
                  onChange={(e) => setSalaireHoraire(parseFloat(e.target.value) || 0)}
                  className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded-lg font-mono font-bold text-amber-700"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-gray-600 mb-1">
                  Salaire mensuel ($ CAD)
                </label>
                <input
                  type="number"
                  step="50"
                  value={salaireMensuel}
                  onChange={(e) => setSalaireMensuel(parseFloat(e.target.value) || 0)}
                  className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded-lg font-mono font-bold text-blue-900"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ONGLETS DES MODULES DE GÉNÉRATION */}
        <div className="flex border-b border-gray-200 bg-gray-100/70 px-6 gap-2 shrink-0 overflow-x-auto">
          {[
            { id: 'promesse', label: "Promesse d'Embauche", icon: FileCheck2 },
            { id: 'prestation', label: 'Contrat Prestation CRIC', icon: ShieldCheck },
            { id: 'ticket', label: "Ticket d'Entretien (Barcode)", icon: Ticket },
            { id: 'offre', label: 'Offre d’Emploi & Annonce CNP', icon: Briefcase },
            { id: 'bundle', label: 'Bundle Assemblé (4 Pages)', icon: Layers }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'border-[#0066B3] text-[#0066B3] bg-white rounded-t-lg shadow-2xs'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-white/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* CORPS PRINCIPAL DE L'ONGLET ACTIF */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* ONGLET 1 : PROMESSE D'EMBAUCHE */}
          {activeTab === 'promesse' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-start justify-between gap-4">
                <div>
                  <h4 className="font-bold text-blue-950 text-sm">
                    Promesse d’Embauche Officielle (Régie au Taux Horaire)
                  </h4>
                  <p className="text-xs text-blue-800 mt-0.5">
                    Conforme aux exigences d'EDSC / EIMT : Le taux horaire appliqué sur la promesse d'embauche est de{' '}
                    <span className="font-bold">{salaireHoraire.toFixed(2)} $ CAD / heure</span> (base 40h/semaine).
                  </p>
                </div>
              </div>

              <div className="bg-white border rounded-xl p-5 shadow-xs font-mono text-xs text-gray-800 space-y-3 leading-relaxed whitespace-pre-wrap">
                {`PROMESSE D'EMBAUCHE CONDITIONNELLE
ATLANTIC TRANSPORT LTD. · SURREY (COLOMBIE-BRITANNIQUE)

À l'attention de : ${candidatNom}
Poste proposé : ${posteTitre} (CNP ${codeCnp})
Département d'affectation : ${departement}
Type de contrat : Contrat à Durée Indéterminée (CDI) — Temps Plein

CONDITIONS DE RÉMUNÉRATION :
• Taux horaire brut garanti : ${salaireHoraire.toFixed(2)} $ CAD de l'heure
• Équivalent mensuel de base : ${salaireMensuel.toLocaleString('fr-CA')} $ CAD par mois
• Heures de travail : 40 heures par semaine (majorées à 150% au-delà des normes légales de BC)
• Avantages sociaux complets : Assurance médicale & dentaire, REER collectif abondé jusqu'à 5%, 3 semaines de vacances payées dès la 1ère année.`}
              </div>
            </div>
          )}

          {/* ONGLET 2 : CONTRAT DE PRESTATION CRIC */}
          {activeTab === 'prestation' && (
            <div className="space-y-5">
              {/* Sélecteur de modèle & Sélecteur Dropdown Prestataire */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 border border-gray-200 p-4 rounded-xl">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Modèle de document CRIC :
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setCricModelChoice('model1')}
                      className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                        cricModelChoice === 'model1'
                          ? 'bg-[#0066B3] text-white border-[#0066B3] shadow-xs'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      Modèle 1 (Attestation Mandat)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCricModelChoice('model2')}
                      className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                        cricModelChoice === 'model2'
                          ? 'bg-[#0066B3] text-white border-[#0066B3] shadow-xs'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      Modèle 2 (Contrat Intégral 8 Art.)
                    </button>
                  </div>
                </div>

                {/* SELECT DROPDOWN PRESTATAIRE AVEC FLÈCHE */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Sélection du Prestataire (Cabinet CRIC / Partenaire) :
                  </label>
                  <select
                    value={cricVars.prestatairePresetId}
                    onChange={(e) => setCricVars(applyPrestatairePreset(cricVars, e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-lg font-medium text-gray-900 focus:ring-2 focus:ring-[#0066B3]"
                  >
                    {PRESTATAIRES_PRESETS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nomLegal} — {p.descriptionCourt}
                      </option>
                    ))}
                    <option value="custom">Saisie manuelle personnalisée...</option>
                  </select>
                </div>
              </div>

              {/* Boutons de téléchargement distincts PDF et Word */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 border rounded-xl">
                <span className="text-xs font-semibold text-gray-700">
                  Exportation du {cricModelChoice === 'model1' ? 'Modèle 1 (Attestation)' : 'Modèle 2 (Contrat)'} :
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      if (cricModelChoice === 'model1') {
                        const { doc, filename } = await generateModel1AttestationPdf(cricVars);
                        doc.save(filename);
                      } else {
                        const { doc, filename } = await generateModel2ContratPdf(cricVars);
                        doc.save(filename);
                      }
                    }}
                    className="px-3.5 py-1.5 text-xs font-bold bg-[#0B2545] text-white rounded-lg hover:bg-[#134074] transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-[#D4A017]" />
                    <span>Télécharger PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const title = cricModelChoice === 'model1' ? 'Attestation de Mandat de Recrutement' : 'Contrat de Prestation de Services';
                      const content = cricModelChoice === 'model1' ? generateModel1PlainText(cricVars) : generateModel2PlainText(cricVars);
                      downloadWordDocument(
                        `${title.replace(/\s+/g, '_')}_${cricVars.referenceEimtOuSuivi}`,
                        title,
                        `<h1>${title}</h1><pre style="white-space: pre-wrap; font-family: Segoe UI, sans-serif;">${content}</pre>`
                      );
                    }}
                    className="px-3.5 py-1.5 text-xs font-bold bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Télécharger Word (.docx)</span>
                  </button>
                </div>
              </div>

              {/* Aperçu du texte avec toggles */}
              <div className="bg-white border rounded-xl p-5 font-mono text-xs text-gray-800 leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">
                {cricModelChoice === 'model1' ? generateModel1PlainText(cricVars) : generateModel2PlainText(cricVars)}
              </div>
            </div>
          )}

          {/* ONGLET 3 : TICKET D'ENTRETIEN */}
          {activeTab === 'ticket' && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-amber-950 text-sm">
                    Ticket d’Entretien d’Embauche &amp; Stacked Barcode
                  </h4>
                  <p className="text-xs text-amber-800 mt-0.5">
                    Code candidature : <span className="font-mono font-bold text-blue-900">{ticketData.codeIdCandidature}</span> · Scannable avec smartphone
                  </p>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    const { doc, filename } = await generateTicketEntretienPdf(ticketData, settings.logo_url);
                    doc.save(filename);
                  }}
                  className="px-3.5 py-2 text-xs font-bold bg-[#0B2545] text-white rounded-lg hover:bg-[#134074] transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-[#D4A017]" />
                  <span>Télécharger Ticket PDF</span>
                </button>
              </div>

              {/* Coupon visuel */}
              <div className="border-2 border-dashed border-[#D4A017] rounded-xl p-6 bg-[#FEFCF6] shadow-xs">
                <div className="flex items-center justify-between border-b pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <BrandLogo companyName={settings.company_name} customLogoUrl={settings.logo_url} size="header" />
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm">CONVOCATION OFFICIELLE</h3>
                      <p className="text-[10px] text-gray-500">Accès Sécurisé Entretien d’Embauche</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-gray-500 block">Code ID Candidat</span>
                    <span className="font-mono font-bold text-[#0066B3] text-sm">{ticketData.codeIdCandidature}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-gray-500 block text-[11px]">Candidat :</span>
                    <span className="font-bold text-gray-900">{candidatNom}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[11px]">Poste :</span>
                    <span className="font-bold text-gray-900">{posteTitre} (CNP {codeCnp})</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[11px]">Date &amp; Heure :</span>
                    <span className="font-medium text-gray-900">{ticketData.dateEntretien} à {ticketData.heureEntretien}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[11px]">Modalité :</span>
                    <span className="font-medium text-gray-900">{ticketData.typeEntretien}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ONGLET 4 : OFFRES D'EMPLOI & ANNONCE CNP */}
          {activeTab === 'offre' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-white p-4 border rounded-xl">
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">
                    Offre d’Emploi Officielle avec Stacked Barcode
                  </h4>
                  <p className="text-xs text-gray-500">
                    Réf : {jobOffer.reference} · Code-barres compact sous la référence avec redirection vers la page « Nos Offres »
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => downloadJobOfferPdf(jobOffer, settings.logo_url)}
                    className="px-3.5 py-1.5 text-xs font-bold bg-[#0B2545] text-white rounded-lg hover:bg-[#134074] transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-[#D4A017]" />
                    <span>Télécharger Offre PDF</span>
                  </button>
                </div>
              </div>

              <div className="bg-white border rounded-xl p-5 text-xs space-y-3 leading-relaxed text-gray-700">
                <h3 className="font-bold text-base text-[#0066B3]">{posteTitre}</h3>
                <p><strong>Département :</strong> {departement}</p>
                <p><strong>Rémunération horaire :</strong> {salaireHoraire.toFixed(2)} $ CAD / h</p>
                <p><strong>Description :</strong> {jobOffer.missionPrincipale}</p>
              </div>
            </div>
          )}

          {/* ONGLET 5 : BUNDLE ASSEMBLÉ 4 PAGES */}
          {activeTab === 'bundle' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-[#0B2545] to-[#134074] text-white p-5 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-base text-[#D4A017]">
                    Bundle Complet Assemblé (4 Pages avec Couverture de Livre)
                  </h4>
                  <p className="text-xs text-gray-200 mt-1">
                    Page 1 : Page de garde haute fidélité · Page 2 : Offre avec barcode · Page 3 : Attestation de mandat · Page 4 : Ticket d'entretien
                  </p>
                </div>

                <button
                  type="button"
                  disabled={isGeneratingPdf}
                  onClick={async () => {
                    setIsGeneratingPdf(true);
                    try {
                      const bundlePayload: BundleAssemblyData = {
                        titreDossier: `Dossier Mobilité ${candidatNom}`,
                        nomCandidat: candidatNom,
                        titrePoste: posteTitre,
                        codeCnp,
                        referenceDossier: ticketData.codeIdCandidature,
                        dateEtablissement: new Date().toLocaleDateString('fr-CA'),
                        jobOffer,
                        cricVariables: cricVars,
                        ticketData,
                        logoUrl: settings.logo_url,
                        companyName: settings.company_name
                      };

                      const { doc, filename } = await generateAssembledBookBundlePdf(bundlePayload, settings);
                      doc.save(filename);
                    } catch (err) {
                      console.error('Erreur génération bundle:', err);
                    } finally {
                      setIsGeneratingPdf(false);
                    }
                  }}
                  className="px-4 py-2.5 text-xs font-bold bg-[#D4A017] hover:bg-[#b88b14] text-gray-950 rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
                >
                  {isGeneratingPdf ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>{isGeneratingPdf ? 'Assemblage...' : 'Télécharger Bundle PDF'}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="bg-slate-900 text-white p-3 rounded-lg border border-slate-700">
                  <span className="text-[10px] text-amber-400 font-bold block mb-1">PAGE 1</span>
                  <span className="text-xs font-bold">Couverture Livre PDF</span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-gray-200">
                  <span className="text-[10px] text-blue-600 font-bold block mb-1">PAGE 2</span>
                  <span className="text-xs font-bold text-gray-800">Offre &amp; Barcode</span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-gray-200">
                  <span className="text-[10px] text-blue-600 font-bold block mb-1">PAGE 3</span>
                  <span className="text-xs font-bold text-gray-800">Attestation Mandat</span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-gray-200">
                  <span className="text-[10px] text-blue-600 font-bold block mb-1">PAGE 4</span>
                  <span className="text-xs font-bold text-gray-800">Ticket d'Entretien</span>
                </div>
              </div>
            </div>
          )}

          {/* VUE CONVERTISSEUR HTML MAIL (si activée) */}
          {showHtmlConverter && (
            <div className="bg-slate-900 text-white p-5 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-[#D4A017] flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  <span>Code HTML Mail Template Prêt pour Webmail / Messageries</span>
                </h4>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(generateMailHtmlContent());
                      setHtmlCopied(true);
                      setTimeout(() => setHtmlCopied(false), 3000);
                    }}
                    className="px-3 py-1 text-xs font-bold bg-[#D4A017] text-gray-950 rounded-lg hover:bg-amber-400 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    {htmlCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{htmlCopied ? 'Code Copié !' : 'Copier Code HTML'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenInWebmail) onOpenInWebmail(generateMailHtmlContent());
                      setShowHtmlConverter(false);
                      onClose();
                    }}
                    className="px-3 py-1 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Transférer vers Webmail</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowHtmlConverter(false)}
                    className="p-1 text-gray-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <textarea
                readOnly
                value={generateMailHtmlContent()}
                className="w-full h-44 bg-slate-950 font-mono text-[11px] p-3 text-emerald-400 rounded-lg border border-slate-700 focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* FEEDBACK BANNERS */}
        {draftSavedSuccess && (
          <div className="bg-emerald-600 text-white px-6 py-2 text-xs font-bold flex items-center justify-between shrink-0">
            <span>✓ Dossier enregistré avec succès dans l'espace "Brouillons" ! Vous pouvez le reprendre à tout moment.</span>
          </div>
        )}

        {publishSuccess && (
          <div className="bg-blue-600 text-white px-6 py-2 text-xs font-bold flex items-center justify-between shrink-0">
            <span>✓ Offre d'emploi publiée en direct sur la page publique « Nos Offres » !</span>
          </div>
        )}

        {/* BARRE D'ACTIONS OBLIGATOIRE DU BAS */}
        <div className="bg-white border-t border-gray-200 px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {/* BOUTON 1 : [enregistré au brouillon] */}
            <button
              type="button"
              disabled={isSavingDraft}
              onClick={handleSaveDraft}
              className="px-4 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-gray-950 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Clock className="w-4 h-4 text-gray-950" />
              <span>{isSavingDraft ? 'Enregistrement...' : 'Enregistrer au brouillon'}</span>
            </button>

            {/* BOUTON 2 : [publié sur nos offres] */}
            <button
              type="button"
              disabled={isPublishingOffer}
              onClick={handlePublishOffer}
              className="px-4 py-2 text-xs font-bold bg-[#0066B3] hover:bg-[#00508f] text-white rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Globe className="w-4 h-4 text-[#D4A017]" />
              <span>{isPublishingOffer ? 'Publication...' : 'Publier sur nos offres'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* BOUTON 4 : [CTR v HTML] */}
            <button
              type="button"
              onClick={handleOpenHtmlMail}
              className="px-4 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-900 text-emerald-400 border border-emerald-500/30 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="Convertir en template d'e-mail HTML éditable"
            >
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>CTR v HTML</span>
            </button>

            {/* BOUTON 3 : [annulé] */}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-all cursor-pointer"
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
