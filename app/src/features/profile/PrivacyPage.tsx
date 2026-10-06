import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../i18n';
import { AppBar, Card, Button } from '../../ui/components';
import { api } from '../../api/client';
import { useToast } from '../../ui/components';

export default function PrivacyPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const toast = useToast();

  const exportData = async () => {
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
      <AppBar onBack={() => navigate(-1)} title={t('privacy')} />
      <Card className="col mt-3" style={{ gap: 10 }}>
        <h3 className="t-card-title">{t('privacy')}</h3>
        <p className="t-body text-muted">{t('privacy_desc')}</p>
        <p className="t-caption text-faint">{t('privacy_placeholder_note')}</p>
      </Card>
      <Card className="col mt-3" style={{ gap: 10 }}>
        <h3 className="t-card-title">{t('security')}</h3>
        <p className="t-body text-muted">{t('security_desc')}</p>
      </Card>
      <Button variant="outline" block className="mt-5" onClick={exportData}>
        {t('data_export')}
      </Button>
    </div>
  );
}
