import React, { useState, useEffect, useMemo } from 'react';
import {
  Briefcase,
  Search,
  Download,
  Send,
  DollarSign,
  CheckCircle2,
  FileText,
  ShieldCheck,
  ArrowRight,
  X,
  ArrowLeft
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
import {
  ActionButton,
  EmptyState,
  MetadataRow,
  SectionHeader,
  StatusNotice,
  SurfaceCard
} from './ui/DesignSystem';

interface NosOffresPageProps {
  settings: SiteSettings;
  onNavigate: (page: PublicPage) => void;
}

export const NosOffresPage: React.FC<NosOffresPageProps> = ({ settings, onNavigate }) => {
  const [offers, setOffers] = useState<JobOfferData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('all');
  const [selectedOfferForDetails, setSelectedOfferForDetails] = useState<JobOfferData | null>(
    null
  );
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
          const refParam =
            params.get('ref') ||
            (window.location.hash.includes('ref=')
              ? window.location.hash.split('ref=')[1]?.split('&')[0]
              : null);
          if (refParam) {
            const cleanRef = decodeURIComponent(refParam).trim().toLowerCase();
            const matched = data.find(
              (o) =>
                o.reference.toLowerCase() === cleanRef || o.id.toLowerCase() === cleanRef
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
      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        q === '' ||
        o.titrePoste.toLowerCase().includes(q) ||
        o.departement.toLowerCase().includes(q) ||
        o.reference.toLowerCase().includes(q) ||
        o.profilRequis.toLowerCase().includes(q);

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
    <div className="min-h-screen bg-surface-canvas text-ink-primary pb-20">
      {/* 1. HERO BANNER CARRIÈRES */}
      <section className="relative bg-brand-navy text-white overflow-hidden py-12 sm:py-18 border-b border-white/10">
        <div
          className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#D4A017_1px,transparent_1px)] [background-size:24px_24px]"
          aria-hidden="true"
        />

        <div className="ds-container relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <button
              type="button"
              onClick={() => onNavigate('accueil')}
              className="ds-btn-base min-h-[44px] px-4 bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20"
            >
              <ArrowLeft className="w-4 h-4 text-brand-amber" aria-hidden="true" />
              <span>Retour à l&apos;accueil</span>
            </button>
            <div className="ds-kicker text-brand-gold">
              Recrutement Officiel · Opportunités au Canada
            </div>
          </div>

          <SectionHeader
            as="h1"
            tone="dark"
            title={
              <>
                Rejoignez <span className="text-brand-amber">{settings.company_name}</span>
              </>
            }
            subtitle={
              <>
                Consultez nos postes à pourvoir en Colombie-Britannique et en transport
                international. Toutes nos offres respectent les{' '}
                <strong className="text-white">normes du travail canadiennes (ESA BC)</strong>{' '}
                avec rémunérations transparentes en $ CAD et avantages sociaux complets.
              </>
            }
          />

          {/* 3 Repères Normes Canadiennes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-8 max-w-4xl">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-amber/20 text-brand-amber flex items-center justify-center shrink-0">
                <DollarSign className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="text-xs">
                <div className="font-bold text-white">Transparence Salariale</div>
                <div className="text-slate-300 mt-0.5">Taux horaires clairs en $ CAD</div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="text-xs">
                <div className="font-bold text-white">Assurance &amp; REER</div>
                <div className="text-slate-300 mt-0.5">Couverture santé 100% + Abondement 5%</div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-300 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="text-xs">
                <div className="font-bold text-white">Documents Officiels</div>
                <div className="text-slate-300 mt-0.5">Fiches de postes signées &amp; cachetées</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. BARRE DE RECHERCHE & FILTRES */}
      <section className="ds-container -mt-6 relative z-20">
        <SurfaceCard padded={false} className="p-4 sm:p-5 flex flex-col md:flex-row items-center gap-3.5 shadow-md">
          <div className="relative flex-1 w-full">
            <label htmlFor="offers-search-input" className="sr-only">
              Rechercher une offre d&apos;emploi
            </label>
            <Search
              className="w-4 h-4 text-ink-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="offers-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par poste, mot-clé, compétences (ex: Conducteur, Cariste, Douane)..."
              className="ds-input pl-10 pr-20 bg-surface-subtle focus:bg-white"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 min-h-[36px] px-2.5 text-ink-secondary hover:text-ink-primary text-xs font-semibold cursor-pointer"
              >
                Effacer
              </button>
            )}
          </div>

          <div className="w-full md:w-80">
            <label htmlFor="offers-dept-filter" className="sr-only">
              Filtrer par département
            </label>
            <select
              id="offers-dept-filter"
              value={selectedDeptFilter}
              onChange={(e) => setSelectedDeptFilter(e.target.value)}
              className="ds-input bg-surface-subtle focus:bg-white text-xs sm:text-sm font-medium cursor-pointer"
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
        </SurfaceCard>
      </section>

      {/* 3. LISTE DES OFFRES D'EMPLOI */}
      <section className="ds-container mt-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6 pb-4 border-b border-surface-border">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-ink-primary tracking-tight">
              Postes actuellement ouverts
            </h2>
            <MetadataRow
              className="mt-1.5"
              items={[
                `${filteredOffers.length} ${
                  filteredOffers.length > 1 ? 'offres disponibles' : 'offre disponible'
                }`,
                'Surrey, Colombie-Britannique',
                'Postes à temps plein · Embauche directe'
              ]}
            />
          </div>

          <div className="text-xs text-ink-secondary">
            Siège social : <span className="font-semibold text-ink-primary">{settings.address}</span>
          </div>
        </div>

        {loading ? (
          <div
            aria-busy="true"
            aria-label="Chargement des offres d'emploi en cours"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {[0, 1, 2].map((idx) => (
              <div
                key={idx}
                className="ds-card p-6 space-y-4 animate-pulse"
              >
                <div className="h-4 w-1/3 bg-surface-subtle rounded" />
                <div className="h-6 w-3/4 bg-surface-subtle rounded" />
                <div className="h-16 w-full bg-surface-subtle rounded-xl" />
                <div className="h-11 w-full bg-surface-subtle rounded-xl" />
              </div>
            ))}
          </div>
        ) : filteredOffers.length === 0 ? (
          <EmptyState
            icon={<Briefcase className="w-6 h-6" aria-hidden="true" />}
            title="Aucune offre ne correspond à votre recherche"
            description="Essayez de modifier vos mots-clés ou réinitialisez le filtre départemental."
            action={
              <ActionButton
                variant="navy"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedDeptFilter('all');
                }}
              >
                Réinitialiser les filtres
              </ActionButton>
            }
            className="max-w-lg mx-auto"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOffers.map((offer) => (
              <article
                key={offer.id}
                className="ds-card hover:border-brand-navy/40 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
              >
                <div className="p-5 sm:p-6 space-y-4">
                  {/* Métadonnées de référence sans pilules */}
                  <MetadataRow
                    items={[
                      <span key="ref" className="font-mono font-bold text-ink-primary">
                        Réf. {offer.reference}
                      </span>,
                      `Publiée le ${offer.datePublication}`
                    ]}
                  />

                  {/* Titre du poste & Département */}
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-brand-blue mb-1 line-clamp-1">
                      {offer.departement}
                    </div>
                    <h3 className="text-lg font-bold text-ink-primary group-hover:text-brand-navy transition-colors leading-snug">
                      {offer.titrePoste}
                    </h3>
                    <MetadataRow
                      className="mt-2"
                      items={[
                        `${offer.lieuTravail.split(',')[0]} (BC)`,
                        'CDI · Temps Plein'
                      ]}
                    />
                  </div>

                  {/* Rémunération selon normes canadiennes */}
                  <div className="p-3.5 rounded-xl bg-surface-subtle border border-surface-border space-y-1">
                    <div className="text-[11px] uppercase font-bold tracking-wider text-ink-secondary flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-brand-amber" aria-hidden="true" />
                      <span>Rémunération &amp; Normes Canada</span>
                    </div>
                    <div className="text-sm font-extrabold font-mono tabular-nums text-brand-navy">
                      {offer.typeRemuneration === 'horaire'
                        ? `${offer.salaireMin.toFixed(2)} $ à ${offer.salaireMax.toFixed(2)} $ CAD / h`
                        : `${offer.salaireMin.toLocaleString('fr-CA')} $ à ${offer.salaireMax.toLocaleString('fr-CA')} $ CAD / an`}
                    </div>
                    <div className="text-xs text-ink-secondary leading-snug">
                      {offer.regimeHeuresSup ||
                        'Heures supp. majorées à 150% après 8h/j ou 40h/semaine.'}
                    </div>
                  </div>

                  {/* Missions principales */}
                  <div className="text-xs text-ink-secondary space-y-1.5">
                    <div className="font-bold text-ink-primary">Missions principales :</div>
                    <ul className="space-y-1.5">
                      {offer.missionsDetaillees.slice(0, 2).map((m, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 text-xs leading-snug text-ink-secondary"
                        >
                          <span className="text-brand-blue font-bold" aria-hidden="true">
                            •
                          </span>
                          <span className="line-clamp-2">{m}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Certification & Postes ouverts */}
                  <div className="pt-3 border-t border-surface-border flex items-center justify-between text-xs text-ink-secondary">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-status-success" aria-hidden="true" />
                      <span>Document signé &amp; cacheté</span>
                    </span>
                    {offer.nombrePostesDisponibles && (
                      <span className="font-semibold tabular-nums text-ink-primary">
                        {offer.nombrePostesDisponibles} postes ouverts
                      </span>
                    )}
                  </div>
                </div>

                {/* Action principale de carte */}
                <div className="p-4 bg-surface-subtle border-t border-surface-border">
                  <ActionButton
                    variant="navy"
                    fullWidth
                    onClick={() => setSelectedOfferForDetails(offer)}
                    className="text-xs sm:text-sm"
                  >
                    <span>Consulter l&apos;offre &amp; Postuler</span>
                    <ArrowRight className="w-4 h-4 text-brand-amber" aria-hidden="true" />
                  </ActionButton>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* 4. MODAL DÉTAILS COMPLETS DE L'OFFRE */}
      {selectedOfferForDetails && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="offer-details-title"
          className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
        >
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden my-auto border border-surface-border max-h-[92vh] flex flex-col">
            {/* Header modal */}
            <div className="bg-brand-navy text-white px-6 py-4 flex items-center justify-between gap-4 border-b border-brand-gold/25">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-brand-amber/20 border border-brand-amber/35 flex items-center justify-center shrink-0">
                  <Briefcase className="w-4 h-4 text-brand-amber" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-mono tabular-nums text-amber-300 uppercase tracking-wider truncate">
                    Réf : {selectedOfferForDetails.reference} · Publiée le{' '}
                    {selectedOfferForDetails.datePublication}
                  </div>
                  <h3 id="offer-details-title" className="font-bold text-base sm:text-lg text-white truncate">
                    {selectedOfferForDetails.titrePoste}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOfferForDetails(null)}
                aria-label="Fermer les détails de l'offre"
                className="min-h-[44px] min-w-[44px] rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            {/* Contenu scrollable */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs sm:text-sm text-ink-primary leading-relaxed">
              {/* Grille récapitulative */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl bg-surface-subtle border border-surface-border">
                  <div className="text-[11px] text-ink-muted uppercase font-bold">Département</div>
                  <div className="font-semibold text-ink-primary text-xs truncate mt-0.5">
                    {selectedOfferForDetails.departement}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-surface-subtle border border-surface-border">
                  <div className="text-[11px] text-ink-muted uppercase font-bold">Lieu</div>
                  <div className="font-semibold text-ink-primary text-xs mt-0.5">
                    {selectedOfferForDetails.lieuTravail}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-surface-subtle border border-surface-border">
                  <div className="text-[11px] text-ink-muted uppercase font-bold">Horaires</div>
                  <div className="font-semibold text-ink-primary text-xs mt-0.5">
                    {selectedOfferForDetails.horaires}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-surface-subtle border border-surface-border">
                  <div className="text-[11px] text-ink-muted uppercase font-bold">Rémunération</div>
                  <div className="font-bold font-mono tabular-nums text-brand-navy text-xs mt-0.5">
                    {selectedOfferForDetails.typeRemuneration === 'horaire'
                      ? `${selectedOfferForDetails.salaireMin.toFixed(2)} $ - ${selectedOfferForDetails.salaireMax.toFixed(2)} $ CAD/h`
                      : `${selectedOfferForDetails.salaireMin.toLocaleString('fr-CA')} $ CAD/an`}
                  </div>
                </div>
              </div>

              {/* 1. Présentation de la société */}
              <div>
                <h4 className="font-bold text-brand-blue text-sm uppercase tracking-wide border-b border-surface-border pb-1.5 mb-2">
                  1. Présentation de la société
                </h4>
                <p className="text-ink-secondary">
                  {selectedOfferForDetails.presentationSociete}
                </p>
              </div>

              {/* 2. Description du poste */}
              <div>
                <h4 className="font-bold text-brand-blue text-sm uppercase tracking-wide border-b border-surface-border pb-1.5 mb-2">
                  2. Description du poste
                </h4>
                <p className="mb-2 text-ink-primary">
                  Vous êtes directement rattaché(e){' '}
                  <strong>{selectedOfferForDetails.rattachementHierarchique}</strong>. Votre mission
                  principale consiste à {selectedOfferForDetails.missionPrincipale}
                </p>
                <div className="space-y-1.5 pl-2">
                  <div className="font-bold text-ink-primary text-xs">Missions détaillées :</div>
                  {selectedOfferForDetails.missionsDetaillees.map((m, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="text-brand-blue font-bold text-sm leading-none mt-0.5" aria-hidden="true">
                        •
                      </span>
                      <span className="text-ink-secondary">{m}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Profil recherché */}
              <div>
                <h4 className="font-bold text-brand-blue text-sm uppercase tracking-wide border-b border-surface-border pb-1.5 mb-2">
                  3. Profil recherché
                </h4>
                <p className="text-ink-secondary mb-3">{selectedOfferForDetails.profilRequis}</p>
                <div className="space-y-1 text-ink-secondary">
                  {selectedOfferForDetails.qualitesHumaines.map((q, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-status-success shrink-0 mt-0.5" aria-hidden="true" />
                      <span>{q}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Avantages sociaux & Normes canadiennes */}
              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-2">
                <h4 className="font-bold text-brand-navy text-xs uppercase tracking-wide flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-status-success" aria-hidden="true" />
                  <span>Avantages sociaux &amp; Normes de Colombie-Britannique</span>
                </h4>
                <p className="text-xs text-ink-primary font-semibold">
                  {selectedOfferForDetails.remuneration}
                </p>
                <ul className="space-y-1 pt-1">
                  {(selectedOfferForDetails.avantagesSociaux || CANADIAN_STANDARD_BENEFITS).map(
                    (av, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-ink-primary">
                        <CheckCircle2 className="w-3.5 h-3.5 text-status-success shrink-0 mt-0.5" aria-hidden="true" />
                        <span>{av}</span>
                      </li>
                    )
                  )}
                </ul>
              </div>

              {/* 5. Contact & Modalités */}
              <div className="p-3.5 rounded-xl bg-surface-subtle border border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-bold text-ink-primary">
                    Candidatures &amp; Ressources Humaines :
                  </div>
                  <div className="text-ink-secondary">
                    {selectedOfferForDetails.contactEmail} ·{' '}
                    {selectedOfferForDetails.contactTelephone}
                  </div>
                </div>
                <div className="text-xs text-emerald-700 font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                  <span>Document officiel certifié avec cachet &amp; signature</span>
                </div>
              </div>
            </div>

            {/* Footer modal */}
            <div className="p-4 bg-surface-subtle border-t border-surface-border flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <ActionButton
                  variant="secondary"
                  onClick={() => setSelectedOfferForDetails(null)}
                  className="text-xs"
                >
                  Fermer
                </ActionButton>
                <ActionButton
                  variant="secondary"
                  disabled={downloadingOfferId === selectedOfferForDetails.id}
                  onClick={() => handleDownloadOfferPdf(selectedOfferForDetails)}
                  className="text-xs"
                >
                  <Download className="w-4 h-4 text-brand-navy" aria-hidden="true" />
                  <span>
                    {downloadingOfferId === selectedOfferForDetails.id
                      ? 'Génération PDF...'
                      : 'Fiche PDF'}
                  </span>
                </ActionButton>
              </div>

              <ActionButton
                variant="navy"
                onClick={() => {
                  setSelectedOfferForApply(selectedOfferForDetails);
                  setSelectedOfferForDetails(null);
                }}
                className="text-xs sm:text-sm"
              >
                <span>Postuler à cette offre</span>
                <Send className="w-3.5 h-3.5 text-brand-amber" aria-hidden="true" />
              </ActionButton>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL FORMULAIRE DE CANDIDATURE */}
      {selectedOfferForApply && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="offer-apply-title"
          className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
        >
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden my-auto border border-surface-border">
            <div className="bg-brand-navy text-white px-6 py-4 flex items-center justify-between gap-4 border-b border-brand-gold/25">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-brand-amber/20 border border-brand-amber/35 flex items-center justify-center shrink-0">
                  <Send className="w-4 h-4 text-brand-amber" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-mono tabular-nums text-amber-300 uppercase tracking-wider truncate">
                    Postuler · Réf : {selectedOfferForApply.reference}
                  </div>
                  <h3 id="offer-apply-title" className="font-bold text-base text-white truncate">
                    {selectedOfferForApply.titrePoste}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOfferForApply(null)}
                aria-label="Fermer le formulaire de candidature"
                className="min-h-[44px] min-w-[44px] rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            {applySuccess ? (
              <div className="p-8 space-y-4">
                <StatusNotice
                  variant="success"
                  title="Candidature transmise avec succès !"
                >
                  <p>
                    Votre dossier pour le poste de{' '}
                    <strong>{selectedOfferForApply.titrePoste}</strong> (Réf:{' '}
                    {selectedOfferForApply.reference}) a bien été transmis à la Direction des
                    Ressources Humaines d&apos;Atlantic Transport Ltd.
                  </p>
                  <p className="font-mono text-xs mt-2">
                    Un email de confirmation sera envoyé à {applyForm.email}.
                  </p>
                </StatusNotice>
              </div>
            ) : (
              <form onSubmit={handleApplySubmit} className="p-6 space-y-4 text-xs sm:text-sm">
                <div className="p-3.5 rounded-xl bg-surface-subtle border border-surface-border flex items-center justify-between gap-2 text-ink-primary">
                  <span>
                    <strong>Poste :</strong> {selectedOfferForApply.titrePoste}
                  </span>
                  <span className="font-mono tabular-nums text-ink-secondary font-bold shrink-0">
                    {selectedOfferForApply.reference}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label
                      htmlFor="apply-fullname"
                      className="block text-xs font-bold text-ink-primary mb-1"
                    >
                      Nom et prénom *
                    </label>
                    <input
                      id="apply-fullname"
                      type="text"
                      required
                      value={applyForm.nom_complet}
                      onChange={(e) =>
                        setApplyForm({ ...applyForm, nom_complet: e.target.value })
                      }
                      placeholder="ex: Jean Dupont"
                      className="ds-input"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="apply-email"
                      className="block text-xs font-bold text-ink-primary mb-1"
                    >
                      Email de contact *
                    </label>
                    <input
                      id="apply-email"
                      type="email"
                      required
                      value={applyForm.email}
                      onChange={(e) => setApplyForm({ ...applyForm, email: e.target.value })}
                      placeholder="ex: jean.dupont@email.com"
                      className="ds-input"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label
                      htmlFor="apply-phone"
                      className="block text-xs font-bold text-ink-primary mb-1"
                    >
                      Téléphone *
                    </label>
                    <input
                      id="apply-phone"
                      type="tel"
                      required
                      value={applyForm.telephone}
                      onChange={(e) =>
                        setApplyForm({ ...applyForm, telephone: e.target.value })
                      }
                      placeholder="ex: +1 604 000 0000"
                      className="ds-input"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="apply-city"
                      className="block text-xs font-bold text-ink-primary mb-1"
                    >
                      Ville &amp; Pays de résidence
                    </label>
                    <input
                      id="apply-city"
                      type="text"
                      value={applyForm.ville_residence}
                      onChange={(e) =>
                        setApplyForm({ ...applyForm, ville_residence: e.target.value })
                      }
                      placeholder="ex: Surrey, Canada ou France"
                      className="ds-input"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="apply-exp"
                    className="block text-xs font-bold text-ink-primary mb-1"
                  >
                    Années d&apos;expérience sur ce métier
                  </label>
                  <select
                    id="apply-exp"
                    value={applyForm.experience_annees}
                    onChange={(e) =>
                      setApplyForm({ ...applyForm, experience_annees: e.target.value })
                    }
                    className="ds-input cursor-pointer"
                  >
                    <option value="Moins de 1 an">Débutant / Moins de 1 an</option>
                    <option value="1-2 ans">1 à 2 ans</option>
                    <option value="2-5 ans">2 à 5 ans</option>
                    <option value="Plus de 5 ans">Plus de 5 ans (Expérimenté)</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="apply-message"
                    className="block text-xs font-bold text-ink-primary mb-1"
                  >
                    Présentation, motivations &amp; qualifications *
                  </label>
                  <textarea
                    id="apply-message"
                    rows={4}
                    required
                    value={applyForm.message}
                    onChange={(e) => setApplyForm({ ...applyForm, message: e.target.value })}
                    placeholder="Résumez brièvement votre parcours, vos certifications (Permis PL, CACES, Diplôme, etc.) et vos motivations pour rejoindre Atlantic Transport Ltd..."
                    className="ds-input py-2.5 leading-relaxed"
                  />
                </div>

                <div className="pt-3 border-t border-surface-border flex items-center justify-end gap-3">
                  <ActionButton
                    variant="secondary"
                    onClick={() => setSelectedOfferForApply(null)}
                    className="text-xs"
                  >
                    Annuler
                  </ActionButton>
                  <ActionButton
                    type="submit"
                    variant="navy"
                    disabled={applySubmitting}
                    className="text-xs sm:text-sm"
                  >
                    <Send className="w-3.5 h-3.5 text-brand-amber" aria-hidden="true" />
                    <span>{applySubmitting ? 'Envoi en cours...' : 'Envoyer ma candidature'}</span>
                  </ActionButton>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
