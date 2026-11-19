import React, { useState } from 'react';
import { Menu, X, Lock, Phone, Mail, MapPin, MessageCircle, ArrowRight } from 'lucide-react';
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
  isEmployeeLoggedIn
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: { id: PublicPage; label: string }[] = [
    { id: 'accueil', label: 'Accueil' },
    { id: 'services', label: 'Services' },
    { id: 'apropos', label: 'À propos' },
    { id: 'nos-offres', label: 'Carrières' },
    { id: 'entretien', label: 'Entretien' },
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
      {/* Bandeau utilitaire supérieur (non sticky — défile hors champ) avec étanchéité Secrétariat */}
      <div className="bg-brand-navy-deep text-slate-300 text-[11px] leading-tight border-b border-white/10">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2 flex flex-col md:flex-row items-center justify-between gap-1.5 sm:gap-2">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-3 gap-y-1 text-center md:text-left">
            <span className="inline-flex items-center gap-1.5 text-slate-300">
              <MapPin className="w-3 h-3 text-brand-gold shrink-0" aria-hidden="true" />
              <span>{settings.address}</span>
            </span>

            {hasPhone && (
              <div className="inline-flex flex-wrap items-center justify-center gap-1.5 text-slate-300 font-mono tabular-nums text-[11px] sm:text-xs">
                <Phone className="w-3.5 h-3.5 text-brand-gold shrink-0" aria-hidden="true" />
                <a
                  href={`tel:${settings.phone.replace(/\s+/g, '')}`}
                  className="text-brand-gold hover:text-white font-bold transition-colors"
                  title={`Téléphone principal : ${settings.phone}`}
                >
                  {settings.phone}
                </a>
                <span className="text-slate-600 hidden sm:inline" aria-hidden="true">·</span>
                <a
                  href={`tel:${(settings.phone_secondary || '+1 (506) 802-2226').replace(/\s+/g, '')}`}
                  className="text-slate-300 hover:text-white font-medium transition-colors hidden sm:inline"
                  title={`Ligne secondaire / Opérations : ${settings.phone_secondary || '+1 (506) 802-2226'}`}
                >
                  {settings.phone_secondary || '+1 (506) 802-2226'}
                </a>
              </div>
            )}

            {hasEmail && (
              <div className="hidden sm:inline-flex items-center gap-1.5 text-slate-300 max-w-full">
                <Mail className="w-3 h-3 text-brand-gold shrink-0" aria-hidden="true" />
                <a
                  href={`mailto:${settings.email}`}
                  className="text-brand-gold hover:text-white font-medium transition-colors"
                  title={`Email principal : ${settings.email}`}
                >
                  {settings.email}
                </a>
                {settings.email_secondary && (
                  <span className="hidden lg:inline-flex items-center gap-1.5">
                    <span className="text-slate-600" aria-hidden="true">·</span>
                    <a
                      href={`mailto:${settings.email_secondary}`}
                      className="text-slate-300 hover:text-white transition-colors"
                      title={`Email secondaire : ${settings.email_secondary}`}
                    >
                      {settings.email_secondary}
                    </a>
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="hidden md:block font-semibold text-brand-gold tracking-wide uppercase whitespace-nowrap text-[11px]">
            Transitaire &amp; Douanes Agréés CBSA / OEA
          </div>
        </div>
      </div>

      {/* Header principal unifié (<= 15% hauteur mobile, contrat 3 zones) */}
      <header className="sticky top-0 z-40 bg-surface-canvas/95 backdrop-blur-sm text-ink-primary border-b border-surface-border shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 sm:h-[76px] flex items-center justify-between gap-4 lg:gap-8">
          {/* Zone 1 : Identité Marque (mot-symbole net) */}
          <button
            type="button"
            onClick={() => handleNavClick('accueil')}
            className="flex items-center gap-2.5 sm:gap-3 text-left rounded-xl min-h-[44px] min-w-0 shrink-0 cursor-pointer"
          >
            <BrandLogo
              customLogoUrl={settings.logo_url}
              companyName={settings.company_name}
              size="header"
            />
            <span className="font-display font-bold text-sm sm:text-lg text-ink-primary tracking-tight whitespace-nowrap truncate max-w-[155px] sm:max-w-none">
              {settings.company_name}
            </span>
          </button>

          {/* Zone 2 : Liens de navigation typographiques sur une ligne */}
          <nav className="hidden lg:flex items-center gap-6" aria-label="Navigation principale">
            {navItems.map((item) => {
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative py-2 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 min-h-[44px] flex items-center cursor-pointer ${
                    isActive
                      ? 'text-brand-navy'
                      : 'text-ink-secondary hover:text-ink-primary'
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <span className="absolute bottom-1.5 left-0 right-0 h-0.5 bg-brand-amber rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3 : Portail Salarié + CTA Principal */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenEmployeeModal}
              className="min-h-[44px] px-3 sm:px-4 py-2 rounded-xl bg-surface-subtle hover:bg-surface-border text-ink-primary text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 border border-surface-border cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-ink-secondary shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline">
                {isEmployeeLoggedIn ? 'Portail actif' : 'Espace Employé'}
              </span>
              <span className="sm:hidden">Portail</span>
            </button>

            <button
              type="button"
              onClick={() => handleNavClick('contact')}
              className="hidden sm:inline-flex min-h-[44px] px-4 sm:px-5 py-2 rounded-xl bg-brand-amber hover:bg-brand-amber-hover text-brand-navy-deep text-xs sm:text-sm font-bold transition-colors items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Demander un devis</span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="lg:hidden min-h-[44px] min-w-[44px] rounded-xl bg-surface-subtle hover:bg-surface-border border border-surface-border flex items-center justify-center text-ink-primary cursor-pointer"
              aria-label={mobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Tiroir Mobile */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-surface-canvas border-t border-surface-border px-4 pt-3 pb-6 space-y-2 shadow-lg">
            {navItems.map((item) => {
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full min-h-[46px] px-4 rounded-xl text-left text-sm font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-brand-navy/10 text-brand-navy border border-brand-navy/20'
                      : 'text-ink-primary hover:bg-surface-subtle'
                  }`}
                >
                  <span>{item.label}</span>
                  {isActive && <span className="text-xs font-mono text-brand-blue">Actif</span>}
                </button>
              );
            })}

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleNavClick('contact');
                }}
                className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-brand-amber hover:bg-brand-amber-hover text-brand-navy-deep font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Demander un devis</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
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
  siteContext = 'main'
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

  return (
    <footer className="bg-brand-navy-deep text-slate-300 border-t border-white/10 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Col 1 : Marque & Slogan */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <BrandLogo
                customLogoUrl={settings.logo_url}
                companyName={settings.company_name}
                size="footer"
              />
              <div>
                <span className="font-display font-bold text-base text-white tracking-tight block">
                  {settings.company_name}
                </span>
                <span className="text-[11px] text-slate-400 uppercase tracking-wider block">
                  SURREY, BC · CANADA
                </span>
              </div>
            </div>
            <p className="text-sm text-brand-gold font-medium leading-relaxed">
              « {settings.slogan} »
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Transitaire international &amp; commissionnaire en douane agréé CBSA / OEA basé à Surrey, Colombie-Britannique, Canada.
            </p>
          </div>

          {/* Col 2 : Navigation */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Navigation</h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => handleNav('accueil')}
                  className="hover:text-brand-amber transition-colors py-1 cursor-pointer"
                >
                  Accueil
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleNav('services')}
                  className="hover:text-brand-amber transition-colors py-1 cursor-pointer"
                >
                  Nos Services Logistiques
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleNav('apropos')}
                  className="hover:text-brand-amber transition-colors py-1 cursor-pointer"
                >
                  À propos d’Atlantic Transport
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleNav('nos-offres')}
                  className="hover:text-brand-amber transition-colors py-1 inline-flex items-center gap-1.5 cursor-pointer text-left"
                >
                  <span>Nos Offres d&apos;Emploi</span>
                  <span aria-hidden="true" className="text-slate-500">·</span>
                  <span className="text-xs text-brand-gold font-semibold">Recrutement</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleNav('entretien')}
                  className="hover:text-brand-amber transition-colors py-1 text-slate-300 cursor-pointer text-left"
                >
                  Entretien d&apos;Embauche (Chat &amp; Code)
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleNav('contact')}
                  className="hover:text-brand-amber transition-colors py-1 cursor-pointer"
                >
                  Contact &amp; Devis
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onOpenEmployeeModal}
                  className="hover:text-brand-amber transition-colors py-1 text-brand-gold font-medium cursor-pointer"
                >
                  Espace Employé
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3 : Pôles d'Expertise */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Pôles d’Expertise</h3>
            <ul className="space-y-2.5 text-sm text-slate-300">
              {settings.services.map((srv) => (
                <li key={srv.id}>
                  <button
                    type="button"
                    onClick={() => handleNav('services')}
                    className="text-left hover:text-brand-amber transition-colors py-1 leading-snug cursor-pointer"
                  >
                    <span className="font-mono text-brand-gold mr-1.5">{srv.number}.</span>
                    {srv.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4 : Coordonnées Officielles (Filtrées selon siteContext) */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Siège Social &amp; Contact</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-brand-gold shrink-0 mt-1" aria-hidden="true" />
                <span className="text-slate-200 leading-snug">{settings.address}</span>
              </li>

              {hasPhone && (
                <li className="flex items-start gap-2.5">
                  <Phone className="w-4 h-4 text-brand-gold shrink-0 mt-1" aria-hidden="true" />
                  <div className="space-y-1 font-mono tabular-nums">
                    <div>
                      <a
                        href={`tel:${settings.phone.replace(/\s+/g, '')}`}
                        className="text-white hover:text-brand-amber transition-colors block font-bold text-xs"
                        title="Téléphone principal"
                      >
                        {settings.phone} <span className="text-[11px] text-brand-gold font-sans font-semibold ml-1">· Ligne Directe</span>
                      </a>
                    </div>
                    <div>
                      <a
                        href={`tel:${(settings.phone_secondary || '+1 (506) 802-2226').replace(/\s+/g, '')}`}
                        className="text-slate-300 hover:text-white transition-colors block text-xs"
                        title="Ligne secondaire / Opérations"
                      >
                        {settings.phone_secondary || '+1 (506) 802-2226'} <span className="text-[11px] text-slate-400 font-sans ml-1">· International</span>
                      </a>
                    </div>
                  </div>
                </li>
              )}

              {hasWhatsapp && (
                <li className="flex items-center gap-2.5">
                  <MessageCircle className="w-4 h-4 text-brand-gold shrink-0" aria-hidden="true" />
                  <a
                    href={`https://wa.me/${settings.whatsapp.replace(/[^\d]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-200 hover:text-brand-amber transition-colors"
                  >
                    WhatsApp Direct : {settings.whatsapp}
                  </a>
                </li>
              )}

              {hasEmail && (
                <li className="flex items-start gap-2.5">
                  <Mail className="w-4 h-4 text-brand-gold shrink-0 mt-1" aria-hidden="true" />
                  <div className="space-y-1 break-all">
                    <div>
                      <a
                        href={`mailto:${settings.email}`}
                        className="text-white hover:text-brand-amber transition-colors block font-medium"
                        title="Email principal"
                      >
                        {settings.email} <span className="text-[11px] text-brand-gold font-semibold ml-1">· Principal</span>
                      </a>
                    </div>
                    {settings.email_secondary && (
                      <div>
                        <a
                          href={`mailto:${settings.email_secondary}`}
                          className="text-slate-400 hover:text-white transition-colors block text-xs"
                          title="Email secondaire"
                        >
                          {settings.email_secondary} <span className="text-[11px] text-slate-500">· Secondaire</span>
                        </a>
                      </div>
                    )}
                  </div>
                </li>
              )}

              {!hasPhone && !hasEmail && (
                <li className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300 leading-relaxed">
                  <span className="font-semibold text-brand-gold block mb-1">Espace Secrétariat Général</span>
                  Coordonnées directes et dossiers administratifs communiqués sur convocation officielle ou via le formulaire de contact.
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p onClick={handleCopyrightClick} className="select-none cursor-default">
            © 2026 {settings.company_name}. Tous droits réservés.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onSecretAdminTrigger}
              className="text-xs text-slate-400 hover:text-brand-gold transition-colors flex items-center gap-1 cursor-pointer min-h-[36px] px-2"
            >
              <Lock className="w-3 h-3 text-brand-gold" aria-hidden="true" />
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
