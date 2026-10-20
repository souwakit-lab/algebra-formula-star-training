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
  function question(level, expression, answer, hint) { return { level, type:LEVELS[level].title, expression, answer:canonical(answer), hint }; }
  function generateQuestion(level, rng = Math.random) {
    const pools = {
      1: [
        ["8a−a", "7a"], ["−3x＋6x", "3x"], ["6y−11y", "−5y"], ["4b＋2b", "6b"],
      ],
      2: [
        ["a＋2a＋3a＋4", "6a＋4"], ["m＋2n＋4m−3n", "5m−n"], ["2＋4p−p−p", "2＋2p"], ["−5p−9p＋3", "−14p＋3"],
      ],
      3: [
        ["3x×2−4x", "2x"], ["3w−8w÷2", "−w"], ["7x×3−x", "20x"], ["4×3y÷6", "2y"],
      ],
      4: [
        ["3a×2a×a", "6a^3"], ["4d×2d×d", "8d^3"], ["y×y×(−y)×(−y)×z", "y^4z"], ["b×(−b)×(−b)×c×(−c)", "−b^3c^2"],
      ],
      5: [
        ["12x÷4−x", "2x"], ["6p＋2p÷2×3", "9p"], ["−4q−7q", "−11q"], ["6u−12u−4v", "−6u−4v"],
      ],
      6: [
        ["2a＋3b−a＋5b", "a＋8b"], ["8m÷2＋3m−m", "6m"], ["2x×x＋3x^2−x^2", "4x^2"], ["−2p×3＋p＋4p", "−p"],
      ],
    };
    const item = pools[Math.min(6, Math.max(1, Number(level) || 1))][rand(rng, pools[level].length)];
    return question(level, item[0], item[1], LEVELS[level].hint);
  }
  return { LEVELS, normalizeInput, parsePolynomial, canonical, display, generateQuestion };
});
