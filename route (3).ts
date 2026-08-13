import { getInstance } from '@/lib/db';
import { getBudget } from '@/lib/outputs';

export const dynamic = 'force-dynamic';

const cell = (v: unknown) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const instance = await getInstance(slug);
  if (!instance) return new Response('not found', { status: 404 });

  const lines = await getBudget(instance.id);
  const rows = [
    ['kind', 'category', 'label', 'planned', 'actual', 'month', 'note'],
    ...lines.map((l) => [l.kind, l.category, l.label, l.planned, l.actual ?? '', l.month ?? '', l.note ?? '']),
  ];
  return new Response(rows.map((r) => r.map(cell).join(',')).join('\n'), {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${slug}-budget.csv"`,
    },
  });
}
