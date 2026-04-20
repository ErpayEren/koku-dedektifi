import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.kokudedektifi.mobile',
  appName: 'Koku Dedektifi',
  webDir: 'public/capacitor-shell',
  server: {
    url: process.env.CAPACITOR_SERVER_URL || 'https://koku-dedektifi.vercel.app',
    cleartext: false,
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#09080A',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
