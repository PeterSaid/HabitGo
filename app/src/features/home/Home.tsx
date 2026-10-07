import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CalendarDays, Flame, Gift, PieChart, Plus, Sparkles, Wallet as WalletIcon } from 'lucide-react';
import { api } from '../../api/client';
import { useI18n } from '../../i18n';
import { useStore } from '../../state/store';
import { Badge, Button, Card, EmptyState, ErrorState, ListSkeleton, ProgressBar, SectionHeader } from '../../ui/components';
import { Donut } from '../../ui/charts';
import { HabitCard, localToday, type CompleteResult, type TodayHabit } from '../habits/HabitCard';

type Dashboard = {
  today: { date: string; scheduled: number; completed: number; percent: number; points_earned_today: number };
  user_streak: number;
  wallet: { available: number; pending: number; lifetime: number; estimated_value: number };
  week: { scheduled: number; completed: number; percent: number };
  next_reward: { id: string; name_en: string; name_ar: string; points_cost: number } | null;
  level: { level: number; name: string; currentLevelXp: number; nextLevelXp: number | null };
  motivational: { key: string; streak?: number };
};

export default function Home() {
  const { t, locale } = useI18n();
  const { user, level, unread, refreshUnread } = useStore();
  const navigate = useNavigate();
  const [data, setData] = useState<Dashboard | null>(null);
  const [today, setToday] = useState<TodayHabit[] | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      const [d, td] = await Promise.all([
        api.get<Dashboard>('/dashboard'),
        api.get<{ habits: TodayHabit[] }>('/habits/today'),
      ]);
      setData(d);
      setToday(td.habits);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'greeting_morning' : hour < 17 ? 'greeting_afternoon' : 'greeting_evening';

  const onHabitChanged = (r: CompleteResult | null) => {
    load();
    refreshUnread();
  };

  const onCelebrate = (r: CompleteResult) => {
    // lightweight celebration: streak badge is visible on cards; big milestones use a toast
    const b = r.bonuses?.[0];
    if (b) {
      navigate('/achievements', { state: { celebrate: { points: b.points, days: b.days } } });
    }
  };

  if (error && !data) {
    return (
      <div className="page">
        <ErrorState onRetry={load} />
      </div>
    );
  }

  const motKey = data
    ? data.motivational.key === 'streak_alive'
      ? 'mot_streak_alive'
      : data.motivational.key === 'all_done_streak'
        ? 'mot_all_done_streak'
        : `mot_${data.motivational.key === 'day_complete' ? 'day_complete' : data.motivational.key === 'one_left' ? 'one_left' : 'keep_going'}`
    : 'mot_keep_going';

  const nextRewardName = data?.next_reward ? (locale === 'ar' ? data.next_reward.name_ar : data.next_reward.name_en) : '';
  const nextRewardProgress = data?.next_reward ? Math.min(100, Math.round(((data.wallet.available || 0) / data.next_reward.points_cost) * 100)) : 0;

  return (
    <div className="page">
      {/* Header row */}
      <div className="row-between mb-4">
        <div>
          <h1 className="t-section" style={{ color: 'var(--text-2)', fontWeight: 500 }}>
            {t(greeting as never)}, {user?.name?.split(' ')[0]} 👋
          </h1>
          {level && (
            <span className="t-caption">
              {t('level')} {level.level} · {level.name}
            </span>
          )}
        </div>
        <button
          className="btn-icon"
          aria-label={t('notifications')}
          onClick={() => navigate('/notifications')}
          style={{ position: 'relative' }}
        >
          <Bell size={20} />
          {unread > 0 && (
            <span
              style={{
                position: 'absolute', top: 8, insetInlineEnd: 8, width: 9, height: 9,
                borderRadius: 9, background: 'var(--error)', border: '1.5px solid var(--surface)',
              }}
            />
          )}
        </button>
      </div>

      {/* Hero: today's progress (section 26) */}
      <Card gradient className="row" style={{ gap: 'var(--sp-4)', padding: 'var(--sp-5)' }}>
        <Donut percent={data?.today.percent ?? 0} size={104} stroke={11}>
          <span style={{ fontSize: 26, fontWeight: 800, color: '#fff' }} className="tnum">
            {data?.today.percent ?? 0}%
          </span>
        </Donut>
        <div className="col grow" style={{ gap: 8, color: '#fff' }}>
          <span style={{ opacity: 0.9, fontSize: 14, fontWeight: 600 }}>{t('progress_today')}</span>
          <span style={{ fontSize: 15, opacity: 0.95 }} className="tnum">
            {t('completed_of', { done: data?.today.completed ?? 0, total: data?.today.scheduled ?? 0 })}
          </span>
          <div className="row mt-2" style={{ gap: 'var(--sp-4)' }}>
            <div className="col" style={{ gap: 2 }}>
              <span style={{ fontSize: 20, fontWeight: 800 }} className="tnum">
                +{data?.today.points_earned_today ?? 0}
              </span>
              <span style={{ fontSize: 11, opacity: 0.85 }}>{t('points_today')}</span>
            </div>
            <div className="col" style={{ gap: 2 }}>
              <span style={{ fontSize: 20, fontWeight: 800 }} className="tnum">
                🔥 {data?.user_streak ?? 0}
              </span>
              <span style={{ fontSize: 11, opacity: 0.85 }}>{t('current_streak')}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Motivational message (section 54) */}
      {data && (
        <p className="t-label mt-4" style={{ color: 'var(--text-2)', textAlign: 'center' }}>
          {t(motKey as never, { streak: data.motivational.streak ?? data.user_streak })}
        </p>
      )}

      {/* Quick actions */}
      <div className="grid-2 mt-5" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--sp-3)' }}>
        {[
          { icon: PieChart, label: t('stats_title'), path: '/stats' },
          { icon: CalendarDays, label: t('calendar'), path: '/calendar' },
          { icon: WalletIcon, label: t('wallet_title'), path: '/wallet' },
          { icon: Sparkles, label: t('challenges'), path: '/challenges' },
        ].map((a) => (
          <button
            key={a.path}
            onClick={() => navigate(a.path)}
            className="center"
            style={{ flexDirection: 'column', gap: 6, padding: '12px 4px', borderRadius: 'var(--r-md)', background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <a.icon size={20} color="var(--primary)" />
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)' }}>{a.label}</span>
          </button>
        ))}
      </div>

      {/* Today's habits */}
      <SectionHeader title={t('todays_habits')} />
      {today === null ? (
        <ListSkeleton rows={3} />
      ) : today.length === 0 ? (
        <EmptyState icon={<Plus size={40} />} title={t('empty_habits_title')} desc={t('empty_habits_desc')} cta={t('empty_habits_cta')} onCta={() => navigate('/habits/new')} />
      ) : (
        <div className="col" style={{ gap: 'var(--sp-3)' }}>
          {today.map((item) => (
            <HabitCard key={item.habit.id} item={item} onChanged={onHabitChanged} onCelebrate={onCelebrate} />
          ))}
        </div>
      )}

      {/* Weekly progress */}
      <SectionHeader title={t('weekly_progress')} />
      <Card>
        <div className="row-between mb-2">
          <span className="t-label text-muted tnum">
            {data ? `${data.week.completed} / ${data.week.scheduled}` : '—'}
          </span>
          <Badge>{data?.week.percent ?? 0}%</Badge>
        </div>
        <ProgressBar value={data?.week.percent ?? 0} />
      </Card>

      {/* Reward progress (next reward) */}
      {data?.next_reward && (
        <>
          <SectionHeader title={t('reward_progress')} action={t('see_all')} onAction={() => navigate('/rewards')} />
          <Card gold className="row" style={{ gap: 'var(--sp-3)' }}>
            <Gift size={26} />
            <div className="grow col" style={{ gap: 6 }}>
              <div className="row-between">
                <span className="t-card-title">{nextRewardName}</span>
                <span className="t-label tnum" style={{ fontWeight: 700 }}>
                  {data.next_reward.points_cost} {t('points_unit')}
                </span>
              </div>
              <div style={{ height: 8, borderRadius: 8, background: 'rgba(255,255,255,0.35)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${nextRewardProgress}%`, background: '#7C4A00', borderRadius: 8, transition: 'width 500ms var(--ease)' }} />
              </div>
              <span className="t-caption tnum" style={{ fontWeight: 700, color: '#FFFFFF' }}>
                {t('your_balance')}: {data.wallet.available} · {t('estimated_value')} ~{data.wallet.estimated_value}
              </span>
            </div>
          </Card>
        </>
      )}

      {/* Streak banner when alive */}
      {(data?.user_streak ?? 0) >= 3 && (
        <Card className="row mt-5" style={{ gap: 'var(--sp-3)', background: 'var(--very-soft-green)', borderColor: 'var(--soft-green)' }}>
          <Flame size={26} color="var(--gold)" />
          <div className="grow">
            <div className="t-card-title">{t('current_streak')}: {data?.user_streak} {t('days')}</div>
            <div className="t-caption text-muted">{t('mot_streak_alive', { streak: data?.user_streak ?? 0 })}</div>
          </div>
        </Card>
      )}
    </div>
  );
}
