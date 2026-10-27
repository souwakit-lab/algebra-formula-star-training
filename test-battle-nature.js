const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
let calls = 0;
const gradient = { addColorStop(){} };
const context = new Proxy({}, {
  get(target,key) {
    if (key in target) return target[key];
    return (...args) => {
      calls++;
      for (const value of args) if (typeof value === "number") assert.ok(Number.isFinite(value), `${String(key)} has non-finite argument`);
      if (String(key).startsWith("create")) return gradient;
    };
  },
});
const sandbox = vm.createContext({});
const source = fs.readFileSync("battle.js","utf8").replace(
  "return { init, cancel, updateStatus, randomCast, castSkill, getSkills, enemyBreath, timings };",
  "return { testDraw(key,t,context){ ctx=context; drawArt(arts.find(a=>a.key===key),{x:100,y:400},{x:800,y:350},t,[]); }, testRandom(level){ let chosen; const realCast=cast; cast=art=>chosen=art.key; randomCast(0,45,level); cast=realCast; return chosen; } };"
);
vm.runInContext(source, sandbox);
sandbox.context = context;
for (const key of ["tide","heart","music","leaf","butterfly","snow","abyss","ultimate","aether","core"]) {
  for (let frame=0;frame<=100;frame++) vm.runInContext(`Battle.testDraw("${key}",${frame/100},context)`,sandbox);
}
assert.ok(calls > 10000);
for(let i=0;i<100;i++) {
  assert.ok(["tide","core"].includes(vm.runInContext("Battle.testRandom(1)",sandbox)));
  assert.ok(["tide","core","aether","abyss","music","ultimate"].includes(vm.runInContext("Battle.testRandom(5)",sandbox)));
}
console.log(`PASS: all ten effects exercised over 101 frames with finite canvas coordinates (${calls} operations).`);
