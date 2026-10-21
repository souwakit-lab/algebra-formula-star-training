const STORAGE_KEY = "nth-term-star-training-v1";
const API_URL = window.NTH_TERM_CONFIG?.apiUrl || "";
const core = window.NthTermGameCore;
const mathRenderer = window.NthTermMathRenderer;
const ACCESS_PASSWORD_HASH = "0b3116c18e089621c175bdceb30ff91fed2a21e96fd899109dacdbf002397936";

const studentDB = {
  SG1A: { 1:"歐陽周政",2:"歐芷菱",3:"蔡銀杰",4:"陳俊希",5:"陳炯文",6:"陳宇恆",7:"陳柏豪",8:"卓莉珊",9:"莊超穎",10:"鍾欣澄",11:"馮子軒",12:"黃鈞亮",13:"林立",14:"李振豪",15:"李梓琪",16:"李沁穎",17:"李宇杰",18:"梁依靜",19:"梁羽盈",20:"盧佩辰",21:"黃夢琪",22:"趙家美",23:"歐陽浩賢",24:"陳家莉",25:"歐承澔",26:"張子茵",27:"徐希瑜",28:"邢嘉豪",29:"楊昊宇",30:"邱嘉成",31:"郭添滿",32:"王思淇",33:"黃鈺裕",34:"黃健樺" },
  SG1B: { 1:"陳  毅",2:"曾蔚喬",3:"鄭凱琳",4:"陳思如",5:"程家儀",6:"張芯然",7:"蔡朗然",8:"董詩予",9:"馮家宥",10:"管梓皓",11:"黎芷盈",12:"劉德偉",13:"李善婷",14:"李雅琪",15:"凌寶旋",16:"吳靖怡",17:"宋允曦",18:"譚梓軒",19:"譚詩敏",20:"袁渟欣",21:"曾凱龍",22:"鄭家林",23:"張昊臻",24:"何家浩",25:"陳梓峰",26:"林灝晴",27:"林文軒",28:"梁王恩",30:"盧家豪",31:"勞允睿",32:"勞允堤",33:"黃曉樂",34:"王敬興" },
};

const levelInfo = core.LEVELS;

let progress = defaultProgress();
let player = null;
let question;
let entry = "";
let selectedChoice = "";
let locked = false;
let questionNumber = 0;
let pendingAnswers = [];
let pendingDamage = 0;
let syncInFlight = false;
let syncQueued = false;
let pendingBatch = null;
let progressDirty = false;
let selectedStatsLevel = "all";
let studentExportCache = null;
let protectedAction = "";
let bossHp = 300000;
let bossMaxHp = 300000;
let recentQuestionKeys = Object.fromEntries([1,2,3,4,5].map((level) => [level, []]));

const $ = (id) => document.getElementById(id);

function defaultProgress() {
  return { level: 1, xp: 0, total: 0, correct: 0, streak: 0, mistakes: 0, mistakeHistory: [], levelStats: emptyLevelStats() };
}

function normalizeLevelProgress(raw) {
  const next = { ...raw };
  next.level = Math.min(5, Math.max(1, Number(next.level) || 1));
  next.xp = Math.max(0, Number(next.xp) || 0);
  while (next.level < 5 && next.xp >= core.getLevelXp(next.level)) {
    next.xp -= core.getLevelXp(next.level);
    next.level += 1;
  }
  if (next.level === 5) next.xp = Math.min(next.xp, core.getLevelXp(5));
  return next;
}

function emptyLevelStats() {
  return Object.fromEntries([1,2,3,4,5].map((level) => [level, { total:0, correct:0, streak:0 }]));
}

function normalizeLevelStats(raw) {
  const normalized = emptyLevelStats();
  [1,2,3,4,5].forEach((level) => {
    const item = Array.isArray(raw)
      ? raw.find((entry) => Number(entry.level) === level) || {}
      : raw?.[level] || {};
    normalized[level] = {
      total: Math.max(0, Number(item.total) || 0),
      correct: Math.max(0, Number(item.correct) || 0),
      streak: Math.max(0, Number(item.streak) || 0),
    };
  });
  return normalized;
}

