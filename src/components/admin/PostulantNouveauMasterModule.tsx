import React, { useState, useEffect, useRef } from 'react';
import {
  UserPlus,
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
  ChevronLeft,
  Eye,
  ChevronDown,
  Palette,
  Image as ImageIcon,
  Edit3,
  Sliders,
  RotateCcw,
  Save,
  Maximize2,
  Clock,
  ArrowLeft,
  CheckCircle2,
  FileSpreadsheet,
  BookOpen,
  Trash2,
  AlertTriangle,
  FolderOpen
} from 'lucide-react';
import { SiteSettings, Employee } from '../../types';
import {
  PostulantInfo,
  RecrutementCasType,
  buildDefaultPostulantInfo,
  savePostulantRecord,
  fetchAllPostulants,
  deletePostulantRecord,
  publishPostulantToEntretien,
  generatePostulantEmailTemplate,
  generatePostulantKitPdf
} from '../../services/postulantDossierService';
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
  generateSmallStackedBarcodeCanvasDataUrl
} from '../../services/contractGenerationService';
import {
  JobOfferData,
  buildDefaultJobOfferForPoste,
  generateJobOfferPdf,
  downloadJobOfferPdf,
  publishJobOffer,
  generateRandomReference,
  formatIsoToFrenchDate,
  CANADIAN_STANDARD_BENEFITS
} from '../../services/jobOfferService';
import {
  generateAssembledBookBundlePdf,
  BundleAssemblyData
} from '../../services/bundleAssemblyService';
import {
  PromesseEmbaucheData,
  downloadPromesseEmbauchePdf,
  generatePromesseEmbauchePdfBlobUrl
} from '../../services/promesseEmbauchePdfGenerator';
import {
  downloadEmployeeContractPdf,
  generateEmployeeContractPdfDataUri
} from '../../services/contractPdfGenerator';
import {
  CANDIDATE_TICKET_STAMP_PRESETS,
  generateStampPngDataUrl
} from '../../services/stampGeneratorService';
import { PanneauReglagesFichiersImportes } from '../common/PanneauReglagesFichiersImportes';
import { InteractiveDocumentCanvas } from '../common/InteractiveDocumentCanvas';
import { ForcusWordEditor } from './ForcusWordEditor';
import { OfficialStampGeneratorModal } from './OfficialStampGeneratorModal';
import { BrandLogo } from '../BrandLogo';
import {
  getSavedPdfAssetsConfig,
  normalizePdfAssetsConfig,
  PdfImportedAssetsConfig
} from '../../services/departmentsAndEmailService';
import { PosteInputWithAnalyze } from '../common/PosteInputWithAnalyze';

interface PostulantNouveauMasterModuleProps {
  settings: SiteSettings;
  onOpenInWebmail?: (html: string) => void;
  onEmployeeCreated?: (emp: Employee) => void;
  onBack?: () => void;
}

