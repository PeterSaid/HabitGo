import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { api } from '../../api/client';
import { useI18n } from '../../i18n';
import { AppBar, Badge, Card, ErrorState, Skeleton, StatTile } from '../../ui/components';
import { BarChart, LineChart } from '../../ui/charts';

type Stats = {
  totals: { completion_rate: number; habits_completed: number; active_habits: number; points_earned: number };
  streaks: { current: number; best: number; best_perfect_day: number; per_habit: { habit_id: string; name: string; current: number; best: number }[] };
  weekly: { from: string; to: string; days: { date: string; weekday: number; scheduled: number; completed: number }[] };
  monthly: { date: string; percent: number }[];
  most_successful: { id: string; name: string; completion_rate: number } | null;
  least_successful: { id: string; name: string; completion_rate: number } | null;
  categories: { category_id: string; completion_rate: number; completions: number }[];
};

const WEEKDAY_KEYS = ['days_short_mon', 'days_short_tue', 'days_short_wed', 'days_short_thu', 'days_short_fri', 'days_short_sat', 'days_short_sun'] as const;

export default function Statistics() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      setStats(await api.get<Stats>('/statistics'));
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error && !stats) return <div className="page"><AppBar onBack={() => navigate(-1)} /><ErrorState onRetry={load} /></div>;

  return (
    <div className="page page-no-nav">
      <AppBar onBack={() => navigate(-1)} title={t('stats_title')} />
      {!stats ? (
        <div className="col mt-4" style={{ gap: 12 }}>
          <div className="grid-2"><Skeleton h={80} /><Skeleton h={80} /></div>
          <Skeleton h={150} r={16} />
          <Skeleton h={150} r={16} />
        </div>
      ) : (
        <>
          {/* Totals (section 49) */}
          <div className="grid-2 mt-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <StatTile label={t('completion_rate')} value={`${stats.totals.completion_rate}%`} accent="primary" />
            <StatTile label={t('total_completed')} value={stats.totals.habits_completed} />
            <StatTile label={t('active_habits')} value={stats.totals.active_habits} />
            <StatTile label={t('total_points')} value={stats.totals.points_earned} accent="gold" />
          </div>

          <div className="grid-2 mt-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <StatTile label={t('current_streak_label')} value={`🔥 ${stats.streaks.current}`} />
            <StatTile label={t('best_perfect')} value={stats.streaks.best_perfect_day} accent="primary" />
          </div>

          {/* Weekly bar chart (section 50) */}
          <h3 className="t-section mt-5 mb-3">{t('weekly')}</h3>
          <Card>
            <BarChart
              data={stats.weekly.days.map((d) => ({
                // full day names in Arabic (slicing breaks letter shaping)
                label: locale === 'ar' ? t(WEEKDAY_KEYS[d.weekday - 1] as never) : t(WEEKDAY_KEYS[d.weekday - 1] as never).slice(0, 3),
                value: d.completed,
                max: Math.max(1, d.scheduled),
                highlight: d.date === stats.weekly.to,
              }))}
            />
          </Card>

          {/* Monthly line */}
          <h3 className="t-section mt-5 mb-3">{t('monthly')}</h3>
          <Card>
            {stats.monthly.length > 1 ? (
              <LineChart points={stats.monthly.map((m) => ({ label: m.date, value: m.percent }))} />
            ) : (
              <p className="t-caption text-muted center">{t('empty_state_generic')}</p>
            )}
          </Card>

          {/* Most / least successful */}
          <h3 className="t-section mt-5 mb-3">{t('most_successful')} / {t('least_successful')}</h3>
          <div className="col" style={{ gap: 'var(--sp-3)' }}>
            {stats.most_successful && (
              <Card className="row" style={{ gap: 'var(--sp-3)' }}>
                <TrendingUp size={20} color="var(--primary)" />
                <span className="t-card-title grow">{stats.most_successful.name}</span>
                <Badge>{stats.most_successful.completion_rate}%</Badge>
              </Card>
            )}
            {stats.least_successful && (
              <Card className="row" style={{ gap: 'var(--sp-3)' }}>
                <TrendingDown size={20} color="var(--error)" />
                <span className="t-card-title grow">{stats.least_successful.name}</span>
                <Badge variant="muted">{stats.least_successful.completion_rate}%</Badge>
              </Card>
            )}
          </div>

          {/* Category performance */}
          {stats.categories.length > 0 && (
            <>
              <h3 className="t-section mt-5 mb-3">{t('category_performance')}</h3>
              <Card className="col" style={{ gap: 14 }}>
                {stats.categories.map((c) => (
                  <div key={c.category_id}>
                    <div className="row-between mb-2">
                      <span className="t-label">{t(`cat_${c.category_id.replace(/-/g, '_')}` as never) || c.category_id}</span>
                      <span className="t-caption tnum">{c.completion_rate}% · {c.completions}</span>
                    </div>
                    <div className="progress-track" style={{ height: 6 }}>
                      <div className="progress-fill" style={{ width: `${c.completion_rate}%` }} />
                    </div>
                  </div>
                ))}
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
