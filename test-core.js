const assert = require("node:assert/strict");
const core = require("./game-core");

function seeded(seed) { let state = seed >>> 0; return () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 0x100000000; }; }

assert.deepEqual(core.LEVEL_XP, { 1:150, 2:150, 3:150, 4:150, 5:150, 6:150 });
for (let level = 1; level <= 6; level += 1) {
  const rng = seeded(2030 + level);
  for (let index = 0; index < 100; index += 1) {
    const item = core.generateQuestion(level, rng);
    assert.equal(item.level, level);
    assert.ok(item.type && item.tex && Array.isArray(item.steps) && item.steps.length === 3);
    if (level === 1) {
      assert.equal(item.inputKind, "choice");
      assert.ok(item.choices.includes(item.answer));
    } else if (level === 6) {
      assert.equal(item.inputKind, "formula-number");
      assert.ok(item.choices.includes(item.answerFormula));
      assert.equal(core.isAnswerCorrect(item.answer.toFraction(), item.answer), true);
    } else {
      assert.equal(item.inputKind, "number");
      assert.ok(Number.isFinite(item.answer.valueOf()));
      assert.equal(core.isAnswerCorrect(item.answer.toFraction(), item.answer), true);
    }
    if (level === 2) assert.ok(!item.tex.includes("(-"));
    if (level === 4) assert.ok(item.tex.includes("-") || item.tex.includes("/"));
  }
}

assert.equal(core.parseAnswer("-1/6").toFraction(), "-1/6");
assert.equal(core.isAnswerCorrect("2/4", core.parseAnswer("1/2")), false);
assert.equal(core.isAnswerCorrect("0.5", core.parseAnswer("1/2")), true);

let result = core.applyResult({ level:1, xp:135, total:0, correct:0, streak:0, mistakes:0 }, true);
assert.equal(result.leveledUp, true);
assert.equal(result.progress.level, 2);
assert.equal(result.progress.xp, 0);
result = core.applyResult({ level:1, xp:30, total:0, correct:0, streak:0, mistakes:3 }, false);
assert.equal(result.xpChange, 0);
assert.equal(result.protectedPenalty, true);
assert.equal(result.progress.xp, 30);
result = core.applyResult({ level:1, xp:30, total:0, correct:0, streak:0, mistakes:3 }, true);
assert.equal(result.progress.mistakes, 0);

console.log("All formula substitution core tests passed.");
