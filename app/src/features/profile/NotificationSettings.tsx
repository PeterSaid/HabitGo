import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useI18n } from '../../i18n';
import { useStore } from '../../state/store';
import { useToast } from '../../ui/components';
import { AppBar, Card, Switch } from '../../ui/components';

export default function NotificationSettings() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const toast = useToast();
  const { user, refreshUser } = useStore();
  const s = user?.settings;

  const save = async (patch: Record<string, boolean>) => {
    try {
      await api.put('/users/me/settings', patch);
      await refreshUser();
      toast(t('saved'), 'success');
    } catch {
      toast(t('err_generic'), 'error');
    }
  };

  return (
    <div className="page page-no-nav">
      <AppBar onBack={() => navigate(-1)} title={t('notification_settings')} />
      <Card className="col mt-3" style={{ padding: 'var(--sp-2) var(--sp-4)' }}>
        <div className="list-item">
          <div className="grow col" style={{ gap: 2 }}>
            <span className="t-label" style={{ fontWeight: 600 }}>{t('enable_notifications')}</span>
            <span className="t-caption text-muted">{t('notif_system')}</span>
          </div>
          <Switch checked={!!s?.notifications_enabled} onChange={(v) => save({ notifications_enabled: v })} label={t('enable_notifications')} />
        </div>
        <div className="list-item">
          <div className="grow col" style={{ gap: 2 }}>
            <span className="t-label" style={{ fontWeight: 600 }}>{t('enable_reminders')}</span>
            <span className="t-caption text-muted">{t('reminder')}</span>
          </div>
          <Switch checked={!!s?.reminders_enabled} onChange={(v) => save({ reminders_enabled: v })} label={t('enable_reminders')} />
        </div>
        <div className="list-item">
          <div className="grow col" style={{ gap: 2 }}>
            <span className="t-label" style={{ fontWeight: 600 }}>{t('weekly_report_setting')}</span>
            <span className="t-caption text-muted">{t('weekly_progress')}</span>
          </div>
          <Switch checked={!!s?.weekly_report} onChange={(v) => save({ weekly_report: v })} label={t('weekly_report_setting')} />
        </div>
      </Card>
    </div>
  );
}
