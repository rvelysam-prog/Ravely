import React, { useState, useEffect, useMemo } from 'react';
import {
  Briefcase,
  Search,
  Filter,
  Download,
  Send,
  MapPin,
  Clock,
  DollarSign,
  CheckCircle2,
  Calendar,
  Building2,
  FileText,
  ShieldCheck,
  Award,
  Sparkles,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  X,
  Mail,
  Phone,
  UserCheck
} from 'lucide-react';
import { SiteSettings, PublicPage } from '../types';
import {
  JobOfferData,
  getPublishedJobOffers,
  downloadJobOfferPdf,
  CANADIAN_STANDARD_BENEFITS
} from '../services/jobOfferService';
import { OFFICIAL_DEPARTMENTS } from '../services/departmentsAndEmailService';
import { addContactMessage } from '../services/staticStorage';
import { BrandLogo } from './BrandLogo';

interface NosOffresPageProps {
  settings: SiteSettings;
  onNavigate: (page: PublicPage) => void;
}

export const NosOffresPage: React.FC<NosOffresPageProps> = ({
  settings,
  onNavigate
}) => {
  const [offers, setOffers] = useState<JobOfferData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('all');
  const [selectedOfferForDetails, setSelectedOfferForDetails] = useState<JobOfferData | null>(null);
  const [selectedOfferForApply, setSelectedOfferForApply] = useState<JobOfferData | null>(null);
  const [downloadingOfferId, setDownloadingOfferId] = useState<string | null>(null);

  // Formulaire de candidature
  const [applyForm, setApplyForm] = useState({
    nom_complet: '',
    email: '',
    telephone: '',
    ville_residence: '',
    experience_annees: '2-5 ans',
    message: ''
  });
  const [applySubmitting, setApplySubmitting] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);

  // Charger les offres publiées (Firestore + local)
  useEffect(() => {
    let isMounted = true;
    getPublishedJobOffers(settings).then((data) => {
      if (isMounted) {
        setOffers(data);
        setLoading(false);

        // Détection de ?ref= dans l'URL pour ouverture automatique après scan du stacked barcode
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          const refParam = params.get('ref') || (window.location.hash.includes('ref=') ? window.location.hash.split('ref=')[1]?.split('&')[0] : null);
          if (refParam) {
            const cleanRef = decodeURIComponent(refParam).trim().toLowerCase();
            const matched = data.find(
              (o) => o.reference.toLowerCase() === cleanRef || o.id.toLowerCase() === cleanRef
            );
            if (matched) {
              setSelectedOfferForDetails(matched);
            }
          }
        }
      }
    });
    return () => {
      isMounted = false;
    };
  }, [settings]);

  // Filtrage
  const filteredOffers = useMemo(() => {
    return offers.filter((o) => {
      const matchSearch =
        searchQuery.trim() === '' ||
        o.titrePoste.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.departement.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.profilRequis.toLowerCase().includes(searchQuery.toLowerCase());

      const matchDept =
        selectedDeptFilter === 'all' || o.departement === selectedDeptFilter;

      return matchSearch && matchDept;
    });
  }, [offers, searchQuery, selectedDeptFilter]);

  // Téléchargement du PDF officiel signé et cacheté
  const handleDownloadOfferPdf = async (offer: JobOfferData) => {
    try {
      setDownloadingOfferId(offer.id);
      await downloadJobOfferPdf(offer, settings.logo_url);
    } catch (err) {
      console.error('Erreur téléchargement PDF offre:', err);
    } finally {
      setDownloadingOfferId(null);
    }
  };

  // Soumission de la candidature
  const handleApplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOfferForApply) return;

    setApplySubmitting(true);
    try {
      addContactMessage({
        nom_complet: applyForm.nom_complet,
        entreprise: `Candidature : ${selectedOfferForApply.titrePoste} (${selectedOfferForApply.reference})`,
        email: applyForm.email,
        telephone: applyForm.telephone,
        service_concerne: selectedOfferForApply.departement,
        sujet: `Candidature Réf ${selectedOfferForApply.reference} - ${applyForm.nom_complet}`,
        message: `POSTE : ${selectedOfferForApply.titrePoste}
RÉFÉRENCE : ${selectedOfferForApply.reference}
DÉPARTEMENT : ${selectedOfferForApply.departement}
LIEU DE RÉSIDENCE : ${applyForm.ville_residence}
EXPÉRIENCE : ${applyForm.experience_annees}

MESSAGE DU CANDIDAT :
${applyForm.message}`
      });

      setApplySuccess(true);
      setTimeout(() => {
        setApplySuccess(false);
        setSelectedOfferForApply(null);
        setApplyForm({
          nom_complet: '',
          email: '',
          telephone: '',
          ville_residence: '',
          experience_annees: '2-5 ans',
          message: ''
        });
      }, 3500);
    } catch (err) {
      console.error('Erreur candidature:', err);
    } finally {
      setApplySubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* 1. HERO BANNER CARRIÈRES */}
      <section className="relative bg-[#0B2545] text-white overflow-hidden py-14 sm:py-20 border-b border-white/10">
        <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#D4A017_1px,transparent_1px)] [background-size:24px_24px]" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 text-xs font-bold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Recrutement Officiel &amp; Opportunités au Canada</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white max-w-4xl leading-tight">
            Rejoignez <span className="text-[#F59E0B]">{settings.company_name}</span>
          </h1>

          <p className="mt-4 text-base sm:text-lg text-slate-300 max-w-3xl leading-relaxed">
            Consultez nos postes à pourvoir en Colombie-Britannique et en transport international. 
            Toutes nos offres sont conformes aux <strong className="text-white">normes du travail canadiennes (ESA BC)</strong> avec rémunérations transparentes en dollars canadiens ($ CAD) et avantages sociaux complets.
          </p>

          {/* 3 Cartouches d'Avantages Normes Canadiennes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-8 max-w-4xl">
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-[#F59E0B] flex items-center justify-center shrink-0">
                <DollarSign className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <div className="font-bold text-white">Transparence Salariale</div>
                <div className="text-slate-300 text-[11px]">Taux horaires clairs en $ CAD</div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <div className="font-bold text-white">Assurance &amp; REER</div>
                <div className="text-slate-300 text-[11px]">Couverture santé 100% + Abondement 5%</div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <div className="font-bold text-white">Documents Officiels</div>
                <div className="text-slate-300 text-[11px]">Fiches de postes signées &amp; cachetées</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. BARRE DE RECHERCHE & FILTRES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-20">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200/80 p-4 sm:p-5 flex flex-col md:flex-row items-center gap-3.5">
          {/* Champ recherche texte */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par poste, mot-clé, compétences (ex: Conducteur, Cariste, Douane)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:bg-white focus:border-[#0B2545] focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                Effacer
              </button>
            )}
          </div>

          {/* Filtre par département */}
          <div className="w-full md:w-80">
            <select
              value={selectedDeptFilter}
              onChange={(e) => setSelectedDeptFilter(e.target.value)}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-medium text-slate-700 focus:bg-white focus:border-[#0B2545] focus:outline-none cursor-pointer"
            >
              <option value="all">Tous les départements ({offers.length} offres)</option>
              {OFFICIAL_DEPARTMENTS.map((dept) => {
                const count = offers.filter((o) => o.departement === dept.name).length;
                return (
                  <option key={dept.code} value={dept.name}>
                    {dept.name} {count > 0 ? `(${count})` : ''}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </section>

      {/* 3. LISTE DES OFFRES D'EMPLOI */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <span>Postes actuellement ouverts</span>
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#0B2545]/10 text-[#0B2545]">
                {filteredOffers.length} {filteredOffers.length > 1 ? 'offres disponibles' : 'offre disponible'}
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Surrey, Colombie-Britannique · Postes à temps plein · Embauche directe
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Siège social :</span>
            <span className="font-semibold text-slate-800">{settings.address}</span>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-[#0B2545] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-slate-500">Chargement des offres en cours...</p>
          </div>
        ) : filteredOffers.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto shadow-xs">
            <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="font-bold text-slate-800 text-base">Aucune offre ne correspond à votre recherche</h3>
            <p className="text-xs text-slate-500 mt-1">
              Essayez de modifier vos mots-clés ou réinitialisez le filtre départemental.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedDeptFilter('all');
              }}
              className="mt-4 px-4 py-2 rounded-xl bg-[#0B2545] text-white text-xs font-bold hover:bg-[#134074] transition-colors"
            >
              Réinitialiser les filtres
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOffers.map((offer) => {
              const isDownloading = downloadingOfferId === offer.id;

              return (
                <div
                  key={offer.id}
                  className="bg-white rounded-2xl border border-slate-200 hover:border-[#0B2545]/40 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
                >
                  <div className="p-5 sm:p-6 space-y-4">
                    {/* En-tête de carte : Réf et Date de publication */}
                    <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
                      <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        Réf : {offer.reference}
                      </span>
                      <span className="flex items-center gap-1 text-slate-400">
                        <Calendar className="w-3 h-3 text-[#D4A017]" />
                        <span>Publiée le {offer.datePublication}</span>
                      </span>
                    </div>

                    {/* Titre du poste & Département */}
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#0066B3] mb-1 line-clamp-1">
                        {offer.departement}
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#0B2545] transition-colors leading-snug">
                        {offer.titrePoste}
                      </h3>
                    </div>

                    {/* Badges Localisation & Contrat */}
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-medium">
                        <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                        <span>{offer.lieuTravail.split(',')[0]} (BC)</span>
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-medium border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>CDI · Temps Plein</span>
                      </span>
                    </div>

                    {/* Encadré Rémunération selon les normes canadiennes */}
                    <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/70 text-slate-900 space-y-1">
                      <div className="text-[10px] uppercase font-bold tracking-wider text-amber-800 flex items-center gap-1">
                        <DollarSign className="w-3 h-3 text-amber-600" />
                        <span>Rémunération &amp; Normes Canada</span>
                      </div>
                      <div className="text-sm font-extrabold text-[#0B2545]">
                        {offer.typeRemuneration === 'horaire'
                          ? `${offer.salaireMin.toFixed(2)} $ à ${offer.salaireMax.toFixed(2)} $ CAD / h`
                          : `${offer.salaireMin.toLocaleString('fr-CA')} $ à ${offer.salaireMax.toLocaleString('fr-CA')} $ CAD / an`}
                      </div>
                      <div className="text-[10px] text-slate-600 leading-tight">
                        {offer.regimeHeuresSup || 'Heures supp. majorées à 150% après 8h/j ou 40h/semaine.'}
                      </div>
                    </div>

                    {/* Missions courtes */}
                    <div className="text-xs text-slate-600 space-y-1.5">
                      <div className="font-bold text-slate-700 text-[11px]">Missions principales :</div>
                      <ul className="space-y-1">
                        {offer.missionsDetaillees.slice(0, 2).map((m, idx) => (
                          <li key={idx} className="flex items-start gap-1.5 text-[11px] leading-tight text-slate-600">
                            <span className="text-[#0066B3] font-bold">•</span>
                            <span className="line-clamp-2">{m}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Badge officiel de certification */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        <span>Document signé &amp; cacheté</span>
                      </span>
                      {offer.nombrePostesDisponibles && (
                        <span className="font-semibold text-slate-600">
                          {offer.nombrePostesDisponibles} postes ouverts
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Boutons d'action en bas de carte */}
                  <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDownloadOfferPdf(offer)}
                      disabled={isDownloading}
                      className="flex-1 min-h-[38px] px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-[#0B2545] border border-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                      title="Télécharger l'offre d'emploi officielle en PDF vectoriel avec cachet et signature"
                    >
                      <Download className="w-3.5 h-3.5 text-[#0066B3]" />
                      <span>{isDownloading ? 'Téléchargement...' : 'Fiche PDF'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedOfferForDetails(offer)}
                      className="flex-1 min-h-[38px] px-3.5 py-1.5 rounded-xl bg-[#0B2545] hover:bg-[#134074] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    >
                      <span>Détails &amp; Postuler</span>
                      <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. MODAL DÉTAILS COMPLETS DE L'OFFRE */}
      {selectedOfferForDetails && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden my-auto border border-slate-200 max-h-[92vh] flex flex-col">
            {/* Header modal */}
            <div className="bg-[#0B2545] text-white px-6 py-4 flex items-center justify-between border-b border-amber-400/20">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center">
                  <Briefcase className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <div className="text-[10px] font-mono text-amber-300 uppercase tracking-wider">
                    Réf : {selectedOfferForDetails.reference} · Publiée le {selectedOfferForDetails.datePublication}
                  </div>
                  <h3 className="font-bold text-base sm:text-lg text-white">
                    {selectedOfferForDetails.titrePoste}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOfferForDetails(null)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Contenu scrollable */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs sm:text-sm text-slate-700 leading-relaxed">
              {/* Badges récapitulatifs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Département</div>
                  <div className="font-semibold text-slate-900 text-xs truncate mt-0.5">{selectedOfferForDetails.departement}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Lieu</div>
                  <div className="font-semibold text-slate-900 text-xs mt-0.5">{selectedOfferForDetails.lieuTravail}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Horaires</div>
                  <div className="font-semibold text-slate-900 text-xs mt-0.5">{selectedOfferForDetails.horaires}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Rémunération</div>
                  <div className="font-bold text-[#0B2545] text-xs mt-0.5">
                    {selectedOfferForDetails.typeRemuneration === 'horaire'
                      ? `${selectedOfferForDetails.salaireMin.toFixed(2)} $ - ${selectedOfferForDetails.salaireMax.toFixed(2)} $ CAD/h`
                      : `${selectedOfferForDetails.salaireMin.toLocaleString('fr-CA')} $ CAD/an`}
                  </div>
                </div>
              </div>

              {/* 1. Présentation de la société */}
              <div>
                <h4 className="font-bold text-[#0066B3] text-sm uppercase tracking-wide border-b border-slate-200 pb-1.5 mb-2">
                  1. Présentation de la société
                </h4>
                <p className="text-slate-600 text-justify">
                  {selectedOfferForDetails.presentationSociete}
                </p>
              </div>

              {/* 2. Description du poste */}
              <div>
                <h4 className="font-bold text-[#0066B3] text-sm uppercase tracking-wide border-b border-slate-200 pb-1.5 mb-2">
                  2. Description du poste
                </h4>
                <p className="mb-2 text-slate-700">
                  Vous êtes directement rattaché(e) <strong>{selectedOfferForDetails.rattachementHierarchique}</strong>. Votre mission principale consiste à {selectedOfferForDetails.missionPrincipale}
                </p>
                <div className="space-y-1.5 pl-2">
                  <div className="font-bold text-slate-800 text-xs">Missions détaillées :</div>
                  {selectedOfferForDetails.missionsDetaillees.map((m, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="text-[#0066B3] font-bold text-sm leading-none mt-0.5">•</span>
                      <span className="text-slate-700">{m}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Profil recherché */}
              <div>
                <h4 className="font-bold text-[#0066B3] text-sm uppercase tracking-wide border-b border-slate-200 pb-1.5 mb-2">
                  3. Profil recherché
                </h4>
                <p className="text-slate-700 mb-3">{selectedOfferForDetails.profilRequis}</p>
                <div className="space-y-1 text-slate-600">
                  {selectedOfferForDetails.qualitesHumaines.map((q, idx) => (
                    <div key={idx}>✓ {q}</div>
                  ))}
                </div>
              </div>

              {/* 4. Avantages sociaux & Normes canadiennes */}
              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-2">
                <h4 className="font-bold text-[#0B2545] text-xs uppercase tracking-wide flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Avantages sociaux &amp; Normes de Colombie-Britannique</span>
                </h4>
                <p className="text-xs text-slate-800 font-semibold">
                  {selectedOfferForDetails.remuneration}
                </p>
                <ul className="space-y-1 pt-1">
                  {(selectedOfferForDetails.avantagesSociaux || CANADIAN_STANDARD_BENEFITS).map((av, idx) => (
                    <li key={idx} className="flex items-start gap-1.5 text-xs text-slate-700">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span>{av}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 5. Contact & Modalités */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-bold text-slate-800">Candidatures &amp; Ressources Humaines :</div>
                  <div className="text-slate-500">{selectedOfferForDetails.contactEmail} · {selectedOfferForDetails.contactTelephone}</div>
                </div>
                <div className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Document officiel certifié avec cachet &amp; signature</span>
                </div>
              </div>
            </div>

            {/* Footer modal : Boutons télécharger et postuler */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => handleDownloadOfferPdf(selectedOfferForDetails)}
                className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-[#0B2545] border border-slate-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-[#0066B3]" />
                <span>Télécharger la Fiche Officielle (PDF)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedOfferForApply(selectedOfferForDetails);
                  setSelectedOfferForDetails(null);
                }}
                className="px-5 py-2.5 rounded-xl bg-[#0B2545] hover:bg-[#134074] text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <span>Postuler à cette offre</span>
                <Send className="w-3.5 h-3.5 text-amber-400" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL FORMULAIRE DE CANDIDATURE */}
      {selectedOfferForApply && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden my-auto border border-slate-200">
            {/* Header */}
            <div className="bg-[#0B2545] text-white px-6 py-4 flex items-center justify-between border-b border-amber-400/20">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center">
                  <Send className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <div className="text-[10px] font-mono text-amber-300 uppercase tracking-wider">
                    Postuler · Réf : {selectedOfferForApply.reference}
                  </div>
                  <h3 className="font-bold text-base text-white">
                    {selectedOfferForApply.titrePoste}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOfferForApply(null)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Formulaire */}
            {applySuccess ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h4 className="text-lg font-bold text-slate-900">Candidature transmise avec succès !</h4>
                <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                  Votre dossier pour le poste de <strong>{selectedOfferForApply.titrePoste}</strong> (Réf: {selectedOfferForApply.reference}) a bien été transmis à la Direction des Ressources Humaines d&apos;Atlantic Transport Ltd. Notre équipe RH examinera votre profil dans les plus brefs délais.
                </p>
                <div className="text-[11px] text-slate-400 font-mono">
                  Un email de confirmation sera envoyé à {applyForm.email}.
                </div>
              </div>
            ) : (
              <form onSubmit={handleApplySubmit} className="p-6 space-y-4 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-slate-700">
                  <span><strong>Poste :</strong> {selectedOfferForApply.titrePoste}</span>
                  <span className="font-mono text-slate-500 font-bold">{selectedOfferForApply.reference}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Nom et prénom *
                    </label>
                    <input
                      type="text"
                      required
                      value={applyForm.nom_complet}
                      onChange={(e) => setApplyForm({ ...applyForm, nom_complet: e.target.value })}
                      placeholder="ex: Jean Dupont"
                      className="w-full min-h-[38px] px-3 rounded-xl border border-slate-300 focus:border-[#0B2545] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Email de contact *
                    </label>
                    <input
                      type="email"
                      required
                      value={applyForm.email}
                      onChange={(e) => setApplyForm({ ...applyForm, email: e.target.value })}
                      placeholder="ex: jean.dupont@email.com"
                      className="w-full min-h-[38px] px-3 rounded-xl border border-slate-300 focus:border-[#0B2545] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Téléphone *
                    </label>
                    <input
                      type="tel"
                      required
                      value={applyForm.telephone}
                      onChange={(e) => setApplyForm({ ...applyForm, telephone: e.target.value })}
                      placeholder="ex: +1 604 000 0000"
                      className="w-full min-h-[38px] px-3 rounded-xl border border-slate-300 focus:border-[#0B2545] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Ville &amp; Pays de résidence
                    </label>
                    <input
                      type="text"
                      value={applyForm.ville_residence}
                      onChange={(e) => setApplyForm({ ...applyForm, ville_residence: e.target.value })}
                      placeholder="ex: Surrey, Canada ou France"
                      className="w-full min-h-[38px] px-3 rounded-xl border border-slate-300 focus:border-[#0B2545] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Années d&apos;expérience sur ce métier
                  </label>
                  <select
                    value={applyForm.experience_annees}
                    onChange={(e) => setApplyForm({ ...applyForm, experience_annees: e.target.value })}
                    className="w-full min-h-[38px] px-3 rounded-xl border border-slate-300 focus:border-[#0B2545] focus:outline-none"
                  >
                    <option value="Moins de 1 an">Débutant / Moins de 1 an</option>
                    <option value="1-2 ans">1 à 2 ans</option>
                    <option value="2-5 ans">2 à 5 ans</option>
                    <option value="Plus de 5 ans">Plus de 5 ans (Expérimenté)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Présentation, motivations &amp; qualifications *
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={applyForm.message}
                    onChange={(e) => setApplyForm({ ...applyForm, message: e.target.value })}
                    placeholder="Résumez brièvement votre parcours, vos certifications (Permis PL, CACES, Diplôme, etc.) et vos motivations pour rejoindre Atlantic Transport Ltd..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-[#0B2545] focus:outline-none leading-relaxed"
                  />
                </div>

                <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedOfferForApply(null)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={applySubmitting}
                    className="px-5 py-2 rounded-xl bg-[#0B2545] hover:bg-[#134074] text-white font-bold flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5 text-amber-400" />
                    <span>{applySubmitting ? 'Envoi en cours...' : 'Envoyer ma candidature'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
