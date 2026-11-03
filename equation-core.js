(function(root,factory){
  const base=typeof module!=="undefined"&&module.exports?require("./game-core.js"):root.GeneralTermGameCore;
  const Fraction=typeof module!=="undefined"&&module.exports?require("./vendor/fraction.min.js"):root.Fraction;
  const api=factory(base,Fraction);
  if(typeof module!=="undefined"&&module.exports)module.exports=api;else root.EquationGameCore=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(base,Fraction){
  const LETTERS=[..."xyzabcmnpqrt"];
  const LEVEL_XP={1:100,2:100,3:100,4:150,5:150};
  const titles=["","認識一元一次方程","移項","化系數為一","一步解方程混合挑戰","兩步綜合解方程"];
  const ranks=["","初級魔法學徒","星紋術士","星海導師","極光賢者","星穹大法皇"];
  const hints=["","須有等號、只有一個未知數，而且未知數的次數為一。","移項時，加變減、減變加。","在等號兩方同乘或同除，令未知數的係數變成一。","先觀察方程，再決定需要移項還是化系數為一。","依方程結構決定次序；括號題可先同乘或同除，不必展開括號。"];
  const LEVELS=Object.fromEntries([1,2,3,4,5].map(level=>[level,{title:titles[level],rank:ranks[level],mission:titles[level],hint:hints[level],avatar:`hero-lv${level}.webp`}]));
  const pick=(a,rng)=>a[Math.min(a.length-1,Math.floor(rng()*a.length))];
  const int=(lo,hi,rng)=>lo+Math.min(hi-lo,Math.floor(rng()*(hi-lo+1)));
  const nonzero=(lo,hi,rng)=>pick(Array.from({length:hi-lo+1},(_,i)=>i+lo).filter(Boolean),rng);
  const coef=(a,v)=>a===1?v:a===-1?`-${v}`:`${a}${v}`;
  const signed=b=>b<0?String(b):`+${b}`;
  const frac=(a,b)=>base.fractionTex(new Fraction(a,b));
  const normalize=input=>String(input??"").normalize("NFKC").replace(/\s/g,"").replace(/[−–]/g,"-");
  function parseAnswer(input){
    const match=normalize(input).match(/^([xyzabcmnpqrt])=([+-]?\d+(?:\.\d+)?(?:\/[+-]?\d+)?)$/);
    if(!match)return null;
    try{const value=new Fraction(match[2]);return Number.isFinite(value.valueOf())?{variable:match[1],value}:null;}catch{return null;}
  }
  function isAnswerCorrect(input,answer){
    if(answer==="是"||answer==="不是")return input===answer;
    const got=parseAnswer(input),expected=parseAnswer(answer);
    return Boolean(got&&expected&&got.variable===expected.variable&&got.value.equals(expected.value));
  }
  function make(level,rng){
    const variable=pick(LETTERS,rng),v=variable;
    const skill=level===4?(rng()<.5?2:3):level;
    let s=int(-12,12,rng),a=nonzero(-9,9,rng),b=nonzero(-15,15,rng),c,formula,template,steps,answer;
    let left,right;
    if(skill===1){
      const other=pick(LETTERS.filter(x=>x!==v),rng);
      template=pick(["valid","validFraction","bothSides","noEquals","twoVariables","square"],rng);
      if(template==="valid"){formula=`${coef(a,v)}${signed(b)}=${int(-20,20,rng)}`;answer="是";}
      if(template==="validFraction"){formula=`\\frac{${v}}{${int(2,9,rng)}}=${int(-12,12,rng)}`;answer="是";}
      if(template==="bothSides"){const d=a===2?3:2;formula=`${coef(a,v)}${signed(b)}=${coef(d,v)}`;answer="是";}
      if(template==="noEquals"){formula=`${coef(a,v)}${signed(b)}`;answer="不是";}
      if(template==="twoVariables"){formula=`${coef(a,v)}+${coef(Math.abs(b),other)}=${int(-12,12,rng)}`;answer="不是";}
      if(template==="square"){formula=`${v}^2${signed(b)}=${int(-12,12,rng)}`;answer="不是";}
      const reason={valid:"有等號、只有一個未知數，且未知數的次數為一。",validFraction:"未知數除以非零常數後，未知數的次數仍為一。",bothSides:"未知數出現在兩方仍只有一個未知數；移項後的一次項係數不為零。",noEquals:"沒有等號，只是代數式，並不是方程。",twoVariables:"含有兩個不同的未知數，所以不是一元一次方程。",square:"含有未知數的平方，次數不是一。"};
      steps=[reason[template],`因此答案是「${answer}」。`];
    }else if(skill===2){
      c=s+b;template=rng()<.25?"reverseTransfer":"transfer";
      formula=template==="reverseTransfer"?`${c}=${v}${signed(b)}`:`${v}${signed(b)}=${c}`;
      steps=[`${v}=${c}${signed(-b)}（移項）`,`${v}=${s}`];
      left=[1,b];right=[0,c];if(template==="reverseTransfer")[left,right]=[right,left];
    }else if(skill===3){
      template=pick(["multiply","divide","fractionCoefficient"],rng);
      if(template==="multiply"){
        a=pick([-9,-8,-7,-6,-5,-4,-3,-2,-1,2,3,4,5,6,7,8,9],rng);c=a*s;
        formula=`${coef(a,v)}=${c}`;steps=[`${v}=\\frac{${c}}{${a}}（化系數為一）`,`${v}=${s}`];left=[a,0];right=[0,c];
      }else if(template==="divide"){
        a=nonzero(-9,9,rng);c=int(-9,9,rng);s=a*c;
        formula=`\\frac{${v}}{${a}}=${c}`;steps=[`${v}=${c}\\times(${a})（化系數為一）`,`${v}=${s}`];left=[new Fraction(1,a).toFraction(),0];right=[0,c];
      }else{
        a=nonzero(-5,5,rng);const d=int(2,6,rng);if(Math.abs(a)===d)a=1;
        const k=int(-6,6,rng);s=d*k;c=a*k;
        formula=`${frac(a,d)}${v}=${c}`;steps=[`${v}=${c}\\times(${frac(d,a)})（化系數為一）`,`${v}=${s}`];left=[new Fraction(a,d).toFraction(),0];right=[0,c];
      }
    }else{
      template=pick(["linear","constantMinus","quotientPlus","fractionNumerator","bracket","fractionLinear"],rng);
      a=pick([-6,-5,-4,-3,-2,2,3,4,5,6],rng);
      if(template==="linear"){
        c=a*s+b;formula=`${coef(a,v)}${signed(b)}=${c}`;
        steps=[`${coef(a,v)}=${c}${signed(-b)}（移項）`,`${v}=\\frac{${a*s}}{${a}}（化系數為一）`,`${v}=${s}`];left=[a,b];right=[0,c];
      }else if(template==="constantMinus"){
        a=Math.abs(a);c=b-a*s;formula=`${b}-${coef(a,v)}=${c}`;
        steps=[`-${coef(a,v)}=${c}${signed(-b)}（移項）`,`${v}=\\frac{${-a*s}}{${-a}}（化系數為一）`,`${v}=${s}`];left=[-a,b];right=[0,c];
      }else if(template==="quotientPlus"){
        const k=int(-9,9,rng);s=a*k;c=k+b;formula=`\\frac{${v}}{${a}}${signed(b)}=${c}`;
        steps=[`\\frac{${v}}{${a}}=${c}${signed(-b)}（移項）`,`${v}=${k}\\times(${a})（化系數為一）`,`${v}=${s}`];left=[new Fraction(1,a).toFraction(),b];right=[0,c];
      }else if(template==="fractionNumerator"){
        c=int(-9,9,rng);s=a*c-b;formula=`\\frac{${v}${signed(b)}}{${a}}=${c}`;
        steps=[`${v}${signed(b)}=${c}\\times(${a})（兩方同乘分母）`,`${v}=${a*c}${signed(-b)}（移項）`,`${v}=${s}`];left=[new Fraction(1,a).toFraction(),new Fraction(b,a).toFraction()];right=[0,c];
      }else if(template==="bracket"){
        const k=int(-9,9,rng);s=k-b;c=a*k;formula=`${a}(${v}${signed(b)})=${c}`;
        steps=[`${v}${signed(b)}=\\frac{${c}}{${a}}（兩方同除以 ${a}）`,`${v}=${s+b}${signed(-b)}（移項）`,`${v}=${s}`];left=[a,a*b];right=[0,c];
      }else{
        a=int(1,5,rng);const d=int(2,6,rng),k=int(-6,6,rng);if(a===d)a=1;s=d*k;c=b-a*k;
        formula=`${b}-${frac(a,d)}${v}=${c}`;
        steps=[`-${frac(a,d)}${v}=${c}${signed(-b)}（移項）`,`${v}=${c-b}\\times(${frac(-d,a)})（化系數為一）`,`${v}=${s}`];left=[new Fraction(-a,d).toFraction(),b];right=[0,c];
      }
    }
    if(skill!==1){answer=`${v}=${s}`;if(Math.abs(s)>100)return make(level,rng);}
    const instruction=skill===1?"判斷是否一元一次方程":"解下列方程";
    return {level,skill,template,variable,formula,solution:s,left,right,type:LEVELS[level].title,inputKind:skill===1?"choice":"equation",choices:skill===1?["是","不是"]:undefined,answer,answerTex:answer,steps,tex:`${instruction}：${formula}`,key:`${level}|${formula}`,instruction};
  }
  function generateQuestion(level,rng=Math.random,recent=[]){
    level=Math.min(5,Math.max(1,Number(level)||1));const used=new Set(recent);let q;
    for(let i=0;i<60;i++){q=make(level,rng);if(!used.has(q.key))break;}return q;
  }
  function applyResult(progress,correct){
    const next={...progress,level:Math.min(5,Math.max(1,Number(progress.level)||1))};
    next.total=Number(next.total||0)+1;next.correct=Number(next.correct||0)+(correct?1:0);
    next.streak=correct?Number(next.streak||0)+1:0;next.mistakes=correct?0:Number(next.mistakes||0)+1;
    const protectedPenalty=!correct&&next.mistakes>3,xpChange=correct?15:protectedPenalty?0:-10;
    next.xp=Math.max(0,Number(next.xp||0)+xpChange);let leveledUp=false,completed=false;
    const threshold=LEVEL_XP[next.level];
    if(next.xp>=threshold){if(next.level<5){next.xp-=threshold;next.level++;leveledUp=true;}else{next.xp=threshold;completed=true;}}
    return {progress:next,leveledUp,completed,xpChange,protectedPenalty,protectionActive:next.mistakes>=3};
  }
  return {...base,LETTERS,LEVELS,LEVEL_XP,getLevelXp:level=>LEVEL_XP[level],generateQuestion,parseAnswer,isAnswerCorrect,applyResult};
});
