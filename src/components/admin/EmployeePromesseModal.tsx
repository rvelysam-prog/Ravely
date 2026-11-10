import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  Download,
  Save,
  Send,
  Edit3,
  Eye,
  Sliders,
  DollarSign,
  Calendar,
  User,
  ShieldCheck,
  Building2,
  Clock,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  Printer
} from 'lucide-react';
import { Employee, SiteSettings } from '../../types';
import {
  PromesseEmbaucheData,
  downloadPromesseEmbauchePdf,
  generatePromesseEmbauchePdfDataUri,
  formatPromesseDateLongFr,
  formatPromesseDateSlash
} from '../../services/promesseEmbauchePdfGenerator';
import {
  getMissionsForPosteOrDepartment,
  getSavedPdfAssetsConfig,
  normalizePdfAssetsConfig
} from '../../services/departmentsAndEmailService';
import { InteractiveDocumentCanvas } from '../common/InteractiveDocumentCanvas';
import { ForcusWordEditor } from './ForcusWordEditor';
import { writeEmployeeToFirestore } from '../../services/staticStorage';
import { sendPromesseEmbaucheViaEmailJs } from '../../services/emailjsService';

interface EmployeePromesseModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee;
  settings: SiteSettings;
  onEmployeeUpdated: (updatedEmp: Employee) => void;
  onOpenInWebmail?: (html: string) => void;
}

