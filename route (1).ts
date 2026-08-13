import { NextResponse } from 'next/server';
import { getInstance, getProgress } from '@/lib/db';
import { getRegistry, getSponsors, getSchedule } from '@/lib/outputs';

export const dynamic = 'force-dynamic';

/** What a public event page or mobile app would consume. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const instance = await getInstance(slug);
  if (!instance) return NextResponse.json({ error: 'not found' }, { status: 404 });

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
