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
  Lock
} from 'lucide-react';
import { ContactMessage, Employee, SiteSettings } from '../types';
import { BrandLogo } from './BrandLogo';
import {
  createPortableEmployeeToken,
  deleteContactMessage,
  generateDefaultAvatarSvgDataUri,
  getContactMessages,
  getEmployees,
  getNextMatricule,
  markTokenRevoked,
  saveEmployees,
  saveSiteSettings,
  setAdminPassword,
  verifyAdminPasswordJS
} from '../services/staticStorage';

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
  const [activeTab, setActiveTab] = useState<'employees' | 'cms' | 'messages' | 'json'>('employees');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [nextMatricule, setNextMatricule] = useState('EMP-2026-003');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Employee Modal (Add / Edit)
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [empForm, setEmpForm] = useState({
    prenom: '',
    nom: '',
    email: '',
    telephone: '',
    adresse: 'King George Blvd, Surrey, BC V3T 2W1, Canada',
    poste: '',
    departement: 'Opérations Logistiques',
    type_contrat: 'CDI - Temps plein',
    salaire: '5500',
    devise: 'CAD',
    date_embauche: new Date().toISOString().slice(0, 10),
    password: '',
    photo_base64: '',
    photo_name: '',
    contrat_pdf_base64: '',
    contrat_pdf_name: ''
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

  const refreshLocalData = () => {
    const loadedEmployees = getEmployees();
    const loadedMessages = getContactMessages();
    setEmployees(loadedEmployees);
    setMessages(loadedMessages);
    setNextMatricule(getNextMatricule(loadedEmployees));
  };

  useEffect(() => {
    if (adminToken) {
      refreshLocalData();
    }
  }, [adminToken]);

  // Pure JS password authentication (zero server fetch)
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
    setEmpForm({
      prenom: '',
      nom: '',
      email: '',
      telephone: '',
      adresse: 'King George Blvd, Surrey, BC V3T 2W1, Canada',
      poste: '',
      departement: 'Opérations Logistiques',
      type_contrat: 'CDI - Temps plein',
      salaire: '5800',
      devise: 'CAD',
      date_embauche: new Date().toISOString().slice(0, 10),
      password: 'Employe@2026!',
      photo_base64: '',
      photo_name: '',
      contrat_pdf_base64: '',
      contrat_pdf_name: ''
    });
    setModalOpen(true);
  };

  const openEditEmployeeModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setEmpForm({
      prenom: emp.prenom,
      nom: emp.nom,
      email: emp.email,
      telephone: emp.telephone || '',
      adresse: emp.adresse || '',
      poste: emp.poste,
      departement: emp.departement || 'Opérations Logistiques',
      type_contrat: emp.type_contrat,
      salaire: String(emp.salaire),
      devise: emp.devise || 'CAD',
      date_embauche: emp.date_embauche,
      password: emp.password || 'Employe@2026!',
      photo_base64: '',
      photo_name: '',
      contrat_pdf_base64: '',
      contrat_pdf_name: ''
    });
    setModalOpen(true);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      setFeedback({ type: 'error', text: 'Seuls les formats photo JPG et PNG sont autorisés.' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setEmpForm((prev) => ({
          ...prev,
          photo_base64: reader.result as string,
          photo_name: file.name
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleContractPdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setFeedback({ type: 'error', text: 'Le contrat de travail doit être au format PDF (.pdf).' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setEmpForm((prev) => ({
          ...prev,
          contrat_pdf_base64: reader.result as string,
          contrat_pdf_name: file.name
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

  const handleSaveEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const list = getEmployees();
    const cleanEmail = empForm.email.trim().toLowerCase();
    const duplicate = list.find(
      (item) =>
        item.email.toLowerCase() === cleanEmail &&
        (!editingEmployee || item.id !== editingEmployee.id)
    );
    if (duplicate) {
      setFeedback({
        type: 'error',
        text: 'Cette adresse e-mail est déjà utilisée par un autre employé.'
      });
      return;
    }

    const now = new Date().toISOString();

    if (editingEmployee) {
      const updatedEmp: Employee = {
        ...editingEmployee,
        prenom: empForm.prenom.trim(),
        nom: empForm.nom.trim(),
        email: cleanEmail,
        telephone: empForm.telephone.trim(),
        adresse: empForm.adresse.trim(),
        poste: empForm.poste.trim(),
        departement: empForm.departement.trim() || 'Opérations Logistiques',
        type_contrat: empForm.type_contrat,
        salaire: parseFloat(empForm.salaire) || 0,
        devise: empForm.devise || 'CAD',
        date_embauche: empForm.date_embauche,
        password: empForm.password.trim() || editingEmployee.password || 'Employe@2026!',
        photo_url: empForm.photo_base64 || editingEmployee.photo_url,
        contrat_pdf_url: empForm.contrat_pdf_base64 || editingEmployee.contrat_pdf_url,
        has_custom_pdf: Boolean(empForm.contrat_pdf_base64 || editingEmployee.has_custom_pdf),
        updated_at: now
      };
      // Refresh portable token if employee already had a direct link so link stays in sync
      if (updatedEmp.access_token) {
        updatedEmp.access_token = createPortableEmployeeToken(updatedEmp);
      }

      const updatedList = list.map((item) => (item.id === editingEmployee.id ? updatedEmp : item));
      saveEmployees(updatedList);
      refreshLocalData();
      setModalOpen(false);
      setFeedback({
        type: 'success',
        text: `Le dossier de ${updatedEmp.prenom} ${updatedEmp.nom} (${updatedEmp.matricule}) a été mis à jour dans le localStorage.`
      });
    } else {
      const nextId = list.length > 0 ? Math.max(...list.map((i) => i.id)) + 1 : 1;
      const autoMatricule = getNextMatricule(list);
      const newEmp: Employee = {
        id: nextId,
        matricule: autoMatricule,
        prenom: empForm.prenom.trim(),
        nom: empForm.nom.trim(),
        email: cleanEmail,
        password: empForm.password.trim() || 'Employe@2026!',
        telephone: empForm.telephone.trim(),
        adresse: empForm.adresse.trim(),
        poste: empForm.poste.trim(),
        departement: empForm.departement.trim() || 'Opérations Logistiques',
        type_contrat: empForm.type_contrat,
        salaire: parseFloat(empForm.salaire) || 0,
        devise: empForm.devise || 'CAD',
        date_embauche: empForm.date_embauche,
        photo_url:
          empForm.photo_base64 ||
          generateDefaultAvatarSvgDataUri(empForm.prenom.trim(), empForm.nom.trim(), autoMatricule),
        contrat_pdf_url: empForm.contrat_pdf_base64 || '',
        has_custom_pdf: Boolean(empForm.contrat_pdf_base64),
        must_change_password: true,
        is_active: true,
        access_token: null,
        access_token_created_at: null,
        created_at: now,
        updated_at: now
      };
      newEmp.access_token = createPortableEmployeeToken(newEmp);
      newEmp.access_token_created_at = now;

      const updatedList = [...list, newEmp];
      saveEmployees(updatedList);
      refreshLocalData();
      setModalOpen(false);
      setFeedback({
        type: 'success',
        text: `Employé ${newEmp.prenom} ${newEmp.nom} ajouté dans le localStorage avec le matricule ${newEmp.matricule}.`
      });
    }
  };

  const handleToggleActive = (emp: Employee) => {
    const list = getEmployees();
    const updatedList = list.map((item) =>
      item.id === emp.id
        ? { ...item, is_active: !item.is_active, updated_at: new Date().toISOString() }
        : item
    );
    saveEmployees(updatedList);
    refreshLocalData();
    setFeedback({
      type: 'success',
      text: `Statut du compte ${emp.matricule} modifié avec succès.`
    });
  };

  const handleResetPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalEmp) return;
    const list = getEmployees();
    const updatedList = list.map((item) =>
      item.id === resetModalEmp.id
        ? {
            ...item,
            password: tempResetPassword.trim(),
            must_change_password: true,
            updated_at: new Date().toISOString()
          }
        : item
    );
    saveEmployees(updatedList);
    refreshLocalData();
    setFeedback({
      type: 'success',
      text: `Mot de passe réinitialisé pour ${resetModalEmp.matricule}. Le changement sera demandé à sa prochaine connexion.`
    });
    setResetModalEmp(null);
    setTempResetPassword('');
  };

  const buildDirectEmployeeUrl = (token: string): string => {
    return `${window.location.origin}/employe.html?token=${encodeURIComponent(token)}`;
  };

  const handleGenerateDirectLink = async (emp: Employee) => {
    const list = getEmployees();
    const newToken = createPortableEmployeeToken(emp);
    const updatedList = list.map((item) =>
      item.id === emp.id
        ? {
            ...item,
            access_token: newToken,
            access_token_created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        : item
    );
    saveEmployees(updatedList);
    refreshLocalData();

    const fullUrl = buildDirectEmployeeUrl(newToken);
    try {
      await navigator.clipboard.writeText(fullUrl);
    } catch {
      // Ignore clipboard permission errors
    }
    setFeedback({
      type: 'success',
      text: `Lien direct créé et copié pour ${emp.prenom} ${emp.nom} : ${fullUrl}`
    });
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
        text: `Lien direct de ${emp.prenom} ${emp.nom} : ${fullUrl}`
      });
    }
  };

  const handleRevokeDirectLink = (emp: Employee) => {
    if (emp.access_token) {
      markTokenRevoked(emp.access_token);
    }
    const list = getEmployees();
    const updatedList = list.map((item) =>
      item.id === emp.id
        ? {
            ...item,
            access_token: null,
            access_token_created_at: null,
            updated_at: new Date().toISOString()
          }
        : item
    );
    saveEmployees(updatedList);
    refreshLocalData();
    setFeedback({
      type: 'success',
      text: `Le lien d’accès direct de ${emp.prenom} ${emp.nom} (${emp.matricule}) a été révoqué.`
    });
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
      text: 'Les paramètres du site et du localStorage ont été enregistrés.'
    });
  };

  const handleExportEmployesJson = () => {
    const exportPayload = {
      company: {
        company_name: settings.company_name,
        slogan: settings.slogan,
        address: settings.address,
        phone: settings.phone,
        whatsapp: settings.whatsapp,
        email: settings.email
      },
      employees: getEmployees()
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: 'application/json;charset=utf-8'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employes.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
          text: `${list.length} employé(s) importé(s) dans le localStorage avec succès.`
        });
      } catch {
        setFeedback({ type: 'error', text: 'Impossible de lire le fichier employes.json.' });
      }
    };
    reader.readAsText(file);
  };

  // ==========================================================================
  // ADMIN LOGIN VIEW (Simple JS Password Protection for admin.html)
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
            Entrez le mot de passe administrateur pour gérer les employés dans le navigateur (<code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">localStorage</code>) et générer les liens directs <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">/employe.html?token=XXX</code>.
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

  // Filtered employees
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
      `${emp.prenom} ${emp.nom}`.toLowerCase().includes(q) ||
      emp.email.toLowerCase().includes(q) ||
      emp.poste.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const totalPayroll = employees
    .filter((e) => e.is_active)
    .reduce((acc, e) => acc + Number(e.salaire || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
      {/* Admin Top Header */}
      <div className="bg-[#0B2545] text-white rounded-2xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border border-amber-400/30">
        <div className="space-y-1">
          <div className="text-xs font-mono text-amber-400">
            Administration Statique (admin.html) · Stockage localStorage &amp; employes.json
          </div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-white">
            Console de Gestion RH &amp; Contenu — {settings.company_name}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
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
            <span>Verrouiller Admin</span>
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
          <span className="text-xs text-slate-500 block mt-1">Séquence 2026 active</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <span className="text-xs text-slate-500 block">Masse Salariale Active</span>
          <span className="font-mono tabular-nums text-xl sm:text-2xl font-bold text-emerald-700 mt-0.5 block">
            {new Intl.NumberFormat('fr-CA').format(totalPayroll)} CAD
          </span>
          <span className="text-xs text-slate-500 block mt-1">Mensuel brut cumulé</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <span className="text-xs text-slate-500 block">Messages &amp; Devis Clients</span>
          <span className="font-mono tabular-nums text-2xl sm:text-3xl font-bold text-[#0B2545]">
            {messages.length}
          </span>
          <span className="text-xs text-slate-500 block mt-1">Stockés localement</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-200/70 p-1.5 rounded-2xl">
        <button
          type="button"
          onClick={() => setActiveTab('employees')}
          className={`min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === 'employees'
              ? 'bg-[#0B2545] text-white shadow-sm'
              : 'text-slate-700 hover:text-slate-950'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Gestion des Employés ({employees.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('cms')}
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
          onClick={() => setActiveTab('messages')}
          className={`min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === 'messages'
              ? 'bg-[#0B2545] text-white shadow-sm'
              : 'text-slate-700 hover:text-slate-950'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>Demandes Contact ({messages.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('json')}
          className={`min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === 'json'
              ? 'bg-[#0B2545] text-white shadow-sm'
              : 'text-slate-700 hover:text-slate-950'
          }`}
        >
          <FileJson className="w-4 h-4" />
          <span>Base employes.json (Export / Import)</span>
        </button>
      </div>

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
          TAB 1: GESTION DES EMPLOYÉS (LOCALSTORAGE + LIEN DIRECT)
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
                  placeholder="Rechercher par matricule, nom, poste..."
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

            <button
              type="button"
              onClick={openAddEmployeeModal}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#0B2545] text-white font-bold text-xs sm:text-sm hover:bg-[#134074] transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <UserPlus className="w-4 h-4 text-amber-400" />
              <span>Ajouter un employé ({nextMatricule})</span>
            </button>
          </div>

          {/* Desktop Adaptive Table */}
          <div className="hidden lg:block bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <th className="py-3.5 px-4">Salarié &amp; Photo</th>
                  <th className="py-3.5 px-4">Matricule</th>
                  <th className="py-3.5 px-4">Poste &amp; Contrat</th>
                  <th className="py-3.5 px-4 text-right">Salaire</th>
                  <th className="py-3.5 px-4">Lien Direct (/employe.html?token=XXX)</th>
                  <th className="py-3.5 px-4">Statut</th>
                  <th className="py-3.5 px-4 text-right">Actions RH</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={emp.photo_url}
                          alt={emp.nom}
                          referrerPolicy="no-referrer"
                          className="w-11 h-11 rounded-xl object-cover border border-slate-300 shrink-0"
                        />
                        <div>
                          <div className="font-bold text-[#0B2545]">
                            {emp.prenom} {emp.nom}
                          </div>
                          <div className="text-xs text-slate-500">{emp.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono tabular-nums font-semibold text-[#0B2545]">
                      {emp.matricule}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-900">{emp.poste}</div>
                      <div className="text-xs text-slate-500">
                        {emp.type_contrat} · Embauche : {emp.date_embauche}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums font-bold text-slate-900">
                      {new Intl.NumberFormat('fr-CA').format(emp.salaire)} {emp.devise}
                    </td>
                    <td className="py-3.5 px-4">
                      {emp.access_token ? (
                        <div className="space-y-1.5">
                          <div className="font-mono text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg max-w-[230px] truncate">
                            /employe.html?token={emp.access_token}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleCopyDirectLink(emp)}
                              className="px-2.5 py-1 rounded-lg bg-[#0B2545] text-white text-[11px] font-semibold inline-flex items-center gap-1 hover:bg-[#134074]"
                              title="Copier le lien direct"
                            >
                              <Copy className="w-3 h-3" />
                              <span>Copier</span>
                            </button>
                            {onOpenDirectEmployeeLink && (
                              <button
                                type="button"
                                onClick={() => onOpenDirectEmployeeLink(emp.access_token!)}
                                className="px-2 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-semibold inline-flex items-center gap-1 hover:bg-slate-200"
                                title="Tester l'ouverture directe de la fiche"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>Ouvrir</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRevokeDirectLink(emp)}
                              className="px-2 py-1 rounded-lg bg-red-50 text-red-700 text-[11px] font-semibold inline-flex items-center gap-1 hover:bg-red-100"
                              title="Révoquer ce lien"
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
                          className="px-3 py-1.5 rounded-xl bg-amber-400/20 border border-amber-400 text-[#0B2545] text-xs font-bold inline-flex items-center gap-1.5 hover:bg-amber-400/30 transition-colors"
                        >
                          <Link2 className="w-3.5 h-3.5" />
                          <span>Créer un lien direct</span>
                        </button>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      <div className="font-semibold">
                        {emp.is_active ? (
                          <span className="text-emerald-700">Compte Actif</span>
                        ) : (
                          <span className="text-red-600">Compte Désactivé</span>
                        )}
                      </div>
                      <div className="text-slate-500">
                        {emp.must_change_password ? '1er login requis' : 'Mot de passe actif'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {emp.access_token && onOpenDirectEmployeeLink && (
                          <button
                            type="button"
                            onClick={() => onOpenDirectEmployeeLink(emp.access_token!)}
                            className="p-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100"
                            title="Voir la fiche et le contrat PDF"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openEditEmployeeModal(emp)}
                          className="p-2 rounded-lg border border-slate-200 text-[#0B2545] hover:bg-slate-100"
                          title="Modifier le dossier"
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
                              ? 'border-red-200 text-red-600 hover:bg-red-50'
                              : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                          }`}
                          title={emp.is_active ? 'Désactiver ce compte' : 'Réactiver ce compte'}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile & Tablet Adaptive Cards */}
          <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredEmployees.map((emp) => (
              <div
                key={emp.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4"
              >
                <div className="flex items-center gap-3.5">
                  <img
                    src={emp.photo_url}
                    alt={emp.nom}
                    referrerPolicy="no-referrer"
                    className="w-14 h-14 rounded-2xl object-cover border border-slate-300 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-xs font-bold text-amber-600">
                      {emp.matricule} · {emp.is_active ? 'Actif' : 'Désactivé'}
                    </div>
                    <h3 className="font-bold text-base text-[#0B2545] truncate">
                      {emp.prenom} {emp.nom}
                    </h3>
                    <p className="text-xs text-slate-500 truncate">{emp.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-3 border-t border-slate-100">
                  <div>
                    <span className="text-slate-400 block">Poste</span>
                    <span className="font-semibold text-slate-800">{emp.poste}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Contrat</span>
                    <span className="font-semibold text-slate-800">{emp.type_contrat}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Salaire</span>
                    <span className="font-mono tabular-nums font-bold text-emerald-700">
                      {new Intl.NumberFormat('fr-CA').format(emp.salaire)} {emp.devise}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Date d’embauche</span>
                    <span className="font-mono tabular-nums text-slate-800">{emp.date_embauche}</span>
                  </div>
                </div>

                {/* Lien Direct Salarié sur Mobile */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <span className="text-[11px] font-semibold text-slate-500 block">
                    Lien direct sans login (/employe.html?token=XXX) :
                  </span>
                  {emp.access_token ? (
                    <div className="space-y-2">
                      <div className="font-mono text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg truncate">
                        /employe.html?token={emp.access_token}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopyDirectLink(emp)}
                          className="flex-1 min-h-[38px] px-3 py-1.5 rounded-xl bg-[#0B2545] text-white text-xs font-semibold flex items-center justify-center gap-1.5"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copier</span>
                        </button>
                        {onOpenDirectEmployeeLink && (
                          <button
                            type="button"
                            onClick={() => onOpenDirectEmployeeLink(emp.access_token!)}
                            className="min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-100 text-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Ouvrir</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRevokeDirectLink(emp)}
                          className="min-h-[38px] px-3 py-1.5 rounded-xl bg-red-50 text-red-700 text-xs font-semibold flex items-center justify-center gap-1.5"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          <span>Révoquer</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleGenerateDirectLink(emp)}
                      className="w-full min-h-[40px] px-3 py-2 rounded-xl bg-amber-400/25 border border-amber-400 text-[#0B2545] text-xs font-bold flex items-center justify-center gap-1.5"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      <span>Créer un lien direct</span>
                    </button>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openEditEmployeeModal(emp)}
                    className="flex-1 min-h-[42px] px-3 py-2 rounded-xl bg-slate-100 text-[#0B2545] text-xs font-semibold flex items-center justify-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Modifier</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setResetModalEmp(emp);
                      setTempResetPassword('Employe@2026!');
                    }}
                    className="flex-1 min-h-[42px] px-3 py-2 rounded-xl bg-amber-50 text-amber-800 text-xs font-semibold flex items-center justify-center gap-1.5"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Mot de passe</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleActive(emp)}
                    className={`min-h-[42px] px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 ${
                      emp.is_active
                        ? 'bg-red-50 text-red-700'
                        : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>{emp.is_active ? 'Désactiver' : 'Activer'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ====================================================================
          TAB 2: MODIFIER LE SITE & LOGO (LOCALSTORAGE)
      ==================================================================== */}
      {activeTab === 'cms' && (
        <form onSubmit={handleSaveCms} className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-8">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="font-display font-bold text-xl text-[#0B2545]">
              Personnalisation du Site Public &amp; Identité Visuelle
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Toute modification est enregistrée immédiatement dans votre navigateur.
            </p>
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
                Logo de l’entreprise (affiché agrandi dans le Header)
              </label>
              <div className="flex items-center gap-4">
                <BrandLogo
                  customLogoUrl={cmsForm.logo_url}
                  companyName={cmsForm.company_name}
                  size="header"
                />
                <label className="cursor-pointer min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-[#0B2545] inline-flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  <span>Importer un fichier Logo (PNG/JPG)</span>
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
          TAB 3: MESSAGES DE CONTACT (LOCALSTORAGE)
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
          TAB 4: FICHIER EMPLOYES.JSON (EXPORT / IMPORT STATIQUE NETLIFY)
      ==================================================================== */}
      {activeTab === 'json' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <h2 className="font-display font-bold text-xl text-[#0B2545]">
                Base de données statique : <code className="font-mono text-base">employes.json</code>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                Votre site fonctionne à 100% en statique sur Netlify grâce à <code className="font-mono">/employes.json</code> et au <code className="font-mono">localStorage</code>, sans aucun serveur PHP ni MySQL.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleExportEmployesJson}
                className="min-h-[44px] px-4 py-2.5 rounded-xl bg-amber-400 text-[#0B2545] font-bold text-xs sm:text-sm flex items-center gap-2 hover:bg-amber-300"
              >
                <Download className="w-4 h-4" />
                <span>Télécharger employes.json</span>
              </button>

              <label className="cursor-pointer min-h-[44px] px-4 py-2.5 rounded-xl bg-[#0B2545] text-white font-bold text-xs sm:text-sm flex items-center gap-2 hover:bg-[#134074]">
                <Upload className="w-4 h-4 text-amber-400" />
                <span>Importer un fichier JSON</span>
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
                  slogan: settings.slogan,
                  address: settings.address,
                  phone: settings.phone,
                  whatsapp: settings.whatsapp,
                  email: settings.email
                },
                employees: employees.map((e) => ({
                  ...e,
                  photo_url: e.photo_url.startsWith('data:') ? '[Photo encodée Base64/SVG]' : e.photo_url,
                  contrat_pdf_url: e.contrat_pdf_url ? '[Contrat PDF encodé Base64]' : ''
                }))
              },
              null,
              2
            )}
          </pre>
        </div>
      )}

      {/* ====================================================================
          MODAL: AJOUTER / MODIFIER UN EMPLOYÉ DANS LE LOCALSTORAGE
      ==================================================================== */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full p-5 sm:p-8 shadow-xl my-8 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-5">
              <div>
                <span className="font-mono text-xs font-bold text-amber-600">
                  Matricule : {editingEmployee ? editingEmployee.matricule : `${nextMatricule} (Auto)`}
                </span>
                <h2 className="font-display font-bold text-xl text-[#0B2545]">
                  {editingEmployee ? 'Modifier le dossier employé' : 'Nouvel employé ATLANTIC TRANSPORT LTD'}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Prénom *</label>
                  <input
                    type="text"
                    required
                    value={empForm.prenom}
                    onChange={(e) => setEmpForm({ ...empForm, prenom: e.target.value })}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nom *</label>
                  <input
                    type="text"
                    required
                    value={empForm.nom}
                    onChange={(e) => setEmpForm({ ...empForm, nom: e.target.value })}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    E-mail professionnel (Login) *
                  </label>
                  <input
                    type="email"
                    required
                    value={empForm.email}
                    onChange={(e) => setEmpForm({ ...empForm, email: e.target.value })}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Téléphone</label>
                  <input
                    type="text"
                    value={empForm.telephone}
                    onChange={(e) => setEmpForm({ ...empForm, telephone: e.target.value })}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Poste occupé *</label>
                  <input
                    type="text"
                    required
                    value={empForm.poste}
                    onChange={(e) => setEmpForm({ ...empForm, poste: e.target.value })}
                    placeholder="Ex: Coordinateur Transit & Douane"
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Type de contrat *</label>
                  <select
                    value={empForm.type_contrat}
                    onChange={(e) => setEmpForm({ ...empForm, type_contrat: e.target.value })}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                  >
                    <option value="CDI - Temps plein">CDI - Temps plein</option>
                    <option value="CDD - Temps plein">CDD - Temps plein</option>
                    <option value="Contrat International Expatrié">Contrat International Expatrié</option>
                    <option value="CDI - Temps partiel">CDI - Temps partiel</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Salaire mensuel *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={empForm.salaire}
                    onChange={(e) => setEmpForm({ ...empForm, salaire: e.target.value })}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Devise *</label>
                  <select
                    value={empForm.devise}
                    onChange={(e) => setEmpForm({ ...empForm, devise: e.target.value })}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm bg-white font-mono"
                  >
                    <option value="CAD">CAD ($)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date d’embauche *</label>
                  <input
                    type="date"
                    required
                    value={empForm.date_embauche}
                    onChange={(e) => setEmpForm({ ...empForm, date_embauche: e.target.value })}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mot de passe de connexion du salarié *
                </label>
                <input
                  type="text"
                  required
                  minLength={6}
                  value={empForm.password}
                  onChange={(e) => setEmpForm({ ...empForm, password: e.target.value })}
                  placeholder="Mot de passe de connexion Espace Employé"
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-mono"
                />
              </div>

              {/* Uploads en Base64 dans localStorage */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 space-y-2">
                  <span className="text-xs font-semibold text-[#0B2545] block">
                    Photo d’identité (JPG / PNG)
                  </span>
                  <label className="cursor-pointer min-h-[40px] px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-700 inline-flex items-center gap-2 hover:bg-slate-100">
                    <Upload className="w-4 h-4 text-[#0B2545]" />
                    <span>{empForm.photo_name || 'Choisir une photo JPG/PNG'}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 space-y-2">
                  <span className="text-xs font-semibold text-[#0B2545] block">
                    Contrat de travail (PDF)
                  </span>
                  <label className="cursor-pointer min-h-[40px] px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-700 inline-flex items-center gap-2 hover:bg-slate-100">
                    <FileText className="w-4 h-4 text-[#0B2545]" />
                    <span>{empForm.contrat_pdf_name || 'Importer le contrat PDF'}</span>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={handleContractPdfUpload}
                      className="hidden"
                    />
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
                  className="min-h-[44px] px-6 py-2.5 rounded-xl bg-[#0B2545] text-white text-xs sm:text-sm font-bold hover:bg-[#134074]"
                >
                  {editingEmployee ? 'Mettre à jour' : 'Enregistrer le salarié'}
                </button>
              </div>
            </form>
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
              Définissez un nouveau mot de passe temporaire pour <strong>{resetModalEmp.prenom} {resetModalEmp.nom}</strong>.
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
