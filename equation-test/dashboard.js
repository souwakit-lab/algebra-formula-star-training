'use strict';
const API='https://script.google.com/macros/s/AKfycbxSTZ1HgFexPUhqhPJxwvVynAHVTgkenz99--21PEi2GKPs6beia2TMgAY3KirvSlQgnA/exec';
const $=id=>document.getElementById(id),M=EquationExamModel;let players=[],busy=false,timer;
async function refresh(){if(busy)return;busy=true;clearTimeout(timer);const scope=$('scope').value;try{
 const r=await fetch(API+'?'+new URLSearchParams({action:'eqtDashboard',className:scope,t:Date.now()}),{cache:'no-store',signal:AbortSignal.timeout(25000)});const data=await r.json();if(!data.ok)throw Error(data.error||'讀取失敗');
 if(scope!==$('scope').value)return;
 players=data.players.sort((a,b)=>b.total-a.total||String(a.finishedAt||'9999').localeCompare(String(b.finishedAt||'9999'))||a.className.localeCompare(b.className)||a.id-b.id);
 $('rows').replaceChildren();for(const p of players){const tr=document.createElement('tr');for(const value of [p.className,p.id,p.name,...[1,2,3,4,5,6].map(l=>p.scores[l]),p.total,p.completed]){const td=document.createElement('td');td.textContent=value;tr.append(td);}if(p.total===100)tr.className='score-full';$('rows').append(tr);}
 $('summary').textContent=`${players.length} 人參加 · ${players.filter(p=>p.total===100).length} 人滿分`;$('empty').hidden=Boolean(players.length);$('status').textContent='已更新 '+new Date().toLocaleTimeString('zh-Hant');
 }catch(e){$('status').textContent='連線失敗，保留上次成績，稍後重試';}finally{busy=false;timer=setTimeout(refresh,document.hidden?15000:3000);}}
$('scope').onchange=refresh;$('refresh').onclick=refresh;
$('export').onclick=()=>{const esc=v=>'"'+String(v??'').replace(/^[=+\-@]/,"'").replaceAll('"','""')+'"';const rows=[['班別','學號','姓名','L1','L2','L3','L4','L5','L6','總分','完成題數'],...players.map(p=>[p.className,p.id,p.name,...[1,2,3,4,5,6].map(l=>p.scores[l]),p.total,p.completed])];const url=URL.createObjectURL(new Blob(['\ufeff'+rows.map(r=>r.map(esc).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='一元一次方程_測驗成績.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('reset').onclick=async()=>{const cls=$('scope').value;if(!confirm(`為${cls||'全部班別'}開始新一輪測驗？本輪成績會封存，不影響原練習版。`))return;const adminPin=prompt('請輸入原教師大屏的重置密碼');if(!adminPin)return;$('reset').disabled=true;try{const r=await fetch(API,{method:'POST',body:new URLSearchParams({action:'eqtReset',data:JSON.stringify({className:cls,adminPin})}),signal:AbortSignal.timeout(25000)});const result=await r.json();if(!result.ok)throw Error(result.error);await refresh();}catch(e){alert(e.message);}finally{$('reset').disabled=false;}};
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});refresh();
