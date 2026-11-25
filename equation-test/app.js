'use strict';
const API='https://script.google.com/macros/s/AKfycbxSTZ1HgFexPUhqhPJxwvVynAHVTgkenz99--21PEi2GKPs6beia2TMgAY3KirvSlQgnA/exec';
const M=EquationExamModel,C=EquationGameCore,$=id=>document.getElementById(id),clone=x=>JSON.parse(JSON.stringify(x));
let player=null,state=M.fresh(),epoch=null,selected=0,outbox=[],batch=null,busy=false,timer=null,ready=false,congratulated=false;
const key=()=>`equation-test-v1:${player.className}:${player.id}`;
const uid=()=>crypto.randomUUID();
function status(text){$('sync-status').textContent=text;}
function persist(){if(!player)return;try{localStorage.setItem(key(),JSON.stringify({state,epoch,selected,outbox,batch,congratulated}));}catch{status('本機儲存失敗，請保持頁面開啟並確認雲端同步');}}
async function request(action,data){
 const ctrl=new AbortController(),timeout=setTimeout(()=>ctrl.abort(),25000);
 try{const url=data?API:API+'?'+new URLSearchParams({action,className:player.className,id:player.id,t:Date.now()});
  const r=await fetch(url,{signal:ctrl.signal,cache:'no-store',...(data?{method:'POST',body:new URLSearchParams({action,data:JSON.stringify(data)})}:{})});
  if(!r.ok)throw Error('HTTP '+r.status);const result=await r.json();if(!result.ok&&!result.resetRequired)throw Error(result.error||'連線失敗');return result;
 }finally{clearTimeout(timeout);}
}
function replay(base,events){const s=clone(base);for(const e of events)M.apply(s,e,C);return s;}
function schedule(delay=200){clearTimeout(timer);timer=setTimeout(sync,delay);}
async function sync(){
 if(!ready||busy||!player||epoch===null)return;
 if(!batch&&!outbox.length)return;
 busy=true;let failed=false;
 if(!batch){batch={...player,epoch,batchId:uid(),events:outbox.splice(0,12)};persist();}
 status('正在同步測驗成績…');
 try{
  const result=await request('eqtSave',batch);
  if(result.resetRequired){epoch=result.epoch;outbox=[];batch=null;state=M.fresh();selected=0;congratulated=false;status('老師已開始新一輪測驗');persist();render();return;}
  if(result.batchId!==batch.batchId)throw Error('未收到同步確認');
  state=replay(result.state,outbox);batch=null;persist();render();status(outbox.length?'正在補傳作答…':'測驗成績已同步');
 }catch(e){failed=true;status('作答已保存在本機，等待重新同步');}
 finally{busy=false;if(batch||outbox.length)schedule(failed?8000:150);}
}
function queue(e){const result=M.apply(state,e,C);outbox.push(e);persist();schedule();return result;}
function populate(){const ids=$('id-select');ids.replaceChildren();for(const id of Object.keys(examRoster[$('class-select').value]))ids.add(new Option(id+' 號',id));showName();}
function showName(){$('student-name').textContent=examRoster[$('class-select').value][$('id-select').value];}
$('class-select').onchange=populate;$('id-select').onchange=showName;populate();
$('login-form').onsubmit=async e=>{
 e.preventDefault();if(busy)return;
 player={className:$('class-select').value,id:Number($('id-select').value),name:$('student-name').textContent};
 let cached=null;try{cached=JSON.parse(localStorage.getItem(key()));}catch{}
 if(cached){state=cached.state;epoch=cached.epoch;selected=cached.selected||0;outbox=cached.outbox||[];batch=cached.batch||null;congratulated=Boolean(cached.congratulated);}
 busy=true;$('login-button').disabled=true;$('login-status').textContent='正在連接獨立測驗成績表…';
 try{
  const r=await request('eqtLoad');
  if(epoch!==null&&epoch!==r.epoch){state=M.fresh();outbox=[];batch=null;selected=0;congratulated=false;}
  epoch=r.epoch;
  if(batch&&r.receipts?.includes(batch.batchId))batch=null;
  // Reapply unacknowledged events; per-question sequence numbers make replay safe.
  state=replay(r.state||M.fresh(),[...(batch?.events||[]),...outbox]);
  if(!r.state&&!batch&&!outbox.length)batch={...player,epoch,batchId:uid(),events:[]};
  status('已連接獨立測驗資料');
 }catch(err){
  if(epoch===null){$('login-status').textContent='首次登入需要連線。請檢查網絡後重試。';busy=false;$('login-button').disabled=false;return;}
  status('暫用本機測驗進度，連線後自動補傳');
 }finally{busy=false;$('login-button').disabled=false;}
 ready=true;$('identity').textContent=`${player.className} ${player.id} 號　${player.name}`;$('login').hidden=true;$('exam').hidden=false;persist();render();schedule();
};
function selectLevel(l,newQuestion=false){
 if(!ready)return;selected=l;
 if(state.scores[l]>=M.CAPS[l]){render();$('feedback').className='good';$('feedback').textContent=`L${l} 已滿分，請選擇其他級別。`;return;}
 const q=state.active[l];
 if(!q||(newQuestion&&q.done)){
  const generated=C.generateQuestion(l,Math.random,q?[`${l}|${q.formula}`]:[]);
  queue({kind:'start',questionId:uid(),level:l,formula:generated.formula,variable:generated.variable,timestamp:new Date().toISOString()});
 }
 $('answer').value='';$('preview').replaceChildren();$('feedback').textContent='';persist();render();$('answer').focus();
}
function math(node,text){NthTermMathRenderer.render(node,String(text).replaceAll('*','×'));}
function render(){
 $('total').textContent=M.total(state);$('levels').replaceChildren();
 for(let l=1;l<=6;l++){
  const full=state.scores[l]===M.CAPS[l],b=document.createElement('button');b.type='button';b.className='level'+(selected===l?' selected':'')+(full?' full':'');b.setAttribute('aria-pressed',String(selected===l));
  const title=document.createElement('strong');title.textContent='L'+l;const points=document.createElement('span');points.className='points';points.textContent=`${state.scores[l]} / ${M.CAPS[l]} 分`;const note=document.createElement('small');note.textContent=full?'已滿分':C.LEVELS[l].title;b.append(title,points,note);b.onclick=()=>selectLevel(l);$('levels').append(b);
 }
 if(M.total(state)===100&&!congratulated){congratulated=true;persist();$('congratulations').showModal();}
 $('welcome').hidden=Boolean(selected);$('question-area').hidden=!selected;if(!selected)return;
 $('hero').src=`../equation-ii-assets/hero-lv${Math.min(selected,5)}.webp`;
 $('level-label').textContent=`L${selected} · ${C.LEVELS[selected].title}`;
 const q=state.active[selected],full=state.scores[selected]>=M.CAPS[selected];
 $('answer-form').hidden=!q||q.done||full;$('next-question').hidden=!q||!q.done||full;
 $('potential').textContent=full?'本級已滿分':q?`本題最多可得 ${Math.min(M.reward(q.errors),M.CAPS[selected]-state.scores[selected])} 分`:'';
 if(!q){$('question').textContent='本級已滿分';$('history').replaceChildren();return;}
 math($('question'),q.formula);$('history').replaceChildren();for(const line of q.history){const li=document.createElement('li');math(li,line);$('history').append(li);}
 $('keypad').querySelector('[data-key="x"]').textContent=q.variable;$('keypad').querySelector('[data-key="x"]').dataset.variable=q.variable;
 if(q.done){$('feedback').className='good';$('feedback').textContent=`答對！本題 +${q.gain} 分。`+(full?'本級已滿分，請選擇其他級別。':'按「下一題」繼續，或選擇其他級別。');}
 updateCooldown();
}
function updateCooldown(){const q=state.active[selected],remaining=q?Math.max(0,q.cooldownUntil-Date.now()):0;$('submit-answer').disabled=!q||q.done||remaining>0;$('submit-answer').textContent=remaining?`請稍候 ${Math.ceil(remaining/1000)} 秒`:'檢查這一步';}
setInterval(updateCooldown,250);
$('answer-form').onsubmit=e=>{
 e.preventDefault();const q=state.active[selected],answer=$('answer').value.trim();if(!q||q.done||Date.now()<q.cooldownUntil||!answer)return;
 try{const result=queue({kind:'answer',questionId:q.id,level:selected,seq:q.seq+1,answer,timestamp:new Date().toISOString()});render();
  if(!result.ok){$('feedback').className='bad';$('feedback').textContent=`${result.message} 本題已錯 ${q.errors} 次，答對可得 ${Math.min(M.reward(q.errors),M.CAPS[selected]-state.scores[selected])} 分。`;}
  else if(!result.solved){$('feedback').className='good';$('feedback').textContent='這一步正確，請繼續。最後須字母在左，分數約至最簡。';$('answer').value='';$('preview').replaceChildren();$('answer').focus();}
 }catch(err){$('feedback').textContent=err.message;}
};
$('answer').oninput=()=>math($('preview'),$('answer').value);
$('next-question').onclick=()=>selectLevel(selected,true);
function insert(text){const input=$('answer'),at=input.selectionStart??input.value.length;input.setRangeText(text,at,input.selectionEnd??at,'end');input.focus();input.dispatchEvent(new Event('input'));}
$('keypad').onclick=e=>{const b=e.target.closest('[data-key]');if(b)insert(b.dataset.variable||b.dataset.key);};
$('fraction-button').onclick=()=>{$('numerator').value='';$('denominator').value='';$('fraction-dialog').showModal();$('numerator').focus();};
$('cancel-fraction').onclick=()=>$('fraction-dialog').close();
$('insert-fraction').onclick=()=>{if(!$('numerator').value.trim()||!$('denominator').value.trim())return;insert(`(${$('numerator').value})/(${$('denominator').value})`);$('fraction-dialog').close();};
$('close-congratulations').onclick=()=>$('congratulations').close();
window.addEventListener('online',()=>schedule());
window.addEventListener('beforeunload',persist);
