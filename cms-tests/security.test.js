import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { createSiteDocument, validateSiteDocument, safeHref, imageURL } from '../web/site-model.js';
import { validateServiceConfig } from '../web/service.js';
import { setContentField } from '../web/content-binding.js';
const seed=JSON.parse(await readFile(new URL('../Sources/Resources/content.json',import.meta.url)));
const document=createSiteDocument(seed);

test('URLs, document validation and service configuration reject unsafe inputs',()=>{
 assert.equal(safeHref('javascript:alert(1)',''),'');
 assert.equal(safeHref('data:text/html,<script>',''),'');
 assert.equal(imageURL('data:image/svg+xml;base64,PHN2Zz4='),'');
 assert.equal(safeHref('https://example.com/path'),'https://example.com/path');
 const bad=structuredClone(document);bad.home.buttonLink='javascript:alert(1)';assert.throws(()=>validateSiteDocument(bad));
 const secret='sb_secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxx';assert.throws(()=>validateServiceConfig({url:'https://example.supabase.co',publishableKey:secret}));
 const jwt=`x.${Buffer.from(JSON.stringify({role:'service_role'})).toString('base64url')}.x`;
 assert.throws(()=>validateServiceConfig({url:'https://example.supabase.co',publishableKey:jwt}));
 assert.throws(()=>validateServiceConfig({url:'http://example.supabase.co',publishableKey:'sb_publishable_xxxxxxxxxxxxxxxxxxxxxxxxxxxx'}));
 assert.doesNotThrow(()=>validateSiteDocument(document));
});

test('free layout positions reject invalid geometry and content bindings reject prototype paths',()=>{
 const value=structuredClone(document);value.elementOverrides={'page-noticias:section-home-hero.h1-0':{positions:{tablet:{container:'page-noticias',x:.1,y:600,width:.8}}}};
 assert.doesNotThrow(()=>validateSiteDocument(value));
 for(const patch of [{x:-1},{y:Infinity},{width:0},{container:'<script>'}]){const invalid=structuredClone(value);Object.assign(Object.values(invalid.elementOverrides)[0].positions.tablet,patch);assert.throws(()=>validateSiteDocument(invalid));}
 assert.throws(()=>setContentField(value,'__proto__.polluted','unsafe'));
 assert.throws(()=>setContentField(value,'home.constructor.prototype.polluted','unsafe'));
 assert.equal({}.polluted,undefined);
 setContentField(value,'recipes.'+value.recipes[0].id+'.name','Nombre compartido');assert.equal(value.recipes[0].name,'Nombre compartido');
});

