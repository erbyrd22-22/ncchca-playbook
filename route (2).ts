import { getInstance } from '@/lib/db';
import { getSchedule } from '@/lib/outputs';

export const dynamic = 'force-dynamic';

const esc = (s: string) =>
  s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** One all-day VEVENT per dated task. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const instance = await getInstance(slug);
  if (!instance) return new Response('not found', { status: 404 });

  const { tasks } = await getSchedule(instance.id, instance.template_id);
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const day = (iso: string) => iso.slice(0, 10).replace(/-/g, '');
  const next = (iso: string) => {
    const d = new Date(iso + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10).replace(/-/g, '');
  };

  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0',
    'PRODID:-//NCCHCA//Conference & Event Playbook//EN',
    'CALSCALE:GREGORIAN', `X-WR-CALNAME:${esc(instance.name)}`,
  ];
  for (const t of tasks) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${t.id}@ncchca-playbook`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${day(t.due)}`,
      `DTEND;VALUE=DATE:${next(t.due)}`,
      `SUMMARY:${esc(t.label.slice(0, 120))}`,
      `DESCRIPTION:${esc(`${t.section} — ${t.phase}${t.owner ? ` · ${t.owner}` : ''}${t.done ? ' · complete' : ''}`)}`,
      `STATUS:${t.done ? 'CONFIRMED' : 'TENTATIVE'}`,
      'END:VEVENT'
    );
  }
  lines.push('END:VCALENDAR');

  return new Response(lines.join('\r\n'), {
    headers: {
      'content-type': 'text/calendar; charset=utf-8',
      'content-disposition': `attachment; filename="${slug}-schedule.ics"`,
    },
  });
}
