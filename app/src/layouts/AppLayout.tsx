import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Gift, Home, Plus, User, ListChecks, WifiOff } from 'lucide-react';
import { useI18n } from '../i18n';
import { useStore } from '../state/store';

const TABS = [
  { path: '/', icon: Home, key: 'nav_home' },
  { path: '/habits', icon: ListChecks, key: 'nav_habits' },
  { path: '/add', icon: Plus, key: 'nav_add' },
  { path: '/rewards', icon: Gift, key: 'nav_rewards' },
  { path: '/profile', icon: User, key: 'nav_profile' },
] as const;

export default function AppLayout() {
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const { online } = useStore();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  // Screens with their own fixed primary CTA — hide the FAB so they never overlap
  const hideFab = /^\/rewards\/[^/]+$/.test(location.pathname);

  return (
    <>
      {!online && (
        <div
          className="t-caption center"
          style={{
            position: 'sticky', top: 0, zIndex: 45,
            background: 'var(--warning)', color: '#3D2A00',
            padding: '8px 16px', fontWeight: 600, gap: 6,
          }}
          role="status"
        >
          <WifiOff size={14} /> {t('offline_banner')}
        </div>
      )}
      <Outlet />
      <nav className="bottom-nav" aria-label="Main">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          if (tab.path === '/add') {
            if (hideFab) return <span key="add-slot" aria-hidden />;
            return (
              <button key="add" className="fab" aria-label={t('nav_add')} onClick={() => navigate('/habits/new')}>
                <Plus size={26} strokeWidth={2.6} />
              </button>
            );
          }
          return (
            <button
              key={tab.path}
              className={`bottom-nav-item ${isActive(tab.path) ? 'is-active' : ''}`}
              onClick={() => navigate(tab.path)}
            >
              <Icon />
              <span>{t(tab.key)}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
