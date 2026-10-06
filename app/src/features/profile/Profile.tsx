import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, ChevronRight, Crown, Gift, Globe, HelpCircle, LogOut, Moon, Palette, Pencil,
  Settings as SettingsIcon, Shield, ShieldCheck, Sparkles, Trophy, Download, Info,
} from 'lucide-react';
import { api } from '../../api/client';
import { useI18n } from '../../i18n';
import { useStore } from '../../state/store';
import { Badge, Button, Card, Modal } from '../../ui/components';

type WalletInfo = { available: number; redeemed: number };

export default function Profile() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const { user, level, unread, logout } = useStore();
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [joined, setJoined] = useState('');

  useEffect(() => {
    api.get<WalletInfo & { wallet: WalletInfo }>('/wallet').then((r) => setWallet((r as never as { wallet: WalletInfo }).wallet)).catch(() => {});
    if (user?.joined_at) {
      setJoined(new Date(user.joined_at).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'long' }));
    }
  }, [user?.joined_at, locale]);

  const initial = (user?.name || 'H').trim().charAt(0).toUpperCase();

  return (
    <div className="page">
      {/* Identity */}
      <div className="row mb-4" style={{ gap: 'var(--sp-4)', marginTop: 'var(--sp-3)' }}>
        <div className="avatar avatar-lg">{initial}</div>
        <div className="grow col" style={{ gap: 4 }}>
          <h1 className="t-section">{user?.name}</h1>
          <span className="t-caption text-muted" dir="ltr" style={{ textAlign: 'start' }}>{user?.email}</span>
          <div className="row" style={{ gap: 6 }}>
            {level && (
              <Badge>
                <Crown size={12} /> {t('level')} {level.level} · {level.name}
              </Badge>
            )}
            <Badge variant="muted" className="tnum">{user?.xp ?? 0} XP</Badge>
          </div>
        </div>
        <button className="btn-icon" aria-label={t('edit_profile')} onClick={() => navigate('/profile/edit')}>
          <Pencil size={17} />
        </button>
      </div>

      {/* Wallet summary */}
      <Card gold className="row-between" style={{ padding: 'var(--sp-4)' }} onClick={() => navigate('/wallet')}>
        <div className="col" style={{ gap: 2 }}>
          <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.85 }}>{t('total_points')}</span>
          <span className="tnum" style={{ fontSize: 26, fontWeight: 800 }}>{wallet?.available ?? '—'}</span>
        </div>
        <div className="col" style={{ gap: 2, alignItems: 'flex-end' }}>
          <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.85 }}>{t('total_rewards')}</span>
          <span className="tnum" style={{ fontSize: 20, fontWeight: 800 }}>{wallet?.redeemed ?? 0}</span>
        </div>
      </Card>

      {/* Stats quick row */}
      <div className="grid-2 mt-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <Card className="row" style={{ gap: 10 }} onClick={() => navigate('/achievements')}>
          <Trophy size={20} color="var(--primary)" />
          <span className="t-label" style={{ fontWeight: 600 }}>{t('achievements')}</span>
        </Card>
        <Card className="row" style={{ gap: 10 }} onClick={() => navigate('/challenges')}>
          <Sparkles size={20} color="var(--primary)" />
          <span className="t-label" style={{ fontWeight: 600 }}>{t('challenges')}</span>
        </Card>
      </div>

      <p className="t-caption text-muted mt-3">
        {t('joined')} {joined}
      </p>

      {/* Menu */}
      <Card className="col mt-4" style={{ padding: 'var(--sp-2) var(--sp-4)' }}>
        <MenuRow icon={<Bell size={19} />} label={t('notifications')} badge={unread} onClick={() => navigate('/notifications')} />
        <MenuRow icon={<Palette size={19} />} label={t('appearance')} onClick={() => navigate('/settings/appearance')} />
        <MenuRow icon={<Globe size={19} />} label={t('language')} value={locale === 'ar' ? 'العربية' : 'English'} onClick={() => navigate('/settings/language')} />
        <MenuRow icon={<SettingsIcon size={19} />} label={t('settings')} onClick={() => navigate('/settings')} />
      </Card>

      <Card className="col mt-3" style={{ padding: 'var(--sp-2) var(--sp-4)' }}>
        <MenuRow icon={<Shield size={19} />} label={t('privacy')} onClick={() => navigate('/settings/privacy')} />
        <MenuRow icon={<HelpCircle size={19} />} label={t('help')} onClick={() => navigate('/settings/help')} />
        <MenuRow icon={<Info size={19} />} label={t('about')} value={`v1.0.0-mvp`} />
      </Card>

      {user?.role === 'admin' && (
        <Card className="row mt-3" style={{ gap: 10, cursor: 'pointer' }} onClick={() => navigate('/admin')}>
          <ShieldCheck size={20} color="var(--primary)" />
          <span className="t-card-title grow">{t('admin')}</span>
          <ChevronRight size={16} color="var(--text-3)" style={{ transform: 'scaleX(var(--flip,1))' }} />
        </Card>
      )}

      <Button variant="outline" block className="mt-5" icon={<LogOut size={18} />} onClick={() => setConfirmLogout(true)}>
        {t('logout')}
      </Button>

      <Modal open={confirmLogout} onClose={() => setConfirmLogout(false)}>
        <p className="t-card-title" style={{ textAlign: 'center' }}>{t('logout_confirm')}</p>
        <div className="row mt-5">
          <Button variant="outline" block onClick={() => setConfirmLogout(false)}>{t('cancel')}</Button>
          <Button block onClick={() => { logout(); navigate('/login'); }}>{t('logout')}</Button>
        </div>
      </Modal>
    </div>
  );
}

function MenuRow({ icon, label, value, badge, onClick }: { icon: React.ReactNode; label: string; value?: string; badge?: number; onClick?: () => void }) {
  return (
    <div className="list-item" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <span style={{ color: 'var(--primary)' }}>{icon}</span>
      <span className="t-label grow" style={{ fontWeight: 600 }}>{label}</span>
      {badge ? <Badge variant="error">{badge}</Badge> : null}
      {value && <span className="t-caption text-muted">{value}</span>}
      {onClick && <ChevronRight size={16} color="var(--text-3)" style={{ transform: 'scaleX(var(--flip,1))' }} />}
    </div>
  );
}
