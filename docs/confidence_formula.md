# Confidence Score Formülü

> Bu döküman, Koku Dedektifi parfüm analizinin `confidenceScore` alanının nasıl hesaplandığını açıklar.

---

## Genel Bakış

`confidenceScore` değeri **0–100** arasında bir tam sayıdır. Dört bileşenin toplamından oluşur:

```
confidenceScore = clamp(
  identityBonus + pyramidBonus + moleculeBonus + modeBonus,
  0, 100
)
```

---

## Bileşenler

### 1. `identityBonus` — Kimlik Eşleşmesi (0–40 puan)

Kullanıcı girdisinin veritabanındaki parfümle ne kadar eşleştiğini ölçer.

```
identityBonus = round(contextMatchScore × 40)
```

`contextMatchScore` (0.0–1.0), aşağıdaki kriterlere göre hesaplanır:
- Tam isim+marka eşleşmesi → 1.0
- Sadece isim eşleşmesi → 0.88
- Token overlap oranı → overlap_count / query_token_count

**Örnekler:**
| Girdi | Eşleşen | contextMatchScore | identityBonus |
|---|---|---|---|
| "Dior Sauvage" | Sauvage (Dior) | 1.0 | 40 |
| "sauvage" | Sauvage (Dior) | 0.88 | 35 |
| "lavanta temiz taze" | — | 0.0 | 0 |

---

### 2. `pyramidBonus` — Koku Piramidi Doluluk (0–20 puan)

Nota piramidinin ne kadar eksiksiz doldurulduğunu ölçer.

```
pyramidBonus = min(20, round((topCount + midCount + baseCount) / 22 × 20))
```

Maksimum beklenen nota sayısı: 22 (top:6 + middle:8 + base:8).

**Örnekler:**
| Üst | Kalp | Dip | Toplam | Bonus |
|---|---|---|---|---|
| 6 | 8 | 8 | 22 | 20 |
| 4 | 5 | 4 | 13 | 12 |
| 2 | 3 | 0 | 5 | 5 |
| 0 | 0 | 0 | 0 | 0 |

---

### 3. `moleculeBonus` — Moleküler Kanıt Kalitesi (0–25 puan)

Her molekül için atanan kanıt seviyesinin ağırlıklı toplamı.

```
moleculeBonus = min(25, round((Σ evidenceWeight[molecule.evidenceLevel]) / 25 × 25))
```

**Kanıt ağırlıkları:**

| `evidenceLevel` | Ağırlık | Açıklama |
|---|---|---|
| `verified_component` | 5 | Resmi parfüm formülünde doğrulandı |
| `signature_molecule` | 5 | İmza molekül (ikonu ile tanımlandı) |
| `accord_component` | 3 | Akor bileşeni olarak katalogda var |
| `note_match` | 2 | Nota eşleşmesinden türetildi |
| `inferred` | 1 | Benzer parfümlerden çıkarımla belirlendi |
| `unverified` | 0 | Doğrulanmamış |

Maksimum toplam: 5 molekül × 5 puan = 25 puan (tam doğrulama).

---

### 4. `modeBonus` — Giriş Modu (5–15 puan)

Kullanıcının tercih ettiği giriş moduna göre sabit bir bonus.

| Mod | Bonus | Açıklama |
|---|---|---|
| `text` | 15 | İsim/marka yazıldıysa tanıma güvenilir |
| `image` | 10 | Görüntü analizi iyi ama daha az kesin |
| `notes` | 5 | Nota listesi belirsiz bir profil verir |

---

## Yorumlama Rehberi

| Skor | Renk | Etiket | Eylem |
|---|---|---|---|
| 0–40 | 🔴 Kırmızı | "Düşük güven" | "Yeniden çek önerilir" |
| 41–70 | 🟡 Kehribar | "Orta güven" | "Kabul edilebilir sonuç" |
| 71–100 | 🟡 Altın | "Yüksek güven" | "Güvenilir analiz" |

---

## Hesaplama Kodu

Formülün kaynak kodu `api_internal/analyze.js` içindeki `computeConfidenceScore()` fonksiyonunda bulunmaktadır.

```js
function computeConfidenceScore({ contextMatchScore, analysis, mode, hasDbMatch }) {
  const identityBonus = Math.round((contextMatchScore || 0) * 40);
  const pyramidBonus = min(20, round(((top + mid + base) / 22) * 20));
  const moleculeBonus = min(25, round((weightedSum / 25) * 25));
  const modeBonus = mode === 'text' ? 15 : mode === 'image' ? 10 : 5;
  return clamp(identityBonus + pyramidBonus + moleculeBonus + modeBonus, 0, 100);
}
```

---

## Revizyon Geçmişi

| Tarih | Versiyon | Değişiklik |
|---|---|---|
| 2026-04-20 | 1.0 | İlk hesaplama formülü tanımlandı |
