import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Edit3,
  Power,
  KeyRound,
  Settings,
  Mail,
  FileJson,
  Download,
  LogOut,
  CheckCircle2,
  ShieldAlert,
  Upload,
  FileText,
  X,
  Search,
  Trash2,
  Eye,
  EyeOff,
  Link2,
  Copy,
  Ban,
  ExternalLink,
  Lock,
  QrCode
} from 'lucide-react';
import { ContactMessage, Employee, SiteSettings } from '../types';
import { BrandLogo } from './BrandLogo';
import {
  compressPhotoToSafeBase64,
  createPortableEmployeeToken,
  deleteContactMessage,
  deleteEmployeeAndContractsFromFirestore,
  exportEmployesJsonFile,
  fetchEmployeesFromFirestore,
  generateDefaultAvatarSvgDataUri,
  generateUniqueMatriculeInFirestore,
  getContactMessages,
  getEmployees,
  getNextMatricule,
  markTokenRevoked,
  saveEmployees,
  saveSiteSettings,
  setAdminPassword,
  setCachedContractPdf,
  subscribeToEmployeesFirestore,
  verifyAdminPasswordJS,
  writeEmployeeToFirestore
} from '../services/staticStorage';
import { formatReadableFirestoreError } from '../firebase';
import {
  buildHebergementPoint2Text,
  downloadEmployeeContractPdf,
  formatSalaryContract,
  generateEmployeeContractPdfDataUri,
  getEmployeeStatusUrl
} from '../services/contractPdfGenerator';
import { PromesseEmbaucheSection } from './PromesseEmbaucheSection';

type AdminTab = 'employees' | 'promesse' | 'cms' | 'messages' | 'json';

function resolveInitialAdminTab(): AdminTab {
  if (typeof window === 'undefined') return 'employees';
  const path = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  if (path.includes('/admin/promesse-embauche') || hash.includes('promesse-embauche')) {
    return 'promesse';
  }
  return 'employees';
}

interface AdminBackofficeProps {
  settings: SiteSettings;
  adminToken: string | null;
  onAdminAuthenticated: (token: string) => void;
  onAdminLogout: () => void;
  onSettingsUpdated: (newSettings: SiteSettings) => void;
  onBackToSite: () => void;
  onOpenDirectEmployeeLink?: (token: string) => void;
}

