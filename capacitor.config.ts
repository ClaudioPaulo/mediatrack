import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // Identificador único da app nas lojas — não muda depois de publicares.
  // Convenção: domínio invertido. Ajusta para o teu domínio se tiveres um.
  appId: 'com.kaplacc.mediatrack',
  appName: 'MediaTrack',
  webDir: 'out', // pasta gerada por `next build` com output: 'export'
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      backgroundColor: '#0a0a0a',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0a0a0a',
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon',
      iconColor: '#3b82f6',
    },
  },
};

export default config;
