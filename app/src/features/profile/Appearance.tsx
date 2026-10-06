import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../i18n';
import { useStore } from '../../state/store';
import { useTheme } from '../../theme/ThemeContext';
import { AppBar, Card, Segmented } from '../../ui/components';
import { api } from '../../api/client';

/** Appearance (spec section 18) — light/dark/system with persistence on backend too. */
export default function Appearance() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { refreshUser } = useStore();

  const change = async (v: 'light' | 'dark' | 'system') => {
    setTheme(v);
    try {
      await api.put('/users/me/settings', { theme: v });
      refreshUser();
    } catch {
      /* offline: local persistence already applied */
    }
  };

  return (
    <div className="page page-no-nav">
      <AppBar onBack={() => navigate(-1)} title={t('appearance')} />
      <div className="mt-5">
        <Segmented
          options={[
            { value: 'light', label: t('theme_light') },
            { value: 'dark', label: t('theme_dark') },
            { value: 'system', label: t('theme_system') },
          ]}
          value={theme}
          onChange={change}
        />
      </div>

      <div className="grid-2 mt-5" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <PreviewCard label={t('theme_light')} active={theme === 'light'} onClick={() => change('light')} theme="light" />
        <PreviewCard label={t('theme_dark')} active={theme === 'dark'} onClick={() => change('dark')} theme="dark" />
      </div>
    </div>
  );
}

function PreviewCard({ label, active, onClick, theme }: { label: string; active: boolean; onClick: () => void; theme: 'light' | 'dark' }) {
  const bg = theme === 'light' ? '#F8FAF9' : '#0D1210';
  const surface = theme === 'light' ? '#FFFFFF' : '#18201C';
  const text = theme === 'light' ? '#17201B' : '#F7FAF8';
  return (
    <div
      onClick={onClick}
      role="button"
      aria-pressed={active}
      style={{
        borderRadius: 'var(--r-lg)', border: active ? '2.5px solid var(--primary)' : '1.5px solid var(--border)',
        padding: 10, cursor: 'pointer', background: bg,
      }}
    >
      <div style={{ background: surface, borderRadius: 10, padding: 10, minHeight: 92 }}>
        <div style={{ height: 8, width: '60%', borderRadius: 8, background: text, opacity: 0.75, marginBottom: 8 }} />
        <div style={{ height: 34, borderRadius: 9, background: 'linear-gradient(135deg,#22C55E,#14B8A6)', marginBottom: 8 }} />
        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ height: 22, flex: 1, borderRadius: 7, background: '#22C55E', opacity: 0.25 }} />
          <div style={{ height: 22, flex: 1, borderRadius: 7, background: text, opacity: 0.12 }} />
        </div>
      </div>
      <p className="t-label center mt-2" style={{ fontWeight: 600, color: 'var(--text)' }}>{label}</p>
    </div>
  );
}
