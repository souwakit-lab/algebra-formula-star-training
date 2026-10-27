const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
for (const file of ["dashboard.js","simplify-dashboard.js","nth-term-dashboard.js"]) {
  const nodes = {};
  function node(){return {textContent:"",innerHTML:"",style:{},value:""};}
  const sandbox=vm.createContext({window:{},console,document:{
    addEventListener(){},getElementById(id){return nodes[id] ||= node();},
    createElement(){let text="";return {set textContent(value){text=String(value);},get innerHTML(){return text.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");}};}
  }});
  vm.runInContext(fs.readFileSync(file,"utf8"),sandbox);
  sandbox.sample={players:[
    {className:"SG1A",id:1,name:"測試甲",level:1,xp:15,total:20,correct:6,accuracy:.3,streak:1},
    {className:"SG1A",id:2,name:"測試乙",level:2,xp:15,total:10,correct:9,accuracy:.9,streak:3},
    {className:"SG1B",id:3,name:"測試丙",level:3,xp:15,total:30,correct:9,accuracy:.3,streak:2},
    {className:"SG1B",id:4,name:"<測試>",level:1,xp:0,total:0,correct:0,accuracy:0,streak:0}
  ],bossHp:200000,bossMaxHp:300000,levelStats:[]};
  vm.runInContext("renderDashboard(sample)",sandbox);
  const ranking=nodes["correct-list"].innerHTML;
  assert.ok(ranking.indexOf("測試乙")<ranking.indexOf("測試丙"));
  assert.ok(ranking.indexOf("測試丙")<ranking.indexOf("測試甲"));
  assert.ok(ranking.includes("9 題") && ranking.includes("&lt;測試&gt;"));
  assert.equal(nodes["tier-1-count"].textContent,2);
  assert.equal(nodes["stat-players"].textContent,4);
  vm.runInContext("renderDashboard({players:[],levelStats:[],bossHp:300000,bossMaxHp:300000})",sandbox);
  assert.ok(nodes["correct-list"].innerHTML.includes("尚未有學生數據"));
}
for (const html of ["dashboard.html","simplify-dashboard.html","nth-term-dashboard.html"]) {
  const source=fs.readFileSync(html,"utf8");
  assert.ok(source.includes('id="correct-list"'));
  assert.ok(source.includes("dashboard-focus.js?v=20261027b"));
  assert.ok(source.includes("dashboard-focus.css?v=20261027b"));
}
console.log("PASS: all three dashboards: correct-answer ranking, ties, escaped names, tier counts, empty data, modal assets.");
