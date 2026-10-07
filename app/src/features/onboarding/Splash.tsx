import React from 'react';
import { useI18n } from '../../i18n';
import logoUrl from '../../assets/logo.png';

export default function Splash() {
  const { t } = useI18n();
  return (
    <div className="page page-no-nav center" style={{ minHeight: '100dvh', flexDirection: 'column', gap: 'var(--sp-4)' }}>
      <div className="center celebrate-pop" style={{ flexDirection: 'column', gap: 'var(--sp-4)' }}>
        <img src={logoUrl} alt="HabitGo" width={96} height={96} style={{ borderRadius: 24, boxShadow: 'var(--shadow-lg)' }} />
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
