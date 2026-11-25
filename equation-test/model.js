(function(root){
 'use strict';
 const CAPS={1:20,2:20,3:20,4:20,5:10,6:10};
 const fresh=()=>({scores:{1:0,2:0,3:0,4:0,5:0,6:0},active:{},completed:0,errors:0,finishedAt:null});
 const total=s=>Object.values(s.scores).reduce((a,b)=>a+b,0);
 const reward=errors=>Math.max(1,10-3*errors);
 function apply(s,e,core){
  const level=Number(e.level);if(!CAPS[level]||!e.questionId||e.questionId.length>100)throw Error('題目資料無效');
  let q=s.active[level];
  if(e.kind==='start'){
   if(q?.id===e.questionId)return {duplicate:true};
   if(q&&!q.done)throw Error('此級仍有未完成題目，請重新同步');
   if(s.scores[level]>=CAPS[level])throw Error('此級已滿分，請選擇其他級別');
   core.equationInfo(e.formula,e.variable);
   s.active[level]={id:e.questionId,formula:e.formula,variable:e.variable,previous:e.formula,errors:0,seq:0,history:[],done:false,cooldownUntil:0};
   return {started:true};
  }
  if(e.kind!=='answer'||!q||q.id!==e.questionId)throw Error('題目已更新，請重新同步');
  if(e.seq<=q.seq)return {duplicate:true};
  if(q.done||e.seq!==q.seq+1)throw Error('作答次序不符，請重新同步');
  if(!Number.isFinite(Date.parse(e.timestamp)))throw Error('作答時間無效');
  const at=Date.parse(e.timestamp);if(at<q.cooldownUntil)throw Error('請等候冷卻結束');
  if(typeof e.answer!=='string'||!e.answer.trim()||e.answer.length>220)throw Error('請輸入完整方程');
  const result=core.checkFlexibleAdvance(e.answer,q.previous,q.variable,q.formula);
  q.seq=e.seq;q.lastAnswer=e.answer;q.lastOk=result.ok;
  let gain=0;
  if(result.ok){q.previous=e.answer;q.history.push(e.answer);q.history=q.history.slice(-80);
   if(result.solved){gain=Math.min(CAPS[level]-s.scores[level],reward(q.errors));s.scores[level]+=gain;s.completed++;q.done=true;q.gain=gain;if(total(s)===100&&!s.finishedAt)s.finishedAt=e.timestamp;}
  }else{q.errors++;s.errors++;q.cooldownUntil=at+5000;}
  return {...result,gain,errors:q.errors,levelFull:s.scores[level]===CAPS[level],allFull:total(s)===100};
 }
 root.EquationExamModel={CAPS,fresh,total,reward,apply};
})(typeof window!=='undefined'?window:globalThis);
