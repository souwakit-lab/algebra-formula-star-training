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
  "return { testDraw(key,t,context){ ctx=context; drawArt(arts.find(a=>a.key===key),{x:100,y:400},{x:800,y:350},t,[]); } };"
);
vm.runInContext(source, sandbox);
sandbox.context = context;
for (const key of ["heart","leaf","snow","butterfly"]) {
  for (let frame=0;frame<=100;frame++) vm.runInContext(`Battle.testDraw("${key}",${frame/100},context)`,sandbox);
}
assert.ok(calls > 10000);
console.log(`PASS: all four nature effects rendered 101 frames with finite canvas coordinates (${calls} operations).`);
