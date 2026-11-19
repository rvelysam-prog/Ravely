import React, { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  MapPin,
  Phone,
  Mail,
  MessageCircle,
  Send,
  ShieldCheck,
  Clock,
  Globe2,
  Ship,
  Warehouse,
  FileCheck2,
  Search,
  PackageCheck
} from 'lucide-react';
import { PublicPage, SiteSettings } from '../types';
import { addContactMessage } from '../services/staticStorage';
import {
  ActionButton,
  MetadataRow,
  SectionHeader,
  StatusNotice,
  SurfaceCard
} from './ui/DesignSystem';

import heroPortImg from '../assets/images/hero_multimodal_port_1790568794371.jpg';
import serviceMultimodalImg from '../assets/images/service_multimodal_freight_1790568810704.jpg';
import serviceWarehousingImg from '../assets/images/service_warehousing_supply_1790568824687.jpg';
import serviceCustomsImg from '../assets/images/service_customs_brokerage_1790568836421.jpg';

const SERVICE_IMAGES: Record<string, string> = {
  multimodal: serviceMultimodalImg,
  warehousing: serviceWarehousingImg,
  customs: serviceCustomsImg
};

interface PublicPagesProps {
  page: 'accueil' | 'services' | 'apropos' | 'contact';
  settings: SiteSettings;
  onNavigate: (page: PublicPage, prefillService?: string) => void;
  selectedServiceForQuote?: string;
}

