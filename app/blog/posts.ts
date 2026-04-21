export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  readingMinutes: number;
  tags: string[];
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'parfum-molekulleri-nedir',
    title: 'Parfüm Molekülleri Nedir? Koku Kimyasına Giriş',
    description: 'Linalool&apos;den ISO E Super&apos;e: günlük hayatınızdaki kokular aslında hangi moleküllerden oluşuyor?',
    date: '2026-04-10',
    readingMinutes: 6,
    tags: ['kimya', 'moleküller', 'temel'],
  },
  {
    slug: 'guven-skoru-nasil-hesaplanir',
    title: 'Güven Skoru Nasıl Hesaplanır?',
    description: 'Koku Dedektifi analizlerindeki 0–100 güven skorunun arkasındaki formül ve kanıt seviyeleri.',
    date: '2026-04-15',
    readingMinutes: 4,
    tags: ['teknoloji', 'ai', 'güven skoru'],
  },
  {
    slug: 'amberwood-ailesi-rehberi',
    title: 'Amberwood Ailesi: Oud, Vetiver ve Sandal Ağacı',
    description: 'Dip notaların en gizem dolu kategorisi: amberwood koku ailesinin moleküler portresi.',
    date: '2026-04-18',
    readingMinutes: 7,
    tags: ['koku ailesi', 'amberwood', 'oud'],
  },
];
