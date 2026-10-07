import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../../api/client';
import { useI18n } from '../../i18n';
import type { TranslationKey } from '../../i18n/en';
import { useToast } from '../../ui/components';
import { AppBar, Button, Field, Input } from '../../ui/components';
import { Check, Eye, EyeOff, X } from 'lucide-react';

const ERR_KEYS: Record<string, TranslationKey> = {
  otp_invalid: 'err_otp_invalid',
  otp_expired: 'err_otp_expired',
  otp_locked: 'err_otp_locked',
  validation_error: 'err_otp_invalid',
  network_error: 'err_network',
};

export default function ForgotPassword() {
  const { t } = useI18n();
  const toast = useToast();
  const navigate = useNavigate();

  const [stage, setStage] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoOtp, setDemoOtp] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn(resendIn - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const rules = {
    length: password.length >= 8,
    letter: /[A-Za-z]/.test(password),
    digit: /[0-9]/.test(password),
  };
  const passwordValid = rules.length && rules.letter && rules.digit;

  const Rule = ({ ok, label }: { ok: boolean; label: string }) => (
    <span className="row" style={{ gap: 5, fontSize: 12, color: ok ? 'var(--success)' : 'var(--text-3)' }}>
      {ok ? <Check size={13} /> : <X size={13} />} {label}
    </span>
  );

  const requestOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<{ ok: true; delivered: boolean; otp?: string }>('/auth/forgot-password', {
        email: email.trim().toLowerCase(),
      });
      if (res.otp) {
        setDemoOtp(res.otp);
        setOtp(res.otp); // prefilled in demo mode so the flow is one tap
      } else {
        setDemoOtp(null);
        setOtp('');
      }
      setStage('otp');
      setResendIn(60);
      toast(res.delivered ? t('otp_sent_desc', { email }) : t('otp_dev_notice'), res.delivered ? 'success' : 'info');
    } catch (err) {
      toast(t('err_generic'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const doReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^\d{6}$/.test(otp)) {
      setError(t('err_otp_invalid'));
      return;
    }
    if (!passwordValid) {
      setError(t('val_password'));
      return;
    }
    setBusy(true);
    try {
      await api.post('/auth/reset-password', {
        email: email.trim().toLowerCase(),
        otp,
        new_password: password,
      });
      toast(t('saved'), 'success');
      navigate('/login');
    } catch (err) {
      setError(t(ERR_KEYS[err instanceof ApiError ? err.code : ''] ?? 'err_generic'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page page-no-nav" style={{ minHeight: '100dvh' }}>
      <AppBar title={t('forgot_title')} onBack={() => navigate(stage === 'otp' ? '/forgot' : '/login')} />

      {stage === 'email' ? (
        <form onSubmit={requestOtp} className="mt-5" noValidate>
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
          <p className="text-muted t-body mb-4">{t('otp_sent_desc', { email })}</p>

          {demoOtp && (
            <div className="card mb-4" style={{ background: 'var(--very-soft-green)', borderColor: 'var(--soft-green)', textAlign: 'center' }}>
              <p className="t-caption text-muted mb-2">{t('otp_dev_notice')}</p>
              <span className="tnum" style={{ fontSize: 28, fontWeight: 800, letterSpacing: 6, color: 'var(--primary)' }}>{demoOtp}</span>
            </div>
          )}

          <Field label={t('otp_code')}>
            <Input
              inputMode="numeric"
              autoComplete="one-time-code"
              dir="ltr"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="••••••"
              style={{ fontSize: 22, letterSpacing: 8, textAlign: 'center', fontWeight: 700 }}
              error={!!error}
            />
          </Field>

          <Field label={t('new_password')}>
            <div style={{ position: 'relative' }}>
              <Input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                error={!!error && !passwordValid}
                style={{ paddingInlineEnd: 48 }}
              />
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
              <Rule ok={rules.letter} label="Aa" />
              <Rule ok={rules.digit} label="123" />
            </div>
          </Field>

          {error && <p className="field-error mb-3">{error}</p>}

          <Button type="submit" block size="lg" loading={busy} disabled={!/^\d{6}$/.test(otp) || !passwordValid}>
            {t('reset_password')}
          </Button>

          <button
            type="button"
            className="btn-text mt-3"
            style={{ color: resendIn > 0 ? 'var(--text-3)' : 'var(--primary)', margin: '12px auto 0', display: 'block' }}
            disabled={resendIn > 0 || busy}
            onClick={() => requestOtp()}
          >
            {resendIn > 0 ? t('otp_resend_in', { s: resendIn }) : t('otp_resend')}
          </button>
        </form>
      )}
    </div>
  );
}
