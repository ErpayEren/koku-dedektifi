# Koku Dedektifi Flutter App

Bu klasor, mevcut web uygulamani mobilde Flutter WebView ile calistirir.

## Nasil Calistirirsin

1. Proje kokunden Flutter wrapper'i kontrol et:

```powershell
..\flutterw.cmd --version
```

2. Bu klasore gir:

```powershell
cd mobile_flutter
```

3. Gerekenleri kur:

```powershell
..\flutterw.cmd pub get
```

4. Android cihaz veya emulator:

```powershell
..\flutterw.cmd run -d android
```

5. iOS (macOS tarafinda):

```powershell
..\flutterw.cmd run -d ios
```

## URL Degistirme

Varsayilan URL:

`https://koku-dedektifi.vercel.app`

Farkli URL ile calistirmak istersen:

```powershell
..\flutterw.cmd run --dart-define=APP_URL=https://senin-urlin.com
```

## Mobil Gelir Modeli (Prelaunch Iskeleti)

Mobil satin alma akisinin iskeleti hazir, ancak varsayilan olarak kapali:

```powershell
..\flutterw.cmd run `
  --dart-define=MOBILE_BILLING_ENABLED=false `
  --dart-define=MOBILE_BILLING_PROVIDER=none
```

Canliya yakin testte acmak icin:

```powershell
..\flutterw.cmd run `
  --dart-define=MOBILE_BILLING_ENABLED=true `
  --dart-define=MOBILE_BILLING_PROVIDER=revenuecat `
  --dart-define=MOBILE_REVENUECAT_PUBLIC_SDK_KEY=rc_public_xxx `
  --dart-define=MOBILE_PAYWALL_URL=https://koku-dedektifi.vercel.app/pricing.html
```

Desteklenen provider degerleri:

- `revenuecat`
- `adapty`
- `native_iap`

Not: Bu asamada wrapper sadece bridge + yonlendirme altyapisini saglar. Gercek SDK entegrasyonu (RevenueCat/Adapty) launch oncesi son adimda acilmalidir.

## Release Hazirlik (Android)

1. Otomatik kurulum scripti ile signing dosyalarini olustur:

```powershell
.\scripts\setup_android_signing.ps1 -StorePassword "guclu_sifre"
```

Bu komut:

- `keystore/upload-keystore.jks` olusturur
- `android/key.properties` dosyasini yazar

2. Manuel kurmak istersen `android/key.properties.example` dosyasini kopyala:

```powershell
Copy-Item .\android\key.properties.example .\android\key.properties
```

3. Uretim paketini tek komutla al:

```powershell
.\scripts\release_android.ps1
```

4. Alternatif olarak dogrudan App Bundle al:

```powershell
..\flutterw.cmd build appbundle --release
```

Not:

- `android/key.properties` veya keystore eksikse release build artik bilerek hata verir.
- Bu sayede yanlislikla debug key ile Play Console'a cikma riski kapanir.
- Gecici lokal deneme icin debug release istiyorsan:

```powershell
$env:ORG_GRADLE_PROJECT_allowDebugReleaseSigning="true"
..\flutterw.cmd build appbundle --release
Remove-Item Env:ORG_GRADLE_PROJECT_allowDebugReleaseSigning
```

## Notlar

- Uygulama web akisina birebir baglidir.
- Geri tusu once WebView gecmisinde gezer.
- Harici linkler (farkli domain, mailto, tel) sistem uygulamasinda acilir.
- Yukleme ilerleme cizgisi ve hata durumunda tekrar dene akisi vardir.
