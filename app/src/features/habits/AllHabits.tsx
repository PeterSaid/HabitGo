import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ListChecks, Plus, Search } from 'lucide-react';
import { api } from '../../api/client';
import { useI18n } from '../../i18n';
import { Badge, Card, EmptyState, ErrorState, IconButton, ListSkeleton, Segmented } from '../../ui/components';
import { IconBubble } from '../../ui/HabitIcon';
import { HabitCard, type TodayHabit } from './HabitCard';

type HabitRow = {
  id: string; name: string; description?: string; category_id: string | null; icon: string; color: string;
  type: 'binary' | 'quantitative'; goal_value: number | null; goal_unit: string | null;
  difficulty: string; points: number; start_date: string; end_date: string | null; is_paused: boolean;
  streak: number; best_streak: number;
  schedule: { freq_type: string; days_of_week: number[] | null; times_per_week: number | null; times_per_month: number | null; reminder_time: string | null };
};

const DAY_KEYS = ['days_short_sun', 'days_short_mon', 'days_short_tue', 'days_short_wed', 'days_short_thu', 'days_short_fri', 'days_short_sat'] as const;

export function FreqLabel({ schedule }: { schedule: HabitRow['schedule'] }) {
  const { t, locale } = useI18n();
  if (schedule.freq_type === 'daily') return <>{t('freq_daily')}</>;
  if (schedule.freq_type === 'weekly_days' && schedule.days_of_week) {
    const names = schedule.days_of_week
      .slice()
      .sort((a, b) => a - b)
      .map((d) => t(DAY_KEYS[d % 7] as never));
    return <>{names.join(' · ')}</>;
  }
  if (schedule.freq_type === 'times_per_week') return <>{`${schedule.times_per_week} ${t('times_per_week_unit')}`}</>;
  if (schedule.freq_type === 'times_per_month') return <>{`${schedule.times_per_month} ${t('times_per_month_unit')}`}</>;
  return null;
}

export default function AllHabits() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [habits, setHabits] = useState<HabitRow[] | null>(null);
  const [todayItems, setTodayItems] = useState<Map<string, TodayHabit>>(new Map());
  const [filter, setFilter] = useState<'all' | 'active' | 'paused'>('all');
  const [query, setQuery] = useState('');
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      const [all, td] = await Promise.all([
        api.get<{ habits: HabitRow[] }>('/habits'),
        api.get<{ habits: TodayHabit[] }>('/habits/today'),
      ]);
      setHabits(all.habits);
      setTodayItems(new Map(td.habits.map((h) => [h.habit.id, h])));
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!habits) return null;
    return habits
      .filter((h) => (filter === 'all' ? true : filter === 'paused' ? h.is_paused : !h.is_paused))
      .filter((h) => h.name.toLowerCase().includes(query.toLowerCase()));
  }, [habits, filter, query]);

  return (
    <div className="page">
      <div className="row-between mb-4">
        <h1 className="t-page-title">{t('habits_title')}</h1>
        <IconButton aria-label={t('add_habit')} onClick={() => navigate('/habits/new')}>
          <Plus size={20} />
        </IconButton>
      </div>

      <div className="row mb-3" style={{ gap: 'var(--sp-3)' }}>
        <div className="grow" style={{ position: 'relative' }}>
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
      </div>

      <div className="mb-4">
        <Segmented
          options={[
            { value: 'all', label: t('stats_title') === 'الإحصائيات' ? 'الكل' : 'All' },
            { value: 'active', label: t('challenge_active') },
            { value: 'paused', label: t('paused') },
          ]}
          value={filter}
          onChange={setFilter}
        />
      </div>

      {error && !filtered ? (
        <ErrorState onRetry={load} />
      ) : filtered === null ? (
        <ListSkeleton rows={4} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<ListChecks size={40} />}
          title={t('empty_habits_title')}
          desc={t('empty_habits_desc')}
          cta={t('empty_habits_cta')}
          onCta={() => navigate('/habits/new')}
        />
      ) : (
        <div className="col" style={{ gap: 'var(--sp-3)' }}>
          {filtered.map((h) => {
            const live = todayItems.get(h.id);
            if (live) {
              return <HabitCard key={h.id} item={live} onChanged={() => load()} />;
            }
            return (
              <Card key={h.id} className="row" style={{ gap: 'var(--sp-3)', opacity: h.is_paused ? 0.65 : 1 }} onClick={() => navigate(`/habits/${h.id}`)}>
                <IconBubble icon={h.icon} color={h.color} />
                <div className="grow col" style={{ gap: 3, minWidth: 0 }}>
                  <div className="row-between">
                    <span className="t-card-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.name}</span>
                    {h.streak > 0 && (
                      <span className="t-caption tnum" style={{ color: 'var(--gold)', fontWeight: 600, flexShrink: 0 }}>
                        🔥 {h.streak}
                      </span>
                    )}
                  </div>
                  <div className="row" style={{ gap: 8 }}>
                    <span className="t-caption text-muted"><FreqLabel schedule={h.schedule} /></span>
                    {h.schedule.reminder_time && <span className="t-caption text-faint tnum">· ⏰ {h.schedule.reminder_time}</span>}
                    {h.is_paused && <Badge variant="muted">{t('paused')}</Badge>}
                  </div>
                </div>
                <ChevronRight size={18} color="var(--text-3)" style={{ transform: 'scaleX(var(--flip,1))' }} />
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
