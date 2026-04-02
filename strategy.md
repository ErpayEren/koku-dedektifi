# Koku Dedektifi — Data Engine Strategy

## Hedef

Bu veri hattinin amaci, katalogu statik bir seed dosyasindan cikartip yasayan, genisleyebilir ve Supabase merkezli bir sisteme donusturmektir.

## Kaynak Stratejisi

### Parfum Kaynaklari

1. `data/catalog-seed.json`
   - Elimizdeki editor-curated cekirdek koleksiyon.
   - Ikonik ve referans 20 parfum burada tutulur.
   - Bu katman kalite cipasidir.

2. `perfume_data_combined.csv`
   - Acik kaynak toplu parfum dataset'i.
   - Nota piramidi, aciklama, oy sayisi, rating ve gorsel URL barindirir.
   - 100 parfum baslangic dataset'ini gercek veriyle buyutmek icin kullanilir.

### Molekul Kaynaklari

1. `goodscents/molecules.csv`
2. `fragrancedb/molecules.csv`
3. `leffingwell/molecules.csv`
   - Bunlar ana yapi kaynaklaridir.
   - SMILES ve IUPAC alanlarini saglar.

4. `ifra-fragrance-ingredient-glossary`
   - CAS ve koku descriptor katmanini saglar.
   - Yapi dataset'leri ile eslestirilerek molekul kaydini zenginlestirir.

5. `perfumenuke materials.json`
   - Parfumeri odakli malzeme listesi.
   - IFRA / kullanim / koku aciklamasi gibi alanlarda tamamlayici rol oynar.

6. `PubChem PUG REST API`
   - Eksik kalan tekil molekullerde yedek dogrulama kaynagi.
   - CID, SMILES ve IUPAC icin fallback olarak kullanilir.

## Normalizasyon Kurallari

### Parfumler

- Tek kimlik alani: `slug`
- `brand + name` normalize edilerek duplicate kontrolu yapilir
- `for women / for men / for women and men` -> `gender_profile`
- `description` icinden:
  - launch year
  - perfumer
  - bazen konsantrasyon
  regex ile cekilir
- nota piramidi Python-list benzeri stringlerden diziye cevrilir
- kesin olmayan alanlar `null` veya `[]` olarak birakilir

### Molekuller

- Tek kimlik alani: `slug`
- Once `name` ile tam eslesme denenir
- Sonra struktur verisi (SMILES / IUPAC) ile tekil kayit kurulup
  IFRA ve perfumenuke alanlari birlestirilir
- Ayni isimli iki kayit varsa daha cok dolu alana sahip olan secilir
- Fake descriptor, fake source, fake discovery year uretilmez

## Duplicate Onleme

### Parfum

- `normalize(brand + name)` ana duplicate anahtari
- Ayni parfum birden fazla kaynaktan gelirse curated seed > remote csv

### Molekul

- `slug(name)` birincil duplicate anahtari
- Ayni slug'da en dolu kayit korunur
- Bos `name` veya bos `SMILES` olan kayitlar atilir

## Auto Expansion Logic

### Yeni Parfum Geldiginde

1. Nota piramidi normalize edilir
2. Var olan katalogla nota-overlap skoru hesaplanir
3. En yakin 5 parfum `similar_fragrance_slugs` olarak atanir
4. Notadan molekule engine ile ilk `key_molecules` uretilir
5. Sonraki turda editor veya model tarafindan dogrulama backlog'una dusurulur

### Yeni Molekul Geldiginde

1. Ad ve SMILES normalize edilir
2. Koku descriptor token'lari ayrilir
3. Var olan molekullerle ortak descriptor sayisina gore yakinlar bulunur
4. PubChem ile CID / IUPAC / SMILES tekrar dogrulanir
5. Eslestigi parfumlerde `found_in_fragrances` guncellenir

## Operasyonel Akis

1. `node scripts/build-data-engine.mjs`
   - JSON datasetlerini uretir
2. `node seed.js`
   - `molecules` ve `fragrances` tablolarina yazar
3. Health endpoint ile katalog sayilari kontrol edilir
4. Sonraki batch icin yeni kaynaklar eklenir

## Hukuki ve Teknik Guardrail

- Topluluk kaynakli veriler editor kaynakli veri gibi sunulmaz
- Kesin olmayan alanlar uydurulmaz
- Molekul eslesmeleri `note-map-derived` gibi kaynak etiketiyle ayristirilir
- Rate-limited kaynaklar icin PubChem fallback tekil dogrulamada kullanilir,
  toplu scraping mantiginda degil

## Sonraki Buyume

- 100 -> 1000 parfum:
  - yeni remote dataset batch'leri
  - editor-curated nis listeler
  - marka bazli ingestion adapter'lari
- 500 -> 2000+ molekul:
  - IFRA glossary genisletme
  - PubChem fallback enrichment queue
  - yeni supplier kataloglariyla join katmani
