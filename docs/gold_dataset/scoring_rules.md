# Koku Dedektifi — Gold Dataset Scoring Rules v1.2

> Bu dosya eval scriptinin **tek yetkili kaynağıdır**.
> NOTE_SYNONYMS, BRAND_ABBREVIATIONS ve THRESHOLDS değerleri
> buradan alınır — eval script'te hardcode edilmez, bu dosyadan kopyalanır.

---

## §1 Genel Kurallar

- Tüm string karşılaştırmaları **case-insensitive** ve trim sonrası yapılır.
- Türkçe karakter normalizasyonu: `ç→c, ğ→g, ı→i, ö→o, ş→s, ü→u` (karşılaştırmada opsiyonel; synonym map zaten kapsar).
- `expected_brand: null` veya `expected_name: null` olan item'larda (gold_056) M2/M3/M4/M5/M6/M7/M8 **skip** edilir.
- `run_count: 3` olan item'lar gerçekten 3 kez API'ye gönderilir; 2. ve 3. çalıştırmada cache bypass için `_r2` / `_r3` input suffix'i eklenir.

---

## §2 Dataset Kategorileri

| Kategori | Item sayısı | Beklenti |
|----------|-------------|----------|
| `real`   | 15          | Gerçek kullanıcı fotoğrafı (placeholder); yüksek zorluk variansı |
| `popular`| 20          | Katalog/referans görseli; kolay-orta |
| `niche`  | 10          | Katalog görseli; orta-zor |
| `trap`   | 11          | Kasıtlı zor koşul (blur, angle, fake object, reflection…) |

---

## §3 NOTE_SYNONYMS

Eval script bu listeyi **birebir** kopyalar. Canonical form lowercase İngilizce'dir.
Her canonical key ve synonym'leri aynı gruba eşlenir.

