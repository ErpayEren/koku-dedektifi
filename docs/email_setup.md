# Email Setup — SPF/DKIM ve Şifre Sıfırlama

Bu doküman Koku Dedektifi'nin transactional email altyapısını kurmak için gereken adımları açıklar.

---

## 1. Neden Email Gerekli?

- **Şifre sıfırlama:** Kullanıcı "Şifremi unuttum" tıkladığında reset link gönderilmesi.
- **Magic link giriş:** (Opsiyonel) Şifresiz giriş akışı.
- **Hesap doğrulama:** Kayıt sonrası email doğrulaması.
- **Play Store gereği:** Hesap silme akışı email onayı istenebilir.

---

## 2. Önerilen Email Sağlayıcıları

| Sağlayıcı | Ücretsiz Limit | Kurulum Zorluğu |
|-----------|---------------|-----------------|
| [Resend](https://resend.com) | 3.000/ay | Çok Kolay |
| [Postmark](https://postmarkapp.com) | 100/ay (dev) | Kolay |
| [Brevo (SendinBlue)](https://www.brevo.com) | 300/gün | Orta |

**Tavsiye: Resend** — Next.js projeleri için native SDK var, DNS kurulumu basit.

---

## 3. Resend Kurulumu

### 3.1 Hesap ve API Key

1. [resend.com](https://resend.com) üzerinden hesap aç.
2. **API Keys** → **Create API Key** → izin: `Sending access`.
3. `.env.local` dosyasına ekle:

```
EMAIL_FROM=noreply@kokudedektifi.com
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_xxxxxxxxxxxx
```

### 3.2 Domain Doğrulama

Resend Dashboard → **Domains** → Add Domain → `kokudedektifi.com`

DNS panelinde şu kayıtları ekle:

**SPF (TXT kaydı):**
```
Name: @
Value: v=spf1 include:spf.resend.com ~all
TTL: 3600
```

**DKIM (TXT kaydı) — Resend sana 3 tane verir:**
```
Name: resend._domainkey
Value: (Resend dashboard'dan kopyala)
TTL: 3600
```

**DMARC (TXT kaydı):**
```
Name: _dmarc
Value: v=DMARC1; p=quarantine; rua=mailto:dmarc@kokudedektifi.com
TTL: 3600
```

DNS yayılması 10-30 dakika sürer. Resend dashboard'da "Verified" görene kadar bekle.

---

## 4. Şifre Sıfırlama Akışı

Kod tabanında şifre sıfırlama şu an **no-op** durumda (`EMAIL_FROM` env yoksa başarı döner ama email gönderilmez).

Email sağlayıcısı kurulduktan sonra `api_internal/auth.js` içindeki `forgotPassword` fonksiyonuna şu akışı ekle:

```javascript
// api_internal/auth.js — forgotPassword fonksiyonu içinde

const resetToken = createToken(); // 32-byte random
const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 saat

// Store reset token in Supabase password_resets table
await supabase.from('password_resets').upsert({
  user_id: user.id,
  token_hash: hashSha256(resetToken),
  expires_at: expiresAt,
  used: false,
});

const resetUrl = `https://kokudedektifi.com/sifre-sifirla/onayla?token=${resetToken}`;

// Send via Resend
await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
  },
  body: JSON.stringify({
    from: process.env.EMAIL_FROM,
    to: user.email,
    subject: 'Koku Dedektifi — Şifre Sıfırlama',
    html: `<p>Şifre sıfırlama bağlantın: <a href="${resetUrl}">${resetUrl}</a></p><p>Bu bağlantı 1 saat geçerlidir.</p>`,
  }),
});
```

Supabase migration (eklenecek):
```sql
create table if not exists public.password_resets (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  token_hash text not null,
  expires_at timestamptz not null,
  used boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.password_resets (user_id);
create index on public.password_resets (token_hash) where not used;
```

---

## 5. Gmail / Outlook Spam Testi

Email kurulduktan sonra şu testleri yap:

1. **mail-tester.com** — 10/10 skor hedefle.
2. **MXToolbox SPF Lookup** — `spf.resend.com` görünmeli.
3. **Google Postmaster Tools** — domain reputation izle.
4. Test gönderimi: Gmail (inbox), iCloud (inbox), Outlook (inbox) — hepsinde gelen kutusu olmalı.

---

## 6. .env Referansı

```bash
# Email (Resend)
EMAIL_FROM=noreply@kokudedektifi.com
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_xxxxxxxxxxxx

# Alternatif: Postmark
# EMAIL_PROVIDER=postmark
# POSTMARK_SERVER_TOKEN=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

---

## 7. Play Store Zorunluluğu

Google Play hesap silme politikası gereği (Kasım 2023'ten itibaren zorunlu):
- Uygulama içinde "Hesabı Sil" seçeneği olmalı ✓ (zaten `/hesap` sayfasında var)
- Hesap silme işlemi kullanıcının tüm verilerini temizlemeli ✓ (Supabase cascade silme)
- Silme işlemi onaylandıktan sonra 30 gün içinde tamamlanmalı

Bu gereksinimler karşılanıyor.
