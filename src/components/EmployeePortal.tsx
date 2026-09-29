import React, { useState, useEffect } from 'react';
import {
  Lock,
  LogOut,
  ShieldAlert,
  FileText,
  ZoomIn,
  ZoomOut,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  X
} from 'lucide-react';
import { Employee, SiteSettings } from '../types';
import { BrandLogo } from './BrandLogo';
import {
  authenticateEmployeeJS,
  fetchEmployeesFromFirestore,
  findEmployeeByDirectTokenJS,
  updateEmployeePasswordJS,
  verifyAdminPasswordJS
} from '../services/staticStorage';
import {
  CONTRACT_STATIC_ASSETS,
  buildHebergementPoint2Text,
  createArticleStarIconPngDataUrl,
  createScriptTitlePngDataUrl,
  formatDateFr,
  formatDateLongFr,
  formatSalaryContract,
  generateEmployeeQrDataUrl
} from '../services/contractPdfGenerator';

interface EmployeePortalProps {
  settings: SiteSettings;
  employeeToken: string | null;
  employee: Employee | null;
  directAccessToken?: string | null;
  onEmployeeAuthenticated: (token: string, emp: Employee) => void;
  onEmployeeLogout: () => void;
  onAdminAuthenticated: (token: string) => void;
  onCloseModal?: () => void;
}

