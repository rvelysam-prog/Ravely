/**
 * Service de gestion centralisée des coordonnées de l'entreprise (Atlantic Transport Ltd).
 * Permet à l'administrateur de configurer les numéros de téléphone et adresses emails
 * à utiliser dynamiquement sur les contrats, promesses d'embauche et générateurs de mail.
 * 
 * Clean Architecture : Module autonome, rétrocompatible, avec persistance locale et synchronisation.
 */

export interface CompanyContactConfig {
  primaryPhone: string;
  secondaryPhone?: string;
  primaryEmail: string;
  secondaryEmail?: string;
  companyName: string;
  companyAddress: string;
  enterpriseNumber: string;
  updatedAt: string;
}

export const PHONE_PRESETS = [
  { label: 'Canada (Nouveau-Brunswick / Ligne principale)', value: '+15068022206' },
  { label: 'Canada (Nouveau-Brunswick / Ligne secondaire formatée)', value: '+1 (506) 802-2226' },
  { label: 'Canada (Colombie-Britannique / Siège Surrey)', value: '+1 604 590-1200' }
];

export const EMAIL_PRESETS = [
  { label: 'Infomaniak officiel (ik.me)', value: 'atlantictransport.int.contact@ik.me' },
  { label: 'Infomaniak secondaire (ik.me)', value: 'atlantictransport.int@ik.me' },
  { label: 'Ressources Humaines (Domaine officiel)', value: 'rh@atlantictransportltd.ca' },
  { label: 'Direction Générale (Domaine officiel)', value: 'direction@atlantictransportltd.ca' }
];

export const DEFAULT_COMPANY_CONTACT_CONFIG: CompanyContactConfig = {
  primaryPhone: '+15068022206',
  secondaryPhone: '+1 (506) 802-2226',
  primaryEmail: 'atlantictransport.int.contact@ik.me',
  secondaryEmail: 'atlantictransport.int@ik.me',
  companyName: 'ATLANTIC TRANSPORT LTD',
  companyAddress: 'King George Blvd, Surrey, BC V3T 2W1, Canada',
  enterpriseNumber: '799094917',
  updatedAt: new Date().toISOString()
};

const LS_COMPANY_CONTACT_KEY = 'atlantic_company_contact_config_v1';

export function getCompanyContactConfig(): CompanyContactConfig {
  if (typeof window === 'undefined') return DEFAULT_COMPANY_CONTACT_CONFIG;
  try {
    const raw = localStorage.getItem(LS_COMPANY_CONTACT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_COMPANY_CONTACT_CONFIG,
        ...parsed
      };
    }
  } catch (err) {
    console.warn('[CompanyConfig] Erreur lecture configuration:', err);
  }
  return DEFAULT_COMPANY_CONTACT_CONFIG;
}

export function saveCompanyContactConfig(
  updates: Partial<CompanyContactConfig>
): CompanyContactConfig {
  const current = getCompanyContactConfig();
  const nextConfig: CompanyContactConfig = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString()
  };

  try {
    localStorage.setItem(LS_COMPANY_CONTACT_KEY, JSON.stringify(nextConfig));
    // Émission d'un événement custom pour notifier les composants abonnés
    window.dispatchEvent(
      new CustomEvent('atlantic_company_config_changed', { detail: nextConfig })
    );
  } catch (err) {
    console.warn('[CompanyConfig] Erreur sauvegarde configuration:', err);
  }

  return nextConfig;
}

/**
 * Hook d'abonnement aux mises à jour des coordonnées entreprise en temps réel
 */
export function subscribeCompanyContactConfig(
  callback: (cfg: CompanyContactConfig) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<CompanyContactConfig>;
    if (customEvent.detail) {
      callback(customEvent.detail);
    } else {
      callback(getCompanyContactConfig());
    }
  };

  window.addEventListener('atlantic_company_config_changed', handler);
  window.addEventListener('storage', handler);

  return () => {
    window.removeEventListener('atlantic_company_config_changed', handler);
    window.removeEventListener('storage', handler);
  };
}