```
NOTE_SYNONYMS = {
  // === CITRUS ===
  "bergamot": ["calabrian bergamot", "italian bergamot", "bergamotto", "bergamot oil"],
  "grapefruit": ["pamplemousse", "greyfurt", "pompelmo"],
  "lemon": ["citron", "limon", "lemon zest", "limon kabuğu"],
  "mandarin": ["mandarin orange", "tangerine", "mandalina", "satsuma"],
  "orange": ["sweet orange", "portakal", "bitter orange", "blood orange"],
  "lime": ["persian lime", "misket limonu", "key lime"],
  "yuzu": ["yuzu citrus"],

  // === FLORAL ===
  "rose": ["rose absolute", "bulgarian rose", "turkish rose", "damask rose",
           "rosa centifolia", "gül", "gul", "rose oil", "may rose"],
  "jasmine": ["jasmine absolute", "jasminum officinale", "yasemin", "white jasmine",
              "jasmine flower"],
  "jasmine sambac": ["jasmine", "sambac jasmine", "arabian jasmine",
                     "jasminum sambac", "yasemin", "sambac"],
  "orange blossom": ["neroli", "portakal çiçeği", "portakal cicegi",
                     "bigarade", "fleur d'oranger", "orange flower"],
  "iris": ["orris root", "orris", "iris root", "iris absolute", "iris butter",
           "süsen", "susen", "orris concrete"],
  "lavender": ["lavandin", "spike lavender", "lavanda", "lavanta",
               "lavandula", "lavender flower"],
  "lavender absolute": ["lavender", "lavandin absolute", "lavanta absolutu",
                        "lavender oil"],
  "violet": ["violet flower", "menekşe", "menekse", "parma violet",
             "violet absolute"],
  "violet leaf": ["violet leaves", "violet foliage", "feuille de violette"],
  "tuberose": ["tuberosa", "polyanthes tuberosa", "tuberoz", "rajnigandha",
               "tuberose flower"],
  "tuberose absolute": ["tuberose", "tuberose concrete", "tubereuse"],
  "lily of the valley": ["muguet", "convallaria", "vadi zambağı", "lily"],
  "geranium": ["pelargonium", "rose geranium", "pelargon", "geranium bourbon"],
  "ylang ylang": ["cananga odorata", "ylang", "ilang ilang", "cananga"],
  "magnolia": ["magnolya", "magnolia champaca", "magnolia flower"],
  "heliotrope": ["cherry pie", "heliotrop", "heliotropin"],
  "osmanthus": ["osmantus", "osmanthus fragrans", "sweet osmanthus"],
  "peony": ["paeonia", "şakayık", "sakayik"],
  "carnation": ["clove pink", "karanfil çiçeği", "oeillet"],
  "mimosa": ["acacia mimosa", "mimosa absolute", "wattle"],
  "lily": ["lily of the valley", "muguet", "zambak"],

  // === WOODY / RESINOUS ===
  "cedar": ["cedarwood", "virginia cedar", "atlas cedar", "himalayan cedar",
            "sedir", "sedir agaci", "cedrus"],
  "sandalwood": ["mysore sandalwood", "australian sandalwood",
                 "sandal ağacı", "sandal agaci", "santalum", "sandal wood"],
  "vetiver": ["vetivert", "vetiver absolute", "vetiver java", "khus",
              "vetiver bourbon"],
  "patchouli": ["patchouly", "pachuli", "paçuli", "paculi",
                "pogostemon cablin", "patchouli heart"],
  "oakmoss": ["oak moss", "mousse de chêne", "meşe yosunu", "mese yosunu",
              "evernia prunastri"],
  "birch tar accord": ["birch tar", "dry birch", "birch", "russian leather",
                       "huş katranı", "hus katrani", "birch note"],
  "oud accord": ["oud", "agarwood", "oud absolute", "ud", "agar", "oudh",
                 "oud wood"],
  "amber accord": ["amber", "ambre", "kehribar", "ambra", "amber note"],
  "amberwood": ["amber wood", "kehribar odunu", "ambroxan amber",
                "amber woody"],
  "labdanum": ["cistus", "cistus labdanum", "rockrose", "labdanum absolute",
               "cistus ladaniferus", "labdanum resinoid"],
  "benzoin": ["styrax benzoin", "siam benzoin", "benzoin resinoid",
              "gum benzoin", "benzoé"],
  "incense": ["olibanum", "frankincense", "tütsü", "tutusu", "gunluk",
              "boswellia", "church incense"],
  "olibanum": ["frankincense", "boswellia", "tütsü", "tutusu",
               "olibanum absolute"],
  "guaiac wood": ["guaiacwood", "bulnesia sarmientoi", "palo santo",
                  "guayaco"],
  "myrrh": ["commiphora", "mür"],
  "elemi": ["elemi resinoid", "elemi gum"],
  "cistus": ["labdanum", "rockrose", "cistus labdanum"],
  "fir balsam": ["fir resin", "balsam fir", "gümüşi köknar reçinesi"],
  "pine": ["pine needle", "çam", "pine resin"],

  // === ORIENTAL / SWEET ===
  "vanilla": ["vanillin", "vanilla absolute", "bourbon vanilla",
              "madagascar vanilla", "vanilla planifolia", "vanilya",
              "vanilla bean", "vanilla oleoresin"],
  "tonka bean": ["tonka", "fève tonka", "tonka fasulyesi",
                 "dipteryx odorata", "coumarin"],
  "tonka": ["tonka bean", "fève tonka", "tonka fasulyesi",
            "dipteryx odorata"],
  "coumarin": ["hay", "grass", "new mown hay", "tonka"],
  "ethyl maltol": ["cotton candy note", "caramelized sugar", "karamel",
                   "candy note", "malty sweet"],
  "honey": ["beeswax", "bal", "miel", "honey accord", "bees wax"],
  "praline": ["pralin", "almond praline", "caramelized almond"],
  "caramel": ["toffee", "karamel", "butterscotch"],

  // === SMOKY / LEATHERY ===
  "leather accord": ["leather", "cuir", "deri", "birch leather",
                     "leather note"],
  "tobacco absolute": ["tobacco", "tobacco leaf", "latakia", "tütün",
                       "tutun", "tabac", "tobacco flower"],
  "tobacco": ["tobacco absolute", "tobacco leaf", "tütün", "tutun",
              "tabac", "virginia tobacco"],

  // === AQUATIC / FRESH ===
  "calone": ["sea notes", "watermelon ketone", "aquatic note", "aquozone"],
  "sea notes": ["marine notes", "ocean notes", "aquatic notes",
                "deniz notaları", "deniz notalari", "aquozone", "oceanic"],
  "mineral notes": ["flint", "stone", "minerality", "mineral",
                    "mineral accord", "taş", "tas"],

  // === SPICY ===
  "black pepper": ["pepper", "poivre noir", "biber", "karabiber",
                   "piper nigrum", "white pepper"],
  "pink pepper": ["rose pepper", "schinus molle", "pembe biber",
                  "poivre rose", "pink peppercorn"],
  "cardamom": ["green cardamom", "kakule", "elettaria cardamomum",
               "cardamom seed"],
  "ginger": ["zingiber officinale", "zencefil", "ginger root"],
  "cinnamon": ["ceylon cinnamon", "cassia", "tarçın", "tarcin",
               "cinnamon bark"],
  "clove": ["clove bud", "karanfil", "syzygium aromaticum"],
  "nutmeg": ["myristica fragrans", "muskat", "muskatcevizi", "mace"],
  "cumin": ["kimyon", "cuminum cyminum"],
  "saffron": ["safran", "crocus sativus", "saffron absolute"],

  // === FRUITY ===
  "black currant": ["blackcurrant", "cassis", "ribes nigrum",
                   "siyah frenk üzümü", "siyah frenk uzumu"],
  "blackcurrant": ["black currant", "cassis", "ribes nigrum",
                   "siyah frenk üzümü"],
  "pineapple accord": ["pineapple", "ananas", "ananas accord", "pineapple note"],
  "apple": ["malus domestica", "elma", "green apple", "red apple"],
  "pear": ["armut", "pyrus", "pear accord"],
  "peach": ["şeftali", "seftali", "pêche", "peach blossom"],
  "plum": ["erik", "prunus", "damson", "prune"],
  "raspberry": ["ahududu", "framboise", "raspberry accord"],
  "strawberry": ["çilek", "cilek", "fraise"],

  // === KEY SYNTHETIC MOLECULES ===
  "ambroxan": ["ambroxide", "ambrox", "ambrofix", "cetalox",
               "ambrox super", "ambrocenide"],
  "ambergris accord": ["ambergris", "grey amber", "amber gris",
                       "ambroxan", "ambergris note"],
  "iso e super": ["iso-e-super", "isoe super", "javanol",
                  "cedryl methyl ether", "iso e"],
  "hedione": ["dihydrojasmonate", "methyl dihydrojasmonate",
              "methyl jasmonate", "hedione hc"],
  "methyl pamplemousse": ["methyl pamplemousse accord",
                          "grapefruit carbaldehyde"],
  "lemon verbena": ["vervain", "verbena", "limon otu", "lippia citriodora"],
  "coffee accord": ["coffee", "kahve", "coffee note", "coffea arabica",
                    "roasted coffee"],
  "cocoa absolute": ["cocoa", "cacao", "chocolate note", "kakao",
                     "cacao absolute"],
  "rosemary absolute": ["rosemary", "biberiye", "rosmarinus officinalis"],
  "rose absolute": ["rose", "gül", "gul", "rose otto"],
  "iris absolute": ["iris", "orris absolute", "orris butter", "iris root"],
  "lavender absolute": ["lavender", "lavandin absolute", "lavanta absolutu"],
  "oakmoss absolute": ["oakmoss", "oak moss absolute"],
  "violet leaf absolute": ["violet leaf", "violet absolute"],
  "patchouli": ["patchouly", "pachuli", "paçuli"],
  "honey": ["beeswax", "bal"],
  "tobacco absolute": ["tobacco", "tütün"],
  "birch tar accord": ["birch tar", "birch", "dry birch"],
  "methyl pamplemousse": ["grapefruit accord"],
  "ambergris accord": ["ambergris", "grey amber", "ambroxan"],

  // === MUSK ===
  "musk": ["white musk", "clean musk", "musks", "misk",
           "musc", "musque", "akın misk"],
  "white musk": ["musk", "clean musk", "musks", "sheer musk"],
  "cashmeran": ["cashmere wood", "cashmeran accord", "cashmere note"],
  "woody notes": ["woodsy notes", "odunsu nota", "bois"],
  "oriental notes": ["oriental accord", "doğu notaları"]
}
```

