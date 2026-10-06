import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, Bell, CheckCheck, Flame, Gift, Megaphone, Target } from 'lucide-react';
import { api } from '../../api/client';
import { useI18n } from '../../i18n';
import { useStore } from '../../state/store';
import { AppBar, Button, Card, EmptyState, ErrorState, ListSkeleton } from '../../ui/components';

type Notif = {
  id: string; type: string; title_en: string; title_ar: string; body_en: string; body_ar: string;
  is_read: number; created_at: string;
};

const ICONS: Record<string, React.ReactNode> = {
  streak: <Flame size={19} color="var(--gold)" />,
  achievement: <Award size={19} color="var(--primary)" />,
  reward: <Gift size={19} color="var(--primary)" />,
  reward_approved: <Gift size={19} color="var(--primary)" />,
  challenge: <Target size={19} color="var(--info)" />,
  bonus: <Flame size={19} color="var(--gold)" />,
  system: <Megaphone size={19} color="var(--text-2)" />,
  habit_reminder: <Bell size={19} color="var(--primary)" />,
};

export default function NotificationsCenter() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const { refreshUnread } = useStore();
  const [items, setItems] = useState<Notif[] | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      const res = await api.get<{ notifications: Notif[] }>('/notifications?limit=60');
      setItems(res.notifications);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const markAll = async () => {
    await api.post('/notifications/read-all');
    refreshUnread();
    setItems((prev) => prev?.map((n) => ({ ...n, is_read: 1 })) ?? null);
  };

  const open = async (n: Notif) => {
    if (!n.is_read) {
      await api.post(`/notifications/${n.id}/read`);
      refreshUnread();
    }
    if (n.type === 'achievement') navigate('/achievements');
    else if (n.type === 'reward' || n.type === 'reward_approved') navigate('/rewards/history');
    else if (n.type === 'challenge') navigate('/challenges');
  };

  return (
    <div className="page page-no-nav">
      <AppBar
        onBack={() => navigate(-1)}
        title={t('notifications')}
        right={
          <button className="btn-text" style={{ color: 'var(--primary)', minWidth: 0 }} onClick={markAll}>
            <CheckCheck size={17} />
          </button>
        }
      />

      <div className="mt-3 col" style={{ gap: 'var(--sp-3)' }}>
        {error ? (
          <ErrorState onRetry={load} />
        ) : items === null ? (
          <ListSkeleton rows={5} />
        ) : items.length === 0 ? (
          <EmptyState icon={<Bell size={40} />} title={t('no_notifications')} desc={t('no_notifications_desc')} />
        ) : (
          items.map((n) => (
            <Card
              key={n.id}
              className="row"
              style={{
                gap: 'var(--sp-3)', cursor: 'pointer',
                background: n.is_read ? 'var(--surface)' : 'var(--very-soft-green)',
                borderColor: n.is_read ? 'var(--border)' : 'var(--soft-green)',
              }}
              onClick={() => open(n)}
            >
              <div className="habit-icon" style={{ background: 'var(--surface-2)', borderRadius: 14 }}>{ICONS[n.type] || <Bell size={19} />}</div>
              <div className="grow col" style={{ gap: 2, minWidth: 0 }}>
                <span className="t-label" style={{ fontWeight: n.is_read ? 500 : 800 }}>
                  {locale === 'ar' ? n.title_ar : n.title_en}
                </span>
                <span className="t-caption text-muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {locale === 'ar' ? n.body_ar : n.body_en}
                </span>
                <span className="t-caption text-faint tnum">{new Date(n.created_at).toLocaleString()}</span>
              </div>
              {!n.is_read && <span style={{ width: 9, height: 9, borderRadius: 9, background: 'var(--primary)', flexShrink: 0 }} />}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
