import {KEYS,sanitizeDoc,recordCount} from './model.mjs?v=f8867c6e6cd5';
import {CloudSync,Vault,SESSION,OWNER} from './engine.mjs?v=c49ea346b1f0';
const config=window.UNFINISHED_ACCOUNT_CONFIG||{},host=document.querySelector('[data-account]');
const EN=(document.documentElement.lang||'').startsWith('en');
const text=(zh,en)=>EN?en:zh;
const messages={
 syncing:text('正在同步…','Syncing…'),synced:text('已同步到云端','Synced to the cloud'),offline:text('暂时无法连接，记录仍保存在本机。联网后会重试。','Cannot connect. Your work stays on this device; syncing will retry online.'),
 unsaved_local:text('本机还有未保存的作答，请先重新保存，再同步。','Save your pending answers on this device before syncing.'),
 session_expired:text('登录已过期，请重新登录同一账户，或先退出再换账户。','Your session expired. Sign in to the same account, or sign out before switching accounts.'),
 credentials_invalid:text('邮箱或密码不正确。','Email or password is incorrect.'),password_length:text('密码请使用 12–128 个字符。','Use a password of 12–128 characters.'),email_invalid:text('请输入有效的邮箱地址。','Enter a valid email address.'),
 recovery_invalid:text('邮箱或恢复码不正确，或该恢复码已失效。','Email or recovery code is incorrect, or the code is no longer valid.'),
 rate_limited:text('尝试过于频繁，请稍后再试。','Too many attempts. Try again later.'),signup_unavailable:text('暂时无法注册该邮箱，可以尝试登录。','This email cannot be registered. Try signing in.'),
 local_cache_unavailable:text('浏览器无法保存同步缓存，请允许本站存储后重试。学习记录仍留在当前设备。','The browser cannot save sync data. Allow site storage and try again. Your work stays on this device.'),
 record_too_large:text('学习记录超过单次同步容量，请先导出备份，再清理不需要的历史记录。','This record is too large to sync. Export a backup before clearing unneeded history.'),
 sync_busy:text('正在处理其他同步，请稍后再试。','Another sync is running. Try again shortly.'),account_switch_required:text('这台浏览器仍保留另一账户的记录，请先退出再换账户。','This browser still holds another account’s record. Sign out before switching accounts.'),
 account_switched:text('另一标签页切换了账户，请刷新本页。','The account changed in another tab. Reload this page.'),
 recovery_pending:text('密码恢复尚未完成，请用相同信息重试；不要反复更换新密码。','Recovery is not complete. Retry the same request and password.'),account_unavailable:text('账户正在恢复中，请稍后重试。','Account recovery is in progress. Try again shortly.')
};
function element(tag,attrs={},children=[]){const el=document.createElement(tag);for(const[k,v]of Object.entries(attrs)){if(k==='text')el.textContent=v;else el.setAttribute(k,v);}for(const c of children)el.append(c);return el;}
const status=element('p',{class:'account-status',role:'status','aria-live':'polite'});let pendingCode='',lastSync='',health=false,busy=false;
function setStatus(code){if(code==='synced')lastSync=new Date().toLocaleTimeString(EN?'en':'zh-CN');status.textContent=(messages[code]||messages.offline)+(code==='synced'?' · '+lastSync:'');}
async function api(action,data={},session){
 const response=await fetch(config.endpoint,{method:'POST',headers:{'Content-Type':'application/json',...(session?.token?{Authorization:'Bearer '+session.token}:{})},body:JSON.stringify({action,...data}),signal:AbortSignal.timeout(25000)});
 let out;try{out=await response.json();}catch{throw Error('offline');}if(!response.ok)throw Error(out.error||'offline');return out;
}
const guarded=fn=>window.UnfinishedAccountGuard?window.UnfinishedAccountGuard.run(fn):fn();
function apply(document,{switching=false}={}){
 if(!switching&&window.LearningStore&&!LearningStore.saved())throw Error('unsaved_local');
 const before={};for(const name of Object.values(KEYS))before[name]=localStorage.getItem(name);
 guarded(()=>{try{
  const local=JSON.parse(localStorage.getItem(KEYS.learning)||'{}');
  const learning={...document.learning,...(!switching&&local.finishPending?{finishPending:local.finishPending}:{})};
  // Suppress route celebrations for progress arriving from another device.
  window.dispatchEvent(new CustomEvent('unfinished:cloud-applying',{detail:{learning,checks:document.checks}}));
  for(const[k,name]of Object.entries(KEYS)){const value=k==='learning'?learning:document[k];value===null?localStorage.removeItem(name):localStorage.setItem(name,JSON.stringify(value));}
 }catch(e){for(const[name,value]of Object.entries(before))try{value===null?localStorage.removeItem(name):localStorage.setItem(name,value);}catch{}window.dispatchEvent(new CustomEvent('unfinished:cloud-applying',{detail:{learning:JSON.parse(before[KEYS.learning]||'{"courses":{}}')}}));throw Error('local_cache_unavailable');}});
 window.LearningStore?.adoptStored();window.dispatchEvent(new Event('unfinished:cloud-applied'));window.dispatchEvent(new Event('learning-change'));
}
let cloud;
try{cloud=new CloudSync({storage:localStorage,vault:new Vault(indexedDB),api,learning:window.LearningStore,apply,onStatus:setStatus,withWrites:guarded});}catch{if(host)host.append(element('p',{text:messages.local_cache_unavailable}));}
async function synchronize(){if(!cloud?.session||!config.enabled)return;try{
 const run=()=>cloud.sync();if(navigator.locks)await navigator.locks.request('unfinished-cloud-sync',{ifAvailable:true},lock=>lock?run():undefined);else await cloud.vault.withLock('sync',run);
}catch(e){setStatus(e.message);}}
async function switchLocked(fn){return navigator.locks?navigator.locks.request('unfinished-cloud-sync',fn):cloud.vault.withLock('sync',fn);}
function input(label,type,name,autocomplete){const field=element('label',{class:'account-field'},[element('span',{text:label})]);const el=element('input',{type,name,required:'',autocomplete});if(type==='password'){el.minLength=12;el.maxLength=128;}field.append(el);return {field,input:el};}
function button(label,fn,kind='button'){const b=element('button',{type:kind,class:'account-button',text:label});if(fn)b.addEventListener('click',fn);return b;}
async function operation(fn){if(busy)return;busy=true;const controls=host?[...host.querySelectorAll('button')].map(b=>[b,b.disabled]):[];controls.forEach(([b])=>b.disabled=true);try{await fn();}catch(e){status.textContent=messages[e.message]||messages.offline;}finally{busy=false;controls.filter(([b])=>b.isConnected).forEach(([b,disabled])=>b.disabled=disabled);}}
function shell(){const notice=document.getElementById('storage-notice');if(notice)notice.textContent=cloud?.session?text('当前账户可同步学习记录，状态见下方。标记已学表示读过，不代表掌握。','This account can sync learning records; see its status below. Marking a lesson as read does not prove mastery.'):text('游客记录保存在当前浏览器。登录并开启同步后，可在其他设备继续学习。','Guest work stays in this browser. Sign in and enable sync to continue on other devices.');host.replaceChildren(element('h2',{id:'account-title',text:text('账户与云同步','Account & cloud sync')}));host.append(status);}
function showRecovery(code,continueAction){
 pendingCode=code;shell();host.append(element('p',{text:text('请保存这份恢复码','Save your recovery code')}),element('p',{text:text('忘记密码时，可用邮箱和恢复码找回账户。不发送验证邮件；两者都丢失且没有其他验证方式时，无法可靠找回。','Use your email and this code if you forget your password. No verification email is sent. Without your password or recovery code, recovery may be impossible.')}));
 const display=element('code',{class:'account-recovery',text:code});host.append(display);
 const actions=element('div',{class:'account-actions'});
 actions.append(button(text('复制恢复码','Copy recovery code'),()=>operation(async()=>{await navigator.clipboard.writeText(pendingCode);status.textContent=text('已复制，请保存在密码管理器等安全位置。','Copied. Keep it somewhere safe, such as a password manager.');})),button(text('下载保存','Download'),()=>{const blob=new Blob([text('未尽账户恢复码\n','UNFINISHED account recovery code\n')+pendingCode+'\n'],{type:'text/plain'});const url=URL.createObjectURL(blob),a=element('a',{href:url,download:'unfinished-recovery-code.txt'});a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}));host.append(actions);
 const ack=element('input',{type:'checkbox'}),next=button(text('已保存，继续','Saved — continue'),()=>{pendingCode='';continueAction();});next.disabled=true;
 ack.addEventListener('change',()=>next.disabled=!ack.checked);host.append(element('label',{class:'account-check'},[ack,document.createTextNode(text('我已保存恢复码，知道网站无法替我查看原码。','I saved this code and understand the website cannot display the original again.'))]),next);
}
async function preview(session){
 const remote=await api('pull',{},session);shell();
 host.append(element('p',{text:text('准备同步：','Ready to sync: ')+session.user.email}),element('p',{text:text('云端已有记录：','Cloud record items: ')+recordCount(sanitizeDoc(remote.document||{}))}));
 const owns=(localStorage.getItem(OWNER)||'')===session.user.id;
 if(owns){await switchLocked(()=>cloud.activate(session,remote,false));window.UnfinishedAccountGuard?.adopt();await synchronize();location.reload();return;}
 const merge=element('input',{type:'checkbox'});host.append(element('label',{class:'account-check'},[merge,document.createTextNode(text('将当前游客学习记录合并到此账户','Merge this browser’s guest learning record into this account'))]),element('p',{class:'account-note',text:text('不勾选会使用云端记录；当前游客记录会在本机单独保留，退出账户后恢复。合并会补入本机错题，可能包括已在其他设备复习过的旧题。','Leave unchecked to use the cloud record. Guest work is kept separately on this device and restored after sign-out. Merging may add old mistakes you already reviewed elsewhere.')}));
 host.append(button(text('确认并开启同步','Confirm & enable sync'),()=>operation(async()=>{await switchLocked(()=>cloud.activate(session,remote,merge.checked));window.UnfinishedAccountGuard?.adopt();await synchronize();location.reload();})),button(text('取消登录','Cancel sign-in'),()=>operation(async()=>{await api('logout',{},session).catch(()=>{});render();})));
}
function form(mode){
 shell();const labels={login:text('登录','Sign in'),signup:text('注册账户','Create account'),recover:text('用恢复码找回','Recover with a code')};
 host.append(element('h3',{text:labels[mode]}));const f=element('form',{class:'account-form'}),email=input(text('邮箱','Email'),'email','email','username'),password=input(mode==='recover'?text('新密码','New password'):text('密码（12–128 个字符）','Password (12–128 characters)'),'password','password',mode==='login'?'current-password':'new-password');
 email.input.maxLength=254;if(cloud.session)email.input.value=cloud.session.user.email;
 f.append(email.field);let code;
 if(mode==='recover'){code=input(text('恢复码','Recovery code'),'text','recovery','off');code.input.maxLength=80;code.input.spellcheck=false;f.append(code.field);}
 f.append(password.field);let confirm;
 if(mode!=='login'){confirm=input(text('再次输入密码','Repeat password'),'password','confirm','new-password');f.append(confirm.field);}
 f.append(button(labels[mode],null,'submit'));
 f.addEventListener('submit',event=>{event.preventDefault();operation(async()=>{
  if(confirm&&confirm.input.value!==password.input.value){confirm.input.setCustomValidity(text('两次密码不一致','Passwords do not match'));confirm.input.reportValidity();confirm.input.setCustomValidity('');return;}
  const data={email:email.input.value.trim(),password:password.input.value};
  if(mode==='recover'){
   let requestId=sessionStorage.getItem('unfinished.account.recovery-request');if(!requestId){requestId=crypto.randomUUID();sessionStorage.setItem('unfinished.account.recovery-request',requestId);}
   const result=await api(mode,{...data,code:code.input.value,requestId});password.input.value='';code.input.value='';confirm.input.value='';
   showRecovery(result.recoveryCode,()=>{sessionStorage.removeItem('unfinished.account.recovery-request');form('login');status.textContent=text('密码已重置，请使用新密码登录。旧会话与旧恢复码均已失效。','Password reset. Sign in with the new password. Old sessions and the old recovery code are no longer valid.');});return;
  }
  const result=await api(mode,data);password.input.value='';if(confirm)confirm.input.value='';
  const session={token:result.token,user:result.user};
  if(result.recoveryCode)showRecovery(result.recoveryCode,()=>operation(()=>preview(session)));else await preview(session);
 });});host.append(f,button(text('返回','Back'),render));
 host.append(element('p',{class:'account-note',text:text('邮箱不会经过邮件验证，请核对拼写。不要把此账户当作已验证的邮箱身份。','No email verification is sent. Check the address carefully; this account does not verify ownership of the email.')}));
}
function render(){
 if(!host||!cloud)return;shell();
 if((!config.enabled||!health)&&!cloud.session){host.append(element('p',{text:text('云同步尚未开放；你仍可直接学习，并使用下方备份功能保存记录。','Cloud sync is not available yet. Keep studying locally and use the backup controls below.')}));if(config.enabled)host.append(button(text('重试连接','Retry connection'),()=>operation(async()=>{health=(await api('health')).ready===true;render();})));return;}
 if(!cloud.session){host.append(element('p',{text:text('游客也能学习。注册后可在手机和电脑间接着学；邮箱与密码登录，不发送验证码。','Study as a guest, or create an account to continue across devices. Sign in with email and password; no verification code is sent.')}));const actions=element('div',{class:'account-actions'});for(const mode of ['login','signup','recover'])actions.append(button({login:text('登录同步','Sign in to sync'),signup:text('注册账户','Create account'),recover:text('忘记密码','Forgot password')}[mode],()=>form(mode)));host.append(actions);return;}
 host.append(element('p',{class:'account-email',text:cloud.session.user.email}));
 const actions=element('div',{class:'account-actions'});actions.append(button(text('立即同步','Sync now'),()=>operation(synchronize)),button(text('重新登录','Sign in again'),()=>form('login')),button(text('退出账户','Sign out'),()=>operation(async()=>{await switchLocked(()=>cloud.logout());window.UnfinishedAccountGuard?.adopt();location.reload();})),button(text('更换恢复码','Replace recovery code'),()=>manage('rotate')),button(text('删除账户','Delete account'),()=>manage('delete')));host.append(actions,element('p',{class:'account-note',text:text('只同步学习记录；AI 密钥、未交卷测验和本页未保存的作答不会上传。离线改动会在联网后补存。','Only learning records are synced. AI keys, unfinished tests and answers not yet saved on this page are excluded. Offline work syncs when connected.')}));
}
function manage(mode){shell();const deleting=mode==='delete';host.append(element('h3',{text:deleting?text('删除账户与云端记录','Delete account and cloud record'):text('更换恢复码','Replace recovery code')}));
 host.append(element('p',{text:deleting?text('此操作会永久删除该账户和云端学习记录。请先导出备份；本机游客记录不受影响。','This permanently deletes the account and cloud learning record. Export a backup first. Guest work on this device is kept.'):text('请输入当前密码。生成新恢复码后，旧码立即失效。','Enter your current password. The old code stops working when a new one is generated.')}));
 const f=element('form',{class:'account-form'}),password=input(text('当前密码','Current password'),'password','password','current-password');f.append(password.field);let confirmation;
 if(deleting){confirmation=input(text('再次输入账户邮箱确认删除','Retype account email to confirm deletion'),'email','confirm','off');f.append(confirmation.field);}
 f.append(button(deleting?text('永久删除','Permanently delete'):text('生成新恢复码','Generate new code'),null,'submit'));
 f.addEventListener('submit',e=>{e.preventDefault();operation(async()=>{if(deleting&&confirmation.input.value.trim().toLowerCase()!==cloud.session.user.email.toLowerCase())throw Error('email_invalid');
  if(deleting)await synchronize();const result=await api(mode,{password:password.input.value},cloud.session);password.input.value='';
  if(deleting){await switchLocked(()=>cloud.logout({deleted:true}));window.UnfinishedAccountGuard?.adopt();location.reload();}else showRecovery(result.recoveryCode,render);
 });});host.append(f,button(text('返回','Back'),render));
}
let timer;function schedule(){if(config.enabled&&cloud?.session){clearTimeout(timer);timer=setTimeout(synchronize,5000);}}
if(cloud){
 await cloud.resumeTransition().catch(e=>setStatus(e.message));window.UnfinishedAccountGuard?.adopt();
 if(config.enabled&&(host||cloud.session)){try{health=(await api('health')).ready===true;}catch{health=false;}render();if(cloud.session&&health){try{await api('me',{},cloud.session);await synchronize();}catch(e){setStatus(e.message);}}}
 else render();
 window.addEventListener('learning-change',schedule);window.addEventListener('online',schedule);window.addEventListener('focus',schedule);
 setInterval(()=>{if(document.visibilityState==='visible')synchronize();},30000);
}