function mergeLevelStats(localStats, remoteStats) {
  const local = normalizeLevelStats(localStats);
  const remote = normalizeLevelStats(remoteStats);
  [1,2,3,4,5].forEach((level) => {
    if (remote[level].total > local[level].total) local[level] = remote[level];
  });
  return local;
}

function playerStorageKey() {
  return `${STORAGE_KEY}:${player.className}:${player.id}`;
}

function loadProgress() {
  const fallback = defaultProgress();
  try {
    const saved = JSON.parse(localStorage.getItem(playerStorageKey()));
    pendingAnswers = saved?.syncOutbox?.answers || [];
    pendingBatch = saved?.syncOutbox?.batch || null;
    const { syncOutbox, ...storedProgress } = saved || {};
    return normalizeLevelProgress({ ...fallback, ...storedProgress, levelStats: normalizeLevelStats(saved?.levelStats) });
  } catch {
    return fallback;
  }
}

function saveProgress() {
  if (player) localStorage.setItem(playerStorageKey(), JSON.stringify({ ...progress, syncOutbox:{ answers:pendingAnswers, batch:pendingBatch } }));
}

function init() {
  populateLogin();
  if (!API_URL) $("sync-status").textContent = "本機練習";
  Battle.init();
  $("class-select").addEventListener("change", () => { updateIdOptions(); updateStudentPreview(); });
  $("id-select").addEventListener("change", updateStudentPreview);
  $("login-button").addEventListener("click", login);
  $("logout-button").addEventListener("click", () => openPasswordDialog("logout"));
  document.querySelectorAll("[data-key]").forEach((button) => button.addEventListener("click", () => appendDigit(button.dataset.key)));
  document.querySelector("[data-action='backspace']").addEventListener("click", backspace);
  document.querySelector("[data-action='clear']").addEventListener("click", clearEntry);
  document.querySelector("[data-action='fraction']").addEventListener("click", addFractionBar);
  document.querySelector("[data-action='decimal']").addEventListener("click", addDecimalPoint);
  document.querySelector("[data-action='sign']").addEventListener("click", toggleSign);
  $("submit-answer").addEventListener("click", submitAnswer);
  $("choice-answer").addEventListener("click", (event) => {
    const button = event.target.closest("[data-choice]");
    if (button) selectChoice(button.dataset.choice);
  });
  document.querySelectorAll("[data-stats-level]").forEach((button) => button.addEventListener("click", () => {
    selectedStatsLevel = button.dataset.statsLevel;
    renderStudentStats();
  }));
  $("continue-button").addEventListener("click", () => {
    $("level-dialog").close();
    nextQuestion();
  });
  $("reset-progress").addEventListener("click", () => openPasswordDialog("reset"));
  $("confirm-reset").addEventListener("click", resetProgress);
  $("password-form").addEventListener("submit", verifyProtectedAction);
  $("download-student-overall").addEventListener("click", downloadStudentOverall);
  $("download-student-mistakes").addEventListener("click", openMistakeViewer);
  $("close-mistake-dialog").addEventListener("click", () => $("mistake-dialog").close());
  document.addEventListener("keydown", handlePhysicalKeyboard);
  if (window.lucide) lucide.createIcons();
  else $("lucide-script")?.addEventListener("load", () => lucide.createIcons(), { once: true });
}

function populateLogin() {
  Object.keys(studentDB).forEach((className) => $("class-select").add(new Option(className, className)));
  updateIdOptions();
  updateStudentPreview();
}

function updateIdOptions() {
  const idSelect = $("id-select");
  const current = idSelect.value;
  idSelect.innerHTML = "";
  Object.keys(studentDB[$("class-select").value] || {}).forEach((id) => idSelect.add(new Option(`${id} 號`, id)));
  if ([...idSelect.options].some((option) => option.value === current)) idSelect.value = current;
}

function updateStudentPreview() {
  const className = $("class-select").value;
  const id = $("id-select").value;
  $("student-name-display").textContent = studentDB[className]?.[id] || "請選擇班別與學號";
}

function questionKey(item) {
  return item.key;
}

