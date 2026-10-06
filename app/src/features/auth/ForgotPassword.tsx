import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../../api/client';
import { useI18n } from '../../i18n';
import { useToast } from '../../ui/components';
import { AppBar, Button, Field, Input } from '../../ui/components';

export default function ForgotPassword() {
  const { t } = useI18n();
  const toast = useToast();
  const navigate = useNavigate();
  const [stage, setStage] = useState<'email' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);

  const requestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return;
    setBusy(true);
    try {
      const res = await api.post<{ ok: true; reset_token?: string }>('/auth/forgot-password', { email: email.trim().toLowerCase() });
      toast(t('reset_code_sent'), 'info');
      if (res.reset_token) setDevToken(res.reset_token);
      setStage('reset');
    } catch {
      toast(t('err_generic'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const doReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = token.trim() || devToken || '';
    if (password.length < 8) return;
    setBusy(true);
    try {
      await api.post('/auth/reset-password', { token: code, new_password: password });
      toast(t('saved'), 'success');
      navigate('/login');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : t('err_generic'), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page page-no-nav" style={{ minHeight: '100dvh' }}>
      <AppBar title={t('forgot_title')} onBack={() => navigate(stage === 'reset' ? '/forgot' : '/login')} />
      {stage === 'email' ? (
        <form onSubmit={requestReset} className="mt-5" noValidate>
          <p className="text-muted t-body mb-4">{t('forgot_desc')}</p>
          <Field label={t('email')}>
            <Input type="email" dir="ltr" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
          </Field>
          <Button type="submit" block size="lg" loading={busy} disabled={!/^\S+@\S+\.\S+$/.test(email)}>
            {t('send_reset')}
          </Button>
        </form>
      ) : (
        <form onSubmit={doReset} className="mt-5" noValidate>
          {devToken && (
            <p className="t-caption text-muted mb-3" style={{ direction: 'ltr', textAlign: 'start' }}>
              demo reset token: <code style={{ userSelect: 'all' }}>{devToken}</code>
            </p>
          )}
          <Field label={`${t('reset_code')} (${t('optional')})`}>
            <Input value={token} onChange={(e) => setToken(e.target.value)} placeholder={devToken ? t('optional') : 'reset token'} dir="ltr" />
          </Field>
          <Field label={t('new_password')}>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          </Field>
          <Button type="submit" block size="lg" loading={busy} disabled={password.length < 8 || (!token.trim() && !devToken)}>
            {t('reset_password')}
          </Button>
        </form>
      )}
    </div>
  );
}