export const PostulantNouveauMasterModule: React.FC<PostulantNouveauMasterModuleProps> = ({
  settings,
  onOpenInWebmail,
  onEmployeeCreated,
  onBack
}) => {
  // Postulant actif en cours d'édition
  const [postulant, setPostulant] = useState<PostulantInfo>(() =>
    buildDefaultPostulantInfo(settings, 'direct')
  );

  // Liste des postulants enregistrés dans la base de données
  const [savedPostulants, setSavedPostulants] = useState<PostulantInfo[]>([]);
  const [isSavedPostulantsLoading, setIsSavedPostulantsLoading] = useState(false);

  // Méthode de travail : 'automatique' (1 Clic) ou 'manuel' (Pas à pas)
  const [executionMode, setExecutionMode] = useState<'automatique' | 'manuel'>('automatique');

  // Sous-onglet en mode manuel
  const [activeManualTab, setActiveManualTab] = useState<
    'dossier_kit' | 'contrat' | 'promesse' | 'ticket' | 'offre' | 'models5' | 'bundle' | 'forcus'
  >('dossier_kit');

  // Choix du modèle CRIC (1: Attestation, 2: Contrat Intégral)
  const [cricModelChoice, setCricModelChoice] = useState<'model1' | 'model2'>('model1');

  // Texte personnalisé édité sur l'aperçu visuel (pour reflet exact sur le PDF)
  const [customVisualText, setCustomVisualText] = useState<Record<string, string>>({});

  // Fichiers importés personnalisés
  const [uploadedAssets, setUploadedAssets] = useState<{
    logo?: string;
    logoAgence?: string;
    logoPrestataire?: string;
    signature?: string;
    signaturePrestataire?: string;
    cachet?: string;
    cachetPrestataire?: string;
    filigrane?: string;
    photoCandidat?: string;
    arrierePlan?: string;
  }>({
    logo: settings.logo_url
  });

  // Configuration avancée des positions/dimensions/couleurs des fichiers importés (Sauvegarde Firestore)
  const [assetsConfig, setAssetsConfig] = useState<PdfImportedAssetsConfig>(() =>
    normalizePdfAssetsConfig(getSavedPdfAssetsConfig())
  );

  const handleUploadAsset = (key: string, url: string) => {
    setUploadedAssets((prev) => ({ ...prev, [key]: url }));
    if (key === 'logoPrestataire') {
      setCricVars((prev) => ({ ...prev, logoPrestataireUrl: url }));
    } else if (key === 'signaturePrestataire') {
      setCricVars((prev) => ({ ...prev, signaturePrestataireUrl: url }));
    } else if (key === 'cachetPrestataire') {
      setCricVars((prev) => ({ ...prev, cachetPrestataireUrl: url }));
    } else if (key === 'logo') {
      setPostulant((prev) => ({ ...prev, logoUrl: url }));
    }
  };

  const handlePrestataireFileUpload = (
    key: 'logoPrestataire' | 'signaturePrestataire' | 'cachetPrestataire',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      handleUploadAsset(key, result);
      triggerToast('Fichier du prestataire importé avec succès !');
    };
    reader.readAsDataURL(file);
  };

  const handleSelectPrestatairePreset = (presetId: string) => {
    const updated = applyPrestatairePreset(cricVars, presetId);
    setCricVars(updated);
    if (updated.logoPrestataireUrl) {
      setUploadedAssets((prev) => ({ ...prev, logoPrestataire: updated.logoPrestataireUrl }));
    }
    if (updated.signaturePrestataireUrl) {
      setUploadedAssets((prev) => ({ ...prev, signaturePrestataire: updated.signaturePrestataireUrl }));
    }
    if (updated.cachetPrestataireUrl) {
      setUploadedAssets((prev) => ({ ...prev, cachetPrestataire: updated.cachetPrestataireUrl }));
    }
    triggerToast('Prestataire sélectionné et paramètres légaux mis à jour');
  };

  const handlePosteAnalyzed = (res: any) => {
    setCricVars((prev) => ({
      ...prev,
      intitulePoste: res.titrePoste || prev.intitulePoste,
      codeCnp: res.codeCnp || prev.codeCnp
    }));
    setPostulant((prev) => ({
      ...prev,
      intitulePoste: res.titrePoste || prev.intitulePoste,
      codeCnp: res.codeCnp || prev.codeCnp,
      departement: res.departement || prev.departement,
      salaireHoraire: res.salaireHoraireMoyen || prev.salaireHoraire,
      salaireMensuel: res.salaireMensuelMoyen || prev.salaireMensuel
    }));
    triggerToast(`Métier analysé : Code CNP ${res.codeCnp} - Département ${res.departement}`);
  };

  // Modale générateur de tampon
  const [isStampModalOpen, setIsStampModalOpen] = useState(false);

  // Défilement fluide de la barre d'onglets de documents
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabsContainerRef.current) {
      tabsContainerRef.current.scrollBy({
        left: direction === 'left' ? -250 : 250,
        behavior: 'smooth'
      });
    }
  };

  // Notification Toast
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);
  const [isAutoExecuting, setIsAutoExecuting] = useState(false);
  const [isPublishingEntretien, setIsPublishingEntretien] = useState(false);

  // Variables Contrat CRIC & Offre & Ticket synchronisées
  const [cricVars, setCricVars] = useState<CricContractVariables>(() =>
    buildDefaultCricContractVariables(settings)
  );

  const [ticketData, setTicketData] = useState<TicketEntretienData>(() =>
    buildDefaultTicketEntretien(postulant.nomComplet, postulant.intitulePoste, settings, postulant.codeCnp)
  );

  const [jobOffer, setJobOffer] = useState<JobOfferData>(() =>
    buildDefaultJobOfferForPoste(postulant.intitulePoste, postulant.departement, settings)
  );

  // Options personnalisées de la couverture de livre (Bundle)
  const [bundleCoverOptions, setBundleCoverOptions] = useState({
    titreLivre: 'DOSSIER OFFICIEL DE MOBILITÉ & RECRUTEMENT INTERNATIONAL',
    sousTitre: 'PROCÉDURE D’IMMIGRATION PROFESSIONNELLE & VALIDATION EIMT / PROVINCE DE COLOMBIE-BRITANNIQUE',
    couleurOr: '#D4A017',
    annee: '2026'
  });

  const triggerToast = (msg: string) => {
    setCopiedNotification(msg);
    setTimeout(() => setCopiedNotification(null), 4000);
  };

  // Chargement initial des postulants
  useEffect(() => {
    loadPostulants();
  }, []);

  const loadPostulants = async () => {
    setIsSavedPostulantsLoading(true);
    try {
      const list = await fetchAllPostulants();
      setSavedPostulants(list);
    } finally {
      setIsSavedPostulantsLoading(false);
    }
  };

  // Synchronisation des sous-documents quand l'identité ou le poste change
  useEffect(() => {
    setCricVars((prev) => ({
      ...prev,
      nomEntrepriseCanada: postulant.nomEntreprise,
      adresseEntrepriseCanada: postulant.adresseEntreprise,
      representantNomEmployeur: postulant.representantEmployeurNom,
      representantTitreEmployeur: postulant.representantEmployeurTitre,
      nomPrestataireFrance: postulant.nomAgence,
      adressePrestataireFrance: postulant.adresseAgence,
      representantPrestataireNom: postulant.representantAgenceNom,
      representantPrestataireTitre: postulant.representantAgenceTitre,
      permisCnesst: postulant.permisCnesst,
      numeroMembreCcic: postulant.numeroCcic,
      intitulePoste: postulant.intitulePoste,
      codeCnp: postulant.codeCnp,
      referenceEimtOuSuivi: postulant.codeIdCandidature
    }));

    setTicketData((prev) => ({
      ...prev,
      candidatNom: postulant.nomComplet,
      candidatEmail: postulant.email,
      candidatTelephone: postulant.telephone,
      candidatNationalite: postulant.nationalite,
      posteConcerne: postulant.intitulePoste,
      departement: postulant.departement,
      codeCnp: postulant.codeCnp,
      dateEntretien: postulant.dateEntretien,
      heureEntretien: postulant.heureEntretien,
      typeEntretien: postulant.modaliteEntretien as any,
      codeIdCandidature: postulant.codeIdCandidature,
      tamponDataUrl: postulant.cachetUrl,
      lieuOuLien: postulant.lieuEntretien
    }));

    setJobOffer((prev) => ({
      ...prev,
      titrePoste: postulant.intitulePoste,
      departement: postulant.departement,
      salaireMin: postulant.salaireHoraire,
      salaireMax: Math.round(postulant.salaireHoraire * 1.2 * 10) / 10,
      reference: `OFF-${postulant.codeIdCandidature}`
    }));
  }, [postulant]);

  // Sauvegarde manuelle ou automatique du postulant
  const handleSavePostulant = async (infoToSave = postulant) => {
    try {
      const saved = await savePostulantRecord(infoToSave);
      setPostulant(saved);
      await loadPostulants();
      triggerToast(`Dossier de ${saved.nomComplet} sauvegardé avec succès dans la base !`);
    } catch {
      triggerToast('Erreur lors de la sauvegarde');
    }
  };

  // Suppression d'un postulant
  const handleDeletePostulant = async (id: string, name: string) => {
    if (!window.confirm(`Confirmez-vous la suppression du dossier de ${name} ?`)) return;
    await deletePostulantRecord(id);
    await loadPostulants();
    triggerToast(`Dossier de ${name} supprimé`);
  };

  // Sélection d'un postulant enregistré pour reprise de travail
  const handleSelectSavedPostulant = (p: PostulantInfo) => {
    setPostulant(p);
    if (p.photoUrl) setUploadedAssets((prev) => ({ ...prev, photoCandidat: p.photoUrl }));
    triggerToast(`Dossier de ${p.nomComplet} chargé`);
  };

  // Exécution Automatique Complète (1 Clic)
  const handleRunAutomaticFullGeneration = async () => {
    setIsAutoExecuting(true);
    try {
      // 1. Sauvegarde en base
      const updated = {
        ...postulant,
        statutDossier: 'valide' as const,
        ticketValide: true,
        updatedAt: new Date().toISOString()
      };
      await savePostulantRecord(updated);
      setPostulant(updated);

      // 2. Publication vers session entretien
      await publishPostulantToEntretien(updated, settings);

      // 3. Inscription comme salarié dans l'entreprise si demandé
      if (onEmployeeCreated) {
        const newEmp: Employee = {
          id: Date.now(),
          matricule: updated.matricule || `EMP-${Date.now()}`,
          civilite: updated.civilite,
          nom_complet: updated.nomComplet,
          prenom: updated.prenom,
          nom: updated.nom,
          email: updated.email,
          telephone: updated.telephone,
          adresse: updated.adresse,
          date_naissance: updated.dateNaissance || '1990-01-01',
          nationalite: updated.nationalite,
          poste: updated.intitulePoste,
          departement: updated.departement,
          type_contrat: updated.typeContrat,
          date_effet: updated.dateEffet,
          date_embauche: updated.dateEffet,
          duree_periode_essai: updated.dureePeriodeEssai,
          lieu_travail: updated.adresseEntreprise,
          horaires: '37.5h / semaine (Temps plein)',
          salaire: updated.salaireMensuel,
          salaire_horaire: updated.salaireHoraire,
          devise: 'CAD',
          hebergement_fourni: false,
          photo: updated.photoUrl || '',
          photo_url: updated.photoUrl || '',
          contrat_pdf_url: '',
          has_custom_pdf: false,
          must_change_password: true,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        onEmployeeCreated(newEmp);
      }

      await loadPostulants();
      triggerToast('⚡ Génération Automatique terminée ! Tous les documents sont prêts et enregistrés.');
    } catch (err) {
      console.error(err);
      triggerToast('Erreur lors de la génération automatique');
    } finally {
      setIsAutoExecuting(false);
    }
  };

  // Action Publier sur Entretien d'Embauche
  const handlePublishToEntretien = async () => {
    setIsPublishingEntretien(true);
    try {
      await publishPostulantToEntretien(postulant, settings);
      triggerToast(
        `Session publiée avec succès vers « Entretien d'Embauche » ! Code d'accès : ${postulant.codeIdCandidature}`
      );
    } catch {
      triggerToast('Erreur lors de la publication vers Entretien');
    } finally {
      setIsPublishingEntretien(false);
    }
  };

  // Téléchargement du Kit Candidat complet
  const handleDownloadKitPdf = async () => {
    try {
      const { doc, filename } = await generatePostulantKitPdf(
        postulant,
        settings,
        customVisualText['kit']
      );
      doc.save(filename);
      triggerToast('Kit Candidat officiel téléchargé avec succès !');
    } catch (err) {
      console.error(err);
      triggerToast('Erreur téléchargement Kit PDF');
    }
  };

  // Téléchargement du Bundle Assemblé 4 Pages avec Couverture personnalisée
  const handleDownloadBundlePdf = async () => {
    try {
      const bundleData: BundleAssemblyData = {
        titreDossier: bundleCoverOptions.titreLivre,
        nomCandidat: postulant.nomComplet,
        titrePoste: postulant.intitulePoste,
        codeCnp: postulant.codeCnp,
        referenceDossier: postulant.codeIdCandidature,
        dateEtablissement: postulant.dateEffet,
        jobOffer,
        cricVariables: cricVars,
        ticketData,
        logoUrl: uploadedAssets.logo || settings.logo_url,
        companyName: postulant.nomEntreprise
      };

      const { doc, filename } = await generateAssembledBookBundlePdf(bundleData, settings);
      doc.save(filename);
      triggerToast('Bundle assemblé (4 Pages avec Couverture Livre) téléchargé !');
    } catch (err) {
      console.error(err);
      triggerToast('Erreur bundle assemblé');
    }
  };

  const emailModel = generatePostulantEmailTemplate(postulant, settings);

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden font-sans select-none">
      {/* 1. EN-TÊTE PRINCIPAL DE LA SECTION POSTULANT NOUVEAU */}
      <div className="bg-gradient-to-r from-[#0B2545] via-[#134074] to-[#0066B3] text-white p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer mr-1"
                title="Retour à la section précédente"
              >
                <ArrowLeft className="w-4 h-4 text-amber-300" />
              </button>
            )}
            <div className="p-2 rounded-xl bg-amber-400/20 border border-amber-300/30">
              <UserPlus className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight uppercase">
                  POSTULANT NOUVEAU
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-400 text-slate-950">
                  Centre Unifié
                </span>
              </div>
              <p className="text-xs sm:text-sm text-blue-100 mt-0.5">
                Gestion complète du candidat · Recrutement Direct ou Agence Mandataire · 100% Gratuit
              </p>
            </div>
          </div>
        </div>

        {/* Boutons d'actions maîtres */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleRunAutomaticFullGeneration}
            disabled={isAutoExecuting}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-md cursor-pointer transition-all active:scale-95 disabled:opacity-50"
            title="Exécute automatiquement l'ensemble des tâches, génère les documents et sauvegarde en base"
          >
            {isAutoExecuting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>Génération Automatique (1 Clic)</span>
          </button>

          <button
            type="button"
            onClick={handlePublishToEntretien}
            disabled={isPublishingEntretien}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md cursor-pointer transition-all active:scale-95 disabled:opacity-50"
            title="Publier vers la page Entretien d'Embauche en mode lecture pour le candidat et le recruteur"
          >
            <Globe className="w-4 h-4 text-emerald-200" />
            <span>{isPublishingEntretien ? 'Publication...' : 'Publier sur Entretien d’Embauche'}</span>
          </button>
        </div>
      </div>

      {/* Barre de Toast */}
      {copiedNotification && (
        <div className="bg-emerald-600 text-white text-xs px-6 py-2.5 flex items-center justify-between font-bold animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
            <span>{copiedNotification}</span>
          </div>
          <span className="text-[10px] underline cursor-pointer" onClick={() => setCopiedNotification(null)}>
            Fermer
          </span>
        </div>
      )}

      <div className="p-6 space-y-6">
        {/* ========================================================================= */}
        {/* A. PANNEAU RÉGLAGES FICHIERS IMPORTÉS — CONTRAT DE PRESTATION CRIC        */}
        {/* ========================================================================= */}
        <PanneauReglagesFichiersImportes
          assetsConfig={assetsConfig}
          onChangeConfig={setAssetsConfig}
          onUploadAsset={handleUploadAsset}
          uploadedAssetUrls={uploadedAssets}
          title="Panneau Réglages Fichiers Importés — Contrat de Prestation CRIC"
        />

        {/* ========================================================================= */}
        {/* B. CHOIX DU MODÈLE LÉGAL CRIC ET BOUTONS D'EXPORT DÉDIÉS                   */}
        {/* ========================================================================= */}
        <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-blue-900 uppercase tracking-wide">
                CHOIX DU MODÈLE LÉGAL CRIC :
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

          {/* Boutons d'export dédiés : PDF, Word (.docx) et Webmail */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={async () => {
                if (cricModelChoice === 'model1') {
                  const { doc, filename } = await generateModel1AttestationPdf(cricVars, customVisualText['contrat']);
                  doc.save(filename);
                } else {
                  const { doc, filename } = await generateModel2ContratPdf(cricVars, customVisualText['contrat']);
                  doc.save(filename);
                }
                triggerToast('Document PDF téléchargé avec succès !');
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
                  customVisualText['contrat'] ||
                  (cricModelChoice === 'model1'
                    ? generateModel1PlainText(cricVars)
                    : generateModel2PlainText(cricVars));

                downloadWordDocument(
                  `${title.replace(/\s+/g, '_')}_${cricVars.referenceEimtOuSuivi}`,
                  title,
                  `<h1>${title}</h1><pre style="white-space: pre-wrap; font-family: Segoe UI, Arial, sans-serif; font-size: 11pt; line-height: 1.6;">${content}</pre>`
                );
                triggerToast('Fichier Word (.docx) téléchargé !');
              }}
              className="px-3.5 py-2 text-xs font-bold bg-blue-700 hover:bg-blue-800 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Télécharger Word (.docx)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const html = generateCricContractResponsiveEmailHtml(cricVars, cricModelChoice, 0);
                if (onOpenInWebmail) {
                  onOpenInWebmail(html);
                } else {
                  navigator.clipboard?.writeText(html);
                  triggerToast('Code HTML Mail copié dans le presse-papiers pour votre Webmail !');
                }
              }}
              className="px-3.5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Code HTML Mail Webmail</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* C. FORMULAIRE DES PARTIES (2 COLONNES)                                   */}
        {/* ========================================================================= */}
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
                  onChange={(e) => {
                    const val = e.target.value;
                    setCricVars({ ...cricVars, nomEntrepriseCanada: val });
                    setPostulant({ ...postulant, nomEntreprise: val });
                  }}
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
                  onChange={(e) => {
                    const val = e.target.value;
                    setCricVars({ ...cricVars, adresseEntrepriseCanada: val });
                    setPostulant({ ...postulant, adresseEntreprise: val });
                  }}
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
                  onChange={(e) => {
                    const val = e.target.value;
                    setCricVars({ ...cricVars, representantNomEmployeur: val });
                    setPostulant({ ...postulant, representantEmployeurNom: val });
                  }}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-medium"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Titre / Fonction</label>
                <input
                  type="text"
                  value={cricVars.representantTitreEmployeur}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCricVars({ ...cricVars, representantTitreEmployeur: val });
                    setPostulant({ ...postulant, representantEmployeurTitre: val });
                  }}
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
                  onChange={(e) => {
                    const val = e.target.value;
                    setCricVars({ ...cricVars, nomPrestataireFrance: val });
                    setPostulant({ ...postulant, nomAgence: val });
                  }}
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
                  onChange={(e) => {
                    const val = e.target.value;
                    setCricVars({ ...cricVars, permisCnesst: val });
                    setPostulant({ ...postulant, permisCnesst: val });
                  }}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-mono text-emerald-800"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">N° Membre CCIC</label>
                <input
                  type="text"
                  value={cricVars.numeroMembreCcic}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCricVars({ ...cricVars, numeroMembreCcic: val });
                    setPostulant({ ...postulant, numeroCcic: val });
                  }}
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
                  onChange={(e) => {
                    const val = e.target.value;
                    setCricVars({ ...cricVars, representantPrestataireNom: val });
                    setPostulant({ ...postulant, representantAgenceNom: val });
                  }}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-medium"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Titre</label>
                <input
                  type="text"
                  value={cricVars.representantPrestataireTitre}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCricVars({ ...cricVars, representantPrestataireTitre: val });
                    setPostulant({ ...postulant, representantAgenceTitre: val });
                  }}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                />
              </div>
            </div>

            {/* FICHIERS OFFICIELS DU PRESTATAIRE (LOGO, SIGNATURE, CACHET) */}
            <div className="pt-3 border-t border-slate-200 mt-2 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Fichiers Importés du Prestataire :</span>
                </span>
                <span className="text-[10px] text-slate-500">Logo, Signature &amp; Cachet</span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                {/* Logo Prestataire */}
                <div className="p-2.5 rounded-xl border border-slate-200 bg-white flex flex-col items-center justify-between min-h-[92px]">
                  <span className="text-[10px] font-bold text-slate-600">Logo Cabinet</span>
                  {uploadedAssets.logoPrestataire || cricVars.logoPrestataireUrl ? (
                    <div className="relative my-1 group">
                      <img
                        src={uploadedAssets.logoPrestataire || cricVars.logoPrestataireUrl}
                        alt="Logo Prestataire"
                        className="max-h-10 max-w-[80px] object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => handleUploadAsset('logoPrestataire', '')}
                        className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-4 h-4 text-[9px] flex items-center justify-center hover:bg-red-700 cursor-pointer"
                        title="Supprimer"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-400 italic my-auto">Aucun</span>
                  )}
                  <label className="w-full py-1 px-1.5 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded cursor-pointer transition-colors block">
                    <span>{uploadedAssets.logoPrestataire ? 'Changer' : '+ Importer'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handlePrestataireFileUpload('logoPrestataire', e)}
                    />
                  </label>
                </div>

                {/* Signature Prestataire */}
                <div className="p-2.5 rounded-xl border border-slate-200 bg-white flex flex-col items-center justify-between min-h-[92px]">
                  <span className="text-[10px] font-bold text-slate-600">Signature Mandataire</span>
                  {uploadedAssets.signaturePrestataire || cricVars.signaturePrestataireUrl ? (
                    <div className="relative my-1 group">
                      <img
                        src={uploadedAssets.signaturePrestataire || cricVars.signaturePrestataireUrl}
                        alt="Signature Prestataire"
                        className="max-h-10 max-w-[80px] object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => handleUploadAsset('signaturePrestataire', '')}
                        className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-4 h-4 text-[9px] flex items-center justify-center hover:bg-red-700 cursor-pointer"
                        title="Supprimer"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-400 italic my-auto">Aucune</span>
                  )}
                  <label className="w-full py-1 px-1.5 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded cursor-pointer transition-colors block">
                    <span>{uploadedAssets.signaturePrestataire ? 'Changer' : '+ Importer'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handlePrestataireFileUpload('signaturePrestataire', e)}
                    />
                  </label>
                </div>

                {/* Cachet Prestataire */}
                <div className="p-2.5 rounded-xl border border-slate-200 bg-white flex flex-col items-center justify-between min-h-[92px]">
                  <span className="text-[10px] font-bold text-slate-600">Cachet Officiel</span>
                  {uploadedAssets.cachetPrestataire || cricVars.cachetPrestataireUrl ? (
                    <div className="relative my-1 group">
                      <img
                        src={uploadedAssets.cachetPrestataire || cricVars.cachetPrestataireUrl}
                        alt="Cachet Prestataire"
                        className="max-h-10 max-w-[80px] object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => handleUploadAsset('cachetPrestataire', '')}
                        className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-4 h-4 text-[9px] flex items-center justify-center hover:bg-red-700 cursor-pointer"
                        title="Supprimer"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-400 italic my-auto">Aucun</span>
                  )}
                  <label className="w-full py-1 px-1.5 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded cursor-pointer transition-colors block">
                    <span>{uploadedAssets.cachetPrestataire ? 'Changer' : '+ Importer'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handlePrestataireFileUpload('cachetPrestataire', e)}
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* D. IDENTIFICATION DU POSTE ET DÉMARCHE D'IMMIGRATION (LIPR / EIMT)         */}
        {/* ========================================================================= */}
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
                onChange={(val) => {
                  setCricVars({ ...cricVars, intitulePoste: val });
                  setPostulant({ ...postulant, intitulePoste: val });
                }}
                onAnalyzed={handlePosteAnalyzed}
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Code CNP (5 chiffres au Canada)</label>
              <input
                type="text"
                value={cricVars.codeCnp}
                onChange={(e) => {
                  const val = e.target.value;
                  setCricVars({ ...cricVars, codeCnp: val });
                  setPostulant({ ...postulant, codeCnp: val });
                }}
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

        {/* ========================================================================= */}
        {/* E. BANDEAU CAS DE RECRUTEMENT & MÉTHODE D'EXÉCUTION                       */}
        {/* ========================================================================= */}
        <div className="bg-[#0B2545] text-white rounded-2xl px-5 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs border border-blue-900/40">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">
              CAS DE RECRUTEMENT :
            </span>
            <div className="bg-slate-900/70 p-1 rounded-xl flex gap-1 border border-white/10">
              <button
                type="button"
                onClick={() => setPostulant({ ...postulant, casType: 'direct' })}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  postulant.casType === 'direct'
                    ? 'bg-[#0066B3] text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                1. Candidature en direct (Sans intermédiaire)
              </button>
              <button
                type="button"
                onClick={() => setPostulant({ ...postulant, casType: 'agence' })}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  postulant.casType === 'agence'
                    ? 'bg-[#0066B3] text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                2. Via Agence de Placement (Prestataire CRIC)
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">
              MÉTHODE :
            </span>
            <div className="bg-slate-900/70 p-1 rounded-xl flex gap-1 border border-white/10">
              <button
                type="button"
                onClick={() => setExecutionMode('automatique')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  executionMode === 'automatique'
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Automatique (1-Clic)
              </button>
              <button
                type="button"
                onClick={() => setExecutionMode('manuel')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  executionMode === 'manuel'
                    ? 'bg-white text-[#0B2545] shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Manuelle (Pas à pas)
              </button>
            </div>
          </div>
        </div>
        {/* ========================================================================= */}
        {/* 3. FORMULAIRE DE BASE COMPLET : IDENTITÉ, POSTE, SALAIRE & PIÈCES JOINTES */}
        {/* ========================================================================= */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-3 gap-2">
            <div>
              <h3 className="font-bold text-sm text-[#0B2545] flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#0066B3]" />
                <span>Informations Fondamentales du Postulant &amp; Paramètres d'Embauche</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Ces informations alimentent automatiquement tous les documents, contrats, promesses, tickets et e-mails
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSavePostulant()}
                className="px-3.5 py-1.5 bg-[#0B2545] hover:bg-[#134074] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Save className="w-3.5 h-3.5 text-amber-400" />
                <span>Enregistrer Dossier</span>
              </button>
            </div>
          </div>

          {/* Grille des champs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {/* Nom complet */}
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Nom complet du candidat</label>
              <input
                type="text"
                value={postulant.nomComplet}
                onChange={(e) => {
                  const val = e.target.value;
                  const parts = val.trim().split(' ');
                  const prenom = parts[0] || '';
                  const nom = parts.slice(1).join(' ') || '';
                  setPostulant({ ...postulant, nomComplet: val, prenom, nom });
                }}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-bold bg-white"
              />
            </div>

            {/* Nationalité */}
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Nationalité</label>
              <input
                type="text"
                value={postulant.nationalite}
                onChange={(e) => setPostulant({ ...postulant, nationalite: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
              />
            </div>

            {/* Téléphone */}
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Téléphone</label>
              <input
                type="text"
                value={postulant.telephone}
                onChange={(e) => setPostulant({ ...postulant, telephone: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono bg-white"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Email</label>
              <input
                type="email"
                value={postulant.email}
                onChange={(e) => setPostulant({ ...postulant, email: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-medium"
              />
            </div>

            {/* Intitulé du Poste */}
            <div className="sm:col-span-2">
              <label className="block text-slate-600 font-semibold mb-1">Intitulé du poste au Canada</label>
              <input
                type="text"
                value={postulant.intitulePoste}
                onChange={(e) => setPostulant({ ...postulant, intitulePoste: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-bold bg-white"
              />
            </div>

            {/* Code CNP */}
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Code CNP (Classification Canada)</label>
              <input
                type="text"
                value={postulant.codeCnp}
                onChange={(e) => setPostulant({ ...postulant, codeCnp: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono font-bold bg-white text-emerald-800"
              />
            </div>

            {/* Code ID Candidature */}
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Code ID Candidature Unique</label>
              <div className="flex gap-1">
                <input
                  type="text"
                  value={postulant.codeIdCandidature}
                  onChange={(e) => setPostulant({ ...postulant, codeIdCandidature: e.target.value })}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded-lg font-mono font-bold bg-white text-[#0066B3]"
                />
                <button
                  type="button"
                  onClick={() => {
                    const newId = `ENT-BC-2026-${Math.floor(1000 + Math.random() * 9000)}`;
                    setPostulant({ ...postulant, codeIdCandidature: newId });
                  }}
                  className="px-2 py-1 bg-slate-200 hover:bg-slate-300 rounded text-xs font-bold"
                  title="Générer un nouveau code aléatoire"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Salaires horaire & mensuel */}
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Salaire horaire ($ CAD/h)</label>
              <input
                type="number"
                step="0.5"
                value={postulant.salaireHoraire}
                onChange={(e) => {
                  const hor = parseFloat(e.target.value) || 0;
                  const men = Math.round(hor * 162.5);
                  setPostulant({ ...postulant, salaireHoraire: hor, salaireMensuel: men });
                }}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-bold bg-white text-emerald-800"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Salaire mensuel ($ CAD/mois)</label>
              <input
                type="number"
                value={postulant.salaireMensuel}
                onChange={(e) => {
                  const men = parseFloat(e.target.value) || 0;
                  const hor = Math.round((men / 162.5) * 100) / 100;
                  setPostulant({ ...postulant, salaireMensuel: men, salaireHoraire: hor });
                }}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-bold bg-white text-emerald-800"
              />
            </div>

            {/* Date & Heure entretien */}
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Date d'entretien</label>
              <input
                type="text"
                value={postulant.dateEntretien}
                onChange={(e) => setPostulant({ ...postulant, dateEntretien: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Heure d'entretien</label>
              <input
                type="text"
                value={postulant.heureEntretien}
                onChange={(e) => setPostulant({ ...postulant, heureEntretien: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono bg-white"
              />
            </div>
          </div>

          {/* Option spécifique Agence : Garantie et extrapolation d'entretien */}
          {postulant.casType === 'agence' && (
            <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-3.5 text-xs text-blue-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="dispenseGarantie"
                  checked={postulant.dispenseEntretienParGarantie}
                  onChange={(e) => setPostulant({ ...postulant, dispenseEntretienParGarantie: e.target.checked })}
                  className="rounded text-[#0066B3] mt-0.5"
                />
                <label htmlFor="dispenseGarantie" className="cursor-pointer">
                  <span className="font-bold block">
                    Garantie de compétences du Prestataire (Dispense / Extrapolation d'entretien)
                  </span>
                  <span className="text-[11px] text-blue-800 block">
                    Cochez cette option si le cabinet mandataire se porte légalement garant des qualifications, permis et antécédents du postulant pour passer directement à l'étape contractuelle.
                  </span>
                </label>
              </div>

              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                postulant.dispenseEntretienParGarantie ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
              }`}>
                {postulant.dispenseEntretienParGarantie ? 'Garantie Activée' : 'Entretien Direct Client'}
              </span>
            </div>
          )}

          {/* Toggle de validation du ticket */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-200 text-xs">
            <div className="flex items-center gap-3">
              <span className="font-bold text-slate-700">Type de Ticket d'Entretien à émettre :</span>
              <label className="flex items-center gap-1.5 cursor-pointer font-medium">
                <input
                  type="radio"
                  name="ticketValide"
                  checked={!postulant.ticketValide}
                  onChange={() => setPostulant({ ...postulant, ticketValide: false })}
                  className="text-amber-600"
                />
                <span className="text-amber-800">1. Ticket Provisoire (Non valide / Spécimen sans code)</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer font-medium">
                <input
                  type="radio"
                  name="ticketValide"
                  checked={postulant.ticketValide}
                  onChange={() => setPostulant({ ...postulant, ticketValide: true })}
                  className="text-emerald-600"
                />
                <span className="text-emerald-800">2. Ticket Validé (Barcode actif &amp; Numérique)</span>
              </label>
            </div>

            {/* Zone photo d'identité */}
            <div className="flex items-center gap-2">
              <span className="text-slate-600 font-semibold">Photo d'identité :</span>
              {postulant.photoUrl ? (
                <div className="flex items-center gap-2">
                  <img src={postulant.photoUrl} alt="Photo" className="w-8 h-8 rounded-full object-cover border" />
                  <button
                    type="button"
                    onClick={() => setPostulant({ ...postulant, photoUrl: undefined })}
                    className="text-[10px] text-red-600 hover:underline cursor-pointer"
                  >
                    Supprimer
                  </button>
                </div>
              ) : (
                <label className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-[11px] font-bold text-slate-700 hover:bg-slate-100 cursor-pointer">
                  <span>+ Importer Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (evt) => {
                        const dataUrl = evt.target?.result as string;
                        setPostulant({ ...postulant, photoUrl: dataUrl });
                        triggerToast('Photo d’identité importée !');
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. NAVIGATION ENTRE LES DOCUMENTS & SOUS-MODULES                          */}
        {/* ========================================================================= */}
        <div className="bg-slate-100 border border-slate-200 rounded-2xl p-2 flex items-center gap-2 shadow-2xs">
          <button
            type="button"
            onClick={() => scrollTabs('left')}
            className="p-2 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs shrink-0"
            title="Défiler vers la gauche"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div
            ref={tabsContainerRef}
            className="flex gap-2 overflow-x-auto no-scrollbar scroll-smooth flex-1 py-1"
          >
            {[
              { id: 'dossier_kit', label: '1. Kit Candidat Complet (PDF & Mails)', icon: BookOpen },
              { id: 'contrat', label: '2. Contrat de Travail & CRIC', icon: ShieldCheck },
              { id: 'promesse', label: '3. Promesse d’Embauche', icon: FileCheck2 },
              { id: 'ticket', label: '4. Ticket d’Entretien (2 Versions)', icon: Ticket },
              { id: 'offre', label: '5. Offre d’Emploi & CNP', icon: Briefcase },
              { id: 'models5', label: '6. 5 Modèles de Design', icon: Sparkles },
              { id: 'bundle', label: '7. Bundle Assemblé (Couverture Livre)', icon: Layers },
              { id: 'forcus', label: '8. Éditeur FORCUS Word 2013', icon: Edit3, highlight: true }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeManualTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveManualTab(tab.id as any)}
                  className={`px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-white text-[#0B2545] border border-slate-300 shadow-xs ring-2 ring-[#0B2545]/15'
                      : tab.highlight
                      ? 'bg-blue-50 text-[#2B579A] border border-[#2B579A]/30 hover:bg-blue-100/70'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${tab.highlight ? 'text-[#2B579A]' : 'text-[#0066B3]'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => scrollTabs('right')}
            className="p-2 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs shrink-0"
            title="Défiler vers la droite"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* 5. CONTENU DES SOUS-MODULES                                              */}
        {/* ========================================================================= */}

        {/* SOUS-MODULE 1 : KIT CANDIDAT COMPLET & CLIENT MAIL RESPONSIVE */}
        {activeManualTab === 'dossier_kit' && (
          <div className="space-y-4">
            {/* CANEVAS INTERACTIF DU DOSSIER KIT CANDIDAT */}
            <InteractiveDocumentCanvas
              title={`Kit Candidat : ${postulant.nomComplet} (${postulant.intitulePoste})`}
              documentTypeLabel="Kit Candidat Officiel"
              assetsConfig={assetsConfig}
              uploadedAssetUrls={{
                logo: uploadedAssets.logo || settings.logo_url,
                signature: uploadedAssets.signature,
                cachet: uploadedAssets.cachet,
                logoPrestataire: uploadedAssets.logoPrestataire,
                signaturePrestataire: uploadedAssets.signaturePrestataire,
                cachetPrestataire: uploadedAssets.cachetPrestataire,
                filigrane: uploadedAssets.filigrane
              }}
              htmlEmailContent={emailModel.html}
              onDownloadPdf={handleDownloadKitPdf}
              onOpenInWebmail={onOpenInWebmail}
              onTextEdited={(text) => {
                setCustomVisualText((prev) => ({ ...prev, kit: text }));
                triggerToast('Modifications textuelles enregistrées pour le PDF !');
              }}
            >
              <div
                contentEditable
                suppressContentEditableWarning
                className="space-y-4 font-mono text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap outline-none p-4 hover:bg-amber-50/30 rounded-lg cursor-text"
              >
                {postulant.casType === 'direct' ? (
                  <>
                    <h2 className="text-base font-bold text-[#0B2545] border-b pb-2">
                      DOSSIER D’ACCUEIL &amp; KIT D’ENTRETIEN OFFICIEL (RECRUTEMENT EN DIRECT)
                    </h2>
                    <p><strong>CANDIDAT :</strong> {postulant.nomComplet} · Nationalité : {postulant.nationalite}</p>
                    <p><strong>POSTE CONVOQUÉ :</strong> {postulant.intitulePoste} (Code CNP {postulant.codeCnp})</p>
                    <p><strong>DATE &amp; HEURE :</strong> {postulant.dateEntretien} à {postulant.heureEntretien}</p>
                    <p><strong>ACCÈS :</strong> {postulant.modaliteEntretien} · {postulant.lieuEntretien}</p>
                    <p><strong>RÉMUNÉRATION :</strong> {postulant.salaireHoraire.toFixed(2)} $ CAD / h (~{postulant.salaireMensuel.toLocaleString('fr-CA')} $ CAD / mois)</p>
                    <p className="text-slate-600 italic">
                      Composantes du Kit Candidat : Fiche de poste détaillée · Livret d'accueil culturel · Formulaire de candidature interne · Autorisation de prise de références professionnelles.
                    </p>
                  </>
                ) : (
                  <>
                    <h2 className="text-base font-bold text-[#0066B3] border-b pb-2">
                      FICHE DE LIAISON TRIPARTITE &amp; KIT DE PRÉPARATION (AGENCE DE PLACEMENT)
                    </h2>
                    <p><strong>EMPLOYEUR :</strong> {postulant.nomEntreprise} (Surrey, Colombie-Britannique)</p>
                    <p><strong>PRESTATAIRE MANDATÉ :</strong> {postulant.nomAgence} (Permis CNESST {postulant.permisCnesst})</p>
                    <p><strong>CANDIDAT :</strong> {postulant.nomComplet} · Réf. Dossier : {postulant.codeIdCandidature}</p>
                    <p><strong>STATUT D’ENTRETIEN :</strong> {postulant.dispenseEntretienParGarantie ? 'Dispense activée par garantie de compétences du Prestataire' : 'Entretien direct employeur programmé'}</p>
                    <p><strong>DATE :</strong> {postulant.dateEntretien} à {postulant.heureEntretien}</p>
                  </>
                )}
              </div>
            </InteractiveDocumentCanvas>
          </div>
        )}

        {/* SOUS-MODULE 2 : CONTRAT DE TRAVAIL & PRESTATION CRIC */}
        {activeManualTab === 'contrat' && (
          <div className="space-y-4">
            {/* CANEVAS INTERACTIF DU CONTRAT CRIC AVEC ÉDITION VISUELLE EN DIRECT */}
            <InteractiveDocumentCanvas
              title={`Contrat : ${cricModelChoice === 'model1' ? 'Attestation de Mandat de Recrutement International' : 'Contrat Intégral 8 Articles (Bilingue)'}`}
              documentTypeLabel="Contrat Légal CRIC"
              assetsConfig={assetsConfig}
              uploadedAssetUrls={{
                logo: uploadedAssets.logo || settings.logo_url,
                signature: uploadedAssets.signature,
                cachet: uploadedAssets.cachet,
                logoPrestataire: uploadedAssets.logoPrestataire,
                signaturePrestataire: uploadedAssets.signaturePrestataire,
                cachetPrestataire: uploadedAssets.cachetPrestataire,
                filigrane: uploadedAssets.filigrane
              }}
              htmlEmailContent={generateCricContractResponsiveEmailHtml(cricVars, cricModelChoice, 0)}
              onDownloadPdf={async () => {
                if (cricModelChoice === 'model1') {
                  const { doc, filename } = await generateModel1AttestationPdf(cricVars, customVisualText['contrat']);
                  doc.save(filename);
                } else {
                  const { doc, filename } = await generateModel2ContratPdf(cricVars, customVisualText['contrat']);
                  doc.save(filename);
                }
                triggerToast('Contrat PDF téléchargé avec vos modifications !');
              }}
              onDownloadWord={() => {
                const title =
                  cricModelChoice === 'model1'
                    ? 'Attestation de Mandat de Recrutement International'
                    : 'Contrat de Prestation de Services de Recrutement International';
                const content =
                  customVisualText['contrat'] ||
                  (cricModelChoice === 'model1'
                    ? generateModel1PlainText(cricVars)
                    : generateModel2PlainText(cricVars));

                downloadWordDocument(
                  `${title.replace(/\s+/g, '_')}_${cricVars.referenceEimtOuSuivi}`,
                  title,
                  `<h1>${title}</h1><pre style="white-space: pre-wrap; font-family: Segoe UI, Arial, sans-serif; font-size: 11pt; line-height: 1.6;">${content}</pre>`
                );
                triggerToast('Fichier Word (.docx) téléchargé !');
              }}
              onOpenInWebmail={onOpenInWebmail}
              onTextEdited={(text) => {
                setCustomVisualText((prev) => ({ ...prev, contrat: text }));
                triggerToast('Modifications du contrat enregistrées pour le PDF !');
              }}
            >
              <div
                contentEditable
                suppressContentEditableWarning
                className="font-mono text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap outline-none p-4 hover:bg-amber-50/30 rounded-lg cursor-text"
              >
                {customVisualText['contrat'] || (cricModelChoice === 'model1' ? generateModel1PlainText(cricVars) : generateModel2PlainText(cricVars))}
              </div>
            </InteractiveDocumentCanvas>
          </div>
        )}

        {/* SOUS-MODULE 3 : PROMESSE D'EMBAUCHE OFFICIELLE */}
        {activeManualTab === 'promesse' && (
          <div className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-amber-950 text-sm">
                  Promesse d’Embauche Officielle (Rémunération Horaire &amp; Essai)
                </h4>
                <p className="text-xs text-amber-800 mt-0.5">
                  Salaire horaire : <strong className="font-mono text-emerald-800">{postulant.salaireHoraire.toFixed(2)} $ CAD / h</strong> · Équivalent mensuel : <strong>{postulant.salaireMensuel.toLocaleString('fr-CA')} $ CAD / mois</strong>
                </p>
              </div>

              <button
                type="button"
                onClick={async () => {
                  const promesseObj: PromesseEmbaucheData = {
                    nom_complet: postulant.nomComplet,
                    date_naissance: '1992-06-14',
                    sexe: postulant.civilite === 'Madame' ? 'Féminin' : 'Masculin',
                    civilite: postulant.civilite,
                    nationalite: postulant.nationalite,
                    numero_piece_identite: postulant.numeroPieceIdentite || 'C01294857',
                    telephone: postulant.telephone,
                    email: postulant.email,
                    adresse: postulant.adresse,
                    contact_urgence: postulant.contactUrgence || '',
                    poste: postulant.intitulePoste,
                    departement: postulant.departement,
                    manager: postulant.representantEmployeurNom,
                    matricule: postulant.matricule || 'EMP-2026-POSTULANT',
                    type_contrat: postulant.typeContrat === 'CDD' ? 'Contrat à Durée Déterminée (CDD)' : 'Contrat à Durée Indéterminée (CDI)',
                    date_embauche: postulant.dateEffet,
                    date_etablissement: postulant.dateEffet,
                    salaire_horaire: postulant.salaireHoraire,
                    lieu_travail: postulant.adresseEntreprise,
                    horaire: postulant.horairesTravail || '40 heures par semaine (du lundi au vendredi, 08h00 - 17h00)',
                    ni: postulant.numeroImmatriculationEntreprise || 'BC1129970',
                    responsabilites: postulant.responsabilitesMissions || [],
                    company_contact_phone: postulant.contactDocPhone,
                    company_contact_email: postulant.contactDocEmail,
                    customVisualText: customVisualText['promesse'] || undefined
                  };
                  await downloadPromesseEmbauchePdf(promesseObj);
                  triggerToast('Promesse d’embauche PDF téléchargée avec succès !');
                }}
                className="px-4 py-2 bg-[#0B2545] hover:bg-[#134074] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Download className="w-4 h-4 text-amber-400" />
                <span>Télécharger Promesse d'Embauche PDF</span>
              </button>
            </div>

            {/* Aperçu Promesse */}
            <div className="border rounded-2xl p-6 bg-white space-y-4 text-xs sm:text-sm text-slate-800 leading-relaxed font-sans shadow-xs">
              <div className="flex items-center justify-between border-b pb-4">
                <BrandLogo companyName={postulant.nomEntreprise} customLogoUrl={uploadedAssets.logo} size="header" />
                <div className="text-right">
                  <span className="font-bold text-[#0B2545] uppercase block">PROMESSE UNILATÉRALE D'EMBAUCHE</span>
                  <span className="text-slate-500 font-mono">Date : {postulant.dateEffet}</span>
                </div>
              </div>

              <div contentEditable suppressContentEditableWarning className="outline-none space-y-3">
                <p>
                  <strong>À l'attention de :</strong> {postulant.civilite} {postulant.nomComplet}<br />
                  Demeurant au : {postulant.adresse}
                </p>
                <p>
                  {postulant.civilite === 'Madame' ? 'Chère Madame' : 'Cher Monsieur'},<br />
                  À la suite de nos différents échanges et de l'analyse attentive de vos compétences, nous avons le vif plaisir de vous confirmer notre engagement ferme à vous recruter au sein de notre entreprise <strong>{postulant.nomEntreprise}</strong> au Canada.
                </p>
                <p>
                  • <strong>Fonction :</strong> {postulant.intitulePoste} (CNP {postulant.codeCnp})<br />
                  • <strong>Département :</strong> {postulant.departement}<br />
                  • <strong>Rémunération horaire :</strong> {postulant.salaireHoraire.toFixed(2)} $ CAD brut par heure<br />
                  • <strong>Rémunération mensuelle brute :</strong> ~{postulant.salaireMensuel.toLocaleString('fr-CA')} $ CAD / mois<br />
                  • <strong>Durée de la période d'essai :</strong> {postulant.dureePeriodeEssai}<br />
                  • <strong>Lieu d'exercice des fonctions :</strong> {postulant.adresseEntreprise}
                </p>
                <p>
                  Cette promesse unilatérale d'embauche vaut engagement ferme conformément aux lois du travail de la province de Colombie-Britannique.
                </p>
              </div>

              <div className="flex items-center justify-between pt-6 border-t">
                <div>
                  <span className="font-bold text-slate-900 block">{postulant.representantEmployeurNom}</span>
                  <span className="text-slate-500 text-xs block">{postulant.representantEmployeurTitre}</span>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <span>Pour accord et acceptation du salarié :</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SOUS-MODULE 4 : TICKET D'ENTRETIEN (2 VERSIONS + PHOTO) */}
        {activeManualTab === 'ticket' && (
          <div className="space-y-6">
            <div className="bg-amber-50/80 border border-amber-200 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-amber-950 text-sm">
                  Ticket d’Entretien d’Embauche (Version Provisoire ou Validée avec Photo)
                </h4>
                <p className="text-xs text-amber-800 mt-1">
                  Statut actuel : <strong className={postulant.ticketValide ? 'text-emerald-700' : 'text-red-700'}>
                    {postulant.ticketValide ? '✓ Ticket Officiel Validé & Scannable' : '⚠️ Ticket Provisoire Non Valide'}
                  </strong>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsStampModalOpen(true)}
                  className="px-3.5 py-2 bg-white text-slate-800 border border-slate-300 rounded-xl text-xs font-bold hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span>Générateur Sceau / Tampon</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    const { doc, filename } = await generateTicketEntretienPdf(ticketData, uploadedAssets.logo || settings.logo_url);
                    doc.save(filename);
                    triggerToast('Ticket d’entretien PDF téléchargé !');
                  }}
                  className="px-4 py-2 bg-[#0B2545] hover:bg-[#134074] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Download className="w-4 h-4 text-amber-400" />
                  <span>Télécharger Ticket PDF</span>
                </button>
              </div>
            </div>

            {/* Sélecteur de tampon candidat */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wide block">
                Tampon d'attestation pour le Ticket :
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                {CANDIDATE_TICKET_STAMP_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={async () => {
                      const dataUrl = await generateStampPngDataUrl({
                        shape: p.shape,
                        inkColor: p.inkColor,
                        companyName: postulant.nomEntreprise,
                        centerMention: p.centerMention,
                        subtitle: p.subtitle,
                        emblemType: p.emblemType,
                        weatheredEffect: true
                      });
                      setPostulant((prev) => ({ ...prev, cachetUrl: dataUrl }));
                      triggerToast(`Tampon « ${p.label} » appliqué !`);
                    }}
                    className="p-2.5 rounded-xl border border-slate-200 text-left hover:border-slate-300 hover:bg-slate-50 transition-all cursor-pointer text-xs"
                  >
                    <span className="font-bold text-slate-900 block">{p.label}</span>
                    <span className="text-[10px] text-slate-500 block">{p.centerMention}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Visuel du Ticket */}
            <div className="border-2 border-dashed border-[#D4A017] rounded-2xl p-6 bg-[#FEFCF6] relative overflow-hidden shadow-xs">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b pb-4 mb-4 gap-3">
                <div className="flex items-center gap-3">
                  <BrandLogo companyName={postulant.nomEntreprise} customLogoUrl={uploadedAssets.logo} size="header" />
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm tracking-wide">COUPON CONVOCATION ENTRETIEN</h3>
                    <p className="text-[11px] text-slate-500">Direction des Ressources Humaines &amp; Mobilité</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block uppercase font-semibold">Code ID Candidature</span>
                  <span className="font-mono font-bold text-[#0066B3] text-base">{postulant.codeIdCandidature}</span>
                </div>
              </div>

              {/* Si non valide, bandeau d'avertissement */}
              {!postulant.ticketValide && (
                <div className="bg-red-50 border border-red-300 rounded-xl p-3 mb-4 text-center">
                  <span className="font-bold text-red-700 text-xs block">
                    ⚠️ TICKET D’ENTRETIEN PROVISOIRE — NON VALIDE POUR L'ACCÈS
                  </span>
                  <span className="text-[11px] text-red-600 block mt-0.5">
                    Ce coupon sera formellement activé dès la signature de l'accord tripartite et confirmation RH.
                  </span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4 text-xs">
                {postulant.photoUrl && (
                  <div className="shrink-0">
                    <img src={postulant.photoUrl} alt="Photo Candidat" className="w-24 h-32 rounded-lg object-cover border border-slate-300" />
                    <span className="text-[9px] text-slate-500 block text-center mt-1">Photo d'identité</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Candidat :</span>
                    <span className="font-bold text-slate-900 text-sm">{postulant.nomComplet}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Nationalité :</span>
                    <span className="font-bold text-slate-900">{postulant.nationalite}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Poste visé :</span>
                    <span className="font-bold text-slate-900">{postulant.intitulePoste} (CNP {postulant.codeCnp})</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Date &amp; Heure :</span>
                    <span className="font-bold text-slate-900">{postulant.dateEntretien} à {postulant.heureEntretien}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-slate-500 block text-[11px]">Lieu / Lien d'accès :</span>
                    <span className="text-slate-700">{postulant.lieuEntretien}</span>
                  </div>
                </div>
              </div>

              {/* Barcode en bas */}
              <div className="mt-6 pt-4 border-t border-dashed border-amber-300 flex items-center justify-between">
                <div>
                  {postulant.cachetUrl && (
                    <img src={postulant.cachetUrl} alt="Tampon" className="h-16 object-contain" />
                  )}
                </div>
                <div className="text-center font-mono">
                  {postulant.ticketValide ? (
                    <>
                      <span className="text-xs font-bold text-slate-900 block">||||| | |||| ||| ||||| || |||</span>
                      <span className="text-[10px] text-slate-600 block">*{postulant.codeIdCandidature}*</span>
                      <span className="text-[9px] text-emerald-700 font-bold block">✓ Barcode Scannable Actif</span>
                    </>
                  ) : (
                    <>
                      <span className="text-xs font-bold text-slate-400 line-through block">||||| | |||| ||| ||||| || |||</span>
                      <span className="text-[10px] text-red-500 block">SPÉCIMEN INACTIF</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SOUS-MODULE 5 : OFFRE D'EMPLOI & ANNONCE CNP */}
        {activeManualTab === 'offre' && (
          <div className="space-y-6">
            <div className="bg-white border p-5 rounded-2xl flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Offre d’Emploi Officielle CNP &amp; Avantages Colombie-Britannique</h4>
                <p className="text-xs text-slate-500 mt-0.5">Réf : {jobOffer.reference}</p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  await downloadJobOfferPdf(jobOffer, uploadedAssets.logo || settings.logo_url);
                  triggerToast('Offre PDF téléchargée !');
                }}
                className="px-4 py-2 bg-[#0B2545] hover:bg-[#134074] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Download className="w-4 h-4 text-amber-400" />
                <span>Télécharger Offre PDF</span>
              </button>
            </div>

            <div className="bg-slate-50 border rounded-2xl p-5 space-y-3 text-xs leading-relaxed text-slate-700">
              <h3 className="font-bold text-base text-[#0066B3]">{jobOffer.titrePoste}</h3>
              <p><strong>Rémunération horaire :</strong> {jobOffer.salaireMin.toFixed(2)} $ à {jobOffer.salaireMax.toFixed(2)} $ CAD / h</p>
              <p><strong>Équivalent mensuel :</strong> {Math.round(jobOffer.salaireMin * 162.5).toLocaleString('fr-CA')} $ à {Math.round(jobOffer.salaireMax * 162.5).toLocaleString('fr-CA')} $ CAD / mois</p>
              <div className="pt-2 border-t">
                <span className="font-bold text-slate-900 block mb-2">7 Avantages Sociaux de Colombie-Britannique :</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {CANADIAN_STANDARD_BENEFITS.map((b, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span>{b}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SOUS-MODULE 6 : 5 MODÈLES DE DESIGN */}
        {activeManualTab === 'models5' && (
          <div className="space-y-6">
            <div className="bg-purple-50 border border-purple-200 p-5 rounded-2xl">
              <h4 className="font-bold text-purple-950 text-sm">5 Modèles de Design Visuel Adaptés</h4>
              <p className="text-xs text-purple-800 mt-1">
                Les 3 premiers modèles utilisent fidèlement les logos, cachets et signatures importés. Les 2 derniers intègrent des filigranes et arrière-plans diplomatiques harmonisés.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
              {[
                { id: '1', title: '1. Exécutif & Diplomatique (Navy & Or)', desc: 'Bordure dorée et sceau centré' },
                { id: '2', title: '2. Moderne Minimaliste Azur', desc: 'Lignes épurées et badge CNESST' },
                { id: '3', title: '3. Notarié & Fiduciaire', desc: 'Armoiries et paraphes officiels' },
                { id: '4', title: '4. Fret & Logistique Transfrontalier', desc: 'Cartouche douanier et code-barres' },
                { id: '5', title: '5. Protocole Canadien Bilingue', desc: 'Sceau d’État stylisé et accord bilatéral' }
              ].map((m) => (
                <div key={m.id} className="p-3.5 bg-white border border-slate-200 rounded-xl hover:border-blue-500 hover:shadow-xs transition-all cursor-pointer">
                  <span className="font-bold text-slate-900 block">{m.title}</span>
                  <span className="text-[11px] text-slate-500 mt-1 block">{m.desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SOUS-MODULE 7 : BUNDLE ASSEMBLÉ & ÉDITION COUVERTURE LIVRE */}
        {activeManualTab === 'bundle' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-amber-400 text-sm">Bundle Complet Assemblé (4 Pages avec Couverture Livre)</h4>
                <p className="text-xs text-slate-300 mt-1">
                  Éditez les mentions de la couverture de livre avant téléchargement du recueil complet
                </p>
              </div>

              <button
                type="button"
                onClick={handleDownloadBundlePdf}
                className="px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Download className="w-4 h-4" />
                <span>Télécharger Bundle PDF (4 Pages)</span>
              </button>
            </div>

            {/* Édition directe de la couverture livre */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 text-xs">
              <h5 className="font-bold text-slate-900 uppercase tracking-wide">
                Personnalisation de la Couverture de Livre :
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Titre principal de la couverture</label>
                  <input
                    type="text"
                    value={bundleCoverOptions.titreLivre}
                    onChange={(e) => setBundleCoverOptions({ ...bundleCoverOptions, titreLivre: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-bold bg-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Sous-titre juridique / provincial</label>
                  <input
                    type="text"
                    value={bundleCoverOptions.sousTitre}
                    onChange={(e) => setBundleCoverOptions({ ...bundleCoverOptions, sousTitre: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SOUS-MODULE 8 : ÉDITEUR FORCUS WORD 2013 */}
        {activeManualTab === 'forcus' && (
          <div className="space-y-4">
            <ForcusWordEditor
              settings={settings}
              initialTitle={`Document_${postulant.nom.toUpperCase()}_${postulant.codeIdCandidature}`}
              onOpenInWebmail={onOpenInWebmail}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* 6. BASE DE DONNÉES DES POSTULANTS ENREGISTRÉS                             */}
        {/* ========================================================================= */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h4 className="font-bold text-sm text-[#0B2545] flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-[#0066B3]" />
                <span>Base de Données des Postulants Enregistrés ({savedPostulants.length})</span>
              </h4>
              <p className="text-[11px] text-slate-500">
                Chaque dossier sauvegardé conserve tous ses documents, sa promesse d'embauche et ses statuts
              </p>
            </div>
            <button
              type="button"
              onClick={loadPostulants}
              className="p-1.5 rounded-lg border hover:bg-white text-slate-700 transition-colors cursor-pointer"
              title="Rafraîchir la liste"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSavedPostulantsLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {savedPostulants.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              Aucun postulant enregistré pour le moment. Cliquez sur "Génération Automatique" ou "Enregistrer Dossier".
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {savedPostulants.map((p) => (
                <div
                  key={p.id}
                  className={`p-4 rounded-xl border bg-white transition-all flex flex-col justify-between ${
                    p.id === postulant.id ? 'border-[#0066B3] ring-2 ring-blue-500/20 shadow-xs' : 'border-slate-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-mono font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded">
                        {p.codeIdCandidature}
                      </span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        p.casType === 'direct' ? 'bg-emerald-100 text-emerald-800' : 'bg-purple-100 text-purple-800'
                      }`}>
                        {p.casType === 'direct' ? 'Direct' : 'Agence'}
                      </span>
                    </div>

                    <h5 className="font-bold text-xs text-slate-900">{p.nomComplet}</h5>
                    <p className="text-[11px] text-slate-600 line-clamp-1">{p.intitulePoste}</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {p.salaireHoraire.toFixed(2)} $ / h · {p.dateEntretien}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleSelectSavedPostulant(p)}
                      className="text-xs font-bold text-[#0066B3] hover:underline cursor-pointer"
                    >
                      Charger ce dossier
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePostulant(p.id, p.nomComplet)}
                      className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODAL DU GÉNÉRATEUR DE TAMPON & SCEAU OFFICIEL */}
      <OfficialStampGeneratorModal
        isOpen={isStampModalOpen}
        onClose={() => setIsStampModalOpen(false)}
        settings={settings}
        onApplyStamp={(dataUrl) => {
          setPostulant((prev) => ({ ...prev, cachetUrl: dataUrl }));
          setUploadedAssets((prev) => ({ ...prev, cachet: dataUrl }));
          setIsStampModalOpen(false);
          triggerToast('Tampon officiel appliqué au dossier postulant !');
        }}
      />
    </div>
  );
};