async function login() {
  const className = $("class-select").value;
  const id = Number($("id-select").value);
  const name = studentDB[className]?.[id];
  if (!name) return;
  player = { className, id, name };
  studentExportCache = null;
  progress = loadProgress();
  recentQuestionKeys = Object.fromEntries([1,2,3,4,5].map((level) => [level, []]));
  progressDirty = Boolean(pendingAnswers.length || pendingBatch);
  $("login-status").textContent = "";
  $("player-class").textContent = `${className} ${id} 號`;
  $("player-name").textContent = name;
  $("login-screen").classList.add("hidden");
  updateProgressUI();
  nextQuestion();
  await loadRemoteProgress(progress.total);
  scheduleSync();
}

async function loadRemoteProgress(localTotal) {
  if (!API_URL) return;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(`${API_URL}?action=loadNthTermPlayer&className=${encodeURIComponent(player.className)}&id=${player.id}&t=${Date.now()}`, { signal: controller.signal });
    if (!response.ok) throw new Error("Unable to load progress");
    const data = await response.json();
    if (data.ok === false || data.service) throw new Error(data.error || "服務未就緒");
    if (Number.isFinite(Number(data.bossHp))) bossHp = Number(data.bossHp);
    if (Number.isFinite(Number(data.bossMaxHp))) bossMaxHp = Number(data.bossMaxHp);
    progress.levelStats = mergeLevelStats(progress.levelStats, data.levelStats || data.player?.levelStats);
    saveProgress();
    renderStudentStats();
    if (!data.player || progressDirty || progress.total !== localTotal) return;
    if (Number(data.player.total || 0) < Number(progress.total || 0)) {
      return;
    }
    const previousLevel = progress.level;
    const localMistakeHistory = Array.isArray(progress.mistakeHistory) ? progress.mistakeHistory : [];
    progress = normalizeLevelProgress({ ...defaultProgress(), ...data.player, mistakeHistory:localMistakeHistory, levelStats: normalizeLevelStats(data.levelStats || data.player.levelStats) });
    saveProgress();
    updateProgressUI();
    if (progress.level !== previousLevel) {
      questionNumber = 0;
      nextQuestion();
    }
  } catch (error) {
    if (error.name !== "AbortError") console.warn("Remote progress unavailable", error);
  } finally {
    window.clearTimeout(timeout);
  }
}

function nextQuestion() {
  Battle.cancel();
  locked = false;
  entry = "";
  selectedChoice = "";
  questionNumber += 1;
  const recent = recentQuestionKeys[progress.level] || [];
  const candidate = core.generateQuestion(progress.level, Math.random, recent);
  question = candidate;
  recent.push(questionKey(question));
  // Keep a question bag larger than every current level's fixed item pool.
  // This prevents the same item returning until the available items have
  // been used first, while still allowing the game to continue indefinitely.
  if (recent.length > 12) recent.shift();
  recentQuestionKeys[progress.level] = recent;
  $("question-number").textContent = questionNumber;
  $("question-type").textContent = question.type;
  $("feedback").className = "feedback";
  $("feedback").innerHTML = "";
  setKeypadDisabled(false);
  const isChoice = question.inputKind === "choice";
  const isFormulaNumber = question.inputKind === "formula-number";
  $("keypad").classList.toggle("hidden", isChoice);
  $("choice-answer").classList.toggle("hidden", !isChoice && !isFormulaNumber);
  $("answer-display").classList.toggle("hidden", isChoice);
  renderChoices(question);
  $("pattern-preview").classList.toggle("hidden", !question.patternCounts);
  renderPatternPreview(question.patternCounts || []);
  const questionBox = $("question-math"); questionBox.textContent = "";
  const instruction = document.createElement("div"); instruction.className = "question-instruction"; instruction.textContent = "已知數列的通項公式";
  const formula = document.createElement("div"); renderMath(formula, `T_n=${question.formula}`);
  const target = document.createElement("div"); target.className = "question-target";
  if (question.targetNotation === "symbol") {
    const term = document.createElement("span"); renderMath(term, `T_{${question.n}}`); target.append("求 ", term, "。");
  } else target.textContent = question.targetTex;
  questionBox.append(instruction, formula, target); questionBox.setAttribute("aria-label", question.tex);
  renderEntry();
}

