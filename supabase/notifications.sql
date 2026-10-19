-- Notificaciones del sitio. Ejecutar en SQL Editor después de setup.sql. Se puede repetir sin riesgo.
create table if not exists public.site_notifications(
 id bigint generated always as identity primary key,
 audience text not null check(audience in('user','admins','all')),
 recipient_id uuid references auth.users(id) on delete cascade,
 kind text not null check(kind ~ '^[a-z_]{2,40}$'),
 title text not null check(length(title) between 1 and 200),
 body text not null default '' check(length(body)<=4000),
 link text not null default '' check(link='' or link ~ '^#[-a-z0-9]{1,60}$'),
 data jsonb not null default '{}'::jsonb check(jsonb_typeof(data)='object' and octet_length(data::text)<=4000),
 actor_id uuid references auth.users(id) on delete set null,
 dedupe_key text unique,
 created_at timestamptz not null default now(),
 constraint site_notifications_target check((audience='user')=(recipient_id is not null)));
create index if not exists site_notif_user on public.site_notifications(recipient_id,created_at desc) where audience='user';
create index if not exists site_notif_broadcast on public.site_notifications(audience,created_at desc) where audience<>'user';
alter table public.site_notifications enable row level security;
revoke all on public.site_notifications from anon,authenticated;
create table if not exists public.site_notification_reads(
 user_id uuid not null references auth.users(id) on delete cascade,
 notification_id bigint not null references public.site_notifications(id) on delete cascade,
 read_at timestamptz not null default now(), primary key(user_id,notification_id));
alter table public.site_notification_reads enable row level security;
revoke all on public.site_notification_reads from anon,authenticated;

create or replace function public.notify_internal(p_audience text,p_recipient uuid,p_kind text,p_title text,p_body text,p_link text,p_data jsonb,p_actor uuid,p_key text)
returns void language plpgsql security definer set search_path='' as $$
begin
 insert into public.site_notifications(audience,recipient_id,kind,title,body,link,data,actor_id,dedupe_key)
 values(p_audience,case when p_audience='user' then p_recipient end,p_kind,left(p_title,200),left(coalesce(p_body,''),4000),coalesce(p_link,''),coalesce(p_data,'{}'::jsonb),p_actor,p_key)
 on conflict(dedupe_key) do nothing;
end $$;
revoke all on function public.notify_internal(text,uuid,text,text,text,text,jsonb,uuid,text) from public,anon,authenticated;

create or replace function public.my_notifications(take integer default 30)
returns table(id bigint,kind text,title text,body text,link text,data jsonb,created_at timestamptz,dedupe_key text,is_read boolean)
language sql stable security definer set search_path='' as $$
 select n.id,n.kind,n.title,n.body,n.link,n.data,n.created_at,n.dedupe_key,
  exists(select 1 from public.site_notification_reads r where r.user_id=auth.uid() and r.notification_id=n.id)
 from public.site_notifications n
 where auth.uid() is not null and(
  (n.audience='user' and n.recipient_id=auth.uid())
  or(n.audience='all' and n.created_at>(select u.created_at-interval '14 days' from auth.users u where u.id=auth.uid()))
  or(n.audience='admins' and public.is_site_admin() and n.actor_id is distinct from auth.uid()))
 order by n.created_at desc,n.id desc limit greatest(1,least(coalesce(take,30),50));
$$;
revoke all on function public.my_notifications(integer) from public;
grant execute on function public.my_notifications(integer) to authenticated;

create or replace function public.mark_notifications_read(notification_ids bigint[] default null)
returns integer language plpgsql security definer set search_path='' as $$
declare done integer;
begin
 if auth.uid() is null then raise exception 'confirmed_account_required' using errcode='42501'; end if;
 if notification_ids is not null and cardinality(notification_ids)>100 then raise exception 'invalid_request' using errcode='22023'; end if;
 insert into public.site_notification_reads(user_id,notification_id)
 select auth.uid(),v.id from public.my_notifications(50) v where notification_ids is null or v.id=any(notification_ids)
 on conflict do nothing;
 get diagnostics done=row_count; return done;
end $$;
revoke all on function public.mark_notifications_read(bigint[]) from public;
grant execute on function public.mark_notifications_read(bigint[]) to authenticated;

create or replace function public.tg_notify_work_insert() returns trigger language plpgsql security definer set search_path='' as $$
declare who text; k text := case new.kind when 'research' then 'investigación' else 'desarrollo' end;
begin
 select left(coalesce(nullif(trim(raw_user_meta_data->>'full_name'),''),'Participante'),100) into who from auth.users where id=new.author_id;
 perform public.notify_internal('user',new.author_id,'work_received','Gracias por compartir «'||left(new.title,150)||'»',
  'Recibimos tu '||k||'. Si tu proyecto es seleccionado, te contactaremos de forma privada para asegurar tu participación.','#comparte',
  jsonb_build_object('work_id',new.id,'title',left(new.title,160),'kind',new.kind,'name',who),null,'work:'||new.id);
 perform public.notify_internal('admins',null,'work_new','Nueva propuesta: «'||left(new.title,150)||'»',who||' envió una '||k||'. Revísala en Trabajos y colaboración.','#admin',
  jsonb_build_object('work_id',new.id),new.author_id,'work-admin:'||new.id);
 return new;