---

## §4 BRAND_ABBREVIATIONS

Eval script brand karşılaştırmasında bu tabloyu kullanır.
Tüm karşılaştırmalar **normalize edilmiş** (lowercase, trim) formda yapılır.

```
BRAND_ABBREVIATIONS = {
  "ysl": "yves saint laurent",
  "mfk": "maison francis kurkdjian",
  "pdm": "parfums de marly",
  "jpg": "jean paul gaultier",
  "ch": "carolina herrera",
  "ga": "giorgio armani",
  "paco rabanne": "rabanne",
  "rabanne": "paco rabanne",
  "lancome": "lancôme",
  "lancome": "lancôme",
  "bvlgari": "bulgari",
  "bulgari": "bvlgari",
  "viktor rolf": "viktor&rolf",
  "viktor & rolf": "viktor&rolf",
  "viktor&rolf": "viktor&rolf",
  "jp gaultier": "jean paul gaultier",
  "creed boutique": "creed",
  "house of creed": "creed",
  "maison francis kurkdjian": "maison francis kurkdjian",
  "armaf": "armaf",
  "mfk": "maison francis kurkdjian"
}
```

---

## §5 Metrik Tanımları

### M1 — is_perfume Accuracy
- **Hesap:** `correct / total`
- **Prediction:** confidence ≥ 25 VE name null/empty/unknown değil → is_perfume=true; aksi → false
- **Non-perfume keywords:** `deodorant`, `body spray`, `room spray`, `oda spreyi`, `deodoran`, `bilinmiyor`, `unknown`
- **Scope:** Tüm 56 item