function renderChoices(currentQuestion) {
  const box = $("choice-answer");
  if (!currentQuestion.choices) { box.innerHTML = ""; return; }
  box.innerHTML = currentQuestion.choices.map((choice) => `<button type="button" data-choice="${choice}"><span>${choice}</span></button>`).join("");
}

function selectChoice(choice) {
  if (locked) return;
  selectedChoice = choice;
  $("choice-answer").querySelectorAll("[data-choice]").forEach((button) => button.classList.toggle("selected", button.dataset.choice === choice));
  if (question.inputKind === "choice") finalizeAnswer(choice, core.isAnswerCorrect(choice, question.answer));
  else renderEntry();
}

function renderPatternPreview(counts) {
  const preview = $("pattern-preview");
  preview.innerHTML = counts.map((count, index) => `<div><span>${Array.from({length:count}, () => "<i></i>").join("")}</span><b>第 ${index + 1} 個</b></div>`).join("");
}

function appendDigit(digit) {
  if (locked || entry.length >= 10) return;
  if (entry === "0") entry = digit;
  else if (entry === "-0") entry = `-${digit}`;
  else entry += digit;
  renderEntry();
}

function toggleSign() {
  if (locked) return;
  entry = entry.startsWith("-") ? entry.slice(1) : `-${entry}`;
  renderEntry();
}

function addFractionBar() {
  if (locked || entry.includes("/")) return;
  const unsigned = entry.startsWith("-") ? entry.slice(1) : entry;
  if (!unsigned) return;
  entry += "/";
  renderEntry();
}

function addDecimalPoint() {
  if (locked || entry.includes(".") || entry.includes("/")) return;
  if (!entry || entry === "-") entry += "0";
  entry += ".";
  renderEntry();
}

function backspace() {
  if (locked) return;
  entry = entry.slice(0, -1);
  renderEntry();
}

function clearEntry() {
  if (locked) return;
  entry = "";
  renderEntry();
}

function entryToTex() {
  if (!entry || entry === "-") return "";
  const negative = entry.startsWith("-");
  const unsigned = negative ? entry.slice(1) : entry;
  if (!unsigned.includes("/")) return `${negative ? "-" : ""}${unsigned}`;
  const [numerator, denominator] = unsigned.split("/");
  return `${negative ? "-" : ""}\\frac{${numerator || "\\square"}}{${denominator || "\\square"}}`;
}

function renderEntry() {
  const display = $("answer-display");
  const tex = entryToTex();
  display.classList.toggle("empty", !tex);
  if (!tex) display.innerHTML = '<span class="answer-placeholder">?</span>';
  else renderMath(display, tex);
  $("submit-answer").disabled = !core.parseAnswer(entry) || locked || (question?.inputKind === "formula-number" && !selectedChoice);
}

function renderMath(element, tex) {
  mathRenderer.render(element, tex);
}

function submitAnswer() {
  if (locked) return;
  const answer = core.parseAnswer(entry);
  if (!answer) return;
  if (question.inputKind === "formula-number") {
    if (!selectedChoice) return;
    finalizeAnswer(`${selectedChoice}；${entry}`, selectedChoice === question.answerFormula && core.isAnswerCorrect(entry, question.answer));
    return;
  }
  finalizeAnswer(entry, core.isAnswerCorrect(entry, question.answer));
}

function submitBoolean(choice) {
  if (locked || question.inputKind !== "boolean") return;
  finalizeAnswer(choice ? "有" : "沒有", core.isAnswerCorrect(choice, question.answer));
}

