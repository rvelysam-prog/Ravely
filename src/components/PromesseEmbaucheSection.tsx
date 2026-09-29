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
  Sparkles
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
  createRectangularStampPngDataUrl,
  downloadPromesseEmbauchePdf,
  formatPromesseDateLongFr,
  formatPromesseDateSlash,
  generatePromesseEmbauchePdfBlobUrl
} from '../services/promesseEmbauchePdfGenerator';

interface PromesseEmbaucheSectionProps {
  employees: Employee[];
  onEmployeesUpdated: (updatedList: Employee[]) => void;
}

export const PromesseEmbaucheSection: React.FC<PromesseEmbaucheSectionProps> = ({
  employees,
  onEmployeesUpdated
}) => {
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
    departement: 'Logistique & Entrepôt',
    manager: 'ANTOINE FORESTIN',
    matricule: getNextMatricule(employees),
    type_contrat: 'Contrat à Durée Déterminée (CDI) de 2 ans',
    date_embauche: '2027-01-04',
    date_emission: '2026-09-28',
    date_fin: '2029-01-04',
    salaire_horaire: '22',
    primes: 'Prime de rendement selon grille interne',
    mode_paiement: 'Virement bancaire bimensuel',
    lieu_travail: 'Surrey, Colombie-Britanique, Canada',
    horaire: 'Temps plein – 40 heures par semaine',
    ni: 'BC1129970',
    responsabilites_text: DEFAULT_PROMESSE_RESPONSABILITES
  });

  // Admin-uploaded or default signature.png & cachet.png
  const [signatureDataUrl, setSignatureDataUrl] = useState<string>('');
  const [signatureFileName, setSignatureFileName] = useState<string>('signature.png (Par défaut)');
  const [cachetDataUrl, setCachetDataUrl] = useState<string>('');
  const [cachetFileName, setCachetFileName] = useState<string>(
    'Cachet rectangulaire Atlantic Transport (Par défaut)'
  );
  const [cachetPreset, setCachetPreset] = useState<'rectangulaire' | 'rond_rouge' | 'custom'>(
    'rectangulaire'
  );

  // Status & Preview states
  const [saving, setSaving] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [validatedData, setValidatedData] = useState<PromesseEmbaucheData | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string>('');
  const [statusMsg, setStatusMsg] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Load default signature.png and rectangular/round cachet.png on mount
  useEffect(() => {
    let active = true;
    (async () => {
      const [sigUrl, rectStampUrl] = await Promise.all([
        loadStaticImageAsPngDataUrl(CONTRACT_STATIC_ASSETS.signature),
        createRectangularStampPngDataUrl()
      ]);
      if (!active) return;
      if (sigUrl) setSignatureDataUrl(sigUrl);
      if (rectStampUrl) setCachetDataUrl(rectStampUrl);
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleSelectCachetPreset = async (preset: 'rectangulaire' | 'rond_rouge') => {
    setCachetPreset(preset);
    if (preset === 'rectangulaire') {
      const rectUrl = await createRectangularStampPngDataUrl();
      setCachetDataUrl(rectUrl);
      setCachetFileName('Cachet rectangulaire Atlantic Transport');
    } else {
      const roundUrl = await loadStaticImageAsPngDataUrl(CONTRACT_STATIC_ASSETS.cachet);
      setCachetDataUrl(roundUrl);
      setCachetFileName('cachet.png (Rond rouge Direction)');
    }
  };

  const handleImageFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'photo' | 'signature' | 'cachet'
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
      } else if (target === 'signature') {
        setSignatureDataUrl(result);
        setSignatureFileName(file.name);
      } else if (target === 'cachet') {
        setCachetPreset('custom');
        setCachetDataUrl(result);
        setCachetFileName(file.name);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRegenerateMatricule = async () => {
    const freshMat = await generateUniqueMatriculeInFirestore(undefined, employees);
    setForm((prev) => ({ ...prev, matricule: freshMat }));
  };

  const handleLoadExistingEmployee = (matricule: string) => {
    if (!matricule) return;
    const found = employees.find((e) => e.matricule === matricule);
    if (!found) return;

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
      date_fin: found.date_fin || found.date_fin_cdd || prev.date_fin,
      salaire_horaire: String(found.salaire_horaire || found.salaire || '22'),
      primes: found.primes || prev.primes,
      mode_paiement: found.mode_paiement || prev.mode_paiement,
      lieu_travail: found.lieu_travail || prev.lieu_travail,
      horaire: found.horaires || prev.horaire,
      ni: found.ni || prev.ni,
      responsabilites_text:
        Array.isArray(found.responsabilites) && found.responsabilites.length > 0
          ? found.responsabilites.join('\n')
          : prev.responsabilites_text
    }));
  };

  const buildCurrentPromesseData = (): PromesseEmbaucheData => {
    const missions = form.responsabilites_text
      .split('\n')
      .map((line) => line.replace(/^[\s•\-*]+/, '').trim())
      .filter((line) => line.length > 0);

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
      date_emission: form.date_emission || form.date_embauche,
      date_fin: form.date_fin,
      salaire_horaire: form.salaire_horaire.trim() || '22',
      primes: form.primes.trim(),
      mode_paiement: form.mode_paiement.trim(),
      lieu_travail: form.lieu_travail.trim(),
      horaire: form.horaire.trim(),
      ni: form.ni.trim(),
      responsabilites: missions,
      signature_data_url: signatureDataUrl,
      cachet_data_url: cachetDataUrl
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
      // Compute monthly equivalent for general payroll if hourly < 200, while keeping exact hourly rate
      const normalizedSalaire = hourlyRate;

      const shortContractType: 'CDI' | 'CDD' = form.type_contrat
        .toUpperCase()
        .includes('CDD')
        ? 'CDD'
        : 'CDI';

      const missions = form.responsabilites_text
        .split('\n')
        .map((line) => line.replace(/^[\s•\-*]+/, '').trim())
        .filter((line) => line.length > 0);

      const employeeRecord: Employee = {
        id: existingEmp?.id || Date.now(),
        firestore_id: existingEmp?.firestore_id,
        matricule: finalMatricule,
        civilite,
        nom_complet: fullName,
        prenom,
        nom,
        email: form.email.trim() || `${finalMatricule.toLowerCase()}@atlantictransport.ca`,
        password: existingEmp?.password || 'Employe@2026!',
        telephone: form.telephone.trim(),
        adresse: form.adresse.trim(),
        date_naissance: form.date_naissance,
        nationalite: form.nationalite.trim(),
        poste: form.poste.trim(),
        departement: form.departement.trim() || 'Opérations Logistiques',
        type_contrat: shortContractType,
        date_effet: form.date_embauche,
        date_embauche: form.date_embauche,
        date_fin_cdd: form.date_fin,
        duree_periode_essai: existingEmp?.duree_periode_essai || '3 semaines',
        lieu_travail: form.lieu_travail.trim(),
        horaires: form.horaire.trim(),
        salaire: normalizedSalaire,
        devise: 'CAD',
        hebergement_fourni: existingEmp?.hebergement_fourni ?? false,
        hebergement_duree_type: existingEmp?.hebergement_duree_type || 'duree_precise',
        hebergement_nombre_mois: existingEmp?.hebergement_nombre_mois || 3,
        hebergement_lieu_type: existingEmp?.hebergement_lieu_type || 'preciser_lieu',
        adresse_hebergement: existingEmp?.adresse_hebergement || '',
        date_signature: form.date_emission || form.date_embauche,
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

      // 1. Save in the same Firebase "employees" collection with existing security rules
      const { docId, employee: savedEmployee } = await writeEmployeeToFirestore(
        employeeRecord,
        Boolean(existingEmp)
      );

      // 2. Refresh employee list from Firestore
      const updatedEmployees = await fetchEmployeesFromFirestore();
      onEmployeesUpdated(updatedEmployees);
      setForm((prev) => ({ ...prev, matricule: savedEmployee.matricule }));

      // 3. Build Promesse d'Embauche preview & PDF Blob URL
      const promessePayload: PromesseEmbaucheData = {
        ...buildCurrentPromesseData(),
        matricule: savedEmployee.matricule
      };
      setValidatedData(promessePayload);

      const blobUrl = await generatePromesseEmbauchePdfBlobUrl(promessePayload);
      setPdfBlobUrl((oldUrl) => {
        if (oldUrl) URL.revokeObjectURL(oldUrl);
        return blobUrl;
      });

      setStatusMsg({
        type: 'success',
        text: `Salarié ${savedEmployee.nom_complet} (${savedEmployee.matricule}) enregistré dans Firebase collection "employees" (ID: ${docId}). Aperçu officiel de la Promesse d'embauche (2 pages A4) prêt ci-dessous.`
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
      const payload = validatedData || buildCurrentPromesseData();
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

  const previewData = validatedData || buildCurrentPromesseData();
  const salutationPreview =
    previewData.sexe.toLowerCase().startsWith('f') ? 'Madame' : 'Monsieur';

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
            Enregistre le salarié dans la collection Firebase <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">employees</code> et génère l&apos;exemplaire officiel conforme au modèle <strong>EMBAUCHE_SALIMATA1.pdf</strong>.
          </p>
        </div>

        {/* Charger un salarié existant ou réinitialiser */}
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
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2.5">
            <UserPlus className="w-5 h-5 text-[#0B2545]" />
            <h3 className="font-display font-bold text-lg text-[#0B2545]">
              Formulaire Admin — Nouveau Salarié &amp; Paramètres de la Promesse d&apos;Embauche
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-500">Collection Firestore : employees</span>
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
                Email *
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

        {/* Section 2 : Poste, Contrat, Rémunération & NI */}
        <div className="pt-2 border-t border-slate-100">
          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-3">
            2. Informations sur le Poste, Rémunération &amp; Identifiants (NI / Matricule)
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

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Poste *
              </label>
              <input
                type="text"
                required
                value={form.poste}
                onChange={(e) => setForm({ ...form, poste: e.target.value })}
                placeholder="Ex: Préparatrice de Commande"
                className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:border-[#0B2545] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Département *
              </label>
              <input
                type="text"
                required
                value={form.departement}
                onChange={(e) => setForm({ ...form, departement: e.target.value })}
                placeholder="Ex: Logistique & Entrepôt"
                className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:border-[#0B2545] focus:outline-none"
              />
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

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Type de contrat (Texte affiché sur la promesse) *
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
                Date en-tête (« A Surrey, le ... »)
              </label>
              <input
                type="date"
                value={form.date_emission}
                onChange={(e) => setForm({ ...form, date_emission: e.target.value })}
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

            <div className="sm:col-span-2">
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

            <div className="sm:col-span-1">
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
          </div>
        </div>

        {/* Section 3 : Textarea "Vos principales responsabilités" */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-amber-700">
              3. Vos principales responsabilités (Une mission par ligne → génère une puce par ligne en Page 2) *
            </label>
            <button
              type="button"
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  responsabilites_text: DEFAULT_PROMESSE_RESPONSABILITES
                }))
              }
              className="text-xs font-semibold text-[#0B2545] underline hover:text-amber-700 self-start"
            >
              Restaurer les 6 missions du modèle EMBAUCHE_SALIMATA1
            </button>
          </div>
          <textarea
            rows={6}
            required
            value={form.responsabilites_text}
            onChange={(e) => setForm({ ...form, responsabilites_text: e.target.value })}
            placeholder="Saisissez une responsabilité par ligne..."
            className="w-full p-3.5 rounded-xl border border-slate-300 text-sm leading-relaxed focus:border-[#0B2545] focus:outline-none"
          />
        </div>

        {/* Section 4 : Fichiers Signature (signature.png) et Cachet (cachet.png) fournis par l'admin */}
        <div className="pt-2 border-t border-slate-100">
          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-3">
            4. Signature &amp; Cachet Officiels de l&apos;Employeur (Page 2 : Pour Atlantic Transport Ltd. / ANTOINE FORESTIN)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Upload signature.png */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between gap-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    Fichier Signature (signature.png)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {signatureFileName}
                  </span>
                </div>
                <label className="px-3 py-1.5 rounded-lg bg-[#0B2545] hover:bg-[#134074] text-white text-xs font-semibold cursor-pointer flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Uploader signature.png</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageFileUpload(e, 'signature')}
                    className="hidden"
                  />
                </label>
              </div>
              {signatureDataUrl && (
                <div className="h-16 bg-white rounded-lg border border-slate-200 flex items-center justify-center p-2">
                  <img
                    src={signatureDataUrl}
                    alt="Aperçu signature"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              )}
            </div>

            {/* Upload cachet.png */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    Fichier Cachet (cachet.png)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {cachetFileName}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSelectCachetPreset('rectangulaire')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${
                      cachetPreset === 'rectangulaire'
                        ? 'bg-[#0B2545] text-white border-[#0B2545]'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    Cachet Bleuté
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectCachetPreset('rond_rouge')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${
                      cachetPreset === 'rond_rouge'
                        ? 'bg-[#0B2545] text-white border-[#0B2545]'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    Cachet Rond
                  </button>
                  <label className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold cursor-pointer flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Uploader cachet.png</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageFileUpload(e, 'cachet')}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
              {cachetDataUrl && (
                <div className="h-16 bg-white rounded-lg border border-slate-200 flex items-center justify-center p-2">
                  <img
                    src={cachetDataUrl}
                    alt="Aperçu cachet"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              )}
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
                ? 'Enregistrement dans Firebase...'
                : "Valider, Enregistrer dans Firebase & Générer l'Aperçu"}
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

      {/* APERÇU OFFICIEL DES 2 PAGES A4 (IDENTIQUE À EMBAUCHE_SALIMATA1.pdf) */}
      <div className="bg-slate-900 rounded-2xl p-4 sm:p-8 space-y-6 border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5 text-white">
            <Eye className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-display font-bold text-lg">
                Aperçu Officiel — Promesse d&apos;Embauche (A4 · 2 Pages)
              </h3>
              <p className="text-xs text-slate-400">
                Exemplaire officiel réservé à l&apos;administration RH pour envoi au salarié ({previewData.nom_complet})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#0B2545] font-bold text-xs sm:text-sm flex items-center gap-2 transition-colors self-start sm:self-auto"
          >
            <Download className="w-4 h-4" />
            <span>Télécharger PDF Promesse d&apos;embauche</span>
          </button>
        </div>

        {/* Aperçu Visuel Haute-Fidélité des 2 Pages A4 */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
          {/* PAGE 1 PREVIEW */}
          <div className="bg-white text-black rounded-lg shadow-xl p-6 sm:p-8 relative overflow-hidden min-h-[780px] flex flex-col justify-between border border-slate-300">
            {/* Filigrane Blason Canada Page 1 */}
            <img
              src={CONTRACT_STATIC_ASSETS.blasonOriginal}
              alt=""
              className="w-60 h-72 object-contain opacity-[0.08] grayscale pointer-events-none select-none absolute left-1/2 top-[52%] -translate-x-1/2 -translate-y-1/2"
            />

            <div className="relative z-10 space-y-4">
              {/* En-tête Page 1 */}
              <div className="grid grid-cols-12 gap-2 items-start">
                <div className="col-span-5 space-y-1">
                  <img
                    src={CONTRACT_STATIC_ASSETS.logoAtlantic}
                    alt="Atlantic Transport"
                    className="h-14 object-contain"
                  />
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
                      previewData.date_emission || previewData.date_embauche
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
                  <img
                    src={CONTRACT_STATIC_ASSETS.blasonOriginal}
                    alt="Emblème"
                    className="h-9 object-contain opacity-45 grayscale mt-6"
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

              {/* Section : Informations sur le poste */}
              <div className="pt-1">
                <div className="bg-[#F4F4F4] px-3 py-1.5 flex items-center gap-2 text-xs sm:text-sm font-bold text-[#C67D26]">
                  <span className="w-2 h-2 rounded-full border border-[#C67D26] inline-block" />
                  <span>Informations sur le poste:</span>
                </div>

                <div className="pl-4 pr-2 pt-2 space-y-2.5 text-xs sm:text-[13px]">
                  <div className="border-b border-black pb-2">
                    <strong>Poste :</strong>{' '}
                    <span className="ml-3">{previewData.poste}</span>
                  </div>
                  <div className="border-b border-black pb-2">
                    <strong>Type de contrat :</strong>{' '}
                    <span className="ml-3">{previewData.type_contrat}</span>
                  </div>
                  <div className="border-b border-black pb-2">
                    <strong>Date de prise de fonction :</strong>{' '}
                    <span className="ml-3">
                      {formatPromesseDateLongFr(previewData.date_embauche)}
                    </span>
                  </div>
                  <div className="border-b border-black pb-2">
                    <strong>Lieu de travail :</strong>{' '}
                    <span className="ml-3">{previewData.lieu_travail}</span>
                  </div>
                  <div className="pb-1">
                    <strong>Horaire :</strong>{' '}
                    <span className="ml-3">{previewData.horaire}</span>
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
                    <strong>Salaire :</strong> {previewData.salaire_horaire} CAD par heure
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
            {/* Filigrane Blason Canada Page 2 */}
            <img
              src={CONTRACT_STATIC_ASSETS.blasonOriginal}
              alt=""
              className="w-60 h-72 object-contain opacity-[0.08] grayscale pointer-events-none select-none absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2"
            />

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
                  <div className="relative pt-4 min-h-[92px]">
                    <div className="text-xs font-bold">
                      Signature : .........................
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {cachetDataUrl && (
                        <img
                          src={cachetDataUrl}
                          alt="Cachet"
                          className="h-20 object-contain"
                        />
                      )}
                      {signatureDataUrl && (
                        <img
                          src={signatureDataUrl}
                          alt="Signature"
                          className="h-16 object-contain -ml-10"
                        />
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
