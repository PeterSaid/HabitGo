import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.habitgo.app',
  appName: 'HabitGo',
  webDir: 'dist',
  // Point the native app at a hosted API (or LAN IP) instead of the emulator loopback.
  // For local testing with an Android emulator the backend runs on your machine:
  //   10.0.2.2 is the emulator's alias for the host's localhost.
  server: {
    androidScheme: 'https',
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_icon',
      iconColor: '#22C55E',
    },
  },
};

export default config;
