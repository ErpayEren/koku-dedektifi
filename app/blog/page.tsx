import type { Route } from 'next';
import type { Metadata } from 'next';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { TopBar } from '@/components/TopBar';
import { BLOG_POSTS } from './posts';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Parfüm kimyası, moleküller ve koku teknolojisi hakkında yazılar.',
  openGraph: {
    title: 'Blog — Koku Dedektifi',
    description: 'Parfüm kimyası, moleküller ve koku teknolojisi hakkında yazılar.',
  },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function BlogPage() {
  return (
    <AppShell hideSidebar>
      <TopBar title="Blog" />
      <main className="px-4 py-8 pb-24 sm:px-6 md:px-12 md:py-10">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8 flex items-center gap-2.5">
            <div className="h-px w-7 bg-[var(--gold-line)]" />
            <span className="text-[10px] font-mono uppercase tracking-[.16em] text-muted">Koku Dedektifi Blog</span>
          </div>

          <h1 className="mb-10 text-[2.4rem] font-semibold leading-[1.08] text-cream">
            Koku &amp; Kimya
          </h1>

          <ul className="space-y-8">
            {BLOG_POSTS.map((post) => (
              <li key={post.slug}>
                <Link href={`/blog/${post.slug}` as Route} className="group block">
                  <article className="rounded-2xl border border-white/[.06] bg-white/[.02] p-5 transition-colors hover:border-[var(--gold-line)]/40 hover:bg-white/[.04]">
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
                    <h2 className="text-[1.2rem] font-semibold leading-snug text-cream group-hover:text-gold transition-colors">
                      {post.title}
                    </h2>
                    <p className="mt-2 text-[13px] leading-relaxed text-muted">{post.description}</p>
                    <div className="mt-3 flex items-center gap-3 text-[11px] font-mono text-muted/60">
                      <span>{formatDate(post.date)}</span>
                      <span>·</span>
                      <span>{post.readingMinutes} dk okuma</span>
                    </div>
                  </article>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </AppShell>
  );
}
