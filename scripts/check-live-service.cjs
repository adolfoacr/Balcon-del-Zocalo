// Public availability checks only. No accounts, emails or content are modified.
const fs=require('node:fs');
const assert=require('node:assert/strict');
const siteURL='https://adolfoacr.github.io/Balcon-del-Zocalo/';
const report={checkedAt:new Date().toISOString(),siteURL,checks:[],auth:{}};
async function request(label,url,options={}) {
 let last;
 for(let attempt=0;attempt<3;attempt++)try {
  const response=await fetch(url,{...options,signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new Error(label+': HTTP '+response.status);
  const value=options.jsonResponse?await response.json():await response.text();
  report.checks.push({name:label,status:response.status});return value;
 }catch(error){last=error;}
 throw last;
}
(async()=>{
 const local=fs.readFileSync('index.html','utf8');
 const config=JSON.parse(local.match(/<script[^>]*id="service-config"[^>]*>(.*?)<\/script>/s)[1]);
 assert.match(config.url,/^https:\/\/[-a-z0-9]+\.supabase\.co$/);
 const headers={apikey:config.publishableKey,Origin:new URL(siteURL).origin};
 const results=await Promise.allSettled([
  request('Sitio público por HTTPS',siteURL).then(html=>assert.ok(html.includes('service-config'),'El sitio no contiene la aplicación')),
  request('JavaScript público de la galería',siteURL+'assets/bz-work.js').then(js=>assert.ok(js.includes('BZWork'))),
  request('Base de datos pública',config.url+'/rest/v1/cms_site?id=eq.1&select=revision',{headers,jsonResponse:true}).then(rows=>assert.ok(Number.isInteger(rows[0]?.revision))),
  request('Servicio de autenticación',config.url+'/auth/v1/health',{headers,jsonResponse:true}),
  request('Configuración de cuentas',config.url+'/auth/v1/settings',{headers,jsonResponse:true}).then(settings=>{
   report.auth={emailLoginEnabled:settings.external?.email===true,registrationEnabled:settings.disable_signup!==true,emailConfirmationRequired:settings.mailer_autoconfirm!==true};
   assert.ok(report.auth.emailLoginEnabled,'El acceso por correo está desactivado');
   assert.ok(report.auth.registrationEnabled,'El registro está desactivado');
  }),
  request('Galería pública',config.url+'/rest/v1/rpc/public_works',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({take:1,skip:0}),jsonResponse:true}).then(rows=>assert.ok(Array.isArray(rows)))
 ]);
 const failures=results.filter(result=>result.status==='rejected').map(result=>String(result.reason.message||result.reason));
 report.ok=!failures.length;report.failures=failures;
 fs.writeFileSync('service-status.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));
 if(failures.length)process.exitCode=1;
})().catch(error=>{console.error(error.message);process.exitCode=1});
