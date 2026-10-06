import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight, Clock, Coins, Gift, Layers } from 'lucide-react';
import { api } from '../../api/client';
import { useI18n } from '../../i18n';
import { AppBar, Badge, Card, ErrorState, Skeleton, StatTile } from '../../ui/components';
import type { TranslationKey } from '../../i18n/en';

type WalletData = {
  wallet: {
    available: number; pending: number; lifetime: number; redeemed: number;
    estimated_value: number; conversion_rate: { points: number; unit: number };
  };
};

export default function Wallet() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [data, setData] = useState<WalletData | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      setData(await api.get<WalletData>('/wallet'));
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error && !data) return <div className="page"><AppBar onBack={() => navigate(-1)} /><ErrorState onRetry={load} /></div>;

  return (
    <div className="page page-no-nav">
      <AppBar onBack={() => navigate(-1)} title={t('wallet_title')} />
      {!data ? (
        <div className="col mt-4" style={{ gap: 12 }}>
          <Skeleton h={130} r={20} />
          <div className="grid-2"><Skeleton h={80} /><Skeleton h={80} /></div>
        </div>
      ) : (
        <>
          {/* Balance card — hero gradient (spec section 09) */}
          <Card gradient className="mt-3" style={{ padding: 'var(--sp-5)' }}>
            <div className="row" style={{ gap: 10, opacity: 0.9 }}>
              <Coins size={20} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>{t('available_balance')}</span>
            </div>
            <div className="row" style={{ gap: 8, marginTop: 6 }}>
              <span style={{ fontSize: 42, fontWeight: 800, color: '#fff' }} className="tnum">
                {data.wallet.available.toLocaleString()}
              </span>
              <span style={{ fontSize: 15, opacity: 0.9 }}>{t('points')}</span>
            </div>
            <div className="row-between mt-3">
              <span style={{ fontSize: 12, opacity: 0.9 }}>
                {t('estimated_value')}: <b className="tnum">~{data.wallet.estimated_value}</b>
              </span>
              <span style={{ fontSize: 11, opacity: 0.75 }} className="tnum">
                {data.wallet.conversion_rate.points} {t('points_unit')} = {data.wallet.conversion_rate.unit} unit
              </span>
            </div>
          </Card>

          <div className="grid-2 mt-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <StatTile label={t('pending')} value={data.wallet.pending} sub={<Clock size={12} />} accent="gold" />
            <StatTile label={t('redeemed')} value={data.wallet.redeemed} />
            <StatTile label={t('lifetime')} value={data.wallet.lifetime} accent="primary" />
            <StatTile label={t('available')} value={data.wallet.available} accent="primary" />
          </div>

          <Card className="row-between mt-3" onClick={() => navigate('/wallet/transactions')} style={{ cursor: 'pointer' }}>
            <div className="row" style={{ gap: 10 }}>
              <Layers size={20} color="var(--primary)" />
              <span className="t-card-title">{t('transactions')}</span>
            </div>
            <Badge>{t('see_all')} ›</Badge>
          </Card>
          <Card className="row-between mt-3" onClick={() => navigate('/rewards/history')} style={{ cursor: 'pointer' }}>
            <div className="row" style={{ gap: 10 }}>
              <Gift size={20} color="var(--gold)" />
              <span className="t-card-title">{t('my_redemptions')}</span>
            </div>
            <Badge>{t('see_all')} ›</Badge>
          </Card>
        </>
      )}
    </div>
  );
}

export function TransactionIcon({ type }: { type: string }) {
  const positive = ['earn', 'bonus', 'refund'].includes(type);
  const Icon = type === 'redeem' ? ArrowUpRight : positive ? ArrowDownLeft : Coins;
  const bg = type === 'redeem' ? 'rgba(245,185,66,0.15)' : 'var(--soft-green)';
  const color = type === 'redeem' ? 'var(--gold)' : 'var(--primary)';
  return (
    <div className="habit-icon" style={{ background: bg, borderRadius: 14 }}>
      <Icon size={20} color={color} />
    </div>
  );
}

export function txTypeLabel(type: string, t: (k: TranslationKey) => string): string {
  switch (type) {
    case 'earn': return t('tx_earn');
    case 'bonus': return t('tx_bonus');
    case 'redeem': return t('tx_redeem');
    case 'refund': return t('tx_refund');
    default: return t('tx_adjustment');
  }
}
