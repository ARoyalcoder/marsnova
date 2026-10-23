import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = url && anonKey ? createClient(url, anonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
}) : null;

export const backendReady = Boolean(supabase);

export async function acquireSeat(userId) {
  if (!supabase) throw new Error('The Supabase backend is not configured yet.');
  const sessionId = crypto.randomUUID();
  const { data, error } = await supabase.rpc('claim_concurrent_seat', { p_session_id: sessionId });
  if (error) throw error;
  if (!data) {
    await supabase.auth.signOut();
    throw new Error('The client portal is at its 100 signed-in user limit. Please try again shortly.');
  }
  sessionStorage.setItem('uxg-portal-session', sessionId);
  return userId;
}

export async function releaseSeat() {
  if (!supabase) return;
  const sessionId=sessionStorage.getItem('uxg-portal-session');
  if(sessionId) await supabase.rpc('release_concurrent_seat',{p_session_id:sessionId});
  sessionStorage.removeItem('uxg-portal-session');
  await supabase.auth.signOut();
}

export async function signOutAndReleaseSeat() {
  await releaseSeat();
}
