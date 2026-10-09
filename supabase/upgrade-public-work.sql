-- Run in SQL Editor after setup.sql. Existing proposals remain private.
alter table public.work_submissions add column if not exists visibility text not null default 'private' check(visibility in ('private','public'));
alter table public.work_submissions add column if not exists author_name text not null default '';
create index if not exists public_work_date on public.work_submissions(created_at desc) where visibility='public';
-- This wrapper keeps the original private submission validation and rate limit.
create or replace function public.submit_work_with_visibility(work_title text,work_kind text,work_summary text,
 work_body text,work_reference text default '',work_attachments text[] default '{}',work_visibility text default 'private')
returns uuid language plpgsql security definer set search_path='' as $$
declare result_id uuid; display_name text;
begin
 if work_visibility is null or work_visibility not in ('private','public') then raise exception 'invalid_visibility' using errcode='22023'; end if;
 result_id := public.submit_work(work_title,work_kind,work_summary,work_body,work_reference,work_attachments);
 select left(coalesce(raw_user_meta_data->>'full_name','Participante'),100) into display_name from auth.users where id=auth.uid();
 update public.work_submissions set visibility=work_visibility,author_name=display_name where id=result_id;
 return result_id;
end $$;
revoke all on function public.submit_work_with_visibility(text,text,text,text,text,text[],text) from public;
grant execute on function public.submit_work_with_visibility(text,text,text,text,text,text[],text) to authenticated;
create or replace function public.public_works(take integer default 20,skip integer default 0)
returns table(id uuid,title text,kind text,summary text,body text,reference_url text,attachment_paths text[],author_name text,created_at timestamptz)
language sql stable security definer set search_path='' as $$
 select w.id,w.title,w.kind,w.summary,w.body,w.reference_url,w.attachment_paths,w.author_name,w.created_at
 from public.work_submissions w where w.visibility='public' order by w.created_at desc,w.id
 limit greatest(1,least(coalesce(take,20),50)) offset greatest(0,least(coalesce(skip,0),50000));
$$;
revoke all on function public.public_works(integer,integer) from public;
grant execute on function public.public_works(integer,integer) to anon,authenticated;
create or replace function public.set_work_visibility(work_id uuid,work_visibility text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'confirmed_account_required' using errcode='42501';end if;
 if work_visibility is null or work_visibility not in ('private','public') then raise exception 'invalid_visibility' using errcode='22023';end if;
 update public.work_submissions set visibility=work_visibility where id=work_id and author_id=auth.uid();
 if not found then raise exception 'submission_not_found' using errcode='42501';end if;
end $$;
revoke all on function public.set_work_visibility(uuid,text) from public;
grant execute on function public.set_work_visibility(uuid,text) to authenticated;
create or replace function public.is_public_work_file(file_path text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.work_submissions where visibility='public' and file_path=any(attachment_paths));
$$;
revoke all on function public.is_public_work_file(text) from public;
grant execute on function public.is_public_work_file(text) to anon,authenticated;
drop policy if exists work_files_public_read on storage.objects;
create policy work_files_public_read on storage.objects for select to anon,authenticated
using(bucket_id='work-files' and public.is_public_work_file(name));
drop policy if exists work_files_anon_guard on storage.objects;
create policy work_files_anon_guard on storage.objects as restrictive for select to anon
using(bucket_id<>'work-files' or public.is_public_work_file(name));
drop policy if exists work_files_auth_guard on storage.objects;
create policy work_files_auth_guard on storage.objects as restrictive for select to authenticated
using(bucket_id<>'work-files' or split_part(name,'/',1)=auth.uid()::text or public.is_site_admin() or public.is_public_work_file(name));
