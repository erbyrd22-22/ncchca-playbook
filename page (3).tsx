import { notFound, redirect } from 'next/navigation';
import Shell from '@/components/Shell';
import {
  getInstance, getInstances, getSections, getSectionContent, getProgress, getUsers,
} from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function SectionPage({
  params,
}: {
  params: Promise<{ slug: string; section: string }>;
}) {
  const { slug, section: sectionSlug } = await params;

  const instance = await getInstance(slug);
  if (!instance) notFound();

  const [instances, sections, user, users] = await Promise.all([
    getInstances(), getSections(instance.template_id), getSessionUser(), getUsers(),
  ]);

  const section = sections.find((s) => s.slug === sectionSlug);
  if (!section) redirect(`/i/${slug}/${sections[0]?.slug ?? 'overview'}`);

  const [blocks, progress] = await Promise.all([
    getSectionContent(section.id, instance.id),
    getProgress(instance.id),
  ]);

  return (
    <Shell
      instances={instances}
      instance={instance}
      sections={sections}
      section={section}
      blocks={blocks}
      progress={progress}
      user={user}
      users={users.map((u) => ({ id: u.id, full_name: u.full_name }))}
    />
  );
}
