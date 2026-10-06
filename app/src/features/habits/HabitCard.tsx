import React, { useState } from 'react';
import { Check, Minus, Plus } from 'lucide-react';
import { api, ApiError, queueCompletion } from '../../api/client';
import { useI18n } from '../../i18n';
import { useStore } from '../../state/store';
import { useToast } from '../../ui/components';
import { Card, Modal, Button, ProgressBar } from '../../ui/components';
import { IconBubble } from '../../ui/HabitIcon';

export type TodayHabit = {
  habit: {
    id: string; name: string; category_id: string | null; icon: string; color: string;
    type: 'binary' | 'quantitative'; goal_value: number | null; goal_unit: string | null;
    difficulty: string; points: number;
  };
  log: { status: string; completed_value: number; target: number; points_earned: number };
  streak: number;
  period?: { freq_type: string; done: number; target: number } | null;
};

export type CompleteResult = {
  points_earned: number;
  wallet: { available: number };
  habit_streak?: { current: number; best: number } | null;
  bonuses: { key: string; points: number; days?: number }[];
};

/**
 * Habit row with completion button (spec section 31). Handles binary complete,
 * quantitative stepping, offline queueing and the uncomplete window.
 */
export function HabitCard({
  item,
  onChanged,
  onCelebrate,
}: {
  item: TodayHabit;
  onChanged: (r: CompleteResult | null) => void;
  onCelebrate?: (r: CompleteResult) => void;
}) {
  const { t } = useI18n();
  const { online } = useStore();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [confirmUndo, setConfirmUndo] = useState(false);
  const log = item.log;
  const target = log.target || 1;
  const percent = Math.round((log.completed_value / target) * 100);
  const isDone = log.status === 'completed';

  const send = async (value?: number) => {
    setBusy(true);
    try {
      const res = await api.post<CompleteResult>(`/habits/${item.habit.id}/complete`, { value });
      onChanged(res);
      if (res.points_earned > 0) toast(`+${res.points_earned} ${t('points_unit')} 🎉`, 'success');
      if (res.bonuses?.length) onCelebrate?.(res);
      return res;
    } catch (e) {
      if (e instanceof ApiError && e.code === 'network_error') {
        queueCompletion({ habitId: item.habit.id, date: localToday(), value });
        toast(t('offline_queued'), 'info');
        onChanged(null);
      } else if (e instanceof ApiError) {
        toast(e.code === 'already_completed' ? t('completed') : t('err_generic'), e.code === 'already_completed' ? 'info' : 'error');
      }
    } finally {
      setBusy(false);
    }
  };

  const uncomplete = async () => {
    setConfirmUndo(false);
    setBusy(true);
    try {
      await api.post(`/habits/${item.habit.id}/uncomplete`, {});
      onChanged(null);
      toast(t('undo'), 'info');
    } catch (e) {
      if (e instanceof ApiError && e.code === 'edit_cutoff') toast(t('edited_out_window'), 'error');
      else toast(t('err_generic'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const onCheck = () => {
    if (busy) return;
    if (isDone) {
      setConfirmUndo(true);
      return;
    }
    if (item.habit.type === 'quantitative') {
      send(Math.min(target, log.completed_value + 1));
    } else {
      send();
    }
  };

  return (
    <Card className="row" style={{ gap: 'var(--sp-3)', padding: 'var(--sp-4)' }}>
      <IconBubble icon={item.habit.icon} color={item.habit.color} />
      <div className="grow col" style={{ gap: 4, minWidth: 0 }}>
        <div className="row-between">
          <span className="t-card-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.habit.name}
          </span>
          {item.streak > 0 && (
            <span className="t-caption tnum" style={{ color: 'var(--gold)', fontWeight: 600, flexShrink: 0 }}>
              🔥 {item.streak}
            </span>
          )}
        </div>
        <div className="row" style={{ gap: 8 }}>
          {item.habit.type === 'quantitative' ? (
            <span className="t-caption text-muted tnum">
              {log.completed_value} / {target} {unitLabel(item.habit.goal_unit, t)}
            </span>
          ) : (
            <span className="t-caption text-muted">+{item.habit.points} {t('points_unit')}</span>
          )}
          {item.period && (
            <span className="t-caption text-faint tnum">
              · {t('challenge_progress', { done: item.period.done, target: item.period.target })}
            </span>
          )}
        </div>
        {item.habit.type === 'quantitative' && !isDone && <ProgressBar value={percent} />}
      </div>

      {item.habit.type === 'quantitative' && !isDone ? (
        <div className="stepper" aria-label="progress">
          <button
            aria-label="decrease"
            disabled={busy || log.completed_value === 0}
            style={{ opacity: log.completed_value === 0 ? 0.4 : 1 }}
            onClick={() => send(Math.max(0, log.completed_value - 1))}
          >
            <Minus size={16} />
          </button>
          <button aria-label="increase" disabled={busy || isDone} onClick={() => send(Math.min(target, log.completed_value + 1))}>
            <Plus size={16} />
          </button>
        </div>
      ) : (
        <button className={`check-btn ${isDone ? 'is-done' : ''}`} aria-label={isDone ? t('undo') : t('complete')} disabled={busy} onClick={onCheck}>
          <Check size={26} strokeWidth={3} />
        </button>
      )}

      <Modal open={confirmUndo} onClose={() => setConfirmUndo(false)}>
        <p className="t-card-title" style={{ textAlign: 'center' }}>{t('uncomplete_confirm')}</p>
        <div className="row mt-5">
          <Button variant="outline" block onClick={() => setConfirmUndo(false)}>
            {t('cancel')}
          </Button>
          <Button variant="danger" block onClick={uncomplete}>
            {t('yes')}
          </Button>
        </div>
      </Modal>
    </Card>
  );
}

function unitLabel(unit: string | null, t: (k: never, p?: never) => string) {
  return unit || '';
}

export function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
