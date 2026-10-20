(function attachCore(root, factory) {
  const FractionClass = typeof module !== "undefined" && module.exports ? require("./vendor/fraction.min.js") : root.Fraction;
  const api = factory(FractionClass);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.GeneralTermGameCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createCore(FractionClass) {
  const LEVEL_XP = Object.freeze({ 1:150, 2:150, 3:150, 4:150, 5:150, 6:150 });
  const getLevelXp = (level) => LEVEL_XP[Math.min(6, Math.max(1, Number(level) || 1))];
  const randomInt = (min, max, rng) => Math.floor(rng() * (max - min + 1)) + min;
  function fractionTex(value) {
    const fraction = value instanceof FractionClass ? value : new FractionClass(value);
    const text = fraction.toFraction(); const negative = text.startsWith("-"); const unsigned = negative ? text.slice(1) : text;
    if (!unsigned.includes("/")) return `${negative ? "-" : ""}${unsigned}`;
    const [numerator, denominator] = unsigned.split("/"); return `${negative ? "-" : ""}\\frac{${numerator}}{${denominator}}`;
  }
  function numericQuestion(level, type, tex, answer, steps, extra = {}) { const value = answer instanceof FractionClass ? answer : new FractionClass(answer); return { level, type, tex, answer:value, answerTex:fractionTex(value), steps, inputKind:"number", ...extra }; }
  function choiceQuestion(level, type, tex, choices, answer, steps) { return { level, type, tex, choices, answer, answerTex:answer, steps, inputKind:"choice" }; }
  function generateLevel1(rng) {
    const a = randomInt(2, 9, rng), b = randomInt(1, 20, rng), d = randomInt(2, 5, rng);
    const items = [[`${a}x+${b}`, "代數式", `${a}x+${b}`],[`y=${a}x+${b}`, "公式", `y=${a}x+${b}`],[`x²/${d}+${b}`, "代數式", `\\frac{x²}{${d}}+${b}`],["A=lw", "公式", "A=lw"]];
    const [display, answer, displayTex] = items[randomInt(0, items.length - 1, rng)];
    const choices = ["代數式", "公式"];
    return choiceQuestion(1, "公式或代數式", `判斷：　${displayTex}　是代數式還是公式？`, choices, answer, ["公式必須有等號，並表示兩個或以上變數之間的關係。", `所以 ${display} 是${answer}。`, `答案：${answer}`]);
  }
  function generateLevel2(rng) {
    const k = randomInt(2, 5, rng), b = randomInt(1, 20, rng), x = randomInt(0, 5, rng);
    const c = randomInt(1, 10, rng), d = randomInt(2, 5, rng), a = d * randomInt(1, Math.floor(20 / d), rng);
    const items = [
      { formula:`A=${k}b`, valueTex:`b=${b}`, answer:k*b, steps:[`把 b=${b} 代入 A=${k}b。`,`A=${k}(${b})`,`A=${k*b}`] },
      { formula:`A=${k}b`, valueTex:`b=-${b}`, answer:-k*b, steps:[`把 b=-${b} 代入 A=${k}b，保留負號。`,`A=${k}(-${b})`,`A=${-k*b}`] },
      { formula:`P=x²+${c}`, valueTex:`x=${x}`, answer:x*x+c, steps:[`把 x=${x} 代入 P=x²+${c}。`,`P=${x}²+${c}`,`P=${x*x+c}`] },
      { formula:`q=\\frac{a}{${d}}+${c}`, valueTex:`a=${a}`, answer:a/d+c, steps:[`把 a=${a} 代入公式。`,`q=\\frac{${a}}{${d}}+${c}`,`q=${a/d+c}`] },
    ]; const item = items[randomInt(0, items.length - 1, rng)];
    const target = item.formula.split("=")[0];
    return numericQuestion(2, "單變數代入", `${item.formula}　${item.valueTex}　求 ${target}`, item.answer, item.steps);
  }
  function generateLevel3(rng) {
    const k = randomInt(2, 5, rng), j = randomInt(2, 5, rng), a = randomInt(1, 10, rng), b = randomInt(1, 10, rng);
    const items = [
      { formula:`s=${k}u+${j}v`, values:`u=${a}，v=${b}`, answer:k*a+j*b, steps:[`把 u=${a}、v=${b} 代入公式。`,`s=${k}(${a})+${j}(${b})`,`s=${k*a+j*b}`] },
      { formula:`T=${k}a-${j}b`, values:`a=${a}，b=${b}`, answer:k*a-j*b, steps:[`把 a=${a}、b=${b} 代入公式。`,`T=${k}(${a})-${j}(${b})`,`T=${k*a-j*b}`] },
      { formula:`F=${k}m+n`, values:`m=${a}，n=${b}`, answer:k*a+b, steps:[`把 m=${a}、n=${b} 代入公式。`,`F=${k}(${a})+${b}`,`F=${k*a+b}`] },
    ]; const item = items[randomInt(0, items.length - 1, rng)];
    const target = item.formula.split("=")[0];
    return numericQuestion(3, "雙變數代入", `${item.formula}　${item.values}　求 ${target}`, item.answer, item.steps);
  }
  function generateLevel4(rng) {
    const d = randomInt(2, 5, rng), k = randomInt(2, 5, rng), c = randomInt(1, 10, rng);
    const u = -randomInt(1, 20, rng), v = -randomInt(1, 20, rng);
    const a = d * randomInt(1, Math.floor(20/d), rng), b = -randomInt(1, 10, rng);
    const x = -randomInt(1, 10, rng), y = randomInt(1, 10, rng), p = -randomInt(1, 20, rng), q = randomInt(1, 20, rng);
    const difference = new FractionClass(u-v).div(d), sum = new FractionClass(p+q).div(d);
    const items = [
      { formula:`f=\\frac{u-v}{${d}}`, values:`u=${u}，v=${v}`, answer:difference, steps:[`把 u=${u}、v=${v} 代入，保留括號。`,`f=\\frac{${u}-(${v})}{${d}}`,`f=${fractionTex(difference)}`] },
      { formula:`T=\\frac{a}{${d}}+${k}b`, values:`a=${a}，b=${b}`, answer:a/d+k*b, steps:[`把 a=${a}、b=${b} 代入公式。`,`T=\\frac{${a}}{${d}}+${k}(${b})`,`T=${a/d+k*b}`] },
      { formula:`q=${k}(x+y)-${c}`, values:`x=${x}，y=${y}`, answer:k*(x+y)-c, steps:[`先把 x=${x}、y=${y} 代入括號。`,`q=${k}(${x}+${y})-${c}`,`q=${k*(x+y)-c}`] },
      { formula:`R=\\frac{p+q}{${d}}`, values:`p=${p}，q=${q}`, answer:sum, steps:[`把 p=${p}、q=${q} 代入分子。`,`R=\\frac{${p}+${q}}{${d}}`,`R=${fractionTex(sum)}`] },
    ]; const item = items[randomInt(0, items.length - 1, rng)];
    const target = item.formula.split("=")[0];
    return numericQuestion(4, "進階代入", `${item.formula}　${item.values}　求 ${target}`, item.answer, item.steps);
  }
  function generateLevel5(rng) {
    const k = randomInt(2, 5, rng), cost = randomInt(5, 20, rng), n = randomInt(1, 20, rng), base = randomInt(6, 12, rng), m = randomInt(1, 10, rng);
    const items = [
      { text:`售賣 n 個禮盒的利潤 P（元）可用公式 P=${k}n-${cost} 計算。求售出 ${n} 個禮盒的利潤（元）。`, formula:`P=${k}n-${cost}`, values:`n=${n}`, answer:k*n-cost, unit:"元", steps:[`把 n=${n} 代入公式。`,`P=${k}(${n})-${cost}`,`P=${k*n-cost}`] },
      { text:`電視機售貨員的月薪 S（千元）可用公式 S=${base}+${k}m 計算。若售出 ${m} 部，求月薪（千元）。`, formula:`S=${base}+${k}m`, values:`m=${m}`, answer:base+k*m, unit:"千元", steps:[`把 m=${m} 代入公式，金額以千元為單位。`,`S=${base}+${k}(${m})`,`S=${base+k*m}`] },
    ]; const item = items[randomInt(0, items.length - 1, rng)];
    return numericQuestion(5, "生活情境公式", `${item.text}　${item.formula}　${item.values}`, item.answer, item.steps, { unit:item.unit });
  }
  function generateLevel6(rng) {
    const a = randomInt(2, 20, rng), b = randomInt(1, a, rng), side = randomInt(1, 20, rng);
    const items = [
      { text:`長方形的長為 a cm、闊為 b cm。若 a=${a}、b=${b}，求周界 P。`, choices:["P=a+b","P=2(a+b)","P=ab"], answerFormula:"P=2(a+b)", answer:2*(a+b), steps:["長方形有兩條長和兩條闊。",`選擇 P=2(a+b)，再代入 a=${a}、b=${b}。`,`P=2(${a}+${b})=${2*(a+b)} cm`], unit:"cm" },
      { text:`菱形每邊長為 b cm。若 b=${side}，求周界 P。`, choices:["P=2b","P=3b","P=4b"], answerFormula:"P=4b", answer:4*side, steps:["菱形有四條相等的邊。",`選擇 P=4b，再代入 b=${side}。`,`P=4(${side})=${4*side} cm`], unit:"cm" },
    ]; const item = items[randomInt(0, items.length - 1, rng)];
    return { level:6, type:"圖形公式", tex:item.text, choices:item.choices, answerFormula:item.answerFormula, answer:new FractionClass(item.answer), answerTex:`${item.answer} ${item.unit}`, steps:item.steps, inputKind:"formula-number", unit:item.unit };
  }
  function generateQuestion(level, rng = Math.random) { const safeLevel = Math.min(6, Math.max(1, Number(level) || 1)); if (safeLevel===1) return generateLevel1(rng); if (safeLevel===2) return generateLevel2(rng); if (safeLevel===3) return generateLevel3(rng); if (safeLevel===4) return generateLevel4(rng); if (safeLevel===5) return generateLevel5(rng); return generateLevel6(rng); }
  function parseAnswer(input) { const text = String(input ?? "").trim(); if (!/^-?(?:\d+|\d+\.\d+|\d+\/\d+)$/.test(text)) return null; try { const parsed = new FractionClass(text); return Number.isFinite(parsed.valueOf()) ? parsed : null; } catch { return null; } }
  function isAnswerCorrect(input, expected) {
    if (typeof expected === "boolean" || typeof expected === "string") return input === expected;
    const parsed = parseAnswer(input); if (!parsed || !parsed.equals(expected)) return false; if (!String(input).includes("/")) return true;
    const [numerator, denominator] = String(input).replace("-", "").split("/").map(Number); const gcd = (a,b) => b ? gcd(b, a % b) : a;
    return denominator > 0 && gcd(numerator, denominator) === 1 && denominator !== 1;
  }
  function applyResult(progress, correct) {
    const next = { ...progress }; const target = getLevelXp(next.level); next.total = Number(next.total || 0) + 1; next.correct = Number(next.correct || 0) + (correct ? 1 : 0); next.streak = correct ? Number(next.streak || 0) + 1 : 0;
    const previousMistakes = Number(next.mistakes || 0); next.mistakes = correct ? 0 : previousMistakes + 1; const protectedPenalty = !correct && next.mistakes > 3; const xpChange = correct ? 15 : (protectedPenalty ? 0 : -10); next.xp = Math.max(0, Number(next.xp || 0) + xpChange);
    let leveledUp = false; let completed = false; if (next.xp >= target) { if (next.level < 6) { next.xp -= target; next.level += 1; leveledUp = true; } else { next.xp = target; completed = true; } }
    return { progress:next, leveledUp, completed, xpChange, protectedPenalty, protectionActive:next.mistakes >= 3 };
  }
  return { LEVEL_XP, getLevelXp, generateQuestion, parseAnswer, isAnswerCorrect, fractionTex, applyResult };
});
