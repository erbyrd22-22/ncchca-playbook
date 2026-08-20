import { NextResponse } from 'next/server';
import { getInstance, getProgress } from '@/lib/db';
import { getRegistry, getBudget, getSponsors, getSchedule } from '@/lib/outputs';

export const dynamic = 'force-dynamic';

const NL = String.fromCharCode(10);
const CRLF = String.fromCharCode(13) + String.fromCharCode(10);

const cell = (v: unknown) => {
  const s = v == null ? '' : String(v);
  return /[",]/.test(s) || s.includes(NL) ? '"' + s.replace(/"/g, '""') + '"' : s;
};

const csv = (rows: unknown[][], name: string) =>
  new Response(rows.map((r) => r.map(cell).join(',')).join(NL), {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="' + name + '"',
    },
  });

const icsEsc = (s: string) => s.replace(/;/g, ' ').replace(/,/g, ' ').split(NL).join(' ');

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string; kind: string }> }) {
  const { slug, kind } = await params;
  const instance = await getInstance(slug);
  if (!instance) return NextResponse.json({ error: 'not found' }, { status: 404 });

  if (kind === 'feed') {
    const [reg, sponsors, sched, progress] = await Promise.all([
      getRegistry(slug), getSponsors(instance.id),
      getSchedule(instance.id, instance.template_id), getProgress(instance.id),
    ]);
    const done = sched.tasks.filter((t) => t.done).length;
    return NextResponse.json({
      event: {
        name: reg?.name, slug, tier: reg?.tier, status: reg?.status,
        date: reg?.event_date, venue: reg?.venue,
        registration: { opens: reg?.registration_opens, closes: reg?.registration_closes },
        attendance_target: reg?.attendance_target,
      },
      supporters: sponsors
        .filter((s) => s.status === 'committed' || s.status === 'paid')
        .map((s) => ({ org: s.org, tier: s.tier })),
      planning: {
        tasks_total: sched.tasks.length,
        tasks_complete: done,
        pct_complete: sched.tasks.length ? Math.round((done / sched.tasks.length) * 100) : null,
        sections: progress,
      },
      generated_at: new Date().toISOString(),
    });
  }

  if (kind === 'budget') {
    const lines = await getBudget(instance.id);
    return csv([
      ['kind', 'category', 'label', 'planned', 'actual', 'month', 'note'],
      ...lines.map((l) => [l.kind, l.category, l.label, l.planned, l.actual ?? '', l.month ?? '', l.note ?? '']),
    ], slug + '-budget.csv');
  }

  if (kind === 'sponsors') {
    const sponsors = await getSponsors(instance.id);
    return csv([
      ['org', 'tier', 'amount', 'status', 'contact_name', 'contact_email', 'benefits_total', 'benefits_delivered', 'note'],
      ...sponsors.map((s) => [
        s.org, s.tier, s.amount, s.status, s.contact_name ?? '', s.contact_email ?? '',
        s.benefits.length, s.benefits.filter((b) => b.done).length, s.note ?? '',
      ]),
    ], slug + '-sponsors.csv');
  }

  if (kind === 'schedule') {
    const { tasks } = await getSchedule(instance.id, instance.template_id);
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    const day = (iso: string) => iso.slice(0, 10).replace(/-/g, '');
    const nextDay = (iso: string) => {
      const d = new Date(iso + 'T00:00:00Z');
      d.setUTCDate(d.getUTCDate() + 1);
      return d.toISOString().slice(0, 10).replace(/-/g, '');
    };
    const out = [
      'BEGIN:VCALENDAR', 'VERSION:2.0',
      'PRODID:-//NCCHCA//Event Playbook//EN', 'CALSCALE:GREGORIAN',
      'X-WR-CALNAME:' + icsEsc(instance.name),
    ];
    for (const t of tasks) {
      out.push(
        'BEGIN:VEVENT',
        'UID:' + t.id + '@ncchca-playbook',
        'DTSTAMP:' + stamp,
        'DTSTART;VALUE=DATE:' + day(t.due),
        'DTEND;VALUE=DATE:' + nextDay(t.due),
        'SUMMARY:' + icsEsc(t.label.slice(0, 120)),
        'DESCRIPTION:' + icsEsc(t.section + ' - ' + t.phase + (t.owner ? ' - ' + t.owner : '') + (t.done ? ' - complete' : '')),
        'STATUS:' + (t.done ? 'CONFIRMED' : 'TENTATIVE'),
        'END:VEVENT'
      );
    }
    out.push('END:VCALENDAR');
    return new Response(out.join(CRLF), {
      headers: {
        'content-type': 'text/calendar; charset=utf-8',
        'content-disposition': 'attachment; filename="' + slug + '-schedule.ics"',
      },
    });
  }

  return NextResponse.json({ error: 'unknown export' }, { status: 404 });
}
