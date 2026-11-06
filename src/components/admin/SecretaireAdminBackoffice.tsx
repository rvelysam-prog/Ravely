import React, { useState } from 'react';
import {
  UserPlus,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Lock,
  LogOut,
  Building2,
  FileText,
  User,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Globe,
  Briefcase
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
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
      showToast(`Fiche d'identité créée avec succès pour ${nomComplet} (${nextMatricule}). Transmise au RH pour affectation de poste.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de l’enregistrement.';
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col">
      {/* Top Header Secrétariat */}
      <header className="bg-[#0B1220] text-white border-b border-white/10 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <BrandLogo size="header" companyName={settings.company_name} />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-white tracking-wide">
                  {settings.company_name}
                </span>
                <span className="bg-amber-400 text-slate-950 font-bold text-[10px] uppercase px-2 py-0.5 rounded-full">
                  Secrétariat
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Espace de gestion administrative des identités salariés
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-semibold text-white">{session.username}</span>
              <span className="text-[10px] text-amber-400 font-mono">
                {session.role === 'super_admin_rh' ? 'Super Admin (Vue Secrétariat)' : 'Accès Limité Secrétariat'}
              </span>
            </div>

            {session.role === 'super_admin_rh' && onSwitchToRhBackoffice && (
              <button
                type="button"
                onClick={onSwitchToRhBackoffice}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Basculer vers le Backoffice RH complet"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Retour Espace RH</span>
              </button>
            )}

            <button
              type="button"
              onClick={onBackToSite}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              Voir le Site
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition-colors flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Déconnexion</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">
        {/* Toast feedback */}
        {statusMsg && (
          <div
            className={`p-4 rounded-2xl border text-sm flex items-center gap-3 shadow-sm ${
              statusMsg.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            )}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Bannière de cadrage des compétences Secrétariat */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-700" />
              <h1 className="font-bold text-lg text-slate-900">
                Portail Administratif Secrétariat
              </h1>
            </div>
            <p className="text-xs text-slate-600">
              Votre mission : Saisie des données d'identité des salariés. Les attributions de postes, contrats et documents officiels sont gérés exclusivement par la Direction RH.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#0B2545] hover:bg-[#134074] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-colors whitespace-nowrap cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-amber-400" />
            <span>Nouveau Salarié (Saisie Identité)</span>
          </button>
        </div>

        {/* Liste des salariés saisis (Vue restreinte : identité uniquement, sans salaires ni contrats) */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-slate-500" />
              <h2 className="font-bold text-sm text-slate-800">
                Salariés Enregistrés ({employees.length})
              </h2>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              Données protégées · Lecture restreinte
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-3 px-4">Matricule</th>
                  <th className="py-3 px-4">Civilité &amp; Nom complet</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Téléphone</th>
                  <th className="py-3 px-4">Nationalité</th>
                  <th className="py-3 px-4">Statut RH</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#0B2545]">
                      {emp.matricule}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {emp.civilite} {emp.nom_complet}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {emp.email}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {emp.telephone || '—'}
                    </td>
                    <td className="py-3 px-4">
                      {emp.nationalite || 'Canadienne'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        {emp.poste === 'En attente d’attribution RH' ? 'Transmis au RH' : 'Pris en charge RH'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal Saisie Salarié STRICT SECRÉTARIAT */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full p-6 shadow-2xl my-8 max-h-[92vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="font-bold text-base text-[#0B2545] flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-amber-500" />
                  <span>Enregistrer l'identité d'un salarié ({nextMatricule})</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Formulaire réservé au Secrétariat · Les paramètres contractuels seront complétés par le RH.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitIdentity} className="space-y-4">
              {/* Row 1: Civilité & Nom */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Civilité *
                  </label>
                  <select
                    value={identityForm.civilite}
                    onChange={(e) =>
                      setIdentityForm({
                        ...identityForm,
                        civilite: e.target.value as 'Monsieur' | 'Madame'
                      })
                    }
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm bg-white font-medium"
                  >
                    <option value="Monsieur">Monsieur</option>
                    <option value="Madame">Madame</option>
                  </select>
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Prénom *
                  </label>
                  <input
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
                    className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm"
                  />
                </div>

                <div className="sm:col-span-5">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nom de famille *
                  </label>
                  <input
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
                    className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm"
                  />
                </div>
              </div>

              {/* Row 2: Date de naissance + Sexe + Nationalité */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Date de naissance *
                  </label>
                  <input
                    type="date"
                    required
                    value={identityForm.date_naissance}
                    onChange={(e) =>
                      setIdentityForm({ ...identityForm, date_naissance: e.target.value })
                    }
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Genre / Sexe
                  </label>
                  <select
                    value={identityForm.sexe}
                    onChange={(e) =>
                      setIdentityForm({
                        ...identityForm,
                        sexe: e.target.value as 'Masculin' | 'Féminin'
                      })
                    }
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm bg-white font-medium"
                  >
                    <option value="Masculin">Masculin</option>
                    <option value="Féminin">Féminin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nationalité *
                  </label>
                  <input
                    type="text"
                    required
                    value={identityForm.nationalite}
                    onChange={(e) =>
                      setIdentityForm({ ...identityForm, nationalite: e.target.value })
                    }
                    placeholder="Ex: Canadienne, Française..."
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm"
                  />
                </div>
              </div>

              {/* Row 3: Pièce d'identité + Téléphone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    N° Pièce d’identité (Passeport / Permis / NAS)
                  </label>
                  <input
                    type="text"
                    value={identityForm.numero_piece_identite}
                    onChange={(e) =>
                      setIdentityForm({ ...identityForm, numero_piece_identite: e.target.value })
                    }
                    placeholder="Ex: C01294857"
                    className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Téléphone personnel *
                  </label>
                  <input
                    type="tel"
                    required
                    value={identityForm.telephone}
                    onChange={(e) =>
                      setIdentityForm({ ...identityForm, telephone: e.target.value })
                    }
                    placeholder="Ex: +1 (604) 555-0194"
                    className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-mono"
                  />
                </div>
              </div>

              {/* Row 4: Email + Contact d'urgence */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Adresse email du salarié *
                  </label>
                  <input
                    type="email"
                    required
                    value={identityForm.email}
                    onChange={(e) =>
                      setIdentityForm({ ...identityForm, email: e.target.value })
                    }
                    placeholder="salarie@example.com"
                    className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contact d’urgence (Nom &amp; Tél)
                  </label>
                  <input
                    type="text"
                    value={identityForm.contact_urgence}
                    onChange={(e) =>
                      setIdentityForm({ ...identityForm, contact_urgence: e.target.value })
                    }
                    placeholder="Ex: Marie Kamga (+1 604 555-0199)"
                    className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm"
                  />
                </div>
              </div>

              {/* Row 5: Adresse complète de résidence */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Adresse complète de résidence *
                </label>
                <input
                  type="text"
                  required
                  value={identityForm.adresse}
                  onChange={(e) =>
                    setIdentityForm({ ...identityForm, adresse: e.target.value })
                  }
                  placeholder="Numéro, Rue, Ville, Province/Région, Code postal"
                  className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="min-h-[42px] px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs sm:text-sm font-semibold hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="min-h-[42px] px-6 py-2 rounded-xl bg-[#0B2545] text-white text-xs sm:text-sm font-bold hover:bg-[#134074] transition-colors disabled:opacity-50"
                >
                  {saving ? 'Enregistrement...' : 'Enregistrer le salarié'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
