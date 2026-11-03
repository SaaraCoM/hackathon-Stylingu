import { Webhook } from 'npm:standardwebhooks@1.0.0';
import { ageFromBirthDate } from '../../../backend/src/age.js';
Deno.serve(async request => {
  if (request.method !== 'POST') return new Response(null, {status:405});
  const secret = Deno.env.get('AUTH_HOOK_SECRET');
  if (!secret) return new Response(null, {status:503});
  const body = await request.text();
  let event;
  try { event = new Webhook(secret.replace(/^v1,whsec_/, '')).verify(body, Object.fromEntries(request.headers)); }
  catch { return new Response(null, {status:401}); }
  const data = event?.user?.user_metadata;
  const age = ageFromBirthDate(data?.birth_date);
  if (age === null || age < 16 || typeof data?.name !== 'string' || !data.name.trim()) {
    return Response.json({error:{http_code:403,message:'Debes indicar un nombre y una fecha válida que cumpla la edad mínima de 16 años.'}});
  }
  return Response.json({});
});
