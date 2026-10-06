import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, Info, X } from 'lucide-react';
import type { TranslationKey } from '../i18n/en';
import { useI18n } from '../i18n';

/* ================= Button ================= */
type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'text' | 'danger' | 'gold';
type ButtonSize = 'sm' | 'md' | 'lg';

export function Button({
  variant = 'primary',
  size = 'md',
  block,
  loading,
  icon,
  children,
  className = '',
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <button
      className={`btn btn-${variant} ${size === 'md' ? '' : `btn-${size}`} ${block ? 'btn-block' : ''} ${loading ? 'is-loading' : ''} ${className}`}
      {...rest}
    >
      {loading ? <span className="btn-spinner" aria-hidden /> : icon}
      {children}
    </button>
  );
}

export function IconButton({ children, className = '', ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`btn-icon ${className}`} {...rest}>
      {children}
    </button>
  );
}

/* ================= Card ================= */
export function Card({
  gradient,
  gold,
  elevated,
  className = '',
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { gradient?: boolean; gold?: boolean; elevated?: boolean }) {
  return (
    <div
      className={`card ${gradient ? 'card-gradient' : ''} ${gold ? 'card-gold' : ''} ${elevated ? 'card-elevated' : ''} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <div className="row-between mb-3" style={{ marginTop: 'var(--sp-5)' }}>
      <h2 className="t-section">{title}</h2>
      {action && (
        <button className="btn-text" style={{ color: 'var(--primary)', fontWeight: 600 }} onClick={onAction}>
          {action}
        </button>
      )}
    </div>
  );
}

/* ================= Inputs ================= */
export function Field({
  label,
  error,
  optional,
  children,
}: {
  label?: string;
  error?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="field">
      {label && (
        <label className="field-label">
          {label}
          {optional && <span className="text-faint"> · ({useI18n().t('optional')})</span>}
        </label>
      )}
      {children}
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}

export function Input({ error, className = '', ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean }) {
  return <input className={`input ${error ? 'input-error' : ''} ${className}`} {...rest} />;
}

export function Textarea({ error, className = '', ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean }) {
  return <textarea className={`textarea ${error ? 'input-error' : ''} ${className}`} {...rest} />;
}

export function Select({ error, className = '', children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean }) {
  return (
    <select className={`select ${error ? 'input-error' : ''} ${className}`} {...rest}>
      {children}
    </select>
  );
}

/* ================= Chips / Segmented ================= */
export function Chip({
  selected,
  children,
  className = '',
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }) {
  return (
    <button className={`chip ${selected ? 'is-selected' : ''} ${className}`} aria-pressed={selected} {...rest}>
      {children}
    </button>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="segmented" role="tablist">
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={value === o.value} className={value === o.value ? 'is-active' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ================= Badge / Progress ================= */
export function Badge({ variant, className = '', style, children }: { variant?: 'gold' | 'error' | 'info' | 'muted'; className?: string; style?: React.CSSProperties; children: React.ReactNode }) {
  return <span className={`badge ${variant ? `badge-${variant}` : ''} ${className}`} style={style}>{children}</span>;
}

export function ProgressBar({ value, gold }: { value: number; gold?: boolean }) {
  return (
    <div className="progress-track" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className={`progress-fill ${gold ? 'progress-fill-gold' : ''}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

/* ================= Switch ================= */
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button role="switch" aria-checked={checked} aria-label={label} className={`switch ${checked ? 'is-on' : ''}`} onClick={() => onChange(!checked)} />
  );
}

/* ================= Bottom Sheet / Modal ================= */
export function Sheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="sheet-handle" />
        {children}
      </div>
    </div>
  );
}

export function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        {children}
      </div>
    </div>
  );
}