test('PostgreSQL policies enforce visitor, administrator and owner permissions',async()=>{
 const db=new PGlite();
 const owner='00000000-0000-0000-0000-000000000001',visitor='00000000-0000-0000-0000-000000000002',third='00000000-0000-0000-0000-000000000003';
 try {
 await db.exec(`create role anon;create role authenticated;create schema auth;create schema storage;
 create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}');
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to anon,authenticated;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
 alter table storage.objects enable row level security;grant usage on schema storage to anon,authenticated;grant select,insert,update,delete on storage.objects to anon,authenticated;
 insert into auth.users(id,email,email_confirmed_at) values('${owner}','owner@example.test',now()),('${visitor}','visitor@example.test',now()),('${third}','third@example.test',now());`);
 await db.exec(await readFile(new URL('../supabase/setup.sql',import.meta.url),'utf8'));
 await db.query("select public.bootstrap_site_owner('owner@example.test')");
 const as=async(role,id,action)=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec(`set role ${role}`);try{return await action();}finally{await db.exec('reset role');}};
 await as('anon','',async()=>{
  assert.equal((await db.query('select revision from public.cms_site')).rows[0].revision,0);
  await assert.rejects(db.query('select * from public.cms_admins'),/permission denied/);
  await assert.rejects(db.query('select public.publish_site(0,$1::jsonb)',[JSON.stringify(document)]),/permission denied/);
 });
 await as('authenticated',visitor,async()=>{
  assert.equal((await db.query('select * from public.cms_admins')).rows.length,0);
  await assert.rejects(db.query('select public.publish_site(0,$1::jsonb)',[JSON.stringify(document)]),/admin_required/);
  await assert.rejects(db.query('insert into public.cms_admins(user_id,owner) values($1,true)',[visitor]),/permission denied/);
  await assert.rejects(db.query("select public.bootstrap_site_owner('visitor@example.test')"),/permission denied/);
  await assert.rejects(db.query("insert into storage.objects(bucket_id,name) values('site-media','visitor.jpg')"),/row-level security/);
 });
 await as('authenticated',owner,async()=>{
  assert.equal((await db.query('select * from public.cms_admins')).rows.length,1);
  const result=await db.query('select public.publish_site(0,$1::jsonb) result',[JSON.stringify(document)]);
  assert.equal(result.rows[0].result.revision,1);
  await assert.rejects(db.query('select public.publish_site(0,$1::jsonb)',[JSON.stringify(document)]),/revision_conflict/);
  assert.equal((await db.query('select count(*) from public.cms_revisions')).rows[0].count,1);
  const missing=structuredClone(document);delete missing.cmsVersion;
  await assert.rejects(db.query('select public.publish_site(1,$1::jsonb)',[JSON.stringify(missing)]),/invalid_document/);
  await db.query("insert into storage.objects(bucket_id,name) values('site-media','owner.jpg')");
  await db.query("select public.set_site_admin('visitor@example.test',true)");
  assert.equal((await db.query('select * from public.list_site_admins()')).rows.length,2);
  await assert.rejects(db.query("select public.set_site_admin('owner@example.test',false)"),/owner_cannot_be_changed_here/);
 });
 await as('authenticated',visitor,async()=>{
  assert.equal((await db.query('select owner from public.cms_admins')).rows[0].owner,false);
  await assert.rejects(db.query("select public.set_site_admin('third@example.test',true)"),/owner_required/);
  await assert.rejects(db.query('select * from public.list_site_admins()'),/owner_required/);
  await assert.rejects(db.query('update public.cms_site set revision=999'),/permission denied/);
  await assert.rejects(db.query('delete from public.cms_revisions'),/permission denied/);
 });
 await as('authenticated',owner,()=>db.query("select public.set_site_admin('visitor@example.test',false)"));
 await as('authenticated',visitor,()=>assert.rejects(db.query('select public.publish_site(1,$1::jsonb)',[JSON.stringify(document)]),/admin_required/));
 await as('anon','',async()=>{
  assert.equal((await db.query('select revision from public.cms_site')).rows[0].revision,1);
  assert.equal((await db.query("select * from storage.objects where bucket_id='site-media'")).rows.length,1);
 });
 await db.exec("create policy unrelated_bucket_read on storage.objects for select to anon,authenticated using(true);create policy unrelated_bucket_upload on storage.objects for insert to authenticated with check(true)");
 let proposal;
 await as('authenticated',visitor,async()=>{
  proposal=(await db.query("select public.submit_work($1,'research',$2,$3,'https://example.test',array[]::text[]) id",['Fermentación de maíz','Estudio de fermentación y técnicas de cocina.','Resultados de una investigación gastronómica y propuesta de colaboración con el chef.'])).rows[0].id;
  assert.equal((await db.query('select * from public.work_submissions')).rows.length,1);
  assert.equal((await db.query('select status from public.work_submissions')).rows[0].status,'received');
  await assert.rejects(db.query("update public.work_submissions set status='selected'"),/permission denied/);
  await assert.rejects(db.query("select public.review_work($1,'selected','')",[proposal]),/chef_required/);
  await db.query("insert into storage.objects(bucket_id,name) values('work-files',$1)",[visitor+'/file.pdf']);
  await assert.rejects(db.query("insert into storage.objects(bucket_id,name) values('work-files',$1)",[third+'/file.pdf']),/row-level security/);
  await assert.rejects(db.query("select public.submit_work($1,'research',$2,$3,'',array[$4])",['Valid title','Valid summary of sufficient length','Long enough research body with substantive results for the chef to assess.',third+'/file.pdf']),/invalid_attachment/);
 });
 await as('authenticated',third,async()=>{
  assert.equal((await db.query('select * from public.work_submissions')).rows.length,0);
  assert.equal((await db.query("select * from storage.objects where bucket_id='work-files'")).rows.length,0);
  await assert.rejects(db.query("select public.set_site_chef('third@example.test')"),/owner_required/);
 });
 await as('anon','',async()=>{
  await assert.rejects(db.query('select * from public.work_submissions'),/permission denied/);
  assert.equal((await db.query("select * from storage.objects where bucket_id='work-files'")).rows.length,0);
 });
 await as('authenticated',owner,async()=>{
  assert.equal((await db.query('select * from public.work_submissions')).rows.length,1);
  await assert.rejects(db.query("select public.review_work($1,'selected','')",[proposal]),/chef_required/);
  await db.query("select public.set_site_chef('third@example.test')");
 });
 await as('authenticated',third,async()=>{
  assert.equal((await db.query('select chef from public.cms_admins')).rows[0].chef,true);
  await db.query("select public.review_work($1,'selected','Checo quiere explorar esta investigación contigo.')",[proposal]);
  assert.equal((await db.query('select reviewed_by from public.work_submissions')).rows[0].reviewed_by,third);
  assert.equal((await db.query("select * from storage.objects where bucket_id='work-files'")).rows.length,1);
 });
 await as('authenticated',visitor,async()=>{
  const result=(await db.query('select status,feedback from public.work_submissions')).rows[0];
  assert.equal(result.status,'selected');assert.match(result.feedback,/Checo/);
 });
 await db.exec(await readFile(new URL('../supabase/upgrade-public-work.sql',import.meta.url),'utf8'));
 await as('anon','',async()=>{assert.equal((await db.query('select * from public.public_works()')).rows.length,0);});
 let visible;
 await as('authenticated',visitor,async()=>{
  visible=(await db.query("select public.submit_work_with_visibility($1,'development',$2,$3,'',array[$4],'public') id",['Maíz compartido','Un desarrollo gastronómico público para todos.','Resultados detallados del desarrollo gastronómico compartido con la comunidad.',visitor+'/file.pdf'])).rows[0].id;
 });
 await as('anon','',async()=>{
  const rows=(await db.query('select * from public.public_works()')).rows;assert.equal(rows.length,1);assert.equal(rows[0].id,visible);assert.equal('author_id' in rows[0],false);assert.equal('feedback' in rows[0],false);
  assert.equal((await db.query("select * from storage.objects where bucket_id='work-files'")).rows.length,1);
  await assert.rejects(db.query('select * from public.work_submissions'),/permission denied/);
 });
 await as('authenticated',third,()=>assert.rejects(db.query("select public.set_work_visibility($1,'private')",[visible]),/submission_not_found/));
 await as('authenticated',visitor,()=>db.query("select public.set_work_visibility($1,'private')",[visible]));
 await as('anon','',async()=>{
  assert.equal((await db.query('select * from public.public_works()')).rows.length,0);
  assert.equal((await db.query("select * from storage.objects where bucket_id='work-files'")).rows.length,0);
 });
 // Re-running setup must preserve proposals, roles and published content.
 await db.exec(await readFile(new URL('../supabase/setup.sql',import.meta.url),'utf8'));
 assert.equal((await db.query('select status from public.work_submissions')).rows[0].status,'selected');
 } finally {await db.close();}
});