function finalizeAnswer(studentAnswer, correct) {
  locked = true;
  const result = core.applyResult(progress, correct);
  progress = result.progress;
  const levelStats = normalizeLevelStats(progress.levelStats);
  const currentStats = levelStats[question.level];
  currentStats.total += 1;
  currentStats.correct += correct ? 1 : 0;
  currentStats.streak = correct ? currentStats.streak + 1 : 0;
  progress.levelStats = levelStats;
  progressDirty = true;
  studentExportCache = null;
  if (!correct) {
    progress.mistakeHistory = [...(progress.mistakeHistory || []), {
      timestamp:new Date().toISOString(), level:question.level, question:question.tex,
      studentAnswer, correctAnswer:serializeAnswer(question.answer),
    }].slice(-300);
  }
  pendingDamage += correct ? 45 : 0;
  if (correct) bossHp = Math.max(0, bossHp - 45);
  pendingAnswers.push({
    level: question.level,
    question: question.tex,
    studentAnswer,
    correctAnswer: serializeAnswer(question.answer),
    isCorrect: correct,
  });
  saveProgress();
  scheduleSync();
  setKeypadDisabled(true);
  playBattleAnimation(correct);
  showFeedback(correct, result);
  updateProgressUI();

  if (correct) {
    window.setTimeout(() => {
      if (result.leveledUp) showLevelDialog(false);
      else if (result.completed) showLevelDialog(true);
      else nextQuestion();
    }, Battle.timings.ultimate + 180);
  }
}

function showFeedback(correct, result) {
  const feedback = $("feedback");
  feedback.className = `feedback show ${correct ? "correct" : "wrong"}`;
  const xpLabel = correct ? "+15 XP　計算正確" : (result.protectedPenalty ? "+0 XP　連錯保護中" : "-10 XP　查看解題步驟");
  feedback.innerHTML = `<div class="feedback-summary"><strong>${xpLabel}</strong><span class="answer-reference">正確答案：<span id="correct-answer-math"></span></span></div>`;
  if (typeof question.answer === "string") $("correct-answer-math").textContent = question.answer;
  else renderMath($("correct-answer-math"), question.answerTex || core.fractionTex(question.answer));
  if (!correct && result.protectionActive) {
    const protection = document.createElement("p");
    protection.className = "protection-message";
    protection.textContent = "連錯 3 題後啟動保護；之後答錯不再扣 XP，答對 1 題後恢復。";
    feedback.append(protection);
  }
  if (correct) return;

  const solution = document.createElement("section");
  solution.className = "worked-solution";
  solution.innerHTML = "<h3>詳細解答</h3>";
  question.steps.forEach((step, index) => {
    const row = document.createElement("div");
    row.className = "solution-step";
    const number = document.createElement("span");
    number.textContent = index + 1;
    const content = document.createElement("p");
    renderMath(content, step);
    row.append(number, content);
    solution.append(row);
  });
  const nextButton = document.createElement("button");
  nextButton.type = "button";
  nextButton.className = "next-question-button";
  nextButton.textContent = "下一題";
  nextButton.addEventListener("click", nextQuestion, { once: true });
  solution.append(nextButton);
  feedback.append(solution);
}

function serializeAnswer(answer) {
  if (typeof answer === "boolean") return answer ? "有" : "沒有";
  if (typeof answer === "string") return answer;
  return answer.toFraction();
}

function playBattleAnimation(correct) {
  if (correct) Battle.randomCast(progress.streak, 45);
  else Battle.enemyBreath();
}

function setKeypadDisabled(disabled) {
  $("keypad").querySelectorAll("button").forEach((button) => { button.disabled = disabled; });
  $("choice-answer").querySelectorAll("button").forEach((button) => { button.disabled = disabled; });
}

function updateProgressUI() {
  const info = levelInfo[progress.level];
  const targetXp = core.getLevelXp(progress.level);
  $("level-kicker").textContent = `LEVEL ${progress.level}`;
  $("level-title").textContent = info.title;
  $("xp-copy").textContent = `${progress.xp} / ${targetXp}`;
  $("xp-bar").style.width = `${Math.min(100, (progress.xp / targetXp) * 100)}%`;
  $("xp-bar").parentElement.setAttribute("aria-valuemax", targetXp);
  $("xp-bar").parentElement.setAttribute("aria-valuenow", progress.xp);
  renderStudentStats();
  $("player-avatar").src = info.avatar;
  $("player-avatar").alt = info.rank;
  $("rank-chip").textContent = info.rank;
  $("mission-title").textContent = info.mission;
  $("mission-hint").textContent = info.hint;
  Battle.updateStatus({ combo:progress.streak, bossHp, bossMaxHp });

  document.querySelectorAll("[data-level-dot]").forEach((dot) => {
    const level = Number(dot.dataset.levelDot);
    dot.classList.toggle("active", level === progress.level);
    dot.classList.toggle("done", level < progress.level);
  });
  document.querySelectorAll("[data-level-card]").forEach((card) => {
    const level = Number(card.dataset.levelCard);
    card.classList.toggle("active", level === progress.level);
    card.classList.toggle("done", level < progress.level);
    const icon = card.querySelector("i, svg");
    if (icon) icon.setAttribute("data-lucide", level <= progress.level ? "check" : "lock-keyhole");
  });
  if (window.lucide) lucide.createIcons();
}

