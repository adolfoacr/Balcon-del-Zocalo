export function validateServiceConfig(config) {
  if (!config?.url && !config?.publishableKey) return {url:'',publishableKey:''};
  const url=new URL(config.url);
  if (url.protocol!=='https:' || !/^[a-z0-9-]+\.supabase\.co$/.test(url.hostname) || url.username || url.password || url.search || url.hash || url.pathname!=='/') throw new Error('Usa la URL principal de tu proyecto Supabase.');
  const key=config.publishableKey;
  let publicKey=typeof key==='string' && /^sb_publishable_[a-zA-Z0-9_-]{20,}$/.test(key);
  if (!publicKey && typeof key==='string' && key.split('.').length===3) {
    try { const body=JSON.parse(atob(key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))); publicKey=body.role==='anon'; } catch {}
  }
  if (!publicKey) throw new Error('La web solo admite claves públicas Publishable o anon. No uses claves secret ni service_role.');
  return {url:url.origin,publishableKey:key};
}
export function serviceErrorMessage(status,code,reason='') {
  const auth={
    over_email_send_rate_limit:'Se alcanzó el límite de envío de correos. Espera unos minutos antes de intentarlo de nuevo.',
    over_request_rate_limit:'Hubo demasiados intentos. Espera unos minutos antes de volver a intentar.',
    email_address_not_authorized:'El servicio de correo todavía no permite enviar confirmaciones a este destinatario. El restaurante debe configurar el envío para sus usuarios.',
    email_address_invalid:'Revisa que el correo esté escrito correctamente.',
    email_exists:'Este correo ya tiene una cuenta. Inicia sesión o recupera tu contraseña.',
    user_already_exists:'Este correo ya tiene una cuenta. Inicia sesión o recupera tu contraseña.',
    weak_password:'Elige una contraseña de al menos 12 caracteres que combine letras, números y símbolos.',
    signup_disabled:'El registro está desactivado temporalmente. El restaurante debe habilitarlo.',
    email_provider_disabled:'El registro por correo está desactivado temporalmente.',
    email_not_confirmed:'Confirma tu correo antes de iniciar sesión. Revisa también la carpeta de spam.',
    invalid_credentials:'El correo o la contraseña no coinciden. Revisa tus datos o recupera el acceso.',
    otp_expired:'El enlace de recuperación caducó o ya fue utilizado. Solicita un enlace nuevo.',
    same_password:'Elige una contraseña diferente a la anterior.',
    reauthentication_needed:'Por seguridad, solicita un enlace de recuperación nuevo antes de cambiar la contraseña.',
    session_not_found:'El acceso para cambiar la contraseña ya no está disponible. Solicita un enlace nuevo.',
    captcha_failed:'No pudimos verificar el registro. El restaurante debe revisar la configuración de verificación.'
  };
  if(auth[code])return auth[code];
  if(/error sending (confirmation|recovery|email)|smtp/i.test(reason))return 'No pudimos enviar el correo. El restaurante debe revisar su servicio de envío antes de volver a intentar.';
  if(status===429)return auth.over_request_rate_limit;
  if(code==='validation_failed' && /email/i.test(reason))return auth.email_address_invalid;
  return '';
}
export class SiteService {
  constructor(config) {
    this.config=validateServiceConfig(config); this.configured=!!this.config.url;
    this.session=null; this.user=null; this.role=null; this.refreshTask=null;
    this.authNotice='';this.authIssue='';
    this.storageKey=`balcon-session:${this.config.url}`;
  }
  get isAdmin() { return !!this.user && !!this.role; }
  get isOwner() { return this.isAdmin && this.role.owner===true; }
  get isChef() {return this.isAdmin && this.role.chef===true;}
  async request(path,{method='GET',json,body,headers={},authorized=true}={}) {
    if (!this.configured) throw new Error('El acceso por cuenta todavía no está activado.');
    if (authorized && this.session && this.session.expires_at < Date.now()/1000+30) await this.refresh();
    const requestHeaders={apikey:this.config.publishableKey,...headers};
    if (authorized && this.session) requestHeaders.Authorization=`Bearer ${this.session.access_token}`;
    if (json!==undefined) {body=JSON.stringify(json);requestHeaders['Content-Type']='application/json';}
    let response;try{response=await fetch(this.config.url+path,{method,headers:requestHeaders,body,cache:'no-store',signal:AbortSignal.timeout(20000)});}catch(cause){const error=new Error(cause.name==='TimeoutError'?'El servicio tardó demasiado en responder. Intenta nuevamente.':'No pudimos conectar. Revisa tu conexión e intenta nuevamente.');error.code=cause.name;throw error;}
    let data=null; const text=await response.text(); if (text) {try{data=JSON.parse(text);}catch{data={message:'Respuesta no disponible.'};}}
    if (!response.ok) {
      const code=data?.code || data?.error_code;
      const messages={chef_required:'Solo la cuenta asignada al chef Checo puede seleccionar propuestas.',confirmed_account_required:'Confirma tu correo antes de enviar tu trabajo.',invalid_submission:'Revisa la extensión de los textos y el enlace HTTPS.',daily_submission_limit:'Puedes enviar hasta cinco propuestas por día.',invalid_attachment:'No pudimos verificar tus archivos adjuntos.',admin_required:'Tu cuenta no tiene permisos para editar el sitio.',owner_required:'Solo el propietario puede gestionar administradores.',revision_conflict:'Otra sesión publicó cambios. Exporta tu borrador y carga la última versión antes de publicar.',owner_cannot_be_changed_here:'La cuenta del propietario no se puede cambiar desde este panel.',registered_confirmed_account_required:'La cuenta debe estar registrada y tener el correo confirmado.'};
      const reason=data?.message || data?.msg || data?.error_description || '';
      const error=new Error(serviceErrorMessage(response.status,code,reason) || (code==='PGRST202' ? 'Esta función estará disponible cuando se active la actualización del servicio.' : code==='PGRST205' ? 'El servicio todavía necesita activar sus tablas en Supabase.' : messages[reason] || (code==='40001' ? messages.revision_conflict : (response.status===401 || response.status===400 && /invalid.*(credentials|grant)|email.*confirm/i.test(reason)) ? 'Revisa tu correo, contraseña y confirmación de cuenta.' : response.status===403 ? 'Tu cuenta no tiene permiso para esta acción.' : 'No pudimos completar la solicitud. Intenta de nuevo.')));
      error.status=response.status; error.code=code; throw error;
    }
    return data;
  }
  saveSession(data) {
    if (!data?.access_token || !data?.refresh_token) return;
    this.session={access_token:data.access_token,refresh_token:data.refresh_token,expires_at:data.expires_at || Date.now()/1000+(data.expires_in || 3600)};
    try {sessionStorage.setItem(this.storageKey,JSON.stringify(this.session));} catch {}
  }
  clear() {this.roleIssue='';this.session=null;this.user=null;this.role=null;try{sessionStorage.removeItem(this.storageKey);}catch{}}
  async refresh() {
    if (!this.refreshTask) this.refreshTask=(async()=>{try{const data=await this.request('/auth/v1/token?grant_type=refresh_token',{method:'POST',json:{refresh_token:this.session.refresh_token},authorized:false});this.saveSession(data);}catch(error){this.clear();throw error;}finally{this.refreshTask=null;}})();
    return this.refreshTask;
  }
  async verify() {
    this.role=null;
    if (!this.session) return;
    try {
      this.user=await this.request('/auth/v1/user');
      this.roleIssue='';
      try{const roles=await this.request(`/rest/v1/cms_admins?user_id=eq.${encodeURIComponent(this.user.id)}&select=user_id,owner,chef`);this.role=roles?.find(row=>row.user_id===this.user.id) || null;}catch(error){if(error.status===401)throw error;this.roleIssue='Tu cuenta está activa, pero no pudimos verificar los permisos de administración. Vuelve a iniciar sesión más tarde.';}
    } catch(error) {this.user=null;this.role=null;if(error.status===401)this.clear();throw error;}
  }
  async restore() {
    if (!this.configured) return;
    try {const value=JSON.parse(sessionStorage.getItem(this.storageKey)||'null');if(value?.access_token && value?.refresh_token)this.session=value;}catch{}
    const params=new URLSearchParams(location.hash.slice(1));
    const url=new URL(location.href),query=url.searchParams;
    const recovery=params.get('type')==='recovery'||query.get('type')==='recovery'||query.get('auth')==='recovery';
    const callback=params.has('access_token')||params.has('error')||params.has('error_code')||query.has('token_hash')||query.has('code')||query.has('error')||query.has('error_code')||query.get('auth')==='recovery';
    if(!callback){await this.verify();return;}
    const errorCode=params.get('error_code')||query.get('error_code');
    const errorReturned=params.has('error')||params.has('error_code')||query.has('error')||query.has('error_code');
    const tokenHash=query.get('token_hash'),tokenType=query.get('type');
    // Remove credentials before any network request or further navigation.
    for(const key of ['auth','type','token_hash','code','error','error_code','error_description'])query.delete(key);
    const cleanPath=url.pathname+(query.size?'?'+query.toString():'');
    const returnTo=hash=>history.replaceState(null,'',cleanPath+hash);
    returnTo(recovery?'#nueva-clave':'#cuenta');
    this.clear();
    try{
      if(errorReturned)throw new Error(serviceErrorMessage(400,errorCode)||'No pudimos usar este enlace. Puede haber caducado o ya haber sido utilizado. Solicita uno nuevo.');
      if(params.get('access_token')&&params.get('refresh_token'))this.saveSession({access_token:params.get('access_token'),refresh_token:params.get('refresh_token'),expires_in:Number(params.get('expires_in'))});
      else if(tokenHash&&['recovery','signup','email'].includes(tokenType)){
        const data=await this.request('/auth/v1/verify',{method:'POST',json:{token_hash:tokenHash,type:tokenType},authorized:false});this.saveSession(data);
      }else throw new Error('Este enlace no contiene el acceso necesario. Solicita un enlace nuevo y abre el último correo recibido.');
      if(!this.session)throw new Error('No pudimos activar el acceso de este enlace. Solicita uno nuevo.');
      await this.verify();
      this.authNotice=recovery?'Enlace verificado. Escribe y confirma tu nueva contraseña.':'Correo confirmado. Ya puedes usar tu cuenta.';
    }catch(error){
      this.clear();this.authIssue=error.status===401?'El enlace de recuperación caducó o ya no es válido. Solicita un enlace nuevo.':error.message;
      returnTo(recovery?'#recuperar':'#cuenta');
    }
  }
  async login(email,password) {
    this.clear();const data=await this.request('/auth/v1/token?grant_type=password',{method:'POST',json:{email:email.trim().toLowerCase(),password},authorized:false});this.saveSession(data);await this.verify();
  }
  async register(name,email,password) {
    const normalizedEmail=email.trim().toLowerCase();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail))throw new Error('Revisa que el correo esté escrito correctamente.');
    if(password.length<12)throw new Error('Usa una contraseña de al menos 12 caracteres.');
    const data=await this.request(`/auth/v1/signup?redirect_to=${encodeURIComponent(location.origin+location.pathname+'#cuenta')}`,{method:'POST',json:{email:normalizedEmail,password,data:{full_name:name.trim()}},authorized:false});
    if(data?.access_token){this.saveSession(data);await this.verify();return true;}return false;
  }
  async logout() {try{if(this.session)await this.request('/auth/v1/logout',{method:'POST'});}finally{this.clear();}}
  async recover(email) {
    const normalizedEmail=email.trim().toLowerCase();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail))throw new Error('Revisa que el correo esté escrito correctamente.');
    const destination=location.origin+location.pathname+'?auth=recovery';
    return this.request(`/auth/v1/recover?redirect_to=${encodeURIComponent(destination)}`,{method:'POST',json:{email:normalizedEmail},authorized:false});
  }
  async changePassword(password) {
    if(!this.user||!this.session)throw new Error('Abre el enlace de recuperación de tu correo antes de cambiar la contraseña.');
    if(typeof password!=='string'||password.length<12||password.length>128)throw new Error('Usa una contraseña de entre 12 y 128 caracteres.');
    return this.request('/auth/v1/user',{method:'PUT',json:{password}});
  }
  async published() {const rows=await this.request('/rest/v1/cms_site?id=eq.1&select=document,revision,updated_at',{authorized:false});return rows?.[0] || {document:null,revision:0};}
  async publish(document,revision) {if(!this.isAdmin)throw new Error('Necesitas permisos de administrador.');return this.request('/rest/v1/rpc/publish_site',{method:'POST',json:{expected_revision:revision,new_document:document}});}
  async history() {if(!this.isAdmin)throw new Error('Necesitas permisos de administrador.');return this.request('/rest/v1/cms_revisions?select=revision,document,created_at&order=revision.desc&limit=20');}
  async admins() {return this.request('/rest/v1/rpc/list_site_admins',{method:'POST',json:{}});}
  async setAdmin(email,enabled) {if(!this.isOwner)throw new Error('Solo el propietario puede gestionar accesos.');return this.request('/rest/v1/rpc/set_site_admin',{method:'POST',json:{account_email:email,enabled}});}
  async setChef(email) {if(!this.isOwner)throw new Error('Solo el propietario puede asignar la cuenta del chef.');return this.request('/rest/v1/rpc/set_site_chef',{method:'POST',json:{account_email:email}});}
  async works(all=false) {if(!this.user)throw new Error('Inicia sesión para consultar propuestas.');if(all&&!this.isAdmin)throw new Error('Necesitas permisos de administrador.');return this.request(`/rest/v1/work_submissions?select=*&order=created_at.desc&limit=100${all?'':`&author_id=eq.${encodeURIComponent(this.user.id)}`}`);}
  async submitWork(values) {if(!this.user)throw new Error('Inicia sesión para enviar tu trabajo.');try{return await this.request('/rest/v1/rpc/submit_work_with_visibility',{method:'POST',json:values});}catch(error){if(error.code==='PGRST202' && values.work_visibility==='private'){const {work_visibility,...privateValues}=values;return this.request('/rest/v1/rpc/submit_work',{method:'POST',json:privateValues});}throw error;}}
  async publicWorks(skip=0) {return this.request('/rest/v1/rpc/public_works',{method:'POST',json:{take:20,skip},authorized:false});}
  async visibility(id,value) {if(!this.user)throw new Error('Inicia sesión para cambiar la visibilidad.');return this.request('/rest/v1/rpc/set_work_visibility',{method:'POST',json:{work_id:id,work_visibility:value}});}
  async reviewWork(id,decision,message) {if(!this.isChef)throw new Error('Solo Checo puede seleccionar propuestas.');return this.request('/rest/v1/rpc/review_work',{method:'POST',json:{work_id:id,decision,message}});}
  async uploadWork(file) {
    if(!this.user)throw new Error('Inicia sesión para adjuntar archivos.');
    const extensions={'application/pdf':'pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document':'docx','image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
    if(!extensions[file.type]||file.size>10*1024*1024)throw new Error('Elige PDF, DOCX, JPG, PNG o WebP de hasta 10 MB.');
    const path=`${this.user.id}/${crypto.randomUUID()}.${extensions[file.type]}`;
    await this.request(`/storage/v1/object/work-files/${path}`,{method:'POST',body:file,headers:{'Content-Type':file.type,'x-upsert':'false'}});return path;
  }
  async workFile(path) {
    if(!/^[-a-z0-9]+\/[-a-z0-9]+\.(pdf|docx|jpg|png|webp)$/.test(path))throw new Error('Archivo no disponible.');
    const data=await this.request(`/storage/v1/object/sign/work-files/${path}`,{method:'POST',json:{expiresIn:300}});
    const raw=data.signedURL;const signed=new URL(raw?.startsWith('/object/')?'/storage/v1'+raw:raw,this.config.url+'/storage/v1/');
    if(signed.origin!==this.config.url||!signed.pathname.startsWith('/storage/v1/object/sign/work-files/'))throw new Error('Archivo no disponible.');return signed.href;
  }
  async upload(file,kind='image') {
    if(!this.isAdmin)throw new Error('Necesitas permisos de administrador.');
    const types=kind==='pdf'?['application/pdf']:['image/jpeg','image/png','image/webp','image/gif'];
    if(!types.includes(file.type) || file.size>(kind==='pdf'?30:6)*1024*1024)throw new Error(kind==='pdf'?'Elige un PDF de hasta 30 MB.':'Elige una imagen JPG, PNG, WebP o GIF de hasta 6 MB.');
    const extension={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif','application/pdf':'pdf'}[file.type];
    const name=`${this.user.id}/${crypto.randomUUID()}.${extension}`;
    await this.request(`/storage/v1/object/site-media/${name}`,{method:'POST',body:file,headers:{'Content-Type':file.type,'x-upsert':'false'}});
    return `${this.config.url}/storage/v1/object/public/site-media/${name}`;
  }
}
