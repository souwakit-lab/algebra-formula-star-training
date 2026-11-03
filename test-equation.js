const assert=require("node:assert/strict"),core=require("./equation-core"),Fraction=require("./vendor/fraction.min.js");
function seeded(seed){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
function expression(tex,variable,value){
  function group(text,start){let depth=0;for(let i=start;i<text.length;i++){if(text[i]==="{")depth++;if(text[i]==="}"&&--depth===0)return[text.slice(start+1,i),i+1];}throw Error("unbalanced group");}
  while(tex.includes("\\frac")){const at=tex.indexOf("\\frac"),[a,end]=group(tex,at+5),[b,next]=group(tex,end);tex=tex.slice(0,at)+`((${a})/(${b}))`+tex.slice(next);}
  tex=tex.replaceAll("\\times","*").replaceAll(variable,`(${value})`).replace(/(\d|\))(?=\()/g,"$1*");
  assert.match(tex,/^[\d\s()+*/.\-]+$/);
  return Function(`"use strict";return (${tex})`)(); // Only trusted generated expressions, never user answers.
}
const types=new Set(),variables=new Set(),mix={2:0,3:0};
for(let level=1;level<=5;level++){
  const rng=seeded(334+level),recent=[];
  for(let i=0;i<5000;i++){
    const q=core.generateQuestion(level,rng,recent);types.add(q.template);variables.add(q.variable);
    assert.equal(q.level,level);assert.ok(q.formula&&!q.formula.includes("undefined"));
    assert.ok(!/(^|[+\-(=])1[xyzabcmnpqrt]/.test(q.formula),q.formula);
    if(level===1){assert.equal(q.answer,["valid","validFraction","bothSides"].includes(q.template)?"是":"不是");assert.ok(q.choices.includes(q.answer));continue;}
    assert.ok(Number.isInteger(q.solution)&&Math.abs(q.solution)<=100);
    assert.ok(core.isAnswerCorrect(q.answer,q.answer));
    assert.ok(!core.isAnswerCorrect(String(q.solution),q.answer));
    const wrongLetter=core.LETTERS.find(v=>v!==q.variable);
    assert.ok(!core.isAnswerCorrect(`${wrongLetter}=${q.solution}`,q.answer));
    const [left,right]=q.formula.split("=");
    assert.ok(Math.abs(expression(left,q.variable,q.solution)-expression(right,q.variable,q.solution))<1e-8,q.formula+" -> "+q.answer);
    assert.ok(new Fraction(q.left[0]).mul(q.solution).add(q.left[1]).equals(new Fraction(q.right[0]).mul(q.solution).add(q.right[1])));
    for(const step of q.steps){const eq=step.split("（")[0];if(!eq.includes("="))continue;const [a,b]=eq.split("=");assert.ok(Math.abs(expression(a,q.variable,q.solution)-expression(b,q.variable,q.solution))<1e-8,step);}
    if(level===4)mix[q.skill]++;
    assert.ok(!recent.includes(q.key));recent.push(q.key);if(recent.length>12)recent.shift();
  }
}
assert.equal(variables.size,12);assert.equal(types.size,17);
assert.ok(mix[2]>2200&&mix[2]<2800);
assert.deepEqual(core.LEVEL_XP,{1:100,2:100,3:100,4:150,5:150});
for(let level=1;level<=5;level++){
  const r=core.applyResult({level,xp:core.getLevelXp(level)-5},true);
  assert.equal(r.progress.level,Math.min(5,level+1));assert.equal(r.progress.xp,level===5?150:10);
}
for(const input of ["3","x","x=","x==3","x=1/0","x=3+0","y=3","x=3;alert(1)"])assert.ok(!core.isAnswerCorrect(input,"x=3"));
assert.ok(core.isAnswerCorrect(" x ＝ −3 ","x=-3"));assert.ok(core.isAnswerCorrect("x=6/2","x=3"));
let p={level:1,xp:80};for(let i=0;i<5;i++){const r=core.applyResult(p,false);assert.equal(r.xpChange,i<3?-10:0);p=r.progress;}assert.equal(core.applyResult(p,true).progress.mistakes,0);
console.log("PASS: 25,000 questions, exact solutions, every solution step, 12 letters, full-answer validation, 50/50 mix, no recent duplicates, XP and penalty protection.");