### M2 — Brand Accuracy
- **Hesap:** `brand_correct / items_with_expected_brand`
- **Match:** normalize(predicted) == normalize(expected) VEYA BRAND_ABBREVIATIONS eşlemesi var
- **Scope:** expected_brand != null olan item'lar (55 item; gold_056 skip)

### M3 — Name Fuzzy Match
- **Hesap:** `name_match / items_with_expected_name`
- **Match kriterleri (herhangi biri yeterliyse):**
  1. Exact match (normalize sonrası)
  2. Levenshtein(predicted_name, expected_name) ≤ 2
  3. predicted_name.includes(expected_name) veya expected_name.includes(predicted_name)
- **Scope:** expected_name != null olan item'lar (55 item)

### M4 — Concentration
- **Tam eşleşme:** 1.0
- **Kısmi puan:**
  - Parfum ↔ EDP: 0.5
  - EDP ↔ EDT: 0.5
  - EDT ↔ EDC: 0.5
  - Extrait de Parfum ↔ Parfum: 0.75
  - Parfum Cologne ↔ Parfum: 0.5
  - EDP ↔ EDC: 0.25
  - Parfum ↔ EDT: 0.25
  - Diğer kombinasyonlar: 0.0
- **Hesap:** item başına puan ortalaması
- **Scope:** expected_concentration != null olan item'lar (null = deodorant/room_spray gibi)

### M5 — Gender Accuracy
- **Mapping:** Maskülen/masculine/male/erkek → male; Feminen/feminine/female/kadın → female; Unisex → unisex
- **Hesap:** `correct / items_with_expected_gender`
- **Scope:** expected_gender != null olan item'lar

### M6 — Notes F1 (Synonym-Aware)
- **Havuz:** top + heart + base notalar birleştirilir
- **Match:** notesMatch(predicted_note, expected_note) → NOTE_SYNONYMS kullanılarak
- **TP (precision için):** Her predicted nota için en az 1 expected nota eşleşiyorsa +1
- **TP (recall için):** Her expected nota için en az 1 predicted nota eşleşiyorsa +1
- **Precision:** TP_pred / |predicted_notes|
- **Recall:** TP_exp / |expected_notes|
- **F1:** 2 * P * R / (P + R) — hem P hem R 0 ise F1=0
- **Hesap:** item başına F1 ortalaması
- **Scope:** expected notes boş olmayan item'lar

### M7 — Molecule Precision (Verified Only)
- **Kapsam:** Yalnızca `evidenceLevel === 'verified_component'` moleküller sayılır
- **Match:** notesMatch ile synonym-aware karşılaştırma
- **Precision:** predicted_verified ∩ expected_verified / |predicted_verified|
- **Hesap:** item başına precision ortalaması (predicted_verified boşsa 0 değil → skip)
- **Scope:** expected_molecules_verified boş olmayan item'lar

### M8 — Molecule Recall (Verified Only)
- **Recall:** predicted_verified ∩ expected_verified / |expected_verified|
- **Hesap:** item başına recall ortalaması
- **Scope:** expected_molecules_verified boş olmayan item'lar

