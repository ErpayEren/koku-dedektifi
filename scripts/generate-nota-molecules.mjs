import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const MOLECULES_PATH = path.join(ROOT, 'molecules.json');
const OUTPUT_PATH = path.join(ROOT, 'lib', 'nota_molecules.json');

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

const CAS_FALLBACK = {
  Linalool: '78-70-6',
  'Linalyl Acetate': '115-95-7',
  Limonene: '138-86-3',
  'Beta-Pinene': '127-91-3',
  Citral: '5392-40-5',
  Nootkatone: '4674-50-4',
  Ambroxide: '6790-58-5',
  Cashmeran: '33704-61-9',
  Cedramber: '19870-74-7',
  Cedrol: '77-53-2',
  'Alpha-Santalol': '115-71-9',
  'Beta-Santalol': '77-42-9',
  Ebanol: '67801-20-1',
  Patchoulol: '5986-55-0',
  'Alpha-Bulnesene': '3691-12-1',
  Norpatchoulenol: null,
  Khusimol: '32874-66-3',
  'Alpha-Vetivone': '473-13-2',
  'Vetiveryl Acetate': '6310-37-4',
  Galaxolide: '1222-05-5',
  Habanolide: '111879-80-2',
  'Ethylene Brassylate': '105-95-3',
  'Ethyl Vanillin': '121-32-4',
  Vanillin: '121-33-5',
  Coumarin: '91-64-5',
  Benzoin: '119-53-9',
  Safranal: '116-26-7',
  Piperine: '94-62-2',
  'Beta-Caryophyllene': '87-44-5',
  Sabinene: '3387-41-5',
  Camphor: '76-22-2',
  Geraniol: '106-24-1',
  Citronellol: '106-22-9',
  'Rose Oxide': '16409-43-1',
  Damascenone: '23696-85-7',
  Hedione: '24851-98-7',
  'Methyl Jasmonate': '39924-52-2',
  Indole: '120-72-9',
  'Benzyl Acetate': '140-11-4',
  Agarospirol: '6980-53-6',
  'Alpha-Agarofuran': '2855-20-3',
  Isoagarofuran: null,
  'Iso E Super': '54464-57-2',
  Lavandulol: '498-16-8',
  Irone: '79-69-6',
  'Methyl Ionone': '127-51-5',
  Ionone: '14901-07-6',
  Calone: '28940-11-6',
  'Cis-3-Hexenol': '928-96-1',
  Galbanol: null,
  Labdanum: '8016-26-0',
  Olibanol: null,
  Myrrhol: null,
  Styrax: null,
  Guaiacol: '90-05-1',
  Muscone: '541-91-3',
  Ambrettolide: '28645-51-4',
  'Birch Tar': '8001-88-5',
  'Isobutyl Quinoline': '65442-31-1',
  '2-Acetylpyrazine': '22047-25-2',
  Safrole: '94-59-7',
  Eugenol: '97-53-0',
  Isoeugenol: '97-54-1',
  Cinnamaldehyde: '104-55-2',
  CinnamylAlcohol: '104-54-1',
  Menthol: '2216-51-5',
  Eucalyptol: '470-82-6',
  'Alpha-Pinene': '80-56-8',
  Nerolidol: '7212-44-4',
  Farnesol: '4602-84-0',
  'Methyl Anthranilate': '134-20-3',
  Heliotropin: '120-57-0',
  Maltol: '118-71-8',
  Lactones: null,
  'Gamma-Nonalactone': '104-61-0',
  'Delta-Decalactone': '705-86-2',
  'Ethyl Maltol': '4940-11-8',
  'Anisyl Alcohol': '105-13-5',
  'Aldehyde C-12 MNA': '110-41-8',
  'Aldehyde C-10': '112-31-2',
  'Aldehyde C-11': '112-44-7',
  'Aldehyde C-12 Lauric': '112-54-9',
  Oakmoss: '90028-68-5',
  Evernyl: '4707-47-5',
  'Phenethyl Alcohol': '60-12-8',
};

