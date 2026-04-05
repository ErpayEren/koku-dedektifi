import dynamic from 'next/dynamic';
import { AppShell } from '@/components/AppShell';
import { NoteFinderLab } from '@/components/NoteFinderLab';
import { TopBar } from '@/components/TopBar';
import { getPublicMolecules } from '@/lib/catalog-public';

const MoleculeExplorerClient = dynamic(
  () => import('@/components/MoleculeExplorerClient').then((module) => module.MoleculeExplorerClient),
  {
    ssr: false,
    loading: () => (
      <div className="grid grid-cols-1 gap-5 px-4 py-4 sm:px-6 sm:py-5 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-8 lg:py-6">
        <div className="rounded-[24px] border border-white/8 bg-white/[.03] p-6" />
        <div className="min-h-[520px] rounded-[24px] border border-white/8 bg-white/[.03] p-6" />
      </div>
    ),
  },
);

export default function NotalarPage() {
  const molecules = getPublicMolecules();

  return (
    <AppShell>
      <TopBar title="Nota Avcısı" />
      <div className="px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
        <div className="mx-auto max-w-[1240px]">
          <NoteFinderLab />
          <MoleculeExplorerClient molecules={molecules} />
        </div>
      </div>
    </AppShell>
  );
}
