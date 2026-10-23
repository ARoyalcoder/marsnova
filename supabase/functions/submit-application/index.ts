import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.24.1/mod.ts';
import { consumeLimit, digestRateKey, verifyTurnstile } from '../_shared/turnstile.ts';

const cors = { 'Access-Control-Allow-Origin': Deno.env.get('SITE_ORIGIN') || 'https://uxgstudio.in', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Vary': 'Origin' };
const schema = z.object({full_name:z.string().trim().min(2).max(128),email:z.string().trim().email().max(255),phone:z.string().trim().min(7).max(32),role_applied:z.string().trim().min(2).max(128),portfolio_url:z.string().url().max(1000),showreel_url:z.string().url().max(1000).optional().or(z.literal('')),turnstile_token:z.string().min(1)});
Deno.serve(async (req) => {
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(req.method!=='POST')return Response.json({error:'Method not allowed'},{status:405,headers:cors});
  try{
    const input=schema.parse(await req.json());
    const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const ip=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';
    const [ipKey,emailKey]=await Promise.all([digestRateKey(`application-ip:${ip}`),digestRateKey(`application-email:${input.email.toLowerCase()}`)]);
    if((ip!=='unknown'&&!await consumeLimit(db,ipKey,8,900))||!await consumeLimit(db,emailKey,3,3600))return Response.json({error:'Too many applications. Please try again later.'},{status:429,headers:cors});
    await verifyTurnstile(input.turnstile_token,req);
    const {error}=await db.from('job_applications').insert({full_name:input.full_name,email:input.email,phone:input.phone,role_applied:input.role_applied,portfolio_url:input.portfolio_url,showreel_url:input.showreel_url||null});
    if(error)throw error;
    return Response.json({ok:true},{headers:cors});
  }catch(e){return Response.json({error:e instanceof z.ZodError?'Please check the application fields.':'Unable to submit this application right now.'},{status:400,headers:cors});}
});
