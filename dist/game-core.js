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
  function generateLevel1() {
    const items = [["3x+2", "代數式", "3x+2"],["P=2(a+b)", "公式", "P=2(a+b)"],["x²/3+1", "代數式", "\\frac{x²}{3}+1"],["A=lw", "公式", "A=lw"]];
    const [display, answer, displayTex] = items[Math.floor(Math.random() * items.length)];
    const choices = ["代數式", "公式"];
    return choiceQuestion(1, "公式或代數式", `判斷：　${displayTex}　是代數式還是公式？`, choices, answer, ["公式必須有等號，並表示兩個或以上變數之間的關係。", `所以 ${display} 是${answer}。`, `答案：${answer}`]);
  }
  function generateLevel2(rng) {
    const items = [
      { formula:"A=4b", valueTex:"b=6", answer:24, steps:["把 b=6 代入 A=4b。","A=4(6)","A=24"] },
      { formula:"A=4b", valueTex:"b=-6", answer:-24, steps:["把 b=-6 代入 A=4b，保留負號。","A=4(-6)","A=-24"] },
      { formula:"P=x²+3", valueTex:"x=4", answer:19, steps:["把 x=4 代入 P=x²+3。","P=4²+3","P=19"] },
      { formula:"q=\\frac{a}{2}+5", valueTex:"a=8", answer:9, steps:["把 a=8 代入 q=a/2+5。","q=\\frac{8}{2}+5","q=9"] },
    ]; const item = items[randomInt(0, items.length - 1, rng)];
    const target = item.formula.split("=")[0];
    return numericQuestion(2, "單變數代入", `${item.formula}　${item.valueTex}　求 ${target}`, item.answer, item.steps);
  }
  function generateLevel3(rng) {
    const items = [
      { formula:"s=2u+3v", values:"u=4，v=5", answer:23, steps:["把 u=4、v=5 代入 s=2u+3v。","s=2(4)+3(5)","s=23"] },
      { formula:"T=5a-2b", values:"a=3，b=2", answer:11, steps:["把 a=3、b=2 代入 T=5a-2b。","T=5(3)-2(2)","T=11"] },
      { formula:"F=3m+n", values:"m=6，n=4", answer:22, steps:["把 m=6、n=4 代入 F=3m+n。","F=3(6)+4","F=22"] },
    ]; const item = items[randomInt(0, items.length - 1, rng)];
    const target = item.formula.split("=")[0];
    return numericQuestion(3, "雙變數代入", `${item.formula}　${item.values}　求 ${target}`, item.answer, item.steps);
  }
  function generateLevel4(rng) {
    const items = [
      { formula:"f=\\frac{u-v}{2}", values:"u=-3，v=-9", answer:3, steps:["把 u=-3、v=-9 代入，保留括號。","f=\\frac{-3-(-9)}{2}","f=3"] },
      { formula:"T=\\frac{a}{2}+3b", values:"a=8，b=-2", answer:-2, steps:["把 a=8、b=-2 代入 T=a/2+3b。","T=\\frac{8}{2}+3(-2)","T=-2"] },
      { formula:"q=2(x+y)-1", values:"x=-2，y=5", answer:5, steps:["先把 x=-2、y=5 代入括號。","q=2(-2+5)-1","q=5"] },
      { formula:"R=\\frac{p+q}{3}", values:"p=-6，q=9", answer:1, steps:["把 p=-6、q=9 代入分子。","R=\\frac{-6+9}{3}","R=1"] },
    ]; const item = items[randomInt(0, items.length - 1, rng)];
    const target = item.formula.split("=")[0];
    return numericQuestion(4, "進階代入", `${item.formula}　${item.values}　求 ${target}`, item.answer, item.steps);
  }
  function generateLevel5(rng) {
    const items = [
      { text:"售賣 n 個禮盒的利潤 P 可用公式 P=80n-1500 計算。求售出 42 個禮盒的利潤。", formula:"P=80n-1500", values:"n=42", answer:1860, unit:"$", steps:["把 n=42 代入 P=80n-1500。","P=80(42)-1500","P=1860"] },
      { text:"電視機售貨員的月薪 S 可用公式 S=6500+350m 計算。若售出 40 部，求月薪。", formula:"S=6500+350m", values:"m=40", answer:20500, unit:"$", steps:["把 m=40 代入 S=6500+350m。","S=6500+350(40)","S=20500"] },
    ]; const item = items[randomInt(0, items.length - 1, rng)];
    return numericQuestion(5, "生活情境公式", `${item.text}　${item.formula}　${item.values}`, item.answer, item.steps, { unit:item.unit });
  }
  function generateLevel6(rng) {
    const items = [
      { text:"長方形的長為 a cm、闊為 b cm。若 a=6、b=8，求周界 P。", choices:["P=a+b","P=2(a+b)","P=ab"], answerFormula:"P=2(a+b)", answer:28, steps:["長方形有兩條長和兩條闊。","選擇 P=2(a+b)，再代入 a=6、b=8。","P=2(6+8)=28 cm"], unit:"cm" },
      { text:"菱形每邊長為 b cm。若 b=4，求周界 P。", choices:["P=2b","P=3b","P=4b"], answerFormula:"P=4b", answer:16, steps:["菱形有四條相等的邊。","選擇 P=4b，再代入 b=4。","P=4(4)=16 cm"], unit:"cm" },
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