export const EmployeePortal: React.FC<EmployeePortalProps> = ({
  settings,
  employeeToken,
  employee,
  directAccessToken,
  onEmployeeAuthenticated,
  onEmployeeLogout,
  onAdminAuthenticated,
  onCloseModal
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Direct link employee state (/employe.html?token=XXX or /employe.html?id=EMP-XXXX)
  const [directEmployee, setDirectEmployee] = useState<Employee | null>(null);
  const [directError, setDirectError] = useState('');

  // First-login password change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState('');

  // Contract viewer states
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [viewerMode, setViewerMode] = useState<'document' | 'pdf-native'>('document');
  const [securityNotice, setSecurityNotice] = useState<string | null>(null);

  // Visual assets for the A4 Contract
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [scriptTitleUrl, setScriptTitleUrl] = useState<string>('');
  const [starIconUrl, setStarIconUrl] = useState<string>('');

  // Resolve employee directly in pure JS or Firestore if accessed via /employe.html?token=XXX or ?id=EMP-XXXX
  useEffect(() => {
    let cancelled = false;
    if (!directAccessToken) {
      setDirectEmployee(null);
      setDirectError('');
      return;
    }
    const localResult = findEmployeeByDirectTokenJS(directAccessToken);
    if (localResult.employee) {
      setDirectEmployee(localResult.employee);
      setDirectError('');
      return;
    }
    fetchEmployeesFromFirestore()
      .then(() => {
        if (cancelled) return;
        const freshResult = findEmployeeByDirectTokenJS(directAccessToken);
        if (freshResult.employee) {
          setDirectEmployee(freshResult.employee);
          setDirectError('');
        } else {
          setDirectEmployee(null);
          setDirectError(freshResult.error || 'Lien d’accès direct invalide ou révoqué.');
        }
      })
      .catch(() => {
        if (cancelled) return;
        setDirectEmployee(null);
        setDirectError(localResult.error || 'Lien d’accès direct invalide ou révoqué.');
      });
    return () => {
      cancelled = true;
    };
  }, [directAccessToken]);

  const activeEmployee = directEmployee || employee;

  useEffect(() => {
    setScriptTitleUrl(createScriptTitlePngDataUrl());
    setStarIconUrl(createArticleStarIconPngDataUrl());
  }, []);

  useEffect(() => {
    if (activeEmployee?.matricule) {
      generateEmployeeQrDataUrl(activeEmployee.matricule)
        .then(setQrDataUrl)
        .catch(() => {});
    }
  }, [activeEmployee?.matricule]);

  // Block Ctrl+S, Ctrl+P, Ctrl+U and right-click when viewing employee portal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ['s', 'p', 'u'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        setSecurityNotice(
          'Action bloquée : Le téléchargement et l’impression du contrat de travail sont réservés à l’administrateur.'
        );
        setTimeout(() => setSecurityNotice(null), 4000);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setSecurityNotice('Clic droit désactivé : Document confidentiel en lecture seule.');
    setTimeout(() => setSecurityNotice(null), 3500);
  };

  // Pure JS + Firestore Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (verifyAdminPasswordJS(password, email)) {
      setLoading(false);
      onAdminAuthenticated('admin-js-session');
      return;
    }

    let authResult = authenticateEmployeeJS(email, password);
    if (!authResult.ok) {
      try {
        await fetchEmployeesFromFirestore();
        authResult = authenticateEmployeeJS(email, password);
      } catch {
        // Ignore Firestore network error and report auth error
      }
    }
    setLoading(false);

    if (!authResult.ok) {
      setError(authResult.error);
      return;
    }

    const sessionTok = `emp-js-${authResult.employee.id}-${Date.now()}`;
    onEmployeeAuthenticated(sessionTok, authResult.employee);
    setPassword('');
  };

  // Pure JS First-Login Password Change
  const handleFirstPasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;
    setError('');

    if (newPassword.trim().length < 8) {
      setError('Le nouveau mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('La confirmation du mot de passe ne correspond pas.');
      return;
    }

    const updated = updateEmployeePasswordJS(employee.id, newPassword);
    if (!updated) {
      setError('Impossible de mettre à jour le mot de passe.');
      return;
    }

    setPasswordChangeSuccess('Votre nouveau mot de passe personnel a été enregistré avec succès.');
    setNewPassword('');
    setConfirmPassword('');
    onEmployeeAuthenticated(employeeToken || `emp-js-${updated.id}`, updated);
  };

  const isDirectTokenMode = Boolean(directAccessToken && directEmployee);

  if (directAccessToken && directError) {
    return (
      <div className="max-w-md mx-auto my-16 bg-white rounded-2xl border border-red-200 p-8 text-center space-y-4 shadow-sm">
        <ShieldAlert className="w-10 h-10 text-red-600 mx-auto" />
        <h2 className="font-display font-bold text-xl text-[#0B2545]">
          Lien d’accès direct non valide
        </h2>
        <p className="text-sm text-slate-600">{directError}</p>
        {onCloseModal && (
          <button
            type="button"
            onClick={onCloseModal}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#0B2545] text-white text-xs font-bold"
          >
            Retour au site
          </button>
        )}
      </div>
    );
  }

  // ==========================================================================
  // VIEW 1: NOT LOGGED IN -> SECURE LOGIN FORM (MODAL ESPACE EMPLOYÉ INTACT)
  // ==========================================================================
  if (!activeEmployee || (!employeeToken && !isDirectTokenMode)) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="max-w-md mx-auto bg-white rounded-2xl border border-slate-200 p-6 sm:p-10 shadow-xl relative">
          {onCloseModal && (
            <button
              type="button"
              onClick={onCloseModal}
              className="absolute top-4 right-4 min-h-[38px] min-w-[38px] rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <div className="flex items-center gap-3 mb-6">
            <BrandLogo
              customLogoUrl={settings.logo_url}
              companyName={settings.company_name}
              size="card"
            />
            <div>
              <h1 className="font-display font-bold text-2xl text-[#0B2545]">
                Espace Employé
              </h1>
              <p className="text-xs text-slate-500">{settings.company_name}</p>
            </div>
          </div>

          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            Veuillez saisir votre adresse e-mail professionnelle et votre mot de passe pour accéder à votre fiche salarié et à votre contrat de travail.
          </p>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Adresse e-mail professionnelle
              </label>
              <input
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="prenom.nom@entreprise.com"
                className="w-full min-h-[46px] px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-[#0B2545] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full min-h-[46px] pl-4 pr-12 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-[#0B2545] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 min-h-[38px] min-w-[38px] flex items-center justify-center text-slate-500 hover:text-slate-800"
                  aria-label="Afficher ou masquer le mot de passe"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[48px] px-6 py-3 rounded-xl bg-[#0B2545] text-white font-bold text-sm hover:bg-[#134074] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Lock className="w-4 h-4 text-amber-400" />
              <span>{loading ? 'Vérification en cours...' : 'Se connecter à l’Espace Employé'}</span>
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-xs text-slate-500 text-center">
            En cas d’oubli de votre mot de passe, veuillez contacter la Direction des Ressources Humaines d’{settings.company_name}.
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // VIEW 2: FORCE PASSWORD CHANGE ON FIRST LOGIN
  // ==========================================================================
  if (!isDirectTokenMode && activeEmployee.must_change_password) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        <div className="max-w-md mx-auto bg-white rounded-2xl border border-amber-400 p-6 sm:p-10 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-xl bg-amber-400/20 text-[#0B2545] flex items-center justify-center shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-mono text-amber-700 font-semibold">
                Matricule {activeEmployee.matricule}
              </span>
              <h1 className="font-display font-bold text-xl text-[#0B2545]">
                Changement de mot de passe requis
              </h1>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 mb-6 leading-relaxed">
            Bienvenue <strong>{activeEmployee.nom_complet || `${activeEmployee.prenom} ${activeEmployee.nom}`}</strong>. Pour votre première connexion à l’<strong>Espace Employé</strong>, vous devez définir un nouveau mot de passe personnel (minimum 8 caractères) avant d’accéder à votre dossier et à votre contrat.
          </p>

          {error && (
            <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleFirstPasswordChange} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nouveau mot de passe personnel (min. 8 caractères) *
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nouveau mot de passe sécurisé"
                className="w-full min-h-[46px] px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-[#0B2545] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Confirmer le nouveau mot de passe *
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Répétez le nouveau mot de passe"
                className="w-full min-h-[46px] px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-[#0B2545] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[48px] px-6 py-3 rounded-xl bg-[#0B2545] text-white font-bold text-sm hover:bg-[#134074] transition-colors"
            >
              Valider et accéder à mon dossier employé
            </button>
          </form>

          <button
            type="button"
            onClick={onEmployeeLogout}
            className="mt-4 w-full min-h-[44px] text-xs font-medium text-slate-500 hover:text-slate-800"
          >
            Annuler et se déconnecter
          </button>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // VIEW 3: EMPLOYEE DOSSIER + EXACT VISUAL A4 CONTRACT VIEWER (READ-ONLY)
  // ==========================================================================
  const formattedSalaryWithCurrency = formatSalaryContract(
    activeEmployee.salaire,
    activeEmployee.devise
  );

  const hasCustomPdfData = Boolean(
    activeEmployee.has_custom_pdf &&
      activeEmployee.contrat_pdf_url &&
      activeEmployee.contrat_pdf_url.startsWith('data:application/pdf')
  );

  const isCDD = String(activeEmployee.type_contrat).toUpperCase().includes('CDD');
  const civilite = activeEmployee.civilite || 'Monsieur';
  const fullNameUpper = (
    activeEmployee.nom_complet || `${activeEmployee.prenom} ${activeEmployee.nom}`
  )
    .trim()
    .toUpperCase();
  const dateNaissance = formatDateFr(activeEmployee.date_naissance || '1984-08-24');
  const dateNaissanceLong = formatDateLongFr(activeEmployee.date_naissance || '1984-08-24');
  const nationalite = activeEmployee.nationalite || 'Canadienne';
  const dateEffet = formatDateFr(activeEmployee.date_effet || activeEmployee.date_embauche);
  const dateFinCdd = formatDateFr(activeEmployee.date_fin_cdd || '2027-09-28');
  const periodeEssai = activeEmployee.duree_periode_essai || '3 semaines';
  const lieuTravail = (activeEmployee.lieu_travail || 'SURREY, COLOMBIE-BRITANNIQUE').toUpperCase();
  const dateSignature = formatDateFr(activeEmployee.date_signature);
  const displayPhoto = activeEmployee.photo || activeEmployee.photo_url;
  const point2HebergementText = buildHebergementPoint2Text(activeEmployee);

  return (
    <div
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 protected-contract-viewer no-print-contract"
      onContextMenu={handleContextMenu}
    >
      {/* Top Bar of Employee Portal */}
      <div className="bg-[#0B2545] text-white rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-amber-400/30">
        <div className="space-y-1">
          <div className="text-xs font-mono text-amber-400">
            Espace Employé Sécurisé · Matricule {activeEmployee.matricule} · Statut Vérifié
          </div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-white">
            {civilite} {fullNameUpper}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            {activeEmployee.poste} · Contrat {isCDD ? 'CDD' : 'CDI'} · {settings.company_name}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {!isDirectTokenMode && (
            <button
              type="button"
              onClick={onEmployeeLogout}
              className="min-h-[44px] px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors whitespace-nowrap"
            >
              <LogOut className="w-4 h-4 text-amber-400" />
              <span>Déconnexion</span>
            </button>
          )}
          {onCloseModal && (
            <button
              type="button"
              onClick={onCloseModal}
              className="min-h-[44px] px-4 py-2.5 rounded-xl bg-amber-400 text-[#0B2545] text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <X className="w-4 h-4" />
              <span>Fermer</span>
            </button>
          )}
        </div>
      </div>

      {passwordChangeSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{passwordChangeSuccess}</span>
        </div>
      )}

      {securityNotice && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs sm:text-sm flex items-center gap-2.5">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
          <span>{securityNotice}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Employee Identity Card */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 space-y-6">
          <div className="flex flex-col items-center text-center">
            <div className="w-36 h-36 rounded-2xl overflow-hidden border-2 border-[#0B2545] shadow-sm bg-slate-100 mb-4">
              <img
                src={displayPhoto}
                alt={`Photo d'identité de ${fullNameUpper}`}
                referrerPolicy="no-referrer"
                draggable={false}
                className="w-full h-full object-cover pointer-events-none select-none"
              />
            </div>
            <span className="font-mono text-xs font-semibold text-slate-500">
              Matricule : {activeEmployee.matricule}
            </span>
            <h2 className="font-display font-bold text-xl text-[#0B2545] mt-0.5">
              {civilite} {fullNameUpper}
            </h2>
            <p className="text-xs text-slate-600 mt-1">{activeEmployee.poste}</p>
          </div>

          <dl className="space-y-3 text-sm pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
              <dt className="text-slate-500 text-xs">Matricule</dt>
              <dd className="font-mono tabular-nums font-bold text-[#0B2545]">
                {activeEmployee.matricule}
              </dd>
            </div>

            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
              <dt className="text-slate-500 text-xs">Civilité &amp; Nom complet</dt>
              <dd className="font-semibold text-blue-700 text-right">
                {civilite} {fullNameUpper}
              </dd>
            </div>

            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
              <dt className="text-slate-500 text-xs">Date de naissance</dt>
              <dd className="font-mono text-xs font-semibold text-slate-900">
                {dateNaissance} ({nationalite})
              </dd>
            </div>

            <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100">
              <dt className="text-slate-500 text-xs shrink-0">Poste occupé</dt>
              <dd className="font-semibold text-slate-900 text-right">
                {activeEmployee.poste}
              </dd>
            </div>

            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
              <dt className="text-slate-500 text-xs">Type de contrat</dt>
              <dd className="font-semibold text-[#134074] text-right">
                {isCDD ? `CDD (du ${dateEffet} au ${dateFinCdd})` : 'CDI (Durée indéterminée)'}
              </dd>
            </div>

            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
              <dt className="text-slate-500 text-xs">Salaire brut mensuel</dt>
              <dd className="font-mono tabular-nums font-bold text-[#0000AA]">
                {formattedSalaryWithCurrency}
              </dd>
            </div>

            <div className="flex items-center justify-between gap-2">
              <dt className="text-slate-500 text-xs">Date d’effet</dt>
              <dd className="font-mono tabular-nums font-semibold text-slate-900">
                {dateEffet}
              </dd>
            </div>
          </dl>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 space-y-1">
            <p className="font-semibold text-[#0B2545]">Dossier Individuel Certifié — NE: 799094917</p>
            <p>
              Rattaché au siège d’{settings.company_name} ({settings.address}).
            </p>
          </div>
        </div>

        {/* Right Column: Integrated Non-Downloadable A4 Contract Viewer */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {/* Viewer Toolbar (Zero Download Button for Employee!) */}
          <div className="bg-slate-900 text-white px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <FileText className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <h2 className="text-sm font-bold text-white">
                  Contrat de Travail ({isCDD ? 'à durée déterminée' : 'à durée indéterminée'}) — {activeEmployee.matricule}.pdf
                </h2>
                <p className="text-[11px] text-slate-400">
                  Consultation intégrée sécurisée · Téléchargement réservé à l’administration
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {hasCustomPdfData && (
                <div className="flex items-center bg-slate-800 rounded-lg p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setViewerMode('document')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                      viewerMode === 'document' ? 'bg-amber-400 text-[#0B2545]' : 'text-slate-300'
                    }`}
                  >
                    Aperçu A4 Officiel
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewerMode('pdf-native')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                      viewerMode === 'pdf-native' ? 'bg-amber-400 text-[#0B2545]' : 'text-slate-300'
                    }`}
                  >
                    Lecteur PDF
                  </button>
                </div>
              )}

              <div className="flex items-center gap-1 bg-slate-800 rounded-lg px-2 py-1">
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.max(85, z - 10))}
                  className="p-1 text-slate-300 hover:text-white"
                  aria-label="Réduire le zoom"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="font-mono tabular-nums text-xs px-1.5">{zoomLevel}%</span>
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.min(125, z + 10))}
                  className="p-1 text-slate-300 hover:text-white"
                  aria-label="Augmenter le zoom"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Protected A4 Contract Viewport */}
          <div
            className="bg-slate-800 p-3 sm:p-6 overflow-x-auto max-h-[820px] overflow-y-auto relative select-none"
            onContextMenu={handleContextMenu}
          >
            {viewerMode === 'pdf-native' && hasCustomPdfData ? (
              <div className="relative w-full h-[720px] bg-white rounded-xl overflow-hidden shadow-lg">
                <iframe
                  title={`Contrat PDF ${activeEmployee.matricule}`}
                  src={`${activeEmployee.contrat_pdf_url}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
                  className="w-full h-full border-0"
                />
                <div
                  className="absolute top-0 left-0 right-0 h-14 bg-transparent"
                  onContextMenu={handleContextMenu}
                />
              </div>
            ) : (
              /* EXACT A4 VISUAL REPRODUCTION OF THE 4-PAGE REFERENCE CONTRACT */
              <div
                style={{ fontSize: `${zoomLevel}%` }}
                className="max-w-[794px] mx-auto bg-white text-black shadow-2xl border border-slate-300 relative overflow-hidden"
              >
                {/* Rule 1: Quasi-invisible watermark "ATLANTICLAND TRANSPORT LTD" on white background */}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0 opacity-[0.03] flex flex-col justify-between py-2 px-2"
                >
                  {Array.from({ length: 44 }).map((_, idx) => (
                    <div
                      key={idx}
                      className="font-sans text-[10px] tracking-wider text-slate-900 whitespace-nowrap"
                    >
                      ATLANTICLAND TRANSPORT LTD &nbsp;&nbsp;&nbsp;&nbsp; ATLANTICLAND TRANSPORT LTD &nbsp;&nbsp;&nbsp;&nbsp; ATLANTICLAND TRANSPORT LTD &nbsp;&nbsp;&nbsp;&nbsp; ATLANTICLAND TRANSPORT LTD
                    </div>
                  ))}
                </div>

                {/* Main A4 Content Layer with strict 20mm horizontal margins (Rule 4) */}
                <div className="relative z-10 px-6 sm:px-[20mm] pt-6 pb-16 space-y-6 break-words">
                  {/* Rule 2: Top Header using ONLY logo-atlantic.png (left), logo-canada.png (right), and blason original.png */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 items-end gap-3 pb-3 border-b-2 border-black">
                    <div className="sm:col-span-4 flex flex-col items-start">
                      <img
                        src={CONTRACT_STATIC_ASSETS.logoAtlantic}
                        alt="Atlantic Transport Logo"
                        referrerPolicy="no-referrer"
                        className="h-14 w-auto object-contain mb-1"
                        draggable={false}
                      />
                      <div className="text-[11.5px] leading-snug font-serif text-[#2E7D32]">
                        <p>Atlantic Transport ltd.</p>
                        <p>King George Blvd, Surrey</p>
                        <p>BC V3T 2W1, Canada</p>
                        <p>Téléphone: +1 (506) 802-2226</p>
                        <p>Email : atlantictransport.int@ik.me</p>
                      </div>
                    </div>

                    <div className="sm:col-span-4 text-left sm:text-center pb-2">
                      <span className="font-sans font-bold text-xs sm:text-[12.5px] text-[#2E7D32]">
                        Numéro d&apos;entreprise (NE): 799094917
                      </span>
                    </div>

                    <div className="sm:col-span-4 flex flex-col items-start sm:items-end gap-1.5">
                      <img
                        src={CONTRACT_STATIC_ASSETS.logoCanada}
                        alt="Government of Canada"
                        referrerPolicy="no-referrer"
                        className="h-12 sm:h-14 w-auto object-contain"
                        draggable={false}
                      />
                      <img
                        src={CONTRACT_STATIC_ASSETS.blasonOriginal}
                        alt="Blason officiel"
                        referrerPolicy="no-referrer"
                        className="h-11 sm:h-12 w-auto object-contain"
                        draggable={false}
                      />
                    </div>
                  </div>

                  {/* Title Block + Top-Left QR Code ("Scanner for Status") */}
                  <div className="relative pt-1">
                    <div className="text-center space-y-1 flex flex-col items-center">
                      {scriptTitleUrl ? (
                        <img
                          src={scriptTitleUrl}
                          alt="Contrat de Travail"
                          className="h-14 sm:h-16 w-auto object-contain"
                          draggable={false}
                        />
                      ) : (
                        <h3 className="text-3xl sm:text-4xl font-bold italic text-[#002060]">
                          Contrat de Travail
                        </h3>
                      )}
                      <p className="font-sans font-bold text-sm sm:text-base text-[#3A2E21]">
                        {isCDD ? '(à durée déterminée)' : '(à durée indéterminée)'}
                      </p>
                    </div>

                    {/* Top-Left under title: QR Code + "Scanner for Status" */}
                    <div className="mt-3 sm:mt-0 sm:absolute sm:top-4 sm:left-0 flex flex-col items-center w-28">
                      {qrDataUrl && (
                        <img
                          src={qrDataUrl}
                          alt="QR Code Scanner for Status"
                          className="w-24 h-24 bg-white p-0.5"
                          draggable={false}
                        />
                      )}
                      <span className="font-sans font-bold text-[10px] text-black mt-1">
                        Scanner for Status
                      </span>
                    </div>
                  </div>

                  {/* Body Introduction: "Entre les soussignés :" with #0000AA & non-breaking spaces */}
                  <div className="pt-2 sm:pt-10 space-y-3 font-serif italic font-bold text-xs sm:text-[14px] leading-relaxed text-black">
                    <p
                      className="text-xl sm:text-2xl font-normal italic text-black"
                      style={{ fontFamily: '"Brush Script MT", Georgia, serif' }}
                    >
                      Entre les soussignés :
                    </p>
                    <p>
                      L&apos;entreprise : ATLANTIC TRANSPORT LTD dont le siège social est situé à King
                      George Blvd, Surrey, BC V3T 2W1, Canada. Immatriculée auprès du Registre de
                      commerce et des Sociétés sous le numéro 799094917 Et représentée par Monsieur:
                      <br />
                      <span className="not-italic font-normal text-[#0000AA] uppercase">
                        ANTOINE FORESTIN&nbsp;
                      </span>
                    </p>
                    <p className="pl-4 font-normal italic">
                      Agissant en qualité de DIRECTEUR GENERAL
                    </p>
                    <p
                      className="pl-2 text-lg sm:text-xl font-normal italic"
                      style={{ fontFamily: '"Brush Script MT", Georgia, serif' }}
                    >
                      D&apos;une part,
                    </p>
                    <p className="pl-4">Et</p>
                    <p>
                      {civilite}:&nbsp;
                      <span className="not-italic font-normal text-[#0000AA] uppercase">
                        {fullNameUpper}&nbsp;
                      </span>
                      demeurant&nbsp;: {activeEmployee.adresse}&nbsp;né(e) le {dateNaissanceLong}&nbsp;de
                      nationalité&nbsp;: {nationalite}&nbsp;, qui déclare expressément être libre de tout
                      engagement, ne pas être soumis(e) à une clause de non-concurrence et être en
                      mesure de conclure le présent contrat.
                    </p>
                    <p
                      className="pl-2 text-lg sm:text-xl font-normal italic"
                      style={{ fontFamily: '"Brush Script MT", Georgia, serif' }}
                    >
                      D&apos;autre part,
                    </p>
                    <p className="pl-4 pt-1">IL A ETE CONVENU CE QUI SUIT :</p>
                  </div>

                  {/* Articles I to IX */}
                  <div className="space-y-4 pt-2 font-serif italic font-bold text-xs sm:text-[14px] leading-relaxed text-black">
                    {[
                      {
                        num: 'I',
                        title: 'MOTIF (1)',
                        body: (
                          <>
                            {civilite}&nbsp;
                            <span className="not-italic font-normal text-[#0000AA] uppercase">
                              {fullNameUpper}&nbsp;
                            </span>
                            est engagé(e) par l&apos;entreprise en vue de servir la clientèle.
                          </>
                        )
                      },
                      {
                        num: 'II',
                        title: 'EMPLOI OCCUPE',
                        body: (
                          <>
                            {civilite}&nbsp;
                            <span className="not-italic font-normal text-[#0000AA] uppercase">
                              {fullNameUpper}&nbsp;
                            </span>
                            est employé(e) en qualité de {activeEmployee.poste}&nbsp;au sein de
                            l&apos;Entreprise Atlantic Transport.
                          </>
                        )
                      },
                      {
                        num: 'III',
                        title: 'DUREE',
                        body: isCDD ? (
                          <>
                            Le présent contrat est conclu pour une durée déterminée du&nbsp;
                            <span className="not-italic font-normal text-[#0000AA]">
                              {dateEffet} au {dateFinCdd}.&nbsp;
                            </span>
                            <br />
                            Il pourra y être mis fin par l&apos;une ou l&apos;autre des parties,
                            sous réserve de respecter les règles de procédure légales.
                          </>
                        ) : (
                          <>
                            Le présent contrat est conclu pour une durée indéterminée et prend effet
                            le&nbsp;
                            <span className="not-italic font-normal text-[#0000AA]">
                              {dateEffet}.&nbsp;
                            </span>
                            <br />
                            Il pourra y être mis fin par l&apos;une ou l&apos;autre des parties,
                            sous réserve de respecter les règles de procédure légales.
                          </>
                        )
                      },
                      {
                        num: 'IV',
                        title: "PERIODE D'ESSAI",
                        body: (
                          <>
                            Le contrat ne deviendra définitif qu&apos;à l&apos;issue d&apos;une
                            formation interne d&apos;essai de&nbsp;
                            <span className="font-normal text-[#0000AA]">{periodeEssai},&nbsp;</span>
                            au cours de laquelle chacune des parties pourra rompre le contrat sans
                            indemnité.
                          </>
                        )
                      },
                      {
                        num: 'V',
                        title: 'LIEU DE TRAVAIL',
                        body: <>Le lieu de travail est situé à {lieuTravail}&nbsp;</>
                      },
                      {
                        num: 'VI',
                        title: 'HORAIRE DE TRAVAIL',
                        body: (
                          <div className="space-y-1">
                            <p>Les horaires seront les suivants :</p>
                            <ul className="pl-8 space-y-1">
                              {[
                                'Le lundi de 08H à 17H',
                                'Le mardi de 08H à 17H',
                                'Le mercredi de 08H à 15 H',
                                'Le jeudi de 08H à 17 H',
                                'Le vendredi de 08 H à 14H'
                              ].map((line, i) => (
                                <li key={i} className="flex items-center gap-2">
                                  <span className="not-italic text-slate-600">🕒</span>
                                  <span>{line}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )
                      },
                      {
                        num: 'VII',
                        title: 'REMUNERATION',
                        body: (
                          <>
                            En contrepartie de ses fonctions, {civilite}&nbsp;
                            <span className="not-italic font-normal text-[#0000AA] uppercase">
                              {fullNameUpper}&nbsp;
                            </span>
                            percevra une rémunération brute mensuelle de&nbsp;
                            <span className="text-[#0000AA]">
                              {formattedSalaryWithCurrency}&nbsp;
                            </span>
                            pour un horaire hebdomadaire moyen de&nbsp;
                            <span className="text-[#0000AA]">40 heures.&nbsp;</span>Elle lui sera
                            versée à la fin de chaque mois.
                          </>
                        )
                      },
                      {
                        num: 'VIII',
                        title: 'RUPTURE POUR FAUTE GRAVE OU FORCE MAJEURE',
                        body: (
                          <>
                            Chacune des parties se réserve mutuellement le droit de mettre fin au
                            contrat immédiatement en cas de faute grave de l&apos;autre parties ou
                            cas de force majeure.
                          </>
                        )
                      },
                      {
                        num: 'IX',
                        title: 'INDEMNITE DE FIN DE CONTRAT',
                        body: (
                          <>
                            A la cessation de ses fonctions dans l&apos;entreprise, {civilite}&nbsp;
                            <span className="not-italic font-normal text-[#0000AA] uppercase">
                              {fullNameUpper}&nbsp;
                            </span>
                            percevra une indemnité de fin de contrat aux conditions et taux fixés
                            par le code du travail.
                          </>
                        )
                      }
                    ].map((art) => (
                      <div key={art.num}>
                        <h4 className="font-serif text-xs sm:text-[15px] text-black flex items-center gap-2">
                          {starIconUrl ? (
                            <img
                              src={starIconUrl}
                              alt=""
                              className="w-4 h-4 object-contain shrink-0"
                              draggable={false}
                            />
                          ) : (
                            <span className="text-blue-800">✦</span>
                          )}
                          <span>
                            <strong className="not-italic underline">ARTICLE {art.num}</strong> :{' '}
                            <span className="italic font-normal">{art.title}</span>
                          </span>
                        </h4>
                        <div className="mt-1 pl-2">{art.body}</div>
                      </div>
                    ))}
                  </div>

                  {/* Rule 7 & Rule 8: Centered Brown Underlined "Clause des obligations de l'employeur" (#8B4513) */}
                  <div className="pt-4 space-y-3 font-serif text-black">
                    <h4 className="font-serif not-italic font-bold text-base sm:text-lg text-[#8B4513] underline text-center">
                      Clause des obligations de l&apos;employeur
                    </h4>

                    <p className="italic font-bold text-xs sm:text-[14px] leading-relaxed">
                      L&apos;employeur s&apos;engage à fournir au salarié les moyens nécessaires à
                      l&apos;exécution de ses fonctions dans les conditions définies par le présent
                      contrat. À ce titre, l&apos;employeur assume les obligations suivantes :
                    </p>

                    {/* Rule 8: Titles in bold black size 12pt, explanatory paragraphs underneath in normal italic size 10pt */}
                    <div className="space-y-3.5 pt-1">
                      <div>
                        <p className="pl-2 font-bold not-italic text-[12pt] text-black">
                          1. Mise à disposition du poste de travail
                        </p>
                        <p className="pl-4 italic font-normal text-[10pt] leading-relaxed text-black mt-0.5">
                          L&apos;employeur garantit au salarié l&apos;accès aux outils, équipements
                          et ressources nécessaires à l&apos;exercice de ses fonctions.
                        </p>
                      </div>

                      <div>
                        <p className="pl-2 font-bold not-italic text-[12pt] text-black">
                          2. Conditions d&apos;hébergement
                        </p>
                        <p className="pl-4 italic font-normal text-[10pt] leading-relaxed text-black mt-0.5">
                          {point2HebergementText}
                        </p>
                      </div>

                      <div>
                        <p className="pl-2 font-bold not-italic text-[12pt] text-black">
                          3. Protection de la santé et de la sécurité
                        </p>
                        <p className="pl-4 italic font-normal text-[10pt] leading-relaxed text-black mt-0.5">
                          Conformément à l&apos;article L4121-1 du Code du travail, l&apos;employeur
                          met en œuvre les mesures nécessaires pour assurer la sécurité et protéger
                          la santé physique et mentale du salarié sur le lieu de travail.
                        </p>
                      </div>

                      <div>
                        <p className="pl-2 font-bold not-italic text-[12pt] text-black">
                          4. Respect des droits du salarié
                        </p>
                        <p className="pl-4 italic font-normal text-[10pt] leading-relaxed text-black mt-0.5">
                          L&apos;employeur s&apos;engage à respecter les droits fondamentaux du
                          salarié, notamment en matière de temps de travail, de repos, de
                          non-discrimination et de dignité au travail.
                        </p>
                      </div>

                      <div>
                        <p className="pl-2 font-bold not-italic text-[12pt] text-black">
                          5. Congés payés
                        </p>
                        <div className="pl-4 italic font-normal text-[10pt] leading-relaxed text-black mt-0.5 space-y-1">
                          <p>
                            Le salarié bénéficie de congés payés conformément aux dispositions
                            légales en vigueur.
                          </p>
                          <p>
                            Les dates de congés sont fixées en accord avec l&apos;employeur, dans le
                            respect des nécessités de service et du calendrier de l&apos;entreprise.
                          </p>
                          <p>
                            Durant ses congés, le salarié percevra une indemnité équivalente à sa
                            rémunération habituelle.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Rule 6: Page signature — "Canada, Le [DATE_JOUR]" on the right ABOVE, then signature.png and cachet.png offset below without masking the date */}
                  <div className="pt-6 space-y-3">
                    <div className="text-center font-serif italic font-bold text-sm sm:text-base text-black">
                      <span className="underline">Fait en double exemplaire,</span>
                    </div>

                    <div className="text-right font-serif text-xs sm:text-sm text-black pb-2">
                      Canada, Le {dateSignature}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-1 items-start">
                      <div>
                        <span className="font-serif font-bold text-sm sm:text-base text-black underline">
                          Le Salarié
                        </span>
                      </div>

                      <div className="flex flex-col items-end">
                        <div className="relative w-64 h-40">
                          <div className="absolute top-2 left-10 z-10 text-left">
                            <span className="font-serif font-bold text-sm sm:text-base text-black underline block leading-none">
                              L&apos;employeur
                            </span>
                            <span className="font-serif font-bold text-[10px] text-black block pl-8 mt-0.5">
                              Directeur
                            </span>
                          </div>
                          <img
                            src={CONTRACT_STATIC_ASSETS.cachet}
                            alt="Cachet officiel"
                            referrerPolicy="no-referrer"
                            className="absolute top-0 right-2 w-36 h-36 object-contain select-none pointer-events-none"
                            draggable={false}
                          />
                          <img
                            src={CONTRACT_STATIC_ASSETS.signature}
                            alt="Signature Directeur"
                            referrerPolicy="no-referrer"
                            className="absolute top-3 left-2 w-44 h-32 object-contain select-none pointer-events-none"
                            draggable={false}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom-Right logo-atlantic.png just above black footer bar */}
                  <div className="flex justify-end pt-2">
                    <img
                      src={CONTRACT_STATIC_ASSETS.logoAtlantic}
                      alt="Atlantic Transport"
                      referrerPolicy="no-referrer"
                      className="h-12 w-auto object-contain"
                      draggable={false}
                    />
                  </div>
                </div>

                {/* Rule 3: Fixed Black Footer Band with white centered text "King George Blvd, Surrey, Colombie-Britanique" */}
                <div className="relative bg-black text-white px-5 py-3 text-center">
                  <span className="font-serif font-bold text-xs sm:text-sm text-white">
                    King George Blvd, Surrey, Colombie-Britanique
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
