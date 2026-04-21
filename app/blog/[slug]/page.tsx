import type { Route } from 'next';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { BLOG_POSTS } from '../posts';

interface Props {
  params: { slug: string };
}

export async function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = BLOG_POSTS.find((p) => p.slug === params.slug);
  if (!post) return { title: 'Yazı bulunamadı' };
  return {
    title: post.title,
    description: post.description,
    openGraph: { title: `${post.title} — Koku Dedektifi`, description: post.description },
  };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default async function BlogPostPage({ params }: Props) {
  const post = BLOG_POSTS.find((p) => p.slug === params.slug);
  if (!post) notFound();

  let PostContent: React.ComponentType;
  try {
    const mod = await import(`@/app/blog/content/${post.slug}.mdx`);
    PostContent = mod.default as React.ComponentType;
  } catch {
    notFound();
  }

  return (
    <>
      <div className="mb-4 flex items-center gap-2.5">
        <div className="h-px w-5 bg-[var(--gold-line)]" />
        <Link href={'/blog' as Route} className="text-[9px] font-mono uppercase tracking-[.16em] text-muted hover:text-gold transition-colors">
          ← Blog
        </Link>
      </div>

      <div className="mb-2 flex flex-wrap gap-1.5">
        {post.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-[var(--gold-line)]/30 bg-[var(--gold-dim)]/10 px-2 py-0.5 text-[9px] font-mono uppercase tracking-[.1em] text-gold/70"
          >
            {tag}
          </span>
        ))}
      </div>

      <h1 className="mb-3 text-[2rem] font-semibold leading-[1.1] text-cream">{post.title}</h1>
      <p className="mb-10 text-[11px] font-mono text-muted">
        {formatDate(post.date)} · {post.readingMinutes} dk okuma
      </p>

      <PostContent />
    </>
  );
}
