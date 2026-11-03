import { DurableObject } from 'cloudflare:workers';

async function authorized(request, secret) {
  if (!secret || request.headers.get('Authorization')?.length > 1000) return false;
  const supplied = request.headers.get('Authorization') || '';
  const [a,b] = await Promise.all([supplied,'Bearer '+secret].map(s=>crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))));
  return new Uint8Array(a).reduce((diff,v,i)=>diff|(v^new Uint8Array(b)[i]),0)===0;
}
export class DeploymentControl extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    ctx.storage.sql.exec('create table if not exists state (id integer primary key check(id=1), active text, previous text, revision integer, release text, promoted_at text, image text, previous_release text, previous_image text)');
    ctx.storage.sql.exec("insert or ignore into state values(1,'blue',null,0,'bootstrap',null,null,null,null)");
  }
  status() { return this.ctx.storage.sql.exec('select * from state where id=1').one(); }
  async check(slot) {
    if (!['blue','green'].includes(slot)) throw new Error('Invalid slot');
    const target = slot === 'blue' ? this.env.BLUE : this.env.GREEN;
    let release;
    for (const path of ['/api/health','/api/ready']) {
      const res = await target.fetch('https://internal'+path, {signal:AbortSignal.timeout(60000)});
      if (res.status !== 200) throw new Error('Candidate is not healthy');
      const body = await res.json();
      if(path.endsWith('health'))release=body.version;
      if (path.endsWith('ready') ? body.ready !== true : body.ok !== true) throw new Error('Invalid health response');
    }
    const probe=await target.fetch('https://internal/internal/ready',{method:'POST',headers:{'X-Stylingu-Internal':'1'},signal:AbortSignal.timeout(60000)});
    if(!probe.ok)throw new Error('Candidate dependencies failed');
    const dependencies=await probe.json();
    return {slot,healthy:true,release,keyFingerprint:dependencies.keyFingerprint};
  }
  async restart(slot) {
    if(!['blue','green'].includes(slot)||this.status().active===slot)throw new Error('Only an inactive slot may restart');
    const response=await (slot==='blue'?this.env.BLUE:this.env.GREEN).fetch('https://internal/internal/restart',{method:'POST',signal:AbortSignal.timeout(60000)});
    if(!response.ok)throw new Error('Inactive slot restart failed');return {slot,restarted:true};
  }
  async promote({slot,revision,release,image}) {
    if (!/^[a-f0-9]{40,64}$/.test(release || '')) throw new Error('Commit/release hash required');
    if(!/^registry\.cloudflare\.com\/.+@sha256:[a-f0-9]{64}$/.test(image||''))throw new Error('Image digest required');
    const checked=await this.check(slot);
    if(checked.release!==release)throw new Error('Candidate release mismatch');
    return this.ctx.storage.transactionSync(()=>{
      const state=this.status();
      if (state.revision!==revision || state.active===slot) throw new Error('Stale promotion or already active');
      this.ctx.storage.sql.exec('update state set previous=active,previous_release=release,previous_image=image,active=?,revision=revision+1,release=?,promoted_at=?,image=? where id=1',slot,release,new Date().toISOString(),image);
      return this.status();
    });
  }
}
export class RateCounter extends DurableObject {
  constructor(ctx,env) { super(ctx,env);ctx.storage.sql.exec('create table if not exists windows (kind text primary key, window integer, count integer)'); }
  async limit(kind,max) {
    const minute=Math.floor(Date.now()/60000);
    this.ctx.storage.sql.exec('insert into windows values(?,?,1) on conflict(kind) do update set count=case when window=excluded.window then count+1 else 1 end, window=excluded.window',kind,minute);
    await this.ctx.storage.setAlarm(Date.now()+120000);
    return this.ctx.storage.sql.exec('select count from windows where kind=?',kind).one().count<=max;
  }
  alarm(){this.ctx.storage.sql.exec('delete from windows');}
}
export default {
  async fetch(request,env) {
    const url=new URL(request.url);
    if(url.protocol!=='https:'){url.protocol='https:';return Response.redirect(url.href,308);}
    const control=env.DEPLOYMENT_CONTROL.getByName('deployment');
    if (url.pathname.startsWith('/internal/')) return new Response(null,{status:404});
    if (url.pathname.startsWith('/__ops/')) {
      if (!await authorized(request,env.OPS_TOKEN)) return new Response(null,{status:404});
      try {
        const candidate=/^\/__ops\/candidate\/(blue|green)(\/api\/.*)$/.exec(url.pathname);
        if(candidate){
          const headers=new Headers(request.headers);headers.delete('Authorization');
          const destination=new URL(candidate[2],url.origin);destination.search=url.search;
          return (candidate[1]==='blue'?env.BLUE:env.GREEN).fetch(new Request(destination,new Request(request,{headers})));
        }
        if(url.pathname==='/__ops/status' && request.method==='GET') return Response.json(await control.status(),{headers:{'Cache-Control':'no-store'}});
        if(url.pathname==='/__ops/check' && request.method==='POST') return Response.json(await control.check((await request.json()).slot));
        if(url.pathname==='/__ops/restart' && request.method==='POST') return Response.json(await control.restart((await request.json()).slot));
        if(url.pathname==='/__ops/promote' && request.method==='POST') return Response.json(await control.promote(await request.json()));
      }catch{return Response.json({error:'Operation refused; inspect candidate health and revision.'},{status:409});}
      return new Response(null,{status:404});
    }
    if (url.pathname.startsWith('/api/')) {
      const address=request.headers.get('CF-Connecting-IP');
      if(!address)return new Response(null,{status:400});
      const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(address));
      const key=Array.from(new Uint8Array(hash),n=>n.toString(16).padStart(2,'0')).join('');
      const counter=env.RATE_COUNTER.getByName(key);
      const isAuth=url.pathname.startsWith('/api/auth/')&&!url.pathname.startsWith('/api/auth/personal/');
      const isAI=/\/(analysis-jobs|analyze|segment|preview|scans)$/.test(url.pathname)&&request.method==='POST';
      if (!await counter.limit('api',180) || (isAuth&&!await counter.limit('auth',10)) || (isAI&&!await counter.limit('ai',5))) return Response.json({code:'RATE_LIMITED',error:'Demasiadas solicitudes.'},{status:429,headers:{'Retry-After':'60','Cache-Control':'no-store'}});
    }
    const {active}=await control.status();
    const headers=new Headers(request.headers);
    headers.delete('X-Forwarded-For');headers.delete('X-Forwarded-Host');
    headers.set('X-Forwarded-Proto','https');headers.set('X-Forwarded-For',request.headers.get('CF-Connecting-IP')||'');
    return (active==='blue'?env.BLUE:env.GREEN).fetch(new Request(request,{headers}));
  }
};
