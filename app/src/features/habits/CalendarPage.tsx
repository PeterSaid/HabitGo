import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../../api/client';
import { useI18n } from '../../i18n';
import { AppBar, Card, ErrorState, ListSkeleton } from '../../ui/components';

type DayCell = { date: string; status: 'completed' | 'partial' | 'missed' | 'future' | 'none' };

const DAY_HEADERS = ['days_short_sun', 'days_short_mon', 'days_short_tue', 'days_short_wed', 'days_short_thu', 'days_short_fri', 'days_short_sat'] as const;

/** Calendar view (spec section 51) — month grid with per-day status. */
export default function CalendarPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const now = new Date();
  const [ym, setYm] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [days, setDays] = useState<DayCell[] | null>(null);
  const [error, setError] = useState(false);

  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const load = useCallback(async () => {
    setError(false);
    setDays(null);
    try {
      const res = await api.get<{ days: DayCell[] }>(`/habits/calendar/${ym}`);
      setDays(res.days);
    } catch {
      setError(true);
    }
  }, [ym]);

  useEffect(() => {
    load();
  }, [load]);

  const shiftMonth = (delta: number) => {
    const [y, m] = ym.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setYm(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  // build grid: leading blanks + days
  const [year, month] = ym.split('-').map(Number);
  const firstWeekday = new Date(year, month - 1, 1).getDay(); // 0=Sunday column order
  const blanks = Array.from({ length: firstWeekday });
  const monthName = new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <div className="page page-no-nav" style={{ paddingBottom: 'calc(var(--nav-height) + var(--sp-6))' }}>
      <AppBar onBack={() => navigate(-1)} title={t('calendar')} />
      <div className="row-between mt-3 mb-3">
        <button className="btn-icon" aria-label="previous month" onClick={() => shiftMonth(-1)}>
          <ChevronLeft size={18} style={{ transform: 'scaleX(var(--flip,1))' }} />
        </button>
        <span className="t-card-title">{monthName}</span>
        <button className="btn-icon" aria-label="next month" onClick={() => shiftMonth(1)}>
          <ChevronRight size={18} style={{ transform: 'scaleX(var(--flip,1))' }} />
        </button>
      </div>

      {error ? (
        <ErrorState onRetry={load} />
      ) : days === null ? (
        <ListSkeleton rows={2} />
      ) : (
        <Card>
          <div className="cal-grid mb-2">
            {DAY_HEADERS.map((k, i) => (
              <span key={i} className="t-caption center" style={{ fontWeight: 600 }}>
                {t(k as never).slice(0, 3)}
              </span>
            ))}
          </div>
          <div className="cal-grid">
            {blanks.map((_, i) => (
              <span key={`b${i}`} />
            ))}
            {days.map((d) => {
              const dayNum = Number(d.date.slice(8));
              const isToday = d.date === todayStr;
              return (
                <div key={d.date} className={`cal-cell ${d.status} ${isToday ? 'today' : ''}`} title={d.date}>
                  {dayNum}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Card className="mt-4">
        <div className="row" style={{ gap: 16, fontSize: 12, color: 'var(--text-2)', flexWrap: 'wrap' }}>
          <span className="row" style={{ gap: 6 }}><span className="cal-cell completed" style={{ width: 18, height: 18 }} /> {t('calendar_legend_completed')}</span>
          <span className="row" style={{ gap: 6 }}><span className="cal-cell partial" style={{ width: 18, height: 18 }} /> {t('calendar_legend_partial')}</span>
          <span className="row" style={{ gap: 6 }}><span className="cal-cell missed" style={{ width: 18, height: 18 }} /> {t('calendar_legend_missed')}</span>
          <span className="row" style={{ gap: 6 }}><span className="cal-cell future" style={{ width: 18, height: 18 }} /> {t('calendar_legend_future')}</span>
        </div>
      </Card>
    </div>
  );
}
