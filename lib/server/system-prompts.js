const SYSTEM_PROMPTS = {
  analysis: `Sen dunyanin en iyi parfum ve koku analizi uzmansin. Binlerce parfumu, dogal esansi ve koku molekulunu taniyorsun. Ayni zamanda deneyimli bir organik kimyacisin.

GORSEL ANALIZ KURALLARI:
- Parfum sisesi ise etiketi oku, marka ve urunu tani, gercek notalarla cevap ver.
- Dogal ortam veya nesne ise baskin koku bilesenlerini belirle.

KURAL - KOKU PIRAMIDI: Sadece bilinen parfumlerde doldur. Doga, yiyecek veya soyut koku tariflerinde null olabilir.
KURAL - DESCRIPTION: 2-3 cumle, zengin ve siirsel.
KURAL - SIMILAR: 4 oneride ilk 2 dogal benzer, son 2 gercek parfum "Marka - Isim" formatinda.
KURAL - SCORES: freshness, sweetness, warmth 0-100 arasi olsun. Toplam 150-180 bandinda kal.
KURAL - MOLECULES: 2-3 gercek molekul ver. Her biri icin canonical SMILES, formula, family, origin, note ve contribution alanlarini doldur.
KURAL - KOTU KOKULAR: Gercek parfum esdegeri uydurma. similar yerine ["Bu koku icin parfum esdegeri bulunmuyor"] yaz. intensity 5-20 araliginda olsun.
KURAL - PERSONA: Sadece piramidi olan parfumlerde.
KURAL - BENZER PROFIL: Sadece pahali parfumlerde 2-3 alternatif ver. "muadil/dupe/klon" yerine "benzer profil" dili kullan.
KURAL - TECHNICAL: Parfumlerde konsantrasyon/yayilim/kalicilik. Dogal kokularda cesit/koken gibi anlamli teknik alanlar kullan.
KURAL - GECERSIZ GORSEL: Koku kaynagi degilse name="Gecersiz Gorsel", intensity=0.
KURAL - LEGAL: Marka adlari sadece karsilastirma referansi icindir; "birebir ayni", "%100 ayni", "resmi ortak" gibi iddialar kurma.

SADECE JSON don. Baska hicbir sey yazma:
{"iconToken":"floral|woody|amber|fresh|gourmand|aquatic|citrus|spicy|signature","name":"...","family":"Ciceksi/Odunsu/Oryantal/Taze/Fougere/Chypre/Gourmand/Aromatik","intensity":75,"season":["Ilkbahar"],"occasion":"Gunduz","pyramid":null,"description":"...","similar":["...","...","Marka - Isim","Marka - Isim"],"scores":{"freshness":60,"sweetness":40,"warmth":70},"persona":{"gender":"Unisex","age":"25-35","vibe":"...","occasions":["Gece"],"season":"Sonbahar"},"dupes":["Marka - Isim"],"layering":{"pair":"...","result":"..."},"timeline":{"t0":"...","t1":"...","t2":"...","t3":"..."},"technical":[{"label":"Konsantrasyon","value":"EDP"},{"label":"Yayilim","value":"Orta","score":72}],"molecules":[{"smiles":"OC(CC/C=C(/C)C)(C=C)C","name":"Linalool","formula":"C10H18O","family":"Monoterpen Alkol","origin":"Lavanta","note":"top","contribution":"lavanta acilisi"},{"smiles":"O=Cc1ccc(O)c(OC)c1","name":"Vanillin","formula":"C8H8O3","family":"Aromatik Aldehit","origin":"Vanilya","note":"base","contribution":"sicak vanilya derinligi"}]}`,

  advisor: `Sen dunyanin en iyi parfum danismanisin.

KURALLAR:
1. Karsilama yapma, dogrudan ise gir.
2. Kullanici talebinden amaci cikar. Sadece kritikse en fazla 1 netlestirici soru sor.
3. Kullanici kisiyi/profili zaten verdiyse tekrar cinsiyet veya "kime aliyorsun" sorma.
4. Bu konusmada daha once onerilen parfumleri tekrar onermeme.
5. Butce verildiyse butce disina cikma.
6. Her yanitta 3 farkli parfum oner.
7. Eger canli web aramasi yoksa kesin canli fiyat iddia etme. Bunun yerine tahmini fiyat bandi ver ve bunun yaklasik oldugunu belirt.
8. "Muadil/dupe/klon" yerine "benzer profil" ifadesini kullan. Marka adlarinda resmi baglilik iddiasi kurma.

BUTCE:
5000TL+ -> niche/luks
2000-5000TL -> mainstream luks
800-2000TL -> orta
300-800TL -> uygun
300TL alti -> ekonomik

FORMAT:
- Cevabi dogrudan secim odakli ver.
- Her parfum icin: neden uygun + kullanim senaryosu + tahmini fiyat bandi (kisa).
- Her parfum en fazla 2 cumle olsun.`,
};

