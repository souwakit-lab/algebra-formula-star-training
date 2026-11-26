(function(root){
 const accuracy=p=>p.analytics?.attempts?(p.analytics.attempts-p.analytics.errors)/p.analytics.attempts:null;
 const rank=(a,b)=>b.total-a.total||String(a.finishedAt||'9999').localeCompare(String(b.finishedAt||'9999'))||a.className.localeCompare(b.className)||a.id-b.id;
 function summarize(players){
  let completed=0,attempts=0,errors=0,total=0;const skills={};
  for(const p of players){completed+=p.completed;total+=p.total;attempts+=p.analytics?.attempts||0;errors+=p.analytics?.errors||0;
   for(const [name,s] of Object.entries(p.analytics?.skills||{})){skills[name]||={attempts:0,errors:0};skills[name].attempts+=s.attempts;skills[name].errors+=s.errors;}
  }
  const levels=[1,2,3,4,5,6].map(level=>{const cap=level<5?20:10;let started=0,full=0,completed=0,attempts=0,errors=0,points=0;
   for(const p of players){const a=p.analytics?.levels?.[level];if(p.startedLevels?.includes(level)||p.scores[level]>0||a?.attempts)started++;if(p.scores[level]>=cap)full++;points+=p.scores[level]||0;completed+=a?.completed||0;attempts+=a?.attempts||0;errors+=a?.errors||0;}
   return {level,cap,started,full,completed,attempts,errors,average:started?points/started:null};
  });
  return {count:players.length,full:players.filter(p=>p.total===100).length,completed,attempts,errors,average:players.length?total/players.length:null,accuracy:attempts?(attempts-errors)/attempts:null,levels,skills};
 }
 root.ExamDashboardStats={accuracy,rank,summarize};
})(typeof window!=='undefined'?window:globalThis);
