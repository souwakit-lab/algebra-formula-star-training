
/* Equation II: question families based on worksheet 18 and 21. No external services. */
(function (root) {
  'use strict';
  const LEVEL_COUNT=6, REQUIREMENTS={1:80,2:80,3:80,4:80,5:80,6:80};
  const LABELS={
    1:['移項或化系數為 1','基礎單步方程'],
    2:['移項及化系數為 1','例如 4x−2=6'],
    3:['兩邊含未知數的移項','銜接練習 · 例如 4x−2=6−5x'],
    4:['單層去括號、移項、合併','單層括號'],
    5:['兩邊含未知數及去括號','兩邊未知數及括號'],6:['去分母解方程','先乘最小公倍數，再去括號及移項']
  };
  const LETTERS=[...'xyzabchpndwt'];
  const rank=['','初級魔法學徒','星紋術士','星海導師','極光賢者','星穹大法皇','分式星術師'];
  const LEVELS=Object.fromEntries(Array.from({length:6},(_,i)=>{
    const l=i+1;return [l,{title:LABELS[l][0],mission:LABELS[l][0],hint:LABELS[l][1],rank:rank[l],avatar:root.EQUATION_BUNDLE_ASSETS?.[`hero-lv${Math.min(l,5)}.webp`]||''}];
  }));
  const rand=(lo,hi,rng)=>lo+Math.floor(rng()*(hi-lo+1));
  const pick=(arr,rng)=>arr[rand(0,arr.length-1,rng)];
  const sign=(n)=>n<0?`${n}`:`+${n}`;
  const coeff=(n,v)=>n===1?v:n===-1?`-${v}`:`${n}${v}`;
  const neg=(n)=>n<0?`(${n})`:`${n}`;
  const fmt=(v)=>String(Math.round(v*1000)/1000);
  const raw=(v)=>typeof v==='number'?fmt(v):String(v);
  const mk=(tag,eq,hint='')=>({skill:tag,eq:String(eq),hint});
  // The five stages follow the teacher's requested curriculum progression.
  // Every problem is generated from a preselected integer root. Intermediate
  // equations therefore always preserve the same unique solution.
  function family(level,rng,fractionMode=false){
    const v=pick(LETTERS,rng);
    let s=0,sText='0';
    // Choose an exact rational root whose denominator divides the effective
    // coefficient, preserving integer coefficients/constants in each prompt.
    function chooseRoot(effectiveCoefficient){
      if(!fractionMode){s=rand(-6,6,rng);sText=String(s);return true;}
      const n=Math.abs(effectiveCoefficient);
      const denominators=[];
      for(let d=2;d<=n;d++)if(n%d===0)denominators.push(d);
      if(!denominators.length)return false;
      const d=pick(denominators,rng);
      const numerators=[];
      const gcd=(a,b)=>b?gcd(b,a%b):Math.abs(a);
      for(let p=-12;p<=12;p++)if(p!==0&&gcd(Math.abs(p),d)===1)numerators.push(p);
      const p=pick(numerators,rng);
      s=p/d;sText=`${p}/${d}`;return true;
    }
    const int=x=>Math.round(x);
    const a=pick([-6,-5,-4,-3,-2,2,3,4,5,6],rng);
    const b=pick([-8,-7,-6,-5,-4,-3,-2,-1,1,2,3,4,5,6,7,8],rng);
    let formula,steps,template;
    const source=level===3?'銜接練習':level<4?'':level===4?'':'';
    const A=(n)=>coeff(n,v);
    const finish=(n)=>[mk('化系數為 1',`(${A(n)})/(${n})=(${int(n*s)})/(${n})`,'兩邊同除以未知數的係數。'),mk('計算',`${v}=${sText}`)];
    if(level===1){
      template=pick(fractionMode?['coefficient','reverseCoefficient']:['move','reverseMove','coefficient','reverseCoefficient'],rng);
      if(template==='move'||template==='reverseMove'){
        chooseRoot(1);const r=s+b;
        formula=template==='move'?`${v}${sign(b)}=${r}`:`${r}=${v}${sign(b)}`;
        steps=template==='reverseMove'?[mk('移項',`-${v}=${b}${sign(-r)}`,'字母移到左邊，數字移到右邊；移項要變號。'),mk('計算',`-${v}=${-s}`),mk('化系數為 1',`${v}=${s}`)]:[mk('移項',`${v}=${r}${sign(-b)}`),mk('計算',`${v}=${s}`)];
      }else{
        chooseRoot(a);const r=int(a*s);
        formula=template==='coefficient'?`${A(a)}=${r}`:`${r}=${A(a)}`;
        steps=template==='reverseCoefficient'?[mk('移項',`${A(-a)}=${-r}`),...finish(-a)]:finish(a);
      }
    }else if(level===2){
      template=pick(['standard','reverseStandard','constantFirst'],rng);
      chooseRoot(a);const c=int(a*s)+b;
      formula=template==='standard'?`${A(a)}${sign(b)}=${c}`:
        template==='reverseStandard'?`${c}=${A(a)}${sign(b)}`:
        `${b}${sign(a)}${v}=${c}`;
      steps=template==='reverseStandard'?[mk('移項',`${A(-a)}=${b}${sign(-c)}`),mk('合併／計算',`${A(-a)}=${-a*s}`),...finish(-a)]:[mk('移項',`${A(a)}=${c}${sign(-b)}`),mk('合併／計算',`${A(a)}=${a*s}`),...finish(a)];
    }else if(level===3){
      template=pick(['bothSides','reverseBothSides','constantFirstBothSides'],rng);
      let c=pick([-5,-4,-3,-2,-1,1,2,3,4,5],rng);
      if(c===a)c=a===5?4:a+1;
      if(!chooseRoot(a-c))return null;
      const d=int((a-c)*s)+b;
      const left=`${A(a)}${sign(b)}`,right=`${A(c)}${sign(d)}`;
      formula=template==='bothSides'?`${left}=${right}`:
        template==='reverseBothSides'?`${right}=${left}`:
        `${b}${sign(a)}${v}=${d}${sign(c)}${v}`;
      steps=[
        mk('移項',`${A(a)}${sign(-c)}${v}=${d}${sign(-b)}`),
        mk('合併同類項',`${A(a-c)}=${int((a-c)*s)}`),
        ...finish(a-c)
      ];
    }else if(level===4){
      template=pick(['singleBracket','negativeBracket','bracketWithConstant'],rng);
      const k=template==='negativeBracket'?-Math.abs(a):a;
      chooseRoot(k);const r=int(k*s)+k*b;
      if(template==='bracketWithConstant'){
        const m=pick([-7,-6,-5,-4,-3,-2,2,3,4,5,6,7],rng);
        formula=`${k}(${v}${sign(b)})${sign(m)}=${r+m}`;
      }else{
        formula=`${k}(${v}${sign(b)})=${r}`;
      }
      steps=[];
      if(template==='bracketWithConstant'){
        const m=Number(formula.slice(formula.lastIndexOf(')')+1,formula.lastIndexOf('=')));
        steps.push(mk('去括號',`${A(k)}${sign(k*b)}${sign(m)}=${r+m}`));
        steps.push(mk('合併同類項',`${A(k)}${sign(k*b+m)}=${r+m}`));
        steps.push(mk('移項',`${A(k)}=${r+m}${sign(-(k*b+m))}`));
      }else{
        steps.push(mk('去括號',`${A(k)}${sign(k*b)}=${r}`));
        steps.push(mk('移項',`${A(k)}=${r}${sign(-k*b)}`));
      }
      steps.push(mk('合併／計算',`${A(k)}=${int(k*s)}`),...finish(k));
    }else if(level===6){
      const gcd=(x,y)=>y?gcd(y,x%y):x;
      const d=pick([1,2,3],rng),e=pick([1,2,3],rng),lcm=d*e/gcd(d,e),u=lcm/d,w=lcm/e;
      if(d===1&&e===1)return null;
      template=pick(['fractionAcross','fractionSum'],rng);
      let k=pick([1,2,3],rng),offset,rhs,n;
      const rootText=(num,den)=>{const g=gcd(Math.abs(num),Math.abs(den));num/=g;den/=g;if(den<0){num=-num;den=-den;}return den===1?String(num):`${num}/${den}`;};
      if(template==='fractionAcross'){
        n=u-w*k;if(!n)return null;
        // Integer roots without rejecting either pictured family.
        offset=pick([1,2,3],rng);
        s=-u*offset/n;sText=rootText(-u*offset,n);
        formula=`(${v}${sign(offset)})/${d}=(${A(k)})/${e}`;
        steps=[mk('去分母',`${u}(${v}${sign(offset)})=${A(w*k)}`,`兩邊每一項同乘最小公倍數 ${lcm}。`),
          mk('去括號',`${A(u)}${sign(u*offset)}=${A(w*k)}`),
          mk('移項',`${A(u)}${sign(-w*k)}${v}=${-u*offset}`),
          mk('合併同類項',`${A(n)}=${int(n*s)}`),...finish(n)];
      }else{
        n=u+w;offset=pick([1,2,3],rng);rhs=pick([1,2,3],rng);
        s=(rhs*lcm-w*offset)/n;sText=rootText(rhs*lcm-w*offset,n);
        formula=`${v}/${d}+(${v}${sign(offset)})/${e}=${rhs}`;
        steps=[mk('去分母',`${A(u)}+${w}(${v}${sign(offset)})=${rhs*lcm}`,`兩邊每一項同乘最小公倍數 ${lcm}。`),
          mk('去括號',`${A(u)}+${A(w)}${sign(w*offset)}=${rhs*lcm}`),
          mk('移項',`${A(u)}+${A(w)}=${rhs*lcm}${sign(-w*offset)}`),
          mk('合併同類項',`${A(n)}=${int(n*s)}`),...finish(n)];
      }

    }else{
      template=pick(['oneBracketBothSides','twoBrackets','minusBracketBothSides','bracketWithOffset'],rng);
      let c=pick([-5,-4,-3,-2,2,3,4,5],rng);
      if(c===a)c=a===5?4:a+1;
      if(template==='oneBracketBothSides'){
        if(!chooseRoot(a-c))return null;
        const d=int((a-c)*s)+a*b;
        formula=`${a}(${v}${sign(b)})=${A(c)}${sign(d)}`;
        steps=[mk('去括號',`${A(a)}${sign(a*b)}=${A(c)}${sign(d)}`),
          mk('移項',`${A(a)}${sign(-c)}${v}=${d}${sign(-a*b)}`),
          mk('合併同類項',`${A(a-c)}=${int((a-c)*s)}`),...finish(a-c)];
      }else if(template==='twoBrackets'){
        if(!chooseRoot(a-c))return null;
        const h=rand(-5,5,rng),extra=int((a-c)*s)+a*b-c*h;
        formula=`${a}(${v}${sign(b)})=${c}(${v}${sign(h)})${sign(extra)}`;
        steps=[mk('去括號',`${A(a)}${sign(a*b)}=${A(c)}${sign(c*h)}${sign(extra)}`),
          mk('合併同類項',`${A(a)}${sign(a*b)}=${A(c)}${sign(c*h+extra)}`),
          mk('移項',`${A(a)}${sign(-c)}${v}=${c*h+extra}${sign(-a*b)}`),
          mk('合併同類項',`${A(a-c)}=${int((a-c)*s)}`),...finish(a-c)];
      }else if(template==='minusBracketBothSides'){
        const k=Math.abs(a),h=rand(1,9,rng);
        if(c===-k)c=pick([2,3,4,5],rng);
        if(!chooseRoot(-k-c))return null;
        const d=h+int((-k-c)*s)-k*b;
        formula=`${h}-${k}(${v}${sign(b)})=${A(c)}${sign(d)}`;
        steps=[mk('去括號',`${h}${sign(-k)}${v}${sign(-k*b)}=${A(c)}${sign(d)}`),
          mk('移項',`${A(-k)}${sign(-c)}${v}=${d}${sign(-h)}${sign(k*b)}`),
          mk('合併同類項',`${A(-k-c)}=${int((-k-c)*s)}`),...finish(-k-c)];
      }else{
        if(!chooseRoot(a-c))return null;
        const extra=rand(1,7,rng),d=int((a-c)*s)+a*b+extra;
        formula=`${a}(${v}${sign(b)})${sign(extra)}=${A(c)}${sign(d)}`;
        steps=[mk('去括號',`${A(a)}${sign(a*b)}${sign(extra)}=${A(c)}${sign(d)}`),
          mk('合併同類項',`${A(a)}${sign(a*b+extra)}=${A(c)}${sign(d)}`),
          mk('移項',`${A(a)}${sign(-c)}${v}=${d}${sign(-(a*b+extra))}`),
          mk('合併同類項',`${A(a-c)}=${int((a-c)*s)}`),...finish(a-c)];
      }
    }
    const answer=steps[steps.length-1].eq;
    return {level,source,variable:v,formula,steps,answer,solution:s,solutionText:sText,isFraction:fractionMode,type:LEVELS[level].title,template,instruction:'解下列方程，逐行填寫過程',tex:formula,key:`${level}|${formula}`};
  }
  function generateQuestion(level,rng=Math.random,recent=[]){
    level=Math.min(6,Math.max(1,Number(level)||1));let q;
    const fractionMode=rng()<0.20;
    for(let i=0;i<240;i++){q=family(level,rng,fractionMode);if(q&&!recent.includes(q.key))return q;}
    // A heavily constrained custom random source may repeat a question.
    for(let i=0;i<240;i++){q=family(level,rng,fractionMode);if(q)return q;}
    throw Error('無法生成符合要求的隨機方程');
  }
  function clean(s){return String(s??'').normalize('NFKC').replace(/[−–—﹣]/g,'-').replace(/[×·]/g,'*').replace(/÷/g,'/').replace(/\[/g,'(').replace(/\]/g,')').replace(/\s/g,'').toLowerCase().replace(/(\d)\*([a-z])/g,'$1$2').replace(/(\d)\*\(/g,'$1(');}
  // A *step-aware* structural comparison, not merely an equation-solver test.
  // It preserves uncompleted arithmetic, unopened brackets and uncombined terms.
  // It accepts term / factor reordering, implicit multiplication, insignificant
  // parentheses, and swapping the two sides of the equality.
  function parseExpression(source){
    const src=clean(source);let i=0;
    const atomStart=ch=>/[0-9a-z.(]/.test(ch||'');
    function primary(){
      const c=src[i];if(c==='('){i++;const n=sum();if(src[i]!==')')throw Error('缺少右括號');i++;return n;}
      if(/[a-z]/.test(c||'')){i++;return {type:'var',value:c};}
      const m=src.slice(i).match(/^(?:\d+(?:\.\d*)?|\.\d+)/);
      if(m){i+=m[0].length;return {type:'num',value:m[0]};}
      throw Error('算式格式錯誤');
    }
    function unary(){if(src[i]==='+'){i++;return unary();}if(src[i]==='-'){i++;return {type:'neg',value:unary()};}return primary();}
    function product(){
      let n=unary();
      while(i<src.length){
        if(src[i]==='*'){i++;n={type:'mul',values:[n,unary()]};}
        else if(src[i]==='/'){i++;n={type:'div',left:n,right:unary()};}
        else if(atomStart(src[i]))n={type:'mul',values:[n,unary()]};
        else break;
      }
      return n;
    }
    function sum(){
      let n=product();
      while(src[i]==='+'||src[i]==='-'){
        const negative=src[i++]==='-';const next=product();
        n={type:'add',values:[n,negative?{type:'neg',value:next}:next]};
      }
      return n;
    }
    if(!src||/[^0-9a-z+*\/().-]/.test(src))throw Error('不支援的算式');
    const result=sum();if(i!==src.length)throw Error('多餘的符號');
    return result;
  }
  function canonicalNode(node){
    if(node.type==='num'){
      const val=Number(node.value);if(!Number.isFinite(val))throw Error('無效數字');
      return {kind:'atom',sign:1,key:`n:${val}`};
    }
    if(node.type==='var')return {kind:'atom',sign:1,key:`v:${node.value}`};
    if(node.type==='neg'){
      const child=canonicalNode(node.value);return {...child,sign:-child.sign};
    }
    if(node.type==='mul'){
      let sign=1,factors=[];
      function take(item){
        const v=canonicalNode(item);sign*=v.sign;
        if(v.kind==='mul')factors.push(...v.factors);
        else if(v.key!=='n:1')factors.push(v.key);
      }
      for(const item of node.values)take(item);
      factors.sort();
      if(!factors.length)return {kind:'atom',sign,key:'n:1'};
      if(factors.length===1)return {kind:'atom',sign,key:factors[0]};
      return {kind:'mul',sign,key:`m(${factors.join('|')})`,factors};
    }
    if(node.type==='div'){
      const a=canonicalNode(node.left),b=canonicalNode(node.right);
      // Division is NOT commutative, and 12/3 is NOT collapsed to 4.
      return {kind:'div',sign:a.sign*b.sign,key:`d(${a.key}/${b.key})`};
    }
    if(node.type==='add'){
      const terms=[];
      function take(n){
        const v=canonicalNode(n);
        if(v.kind==='sum'&&v.sign===1)terms.push(...v.terms);
        else terms.push(`${v.sign<0?'-':'+'}${v.key}`);
      }
      node.values.forEach(take);terms.sort();
      if(terms.length===1){const item=terms[0];return {kind:'atom',sign:item[0]==='-'?-1:1,key:item.slice(1)};}
      return {kind:'sum',sign:1,key:`s(${terms.join('|')})`,terms};
    }
    throw Error('未支援的算式結構');
  }
  function expressionKey(value){
    const c=canonicalNode(parseExpression(value));return `${c.sign<0?'-':'+'}${c.key}`;
  }
  function termKey(value){try{return expressionKey(value);}catch{return null;}}
  // A valid relocation can put ALL variable terms on either side, provided
  // every original unsimplified top-level term appears exactly once and changes
  // sign when crossing the equals sign. This is stronger than merely having
  // the same solution; it rejects omitted terms and premature simplification.
  function additiveTerms(source){
    const c=canonicalNode(parseExpression(source));
    if(c.kind!=='sum')return [{sign:c.sign,key:c.key}];
    return c.terms.map(term=>({sign:(term[0]==='-'?-1:1)*c.sign,key:term.slice(1)}));
  }
  function balancedSignatures(eq){
    const parts=clean(eq).split('=');if(parts.length!==2)throw Error('equation');
    return parts.map((part,i)=>additiveTerms(part).map(t=>`${t.sign*(i===0?1:-1)<0?'-':'+'}${t.key}`)).flat().sort();
  }
  function validRelocation(actual,previous){
    try{
      const [al,ar]=clean(actual).split('='),[pl,pr]=clean(previous).split('=');
      if(!al||!ar||!pl||!pr)return false;
      const same=balancedSignatures(actual).join('|')===balancedSignatures(previous).join('|');
      if(!same)return false;
      const aL=additiveTerms(al),aR=additiveTerms(ar);
      const hasVar=t=>t.key.includes('v:');
      // All variable terms on one side, all number terms on the other.
      const isolated=(aL.every(hasVar)&&aR.every(t=>!hasVar(t)))||
        (aR.every(hasVar)&&aL.every(t=>!hasVar(t)));
      if(!isolated)return false;
      const [akl,akr,pkl,pkr]=[al,ar,pl,pr].map(expressionKey);
      // Rewriting the same line, even backwards, is not a new relocation.
      if((akl===pkl&&akr===pkr)||(akl===pkr&&akr===pkl))return false;
      return true;
    }catch{return false;}
  }
  // Evaluate an already-unbracketed linear expression strictly for preparing
  // the next 'combine' line after the pupil chooses an alternative relocation.
  function linearValue(node,variable){
    if(node.type==='num')return {a:0,b:Number(node.value)};
    if(node.type==='var'){
      if(node.value!==variable)throw Error('wrong variable');
      return {a:1,b:0};
    }
    if(node.type==='neg'){const q=linearValue(node.value,variable);return {a:-q.a,b:-q.b};}
    if(node.type==='add'){
      return node.values.reduce((out,x)=>{const q=linearValue(x,variable);return {a:out.a+q.a,b:out.b+q.b};},{a:0,b:0});
    }
    if(node.type==='mul'){
      return node.values.reduce((out,x)=>{const q=linearValue(x,variable);if(out.a&&q.a)throw Error('nonlinear');
        return {a:out.a*q.b+out.b*q.a,b:out.b*q.b};},{a:0,b:1});
    }
    if(node.type==='div'){
      const n=linearValue(node.left,variable),d=linearValue(node.right,variable);
      if(d.a||!d.b)throw Error('unsupported division');
      return {a:n.a/d.b,b:n.b/d.b};
    }
    throw Error('unsupported');
  }
  function combinedAfterMove(equation,variable){
    const [l,r]=clean(equation).split('=');
    const a=linearValue(parseExpression(l),variable),b=linearValue(parseExpression(r),variable);
    const tiny=x=>Math.abs(x)<1e-9?0:Number(x.toFixed(9));
    if(tiny(a.a)!==0&&tiny(a.b)===0&&tiny(b.a)===0)return {
      eq:`${coeff(tiny(a.a),variable)}=${fmt(tiny(b.b))}`,coefficient:tiny(a.a)
    };
    if(tiny(b.a)!==0&&tiny(b.b)===0&&tiny(a.a)===0)return {
      eq:`${fmt(tiny(a.b))}=${coeff(tiny(b.a),variable)}`,coefficient:tiny(b.a)
    };
    throw Error('not isolated');
  }
  // Accept the pupil's full "divide both sides by the coefficient" working.
  // e.g. -2p=-4  ->  (-2p)/(-2)=(-4)/(-2).
  // Both numerators must faithfully match the preceding line and BOTH
  // denominators must be the actual nonzero variable coefficient.
  // Checking only that the equations have the same solution would wrongly
  // allow skipped steps, incorrect signs and operations on just one side.
  function validDivideBothSides(actual,previous,variable){
    try{
      const from=clean(previous).split('='),to=clean(actual).split('=');
      if(from.length!==2||to.length!==2||from.some(x=>!x)||to.some(x=>!x))return false;
      const prior=from.map(side=>linearValue(parseExpression(side),variable));
      const variableIndex=prior.findIndex((p,i)=>Math.abs(p.a)>1e-10&&Math.abs(p.b)<1e-10&&Math.abs(prior[1-i].a)<1e-10);
      if(variableIndex<0)return false;
      const coefficient=prior[variableIndex].a;
      if(Math.abs(coefficient)<1e-10||Math.abs(coefficient-1)<1e-10)return false;
      const same=(a,b)=>Math.abs(a-b)<1e-8*Math.max(1,Math.abs(a),Math.abs(b));
      const signature=node=>{const k=canonicalNode(node);return `${k.sign<0?'-':'+'}${k.key}`;};
      const priorKeys=from.map(expressionKey),nodes=to.map(parseExpression);
      for(const arrangement of [[0,1],[1,0]]){
        if(nodes.every((node,i)=>{
          if(node.type!=='div')return false;
          if(signature(node.left)!==priorKeys[arrangement[i]])return false;
          const d=linearValue(node.right,variable);
          return Math.abs(d.a)<1e-10&&same(d.b,coefficient);
        }))return true;
      }
      return false;
    }catch{return false;}
  }
  function checkStep(actual, expected,context={}){
    const rawActual=clean(actual),rawExpected=clean(expected);
    const count=(rawActual.match(/=/g)||[]).length;
    if(count!==1)return {ok:false,orientation:'direct',wrongSides:['left','right'],message:'請填寫完整的等式，並只使用一個等號。'};
    if(/[^0-9a-z+*\/().=\-]/.test(rawActual))return {ok:false,orientation:'direct',wrongSides:['left','right'],message:'包含未支援的符號。'};
    const [al,ar]=rawActual.split('='),[el,er]=rawExpected.split('=');
    if(!al||!ar||!/[a-z]/.test(rawActual))return {ok:false,orientation:'direct',wrongSides:['left','right'],message:'請檢查方程格式及未知數。'};
    let akl,akr,ekl,ekr;
    try{[akl,akr,ekl,ekr]=[al,ar,el,er].map(expressionKey);}
    catch{return {ok:false,orientation:'direct',wrongSides:['left','right'],message:'請檢查算式中的符號、括號和運算格式。'};}
    const direct=[akl===ekl,akr===ekr],swap=[akl===ekr,akr===ekl];
    const orientation=Number(swap[0])+Number(swap[1])>Number(direct[0])+Number(direct[1])?'swapped':'direct';
    const matching=orientation==='swapped'?swap:direct;
    if(matching.every(Boolean))return {ok:true,orientation,wrongSides:[],message:''};
    if(context.skill==='化系數為 1'&&context.previous&&context.variable&&
       validDivideBothSides(rawActual,context.previous,context.variable)){
      return {ok:true,orientation,wrongSides:[],message:'正確：方程兩邊都除以未知數的係數。',divisionWorking:true};
    }
    if(context.skill==='移項'&&context.previous&&validRelocation(rawActual,context.previous)){
      return {ok:true,orientation,wrongSides:[],message:'正確的另一種移項方式。',alternativeMove:true};
    }
    return {ok:false,orientation,wrongSides:[!matching[0]?'left':null,!matching[1]?'right':null].filter(Boolean),message:'圈起的部分與本步驟要求不符；可以交換同類項次序或等號左右位置，但不可跳過指定步驟。'};
  }
  // A mathematically valid change of route may bypass any number of the
  // worksheet's suggested stages. We validate the WHOLE equation as a
  // nondegenerate linear equation with the same single solution: neither
  // an equation with a different root nor a tautology is accepted.
  const close=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=1e-8*Math.max(1,Math.abs(a),Math.abs(b));
  function equationInfo(equation,variable){
    const src=clean(equation),parts=src.split('=');
    if(parts.length!==2||parts.some(x=>!x)||src.length>220||!/^[a-z]$/.test(variable))throw Error('invalid equation');
    if([...new Set(src.match(/[a-z]/g)||[])].some(letter=>letter!==variable))throw Error('wrong variable');
    const nodes=parts.map(parseExpression);
    const values=nodes.map(n=>linearValue(n,variable));
    const delta=values[0].a-values[1].a;
    if(!Number.isFinite(delta)||Math.abs(delta)<1e-11)throw Error('not a unique linear solution');
    const solution=(values[1].b-values[0].b)/delta;
    if(!Number.isFinite(solution))throw Error('invalid solution');
    return {src,parts,nodes,values,solution};
  }
  function sameEquationStructure(a,b){
    try{
      const x=clean(a).split('=').map(expressionKey),y=clean(b).split('=').map(expressionKey);
      return x.length===2&&y.length===2&&((x[0]===y[0]&&x[1]===y[1])||(x[0]===y[1]&&x[1]===y[0]));
    }catch{return false;}
  }
  function solvedForm(equation,variable){
    // Completion requires variable = a number or a reduced integer fraction.
    function integer(n){
      if(n.type==='neg'){const v=integer(n.value);return v===null?null:-v;}
      return n.type==='num'&&/^\d+$/.test(n.value)?BigInt(n.value):null;
    }
    function simplest(n){
      if(n.type==='num')return Number.isFinite(Number(n.value));
      if(n.type==='neg')return simplest(n.value);
      if(n.type!=='div')return false;
      const numerator=integer(n.left),denominator=integer(n.right);
      if(numerator===null||denominator===null||denominator<=1n)return false;
      let a=numerator<0n?-numerator:numerator,b=denominator;
      while(b){const remainder=a%b;a=b;b=remainder;}
      return a===1n;
    }
    try{
      const {nodes}=equationInfo(equation,variable);
      return nodes[0].type==='var'&&nodes[0].value===variable&&simplest(nodes[1]);
    }catch{return false;}
  }
  function formatNumber(value){
    if(Math.abs(value)<1e-10)return '0';
    if(Math.abs(value-Math.round(value))<1e-10)return String(Math.round(value));
    for(let den=2;den<=36;den++){
      const num=Math.round(value*den);
      if(Math.abs(num/den-value)<1e-9)return `${num}/${den}`;
    }
    return String(Math.round(value*1e9)/1e9);
  }
  function nextSuggestedStep(equation,variable){
    try{
      const info=equationInfo(equation,variable);
      if(solvedForm(equation,variable))return null;
      const answer=`${variable}=${formatNumber(info.solution)}`;
      const [l,r]=info.values;
      if(info.nodes.some((n,i)=>n.type==='var'&&n.value===variable&&Math.abs(info.values[1-i].a)<1e-11)){
        return {skill:'整理最終答案',eq:answer,hint:'最後答案須把字母放在左邊，分數約至最簡；若可化成整數，請寫整數。'};
      }
      const v=variable,small=x=>Math.abs(x)<1e-10;
      const coeffString=a=>coeff(formatNumber(a),v);
      const trimmed=txt=>txt.replace(/\+\-/g,'-').replace(/--/g,'+');
      let out=null;
      // If both sides have variable terms, collect the variables together.
      if(!small(l.a)&&!small(r.a)){
        out={skill:'移項',eq:trimmed(`${coeffString(l.a)}${sign(-r.a)}${v}=${formatNumber(r.b)}${sign(-l.b)}`)};
      }else{
        const onLeft=!small(l.a),n=onLeft?l:r,c=onLeft?r:l;
        const constantSide=info.parts[onLeft?1:0];
        if(!small(n.b)){
          // Move the constant only; this also works after dividing away
          // the external -3 from -3(x+2)=12, giving x+2=-4.
          out={skill:'移項',eq:`${coeffString(n.a)}=${constantSide}${sign(-n.b)}`};
        }else if(!close(n.a,1)){
          out={skill:'化系數為 1',eq:`(${coeffString(n.a)})/(${formatNumber(n.a)})=(${constantSide})/(${formatNumber(n.a)})`};
        }else{
          out={skill:'計算',eq:answer};
        }
      }
      if(!out||sameEquationStructure(equation,out.eq))out={skill:'計算',eq:answer};
      // An unsimplified isolated fraction can be evaluated directly.
      if(sameEquationStructure(equation,out.eq))out={skill:'計算',eq:answer};
      return {...out,hint:'可按此方向繼續，也可採用其他等價解法或直接跳步。'};
    }catch{return null;}
  }
  function checkFlexibleAdvance(actual,previous,variable,original){
    try{
      const typed=equationInfo(actual,variable),from=equationInfo(previous,variable),start=equationInfo(original,variable);
      if(!close(typed.solution,from.solution)||!close(typed.solution,start.solution))
        return {ok:false,message:'本行方程與原方程的解不同，請檢查符號及等號兩邊的運算。'};
      // Equality may be reversed to keep the variable on the student's chosen side.
      // Still reject an unchanged line (including reordering within each side).
      if(typed.parts.every((part,i)=>expressionKey(part)===expressionKey(from.parts[i])))
        return {ok:false,message:'這一行只是重排原式，請完成一個新的運算步驟。'};
      return {ok:true,solved:solvedForm(actual,variable),message:'正確的等價變形；中間步驟字母可在任一邊，最後須字母在左、答案約至最簡。'};
    }catch(e){return {ok:false,message:'請填寫有唯一解的完整一元一次方程，並檢查分母、括號及未知數。'};}
  }
  function identifyRoute(actual,previous,variable,fallback){
    if(solvedForm(actual,variable))return '求出未知數';
    try{
      const prev=equationInfo(previous,variable),next=equationInfo(actual,variable);
      if(next.nodes.every(n=>n.type==='div')&&prev.nodes.some(n=>n.type!=='div'))return '方程兩邊同除';
      // A coefficient multiplying a bracket is removed on both sides.
      const outer=prev.nodes.some(n=>n.type==='mul'&&n.values.some(ch=>ch.type==='add'));
      const noOuter=!next.nodes.some(n=>n.type==='mul'&&n.values.some(ch=>ch.type==='add'));
      if(outer&&noOuter&&next.parts.some(x=>/\([a-z][+\-]\d+(?:\.\d+)?\)/.test(x)))return '兩邊同除係數';
      if(next.parts.some(x=>x.includes("/"))&&!prev.parts.some(x=>x.includes("/")))return '兩邊同除係數';
    }catch{}
    return fallback;
  }
  function getLevelXp(level){return REQUIREMENTS[level]||5;}
  returnObject();
  function returnObject(){
    root.EquationGameCore={LEVELS,LETTERS,LEVEL_COUNT,REQUIREMENTS,generateQuestion,checkStep,combinedAfterMove,clean,termKey,getLevelXp,equationInfo,checkFlexibleAdvance,sameEquationStructure,solvedForm,nextSuggestedStep,identifyRoute};
  }
})(typeof window!=='undefined'?window:globalThis);

