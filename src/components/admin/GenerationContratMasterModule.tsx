import React, { useState, useEffect } from 'react';
import {
  FileText,
  Briefcase,
  Ticket,
  Layers,
  Download,
  Copy,
  Check,
  Globe,
  Building2,
  Calendar,
  DollarSign,
  User,
  ShieldCheck,
  Send,
  Printer,
  Sparkles,
  RefreshCw,
  QrCode,
  FileCheck2,
  Upload,
  UserCheck,
  UserX,
  ExternalLink,
  ChevronRight,
  Eye
} from 'lucide-react';
import { SiteSettings, Employee } from '../../types';
import {
  PrestationContractData,
  TicketEntretienData,
  AnnonceGabaritData,
  buildDefaultPrestationContract,
  buildDefaultTicketEntretien,
  buildDefaultAnnonceGabarit,
  formatAnnonceGabaritAsPlainText,
  generatePrestationContractPdf,
  generateTicketEntretienPdf,
  saveInterviewSession,
  generateSmallStackedBarcodeCanvasDataUrl
} from '../../services/contractGenerationService';
import {
  JobOfferData,
  buildDefaultJobOfferForPoste,
  generateJobOfferPdf,
  downloadJobOfferPdf,
  publishJobOffer,
  unpublishJobOffer,
  getAllAvailablePostes
} from '../../services/jobOfferService';
import { searchOrRegisterPoste } from '../../services/posteCatalogService';
import { addEmployee, getEmployees } from '../../services/staticStorage';
import { JobOfferGeneratorModal } from './JobOfferGeneratorModal';
import { BrandLogo } from '../BrandLogo';

interface GenerationContratMasterModuleProps {
  settings: SiteSettings;
  onOpenInWebmail?: (html: string) => void;
  onEmployeeCreated?: (emp: Employee) => void;
}

