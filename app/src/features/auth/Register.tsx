import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Eye, EyeOff, X } from 'lucide-react';
import { api, ApiError } from '../../api/client';
import { useI18n } from '../../i18n';
import type { TranslationKey } from '../../i18n/en';
import { useStore } from '../../state/store';
import { Button, Field, Input } from '../../ui/components';

const ERR_KEYS: Record<string, TranslationKey> = {
  email_taken: 'err_email_taken',
  phone_taken: 'err_email_taken',
  network_error: 'err_network',
};

export default function Register() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { applySession } = useStore();

  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', country: '', city: '' });
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPass, setShowPass] = useState(false);
  const [emailTaken, setEmailTaken] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  const rules = {
    length: form.password.length >= 8,
    letter: /[A-Za-z]/.test(form.password),
    digit: /[0-9]/.test(form.password),
  };
  const passwordValid = rules.length && rules.letter && rules.digit;

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = t('val_name');
    if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = t('val_email');
    if (!passwordValid) errs.password = t('val_password');
    if (form.confirm !== form.password) errs.confirm = t('val_match');
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailTaken(false);
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
      if (err instanceof ApiError && (err.code === 'email_taken' || err.code === 'phone_taken')) {
        setEmailTaken(true);
        setErrors({ email: t('err_email_taken') });
      } else if (err instanceof ApiError && err.code === 'validation_error') {
        // backend message looks like "password: ..." — route it to the right field
        const [field, ...rest] = err.message.split(': ');
        const key = ['name', 'email', 'password'].includes(field) ? field : 'email';
        setErrors({ [key]: rest.join(': ') || t('err_generic') });
      } else {
        setErrors({ email: t(ERR_KEYS[err instanceof ApiError ? err.code : ''] ?? 'err_generic') });
      }
    } finally {
      setBusy(false);
    }
  };

  const Rule = ({ ok, label }: { ok: boolean; label: string }) => (
    <span className="row" style={{ gap: 5, fontSize: 12, color: ok ? 'var(--success)' : 'var(--text-3)' }}>
      {ok ? <Check size={13} /> : <X size={13} />} {label}
    </span>
  );

  return (
    <div className="page page-no-nav" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: 'var(--sp-6) 0 var(--sp-4)' }}>
        <h1 className="t-page-title">{t('register_title')}</h1>
        <p className="text-muted t-body mt-2">{t('register_subtitle')}</p>
      </div>

      <form onSubmit={submit} className="col grow" noValidate>
        <Field label={t('name')} error={errors.name}>
          <Input value={form.name} onChange={set('name')} autoComplete="name" error={!!errors.name} />
        </Field>
        <Field label={t('email')} error={errors.email}>
          <Input type="email" dir="ltr" inputMode="email" value={form.email} onChange={set('email')} autoComplete="email" error={!!errors.email} placeholder="name@example.com" />
        </Field>
        <Field label={t('password')}>
          <div style={{ position: 'relative' }}>
            <Input type={showPass ? 'text' : 'password'} value={form.password} onChange={set('password')} autoComplete="new-password" error={!!errors.password} style={{ paddingInlineEnd: 48 }} />
            <button
              type="button"
              aria-label={showPass ? 'hide password' : 'show password'}
              onClick={() => setShowPass(!showPass)}
              style={{ position: 'absolute', top: 14, insetInlineEnd: 14, color: 'var(--text-3)' }}
            >
              {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <div className="row" style={{ gap: 14, flexWrap: 'wrap', marginTop: 4 }}>
            <Rule ok={rules.length} label="8+" />
            <Rule ok={rules.letter} label={t('val_password').split('،')[0].includes('8') ? 'Aa' : 'Aa'} />
            <Rule ok={rules.digit} label="123" />
          </div>
        </Field>
        <Field label={t('confirm_password')} error={errors.confirm}>
          <Input type={showPass ? 'text' : 'password'} value={form.confirm} onChange={set('confirm')} autoComplete="new-password" error={!!errors.confirm} />
        </Field>
        <div className="grid-2">
          <Field label={`${t('country')} (${t('optional')})`}>
            <Input value={form.country} onChange={set('country')} autoComplete="country" />
          </Field>
          <Field label={`${t('city')} (${t('optional')})`}>
            <Input value={form.city} onChange={set('city')} autoComplete="address-level2" />
          </Field>
        </div>

        <div className="grow" />
        {emailTaken && (
          <Button variant="secondary" block className="mb-3" onClick={() => navigate('/login')}>
            {t('have_account')} — {t('login_now')}
          </Button>
        )}
        <Button type="submit" block size="lg" loading={busy} disabled={!form.name.trim() || !passwordValid || form.confirm !== form.password}>
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
