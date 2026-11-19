import React, { useState } from 'react';
import {
  UserPlus,
  ShieldCheck,
  LogOut,
  Building2,
  User,
  X
} from 'lucide-react';
import { Employee, SiteSettings } from '../../types';
import {
  fetchEmployeesFromFirestore,
  generateUniqueMatriculeInFirestore,
  getNextMatricule,
  getEmployees,
  writeEmployeeToFirestore
} from '../../services/staticStorage';
import { AdminAuthSession } from '../../services/multisiteService';
import { BrandLogo } from '../BrandLogo';
import { ActionButton, StatusNotice, SurfaceCard } from '../ui/DesignSystem';

interface SecretaireAdminBackofficeProps {
  settings: SiteSettings;
  session: AdminAuthSession;
  onLogout: () => void;
  onBackToSite: () => void;
  onSwitchToRhBackoffice?: () => void;
}

export const SecretaireAdminBackoffice: React.FC<SecretaireAdminBackofficeProps> = ({
  settings,
  session,
  onLogout,
  onBackToSite,
  onSwitchToRhBackoffice
}) => {
  const [employees, setEmployees] = useState<Employee[]>(() => getEmployees());
  const [nextMatricule, setNextMatricule] = useState<string>(() => getNextMatricule(employees));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  // Formulaire strict Secrétariat : Identité uniquement
  // Sont exclus : choix de poste/département, contrat automatique, promesse d'embauche, salaires, conditions hébergement
  const [identityForm, setIdentityForm] = useState({
    civilite: 'Monsieur' as 'Monsieur' | 'Madame',
    nom_complet: '',
    prenom: '',
    nom: '',
    date_naissance: '',
    sexe: 'Masculin' as 'Masculin' | 'Féminin',
    nationalite: 'Canadienne',
    numero_piece_identite: '',
    telephone: '',
    email: '',
    adresse: '',
    contact_urgence: ''
  });

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg(null), 4500);
  };

  const handleOpenAddModal = async () => {
    try {
      const uniqueMat = await generateUniqueMatriculeInFirestore(undefined, employees);
      setNextMatricule(uniqueMat);
    } catch {
      setNextMatricule(getNextMatricule(employees));
    }
    setIdentityForm({
      civilite: 'Monsieur',
      nom_complet: '',
      prenom: '',
      nom: '',
      date_naissance: '',
      sexe: 'Masculin',
      nationalite: 'Canadienne',
      numero_piece_identite: '',
      telephone: '',
      email: '',
      adresse: '',
      contact_urgence: ''
    });
    setIsModalOpen(true);
  };

  const handleSubmitIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg(null);

    const prenom = identityForm.prenom.trim();
    const nom = identityForm.nom.trim();
    const nomComplet = (identityForm.nom_complet.trim() || `${prenom} ${nom}`).toUpperCase();

    if (!nomComplet || !identityForm.email.trim()) {
      showToast('Veuillez renseigner le nom complet et l’adresse email du salarié.', 'error');
      setSaving(false);
      return;
    }

    try {
      const now = new Date().toISOString();
      const newEmployeeRecord: Employee = {
        id: Date.now(),
        matricule: nextMatricule,
        civilite: identityForm.civilite,
        nom_complet: nomComplet,
        prenom: prenom || nomComplet.split(' ')[0] || 'Salarié',
        nom: nom || nomComplet.split(' ').slice(1).join(' ') || 'Atlantic',
        email: identityForm.email.trim().toLowerCase(),
        password: 'Employe@2026!',
        telephone: identityForm.telephone.trim(),
        adresse: identityForm.adresse.trim(),
        date_naissance: identityForm.date_naissance || '1990-01-01',
        nationalite: identityForm.nationalite.trim() || 'Canadienne',
        // Données d'attente RH par défaut sans choix ni génération automatique
        poste: 'En attente d’attribution RH',
        departement: 'En attente d’attribution RH',
        type_contrat: 'En cours de validation RH',
        date_effet: now.slice(0, 10),
        date_embauche: now.slice(0, 10),
        duree_periode_essai: 'Non définie',
        lieu_travail: 'Surrey, BC, Canada',
        horaires: 'Standard',
        salaire: 0,
        devise: 'CAD',
        hebergement_fourni: false,
        sexe: identityForm.sexe,
        numero_piece_identite: identityForm.numero_piece_identite.trim(),
        contact_urgence: identityForm.contact_urgence.trim(),
        photo: '',
        photo_url: '',
        contrat_pdf_url: '',
        has_custom_pdf: false,
        must_change_password: true,
        is_active: true,
        created_at: now,
        updated_at: now
      };

      await writeEmployeeToFirestore(newEmployeeRecord, false);
      const fresh = await fetchEmployeesFromFirestore();
      setEmployees(fresh);
      setIsModalOpen(false);
      showToast(
        `Fiche d'identité créée avec succès pour ${nomComplet} (${nextMatricule}). Transmise au RH pour affectation de poste.`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de l’enregistrement.';
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-canvas flex flex-col">
      {/* Top Header Secrétariat */}
      <header className="bg-brand-navy-deep text-white border-b border-white/10 sticky top-0 z-30 shadow-md">
        <div className="ds-container min-h-[72px] py-2 sm:py-0 flex flex-wrap items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            <BrandLogo size="header" companyName={settings.company_name} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-sm sm:text-base text-white tracking-wide truncate max-w-[160px] sm:max-w-none">
                  {settings.company_name}
                </span>
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-brand-gold">
                  · Secrétariat
                </span>
              </div>
              <p className="text-xs text-slate-300 hidden sm:block">
                Espace de gestion administrative des identités salariés
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-semibold text-white">{session.username}</span>
              <span className="text-[11px] text-brand-gold font-mono">
                {session.role === 'super_admin_rh'
                  ? 'Super Admin (Vue Secrétariat)'
                  : 'Accès Limité Secrétariat'}
              </span>
            </div>

            {session.role === 'super_admin_rh' && onSwitchToRhBackoffice && (
              <ActionButton
                variant="primary"
                onClick={onSwitchToRhBackoffice}
                className="text-xs px-3.5"
                title="Basculer vers le Backoffice RH complet"
              >
                <Building2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Retour Espace RH</span>
              </ActionButton>
            )}

            <button
              type="button"
              onClick={onBackToSite}
              className="ds-btn-base bg-white/10 hover:bg-white/20 text-white text-xs px-3.5"
            >
              Voir le Site
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="ds-btn-base bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3.5"
            >
              <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Déconnexion</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="ds-container py-8 flex-1 space-y-6">
        {statusMsg && <StatusNotice variant={statusMsg.type}>{statusMsg.text}</StatusNotice>}

        {/* Bannière de cadrage des compétences Secrétariat */}
        <SurfaceCard className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-brand-blue" aria-hidden="true" />
              <h1 className="font-bold text-lg text-ink-primary">
                Portail Administratif Secrétariat
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-ink-secondary max-w-[68ch]">
              Votre mission : Saisie des données d&apos;identité des salariés. Les attributions de
              postes, contrats et documents officiels sont gérés exclusivement par la Direction RH.
            </p>
          </div>

          <ActionButton variant="navy" onClick={handleOpenAddModal}>
            <UserPlus className="w-4 h-4 text-brand-amber" aria-hidden="true" />
            <span>Nouveau Salarié (Saisie Identité)</span>
          </ActionButton>
        </SurfaceCard>

        {/* Liste des salariés saisis (Vue restreinte : identité uniquement, sans salaires ni contrats) */}
        <SurfaceCard padded={false} className="overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-surface-border flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-ink-muted" aria-hidden="true" />
              <h2 className="font-bold text-sm text-ink-primary tabular-nums">
                Salariés Enregistrés ({employees.length})
              </h2>
            </div>
            <span className="text-xs text-ink-secondary font-mono">
              Données protégées · Lecture restreinte
            </span>
          </div>

          {/* Cartes mobiles */}
          <div className="md:hidden divide-y divide-surface-border">
            {employees.map((emp) => {
              const isWaiting = emp.poste === 'En attente d’attribution RH';
              return (
                <div key={emp.id} className="p-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono tabular-nums font-bold text-brand-navy">
                      {emp.matricule}
                    </span>
                    <span
                      className={`font-semibold ${
                        isWaiting ? 'text-brand-blue' : 'text-status-success'
                      }`}
                    >
                      {isWaiting ? 'Transmis au RH' : 'Pris en charge RH'}
                    </span>
                  </div>
                  <div className="font-bold text-sm text-ink-primary">
                    {emp.civilite} {emp.nom_complet}
                  </div>
                  <div className="font-mono text-ink-secondary break-all">{emp.email}</div>
                  <div className="text-ink-secondary tabular-nums">
                    {emp.telephone || '—'} · {emp.nationalite || 'Canadienne'}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tableau desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-surface-subtle border-b border-surface-border text-ink-secondary font-semibold">
                  <th className="py-3 px-4">Matricule</th>
                  <th className="py-3 px-4">Civilité &amp; Nom complet</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Téléphone</th>
                  <th className="py-3 px-4">Nationalité</th>
                  <th className="py-3 px-4">Statut RH</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border text-ink-primary">
                {employees.map((emp) => {
                  const isWaiting = emp.poste === 'En attente d’attribution RH';
                  return (
                    <tr key={emp.id} className="hover:bg-surface-subtle/70 transition-colors">
                      <td className="py-3 px-4 font-mono tabular-nums font-bold text-brand-navy">
                        {emp.matricule}
                      </td>
                      <td className="py-3 px-4 font-semibold text-ink-primary">
                        {emp.civilite} {emp.nom_complet}
                      </td>
                      <td className="py-3 px-4 font-mono text-ink-secondary">{emp.email}</td>
                      <td className="py-3 px-4 font-mono tabular-nums text-ink-secondary">
                        {emp.telephone || '—'}
                      </td>
                      <td className="py-3 px-4">{emp.nationalite || 'Canadienne'}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-semibold ${
                            isWaiting ? 'text-brand-blue' : 'text-status-success'
                          }`}
                        >
                          {isWaiting ? 'Transmis au RH' : 'Pris en charge RH'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SurfaceCard>
      </main>

      {/* Modal Saisie Salarié STRICT SECRÉTARIAT */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="sec-add-employee-title"
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        >
          <div className="bg-white rounded-2xl border border-surface-border max-w-2xl w-full p-6 shadow-2xl my-8 max-h-[92vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-surface-border gap-3">
              <div>
                <h3
                  id="sec-add-employee-title"
                  className="font-bold text-base text-brand-navy flex items-center gap-2"
                >
                  <UserPlus className="w-5 h-5 text-brand-amber" aria-hidden="true" />
                  <span>Enregistrer l&apos;identité d&apos;un salarié ({nextMatricule})</span>
                </h3>
                <p className="text-xs text-ink-secondary mt-0.5">
                  Formulaire réservé au Secrétariat · Les paramètres contractuels seront complétés
                  par le RH.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                aria-label="Fermer le formulaire"
                className="min-h-[44px] min-w-[44px] rounded-xl text-ink-secondary hover:text-ink-primary hover:bg-surface-subtle flex items-center justify-center cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSubmitIdentity} className="space-y-4">
              {/* Row 1: Civilité & Nom */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-3">
                  <label
                    htmlFor="sec-civilite"
                    className="block text-xs font-semibold text-ink-primary mb-1"
                  >
                    Civilité *
                  </label>
                  <select
                    id="sec-civilite"
                    value={identityForm.civilite}
                    onChange={(e) =>
                      setIdentityForm({
                        ...identityForm,
                        civilite: e.target.value as 'Monsieur' | 'Madame'
                      })
                    }
                    className="ds-input text-xs sm:text-sm font-medium cursor-pointer"
                  >
                    <option value="Monsieur">Monsieur</option>
                    <option value="Madame">Madame</option>
                  </select>
                </div>

                <div className="sm:col-span-4">
                  <label
                    htmlFor="sec-prenom"
                    className="block text-xs font-semibold text-ink-primary mb-1"
                  >
                    Prénom *
                  </label>
                  <input
                    id="sec-prenom"
                    type="text"
                    required
                    value={identityForm.prenom}
                    onChange={(e) => {
                      const p = e.target.value;
                      setIdentityForm({
                        ...identityForm,
                        prenom: p,
                        nom_complet: `${p} ${identityForm.nom}`.trim().toUpperCase()
                      });
                    }}
                    placeholder="Ex: Jean-Pierre"
                    className="ds-input text-xs sm:text-sm"
                  />
                </div>

                <div className="sm:col-span-5">
                  <label
                    htmlFor="sec-nom"
                    className="block text-xs font-semibold text-ink-primary mb-1"
                  >
                    Nom de famille *
                  </label>
                  <input
                    id="sec-nom"
                    type="text"
                    required
                    value={identityForm.nom}
                    onChange={(e) => {
                      const n = e.target.value;
                      setIdentityForm({
                        ...identityForm,
                        nom: n,
                        nom_complet: `${identityForm.prenom} ${n}`.trim().toUpperCase()
                      });
                    }}
                    placeholder="Ex: KAMGA"
                    className="ds-input text-xs sm:text-sm"
                  />
                </div>
              </div>

              {/* Row 2: Date de naissance + Sexe + Nationalité */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label
                    htmlFor="sec-dob"
                    className="block text-xs font-semibold text-ink-primary mb-1"
                  >
                    Date de naissance *
                  </label>
                  <input
                    id="sec-dob"
                    type="date"
                    required
                    value={identityForm.date_naissance}
                    onChange={(e) =>
                      setIdentityForm({ ...identityForm, date_naissance: e.target.value })
                    }
                    className="ds-input text-xs sm:text-sm font-mono"
                  />
                </div>

                <div>
                  <label
                    htmlFor="sec-sexe"
                    className="block text-xs font-semibold text-ink-primary mb-1"
                  >
                    Genre / Sexe
                  </label>
                  <select
                    id="sec-sexe"
                    value={identityForm.sexe}
                    onChange={(e) =>
                      setIdentityForm({
                        ...identityForm,
                        sexe: e.target.value as 'Masculin' | 'Féminin'
                      })
                    }
                    className="ds-input text-xs sm:text-sm font-medium cursor-pointer"
                  >
                    <option value="Masculin">Masculin</option>
                    <option value="Féminin">Féminin</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="sec-nationalite"
                    className="block text-xs font-semibold text-ink-primary mb-1"
                  >
                    Nationalité *
                  </label>
                  <input
                    id="sec-nationalite"
                    type="text"
                    required
                    value={identityForm.nationalite}
                    onChange={(e) =>
                      setIdentityForm({ ...identityForm, nationalite: e.target.value })
                    }
                    placeholder="Ex: Canadienne, Française..."
                    className="ds-input text-xs sm:text-sm"
                  />
                </div>
              </div>

              {/* Row 3: Pièce d'identité + Téléphone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="sec-id-doc"
                    className="block text-xs font-semibold text-ink-primary mb-1"
                  >
                    N° Pièce d’identité (Passeport / Permis / NAS)
                  </label>
                  <input
                    id="sec-id-doc"
                    type="text"
                    value={identityForm.numero_piece_identite}
                    onChange={(e) =>
                      setIdentityForm({ ...identityForm, numero_piece_identite: e.target.value })
                    }
                    placeholder="Ex: C01294857"
                    className="ds-input text-xs sm:text-sm font-mono uppercase"
                  />
                </div>

                <div>
                  <label
                    htmlFor="sec-phone"
                    className="block text-xs font-semibold text-ink-primary mb-1"
                  >
                    Téléphone personnel *
                  </label>
                  <input
                    id="sec-phone"
                    type="tel"
                    required
                    value={identityForm.telephone}
                    onChange={(e) =>
                      setIdentityForm({ ...identityForm, telephone: e.target.value })
                    }
                    placeholder="Ex: +1 (604) 555-0194"
                    className="ds-input text-xs sm:text-sm font-mono"
                  />
                </div>
              </div>

              {/* Row 4: Email + Contact d'urgence */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="sec-email"
                    className="block text-xs font-semibold text-ink-primary mb-1"
                  >
                    Adresse email du salarié *
                  </label>
                  <input
                    id="sec-email"
                    type="email"
                    required
                    value={identityForm.email}
                    onChange={(e) =>
                      setIdentityForm({ ...identityForm, email: e.target.value })
                    }
                    placeholder="salarie@example.com"
                    className="ds-input text-xs sm:text-sm font-mono"
                  />
                </div>

                <div>
                  <label
                    htmlFor="sec-urgence"
                    className="block text-xs font-semibold text-ink-primary mb-1"
                  >
                    Contact d’urgence (Nom &amp; Tél)
                  </label>
                  <input
                    id="sec-urgence"
                    type="text"
                    value={identityForm.contact_urgence}
                    onChange={(e) =>
                      setIdentityForm({ ...identityForm, contact_urgence: e.target.value })
                    }
                    placeholder="Ex: Marie Kamga (+1 604 555-0199)"
                    className="ds-input text-xs sm:text-sm"
                  />
                </div>
              </div>

              {/* Row 5: Adresse complète de résidence */}
              <div>
                <label
                  htmlFor="sec-adresse"
                  className="block text-xs font-semibold text-ink-primary mb-1"
                >
                  Adresse complète de résidence *
                </label>
                <input
                  id="sec-adresse"
                  type="text"
                  required
                  value={identityForm.adresse}
                  onChange={(e) =>
                    setIdentityForm({ ...identityForm, adresse: e.target.value })
                  }
                  placeholder="Numéro, Rue, Ville, Province/Région, Code postal"
                  className="ds-input text-xs sm:text-sm"
                />
              </div>

              <div className="pt-4 border-t border-surface-border flex items-center justify-end gap-3">
                <ActionButton
                  variant="secondary"
                  onClick={() => setIsModalOpen(false)}
                  className="text-xs sm:text-sm"
                >
                  Annuler
                </ActionButton>
                <ActionButton
                  type="submit"
                  variant="navy"
                  disabled={saving}
                  className="text-xs sm:text-sm"
                >
                  {saving ? 'Enregistrement...' : 'Enregistrer le salarié'}
                </ActionButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
