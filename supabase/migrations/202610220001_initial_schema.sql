-- UXG Studio baseline schema. Run with the Supabase SQL editor or CLI.
create extension if not exists pgcrypto;

create type public.uxg_role as enum ('super_admin','agency_manager','editor','client');
create type public.lead_status as enum ('new','contacted','discovery_call','proposal_sent','won','lost');
create type public.pipeline_stage as enum ('discovery','creative_direction','pre_production','production_day','post_production','delivery');
create type public.asset_status as enum ('draft','review_pending','changes_requested','approved','published');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  phone text,
  role public.uxg_role not null default 'client',
  created_at timestamptz not null default now()
);
create table public.client_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  company_name text not null,
  brand_industry text not null,
  website_url text,
  created_at timestamptz not null default now()
);
create table public.leads_inquiries (
  id uuid primary key default gen_random_uuid(), full_name text not null, email text not null,
  phone text, business_name text, industry text, location_city text default 'Mumbai',
  services_requested text[] not null default '{}', estimated_budget text, project_deadline date, brief_message text,
  utm_source text, utm_campaign text, status public.lead_status not null default 'new',
  created_at timestamptz not null default now()
);
create table public.projects (
  id uuid primary key default gen_random_uuid(), project_code text unique not null,
  client_id uuid not null references public.profiles(id), title text not null, vertical text not null,
  current_stage public.pipeline_stage not null default 'discovery', target_delivery_date date,
  deliverables_quota jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table public.media_assets (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
  title text not null, aspect_ratio text not null default '9:16', video_url text not null,
  hls_manifest_url text, thumbnail_url text, version integer not null default 1,
  status public.asset_status not null default 'review_pending', created_at timestamptz not null default now()
);
create table public.asset_feedback (
  id uuid primary key default gen_random_uuid(), asset_id uuid not null references public.media_assets(id) on delete cascade,
  author_id uuid not null references public.profiles(id), timestamp_seconds numeric(8,2),
  comment_text text not null, is_resolved boolean not null default false, created_at timestamptz not null default now()
);
create table public.job_applications (
  id uuid primary key default gen_random_uuid(), full_name text not null, email text not null,
  phone text not null, role_applied text not null, portfolio_url text not null,
  showreel_url text, resume_file_url text, status text not null default 'under_review', created_at timestamptz not null default now()
);
create table public.submission_rate_limits (
  key_hash text primary key, window_start timestamptz not null default now(), request_count integer not null default 0
);
create index submission_rate_limits_window_idx on public.submission_rate_limits(window_start);
alter table public.submission_rate_limits enable row level security;
create or replace function public.consume_submission_rate_limit(p_key_hash text,p_limit integer,p_window_seconds integer)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare n integer;
begin
  if p_limit<1 or p_window_seconds<1 or length(p_key_hash)>128 then raise exception 'Invalid limiter parameters'; end if;
  insert into public.submission_rate_limits(key_hash,window_start,request_count) values(p_key_hash,now(),1)
  on conflict(key_hash) do update set
    request_count=case when submission_rate_limits.window_start < now()-make_interval(secs=>p_window_seconds) then 1 else submission_rate_limits.request_count+1 end,
    window_start=case when submission_rate_limits.window_start < now()-make_interval(secs=>p_window_seconds) then now() else submission_rate_limits.window_start end
  returning request_count into n;
  if random()<0.03 then delete from public.submission_rate_limits where window_start<now()-interval '1 day'; end if;
  return n<=p_limit;
end $$;
revoke all on function public.consume_submission_rate_limit(text,integer,integer) from public;
grant execute on function public.consume_submission_rate_limit(text,integer,integer) to service_role;
create table public.blog_posts (
  id uuid primary key default gen_random_uuid(), slug text unique not null, title text not null,
  excerpt text, body text not null default '', cover_image text, published boolean not null default false,
  published_at timestamptz, author_id uuid references public.profiles(id), created_at timestamptz not null default now()
);
create table public.case_studies (
  id uuid primary key default gen_random_uuid(), slug text unique not null, title text not null,
  industry text not null, summary text, challenge text, approach text, outcome text,
  cover_image text, published boolean not null default false, created_at timestamptz not null default now()
);

-- One active seat per distinct signed-in account. A 10-minute heartbeat lease
-- reclaims slots after browser or network failure. The transaction lock makes
-- the 100-account admission check atomic across concurrent logins.
create table public.active_portal_users (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  session_id uuid not null unique,
  last_seen_at timestamptz not null default now()
);
create or replace function public.create_uxg_profile()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  insert into public.profiles(id,email,full_name,role)
  values(new.id,coalesce(new.email,''),coalesce(new.raw_user_meta_data->>'full_name',''),'client')
  on conflict(id) do nothing;
  return new;
end $$;
create trigger uxg_auth_user_profile after insert on auth.users
for each row execute procedure public.create_uxg_profile();
create index active_portal_users_last_seen_idx on public.active_portal_users(last_seen_at);
create or replace function public.claim_concurrent_seat(p_session_id uuid)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare current_count integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  perform pg_advisory_xact_lock(72412026);
  delete from public.active_portal_users where last_seen_at < now() - interval '10 minutes';
  if exists(select 1 from public.active_portal_users where user_id=auth.uid()) then
    update public.active_portal_users set session_id=p_session_id,last_seen_at=now() where user_id=auth.uid();
    return true;
  end if;
  select count(*) into current_count from public.active_portal_users;
  if current_count >= 100 then return false; end if;
  insert into public.active_portal_users(user_id,session_id) values(auth.uid(),p_session_id);
  return true;
end $$;
create or replace function public.heartbeat_concurrent_seat(p_session_id uuid)
returns boolean language sql security definer set search_path=public,pg_temp as $$
  update public.active_portal_users set last_seen_at=now()
  where user_id=auth.uid() and session_id=p_session_id returning true
$$;
create or replace function public.release_concurrent_seat(p_session_id uuid)
returns boolean language sql security definer set search_path=public,pg_temp as $$
  delete from public.active_portal_users where user_id=auth.uid() and session_id=p_session_id returning true
$$;
revoke all on function public.claim_concurrent_seat(uuid) from public;
revoke all on function public.heartbeat_concurrent_seat(uuid) from public;
revoke all on function public.release_concurrent_seat(uuid) from public;
grant execute on function public.claim_concurrent_seat(uuid) to authenticated;
grant execute on function public.heartbeat_concurrent_seat(uuid) to authenticated;
grant execute on function public.release_concurrent_seat(uuid) to authenticated;

create or replace function public.is_uxg_admin()
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select exists(select 1 from public.profiles p join public.active_portal_users s on s.user_id=p.id
    where p.id=auth.uid() and p.role in ('super_admin','agency_manager','editor') and s.last_seen_at>now()-interval '10 minutes')
$$;

alter table public.profiles enable row level security;
alter table public.client_profiles enable row level security;
alter table public.leads_inquiries enable row level security;
alter table public.projects enable row level security;
alter table public.media_assets enable row level security;
alter table public.asset_feedback enable row level security;
alter table public.job_applications enable row level security;
alter table public.blog_posts enable row level security;
alter table public.case_studies enable row level security;
alter table public.active_portal_users enable row level security;

create policy "profiles read self or admin" on public.profiles for select to authenticated using(id=auth.uid() or public.is_uxg_admin());
create policy "admins manage profiles" on public.profiles for update to authenticated using(public.is_uxg_admin()) with check(public.is_uxg_admin());
create policy "clients read own business" on public.client_profiles for select to authenticated using(user_id=auth.uid() or public.is_uxg_admin());
create policy "admins manage client business" on public.client_profiles for all to authenticated using(public.is_uxg_admin()) with check(public.is_uxg_admin());
create policy "admins read leads" on public.leads_inquiries for select to authenticated using(public.is_uxg_admin());
create policy "admins update leads" on public.leads_inquiries for update to authenticated using(public.is_uxg_admin()) with check(public.is_uxg_admin());
create policy "clients read own projects" on public.projects for select to authenticated using((client_id=auth.uid() and exists(select 1 from public.active_portal_users s where s.user_id=auth.uid() and s.last_seen_at>now()-interval '10 minutes')) or public.is_uxg_admin());
create policy "admins manage projects" on public.projects for all to authenticated using(public.is_uxg_admin()) with check(public.is_uxg_admin());
create policy "clients read project assets" on public.media_assets for select to authenticated using(exists(select 1 from public.projects p where p.id=project_id and ((p.client_id=auth.uid() and exists(select 1 from public.active_portal_users s where s.user_id=auth.uid() and s.last_seen_at>now()-interval '10 minutes')) or public.is_uxg_admin())));
create policy "admins manage assets" on public.media_assets for all to authenticated using(public.is_uxg_admin()) with check(public.is_uxg_admin());
create policy "client approves own asset" on public.media_assets for update to authenticated
using(status in ('review_pending','changes_requested') and exists(select 1 from public.projects p join public.active_portal_users s on s.user_id=p.client_id where p.id=project_id and p.client_id=auth.uid() and s.last_seen_at>now()-interval '10 minutes'))
with check(status='approved' and exists(select 1 from public.projects p join public.active_portal_users s on s.user_id=p.client_id where p.id=project_id and p.client_id=auth.uid() and s.last_seen_at>now()-interval '10 minutes'));
create policy "project members read feedback" on public.asset_feedback for select to authenticated using(exists(select 1 from public.media_assets a join public.projects p on p.id=a.project_id where a.id=asset_id and ((p.client_id=auth.uid() and exists(select 1 from public.active_portal_users s where s.user_id=auth.uid() and s.last_seen_at>now()-interval '10 minutes')) or public.is_uxg_admin())));
create policy "client adds feedback" on public.asset_feedback for insert to authenticated with check(author_id=auth.uid() and exists(select 1 from public.media_assets a join public.projects p on p.id=a.project_id join public.active_portal_users s on s.user_id=p.client_id where a.id=asset_id and p.client_id=auth.uid() and s.last_seen_at>now()-interval '10 minutes'));
create policy "admins resolve feedback" on public.asset_feedback for update to authenticated using(public.is_uxg_admin()) with check(public.is_uxg_admin());
create policy "admins read applications" on public.job_applications for select to authenticated using(public.is_uxg_admin());
create policy "public reads published posts" on public.blog_posts for select to anon,authenticated using(published or public.is_uxg_admin());
create policy "admins manage posts" on public.blog_posts for all to authenticated using(public.is_uxg_admin()) with check(public.is_uxg_admin());
create policy "public reads published case studies" on public.case_studies for select to anon,authenticated using(published or public.is_uxg_admin());
create policy "admins manage case studies" on public.case_studies for all to authenticated using(public.is_uxg_admin()) with check(public.is_uxg_admin());
create policy "users see own seat" on public.active_portal_users for select to authenticated using(user_id=auth.uid());

-- Video files stay private; the portal requests short-lived signed read URLs.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('uxg-media','uxg-media',false,524288000,array['video/mp4','video/quicktime','image/jpeg','image/png','image/webp','application/vnd.apple.mpegurl'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy "active project clients can read media" on storage.objects for select to authenticated
using(bucket_id='uxg-media' and (public.is_uxg_admin() or (
  exists(select 1 from public.projects p join public.active_portal_users s on s.user_id=p.client_id
   where name like p.id::text || '/%' and p.client_id=auth.uid() and s.last_seen_at>now()-interval '10 minutes')
)));
create policy "admins upload media" on storage.objects for insert to authenticated
with check(bucket_id='uxg-media' and public.is_uxg_admin());
create policy "admins update media" on storage.objects for update to authenticated
using(bucket_id='uxg-media' and public.is_uxg_admin()) with check(bucket_id='uxg-media' and public.is_uxg_admin());
create policy "admins delete media" on storage.objects for delete to authenticated
using(bucket_id='uxg-media' and public.is_uxg_admin());
