import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useI18n } from '../../i18n';
import { useStore } from '../../state/store';
import { useToast } from '../../ui/components';
import { Button, Card, Segmented } from '../../ui/components';

const INTERESTS = [
  { id: 'health', key: 'interests_health', icon: '❤️' },
  { id: 'sports', key: 'interests_sports', icon: '🏋️' },
  { id: 'productivity', key: 'interests_productivity', icon: '⚡' },
  { id: 'learning', key: 'interests_learning', icon: '🎓' },
  { id: 'reading', key: 'interests_reading', icon: '📚' },
  { id: 'mental', key: 'interests_mental', icon: '🧘' },
  { id: 'sleep', key: 'interests_sleep', icon: '🌙' },
  { id: 'money', key: 'interests_money', icon: '💰' },
  { id: 'relationships', key: 'interests_relationships', icon: '🤝' },
  { id: 'growth', key: 'interests_growth', icon: '🌱' },
] as const;

/** Personalization (spec section 23) — also handles language + theme first choice. */
export default function Personalization() {
  const { t, locale, setLocale } = useI18n();
  const navigate = useNavigate();
  const toast = useToast();
  const { user, refreshUser, patchUser } = useStore();
  const [selected, setSelected] = useState<string[]>(user?.interests ?? []);
  const [busy, setBusy] = useState(false);

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const finish = async () => {
    setBusy(true);
    try {
      await api.post('/users/me/personalization', { interests: selected });
      await refreshUser();
      navigate('/');
    } catch {
      // never leave the user stuck on a network hiccup: proceed into the app;
      // interests are saved again at the next successful sync
      toast(t('err_generic'), 'error');
      patchUser({ onboarded: true, interests: selected });
      navigate('/');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page page-no-nav" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: 'var(--sp-6) 0 var(--sp-2)' }}>
        <h1 className="t-page-title">{t('personalization_title')}</h1>
        <p className="text-muted t-body mt-2">{t('personalization_desc')}</p>
      </div>

      <div className="mt-4 mb-4">
        <Segmented
          options={[
            { value: 'ar', label: 'العربية' },
            { value: 'en', label: 'English' },
          ]}
          value={locale}
          onChange={setLocale}
        />
      </div>

      <div className="grid-2 grow" style={{ gridTemplateColumns: '1fr 1fr', alignContent: 'start', gap: 'var(--sp-3)' }}>
        {INTERESTS.map((it) => {
          const active = selected.includes(it.id);
          return (
            <Card
              key={it.id}
              role="checkbox"
              aria-checked={active}
              tabIndex={0}
              onClick={() => toggle(it.id)}
              onKeyDown={(e) => e.key === 'Enter' && toggle(it.id)}
              className="center"
              style={{
                flexDirection: 'column', gap: 6, padding: 'var(--sp-4)', cursor: 'pointer',
                borderColor: active ? 'var(--primary)' : 'var(--border)',
                background: active ? 'var(--soft-green)' : 'var(--surface)',
                transition: 'all 160ms var(--ease)',
              }}
            >
              <span style={{ fontSize: 30 }}>{it.icon}</span>
              <span className="t-label" style={{ fontWeight: 600, color: active ? 'var(--primary-soft-text)' : 'var(--text)' }}>
                {t(it.key as never)}
              </span>
            </Card>
          );
        })}
      </div>

      <div style={{ padding: 'var(--sp-4) 0 var(--sp-5)' }}>
        <Button block size="lg" loading={busy} onClick={finish}>
          {t('personalization_cta')}
        </Button>
      </div>
    </div>
  );
}
