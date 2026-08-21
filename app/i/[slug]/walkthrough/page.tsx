import { notFound } from 'next/navigation';
import TopBar from '@/components/TopBar';
import SideNav from '@/components/SideNav';
import Walkthrough from '@/components/Walkthrough';
import { getInstance, getInstances, getSections, getProgress, getUsers, getWalkthroughSteps } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function WalkthroughPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const instance = await getInstance(slug);
  if (!instance) notFound();

  const [instances, sections, progress, user, users, wt] = await Promise.all([
    getInstances(),
    getSections(instance.template_id),
    getProgress(instance.id),
    getSessionUser(),
    getUsers(),
    getWalkthroughSteps(instance.template_id, instance.id),
  ]);

  const canEdit = user?.role === 'editor' || user?.role === 'admin';

  return (
    <>
      <TopBar instances={instances} current={instance} user={user} section="walkthrough" editing={false} />
      <div className="wrap">
        <SideNav instanceSlug={slug} sections={sections} progress={progress} active="walkthrough" />
        <main>
          <div className="eyebrow">Guided</div>
          <h1 className="page">Build this event, step by step</h1>
          <p className="lede">
            The playbook walked in order, one phase at a time, from picking a theme to closing the
            books. Everything you tick here is recorded against{' '}
            <b>{instance.name}</b> only — the other events keep their own progress.
          </p>
          <Walkthrough
            steps={wt.steps}
            eventName={instance.name}
            ctx={{
              instanceId: instance.id,
              instSlug: instance.slug,
              sectionId: '',
              canEdit,
              editing: false,
              users: users.map((u) => ({ id: u.id, full_name: u.full_name })),
            }}
          />
        </main>
      </div>
    </>
  );
}
