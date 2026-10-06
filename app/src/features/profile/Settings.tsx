import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useI18n } from '../../i18n';
import type { TranslationKey } from '../../i18n/en';
import { useStore } from '../../state/store';
import { useToast } from '../../ui/components';
import { AppBar, Button, Card, Field, Input, Modal, Switch } from '../../ui/components';

type Row = {
  key: string;
  icon: React.ReactNode;
  label: TranslationKey;
  route?: string;
  toggle?: boolean;
  danger?: boolean;
};

/** Settings hub (spec section 57) + appearance/language/notification toggles. */
export default function Settings() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const toast = useToast();
  const { user, refreshUser, logout } = useStore();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const settings = user?.settings;
  const notifOn = settings ? !!settings.notifications_enabled : true;
  const remindersOn = settings ? !!settings.reminders_enabled : true;

  const saveSetting = async (patch: Record<string, boolean>) => {
    try {
      await api.put('/users/me/settings', patch);
      await refreshUser();
    } catch {
      toast(t('err_generic'), 'error');
    }
  };

  const doDelete = async () => {
    setConfirmDelete(false);
    try {
      await api.del('/users/me');
      logout();
      navigate('/login');
    } catch {
      toast(t('err_generic'), 'error');
    }
  };

  const doExport = async () => {
    try {
      const res = await api.get<Record<string, unknown>>('/users/me/export');
      const blob = new Blob([JSON.stringify(res, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'habitgo-export.json';
      a.click();
      URL.revokeObjectURL(url);
      toast(t('export_ready'), 'success');
    } catch {
      toast(t('err_generic'), 'error');
    }
  };

  return (
    <div className="page page-no-nav">
      <AppBar onBack={() => navigate(-1)} title={t('settings')} />

      <Card className="col mt-3" style={{ padding: 'var(--sp-2) var(--sp-4)' }}>
        <div className="list-item">
          <span className="t-label grow" style={{ fontWeight: 600 }}>{t('enable_notifications')}</span>
          <Switch checked={notifOn} onChange={(v) => saveSetting({ notifications_enabled: v })} label={t('enable_notifications')} />
        </div>
        <div className="list-item">
          <span className="t-label grow" style={{ fontWeight: 600 }}>{t('enable_reminders')}</span>
          <Switch checked={remindersOn} onChange={(v) => saveSetting({ reminders_enabled: v })} label={t('enable_reminders')} />
        </div>
        <div className="list-item" onClick={() => navigate('/settings/notifications')} style={{ cursor: 'pointer' }}>
          <span className="t-label grow" style={{ fontWeight: 600 }}>{t('notification_settings')}</span>
          <span className="t-caption text-muted">›</span>
        </div>
      </Card>

      <Card className="col mt-3" style={{ padding: 'var(--sp-2) var(--sp-4)' }}>
        <div className="list-item" onClick={() => navigate('/settings/appearance')} style={{ cursor: 'pointer' }}>
          <span className="t-label grow" style={{ fontWeight: 600 }}>{t('appearance')}</span>
          <span className="t-caption text-muted">{t(settings?.theme === 'dark' ? 'theme_dark' : settings?.theme === 'light' ? 'theme_light' : 'theme_system')}</span>
        </div>
        <div className="list-item" onClick={() => navigate('/settings/language')} style={{ cursor: 'pointer' }}>
          <span className="t-label grow" style={{ fontWeight: 600 }}>{t('language')}</span>
          <span className="t-caption text-muted">{user?.settings?.locale === 'en' ? 'English' : 'العربية'}</span>
        </div>
        <div className="list-item" onClick={() => navigate('/profile/edit')} style={{ cursor: 'pointer' }}>
          <span className="t-label grow" style={{ fontWeight: 600 }}>{t('account')}</span>
          <span className="t-caption text-muted">›</span>
        </div>
      </Card>

      <Card className="col mt-3" style={{ padding: 'var(--sp-2) var(--sp-4)' }}>
        <div className="list-item" onClick={doExport} style={{ cursor: 'pointer' }}>
          <span className="t-label grow" style={{ fontWeight: 600 }}>{t('data_export')}</span>
          <span className="t-caption text-muted">⬇</span>
        </div>
        <div className="list-item" onClick={() => navigate('/settings/privacy')} style={{ cursor: 'pointer' }}>
          <span className="t-label grow" style={{ fontWeight: 600 }}>{t('privacy')}</span>
          <span className="t-caption text-muted">›</span>
        </div>
        <div className="list-item" onClick={() => navigate('/settings/help')} style={{ cursor: 'pointer' }}>
          <span className="t-label grow" style={{ fontWeight: 600 }}>{t('help')}</span>
          <span className="t-caption text-muted">›</span>
        </div>
      </Card>

      <Card className="col mt-3" style={{ padding: 'var(--sp-2) var(--sp-4)' }}>
        <div className="list-item" style={{ cursor: 'pointer' }} onClick={() => navigate('/forgot')}>
          <span className="t-label grow" style={{ fontWeight: 600 }}>{t('change_password')}</span>
          <span className="t-caption text-muted">›</span>
        </div>
        <div className="list-item" style={{ cursor: 'pointer' }} onClick={() => setConfirmDelete(true)}>
          <span className="t-label grow" style={{ fontWeight: 600, color: 'var(--error)' }}>{t('delete_account')}</span>
        </div>
      </Card>
      <p className="t-caption text-faint center mt-4">HabitGo v1.0.0-mvp</p>

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <p className="t-card-title" style={{ textAlign: 'center' }}>{t('delete_account_confirm')}</p>
        <div className="row mt-5">
          <Button variant="outline" block onClick={() => setConfirmDelete(false)}>{t('cancel')}</Button>
          <Button variant="danger" block onClick={doDelete}>{t('delete_account_cta')}</Button>
        </div>
      </Modal>
    </div>
  );
}
