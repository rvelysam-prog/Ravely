import React from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { TYPE_SCALE } from '../../styles/designTokens';

interface SectionHeaderProps {
  kicker?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  tone?: 'light' | 'dark';
  as?: 'h1' | 'h2';
  className?: string;
}

/**
 * En-tête de section éditorial sans pilules décoratives.
 */
export const SectionHeader: React.FC<SectionHeaderProps> = ({
  kicker,
  title,
  subtitle,
  tone = 'light',
  as = 'h2',
  className = ''
}) => {
  const HeadingTag = as;
  const headingSize = as === 'h1' ? TYPE_SCALE.pageTitle : TYPE_SCALE.sectionTitle;

  return (
    <div className={`max-w-3xl space-y-3 ${className}`}>
      {kicker && (
        <div
          className={`ds-kicker ${
            tone === 'dark' ? 'text-brand-gold' : 'text-brand-blue'
          }`}
        >
          {kicker}
        </div>
      )}
      <HeadingTag
        className={`${headingSize} ${
          tone === 'dark' ? 'text-white' : 'text-ink-primary'
        }`}
      >
        {title}
      </HeadingTag>
      {subtitle && (
        <p
          className={`${TYPE_SCALE.body} max-w-[65ch] ${
            tone === 'dark' ? 'text-slate-300' : 'text-ink-secondary'
          }`}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
};

interface SurfaceCardProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: 'light' | 'dark' | 'subtle';
  padded?: boolean;
}

/**
 * Carte structurelle à élévation unique (1 niveau de bordure, jamais de cartes imbriquées).
 */
export const SurfaceCard: React.FC<SurfaceCardProps> = ({
  tone = 'light',
  padded = true,
  className = '',
  children,
  ...rest
}) => {
  const toneClass =
    tone === 'dark'
      ? 'ds-card-dark'
      : tone === 'subtle'
      ? 'bg-surface-subtle border border-surface-border rounded-2xl'
      : 'ds-card';

  return (
    <div
      className={`${toneClass} ${padded ? 'p-6 sm:p-8' : ''} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
};

interface MetadataRowProps {
  items: React.ReactNode[];
  tone?: 'light' | 'dark';
  className?: string;
}

/**
 * Ligne de métadonnées épurée sans pilules ni bordures en capsule.
 */
export const MetadataRow: React.FC<MetadataRowProps> = ({
  items,
  tone = 'light',
  className = ''
}) => {
  const cleanItems = items.filter(Boolean);
  return (
    <div
      className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium ${
        tone === 'dark' ? 'text-slate-300' : 'text-ink-secondary'
      } ${className}`}
    >
      {cleanItems.map((item, idx) => (
        <React.Fragment key={idx}>
          {idx > 0 && (
            <span
              aria-hidden="true"
              className={tone === 'dark' ? 'text-slate-500' : 'text-slate-400'}
            >
              ·
            </span>
          )}
          <span className="tabular-nums">{item}</span>
        </React.Fragment>
      ))}
    </div>
  );
};

type ButtonVariant = 'primary' | 'navy' | 'secondary' | 'ghost';

interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
}

/**
 * Bouton normalisé conforme aux cibles tactiles >= 44px et au contraste WCAG AA.
 */
export const ActionButton: React.FC<ActionButtonProps> = ({
  variant = 'primary',
  fullWidth = false,
  className = '',
  children,
  type = 'button',
  ...rest
}) => {
  const variantClass =
    variant === 'primary'
      ? 'ds-btn-primary'
      : variant === 'navy'
      ? 'ds-btn-navy'
      : variant === 'secondary'
      ? 'ds-btn-secondary'
      : 'bg-transparent hover:bg-surface-subtle text-ink-primary';

  return (
    <button
      type={type}
      className={`ds-btn-base ${variantClass} ${
        fullWidth ? 'w-full' : ''
      } disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
};

interface StatusNoticeProps {
  variant: 'success' | 'warning' | 'error' | 'info';
  title?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Bandeau d'état accessible (icône + libellé explicite, sans bordure gauche épaisse).
 */
export const StatusNotice: React.FC<StatusNoticeProps> = ({
  variant,
  title,
  children,
  className = ''
}) => {
  const styles =
    variant === 'success'
      ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
      : variant === 'warning'
      ? 'bg-amber-50 border-amber-200 text-amber-950'
      : variant === 'error'
      ? 'bg-red-50 border-red-200 text-red-950'
      : 'bg-sky-50 border-sky-200 text-slate-900';

  const Icon =
    variant === 'success'
      ? CheckCircle2
      : variant === 'warning'
      ? AlertTriangle
      : variant === 'error'
      ? XCircle
      : Info;

  const iconColor =
    variant === 'success'
      ? 'text-emerald-700'
      : variant === 'warning'
      ? 'text-amber-700'
      : variant === 'error'
      ? 'text-red-700'
      : 'text-brand-blue';

  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={`p-4 rounded-xl border text-xs sm:text-sm flex items-start gap-3 ${styles} ${className}`}
    >
      <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconColor}`} aria-hidden="true" />
      <div className="space-y-0.5 min-w-0">
        {title && <div className="font-bold">{title}</div>}
        <div className="leading-relaxed">{children}</div>
      </div>
    </div>
  );
};

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = ''
}) => (
  <div
    className={`ds-card p-8 sm:p-12 text-center flex flex-col items-center justify-center gap-3 ${className}`}
  >
    {icon && (
      <div className="w-12 h-12 rounded-xl bg-surface-subtle border border-surface-border flex items-center justify-center text-ink-secondary">
        {icon}
      </div>
    )}
    <h3 className="text-base sm:text-lg font-bold text-ink-primary">{title}</h3>
    <p className="text-xs sm:text-sm text-ink-secondary max-w-md leading-relaxed">
      {description}
    </p>
    {action && <div className="pt-2">{action}</div>}
  </div>
);