export const EmployeePromesseModal: React.FC<EmployeePromesseModalProps> = ({
  isOpen,
  onClose,
  employee,
  settings,
  onEmployeeUpdated,
  onOpenInWebmail
}) => {
  if (!isOpen) return null;

  // Active view: 'form' | 'preview'
  const [activeView, setActiveView] = useState<'preview' | 'form'>('preview');
  const [isForcusOpen, setIsForcusOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingMail, setIsSendingMail] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [customVisualText, setCustomVisualText] = useState<string>('');

  // Initializing state from saved promesse_data if available, or employee fallback
  const initialData: PromesseEmbaucheData = employee.promesse_data || {
    nom_complet: employee.nom_complet || `${employee.prenom} ${employee.nom}`,
    date_naissance: employee.date_naissance || '1990-05-15',
    sexe: employee.sexe || (employee.civilite === 'Madame' ? 'Féminin' : 'Masculin'),
    nationalite: employee.nationalite || 'Canadienne',
    numero_piece_identite: employee.numero_piece_identite || 'C01294857',
    telephone: employee.telephone || '+1 (506) 802-2226',
    email: employee.email || `${employee.matricule.toLowerCase()}@atlantictransport.ca`,
    adresse: employee.adresse || 'Surrey, Colombie-Britannique, Canada',
    contact_urgence: employee.contact_urgence || '',
    poste: employee.poste || 'Conducteur Routier International',
    departement: employee.departement || 'Opérations Logistiques & Transport',
    manager: employee.manager || 'ANTOINE FORESTIN (Directeur Général)',
    matricule: employee.matricule,
    type_contrat:
      employee.promesse_type_contrat_label ||
      (employee.type_contrat === 'CDD'
        ? 'Contrat à Durée Déterminée (CDD) de 2 ans'
        : 'Contrat à Durée Indéterminée (CDI)'),
    date_embauche: employee.date_embauche || employee.date_effet || new Date().toISOString().slice(0, 10),
    date_etablissement:
      employee.date_etablissement || employee.date_signature || new Date().toISOString().slice(0, 10),
    date_fin: employee.date_fin_cdd || '',
    salaire_horaire:
      employee.salaire_horaire || (employee.salaire ? parseFloat((employee.salaire / 160).toFixed(2)) : 28.75),
    lieu_travail: employee.lieu_travail || 'Surrey, Colombie-Britannique, Canada',
    horaire: employee.horaires || '40 heures par semaine (du lundi au vendredi, 08h00 - 17h00)',
    ni: employee.ni || 'BC1129970',
    responsabilites:
      employee.responsabilites && employee.responsabilites.length > 0
        ? employee.responsabilites
        : getMissionsForPosteOrDepartment(employee.poste, employee.departement),
    company_contact_phone: employee.doc_contact_phone || settings.phone || '+15068022206',
    company_contact_email: employee.doc_contact_email || settings.email || 'atlantictransport.int.contact@ik.me'
  };

  const [formData, setFormData] = useState<PromesseEmbaucheData>(initialData);
  const [responsabilitesText, setResponsabilitesText] = useState(
    initialData.responsabilites ? initialData.responsabilites.join('\n') : ''
  );

  // Synchroniser les missions quand le texte multiligne change
  const handleMissionsChange = (text: string) => {
    setResponsabilitesText(text);
    const missionsArray = text
      .split('\n')
      .map((l) => l.trim().replace(/^[-•*]\s*/, ''))
      .filter((l) => l.length > 0);
    setFormData((prev) => ({ ...prev, responsabilites: missionsArray }));
  };

  // Enregistrer les modifications dans Firestore
  const handleSaveToFirestore = async () => {
    setIsSaving(true);
    setFeedback(null);
    try {
      // Générer le nouveau PDF Data URI
      const updatedPdfUri = await generatePromesseEmbauchePdfDataUri({
        ...formData,
        customVisualText: customVisualText || undefined
      });

      const updatedEmp: Employee = {
        ...employee,
        nom_complet: formData.nom_complet,
        poste: formData.poste,
        departement: formData.departement,
        date_embauche: formData.date_embauche,
        date_etablissement: formData.date_etablissement,
        salaire_horaire: Number(formData.salaire_horaire) || 28.75,
        lieu_travail: formData.lieu_travail,
        horaires: formData.horaire,
        responsabilites: formData.responsabilites,
        numero_piece_identite: formData.numero_piece_identite,
        contact_urgence: formData.contact_urgence,
        manager: formData.manager,
        ni: formData.ni,
        doc_contact_phone: formData.company_contact_phone,
        doc_contact_email: formData.company_contact_email,
        // Sauvegarde stricte de la promesse dans l'employé
        promesse_data: formData,
        promesse_pdf_url: updatedPdfUri,
        updated_at: new Date().toISOString()
      };

      await writeEmployeeToFirestore(updatedEmp, true);
      onEmployeeUpdated(updatedEmp);

      setFeedback({
        type: 'success',
        text: `Promesse d'embauche de ${formData.nom_complet} (${employee.matricule}) enregistrée et mise à jour avec succès dans Firestore !`
      });
    } catch (err) {
      console.error('Erreur enregistrement promesse:', err);
      setFeedback({
        type: 'error',
        text: "Erreur lors de l'enregistrement de la promesse dans Firestore."
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Télécharger le PDF officiel
  const handleDownloadPdf = async () => {
    try {
      await downloadPromesseEmbauchePdf({
        ...formData,
        customVisualText: customVisualText || undefined
      });
      setFeedback({
        type: 'success',
        text: `Téléchargement du PDF de la Promesse d'Embauche (${formData.matricule}) réussi !`
      });
    } catch (err) {
      console.error('Erreur téléchargement promesse PDF:', err);
      setFeedback({
        type: 'error',
        text: 'Erreur lors du téléchargement du PDF de la promesse.'
      });
    }
  };

  // Renvoyer par EmailJS
  const handleSendViaEmailJs = async () => {
    setIsSendingMail(true);
    setFeedback({ type: 'info', text: 'Envoi de la promesse d’embauche par email en cours...' });
    try {
      const pdfUri = await generatePromesseEmbauchePdfDataUri({
        ...formData,
        customVisualText: customVisualText || undefined
      });

      const res = await sendPromesseEmbaucheViaEmailJs({
        candidateEmail: formData.email,
        candidateName: formData.nom_complet,
        poste: formData.poste,
        date: formatPromesseDateSlash(formData.date_etablissement),
        matricule: formData.matricule,
        departement: formData.departement,
        salaireHoraire: formData.salaire_horaire,
        lieuTravail: formData.lieu_travail,
        dateEmbauche: formatPromesseDateLongFr(formData.date_embauche),
        pdfDataUri: pdfUri,
        contactPhone: formData.company_contact_phone,
        contactEmail: formData.company_contact_email
      });

      if (res.success) {
        setFeedback({
          type: 'success',
          text: `Promesse d'embauche transmise avec succès par email à ${formData.email} !`
        });
      } else {
        setFeedback({
          type: 'error',
          text: `Échec d'envoi : ${res.error || 'Vérifiez la configuration EmailJS.'}`
        });
      }
    } catch (err) {
      console.error('Erreur envoi email promesse:', err);
      setFeedback({
        type: 'error',
        text: "Une erreur est survenue lors de l'envoi de l'email."
      });
    } finally {
      setIsSendingMail(false);
    }
  };

  // Construction du corps HTML pour l'aperçu visuel interactif
  const buildPromesseHtml = (): string => {
    const missionsListHtml = (formData.responsabilites || [])
      .map(
        (m, idx) => `
        <li style="margin-bottom: 6px; padding-left: 4px;">
          <strong style="color: #0B2545;">• ${idx + 1}.</strong> ${m}
        </li>`
      )
      .join('');

    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.5; font-size: 13px;">
        <div style="text-align: center; border-bottom: 2px solid #0B2545; padding-bottom: 14px; margin-bottom: 18px;">
          <h1 style="color: #0B2545; font-size: 20px; font-weight: 800; text-transform: uppercase; margin: 0 0 6px 0; letter-spacing: 0.5px;">
            PROMESSE D'EMBAUCHE OFFICIELLE
          </h1>
          <p style="margin: 0; font-size: 11px; color: #64748b; font-weight: 600;">
            Réf. Candidature / Matricule RH : <span style="color: #D4A017; font-family: monospace; font-size: 13px; font-weight: 700;">${formData.matricule}</span>
            &nbsp;·&nbsp; Établi le : ${formData.date_etablissement} à Surrey (Colombie-Britannique, Canada)
          </p>
        </div>

        <div style="background-color: #f8fafc; border-left: 4px solid #0B2545; padding: 12px 16px; margin-bottom: 16px; border-radius: 4px;">
          <p style="margin: 0 0 6px 0; font-size: 13px;">
            Nous avons l'honneur de vous confirmer officiellement par la présente notre ferme engagement de recrutement pour le compte de notre société :
          </p>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 12px; margin-top: 8px;">
            <div>
              <span style="color: #64748b; font-size: 10px; text-transform: uppercase; font-weight: 700; display: block;">Bénéficiaire / Salarié</span>
              <strong style="color: #0B2545; font-size: 14px;">${formData.nom_complet}</strong><br/>
              Nationalité : ${formData.nationalite} &nbsp;|&nbsp; Sexe : ${formData.sexe}<br/>
              Pièce d'Identité : <span style="font-family: monospace;">${formData.numero_piece_identite || 'C01294857'}</span>
            </div>
            <div>
              <span style="color: #64748b; font-size: 10px; text-transform: uppercase; font-weight: 700; display: block;">Employeur (Canada)</span>
              <strong style="color: #0B2545; font-size: 14px;">ATLANTIC TRANSPORT LTD</strong><br/>
              King George Blvd, Surrey, BC V3T 2W1, Canada<br/>
              Directeur RH : ${formData.manager || 'ANTOINE FORESTIN'}
            </div>
          </div>
        </div>

        <div style="margin-bottom: 16px;">
          <h3 style="color: #0B2545; font-size: 14px; font-weight: 700; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 8px;">
            1. Caractéristiques du Poste &amp; Rémunération Horaire Conforme BC
          </h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
            <tbody>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 6px 0; color: #64748b; width: 40%;">Poste Attribué :</td>
                <td style="padding: 6px 0; font-weight: 700; color: #0B2545;">${formData.poste}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 6px 0; color: #64748b;">Département :</td>
                <td style="padding: 6px 0; font-weight: 600;">${formData.departement}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 6px 0; color: #64748b;">Type de Contrat :</td>
                <td style="padding: 6px 0; font-weight: 600; color: #0284c7;">${formData.type_contrat}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9; background-color: #fffbeb;">
                <td style="padding: 6px 8px; color: #92400e; font-weight: 700;">Salaire Horaire Brut :</td>
                <td style="padding: 6px 8px; font-weight: 800; color: #b45309; font-size: 14px;">
                  ${formData.salaire_horaire} CAD par heure
                </td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 6px 0; color: #64748b;">Date Prévue d'Entrée en Fonction :</td>
                <td style="padding: 6px 0; font-weight: 700;">${formData.date_embauche}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 6px 0; color: #64748b;">Lieu d'Affectation :</td>
                <td style="padding: 6px 0;">${formData.lieu_travail}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 6px 0; color: #64748b;">Horaires Hebdomadaires :</td>
                <td style="padding: 6px 0;">${formData.horaire}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Identifiant EIMT / NI :</td>
                <td style="padding: 6px 0; font-family: monospace; font-weight: 700;">${formData.ni || 'BC1129970'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style="margin-bottom: 18px;">
          <h3 style="color: #0B2545; font-size: 14px; font-weight: 700; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 8px;">
            2. Principales Missions &amp; Responsabilités
          </h3>
          <ul style="margin: 0; padding-left: 18px; font-size: 12px; color: #334155;">
            ${missionsListHtml}
          </ul>
        </div>

        <div style="background-color: #f1f5f9; padding: 10px 14px; border-radius: 6px; font-size: 11px; color: #475569; margin-bottom: 20px;">
          <strong>Engagement Juridique :</strong> La présente promesse d'embauche vaut engagement ferme sous réserve de l'obtention des autorisations d'emploi et visas d'immigration requis délivrés par les autorités canadiennes (IRCC).
        </div>

        <div style="display: flex; justify-content: space-between; align-items: flex-end; padding-top: 10px; border-top: 1px solid #e2e8f0;">
          <div style="font-size: 11px; color: #64748b;">
            Pour l'Employeur :<br/>
            <strong>${formData.manager || 'ANTOINE FORESTIN'}</strong><br/>
            Directeur Général &amp; Ressources Humaines<br/>
            Atlantic Transport Ltd
          </div>
          <div style="font-size: 11px; text-align: right; color: #64748b;">
            Pour Accord et Acceptation :<br/>
            <strong>${formData.nom_complet}</strong><br/>
            Signature précédée de « Bon pour accord » :<br/>
            <span style="font-style: italic; color: #94a3b8;">[Signature du Candidat]</span>
          </div>
        </div>
      </div>
    `;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-5xl w-full p-4 sm:p-6 shadow-2xl my-4 max-h-[94vh] flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 mb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0B2545] text-amber-400 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                  {formData.matricule}
                </span>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                  · Promesse d&apos;Embauche Officielle (Admin Privé)
                </span>
              </div>
              <h2 className="font-display font-bold text-lg sm:text-xl text-[#0B2545]">
                {formData.nom_complet} — {formData.poste}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[38px] px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>← Retour</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[38px] min-w-[38px] rounded-xl bg-slate-100 hover:bg-red-50 hover:text-red-600 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-3 rounded-xl mb-3 text-xs sm:text-sm font-medium flex items-center justify-between shrink-0 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : feedback.type === 'error'
                ? 'bg-red-50 text-red-800 border border-red-200'
                : 'bg-blue-50 text-blue-800 border border-blue-200'
            }`}
          >
            <span>{feedback.text}</span>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-slate-400 hover:text-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* View Switcher Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveView('preview')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeView === 'preview'
                  ? 'bg-white text-[#0B2545] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Eye className="w-3.5 h-3.5 text-amber-500" />
              <span>Aperçu Visuel &amp; Édition Directe</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView('form')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeView === 'form'
                  ? 'bg-white text-[#0B2545] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-sky-600" />
              <span>Formulaire Détaillé &amp; Données</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsForcusOpen(true)}
              className="min-h-[36px] px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-300 text-[#0B2545] text-xs font-bold hover:bg-amber-100 flex items-center gap-1.5 cursor-pointer"
              title="Ouvrir la promesse d'embauche dans FORCUS (Éditeur Word 2013 In-Place)"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>FORCUS In-Place</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              className="min-h-[36px] px-3.5 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Télécharger PDF</span>
            </button>

            <button
              type="button"
              onClick={handleSaveToFirestore}
              disabled={isSaving}
              className="min-h-[36px] px-4 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>{isSaving ? 'Enregistrement...' : 'Enregistrer dans la Base'}</span>
            </button>

            <button
              type="button"
              onClick={handleSendViaEmailJs}
              disabled={isSendingMail}
              className="min-h-[36px] px-3.5 py-1.5 rounded-xl bg-[#0B2545] text-white text-xs font-bold hover:bg-[#134074] disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Envoyer la promesse d'embauche par email au salarié (EmailJS gratuit)"
            >
              {isSendingMail ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5 text-amber-400" />}
              <span>{isSendingMail ? 'Envoi...' : 'Envoyer par Email'}</span>
            </button>
          </div>
        </div>

        {/* Body content based on active view */}
        <div className="flex-1 overflow-y-auto pr-1">
          {activeView === 'preview' ? (
            <div className="space-y-4">
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                <Edit3 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Aperçu interactif fidèle :</strong> Vous pouvez cliquer et éditer directement le texte ci-dessous (corrections, suppressions, ajouts). Toute modification sera fidèlement conservée et imprimée dans le PDF officiel lors du téléchargement.
                </span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50 p-2 sm:p-4">
                <InteractiveDocumentCanvas
                  title={`Promesse d'Embauche — ${formData.nom_complet}`}
                  documentTypeLabel="PROMESSE D'EMBAUCHE OFFICIELLE"
                  assetsConfig={normalizePdfAssetsConfig(getSavedPdfAssetsConfig())}
                  htmlEmailContent={buildPromesseHtml()}
                  onDownloadPdf={handleDownloadPdf}
                  onOpenForcusEditor={() => setIsForcusOpen(true)}
                  onTextEdited={(updatedText) => setCustomVisualText(updatedText)}
                  onOpenInWebmail={() => {
                    if (onOpenInWebmail) {
                      onOpenInWebmail(buildPromesseHtml());
                    }
                  }}
                >
                  <div
                    dangerouslySetInnerHTML={{ __html: customVisualText || buildPromesseHtml() }}
                    className="p-6 bg-white min-h-[500px]"
                  />
                </InteractiveDocumentCanvas>
              </div>
            </div>
          ) : (
            /* FORMULAIRE DETAILLE */
            <div className="space-y-5 py-2">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
                <h3 className="font-bold text-sm text-[#0B2545] flex items-center gap-2">
                  <User className="w-4 h-4 text-amber-500" />
                  <span>1. Identité du Salarié / Candidat</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nom complet du candidat *
                    </label>
                    <input
                      type="text"
                      value={formData.nom_complet}
                      onChange={(e) => setFormData({ ...formData, nom_complet: e.target.value })}
                      className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Civilité / Sexe *
                    </label>
                    <select
                      value={formData.sexe}
                      onChange={(e) => setFormData({ ...formData, sexe: e.target.value })}
                      className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                    >
                      <option value="Masculin">Masculin</option>
                      <option value="Féminin">Féminin</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Date de naissance *
                    </label>
                    <input
                      type="date"
                      value={formData.date_naissance}
                      onChange={(e) => setFormData({ ...formData, date_naissance: e.target.value })}
                      className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nationalité *
                    </label>
                    <input
                      type="text"
                      value={formData.nationalite}
                      onChange={(e) => setFormData({ ...formData, nationalite: e.target.value })}
                      className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      N° Passeport / Pièce d&apos;identité *
                    </label>
                    <input
                      type="text"
                      value={formData.numero_piece_identite || ''}
                      onChange={(e) => setFormData({ ...formData, numero_piece_identite: e.target.value })}
                      className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold"
                      placeholder="Ex: C01294857"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Contact d&apos;urgence (Nom &amp; N°)
                    </label>
                    <input
                      type="text"
                      value={formData.contact_urgence || ''}
                      onChange={(e) => setFormData({ ...formData, contact_urgence: e.target.value })}
                      className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 text-xs"
                      placeholder="Ex: Marie Dupont (+33 6...)"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200 space-y-4">
                <h3 className="font-bold text-sm text-[#0B2545] flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-amber-600" />
                  <span>2. Poste, Salaire Horaire &amp; Conditions d&apos;Emploi</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Poste attribué *
                    </label>
                    <input
                      type="text"
                      value={formData.poste}
                      onChange={(e) => setFormData({ ...formData, poste: e.target.value })}
                      className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Département *
                    </label>
                    <input
                      type="text"
                      value={formData.departement}
                      onChange={(e) => setFormData({ ...formData, departement: e.target.value })}
                      className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-amber-900 mb-1">
                      Salaire horaire ($ CAD / h) *
                    </label>
                    <input
                      type="number"
                      step="0.25"
                      value={formData.salaire_horaire}
                      onChange={(e) => setFormData({ ...formData, salaire_horaire: parseFloat(e.target.value) || 0 })}
                      className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-amber-400 text-xs font-mono font-bold text-amber-800 bg-amber-50/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Date d&apos;embauche (Prévue) *
                    </label>
                    <input
                      type="date"
                      value={formData.date_embauche}
                      onChange={(e) => setFormData({ ...formData, date_embauche: e.target.value })}
                      className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Date d&apos;établissement *
                    </label>
                    <input
                      type="date"
                      value={formData.date_etablissement}
                      onChange={(e) => setFormData({ ...formData, date_etablissement: e.target.value })}
                      className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      N° EIMT / Dossier IRCC (NI) *
                    </label>
                    <input
                      type="text"
                      value={formData.ni || ''}
                      onChange={(e) => setFormData({ ...formData, ni: e.target.value })}
                      className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold"
                      placeholder="Ex: BC1129970"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Lieu d&apos;affectation *
                    </label>
                    <input
                      type="text"
                      value={formData.lieu_travail}
                      onChange={(e) => setFormData({ ...formData, lieu_travail: e.target.value })}
                      className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Manager / Superviseur *
                    </label>
                    <input
                      type="text"
                      value={formData.manager || ''}
                      onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                      className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Missions &amp; Responsabilités spécifiques (une par ligne) :
                  </label>
                  <textarea
                    rows={4}
                    value={responsabilitesText}
                    onChange={(e) => handleMissionsChange(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-sans leading-relaxed"
                    placeholder="Entrez les principales responsabilités..."
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FORCUS In-Place Modal */}
        {isForcusOpen && (
          <ForcusWordEditor
            isEmbeddedModal={true}
            initialTitle={`Promesse d'Embauche — ${formData.nom_complet}`}
            initialHtmlContent={buildPromesseHtml()}
            onApplyToDocument={(newHtml) => {
              setCustomVisualText(newHtml);
              setIsForcusOpen(false);
              setFeedback({
                type: 'success',
                text: 'Modifications FORCUS appliquées avec succès à la promesse d’embauche !'
              });
            }}
            onClose={() => setIsForcusOpen(false)}
          />
        )}
      </div>
    </div>
  );
};
