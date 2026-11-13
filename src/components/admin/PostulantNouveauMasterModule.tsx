import React, { useState, useEffect, useRef } from 'react';
import {
  UserPlus,
  FileText,
  Briefcase,
  Ticket,
  Layers,
  Download,
  Globe,
  Building2,
  ShieldCheck,
  Send,
  Sparkles,
  RefreshCw,
  FileCheck2,
  UserCheck,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Image as ImageIcon,
  Edit3,
  Save,
  ArrowLeft,
  CheckCircle2,
  BookOpen,
  Trash2,
  FolderOpen,
  Home,
  Scale,
  ClipboardCheck,
  ScrollText,
  CheckSquare
} from 'lucide-react';
import { SiteSettings, Employee } from '../../types';
import {
  PostulantInfo,
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
  generateTicketEntretienPdf
} from '../../services/contractGenerationService';
import {
  JobOfferData,
  buildDefaultJobOfferForPoste,
  downloadJobOfferPdf,
  CANADIAN_STANDARD_BENEFITS
} from '../../services/jobOfferService';
import {
  generateAssembledBookBundlePdf,
  BundleAssemblyData
} from '../../services/bundleAssemblyService';
import {
  PromesseEmbaucheData,
  downloadPromesseEmbauchePdf
} from '../../services/promesseEmbauchePdfGenerator';
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
  loadPdfAssetsConfigFromFirestore,
  normalizePdfAssetsConfig,
  PdfImportedAssetsConfig,
  UploadedAssetUrlsMap,
  getSavedActorUploadedAssets,
  setSavedActorUploadedAssets
} from '../../services/departmentsAndEmailService';
import { PosteInputWithAnalyze } from '../common/PosteInputWithAnalyze';
import { PosteCatalogItem } from '../../services/posteCatalogService';
import { FichesEtDocEsModule } from './FichesEtDocEsModule';
import {
  FichesDocEsData,
  buildDefaultFichesDocEsData,
  saveFichesDocEsData,
  loadFichesDocEsData
} from '../../services/fichesEtDocEsService';
import {
  HousingAndNotaryData,
  HousingTabNumber,
  buildDefaultHousingAndNotaryData,
  generateOnglet9PlainText,
  generateOnglet10PlainText,
  generateOnglet11PlainText,
  generateOnglet12PlainText,
  generateHousingTabEmailHtml,
  generateHousingTabPdf,
  downloadHousingTabWordDocx,
  getTabActorAssets,
  getTabDocumentTitle
} from '../../services/housingDocsService';

interface PostulantNouveauMasterModuleProps {
  settings: SiteSettings;
  onOpenInWebmail?: (html: string) => void;
  onEmployeeCreated?: (emp: Employee) => void;
  onBack?: () => void;
}

type ManualTabId =
  | 'dossier_kit'
  | 'contrat'
  | 'promesse'
  | 'ticket'
  | 'offre'
  | 'models5'
  | 'bundle'
  | 'forcus'
  | 'heb_attestation'
  | 'heb_notaire'
  | 'heb_hir'
  | 'heb_declaration'
  | 'doc_es';

interface AutoActionQueue {
  saveDossier: boolean;
  syncDocEs: boolean;
  publishEntretien: boolean;
  createEmployee: boolean;
  downloadKitPdf: boolean;
  downloadContratPdf: boolean;
  downloadPromessePdf: boolean;
  downloadTicketPdf: boolean;
  downloadOffrePdf: boolean;
  downloadBundlePdf: boolean;
  downloadTab9Pdf: boolean;
  downloadTab10Pdf: boolean;
  downloadTab11Pdf: boolean;
  downloadTab12Pdf: boolean;
}

