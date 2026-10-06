import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useI18n } from '../../i18n';
import type { TranslationKey } from '../../i18n/en';
import { AppBar, Badge, Card, EmptyState, ErrorState, ListSkeleton } from '../../ui/components';
import { RewardThumb } from './Rewards';

type Redemption = {
  id: string; status: 'pending' | 'approved' | 'rejected' | 'completed'; points_cost: number;
  redemption_code: string | null; requested_at: string; completed_at: string | null;
  reward: { name_en: string; name_ar: string; redemption_type: string };
};

const STATUS_KEY: Record<Redemption['status'], TranslationKey> = {
  pending: 'status_pending',
  approved: 'status_approved',
  completed: 'status_completed',
  rejected: 'status_rejected',
};
const STATUS_VARIANT: Record<Redemption['status'], 'gold' | 'info' | 'error' | undefined> = {
  pending: 'gold',
  approved: 'info',
  completed: undefined,
  rejected: 'error',
};

export default function RedemptionHistory() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const [items, setItems] = useState<Redemption[] | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      const res = await api.get<{ redemptions: Redemption[] }>('/redemptions');
      setItems(res.redemptions);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="page page-no-nav">
      <AppBar onBack={() => navigate(-1)} title={t('redemption_history')} />
      <div className="mt-3 col" style={{ gap: 'var(--sp-3)' }}>
        {error ? (
          <ErrorState onRetry={load} />
        ) : items === null ? (
          <ListSkeleton rows={4} />
        ) : items.length === 0 ? (
          <EmptyState icon={<></>} title={t('no_redemptions')} desc={t('no_redemptions_desc')} />
        ) : (
          items.map((r) => (
            <Card key={r.id} className="row" style={{ gap: 'var(--sp-3)' }}>
              <RewardThumb reward={{ id: r.reward.name_en, name: '', description: '', points_cost: r.points_cost, stock: null, redemption_type: r.reward.redemption_type as never }} />
              <div className="grow col" style={{ gap: 4, minWidth: 0 }}>
                <div className="row-between">
                  <span className="t-card-title">{locale === 'ar' ? r.reward.name_ar : r.reward.name_en}</span>
                  <Badge variant={STATUS_VARIANT[r.status]}>{t(STATUS_KEY[r.status])}</Badge>
                </div>
                <span className="t-caption text-muted tnum">
                  {r.points_cost} {t('points_unit')} · {new Date(r.requested_at).toLocaleDateString()}
                </span>
                {r.redemption_code && (
                  <span className="t-caption tnum" style={{ userSelect: 'all', direction: 'ltr', textAlign: 'start' }}>
                    {r.redemption_code}
                  </span>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
