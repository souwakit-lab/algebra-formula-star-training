const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
class Sheet{
 constructor(){this.rows=[];}appendRow(row){this.rows.push(row);return this;}setFrozenRows(){}getLastRow(){return this.rows.length;}
 getRange(row,col,height,width){return {setValues:values=>values.forEach((v,i)=>{this.rows[row+i-1] ||= [];v.forEach((x,j)=>this.rows[row+i-1][col+j-1]=x);})};}
}
const sheets={},properties={},cache={};const spreadsheet={getSheetByName:n=>sheets[n],insertSheet:n=>sheets[n]=new Sheet()};
const ctx=vm.createContext({Date,JSON,Number,String,Array,Object,Math,RATIONAL_CLASSES:['SG1A','SG1B'],DASHBOARD_CACHE_SECONDS:5,
 spreadsheet_:()=>spreadsheet,dataRows_:s=>s.rows.slice(1),safeText_:x=>String(x),clamp_:(x,l,h)=>Math.min(h,Math.max(l,x)),validateRationalPayload_:p=>{assert.equal(p.className,'SG1A');assert.equal(p.id,1);},
 rationalPlayerFromRow_:r=>({className:r[0],id:r[1],name:r[2],level:r[3],xp:r[4],total:r[5],correct:r[6],streak:r[7],mistakes:r[8]}),
 SpreadsheetApp:{flush(){}},PropertiesService:{getScriptProperties:()=>({getProperty:k=>properties[k]||null,setProperty:(k,v)=>properties[k]=v,getProperties:()=>({...properties}),deleteProperty:k=>delete properties[k]})},
 CacheService:{getScriptCache:()=>({get:k=>cache[k],put:(k,v)=>cache[k]=v,removeAll:ks=>ks.forEach(k=>delete cache[k])})}});
vm.runInContext(fs.readFileSync('equation-backend.gs','utf8'),ctx);
assert.equal(ctx.routeEquationGet_({parameter:{action:'unrelated'}}),null);
assert.equal(ctx.routeEquationGet_({parameter:{action:'getEquationDashboardData'}}).players.length,0);
const payload={className:'SG1A',id:1,name:'TEST',level:4,xp:120,total:1,correct:1,streak:1,mistakes:0,batchId:'test-batch',answers:[{level:4,question:'x+2=5',studentAnswer:'x=3',correctAnswer:'x=3',isCorrect:true}]};
assert.equal(ctx.routeEquationPost_({parameter:{action:'saveEquation'}},payload).ok,true);
assert.equal(ctx.routeEquationPost_({parameter:{action:'saveEquation'}},payload).duplicate,true);
const data=ctx.routeEquationGet_({parameter:{action:'getEquationDashboardData',className:'SG1A'}});
assert.equal(data.players.length,1);assert.equal(data.players[0].xp,120);assert.equal(data.levelStats[3].correct,1);assert.equal(data.bossHp,299955);
assert.equal(sheets['一元一次方程作答紀錄'].rows.length,2);
assert.equal(ctx.routeEquationGet_({parameter:{action:'getEquationSyncStatus',className:'SG1A',id:'1',batchId:'test-batch'}}).received,true);
assert.equal(ctx.routeEquationGet_({parameter:{action:'getEquationDashboardData',className:'SG1B'}}).players.length,0);
assert.equal(ctx.routeEquationGet_({parameter:{action:'getEquationStudentExportData',className:'SG1A',id:'1'}}).levelStats[3].total,1);
assert.ok(Object.keys(sheets).every(k=>k.startsWith('一元一次方程')));
console.log('PASS: independent sheets, player save/load, dashboard aggregation, class isolation, answer log, batch receipts and duplicate protection (in-memory only).');
