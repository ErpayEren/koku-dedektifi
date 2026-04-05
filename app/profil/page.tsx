import ProfilePageClient from '@/components/profile/ProfilePageClient';

export default function ProfilPage({
  searchParams,
}: {
  searchParams?: { redirect?: string };
}) {
  return <ProfilePageClient redirectTarget={searchParams?.redirect || ''} />;
}
