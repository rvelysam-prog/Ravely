import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Upload,
  CheckCircle2,
  ShieldAlert,
  RefreshCw,
  Eye,
  UserPlus,
  Sparkles,
  Mail,
  Building2,
  Sliders,
  Save,
  RotateCcw,
  Plus,
  Trash2
} from 'lucide-react';
import { Employee } from '../types';
import {
  compressPhotoToSafeBase64,
  fetchEmployeesFromFirestore,
  generateDefaultAvatarSvgDataUri,
  generateUniqueMatriculeInFirestore,
  getNextMatricule,
  writeEmployeeToFirestore
} from '../services/staticStorage';
import { formatReadableFirestoreError } from '../firebase';
import { CONTRACT_STATIC_ASSETS, loadStaticImageAsPngDataUrl } from '../services/contractPdfGenerator';
import {
  DEFAULT_PROMESSE_RESPONSABILITES,
  PromesseEmbaucheData,
  downloadPromesseEmbauchePdf,
  formatPromesseDateLongFr,
  formatPromesseDateSlash,
  generatePromesseEmbauchePdfBlobUrl,
  generatePromesseEmbauchePdfDataUri,
  getDefaultLargeBlasonWatermarkDataUrl
} from '../services/promesseEmbauchePdfGenerator';
import {
  AssetUnit,
  DEFAULT_PDF_ASSETS_CONFIG,
  HorizontalAlign,
  ImportedAssetKey,
  OFFICIAL_DEPARTMENTS,
  PdfAssetItemSettings,
  PdfImportedAssetsConfig,
  VerticalAlign,
  applyTintToImageDataUrl,
  convertUploadedImageForPdf,
  findDepartmentByPoste,
  findDepartmentDefinition,
  formatMissionsWithBullets,
  getDeduplicatedDepartmentsList,
  getSavedCustomCachet,
  getSavedCustomFiligrane,
  getSavedCustomLogo,
  getSavedCustomSignature,
  getSavedPdfAssetsConfig,
  loadPdfAssetsConfigFromFirestore,
  parseMissionsFromText,
  savePdfAssetsConfigToFirestore,
  sendCandidatureAcceptanceEmailViaFirebase,
  setSavedCustomCachet,
  setSavedCustomFiligrane,
  setSavedCustomLogo,
  setSavedCustomSignature,
  setSavedPdfAssetsConfig
} from '../services/departmentsAndEmailService';

interface PromesseEmbaucheSectionProps {
  employees: Employee[];
  onEmployeesUpdated: (updatedList: Employee[]) => void;
}

const ASSET_TABS: Array<{ key: ImportedAssetKey; label: string; badge: string }> = [
  { key: 'logo', label: 'Logo Entreprise', badge: 'Page 1 · En-tête' },
  { key: 'signature', label: 'Signature Employeur', badge: 'Page 2 · Bloc gauche' },
  { key: 'cachet', label: 'Cachet Entreprise', badge: 'Page 2 · Bloc gauche' },
  { key: 'filigrane', label: 'Filigrane (Blason)', badge: 'Pages 1 & 2 · Fond + Z-Index' }
];

const TINT_PRESETS = [
  { label: 'Bleu Marine', color: '#0C2366' },
  { label: 'Vert Atlantic', color: '#3A6E48' },
  { label: 'Or / Ambre', color: '#C67D26' },
  { label: 'Bleu Royal', color: '#1E3A8A' },
  { label: 'Gris Ardoise', color: '#64748B' },
  { label: 'Noir', color: '#000000' }
];

