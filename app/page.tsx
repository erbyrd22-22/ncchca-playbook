import { redirect } from 'next/navigation';
import { getInstances } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const list = await getInstances();
  if (!list.length) return <p style={{ padding: 40 }}>No instances yet. Run <code>npm run seed</code>.</p>;
  redirect(`/i/${list[0].slug}/overview`);
}
