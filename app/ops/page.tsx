import { OpsClient } from './OpsClient';

export const metadata = { title: 'Ops Panel - Koku Dedektifi' };
export const dynamic = 'force-dynamic';

export default function OpsPage() {
  return <OpsClient />;
}

