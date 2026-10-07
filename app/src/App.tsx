import React, { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { getToken } from './api/client';
import { I18nProvider } from './i18n';
import { ThemeProvider } from './theme/ThemeContext';
import { ToastProvider } from './ui/components';
import ErrorBoundary from './ui/ErrorBoundary';
import { AppStoreProvider, useStore } from './state/store';

import Splash from './features/onboarding/Splash';
import Onboarding from './features/onboarding/Onboarding';
import Login from './features/auth/Login';
import Register from './features/auth/Register';
import ForgotPassword from './features/auth/ForgotPassword';
import Personalization from './features/onboarding/Personalization';

import AppLayout from './layouts/AppLayout';
import Home from './features/home/Home';
import AllHabits from './features/habits/AllHabits';
import HabitForm from './features/habits/HabitForm';
import HabitDetails from './features/habits/HabitDetails';
import CalendarPage from './features/habits/CalendarPage';
import Wallet from './features/wallet/Wallet';
import Transactions from './features/wallet/Transactions';
import Rewards from './features/rewards/Rewards';
import RewardDetails from './features/rewards/RewardDetails';
import RedeemSuccess from './features/rewards/RedeemSuccess';
import RedemptionHistory from './features/rewards/RedemptionHistory';
import Statistics from './features/stats/Statistics';
import Achievements from './features/engagement/Achievements';
import Challenges from './features/engagement/Challenges';
import ChallengeDetails from './features/engagement/ChallengeDetails';
import Profile from './features/profile/Profile';
import EditProfile from './features/profile/EditProfile';
import Settings from './features/profile/Settings';
import Appearance from './features/profile/Appearance';
import LanguageSettings from './features/profile/LanguageSettings';
import NotificationSettings from './features/profile/NotificationSettings';
import PrivacyPage from './features/profile/PrivacyPage';
import HelpPage from './features/profile/HelpPage';
import NotificationsCenter from './features/profile/NotificationsCenter';
import AdminPage from './features/profile/AdminPage';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user } = useStore();
  const location = useLocation();
  if (!getToken()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
}

function Gate({ children }: { children: React.ReactNode }) {
  // Boot gate: brief splash while the cached session hydrates
  const [ready, setReady] = useState(false);
  const { user, refreshUser } = useStore();

  useEffect(() => {
    let done = false;
    const timer = setTimeout(() => {
      if (!done) {
        done = true;
        setReady(true);
      }
    }, 1400); // minimum splash time for brand moment
    if (getToken()) {
      refreshUser().finally(() => {
        if (!done) {
          done = true;
          clearTimeout(timer);
          setTimeout(() => setReady(true), 600);
        }
      });
    }
    return () => clearTimeout(timer);
  }, [refreshUser]);

  if (!ready) return <Splash />;
  if (user && !user.onboarded) return <Navigate to="/personalization" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <I18nProvider>
      <ThemeProvider>
        <ToastProvider>
          <AppStoreProvider>
            <ErrorBoundary>
              <div className="app-frame">
              <Routes>
                {/* Public */}
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot" element={<ForgotPassword />} />
                <Route path="/personalization" element={<Personalization />} />

                {/* Authed app */}
                <Route
                  path="/"
                  element={
                    <RequireAuth>
                      <Gate>
                        <AppLayout />
                      </Gate>
                    </RequireAuth>
                  }
                >
                  <Route index element={<Home />} />
                  <Route path="habits" element={<AllHabits />} />
                  <Route path="habits/new" element={<HabitForm />} />
                  <Route path="habits/:id" element={<HabitDetails />} />
                  <Route path="habits/:id/edit" element={<HabitForm />} />
                  <Route path="calendar" element={<CalendarPage />} />
                  <Route path="wallet" element={<Wallet />} />
                  <Route path="wallet/transactions" element={<Transactions />} />
                  <Route path="rewards" element={<Rewards />} />
                  <Route path="rewards/history" element={<RedemptionHistory />} />
                  <Route path="rewards/:id" element={<RewardDetails />} />
                  <Route path="rewards/:id/success" element={<RedeemSuccess />} />
                  <Route path="stats" element={<Statistics />} />
                  <Route path="achievements" element={<Achievements />} />
                  <Route path="challenges" element={<Challenges />} />
                  <Route path="challenges/:id" element={<ChallengeDetails />} />
                  <Route path="profile" element={<Profile />} />
                  <Route path="profile/edit" element={<EditProfile />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="settings/appearance" element={<Appearance />} />
                  <Route path="settings/language" element={<LanguageSettings />} />
                  <Route path="settings/notifications" element={<NotificationSettings />} />
                  <Route path="settings/privacy" element={<PrivacyPage />} />
                  <Route path="settings/help" element={<HelpPage />} />
                  <Route path="notifications" element={<NotificationsCenter />} />
                  <Route path="admin" element={<AdminPage />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
              </div>
            </ErrorBoundary>
          </AppStoreProvider>
        </ToastProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}
