import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.24.1/mod.ts';
import { consumeLimit, digestRateKey, verifyTurnstile } from '../_shared/turnstile.ts';

const cors = { 'Access-Control-Allow-Origin': Deno.env.get('SITE_ORIGIN') || 'https://uxgstudio.in', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Vary': 'Origin' };
const schema = z.object({full_name:z.string().trim().min(2).max(128),email:z.string().trim().email().max(255),phone:z.string().trim().min(7).max(32),business_name:z.string().trim().min(1).max(128),industry:z.string().trim().min(1).max(64),service:z.string().trim().min(1).max(100),estimated_budget:z.string().trim().max(64),project_deadline:z.string().date(),brief_message:z.string().trim().min(5).max(4000),turnstile_token:z.string().min(1)});
Deno.serve(async (req) => {
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(req.method!=='POST')return Response.json({error:'Method not allowed'},{status:405,headers:cors});
  try{
    const input=schema.parse(await req.json());
    const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const ip=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';
    const [ipKey,emailKey]=await Promise.all([digestRateKey(`inquiry-ip:${ip}`),digestRateKey(`inquiry-email:${input.email.toLowerCase()}`)]);
    if((ip!=='unknown'&&!await consumeLimit(db,ipKey,8,900))||!await consumeLimit(db,emailKey,3,3600))return Response.json({error:'Too many enquiries. Please try again later.'},{status:429,headers:cors});
    await verifyTurnstile(input.turnstile_token,req);
    const {error}=await db.from('leads_inquiries').insert({full_name:input.full_name,email:input.email,phone:input.phone,business_name:input.business_name,industry:input.industry,services_requested:[input.service],estimated_budget:input.estimated_budget,project_deadline:input.project_deadline,brief_message:input.brief_message});
    if(error)throw error;
    return Response.json({ok:true},{headers:cors});
  }catch(e){return Response.json({error:e instanceof z.ZodError?'Please check the form fields.':'Unable to submit this enquiry right now.'},{status:400,headers:cors});}
});
