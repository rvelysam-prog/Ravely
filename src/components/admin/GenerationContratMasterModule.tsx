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
  ChevronDown,
  Palette,
  Image,
  Edit3,
  Sliders,
  RotateCcw,
  Save,
  Maximize2
} from 'lucide-react';
import { SiteSettings, Employee } from '../../types';
import {
  CricContractVariables,
  PRESTATAIRES_PRESETS,
  buildDefaultCricContractVariables,
  applyPrestatairePreset,
  generateModel1PlainText,
  generateModel2PlainText,
  generateModel1AttestationPdf,
  generateModel2ContratPdf,
  downloadWordDocument,
  generateCricContractResponsiveEmailHtml
} from '../../services/cricContractService';
import {
  TicketEntretienData,
  buildDefaultTicketEntretien,
  generateTicketEntretienPdf,
  saveInterviewSession,
  generateSmallStackedBarcodeCanvasDataUrl
} from '../../services/contractGenerationService';
import {
  JobOfferData,
  buildDefaultJobOfferForPoste,
  generateJobOfferPdf,
  downloadJobOfferPdf,
  publishJobOffer,
  unpublishJobOffer,
  getAllAvailablePostes
} from '../../services/jobOfferService';
import {
  generateAssembledBookBundlePdf,
  BundleAssemblyData
} from '../../services/bundleAssemblyService';
import { PosteInputWithAnalyze } from '../common/PosteInputWithAnalyze';
import { addEmployee, getEmployees } from '../../services/staticStorage';
import { BrandLogo } from '../BrandLogo';
import {
  PanneauReglagesFichiersImportes,
  AssetTabKey
} from '../common/PanneauReglagesFichiersImportes';
import { InteractiveDocumentCanvas } from '../common/InteractiveDocumentCanvas';
import {
  getSavedPdfAssetsConfig,
  PdfImportedAssetsConfig,
  loadPdfAssetsConfigFromFirestore
} from '../../services/departmentsAndEmailService';
import { CONTRACT_STATIC_ASSETS } from '../../services/contractPdfGenerator';

interface GenerationContratMasterModuleProps {
  settings: SiteSettings;
  onOpenInWebmail?: (html: string) => void;
  onEmployeeCreated?: (emp: Employee) => void;
}

