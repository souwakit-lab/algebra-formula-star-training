(function attachCore(root, factory) {
  const FractionClass = typeof module !== "undefined" && module.exports ? require("./vendor/fraction.min.js") : root.Fraction;
  const api = factory(FractionClass);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.GeneralTermGameCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createCore(FractionClass) {
  const LEVEL_XP = Object.freeze({ 1:500, 2:500, 3:500, 4:500, 5:500 });
  const getLevelXp = (level) => LEVEL_XP[Math.min(5, Math.max(1, Number(level) || 1))];
  const randomInt = (min, max, rng) => Math.floor(rng() * (max - min + 1)) + min;

  function fractionTex(value) {
    const fraction = value instanceof FractionClass ? value : new FractionClass(value);
    const text = fraction.toFraction();
    const negative = text.startsWith("-");
    const unsigned = negative ? text.slice(1) : text;
    if (!unsigned.includes("/")) return `${negative ? "-" : ""}${unsigned}`;
    const [numerator, denominator] = unsigned.split("/");
    return `${negative ? "-" : ""}\\frac{${numerator}}{${denominator}}`;
  }

  function linearFormulaTex(a, b) {
    const leading = a === 1 ? "n" : a === -1 ? "-n" : `${a}n`;
    if (!b) return leading;
    return `${leading} ${b > 0 ? "+" : "-"} ${Math.abs(b)}`;
  }

  function linearSubstitutionTex(a, b, n) {
    const leading = a === 1 ? `(${n})` : a === -1 ? `-(${n})` : `${a}(${n})`;
    if (!b) return leading;
    return `${leading} ${b > 0 ? "+" : "-"} ${Math.abs(b)}`;
  }

  function numericQuestion(level, type, tex, answer, steps, extra = {}) {
    const value = answer instanceof FractionClass ? answer : new FractionClass(answer);
    return { level, type, tex, answer:value, answerTex:fractionTex(value), steps, inputKind:"number", ...extra };
  }

  function generateLevel1(rng) {
    const a = randomInt(2, 9, rng);
    const b = randomInt(-9, 8, rng);
    const n = randomInt(2, 12, rng);
    const answer = a * n + b;
    const formula = linearFormulaTex(a, b);
    return numericQuestion(1, "直接代入", `T_n = ${formula}\\qquad 求\\ T_{${n}}`, answer, [
      `把 n=${n} 代入通項 T_n=${formula}。`,
      `T_{${n}}=${linearSubstitutionTex(a, b, n)}`,
      `T_{${n}}=${answer}`,
    ]);
  }

  function generateLevel2(rng) {
    const a = randomInt(2, 8, rng);
    const b = randomInt(-5, 12, rng);
    const n = randomInt(Math.max(3, Math.floor((b + 1) / a) + 1), 15, rng);
    const coefficient = rng() < .5 ? -a : a;
    const offset = coefficient < 0 ? b : -randomInt(a * n + 1, a * n + 12, rng);
    const answer = coefficient * n + offset;
    const formula = linearFormulaTex(coefficient, offset);
    return numericQuestion(2, "負數通項", `T_n = ${formula}\\qquad 求\\ T_{${n}}`, answer, [
      `把 n=${n} 代入，保留負號。`,
      `T_{${n}}=${linearSubstitutionTex(coefficient, offset, n)}`,
      `T_{${n}}=${answer}`,
    ]);
  }

  function generateLevel3(rng) {
    const p = randomInt(2, 12, rng);
    const q = randomInt(2, 6, rng);
    let n = randomInt(2, 12, rng);
    if (n === p) n = n === 12 ? 11 : n + 1;
    const answer = new FractionClass(p - n, q * n);
    return numericQuestion(3, "分數通項", `T_n = \\frac{${p}-n}{${q}n}\\qquad 求\\ T_{${n}}`, answer, [
      `把 n=${n} 同時代入分子和分母。`,
      `T_{${n}}=\\frac{${p}-${n}}{${q}(${n})}=\\frac{${p - n}}{${q * n}}`,
      `約至最簡：T_{${n}}=${fractionTex(answer)}`,
    ]);
  }

  function generateLevel4(rng) {
    const a = randomInt(2, 5, rng);
    const b = randomInt(1, 4, rng);
    const n = randomInt(7, 20, rng);
    const answer = a * n + b;
    const formula = linearFormulaTex(a, b);
    const patternCounts = [1,2,3,4].map((index) => a * index + b);
    return numericQuestion(4, "圖案通項", `第 n 個圖案有\\ T_n=${formula}\\ 個圓點，求第\\ ${n}\\ 個圖案`, answer, [
      `題目已給通項 T_n=${formula}。`,
      `代入 n=${n}：T_{${n}}=${linearSubstitutionTex(a, b, n)}`,
      `第 ${n} 個圖案有 ${answer} 個圓點。`,
    ], { patternCounts });
  }

  function generateLevel5(rng) {
    const a = randomInt(2, 6, rng);
    const b = randomInt(1, 7, rng);
    const exists = rng() < .5;
    const n = randomInt(8, 24, rng);
    let target = a * n + b;
    if (!exists) target += randomInt(1, a - 1, rng);
    const quotient = new FractionClass(target - b, a);
    const formula = linearFormulaTex(a, b);
    const answerTex = exists ? `\\text{有，}n=${n}` : "\\text{沒有}";
    const steps = exists ? [
      `令 T_n=${target}：${formula}=${target}。`,
      `${a}n=${target - b}，所以 n=${n}。`,
      `n=${n} 是正整數，因此第 ${n} 項等於 ${target}。`,
    ] : [
      `令 T_n=${target}：${formula}=${target}。`,
      `${a}n=${target - b}，所以 n=${fractionTex(quotient)}。`,
      `n 不是正整數，因此沒有任何一項等於 ${target}。`,
    ];
    return { level:5, type:"項目判斷", tex:`T_n=${formula}\\qquad 數列中有沒有一項等於\\ ${target}？`, answer:exists, answerTex, steps, inputKind:"boolean" };
  }

  function generateQuestion(level, rng = Math.random) {
    const safeLevel = Math.min(5, Math.max(1, Number(level) || 1));
    if (safeLevel === 1) return generateLevel1(rng);
    if (safeLevel === 2) return generateLevel2(rng);
    if (safeLevel === 3) return generateLevel3(rng);
    if (safeLevel === 4) return generateLevel4(rng);
    return generateLevel5(rng);
  }

  function parseAnswer(input) {
    const text = String(input ?? "").trim();
    if (!/^-?(?:\d+|\d+\.\d+|\d+\/\d+)$/.test(text)) return null;
    try {
      const parsed = new FractionClass(text);
      return Number.isFinite(parsed.valueOf()) ? parsed : null;
    } catch { return null; }
  }

  function isAnswerCorrect(input, expected) {
    if (typeof expected === "boolean") return input === expected;
    const parsed = parseAnswer(input);
    if (!parsed || !parsed.equals(expected)) return false;
    if (!String(input).includes("/")) return true;
    const [numerator, denominator] = String(input).replace("-", "").split("/").map(Number);
    const gcd = (a,b) => b ? gcd(b, a % b) : a;
    return denominator > 0 && gcd(numerator, denominator) === 1 && denominator !== 1;
  }

  function applyResult(progress, correct) {
    const next = { ...progress };
    const target = getLevelXp(next.level);
    next.total = Number(next.total || 0) + 1;
    next.correct = Number(next.correct || 0) + (correct ? 1 : 0);
    next.streak = correct ? Number(next.streak || 0) + 1 : 0;
    next.xp = Math.max(0, Number(next.xp || 0) + (correct ? 15 : -10));
    let leveledUp = false;
    let completed = false;
    if (next.xp >= target) {
      if (next.level < 5) { next.xp -= target; next.level += 1; leveledUp = true; }
      else { next.xp = target; completed = true; }
    }
    return { progress:next, leveledUp, completed };
  }

  return { LEVEL_XP, getLevelXp, generateQuestion, parseAnswer, isAnswerCorrect, fractionTex, applyResult, linearFormulaTex };
});
