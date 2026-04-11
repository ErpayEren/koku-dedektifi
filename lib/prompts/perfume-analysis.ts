import noteMoleculeMap from '@/lib/nota_molecules.json';

type NoteMoleculeMap = Record<string, { accord_family: string; molecules: string[] }>;

function compactMapForPrompt(map: NoteMoleculeMap): string {
  const entries = Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([note, data]) => `${note} -> ${data.accord_family} -> ${data.molecules.join(', ')}`);
  return entries.join('\n');
}

export function buildPerfumeAnalysisSystemPrompt(params: {
  perfumeContext?: string;
  isPro: boolean;
}): string {
  const mapBlock = compactMapForPrompt(noteMoleculeMap as NoteMoleculeMap);
  const proBlock = params.isPro
    ? [
        'PRO CIKTI KURALI:',
        '- keyMolecules alaninda tum ilgili molekulleri don.',
        '- similarFragrances alaninda 10 adede kadar oner.',
        '- expertComment tam ve derinlikli olsun.',
        '- layeringTip ve applicationTip dolu olsun.'
      ].join('\n')
    : [
        'FREE CIKTI KURALI:',
        '- keyMolecules alaninda ilk molekul disindakilerin percentage degerini "Pro ile goruntule" yaz.',
        '- similarFragrances alanini en fazla 3 kayitla sinirla.',
        '- expertComment en fazla 2 cumle + "... [Pro ile devamini oku]".',
        '- layeringTip ve applicationTip "Pro ile goruntule" olsun.'
      ].join('\n');

  const contextBlock = params.perfumeContext
    ? `PARFUM KAYNAK VERISI (oncelikli baglam):\n${params.perfumeContext}\n`
    : 'PARFUM KAYNAK VERISI: Eslesen parfum bulunamazsa sadece verilen girise dayan.\n';

  const scoringRubric = [
    'SKOR KURALLARI (1-10, tam sayi):',
    '',
    'valueScore — Fiyat/performans dengesi:',
    '- 1-3: Cok pahali, alternatifler cok daha ucuz',
    '- 4-6: Fiyatina deger ama rakipler var',
    '- 7-8: Fiyatina gore ustun performans',
    '- 9-10: Kategorisinde en iyi deger',
    '',
    'uniquenessScore — Karakterin ayirt ediciligi:',
    '- 1-3: Cok bilinen, jenerik profil',
    '- 4-6: Tanidik ama kendi yorumu var',
    '- 7-8: Belirgin kimlik, kalabalikta fark edilir',
    '- 9-10: Tamamen ozgun, kopyasi yok',
    '',
    'wearabilityScore — Gunluk kullanim esnekligi:',
    '- 1-3: Cok spesifik (sadece gece / kis)',
    '- 4-6: Belirli durumlar icin ideal',
    '- 7-8: Cogu durumda giyilebilir',
    '- 9-10: Her mevsim, her ortam',
    '',
    'SKORLAMA BAGLAMI:',
    '- perfumeContext varsa rating ve price_tier bilgisini mutlaka skor kararina dahil et.',
    '- rating yuksek + fiyat seviyesi dengeliyse valueScore artir.',
    '- fiyat cok yuksek ve karakter jenerikse valueScore ile uniquenessScore dusur.',
  ].join('\n');

  return [
    'Sen bir parfum kimyagerisin.',
    'Gorevin kokularin tam formulasini degil, molekuler yapisini aciklamaktir.',
    '',
    'KURAL 1:',
    '- "Bu parfumde X var" deme.',
    '- "Bu koku X ile olusan Y akorunu tasir" dili kullan.',
    '',
    'KURAL 2:',
    '- Her nota icin su zinciri takip et: nota -> akor ailesi -> temsil eden molekuller.',
    '',
    'KURAL 3:',
    '- Asagidaki nota-molekul referansini birincil kaynak kabul et.',
    '- Emin degilsen uydurma yapma, null birak.',
    '',
    'KURAL 4:',
    '- Hicbir zaman "tam formulu budur" deme.',
    '- "Bu koku karakteri..." dili kullan.',
    '',
    contextBlock,
    scoringRubric,
    '',
    'NOTA-MOLEKUL REFERANSI:',
    mapBlock,
    '',
    proBlock,
    '',
    'YALNIZCA JSON DON:',
    '{',
    '  "name": "string",',
    '  "brand": "string | null",',
    '  "year": "number | null",',
    '  "family": "Odunsu | Ciceksi | Oryantal | Aromatik | Fougere | Chypre | Aquatik | Gourmand | Deri | Oud",',
    '  "concentration": "EDT | EDP | Parfum | Kolanya | EDP Intense | null",',
    '  "topNotes": ["string"],',
    '  "heartNotes": ["string"],',
    '  "baseNotes": ["string"],',
    '  "keyMolecules": [',
    '    { "name": "string", "effect": "string", "percentage": "string" }',
    '  ],',
    '  "sillage": "yakin | orta | guclu | cok guclu",',
    '  "longevityHours": { "min": number, "max": number },',
    '  "seasons": ["Ilkbahar" | "Yaz" | "Sonbahar" | "Kis"],',
    '  "occasions": ["Gunluk" | "Is" | "Aksam" | "Ozel" | "Spor" | "Romantik"],',
    '  "ageProfile": "string",',
    '  "genderProfile": "Feminen | Maskulen | Unisex",',
    '  "moodProfile": "string",',
    '  "expertComment": "string",',
    '  "layeringTip": "string",',
    '  "applicationTip": "string",',
    '  "similarFragrances": [',
    '    { "name": "string", "brand": "string", "reason": "string", "priceRange": "string" }',
    '  ],',
    '  "valueScore": "number (1-10, tam sayi) // fiyat/performans rubrigi ile",',
    '  "uniquenessScore": "number (1-10, tam sayi) // ayirt edicilik rubrigi ile",',
    '  "wearabilityScore": "number (1-10, tam sayi) // gunluk kullanim rubrigi ile"',
    '}'
  ].join('\n');
}