export const GenerationContratMasterModule: React.FC<GenerationContratMasterModuleProps> = ({
  settings,
  onOpenInWebmail,
  onEmployeeCreated
}) => {
  // Onglet actif :
  // 'prestation' : Contrat de prestation CRIC
  // 'ticket'     : Ticket d'entretien d'embauche avec code-barres
  // 'offre'      : Offre d'emploi & Annonce gabarit CNP
  // 'bundle'     : Bundle assemblé multi-pages (Offre + Prestation + Ticket)
  // 'models5'    : 5 Modèles au choix & Édition pour X entreprise
  const [activeSubTab, setActiveSubTab] = useState<
    'prestation' | 'ticket' | 'offre' | 'bundle' | 'models5'
  >('prestation');

  // Données Contrat de prestation
  const [prestation, setPrestation] = useState<PrestationContractData>(() =>
    buildDefaultPrestationContract(settings)
  );

  // Données Ticket d'entretien
  const [ticket, setTicket] = useState<TicketEntretienData>(() =>
    buildDefaultTicketEntretien('JEAN DUPONT', 'Conducteur Routier International (H/F)', settings, prestation.codeIdCandidature)
  );

  // Données Annonce gabarit
  const [annonce, setAnnonce] = useState<AnnonceGabaritData>(() =>
    buildDefaultAnnonceGabarit('Conducteur Routier International (H/F)', settings)
  );

  // Données Offre d'emploi
  const [jobOffer, setJobOffer] = useState<JobOfferData>(() =>
    buildDefaultJobOfferForPoste('Conducteur Routier International', undefined, settings)
  );

  // États "5 modèles au choix"
  const [enable5Models, setEnable5Models] = useState(false);
  const [selectedModelIdx, setSelectedModelIdx] = useState(0);
  const [registerAsEmployeeOnSite, setRegisterAsEmployeeOnSite] = useState(true);

  // Mode "Édition pour X entreprise"
  const [isCustomCompanyMode, setIsCustomCompanyMode] = useState(false);
  const [customCompanyName, setCustomCompanyName] = useState(settings.company_name);
  const [customDirigeant, setCustomDirigeant] = useState('Direction Générale');
  const [customSiege, setCustomSiege] = useState(settings.address);
  const [customNe, setCustomNe] = useState('799094917');
  const [customBcReg, setCustomBcReg] = useState('BC1129970');
  const [customLogoUrl, setCustomLogoUrl] = useState(settings.logo_url);
  const [customSignatureUrl, setCustomSignatureUrl] = useState('');
  const [customCachetUrl, setCustomCachetUrl] = useState('');

  // Notifications
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Synchronisation du code de candidature entre le contrat de prestation et le ticket d'entretien
  useEffect(() => {
    setTicket((prev) => ({
      ...prev,
      codeIdCandidature: prestation.codeIdCandidature,
      posteConcerne: prestation.posteCible,
      codeCnp: prestation.codeCnp
    }));
  }, [prestation.codeIdCandidature, prestation.posteCible, prestation.codeCnp]);

  // Sauvegarde automatique de la session d'entretien
  useEffect(() => {
    saveInterviewSession(ticket);
  }, [ticket]);

  // 5 Modèles pré-configurés
  const FIVE_MODELS = [
    {
      id: 'mod_1',
      titre: 'Modèle 1 : Transport Routier & Logistique Multimodale Canada',
      description: 'Adapté aux conducteurs routiers classe 1, exploitants de flotte et répartiteurs fret.',
      typeContrat: 'CDI Temps Plein (40h/semaine)',
      salaireRef: '30.50 CAD / h (4 880 CAD / mois)',
      cnp: '73300'
    },
    {
      id: 'mod_2',
      titre: 'Modèle 2 : Douanes, Transit International & Affrètement',
      description: 'Pour déclarants en douane, transitaires CBSA/OEA et spécialistes conformité import/export.',
      typeContrat: 'CDI Temps Plein (37.5h/semaine)',
      salaireRef: '33.50 CAD / h (5 440 CAD / mois)',
      cnp: '12200'
    },
    {
      id: 'mod_3',
      titre: 'Modèle 3 : Logistique, Entrepôt & Gestion des Stocks (WMS)',
      description: 'Pour caristes, magasiniers, gestionnaires d’inventaire et préparateurs de commandes.',
      typeContrat: 'CDI Temps Plein (40h/semaine)',
      salaireRef: '26.50 CAD / h (4 240 CAD / mois)',
      cnp: '75101'
    },
    {
      id: 'mod_4',
      titre: 'Modèle 4 : Santé, Sécurité & Mieux-être au Travail (SSMT / WorkSafeBC)',
      description: 'Pour infirmiers d’entreprise, coordonnateurs SST et préventeurs des risques professionnels.',
      typeContrat: 'CDI Temps Plein (37.5h/semaine)',
      salaireRef: '44.00 CAD / h (7 040 CAD / mois)',
      cnp: '31301'
    },
    {
      id: 'mod_5',
      titre: 'Modèle 5 : Maintenance Industrielle, Atelier & Gestion du Parc Poids Lourds',
      description: 'Pour mécaniciens diesel véhicules lourds, électromécaniciens et techniciens GMAO.',
      typeContrat: 'CDI Temps Plein (40h/semaine)',
      salaireRef: '37.50 CAD / h (6 000 CAD / mois)',
      cnp: '72401'
    }
  ];

  // Helper Toast Copie
  const triggerCopied = (msg: string) => {
    setCopiedNotification(msg);
    setTimeout(() => setCopiedNotification(null), 3000);
  };

  // 1. Télécharger PDF Contrat de Prestation CRIC
  const handleDownloadPrestationPdf = async () => {
    try {
      setDownloadingPdf(true);
      const { doc, filename } = await generatePrestationContractPdf(
        prestation,
        isCustomCompanyMode ? customLogoUrl : settings.logo_url
      );
      doc.save(filename);
    } catch (err) {
      console.error('Erreur téléchargement prestation:', err);
    } finally {
      setDownloadingPdf(false);
    }
  };

  // 2. Télécharger PDF Ticket d'Entretien
  const handleDownloadTicketPdf = async () => {
    try {
      setDownloadingPdf(true);
      const { doc, filename } = await generateTicketEntretienPdf(
        ticket,
        isCustomCompanyMode ? customLogoUrl : settings.logo_url
      );
      doc.save(filename);
    } catch (err) {
      console.error('Erreur téléchargement ticket:', err);
    } finally {
      setDownloadingPdf(false);
    }
  };

  // 3. Télécharger Bundle Multi-Pages Assemblé (Offre + Contrat Prestation + Ticket)
  const handleDownloadAssembledBundlePdf = async () => {
    try {
      setDownloadingPdf(true);

      // Générer l'offre d'emploi
      const { doc: offerDoc } = await generateJobOfferPdf(
        jobOffer,
        isCustomCompanyMode ? customLogoUrl : settings.logo_url
      );

      // Générer le contrat de prestation
      const { doc: prestDoc } = await generatePrestationContractPdf(
        prestation,
        isCustomCompanyMode ? customLogoUrl : settings.logo_url
      );

      // Générer le ticket
      const { doc: ticketDoc } = await generateTicketEntretienPdf(
        ticket,
        isCustomCompanyMode ? customLogoUrl : settings.logo_url
      );

      // Télécharger les 3 documents séparément ou l'offre master
      offerDoc.save(`1_Offre_Emploi_${jobOffer.reference}.pdf`);
      prestDoc.save(`2_Contrat_Prestation_CRIC_${prestation.referenceContrat}.pdf`);
      ticketDoc.save(`3_Ticket_Entretien_${ticket.codeIdCandidature}.pdf`);

      triggerCopied('3 Fichiers PDF officiels assemblés générés et téléchargés avec succès !');
    } catch (err) {
      console.error('Erreur bundle assemblé:', err);
    } finally {
      setDownloadingPdf(false);
    }
  };

  // 4. Copier Code Mail HTML du contrat de prestation
  const handleCopyHtmlMailPrestation = () => {
    const html = `<div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; border: 1px solid #CBD5E1; border-radius: 8px; overflow: hidden;">
  <div style="background-color: #0B2545; color: #FFFFFF; padding: 20px; text-align: center;">
    <h2 style="margin: 0; font-size: 20px; color: #F59E0B;">${prestation.clientNomLegal}</h2>
    <p style="margin: 5px 0 0 0; font-size: 13px; color: #CBD5E1;">ACCORD DE PRESTATION CRIC &amp; RECRUTEMENT INTERNATIONAL</p>
  </div>
  <div style="padding: 24px; color: #1E293B; line-height: 1.6; font-size: 14px;">
    <p>Madame, Monsieur,</p>
    <p>Nous vous transmettons le <strong>Contrat de Prestation de Recrutement et d'Immigration (LIPR / IRCC)</strong> portant la référence <strong>${prestation.referenceContrat}</strong>.</p>
    <div style="background-color: #F8FAFC; border-left: 4px solid #0066B3; padding: 12px 16px; margin: 16px 0;">
      <p style="margin: 0 0 6px 0;"><strong>Poste concerné :</strong> ${prestation.posteCible} (Code CNP ${prestation.codeCnp})</p>
      <p style="margin: 0 0 6px 0;"><strong>Mandataire accrédité :</strong> ${prestation.prestataireNomLegal} (Permis ${prestation.prestataireNumeroPermis})</p>
      <p style="margin: 0;"><strong>Code ID Candidature sécurisé :</strong> <span style="font-family: monospace; font-size: 16px; color: #0066B3; font-weight: bold;">${prestation.codeIdCandidature}</span></p>
    </div>
    <p>Ce code permet au candidat de déverrouiller son entretien d'embauche en ligne sur la plateforme sécurisée de l'entreprise.</p>
    <p style="margin-top: 24px;">Veuillez agréer nos salutations distinguées.<br/><strong>Direction des Ressources Humaines &amp; Recrutement</strong><br/>${prestation.clientNomLegal}</p>
  </div>
</div>`;

    navigator.clipboard.writeText(html);
    triggerCopied('Code Mail HTML copié dans le presse-papier !');
    if (onOpenInWebmail) {
      onOpenInWebmail(html);
    }
  };

  // 5. Enregistrer le salarié sur le site si option "Inscrire salarié sur le site" est sélectionnée
  const handleRegisterEmployeeNow = () => {
    const matricule = `EMP${Math.floor(1000 + Math.random() * 9000)}`;
    const newEmp: Employee = {
      id: Date.now(),
      matricule,
      civilite: 'Monsieur',
      nom_complet: ticket.candidatNom.toUpperCase(),
      prenom: ticket.candidatNom.split(' ')[0] || 'Candidat',
      nom: ticket.candidatNom.split(' ').slice(1).join(' ') || ticket.candidatNom,
      email: ticket.candidatEmail,
      telephone: ticket.candidatTelephone,
      adresse: 'King George Blvd, Surrey, BC V3T 2W1, Canada',
      date_naissance: '1992-06-14',
      nationalite: ticket.candidatNationalite || 'Canadienne',
      poste: ticket.posteConcerne,
      departement: ticket.departement,
      type_contrat: 'CDI',
      date_effet: new Date().toISOString().slice(0, 10),
      date_embauche: new Date().toISOString().slice(0, 10),
      duree_periode_essai: '3 semaines',
      lieu_travail: 'Surrey, Colombie-Britannique (Canada)',
      horaires: '40 heures par semaine (du lundi au vendredi)',
      salaire: 4800,
      salaire_horaire: 30.0,
      devise: 'CAD',
      hebergement_fourni: false,
      photo: '',
      photo_url: '',
      contrat_pdf_url: '',
      has_custom_pdf: false,
      must_change_password: false,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    addEmployee(newEmp);
    if (onEmployeeCreated) {
      onEmployeeCreated(newEmp);
    }
    setSaveStatus(`Salarié ${newEmp.nom_complet} (${newEmp.matricule}) inscrit avec succès dans la base de données du site !`);
    setTimeout(() => setSaveStatus(null), 4000);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* En-tête du Module Maître */}
      <div className="bg-[#0B2545] text-white p-5 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-amber-400/20">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold bg-amber-400/10 px-2 py-0.5 rounded">
                Espace Admin RH
              </span>
              <span className="text-xs text-slate-300">· Module Maître Centralisé</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white mt-0.5">
              Génération Contrat &amp; Documents Officiels
            </h2>
          </div>
        </div>

        {/* Boutons d'action rapides */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadAssembledBundlePdf}
            disabled={downloadingPdf}
            className="min-h-[40px] px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50 transition-all"
            title="Générer et télécharger l'ensemble assemblé (Offre + Contrat de Prestation + Ticket d'entretien)"
          >
            <Layers className="w-4 h-4 text-slate-950" />
            <span>{downloadingPdf ? 'Génération...' : 'Télécharger Bundle Assemblé (3 Docs)'}</span>
          </button>
        </div>
      </div>

      {/* Notifications Toast */}
      {copiedNotification && (
        <div className="bg-emerald-600 text-white text-xs px-6 py-2.5 flex items-center justify-between font-medium shadow-md">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-200" />
            <span>{copiedNotification}</span>
          </div>
          <span className="text-[10px] underline cursor-pointer" onClick={() => setCopiedNotification(null)}>
            Fermer
          </span>
        </div>
      )}

      {saveStatus && (
        <div className="bg-blue-600 text-white text-xs px-6 py-2.5 flex items-center justify-between font-medium shadow-md">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-blue-200" />
            <span>{saveStatus}</span>
          </div>
          <span className="text-[10px] underline cursor-pointer" onClick={() => setSaveStatus(null)}>
            Fermer
          </span>
        </div>
      )}

      {/* BARRE D'ONGLETS / SOUS-MODULES */}
      <div className="flex items-center border-b border-slate-200 bg-slate-50 px-5 pt-3 gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveSubTab('prestation')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold rounded-t-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeSubTab === 'prestation'
              ? 'bg-white text-[#0B2545] border-t-2 border-[#0B2545] shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4 text-[#0066B3]" />
          <span>1. Contrat de Prestation CRIC</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('ticket')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold rounded-t-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeSubTab === 'ticket'
              ? 'bg-white text-[#0B2545] border-t-2 border-[#0B2545] shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Ticket className="w-4 h-4 text-amber-600" />
          <span>2. Ticket d’Entretien (Coupon &amp; Barcode)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('offre')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold rounded-t-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeSubTab === 'offre'
              ? 'bg-white text-[#0B2545] border-t-2 border-[#0B2545] shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Briefcase className="w-4 h-4 text-emerald-600" />
          <span>3. Offres d’Emploi &amp; Annonce Gabarit CNP</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('models5')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold rounded-t-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeSubTab === 'models5'
              ? 'bg-white text-[#0B2545] border-t-2 border-[#0B2545] shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-4 h-4 text-purple-600" />
          <span>4. 5 Modèles au Choix &amp; Import Entreprise</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('bundle')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold rounded-t-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeSubTab === 'bundle'
              ? 'bg-white text-[#0B2545] border-t-2 border-[#0B2545] shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4 text-amber-500" />
          <span>5. Bundle Assemblé (3 Docs)</span>
        </button>
      </div>

      {/* CONTENU DU SOUS-MODULE SÉLECTIONNÉ */}
      <div className="p-6">
        {/* ========================================================================= */}
        {/* SOUS-MODULE 1 : CONTRAT DE PRESTATION CRIC */}
        {/* ========================================================================= */}
        {activeSubTab === 'prestation' && (
          <div className="space-y-6">
            <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 text-blue-900">
                <ShieldCheck className="w-5 h-5 text-[#0066B3] shrink-0" />
                <div>
                  <strong>Accord officiel conforme à la Loi sur l&apos;immigration (LIPR) &amp; Démarches EIMT :</strong><br />
                  Contrat de prestation liant l&apos;Employeur canadien et le Cabinet CRIC accrédité. Réf : <span className="font-mono font-bold">{prestation.referenceContrat}</span>.
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyHtmlMailPrestation}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-[#0B2545] border border-slate-300 font-bold text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-[#0066B3]" />
                  <span>Code Mail HTML</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPrestationPdf}
                  disabled={downloadingPdf}
                  className="px-3.5 py-1.5 rounded-xl bg-[#0B2545] hover:bg-[#134074] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span>Télécharger PDF (2 Pages)</span>
                </button>
              </div>
            </div>

            {/* Formulaire de configuration des parties */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              {/* Client (Employeur) */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <h3 className="font-bold text-sm text-[#0B2545] flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#0066B3]" />
                  <span>Partie 1 : L’Employeur (Le Client)</span>
                </h3>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Nom légal de l’entreprise</label>
                  <input
                    type="text"
                    value={prestation.clientNomLegal}
                    onChange={(e) => setPrestation({ ...prestation, clientNomLegal: e.target.value })}
                    className="w-full min-h-[38px] px-3 rounded-xl border border-slate-300 bg-white font-bold"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Numéro NE</label>
                    <input
                      type="text"
                      value={prestation.clientNe}
                      onChange={(e) => setPrestation({ ...prestation, clientNe: e.target.value })}
                      className="w-full min-h-[38px] px-3 rounded-xl border border-slate-300 bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">BC Reg #</label>
                    <input
                      type="text"
                      value={prestation.clientBcReg}
                      onChange={(e) => setPrestation({ ...prestation, clientBcReg: e.target.value })}
                      className="w-full min-h-[38px] px-3 rounded-xl border border-slate-300 bg-white font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Siège social complet</label>
                  <input
                    type="text"
                    value={prestation.clientSiegeSocial}
                    onChange={(e) => setPrestation({ ...prestation, clientSiegeSocial: e.target.value })}
                    className="w-full min-h-[38px] px-3 rounded-xl border border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Représentant &amp; Titre</label>
                  <input
                    type="text"
                    value={prestation.clientRepresentantNom}
                    onChange={(e) => setPrestation({ ...prestation, clientRepresentantNom: e.target.value })}
                    className="w-full min-h-[38px] px-3 rounded-xl border border-slate-300 bg-white"
                  />
                </div>
              </div>

              {/* Prestataire (CRIC / Mandataire) */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <h3 className="font-bold text-sm text-[#0B2545] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Partie 2 : Le Prestataire (Cabinet CRIC)</span>
                </h3>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Nom légal du Cabinet / Consultant</label>
                  <input
                    type="text"
                    value={prestation.prestataireNomLegal}
                    onChange={(e) => setPrestation({ ...prestation, prestataireNomLegal: e.target.value })}
                    className="w-full min-h-[38px] px-3 rounded-xl border border-slate-300 bg-white font-bold"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Consultant CRIC</label>
                    <input
                      type="text"
                      value={prestation.prestataireRepresentantNom}
                      onChange={(e) => setPrestation({ ...prestation, prestataireRepresentantNom: e.target.value })}
                      className="w-full min-h-[38px] px-3 rounded-xl border border-slate-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Numéro permis CCIC</label>
                    <input
                      type="text"
                      value={prestation.prestataireNumeroPermis}
                      onChange={(e) => setPrestation({ ...prestation, prestataireNumeroPermis: e.target.value })}
                      className="w-full min-h-[38px] px-3 rounded-xl border border-slate-300 bg-white font-mono text-[#0066B3] font-bold"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Poste ciblé &amp; Code CNP</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={prestation.posteCible}
                      onChange={(e) => setPrestation({ ...prestation, posteCible: e.target.value })}
                      className="flex-1 min-h-[38px] px-3 rounded-xl border border-slate-300 bg-white font-bold text-[#1D4F88]"
                    />
                    <input
                      type="text"
                      value={prestation.codeCnp}
                      onChange={(e) => setPrestation({ ...prestation, codeCnp: e.target.value })}
                      placeholder="CNP 73300"
                      className="w-24 min-h-[38px] px-2 rounded-xl border border-slate-300 bg-white font-mono text-center font-bold"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Code ID Candidature généré pour l&apos;entretien</label>
                  <input
                    type="text"
                    value={prestation.codeIdCandidature}
                    onChange={(e) => setPrestation({ ...prestation, codeIdCandidature: e.target.value })}
                    className="w-full min-h-[38px] px-3 rounded-xl border border-slate-300 bg-white font-mono text-[#0066B3] font-bold tracking-wider"
                  />
                </div>
              </div>
            </div>

            {/* Aperçu du texte contractuel intégral */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wide text-slate-700">
                Aperçu du texte contractuel (Articles 1 à 6 conformes au modèle officiel) :
              </h4>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs font-mono leading-relaxed max-h-72 overflow-y-auto whitespace-pre-wrap">
{`ENTRE LES SOUSSIGNÉS :
${prestation.clientNomLegal}, société dûment constituée selon les lois de ${prestation.clientProvince}, ayant son siège social au ${prestation.clientSiegeSocial}, représentée par ${prestation.clientRepresentantNom}, agissant en qualité de ${prestation.clientRepresentantTitre}, ci-après désignée « le Client » ou « l'Employeur ».

ET

${prestation.prestataireNomLegal}, ${prestation.prestataireStatutJuridique}, ayant son siège social au ${prestation.prestataireSiegeSocial}, représentée par ${prestation.prestataireRepresentantNom}, ${prestation.prestataireTitre} portant le permis ${prestation.prestataireNumeroPermis}, ci-après désignée « le Prestataire » ou « le Mandataire ».

PRÉAMBULE
Considérant que le Client fait face à des besoins accrus de main-d'œuvre qualifiée et souhaite recruter des travailleurs pour combler le poste de ${prestation.posteCible} (CNP ${prestation.codeCnp}) au Canada ;
Considérant que le Prestataire possède l'expertise, les licences provinciales et l'accréditation légale requise (CCIC / CRIC) pour piloter les démarches auprès d'Immigration, Réfugiés et Citoyenneté Canada (IRCC) ;

ARTICLE 1 : OBJET DU CONTRAT
Le présent contrat est un accord de prestation de services professionnels par lequel le Client confie au Prestataire le mandat ${prestation.typeMandat} de :
1. Sourcer, évaluer et présélectionner des candidats étrangers selon les profils de postes fournis par le Client.
2. Prendre en charge et piloter les démarches d'immigration temporaire ou permanente requises (EIMT, Permis de travail, Visa, etc.) pour introduire légalement les candidats retenus auprès d'IRCC.

ARTICLE 2 : OBLIGATIONS DES PARTIES
2.1 Obligations du Prestataire : Agir avec diligence, intégrité et professionnalisme dans le strict respect de la Loi sur l'immigration et la protection des réfugiés (LIPR) du Canada. Vérifier la validité des compétences et antécédents avant présentation.
2.2 Obligations du Client : Fournir des descriptions de poste conformes aux normes d'emploi locales (salaire médian, conditions, CNP). Assumer les frais gouvernementaux légalement à sa charge.

ARTICLE 3 : CONDITIONS FINANCIÈRES ET HONORAIRES
${prestation.grilleTarifaire}
${prestation.modalitesPaiement}

ARTICLE 4 : CONFORMITÉ ET INTERDICTION DE FACTURATION AUX CANDIDATS
Conformément aux lois canadiennes et provinciales, le Prestataire et le Client s'interdisent formellement de facturer des frais de recrutement ou de placement aux candidats.

ARTICLE 5 : DURÉE ET RÉSILIATION
Durée de ${prestation.dureeMois} mois. Préavis écrit de ${prestation.preavisJours} jours.

ARTICLE 6 : LOI APPLICABLE ET TRIBUNAL COMPÉTENT
Lois de la province de ${prestation.provinceDroit} et lois fédérales du Canada. Tribunaux de ${prestation.villeSignature}.`}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SOUS-MODULE 2 : TICKET D'ENTRETIEN D'EMBAUCHE (COUPON & BARCODE) */}
        {/* ========================================================================= */}
        {activeSubTab === 'ticket' && (
          <div className="space-y-6">
            <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 text-amber-900">
                <Ticket className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <strong>Coupon officiel de convocation avec Stacked Barcode scannable :</strong><br />
                  Le code unique <span className="font-mono font-bold text-[#0066B3]">{ticket.codeIdCandidature}</span> donne un accès instantané et sécurisé à l&apos;entretien d&apos;embauche en ligne.
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadTicketPdf}
                  disabled={downloadingPdf}
                  className="px-3.5 py-1.5 rounded-xl bg-[#0B2545] hover:bg-[#134074] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span>Télécharger Ticket (PDF A4)</span>
                </button>
              </div>
            </div>

            {/* Édition rapide du candidat */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Nom du candidat convoqué</label>
                <input
                  type="text"
                  value={ticket.candidatNom}
                  onChange={(e) => setTicket({ ...ticket, candidatNom: e.target.value })}
                  className="w-full min-h-[38px] px-3 rounded-xl border border-slate-300 bg-white font-bold uppercase text-[#0B2545]"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Poste concerné</label>
                <input
                  type="text"
                  value={ticket.posteConcerne}
                  onChange={(e) => setTicket({ ...ticket, posteConcerne: e.target.value })}
                  className="w-full min-h-[38px] px-3 rounded-xl border border-slate-300 bg-white font-bold text-[#1D4F88]"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Date &amp; Heure de l’entretien</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={ticket.dateEntretien}
                    onChange={(e) => setTicket({ ...ticket, dateEntretien: e.target.value })}
                    className="flex-1 min-h-[38px] px-3 rounded-xl border border-slate-300 bg-white"
                  />
                  <input
                    type="text"
                    value={ticket.heureEntretien}
                    onChange={(e) => setTicket({ ...ticket, heureEntretien: e.target.value })}
                    className="w-20 min-h-[38px] px-2 rounded-xl border border-slate-300 bg-white text-center font-bold"
                  />
                </div>
              </div>
            </div>

            {/* APERÇU VISUEL DU COUPON DU TICKET */}
            <div className="max-w-2xl mx-auto p-6 rounded-2xl bg-gradient-to-br from-amber-50/60 to-white border-2 border-dashed border-amber-400/80 shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-amber-300 pb-3">
                <div className="flex items-center gap-2">
                  <Ticket className="w-5 h-5 text-amber-600" />
                  <span className="font-bold text-sm text-[#0B2545]">TICKET D’ENTRETIEN D’EMBAUCHE</span>
                </div>
                <span className="font-mono text-xs font-bold text-amber-800 bg-amber-200/60 px-2.5 py-0.5 rounded-full">
                  OFFICIEL · ATLANTIC TRANSPORT LTD.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Candidat :</div>
                  <div className="text-base font-extrabold text-[#0B2545]">{ticket.candidatNom.toUpperCase()}</div>
                  <div className="text-slate-600 mt-1">Poste : <strong>{ticket.posteConcerne}</strong></div>
                  <div className="text-slate-600">Classification : <strong>CNP {ticket.codeCnp}</strong></div>
                  <div className="text-slate-600">Date : <strong>{ticket.dateEntretien} à {ticket.heureEntretien}</strong></div>
                  <div className="text-slate-600">Lieu : <strong>Surrey, BC / En ligne</strong></div>
                </div>

                <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-white border border-slate-200 text-center">
                  <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">Code ID Candidature Sécurisé :</div>
                  <div className="font-mono text-base font-black text-[#0066B3] bg-blue-50 px-3 py-1 rounded-lg border border-blue-200 mb-2">
                    {ticket.codeIdCandidature}
                  </div>
                  {/* Petit stacked barcode */}
                  <img
                    src={generateSmallStackedBarcodeCanvasDataUrl(ticket.codeIdCandidature)}
                    alt="Stacked Barcode"
                    className="w-44 h-8 object-contain mb-1"
                  />
                  <span className="text-[9px] text-slate-400">Le scan donne un accès direct à l’entretien</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-white/80 border border-amber-200 text-[11px] text-amber-900 flex items-center justify-between">
                <span>Le code sera automatiquement désactivé une fois l&apos;entretien clôturé.</span>
                <span className="font-bold text-[#0066B3]">Accès : /entretien</span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SOUS-MODULE 3 : OFFRES D'EMPLOI & ANNONCE GABARIT CNP */}
        {/* ========================================================================= */}
        {activeSubTab === 'offre' && (
          <div className="space-y-6">
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 text-emerald-900">
                <Briefcase className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <strong>Gabarit d’Annonce d’Emploi Officiel (CNP 5 chiffres) pour le site public :</strong><br />
                  Ce modèle alimente la page &quot;Nos Offres&quot; et génère la fiche de poste PDF avec code-barres scannable.
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const text = formatAnnonceGabaritAsPlainText(annonce);
                    navigator.clipboard.writeText(text);
                    triggerCopied('Annonce Gabarit copiée dans le presse-papier !');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-[#0B2545] border border-slate-300 font-bold text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-[#0066B3]" />
                  <span>Copier Annonce</span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await publishJobOffer(jobOffer);
                    triggerCopied('Offre d’emploi synchronisée et publiée sur la page "Nos Offres" !');
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Publier sur Nos Offres</span>
                </button>
              </div>
            </div>

            {/* Gabarit Annonce texte intégral */}
            <div className="bg-slate-900 text-slate-100 rounded-2xl p-5 font-mono text-xs leading-relaxed overflow-x-auto shadow-md">
              <pre className="whitespace-pre-wrap">{formatAnnonceGabaritAsPlainText(annonce)}</pre>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SOUS-MODULE 4 : 5 MODÈLES AU CHOIX & IMPORT ENTREPRISE */}
        {/* ========================================================================= */}
        {activeSubTab === 'models5' && (
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 text-purple-900">
                <Sparkles className="w-5 h-5 text-purple-600 shrink-0" />
                <div>
                  <strong>Option &quot;5 Modèles au choix&quot; &amp; Mode &quot;Édition pour X entreprise&quot; :</strong><br />
                  Permet de choisir parmi 5 modèles de contrat/promesse et d&apos;importer des coordonnées et fichiers personnalisés sans altération IA.
                </div>
              </div>
              <label className="flex items-center gap-2 font-bold text-purple-950 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-purple-300">
                <input
                  type="checkbox"
                  checked={enable5Models}
                  onChange={(e) => setEnable5Models(e.target.checked)}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                />
                <span>Activer &quot;5 Modèles au choix&quot;</span>
              </label>
            </div>

            {/* Sélection parmi les 5 modèles */}
            <div className="space-y-3">
              <h3 className="font-bold text-sm text-[#0B2545]">Sélectionnez l’un des 5 modèles officiels :</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {FIVE_MODELS.map((mod, idx) => (
                  <div
                    key={mod.id}
                    onClick={() => setSelectedModelIdx(idx)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      selectedModelIdx === idx
                        ? 'bg-blue-50/70 border-[#0B2545] shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono font-bold bg-[#0B2545] text-white px-2 py-0.5 rounded">
                          CNP {mod.cnp}
                        </span>
                        <input
                          type="radio"
                          name="model_choice"
                          checked={selectedModelIdx === idx}
                          onChange={() => setSelectedModelIdx(idx)}
                          className="w-4 h-4 text-[#0B2545]"
                        />
                      </div>
                      <h4 className="font-bold text-xs text-[#0B2545] leading-snug">{mod.titre}</h4>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{mod.description}</p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-700">
                      <span>{mod.typeContrat}</span>
                      <span className="text-emerald-700">{mod.salaireRef}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Option : Inscrire ou Ne pas inscrire le salarié sur le site */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wide text-slate-700">
                Action d&apos;enregistrement dans la base de données :
              </h4>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setRegisterAsEmployeeOnSite(true)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors ${
                    registerAsEmployeeOnSite
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-300'
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Inscrire en tant que salarié sur le site (Affiché)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRegisterAsEmployeeOnSite(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors ${
                    !registerAsEmployeeOnSite
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-300'
                  }`}
                >
                  <UserX className="w-4 h-4" />
                  <span>Ne pas inscrire (Génération document uniquement)</span>
                </button>

                {registerAsEmployeeOnSite && (
                  <button
                    type="button"
                    onClick={handleRegisterEmployeeNow}
                    className="px-4 py-2 rounded-xl bg-[#0B2545] hover:bg-[#134074] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs ml-auto"
                  >
                    <Check className="w-4 h-4 text-amber-400" />
                    <span>Inscrire le candidat maintenant</span>
                  </button>
                )}
              </div>
            </div>

            {/* Mode "Édition pour X entreprise" */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-[#0B2545]">Mode &quot;Édition pour X entreprise&quot;</h3>
                  <p className="text-xs text-slate-500">Permet d&apos;adapter les mentions contractuelles à une autre filiale ou entreprise cliente.</p>
                </div>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isCustomCompanyMode}
                    onChange={(e) => setIsCustomCompanyMode(e.target.checked)}
                    className="w-4 h-4 rounded text-[#0B2545]"
                  />
                  <span>Activer le mode personnalisation X Entreprise</span>
                </label>
              </div>

              {isCustomCompanyMode && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Nom entreprise</label>
                    <input
                      type="text"
                      value={customCompanyName}
                      onChange={(e) => setCustomCompanyName(e.target.value)}
                      className="w-full min-h-[38px] px-3 rounded-xl border border-slate-300 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Dirigeant / Signataire</label>
                    <input
                      type="text"
                      value={customDirigeant}
                      onChange={(e) => setCustomDirigeant(e.target.value)}
                      className="w-full min-h-[38px] px-3 rounded-xl border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Siège social</label>
                    <input
                      type="text"
                      value={customSiege}
                      onChange={(e) => setCustomSiege(e.target.value)}
                      className="w-full min-h-[38px] px-3 rounded-xl border border-slate-300"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SOUS-MODULE 5 : BUNDLE ASSEMBLÉ MULTI-PAGES (3 DOCUMENTS) */}
        {/* ========================================================================= */}
        {activeSubTab === 'bundle' && (
          <div className="space-y-6">
            <div className="bg-amber-500/10 border border-amber-400/40 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-extrabold text-base text-[#0B2545]">Assemblage Complet du Dossier Candidature &amp; CRIC</h3>
                <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                  Conformément à la consigne, ce module génère le dossier complet assemblé dans l&apos;ordre strict :<br />
                  <strong>1ère position :</strong> Offre d&apos;emploi officielle (Fiche A4 avec stacked barcode)<br />
                  <strong>2ème position :</strong> Contrat de prestation avec le cabinet mandataire CRIC<br />
                  <strong>3ème position :</strong> Ticket d&apos;entretien d&apos;embauche avec code de sécurité et code-barres scannable.
                </p>
              </div>

              <button
                type="button"
                onClick={handleDownloadAssembledBundlePdf}
                disabled={downloadingPdf}
                className="px-5 py-3 rounded-xl bg-[#0B2545] hover:bg-[#134074] text-white font-extrabold text-xs sm:text-sm flex items-center gap-2 cursor-pointer shadow-md transition-all shrink-0 disabled:opacity-50"
              >
                <Download className="w-4 h-4 text-amber-400" />
                <span>{downloadingPdf ? 'Génération en cours...' : 'Télécharger le Bundle Complet'}</span>
              </button>
            </div>

            {/* Cartouches des 3 documents composants */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">Page 1 : 1ère Position</span>
                <h4 className="font-bold text-slate-900 text-sm">Offre d’Emploi (Fiche Poste)</h4>
                <p className="text-slate-500 text-[11px]">Réf : {jobOffer.reference} · Code-barres sous la référence redirigeant vers l&apos;annonce.</p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Page 2 : 2ème Position</span>
                <h4 className="font-bold text-slate-900 text-sm">Contrat de Prestation CRIC</h4>
                <p className="text-slate-500 text-[11px]">Réf : {prestation.referenceContrat} · Mandat d&apos;immigration et de recrutement LIPR / IRCC.</p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Page 3 : 3ème Position</span>
                <h4 className="font-bold text-slate-900 text-sm">Ticket d’Entretien d’Embauche</h4>
                <p className="text-slate-500 text-[11px]">Code ID : {ticket.codeIdCandidature} · Code-barres pour accès direct en ligne.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
