/**
 * Design System centralisé — ATLANTIC TRANSPORT LTD
 * Source unique des jetons couleurs (60-30-10), échelles typographiques et rayons.
 */

export const BRAND_PALETTE = {
  navy: '#0B2545',
  navyDeep: '#0B1220',
  navyElevated: '#111A2E',
  navyMid: '#134074',
  blue: '#0066B3',
  gold: '#D4A017',
  amber: '#F59E0B',
  amberHover: '#D97706',
  canvas: '#F8FAFC',
  card: '#FFFFFF',
  subtle: '#F1F5F9',
  border: '#E2E8F0',
  inkPrimary: '#0F172A',
  inkSecondary: '#475569',
  inkMuted: '#64748B',
  success: '#16A34A',
  warning: '#D97706',
  danger: '#DC2626'
} as const;

export const TYPE_SCALE = {
  heroTitle: 'text-[clamp(2rem,3.6vw,3.25rem)] font-bold leading-[1.12] tracking-tight',
  pageTitle: 'text-[clamp(1.75rem,3vw,2.5rem)] font-bold leading-[1.16] tracking-tight',
  sectionTitle: 'text-[clamp(1.5rem,2.4vw,2.125rem)] font-bold leading-tight tracking-tight',
  cardTitle: 'text-lg sm:text-xl font-bold leading-snug',
  body: 'text-sm sm:text-[15px] leading-relaxed',
  caption: 'text-xs leading-normal'
} as const;

export const LAYOUT_RHYTHM = {
  container: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
  sectionPad: 'py-14 sm:py-20',
  cardPad: 'p-6 sm:p-8'
} as const;
