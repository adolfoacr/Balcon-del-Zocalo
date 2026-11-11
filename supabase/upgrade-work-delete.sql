-- Optional permanent deletion. Run after setup.sql in the project's SQL Editor.
-- Without this migration the app can still withdraw a work from its gallery,
-- using the administrator-only publication mechanism already installed.
begin;
create or replace function public.delete_work(work_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or not public.is_site_admin() then
    raise exception 'admin_required' using errcode='42501';
  end if;
  delete from public.work_submissions where id=work_id;
  if not found then
    raise exception 'submission_not_found' using errcode='22023';
  end if;
end $$;
revoke all on function public.delete_work(uuid) from public,anon,authenticated;
grant execute on function public.delete_work(uuid) to authenticated;
commit;
-- Files remain in Storage for separate retention/cleanup. No broad DELETE grant
-- or unauthenticated deletion policy is introduced for the table or its files.
