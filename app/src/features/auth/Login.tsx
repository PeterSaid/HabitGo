import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../../api/client';
import { useI18n } from '../../i18n';
import type { TranslationKey } from '../../i18n/en';
import { useStore } from '../../state/store';
import { Button, Field, Input } from '../../ui/components';
import logoUrl from '../../assets/logo.png';

export default function Login() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const { applySession } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError(t('val_required'));
      return;
    }
    setBusy(true);
    try {
      const res = await api.post<{ token: string; user: never }>('/auth/login', { email: email.trim().toLowerCase(), password });
      applySession(res.token, res.user);
      navigate('/');
    } catch (err) {
      if (err instanceof ApiError) {
        const map: Record<string, TranslationKey> = { bad_credentials: 'err_credentials', network_error: 'err_network' };
        setError(t(map[err.code] ?? 'err_generic'));
      } else setError(t('err_generic'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page page-no-nav" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <div className="center" style={{ padding: 'var(--sp-7) 0 var(--sp-5)', flexDirection: 'column', gap: 'var(--sp-3)' }}>
        <img src={logoUrl} alt="HabitGo" width={76} height={76} style={{ borderRadius: 20, boxShadow: 'var(--shadow-md)' }} />
        <h1 className="t-page-title">{t('login_title')}</h1>
        <p className="text-muted t-body">{t('login_subtitle')}</p>
      </div>

      <form onSubmit={submit} className="col grow" noValidate>
        <Field label={t('email')}>
          <Input
            type="email"
            inputMode="email"
            autoComplete="email"
            dir="ltr"
            style={{ textAlign: locale === 'ar' ? 'right' : 'left' }}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            error={!!error}
          />
        </Field>
        <Field label={t('password')}>
          <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} error={!!error} />
        </Field>

        {error && <p className="field-error mb-3">{error}</p>}

        <button type="button" className="btn-text" style={{ alignSelf: 'flex-end', color: 'var(--primary)' }} onClick={() => navigate('/forgot')}>
          {t('forgot_password')}
        </button>

        <div className="grow" />
        <Button type="submit" block size="lg" loading={busy}>
          {t('login')}
        </Button>
        <p className="center t-label text-muted mt-4" style={{ justifyContent: 'center' }}>
          {t('no_account')}{' '}
          <button type="button" style={{ color: 'var(--primary)', fontWeight: 600 }} onClick={() => navigate('/register')}>
            {t('create_one')}
          </button>
        </p>
        <div style={{ height: 'var(--sp-6)' }} />
      </form>
    </div>
  );
}
