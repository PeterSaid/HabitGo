import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gift, History, Search } from 'lucide-react';
import { api } from '../../api/client';
import { useI18n } from '../../i18n';
import { Badge, Card, EmptyState, ErrorState, IconButton, ListSkeleton } from '../../ui/components';

type Reward = {
  id: string; name: string; description: string; points_cost: number; stock: number | null;
  redemption_type: 'code' | 'manual' | 'cash'; image?: string | null;
  partner?: { id: string; name: string } | null;
  category?: { id: string; name: string; icon: string } | null;
  expiry_date?: string | null;
};

type RewardCategory = { id: string; name_en: string; name_ar: string; icon: string };

/** Rewards Marketplace (spec sections 39-40). */
export default function Rewards() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const [rewards, setRewards] = useState<Reward[] | null>(null);
  const [categories, setCategories] = useState<RewardCategory[]>([]);
  const [activeCat, setActiveCat] = useState<string>('');
  const [query, setQuery] = useState('');
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      const params = new URLSearchParams({ lang: locale });
      if (activeCat) params.set('category', activeCat);
      if (query.trim()) params.set('search', query.trim());
      const res = await api.get<{ rewards: Reward[] }>(`/rewards?${params}`);
      setRewards(res.rewards);
    } catch {
      setError(true);
    }
  }, [locale, activeCat, query]);

  useEffect(() => {
    api.get<{ categories: RewardCategory[] }>('/reward-categories').then((r) => setCategories(r.categories)).catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(load, query ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, query]);

  return (
    <div className="page">
      <div className="row-between mb-3">
        <div>
          <h1 className="t-page-title">{t('rewards_title')}</h1>
          <p className="t-caption text-muted">{t('rewards_desc')}</p>
        </div>
        <IconButton aria-label={t('redemption_history')} onClick={() => navigate('/rewards/history')}>
          <History size={19} />
        </IconButton>
      </div>

      <div style={{ position: 'relative' }} className="mb-3">
        <Search size={17} style={{ position: 'absolute', top: 15, insetInlineStart: 14, color: 'var(--text-3)' }} />
        <input
          className="input"
          style={{ paddingInlineStart: 42 }}
          placeholder={t('search_habits')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label={t('search')}
        />
      </div>

      <div className="chip-row mb-4">
        <button className={`chip ${activeCat === '' ? 'is-selected' : ''}`} onClick={() => setActiveCat('')}>
          {t('reward_categories')}
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            className={`chip ${activeCat === c.id ? 'is-selected' : ''}`}
            onClick={() => setActiveCat(c.id === activeCat ? '' : c.id)}
          >
            {locale === 'ar' ? c.name_ar : c.name_en}
          </button>
        ))}
      </div>

      {error ? (
        <ErrorState onRetry={load} />
      ) : rewards === null ? (
        <ListSkeleton rows={4} />
      ) : rewards.length === 0 ? (
        <EmptyState icon={<Gift size={40} />} title={t('no_rewards')} desc={t('no_rewards_desc')} />
      ) : (
        <div className="col" style={{ gap: 'var(--sp-3)' }}>
          {rewards.map((r) => {
            const affordable = true; // balance shown on detail page; keep cards uniform
            return (
              <Card
                key={r.id}
                className="row"
                style={{ gap: 'var(--sp-3)', cursor: 'pointer' }}
                onClick={() => navigate(`/rewards/${r.id}`)}
              >
                <RewardThumb reward={r} />
                <div className="grow col" style={{ gap: 4, minWidth: 0 }}>
                  <span className="t-card-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
                  <span className="t-caption text-muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.description}</span>
                  <div className="row" style={{ gap: 8 }}>
                    <Badge variant="gold" >{r.points_cost} {t('points_unit')}</Badge>
                    {r.redemption_type === 'cash' && <Badge>{t('rc_cash')}</Badge>}
                    {r.stock !== null && r.stock <= 5 && <Badge variant="error">{t('out_of_stock')}</Badge>}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Gradient thumbnail with reward glyph — placeholder-free per spec section 98. */
export function RewardThumb({ reward, size = 58 }: { reward: { id: string; name?: string; description?: string; points_cost?: number; stock?: number | null; redemption_type?: string }; size?: number }) {
  const hue = [...reward.id].reduce((a, c) => a + c.charCodeAt(0), 0) % 3;
  const grads = ['var(--gradient-primary)', 'linear-gradient(135deg,#F5B942,#F59E0B)', 'linear-gradient(135deg,#3B82F6,#8B5CF6)'];
  return (
    <div
      className="center"
      style={{ width: size, height: size, borderRadius: 16, background: grads[hue], flexShrink: 0 }}
      aria-hidden
    >
      <Gift size={size * 0.42} color="#fff" />
    </div>
  );
}
