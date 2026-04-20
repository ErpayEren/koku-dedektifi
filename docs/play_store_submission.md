# Play Store Submission Kılavuzu — Koku Dedektifi

> Bu dosya Play Store'a gönderim için gerekli tüm içerik ve asset listesini içerir.
> Gönderimden önce her maddeyi kontrol et.

---

## 1. Uygulama Kimliği

| Alan | Değer |
|------|-------|
| Package Name | `app.kokudedektifi.mobile` |
| App Name | `Koku Dedektifi` |
| versionCode | `5` |
| versionName | `1.0.0` |

---

## 2. Store Listing

### Kısa Açıklama (80 karakter max)
```
Parfüm şişeni fotoğrafla, anında moleküler analiz al. AI destekli.
```

### Tam Açıklama (4000 karakter max)
```
Koku Dedektifi — Parfüm Analiz Uygulaması

Elindeki parfümün gerçekte nelerden oluştuğunu merak ettiniz mi? Koku Dedektifi, yapay zeka destekli görüntü analizi ve geniş molekül veritabanıyla parfüm şişenizin tam içeriğini saniyeler içinde ortaya çıkarır.

🔬 NASIL ÇALIŞIR?
• Parfüm şişenizin fotoğrafını çekin
• Yapay zekamız etiket ve şişe tasarımını analiz eder
• Üst, kalp ve dip notalar ile moleküler bileşenler anında ortaya çıkar
• Confidence skoru ile tahminin ne kadar güvenilir olduğunu görün

📊 ÖZELLİKLER
• Fotoğraf, metin veya barkod ile analiz
• Detaylı nota piramidi (üst / kalp / dip)
• Kanıt seviyeleri: Doğrulanmış bileşen, nota eşleşmesi, tahminî
• Benzer parfümler önerileri
• Analiz geçmişi ve gardırop
• Paylaşılabilir analiz bağlantıları

🔍 KEŞFEDİN
• Binlerce parfüm veritabanı
• Trend ve popüler parfümler
• Marka, sezon, yoğunluk, cinsiyet filtrelemeleri
• Kişiselleştirilmiş öneriler

🔐 GİZLİLİK
Fotoğraflarınız yalnızca analiz için işlenir; depolanmaz. Hesap oluşturmak isteğe bağlıdır. Gizlilik Politikamız: https://kokudedektifi.app/gizlilik

---
Pro üyelik ile sınırsız analiz ve tüm benzer parfüm önerileri açılır.
```

---

## 3. Görseller ve Assetler

### App Icon
- Boyut: 512×512 PNG (şeffaf arka plan yok, düz renk)
- Adaptive icon: `android/app/src/main/res/mipmap-*/ic_launcher.png` + `ic_launcher_foreground.png`
- Arka plan rengi: `#0A0A0A`
- Foreground: Logo (merkezi, %66 güvenli alan içinde)

### Feature Graphic
- Boyut: 1024×500 PNG veya JPG
- İçerik: Dark background, parfüm analiz UI ekranı, "AI ile Parfüm Analizi" başlığı

### Ekran Görüntüleri (Zorunlu: min 2, max 8)
Pixel 7 Pro boyutu önerilir: **1080×2400** veya **1440×3120**

| # | Ekran | Açıklama |
|---|-------|----------|
| 1 | Ana ekran | Hero fotoğraf modu, CTA butonu |
| 2 | Analiz sonucu | Nota piramidi + confidence ring |
| 3 | Moleküler profil | Kanıt seviyeleri badge'leri |
| 4 | Keşfet sayfası | Search + trend kartları |
| 5 | Gardırop | Kayıtlı parfüm koleksiyonu |
| 6 | Paylaşım | Analiz paylaşım ekranı |

---

## 4. Gizlilik Politikası ve Yasal

- **Privacy Policy URL (zorunlu):** `https://kokudedektifi.app/gizlilik`
- **Terms of Service URL:** `https://kokudedektifi.app/kullanim-kosullari`
- Bu URL'ler Play Store gönderimi sırasında **canlı ve erişilebilir** olmalı.

---

## 5. İçerik Derecelendirmesi (Content Rating)

