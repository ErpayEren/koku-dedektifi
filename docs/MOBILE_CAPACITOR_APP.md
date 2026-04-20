# Koku Dedektifi Mobile Shell

## Mimari

Koku Dedektifi mobil uygulaması, premium Next.js arayüzünü kaynak gerçeklik olarak koruyan bir Capacitor shell mimarisiyle paketlenir.

- Web uygulaması: Next.js App Router + Tailwind + Framer Motion
- Mobil shell: Capacitor
- Native temas noktaları: Camera, Push Notifications, Haptics, Splash Screen, Status Bar, Network
- Sunum modeli: canlı üretim URL'sini WebView içinde açan premium shell

## Klasör Yapısı

```text
app/
components/
  mobile/
    MobileAppBridge.tsx
    MobileTabBar.tsx
lib/
  mobile/
    capacitor.ts
    useNativeShell.ts
public/
  capacitor-shell/
    index.html
resources/
  logo.svg
  splash.svg
capacitor.config.ts
```

## Native Entegrasyonlar

- Kamera ve galeri seçimi: `@capacitor/camera`
- Haptic feedback: `@capacitor/haptics`
- Push notifications: `@capacitor/push-notifications`
- Splash screen: `@capacitor/splash-screen`
- Status bar: `@capacitor/status-bar`
- Ağ durumu takibi: `@capacitor/network`

## Android APK Build

1. Web bağımlılıklarını kur:
   `npm install`
2. Java 21 kurulu olsun. Capacitor Android toolchain bunu bekler.
3. Android SDK yolunu tanımla:
   - `ANDROID_HOME`
   - `ANDROID_SDK_ROOT`
   - veya `android/local.properties` içine `sdk.dir=...`
4. Android shell'i oluştur:
   `npm run mobile:add:android`
5. Uygulama ikonları ve splash asset'lerini üret:
   `npm run mobile:assets`
6. Capacitor sync:
   `npm run mobile:sync`
7. Android Studio'yu aç:
   `npm run mobile:open:android`
8. Android Studio içinde:
   - `Build > Build Bundle(s) / APK(s) > Build APK(s)`
   - veya `Generate Signed Bundle / APK`

## iOS Build

iOS build için macOS + Xcode gerekir.

1. macOS ortamında repo'yu aç.
2. `npm install`
3. `npx cap add ios`
4. `npm run mobile:assets`
5. `npm run mobile:sync`
6. `npx cap open ios`
7. Xcode içinde signing ayarla ve archive al.

## Notlar

- Shell uzak URL ile çalıştığı için canlı Next.js deneyimi tasarım kaybı olmadan korunur.
- `MobileAppBridge` yalnızca native shell içinde devreye girer; web deneyimi etkilenmez.
- Offline durumda uygulama üstünde premium bir bağlantı durumu katmanı görünür.