const ODOR_FALLBACK = {
  Linalool: 'taze, çiçeksi, hafif baharlı',
  'Linalyl Acetate': 'narenciye kabuğu, parlak, sabunsu',
  Limonene: 'canlı narenciye, kabuklu meyve',
  Citral: 'keskin limon, ferah yeşil',
  Nootkatone: 'greyfurt kabuğu, hafif acı narenciye',
  Ambroxide: 'amber, odunsu, kuru mineral',
  Cashmeran: 'kadifemsi odunsu, amberimsi',
  Cedramber: 'kuru sedir, amber odunu',
  Cedrol: 'odunsu, reçineli, sedir',
  'Alpha-Santalol': 'kremsi sandal, yumuşak odunsu',
  Patchoulol: 'topraksı, koyu odunsu',
  Khusimol: 'dumanlı vetiver, köksü',
  Galaxolide: 'temiz misk, pamuksu',
  Vanillin: 'vanilyamsı, sıcak tatlı',
  Coumarin: 'tonka, bademimsi sıcak',
  Piperine: 'karabiber, kuru baharat',
  Geraniol: 'gül, yeşil çiçeksi',
  Citronellol: 'gül, limonsu çiçek',
  Hedione: 'şeffaf yasemin, havadar floral',
  Indole: 'yoğun beyaz çiçek, hayvansı nüans',
  'Benzyl Acetate': 'yaseminimsi, meyvemsi floral',
  'Iso E Super': 'modern odunsu, kadifemsi',
  Calone: 'deniz meltemi, ozonik',
  Labdanum: 'amber reçine, sıcak balsamik',
  Olibanol: 'tütsü, reçineli kuru',
  Guaiacol: 'dumanlı, tütsülü, kahvemsi',
  Muscone: 'cilt benzeri doğal misk',
  Eugenol: 'karanfil, tatlı baharat',
  Cinnamaldehyde: 'tarçın, sıcak baharat',
  Oakmoss: 'yosunsu, nemli toprak',
  Evernyl: 'modern meşe yosunu, temiz chypre',
};

