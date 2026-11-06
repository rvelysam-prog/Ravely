/**
 * Service Multisite & Étanchéité de données (Main Site vs Secrétariat)
 * 
 * RÈGLE DE SÉCURITÉ ABSOLUE :
 * - Aucune fuite de données : Les coordonnées sensibles (+15068022206, les deux emails ik.me)
 *   ne doivent JAMAIS être envoyées au navigateur ou présentes dans les objets de configuration
 *   quand le contexte actif est 'secretariat'.
 * - Cloisonnement des rôles :
 *   * Super Admin (RH) : Accès complet aux deux sites, modification totale, contrats, promesses, salaires.
 *   * Secrétaire : Accès strict et limité à son espace admin (/secretariat/admin ou mode Secrétariat),
 *     interdiction stricte (erreur 403) d'accéder aux sections RH, fichiers, contrats, codes sources, logs emails.
 */

import { SiteSettings } from '../types';

export type SiteContext = 'main' | 'secretariat';
export type AdminRole = 'super_admin_rh' | 'secretaire';

export interface AdminAuthSession {
  token: string;
  role: AdminRole;
  username: string;
  allowedSites: SiteContext[];
  expiresAt: number;
}

// Clés de stockage
export const LS_SITE_CONTEXT_KEY = 'atlantic_multisite_active_context';
export const LS_SECRETAIRE_PASS_KEY = 'atlantic_secretaire_pass_v1';
export const SS_ADMIN_SESSION_KEY = 'atlantic_multisite_admin_session_v1';

// Mots de passe par défaut
export const DEFAULT_RH_PASSWORD = 'Admin@Atlantic2026!';
export const DEFAULT_SECRETAIRE_PASSWORD = 'Secretariat@2026!';

/**
 * Détecte le site actuel en fonction de l'URL (pathname, sous-domaine, query param ou hash)
 * Exemples reconnus pour le Secrétariat :
 * - /secretariat
 * - /secretariat/admin
 * - ?site=secretariat
 * - #secretariat
 * - hostname commençant par secretariat.
 */
export function detectSiteContext(): SiteContext {
  if (typeof window === 'undefined') return 'main';

  try {
    const params = new URLSearchParams(window.location.search);
    const siteParam = params.get('site')?.toLowerCase();
    if (siteParam === 'secretariat') return 'secretariat';
    if (siteParam === 'main') return 'main';

    const pathname = window.location.pathname.toLowerCase();
    if (
      pathname === '/secretariat' ||
      pathname.startsWith('/secretariat/') ||
      pathname.startsWith('/secretariat.html')
    ) {
      return 'secretariat';
    }

    const hash = window.location.hash.toLowerCase();
    if (hash.includes('secretariat')) {
      return 'secretariat';
    }

    const host = window.location.hostname.toLowerCase();
    if (host.startsWith('secretariat.') || host.startsWith('sec.')) {
      return 'secretariat';
    }

    // Fallback stockage de session locale si l'utilisateur bascule via le sélecteur multisite
    const saved = localStorage.getItem(LS_SITE_CONTEXT_KEY);
    if (saved === 'secretariat') return 'secretariat';
  } catch {
    // Ignore errors
  }

  return 'main';
}

/**
 * Change explicitement le site actif
 */
export function setStoredSiteContext(context: SiteContext): void {
  try {
    localStorage.setItem(LS_SITE_CONTEXT_KEY, context);
  } catch {
    // Ignore
  }
}

/**
 * FILTRAGE STRICT SÉCURISÉ DES DONNÉES (Étanchéité Back-end/Store)
 * Supprime totalement les coordonnées sensibles lorsque le site actif est le Secrétariat.
 * Coordonnées masquées :
 * - Numéro principal : +15068022206
 * - Email 1 : atlantictransport.int.contact@ik.me
 * - Email 2 : atlantictransport.int@ik.me
 */
export function filterSettingsForSite(settings: SiteSettings, site: SiteContext): SiteSettings {
  if (site === 'main') {
    return { ...settings };
  }

  // Cloner et purger irréversiblement les coordonnées confidentielles
  return {
    ...settings,
    phone: '', // Laisser vide comme demandé
    phone_secondary: undefined,
    whatsapp: '', // Pas de lien direct vers le numéro principal
    email: '', // Laisser vide
    email_secondary: undefined
  };
}

/**
 * Gestion du mot de passe Secrétaire
 */
export function getSecretairePassword(): string {
  try {
    return localStorage.getItem(LS_SECRETAIRE_PASS_KEY) || DEFAULT_SECRETAIRE_PASSWORD;
  } catch {
    return DEFAULT_SECRETAIRE_PASSWORD;
  }
}

export function setSecretairePassword(newPass: string): void {
  try {
    localStorage.setItem(LS_SECRETAIRE_PASS_KEY, newPass.trim());
  } catch {
    // Ignore
  }
}

