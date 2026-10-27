(function attach(root, factory) {
  const base = typeof module !== "undefined" && module.exports ? require("./game-core.js") : root.GeneralTermGameCore;
  const Fraction = typeof module !== "undefined" && module.exports ? require("./vendor/fraction.min.js") : root.Fraction;
  const api = factory(base, Fraction);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.NthTermGameCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function create(base, Fraction) {
  const LEVELS = {
    1:{ title:"直接倍數代入", rank:"初級魔法學徒", mission:"把指定的 n 代入通項公式", hint:"求第幾項，就把 n 換成幾。", avatar:"hero-lv1.webp" },
    2:{ title:"一次式代入", rank:"星紋術士", mission:"代入後先乘除、後加減", hint:"注意負係數和常數的正負號。", avatar:"hero-lv2.webp" },
    3:{ title:"乘方與乘積", rank:"星海導師", mission:"計算平方、立方及乘積", hint:"先算括號和乘方，再完成乘法。", avatar:"hero-lv3.webp" },
    4:{ title:"常數分母的分式", rank:"極光賢者", mission:"先算分子，再化成最簡分數", hint:"把 n 代入分子，完成加減後再約分。", avatar:"hero-lv4.webp" },
    5:{ title:"分子、分母都含 n", rank:"星穹大法皇", mission:"分別計算分子和分母，再約分", hint:"分子和分母都要把 n 換成指定的數。", avatar:"hero-lv5.webp" },
  };
  const coefficient = (a) => a === 1 ? "" : a === -1 ? "-" : String(a);
  const constant = (b) => b < 0 ? String(b) : `+${b}`;
  const linear = (a,b) => `${coefficient(a)}n${b ? constant(b) : ""}`;
  const pools = { 1:{multiple:[]}, 2:{linear:[],subtract:[]}, 3:{product:[],square:[],cube:[]}, 4:{constantDenominator:[]}, 5:{ratio:[],linearRatio:[]} };
  function add(level, template, formula, substitution, numerator, denominator, n, parameters = {}) {
    if (!denominator) return;
    const answer = new Fraction(numerator, denominator);
    const answerText = answer.toFraction();
    const [top,bottom = "1"] = answerText.replace("-", "").split("/").map(Number);
    if (Math.abs(answer.valueOf()) > 100 || top > 100 || bottom > 100) return;
    const answerTex = base.fractionTex(answer);
    pools[level][template].push({ level, template, formula, n, parameters, key:`${level}|${formula}|${n}`, type:LEVELS[level].title,
      tex:`已知通項公式 T_n=${formula}，求第 ${n} 項。`,
      answer, answerTex, inputKind:"number",
      steps:[`求第 ${n} 項，把 n=${n} 代入通項公式。`, `T_{${n}}=${substitution}`, `T_{${n}}=${answerTex}`] });
  }
  for (let n=1; n<=10; n++) {
    for (let a=-9; a<=9; a++) {
      if (!a) continue;
      add(1,"multiple",`${coefficient(a)}n`,`${a}\\times${n}`,a*n,1,n,{a});
      if (n>=2 && n<=10) add(3,"product",`${coefficient(a)}n(n-1)`,`${a}\\times${n}\\times(${n}-1)`,a*n*(n-1),1,n,{a});
      for (let b=-9;b<=9;b++) {
        if (!b) continue;
        add(2,"linear",linear(a,b),`${a}\\times${n}${constant(b)}`,a*n+b,1,n,{a,b});
        if (a>0) add(2,"subtract",`${b}-${coefficient(a)}n`,`${b}-${a}\\times${n}`,b-a*n,1,n,{a,b});
      }
    }
    if (n<=10) add(3,"square","n^2",`${n}\\times${n}`,n*n,1,n);
    if (n<=4) add(3,"cube","n^3",`${n}\\times${n}\\times${n}`,n*n*n,1,n);
    for (let a=1;a<=9;a++) for (let b=1;b<=9;b++) {
      if (a >= 2) for (const offset of [b, -b]) add(4,"constantDenominator",`\\frac{n${constant(offset)}}{${a}}`,`\\frac{${n}${constant(offset)}}{${a}}`,n+offset,a,n,{a,b:offset});
      add(5,"ratio",`\\frac{n-${a}}{n+${b}}`,`\\frac{${n}-${a}}{${n}+${b}}`,n-a,n+b,n,{a,b});
    }
  }
  // A finite pool per fixed template makes the answer bounds and repeat policy explicit.
  for (let n=2;n<=10;n++) for (let a=-4;a<=4;a++) for (let b=-5;b<=5;b++) for (let c=1;c<=3;c++) for (let d=1;d<=4;d++) {
    if (!a || !b || a*d === b*c) continue;
    add(5,"linearRatio",`\\frac{${linear(a,b)}}{${linear(c,d)}}`,`\\frac{${a}\\times${n}${constant(b)}}{${c}\\times${n}+${d}}`,a*n+b,c*n+d,n,{a,b,c,d});
  }
  // Count the effective coefficient of n: b-an has coefficient -a.
  const levelTwoSignPools = [0,1,2].map((negativeCount) => Object.values(pools[2]).flat().filter((q) => {
    const a = q.template === "subtract" ? -q.parameters.a : q.parameters.a;
    return Number(a < 0) + Number(q.parameters.b < 0) === negativeCount;
  }));
  function generateQuestion(level, rng = Math.random, recent = []) {
    level = Math.min(5, Math.max(1, Number(level) || 1));
    let template; let signPool;
    if (level === 2) { const chance = rng(); signPool = levelTwoSignPools[chance < .70 ? 0 : chance < .90 ? 1 : 2]; }
    else if (level === 3) { const chance = rng(); template = chance < .70 ? "product" : chance < .85 ? "square" : "cube"; }
    else { const types = Object.keys(pools[level]); template = types[Math.min(types.length-1,Math.floor(rng()*types.length))]; }
    const used = new Set(recent);
    const selectedPool = signPool || pools[level][template];
    let available = selectedPool.filter((q) => !used.has(q.key) && !used.has(q.tex));
    if (!available.length && !signPool) available = Object.values(pools[level]).flat().filter((q) => !used.has(q.key) && !used.has(q.tex));
    if (!available.length) available = selectedPool;
    const chosen = available[Math.min(available.length-1,Math.floor(rng()*available.length))];
    const targetNotation = rng() < .5 ? "words" : "symbol";
    const targetTex = targetNotation === "symbol" ? `求 T_{${chosen.n}}。` : `求第 ${chosen.n} 項。`;
    return { ...chosen, targetNotation, targetTex, tex:`已知通項公式 T_n=${chosen.formula}，${targetTex}`, steps:[...chosen.steps], parameters:{...chosen.parameters} };
  }
  function applyResult(progress, correct) {
    const next = { ...progress, level:Math.min(5, Math.max(1, Number(progress.level) || 1)) };
    next.total = Number(next.total || 0)+1; next.correct = Number(next.correct || 0)+(correct?1:0);
    next.streak = correct ? Number(next.streak || 0)+1 : 0; next.mistakes = correct ? 0 : Number(next.mistakes || 0)+1;
    const protectedPenalty = !correct && next.mistakes>3; const xpChange = correct ? 15 : protectedPenalty ? 0 : -10;
    next.xp = Math.max(0,Number(next.xp || 0)+xpChange);
    let leveledUp=false,completed=false;
    if(next.xp>=150) { if(next.level<5) {next.xp-=150;next.level++;leveledUp=true;} else {next.xp=150;completed=true;} }
    return { progress:next,leveledUp,completed,xpChange,protectedPenalty,protectionActive:next.mistakes>=3 };
  }
  return { ...base, LEVELS, LEVEL_XP:{1:150,2:150,3:150,4:150,5:150},getLevelXp:()=>150,generateQuestion,applyResult };
});
