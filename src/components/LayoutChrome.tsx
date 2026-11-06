import React, { useState } from 'react';
import { Menu, X, Lock, Phone, Mail, MapPin, MessageCircle, ArrowRight, Building2, ShieldCheck } from 'lucide-react';
import { PublicPage, SiteSettings } from '../types';
import { BrandLogo } from './BrandLogo';
import { SiteContext } from '../services/multisiteService';

interface HeaderProps {
  settings: SiteSettings;
  currentPage: PublicPage;
  onNavigate: (page: PublicPage) => void;
  onOpenEmployeeModal: () => void;
  isEmployeeLoggedIn: boolean;
  siteContext?: SiteContext;
  onSwitchSite?: (site: SiteContext) => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  currentPage,
  onNavigate,
  onOpenEmployeeModal,
  isEmployeeLoggedIn,
  siteContext = 'main',
  onSwitchSite
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: { id: PublicPage; label: string }[] = [
    { id: 'accueil', label: 'Accueil' },
    { id: 'services', label: 'Services' },
    { id: 'apropos', label: 'À propos' },
    { id: 'nos-offres', label: 'Nos Offres' },
    { id: 'entretien', label: 'Entretien d’Embauche' },
    { id: 'contact', label: 'Contact' }
  ];

  const handleNavClick = (page: PublicPage) => {
    onNavigate(page);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const hasPhone = Boolean(settings.phone && settings.phone.trim().length > 0);
  const hasEmail = Boolean(settings.email && settings.email.trim().length > 0);

  return (
    <>
      {/* Barre Top Noire #0A0A0A 11px avec adresse / coordonnées filtrées + sélecteur multisite étanche */}
      <div className="bg-[#0A0A0A] text-gray-300 text-[11px] leading-tight border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex flex-col md:flex-row items-center justify-between gap-2">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-3.5 gap-y-1">
            <span className="inline-flex items-center gap-1.5 text-gray-300">
              <MapPin className="w-3 h-3 text-[#D4A017] shrink-0" />
              <span>{settings.address}</span>
            </span>

            {/* SÉCURITÉ ÉTANCHÉITÉ : Coordonnées masquées à 100% sur le Secrétariat */}
            {hasPhone && (
              <div className="inline-flex items-center gap-1.5 text-gray-300 font-mono tabular-nums">
                <Phone className="w-3 h-3 text-[#D4A017] shrink-0" />
                <a
                  href={`tel:${settings.phone.replace(/\s+/g, '')}`}
                  className="text-[#D4A017] hover:text-white font-bold transition-colors"
                  title={`Téléphone principal : ${settings.phone}`}
                >
                  {settings.phone}
                </a>
                {settings.phone_secondary && (
                  <>
                    <span className="text-gray-500">/</span>
                    <a
                      href={`tel:${settings.phone_secondary.replace(/\s+/g, '')}`}
                      className="text-gray-300 hover:text-white transition-colors"
                      title={`Numéro secondaire : ${settings.phone_secondary}`}
                    >
                      {settings.phone_secondary}
                    </a>
                  </>
                )}
              </div>
            )}

            {hasEmail && (
              <div className="inline-flex items-center gap-1.5 text-gray-300">
                <Mail className="w-3 h-3 text-[#D4A017] shrink-0" />
                <a
                  href={`mailto:${settings.email}`}
                  className="text-[#D4A017] hover:text-white font-medium transition-colors"
                  title={`Email principal : ${settings.email}`}
                >
                  {settings.email}
                </a>
                {settings.email_secondary && (
                  <>
                    <span className="text-gray-500">/</span>
                    <a
                      href={`mailto:${settings.email_secondary}`}
                      className="text-gray-300 hover:text-white transition-colors"
                      title={`Email secondaire : ${settings.email_secondary}`}
                    >
                      {settings.email_secondary}
                    </a>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Basculeur Multisite Sécurisé (Option 2) */}
            <div className="flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-full border border-white/15 text-[10px]">
              <span className="text-gray-400 font-medium mr-0.5">Site :</span>
              <button
                type="button"
                onClick={() => onSwitchSite?.('main')}
                className={`px-2 py-0.5 rounded-full font-bold transition-all cursor-pointer ${
                  siteContext !== 'secretariat'
                    ? 'bg-[#D4A017] text-gray-950 shadow-xs'
                    : 'text-gray-300 hover:text-white'
                }`}
                title="Consulter le site principal (Direction RH)"
              >
                Principal (RH)
              </button>
              <button
                type="button"
                onClick={() => onSwitchSite?.('secretariat')}
                className={`px-2 py-0.5 rounded-full font-bold transition-all cursor-pointer ${
                  siteContext === 'secretariat'
                    ? 'bg-[#D4A017] text-gray-950 shadow-xs'
                    : 'text-gray-300 hover:text-white'
                }`}
                title="Consulter le clone dédié au Secrétariat (Données sensibles masquées)"
              >
                Secrétariat
              </button>
            </div>

            <div className="hidden sm:inline-block font-semibold text-[#D4A017] tracking-wide uppercase whitespace-nowrap">
              Transitaire &amp; Douanes Agréés CBSA / OEA
            </div>
          </div>
        </div>
      </div>

      {/* Header blanc cassé #F8F9FA sticky */}
      <header className="sticky top-0 z-40 bg-[#F8F9FA] text-gray-900 border-b border-gray-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-22 flex items-center justify-between gap-4">
          {/* Logo légèrement agrandi + "ATLANTIC TRANSPORT LTD" noir bold 20px + sous-texte "SURREY, BC • CANADA" gris 11px */}
          <button
            type="button"
            onClick={() => handleNavClick('accueil')}
            className="flex items-center gap-3.5 text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B] rounded-xl min-h-[48px]"
          >
            <BrandLogo
              customLogoUrl={settings.logo_url}
              companyName={settings.company_name}
              size="header"
            />
            <div className="flex flex-col justify-center">
              <span className="font-bold text-[17px] sm:text-[20px] leading-tight text-gray-950 tracking-tight whitespace-nowrap">
                {settings.company_name}
              </span>
              <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mt-0.5 whitespace-nowrap">
                SURREY, BC • CANADA
              </span>
            </div>
          </button>

          {/* Navigation Links (Desktop) */}
          <nav className="hidden lg:flex items-center gap-7" aria-label="Navigation principale">
            {navItems.map((item) => {
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`relative py-2 text-sm font-semibold transition-colors whitespace-nowrap min-h-[44px] flex items-center ${
                    isActive
                      ? 'text-[#1E3A8A]'
                      : 'text-gray-700 hover:text-gray-950'
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <span className="absolute bottom-1.5 left-0 right-0 h-0.5 bg-[#F59E0B] rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Boutons "Espace Employé" gris clair et "Demander un devis" orange #F59E0B */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onOpenEmployeeModal}
              className="min-h-[42px] px-3.5 sm:px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-900 text-xs sm:text-sm font-semibold transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 border border-gray-300/80"
            >
              <Lock className="w-3.5 h-3.5 text-gray-700 shrink-0" />
              <span>{isEmployeeLoggedIn ? 'Espace Employé (Actif)' : 'Espace Employé'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleNavClick('contact')}
              className="hidden sm:inline-flex min-h-[42px] px-4 sm:px-5 py-2 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-gray-950 text-xs sm:text-sm font-bold transition-colors items-center gap-1.5 whitespace-nowrap shrink-0 shadow-xs"
            >
              <span>Demander un devis</span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="lg:hidden min-h-[42px] min-w-[42px] rounded-xl bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-900 focus:outline-none"
              aria-label={mobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-[#F8F9FA] border-t border-gray-200 px-4 pt-3 pb-6 space-y-2 shadow-lg">
            {navItems.map((item) => {
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full min-h-[46px] px-4 rounded-xl text-left text-sm font-semibold flex items-center justify-between transition-colors ${
                    isActive
                      ? 'bg-[#1E3A8A]/10 text-[#1E3A8A] border border-[#1E3A8A]/20'
                      : 'text-gray-800 hover:bg-gray-200/60'
                  }`}
                >
                  <span>{item.label}</span>
                  {isActive && <span className="text-xs font-mono">Actif</span>}
                </button>
              );
            })}

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleNavClick('contact');
                }}
                className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-[#F59E0B] text-gray-950 font-bold text-sm flex items-center justify-center gap-2"
              >
                <span>Demander un devis</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </header>
    </>
  );
};

interface FooterProps {
  settings: SiteSettings;
  onNavigate: (page: PublicPage) => void;
  onOpenEmployeeModal: () => void;
  onSecretAdminTrigger: () => void;
  siteContext?: SiteContext;
  onSwitchSite?: (site: SiteContext) => void;
}

export const Footer: React.FC<FooterProps> = ({
  settings,
  onNavigate,
  onOpenEmployeeModal,
  onSecretAdminTrigger,
  siteContext = 'main',
  onSwitchSite
}) => {
  const [secretClicks, setSecretClicks] = useState(0);

  const handleCopyrightClick = () => {
    const next = secretClicks + 1;
    if (next >= 5) {
      setSecretClicks(0);
      onSecretAdminTrigger();
    } else {
      setSecretClicks(next);
    }
  };

  const handleNav = (page: PublicPage) => {
    onNavigate(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const hasPhone = Boolean(settings.phone && settings.phone.trim().length > 0);
  const hasEmail = Boolean(settings.email && settings.email.trim().length > 0);
  const hasWhatsapp = Boolean(settings.whatsapp && settings.whatsapp.trim().length > 0);
  const cleanWhatsapp = settings.whatsapp || settings.phone.replace(/[^\d]/g, '');

  return (
    <footer className="bg-[#0B1220] text-gray-300 border-t border-white/10 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Col 1: Brand & Slogan */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <BrandLogo
                customLogoUrl={settings.logo_url}
                companyName={settings.company_name}
                size="footer"
              />
              <div>
                <span className="font-bold text-base text-white tracking-tight block">
                  {settings.company_name}
                </span>
                <span className="text-[11px] text-gray-400 uppercase tracking-wider block">
                  SURREY, BC • CANADA
                </span>
              </div>
            </div>
            <p className="text-sm text-[#D4A017] font-medium leading-relaxed">
              « {settings.slogan} »
            </p>
            <p className="text-xs text-gray-400 leading-relaxed">
              Transitaire international &amp; commissionnaire en douane agréé CBSA / OEA basé à Surrey, Colombie-Britannique, Canada.
            </p>
          </div>

          {/* Col 2: Navigation */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Navigation</h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => handleNav('accueil')}
                  className="hover:text-[#F59E0B] transition-colors py-1"
                >
                  Accueil
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleNav('services')}
                  className="hover:text-[#F59E0B] transition-colors py-1"
                >
                  Nos Services Logistiques
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleNav('apropos')}
                  className="hover:text-[#F59E0B] transition-colors py-1"
                >
                  À propos d’Atlantic Transport
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleNav('nos-offres')}
                  className="hover:text-[#F59E0B] transition-colors py-1 flex items-center gap-1.5"
                >
                  <span>Nos Offres d&apos;Emploi</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-[#D4A017]">Recrutement</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleNav('entretien')}
                  className="hover:text-[#F59E0B] transition-colors py-1 flex items-center gap-1.5 text-slate-300"
                >
                  <span>Entretien d&apos;Embauche (Chat &amp; Code)</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleNav('contact')}
                  className="hover:text-[#F59E0B] transition-colors py-1"
                >
                  Contact &amp; Devis
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onOpenEmployeeModal}
                  className="hover:text-[#F59E0B] transition-colors py-1 text-[#D4A017] font-medium"
                >
                  Espace Employé
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Nos Pôles d'Expertise */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Pôles d’Expertise</h3>
            <ul className="space-y-2.5 text-sm text-gray-300">
              {settings.services.map((srv) => (
                <li key={srv.id}>
                  <button
                    type="button"
                    onClick={() => handleNav('services')}
                    className="text-left hover:text-[#F59E0B] transition-colors py-1 leading-snug"
                  >
                    <span className="font-mono text-[#D4A017] mr-1.5">{srv.number}.</span>
                    {srv.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4: Coordonnées Officielles (Filtrées selon siteContext) */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Siège Social &amp; Contact</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#D4A017] shrink-0 mt-1" />
                <span className="text-gray-200 leading-snug">{settings.address}</span>
              </li>

              {/* Téléphone : Uniquement si non masqué */}
              {hasPhone && (
                <li className="flex items-start gap-2.5">
                  <Phone className="w-4 h-4 text-[#D4A017] shrink-0 mt-1" />
                  <div className="space-y-1 font-mono tabular-nums">
                    <div>
                      <a
                        href={`tel:${settings.phone.replace(/\s+/g, '')}`}
                        className="text-white hover:text-[#F59E0B] transition-colors block font-bold"
                        title="Téléphone principal"
                      >
                        {settings.phone} <span className="text-[10px] text-[#D4A017] uppercase font-sans font-semibold ml-1">(Principal)</span>
                      </a>
                    </div>
                    {settings.phone_secondary && (
                      <div>
                        <a
                          href={`tel:${settings.phone_secondary.replace(/\s+/g, '')}`}
                          className="text-gray-400 hover:text-white transition-colors block text-xs"
                          title="Numéro secondaire"
                        >
                          {settings.phone_secondary} <span className="text-[10px] text-gray-500 font-sans">(Secondaire)</span>
                        </a>
                      </div>
                    )}
                  </div>
                </li>
              )}

              {/* WhatsApp direct : Uniquement si non masqué */}
              {hasWhatsapp && (
                <li className="flex items-center gap-2.5">
                  <MessageCircle className="w-4 h-4 text-[#D4A017] shrink-0" />
                  <a
                    href={`https://wa.me/${settings.whatsapp.replace(/[^\d]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-200 hover:text-[#F59E0B] transition-colors"
                  >
                    WhatsApp Direct : {settings.whatsapp}
                  </a>
                </li>
              )}

              {/* Email officiel : Uniquement si non masqué */}
              {hasEmail && (
                <li className="flex items-start gap-2.5">
                  <Mail className="w-4 h-4 text-[#D4A017] shrink-0 mt-1" />
                  <div className="space-y-1 break-all">
                    <div>
                      <a
                        href={`mailto:${settings.email}`}
                        className="text-white hover:text-[#F59E0B] transition-colors block font-medium"
                        title="Email principal"
                      >
                        {settings.email} <span className="text-[10px] text-[#D4A017] font-semibold ml-1">(Principal)</span>
                      </a>
                    </div>
                    {settings.email_secondary && (
                      <div>
                        <a
                          href={`mailto:${settings.email_secondary}`}
                          className="text-gray-400 hover:text-white transition-colors block text-xs"
                          title="Email secondaire"
                        >
                          {settings.email_secondary} <span className="text-[10px] text-gray-500">(Secondaire)</span>
                        </a>
                      </div>
                    )}
                  </div>
                </li>
              )}

              {/* Message de confidentialité étanche pour le Secrétariat */}
              {!hasPhone && !hasEmail && (
                <li className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-300 leading-relaxed">
                  <span className="font-semibold text-[#D4A017] block mb-1">Espace Secrétariat Général</span>
                  Coordonnées directes et dossiers administratifs communiqués sur convocation officielle ou via le formulaire de contact.
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400">
          <p onClick={handleCopyrightClick} className="select-none cursor-default">
            © 2026 {settings.company_name}. Tous droits réservés.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-lg border border-white/10 text-[11px]">
              <span className="text-gray-400">Site actif :</span>
              <button
                type="button"
                onClick={() => onSwitchSite?.('main')}
                className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                  siteContext !== 'secretariat'
                    ? 'bg-[#D4A017] text-gray-950 shadow-xs'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Principal (RH)
              </button>
              <span className="text-gray-600">|</span>
              <button
                type="button"
                onClick={() => onSwitchSite?.('secretariat')}
                className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                  siteContext === 'secretariat'
                    ? 'bg-[#D4A017] text-gray-950 shadow-xs'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Secrétariat
              </button>
            </div>

            <button
              type="button"
              onClick={onSecretAdminTrigger}
              className="text-xs text-gray-400 hover:text-[#D4A017] transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Lock className="w-3 h-3 text-[#D4A017]" />
              <span>{siteContext === 'secretariat' ? 'Espace Secrétaire' : 'Administration RH'}</span>
            </button>
          </div>

          <p className="text-center sm:text-right">
            Surrey, British Columbia, Canada · Transitaire &amp; Douanes Agréés CBSA / OEA
          </p>
        </div>
      </div>
    </footer>
  );
};
