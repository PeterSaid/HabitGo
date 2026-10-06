import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CalendarDays, Pause, Play, Trash2 } from 'lucide-react';
import { api } from '../../api/client';
import { useI18n } from '../../i18n';
import { useToast } from '../../ui/components';
import { AppBar, Badge, Button, Card, ErrorState, Modal, Skeleton, StatTile } from '../../ui/components';
import { Heatmap } from '../../ui/charts';
import { IconBubble } from '../../ui/HabitIcon';
import { FreqLabel } from './AllHabits';

type HabitFull = {
  id: string; name: string; description?: string | null; category_id: string | null; icon: string; color: string;
  type: 'binary' | 'quantitative'; goal_value: number | null; goal_unit: string | null; difficulty: string;
  points: number; start_date: string; end_date: string | null; is_paused: boolean;
  schedule: { freq_type: string; days_of_week: number[] | null; times_per_week: number | null; times_per_month: number | null; reminder_time: string | null };
};

type Details = {
  habit: HabitFull;
  streak: { current_streak: number; best_streak: number };
  totals: { scheduled: number; completed: number; points: number };
  completion_rate: number;
};

type LogRow = { id: string; date: string; completed_value: number; target: number; status: string; points_earned: number };

export default function HabitDetails() {
  const { t } = useI18n();
  const toast = useToast();
  const navigate = useNavigate();
  const { id } = useParams();
  const [data, setData] = useState<Details | null>(null);
  const [logs, setLogs] = useState<LogRow[] | null>(null);
  const [error, setError] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setError(false);
    try {
      const [d, month] = await Promise.all([
        api.get<Details>(`/habits/${id}`),
        api.get<{ logs: LogRow[] }>(`/habits/${id}/logs`),
      ]);
      setData(d);
      setLogs(month.logs);
    } catch {
      setError(true);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const togglePause = async () => {
    if (!data) return;
    await api.post(`/habits/${data.habit.id}/pause`, { paused: !data.habit.is_paused });
    toast(t('saved'), 'success');
    load();
  };

  const doDelete = async () => {
    setConfirmDelete(false);
    if (!data) return;
    await api.del(`/habits/${data.habit.id}`);
    toast(t('saved'), 'success');
    navigate('/habits');
  };

  if (error && !data) return <div className="page"><AppBar onBack={() => navigate(-1)} /><ErrorState onRetry={load} /></div>;
  if (!data) {
    return (
      <div className="page page-no-nav">
        <AppBar onBack={() => navigate(-1)} />
        <div className="col mt-4" style={{ gap: 12 }}>
          <Skeleton w="60%" h={26} />
          <Skeleton h={110} r={16} />
          <Skeleton h={90} r={16} />
        </div>
      </div>
    );
  }

  const h = data.habit;
  // last 90 days heatmap for this habit
  const heatDays: { date: string; status: string }[] = [];
  const logMap = new Map((logs ?? []).map((l) => [l.date, l]));
  for (let i = 89; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const log = logMap.get(ds);
    const status = !log ? 'missed' : log.status;
    heatDays.push({ date: ds, status: status === 'pending' ? 'missed' : status });
  }

  return (
    <div className="page page-no-nav" style={{ paddingBottom: 'var(--sp-7)' }}>
      <AppBar
        onBack={() => navigate(-1)}
        title={t('habit_details')}
        right={
          <div className="row" style={{ gap: 8 }}>
            <button className="btn-icon" aria-label={h.is_paused ? t('resume_habit') : t('pause_habit')} onClick={togglePause}>
              {h.is_paused ? <Play size={18} /> : <Pause size={18} />}
            </button>
            <button className="btn-icon" aria-label={t('delete_habit')} onClick={() => setConfirmDelete(true)}>
              <Trash2 size={18} color="var(--error)" />
            </button>
          </div>
        }
      />

      {/* Identity card */}
      <Card className="row mt-3" style={{ gap: 'var(--sp-3)' }}>
        <IconBubble icon={h.icon} color={h.color} size={54} />
        <div className="grow col" style={{ gap: 4 }}>
          <div className="row" style={{ gap: 8 }}>
            <h2 className="t-section">{h.name}</h2>
            {h.is_paused && <Badge variant="muted">{t('paused')}</Badge>}
          </div>
          <span className="t-caption text-muted"><FreqLabel schedule={h.schedule as never} /></span>
          {h.schedule.reminder_time && <span className="t-caption text-faint">⏰ {h.schedule.reminder_time}</span>}
        </div>
        <Badge>+{h.points} {t('points_unit')}</Badge>
      </Card>

      {h.description && <p className="text-muted t-body mt-3">{h.description}</p>}

      {/* Stats grid (section 32) */}
      <div className="grid-2 mt-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <StatTile label={t('current_streak_label')} value={`🔥 ${data.streak.current_streak}`} />
        <StatTile label={t('best_streak')} value={`🏆 ${data.streak.best_streak}`} />
        <StatTile label={t('total_completed')} value={data.totals.completed ?? 0} accent="primary" />
        <StatTile label={t('completion_rate')} value={`${data.completion_rate}%`} accent="primary" />
      </div>
      <Card className="row-between mt-3">
        <span className="t-label text-muted">{t('points_earned')}</span>
        <span className="t-card-title tnum text-primary">+{data.totals.points ?? 0} {t('points_unit')}</span>
      </Card>

      {/* Heatmap */}
      <h3 className="t-section mt-5 mb-3">{t('history')}</h3>
      <Card>
        <Heatmap days={heatDays} />
        <div className="row mt-3" style={{ gap: 12, fontSize: 11, color: 'var(--text-3)' }}>
          <span className="row" style={{ gap: 5 }}><span className="heatmap-cell completed" style={{ width: 12, height: 12 }} /> {t('calendar_legend_completed')}</span>
          <span className="row" style={{ gap: 5 }}><span className="heatmap-cell partial" style={{ width: 12, height: 12 }} /> {t('calendar_legend_partial')}</span>
          <span className="row" style={{ gap: 5 }}><span className="heatmap-cell missed" style={{ width: 12, height: 12 }} /> {t('calendar_legend_missed')}</span>
        </div>
      </Card>

      <Button variant="outline" block className="mt-5" onClick={() => navigate(`/habits/${h.id}/edit`)}>
        {t('edit_habit')}
      </Button>
      <Button variant="ghost" block className="mt-3" onClick={() => navigate('/calendar')}>
        <CalendarDays size={18} /> {t('calendar')}
      </Button>

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <p className="t-card-title" style={{ textAlign: 'center' }}>{t('delete_habit_confirm')}</p>
        <div className="row mt-5">
          <Button variant="outline" block onClick={() => setConfirmDelete(false)}>{t('cancel')}</Button>
          <Button variant="danger" block onClick={doDelete}>{t('delete')}</Button>
        </div>
      </Modal>
    </div>
  );
}
