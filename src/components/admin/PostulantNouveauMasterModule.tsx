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
  CheckSquare,
  Palette,
  Search,
  Plus,
  Upload
} from 'lucide-react';
import QRCode from 'qrcode';
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
  generateTicketEntretienPdf,
  generateSmallStackedBarcodeCanvasDataUrl
} from '../../services/contractGenerationService';
import {
  JobOfferData,
  buildDefaultJobOfferForPoste,
  downloadJobOfferPdf,
  publishJobOffer,
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
import { EditableDocumentVisual } from '../common/EditableDocumentVisual';
import { ForcusWordEditor } from './ForcusWordEditor';
import { OfficialStampGeneratorModal } from './OfficialStampGeneratorModal';
import { BrandLogo } from '../BrandLogo';
import {
  getSavedPdfAssetsConfig,
  loadPdfAssetsConfigFromFirestore,
  savePdfAssetsConfigToFirestore,
  loadActorUploadedAssetsFromFirestore,
  saveActorUploadedAssetsToFirestore,
  normalizePdfAssetsConfig,
  DEFAULT_PDF_ASSETS_CONFIG,
  ImportedAssetKey,
  PdfAssetItemSettings,
  PdfImportedAssetsConfig,
  UploadedAssetUrlsMap,
  getSavedActorUploadedAssets,
  setSavedActorUploadedAssets,
  findDepartmentDefinition
} from '../../services/departmentsAndEmailService';
import { readAndOptimizeImageFile } from '../../services/imageTransparencyService';
import { PosteInputWithAnalyze } from '../common/PosteInputWithAnalyze';
import { PosteCatalogItem } from '../../services/posteCatalogService';
import { FichesEtDocEsModule } from './FichesEtDocEsModule';
import {
  FichesDocEsData,
  buildDefaultFichesDocEsData,
  saveFichesDocEsData,
  loadFichesDocEsData,
  generateSingleDocEsPdf
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
  getTabDocumentTitle,
  buildStructuredHousingDocument
} from '../../services/housingDocsService';
import { HousingAndDocEsStepWizard } from './HousingAndDocEsStepWizard';
import {
  LayoutTargetDocKey,
  LayoutTemplatesMap,
  getSavedLayoutTemplatesLocal,
  loadAllLayoutTemplatesFromFirestore,
  resolveEffectiveLayout
} from '../../services/layoutImitationService';

interface PostulantNouveauMasterModuleProps {
  settings: SiteSettings;
  employees?: Employee[];
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

type TopWorkspaceTab = 'form' | 'housing' | 'assets' | 'actions_db';

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

function wrapBasicEmailHtml(
  title: string,
  companyName: string,
  logoUrl: string | undefined,
  innerHtml: string,
  visuals?: {
    signatureUrl?: string;
    cachetUrl?: string;
    barcodeUrl?: string;
    qrUrl?: string;
    accentColor?: string;
  }
): string {
  const accent = visuals?.accentColor || '#0B2545';
  const authFooter =
    visuals?.signatureUrl || visuals?.cachetUrl || visuals?.barcodeUrl || visuals?.qrUrl
      ? `<tr>
          <td style="padding: 16px 24px; border-top: 1px solid #e2e8f0; background-color: #ffffff;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td valign="bottom">
                  ${visuals.signatureUrl ? `<img src="${visuals.signatureUrl}" alt="Signature" style="max-height: 46px; display: inline-block; margin-right: 14px;" />` : ''}
                  ${visuals.cachetUrl ? `<img src="${visuals.cachetUrl}" alt="Cachet officiel" style="max-height: 54px; display: inline-block;" />` : ''}
                </td>
                <td align="right" valign="bottom">
                  ${visuals.barcodeUrl ? `<img src="${visuals.barcodeUrl}" alt="Code-Barres" style="max-height: 36px; display: inline-block; margin-right: 10px;" />` : ''}
                  ${visuals.qrUrl ? `<img src="${visuals.qrUrl}" alt="QR Code" style="width: 48px; height: 48px; display: inline-block; border: 1px solid #e2e8f0; padding: 2px;" />` : ''}
                </td>
              </tr>
            </table>
          </td>
        </tr>`
      : '';

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
            <td style="background-color: ${accent}; color: #ffffff; padding: 20px 24px;">
              ${logoUrl ? `<img src="${logoUrl}" alt="${companyName}" style="max-height: 44px; background: #ffffff; padding: 4px; border-radius: 4px; margin-bottom: 10px; display: block;" />` : ''}
              <h2 style="margin: 0; font-size: 16px; color: #ffffff; font-family: Arial, sans-serif;">${title}</h2>
              <p style="margin: 4px 0 0 0; font-size: 11px; color: #FDE047; font-family: Arial, sans-serif;">${companyName}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px; color: #1e293b; font-size: 13px; line-height: 1.6; font-family: Arial, sans-serif;">
              ${innerHtml}
            </td>
          </tr>
          ${authFooter}
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
  employees = [],
  onOpenInWebmail,
  onEmployeeCreated,
  onBack
}) => {
  // Navigation claire de l'espace de saisie (4 onglets aérés)
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<TopWorkspaceTab>('form');
  const [selectedExistingMatricule, setSelectedExistingMatricule] = useState<string>('');

  // Postulant actif en cours d'édition
  const [postulant, setPostulant] = useState<PostulantInfo>(() =>
    buildDefaultPostulantInfo(settings, 'direct')
  );

  // Liste & filtre des postulants enregistrés
  const [savedPostulants, setSavedPostulants] = useState<PostulantInfo[]>([]);
  const [isSavedPostulantsLoading, setIsSavedPostulantsLoading] = useState(false);
  const [savedSearchQuery, setSavedSearchQuery] = useState('');

  // Méthode de travail : 'automatique' (1 Clic) ou 'manuel' (Pas à pas)
  const [executionMode, setExecutionMode] = useState<'automatique' | 'manuel'>('automatique');

  // Onglet actif du studio documentaire (01 à 13)
  const [activeManualTab, setActiveManualTab] = useState<ManualTabId>('dossier_kit');

  // Sous-onglets de l'espace Hébergement / DOC ES et Modèles de mise en page à imiter
  const [activeHousingFormSubTab, setActiveHousingFormSubTab] = useState<LayoutTargetDocKey>('t9');
  const [layoutTemplates, setLayoutTemplates] = useState<LayoutTemplatesMap>(() =>
    getSavedLayoutTemplatesLocal()
  );

  // Données exhaustives 15 Fiches DOC ES et Onglets 9–12
  const [docEsData, setDocEsData] = useState<FichesDocEsData>(() =>
    buildDefaultFichesDocEsData(postulant, settings)
  );
  const [housingData, setHousingData] = useState<HousingAndNotaryData>(() =>
    buildDefaultHousingAndNotaryData(postulant, settings)
  );

  // File d'actions automatiques (1 Clic)
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

  const [cricModelChoice, setCricModelChoice] = useState<'model1' | 'model2'>('model1');
  const [selectedDesignModelId, setSelectedDesignModelId] = useState<string>('1');
  const [customVisualText, setCustomVisualText] = useState<Record<string, string>>({});

  // Fichiers importés personnalisés (6 parties + outils auth)
  const [uploadedAssets, setUploadedAssets] = useState<UploadedAssetUrlsMap>(() => {
    const saved = getSavedActorUploadedAssets();
    return {
      logo: settings.logo_url,
      ...saved
    };
  });

  // Configuration avancée positions/dimensions/couleurs
  const [assetsConfig, setAssetsConfig] = useState<PdfImportedAssetsConfig>(() =>
    normalizePdfAssetsConfig(getSavedPdfAssetsConfig())
  );

  // Codes authentification live générés pour le ticket / documents
  const [liveBarcodeUrl, setLiveBarcodeUrl] = useState<string>('');
  const [liveQrCodeUrl, setLiveQrCodeUrl] = useState<string>('');

  const [isStampModalOpen, setIsStampModalOpen] = useState(false);
  const [stampTargetKey, setStampTargetKey] = useState<ImportedAssetKey>('cachet');
  const [selectedHousingVisual, setSelectedHousingVisual] = useState<string | null>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);
  const [isAutoExecuting, setIsAutoExecuting] = useState(false);
  const [isPublishingEntretien, setIsPublishingEntretien] = useState(false);
  const [isPublishingOffre, setIsPublishingOffre] = useState(false);

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
    setTimeout(() => setCopiedNotification(null), 4500);
  };

  // Chargement initial Firestore (config visuels, fichiers importés, modèles à imiter, liste postulants)
  useEffect(() => {
    loadPdfAssetsConfigFromFirestore().then((cfg) => {
      setAssetsConfig(normalizePdfAssetsConfig(cfg));
    });

    loadActorUploadedAssetsFromFirestore().then((cloudAssets) => {
      if (Object.keys(cloudAssets).length > 0) {
        setUploadedAssets((prev) => ({
          logo: settings.logo_url,
          ...prev,
          ...cloudAssets
        }));
      }
    });

    loadAllLayoutTemplatesFromFirestore().then((templates) => {
      if (Object.keys(templates).length > 0) {
        setLayoutTemplates(templates);
      }
    });

    loadPostulants();
  }, []);

  // Génération automatique du code-barres & QR code pour le ticket & les pièces officielles
  useEffect(() => {
    const code = postulant.codeIdCandidature || 'ENT-BC-2026-0001';
    const stacked = generateSmallStackedBarcodeCanvasDataUrl(code);
    setLiveBarcodeUrl(stacked);

    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://atlantictransport.ca';
    QRCode.toDataURL(`${origin}/entretien?code=${encodeURIComponent(code)}`, {
      width: 220,
      margin: 1,
      color: { dark: '#0B2545', light: '#FFFFFF' }
    })
      .then((qr) => setLiveQrCodeUrl(qr))
      .catch(() => {});
  }, [postulant.codeIdCandidature]);

  const loadPostulants = async () => {
    setIsSavedPostulantsLoading(true);
    try {
      const list = await fetchAllPostulants();
      setSavedPostulants(list);
    } finally {
      setIsSavedPostulantsLoading(false);
    }
  };

  const handleUpdateAssetsConfig = (nextCfg: PdfImportedAssetsConfig) => {
    const normalized = normalizePdfAssetsConfig(nextCfg);
    setAssetsConfig(normalized);
    void savePdfAssetsConfigToFirestore(normalized);
  };

  const handleLoadExistingEmployee = (matricule: string) => {
    setSelectedExistingMatricule(matricule);
    if (!matricule) return;
    const found = employees.find((e) => e.matricule === matricule);
    if (!found) return;

    const matchedDept = findDepartmentDefinition(found.departement);
    const horaireVal =
      found.salaire_horaire ||
      (found.salaire ? Math.round((found.salaire / 162.5) * 100) / 100 : postulant.salaireHoraire);
    const mensuelVal = found.salaire || Math.round(horaireVal * 162.5);
    const nomCompletVal = found.nom_complet || `${found.prenom} ${found.nom}`.trim();
    const parts = nomCompletVal.split(' ');
    const photoCandidate = found.photo_url || found.photo || '';

    setPostulant((prev) => ({
      ...prev,
      matricule: found.matricule,
      civilite: found.civilite || (found.sexe === 'Féminin' ? 'Madame' : 'Monsieur'),
      nomComplet: nomCompletVal,
      prenom: found.prenom || parts[0] || prev.prenom,
      nom: found.nom || parts.slice(1).join(' ') || prev.nom,
      email: found.email || prev.email,
      telephone: found.telephone || prev.telephone,
      adresse: found.adresse || prev.adresse,
      dateNaissance: found.date_naissance || prev.dateNaissance,
      nationalite: found.nationalite || prev.nationalite,
      numeroPieceIdentite: found.numero_piece_identite || prev.numeroPieceIdentite,
      contactUrgence: found.contact_urgence || prev.contactUrgence,
      intitulePoste: found.poste || prev.intitulePoste,
      departement: found.departement || prev.departement,
      typeContrat: found.type_contrat || prev.typeContrat,
      dateEffet: found.date_effet || found.date_embauche || prev.dateEffet,
      salaireHoraire: horaireVal,
      salaireMensuel: mensuelVal,
      horairesTravail: found.horaires || prev.horairesTravail,
      dureePeriodeEssai: found.duree_periode_essai || prev.dureePeriodeEssai,
      managerRecruteur: found.manager || prev.managerRecruteur,
      adresseEntreprise: found.lieu_travail || prev.adresseEntreprise,
      contactDocPhone: found.doc_contact_phone || prev.contactDocPhone,
      contactDocEmail: found.doc_contact_email || prev.contactDocEmail,
      numeroImmatriculationEntreprise: found.ni || prev.numeroImmatriculationEntreprise,
      responsabilitesMissions:
        Array.isArray(found.responsabilites) && found.responsabilites.length > 0
          ? found.responsabilites
          : matchedDept?.missions || prev.responsabilitesMissions,
      photoUrl: photoCandidate || prev.photoUrl,
      logoUrl: found.logo_url || prev.logoUrl,
      signatureUrl: found.signature_url || prev.signatureUrl,
      cachetUrl: found.cachet_url || prev.cachetUrl,
      filigraneUrl: found.filigrane_url || prev.filigraneUrl
    }));

    setHousingData((prev) => ({
      ...prev,
      employeurNumEnregistrement: found.ni || prev.employeurNumEnregistrement,
      employeurTel: found.doc_contact_phone || prev.employeurTel,
      employeurEmail: found.doc_contact_email || prev.employeurEmail,
      beneficiaireDateLieuNaissance: `${found.date_naissance || '1988-06-15'} — (${
        found.nationalite || postulant.nationalite
      })`,
      beneficiairePasseport: found.numero_piece_identite || prev.beneficiairePasseport,
      beneficiaireDateArriveePrevue: found.date_effet || found.date_embauche || prev.beneficiaireDateArriveePrevue,
      hebergementAdresseComplete: found.adresse_hebergement || prev.hebergementAdresseComplete,
      hebergementDateDisponibilite: found.date_effet || found.date_embauche || prev.hebergementDateDisponibilite
    }));

    setDocEsData((prev) => ({
      ...prev,
      specialiteMetier: found.poste || prev.specialiteMetier,
      pretentionsSalariales: `${mensuelVal.toLocaleString('fr-CA')} $ CAD / mois`
    }));

    if (photoCandidate || found.logo_url || found.signature_url || found.cachet_url || found.filigrane_url) {
      setUploadedAssets((prev) => {
        const next: UploadedAssetUrlsMap = {
          ...prev,
          ...(photoCandidate ? { photoCandidat: photoCandidate } : {}),
          ...(found.logo_url ? { logo: found.logo_url } : {}),
          ...(found.signature_url ? { signature: found.signature_url } : {}),
          ...(found.cachet_url ? { cachet: found.cachet_url } : {}),
          ...(found.filigrane_url ? { filigrane: found.filigrane_url } : {})
        };
        setSavedActorUploadedAssets(next);
        void saveActorUploadedAssetsToFirestore(next);
        return next;
      });
    }

    triggerToast(`Données de ${nomCompletVal} (${found.matricule}) chargées dans Postulant Nouveau.`);
  };

  const handleUploadAsset = (key: string, url: string) => {
    setUploadedAssets((prev) => {
      const next: UploadedAssetUrlsMap = { ...prev, [key]: url };
      setSavedActorUploadedAssets(next);
      // Persistance asynchrone Firestore en tâche de fond
      void saveActorUploadedAssetsToFirestore(next);
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

  const handlePrestataireFileUpload = async (
    key: 'logoPrestataire' | 'signaturePrestataire' | 'cachetPrestataire',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const optimized = await readAndOptimizeImageFile(file, { maxDimension: 900, quality: 0.9 });
      handleUploadAsset(key, optimized);
      triggerToast(`Fichier « ${file.name} » importé et synchronisé.`);
    } catch (err) {
      triggerToast(err instanceof Error ? err.message : 'Erreur import image prestataire');
    }
  };

  const handleCandidatePhotoUpload = async (file: File) => {
    try {
      const optimized = await readAndOptimizeImageFile(file, { maxDimension: 700, quality: 0.88 });
      setPostulant((prev) => ({ ...prev, photoUrl: optimized }));
      handleUploadAsset('photoCandidat', optimized);
      triggerToast('Photo d’identité importée et synchronisée.');
    } catch (err) {
      triggerToast(err instanceof Error ? err.message : 'Erreur import photo candidat');
    }
  };

  const handleSelectPrestatairePreset = (presetId: string) => {
    const updated = applyPrestatairePreset(cricVars, presetId);
    setCricVars(updated);
    if (updated.logoPrestataireUrl) handleUploadAsset('logoPrestataire', updated.logoPrestataireUrl);
    if (updated.signaturePrestataireUrl) handleUploadAsset('signaturePrestataire', updated.signaturePrestataireUrl);
    if (updated.cachetPrestataireUrl) handleUploadAsset('cachetPrestataire', updated.cachetPrestataireUrl);
    triggerToast('Cabinet partenaire sélectionné et paramètres mis à jour.');
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
      `Métier analysé${result.isNewlyCreated ? ' (ajouté au catalogue)' : ''} : CNP ${pItem.codeCnp} · ${pItem.departement}`
    );
  };

  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabsContainerRef.current) {
      tabsContainerRef.current.scrollBy({
        left: direction === 'left' ? -260 : 260,
        behavior: 'smooth'
      });
    }
  };

  // Synchronisation automatique et cohérente vers tous les sous-documents
  useEffect(() => {
    setCricVars((prev) => ({
      ...prev,
      nomEntrepriseCanada: postulant.nomEntreprise,
      adresseEntrepriseCanada: postulant.adresseEntreprise,
      representantNomEmployeur: postulant.representantEmployeurNom,
      representantTitreEmployeur: postulant.representantEmployeurTitre,
      signataireNomEmployeur: postulant.representantEmployeurNom,
      signataireTitreEmployeur: postulant.representantEmployeurTitre,
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
      lieuOuLien: postulant.lieuEntretien,
      statutDossier: postulant.ticketValide ? 'Validé Officiel' : 'Provisoire (Spécimen)'
    }));

    setJobOffer((prev) => ({
      ...prev,
      titrePoste: postulant.intitulePoste,
      departement: postulant.departement,
      salaireMin: postulant.salaireHoraire,
      salaireMax: Math.round(postulant.salaireHoraire * 1.2 * 10) / 10,
      reference: `OFF-${postulant.codeIdCandidature}`
    }));

    setHousingData((prev) => ({
      ...prev,
      beneficiairePasseport: postulant.numeroPieceIdentite || prev.beneficiairePasseport,
      employeurTel: postulant.contactDocPhone || prev.employeurTel,
      employeurEmail: postulant.contactDocEmail || prev.employeurEmail
    }));

    setDocEsData((prev) => ({
      ...prev,
      specialiteMetier: postulant.intitulePoste || prev.specialiteMetier
    }));
  }, [postulant, uploadedAssets.logo, uploadedAssets.signature, uploadedAssets.cachet, settings.logo_url]);

  const effectiveEmployerLogo = uploadedAssets.logo || settings.logo_url;
  const effectiveBarcode = uploadedAssets.barcodeEmployeur || liveBarcodeUrl;
  const effectiveQrCode = uploadedAssets.qrcodeEmployeur || liveQrCodeUrl;

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
      await saveActorUploadedAssetsToFirestore(uploadedAssets);
      await loadPostulants();
      triggerToast(`Dossier de ${saved.nomComplet} sauvegardé dans Firestore.`);
    } catch {
      triggerToast('Erreur lors de la sauvegarde du dossier.');
    }
  };

  const handleNewBlankPostulant = () => {
    const fresh = buildDefaultPostulantInfo(settings, postulant.casType);
    setPostulant(fresh);
    setHousingData(buildDefaultHousingAndNotaryData(fresh, settings));
    setDocEsData(buildDefaultFichesDocEsData(fresh, settings));
    setCustomVisualText({});
    setActiveWorkspaceTab('form');
    triggerToast('Nouveau dossier vierge prêt à être saisi.');
  };

  const handleDeletePostulant = async (id: string, name: string) => {
    if (!window.confirm(`Confirmez-vous la suppression du dossier de ${name} ?`)) return;
    await deletePostulantRecord(id);
    await loadPostulants();
    triggerToast(`Dossier de ${name} supprimé.`);
  };

  const handleSelectSavedPostulant = async (p: PostulantInfo) => {
    setPostulant(p);
    if (p.photoUrl) setUploadedAssets((prev) => ({ ...prev, photoCandidat: p.photoUrl }));
    const loadedDocEs = await loadFichesDocEsData(p.id, buildDefaultFichesDocEsData(p, settings));
    setDocEsData(loadedDocEs);
    setHousingData(buildDefaultHousingAndNotaryData(p, settings));
    setCustomVisualText({});
    setActiveWorkspaceTab('form');
    triggerToast(`Dossier de ${p.nomComplet} chargé.`);
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
      triggerToast('Bundle assemblé (4 Pages avec Couverture Livre) téléchargé.');
    } catch (err) {
      console.error(err);
      triggerToast('Erreur lors de la génération du bundle assemblé.');
    }
  };

  const handleDownloadHousingTabPdf = async (tabNumber: HousingTabNumber) => {
    const keyMap: Record<HousingTabNumber, string> = {
      9: 'heb_attestation',
      10: 'heb_notaire',
      11: 'heb_hir',
      12: 'heb_declaration'
    };
    const docKeyMap: Record<HousingTabNumber, LayoutTargetDocKey> = {
      9: 't9',
      10: 't10',
      11: 't11',
      12: 't12'
    };
    const { doc, filename } = await generateHousingTabPdf(
      tabNumber,
      housingData,
      postulant,
      assetsConfig,
      uploadedAssets,
      customVisualText[keyMap[tabNumber]],
      layoutTemplates[docKeyMap[tabNumber]]
    );
    doc.save(filename);
    triggerToast(`Onglet ${tabNumber} PDF téléchargé avec les visuels de l’acteur.`);
  };

  // EXÉCUTION AUTOMATIQUE COMPLÈTE (1 CLIC)
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
        await saveActorUploadedAssetsToFirestore(uploadedAssets);
        setPostulant(updated);
        executedActions.push('Dossier sauvegardé');
      }

      if (autoQueue.syncDocEs) {
        await saveFichesDocEsData(updated.id, docEsData);
        executedActions.push('15 Fiches DOC ES');
      }

      if (autoQueue.publishEntretien) {
        await publishPostulantToEntretien(updated, settings);
        executedActions.push('Entretien publié');
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
        executedActions.push('Salarié créé');
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
      triggerToast(`Génération Automatique terminée (${executedActions.join(' · ')})`);
    } catch (err) {
      console.error(err);
      triggerToast('Erreur lors de la génération automatique.');
    } finally {
      setIsAutoExecuting(false);
    }
  };

  const handlePublishToEntretien = async () => {
    setIsPublishingEntretien(true);
    try {
      await publishPostulantToEntretien(postulant, settings);
      triggerToast(`Session publiée sur Entretien d’Embauche (Code : ${postulant.codeIdCandidature}).`);
    } catch {
      triggerToast('Erreur lors de la publication vers Entretien.');
    } finally {
      setIsPublishingEntretien(false);
    }
  };

  const handleAddOffreToNosOffres = async () => {
    setIsPublishingOffre(true);
    try {
      const todayIso = new Date().toISOString().split('T')[0];
      const baseMin = postulant.salaireHoraire || jobOffer.salaireMin || 28.5;
      const baseMax = Math.round(baseMin * 1.2 * 10) / 10;
      const offerToPublish: JobOfferData = {
        ...jobOffer,
        id: jobOffer.id || `offre-${postulant.codeIdCandidature}`,
        reference: jobOffer.reference || `OFF-${postulant.codeIdCandidature}`,
        titrePoste: postulant.intitulePoste || jobOffer.titrePoste,
        departement: postulant.departement || jobOffer.departement,
        companyName: postulant.nomEntreprise || jobOffer.companyName || settings.company_name,
        typeContrat:
          postulant.typeContrat === 'CDD'
            ? 'Contrat à Durée Déterminée (CDD) — Temps plein'
            : 'Contrat à Durée Indéterminée (CDI) — Temps plein',
        lieuTravail: postulant.adresseEntreprise || jobOffer.lieuTravail,
        horaires: postulant.horairesTravail || jobOffer.horaires,
        salaireMin: baseMin,
        salaireMax: baseMax,
        remuneration: `De ${baseMin.toFixed(2)} $ CAD à ${baseMax.toFixed(2)} $ CAD / heure (~${postulant.salaireMensuel.toLocaleString('fr-CA')} $ CAD / mois)`,
        missionsDetaillees:
          postulant.responsabilitesMissions && postulant.responsabilitesMissions.length > 0
            ? postulant.responsabilitesMissions
            : jobOffer.missionsDetaillees,
        contactEmail: postulant.contactDocEmail || settings.email || jobOffer.contactEmail,
        contactTelephone: postulant.contactDocPhone || settings.phone || jobOffer.contactTelephone,
        contactAdresse: postulant.adresseEntreprise || settings.address || jobOffer.contactAdresse,
        signatureUrl: uploadedAssets.signature || jobOffer.signatureUrl,
        cachetUrl: uploadedAssets.cachet || postulant.cachetUrl || jobOffer.cachetUrl,
        datePublicationIso: todayIso,
        estPublie: true,
        publishedAt: new Date().toISOString()
      };
      const published = await publishJobOffer(offerToPublish);
      setJobOffer(published);
      triggerToast(`Offre « ${published.titrePoste} » publiée dans « Nos Offres » avec succès !`);
    } catch (err) {
      console.error(err);
      triggerToast("Erreur lors de l'ajout de l'offre dans « Nos Offres ».");
    } finally {
      setIsPublishingOffre(false);
    }
  };

  const handleDownloadKitPdf = async () => {
    const { doc, filename } = await generatePostulantKitPdf(
      postulant,
      settings,
      customVisualText['dossier_kit']
    );
    doc.save(filename);
    triggerToast('Kit Candidat officiel téléchargé.');
  };

  const downloadHtmlFile = (filename: string, html: string) => {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    triggerToast(`Fichier ${filename} téléchargé.`);
  };

  const emailModel = generatePostulantEmailTemplate(postulant, settings);

  const sharedEmailVisuals = {
    signatureUrl: uploadedAssets.signature,
    cachetUrl: uploadedAssets.cachet || postulant.cachetUrl,
    barcodeUrl: effectiveBarcode,
    qrUrl: effectiveQrCode
  };

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
     </ul>`,
    sharedEmailVisuals
  );

  const ticketHtmlEmail = wrapBasicEmailHtml(
    `Coupon Convocation Entretien — ${postulant.codeIdCandidature}`,
    postulant.nomEntreprise,
    effectiveEmployerLogo,
    `<p><strong>Candidat :</strong> ${postulant.nomComplet} (${postulant.nationalite})</p>
     <p><strong>Poste visé :</strong> ${postulant.intitulePoste} (CNP ${postulant.codeCnp})</p>
     <p><strong>Date &amp; Heure :</strong> ${postulant.dateEntretien} à ${postulant.heureEntretien}</p>
     <p><strong>Modalité / Lieu :</strong> ${postulant.modaliteEntretien} — ${postulant.lieuEntretien}</p>
     <p><strong>Statut Ticket :</strong> ${postulant.ticketValide ? 'Ticket Officiel Validé & Scannable' : 'Ticket Provisoire (Spécimen)'}</p>`,
    sharedEmailVisuals
  );

  const offreHtmlEmail = wrapBasicEmailHtml(
    `Offre d'Emploi Officielle CNP ${postulant.codeCnp} — ${jobOffer.titrePoste}`,
    postulant.nomEntreprise,
    effectiveEmployerLogo,
    `<p><strong>Référence Offre :</strong> ${jobOffer.reference}</p>
     <p><strong>Rémunération :</strong> ${jobOffer.salaireMin.toFixed(2)} $ à ${jobOffer.salaireMax.toFixed(2)} $ CAD / h</p>
     <p><strong>Avantages sociaux Colombie-Britannique :</strong></p>
     <ul>${CANADIAN_STANDARD_BENEFITS.map((b) => `<li>${b}</li>`).join('')}</ul>`,
    sharedEmailVisuals
  );

  const designModelLabels = [
    { id: '1', title: '1. Exécutif Navy & Or', desc: 'Cadre doré diplomatique et sceau centré', accent: '#0B2545', borderClass: 'border-2 border-[#D4A017] bg-[#FDFCF8]' },
    { id: '2', title: '2. Moderne Azur', desc: 'Lignes épurées et en-tête azur', accent: '#0066B3', borderClass: 'border border-sky-300 bg-sky-50/30' },
    { id: '3', title: '3. Notarié & Fiduciaire', desc: 'Cadre double filet gris acier', accent: '#334155', borderClass: 'border-4 border-double border-slate-400 bg-slate-50' },
    { id: '4', title: '4. Fret & Logistique', desc: 'Cartouche industriel et codes-barres', accent: '#0F172A', borderClass: 'border-2 border-slate-800 bg-white' },
    { id: '5', title: '5. Protocole Canadien Bilingue', desc: 'En-tête rouge érable & accord bilatéral', accent: '#991B1B', borderClass: 'border-2 border-red-700/60 bg-red-50/15' }
  ];

  const activeDesignModel = designModelLabels.find((m) => m.id === selectedDesignModelId) || designModelLabels[0];

  const models5HtmlEmail = wrapBasicEmailHtml(
    `${activeDesignModel.title} — ${postulant.intitulePoste}`,
    postulant.nomEntreprise,
    effectiveEmployerLogo,
    `<p><strong>Gabarit sélectionné :</strong> ${activeDesignModel.title}</p>
     <p><strong>Candidat :</strong> ${postulant.nomComplet} · Réf : ${postulant.codeIdCandidature}</p>
     <p>${activeDesignModel.desc}. Ce modèle intègre automatiquement le logo, la signature, le cachet, le filigrane et les codes d’authentification configurés.</p>`,
    { ...sharedEmailVisuals, accentColor: activeDesignModel.accent }
  );

  const bundleHtmlEmail = wrapBasicEmailHtml(
    bundleCoverOptions.titreLivre,
    postulant.nomEntreprise,
    effectiveEmployerLogo,
    `<h3 style="color: #0B2545;">${bundleCoverOptions.sousTitre}</h3>
     <p><strong>Candidat :</strong> ${postulant.nomComplet} · Réf : ${postulant.codeIdCandidature}</p>
     <p><strong>Poste :</strong> ${postulant.intitulePoste} (CNP ${postulant.codeCnp}) · Année ${bundleCoverOptions.annee}</p>`,
    sharedEmailVisuals
  );

  const ALL_DOCUMENT_TABS: {
    id: ManualTabId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    highlight?: boolean;
  }[] = [
    { id: 'dossier_kit', label: '01. Kit Candidat', icon: BookOpen },
    { id: 'contrat', label: '02. Contrat CRIC', icon: ShieldCheck },
    { id: 'promesse', label: '03. Promesse d’Embauche', icon: FileCheck2 },
    { id: 'ticket', label: '04. Ticket Entretien', icon: Ticket },
    { id: 'offre', label: '05. Offre & CNP', icon: Briefcase },
    { id: 'models5', label: '06. 5 Modèles Design', icon: Sparkles },
    { id: 'bundle', label: '07. Bundle Livre', icon: Layers },
    { id: 'forcus', label: '08. Éditeur FORCUS Word', icon: Edit3, highlight: true },
    { id: 'heb_attestation', label: '09. Attestation Hébergement', icon: Home, highlight: true },
    { id: 'heb_notaire', label: '10. Certificat Notaire BC', icon: Scale, highlight: true },
    { id: 'heb_hir', label: '11. Inspection Logement HIR', icon: ClipboardCheck, highlight: true },
    { id: 'heb_declaration', label: '12. Déclaration Solennelle', icon: ScrollText, highlight: true },
    { id: 'doc_es', label: '13. Fiches DOC ES (15 Modèles)', icon: FileText }
  ];

  const renderHousingTabModule = (tabNumber: HousingTabNumber, textKey: string) => {
    const actorAssets = getTabActorAssets(tabNumber, assetsConfig, uploadedAssets);
    const docKeyMap: Record<HousingTabNumber, LayoutTargetDocKey> = {
      9: 't9',
      10: 't10',
      11: 't11',
      12: 't12'
    };
    const activeLayout = layoutTemplates[docKeyMap[tabNumber]];
    const effectiveLayout = resolveEffectiveLayout(activeLayout);
    const bp = effectiveLayout?.spatialBlueprint;
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

    const cleanPlainContent = plainContent
      .replace(/^={5,}$/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    const useBlueprintLayout = Boolean(effectiveLayout && bp && !customVisualText[textKey]);
    const structuredModel = useBlueprintLayout
      ? buildStructuredHousingDocument(tabNumber, housingData, postulant)
      : null;

    const emailHtml = generateHousingTabEmailHtml(
      tabNumber,
      housingData,
      postulant,
      uploadedAssets,
      customVisualText[textKey],
      activeLayout
    );

    const activeAssetKeyMap: Partial<
      Record<'logo' | 'signature' | 'cachet' | 'filigrane' | 'arrierePlan' | 'barcode' | 'qrcode', ImportedAssetKey>
    > = {
      logo: actorAssets.logo.key as ImportedAssetKey,
      signature: actorAssets.signature.key as ImportedAssetKey,
      cachet: actorAssets.cachet.key as ImportedAssetKey,
      filigrane: actorAssets.filigrane.key as ImportedAssetKey,
      arrierePlan: actorAssets.arrierePlan.key as ImportedAssetKey,
      barcode: actorAssets.barcode.key as ImportedAssetKey,
      qrcode: actorAssets.qrcode.key as ImportedAssetKey
    };

    const updateActorAssetItem = (key: ImportedAssetKey, patch: Partial<PdfAssetItemSettings>) => {
      const currentItem = assetsConfig[key] || DEFAULT_PDF_ASSETS_CONFIG[key] || DEFAULT_PDF_ASSETS_CONFIG.logo;
      handleUpdateAssetsConfig({
        ...assetsConfig,
        [key]: { ...currentItem, ...patch }
      });
    };

    const resetActorAssetItem = (key: ImportedAssetKey) => {
      const def = DEFAULT_PDF_ASSETS_CONFIG[key] || DEFAULT_PDF_ASSETS_CONFIG.logo;
      handleUpdateAssetsConfig({
        ...assetsConfig,
        [key]: { ...def }
      });
    };

    const logoCfg = actorAssets.logo.cfg || assetsConfig.logo;
    const sigCfg = actorAssets.signature.cfg || assetsConfig.signature;
    const cachetCfg = actorAssets.cachet.cfg || assetsConfig.cachet;
    const qrCfg = actorAssets.qrcode.cfg || assetsConfig.qrcodeEmployeur;
    const barcodeCfg = actorAssets.barcode.cfg || assetsConfig.barcodeEmployeur;

    return (
      <InteractiveDocumentCanvas
        title={`${tabNumber}. ${title}`}
        documentTypeLabel={`Onglet ${tabNumber} · Acteur Exclusif`}
        assetsConfig={assetsConfig}
        onChangeAssetsConfig={handleUpdateAssetsConfig}
        uploadedAssetUrls={uploadedAssets}
        activeAssetKeyMap={activeAssetKeyMap}
        layoutTemplate={activeLayout}
        hideGenericChrome={useBlueprintLayout}
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
          await downloadHousingTabWordDocx(
            tabNumber,
            housingData,
            postulant,
            customVisualText[textKey],
            activeLayout,
            uploadedAssets,
            assetsConfig
          );
          triggerToast(`Onglet ${tabNumber} exporté au format Word (.docx).`);
        }}
        onDownloadHtml={(html) => downloadHtmlFile(`Onglet_${tabNumber}_${postulant.codeIdCandidature}.html`, html)}
        onOpenInWebmail={onOpenInWebmail}
        onTextEdited={(txt) => setCustomVisualText((prev) => ({ ...prev, [textKey]: txt }))}
        hasCustomText={Boolean(customVisualText[textKey])}
        onResetText={() =>
          setCustomVisualText((prev) => {
            const copy = { ...prev };
            delete copy[textKey];
            return copy;
          })
        }
      >
        {useBlueprintLayout && structuredModel && effectiveLayout && bp ? (
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedHousingVisual(null);
            }}
            className="flex-1 flex flex-col justify-between outline-none min-h-[980px] text-slate-900 relative"
            style={{
              fontSize: tabNumber === 11 ? '10.5px' : '11.5px',
              lineHeight: tabNumber === 11 ? 1.35 : 1.48,
              borderLeft: bp.hasLeftAccentStripe ? `6px solid ${effectiveLayout.primaryColor}` : undefined,
              paddingLeft: bp.hasLeftAccentStripe ? '14px' : undefined
            }}
          >
            {/* Bandeau fin supérieur si top_accent_bar */}
            {bp.headerLayout === 'top_accent_bar' && (
              <div
                className="-mx-4 -mt-4 mb-3 h-2"
                style={{ backgroundColor: effectiveLayout.primaryColor }}
              />
            )}

            <div contentEditable suppressContentEditableWarning className="space-y-4 outline-none cursor-text">
              {/* ZONE 1 : En-tête dynamiquement aligné sur le SpatialBlueprint du fichier importé */}
              {bp.headerLayout === 'filled_banner' ? (
                <div
                  className="p-4 rounded-sm flex items-center justify-between gap-4 text-white"
                  style={{
                    backgroundColor: effectiveLayout.headerBgColor || effectiveLayout.primaryColor,
                    borderBottom: `3px solid ${effectiveLayout.accentColor}`
                  }}
                >
                  <div className="flex items-center gap-3">
                    {actorAssets.logo.url ? (
                      <div className="bg-white p-1.5 rounded-sm">
                        <EditableDocumentVisual
                          src={actorAssets.logo.url}
                          alt="Logo officiel"
                          label="Logo"
                          settings={logoCfg}
                          isSelected={selectedHousingVisual === `${tabNumber}_logo`}
                          onSelect={() => setSelectedHousingVisual(`${tabNumber}_logo`)}
                          onUpdateSettings={(patch) => updateActorAssetItem(actorAssets.logo.key as ImportedAssetKey, patch)}
                          onReset={() => resetActorAssetItem(actorAssets.logo.key as ImportedAssetKey)}
                          defaultWidthPx={150}
                          defaultHeightPx={48}
                        />
                      </div>
                    ) : (
                      <div className="font-extrabold text-lg tracking-tight">{postulant.nomEntreprise}</div>
                    )}
                  </div>
                  <div className="text-right text-[10.5px]">
                    <div className="font-bold">{structuredModel.superLabel}</div>
                    <div className="opacity-85">Dossier n° {postulant.codeIdCandidature}</div>
                  </div>
                </div>
              ) : bp.headerLayout === 'centered_stack' ? (
                <div
                  className="flex flex-col items-center text-center gap-2 pb-3"
                  style={{
                    borderBottom: bp.headerHasDivider ? `2px solid ${effectiveLayout.primaryColor}` : undefined
                  }}
                >
                  {actorAssets.logo.url ? (
                    <EditableDocumentVisual
                      src={actorAssets.logo.url}
                      alt="Logo officiel"
                      label="Logo"
                      settings={logoCfg}
                      isSelected={selectedHousingVisual === `${tabNumber}_logo`}
                      onSelect={() => setSelectedHousingVisual(`${tabNumber}_logo`)}
                      onUpdateSettings={(patch) => updateActorAssetItem(actorAssets.logo.key as ImportedAssetKey, patch)}
                      onReset={() => resetActorAssetItem(actorAssets.logo.key as ImportedAssetKey)}
                      defaultWidthPx={170}
                      defaultHeightPx={56}
                    />
                  ) : (
                    <div className="font-extrabold text-xl tracking-tight" style={{ color: effectiveLayout.primaryColor }}>
                      {postulant.nomEntreprise}
                    </div>
                  )}
                  <div className="text-[10.5px] uppercase tracking-wider text-slate-600">{structuredModel.superLabel}</div>
                </div>
              ) : (
                <div
                  className={`flex items-start justify-between pb-2 ${
                    effectiveLayout.logoPlacement === 'top_right'
                      ? 'flex-row-reverse'
                      : effectiveLayout.logoPlacement === 'top_center'
                      ? 'flex-col items-center gap-2'
                      : ''
                  }`}
                  style={{
                    borderBottom: bp.headerHasDivider
                      ? `2px solid ${effectiveLayout.accentColor || effectiveLayout.primaryColor}`
                      : undefined
                  }}
                >
                  <div>
                    {actorAssets.logo.url ? (
                      <EditableDocumentVisual
                        src={actorAssets.logo.url}
                        alt="Logo officiel"
                        label="Logo"
                        settings={logoCfg}
                        isSelected={selectedHousingVisual === `${tabNumber}_logo`}
                        onSelect={() => setSelectedHousingVisual(`${tabNumber}_logo`)}
                        onUpdateSettings={(patch) => updateActorAssetItem(actorAssets.logo.key as ImportedAssetKey, patch)}
                        onReset={() => resetActorAssetItem(actorAssets.logo.key as ImportedAssetKey)}
                        defaultWidthPx={180}
                        defaultHeightPx={56}
                      />
                    ) : (
                      <div className="font-extrabold text-xl tracking-tight" style={{ color: effectiveLayout.primaryColor }}>
                        {postulant.nomEntreprise}
                      </div>
                    )}
                  </div>
                  {bp.headerLayout === 'split_lr' ? (
                    <div className="text-right text-[10.5px] text-slate-700">
                      <div className="font-bold" style={{ color: effectiveLayout.primaryColor }}>
                        {structuredModel.superLabel}
                      </div>
                      <div>Dossier n° {postulant.codeIdCandidature}</div>
                    </div>
                  ) : bp.hasTopRightMarker ? (
                    <div className="w-3 h-3 border border-slate-300 flex items-center justify-center shrink-0 mt-1">
                      <div className="w-1.5 h-1.5 bg-slate-900" />
                    </div>
                  ) : null}
                </div>
              )}

              {/* ZONE 2 : Métadonnées selon metaLayout */}
              {(bp.metaLayout === 'two_col_asymmetric' || bp.metaLayout === 'two_col_equal') && (
                <div className="grid grid-cols-12 gap-4 pt-1">
                  <div className="col-span-6 space-y-0.5 text-[10.5px] leading-snug text-slate-800">
                    {structuredModel.senderLines.map((line, i) => (
                      <div key={i} className={i === 0 ? 'font-bold uppercase tracking-tight' : ''}>
                        {line}
                      </div>
                    ))}
                  </div>
                  <div
                    className={`col-span-6 ${
                      bp.metaLayout === 'two_col_asymmetric' ? 'pt-5 pl-6' : 'text-right'
                    } space-y-0.5 text-[10.5px] leading-snug text-slate-900`}
                  >
                    {structuredModel.recipientLines.map((line, i) => (
                      <div key={i} className={i === 0 ? 'font-bold uppercase' : ''}>
                        {line}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {bp.metaLayout === 'boxed_grid' && (
                <div className="grid grid-cols-2 border border-slate-300 bg-slate-50/70 text-[10.5px]">
                  <div className="p-2.5 border-r border-slate-300 space-y-0.5">
                    {structuredModel.senderLines.map((line, i) => (
                      <div key={i} className={i === 0 ? 'font-bold uppercase' : ''}>
                        {line}
                      </div>
                    ))}
                  </div>
                  <div className="p-2.5 space-y-0.5">
                    {structuredModel.recipientLines.map((line, i) => (
                      <div key={i} className={i === 0 ? 'font-bold uppercase' : ''}>
                        {line}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {bp.metaLayout === 'single_col_left' && (
                <div className="space-y-0.5 text-[10.5px] leading-snug text-slate-800">
                  {structuredModel.senderLines.slice(0, 3).map((line, i) => (
                    <div key={i} className={i === 0 ? 'font-bold uppercase' : ''}>
                      {line}
                    </div>
                  ))}
                  <div className="pt-1 font-semibold text-slate-900">
                    Bénéficiaire : {structuredModel.recipientLines.join(' · ')}
                  </div>
                </div>
              )}

              {/* ZONE 3 : Pastille "Vos références" UNIQUEMENT si détectée sur le modèle importé */}
              {bp.hasRefPill && (
                <div className="space-y-2 pt-1">
                  <div>
                    <span
                      className="inline-block px-2.5 py-0.5 rounded-sm font-bold text-[11px]"
                      style={{
                        backgroundColor: effectiveLayout.highlightTintColor || '#D8F3EB',
                        color: effectiveLayout.primaryColor || '#0B663A'
                      }}
                    >
                      {structuredModel.refPillLabel}
                    </span>
                  </div>
                  <div className="space-y-1 text-[10.5px]">
                    {structuredModel.refPairs.map((pair, idx) => (
                      <div key={idx} className="grid grid-cols-12 items-baseline">
                        <span className="col-span-4 text-slate-600">{pair.label}</span>
                        <span className="col-span-8 font-bold text-slate-900">: {pair.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ZONE 4 : Titre principal & Sous-titre guidés par SpatialBlueprint */}
              <div
                className={bp.titleHasBox ? 'py-2.5 px-4 rounded-sm my-2' : 'pt-3 pb-2'}
                style={{
                  textAlign: bp.titleAlign,
                  backgroundColor: bp.titleHasBox ? effectiveLayout.highlightTintColor : 'transparent',
                  border: bp.titleHasBox ? `1.5px solid ${effectiveLayout.primaryColor}` : undefined,
                  borderBottom: bp.titleHasUnderline
                    ? `2px solid ${effectiveLayout.accentColor}`
                    : bp.titleHasBox
                    ? `1.5px solid ${effectiveLayout.primaryColor}`
                    : undefined
                }}
              >
                <h2
                  className={`text-[17px] font-bold leading-tight ${bp.titleUppercase ? 'uppercase' : ''}`}
                  style={{ color: bp.titleHasBox ? effectiveLayout.primaryColor : '#0f172a' }}
                >
                  {structuredModel.mainTitle}
                </h2>
                {bp.titleHasSubtitle && (
                  <p className="text-[10.5px] tracking-wider uppercase text-slate-600 mt-1">
                    {structuredModel.mainSubtitle}
                  </p>
                )}
              </div>

              {/* ZONE 5 : Lignes d'introduction + paragraphes + tableau */}
              <div className="space-y-2.5 text-[11px] text-slate-800">
                <div className="space-y-0.5">
                  {structuredModel.introLines.map((line, idx) => {
                    const colonIdx = line.indexOf(':');
                    if (colonIdx > 0) {
                      return (
                        <p key={idx}>
                          <span>{line.slice(0, colonIdx + 1)}</span>
                          <strong className="font-bold text-slate-900">{line.slice(colonIdx + 1)}</strong>
                        </p>
                      );
                    }
                    return <p key={idx}>{line}</p>;
                  })}
                </div>

                {structuredModel.bodyParagraphs.map((para, idx) => (
                  <p
                    key={idx}
                    className={
                      bp.bodyLayout === 'cards'
                        ? 'p-2.5 rounded border border-slate-200 bg-slate-50/70 leading-[1.45]'
                        : bp.hasSectionDividers && idx < structuredModel.bodyParagraphs.length - 1
                        ? 'pb-2 border-b border-dashed border-slate-200 leading-[1.48]'
                        : 'leading-[1.48] text-slate-800'
                    }
                    style={{
                      borderLeft: bp.bodyLayout === 'cards' ? `3px solid ${effectiveLayout.primaryColor}` : undefined
                    }}
                  >
                    {para}
                  </p>
                ))}

                {structuredModel.summaryTable && (
                  <table className="w-full border-collapse text-[9.5px] mt-1">
                    <thead>
                      <tr
                        style={{
                          backgroundColor:
                            bp.tableHeaderStyle === 'filled_primary'
                              ? effectiveLayout.primaryColor
                              : bp.tableHeaderStyle === 'tinted'
                              ? effectiveLayout.highlightTintColor || '#D8F3EB'
                              : '#ffffff',
                          color:
                            bp.tableHeaderStyle === 'filled_primary'
                              ? '#ffffff'
                              : effectiveLayout.primaryColor || '#0B2545'
                        }}
                      >
                        {structuredModel.summaryTable.headers.map((h, i) => (
                          <th key={i} className="border border-slate-200 px-2 py-1 text-left font-bold">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {structuredModel.summaryTable.rows.map((row, rIdx) => (
                        <tr key={rIdx} className={rIdx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="border border-slate-200 px-2 py-0.5">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* ZONE 6 : Signatures avec visuels éditables Word-2013 */}
              <div
                className="pt-4 mt-2"
                style={{
                  borderTop: bp.signatureHasTopBorder ? '1px solid #cbd5e1' : undefined
                }}
              >
                {bp.signatureLayout === 'left_block' ? (
                  <div className="space-y-1.5 text-[11px] text-slate-900">
                    <div>{structuredModel.faitALine}</div>
                    <p className="font-bold">{structuredModel.signatoryHeading}</p>
                    <p className="text-[10.5px] text-slate-700">{structuredModel.signatorySubRole}</p>
                    <div className="flex items-center gap-3 py-1 min-h-[48px]">
                      {actorAssets.signature.url && (
                        <EditableDocumentVisual
                          src={actorAssets.signature.url}
                          alt="Signature"
                          label="Signature"
                          settings={sigCfg}
                          isSelected={selectedHousingVisual === `${tabNumber}_sig`}
                          onSelect={() => setSelectedHousingVisual(`${tabNumber}_sig`)}
                          onUpdateSettings={(patch) => updateActorAssetItem(actorAssets.signature.key as ImportedAssetKey, patch)}
                          onReset={() => resetActorAssetItem(actorAssets.signature.key as ImportedAssetKey)}
                          defaultWidthPx={130}
                          defaultHeightPx={48}
                        />
                      )}
                      {actorAssets.cachet.url && (
                        <EditableDocumentVisual
                          src={actorAssets.cachet.url}
                          alt="Cachet"
                          label="Cachet"
                          settings={cachetCfg}
                          isSelected={selectedHousingVisual === `${tabNumber}_cachet`}
                          onSelect={() => setSelectedHousingVisual(`${tabNumber}_cachet`)}
                          onUpdateSettings={(patch) => updateActorAssetItem(actorAssets.cachet.key as ImportedAssetKey, patch)}
                          onReset={() => resetActorAssetItem(actorAssets.cachet.key as ImportedAssetKey)}
                          defaultWidthPx={80}
                          defaultHeightPx={56}
                        />
                      )}
                    </div>
                    <p className="font-bold">{structuredModel.signatoryPrintedName}</p>
                  </div>
                ) : bp.signatureLayout === 'right_block' ? (
                  <div className="flex flex-col items-end text-right space-y-1.5 text-[11px] text-slate-900">
                    <div>{structuredModel.faitALine}</div>
                    <p className="font-bold">{structuredModel.signatoryHeading}</p>
                    <div className="flex items-center justify-end gap-3 py-1 min-h-[48px]">
                      {actorAssets.signature.url && (
                        <EditableDocumentVisual
                          src={actorAssets.signature.url}
                          alt="Signature"
                          label="Signature"
                          settings={sigCfg}
                          isSelected={selectedHousingVisual === `${tabNumber}_sig`}
                          onSelect={() => setSelectedHousingVisual(`${tabNumber}_sig`)}
                          onUpdateSettings={(patch) => updateActorAssetItem(actorAssets.signature.key as ImportedAssetKey, patch)}
                          onReset={() => resetActorAssetItem(actorAssets.signature.key as ImportedAssetKey)}
                          defaultWidthPx={130}
                          defaultHeightPx={48}
                        />
                      )}
                      {actorAssets.cachet.url && (
                        <EditableDocumentVisual
                          src={actorAssets.cachet.url}
                          alt="Cachet"
                          label="Cachet"
                          settings={cachetCfg}
                          isSelected={selectedHousingVisual === `${tabNumber}_cachet`}
                          onSelect={() => setSelectedHousingVisual(`${tabNumber}_cachet`)}
                          onUpdateSettings={(patch) => updateActorAssetItem(actorAssets.cachet.key as ImportedAssetKey, patch)}
                          onReset={() => resetActorAssetItem(actorAssets.cachet.key as ImportedAssetKey)}
                          defaultWidthPx={80}
                          defaultHeightPx={56}
                        />
                      )}
                    </div>
                    <p className="font-bold">{structuredModel.signatoryPrintedName}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-12 gap-4 items-start">
                    <div className="col-span-6 text-[11px] text-slate-900 pt-1">{structuredModel.faitALine}</div>
                    <div className="col-span-6 text-left space-y-1">
                      <p className="font-bold text-[11px] text-slate-900">{structuredModel.signatoryHeading}</p>
                      <p className="text-[10.5px] text-slate-700">{structuredModel.signatorySubRole}</p>
                      <div className="flex items-center gap-3 py-1 min-h-[48px]">
                        {actorAssets.signature.url && (
                          <EditableDocumentVisual
                            src={actorAssets.signature.url}
                            alt="Signature"
                            label="Signature"
                            settings={sigCfg}
                            isSelected={selectedHousingVisual === `${tabNumber}_sig`}
                            onSelect={() => setSelectedHousingVisual(`${tabNumber}_sig`)}
                            onUpdateSettings={(patch) => updateActorAssetItem(actorAssets.signature.key as ImportedAssetKey, patch)}
                            onReset={() => resetActorAssetItem(actorAssets.signature.key as ImportedAssetKey)}
                            defaultWidthPx={130}
                            defaultHeightPx={48}
                          />
                        )}
                        {actorAssets.cachet.url && (
                          <EditableDocumentVisual
                            src={actorAssets.cachet.url}
                            alt="Cachet"
                            label="Cachet"
                            settings={cachetCfg}
                            isSelected={selectedHousingVisual === `${tabNumber}_cachet`}
                            onSelect={() => setSelectedHousingVisual(`${tabNumber}_cachet`)}
                            onUpdateSettings={(patch) => updateActorAssetItem(actorAssets.cachet.key as ImportedAssetKey, patch)}
                            onReset={() => resetActorAssetItem(actorAssets.cachet.key as ImportedAssetKey)}
                            defaultWidthPx={80}
                            defaultHeightPx={56}
                          />
                        )}
                      </div>
                      <p className="font-bold text-[11px] text-slate-900">{structuredModel.signatoryPrintedName}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ZONE 7 : Pied de page légal piloté par footerLayout + QR/Barcode éditables */}
            {bp.footerLayout !== 'none' && (
              <div
                className={`pt-4 mt-6 flex items-end gap-4 ${
                  bp.footerLayout === 'centered_legal' ? 'justify-center text-center' : 'justify-between'
                }`}
                style={{
                  borderTop: bp.hasFooterDivider ? '1px solid #cbd5e1' : undefined
                }}
              >
                {bp.footerLayout === 'qr_legal_page' && actorAssets.qrcode.url && (
                  <div className="shrink-0">
                    <EditableDocumentVisual
                      src={actorAssets.qrcode.url}
                      alt="QR Code"
                      label="QR Code"
                      settings={qrCfg}
                      isSelected={selectedHousingVisual === `${tabNumber}_qr`}
                      onSelect={() => setSelectedHousingVisual(`${tabNumber}_qr`)}
                      onUpdateSettings={(patch) => updateActorAssetItem(actorAssets.qrcode.key as ImportedAssetKey, patch)}
                      onReset={() => resetActorAssetItem(actorAssets.qrcode.key as ImportedAssetKey)}
                      defaultWidthPx={44}
                      defaultHeightPx={44}
                    />
                  </div>
                )}
                <div className="flex-1 text-[8.5px] leading-snug text-slate-500">
                  {bp.footerLayout !== 'minimal_page' &&
                    structuredModel.footerLegalLines.map((line, i) => <div key={i}>{line}</div>)}
                </div>
                {bp.footerLayout !== 'centered_legal' && (
                  <div className="flex items-center gap-2 shrink-0 text-[10px] text-slate-600 font-semibold">
                    {bp.footerLayout === 'qr_legal_page' && actorAssets.barcode.url && (
                      <EditableDocumentVisual
                        src={actorAssets.barcode.url}
                        alt="Code-Barres"
                        label="Code-Barres"
                        settings={barcodeCfg}
                        isSelected={selectedHousingVisual === `${tabNumber}_bc`}
                        onSelect={() => setSelectedHousingVisual(`${tabNumber}_bc`)}
                        onUpdateSettings={(patch) => updateActorAssetItem(actorAssets.barcode.key as ImportedAssetKey, patch)}
                        onReset={() => resetActorAssetItem(actorAssets.barcode.key as ImportedAssetKey)}
                        defaultWidthPx={75}
                        defaultHeightPx={26}
                      />
                    )}
                    <span>1/1</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div
            contentEditable
            suppressContentEditableWarning
            className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap outline-none p-4 hover:bg-amber-50/40 rounded-lg cursor-text"
          >
            {cleanPlainContent}
          </div>
        )}
      </InteractiveDocumentCanvas>
    );
  };

  const filteredSavedPostulants = savedPostulants.filter((p) => {
    const q = savedSearchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      p.nomComplet.toLowerCase().includes(q) ||
      p.intitulePoste.toLowerCase().includes(q) ||
      p.codeIdCandidature.toLowerCase().includes(q)
    );
  });

  const checkedCount = Object.values(autoQueue).filter(Boolean).length;

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden font-sans">
      {/* 1. EN-TÊTE CLAIR ET ÉPURÉ */}
      <div className="bg-[#0B2545] text-white px-6 py-5 border-b border-[#163968] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer mt-0.5"
              title="Retour à la section précédente"
            >
              <ArrowLeft className="w-4 h-4 text-amber-300" />
            </button>
          )}
          <div className="p-2.5 rounded-xl bg-amber-400/15 border border-amber-300/30 shrink-0">
            <UserPlus className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
              POSTULANT NOUVEAU
            </h2>
            <p className="text-xs sm:text-sm text-blue-100 mt-1 tabular-nums">
              Dossier actif : <strong className="text-white">{postulant.nomComplet}</strong> · CNP {postulant.codeCnp} · Réf.{' '}
              <span className="font-mono text-amber-300">{postulant.codeIdCandidature}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => handleSavePostulant()}
            className="min-h-[42px] px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 cursor-pointer whitespace-nowrap"
          >
            <Save className="w-4 h-4 text-amber-300" />
            <span>Sauvegarder</span>
          </button>

          <button
            type="button"
            onClick={handlePublishToEntretien}
            disabled={isPublishingEntretien}
            className="min-h-[42px] px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            <Globe className="w-4 h-4" />
            <span>{isPublishingEntretien ? 'Publication...' : 'Publier Entretien'}</span>
          </button>

          <button
            type="button"
            onClick={handleAddOffreToNosOffres}
            disabled={isPublishingOffre}
            className="min-h-[42px] px-4 py-2 rounded-lg bg-[#0066B3] hover:bg-[#0284c7] text-white font-semibold text-xs sm:text-sm flex items-center gap-2 cursor-pointer disabled:opacity-50 whitespace-nowrap"
            title="Publier directement l'offre 05. Offre & CNP sur la page Nos Offres"
          >
            <Briefcase className="w-4 h-4 text-amber-300" />
            <span>{isPublishingOffre ? 'Ajout...' : 'Ajouté Offre'}</span>
          </button>

          <button
            type="button"
            onClick={handleRunAutomaticFullGeneration}
            disabled={isAutoExecuting}
            className="min-h-[42px] px-5 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-2 cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            {isAutoExecuting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>Génération Automatique ({checkedCount})</span>
          </button>
        </div>
      </div>

      {/* BARRE DE NOTIFICATION TOAST */}
      {copiedNotification && (
        <div className="bg-emerald-600 text-white text-xs sm:text-sm px-6 py-3 flex items-center justify-between font-semibold">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-100 shrink-0" />
            <span>{copiedNotification}</span>
          </div>
          <button
            type="button"
            onClick={() => setCopiedNotification(null)}
            className="text-xs underline cursor-pointer ml-4"
          >
            Fermer
          </button>
        </div>
      )}

      <div className="p-6 space-y-6">
        {/* SÉLECTEUR SALARIÉ EXISTANT DEPUIS "SALARIÉS & CONTRATS AUTO CDI/CDD" */}
        <div className="bg-blue-50/70 border border-blue-200 rounded-xl px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs sm:text-sm text-[#0B2545]">
            <UserCheck className="w-4 h-4 text-[#0066B3] shrink-0" />
            <div>
              <span className="font-bold">Pré-remplir depuis Salariés &amp; Contrats Auto CDI/CDD ({employees.length}) :</span>
              <span className="text-xs text-slate-600 block sm:inline sm:ml-1.5">
                Charge instantanément identité, poste, salaire, photo et logement d’un salarié enregistré.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={selectedExistingMatricule}
              onChange={(e) => handleLoadExistingEmployee(e.target.value)}
              className="w-full md:w-80 px-3.5 py-2 border border-blue-300 rounded-lg bg-white text-xs sm:text-sm font-semibold text-slate-900 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0066B3]/30"
            >
              <option value="">-- Sélectionner un salarié existant ({employees.length}) --</option>
              {employees.map((emp) => (
                <option key={emp.matricule} value={emp.matricule}>
                  {emp.nom_complet} ({emp.matricule}) — {emp.poste}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 2. BARRE DE CONTEXTE RAPIDE (CAS DE RECRUTEMENT + MÉTHODE + MODÈLE CRIC) */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-1 xl:grid-cols-3 gap-4 items-center">
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wide block">
              1. Cas de recrutement
            </span>
            <div className="inline-flex w-full sm:w-auto bg-white border border-slate-200 rounded-lg p-1 gap-1">
              <button
                type="button"
                onClick={() => setPostulant({ ...postulant, casType: 'direct' })}
                className={`flex-1 sm:flex-none px-3 py-2 text-xs font-bold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  postulant.casType === 'direct'
                    ? 'bg-[#0066B3] text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                En Direct
              </button>
              <button
                type="button"
                onClick={() => setPostulant({ ...postulant, casType: 'agence' })}
                className={`flex-1 sm:flex-none px-3 py-2 text-xs font-bold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  postulant.casType === 'agence'
                    ? 'bg-[#0066B3] text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Via Agence CRIC
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wide block">
              2. Modèle légal CRIC
            </span>
            <div className="inline-flex w-full sm:w-auto bg-white border border-slate-200 rounded-lg p-1 gap-1">
              <button
                type="button"
                onClick={() => setCricModelChoice('model1')}
                className={`flex-1 sm:flex-none px-3 py-2 text-xs font-bold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  cricModelChoice === 'model1'
                    ? 'bg-[#0B2545] text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Modèle 1 (Mandat)
              </button>
              <button
                type="button"
                onClick={() => setCricModelChoice('model2')}
                className={`flex-1 sm:flex-none px-3 py-2 text-xs font-bold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  cricModelChoice === 'model2'
                    ? 'bg-[#0B2545] text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Modèle 2 (8 Articles)
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wide block">
              3. Mode d’exécution
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex bg-white border border-slate-200 rounded-lg p-1 gap-1">
                <button
                  type="button"
                  onClick={() => setExecutionMode('automatique')}
                  className={`px-3 py-2 text-xs font-bold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    executionMode === 'automatique'
                      ? 'bg-amber-400 text-slate-950'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Automatique
                </button>
                <button
                  type="button"
                  onClick={() => setExecutionMode('manuel')}
                  className={`px-3 py-2 text-xs font-bold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    executionMode === 'manuel'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Pas à pas
                </button>
              </div>

              <button
                type="button"
                onClick={handleNewBlankPostulant}
                className="min-h-[38px] px-3 py-2 text-xs font-bold bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5 text-[#0066B3]" />
                <span>Nouveau dossier</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3. NAVIGATION DE SAISIE AÉRÉE (4 ONGLETS CLAIRS) */}
        <div className="border-b border-slate-200">
          <div className="flex flex-wrap gap-2 pb-3">
            {(
              [
                { id: 'form', label: '1. Candidat, Poste & CRIC', icon: UserCheck },
                { id: 'housing', label: '2. Hébergement, Notaire, HIR & DOC ES', icon: Home },
                { id: 'assets', label: '3. Visuels, Logos & Tampons (6 Parties)', icon: Palette },
                {
                  id: 'actions_db',
                  label: `4. Actions 1-Clic & Dossiers (${savedPostulants.length})`,
                  icon: FolderOpen
                }
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const isActive = activeWorkspaceTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveWorkspaceTab(tab.id)}
                  className={`min-h-[44px] px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap border ${
                    isActive
                      ? 'bg-[#0B2545] text-white border-[#0B2545]'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-amber-300' : 'text-[#0066B3]'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ONGLET SAISIE 1 : CANDIDAT, POSTE & CRIC                                  */}
        {/* ========================================================================= */}
        {activeWorkspaceTab === 'form' && (
          <div className="space-y-6">
            {/* BLOC A : POSTE & IMMIGRATION */}
            <section className="p-6 rounded-xl bg-slate-50/60 border border-slate-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
                <h3 className="text-base font-bold text-[#0B2545] flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-[#0066B3]" />
                  <span>Poste visé &amp; Démarche d’Immigration (LIPR / EIMT)</span>
                </h3>
                <span className="text-xs font-mono text-[#0066B3] font-bold">
                  Réf. : {cricVars.referenceEimtOuSuivi}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Code CNP (5 chiffres au Canada)
                  </label>
                  <input
                    type="text"
                    value={cricVars.codeCnp}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCricVars({ ...cricVars, codeCnp: val });
                      setPostulant({ ...postulant, codeCnp: val });
                    }}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white font-mono font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Type de démarche d’immigration
                  </label>
                  <select
                    value={cricVars.typeDemarche}
                    onChange={(e) =>
                      setCricVars({
                        ...cricVars,
                        typeDemarche: e.target.value as CricContractVariables['typeDemarche']
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-900"
                  >
                    <option value="EIMT">EIMT (Étude d’Impact sur le Marché du Travail)</option>
                    <option value="Volet des talents mondiaux">Volet des talents mondiaux (GTS)</option>
                    <option value="Dispense">Dispense d’EIMT / Mobilité Francophone</option>
                  </select>
                </div>
              </div>
            </section>

            {/* BLOC B : IDENTITÉ DU POSTULANT, CONTRAT & ENTRETIEN */}
            <section className="p-6 rounded-xl bg-white border border-slate-200 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
                <h3 className="text-base font-bold text-[#0B2545] flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-[#0066B3]" />
                  <span>Identité du Postulant, Contrat, Rémunération &amp; Entretien</span>
                </h3>
                <span className="text-xs text-slate-500">
                  Synchronisé automatiquement avec les 13 documents
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Civilité</label>
                  <select
                    value={postulant.civilite}
                    onChange={(e) =>
                      setPostulant({ ...postulant, civilite: e.target.value as 'Monsieur' | 'Madame' })
                    }
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg bg-white font-semibold"
                  >
                    <option value="Monsieur">Monsieur</option>
                    <option value="Madame">Madame</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Nom complet du candidat
                  </label>
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
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg font-bold bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Date de naissance
                  </label>
                  <input
                    type="text"
                    value={postulant.dateNaissance || ''}
                    onChange={(e) => setPostulant({ ...postulant, dateNaissance: e.target.value })}
                    placeholder="AAAA-MM-JJ"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nationalité</label>
                  <input
                    type="text"
                    value={postulant.nationalite}
                    onChange={(e) => setPostulant({ ...postulant, nationalite: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    N° Passeport / Pièce ID
                  </label>
                  <input
                    type="text"
                    value={postulant.numeroPieceIdentite || ''}
                    onChange={(e) => setPostulant({ ...postulant, numeroPieceIdentite: e.target.value })}
                    placeholder="Ex: C01294857"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg font-mono bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Téléphone</label>
                  <input
                    type="text"
                    value={postulant.telephone}
                    onChange={(e) => setPostulant({ ...postulant, telephone: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg font-mono bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={postulant.email}
                    onChange={(e) => setPostulant({ ...postulant, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Contact d’urgence
                  </label>
                  <input
                    type="text"
                    value={postulant.contactUrgence || ''}
                    onChange={(e) => setPostulant({ ...postulant, contactUrgence: e.target.value })}
                    placeholder="Nom & Tél urgence"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg bg-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Adresse complète du candidat
                  </label>
                  <input
                    type="text"
                    value={postulant.adresse}
                    onChange={(e) => setPostulant({ ...postulant, adresse: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Département</label>
                  <input
                    type="text"
                    value={postulant.departement}
                    onChange={(e) => setPostulant({ ...postulant, departement: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Code ID Candidature
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={postulant.codeIdCandidature}
                      onChange={(e) => setPostulant({ ...postulant, codeIdCandidature: e.target.value })}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg font-mono font-bold bg-white text-[#0066B3]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newId = `ENT-BC-2026-${Math.floor(1000 + Math.random() * 9000)}`;
                        setPostulant({ ...postulant, codeIdCandidature: newId });
                      }}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg text-slate-700 cursor-pointer shrink-0"
                      title="Générer un nouveau code"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Type de contrat
                  </label>
                  <select
                    value={postulant.typeContrat}
                    onChange={(e) => setPostulant({ ...postulant, typeContrat: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg bg-white font-semibold"
                  >
                    <option value="CDI">CDI (Durée Indéterminée)</option>
                    <option value="CDD">CDD (Durée Déterminée)</option>
                    <option value="Saisonnier">Saisonnier</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Date d’effet / Embauche
                  </label>
                  <input
                    type="text"
                    value={postulant.dateEffet}
                    onChange={(e) => setPostulant({ ...postulant, dateEffet: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Salaire horaire ($ CAD/h)
                  </label>
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
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg font-bold bg-white text-emerald-800 tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Salaire mensuel ($ CAD/mois)
                  </label>
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
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg font-bold bg-white text-emerald-800 tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Période d’essai
                  </label>
                  <input
                    type="text"
                    value={postulant.dureePeriodeEssai}
                    onChange={(e) => setPostulant({ ...postulant, dureePeriodeEssai: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Horaires de travail
                  </label>
                  <input
                    type="text"
                    value={postulant.horairesTravail || '40h / semaine'}
                    onChange={(e) => setPostulant({ ...postulant, horairesTravail: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Date d’entretien
                  </label>
                  <input
                    type="text"
                    value={postulant.dateEntretien}
                    onChange={(e) => setPostulant({ ...postulant, dateEntretien: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Heure d’entretien
                  </label>
                  <input
                    type="text"
                    value={postulant.heureEntretien}
                    onChange={(e) => setPostulant({ ...postulant, heureEntretien: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg font-mono bg-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Modalité d’entretien
                  </label>
                  <select
                    value={postulant.modaliteEntretien}
                    onChange={(e) =>
                      setPostulant({
                        ...postulant,
                        modaliteEntretien: e.target.value as PostulantInfo['modaliteEntretien']
                      })
                    }
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Visioconférence Teams Sécurisée">Visioconférence Teams Sécurisée</option>
                    <option value="Entretien Présentiel Siège Canada">Entretien Présentiel Siège Canada</option>
                    <option value="Session Mixte Siège & Visio">Session Mixte Siège &amp; Visio</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Lieu ou lien de l’entretien
                  </label>
                  <input
                    type="text"
                    value={postulant.lieuEntretien}
                    onChange={(e) => setPostulant({ ...postulant, lieuEntretien: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg bg-white"
                  />
                </div>
              </div>

              {/* Ticket Status + Photo Candidat + Bundle Titre */}
              <div className="pt-4 border-t border-slate-200 grid grid-cols-1 lg:grid-cols-3 gap-4 items-center">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="text-xs font-bold text-slate-700 block">
                    Version du Ticket (Onglet 4)
                  </span>
                  <div className="flex flex-wrap gap-3 text-xs">
                    <label className="flex items-center gap-1.5 cursor-pointer font-semibold">
                      <input
                        type="radio"
                        name="ticketValide"
                        checked={!postulant.ticketValide}
                        onChange={() => setPostulant({ ...postulant, ticketValide: false })}
                      />
                      <span className="text-amber-800">1. Provisoire (Spécimen)</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer font-semibold">
                      <input
                        type="radio"
                        name="ticketValide"
                        checked={postulant.ticketValide}
                        onChange={() => setPostulant({ ...postulant, ticketValide: true })}
                      />
                      <span className="text-emerald-800">2. Validé (Barcode actif)</span>
                    </label>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {postulant.photoUrl ? (
                      <img
                        src={postulant.photoUrl}
                        alt="Photo candidat"
                        className="w-12 h-12 rounded-lg object-cover border border-slate-300"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-white border border-dashed border-slate-300 flex items-center justify-center text-slate-400">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                    )}
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Photo d’identité</span>
                      <span className="text-[11px] text-slate-500">
                        {postulant.photoUrl ? 'Photo chargée' : 'PNG ou JPG recommandé'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <label className="px-3 py-2 bg-[#0066B3] hover:bg-[#005291] text-white rounded-lg text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{postulant.photoUrl ? 'Changer' : 'Importer'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = '';
                          if (file) void handleCandidatePhotoUpload(file);
                        }}
                      />
                    </label>
                    {postulant.photoUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setPostulant({ ...postulant, photoUrl: undefined });
                          handleUploadAsset('photoCandidat', '');
                        }}
                        className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 cursor-pointer"
                        title="Retirer la photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Titre Couverture Livre (Onglet 7)
                  </label>
                  <input
                    type="text"
                    value={bundleCoverOptions.titreLivre}
                    onChange={(e) => setBundleCoverOptions({ ...bundleCoverOptions, titreLivre: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-semibold"
                  />
                </div>
              </div>
            </section>

            {/* BLOC C : EMPLOYEUR (PARTIE 1) & PRESTATAIRE CRIC (PARTIE 2) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-sm">
              {/* PARTIE 1 : EMPLOYEUR */}
              <div className="p-6 rounded-xl bg-slate-50/70 border border-slate-200 space-y-4">
                <h3 className="font-bold text-base text-[#0B2545] flex items-center gap-2 border-b border-slate-200 pb-3">
                  <Building2 className="w-4 h-4 text-[#0066B3]" />
                  <span>Partie 1 : Entreprise Employeuse (Canada)</span>
                </h3>

                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Nom de l’entreprise employeuse
                    </label>
                    <input
                      type="text"
                      value={cricVars.nomEntrepriseCanada}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCricVars({ ...cricVars, nomEntrepriseCanada: val });
                        setPostulant({ ...postulant, nomEntreprise: val });
                      }}
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 bg-white font-bold"
                    />
                  </div>
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 pb-2.5 cursor-pointer whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={cricVars.showNomEntrepriseCanada}
                      onChange={(e) =>
                        setCricVars({ ...cricVars, showNomEntrepriseCanada: e.target.checked })
                      }
                      className="rounded text-[#0066B3]"
                    />
                    <span>Afficher</span>
                  </label>
                </div>

                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Province canadienne
                    </label>
                    <input
                      type="text"
                      value={cricVars.provinceCanadienne}
                      onChange={(e) =>
                        setCricVars({ ...cricVars, provinceCanadienne: e.target.value })
                      }
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 pb-2.5 cursor-pointer whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={cricVars.showProvinceCanadienne}
                      onChange={(e) =>
                        setCricVars({ ...cricVars, showProvinceCanadienne: e.target.checked })
                      }
                      className="rounded text-[#0066B3]"
                    />
                    <span>Afficher</span>
                  </label>
                </div>

                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Adresse complète au Canada
                    </label>
                    <input
                      type="text"
                      value={cricVars.adresseEntrepriseCanada}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCricVars({ ...cricVars, adresseEntrepriseCanada: val });
                        setPostulant({ ...postulant, adresseEntreprise: val });
                      }}
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 pb-2.5 cursor-pointer whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={cricVars.showAdresseEntrepriseCanada}
                      onChange={(e) =>
                        setCricVars({ ...cricVars, showAdresseEntrepriseCanada: e.target.checked })
                      }
                      className="rounded text-[#0066B3]"
                    />
                    <span>Afficher</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Représentant légal
                    </label>
                    <input
                      type="text"
                      value={cricVars.representantNomEmployeur}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCricVars({ ...cricVars, representantNomEmployeur: val });
                        setPostulant({ ...postulant, representantEmployeurNom: val });
                      }}
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 bg-white font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Titre / Fonction
                    </label>
                    <input
                      type="text"
                      value={cricVars.representantTitreEmployeur}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCricVars({ ...cricVars, representantTitreEmployeur: val });
                        setPostulant({ ...postulant, representantEmployeurTitre: val });
                      }}
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* PARTIE 2 : PRESTATAIRE CRIC */}
              <div className="p-6 rounded-xl bg-slate-50/70 border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <h3 className="font-bold text-base text-[#0B2545] flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Partie 2 : Cabinet Prestataire CRIC</span>
                  </h3>
                  <span className="text-[11px] text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded font-semibold">
                    Permis CNESST &amp; CCIC
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Cabinet Partenaire pré-configuré
                  </label>
                  <select
                    value={cricVars.prestatairePresetId}
                    onChange={(e) => handleSelectPrestatairePreset(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-900 cursor-pointer"
                  >
                    {PRESTATAIRES_PRESETS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nomLegal} — {p.statutJuridique} ({p.permisCnesst})
                      </option>
                    ))}
                    <option value="custom">Autre prestataire (Saisie manuelle)...</option>
                  </select>
                </div>

                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Nom légal du cabinet / Consultant
                    </label>
                    <input
                      type="text"
                      value={cricVars.nomPrestataireFrance}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCricVars({ ...cricVars, nomPrestataireFrance: val });
                        setPostulant({ ...postulant, nomAgence: val });
                      }}
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 bg-white font-bold"
                    />
                  </div>
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 pb-2.5 cursor-pointer whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={cricVars.showNomPrestataireFrance}
                      onChange={(e) =>
                        setCricVars({ ...cricVars, showNomPrestataireFrance: e.target.checked })
                      }
                      className="rounded text-[#0066B3]"
                    />
                    <span>Afficher</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Permis CNESST
                    </label>
                    <input
                      type="text"
                      value={cricVars.permisCnesst}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCricVars({ ...cricVars, permisCnesst: val });
                        setPostulant({ ...postulant, permisCnesst: val });
                      }}
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 bg-white font-mono text-emerald-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      N° Membre CCIC
                    </label>
                    <input
                      type="text"
                      value={cricVars.numeroMembreCcic}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCricVars({ ...cricVars, numeroMembreCcic: val });
                        setPostulant({ ...postulant, numeroCcic: val });
                      }}
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 bg-white font-mono text-emerald-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Mandataire / Signataire
                    </label>
                    <input
                      type="text"
                      value={cricVars.representantPrestataireNom}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCricVars({ ...cricVars, representantPrestataireNom: val });
                        setPostulant({ ...postulant, representantAgenceNom: val });
                      }}
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 bg-white font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Titre</label>
                    <input
                      type="text"
                      value={cricVars.representantPrestataireTitre}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCricVars({ ...cricVars, representantPrestataireTitre: val });
                        setPostulant({ ...postulant, representantAgenceTitre: val });
                      }}
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                </div>

                {postulant.casType === 'agence' && (
                  <label className="flex items-start gap-2.5 p-3 rounded-lg bg-blue-50 border border-blue-200 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={postulant.dispenseEntretienParGarantie}
                      onChange={(e) =>
                        setPostulant({ ...postulant, dispenseEntretienParGarantie: e.target.checked })
                      }
                      className="rounded text-[#0066B3] mt-0.5"
                    />
                    <span>
                      <strong className="block text-blue-950">
                        Garantie de compétences du Prestataire (Dispense d’entretien)
                      </strong>
                      <span className="text-blue-800">
                        Passe directement à l’étape contractuelle avec garantie CRIC.
                      </span>
                    </span>
                  </label>
                )}

                {/* Imports rapides Prestataire */}
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-xs font-bold text-slate-700 block mb-2">
                    Imports rapides du Prestataire (synchronisés avec l’onglet Visuels)
                  </span>
                  <div className="grid grid-cols-3 gap-2.5 text-center">
                    {[
                      {
                        key: 'logoPrestataire' as const,
                        label: 'Logo Cabinet',
                        src: uploadedAssets.logoPrestataire || cricVars.logoPrestataireUrl
                      },
                      {
                        key: 'signaturePrestataire' as const,
                        label: 'Signature',
                        src: uploadedAssets.signaturePrestataire || cricVars.signaturePrestataireUrl
                      },
                      {
                        key: 'cachetPrestataire' as const,
                        label: 'Cachet Officiel',
                        src: uploadedAssets.cachetPrestataire || cricVars.cachetPrestataireUrl
                      }
                    ].map((item) => (
                      <div
                        key={item.key}
                        className="p-2.5 rounded-lg border border-slate-200 bg-white flex flex-col items-center justify-between min-h-[94px]"
                      >
                        <span className="text-[11px] font-semibold text-slate-700">{item.label}</span>
                        {item.src ? (
                          <div className="relative my-1.5">
                            <img
                              src={item.src}
                              alt={item.label}
                              className="max-h-10 max-w-[80px] object-contain"
                            />
                            <button
                              type="button"
                              onClick={() => handleUploadAsset(item.key, '')}
                              className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center hover:bg-red-700 cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 my-auto">Aucun</span>
                        )}
                        <label className="w-full py-1 px-2 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded cursor-pointer block">
                          <span>{item.src ? 'Remplacer' : '+ Importer'}</span>
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
          </div>
        )}

        {/* ========================================================================= */}
        {/* ONGLET SAISIE 2 : HÉBERGEMENT, NOTAIRE, HIR & DOC ES (PARCOURS MULTI-ÉTAPES + IMITATION) */}
        {/* ========================================================================= */}
        {activeWorkspaceTab === 'housing' && (
          <HousingAndDocEsStepWizard
            activeDocKey={activeHousingFormSubTab}
            onChangeActiveDocKey={setActiveHousingFormSubTab}
            housingData={housingData}
            onChangeHousingData={setHousingData}
            docEsData={docEsData}
            onChangeDocEsData={(upd) => {
              setDocEsData(upd);
              void saveFichesDocEsData(postulant.id, upd);
            }}
            uploadedAssets={uploadedAssets}
            onUploadAsset={(key, url) => handleUploadAsset(key, url)}
            assetsConfig={assetsConfig}
            onChangeAssetsConfig={handleUpdateAssetsConfig}
            onOpenStampGenerator={(targetKey) => {
              setStampTargetKey(targetKey);
              setIsStampModalOpen(true);
            }}
            layoutTemplates={layoutTemplates}
            onUpdateLayoutTemplate={(docKey, tpl) =>
              setLayoutTemplates((prev) => {
                const next = { ...prev };
                if (tpl) next[docKey] = tpl;
                else delete next[docKey];
                return next;
              })
            }
            verificationCodeRef={postulant.codeIdCandidature}
            onJumpToStudioTab={(docKey) => {
              const targetTabMap: Record<LayoutTargetDocKey, ManualTabId> = {
                t9: 'heb_attestation',
                t10: 'heb_notaire',
                t11: 'heb_hir',
                t12: 'heb_declaration',
                doc_es: 'doc_es'
              };
              setActiveManualTab(targetTabMap[docKey]);
              triggerToast('Document ouvert dans le Studio Documentaire ci-dessous.');
            }}
            onDownloadDocPdf={async (docKey) => {
              if (docKey === 'doc_es') {
                const { doc, filename } = generateSingleDocEsPdf(
                  1,
                  postulant,
                  docEsData,
                  settings,
                  layoutTemplates.doc_es
                );
                doc.save(filename);
                triggerToast('Fiche DOC ES PDF (mise en page imitée) téléchargée.');
                return;
              }
              const tabNumMap: Record<'t9' | 't10' | 't11' | 't12', HousingTabNumber> = {
                t9: 9,
                t10: 10,
                t11: 11,
                t12: 12
              };
              await handleDownloadHousingTabPdf(tabNumMap[docKey]);
            }}
            onDownloadDocWord={async (docKey) => {
              if (docKey === 'doc_es') return;
              const tabNumMap: Record<'t9' | 't10' | 't11' | 't12', HousingTabNumber> = {
                t9: 9,
                t10: 10,
                t11: 11,
                t12: 12
              };
              const textKeyMap: Record<'t9' | 't10' | 't11' | 't12', string> = {
                t9: 'heb_attestation',
                t10: 'heb_notaire',
                t11: 'heb_hir',
                t12: 'heb_declaration'
              };
              await downloadHousingTabWordDocx(
                tabNumMap[docKey],
                housingData,
                postulant,
                customVisualText[textKeyMap[docKey]],
                layoutTemplates[docKey],
                uploadedAssets,
                assetsConfig
              );
              triggerToast(`Document Word (.docx) généré avec la mise en page imitée et visuels intégrés.`);
            }}
            onToast={triggerToast}
          />
        )}

        {/* ========================================================================= */}
        {/* ONGLET SAISIE 3 : VISUELS, LOGOS & TAMPONS (6 ACTEURS)                    */}
        {/* ========================================================================= */}
        {activeWorkspaceTab === 'assets' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
              <p className="text-xs sm:text-sm text-slate-700">
                Importez vos logos, signatures, cachets, filigranes et codes d’authentification par acteur : chaque réglage s’applique automatiquement sur les documents ci-dessous.
              </p>
              <button
                type="button"
                onClick={() => {
                  setStampTargetKey('cachet');
                  setIsStampModalOpen(true);
                }}
                className="min-h-[38px] px-4 py-2 bg-[#0B2545] hover:bg-[#134074] text-white rounded-lg text-xs font-bold flex items-center gap-2 cursor-pointer whitespace-nowrap"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Créer un Tampon Officiel</span>
              </button>
            </div>

            <PanneauReglagesFichiersImportes
              assetsConfig={assetsConfig}
              onChangeConfig={handleUpdateAssetsConfig}
              onUploadAsset={handleUploadAsset}
              uploadedAssetUrls={uploadedAssets}
              verificationCodeRef={postulant.codeIdCandidature}
              title="Panneau Visuels & Tampons — 6 Parties Officiels (Employeur, CRIC, Hébergement, Notaire, Inspecteur CM/HIR, Déclaration CER-CLT)"
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* ONGLET SAISIE 4 : ACTIONS 1-CLIC & BASE DE DONNÉES SAUVEGARDÉE            */}
        {/* ========================================================================= */}
        {activeWorkspaceTab === 'actions_db' && (
          <div className="space-y-6">
            {/* Checklist Génération Automatique */}
            <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-base font-bold text-[#0B2545] flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-[#0066B3]" />
                    <span>Actions exécutées par « Génération Automatique (1 Clic) »</span>
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Cochez uniquement les documents PDF et synchronisations à exécuter d’un seul clic.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const allTrue = Object.keys(autoQueue).reduce(
                        (acc, k) => ({ ...acc, [k]: true }),
                        {} as AutoActionQueue
                      );
                      setAutoQueue(allTrue);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-xs font-semibold text-slate-700 cursor-pointer"
                  >
                    Tout cocher
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const allFalse = Object.keys(autoQueue).reduce(
                        (acc, k) => ({ ...acc, [k]: false }),
                        {} as AutoActionQueue
                      );
                      setAutoQueue(allFalse);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-xs font-semibold text-slate-700 cursor-pointer"
                  >
                    Tout décocher
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                {(
                  [
                    { key: 'saveDossier', label: 'Enregistrer dossier (Firestore)' },
                    { key: 'syncDocEs', label: 'Synchroniser 15 Fiches DOC ES' },
                    { key: 'publishEntretien', label: 'Publier sur Entretien d’Embauche' },
                    { key: 'createEmployee', label: 'Enregistrer Salarié (EMP)' },
                    { key: 'downloadKitPdf', label: 'PDF 01 : Kit Candidat Complet' },
                    { key: 'downloadContratPdf', label: 'PDF 02 : Contrat CRIC' },
                    { key: 'downloadPromessePdf', label: 'PDF 03 : Promesse d’Embauche' },
                    { key: 'downloadTicketPdf', label: 'PDF 04 : Ticket d’Entretien' },
                    { key: 'downloadOffrePdf', label: 'PDF 05 : Offre d’Emploi CNP' },
                    { key: 'downloadBundlePdf', label: 'PDF 07 : Bundle Couverture Livre' },
                    { key: 'downloadTab9Pdf', label: 'PDF 09 : Attestation Hébergement' },
                    { key: 'downloadTab10Pdf', label: 'PDF 10 : Certificat Notarial' },
                    { key: 'downloadTab11Pdf', label: 'PDF 11 : Rapport Inspection HIR' },
                    { key: 'downloadTab12Pdf', label: 'PDF 12 : Déclaration Solennelle' }
                  ] as { key: keyof AutoActionQueue; label: string }[]
                ).map((item) => (
                  <label
                    key={item.key}
                    className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors ${
                      autoQueue[item.key]
                        ? 'bg-blue-50/70 border-[#0066B3]/40 text-[#0B2545]'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={autoQueue[item.key]}
                      onChange={(e) => setAutoQueue({ ...autoQueue, [item.key]: e.target.checked })}
                      className="rounded text-[#0066B3]"
                    />
                    <span className="font-semibold">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Base des dossiers enregistrés */}
            <div className="p-6 rounded-xl bg-white border border-slate-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div>
                  <h3 className="font-bold text-base text-[#0B2545] flex items-center gap-2">
                    <FolderOpen className="w-4 h-4 text-[#0066B3]" />
                    <span>Dossiers Postulants Enregistrés ({savedPostulants.length})</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Cliquez sur « Charger » pour reprendre ou modifier n’importe quel dossier existant.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={savedSearchQuery}
                      onChange={(e) => setSavedSearchQuery(e.target.value)}
                      placeholder="Rechercher nom, code..."
                      className="pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg bg-slate-50 focus:bg-white outline-none w-48 sm:w-60"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={loadPostulants}
                    className="p-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 cursor-pointer"
                    title="Rafraîchir la liste"
                  >
                    <RefreshCw className={`w-4 h-4 ${isSavedPostulantsLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {filteredSavedPostulants.length === 0 ? (
                <div className="text-center py-10 text-sm text-slate-500">
                  Aucun dossier trouvé. Cliquez sur « Sauvegarder » pour enregistrer le dossier actuel.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredSavedPostulants.map((p) => (
                    <div
                      key={p.id}
                      className={`p-4 rounded-xl border bg-white flex flex-col justify-between transition-all ${
                        p.id === postulant.id
                          ? 'border-[#0066B3] ring-2 ring-[#0066B3]/15'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-xs font-mono font-bold text-[#0066B3]">
                            {p.codeIdCandidature}
                          </span>
                          <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                              p.casType === 'direct'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                            }`}
                          >
                            {p.casType === 'direct' ? 'Direct' : 'Agence CRIC'}
                          </span>
                        </div>
                        <h5 className="font-bold text-sm text-slate-900">{p.nomComplet}</h5>
                        <p className="text-xs text-slate-600 line-clamp-1 mt-0.5">{p.intitulePoste}</p>
                        <p className="text-xs text-slate-500 font-mono mt-1 tabular-nums">
                          {p.salaireHoraire.toFixed(2)} $ CAD/h · {p.dateEntretien}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
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
                          className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer"
                          title="Supprimer ce dossier"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SÉPARATEUR VISUEL VERT OFFICIEL                                           */}
        {/* ========================================================================= */}
        <div className="w-full bg-[#10b981] py-3.5 px-4 rounded-xl text-center font-black tracking-widest text-slate-950 text-sm sm:text-base uppercase border border-emerald-400">
          RESULTAT CORRESPONDANT AU CDA FPR
        </div>

        {/* ========================================================================= */}
        {/* STUDIO DOCUMENTAIRE : NAVIGATION ENTRE LES 13 ONGLETS                     */}
        {/* ========================================================================= */}
        <div className="bg-slate-100 border border-slate-200 rounded-xl p-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => scrollTabs('left')}
            className="p-2 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer shrink-0"
            title="Défiler vers la gauche"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div
            ref={tabsContainerRef}
            className="flex gap-2 overflow-x-auto no-scrollbar scroll-smooth flex-1 py-0.5"
          >
            {ALL_DOCUMENT_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeManualTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveManualTab(tab.id)}
                  className={`min-h-[40px] px-3.5 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer shrink-0 border ${
                    isActive
                      ? 'bg-[#0B2545] text-white border-[#0B2545]'
                      : tab.highlight
                      ? 'bg-blue-50 text-[#2B579A] border-blue-200 hover:bg-blue-100'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-amber-300' : tab.highlight ? 'text-[#2B579A]' : 'text-[#0066B3]'
                    }`}
                  />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => scrollTabs('right')}
            className="p-2 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer shrink-0"
            title="Défiler vers la droite"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* CONTENU DES ONGLETS 01 À 13                                               */}
        {/* ========================================================================= */}

        {/* ONGLET 01 : KIT CANDIDAT COMPLET */}
        {activeManualTab === 'dossier_kit' && (
          <InteractiveDocumentCanvas
            title={`Kit Candidat : ${postulant.nomComplet} (${postulant.intitulePoste})`}
            documentTypeLabel="Onglet 01 · Kit Candidat Officiel"
            assetsConfig={assetsConfig}
            onChangeAssetsConfig={handleUpdateAssetsConfig}
            uploadedAssetUrls={uploadedAssets}
            exclusiveVisualSet={{
              logo: effectiveEmployerLogo,
              signature: uploadedAssets.signature,
              cachet: uploadedAssets.cachet,
              filigrane: uploadedAssets.filigrane,
              arrierePlan: uploadedAssets.arrierePlan,
              barcode: effectiveBarcode,
              qrcode: effectiveQrCode
            }}
            htmlEmailContent={emailModel.html}
            onDownloadPdf={handleDownloadKitPdf}
            onDownloadWord={() => {
              downloadWordDocument(
                `Kit_Candidat_${postulant.codeIdCandidature}`,
                `Kit Candidat Officiel - ${postulant.nomComplet}`,
                emailModel.html
              );
              triggerToast('Kit Candidat exporté au format Word (.docx).');
            }}
            onDownloadHtml={(html) => downloadHtmlFile(`Kit_Candidat_${postulant.codeIdCandidature}.html`, html)}
            onOpenInWebmail={onOpenInWebmail}
            onTextEdited={(text) => setCustomVisualText((prev) => ({ ...prev, dossier_kit: text }))}
            hasCustomText={Boolean(customVisualText['dossier_kit'])}
            onResetText={() =>
              setCustomVisualText((prev) => {
                const copy = { ...prev };
                delete copy['dossier_kit'];
                return copy;
              })
            }
          >
            <div
              contentEditable
              suppressContentEditableWarning
              className="space-y-4 font-sans text-sm text-slate-800 leading-relaxed whitespace-pre-wrap outline-none p-4 hover:bg-amber-50/40 rounded-lg cursor-text"
            >
              {customVisualText['dossier_kit'] ? (
                customVisualText['dossier_kit']
              ) : postulant.casType === 'direct' ? (
                <>
                  <h2 className="text-lg font-bold text-[#0B2545] border-b border-slate-200 pb-3">
                    DOSSIER D’ACCUEIL &amp; KIT D’ENTRETIEN OFFICIEL (RECRUTEMENT EN DIRECT)
                  </h2>
                  <p>
                    <strong>CANDIDAT :</strong> {postulant.civilite} {postulant.nomComplet} · Nationalité :{' '}
                    {postulant.nationalite}
                  </p>
                  <p>
                    <strong>POSTE CONVOQUÉ :</strong> {postulant.intitulePoste} (Code CNP {postulant.codeCnp})
                  </p>
                  <p>
                    <strong>DATE &amp; HEURE :</strong> {postulant.dateEntretien} à {postulant.heureEntretien}
                  </p>
                  <p>
                    <strong>MODALITÉ &amp; LIEU :</strong> {postulant.modaliteEntretien} · {postulant.lieuEntretien}
                  </p>
                  <p>
                    <strong>RÉMUNÉRATION :</strong> {postulant.salaireHoraire.toFixed(2)} $ CAD / h (~
                    {postulant.salaireMensuel.toLocaleString('fr-CA')} $ CAD / mois)
                  </p>
                  <p>
                    <strong>EMPLOYEUR :</strong> {postulant.nomEntreprise} — {postulant.adresseEntreprise}
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-lg font-bold text-[#0066B3] border-b border-slate-200 pb-3">
                    FICHE DE LIAISON TRIPARTITE &amp; KIT DE PRÉPARATION (AGENCE DE PLACEMENT CRIC)
                  </h2>
                  <p>
                    <strong>EMPLOYEUR :</strong> {postulant.nomEntreprise} ({postulant.adresseEntreprise})
                  </p>
                  <p>
                    <strong>PRESTATAIRE MANDATÉ :</strong> {postulant.nomAgence} (Permis CNESST{' '}
                    {postulant.permisCnesst} · CCIC {postulant.numeroCcic})
                  </p>
                  <p>
                    <strong>CANDIDAT :</strong> {postulant.nomComplet} · Réf. Dossier : {postulant.codeIdCandidature}
                  </p>
                  <p>
                    <strong>POSTE :</strong> {postulant.intitulePoste} (CNP {postulant.codeCnp})
                  </p>
                  <p>
                    <strong>STATUT ENTRETIEN :</strong>{' '}
                    {postulant.dispenseEntretienParGarantie
                      ? 'Dispense activée par garantie de compétences du Prestataire'
                      : `Entretien programmé le ${postulant.dateEntretien} à ${postulant.heureEntretien}`}
                  </p>
                </>
              )}
            </div>
          </InteractiveDocumentCanvas>
        )}

        {/* ONGLET 02 : CONTRAT DE TRAVAIL & PRESTATION CRIC */}
        {activeManualTab === 'contrat' && (
          <InteractiveDocumentCanvas
            title={`Contrat : ${
              cricModelChoice === 'model1' ? 'Attestation de Mandat CRIC' : 'Contrat Intégral 8 Articles'
            }`}
            documentTypeLabel="Onglet 02 · Contrat Légal CRIC"
            assetsConfig={assetsConfig}
            onChangeAssetsConfig={handleUpdateAssetsConfig}
            uploadedAssetUrls={uploadedAssets}
            exclusiveVisualSet={{
              logo: effectiveEmployerLogo,
              signature: uploadedAssets.signature,
              cachet: uploadedAssets.cachet,
              filigrane: uploadedAssets.filigrane,
              arrierePlan: uploadedAssets.arrierePlan,
              barcode: effectiveBarcode,
              qrcode: effectiveQrCode
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
              triggerToast('Contrat CRIC PDF téléchargé.');
            }}
            onDownloadWord={() => {
              const docTitle =
                cricModelChoice === 'model1'
                  ? 'Attestation de Mandat de Recrutement International'
                  : 'Contrat de Prestation de Services de Recrutement International';
              const content =
                customVisualText['contrat'] ||
                (cricModelChoice === 'model1'
                  ? generateModel1PlainText(cricVars)
                  : generateModel2PlainText(cricVars));
              downloadWordDocument(
                `${docTitle.replace(/\s+/g, '_')}_${cricVars.referenceEimtOuSuivi}`,
                docTitle,
                `<h1>${docTitle}</h1><pre style="white-space: pre-wrap;">${content}</pre>`
              );
              triggerToast('Contrat exporté au format Word (.docx).');
            }}
            onDownloadHtml={(html) => downloadHtmlFile(`Contrat_CRIC_${postulant.codeIdCandidature}.html`, html)}
            onOpenInWebmail={onOpenInWebmail}
            onTextEdited={(text) => setCustomVisualText((prev) => ({ ...prev, contrat: text }))}
            hasCustomText={Boolean(customVisualText['contrat'])}
            onResetText={() =>
              setCustomVisualText((prev) => {
                const copy = { ...prev };
                delete copy['contrat'];
                return copy;
              })
            }
          >
            <div className="space-y-6">
              <div
                contentEditable
                suppressContentEditableWarning
                className="font-mono text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap outline-none p-4 hover:bg-amber-50/40 rounded-lg cursor-text"
              >
                {customVisualText['contrat'] ||
                  (cricModelChoice === 'model1'
                    ? generateModel1PlainText(cricVars)
                    : generateModel2PlainText(cricVars))}
              </div>

              {/* Bloc Signatures & Visuels Bi-Partites (Employeur + Prestataire CRIC) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-5 border-t border-slate-200 text-xs">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
                  <span className="font-bold text-[#0B2545] block">Pour l’Employeur (Canada) :</span>
                  <span className="block text-slate-700 font-semibold">{cricVars.nomEntrepriseCanada}</span>
                  <span className="block text-slate-600">
                    {cricVars.representantNomEmployeur} — {cricVars.representantTitreEmployeur}
                  </span>
                  <div className="flex items-center gap-3 pt-2">
                    {uploadedAssets.signature && (
                      <img src={uploadedAssets.signature} alt="Signature Employeur" className="h-10 object-contain" />
                    )}
                    {uploadedAssets.cachet && (
                      <img src={uploadedAssets.cachet} alt="Cachet Employeur" className="h-14 object-contain" />
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-[#0066B3] block">Pour le Prestataire (CRIC) :</span>
                    {(uploadedAssets.logoPrestataire || cricVars.logoPrestataireUrl) && (
                      <img
                        src={uploadedAssets.logoPrestataire || cricVars.logoPrestataireUrl}
                        alt="Logo Cabinet"
                        className="h-8 object-contain"
                      />
                    )}
                  </div>
                  <span className="block text-slate-700 font-semibold">{cricVars.nomPrestataireFrance}</span>
                  <span className="block text-slate-600">
                    {cricVars.representantPrestataireNom} — {cricVars.representantPrestataireTitre}
                  </span>
                  <div className="flex items-center gap-3 pt-2">
                    {(uploadedAssets.signaturePrestataire || cricVars.signaturePrestataireUrl) && (
                      <img
                        src={uploadedAssets.signaturePrestataire || cricVars.signaturePrestataireUrl}
                        alt="Signature Prestataire"
                        className="h-10 object-contain"
                      />
                    )}
                    {(uploadedAssets.cachetPrestataire || cricVars.cachetPrestataireUrl) && (
                      <img
                        src={uploadedAssets.cachetPrestataire || cricVars.cachetPrestataireUrl}
                        alt="Cachet Prestataire"
                        className="h-14 object-contain"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </InteractiveDocumentCanvas>
        )}

        {/* ONGLET 03 : PROMESSE D'EMBAUCHE OFFICIELLE */}
        {activeManualTab === 'promesse' && (
          <InteractiveDocumentCanvas
            title={`Promesse d'Embauche : ${postulant.nomComplet}`}
            documentTypeLabel="Onglet 03 · Promesse d’Embauche"
            assetsConfig={assetsConfig}
            onChangeAssetsConfig={handleUpdateAssetsConfig}
            uploadedAssetUrls={uploadedAssets}
            exclusiveVisualSet={{
              logo: effectiveEmployerLogo,
              signature: uploadedAssets.signature,
              cachet: uploadedAssets.cachet,
              filigrane: uploadedAssets.filigrane,
              arrierePlan: uploadedAssets.arrierePlan,
              barcode: effectiveBarcode,
              qrcode: effectiveQrCode
            }}
            htmlEmailContent={promesseHtmlEmail}
            onDownloadPdf={async () => {
              await downloadPromesseEmbauchePdf(buildPromesseObj());
              triggerToast('Promesse d’embauche PDF téléchargée.');
            }}
            onDownloadWord={() => {
              downloadWordDocument(
                `Promesse_Embauche_${postulant.codeIdCandidature}`,
                `Promesse Unilatérale d'Embauche - ${postulant.nomComplet}`,
                promesseHtmlEmail
              );
              triggerToast('Promesse d’embauche exportée en Word (.docx).');
            }}
            onDownloadHtml={(html) => downloadHtmlFile(`Promesse_Embauche_${postulant.codeIdCandidature}.html`, html)}
            onOpenInWebmail={onOpenInWebmail}
            onTextEdited={(txt) => setCustomVisualText((prev) => ({ ...prev, promesse: txt }))}
            hasCustomText={Boolean(customVisualText['promesse'])}
            onResetText={() =>
              setCustomVisualText((prev) => {
                const copy = { ...prev };
                delete copy['promesse'];
                return copy;
              })
            }
          >
            <div className="space-y-5 text-sm text-slate-800 leading-relaxed font-sans">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <BrandLogo companyName={postulant.nomEntreprise} customLogoUrl={effectiveEmployerLogo} size="header" />
                <div className="text-right">
                  <span className="font-bold text-[#0B2545] uppercase block">
                    PROMESSE UNILATÉRALE D’EMBAUCHE
                  </span>
                  <span className="text-slate-500 font-mono text-xs">Date : {postulant.dateEffet}</span>
                </div>
              </div>
              <div contentEditable suppressContentEditableWarning className="outline-none space-y-4">
                {customVisualText['promesse'] ? (
                  <div className="whitespace-pre-wrap">{customVisualText['promesse']}</div>
                ) : (
                  <>
                    <p>
                      <strong>À l’attention de :</strong> {postulant.civilite} {postulant.nomComplet}
                      <br />
                      Demeurant au : {postulant.adresse}
                    </p>
                    <p>
                      {postulant.civilite === 'Madame' ? 'Chère Madame' : 'Cher Monsieur'},
                      <br />
                      Nous avons le plaisir de vous confirmer notre engagement ferme à vous recruter au sein de{' '}
                      <strong>{postulant.nomEntreprise}</strong> au Canada.
                    </p>
                    <ul className="list-disc pl-5 space-y-1.5">
                      <li>
                        <strong>Fonction :</strong> {postulant.intitulePoste} (CNP {postulant.codeCnp})
                      </li>
                      <li>
                        <strong>Contrat :</strong> {postulant.typeContrat} · Période d’essai :{' '}
                        {postulant.dureePeriodeEssai}
                      </li>
                      <li>
                        <strong>Rémunération horaire :</strong> {postulant.salaireHoraire.toFixed(2)} $ CAD / h (~
                        {postulant.salaireMensuel.toLocaleString('fr-CA')} $ CAD / mois)
                      </li>
                      <li>
                        <strong>Date de prise de fonction :</strong> {postulant.dateEffet}
                      </li>
                      <li>
                        <strong>Lieu de travail :</strong> {postulant.adresseEntreprise}
                      </li>
                    </ul>
                  </>
                )}
              </div>
            </div>
          </InteractiveDocumentCanvas>
        )}

        {/* ONGLET 04 : TICKET D'ENTRETIEN (2 VERSIONS + BARCODE & QR LIVE) */}
        {activeManualTab === 'ticket' && (
          <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-700 mr-1">Tampons rapides :</span>
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
                      triggerToast(`Tampon « ${p.label} » appliqué au dossier.`);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setIsStampModalOpen(true)}
                className="px-3.5 py-2 bg-[#0B2545] hover:bg-[#134074] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Générateur Sceau / Tampon</span>
              </button>
            </div>

            <InteractiveDocumentCanvas
              title={`Ticket d'Entretien : ${postulant.codeIdCandidature}`}
              documentTypeLabel={
                postulant.ticketValide ? 'Onglet 04 · Ticket Officiel Validé' : 'Onglet 04 · Ticket Provisoire'
              }
              assetsConfig={assetsConfig}
              onChangeAssetsConfig={handleUpdateAssetsConfig}
              uploadedAssetUrls={uploadedAssets}
              exclusiveVisualSet={{
                logo: effectiveEmployerLogo,
                signature: uploadedAssets.signature,
                cachet: uploadedAssets.cachet || postulant.cachetUrl,
                filigrane: uploadedAssets.filigrane,
                arrierePlan: uploadedAssets.arrierePlan,
                barcode: effectiveBarcode,
                qrcode: effectiveQrCode
              }}
              htmlEmailContent={ticketHtmlEmail}
              onDownloadPdf={async () => {
                const { doc, filename } = await generateTicketEntretienPdf(ticketData, effectiveEmployerLogo);
                doc.save(filename);
                triggerToast('Ticket d’entretien PDF téléchargé.');
              }}
              onDownloadWord={() => {
                downloadWordDocument(
                  `Ticket_Entretien_${postulant.codeIdCandidature}`,
                  `Ticket Entretien - ${postulant.nomComplet}`,
                  ticketHtmlEmail
                );
                triggerToast('Ticket exporté en Word (.docx).');
              }}
              onDownloadHtml={(html) => downloadHtmlFile(`Ticket_${postulant.codeIdCandidature}.html`, html)}
              onOpenInWebmail={onOpenInWebmail}
            >
              <div className="border-2 border-dashed border-[#D4A017] rounded-xl p-6 bg-[#FEFCF6] space-y-5 relative overflow-hidden">
                {!postulant.ticketValide && (
                  <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 text-center text-xs font-bold text-amber-900">
                    SPECIMEN PROVISOIRE — Activez la version « 2. Validé (Barcode actif) » dans le formulaire pour valider ce coupon.
                  </div>
                )}

                <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                  <BrandLogo companyName={postulant.nomEntreprise} customLogoUrl={effectiveEmployerLogo} size="header" />
                  <div className="text-right">
                    <span className="text-[11px] text-slate-500 uppercase block">Code ID Candidature</span>
                    <span className="font-mono font-bold text-[#0066B3] text-lg">
                      {postulant.codeIdCandidature}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-5 text-sm">
                  {postulant.photoUrl && (
                    <img
                      src={postulant.photoUrl}
                      alt="Candidat"
                      className="w-28 h-32 rounded-lg object-cover border border-slate-300 shrink-0"
                    />
                  )}
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 outline-none"
                  >
                    <div>
                      <span className="text-xs text-slate-500 block">Candidat</span>
                      <strong className="text-slate-900">{postulant.nomComplet}</strong>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 block">Nationalité</span>
                      <strong className="text-slate-900">{postulant.nationalite}</strong>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 block">Poste visé</span>
                      <strong className="text-slate-900">
                        {postulant.intitulePoste} (CNP {postulant.codeCnp})
                      </strong>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 block">Date &amp; Heure</span>
                      <strong className="text-slate-900">
                        {postulant.dateEntretien} à {postulant.heureEntretien}
                      </strong>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-xs text-slate-500 block">Modalité &amp; Lieu</span>
                      <strong className="text-slate-900">
                        {postulant.modaliteEntretien} — {postulant.lieuEntretien}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Bandeau Codes d'Authentification scannables sur le ticket */}
                <div className="pt-4 border-t border-amber-200 flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase text-slate-600 block">
                      {postulant.ticketValide ? 'Code-Barres d’accès validé' : 'Code-Barres Spécimen'}
                    </span>
                    {effectiveBarcode && (
                      <img src={effectiveBarcode} alt="Code-Barres Ticket" className="h-10 object-contain" />
                    )}
                  </div>
                  {effectiveQrCode && (
                    <div className="text-center">
                      <img
                        src={effectiveQrCode}
                        alt="QR Code Ticket"
                        className="w-16 h-16 object-contain border border-slate-300 bg-white p-1 rounded"
                      />
                      <span className="text-[10px] font-mono text-slate-500 block mt-0.5">Scan Vérif</span>
                    </div>
                  )}
                </div>
              </div>
            </InteractiveDocumentCanvas>
          </div>
        )}

        {/* ONGLET 05 : OFFRE D'EMPLOI & ANNONCE CNP */}
        {activeManualTab === 'offre' && (
          <InteractiveDocumentCanvas
            title={`Offre d'Emploi CNP ${postulant.codeCnp} : ${jobOffer.titrePoste}`}
            documentTypeLabel="Onglet 05 · Offre & Avantages BC"
            assetsConfig={assetsConfig}
            onChangeAssetsConfig={handleUpdateAssetsConfig}
            uploadedAssetUrls={uploadedAssets}
            exclusiveVisualSet={{
              logo: effectiveEmployerLogo,
              signature: uploadedAssets.signature,
              cachet: uploadedAssets.cachet,
              filigrane: uploadedAssets.filigrane,
              arrierePlan: uploadedAssets.arrierePlan,
              barcode: effectiveBarcode,
              qrcode: effectiveQrCode
            }}
            htmlEmailContent={offreHtmlEmail}
            onDownloadPdf={async () => {
              await downloadJobOfferPdf(jobOffer, effectiveEmployerLogo);
              triggerToast('Offre CNP PDF téléchargée.');
            }}
            onDownloadWord={() => {
              downloadWordDocument(`Offre_CNP_${jobOffer.reference}`, jobOffer.titrePoste, offreHtmlEmail);
              triggerToast('Offre exportée en Word (.docx).');
            }}
            onDownloadHtml={(html) => downloadHtmlFile(`Offre_${jobOffer.reference}.html`, html)}
            onOpenInWebmail={onOpenInWebmail}
          >
            <div contentEditable suppressContentEditableWarning className="space-y-4 text-sm outline-none">
              <div className="border-b border-slate-200 pb-3">
                <h3 className="font-bold text-lg text-[#0066B3]">
                  {jobOffer.titrePoste} (CNP {postulant.codeCnp})
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-1">
                  Référence : {jobOffer.reference} · Entreprise : {postulant.nomEntreprise}
                </p>
              </div>
              <p>
                <strong>Rémunération horaire :</strong> {jobOffer.salaireMin.toFixed(2)} $ à{' '}
                {jobOffer.salaireMax.toFixed(2)} $ CAD / h · <strong>Contrat :</strong> {postulant.typeContrat}
              </p>
              <div className="pt-2 border-t border-slate-200">
                <span className="font-bold text-slate-900 block mb-2.5">
                  Avantages Sociaux de Colombie-Britannique :
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                  {CANADIAN_STANDARD_BENEFITS.map((b, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                      ✓ {b}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </InteractiveDocumentCanvas>
        )}

        {/* ONGLET 06 : 5 MODÈLES DE DESIGN */}
        {activeManualTab === 'models5' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
              {designModelLabels.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setSelectedDesignModelId(m.id);
                    triggerToast(`Modèle visuel « ${m.title} » activé.`);
                  }}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedDesignModelId === m.id
                      ? 'bg-blue-50 border-[#0066B3] ring-2 ring-blue-500/20'
                      : 'bg-white border-slate-200 hover:border-blue-400'
                  }`}
                >
                  <span className="font-bold text-slate-900 block">{m.title}</span>
                  <span className="text-[11px] text-slate-600 mt-1 block">{m.desc}</span>
                </button>
              ))}
            </div>

            <InteractiveDocumentCanvas
              title={`${activeDesignModel.title} — ${postulant.nomComplet}`}
              documentTypeLabel="Onglet 06 · 5 Modèles Visuels"
              assetsConfig={assetsConfig}
              onChangeAssetsConfig={handleUpdateAssetsConfig}
              uploadedAssetUrls={uploadedAssets}
              exclusiveVisualSet={{
                logo: effectiveEmployerLogo,
                signature: uploadedAssets.signature,
                cachet: uploadedAssets.cachet,
                filigrane: uploadedAssets.filigrane,
                arrierePlan: uploadedAssets.arrierePlan,
                barcode: effectiveBarcode,
                qrcode: effectiveQrCode
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
                triggerToast(`PDF ${activeDesignModel.title} téléchargé.`);
              }}
              onDownloadWord={() => {
                downloadWordDocument(
                  `Design_Model_${selectedDesignModelId}_${postulant.codeIdCandidature}`,
                  activeDesignModel.title,
                  models5HtmlEmail
                );
              }}
              onDownloadHtml={(html) => downloadHtmlFile(`Design_Model_${selectedDesignModelId}.html`, html)}
              onOpenInWebmail={onOpenInWebmail}
            >
              <div
                contentEditable
                suppressContentEditableWarning
                className={`p-6 rounded-xl space-y-4 text-sm outline-none ${activeDesignModel.borderClass}`}
              >
                <div
                  className="px-4 py-3 rounded-lg text-white font-bold flex items-center justify-between"
                  style={{ backgroundColor: activeDesignModel.accent }}
                >
                  <span>{activeDesignModel.title}</span>
                  <span className="font-mono text-xs">{postulant.codeIdCandidature}</span>
                </div>
                <p>
                  <strong>Entreprise :</strong> {postulant.nomEntreprise} ({postulant.adresseEntreprise})
                </p>
                <p>
                  <strong>Candidat :</strong> {postulant.nomComplet} — {postulant.intitulePoste} (CNP{' '}
                  {postulant.codeCnp})
                </p>
                <p className="text-slate-700">{activeDesignModel.desc}.</p>
                <p>
                  Ce gabarit applique automatiquement les réglages actuels du panneau visuel (logos, signatures, cachets, filigranes et codes d’authentification).
                </p>
              </div>
            </InteractiveDocumentCanvas>
          </div>
        )}

        {/* ONGLET 07 : BUNDLE ASSEMBLÉ (COUVERTURE LIVRE) */}
        {activeManualTab === 'bundle' && (
          <InteractiveDocumentCanvas
            title={bundleCoverOptions.titreLivre}
            documentTypeLabel="Onglet 07 · Bundle Livre 4 Pages"
            assetsConfig={assetsConfig}
            onChangeAssetsConfig={handleUpdateAssetsConfig}
            uploadedAssetUrls={uploadedAssets}
            exclusiveVisualSet={{
              logo: effectiveEmployerLogo,
              signature: uploadedAssets.signature,
              cachet: uploadedAssets.cachet,
              filigrane: uploadedAssets.filigrane,
              arrierePlan: uploadedAssets.arrierePlan,
              barcode: effectiveBarcode,
              qrcode: effectiveQrCode
            }}
            htmlEmailContent={bundleHtmlEmail}
            onDownloadPdf={handleDownloadBundlePdf}
            onDownloadWord={() => {
              downloadWordDocument(
                `Bundle_${postulant.codeIdCandidature}`,
                bundleCoverOptions.titreLivre,
                bundleHtmlEmail
              );
            }}
            onDownloadHtml={(html) => downloadHtmlFile(`Bundle_${postulant.codeIdCandidature}.html`, html)}
            onOpenInWebmail={onOpenInWebmail}
          >
            <div
              contentEditable
              suppressContentEditableWarning
              className="p-8 border-4 border-[#D4A017] rounded-xl bg-slate-900 text-white text-center space-y-5 outline-none"
            >
              <span className="text-xs uppercase tracking-widest text-[#D4A017] font-bold block">
                {postulant.nomEntreprise} · {bundleCoverOptions.annee}
              </span>
              <h2 className="text-2xl font-black text-white leading-snug">{bundleCoverOptions.titreLivre}</h2>
              <p className="text-sm text-slate-300">{bundleCoverOptions.sousTitre}</p>
              <div className="pt-5 border-t border-white/20 text-sm space-y-1.5">
                <p>
                  <strong>Candidat :</strong> {postulant.nomComplet}
                </p>
                <p>
                  <strong>Poste :</strong> {postulant.intitulePoste} (CNP {postulant.codeCnp})
                </p>
                <p className="font-mono text-amber-300">Réf. : {postulant.codeIdCandidature}</p>
              </div>
            </div>
          </InteractiveDocumentCanvas>
        )}

        {/* ONGLET 08 : ÉDITEUR FORCUS WORD 2013 */}
        {activeManualTab === 'forcus' && (
          <ForcusWordEditor
            settings={settings}
            initialTitle={`Document_${(postulant.nom || 'CANDIDAT').toUpperCase()}_${postulant.codeIdCandidature}`}
            initialHtmlContent={emailModel.html}
            onOpenInWebmail={onOpenInWebmail}
          />
        )}

        {/* ONGLETS 09 À 12 : HÉBERGEMENT, NOTAIRE, INSPECTION HIR, DÉCLARATION SOLENNELLE */}
        {activeManualTab === 'heb_attestation' && renderHousingTabModule(9, 'heb_attestation')}
        {activeManualTab === 'heb_notaire' && renderHousingTabModule(10, 'heb_notaire')}
        {activeManualTab === 'heb_hir' && renderHousingTabModule(11, 'heb_hir')}
        {activeManualTab === 'heb_declaration' && renderHousingTabModule(12, 'heb_declaration')}

        {/* ONGLET 13 : FICHES ET DOC ES (15 MODÈLES ATS & AGENCE) */}
        {activeManualTab === 'doc_es' && (
          <FichesEtDocEsModule
            postulant={postulant}
            docEsData={docEsData}
            onChangeDocEsData={(upd) => {
              setDocEsData(upd);
              saveFichesDocEsData(postulant.id, upd);
            }}
            settings={settings}
            layoutTemplate={layoutTemplates.doc_es}
            onOpenInWebmail={onOpenInWebmail}
            onToast={triggerToast}
          />
        )}
      </div>

      {/* MODAL DU GÉNÉRATEUR DE TAMPON & SCEAU OFFICIEL */}
      <OfficialStampGeneratorModal
        isOpen={isStampModalOpen}
        onClose={() => setIsStampModalOpen(false)}
        settings={settings}
        onApplyStamp={(dataUrl) => {
          if (stampTargetKey === 'cachet') {
            setPostulant((prev) => ({ ...prev, cachetUrl: dataUrl }));
          }
          handleUploadAsset(stampTargetKey, dataUrl);
          setIsStampModalOpen(false);
          triggerToast('Tampon officiel appliqué, lié à l’acteur actif et synchronisé dans Firestore.');
        }}
      />
    </div>
  );
};
