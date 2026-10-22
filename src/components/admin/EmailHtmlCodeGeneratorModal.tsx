import React, { useState, useEffect } from 'react';
import {
  Code,
  Copy,
  Check,
  Eye,
  Send,
  Sparkles,
  Users,
  Building2,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  FileText,
  ExternalLink,
  RotateCcw
} from 'lucide-react';
import { Employee } from '../../types';
import { buildPromesseEmbaucheHtml } from '../../services/emailjsService';
import { getCompanyContactConfig, PHONE_PRESETS, EMAIL_PRESETS } from '../../services/companyConfigService';

interface EmailHtmlCodeGeneratorModalProps {
  employees: Employee[];
  selectedEmployee?: Employee | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenInWebmail?: (emailContent: {
    recipient: string;
    subject: string;
    htmlBody: string;
  }) => void;
}

export const EmailHtmlCodeGeneratorModal: React.FC<EmailHtmlCodeGeneratorModalProps> = ({
  employees,
  selectedEmployee,
  isOpen,
  onClose,
  onOpenInWebmail
}) => {
  const companyConfig = getCompanyContactConfig();
  const [activeView, setActiveView] = useState<'html' | 'preview'>('preview');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedRichText, setCopiedRichText] = useState(false);

  // Form parameters
  const [chosenEmployeeId, setChosenEmployeeId] = useState<number | 'custom'>(
    selectedEmployee ? selectedEmployee.id : employees[0]?.id || 'custom'
  );

  const [nomComplet, setNomComplet] = useState(
    selectedEmployee?.nom_complet || (employees[0] ? employees[0].nom_complet : 'Jean Tremblay')
  );
  const [candidateEmail, setCandidateEmail] = useState(
    selectedEmployee?.email || (employees[0] ? employees[0].email : 'jean.tremblay@example.com')
  );
  const [matricule, setMatricule] = useState(
    selectedEmployee?.matricule || (employees[0] ? employees[0].matricule : 'AT-2026-001')
  );
  const [poste, setPoste] = useState(
    selectedEmployee?.poste || (employees[0] ? employees[0].poste : 'Conducteur Routier')
  );
  const [departement, setDepartement] = useState(
    selectedEmployee?.departement || (employees[0] ? employees[0].departement : 'DEPARTEMENT EXPLOITATION TRANSPORT')
  );
  const [salaireHoraire, setSalaireHoraire] = useState(
    selectedEmployee?.salaire_horaire ? String(selectedEmployee.salaire_horaire) : '24.50'
  );
  const [datePriseFonction, setDatePriseFonction] = useState(
    selectedEmployee?.date_embauche || new Date().toISOString().slice(0, 10)
  );
  const [lieuTravail, setLieuTravail] = useState(
    selectedEmployee?.lieu_travail || 'Surrey, Colombie-Britannique, Canada'
  );
  const [contactPhone, setContactPhone] = useState(
    selectedEmployee?.doc_contact_phone || companyConfig.primaryPhone || '+15068022206'
  );
  const [contactEmail, setContactEmail] = useState(
    selectedEmployee?.doc_contact_email || companyConfig.primaryEmail || 'atlantictransport.int.contact@ik.me'
  );

  // Update when selectedEmployee changes or when employee selector changes
  useEffect(() => {
    if (selectedEmployee) {
      setChosenEmployeeId(selectedEmployee.id);
      setNomComplet(selectedEmployee.nom_complet);
      setCandidateEmail(selectedEmployee.email);
      setMatricule(selectedEmployee.matricule);
      setPoste(selectedEmployee.poste);
      setDepartement(selectedEmployee.departement);
      setSalaireHoraire(selectedEmployee.salaire_horaire ? String(selectedEmployee.salaire_horaire) : '24.50');
      setDatePriseFonction(selectedEmployee.date_embauche || new Date().toISOString().slice(0, 10));
      setLieuTravail(selectedEmployee.lieu_travail || 'Surrey, Colombie-Britannique, Canada');
      setContactPhone(selectedEmployee.doc_contact_phone || companyConfig.primaryPhone || '+15068022206');
      setContactEmail(selectedEmployee.doc_contact_email || companyConfig.primaryEmail || 'atlantictransport.int.contact@ik.me');
    }
  }, [selectedEmployee]);

  const handleSelectEmployee = (empIdStr: string) => {
    if (empIdStr === 'custom') {
      setChosenEmployeeId('custom');
      return;
    }
    const id = Number(empIdStr);
    setChosenEmployeeId(id);
    const emp = employees.find((e) => e.id === id);
    if (emp) {
      setNomComplet(emp.nom_complet);
      setCandidateEmail(emp.email);
      setMatricule(emp.matricule);
      setPoste(emp.poste);
      setDepartement(emp.departement);
      setSalaireHoraire(emp.salaire_horaire ? String(emp.salaire_horaire) : '24.50');
      setDatePriseFonction(emp.date_embauche || new Date().toISOString().slice(0, 10));
      setLieuTravail(emp.lieu_travail || 'Surrey, Colombie-Britannique, Canada');
      setContactPhone(emp.doc_contact_phone || companyConfig.primaryPhone || '+15068022206');
      setContactEmail(emp.doc_contact_email || companyConfig.primaryEmail || 'atlantictransport.int.contact@ik.me');
    }
  };

  // Generate HTML source code dynamically with corporate contact injected
  const generatedHtml = buildPromesseEmbaucheHtml({
    nom_complet: nomComplet,
    poste,
    matricule,
    departement,
    salaireHoraire,
    lieuTravail,
    dateEmbauche: datePriseFonction,
    date: new Date().toLocaleDateString('fr-CA'),
    contactPhone,
    contactEmail
  });

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(generatedHtml.trim());
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 3000);
    } catch (err) {
      console.warn('Erreur copie presse-papier:', err);
    }
  };

  const handleCopyRichText = async () => {
    try {
      const type = 'text/html';
      const blob = new Blob([generatedHtml], { type });
      const data = [new ClipboardItem({ [type]: blob })];
      await navigator.clipboard.write(data);
      setCopiedRichText(true);
      setTimeout(() => setCopiedRichText(false), 3000);
    } catch {
      // Fallback standard text
      await navigator.clipboard.writeText(generatedHtml);
      setCopiedRichText(true);
      setTimeout(() => setCopiedRichText(false), 3000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-5xl w-full border border-slate-200 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#0B2545] text-white p-5 sm:p-6 flex items-center justify-between gap-4 border-b border-amber-400/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Code className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-mono uppercase text-amber-400 font-bold">
                Outil d'automatisation RH
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-white">
                Générateur de Mail (Promesse d'Embauche)
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-300 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1">
          {/* Top Options & Employee Selection */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#0B2545]" />
                <h3 className="font-bold text-sm text-[#0B2545]">
                  Sélection du Salarié &amp; Paramètres Dynamiques
                </h3>
              </div>
              <span className="text-xs text-slate-500">
                Coordonnées expéditeur : <strong className="text-slate-800">{companyConfig.primaryEmail}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Choisir un salarié
                </label>
                <select
                  value={chosenEmployeeId}
                  onChange={(e) => handleSelectEmployee(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs sm:text-sm bg-white focus:border-[#0B2545] focus:outline-none font-medium"
                >
                  <option value="custom">-- Saisie libre / Nouveau candidat --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.matricule} - {emp.nom_complet} ({emp.poste})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nom complet du candidat
                </label>
                <input
                  type="text"
                  value={nomComplet}
                  onChange={(e) => setNomComplet(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs sm:text-sm bg-white focus:border-[#0B2545] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Poste proposé
                </label>
                <input
                  type="text"
                  value={poste}
                  onChange={(e) => setPoste(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs sm:text-sm bg-white focus:border-[#0B2545] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Salaire horaire (CAD/h)
                </label>
                <input
                  type="text"
                  value={salaireHoraire}
                  onChange={(e) => setSalaireHoraire(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs sm:text-sm bg-white focus:border-[#0B2545] focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  <span>Téléphone entreprise (signature du mail)</span>
                </label>
                <select
                  value={
                    PHONE_PRESETS.some((p) => p.value === contactPhone)
                      ? contactPhone
                      : 'custom'
                  }
                  onChange={(e) => {
                    if (e.target.value !== 'custom') {
                      setContactPhone(e.target.value);
                    }
                  }}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs sm:text-sm bg-white focus:border-[#0B2545] focus:outline-none"
                >
                  {PHONE_PRESETS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.value} ({p.label})
                    </option>
                  ))}
                  <option value="custom">Numéro personnalisé...</option>
                </select>
                <input
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-mono bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  <span>Email entreprise (signature du mail)</span>
                </label>
                <select
                  value={
                    EMAIL_PRESETS.some((p) => p.value === contactEmail)
                      ? contactEmail
                      : 'custom'
                  }
                  onChange={(e) => {
                    if (e.target.value !== 'custom') {
                      setContactEmail(e.target.value);
                    }
                  }}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs sm:text-sm bg-white focus:border-[#0B2545] focus:outline-none"
                >
                  {EMAIL_PRESETS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.value} ({p.label})
                    </option>
                  ))}
                  <option value="custom">Email personnalisé...</option>
                </select>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-mono bg-white"
                />
              </div>
            </div>
          </div>

          {/* Action Tabs & Interactive "Copier le code" buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-slate-200">
            {/* View Switcher */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveView('preview')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer ${
                  activeView === 'preview'
                    ? 'bg-[#0B2545] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Aperçu Visuel en Direct</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveView('html')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer ${
                  activeView === 'html'
                    ? 'bg-[#0B2545] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                <span>Code Source HTML</span>
              </button>
            </div>

            {/* Quick Copy Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleCopyCode}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shadow-sm cursor-pointer"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-900" />
                    <span className="text-emerald-900">Code HTML copié !</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copier le code source HTML</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleCopyRichText}
                className="min-h-[40px] px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                title="Copier en format enrichi pour coller directement dans le composeur Infomaniak"
              >
                {copiedRichText ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Format enrichi copié !</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 text-amber-400" />
                    <span>Copier en Texte Enrichi</span>
                  </>
                )}
              </button>

              {onOpenInWebmail && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenInWebmail({
                      recipient: candidateEmail,
                      subject: `Atlantic Transport Ltd - Acceptation de votre candidature (${poste})`,
                      htmlBody: generatedHtml
                    });
                    onClose();
                  }}
                  className="min-h-[40px] px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors shadow-sm cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Transférer vers Webmail Infomaniak</span>
                </button>
              )}
            </div>
          </div>

          {/* Display Output */}
          {activeView === 'html' ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
                <span>Code HTML propre et responsive pour webmail</span>
                <span>{generatedHtml.length} caractères</span>
              </div>
              <div className="bg-slate-900 text-slate-100 rounded-xl p-4 font-mono text-xs overflow-x-auto max-h-[380px] border border-slate-800">
                <pre className="whitespace-pre-wrap">{generatedHtml.trim()}</pre>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-xs text-slate-500">
                Ce rendu visuel correspond exactement à ce que le candidat visualisera dans sa boîte de réception.
              </div>
              <div className="border border-slate-200 rounded-xl p-4 sm:p-6 bg-slate-50 max-h-[400px] overflow-y-auto">
                <div
                  dangerouslySetInnerHTML={{ __html: generatedHtml }}
                  className="shadow-sm rounded-xl overflow-hidden"
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 px-6 flex items-center justify-between text-xs text-slate-500">
          <div>
            Expéditeur paramétré : <strong className="text-slate-800">{companyConfig.primaryEmail}</strong> · Téléphone : <strong className="text-slate-800">{companyConfig.primaryPhone}</strong>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white border border-slate-300 font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