function renderStudentStats() {
  const stats = selectedStatsLevel === "all"
    ? { total:progress.total, correct:progress.correct, streak:progress.streak }
    : normalizeLevelStats(progress.levelStats)[Number(selectedStatsLevel)];
  $("total-count").textContent = stats.total;
  $("correct-count").textContent = stats.correct;
  $("wrong-count").textContent = Math.max(0, stats.total - stats.correct);
  $("accuracy-count").textContent = stats.total ? `${Math.round(stats.correct / stats.total * 100)}%` : "--";
  $("streak-count").textContent = stats.streak;
  document.querySelectorAll("[data-stats-level]").forEach((button) => {
    const active = button.dataset.statsLevel === selectedStatsLevel;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
}

function showLevelDialog(completed) {
  const info = levelInfo[progress.level];
  $("dialog-avatar").src = info.avatar;
  $("dialog-kicker").textContent = completed ? "MASTERED" : "LEVEL UP";
  $("dialog-title").textContent = completed ? "完成全部關卡" : `進入程度${["一", "二", "三", "四", "五", "六"][progress.level - 1]}`;
  $("dialog-copy").textContent = completed ? "你已完成 750 XP 的通項公式訓練。" : `${info.title}已解鎖。`;
  $("continue-button").textContent = completed ? "繼續練習" : "開始下一關";
  $("level-dialog").showModal();
}

function handlePhysicalKeyboard(event) {
  if (["INPUT", "SELECT", "TEXTAREA"].includes(event.target.tagName) || $("password-dialog").open) return;
  if (/^\d$/.test(event.key)) appendDigit(event.key);
  else if (event.key === "-") toggleSign();
  else if (event.key === "/") addFractionBar();
  else if (event.key === ".") addDecimalPoint();
  else if (event.key === "Backspace") backspace();
  else if (event.key === "Escape") clearEntry();
  else if (event.key === "Enter" && !$("submit-answer").disabled) submitAnswer();
}

function openPasswordDialog(action) {
  protectedAction = action;
  $("password-dialog-title").textContent = action === "logout" ? "輸入密碼以登出" : "輸入密碼以重置";
  $("password-dialog-copy").textContent = action === "logout" ? "驗證後返回學生登入畫面。" : "驗證後才可開啟重置進度確認。";
  $("action-password").value = "";
  $("password-error").textContent = "";
  $("password-dialog").showModal();
  window.setTimeout(() => $("action-password").focus(), 0);
}

async function verifyProtectedAction(event) {
  event.preventDefault();
  const value = $("action-password").value;
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hash = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  if (hash !== ACCESS_PASSWORD_HASH) {
    $("password-error").textContent = "密碼錯誤，請重新輸入。";
    $("action-password").select();
    return;
  }
  $("password-dialog").close();
  if (protectedAction === "logout") location.reload();
  else if (protectedAction === "reset") $("reset-dialog").showModal();
}

function resetProgress() {
  progress = defaultProgress();
  studentExportCache = null;
  progressDirty = true;
  saveProgress();
  pendingAnswers = [];
  pendingDamage = 0;
  scheduleSync();
  questionNumber = 0;
  $("reset-dialog").close();
  updateProgressUI();
  nextQuestion();
}

function localStudentExportData() {
  return {
    player: { ...player, ...progress },
    levelStats: [1,2,3,4,5].map((level) => ({ level, ...normalizeLevelStats(progress.levelStats)[level] })),
    wrongAnswers: Array.isArray(progress.mistakeHistory) ? progress.mistakeHistory : [],
  };
}

async function getStudentExportData() {
  if (!player) throw new Error("請先登入");
  if (studentExportCache && Date.now() - studentExportCache.time < 10000) return studentExportCache.data;
  if (!API_URL) return localStudentExportData();
  const response = await fetch(`${API_URL}?action=getNthTermStudentExportData&className=${encodeURIComponent(player.className)}&id=${player.id}&t=${Date.now()}`, { cache:"no-store" });
  if (!response.ok) throw new Error("Unable to download student data");
  const remote = await response.json();
  const local = localStudentExportData();
  const data = Number(remote.player?.total || 0) >= Number(local.player.total || 0) ? { ...remote } : { ...local };
  if (data.player) data.player = normalizeLevelProgress(data.player);
  const mistakes = [...(remote.wrongAnswers || []), ...(local.wrongAnswers || [])];
  data.wrongAnswers = [...new Map(mistakes.map((item) => [`${item.level}|${item.question}|${item.studentAnswer}|${item.correctAnswer}`, item])).values()];
  studentExportCache = { time:Date.now(), data };
  return data;
}

function studentTotalXp(student) {
  const completedLevelXp = [0, 0, 150, 300, 450, 600, 750];
  const level = Math.min(5, Math.max(1, Number(student.level) || 1));
  return completedLevelXp[level] + Number(student.xp || 0);
}

async function withStudentDownload(buttonId, task) {
  const button = $(buttonId);
  button.disabled = true;
  $("student-download-status").textContent = "整理數據中...";
  try {
    await task();
    $("student-download-status").textContent = "下載完成";
  } catch (error) {
    console.error(error);
    $("student-download-status").textContent = "下載失敗，請稍後重試";
  } finally {
    button.disabled = false;
  }
}

function downloadStudentOverall() {
  return withStudentDownload("download-student-overall", async () => {
    const data = await getStudentExportData();
    const student = data.player || { ...player, ...progress };
    const levels = normalizeLevelStats(data.levelStats);
    const headers = ["班別","學號","姓名","目前 Level","目前 XP","累積 XP","總作答","答對","答錯","正確率","目前連勝","連錯"];
    const row = [student.className,student.id,student.name,student.level,student.xp,studentTotalXp(student),student.total,student.correct,Math.max(0,Number(student.total)-Number(student.correct)),student.total ? `${Math.round(Number(student.correct)/Number(student.total)*100)}%` : "--",student.streak,student.mistakes];
    [1,2,3,4,5].forEach((level) => {
      const stats = levels[level];
      headers.push(`L${level} 作答`,`L${level} 答對`,`L${level} 答錯`,`L${level} 正確率`);
      row.push(stats.total,stats.correct,Math.max(0,stats.total-stats.correct),stats.total ? `${Math.round(stats.correct/stats.total*100)}%` : "--");
    });
    downloadStudentCsv(`通項公式_個人總體數據_${fileStamp()}_${student.className}_${student.id}號.csv`, [headers,row]);
  });
}

async function openMistakeViewer() {
  const dialog = $("mistake-dialog");
  const body = $("mistake-dialog-body");
  const button = $("download-student-mistakes");
  body.innerHTML = '<div class="mistake-loading">整理錯題中...</div>';
  $("mistake-dialog-summary").textContent = "讀取學習紀錄";
  dialog.showModal();
  button.disabled = true;
  try {
    const data = await getStudentExportData();
    renderMistakeViewer(data.wrongAnswers || []);
  } catch (error) {
    console.error(error);
    $("mistake-dialog-summary").textContent = "暫時無法讀取錯題";
    body.innerHTML = '<div class="mistake-empty">請稍後再試</div>';
  } finally {
    button.disabled = false;
  }
}

function renderMistakeViewer(items) {
  const body = $("mistake-dialog-body");
  const mistakes = [...items].sort((a, b) => String(b.timestamp || "").localeCompare(String(a.timestamp || "")));
  $("mistake-dialog-summary").textContent = mistakes.length ? `共 ${mistakes.length} 題 · 按 Level 分類` : "目前沒有錯題";
  body.innerHTML = "";
  if (!mistakes.length) {
    body.innerHTML = '<div class="mistake-empty"><strong>全部答對</strong><span>繼續保持目前的節奏。</span></div>';
    return;
  }
  [1,2,3,4,5].forEach((level) => {
    const levelItems = mistakes.filter((item) => Number(item.level) === level);
    if (!levelItems.length) return;
    const section = document.createElement("section");
    section.className = "mistake-level-section";
    section.innerHTML = `<header><span>LEVEL ${level}</span><strong>${levelInfo[level].title}</strong><b>${levelItems.length} 題</b></header>`;
    levelItems.forEach((item, index) => {
      const card = document.createElement("article");
      card.className = "mistake-card";
      const heading = document.createElement("div");
      heading.className = "mistake-card-heading";
      const date = item.timestamp ? new Date(item.timestamp).toLocaleDateString("zh-Hant", { month:"numeric", day:"numeric" }) : "--";
      heading.innerHTML = `<span>錯題 ${index + 1}</span><time>${date}</time>`;
      const questionNode = document.createElement("div");
      questionNode.className = "mistake-question";
      renderMath(questionNode, item.question || "--");
      const answers = document.createElement("div");
      answers.className = "mistake-answers";
      const studentAnswer = document.createElement("div");
      studentAnswer.innerHTML = "<span>你的答案</span>";
      const studentMath = document.createElement("strong");
      renderMath(studentMath, String(item.studentAnswer ?? "--"));
      studentAnswer.append(studentMath);
      const correctAnswer = document.createElement("div");
      correctAnswer.innerHTML = "<span>正確答案</span>";
      const correctMath = document.createElement("strong");
      renderMath(correctMath, String(item.correctAnswer ?? "--"));
      correctAnswer.append(correctMath);
      answers.append(studentAnswer, correctAnswer);
      card.append(heading, questionNode, answers);
      section.append(card);
    });
    body.append(section);
  });
}

function downloadStudentCsv(filename, rows) {
  const content = `\ufeff${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
  const url = URL.createObjectURL(new Blob([content], { type:"text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function csvCell(value) { return `"${String(value ?? "").replaceAll('"','""')}"`; }
function fileStamp() { return new Date().toISOString().slice(0,10); }

function scheduleSync() {
  syncQueued = true;
  if (!syncInFlight) flushSyncQueue();
}

async function flushSyncQueue() {
  if (syncInFlight || (!syncQueued && !pendingBatch && !pendingAnswers.length) || !player || !API_URL) return;
  syncInFlight = true;
  syncQueued = false;
  let failed = false;
  if (!pendingBatch) {
    const answers = pendingAnswers.splice(0,10);
    pendingBatch = { ...player, level:progress.level, xp:progress.xp, total:progress.total, correct:progress.correct, streak:progress.streak, mistakes:progress.mistakes, answers, batchId:crypto.randomUUID(), addedDamage:answers.filter((answer) => answer.isCorrect).length * 45 };
    saveProgress();
  }
  $("sync-status").textContent = "同步中…";
  try {
    await fetch(`${API_URL}?action=saveNthTerm`, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(JSON.stringify(pendingBatch))}`,
      signal: AbortSignal.timeout(20000),
    });
    const response = await fetch(`${API_URL}?${new URLSearchParams({action:"getNthTermSyncStatus",className:player.className,id:player.id,batchId:pendingBatch.batchId,t:Date.now()})}`, { cache:"no-store", signal:AbortSignal.timeout(20000) });
    const receipt = await response.json();
    if (!receipt.received) throw new Error("Waiting for receipt");
    pendingBatch = null; pendingDamage = 0; saveProgress();
    $("sync-status").textContent = "已同步至戰情室";
  } catch (error) {
    failed = true;
    $("sync-status").textContent = "進度已存本機，等待同步";
    console.error("Sync failed", error);
  } finally {
    syncInFlight = false;
    if (syncQueued || pendingAnswers.length || pendingBatch) window.setTimeout(flushSyncQueue, failed ? 15000 : 500);
  }
}

document.addEventListener("DOMContentLoaded", init);
window.addEventListener("online", scheduleSync);