export const PromesseEmbaucheSection: React.FC<PromesseEmbaucheSectionProps> = ({
  employees,
  onEmployeesUpdated
}) => {
  const deduplicatedDepartments = getDeduplicatedDepartmentsList(
    employees.map((e) => e.departement)
  );

  const [form, setForm] = useState({
    nom_complet: 'SALIMATA TRAORER',
    date_naissance: '1994-06-15',
    sexe: 'Féminin',
    nationalite: 'Ivoirienne',
    numero_piece_identite: 'C01294857',
    telephone: '+1 (506) 802-2226',
    email: 'salimata.traorer@atlantictransport.ca',
    adresse: 'Surrey, Colombie-Britanique, Canada',
    contact_urgence: 'Traorer Mamadou (+1 506 802-2226)',
    photo_base64: '',
    photo_name: '',
    poste: 'Préparatrice de Commande',
    departement: 'DEPARTEMENT LOGISTIQUE ET ENTREPOSAGE',
    manager: 'ANTOINE FORESTIN',
    matricule: getNextMatricule(employees),
    type_contrat: 'Contrat à Durée Déterminée (CDI) de 2 ans',
    date_embauche: '2027-01-04',
    date_etablissement: '2026-09-28',
    date_fin: '2029-01-04',
    salaire_horaire: '22',
    primes: 'Prime de rendement selon grille interne',
    mode_paiement: 'Virement bancaire bimensuel',
    lieu_travail: 'Surrey, Colombie-Britanique, Canada',
    horaire: 'Temps plein – 40 heures par semaine',
    ni: 'BC1129970',
    responsabilites_text: formatMissionsWithBullets(OFFICIAL_DEPARTMENTS[1].missions)
  });

  const [newMissionInput, setNewMissionInput] = useState('');

  // Fichiers uploadés par l'admin : logo, signature, cachet, et filigrane (blason)
  const [logoDataUrl, setLogoDataUrl] = useState<string>(() => getSavedCustomLogo());
  const [logoFileName, setLogoFileName] = useState<string>(() =>
    getSavedCustomLogo() ? 'Logo personnalisé enregistré' : 'logo-atlantic.png (Fichier source)'
  );

  const [signatureDataUrl, setSignatureDataUrl] = useState<string>(() => getSavedCustomSignature());
  const [signatureFileName, setSignatureFileName] = useState<string>(() =>
    getSavedCustomSignature() ? 'Signature personnalisée enregistrée' : 'signature.png (Fichier source)'
  );

  const [cachetDataUrl, setCachetDataUrl] = useState<string>(() => getSavedCustomCachet());
  const [cachetFileName, setCachetFileName] = useState<string>(() =>
    getSavedCustomCachet() ? 'Cachet personnalisé enregistré' : 'cachet.png (Fichier source)'
  );

  const [filigraneDataUrl, setFiligraneDataUrl] = useState<string>(() => getSavedCustomFiligrane());
  const [filigraneFileName, setFiligraneFileName] = useState<string>(() =>
    getSavedCustomFiligrane() ? 'Filigrane personnalisé enregistré' : 'Blason filigrane par défaut'
  );

  // Panneau Réglages Fichiers Importés (Logo, Signature, Cachet, Filigrane)
  const [assetsConfig, setAssetsConfig] = useState<PdfImportedAssetsConfig>(() =>
    getSavedPdfAssetsConfig()
  );
  const [activeAssetTab, setActiveAssetTab] = useState<ImportedAssetKey>('logo');
  const [savingSettingsFirestore, setSavingSettingsFirestore] = useState(false);
  const [settingsSavedBadge, setSettingsSavedBadge] = useState<string>('');

  // Tinted image data URLs for live preview when tintEnabled is active
  const [tintedPreviewUrls, setTintedPreviewUrls] = useState<{
    logo: string;
    signature: string;
    cachet: string;
    filigrane: string;
  }>({
    logo: '',
    signature: '',
    cachet: '',
    filigrane: ''
  });

  // Status & Preview states
  const [saving, setSaving] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [validatedData, setValidatedData] = useState<PromesseEmbaucheData | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string>('');
  const [statusMsg, setStatusMsg] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Load default static assets (/logo-atlantic.png, /signature.png, /cachet.png, default watermark) + Firestore settings
  useEffect(() => {
    let active = true;
    (async () => {
      const [logoUrl, sigUrl, cachetUrl, defaultWatermarkUrl, firestoreCfg] = await Promise.all([
        loadStaticImageAsPngDataUrl(CONTRACT_STATIC_ASSETS.logoAtlantic),
        loadStaticImageAsPngDataUrl(CONTRACT_STATIC_ASSETS.signature),
        loadStaticImageAsPngDataUrl(CONTRACT_STATIC_ASSETS.cachet),
        getDefaultLargeBlasonWatermarkDataUrl(),
        loadPdfAssetsConfigFromFirestore()
      ]);
      if (!active) return;
      if (!getSavedCustomLogo() && logoUrl) {
        setLogoDataUrl(logoUrl);
      }
      if (!getSavedCustomSignature() && sigUrl) {
        setSignatureDataUrl(sigUrl);
      }
      if (!getSavedCustomCachet() && cachetUrl) {
        setCachetDataUrl(cachetUrl);
      }
      if (!getSavedCustomFiligrane() && defaultWatermarkUrl) {
        setFiligraneDataUrl(defaultWatermarkUrl);
      }
      if (firestoreCfg) {
        setAssetsConfig(firestoreCfg);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Recompute tinted preview DataURLs whenever tint settings or source images change
  useEffect(() => {
    let active = true;
    (async () => {
      const [tLogo, tSig, tCachet, tFil] = await Promise.all([
        assetsConfig.logo.tintEnabled && logoDataUrl
          ? applyTintToImageDataUrl(logoDataUrl, assetsConfig.logo.tintColor)
          : Promise.resolve(logoDataUrl),
        assetsConfig.signature.tintEnabled && signatureDataUrl
          ? applyTintToImageDataUrl(signatureDataUrl, assetsConfig.signature.tintColor)
          : Promise.resolve(signatureDataUrl),
        assetsConfig.cachet.tintEnabled && cachetDataUrl
          ? applyTintToImageDataUrl(cachetDataUrl, assetsConfig.cachet.tintColor)
          : Promise.resolve(cachetDataUrl),
        assetsConfig.filigrane.tintEnabled && filigraneDataUrl
          ? applyTintToImageDataUrl(filigraneDataUrl, assetsConfig.filigrane.tintColor)
          : Promise.resolve(filigraneDataUrl)
      ]);
      if (!active) return;
      setTintedPreviewUrls({
        logo: tLogo || logoDataUrl,
        signature: tSig || signatureDataUrl,
        cachet: tCachet || cachetDataUrl,
        filigrane: tFil || filigraneDataUrl
      });
    })();
    return () => {
      active = false;
    };
  }, [
    logoDataUrl,
    signatureDataUrl,
    cachetDataUrl,
    filigraneDataUrl,
    assetsConfig.logo.tintEnabled,
    assetsConfig.logo.tintColor,
    assetsConfig.signature.tintEnabled,
    assetsConfig.signature.tintColor,
    assetsConfig.cachet.tintEnabled,
    assetsConfig.cachet.tintColor,
    assetsConfig.filigrane.tintEnabled,
    assetsConfig.filigrane.tintColor
  ]);

  const currentDeptDef =
    findDepartmentDefinition(form.departement) || OFFICIAL_DEPARTMENTS[1];

  const updateAssetItemSetting = <K extends keyof PdfAssetItemSettings>(
    assetKey: ImportedAssetKey,
    field: K,
    value: PdfAssetItemSettings[K]
  ) => {
    setAssetsConfig((prev) => {
      const next: PdfImportedAssetsConfig = {
        ...prev,
        [assetKey]: {
          ...prev[assetKey],
          [field]: value
        }
      };
      setSavedPdfAssetsConfig(next);
      return next;
    });
    setSettingsSavedBadge('');
  };

  const handleSaveAssetSettingsToFirestore = async () => {
    setSavingSettingsFirestore(true);
    try {
      const saved = await savePdfAssetsConfigToFirestore(assetsConfig);
      setAssetsConfig(saved);
      const timeStr = new Date().toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      setSettingsSavedBadge(`Sauvegardé dans Firestore à ${timeStr}`);
      setStatusMsg({
        type: 'success',
        text: "Réglages des fichiers importés (logo, signature, cachet, filigrane) sauvegardés dans Firestore (/settings/pdf_imported_assets) et appliqués à la génération PDF."
      });
    } catch (err) {
      setStatusMsg({
        type: 'error',
        text: formatReadableFirestoreError(err)
      });
    } finally {
      setSavingSettingsFirestore(false);
    }
  };

  const handleResetSingleAssetSettings = (assetKey: ImportedAssetKey) => {
    setAssetsConfig((prev) => {
      const next: PdfImportedAssetsConfig = {
        ...prev,
        [assetKey]: { ...DEFAULT_PDF_ASSETS_CONFIG[assetKey] }
      };
      setSavedPdfAssetsConfig(next);
      return next;
    });
    setSettingsSavedBadge('');
  };

  const handleResetAllAssetSettings = async () => {
    const fresh = await savePdfAssetsConfigToFirestore(DEFAULT_PDF_ASSETS_CONFIG);
    setAssetsConfig(fresh);
    setSettingsSavedBadge('Réglages par défaut restaurés dans Firestore');
  };

  // Sélection d'un département -> affiche les 6 sous-rubriques et pré-remplit automatiquement avec "• "
  const handleDepartmentChange = (newDeptName: string) => {
    const matched = findDepartmentDefinition(newDeptName);
    if (matched) {
      setForm((prev) => ({
        ...prev,
        departement: matched.name,
        responsabilites_text: formatMissionsWithBullets(matched.missions)
      }));
    } else {
      const customMatch = deduplicatedDepartments.find((d) => d.name === newDeptName);
      setForm((prev) => ({
        ...prev,
        departement: newDeptName,
        responsabilites_text: customMatch
          ? formatMissionsWithBullets(customMatch.missions)
          : prev.responsabilites_text
      }));
    }
  };

  // Sélection ou saisie d'un poste lié -> détecte le département correspondant (ou utilise le département actif) et pré-remplit les 6 missions en puces "•"
  const handlePosteChange = (newPoste: string, forceApplyMissions = false) => {
    const deptFromPoste = findDepartmentByPoste(newPoste);
    const targetDept = deptFromPoste || findDepartmentDefinition(form.departement);

    setForm((prev) => {
      const isCurrentlyStandardDeptMissions =
        !prev.responsabilites_text.trim() ||
        OFFICIAL_DEPARTMENTS.some(
          (d) =>
            formatMissionsWithBullets(d.missions).trim() === prev.responsabilites_text.trim() ||
            d.missions.join('\n').trim() === prev.responsabilites_text.trim()
        ) ||
        prev.responsabilites_text.trim() === DEFAULT_PROMESSE_RESPONSABILITES.trim();

      const shouldUpdateMissions =
        Boolean(targetDept) &&
        (forceApplyMissions || Boolean(deptFromPoste) || isCurrentlyStandardDeptMissions);

      return {
        ...prev,
        poste: newPoste,
        departement: deptFromPoste ? deptFromPoste.name : prev.departement,
        responsabilites_text:
          shouldUpdateMissions && targetDept
            ? formatMissionsWithBullets(targetDept.missions)
            : prev.responsabilites_text
      };
    });
  };

  // Fonctions Admin RH pour Modifier / Supprimer / Ajouter une mission dans « Vos principales responsabilités »
  const currentBulletMissions = parseMissionsFromText(form.responsabilites_text);

  const handleUpdateSingleMission = (index: number, newValue: string) => {
    const next = [...currentBulletMissions];
    next[index] = newValue;
    setForm((prev) => ({
      ...prev,
      responsabilites_text: next.map((m) => `• ${m.replace(/^[\s•\-*]+/, '')}`).join('\n')
    }));
  };

  const handleDeleteSingleMission = (index: number) => {
    const next = currentBulletMissions.filter((_, idx) => idx !== index);
    setForm((prev) => ({
      ...prev,
      responsabilites_text: formatMissionsWithBullets(next)
    }));
  };

  const handleAddSingleMission = () => {
    const clean = newMissionInput.replace(/^[\s•\-*]+/, '').trim();
    if (!clean) return;
    const next = [...currentBulletMissions, clean];
    setForm((prev) => ({
      ...prev,
      responsabilites_text: formatMissionsWithBullets(next)
    }));
    setNewMissionInput('');
  };

  const handleImageFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'photo' | 'logo' | 'signature' | 'cachet' | 'filigrane'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) return;

      if (target === 'photo') {
        try {
          const base64 = await compressPhotoToSafeBase64(result);
          setForm((prev) => ({
            ...prev,
            photo_base64: base64,
            photo_name: file.name
          }));
        } catch {
          setStatusMsg({
            type: 'error',
            text: "Impossible de lire la photo d'identité."
          });
        }
      } else if (target === 'logo') {
        const converted = await convertUploadedImageForPdf(result, {
          maxWidth: 700,
          maxHeight: 350,
          removeWhiteBackground: false
        });
        setLogoDataUrl(converted);
        setLogoFileName(file.name);
        setSavedCustomLogo(converted);
        setActiveAssetTab('logo');
      } else if (target === 'signature') {
        const converted = await convertUploadedImageForPdf(result, {
          maxWidth: 600,
          maxHeight: 350,
          removeWhiteBackground: true
        });
        setSignatureDataUrl(converted);
        setSignatureFileName(file.name);
        setSavedCustomSignature(converted);
        setActiveAssetTab('signature');
      } else if (target === 'cachet') {
        const converted = await convertUploadedImageForPdf(result, {
          maxWidth: 700,
          maxHeight: 450,
          removeWhiteBackground: true
        });
        setCachetDataUrl(converted);
        setCachetFileName(file.name);
        setSavedCustomCachet(converted);
        setActiveAssetTab('cachet');
      } else if (target === 'filigrane') {
        const converted = await convertUploadedImageForPdf(result, {
          maxWidth: 950,
          maxHeight: 1150,
          removeWhiteBackground: false
        });
        setFiligraneDataUrl(converted);
        setFiligraneFileName(file.name);
        setSavedCustomFiligrane(converted);
        setActiveAssetTab('filigrane');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetDefaultAssets = async (
    target: 'logo' | 'signature' | 'cachet' | 'filigrane'
  ) => {
    if (target === 'logo') {
      setSavedCustomLogo('');
      const logoUrl = await loadStaticImageAsPngDataUrl(CONTRACT_STATIC_ASSETS.logoAtlantic);
      setLogoDataUrl(logoUrl);
      setLogoFileName('logo-atlantic.png (Fichier source)');
    } else if (target === 'signature') {
      setSavedCustomSignature('');
      const sigUrl = await loadStaticImageAsPngDataUrl(CONTRACT_STATIC_ASSETS.signature);
      setSignatureDataUrl(sigUrl);
      setSignatureFileName('signature.png (Fichier source)');
    } else if (target === 'cachet') {
      setSavedCustomCachet('');
      const cachetUrl = await loadStaticImageAsPngDataUrl(CONTRACT_STATIC_ASSETS.cachet);
      setCachetDataUrl(cachetUrl);
      setCachetFileName('cachet.png (Fichier source)');
    } else if (target === 'filigrane') {
      setSavedCustomFiligrane('');
      const defaultWatermarkUrl = await getDefaultLargeBlasonWatermarkDataUrl();
      setFiligraneDataUrl(defaultWatermarkUrl);
      setFiligraneFileName('Blason filigrane par défaut');
    }
  };

  const handleRegenerateMatricule = async () => {
    const freshMat = await generateUniqueMatriculeInFirestore(undefined, employees);
    setForm((prev) => ({ ...prev, matricule: freshMat }));
  };

  const handleLoadExistingEmployee = (matricule: string) => {
    if (!matricule) return;
    const found = employees.find((e) => e.matricule === matricule);
    if (!found) return;

    const matchedDept = findDepartmentDefinition(found.departement);
    setForm((prev) => ({
      ...prev,
      nom_complet: found.nom_complet || `${found.prenom} ${found.nom}`,
      date_naissance: found.date_naissance || prev.date_naissance,
      sexe: found.sexe || (found.civilite === 'Madame' ? 'Féminin' : 'Masculin'),
      nationalite: found.nationalite || prev.nationalite,
      numero_piece_identite: found.numero_piece_identite || prev.numero_piece_identite,
      telephone: found.telephone || prev.telephone,
      email: found.email || prev.email,
      adresse: found.adresse || prev.adresse,
      contact_urgence: found.contact_urgence || prev.contact_urgence,
      photo_base64: found.photo || '',
      photo_name: 'Photo existante',
      poste: found.poste || prev.poste,
      departement: found.departement || prev.departement,
      manager: found.manager || 'ANTOINE FORESTIN',
      matricule: found.matricule,
      type_contrat:
        found.promesse_type_contrat_label ||
        (found.type_contrat === 'CDD'
          ? 'Contrat à Durée Déterminée (CDD) de 2 ans'
          : 'Contrat à Durée Déterminée (CDI) de 2 ans'),
      date_embauche: found.date_embauche || found.date_effet || prev.date_embauche,
      date_etablissement:
        found.date_etablissement || found.date_signature || prev.date_etablissement,
      date_fin: found.date_fin || found.date_fin_cdd || prev.date_fin,
      salaire_horaire: String(found.salaire_horaire || found.salaire || '22'),
      primes: found.primes || prev.primes,
      mode_paiement: found.mode_paiement || prev.mode_paiement,
      lieu_travail: found.lieu_travail || prev.lieu_travail,
      horaire: found.horaires || prev.horaire,
      ni: found.ni || prev.ni,
      responsabilites_text:
        Array.isArray(found.responsabilites) && found.responsabilites.length > 0
          ? formatMissionsWithBullets(found.responsabilites)
          : matchedDept
          ? formatMissionsWithBullets(matchedDept.missions)
          : prev.responsabilites_text
    }));
  };

  const buildCurrentPromesseData = (): PromesseEmbaucheData => {
    const missions = parseMissionsFromText(form.responsabilites_text);

    return {
      nom_complet: form.nom_complet.trim().toUpperCase(),
      date_naissance: form.date_naissance,
      sexe: form.sexe,
      nationalite: form.nationalite.trim(),
      numero_piece_identite: form.numero_piece_identite.trim(),
      telephone: form.telephone.trim(),
      email: form.email.trim(),
      adresse: form.adresse.trim(),
      contact_urgence: form.contact_urgence.trim(),
      photo_base64: form.photo_base64,
      poste: form.poste.trim(),
      departement: form.departement.trim(),
      manager: form.manager.trim() || 'ANTOINE FORESTIN',
      matricule: form.matricule.trim().toUpperCase(),
      type_contrat: form.type_contrat.trim(),
      date_embauche: form.date_embauche,
      date_etablissement: form.date_etablissement || form.date_embauche,
      date_emission: form.date_etablissement || form.date_embauche,
      date_fin: form.date_fin,
      salaire_horaire: form.salaire_horaire.trim() || '22',
      primes: form.primes.trim(),
      mode_paiement: form.mode_paiement.trim(),
      lieu_travail: form.lieu_travail.trim(),
      horaire: form.horaire.trim(),
      ni: form.ni.trim(),
      responsabilites: missions,
      logo_data_url: logoDataUrl,
      signature_data_url: signatureDataUrl,
      cachet_data_url: cachetDataUrl,
      filigrane_data_url: filigraneDataUrl,
      assets_config: assetsConfig
    };
  };

  const handleSubmitAndValidate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg(null);

    try {
      const fullName = form.nom_complet.trim().toUpperCase();
      if (!fullName || !form.poste.trim()) {
        setStatusMsg({
          type: 'error',
          text: 'Veuillez renseigner au minimum le nom complet et le poste.'
        });
        setSaving(false);
        return;
      }

      // Persist imported asset settings to Firestore as well
      await savePdfAssetsConfigToFirestore(assetsConfig);

      const existingEmp = employees.find(
        (item) => item.matricule.toUpperCase() === form.matricule.trim().toUpperCase()
      );

      const finalMatricule = existingEmp
        ? existingEmp.matricule
        : await generateUniqueMatriculeInFirestore(form.matricule, employees);

      const nameParts = fullName.split(/\s+/);
      const prenom = nameParts[0] || 'Salarié';
      const nom = nameParts.slice(1).join(' ') || fullName;

      const civilite: 'Monsieur' | 'Madame' =
        form.sexe.toLowerCase().startsWith('f') ? 'Madame' : 'Monsieur';

      const resolvedPhoto =
        form.photo_base64 && form.photo_base64.trim().length > 0
          ? form.photo_base64
          : existingEmp?.photo || generateDefaultAvatarSvgDataUri(prenom, nom, finalMatricule);

      const hourlyRate = Number(form.salaire_horaire) || 22;
      const shortContractType: 'CDI' | 'CDD' = form.type_contrat
        .toUpperCase()
        .includes('CDD')
        ? 'CDD'
        : 'CDI';

      const missions = parseMissionsFromText(form.responsabilites_text);

      // Build Promesse d'Embauche PDF first so we can attach it to the Trigger Email
      const promessePayload: PromesseEmbaucheData = {
        ...buildCurrentPromesseData(),
        matricule: finalMatricule,
        assets_config: assetsConfig
      };
      setValidatedData(promessePayload);

      const [pdfDataUri, blobUrl] = await Promise.all([
        generatePromesseEmbauchePdfDataUri(promessePayload),
        generatePromesseEmbauchePdfBlobUrl(promessePayload)
      ]);

      setPdfBlobUrl((oldUrl) => {
        if (oldUrl) URL.revokeObjectURL(oldUrl);
        return blobUrl;
      });

      const recipientEmail =
        form.email.trim() || `${finalMatricule.toLowerCase()}@atlantictransport.ca`;

      // Send automatic notification email via Firebase Extension Trigger Email ("mail" collection)
      const { emailEnvoye } = await sendCandidatureAcceptanceEmailViaFirebase({
        toEmail: recipientEmail,
        nomComplet: fullName,
        civilite,
        poste: form.poste.trim(),
        departement: form.departement.trim(),
        dateEmbauche: formatPromesseDateLongFr(form.date_embauche),
        dateEtablissement: formatPromesseDateSlash(
          form.date_etablissement || form.date_embauche
        ),
        matricule: finalMatricule,
        pdfDataUri
      });

      const employeeRecord: Employee = {
        id: existingEmp?.id || Date.now(),
        firestore_id: existingEmp?.firestore_id,
        matricule: finalMatricule,
        civilite,
        nom_complet: fullName,
        prenom,
        nom,
        email: recipientEmail,
        password: existingEmp?.password || 'Employe@2026!',
        telephone: form.telephone.trim(),
        adresse: form.adresse.trim(),
        date_naissance: form.date_naissance,
        nationalite: form.nationalite.trim(),
        poste: form.poste.trim(),
        departement: form.departement.trim() || 'DEPARTEMENT LOGISTIQUE ET ENTREPOSAGE',
        type_contrat: shortContractType,
        date_effet: form.date_embauche,
        date_embauche: form.date_embauche,
        date_fin_cdd: form.date_fin,
        duree_periode_essai: existingEmp?.duree_periode_essai || '3 semaines',
        lieu_travail: form.lieu_travail.trim(),
        horaires: form.horaire.trim(),
        salaire: hourlyRate,
        devise: 'CAD',
        hebergement_fourni: existingEmp?.hebergement_fourni ?? false,
        hebergement_duree_type: existingEmp?.hebergement_duree_type || 'duree_precise',
        hebergement_nombre_mois: existingEmp?.hebergement_nombre_mois || 3,
        hebergement_lieu_type: existingEmp?.hebergement_lieu_type || 'preciser_lieu',
        adresse_hebergement: existingEmp?.adresse_hebergement || '',
        date_signature: form.date_etablissement || form.date_embauche,
        date_etablissement: form.date_etablissement || form.date_embauche,
        emailEnvoye,
        sexe: form.sexe,
        numero_piece_identite: form.numero_piece_identite.trim(),
        contact_urgence: form.contact_urgence.trim(),
        manager: form.manager.trim() || 'ANTOINE FORESTIN',
        date_fin: form.date_fin,
        salaire_horaire: hourlyRate,
        primes: form.primes.trim(),
        mode_paiement: form.mode_paiement.trim(),
        ni: form.ni.trim(),
        responsabilites: missions,
        promesse_type_contrat_label: form.type_contrat.trim(),
        photo: resolvedPhoto,
        photo_url: resolvedPhoto,
        contrat_pdf_url: existingEmp?.contrat_pdf_url || '',
        has_custom_pdf: existingEmp?.has_custom_pdf || false,
        must_change_password: existingEmp?.must_change_password ?? false,
        is_active: true,
        access_token: existingEmp?.access_token || null,
        access_token_created_at: existingEmp?.access_token_created_at || null,
        created_at: existingEmp?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Save in Firebase "employees" collection with emailEnvoye=true
      const { docId, employee: savedEmployee } = await writeEmployeeToFirestore(
        employeeRecord,
        Boolean(existingEmp)
      );

      const updatedEmployees = await fetchEmployeesFromFirestore();
      onEmployeesUpdated(updatedEmployees);
      setForm((prev) => ({ ...prev, matricule: savedEmployee.matricule }));

      setStatusMsg({
        type: 'success',
        text: `Salarié ${savedEmployee.nom_complet} (${savedEmployee.matricule}) enregistré dans Firebase (ID: ${docId}) · Réglages PDF sauvegardés · Courrier automatique envoyé à ${recipientEmail} depuis atlantictransport.int@ik.me avec la Promesse d'embauche PDF en pièce jointe (emailEnvoye=true).`
      });
    } catch (error) {
      setStatusMsg({
        type: 'error',
        text: formatReadableFirestoreError(error)
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      await savePdfAssetsConfigToFirestore(assetsConfig);
      const payload: PromesseEmbaucheData = {
        ...buildCurrentPromesseData(),
        assets_config: assetsConfig
      };
      await downloadPromesseEmbauchePdf(payload);
    } catch (err) {
      console.error('Erreur téléchargement PDF Promesse:', err);
      setStatusMsg({
        type: 'error',
        text: "Erreur lors de la génération du PDF Promesse d'embauche."
      });
    } finally {
      setDownloadingPdf(false);
    }
  };

  const previewData = buildCurrentPromesseData();
  const salutationPreview =
    previewData.sexe.toLowerCase().startsWith('f') ? 'Madame' : 'Monsieur';

  const activeAssetCfg = assetsConfig[activeAssetTab];

  // Helper to compute live preview CSS styles for an imported asset
  const getLiveAssetBoxClasses = (cfg: PdfAssetItemSettings): string => {
    const hAlign =
      cfg.alignX === 'left'
        ? 'justify-start'
        : cfg.alignX === 'center'
        ? 'justify-center'
        : 'justify-end';
    const vAlign =
      cfg.alignY === 'top'
        ? 'items-start'
        : cfg.alignY === 'middle'
        ? 'items-center'
        : 'items-end';
    return `flex ${hAlign} ${vAlign}`;
  };

  const getLiveAssetInlineStyle = (
    cfg: PdfAssetItemSettings,
    refPx: { w: number; h: number }
  ): React.CSSProperties => {
    const widthPx =
      cfg.widthUnit === '%' ? Math.round((cfg.widthValue / 100) * refPx.w) : cfg.widthValue;
    const heightPx =
      cfg.heightUnit === '%' ? Math.round((cfg.heightValue / 100) * refPx.h) : cfg.heightValue;
    return {
      width: `${widthPx}px`,
      height: `${heightPx}px`,
      opacity: Math.max(0, Math.min(1, cfg.opacity / 100)),
      transform: `translate(${cfg.offsetX}px, ${cfg.offsetY}px) rotate(${cfg.rotation}deg)`,
      transformOrigin: 'center center'
    };
  };

  const getFiligranePreviewStyle = (pageNum: 1 | 2): React.CSSProperties => {
    const cfg = assetsConfig.filigrane;
    const widthPx =
      cfg.widthUnit === '%' ? Math.round((cfg.widthValue / 100) * 290) : cfg.widthValue;
    const heightPx =
      cfg.heightUnit === '%' ? Math.round((cfg.heightValue / 100) * 360) : cfg.heightValue;

    let leftPercent = '50%';
    let baseTx = '-50%';
    if (cfg.alignX === 'left') {
      leftPercent = '8%';
      baseTx = '0%';
    } else if (cfg.alignX === 'right') {
      leftPercent = '92%';
      baseTx = '-100%';
    }

    let topPercent = pageNum === 1 ? '55%' : '38%';
    let baseTy = '-50%';
    if (cfg.alignY === 'top') {
      topPercent = pageNum === 1 ? '28%' : '14%';
      baseTy = '0%';
    } else if (cfg.alignY === 'bottom') {
      topPercent = pageNum === 1 ? '88%' : '82%';
      baseTy = '-100%';
    }

    return {
      width: `${widthPx}px`,
      height: `${heightPx}px`,
      left: leftPercent,
      top: topPercent,
      opacity: Math.max(0, Math.min(1, cfg.opacity / 100)),
      zIndex: cfg.zIndex ?? 0,
      transform: `translate(calc(${baseTx} + ${cfg.offsetX}px), calc(${baseTy} + ${cfg.offsetY}px)) rotate(${cfg.rotation}deg)`,
      transformOrigin: 'center center'
    };
  };

  // All linked positions across the 12 departments for autocomplete/selection
  const allLinkedPostes = OFFICIAL_DEPARTMENTS.flatMap((d) =>
    d.postesLies.map((p) => ({ poste: p, deptName: d.name }))
  );

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#0B2545] bg-amber-100/80 px-2.5 py-1 rounded-md font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Route Admin Protégée : /admin/promesse-embauche</span>
          </div>
          <h2 className="font-display font-bold text-xl sm:text-2xl text-[#0B2545]">
            Générer une Promesse d&apos;Embauche Officielle (2 pages A4 · jsPDF)
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            Enregistre le salarié dans Firebase (<code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">employees</code>), sauvegarde les réglages des fichiers importés dans Firestore (<code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">settings/pdf_imported_assets</code>) et envoie automatiquement l&apos;email d&apos;acceptation (<code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">emailEnvoye=true</code>).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            onChange={(e) => handleLoadExistingEmployee(e.target.value)}
            defaultValue=""
            className="min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm bg-slate-50 text-slate-800 focus:border-[#0B2545] focus:outline-none"
          >
            <option value="">Pré-remplir depuis un salarié existant...</option>
            {employees.map((emp) => (
              <option key={emp.matricule} value={emp.matricule}>
                {emp.nom_complet} ({emp.matricule})
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#0B2265] hover:bg-[#13368E] text-white font-bold text-xs sm:text-sm flex items-center gap-2 transition-colors shadow-xs disabled:opacity-60"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>
              {downloadingPdf
                ? 'Génération PDF...'
                : "Télécharger PDF Promesse d'embauche"}
            </span>
          </button>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-xl border text-xs sm:text-sm flex items-start gap-2.5 ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">{statusMsg.text}</div>
        </div>
      )}

      {/* FORMULAIRE ADMIN "NOUVEAU SALARIÉ" */}
      <form
        onSubmit={handleSubmitAndValidate}
        className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2.5">
            <UserPlus className="w-5 h-5 text-[#0B2545]" />
            <h3 className="font-display font-bold text-lg text-[#0B2545]">
              Formulaire Admin — Nouveau Salarié &amp; Promesse d&apos;Embauche
            </h3>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg">
            <Mail className="w-3.5 h-3.5 text-emerald-600" />
            <span>Notification auto : atlantictransport.int@ik.me</span>
          </div>
        </div>

        {/* Section 1 : Identité & Coordonnées */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-3">
            1. Informations Personnelles &amp; Coordonnées du Salarié
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nom complet (Destinataire) *
              </label>
              <input
                type="text"
                required
                value={form.nom_complet}
                onChange={(e) => setForm({ ...form, nom_complet: e.target.value })}
                placeholder="Ex: SALIMATA TRAORER"
                className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm uppercase font-semibold focus:border-[#0B2545] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Date de naissance *
              </label>
              <input
                type="date"
                required
                value={form.date_naissance}
                onChange={(e) => setForm({ ...form, date_naissance: e.target.value })}
                className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:border-[#0B2545] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Sexe *
              </label>
              <select
                value={form.sexe}
                onChange={(e) => setForm({ ...form, sexe: e.target.value })}
                className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm bg-white focus:border-[#0B2545] focus:outline-none"
              >
                <option value="Féminin">Féminin (Madame)</option>
                <option value="Masculin">Masculin (Monsieur)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nationalité *
              </label>
              <input
                type="text"
                required
                value={form.nationalite}
                onChange={(e) => setForm({ ...form, nationalite: e.target.value })}
                placeholder="Ex: Ivoirienne"
                className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:border-[#0B2545] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                N° pièce d&apos;identité *
              </label>
              <input
                type="text"
                required
                value={form.numero_piece_identite}
                onChange={(e) => setForm({ ...form, numero_piece_identite: e.target.value })}
                placeholder="Ex: C01294857"
                className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-mono focus:border-[#0B2545] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Téléphone *
              </label>
              <input
                type="text"
                required
                value={form.telephone}
                onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                placeholder="+1 (506) 802-2226"
                className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:border-[#0B2545] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email du salarié (Destinataire courrier auto) *
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="salimata.traorer@email.com"
                className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:border-[#0B2545] focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Adresse complète *
              </label>
              <input
                type="text"
                required
                value={form.adresse}
                onChange={(e) => setForm({ ...form, adresse: e.target.value })}
                placeholder="Surrey, Colombie-Britanique, Canada"
                className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:border-[#0B2545] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Contact d&apos;urgence *
              </label>
              <input
                type="text"
                required
                value={form.contact_urgence}
                onChange={(e) => setForm({ ...form, contact_urgence: e.target.value })}
                placeholder="Nom & Téléphone d'urgence"
                className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:border-[#0B2545] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Photo d&apos;identité (Base64)
              </label>
              <label className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-dashed border-slate-300 hover:border-[#0B2545] text-xs text-slate-700 flex items-center gap-2 cursor-pointer bg-slate-50">
                <Upload className="w-4 h-4 text-[#0B2545] shrink-0" />
                <span className="truncate">
                  {form.photo_name || 'Choisir une photo...'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageFileUpload(e, 'photo')}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Section 2 : Poste, Département (12 départements avec 6 sous-rubriques auto), Contrat & Rémunération */}
        <div className="pt-2 border-t border-slate-100">
          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-3">
            2. Poste, Département (6 sous-rubriques auto), Date d&apos;établissement &amp; Rémunération
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                NI (Numéro d&apos;Identification) *
              </label>
              <input
                type="text"
                required
                value={form.ni}
                onChange={(e) => setForm({ ...form, ni: e.target.value })}
                placeholder="Ex: BC1129970"
                className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-mono font-bold focus:border-[#0B2545] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Matricule Salarié *
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  required
                  value={form.matricule}
                  onChange={(e) => setForm({ ...form, matricule: e.target.value })}
                  className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono font-bold focus:border-[#0B2545] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleRegenerateMatricule}
                  title="Générer un nouveau matricule aléatoire unique"
                  className="min-h-[42px] px-3 rounded-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Département (Sélectionner pour pré-remplir les 6 missions en puces « • ») *
              </label>
              <select
                value={form.departement}
                onChange={(e) => handleDepartmentChange(e.target.value)}
                className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm bg-white font-semibold text-[#0B2545] focus:border-[#0B2545] focus:outline-none"
              >
                {deduplicatedDepartments.map((dept) => (
                  <option key={dept.code} value={dept.name}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Encadré affichant les 6 sous-rubriques / missions types du département sélectionné */}
            <div className="sm:col-span-4 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#0B2545]">
                  <Building2 className="w-4 h-4 text-amber-600" />
                  <span>
                    6 Sous-rubriques / Missions types — {currentDeptDef.name} :
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      responsabilites_text: formatMissionsWithBullets(currentDeptDef.missions)
                    }))
                  }
                  className="text-xs font-semibold text-amber-700 hover:text-amber-900 underline"
                >
                  Ré-appliquer ces 6 missions en puces « • »
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {currentDeptDef.missions.map((mission, idx) => (
                  <div
                    key={idx}
                    className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 flex items-start gap-2"
                  >
                    <span className="font-mono font-bold text-amber-600 shrink-0">
                      • {idx + 1}.
                    </span>
                    <span>{mission}</span>
                  </div>
                ))}
              </div>

              {/* Sélection rapide d'un poste lié au département */}
              <div className="pt-1 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold text-slate-600 mr-1">
                  Postes liés (clic pour sélectionner et pré-remplir les 6 missions) :
                </span>
                {currentDeptDef.postesLies.map((linkedPoste) => (
                  <button
                    key={linkedPoste}
                    type="button"
                    onClick={() => handlePosteChange(linkedPoste, true)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                      form.poste.toLowerCase() === linkedPoste.toLowerCase()
                        ? 'bg-[#0B2545] text-white border-[#0B2545]'
                        : 'bg-white text-slate-700 border-slate-300 hover:border-[#0B2545]'
                    }`}
                  >
                    {linkedPoste}
                  </button>
                ))}
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Poste (Saisie libre ou sélection d&apos;un poste lié → pré-remplit les 6 missions) *
              </label>
              <input
                type="text"
                required
                list="postes-lies-datalist"
                value={form.poste}
                onChange={(e) => handlePosteChange(e.target.value)}
                placeholder="Ex: Préparatrice de Commande"
                className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:border-[#0B2545] focus:outline-none"
              />
              <datalist id="postes-lies-datalist">
                {allLinkedPostes.map((item, i) => (
                  <option key={i} value={item.poste}>
                    {item.deptName}
                  </option>
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Manager / Signataire Employeur *
              </label>
              <input
                type="text"
                required
                value={form.manager}
                onChange={(e) => setForm({ ...form, manager: e.target.value })}
                placeholder="ANTOINE FORESTIN"
                className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm uppercase focus:border-[#0B2545] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Date d&apos;établissement (« A Surrey, le [DATE] ») *
              </label>
              <input
                type="date"
                required
                value={form.date_etablissement}
                onChange={(e) => setForm({ ...form, date_etablissement: e.target.value })}
                className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-amber-400 bg-amber-50/30 text-sm font-semibold focus:border-[#0B2545] focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Type de contrat (Surligné en jaune sur le PDF) *
              </label>
              <input
                type="text"
                required
                value={form.type_contrat}
                onChange={(e) => setForm({ ...form, type_contrat: e.target.value })}
                placeholder="Ex: Contrat à Durée Déterminée (CDI) de 2 ans"
                className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:border-[#0B2545] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Date d&apos;embauche (Prise de fonction) *
              </label>
              <input
                type="date"
                required
                value={form.date_embauche}
                onChange={(e) => setForm({ ...form, date_embauche: e.target.value })}
                className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:border-[#0B2545] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Date de fin (si applicable)
              </label>
              <input
                type="date"
                value={form.date_fin}
                onChange={(e) => setForm({ ...form, date_fin: e.target.value })}
                className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:border-[#0B2545] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Salaire de base (CAD / heure) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={form.salaire_horaire}
                onChange={(e) => setForm({ ...form, salaire_horaire: e.target.value })}
                placeholder="22"
                className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-mono font-bold focus:border-[#0B2545] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Primes
              </label>
              <input
                type="text"
                value={form.primes}
                onChange={(e) => setForm({ ...form, primes: e.target.value })}
                placeholder="Ex: Prime de rendement"
                className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:border-[#0B2545] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mode de paiement
              </label>
              <input
                type="text"
                value={form.mode_paiement}
                onChange={(e) => setForm({ ...form, mode_paiement: e.target.value })}
                placeholder="Ex: Virement bancaire bimensuel"
                className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:border-[#0B2545] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Horaire *
              </label>
              <input
                type="text"
                required
                value={form.horaire}
                onChange={(e) => setForm({ ...form, horaire: e.target.value })}
                placeholder="Temps plein – 40 heures par semaine"
                className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:border-[#0B2545] focus:outline-none"
              />
            </div>

            <div className="sm:col-span-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Lieu de travail *
              </label>
              <input
                type="text"
                required
                value={form.lieu_travail}
                onChange={(e) => setForm({ ...form, lieu_travail: e.target.value })}
                placeholder="Surrey, Colombie-Britanique, Canada"
                className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:border-[#0B2545] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 3 : "Vos principales responsabilités" (6 puces "•" auto + modifier/supprimer/ajouter) */}
        <div className="pt-2 border-t border-slate-100 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-amber-700">
              3. Vos principales responsabilités (Pré-remplies avec les 6 missions en puces « • » — Modifiables par l&apos;Admin RH) *
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    responsabilites_text: formatMissionsWithBullets(currentDeptDef.missions)
                  }))
                }
                className="text-xs font-semibold text-[#0B2545] underline hover:text-amber-700"
              >
                Pré-remplir les 6 missions du département ({currentDeptDef.missions.length} puces •)
              </button>
              <button
                type="button"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    responsabilites_text: DEFAULT_PROMESSE_RESPONSABILITES
                  }))
                }
                className="text-xs font-semibold text-slate-600 underline hover:text-[#0B2545]"
              >
                Restaurer les 6 missions de l&apos;exemplaire EMBAUCHE_SALIMATA1
              </button>
            </div>
          </div>

          {/* Éditeur interactif ligne par ligne (Modifier / Supprimer / Ajouter) */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="text-[11px] font-semibold text-slate-600">
              Gestion rapide des puces « • » ({currentBulletMissions.length} missions actives) — Vous pouvez modifier, supprimer ou ajouter une mission :
            </div>
            <div className="space-y-1.5">
              {currentBulletMissions.map((mission, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-sm font-bold text-amber-600 select-none px-1">•</span>
                  <input
                    type="text"
                    value={mission}
                    onChange={(e) => handleUpdateSingleMission(idx, e.target.value)}
                    className="flex-1 min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm text-slate-800 focus:border-[#0B2545] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleDeleteSingleMission(idx)}
                    title="Supprimer cette mission"
                    className="min-h-[36px] px-2.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 flex items-center justify-center"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Ajouter une nouvelle puce */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-sm font-bold text-emerald-600 select-none px-1">+</span>
              <input
                type="text"
                value={newMissionInput}
                onChange={(e) => setNewMissionInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSingleMission();
                  }
                }}
                placeholder="Ajouter une nouvelle mission / responsabilité en puce « • »..."
                className="flex-1 min-h-[38px] px-3 py-1.5 rounded-lg border border-dashed border-slate-300 bg-white text-xs sm:text-sm text-slate-800 focus:border-[#0B2545] focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddSingleMission}
                className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-[#0B2545] hover:bg-[#134074] text-white text-xs font-bold inline-flex items-center gap-1.5 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter puce</span>
              </button>
            </div>
          </div>

          {/* Textarea synchronisé avec puces "•" */}
          <textarea
            rows={6}
            required
            value={form.responsabilites_text}
            onChange={(e) => setForm({ ...form, responsabilites_text: e.target.value })}
            placeholder="• Mission 1..."
            className="w-full p-3.5 rounded-xl border border-slate-300 text-sm font-medium leading-relaxed focus:border-[#0B2545] focus:outline-none"
          />
        </div>

        {/* Section 4 : Upload des 4 Fichiers (Logo, Signature, Cachet, Filigrane) + Panneau Réglages Admin */}
        <div className="pt-2 border-t border-slate-100 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700">
              4. Fichiers Importés (Logo, Signature, Cachet, Filigrane) &amp; Panneau Réglages Admin (Temps Réel + Firestore)
            </h4>
            {settingsSavedBadge && (
              <span className="text-xs font-mono font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg">
                {settingsSavedBadge}
              </span>
            )}
          </div>

          {/* Cartes d'upload des 4 fichiers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Upload Logo */}
            <div
              onClick={() => setActiveAssetTab('logo')}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                activeAssetTab === 'logo'
                  ? 'border-[#0B2545] bg-blue-50/40 ring-2 ring-[#0B2545]/15'
                  : 'border-slate-200 bg-slate-50/70 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between gap-1.5">
                <div className="truncate">
                  <span className="text-xs font-bold text-slate-800 block">
                    1. Logo Entreprise
                  </span>
                  <span className="text-[11px] text-slate-500 block truncate">
                    {logoFileName}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleResetDefaultAssets('logo');
                    }}
                    className="px-2 py-1 rounded-lg bg-white border border-slate-300 text-[10px] text-slate-600 hover:text-slate-900"
                  >
                    Défaut
                  </button>
                  <label
                    onClick={(e) => e.stopPropagation()}
                    className="px-2.5 py-1 rounded-lg bg-[#0B2545] hover:bg-[#134074] text-white text-[11px] font-semibold cursor-pointer flex items-center gap-1"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Import</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) => handleImageFileUpload(e, 'logo')}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
              {logoDataUrl && (
                <div className="h-14 bg-white rounded-lg border border-slate-200 flex items-center justify-center p-1.5">
                  <img
                    src={tintedPreviewUrls.logo || logoDataUrl}
                    alt="Aperçu logo"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              )}
            </div>

            {/* 2. Upload Signature */}
            <div
              onClick={() => setActiveAssetTab('signature')}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                activeAssetTab === 'signature'
                  ? 'border-[#0B2545] bg-blue-50/40 ring-2 ring-[#0B2545]/15'
                  : 'border-slate-200 bg-slate-50/70 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between gap-1.5">
                <div className="truncate">
                  <span className="text-xs font-bold text-slate-800 block">
                    2. Signature Employeur
                  </span>
                  <span className="text-[11px] text-slate-500 block truncate">
                    {signatureFileName}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleResetDefaultAssets('signature');
                    }}
                    className="px-2 py-1 rounded-lg bg-white border border-slate-300 text-[10px] text-slate-600 hover:text-slate-900"
                  >
                    Défaut
                  </button>
                  <label
                    onClick={(e) => e.stopPropagation()}
                    className="px-2.5 py-1 rounded-lg bg-[#0B2545] hover:bg-[#134074] text-white text-[11px] font-semibold cursor-pointer flex items-center gap-1"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Import</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) => handleImageFileUpload(e, 'signature')}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
              {signatureDataUrl && (
                <div className="h-14 bg-white rounded-lg border border-slate-200 flex items-center justify-center p-1.5">
                  <img
                    src={tintedPreviewUrls.signature || signatureDataUrl}
                    alt="Aperçu signature"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              )}
            </div>

            {/* 3. Upload Cachet */}
            <div
              onClick={() => setActiveAssetTab('cachet')}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                activeAssetTab === 'cachet'
                  ? 'border-[#0B2545] bg-blue-50/40 ring-2 ring-[#0B2545]/15'
                  : 'border-slate-200 bg-slate-50/70 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between gap-1.5">
                <div className="truncate">
                  <span className="text-xs font-bold text-slate-800 block">
                    3. Cachet Entreprise
                  </span>
                  <span className="text-[11px] text-slate-500 block truncate">
                    {cachetFileName}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleResetDefaultAssets('cachet');
                    }}
                    className="px-2 py-1 rounded-lg bg-white border border-slate-300 text-[10px] text-slate-600 hover:text-slate-900"
                  >
                    Défaut
                  </button>
                  <label
                    onClick={(e) => e.stopPropagation()}
                    className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-bold cursor-pointer flex items-center gap-1"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Import</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) => handleImageFileUpload(e, 'cachet')}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
              {cachetDataUrl && (
                <div className="h-14 bg-white rounded-lg border border-slate-200 flex items-center justify-center p-1.5">
                  <img
                    src={tintedPreviewUrls.cachet || cachetDataUrl}
                    alt="Aperçu cachet"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              )}
            </div>

            {/* 4. Upload Filigrane (Blason) */}
            <div
              onClick={() => setActiveAssetTab('filigrane')}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                activeAssetTab === 'filigrane'
                  ? 'border-[#0B2545] bg-blue-50/40 ring-2 ring-[#0B2545]/15'
                  : 'border-slate-200 bg-slate-50/70 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between gap-1.5">
                <div className="truncate">
                  <span className="text-xs font-bold text-slate-800 block">
                    4. Filigrane (Blason)
                  </span>
                  <span className="text-[11px] text-slate-500 block truncate">
                    {filigraneFileName}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleResetDefaultAssets('filigrane');
                    }}
                    className="px-2 py-1 rounded-lg bg-white border border-slate-300 text-[10px] text-slate-600 hover:text-slate-900"
                  >
                    Défaut
                  </button>
                  <label
                    onClick={(e) => e.stopPropagation()}
                    className="px-2.5 py-1 rounded-lg bg-[#0B2545] hover:bg-[#134074] text-white text-[11px] font-semibold cursor-pointer flex items-center gap-1"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Import</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) => handleImageFileUpload(e, 'filigrane')}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
              {filigraneDataUrl && (
                <div className="h-14 bg-white rounded-lg border border-slate-200 flex items-center justify-center p-1.5">
                  <img
                    src={tintedPreviewUrls.filigrane || filigraneDataUrl}
                    alt="Aperçu filigrane"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              )}
            </div>
          </div>

          {/* PANNEAU RÉGLAGES FICHIERS IMPORTÉS */}
          <div className="rounded-2xl border border-slate-300 bg-slate-50 p-4 sm:p-5 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#0B2545]" />
                <div>
                  <h5 className="text-sm font-bold text-[#0B2545]">
                    Panneau Réglages Fichiers Importés — Prévisualisation en direct &amp; Sauvegarde Firestore
                  </h5>
                  <p className="text-[11px] text-slate-600">
                    Ajustez largeur (px/%), hauteur (px/%), opacité (%), couleur/teinte, position X/Y, alignement, rotation (°) et z-index.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleResetSingleAssetSettings(activeAssetTab)}
                  className="min-h-[36px] px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Réinitialiser « {activeAssetTab} »</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetAllAssetSettings}
                  className="min-h-[36px] px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-600"
                >
                  Tout réinitialiser
                </button>

                <button
                  type="button"
                  onClick={handleSaveAssetSettingsToFirestore}
                  disabled={savingSettingsFirestore}
                  className="min-h-[38px] px-4 py-1.5 rounded-xl bg-[#0B2545] hover:bg-[#134074] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs disabled:opacity-60"
                >
                  <Save className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    {savingSettingsFirestore
                      ? 'Sauvegarde Firestore...'
                      : 'Sauvegarder les réglages dans Firestore'}
                  </span>
                </button>
              </div>
            </div>

            {/* Onglets de sélection du fichier à régler */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ASSET_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveAssetTab(tab.key)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    activeAssetTab === tab.key
                      ? 'bg-[#0B2545] text-white border-[#0B2545] shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="text-xs font-bold">{tab.label}</div>
                  <div
                    className={`text-[10px] font-mono ${
                      activeAssetTab === tab.key ? 'text-amber-300' : 'text-slate-500'
                    }`}
                  >
                    {tab.badge}
                  </div>
                </button>
              ))}
            </div>

            {/* Contrôles détaillés pour l'élément sélectionné */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-white p-4 rounded-xl border border-slate-200">
              {/* 1. Largeur (px / %) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">
                    Largeur ({activeAssetCfg.widthUnit})
                  </label>
                  <div className="inline-flex rounded-lg border border-slate-300 overflow-hidden text-[11px] font-mono">
                    {(['px', '%'] as AssetUnit[]).map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => updateAssetItemSetting(activeAssetTab, 'widthUnit', u)}
                        className={`px-2 py-0.5 font-bold ${
                          activeAssetCfg.widthUnit === u
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
                    min={activeAssetCfg.widthUnit === '%' ? 20 : 30}
                    max={activeAssetCfg.widthUnit === '%' ? 250 : 550}
                    value={activeAssetCfg.widthValue}
                    onChange={(e) =>
                      updateAssetItemSetting(activeAssetTab, 'widthValue', Number(e.target.value))
                    }
                    className="flex-1 accent-[#0B2545]"
                  />
                  <input
                    type="number"
                    min={10}
                    max={1000}
                    value={activeAssetCfg.widthValue}
                    onChange={(e) =>
                      updateAssetItemSetting(
                        activeAssetTab,
                        'widthValue',
                        Number(e.target.value) || 50
                      )
                    }
                    className="w-20 px-2 py-1 rounded-lg border border-slate-300 text-xs font-mono text-center"
                  />
                </div>
              </div>

              {/* 2. Hauteur (px / %) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">
                    Hauteur ({activeAssetCfg.heightUnit})
                  </label>
                  <div className="inline-flex rounded-lg border border-slate-300 overflow-hidden text-[11px] font-mono">
                    {(['px', '%'] as AssetUnit[]).map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => updateAssetItemSetting(activeAssetTab, 'heightUnit', u)}
                        className={`px-2 py-0.5 font-bold ${
                          activeAssetCfg.heightUnit === u
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
                    min={activeAssetCfg.heightUnit === '%' ? 20 : 20}
                    max={activeAssetCfg.heightUnit === '%' ? 250 : 550}
                    value={activeAssetCfg.heightValue}
                    onChange={(e) =>
                      updateAssetItemSetting(activeAssetTab, 'heightValue', Number(e.target.value))
                    }
                    className="flex-1 accent-[#0B2545]"
                  />
                  <input
                    type="number"
                    min={10}
                    max={1000}
                    value={activeAssetCfg.heightValue}
                    onChange={(e) =>
                      updateAssetItemSetting(
                        activeAssetTab,
                        'heightValue',
                        Number(e.target.value) || 40
                      )
                    }
                    className="w-20 px-2 py-1 rounded-lg border border-slate-300 text-xs font-mono text-center"
                  />
                </div>
              </div>

              {/* 3. Opacité (%) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Opacité (%)</label>
                  <span className="text-xs font-mono font-bold text-[#0B2545]">
                    {activeAssetCfg.opacity}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={activeAssetCfg.opacity}
                    onChange={(e) =>
                      updateAssetItemSetting(activeAssetTab, 'opacity', Number(e.target.value))
                    }
                    className="flex-1 accent-[#0B2545]"
                  />
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={activeAssetCfg.opacity}
                    onChange={(e) =>
                      updateAssetItemSetting(
                        activeAssetTab,
                        'opacity',
                        Math.max(0, Math.min(100, Number(e.target.value) || 0))
                      )
                    }
                    className="w-16 px-2 py-1 rounded-lg border border-slate-300 text-xs font-mono text-center"
                  />
                </div>
              </div>

              {/* 4. Rotation (°) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Rotation (°)</label>
                  <div className="flex items-center gap-1">
                    {[-15, 0, 15].map((deg) => (
                      <button
                        key={deg}
                        type="button"
                        onClick={() => updateAssetItemSetting(activeAssetTab, 'rotation', deg)}
                        className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-[10px] font-mono text-slate-700"
                      >
                        {deg}°
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={-180}
                    max={180}
                    value={activeAssetCfg.rotation}
                    onChange={(e) =>
                      updateAssetItemSetting(activeAssetTab, 'rotation', Number(e.target.value))
                    }
                    className="flex-1 accent-[#0B2545]"
                  />
                  <input
                    type="number"
                    min={-180}
                    max={180}
                    value={activeAssetCfg.rotation}
                    onChange={(e) =>
                      updateAssetItemSetting(
                        activeAssetTab,
                        'rotation',
                        Math.max(-180, Math.min(180, Number(e.target.value) || 0))
                      )
                    }
                    className="w-16 px-2 py-1 rounded-lg border border-slate-300 text-xs font-mono text-center"
                  />
                </div>
              </div>

              {/* 5. Position X (Décalage horizontal px) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Position X (px)</label>
                  <button
                    type="button"
                    onClick={() => updateAssetItemSetting(activeAssetTab, 'offsetX', 0)}
                    className="text-[10px] font-mono text-slate-500 hover:text-slate-800 underline"
                  >
                    Centrer X (0)
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={-180}
                    max={180}
                    value={activeAssetCfg.offsetX}
                    onChange={(e) =>
                      updateAssetItemSetting(activeAssetTab, 'offsetX', Number(e.target.value))
                    }
                    className="flex-1 accent-[#0B2545]"
                  />
                  <input
                    type="number"
                    min={-300}
                    max={300}
                    value={activeAssetCfg.offsetX}
                    onChange={(e) =>
                      updateAssetItemSetting(activeAssetTab, 'offsetX', Number(e.target.value) || 0)
                    }
                    className="w-16 px-2 py-1 rounded-lg border border-slate-300 text-xs font-mono text-center"
                  />
                </div>
              </div>

              {/* 6. Position Y (Décalage vertical px) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Position Y (px)</label>
                  <button
                    type="button"
                    onClick={() => updateAssetItemSetting(activeAssetTab, 'offsetY', 0)}
                    className="text-[10px] font-mono text-slate-500 hover:text-slate-800 underline"
                  >
                    Centrer Y (0)
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={-180}
                    max={180}
                    value={activeAssetCfg.offsetY}
                    onChange={(e) =>
                      updateAssetItemSetting(activeAssetTab, 'offsetY', Number(e.target.value))
                    }
                    className="flex-1 accent-[#0B2545]"
                  />
                  <input
                    type="number"
                    min={-300}
                    max={300}
                    value={activeAssetCfg.offsetY}
                    onChange={(e) =>
                      updateAssetItemSetting(activeAssetTab, 'offsetY', Number(e.target.value) || 0)
                    }
                    className="w-16 px-2 py-1 rounded-lg border border-slate-300 text-xs font-mono text-center"
                  />
                </div>
              </div>

              {/* 7. Alignement Horizontal & Vertical */}
              <div className="space-y-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Alignement Horizontal (Gauche / Centre / Droite)
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    {(
                      [
                        { val: 'left', label: 'Gauche' },
                        { val: 'center', label: 'Centre' },
                        { val: 'right', label: 'Droite' }
                      ] as Array<{ val: HorizontalAlign; label: string }>
                    ).map((item) => (
                      <button
                        key={item.val}
                        type="button"
                        onClick={() => updateAssetItemSetting(activeAssetTab, 'alignX', item.val)}
                        className={`py-1 px-2 rounded-lg text-xs font-semibold border ${
                          activeAssetCfg.alignX === item.val
                            ? 'bg-[#0B2545] text-white border-[#0B2545]'
                            : 'bg-slate-50 text-slate-700 border-slate-300'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Alignement Vertical (Haut / Milieu / Bas)
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    {(
                      [
                        { val: 'top', label: 'Haut' },
                        { val: 'middle', label: 'Milieu' },
                        { val: 'bottom', label: 'Bas' }
                      ] as Array<{ val: VerticalAlign; label: string }>
                    ).map((item) => (
                      <button
                        key={item.val}
                        type="button"
                        onClick={() => updateAssetItemSetting(activeAssetTab, 'alignY', item.val)}
                        className={`py-1 px-2 rounded-lg text-xs font-semibold border ${
                          activeAssetCfg.alignY === item.val
                            ? 'bg-[#0B2545] text-white border-[#0B2545]'
                            : 'bg-slate-50 text-slate-700 border-slate-300'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 8. Couleur / Teinte & Z-Index (Filigrane) */}
              <div className="space-y-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">
                      Couleur / Teinte
                    </label>
                    <label className="inline-flex items-center gap-1.5 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activeAssetCfg.tintEnabled}
                        onChange={(e) =>
                          updateAssetItemSetting(activeAssetTab, 'tintEnabled', e.target.checked)
                        }
                        className="rounded border-slate-300 text-[#0B2545]"
                      />
                      <span className="font-semibold text-slate-700">Activer teinte</span>
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={activeAssetCfg.tintColor}
                      onChange={(e) => {
                        updateAssetItemSetting(activeAssetTab, 'tintColor', e.target.value);
                        updateAssetItemSetting(activeAssetTab, 'tintEnabled', true);
                      }}
                      className="w-8 h-8 rounded cursor-pointer border border-slate-300"
                    />
                    <div className="flex flex-wrap gap-1">
                      {TINT_PRESETS.map((preset) => (
                        <button
                          key={preset.color}
                          type="button"
                          title={preset.label}
                          onClick={() => {
                            updateAssetItemSetting(activeAssetTab, 'tintColor', preset.color);
                            updateAssetItemSetting(activeAssetTab, 'tintEnabled', true);
                          }}
                          style={{ backgroundColor: preset.color }}
                          className="w-5 h-5 rounded-full border border-white shadow-xs ring-1 ring-slate-300"
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Contrôle Z-Index pour Filigrane (et ordre d'affichage) */}
                <div className="pt-1 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">
                      Z-Index {activeAssetTab === 'filigrane' ? '(Plan Filigrane)' : '(Calque)'}
                    </label>
                    <span className="text-[11px] font-mono font-bold text-[#0B2545]">
                      z-index: {activeAssetCfg.zIndex}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateAssetItemSetting(activeAssetTab, 'zIndex', 0)}
                      className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-semibold border ${
                        activeAssetCfg.zIndex <= 10
                          ? 'bg-[#0B2545] text-white border-[#0B2545]'
                          : 'bg-slate-50 text-slate-700 border-slate-300'
                      }`}
                    >
                      Sous texte (0)
                    </button>
                    <button
                      type="button"
                      onClick={() => updateAssetItemSetting(activeAssetTab, 'zIndex', 20)}
                      className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-semibold border ${
                        activeAssetCfg.zIndex > 10
                          ? 'bg-amber-500 text-slate-950 border-amber-500'
                          : 'bg-slate-50 text-slate-700 border-slate-300'
                      }`}
                    >
                      Sur texte (20)
                    </button>
                    <input
                      type="number"
                      min={-10}
                      max={50}
                      value={activeAssetCfg.zIndex}
                      onChange={(e) =>
                        updateAssetItemSetting(
                          activeAssetTab,
                          'zIndex',
                          Number(e.target.value) || 0
                        )
                      }
                      className="w-14 px-1.5 py-1 rounded-lg border border-slate-300 text-xs font-mono text-center"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-end gap-3">
          <button
            type="submit"
            disabled={saving}
            className="min-h-[48px] px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center gap-2 transition-colors shadow-sm disabled:opacity-60"
          >
            <FileText className="w-4 h-4" />
            <span>
              {saving
                ? 'Enregistrement & Envoi Courrier...'
                : 'Valider, Enregistrer & Envoyer la Promesse par Email'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="min-h-[48px] px-6 py-3 rounded-xl bg-[#0B2265] hover:bg-[#13368E] text-white font-bold text-sm flex items-center gap-2 transition-colors shadow-sm disabled:opacity-60"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>
              {downloadingPdf
                ? 'Téléchargement...'
                : "Télécharger PDF Promesse d'embauche"}
            </span>
          </button>
        </div>
      </form>

      {/* APERÇU OFFICIEL EN DIRECT DES 2 PAGES A4 (100% IDENTIQUE À EMBAUCHE_SALIMATA1.pdf + RÉGLAGES TEMPS RÉEL) */}
      <div className="bg-slate-900 rounded-2xl p-4 sm:p-8 space-y-6 border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5 text-white">
            <Eye className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-display font-bold text-lg">
                Prévisualisation en Direct — Promesse d&apos;Embauche (A4 · 2 Pages)
              </h3>
              <p className="text-xs text-slate-400">
                Aperçu temps réel des réglages (largeur, hauteur, opacité, teinte, X/Y, alignement, rotation, z-index filigrane) et des missions en puces « • » avant sauvegarde
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleSaveAssetSettingsToFirestore}
              disabled={savingSettingsFirestore}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-semibold text-xs sm:text-sm flex items-center gap-2 transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>
                {savingSettingsFirestore ? 'Sauvegarde...' : 'Sauvegarder réglages Firestore'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#0B2545] font-bold text-xs sm:text-sm flex items-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Télécharger PDF Promesse d&apos;embauche</span>
            </button>
          </div>
        </div>

        {/* Aperçu Visuel Haute-Fidélité des 2 Pages A4 */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
          {/* PAGE 1 PREVIEW */}
          <div className="bg-white text-black rounded-lg shadow-xl p-6 sm:p-8 relative overflow-hidden min-h-[780px] flex flex-col justify-between border border-slate-300">
            {/* Filigrane (b) : Grand blason avec réglages temps réel (largeur, hauteur, opacité, teinte, X/Y, alignement, rotation, z-index) */}
            {(tintedPreviewUrls.filigrane || filigraneDataUrl) && (
              <img
                src={tintedPreviewUrls.filigrane || filigraneDataUrl}
                alt=""
                style={getFiligranePreviewStyle(1)}
                className="object-contain pointer-events-none select-none absolute"
              />
            )}

            <div className="relative z-10 space-y-4">
              {/* En-tête Page 1 */}
              <div className="grid grid-cols-12 gap-2 items-start">
                <div className="col-span-5 space-y-1">
                  {/* Zone Logo avec alignement, taille, opacité, teinte, X/Y, rotation */}
                  <div
                    className={`min-h-[64px] w-full ${getLiveAssetBoxClasses(assetsConfig.logo)}`}
                  >
                    <img
                      src={
                        tintedPreviewUrls.logo ||
                        logoDataUrl ||
                        CONTRACT_STATIC_ASSETS.logoAtlantic
                      }
                      alt="Atlantic Transport"
                      style={getLiveAssetInlineStyle(assetsConfig.logo, { w: 180, h: 60 })}
                      className="object-contain"
                    />
                  </div>
                  <div className="text-[11px] leading-snug text-[#3A6E48] pt-1">
                    <div>Atlantic Transport ltd.</div>
                    <div>King George Blvd, Surrey</div>
                    <div>BC V3T 2W1, Canada</div>
                    <div>Téléphone : +1 (506) 802-2226</div>
                    <div>
                      Email :{' '}
                      <span className="font-bold text-[#1B6CA8]">
                        atlantictransport.int@ik.me
                      </span>
                    </div>
                  </div>
                </div>

                <div className="col-span-4 text-center pt-12">
                  <div className="text-xs font-bold text-[#3A6E48]">
                    A Surrey, le{' '}
                    {formatPromesseDateSlash(
                      previewData.date_etablissement ||
                        previewData.date_emission ||
                        previewData.date_embauche
                    )}
                  </div>
                  <div className="text-xs font-bold text-[#3A6E48] mt-1">
                    Numéro d&apos;entreprise (NE): 799094917
                  </div>
                </div>

                <div className="col-span-3 flex flex-col items-end justify-between">
                  <img
                    src={CONTRACT_STATIC_ASSETS.logoCanada}
                    alt="Canada"
                    className="h-12 object-contain"
                  />
                  {/* Filigrane (a) : Blason au niveau de l'en-tête */}
                  <img
                    src={CONTRACT_STATIC_ASSETS.blasonOriginal}
                    alt="Blason en-tête"
                    className="h-10 object-contain mt-6"
                  />
                </div>
              </div>

              <hr className="border-slate-400" />

              {/* Bandeau Bleu Marine PROMESSE D'EMBAUCHE */}
              <div className="bg-[#0C2366] text-white text-center py-3 px-4 font-bold text-xl sm:text-2xl tracking-wide uppercase">
                PROMESSE D&apos;EMBAUCHE
              </div>

              <hr className="border-slate-400" />

              {/* Ligne NI & Destinataire */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm font-bold pt-1">
                <div>
                  <span className="text-[#C6882C]">NI: </span>
                  <span className="text-black">{previewData.ni}</span>
                </div>
                <div>
                  <span className="text-[#C6882C]">Destinataire: </span>
                  <span className="text-black">{previewData.nom_complet}</span>
                </div>
              </div>

              {/* Objet & Intro */}
              <div className="pt-2 space-y-2 text-xs sm:text-[13px] leading-relaxed">
                <div className="font-bold text-sm">
                  <span className="text-[#C67D26]">Objet : </span>
                  <span className="text-black">Lettre d&apos;embauche.</span>
                </div>
                <div>{salutationPreview},</div>
                <p>
                  Nous avons le plaisir de vous informer que la société{' '}
                  <strong>Atlantic Transport ltd</strong> a décidé de vous embaucher à
                  la suite de l&apos;étude favorable de votre candidature.
                </p>
              </div>

              {/* Section : Informations sur le poste (avec champs surlignés en jaune #FFFF00) */}
              <div className="pt-1">
                <div className="bg-[#F4F4F4] px-3 py-1.5 flex items-center gap-2 text-xs sm:text-sm font-bold text-[#C67D26]">
                  <span className="w-2 h-2 rounded-full border border-[#C67D26] inline-block" />
                  <span>Informations sur le poste:</span>
                </div>

                <div className="pl-4 pr-2 pt-2 space-y-2.5 text-xs sm:text-[13px]">
                  <div className="border-b border-black pb-2">
                    <strong>Poste :</strong>{' '}
                    <span className="ml-3 bg-[#FFFF00] px-1 py-0.5 text-black">
                      {previewData.poste}
                    </span>
                  </div>
                  <div className="border-b border-black pb-2">
                    <strong>Type de contrat :</strong>{' '}
                    <span className="ml-3 bg-[#FFFF00] px-1 py-0.5 text-black">
                      {previewData.type_contrat}
                    </span>
                  </div>
                  <div className="border-b border-black pb-2">
                    <strong>Date de prise de fonction :</strong>{' '}
                    <span className="ml-3 bg-[#FFFF00] px-1 py-0.5 text-black">
                      {formatPromesseDateLongFr(previewData.date_embauche)}
                    </span>
                  </div>
                  <div className="border-b border-black pb-2">
                    <strong>Lieu de travail :</strong>{' '}
                    <span className="ml-3 bg-[#FFFF00] px-1 py-0.5 text-black">
                      {previewData.lieu_travail}
                    </span>
                  </div>
                  <div className="pb-1">
                    <strong>Horaire :</strong>{' '}
                    <span className="ml-3 bg-[#FFFF00] px-1 py-0.5 text-black">
                      {previewData.horaire}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section : Rémunération et avantages */}
              <div className="pt-1">
                <div className="bg-[#F4F4F4] px-3 py-1.5 flex items-center gap-2 text-xs sm:text-sm font-bold text-[#C67D26]">
                  <span className="w-2 h-2 rounded-full border border-[#C67D26] inline-block" />
                  <span>Rémunération et avantages :</span>
                </div>

                <ul className="pl-5 pr-2 pt-2 space-y-2 text-xs sm:text-[13px] list-disc">
                  <li className="border-b border-black pb-1.5">
                    <strong>Salaire :</strong>{' '}
                    <span className="bg-[#FFFF00] px-1 py-0.5 text-black">
                      {previewData.salaire_horaire} CAD par heure
                    </span>
                  </li>
                  <li className="border-b border-black pb-1.5 font-bold">
                    Congés payés conformément à la législation en vigueur
                  </li>
                  <li className="border-b border-black pb-1.5 font-bold">
                    Assurance collective après période d&apos;essai
                  </li>
                  <li className="font-bold">
                    Possibilités d&apos;évolution professionnelle
                  </li>
                </ul>
              </div>
            </div>

            {/* Pied de page 1 */}
            <div className="relative z-10 pt-6 flex items-center gap-3 text-xs font-bold">
              <span>1</span>
              <div className="flex-1 h-[1.5px] bg-black" />
            </div>
          </div>

          {/* PAGE 2 PREVIEW */}
          <div className="bg-white text-black rounded-lg shadow-xl p-6 sm:p-8 relative overflow-hidden min-h-[780px] flex flex-col justify-between border border-slate-300">
            {/* Filigrane (b) : Grand blason sur la Page 2 avec réglages temps réel */}
            {(tintedPreviewUrls.filigrane || filigraneDataUrl) && (
              <img
                src={tintedPreviewUrls.filigrane || filigraneDataUrl}
                alt=""
                style={getFiligranePreviewStyle(2)}
                className="object-contain pointer-events-none select-none absolute"
              />
            )}

            <div className="relative z-10 space-y-5">
              {/* Section : Vos principales responsabilités */}
              <div>
                <div className="bg-[#F4F4F4] px-3 py-1.5 flex items-center gap-2 text-xs sm:text-sm font-bold text-[#C67D26]">
                  <span className="w-2 h-2 rounded-full border border-[#C67D26] inline-block" />
                  <span>Vos principales responsabilités</span>
                </div>

                <ul className="pl-7 pr-2 pt-3 space-y-2.5 text-xs sm:text-[13px] font-bold list-disc leading-relaxed">
                  {previewData.responsabilites.map((line, idx) => (
                    <li key={idx}>{line}</li>
                  ))}
                </ul>
              </div>

              {/* NB & Formules de politesse */}
              <div className="pt-4 space-y-3 text-xs sm:text-[13px] leading-relaxed">
                <p>
                  <strong>NB :</strong> Cette offre d&apos;emploi est conditionnelle à
                  l&apos;obtention des autorisations légales de travail requises au
                  Canada.
                </p>
                <p>
                  Nous vous remercions de bien vouloir confirmer votre acceptation de
                  cette offre par signature du document.
                </p>
                <p>
                  Veuillez agréer, l&apos;expression de nos salutations distinguées.
                </p>
              </div>

              {/* Bloc Signatures Gauche & Droite */}
              <div className="pt-6 grid grid-cols-2 gap-6 items-start">
                <div className="space-y-2">
                  <div className="font-bold text-xs sm:text-sm">
                    Pour Atlantic Transport Ltd.
                  </div>
                  <div className="text-sm sm:text-base uppercase tracking-wide">
                    {previewData.manager || 'ANTOINE FORESTIN'}
                  </div>
                  <div className="relative pt-4 min-h-[115px]">
                    <div className="text-xs font-bold">
                      Signature : .........................
                    </div>
                    {/* Zone superposée pour Cachet et Signature avec réglages temps réel */}
                    <div className="relative w-full h-24 mt-1">
                      {(tintedPreviewUrls.cachet || cachetDataUrl) && (
                        <div
                          style={{ zIndex: assetsConfig.cachet.zIndex ?? 11 }}
                          className={`absolute inset-0 pointer-events-none ${getLiveAssetBoxClasses(
                            assetsConfig.cachet
                          )}`}
                        >
                          <img
                            src={tintedPreviewUrls.cachet || cachetDataUrl}
                            alt="Cachet"
                            style={getLiveAssetInlineStyle(assetsConfig.cachet, {
                              w: 155,
                              h: 84
                            })}
                            className="object-contain"
                          />
                        </div>
                      )}
                      {(tintedPreviewUrls.signature || signatureDataUrl) && (
                        <div
                          style={{ zIndex: assetsConfig.signature.zIndex ?? 12 }}
                          className={`absolute inset-0 pointer-events-none ${getLiveAssetBoxClasses(
                            assetsConfig.signature
                          )}`}
                        >
                          <img
                            src={tintedPreviewUrls.signature || signatureDataUrl}
                            alt="Signature"
                            style={getLiveAssetInlineStyle(assetsConfig.signature, {
                              w: 130,
                              h: 68
                            })}
                            className="object-contain"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-right sm:text-left sm:pl-8">
                  <div className="font-bold text-xs sm:text-sm">
                    Pour l&apos;employer
                  </div>
                  <div className="text-sm sm:text-base uppercase tracking-wide">
                    {previewData.nom_complet}
                  </div>
                  <div className="pt-4 min-h-[92px]">
                    <div className="text-xs font-bold">
                      Signature : .........................
                    </div>
                  </div>
                </div>
              </div>

              {/* Mention Fait en double exemplaire */}
              <div className="pt-6 text-center space-y-2">
                <div className="text-xs font-bold">Fait en double exemplaire</div>
                <div className="w-4/5 mx-auto h-[3px] bg-black" />
              </div>
            </div>

            {/* Pied de page 2 */}
            <div className="relative z-10 pt-6 flex items-center gap-3 text-xs font-bold">
              <span>2</span>
              <div className="flex-1 h-[1.5px] bg-black" />
            </div>
          </div>
        </div>

        {/* Lecteur PDF jsPDF intégré après validation */}
        {pdfBlobUrl && (
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <div className="text-xs font-mono text-amber-400">
              Rendu PDF jsPDF natif prêt à l&apos;impression / téléchargement :
            </div>
            <iframe
              src={pdfBlobUrl}
              title="Aperçu PDF Promesse d'embauche"
              className="w-full h-[640px] rounded-xl border border-slate-700 bg-white"
            />
          </div>
        )}
      </div>
    </div>
  );
};
