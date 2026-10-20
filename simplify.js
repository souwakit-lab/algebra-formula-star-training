(() => {
  const core = window.SimplifyGameCore;
  const renderMath = (node, value) => window.RationalMathRenderer.render(node, String(value).replace(/\*/g, "\\times").replace(/[＋+]/g, "+").replace(/[−-]/g, "−"));
  const $ = (id) => document.getElementById(id);
  const levelTotal = core.LEVEL_XP;
  const STORAGE_KEY = "algebra-simplify-star-training-v1";
  const studentDB = {
    SG1A: { 1:"歐陽周政",2:"歐芷菱",3:"蔡銀杰",4:"陳俊希",5:"陳炯文",6:"陳宇恆",7:"陳柏豪",8:"卓莉珊",9:"莊超穎",10:"鍾欣澄",11:"馮子軒",12:"黃鈞亮",13:"林立",14:"李振豪",15:"李梓琪",16:"李沁穎",17:"李宇杰",18:"梁依靜",19:"梁羽盈",20:"盧佩辰",21:"黃夢琪",22:"趙家美",23:"歐陽浩賢",24:"陳家莉",25:"歐承澔",26:"張子茵",27:"徐希瑜",28:"邢嘉豪",29:"楊昊宇",30:"邱嘉成",31:"郭添滿",32:"王思淇",33:"黃鈺裕",34:"黃健樺" },
    SG1B: { 1:"陳  毅",2:"曾蔚喬",3:"鄭凱琳",4:"陳思如",5:"程家儀",6:"張芯然",7:"蔡朗然",8:"董詩予",9:"馮家宥",10:"管梓皓",11:"黎芷盈",12:"劉德偉",13:"李善婷",14:"李雅琪",15:"凌寶旋",16:"吳靖怡",17:"宋允曦",18:"譚梓軒",19:"譚詩敏",20:"袁渟欣",21:"曾凱龍",22:"鄭家林",23:"張昊臻",24:"何家浩",25:"陳梓峰",26:"林灝晴",27:"林文軒",28:"梁王恩",30:"盧家豪",31:"勞允睿",32:"勞允堤",33:"黃曉樂",34:"王敬興" },
  };
  let player = null;
  let level = 1; let questionNumber = 0; let score = 0; let streak = 0; let levelXp = 0; let mistakes = 0; let question; let entry = ""; let locked = true;
  const levels = core.LEVELS;
  const keyLayout = [
    ["7","8","9","a","b","c"], ["4","5","6","x","y","z"], ["1","2","3","m","n","p"], ["0","＋","−","×","÷","^"], ["(",")","⌫","清除","提交", ""]
  ];
  function storageKey() { return `${STORAGE_KEY}:${player.className}:${player.id}`; }
  function saveProgress() {
    if (!player) return;
    localStorage.setItem(storageKey(), JSON.stringify({ level, score, streak, levelXp, mistakes, questionNumber }));
  }
  function loadProgress() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey())) || {};
      level = Math.min(6, Math.max(1, Number(saved.level) || 1)); score = Math.max(0, Number(saved.score) || 0);
      streak = Math.max(0, Number(saved.streak) || 0); levelXp = Math.min(levelTotal, Math.max(0, Number(saved.levelXp) || 0));
      mistakes = Math.max(0, Number(saved.mistakes) || 0); questionNumber = Math.max(0, Number(saved.questionNumber) || 0);
    } catch { level = 1; questionNumber = 0; score = 0; streak = 0; levelXp = 0; mistakes = 0; }
  }
  function populateLogin() {
    Object.keys(studentDB).forEach((className) => $("class-select").add(new Option(className, className)));
    updateIdOptions(); updateStudentPreview();
  }
  function updateIdOptions() {
    const select = $("id-select"); const oldId = select.value; select.innerHTML = "";
    Object.keys(studentDB[$("class-select").value] || {}).forEach((id) => select.add(new Option(`${id} 號`, id)));
    if ([...select.options].some((option) => option.value === oldId)) select.value = oldId;
  }
  function updateStudentPreview() { $("student-name-display").textContent = studentDB[$("class-select").value]?.[$("id-select").value] || "請選擇班別與學號"; }
  function login() {
    const className = $("class-select").value; const id = Number($("id-select").value); const name = studentDB[className]?.[id];
    if (!name) return;
    player = { className, id, name }; loadProgress(); locked = false;
    $("player-class").textContent = `${className} ${id} 號`; $("player-name").textContent = name;
    $("login-screen").classList.add("hidden"); $("game-shell").classList.remove("hidden"); $("game-shell").setAttribute("aria-hidden", "false");
    nextQuestion();
  }
  function logout() {
    saveProgress(); player = null; locked = true;
    $("game-shell").classList.add("hidden"); $("game-shell").setAttribute("aria-hidden", "true"); $("login-screen").classList.remove("hidden");
  }
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
    saveProgress();
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
  $("class-select").addEventListener("change", () => { updateIdOptions(); updateStudentPreview(); });
  $("id-select").addEventListener("change", updateStudentPreview);
  $("login-button").addEventListener("click", login);
  $("logout-button").addEventListener("click", logout);
  $("keypad").addEventListener("click", (event) => { const button = event.target.closest("button"); if (button) handleKey(button.dataset.action === "submit" ? "提交" : button.dataset.key); });
  document.addEventListener("keydown", (event) => {
    if (/^[0-9a-zA-Z()+\-*/^]$/.test(event.key)) { event.preventDefault(); handleKey(event.key.toLowerCase()); }
    else if (event.key === "Enter") submitAnswer(); else if (event.key === "Backspace") handleKey("⌫");
  });
  if (typeof Battle !== "undefined") Battle.init();
  populateLogin();
})();