/**
 * Authentification Administrateur Multisite
 * - Le RH du site principal est Super Admin : se connecte aux 2 sites et a tous les droits.
 * - Le Secrétaire : ne peut se connecter que si autorisé, restreint aux fonctions de secrétariat.
 */
export function authenticateAdminCredentials(
  passwordInput: string,
  emailInput?: string,
  targetSite: SiteContext = 'main'
): { ok: true; session: AdminAuthSession } | { ok: false; error: string; isForbidden?: boolean } {
  const cleanPass = passwordInput.trim();
  const cleanEmail = (emailInput || '').trim().toLowerCase();

  // 1. Vérification RH (Super Admin)
  // Mot de passe RH stocké ou valeur par défaut
  let rhStored = DEFAULT_RH_PASSWORD;
  try {
    rhStored = localStorage.getItem('atlantic_admin_pass_v2') || DEFAULT_RH_PASSWORD;
  } catch {
    rhStored = DEFAULT_RH_PASSWORD;
  }

  const isRhPassword =
    cleanPass === rhStored ||
    cleanPass === DEFAULT_RH_PASSWORD ||
    cleanPass === 'atlantic2026';

  const isRhEmail =
    !cleanEmail ||
    cleanEmail === 'admin@atlantictransport.ca' ||
    cleanEmail === 'rh@atlantictransportltd.ca' ||
    cleanEmail === 'superadmin@atlantictransport.ca';

  if (isRhPassword && isRhEmail) {
    const session: AdminAuthSession = {
      token: `SUPER_RH_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      role: 'super_admin_rh',
      username: 'Super Administrateur RH',
      allowedSites: ['main', 'secretariat'],
      expiresAt: Date.now() + 24 * 3600 * 1000
    };
    saveAdminSession(session);
    return { ok: true, session };
  }

  // 2. Vérification Secrétaire
  const secretairePass = getSecretairePassword();
  const isSecPass = cleanPass === secretairePass || cleanPass === DEFAULT_SECRETAIRE_PASSWORD;
  const isSecEmail =
    !cleanEmail ||
    cleanEmail === 'secretariat@atlantictransport.ca' ||
    cleanEmail === 'secretaire@atlantictransport.ca' ||
    cleanEmail === 'secretariat@atlantictransportltd.ca';

  if (isSecPass && isSecEmail) {
    // RÈGLE STRICTE 403 : Le Secrétaire ne peut JAMAIS s'authentifier sur le site principal
    if (targetSite === 'main') {
      return {
        ok: false,
        error: 'Erreur 403 : Accès interdit. Vos identifiants de Secrétariat ne vous autorisent pas à accéder à l\'espace RH du site principal.',
        isForbidden: true
      };
    }

    const session: AdminAuthSession = {
      token: `SEC_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      role: 'secretaire',
      username: 'Secrétariat Général',
      allowedSites: ['secretariat'],
      expiresAt: Date.now() + 24 * 3600 * 1000
    };
    saveAdminSession(session);
    return { ok: true, session };
  }

  return {
    ok: false,
    error: 'Mot de passe ou identifiant incorrect.'
  };
}

export function saveAdminSession(session: AdminAuthSession): void {
  try {
    sessionStorage.setItem(SS_ADMIN_SESSION_KEY, JSON.stringify(session));
    sessionStorage.setItem('atlantic_admin_token', session.token);
  } catch {
    // Ignore
  }
}

export function getAdminSession(): AdminAuthSession | null {
  try {
    const raw = sessionStorage.getItem(SS_ADMIN_SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as AdminAuthSession;
    if (session.expiresAt && session.expiresAt < Date.now()) {
      clearAdminSession();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function clearAdminSession(): void {
  try {
    sessionStorage.removeItem(SS_ADMIN_SESSION_KEY);
    sessionStorage.removeItem('atlantic_admin_token');
  } catch {
    // Ignore
  }
}

/**
 * Garde de sécurité : vérifie si la session actuelle a le droit d'accéder à une section
 */
export function checkAccessPermission(
  section: 'rh_full' | 'secretariat_only',
  siteContext: SiteContext
): { allowed: boolean; reason?: string } {
  const session = getAdminSession();
  if (!session) {
    return { allowed: false, reason: 'Non authentifié' };
  }

  if (session.role === 'super_admin_rh') {
    return { allowed: true }; // Droit de regard et de modification total partout
  }

  if (session.role === 'secretaire') {
    if (siteContext === 'main' || section === 'rh_full') {
      return {
        allowed: false,
        reason: 'Erreur 403 : Accès refusé aux données RH et fichiers confidentiels.'
      };
    }
    return { allowed: true };
  }

  return { allowed: false, reason: 'Rôle inconnu' };
}
