import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.leqoehunt.app',
  appName: 'LeqoeHunt',
  webDir: 'www',
  server: {
    url: 'https://leqoehunt.my',
    cleartext: true
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    }
  }
};

export default config;