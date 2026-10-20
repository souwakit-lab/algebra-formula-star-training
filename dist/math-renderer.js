(function attachMathRenderer(root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.RationalMathRenderer = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createMathRenderer() {
  const COMMANDS = [
    ["\\qquad", "　　"], ["\\quad", "　"], ["\\times", "×"],
    ["\\div", "÷"], ["\\square", "□"], ["\\ ", " "],
  ];

  function readGroup(source, start) {
    if (source[start] !== "{") return { value:"", end:start };
    let depth = 0;
    for (let index = start; index < source.length; index += 1) {
      if (source[index] === "{") depth += 1;
      else if (source[index] === "}") {
        depth -= 1;
        if (!depth) return { value:source.slice(start + 1, index), end:index + 1 };
      }
    }
    return { value:source.slice(start + 1), end:source.length };
  }

  function cleanText(value) {
    return String(value || "").replace(/-/g, "−");
  }

  function tokenize(tex) {
    let source = String(tex || "").replace(/\\left/g, "").replace(/\\right/g, "");
    // Accept simple a/b notation as a fallback when a question source omits
    // the internal fraction marker.
    source = source.replace(/([A-Za-z0-9]+(?:[²³⁻⁺])?|\([^()]+\))\/([A-Za-z0-9]+(?:[²³⁻⁺])?|\([^()]+\))/g, "\\frac{$1}{$2}");
    const tokens = [];
    let buffer = "";
    let cursor = 0;
    const flush = () => {
      if (buffer) tokens.push({ type:"text", value:cleanText(buffer) });
      buffer = "";
    };

    while (cursor < source.length) {
      if (source.startsWith("\\frac", cursor) && source[cursor + 5] === "{") {
        flush();
        const numerator = readGroup(source, cursor + 5);
        const denominator = readGroup(source, numerator.end);
        tokens.push({ type:"fraction", numerator:plainText(numerator.value), denominator:plainText(denominator.value) });
        cursor = denominator.end;
        continue;
      }
      if (source.startsWith("\\text", cursor) && source[cursor + 5] === "{") {
        flush();
        const group = readGroup(source, cursor + 5);
        tokens.push({ type:"text", value:cleanText(group.value) });
        cursor = group.end;
        continue;
      }
      if (source[cursor] === "_") {
        flush();
        if (source[cursor + 1] === "{") {
          const group = readGroup(source, cursor + 1);
          tokens.push({ type:"subscript", value:cleanText(group.value) });
          cursor = group.end;
        } else {
          tokens.push({ type:"subscript", value:cleanText(source[cursor + 1] || "") });
          cursor += 2;
        }
        continue;
      }
      const command = COMMANDS.find(([needle]) => source.startsWith(needle, cursor));
      if (command) {
        buffer += command[1];
        cursor += command[0].length;
        continue;
      }
      if (source[cursor] === "\\") {
        cursor += 1;
        continue;
      }
      buffer += source[cursor];
      cursor += 1;
    }
    flush();
    return tokens;
  }

  function plainText(tex) {
    return tokenize(tex).map((token) => token.type === "fraction"
      ? `${token.numerator}/${token.denominator}`
      : token.value).join("");
  }

  function appendMathText(parent, value) {
    const source = String(value || "");
    for (let index = 0; index < source.length; index += 1) {
      const character = source[index];
      const next = source[index + 1];
      const isLetter = /[A-Za-z]/.test(character);
      const isNumber = /[0-9]/.test(character);
      const isOperator = "=+-−×÷()[]{}：:，,。/".includes(character);
      if (isLetter && (next === "²" || next === "³")) {
        const superscript = document.createElementNS("http://www.w3.org/1998/Math/MathML", "msup");
        const base = document.createElementNS("http://www.w3.org/1998/Math/MathML", "mi");
        const exponent = document.createElementNS("http://www.w3.org/1998/Math/MathML", "mn");
        base.textContent = character;
        exponent.textContent = next === "²" ? "2" : "3";
        superscript.append(base, exponent);
        parent.append(superscript);
        index += 1;
      } else {
        const tag = isLetter ? "mi" : isNumber ? "mn" : isOperator ? "mo" : "mtext";
        const node = document.createElementNS("http://www.w3.org/1998/Math/MathML", tag);
        node.textContent = character;
        parent.append(node);
      }
    }
  }

  function render(element, tex) {
    const expression = document.createElement("span");
    expression.className = "math-expression";
    const math = document.createElementNS("http://www.w3.org/1998/Math/MathML", "math");
    math.setAttribute("display", "inline");
    const row = document.createElementNS("http://www.w3.org/1998/Math/MathML", "mrow");
    tokenize(tex).forEach((token) => {
      if (token.type === "text") {
        appendMathText(row, token.value);
        return;
      }
      if (token.type === "subscript") {
        const subscript = document.createElementNS("http://www.w3.org/1998/Math/MathML", "msub");
        const base = document.createElementNS("http://www.w3.org/1998/Math/MathML", "mi");
        const sub = document.createElementNS("http://www.w3.org/1998/Math/MathML", "mn");
        base.textContent = "_";
        sub.textContent = token.value;
        subscript.append(base, sub);
        row.append(subscript);
        return;
      }
      const fraction = document.createElementNS("http://www.w3.org/1998/Math/MathML", "mfrac");
      const numerator = document.createElementNS("http://www.w3.org/1998/Math/MathML", "mtext");
      const denominator = document.createElementNS("http://www.w3.org/1998/Math/MathML", "mtext");
      appendMathText(numerator, token.numerator);
      appendMathText(denominator, token.denominator);
      fraction.append(numerator, denominator);
      row.append(fraction);
    });
    math.append(row);
    expression.append(math);
    element.textContent = "";
    element.append(expression);
    element.setAttribute("aria-label", plainText(tex));
  }

  return { tokenize, plainText, render };
});
