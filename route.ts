import { getInstance } from '@/lib/db';
import { getSponsors } from '@/lib/outputs';

export const dynamic = 'force-dynamic';

const cell = (v: unknown) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const instance = await getInstance(slug);
  if (!instance) return new Response('not found', { status: 404 });

  const sponsors = await getSponsors(instance.id);
  const rows = [
    ['org', 'tier', 'amount', 'status', 'contact_name', 'contact_email',
     'benefits_total', 'benefits_delivered', 'note'],
    ...sponsors.map((s) => [
      s.org, s.tier, s.amount, s.status, s.contact_name ?? '', s.contact_email ?? '',
      s.benefits.length, s.benefits.filter((b) => b.done).length, s.note ?? '',
    ]),
  ];
  return new Response(rows.map((r) => r.map(cell).join(',')).join('\n'), {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${slug}-sponsors.csv"`,
    },
  });
}