const PROFILE_LIBRARY = {
  bergamot_citrus: {
    family: 'Citrus',
    character: 'Açılışı parlak, serin ve rafine bir turunçgil imzasıyla taşır.',
    intensity: 'orta',
    season: ['ilkbahar', 'yaz'],
    molecules: [
      { name: 'Linalool', role: 'temel taşıyıcı' },
      { name: 'Linalyl Acetate', role: 'güçlendirici' },
      { name: 'Limonene', role: 'iz notu' },
      { name: 'Beta-Pinene', role: 'iz notu' },
    ],
  },
  lemon_citrus: {
    family: 'Citrus',
    character: 'Canlı limon kabuğu etkisiyle enerjik ve temiz bir açılış üretir.',
    intensity: 'orta',
    season: ['ilkbahar', 'yaz'],
    molecules: [
      { name: 'Limonene', role: 'temel taşıyıcı' },
      { name: 'Citral', role: 'güçlendirici' },
      { name: 'Linalool', role: 'iz notu' },
    ],
  },
  orange_citrus: {
    family: 'Citrus',
    character: 'Tatlı-portakal ekseninde parlak ve neşeli bir citrus akoru kurar.',
    intensity: 'orta',
    season: ['ilkbahar', 'yaz'],
    molecules: [
      { name: 'Limonene', role: 'temel taşıyıcı' },
      { name: 'Citral', role: 'iz notu' },
      { name: 'Nootkatone', role: 'iz notu' },
    ],
  },
  neroli_orange_blossom: {
    family: 'Floral',
    character: 'Beyaz çiçek zarafetini narenciye ferahlığıyla birlikte sunar.',
    intensity: 'orta',
    season: ['ilkbahar', 'yaz'],
    molecules: [
      { name: 'Linalool', role: 'temel taşıyıcı' },
      { name: 'Benzyl Acetate', role: 'güçlendirici' },
      { name: 'Methyl Anthranilate', role: 'iz notu' },
    ],
  },
  aromatic_lavender: {
    family: 'Fresh',
    character: 'Aromatik, temiz ve maskülen/fougere omurgayı destekleyen bir profil verir.',
    intensity: 'orta',
    season: ['ilkbahar', 'yaz', 'sonbahar'],
    molecules: [
      { name: 'Linalool', role: 'temel taşıyıcı' },
      { name: 'Linalyl Acetate', role: 'güçlendirici' },
      { name: 'Camphor', role: 'iz notu' },
      { name: 'Lavandulol', role: 'iz notu' },
    ],
  },
  herbal_green: {
    family: 'Fresh',
    character: 'Yeşil, aromatik ve canlı bir kırılmayla kompozisyona doğallık ekler.',
    intensity: 'hafif',
    season: ['ilkbahar', 'yaz'],
    molecules: [
      { name: 'Cis-3-Hexenol', role: 'temel taşıyıcı' },
      { name: 'Alpha-Pinene', role: 'iz notu' },
      { name: 'Menthol', role: 'iz notu' },
    ],
  },
  spicy_pepper: {
    family: 'Oriental',
    character: 'Kuru ve titreşimli baharat etkisiyle açılışa dinamizm verir.',
    intensity: 'orta',
    season: ['sonbahar', 'kış'],
    molecules: [
      { name: 'Piperine', role: 'temel taşıyıcı' },
      { name: 'Beta-Caryophyllene', role: 'güçlendirici' },
      { name: 'Sabinene', role: 'iz notu' },
    ],
  },
  spicy_cardamom: {
    family: 'Oriental',
    character: 'Serin baharat dokusu ile modern, zarif ve rafine bir sıcaklık taşır.',
    intensity: 'orta',
    season: ['sonbahar', 'kış'],
    molecules: [
      { name: 'Eucalyptol', role: 'temel taşıyıcı' },
      { name: 'Alpha-Pinene', role: 'iz notu' },
      { name: 'Linalool', role: 'iz notu' },
    ],
  },
  spicy_warm: {
    family: 'Oriental',
    character: 'Sıcak, tatlımsı baharat omurgasıyla derinlik ve hacim sağlar.',
    intensity: 'yoğun',
    season: ['sonbahar', 'kış'],
    molecules: [
      { name: 'Eugenol', role: 'temel taşıyıcı' },
      { name: 'Cinnamaldehyde', role: 'güçlendirici' },
      { name: 'Coumarin', role: 'iz notu' },
    ],
  },
  rose_floral: {
    family: 'Floral',
    character: 'Romantik, kadifemsi ve hafif meyvemsi gül omurgasını temsil eder.',
    intensity: 'orta',
    season: ['ilkbahar', 'sonbahar'],
    molecules: [
      { name: 'Geraniol', role: 'temel taşıyıcı' },
      { name: 'Citronellol', role: 'güçlendirici' },
      { name: 'Rose Oxide', role: 'iz notu' },
      { name: 'Damascenone', role: 'iz notu' },
    ],
  },
  jasmine_floral: {
    family: 'Floral',
    character: 'Havadar ama çekici beyaz çiçek etkisini omurgada taşır.',
    intensity: 'orta',
    season: ['ilkbahar', 'yaz', 'sonbahar'],
    molecules: [
      { name: 'Hedione', role: 'temel taşıyıcı' },
      { name: 'Methyl Jasmonate', role: 'güçlendirici' },
      { name: 'Indole', role: 'iz notu' },
      { name: 'Benzyl Acetate', role: 'iz notu' },
    ],
  },
  powdery_iris: {
    family: 'Floral',
    character: 'Pudramsı, kozmetik ve lüks bir floral doku oluşturur.',
    intensity: 'orta',
    season: ['ilkbahar', 'sonbahar', 'kış'],
    molecules: [
      { name: 'Irone', role: 'temel taşıyıcı' },
      { name: 'Methyl Ionone', role: 'güçlendirici' },
      { name: 'Ionone', role: 'iz notu' },
    ],
  },
  white_floral_creamy: {
    family: 'Floral',
    character: 'Kremamsı beyaz çiçek etkisiyle feminen ve yoğun bir iz bırakır.',
    intensity: 'yoğun',
    season: ['ilkbahar', 'yaz', 'sonbahar'],
    molecules: [
      { name: 'Benzyl Acetate', role: 'temel taşıyıcı' },
      { name: 'Indole', role: 'iz notu' },
      { name: 'Linalool', role: 'güçlendirici' },
    ],
  },
  fruity_fresh: {
    family: 'Fresh',
    character: 'Sulu, parlak ve genç bir meyvemsi üst notayı destekler.',
    intensity: 'hafif',
    season: ['ilkbahar', 'yaz'],
    molecules: [
      { name: 'Limonene', role: 'iz notu' },
      { name: 'Linalool', role: 'güçlendirici' },
      { name: 'Nootkatone', role: 'iz notu' },
    ],
  },
  blackcurrant_fruity: {
    family: 'Fresh',
    character: 'Ekşi-yeşil cassis etkisiyle modern ve nüfuz eden bir meyve izi üretir.',
    intensity: 'orta',
    season: ['ilkbahar', 'yaz', 'sonbahar'],
    molecules: [
      { name: 'Damascenone', role: 'iz notu' },
      { name: 'Linalool', role: 'güçlendirici' },
      { name: 'Citral', role: 'iz notu' },
    ],
  },
  apple_pineapple_fruity: {
    family: 'Fresh',
    character: 'Parlak ve hafif tatlı meyve tonuyla açılışı daha neşeli hale getirir.',
    intensity: 'hafif',
    season: ['ilkbahar', 'yaz'],
    molecules: [
      { name: 'Linalool', role: 'iz notu' },
      { name: 'Citral', role: 'iz notu' },
      { name: 'Nootkatone', role: 'iz notu' },
    ],
  },
  woody_cedar: {
    family: 'Woody',
    character: 'Kuru ve temiz bir odunsu gövde vererek kompozisyonu sabitler.',
    intensity: 'orta',
    season: ['sonbahar', 'kış', 'ilkbahar'],
    molecules: [
      { name: 'Cedrol', role: 'temel taşıyıcı' },
      { name: 'Cedramber', role: 'güçlendirici' },
      { name: 'Iso E Super', role: 'iz notu' },
    ],
  },
  woody_sandal: {
    family: 'Woody',
    character: 'Kremsi ve yumuşak odunsu imza ile dip notaya konfor verir.',
    intensity: 'orta',
    season: ['sonbahar', 'kış'],
    molecules: [
      { name: 'Alpha-Santalol', role: 'temel taşıyıcı' },
      { name: 'Beta-Santalol', role: 'güçlendirici' },
      { name: 'Ebanol', role: 'iz notu' },
    ],
  },
  woody_patchouli: {
    family: 'Woody',
    character: 'Topraksı-koyu patchouli etkisiyle kompozisyona gövde ve kalıcılık ekler.',
    intensity: 'yoğun',
    season: ['sonbahar', 'kış'],
    molecules: [
      { name: 'Patchoulol', role: 'temel taşıyıcı' },
      { name: 'Alpha-Bulnesene', role: 'güçlendirici' },
      { name: 'Norpatchoulenol', role: 'iz notu' },
    ],
  },
  woody_vetiver: {
    family: 'Woody',
    character: 'Köksü ve hafif dumanlı karakterle erkeksi bir derinlik sağlar.',
    intensity: 'orta',
    season: ['ilkbahar', 'sonbahar', 'kış'],
    molecules: [
      { name: 'Khusimol', role: 'temel taşıyıcı' },
      { name: 'Alpha-Vetivone', role: 'güçlendirici' },
      { name: 'Vetiveryl Acetate', role: 'iz notu' },
    ],
  },
  oud_woody: {
    family: 'Oriental',
    character: 'Reçineli-koyu odunsu doku ile doğu tarzı güçlü bir karakter kurar.',
    intensity: 'çok yoğun',
    season: ['sonbahar', 'kış'],
    molecules: [
      { name: 'Agarospirol', role: 'temel taşıyıcı' },
      { name: 'Alpha-Agarofuran', role: 'güçlendirici' },
      { name: 'Isoagarofuran', role: 'iz notu' },
    ],
  },
  amber_ambroxan: {
    family: 'Oriental',
    character: 'Amberimsi, sıcak ve ten üzerinde uzun kalan modern bir iz oluşturur.',
    intensity: 'yoğun',
    season: ['sonbahar', 'kış'],
    molecules: [
      { name: 'Ambroxide', role: 'temel taşıyıcı' },
      { name: 'Iso E Super', role: 'güçlendirici' },
      { name: 'Cashmeran', role: 'iz notu' },
    ],
  },
  resin_balsamic: {
    family: 'Oriental',
    character: 'Reçineli ve balsamik sıcaklıkla dip notayı koyulaştırır.',
    intensity: 'yoğun',
    season: ['sonbahar', 'kış'],
    molecules: [
      { name: 'Labdanum', role: 'temel taşıyıcı' },
      { name: 'Benzoin', role: 'güçlendirici' },
      { name: 'Vanillin', role: 'iz notu' },
    ],
  },
  incense_smoky: {
    family: 'Oriental',
    character: 'Tütsülü ve kuru reçinemsi bir imza ile manevi/derin bir hava katar.',
    intensity: 'yoğun',
    season: ['sonbahar', 'kış'],
    molecules: [
      { name: 'Olibanol', role: 'temel taşıyıcı' },
      { name: 'Guaiacol', role: 'güçlendirici' },
      { name: 'Labdanum', role: 'iz notu' },
    ],
  },
  gourmand_vanilla: {
    family: 'Gourmand',
    character: 'Sıcak, tatlı ve konforlu gourmand etkisinin ana taşıyıcısıdır.',
    intensity: 'yoğun',
    season: ['sonbahar', 'kış'],
    molecules: [
      { name: 'Vanillin', role: 'temel taşıyıcı' },
      { name: 'Ethyl Vanillin', role: 'güçlendirici' },
      { name: 'Coumarin', role: 'iz notu' },
    ],
  },
  gourmand_tonka: {
    family: 'Gourmand',
    character: 'Bademsi-tatlı tonka etkisiyle dip notada yumuşak bir sıcaklık verir.',
    intensity: 'orta',
    season: ['sonbahar', 'kış'],
    molecules: [
      { name: 'Coumarin', role: 'temel taşıyıcı' },
      { name: 'Vanillin', role: 'iz notu' },
      { name: 'Ethyl Vanillin', role: 'iz notu' },
    ],
  },
  gourmand_cocoa_coffee: {
    family: 'Gourmand',
    character: 'Kavrulmuş, kakao-kahve etkisiyle koyu ve çekici bir tatlılık üretir.',
    intensity: 'yoğun',
    season: ['sonbahar', 'kış'],
    molecules: [
      { name: '2-Acetylpyrazine', role: 'temel taşıyıcı' },
      { name: 'Guaiacol', role: 'güçlendirici' },
      { name: 'Vanillin', role: 'iz notu' },
    ],
  },
  musk_clean: {
    family: 'Fresh',
    character: 'Temiz çamaşır/cilt etkisiyle kompozisyonu yumuşatır ve uzatır.',
    intensity: 'orta',
    season: ['ilkbahar', 'yaz', 'sonbahar', 'kış'],
    molecules: [
      { name: 'Galaxolide', role: 'temel taşıyıcı' },
      { name: 'Habanolide', role: 'güçlendirici' },
      { name: 'Ethylene Brassylate', role: 'iz notu' },
      { name: 'Muscone', role: 'iz notu' },
    ],
  },
  aquatic_marine: {
    family: 'Fresh',
    character: 'Deniz meltemi ve ozonik ferahlıkla modern temiz bir his verir.',
    intensity: 'hafif',
    season: ['yaz', 'ilkbahar'],
    molecules: [
      { name: 'Calone', role: 'temel taşıyıcı' },
      { name: 'Linalool', role: 'iz notu' },
      { name: 'Ambroxide', role: 'iz notu' },
    ],
  },
  chypre_moss: {
    family: 'Chypre',
    character: 'Yosunsu ve mineral-kuru bir dip notayla klasik chypre iskeletini kurar.',
    intensity: 'orta',
    season: ['sonbahar', 'kış', 'ilkbahar'],
    molecules: [
      { name: 'Oakmoss', role: 'temel taşıyıcı' },
      { name: 'Evernyl', role: 'güçlendirici' },
      { name: 'Patchoulol', role: 'iz notu' },
    ],
  },
  leather_smoky: {
    family: 'Oriental',
    character: 'Derimsi-dumanlı karakter ile daha koyu ve maskülen bir profil yaratır.',
    intensity: 'yoğun',
    season: ['sonbahar', 'kış'],
    molecules: [
      { name: 'Birch Tar', role: 'temel taşıyıcı' },
      { name: 'Isobutyl Quinoline', role: 'güçlendirici' },
      { name: 'Safranal', role: 'iz notu' },
    ],
  },
  aldehydic_clean: {
    family: 'Fresh',
    character: 'Parlak sabunsu aldehit etkisiyle kompozisyona hava ve ışık kazandırır.',
    intensity: 'hafif',
    season: ['ilkbahar', 'yaz'],
    molecules: [
      { name: 'Aldehyde C-10', role: 'temel taşıyıcı' },
      { name: 'Aldehyde C-11', role: 'güçlendirici' },
      { name: 'Aldehyde C-12 MNA', role: 'iz notu' },
    ],
  },
  tea_clean: {
    family: 'Fresh',
    character: 'Çay benzeri yeşil ve berrak bir sakinlik etkisi verir.',
    intensity: 'hafif',
    season: ['ilkbahar', 'yaz', 'sonbahar'],
    molecules: [
      { name: 'Linalool', role: 'temel taşıyıcı' },
      { name: 'Nerolidol', role: 'iz notu' },
      { name: 'Farnesol', role: 'iz notu' },
    ],
  },
  fig_green: {
    family: 'Fresh',
    character: 'Sütlü-yeşil incir etkisiyle meyvemsi ama sofistike bir ton kurar.',
    intensity: 'orta',
    season: ['ilkbahar', 'yaz'],
    molecules: [
      { name: 'Cis-3-Hexenol', role: 'temel taşıyıcı' },
      { name: 'Lactones', role: 'güçlendirici' },
      { name: 'Linalool', role: 'iz notu' },
    ],
  },
  lactonic_coconut: {
    family: 'Gourmand',
    character: 'Kremamsı-sütlü dokuyla tropikal ve yumuşak bir gourmand his verir.',
    intensity: 'orta',
    season: ['yaz', 'sonbahar'],
    molecules: [
      { name: 'Gamma-Nonalactone', role: 'temel taşıyıcı' },
      { name: 'Delta-Decalactone', role: 'güçlendirici' },
      { name: 'Vanillin', role: 'iz notu' },
    ],
  },
  honey_balsamic: {
    family: 'Gourmand',
    character: 'Balımsı, sıcak ve reçineli bir katmanla yoğunluk ve kalıcılık sağlar.',
    intensity: 'yoğun',
    season: ['sonbahar', 'kış'],
    molecules: [
      { name: 'Benzoin', role: 'temel taşıyıcı' },
      { name: 'Vanillin', role: 'güçlendirici' },
      { name: 'Coumarin', role: 'iz notu' },
    ],
  },
  anisic_heliotrope: {
    family: 'Floral',
    character: 'Pudramsı-anasonik floral tonla nostaljik ve zarif bir doku verir.',
    intensity: 'orta',
    season: ['ilkbahar', 'sonbahar'],
    molecules: [
      { name: 'Heliotropin', role: 'temel taşıyıcı' },
      { name: 'Anisyl Alcohol', role: 'güçlendirici' },
      { name: 'Vanillin', role: 'iz notu' },
    ],
  },
  ambergris_modern: {
    family: 'Oriental',
    character: 'Mineral, sıcak ve modern ambergris hissiyle difüzyonu artırır.',
    intensity: 'orta',
    season: ['sonbahar', 'kış', 'ilkbahar'],
    molecules: [
      { name: 'Ambroxide', role: 'temel taşıyıcı' },
      { name: 'Cashmeran', role: 'güçlendirici' },
      { name: 'Galaxolide', role: 'iz notu' },
    ],
  },
};

