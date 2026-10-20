(() => {
  const core = window.SimplifyGameCore;
  const renderMath = (node, value) => window.RationalMathRenderer.render(node, String(value).replace(/\*/g, "\\times").replace(/[＋+]/g, "+").replace(/[−-]/g, "−"));
  const $ = (id) => document.getElementById(id);
  const levelTotal = core.LEVEL_XP;
  let level = 1; let questionNumber = 0; let score = 0; let streak = 0; let levelXp = 0; let mistakes = 0; let question; let entry = ""; let locked = false;
  const levels = core.LEVELS;
  const keyLayout = [
    ["7","8","9","a","b","c"], ["4","5","6","x","y","z"], ["1","2","3","m","n","p"], ["0","＋","−","×","÷","^"], ["(",")","⌫","清除","提交", ""]
  ];
  function makeKeypad() {
    const keypad = $("keypad");
    const requiredLetters = `${question.expression} ${question.answer}`.match(/[A-Za-z]/g) || [];
    const defaultLetters = keyLayout.flat().filter((key) => /^[a-z]$/.test(key));
    const letters = [...new Set([...requiredLetters, ...defaultLetters])];
    let letterIndex = 0;
    keypad.textContent = "";
    keyLayout.flat().forEach((key) => {
      if (/^[a-z]$/.test(key)) key = letters[letterIndex++];
      if (!key) { keypad.append(document.createElement("span")); return; }
      const button = document.createElement("button"); button.type = "button"; button.textContent = key; button.dataset.key = key;
      if (["＋","−","×","÷","(",")"].includes(key)) button.classList.add("operator");
      if (key === "^") button.classList.add("power");
      if (["⌫","清除"].includes(key)) button.classList.add("utility");
      if (key === "提交") { button.classList.add("submit"); button.disabled = true; button.dataset.action = "submit"; }
      keypad.append(button);
    });
  }
  function updateAnswer() {
    const node = $("answer"); node.textContent = ""; node.classList.toggle("empty", !entry);
    if (!entry) { const placeholder = document.createElement("span"); placeholder.textContent = "請輸入答案"; node.append(placeholder); }
    else renderMath(node, entry);
    const submit = $("keypad").querySelector(".submit"); submit.disabled = !entry || locked;
  }
  function setEntry(value) { if (locked) return; entry = value; updateAnswer(); }
  function handleKey(key) {
    if (locked) return;
    if (key === "⌫") return setEntry(entry.slice(0, -1));
    if (key === "清除") return setEntry("");
    if (key === "提交") return submitAnswer();
    setEntry(entry + ({"＋":"+","−":"-","×":"*","÷":"/"}[key] || key));
  }
  function updateMeta() {
    const info = levels[level]; $("level-label").textContent = `LEVEL ${level}`; $("level-title").textContent = info.title;
    $("question-type").textContent = info.title; $("mission-title").textContent = info.mission; $("mission-hint").textContent = info.hint;
    $("progress-copy").textContent = `${levelXp} / ${levelTotal} XP`; $("progress-bar").style.width = `${levelXp / levelTotal * 100}%`;
    $("progress-bar").parentElement.setAttribute("aria-valuenow", levelXp);
    [...document.querySelectorAll(".level-dots b")].forEach((node, index) => node.className = index + 1 < level ? "done" : index + 1 === level ? "active" : "");
    $("map").innerHTML = Object.entries(levels).map(([number, info]) => `<li class="${Number(number) < level ? "done" : Number(number) === level ? "active" : ""}"><b>0${number}</b><div><strong>${info.title}</strong><small>${info.mission}</small></div></li>`).join("");
  }
  function nextQuestion() {
    questionNumber += 1; question = core.generateQuestion(level); entry = ""; locked = false; makeKeypad(); updateMeta(); updateAnswer(); renderMath($("question"), question.expression);
    $("question-number").textContent = questionNumber; const feedback = $("feedback"); feedback.className = "feedback"; feedback.textContent = "";
  }
  function submitAnswer() {
    if (locked || !entry) return;
    let correct = false; try { correct = core.canonical(entry) === question.answer; } catch { correct = false; }
    locked = true; const feedback = $("feedback"); feedback.className = `feedback show ${correct ? "correct" : "wrong"}`;
    const result = core.applyResult({ level, xp:levelXp, score, streak, mistakes }, correct);
    ({ level, xp:levelXp, score, streak, mistakes } = result.progress);
    if (correct) feedback.innerHTML = `<strong>答對！化簡得很好。</strong><small>+15 XP　目前連勝 ${streak}${result.leveledUp ? "　已升到下一關" : ""}</small>`;
    else {
      const penalty = result.protectedPenalty ? "0 XP　連錯保護中" : "−10 XP";
      feedback.innerHTML = `<strong>再看清楚同類項及運算次序。</strong><small>${penalty}　參考答案</small><div class="solution"></div>`;
      renderMath(feedback.querySelector(".solution"), question.answer);
      if (result.protectionActive) {
        const message = document.createElement("small");
        message.textContent = "連錯 3 題後不再扣 XP，答對 1 題後恢復。";
        feedback.append(message);
      }
    }
    if (typeof Battle !== "undefined") {
      Battle.updateStatus({ combo:streak });
      if (correct) Battle.randomCast(streak, 15);
      else Battle.enemyBreath();
    }
    $("score").textContent = score; $("streak").textContent = streak; updateMeta(); updateAnswer();
    const submit = $("keypad").querySelector(".submit"); submit.disabled = true;
    if (result.completed) feedback.innerHTML += "<small>　六關完成！你已成為化簡術大師。</small>";
    else setTimeout(nextQuestion, correct ? 850 : 1200);
  }
  $("keypad").addEventListener("click", (event) => { const button = event.target.closest("button"); if (button) handleKey(button.dataset.action === "submit" ? "提交" : button.dataset.key); });
  document.addEventListener("keydown", (event) => {
    if (/^[0-9a-zA-Z()+\-*/^]$/.test(event.key)) { event.preventDefault(); handleKey(event.key.toLowerCase()); }
    else if (event.key === "Enter") submitAnswer(); else if (event.key === "Backspace") handleKey("⌫");
  });
  if (typeof Battle !== "undefined") Battle.init();
  updateMeta(); nextQuestion();
})();
