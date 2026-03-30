export const UI = {
  analyzeBtn: 'Kokuyu Analiz Et',
  analyzing: 'Yapay zeka analiz ediyor...',
  analysisSteps: 'Profil cozumleme, nota piramidi ve molekul katmani olusturuluyor.',

  photoTab: 'Fotograf',
  textTab: 'Metin',
  notesTab: 'Nota Listesi',
  photoPlaceholder: 'Fotograf cek veya sec',
  textPlaceholder: "Dior Sauvage, taze deniz esintisi veya 'odunsu ama cok agir degil'...",
  notesPlaceholder: 'Notalari virgulle ayirarak gir',
  notesHelper: 'Ornek: tutun, vanilya, bergamot',

  newAnalysis: 'Yeni Analiz',
  history: 'Koku Gecmisi',
  compare: 'Karsilastir',
  wardrobe: 'Koku Dolabim',
  wearTracker: 'Koku Rutinim',
  layeringLab: 'Layering Lab',
  noteFinder: 'Nota Avcisi',
  barcodeScanner: 'Barkod Tara',
  feed: 'Koku Akisi',

  detectedScent: 'Tespit Edilen Koku',
  scentDescription: 'Koku Aciklamasi',
  pyramid: 'Koku Piramidi',
  topNote: 'Ust',
  heartNote: 'Kalp',
  baseNote: 'Alt',
  wheel: 'Koku Carki',
  keyMolecules: 'Anahtar Molekuller',
  similarScents: 'Benzer Profil Onerileri',
  communityPulse: 'Topluluk Nabzi',
  suitability: 'Bu Profil Nasil Oturur?',

  addToWardrobe: 'Dolaba Ekle',
  compareBtn: 'Karsilastir',
  layerBtn: 'Katmanla',
  saveResult: 'Kaydet',
  newAnalysisBtn: 'Yeni Analiz Yap',
  clearHistory: 'Gecmisi Temizle',

  login: 'Giris Yap',
  register: 'Kayit Ol',
  logout: 'Cikis Yap',
  city: 'Sehir',
  budgetRange: 'Butce Araligi',
  saveProfile: 'Profili Kaydet',

  quickStart: 'Hizli Baslangic',
  quickStartSub: '2 dakikada profiline uygun deneyimi acalim.',
  skip: 'Gec',
  skipForNow: 'Simdilik Gec',
  scentGoal: 'Koku Amacin',
  budgetBand: 'Butce Bandi',
  favoriteFamily: 'Favori Aileler',
  saveAndContinue: 'Kaydet ve Devam',
  prepareFirstAnalysis: 'Ilk Analizi Hazirla',

  upgradeToPro: "Pro'ya Gec",
  proLabel: 'Pro',

  chipSuggestions: 'Populer aramalar',

  emptyWardrobe: 'Dolabin henuz bos',
  emptyWardrobeSub: 'Analiz yaptikca parfumlerini dolaba ekleyebilirsin.',
  emptyCommunity: 'Henuz topluluk sinyali yok',
  emptyCommunitySub: 'Ilk geri bildirimi sen birak.',
  wearTrackerSub: 'Yeterli veri olusunca burada kisisel rutin ozetin gorunecek.',

  dailyUsage: 'Gunluk analiz',

  barcodeManual: 'Barkod (manuel)',
  barcodeSearch: 'Barkodu Ara',

  includeNotes: 'Dahil notalar',
  excludeNotes: 'Haric notalar',
  maxSweetness: 'Maks. tatlilik (0-100)',
  targetSweetness: 'Hedef tatlilik (0-100)',
  getResults: 'Sonuclari Getir',

  leftScent: 'Sol parfum',
  rightScent: 'Sag parfum',
  analyzeLayering: 'Katmanlamayi Analiz Et',
} as const;

export type UIKey = keyof typeof UI;
