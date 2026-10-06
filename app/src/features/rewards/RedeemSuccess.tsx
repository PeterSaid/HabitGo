import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { useI18n } from '../../i18n';
import { Button, Card } from '../../ui/components';

type LocState = { redemption?: { id: string; status: string; redemption_code: string | null }; rewardName?: string } | null;

/** Redemption success (spec section 76 final step) + celebration. */
export default function RedeemSuccess() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const state = (useLocation().state as LocState) || {};
  const code = state.redemption?.redemption_code;
  const isCode = state.redemption?.status === 'completed' && code;

  return (
    <div className="page page-no-nav center" style={{ minHeight: '80dvh', flexDirection: 'column', gap: 'var(--sp-5)' }}>
      <div className="col center" style={{ gap: 'var(--sp-3)', textAlign: 'center' }}>
        <div className="celebrate-emoji">🎁</div>
        <h1 className="t-page-title">{t('redeem_success')}</h1>
        {state.rewardName && <p className="t-body text-muted">{state.rewardName}</p>}
      </div>

      {isCode ? (
        <Card className="col" style={{ width: '100%', gap: 8, alignItems: 'center', padding: 'var(--sp-5)' }}>
          <span className="t-caption text-muted">{t('redeem_success_code')}</span>
          <span className="tnum" style={{ fontSize: 24, fontWeight: 800, letterSpacing: 1, userSelect: 'all' }}>{code}</span>
        </Card>
      ) : (
        <Card className="row" style={{ width: '100%', gap: 10 }}>
          <CheckCircle2 size={20} color="var(--primary)" />
          <span className="t-label">{t('redeem_success_pending')}</span>
        </Card>
      )}

      <div className="col" style={{ width: '100%', gap: 'var(--sp-3)' }}>
        <Button block size="lg" onClick={() => navigate('/rewards/history')}>
          {t('my_redemptions')}
        </Button>
        <Button block variant="ghost" onClick={() => navigate('/')}>
          {t('nav_home')}
        </Button>
      </div>
    </div>
  );
}
