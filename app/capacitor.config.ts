import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.habitgo.app',
  appName: 'HabitGo',
  webDir: 'dist',
  // Live-shell mode: the app always loads the deployed web app from Render,
  // so UI updates reach installed APKs instantly on next open (no re-download).
  // Trade-off: the app needs internet to open (no offline mode).
  server: {
    androidScheme: 'https',
    url: 'https://habitgo-rc6a.onrender.com',
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_icon',
      iconColor: '#22C55E',
    },
  },
};

export default config;
