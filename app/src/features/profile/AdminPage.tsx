import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useI18n } from '../../i18n';
import { useToast } from '../../ui/components';
import { AppBar, Badge, Button, Card, ErrorState, Field, Input, Modal, Segmented, StatTile } from '../../ui/components';

type Overview = { users: number; habits: number; completions: number; points_issued: number; pending_redemptions: number; rewards_active: number };
type Redemption = {
  id: string; status: string; points_cost: number; requested_at: string;
  name_en: string; name_ar: string; user_name: string | null; user_email: string; redemption_type: string;
};
type SettingRow = { key: string; value: string; updated_at: string };

/** Admin area (spec sections 69-71): overview, redemptions review, system settings. */
export default function AdminPage() {
  const { t, locale } = useI18n();
  const toast = useToast();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'overview' | 'redemptions' | 'settings'>('overview');
  const [overview, setOverview] = useState<Overview | null>(null);
  const [redemptions, setRedemptions] = useState<Redemption[] | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [settings, setSettings] = useState<SettingRow[] | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      if (tab === 'overview') setOverview(await api.get<Overview>('/admin/overview'));
      if (tab === 'redemptions') {
        const res = await api.get<{ redemptions: Redemption[] }>(`/admin/redemptions?status=${statusFilter}`);
        setRedemptions(res.redemptions);
      }
      if (tab === 'settings') {
        const res = await api.get<{ settings: SettingRow[] }>('/admin/settings');
        setSettings(res.settings);
      }
    } catch {
      setError(true);
    }
  }, [tab, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const review = async (id: string, action: 'approve' | 'reject' | 'complete') => {
    try {
      await api.post(`/admin/redemptions/${id}/review`, { action });
      toast(t('saved'), 'success');
      load();
    } catch {
      toast(t('err_generic'), 'error');
    }
  };

  const [convValue, setConvValue] = useState('');
  const saveConversion = async () => {
    try {
      await api.put('/admin/settings', { settings: { points_per_reward_unit: convValue } });
      toast(t('saved'), 'success');
      load();
    } catch {
      toast(t('err_generic'), 'error');
    }
  };

  return (
    <div className="page page-no-nav">
      <AppBar onBack={() => navigate(-1)} title={t('admin')} />
      <div className="mt-3 mb-4">
        <Segmented
          options={[
            { value: 'overview', label: t('admin_overview') },
            { value: 'redemptions', label: t('admin_redemptions') },
            { value: 'settings', label: t('admin_settings') },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      {error && <ErrorState onRetry={load} />}

      {tab === 'overview' && overview && (
        <>
          <div className="grid-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <StatTile label={t('admin_users')} value={overview.users} accent="primary" />
            <StatTile label={t('habits_title')} value={overview.habits} />
            <StatTile label={t('total_completed')} value={overview.completions} />
            <StatTile label={t('total_points')} value={overview.points_issued} accent="gold" />
          </div>
          <Card className="row-between mt-3">
            <span className="t-label">{t('status_pending')} — {t('admin_redemptions')}</span>
            <Badge variant="gold" className="tnum">{overview.pending_redemptions}</Badge>
          </Card>
        </>
      )}

      {tab === 'redemptions' && (
        <>
          <div className="mb-3">
            <Segmented
              options={[
                { value: 'pending', label: t('status_pending') },
                { value: 'approved', label: t('status_approved') },
                { value: 'completed', label: t('status_completed') },
                { value: 'all', label: t('see_all') },
              ]}
              value={statusFilter}
              onChange={setStatusFilter}
            />
          </div>
          <div className="col" style={{ gap: 'var(--sp-3)' }}>
            {(redemptions ?? []).map((r) => (
              <Card key={r.id} className="col" style={{ gap: 10 }}>
                <div className="row-between">
                  <div className="col" style={{ gap: 2 }}>
                    <span className="t-card-title">{locale === 'ar' ? r.name_ar : r.name_en}</span>
                    <span className="t-caption text-muted">{r.user_name || r.user_email}</span>
                  </div>
                  <Badge variant={r.status === 'pending' ? 'gold' : r.status === 'approved' ? 'info' : undefined}>{t(`status_${r.status}` as never)}</Badge>
                </div>
                <span className="t-caption tnum text-muted">
                  {r.points_cost} {t('points_unit')} · {new Date(r.requested_at).toLocaleDateString()} · {r.redemption_type}
                </span>
                {r.status === 'pending' && (
                  <div className="row" style={{ gap: 8 }}>
                    <Button size="sm" variant="outline" onClick={() => review(r.id, 'reject')}>{t('reject')}</Button>
                    <Button size="sm" variant="secondary" onClick={() => review(r.id, 'approve')}>{t('approve')}</Button>
                    <Button size="sm" onClick={() => review(r.id, 'complete')}>{t('complete_action')}</Button>
                  </div>
                )}
                {r.status === 'approved' && (
                  <Button size="sm" block onClick={() => review(r.id, 'complete')}>{t('complete_action')}</Button>
                )}
              </Card>
            ))}
            {redemptions && redemptions.length === 0 && (
              <p className="t-caption text-muted center mt-4">{t('empty_state_generic')}</p>
            )}
          </div>
        </>
      )}

      {tab === 'settings' && settings && (
        <Card className="col" style={{ gap: 'var(--sp-4)' }}>
          {settings
            .filter((s) => ['daily_points_cap', 'completion_edit_cutoff_hours', 'max_completions_per_day', 'app_version'].includes(s.key))
            .map((s) => (
              <div key={s.key} className="row-between">
                <span className="t-label text-muted" style={{ fontFamily: 'monospace' }}>{s.key}</span>
                <span className="t-label tnum">{s.value}</span>
              </div>
            ))}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--sp-4)' }}>
            <Field label={t('conversion_rate')}>
              <div className="row" style={{ gap: 8 }}>
                <Input
                  type="number"
                  min={1}
                  value={convValue || settings.find((s) => s.key === 'points_per_reward_unit')?.value || ''}
                  onChange={(e) => setConvValue(e.target.value)}
                />
                <Button onClick={saveConversion}>{t('save')}</Button>
              </div>
            </Field>
            <p className="t-caption text-muted">{t('reward_settings')} — 100 {t('points_unit')} = 1 unit</p>
          </div>
        </Card>
      )}
    </div>
  );
}
