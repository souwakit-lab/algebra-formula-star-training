const assert = require("node:assert/strict");
const core = require("./game-core");
const mathRenderer = require("./math-renderer");

function seeded(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

assert.deepEqual(core.LEVEL_XP, { 1:500, 2:500, 3:500, 4:500, 5:500 });
for (let level = 1; level <= 5; level += 1) {
  const rng = seeded(2030 + level);
  for (let index = 0; index < 1000; index += 1) {
    const item = core.generateQuestion(level, rng);
    assert.equal(item.level, level);
    assert.ok(item.type && item.tex && Array.isArray(item.steps) && item.steps.length === 3);
    if (level === 5) {
      assert.equal(item.inputKind, "boolean");
      assert.equal(typeof item.answer, "boolean");
      assert.equal(core.isAnswerCorrect(item.answer, item.answer), true);
      assert.equal(core.isAnswerCorrect(!item.answer, item.answer), false);
    } else {
      assert.equal(item.inputKind, "number");
      assert.ok(Number.isFinite(item.answer.valueOf()));
      assert.equal(core.isAnswerCorrect(item.answer.toFraction(), item.answer), true);
    }
    if (level === 2) assert.ok(item.answer.valueOf() < 0);
    if (level === 3) assert.ok(item.tex.includes("\\frac"));
    if (level === 4) assert.equal(item.patternCounts.length, 4);
  }
}

assert.equal(core.parseAnswer("-1/6").toFraction(), "-1/6");
assert.equal(core.isAnswerCorrect("2/4", core.parseAnswer("1/2")), false);
assert.equal(core.isAnswerCorrect("0.5", core.parseAnswer("1/2")), true);
assert.equal(mathRenderer.plainText("T_n=6n-2\\qquad 求\\ T_{11}"), "Tn=6n−2　　 求 T11");
assert.equal(mathRenderer.plainText("T_n=\\frac{2-n}{3n}"), "Tn=2−n/3n");
assert.equal(mathRenderer.plainText("\\text{有，}n=8"), "有，n=8");

let result = core.applyResult({ level:1, xp:485, total:0, correct:0, streak:0 }, true);
assert.equal(result.leveledUp, true);
assert.equal(result.progress.level, 2);
assert.equal(result.progress.xp, 0);
result = core.applyResult({ level:5, xp:495, total:0, correct:0, streak:0 }, true);
assert.equal(result.completed, true);
assert.equal(result.progress.xp, 500);

console.log("All general-term formula core tests passed.");
