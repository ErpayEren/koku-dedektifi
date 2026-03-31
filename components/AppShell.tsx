import { MobileNav } from './MobileNav';
import { Sidebar } from './Sidebar';

export function AppShell({
  children,
  hideSidebar = false,
}: {
  children: React.ReactNode;
  hideSidebar?: boolean;
}) {
  return (
    <div className="flex min-h-screen relative z-10">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -left-28 bottom-16 w-[360px] h-[360px] rounded-full bg-[radial-gradient(circle,rgba(126,184,164,.12)_0%,rgba(126,184,164,0)_70%)] animate-[aura-breathe_24s_ease-in-out_infinite]" />
        <div className="absolute right-8 top-24 w-[280px] h-[280px] rounded-full bg-[radial-gradient(circle,rgba(201,169,110,.11)_0%,rgba(201,169,110,0)_72%)] animate-[aura-breathe_20s_ease-in-out_infinite]" />
      </div>
      {hideSidebar ? null : <Sidebar />}
      <main className="flex-1 flex flex-col overflow-y-auto pb-[var(--mobile-nav-h)] md:pb-0">{children}</main>
      <MobileNav />
    </div>
  );
}
