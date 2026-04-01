import { AppShell } from '@/components/AppShell';
import { MoleculeExplorerClient } from '@/components/MoleculeExplorerClient';
import { TopBar } from '@/components/TopBar';
import { getPublicMolecules } from '@/lib/catalog-public';

export default function NotalarPage() {
  const molecules = getPublicMolecules();

  return (
    <AppShell>
      <TopBar title="Molekül Keşfi" />
      <div className="px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
        <div className="mx-auto max-w-[1240px]">
          <MoleculeExplorerClient molecules={molecules} />
        </div>
      </div>
    </AppShell>
  );
}