const NOTE_GROUPS = [
  { profile: 'bergamot_citrus', notes: ['bergamot', 'calabrian bergamot', 'sicilian bergamot', 'lime', 'citron', 'yuzu', 'pomelo'] },
  { profile: 'lemon_citrus', notes: ['lemon', 'limon', 'limon zest', 'lemon peel', 'verbena', 'litsea cubeba', 'lemongrass'] },
  { profile: 'orange_citrus', notes: ['orange', 'portakal', 'mandarin', 'mandarin orange', 'blood orange', 'sweet orange', 'bitter orange', 'clementine', 'grapefruit', 'pink grapefruit', 'tangerine', 'kumquat', 'orange zest'] },
  { profile: 'neroli_orange_blossom', notes: ['neroli', 'orange blossom', 'portakal cicegi', 'petitgrain', 'bigarade', 'seville orange blossom'] },
  { profile: 'aromatic_lavender', notes: ['lavender', 'lavanta', 'lavandin', 'clary sage', 'sage', 'ada cayi', 'rosemary', 'biberiye', 'thyme', 'kekik', 'fougere accord'] },
  { profile: 'herbal_green', notes: ['basil', 'feslegen', 'mint', 'nane', 'spearmint', 'peppermint', 'eucalyptus', 'camphor', 'green leaves', 'leafy greens', 'cut grass', 'tomato leaf', 'shiso'] },
  { profile: 'spicy_pepper', notes: ['pepper', 'karabiber', 'black pepper', 'pink pepper', 'white pepper', 'sichuan pepper', 'allspice', 'pimento'] },
  { profile: 'spicy_cardamom', notes: ['cardamom', 'kakule', 'green cardamom', 'juniper', 'juniper berries', 'gin accord'] },
  { profile: 'spicy_warm', notes: ['cinnamon', 'tarcin', 'clove', 'karanfil', 'nutmeg', 'muscat', 'ginger', 'zencefil', 'saffron', 'zaferan', 'anise', 'star anise'] },
  { profile: 'rose_floral', notes: ['rose', 'gul', 'turkish rose', 'damask rose', 'rose petals', 'may rose', 'bulgarian rose', 'peony', 'sardunya'] },
  { profile: 'jasmine_floral', notes: ['jasmine', 'yasemin', 'jasmine sambac', 'jasmine grandiflorum', 'magnolia', 'freesia', 'gardenia', 'hedione'] },
  { profile: 'powdery_iris', notes: ['iris', 'orris', 'orris root', 'violet', 'menekse', 'violet leaf', 'powdery notes', 'lipstick accord'] },
  { profile: 'white_floral_creamy', notes: ['ylang-ylang', 'ylang', 'tuberose', 'lily', 'lily of the valley', 'muguet', 'champaca', 'frangipani', 'honeysuckle', 'narcissus'] },
  { profile: 'fruity_fresh', notes: ['pear', 'armut', 'melon', 'cucumber', 'watermelon', 'kiwi', 'lychee', 'litchi', 'guava', 'passion fruit', 'raspberry', 'strawberry', 'cherry', 'cranberry', 'pomegranate'] },
  { profile: 'blackcurrant_fruity', notes: ['blackcurrant', 'cassis', 'red currant', 'gooseberry'] },
  { profile: 'apple_pineapple_fruity', notes: ['apple', 'elma', 'pineapple', 'ananas', 'apricot', 'kayisi', 'peach', 'seftali', 'plum', 'erik', 'nectarine', 'mango', 'papaya'] },
  { profile: 'woody_cedar', notes: ['cedar', 'sedir', 'cedarwood', 'atlas cedar', 'virginia cedar', 'hinoki', 'cypress', 'selvi', 'guaiac wood'] },
  { profile: 'woody_sandal', notes: ['sandalwood', 'sandal', 'sandal agaci', 'amyris', 'ebanol', 'javanol'] },
  { profile: 'woody_patchouli', notes: ['patchouli', 'paçuli', 'dark patchouli', 'earthy notes', 'soil tincture'] },
  { profile: 'woody_vetiver', notes: ['vetiver', 'haitian vetiver', 'java vetiver', 'smoky woods', 'dry woods', 'woody notes', 'cypress wood'] },
  { profile: 'oud_woody', notes: ['oud', 'ud', 'agarwood', 'agar agaci', 'white oud', 'dark oud', 'royal oud'] },
  { profile: 'amber_ambroxan', notes: ['ambroxan', 'amber', 'amber accord', 'amberwood', 'ambery woods', 'cashmeran', 'iso e super', 'dry amber'] },
  { profile: 'resin_balsamic', notes: ['labdanum', 'benzoin', 'tolu balsam', 'peru balsam', 'opoponax', 'storax', 'styrax', 'balsamic notes'] },
  { profile: 'incense_smoky', notes: ['frankincense', 'gunluk', 'incense', 'myrrh', 'tutsu', 'church incense', 'elemi', 'olibanum'] },
  { profile: 'gourmand_vanilla', notes: ['vanilla', 'vanilya', 'madagascar vanilla', 'bourbon vanilla', 'vanilla absolute', 'caramel', 'toffee', 'brown sugar', 'maple syrup'] },
  { profile: 'gourmand_tonka', notes: ['tonka bean', 'tonka', 'heliotrope', 'almond', 'badem', 'marzipan'] },
  { profile: 'gourmand_cocoa_coffee', notes: ['coffee', 'kahve', 'espresso', 'cacao', 'cocoa', 'chocolate', 'dark chocolate', 'mocha', 'hazelnut', 'rum', 'whisky'] },
  { profile: 'musk_clean', notes: ['musk', 'misk', 'white musk', 'clean musk', 'skin musk', 'cotton musk', 'powder musk', 'galaxolide'] },
  { profile: 'aquatic_marine', notes: ['marine notes', 'aquatic notes', 'sea salt', 'deniz tuzu', 'ozonic notes', 'ocean air', 'sea breeze', 'mineral notes'] },
  { profile: 'chypre_moss', notes: ['oakmoss', 'meşe yosunu', 'moss', 'lichen', 'chypre accord', 'forest floor', 'green moss'] },
  { profile: 'leather_smoky', notes: ['leather', 'deri', 'suede', 'smoked leather', 'tar', 'birch tar', 'animalic leather'] },
  { profile: 'aldehydic_clean', notes: ['aldehydes', 'aldehydic notes', 'soap accord', 'clean linen', 'airy aldehydes'] },
  { profile: 'tea_clean', notes: ['green tea', 'black tea', 'tea notes', 'mate', 'yerba mate', 'earl grey', 'oolong tea'] },
  { profile: 'fig_green', notes: ['fig', 'incir', 'fig leaf', 'fig milk', 'green fig', 'galbanum', 'asparagus accord'] },
  { profile: 'lactonic_coconut', notes: ['coconut', 'hindistan cevizi', 'coconut milk', 'milk notes', 'creamy notes', 'rice pudding accord'] },
  { profile: 'honey_balsamic', notes: ['honey', 'bal', 'beeswax', 'propolis', 'dates', 'dried fruits'] },
  { profile: 'anisic_heliotrope', notes: ['heliotrope', 'pudra', 'powder', 'anisic notes', 'mimosa'] },
  { profile: 'ambergris_modern', notes: ['ambergris', 'ambre gris', 'gris amber', 'salted amber', 'mineral amber'] },
];

