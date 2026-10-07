import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Gift, Target, TrendingUp } from 'lucide-react';
import { useI18n } from '../../i18n';
import { Button } from '../../ui/components';
import logoUrl from '../../assets/logo.png';

const SLIDES = [
  { key: 1, Icon: Target, color: '#22C55E' },
  { key: 2, Icon: BarChart3, color: '#14B8A6' },
  { key: 3, Icon: TrendingUp, color: '#F5B942' },
  { key: 4, Icon: Gift, color: '#8B5CF6' },
] as const;

export default function Onboarding() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const slide = SLIDES[step];
  const isLast = step === SLIDES.length - 1;

  const finish = () => {
    localStorage.setItem('habitgo.onboarded', '1');
    navigate('/login');
  };

  return (
    <div className="page page-no-nav center" style={{ minHeight: '100dvh', flexDirection: 'column' }}>
      <div style={{ alignSelf: 'flex-end' }}>
        <button className="btn-text" style={{ color: 'var(--text-3)' }} onClick={finish}>
          {t('onboarding_skip')}
        </button>
      </div>

      {step === 0 && (
        <img src={logoUrl} alt="HabitGo" width={72} height={72} style={{ borderRadius: 18, alignSelf: 'center', marginTop: 'var(--sp-2)', boxShadow: 'var(--shadow-md)' }} />
      )}

      <div className="grow center" style={{ flexDirection: 'column', gap: 'var(--sp-5)', padding: 'var(--sp-4)' }}>
        <div
          className="center"
          style={{
            width: 140, height: 140, borderRadius: 44,
            background: 'var(--very-soft-green)',
          }}
        >
          <slide.Icon size={64} color={slide.color} strokeWidth={1.8} />
        </div>
        <h1 className="t-page-title" style={{ textAlign: 'center' }}>
          {t(`onboarding_${slide.key}_title` as never)}
        </h1>
        <p className="text-muted t-body" style={{ textAlign: 'center', maxWidth: 300, lineHeight: 1.7 }}>
          {t(`onboarding_${slide.key}_desc` as never)}
        </p>
      </div>

      <div className="col" style={{ gap: 'var(--sp-5)', paddingBottom: 'var(--sp-6)', alignItems: 'center' }}>
        <div className="row" style={{ gap: 8 }}>
          {SLIDES.map((_, i) => (
            <span
              key={i}
              style={{
                width: i === step ? 22 : 8,
                height: 8,
                borderRadius: 8,
                background: i === step ? 'var(--primary)' : 'var(--border)',
                transition: 'all 200ms var(--ease)',
              }}
            />
          ))}
        </div>
        <Button block size="lg" onClick={() => (isLast ? finish() : setStep(step + 1))}>
          {isLast ? t('onboarding_start') : t('onboarding_next')}
        </Button>
      </div>
    </div>
  );
}
