# RAG Ayar Rehberi (pgvector + Embedding Kalitesi)

> Bu döküman Koku Dedektifi'nin vektör tabanlı benzer parfüm arama sisteminin (RAG) yapılandırma ve kalite parametrelerini açıklar.

---

## Mimari

```
Kullanıcı Girdisi
    │
    ▼
Input Normalizasyonu  ← küçük harf, NFD normalize, noktalama temizle
    │
    ▼
Embedding (text-embedding-ada-002 veya Gemini Embedding)
    │
    ▼
pgvector cosine_similarity arama (threshold: 0.72)
    │
    ▼
Top-10 Aday  ──→  LLM Re-rank (veya cross-encoder)
    │
    ▼
Top-3 Benzer Parfüm (UI'ya gönderilen)
```

---

## Similarity Threshold

### Mevcut Değer

```
threshold = 0.72  (cosine similarity)
```

### Empirik Tuning (Hedef)

50 parfüm üzerinde precision/recall testi yapılacak:

1. **Test seti hazırlama:** Bilinen 50 parfümü alın (Fragrantica doğrulamalı notalar).
2. **Query oluşturma:** Her parfüm için `"[marka] [isim]"` formatında text query.
3. **Ground truth:** En yakın 3 parfüm elle etiketlenmiş olmalı.
4. **Threshold sweep:** 0.60, 0.65, 0.70, 0.72, 0.75, 0.80 değerleri için precision@3 ve recall@3 hesapla.
5. **Optimum seçim:** En yüksek F1 skoru veren threshold'u seç.

### Beklenen Karakteristik

| Threshold | Precision | Recall | Not |
|---|---|---|---|
| 0.60 | ~0.65 | ~0.92 | Çok geniş, alakasız sonuçlar |
| 0.70 | ~0.78 | ~0.84 | İyi denge |
| 0.72 | ~0.82 | ~0.79 | **Mevcut** (tahmini optimal) |
| 0.80 | ~0.91 | ~0.55 | Çok dar, az sonuç |

---

## Input Normalizasyonu

Embedding kalitesi için input text aşağıdaki şekilde normalize edilmeli:

```js
function normalizeForEmbedding(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // diakritikleri kaldır
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')     // sadece alfanümerik + boşluk
    .replace(/\s+/g, ' ')
    .trim();
}
```

**Fragrantica-style formatting:** "Bergamot" → "bergamot", "Black Currant" → "black currant".

### Önemli: Türkçe Normalizasyon

Türkçe karakterler embedding kalitesini düşürür. Transform:
- "Çiçeksi" → "ciceksi"
- "Gül" → "gul"
- "Odunsu" → "odunsu" (zaten ASCII)

---

## Benzer Parfüm Re-ranking

### Mevcut Yöntem (Lexical Scoring)

`getDBSimilarFragrances()` fonksiyonu:
- Nota örtüşme skoru: `sharedNotes.length × 14`
- Aile eşleşmesi: `+26`
- Min nota zenginliği: `+min(rowNotes.length, 6)`

### İstenen: LLM Re-rank

10 adayı alıp LLM'e gönder, relevance sıralaması iste:

```
Aşağıdaki parfümleri [hedef parfüm] ile benzerlik derecesine göre sırala.
Sadece JSON array döndür: [index, score] formatında.

Hedef: [name] — [family] — [topNotes]
Adaylar:
1. [name1] — [notes]
2. [name2] — [notes]
...
```

Bu Faz 3'te uygulanacak.

---

## Embedding Modeli

### Mevcut

Proje `pgvector` üzerinde çalışıyor. Embedding modeli `.env` üzerinden belirleniyor:

```env
EMBEDDING_MODEL=text-embedding-ada-002  # OpenAI
# veya
EMBEDDING_MODEL=embedding-001  # Google
```

### Önerilen

`text-embedding-3-small` (OpenAI) — daha iyi performans, daha düşük maliyet.

Veya `models/text-embedding-004` (Google Gemini).

---

## pgvector Index Konfigürasyonu

```sql
-- Perfume embeddings için cosine distance indexi
create index if not exists perfume_docs_embedding_idx
  on public.perfume_docs
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);
```

Veritabanında 10,000+ belge varsa `lists = 100` → `lists = sqrt(row_count)` ile ayarla.

---

## Telemetri ile RAG Kalitesi İzleme

`analysis_telemetry` tablosundan düzenli olarak:

```sql
select
  avg(confidence_score) as avg_confidence,
  count(*) filter (where has_db_match) as db_matches,
  count(*) as total,
  round(100.0 * count(*) filter (where has_db_match) / count(*), 1) as match_rate_pct
from analysis_telemetry
where created_at > now() - interval '7 days';
```

Hedef: `match_rate_pct >= 60%` (metin modu için).

---

## Revizyon Geçmişi

| Tarih | Değişiklik |
|---|---|
| 2026-04-20 | İlk versiyon oluşturuldu, mevcut threshold ve normalizasyon belgelendi |