function readMoleculeCatalog() {
  if (!fs.existsSync(MOLECULES_PATH)) return [];
  const raw = JSON.parse(fs.readFileSync(MOLECULES_PATH, 'utf8'));
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.molecules)) return raw.molecules;
  return [];
}

function buildMoleculeIndex(molecules) {
  const index = new Map();
  molecules.forEach((entry) => {
    const name = cleanString(entry?.name);
    if (!name) return;
    const key = normalizeText(name);
    if (!key) return;
    if (!index.has(key)) index.set(key, entry);
  });
  return index;
}

function toTitleCase(value) {
  const text = cleanString(value);
  if (!text) return '';
  return text
    .split(/\s+/)
    .map((part) => (part.length <= 2 ? part.toUpperCase() : part[0].toUpperCase() + part.slice(1).toLowerCase()))
    .join(' ');
}

function resolveMoleculeMeta(moleculeName, moleculeIndex, fallbackDescriptor, fallbackRole) {
  const cleanName = cleanString(moleculeName);
  const hit = moleculeIndex.get(normalizeText(cleanName));
  const prettyName = cleanName.includes('Iso E Super') ? 'Iso E Super' : toTitleCase(cleanName).replace('Iso E Super', 'Iso E Super');
  const cas = cleanString(hit?.cas_number) || CAS_FALLBACK[prettyName] || null;
  const odorDescriptor =
    cleanString(hit?.odor_description)
      .split(',')
      .map((part) => cleanString(part))
      .filter(Boolean)
      .slice(0, 4)
      .join(', ') ||
    ODOR_FALLBACK[prettyName] ||
    fallbackDescriptor ||
    'karakteristik koku taşıyıcısı';

  return {
    name: prettyName,
    cas,
    role: fallbackRole,
    odor_descriptor: odorDescriptor,
  };
}

