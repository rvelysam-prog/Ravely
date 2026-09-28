import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Edit3,
  Power,
  KeyRound,
  Settings,
  Mail,
  Code2,
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
  Link2,
  Copy,
  Ban,
  ExternalLink
} from 'lucide-react';
import { ContactMessage, Employee, SiteSettings } from '../types';
import { DeliverableFile } from '../data/phpDeliverableFiles';
import { BrandLogo } from './BrandLogo';

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
  // Login states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Dashboard states
  const [activeTab, setActiveTab] = useState<'employees' | 'cms' | 'messages' | 'deploy'>('employees');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [nextMatricule, setNextMatricule] = useState('EMP-2026-003');
  const [deliverables, setDeliverables] = useState<DeliverableFile[]>([]);
  const [selectedDeliverable, setSelectedDeliverable] = useState<DeliverableFile | null>(null);
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
  const [savingEmp, setSavingEmp] = useState(false);

  // Password Reset Modal
  const [resetModalEmp, setResetModalEmp] = useState<Employee | null>(null);
  const [tempResetPassword, setTempResetPassword] = useState('');

  // Site CMS Editor State
  const [cmsForm, setCmsForm] = useState<SiteSettings>(settings);
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [savingCms, setSavingCms] = useState(false);

  useEffect(() => {
    setCmsForm(settings);
  }, [settings]);

  const fetchDashboardData = async (token: string) => {
    try {
      const [dashRes, phpRes] = await Promise.all([
        fetch('/api/admin/dashboard', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('/api/admin/php-deliverables', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (dashRes.status === 401) {
        onAdminLogout();
        return;
      }

      if (dashRes.ok) {
        const data = await dashRes.json();
        setEmployees(data.employees || []);
        setMessages(data.messages || []);
        setNextMatricule(data.nextMatricule || 'EMP-2026-003');
      }

      if (phpRes.ok) {
        const phpData = await phpRes.json();
        setDeliverables(phpData.files || []);
        if (phpData.files?.length > 0 && !selectedDeliverable) {
          setSelectedDeliverable(phpData.files[0]);
        }
      }
    } catch {
      setFeedback({ type: 'error', text: 'Erreur lors du chargement des données du backoffice.' });
    }
  };

  useEffect(() => {
    if (adminToken) {
      fetchDashboardData(adminToken);
    }
  }, [adminToken]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const data = await res.json();
      if (!res.ok || data.role !== 'admin') {
        setLoginError('Accès refusé. Veuillez vérifier vos identifiants administrateur.');
      } else {
        onAdminAuthenticated(data.token);
        setLoginPassword('');
      }
    } catch {
      setLoginError('Erreur de connexion au serveur.');
    } finally {
      setLoginLoading(false);
    }
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
      password: '',
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
      password: '',
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

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken) return;
    setSavingEmp(true);
    setFeedback(null);

    try {
      const url = editingEmployee
        ? `/api/admin/employees/${editingEmployee.id}`
        : '/api/admin/employees';
      const method = editingEmployee ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          ...empForm,
          salaire: parseFloat(empForm.salaire) || 0
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'error', text: data.error || 'Erreur lors de la sauvegarde.' });
      } else {
        setModalOpen(false);
        setFeedback({
          type: 'success',
          text: editingEmployee
            ? `Le dossier de ${data.employee.prenom} ${data.employee.nom} (${data.employee.matricule}) a été mis à jour.`
            : `Employé ${data.employee.prenom} ${data.employee.nom} créé avec le matricule ${data.employee.matricule}.`
        });
        fetchDashboardData(adminToken);
      }
    } catch {
      setFeedback({ type: 'error', text: 'Erreur réseau lors de la sauvegarde du salarié.' });
    } finally {
      setSavingEmp(false);
    }
  };

  const handleToggleActive = async (emp: Employee) => {
    if (!adminToken) return;
    try {
      const res = await fetch(`/api/admin/employees/${emp.id}/toggle-active`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      if (res.ok) {
        fetchDashboardData(adminToken);
        setFeedback({
          type: 'success',
          text: `Statut du compte ${emp.matricule} modifié avec succès.`
        });
      }
    } catch {
      setFeedback({ type: 'error', text: 'Impossible de modifier le statut.' });
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken || !resetModalEmp) return;
    try {
      const res = await fetch(`/api/admin/employees/${resetModalEmp.id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({ newPassword: tempResetPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'error', text: data.error || 'Erreur lors de la réinitialisation.' });
      } else {
        setFeedback({
          type: 'success',
          text: `Mot de passe réinitialisé pour ${resetModalEmp.matricule}. Le changement sera forcé dès sa prochaine connexion.`
        });
        setResetModalEmp(null);
        setTempResetPassword('');
        fetchDashboardData(adminToken);
      }
    } catch {
      setFeedback({ type: 'error', text: 'Erreur réseau.' });
    }
  };

  const handleGenerateDirectLink = async (emp: Employee) => {
    if (!adminToken) return;
    try {
      const res = await fetch(`/api/admin/employees/${emp.id}/generate-link`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'error', text: data.error || 'Impossible de générer le lien.' });
      } else {
        const fullUrl = `${window.location.origin}/employe/${data.employee.access_token}`;
        try {
          await navigator.clipboard.writeText(fullUrl);
        } catch {
          // Clipboard fallback ignored if blocked
        }
        setFeedback({
          type: 'success',
          text: `Lien direct unique généré et copié pour ${emp.prenom} ${emp.nom} : ${fullUrl}`
        });
        fetchDashboardData(adminToken);
      }
    } catch {
      setFeedback({ type: 'error', text: 'Erreur réseau lors de la génération du lien.' });
    }
  };

  const handleCopyDirectLink = async (emp: Employee) => {
    if (!emp.access_token) return;
    const fullUrl = `${window.location.origin}/employe/${emp.access_token}`;
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

  const handleRevokeDirectLink = async (emp: Employee) => {
    if (!adminToken) return;
    try {
      const res = await fetch(`/api/admin/employees/${emp.id}/revoke-link`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      if (res.ok) {
        setFeedback({
          type: 'success',
          text: `Le lien d’accès direct de ${emp.prenom} ${emp.nom} (${emp.matricule}) a été révoqué.`
        });
        fetchDashboardData(adminToken);
      }
    } catch {
      setFeedback({ type: 'error', text: 'Impossible de révoquer le lien.' });
    }
  };

  const handleSaveCms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken) return;
    setSavingCms(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/site', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          ...cmsForm,
          new_admin_password: newAdminPassword || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'error', text: data.error || 'Erreur lors de la mise à jour.' });
      } else {
        onSettingsUpdated(data.settings);
        setNewAdminPassword('');
        setFeedback({
          type: 'success',
          text: 'Les informations et contenus du site ont été mis à jour en temps réel.'
        });
      }
    } catch {
      setFeedback({ type: 'error', text: 'Erreur réseau lors de la sauvegarde.' });
    } finally {
      setSavingCms(false);
    }
  };

  const handleDownloadFile = (file: DeliverableFile) => {
    const blob = new Blob([file.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ==========================================================================
  // ADMIN LOGIN VIEW (WHEN NOT AUTHENTICATED)
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
              <span className="text-xs font-mono text-slate-500">Accès Restreint (/admin)</span>
              <h1 className="font-display font-bold text-xl text-[#0B2545]">
                Backoffice Direction
              </h1>
            </div>
          </div>

          {loginError && (
            <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Identifiant Administrateur
              </label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="Adresse e-mail administrateur"
                className="w-full min-h-[46px] px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-[#0B2545] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Mot de passe
              </label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full min-h-[46px] px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-[#0B2545] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full min-h-[48px] px-6 py-3 rounded-xl bg-[#0B2545] text-white font-bold text-sm hover:bg-[#134074] transition-colors"
            >
              {loginLoading ? 'Connexion...' : 'Accéder au Backoffice'}
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
            Backoffice Administration (/admin) · Accès Propriétaire Exclusif
          </div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-white">
            Console de Gestion RH & Contenu — {settings.company_name}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onBackToSite}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap"
          >
            Voir le site en direct
          </button>
          <button
            type="button"
            onClick={onAdminLogout}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-amber-400 text-[#0B2545] hover:bg-amber-300 text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors whitespace-nowrap"
          >
            <LogOut className="w-4 h-4" />
            <span>Déconnexion Admin</span>
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
          <span className="text-xs text-slate-500 block">Messages & Devis Clients</span>
          <span className="font-mono tabular-nums text-2xl sm:text-3xl font-bold text-[#0B2545]">
            {messages.length}
          </span>
          <span className="text-xs text-slate-500 block mt-1">
            {messages.filter((m) => !m.lu).length} non lu(s)
          </span>
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
          <span>Modifier le Site & Logo</span>
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
          onClick={() => setActiveTab('deploy')}
          className={`min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === 'deploy'
              ? 'bg-[#0B2545] text-white shadow-sm'
              : 'text-slate-700 hover:text-slate-950'
          }`}
        >
          <Code2 className="w-4 h-4" />
          <span>Fichiers public_html (PHP/MySQL & .sql)</span>
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
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs font-semibold underline"
          >
            Fermer
          </button>
        </div>
      )}

      {/* ====================================================================
          TAB 1: GESTION DES EMPLOYÉS
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
                  <th className="py-3.5 px-4">Salarié & Photo</th>
                  <th className="py-3.5 px-4">Matricule</th>
                  <th className="py-3.5 px-4">Poste & Contrat</th>
                  <th className="py-3.5 px-4 text-right">Salaire</th>
                  <th className="py-3.5 px-4">Lien Direct Salarié (/employe/TOKEN)</th>
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
                          <div className="font-mono text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg max-w-[220px] truncate">
                            /employe/{emp.access_token}
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
                                title="Tester l'ouverture directe"
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
                        <a
                          href={`/api/employee/contract-pdf/${emp.id}?token=${encodeURIComponent(adminToken)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100"
                          title="Voir le contrat PDF"
                        >
                          <Eye className="w-4 h-4" />
                        </a>
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

          {/* Mobile & Tablet Adaptive Cards (Zero Horizontal Scroll Bugs) */}
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
                    Lien d’accès direct sans mot de passe :
                  </span>
                  {emp.access_token ? (
                    <div className="space-y-2">
                      <div className="font-mono text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg truncate">
                        /employe/{emp.access_token}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopyDirectLink(emp)}
                          className="flex-1 min-h-[38px] px-3 py-1.5 rounded-xl bg-[#0B2545] text-white text-xs font-semibold flex items-center justify-center gap-1.5"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copier le lien</span>
                        </button>
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
                      <span>Créer un lien direct (/employe/TOKEN)</span>
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
          TAB 2: MODIFIER LE SITE & LOGO (CMS PROPRIÉTAIRE)
      ==================================================================== */}
      {activeTab === 'cms' && (
        <form onSubmit={handleSaveCms} className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-8">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="font-display font-bold text-xl text-[#0B2545]">
              Personnalisation du Site Public & Identité Visuelle
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Cet espace vous est strictement réservé. Toute modification est appliquée immédiatement sur le site public.
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

          {/* Edit 3 Core Services */}
          <div className="space-y-4 pt-6 border-t border-slate-200">
            <h3 className="font-display font-bold text-base text-[#0B2545]">
              Contenu des 3 Services Logistiques
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {cmsForm.services.map((srv, index) => (
                <div key={srv.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="text-xs font-mono font-bold text-amber-600">
                    Service {srv.number}
                  </div>
                  <input
                    type="text"
                    value={srv.title}
                    onChange={(e) => {
                      const updated = [...cmsForm.services];
                      updated[index] = { ...srv, title: e.target.value };
                      setCmsForm({ ...cmsForm, services: updated });
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold bg-white"
                  />
                  <textarea
                    rows={4}
                    value={srv.description}
                    onChange={(e) => {
                      const updated = [...cmsForm.services];
                      updated[index] = { ...srv, description: e.target.value };
                      setCmsForm({ ...cmsForm, services: updated });
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Optional Admin Password Update */}
          <div className="pt-6 border-t border-slate-200 max-w-md">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Modifier votre mot de passe Administrateur (optionnel)
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
              disabled={savingCms}
              className="min-h-[48px] px-6 py-3 rounded-xl bg-[#0B2545] text-white font-bold text-sm hover:bg-[#134074] transition-colors"
            >
              {savingCms ? 'Enregistrement...' : 'Enregistrer les modifications du site'}
            </button>
          </div>
        </form>
      )}

      {/* ====================================================================
          TAB 3: MESSAGES DE CONTACT
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
                className={`bg-white rounded-2xl border p-6 space-y-3 ${
                  msg.lu ? 'border-slate-200' : 'border-amber-400'
                }`}
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
                    onClick={async () => {
                      await fetch(`/api/admin/messages/${msg.id}`, {
                        method: 'DELETE',
                        headers: { Authorization: `Bearer ${adminToken}` }
                      });
                      fetchDashboardData(adminToken);
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
          TAB 4: FICHIERS SERVEUR public_html (PHP 8+ / MySQL & .sql)
      ==================================================================== */}
      {activeTab === 'deploy' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-slate-200 p-5 space-y-4 bg-slate-50">
            <div>
              <h2 className="font-display font-bold text-base text-[#0B2545]">
                Arborescence public_html & SQL
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Fichiers PHP 8+ / PDO / MySQL et base .sql prêts à transférer sur votre hébergement cPanel.
              </p>
            </div>

            <div className="space-y-2">
              {deliverables.map((file) => (
                <button
                  key={file.path}
                  type="button"
                  onClick={() => setSelectedDeliverable(file)}
                  className={`w-full text-left p-3 rounded-xl border text-xs transition-colors flex items-center justify-between gap-2 ${
                    selectedDeliverable?.path === file.path
                      ? 'bg-[#0B2545] text-white border-[#0B2545]'
                      : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className="font-mono font-semibold truncate">{file.path}</span>
                  <Download
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadFile(file);
                    }}
                    className="w-4 h-4 shrink-0 text-amber-400 hover:scale-110 transition-transform"
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-8 p-5 sm:p-6 flex flex-col justify-between space-y-4">
            {selectedDeliverable && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
                  <div>
                    <span className="font-mono text-xs font-bold text-[#134074]">
                      public_html/{selectedDeliverable.path}
                    </span>
                    <p className="text-xs text-slate-600 mt-0.5">{selectedDeliverable.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownloadFile(selectedDeliverable)}
                    className="min-h-[40px] px-4 py-2 rounded-xl bg-amber-400 text-[#0B2545] font-bold text-xs flex items-center gap-2 hover:bg-amber-300"
                  >
                    <Download className="w-4 h-4" />
                    <span>Télécharger {selectedDeliverable.filename}</span>
                  </button>
                </div>

                <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl text-xs font-mono overflow-x-auto max-h-[520px] overflow-y-auto leading-relaxed">
                  {selectedDeliverable.content}
                </pre>
              </>
            )}
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL: AJOUTER / MODIFIER UN EMPLOYÉ
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

              {!editingEmployee && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mot de passe initial temporaire (sera hashé et forcé au changement au 1er login) *
                  </label>
                  <input
                    type="text"
                    required
                    minLength={6}
                    value={empForm.password}
                    onChange={(e) => setEmpForm({ ...empForm, password: e.target.value })}
                    placeholder="Définir le mot de passe temporaire remis au salarié"
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-mono"
                  />
                </div>
              )}

              {/* Uploads: Photo JPG/PNG (/uploads/photos) & Contrat PDF (/uploads/contrats) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 space-y-2">
                  <span className="text-xs font-semibold text-[#0B2545] block">
                    Photo d’identité (JPG / PNG) → /uploads/photos
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
                    Contrat de travail (PDF) → /uploads/contrats
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
                  disabled={savingEmp}
                  className="min-h-[44px] px-6 py-2.5 rounded-xl bg-[#0B2545] text-white text-xs sm:text-sm font-bold hover:bg-[#134074]"
                >
                  {savingEmp ? 'Enregistrement...' : editingEmployee ? 'Mettre à jour' : 'Créer le salarié'}
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
              Définissez un nouveau mot de passe temporaire pour <strong>{resetModalEmp.prenom} {resetModalEmp.nom}</strong>. Il sera hashé et l’employé devra obligatoirement le changer dès sa prochaine connexion.
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
