import { notFound } from 'next/navigation';
import { getInstance } from '@/lib/db';
import { serverClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export default async function Search({
  params, searchParams,
}: { params: Promise<{slug:string}>; searchParams: Promise<{q?:string}> }) {
  const { slug } = await params;
  const { q = '' } = await searchParams;
  const inst = await getInstance(slug);
  if (!inst) notFound();

  const sb = await serverClient();
  const { data: sections } = await sb.from('section')
    .select('id,slug,title').eq('template_id', inst.template_id);
  const secById = new Map((sections ?? []).map(s => [s.id, s]));

  const { data: blocks } = await sb.from('block')
    .select('id,section_id,title,body')
    .in('section_id', (sections ?? []).map(s => s.id));
  const blkById = new Map((blocks ?? []).map(b => [b.id, b]));

  type Hit = { slug: string; title: string; text: string };
  const hits: Hit[] = [];

  if (q) {
    const needle = q.toLowerCase();
    for (const b of blocks ?? []) {
      const text = `${b.title ?? ''} — ${b.body ?? ''}`;
      if (text.toLowerCase().includes(needle)) {
        const s = secById.get(b.section_id);
        if (s) hits.push({ slug: s.slug, title: s.title, text });
      }
    }
    const { data: items } = await sb.from('item')
      .select('label,block_id')
      .in('block_id', (blocks ?? []).map(b => b.id))
      .ilike('label', `%${q}%`);
    for (const it of items ?? []) {
      const b = blkById.get(it.block_id);
      const s = b && secById.get(b.section_id);
      if (s) hits.push({ slug: s.slug, title: s.title, text: it.label });
    }
  }

  return (
    <>
      <header className="top"><div className="top-in">
        <div className="bm"><div className="mark">NC</div>
          <div><div className="bt">Search</div><div className="bs">{inst.name}</div></div></div>
        <div className="tools"><a className="btn solid" href={`/i/${slug}/overview`}>← Back</a></div>
      </div></header>
      <div className="wrap"><main style={{maxWidth:900,margin:'0 auto'}}>
        <h1 className="page">{hits.length} result{hits.length===1?'':'s'} for “{q}”</h1>
        {hits.slice(0,60).map((h,i)=>(
          <a key={i} href={`/i/${slug}/${h.slug}`} style={{textDecoration:'none'}}>
            <div className="card" style={{padding:'.8rem 1rem',marginBottom:'.5rem'}}>
              <div className="eyebrow">{h.title}</div>
              <div style={{fontSize:'.88rem',color:'#39424C'}}
                   dangerouslySetInnerHTML={{__html:h.text.slice(0,240)}} />
            </div>
          </a>
        ))}
        {!hits.length && <p className="empty">No matches.</p>}
      </main></div>
    </>
  );
}
