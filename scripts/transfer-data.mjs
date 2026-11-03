// Copia transaccional entre dos esquemas StylingU iguales; nunca elimina el origen.
import {createHash} from 'node:crypto';

export const tables=['users','products','product_variants','product_offers','photos',
  'sessions','reset_tokens','outfits','garments','outfit_plans','owned_cosmetics',
  'recommendation_feedback','tutorial_progress','analysis_jobs','quotas'];
const quoted=name=>'"'+name.replaceAll('"','""')+'"';
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
function canonical(value){
  if(Array.isArray(value))return value.map(canonical);
  if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]));
  return value;
}
function fingerprint(rows){return digest(rows.map(r=>JSON.stringify(canonical(r))).sort().join('\n'));}
async function rows(client,table){return (await client.query(`select to_jsonb(t) as value from public.${quoted(table)} t`)).rows.map(r=>r.value);}

export async function transferData({source,target,photos}){
  let sourceTransaction=false,targetTransaction=false,commitStarted=false;
  const created=[],report=[];
  try{
    await source.query('begin isolation level repeatable read');sourceTransaction=true;
    await source.query("set local lock_timeout='5s'");
    // Bloquea escrituras durante la copia; las lecturas del origen continúan.
    await source.query('lock table '+tables.map(t=>'public.'+quoted(t)).join(',')+' in share mode');
    await source.query("set local timezone='UTC'");
    if((await source.query("select count(*)::int as n from analysis_jobs where state in ('queued','processing')")).rows[0].n)
      throw new Error('SOURCE_JOBS_ACTIVE');
    await target.query('begin');targetTransaction=true;
    await target.query("set local lock_timeout='5s'");
    await target.query("set local timezone='UTC'");
    await target.query("select pg_advisory_xact_lock(hashtext('stylingu-data-transfer'))");
    await target.query('lock table '+tables.map(t=>'public.'+quoted(t)).join(',')+' in exclusive mode');
    for(const table of tables){
      if((await target.query(`select count(*)::int as n from public.${quoted(table)}`)).rows[0].n)
        throw new Error('TARGET_NOT_EMPTY:'+table);
    }
    const protectedTables=await target.query("select count(*)::int as n from pg_tables where schemaname='public' and tablename=any($1) and rowsecurity",[tables]);
    if(protectedTables.rows[0].n!==tables.length)throw new Error('TARGET_RLS_REQUIRED');
    for(const table of tables){
      const data=await rows(source,table);
      const metadata=await target.query("select column_name from information_schema.columns where table_schema='public' and table_name=$1 and data_type in ('json','jsonb')",[table]);
      const jsonColumns=new Set(metadata.rows.map(r=>r.column_name));
      if(table==='photos')for(const photo of data){
        const bytes=await photos.readSource(photo.storage_key);
        if(!bytes||bytes.length!==photo.bytes)throw new Error('SOURCE_PHOTO_INVALID');
        const fresh=await photos.putIfAbsent(photo.storage_key,bytes,photo.mime);
        if(fresh)created.push(photo.storage_key);
        const saved=await photos.readTarget(photo.storage_key);
        if(!saved||digest(saved)!==digest(bytes))throw new Error('PHOTO_INTEGRITY_FAILED');
      }
      for(const row of data){
        const keys=Object.keys(row);
        await target.query(`insert into public.${quoted(table)} (${keys.map(quoted).join(',')}) values (${keys.map((_,i)=>'$'+(i+1)).join(',')})`,keys.map(k=>row[k]!==null&&jsonColumns.has(k)?JSON.stringify(row[k]):row[k]));
      }
      const copied=await rows(target,table);
      if(fingerprint(data)!==fingerprint(copied))throw new Error('DATA_INTEGRITY_FAILED:'+table);
      report.push({table,rows:data.length,verified:true});
    }
    commitStarted=true;
    await target.query('commit');targetTransaction=false;
    await source.query('rollback');sourceTransaction=false;
    return {tables:report,photosCreated:created.length,verified:true};
  }catch(error){
    if(targetTransaction)await target.query('rollback').catch(()=>{});
    if(sourceTransaction)await source.query('rollback').catch(()=>{});
    // Una pérdida de conexión durante COMMIT deja resultado ambiguo: retener fotos.
    let cleanupFailed=false;
    if(!commitStarted)for(const key of created)await photos.removeTarget(key).catch(()=>{cleanupFailed=true;});
    if(cleanupFailed)throw new Error('PHOTO_CLEANUP_REQUIRES_RECONCILIATION',{cause:error});
    if(commitStarted)throw new Error('COMMIT_RESULT_REQUIRES_RECONCILIATION',{cause:error});
    throw error;
  }
}
