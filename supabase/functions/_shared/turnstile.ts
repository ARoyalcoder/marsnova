export async function verifyTurnstile(token: string, request: Request) {
  const secret = Deno.env.get('TURNSTILE_SECRET_KEY');
  if (!secret) throw new Error('Turnstile is not configured on the server.');
  const body = new FormData();
  body.set('secret', secret);
  body.set('response', token);
  const ip = request.headers.get('cf-connecting-ip');
  if (ip) body.set('remoteip', ip);
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
  if (!response.ok || !(await response.json()).success) throw new Error('Verification failed. Please try again.');
}

export async function digestRateKey(value: string) {
  const salt=Deno.env.get('SUBMISSION_RATE_LIMIT_SALT');
  if(!salt) throw new Error('Submission rate limiting is not configured.');
  const bytes=new TextEncoder().encode(`${salt}:${value}`);
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
}

export async function consumeLimit(db: any, key: string, limit: number, seconds: number) {
  const {data,error}=await db.rpc('consume_submission_rate_limit',{p_key_hash:key,p_limit:limit,p_window_seconds:seconds});
  if(error) throw new Error('Submission rate check failed.');
  return data===true;
}
