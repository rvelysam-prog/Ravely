/**
 * Configuration EmailJS pour Atlantic Transport Ltd
 * Solution 100% frontend gratuite (sans Firebase Trigger Email / sans SendGrid / sans forfait payant Blaze).
 *
 * Connexion SMTP Infomaniak dans EmailJS :
 * - Host : mail.infomaniak.com
 * - Port : 587
 * - Email expéditeur : atlantictransport.int.contact@ik.me
 */

// ============================================================================
// VARIABLES DE CONFIGURATION EMAILJS (Modifiables facilement en haut du code)
// ============================================================================
export const EMAILJS_PUBLIC_KEY =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_EMAILJS_PUBLIC_KEY) ||
  'user_atlantic_public_key';

export const EMAILJS_SERVICE_ID =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_EMAILJS_SERVICE_ID) ||
  'service_rhmhxi5';

export const EMAILJS_TEMPLATE_ID =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_EMAILJS_TEMPLATE_ID) ||
  'promesse_embauche';

// Expéditeur unique officiel
export const EMAILJS_SENDER_EMAIL = 'atlantictransport.int.contact@ik.me';

// Paramètres recommandés pour le service SMTP Infomaniak dans EmailJS
export const INFOMANIAK_SMTP_SETTINGS = {
  host: 'mail.infomaniak.com',
  port: 587,
  user: 'atlantictransport.int.contact@ik.me'
};

export interface EmailJsConfig {
  publicKey: string;
  serviceId: string;
  templateId: string;
  senderEmail: string;
}

const LS_EMAILJS_CONFIG_KEY = 'atlantic_emailjs_config_v1';

export function isPlaceholderEmailJsConfig(config?: Partial<EmailJsConfig> | null): boolean {
  if (!config) return true;
  const pubKey = (config.publicKey || '').trim();
  const srvId = (config.serviceId || '').trim();
  const tmplId = (config.templateId || '').trim();

  const isKeyPlaceholder =
    !pubKey ||
    pubKey === 'user_atlantic_public_key' ||
    pubKey.includes('public_key') ||
    pubKey.length < 5;

  const isServicePlaceholder =
    !srvId ||
    srvId === 'service_rhmhxi5' ||
    srvId.includes('rhmhxi5') ||
    srvId.includes('service_placeholder') ||
    srvId.length < 4;

  const isTemplatePlaceholder =
    !tmplId ||
    tmplId.includes('placeholder');

  return isKeyPlaceholder || isServicePlaceholder || isTemplatePlaceholder;
}

export function isEmailJsConfigured(config?: EmailJsConfig): boolean {
  const current = config || getEmailJsConfig();
  return !isPlaceholderEmailJsConfig(current);
}

export function getEmailJsConfig(): EmailJsConfig {
  try {
    const raw = localStorage.getItem(LS_EMAILJS_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        publicKey: parsed.publicKey || EMAILJS_PUBLIC_KEY,
        serviceId: parsed.serviceId || EMAILJS_SERVICE_ID,
        templateId: parsed.templateId || EMAILJS_TEMPLATE_ID,
        senderEmail: EMAILJS_SENDER_EMAIL
      };
    }
  } catch (e) {
    console.warn('[EmailJS] Erreur lecture config locale:', e);
  }
  return {
    publicKey: EMAILJS_PUBLIC_KEY,
    serviceId: EMAILJS_SERVICE_ID,
    templateId: EMAILJS_TEMPLATE_ID,
    senderEmail: EMAILJS_SENDER_EMAIL
  };
}

export function saveEmailJsConfig(config: Partial<EmailJsConfig>): EmailJsConfig {
  const current = getEmailJsConfig();
  const updated: EmailJsConfig = {
    ...current,
    ...config,
    senderEmail: EMAILJS_SENDER_EMAIL
  };
  try {
    localStorage.setItem(LS_EMAILJS_CONFIG_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('[EmailJS] Erreur écriture config locale:', e);
  }
  return updated;
}
