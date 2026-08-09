import postgres from 'postgres';
import { TEMPLATE, SECTIONS } from './content';

const sql = postgres(process.env.DATABASE_URL!, { onnotice: () => {} });

async function main() {
  console.log('Seeding…');

  await sql`truncate audit_log, comment, item_state, instance, item, block, section, template, app_user restart identity cascade`;

  // ---- Users -------------------------------------------------------
  const users = await sql`
    insert into app_user ${sql(
      [
        { email: 'admin@ncchca.org', full_name: 'Playbook Admin', role: 'admin' },
        { email: 'editor@ncchca.org', full_name: 'Event Manager', role: 'editor' },
        { email: 'viewer@ncchca.org', full_name: 'Staff Viewer', role: 'viewer' },
      ],
      'email', 'full_name', 'role'
    )} returning id, email, role`;
  const admin = users.find((u) => u.role === 'admin')!;
  console.log(`  ${users.length} users`);

  // ---- Template ----------------------------------------------------
  const [tpl] = await sql`
    insert into template (name, version, description)
    values (${TEMPLATE.name}, ${TEMPLATE.version}, ${TEMPLATE.description})
    returning id`;

  // ---- Sections / blocks / items ------------------------------------
  let nSec = 0, nBlk = 0, nItem = 0;
  for (const [si, s] of SECTIONS.entries()) {
    const [sec] = await sql`
      insert into section (template_id, slug, nav_group, badge, title, eyebrow, lede, kind, sort_order)
      values (${tpl.id}, ${s.slug}, ${s.navGroup}, ${s.badge}, ${s.title},
              ${s.eyebrow ?? null}, ${s.lede ?? null}, ${s.kind}, ${si})
      returning id`;
    nSec++;

    for (const [bi, b] of s.blocks.entries()) {
      const [blk] = await sql`
        insert into block (section_id, kind, title, body, meta, sort_order)
        values (${sec.id}, ${b.kind}, ${b.title ?? null}, ${b.body ?? null},
                ${sql.json((b.meta ?? {}) as any)}, ${bi})
        returning id`;
      nBlk++;

      for (const [ii, label] of (b.items ?? []).entries()) {
        await sql`insert into item (block_id, label, sort_order)
                  values (${blk.id}, ${label}, ${ii})`;
        nItem++;
      }
    }
  }
  console.log(`  ${nSec} sections, ${nBlk} blocks, ${nItem} items`);

  // ---- Instances ----------------------------------------------------
  const instances = await sql`
    insert into instance ${sql(
      [
        { template_id: tpl.id, name: '2027 Annual Primary Care Conference', slug: 'pcc-2027', tier: 'tier1', status: 'planning', event_date: '2027-06-02', venue: 'Washington Duke Inn & Golf Club, Durham NC', created_by: admin.id },
        { template_id: tpl.id, name: 'HCCN Excel Dashboard Series — Fall 2026', slug: 'hccn-excel-fall-2026', tier: 'tier2', status: 'active', event_date: '2026-09-10', venue: 'Hybrid — Raleigh office + Zoom', created_by: admin.id },
        { template_id: tpl.id, name: 'Behavioral Health Workgroup — FY27', slug: 'bh-workgroup-fy27', tier: 'tier3', status: 'active', event_date: null, venue: 'Virtual', created_by: admin.id },
      ],
      'template_id','name','slug','tier','status','event_date','venue','created_by'
    )} returning id, slug, name`;
  console.log(`  ${instances.length} instances`);

  // ---- Demo progress on the 2027 conference --------------------------
  const pcc = instances.find((i) => i.slug === 'pcc-2027')!;
  const early = await sql`
    select it.id from item it
    join block b on b.id = it.block_id
    join section s on s.id = b.section_id
    where s.template_id = ${tpl.id} and s.slug in ('p1','p2')
    order by s.sort_order, b.sort_order, it.sort_order
    limit 9`;
  for (const it of early) {
    await sql`insert into item_state (instance_id, item_id, done, updated_by)
              values (${pcc.id}, ${it.id}, true, ${admin.id})`;
  }
  console.log(`  ${early.length} items pre-checked on ${pcc.name}`);

  const [{ count }] = await sql`select count(*)::int from item`;
  console.log(`Done. ${count} template items total.`);
  await sql.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
