import { AppShell } from '@/components/AppShell';
import { LegalFooter } from '@/components/LegalFooter';
import { TopBar } from '@/components/TopBar';

export default function BlogPostLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell hideSidebar>
      <TopBar title="Blog" />
      <main className="px-4 py-8 pb-24 sm:px-6 md:px-12 md:py-10">
        <div className="anim-up mx-auto w-full max-w-2xl">
          <div className="prose-kd">{children}</div>
        </div>
      </main>
      <LegalFooter />
    </AppShell>
  );
}