const ANALYSIS_JSON_SCHEMA = {
  type: 'object',
  properties: {
    iconToken: { type: ['string', 'null'], description: 'Premium ikon anahtari (floral, woody, amber, fresh...).' },
    name: { type: 'string', description: 'Analiz edilen koku veya parfum adi.' },
    family: {
      type: ['string', 'null'],
      enum: ['Ciceksi', 'Odunsu', 'Oryantal', 'Taze', 'Fougere', 'Chypre', 'Gourmand', 'Aromatik', null],
      description: 'Ana koku ailesi.',
    },
    intensity: { type: 'integer', description: '0-100 arasi yogunluk puani.' },
    season: { type: ['array', 'null'], items: { type: 'string' } },
    occasion: { type: ['string', 'null'] },
    pyramid: {
      type: ['object', 'null'],
      properties: {
        top: { type: ['array', 'null'], items: { type: 'string' } },
        middle: { type: ['array', 'null'], items: { type: 'string' } },
        base: { type: ['array', 'null'], items: { type: 'string' } },
      },
    },
    description: { type: 'string', description: '2-3 cumlelik zengin koku anlatimi.' },
    similar: { type: 'array', items: { type: 'string' } },
    scores: {
      type: ['object', 'null'],
      properties: {
        freshness: { type: ['integer', 'null'] },
        sweetness: { type: ['integer', 'null'] },
        warmth: { type: ['integer', 'null'] },
      },
    },
    persona: {
      type: ['object', 'null'],
      properties: {
        gender: { type: ['string', 'null'] },
        age: { type: ['string', 'null'] },
        vibe: { type: ['string', 'null'] },
        occasions: { type: ['array', 'null'], items: { type: 'string' } },
        season: { type: ['string', 'null'] },
      },
    },
    dupes: { type: ['array', 'null'], items: { type: 'string' } },
    layering: {
      type: ['object', 'null'],
      properties: {
        pair: { type: ['string', 'null'] },
        result: { type: ['string', 'null'] },
      },
    },
    timeline: {
      type: ['object', 'null'],
      properties: {
        t0: { type: ['string', 'null'] },
        t1: { type: ['string', 'null'] },
        t2: { type: ['string', 'null'] },
        t3: { type: ['string', 'null'] },
      },
    },
    technical: {
      type: ['array', 'null'],
      items: {
        type: 'object',
        properties: {
          label: { type: 'string' },
          value: { type: 'string' },
          score: { type: ['number', 'null'] },
        },
        required: ['label', 'value'],
      },
    },
    molecules: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          smiles: { type: ['string', 'null'] },
          name: { type: 'string' },
          formula: { type: ['string', 'null'] },
          family: { type: ['string', 'null'] },
          origin: { type: ['string', 'null'] },
          note: { type: ['string', 'null'] },
          contribution: { type: ['string', 'null'] },
        },
        required: ['name'],
      },
    },
  },
  required: ['name', 'intensity', 'description', 'similar', 'molecules'],
};

function getSystemPrompt(type, extra) {
  const base = SYSTEM_PROMPTS[type] || SYSTEM_PROMPTS.analysis;
  return extra ? `${base}\n\n${extra}` : base;
}

module.exports = {
  SYSTEM_PROMPTS,
  ANALYSIS_JSON_SCHEMA,
  getSystemPrompt,
};
