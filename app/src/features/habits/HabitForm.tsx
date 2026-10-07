import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import { useI18n } from '../../i18n';
import { AppBar, Button, Card, Field, Input, Select, Textarea } from '../../ui/components';
import { HABIT_ICON_KEYS, HabitIcon, CATEGORY_COLORS } from '../../ui/HabitIcon';

type FreqType = 'daily' | 'weekly_days' | 'times_per_week' | 'times_per_month';
type HabitType = 'binary' | 'quantitative';

type Category = { id: string; name_en: string; name_ar: string; icon: string };
type HabitFull = {
  id: string; name: string; description?: string | null; category_id: string | null; icon: string; color: string;
  type: HabitType; goal_value: number | null; goal_unit: string | null; difficulty: 'easy' | 'medium' | 'hard';
  points: number; start_date: string; end_date: string | null; is_paused: boolean;
  schedule: { freq_type: FreqType; days_of_week: number[] | null; times_per_week: number | null; times_per_month: number | null; reminder_time: string | null; reminder_days: number[] | null; reminder_message: string | null };
};

const DAY_KEYS = ['days_short_sun', 'days_short_mon', 'days_short_tue', 'days_short_wed', 'days_short_thu', 'days_short_fri', 'days_short_sat'] as const;
const POINTS_BY_DIFF = { easy: 10, medium: 20, hard: 30 } as const;
const PALETTE = ['#22C55E', '#14B8A6', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#0EA5E9', '#84CC16', '#6366F1'];

export default function HabitForm() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const { id } = useParams();
  const editing = !!id;

  const [categories, setCategories] = useState<Category[]>([]);
  const [existing, setExisting] = useState<HabitFull | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    description: '',
    category_id: '',
    icon: 'star',
    color: '#22C55E',
    type: 'binary' as HabitType,
    goal_value: 8,
    goal_unit: '',
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    points: 20,
    start_date: localToday(),
    end_date: '',
    freq_type: 'daily' as FreqType,
    days_of_week: [] as number[],
    times_per_week: 3,
    times_per_month: 10,
    reminder_time: '',
    reminder_days: [] as number[],
    reminder_message: '',
  });

  useEffect(() => {
    api.get<{ categories: Category[] }>('/habit-categories').then((r) => setCategories(r.categories)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!id) return;
    api.get<{ habit: HabitFull }>(`/habits/${id}`).then((r) => {
      const h = r.habit;
      setExisting(h);
      setForm({
        name: h.name,
        description: h.description || '',
        category_id: h.category_id || '',
        icon: h.icon,
        color: h.color,
        type: h.type,
        goal_value: h.goal_value || 8,
        goal_unit: h.goal_unit || '',
        difficulty: h.difficulty,
        points: h.points,
        start_date: h.start_date,
        end_date: h.end_date || '',
        freq_type: h.schedule.freq_type,
        days_of_week: h.schedule.days_of_week || [],
        times_per_week: h.schedule.times_per_week || 3,
        times_per_month: h.schedule.times_per_month || 10,
        reminder_time: h.schedule.reminder_time || '',
        reminder_days: h.schedule.reminder_days || [],
        reminder_message: h.schedule.reminder_message || '',
      });
    });
  }, [id]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const toggleDay = (day: number, key: 'days_of_week' | 'reminder_days') => {
    const list = form[key];
    set(key, list.includes(day) ? list.filter((d) => d !== day) : [...list, day].sort());
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!form.name.trim()) {
      setFormError(t('val_required'));
      return;
    }
    if (form.freq_type === 'weekly_days' && form.days_of_week.length === 0) {
      setFormError(t('val_days'));
      return;
    }
    if (form.type === 'quantitative' && (form.goal_value || 0) < 1) {
      setFormError(t('val_required'));
      return;
    }
    setBusy(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        category_id: form.category_id || undefined,
        icon: form.icon,
        color: form.color,
        type: form.type,
        goal_value: form.type === 'quantitative' ? Number(form.goal_value) : undefined,
        goal_unit: form.type === 'quantitative' ? form.goal_unit.trim() || undefined : undefined,
        difficulty: form.difficulty,
        points: Number(form.points),
        start_date: form.start_date,
        end_date: form.end_date || undefined,
        freq_type: form.freq_type,
        days_of_week: form.freq_type === 'weekly_days' ? form.days_of_week : undefined,
        times_per_week: form.freq_type === 'times_per_week' ? Number(form.times_per_week) : undefined,
        times_per_month: form.freq_type === 'times_per_month' ? Number(form.times_per_month) : undefined,
        reminder_time: form.reminder_time || undefined,
        reminder_days: form.reminder_time ? (form.reminder_days.length ? form.reminder_days : [1, 2, 3, 4, 5, 6, 7]) : undefined,
        reminder_message: form.reminder_message.trim() || undefined,
      };
      if (editing) {
        await api.put(`/habits/${id}`, payload);
      } else {
        await api.post('/habits', payload);
      }
      navigate('/habits');
    } catch {
      setFormError(t('err_generic'));
    } finally {
      setBusy(false);
    }
  };

  const freqOptions = useMemo(
    () => [
      { value: 'daily', label: t('freq_daily') },
      { value: 'weekly_days', label: t('freq_weekly_days') },
      { value: 'times_per_week', label: t('freq_times_per_week') },
      { value: 'times_per_month', label: t('freq_times_per_month') },
    ],
    [t]
  );

  return (
    <div className="page page-no-nav" style={{ paddingBottom: 'calc(var(--nav-height) + var(--sp-6))' }}>
      <AppBar title={editing ? t('edit_habit') : t('add_habit')} onBack={() => navigate(-1)} />
      <form onSubmit={submit} className="mt-4" noValidate>
        <Field label={t('habit_name')}>
          <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder={t('habit_name_ph')} maxLength={80} />
        </Field>

        <Field label={`${t('description')} (${t('optional')})`}>
          <Textarea value={form.description} onChange={(e) => set('description', e.target.value)} placeholder={t('description_ph')} maxLength={500} />
        </Field>

        <Field label={t('category')}>
          <Select value={form.category_id} onChange={(e) => {
            const v = e.target.value;
            set('category_id', v);
            if (v && CATEGORY_COLORS[v]) set('color', CATEGORY_COLORS[v]);
          }}>
            <option value="">—</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{locale === 'ar' ? c.name_ar : c.name_en}</option>
            ))}
          </Select>
        </Field>

        <Field label={t('habit_type')}>
          <Select value={form.type} onChange={(e) => set('type', e.target.value as HabitType)}>
            <option value="binary">{t('type_binary')}</option>
            <option value="quantitative">{t('type_quantitative')}</option>
          </Select>
        </Field>

        {form.type === 'quantitative' && (
          <div className="grid-2">
            <Field label={t('goal_value')}>
              <Input type="number" min={1} max={1000} value={form.goal_value} onChange={(e) => set('goal_value', Number(e.target.value))} />
            </Field>
            <Field label={`${t('goal_unit')} (${t('optional')})`}>
              <Input value={form.goal_unit} onChange={(e) => set('goal_unit', e.target.value)} placeholder="cups / pages" />
            </Field>
          </div>
        )}

        <Field label={t('icon')}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
            {HABIT_ICON_KEYS.slice(0, 18).map((k) => (
              <button
                key={k}
                type="button"
                aria-label={k}
                onClick={() => set('icon', k)}
                className="center"
                style={{
                  height: 46, borderRadius: 'var(--r-md)',
                  background: form.icon === k ? 'var(--soft-green)' : 'var(--surface)',
                  border: `1.5px solid ${form.icon === k ? 'var(--primary)' : 'var(--border)'}`,
                }}
              >
                <HabitIcon name={k} size={20} color={form.icon === k ? 'var(--primary)' : 'var(--text-2)'} />
              </button>
            ))}
          </div>
        </Field>

        <Field label={t('color')}>
          <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
            {PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={c}
                onClick={() => set('color', c)}
                style={{
                  width: 34, height: 34, borderRadius: '50%', background: c,
                  outline: form.color === c ? '2.5px solid var(--text)' : 'none', outlineOffset: 2,
                }}
              />
            ))}
          </div>
        </Field>

        <Field label={t('frequency')}>
          <Select value={form.freq_type} onChange={(e) => set('freq_type', e.target.value as FreqType)}>
            {freqOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        </Field>

        {form.freq_type === 'weekly_days' && (
          <Field label={t('freq_weekly_days')} error={formError && form.days_of_week.length === 0 ? t('val_days') : undefined}>
            <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
              {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(d, 'days_of_week')}
                  className="chip"
                  style={{ minHeight: 36, fontSize: 12 }}
                  aria-pressed={form.days_of_week.includes(d)}
                >
                  {t(DAY_KEYS[d] as never)}
                </button>
              ))}
            </div>
          </Field>
        )}

        {form.freq_type === 'times_per_week' && (
          <Field label={t('freq_times_per_week')}>
            <Input type="number" min={1} max={7} value={form.times_per_week} onChange={(e) => set('times_per_week', Number(e.target.value))} />
          </Field>
        )}
        {form.freq_type === 'times_per_month' && (
          <Field label={t('freq_times_per_month')}>
            <Input type="number" min={1} max={31} value={form.times_per_month} onChange={(e) => set('times_per_month', Number(e.target.value))} />
          </Field>
        )}

        <Field label={`${t('difficulty')} — ${t('reward_points')}`}>
          <div className="grid-2" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {(['easy', 'medium', 'hard'] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => { set('difficulty', d); set('points', POINTS_BY_DIFF[d]); }}
                className="chip"
                style={{ justifyContent: 'center', flexDirection: 'column', height: 62, gap: 2 }}
                aria-pressed={form.difficulty === d}
              >
                <span style={{ fontWeight: 600 }}>{t(`diff_${d}` as never)}</span>
                <span style={{ fontSize: 11, color: form.difficulty === d ? 'var(--primary-soft-text)' : 'var(--text-3)' }}>
                  {POINTS_BY_DIFF[d]} {t('points_unit')}
                </span>
              </button>
            ))}
          </div>
        </Field>

        <div className="grid-2">
          <Field label={t('start_date')}>
            <Input type="date" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} max={form.end_date || undefined} />
          </Field>
          <Field label={`${t('end_date')} (${t('optional')})`}>
            <Input type="date" value={form.end_date} onChange={(e) => set('end_date', e.target.value)} min={form.start_date} />
          </Field>
        </div>

        <Field label={`${t('reminder')} (${t('optional')})`}>
          <Input type="time" value={form.reminder_time} onChange={(e) => set('reminder_time', e.target.value)} />
        </Field>
        {form.reminder_time && (
          <>
            <Field label={t('reminder_message')}>
              <Input value={form.reminder_message} onChange={(e) => set('reminder_message', e.target.value)} placeholder={t('reminder_message_ph')} maxLength={120} />
            </Field>
          </>
        )}

        {formError && <p className="field-error mb-3">{formError}</p>}

        <Button type="submit" block size="lg" loading={busy} className="mt-4">
          {editing ? t('save') : t('add_habit')}
        </Button>
        <div style={{ height: 'var(--sp-5)' }} />
      </form>
    </div>
  );
}

export function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
