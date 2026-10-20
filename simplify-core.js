(function attachSimplifyCore(root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.SimplifyGameCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createSimplifyCore() {
  const LEVELS = Object.freeze({
    1: { title:"合併同類項", mission:"認出相同的未知數及指數", hint:"只合併同類項，常數項要保留。" },
    2: { title:"多未知數及常數", mission:"整理多組同類項", hint:"按未知數分類，再合併各組係數。" },
    3: { title:"乘除後合併", mission:"先做乘除，再合併同類項", hint:"遵守先乘除、後加減的運算次序。" },
    4: { title:"乘方與重複相乘", mission:"把重複相乘寫成指數", hint:"相同未知數相乘時，指數會累加。" },
    5: { title:"負號與混合運算", mission:"處理負號及多項混合式", hint:"小心負號，並按運算次序逐步整理。" },
    6: { title:"綜合化簡", mission:"完成多步驟代數式化簡", hint:"先處理乘除及乘方，最後合併同類項。" },
  });

  const rand = (rng, max) => Math.floor(rng() * max);
  const gcd = (a, b) => {
    a = Math.abs(a); b = Math.abs(b);
    while (b) [a, b] = [b, a % b];
    return a || 1;
  };
  function fraction(n, d = 1) {
    if (!d) throw new Error("zero denominator");
    if (d < 0) { n = -n; d = -d; }
    const g = gcd(n, d); return { n:n / g, d:d / g };
  }
  const add = (a, b) => fraction(a.n * b.d + b.n * a.d, a.d * b.d);
  const multiply = (a, b) => fraction(a.n * b.n, a.d * b.d);
  const divide = (a, b) => fraction(a.n * b.d, a.d * b.n);

  function normalizeInput(value) {
    return String(value || "")
      .replace(/[\s·]/g, "")
      .replace(/[×✕]/g, "*")
      .replace(/[÷]/g, "/")
      .replace(/[＋]/g, "+")
      .replace(/[−–]/g, "-")
      .replace(/²/g, "^2")
      .replace(/³/g, "^3")
      .replace(/⁴/g, "^4");
  }
  function stripOuter(value) {
    let text = value;
    while (text.startsWith("(") && text.endsWith(")")) {
      let depth = 0; let closesAtEnd = true;
      for (let i = 0; i < text.length; i += 1) {
        if (text[i] === "(") depth += 1;
        if (text[i] === ")") depth -= 1;
        if (depth === 0 && i < text.length - 1) { closesAtEnd = false; break; }
      }
      if (!closesAtEnd) break;
      text = text.slice(1, -1);
    }
    return text;
  }
  function splitTopLevel(text, operators) {
    const parts = []; let start = 0; let depth = 0;
    for (let i = 0; i < text.length; i += 1) {
      if (text[i] === "(") depth += 1;
      else if (text[i] === ")") depth -= 1;
      else if (!depth && operators.includes(text[i]) && i > start) {
        parts.push(text.slice(start, i)); parts.push(text[i]); start = i + 1;
      }
    }
    parts.push(text.slice(start));
    return parts;
  }
  function parseMonomial(value) {
    let text = stripOuter(value); let sign = 1;
    if (text.startsWith("+")) text = text.slice(1);
    if (text.startsWith("-")) { sign = -1; text = text.slice(1); }
    if (!text) throw new Error("empty term");
    let coefficient = fraction(sign); const variables = {};
    let index = 0; let foundFactor = false;
    while (index < text.length) {
      if (text[index] === "*") { index += 1; continue; }
      if (text[index] === "/") {
        const match = text.slice(index + 1).match(/^\d+(?:\.\d+)?/);
        if (!match) throw new Error("unsupported division");
        coefficient = divide(coefficient, fraction(Number(match[0])));
        index += 1 + match[0].length; foundFactor = true; continue;
      }
      const number = text.slice(index).match(/^\d+(?:\.\d+)?/);
      if (number) {
        const [whole, decimal] = number[0].split(".");
        const denominator = decimal ? 10 ** decimal.length : 1;
        coefficient = multiply(coefficient, fraction(Number(`${whole}${decimal || ""}`), denominator));
        index += number[0].length; foundFactor = true; continue;
      }
      const variable = text[index].match(/[A-Za-z]/);
      if (variable) {
        const name = variable[0]; index += 1; let exponent = 1;
        if (text[index] === "^") {
          const power = text.slice(index + 1).match(/^\d+/);
          if (!power) throw new Error("bad exponent");
          exponent = Number(power[0]); index += 1 + power[0].length;
        }
        variables[name] = (variables[name] || 0) + exponent; foundFactor = true; continue;
      }
      throw new Error(`bad character ${text[index]}`);
    }
    if (!foundFactor) throw new Error("empty monomial");
    return { coefficient, variables };
  }
  function multiplyMonomial(a, b) {
    const variables = { ...a.variables };
    Object.entries(b.variables).forEach(([name, power]) => { variables[name] = (variables[name] || 0) + power; });
    return { coefficient:multiply(a.coefficient, b.coefficient), variables };
  }
  function divideMonomial(a, b) {
    if (Object.keys(b.variables).length) throw new Error("variable denominator");
    return { coefficient:divide(a.coefficient, b.coefficient), variables:{ ...a.variables } };
  }
  function monomialKey(variables) {
    return Object.entries(variables).filter(([, power]) => power).sort(([a], [b]) => a.localeCompare(b)).map(([name, power]) => `${name}^${power}`).join("*");
  }
  function parseTerm(value) {
    const parts = splitTopLevel(value, "*/"); let current = parseMonomial(parts[0]);
    for (let i = 1; i < parts.length; i += 2) {
      const next = parseMonomial(parts[i + 1]);
      current = parts[i] === "/" ? divideMonomial(current, next) : multiplyMonomial(current, next);
    }
    return current;
  }
  function parsePolynomial(value) {
    const text = stripOuter(normalizeInput(value));
    if (!text) throw new Error("empty expression");
    const parts = splitTopLevel(text, "+-"); const terms = new Map(); let sign = 1;
    for (const part of parts) {
      if (part === "+") { sign = 1; continue; }
      if (part === "-") { sign = -1; continue; }
      const monomial = parseTerm(part); monomial.coefficient = multiply(monomial.coefficient, fraction(sign)); sign = 1;
      const key = monomialKey(monomial.variables); const previous = terms.get(key);
      terms.set(key, previous ? add(previous, monomial.coefficient) : monomial.coefficient);
    }
    return terms;
  }
  function formatPolynomial(terms) {
    const records = [...terms.entries()].filter(([, value]) => value.n !== 0).map(([key, coefficient]) => ({ key, coefficient }));
    records.sort((a, b) => a.key.localeCompare(b.key));
    if (!records.length) return "0";
    return records.map(({ key, coefficient }, index) => {
      const variables = key.split("*").filter(Boolean).map((part) => { const [name, power] = part.split("^"); return `${name}${power === "1" ? "" : `^${power}`}`; }).join("");
      const absolute = fraction(Math.abs(coefficient.n), coefficient.d);
      const coefficientText = absolute.d === 1 ? String(absolute.n) : `${absolute.n}/${absolute.d}`;
      const number = variables && coefficientText === "1" ? "" : coefficientText;
      const body = `${number}${variables}`;
      if (index === 0) return coefficient.n < 0 ? `-${body}` : body;
      return coefficient.n < 0 ? `-${body}` : `+${body}`;
    }).join("");
  }
  function canonical(value) { return formatPolynomial(parsePolynomial(value)); }
  function display(value) { return canonical(value).replace(/\^2/g, "²").replace(/\^3/g, "³").replace(/\^4/g, "⁴").replace(/\*/g, "×").replace(/\//g, "÷").replace(/-/g, "−").replace(/\+/g, "＋"); }
  function formatCoefficients(value) {
    return String(value).replace(/(^|[+＋\-−=(（×*，,\s])1(?=[A-Za-z])/g, "$1");
  }
  function question(level, expression, answer, hint) { return { level, type:LEVELS[level].title, expression:formatCoefficients(expression), answer:canonical(answer), hint }; }
  function generateQuestion(level, rng = Math.random) {
    const safeLevel = Math.min(6, Math.max(1, Number(level) || 1));
    const number = (min, max) => min + rand(rng, max - min + 1);
    const nonZero = (min = -10, max = 10) => { let value = 0; while (!value) value = number(min, max); return value; };
    const variable = ["a", "b", "m", "n", "p", "c", "x", "y", "z"][rand(rng, 9)];
    const secondVariable = variable === "x" ? "y" : "x";
    const signed = (value) => value >= 0 ? `＋${value}` : `${value}`;
    let expression;
    if (safeLevel === 1) {
      const a = nonZero(-10, 10); const b = nonZero(-10, 10);
      expression = `${a}${variable}${signed(b)}${variable}`;
    } else if (safeLevel === 2) {
      const a = nonZero(-10, 10); const b = nonZero(-10, 10); const c = number(-20, 20);
      const repeated = nonZero(-10, 10);
      expression = `${a}${variable}${signed(b)}${secondVariable}${signed(repeated)}${variable}${signed(c)}`;
    } else if (safeLevel === 3) {
      const a = nonZero(-10, 10); const b = number(1, 12); const multiplier = number(2, 5);
      const divisor = number(2, 5); const quotientFactor = nonZero(-4, 4); const divisibleTerm = divisor * quotientFactor;
      expression = rand(rng, 2) ? `${a}${variable}×${multiplier}${signed(-b)}${variable}` : `${a}${variable}${signed(divisibleTerm)}${variable}÷${divisor}`;
    } else if (safeLevel === 4) {
      const a = number(2, 5); const b = number(2, 5); const powerVariable = variable;
      expression = rand(rng, 2) ? `${a}${powerVariable}×${b}${powerVariable}×${powerVariable}` : `${powerVariable}×${powerVariable}×(−${powerVariable})×(−${powerVariable})×${secondVariable}`;
    } else if (safeLevel === 5) {
      const a = nonZero(-10, 10); const divisor = number(2, 5); const quotientFactor = nonZero(-4, 4); const divided = divisor * quotientFactor;
      if (rand(rng, 3) === 0) expression = `${a}${variable}−${Math.abs(divided)}${variable}÷${divisor}`;
      else if (rand(rng, 2)) expression = `${a}${variable}${signed(divided)}${variable}÷${divisor}×${number(2, 4)}`;
      else expression = `${a}${variable}−${number(1, 10)}${variable}−${number(1, 10)}${secondVariable}`;
    } else {
      const a = nonZero(-10, 10); const b = nonZero(-10, 10); const c = nonZero(-10, 10); const divisor = number(2, 5);
      if (rand(rng, 3) === 0) expression = `${a}${variable}×${variable}${signed(b)}${variable}^2${signed(-c)}${variable}^2`;
      else if (rand(rng, 2)) expression = `${a}${variable}^2÷${divisor}${signed(b)}${variable}^2${signed(-c)}${variable}^2`;
      else expression = `${a}${variable}×${number(2, 4)}${signed(b)}${secondVariable}${signed(-c)}${variable}${signed(number(-10, 10))}`;
    }
    return question(safeLevel, expression, expression, LEVELS[safeLevel].hint);
  }
  const LEVEL_XP = 150;
  function applyResult(progress, correct) {
    const next = { ...progress };
    next.mistakes = correct ? 0 : Number(next.mistakes || 0) + 1;
    next.streak = correct ? Number(next.streak || 0) + 1 : 0;
    const protectedPenalty = !correct && next.mistakes > 3;
    const xpChange = correct ? 15 : protectedPenalty ? 0 : -10;
    next.xp = Math.max(0, Number(next.xp || 0) + xpChange);
    next.score = Math.max(0, Number(next.score || 0) + xpChange);
    const leveledUp = next.xp >= LEVEL_XP && next.level < 6;
    const completed = next.xp >= LEVEL_XP && next.level === 6;
    if (leveledUp) { next.xp -= LEVEL_XP; next.level += 1; }
    if (completed) next.xp = LEVEL_XP;
    return { progress:next, xpChange, protectedPenalty, leveledUp, completed, protectionActive:next.mistakes >= 3 };
  }
  return { LEVELS, LEVEL_XP, applyResult, normalizeInput, parsePolynomial, canonical, display, formatCoefficients, generateQuestion };
});
