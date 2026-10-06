import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, Trophy } from 'lucide-react';
import { api } from '../../api/client';
import { useI18n } from '../../i18n';
import { AppBar, Badge, Card, ErrorState, ListSkeleton } from '../../ui/components';

type Achievement = {
  id: string; name_en: string; name_ar: string; description_en: string; description_ar: string;
  icon: string; points_bonus: number; threshold: number; unlocked: boolean; achieved_at: string | null;
};

/** Achievements gallery (spec section 47) — with celebrate banner when arriving from a bonus. */
export default function Achievements() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const celebrate = (location.state as { celebrate?: { points: number; days?: number } } | null)?.celebrate;
  const [items, setItems] = useState<Achievement[] | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      const res = await api.get<{ achievements: Achievement[] }>('/achievements');
      setItems(res.achievements);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="page page-no-nav">
      <AppBar onBack={() => navigate(-1)} title={t('achievements')} />

      {celebrate && (
        <Card gold className="col mt-3 celebrate-pop" style={{ gap: 4, alignItems: 'center', padding: 'var(--sp-5)', textAlign: 'center' }}>
          <span className="t-section" style={{ fontWeight: 800 }}>{celebrate.days ? t('streak_celebrate_body', { days: celebrate.days }) : t('perfect_week')}</span>
          <span className="t-label tnum" style={{ fontWeight: 700 }}>{t('bonus_points', { points: celebrate.points })}</span>
        </Card>
      )}

      <p className="t-caption text-muted mt-3">{t('achievements_desc')}</p>

      <div className="mt-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-3)' }}>
        {error ? (
          <div style={{ gridColumn: '1 / -1' }}><ErrorState onRetry={load} /></div>
        ) : items === null ? (
          <div style={{ gridColumn: '1 / -1' }}><ListSkeleton rows={3} /></div>
        ) : (
          items.map((a) => (
            <Card
              key={a.id}
              className="col center"
              style={{
                gap: 8, padding: 'var(--sp-4)', textAlign: 'center',
                opacity: a.unlocked ? 1 : 0.72,
                borderColor: a.unlocked ? 'var(--primary)' : 'var(--border)',
                background: a.unlocked ? 'var(--very-soft-green)' : 'var(--surface)',
              }}
            >
              <div
                className="center"
                style={{
                  width: 54, height: 54, borderRadius: 18,
                  background: a.unlocked ? 'var(--soft-green)' : 'var(--surface-2)',
                  color: a.unlocked ? 'var(--primary)' : 'var(--text-3)',
                }}
              >
                {a.unlocked ? <Trophy size={26} /> : <Lock size={22} />}
              </div>
              <span className="t-label" style={{ fontWeight: 700 }}>{locale === 'ar' ? a.name_ar : a.name_en}</span>
              <span className="t-caption text-muted" style={{ minHeight: 30 }}>{locale === 'ar' ? a.description_ar : a.description_en}</span>
              {a.unlocked ? <Badge>✓ {t('unlocked')}</Badge> : <Badge variant="muted">{a.threshold}+</Badge>}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
