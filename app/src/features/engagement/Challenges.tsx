import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Flag } from 'lucide-react';
import { api } from '../../api/client';
import { useI18n } from '../../i18n';
import { Badge, Card, ErrorState, ListSkeleton, ProgressBar } from '../../ui/components';

type Challenge = {
  id: string; name_en: string; name_ar: string; description_en: string; description_ar: string;
  icon: string; duration_days: number; target_days: number; points_bonus: number; difficulty: string;
  participation: { status: string; progress_days: number; joined_at: string } | null;
};

export default function Challenges() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const [items, setItems] = useState<Challenge[] | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      const res = await api.get<{ challenges: Challenge[] }>('/challenges');
      setItems(res.challenges);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="page page-no-nav">
      <div className="mb-4">
        <h1 className="t-page-title">{t('challenges')}</h1>
        <p className="t-caption text-muted">{t('challenges_desc')}</p>
      </div>

      {error ? (
        <ErrorState onRetry={load} />
      ) : items === null ? (
        <ListSkeleton rows={4} />
      ) : (
        <div className="col" style={{ gap: 'var(--sp-3)' }}>
          {items.map((c) => (
            <Card key={c.id} className="col" style={{ gap: 10, cursor: 'pointer' }} onClick={() => navigate(`/challenges/${c.id}`)}>
              <div className="row" style={{ gap: 'var(--sp-3)' }}>
                <div className="habit-icon" style={{ background: 'var(--soft-green)', borderRadius: 14 }}>
                  <Flag size={20} color="var(--primary)" />
                </div>
                <div className="grow col" style={{ gap: 2, minWidth: 0 }}>
                  <span className="t-card-title">{locale === 'ar' ? c.name_ar : c.name_en}</span>
                  <span className="t-caption text-muted">
                    {c.duration_days} {t('days')} · +{c.points_bonus} {t('points_unit')}
                  </span>
                </div>
                {c.participation ? (
                  <Badge variant={c.participation.status === 'completed' ? undefined : 'info'}>
                    {c.participation.status === 'completed' ? t('challenge_complete') : t('challenge_joined')}
                  </Badge>
                ) : (
                  <ChevronRight size={18} color="var(--text-3)" style={{ transform: 'scaleX(var(--flip,1))' }} />
                )}
              </div>
              {c.participation && c.participation.status !== 'completed' && (
                <>
                  <ProgressBar value={Math.round((c.participation.progress_days / c.target_days) * 100)} />
                  <span className="t-caption tnum text-muted">
                    {t('challenge_progress', { done: c.participation.progress_days, target: c.target_days })}
                  </span>
                </>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
