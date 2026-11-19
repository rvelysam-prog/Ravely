import { PublicPage, SiteSettings } from '../types';
import { SiteContext } from './multisiteService';

interface RouteSeoMeta {
  title: string;
  description: string;
  robots: 'index, follow' | 'noindex, nofollow';
  canonicalPath: string;
}

function upsertMetaTag(
  attrName: 'name' | 'property',
  attrValue: string,
  content: string
): void {
  if (typeof document === 'undefined') return;
  let el = document.head.querySelector<HTMLMetaElement>(
    `meta[${attrName}="${attrValue}"]`
  );
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attrName, attrValue);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonical(url: string): void {
  if (typeof document === 'undefined') return;
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', url);
}

function resolveRouteSeoMeta(
  page: PublicPage,
  settings: SiteSettings,
  siteContext: SiteContext,
  publicDocId: string | null
): RouteSeoMeta {
  const company = settings.company_name || 'ATLANTIC TRANSPORT LTD';

  if (publicDocId) {
    return {
      title: `Document Certifié · ${company}`,
      description: `Consultation sécurisée d'un document officiel émis par ${company}.`,
      robots: 'noindex, nofollow',
      canonicalPath: '/'
    };
  }

  if (siteContext === 'secretariat') {
    return {
      title: `Secrétariat Administratif · ${company}`,
      description: `Espace d'accueil administratif et secrétariat général de ${company} à Surrey, BC.`,
      robots: 'noindex, nofollow',
      canonicalPath: '/secretariat'
    };
  }

  switch (page) {
    case 'services':
      return {
        title: `Services Multimodaux & Douanes · ${company}`,
        description:
          "Transport maritime, aérien, ferroviaire et routier, entreposage sous douane à Surrey (BC) et dédouanement agréé CBSA/OEA.",
        robots: 'index, follow',
        canonicalPath: '/services'
      };
    case 'nos-offres':
      return {
        title: `Carrières & Offres d'Emploi Canada · ${company}`,
        description:
          "Consultez nos offres d'emploi au Canada (ESA BC) : transport, logistique, entrepôt et douanes. Postulez en ligne.",
        robots: 'index, follow',
        canonicalPath: '/offres'
      };
    case 'entretien':
      return {
        title: `Entretien d'Embauche Officiel · ${company}`,
        description:
          "Accédez à votre espace sécurisé d'entretien d'embauche avec votre code ID candidature ou votre ticket officiel.",
        robots: 'index, follow',
        canonicalPath: '/entretien'
      };
    case 'apropos':
      return {
        title: `À Propos · Transitaire Agréé CBSA | ${company}`,
        description:
          "Basée à Surrey (BC, Canada), ATLANTIC TRANSPORT LTD accompagne importateurs et exportateurs sur les corridors Pacifique et Atlantique.",
        robots: 'index, follow',
        canonicalPath: '/apropos'
      };
    case 'contact':
      return {
        title: `Devis Fret & Contact · ${company}`,
        description:
          "Demandez une cotation de transport multimodal, d'entreposage sous douane ou d'assistance CBSA à Surrey (BC, Canada).",
        robots: 'index, follow',
        canonicalPath: '/contact'
      };
    case 'espace-employe':
      return {
        title: `Espace Employé Sécurisé · ${company}`,
        description:
          'Portail salarié confidentiel pour consulter votre fiche individuelle et votre contrat de travail.',
        robots: 'noindex, nofollow',
        canonicalPath: '/employe.html'
      };
    case 'admin':
      return {
        title: `Administration RH · ${company}`,
        description: 'Backoffice sécurisé réservé à la Direction des Ressources Humaines.',
        robots: 'noindex, nofollow',
        canonicalPath: '/admin.html'
      };
    case 'accueil':
    default:
      return {
        title: `${company} — Logistique & Fret International`,
        description:
          "Transport multimodal mondial, entreposage sous douane à Surrey (BC, Canada) et dédouanement CBSA/OEA. Demandez votre devis ou postulez en ligne.",
        robots: 'index, follow',
        canonicalPath: '/'
      };
  }
}

export function updateDocumentSeo(
  page: PublicPage,
  settings: SiteSettings,
  siteContext: SiteContext,
  publicDocId: string | null = null
): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;

  const meta = resolveRouteSeoMeta(page, settings, siteContext, publicDocId);
  const origin = window.location.origin;
  const canonicalUrl = `${origin}${meta.canonicalPath}`;
  const ogImageUrl = `${origin}/logo-atlantic.png`;

  document.title = meta.title;
  upsertCanonical(canonicalUrl);

  upsertMetaTag('name', 'description', meta.description);
  upsertMetaTag('name', 'robots', meta.robots);

  upsertMetaTag('property', 'og:type', 'website');
  upsertMetaTag('property', 'og:site_name', settings.company_name || 'ATLANTIC TRANSPORT LTD');
  upsertMetaTag('property', 'og:locale', 'fr_CA');
  upsertMetaTag('property', 'og:title', meta.title);
  upsertMetaTag('property', 'og:description', meta.description);
  upsertMetaTag('property', 'og:url', canonicalUrl);
  upsertMetaTag('property', 'og:image', ogImageUrl);

  upsertMetaTag('name', 'twitter:card', 'summary_large_image');
  upsertMetaTag('name', 'twitter:title', meta.title);
  upsertMetaTag('name', 'twitter:description', meta.description);
  upsertMetaTag('name', 'twitter:image', ogImageUrl);

  // Données structurées JSON-LD dynamiques (sans exposer les coordonnées RH en contexte secrétariat)
  const existingJsonLd = document.getElementById('atlantic-dynamic-jsonld');
  const organizationSchema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: settings.company_name || 'ATLANTIC TRANSPORT LTD',
    url: origin,
    logo: ogImageUrl,
    slogan: settings.slogan,
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'King George Blvd',
      addressLocality: 'Surrey',
      addressRegion: 'BC',
      postalCode: 'V3T 2W1',
      addressCountry: 'CA'
    }
  };

  if (siteContext !== 'secretariat' && settings.phone) {
    organizationSchema.telephone = settings.phone;
  }
  if (siteContext !== 'secretariat' && settings.email) {
    organizationSchema.email = settings.email;
  }

  let pageSchema: Record<string, unknown> = organizationSchema;
  if (page === 'services') {
    pageSchema = {
      '@context': 'https://schema.org',
      '@type': 'Service',
      serviceType: 'Transport Multimodal Global, Entreposage Sous Douane & Douanes CBSA',
      provider: organizationSchema,
      areaServed: ['Canada', 'Amérique du Nord', 'International'],
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: 'Services Logistiques ATLANTIC TRANSPORT LTD',
        itemListElement: settings.services.map((srv) => ({
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: srv.title,
            description: srv.description
          }
        }))
      }
    };
  } else if (page === 'nos-offres') {
    pageSchema = {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: meta.title,
      description: meta.description,
      url: canonicalUrl,
      about: organizationSchema
    };
  }

  const serialized = JSON.stringify(pageSchema);
  if (existingJsonLd) {
    existingJsonLd.textContent = serialized;
  } else {
    const script = document.createElement('script');
    script.id = 'atlantic-dynamic-jsonld';
    script.type = 'application/ld+json';
    script.textContent = serialized;
    document.head.appendChild(script);
  }
}