export const PublicPages: React.FC<PublicPagesProps> = ({
  page,
  settings,
  onNavigate,
  selectedServiceForQuote
}) => {
  const [trackingInput, setTrackingInput] = useState('');
  const [trackingResult, setTrackingResult] = useState<{
    code: string;
    status: string;
    origin: string;
    destination: string;
    customs: string;
    eta: string;
  } | null>(null);

  const [contactForm, setContactForm] = useState({
    nom_complet: '',
    entreprise: '',
    email: '',
    telephone: '',
    service_concerne:
      selectedServiceForQuote || settings.services[0]?.title || 'Transport Multimodal Global',
    sujet: '',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  React.useEffect(() => {
    if (selectedServiceForQuote) {
      setContactForm((prev) => ({ ...prev, service_concerne: selectedServiceForQuote }));
    }
  }, [selectedServiceForQuote]);

  const handleTrackFreight = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = (trackingInput.trim() || 'ATL-8924-CA').toUpperCase();
    setTrackingInput(cleanCode);
    setTrackingResult({
      code: cleanCode,
      status: 'En transit — Hub Pacifique Surrey (BC)',
      origin: 'Terminal Portuaire International',
      destination: 'Surrey, BC V3T 2W1, Canada (Entrepôt sous douane)',
      customs: 'Déclaration EDI CBSA / OEA validée — Mainlevée accordée',
      eta: 'Livraison programmée sous 24h-48h'
    });
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitStatus(null);

    if (
      !contactForm.nom_complet.trim() ||
      !contactForm.email.trim() ||
      !contactForm.sujet.trim() ||
      !contactForm.message.trim()
    ) {
      setSubmitStatus({
        type: 'error',
        text: 'Veuillez remplir tous les champs obligatoires.'
      });
      setSubmitting(false);
      return;
    }

    addContactMessage({
      nom_complet: contactForm.nom_complet.trim(),
      entreprise: contactForm.entreprise.trim(),
      email: contactForm.email.trim(),
      telephone: contactForm.telephone.trim(),
      service_concerne: contactForm.service_concerne,
      sujet: contactForm.sujet.trim(),
      message: contactForm.message.trim()
    });

    setSubmitStatus({
      type: 'success',
      text: 'Votre demande a bien été transmise à notre équipe ATLANTIC TRANSPORT LTD. Nous vous répondrons sous 24h ouvrées.'
    });
    setContactForm({
      nom_complet: '',
      entreprise: '',
      email: '',
      telephone: '',
      service_concerne: settings.services[0]?.title || 'Transport Multimodal Global',
      sujet: '',
      message: ''
    });
    setSubmitting(false);
  };

  const hasDirectContact =
    Boolean(settings.phone && settings.phone.trim().length > 0) ||
    Boolean(settings.email && settings.email.trim().length > 0);

  // ==========================================================================
  // PAGE 1 : ACCUEIL
  // ==========================================================================
  if (page === 'accueil') {
    return (
      <div className="space-y-0">
        {/* HERO SECTION — Fond bleu nuit profond #0B1220 */}
        <section className="relative bg-brand-navy-deep text-white overflow-hidden border-b border-white/10">
          <div className="absolute inset-0 pointer-events-none">
            <img
              src={heroPortImg}
              alt="Terminal portuaire et logistique multimodale ATLANTIC TRANSPORT LTD"
              referrerPolicy="no-referrer"
              decoding="async"
              fetchPriority="high"
              className="w-full h-full object-cover object-center opacity-25"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-brand-navy-deep via-brand-navy-deep/95 to-brand-navy-deep/75" />
          </div>

          <div className="relative ds-container py-14 sm:py-20 lg:py-24">
            <div className="max-w-3xl space-y-6">
              <div className="ds-kicker text-brand-gold leading-relaxed">
                SIÈGE SOCIAL : SURREY (BC), CANADA · HUB PACIFIQUE · DOUANES CBSA
              </div>

              <h1 className="font-bold text-[32px] sm:text-[42px] lg:text-[48px] leading-[1.12] tracking-tight">
                <span className="text-white block sm:inline">Le monde sans frontières, </span>
                <span className="text-brand-gold block sm:inline">votre logistique sans limites.</span>
              </h1>

              <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-[60ch]">
                Depuis notre centre opérationnel de Surrey (Colombie-Britannique, Canada),{' '}
                <strong className="text-white font-semibold">{settings.company_name}</strong> pilote
                vos flux de transport multimodal global (maritime, aérien, ferroviaire et routier),
                vos opérations d’entreposage sous douane et l’intégralité de vos formalités
                douanières CBSA / OEA.
              </p>

              {/* Simulateur de suivi de fret */}
              <form
                onSubmit={handleTrackFreight}
                aria-label="Simulation de suivi d'expédition"
                className="pt-1 max-w-xl flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 bg-white/5 p-2 rounded-2xl border border-white/15 backdrop-blur-xs"
              >
                <div className="relative flex-1">
                  <label htmlFor="freight-tracking-input" className="sr-only">
                    Numéro de dossier ou de suivi fret
                  </label>
                  <Search
                    className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id="freight-tracking-input"
                    type="text"
                    value={trackingInput}
                    onChange={(e) => setTrackingInput(e.target.value)}
                    placeholder="N° de suivi (ex: ATL-8924-CA)"
                    className="w-full min-h-[46px] pl-10 pr-4 py-2.5 rounded-xl bg-brand-navy-elevated text-white placeholder-slate-400 text-sm border border-white/15 focus:border-brand-amber focus:outline-none font-mono"
                  />
                </div>
                <ActionButton type="submit" variant="primary" className="min-h-[46px]">
                  <span>Suivre mon fret</span>
                  <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
                </ActionButton>
              </form>

              {/* Résultat du suivi fret */}
              {trackingResult && (
                <div
                  role="status"
                  className="max-w-xl bg-brand-navy-elevated border border-brand-gold/50 rounded-2xl p-4 sm:p-5 space-y-3 text-xs sm:text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                    <div className="flex items-center gap-2 text-brand-amber font-mono font-bold tabular-nums">
                      <PackageCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span>DOSSIER FRET : {trackingResult.code}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-slate-400">Aperçu indicatif</span>
                      <button
                        type="button"
                        onClick={() => setTrackingResult(null)}
                        className="min-h-[32px] px-2 text-xs text-slate-300 hover:text-white underline underline-offset-2 cursor-pointer"
                      >
                        Fermer
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block">Statut actuel</span>
                      <span className="text-white font-semibold">{trackingResult.status}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Destination finale</span>
                      <span className="text-white font-semibold">{trackingResult.destination}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Conformité Douane</span>
                      <span className="text-emerald-400 font-semibold">{trackingResult.customs}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Estimation (ETA)</span>
                      <span className="text-brand-gold font-mono tabular-nums font-semibold">
                        {trackingResult.eta}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions principales */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
                <ActionButton
                  variant="primary"
                  onClick={() => onNavigate('contact')}
                  className="min-h-[48px] px-6 text-sm sm:text-base shadow-sm"
                >
                  <span>Calculer un devis de fret</span>
                  <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
                </ActionButton>
                <button
                  type="button"
                  onClick={() => onNavigate('services')}
                  className="ds-btn-base min-h-[48px] px-6 bg-white/10 hover:bg-white/15 text-white border border-white/20 text-sm sm:text-base"
                >
                  Découvrir nos 3 services
                </button>
              </div>
            </div>

            {/* Indicateurs clés vérifiables en pied de hero */}
            <div className="mt-12 pt-8 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl">
              <div>
                <div className="font-mono tabular-nums text-2xl sm:text-3xl font-bold text-brand-gold">
                  14 800+
                </div>
                <div className="text-xs sm:text-sm text-slate-300 mt-1">
                  Conteneurs EVP pilotés par an · Rail CN &amp; CPKC
                </div>
              </div>
              <div>
                <div className="font-mono tabular-nums text-2xl sm:text-3xl font-bold text-white">
                  28 500 m²
                </div>
                <div className="text-xs sm:text-sm text-slate-300 mt-1">
                  Plateforme d’entreposage sous douane à Surrey (BC)
                </div>
              </div>
              <div>
                <div className="font-mono tabular-nums text-2xl sm:text-3xl font-bold text-emerald-400">
                  99,6 %
                </div>
                <div className="text-xs sm:text-sm text-slate-300 mt-1">
                  Mainlevée douanière directe agréée CBSA / OEA
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION CAPACITÉS STRATÉGIQUES — Transition vers #0B2545 & grille éditoriale asymétrique */}
        <section className="bg-brand-navy text-white py-16 sm:py-22 border-b border-white/10">
          <div className="ds-container space-y-10">
            <SectionHeader
              tone="dark"
              kicker="Capacités Stratégiques"
              title="Réseau Transcontinental & Océanique"
              subtitle="Une architecture logistique intégrée reliant les terminaux du Pacifique aux chaînes d'approvisionnement nord-américaines et mondiales."
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* Pilier principal */}
              <SurfaceCard
                tone="dark"
                className="lg:col-span-6 flex flex-col justify-between space-y-6 hover:border-brand-gold/40 transition-colors"
              >
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-brand-amber/15 border border-brand-amber/30 flex items-center justify-center">
                    <Ship className="w-6 h-6 text-brand-amber" aria-hidden="true" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white">
                    Corridors Maritimes &amp; Intermodaux
                  </h3>
                  <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                    Liaisons régulières FCL (20’/40’HC), groupage LCL et conteneurs Reefer reliant
                    les ports du Pacifique (Vancouver / Fraser Surrey Docks) et de l’Atlantique aux
                    hubs mondiaux.
                  </p>
                </div>
                <MetadataRow
                  tone="dark"
                  className="pt-4 border-t border-white/10 text-brand-gold"
                  items={['14 800+ EVP traités / an', 'Connexions Rail CN & CPKC']}
                />
              </SurfaceCard>

              {/* Piliers complémentaires */}
              <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-6">
                <SurfaceCard
                  tone="dark"
                  className="flex flex-col justify-between space-y-4 hover:border-brand-gold/40 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-xl bg-brand-amber/15 border border-brand-amber/30 flex items-center justify-center shrink-0">
                      <Warehouse className="w-5 h-5 text-brand-amber" aria-hidden="true" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-bold text-white">
                        Hub d’Entreposage Sous Douane (BC)
                      </h3>
                      <p className="text-sm text-slate-300 leading-relaxed">
                        28 500 m² d’infrastructures sécurisées à Surrey (King George Blvd) :
                        stockage sous douane, cross-docking et pilotage WMS temps réel.
                      </p>
                    </div>
                  </div>
                  <MetadataRow
                    tone="dark"
                    className="pt-3 border-t border-white/10 text-brand-gold"
                    items={['Surveillance 24/7', 'Dépotage sous 24h']}
                  />
                </SurfaceCard>

                <SurfaceCard
                  tone="dark"
                  className="flex flex-col justify-between space-y-4 hover:border-brand-gold/40 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-xl bg-brand-amber/15 border border-brand-amber/30 flex items-center justify-center shrink-0">
                      <FileCheck2 className="w-5 h-5 text-brand-amber" aria-hidden="true" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-bold text-white">
                        Douanes Agréées CBSA / ASFC &amp; OEA
                      </h3>
                      <p className="text-sm text-slate-300 leading-relaxed">
                        Dédouanement import/export par EDI pré-arrivée, ingénierie documentaire
                        (B/L, AWB, EUR1) et conformité Incoterms® 2020.
                      </p>
                    </div>
                  </div>
                  <MetadataRow
                    tone="dark"
                    className="pt-3 border-t border-white/10 text-brand-gold"
                    items={['99,6 % conformité directe', 'Audit EDI pré-arrivée']}
                  />
                </SurfaceCard>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION EXPERTISE — Fond clair structuré */}
        <section className="bg-surface-canvas py-16 sm:py-24">
          <div className="ds-container space-y-12">
            <SectionHeader
              kicker="Nos Domaines d’Expertise Logistique"
              title="Des solutions logistiques complètes et sur mesure pour vos flux mondiaux."
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {settings.services.map((srv) => {
                const imgSrc = SERVICE_IMAGES[srv.id] || serviceMultimodalImg;
                return (
                  <article
                    key={srv.id}
                    className="ds-card overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow"
                  >
                    <div>
                      <div className="h-52 relative bg-brand-navy-deep overflow-hidden">
                        <img
                          src={imgSrc}
                          alt={srv.title}
                          referrerPolicy="no-referrer"
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-brand-navy-deep/85 via-transparent to-transparent" />
                        <span className="absolute bottom-3 left-4 font-mono tabular-nums text-xl font-bold text-brand-amber">
                          {srv.number}.
                        </span>
                      </div>

                      <div className="p-6 space-y-3">
                        <div className="text-xs font-semibold text-brand-blue">{srv.subtitle}</div>
                        <h3 className="text-xl font-bold text-ink-primary">
                          {srv.number}. {srv.title}
                        </h3>
                        <p className="text-sm text-ink-secondary leading-relaxed">
                          {srv.description}
                        </p>

                        <ul className="pt-3 space-y-2 border-t border-surface-border">
                          {srv.highlights.map((h, i) => (
                            <li
                              key={i}
                              className="text-xs text-ink-primary flex items-start gap-2"
                            >
                              <CheckCircle2
                                className="w-4 h-4 text-brand-amber shrink-0 mt-0.5"
                                aria-hidden="true"
                              />
                              <span>{h}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="px-6 pb-6 pt-2">
                      <ActionButton
                        variant="navy"
                        fullWidth
                        onClick={() => onNavigate('contact', srv.title)}
                      >
                        <span>Demander un devis pour ce service</span>
                        <ArrowRight className="w-4 h-4 text-brand-amber" aria-hidden="true" />
                      </ActionButton>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    );
  }

  // ==========================================================================
  // PAGE 2 : SERVICES
  // ==========================================================================
  if (page === 'services') {
    return (
      <div className="bg-surface-canvas min-h-screen py-12 sm:py-16">
        <div className="ds-container space-y-12">
          <SectionHeader
            as="h1"
            kicker={`Nos Domaines d’Expertise · ${settings.company_name}`}
            title="Des solutions logistiques complètes et sur mesure pour vos flux mondiaux."
            subtitle={`« ${settings.slogan} » — Découvrez nos trois départements opérationnels basés à Surrey (BC, Canada).`}
          />

          <div className="space-y-10">
            {settings.services.map((srv, index) => {
              const imgSrc = SERVICE_IMAGES[srv.id] || serviceMultimodalImg;
              return (
                <section
                  key={srv.id}
                  className="ds-card overflow-hidden grid grid-cols-1 lg:grid-cols-12"
                >
                  <div
                    className={`lg:col-span-5 relative min-h-[260px] bg-brand-navy-deep ${
                      index % 2 === 1 ? 'lg:order-2' : ''
                    }`}
                  >
                    <img
                      src={imgSrc}
                      alt={srv.title}
                      referrerPolicy="no-referrer"
                      loading={index === 0 ? 'eager' : 'lazy'}
                      decoding="async"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-brand-navy-deep/85 via-transparent to-transparent" />
                    <div className="absolute bottom-5 left-5 right-5 text-white">
                      <span className="font-mono tabular-nums text-brand-gold text-xs font-bold block uppercase">
                        Pôle Opérationnel {srv.number}
                      </span>
                      <span className="font-bold text-lg">{srv.subtitle}</span>
                    </div>
                  </div>

                  <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between space-y-6">
                    <div className="space-y-4">
                      <div className="text-xs font-mono tabular-nums text-brand-blue font-semibold">
                        SERVICE {srv.number} · {settings.company_name}
                      </div>
                      <h2 className="font-bold text-2xl sm:text-3xl text-ink-primary">
                        {srv.number}. {srv.title}
                      </h2>
                      <p className="text-ink-secondary text-sm sm:text-base leading-relaxed">
                        {srv.description}
                      </p>

                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        {srv.highlights.map((item, idx) => (
                          <li
                            key={idx}
                            className="p-3.5 rounded-xl bg-surface-subtle border border-surface-border text-xs sm:text-sm text-ink-primary flex items-start gap-2.5"
                          >
                            <CheckCircle2
                              className="w-4 h-4 text-brand-amber shrink-0 mt-0.5"
                              aria-hidden="true"
                            />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-4 border-t border-surface-border flex flex-wrap items-center justify-between gap-4">
                      {settings.phone && settings.phone.trim().length > 0 ? (
                        <div className="text-xs text-ink-secondary">
                          Ligne directe :{' '}
                          <strong className="font-mono tabular-nums text-ink-primary">
                            {settings.phone}
                          </strong>
                        </div>
                      ) : (
                        <div className="text-xs text-ink-secondary">
                          Cotation sur dossier sous 24h ouvrées
                        </div>
                      )}
                      <ActionButton
                        variant="primary"
                        onClick={() => onNavigate('contact', srv.title)}
                      >
                        <span>Calculer un devis — {srv.title}</span>
                        <ArrowRight className="w-4 h-4" aria-hidden="true" />
                      </ActionButton>
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // PAGE 3 : À PROPOS
  // ==========================================================================
  if (page === 'apropos') {
    return (
      <div className="ds-container py-12 sm:py-16 space-y-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 space-y-5">
            <SectionHeader
              as="h1"
              kicker="À propos de notre entreprise · Surrey, BC, Canada"
              title={`${settings.company_name} : L’excellence logistique canadienne tournée vers le monde`}
            />
            <p className="text-base sm:text-lg text-brand-gold font-bold">
              « {settings.slogan} »
            </p>
            <p className="text-sm sm:text-base text-ink-secondary leading-relaxed max-w-[65ch]">
              Implantée sur{' '}
              <strong className="text-ink-primary">
                King George Blvd à Surrey (BC V3T 2W1, Canada)
              </strong>
              , au carrefour stratégique du Grand Vancouver, des terminaux portuaires du Pacifique
              et de la frontière américaine, <strong>{settings.company_name}</strong> accompagne
              les importateurs, exportateurs et industriels dans la maîtrise complète de leur
              chaîne logistique.
            </p>
            <p className="text-sm sm:text-base text-ink-secondary leading-relaxed max-w-[65ch]">
              En tant que transitaire et commissionnaire en douane agréé CBSA / OEA, nous
              garantissons la fluidité, la traçabilité et la sécurité réglementaire de vos
              expéditions sur tous les continents.
            </p>
          </div>

          <SurfaceCard tone="dark" className="lg:col-span-5 space-y-6">
            <h2 className="font-bold text-xl text-brand-gold">Fiche Signalétique Officielle</h2>
            <dl className="space-y-4 text-sm">
              <div className="border-b border-white/10 pb-3">
                <dt className="text-xs text-slate-400">Raison sociale</dt>
                <dd className="font-bold text-white mt-0.5">{settings.company_name}</dd>
              </div>
              <div className="border-b border-white/10 pb-3">
                <dt className="text-xs text-slate-400">Siège Social &amp; Exploitation</dt>
                <dd className="font-medium text-white mt-0.5">{settings.address}</dd>
              </div>
              {settings.phone && settings.phone.trim().length > 0 && (
                <div className="border-b border-white/10 pb-3">
                  <dt className="text-xs text-slate-400">Téléphone &amp; WhatsApp</dt>
                  <dd className="font-mono tabular-nums font-semibold text-brand-amber mt-0.5">
                    {settings.phone}
                  </dd>
                </div>
              )}
              {settings.email && settings.email.trim().length > 0 && (
                <div className="border-b border-white/10 pb-3">
                  <dt className="text-xs text-slate-400">Courriel Officiel</dt>
                  <dd className="font-mono text-white mt-0.5 break-all">{settings.email}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-slate-400">Accréditations</dt>
                <dd className="text-slate-200 mt-0.5 leading-relaxed">
                  Transitaire &amp; Douanes Agréés CBSA / OEA · Transport Multimodal Global ·
                  Entreposage Sous Douane
                </dd>
              </div>
            </dl>
          </SurfaceCard>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SurfaceCard className="space-y-3">
            <Globe2 className="w-8 h-8 text-brand-navy" aria-hidden="true" />
            <h3 className="font-bold text-lg text-ink-primary">01. Réseau Sans Frontières</h3>
            <p className="text-sm text-ink-secondary leading-relaxed">
              Une couverture opérationnelle reliant les ports canadiens (Vancouver/Surrey, Prince
              Rupert, Montréal, Halifax) aux hubs majeurs d’Europe, d’Asie et des Amériques.
            </p>
          </SurfaceCard>

          <SurfaceCard className="space-y-3">
            <ShieldCheck className="w-8 h-8 text-brand-navy" aria-hidden="true" />
            <h3 className="font-bold text-lg text-ink-primary">
              02. Sécurité &amp; Conformité Douanière
            </h3>
            <p className="text-sm text-ink-secondary leading-relaxed">
              Respect strict des réglementations de l’ASFC (CBSA), des normes OEA, IMDG/IATA et des
              protocoles de sûreté de la chaîne d’approvisionnement internationale.
            </p>
          </SurfaceCard>

          <SurfaceCard className="space-y-3">
            <Clock className="w-8 h-8 text-brand-navy" aria-hidden="true" />
            <h3 className="font-bold text-lg text-ink-primary">03. Réactivité &amp; Ponctualité</h3>
            <p className="text-sm text-ink-secondary leading-relaxed">
              Un interlocuteur unique dédié à chaque dossier d’expédition, garantissant une
              visibilité en temps réel et le respect rigoureux de vos délais d’approvisionnement.
            </p>
          </SurfaceCard>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // PAGE 4 : CONTACT (Formulaire fonctionnel + Carte Google Maps)
  // ==========================================================================
  return (
    <div className="ds-container py-12 sm:py-16 space-y-12">
      <SectionHeader
        as="h1"
        kicker="Service Clientèle, Affrètement & Cotations · Surrey, BC, Canada"
        title={`Contactez ${settings.company_name}`}
        subtitle="Notre équipe vous accompagne pour toute demande de cotation de transport multimodal, de stockage en entrepôt ou d’assistance aux formalités douanières CBSA."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Formulaire de contact */}
        <SurfaceCard className="lg:col-span-7">
          <h2 className="font-bold text-xl text-ink-primary mb-2">
            Formulaire de Demande de Devis &amp; Contact
          </h2>
          <p className="text-xs sm:text-sm text-ink-secondary mb-6">
            Les champs marqués d’un astérisque (*) sont obligatoires. Réponse garantie sous 24
            heures ouvrées.
          </p>

          {submitStatus && (
            <StatusNotice variant={submitStatus.type} className="mb-6">
              {submitStatus.text}
            </StatusNotice>
          )}

          <form onSubmit={handleContactSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="contact-fullname"
                  className="block text-xs font-semibold text-ink-primary mb-1.5"
                >
                  Nom complet *
                </label>
                <input
                  id="contact-fullname"
                  type="text"
                  required
                  value={contactForm.nom_complet}
                  onChange={(e) =>
                    setContactForm({ ...contactForm, nom_complet: e.target.value })
                  }
                  placeholder="Ex: Jean Tremblay"
                  className="ds-input"
                />
              </div>
              <div>
                <label
                  htmlFor="contact-company"
                  className="block text-xs font-semibold text-ink-primary mb-1.5"
                >
                  Entreprise / Organisation
                </label>
                <input
                  id="contact-company"
                  type="text"
                  value={contactForm.entreprise}
                  onChange={(e) =>
                    setContactForm({ ...contactForm, entreprise: e.target.value })
                  }
                  placeholder="Nom de votre société"
                  className="ds-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="contact-email"
                  className="block text-xs font-semibold text-ink-primary mb-1.5"
                >
                  Adresse e-mail professionnelle *
                </label>
                <input
                  id="contact-email"
                  type="email"
                  required
                  value={contactForm.email}
                  onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  placeholder="votre.nom@entreprise.com"
                  className="ds-input"
                />
              </div>
              <div>
                <label
                  htmlFor="contact-phone"
                  className="block text-xs font-semibold text-ink-primary mb-1.5"
                >
                  Téléphone / WhatsApp
                </label>
                <input
                  id="contact-phone"
                  type="tel"
                  value={contactForm.telephone}
                  onChange={(e) =>
                    setContactForm({ ...contactForm, telephone: e.target.value })
                  }
                  placeholder={settings.phone || '+1 (000) 000-0000'}
                  className="ds-input"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="contact-service"
                className="block text-xs font-semibold text-ink-primary mb-1.5"
              >
                Service concerné *
              </label>
              <select
                id="contact-service"
                value={contactForm.service_concerne}
                onChange={(e) =>
                  setContactForm({ ...contactForm, service_concerne: e.target.value })
                }
                className="ds-input cursor-pointer"
              >
                {settings.services.map((s) => (
                  <option key={s.id} value={s.title}>
                    {s.number}. {s.title}
                  </option>
                ))}
                <option value="Autre demande logistique">
                  Autre demande logistique / Partenariat
                </option>
              </select>
            </div>

            <div>
              <label
                htmlFor="contact-subject"
                className="block text-xs font-semibold text-ink-primary mb-1.5"
              >
                Objet de votre demande *
              </label>
              <input
                id="contact-subject"
                type="text"
                required
                value={contactForm.sujet}
                onChange={(e) => setContactForm({ ...contactForm, sujet: e.target.value })}
                placeholder="Ex: Cotation FCL 40'HC / Entreposage sous douane à Surrey"
                className="ds-input"
              />
            </div>

            <div>
              <label
                htmlFor="contact-message"
                className="block text-xs font-semibold text-ink-primary mb-1.5"
              >
                Détails de votre expédition ou message *
              </label>
              <textarea
                id="contact-message"
                rows={5}
                required
                value={contactForm.message}
                onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                placeholder="Précisez l'origine, la destination, la nature des marchandises, le volume estimé et les dates souhaitées..."
                className="ds-input py-3 leading-relaxed"
              />
            </div>

            <ActionButton
              type="submit"
              variant="primary"
              fullWidth
              disabled={submitting}
              className="min-h-[48px]"
            >
              <Send className="w-4 h-4" aria-hidden="true" />
              <span>
                {submitting
                  ? 'Transmission en cours...'
                  : 'Envoyer ma demande à ATLANTIC TRANSPORT LTD'}
              </span>
            </ActionButton>
          </form>
        </SurfaceCard>

        {/* Coordonnées + Carte Google Maps */}
        <div className="lg:col-span-5 space-y-6">
          <SurfaceCard tone="dark" className="space-y-5">
            <div>
              <h2 className="font-bold text-xl text-white">Coordonnées Directes</h2>
              <p className="text-xs text-brand-gold mt-1">{settings.company_name}</p>
            </div>

            <div className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-brand-amber shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <span className="block text-xs text-slate-400">Adresse du Siège</span>
                  <span className="font-medium text-white">{settings.address}</span>
                </div>
              </div>

              {/* Coordonnées Directes Téléphone (Masquées si Secrétariat) */}
              {settings.phone && settings.phone.trim().length > 0 && (
                <div className="flex items-start gap-3">
                  <Phone
                    className="w-5 h-5 text-brand-amber shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <div className="space-y-1">
                    <span className="block text-xs text-slate-400">
                      Téléphones Directs (Appel &amp; WhatsApp)
                    </span>
                    <div className="flex flex-wrap items-center gap-x-2 font-mono tabular-nums">
                      <a
                        href={`tel:${settings.phone.replace(/\s+/g, '')}`}
                        className="font-bold text-brand-amber hover:underline text-base"
                        title="Téléphone principal"
                      >
                        {settings.phone}
                      </a>
                      <span className="text-xs text-brand-gold uppercase font-semibold">
                        (Principal)
                      </span>
                      {settings.phone_secondary && (
                        <>
                          <span className="text-slate-500">·</span>
                          <a
                            href={`tel:${settings.phone_secondary.replace(/\s+/g, '')}`}
                            className="text-slate-300 hover:text-white hover:underline text-sm"
                            title="Numéro secondaire"
                          >
                            {settings.phone_secondary}
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Coordonnées Directes Email (Masquées si Secrétariat) */}
              {settings.email && settings.email.trim().length > 0 && (
                <div className="flex items-start gap-3">
                  <Mail
                    className="w-5 h-5 text-brand-amber shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <div className="space-y-1">
                    <span className="block text-xs text-slate-400">
                      Adresses E-mails Officielles
                    </span>
                    <div className="space-y-1">
                      <div>
                        <a
                          href={`mailto:${settings.email}`}
                          className="font-bold text-brand-amber hover:underline break-all block text-sm"
                          title="Email principal"
                        >
                          {settings.email}{' '}
                          <span className="text-xs text-amber-300 font-normal">
                            (Principal &amp; Expéditeur officiel)
                          </span>
                        </a>
                      </div>
                      {settings.email_secondary && (
                        <div>
                          <a
                            href={`mailto:${settings.email_secondary}`}
                            className="text-slate-300 hover:text-white hover:underline break-all block text-xs"
                            title="Email secondaire"
                          >
                            {settings.email_secondary} (Secondaire)
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Notice confidentielle Secrétariat si coordonnées masquées */}
              {!hasDirectContact && (
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300 leading-relaxed space-y-2">
                  <div className="flex items-center gap-2 text-brand-amber font-semibold">
                    <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                    <span>Espace d&apos;Accueil Secrétariat Général</span>
                  </div>
                  <p>
                    Dans le cadre des procédures d&apos;étanchéité et de conformité administrative,
                    les convocations et formalités d&apos;embauche sont gérées sur dossier.
                  </p>
                  <p className="text-slate-400">
                    Pour toute transmission administrative, veuillez renseigner le formulaire
                    ci-contre ou vous présenter au siège social.
                  </p>
                </div>
              )}
            </div>

            {/* Boutons d'action directs (uniquement si téléphone disponible) */}
            {settings.phone && settings.phone.trim().length > 0 && (
              <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row gap-3">
                <a
                  href={`https://wa.me/${(settings.whatsapp || settings.phone).replace(/[^\d]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ds-btn-base ds-btn-primary flex-1 text-xs sm:text-sm"
                >
                  <MessageCircle className="w-4 h-4" aria-hidden="true" />
                  <span>Écrire sur WhatsApp</span>
                </a>
                <a
                  href={`tel:${settings.phone.replace(/\s+/g, '')}`}
                  className="ds-btn-base flex-1 bg-white/10 text-white hover:bg-white/20 text-xs sm:text-sm border border-white/15"
                >
                  <Phone className="w-4 h-4 text-brand-amber" aria-hidden="true" />
                  <span>Appeler</span>
                </a>
              </div>
            )}
          </SurfaceCard>

          {/* Interactive Google Maps Embed */}
          <SurfaceCard padded={false} className="overflow-hidden">
            <div className="px-5 py-3.5 border-b border-surface-border flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-ink-primary">
                Localisation Google Maps — Surrey, BC V3T 2W1, Canada
              </span>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  settings.address
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-brand-blue hover:underline shrink-0"
              >
                Agrandir la carte
              </a>
            </div>
            <div className="w-full h-80 bg-surface-subtle">
              <iframe
                title="Carte Google Maps ATLANTIC TRANSPORT LTD - King George Blvd, Surrey, BC V3T 2W1, Canada"
                src={`https://www.google.com/maps?q=${encodeURIComponent(
                  settings.address
                )}&output=embed`}
                className="w-full h-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </SurfaceCard>
        </div>
      </div>
    </div>
  );
};