function buildMap() {
  const molecules = readMoleculeCatalog();
  const moleculeIndex = buildMoleculeIndex(molecules);
  const map = {};
  const seen = new Set();

  NOTE_GROUPS.forEach((group) => {
    const profile = PROFILE_LIBRARY[group.profile];
    if (!profile) return;
    const moleculesForProfile = profile.molecules.map((item) =>
      resolveMoleculeMeta(item.name, moleculeIndex, item.odor_descriptor, item.role),
    );

    group.notes.forEach((note) => {
      const key = normalizeText(note);
      if (!key || seen.has(key)) return;
      seen.add(key);
      map[key] = {
        family: profile.family,
        character: profile.character,
        key_molecules: moleculesForProfile,
        intensity: profile.intensity,
        season: profile.season,
        accord_family: profile.family,
        molecules: moleculesForProfile.map((item) => item.name),
      };
    });
  });

  return map;
}

function main() {
  const map = buildMap();
  const keys = Object.keys(map).sort((a, b) => a.localeCompare(b));
  const sorted = {};
  keys.forEach((key) => {
    sorted[key] = map[key];
  });

  if (keys.length < 200) {
    throw new Error(`Beklenen minimum 200 nota, ancak ${keys.length} bulundu.`);
  }

  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(sorted, null, 2)}\n`, 'utf8');
  console.log(`[nota-map] yazildi: ${OUTPUT_PATH}`);
  console.log(`[nota-map] toplam nota: ${keys.length}`);
}

main();
