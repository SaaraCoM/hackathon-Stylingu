import { randomUUID } from 'node:crypto';
import { query } from '../backend/src/db/pool.js';
import { setAuthTransportForTests } from '../backend/src/supabase.js';
export async function installAuthFixture() {
  process.env.SUPABASE_URL = 'http://supabase.test';
  process.env.SUPABASE_PUBLISHABLE_KEY = 'test-publishable';
  process.env.SUPABASE_SECRET_KEY = 'test-secret';
  // Test photos stay on disk; only Auth HTTP is stubbed.
  const users = new Map(), sessions = new Map();
  const response = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
  const failure = () => response({ msg: 'Invalid credentials', code: 'invalid_credentials' }, 401);
  function session(user) {
    const id = randomUUID();
    const claims = { sub: user.id, session_id: id, aud: 'authenticated', role: 'authenticated', email: user.email, exp: Math.floor(Date.now()/1000)+3600, iat: Math.floor(Date.now()/1000) };
    const access_token = Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url')+'.'+Buffer.from(JSON.stringify(claims)).toString('base64url')+'.testsignature';
    const record = { access_token, refresh_token: randomUUID(), expires_in: 3600, token_type: 'bearer', user };
    sessions.set(access_token, record);
    return {id,record};
  }
  setAuthTransportForTests(async (input, opts = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url), path = url.pathname.replace('/auth/v1', '');
    const method = opts.method || 'GET', headers = new Headers(opts.headers), body = opts.body ? JSON.parse(opts.body) : {};
    const existing = sessions.get((headers.get('Authorization') || '').replace('Bearer ',''));
    if (path === '/signup') {
      const id = randomUUID();
      if (users.has(body.email)) return response({msg:'Already registered'},422);
      const user = {id,email:body.email,user_metadata:body.data,app_metadata:{provider:'email'},aud:'authenticated',created_at:new Date().toISOString(),identities:[]};
      users.set(body.email,{user,password:body.password});
      await query('insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)',[id,body.email,body.data]);
      return response(user);
    }
    if (path === '/token') {
      const entry = url.searchParams.get('grant_type') === 'refresh_token' ? [...users.values()].find(e=>[...sessions.values()].some(s=>s.refresh_token===body.refresh_token&&s.user.id===e.user.id)) : users.get(body.email);
      if (!entry || (body.password && body.password !== entry.password)) return failure();
      if (!entry.user.email_confirmed_at) return response({msg:'Email not confirmed',code:'email_not_confirmed'},400);
      const {id,record}=session(entry.user);await query('insert into auth.sessions(id,user_id) values($1,$2)',[id,entry.user.id]);return response(record);
    }
    if (path === '/user' && method === 'GET') return existing ? response(existing.user) : failure();
    if (path === '/user' && method === 'PUT') { if(!existing)return failure();users.get(existing.user.email).password=body.password;return response(existing.user); }
    if (path === '/logout') {
      if(existing){for(const [key,s] of sessions)if(s.user.id===existing.user.id)sessions.delete(key);await query('delete from auth.sessions where user_id=$1',[existing.user.id]);}
      return new Response(null,{status:204});
    }
    if (path === '/recover') return response({});
    if (path.startsWith('/admin/users/') && method === 'DELETE') {
      const id=path.split('/').pop();await query('delete from auth.users where id=$1',[id]);
      for(const [email,e]of users)if(e.user.id===id)users.delete(email);
      for(const [key,s]of sessions)if(s.user.id===id)sessions.delete(key);
      return response({user:{id}});
    }
    return response({msg:'Unsupported test Auth operation'},400);
  });
  return {
    async confirm(email) { const entry=users.get(email);entry.user.email_confirmed_at=new Date().toISOString();await query('update auth.users set email_confirmed_at=now() where id=$1',[entry.user.id]); },
    users,
    reset() {setAuthTransportForTests(undefined);delete process.env.SUPABASE_URL;delete process.env.SUPABASE_SECRET_KEY;delete process.env.SUPABASE_PUBLISHABLE_KEY;}
  };
}