export const AdminBackoffice: React.FC<AdminBackofficeProps> = ({
  settings,
  adminToken,
  onAdminAuthenticated,
  onAdminLogout,
  onSettingsUpdated,
  onBackToSite,
  onOpenDirectEmployeeLink
}) => {
  // Login states (Simple JS password verification for admin.html)
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPass, setShowLoginPass] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Dashboard states
  const [activeTab, setActiveTab] = useState<AdminTab>(resolveInitialAdminTab);
  const [employees, setEmployees] = useState<Employee[]>(() => getEmployees());

  const switchAdminTab = (tab: AdminTab) => {
    setActiveTab(tab);
    try {
      if (tab === 'promesse') {
        window.history.pushState({}, '', '/admin/promesse-embauche');
      } else if (window.location.pathname.toLowerCase().includes('/admin/promesse-embauche')) {
        window.history.pushState({}, '', '/admin.html');
      }
    } catch {
      // Ignore history push errors in sandboxed iframes
    }
  };

  useEffect(() => {
    const onPopState = () => {
      setActiveTab(resolveInitialAdminTab());
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);
  const [messages, setMessages] = useState<ContactMessage[]>(() => getContactMessages());
  const [nextMatricule, setNextMatricule] = useState<string>(() => getNextMatricule());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [generatingPdfId, setGeneratingPdfId] = useState<number | null>(null);

  // Employee Modal (Add / Edit with all required Contract & Photo fields)
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [autoDownloadPdfOnSave, setAutoDownloadPdfOnSave] = useState(true);
  const [savingEmp, setSavingEmp] = useState(false);

  // Delete Confirmation Modal
  const [deleteModalEmp, setDeleteModalEmp] = useState<Employee | null>(null);
  const [deletingEmp, setDeletingEmp] = useState(false);

  const [empForm, setEmpForm] = useState({
    civilite: 'Monsieur' as 'Monsieur' | 'Madame',
    nom_complet: '',
    email: '',
    telephone: '+1 (506) 802-2226',
    adresse: '',
    date_naissance: '1990-05-15',
    nationalite: 'Canadienne',
    poste: '',
    departement: 'Opérations Logistiques',
    type_contrat: 'CDI' as 'CDI' | 'CDD',
    date_effet: new Date().toISOString().slice(0, 10),
    date_fin_cdd: '2027-09-28',
    duree_periode_essai: '3 semaines',
    lieu_travail: 'Surrey, Colombie-Britannique (King George Blvd, Surrey BC V3T 2W1)',
    horaires: '40 heures par semaine (du lundi au vendredi, 08h00 - 17h00)',
    salaire: '4600',
    devise: 'CAD',
    hebergement_fourni: false,
    hebergement_duree_type: 'duree_precise' as 'duree_precise' | 'toute_duree_contrat',
    hebergement_nombre_mois: '3',
    hebergement_lieu_type: 'preciser_lieu' as 'preciser_lieu' | 'texte_generique',
    adresse_hebergement: '',
    password: 'Employe@2026!',
    photo_base64: '',
    photo_name: ''
  });

  // Password Reset Modal
  const [resetModalEmp, setResetModalEmp] = useState<Employee | null>(null);
  const [tempResetPassword, setTempResetPassword] = useState('');

  // Site CMS Editor State
  const [cmsForm, setCmsForm] = useState<SiteSettings>(settings);
  const [newAdminPassword, setNewAdminPassword] = useState('');

  useEffect(() => {
    setCmsForm(settings);
  }, [settings]);

  const refreshLocalData = async () => {
    const loadedMessages = getContactMessages();
    setMessages(loadedMessages);
    try {
      const freshEmployees = await fetchEmployeesFromFirestore();
      setEmployees(freshEmployees);
      setNextMatricule(getNextMatricule(freshEmployees));
    } catch (error) {
      const localList = getEmployees();
      setEmployees(localList);
      setNextMatricule(getNextMatricule(localList));
      setFeedback({
        type: 'error',
        text: formatReadableFirestoreError(error)
      });
    }
  };

  // Real-time Firestore listener on collection "employees" (Requirement 4)
  useEffect(() => {
    setMessages(getContactMessages());
    const unsubscribe = subscribeToEmployeesFirestore(
      (liveEmployees) => {
        setEmployees(liveEmployees);
        setNextMatricule((prev) => {
          const isDuplicate = liveEmployees.some(
            (e) => e.matricule.toUpperCase() === prev.toUpperCase()
          );
          if (isDuplicate || /^EMP-\d{4}-\d{3}$/i.test(prev)) {
            return getNextMatricule(liveEmployees);
          }
          return prev;
        });
      },
      (errMessage) => {
        setFeedback({
          type: 'error',
          text: errMessage
        });
      }
    );
    return () => {
      unsubscribe();
    };
  }, []);

  // Pure JS password authentication
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!verifyAdminPasswordJS(loginPassword)) {
      setLoginError('Mot de passe administrateur incorrect.');
      return;
    }
    setLoginPassword('');
    onAdminAuthenticated('admin-js-local-session');
  };

  const openAddEmployeeModal = () => {
    setEditingEmployee(null);
    setModalError(null);
    setAutoDownloadPdfOnSave(true);
    const freshMatricule = getNextMatricule(employees);
    setNextMatricule(freshMatricule);
    setEmpForm({
      civilite: 'Monsieur',
      nom_complet: '',
      email: '',
      telephone: '+1 (604) 555-0199',
      adresse: 'King George Blvd, Surrey, BC V3T 2W1, Canada',
      date_naissance: '1991-06-15',
      nationalite: 'Canadienne',
      poste: '',
      departement: 'Opérations Logistiques',
      type_contrat: 'CDI',
      date_effet: new Date().toISOString().slice(0, 10),
      date_fin_cdd: '2027-09-28',
      duree_periode_essai: '3 semaines',
      lieu_travail: 'Surrey, Colombie-Britannique (King George Blvd, Surrey BC V3T 2W1)',
      horaires: '40 heures par semaine (du lundi au vendredi, 08h00 - 17h00)',
      salaire: '4600',
      devise: 'CAD',
      hebergement_fourni: false,
      hebergement_duree_type: 'duree_precise',
      hebergement_nombre_mois: '3',
      hebergement_lieu_type: 'preciser_lieu',
      adresse_hebergement: 'King George Blvd, Surrey, Colombie-Britannique Canada',
      password: 'Employe@2026!',
      photo_base64: '',
      photo_name: ''
    });
    setModalOpen(true);
  };

  const openEditEmployeeModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setModalError(null);
    setAutoDownloadPdfOnSave(false);
    const isCddType = String(emp.type_contrat).toUpperCase().includes('CDD');
    setEmpForm({
      civilite: emp.civilite === 'Madame' ? 'Madame' : 'Monsieur',
      nom_complet: emp.nom_complet || `${emp.prenom} ${emp.nom}`.toUpperCase(),
      email: emp.email,
      telephone: emp.telephone || '',
      adresse: emp.adresse || '',
      date_naissance: emp.date_naissance || '1990-01-01',
      nationalite: emp.nationalite || 'Canadienne',
      poste: emp.poste,
      departement: emp.departement || 'Opérations Logistiques',
      type_contrat: isCddType ? 'CDD' : 'CDI',
      date_effet: emp.date_effet || emp.date_embauche,
      date_fin_cdd: emp.date_fin_cdd || '2027-09-28',
      duree_periode_essai: emp.duree_periode_essai || '3 semaines',
      lieu_travail:
        emp.lieu_travail || 'Surrey, Colombie-Britannique (King George Blvd, Surrey BC V3T 2W1)',
      horaires:
        emp.horaires || '40 heures par semaine (du lundi au vendredi, 08h00 - 17h00)',
      salaire: String(emp.salaire),
      devise: emp.devise || 'CAD',
      hebergement_fourni: Boolean(emp.hebergement_fourni),
      hebergement_duree_type:
        emp.hebergement_duree_type === 'toute_duree_contrat'
          ? 'toute_duree_contrat'
          : 'duree_precise',
      hebergement_nombre_mois: String(emp.hebergement_nombre_mois || 3),
      hebergement_lieu_type:
        emp.hebergement_lieu_type === 'texte_generique' ? 'texte_generique' : 'preciser_lieu',
      adresse_hebergement:
        emp.adresse_hebergement || 'King George Blvd, Surrey, Colombie-Britannique Canada',
      password: emp.password || 'Employe@2026!',
      photo_base64: emp.photo || emp.photo_url || '',
      photo_name: ''
    });
    setModalOpen(true);
  };

  // Convert uploaded photo to compressed base64 for Firestore & employes.json field "photo"
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      setFeedback({ type: 'error', text: 'Seuls les formats photo JPG, PNG et WebP sont autorisés.' });
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result === 'string') {
        const safeCompressed = await compressPhotoToSafeBase64(reader.result);
        setEmpForm((prev) => ({
          ...prev,
          photo_base64: safeCompressed,
          photo_name: file.name
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCmsForm((prev) => ({ ...prev, logo_url: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDownloadContractForAdmin = async (emp: Employee) => {
    try {
      setGeneratingPdfId(emp.id);
      const pdfDataUri = await downloadEmployeeContractPdf(emp);
      setCachedContractPdf(emp.matricule, pdfDataUri);
      setFeedback({
        type: 'success',
        text: `Contrat PDF (${emp.type_contrat}) généré avec jsPDF et téléchargé pour ${emp.nom_complet} (${emp.matricule}).`
      });
    } catch {
      setFeedback({
        type: 'error',
        text: 'Erreur lors de la génération du contrat PDF avec jsPDF.'
      });
    } finally {
      setGeneratingPdfId(null);
    }
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEmp(true);
    setFeedback(null);
    setModalError(null);

    try {
      const currentList = employees.length > 0 ? employees : getEmployees();
      const fullNameClean = empForm.nom_complet.trim().toUpperCase();
      const nameParts = fullNameClean.split(/\s+/);
      const prenom = nameParts[0] || 'Salarié';
      const nom = nameParts.slice(1).join(' ') || fullNameClean;

      // 1. Verify random matricule uniqueness in Firestore before validation (regenerate if duplicate)
      const uniqueMatricule = editingEmployee
        ? editingEmployee.matricule
        : await generateUniqueMatriculeInFirestore(nextMatricule, currentList);

      const cleanEmail =
        empForm.email.trim().toLowerCase() ||
        `${uniqueMatricule.toLowerCase()}@atlantictransport.ca`;

      const now = new Date().toISOString();
      const todayIso = now.slice(0, 10);

      const rawPhoto =
        empForm.photo_base64 && empForm.photo_base64.trim().length > 0
          ? empForm.photo_base64
          : editingEmployee?.photo ||
            generateDefaultAvatarSvgDataUri(prenom, nom, uniqueMatricule);
      const resolvedPhotoBase64 = await compressPhotoToSafeBase64(rawPhoto);

      const baseEmpRecord: Employee = {
        id: editingEmployee
          ? editingEmployee.id
          : currentList.length > 0
          ? Math.max(...currentList.map((i) => Number(i.id) || 0)) + 1
          : 1,
        firestore_id: editingEmployee?.firestore_id,
        matricule: uniqueMatricule,
        civilite: empForm.civilite,
        nom_complet: fullNameClean,
        prenom,
        nom,
        email: cleanEmail,
        password: empForm.password.trim() || 'Employe@2026!',
        telephone: empForm.telephone.trim(),
        adresse: empForm.adresse.trim(),
        date_naissance: empForm.date_naissance,
        nationalite: empForm.nationalite.trim(),
        poste: empForm.poste.trim(),
        departement: empForm.departement.trim() || 'Opérations Logistiques',
        type_contrat: empForm.type_contrat,
        date_effet: empForm.date_effet,
        date_embauche: empForm.date_effet,
        date_fin_cdd: empForm.type_contrat === 'CDD' ? empForm.date_fin_cdd : '',
        duree_periode_essai: empForm.duree_periode_essai.trim() || '3 semaines',
        lieu_travail: empForm.lieu_travail.trim(),
        horaires: empForm.horaires.trim(),
        salaire: parseFloat(empForm.salaire) || 0,
        devise: empForm.devise || 'CAD',
        hebergement_fourni: empForm.hebergement_fourni,
        hebergement_duree_type: empForm.hebergement_duree_type,
        hebergement_nombre_mois: Math.max(1, parseInt(empForm.hebergement_nombre_mois, 10) || 3),
        hebergement_lieu_type: empForm.hebergement_lieu_type,
        adresse_hebergement:
          empForm.hebergement_fourni && empForm.hebergement_lieu_type === 'preciser_lieu'
            ? empForm.adresse_hebergement.trim()
            : '',
        date_signature: todayIso,
        photo: resolvedPhotoBase64,
        photo_url: resolvedPhotoBase64,
        contrat_pdf_url: '',
        has_custom_pdf: true,
        must_change_password: editingEmployee ? editingEmployee.must_change_password : false,
        is_active: editingEmployee ? editingEmployee.is_active : true,
        access_token: null,
        access_token_created_at: now,
        created_at: editingEmployee ? editingEmployee.created_at : now,
        updated_at: now
      };

      // Generate portable token for direct URL & QR status
      baseEmpRecord.access_token = createPortableEmployeeToken(baseEmpRecord);

      // STEP 1: Write to Firestore collection "employees" with all form fields BEFORE generating the PDF
      const { docId, employee: savedEmp } = await writeEmployeeToFirestore(
        baseEmpRecord,
        Boolean(editingEmployee)
      );
      console.log('Document Firestore créé/mis à jour avec ID :', docId);

      // STEP 2: Immediately reload the employee list from Firestore and update local state
      const freshEmployees = await fetchEmployeesFromFirestore();
      setEmployees(freshEmployees);
      setNextMatricule(getNextMatricule(freshEmployees));

      // Close modal now that Firestore persistence & list refresh succeeded
      setModalOpen(false);

      // STEP 3: Generate client-side PDF Contract via jsPDF and trigger download if checked
      try {
        const pdfDataUri = await generateEmployeeContractPdfDataUri(savedEmp);
        setCachedContractPdf(savedEmp.matricule, pdfDataUri);

        if (autoDownloadPdfOnSave) {
          const link = document.createElement('a');
          link.href = pdfDataUri;
          link.download = `Contrat_Travail_${savedEmp.matricule}_${savedEmp.nom.replace(/\s+/g, '_')}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } catch (pdfErr) {
        console.error('Erreur lors de la génération du PDF:', pdfErr);
      }

      setFeedback({
        type: 'success',
        text: editingEmployee
          ? `Salarié ${savedEmp.nom_complet} (${savedEmp.matricule}) mis à jour dans Firestore (ID: ${docId}) et Contrat PDF (${savedEmp.type_contrat}) régénéré.`
          : `Salarié ${savedEmp.nom_complet} (${savedEmp.matricule}) enregistré dans Firestore collection "employees" (ID: ${docId}) et Contrat PDF (${savedEmp.type_contrat}) généré !`
      });
    } catch (error) {
      const readableError = formatReadableFirestoreError(error);
      console.error('Échec de l’enregistrement Firestore :', error);
      setModalError(readableError);
      setFeedback({
        type: 'error',
        text: readableError
      });
    } finally {
      setSavingEmp(false);
    }
  };

  const handleConfirmDeleteEmployee = async () => {
    if (!deleteModalEmp) return;
    setDeletingEmp(true);
    setFeedback(null);
    try {
      const target = deleteModalEmp;
      const freshList = await deleteEmployeeAndContractsFromFirestore(target);
      setEmployees(freshList);
      setNextMatricule(getNextMatricule(freshList));
      setDeleteModalEmp(null);
      setFeedback({
        type: 'success',
        text: `Le salarié ${target.nom_complet} (${target.matricule}) et ses contrats associés ont été supprimés de Firestore avec succès.`
      });
    } catch (error) {
      const readableError = formatReadableFirestoreError(error);
      setFeedback({
        type: 'error',
        text: readableError
      });
    } finally {
      setDeletingEmp(false);
    }
  };

  const handleToggleActive = async (emp: Employee) => {
    try {
      const updatedEmp: Employee = {
        ...emp,
        is_active: !emp.is_active,
        updated_at: new Date().toISOString()
      };
      await writeEmployeeToFirestore(updatedEmp, true);
      const freshList = await fetchEmployeesFromFirestore();
      setEmployees(freshList);
      setFeedback({
        type: 'success',
        text: `Statut du compte ${emp.matricule} modifié avec succès dans Firestore.`
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        text: formatReadableFirestoreError(error)
      });
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalEmp) return;
    try {
      const updatedEmp: Employee = {
        ...resetModalEmp,
        password: tempResetPassword.trim(),
        must_change_password: true,
        updated_at: new Date().toISOString()
      };
      await writeEmployeeToFirestore(updatedEmp, true);
      const freshList = await fetchEmployeesFromFirestore();
      setEmployees(freshList);
      setFeedback({
        type: 'success',
        text: `Mot de passe réinitialisé pour ${resetModalEmp.matricule}.`
      });
      setResetModalEmp(null);
      setTempResetPassword('');
    } catch (error) {
      setFeedback({
        type: 'error',
        text: formatReadableFirestoreError(error)
      });
    }
  };

  const handleCopyQrStatusUrl = async (emp: Employee) => {
    const statusUrl = getEmployeeStatusUrl(emp.matricule);
    try {
      await navigator.clipboard.writeText(statusUrl);
      setFeedback({
        type: 'success',
        text: `URL QR Code copiée : ${statusUrl}`
      });
    } catch {
      setFeedback({
        type: 'success',
        text: `URL QR Code : ${statusUrl}`
      });
    }
  };

  const buildDirectEmployeeUrl = (token: string): string => {
    return `${window.location.origin}/employe.html?token=${encodeURIComponent(token)}`;
  };

  const handleGenerateDirectLink = async (emp: Employee) => {
    try {
      const newToken = createPortableEmployeeToken(emp);
      const updatedEmp: Employee = {
        ...emp,
        access_token: newToken,
        access_token_created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      await writeEmployeeToFirestore(updatedEmp, true);
      const freshList = await fetchEmployeesFromFirestore();
      setEmployees(freshList);

      const fullUrl = buildDirectEmployeeUrl(newToken);
      try {
        await navigator.clipboard.writeText(fullUrl);
      } catch {
        // Ignore
      }
      setFeedback({
        type: 'success',
        text: `Lien direct créé et copié pour ${emp.nom_complet} : ${fullUrl}`
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        text: formatReadableFirestoreError(error)
      });
    }
  };

  const handleCopyDirectLink = async (emp: Employee) => {
    if (!emp.access_token) return;
    const fullUrl = buildDirectEmployeeUrl(emp.access_token);
    try {
      await navigator.clipboard.writeText(fullUrl);
      setFeedback({
        type: 'success',
        text: `Lien direct copié dans le presse-papiers : ${fullUrl}`
      });
    } catch {
      setFeedback({
        type: 'success',
        text: `Lien direct : ${fullUrl}`
      });
    }
  };

  const handleRevokeDirectLink = async (emp: Employee) => {
    if (emp.access_token) {
      markTokenRevoked(emp.access_token);
    }
    try {
      const updatedEmp: Employee = {
        ...emp,
        access_token: null,
        access_token_created_at: null,
        updated_at: new Date().toISOString()
      };
      await writeEmployeeToFirestore(updatedEmp, true);
      const freshList = await fetchEmployeesFromFirestore();
      setEmployees(freshList);
      setFeedback({
        type: 'success',
        text: `Le lien d’accès direct de ${emp.nom_complet} (${emp.matricule}) a été révoqué.`
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        text: formatReadableFirestoreError(error)
      });
    }
  };

  const handleSaveCms = (e: React.FormEvent) => {
    e.preventDefault();
    saveSiteSettings(cmsForm);
    onSettingsUpdated(cmsForm);
    if (newAdminPassword.trim().length >= 4) {
      setAdminPassword(newAdminPassword.trim());
      setNewAdminPassword('');
    }
    setFeedback({
      type: 'success',
      text: 'Les paramètres du site ont été enregistrés.'
    });
  };

  const handleExportEmployesJson = () => {
    exportEmployesJsonFile(settings);
    setFeedback({
      type: 'success',
      text: 'Le fichier employes.json (avec les photos en Base64 dans le champ "photo") a été téléchargé.'
    });
  };

  const handleImportEmployesJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const list = Array.isArray(parsed) ? parsed : parsed.employees;
        if (!Array.isArray(list)) {
          setFeedback({ type: 'error', text: 'Format JSON invalide.' });
          return;
        }
        saveEmployees(list);
        refreshLocalData();
        setFeedback({
          type: 'success',
          text: `${list.length} salarié(s) importé(s) depuis employes.json avec succès.`
        });
      } catch {
        setFeedback({ type: 'error', text: 'Impossible de lire le fichier employes.json.' });
      }
    };
    reader.readAsText(file);
  };

  // ==========================================================================
  // ADMIN LOGIN VIEW
  // ==========================================================================
  if (!adminToken) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-6 sm:p-10 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <BrandLogo
              customLogoUrl={settings.logo_url}
              companyName={settings.company_name}
              size="card"
            />
            <div>
              <span className="text-xs font-mono text-slate-500">Administration RH (admin.html)</span>
              <h1 className="font-display font-bold text-xl text-[#0B2545]">
                Backoffice Direction
              </h1>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 mb-5 leading-relaxed">
            Entrez le mot de passe administrateur pour gérer les salariés, convertir les photos en Base64 (<code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">employes.json</code>) et générer automatiquement les contrats PDF CDI/CDD avec <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">jsPDF</code>.
          </p>

          {loginError && (
            <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Mot de passe Administrateur
              </label>
              <div className="relative">
                <input
                  type={showLoginPass ? 'text' : 'password'}
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full min-h-[46px] pl-4 pr-12 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-[#0B2545] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPass((prev) => !prev)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 min-h-[38px] min-w-[38px] flex items-center justify-center text-slate-500 hover:text-slate-800"
                  aria-label="Afficher ou masquer le mot de passe"
                >
                  {showLoginPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full min-h-[48px] px-6 py-3 rounded-xl bg-[#0B2545] text-white font-bold text-sm hover:bg-[#134074] transition-colors flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4 text-amber-400" />
              <span>Déverrouiller l’Administration</span>
            </button>
          </form>

          <button
            type="button"
            onClick={onBackToSite}
            className="mt-4 w-full min-h-[44px] text-xs font-medium text-slate-500 hover:text-slate-800"
          >
            Retourner à l’accueil du site public
          </button>
        </div>
      </div>
    );
  }

  const filteredEmployees = employees.filter((emp) => {
    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'active'
        ? emp.is_active
        : !emp.is_active;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      emp.matricule.toLowerCase().includes(q) ||
      (emp.nom_complet || `${emp.prenom} ${emp.nom}`).toLowerCase().includes(q) ||
      emp.email.toLowerCase().includes(q) ||
      emp.poste.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const totalPayroll = employees
    .filter((e) => e.is_active)
    .reduce((acc, e) => acc + Number(e.salaire || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
      {/* Admin Top Header with Prominent "Exporter employes.json" Button */}
      <div className="bg-[#0B2545] text-white rounded-2xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border border-amber-400/30">
        <div className="space-y-1">
          <div className="text-xs font-mono text-amber-400">
            Administration Statique Netlify (admin.html) · NE: 799094917
          </div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-white">
            Gestion Salariés, Photos Base64 &amp; Contrats Auto CDI/CDD (jsPDF)
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportEmployesJson}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors whitespace-nowrap shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Exporter employes.json</span>
          </button>

          <button
            type="button"
            onClick={onBackToSite}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap"
          >
            Voir le site public
          </button>

          <button
            type="button"
            onClick={onAdminLogout}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-amber-400 text-[#0B2545] hover:bg-amber-300 text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors whitespace-nowrap"
          >
            <LogOut className="w-4 h-4" />
            <span>Verrouiller</span>
          </button>
        </div>
      </div>

      {/* Key Metrics Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <span className="text-xs text-slate-500 block">Effectif Total</span>
          <span className="font-mono tabular-nums text-2xl sm:text-3xl font-bold text-[#0B2545]">
            {employees.length}
          </span>
          <span className="text-xs text-slate-500 block mt-1">
            {employees.filter((e) => e.is_active).length} actifs ·{' '}
            {employees.filter((e) => !e.is_active).length} désactivés
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <span className="text-xs text-slate-500 block">Prochain Matricule Auto</span>
          <span className="font-mono tabular-nums text-xl sm:text-2xl font-bold text-amber-600 mt-0.5 block">
            {nextMatricule}
          </span>
          <span className="text-xs text-slate-500 block mt-1">QR Code ?id={nextMatricule}</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <span className="text-xs text-slate-500 block">Masse Salariale Active</span>
          <span className="font-mono tabular-nums text-xl sm:text-2xl font-bold text-emerald-700 mt-0.5 block">
            {new Intl.NumberFormat('fr-CA').format(totalPayroll)} CAD
          </span>
          <span className="text-xs text-slate-500 block mt-1">Mensuel brut cumulé</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <span className="text-xs text-slate-500 block">Contrats PDF &amp; Photos</span>
          <span className="font-mono tabular-nums text-xl sm:text-2xl font-bold text-[#0B2545] mt-0.5 block">
            100% Client
          </span>
          <span className="text-xs text-slate-500 block mt-1">jsPDF + Base64 local</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-200/70 p-1.5 rounded-2xl">
        <button
          type="button"
          onClick={() => switchAdminTab('employees')}
          className={`min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === 'employees'
              ? 'bg-[#0B2545] text-white shadow-sm'
              : 'text-slate-700 hover:text-slate-950'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Salariés &amp; Contrats Auto CDI/CDD ({employees.length})</span>
        </button>

        <button
          type="button"
          onClick={() => switchAdminTab('promesse')}
          className={`min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === 'promesse'
              ? 'bg-[#0B2545] text-white shadow-sm'
              : 'text-slate-700 hover:text-slate-950'
          }`}
        >
          <FileText className="w-4 h-4 text-amber-500" />
          <span>Générer promesse d&apos;embauche</span>
        </button>

        <button
          type="button"
          onClick={() => switchAdminTab('json')}
          className={`min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === 'json'
              ? 'bg-[#0B2545] text-white shadow-sm'
              : 'text-slate-700 hover:text-slate-950'
          }`}
        >
          <FileJson className="w-4 h-4" />
          <span>Fichier employes.json (Champ &quot;photo&quot; Base64)</span>
        </button>

        <button
          type="button"
          onClick={() => switchAdminTab('cms')}
          className={`min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === 'cms'
              ? 'bg-[#0B2545] text-white shadow-sm'
              : 'text-slate-700 hover:text-slate-950'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Modifier le Site &amp; Logo</span>
        </button>

        <button
          type="button"
          onClick={() => switchAdminTab('messages')}
          className={`min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === 'messages'
              ? 'bg-[#0B2545] text-white shadow-sm'
              : 'text-slate-700 hover:text-slate-950'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>Demandes Contact ({messages.length})</span>
        </button>
      </div>

      {activeTab === 'promesse' && (
        <PromesseEmbaucheSection
          employees={employees}
          onEmployeesUpdated={(updatedList) => {
            setEmployees(updatedList);
            setNextMatricule(getNextMatricule(updatedList));
          }}
        />
      )}

      {feedback && (
        <div
          className={`p-4 rounded-xl border text-sm flex items-center justify-between gap-3 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2.5 break-all">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs font-semibold underline shrink-0"
          >
            Fermer
          </button>
        </div>
      )}

      {/* ====================================================================
          TAB 1: GESTION DES SALARIÉS + CONTRAT AUTO PDF (ADMIN ONLY DOWNLOAD)
      ==================================================================== */}
      {activeTab === 'employees' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher par matricule, nom complet, poste..."
                  className="w-full min-h-[44px] pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-sm focus:border-[#0B2545] focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                {[
                  { id: 'all', label: 'Tous' },
                  { id: 'active', label: 'Actifs' },
                  { id: 'inactive', label: 'Désactivés' }
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setStatusFilter(f.id as 'all' | 'active' | 'inactive')}
                    className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      statusFilter === f.id
                        ? 'bg-white text-[#0B2545] shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleExportEmployesJson}
                className="min-h-[44px] px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold text-xs sm:text-sm hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <Download className="w-4 h-4 text-emerald-700" />
                <span>Exporter employes.json</span>
              </button>

              <button
                type="button"
                onClick={openAddEmployeeModal}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#0B2545] text-white font-bold text-xs sm:text-sm hover:bg-[#134074] transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <UserPlus className="w-4 h-4 text-amber-400" />
                <span>Ajouter un salarié + Contrat PDF ({nextMatricule})</span>
              </button>
            </div>
          </div>

          {/* Desktop Adaptive Table */}
          <div className="hidden lg:block bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <th className="py-3.5 px-4">Salarié &amp; Photo (Base64)</th>
                  <th className="py-3.5 px-4">Matricule &amp; QR Status</th>
                  <th className="py-3.5 px-4">Poste &amp; Contrat (CDI/CDD)</th>
                  <th className="py-3.5 px-4 text-right">Salaire Brut</th>
                  <th className="py-3.5 px-4">Contrat PDF (Admin Seul)</th>
                  <th className="py-3.5 px-4">Lien Direct Salarié</th>
                  <th className="py-3.5 px-4 text-right">Actions RH</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredEmployees.map((emp) => {
                  const isCdd = String(emp.type_contrat).toUpperCase().includes('CDD');
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={emp.photo || emp.photo_url}
                            alt={emp.nom_complet}
                            referrerPolicy="no-referrer"
                            className="w-11 h-11 rounded-xl object-cover border border-slate-300 shrink-0"
                          />
                          <div>
                            <div className="font-bold text-[#0B2545]">
                              {emp.civilite} {emp.nom_complet || `${emp.prenom} ${emp.nom}`.toUpperCase()}
                            </div>
                            <div className="text-xs text-slate-500">
                              {emp.nationalite} · Né(e) : {emp.date_naissance}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-mono tabular-nums font-bold text-[#0B2545]">
                          {emp.matricule}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyQrStatusUrl(emp)}
                          className="mt-1 inline-flex items-center gap-1 text-[11px] font-mono text-blue-700 hover:underline"
                          title="Copier l'URL encodée dans le QR Code du contrat"
                        >
                          <QrCode className="w-3 h-3" />
                          <span>employe.html?id={emp.matricule}</span>
                        </button>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-900">{emp.poste}</div>
                        <div className="text-xs text-slate-500">
                          <span className="font-bold text-[#134074]">{isCdd ? 'CDD' : 'CDI'}</span> · Effet :{' '}
                          {emp.date_effet || emp.date_embauche}
                          {isCdd && emp.date_fin_cdd ? ` → ${emp.date_fin_cdd}` : ''}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums font-bold text-[#0000AA]">
                        {formatSalaryContract(emp.salaire, emp.devise)}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1.5">
                          <button
                            type="button"
                            disabled={generatingPdfId === emp.id}
                            onClick={() => handleDownloadContractForAdmin(emp)}
                            className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#0B2545] text-xs font-bold inline-flex items-center gap-1.5 transition-colors shadow-2xs w-fit"
                          >
                            <Download className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              {generatingPdfId === emp.id
                                ? 'Génération...'
                                : `Télécharger PDF (${isCdd ? 'CDD' : 'CDI'})`}
                            </span>
                          </button>
                          {onOpenDirectEmployeeLink && (
                            <button
                              type="button"
                              onClick={() => onOpenDirectEmployeeLink(emp.matricule)}
                              className="text-[11px] text-slate-600 hover:text-[#0B2545] inline-flex items-center gap-1 font-medium"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Aperçu A4 &amp; QR Status</span>
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {emp.access_token ? (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleCopyDirectLink(emp)}
                                className="px-2.5 py-1 rounded-lg bg-[#0B2545] text-white text-[11px] font-semibold inline-flex items-center gap-1 hover:bg-[#134074]"
                              >
                                <Copy className="w-3 h-3" />
                                <span>Copier lien</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRevokeDirectLink(emp)}
                                className="px-2 py-1 rounded-lg bg-red-50 text-red-700 text-[11px] font-semibold inline-flex items-center gap-1 hover:bg-red-100"
                              >
                                <Ban className="w-3 h-3" />
                                <span>Révoquer</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleGenerateDirectLink(emp)}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-300 text-[#0B2545] text-xs font-bold inline-flex items-center gap-1.5 hover:bg-slate-200"
                          >
                            <Link2 className="w-3.5 h-3.5" />
                            <span>Créer lien</span>
                          </button>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditEmployeeModal(emp)}
                            className="p-2 rounded-lg border border-slate-200 text-[#0B2545] hover:bg-slate-100"
                            title="Modifier le salarié et régénérer son contrat"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setResetModalEmp(emp);
                              setTempResetPassword('Employe@2026!');
                            }}
                            className="p-2 rounded-lg border border-slate-200 text-amber-600 hover:bg-amber-50"
                            title="Réinitialiser le mot de passe"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleActive(emp)}
                            className={`p-2 rounded-lg border ${
                              emp.is_active
                                ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                                : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                            }`}
                            title={emp.is_active ? 'Désactiver ce compte' : 'Réactiver ce compte'}
                          >
                            <Power className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteModalEmp(emp)}
                            className="px-2.5 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 text-xs font-semibold inline-flex items-center gap-1"
                            title="Supprimer ce salarié et ses contrats associés"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Supprimer</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile & Tablet Adaptive Cards */}
          <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredEmployees.map((emp) => {
              const isCdd = String(emp.type_contrat).toUpperCase().includes('CDD');
              return (
                <div
                  key={emp.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4"
                >
                  <div className="flex items-center gap-3.5">
                    <img
                      src={emp.photo || emp.photo_url}
                      alt={emp.nom_complet}
                      referrerPolicy="no-referrer"
                      className="w-14 h-14 rounded-2xl object-cover border border-slate-300 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-xs font-bold text-amber-600">
                        {emp.matricule} · {isCdd ? 'CDD' : 'CDI'}
                      </div>
                      <h3 className="font-bold text-base text-[#0B2545] truncate">
                        {emp.civilite} {emp.nom_complet || `${emp.prenom} ${emp.nom}`.toUpperCase()}
                      </h3>
                      <p className="text-xs text-slate-500 truncate">{emp.poste}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-3 border-t border-slate-100">
                    <div>
                      <span className="text-slate-400 block">Salaire Brut</span>
                      <span className="font-mono tabular-nums font-bold text-[#0000AA]">
                        {formatSalaryContract(emp.salaire, emp.devise)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Date d’effet</span>
                      <span className="font-mono tabular-nums text-slate-800">
                        {emp.date_effet || emp.date_embauche}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => handleDownloadContractForAdmin(emp)}
                      className="w-full min-h-[42px] px-4 py-2 rounded-xl bg-amber-400 text-[#0B2545] text-xs font-bold flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      <span>Télécharger Contrat PDF ({isCdd ? 'CDD' : 'CDI'}) — Admin</span>
                    </button>

                    {onOpenDirectEmployeeLink && (
                      <button
                        type="button"
                        onClick={() => onOpenDirectEmployeeLink(emp.matricule)}
                        className="w-full min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-100 text-[#0B2545] text-xs font-semibold flex items-center justify-center gap-1.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Ouvrir Fiche &amp; Contrat (employe.html?id={emp.matricule})</span>
                      </button>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openEditEmployeeModal(emp)}
                      className="flex-1 min-h-[40px] px-3 py-2 rounded-xl bg-slate-100 text-[#0B2545] text-xs font-semibold flex items-center justify-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Modifier</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(emp)}
                      className={`min-h-[40px] px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 ${
                        emp.is_active
                          ? 'bg-amber-50 text-amber-800'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>{emp.is_active ? 'Désactiver' : 'Activer'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteModalEmp(emp)}
                      className="min-h-[40px] px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 text-xs font-bold flex items-center justify-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Supprimer</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ====================================================================
          TAB 2: FICHIER EMPLOYES.JSON (CHAMP "photo" EN BASE64)
      ==================================================================== */}
      {activeTab === 'json' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <h2 className="font-display font-bold text-xl text-[#0B2545]">
                Base de données statique : <code className="font-mono text-base">employes.json</code>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                Chaque salarié possède sa photo d’identité convertie en Base64 stockée dans le champ <code className="font-mono font-bold text-[#0B2545]">&quot;photo&quot;</code> de <code className="font-mono">employes.json</code>.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleExportEmployesJson}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-2 hover:bg-emerald-400"
              >
                <Download className="w-4 h-4" />
                <span>Exporter employes.json</span>
              </button>

              <label className="cursor-pointer min-h-[44px] px-4 py-2.5 rounded-xl bg-[#0B2545] text-white font-bold text-xs sm:text-sm flex items-center gap-2 hover:bg-[#134074]">
                <Upload className="w-4 h-4 text-amber-400" />
                <span>Importer employes.json</span>
                <input
                  type="file"
                  accept="application/json,.json"
                  onChange={handleImportEmployesJson}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl text-xs font-mono overflow-x-auto max-h-[520px] overflow-y-auto leading-relaxed">
            {JSON.stringify(
              {
                company: {
                  company_name: settings.company_name,
                  business_number: '799094917',
                  slogan: settings.slogan,
                  address: settings.address,
                  phone: settings.phone,
                  whatsapp: settings.whatsapp,
                  email: settings.email
                },
                employees: employees.map((e) => ({
                  id: e.id,
                  matricule: e.matricule,
                  civilite: e.civilite,
                  nom_complet: e.nom_complet,
                  date_naissance: e.date_naissance,
                  nationalite: e.nationalite,
                  adresse: e.adresse,
                  poste: e.poste,
                  type_contrat: e.type_contrat,
                  date_effet: e.date_effet,
                  date_fin_cdd: e.date_fin_cdd,
                  duree_periode_essai: e.duree_periode_essai,
                  lieu_travail: e.lieu_travail,
                  horaires: e.horaires,
                  salaire: e.salaire,
                  devise: e.devise,
                  hebergement_fourni: e.hebergement_fourni,
                  adresse_hebergement: e.adresse_hebergement,
                  photo: e.photo ? `${e.photo.slice(0, 64)}... [Base64 complet exporté]` : ''
                }))
              },
              null,
              2
            )}
          </pre>
        </div>
      )}

      {/* ====================================================================
          TAB 3: MODIFIER LE SITE & LOGO
      ==================================================================== */}
      {activeTab === 'cms' && (
        <form onSubmit={handleSaveCms} className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-8">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="font-display font-bold text-xl text-[#0B2545]">
              Personnalisation du Site Public &amp; Identité Visuelle
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nom de l’entreprise
              </label>
              <input
                type="text"
                required
                value={cmsForm.company_name}
                onChange={(e) => setCmsForm({ ...cmsForm, company_name: e.target.value })}
                className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Slogan officiel
              </label>
              <input
                type="text"
                required
                value={cmsForm.slogan}
                onChange={(e) => setCmsForm({ ...cmsForm, slogan: e.target.value })}
                className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Adresse du siège
              </label>
              <input
                type="text"
                required
                value={cmsForm.address}
                onChange={(e) => setCmsForm({ ...cmsForm, address: e.target.value })}
                className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Téléphone / WhatsApp affiché
              </label>
              <input
                type="text"
                required
                value={cmsForm.phone}
                onChange={(e) => setCmsForm({ ...cmsForm, phone: e.target.value })}
                className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Adresse e-mail de contact
              </label>
              <input
                type="email"
                required
                value={cmsForm.email}
                onChange={(e) => setCmsForm({ ...cmsForm, email: e.target.value })}
                className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Logo de l’entreprise
              </label>
              <div className="flex items-center gap-4">
                <BrandLogo
                  customLogoUrl={cmsForm.logo_url}
                  companyName={cmsForm.company_name}
                  size="header"
                />
                <label className="cursor-pointer min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-[#0B2545] inline-flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  <span>Importer un fichier Logo</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={handleLogoFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200 max-w-md">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Modifier le mot de passe Administrateur (optionnel)
            </label>
            <input
              type="password"
              value={newAdminPassword}
              onChange={(e) => setNewAdminPassword(e.target.value)}
              placeholder="Laisser vide pour conserver le mot de passe actuel"
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-300 text-sm"
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              className="min-h-[48px] px-6 py-3 rounded-xl bg-[#0B2545] text-white font-bold text-sm hover:bg-[#134074] transition-colors"
            >
              Enregistrer les modifications
            </button>
          </div>
        </form>
      )}

      {/* ====================================================================
          TAB 4: MESSAGES DE CONTACT
      ==================================================================== */}
      {activeTab === 'messages' && (
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-sm text-slate-500">
              Aucun message de contact pour le moment.
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="text-xs text-slate-500">
                      <span>{new Date(msg.created_at).toLocaleString('fr-CA')}</span>
                      <span className="mx-1.5">·</span>
                      <span className="font-semibold text-[#134074]">{msg.service_concerne}</span>
                    </div>
                    <h3 className="font-bold text-lg text-[#0B2545] mt-0.5">{msg.sujet}</h3>
                    <p className="text-xs text-slate-600">
                      De : <strong>{msg.nom_complet}</strong>{' '}
                      {msg.entreprise ? `(${msg.entreprise})` : ''} — {msg.email}{' '}
                      {msg.telephone ? `· ${msg.telephone}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      deleteContactMessage(msg.id);
                      refreshLocalData();
                    }}
                    className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                    title="Supprimer ce message"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100 whitespace-pre-line">
                  {msg.message}
                </p>
              </div>
            ))
          )}
        </div>
      )}

      {/* ====================================================================
          MODAL: CRÉATION / ÉDITION SALARIÉ + GÉNÉRATION AUTO CONTRAT PDF CDI/CDD
      ==================================================================== */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-3xl w-full p-5 sm:p-8 shadow-xl my-8 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-5">
              <div>
                <span className="font-mono text-xs font-bold text-amber-600">
                  Matricule : {editingEmployee ? editingEmployee.matricule : `${nextMatricule} (Auto)`} · QR Code : /employe.html?id={editingEmployee ? editingEmployee.matricule : nextMatricule}
                </span>
                <h2 className="font-display font-bold text-xl text-[#0B2545]">
                  {editingEmployee
                    ? 'Modifier le salarié & régénérer le Contrat PDF'
                    : 'Nouveau salarié & Génération automatique du Contrat PDF (CDI / CDD)'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="min-h-[40px] min-w-[40px] rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 hover:text-slate-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} className="space-y-4">
              {modalError && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm flex items-start gap-2.5">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Row 1: Civilité + Nom complet + Date de naissance + Nationalité */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Civilité *
                  </label>
                  <select
                    value={empForm.civilite}
                    onChange={(e) =>
                      setEmpForm({
                        ...empForm,
                        civilite: e.target.value as 'Monsieur' | 'Madame'
                      })
                    }
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                  >
                    <option value="Monsieur">Monsieur</option>
                    <option value="Madame">Madame</option>
                  </select>
                </div>

                <div className="sm:col-span-9">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nom complet du salarié (affiché en BLEU MAJUSCULES sur le contrat) *
                  </label>
                  <input
                    type="text"
                    required
                    value={empForm.nom_complet}
                    onChange={(e) => setEmpForm({ ...empForm, nom_complet: e.target.value })}
                    placeholder="Ex: JEAN-PIERRE KAMGA"
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-bold uppercase text-blue-700"
                  />
                </div>
              </div>

              {/* Row 2: Date de naissance + Nationalité + Adresse de résidence */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Date de naissance *
                  </label>
                  <input
                    type="date"
                    required
                    value={empForm.date_naissance}
                    onChange={(e) => setEmpForm({ ...empForm, date_naissance: e.target.value })}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nationalité *
                  </label>
                  <input
                    type="text"
                    required
                    value={empForm.nationalite}
                    onChange={(e) => setEmpForm({ ...empForm, nationalite: e.target.value })}
                    placeholder="Ex: Canadienne, Française..."
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Adresse de résidence *
                  </label>
                  <input
                    type="text"
                    required
                    value={empForm.adresse}
                    onChange={(e) => setEmpForm({ ...empForm, adresse: e.target.value })}
                    placeholder="Rue, Ville, Pays"
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
              </div>

              {/* Row 3: Poste occupé + Type de contrat (CDI / CDD) */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                <div className="sm:col-span-7">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Poste occupé (Article II) *
                  </label>
                  <input
                    type="text"
                    required
                    value={empForm.poste}
                    onChange={(e) => setEmpForm({ ...empForm, poste: e.target.value })}
                    placeholder="Ex: Chauffeur Poids Lourd / Coordinateur Logistique"
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>

                <div className="sm:col-span-5">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Type de contrat (CDI / CDD) *
                  </label>
                  <select
                    value={empForm.type_contrat}
                    onChange={(e) =>
                      setEmpForm({
                        ...empForm,
                        type_contrat: e.target.value as 'CDI' | 'CDD'
                      })
                    }
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-bold bg-white text-[#0B2545]"
                  >
                    <option value="CDI">CDI — Contrat à durée indéterminée</option>
                    <option value="CDD">CDD — Contrat à durée déterminée</option>
                  </select>
                </div>
              </div>

              {/* Row 4: Date d'effet + Date fin si CDD + Durée période d'essai */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-3.5 rounded-xl bg-blue-50/60 border border-blue-200">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Date d’effet / Début (Article III) *
                  </label>
                  <input
                    type="date"
                    required
                    value={empForm.date_effet}
                    onChange={(e) => setEmpForm({ ...empForm, date_effet: e.target.value })}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-mono bg-white"
                  />
                </div>

                {empForm.type_contrat === 'CDD' ? (
                  <div>
                    <label className="block text-xs font-semibold text-blue-900 mb-1">
                      Date de fin CDD (Article III) *
                    </label>
                    <input
                      type="date"
                      required
                      value={empForm.date_fin_cdd}
                      onChange={(e) => setEmpForm({ ...empForm, date_fin_cdd: e.target.value })}
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-blue-400 text-sm font-mono bg-white"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">
                      Mention Article III (Auto CDI)
                    </label>
                    <div className="min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-100 text-xs font-semibold text-blue-800 flex items-center">
                      « durée indéterminée »
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Durée période d’essai (Article IV) *
                  </label>
                  <input
                    type="text"
                    required
                    value={empForm.duree_periode_essai}
                    onChange={(e) =>
                      setEmpForm({ ...empForm, duree_periode_essai: e.target.value })
                    }
                    placeholder="Ex: 3 mois"
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                  />
                </div>
              </div>

              {/* Row 5: Lieu de travail + Horaires */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Lieu de travail (Article V) *
                  </label>
                  <input
                    type="text"
                    required
                    value={empForm.lieu_travail}
                    onChange={(e) => setEmpForm({ ...empForm, lieu_travail: e.target.value })}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Horaires de travail (Article VI) *
                  </label>
                  <input
                    type="text"
                    required
                    value={empForm.horaires}
                    onChange={(e) => setEmpForm({ ...empForm, horaires: e.target.value })}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
              </div>

              {/* Row 6: Salaire brut mensuel ("X.XXX CAD") + Devise */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                <div className="sm:col-span-6">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Salaire brut mensuel (Article VII — affiché comme{' '}
                    <span className="text-[#0000AA] font-mono">
                      {formatSalaryContract(empForm.salaire, empForm.devise)}
                    </span>
                    ) *
                  </label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={empForm.salaire}
                    onChange={(e) => setEmpForm({ ...empForm, salaire: e.target.value })}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-mono font-bold text-[#0000AA]"
                  />
                </div>

                <div className="sm:col-span-6">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Devise *
                  </label>
                  <select
                    value={empForm.devise}
                    onChange={(e) => setEmpForm({ ...empForm, devise: e.target.value })}
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white font-mono"
                  >
                    <option value="CAD">CAD ($)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
              </div>

              {/* Row 6b: Rule 9 — Hébergement conditionnel (Point 2: Conditions d'hébergement + Lieu flexible) */}
              <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
                  <div className="sm:col-span-4">
                    <label className="block text-xs font-bold text-[#8B4513] mb-1">
                      Hébergement pris en charge ? *
                    </label>
                    <select
                      value={empForm.hebergement_fourni ? 'oui' : 'non'}
                      onChange={(e) =>
                        setEmpForm({
                          ...empForm,
                          hebergement_fourni: e.target.value === 'oui'
                        })
                      }
                      className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold bg-white text-[#0B2545]"
                    >
                      <option value="non">Non (affiche &quot;Non applicable&quot;)</option>
                      <option value="oui">Oui (Pris en charge par l&apos;employeur)</option>
                    </select>
                  </div>

                  {empForm.hebergement_fourni && (
                    <>
                      <div className="sm:col-span-5">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Durée d&apos;hébergement *
                        </label>
                        <select
                          value={empForm.hebergement_duree_type}
                          onChange={(e) =>
                            setEmpForm({
                              ...empForm,
                              hebergement_duree_type: e.target.value as
                                | 'duree_precise'
                                | 'toute_duree_contrat'
                            })
                          }
                          className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                        >
                          <option value="duree_precise">Durée précise (en nombre de mois)</option>
                          <option value="toute_duree_contrat">
                            Pendant toute la durée du contrat
                          </option>
                        </select>
                      </div>

                      {empForm.hebergement_duree_type === 'duree_precise' && (
                        <div className="sm:col-span-3">
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Nombre de mois *
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={120}
                            required
                            value={empForm.hebergement_nombre_mois}
                            onChange={(e) =>
                              setEmpForm({
                                ...empForm,
                                hebergement_nombre_mois: e.target.value
                              })
                            }
                            placeholder="Ex: 3"
                            className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-mono bg-white"
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>

                {empForm.hebergement_fourni && (
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end pt-1">
                    <div className="sm:col-span-5">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Lieu d&apos;hébergement (Formulation Point 2) *
                      </label>
                      <select
                        value={empForm.hebergement_lieu_type}
                        onChange={(e) =>
                          setEmpForm({
                            ...empForm,
                            hebergement_lieu_type: e.target.value as
                              | 'preciser_lieu'
                              | 'texte_generique'
                          })
                        }
                        className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 text-sm font-semibold bg-white text-[#0B2545]"
                      >
                        <option value="preciser_lieu">Préciser le lieu (adresse libre)</option>
                        <option value="texte_generique">
                          Texte générique (sans adresse spécifique)
                        </option>
                      </select>
                    </div>

                    {empForm.hebergement_lieu_type === 'preciser_lieu' && (
                      <div className="sm:col-span-7">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Adresse du logement mis à disposition *
                        </label>
                        <input
                          type="text"
                          required
                          value={empForm.adresse_hebergement}
                          onChange={(e) =>
                            setEmpForm({ ...empForm, adresse_hebergement: e.target.value })
                          }
                          placeholder="Ex: 852 Rue Main Moncton, Nouveau-Brunswick Canada"
                          className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                        />
                      </div>
                    )}
                  </div>
                )}

                <div className="p-2.5 rounded-lg bg-white border border-amber-200/80 text-xs text-slate-700">
                  <span className="font-bold text-black block">
                    Aperçu Point 2. Conditions d&apos;hébergement :
                  </span>
                  <span className="italic text-slate-800 mt-0.5 block">
                    {buildHebergementPoint2Text({
                      hebergement_fourni: empForm.hebergement_fourni,
                      hebergement_duree_type: empForm.hebergement_duree_type,
                      hebergement_nombre_mois: parseInt(empForm.hebergement_nombre_mois, 10) || 3,
                      hebergement_lieu_type: empForm.hebergement_lieu_type,
                      adresse_hebergement: empForm.adresse_hebergement
                    })}
                  </span>
                </div>
              </div>

              {/* Row 7: Email + Téléphone + Mot de passe Espace Employé */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    E-mail (Connexion Espace Employé)
                  </label>
                  <input
                    type="email"
                    value={empForm.email}
                    onChange={(e) => setEmpForm({ ...empForm, email: e.target.value })}
                    placeholder="prenom.nom@atlantictransport.ca"
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Téléphone
                  </label>
                  <input
                    type="text"
                    value={empForm.telephone}
                    onChange={(e) => setEmpForm({ ...empForm, telephone: e.target.value })}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mot de passe salarié
                  </label>
                  <input
                    type="text"
                    value={empForm.password}
                    onChange={(e) => setEmpForm({ ...empForm, password: e.target.value })}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-mono"
                  />
                </div>
              </div>

              {/* Row 8: Photo d'identité Base64 + Option téléchargement auto PDF */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex items-center gap-4">
                  {empForm.photo_base64 && (
                    <img
                      src={empForm.photo_base64}
                      alt="Aperçu photo Base64"
                      className="w-14 h-14 rounded-xl object-cover border border-slate-300 shrink-0"
                    />
                  )}
                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-[#0B2545] block">
                      Photo d’identité → Base64 dans employes.json champ &quot;photo&quot;
                    </span>
                    <label className="cursor-pointer min-h-[38px] px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-700 inline-flex items-center gap-2 hover:bg-slate-100">
                      <Upload className="w-4 h-4 text-[#0B2545]" />
                      <span>{empForm.photo_name || 'Choisir une photo (JPG/PNG)'}</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-amber-300 bg-amber-50/60 flex flex-col justify-center space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#0B2545]">
                    <FileText className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      Titre auto : Contrat de Travail (
                      {empForm.type_contrat === 'CDD'
                        ? 'à durée déterminée'
                        : 'à durée indéterminée'}
                      )
                    </span>
                  </div>
                  <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoDownloadPdfOnSave}
                      onChange={(e) => setAutoDownloadPdfOnSave(e.target.checked)}
                      className="rounded border-slate-300 text-[#0B2545]"
                    />
                    <span>Télécharger automatiquement le PDF généré avec jsPDF à la validation</span>
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs sm:text-sm font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={savingEmp}
                  className="min-h-[44px] px-6 py-2.5 rounded-xl bg-[#0B2545] text-white text-xs sm:text-sm font-bold hover:bg-[#134074]"
                >
                  {savingEmp
                    ? 'Génération du contrat PDF en cours...'
                    : editingEmployee
                    ? 'Enregistrer & Régénérer le Contrat PDF'
                    : 'Créer le salarié & Générer le Contrat PDF'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL: CONFIRMATION SUPPRESSION SALARIÉ & CONTRATS ASSOCIÉS
      ==================================================================== */}
      {deleteModalEmp && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-red-200 max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-red-700">
                <Trash2 className="w-5 h-5 shrink-0" />
                <h3 className="font-display font-bold text-lg text-[#0B2545]">
                  Supprimer le salarié ?
                </h3>
              </div>
              <button
                type="button"
                disabled={deletingEmp}
                onClick={() => setDeleteModalEmp(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-red-50 border border-red-100 text-xs text-slate-700 space-y-1">
              <p>
                Confirmez-vous la suppression définitive de{' '}
                <strong className="text-[#0B2545]">
                  {deleteModalEmp.civilite} {deleteModalEmp.nom_complet}
                </strong>{' '}
                (<span className="font-mono font-bold">{deleteModalEmp.matricule}</span>) ?
              </p>
              <p className="text-red-700 font-medium">
                Cette action effacera le salarié de la collection Firestore « employees » et retirera ses contrats associés.
              </p>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={deletingEmp}
                onClick={() => setDeleteModalEmp(null)}
                className="min-h-[42px] px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={deletingEmp}
                onClick={handleConfirmDeleteEmployee}
                className="min-h-[42px] px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold inline-flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>
                  {deletingEmp ? 'Suppression en cours...' : 'Confirmer la suppression'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL: RÉINITIALISER LE MOT DE PASSE EMPLOYÉ
      ==================================================================== */}
      {resetModalEmp && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-lg text-[#0B2545]">
                Réinitialiser le mot de passe — {resetModalEmp.matricule}
              </h3>
              <button
                type="button"
                onClick={() => setResetModalEmp(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600">
              Définissez un nouveau mot de passe temporaire pour <strong>{resetModalEmp.nom_complet}</strong>.
            </p>
            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <input
                type="text"
                required
                minLength={6}
                value={tempResetPassword}
                onChange={(e) => setTempResetPassword(e.target.value)}
                className="w-full min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 text-sm font-mono"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResetModalEmp(null)}
                  className="min-h-[42px] px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="min-h-[42px] px-5 py-2 rounded-xl bg-amber-400 text-[#0B2545] text-xs font-bold"
                >
                  Confirmer la réinitialisation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