### M9 — Brier Score (Confidence Calibration)
- **p:** `min(analysis.confidence / 100, 1.0)` (API'den gelen skor)
- **o:** 1 eğer brand VE name ikisi birden doğruysa; 0 aksi
- **Brier:** `mean((p - o)^2)`
- **Scope:** Tüm item'lar (gold_056 dahil; null expected → o=0)

### M10 — Consistency (run_count:3 item'lar)
- **Çalıştırma:** Aynı görsel 3 kez API'ye gönderilir
- **Jaccard:** notes birliği için — J(A,B) = |A∩B| / |A∪B|
  - 3 çift hesaplanır: (1,2), (1,3), (2,3) → ortalama alınır
- **Confidence StdDev:** 3 run'daki confidence değerlerinin standart sapması
- **Rapor:** Per item ve genel ortalama
- **Pass/Fail:** Ortalama Jaccard ≥ threshold

### M11 — Latency
- **p50, p95, p99:** Tüm API çağrılarının süreleri (ms)
- **Scope:** Tüm API çağrıları (dry-run'da skip)
- **Pass/Fail:** p95 ≤ threshold

### M12 — False Positive Rate
- **Kapsam:** expected_is_perfume === false olan item'lar (gold_047, gold_048)
- **FP:** Model is_perfume=true tahmin etti
- **FPR:** FP / |negative_items|
- **Pass/Fail:** FPR ≤ threshold

---

## §6 gold_056 Özel Kuralı

gold_056 = etiketsiz bulk decant (kimliği belirlenemez).

- **Doğru davranış:** confidence < 50 VE brand/name unknown/uncertain
- **Hata durumu:** confidence ≥ 70 VE brand iddia ediliyorsa → `over_confident_identification` sayacına +1
- M1'de bu item için expected_is_perfume = true (şişe var, içinde parfüm var; kimliği bilinmiyor)
- M2/M3 skip (expected_brand = null)

---

## §7 Kategori Bazlı Beklentiler

| Kategori | Beklenen M2 min | Beklenen M6 min |
|----------|-----------------|-----------------|
| popular  | 0.80            | 0.40            |
| niche    | 0.60            | 0.35            |
| trap     | 0.50            | 0.25            |
| real     | 0.65            | 0.35            |

---

## §8 Dry-Run Davranışı

`--dry-run` flag ile:
- API çağrısı yapılmaz
- Her item için ground truth'tan mock result üretilir (mükemmel skor)
- Report format ve hesap mantığı test edilir
- Latency metrikleri skip edilir

---

## §9 Rapor Çıktısı

Dosya: `docs/eval/eval_{YYYYMMDD_HHMM}.md`

Bölümler:
1. **Özet Tablo** — M1-M12, hedef, gerçek skor, pass/fail
2. **Kategori Breakdown** — real/popular/niche/trap bazında M1-M8
3. **Başarısız Item'lar** — Hangi metrik neden başarısız?
4. **Kalibrasyon Tablosu** — 5 bucket (0-20, 20-40, 40-60, 60-80, 80-100)
5. **Consistency Raporu** — run_count:3 item'lar için Jaccard ve StdDev
6. **Latency İstatistikleri** — p50/p95/p99

---

## §10 Eşik Değerleri (Thresholds)

```
THRESHOLDS = {
  M1_is_perfume_accuracy:  { pass: 0.90, direction: "gte" },
  M2_brand_accuracy:       { pass: 0.70, direction: "gte" },
  M3_name_fuzzy:           { pass: 0.65, direction: "gte" },
  M4_concentration:        { pass: 0.55, direction: "gte" },
  M5_gender_accuracy:      { pass: 0.75, direction: "gte" },
  M6_notes_f1:             { pass: 0.35, direction: "gte" },
  M7_molecule_precision:   { pass: 0.45, direction: "gte" },
  M8_molecule_recall:      { pass: 0.30, direction: "gte" },
  M9_brier_score:          { pass: 0.22, direction: "lte" },
  M10_consistency_jaccard: { pass: 0.55, direction: "gte" },
  M11_latency_p95_ms:      { pass: 10000, direction: "lte" },
  M12_false_positive_rate: { pass: 0.15, direction: "lte" }
}
```

---

## §11 Değişiklik Geçmişi

| Versiyon | Tarih | Değişiklik |
|----------|-------|-----------|
| 1.2 | 2026-04-24 | İlk yayın — 12 metrik, NOTE_SYNONYMS, THRESHOLDS |