Questionnaire cevapları:

| Soru | Cevap |
|------|-------|
| Şiddet içeriği | Yok |
| Cinsel içerik | Yok |
| Küfür / kaba dil | Yok |
| Uyuşturucu referansı | Yok (parfüm = alkol bazlı ürün, DİKKAT: "parfüm" kategorisi seç) |
| Kullanıcı etkileşimi (UGC) | Yok (analizler paylaşılıyor ama UGC platformu değil) |
| Konum erişimi | Yok |
| Kamera erişimi | Var (parfüm analizi için) |

Beklenen derecelendirme: **Herkes (E)**

---

## 6. Data Safety Formu

### Toplanan Veriler

| Veri Türü | Toplanıyor mu? | Paylaşılan? | Şifreli mi? | Sıfırlanabilir mi? |
|-----------|---------------|-------------|-------------|---------------------|
| E-posta adresi | Evet (opsiyonel, hesap) | Hayır | Evet | Evet |
| Analiz verileri (metin) | Evet (analiz geçmişi) | Hayır | Evet | Evet |
| Fotoğraf/Kamera | Geçici (sadece analiz için) | Analiz API'ye gönderilir | Evet (HTTPS) | Saklanmaz |
| Kullanım verileri | Evet (crash reports via Sentry) | Sentry (üçüncü parti) | Evet | Evet |
| Cihaz ID | Hayır | — | — | — |
| Konum | Hayır | — | — | — |
| Finansal | Hayır | — | — | — |

### Üçüncü Taraf SDK'lar
- **Sentry.io** — crash reporting ve performance monitoring
- **Supabase** — backend, database, auth (sunucular AB/US)
- **Google Gemini API** — görüntü analizi (fotoğraf geçici olarak işlenir)

---

## 7. Release Track'i

1. **Internal Testing** — 5 test cihazı, smoke test
2. **Closed Testing (Alpha)** — 20-50 kullanıcı, feedback
3. **Open Testing (Beta)** — geniş beta
4. **Production** — lansman

---

## 8. Keystore Oluşturma (Bir Kez Yap)

```bash
# Android keystore oluştur
keytool -genkey -v \
  -keystore android/keystore/release.jks \
  -alias koku-dedektifi \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

# SHA-1 fingerprint al (Firebase/Google için)
keytool -list -v \
  -keystore android/keystore/release.jks \
  -alias koku-dedektifi

# SHA-256 fingerprint al (Play App Signing)
keytool -list -v \
  -keystore android/keystore/release.jks \
  -alias koku-dedektifi | grep SHA256
```

**UYARI:** `android/keystore/release.jks` dosyasını **asla** git'e commit etme!
`.gitignore`'da `*.jks` ve `android/keystore/` zaten ekli.

### Ortam Değişkenleri (CI/CD için)
```env
KEYSTORE_PATH=android/keystore/release.jks
KEYSTORE_STORE_PASSWORD=<güvenli_şifre>
KEYSTORE_KEY_ALIAS=koku-dedektifi
KEYSTORE_KEY_PASSWORD=<güvenli_şifre>
```

---

## 9. Release Build

```bash
# 1. Web build
npm run build

# 2. Capacitor sync
npx cap sync android

# 3. Release AAB oluştur
cd android
./gradlew bundleRelease

# Çıktı: android/app/build/outputs/bundle/release/app-release.aab
```

---

## 10. Pre-Submission Checklist

- [ ] `versionCode` artırıldı (her upload için benzersiz olmalı)
- [ ] `versionName` semantik sürüm (örn. `1.0.0`)
- [ ] Keystore şifreleri güvenli saklandı
- [ ] Privacy Policy URL canlı ve erişilebilir
- [ ] App Icon 512×512 PNG hazır
- [ ] Feature Graphic 1024×500 hazır
- [ ] Min 2 screenshot hazır
- [ ] Data Safety formu dolduruldu
- [ ] Content rating questionnaire tamamlandı
- [ ] Internal test APK 3 cihazda çalıştı (crash yok)
- [ ] `npm run build` temiz geçti
- [ ] ProGuard/R8 aktif (release build'de minifyEnabled=true)
