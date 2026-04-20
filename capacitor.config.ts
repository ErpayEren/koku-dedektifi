import type { CapacitorConfig } from '@capacitor/cli';

const isProd = process.env.NODE_ENV === 'production';

const config: CapacitorConfig = {
  appId: 'app.kokudedektifi.mobile',
  appName: 'Koku Dedektifi',
  webDir: 'public/capacitor-shell',
  server: {
    url: process.env.CAPACITOR_SERVER_URL || 'https://koku-dedektifi.vercel.app',
    cleartext: false,
    androidScheme: 'https',
  },
  android: {
    webContentsDebuggingEnabled: !isProd,
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: false,
      backgroundColor: '#0A0A0A',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0A0A0A',
      overlaysWebView: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
