// Stop stale tabs from writing one account's work into another account's local record.
(()=>{const owner='unfinished.account.owner.v1',transition='unfinished.account.transition.v1';let boot;try{boot=localStorage.getItem(owner)||'';}catch{return;}
const keys=new Set(['market-learning-v1','unfinished.study.v1','unfinished.companion.progress.v1','market-last-assessment','unfinished.assessment.draft.v1','unfinished.assessment.done.v1']);let privileged=false;
for(const name of ['setItem','removeItem']){const original=Storage.prototype[name];Storage.prototype[name]=function(k,...args){if(this===localStorage&&keys.has(k)&&!privileged&&(localStorage.getItem(transition)||(localStorage.getItem(owner)||'')!==boot))throw new DOMException('The active learning account changed. Reload this page.','InvalidStateError');return original.call(this,k,...args);};}
window.UnfinishedAccountGuard={run(fn){privileged=true;try{return fn();}finally{privileged=false;}},adopt(){boot=localStorage.getItem(owner)||'';}};
window.addEventListener('storage',e=>{if(e.key===owner&&(e.newValue||'')!==boot)location.reload();});})();
