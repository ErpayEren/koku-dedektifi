export const UI = {
  analyzeBtn: 'Kokuyu Analiz Et',
  analyzing: 'Yapay zeka analiz ediyor...',
  analysisSteps: 'Profil çözümleme, nota piramidi ve molekül katmanı oluşturuluyor.',

  photoTab: 'Fotoğraf',
  textTab: 'Metin',
  notesTab: 'Nota Listesi',
  photoPlaceholder: 'Fotoğraf çek veya seç',
  textPlaceholder: "Dior Sauvage, taze deniz esintisi veya 'odunsu ama çok ağır değil'...",
  notesPlaceholder: 'Notaları virgülle ayırarak gir',
  notesHelper: 'Örnek: tütün, vanilya, bergamot',

  newAnalysis: 'Yeni Analiz',
  history: 'Koku Geçmişi',
  compare: 'Karşılaştır',
  wardrobe: 'Koku Dolabım',
  wearTracker: 'Koku Rutinim',
  layeringLab: 'Layering Lab',
  noteFinder: 'Nota Avcısı',
  barcodeScanner: 'Barkod Tara',
  feed: 'Koku Akışı',

  detectedScent: 'Tespit Edilen Koku',
  scentDescription: 'Koku Açıklaması',
  pyramid: 'Koku Piramidi',
  topNote: 'Üst',
  heartNote: 'Kalp',
  baseNote: 'Alt',
  wheel: 'Koku Çarkı',
  keyMolecules: 'Anahtar Moleküller',
  similarScents: 'Benzer Profil Önerileri',
  communityPulse: 'Topluluk Nabzı',
  suitability: 'Sana Yakışır mı?',

  addToWardrobe: 'Dolaba Ekle',
  compareBtn: 'Karşılaştır',
  layerBtn: 'Katmanla',
  saveResult: 'Kaydet',
  newAnalysisBtn: 'Yeni Analiz Yap',
  clearHistory: 'Geçmişi Temizle',

  login: 'Giriş Yap',
  register: 'Kayıt Ol',
  logout: 'Çıkış Yap',
  city: 'Şehir',
  budgetRange: 'Bütçe Aralığı',
  saveProfile: 'Profili Kaydet',

  quickStart: 'Hızlı Başlangıç',
  quickStartSub: '2 dakikada profiline uygun deneyimi açalım.',
  skip: 'Geç',
  skipForNow: 'Şimdilik Geç',
  scentGoal: 'Koku Amacın',
  budgetBand: 'Bütçe Bandı',
  favoriteFamily: 'Favori Aileler',
  saveAndContinue: 'Kaydet ve Devam',
  prepareFirstAnalysis: 'İlk Analizi Hazırla',

  upgradeToPro: "Pro'ya Geç",
  proLabel: 'Pro',

  chipSuggestions: 'Popüler aramalar',

  emptyWardrobe: 'Dolabın henüz boş',
  emptyWardrobeSub: 'Analiz yaptıkça parfümlerini dolaba ekleyebilirsin.',
  emptyCommunity: 'Henüz topluluk sinyali yok',
  emptyCommunitySub: 'İlk geri bildirimi sen bırak.',
  wearTrackerSub: 'Yeterli veri oluşunca burada kişisel rutin özetin görünecek.',

  dailyUsage: 'Günlük analiz',

  barcodeManual: 'Barkod (manuel)',
  barcodeSearch: 'Barkodu Ara',

  includeNotes: 'Dahil notalar',
  excludeNotes: 'Hariç notalar',
  maxSweetness: 'Maks. tatlılık (0-100)',
  targetSweetness: 'Hedef tatlılık (0-100)',
  getResults: 'Sonuçları Getir',

  leftScent: 'Sol parfüm',
  rightScent: 'Sağ parfüm',
  analyzeLayering: 'Katmanlamayı Analiz Et',
} as const;

export type UIKey = keyof typeof UI;