exception when others then return new;
end $$;
drop trigger if exists balcon_notify_work_insert on public.work_submissions;
create trigger balcon_notify_work_insert after insert on public.work_submissions for each row execute function public.tg_notify_work_insert();

create or replace function public.tg_notify_work_update() returns trigger language plpgsql security definer set search_path='' as $$
declare label text; stamp text;
begin
 if new.status is distinct from old.status or new.feedback is distinct from old.feedback then
  label := case new.status when 'reviewing' then 'En revisión' when 'selected' then 'Seleccionada para explorar colaboración' when 'declined' then 'No seleccionada' else 'Recibida' end;
  stamp := floor(extract(epoch from coalesce(new.reviewed_at,now())))::bigint::text;
  perform public.notify_internal('user',new.author_id,'work_review','Checo respondió a «'||left(new.title,140)||'»',
   'Estado: '||label||case when new.feedback<>'' then E'\n\n'||left(new.feedback,1500) else '' end,'#comparte',
   jsonb_build_object('work_id',new.id,'status',new.status),new.reviewed_by,'review:'||new.id||':'||stamp);
  perform public.notify_internal('admins',null,'work_status','Propuesta actualizada: «'||left(new.title,140)||'»','Nuevo estado: '||label||'.','#admin',
   jsonb_build_object('work_id',new.id),new.reviewed_by,'review-admin:'||new.id||':'||stamp);
 end if;
 if to_jsonb(new)->>'visibility'='public' and to_jsonb(old)->>'visibility' is distinct from 'public' and old.created_at<now() then
  perform public.notify_internal('admins',null,'work_public','Una propuesta ahora es pública: «'||left(new.title,140)||'»','Ya aparece en la galería de la comunidad.','#comparte',
   jsonb_build_object('work_id',new.id),new.author_id,null);
 end if;
 return new;
exception when others then return new;
end $$;
drop trigger if exists balcon_notify_work_update on public.work_submissions;
create trigger balcon_notify_work_update after update on public.work_submissions for each row execute function public.tg_notify_work_update();

create or replace function public.tg_notify_new_account() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform public.notify_internal('user',new.id,'welcome','Te damos la bienvenida a Balcón del Zócalo','Aquí verás las respuestas a tus propuestas y las novedades del laboratorio.','#comparte','{}'::jsonb,null,'welcome:'||new.id);
 perform public.notify_internal('admins',null,'account_new','Nueva cuenta registrada',left(coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'),''),'Una persona'),100)||' creó una cuenta de visitante.','#admin','{}'::jsonb,new.id,'account:'||new.id);
 return new;
exception when others then return new;
end $$;
drop trigger if exists balcon_notify_new_account on auth.users;
create trigger balcon_notify_new_account after insert on auth.users for each row execute function public.tg_notify_new_account();

create or replace function public.tg_notify_publish() returns trigger language plpgsql security definer set search_path='' as $$
declare item jsonb; n integer := 0; old_ids text[];
begin
 if new.revision is not distinct from old.revision then return new; end if;
 select coalesce(array_agg(x->>'id'),'{}') into old_ids from jsonb_array_elements(case when jsonb_typeof(old.document->'news')='array' then old.document->'news' else '[]'::jsonb end) x;
 for item in select x from jsonb_array_elements(case when jsonb_typeof(new.document->'news')='array' then new.document->'news' else '[]'::jsonb end) x loop
  exit when n>=5;
  if coalesce(item->>'verification','')<>'demo' and coalesce(item->>'title','')<>'' and not((item->>'id')=any(old_ids)) then
   perform public.notify_internal('all',null,case when item->>'channel'='medio' then 'news_media' else 'news' end,
    case when item->>'channel'='medio' then 'Noticias del medio: ' else 'Nueva nota: ' end||left(item->>'title',170),
    left(coalesce(item->>'excerpt',''),500),'#novedades',jsonb_build_object('news_id',item->>'id'),new.updated_by,'news:'||(item->>'id'));
   n := n+1;
  end if;
 end loop;
 perform public.notify_internal('admins',null,'site_published','Se publicó la versión '||new.revision||' del sitio',
  case when n>0 then 'Incluye '||n||' nota(s) nueva(s).' else 'Cambios de contenido o diseño publicados.' end,'#admin',
  jsonb_build_object('revision',new.revision),new.updated_by,'publish:'||new.revision);
 delete from public.site_notifications where created_at<now()-interval '180 days';
 return new;
exception when others then return new;
end $$;
drop trigger if exists balcon_notify_publish on public.cms_site;
create trigger balcon_notify_publish after update on public.cms_site for each row execute function public.tg_notify_publish();

create or replace function public.tg_notify_role() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' or (new.chef and not old.chef) then
  perform public.notify_internal('user',new.user_id,'role',case when new.chef then 'Tu cuenta fue asignada al chef Checo' else 'Ahora tienes acceso de administración' end,
   'Ya puedes revisar propuestas y editar el sitio desde el panel.','#admin','{}'::jsonb,auth.uid(),null);
 end if; return new;
exception when others then return new;
end $$;
drop trigger if exists balcon_notify_role on public.cms_admins;
create trigger balcon_notify_role after insert or update of chef on public.cms_admins for each row execute function public.tg_notify_role();
revoke all on function public.tg_notify_work_insert(),public.tg_notify_work_update(),public.tg_notify_new_account(),public.tg_notify_publish(),public.tg_notify_role() from public,anon,authenticated;
notify pgrst,'reload schema';
