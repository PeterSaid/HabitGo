import React from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useI18n } from '../../i18n';
import { useStore } from '../../state/store';
import { AppBar, Card, Segmented } from '../../ui/components';

/** Language switching (spec sections 17, 78) — full RTL/LTR toggle, persisted. */
export default function LanguageSettings() {
  const { t, locale, setLocale } = useI18n();
  const navigate = useNavigate();
  const { refreshUser } = useStore();

  const change = async (v: 'ar' | 'en') => {
    setLocale(v);
    try {
      await api.put('/users/me/settings', { locale: v });
      refreshUser();
    } catch {
      /* keep local change */
    }
  };

  return (
    <div className="page page-no-nav">
      <AppBar onBack={() => navigate(-1)} title={t('language')} />
      <div className="mt-5">
        <Segmented
          options={[
            { value: 'ar', label: 'العربية' },
            { value: 'en', label: 'English' },
          ]}
          value={locale}
          onChange={change}
        />
      </div>
      <Card className="mt-5">
        <p className="t-label mb-2" style={{ fontWeight: 700 }}>{t('app_name')}</p>
        <p className="t-caption text-muted">{t('tagline')}</p>
      </Card>
    </div>
  );
}
