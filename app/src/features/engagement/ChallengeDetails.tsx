import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Flag } from 'lucide-react';
import { api } from '../../api/client';
import { useI18n } from '../../i18n';
import { useToast } from '../../ui/components';
import { AppBar, Badge, Button, Card, ErrorState, ProgressBar, Skeleton } from '../../ui/components';

type ChallengeDetail = {
  id: string; name_en: string; name_ar: string; description_en: string; description_ar: string;
  icon: string; duration_days: number; target_days: number; points_bonus: number; difficulty: string;
  participation: { status: string; progress_days: number; joined_at: string } | null;
};

export default function ChallengeDetails() {
  const { t, locale } = useI18n();
  const toast = useToast();
  const navigate = useNavigate();
  const { id } = useParams();
  const [c, setC] = useState<ChallengeDetail | null>(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setError(false);
    try {
      const res = await api.get<{ challenge: ChallengeDetail }>(`/challenges/${id}`);
      setC(res.challenge);
    } catch {
      setError(true);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const join = async () => {
    setBusy(true);
    try {
      await api.post(`/challenges/${id}/join`);
      toast(t('challenge_joined') + ' 🎯', 'success');
      load();
    } catch {
      toast(t('err_generic'), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (error && !c) return <div className="page"><AppBar onBack={() => navigate(-1)} /><ErrorState onRetry={load} /></div>;

  return (
    <div className="page page-no-nav">
      <AppBar onBack={() => navigate(-1)} title={t('challenges')} />
      {!c ? (
        <div className="col mt-4" style={{ gap: 12 }}>
          <Skeleton h={120} r={20} />
          <Skeleton h={100} r={16} />
        </div>
      ) : (
        <>
          <Card gradient className="col mt-3" style={{ gap: 8, padding: 'var(--sp-5)' }}>
            <Flag size={28} />
            <h2 className="t-section" style={{ color: '#fff' }}>{locale === 'ar' ? c.name_ar : c.name_en}</h2>
            <p style={{ color: 'rgba(255,255,255,0.92)', fontSize: 14 }}>{locale === 'ar' ? c.description_ar : c.description_en}</p>
            <div className="row mt-2" style={{ gap: 8 }}>
              <Badge variant="gold">{c.duration_days} {t('days')}</Badge>
              <Badge variant="gold">+{c.points_bonus} {t('points_unit')}</Badge>
            </div>
          </Card>

          {c.participation ? (
            <Card className="col mt-4" style={{ gap: 10 }}>
              <div className="row-between">
                <span className="t-label" style={{ fontWeight: 700 }}>
                  {c.participation.status === 'completed' ? t('challenge_complete') : t('challenge_active')}
                </span>
                <Badge variant={c.participation.status === 'completed' ? undefined : 'info'}>
                  {t('challenge_progress', { done: c.participation.progress_days, target: c.target_days })}
                </Badge>
              </div>
              <ProgressBar value={Math.round((c.participation.progress_days / c.target_days) * 100)} />
              <span className="t-caption text-muted">
                {c.participation.status === 'completed'
                  ? t('challenge_success', { points: c.points_bonus })
                  : t('challenges_desc')}
              </span>
            </Card>
          ) : (
            <Button block size="lg" className="mt-5" loading={busy} onClick={join}>
              {t('challenge_join')}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
