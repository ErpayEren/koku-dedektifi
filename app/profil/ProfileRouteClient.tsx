'use client';

import { useSearchParams } from 'next/navigation';
import ProfilePageClient from '@/components/profile/ProfilePageClient';

export default function ProfileRouteClient() {
  const searchParams = useSearchParams();
  return <ProfilePageClient redirectTarget={searchParams.get('redirect') || ''} />;
}