test('registration keeps real authentication separate from administrator lookup failures',async()=>{
 const {SiteService}=await import('../web/service.js');
 const config={url:'https://example.supabase.co',publishableKey:'sb_publishable_xxxxxxxxxxxxxxxxxxxxxxxxxxxx'};
 const original=globalThis.fetch,originalLocation=globalThis.location;globalThis.location={origin:'https://example.test',pathname:'/'};const requests=[];
 try{
  globalThis.fetch=async(url,options)=>{requests.push({url,options});if(url.includes('/signup'))return new Response(JSON.stringify({access_token:'test-token',refresh_token:'test-refresh',expires_in:3600}),{status:200});if(url.endsWith('/user'))return new Response(JSON.stringify({id:'00000000-0000-0000-0000-000000000001',email:'person@example.test'}),{status:200});return new Response(JSON.stringify({code:'PGRST205'}),{status:404});};
  const service=new SiteService(config);assert.equal(await service.register(' Participant ',' PERSON@example.test ','test-password-1234'),true);assert.equal(service.user.email,'person@example.test');assert.equal(service.isAdmin,false);assert.match(service.roleIssue,/permisos/);const payload=JSON.parse(requests[0].options.body);assert.equal(payload.email,'person@example.test');assert.equal(payload.data.full_name,'Participant');
  for(const [status,code,msg,expected]of [[429,'over_email_send_rate_limit','',/límite de envío/],[422,'email_address_not_authorized','',/destinatario/],[500,'unexpected_failure','Error sending confirmation email',/servicio de envío/]]){globalThis.fetch=async()=>new Response(JSON.stringify({code,msg}),{status});await assert.rejects(new SiteService(config).register('Name','person@example.test','test-password-1234'),expected);}
 }finally{globalThis.fetch=original;if(originalLocation===undefined)delete globalThis.location;else globalThis.location=originalLocation;}
});
