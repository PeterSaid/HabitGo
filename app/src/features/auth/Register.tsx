import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../../api/client';
import { useI18n } from '../../i18n';
import type { TranslationKey } from '../../i18n/en';
import { useStore } from '../../state/store';
import { Button, Field, Input, Select } from '../../ui/components';

const ERR_KEYS: Record<string, TranslationKey> = {
  email_taken: 'err_email_taken',
  validation_error: 'val_password',
  network_error: 'err_network',
};

export default function Register() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { applySession } = useStore();

  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', country: '', city: '' });
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = t('val_name');
    if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = t('val_email');
    if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password)) errs.password = t('val_password');
    if (form.confirm !== form.password) errs.confirm = t('val_match');
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setBusy(true);
    try {
      const res = await api.post<{ token: string; user: never }>('/auth/register', {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        country: form.country.trim() || undefined,
        city: form.city.trim() || undefined,
      });
      applySession(res.token, res.user);
      navigate('/personalization');
    } catch (err) {
      setErrors({ email: t(ERR_KEYS[err instanceof ApiError ? err.code : ''] ?? 'err_generic') });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page page-no-nav" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: 'var(--sp-6) 0 var(--sp-4)' }}>
        <h1 className="t-page-title">{t('register_title')}</h1>
        <p className="text-muted t-body mt-2">{t('register_subtitle')}</p>
      </div>

      <form onSubmit={submit} className="col grow" noValidate>
        <Field label={t('name')} error={errors.name}>
          <Input value={form.name} onChange={set('name')} autoComplete="name" error={!!errors.name} placeholder={t('val_name') === 'أدخل اسمك' ? 'Peter' : 'Your name'} />
        </Field>
        <Field label={t('email')} error={errors.email}>
          <Input type="email" dir="ltr" inputMode="email" value={form.email} onChange={set('email')} autoComplete="email" error={!!errors.email} placeholder="name@example.com" />
        </Field>
        <div className="grid-2">
          <Field label={t('password')} error={errors.password}>
            <Input type="password" value={form.password} onChange={set('password')} autoComplete="new-password" error={!!errors.password} />
          </Field>
          <Field label={t('confirm_password')} error={errors.confirm}>
            <Input type="password" value={form.confirm} onChange={set('confirm')} autoComplete="new-password" error={!!errors.confirm} />
          </Field>
        </div>
        <div className="grid-2">
          <Field label={`${t('country')} (${t('optional')})`}>
            <Input value={form.country} onChange={set('country')} autoComplete="country" />
          </Field>
          <Field label={`${t('city')} (${t('optional')})`}>
            <Input value={form.city} onChange={set('city')} autoComplete="address-level2" />
          </Field>
        </div>

        <div className="grow" />
        <Button type="submit" block size="lg" loading={busy}>
          {t('register')}
        </Button>
        <p className="center t-label text-muted mt-4" style={{ justifyContent: 'center' }}>
          {t('have_account')}{' '}
          <button type="button" style={{ color: 'var(--primary)', fontWeight: 600 }} onClick={() => navigate('/login')}>
            {t('login_now')}
          </button>
        </p>
        <div style={{ height: 'var(--sp-6)' }} />
      </form>
    </div>
  );
}