export const GenerationContratMasterModule: React.FC<GenerationContratMasterModuleProps> = ({
  settings,
  onOpenInWebmail,
  onEmployeeCreated
}) => {
  // Onglets du module maître :
  const [activeSubTab, setActiveSubTab] = useState<
    'prestation' | 'ticket' | 'offre' | 'models5' | 'bundle'
  >('prestation');

  // Choix du modèle CRIC : Modèle 1 (Attestation) ou Modèle 2 (Contrat Intégral 8 Articles)
  const [cricModelChoice, setCricModelChoice] = useState<'model1' | 'model2'>('model1');

  // Variables exhaustives du contrat CRIC avec cases à cocher de visibilité
  const [cricVars, setCricVars] = useState<CricContractVariables>(() =>
    buildDefaultCricContractVariables(settings)
  );

  // Configuration des réglages de fichiers importés (largeur, hauteur, opacité, positions X/Y, rotation, z-index, filtres)
  const [assetsConfig, setAssetsConfig] = useState<PdfImportedAssetsConfig>(() =>
    getSavedPdfAssetsConfig()
  );

  // Fichiers importés personnalisés (Data URLs en mémoire et Base64)
  const [uploadedAssets, setUploadedAssets] = useState<{
    logo?: string;
    signature?: string;
    cachet?: string;
    filigrane?: string;
    arrierePlan?: string;
  }>({
    logo: settings.logo_url || CONTRACT_STATIC_ASSETS.logoAtlantic,
    signature: CONTRACT_STATIC_ASSETS.signature,
    cachet: CONTRACT_STATIC_ASSETS.cachet,
    filigrane: '',
    arrierePlan: ''
  });

  // Données Ticket d'entretien
  const [ticket, setTicket] = useState<TicketEntretienData>(() =>
    buildDefaultTicketEntretien(
      'JEAN DUPONT',
      cricVars.intitulePoste,
      settings,
      cricVars.referenceEimtOuSuivi
    )
  );

  // Données Offre d'emploi
  const [jobOffer, setJobOffer] = useState<JobOfferData>(() =>
    buildDefaultJobOfferForPoste(cricVars.intitulePoste, undefined, settings)
  );

  // 5 Modèles de design au choix générés à partir du contrat CRIC personnalisé
  const [selected5ModelIdx, setSelected5ModelIdx] = useState(0);

  // Notifications et chargements
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Synchronisation Firestore des réglages d'actifs visuels au montage
  useEffect(() => {
    loadPdfAssetsConfigFromFirestore().then((remoteCfg) => {
      if (remoteCfg) {
        setAssetsConfig(remoteCfg);
      }
    });
  }, []);

  // Synchronisation automatique de la session d'entretien
  useEffect(() => {
    saveInterviewSession(ticket);
  }, [ticket]);

  // Toast de copie
  const triggerCopied = (msg: string) => {
    setCopiedNotification(msg);
    setTimeout(() => setCopiedNotification(null), 3500);
  };

  // Gestion des uploads d'actifs visuels (logo, signature, cachet, filigrane, arrière-plan)
  const handleUploadAsset = (key: AssetTabKey, dataUrl: string) => {
    setUploadedAssets((prev) => ({
      ...prev,
      [key]: dataUrl
    }));

    if (key === 'logo') {
      setCricVars((prev) => ({ ...prev, logoEmployeurUrl: dataUrl }));
    } else if (key === 'signature') {
      setCricVars((prev) => ({ ...prev, signatureEmployeurUrl: dataUrl }));
    } else if (key === 'cachet') {
      setCricVars((prev) => ({ ...prev, cachetEmployeurUrl: dataUrl }));
    } else if (key === 'filigrane') {
      setCricVars((prev) => ({ ...prev, filigraneEmployeurUrl: dataUrl }));
    }
  };

  // 5 Modèles de design visuel générés à partir du contrat CRIC personnalisé
  const FIVE_DESIGN_MODELS = [
    {
      id: 'design_1',
      titre: 'Modèle 1 : Exécutif & Diplomatique (Navy & Or)',
      description: 'Double bordure dorée et marine, typographie solennelle, sceaux en filigrane centré et paraphes formels.',
      accentColor: '#D4A017',
      primaryColor: '#0B2545',
      badge: 'Format Recommandé Canada',
      fontStyle: 'Georgia, serif'
    },
    {
      id: 'design_2',
      titre: 'Modèle 2 : Moderne Minimaliste & International',
      description: 'Design contemporain épuré, bandeaux azur, badges gouvernementaux CNESST & CCIC avec QR code de vérification.',
      accentColor: '#0284C7',
      primaryColor: '#0369A1',
      badge: 'Haute Lisibilité Mobile',
      fontStyle: 'system-ui, sans-serif'
    },
    {
      id: 'design_3',
      titre: 'Modèle 3 : Notarié Solennel & Fiduciaire',
      description: 'Armoiries en filigrane pleine page, articles encadrés avec lettrines discrètes et mentions légales bilingues.',
      accentColor: '#475569',
      primaryColor: '#1E293B',
      badge: 'Conformité Juridique',
      fontStyle: 'Times New Roman, serif'
    },
    {
      id: 'design_4',
      titre: 'Modèle 4 : Logistique & Fret Transfrontalier',
      description: 'Cartouche douanier en tête avec code-barres scannable, structure tabulaire des engagements et double signature.',
      accentColor: '#D97706',
      primaryColor: '#047857',
      badge: 'Spécial Fret & Douanes',
      fontStyle: 'Segoe UI, sans-serif'
    },
    {
      id: 'design_5',
      titre: 'Modèle 5 : Protocole d’Entente Canadien Bilingue',
      description: 'Format accord bilatéral bilingue, sceau d’État stylisé et encadré spécial protection des travailleurs étrangers sans frais.',
      accentColor: '#F59E0B',
      primaryColor: '#7C3AED',
      badge: 'Protocole International',
      fontStyle: 'Calibri, sans-serif'
    }
  ];

  // Gestion du changement de Prestataire via le Select Dropdown
  const handleSelectPrestatairePreset = (presetId: string) => {
    const updated = applyPrestatairePreset(cricVars, presetId);
    setCricVars(updated);
  };

  // Synchronisation lors de l'analyse intelligente du poste
  const handlePosteAnalyzed = (res: { poste: any; isNewlyCreated: boolean }) => {
    setCricVars((prev) => ({
      ...prev,
      intitulePoste: res.poste.titre,
      codeCnp: res.poste.codeCnp
    }));

    setTicket((prev) => ({
      ...prev,
      posteConcerne: res.poste.titre,
      codeCnp: res.poste.codeCnp,
      departement: res.poste.departement
    }));

    setJobOffer(buildDefaultJobOfferForPoste(res.poste.titre, res.poste.departement, settings));
    triggerCopied(`Poste synchronisé : ${res.poste.titre} (CNP ${res.poste.codeCnp})`);
  };

  // Téléchargement du Bundle complet assemblé (4 Pages avec couverture de livre)
  const handleDownloadAssembledBundlePdf = async () => {
    try {
      setDownloadingPdf(true);
      const bundleData: BundleAssemblyData = {
        titreDossier: `Dossier Mobilité - ${ticket.candidatNom}`,
        nomCandidat: ticket.candidatNom,
        titrePoste: cricVars.intitulePoste,
        codeCnp: cricVars.codeCnp,
        referenceDossier: cricVars.referenceEimtOuSuivi,
        dateEtablissement: cricVars.dateJour,
        jobOffer,
        cricVariables: cricVars,
        ticketData: ticket,
        logoUrl: uploadedAssets.logo || settings.logo_url,
        companyName: settings.company_name
      };

      const { doc, filename } = await generateAssembledBookBundlePdf(bundleData, settings);
      doc.save(filename);
      triggerCopied('Bundle complet (4 Pages avec Couverture de Livre) téléchargé avec succès !');
    } catch (err) {
      console.error('Erreur bundle assemblé:', err);
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Convertisseur HTML Mail Template pour Webmail
  const handleTransferToWebmail = (htmlContent: string) => {
    navigator.clipboard.writeText(htmlContent);
    triggerCopied('Code HTML e-mail copié ! Redirection vers le Webmail...');
    if (onOpenInWebmail) {
      onOpenInWebmail(htmlContent);
    }
  };

  // Génération du code HTML Email Responsive pour le contrat CRIC
  const currentCricEmailHtml = generateCricContractResponsiveEmailHtml(
    cricVars,
    cricModelChoice,
    selected5ModelIdx
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* En-tête principal */}
      <div className="bg-[#0B2545] text-white p-5 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-amber-400/20">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold bg-amber-400/10 px-2 py-0.5 rounded">
                Espace Admin RH
              </span>
              <span className="text-xs text-slate-300">· Hub Juridique &amp; Conventions</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white mt-0.5">
              Génération Contrat (Prestation CRIC, Offres &amp; Tickets)
            </h2>
          </div>
        </div>

        {/* Bouton de téléchargement Bundle Assemblé */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadAssembledBundlePdf}
            disabled={downloadingPdf}
            className="min-h-[42px] px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50 transition-all active:scale-95"
            title="Générer le bundle complet : Couverture livre + Offre + Attestation + Ticket"
          >
            <Layers className="w-4 h-4 text-slate-950" />
            <span>{downloadingPdf ? 'Génération...' : 'Télécharger Bundle Assemblé (4 Pages)'}</span>
          </button>
        </div>
      </div>

      {/* Barre de Toast de notification */}
      {copiedNotification && (
        <div className="bg-emerald-600 text-white text-xs px-6 py-2.5 flex items-center justify-between font-medium shadow-md animate-fade-in">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-200" />
            <span>{copiedNotification}</span>
          </div>
          <span className="text-[10px] underline cursor-pointer" onClick={() => setCopiedNotification(null)}>
            Fermer
          </span>
        </div>
      )}

      {/* NAVIGATION ENTRE LES 5 SOUS-MODULES */}
      <div className="bg-slate-100 border-b border-slate-200 px-6 pt-3 flex gap-2 overflow-x-auto">
        {[
          { id: 'prestation', label: '1. Contrat de Prestation CRIC', icon: ShieldCheck },
          { id: 'ticket', label: '2. Ticket d’Entretien (Barcode)', icon: Ticket },
          { id: 'offre', label: '3. Offres d’Emploi & Annonce CNP', icon: Briefcase },
          { id: 'models5', label: '4. 5 Modèles au Choix', icon: Sparkles },
          { id: 'bundle', label: '5. Bundle Assemblé (Couverture Livre)', icon: Layers }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`px-4 py-2.5 text-xs sm:text-sm font-bold rounded-t-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-white text-[#0B2545] border-t-2 border-[#0B2545] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Icon className="w-4 h-4 text-[#0066B3]" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* CONTENU PRINCIPAL */}
      <div className="p-6 space-y-6">
        {/* ========================================================================= */}
        {/* PANNEAU DE RÉGLAGES DES FICHIERS IMPORTÉS (COMMUN À TOUS LES SOUS-MODULES) */}
        {/* ========================================================================= */}
        <PanneauReglagesFichiersImportes
          assetsConfig={assetsConfig}
          onChangeConfig={setAssetsConfig}
          onUploadAsset={handleUploadAsset}
          uploadedAssetUrls={uploadedAssets}
          title={`Panneau Réglages Fichiers Importés — ${
            activeSubTab === 'prestation'
              ? 'Contrat de Prestation CRIC'
              : activeSubTab === 'ticket'
              ? 'Ticket d’Entretien'
              : activeSubTab === 'offre'
              ? 'Offre d’Emploi CNP'
              : activeSubTab === 'models5'
              ? '5 Modèles de Design'
              : 'Bundle Assemblé'
          }`}
        />

        {/* ========================================================================= */}
        {/* 1. SOUS-MODULE : CONTRAT DE PRESTATION CRIC */}
        {/* ========================================================================= */}
        {activeSubTab === 'prestation' && (
          <div className="space-y-6">
            {/* Barre de contrôle du modèle CRIC et boutons d'export */}
            <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-blue-900 uppercase tracking-wide">
                    Choix du modèle légal CRIC :
                  </span>
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setCricModelChoice('model1')}
                    className={`py-2 px-3.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      cricModelChoice === 'model1'
                        ? 'bg-[#0066B3] text-white border-[#0066B3] shadow-xs'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    Modèle 1 (Attestation de Mandat)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCricModelChoice('model2')}
                    className={`py-2 px-3.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      cricModelChoice === 'model2'
                        ? 'bg-[#0066B3] text-white border-[#0066B3] shadow-xs'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    Modèle 2 (Contrat Intégral 8 Articles)
                  </button>
                </div>
              </div>

              {/* Boutons de téléchargement distincts PDF et Word (.docx) */}
              <div className="flex flex-wrap items-center gap-2">
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
                    triggerCopied('Document PDF téléchargé avec succès !');
                  }}
                  className="px-3.5 py-2 text-xs font-bold bg-[#0B2545] hover:bg-[#134074] text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-[#D4A017]" />
                  <span>Télécharger PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const title =
                      cricModelChoice === 'model1'
                        ? 'Attestation de Mandat de Recrutement International'
                        : 'Contrat de Prestation de Services de Recrutement International';
                    const content =
                      cricModelChoice === 'model1'
                        ? generateModel1PlainText(cricVars)
                        : generateModel2PlainText(cricVars);

                    downloadWordDocument(
                      `${title.replace(/\s+/g, '_')}_${cricVars.referenceEimtOuSuivi}`,
                      title,
                      `<h1>${title}</h1><pre style="white-space: pre-wrap; font-family: Segoe UI, Arial, sans-serif; font-size: 11pt; line-height: 1.6;">${content}</pre>`
                    );
                    triggerCopied('Fichier Word (.doc/.docx) téléchargé !');
                  }}
                  className="px-3.5 py-2 text-xs font-bold bg-blue-700 hover:bg-blue-800 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Télécharger Word (.docx)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleTransferToWebmail(currentCricEmailHtml);
                  }}
                  className="px-3.5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Code HTML Mail Webmail</span>
                </button>
              </div>
            </div>

            {/* FORMULAIRE DES PARTIES AVEC LISTE DÉROULANTE (SELECT DROPDOWN) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
              {/* PARTIE 1 : L'EMPLOYEUR (CANADA) */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <h3 className="font-bold text-sm text-[#0B2545] flex items-center gap-2 border-b pb-2">
                  <Building2 className="w-4 h-4 text-[#0066B3]" />
                  <span>Partie 1 : L'Entreprise Employeuse (Canada)</span>
                </h3>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1">
                    <label className="block text-slate-600 font-semibold mb-1">Nom de l'entreprise employeuse</label>
                    <input
                      type="text"
                      value={cricVars.nomEntrepriseCanada}
                      onChange={(e) => setCricVars({ ...cricVars, nomEntrepriseCanada: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-bold"
                    />
                  </div>
                  <label className="flex items-center gap-1 text-[11px] text-gray-500 mt-4 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cricVars.showNomEntrepriseCanada}
                      onChange={(e) => setCricVars({ ...cricVars, showNomEntrepriseCanada: e.target.checked })}
                      className="rounded text-[#0066B3]"
                    />
                    <span>Afficher</span>
                  </label>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1">
                    <label className="block text-slate-600 font-semibold mb-1">Province canadienne</label>
                    <input
                      type="text"
                      value={cricVars.provinceCanadienne}
                      onChange={(e) => setCricVars({ ...cricVars, provinceCanadienne: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                  <label className="flex items-center gap-1 text-[11px] text-gray-500 mt-4 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cricVars.showProvinceCanadienne}
                      onChange={(e) => setCricVars({ ...cricVars, showProvinceCanadienne: e.target.checked })}
                      className="rounded text-[#0066B3]"
                    />
                    <span>Afficher</span>
                  </label>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1">
                    <label className="block text-slate-600 font-semibold mb-1">Adresse complète au Canada</label>
                    <input
                      type="text"
                      value={cricVars.adresseEntrepriseCanada}
                      onChange={(e) => setCricVars({ ...cricVars, adresseEntrepriseCanada: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                  <label className="flex items-center gap-1 text-[11px] text-gray-500 mt-4 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cricVars.showAdresseEntrepriseCanada}
                      onChange={(e) => setCricVars({ ...cricVars, showAdresseEntrepriseCanada: e.target.checked })}
                      className="rounded text-[#0066B3]"
                    />
                    <span>Afficher</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Représentant légal</label>
                    <input
                      type="text"
                      value={cricVars.representantNomEmployeur}
                      onChange={(e) => setCricVars({ ...cricVars, representantNomEmployeur: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Titre / Fonction</label>
                    <input
                      type="text"
                      value={cricVars.representantTitreEmployeur}
                      onChange={(e) => setCricVars({ ...cricVars, representantTitreEmployeur: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* PARTIE 2 : LE PRESTATAIRE (CABINET CRIC) AVEC SELECT DROPDOWN */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <h3 className="font-bold text-sm text-[#0B2545] flex items-center justify-between border-b pb-2">
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Partie 2 : Le Prestataire (Cabinet CRIC Partenaire)</span>
                  </span>
                  <span className="text-[10px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full font-semibold">
                    Permis CNESST &amp; CCIC
                  </span>
                </h3>

                {/* SELECT DROPDOWN DES PRESTATAIRES AGRÉÉS */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1.5">
                    <span>Sélectionner un Cabinet Partenaire :</span>
                    <ChevronDown className="w-3.5 h-3.5 text-[#0066B3]" />
                  </label>
                  <select
                    value={cricVars.prestatairePresetId}
                    onChange={(e) => handleSelectPrestatairePreset(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border-2 border-emerald-500/40 bg-white font-bold text-slate-900 focus:border-emerald-600 cursor-pointer shadow-xs"
                  >
                    {PRESTATAIRES_PRESETS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nomLegal} — {p.statutJuridique} ({p.permisCnesst})
                      </option>
                    ))}
                    <option value="custom">Autre prestataire (Saisie manuelle personnalisée)...</option>
                  </select>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1">
                    <label className="block text-slate-600 font-semibold mb-1">Nom légal du cabinet / Consultant</label>
                    <input
                      type="text"
                      value={cricVars.nomPrestataireFrance}
                      onChange={(e) => setCricVars({ ...cricVars, nomPrestataireFrance: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-bold"
                    />
                  </div>
                  <label className="flex items-center gap-1 text-[11px] text-gray-500 mt-4 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cricVars.showNomPrestataireFrance}
                      onChange={(e) => setCricVars({ ...cricVars, showNomPrestataireFrance: e.target.checked })}
                      className="rounded text-[#0066B3]"
                    />
                    <span>Afficher</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Permis CNESST</label>
                    <input
                      type="text"
                      value={cricVars.permisCnesst}
                      onChange={(e) => setCricVars({ ...cricVars, permisCnesst: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-mono text-emerald-800"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">N° Membre CCIC</label>
                    <input
                      type="text"
                      value={cricVars.numeroMembreCcic}
                      onChange={(e) => setCricVars({ ...cricVars, numeroMembreCcic: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-mono text-emerald-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Mandataire / Signataire</label>
                    <input
                      type="text"
                      value={cricVars.representantPrestataireNom}
                      onChange={(e) => setCricVars({ ...cricVars, representantPrestataireNom: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Titre</label>
                    <input
                      type="text"
                      value={cricVars.representantPrestataireTitre}
                      onChange={(e) => setCricVars({ ...cricVars, representantPrestataireTitre: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* PARTIE 3 : IDENTIFICATION DU POSTE ET DÉMARCHE D'IMMIGRATION */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
              <h3 className="font-bold text-sm text-[#0B2545] flex items-center justify-between border-b pb-2">
                <span>Identification du Poste &amp; Démarches d'Immigration (LIPR / EIMT)</span>
                <span className="text-[11px] font-mono text-blue-800 font-bold">
                  Réf. Gouvernementale : {cricVars.referenceEimtOuSuivi}
                </span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <PosteInputWithAnalyze
                    label="Intitulé exact du poste"
                    value={cricVars.intitulePoste}
                    onChange={(val) => setCricVars({ ...cricVars, intitulePoste: val })}
                    onAnalyzed={handlePosteAnalyzed}
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Code CNP (5 chiffres au Canada)</label>
                  <input
                    type="text"
                    value={cricVars.codeCnp}
                    onChange={(e) => setCricVars({ ...cricVars, codeCnp: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono font-bold text-blue-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Type de démarche d'immigration</label>
                  <select
                    value={cricVars.typeDemarche}
                    onChange={(e) => setCricVars({ ...cricVars, typeDemarche: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium"
                  >
                    <option value="EIMT">EIMT (Étude d'Impact sur le Marché du Travail)</option>
                    <option value="Volet des talents mondiaux">Volet des talents mondiaux (GTS)</option>
                    <option value="Dispense">Dispense d'EIMT / Mobilité Francophone</option>
                  </select>
                </div>
              </div>
            </div>

            {/* CANEVAS INTERACTIF & PRÉVISUALISATION EN DIRECT DU DOCUMENT CRIC */}
            <InteractiveDocumentCanvas
              title={`Aperçu interactif : ${cricModelChoice === 'model1' ? 'Modèle 1 (Attestation de Mandat)' : 'Modèle 2 (Contrat Intégral)'}`}
              documentTypeLabel="Contrat de Prestation CRIC"
              assetsConfig={assetsConfig}
              onChangeAssetsConfig={setAssetsConfig}
              uploadedAssetUrls={uploadedAssets}
              htmlEmailContent={currentCricEmailHtml}
              onDownloadPdf={async () => {
                if (cricModelChoice === 'model1') {
                  const { doc, filename } = await generateModel1AttestationPdf(cricVars);
                  doc.save(filename);
                } else {
                  const { doc, filename } = await generateModel2ContratPdf(cricVars);
                  doc.save(filename);
                }
                triggerCopied('PDF téléchargé avec succès !');
              }}
              onDownloadWord={() => {
                const title =
                  cricModelChoice === 'model1'
                    ? 'Attestation_Mandat_Recrutement'
                    : 'Contrat_Prestation_CRIC_Integrale';
                const text =
                  cricModelChoice === 'model1'
                    ? generateModel1PlainText(cricVars)
                    : generateModel2PlainText(cricVars);
                downloadWordDocument(`${title}_${cricVars.referenceEimtOuSuivi}`, title, `<pre style="white-space: pre-wrap; font-family: Segoe UI, Arial;">${text}</pre>`);
                triggerCopied('Word (.docx) téléchargé !');
              }}
              onOpenInWebmail={handleTransferToWebmail}
            >
              {/* Contenu visuel en mode Document A4 avec ContentEditable */}
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b pb-4">
                  <div className="flex items-center gap-3">
                    {uploadedAssets.logo ? (
                      <img src={uploadedAssets.logo} alt="Logo" className="max-h-14 max-w-[200px] object-contain" />
                    ) : (
                      <BrandLogo companyName={settings.company_name} size="header" />
                    )}
                  </div>
                  <div className="text-right text-xs">
                    <span className="font-bold text-[#0B2545] uppercase block">Attestation Officielle de Mandat</span>
                    <span className="text-slate-500 font-mono">Réf : {cricVars.referenceEimtOuSuivi}</span>
                  </div>
                </div>

                <div
                  contentEditable
                  suppressContentEditableWarning
                  className="font-mono text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap outline-none hover:bg-amber-50/50 p-2 rounded-lg cursor-text transition-colors"
                >
                  {cricModelChoice === 'model1' ? generateModel1PlainText(cricVars) : generateModel2PlainText(cricVars)}
                </div>

                {/* Double signatures avec tampons superposés */}
                <div className="grid grid-cols-2 gap-6 pt-6 border-t border-slate-200">
                  <div className="p-3 rounded-xl border border-slate-200 bg-white relative">
                    <span className="text-xs font-bold text-[#0B2545] block">Pour l'Employeur :</span>
                    <span className="text-xs text-slate-700 block">{cricVars.signataireNomEmployeur}</span>
                    <span className="text-[11px] text-slate-500 block">{cricVars.signataireTitreEmployeur}</span>
                    <div className="mt-3 flex items-center gap-2">
                      {uploadedAssets.cachet && (
                        <img src={uploadedAssets.cachet} alt="Cachet" className="w-16 h-16 object-contain" />
                      )}
                      {uploadedAssets.signature && (
                        <img src={uploadedAssets.signature} alt="Signature" className="h-10 object-contain" />
                      )}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-200 bg-white relative">
                    <span className="text-xs font-bold text-[#0B2545] block">Pour le Prestataire :</span>
                    <span className="text-xs text-slate-700 block">{cricVars.representantPrestataireNom}</span>
                    <span className="text-[11px] text-slate-500 block">{cricVars.representantPrestataireTitre}</span>
                    <div className="mt-3 flex items-center gap-2">
                      {uploadedAssets.cachet && (
                        <img src={uploadedAssets.cachet} alt="Cachet Prestataire" className="w-16 h-16 object-contain" />
                      )}
                      {uploadedAssets.signature && (
                        <img src={uploadedAssets.signature} alt="Signature Prestataire" className="h-10 object-contain" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </InteractiveDocumentCanvas>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. SOUS-MODULE : TICKET D'ENTRETIEN */}
        {/* ========================================================================= */}
        {activeSubTab === 'ticket' && (
          <div className="space-y-5">
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center justify-between">
              <div>
                <h4 className="font-bold text-amber-950 text-sm">
                  Ticket d’Entretien d’Embauche &amp; Stacked Barcode Sécurisé
                </h4>
                <p className="text-xs text-amber-800 mt-0.5">
                  Code ID unique : <span className="font-mono font-bold text-blue-900">{ticket.codeIdCandidature}</span> · Accès scannable immédiat
                </p>
              </div>

              <button
                type="button"
                onClick={async () => {
                  const { doc, filename } = await generateTicketEntretienPdf(ticket, uploadedAssets.logo || settings.logo_url);
                  doc.save(filename);
                  triggerCopied('Ticket d’entretien PDF téléchargé !');
                }}
                className="px-4 py-2 text-xs font-bold bg-[#0B2545] text-white rounded-xl hover:bg-[#134074] transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Download className="w-4 h-4 text-[#D4A017]" />
                <span>Télécharger Ticket PDF</span>
              </button>
            </div>

            {/* Édition rapide du candidat */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-white border rounded-xl text-xs">
              <div>
                <label className="block text-gray-600 font-semibold mb-1">Nom du candidat</label>
                <input
                  type="text"
                  value={ticket.candidatNom}
                  onChange={(e) => setTicket({ ...ticket, candidatNom: e.target.value })}
                  className="w-full px-3 py-1.5 border rounded-lg font-bold"
                />
              </div>
              <div>
                <label className="block text-gray-600 font-semibold mb-1">Date de l'entretien</label>
                <input
                  type="text"
                  value={ticket.dateEntretien}
                  onChange={(e) => setTicket({ ...ticket, dateEntretien: e.target.value })}
                  className="w-full px-3 py-1.5 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-gray-600 font-semibold mb-1">Modalité</label>
                <input
                  type="text"
                  value={ticket.typeEntretien}
                  onChange={(e) => setTicket({ ...ticket, typeEntretien: e.target.value as any })}
                  className="w-full px-3 py-1.5 border rounded-lg font-medium"
                />
              </div>
            </div>

            {/* Visuel du Ticket */}
            <div className="border-2 border-dashed border-[#D4A017] rounded-2xl p-6 bg-[#FEFCF6]">
              <div className="flex items-center justify-between border-b pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <BrandLogo companyName={settings.company_name} customLogoUrl={uploadedAssets.logo || settings.logo_url} size="header" />
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">COUPON CONVOCATION ENTRETIEN</h3>
                    <p className="text-[10px] text-gray-500">Direction des Ressources Humaines</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-500 block">Code ID Candidature</span>
                  <span className="font-mono font-bold text-[#0066B3] text-sm">{ticket.codeIdCandidature}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-gray-500 block text-[11px]">Candidat :</span>
                  <span className="font-bold text-gray-900">{ticket.candidatNom}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[11px]">Poste :</span>
                  <span className="font-bold text-gray-900">{ticket.posteConcerne} (CNP {ticket.codeCnp})</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[11px]">Date &amp; Heure :</span>
                  <span className="font-medium text-gray-900">{ticket.dateEntretien} à {ticket.heureEntretien}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[11px]">Modalité :</span>
                  <span className="font-medium text-gray-900">{ticket.typeEntretien}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. SOUS-MODULE : OFFRES D'EMPLOI & ANNONCE GABARIT CNP */}
        {/* ========================================================================= */}
        {activeSubTab === 'offre' && (
          <div className="space-y-5">
            <div className="bg-white border p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-gray-900 text-sm">
                  Offre d’Emploi Officielle (avec Stacked Barcode scannable)
                </h4>
                <p className="text-xs text-gray-500">
                  Réf : {jobOffer.reference} · Code-barres compact sous la référence avec redirection vers l'annonce
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    await downloadJobOfferPdf(jobOffer, uploadedAssets.logo || settings.logo_url);
                    triggerCopied('Offre d’emploi PDF téléchargée !');
                  }}
                  className="px-3.5 py-2 text-xs font-bold bg-[#0B2545] text-white rounded-xl hover:bg-[#134074] transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-[#D4A017]" />
                  <span>Télécharger Offre PDF</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    await publishJobOffer(jobOffer);
                    triggerCopied('Offre d’emploi publiée en direct sur la page « Nos Offres » !');
                  }}
                  className="px-3.5 py-2 text-xs font-bold bg-[#0066B3] text-white rounded-xl hover:bg-[#00508f] transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Globe className="w-3.5 h-3.5 text-[#D4A017]" />
                  <span>Publier sur le site public</span>
                </button>
              </div>
            </div>

            <div className="bg-slate-50 border rounded-2xl p-5 text-xs space-y-3 leading-relaxed text-gray-700">
              <h3 className="font-bold text-base text-[#0066B3]">{jobOffer.titrePoste}</h3>
              <p><strong>Département :</strong> {jobOffer.departement}</p>
              <p><strong>Rémunération horaire :</strong> {jobOffer.salaireMin.toFixed(2)} $ à {jobOffer.salaireMax.toFixed(2)} $ CAD / h</p>
              <p><strong>Description de la mission :</strong> {jobOffer.missionPrincipale}</p>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 4. SOUS-MODULE : 5 MODÈLES DE DESIGN AU CHOIX */}
        {/* ========================================================================= */}
        {activeSubTab === 'models5' && (
          <div className="space-y-6">
            <div className="bg-purple-50 border border-purple-200 p-5 rounded-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-5 h-5 text-purple-700" />
                  <div>
                    <h4 className="font-bold text-purple-950 text-sm">
                      5 Modèles de Design Visuel au Choix (Générés à partir de votre Contrat CRIC personnalisé)
                    </h4>
                    <p className="text-xs text-purple-800 mt-0.5">
                      Les 5 modèles ci-dessous reprennent exactement les données saisies sur votre Contrat de Prestation ({cricModelChoice === 'model1' ? 'Modèle 1 Attestation' : 'Modèle 2 Intégral'}) et exploitent fidèlement vos logos, signatures et cachets importés sans régénération IA.
                    </p>
                  </div>
                </div>

                <span className="text-xs font-bold px-3 py-1 rounded-full bg-purple-200 text-purple-900">
                  Modèle actif : {selected5ModelIdx + 1} / 5
                </span>
              </div>
            </div>

            {/* Cartes de sélection des 5 designs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {FIVE_DESIGN_MODELS.map((mod, idx) => {
                const isSelected = selected5ModelIdx === idx;
                return (
                  <div
                    key={mod.id}
                    onClick={() => {
                      setSelected5ModelIdx(idx);
                      triggerCopied(`Design appliqué : ${mod.titre}`);
                    }}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between relative ${
                      isSelected
                        ? 'border-[#0066B3] bg-blue-50/70 shadow-md ring-2 ring-blue-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 block w-fit mb-2">
                        {mod.badge}
                      </span>
                      <h5 className="font-bold text-xs text-slate-900">{mod.titre}</h5>
                      <p className="text-[11px] text-slate-600 mt-1 line-clamp-3">{mod.description}</p>
                    </div>

                    <div className="mt-3 pt-2 border-t flex items-center justify-between text-[11px] font-bold">
                      <span style={{ color: mod.primaryColor }}>Activer</span>
                      {isSelected && <Check className="w-4 h-4 text-[#0066B3]" />}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Canevas interactif du design sélectionné */}
            <InteractiveDocumentCanvas
              title={`Aperçu en direct : ${FIVE_DESIGN_MODELS[selected5ModelIdx].titre}`}
              documentTypeLabel="Modèle Personnalisé CRIC"
              assetsConfig={assetsConfig}
              onChangeAssetsConfig={setAssetsConfig}
              uploadedAssetUrls={uploadedAssets}
              htmlEmailContent={generateCricContractResponsiveEmailHtml(cricVars, cricModelChoice, selected5ModelIdx)}
              onDownloadPdf={async () => {
                if (cricModelChoice === 'model1') {
                  const { doc, filename } = await generateModel1AttestationPdf(cricVars);
                  doc.save(filename);
                } else {
                  const { doc, filename } = await generateModel2ContratPdf(cricVars);
                  doc.save(filename);
                }
                triggerCopied('PDF téléchargé avec succès !');
              }}
              onDownloadWord={() => {
                const title = FIVE_DESIGN_MODELS[selected5ModelIdx].titre;
                const text = cricModelChoice === 'model1' ? generateModel1PlainText(cricVars) : generateModel2PlainText(cricVars);
                downloadWordDocument(`Modele_${selected5ModelIdx + 1}_${cricVars.referenceEimtOuSuivi}`, title, `<pre style="white-space: pre-wrap; font-family: Segoe UI, Arial;">${text}</pre>`);
                triggerCopied('Word (.docx) téléchargé !');
              }}
              onOpenInWebmail={handleTransferToWebmail}
            >
              <div
                style={{
                  fontFamily: FIVE_DESIGN_MODELS[selected5ModelIdx].fontStyle
                }}
                className="space-y-6"
              >
                <div className="border-b-2 pb-4 flex items-center justify-between" style={{ borderColor: FIVE_DESIGN_MODELS[selected5ModelIdx].accentColor }}>
                  {uploadedAssets.logo ? (
                    <img src={uploadedAssets.logo} alt="Logo" className="max-h-12 max-w-[190px] object-contain" />
                  ) : (
                    <BrandLogo companyName={settings.company_name} size="header" />
                  )}
                  <div className="text-right text-xs">
                    <span className="font-bold uppercase block" style={{ color: FIVE_DESIGN_MODELS[selected5ModelIdx].primaryColor }}>
                      {FIVE_DESIGN_MODELS[selected5ModelIdx].titre}
                    </span>
                    <span className="font-mono text-slate-500">Réf : {cricVars.referenceEimtOuSuivi}</span>
                  </div>
                </div>

                <div
                  contentEditable
                  suppressContentEditableWarning
                  className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap outline-none hover:bg-amber-50/40 p-2 rounded-lg cursor-text transition-colors"
                >
                  {cricModelChoice === 'model1' ? generateModel1PlainText(cricVars) : generateModel2PlainText(cricVars)}
                </div>

                {/* Signatures doubles */}
                <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-200">
                  <div className="p-3 rounded-xl border border-slate-200 bg-white">
                    <span className="text-xs font-bold block" style={{ color: FIVE_DESIGN_MODELS[selected5ModelIdx].primaryColor }}>
                      Pour l'Employeur :
                    </span>
                    <span className="text-xs text-slate-700 block">{cricVars.signataireNomEmployeur}</span>
                    <div className="mt-2 flex items-center gap-2">
                      {uploadedAssets.cachet && (
                        <img src={uploadedAssets.cachet} alt="Cachet" className="w-14 h-14 object-contain" />
                      )}
                      {uploadedAssets.signature && (
                        <img src={uploadedAssets.signature} alt="Signature" className="h-9 object-contain" />
                      )}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-200 bg-white">
                    <span className="text-xs font-bold block" style={{ color: FIVE_DESIGN_MODELS[selected5ModelIdx].primaryColor }}>
                      Pour le Prestataire :
                    </span>
                    <span className="text-xs text-slate-700 block">{cricVars.representantPrestataireNom}</span>
                    <div className="mt-2 flex items-center gap-2">
                      {uploadedAssets.cachet && (
                        <img src={uploadedAssets.cachet} alt="Cachet" className="w-14 h-14 object-contain" />
                      )}
                      {uploadedAssets.signature && (
                        <img src={uploadedAssets.signature} alt="Signature" className="h-9 object-contain" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </InteractiveDocumentCanvas>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 5. SOUS-MODULE : BUNDLE ASSEMBLÉ (4 PAGES) */}
        {/* ========================================================================= */}
        {activeSubTab === 'bundle' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-[#0B2545] to-[#134074] text-white p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md">
              <div>
                <h4 className="font-bold text-lg text-[#D4A017]">
                  Bundle Complet Assemblé (4 Pages avec Couverture de Livre PDF)
                </h4>
                <p className="text-xs text-gray-200 mt-1 max-w-xl">
                  Page 1 : Couverture de livre d'entreprise avec logo haute fidélité · Page 2 : Offre d'emploi avec stacked barcode · Page 3 : Attestation officielle de mandat · Page 4 : Ticket d'entretien sécurisé.
                </p>
              </div>

              <button
                type="button"
                onClick={handleDownloadAssembledBundlePdf}
                disabled={downloadingPdf}
                className="px-5 py-3 text-xs sm:text-sm font-bold bg-[#D4A017] hover:bg-[#b88b14] text-gray-950 rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95 whitespace-nowrap"
              >
                {downloadingPdf ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 text-gray-950" />
                )}
                <span>{downloadingPdf ? 'Assemblage en cours...' : 'Télécharger le Bundle PDF (4 Pages)'}</span>
              </button>
            </div>

            {/* Schéma visuel des 4 pages */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="bg-slate-900 text-white p-4 rounded-xl border border-slate-700 shadow-xs">
                <span className="text-[10px] text-amber-400 font-bold block mb-1">PAGE 1</span>
                <span className="text-xs font-bold">Couverture de Livre PDF</span>
                <p className="text-[10px] text-slate-400 mt-1">Design corporate &amp; Logo</p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
                <span className="text-[10px] text-blue-600 font-bold block mb-1">PAGE 2</span>
                <span className="text-xs font-bold text-gray-800">Offre &amp; Barcode</span>
                <p className="text-[10px] text-gray-500 mt-1">Redirection scan vers le site</p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
                <span className="text-[10px] text-blue-600 font-bold block mb-1">PAGE 3</span>
                <span className="text-xs font-bold text-gray-800">Attestation de Mandat</span>
                <p className="text-[10px] text-gray-500 mt-1">Modèle 1 agréé CNESST</p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
                <span className="text-[10px] text-blue-600 font-bold block mb-1">PAGE 4</span>
                <span className="text-xs font-bold text-gray-800">Ticket d'Entretien</span>
                <p className="text-[10px] text-gray-500 mt-1">Coupon &amp; Barcode d'accès</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
