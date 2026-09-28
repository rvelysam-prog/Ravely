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
  findEmployeeByDirectTokenJS,
  updateEmployeePasswordJS,
  verifyAdminPasswordJS
} from '../services/staticStorage';

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

  // Direct link employee state (/employe.html?token=XXX)
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

  // Resolve employee directly in pure JS if accessed via /employe.html?token=XXX
  useEffect(() => {
    if (!directAccessToken) {
      setDirectEmployee(null);
      setDirectError('');
      return;
    }
    const result = findEmployeeByDirectTokenJS(directAccessToken);
    if (result.employee) {
      setDirectEmployee(result.employee);
      setDirectError('');
    } else {
      setDirectEmployee(null);
      setDirectError(result.error || 'Lien d’accès direct invalide ou révoqué.');
    }
  }, [directAccessToken]);

  // Block Ctrl+S, Ctrl+P, Ctrl+U and right-click when viewing employee portal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ['s', 'p', 'u'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        setSecurityNotice(
          'Action bloquée : Le téléchargement et l’impression du contrat de travail sont désactivés.'
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

  // Pure JS Login (Zero server fetch, zero "Erreur de connexion au serveur")
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // 1. Check if Admin credentials entered in Espace Employé
    if (verifyAdminPasswordJS(password, email)) {
      setLoading(false);
      onAdminAuthenticated('admin-js-session');
      return;
    }

    // 2. Authenticate Employee in pure JS against localStorage / employes.json
    const authResult = authenticateEmployeeJS(email, password);
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

  // Determine active employee (either via direct link /employe.html?token=XXX or via standard login)
  const activeEmployee = directEmployee || employee;
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
  // VIEW 2: FORCE PASSWORD CHANGE ON FIRST LOGIN (ONLY WHEN LOGGED IN VIA PASSWORD)
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
            Bienvenue <strong>{activeEmployee.prenom} {activeEmployee.nom}</strong>. Pour votre première connexion à l’<strong>Espace Employé</strong>, vous devez définir un nouveau mot de passe personnel (minimum 8 caractères) avant d’accéder à votre dossier et à votre contrat.
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
  // VIEW 3: AUTHENTICATED OR DIRECT-LINK EMPLOYEE DOSSIER + PROTECTED PDF VIEWER
  // ==========================================================================
  const formattedSalary = new Intl.NumberFormat('fr-CA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(activeEmployee.salaire);

  const hasCustomPdfData = Boolean(
    activeEmployee.has_custom_pdf &&
      activeEmployee.contrat_pdf_url &&
      activeEmployee.contrat_pdf_url.startsWith('data:application/pdf')
  );

  return (
    <div
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 protected-contract-viewer no-print-contract"
      onContextMenu={handleContextMenu}
    >
      {/* Top Bar of Employee Portal */}
      <div className="bg-[#0B2545] text-white rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-amber-400/30">
        <div className="space-y-1">
          <div className="text-xs font-mono text-amber-400">
            Espace Employé Sécurisé · Matricule {activeEmployee.matricule}
          </div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-white">
            {activeEmployee.prenom} {activeEmployee.nom}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            {activeEmployee.poste} · {settings.company_name}
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
        {/* Left Column: Employee Identity Card (Photo, Matricule, Nom, Poste, Contrat, Salaire, Date d'embauche) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 space-y-6">
          <div className="flex flex-col items-center text-center">
            <div className="w-36 h-36 rounded-2xl overflow-hidden border-2 border-[#0B2545] shadow-sm bg-slate-100 mb-4">
              <img
                src={activeEmployee.photo_url}
                alt={`Photo d'identité de ${activeEmployee.prenom} ${activeEmployee.nom}`}
                referrerPolicy="no-referrer"
                draggable={false}
                className="w-full h-full object-cover pointer-events-none select-none"
              />
            </div>
            <span className="font-mono text-xs font-semibold text-slate-500">
              Matricule : {activeEmployee.matricule}
            </span>
            <h2 className="font-display font-bold text-xl text-[#0B2545] mt-0.5">
              {activeEmployee.prenom} {activeEmployee.nom}
            </h2>
            <p className="text-xs text-slate-600 mt-1">{activeEmployee.poste}</p>
          </div>

          <dl className="space-y-3.5 text-sm pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <dt className="text-slate-500 text-xs">Matricule</dt>
              <dd className="font-mono tabular-nums font-bold text-[#0B2545]">
                {activeEmployee.matricule}
              </dd>
            </div>

            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <dt className="text-slate-500 text-xs">Nom complet</dt>
              <dd className="font-semibold text-slate-900 text-right">
                {activeEmployee.prenom} {activeEmployee.nom}
              </dd>
            </div>

            <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
              <dt className="text-slate-500 text-xs shrink-0">Poste</dt>
              <dd className="font-semibold text-slate-900 text-right">
                {activeEmployee.poste}
              </dd>
            </div>

            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <dt className="text-slate-500 text-xs">Type de contrat</dt>
              <dd className="font-semibold text-[#134074] text-right">
                {activeEmployee.type_contrat}
              </dd>
            </div>

            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <dt className="text-slate-500 text-xs">Salaire mensuel</dt>
              <dd className="font-mono tabular-nums font-bold text-emerald-700">
                {formattedSalary} {activeEmployee.devise}
              </dd>
            </div>

            <div className="flex items-center justify-between gap-2">
              <dt className="text-slate-500 text-xs">Date d’embauche</dt>
              <dd className="font-mono tabular-nums font-semibold text-slate-900">
                {activeEmployee.date_embauche}
              </dd>
            </div>
          </dl>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 space-y-1">
            <p className="font-semibold text-[#0B2545]">Dossier Individuel Certifié</p>
            <p>
              Rattaché au siège d’{settings.company_name} ({settings.address}).
            </p>
          </div>
        </div>

        {/* Right Column: Integrated Non-Downloadable PDF Contract Viewer */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {/* Viewer Toolbar (No Download / No Print buttons!) */}
          <div className="bg-slate-900 text-white px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <FileText className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <h2 className="text-sm font-bold text-white">
                  Contrat de Travail PDF — {activeEmployee.matricule}.pdf
                </h2>
                <p className="text-[11px] text-slate-400">
                  Consultation intégrée sécurisée · Clic droit, impression et téléchargement désactivés
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
                    Lecteur Mobile/HD
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewerMode('pdf-native')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                      viewerMode === 'pdf-native' ? 'bg-amber-400 text-[#0B2545]' : 'text-slate-300'
                    }`}
                  >
                    PDF Original
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

          {/* Protected Viewport */}
          <div
            className="bg-slate-800 p-3 sm:p-6 overflow-x-auto max-h-[760px] overflow-y-auto relative select-none"
            onContextMenu={handleContextMenu}
          >
            {viewerMode === 'pdf-native' && hasCustomPdfData ? (
              <div className="relative w-full h-[660px] bg-white rounded-xl overflow-hidden shadow-lg">
                <iframe
                  title={`Contrat PDF ${activeEmployee.matricule}`}
                  src={`${activeEmployee.contrat_pdf_url}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
                  className="w-full h-full border-0"
                />
                {/* Protective anti-right-click overlay along top bar of native PDF plugin */}
                <div
                  className="absolute top-0 left-0 right-0 h-12 bg-transparent"
                  onContextMenu={handleContextMenu}
                />
              </div>
            ) : (
              <div
                style={{ fontSize: `${zoomLevel}%` }}
                className="max-w-2xl mx-auto bg-white text-slate-900 rounded-lg shadow-xl border border-slate-300 p-6 sm:p-10 space-y-6 relative overflow-hidden"
              >
                {/* Official Letterhead */}
                <div className="border-b-2 border-[#0B2545] pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <BrandLogo
                      customLogoUrl={settings.logo_url}
                      companyName={settings.company_name}
                      size="footer"
                    />
                    <div>
                      <h3 className="font-display font-extrabold text-base sm:text-lg text-[#0B2545]">
                        {settings.company_name}
                      </h3>
                      <p className="text-xs text-slate-600">{settings.address}</p>
                      <p className="text-xs font-mono text-slate-500">
                        Tél: {settings.phone} · {settings.email}
                      </p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right font-mono text-xs">
                    <span className="block font-bold text-[#0B2545]">RÉF : {activeEmployee.matricule}</span>
                    <span className="block text-slate-500">CONFIDENTIEL — LECTURE SEULE</span>
                  </div>
                </div>

                {/* Contract Title */}
                <div className="text-center py-3 bg-slate-50 rounded-xl border border-slate-200">
                  <h4 className="font-display font-bold text-base sm:text-lg text-[#0B2545] uppercase tracking-wide">
                    Contrat de Travail Individuel — {activeEmployee.type_contrat}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Régime juridique : Province de la Colombie-Britannique, Canada
                  </p>
                </div>

                {/* Parties */}
                <div className="space-y-4 text-xs sm:text-sm leading-relaxed text-slate-700">
                  <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-2">
                    <p className="font-bold text-[#0B2545]">ENTRE LES SOUSSIGNÉS :</p>
                    <p>
                      <strong>L’EMPLOYEUR :</strong> La société <strong>{settings.company_name}</strong>, ayant son siège d’exploitation situé à <strong>{settings.address}</strong>, représentée par sa Direction des Ressources Humaines, d’une part ;
                    </p>
                    <p>
                      <strong>ET LE SALARIÉ :</strong> <strong>{activeEmployee.prenom} {activeEmployee.nom}</strong>, immatriculé(e) sous le numéro <strong>{activeEmployee.matricule}</strong>, joignable à l’adresse électronique <strong>{activeEmployee.email}</strong>, d’autre part.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h5 className="font-bold text-[#0B2545]">
                      ARTICLE 1 — ENGAGEMENT, POSTE ET AFFECTATION
                    </h5>
                    <p>
                      À compter du <strong className="font-mono">{activeEmployee.date_embauche}</strong>,{' '}
                      <strong>{settings.company_name}</strong> engage{' '}
                      <strong>{activeEmployee.prenom} {activeEmployee.nom}</strong> en qualité de{' '}
                      <strong>{activeEmployee.poste}</strong> au sein du département{' '}
                      <strong>{activeEmployee.departement || 'Opérations Logistiques'}</strong>, dans le cadre d’un contrat de type <strong>{activeEmployee.type_contrat}</strong>.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h5 className="font-bold text-[#0B2545]">
                      ARTICLE 2 — RÉMUNÉRATION MENSUELLE
                    </h5>
                    <p>
                      En contrepartie de l’accomplissement de ses fonctions, le Salarié percevra une rémunération mensuelle brute fixée à{' '}
                      <strong className="font-mono text-[#0B2545]">
                        {formattedSalary} {activeEmployee.devise}
                      </strong>
                      , versée par virement bancaire selon les échéances habituelles de l’entreprise.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h5 className="font-bold text-[#0B2545]">
                      ARTICLE 3 — OBLIGATIONS PROFESSIONNELLES &amp; SECRET DES OPÉRATIONS
                    </h5>
                    <p>
                      Le Salarié s’engage à observer scrupuleusement les procédures opérationnelles, douanières et de sécurité d’<strong>{settings.company_name}</strong>. Toutes les données relatives aux expéditions, manifestes de fret, tarifs et clients demeurent strictement confidentielles.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h5 className="font-bold text-[#0B2545]">
                      ARTICLE 4 — CONSULTATION NUMÉRIQUE SÉCURISÉE
                    </h5>
                    <p>
                      Le présent contrat est mis à disposition du Salarié au sein de son Espace Employé personnel avec protection numérique contre la copie et le téléchargement non autorisés.
                    </p>
                  </div>
                </div>

                {/* Signatures */}
                <div className="pt-6 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                    <span className="font-bold text-[#0B2545] block">POUR L’EMPLOYEUR</span>
                    <span className="text-slate-600 block">{settings.company_name}</span>
                    <span className="text-slate-500 block">King George Blvd, Surrey, BC V3T 2W1</span>
                    <div className="pt-2 font-mono text-[11px] text-emerald-700 font-semibold">
                      [Signé et certifié numériquement — Direction RH]
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                    <span className="font-bold text-[#0B2545] block">LE SALARIÉ</span>
                    <span className="text-slate-600 block">
                      {activeEmployee.prenom} {activeEmployee.nom} ({activeEmployee.matricule})
                    </span>
                    <span className="text-slate-500 block">Date d’effet : {activeEmployee.date_embauche}</span>
                    <div className="pt-2 font-mono text-[11px] text-[#134074] font-semibold">
                      [Dossier actif vérifié — Espace Employé]
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