function wrapBasicEmailHtml(title: string, companyName: string, logoUrl: string | undefined, innerHtml: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 20px 0; background-color: #f1f5f9; font-family: Arial, Helvetica, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width: 600px; max-width: 100%; background-color: #ffffff; border: 1px solid #cbd5e1; border-collapse: collapse;">
          <tr>
            <td style="background-color: #0B2545; color: #ffffff; padding: 18px 24px;">
              ${logoUrl ? `<img src="${logoUrl}" alt="${companyName}" style="max-height: 44px; background: #ffffff; padding: 4px; border-radius: 4px; margin-bottom: 8px; display: block;" />` : ''}
              <h2 style="margin: 0; font-size: 16px; color: #ffffff; font-family: Arial, sans-serif;">${title}</h2>
              <p style="margin: 4px 0 0 0; font-size: 11px; color: #FDE047; font-family: Arial, sans-serif;">${companyName}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px; color: #1e293b; font-size: 13px; line-height: 1.6; font-family: Arial, sans-serif;">
              ${innerHtml}
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; padding: 14px 24px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; text-align: center;">
              Document officiel généré par ${companyName} · Province de Colombie-Britannique, Canada
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
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

  // Onglet actif du résultat (1 à 12 + 13 Fiches et DOC ES)
  const [activeManualTab, setActiveManualTab] = useState<ManualTabId>('dossier_kit');

  // Section active du formulaire unifié
  const [activeUnifiedFormSection, setActiveUnifiedFormSection] = useState<
    'candidat_poste' | 'hebergement_notaire' | 'doc_es_params'
  >('candidat_poste');

  // Sous-onglet de saisie Hébergement / Notaire / HIR / Déclaration
  const [activeHousingFormSubTab, setActiveHousingFormSubTab] = useState<'t9' | 't10' | 't11' | 't12'>('t9');

  // Sous-onglet de saisie Fiches et DOC ES
  const [activeDocEsFormTab, setActiveDocEsFormTab] = useState<'ats' | 'evaluation' | 'poste' | 'agence'>('ats');

  // Données exhaustives pour les 15 modèles du module "Fiches et DOC ES"
  const [docEsData, setDocEsData] = useState<FichesDocEsData>(() =>
    buildDefaultFichesDocEsData(postulant, settings)
  );

  // Données exhaustives pour les Onglets 9 à 12 (Hébergement, Notaire, HIR, Déclaration)
  const [housingData, setHousingData] = useState<HousingAndNotaryData>(() =>
    buildDefaultHousingAndNotaryData(postulant, settings)
  );

  // File d'actions automatiques (cases à cocher reliées au gros bouton Génération Automatique)
  const [autoQueue, setAutoQueue] = useState<AutoActionQueue>({
    saveDossier: true,
    syncDocEs: true,
    publishEntretien: true,
    createEmployee: true,
    downloadKitPdf: true,
    downloadContratPdf: true,
    downloadPromessePdf: false,
    downloadTicketPdf: false,
    downloadOffrePdf: false,
    downloadBundlePdf: false,
    downloadTab9Pdf: false,
    downloadTab10Pdf: false,
    downloadTab11Pdf: false,
    downloadTab12Pdf: false
  });

  // Choix du modèle CRIC (1: Attestation, 2: Contrat Intégral)
  const [cricModelChoice, setCricModelChoice] = useState<'model1' | 'model2'>('model1');
  // Choix parmi les 5 modèles visuels (Onglet 6)
  const [selectedDesignModelId, setSelectedDesignModelId] = useState<string>('1');

  // Texte personnalisé édité sur l'aperçu visuel
  const [customVisualText, setCustomVisualText] = useState<Record<string, string>>({});

  // Fichiers importés personnalisés (6 parties + auth tools) avec persistance locale
  const [uploadedAssets, setUploadedAssets] = useState<UploadedAssetUrlsMap>(() => {
    const saved = getSavedActorUploadedAssets();
    return {
      logo: settings.logo_url,
      ...saved
    };
  });

  // Configuration avancée des positions/dimensions/couleurs des fichiers importés (Firestore)
  const [assetsConfig, setAssetsConfig] = useState<PdfImportedAssetsConfig>(() =>
    normalizePdfAssetsConfig(getSavedPdfAssetsConfig())
  );

  useEffect(() => {
    loadPdfAssetsConfigFromFirestore().then((cfg) => {
      setAssetsConfig(normalizePdfAssetsConfig(cfg));
    });
  }, []);

  const handleUploadAsset = (key: string, url: string) => {
    setUploadedAssets((prev) => {
      const next = { ...prev, [key]: url };
      setSavedActorUploadedAssets(next);
      return next;
    });
    if (key === 'logoPrestataire') {
      setCricVars((prev) => ({ ...prev, logoPrestataireUrl: url }));
    } else if (key === 'signaturePrestataire') {
      setCricVars((prev) => ({ ...prev, signaturePrestataireUrl: url }));
    } else if (key === 'cachetPrestataire') {
      setCricVars((prev) => ({ ...prev, cachetPrestataireUrl: url }));
    } else if (key === 'logo') {
      setPostulant((prev) => ({ ...prev, logoUrl: url }));
    } else if (key === 'signature') {
      setPostulant((prev) => ({ ...prev, signatureUrl: url }));
    } else if (key === 'cachet') {
      setPostulant((prev) => ({ ...prev, cachetUrl: url }));
    } else if (key === 'filigrane') {
      setPostulant((prev) => ({ ...prev, filigraneUrl: url }));
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
      triggerToast('Fichier du prestataire importé et synchronisé !');
    };
    reader.readAsDataURL(file);
  };

  const handleSelectPrestatairePreset = (presetId: string) => {
    const updated = applyPrestatairePreset(cricVars, presetId);
    setCricVars(updated);
    if (updated.logoPrestataireUrl) handleUploadAsset('logoPrestataire', updated.logoPrestataireUrl);
    if (updated.signaturePrestataireUrl) handleUploadAsset('signaturePrestataire', updated.signaturePrestataireUrl);
    if (updated.cachetPrestataireUrl) handleUploadAsset('cachetPrestataire', updated.cachetPrestataireUrl);
    triggerToast('Prestataire sélectionné et paramètres légaux mis à jour');
  };

  const handlePosteAnalyzed = (result: { poste: PosteCatalogItem; isNewlyCreated: boolean }) => {
    const pItem = result.poste;
    setCricVars((prev) => ({
      ...prev,
      intitulePoste: pItem.titre || prev.intitulePoste,
      codeCnp: pItem.codeCnp || prev.codeCnp
    }));
    setPostulant((prev) => ({
      ...prev,
      intitulePoste: pItem.titre || prev.intitulePoste,
      codeCnp: pItem.codeCnp || prev.codeCnp,
      departement: pItem.departement || prev.departement,
      salaireHoraire: pItem.salaireHoraireDefaut || prev.salaireHoraire,
      salaireMensuel: pItem.salaireMensuelDefaut || prev.salaireMensuel,
      responsabilitesMissions: pItem.missions?.length ? pItem.missions : prev.responsabilitesMissions
    }));
    triggerToast(
      `Métier analysé${result.isNewlyCreated ? ' (nouveau poste enregistré)' : ''} : Code CNP ${pItem.codeCnp} - Département ${pItem.departement}`
    );
  };

  const [isStampModalOpen, setIsStampModalOpen] = useState(false);
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabsContainerRef.current) {
      tabsContainerRef.current.scrollBy({
        left: direction === 'left' ? -260 : 260,
        behavior: 'smooth'
      });
    }
  };

  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);
  const [isAutoExecuting, setIsAutoExecuting] = useState(false);
  const [isPublishingEntretien, setIsPublishingEntretien] = useState(false);

  const [cricVars, setCricVars] = useState<CricContractVariables>(() =>
    buildDefaultCricContractVariables(settings)
  );

  const [ticketData, setTicketData] = useState<TicketEntretienData>(() =>
    buildDefaultTicketEntretien(postulant.nomComplet, postulant.intitulePoste, settings, postulant.codeCnp)
  );

  const [jobOffer, setJobOffer] = useState<JobOfferData>(() =>
    buildDefaultJobOfferForPoste(postulant.intitulePoste, postulant.departement, settings)
  );

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

  // Synchronisation automatique des sous-documents et logos importés
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
      referenceEimtOuSuivi: postulant.codeIdCandidature,
      logoEmployeurUrl: uploadedAssets.logo || settings.logo_url,
      signatureEmployeurUrl: uploadedAssets.signature,
      cachetEmployeurUrl: uploadedAssets.cachet
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
      typeEntretien: postulant.modaliteEntretien as TicketEntretienData['typeEntretien'],
      codeIdCandidature: postulant.codeIdCandidature,
      tamponDataUrl: uploadedAssets.cachet || postulant.cachetUrl,
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
  }, [postulant, uploadedAssets.logo, uploadedAssets.signature, uploadedAssets.cachet, settings.logo_url]);

  const effectiveEmployerLogo = uploadedAssets.logo || settings.logo_url;

  const buildPromesseObj = (): PromesseEmbaucheData => ({
    nom_complet: postulant.nomComplet,
    date_naissance: postulant.dateNaissance || '1992-06-14',
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
    type_contrat:
      postulant.typeContrat === 'CDD'
        ? 'Contrat à Durée Déterminée (CDD)'
        : 'Contrat à Durée Indéterminée (CDI)',
    date_embauche: postulant.dateEffet,
    date_etablissement: postulant.dateEffet,
    salaire_horaire: postulant.salaireHoraire,
    lieu_travail: postulant.adresseEntreprise,
    horaire:
      postulant.horairesTravail || '40 heures par semaine (du lundi au vendredi, 08h00 - 17h00)',
    ni: postulant.numeroImmatriculationEntreprise || 'BC1129970',
    responsabilites: postulant.responsabilitesMissions || [],
    company_contact_phone: postulant.contactDocPhone,
    company_contact_email: postulant.contactDocEmail,
    customVisualText: customVisualText['promesse'] || undefined
  });

  const handleSavePostulant = async (infoToSave = postulant) => {
    try {
      const saved = await savePostulantRecord(infoToSave);
      setPostulant(saved);
      await loadPostulants();
      triggerToast(`Dossier de ${saved.nomComplet} sauvegardé avec succès !`);
    } catch {
      triggerToast('Erreur lors de la sauvegarde');
    }
  };

  const handleDeletePostulant = async (id: string, name: string) => {
    if (!window.confirm(`Confirmez-vous la suppression du dossier de ${name} ?`)) return;
    await deletePostulantRecord(id);
    await loadPostulants();
    triggerToast(`Dossier de ${name} supprimé`);
  };

  const handleSelectSavedPostulant = async (p: PostulantInfo) => {
    setPostulant(p);
    if (p.photoUrl) setUploadedAssets((prev) => ({ ...prev, photoCandidat: p.photoUrl }));
    const loadedDocEs = await loadFichesDocEsData(p.id, buildDefaultFichesDocEsData(p, settings));
    setDocEsData(loadedDocEs);
    triggerToast(`Dossier de ${p.nomComplet} chargé`);
  };

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
        logoUrl: effectiveEmployerLogo,
        companyName: postulant.nomEntreprise
      };
      const { doc, filename } = await generateAssembledBookBundlePdf(bundleData, settings);
      doc.save(filename);
      triggerToast('Bundle assemblé (4 Pages avec Couverture Livre) téléchargé !');
    } catch (err) {
      console.error(err);
      triggerToast('Erreur téléchargement bundle assemblé');
    }
  };

  const handleDownloadHousingTabPdf = async (tabNumber: HousingTabNumber) => {
    const keyMap: Record<HousingTabNumber, string> = {
      9: 'heb_attestation',
      10: 'heb_notaire',
      11: 'heb_hir',
      12: 'heb_declaration'
    };
    const { doc, filename } = await generateHousingTabPdf(
      tabNumber,
      housingData,
      postulant,
      assetsConfig,
      uploadedAssets,
      customVisualText[keyMap[tabNumber]]
    );
    doc.save(filename);
    triggerToast(`Onglet ${tabNumber} PDF téléchargé avec visuels exclusifs !`);
  };

  // EXÉCUTION AUTOMATIQUE COMPLÈTE (1 CLIC) pilotée par les cases à cocher
  const handleRunAutomaticFullGeneration = async () => {
    setIsAutoExecuting(true);
    const executedActions: string[] = [];
    try {
      const updated: PostulantInfo = {
        ...postulant,
        statutDossier: 'valide',
        ticketValide: true,
        updatedAt: new Date().toISOString()
      };

      if (autoQueue.saveDossier) {
        await savePostulantRecord(updated);
        setPostulant(updated);
        executedActions.push('Dossier sauvegardé');
      }

      if (autoQueue.syncDocEs) {
        await saveFichesDocEsData(updated.id, docEsData);
        executedActions.push('15 Fiches DOC ES synchronisées');
      }

      if (autoQueue.publishEntretien) {
        await publishPostulantToEntretien(updated, settings);
        executedActions.push('Session Entretien publiée');
      }

      if (autoQueue.createEmployee && onEmployeeCreated) {
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
          horaires: updated.horairesTravail || '37.5h / semaine (Temps plein)',
          salaire: updated.salaireMensuel,
          salaire_horaire: updated.salaireHoraire,
          devise: 'CAD',
          hebergement_fourni: true,
          adresse_hebergement: housingData.hebergementAdresseComplete,
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
        executedActions.push('Salarié enregistré');
      }

      if (autoQueue.downloadKitPdf) {
        const { doc, filename } = await generatePostulantKitPdf(
          updated,
          settings,
          customVisualText['dossier_kit']
        );
        doc.save(filename);
        executedActions.push('Kit PDF');
      }

      if (autoQueue.downloadContratPdf) {
        if (cricModelChoice === 'model1') {
          const { doc, filename } = await generateModel1AttestationPdf(cricVars, customVisualText['contrat']);
          doc.save(filename);
        } else {
          const { doc, filename } = await generateModel2ContratPdf(cricVars, customVisualText['contrat']);
          doc.save(filename);
        }
        executedActions.push('Contrat CRIC PDF');
      }

      if (autoQueue.downloadPromessePdf) {
        await downloadPromesseEmbauchePdf(buildPromesseObj());
        executedActions.push('Promesse PDF');
      }

      if (autoQueue.downloadTicketPdf) {
        const { doc, filename } = await generateTicketEntretienPdf(ticketData, effectiveEmployerLogo);
        doc.save(filename);
        executedActions.push('Ticket PDF');
      }

      if (autoQueue.downloadOffrePdf) {
        await downloadJobOfferPdf(jobOffer, effectiveEmployerLogo);
        executedActions.push('Offre CNP PDF');
      }

      if (autoQueue.downloadBundlePdf) {
        await handleDownloadBundlePdf();
        executedActions.push('Bundle PDF');
      }

      if (autoQueue.downloadTab9Pdf) {
        await handleDownloadHousingTabPdf(9);
        executedActions.push('Onglet 9 PDF');
      }
      if (autoQueue.downloadTab10Pdf) {
        await handleDownloadHousingTabPdf(10);
        executedActions.push('Onglet 10 PDF');
      }
      if (autoQueue.downloadTab11Pdf) {
        await handleDownloadHousingTabPdf(11);
        executedActions.push('Onglet 11 PDF');
      }
      if (autoQueue.downloadTab12Pdf) {
        await handleDownloadHousingTabPdf(12);
        executedActions.push('Onglet 12 PDF');
      }

      await loadPostulants();
      triggerToast(`⚡ Génération Automatique terminée (${executedActions.join(' · ')})`);
    } catch (err) {
      console.error(err);
      triggerToast('Erreur lors de la génération automatique');
    } finally {
      setIsAutoExecuting(false);
    }
  };

  const handlePublishToEntretien = async () => {
    setIsPublishingEntretien(true);
    try {
      await publishPostulantToEntretien(postulant, settings);
      triggerToast(`Session publiée vers « Entretien d'Embauche » ! Code : ${postulant.codeIdCandidature}`);
    } catch {
      triggerToast('Erreur lors de la publication vers Entretien');
    } finally {
      setIsPublishingEntretien(false);
    }
  };

  const handleDownloadKitPdf = async () => {
    const { doc, filename } = await generatePostulantKitPdf(
      postulant,
      settings,
      customVisualText['kit']
    );
    doc.save(filename);
    triggerToast('Kit Candidat officiel téléchargé !');
  };

  const downloadHtmlFile = (filename: string, html: string) => {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    triggerToast(`Fichier ${filename} téléchargé !`);
  };

  const emailModel = generatePostulantEmailTemplate(postulant, settings);

  // HTML emails pour les onglets 3, 4, 5, 6, 7
  const promesseHtmlEmail = wrapBasicEmailHtml(
    `Promesse Unilatérale d'Embauche — ${postulant.nomComplet}`,
    postulant.nomEntreprise,
    effectiveEmployerLogo,
    `<p><strong>À l'attention de :</strong> ${postulant.civilite} ${postulant.nomComplet}<br/>Demeurant au : ${postulant.adresse}</p>
     <p>Nous avons le plaisir de vous confirmer notre engagement ferme à vous recruter au poste de <strong>${postulant.intitulePoste}</strong> (CNP ${postulant.codeCnp}) au sein de <strong>${postulant.nomEntreprise}</strong>.</p>
     <ul>
       <li><strong>Rémunération horaire :</strong> ${postulant.salaireHoraire.toFixed(2)} $ CAD / h (~${postulant.salaireMensuel.toLocaleString('fr-CA')} $ CAD / mois)</li>
       <li><strong>Type de contrat :</strong> ${postulant.typeContrat} · Période d'essai : ${postulant.dureePeriodeEssai}</li>
       <li><strong>Date d'embauche :</strong> ${postulant.dateEffet}</li>
       <li><strong>Lieu d'exercice :</strong> ${postulant.adresseEntreprise}</li>
     </ul>`
  );

  const ticketHtmlEmail = wrapBasicEmailHtml(
    `Coupon Convocation Entretien — ${postulant.codeIdCandidature}`,
    postulant.nomEntreprise,
    effectiveEmployerLogo,
    `<p><strong>Candidat :</strong> ${postulant.nomComplet} (${postulant.nationalite})</p>
     <p><strong>Poste visé :</strong> ${postulant.intitulePoste} (CNP ${postulant.codeCnp})</p>
     <p><strong>Date &amp; Heure :</strong> ${postulant.dateEntretien} à ${postulant.heureEntretien}</p>
     <p><strong>Modalité / Lieu :</strong> ${postulant.modaliteEntretien} — ${postulant.lieuEntretien}</p>
     <p><strong>Statut Ticket :</strong> ${postulant.ticketValide ? '✓ Ticket Officiel Validé & Scannable' : '⚠️ Ticket Provisoire Spécimen'}</p>`
  );

  const offreHtmlEmail = wrapBasicEmailHtml(
    `Offre d'Emploi Officielle CNP ${postulant.codeCnp} — ${jobOffer.titrePoste}`,
    postulant.nomEntreprise,
    effectiveEmployerLogo,
    `<p><strong>Référence Offre :</strong> ${jobOffer.reference}</p>
     <p><strong>Rémunération :</strong> ${jobOffer.salaireMin.toFixed(2)} $ à ${jobOffer.salaireMax.toFixed(2)} $ CAD / h</p>
     <p><strong>Avantages sociaux Colombie-Britannique :</strong></p>
     <ul>${CANADIAN_STANDARD_BENEFITS.map((b) => `<li>${b}</li>`).join('')}</ul>`
  );

  const designModelLabels = [
    { id: '1', title: '1. Exécutif & Diplomatique (Navy & Or)', desc: 'Bordure dorée et sceau centré' },
    { id: '2', title: '2. Moderne Minimaliste Azur', desc: 'Lignes épurées et badge CNESST' },
    { id: '3', title: '3. Notarié & Fiduciaire', desc: 'Armoiries et paraphes officiels' },
    { id: '4', title: '4. Fret & Logistique Transfrontalier', desc: 'Cartouche douanier et code-barres' },
    { id: '5', title: '5. Protocole Canadien Bilingue', desc: 'Sceau d’État stylisé et accord bilatéral' }
  ];

  const models5HtmlEmail = wrapBasicEmailHtml(
    `Modèle Visuel #${selectedDesignModelId} — ${postulant.intitulePoste}`,
    postulant.nomEntreprise,
    effectiveEmployerLogo,
    `<p>Gabarit sélectionné : <strong>${designModelLabels.find((m) => m.id === selectedDesignModelId)?.title}</strong></p>
     <p>Candidat : ${postulant.nomComplet} · Réf : ${postulant.codeIdCandidature}</p>
     <p>Ce gabarit intègre automatiquement les logos, signatures, cachets et filigranes configurés dans le Panneau Réglages.</p>`
  );

  const bundleHtmlEmail = wrapBasicEmailHtml(
    bundleCoverOptions.titreLivre,
    postulant.nomEntreprise,
    effectiveEmployerLogo,
    `<h3 style="color: #0B2545;">${bundleCoverOptions.sousTitre}</h3>
     <p><strong>Candidat :</strong> ${postulant.nomComplet} · Réf : ${postulant.codeIdCandidature}</p>
     <p><strong>Poste :</strong> ${postulant.intitulePoste} (CNP ${postulant.codeCnp}) · Année ${bundleCoverOptions.annee}</p>`
  );

  // Onglets 1 à 12 + 13 (Fiches et DOC ES)
  const ALL_DOCUMENT_TABS: {
    id: ManualTabId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    highlight?: boolean;
  }[] = [
    { id: 'dossier_kit', label: '1. Kit Candidat Complet (PDF & Mails)', icon: BookOpen },
    { id: 'contrat', label: '2. Contrat de Travail & CRIC', icon: ShieldCheck },
    { id: 'promesse', label: '3. Promesse d’Embauche', icon: FileCheck2 },
    { id: 'ticket', label: '4. Ticket d’Entretien (2 Versions)', icon: Ticket },
    { id: 'offre', label: '5. Offre d’Emploi & CNP', icon: Briefcase },
    { id: 'models5', label: '6. 5 Modèles de Design', icon: Sparkles },
    { id: 'bundle', label: '7. Bundle Assemblé (Couverture Livre)', icon: Layers },
    { id: 'forcus', label: '8. Éditeur FORCUS Word 2013', icon: Edit3, highlight: true },
    { id: 'heb_attestation', label: "9. Attestation officielle de prise en charge de l'hébergement", icon: Home, highlight: true },
    { id: 'heb_notaire', label: "10. Certificat d'authentification notariale", icon: Scale, highlight: true },
    { id: 'heb_hir', label: "11. Rapport officiel d'inspection du logement (HIR)", icon: ClipboardCheck, highlight: true },
    { id: 'heb_declaration', label: '12. Déclaration solennelle (Statutory Declaration)', icon: ScrollText, highlight: true },
    { id: 'doc_es', label: '13. Fiches et DOC ES (15 Modèles)', icon: FileText }
  ];

  // Rendu d'un onglet 9 à 12 avec Canvas 3 Fenêtres + Liaison Acteur Exclusive
  const renderHousingTabModule = (tabNumber: HousingTabNumber, textKey: string) => {
    const actorAssets = getTabActorAssets(tabNumber, assetsConfig, uploadedAssets);
    const title = getTabDocumentTitle(tabNumber);
    const plainContent =
      customVisualText[textKey] ||
      (tabNumber === 9
        ? generateOnglet9PlainText(housingData, postulant)
        : tabNumber === 10
        ? generateOnglet10PlainText(housingData, postulant)
        : tabNumber === 11
        ? generateOnglet11PlainText(housingData, postulant)
        : generateOnglet12PlainText(housingData, postulant));

    const emailHtml = generateHousingTabEmailHtml(
      tabNumber,
      housingData,
      postulant,
      uploadedAssets,
      customVisualText[textKey]
    );

    return (
      <div className="space-y-4">
        <InteractiveDocumentCanvas
          title={`${tabNumber}. ${title}`}
          documentTypeLabel={`Onglet ${tabNumber} · Acteur Exclusif`}
          assetsConfig={assetsConfig}
          onChangeAssetsConfig={setAssetsConfig}
          uploadedAssetUrls={uploadedAssets}
          exclusiveVisualSet={{
            logo: actorAssets.logo.url,
            signature: actorAssets.signature.url,
            cachet: actorAssets.cachet.url,
            filigrane: actorAssets.filigrane.url,
            arrierePlan: actorAssets.arrierePlan.url,
            barcode: actorAssets.barcode.url,
            qrcode: actorAssets.qrcode.url
          }}
          htmlEmailContent={emailHtml}
          onDownloadPdf={() => handleDownloadHousingTabPdf(tabNumber)}
          onDownloadWord={async () => {
            await downloadHousingTabWordDocx(tabNumber, housingData, postulant, customVisualText[textKey]);
            triggerToast(`Onglet ${tabNumber} exporté au format Word (.docx) !`);
          }}
          onDownloadHtml={(html) => downloadHtmlFile(`Onglet_${tabNumber}_${postulant.codeIdCandidature}.html`, html)}
          onOpenInWebmail={onOpenInWebmail}
          onTextEdited={(txt) => {
            setCustomVisualText((prev) => ({ ...prev, [textKey]: txt }));
          }}
        >
          <div
            contentEditable
            suppressContentEditableWarning
            className="font-mono text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap outline-none p-4 hover:bg-amber-50/30 rounded-lg cursor-text"
          >
            {plainContent}
          </div>
        </InteractiveDocumentCanvas>
      </div>
    );
  };

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
                Gestion complète du candidat · Recrutement, Hébergement, Notaire BC, HIR &amp; Convertisseur 3 Fenêtres · 100% Gratuit
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
            title="Exécute automatiquement toutes les tâches cochées dans le formulaire unifié"
          >
            {isAutoExecuting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>Génération Automatique (1 Clic)</span>
          </button>

          <button
            type="button"
            onClick={handlePublishToEntretien}
            disabled={isPublishingEntretien}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md cursor-pointer transition-all active:scale-95 disabled:opacity-50"
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
        {/* A. BANDEAU CAS DE RECRUTEMENT & MÉTHODE D'EXÉCUTION                       */}
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
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">MÉTHODE :</span>
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
        {/* B. CHOIX DU MODÈLE LÉGAL CRIC ET BOUTONS D'EXPORT DÉDIÉS                   */}
        {/* ========================================================================= */}
        <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-blue-900 uppercase tracking-wide block">
              CHOIX DU MODÈLE LÉGAL CRIC :
            </span>
            <div className="flex flex-wrap gap-2 mt-2">
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
                triggerToast('Document CRIC PDF téléchargé !');
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
                  triggerToast('Code HTML Mail copié !');
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
        {/* C. FORMULAIRE DES PARTIES 1 & 2 + PANNEAU RÉGLAGES 6 ACTEURS              */}
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

          {/* PARTIE 2 : LE PRESTATAIRE (CABINET CRIC) */}
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

            <div className="pt-3 border-t border-slate-200 mt-2 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Fichiers Importés Rapides du Prestataire :</span>
                </span>
                <span className="text-[10px] text-slate-500">Synchronisés avec le Panneau Réglages</span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { key: 'logoPrestataire' as const, label: 'Logo Cabinet', src: uploadedAssets.logoPrestataire || cricVars.logoPrestataireUrl },
                  { key: 'signaturePrestataire' as const, label: 'Signature Mandataire', src: uploadedAssets.signaturePrestataire || cricVars.signaturePrestataireUrl },
                  { key: 'cachetPrestataire' as const, label: 'Cachet Officiel', src: uploadedAssets.cachetPrestataire || cricVars.cachetPrestataireUrl }
                ].map((item) => (
                  <div key={item.key} className="p-2.5 rounded-xl border border-slate-200 bg-white flex flex-col items-center justify-between min-h-[88px]">
                    <span className="text-[10px] font-bold text-slate-600">{item.label}</span>
                    {item.src ? (
                      <div className="relative my-1">
                        <img src={item.src} alt={item.label} className="max-h-9 max-w-[76px] object-contain" />
                        <button
                          type="button"
                          onClick={() => handleUploadAsset(item.key, '')}
                          className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-4 h-4 text-[9px] flex items-center justify-center hover:bg-red-700 cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic my-auto">Aucun</span>
                    )}
                    <label className="w-full py-1 px-1.5 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded cursor-pointer block">
                      <span>{item.src ? 'Changer' : '+ Importer'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handlePrestataireFileUpload(item.key, e)}
                      />
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* PANNEAU RÉGLAGES FICHIERS IMPORTÉS — 6 PARTIES & OUTILS D'AUTHENTIFICATION */}
        <PanneauReglagesFichiersImportes
          assetsConfig={assetsConfig}
          onChangeConfig={setAssetsConfig}
          onUploadAsset={handleUploadAsset}
          uploadedAssetUrls={uploadedAssets}
          verificationCodeRef={postulant.codeIdCandidature}
          title="Panneau Réglages Fichiers Importés — 6 Parties Officiels (Employeur, CRIC, Hébergement, Notaire, Inspecteur CM/HIR, Déclaration CER-CLT)"
        />

        {/* ========================================================================= */}
        {/* D. ZONE FORMULAIRE UNIFIÉ CONSOLIDÉ (TOUS LES CHAMPS POUR ONGLETS 1 À 12)  */}
        {/* ========================================================================= */}
        <div className="bg-slate-50 border-2 border-[#0B2545]/15 rounded-2xl p-5 space-y-5 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <h3 className="font-black text-sm sm:text-base text-[#0B2545] flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-[#0066B3]" />
                <span>Formulaire Unifié — Tous Paramètres pour Onglets 1 à 12 &amp; Fiches DOC ES</span>
              </h3>
              <p className="text-[11px] text-slate-600">
                Remplissez les informations ci-dessous et cochez les actions automatiques souhaitées ; tout sera exécuté lors du clic sur « Génération Automatique (1 Clic) ».
              </p>
            </div>

            {/* Sous-navigation du formulaire unifié */}
            <div className="flex flex-wrap gap-1.5 bg-slate-200/70 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveUnifiedFormSection('candidat_poste')}
                className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                  activeUnifiedFormSection === 'candidat_poste'
                    ? 'bg-[#0B2545] text-white shadow-xs'
                    : 'text-slate-700 hover:bg-white/70'
                }`}
              >
                1. Candidat, Contrat &amp; Kit (Onglets 1 à 7)
              </button>
              <button
                type="button"
                onClick={() => setActiveUnifiedFormSection('hebergement_notaire')}
                className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                  activeUnifiedFormSection === 'hebergement_notaire'
                    ? 'bg-[#0066B3] text-white shadow-xs'
                    : 'text-slate-700 hover:bg-white/70'
                }`}
              >
                2. Hébergement, Notaire, HIR &amp; Déclaration (Onglets 9 à 12)
              </button>
              <button
                type="button"
                onClick={() => setActiveUnifiedFormSection('doc_es_params')}
                className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                  activeUnifiedFormSection === 'doc_es_params'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-white/70'
                }`}
              >
                3. Fiches et DOC ES (15 Modèles)
              </button>
            </div>
          </div>

          {/* SECTION UNIFIÉE 1 : CANDIDAT, POSTE, CONTRAT, PROMESSE, TICKET, OFFRE, BUNDLE */}
          {activeUnifiedFormSection === 'candidat_poste' && (
            <div className="space-y-4 text-xs">
              {/* Sous-bloc Poste & Immigration */}
              <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="font-bold text-[#0B2545]">Identification du Poste &amp; Démarches d'Immigration (LIPR / EIMT)</span>
                  <span className="text-[11px] font-mono text-blue-800 font-bold">
                    Réf. Gouvernementale : {cricVars.referenceEimtOuSuivi}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                      onChange={(e) => setCricVars({ ...cricVars, typeDemarche: e.target.value as CricContractVariables['typeDemarche'] })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium"
                    >
                      <option value="EIMT">EIMT (Étude d'Impact sur le Marché du Travail)</option>
                      <option value="Volet des talents mondiaux">Volet des talents mondiaux (GTS)</option>
                      <option value="Dispense">Dispense d'EIMT / Mobilité Francophone</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Sous-bloc Identité, Coordonnées, Contrat & Rémunération */}
              <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3">
                <span className="font-bold text-[#0B2545] block border-b pb-2">
                  Identité du Postulant, Paramètres de Contrat &amp; Promesse d'Embauche
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Civilité</label>
                    <select
                      value={postulant.civilite}
                      onChange={(e) => setPostulant({ ...postulant, civilite: e.target.value as 'Monsieur' | 'Madame' })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-semibold"
                    >
                      <option value="Monsieur">Monsieur</option>
                      <option value="Madame">Madame</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Nom complet du candidat</label>
                    <input
                      type="text"
                      value={postulant.nomComplet}
                      onChange={(e) => {
                        const val = e.target.value;
                        const parts = val.trim().split(' ');
                        setPostulant({
                          ...postulant,
                          nomComplet: val,
                          prenom: parts[0] || '',
                          nom: parts.slice(1).join(' ') || ''
                        });
                      }}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-bold bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Date de naissance</label>
                    <input
                      type="text"
                      value={postulant.dateNaissance || ''}
                      onChange={(e) => setPostulant({ ...postulant, dateNaissance: e.target.value })}
                      placeholder="YYYY-MM-DD"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Nationalité</label>
                    <input
                      type="text"
                      value={postulant.nationalite}
                      onChange={(e) => setPostulant({ ...postulant, nationalite: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">N° Passeport / Pièce ID</label>
                    <input
                      type="text"
                      value={postulant.numeroPieceIdentite || ''}
                      onChange={(e) => setPostulant({ ...postulant, numeroPieceIdentite: e.target.value })}
                      placeholder="Ex: C01294857"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Téléphone</label>
                    <input
                      type="text"
                      value={postulant.telephone}
                      onChange={(e) => setPostulant({ ...postulant, telephone: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Email</label>
                    <input
                      type="email"
                      value={postulant.email}
                      onChange={(e) => setPostulant({ ...postulant, email: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Contact d'urgence</label>
                    <input
                      type="text"
                      value={postulant.contactUrgence || ''}
                      onChange={(e) => setPostulant({ ...postulant, contactUrgence: e.target.value })}
                      placeholder="Nom & Tél urgence"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-slate-600 font-semibold mb-1">Adresse complète du candidat</label>
                    <input
                      type="text"
                      value={postulant.adresse}
                      onChange={(e) => setPostulant({ ...postulant, adresse: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Département d'affectation</label>
                    <input
                      type="text"
                      value={postulant.departement}
                      onChange={(e) => setPostulant({ ...postulant, departement: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
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
                        className="px-2 py-1 bg-slate-200 hover:bg-slate-300 rounded text-xs font-bold cursor-pointer"
                        title="Générer nouveau code"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Type de contrat</label>
                    <select
                      value={postulant.typeContrat}
                      onChange={(e) => setPostulant({ ...postulant, typeContrat: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-bold"
                    >
                      <option value="CDI">CDI (Durée Indéterminée)</option>
                      <option value="CDD">CDD (Durée Déterminée)</option>
                      <option value="Saisonnier">Saisonnier</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Date d'effet / Embauche</label>
                    <input
                      type="text"
                      value={postulant.dateEffet}
                      onChange={(e) => setPostulant({ ...postulant, dateEffet: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Salaire horaire ($ CAD/h)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={postulant.salaireHoraire}
                      onChange={(e) => {
                        const hor = parseFloat(e.target.value) || 0;
                        setPostulant({
                          ...postulant,
                          salaireHoraire: hor,
                          salaireMensuel: Math.round(hor * 162.5)
                        });
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
                        setPostulant({
                          ...postulant,
                          salaireMensuel: men,
                          salaireHoraire: Math.round((men / 162.5) * 100) / 100
                        });
                      }}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-bold bg-white text-emerald-800"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Période d'essai</label>
                    <input
                      type="text"
                      value={postulant.dureePeriodeEssai}
                      onChange={(e) => setPostulant({ ...postulant, dureePeriodeEssai: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Horaires de travail</label>
                    <input
                      type="text"
                      value={postulant.horairesTravail || '40h / semaine'}
                      onChange={(e) => setPostulant({ ...postulant, horairesTravail: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
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

                {/* Options Bundle, Modèle Design & Ticket */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-slate-200">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Titre Couverture Livre (Onglet 7 Bundle)</label>
                    <input
                      type="text"
                      value={bundleCoverOptions.titreLivre}
                      onChange={(e) => setBundleCoverOptions({ ...bundleCoverOptions, titreLivre: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Sous-titre Couverture Livre (Onglet 7 Bundle)</label>
                    <input
                      type="text"
                      value={bundleCoverOptions.sousTitre}
                      onChange={(e) => setBundleCoverOptions({ ...bundleCoverOptions, sousTitre: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                </div>

                {postulant.casType === 'agence' && (
                  <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-3 flex items-center justify-between gap-3">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={postulant.dispenseEntretienParGarantie}
                        onChange={(e) =>
                          setPostulant({ ...postulant, dispenseEntretienParGarantie: e.target.checked })
                        }
                        className="rounded text-[#0066B3] mt-0.5"
                      />
                      <span>
                        <strong className="block text-blue-950">Garantie de compétences du Prestataire (Dispense d'entretien)</strong>
                        <span className="text-[11px] text-blue-800">
                          Le cabinet mandataire se porte légalement garant des qualifications pour passer directement à l'étape contractuelle.
                        </span>
                      </span>
                    </label>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-200">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-bold text-slate-700">Type de Ticket (Onglet 4) :</span>
                    <label className="flex items-center gap-1.5 cursor-pointer font-medium">
                      <input
                        type="radio"
                        name="ticketValide"
                        checked={!postulant.ticketValide}
                        onChange={() => setPostulant({ ...postulant, ticketValide: false })}
                      />
                      <span className="text-amber-800">1. Provisoire (Spécimen)</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer font-medium">
                      <input
                        type="radio"
                        name="ticketValide"
                        checked={postulant.ticketValide}
                        onChange={() => setPostulant({ ...postulant, ticketValide: true })}
                      />
                      <span className="text-emerald-800">2. Validé (Barcode actif)</span>
                    </label>
                  </div>

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
                              setPostulant({ ...postulant, photoUrl: evt.target?.result as string });
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
            </div>
          )}

          {/* SECTION UNIFIÉE 2 : HÉBERGEMENT, NOTAIRE BC, INSPECTION HIR & DÉCLARATION (ONGLETS 9 À 12) */}
          {activeUnifiedFormSection === 'hebergement_notaire' && (
            <div className="space-y-3 text-xs">
              <div className="flex flex-wrap gap-1.5 p-1 bg-slate-200/70 rounded-xl font-bold">
                {[
                  { id: 't9' as const, label: 'Onglet 9 : Attestation Hébergement' },
                  { id: 't10' as const, label: 'Onglet 10 : Notaire Public BC' },
                  { id: 't11' as const, label: 'Onglet 11 : Inspection HIR (12 critères)' },
                  { id: 't12' as const, label: 'Onglet 12 : Déclaration Solennelle' }
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setActiveHousingFormSubTab(st.id)}
                    className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                      activeHousingFormSubTab === st.id
                        ? 'bg-[#0066B3] text-white shadow-xs'
                        : 'text-slate-700 hover:bg-white/70'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>

              {activeHousingFormSubTab === 't9' && (
                <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">N° Immatriculation Employeur</label>
                      <input
                        type="text"
                        value={housingData.employeurNumEnregistrement}
                        onChange={(e) => setHousingData({ ...housingData, employeurNumEnregistrement: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Date &amp; Lieu naissance bénéficiaire</label>
                      <input
                        type="text"
                        value={housingData.beneficiaireDateLieuNaissance}
                        onChange={(e) => setHousingData({ ...housingData, beneficiaireDateLieuNaissance: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">N° Passeport bénéficiaire</label>
                      <input
                        type="text"
                        value={housingData.beneficiairePasseport}
                        onChange={(e) => setHousingData({ ...housingData, beneficiairePasseport: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono font-bold"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-slate-600 font-semibold mb-1">Adresse complète du logement mis à disposition</label>
                      <input
                        type="text"
                        value={housingData.hebergementAdresseComplete}
                        onChange={(e) => setHousingData({ ...housingData, hebergementAdresseComplete: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Ville / Province</label>
                      <input
                        type="text"
                        value={housingData.hebergementVilleProvince}
                        onChange={(e) => setHousingData({ ...housingData, hebergementVilleProvince: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Type de logement</label>
                      <select
                        value={housingData.hebergementTypeLogement}
                        onChange={(e) => setHousingData({ ...housingData, hebergementTypeLogement: e.target.value as HousingAndNotaryData['hebergementTypeLogement'] })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                      >
                        <option value="Appartement individuel">Appartement individuel</option>
                        <option value="Maison partagée">Maison partagée</option>
                        <option value="Chambre individuelle meublée">Chambre individuelle meublée</option>
                        <option value="Résidence d'entreprise">Résidence d'entreprise</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Nombre de chambres / Capacité</label>
                      <input
                        type="text"
                        value={housingData.hebergementNombreChambres}
                        onChange={(e) => setHousingData({ ...housingData, hebergementNombreChambres: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Lien de l'employeur avec le logement</label>
                      <select
                        value={housingData.hebergementLienEmployeur}
                        onChange={(e) => setHousingData({ ...housingData, hebergementLienEmployeur: e.target.value as HousingAndNotaryData['hebergementLienEmployeur'] })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                      >
                        <option value="Propriétaire">Propriétaire</option>
                        <option value="Locataire autorisé à héberger">Locataire autorisé à héberger</option>
                        <option value="Convention de mise à disposition">Convention de mise à disposition</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Prise en charge Loyer mensuel</label>
                      <select
                        value={housingData.fraisLoyerOption}
                        onChange={(e) => setHousingData({ ...housingData, fraisLoyerOption: e.target.value as HousingAndNotaryData['fraisLoyerOption'] })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-bold text-emerald-800"
                      >
                        <option value="100% employeur">100% employeur</option>
                        <option value="Prise en charge partielle">Prise en charge partielle</option>
                        <option value="À charge du salarié">À charge du salarié</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Eau / Électricité / Chauffage</label>
                      <div className="grid grid-cols-3 gap-1">
                        <select
                          value={housingData.fraisEau}
                          onChange={(e) => setHousingData({ ...housingData, fraisEau: e.target.value as 'Incluse' | 'Non incluse' })}
                          className="px-1.5 py-1 border rounded bg-white text-[11px]"
                        >
                          <option value="Incluse">Eau: Incluse</option>
                          <option value="Non incluse">Eau: Non</option>
                        </select>
                        <select
                          value={housingData.fraisElectricite}
                          onChange={(e) => setHousingData({ ...housingData, fraisElectricite: e.target.value as 'Incluse' | 'Non incluse' })}
                          className="px-1.5 py-1 border rounded bg-white text-[11px]"
                        >
                          <option value="Incluse">Élec: Incluse</option>
                          <option value="Non incluse">Élec: Non</option>
                        </select>
                        <select
                          value={housingData.fraisChauffage}
                          onChange={(e) => setHousingData({ ...housingData, fraisChauffage: e.target.value as 'Inclus' | 'Non inclus' })}
                          className="px-1.5 py-1 border rounded bg-white text-[11px]"
                        >
                          <option value="Inclus">Chauf: Inclus</option>
                          <option value="Non inclus">Chauf: Non</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Autres frais / équipements</label>
                      <input
                        type="text"
                        value={housingData.fraisAutres}
                        onChange={(e) => setHousingData({ ...housingData, fraisAutres: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeHousingFormSubTab === 't10' && (
                <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Nom du Notaire public (BC)</label>
                      <input
                        type="text"
                        value={housingData.notaireNomComplet}
                        onChange={(e) => setHousingData({ ...housingData, notaireNomComplet: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">N° Licence / Membre Notaire</label>
                      <input
                        type="text"
                        value={housingData.notaireNumeroLicence}
                        onChange={(e) => setHousingData({ ...housingData, notaireNumeroLicence: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">N° Dossier Notarial</label>
                      <input
                        type="text"
                        value={housingData.notaireNumeroDossier}
                        onChange={(e) => setHousingData({ ...housingData, notaireNumeroDossier: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono text-blue-900 font-bold"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-slate-600 font-semibold mb-1">Adresse étude notariale (Colombie-Britannique)</label>
                      <input
                        type="text"
                        value={housingData.notaireVilleAdresse}
                        onChange={(e) => setHousingData({ ...housingData, notaireVilleAdresse: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Pièce identité vérifiée du signataire</label>
                      <input
                        type="text"
                        value={housingData.notairePieceIdentiteSignataire}
                        onChange={(e) => setHousingData({ ...housingData, notairePieceIdentiteSignataire: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4 pt-2 border-t border-slate-100">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={housingData.notaireFormaliteDevantMoi}
                        onChange={(e) => setHousingData({ ...housingData, notaireFormaliteDevantMoi: e.target.checked })}
                      />
                      <span>Signée personnellement devant moi</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={housingData.notaireFormaliteReconnue}
                        onChange={(e) => setHousingData({ ...housingData, notaireFormaliteReconnue: e.target.checked })}
                      />
                      <span>Signature reconnue comme véritable</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={housingData.notaireFormaliteConforme}
                        onChange={(e) => setHousingData({ ...housingData, notaireFormaliteConforme: e.target.checked })}
                      />
                      <span>Déclaration volontaire &amp; conforme</span>
                    </label>
                  </div>
                </div>
              )}

              {activeHousingFormSubTab === 't11' && (
                <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Organisme (BCAC / HIR)</label>
                      <input
                        type="text"
                        value={housingData.hirOrganismeNom}
                        onChange={(e) => setHousingData({ ...housingData, hirOrganismeNom: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Nom de l'Inspecteur</label>
                      <input
                        type="text"
                        value={housingData.hirInspecteurNom}
                        onChange={(e) => setHousingData({ ...housingData, hirInspecteurNom: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">N° Inspection</label>
                      <input
                        type="text"
                        value={housingData.hirNumeroInspection}
                        onChange={(e) => setHousingData({ ...housingData, hirNumeroInspection: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono font-bold text-emerald-800"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Superficie / Capacité</label>
                      <input
                        type="text"
                        value={housingData.hirSuperficie}
                        onChange={(e) => setHousingData({ ...housingData, hirSuperficie: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>

                  {/* Grille interactive des 12 critères */}
                  <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead className="bg-slate-100 sticky top-0">
                        <tr>
                          <th className="p-2 border-b">Critère vérifié (12 points BC)</th>
                          <th className="p-2 border-b w-32">Statut</th>
                          <th className="p-2 border-b">Observations</th>
                        </tr>
                      </thead>
                      <tbody>
                        {housingData.hirCriteres.map((row, idx) => (
                          <tr key={row.id} className="border-b last:border-b-0">
                            <td className="p-1.5 font-semibold text-slate-800">{row.critere}</td>
                            <td className="p-1.5">
                              <select
                                value={row.conforme ? 'ok' : 'ko'}
                                onChange={(e) => {
                                  const next = [...housingData.hirCriteres];
                                  next[idx] = { ...row, conforme: e.target.value === 'ok' };
                                  setHousingData({ ...housingData, hirCriteres: next });
                                }}
                                className={`px-2 py-1 rounded border font-bold ${
                                  row.conforme ? 'text-emerald-800 bg-emerald-50' : 'text-red-700 bg-red-50'
                                }`}
                              >
                                <option value="ok">Conforme</option>
                                <option value="ko">Non conforme</option>
                              </select>
                            </td>
                            <td className="p-1.5">
                              <input
                                type="text"
                                value={row.observations}
                                onChange={(e) => {
                                  const next = [...housingData.hirCriteres];
                                  next[idx] = { ...row, observations: e.target.value };
                                  setHousingData({ ...housingData, hirCriteres: next });
                                }}
                                className="w-full px-2 py-1 border rounded bg-white"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Conclusion Officielle HIR</label>
                    <select
                      value={housingData.hirConclusionStatut}
                      onChange={(e) => setHousingData({ ...housingData, hirConclusionStatut: e.target.value as HousingAndNotaryData['hirConclusionStatut'] })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-bold text-emerald-900"
                    >
                      <option value="Logement conforme aux normes d’habitation de Colombie-Britannique">
                        Logement conforme aux normes d’habitation de Colombie-Britannique
                      </option>
                      <option value="Logement conforme sous réserve des corrections mineures ci-dessus">
                        Logement conforme sous réserve des corrections mineures ci-dessus
                      </option>
                      <option value="Logement non conforme">Logement non conforme</option>
                    </select>
                  </div>
                </div>
              )}

              {activeHousingFormSubTab === 't12' && (
                <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Autorité assermentatrice</label>
                      <select
                        value={housingData.declAutoriteType}
                        onChange={(e) => setHousingData({ ...housingData, declAutoriteType: e.target.value as HousingAndNotaryData['declAutoriteType'] })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-bold"
                      >
                        <option value="Notaire Public en Colombie-Britannique">Notaire Public en Colombie-Britannique</option>
                        <option value="Commissaire aux Affidavits">Commissaire aux Affidavits</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Nom complet de l'Autorité</label>
                      <input
                        type="text"
                        value={housingData.declAutoriteNom}
                        onChange={(e) => setHousingData({ ...housingData, declAutoriteNom: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">N° Commission / Licence</label>
                      <input
                        type="text"
                        value={housingData.declAutoriteNumeroCommission}
                        onChange={(e) => setHousingData({ ...housingData, declAutoriteNumeroCommission: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Ville / Province de déclaration</label>
                      <input
                        type="text"
                        value={housingData.declVilleProvince}
                        onChange={(e) => setHousingData({ ...housingData, declVilleProvince: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-slate-600 font-semibold mb-1">Durée &amp; Conditions solennelles de prise en charge</label>
                      <input
                        type="text"
                        value={housingData.declDureeEtConditions}
                        onChange={(e) => setHousingData({ ...housingData, declDureeEtConditions: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SECTION UNIFIÉE 3 : PARAMÈTRES FICHES ET DOC ES (15 MODÈLES) */}
          {activeUnifiedFormSection === 'doc_es_params' && (
            <div className="space-y-4 text-xs">
              <div className="flex gap-1.5 p-1 bg-slate-200/70 rounded-xl overflow-x-auto font-bold">
                <button
                  type="button"
                  onClick={() => setActiveDocEsFormTab('ats')}
                  className={`px-3 py-1.5 rounded-lg cursor-pointer whitespace-nowrap ${
                    activeDocEsFormTab === 'ats' ? 'bg-[#0B2545] text-white' : 'text-slate-700'
                  }`}
                >
                  1. Profil ATS &amp; Compétences
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDocEsFormTab('evaluation')}
                  className={`px-3 py-1.5 rounded-lg cursor-pointer whitespace-nowrap ${
                    activeDocEsFormTab === 'evaluation' ? 'bg-[#0B2545] text-white' : 'text-slate-700'
                  }`}
                >
                  2. Évaluation RH (M2, M3)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDocEsFormTab('poste')}
                  className={`px-3 py-1.5 rounded-lg cursor-pointer whitespace-nowrap ${
                    activeDocEsFormTab === 'poste' ? 'bg-[#0B2545] text-white' : 'text-slate-700'
                  }`}
                >
                  3. Poste &amp; Références (M4-M7)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDocEsFormTab('agence')}
                  className={`px-3 py-1.5 rounded-lg cursor-pointer whitespace-nowrap ${
                    activeDocEsFormTab === 'agence' ? 'bg-[#0B2545] text-white' : 'text-slate-700'
                  }`}
                >
                  4. Agence, RGPD &amp; Tests (M8-M15)
                </button>
              </div>

              {activeDocEsFormTab === 'ats' && (
                <div className="p-4 rounded-xl bg-white border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Réf. Dossier ATS</label>
                    <input
                      type="text"
                      value={docEsData.referenceDossier}
                      onChange={(e) => setDocEsData({ ...docEsData, referenceDossier: e.target.value })}
                      className="w-full px-3 py-1.5 border rounded-lg font-mono font-bold text-blue-900"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Ville / Région</label>
                    <input
                      type="text"
                      value={docEsData.villeRegion}
                      onChange={(e) => setDocEsData({ ...docEsData, villeRegion: e.target.value })}
                      className="w-full px-3 py-1.5 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Expérience (ans)</label>
                    <input
                      type="number"
                      value={docEsData.anneesExperience}
                      onChange={(e) => setDocEsData({ ...docEsData, anneesExperience: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-1.5 border rounded-lg font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Prétentions salariales</label>
                    <input
                      type="text"
                      value={docEsData.pretentionsSalariales}
                      onChange={(e) => setDocEsData({ ...docEsData, pretentionsSalariales: e.target.value })}
                      className="w-full px-3 py-1.5 border rounded-lg font-bold text-emerald-800"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <label className="block text-slate-600 font-semibold mb-1">Synthèse &amp; Avis Recruteur</label>
                    <textarea
                      rows={2}
                      value={docEsData.syntheseRecruteur}
                      onChange={(e) => setDocEsData({ ...docEsData, syntheseRecruteur: e.target.value })}
                      className="w-full px-3 py-1.5 border rounded-lg"
                    />
                  </div>
                </div>
              )}

              {activeDocEsFormTab === 'evaluation' && (
                <div className="p-4 rounded-xl bg-white border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Nom de l'évaluateur</label>
                    <input
                      type="text"
                      value={docEsData.evaluateurNom}
                      onChange={(e) => setDocEsData({ ...docEsData, evaluateurNom: e.target.value })}
                      className="w-full px-3 py-1.5 border rounded-lg font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Décision RH</label>
                    <select
                      value={docEsData.decisionEvaluation}
                      onChange={(e) => setDocEsData({ ...docEsData, decisionEvaluation: e.target.value as FichesDocEsData['decisionEvaluation'] })}
                      className="w-full px-3 py-1.5 border rounded-lg bg-white font-bold"
                    >
                      <option value="Poursuivre le processus">Poursuivre le processus</option>
                      <option value="Mettre en attente">Mettre en attente</option>
                      <option value="Stopper le processus">Stopper le processus</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Commentaire synthèse</label>
                    <input
                      type="text"
                      value={docEsData.commentairesSyntheseEvaluateur}
                      onChange={(e) => setDocEsData({ ...docEsData, commentairesSyntheseEvaluateur: e.target.value })}
                      className="w-full px-3 py-1.5 border rounded-lg"
                    />
                  </div>
                </div>
              )}

              {activeDocEsFormTab === 'poste' && (
                <div className="p-4 rounded-xl bg-white border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Rattachement hiérarchique</label>
                    <input
                      type="text"
                      value={docEsData.rattachementHierarchique}
                      onChange={(e) => setDocEsData({ ...docEsData, rattachementHierarchique: e.target.value })}
                      className="w-full px-3 py-1.5 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Outils métiers</label>
                    <input
                      type="text"
                      value={docEsData.outilsMetiers}
                      onChange={(e) => setDocEsData({ ...docEsData, outilsMetiers: e.target.value })}
                      className="w-full px-3 py-1.5 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Matériel fourni</label>
                    <input
                      type="text"
                      value={docEsData.materielFourni}
                      onChange={(e) => setDocEsData({ ...docEsData, materielFourni: e.target.value })}
                      className="w-full px-3 py-1.5 border rounded-lg"
                    />
                  </div>
                </div>
              )}

              {activeDocEsFormTab === 'agence' && (
                <div className="p-4 rounded-xl bg-white border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Taux honoraires agence (%)</label>
                    <input
                      type="number"
                      value={docEsData.tauxHonorairesAgencePct}
                      onChange={(e) => setDocEsData({ ...docEsData, tauxHonorairesAgencePct: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-1.5 border rounded-lg font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Garantie remplacement (mois)</label>
                    <input
                      type="number"
                      value={docEsData.dureeGarantieRemplacementMois}
                      onChange={(e) => setDocEsData({ ...docEsData, dureeGarantieRemplacementMois: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-1.5 border rounded-lg font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Code Test Personnalité</label>
                    <input
                      type="text"
                      value={docEsData.codeAccesPersonnalite}
                      onChange={(e) => setDocEsData({ ...docEsData, codeAccesPersonnalite: e.target.value })}
                      className="w-full px-3 py-1.5 border rounded-lg font-mono"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ZONE DES CASES À COCHER RELIÉES AU GROS BOUTON "GÉNÉRATION AUTOMATIQUE (1 CLIC)" */}
          <div className="p-4 rounded-xl bg-[#0B2545]/5 border border-[#0B2545]/20 space-y-3 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-[#0066B3]" />
                <span className="font-bold text-[#0B2545]">
                  Actions automatiques cochées (Exécutées en 1 clic via « Génération Automatique » en haut)
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleSavePostulant()}
                className="px-3 py-1 bg-[#0B2545] hover:bg-[#134074] text-white font-bold text-[11px] rounded-lg flex items-center gap-1 cursor-pointer w-fit"
              >
                <Save className="w-3 h-3 text-amber-400" />
                <span>Sauvegarder Dossier Maintenant</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {(
                [
                  { key: 'saveDossier', label: 'Enregistrer dossier (Firestore)' },
                  { key: 'syncDocEs', label: 'Synchroniser 15 Fiches DOC ES' },
                  { key: 'publishEntretien', label: 'Publier sur Entretien d’Embauche' },
                  { key: 'createEmployee', label: 'Enregistrer Salarié (EMP)' },
                  { key: 'downloadKitPdf', label: 'PDF 1 : Kit Candidat Complet' },
                  { key: 'downloadContratPdf', label: 'PDF 2 : Contrat CRIC' },
                  { key: 'downloadPromessePdf', label: 'PDF 3 : Promesse d’Embauche' },
                  { key: 'downloadTicketPdf', label: 'PDF 4 : Ticket d’Entretien' },
                  { key: 'downloadOffrePdf', label: 'PDF 5 : Offre d’Emploi CNP' },
                  { key: 'downloadBundlePdf', label: 'PDF 7 : Bundle Couverture Livre' },
                  { key: 'downloadTab9Pdf', label: 'PDF 9 : Attestation Hébergement' },
                  { key: 'downloadTab10Pdf', label: 'PDF 10 : Certificat Notarial' },
                  { key: 'downloadTab11Pdf', label: 'PDF 11 : Rapport Inspection HIR' },
                  { key: 'downloadTab12Pdf', label: 'PDF 12 : Déclaration Solennelle' }
                ] as { key: keyof AutoActionQueue; label: string }[]
              ).map((item) => (
                <label
                  key={item.key}
                  className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200 hover:border-[#0066B3] cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={autoQueue[item.key]}
                    onChange={(e) => setAutoQueue({ ...autoQueue, [item.key]: e.target.checked })}
                    className="rounded text-[#0066B3]"
                  />
                  <span className="font-medium text-slate-800">{item.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SÉPARATEUR VISUEL VERT OFFICIEL                                           */}
        {/* ========================================================================= */}
        <div className="w-full bg-[#10b981] py-3.5 px-4 rounded-xl text-center font-black tracking-widest text-slate-950 text-sm sm:text-base uppercase shadow-sm border border-emerald-400">
          RESULTAT CORRESPONDANT AU CDA FPR
        </div>

        {/* ========================================================================= */}
        {/* 4. NAVIGATION ENTRE LES 13 ONGLETS (ONGLETS 1 À 12 + FICHES ET DOC ES)    */}
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
            {ALL_DOCUMENT_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeManualTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveManualTab(tab.id)}
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
        {/* 5. CONTENU DES ONGLETS 1 À 12 (TOUS DOTÉS DU CONVERTISSEUR 3 FENÊTRES)    */}
        {/* ========================================================================= */}

        {/* ONGLET 1 : KIT CANDIDAT COMPLET */}
        {activeManualTab === 'dossier_kit' && (
          <InteractiveDocumentCanvas
            title={`Kit Candidat : ${postulant.nomComplet} (${postulant.intitulePoste})`}
            documentTypeLabel="Onglet 1 · Kit Candidat Officiel"
            assetsConfig={assetsConfig}
            onChangeAssetsConfig={setAssetsConfig}
            uploadedAssetUrls={uploadedAssets}
            exclusiveVisualSet={{
              logo: effectiveEmployerLogo,
              signature: uploadedAssets.signature,
              cachet: uploadedAssets.cachet,
              filigrane: uploadedAssets.filigrane,
              arrierePlan: uploadedAssets.arrierePlan,
              barcode: uploadedAssets.barcodeEmployeur,
              qrcode: uploadedAssets.qrcodeEmployeur
            }}
            htmlEmailContent={emailModel.html}
            onDownloadPdf={handleDownloadKitPdf}
            onDownloadWord={() => {
              downloadWordDocument(
                `Kit_Candidat_${postulant.codeIdCandidature}`,
                `Kit Candidat Officiel - ${postulant.nomComplet}`,
                emailModel.html
              );
              triggerToast('Kit Candidat exporté au format Word !');
            }}
            onDownloadHtml={(html) => downloadHtmlFile(`Kit_Candidat_${postulant.codeIdCandidature}.html`, html)}
            onOpenInWebmail={onOpenInWebmail}
            onTextEdited={(text) => setCustomVisualText((prev) => ({ ...prev, kit: text }))}
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
                </>
              ) : (
                <>
                  <h2 className="text-base font-bold text-[#0066B3] border-b pb-2">
                    FICHE DE LIAISON TRIPARTITE &amp; KIT DE PRÉPARATION (AGENCE DE PLACEMENT)
                  </h2>
                  <p><strong>EMPLOYEUR :</strong> {postulant.nomEntreprise} (Surrey, Colombie-Britannique)</p>
                  <p><strong>PRESTATAIRE MANDATÉ :</strong> {postulant.nomAgence} (Permis CNESST {postulant.permisCnesst})</p>
                  <p><strong>CANDIDAT :</strong> {postulant.nomComplet} · Réf. Dossier : {postulant.codeIdCandidature}</p>
                  <p><strong>STATUT :</strong> {postulant.dispenseEntretienParGarantie ? 'Dispense activée par garantie Prestataire' : 'Entretien direct programmé'}</p>
                </>
              )}
            </div>
          </InteractiveDocumentCanvas>
        )}

        {/* ONGLET 2 : CONTRAT DE TRAVAIL & PRESTATION CRIC */}
        {activeManualTab === 'contrat' && (
          <InteractiveDocumentCanvas
            title={`Contrat : ${cricModelChoice === 'model1' ? 'Attestation de Mandat CRIC' : 'Contrat Intégral 8 Articles'}`}
            documentTypeLabel="Onglet 2 · Contrat Légal CRIC"
            assetsConfig={assetsConfig}
            onChangeAssetsConfig={setAssetsConfig}
            uploadedAssetUrls={uploadedAssets}
            exclusiveVisualSet={{
              logo: effectiveEmployerLogo,
              signature: uploadedAssets.signature,
              cachet: uploadedAssets.cachet,
              filigrane: uploadedAssets.filigrane,
              arrierePlan: uploadedAssets.arrierePlan,
              barcode: uploadedAssets.barcodeEmployeur,
              qrcode: uploadedAssets.qrcodeEmployeur
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
              triggerToast('Contrat PDF téléchargé !');
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
                `<h1>${title}</h1><pre style="white-space: pre-wrap;">${content}</pre>`
              );
              triggerToast('Contrat exporté au format Word !');
            }}
            onDownloadHtml={(html) => downloadHtmlFile(`Contrat_CRIC_${postulant.codeIdCandidature}.html`, html)}
            onOpenInWebmail={onOpenInWebmail}
            onTextEdited={(text) => setCustomVisualText((prev) => ({ ...prev, contrat: text }))}
          >
            <div
              contentEditable
              suppressContentEditableWarning
              className="font-mono text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap outline-none p-4 hover:bg-amber-50/30 rounded-lg cursor-text"
            >
              {customVisualText['contrat'] ||
                (cricModelChoice === 'model1' ? generateModel1PlainText(cricVars) : generateModel2PlainText(cricVars))}
            </div>
          </InteractiveDocumentCanvas>
        )}

        {/* ONGLET 3 : PROMESSE D'EMBAUCHE OFFICIELLE (AVEC CONVERTISSEUR 3 FENÊTRES) */}
        {activeManualTab === 'promesse' && (
          <InteractiveDocumentCanvas
            title={`Promesse d'Embauche : ${postulant.nomComplet}`}
            documentTypeLabel="Onglet 3 · Promesse d'Embauche"
            assetsConfig={assetsConfig}
            onChangeAssetsConfig={setAssetsConfig}
            uploadedAssetUrls={uploadedAssets}
            exclusiveVisualSet={{
              logo: effectiveEmployerLogo,
              signature: uploadedAssets.signature,
              cachet: uploadedAssets.cachet,
              filigrane: uploadedAssets.filigrane,
              arrierePlan: uploadedAssets.arrierePlan,
              barcode: uploadedAssets.barcodeEmployeur,
              qrcode: uploadedAssets.qrcodeEmployeur
            }}
            htmlEmailContent={promesseHtmlEmail}
            onDownloadPdf={async () => {
              await downloadPromesseEmbauchePdf(buildPromesseObj());
              triggerToast('Promesse d’embauche PDF téléchargée !');
            }}
            onDownloadWord={() => {
              downloadWordDocument(
                `Promesse_Embauche_${postulant.codeIdCandidature}`,
                `Promesse Unilatérale d'Embauche - ${postulant.nomComplet}`,
                promesseHtmlEmail
              );
              triggerToast('Promesse d’embauche exportée en Word !');
            }}
            onDownloadHtml={(html) => downloadHtmlFile(`Promesse_Embauche_${postulant.codeIdCandidature}.html`, html)}
            onOpenInWebmail={onOpenInWebmail}
            onTextEdited={(txt) => setCustomVisualText((prev) => ({ ...prev, promesse: txt }))}
          >
            <div className="space-y-4 text-xs sm:text-sm text-slate-800 leading-relaxed font-sans">
              <div className="flex items-center justify-between border-b pb-4">
                <BrandLogo companyName={postulant.nomEntreprise} customLogoUrl={effectiveEmployerLogo} size="header" />
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
                  Nous avons le plaisir de vous confirmer notre engagement ferme à vous recruter au sein de <strong>{postulant.nomEntreprise}</strong> au Canada.
                </p>
                <p>
                  • <strong>Fonction :</strong> {postulant.intitulePoste} (CNP {postulant.codeCnp})<br />
                  • <strong>Rémunération horaire :</strong> {postulant.salaireHoraire.toFixed(2)} $ CAD / h (~{postulant.salaireMensuel.toLocaleString('fr-CA')} $ CAD / mois)<br />
                  • <strong>Période d'essai :</strong> {postulant.dureePeriodeEssai}<br />
                  • <strong>Lieu de travail :</strong> {postulant.adresseEntreprise}
                </p>
              </div>
            </div>
          </InteractiveDocumentCanvas>
        )}

        {/* ONGLET 4 : TICKET D'ENTRETIEN (AVEC CONVERTISSEUR 3 FENÊTRES) */}
        {activeManualTab === 'ticket' && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
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
                      handleUploadAsset('cachet', dataUrl);
                      triggerToast(`Tampon « ${p.label} » appliqué !`);
                    }}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setIsStampModalOpen(true)}
                className="px-3 py-1.5 bg-[#0B2545] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Générateur Sceau / Tampon</span>
              </button>
            </div>

            <InteractiveDocumentCanvas
              title={`Ticket d'Entretien : ${postulant.codeIdCandidature}`}
              documentTypeLabel="Onglet 4 · Ticket d'Entretien"
              assetsConfig={assetsConfig}
              onChangeAssetsConfig={setAssetsConfig}
              uploadedAssetUrls={uploadedAssets}
              exclusiveVisualSet={{
                logo: effectiveEmployerLogo,
                signature: uploadedAssets.signature,
                cachet: uploadedAssets.cachet || postulant.cachetUrl,
                filigrane: uploadedAssets.filigrane,
                arrierePlan: uploadedAssets.arrierePlan,
                barcode: uploadedAssets.barcodeEmployeur,
                qrcode: uploadedAssets.qrcodeEmployeur
              }}
              htmlEmailContent={ticketHtmlEmail}
              onDownloadPdf={async () => {
                const { doc, filename } = await generateTicketEntretienPdf(ticketData, effectiveEmployerLogo);
                doc.save(filename);
                triggerToast('Ticket d’entretien PDF téléchargé !');
              }}
              onDownloadWord={() => {
                downloadWordDocument(
                  `Ticket_Entretien_${postulant.codeIdCandidature}`,
                  `Ticket Entretien - ${postulant.nomComplet}`,
                  ticketHtmlEmail
                );
                triggerToast('Ticket exporté en Word !');
              }}
              onDownloadHtml={(html) => downloadHtmlFile(`Ticket_${postulant.codeIdCandidature}.html`, html)}
              onOpenInWebmail={onOpenInWebmail}
            >
              <div className="border-2 border-dashed border-[#D4A017] rounded-xl p-5 bg-[#FEFCF6] space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <BrandLogo companyName={postulant.nomEntreprise} customLogoUrl={effectiveEmployerLogo} size="header" />
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 uppercase block">Code ID Candidature</span>
                    <span className="font-mono font-bold text-[#0066B3] text-base">{postulant.codeIdCandidature}</span>
                  </div>
                </div>
                {!postulant.ticketValide && (
                  <div className="bg-red-50 border border-red-300 rounded-lg p-2.5 text-center text-xs font-bold text-red-700">
                    ⚠️ TICKET D’ENTRETIEN PROVISOIRE — NON VALIDE POUR L'ACCÈS
                  </div>
                )}
                <div className="flex gap-4 text-xs">
                  {postulant.photoUrl && (
                    <img src={postulant.photoUrl} alt="Candidat" className="w-24 h-28 rounded-lg object-cover border" />
                  )}
                  <div contentEditable suppressContentEditableWarning className="grid grid-cols-2 gap-2 flex-1 outline-none">
                    <div><span className="text-slate-500 block">Candidat :</span><strong>{postulant.nomComplet}</strong></div>
                    <div><span className="text-slate-500 block">Nationalité :</span><strong>{postulant.nationalite}</strong></div>
                    <div><span className="text-slate-500 block">Poste :</span><strong>{postulant.intitulePoste} (CNP {postulant.codeCnp})</strong></div>
                    <div><span className="text-slate-500 block">Date &amp; Heure :</span><strong>{postulant.dateEntretien} à {postulant.heureEntretien}</strong></div>
                  </div>
                </div>
              </div>
            </InteractiveDocumentCanvas>
          </div>
        )}

        {/* ONGLET 5 : OFFRE D'EMPLOI & ANNONCE CNP (AVEC CONVERTISSEUR 3 FENÊTRES) */}
        {activeManualTab === 'offre' && (
          <InteractiveDocumentCanvas
            title={`Offre d'Emploi CNP ${postulant.codeCnp} : ${jobOffer.titrePoste}`}
            documentTypeLabel="Onglet 5 · Offre & Avantages BC"
            assetsConfig={assetsConfig}
            onChangeAssetsConfig={setAssetsConfig}
            uploadedAssetUrls={uploadedAssets}
            exclusiveVisualSet={{
              logo: effectiveEmployerLogo,
              signature: uploadedAssets.signature,
              cachet: uploadedAssets.cachet,
              filigrane: uploadedAssets.filigrane,
              arrierePlan: uploadedAssets.arrierePlan,
              barcode: uploadedAssets.barcodeEmployeur,
              qrcode: uploadedAssets.qrcodeEmployeur
            }}
            htmlEmailContent={offreHtmlEmail}
            onDownloadPdf={async () => {
              await downloadJobOfferPdf(jobOffer, effectiveEmployerLogo);
              triggerToast('Offre CNP PDF téléchargée !');
            }}
            onDownloadWord={() => {
              downloadWordDocument(`Offre_CNP_${jobOffer.reference}`, jobOffer.titrePoste, offreHtmlEmail);
              triggerToast('Offre exportée en Word !');
            }}
            onDownloadHtml={(html) => downloadHtmlFile(`Offre_${jobOffer.reference}.html`, html)}
            onOpenInWebmail={onOpenInWebmail}
          >
            <div contentEditable suppressContentEditableWarning className="space-y-3 text-xs sm:text-sm outline-none">
              <h3 className="font-bold text-base text-[#0066B3]">{jobOffer.titrePoste} (CNP {postulant.codeCnp})</h3>
              <p><strong>Réf :</strong> {jobOffer.reference}</p>
              <p><strong>Rémunération horaire :</strong> {jobOffer.salaireMin.toFixed(2)} $ à {jobOffer.salaireMax.toFixed(2)} $ CAD / h</p>
              <div className="pt-2 border-t">
                <span className="font-bold text-slate-900 block mb-2">7 Avantages Sociaux de Colombie-Britannique :</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {CANADIAN_STANDARD_BENEFITS.map((b, idx) => (
                    <div key={idx} className="p-2 rounded border border-slate-200 bg-slate-50">✓ {b}</div>
                  ))}
                </div>
              </div>
            </div>
          </InteractiveDocumentCanvas>
        )}

        {/* ONGLET 6 : 5 MODÈLES DE DESIGN (AVEC CONVERTISSEUR 3 FENÊTRES) */}
        {activeManualTab === 'models5' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
              {designModelLabels.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setSelectedDesignModelId(m.id);
                    triggerToast(`Modèle visuel « ${m.title} » activé !`);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedDesignModelId === m.id
                      ? 'bg-blue-50 border-[#0066B3] ring-2 ring-blue-500/20'
                      : 'bg-white border-slate-200 hover:border-blue-400'
                  }`}
                >
                  <span className="font-bold text-slate-900 block">{m.title}</span>
                  <span className="text-[11px] text-slate-500 mt-1 block">{m.desc}</span>
                </button>
              ))}
            </div>

            <InteractiveDocumentCanvas
              title={`Modèle de Design #${selectedDesignModelId} — ${postulant.nomComplet}`}
              documentTypeLabel="Onglet 6 · 5 Modèles Visuels"
              assetsConfig={assetsConfig}
              onChangeAssetsConfig={setAssetsConfig}
              uploadedAssetUrls={uploadedAssets}
              exclusiveVisualSet={{
                logo: effectiveEmployerLogo,
                signature: uploadedAssets.signature,
                cachet: uploadedAssets.cachet,
                filigrane: uploadedAssets.filigrane,
                arrierePlan: uploadedAssets.arrierePlan,
                barcode: uploadedAssets.barcodeEmployeur,
                qrcode: uploadedAssets.qrcodeEmployeur
              }}
              htmlEmailContent={models5HtmlEmail}
              onDownloadPdf={async () => {
                if (cricModelChoice === 'model1') {
                  const { doc, filename } = await generateModel1AttestationPdf(cricVars);
                  doc.save(filename);
                } else {
                  const { doc, filename } = await generateModel2ContratPdf(cricVars);
                  doc.save(filename);
                }
                triggerToast(`PDF Modèle Design #${selectedDesignModelId} téléchargé !`);
              }}
              onDownloadWord={() => {
                downloadWordDocument(
                  `Design_Model_${selectedDesignModelId}_${postulant.codeIdCandidature}`,
                  `Modèle Design ${selectedDesignModelId}`,
                  models5HtmlEmail
                );
              }}
              onDownloadHtml={(html) => downloadHtmlFile(`Design_Model_${selectedDesignModelId}.html`, html)}
              onOpenInWebmail={onOpenInWebmail}
            >
              <div contentEditable suppressContentEditableWarning className="space-y-3 text-xs sm:text-sm outline-none">
                <h3 className="font-bold text-base text-[#0B2545]">
                  {designModelLabels.find((m) => m.id === selectedDesignModelId)?.title}
                </h3>
                <p><strong>Entreprise :</strong> {postulant.nomEntreprise}</p>
                <p><strong>Candidat :</strong> {postulant.nomComplet} · {postulant.intitulePoste}</p>
                <p>Tous les visuels (logo, signature, cachet, filigrane) configurés dans le Panneau Réglages sont fidèlement appliqués à ce modèle.</p>
              </div>
            </InteractiveDocumentCanvas>
          </div>
        )}

        {/* ONGLET 7 : BUNDLE ASSEMBLÉ (COUVERTURE LIVRE AVEC CONVERTISSEUR 3 FENÊTRES) */}
        {activeManualTab === 'bundle' && (
          <InteractiveDocumentCanvas
            title={bundleCoverOptions.titreLivre}
            documentTypeLabel="Onglet 7 · Bundle Livre 4 Pages"
            assetsConfig={assetsConfig}
            onChangeAssetsConfig={setAssetsConfig}
            uploadedAssetUrls={uploadedAssets}
            exclusiveVisualSet={{
              logo: effectiveEmployerLogo,
              signature: uploadedAssets.signature,
              cachet: uploadedAssets.cachet,
              filigrane: uploadedAssets.filigrane,
              arrierePlan: uploadedAssets.arrierePlan,
              barcode: uploadedAssets.barcodeEmployeur,
              qrcode: uploadedAssets.qrcodeEmployeur
            }}
            htmlEmailContent={bundleHtmlEmail}
            onDownloadPdf={handleDownloadBundlePdf}
            onDownloadWord={() => {
              downloadWordDocument(`Bundle_${postulant.codeIdCandidature}`, bundleCoverOptions.titreLivre, bundleHtmlEmail);
            }}
            onDownloadHtml={(html) => downloadHtmlFile(`Bundle_${postulant.codeIdCandidature}.html`, html)}
            onOpenInWebmail={onOpenInWebmail}
          >
            <div contentEditable suppressContentEditableWarning className="p-6 border-4 border-[#D4A017] rounded-xl bg-slate-900 text-white text-center space-y-4 outline-none">
              <span className="text-xs uppercase tracking-widest text-[#D4A017] font-bold block">
                {postulant.nomEntreprise} · {bundleCoverOptions.annee}
              </span>
              <h2 className="text-xl font-black text-white">{bundleCoverOptions.titreLivre}</h2>
              <p className="text-xs text-slate-300">{bundleCoverOptions.sousTitre}</p>
              <div className="pt-4 border-t border-white/20 text-xs">
                <p><strong>Candidat :</strong> {postulant.nomComplet}</p>
                <p><strong>Poste :</strong> {postulant.intitulePoste} (CNP {postulant.codeCnp})</p>
                <p><strong>Réf :</strong> {postulant.codeIdCandidature}</p>
              </div>
            </div>
          </InteractiveDocumentCanvas>
        )}

        {/* ONGLET 8 : ÉDITEUR FORCUS WORD 2013 (AVEC CONVERTISSEUR 3 FENÊTRES INTÉGRÉ) */}
        {activeManualTab === 'forcus' && (
          <div className="space-y-4">
            <ForcusWordEditor
              settings={settings}
              initialTitle={`Document_${(postulant.nom || 'CANDIDAT').toUpperCase()}_${postulant.codeIdCandidature}`}
              initialHtmlContent={emailModel.html}
              onOpenInWebmail={onOpenInWebmail}
            />
          </div>
        )}

        {/* ONGLETS 9 À 12 : HÉBERGEMENT, NOTAIRE, INSPECTION HIR, DÉCLARATION SOLENNELLE */}
        {activeManualTab === 'heb_attestation' && renderHousingTabModule(9, 'heb_attestation')}
        {activeManualTab === 'heb_notaire' && renderHousingTabModule(10, 'heb_notaire')}
        {activeManualTab === 'heb_hir' && renderHousingTabModule(11, 'heb_hir')}
        {activeManualTab === 'heb_declaration' && renderHousingTabModule(12, 'heb_declaration')}

        {/* ONGLET 13 : FICHES ET DOC ES (15 MODÈLES ATS & AGENCE) */}
        {activeManualTab === 'doc_es' && (
          <div className="space-y-4">
            <FichesEtDocEsModule
              postulant={postulant}
              docEsData={docEsData}
              onChangeDocEsData={(upd) => {
                setDocEsData(upd);
                saveFichesDocEsData(postulant.id, upd);
              }}
              settings={settings}
              onOpenInWebmail={onOpenInWebmail}
              onToast={triggerToast}
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
                Chaque dossier sauvegardé conserve tous ses documents, paramètres d'hébergement et statuts
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
              Aucun postulant enregistré pour le moment. Cliquez sur "Génération Automatique" ou "Sauvegarder Dossier Maintenant".
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
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          p.casType === 'direct' ? 'bg-emerald-100 text-emerald-800' : 'bg-purple-100 text-purple-800'
                        }`}
                      >
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
          handleUploadAsset('cachet', dataUrl);
          setIsStampModalOpen(false);
          triggerToast('Tampon officiel appliqué et propagé au dossier !');
        }}
      />
    </div>
  );
};
