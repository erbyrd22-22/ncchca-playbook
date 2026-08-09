import { notFound } from 'next/navigation';
import { getInstance, sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function Search({
  params, searchParams,
}: { params: Promise<{slug:string}>; searchParams: Promise<{q?:string}> }) {
  const { slug } = await params;
  const { q = '' } = await searchParams;
  const inst = await getInstance(slug);
  if (!inst) notFound();
  const term = `%${q}%`;

  const hits = q ? await sql<{kind:string;text:string;slug:string;title:string}[]>`
    select 'item' as kind, it.label as text, s.slug, s.title
      from item it join block b on b.id=it.block_id join section s on s.id=b.section_id
     where s.template_id=${inst.template_id} and it.label ilike ${term}
    union all
    select 'block', coalesce(b.title,'')||' — '||coalesce(b.body,''), s.slug, s.title
      from block b join section s on s.id=b.section_id
     where s.template_id=${inst.template_id} and (b.title ilike ${term} or b.body ilike ${term})
    limit 60` : [];

  return (
    <>
      <header className="top"><div className="top-in">
        <div className="bm"><div className="mark">NC</div>
          <div><div className="bt">Search</div><div className="bs">{inst.name}</div></div></div>
        <div className="tools"><a className="btn solid" href={`/i/${slug}/overview`}>← Back</a></div>
      </div></header>
      <div className="wrap"><main style={{maxWidth:900,margin:'0 auto'}}>
        <h1 className="page">{hits.length} result{hits.length===1?'':'s'} for “{q}”</h1>
        {hits.map((h,i)=>(
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
