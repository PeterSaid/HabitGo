import React from 'react';
import { useI18n } from '../../i18n';

export default function Splash() {
  const { t } = useI18n();
  return (
    <div className="page page-no-nav center" style={{ minHeight: '100dvh', flexDirection: 'column', gap: 'var(--sp-4)' }}>
      <div className="center celebrate-pop" style={{ flexDirection: 'column', gap: 'var(--sp-4)' }}>
        <Logo size={92} />
        <h1 className="t-page-title" style={{ letterSpacing: '-0.5px' }}>
          Habit<span style={{ color: 'var(--primary)' }}>Go</span>
        </h1>
        <p className="text-muted t-body" style={{ whiteSpace: 'pre-line', textAlign: 'center', lineHeight: 1.7 }}>
          {t('tagline')}
        </p>
      </div>
      <div style={{ position: 'absolute', bottom: '12vh' }}>
        <div className="spinner" />
      </div>
    </div>
  );
}

/** Brand mark: rounded square (gradient) with an "H" whose crossbar is a check. */
export function Logo({ size = 80 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" aria-hidden>
      <defs>
        <linearGradient id="hgLogoGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22C55E" />
          <stop offset="100%" stopColor="#14B8A6" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="88" height="88" rx="26" fill="url(#hgLogoGrad)" />
      {/* H stems */}
      <rect x="26" y="26" width="11" height="44" rx="5.5" fill="#fff" />
      <rect x="59" y="26" width="11" height="44" rx="5.5" fill="#fff" />
      {/* crossbar drawn as a rising check (progress) */}
      <path d="M31 55 L44 63 L67 35" stroke="#fff" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.98" />
    </svg>
  );
}
