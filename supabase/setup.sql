-- Execute once in the Supabase SQL Editor. No secret keys are required in the web app.
create table if not exists public.cms_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  owner boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.cms_admins enable row level security;
revoke all on public.cms_admins from anon, authenticated;
grant select on public.cms_admins to authenticated;
drop policy if exists cms_own_role on public.cms_admins;
create policy cms_own_role on public.cms_admins for select to authenticated using (user_id = auth.uid());

create or replace function public.is_site_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.cms_admins where user_id = auth.uid());
$$;
revoke all on function public.is_site_admin() from public;
grant execute on function public.is_site_admin() to authenticated;

alter table public.cms_admins add column if not exists chef boolean not null default false;

create table if not exists public.cms_site (
  id integer primary key check (id = 1),
  document jsonb,
  revision integer not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
insert into public.cms_site(id) values(1) on conflict do nothing;
alter table public.cms_site enable row level security;
revoke all on public.cms_site from anon, authenticated;
grant select(id,document,revision,updated_at) on public.cms_site to anon, authenticated;
drop policy if exists cms_published_read on public.cms_site;
create policy cms_published_read on public.cms_site for select to anon, authenticated using (true);

create table if not exists public.cms_revisions (
  revision integer primary key,
  document jsonb not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);
alter table public.cms_revisions enable row level security;
revoke all on public.cms_revisions from anon, authenticated;
grant select on public.cms_revisions to authenticated;
drop policy if exists cms_history_admin_read on public.cms_revisions;
create policy cms_history_admin_read on public.cms_revisions for select to authenticated using (public.is_site_admin());

create or replace function public.publish_site(expected_revision integer, new_document jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare current_revision integer; next_revision integer; collection text;
begin
  if not public.is_site_admin() then raise exception 'admin_required' using errcode='42501'; end if;
  if jsonb_typeof(new_document) <> 'object' or new_document->>'cmsVersion' is distinct from '1'
    or octet_length(new_document::text) > 4000000 then
    raise exception 'invalid_document' using errcode='22023';
  end if;
  foreach collection in array array['news','recipes','navigation','pages','shortcuts'] loop
    if jsonb_typeof(new_document->collection) is distinct from 'array'
      or jsonb_array_length(new_document->collection) > 100 then
      raise exception 'invalid_collection' using errcode='22023';
    end if;
  end loop;
  if jsonb_typeof(new_document->'home') is distinct from 'object'
    or jsonb_typeof(new_document->'appearance') is distinct from 'object'
    or jsonb_typeof(new_document->'brand') is distinct from 'object'
    or jsonb_typeof(new_document->'recipePage') is distinct from 'object'
    or jsonb_typeof(new_document->'bookPage') is distinct from 'object' then
    raise exception 'invalid_configuration' using errcode='22023';
  end if;
  select revision into current_revision from public.cms_site where id=1 for update;
  if expected_revision is distinct from current_revision then
    raise exception 'revision_conflict' using errcode='40001';
  end if;
  next_revision := current_revision + 1;
  insert into public.cms_revisions(revision,document,created_by) values(next_revision,new_document,auth.uid());
  update public.cms_site set document=new_document,revision=next_revision,updated_at=now(),updated_by=auth.uid() where id=1;
  delete from public.cms_revisions where revision <= next_revision-100;
  return jsonb_build_object('revision',next_revision,'document',new_document);
end $$;
revoke all on function public.publish_site(integer,jsonb) from public;
grant execute on function public.publish_site(integer,jsonb) to authenticated;

-- Run this function yourself in SQL Editor AFTER registering and confirming your email.
-- select public.bootstrap_site_owner('YOUR_EMAIL');
-- It is deliberately inaccessible to visitors and authenticated API clients.
create or replace function public.bootstrap_site_owner(owner_email text)
returns void language plpgsql security definer set search_path = '' as $$
declare account_id uuid;
begin
  if exists(select 1 from public.cms_admins where owner) then raise exception 'owner_already_assigned'; end if;
  select id into account_id from auth.users where lower(email)=lower(trim(owner_email)) and email_confirmed_at is not null;
  if account_id is null then raise exception 'registered_confirmed_account_required'; end if;
  insert into public.cms_admins(user_id,owner) values(account_id,true);
end $$;
revoke all on function public.bootstrap_site_owner(text) from public, anon, authenticated;

drop function if exists public.list_site_admins();
create function public.list_site_admins()
returns table(user_id uuid, email text, owner boolean, chef boolean)
language plpgsql security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.cms_admins a where a.user_id=auth.uid() and a.owner) then
    raise exception 'owner_required' using errcode='42501';
  end if;
  return query select a.user_id,u.email::text,a.owner,a.chef from public.cms_admins a join auth.users u on u.id=a.user_id order by a.created_at;
end $$;
revoke all on function public.list_site_admins() from public;
grant execute on function public.list_site_admins() to authenticated;

create or replace function public.set_site_admin(account_email text, enabled boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare account_id uuid;
begin
  if not exists(select 1 from public.cms_admins where user_id=auth.uid() and owner) then
    raise exception 'owner_required' using errcode='42501';
  end if;
  select id into account_id from auth.users where lower(email)=lower(trim(account_email)) and email_confirmed_at is not null;
  if account_id is null then raise exception 'registered_confirmed_account_required' using errcode='22023'; end if;
  if exists(select 1 from public.cms_admins where user_id=account_id and owner) then
    raise exception 'owner_cannot_be_changed_here' using errcode='42501';
  end if;
  if enabled then insert into public.cms_admins(user_id,owner) values(account_id,false) on conflict do nothing;
  else delete from public.cms_admins where user_id=account_id;
  end if;
end $$;
revoke all on function public.set_site_admin(text,boolean) from public;
grant execute on function public.set_site_admin(text,boolean) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('site-media','site-media',true,31457280,array['image/jpeg','image/png','image/webp','image/gif','application/pdf'])
on conflict(id) do update set public=true,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists cms_media_read on storage.objects;
create policy cms_media_read on storage.objects for select to anon, authenticated using (bucket_id='site-media');
drop policy if exists cms_media_insert on storage.objects;
create policy cms_media_insert on storage.objects for insert to authenticated with check (bucket_id='site-media' and public.is_site_admin());
drop policy if exists cms_media_update on storage.objects;
create policy cms_media_update on storage.objects for update to authenticated using (bucket_id='site-media' and public.is_site_admin()) with check (bucket_id='site-media' and public.is_site_admin());
drop policy if exists cms_media_delete on storage.objects;
create policy cms_media_delete on storage.objects for delete to authenticated using (bucket_id='site-media' and public.is_site_admin());

-- Chef assignment is controlled by the owner. Signup metadata never grants this role.
create or replace function public.is_site_chef() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.cms_admins where user_id=auth.uid() and chef);
$$;
revoke all on function public.is_site_chef() from public;
grant execute on function public.is_site_chef() to authenticated;
create unique index if not exists cms_one_chef on public.cms_admins(chef) where chef;
create or replace function public.set_site_chef(account_email text)
returns void language plpgsql security definer set search_path = '' as $$
declare account_id uuid;
begin
  if not exists(select 1 from public.cms_admins where user_id=auth.uid() and owner) then
    raise exception 'owner_required' using errcode='42501';
  end if;
  perform pg_advisory_xact_lock(826419);
  select id into account_id from auth.users where lower(email)=lower(trim(account_email)) and email_confirmed_at is not null;
  if account_id is null then raise exception 'registered_confirmed_account_required' using errcode='22023'; end if;
  update public.cms_admins set chef=false where chef;
  insert into public.cms_admins(user_id,chef) values(account_id,true)
  on conflict(user_id) do update set chef=true;
end $$;
revoke all on function public.set_site_chef(text) from public;
grant execute on function public.set_site_chef(text) to authenticated;

create table if not exists public.work_submissions (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  kind text not null check(kind in ('research','development')),
  summary text not null,
  body text not null,
  reference_url text not null default '',
  attachment_paths text[] not null default '{}',
  status text not null default 'received' check(status in ('received','reviewing','selected','declined')),
  feedback text not null default '',
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists work_by_author on public.work_submissions(author_id,created_at desc);
alter table public.work_submissions enable row level security;
revoke all on public.work_submissions from anon,authenticated;
grant select on public.work_submissions to authenticated;
drop policy if exists work_private_read on public.work_submissions;
create policy work_private_read on public.work_submissions for select to authenticated
using(author_id=auth.uid() or public.is_site_admin());

create or replace function public.submit_work(work_title text, work_kind text, work_summary text,
  work_body text, work_reference text default '', work_attachments text[] default '{}')
returns uuid language plpgsql security definer set search_path = '' as $$
declare new_id uuid; account_id uuid := auth.uid(); item text;
begin
  if account_id is null or not exists(select 1 from auth.users where id=account_id and email_confirmed_at is not null) then
    raise exception 'confirmed_account_required' using errcode='42501';
  end if;
  if work_title is null or length(trim(work_title)) not between 3 and 160
    or work_kind is null or work_kind not in ('research','development')
    or work_summary is null or length(trim(work_summary)) not between 20 and 1500
    or work_body is null or length(trim(work_body)) not between 50 and 20000
    or work_reference is null or length(work_reference)>2000
    or (work_reference<>'' and work_reference !~ '^https://[^[:space:]<>]+$')
    or work_attachments is null or cardinality(work_attachments)>3 then
    raise exception 'invalid_submission' using errcode='22023';
  end if;
  foreach item in array work_attachments loop
    if item is null or item !~ ('^' || account_id::text || '/[a-z0-9-]+\.(pdf|docx|jpg|png|webp)$')
      or not exists(select 1 from storage.objects where bucket_id='work-files' and name=item) then
      raise exception 'invalid_attachment' using errcode='22023';
    end if;
  end loop;
  perform pg_advisory_xact_lock(hashtextextended(account_id::text,0));
  if (select count(*) from public.work_submissions where author_id=account_id and created_at>now()-interval '1 day')>=5 then
    raise exception 'daily_submission_limit' using errcode='22023';
  end if;
  insert into public.work_submissions(author_id,title,kind,summary,body,reference_url,attachment_paths)
  values(account_id,trim(work_title),work_kind,trim(work_summary),trim(work_body),work_reference,work_attachments)
  returning id into new_id;
  return new_id;
end $$;
revoke all on function public.submit_work(text,text,text,text,text,text[]) from public;
grant execute on function public.submit_work(text,text,text,text,text,text[]) to authenticated;

create or replace function public.review_work(work_id uuid, decision text, message text default '')
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_site_chef() then raise exception 'chef_required' using errcode='42501'; end if;
  if decision is null or decision not in ('reviewing','selected','declined') or message is null or length(message)>5000 then
    raise exception 'invalid_review' using errcode='22023';
  end if;
  update public.work_submissions set status=decision,feedback=message,reviewed_by=auth.uid(),reviewed_at=now() where id=work_id;
  if not found then raise exception 'submission_not_found' using errcode='22023'; end if;
end $$;
revoke all on function public.review_work(uuid,text,text) from public;
grant execute on function public.review_work(uuid,text,text) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('work-files','work-files',false,10485760,array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists work_files_read on storage.objects;
create policy work_files_read on storage.objects for select to authenticated
using(bucket_id='work-files' and (split_part(name,'/',1)=auth.uid()::text or public.is_site_admin()));
drop policy if exists work_files_insert on storage.objects;
create policy work_files_insert on storage.objects for insert to authenticated
with check(bucket_id='work-files' and split_part(name,'/',1)=auth.uid()::text);
-- Proposals and attachments stay private. No public gallery or automatic emails are created.
-- Restrictive guards preserve privacy even when other buckets have broad allow policies.
drop policy if exists work_files_anon_guard on storage.objects;
create policy work_files_anon_guard on storage.objects as restrictive for select to anon
using(bucket_id<>'work-files');
drop policy if exists work_files_auth_guard on storage.objects;
create policy work_files_auth_guard on storage.objects as restrictive for select to authenticated
using(bucket_id<>'work-files' or split_part(name,'/',1)=auth.uid()::text or public.is_site_admin());
drop policy if exists work_files_upload_guard on storage.objects;
create policy work_files_upload_guard on storage.objects as restrictive for insert to authenticated
with check(bucket_id<>'work-files' or split_part(name,'/',1)=auth.uid()::text);
