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
export class SiteService {
  constructor(config) {
    this.config=validateServiceConfig(config); this.configured=!!this.config.url;
    this.session=null; this.user=null; this.role=null; this.refreshTask=null;
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
    const response=await fetch(this.config.url+path,{method,headers:requestHeaders,body,cache:'no-store',signal:AbortSignal.timeout(20000)});
    let data=null; const text=await response.text(); if (text) {try{data=JSON.parse(text);}catch{data={message:'Respuesta no disponible.'};}}
    if (!response.ok) {
      const code=data?.code || data?.error_code;
      const messages={chef_required:'Solo la cuenta asignada al chef Checo puede seleccionar propuestas.',confirmed_account_required:'Confirma tu correo antes de enviar tu trabajo.',invalid_submission:'Revisa la extensión de los textos y el enlace HTTPS.',daily_submission_limit:'Puedes enviar hasta cinco propuestas por día.',invalid_attachment:'No pudimos verificar tus archivos adjuntos.',admin_required:'Tu cuenta no tiene permisos para editar el sitio.',owner_required:'Solo el propietario puede gestionar administradores.',revision_conflict:'Otra sesión publicó cambios. Exporta tu borrador y carga la última versión antes de publicar.',owner_cannot_be_changed_here:'La cuenta del propietario no se puede cambiar desde este panel.',registered_confirmed_account_required:'La cuenta debe estar registrada y tener el correo confirmado.'};
      const reason=data?.message || data?.msg || data?.error_description || '';
      const error=new Error(code==='PGRST205' ? 'El servicio todavía necesita activar sus tablas en Supabase.' : messages[reason] || (code==='40001' ? messages.revision_conflict : (response.status===401 || response.status===400 && /invalid.*(credentials|grant)|email.*confirm/i.test(reason)) ? 'Revisa tu correo, contraseña y confirmación de cuenta.' : response.status===403 ? 'Tu cuenta no tiene permiso para esta acción.' : 'No pudimos completar la solicitud. Intenta de nuevo.'));
      error.status=response.status; error.code=code; throw error;
    }
    return data;
  }
  saveSession(data) {
    if (!data?.access_token || !data?.refresh_token) return;
    this.session={access_token:data.access_token,refresh_token:data.refresh_token,expires_at:data.expires_at || Date.now()/1000+(data.expires_in || 3600)};
    try {sessionStorage.setItem(this.storageKey,JSON.stringify(this.session));} catch {}
  }
  clear() {this.session=null;this.user=null;this.role=null;try{sessionStorage.removeItem(this.storageKey);}catch{}}
  async refresh() {
    if (!this.refreshTask) this.refreshTask=(async()=>{try{const data=await this.request('/auth/v1/token?grant_type=refresh_token',{method:'POST',json:{refresh_token:this.session.refresh_token},authorized:false});this.saveSession(data);}catch(error){this.clear();throw error;}finally{this.refreshTask=null;}})();
    return this.refreshTask;
  }
  async verify() {
    this.role=null;
    if (!this.session) return;
    try {
      this.user=await this.request('/auth/v1/user');
      const roles=await this.request(`/rest/v1/cms_admins?user_id=eq.${encodeURIComponent(this.user.id)}&select=user_id,owner,chef`);
      this.role=roles?.find(row=>row.user_id===this.user.id) || null;
    } catch(error) {this.user=null;this.role=null;if(error.status===401)this.clear();throw error;}
  }
  async restore() {
    if (!this.configured) return;
    try {const value=JSON.parse(sessionStorage.getItem(this.storageKey)||'null');if(value?.access_token && value?.refresh_token)this.session=value;}catch{}
    const params=new URLSearchParams(location.hash.slice(1));
    if(params.has('access_token')) {
      this.saveSession({access_token:params.get('access_token'),refresh_token:params.get('refresh_token'),expires_in:Number(params.get('expires_in'))});
      history.replaceState(null,'',location.pathname+location.search+(params.get('type')==='recovery'?'#nueva-clave':'#cuenta'));
    }
    await this.verify();
  }
  async login(email,password) {
    this.clear();const data=await this.request('/auth/v1/token?grant_type=password',{method:'POST',json:{email,password},authorized:false});this.saveSession(data);await this.verify();
  }
  async register(name,email,password) {
    const data=await this.request(`/auth/v1/signup?redirect_to=${encodeURIComponent(location.origin+location.pathname+'#cuenta')}`,{method:'POST',json:{email,password,data:{full_name:name}},authorized:false});
    if(data?.access_token){this.saveSession(data);await this.verify();return true;}return false;
  }
  async logout() {try{if(this.session)await this.request('/auth/v1/logout',{method:'POST'});}finally{this.clear();}}
  async recover(email) {return this.request(`/auth/v1/recover?redirect_to=${encodeURIComponent(location.origin+location.pathname)}`,{method:'POST',json:{email},authorized:false});}
  async changePassword(password) {return this.request('/auth/v1/user',{method:'PUT',json:{password}});}
  async published() {const rows=await this.request('/rest/v1/cms_site?id=eq.1&select=document,revision,updated_at',{authorized:false});return rows?.[0] || {document:null,revision:0};}
  async publish(document,revision) {if(!this.isAdmin)throw new Error('Necesitas permisos de administrador.');return this.request('/rest/v1/rpc/publish_site',{method:'POST',json:{expected_revision:revision,new_document:document}});}
  async history() {if(!this.isAdmin)throw new Error('Necesitas permisos de administrador.');return this.request('/rest/v1/cms_revisions?select=revision,document,created_at&order=revision.desc&limit=20');}
  async admins() {return this.request('/rest/v1/rpc/list_site_admins',{method:'POST',json:{}});}
  async setAdmin(email,enabled) {if(!this.isOwner)throw new Error('Solo el propietario puede gestionar accesos.');return this.request('/rest/v1/rpc/set_site_admin',{method:'POST',json:{account_email:email,enabled}});}
  async setChef(email) {if(!this.isOwner)throw new Error('Solo el propietario puede asignar la cuenta del chef.');return this.request('/rest/v1/rpc/set_site_chef',{method:'POST',json:{account_email:email}});}
  async works(all=false) {if(!this.user)throw new Error('Inicia sesión para consultar propuestas.');if(all&&!this.isAdmin)throw new Error('Necesitas permisos de administrador.');return this.request(`/rest/v1/work_submissions?select=*&order=created_at.desc&limit=100${all?'':`&author_id=eq.${encodeURIComponent(this.user.id)}`}`);}
  async submitWork(values) {if(!this.user)throw new Error('Inicia sesión para enviar tu trabajo.');return this.request('/rest/v1/rpc/submit_work',{method:'POST',json:values});}
  async reviewWork(id,decision,message) {if(!this.isChef)throw new Error('Solo Checo puede seleccionar propuestas.');return this.request('/rest/v1/rpc/review_work',{method:'POST',json:{work_id:id,decision,message}});}
  async uploadWork(file) {
    if(!this.user)throw new Error('Inicia sesión para adjuntar archivos.');
    const extensions={'application/pdf':'pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document':'docx','image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
    if(!extensions[file.type]||file.size>10*1024*1024)throw new Error('Elige PDF, DOCX, JPG, PNG o WebP de hasta 10 MB.');
    const path=`${this.user.id}/${crypto.randomUUID()}.${extensions[file.type]}`;
    await this.request(`/storage/v1/object/work-files/${path}`,{method:'POST',body:file,headers:{'Content-Type':file.type,'x-upsert':'false'}});return path;
  }
  async workFile(path) {
    if(!this.user||!/^[-a-z0-9]+\/[-a-z0-9]+\.(pdf|docx|jpg|png|webp)$/.test(path))throw new Error('Archivo no disponible.');
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
