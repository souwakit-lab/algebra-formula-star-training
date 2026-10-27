const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const core = require("./nth-term-core.js");

for (let i = 0; i < 2000; i++) {
  const q = core.generateQuestion(4);
  assert.equal(q.template, "constantDenominator");
  assert.match(q.formula, /^\\frac\{n[+-]\d+\}\{[2-9]\}$/);
  assert.equal(q.answer.valueOf(), (q.n + q.parameters.b) / q.parameters.a);
  assert.ok(Math.abs(q.answer.valueOf()) <= 100);
  assert.ok(!q.steps.join("").includes("undefined"));
}

const nodes = {};
function element() {
  return { dataset:{}, classList:{toggle(){}}, style:{setProperty(){}}, attributes:{},
    setAttribute(key,value){ this.attributes[key] = value; },
    replaceChildren(...children){ this.children = children; } };
}
const sandbox = vm.createContext({
  window:{NthTermGameCore:core, addEventListener(){}}, console, setInterval(){},
  document:{getElementById(id){ return nodes[id] ||= element(); }, createElement:element, addEventListener(){}},
});
vm.runInContext(fs.readFileSync("battle.js", "utf8"), sandbox);
// Skip initialization: exercise the real selection rendering without browser/network state.
vm.runInContext(fs.readFileSync("nth-term.js", "utf8").replace(/\binit\(\);\s*$/, ""), sandbox);
for (const level of [1,2,3,4,5]) {
  vm.runInContext(`progress.level=${level}; locked=false; renderSkills();`, sandbox);
  assert.equal(nodes["skill-list"].children.filter(b => !b.disabled).length, level * 2);
  assert.equal(nodes["skill-list"].children.length, 10);
  assert.ok(nodes["skill-list"].children.every(b => b.children[0].textContent));
}
assert.deepEqual(Array.from(vm.runInContext('Battle.getSkills(5).map(s=>s.key)',sandbox)), ["tide","heart","music","leaf","butterfly","snow","abyss","ultimate","aether","core"]);
vm.runInContext('progress.level=4; selectedSkill="abyss"; renderSkills();', sandbox);
assert.equal(nodes["skill-list"].children.find(b => b.attributes["aria-pressed"] === "true").dataset.skill, "abyss");
// Level-up result must not expose new skills during the previous question's feedback.
vm.runInContext('question={level:1}; progress.level=2; locked=true; selectedSkill="heart"; renderSkills();', sandbox);
assert.ok(nodes["skill-list"].children.every(b => b.disabled));
assert.equal(vm.runInContext('Battle.getSkills(question.level).filter(s => s.unlocked).length', sandbox), 2);
assert.equal(vm.runInContext('Battle.castSkill("ultimate",0,45,1)', sandbox), false);
assert.equal(vm.runInContext('Battle.castSkill("unknown",0,45,5)', sandbox), false);
// The attack uses the selected key and the answered question's level, not randomCast.
vm.runInContext('Battle.castSkill=(...args)=>window.lastCast=args; playBattleAnimation(true);', sandbox);
assert.deepEqual(Array.from(sandbox.window.lastCast), ["heart",0,45,1]);
assert.equal(fs.readFileSync("battle.js","utf8"), fs.readFileSync("dist/battle.js","utf8"));
console.log("PASS: Lv.4 arithmetic; skills 2/4/6/8/10 with icons; selection; locked answers; level-up boundary; chosen attack; dist parity.");
