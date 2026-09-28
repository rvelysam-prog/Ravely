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
    service_concerne: selectedServiceForQuote || settings.services[0]?.title || 'Transport Multimodal Global',
    sujet: '',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitStatus(null);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactForm)
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitStatus({ type: 'error', text: data.error || 'Une erreur est survenue.' });
      } else {
        setSubmitStatus({ type: 'success', text: data.message });
        setContactForm({
          nom_complet: '',
          entreprise: '',
          email: '',
          telephone: '',
          service_concerne: settings.services[0]?.title || 'Transport Multimodal Global',
          sujet: '',
          message: ''
        });
      }
    } catch {
      setSubmitStatus({
        type: 'error',
        text: 'Impossible de transmettre votre message actuellement. Veuillez nous contacter par téléphone ou e-mail.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const cleanWhatsapp = settings.whatsapp || settings.phone.replace(/[^\d]/g, '');

  // ==========================================================================
  // PAGE 1 : ACCUEIL
  // ==========================================================================
  if (page === 'accueil') {
    return (
      <div className="space-y-0">
        {/* HERO SECTION — Fond bleu nuit #0B1220 */}
        <section className="relative bg-[#0B1220] text-white overflow-hidden border-b border-white/10">
          <div className="absolute inset-0 pointer-events-none">
            <img
              src={heroPortImg}
              alt="Terminal portuaire et logistique multimodale ATLANTIC TRANSPORT LTD"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-center opacity-25"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0B1220] via-[#0B1220]/95 to-[#0B1220]/75" />
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-22 lg:py-26">
            <div className="max-w-3xl space-y-6">
              {/* Sur-titre jaune or #D4A017 uppercase 11px */}
              <div className="text-[#D4A017] uppercase text-[11px] font-bold tracking-widest leading-relaxed">
                SIÈGE SOCIAL : SURREY (BC), CANADA | HUB PACIFIQUE | DOUANES CBSA
              </div>

              {/* Titre 42px bold en 2 couleurs : "Le monde sans frontières," en blanc et "votre logistique sans limites." en jaune or #D4A017 */}
              <h1 className="font-bold text-[32px] sm:text-[42px] leading-[1.15] tracking-tight">
                <span className="text-white block sm:inline">Le monde sans frontières, </span>
                <span className="text-[#D4A017] block sm:inline">votre logistique sans limites.</span>
              </h1>

              {/* Paragraphe gris clair #9CA3AF 15px */}
              <p className="text-[#9CA3AF] text-[15px] leading-relaxed max-w-2xl">
                Depuis notre centre opérationnel de Surrey (Colombie-Britannique, Canada),{' '}
                <strong className="text-white font-semibold">{settings.company_name}</strong> pilote vos flux de
                transport multimodal global (maritime, aérien, ferroviaire et routier), vos opérations d’entreposage
                sous douane et l’intégralité de vos formalités douanières CBSA / OEA.
              </p>

              {/* Barre suivi fret avec input "N° de suivi (ex: ATL-8924-CA)" + bouton orange "Suivre mon fret →" */}
              <form
                onSubmit={handleTrackFreight}
                className="pt-1 max-w-xl flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 bg-white/5 p-2 rounded-2xl border border-white/15 backdrop-blur-xs"
              >
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={trackingInput}
                    onChange={(e) => setTrackingInput(e.target.value)}
                    placeholder="N° de suivi (ex: ATL-8924-CA)"
                    className="w-full min-h-[46px] pl-10 pr-4 py-2.5 rounded-xl bg-[#111A2E] text-white placeholder-gray-400 text-sm border border-white/10 focus:border-[#F59E0B] focus:outline-none font-mono"
                  />
                </div>
                <button
                  type="submit"
                  className="min-h-[46px] px-5 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-gray-950 font-bold text-sm transition-colors whitespace-nowrap shrink-0"
                >
                  Suivre mon fret →
                </button>
              </form>

              {/* Résultat du suivi fret en direct */}
              {trackingResult && (
                <div className="max-w-xl bg-[#111A2E] border border-[#D4A017]/50 rounded-2xl p-4 sm:p-5 space-y-3 text-xs sm:text-sm">
                  <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                    <div className="flex items-center gap-2 text-[#F59E0B] font-mono font-bold">
                      <PackageCheck className="w-4 h-4 shrink-0" />
                      <span>DOSSIER FRET : {trackingResult.code}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTrackingResult(null)}
                      className="text-xs text-gray-400 hover:text-white"
                    >
                      Fermer
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    <div>
                      <span className="text-gray-400 block">Statut actuel</span>
                      <span className="text-white font-semibold">{trackingResult.status}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Destination finale</span>
                      <span className="text-white font-semibold">{trackingResult.destination}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Conformité Douane</span>
                      <span className="text-emerald-400 font-semibold">{trackingResult.customs}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Estimation (ETA)</span>
                      <span className="text-[#D4A017] font-mono font-semibold">{trackingResult.eta}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 2 CTA : "Calculer un devis de fret" orange et "Découvrir nos 3 services" gris sombre */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
                <button
                  type="button"
                  onClick={() => onNavigate('contact')}
                  className="min-h-[48px] px-6 py-3 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-gray-950 font-bold text-sm sm:text-base transition-colors flex items-center justify-center gap-2 whitespace-nowrap shadow-sm"
                >
                  <span>Calculer un devis de fret</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('services')}
                  className="min-h-[48px] px-6 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-semibold text-sm sm:text-base border border-gray-700 transition-colors flex items-center justify-center whitespace-nowrap"
                >
                  Découvrir nos 3 services
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION "CAPACITÉS STRATÉGIQUES" — Fond #0B1220 avec titre blanc "Réseau Transcontinental & Océanique" et 3 cartes sombres à icônes jaunes */}
        <section className="bg-[#0B1220] text-white py-16 sm:py-20 border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
            <div className="max-w-3xl space-y-2">
              <div className="text-[#D4A017] uppercase text-[11px] font-bold tracking-widest">
                CAPACITÉS STRATÉGIQUES
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight">
                Réseau Transcontinental &amp; Océanique
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Carte sombre 1 à icône jaune */}
              <div className="bg-[#111A2E] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-4 hover:border-[#D4A017]/40 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-[#F59E0B]/15 border border-[#F59E0B]/30 flex items-center justify-center">
                  <Ship className="w-6 h-6 text-[#F59E0B]" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white">
                  Corridors Maritimes &amp; Intermodaux
                </h3>
                <p className="text-sm text-[#9CA3AF] leading-relaxed">
                  Liaisons régulières FCL (20’/40’HC), groupage LCL et conteneurs Reefer reliant les ports du Pacifique (Vancouver / Fraser Surrey Docks) et de l’Atlantique aux hubs mondiaux.
                </p>
                <div className="pt-2 border-t border-white/10 font-mono text-xs text-[#D4A017]">
                  14 800+ EVP traités / an · Rail CN &amp; CPKC
                </div>
              </div>

              {/* Carte sombre 2 à icône jaune */}
              <div className="bg-[#111A2E] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-4 hover:border-[#D4A017]/40 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-[#F59E0B]/15 border border-[#F59E0B]/30 flex items-center justify-center">
                  <Warehouse className="w-6 h-6 text-[#F59E0B]" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white">
                  Hub d’Entreposage Sous Douane (BC)
                </h3>
                <p className="text-sm text-[#9CA3AF] leading-relaxed">
                  28 500 m² d’infrastructures logistiques sécurisées à Surrey (King George Blvd) : stockage sous douane, cross-docking, gestion informatisée WMS et distribution nord-américaine.
                </p>
                <div className="pt-2 border-t border-white/10 font-mono text-xs text-[#D4A017]">
                  Surveillance 24/7 · Dépotage sous 24h
                </div>
              </div>

              {/* Carte sombre 3 à icône jaune */}
              <div className="bg-[#111A2E] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-4 hover:border-[#D4A017]/40 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-[#F59E0B]/15 border border-[#F59E0B]/30 flex items-center justify-center">
                  <FileCheck2 className="w-6 h-6 text-[#F59E0B]" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white">
                  Douanes Agréées CBSA / ASFC &amp; OEA
                </h3>
                <p className="text-sm text-[#9CA3AF] leading-relaxed">
                  Dédouanement import/export accéléré par EDI pré-arrivée, ingénierie documentaire (B/L, AWB, EUR1, certificats d’origine) et conformité tarifaire Incoterms® 2020.
                </p>
                <div className="pt-2 border-t border-white/10 font-mono text-xs text-[#D4A017]">
                  99,6 % de conformité douanière directe
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION EXPERTISE — Fond #F3F4F6 avec sur-titre bleu #1E3A8A, titre noir 32px bold "Des solutions logistiques complètes et sur mesure pour vos flux mondiaux." */}
        <section className="bg-[#F3F4F6] py-16 sm:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="max-w-3xl space-y-3">
              <div className="text-[#1E3A8A] uppercase text-xs font-bold tracking-wider">
                NOS DOMAINES D’EXPERTISE LOGISTIQUE
              </div>
              <h2 className="text-[26px] sm:text-[32px] font-bold text-gray-950 leading-tight [text-wrap:balance]">
                Des solutions logistiques complètes et sur mesure pour vos flux mondiaux.
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {settings.services.map((srv) => {
                const imgSrc = SERVICE_IMAGES[srv.id] || serviceMultimodalImg;
                return (
                  <article
                    key={srv.id}
                    className="bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col justify-between shadow-xs hover:shadow-md transition-shadow"
                  >
                    <div>
                      <div className="h-52 relative bg-gray-900 overflow-hidden">
                        <img
                          src={imgSrc}
                          alt={srv.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0B1220]/80 via-transparent to-transparent" />
                        <span className="absolute bottom-3 left-4 font-mono text-xl font-bold text-[#F59E0B]">
                          {srv.number}.
                        </span>
                      </div>

                      <div className="p-6 space-y-3">
                        <div className="text-xs font-semibold text-[#1E3A8A]">
                          {srv.subtitle}
                        </div>
                        <h3 className="text-xl font-bold text-gray-950">
                          {srv.number}. {srv.title}
                        </h3>
                        <p className="text-sm text-gray-600 leading-relaxed">
                          {srv.description}
                        </p>

                        <ul className="pt-3 space-y-2 border-t border-gray-100">
                          {srv.highlights.map((h, i) => (
                            <li key={i} className="text-xs text-gray-700 flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
                              <span>{h}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="px-6 pb-6 pt-2">
                      <button
                        type="button"
                        onClick={() => onNavigate('contact', srv.title)}
                        className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[#0B1220] hover:bg-[#1E3A8A] text-white text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                      >
                        <span>Demander un devis pour ce service</span>
                        <ArrowRight className="w-4 h-4 text-[#F59E0B]" />
                      </button>
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
      <div className="bg-[#F3F4F6] min-h-screen py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="max-w-3xl space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-[#1E3A8A]">
              NOS DOMAINES D’EXPERTISE · {settings.company_name}
            </div>
            <h1 className="text-[28px] sm:text-[36px] font-bold text-gray-950 leading-tight">
              Des solutions logistiques complètes et sur mesure pour vos flux mondiaux.
            </h1>
            <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
              « {settings.slogan} » — Découvrez nos trois départements opérationnels basés à Surrey (BC, Canada).
            </p>
          </div>

          <div className="space-y-10">
            {settings.services.map((srv, index) => {
              const imgSrc = SERVICE_IMAGES[srv.id] || serviceMultimodalImg;
              return (
                <section
                  key={srv.id}
                  className="bg-white rounded-2xl border border-gray-200 overflow-hidden grid grid-cols-1 lg:grid-cols-12 shadow-xs"
                >
                  <div
                    className={`lg:col-span-5 relative min-h-[260px] bg-[#0B1220] ${
                      index % 2 === 1 ? 'lg:order-2' : ''
                    }`}
                  >
                    <img
                      src={imgSrc}
                      alt={srv.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B1220]/85 via-transparent to-transparent" />
                    <div className="absolute bottom-5 left-5 right-5 text-white">
                      <span className="font-mono text-[#D4A017] text-xs font-bold block uppercase">
                        Pôle Opérationnel {srv.number}
                      </span>
                      <span className="font-bold text-lg">{srv.subtitle}</span>
                    </div>
                  </div>

                  <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between space-y-6">
                    <div className="space-y-4">
                      <div className="text-xs font-mono text-[#1E3A8A] font-semibold">
                        SERVICE {srv.number} · {settings.company_name}
                      </div>
                      <h2 className="font-bold text-2xl sm:text-3xl text-gray-950">
                        {srv.number}. {srv.title}
                      </h2>
                      <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
                        {srv.description}
                      </p>

                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        {srv.highlights.map((item, idx) => (
                          <li
                            key={idx}
                            className="p-3.5 rounded-xl bg-[#F8F9FA] border border-gray-200 text-xs sm:text-sm text-gray-800 flex items-start gap-2.5"
                          >
                            <CheckCircle2 className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-4">
                      <div className="text-xs text-gray-500">
                        Ligne directe : <strong className="font-mono text-gray-900">{settings.phone}</strong>
                      </div>
                      <button
                        type="button"
                        onClick={() => onNavigate('contact', srv.title)}
                        className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-gray-950 text-xs sm:text-sm font-bold transition-colors inline-flex items-center gap-2 whitespace-nowrap"
                      >
                        <span>Calculer un devis — {srv.title}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 space-y-5">
            <div className="text-xs font-bold uppercase tracking-wider text-[#1E3A8A]">
              À propos de notre entreprise · Surrey, BC, Canada
            </div>
            <h1 className="font-bold text-3xl sm:text-4xl text-gray-950 tracking-tight">
              {settings.company_name} : L’excellence logistique canadienne tournée vers le monde
            </h1>
            <p className="text-base sm:text-lg text-[#D4A017] font-bold">
              « {settings.slogan} »
            </p>
            <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
              Implantée sur <strong className="text-gray-900">King George Blvd à Surrey (BC V3T 2W1, Canada)</strong>,
              au carrefour stratégique du Grand Vancouver, des terminaux portuaires du Pacifique et de la frontière
              américaine, <strong>{settings.company_name}</strong> accompagne les importateurs, exportateurs et
              industriels dans la maîtrise complète de leur chaîne logistique.
            </p>
            <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
              En tant que transitaire et commissionnaire en douane agréé CBSA / OEA, nous garantissons la fluidité,
              la traçabilité et la sécurité réglementaire de vos expéditions sur tous les continents.
            </p>
          </div>

          <div className="lg:col-span-5 bg-[#0B1220] text-white rounded-2xl p-6 sm:p-8 space-y-6 border border-white/10">
            <h2 className="font-bold text-xl text-[#D4A017]">
              Fiche Signalétique Officielle
            </h2>
            <dl className="space-y-4 text-sm">
              <div className="border-b border-white/10 pb-3">
                <dt className="text-xs text-gray-400">Raison sociale</dt>
                <dd className="font-bold text-white mt-0.5">{settings.company_name}</dd>
              </div>
              <div className="border-b border-white/10 pb-3">
                <dt className="text-xs text-gray-400">Siège Social &amp; Exploitation</dt>
                <dd className="font-medium text-white mt-0.5">{settings.address}</dd>
              </div>
              <div className="border-b border-white/10 pb-3">
                <dt className="text-xs text-gray-400">Téléphone &amp; WhatsApp</dt>
                <dd className="font-mono tabular-nums font-semibold text-[#F59E0B] mt-0.5">{settings.phone}</dd>
              </div>
              <div className="border-b border-white/10 pb-3">
                <dt className="text-xs text-gray-400">Courriel Officiel</dt>
                <dd className="font-mono text-white mt-0.5 break-all">{settings.email}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400">Accréditations</dt>
                <dd className="text-gray-200 mt-0.5">
                  Transitaire &amp; Douanes Agréés CBSA / OEA · Transport Multimodal Global · Entreposage Sous Douane
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 space-y-3">
            <Globe2 className="w-8 h-8 text-[#1E3A8A]" />
            <h3 className="font-bold text-lg text-gray-950">
              01. Réseau Sans Frontières
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Une couverture opérationnelle reliant les ports canadiens (Vancouver/Surrey, Prince Rupert, Montréal, Halifax) aux hubs majeurs d’Europe, d’Asie et des Amériques.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 space-y-3">
            <ShieldCheck className="w-8 h-8 text-[#1E3A8A]" />
            <h3 className="font-bold text-lg text-gray-950">
              02. Sécurité &amp; Conformité Douanière
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Respect strict des réglementations de l’ASFC (CBSA), des normes OEA, IMDG/IATA et des protocoles de sûreté de la chaîne d’approvisionnement internationale.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 space-y-3">
            <Clock className="w-8 h-8 text-[#1E3A8A]" />
            <h3 className="font-bold text-lg text-gray-950">
              03. Réactivité &amp; Ponctualité
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Un interlocuteur unique dédié à chaque dossier d’expédition, garantissant une visibilité en temps réel et le respect rigoureux de vos délais d’approvisionnement.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // PAGE 4 : CONTACT (Formulaire fonctionnel + Carte Google Maps)
  // ==========================================================================
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-12">
      <div className="max-w-3xl space-y-3">
        <div className="text-xs font-bold uppercase tracking-wider text-[#1E3A8A]">
          Service Clientèle, Affrètement &amp; Cotations · Surrey, BC, Canada
        </div>
        <h1 className="font-bold text-3xl sm:text-4xl text-gray-950 tracking-tight">
          Contactez {settings.company_name}
        </h1>
        <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
          Notre équipe vous accompagne pour toute demande de cotation de transport multimodal, de stockage en entrepôt ou d’assistance aux formalités douanières CBSA.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Functional Contact Form */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-200 p-6 sm:p-8">
          <h2 className="font-bold text-xl text-gray-950 mb-2">
            Formulaire de Demande de Devis &amp; Contact
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mb-6">
            Les champs marqués d’un astérisque (*) sont obligatoires. Réponse garantie sous 24 heures ouvrées.
          </p>

          {submitStatus && (
            <div
              className={`mb-6 p-4 rounded-xl border text-sm flex items-start gap-3 ${
                submitStatus.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{submitStatus.text}</span>
            </div>
          )}

          <form onSubmit={handleContactSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Nom complet *
                </label>
                <input
                  type="text"
                  required
                  value={contactForm.nom_complet}
                  onChange={(e) => setContactForm({ ...contactForm, nom_complet: e.target.value })}
                  placeholder="Ex: Jean Tremblay"
                  className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:border-[#1E3A8A] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Entreprise / Organisation
                </label>
                <input
                  type="text"
                  value={contactForm.entreprise}
                  onChange={(e) => setContactForm({ ...contactForm, entreprise: e.target.value })}
                  placeholder="Nom de votre société"
                  className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:border-[#1E3A8A] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Adresse e-mail professionnelle *
                </label>
                <input
                  type="email"
                  required
                  value={contactForm.email}
                  onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  placeholder="votre.nom@entreprise.com"
                  className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:border-[#1E3A8A] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Téléphone / WhatsApp
                </label>
                <input
                  type="tel"
                  value={contactForm.telephone}
                  onChange={(e) => setContactForm({ ...contactForm, telephone: e.target.value })}
                  placeholder="+1 (506) 802-2226"
                  className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:border-[#1E3A8A] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Service concerné *
              </label>
              <select
                value={contactForm.service_concerne}
                onChange={(e) => setContactForm({ ...contactForm, service_concerne: e.target.value })}
                className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-gray-300 text-sm bg-white focus:border-[#1E3A8A] focus:outline-none"
              >
                {settings.services.map((s) => (
                  <option key={s.id} value={s.title}>
                    {s.number}. {s.title}
                  </option>
                ))}
                <option value="Autre demande logistique">Autre demande logistique / Partenariat</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Objet de votre demande *
              </label>
              <input
                type="text"
                required
                value={contactForm.sujet}
                onChange={(e) => setContactForm({ ...contactForm, sujet: e.target.value })}
                placeholder="Ex: Cotation FCL 40'HC / Entreposage sous douane à Surrey"
                className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:border-[#1E3A8A] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Détails de votre expédition ou message *
              </label>
              <textarea
                rows={5}
                required
                value={contactForm.message}
                onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                placeholder="Précisez l'origine, la destination, la nature des marchandises, le volume estimé et les dates souhaitées..."
                className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm focus:border-[#1E3A8A] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full min-h-[48px] px-6 py-3.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-gray-950 font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{submitting ? 'Transmission en cours...' : 'Envoyer ma demande à ATLANTIC TRANSPORT LTD'}</span>
            </button>
          </form>
        </div>

        {/* Contact Info + Embedded Google Maps */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#0B1220] text-white rounded-2xl p-6 sm:p-8 space-y-5 border border-white/10">
            <div>
              <h2 className="font-bold text-xl text-white">
                Coordonnées Directes
              </h2>
              <p className="text-xs text-[#D4A017] mt-1">{settings.company_name}</p>
            </div>

            <div className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-[#F59E0B] shrink-0 mt-0.5" />
                <div>
                  <span className="block text-xs text-gray-400">Adresse du Siège</span>
                  <span className="font-medium text-white">{settings.address}</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-[#F59E0B] shrink-0 mt-0.5" />
                <div>
                  <span className="block text-xs text-gray-400">Téléphone / WhatsApp</span>
                  <a
                    href={`tel:${settings.phone.replace(/[^+\d]/g, '')}`}
                    className="font-mono tabular-nums font-bold text-[#F59E0B] hover:underline"
                  >
                    {settings.phone}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-[#F59E0B] shrink-0 mt-0.5" />
                <div>
                  <span className="block text-xs text-gray-400">E-mail Officiel</span>
                  <a
                    href={`mailto:${settings.email}`}
                    className="font-medium text-white hover:text-[#F59E0B] break-all"
                  >
                    {settings.email}
                  </a>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row gap-3">
              <a
                href={`https://wa.me/${cleanWhatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-gray-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Écrire sur WhatsApp</span>
              </a>
              <a
                href={`tel:${settings.phone.replace(/[^+\d]/g, '')}`}
                className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl bg-white/10 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 hover:bg-white/20 transition-colors whitespace-nowrap"
              >
                <Phone className="w-4 h-4 text-[#F59E0B]" />
                <span>Appeler maintenant</span>
              </a>
            </div>
          </div>

          {/* Interactive Google Maps Embed */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-900">
                Localisation Google Maps — Surrey, BC V3T 2W1, Canada
              </span>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-[#1E3A8A] hover:underline"
              >
                Agrandir la carte
              </a>
            </div>
            <div className="w-full h-80 bg-gray-100">
              <iframe
                title="Carte Google Maps ATLANTIC TRANSPORT LTD - King George Blvd, Surrey, BC V3T 2W1, Canada"
                src={`https://www.google.com/maps?q=${encodeURIComponent(settings.address)}&output=embed`}
                className="w-full h-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
