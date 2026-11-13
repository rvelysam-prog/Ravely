import React, { useState } from 'react';
import {
  FileText,
  Download,
  CheckCircle2,
  Printer,
  Copy,
  UserCheck,
  ShieldAlert,
  Send,
  Eye,
  Edit3,
  Search,
  Filter,
  Briefcase,
  Layers,
  ChevronRight,
  Save,
  Check,
  Building,
  Users
} from 'lucide-react';
import { PostulantInfo } from '../../services/postulantDossierService';
import { SiteSettings } from '../../types';
import {
  FichesDocEsData,
  renderDocEsPlainText,
  generateSingleDocEsPdf,
  saveFichesDocEsData
} from '../../services/fichesEtDocEsService';
import { downloadWordDocument } from '../../services/cricContractService';

interface FichesEtDocEsModuleProps {
  postulant: PostulantInfo;
  docEsData: FichesDocEsData;
  onChangeDocEsData: (updated: FichesDocEsData) => void;
  settings: SiteSettings;
  onOpenInWebmail?: (html: string) => void;
  onToast: (msg: string) => void;
}

export const FichesEtDocEsModule: React.FC<FichesEtDocEsModuleProps> = ({
  postulant,
  docEsData,
  onChangeDocEsData,
  settings,
  onOpenInWebmail,
  onToast
}) => {
  // Sélection du canal (Candidature en direct vs Via agence)
  const [selectedCanal, setSelectedCanal] = useState<'direct' | 'agence'>(
    postulant.casType === 'agence' ? 'agence' : 'direct'
  );

  // Modèle actuellement sélectionné
  const [selectedModelId, setSelectedModelId] = useState<number>(
    selectedCanal === 'direct' ? 1 : 9
  );

  // Mode de visualisation : 'preview' (Lecture / PDF) ou 'form' (Formulaire interactif si applicable)
  const [viewMode, setViewMode] = useState<'preview' | 'form'>('preview');

  // Filtre de recherche
  const [searchTerm, setSearchTerm] = useState('');

  // Rôle actif pour la visualisation des permissions
  const [userRole, setUserRole] = useState<'admin' | 'recruteur' | 'candidat'>('admin');

  // Définition exhaustive des 15 modèles
  const modelsCatalog = [
    // PARTIE 1 : Candidature en direct
    {
      id: 1,
      canal: 'direct',
      category: 'interne',
      categoryLabel: 'Données enregistrées par l\'entreprise',
      number: 'MODÈLE 1',
      title: 'Fiche de synthèse du candidat (Profil ATS)',
      isInteractive: false,
      description: 'Identification, compétences clés, critères validation RH et historique ATS'
    },
    {
      id: 2,
      canal: 'direct',
      category: 'interne',
      categoryLabel: 'Données enregistrées par l\'entreprise',
      number: 'MODÈLE 2',
      title: 'Grille d\'évaluation initiale (Entretien RH / Manager)',
      isInteractive: false,
      description: 'Notes de 1 à 4, points forts, axes à creuser et décision finale'
    },
    {
      id: 3,
      canal: 'direct',
      category: 'interne',
      categoryLabel: 'Données enregistrées par l\'entreprise',
      number: 'MODÈLE 3',
      title: 'Historique de planification des entretiens',
      isInteractive: false,
      description: 'Suivi des étapes 1, 2, 3 avec horaires, intervenants et logistique'
    },
    {
      id: 4,
      canal: 'direct',
      category: 'externe',
      categoryLabel: 'Formulaires et fiches à remettre au candidat',
      number: 'MODÈLE 4',
      title: 'Livret d\'accueil candidat (Culture d\'entreprise)',
      isInteractive: false,
      description: 'Histoire, mission, 3 valeurs fondamentales et cadre de travail'
    },
    {
      id: 5,
      canal: 'direct',
      category: 'externe',
      categoryLabel: 'Formulaires et fiches à remettre au candidat',
      number: 'MODÈLE 5',
      title: 'Fiche de poste détaillée',
      isInteractive: false,
      description: 'Missions, environnement technique, rémunération et avantages'
    },
    {
      id: 6,
      canal: 'direct',
      category: 'externe',
      categoryLabel: 'Formulaires et fiches à remettre au candidat',
      number: 'MODÈLE 6',
      title: 'Formulaire de demande d\'emploi interne (Fiche de candidature)',
      isInteractive: true,
      description: 'Formulaire interactif avec composante, diplômes, motivations et signature'
    },
    {
      id: 7,
      canal: 'direct',
      category: 'externe',
      categoryLabel: 'Formulaires et fiches à remettre au candidat',
      number: 'MODÈLE 7',
      title: 'Autorisation de vérification des références professionnelles',
      isInteractive: true,
      description: 'Formulaire interactif d\'accord et contacts de référence 1 & 2'
    },
    {
      id: 8,
      canal: 'direct',
      category: 'externe',
      categoryLabel: 'Formulaires et fiches à remettre au candidat',
      number: 'MODÈLE 8',
      title: 'Accès aux tests de sélection & modalités',
      isInteractive: false,
      description: 'Questionnaire de personnalité soft skills et test technique hard skills'
    },

    // PARTIE 2 : Candidature via Agence de placement
    {
      id: 9,
      canal: 'agence',
      category: 'interne',
      categoryLabel: 'Documents entre l\'agence et l\'employeur',
      number: 'MODÈLE 9',
      title: 'Brief de recrutement entreprise',
      isInteractive: false,
      description: 'Critères indispensables no-go, contexte d\'attractivité et budget global'
    },
    {
      id: 10,
      canal: 'agence',
      category: 'interne',
      categoryLabel: 'Documents entre l\'agence et l\'employeur',
      number: 'MODÈLE 10',
      title: 'Contrat de prestation de services (Extrait RH)',
      isInteractive: false,
      description: 'Conditions financières, honoraires et clause de garantie de remplacement'
    },
    {
      id: 11,
      canal: 'agence',
      category: 'interne',
      categoryLabel: 'Documents entre l\'agence et l\'employeur',
      number: 'MODÈLE 11',
      title: 'Dossier de présentation candidat (CV anonymisé)',
      isInteractive: false,
      description: 'Note de synthèse du consultant et extrait du parcours anonymisé'
    },
    {
      id: 12,
      canal: 'agence',
      category: 'externe',
      categoryLabel: 'Documents entre l\'agence et le candidat',
      number: 'MODÈLE 12',
      title: 'Fiche d\'inscription en agence du candidat',
      isInteractive: true,
      description: 'Formulaire interactif : état civil, recherche et cadre administratif'
    },
    {
      id: 13,
      canal: 'agence',
      category: 'externe',
      categoryLabel: 'Documents entre l\'agence et le candidat',
      number: 'MODÈLE 13',
      title: 'Accord de protection et transmission des données (RGPD)',
      isInteractive: true,
      description: 'Formulaire interactif de consentement informatique et vivier'
    },
    {
      id: 14,
      canal: 'agence',
      category: 'externe',
      categoryLabel: 'Documents entre l\'agence et le candidat',
      number: 'MODÈLE 14',
      title: 'Fiche de préparation à l\'entretien (Conseils)',
      isInteractive: false,
      description: 'Profil des managers interlocuteurs, attentes et conseils de pitch'
    },
    {
      id: 15,
      canal: 'agence',
      category: 'tripartite',
      categoryLabel: 'Document de liaison tripartite',
      number: 'MODÈLE 15',
      title: 'Fiche de liaison d\'entretien tripartite (Bon de présentation)',
      isInteractive: false,
      description: 'Reconnaissance d\'antériorité signée entre agence, employeur et candidat'
    }
  ];

  // Modèles filtrés par canal et terme de recherche
  const filteredModels = modelsCatalog.filter(
    (m) =>
      m.canal === selectedCanal &&
      (m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.number.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const activeModel = modelsCatalog.find((m) => m.id === selectedModelId) || modelsCatalog[0];
  const renderedContent = renderDocEsPlainText(selectedModelId, postulant, docEsData, settings);

  // Téléchargement PDF
  const handleDownloadPdf = () => {
    const { doc, filename } = generateSingleDocEsPdf(selectedModelId, postulant, docEsData, settings);
    doc.save(filename);
    onToast(`Document PDF ${activeModel.number} téléchargé avec succès !`);
  };

  // Téléchargement Word (.docx)
  const handleDownloadWord = () => {
    const title = activeModel.title;
    downloadWordDocument(
      `DOC_ES_${activeModel.number.replace(/\s+/g, '_')}_${postulant.nom.toUpperCase()}`,
      title,
      `<h1>${title}</h1><h3>${renderedContent.subtitle}</h3><pre style="white-space: pre-wrap; font-family: Segoe UI, Arial, sans-serif; font-size: 11pt; line-height: 1.6;">${renderedContent.content}</pre>`
    );
    onToast(`Document Word (.docx) exporté !`);
  };

  // Copie texte brut
  const handleCopyText = () => {
    navigator.clipboard?.writeText(renderedContent.content);
    onToast('Texte du document copié dans le presse-papiers !');
  };

  // Soumission d'un formulaire interactif
  const handleSubmitInteractiveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveFichesDocEsData(postulant.id, docEsData);
    onToast(`Formulaire ${activeModel.number} enregistré avec succès dans la base de données !`);
    setViewMode('preview');
  };

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. EN-TÊTE DU MODULE "Fiches et DOC ES" AVEC FILTRES & RÔLES              */}
      {/* ========================================================================= */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-[#0B2545] to-[#134074] text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#D4A017] text-slate-950 uppercase tracking-wider">
              Module Officiel
            </span>
            <span className="text-xs text-blue-200">15 Modèles Structurés ATS &amp; Agence</span>
          </div>
          <h2 className="text-lg sm:text-xl font-black tracking-tight text-white mt-1 flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-400" />
            <span>Fiches et DOC ES</span>
          </h2>
          <p className="text-xs text-slate-300">
            Génération automatisée et centralisée de tous les documents de recrutement selon les normes canadiennes
          </p>
        </div>

        {/* Sélecteur de rôle & canal */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-900/60 p-2 rounded-xl border border-white/10">
          <span className="text-[11px] text-slate-300 font-bold">Rôle actif :</span>
          <div className="flex gap-1">
            {(['admin', 'recruteur', 'candidat'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setUserRole(r)}
                className={`px-2 py-1 text-[10px] font-bold rounded capitalize cursor-pointer transition-colors ${
                  userRole === r ? 'bg-amber-400 text-slate-950 shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
              >
                {r === 'admin' ? 'Admin RH' : r === 'recruteur' ? 'Recruteur' : 'Candidat'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. TYPOLOGIE : SÉPARATION STRICTE DES CANAUX (DIRECT VS VIA AGENCE)       */}
      {/* ========================================================================= */}
      <div className="bg-slate-100 border border-slate-200 rounded-2xl p-2 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => {
              setSelectedCanal('direct');
              setSelectedModelId(1);
            }}
            className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              selectedCanal === 'direct'
                ? 'bg-[#0B2545] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <UserCheck className="w-4 h-4 text-amber-400" />
            <span>Partie 1 : Candidature en direct (Sans intermédiaire)</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-blue-900/40 text-blue-200">
              Modèles 1 à 8
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedCanal('agence');
              setSelectedModelId(9);
            }}
            className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              selectedCanal === 'agence'
                ? 'bg-[#0B2545] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Building className="w-4 h-4 text-emerald-400" />
            <span>Partie 2 : Via Agence de Placement (Prestataire)</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-blue-900/40 text-blue-200">
              Modèles 9 à 15
            </span>
          </button>
        </div>

        {/* Barre de recherche */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher une fiche ou un modèle..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white rounded-xl border border-slate-300 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. GRILLE DE GAUCHE : LISTE DES MODÈLES & GRILLE DE DROITE : VISIONNEUSE   */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Colonne gauche : Liste des modèles classés (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1 flex items-center justify-between">
            <span>{selectedCanal === 'direct' ? '8 Modèles Candidature Directe' : '7 Modèles Agence Mandataire'}</span>
            <span className="text-[10px] text-blue-700">Sélectionnez pour prévisualiser</span>
          </div>

          <div className="space-y-2 max-h-[700px] overflow-y-auto pr-1">
            {filteredModels.map((m) => {
              const isSelected = selectedModelId === m.id;
              const isInternal = m.category === 'interne';

              return (
                <div
                  key={m.id}
                  onClick={() => {
                    setSelectedModelId(m.id);
                    setViewMode('preview');
                  }}
                  className={`p-3.5 rounded-xl border text-xs transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-blue-50/80 border-[#0066B3] shadow-xs ring-1 ring-[#0066B3]'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isInternal
                          ? 'bg-slate-200 text-slate-800'
                          : m.category === 'tripartite'
                          ? 'bg-purple-100 text-purple-900 font-extrabold'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {m.number} · {isInternal ? 'Interne RH' : m.category === 'tripartite' ? 'Tripartite' : 'Remis Candidat'}
                    </span>

                    {m.isInteractive && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                        Formulaire Interactif
                      </span>
                    )}
                  </div>

                  <h4 className="font-bold text-slate-900 text-sm mt-0.5 flex items-center justify-between">
                    <span>{m.title}</span>
                    <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${isSelected ? 'rotate-90 text-[#0066B3]' : 'text-slate-400'}`} />
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                    {m.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Colonne droite : Espace de visualisation et formulaire interactif (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Barre d'action supérieure du document sélectionné */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase">{activeModel.number}</span>
                {activeModel.isInteractive && (
                  <span className="text-[10px] bg-blue-100 text-blue-900 px-2 py-0.5 rounded font-bold">
                    Mode Remplissage Disponible
                  </span>
                )}
              </div>
              <h3 className="font-black text-sm text-[#0B2545]">{activeModel.title}</h3>
            </div>

            {/* Boutons d'actions : Téléchargement PDF, Word, Impression & Formulaire */}
            <div className="flex flex-wrap items-center gap-2">
              {activeModel.isInteractive && (
                <button
                  type="button"
                  onClick={() => setViewMode(viewMode === 'form' ? 'preview' : 'form')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl border flex items-center gap-1.5 cursor-pointer transition-colors ${
                    viewMode === 'form'
                      ? 'bg-amber-400 text-slate-950 border-amber-500'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{viewMode === 'form' ? 'Voir Aperçu Structuré' : 'Remplir Formulaire'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleDownloadPdf}
                className="px-3 py-1.5 text-xs font-bold bg-[#0B2545] hover:bg-[#134074] text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Télécharger en PDF structuré"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>Export PDF</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadWord}
                className="px-3 py-1.5 text-xs font-bold bg-blue-700 hover:bg-blue-800 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Télécharger au format Word (.docx)"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Word (.docx)</span>
              </button>

              <button
                type="button"
                onClick={handleCopyText}
                className="p-1.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                title="Copier le texte formaté"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* VUE 1 : APERÇU STRUCTURÉ (READ-ONLY PROPRE & FLUIDE)                     */}
          {/* ========================================================================= */}
          {viewMode === 'preview' && (
            <div className="bg-white border border-slate-300 rounded-2xl p-6 shadow-sm font-sans space-y-4">
              {/* En-tête de page officiel */}
              <div className="border-b-2 border-[#D4A017] pb-3 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-[#0B2545]">{postulant.nomEntreprise}</h4>
                  <p className="text-[11px] text-slate-500">
                    Système de Gestion Documentaire ATS · {activeModel.number}
                  </p>
                </div>
                <div className="text-right text-[11px] text-slate-600">
                  <span className="font-bold text-blue-900 block">Réf : {docEsData.referenceDossier}</span>
                  <span>Date : {postulant.dateEffet}</span>
                </div>
              </div>

              {/* Titre et sous-titre */}
              <div className="text-center py-2 bg-slate-50 rounded-xl border border-slate-200">
                <h3 className="font-black text-sm text-[#0B2545] uppercase tracking-wide">
                  {renderedContent.title}
                </h3>
                {renderedContent.subtitle && (
                  <p className="text-[11px] text-slate-500 italic mt-0.5">{renderedContent.subtitle}</p>
                )}
              </div>

              {/* Contenu formaté avec balises dynamiques remplacées */}
              <pre className="text-xs text-slate-800 font-mono whitespace-pre-wrap leading-relaxed bg-slate-50/60 p-4 rounded-xl border border-slate-200 overflow-x-auto">
                {renderedContent.content}
              </pre>

              {/* Pied de page certifié */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
                <span>{postulant.nomEntreprise} · {postulant.adresseEntreprise}</span>
                <span className="font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Conforme EIMT &amp; Droit du Travail Canada
                </span>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* VUE 2 : FORMULAIRE INTERACTIF (MODÈLES 6, 7, 12, 13)                     */}
          {/* ========================================================================= */}
          {viewMode === 'form' && activeModel.isInteractive && (
            <form onSubmit={handleSubmitInteractiveForm} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 text-xs">
              <div className="flex items-center justify-between border-b pb-3">
                <h4 className="font-bold text-sm text-[#0B2545] flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-blue-600" />
                  <span>Saisie Interactive des Données — {activeModel.title}</span>
                </h4>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Enregistrer en Base</span>
                </button>
              </div>

              {/* Formulaire Modèle 6 : Demande d'emploi interne */}
              {selectedModelId === 6 && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Poste actuellement occupé (si en poste)</label>
                      <input
                        type="text"
                        value={docEsData.posteActuelOccupe}
                        onChange={(e) => onChangeDocEsData({ ...docEsData, posteActuelOccupe: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Diplôme le plus élevé</label>
                      <input
                        type="text"
                        value={docEsData.diplomeEleve}
                        onChange={(e) => onChangeDocEsData({ ...docEsData, diplomeEleve: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Certifications ou compétences clés</label>
                    <input
                      type="text"
                      value={docEsData.certificationsCles}
                      onChange={(e) => onChangeDocEsData({ ...docEsData, certificationsCles: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Pourquoi ce poste au sein de notre entreprise correspond-il à votre projet ?
                    </label>
                    <textarea
                      rows={3}
                      value={docEsData.motivationEntreprise}
                      onChange={(e) => onChangeDocEsData({ ...docEsData, motivationEntreprise: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Quels sont les principaux atouts que vous apporterez à l'équipe ?
                    </label>
                    <textarea
                      rows={3}
                      value={docEsData.atoutsPourEquipe}
                      onChange={(e) => onChangeDocEsData({ ...docEsData, atoutsPourEquipe: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg bg-white"
                    />
                  </div>
                </div>
              )}

              {/* Formulaire Modèle 7 : Autorisation de vérification des références */}
              {selectedModelId === 7 && (
                <div className="space-y-4">
                  <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                    <label className="flex items-center gap-2 font-bold text-blue-900 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={docEsData.accordVerificationReferences}
                        onChange={(e) => onChangeDocEsData({ ...docEsData, accordVerificationReferences: e.target.checked })}
                        className="rounded text-blue-600"
                      />
                      <span>J'accepte expressément que l'entreprise contacte mes anciens employeurs pour vérification</span>
                    </label>
                  </div>

                  <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2">
                    <h5 className="font-bold text-slate-800">Référence Professionnelle 1</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Nom & Prénom"
                        value={docEsData.reference1.nomPrenom}
                        onChange={(e) => onChangeDocEsData({ ...docEsData, reference1: { ...docEsData.reference1, nomPrenom: e.target.value } })}
                        className="px-2.5 py-1.5 border rounded bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Entreprise"
                        value={docEsData.reference1.entreprise}
                        onChange={(e) => onChangeDocEsData({ ...docEsData, reference1: { ...docEsData.reference1, entreprise: e.target.value } })}
                        className="px-2.5 py-1.5 border rounded bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Poste occupé"
                        value={docEsData.reference1.poste}
                        onChange={(e) => onChangeDocEsData({ ...docEsData, reference1: { ...docEsData.reference1, poste: e.target.value } })}
                        className="px-2.5 py-1.5 border rounded bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Lien hiérarchique (ex: Manager N+1)"
                        value={docEsData.reference1.lien}
                        onChange={(e) => onChangeDocEsData({ ...docEsData, reference1: { ...docEsData.reference1, lien: e.target.value } })}
                        className="px-2.5 py-1.5 border rounded bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Téléphone"
                        value={docEsData.reference1.tel}
                        onChange={(e) => onChangeDocEsData({ ...docEsData, reference1: { ...docEsData.reference1, tel: e.target.value } })}
                        className="px-2.5 py-1.5 border rounded bg-white"
                      />
                      <input
                        type="email"
                        placeholder="E-mail"
                        value={docEsData.reference1.email}
                        onChange={(e) => onChangeDocEsData({ ...docEsData, reference1: { ...docEsData.reference1, email: e.target.value } })}
                        className="px-2.5 py-1.5 border rounded bg-white"
                      />
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2">
                    <h5 className="font-bold text-slate-800">Référence Professionnelle 2</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Nom & Prénom"
                        value={docEsData.reference2.nomPrenom}
                        onChange={(e) => onChangeDocEsData({ ...docEsData, reference2: { ...docEsData.reference2, nomPrenom: e.target.value } })}
                        className="px-2.5 py-1.5 border rounded bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Entreprise"
                        value={docEsData.reference2.entreprise}
                        onChange={(e) => onChangeDocEsData({ ...docEsData, reference2: { ...docEsData.reference2, entreprise: e.target.value } })}
                        className="px-2.5 py-1.5 border rounded bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Poste occupé"
                        value={docEsData.reference2.poste}
                        onChange={(e) => onChangeDocEsData({ ...docEsData, reference2: { ...docEsData.reference2, poste: e.target.value } })}
                        className="px-2.5 py-1.5 border rounded bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Lien hiérarchique"
                        value={docEsData.reference2.lien}
                        onChange={(e) => onChangeDocEsData({ ...docEsData, reference2: { ...docEsData.reference2, lien: e.target.value } })}
                        className="px-2.5 py-1.5 border rounded bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Téléphone"
                        value={docEsData.reference2.tel}
                        onChange={(e) => onChangeDocEsData({ ...docEsData, reference2: { ...docEsData.reference2, tel: e.target.value } })}
                        className="px-2.5 py-1.5 border rounded bg-white"
                      />
                      <input
                        type="email"
                        placeholder="E-mail"
                        value={docEsData.reference2.email}
                        onChange={(e) => onChangeDocEsData({ ...docEsData, reference2: { ...docEsData.reference2, email: e.target.value } })}
                        className="px-2.5 py-1.5 border rounded bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Formulaire Modèle 12 : Inscription Agence */}
              {selectedModelId === 12 && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Type de contrat recherché</label>
                      <select
                        value={docEsData.typeContratRechercheAgence}
                        onChange={(e) => onChangeDocEsData({ ...docEsData, typeContratRechercheAgence: e.target.value as any })}
                        className="w-full px-3 py-2 border rounded-lg bg-white"
                      >
                        <option value="CDI">CDI (Contrat à Durée Indéterminée)</option>
                        <option value="CDD">CDD (Contrat à Durée Déterminée)</option>
                        <option value="Intérim">Intérim / Placement Temporaire</option>
                        <option value="Management de transition">Management de transition</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Prétentions minimales acceptées</label>
                      <input
                        type="text"
                        value={docEsData.pretentionsMinimalesAgence}
                        onChange={(e) => onChangeDocEsData({ ...docEsData, pretentionsMinimalesAgence: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Zone géographique souhaitée au Canada</label>
                    <input
                      type="text"
                      value={docEsData.zoneGeographiqueSouhaitee}
                      onChange={(e) => onChangeDocEsData({ ...docEsData, zoneGeographiqueSouhaitee: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg bg-white"
                    />
                  </div>

                  <div className="flex flex-wrap gap-4 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={docEsData.documentIdentiteVerifie}
                        onChange={(e) => onChangeDocEsData({ ...docEsData, documentIdentiteVerifie: e.target.checked })}
                        className="rounded text-blue-600"
                      />
                      <span className="font-bold text-slate-700">Document d'identité vérifié et certifié conforme</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={docEsData.cvMisAJourJoint}
                        onChange={(e) => onChangeDocEsData({ ...docEsData, cvMisAJourJoint: e.target.checked })}
                        className="rounded text-blue-600"
                      />
                      <span className="font-bold text-slate-700">CV actualisé au format canadien joint</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Formulaire Modèle 13 : Accord RGPD */}
              {selectedModelId === 13 && (
                <div className="space-y-4">
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                    <h5 className="font-bold text-amber-900 mb-1">Conformité RGPD &amp; Protection des Renseignements Personnels</h5>
                    <p className="text-[11px] text-amber-800">
                      Les informations recueillies sont nécessaires à l'instruction de votre dossier de mobilité internationale et ne sont jamais cédées à des tiers non autorisés.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-start gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50 border border-slate-200">
                      <input
                        type="checkbox"
                        checked={docEsData.accordConserverVivier}
                        onChange={(e) => onChangeDocEsData({ ...docEsData, accordConserverVivier: e.target.checked })}
                        className="rounded text-blue-600 mt-0.5"
                      />
                      <div>
                        <span className="font-bold text-slate-900 block">Conservation dans le vivier informatique</span>
                        <span className="text-[11px] text-slate-500">J'autorise l'agence à conserver mes informations pour toute opportunité future éligible.</span>
                      </div>
                    </label>

                    <label className="flex items-start gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50 border border-slate-200">
                      <input
                        type="checkbox"
                        checked={docEsData.accordTransmettreEntreprises}
                        onChange={(e) => onChangeDocEsData({ ...docEsData, accordTransmettreEntreprises: e.target.checked })}
                        className="rounded text-blue-600 mt-0.5"
                      />
                      <div>
                        <span className="font-bold text-slate-900 block">Transmission de mon profil aux entreprises clientes</span>
                        <span className="text-[11px] text-slate-500">J'autorise l'agence à présenter ma candidature auprès de l'employeur cible : {postulant.nomEntreprise}.</span>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0B2545] hover:bg-[#134074] text-white font-black rounded-xl cursor-pointer shadow-xs"
                >
                  Valider et Enregistrer
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
