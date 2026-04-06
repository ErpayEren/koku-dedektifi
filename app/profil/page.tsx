import { Suspense } from 'react';
import ProfilePageClient from '@/components/profile/ProfilePageClient';
import ProfileRouteClient from './ProfileRouteClient';

export default function ProfilPage() {
  return (
    <Suspense fallback={<ProfilePageClient redirectTarget="" />}>
      <ProfileRouteClient />
    </Suspense>
  );
}