/* ================= Toasts ================= */
type Toast = { id: number; message: string; kind: 'success' | 'error' | 'info' };
const ToastContext = createContext<{ toast: (message: string, kind?: Toast['kind']) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const toast = useCallback((message: string, kind: Toast['kind'] = 'info') => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, message, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="toast-container" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind}`}>
            {t.kind === 'success' && <Check size={18} color="var(--success)" />}
            {t.kind === 'error' && <AlertTriangle size={18} color="var(--error)" />}
            {t.kind === 'info' && <Info size={18} color="var(--info)" />}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx.toast;
}

/* ================= States: Loading / Empty / Error ================= */
export function Skeleton({ w, h, r, className = '' }: { w?: number | string; h?: number | string; r?: number | string; className?: string }) {
  return <div className={`skeleton ${className}`} style={{ width: w, height: h, borderRadius: r }} />;
}

export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="col" style={{ gap: 'var(--sp-3)' }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="card row" style={{ gap: 'var(--sp-3)' }}>
          <Skeleton w={46} h={46} r={12} />
          <div className="grow col" style={{ gap: 8 }}>
            <Skeleton w="55%" h={16} />
            <Skeleton w="35%" h={12} />
          </div>
          <Skeleton w={52} h={52} r={26} />
        </div>
      ))}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  const { t } = useI18n();
  return (
    <div className="state-block">
      <div className="spinner" />
      {label && <span className="t-caption">{label || t('loading')}</span>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  desc,
  cta,
  onCta,
}: {
  icon: React.ReactNode;
  title: string;
  desc?: string;
  cta?: string;
  onCta?: () => void;
}) {
  return (
    <div className="state-block">
      <div className="state-icon">{icon}</div>
      <h3 className="t-section">{title}</h3>
      {desc && <p className="text-muted t-body">{desc}</p>}
      {cta && onCta && (
        <Button className="mt-3" onClick={onCta}>
          {cta}
        </Button>
      )}
    </div>
  );
}

export function ErrorState({ onRetry, desc }: { onRetry?: () => void; desc?: string }) {
  const { t } = useI18n();
  return (
    <div className="state-block">
      <div className="state-icon state-icon-error">
        <AlertTriangle />
      </div>
      <h3 className="t-section">{t('error_state_title')}</h3>
      <p className="text-muted t-body">{desc || t('error_state_desc')}</p>
      {onRetry && (
        <Button variant="outline" className="mt-3" onClick={onRetry}>
          {t('try_again')}
        </Button>
      )}
    </div>
  );
}

/* ================= App bar ================= */
export function AppBar({
  title,
  onBack,
  right,
  transparent,
}: {
  title?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  transparent?: boolean;
}) {
  const { t } = useI18n();
  const navigate = useNavigateShim();
  return (
    <div className="app-bar" style={transparent ? { background: 'transparent', backdropFilter: 'none' } : undefined}>
      {onBack ? (
        <IconButton aria-label={t('back')} onClick={onBack ?? navigate(-1)}>
          <BackIcon />
        </IconButton>
      ) : (
        <span style={{ width: 44 }} />
      )}
      {title && <h1 className="app-bar-title grow" style={{ textAlign: 'center' }}>{title}</h1>}
      {right ? right : <span style={{ width: 44 }} />}
    </div>
  );
}

// tiny helper so AppBar can go back without importing router here
import { useNavigate as useRouterNavigate } from 'react-router-dom';
function useNavigateShim() {
  const navigate = useRouterNavigate();
  return (delta?: number) => navigate(delta ?? -1);
}
function BackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'scaleX(var(--flip, 1))' }}>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

export function ListRow({ icon, title, subtitle, right, onClick }: { icon?: React.ReactNode; title: React.ReactNode; subtitle?: React.ReactNode; right?: React.ReactNode; onClick?: () => void }) {
  return (
    <div className={`list-item ${onClick ? '' : ''}`} onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      {icon}
      <div className="grow">
        <div className="t-card-title">{title}</div>
        {subtitle && <div className="t-caption text-muted">{subtitle}</div>}
      </div>
      {right}
    </div>
  );
}

export function StatTile({ label, value, sub, accent }: { label: string; value: React.ReactNode; sub?: React.ReactNode; accent?: 'primary' | 'gold' }) {
  return (
    <Card className="col" style={{ gap: 4 }}>
      <span className="t-caption text-muted">{label}</span>
      <span className="t-section tnum" style={{ color: accent === 'gold' ? 'var(--gold)' : accent === 'primary' ? 'var(--primary)' : 'var(--text)' }}>
        {value}
      </span>
      {sub && <span className="t-caption">{sub}</span>}
    </Card>
  );
}

export type { TranslationKey };
export { X };
