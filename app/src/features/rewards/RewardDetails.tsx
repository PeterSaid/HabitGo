import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, Info } from 'lucide-react';
import { api, ApiError } from '../../api/client';
import { useI18n } from '../../i18n';
import type { TranslationKey } from '../../i18n/en';
import { useStore } from '../../state/store';
import { AppBar, Badge, Button, Card, ErrorState, Modal, Skeleton } from '../../ui/components';
import { RewardThumb } from './Rewards';

type Reward = {
  id: string; name: string; description: string; points_cost: number; stock: number | null;
  redemption_type: 'code' | 'manual' | 'cash'; cash_amount?: number | null;
  terms?: string; expiry_date?: string | null;
  partner?: { id: string; name: string } | null;
  category?: { id: string; name: string } | null;
};

/** Reward Details + Confirm + Redeem (spec sections 41, 44, 76). */
export default function RewardDetails() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { id } = useParams();
  const { refreshUnread } = useStore();
  const [reward, setReward] = useState<Reward | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [error, setError] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [needPoints, setNeedPoints] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setError(false);
    try {
      const res = await api.get<{ reward: Reward; wallet: { available: number } }>(`/rewards/${id}`);
      setReward(res.reward);
      setBalance(res.wallet.available);
    } catch {
      setError(true);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const redeem = async () => {
    setConfirming(false);
    setBusy(true);
    setNeedPoints(null);
    try {
      const res = await api.post<{ redemption: { id: string; status: string; redemption_code: string | null } }>(`/rewards/${id}/redeem`);
      refreshUnread();
      navigate(`/rewards/${id}/success`, {
        state: { redemption: res.redemption, rewardName: reward?.name },
        replace: true,
      });
    } catch (e) {
      if (e instanceof ApiError && e.code === 'insufficient_points') {
        const missing = reward ? reward.points_cost - (balance ?? 0) : 0;
        setNeedPoints(missing);
        setConfirming(true);
      } else {
        setConfirming(false);
      }
    } finally {
      setBusy(false);
    }
  };

  if (error && !reward) return <div className="page"><AppBar onBack={() => navigate(-1)} /><ErrorState onRetry={load} /></div>;

  return (
    <div className="page page-no-nav" style={{ paddingBottom: 'calc(var(--sp-7) + 80px)' }}>
      <AppBar onBack={() => navigate(-1)} title={t('rewards_title')} />
      {!reward ? (
        <div className="col mt-4" style={{ gap: 12 }}>
          <Skeleton h={120} r={20} />
          <Skeleton h={160} r={16} />
        </div>
      ) : (
        <>
          <Card gradient className="row mt-3" style={{ gap: 'var(--sp-4)', padding: 'var(--sp-5)' }}>
            <RewardThumb reward={reward} size={72} />
            <div className="col" style={{ gap: 6, color: '#fff' }}>
              <h2 className="t-section" style={{ color: '#fff' }}>{reward.name}</h2>
              {reward.partner && <span style={{ fontSize: 13, opacity: 0.9 }}>{reward.partner.name}</span>}
              <Badge variant="gold" style={{ alignSelf: 'flex-start' }}>{reward.points_cost} {t('points_unit')}</Badge>
            </div>
          </Card>

          <p className="t-body text-muted mt-4">{reward.description}</p>

          <Card className="col mt-4" style={{ gap: 10 }}>
            {reward.category && (
              <div className="row-between">
                <span className="t-label text-muted">{t('reward_categories')}</span>
                <span className="t-label">{reward.category.name}</span>
              </div>
            )}
            <div className="row-between">
              <span className="t-label text-muted">{t('requires')}</span>
              <span className="t-label tnum" style={{ fontWeight: 700 }}>{reward.points_cost} {t('points_unit')}</span>
            </div>
            {balance !== null && (
              <div className="row-between">
                <span className="t-label text-muted">{t('your_balance')}</span>
                <span className="t-label tnum" style={{ color: balance >= reward.points_cost ? 'var(--primary)' : 'var(--error)', fontWeight: 700 }}>
                  {balance}
                </span>
              </div>
            )}
            {reward.expiry_date && (
              <div className="row-between">
                <span className="t-label text-muted">{t('expiry')}</span>
                <span className="t-label tnum">{reward.expiry_date}</span>
              </div>
            )}
            {reward.stock !== null && (
              <div className="row-between">
                <span className="t-label text-muted">{t('availability')}</span>
                <span className="t-label tnum">{reward.stock}</span>
              </div>
            )}
          </Card>

          {reward.terms && (
            <Card className="col mt-3" style={{ gap: 8 }}>
              <div className="row" style={{ gap: 8 }}>
                <Info size={16} color="var(--info)" />
                <span className="t-label" style={{ fontWeight: 600 }}>{t('terms')}</span>
              </div>
              <p className="t-caption text-muted">{reward.terms}</p>
            </Card>
          )}

          <div style={{ position: 'fixed', bottom: 'calc(var(--nav-height) + env(safe-area-inset-bottom))', insetInline: 0, maxWidth: 'var(--max-width)', margin: '0 auto', padding: 'var(--sp-4)', background: 'color-mix(in srgb, var(--bg) 92%, transparent)', backdropFilter: 'blur(12px)', zIndex: 35 }}>
            <Button
              block
              size="lg"
              variant={reward.redemption_type === 'cash' ? 'gold' : 'primary'}
              loading={busy}
              disabled={reward.stock !== null && reward.stock <= 0}
              onClick={() => setConfirming(true)}
            >
              {reward.stock !== null && reward.stock <= 0 ? t('out_of_stock') : t('redeem_now')}
            </Button>
          </div>

          <Modal open={confirming} onClose={() => { setConfirming(false); setNeedPoints(null); }}>
            {needPoints !== null ? (
              <div className="center" style={{ flexDirection: 'column', gap: 12, textAlign: 'center' }}>
                <span style={{ fontSize: 44 }}>🎯</span>
                <p className="t-card-title">{t('insufficient_points', { missing: needPoints })}</p>
                <Button block variant="outline" onClick={() => { setConfirming(false); setNeedPoints(null); }}>
                  {t('ok')}
                </Button>
              </div>
            ) : (
              <>
                <p className="t-card-title" style={{ textAlign: 'center' }}>
                  {t('redeem_confirm_body', { reward: reward.name, points: reward.points_cost })}
                </p>
                {balance !== null && (
                  <p className="t-caption text-muted mt-2" style={{ textAlign: 'center' }}>
                    {t('your_balance')}: <b className="tnum">{balance}</b> → <b className="tnum">{balance - reward.points_cost}</b>
                  </p>
                )}
                <div className="row mt-5">
                  <Button variant="outline" block onClick={() => setConfirming(false)}>{t('cancel')}</Button>
                  <Button variant={reward.redemption_type === 'cash' ? 'gold' : 'primary'} block onClick={redeem}>
                    {t('redeem')}
                  </Button>
                </div>
              </>
            )}
          </Modal>
        </>
      )}
    </div>
  );
}
