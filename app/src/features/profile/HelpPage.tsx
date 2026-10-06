import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../i18n';
import { AppBar, Card } from '../../ui/components';

export default function HelpPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  return (
    <div className="page page-no-nav">
      <AppBar onBack={() => navigate(-1)} title={t('help')} />
      <Card className="col mt-3" style={{ gap: 10 }}>
        <h3 className="t-card-title">{t('app_name')}</h3>
        <p className="t-body text-muted">{t('help_desc')}</p>
        <p className="t-caption text-faint" dir="ltr">support@habitgo.app</p>
      </Card>
      <Card className="col mt-3" style={{ gap: 8 }}>
        <h3 className="t-card-title">{t('about')}</h3>
        <div className="row-between">
          <span className="t-label text-muted">{t('about_version')}</span>
          <span className="t-label tnum">1.0.0-mvp</span>
        </div>
        <div className="row-between">
          <span className="t-label text-muted">{t('tagline').split('\n')[0]}</span>
        </div>
      </Card>
    </div>
  );
}
