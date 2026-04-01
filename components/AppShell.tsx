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
    <div className="relative z-10 mx-auto flex w-full flex-col md:min-h-screen md:flex-row lg:max-w-[1400px]">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute bottom-16 -left-28 h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle,rgba(126,184,164,.12)_0%,rgba(126,184,164,0)_70%)] animate-[aura-breathe_24s_ease-in-out_infinite]" />
        <div className="absolute right-8 top-24 h-[280px] w-[280px] rounded-full bg-[radial-gradient(circle,rgba(201,169,110,.11)_0%,rgba(201,169,110,0)_72%)] animate-[aura-breathe_20s_ease-in-out_infinite]" />
      </div>

      {hideSidebar ? null : <Sidebar />}

      <main className="order-1 flex min-h-0 flex-col pb-24 md:order-2 md:flex-1 md:overflow-y-auto md:pb-0">
        {children}
      </main>

      <MobileNav />
    </div>
  );
}
